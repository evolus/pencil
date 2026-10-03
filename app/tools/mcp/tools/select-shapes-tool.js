/**
 * Tool: select_shapes
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Focuses and highlights specified shapes on the live running Pencil canvas window.
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;
var canvasHelper = require("./canvas-helper.js");

function SelectShapesTool() {
    BaseTool.call(
        this,
        "select_shapes",
        "Focuses and highlights specified shapes on the active desktop canvas window for collaborative agent-user interaction.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            shapeIds: z.array(z.string()).describe("Shape IDs to select on canvas. Provide empty array [] to deselect all.")
        }
    );
}
SelectShapesTool.prototype = new BaseTool();

SelectShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var shapeIds = args.shapeIds || [];

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);

    // If page is not the currently active view in the desktop window, activate it
    var controller = canvasHelper.getController(appPane);
    if (controller && controller.activePage !== target.page && typeof appPane.activatePage === "function") {
        appPane.activatePage(target.page);
    }

    var canvas = target.canvas;

    if (shapeIds.length === 0) {
        if (typeof canvas.selectNone === "function") {
            canvas.selectNone();
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        pageId: target.pageId,
                        selectedCount: 0,
                        selected: [],
                        message: "Deselected all shapes on canvas."
                    }, null, 2)
                }
            ]
        };
    }

    var foundSvgs = [];
    var foundIds = [];
    var notFoundIds = [];

    for (var i = 0; i < shapeIds.length; i++) {
        var id = shapeIds[i];
        if (!id) continue;
        var svgNode = canvasHelper.findElementById(canvas.drawingLayer, id);
        if (svgNode) {
            foundSvgs.push(svgNode);
            foundIds.push(id);
        } else {
            notFoundIds.push(id);
        }
    }

    if (foundSvgs.length === 0) {
        if (typeof canvas.selectNone === "function") canvas.selectNone();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        pageId: target.pageId,
                        selectedCount: 0,
                        selected: [],
                        notFound: notFoundIds,
                        message: "None of the specified shape IDs were found on canvas."
                    }, null, 2)
                }
            ]
        };
    }

    if (foundSvgs.length === 1 && typeof canvas.selectShape === "function") {
        canvas.selectShape(foundSvgs[0]);
    } else if (typeof canvas.selectMultiple === "function") {
        canvas.selectMultiple(foundSvgs);
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    pageId: target.pageId,
                    selectedCount: foundIds.length,
                    selected: foundIds,
                    notFound: notFoundIds,
                    message: "Successfully selected " + foundIds.length + " shape(s) on canvas."
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    SelectShapesTool: SelectShapesTool
};
