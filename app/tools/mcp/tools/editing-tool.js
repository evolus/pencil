/**
 * Granular Canvas Mutation & Editing Tools Module
 * Defines and exports all interactive canvas manipulation tools:
 * - update_shapes: Selectively mutates properties, box geometry, coordinates, and z-order
 * - delete_shapes: Removes specified shapes from canvas with proper cleanup and undo memento
 * - insert_shapes: Appends new shapes onto existing canvas without clearing existing shapes
 * - select_shapes: Focuses and highlights specified shapes on active desktop canvas window
 */

var fs = require("fs");
var path = require("path");
var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;
var canvasHelper = require("./canvas-helper.js");
var editingValidator = require("./editing-validator.js");
var documentTool = require("./document-tool.js");

/*
 * Helper to generate and attach an inline visual preview to a mutation tool response.
 * If args.preview is true, captures a PNG preview of the updated canvas and returns
 * both the structured metadata and an MCP multimodal ImageContent block.
 */
async function attachPreviewIfRequested(args, target, appPane, resultPayload) {
    if (!args || !args.preview) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(resultPayload, null, 2)
                }
            ]
        };
    }

    var controller = (target && target.controller) || canvasHelper.getController(appPane);
    var previewResult = await documentTool.generatePagePreview(target.page, {
        appPane: appPane,
        controller: controller,
        format: "png",
        includeBase64: true
    });

    resultPayload.preview = previewResult.resultPayload;

    var contentBlocks = [
        {
            type: "text",
            text: JSON.stringify(resultPayload, null, 2)
        }
    ];

    if (previewResult.base64Data) {
        contentBlocks.push({
            type: "image",
            data: previewResult.base64Data,
            mimeType: "image/png"
        });
    }

    return {
        content: contentBlocks
    };
}

// =============================================================================
// Tool: update_shapes
// =============================================================================

/*
 * Structured shape element descriptor schema for insert_shapes.
 * Replaces opaque z.any() to provide explicit schema discovery and validation
 * for remote LLMs, while keeping properties and children flexible.
 */
var ShapeElementSchema = z.object({
    id: z.string().optional().describe("Client-provided temporary shape identifier. Mapped to the assigned engine UUID in the returned 'idMap'."),
    type: z.string().optional().describe("Stencil shape type identifier (e.g. 'Evolus.Common:Button', 'Evolus.Common:Label', 'Evolus.Bootstrap:Table')."),
    def: z.string().optional().describe("Legacy stencil definition identifier (deprecated, prefer 'type')."),
    x: z.number().optional().describe("Absolute X coordinate on canvas (default: 0)."),
    y: z.number().optional().describe("Absolute Y coordinate on canvas (default: 0)."),
    box: z.object({
        x: z.number().optional().describe("X coordinate offset."),
        y: z.number().optional().describe("Y coordinate offset."),
        w: z.number().optional().describe("Width dimension in pixels."),
        h: z.number().optional().describe("Height dimension in pixels.")
    }).optional().describe("Bounding box coordinates and dimensions."),
    properties: z.record(z.any()).optional().describe("Custom shape properties dictionary (e.g. { 'label': 'Submit', 'fillColor': '#2563ebff' })."),
    children: z.array(z.any()).optional().describe("Nested child element descriptors for group shapes (@group).")
});

// =============================================================================
// Tool: update_shapes
// =============================================================================

function UpdateShapesTool() {
    BaseTool.call(
        this,
        "update_shapes",
        "Selectively mutates properties, geometry dimensions, positioning (relative or absolute), and stacking order (z-order) of existing shapes on the active or specified canvas page. Targets can be specified by exact DOM engine UUID ('shapeId'), semantic search query ('query: { text, label, type }' with single-match safety guard), or active GUI selection ('target: \"selected\"').",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            shapes: z.array(
                z.object({
                    shapeId: z.string().optional().describe("The ID of the target shape to modify (assigned engine UUID)."),
                    query: z.object({
                        text: z.string().optional().describe("Substring to match in shape text, label, or content properties."),
                        label: z.string().optional().describe("Substring to match in shape label property."),
                        type: z.string().optional().describe("Stencil type identifier or suffix (e.g. 'Button').")
                    }).optional().describe("Semantic query to dynamically resolve a target shape on the target canvas. Fails safely if multiple shapes match."),
                    target: z.enum(["selected"]).optional().describe("Set to 'selected' to target currently selected shape(s) in the desktop GUI window."),
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
            ).describe("List of shape update specifications."),
            preview: z.boolean().optional().default(false).describe("If true, automatically generates and returns a multimodal visual preview (PNG) of the updated canvas in the same turn.")
        }
    );
}
UpdateShapesTool.prototype = new BaseTool();

UpdateShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var shapeUpdates = args.shapes || [];

    /*
     * Pre-flight validation on shapeUpdates payload:
     * Validates non-empty array, valid targeting criteria (shapeId, query, or target: 'selected'),
     * valid numeric box values, and property formats.
     */
    var validationResult = editingValidator.validateUpdateShapes(shapeUpdates);
    if (validationResult.errors.length > 0) {
        throw new Error("Validation failed for update_shapes (" + validationResult.errors.length + " error" + (validationResult.errors.length > 1 ? "s" : "") + "):\n" + validationResult.errors.map(function (e) { return "  - " + e; }).join("\n"));
    }

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    var updated = [];
    var notFound = [];

    for (var i = 0; i < shapeUpdates.length; i++) {
        var update = shapeUpdates[i];
        if (!update) continue;

        var targetIds = [];
        if (update.shapeId) {
            targetIds.push(update.shapeId);
        } else if (update.target === "selected") {
            var selected = canvasHelper.getSelectedTargets(canvas);
            if (selected.length === 0) {
                throw new Error("No shapes currently selected on the active canvas. Please select a shape in Pencil or specify a shapeId/query.");
            }
            for (var sIdx = 0; sIdx < selected.length; sIdx++) {
                if (selected[sIdx].id) targetIds.push(selected[sIdx].id);
            }
        } else if (update.query) {
            var qResult = canvasHelper.findTargetShapeByQuery(canvas.drawingLayer, update.query);
            if (qResult.ambiguous) {
                var candidateIds = qResult.matches.map(function (m) { return m.id; }).join(", ");
                throw new Error("Ambiguous query for update_shapes: query " + JSON.stringify(update.query) + " matched " + qResult.totalFound + " shapes (" + candidateIds + "). Please specify an exact shapeId or refine query criteria.");
            }
            if (!qResult.shape) {
                notFound.push("query:" + JSON.stringify(update.query));
                continue;
            }
            targetIds.push(qResult.shape.id);
        }

        for (var tIdx = 0; tIdx < targetIds.length; tIdx++) {
            var targetShapeId = targetIds[tIdx];
            var svgNode = canvasHelper.findElementById(canvas.drawingLayer, targetShapeId);
            if (!svgNode) {
                notFound.push(targetShapeId);
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
                notFound.push(targetShapeId);
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

            updated.push(targetShapeId);
        }
    }

    // Refresh canvas editors, notify modified state, and capture undo memento
    if (typeof canvas.invalidateEditors === "function") canvas.invalidateEditors();
    if (typeof canvas._sayTargetChanged === "function") canvas._sayTargetChanged();
    if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
    if (typeof canvas._saveMemento === "function") canvas._saveMemento("Update shapes via MCP");
    var responseMsg = "Successfully updated " + updated.length + " shape(s).";
    if (updated.length === 0 && notFound.length > 0) {
        responseMsg = "None of the specified targets (" + notFound.join(", ") + ") were found on page '" + target.pageId + "'. Note: when mutating shapes, use engine UUIDs ('shapeId') from 'idMap', semantic query ('query: { text, label, type }'), or active GUI selection ('target: \"selected\"').";
    }

    var resultPayload = {
        pageId: target.pageId,
        updatedCount: updated.length,
        updated: updated,
        notFound: notFound,
        warnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined,
        message: responseMsg
    };

    return await attachPreviewIfRequested(args, target, appPane, resultPayload);
};

// =============================================================================
// Tool: delete_shapes
// =============================================================================

function DeleteShapesTool() {
    BaseTool.call(
        this,
        "delete_shapes",
        "Removes specified shapes from the target page canvas, clearing selection and capturing undo memento. Targets can be specified by exact IDs ('shapeIds'), semantic search criteria ('query: { text, label, type }'), or active desktop GUI selection ('target: \"selected\"').",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            shapeIds: z.array(z.string()).optional().describe("Array of shape IDs to delete from the canvas."),
            query: z.object({
                text: z.string().optional().describe("Substring to match in shape text, label, or content properties."),
                label: z.string().optional().describe("Substring to match in shape label property."),
                type: z.string().optional().describe("Stencil type identifier or suffix (e.g. 'Button').")
            }).optional().describe("Semantic query to locate shapes to delete. Deletes all matching shapes."),
            target: z.enum(["selected"]).optional().describe("Set to 'selected' to delete currently selected shape(s) in the desktop GUI window."),
            preview: z.boolean().optional().default(false).describe("If true, automatically generates and returns a multimodal visual preview (PNG) of the updated canvas in the same turn.")
        }
    );
}
DeleteShapesTool.prototype = new BaseTool();

DeleteShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    var targetIds = [];
    var notFound = [];

    if (Array.isArray(args.shapeIds) && args.shapeIds.length > 0) {
        for (var i = 0; i < args.shapeIds.length; i++) {
            if (args.shapeIds[i]) targetIds.push(args.shapeIds[i]);
        }
    } else if (args.target === "selected") {
        var selected = canvasHelper.getSelectedTargets(canvas);
        if (selected.length === 0) {
            throw new Error("No shapes currently selected on the active canvas. Please select shapes in Pencil or specify shapeIds/query.");
        }
        for (var s = 0; s < selected.length; s++) {
            if (selected[s].id) targetIds.push(selected[s].id);
        }
    } else if (args.query) {
        var qMatches = canvasHelper.findShapesByQuery(canvas.drawingLayer, args.query);
        if (qMatches.totalFound === 0) {
            notFound.push("query:" + JSON.stringify(args.query));
        } else {
            for (var m = 0; m < qMatches.matches.length; m++) {
                targetIds.push(qMatches.matches[m].id);
            }
        }
    } else {
        throw new Error("No shapes specified for delete_shapes. Provide 'shapeIds', 'query' ({ text, label, type }), or target: 'selected'.");
    }

    var deleted = [];

    for (var dIdx = 0; dIdx < targetIds.length; dIdx++) {
        var id = targetIds[dIdx];
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

    var resultPayload = {
        pageId: target.pageId,
        deletedCount: deleted.length,
        deleted: deleted,
        notFound: notFound,
        message: "Successfully deleted " + deleted.length + " shape(s)."
    };

    return await attachPreviewIfRequested(args, target, appPane, resultPayload);
};

// =============================================================================
// Tool: insert_shapes
// =============================================================================

function InsertShapesTool() {
    BaseTool.call(
        this,
        "insert_shapes",
        "Appends new shapes or component clusters onto an existing canvas page without clearing existing elements or creating a new tab. When user-defined 'id' fields are provided on elements, the engine assigns internal unique UUIDs to maintain document integrity, and returns an explicit 'idMap' ({ [providedId]: assignedUUID }) in the response alongside 'shapes' records. Use the assigned UUIDs for subsequent calls to update_shapes, delete_shapes, or select_shapes. To inspect stencil types, property schemas, and examples, read the shape specification via read_knowledge_base_document({ name: 'shapes_specification' }) or discover installed stencils dynamically using get_shape_definition / list_shapes.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            x: z.number().optional().default(0).describe("Base X offset for inserted elements."),
            y: z.number().optional().default(0).describe("Base Y offset for inserted elements."),
            elements: z.array(ShapeElementSchema).describe("Array of shape descriptors. Each element defines 'type' (e.g. 'Evolus.Common:Button'), coordinates ('x', 'y' or 'box'), custom 'properties', and optional client 'id' mapped in 'idMap'. Refer to shapes_specification doc for available stencils and properties."),
            preview: z.boolean().optional().default(false).describe("If true, automatically generates and returns a multimodal visual preview (PNG) of the updated canvas in the same turn.")
        }
    );
}
InsertShapesTool.prototype = new BaseTool();

InsertShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var elements = args.elements || [];
    if (!Array.isArray(elements) || elements.length === 0) {
        throw new Error("No elements provided in 'elements' parameter. Expected an array of shape descriptors.");
    }

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    /*
     * Pre-flight schema validation and auto-normalization:
     * - Detects reading-schema 'def' and normalizes to 'type' with deprecation notice
     * - Detects top-level 'box' { x, y, w, h } and normalizes to coordinates and properties.box
     * - Normalizes object properties.box to serialized 'w,h' string
     * - Validates coordinate numbers and property microformats
     * - Rejects unknown stencil definitions with candidate suggestions rather than failing silently
     */
    var validationResult = editingValidator.validateAndNormalizeInsertElements(elements, appPane);
    if (validationResult.errors.length > 0) {
        throw new Error("Schema validation failed for insert_shapes (" + validationResult.errors.length + " error" + (validationResult.errors.length > 1 ? "s" : "") + "):\n" + validationResult.errors.map(function (e) { return "  - " + e; }).join("\n"));
    }

    var baseX = Number(args.x) || 0;
    var baseY = Number(args.y) || 0;

    var insertedShapes = [];
    var idMap = {};

    var insertRecursive = async function (children, curX, curY) {
        if (!Array.isArray(children)) return;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (!child) continue;

            if (child.type === "@group") {
                await insertRecursive(child.children, curX + (child.x || 0), curY + (child.y || 0));
            } else {
                var shapeDef = child._resolvedShapeDef;
                if (!shapeDef) {
                    if (typeof appPane.locateShapeDefinition === "function") {
                        shapeDef = appPane.locateShapeDefinition(child.type);
                    } else if (typeof CollectionManager !== "undefined" && CollectionManager.shapeDefinition) {
                        shapeDef = CollectionManager.shapeDefinition.locateDefinition(child.type);
                    }
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
                        var pdef = shapeDef.getProperty ? shapeDef.getProperty(k) : null;
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

                var targetSvg = (canvas.currentController && canvas.currentController.svg);
                if (targetSvg) {
                    if (typeof Svg !== "undefined" && typeof Svg.ensureCTM === "function") {
                        Svg.ensureCTM(targetSvg, { a: 1, b: 0, c: 0, d: 1, e: shapeX, f: shapeY });
                    } else {
                        targetSvg.setAttribute("transform", "matrix(1,0,0,1," + shapeX + "," + shapeY + ")");
                    }
                }

                var assignedId = canvas.currentController ? canvas.currentController.id : null;
                if (assignedId) {
                    /*
                     * Explicit ID Mapping:
                     * Maintain Pencil engine's native unique UUID generation on canvas shapes,
                     * but map client-provided element IDs to the assigned engine UUIDs so callers
                     * can immediately target shapes in subsequent calls without querying the DOM.
                     */
                    if (child.id && typeof child.id === "string" && child.id.trim().length > 0) {
                        idMap[child.id.trim()] = assignedId;
                    }

                    var shapeRecord = {
                        id: assignedId,
                        providedId: (child.id && typeof child.id === "string" && child.id.trim().length > 0) ? child.id.trim() : undefined,
                        type: child.type,
                        box: {
                            x: shapeX,
                            y: shapeY,
                            w: child.box ? child.box.w : undefined,
                            h: child.box ? child.box.h : undefined
                        }
                    };
                    insertedShapes.push(shapeRecord);
                }
            }
        }
    };

    await insertRecursive(elements, baseX, baseY);

    // Refresh canvas editors and capture undo memento
    if (typeof canvas.invalidateEditors === "function") canvas.invalidateEditors();
    if (typeof canvas.selectNone === "function") canvas.selectNone();
    if (typeof canvas._sayTargetChanged === "function") canvas._sayTargetChanged();
    if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
    if (typeof canvas._saveMemento === "function") canvas._saveMemento("Insert shapes via MCP");

    var resultPayload = {
        pageId: target.pageId,
        insertedCount: insertedShapes.length,
        idMap: idMap,
        shapes: insertedShapes,
        insertedShapes: insertedShapes,
        warnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined,
        message: "Successfully inserted " + insertedShapes.length + " shape(s) onto canvas."
    };

    return await attachPreviewIfRequested(args, target, appPane, resultPayload);
};

// =============================================================================
// Tool: select_shapes
// =============================================================================

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

// =============================================================================
// Tool: set_image_data
// =============================================================================

function SetImageDataTool() {
    BaseTool.call(
        this,
        "set_image_data",
        "Sets an ImageData property (bitmap or vector) on a canvas shape efficiently using a collection resource or image data, avoiding heavy base64 JSON payload transfers.",
        {
            shapeId: z.string().describe("ID of the target shape on the canvas."),
            collectionId: z.string().optional().describe("ID of the stencil collection exposing the resource (e.g. 'lucideIcons', 'Common'). Required when setting from collection."),
            resourcePath: z.string().optional().describe("Name or relative path of the exposed resource within the collection (e.g. 'search.svg', 'vectors/search.svg', 'bitmaps/avatar.png')."),
            data: z.string().optional().describe("Direct image payload (data URL, raw SVG string, or local file path) if setting an external asset rather than a collection resource."),
            propertyName: z.string().optional().describe("Name of the ImageData property to set (e.g. 'imageData' or 'image'). If omitted, auto-detects the shape's property of type ImageData."),
            box: z.object({
                w: z.number().positive().describe("Width in pixels"),
                h: z.number().positive().describe("Height in pixels")
            }).optional().describe("Optional explicit dimensions to resize the shape's bounding box."),
            matchIntrinsicSize: z.boolean().optional().default(false).describe("If true, automatically resizes the shape bounding box to match the intrinsic dimensions of the image."),
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based target page index.")
        }
    );
}
SetImageDataTool.prototype = new BaseTool();

SetImageDataTool.prototype.execute = async function (args, context) {
    if (!args || !args.shapeId) {
        throw new Error("Missing required parameter: 'shapeId'");
    }
    if (!args.collectionId && !args.resourcePath && !args.data) {
        throw new Error("Either 'collectionId' + 'resourcePath' or 'data' must be provided to set image data.");
    }

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    var svgNode = canvasHelper.findElementById(canvas.drawingLayer, args.shapeId);
    if (!svgNode) {
        throw new Error("Shape '" + args.shapeId + "' not found on page '" + target.pageId + "'.");
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
        throw new Error("Failed to instantiate controller for shape '" + args.shapeId + "'.");
    }

    // 1. Detect target propertyName
    var propName = args.propertyName ? args.propertyName.trim() : null;
    if (!propName) {
        if (shape.def && shape.def.propertyMap) {
            var matchingProps = [];
            for (var pName in shape.def.propertyMap) {
                if (!shape.def.propertyMap.hasOwnProperty(pName)) continue;
                var pDef = shape.def.propertyMap[pName];
                if (!pDef || !pDef.type) continue;
                var typeName = pDef.type.name || pDef.type.id || (typeof pDef.type === "string" ? pDef.type : "");
                if (typeName === "ImageData") {
                    matchingProps.push(pName);
                }
            }

            if (matchingProps.length === 1) {
                propName = matchingProps[0];
            } else if (matchingProps.length > 1) {
                if (matchingProps.indexOf("imageData") !== -1) {
                    propName = "imageData";
                } else if (matchingProps.indexOf("image") !== -1) {
                    propName = "image";
                } else {
                    propName = matchingProps[0];
                }
            }
        }

        if (!propName) {
            if (shape.getProperty && shape.getProperty("imageData") !== undefined) {
                propName = "imageData";
            } else if (shape.getProperty && shape.getProperty("image") !== undefined) {
                propName = "image";
            } else {
                propName = "imageData";
            }
        }
    }

    var intrinsicWidth = 24;
    var intrinsicHeight = 24;
    var imagePayload = null;

    function extractSvgDimensions(svgContent) {
        var w = null;
        var h = null;
        var vbMatch = svgContent.match(/viewBox\s*=\s*["']\s*([0-9\.\-]+)\s+([0-9\.\-]+)\s+([0-9\.\-]+)\s+([0-9\.\-]+)\s*["']/i);
        if (vbMatch) {
            w = Math.round(parseFloat(vbMatch[3]));
            h = Math.round(parseFloat(vbMatch[4]));
        }
        if (!w || !h) {
            var wMatch = svgContent.match(/width\s*=\s*["']\s*([0-9\.]+)\s*(?:px)?["']/i);
            var hMatch = svgContent.match(/height\s*=\s*["']\s*([0-9\.]+)\s*(?:px)?["']/i);
            if (wMatch && hMatch) {
                w = Math.round(parseFloat(wMatch[1]));
                h = Math.round(parseFloat(hMatch[1]));
            }
        }
        return { w: w || 24, h: h || 24 };
    }

    // 2. Resolve image data from collection resource
    if (args.collectionId && args.resourcePath) {
        var colMgr = (typeof CollectionManager !== "undefined") ? CollectionManager : (typeof window !== "undefined" ? window.CollectionManager : null);
        var targetCol = null;

        var mappedColId = (typeof ApplicationPane !== "undefined" && ApplicationPane.SUPPORTED_ICON_TYPES && ApplicationPane.SUPPORTED_ICON_TYPES[args.collectionId])
            ? ApplicationPane.SUPPORTED_ICON_TYPES[args.collectionId]
            : args.collectionId;

        if (colMgr && colMgr.findCollection) {
            targetCol = colMgr.findCollection(args.collectionId) || colMgr.findCollection(mappedColId);
        } else if (colMgr && colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections)) {
            for (var c = 0; c < colMgr.shapeDefinition.collections.length; c++) {
                var item = colMgr.shapeDefinition.collections[c];
                if (item && (item.id === args.collectionId || item.id === mappedColId)) {
                    targetCol = item;
                    break;
                }
            }
        }

        if (!targetCol) {
            throw new Error("Collection '" + args.collectionId + "' not found.");
        }

        var foundFilePath = null;
        var candidateRelPath = args.resourcePath.trim().replace(/\\/g, "/");

        var directFp = path.join(targetCol.installDirPath, candidateRelPath);
        if (fs.existsSync(directFp) && fs.statSync(directFp).isFile()) {
            foundFilePath = directFp;
        }

        if (!foundFilePath && Array.isArray(targetCol.RESOURCE_LIST)) {
            for (var r = 0; r < targetCol.RESOURCE_LIST.length; r++) {
                var prefix = targetCol.RESOURCE_LIST[r].prefix || "";
                var fp = path.join(targetCol.installDirPath, prefix, candidateRelPath);
                if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
                    foundFilePath = fp;
                    candidateRelPath = (prefix ? (prefix + "/") : "") + candidateRelPath;
                    break;
                }
                if (targetCol.RESOURCE_LIST[r].type === "svg" && !candidateRelPath.endsWith(".svg")) {
                    var fpExt = path.join(targetCol.installDirPath, prefix, candidateRelPath + ".svg");
                    if (fs.existsSync(fpExt) && fs.statSync(fpExt).isFile()) {
                        foundFilePath = fpExt;
                        candidateRelPath = (prefix ? (prefix + "/") : "") + candidateRelPath + ".svg";
                        break;
                    }
                }
            }
        }

        if (!foundFilePath) {
            var standardDirs = ["Icons", "vectors", "bitmaps", "resources", "images"];
            for (var s = 0; s < standardDirs.length; s++) {
                var sDir = standardDirs[s];
                var sFp = path.join(targetCol.installDirPath, sDir, candidateRelPath);
                if (fs.existsSync(sFp) && fs.statSync(sFp).isFile()) {
                    foundFilePath = sFp;
                    candidateRelPath = sDir + "/" + candidateRelPath;
                    break;
                }
                if (!candidateRelPath.endsWith(".svg")) {
                    var sFpSvg = path.join(targetCol.installDirPath, sDir, candidateRelPath + ".svg");
                    if (fs.existsSync(sFpSvg) && fs.statSync(sFpSvg).isFile()) {
                        foundFilePath = sFpSvg;
                        candidateRelPath = sDir + "/" + candidateRelPath + ".svg";
                        break;
                    }
                }
                if (!candidateRelPath.endsWith(".png")) {
                    var sFpPng = path.join(targetCol.installDirPath, sDir, candidateRelPath + ".png");
                    if (fs.existsSync(sFpPng) && fs.statSync(sFpPng).isFile()) {
                        foundFilePath = sFpPng;
                        candidateRelPath = sDir + "/" + candidateRelPath + ".png";
                        break;
                    }
                }
            }
        }

        if (!foundFilePath) {
            throw new Error("Resource '" + args.resourcePath + "' not found in collection '" + targetCol.displayName + "'.");
        }

        var isSvg = foundFilePath.toLowerCase().endsWith(".svg");
        if (isSvg) {
            var svgContent = fs.readFileSync(foundFilePath, "utf8");
            var dims = extractSvgDimensions(svgContent);
            intrinsicWidth = dims.w;
            intrinsicHeight = dims.h;
        } else {
            intrinsicWidth = 48;
            intrinsicHeight = 48;
            try {
                if (typeof nativeImage !== "undefined" && nativeImage.createFromPath) {
                    var nImg = nativeImage.createFromPath(foundFilePath);
                    var nSize = nImg.getSize();
                    if (nSize && nSize.width > 0 && nSize.height > 0) {
                        intrinsicWidth = nSize.width;
                        intrinsicHeight = nSize.height;
                    }
                }
            } catch (e) {
                // Keep default
            }
        }

        var refId = null;
        var pencilCtrl = (typeof Pencil !== "undefined" && Pencil.controller)
            ? Pencil.controller
            : (appPane && appPane.controller ? appPane.controller : null);

        if (pencilCtrl && typeof pencilCtrl.collectionResourceAsRefSync === "function") {
            refId = pencilCtrl.collectionResourceAsRefSync(targetCol, candidateRelPath);
        }

        if (refId) {
            imagePayload = "ref://" + refId;
        } else {
            var fileBuf = fs.readFileSync(foundFilePath);
            var mime = isSvg ? "image/svg+xml" : "image/png";
            imagePayload = "data:" + mime + ";base64," + fileBuf.toString("base64");
        }
    } else if (args.data) {
        var rawData = String(args.data).trim();
        if (rawData.startsWith("<svg") || rawData.startsWith("<?xml")) {
            var dims = extractSvgDimensions(rawData);
            intrinsicWidth = dims.w;
            intrinsicHeight = dims.h;
            imagePayload = "data:image/svg+xml;base64," + Buffer.from(rawData).toString("base64");
        } else if (rawData.startsWith("data:")) {
            imagePayload = rawData;
            intrinsicWidth = 48;
            intrinsicHeight = 48;
        } else if (fs.existsSync(rawData)) {
            var ext = path.extname(rawData).toLowerCase();
            var isSvgFile = (ext === ".svg");
            var contentBuf = fs.readFileSync(rawData);
            if (isSvgFile) {
                var dims = extractSvgDimensions(contentBuf.toString("utf8"));
                intrinsicWidth = dims.w;
                intrinsicHeight = dims.h;
                imagePayload = "data:image/svg+xml;base64," + contentBuf.toString("base64");
            } else {
                imagePayload = "data:image/png;base64," + contentBuf.toString("base64");
                intrinsicWidth = 48;
                intrinsicHeight = 48;
            }
        } else {
            imagePayload = rawData;
        }
    }

    // 3. Construct ImageData object
    var newImageData = null;
    if (typeof ImageData !== "undefined") {
        newImageData = new ImageData(intrinsicWidth, intrinsicHeight, imagePayload);
    } else {
        newImageData = [intrinsicWidth, intrinsicHeight, imagePayload].join(",");
    }

    // 4. Set property on shape
    shape.setProperty(propName, newImageData);

    // 5. Handle sizing (box or matchIntrinsicSize)
    var finalBox = null;
    if (args.box && args.box.w && args.box.h) {
        var newW = Number(args.box.w);
        var newH = Number(args.box.h);
        if (typeof shape.scaleTo === "function") {
            shape.scaleTo(newW, newH);
        } else if (typeof Dimension !== "undefined" && typeof shape.setProperty === "function") {
            shape.setProperty("box", new Dimension(newW, newH));
        }
        finalBox = { w: newW, h: newH };
    } else if (args.matchIntrinsicSize && intrinsicWidth > 0 && intrinsicHeight > 0) {
        if (typeof shape.scaleTo === "function") {
            shape.scaleTo(intrinsicWidth, intrinsicHeight);
        } else if (typeof Dimension !== "undefined" && typeof shape.setProperty === "function") {
            shape.setProperty("box", new Dimension(intrinsicWidth, intrinsicHeight));
        }
        finalBox = { w: intrinsicWidth, h: intrinsicHeight };
    }

    // 6. Invalidate canvas and commit memento
    if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
    if (typeof canvas._saveMemento === "function") canvas._saveMemento("Set shape image data via MCP");

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    pageId: target.pageId,
                    shapeId: args.shapeId,
                    propertyName: propName,
                    ref: imagePayload,
                    dimensions: {
                        w: intrinsicWidth,
                        h: intrinsicHeight
                    },
                    shapeBox: finalBox,
                    message: "Successfully set image data on shape '" + args.shapeId + "'."
                }, null, 2)
            }
        ]
    };
};

// =============================================================================
// Tool: find_shapes_in_canvas (Alias: find_shapes)
// =============================================================================

function FindShapesInCanvasTool(toolName) {
    BaseTool.call(
        this,
        toolName || "find_shapes_in_canvas",
        "Queries and inspects shapes placed on the active or specified canvas page by criteria (type, text substring, region bounding box, or IDs) without dumping the full page DOM.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            type: z.string().optional().describe("Stencil shape type identifier or element type (e.g. 'button2', 'RoundedRect', 'Evolus.Common:RoundedRect', 'shape', 'group')."),
            text: z.string().optional().describe("Case-insensitive text substring to match against shape text, label, or content properties."),
            inRegion: z.union([
                z.array(z.number()),
                z.object({
                    x: z.number().describe("X coordinate of bounding box."),
                    y: z.number().describe("Y coordinate of bounding box."),
                    w: z.number().describe("Width of bounding box."),
                    h: z.number().describe("Height of bounding box.")
                })
            ]).optional().describe("Spatial bounding box filter {x, y, w, h} or [x, y, w, h] to find shapes overlapping this canvas region."),
            ids: z.array(z.string()).optional().describe("List of specific shape engine UUIDs to find."),
            includeProperties: z.boolean().optional().default(true).describe("Whether to include the full properties dictionary in the returned shape records (defaults to true).")
        }
    );
}
FindShapesInCanvasTool.prototype = new BaseTool();

/*
 * Evaluates whether a shape record satisfies all provided filter criteria.
 * Supports type suffixes, substring text matching across all properties, and
 * 2D bounding box intersection tests.
 */
FindShapesInCanvasTool.prototype._matchesCriteria = function (shape, args) {
    if (!shape) return false;

    // 1. Filter by specific IDs
    if (Array.isArray(args.ids) && args.ids.length > 0) {
        if (args.ids.indexOf(shape.id) === -1) {
            return false;
        }
    }

    // 2. Filter by type / def
    if (args.type) {
        var queryType = String(args.type).trim().toLowerCase();
        var shapeType = String(shape.type || "").toLowerCase();
        var shapeDef = String(shape.def || "").toLowerCase();

        var matchesType = (shapeType === queryType) ||
                          (shapeDef === queryType) ||
                          (shapeDef.endsWith(":" + queryType)) ||
                          (shapeDef.indexOf(queryType) !== -1);
        if (!matchesType) return false;
    }

    // 3. Filter by text substring
    if (args.text) {
        var queryText = String(args.text).trim().toLowerCase();
        var matchedText = false;

        if (shape.text && String(shape.text).toLowerCase().indexOf(queryText) !== -1) {
            matchedText = true;
        } else if (shape.properties && typeof shape.properties === "object") {
            for (var propKey in shape.properties) {
                if (!shape.properties.hasOwnProperty(propKey)) continue;
                var val = shape.properties[propKey];
                if (val !== undefined && val !== null && String(val).toLowerCase().indexOf(queryText) !== -1) {
                    matchedText = true;
                    break;
                }
            }
        }

        if (!matchedText) return false;
    }

    // 4. Filter by region bounding box overlap
    if (args.inRegion) {
        var rx = 0, ry = 0, rw = 0, rh = 0;
        if (Array.isArray(args.inRegion)) {
            rx = Number(args.inRegion[0]) || 0;
            ry = Number(args.inRegion[1]) || 0;
            rw = Number(args.inRegion[2]) || 0;
            rh = Number(args.inRegion[3]) || 0;
        } else if (typeof args.inRegion === "object") {
            rx = Number(args.inRegion.x) || 0;
            ry = Number(args.inRegion.y) || 0;
            rw = Number(args.inRegion.w) || 0;
            rh = Number(args.inRegion.h) || 0;
        }

        var sx = Number(shape.box ? shape.box.x : shape.x) || 0;
        var sy = Number(shape.box ? shape.box.y : shape.y) || 0;
        var sw = Number(shape.box ? shape.box.w : shape.w) || 0;
        var sh = Number(shape.box ? shape.box.h : shape.h) || 0;

        var intersects = (sx <= rx + rw) && (sx + sw >= rx) && (sy <= ry + rh) && (sy + sh >= ry);
        if (!intersects) return false;
    }

    return true;
};

FindShapesInCanvasTool.prototype.execute = async function (args, context) {
    args = args || {};
    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;
    var targetPage = target.page;

    var allShapes = canvasHelper.extractPageShapes(targetPage, canvas);
    var matchedShapes = [];

    /*
     * Default includeProperties to true so callers receive full property dictionaries
     * (e.g. text0, fillColor, strokeColor) for downstream update_shapes construction
     * without needing a separate full-page DOM dump.
     */
    var includeProps = (args.includeProperties !== false);

    for (var i = 0; i < allShapes.length; i++) {
        var s = allShapes[i];
        if (this._matchesCriteria(s, args)) {
            var item = {
                id: s.id,
                type: s.type,
                def: s.def,
                box: s.box,
                x: s.x,
                y: s.y,
                w: s.w,
                h: s.h
            };
            if (s.text) {
                item.text = s.text;
            }
            if (includeProps) {
                item.properties = s.properties || {};
            }
            matchedShapes.push(item);
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    pageId: target.pageId,
                    totalFound: matchedShapes.length,
                    shapes: matchedShapes
                }, null, 2)
            }
        ]
    };
};

function FindShapesTool() {
    FindShapesInCanvasTool.call(this, "find_shapes");
}
FindShapesTool.prototype = Object.create(FindShapesInCanvasTool.prototype);
FindShapesTool.prototype.constructor = FindShapesTool;

// =============================================================================
// Tool: align_shapes
// =============================================================================

function AlignShapesTool() {
    BaseTool.call(
        this,
        "align_shapes",
        "Aligns a selection of shapes along a specified boundary (left, center-horizontal, right, top, center-vertical, bottom) on the active or specified canvas page. If referenceShapeId is provided, all other shapes are aligned relative to that reference shape; otherwise shapes are aligned relative to their collective bounding box boundary.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            shapeIds: z.array(z.string()).min(1).describe("List of shape engine UUIDs to align. Must specify at least 2 shapes unless referenceShapeId is provided."),
            mode: z.enum([
                "left",
                "center-horizontal",
                "center",
                "right",
                "top",
                "center-vertical",
                "middle",
                "bottom"
            ]).describe("Alignment axis and anchor mode: 'left', 'center-horizontal' (or 'center'), 'right', 'top', 'center-vertical' (or 'middle'), 'bottom'."),
            referenceShapeId: z.string().optional().describe("Optional reference shape ID to align all other shapes against. If omitted, shapes align to their collective bounding box boundary."),
            preview: z.boolean().optional().default(false).describe("If true, automatically generates and returns a multimodal visual preview (PNG) of the updated canvas in the same turn.")
        }
    );
}
AlignShapesTool.prototype = new BaseTool();

AlignShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var shapeIds = args.shapeIds || [];
    var mode = args.mode;
    var refId = args.referenceShapeId;

    if (!refId && shapeIds.length < 2) {
        throw new Error("At least 2 shapes must be specified in 'shapeIds' when 'referenceShapeId' is omitted.");
    }

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    var resolution = canvasHelper.resolveTargetsForShapeIds(canvas, shapeIds);
    var targets = resolution.targets;

    if (targets.length === 0) {
        throw new Error("None of the specified shapes were found on the canvas: " + resolution.notFound.join(", "));
    }

    /*
     * When a referenceShapeId is provided, alignment anchors to the geometry of that
     * specific reference target, leaving the reference shape unmoved and translating
     * all other targets by the computed differential along the chosen axis via target.moveBy.
     */
    if (refId) {
        var refTarget = null;
        for (var i = 0; i < targets.length; i++) {
            if (targets[i].id === refId) {
                refTarget = targets[i];
                break;
            }
        }
        if (!refTarget) {
            var refRes = canvasHelper.resolveTargetsForShapeIds(canvas, [refId]);
            if (refRes.targets.length > 0) {
                refTarget = refRes.targets[0];
            }
        }

        if (!refTarget) {
            throw new Error("Reference shape '" + refId + "' was not found on the canvas.");
        }

        var refRect = refTarget.getBoundingRect();

        for (var j = 0; j < targets.length; j++) {
            var t = targets[j];
            if (t.id === refId) continue;

            var curRect = t.getBoundingRect();
            var dx = 0;
            var dy = 0;

            switch (mode) {
                case "left":
                    dx = Math.round(refRect.x - curRect.x);
                    break;
                case "center-horizontal":
                case "center":
                    dx = Math.round((refRect.x + refRect.width / 2) - (curRect.x + curRect.width / 2));
                    break;
                case "right":
                    dx = Math.round((refRect.x + refRect.width) - (curRect.x + curRect.width));
                    break;
                case "top":
                    dy = Math.round(refRect.y - curRect.y);
                    break;
                case "center-vertical":
                case "middle":
                    dy = Math.round((refRect.y + refRect.height / 2) - (curRect.y + curRect.height / 2));
                    break;
                case "bottom":
                    dy = Math.round((refRect.y + refRect.height) - (curRect.y + curRect.height));
                    break;
            }

            t.moveBy(dx, dy, true);
        }
    } else {
        /*
         * When referenceShapeId is omitted, align shapes relative to their common
         * bounding box span using native TargetSet alignment methods.
         */
        var targetSet = new TargetSet(canvas, targets);

        switch (mode) {
            case "left":
                targetSet.alignLeft();
                break;
            case "center-horizontal":
            case "center":
                targetSet.alignCenter();
                break;
            case "right":
                targetSet.alignRight();
                break;
            case "top":
                targetSet.alignTop();
                break;
            case "center-vertical":
            case "middle":
                targetSet.alignMiddle();
                break;
            case "bottom":
                targetSet.alignBottom();
                break;
        }
    }

    if (typeof canvas.invalidateEditors === "function") canvas.invalidateEditors();
    if (typeof canvas._sayTargetChanged === "function") canvas._sayTargetChanged();
    if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
    if (typeof canvas._saveMemento === "function") canvas._saveMemento("Align shapes (" + mode + ") via MCP");

    var resultPayload = {
        pageId: target.pageId,
        mode: mode,
        alignedCount: targets.length,
        referenceShapeId: refId || null,
        shapeIds: targets.map(function (t) { return t.id; }),
        notFound: resolution.notFound
    };

    return await attachPreviewIfRequested(args, target, appPane, resultPayload);
};

// =============================================================================
// Tool: distribute_shapes
// =============================================================================

function DistributeShapesTool() {
    BaseTool.call(
        this,
        "distribute_shapes",
        "Distributes shapes evenly along an axis (horizontal or vertical) on the active or specified canvas page. When spacing is omitted, shapes are distributed evenly across the outer bounding span. When spacing is provided, shapes are spaced sequentially from first to last using the specified pixel gap.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            shapeIds: z.array(z.string()).min(2).describe("List of at least two shape engine UUIDs to distribute."),
            axis: z.enum(["horizontal", "vertical"]).describe("Distribution direction: 'horizontal' (along X axis) or 'vertical' (along Y axis)."),
            spacing: z.number().optional().describe("Optional fixed pixel gap between adjacent shapes. If omitted, shapes are distributed evenly across the outer bounding span."),
            preview: z.boolean().optional().default(false).describe("If true, automatically generates and returns a multimodal visual preview (PNG) of the updated canvas in the same turn.")
        }
    );
}
DistributeShapesTool.prototype = new BaseTool();

DistributeShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var shapeIds = args.shapeIds || [];
    var axis = args.axis;
    var spacing = args.spacing;

    if (shapeIds.length < 2) {
        throw new Error("At least 2 shapes must be specified in 'shapeIds' to distribute.");
    }

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    var resolution = canvasHelper.resolveTargetsForShapeIds(canvas, shapeIds);
    var targets = resolution.targets;

    if (targets.length < 2) {
        throw new Error("At least 2 valid shapes on the canvas are required for distribution; found " + targets.length + ".");
    }

    /*
     * If explicit spacing is omitted, distribute shapes evenly across the bounding span
     * using native TargetSet makeSameHorizontalSpace / makeSameVerticalSpace methods.
     */
    if (spacing === undefined || spacing === null) {
        var targetSet = new TargetSet(canvas, targets);

        if (axis === "horizontal") {
            targetSet.makeSameHorizontalSpace();
        } else if (axis === "vertical") {
            targetSet.makeSameVerticalSpace();
        }
    } else {
        /*
         * Sequential gap spacing: sorts shapes along the axis, pins the first shape in place,
         * and spaces all subsequent shapes consecutively with the requested pixel spacing via target.moveBy.
         */
        var pixelGap = Number(spacing);
        if (axis === "horizontal") {
            targets.sort(function (a, b) {
                return a.getBoundingRect().x - b.getBoundingRect().x;
            });
            for (var h = 1; h < targets.length; h++) {
                var prevRect = targets[h - 1].getBoundingRect();
                var thisRect = targets[h].getBoundingRect();
                var targetX = prevRect.x + prevRect.width + pixelGap;
                var dx = Math.round(targetX - thisRect.x);
                targets[h].moveBy(dx, 0, true);
            }
        } else {
            targets.sort(function (a, b) {
                return a.getBoundingRect().y - b.getBoundingRect().y;
            });
            for (var v = 1; v < targets.length; v++) {
                var prevVRect = targets[v - 1].getBoundingRect();
                var thisVRect = targets[v].getBoundingRect();
                var targetY = prevVRect.y + prevVRect.height + pixelGap;
                var dy = Math.round(targetY - thisVRect.y);
                targets[v].moveBy(0, dy, true);
            }
        }
    }

    if (typeof canvas.invalidateEditors === "function") canvas.invalidateEditors();
    if (typeof canvas._sayTargetChanged === "function") canvas._sayTargetChanged();
    if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
    if (typeof canvas._saveMemento === "function") canvas._saveMemento("Distribute shapes (" + axis + ") via MCP");

    var resultPayload = {
        pageId: target.pageId,
        axis: axis,
        distributedCount: targets.length,
        spacing: spacing !== undefined ? spacing : "even",
        shapeIds: targets.map(function (t) { return t.id; }),
        notFound: resolution.notFound
    };

    return await attachPreviewIfRequested(args, target, appPane, resultPayload);
};

// =============================================================================
// Tool: move_shapes
// =============================================================================

function MoveShapesTool() {
    BaseTool.call(
        this,
        "move_shapes",
        "Translates one or more shapes on the active or specified canvas page by relative offsets (dx, dy) without requiring callers to compute absolute coordinates. Uses native target controller moveBy and TargetSet grouping.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            shapeIds: z.array(z.string()).min(1).describe("List of shape engine UUIDs to translate."),
            dx: z.number().describe("Horizontal relative translation offset in pixels."),
            dy: z.number().describe("Vertical relative translation offset in pixels."),
            preview: z.boolean().optional().default(false).describe("If true, automatically generates and returns a multimodal visual preview (PNG) of the updated canvas in the same turn.")
        }
    );
}
MoveShapesTool.prototype = new BaseTool();

MoveShapesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var shapeIds = args.shapeIds || [];
    var dx = Number(args.dx) || 0;
    var dy = Number(args.dy) || 0;

    var appPane = canvasHelper.getApplicationPane();
    var pageTarget = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = pageTarget.canvas;

    var resolution = canvasHelper.resolveTargetsForShapeIds(canvas, shapeIds);
    var targets = resolution.targets;

    if (targets.length === 0) {
        throw new Error("None of the specified shapes were found on the canvas: " + resolution.notFound.join(", "));
    }

    /*
     * Dispatches relative translation directly against the target: a single target
     * or a TargetSet if multiple shapes are specified.
     */
    var moveTarget = targets.length > 1 ? new TargetSet(canvas, targets) : targets[0];
    moveTarget.moveBy(dx, dy, true);

    if (typeof canvas.invalidateEditors === "function") canvas.invalidateEditors();
    if (typeof canvas._sayTargetChanged === "function") canvas._sayTargetChanged();
    if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
    if (typeof canvas._saveMemento === "function") canvas._saveMemento("Move shapes via MCP");

    var resultPayload = {
        pageId: pageTarget.pageId,
        dx: dx,
        dy: dy,
        movedCount: targets.length,
        shapeIds: targets.map(function (t) { return t.id; }),
        notFound: resolution.notFound
    };

    return await attachPreviewIfRequested(args, pageTarget, appPane, resultPayload);
};

// =============================================================================
// Tool: shift_layout
// =============================================================================

function ShiftLayoutTool() {
    BaseTool.call(
        this,
        "shift_layout",
        "Reflows canvas layout by shifting all shapes whose coordinate along an axis (x or y) is greater than or equal to a specified threshold by delta pixels. Seamlessly inserts space for new sections or closes gaps when sections are removed.",
        {
            pageId: z.string().optional().describe("Target page ID. Defaults to active page."),
            pageIndex: z.number().int().optional().describe("0-based page index. Optional alternative to pageId."),
            axis: z.enum(["x", "y"]).describe("Spatial reflow axis: 'x' (horizontal shift) or 'y' (vertical shift)."),
            threshold: z.number().describe("Boundary coordinate along the axis: all shapes with coordinate >= threshold will be shifted."),
            delta: z.number().describe("Pixel offset to shift matching shapes by (positive opens space, negative closes gaps)."),
            preview: z.boolean().optional().default(false).describe("If true, automatically generates and returns a multimodal visual preview (PNG) of the updated canvas in the same turn.")
        }
    );
}
ShiftLayoutTool.prototype = new BaseTool();

ShiftLayoutTool.prototype.execute = async function (args, context) {
    args = args || {};
    var axis = args.axis;
    var threshold = Number(args.threshold);
    var delta = Number(args.delta);

    var appPane = canvasHelper.getApplicationPane();
    var target = canvasHelper.resolveTargetPageAndCanvas(appPane, args.pageId, args.pageIndex);
    var canvas = target.canvas;

    /*
     * Query top-level elements directly within canvas.drawingLayer to avoid double-translating
     * child shapes that reside inside grouped containers (<g p:type="Group">).
     */
    var childNodes = canvas.drawingLayer ? (canvas.drawingLayer.childNodes || canvas.drawingLayer.children || []) : [];
    var affectedTargets = [];

    for (var i = 0; i < childNodes.length; i++) {
        var node = childNodes[i];
        if (node.nodeType !== 1) continue;

        var controller = null;
        if (typeof canvas.createControllerFor === "function") {
            controller = canvas.createControllerFor(node);
        }
        if ((!controller || (typeof Null !== "undefined" && controller instanceof Null)) && typeof Shape !== "undefined") {
            try {
                controller = new Shape(canvas, node);
            } catch (err) {
                controller = null;
            }
        }

        if (!controller || (typeof Null !== "undefined" && controller instanceof Null) || !controller.id) {
            continue;
        }

        var rect = controller.getBoundingRect();
        var coord = (axis === "x") ? rect.x : rect.y;

        if (coord >= threshold) {
            affectedTargets.push(controller);
        }
    }

    if (affectedTargets.length > 0) {
        var dx = (axis === "x") ? delta : 0;
        var dy = (axis === "y") ? delta : 0;

        /*
         * Execute the reflow translation directly on the target (single target or TargetSet).
         */
        var shiftTarget = affectedTargets.length > 1 ? new TargetSet(canvas, affectedTargets) : affectedTargets[0];
        shiftTarget.moveBy(dx, dy, true);

        if (typeof canvas.invalidateEditors === "function") canvas.invalidateEditors();
        if (typeof canvas._sayTargetChanged === "function") canvas._sayTargetChanged();
        if (typeof canvas._sayContentModified === "function") canvas._sayContentModified();
        if (typeof canvas._saveMemento === "function") canvas._saveMemento("Shift layout (" + axis + ") via MCP");
    }

    var resultPayload = {
        pageId: target.pageId,
        axis: axis,
        threshold: threshold,
        delta: delta,
        shiftedCount: affectedTargets.length,
        shiftedShapeIds: affectedTargets.map(function (t) { return t.id; })
    };

    return await attachPreviewIfRequested(args, target, appPane, resultPayload);
};

module.exports = {
    UpdateShapesTool: UpdateShapesTool,
    DeleteShapesTool: DeleteShapesTool,
    InsertShapesTool: InsertShapesTool,
    SelectShapesTool: SelectShapesTool,
    SetImageDataTool: SetImageDataTool,
    FindShapesInCanvasTool: FindShapesInCanvasTool,
    FindShapesTool: FindShapesTool,
    AlignShapesTool: AlignShapesTool,
    DistributeShapesTool: DistributeShapesTool,
    MoveShapesTool: MoveShapesTool,
    ShiftLayoutTool: ShiftLayoutTool
};

