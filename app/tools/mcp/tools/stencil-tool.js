/**
 * Stencil & Icon Catalog Tools Module
 * Defines and exports all stencil collection and icon discovery tools:
 * - list_collections: Lists installed and visible stencil collections
 * - get_shape_definition: Inspects shape property schemas and defaults
 * - list_icons: Queries vector icon libraries
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;

var SUPPORTED_ICON_TYPES = [
    "cmdi",
    "bootstrap",
    "fa",
    "glow",
    "herooutline",
    "herosolid",
    "lucide",
    "mingcute",
    "tablerfilled",
    "tableroutline"
];

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
// Tool: list_icons
// =============================================================================

function ListIconsTool() {
    BaseTool.call(
        this,
        "list_icons",
        "List available icons from built-in or loaded icon collections.",
        {
            iconType: z.enum(SUPPORTED_ICON_TYPES).optional().default("cmdi").describe("The icon collection identifier. Defaults to cmdi.")
        }
    );
}
ListIconsTool.prototype = new BaseTool();

ListIconsTool.prototype.execute = async function (args, context) {
    var appPane = null;
    if (typeof ApplicationPane !== "undefined" && ApplicationPane._instance) {
        appPane = ApplicationPane._instance;
    } else if (typeof window !== "undefined" && window.ApplicationPane && window.ApplicationPane._instance) {
        appPane = window.ApplicationPane._instance;
    } else if (typeof global !== "undefined" && global.ApplicationPane && global.ApplicationPane._instance) {
        appPane = global.ApplicationPane._instance;
    }

    if (!appPane) {
        throw new Error("ApplicationPane is not available. Please ensure Evolus Pencil desktop application is running.");
    }

    var iconType = args.iconType || "cmdi";
    var icons = await appPane.getIconList(iconType);

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    iconType: iconType,
                    count: Array.isArray(icons) ? icons.length : 0,
                    icons: icons || []
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    ListCollectionsTool: ListCollectionsTool,
    GetShapeDefinitionTool: GetShapeDefinitionTool,
    ListIconsTool: ListIconsTool,
    SUPPORTED_ICON_TYPES: SUPPORTED_ICON_TYPES
};
