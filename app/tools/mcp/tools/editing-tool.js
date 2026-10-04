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

// =============================================================================
// Tool: update_shapes
// =============================================================================

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

// =============================================================================
// Tool: delete_shapes
// =============================================================================

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

// =============================================================================
// Tool: insert_shapes
// =============================================================================

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

                var targetSvg = (canvas.currentController && canvas.currentController.svg);
                if (targetSvg) {
                    if (typeof Svg !== "undefined" && typeof Svg.ensureCTM === "function") {
                        Svg.ensureCTM(targetSvg, { a: 1, b: 0, c: 0, d: 1, e: shapeX, f: shapeY });
                    } else {
                        targetSvg.setAttribute("transform", "matrix(1,0,0,1," + shapeX + "," + shapeY + ")");
                    }
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

module.exports = {
    UpdateShapesTool: UpdateShapesTool,
    DeleteShapesTool: DeleteShapesTool,
    InsertShapesTool: InsertShapesTool,
    SelectShapesTool: SelectShapesTool,
    SetImageDataTool: SetImageDataTool
};
