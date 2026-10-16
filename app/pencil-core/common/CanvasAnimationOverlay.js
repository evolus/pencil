/**
 * CanvasAnimationOverlay
 *
 * Renders transient visual feedback (glowing neon pulse and expanding ripple rings)
 * around canvas shapes when inserted or modified by an external AI agent.
 *
 * Invariants:
 * - Elements are strictly rendered inside canvas.controlLayer (or dedicated overlay group),
 *   guaranteeing 0 pollution in canvas.drawingLayer, undo/redo mementos, and document exports.
 * - Hardware-accelerated CSS keyframe animations (60fps).
 * - Automatic self-cleanup after animation completion.
 * - Respects user preference 'agent.feedback.animations'.
 */

(function () {
    var SVG_NS = (typeof PencilNamespaces !== "undefined" && PencilNamespaces.svg) || "http://www.w3.org/2000/svg";

    var CanvasAnimationOverlay = {
        _installedStyles: false,

        /**
         * Injects CSS animation keyframes into the document head if not already present.
         */
        ensureStyles: function (targetDoc) {
            targetDoc = targetDoc || (typeof document !== "undefined" ? document : null);
            if (!targetDoc || targetDoc.getElementById("agent-feedback-styles")) {
                return;
            }

            var head = targetDoc.head || (targetDoc.getElementsByTagName ? targetDoc.getElementsByTagName("head")[0] : null) || targetDoc.documentElement;
            if (!head) return;

            var style = targetDoc.createElement("style");
            style.id = "agent-feedback-styles";
            var cssText = [
                "@keyframes agentGlowPulse {",
                "  0% { opacity: 0; transform: scale(0.97); stroke: #da8500; stroke-width: 4px; fill: rgba(218, 133, 0, 0.22); }",
                "  18% { opacity: 1; transform: scale(1.0); stroke: #ff9800; stroke-width: 3.5px; fill: rgba(218, 133, 0, 0.16); filter: drop-shadow(0 0 12px rgba(218, 133, 0, 0.85)); }",
                "  65% { opacity: 0.8; stroke: #da8500; stroke-width: 2.5px; fill: rgba(218, 133, 0, 0.06); filter: drop-shadow(0 0 6px rgba(218, 133, 0, 0.5)); }",
                "  100% { opacity: 0; transform: scale(1.0); stroke-width: 1px; fill: transparent; }",
                "}",
                "@keyframes agentGlowPulseUpdate {",
                "  0% { opacity: 0; transform: scale(0.98); stroke: #ffa726; stroke-width: 4px; fill: rgba(255, 167, 38, 0.22); }",
                "  18% { opacity: 1; transform: scale(1.0); stroke: #da8500; stroke-width: 3.5px; fill: rgba(218, 133, 0, 0.16); filter: drop-shadow(0 0 12px rgba(218, 133, 0, 0.85)); }",
                "  65% { opacity: 0.8; stroke: #e65100; stroke-width: 2.5px; fill: rgba(230, 81, 0, 0.06); }",
                "  100% { opacity: 0; transform: scale(1.0); stroke-width: 1px; fill: transparent; }",
                "}",
                "@keyframes agentRippleExpand {",
                "  0% { opacity: 0.9; stroke: #da8500; stroke-width: 3px; transform: scale(1.0); }",
                "  100% { opacity: 0; stroke: #ffb74d; stroke-width: 1px; transform: scale(1.12); }",
                "}",
                ".agent-glow-rect {",
                "  fill: rgba(218, 133, 0, 0.12);",
                "  stroke: #da8500;",
                "  stroke-width: 3.5px;",
                "  pointer-events: none;",
                "  transform-box: fill-box;",
                "  transform-origin: center;",
                "  animation: agentGlowPulse 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;",
                "}",
                ".agent-glow-rect.update-mode {",
                "  animation: agentGlowPulseUpdate 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;",
                "}",
                ".agent-ripple-rect {",
                "  fill: none;",
                "  stroke: #da8500;",
                "  stroke-width: 2.5px;",
                "  pointer-events: none;",
                "  transform-box: fill-box;",
                "  transform-origin: center;",
                "  animation: agentRippleExpand 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;",
                "}"
            ].join("\n");

            try {
                style.textContent = cssText;
            } catch (e) {}
            if (!style.textContent) {
                style.appendChild(targetDoc.createTextNode(cssText));
            }
            head.appendChild(style);
            this._installedStyles = true;
        },

        /**
         * Resolves the active Pencil canvas for a given pageId or active application pane.
         */
        resolveCanvas: function (pageId) {
            var appPane = (typeof ApplicationPane !== "undefined" && ApplicationPane._instance) ||
                          (typeof window !== "undefined" && window.ApplicationPane && window.ApplicationPane._instance) || null;
            if (!appPane) return null;

            if (appPane.activeCanvas) {
                return appPane.activeCanvas;
            }

            if (appPane.currentDocument && pageId) {
                var pages = appPane.currentDocument.pages || [];
                for (var i = 0; i < pages.length; i++) {
                    var p = pages[i];
                    if (p.id === pageId && p.canvas) {
                        return p.canvas;
                    }
                }
            }

            return null;
        },

        /**
         * Checks whether animations are enabled via Pencil Config service.
         */
        isAnimationEnabled: function () {
            if (typeof Config !== "undefined" && typeof Config.get === "function") {
                var val = Config.get("agent.feedback.animations");
                if (val !== null && val !== undefined) {
                    return Boolean(val);
                }
            }
            return true;
        },

        /**
         * Main event entry point for shapes_inserted and shapes_updated.
         */
        handleShapesEvent: function (mode, payload) {
            if (!this.isAnimationEnabled()) return;
            if (!payload || !Array.isArray(payload.shapes) || payload.shapes.length === 0) return;

            var canvas = this.resolveCanvas(payload.pageId);
            if (!canvas || !canvas.controlLayer) return;

            this.animateShapesOnCanvas(canvas, payload.shapes, mode);
        },

        /**
         * Renders transient highlight groups inside canvas.controlLayer.
         */
        animateShapesOnCanvas: function (canvas, shapes, mode) {
            var doc = canvas.ownerDocument || (typeof document !== "undefined" ? document : null);
            if (!doc) return;

            this.ensureStyles(doc);

            // Acquire or create dedicated non-persisted container in controlLayer
            var container = canvas.controlLayer.querySelector("#agentOverlayContainer");
            if (!container) {
                container = doc.createElementNS(SVG_NS, "svg:g");
                container.setAttribute("id", "agentOverlayContainer");
                container.setAttribute("pointer-events", "none");
                canvas.controlLayer.appendChild(container);
            }

            var isUpdate = (mode === "update");
            var pad = 4;
            var maxStagger = 300; // max total stagger delay in ms

            for (var i = 0; i < shapes.length; i++) {
                var shapeItem = shapes[i];
                var box = this.resolveShapeBox(canvas, shapeItem);
                if (!box) continue;

                var highlightGroup = doc.createElementNS(SVG_NS, "svg:g");
                highlightGroup.setAttribute("class", "agent-shape-highlight");
                highlightGroup.setAttribute("pointer-events", "none");

                var rectX = Math.round(box.x - pad);
                var rectY = Math.round(box.y - pad);
                var rectW = Math.max(12, Math.round(box.w + (pad * 2)));
                var rectH = Math.max(12, Math.round(box.h + (pad * 2)));

                var staggerDelay = shapes.length > 1 ? Math.min(i * 50, maxStagger) : 0;

                // 1. Glow rect
                var glowRect = doc.createElementNS(SVG_NS, "svg:rect");
                glowRect.setAttribute("x", rectX);
                glowRect.setAttribute("y", rectY);
                glowRect.setAttribute("width", rectW);
                glowRect.setAttribute("height", rectH);
                glowRect.setAttribute("rx", "6");
                glowRect.setAttribute("ry", "6");
                glowRect.setAttribute("class", isUpdate ? "agent-glow-rect update-mode" : "agent-glow-rect");
                if (staggerDelay > 0) {
                    glowRect.style.animationDelay = staggerDelay + "ms";
                }
                highlightGroup.appendChild(glowRect);

                // 2. Ripple rect
                var rippleRect = doc.createElementNS(SVG_NS, "svg:rect");
                rippleRect.setAttribute("x", rectX);
                rippleRect.setAttribute("y", rectY);
                rippleRect.setAttribute("width", rectW);
                rippleRect.setAttribute("height", rectH);
                rippleRect.setAttribute("rx", "6");
                rippleRect.setAttribute("ry", "6");
                rippleRect.setAttribute("class", "agent-ripple-rect");
                if (staggerDelay > 0) {
                    rippleRect.style.animationDelay = staggerDelay + "ms";
                }
                highlightGroup.appendChild(rippleRect);

                container.appendChild(highlightGroup);

                // Self-cleanup after animation completes
                (function (node, delay) {
                    setTimeout(function () {
                        if (node && node.parentNode) {
                            node.parentNode.removeChild(node);
                        }
                    }, delay + 2000);
                })(highlightGroup, staggerDelay);
            }
        },

        /**
         * Resolves the bounding box of a shape item from live canvas controller or geometry box.
         */
        resolveShapeBox: function (canvas, shapeItem) {
            if (!shapeItem) return null;

            // 1. Try querying live shape controller in drawingLayer
            var shapeId = shapeItem.id || (typeof shapeItem === "string" ? shapeItem : null);
            if (shapeId && canvas.drawingLayer) {
                var svgNode = canvas.drawingLayer.querySelector ? canvas.drawingLayer.querySelector('[id="' + shapeId + '"]') : null;
                if (svgNode && typeof canvas.createControllerFor === "function") {
                    try {
                        var controller = canvas.createControllerFor(svgNode);
                        if (controller && typeof controller.getBoundingRect === "function") {
                            var bbox = controller.getBoundingRect();
                            if (bbox && bbox.width > 0 && bbox.height > 0) {
                                return {
                                    x: bbox.x,
                                    y: bbox.y,
                                    w: bbox.width,
                                    h: bbox.height
                                };
                            }
                        }
                    } catch (e) {}
                }
            }

            // 2. Fall back to shapeItem.box if provided
            if (shapeItem.box && shapeItem.box.x !== undefined && shapeItem.box.y !== undefined) {
                var bw = Number(shapeItem.box.w) || 100;
                var bh = Number(shapeItem.box.h) || 60;
                return {
                    x: Number(shapeItem.box.x),
                    y: Number(shapeItem.box.y),
                    w: bw,
                    h: bh
                };
            }

            return null;
        },

        /**
         * Wires listeners to the AgentFeedbackManager singleton.
         */
        initialize: function () {
            var feedback = (typeof window !== "undefined" && window.AgentFeedback) ||
                           (typeof global !== "undefined" && global.AgentFeedback) || null;

            if (!feedback) return;

            var self = this;
            feedback.on("shapes_inserted", function (payload) {
                self.handleShapesEvent("insert", payload);
            });

            feedback.on("shapes_updated", function (payload) {
                self.handleShapesEvent("update", payload);
            });
        }
    };

    // Auto-initialize if AgentFeedback is already loaded
    CanvasAnimationOverlay.initialize();

    if (typeof window !== "undefined") {
        window.CanvasAnimationOverlay = CanvasAnimationOverlay;
    }
    if (typeof global !== "undefined") {
        global.CanvasAnimationOverlay = CanvasAnimationOverlay;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = CanvasAnimationOverlay;
    }
})();
