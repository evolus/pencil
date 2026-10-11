/**
 * Declarative Style Resolution & Provenance Engine
 *
 * Implements the 4-tier styling cascade for canvas shape insertion:
 *   1. Stencil Default (native engine definition)
 *   2. Type Defaults (defaults[type])
 *   3. Named Style Presets (styles[name] with acyclic extends inheritance)
 *   4. Element Properties (element.properties overrides)
 *
 * Supports on-demand synthesis and in-memory caching of scoped system shortcut
 * style definitions ("@collectionId/shortcut_id", e.g. "@Evolus.Common/Heading 1")
 * referenced directly from elements or through style inheritance ("extends").
 *
 * Guarantees acyclic inheritance graphs, type invariance across style chains,
 * property microformat conformance, and precise provenance tracking (resolvedFrom).
 */

/*
 * In-memory session cache for on-demand compiled shortcut styles.
 * Keyed by canonical scoped identifier: "@collectionId/shortcut_id".
 */
var shortcutStyleCache = {};

function clearShortcutStyleCache() {
    shortcutStyleCache = {};
}

/*
 * Parses a style identifier to determine if it targets a collection shortcut.
 * Valid syntax: "@<collectionId>/<shortcut_id>" (e.g. "@Evolus.Common/Heading 1").
 * Returns null if the identifier is not a shortcut style pattern.
 */
function parseShortcutStyleIdentifier(styleName) {
    if (typeof styleName !== "string") return null;
    var trimmed = styleName.trim();
    if (trimmed.charAt(0) !== "@") return null;
    var slashIdx = trimmed.indexOf("/");
    if (slashIdx <= 1) return null;

    var collectionId = trimmed.substring(1, slashIdx).trim();
    var shortcutId = trimmed.substring(slashIdx + 1).trim();
    if (!collectionId || !shortcutId) return null;

    return {
        canonicalName: "@" + collectionId + "/" + shortcutId,
        collectionId: collectionId,
        shortcutId: shortcutId
    };
}

/*
 * Resolves the active CollectionManager instance from helpers, runtime global, or appPane.
 */
function getCollectionManager(appPane, helpers) {
    if (helpers && helpers.collectionManager) return helpers.collectionManager;
    if (typeof CollectionManager !== "undefined") return CollectionManager;
    if (appPane && typeof appPane.getCollectionManager === "function") return appPane.getCollectionManager();
    return null;
}

/*
 * Locates an installed stencil collection by its identifier.
 */
function getCollectionById(collectionId, appPane, helpers) {
    var mgr = getCollectionManager(appPane, helpers);
    if (!mgr) return null;

    if (typeof mgr.findCollection === "function") {
        var foundCol = mgr.findCollection(collectionId);
        if (foundCol) return foundCol;
    }
    if (typeof mgr.getCollection === "function") {
        var col = mgr.getCollection(collectionId);
        if (col) return col;
    }
    if (mgr.shapeDefinition && Array.isArray(mgr.shapeDefinition.collections)) {
        var sCols = mgr.shapeDefinition.collections;
        for (var si = 0; si < sCols.length; si++) {
            if (sCols[si] && sCols[si].id === collectionId) {
                return sCols[si];
            }
        }
    }
    if (Array.isArray(mgr.collections)) {
        for (var i = 0; i < mgr.collections.length; i++) {
            if (mgr.collections[i] && mgr.collections[i].id === collectionId) {
                return mgr.collections[i];
            }
        }
    } else if (mgr.collections && typeof mgr.collections === "object") {
        if (mgr.collections[collectionId]) return mgr.collections[collectionId];
    }
    return null;
}

/*
 * Detects whether an item is a <Shortcut> preset rather than an SVG primitive.
 */
function isShortcut(shapeDef) {
    if (!shapeDef) return false;
    if (typeof Shortcut !== "undefined" && shapeDef instanceof Shortcut) return true;
    if (shapeDef.id && String(shapeDef.id).indexOf("system:ref:") === 0) return true;
    return false;
}

/*
 * Aggregates all registered shortcut objects across a collection's data structures.
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
 * Locates a shortcut within a collection by its localId, identifier, displayName, or name.
 */
function findShortcutInCollection(col, shortcutId) {
    if (!col || !shortcutId) return null;

    var all = getCollectionShortcuts(col);

    /*
     * 1. Primary lookup: Match by localId in the shortcut list (exact and case-insensitive).
     * Falls back to deriving localId from displayName if not pre-populated.
     */
    for (var i = 0; i < all.length; i++) {
        var sc = all[i];
        if (!sc) continue;
        var lid = sc.localId || (sc.displayName ? sc.displayName.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() : null);
        if (lid === shortcutId) return sc;
    }

    var lowerId = shortcutId.toLowerCase();
    for (var j = 0; j < all.length; j++) {
        var s = all[j];
        if (!s) continue;
        var sLid = s.localId || (s.displayName ? s.displayName.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() : null);
        if (sLid && sLid.toLowerCase() === lowerId) return s;
    }

    /*
     * 2. Fallbacks: Match by shortcutMap, explicit id, displayName, or name for backwards compatibility.
     */
    if (col.shortcutMap && typeof col.shortcutMap === "object") {
        if (col.shortcutMap[shortcutId]) return col.shortcutMap[shortcutId];
    }

    for (var k = 0; k < all.length; k++) {
        var item = all[k];
        if (!item) continue;
        if (item.id === shortcutId) return item;
        if (item.displayName === shortcutId) return item;
        if (item.name === shortcutId) return item;
        if (item.id && String(item.id).replace(/^system:ref:/, "") === shortcutId) return item;
    }

    for (var m = 0; m < all.length; m++) {
        var fallbackItem = all[m];
        if (!fallbackItem) continue;
        if (fallbackItem.id && String(fallbackItem.id).toLowerCase() === lowerId) return fallbackItem;
        if (fallbackItem.displayName && String(fallbackItem.displayName).toLowerCase() === lowerId) return fallbackItem;
        if (fallbackItem.name && String(fallbackItem.name).toLowerCase() === lowerId) return fallbackItem;
        if (fallbackItem.id && String(fallbackItem.id).replace(/^system:ref:/, "").toLowerCase() === lowerId) return fallbackItem;
    }

    var normalizedQuery = shortcutId.toLowerCase().replace(/[\s\-_]+/g, "");
    for (var n = 0; n < all.length; n++) {
        var sk = all[n];
        if (!sk) continue;
        var skName = String(sk.displayName || sk.name || sk.id || "").replace(/^system:ref:/, "").toLowerCase().replace(/[\s\-_]+/g, "");
        if (skName === normalizedQuery) return sk;
    }

    return null;
}

/*
 * Evaluates shortcut property expressions (<E> tags or $$themeTokens)
 * against collection theme definitions.
 */
function evalPropertyExpression(expression, collection, shapeDef, propDef) {
    if (!expression) return null;

    var evalContext = {
        functions: (typeof Pencil !== "undefined" && Pencil.functions) ? Pencil.functions : {},
        collection: collection
    };

    var normalizedExpr = String(expression).replace(/\$\$([a-zA-Z0-9_]+)/g, function (match, pName) {
        return "collection.properties." + pName + ".value";
    });

    if (typeof pEval === "function") {
        var result = pEval("" + normalizedExpr, evalContext);
        if (result != null && propDef && propDef.type && typeof propDef.type.performIntialProcessing === "function") {
            result = propDef.type.performIntialProcessing(result, shapeDef, collection);
        }
        return result;
    }

    /*
     * Direct token substitution fallback for environments where pEval is unavailable.
     */
    if (collection && collection.properties) {
        var tokenMatch = String(expression).match(/^\$\$([a-zA-Z0-9_]+)$/);
        if (tokenMatch && collection.properties[tokenMatch[1]]) {
            var propObj = collection.properties[tokenMatch[1]];
            return (propObj && propObj.value !== undefined) ? propObj.value : propObj;
        }
    }

    return expression;
}

function resolveExpression(expr, collection) {
    if (!expr) return "";
    var res = evalPropertyExpression(expr, collection);
    return (res != null) ? res.toString() : "";
}

/*
 * Resolves or compiles a system shortcut style definition on the fly.
 * Uses shortcutStyleCache to prevent redundant parsing and expression evaluations.
 * Returns { compiled: Object } on success, or { error: String } if resolution fails.
 */
function getOrBuildShortcutStyle(styleName, appPane, helpers) {
    var parsed = parseShortcutStyleIdentifier(styleName);
    if (!parsed) return null;

    var cacheKey = parsed.canonicalName;
    if (shortcutStyleCache[cacheKey]) {
        return { compiled: shortcutStyleCache[cacheKey] };
    }

    var col = getCollectionById(parsed.collectionId, appPane, helpers);
    if (!col) {
        return { error: "Collection '" + parsed.collectionId + "' not found for shortcut style '" + styleName + "'. Make sure the collection is installed." };
    }

    var sc = findShortcutInCollection(col, parsed.shortcutId);
    if (!sc) {
        return { error: "Shortcut '" + parsed.shortcutId + "' not found in collection '" + parsed.collectionId + "'." };
    }

    var targetId = sc.shape ? (sc.shape.id || sc.shape) : (sc.to || sc.target);
    if (!targetId) {
        return { error: "Shortcut '" + parsed.shortcutId + "' in collection '" + parsed.collectionId + "' does not define a target base shape." };
    }

    var fqn = (String(targetId).indexOf(":") >= 0) ? String(targetId) : (col.id + ":" + String(targetId));

    var mergedProps = {};
    var propSources = {};
    var propSource = sc.propertyMap || sc.properties || {};

    for (var pName in propSource) {
        if (!propSource.hasOwnProperty(pName)) continue;
        if (pName === "_collection" || pName.indexOf("_") === 0) continue;

        var spec = propSource[pName];
        if (spec === undefined || spec === null) continue;

        var rawVal = spec.initialValueExpression
            ? resolveExpression(spec.initialValueExpression, col)
            : (spec.initialValue != null ? spec.initialValue : (spec.value != null ? spec.value : spec));

        /*
         * Auto-normalize object box to 'w,h' string format.
         */
        if (pName === "box" && typeof rawVal === "object" && rawVal !== null) {
            var bw = rawVal.w !== undefined ? rawVal.w : rawVal.width;
            var bh = rawVal.h !== undefined ? rawVal.h : rawVal.height;
            if (bw !== undefined && bh !== undefined) {
                rawVal = bw + "," + bh;
            }
        }

        var resolvedVal = (rawVal != null) ? rawVal.toString() : "";

        mergedProps[pName] = resolvedVal;
        propSources[pName] = "system:" + cacheKey;
    }

    var compiled = {
        name: cacheKey,
        displayName: sc.displayName || parsed.shortcutId,
        collectionId: parsed.collectionId,
        type: fqn,
        chain: [cacheKey],
        properties: mergedProps,
        propSources: propSources,
        rawProperties: mergedProps,
        isSystem: true
    };

    shortcutStyleCache[cacheKey] = compiled;
    return { compiled: compiled };
}

/*
 * Detects circular inheritance in style definitions and resolves ancestor chains.
 * Traverses extends relationships using depth-first search while maintaining
 * an active recursion stack to catch cycles (e.g. A -> B -> A).
 *
 * System shortcut styles ("@collectionId/shortcut_id") are external root presets
 * and do not cause unknown parent errors or circular paths.
 *
 * Returns an array of error messages, or an empty array if the graph is strictly acyclic.
 */
function checkStyleGraphCycles(styles) {
    var errors = [];
    var visited = {};
    var inStack = {};

    function dfs(styleName, currentPath) {
        visited[styleName] = true;
        inStack[styleName] = true;
        currentPath.push(styleName);

        var def = styles[styleName];
        if (def && typeof def === "object" && typeof def.extends === "string" && def.extends.trim().length > 0) {
            var parentName = def.extends.trim();
            if (!styles[parentName]) {
                if (parseShortcutStyleIdentifier(parentName)) {
                    /*
                     * System shortcut styles are external root presets; they cannot participate in user cycles.
                     */
                } else {
                    errors.push("Style '" + styleName + "' extends unknown style '" + parentName + "'. Parent style is not defined in 'styles'.");
                }
            } else if (inStack[parentName]) {
                var cyclePath = currentPath.slice(currentPath.indexOf(parentName)).concat([parentName]);
                errors.push("Circular inheritance detected in styles: " + cyclePath.join(" -> ") + ".");
            } else if (!visited[parentName]) {
                dfs(parentName, currentPath);
            }
        }

        currentPath.pop();
        inStack[styleName] = false;
    }

    var styleNames = Object.keys(styles);
    for (var i = 0; i < styleNames.length; i++) {
        var sName = styleNames[i];
        if (!visited[sName]) {
            dfs(sName, []);
        }
    }

    return errors;
}

/*
 * Compiles and validates the style inheritance graph.
 *
 * For each valid style:
 * - Traces ancestors from root to leaf (e.g. ["@Evolus.Common/Heading 1", "icon-accent"])
 * - Enforces shape type invariance: extended styles must either inherit the parent's
 *   shape type or explicitly redeclare the exact same type; conflicting types are rejected.
 * - Flattens properties across ancestors and attributes each property to the style that defined it.
 * - Resolves extends references to scoped system shortcut styles on the fly.
 */
function resolveStyleGraph(styles, appPane, helpers) {
    var errors = [];
    var warnings = [];
    var compiledStyles = {};

    if (!styles || typeof styles !== "object" || Array.isArray(styles)) {
        return { errors: ["Invalid 'styles' parameter. Expected a dictionary object."], warnings: warnings, compiledStyles: compiledStyles };
    }

    var cycleErrors = checkStyleGraphCycles(styles);
    if (cycleErrors.length > 0) {
        return { errors: cycleErrors, warnings: warnings, compiledStyles: compiledStyles };
    }

    var styleNames = Object.keys(styles);

    function compileSingleStyle(name, seen) {
        if (compiledStyles[name]) return compiledStyles[name];
        var rawDef = styles[name];
        if (!rawDef || typeof rawDef !== "object" || Array.isArray(rawDef)) {
            errors.push("Style '" + name + "' must be an object definition.");
            return null;
        }

        var chain = [];
        var resolvedType = null;
        var parentCompiled = null;

        if (typeof rawDef.extends === "string" && rawDef.extends.trim().length > 0) {
            var parentName = rawDef.extends.trim();
            if (styles[parentName]) {
                parentCompiled = compileSingleStyle(parentName, seen);
                if (!parentCompiled) return null;
            } else if (parseShortcutStyleIdentifier(parentName)) {
                var scRes = getOrBuildShortcutStyle(parentName, appPane, helpers);
                if (scRes && scRes.error) {
                    errors.push("Style '" + name + "' extends shortcut style '" + parentName + "': " + scRes.error);
                    return null;
                }
                if (!scRes || !scRes.compiled) {
                    errors.push("Style '" + name + "' extends unknown style '" + parentName + "'.");
                    return null;
                }
                parentCompiled = scRes.compiled;
            } else {
                errors.push("Style '" + name + "' extends unknown style '" + parentName + "'. Parent style is not defined in 'styles'.");
                return null;
            }

            chain = parentCompiled.chain.slice();
            resolvedType = parentCompiled.type;
        }

        chain.push(name);

        if (rawDef.type && typeof rawDef.type === "string" && rawDef.type.trim().length > 0) {
            var declaredType = rawDef.type.trim();
            if (resolvedType && resolvedType !== declaredType) {
                errors.push("Style '" + name + "' declares type '" + declaredType + "' which conflicts with parent style '" + rawDef.extends + "' type '" + resolvedType + "'. An extended style must have the same shape type as its parent.");
                return null;
            }
            resolvedType = declaredType;
        }

        if (!resolvedType) {
            errors.push("Style '" + name + "' must declare a 'type' or inherit one via 'extends'.");
            return null;
        }

        /*
         * Merge property bags across inheritance chain:
         * Properties in the child override properties from parent styles.
         * We track provenance for each property to know which style in the chain supplied it.
         */
        var mergedProps = {};
        var propSources = {};

        if (parentCompiled) {
            for (var pk in parentCompiled.properties) {
                if (parentCompiled.properties.hasOwnProperty(pk)) {
                    mergedProps[pk] = parentCompiled.properties[pk];
                    propSources[pk] = (parentCompiled.propSources && parentCompiled.propSources[pk]) || ("style:" + parentCompiled.name);
                }
            }
        }

        if (rawDef.properties && typeof rawDef.properties === "object" && !Array.isArray(rawDef.properties)) {
            for (var rk in rawDef.properties) {
                if (rawDef.properties.hasOwnProperty(rk)) {
                    mergedProps[rk] = rawDef.properties[rk];
                    propSources[rk] = "style:" + name;
                }
            }
        }

        var compiled = {
            name: name,
            type: resolvedType,
            chain: chain,
            properties: mergedProps,
            propSources: propSources,
            rawProperties: (rawDef.properties && typeof rawDef.properties === "object") ? rawDef.properties : {}
        };

        compiledStyles[name] = compiled;
        return compiled;
    }

    for (var i = 0; i < styleNames.length; i++) {
        compileSingleStyle(styleNames[i], {});
    }

    return { errors: errors, warnings: warnings, compiledStyles: compiledStyles };
}

/*
 * Validates top-level 'defaults' and 'styles' structures and checks property microformats
 * against stencil definitions if an application runtime or collection manager is provided.
 */
function validateStylesAndDefaults(defaults, styles, appPane, helpers) {
    var errors = [];
    var warnings = [];
    var compiledStyles = {};
    var validatedDefaults = {};

    helpers = helpers || {};
    var validateFormat = helpers.validatePropertyValueFormat || function () { return null; };

    /*
     * Validate and compile styles graph if provided.
     */
    if (styles !== undefined && styles !== null) {
        var styleRes = resolveStyleGraph(styles, appPane, helpers);
        if (styleRes.errors.length > 0) {
            errors = errors.concat(styleRes.errors);
        }
        warnings = warnings.concat(styleRes.warnings);
        compiledStyles = styleRes.compiledStyles;

        /*
         * Validate property microformat values on compiled styles against target stencil definitions.
         */
        if (errors.length === 0) {
            for (var sName in compiledStyles) {
                if (!compiledStyles.hasOwnProperty(sName)) continue;
                var cs = compiledStyles[sName];
                var shapeDef = null;

                if (appPane && typeof appPane.locateShapeDefinition === "function") {
                    shapeDef = appPane.locateShapeDefinition(cs.type);
                }
                if (!shapeDef && typeof CollectionManager !== "undefined" && CollectionManager.shapeDefinition) {
                    shapeDef = CollectionManager.shapeDefinition.locateDefinition(cs.type);
                }

                if (!shapeDef && (appPane || typeof CollectionManager !== "undefined")) {
                    var candidateMsg = "";
                    if (typeof helpers.findCandidateShapeTypes === "function") {
                        var candidates = helpers.findCandidateShapeTypes(cs.type, appPane);
                        if (candidates.length > 0) candidateMsg = " Candidate suggestions: " + candidates.join(", ");
                    }
                    errors.push("Style '" + sName + "': unknown shape type '" + cs.type + "'." + candidateMsg);
                    continue;
                }

                if (shapeDef) {
                    for (var propKey in cs.properties) {
                        if (!cs.properties.hasOwnProperty(propKey)) continue;
                        var propVal = cs.properties[propKey];

                        /*
                         * Auto-normalize object box to 'w,h' string format.
                         */
                        if (propKey === "box" && typeof propVal === "object" && propVal !== null) {
                            var bw = propVal.w !== undefined ? propVal.w : propVal.width;
                            var bh = propVal.h !== undefined ? propVal.h : propVal.height;
                            if (bw !== undefined && bh !== undefined) {
                                cs.properties[propKey] = bw + "," + bh;
                                propVal = cs.properties[propKey];
                            }
                        }

                        var pdef = shapeDef.getProperty ? shapeDef.getProperty(propKey) : null;
                        if (pdef) {
                            var formatErr = validateFormat(pdef, propKey, propVal);
                            if (formatErr) {
                                errors.push("Style '" + sName + "' property '" + propKey + "': " + formatErr);
                            }
                        }
                    }
                }
            }
        }
    }

    /*
     * Validate defaults mapping if provided.
     */
    if (defaults !== undefined && defaults !== null) {
        if (typeof defaults !== "object" || Array.isArray(defaults)) {
            errors.push("Invalid 'defaults' parameter. Expected a dictionary object mapping shape types to default properties.");
        } else {
            for (var shapeType in defaults) {
                if (!defaults.hasOwnProperty(shapeType)) continue;
                var defProps = defaults[shapeType];
                if (!defProps || typeof defProps !== "object" || Array.isArray(defProps)) {
                    errors.push("Defaults for shape type '" + shapeType + "' must be a properties object.");
                    continue;
                }

                var typeShapeDef = null;
                if (appPane && typeof appPane.locateShapeDefinition === "function") {
                    typeShapeDef = appPane.locateShapeDefinition(shapeType);
                }
                if (!typeShapeDef && typeof CollectionManager !== "undefined" && CollectionManager.shapeDefinition) {
                    typeShapeDef = CollectionManager.shapeDefinition.locateDefinition(shapeType);
                }

                if (!typeShapeDef && (appPane || typeof CollectionManager !== "undefined")) {
                    var candidateTypeMsg = "";
                    if (typeof helpers.findCandidateShapeTypes === "function") {
                        var cands = helpers.findCandidateShapeTypes(shapeType, appPane);
                        if (cands.length > 0) candidateTypeMsg = " Candidate suggestions: " + cands.join(", ");
                    }
                    errors.push("Defaults: unknown shape type '" + shapeType + "'." + candidateTypeMsg);
                    continue;
                }

                var normalizedDefProps = {};
                for (var dpk in defProps) {
                    if (!defProps.hasOwnProperty(dpk)) continue;
                    var dpVal = defProps[dpk];

                    if (dpk === "box" && typeof dpVal === "object" && dpVal !== null) {
                        var dbw = dpVal.w !== undefined ? dpVal.w : dpVal.width;
                        var dbh = dpVal.h !== undefined ? dpVal.h : dpVal.height;
                        if (dbw !== undefined && dbh !== undefined) {
                            dpVal = dbw + "," + dbh;
                        }
                    }

                    normalizedDefProps[dpk] = dpVal;

                    if (typeShapeDef) {
                        var tpdef = typeShapeDef.getProperty ? typeShapeDef.getProperty(dpk) : null;
                        if (tpdef) {
                            var dpErr = validateFormat(tpdef, dpk, dpVal);
                            if (dpErr) {
                                errors.push("Defaults for '" + shapeType + "' property '" + dpk + "': " + dpErr);
                            }
                        }
                    }
                }

                validatedDefaults[shapeType] = normalizedDefProps;
            }
        }
    }

    return {
        errors: errors,
        warnings: warnings,
        compiledStyles: compiledStyles,
        validatedDefaults: validatedDefaults
    };
}

/*
 * Resolves the 4-tier styling cascade for an individual element descriptor:
 *   1. Stencil Default (omitted properties receive stencil default automatically in Pencil core)
 *   2. Type Defaults (defaults[element.type])
 *   3. Style Presets (element.style applied left-to-right, root-to-leaf per style)
 *   4. Element Properties (element.properties overrides)
 *
 * Infers element shape type from style if omitted, and verifies type compatibility
 * if both element.type and element.style are declared.
 *
 * Resolves scoped shortcut styles ("@collectionId/shortcut_id") on the fly if not yet compiled.
 *
 * Populates element._resolvedFrom with property source mapping:
 *   - "defaults"
 *   - "style:<styleName>"
 *   - "system:@collectionId/shortcut_id"
 *   - "element"
 */
function resolveElementStyles(element, compiledStyles, validatedDefaults, elementPath, appPane, helpers) {
    var errors = [];
    var prefix = elementPath ? elementPath + ": " : "";

    if (!element || typeof element !== "object") {
        return { errors: [prefix + "Element must be an object descriptor."] };
    }

    compiledStyles = compiledStyles || {};
    validatedDefaults = validatedDefaults || {};

    /*
     * Normalize element.style to an array of style names.
     */
    var styleNames = [];
    if (element.style !== undefined && element.style !== null) {
        if (typeof element.style === "string") {
            var singleStyle = element.style.trim();
            if (singleStyle.length > 0) styleNames.push(singleStyle);
        } else if (Array.isArray(element.style)) {
            for (var si = 0; si < element.style.length; si++) {
                var sItem = element.style[si];
                if (typeof sItem === "string" && sItem.trim().length > 0) {
                    styleNames.push(sItem.trim());
                } else {
                    errors.push(prefix + "Invalid style at index " + si + ". Expected non-empty string style name.");
                }
            }
        } else {
            errors.push(prefix + "Invalid 'style' property. Expected a style name string or array of style names.");
        }
    }

    /*
     * Validate style existence, compile shortcut styles on the fly, and check type consistency across multi-style array.
     */
    var inferredType = null;
    for (var sni = 0; sni < styleNames.length; sni++) {
        var sName = styleNames[sni];
        var compiled = compiledStyles[sName];

        if (!compiled && parseShortcutStyleIdentifier(sName)) {
            var scRes = getOrBuildShortcutStyle(sName, appPane, helpers);
            if (scRes && scRes.error) {
                errors.push(prefix + "References shortcut style '" + sName + "': " + scRes.error);
                continue;
            }
            if (scRes && scRes.compiled) {
                compiled = scRes.compiled;
                compiledStyles[sName] = compiled;
            }
        }

        if (!compiled) {
            errors.push(prefix + "References undefined style '" + sName + "'. Make sure it is defined in 'styles'.");
            continue;
        }

        if (inferredType === null) {
            inferredType = compiled.type;
        } else if (inferredType !== compiled.type) {
            errors.push(prefix + "Multi-style array contains mismatched shape types: style '" + styleNames[0] + "' has type '" + inferredType + "', while style '" + sName + "' has type '" + compiled.type + "'. All styles applied to an element must resolve to the identical shape type.");
        }
    }

    /*
     * Resolve final element shape type:
     * - If style is provided and element.type is omitted: adopt style's shape type.
     * - If both are provided: enforce strict equality and reject mismatches.
     */
    var declaredType = element.type || element.def;
    if (typeof declaredType === "string") declaredType = declaredType.trim();

    var finalType = declaredType;
    if (inferredType) {
        if (declaredType && declaredType !== inferredType) {
            errors.push(prefix + "Element declares type '" + declaredType + "' which conflicts with applied style '" + styleNames[0] + "' type '" + inferredType + "'. When both are declared, they must match.");
        } else {
            finalType = inferredType;
        }
    }

    if (errors.length > 0) {
        return { errors: errors };
    }

    /*
     * Execute 4-Tier Property Cascading:
     * Accumulates properties and records provenance attribution per property key.
     */
    var mergedProps = {};
    var resolvedFrom = {};

    /*
     * Tier 2: Type Defaults
     */
    if (finalType && validatedDefaults[finalType]) {
        var typeDefs = validatedDefaults[finalType];
        for (var tdk in typeDefs) {
            if (typeDefs.hasOwnProperty(tdk)) {
                mergedProps[tdk] = typeDefs[tdk];
                resolvedFrom[tdk] = "defaults";
            }
        }
    }

    /*
     * Tier 3: Applied Styles (left-to-right, root-to-leaf per style)
     */
    for (var si2 = 0; si2 < styleNames.length; si2++) {
        var currentStyle = compiledStyles[styleNames[si2]];
        if (!currentStyle) continue;

        /*
         * Iterate over ancestors in inheritance order from root to current style.
         */
        for (var ci = 0; ci < currentStyle.chain.length; ci++) {
            var chainStyleName = currentStyle.chain[ci];
            var chainStyle = compiledStyles[chainStyleName];
            if (!chainStyle && parseShortcutStyleIdentifier(chainStyleName)) {
                var chainSc = getOrBuildShortcutStyle(chainStyleName, appPane, helpers);
                if (chainSc && chainSc.compiled) chainStyle = chainSc.compiled;
            }
            if (!chainStyle) continue;

            var rawProps = chainStyle.rawProperties;
            for (var cpk in rawProps) {
                if (rawProps.hasOwnProperty(cpk)) {
                    mergedProps[cpk] = rawProps[cpk];
                    resolvedFrom[cpk] = (chainStyle.propSources && chainStyle.propSources[cpk]) || (chainStyle.isSystem ? ("system:" + chainStyleName) : ("style:" + chainStyleName));
                }
            }
        }
    }

    /*
     * Tier 4: Element's own custom properties override
     */
    if (element.properties && typeof element.properties === "object" && !Array.isArray(element.properties)) {
        for (var epk in element.properties) {
            if (element.properties.hasOwnProperty(epk)) {
                mergedProps[epk] = element.properties[epk];
                resolvedFrom[epk] = "element";
            }
        }
    }

    /*
     * Element Shape Type Resolution:
     * Only return resolvedType if the type was inferred from an applied style preset,
     * or if element.type was explicitly declared. If the element passed legacy 'def'
     * without 'type', leave resolvedType undefined so downstream editing-validator
     * inspectRecursive can detect '!child.type && child.def', perform normalization,
     * and emit the appropriate deprecation warning.
     */
    var resolvedType = inferredType || (element.type ? finalType : undefined);

    return {
        errors: errors,
        resolvedType: resolvedType,
        resolvedProperties: mergedProps,
        resolvedFrom: resolvedFrom
    };
}

/*
 * Recursively applies declarative defaults and styles across an element tree
 * (supporting nested layout @group elements and leaf shapes).
 *
 * Modifies elements in place: sets element.type (if inferred from style),
 * updates element.properties to the fully cascaded property dictionary,
 * and attaches element._resolvedFrom metadata.
 */
function applyStylesToElements(elements, defaults, styles, appPane, helpers) {
    var valRes = validateStylesAndDefaults(defaults, styles, appPane, helpers);
    if (valRes.errors.length > 0) {
        return { errors: valRes.errors, warnings: valRes.warnings, elements: elements };
    }

    var compiledStyles = valRes.compiledStyles;
    var validatedDefaults = valRes.validatedDefaults;
    var errors = [];
    var warnings = valRes.warnings.slice();

    function walkRecursive(nodeList, pathPrefix) {
        if (!Array.isArray(nodeList)) return;

        for (var idx = 0; idx < nodeList.length; idx++) {
            var item = nodeList[idx];
            if (!item || typeof item !== "object") continue;

            var currentPath = pathPrefix + "[" + idx + "]";
            if (item.id) currentPath += " ('" + item.id + "')";

            /*
             * @group containers do not take shape styles directly, but their children do.
             */
            if (item.type === "@group" || item.def === "@group") {
                if (Array.isArray(item.children)) {
                    walkRecursive(item.children, currentPath + ".children");
                }
                continue;
            }

            var res = resolveElementStyles(item, compiledStyles, validatedDefaults, currentPath, appPane, helpers);
            if (res.errors && res.errors.length > 0) {
                errors = errors.concat(res.errors);
                continue;
            }

            if (res.resolvedType) {
                item.type = res.resolvedType;
            }
            item.properties = res.resolvedProperties;
            item._resolvedFrom = res.resolvedFrom;
        }
    }

    walkRecursive(elements, "elements");

    return {
        errors: errors,
        warnings: warnings,
        elements: elements,
        compiledStyles: compiledStyles,
        validatedDefaults: validatedDefaults
    };
}

/*
 * Merges call-specific defaults and styles with the document's in-memory style registry.
 * Name collisions are resolved by overriding existing definitions with newly passed definitions.
 * Remembered styles and defaults persist across calls on the active document object (in memory only).
 * They affect only newly inserted shapes; existing canvas elements remain unchanged.
 * Returns { effectiveDefaults: Object, effectiveStyles: Object }.
 */
function mergeDocumentStyles(doc, callDefaults, callStyles) {
    var effectiveDefaults = {};
    var effectiveStyles = {};

    /*
     * Load baseline styles and defaults from active document object in memory.
     */
    if (doc && typeof doc === "object") {
        if (doc._mcpDefaults && typeof doc._mcpDefaults === "object") {
            for (var dKey in doc._mcpDefaults) {
                if (doc._mcpDefaults.hasOwnProperty(dKey)) {
                    var existingProps = doc._mcpDefaults[dKey];
                    effectiveDefaults[dKey] = (existingProps && typeof existingProps === "object" && !Array.isArray(existingProps))
                        ? Object.assign({}, existingProps)
                        : existingProps;
                }
            }
        }
        if (doc._mcpStyles && typeof doc._mcpStyles === "object") {
            for (var sKey in doc._mcpStyles) {
                if (doc._mcpStyles.hasOwnProperty(sKey)) {
                    effectiveStyles[sKey] = doc._mcpStyles[sKey];
                }
            }
        }
    }

    /*
     * Apply newly passed callDefaults, overriding any previous default definition for matching shape type.
     */
    if (callDefaults && typeof callDefaults === "object" && !Array.isArray(callDefaults)) {
        for (var cdk in callDefaults) {
            if (callDefaults.hasOwnProperty(cdk)) {
                var callProps = callDefaults[cdk];
                effectiveDefaults[cdk] = (callProps && typeof callProps === "object" && !Array.isArray(callProps))
                    ? Object.assign({}, callProps)
                    : callProps;
            }
        }
    }

    /*
     * Apply newly passed callStyles, overriding any previous style definition with matching name.
     */
    if (callStyles && typeof callStyles === "object" && !Array.isArray(callStyles)) {
        for (var csk in callStyles) {
            if (callStyles.hasOwnProperty(csk)) {
                effectiveStyles[csk] = callStyles[csk];
            }
        }
    }

    return {
        effectiveDefaults: effectiveDefaults,
        effectiveStyles: effectiveStyles
    };
}

/*
 * Commits verified in-memory styles and defaults to the document object.
 */
function commitDocumentStyles(doc, effectiveDefaults, effectiveStyles) {
    if (doc && typeof doc === "object") {
        doc._mcpDefaults = effectiveDefaults;
        doc._mcpStyles = effectiveStyles;
    }
}

module.exports = {
    checkStyleGraphCycles: checkStyleGraphCycles,
    resolveStyleGraph: resolveStyleGraph,
    validateStylesAndDefaults: validateStylesAndDefaults,
    resolveElementStyles: resolveElementStyles,
    applyStylesToElements: applyStylesToElements,
    mergeDocumentStyles: mergeDocumentStyles,
    commitDocumentStyles: commitDocumentStyles,
    parseShortcutStyleIdentifier: parseShortcutStyleIdentifier,
    getOrBuildShortcutStyle: getOrBuildShortcutStyle,
    clearShortcutStyleCache: clearShortcutStyleCache
};

