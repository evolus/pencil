/**
 * Tool: list_collections
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Queries CollectionManager directly in memory to list installed stencil collections.
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;

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

module.exports = {
    ListCollectionsTool: ListCollectionsTool
};
