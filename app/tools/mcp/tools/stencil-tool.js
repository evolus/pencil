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

/* =============================================================================
 * Tool: list_resource_collections & list_resource_dir
 * ============================================================================= */

var KNOWN_RESOURCE_DIR_NAMES = ["icons", "vectors", "bitmaps", "images", "resources"];
var SUPPORTED_IMAGE_EXTENSIONS = [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp"];

/*
 * Resolves all physical asset directories associated with a collection.
 * Pure icon packages and stencil collections may declare directories via RESOURCE_LIST
 * or store them as standard top-level asset directories on disk. We cross-reference
 * both sources while enforcing strict path containment to prevent directory traversal.
 */
function getCollectionResourceDirectories(col) {
    if (!col || !col.installDirPath || !fs.existsSync(col.installDirPath)) {
        return [];
    }

    var discoveredDirs = [];
    var seenPaths = {};

    function registerDirectoryIfValid(relDir) {
        var normalized = relDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        if (!normalized || seenPaths[normalized]) return;

        var fullDirPath = path.join(col.installDirPath, normalized);
        var relativeCheck = path.relative(col.installDirPath, fullDirPath);
        if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) return;

        try {
            if (fs.existsSync(fullDirPath) && fs.statSync(fullDirPath).isDirectory()) {
                seenPaths[normalized] = true;
                discoveredDirs.push(normalized);
            }
        } catch (e) {}
    }

    if (Array.isArray(col.RESOURCE_LIST)) {
        for (var r = 0; r < col.RESOURCE_LIST.length; r++) {
            var meta = col.RESOURCE_LIST[r];
            if (meta && meta.prefix) {
                registerDirectoryIfValid(meta.prefix);
            }
        }
    }

    try {
        var topEntries = fs.readdirSync(col.installDirPath);
        for (var i = 0; i < topEntries.length; i++) {
            var entry = topEntries[i];
            if (entry.startsWith(".")) continue;
            var lower = entry.toLowerCase();
            if (KNOWN_RESOURCE_DIR_NAMES.indexOf(lower) !== -1) {
                registerDirectoryIfValid(entry);
            }
        }
    } catch (e) {}

    return discoveredDirs;
}

/*
 * Gathers aggregate statistics, extension distribution, nominal canvas dimension,
 * and representative filename samples from a candidate resource directory.
 * Nominal size is derived from SVG viewBox or width/height attributes in the first 1KB
 * of sample vectors to avoid parsing heavy full-document DOM trees.
 */
function inspectResourceDirectory(fullDirPath) {
    var extCounts = {};
    var allFileNames = [];
    var sampleNames = [];
    var sampleSize = "varies";
    var totalCount = 0;

    try {
        var entries = fs.readdirSync(fullDirPath);
        for (var i = 0; i < entries.length; i++) {
            var name = entries[i];
            if (name.startsWith(".")) continue;
            var ext = path.extname(name).toLowerCase();
            if (SUPPORTED_IMAGE_EXTENSIONS.indexOf(ext) === -1) continue;

            totalCount++;
            var extKey = ext.slice(1);
            extCounts[extKey] = (extCounts[extKey] || 0) + 1;

            var baseName = path.basename(name, ext);
            allFileNames.push(baseName);
            if (sampleNames.length < 5) {
                sampleNames.push(baseName);
            }

            if (sampleSize === "varies" && ext === ".svg") {
                try {
                    var svgHead = fs.readFileSync(path.join(fullDirPath, name), "utf8").slice(0, 1024);
                    var vbMatch = svgHead.match(/viewBox=["']\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)["']/i);
                    if (vbMatch) {
                        var vbW = Math.round(Number(vbMatch[3]));
                        var vbH = Math.round(Number(vbMatch[4]));
                        if (vbW > 0 && vbH > 0) sampleSize = vbW + "x" + vbH;
                    } else {
                        var whMatch = svgHead.match(/width=["']([0-9.]+)p?x?["']\s+height=["']([0-9.]+)p?x?["']/i);
                        if (whMatch) {
                            var attrW = Math.round(Number(whMatch[1]));
                            var attrH = Math.round(Number(whMatch[2]));
                            if (attrW > 0 && attrH > 0) sampleSize = attrW + "x" + attrH;
                        }
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}

    return {
        totalCount: totalCount,
        extCounts: extCounts,
        sampleSize: sampleSize,
        sampleNames: sampleNames
    };
}

function ListResourceCollectionsTool() {
    BaseTool.call(
        this,
        "list_resource_collections",
        "Discovers all installed collections that bundle visual asset directories (e.g. 'icons', 'vectors', 'bitmaps', 'images'), returning directory-level statistics, file extension distributions, nominal dimensions, and representative sample names. Bypasses stencil UI visibility filters to discover pure icon packages (e.g. 'tablerFilledIcons', 'lucideIcons').",
        {
            collectionId: z.string().optional().describe("Optional collection ID to inspect a specific collection (e.g. 'tablerFilledIcons'). If omitted, returns all collections that expose resource directories.")
        }
    );
}
ListResourceCollectionsTool.prototype = new BaseTool();

ListResourceCollectionsTool.prototype._getCollectionManager = function () {
    return (typeof CollectionManager !== "undefined") ? CollectionManager : null;
};

ListResourceCollectionsTool.prototype.execute = async function (args, context) {
    args = args || {};
    var requestedCollectionId = args.collectionId ? args.collectionId.trim() : null;

    var colMgr = this._getCollectionManager();
    var allCols = (colMgr && colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections))
        ? colMgr.shapeDefinition.collections
        : [];

    /*
     * Bypasses isCollectionVisible filters to ensure pure icon sets and headless
     * asset packages (e.g. tablerFilledIcons, lucideIcons) remain discoverable by LLM agents.
     */
    var targetCols = [];
    if (requestedCollectionId) {
        var mappedId = (typeof ApplicationPane !== "undefined" && ApplicationPane.SUPPORTED_ICON_TYPES && ApplicationPane.SUPPORTED_ICON_TYPES[requestedCollectionId])
            ? ApplicationPane.SUPPORTED_ICON_TYPES[requestedCollectionId]
            : requestedCollectionId;

        for (var i = 0; i < allCols.length; i++) {
            if (allCols[i] && (allCols[i].id === requestedCollectionId || allCols[i].id === mappedId)) {
                targetCols.push(allCols[i]);
                break;
            }
        }

        if (targetCols.length === 0) {
            throw new Error("Collection '" + requestedCollectionId + "' not found. Call list_resource_collections to discover valid resource collections.");
        }
    } else {
        targetCols = allCols;
    }

    var resultCollections = [];

    for (var c = 0; c < targetCols.length; c++) {
        var col = targetCols[c];
        if (!col || !col.installDirPath) continue;

        var dirPaths = getCollectionResourceDirectories(col);
        var dirsSummary = [];

        for (var d = 0; d < dirPaths.length; d++) {
            var relDir = dirPaths[d];
            var fullDirPath = path.join(col.installDirPath, relDir);
            var stats = inspectResourceDirectory(fullDirPath);

            if (stats.totalCount > 0) {
                dirsSummary.push({
                    path: relDir,
                    count: stats.totalCount,
                    ext: stats.extCounts,
                    size: stats.sampleSize,
                    sample: stats.sampleNames
                });
            }
        }

        if (dirsSummary.length > 0 || requestedCollectionId) {
            resultCollections.push({
                id: col.id,
                name: col.displayName || col.id,
                description: col.description || "",
                dirs: dirsSummary
            });
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    totalCollections: resultCollections.length,
                    collections: resultCollections
                }, null, 2)
            }
        ]
    };
};

function ListResourceDirTool() {
    BaseTool.call(
        this,
        "list_resource_dir",
        "Browses files in a specific collection resource directory, returning lightweight bare filenames with shared extension lifting, prefix filtering, and pagination.",
        {
            collectionId: z.string().describe("Target collection ID (e.g. 'tablerFilledIcons', 'lucideIcons')."),
            dir: z.string().describe("Target resource directory path relative to collection root (e.g. 'icons', 'vectors')."),
            prefix: z.string().optional().describe("Optional prefix filter matching filenames starting with this string (e.g. 'circle-')."),
            offset: z.number().int().nonnegative().optional().default(0).describe("0-based pagination offset (default: 0)."),
            limit: z.number().int().positive().optional().default(100).describe("Maximum number of items to return in this slice (default: 100).")
        }
    );
}
ListResourceDirTool.prototype = new BaseTool();

ListResourceDirTool.prototype._getCollectionManager = function () {
    return (typeof CollectionManager !== "undefined") ? CollectionManager : null;
};

ListResourceDirTool.prototype.execute = async function (args, context) {
    if (!args || !args.collectionId || !args.dir) {
        throw new Error("Missing required arguments: both 'collectionId' and 'dir' are required.");
    }

    var collectionId = args.collectionId.trim();
    var dir = args.dir.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    var prefix = args.prefix ? args.prefix.trim().toLowerCase() : null;
    var limit = (args.limit !== undefined && args.limit !== null) ? Math.max(1, Number(args.limit)) : 100;
    var offset = (args.offset !== undefined && args.offset !== null) ? Math.max(0, Number(args.offset)) : 0;

    var colMgr = this._getCollectionManager();
    var allCols = (colMgr && colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections))
        ? colMgr.shapeDefinition.collections
        : [];

    var targetCol = null;
    var mappedId = (typeof ApplicationPane !== "undefined" && ApplicationPane.SUPPORTED_ICON_TYPES && ApplicationPane.SUPPORTED_ICON_TYPES[collectionId])
        ? ApplicationPane.SUPPORTED_ICON_TYPES[collectionId]
        : collectionId;

    for (var i = 0; i < allCols.length; i++) {
        if (allCols[i] && (allCols[i].id === collectionId || allCols[i].id === mappedId)) {
            targetCol = allCols[i];
            break;
        }
    }

    if (!targetCol) {
        throw new Error("Collection '" + collectionId + "' not found. Call list_resource_collections to discover valid resource collections.");
    }

    var fullDirPath = path.join(targetCol.installDirPath, dir);
    var relativeCheck = path.relative(targetCol.installDirPath, fullDirPath);
    if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) {
        throw new Error("Invalid resource directory path: Directory traversal outside collection root is rejected.");
    }

    if (!fs.existsSync(fullDirPath) || !fs.statSync(fullDirPath).isDirectory()) {
        throw new Error("Directory '" + dir + "' does not exist in collection '" + collectionId + "'.");
    }

    var entries = [];
    try {
        entries = fs.readdirSync(fullDirPath);
    } catch (e) {
        throw new Error("Failed to read directory '" + dir + "' in collection '" + collectionId + "': " + e.message);
    }

    var matchedFiles = [];
    var encounteredExts = {};

    for (var j = 0; j < entries.length; j++) {
        var entryName = entries[j];
        if (entryName.startsWith(".")) continue;

        var ext = path.extname(entryName).toLowerCase();
        if (SUPPORTED_IMAGE_EXTENSIONS.indexOf(ext) === -1) continue;

        var baseName = path.basename(entryName, ext);
        if (prefix) {
            if (baseName.toLowerCase().indexOf(prefix) !== 0 && entryName.toLowerCase().indexOf(prefix) !== 0) {
                continue;
            }
        }

        encounteredExts[ext.slice(1)] = true;
        matchedFiles.push({
            name: entryName,
            baseName: baseName,
            ext: ext.slice(1)
        });
    }

    var extList = Object.keys(encounteredExts);
    var sharedExt = (extList.length === 1) ? extList[0] : ((extList.length === 0) ? null : "mixed");

    /*
     * When all matching files share the same extension (e.g. all .svg), we lift the extension
     * to the root envelope and return plain base names to minimize token overhead.
     */
    var processedNames = matchedFiles.map(function (item) {
        return (sharedExt && sharedExt !== "mixed") ? item.baseName : item.name;
    });

    var total = processedNames.length;
    var paginated = processedNames.slice(offset, offset + limit);
    var nextOffset = (offset + limit < total) ? (offset + limit) : null;

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    collectionId: targetCol.id,
                    dir: dir,
                    ext: sharedExt,
                    total: total,
                    offset: offset,
                    limit: limit,
                    names: paginated,
                    nextOffset: nextOffset
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
    ListResourceCollectionsTool: ListResourceCollectionsTool,
    ListResourceDirTool: ListResourceDirTool,
    ListShapeDefinitionsTool: ListShapeDefinitionsTool,
    ListShapesTool: ListShapesTool
};

