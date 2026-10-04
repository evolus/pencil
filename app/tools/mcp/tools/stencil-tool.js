/**
 * Stencil & Resource Catalog Tools Module
 * Defines and exports all stencil collection and resource discovery tools:
 * - list_collections: Lists installed and visible stencil collections
 * - get_shape_definition: Inspects shape property schemas and defaults
 * - list_collection_resources: Discovers bundled vector and bitmap resources
 */

var fs = require("fs");
var path = require("path");
var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;

// =============================================================================
// Tool: list_collections
// =============================================================================

function ListCollectionsTool() {
    BaseTool.call(
        this,
        "list_collections",
        "Lists all installed and visible stencil collections currently loaded in Pencil with their metadata and available shape identifiers.",
        {
            includeShapes: z.boolean().optional().default(false).describe("Whether to return the full list of shape IDs for each collection.")
        }
    );
}
ListCollectionsTool.prototype = new BaseTool();

ListCollectionsTool.prototype._getCollectionManager = function () {
    if (typeof CollectionManager !== "undefined") {
        return CollectionManager;
    }
    if (typeof window !== "undefined" && window.CollectionManager) {
        return window.CollectionManager;
    }
    if (typeof global !== "undefined" && global.CollectionManager) {
        return global.CollectionManager;
    }
    return null;
};

ListCollectionsTool.prototype.execute = async function (args, context) {
    args = args || {};
    var includeShapes = Boolean(args.includeShapes);
    var colMgr = this._getCollectionManager();

    var collectionsList = [];

    if (colMgr && colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections)) {
        var allCols = colMgr.shapeDefinition.collections;
        for (var i = 0; i < allCols.length; i++) {
            var col = allCols[i];
            if (!col || !col.id) continue;

            // Only list installed and visible collections (reusing Pencil's CollectionManager.isCollectionVisible)
            var isVisible = true;
            if (typeof colMgr.isCollectionVisible === "function") {
                isVisible = colMgr.isCollectionVisible(col);
            } else if (typeof col.visible !== "undefined") {
                isVisible = (col.visible === true);
            }
            if (!isVisible) continue;

            var shapeIds = [];
            if (Array.isArray(col.shapeDefs)) {
                for (var j = 0; j < col.shapeDefs.length; j++) {
                    var s = col.shapeDefs[j];
                    if (s && s.id) {
                        shapeIds.push(s.id);
                    }
                }
            } else if (col.shapeDefs && typeof col.shapeDefs === "object") {
                for (var key in col.shapeDefs) {
                    if (col.shapeDefs.hasOwnProperty(key)) {
                        var def = col.shapeDefs[key];
                        shapeIds.push((def && def.id) ? def.id : key);
                    }
                }
            }

            var colSummary = {
                id: col.id,
                displayName: col.displayName || col.id,
                shapeCount: shapeIds.length
            };

            if (includeShapes) {
                colSummary.shapes = shapeIds;
            }

            collectionsList.push(colSummary);
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    collections: collectionsList
                }, null, 2)
            }
        ]
    };
};

// =============================================================================
// Tool: get_shape_definition
// =============================================================================

function GetShapeDefinitionTool() {
    BaseTool.call(
        this,
        "get_shape_definition",
        "Returns the property schema, default values, and metadata for a specific shape or all shapes within a collection.",
        {
            collectionId: z.string().describe("The collection ID (e.g. 'Evolus.Common')."),
            shapeId: z.string().optional().describe("Optional shape ID within the collection (e.g. 'rect'). If omitted, returns all shape definitions for the collection.")
        }
    );
}
GetShapeDefinitionTool.prototype = new BaseTool();

GetShapeDefinitionTool.prototype._getCollectionManager = function () {
    if (typeof CollectionManager !== "undefined") {
        return CollectionManager;
    }
    if (typeof window !== "undefined" && window.CollectionManager) {
        return window.CollectionManager;
    }
    if (typeof global !== "undefined" && global.CollectionManager) {
        return global.CollectionManager;
    }
    return null;
};

GetShapeDefinitionTool.prototype._formatShapeProperties = function (shapeDef) {
    var props = {};
    if (!shapeDef) return props;

    if (shapeDef.propertyMap && typeof shapeDef.propertyMap === "object") {
        for (var propName in shapeDef.propertyMap) {
            if (!shapeDef.propertyMap.hasOwnProperty(propName)) continue;
            var prop = shapeDef.propertyMap[propName];
            if (!prop) continue;

            var typeName = "PlainText";
            if (prop.type) {
                if (prop.type.name) {
                    typeName = prop.type.name;
                } else if (typeof prop.type === "string") {
                    typeName = prop.type;
                } else if (prop.type.id) {
                    typeName = prop.type.id;
                }
            }

            var defaultValue = "";
            if (prop.initialValue !== undefined && prop.initialValue !== null) {
                if (typeof prop.initialValue.toString === "function") {
                    defaultValue = prop.initialValue.toString();
                } else {
                    defaultValue = String(prop.initialValue);
                }
            } else if (prop.defaultValue !== undefined && prop.defaultValue !== null) {
                defaultValue = String(prop.defaultValue);
            }

            props[propName] = {
                type: typeName,
                default: defaultValue
            };

            if (prop.displayName) {
                props[propName].displayName = prop.displayName;
            }
        }
    }

    return props;
};

GetShapeDefinitionTool.prototype.execute = async function (args, context) {
    if (!args || !args.collectionId) {
        throw new Error("Missing required argument: 'collectionId'");
    }

    var collectionId = args.collectionId.trim();
    var shapeId = args.shapeId ? args.shapeId.trim() : null;

    var colMgr = this._getCollectionManager();
    if (!colMgr || !colMgr.shapeDefinition || !Array.isArray(colMgr.shapeDefinition.collections)) {
        throw new Error("CollectionManager is not available in Pencil runtime memory.");
    }

    // Locate target collection
    var targetCol = null;
    var allCols = colMgr.shapeDefinition.collections;
    for (var i = 0; i < allCols.length; i++) {
        if (allCols[i] && allCols[i].id === collectionId) {
            targetCol = allCols[i];
            break;
        }
    }

    if (!targetCol) {
        throw new Error("Collection '" + collectionId + "' not found. Call list_collections to discover valid IDs.");
    }

    // Case 1: Specific shapeId requested
    if (shapeId) {
        var shapeDef = null;
        if (typeof targetCol.getShapeDefById === "function") {
            shapeDef = targetCol.getShapeDefById(shapeId);
        }

        if (!shapeDef && targetCol.shapeDefMap) {
            shapeDef = targetCol.shapeDefMap[shapeId];
        }

        if (!shapeDef && Array.isArray(targetCol.shapeDefs)) {
            for (var j = 0; j < targetCol.shapeDefs.length; j++) {
                if (targetCol.shapeDefs[j] && targetCol.shapeDefs[j].id === shapeId) {
                    shapeDef = targetCol.shapeDefs[j];
                    break;
                }
            }
        }

        if (!shapeDef && colMgr.shapeDefinition.locateDefinition) {
            shapeDef = colMgr.shapeDefinition.locateDefinition(collectionId + ":" + shapeId);
        }

        if (!shapeDef) {
            throw new Error("Shape '" + shapeId + "' not found in collection '" + collectionId + "'.");
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        collectionId: collectionId,
                        shapeId: shapeDef.id || shapeId,
                        displayName: shapeDef.displayName || shapeId,
                        properties: this._formatShapeProperties(shapeDef)
                    }, null, 2)
                }
            ]
        };
    }

    // Case 2: All shapes in collection requested (shapeId omitted)
    var shapesList = [];
    if (Array.isArray(targetCol.shapeDefs)) {
        for (var k = 0; k < targetCol.shapeDefs.length; k++) {
            var sDef = targetCol.shapeDefs[k];
            if (!sDef || !sDef.id) continue;
            shapesList.push({
                shapeId: sDef.id,
                displayName: sDef.displayName || sDef.id,
                properties: this._formatShapeProperties(sDef)
            });
        }
    } else if (targetCol.shapeDefs && typeof targetCol.shapeDefs === "object") {
        for (var sKey in targetCol.shapeDefs) {
            if (!targetCol.shapeDefs.hasOwnProperty(sKey)) continue;
            var defObj = targetCol.shapeDefs[sKey];
            var sId = (defObj && defObj.id) ? defObj.id : sKey;
            shapesList.push({
                shapeId: sId,
                displayName: (defObj && defObj.displayName) ? defObj.displayName : sId,
                properties: this._formatShapeProperties(defObj)
            });
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    collectionId: collectionId,
                    shapes: shapesList
                }, null, 2)
            }
        ]
    };
};

// =============================================================================
// Tool: list_collection_resources
// =============================================================================

function scanDirectoryForResources(dirPath, relPrefix, typeFilter, keyword, results, limit) {
    if (results.length >= limit) return;
    if (!fs.existsSync(dirPath)) return;

    var entries = [];
    try {
        entries = fs.readdirSync(dirPath);
    } catch (e) {
        return;
    }

    for (var i = 0; i < entries.length; i++) {
        if (results.length >= limit) break;
        var name = entries[i];
        if (name.startsWith(".")) continue;

        var fullPath = path.join(dirPath, name);
        var stat = null;
        try {
            stat = fs.statSync(fullPath);
        } catch (e) {
            continue;
        }

        var currentRel = relPrefix ? (relPrefix + "/" + name) : name;

        if (stat.isDirectory()) {
            scanDirectoryForResources(fullPath, currentRel, typeFilter, keyword, results, limit);
        } else if (stat.isFile()) {
            var ext = path.extname(name).toLowerCase();
            var resType = null;
            if (ext === ".svg") {
                resType = "svg";
            } else if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".gif" || ext === ".webp") {
                resType = "bitmap";
            }

            if (!resType) continue;
            if (typeFilter !== "all" && resType !== typeFilter) continue;

            if (keyword) {
                var matchName = name.toLowerCase();
                var matchRel = currentRel.toLowerCase();
                if (matchName.indexOf(keyword) === -1 && matchRel.indexOf(keyword) === -1) {
                    continue;
                }
            }

            results.push({
                name: path.basename(name, ext),
                relativePath: currentRel.replace(/\\/g, "/"),
                type: resType
            });
        }
    }
}

function ListCollectionResourcesTool() {
    BaseTool.call(
        this,
        "list_collection_resources",
        "Discovers available vector (SVG) and raster/bitmap (PNG, JPEG) resources exposed by loaded stencil collections.",
        {
            collectionId: z.string().optional().describe("Optional collection ID (e.g. 'lucideIcons', 'Common'). If omitted, searches across all loaded collections."),
            type: z.enum(["all", "svg", "bitmap"]).optional().default("all").describe("Filter by resource type: 'svg' for vector graphics, 'bitmap' for raster images, or 'all'."),
            keyword: z.string().optional().describe("Case-insensitive keyword to filter resource names or relative paths."),
            limit: z.number().int().positive().optional().default(100).describe("Maximum number of resources to return (default 100).")
        }
    );
}
ListCollectionResourcesTool.prototype = new BaseTool();

ListCollectionResourcesTool.prototype._getCollectionManager = function () {
    if (typeof CollectionManager !== "undefined") {
        return CollectionManager;
    }
    if (typeof window !== "undefined" && window.CollectionManager) {
        return window.CollectionManager;
    }
    if (typeof global !== "undefined" && global.CollectionManager) {
        return global.CollectionManager;
    }
    return null;
};

ListCollectionResourcesTool.prototype.execute = async function (args, context) {
    args = args || {};
    var collectionId = args.collectionId ? args.collectionId.trim() : null;
    var typeFilter = args.type || "all";
    var keyword = args.keyword ? args.keyword.trim().toLowerCase() : null;
    var limit = typeof args.limit === "number" ? Math.max(1, args.limit) : 100;

    var colMgr = this._getCollectionManager();
    var allCols = (colMgr && colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections))
        ? colMgr.shapeDefinition.collections
        : [];

    var targetCols = [];
    if (collectionId) {
        var mappedId = (typeof ApplicationPane !== "undefined" && ApplicationPane.SUPPORTED_ICON_TYPES && ApplicationPane.SUPPORTED_ICON_TYPES[collectionId])
            ? ApplicationPane.SUPPORTED_ICON_TYPES[collectionId]
            : collectionId;

        for (var i = 0; i < allCols.length; i++) {
            if (allCols[i] && (allCols[i].id === collectionId || allCols[i].id === mappedId)) {
                targetCols.push(allCols[i]);
                break;
            }
        }

        if (targetCols.length === 0) {
            throw new Error("Collection '" + collectionId + "' not found. Call list_collections to discover valid collection IDs.");
        }
    } else {
        targetCols = allCols;
    }

    var allResources = [];

    for (var c = 0; c < targetCols.length; c++) {
        if (allResources.length >= limit) break;
        var col = targetCols[c];
        if (!col || !col.installDirPath) continue;

        var colResources = [];

        if (Array.isArray(col.RESOURCE_LIST) && col.RESOURCE_LIST.length > 0) {
            for (var r = 0; r < col.RESOURCE_LIST.length; r++) {
                if (allResources.length + colResources.length >= limit) break;
                var resMeta = col.RESOURCE_LIST[r];
                if (!resMeta || !resMeta.prefix) continue;
                if (typeFilter !== "all" && resMeta.type && resMeta.type !== typeFilter) continue;

                var resDir = path.join(col.installDirPath, resMeta.prefix);
                scanDirectoryForResources(resDir, resMeta.prefix, typeFilter, keyword, colResources, limit - allResources.length);
            }
        } else {
            var candidates = ["Icons", "bitmaps", "vectors", "resources", "images"];
            for (var d = 0; d < candidates.length; d++) {
                if (allResources.length + colResources.length >= limit) break;
                var candDir = path.join(col.installDirPath, candidates[d]);
                if (fs.existsSync(candDir)) {
                    scanDirectoryForResources(candDir, candidates[d], typeFilter, keyword, colResources, limit - allResources.length);
                }
            }
        }

        for (var k = 0; k < colResources.length; k++) {
            if (allResources.length >= limit) break;
            var item = colResources[k];
            allResources.push({
                collectionId: col.id,
                collectionName: col.displayName || col.id,
                name: item.name,
                relativePath: item.relativePath,
                type: item.type
            });
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    totalCount: allResources.length,
                    limit: limit,
                    type: typeFilter,
                    collectionId: collectionId || null,
                    resources: allResources
                }, null, 2)
            }
        ]
    };
};

// =============================================================================
// Tool: list_shape_definitions (Alias: list_shapes)
// =============================================================================

function ListShapeDefinitionsTool(toolName) {
    BaseTool.call(
        this,
        toolName || "list_shape_definitions",
        "Lists and searches lightweight stencil shape definitions from installed collections, with optional collection scoping, keyword search, and pagination without heavy schema bloat.",
        {
            collectionId: z.string().optional().describe("Optional collection ID (e.g. 'Evolus.Common', 'BasicWebElements'). If omitted, searches across all installed collections."),
            query: z.string().optional().describe("Optional search keyword to match shape definition ID, displayName, or description."),
            limit: z.number().int().positive().optional().default(50).describe("Maximum number of shape definitions to return (default: 50)."),
            offset: z.number().int().nonnegative().optional().default(0).describe("0-based pagination offset (default: 0).")
        }
    );
}
ListShapeDefinitionsTool.prototype = new BaseTool();

ListShapeDefinitionsTool.prototype._getCollectionManager = function () {
    if (typeof CollectionManager !== "undefined") {
        return CollectionManager;
    }
    if (typeof window !== "undefined" && window.CollectionManager) {
        return window.CollectionManager;
    }
    if (typeof global !== "undefined" && global.CollectionManager) {
        return global.CollectionManager;
    }
    return null;
};

/*
 * Traverses candidate collections, aggregates lightweight shape definition records,
 * applies keyword search filtering across ID, displayName, and description, and returns
 * a paginated slice.
 */
ListShapeDefinitionsTool.prototype.execute = async function (args, context) {
    args = args || {};
    var collectionId = args.collectionId ? String(args.collectionId).trim() : null;
    var query = args.query ? String(args.query).trim().toLowerCase() : null;
    var limit = (args.limit !== undefined && args.limit !== null) ? Math.max(1, Number(args.limit)) : 50;
    var offset = (args.offset !== undefined && args.offset !== null) ? Math.max(0, Number(args.offset)) : 0;

    var colMgr = this._getCollectionManager();
    if (!colMgr || !colMgr.shapeDefinition || !Array.isArray(colMgr.shapeDefinition.collections)) {
        throw new Error("CollectionManager is not available in Pencil runtime memory.");
    }

    var allCols = colMgr.shapeDefinition.collections;
    var targetCols = [];

    if (collectionId) {
        for (var i = 0; i < allCols.length; i++) {
            if (allCols[i] && allCols[i].id === collectionId) {
                targetCols.push(allCols[i]);
                break;
            }
        }
        if (targetCols.length === 0) {
            throw new Error("Collection '" + collectionId + "' not found. Call list_collections to discover valid collection IDs.");
        }
    } else {
        for (var c = 0; c < allCols.length; c++) {
            var col = allCols[c];
            if (!col || !col.id) continue;
            var isVisible = true;
            if (typeof colMgr.isCollectionVisible === "function") {
                isVisible = colMgr.isCollectionVisible(col);
            } else if (typeof col.visible !== "undefined") {
                isVisible = (col.visible === true);
            }
            if (isVisible) {
                targetCols.push(col);
            }
        }
    }

    var allDefs = [];

    for (var j = 0; j < targetCols.length; j++) {
        var tCol = targetCols[j];
        var cId = tCol.id;

        var shapeDefsList = [];
        if (Array.isArray(tCol.shapeDefs)) {
            shapeDefsList = tCol.shapeDefs;
        } else if (tCol.shapeDefs && typeof tCol.shapeDefs === "object") {
            for (var key in tCol.shapeDefs) {
                if (tCol.shapeDefs.hasOwnProperty(key)) {
                    var sObj = tCol.shapeDefs[key];
                    shapeDefsList.push((sObj && sObj.id) ? sObj : { id: key });
                }
            }
        }

        for (var k = 0; k < shapeDefsList.length; k++) {
            var sDef = shapeDefsList[k];
            if (!sDef || !sDef.id) continue;

            var sId = sDef.id;
            var displayName = sDef.displayName || sId;
            var description = sDef.description || "";
            var shapeType = cId + ":" + sId;
            var iconPath = sDef.icon || sDef.iconPath || "";

            if (query) {
                var matches = (sId.toLowerCase().indexOf(query) !== -1) ||
                              (displayName.toLowerCase().indexOf(query) !== -1) ||
                              (description.toLowerCase().indexOf(query) !== -1) ||
                              (shapeType.toLowerCase().indexOf(query) !== -1);
                if (!matches) continue;
            }

            allDefs.push({
                id: sId,
                shapeType: shapeType,
                collectionId: cId,
                displayName: displayName,
                description: description,
                iconPath: iconPath
            });
        }
    }

    var total = allDefs.length;
    var paginated = allDefs.slice(offset, offset + limit);

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    total: total,
                    offset: offset,
                    limit: limit,
                    collectionId: collectionId || null,
                    query: query || null,
                    shapeDefinitions: paginated
                }, null, 2)
            }
        ]
    };
};

function ListShapesTool() {
    ListShapeDefinitionsTool.call(this, "list_shapes");
}
ListShapesTool.prototype = Object.create(ListShapeDefinitionsTool.prototype);
ListShapesTool.prototype.constructor = ListShapesTool;

module.exports = {
    ListCollectionsTool: ListCollectionsTool,
    GetShapeDefinitionTool: GetShapeDefinitionTool,
    ListCollectionResourcesTool: ListCollectionResourcesTool,
    ListShapeDefinitionsTool: ListShapeDefinitionsTool,
    ListShapesTool: ListShapesTool
};

