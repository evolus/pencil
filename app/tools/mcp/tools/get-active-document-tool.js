/**
 * Tool: get_active_document
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Queries active document metadata, pages, dimensions, and shape counts.
 */

var BaseTool = require("./base-tool.js").BaseTool;
var fs = require("fs");
var path = require("path");

function GetActiveDocumentTool() {
    BaseTool.call(
        this,
        "get_active_document",
        "Inspects the currently open document in the Pencil application, listing metadata, pages, dimensions, and object counts.",
        {}
    );
}
GetActiveDocumentTool.prototype = new BaseTool();

GetActiveDocumentTool.prototype._getApplicationPane = function () {
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

GetActiveDocumentTool.prototype._getController = function (appPane) {
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

GetActiveDocumentTool.prototype._countShapesInXml = function (filePath) {
    try {
        if (!fs.existsSync(filePath)) return 0;
        var xmlContent = fs.readFileSync(filePath, "utf8");
        var shapeMatches = xmlContent.match(/<(?:\w+:)?g[^>]+p:type=["']Shape["']/g);
        return shapeMatches ? shapeMatches.length : 0;
    } catch (e) {
        return 0;
    }
};

GetActiveDocumentTool.prototype._countShapesInPage = function (page) {
    if (!page) return 0;

    // Explicit shapeCount property (mock or pre-calculated)
    if (typeof page.shapeCount === "number") {
        return page.shapeCount;
    }

    // Direct shapes or elements array
    if (Array.isArray(page.shapes)) {
        return page.shapes.length;
    }
    if (Array.isArray(page.elements)) {
        return page.elements.length;
    }

    // Live canvas drawingLayer DOM node
    if (page.canvas && page.canvas.drawingLayer) {
        var layer = page.canvas.drawingLayer;
        if (typeof layer.querySelectorAll === "function") {
            try {
                var nodes = layer.querySelectorAll("[p\\:type='Shape'], [p\\:type='Group'], g[p\\:type]");
                if (nodes && nodes.length > 0) return nodes.length;
            } catch (err) {
                // Ignore selector error
            }
        }
        if (layer.children && layer.children.length !== undefined) {
            return layer.children.length;
        }
        if (layer.childNodes && layer.childNodes.length !== undefined) {
            var count = 0;
            for (var c = 0; c < layer.childNodes.length; c++) {
                if (layer.childNodes[c].nodeType === 1) count++;
            }
            return count;
        }
    }

    // Cached temp XML file
    if (page.tempFilePath) {
        return this._countShapesInXml(page.tempFilePath);
    }

    return 0;
};

GetActiveDocumentTool.prototype.execute = async function (args, context) {
    var appPane = this._getApplicationPane();
    var controller = this._getController(appPane);

    // Locate active document object
    var doc = null;
    if (controller && controller.doc) {
        doc = controller.doc;
    } else if (appPane && appPane.currentDocument) {
        doc = appPane.currentDocument;
    }

    if (!doc) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        documentTitle: null,
                        activePageId: null,
                        pages: [],
                        message: "No document is currently open in Pencil."
                    }, null, 2)
                }
            ]
        };
    }

    // Determine document title
    var docTitle = null;
    if (controller && typeof controller.getDocumentName === "function") {
        docTitle = controller.getDocumentName();
    } else if (doc.name) {
        docTitle = doc.name;
    } else if (controller && controller.documentPath) {
        docTitle = path.basename(controller.documentPath);
    } else {
        docTitle = "Untitled Document";
    }

    // Determine active page ID
    var activePageId = null;
    if (controller && controller.activePage && controller.activePage.id) {
        activePageId = controller.activePage.id;
    } else if (doc.activePageId) {
        activePageId = doc.activePageId;
    }

    // Enumerate pages
    var pagesList = [];
    var rawPages = doc.pages || [];

    for (var i = 0; i < rawPages.length; i++) {
        var page = rawPages[i];
        if (!page) continue;

        var pId = page.id || (page.properties && page.properties.id) || ("page-" + (i + 1));
        var pTitle = page.name || (page.properties && page.properties.name) || ("Page " + (i + 1));
        var pWidth = Number(page.width || (page.properties && page.properties.width) || 800);
        var pHeight = Number(page.height || (page.properties && page.properties.height) || 600);
        var pShapeCount = this._countShapesInPage(page);

        if (!activePageId && i === 0) {
            activePageId = pId;
        }

        pagesList.push({
            id: pId,
            title: pTitle,
            width: pWidth,
            height: pHeight,
            shapeCount: pShapeCount
        });
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    documentTitle: docTitle,
                    activePageId: activePageId,
                    pages: pagesList
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    GetActiveDocumentTool: GetActiveDocumentTool
};
