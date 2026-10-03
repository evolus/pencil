/**
 * Tool: get_shape_definition
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Queries CollectionManager directly in memory to inspect shape property schemas and defaults.
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;

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

module.exports = {
    GetShapeDefinitionTool: GetShapeDefinitionTool
};
