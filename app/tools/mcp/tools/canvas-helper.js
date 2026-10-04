/**
 * Canvas & DOM Helper for MCP Canvas Tools
 * Provides resilient page resolution, DOM element queries, and transform parsing.
 */

function getApplicationPane() {
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
}

function getController(appPane) {
    if (appPane && appPane.controller) return appPane.controller;
    if (typeof Pencil !== "undefined" && Pencil.controller) return Pencil.controller;
    if (typeof Controller !== "undefined" && Controller._instance) return Controller._instance;
    return null;
}

function parseMatrix(transformStr) {
    var m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    if (!transformStr || typeof transformStr !== "string") return m;

    var matrixMatch = transformStr.match(/matrix\s*\(\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*\)/i);
    if (matrixMatch) {
        var a = parseFloat(matrixMatch[1]);
        var b = parseFloat(matrixMatch[2]);
        var c = parseFloat(matrixMatch[3]);
        var d = parseFloat(matrixMatch[4]);
        var e = parseFloat(matrixMatch[5]);
        var f = parseFloat(matrixMatch[6]);
        m.a = isNaN(a) ? 1 : a;
        m.b = isNaN(b) ? 0 : b;
        m.c = isNaN(c) ? 0 : c;
        m.d = isNaN(d) ? 1 : d;
        m.e = isNaN(e) ? 0 : e;
        m.f = isNaN(f) ? 0 : f;
        return m;
    }

    var translateMatch = transformStr.match(/translate\s*\(\s*([-\d.eE]+)(?:[\s,]+([-\d.eE]+))?\s*\)/i);
    if (translateMatch) {
        var te = parseFloat(translateMatch[1]);
        var tf = translateMatch[2] ? parseFloat(translateMatch[2]) : 0;
        m.e = isNaN(te) ? 0 : te;
        m.f = isNaN(tf) ? 0 : tf;
        return m;
    }

    return m;
}

function parseTransform(transformStr) {
    var m = parseMatrix(transformStr);
    return { x: m.e, y: m.f };
}

function findElementById(containerNode, id) {
    if (!containerNode || !id) return null;
    if (typeof containerNode.querySelector === "function") {
        try {
            var el = containerNode.querySelector('[id="' + id + '"]');
            if (el) return el;
        } catch (e) {
            // Ignore querySelector syntax errors with unusual characters
        }
    }

    // Direct and recursive fallback search
    var childNodes = containerNode.childNodes || containerNode.children || [];
    for (var i = 0; i < childNodes.length; i++) {
        var node = childNodes[i];
        if (node.nodeType === 1) {
            if (node.getAttribute && node.getAttribute("id") === id) {
                return node;
            }
            var sub = findElementById(node, id);
            if (sub) return sub;
        }
    }
    return null;
}

function resolveTargetPageAndCanvas(appPane, pageId, pageIndex) {
    if (!appPane) {
        throw new Error("ApplicationPane is not available. Please ensure Evolus Pencil desktop application is running.");
    }
    var controller = getController(appPane);
    var doc = (controller && controller.doc) || appPane.currentDocument;

    if (!doc || !Array.isArray(doc.pages) || doc.pages.length === 0) {
        throw new Error("No active document or pages found in Pencil. Please open or create a document first.");
    }

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
    } else if (pageIndex !== undefined && pageIndex !== null && pageIndex >= 0 && pageIndex < doc.pages.length) {
        targetPage = doc.pages[pageIndex];
        targetIndex = pageIndex;
    } else {
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

    var canvas = targetPage.canvas;
    if (!canvas && controller && typeof controller.retrievePageCanvas === "function") {
        controller.retrievePageCanvas(targetPage);
        canvas = targetPage.canvas;
    }
    if (!canvas && appPane.activeCanvas && (controller && controller.activePage === targetPage)) {
        canvas = appPane.activeCanvas;
    }
    if (!canvas && typeof appPane.activatePage === "function") {
        appPane.activatePage(targetPage);
        canvas = targetPage.canvas || appPane.activeCanvas;
    }

    if (!canvas) {
        throw new Error("Could not acquire active canvas for page '" + (targetPage.name || targetPage.id) + "'.");
    }

    var resolvedId = targetPage.id || (targetPage.properties && targetPage.properties.id) || ("page-" + (targetIndex + 1));

    return {
        page: targetPage,
        pageIndex: targetIndex,
        pageId: resolvedId,
        canvas: canvas,
        controller: controller
    };
}

function parseBoxDimension(boxStr) {
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
}

/*
 * Traverses an SVG DOM hierarchy (typically canvas.drawingLayer) to extract shape
 * records with absolute coordinates, dimensions, and metadata properties. Handles
 * cumulative parent transform propagation across nested <g p:type="Group"> containers.
 */
function extractShapesFromDom(containerNode, originX, originY, results) {
    if (!containerNode) return results;
    results = results || [];
    originX = originX || 0;
    originY = originY || 0;

    var childNodes = containerNode.childNodes || containerNode.children || [];
    for (var i = 0; i < childNodes.length; i++) {
        var node = childNodes[i];
        if (node.nodeType !== undefined && node.nodeType !== 1) continue;

        var pType = null;
        if (typeof node.getAttribute === "function") {
            pType = node.getAttribute("p:type") || node.getAttribute("type");
        }

        var transform = (typeof node.getAttribute === "function") ? (node.getAttribute("transform") || "") : "";
        var pos = parseTransform(transform);
        var absX = originX + pos.x;
        var absY = originY + pos.y;

        if (pType === "Shape" || pType === "shape") {
            var shapeId = (typeof node.getAttribute === "function" ? node.getAttribute("id") : null) || ("shape-" + (results.length + 1));
            var shapeDef = (typeof node.getAttribute === "function" ? (node.getAttribute("p:def") || node.getAttribute("def")) : "") || "";

            var properties = {};
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
                var name = pNode.getAttribute ? pNode.getAttribute("name") : null;
                if (name) {
                    properties[name] = pNode.textContent || pNode.text || "";
                }
            }

            var textVal = properties.label || properties.text || properties.text0 || properties.caption || properties.title || properties.plainText || properties.htmlContent || "";
            if (!textVal) {
                for (var pk in properties) {
                    if (properties.hasOwnProperty(pk) && (pk.startsWith("text") || pk.startsWith("label") || pk === "title" || pk === "caption")) {
                        if (typeof properties[pk] === "string" && properties[pk].trim().length > 0) {
                            textVal = properties[pk];
                            break;
                        }
                    }
                }
            }
            if (!textVal && typeof node.getElementsByTagName === "function") {
                var textNodes = node.getElementsByTagName("text");
                if (textNodes && textNodes.length > 0) {
                    textVal = textNodes[0].textContent || textNodes[0].text || "";
                }
            }

            var dim = parseBoxDimension(properties.box || "");

            results.push({
                id: shapeId,
                type: "shape",
                def: shapeDef,
                box: {
                    x: absX,
                    y: absY,
                    w: dim.w,
                    h: dim.h
                },
                x: absX,
                y: absY,
                w: dim.w,
                h: dim.h,
                text: textVal,
                properties: properties
            });
        } else if (pType === "Group" || pType === "group") {
            var groupId = (typeof node.getAttribute === "function" ? node.getAttribute("id") : null) || ("group-" + (results.length + 1));
            results.push({
                id: groupId,
                type: "group",
                def: "",
                box: {
                    x: absX,
                    y: absY,
                    w: 0,
                    h: 0
                },
                x: absX,
                y: absY,
                w: 0,
                h: 0,
                text: "",
                properties: {}
            });
            extractShapesFromDom(node, absX, absY, results);
        } else if (node.tagName === "g" || node.nodeName === "g" || node.nodeName === "svg:g") {
            extractShapesFromDom(node, absX, absY, results);
        }
    }

    return results;
}

/*
 * Resolves all shapes for a given page and canvas instance. Prefers live SVG DOM in
 * canvas.drawingLayer; falls back gracefully to in-memory scene graphs or mock elements.
 */
function extractPageShapes(targetPage, canvas) {
    if (canvas && canvas.drawingLayer) {
        return extractShapesFromDom(canvas.drawingLayer, 0, 0, []);
    }

    var shapes = [];
    if (targetPage) {
        if (Array.isArray(targetPage.elements)) {
            function flatten(items, parentX, parentY) {
                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    var ix = (it.x !== undefined ? it.x : (it.box && it.box.x !== undefined ? it.box.x : 0)) + parentX;
                    var iy = (it.y !== undefined ? it.y : (it.box && it.box.y !== undefined ? it.box.y : 0)) + parentY;
                    var dim = parseBoxDimension((it.properties && it.properties.box) || (it.box ? (it.box.w + "," + it.box.h) : "0,0"));
                    var text = (it.properties && (it.properties.label || it.properties.text || it.properties.plainText || it.properties.htmlContent)) || it.text || "";
                    shapes.push({
                        id: it.id || ("shape-" + (shapes.length + 1)),
                        type: it.type || "shape",
                        def: it.def || it.type || "",
                        box: { x: ix, y: iy, w: dim.w, h: dim.h },
                        x: ix,
                        y: iy,
                        w: dim.w,
                        h: dim.h,
                        text: text,
                        properties: it.properties || {}
                    });
                    if (Array.isArray(it.children)) {
                        flatten(it.children, ix, iy);
                    }
                }
            }
            flatten(targetPage.elements, 0, 0);
        } else if (Array.isArray(targetPage.shapes)) {
            for (var s = 0; s < targetPage.shapes.length; s++) {
                var sh = targetPage.shapes[s];
                var sx = sh.x !== undefined ? sh.x : (sh.box && sh.box.x !== undefined ? sh.box.x : 0);
                var sy = sh.y !== undefined ? sh.y : (sh.box && sh.box.y !== undefined ? sh.box.y : 0);
                var sDim = parseBoxDimension((sh.properties && sh.properties.box) || (sh.box ? (sh.box.w + "," + sh.box.h) : "0,0"));
                shapes.push({
                    id: sh.id || ("shape-" + (shapes.length + 1)),
                    type: sh.type || "shape",
                    def: sh.def || sh.type || "",
                    box: { x: sx, y: sy, w: sDim.w, h: sDim.h },
                    x: sx,
                    y: sy,
                    w: sDim.w,
                    h: sDim.h,
                    text: (sh.properties && (sh.properties.label || sh.properties.text)) || sh.text || "",
                    properties: sh.properties || {}
                });
            }
        }
    }
    return shapes;
}

module.exports = {
    getApplicationPane: getApplicationPane,
    getController: getController,
    parseTransform: parseTransform,
    parseMatrix: parseMatrix,
    parseBoxDimension: parseBoxDimension,
    findElementById: findElementById,
    resolveTargetPageAndCanvas: resolveTargetPageAndCanvas,
    extractShapesFromDom: extractShapesFromDom,
    extractPageShapes: extractPageShapes
};

