/**
 * Editing Payload Validator & Normalizer
 * Provides pre-flight schema validation, automatic structural normalization,
 * and actionable error diagnostics for canvas editing tools (insert_shapes, update_shapes).
 */

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
 * Mutates elements in-place to normalize legacy reading schemas (def -> type, top-level box, object properties.box).
 * Returns { warnings: Array<string>, errors: Array<string> }.
 */
function validateAndNormalizeInsertElements(elements, appPane) {
    var warnings = [];
    var errors = [];
    var seenIds = {};

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
             */
            if (!child.type && child.def) {
                child.type = child.def;
                warnings.push(currentPath + identifier + ": detected 'def' property instead of 'type'. Auto-normalized 'type' to '" + child.def + "'. In 'insert_shapes', prefer 'type' over 'def'.");
            } else if (child.type === "shape" && child.def) {
                child.type = child.def;
                warnings.push(currentPath + identifier + ": detected reading-schema format ('type': 'shape', 'def': '" + child.def + "'). Auto-normalized 'type' to '" + child.def + "'.");
            }

            /*
             * Coordinate & Geometry Normalization:
             * get_page_content supplies top-level 'box' { x, y, w, h } instead of separate coordinates.
             */
            if (child.box && typeof child.box === "object" && !Array.isArray(child.box)) {
                if (child.x === undefined && child.box.x !== undefined) {
                    child.x = Number(child.box.x);
                    warnings.push(currentPath + identifier + ": mapped 'box.x' (" + child.box.x + ") to top-level coordinate 'x'.");
                }
                if (child.y === undefined && child.box.y !== undefined) {
                    child.y = Number(child.box.y);
                    warnings.push(currentPath + identifier + ": mapped 'box.y' (" + child.box.y + ") to top-level coordinate 'y'.");
                }
                if (child.box.w !== undefined && child.box.h !== undefined) {
                    if (!child.properties || typeof child.properties !== "object") {
                        child.properties = {};
                    }
                    if (child.properties.box === undefined) {
                        child.properties.box = Number(child.box.w) + "," + Number(child.box.h);
                        warnings.push(currentPath + identifier + ": auto-normalized top-level 'box' { w: " + child.box.w + ", h: " + child.box.h + " } to 'properties.box'.");
                    }
                }
            }

            /*
             * Property Box Normalization:
             * Auto-serialize object { w, h } or { width, height } into standard 'w,h' string format.
             */
            if (child.properties && typeof child.properties === "object" && !Array.isArray(child.properties)) {
                var rawBox = child.properties.box;
                if (rawBox && typeof rawBox === "object" && !Array.isArray(rawBox)) {
                    var bw = rawBox.w !== undefined ? rawBox.w : rawBox.width;
                    var bh = rawBox.h !== undefined ? rawBox.h : rawBox.height;
                    if (bw !== undefined && bh !== undefined) {
                        child.properties.box = bw + "," + bh;
                        warnings.push(currentPath + identifier + ": auto-normalized properties.box object to string format '" + child.properties.box + "'.");
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
             * Validate group nesting or locate shape definition in registry.
             */
            if (child.type === "@group") {
                if (!Array.isArray(child.children) || child.children.length === 0) {
                    errors.push(currentPath + identifier + ": group element is missing or has empty 'children' array.");
                } else {
                    inspectRecursive(child.children, currentPath + ".children");
                }
            } else {
                if (!child.type || typeof child.type !== "string" || child.type.trim() === "") {
                    errors.push(currentPath + ": missing required 'type' property (e.g. 'Evolus.Common:rect' or 'button2'). Note: if you passed 'def', verify it was populated.");
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
                            warnings.push(currentPath + identifier + ": property '" + propName + "' is not declared in stencil schema for '" + child.type + "'.");
                        } else if (pdef.type) {
                            var valErr = validatePropertyValueFormat(pdef, propName, propVal);
                            if (valErr) {
                                errors.push(currentPath + identifier + ": property '" + propName + "' validation error - " + valErr);
                            }
                        }
                    }
                }
            }
        }
    }

    inspectRecursive(elements, "elements");

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
                        warnings.push(prefix + ": auto-normalized properties.box object to string format '" + u.properties.box + "'.");
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

    return { warnings: warnings, errors: errors };
}

module.exports = {
    validatePropertyValueFormat: validatePropertyValueFormat,
    findCandidateShapeTypes: findCandidateShapeTypes,
    validateAndNormalizeInsertElements: validateAndNormalizeInsertElements,
    validateUpdateShapes: validateUpdateShapes
};
