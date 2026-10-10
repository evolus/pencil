/**
 * Editing Payload Validator & Normalizer
 * Provides pre-flight schema validation, automatic structural normalization,
 * and actionable error diagnostics for canvas editing tools (insert_shapes, update_shapes).
 */

var fs = require("fs");
var path = require("path");
var styleResolver = require("./style-resolver");

var SUPPORTED_IMAGE_EXTENSIONS = [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp"];

/*
 * Computes the Levenshtein (edit) distance between two strings using dynamic programming.
 * Implemented with a single row buffer for O(len(b)) auxiliary memory allocation and
 * optimal performance across candidate arrays.
 */
function computeLevenshteinDistance(a, b) {
    if (a === b) return 0;
    if (!a || a.length === 0) return b ? b.length : 0;
    if (!b || b.length === 0) return a ? a.length : 0;

    var la = a.length;
    var lb = b.length;
    var prevRow = new Array(lb + 1);
    var currRow = new Array(lb + 1);

    for (var j = 0; j <= lb; j++) {
        prevRow[j] = j;
    }

    for (var i = 1; i <= la; i++) {
        currRow[0] = i;
        var charA = a.charCodeAt(i - 1);
        for (var k = 1; k <= lb; k++) {
            var cost = (charA === b.charCodeAt(k - 1)) ? 0 : 1;
            currRow[k] = Math.min(
                prevRow[k] + 1,       // deletion
                currRow[k - 1] + 1,   // insertion
                prevRow[k - 1] + cost // substitution
            );
        }
        for (var m = 0; m <= lb; m++) {
            prevRow[m] = currRow[m];
        }
    }

    return prevRow[lb];
}

/*
 * Finds top-N candidate filenames closest to the target filename based on string edit distance.
 * Normalizes both full filenames and base stems (omitting extensions) to prioritize relevant
 * candidates in the same directory even when minor typos or suffix differences occur.
 */
function findSimilarFilenames(targetFilename, candidateFilenames, maxResults) {
    maxResults = maxResults || 5;
    if (!targetFilename || !Array.isArray(candidateFilenames) || candidateFilenames.length === 0) {
        return [];
    }

    var targetLower = path.basename(targetFilename).toLowerCase();
    var targetExt = path.extname(targetLower);
    var targetBase = path.basename(targetLower, targetExt);

    var scored = [];
    for (var i = 0; i < candidateFilenames.length; i++) {
        var cand = candidateFilenames[i];
        if (!cand) continue;
        var candLower = cand.toLowerCase();
        var candBaseName = path.basename(candLower);
        var candExt = path.extname(candBaseName);
        var candBase = path.basename(candBaseName, candExt);

        var distFull = computeLevenshteinDistance(targetLower, candBaseName);
        var distBase = computeLevenshteinDistance(targetBase, candBase);
        var dist = Math.min(distFull, distBase);

        if (targetExt && candExt && targetExt === candExt) {
            dist -= 0.5;
        }

        if (candBase.indexOf(targetBase) !== -1 || targetBase.indexOf(candBase) !== -1) {
            dist -= 1.0;
        }

        scored.push({ name: cand, dist: dist });
    }

    scored.sort(function (x, y) {
        return x.dist - y.dist;
    });

    var results = [];
    for (var s = 0; s < Math.min(maxResults, scored.length); s++) {
        results.push(scored[s].name);
    }
    return results;
}

/*
 * Parses a potential collection resource URI from a property value.
 * Strips optional leading width/height dimensions (e.g. "24,24,collection://...").
 * Tolerates both canonical 'collection://@<col>/<path>' and bare '@<col>/<path>' syntax.
 */
function parseCollectionResourceUri(propVal) {
    if (propVal === undefined || propVal === null) return null;
    var str = String(propVal).trim();
    if (!str) return null;

    var dimMatch = str.match(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?(?:,[^,]+,[^,]+)?,(.*)$/);
    var payload = dimMatch ? dimMatch[1].trim() : str;

    var m1 = payload.match(/^collection:\/\/@([^\s\/]+)\/(.+)$/);
    if (m1) {
        return {
            isCollectionUri: true,
            hasExplicitCollection: true,
            collectionId: m1[1],
            relativePath: m1[2].replace(/\\/g, "/")
        };
    }

    var m2 = payload.match(/^@([^\s\/]+)\/(.+)$/);
    if (m2) {
        return {
            isCollectionUri: true,
            hasExplicitCollection: true,
            collectionId: m2[1],
            relativePath: m2[2].replace(/\\/g, "/")
        };
    }

    var m3 = payload.match(/^collection:\/\/(.+)$/);
    if (m3) {
        return {
            isCollectionUri: true,
            hasExplicitCollection: false,
            collectionId: null,
            relativePath: m3[1].replace(/\\/g, "/")
        };
    }

    return null;
}

function getCollectionManager() {
    if (typeof CollectionManager !== "undefined") return CollectionManager;
    if (typeof global !== "undefined" && global.CollectionManager) return global.CollectionManager;
    if (typeof window !== "undefined" && window.CollectionManager) return window.CollectionManager;
    return null;
}

/*
 * Resolves a collection instance by its ID, checking CollectionManager registry,
 * case-insensitive matches, and ApplicationPane icon mapping aliases.
 */
function findCollectionById(colMgr, collectionId) {
    if (!colMgr) return null;
    if (typeof colMgr.findCollection === "function") {
        var found = colMgr.findCollection(collectionId);
        if (found) return found;
    }

    var allCols = (colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections))
        ? colMgr.shapeDefinition.collections
        : (Array.isArray(colMgr.collections) ? colMgr.collections : []);

    for (var i = 0; i < allCols.length; i++) {
        var col = allCols[i];
        if (!col) continue;
        if (col.id === collectionId) return col;
        if (col.id && col.id.toLowerCase() === collectionId.toLowerCase()) return col;
    }

    if (typeof ApplicationPane !== "undefined" && ApplicationPane.SUPPORTED_ICON_TYPES) {
        var mappedId = ApplicationPane.SUPPORTED_ICON_TYPES[collectionId];
        if (mappedId) {
            for (var j = 0; j < allCols.length; j++) {
                if (allCols[j] && (allCols[j].id === mappedId || (allCols[j].id && allCols[j].id.toLowerCase() === mappedId.toLowerCase()))) {
                    return allCols[j];
                }
            }
        }
    }

    return null;
}

/*
 * Collects formatted '@<collectionId>' handles for all loaded collections
 * to provide helpful diagnostics when an external client references an invalid collection.
 */
function getAvailableResourceCollectionIds(colMgr) {
    if (!colMgr) return [];
    var allCols = (colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections))
        ? colMgr.shapeDefinition.collections
        : (Array.isArray(colMgr.collections) ? colMgr.collections : []);

    var ids = [];
    for (var i = 0; i < allCols.length; i++) {
        var c = allCols[i];
        if (c && c.id) {
            ids.push("@" + c.id);
        }
    }
    return ids;
}

/*
 * Validates a collection resource URI against CollectionManager and the disk filesystem.
 * Returns null if valid, or a descriptive, actionable diagnostic string if invalid.
 */
function validateCollectionResource(propVal, shapeDef) {
    var parsed = parseCollectionResourceUri(propVal);
    if (!parsed || !parsed.isCollectionUri) {
        return null;
    }

    if (parsed.relativePath.indexOf("..") !== -1) {
        return "Security error: collection resource path '" + parsed.relativePath + "' contains illegal directory traversal tokens ('..').";
    }

    var colMgr = getCollectionManager();
    var targetCol = null;

    if (parsed.hasExplicitCollection) {
        targetCol = findCollectionById(colMgr, parsed.collectionId);
        if (!targetCol) {
            var avail = getAvailableResourceCollectionIds(colMgr);
            var availMsg = avail.length > 0 ? " Available resource collections: " + avail.join(", ") : "";
            return "Collection '@" + parsed.collectionId + "' not found." + availMsg;
        }
    } else {
        if (shapeDef && shapeDef.collection) {
            targetCol = shapeDef.collection;
        } else if (shapeDef && shapeDef.id && shapeDef.id.indexOf(":") !== -1) {
            var colIdFromDef = shapeDef.id.split(":")[0];
            targetCol = findCollectionById(colMgr, colIdFromDef);
        }

        if (!targetCol) {
            return "Cannot resolve implicit collection for '" + String(propVal) + "': shape definition has no associated stencil collection. Please specify explicit collection using 'collection://@collectionId/" + parsed.relativePath + "'.";
        }
    }

    if (targetCol.installDirPath) {
        var resolvedBase = path.resolve(targetCol.installDirPath);
        var resolvedFilePath = path.resolve(targetCol.installDirPath, parsed.relativePath);

        if (!resolvedFilePath.startsWith(resolvedBase)) {
            return "Security error: collection resource path '" + parsed.relativePath + "' resolves outside collection install directory.";
        }

        if (!fs.existsSync(resolvedFilePath)) {
            var targetDir = path.dirname(resolvedFilePath);
            var targetFileName = path.basename(resolvedFilePath);
            var dirExists = fs.existsSync(targetDir);

            var candidateFiles = [];
            var searchDir = dirExists ? targetDir : resolvedBase;

            try {
                if (fs.existsSync(searchDir)) {
                    var entries = fs.readdirSync(searchDir);
                    for (var e = 0; e < entries.length; e++) {
                        var entryName = entries[e];
                        if (entryName.startsWith(".")) continue;
                        var entryFull = path.join(searchDir, entryName);
                        try {
                            var st = fs.statSync(entryFull);
                            if (st.isFile()) {
                                var ext = path.extname(entryName).toLowerCase();
                                if (SUPPORTED_IMAGE_EXTENSIONS.indexOf(ext) !== -1) {
                                    candidateFiles.push(entryName);
                                }
                            }
                        } catch (statErr) {}
                    }
                }
            } catch (readErr) {}

            if (candidateFiles.length === 0 && resolvedBase !== searchDir) {
                var fallbackDirs = ["icons", "vectors", "bitmaps", "images", "resources"];
                for (var f = 0; f < fallbackDirs.length; f++) {
                    var fDir = path.join(resolvedBase, fallbackDirs[f]);
                    if (fs.existsSync(fDir)) {
                        try {
                            var fEntries = fs.readdirSync(fDir);
                            for (var fe = 0; fe < fEntries.length; fe++) {
                                var fName = fEntries[fe];
                                if (fName.startsWith(".")) continue;
                                var fExt = path.extname(fName).toLowerCase();
                                if (SUPPORTED_IMAGE_EXTENSIONS.indexOf(fExt) !== -1) {
                                    candidateFiles.push(fallbackDirs[f] + "/" + fName);
                                }
                            }
                        } catch (fErr) {}
                        if (candidateFiles.length > 0) {
                            searchDir = fDir;
                            break;
                        }
                    }
                }
            }

            var suggestions = findSimilarFilenames(targetFileName, candidateFiles, 5);
            var relDir = path.relative(resolvedBase, targetDir).replace(/\\/g, "/");
            var colRef = "@" + (targetCol.id || targetCol.displayName || "collection");
            var dirDisplay = (relDir && relDir !== ".") ? (colRef + "/" + relDir) : colRef;

            if (suggestions.length > 0) {
                return "Resource '" + targetFileName + "' not found in collection '" + dirDisplay + "'. Similar candidates: " + suggestions.join(", ");
            } else {
                return "Resource '" + targetFileName + "' not found in collection '" + dirDisplay + "'.";
            }
        }
    }

    return null;
}

/*
 * Validates property values against engine microformat specifications.
 * Returns null if valid, or a descriptive error string if invalid.
 */
function validatePropertyValueFormat(pdef, propKey, propVal) {
    if (propVal === undefined || propVal === null) return null;

    var typeName = "";
    if (pdef.type) {
        typeName = pdef.type.name || pdef.type.id || (typeof pdef.type === "string" ? pdef.type : "");
    }

    var strVal = String(propVal);

    switch (typeName) {
        case "Dimension":
            if (typeof propVal === "object" && propVal !== null) {
                return "Object provided instead of serialized string. Use 'w,h' format (e.g. '120,40').";
            }
            if (!/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(strVal)) {
                return "Invalid Dimension format '" + strVal + "'. Expected 'w,h' numbers separated by comma (e.g. '120,40').";
            }
            break;

        case "Color":
            if (typeof propVal !== "string") {
                return "Invalid Color value type '" + typeof propVal + "'. Expected string hex (e.g. '#2563ebff').";
            }
            var isHex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(strVal);
            var isRgb = /^rgba?\([^)]+\)$/i.test(strVal);
            var isTransparent = strVal.toLowerCase() === "transparent";
            if (!isHex && !isRgb && !isTransparent) {
                return "Invalid Color format '" + strVal + "'. Expected 6 or 8-digit hex code ('#RRGGBB' or '#RRGGBBAA') or 'transparent'.";
            }
            break;

        case "Alignment":
            if (!/^[0-2],[0-2]$/.test(strVal)) {
                return "Invalid Alignment format '" + strVal + "'. Expected '[h],[v]' numeric codes (0=start, 1=center, 2=end, e.g. '0,1' or '1,1').";
            }
            break;

        case "Bool":
            if (typeof propVal !== "boolean" && strVal !== "true" && strVal !== "false") {
                return "Invalid Bool format '" + strVal + "'. Expected boolean true/false or string 'true'/'false'.";
            }
            break;

        case "Num":
            if (typeof propVal !== "number" && !/^[-+]?\d+(?:\.\d+)?$/.test(strVal)) {
                return "Invalid Num format '" + strVal + "'. Expected a numeric literal or string representation of a number.";
            }
            break;

        case "StrokeStyle":
            if (!/^\d+(?:\.\d+)?\|[0-9,.]*$/.test(strVal)) {
                return "Invalid StrokeStyle format '" + strVal + "'. Expected '[width]|[dash_pattern]' (e.g. '1|' for solid or '2|5,5' for dashed).";
            }
            break;

        case "Font":
            var parts = strVal.split("|");
            if (parts.length !== 6) {
                return "Invalid Font format '" + strVal + "'. Expected 6 pipe-delimited segments '[family]|[weight]|[style]|[size]|[decor]|[lh]' (e.g. 'FiraSans|normal|normal|14px|none|1.2').";
            }
            break;

        case "Handle":
        case "Point":
            if (!/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(strVal)) {
                return "Invalid " + typeName + " coordinate format '" + strVal + "'. Expected '[x],[y]' (e.g. '8,0').";
            }
            break;

        case "Bound":
            if (!/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,\d+(?:\.\d+)?,\d+(?:\.\d+)?$/.test(strVal)) {
                return "Invalid Bound format '" + strVal + "'. Expected '[x],[y],[w],[h]' (e.g. '0,0,100,50').";
            }
            break;
    }

    return null;
}

/*
 * Scans loaded stencil collections to find close matching shape candidates
 * when an unknown shape type is requested by an external client.
 */
function findCandidateShapeTypes(queryType, appPane) {
    var candidates = [];
    if (!queryType || typeof queryType !== "string") return candidates;

    var cleanQuery = queryType.toLowerCase().trim();
    if (cleanQuery.indexOf(":") >= 0) {
        cleanQuery = cleanQuery.substring(cleanQuery.indexOf(":") + 1);
    }

    var colMgr = (typeof CollectionManager !== "undefined") ? CollectionManager : null;
    if (colMgr && colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections)) {
        for (var c = 0; c < colMgr.shapeDefinition.collections.length; c++) {
            var col = colMgr.shapeDefinition.collections[c];
            if (!col || !col.shapeDefs) continue;
            for (var sId in col.shapeDefs) {
                if (!col.shapeDefs.hasOwnProperty(sId)) continue;
                var def = col.shapeDefs[sId];
                if (!def) continue;

                var defFullId = def.id || (col.id + ":" + sId);
                var defLocalId = def.id ? (def.id.indexOf(":") >= 0 ? def.id.substring(def.id.indexOf(":") + 1) : def.id) : sId;
                var defName = def.displayName ? def.displayName.toLowerCase() : "";

                if (defLocalId.toLowerCase() === cleanQuery || defLocalId.toLowerCase().indexOf(cleanQuery) >= 0 || defName.indexOf(cleanQuery) >= 0) {
                    if (candidates.indexOf(defFullId) === -1) {
                        candidates.push(defFullId);
                        if (candidates.length >= 5) return candidates;
                    }
                }
            }
        }
    }

    return candidates;
}

/*
 * Performs comprehensive pre-flight validation and normalization on elements passed to insert_shapes.
 * Mutates elements in-place to normalize legacy reading schemas (def -> type, top-level box, object properties.box)
 * and resolves declarative styling cascade (defaults -> styles -> element overrides) if options are provided.
 * Returns { warnings: Array<string>, errors: Array<string> }.
 */
function validateAndNormalizeInsertElements(elements, appPane, options) {
    var warnings = [];
    var errors = [];
    var seenIds = {};
    var defNormalizedCount = 0;
    var boxObjNormalizedCount = 0;
    var seenUndeclaredProps = {};

    options = options || {};

    /*
     * Declarative Styles & Defaults Pre-processing:
     * Resolves the 4-tier cascade (stencil -> defaults -> styles -> element overrides)
     * across all shapes and group children prior to coordinate and stencil schema validation.
     * If an active document object is provided in options.doc, baseline styles/defaults
     * stored in memory are merged with any call-level definitions.
     */
    var effectiveDefaults = options.defaults;
    var effectiveStyles = options.styles;

    if (options.doc) {
        var merged = styleResolver.mergeDocumentStyles(options.doc, effectiveDefaults, effectiveStyles);
        effectiveDefaults = merged.effectiveDefaults;
        effectiveStyles = merged.effectiveStyles;
    }

    if (effectiveDefaults !== undefined || effectiveStyles !== undefined) {
        var styleApplication = styleResolver.applyStylesToElements(elements, effectiveDefaults, effectiveStyles, appPane, {
            validatePropertyValueFormat: validatePropertyValueFormat,
            findCandidateShapeTypes: findCandidateShapeTypes
        });
        if (styleApplication.errors && styleApplication.errors.length > 0) {
            errors = errors.concat(styleApplication.errors);
        }
        if (styleApplication.warnings && styleApplication.warnings.length > 0) {
            warnings = warnings.concat(styleApplication.warnings);
        }
    }

    function inspectRecursive(nodeList, pathPrefix) {
        if (!Array.isArray(nodeList)) {
            errors.push(pathPrefix + ": expected an array of shape elements.");
            return;
        }

        for (var i = 0; i < nodeList.length; i++) {
            var currentPath = pathPrefix + "[" + i + "]";
            var child = nodeList[i];

            if (!child || typeof child !== "object" || Array.isArray(child)) {
                errors.push(currentPath + ": expected a shape descriptor object, got " + (child === null ? "null" : typeof child) + ".");
                continue;
            }

            var identifier = child.id ? (" ('" + child.id + "')") : "";

            /*
             * Schema Normalization: Detect when reading-schema fields are supplied.
             * get_page_content outputs 'def' (and 'type: shape'), whereas insert_shapes expects 'type'.
             * Emits an explicit notice for the initial occurrence and aggregates subsequent occurrences.
             */
            if (!child.type && child.def) {
                child.type = child.def;
                defNormalizedCount++;
                if (defNormalizedCount === 1) {
                    warnings.push(currentPath + identifier + ": detected 'def' property instead of 'type'. Auto-normalized 'type' to '" + child.def + "'. In 'insert_shapes', prefer 'type' over 'def'.");
                }
            } else if (child.type === "shape" && child.def) {
                child.type = child.def;
                defNormalizedCount++;
                if (defNormalizedCount === 1) {
                    warnings.push(currentPath + identifier + ": detected reading-schema format ('type': 'shape', 'def': '" + child.def + "'). Auto-normalized 'type' to '" + child.def + "'.");
                }
            }

            /*
             * Coordinate & Geometry Normalization:
             * Maps top-level 'box' { x, y, w, h } to coordinates and properties.box.
             * Note: Silently maps coordinates without emitting warnings because box: { x, y, w, h }
             * is an officially supported, first-class parameter schema for insert_shapes.
             */
            if (child.box && typeof child.box === "object" && !Array.isArray(child.box)) {
                if (child.x === undefined && child.box.x !== undefined) {
                    child.x = Number(child.box.x);
                }
                if (child.y === undefined && child.box.y !== undefined) {
                    child.y = Number(child.box.y);
                }
                if (child.box.w !== undefined && child.box.h !== undefined) {
                    if (!child.properties || typeof child.properties !== "object") {
                        child.properties = {};
                    }
                    if (child.properties.box === undefined) {
                        child.properties.box = Number(child.box.w) + "," + Number(child.box.h);
                    }
                }
            }

            /*
             * Property Box Normalization:
             * Auto-serialize object { w, h } or { width, height } into standard 'w,h' string format.
             * Emits an explicit notice for the initial occurrence and aggregates subsequent occurrences.
             */
            if (child.properties && typeof child.properties === "object" && !Array.isArray(child.properties)) {
                var rawBox = child.properties.box;
                if (rawBox && typeof rawBox === "object" && !Array.isArray(rawBox)) {
                    var bw = rawBox.w !== undefined ? rawBox.w : rawBox.width;
                    var bh = rawBox.h !== undefined ? rawBox.h : rawBox.height;
                    if (bw !== undefined && bh !== undefined) {
                        child.properties.box = bw + "," + bh;
                        boxObjNormalizedCount++;
                        if (boxObjNormalizedCount === 1) {
                            warnings.push(currentPath + identifier + ": auto-normalized properties.box object to string format '" + child.properties.box + "'.");
                        }
                    }
                }
            }

            /*
             * Validate coordinates: Must be finite numbers if specified.
             */
            if (child.x !== undefined) {
                var numX = Number(child.x);
                if (isNaN(numX) || !isFinite(numX)) {
                    errors.push(currentPath + identifier + ": invalid 'x' coordinate (" + JSON.stringify(child.x) + "). Expected a finite number.");
                }
            }
            if (child.y !== undefined) {
                var numY = Number(child.y);
                if (isNaN(numY) || !isFinite(numY)) {
                    errors.push(currentPath + identifier + ": invalid 'y' coordinate (" + JSON.stringify(child.y) + "). Expected a finite number.");
                }
            }

            /*
             * Check client-provided ID uniqueness within payload.
             */
            if (child.id && typeof child.id === "string") {
                var cleanId = child.id.trim();
                if (cleanId.length > 0) {
                    if (seenIds[cleanId]) {
                        errors.push(currentPath + ": duplicate shape ID '" + cleanId + "' provided in elements payload. Previous occurrence at " + seenIds[cleanId] + ".");
                    } else {
                        seenIds[cleanId] = currentPath;
                    }
                }
            }

            /*
             * Validate group layout parameters and child nesting.
             */
            if (child.type === "@group") {
                var rawLayout = "none";
                if (child.layout !== undefined) {
                    var lStr = String(child.layout).toLowerCase().trim();
                    if (lStr === "column" || lStr === "col") {
                        child.layout = "vertical";
                        rawLayout = "vertical";
                    } else if (lStr === "row") {
                        child.layout = "horizontal";
                        rawLayout = "horizontal";
                    } else if (lStr === "vertical" || lStr === "horizontal" || lStr === "none") {
                        rawLayout = lStr;
                    } else {
                        errors.push(currentPath + identifier + ": invalid layout mode '" + child.layout + "'. Expected 'vertical', 'horizontal', 'column', 'row', or 'none'.");
                    }
                }

                if (child.gap !== undefined) {
                    if (rawLayout === "none") {
                        errors.push(currentPath + identifier + ": 'gap' cannot be specified on a null/unmanaged layout group. 'gap' is only supported when 'layout' is 'vertical' or 'horizontal'.");
                    } else {
                        var gapNum = Number(child.gap);
                        if (isNaN(gapNum) || !isFinite(gapNum) || gapNum < 0) {
                            errors.push(currentPath + identifier + ": invalid 'gap' value (" + JSON.stringify(child.gap) + "). Expected a non-negative number.");
                        }
                    }
                }

                if (child.align !== undefined) {
                    if (rawLayout === "none") {
                        errors.push(currentPath + identifier + ": 'align' cannot be specified on a null/unmanaged layout group. 'align' is only supported when 'layout' is 'vertical' or 'horizontal'.");
                    } else {
                        var alignVal = String(child.align).toLowerCase().trim();
                        if (alignVal !== "start" && alignVal !== "center" && alignVal !== "end") {
                            errors.push(currentPath + identifier + ": invalid 'align' value '" + child.align + "'. Expected 'start', 'center', or 'end'.");
                        } else {
                            child.align = alignVal;
                        }
                    }
                }
                if (child.padding !== undefined) {
                    if (typeof child.padding === "number") {
                        if (isNaN(child.padding) || !isFinite(child.padding) || child.padding < 0) {
                            errors.push(currentPath + identifier + ": invalid 'padding' number. Expected a non-negative number.");
                        }
                    } else if (typeof child.padding === "object" && child.padding !== null && !Array.isArray(child.padding)) {
                        ["top", "right", "bottom", "left"].forEach(function (side) {
                            if (child.padding[side] !== undefined) {
                                var sVal = Number(child.padding[side]);
                                if (isNaN(sVal) || !isFinite(sVal) || sVal < 0) {
                                    errors.push(currentPath + identifier + ": invalid 'padding." + side + "' value. Expected a non-negative number.");
                                }
                            }
                        });
                    } else if (Array.isArray(child.padding)) {
                        for (var pIdx = 0; pIdx < child.padding.length; pIdx++) {
                            var pItem = Number(child.padding[pIdx]);
                            if (isNaN(pItem) || !isFinite(pItem) || pItem < 0) {
                                errors.push(currentPath + identifier + ": invalid 'padding[" + pIdx + "]' value. Expected a non-negative number.");
                            }
                        }
                    } else {
                        errors.push(currentPath + identifier + ": invalid 'padding' format. Expected a number, array, or { top, right, bottom, left } object.");
                    }
                }

                if (!Array.isArray(child.children) || child.children.length === 0) {
                    errors.push(currentPath + identifier + ": group element is missing or has empty 'children' array.");
                } else {
                    inspectRecursive(child.children, currentPath + ".children");
                }
            } else {
                if (!child.type || typeof child.type !== "string" || child.type.trim() === "") {
                    if (child.style) {
                        errors.push(currentPath + identifier + ": element specifies style '" + JSON.stringify(child.style) + "' but no top-level 'styles' dictionary was provided.");
                    } else {
                        errors.push(currentPath + ": missing required 'type' property (e.g. 'Evolus.Common:rect' or 'button2'). Note: if you passed 'def', verify it was populated.");
                    }
                    continue;
                }

                var shapeDef = null;
                if (appPane && typeof appPane.locateShapeDefinition === "function") {
                    shapeDef = appPane.locateShapeDefinition(child.type);
                }
                if (!shapeDef && typeof CollectionManager !== "undefined" && CollectionManager.shapeDefinition) {
                    shapeDef = CollectionManager.shapeDefinition.locateDefinition(child.type);
                }

                if (!shapeDef) {
                    var candidates = findCandidateShapeTypes(child.type, appPane);
                    var candidateMsg = candidates.length > 0 ? " Candidate suggestions: " + candidates.join(", ") : " Use 'list_collections' or 'get_shape_definition' to discover valid shape types.";
                    errors.push(currentPath + identifier + ": unknown shape type '" + child.type + "'. Stencil definition could not be located." + candidateMsg);
                    continue;
                }

                child._resolvedShapeDef = shapeDef;

                /*
                 * Validate property values against stencil definition.
                 */
                if (child.properties && typeof child.properties === "object" && !Array.isArray(child.properties)) {
                    for (var propName in child.properties) {
                        if (!child.properties.hasOwnProperty(propName)) continue;
                        var propVal = child.properties[propName];

                        var pdef = null;
                        if (shapeDef.getProperty && typeof shapeDef.getProperty === "function") {
                            pdef = shapeDef.getProperty(propName);
                        } else if (shapeDef.propertyMap && shapeDef.propertyMap[propName]) {
                            pdef = shapeDef.propertyMap[propName];
                        }

                        if (!pdef) {
                            var undeclaredKey = child.type + ":" + propName;
                            if (!seenUndeclaredProps[undeclaredKey]) {
                                seenUndeclaredProps[undeclaredKey] = 1;
                                warnings.push(currentPath + identifier + ": property '" + propName + "' is not declared in stencil schema for '" + child.type + "'.");
                            } else {
                                seenUndeclaredProps[undeclaredKey]++;
                            }
                        } else if (pdef.type) {
                            var valErr = validatePropertyValueFormat(pdef, propName, propVal);
                            if (valErr) {
                                errors.push(currentPath + identifier + ": property '" + propName + "' validation error - " + valErr);
                            }
                        }

                        /*
                         * Pre-Flight Collection Resource URI Validation:
                         * Detects collection:// or @collectionId/ resource references on ImageData
                         * properties or raw property values. Verifies collection existence in CollectionManager
                         * and physical file existence on disk, calculating string edit distance (Levenshtein)
                         * to provide actionable candidate suggestions on 404/file-miss.
                         */
                        var isImageProp = pdef && pdef.type && (
                            pdef.type.name === "ImageData" ||
                            pdef.type.id === "ImageData" ||
                            pdef.type === "ImageData" ||
                            (typeof ImageData !== "undefined" && pdef.type === ImageData)
                        );
                        var parsedUri = parseCollectionResourceUri(propVal);
                        if (parsedUri && (isImageProp || !pdef || parsedUri.hasExplicitCollection || String(propVal).trim().startsWith("collection://"))) {
                            var resErr = validateCollectionResource(propVal, shapeDef);
                            if (resErr) {
                                errors.push(currentPath + identifier + ": property '" + propName + "' resource validation error - " + resErr);
                            }
                        }
                    }
                }
            }
        }
    }

    inspectRecursive(elements, "elements");

    /*
     * Append aggregate summaries for repeated auto-normalizations.
     */
    if (defNormalizedCount > 1) {
        warnings.push("Auto-normalized 'type' from 'def' across " + (defNormalizedCount - 1) + " additional element(s).");
    }
    if (boxObjNormalizedCount > 1) {
        warnings.push("Auto-normalized properties.box object across " + (boxObjNormalizedCount - 1) + " additional element(s).");
    }
    for (var uk in seenUndeclaredProps) {
        if (seenUndeclaredProps[uk] > 1) {
            var colonIdx = uk.indexOf(":");
            var uType = uk.substring(0, colonIdx);
            var uProp = uk.substring(colonIdx + 1);
            warnings.push("Property '" + uProp + "' was undeclared on " + (seenUndeclaredProps[uk] - 1) + " additional '" + uType + "' element(s).");
        }
    }

    /*
     * Warning Flood Protection:
     * Cap total warnings output to avoid overflowing LLM response context windows.
     * Retains the first 5 highest-priority actionable notices and appends a single summary notice.
     */
    var MAX_WARNINGS = 6;
    if (warnings.length > MAX_WARNINGS) {
        var excess = warnings.length - (MAX_WARNINGS - 1);
        warnings = warnings.slice(0, MAX_WARNINGS - 1).concat([
            "... and " + excess + " more minor normalization notice(s) omitted."
        ]);
    }

    return {
        warnings: warnings,
        errors: errors
    };
}

/*
 * Validates payload structure and property types for update_shapes.
 * Returns { warnings: Array<string>, errors: Array<string> }.
 */
function validateUpdateShapes(shapeUpdates) {
    var warnings = [];
    var errors = [];

    if (!Array.isArray(shapeUpdates) || shapeUpdates.length === 0) {
        errors.push("No shape updates provided in 'shapes' parameter. Expected a non-empty array.");
        return { warnings: warnings, errors: errors };
    }

    var boxObjNormalizedCount = 0;

    for (var i = 0; i < shapeUpdates.length; i++) {
        var u = shapeUpdates[i];
        var prefix = "shapes[" + i + "]";

        if (!u || typeof u !== "object" || Array.isArray(u)) {
            errors.push(prefix + ": expected shape update descriptor object.");
            continue;
        }

        var hasShapeId = u.shapeId && typeof u.shapeId === "string" && u.shapeId.trim() !== "";
        var hasQuery = u.query && typeof u.query === "object" && !Array.isArray(u.query);
        var hasSelectedTarget = u.target === "selected";

        if (!hasShapeId && !hasQuery && !hasSelectedTarget) {
            errors.push(prefix + ": must provide targeting criteria via 'shapeId', 'query' ({ text, label, type }), or target: 'selected'.");
        }

        if (hasQuery) {
            var q = u.query;
            var hasCriteria = (q.text && typeof q.text === "string" && q.text.trim() !== "") ||
                              (q.label && typeof q.label === "string" && q.label.trim() !== "") ||
                              (q.type && typeof q.type === "string" && q.type.trim() !== "");
            if (!hasCriteria) {
                errors.push(prefix + ".query: expected at least one non-empty search criteria among 'text', 'label', or 'type'.");
            }
        }

        if (u.target && u.target !== "selected") {
            errors.push(prefix + ".target: invalid value '" + u.target + "'. Expected 'selected'.");
        }

        if (u.box) {
            if (typeof u.box !== "object" || Array.isArray(u.box)) {
                errors.push(prefix + ".box: expected an object containing geometry updates.");
            } else {
                ["x", "y", "dx", "dy", "w", "h"].forEach(function (k) {
                    if (u.box[k] !== undefined) {
                        var n = Number(u.box[k]);
                        if (isNaN(n) || !isFinite(n)) {
                            errors.push(prefix + ".box." + k + ": expected a finite number, got " + JSON.stringify(u.box[k]) + ".");
                        } else if ((k === "w" || k === "h") && n <= 0) {
                            errors.push(prefix + ".box." + k + ": dimension must be a positive number (> 0), got " + n + ".");
                        }
                    }
                });
            }
        }

        if (u.properties) {
            if (typeof u.properties !== "object" || Array.isArray(u.properties)) {
                errors.push(prefix + ".properties: expected a key-value object.");
            } else {
                if (u.properties.box && typeof u.properties.box === "object" && !Array.isArray(u.properties.box)) {
                    var bw = u.properties.box.w !== undefined ? u.properties.box.w : u.properties.box.width;
                    var bh = u.properties.box.h !== undefined ? u.properties.box.h : u.properties.box.height;
                    if (bw !== undefined && bh !== undefined) {
                        u.properties.box = bw + "," + bh;
                        boxObjNormalizedCount++;
                        if (boxObjNormalizedCount === 1) {
                            warnings.push(prefix + ": auto-normalized properties.box object to string format '" + u.properties.box + "'.");
                        }
                    }
                }

                /*
                 * Pre-Flight Collection Resource URI Validation in update_shapes:
                 * Verifies any collection asset URIs supplied in property updates.
                 */
                for (var upProp in u.properties) {
                    if (!u.properties.hasOwnProperty(upProp)) continue;
                    var upVal = u.properties[upProp];
                    var parsedUpdateUri = parseCollectionResourceUri(upVal);
                    if (parsedUpdateUri && (parsedUpdateUri.hasExplicitCollection || String(upVal).trim().startsWith("collection://"))) {
                        var updateResErr = validateCollectionResource(upVal, null);
                        if (updateResErr) {
                            errors.push(prefix + ".properties." + upProp + ": resource validation error - " + updateResErr);
                        }
                    }
                }
            }
        }

        if (u.zOrder) {
            var validZ = ["bringForward", "sendBackward", "bringToFront", "sendToBack"];
            if (validZ.indexOf(u.zOrder) === -1) {
                errors.push(prefix + ".zOrder: invalid value '" + u.zOrder + "'. Expected one of: " + validZ.join(", ") + ".");
            }
        }
    }

    /*
     * Append aggregate summary for repeated properties.box normalizations.
     */
    if (boxObjNormalizedCount > 1) {
        warnings.push("Auto-normalized properties.box object across " + (boxObjNormalizedCount - 1) + " additional update shape(s).");
    }

    /*
     * Warning Flood Protection:
     * Cap total warnings output to avoid overflowing LLM response context windows.
     * Retains the first 5 highest-priority actionable notices and appends a single summary notice.
     */
    var MAX_UPDATE_WARNINGS = 6;
    if (warnings.length > MAX_UPDATE_WARNINGS) {
        var excess = warnings.length - (MAX_UPDATE_WARNINGS - 1);
        warnings = warnings.slice(0, MAX_UPDATE_WARNINGS - 1).concat([
            "... and " + excess + " more minor normalization notice(s) omitted."
        ]);
    }

    return { warnings: warnings, errors: errors };
}

module.exports = {
    computeLevenshteinDistance: computeLevenshteinDistance,
    findSimilarFilenames: findSimilarFilenames,
    parseCollectionResourceUri: parseCollectionResourceUri,
    validateCollectionResource: validateCollectionResource,
    validatePropertyValueFormat: validatePropertyValueFormat,
    findCandidateShapeTypes: findCandidateShapeTypes,
    validateAndNormalizeInsertElements: validateAndNormalizeInsertElements,
    validateUpdateShapes: validateUpdateShapes,
    styleResolver: styleResolver
};
