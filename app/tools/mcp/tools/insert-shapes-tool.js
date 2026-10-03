/**
 * Tool: insert_shapes
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Injects new shapes onto an existing canvas page without clearing or recreating the page.
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;
var canvasHelper = require("./canvas-helper.js");

function InsertShapesTool() {
    BaseTool.call(
        this,
        "insert_shapes",
        "Appends new shapes or component clusters onto an existing canvas page without clearing existing elements or creating a new tab.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            x: z.number().optional().default(0).describe("Base X offset for inserted elements."),
            y: z.number().optional().default(0).describe("Base Y offset for inserted elements."),
            elements: z.array(z.any()).describe("Array of shape descriptors matching the canonical design elements JSON schema.")
        }
    );
}
InsertShapesTool.prototype = new BaseTool();

InsertShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var elements = args.elements || [];
    if (!Array.isArray(elements) || elements.length === 0) {
        throw new Error("No elements provided in 'elements' parameter.");
    }

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    var baseX = Number(args.x) || 0;
    var baseY = Number(args.y) || 0;

    var insertedShapes = [];

    var insertRecursive = async function (children, curX, curY) {
        if (!Array.isArray(children)) return;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (!child) continue;

            if (child.type === "@group") {
                await insertRecursive(child.children, curX + (child.x || 0), curY + (child.y || 0));
            } else {
                var shapeDef = null;
                if (typeof appPane.locateShapeDefinition === "function") {
                    shapeDef = appPane.locateShapeDefinition(child.type);
                } else if (typeof CollectionManager !== "undefined" && CollectionManager.shapeDefinition) {
                    shapeDef = CollectionManager.shapeDefinition.locateDefinition(child.type);
                }

                if (!shapeDef) {
                    if (context && context.logger) {
                        context.logger.warn("Ignoring unknown shape type during insert: " + child.type);
                    }
                    continue;
                }

                var valueMap = {};
                if (child.properties && typeof child.properties === "object") {
                    for (var k in child.properties) {
                        if (!child.properties.hasOwnProperty(k)) continue;
                        var pdef = shapeDef.getProperty(k);
                        if (!pdef || !pdef.type) continue;

                        var valLiteral = child.properties[k];
                        var val = pdef.type.fromString ? pdef.type.fromString(String(valLiteral)) : valLiteral;

                        if (typeof ImageData !== "undefined" && val instanceof ImageData) {
                            if (typeof resolveImageData === "function") resolveImageData(val);
                        }

                        valueMap[k] = { initialValue: val };
                    }
                }

                canvas.insertShapeImpl_(shapeDef, null, valueMap);

                var shapeX = curX + (child.x || 0);
                var shapeY = curY + (child.y || 0);

                if (canvas.currentController && typeof canvas.currentController.moveBy === "function") {
                    canvas.currentController.moveBy(shapeX, shapeY, true);
                }

                if (canvas.currentController && canvas.currentController.id) {
                    insertedShapes.push({
                        id: canvas.currentController.id,
                        type: child.type,
                        box: {
                            x: shapeX,
                            y: shapeY,
                            w: child.box ? child.box.w : undefined,
                            h: child.box ? child.box.h : undefined
                        }
                    });
                }
            }
        }
    };

    // Notice: Dom.empty(canvas.drawingLayer) is NOT called here! Existing shapes are preserved.
    await insertRecursive(elements, baseX, baseY);

    // Refresh canvas editors and capture undo memento
    if (typeof canvas.invalidateEditors === "function") canvas.invalidateEditors();
    if (typeof canvas.selectNone === "function") canvas.selectNone();
    if (typeof canvas._sayTargetChanged === "function") canvas._sayTargetChanged();
    if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
    if (typeof canvas._saveMemento === "function") canvas._saveMemento("Insert shapes via MCP");

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    pageId: target.pageId,
                    insertedCount: insertedShapes.length,
                    insertedShapes: insertedShapes,
                    message: "Successfully inserted " + insertedShapes.length + " shape(s) onto canvas."
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    InsertShapesTool: InsertShapesTool
};
