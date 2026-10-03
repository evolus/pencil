/**
 * Canvas & DOM Helper for MCP Canvas Tools
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Provides resilient page resolution, DOM element queries, and transform parsing.
 */

function getApplicationPane() {
    if (typeof ApplicationPane !== "undefined" && ApplicationPane._instance) {
        return ApplicationPane._instance;
    }
    if (typeof window !== "undefined" && window.ApplicationPane && window.ApplicationPane._instance) {
        return window.ApplicationPane._instance;
    }
    if (typeof global !== "undefined" && global.ApplicationPane && global.ApplicationPane._instance) {
        return global.ApplicationPane._instance;
    }
    return null;
}

function getController(appPane) {
    if (appPane && appPane.controller) return appPane.controller;
    if (typeof Pencil !== "undefined" && Pencil.controller) return Pencil.controller;
    if (typeof Controller !== "undefined" && Controller._instance) return Controller._instance;
    return null;
}

function parseTransform(transformStr) {
    var pos = { x: 0, y: 0 };
    if (!transformStr || typeof transformStr !== "string") return pos;

    var matrixMatch = transformStr.match(/matrix\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+),\s*([^)]+)\)/i);
    if (matrixMatch) {
        pos.x = parseFloat(matrixMatch[1]) || 0;
        pos.y = parseFloat(matrixMatch[2]) || 0;
        return pos;
    }

    var translateMatch = transformStr.match(/translate\s*\(\s*([^,\s)]+)(?:[,\s]+([^)]+))?\)/i);
    if (translateMatch) {
        pos.x = parseFloat(translateMatch[1]) || 0;
        pos.y = translateMatch[2] ? (parseFloat(translateMatch[2]) || 0) : 0;
        return pos;
    }

    return pos;
}

function findElementById(containerNode, id) {
    if (!containerNode || !id) return null;
    if (typeof containerNode.querySelector === "function") {
        try {
            var el = containerNode.querySelector('[id="' + id + '"]');
            if (el) return el;
        } catch (e) {
            // Ignore querySelector syntax errors with unusual characters
        }
    }

    // Direct and recursive fallback search
    var childNodes = containerNode.childNodes || containerNode.children || [];
    for (var i = 0; i < childNodes.length; i++) {
        var node = childNodes[i];
        if (node.nodeType === 1) {
            if (node.getAttribute && node.getAttribute("id") === id) {
                return node;
            }
            var sub = findElementById(node, id);
            if (sub) return sub;
        }
    }
    return null;
}

function resolveTargetPageAndCanvas(appPane, pageId, pageIndex) {
    if (!appPane) {
        throw new Error("ApplicationPane is not available. Please ensure Evolus Pencil desktop application is running.");
    }
    var controller = getController(appPane);
    var doc = (controller && controller.doc) || appPane.currentDocument;

    if (!doc || !Array.isArray(doc.pages) || doc.pages.length === 0) {
        throw new Error("No active document or pages found in Pencil. Please open or create a document first.");
    }

    var targetPage = null;
    var targetIndex = -1;

    if (pageId) {
        for (var i = 0; i < doc.pages.length; i++) {
            var p = doc.pages[i];
            var pId = p.id || (p.properties && p.properties.id);
            if (pId === pageId) {
                targetPage = p;
                targetIndex = i;
                break;
            }
        }
    } else if (pageIndex !== undefined && pageIndex !== null && pageIndex >= 0 && pageIndex < doc.pages.length) {
        targetPage = doc.pages[pageIndex];
        targetIndex = pageIndex;
    } else {
        if (controller && controller.activePage) {
            targetPage = controller.activePage;
            for (var j = 0; j < doc.pages.length; j++) {
                if (doc.pages[j] === targetPage || doc.pages[j].id === targetPage.id) {
                    targetIndex = j;
                    break;
                }
            }
        }
        if (!targetPage) {
            targetPage = doc.pages[0];
            targetIndex = 0;
        }
    }

    if (!targetPage) {
        throw new Error("Page not found with ID '" + pageId + "' or index " + pageIndex + ". Call get_active_document to discover valid page IDs.");
    }

    var canvas = targetPage.canvas;
    if (!canvas && controller && typeof controller.retrievePageCanvas === "function") {
        controller.retrievePageCanvas(targetPage);
        canvas = targetPage.canvas;
    }
    if (!canvas && appPane.activeCanvas && (controller && controller.activePage === targetPage)) {
        canvas = appPane.activeCanvas;
    }
    if (!canvas && typeof appPane.activatePage === "function") {
        appPane.activatePage(targetPage);
        canvas = targetPage.canvas || appPane.activeCanvas;
    }

    if (!canvas) {
        throw new Error("Could not acquire active canvas for page '" + (targetPage.name || targetPage.id) + "'.");
    }

    var resolvedId = targetPage.id || (targetPage.properties && targetPage.properties.id) || ("page-" + (targetIndex + 1));

    return {
        page: targetPage,
        pageIndex: targetIndex,
        pageId: resolvedId,
        canvas: canvas,
        controller: controller
    };
}

module.exports = {
    getApplicationPane: getApplicationPane,
    getController: getController,
    parseTransform: parseTransform,
    findElementById: findElementById,
    resolveTargetPageAndCanvas: resolveTargetPageAndCanvas
};
