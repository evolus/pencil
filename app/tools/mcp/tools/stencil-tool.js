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
    if (shapeDef.id && String(shapeDef.id).indexOf("system:ref:") === 0) return true;
    return false;
}

/*
 * Determines if a shortcut references a given base shape definition, matching by
 * object reference, exact ID, or local un-namespaced identifier.
 */
function shortcutMatchesShape(shortcut, shapeDef, collectionId) {
    if (!shortcut || !shapeDef) return false;
    var targetId = shortcut.shape ? (shortcut.shape.id || shortcut.shape) : (shortcut.to || shortcut.target);
    if (!targetId) return false;
    if (targetId === shapeDef.id) return true;

    var sId = String(shapeDef.id);
    var tId = String(targetId);

    var localShapeId = (sId.indexOf(":") !== -1) ? sId.split(":").pop() : sId;
    var localTargetId = (tId.indexOf(":") !== -1) ? tId.split(":").pop() : tId;
    if (localShapeId === localTargetId) return true;

    if (collectionId) {
        if (tId === collectionId + ":" + sId || collectionId + ":" + tId === sId) return true;
    }

    return false;
}

/*
 * Evaluates a property initial value expression (<E> tag) using Pencil's runtime
 * expression evaluation engine (pEval) with { functions: Pencil.functions, collection: collection } context.
 */
function evalPropertyExpression(expression, collection, shapeDef, propDef) {
    if (!expression) return null;

    var evalContext = {
        functions: Pencil.functions,
        collection: collection
    };

    var normalizedExpr = String(expression).replace(/\$\$([a-zA-Z0-9_]+)/g, function (match, pName) {
        return "collection.properties." + pName + ".value";
    });

    var result = pEval("" + normalizedExpr, evalContext);

    if (result != null && propDef && propDef.type && typeof propDef.type.performIntialProcessing === "function") {
        result = propDef.type.performIntialProcessing(result, shapeDef, collection);
    }

    return result;
}

/*
 * Resolves property expressions (e.g., author tokens like $$defaultH1Font)
 * against collection-level theme properties using Pencil's expression evaluator.
 */
function resolveExpression(expr, collection) {
    if (!expr) return "";
    var res = evalPropertyExpression(expr, collection);
    return (res != null) ? res.toString() : "";
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
            } else if (spec.initialValue != null) {
                resolvedVal = spec.initialValue.toString();
            } else if (spec.value != null) {
                resolvedVal = spec.value.toString();
            } else if (spec != null) {
                resolvedVal = spec.toString();
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
    return (typeof CollectionManager !== "undefined") ? CollectionManager : null;
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
            var rawDefs = col.shapeDefs || [];
            for (var j = 0; j < rawDefs.length; j++) {
                var s = rawDefs[j];
                if (s && s.id && !isShortcut(s)) {
                    shapeIds.push(s.id);
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
// =============================================================================
// Tool: get_shape_definition
// =============================================================================





/*
 * Formats shape property definitions into a normalized dictionary, resolving
 * initial value expressions (<E>) against the target collection theme and
 * annotating each property with optional: true.
 */
function formatShapeProperties(shapeDef, collection) {
    var props = {};
    if (!shapeDef || !shapeDef.propertyMap) return props;

    var targetCol = collection || shapeDef.collection;

    for (var propName in shapeDef.propertyMap) {
        if (!shapeDef.propertyMap.hasOwnProperty(propName)) continue;
        var prop = shapeDef.propertyMap[propName];
        if (!prop) continue;

        var typeName = (prop.type && prop.type.name) ? prop.type.name : "PlainText";
        var rawValue = null;

        if (prop.initialValueExpression) {
            rawValue = evalPropertyExpression(prop.initialValueExpression, targetCol, shapeDef, prop);
        } else if (prop.initialValue != null) {
            rawValue = prop.initialValue;
        } else if (prop.defaultValue != null) {
            rawValue = prop.defaultValue;
        }

        var defaultValue = (rawValue != null) ? rawValue.toString() : "";

        props[propName] = {
            type: typeName,
            default: defaultValue,
            optional: true
        };

        if (prop.displayName) {
            props[propName].displayName = prop.displayName;
        }
    }

    return props;
}

function GetShapeDefinitionTool() {
    BaseTool.call(
        this,
        "get_shape_definition",
        "Returns the property schema, evaluated default values, metadata, and structured Specific Usage Guidelines (usageGuidelines) for a specific shape in a collection. Note: all shape properties are completely optional during shape creation (insert_shapes); Pencil automatically assigns stencil default values for any omitted properties. Only declare properties you need to customize.",
        {
            collectionId: z.string().describe("The collection ID (e.g. 'Evolus.Common')."),
            shapeId: z.string().describe("The shape ID within the collection (e.g. 'rect', 'heading', 'Button').")
        }
    );
}
GetShapeDefinitionTool.prototype = new BaseTool();

GetShapeDefinitionTool.prototype._getCollectionManager = function () {
    return (typeof CollectionManager !== "undefined") ? CollectionManager : null;
};

GetShapeDefinitionTool.prototype._formatShapeProperties = function (shapeDef, targetCol) {
    return formatShapeProperties(shapeDef, targetCol);
};

GetShapeDefinitionTool.prototype.execute = async function (args, context) {
    if (!args || !args.collectionId || !args.shapeId) {
        throw new Error("Missing required arguments: both 'collectionId' and 'shapeId' are required. To list shapes in a collection, call list_shape_definitions (list_shapes).");
    }

    var collectionId = args.collectionId.trim();
    var shapeId = args.shapeId.trim();

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

    var shapeDef = (typeof targetCol.getShapeDefById === "function")
        ? targetCol.getShapeDefById(shapeId)
        : colMgr.shapeDefinition.locateDefinition(collectionId + ":" + shapeId);

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
                    properties: formatShapeProperties(shapeDef, targetCol),
                    usageGuidelines: guidelines
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
    return (typeof CollectionManager !== "undefined") ? CollectionManager : null;
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
        "Lists and searches stencil shape definitions from installed collections, with optional collection scoping, keyword search, pagination, and optional property schema inclusion (includeProperties, default: true). All shape properties are optional during shape creation (insert_shapes); Pencil automatically assigns stencil defaults to omitted properties.",
        {
            collectionId: z.string().optional().describe("Optional collection ID (e.g. 'Evolus.Common', 'BasicWebElements'). If omitted, searches across all installed collections."),
            query: z.string().optional().describe("Optional search keyword to match shape definition ID, displayName, or description."),
            includeProperties: z.boolean().optional().default(true).describe("Whether to include formatted shape property schemas and evaluated defaults (default: true). Set to false for lightweight discovery."),
            limit: z.number().int().positive().optional().default(50).describe("Maximum number of shape definitions to return (default: 50)."),
            offset: z.number().int().nonnegative().optional().default(0).describe("0-based pagination offset (default: 0).")
        }
    );
}
ListShapeDefinitionsTool.prototype = new BaseTool();

ListShapeDefinitionsTool.prototype._getCollectionManager = function () {
    return (typeof CollectionManager !== "undefined") ? CollectionManager : null;
};

ListShapeDefinitionsTool.prototype._formatShapeProperties = function (shapeDef, targetCol) {
    return formatShapeProperties(shapeDef, targetCol);
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
    var includeProperties = (args.includeProperties !== undefined && args.includeProperties !== null) ? Boolean(args.includeProperties) : true;
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

        var rawDefs = tCol.shapeDefs || [];

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

            if (includeProperties) {
                defRecord.properties = formatShapeProperties(sDef, tCol);
            }

            if (guidelines.length > 0) {
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
                    includeProperties: includeProperties,
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

