/**
 * Tool: delete_shapes
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Deletes specified shapes from the canvas by shapeId, clearing selection and capturing undo memento.
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;
var canvasHelper = require("./canvas-helper.js");

function DeleteShapesTool() {
    BaseTool.call(
        this,
        "delete_shapes",
        "Removes specified shapes from the target page canvas, clearing selection and capturing undo memento.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            shapeIds: z.array(z.string()).describe("Array of shape IDs to delete from the canvas.")
        }
    );
}
DeleteShapesTool.prototype = new BaseTool();

DeleteShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var shapeIds = args.shapeIds || [];
    if (!Array.isArray(shapeIds) || shapeIds.length === 0) {
        throw new Error("No shape IDs provided in 'shapeIds' parameter.");
    }

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    var deleted = [];
    var notFound = [];

    for (var i = 0; i < shapeIds.length; i++) {
        var id = shapeIds[i];
        if (!id) continue;

        var svgNode = canvasHelper.findElementById(canvas.drawingLayer, id);
        if (!svgNode) {
            notFound.push(id);
            continue;
        }

        var shape = null;
        if (typeof canvas.createControllerFor === "function") {
            shape = canvas.createControllerFor(svgNode);
        }
        if ((!shape || typeof shape.deleteTarget !== "function") && typeof Shape !== "undefined") {
            try {
                shape = new Shape(canvas, svgNode);
            } catch (err) {
                shape = null;
            }
        }

        if (shape && typeof shape.deleteTarget === "function") {
            shape.deleteTarget();
            deleted.push(id);
        } else if (svgNode.parentNode) {
            svgNode.parentNode.removeChild(svgNode);
            deleted.push(id);
        } else {
            notFound.push(id);
        }
    }

    // Refresh canvas state, clear selection, and capture undo memento
    if (typeof canvas.clearSelection === "function") canvas.clearSelection();
    if (typeof canvas._detachEditors === "function") canvas._detachEditors();
    if (typeof canvas._sayTargetChanged === "function") canvas._sayTargetChanged();
    if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
    if (typeof canvas._saveMemento === "function") canvas._saveMemento("Delete shapes via MCP");

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    pageId: target.pageId,
                    deletedCount: deleted.length,
                    deleted: deleted,
                    notFound: notFound,
                    message: "Successfully deleted " + deleted.length + " shape(s)."
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    DeleteShapesTool: DeleteShapesTool
};
