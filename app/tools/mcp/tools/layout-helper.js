/**
 * Layout Engine & Geometric Measurement Helper
 * Computes bounding boxes and spatial coordinates for automated layout containers (@group).
 */

/*
 * Normalizes user-specified padding into a standard { top, right, bottom, left } structure.
 * Supports numeric scalar (uniform), 2-element array [y, x], 4-element array [top, right, bottom, left],
 * and object dictionaries. Any invalid or negative values default safely to 0.
 */
function normalizePadding(padding) {
    if (typeof padding === "number" && !isNaN(padding)) {
        var uniform = Math.max(0, padding);
        return { top: uniform, right: uniform, bottom: uniform, left: uniform };
    }
    if (Array.isArray(padding)) {
        if (padding.length === 1) {
            var single = Math.max(0, Number(padding[0]) || 0);
            return { top: single, right: single, bottom: single, left: single };
        } else if (padding.length === 2) {
            var padY = Math.max(0, Number(padding[0]) || 0);
            var padX = Math.max(0, Number(padding[1]) || 0);
            return { top: padY, right: padX, bottom: padY, left: padX };
        } else if (padding.length >= 4) {
            return {
                top: Math.max(0, Number(padding[0]) || 0),
                right: Math.max(0, Number(padding[1]) || 0),
                bottom: Math.max(0, Number(padding[2]) || 0),
                left: Math.max(0, Number(padding[3]) || 0)
            };
        }
    }
    if (padding && typeof padding === "object") {
        return {
            top: Math.max(0, Number(padding.top) || 0),
            right: Math.max(0, Number(padding.right) || 0),
            bottom: Math.max(0, Number(padding.bottom) || 0),
            left: Math.max(0, Number(padding.left) || 0)
        };
    }
    return { top: 0, right: 0, bottom: 0, left: 0 };
}

/*
 * Standardizes layout mode identifiers into canonical 'vertical', 'horizontal', or 'none'.
 * Maps intuitive aliases ('column' -> 'vertical', 'row' -> 'horizontal') while ignoring case.
 */
function normalizeLayoutType(layout) {
    if (!layout || typeof layout !== "string") return "none";
    var cleaned = layout.toLowerCase().trim();
    if (cleaned === "vertical" || cleaned === "column" || cleaned === "col") return "vertical";
    if (cleaned === "horizontal" || cleaned === "row") return "horizontal";
    return "none";
}

/*
 * Extracts width and height numbers from various property formats:
 * - { w, h } or { width, height } object structures
 * - 'w,h' comma-separated string literals (e.g. '120,40')
 */
function extractDimension(val) {
    if (!val) return null;
    if (typeof val === "object") {
        var w = val.w !== undefined ? Number(val.w) : (val.width !== undefined ? Number(val.width) : undefined);
        var h = val.h !== undefined ? Number(val.h) : (val.height !== undefined ? Number(val.height) : undefined);
        if (w !== undefined && h !== undefined && !isNaN(w) && !isNaN(h)) {
            return { w: w, h: h };
        }
    }
    if (typeof val === "string") {
        var parts = val.split(",");
        if (parts.length >= 2) {
            var pw = parseFloat(parts[0]);
            var ph = parseFloat(parts[1]);
            if (!isNaN(pw) && !isNaN(ph)) {
                return { w: pw, h: ph };
            }
        }
    }
    return null;
}

/*
 * Pass 1: Bottom-up recursive measurement pass.
 * Traverses element trees to resolve and attach _measuredBox ({ w, h }) to every node.
 * For layout groups, child extents are aggregated along main and cross axes including gaps and padding.
 * For leaf shapes, dimensions are extracted from explicit box properties or stencil definitions.
 */
function measureElement(node, appPane) {
    if (!node) return { w: 0, h: 0 };

    if (node.type === "@group") {
        var layoutType = normalizeLayoutType(node.layout);
        var pad = normalizePadding(node.padding);
        var gap = Math.max(0, Number(node.gap) || 0);
        var children = Array.isArray(node.children) ? node.children : [];

        var childSizes = [];
        for (var i = 0; i < children.length; i++) {
            var cSize = measureElement(children[i], appPane);
            childSizes.push(cSize);
        }

        var innerW = 0;
        var innerH = 0;

        if (layoutType === "vertical") {
            for (var vi = 0; vi < childSizes.length; vi++) {
                if (childSizes[vi].w > innerW) innerW = childSizes[vi].w;
                innerH += childSizes[vi].h;
            }
            if (childSizes.length > 1) {
                innerH += (childSizes.length - 1) * gap;
            }
        } else if (layoutType === "horizontal") {
            for (var hi = 0; hi < childSizes.length; hi++) {
                innerW += childSizes[hi].w;
                if (childSizes[hi].h > innerH) innerH = childSizes[hi].h;
            }
            if (childSizes.length > 1) {
                innerW += (childSizes.length - 1) * gap;
            }
        } else {
            /*
             * Unmanaged layout mode: bounding box is determined by child offset coordinates
             * and child dimensions to encapsulate all nested elements.
             */
            for (var ui = 0; ui < children.length; ui++) {
                var uChild = children[ui];
                var uSize = childSizes[ui];
                var ux = (Number(uChild.x) || 0) + uSize.w;
                var uy = (Number(uChild.y) || 0) + uSize.h;
                if (ux > innerW) innerW = ux;
                if (uy > innerH) innerH = uy;
            }
        }

        var totalW = pad.left + innerW + pad.right;
        var totalH = pad.top + innerH + pad.bottom;

        if (node.box && typeof node.box === "object") {
            if (node.box.w !== undefined && Number(node.box.w) > 0) totalW = Number(node.box.w);
            if (node.box.h !== undefined && Number(node.box.h) > 0) totalH = Number(node.box.h);
        }

        node._measuredBox = { w: Math.round(totalW), h: Math.round(totalH) };
        return node._measuredBox;
    } else {
        var dim = null;
        if (node.box && typeof node.box === "object") {
            var bw = node.box.w !== undefined ? Number(node.box.w) : undefined;
            var bh = node.box.h !== undefined ? Number(node.box.h) : undefined;
            if (bw !== undefined && bh !== undefined && !isNaN(bw) && !isNaN(bh)) {
                dim = { w: bw, h: bh };
            }
        }
        if (!dim && node.properties && node.properties.box) {
            dim = extractDimension(node.properties.box);
        }
        if (!dim && node._resolvedShapeDef) {
            var boxProp = null;
            if (typeof node._resolvedShapeDef.getProperty === "function") {
                boxProp = node._resolvedShapeDef.getProperty("box");
            } else if (node._resolvedShapeDef.propertyMap && node._resolvedShapeDef.propertyMap.box) {
                boxProp = node._resolvedShapeDef.propertyMap.box;
            }
            if (boxProp) {
                dim = extractDimension(boxProp.defaultValue) ||
                      extractDimension(boxProp.initialValue) ||
                      extractDimension(boxProp.value);
            }
        }
        if (!dim) {
            dim = { w: 100, h: 40 };
        }
        node._measuredBox = { w: Math.round(dim.w), h: Math.round(dim.h) };
        return node._measuredBox;
    }
}

/*
 * Pass 2: Top-down recursive layout coordinate placement pass.
 * Resolves final canvas coordinates (_layoutX, _layoutY) for all nodes within a layout container.
 * Applies main-axis sequential flow (respecting gap and padding) and cross-axis alignment
 * ('start', 'center', 'end').
 */
function resolveLayoutCoordinates(node, originX, originY) {
    if (!node) return;

    if (node.type === "@group") {
        var layoutType = normalizeLayoutType(node.layout);
        var pad = normalizePadding(node.padding);
        var gap = Math.max(0, Number(node.gap) || 0);
        var align = (node.align && typeof node.align === "string") ? node.align.toLowerCase().trim() : "start";
        var children = Array.isArray(node.children) ? node.children : [];

        var innerW = Math.max(0, (node._measuredBox ? node._measuredBox.w : 0) - pad.left - pad.right);
        var innerH = Math.max(0, (node._measuredBox ? node._measuredBox.h : 0) - pad.top - pad.bottom);

        if (layoutType === "vertical") {
            var curY = originY + pad.top;
            for (var vi = 0; vi < children.length; vi++) {
                var vChild = children[vi];
                var vSize = vChild._measuredBox || { w: 0, h: 0 };
                var childX = originX + pad.left;

                if (align === "center") {
                    childX = originX + pad.left + Math.max(0, (innerW - vSize.w) / 2);
                } else if (align === "end") {
                    childX = originX + pad.left + Math.max(0, innerW - vSize.w);
                }

                childX += (Number(vChild.x) || 0);
                var childY = curY + (Number(vChild.y) || 0);

                vChild._layoutX = Math.round(childX);
                vChild._layoutY = Math.round(childY);

                if (vChild.type === "@group") {
                    resolveLayoutCoordinates(vChild, vChild._layoutX, vChild._layoutY);
                }

                curY += vSize.h + gap;
            }
        } else if (layoutType === "horizontal") {
            var curX = originX + pad.left;
            for (var hi = 0; hi < children.length; hi++) {
                var hChild = children[hi];
                var hSize = hChild._measuredBox || { w: 0, h: 0 };
                var childY = originY + pad.top;

                if (align === "center") {
                    childY = originY + pad.top + Math.max(0, (innerH - hSize.h) / 2);
                } else if (align === "end") {
                    childY = originY + pad.top + Math.max(0, innerH - hSize.h);
                }

                var childX = curX + (Number(hChild.x) || 0);
                childY += (Number(hChild.y) || 0);

                hChild._layoutX = Math.round(childX);
                hChild._layoutY = Math.round(childY);

                if (hChild.type === "@group") {
                    resolveLayoutCoordinates(hChild, hChild._layoutX, hChild._layoutY);
                }

                curX += hSize.w + gap;
            }
        } else {
            /*
             * Unmanaged layout mode: places children at the container's top-left origin
             * (offset by container padding if defined), with child.x and child.y serving as
             * local internal offsets.
             */
            for (var ui = 0; ui < children.length; ui++) {
                var uChild = children[ui];
                var uChildX = originX + pad.left + (Number(uChild.x) || 0);
                var uChildY = originY + pad.top + (Number(uChild.y) || 0);

                uChild._layoutX = Math.round(uChildX);
                uChild._layoutY = Math.round(uChildY);

                if (uChild.type === "@group") {
                    resolveLayoutCoordinates(uChild, uChild._layoutX, uChild._layoutY);
                }
            }
        }
    }
}

module.exports = {
    normalizePadding: normalizePadding,
    normalizeLayoutType: normalizeLayoutType,
    extractDimension: extractDimension,
    measureElement: measureElement,
    resolveLayoutCoordinates: resolveLayoutCoordinates
};
