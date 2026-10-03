/**
 * Tool: get_page_content
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Extracts scene graph, shape hierarchy, and property metadata for a specific page.
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;
var fs = require("fs");

function GetPageContentTool() {
    BaseTool.call(
        this,
        "get_page_content",
        "Extracts the complete scene graph, shape hierarchy, and property metadata for a specific page from the currently active Pencil document.",
        {
            pageId: z.string().optional().describe("The unique ID of the page (from get_active_document). Optional if pageIndex is provided."),
            pageIndex: z.number().int().optional().describe("0-based index of the page in the document page list."),
            format: z.enum(["json", "svg", "summary"]).optional().default("json").describe("Format of the returned page content: structured JSON object tree ('json'), serialized SVG DOM ('svg'), or compact summary ('summary').")
        }
    );
}
GetPageContentTool.prototype = new BaseTool();

GetPageContentTool.prototype._getApplicationPane = function () {
    if (typeof ApplicationPane !== "undefined" && ApplicationPane._instance) {
        return ApplicationPane._instance;
    }
    if (typeof window !== "undefined" && window.ApplicationPane && window.ApplicationPane._instance) {
        return window.ApplicationPane._instance;
    }
    if (typeof global !== "undefined" && global.ApplicationPane && global.ApplicationPane._instance) {
        return global.ApplicationPane._instance;
    }
    return null;
};

GetPageContentTool.prototype._getController = function (appPane) {
    if (appPane && appPane.controller) {
        return appPane.controller;
    }
    if (typeof Pencil !== "undefined" && Pencil.controller) {
        return Pencil.controller;
    }
    if (typeof Controller !== "undefined" && Controller._instance) {
        return Controller._instance;
    }
    return null;
};

GetPageContentTool.prototype._parseTransform = function (transformStr) {
    var pos = { x: 0, y: 0 };
    if (!transformStr || typeof transformStr !== "string") return pos;

    var matrixMatch = transformStr.match(/matrix\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+),\s*([^)]+)\)/i);
    if (matrixMatch) {
        pos.x = parseFloat(matrixMatch[1]) || 0;
        pos.y = parseFloat(matrixMatch[2]) || 0;
        return pos;
    }

    var translateMatch = transformStr.match(/translate\s*\(\s*([^,\s)]+)(?:[,\s]+([^)]+))?\)/i);
    if (translateMatch) {
        pos.x = parseFloat(translateMatch[1]) || 0;
        pos.y = translateMatch[2] ? (parseFloat(translateMatch[2]) || 0) : 0;
        return pos;
    }

    return pos;
};

GetPageContentTool.prototype._parseBoxDimension = function (boxStr) {
    var dim = { w: 0, h: 0 };
    if (!boxStr || typeof boxStr !== "string") return dim;

    var parts = boxStr.split(",");
    if (parts.length >= 2) {
        dim.w = parseFloat(parts[0]) || 0;
        dim.h = parseFloat(parts[1]) || 0;
    } else if (parts.length === 1) {
        dim.w = parseFloat(parts[0]) || 0;
        dim.h = dim.w;
    }
    return dim;
};

GetPageContentTool.prototype._extractElementsFromDom = function (containerNode) {
    var elements = [];
    if (!containerNode) return elements;

    var childNodes = containerNode.childNodes || containerNode.children || [];
    for (var i = 0; i < childNodes.length; i++) {
        var node = childNodes[i];
        if (node.nodeType !== undefined && node.nodeType !== 1) continue;

        var pType = null;
        if (typeof node.getAttribute === "function") {
            pType = node.getAttribute("p:type") || node.getAttribute("type");
        }

        if (pType === "Shape" || pType === "shape") {
            var shapeId = node.getAttribute("id") || ("shape-" + (elements.length + 1));
            var shapeDef = node.getAttribute("p:def") || node.getAttribute("def") || "";
            var transform = node.getAttribute("transform") || "";
            var pos = this._parseTransform(transform);

            var properties = {};
            // Look for <p:metadata> and <p:property>
            var metaNodes = node.getElementsByTagName ? node.getElementsByTagName("p:property") : [];
            if (!metaNodes || metaNodes.length === 0) {
                if (typeof node.querySelectorAll === "function") {
                    try {
                        metaNodes = node.querySelectorAll("p\\:property, property");
                    } catch (e) {
                        metaNodes = [];
                    }
                }
            }

            for (var m = 0; m < metaNodes.length; m++) {
                var pNode = metaNodes[m];
                var name = pNode.getAttribute("name");
                if (name) {
                    properties[name] = pNode.textContent || pNode.text || "";
                }
            }

            var dim = this._parseBoxDimension(properties.box || "");
            elements.push({
                id: shapeId,
                type: "shape",
                def: shapeDef,
                box: {
                    x: pos.x,
                    y: pos.y,
                    w: dim.w,
                    h: dim.h
                },
                properties: properties
            });
        } else if (pType === "Group" || pType === "group") {
            var groupId = node.getAttribute("id") || ("group-" + (elements.length + 1));
            var groupTransform = node.getAttribute("transform") || "";
            var groupPos = this._parseTransform(groupTransform);
            var childElements = this._extractElementsFromDom(node);

            elements.push({
                id: groupId,
                type: "group",
                box: {
                    x: groupPos.x,
                    y: groupPos.y
                },
                children: childElements
            });
        } else if (node.tagName === "g" || node.nodeName === "g" || node.nodeName === "svg:g") {
            // Recurse into nested container group
            var nested = this._extractElementsFromDom(node);
            for (var n = 0; n < nested.length; n++) {
                elements.push(nested[n]);
            }
        }
    }

    return elements;
};

GetPageContentTool.prototype.execute = async function (args, context) {
    args = args || {};
    var pageId = args.pageId ? String(args.pageId).trim() : null;
    var pageIndex = args.pageIndex !== undefined && args.pageIndex !== null ? Number(args.pageIndex) : null;
    var format = args.format || "json";

    var appPane = this._getApplicationPane();
    var controller = this._getController(appPane);

    var doc = null;
    if (controller && controller.doc) {
        doc = controller.doc;
    } else if (appPane && appPane.currentDocument) {
        doc = appPane.currentDocument;
    }

    if (!doc || !Array.isArray(doc.pages) || doc.pages.length === 0) {
        throw new Error("No active document or pages found in Pencil. Please open or create a document first.");
    }

    // Locate target page
    var targetPage = null;
    var targetIndex = -1;

    if (pageId) {
        for (var i = 0; i < doc.pages.length; i++) {
            var p = doc.pages[i];
            var pId = p.id || (p.properties && p.properties.id);
            if (pId === pageId) {
                targetPage = p;
                targetIndex = i;
                break;
            }
        }
    } else if (pageIndex !== null && pageIndex >= 0 && pageIndex < doc.pages.length) {
        targetPage = doc.pages[pageIndex];
        targetIndex = pageIndex;
    } else {
        // Default to active page or first page
        if (controller && controller.activePage) {
            targetPage = controller.activePage;
            for (var j = 0; j < doc.pages.length; j++) {
                if (doc.pages[j] === targetPage || doc.pages[j].id === targetPage.id) {
                    targetIndex = j;
                    break;
                }
            }
        }
        if (!targetPage) {
            targetPage = doc.pages[0];
            targetIndex = 0;
        }
    }

    if (!targetPage) {
        throw new Error("Page not found with ID '" + pageId + "' or index " + pageIndex + ". Call get_active_document to discover valid page IDs.");
    }

    var resolvedId = targetPage.id || (targetPage.properties && targetPage.properties.id) || ("page-" + (targetIndex + 1));
    var resolvedTitle = targetPage.name || (targetPage.properties && targetPage.properties.name) || ("Page " + (targetIndex + 1));
    var resolvedWidth = Number(targetPage.width || (targetPage.properties && targetPage.properties.width) || 800);
    var resolvedHeight = Number(targetPage.height || (targetPage.properties && targetPage.properties.height) || 600);
    var resolvedBg = targetPage.backgroundColor || (targetPage.properties && targetPage.properties.backgroundColor) || "#ffffff";

    // Format: SVG
    if (format === "svg") {
        var svgMarkup = "";
        if (controller && typeof controller.getPageSVG === "function") {
            var svgDom = controller.getPageSVG(targetPage);
            if (typeof Controller !== "undefined" && Controller.serializer) {
                svgMarkup = Controller.serializer.serializeToString(svgDom);
            } else if (svgDom.outerHTML) {
                svgMarkup = svgDom.outerHTML;
            } else {
                svgMarkup = String(svgDom);
            }
        } else if (targetPage.svg) {
            svgMarkup = targetPage.svg;
        } else {
            svgMarkup = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + resolvedWidth + "\" height=\"" + resolvedHeight + "\"></svg>";
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        pageId: resolvedId,
                        pageIndex: targetIndex,
                        format: "svg",
                        svg: svgMarkup
                    }, null, 2)
                }
            ]
        };
    }

    // Extract elements
    var elements = [];
    if (Array.isArray(targetPage.elements)) {
        elements = targetPage.elements;
    } else if (Array.isArray(targetPage.shapes)) {
        elements = targetPage.shapes;
    } else if (targetPage.canvas && targetPage.canvas.drawingLayer) {
        elements = this._extractElementsFromDom(targetPage.canvas.drawingLayer);
    } else if (targetPage.tempFilePath && fs.existsSync(targetPage.tempFilePath)) {
        try {
            var xmlText = fs.readFileSync(targetPage.tempFilePath, "utf8");
            var DOMParserClass = typeof DOMParser !== "undefined" ? DOMParser : (typeof Controller !== "undefined" && Controller.parser ? Controller.parser.constructor : null);
            if (DOMParserClass) {
                var parser = new DOMParserClass();
                var xmlDoc = parser.parseFromString(xmlText, "text/xml");
                elements = this._extractElementsFromDom(xmlDoc.documentElement);
            }
        } catch (xmlErr) {
            elements = [];
        }
    }

    // Format: Summary
    if (format === "summary") {
        var shapeTypes = {};
        for (var e = 0; e < elements.length; e++) {
            var el = elements[e];
            var defName = el.def || el.type || "unknown";
            shapeTypes[defName] = (shapeTypes[defName] || 0) + 1;
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        pageId: resolvedId,
                        pageIndex: targetIndex,
                        title: resolvedTitle,
                        dimensions: {
                            width: resolvedWidth,
                            height: resolvedHeight
                        },
                        shapeCount: elements.length,
                        shapeTypes: shapeTypes
                    }, null, 2)
                }
            ]
        };
    }

    // Default Format: JSON
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    pageId: resolvedId,
                    pageIndex: targetIndex,
                    title: resolvedTitle,
                    dimensions: {
                        width: resolvedWidth,
                        height: resolvedHeight
                    },
                    backgroundColor: resolvedBg,
                    shapeCount: elements.length,
                    elements: elements
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    GetPageContentTool: GetPageContentTool
};
