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
var iconSynonyms = require("./icon-synonyms.js");

// =============================================================================
// Helper Functions for Shortcuts & Usage Guidelines
// =============================================================================

/*
 * Detects whether an item is a <Shortcut> preset rather than an authentic SVG primitive.
 * Stencil shortcuts in Pencil wrap underlying base shapes with pre-configured properties
 * and typically have constructor Shortcut or system:ref: IDs.
 */
function isShortcut(shapeDef) {
    if (!shapeDef) return false;
    if (typeof Shortcut !== "undefined" && shapeDef instanceof Shortcut) return true;
    if (shapeDef.constructor && shapeDef.constructor.name === "Shortcut") return true;
    if (shapeDef.id && String(shapeDef.id).indexOf("system:ref:") === 0) return true;
    if (shapeDef.shape && shapeDef.id && String(shapeDef.id).indexOf("system:ref:") !== -1) return true;
    return false;
}

/*
 * Determines if a shortcut references a given base shape definition, matching by
 * object reference, exact ID, or local un-namespaced identifier.
 */
function shortcutMatchesShape(shortcut, shapeDef, collectionId) {
    if (!shortcut || !shapeDef) return false;
    var targetId = null;
    if (shortcut.shape) {
        targetId = (typeof shortcut.shape === "object") ? shortcut.shape.id : shortcut.shape;
    } else if (shortcut.to) {
        targetId = shortcut.to;
    } else if (shortcut.target) {
        targetId = shortcut.target;
    }

    if (!targetId) return false;
    if (targetId === shapeDef.id) return true;

    var sId = String(shapeDef.id);
    var tId = String(targetId);

    var localShapeId = (sId.indexOf(":") !== -1) ? sId.split(":").pop() : sId;
    var localTargetId = (tId.indexOf(":") !== -1) ? tId.split(":").pop() : tId;
    if (localShapeId && localTargetId && localShapeId === localTargetId) return true;

    if (collectionId) {
        if (tId === collectionId + ":" + sId) return true;
        if (collectionId + ":" + tId === sId) return true;
    }

    return false;
}

/*
 * Safely resolves property expressions (e.g., author tokens like $$defaultH1Font)
 * against collection-level token properties into concrete string representations.
 */
function resolveExpression(expr, collection) {
    if (!expr) return "";
    var sExpr = String(expr).trim();

    var tokenMatch = sExpr.match(/^\$\$([a-zA-Z0-9_]+)$/) || sExpr.match(/^collection\.properties\.([a-zA-Z0-9_]+)(?:\.value|\.initialValue)?$/);
    if (tokenMatch && collection && collection.properties) {
        var tokenName = tokenMatch[1];
        var prop = collection.properties[tokenName];
        if (prop !== undefined && prop !== null) {
            var val = (prop && prop.value !== undefined && prop.value !== null)
                ? prop.value
                : ((prop && prop.initialValue !== undefined && prop.initialValue !== null)
                    ? prop.initialValue
                    : prop);
            if (val !== undefined && val !== null) {
                return (typeof val.toString === "function") ? val.toString() : String(val);
            }
        }
    }

    var normalizedExpr = sExpr.replace(/\$\$([a-z][a-z0-9]*)/gi, function (match, pName) {
        return "collection.properties." + pName + ".value";
    });

    try {
        var context = {
            collection: collection,
            F: (typeof F !== "undefined") ? F : {},
            Math: Math
        };
        var fn = new Function("context", "with(context) { return (" + normalizedExpr + "); }");
        var res = fn(context);
        if (res !== undefined && res !== null) {
            return (typeof res.toString === "function") ? res.toString() : String(res);
        }
    } catch (e) {
        var subMatch = normalizedExpr.match(/collection\.properties\.([a-zA-Z0-9_]+)/);
        if (subMatch && collection && collection.properties && collection.properties[subMatch[1]]) {
            var pObj = collection.properties[subMatch[1]];
            var pVal = (pObj && pObj.value !== undefined && pObj.value !== null)
                ? pObj.value
                : ((pObj && pObj.initialValue !== undefined && pObj.initialValue !== null) ? pObj.initialValue : pObj);
            if (pVal !== undefined && pVal !== null) {
                return (typeof pVal.toString === "function") ? pVal.toString() : String(pVal);
            }
        }
    }

    return sExpr;
}

/*
 * Traverses collection shortcut structures and aggregates all registered shortcut objects.
 */
function getCollectionShortcuts(col) {
    var shortcuts = [];
    if (!col) return shortcuts;

    if (col.shortcutMap && typeof col.shortcutMap === "object") {
        for (var key in col.shortcutMap) {
            if (col.shortcutMap.hasOwnProperty(key)) {
                var sc = col.shortcutMap[key];
                if (sc && shortcuts.indexOf(sc) === -1) {
                    shortcuts.push(sc);
                }
            }
        }
    }

    if (Array.isArray(col.shapeDefs)) {
        for (var i = 0; i < col.shapeDefs.length; i++) {
            var item = col.shapeDefs[i];
            if (isShortcut(item) && shortcuts.indexOf(item) === -1) {
                shortcuts.push(item);
            }
        }
    } else if (col.shapeDefs && typeof col.shapeDefs === "object") {
        for (var sKey in col.shapeDefs) {
            if (col.shapeDefs.hasOwnProperty(sKey)) {
                var sObj = col.shapeDefs[sKey];
                if (isShortcut(sObj) && shortcuts.indexOf(sObj) === -1) {
                    shortcuts.push(sObj);
                }
            }
        }
    }

    return shortcuts;
}

/*
 * Transforms shortcuts targeting a base shape into structured usage guidelines
 * with evaluated recommended properties.
 */
function extractUsageGuidelines(shapeDef, col) {
    var guidelines = [];
    if (!shapeDef || !col) return guidelines;

    var allShortcuts = getCollectionShortcuts(col);
    for (var i = 0; i < allShortcuts.length; i++) {
        var sc = allShortcuts[i];
        if (!shortcutMatchesShape(sc, shapeDef, col.id)) continue;

        var scenario = sc.displayName || sc.name || "Default Preset";
        var description = sc.description || ("Pre-configured variant for " + scenario);
        var recommendedProperties = {};

        var propSource = sc.propertyMap || sc.properties || {};
        for (var pName in propSource) {
            if (!propSource.hasOwnProperty(pName)) continue;
            if (pName === "_collection" || pName.indexOf("_") === 0) continue;

            var spec = propSource[pName];
            if (spec === undefined || spec === null) continue;

            var resolvedVal = "";
            if (spec.initialValueExpression) {
                resolvedVal = resolveExpression(spec.initialValueExpression, col);
            } else if (spec.initialValue !== undefined && spec.initialValue !== null) {
                resolvedVal = (typeof spec.initialValue.toString === "function")
                    ? spec.initialValue.toString()
                    : String(spec.initialValue);
            } else if (spec.value !== undefined && spec.value !== null) {
                resolvedVal = (typeof spec.value.toString === "function")
                    ? spec.value.toString()
                    : String(spec.value);
            } else {
                resolvedVal = (typeof spec.toString === "function")
                    ? spec.toString()
                    : String(spec);
            }

            recommendedProperties[pName] = resolvedVal;
        }

        guidelines.push({
            scenario: scenario,
            description: description,
            recommendedProperties: recommendedProperties
        });
    }

    return guidelines;
}

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
                    if (s && s.id && !isShortcut(s)) {
                        shapeIds.push(s.id);
                    }
                }
            } else if (col.shapeDefs && typeof col.shapeDefs === "object") {
                for (var key in col.shapeDefs) {
                    if (col.shapeDefs.hasOwnProperty(key)) {
                        var def = col.shapeDefs[key];
                        if (def && isShortcut(def)) continue;
                        shapeIds.push((def && def.id) ? def.id : key);
                    }
                }
            }

            var shortcuts = getCollectionShortcuts(col);

            var colSummary = {
                id: col.id,
                displayName: col.displayName || col.id,
                description: col.description || "",
                instructions: col.instructions || "",
                shapeCount: shapeIds.length,
                scenarioCount: shortcuts.length
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

        /*
         * If the requested identifier resolves to a Shortcut preset, automatically
         * redirect to the underlying primitive shape and attach its usage guidelines.
         */
        if (isShortcut(shapeDef) && shapeDef.shape) {
            shapeDef = shapeDef.shape;
        }

        var guidelines = extractUsageGuidelines(shapeDef, targetCol);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        collectionId: collectionId,
                        shapeId: shapeDef.id || shapeId,
                        displayName: shapeDef.displayName || shapeId,
                        description: shapeDef.description || "",
                        instructions: shapeDef.instructions || "",
                        properties: this._formatShapeProperties(shapeDef),
                        usageGuidelines: guidelines
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
            if (!sDef || !sDef.id || isShortcut(sDef)) continue;
            shapesList.push({
                shapeId: sDef.id,
                displayName: sDef.displayName || sDef.id,
                description: sDef.description || "",
                instructions: sDef.instructions || "",
                properties: this._formatShapeProperties(sDef),
                usageGuidelines: extractUsageGuidelines(sDef, targetCol)
            });
        }
    } else if (targetCol.shapeDefs && typeof targetCol.shapeDefs === "object") {
        for (var sKey in targetCol.shapeDefs) {
            if (!targetCol.shapeDefs.hasOwnProperty(sKey)) continue;
            var defObj = targetCol.shapeDefs[sKey];
            if (!defObj || isShortcut(defObj)) continue;
            var sId = defObj.id || sKey;
            shapesList.push({
                shapeId: sId,
                displayName: defObj.displayName || sId,
                description: defObj.description || "",
                instructions: defObj.instructions || "",
                properties: this._formatShapeProperties(defObj),
                usageGuidelines: extractUsageGuidelines(defObj, targetCol)
            });
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    collectionId: collectionId,
                    description: targetCol.description || "",
                    instructions: targetCol.instructions || "",
                    shapes: shapesList
                }, null, 2)
            }
        ]
    };
};

// =============================================================================
// Tool: list_collection_resources
// =============================================================================

/*
 * Evaluates whether a resource name or relative path matches a search keyword.
 * Supports exact substring matching, delimiter-normalized matching (treating hyphens,
 * underscores, and dots as word boundaries), and multi-token matching so that queries
 * like "chevron right" successfully match "chevron-right.svg" or "arrows/chevron_right.png".
 */
function matchesResourceKeyword(name, relPath, keyword) {
    if (!keyword) return true;
    var lowerName = name.toLowerCase();
    var lowerRel = relPath.toLowerCase();

    if (lowerName.indexOf(keyword) !== -1 || lowerRel.indexOf(keyword) !== -1) {
        return true;
    }

    var normalizedName = lowerName.replace(/[-_.]+/g, " ");
    var normalizedRel = lowerRel.replace(/[-_.]+/g, " ");
    var normalizedKeyword = keyword.replace(/[-_.]+/g, " ").trim();

    if (normalizedName.indexOf(normalizedKeyword) !== -1 || normalizedRel.indexOf(normalizedKeyword) !== -1) {
        return true;
    }

    var tokens = normalizedKeyword.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
        for (var t = 0; t < tokens.length; t++) {
            var tok = tokens[t];
            if (normalizedName.indexOf(tok) === -1 && normalizedRel.indexOf(tok) === -1) {
                return false;
            }
        }
        return true;
    }

    return false;
}

/*
 * Evaluates match quality against candidate resource names and relative paths:
 * - Tier 2 (Exact / Token): Query directly matches the filename or relative path.
 * - Tier 1 (Universal Synonym): Query matches via cross-library synonym clusters
 *   (e.g., "search" matching "magnifying-glass", or "bin" matching "trash").
 * - Tier 0: No match.
 */
function evaluateResourceMatchTier(name, relPath, keyword, expandedSynonyms) {
    if (!keyword) return 2;

    if (matchesResourceKeyword(name, relPath, keyword)) {
        return 2;
    }

    if (expandedSynonyms && expandedSynonyms.length > 0) {
        for (var s = 0; s < expandedSynonyms.length; s++) {
            if (matchesResourceKeyword(name, relPath, expandedSynonyms[s])) {
                return 1;
            }
        }
    }

    return 0;
}

/*
 * Recursively inspects a directory on disk to discover SVG and bitmap resource assets.
 * Evaluates file extension and keyword filters, accumulating all valid candidates
 * into the results array without premature truncation so that global pagination offsets
 * and accurate total count aggregates can be computed across target collections.
 */
function scanDirectoryForResources(dirPath, relPrefix, typeFilter, keyword, expandedSynonyms, results) {
    if (!fs.existsSync(dirPath)) return;

    var entries = [];
    try {
        entries = fs.readdirSync(dirPath);
    } catch (e) {
        return;
    }

    for (var i = 0; i < entries.length; i++) {
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
            scanDirectoryForResources(fullPath, currentRel, typeFilter, keyword, expandedSynonyms, results);
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

            var baseName = path.basename(name, ext);
            var normalizedRel = currentRel.replace(/\\/g, "/");

            var matchTier = evaluateResourceMatchTier(baseName, normalizedRel, keyword, expandedSynonyms);
            if (matchTier === 0) {
                continue;
            }

            results.push({
                name: baseName,
                relativePath: normalizedRel,
                type: resType,
                _matchTier: matchTier
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
            keyword: z.string().optional().describe("Case-insensitive keyword to filter resource names or relative paths. Expands across universal icon synonyms (e.g. 'magnifier' finds 'search', 'gear' finds 'settings')."),
            limit: z.number().int().positive().optional().default(100).describe("Maximum number of resources to return (default 100)."),
            offset: z.number().int().nonnegative().optional().default(0).describe("0-based pagination offset (default: 0).")
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
    var limit = (args.limit !== undefined && args.limit !== null) ? Math.max(1, Number(args.limit)) : 100;
    var offset = (args.offset !== undefined && args.offset !== null) ? Math.max(0, Number(args.offset)) : 0;

    var expandedSynonyms = keyword ? iconSynonyms.expandKeyword(keyword) : [];

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
        var col = targetCols[c];
        if (!col || !col.installDirPath) continue;

        var colResources = [];

        if (Array.isArray(col.RESOURCE_LIST) && col.RESOURCE_LIST.length > 0) {
            for (var r = 0; r < col.RESOURCE_LIST.length; r++) {
                var resMeta = col.RESOURCE_LIST[r];
                if (!resMeta || !resMeta.prefix) continue;
                if (typeFilter !== "all" && resMeta.type && resMeta.type !== typeFilter) continue;

                var resDir = path.join(col.installDirPath, resMeta.prefix);
                scanDirectoryForResources(resDir, resMeta.prefix, typeFilter, keyword, expandedSynonyms, colResources);
            }
        } else {
            var candidates = ["Icons", "bitmaps", "vectors", "resources", "images"];
            for (var d = 0; d < candidates.length; d++) {
                var candDir = path.join(col.installDirPath, candidates[d]);
                if (fs.existsSync(candDir)) {
                    scanDirectoryForResources(candDir, candidates[d], typeFilter, keyword, expandedSynonyms, colResources);
                }
            }
        }

        for (var k = 0; k < colResources.length; k++) {
            var item = colResources[k];
            allResources.push({
                collectionId: col.id,
                collectionName: col.displayName || col.id,
                name: item.name,
                relativePath: item.relativePath,
                type: item.type,
                _matchTier: item._matchTier || 2
            });
        }
    }

    if (keyword && allResources.length > 1) {
        allResources.sort(function (a, b) {
            return (b._matchTier || 0) - (a._matchTier || 0);
        });
    }

    var totalCount = allResources.length;
    var paginatedResources = allResources.slice(offset, offset + limit).map(function (item) {
        return {
            collectionId: item.collectionId,
            collectionName: item.collectionName,
            name: item.name,
            relativePath: item.relativePath,
            type: item.type
        };
    });

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    totalCount: totalCount,
                    offset: offset,
                    limit: limit,
                    type: typeFilter,
                    collectionId: collectionId || null,
                    keyword: keyword || null,
                    resources: paginatedResources
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

        var rawDefs = [];
        if (Array.isArray(tCol.shapeDefs)) {
            rawDefs = tCol.shapeDefs;
        } else if (tCol.shapeDefs && typeof tCol.shapeDefs === "object") {
            for (var key in tCol.shapeDefs) {
                if (tCol.shapeDefs.hasOwnProperty(key)) {
                    var sObj = tCol.shapeDefs[key];
                    rawDefs.push((sObj && sObj.id) ? sObj : { id: key });
                }
            }
        }

        /*
         * Filter out Shortcut presets to maintain catalog orthogonality.
         * True SVG base shapes are retained as primary entities.
         */
        var baseShapes = [];
        for (var r = 0; r < rawDefs.length; r++) {
            if (rawDefs[r] && rawDefs[r].id && !isShortcut(rawDefs[r])) {
                baseShapes.push(rawDefs[r]);
            }
        }

        for (var k = 0; k < baseShapes.length; k++) {
            var sDef = baseShapes[k];
            var sId = sDef.id;
            var displayName = sDef.displayName || sId;
            var description = sDef.description || "";
            var shapeType = (sId.indexOf(cId + ":") === 0) ? sId : (cId + ":" + sId);
            var iconPath = sDef.icon || sDef.iconPath || "";

            /*
             * Extract complete scenario recipes with resolved recommendedProperties
             * so LLMs calling list_shapes receive actionable usage guidelines directly.
             */
            var guidelines = extractUsageGuidelines(sDef, tCol);
            var matchingScenarios = [];

            if (query) {
                var directMatch = (sId.toLowerCase().indexOf(query) !== -1) ||
                                  (displayName.toLowerCase().indexOf(query) !== -1) ||
                                  (description.toLowerCase().indexOf(query) !== -1) ||
                                  (shapeType.toLowerCase().indexOf(query) !== -1);

                for (var gIdx = 0; gIdx < guidelines.length; gIdx++) {
                    var gItem = guidelines[gIdx];
                    if (gItem.scenario.toLowerCase().indexOf(query) !== -1 ||
                        (gItem.description && gItem.description.toLowerCase().indexOf(query) !== -1)) {
                        matchingScenarios.push(gItem.scenario);
                    }
                }

                if (!directMatch && matchingScenarios.length === 0) {
                    continue;
                }
            }

            var defRecord = {
                id: sId,
                shapeType: shapeType,
                collectionId: cId,
                displayName: displayName,
                description: description,
                iconPath: iconPath
            };

            if (sDef.instructions) {
                defRecord.instructions = sDef.instructions;
            }

            if (guidelines.length > 0) {
                defRecord.scenarios = guidelines;
                defRecord.usageGuidelines = guidelines;
            }

            if (query && matchingScenarios.length > 0) {
                defRecord.matchingScenarios = matchingScenarios;
            }

            allDefs.push(defRecord);
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

