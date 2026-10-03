/**
 * Tool: update_shapes
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Mutates properties, geometry dimensions, position, and stacking order of existing shapes on canvas.
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;
var canvasHelper = require("./canvas-helper.js");

function UpdateShapesTool() {
    BaseTool.call(
        this,
        "update_shapes",
        "Selectively mutates properties, geometry dimensions, positioning (relative or absolute), and stacking order (z-order) of existing shapes on the active or specified canvas page.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            shapes: z.array(
                z.object({
                    shapeId: z.string().describe("The ID of the target shape to modify."),
                    properties: z.record(z.any()).optional().describe("Key-value dictionary of properties to update (e.g. {'label': 'Submit', 'fillColor': '#2563eb'})."),
                    box: z.object({
                        x: z.number().optional().describe("New absolute X coordinate on canvas."),
                        y: z.number().optional().describe("New absolute Y coordinate on canvas."),
                        dx: z.number().optional().describe("Relative delta X to move."),
                        dy: z.number().optional().describe("Relative delta Y to move."),
                        w: z.number().optional().describe("New width dimension."),
                        h: z.number().optional().describe("New height dimension.")
                    }).optional().describe("Geometric dimensions and position updates."),
                    zOrder: z.enum(["bringForward", "sendBackward", "bringToFront", "sendToBack"]).optional().describe("Stacking order reordering.")
                })
            ).describe("List of shape update specifications.")
        }
    );
}
UpdateShapesTool.prototype = new BaseTool();

UpdateShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var shapeUpdates = args.shapes || [];
    if (!Array.isArray(shapeUpdates) || shapeUpdates.length === 0) {
        throw new Error("No shape updates provided in 'shapes' parameter.");
    }

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    var updated = [];
    var notFound = [];

    for (var i = 0; i < shapeUpdates.length; i++) {
        var update = shapeUpdates[i];
        if (!update || !update.shapeId) continue;

        var svgNode = canvasHelper.findElementById(canvas.drawingLayer, update.shapeId);
        if (!svgNode) {
            notFound.push(update.shapeId);
            continue;
        }

        var shape = null;
        if (typeof canvas.createControllerFor === "function") {
            shape = canvas.createControllerFor(svgNode);
        }
        if ((!shape || typeof shape.setProperty !== "function") && typeof Shape !== "undefined") {
            try {
                shape = new Shape(canvas, svgNode);
            } catch (err) {
                shape = null;
            }
        }

        if (!shape) {
            notFound.push(update.shapeId);
            continue;
        }

        // 1. Update properties
        if (update.properties && typeof update.properties === "object") {
            for (var propName in update.properties) {
                if (!update.properties.hasOwnProperty(propName)) continue;
                var rawVal = update.properties[propName];

                if (shape.def && typeof shape.def.getProperty === "function") {
                    var pdef = shape.def.getProperty(propName);
                    if (pdef && pdef.type && typeof pdef.type.fromString === "function") {
                        var parsedVal = pdef.type.fromString(String(rawVal));
                        if (typeof ImageData !== "undefined" && parsedVal instanceof ImageData) {
                            if (typeof resolveImageData === "function") resolveImageData(parsedVal);
                        }
                        shape.setProperty(propName, parsedVal);
                    } else if (typeof shape.setProperty === "function") {
                        shape.setProperty(propName, rawVal);
                    }
                } else if (typeof shape.setProperty === "function") {
                    shape.setProperty(propName, rawVal);
                }
            }
        }

        // 2. Update dimensions (w, h)
        if (update.box) {
            if (update.box.w !== undefined && update.box.h !== undefined) {
                var newW = Number(update.box.w);
                var newH = Number(update.box.h);
                if (typeof shape.scaleTo === "function") {
                    shape.scaleTo(newW, newH);
                } else if (typeof Dimension !== "undefined" && typeof shape.setProperty === "function") {
                    shape.setProperty("box", new Dimension(newW, newH));
                }
            }

            // 3. Update position (relative dx/dy or absolute x/y)
            if (update.box.dx !== undefined || update.box.dy !== undefined || update.box.x !== undefined || update.box.y !== undefined) {
                var targetNode = (shape && shape.svg) || svgNode;
                var curTransform = targetNode.getAttribute("transform") || "";
                var curMatrix = canvasHelper.parseMatrix(curTransform);

                var finalX = curMatrix.e;
                var finalY = curMatrix.f;

                if (update.box.dx !== undefined || update.box.dy !== undefined) {
                    finalX += (Number(update.box.dx) || 0);
                    finalY += (Number(update.box.dy) || 0);
                } else {
                    if (update.box.x !== undefined) finalX = Number(update.box.x);
                    if (update.box.y !== undefined) finalY = Number(update.box.y);
                }

                if (typeof Svg !== "undefined" && typeof Svg.ensureCTM === "function") {
                    Svg.ensureCTM(targetNode, { a: curMatrix.a, b: curMatrix.b, c: curMatrix.c, d: curMatrix.d, e: finalX, f: finalY });
                } else {
                    targetNode.setAttribute("transform", "matrix(" + [curMatrix.a, curMatrix.b, curMatrix.c, curMatrix.d, finalX, finalY].join(",") + ")");
                }

                if (typeof shape.invalidateOutboundConnections === "function") {
                    shape.invalidateOutboundConnections();
                }
            }
        }

        // 4. Update stacking order (zOrder)
        if (update.zOrder) {
            if (update.zOrder === "bringForward" && typeof shape.bringForward === "function") {
                shape.bringForward();
            } else if (update.zOrder === "sendBackward" && typeof shape.sendBackward === "function") {
                shape.sendBackward();
            } else if (update.zOrder === "bringToFront" && typeof shape.bringToFront === "function") {
                shape.bringToFront();
            } else if (update.zOrder === "sendToBack" && typeof shape.sendToBack === "function") {
                shape.sendToBack();
            }
        }

        updated.push(update.shapeId);
    }

    // Refresh canvas editors, notify modified state, and capture undo memento
    if (typeof canvas.invalidateEditors === "function") canvas.invalidateEditors();
    if (typeof canvas._sayTargetChanged === "function") canvas._sayTargetChanged();
    if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
    if (typeof canvas._saveMemento === "function") canvas._saveMemento("Update shapes via MCP");

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    pageId: target.pageId,
                    updatedCount: updated.length,
                    updated: updated,
                    notFound: notFound,
                    message: "Successfully updated " + updated.length + " shape(s)."
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    UpdateShapesTool: UpdateShapesTool
};
