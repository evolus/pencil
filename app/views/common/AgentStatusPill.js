/**
 * AgentStatusPill
 *
 * Modern floating glassmorphism status indicator pinned to the bottom-right
 * corner of the Pencil canvas viewport. Visualizes live agent activity, tool progress,
 * and thinking states with smooth auto-fading transitions.
 */

(function () {
    var AgentStatusPill = {
        _hostNode: null,
        _pillNode: null,
        _dotNode: null,
        _msgNode: null,
        _hideTimer: null,
        _pendingDoneTimer: null,
        _actionStartTime: 0,
        _readyShownOnce: false,
        _unsubscribers: [],
        _dismissed: false,
        _initialized: false,
        _configBusListening: false,
        _resizeListenerAttached: false,
        STORAGE_KEY: "pencil.agentPillPosition",
        DEFAULT_IDLE_TIMEOUT: 3000,

        /**
         * Checks whether the status pill is enabled via Pencil Config service.
         */
        isPillEnabled: function () {
            if (typeof Config !== "undefined" && typeof Config.get === "function") {
                var val = Config.get("agent.feedback.statusPill");
                if (val !== null && val !== undefined) {
                    return Boolean(val);
                }
            }
            return true;
        },

        /**
         * Anchors the hostNode to closest window edges (right/left and bottom/top).
         */
        anchorToClosestEdges: function (hostNode) {
            if (!hostNode) return;
            var winW = (typeof window !== "undefined" && window.innerWidth) || 1200;
            var winH = (typeof window !== "undefined" && window.innerHeight) || 800;
            var rect = hostNode.getBoundingClientRect ? hostNode.getBoundingClientRect() : {
                left: parseInt(hostNode.style.left, 10) || 10,
                top: parseInt(hostNode.style.top, 10) || 10,
                width: hostNode.offsetWidth || 220,
                height: hostNode.offsetHeight || 36
            };
            var hostW = rect.width || hostNode.offsetWidth || 220;
            var hostH = rect.height || hostNode.offsetHeight || 36;

            var curLeft = rect.left;
            var curTop = rect.top;
            var curRight = winW - (curLeft + hostW);
            var curBottom = winH - (curTop + hostH);

            if (curRight < curLeft) {
                hostNode.style.right = Math.max(10, Math.round(curRight)) + "px";
                hostNode.style.left = "auto";
            } else {
                hostNode.style.left = Math.max(10, Math.round(curLeft)) + "px";
                hostNode.style.right = "auto";
            }

            if (curBottom < curTop) {
                hostNode.style.bottom = Math.max(10, Math.round(curBottom)) + "px";
                hostNode.style.top = "auto";
            } else {
                hostNode.style.top = Math.max(10, Math.round(curTop)) + "px";
                hostNode.style.bottom = "auto";
            }
        },

        /**
         * Loads saved pill coordinates from localStorage, respecting edge anchoring.
         */
        loadSavedPosition: function (hostNode, containerNode) {
            if (!hostNode) return;
            // Default anchor: bottom-right corner of viewport
            hostNode.style.bottom = "16px";
            hostNode.style.right = "20px";
            hostNode.style.left = "auto";
            hostNode.style.top = "auto";

            if (typeof localStorage === "undefined") return;
            try {
                var raw = localStorage.getItem(this.STORAGE_KEY);
                if (!raw) return;
                var pos = JSON.parse(raw);
                if (!pos || !pos.anchorX || !pos.anchorY) {
                    // Legacy or invalid format - discard so it never displaces the pill off-screen
                    localStorage.removeItem(this.STORAGE_KEY);
                    return;
                }

                var winW = (typeof window !== "undefined" && window.innerWidth) || (containerNode && containerNode.offsetWidth) || 1200;
                var winH = (typeof window !== "undefined" && window.innerHeight) || (containerNode && containerNode.offsetHeight) || 800;

                if (pos.anchorX === "right" && typeof pos.x === "number") {
                    hostNode.style.right = Math.min(winW - 50, Math.max(10, pos.x)) + "px";
                    hostNode.style.left = "auto";
                } else if (pos.anchorX === "left" && typeof pos.x === "number") {
                    hostNode.style.left = Math.min(winW - 50, Math.max(10, pos.x)) + "px";
                    hostNode.style.right = "auto";
                }

                if (pos.anchorY === "bottom" && typeof pos.y === "number") {
                    hostNode.style.bottom = Math.min(winH - 30, Math.max(10, pos.y)) + "px";
                    hostNode.style.top = "auto";
                } else if (pos.anchorY === "top" && typeof pos.y === "number") {
                    hostNode.style.top = Math.min(winH - 30, Math.max(10, pos.y)) + "px";
                    hostNode.style.bottom = "auto";
                }
            } catch (e) {}
        },

        /**
         * Persists pill coordinates to localStorage using edge anchors.
         */
        savePosition: function (hostNode) {
            if (!hostNode || typeof localStorage === "undefined") return;
            try {
                var isRight = hostNode.style.right && hostNode.style.right !== "auto";
                var isBottom = hostNode.style.bottom && hostNode.style.bottom !== "auto";

                var xVal = isRight ? parseInt(hostNode.style.right, 10) : parseInt(hostNode.style.left, 10);
                var yVal = isBottom ? parseInt(hostNode.style.bottom, 10) : parseInt(hostNode.style.top, 10);

                var data = {
                    anchorX: isRight ? "right" : "left",
                    anchorY: isBottom ? "bottom" : "top",
                    x: isNaN(xVal) ? 20 : xVal,
                    y: isNaN(yVal) ? 16 : yVal
                };

                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            } catch (e) {}
        },

        /**
         * Clamps the pill host node inside viewport boundaries when screen/window resizes.
         */
        clampToBounds: function (hostNode, containerNode) {
            if (!hostNode) return;
            try {
                var winW = (typeof window !== "undefined" && window.innerWidth) || (containerNode && containerNode.offsetWidth) || 1200;
                var winH = (typeof window !== "undefined" && window.innerHeight) || (containerNode && containerNode.offsetHeight) || 800;
                var hostW = hostNode.offsetWidth || 220;
                var hostH = hostNode.offsetHeight || 36;

                var maxRightOrLeft = Math.max(10, winW - hostW - 10);
                var maxBottomOrTop = Math.max(10, winH - hostH - 10);

                if (hostNode.style.left && hostNode.style.left !== "auto") {
                    var l = parseInt(hostNode.style.left, 10);
                    if (!isNaN(l)) {
                        hostNode.style.left = Math.min(maxRightOrLeft, Math.max(10, l)) + "px";
                    }
                }
                if (hostNode.style.right && hostNode.style.right !== "auto") {
                    var r = parseInt(hostNode.style.right, 10);
                    if (!isNaN(r)) {
                        hostNode.style.right = Math.min(maxRightOrLeft, Math.max(10, r)) + "px";
                    }
                }
                if (hostNode.style.top && hostNode.style.top !== "auto") {
                    var t = parseInt(hostNode.style.top, 10);
                    if (!isNaN(t)) {
                        hostNode.style.top = Math.min(maxBottomOrTop, Math.max(10, t)) + "px";
                    }
                }
                if (hostNode.style.bottom && hostNode.style.bottom !== "auto") {
                    var b = parseInt(hostNode.style.bottom, 10);
                    if (!isNaN(b)) {
                        hostNode.style.bottom = Math.min(maxBottomOrTop, Math.max(10, b)) + "px";
                    }
                }
            } catch (e) {}
        },

        /**
         * Injects CSS stylesheet into document head.
         */
        ensureStyles: function (targetDoc) {
            targetDoc = targetDoc || (typeof document !== "undefined" ? document : null);
            if (!targetDoc || targetDoc.getElementById("agent-status-pill-styles")) {
                return;
            }

            var head = targetDoc.head || (targetDoc.getElementsByTagName ? targetDoc.getElementsByTagName("head")[0] : null) || targetDoc.documentElement;
            if (!head) return;

            var style = targetDoc.createElement("style");
            style.id = "agent-status-pill-styles";
            var cssText = [
                "#agentStatusPillHost {",
                "  position: fixed;",
                "  bottom: 16px;",
                "  right: 20px;",
                "  z-index: 10000;",
                "  pointer-events: none;",
                "}",
                "#agentStatusPill {",
                "  display: inline-flex;",
                "  align-items: center;",
                "  gap: 8px;",
                "  padding: 7px 14px;",
                "  background: white;",
                "  backdrop-filter: blur(14px) saturate(180%);",
                "  -webkit-backdrop-filter: blur(14px) saturate(180%);",
                "  border: 1px solid rgba(0, 0, 0, 0.16);",
                "  border-radius: 3px;",
                "  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.12);",
                "  color: #111827;",
                "  font-family: inherit;",
                "  font-size: 12.5px;",
                "  line-height: 1.4;",
                "  user-select: none;",
                "  -webkit-user-select: none;",
                "  transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;",
                "  cursor: grab;",
                "  max-width: 380px;",
                "  white-space: nowrap;",
                "}",
                "#agentStatusPill:active {",
                "  cursor: grabbing;",
                "}",
                "#agentStatusPill.agent-pill-hidden {",
                "  opacity: 0;",
                "  transform: translateY(14px) scale(0.96);",
                "  pointer-events: none;",
                "}",
                "#agentStatusPill.agent-pill-visible {",
                "  opacity: 1;",
                "  transform: translateY(0) scale(1.0);",
                "  pointer-events: auto;",
                "}",
                ".agent-pill-dot {",
                "  width: 8px;",
                "  height: 8px;",
                "  border-radius: 50%;",
                "  background: #b45309;",
                "  box-shadow: 0 0 6px rgba(180, 83, 9, 0.6);",
                "  animation: agentPillPulse 1.4s infinite ease-in-out;",
                "  flex-shrink: 0;",
                "  transition: background 0.3s ease, box-shadow 0.3s ease;",
                "}",
                "#agentStatusPill.state-idle .agent-pill-dot {",
                "  background: #047857;",
                "  box-shadow: 0 0 6px rgba(4, 120, 87, 0.6);",
                "  animation: none;",
                "}",
                "#agentStatusPill.state-active .agent-pill-dot {",
                "  background: #b45309;",
                "  box-shadow: 0 0 8px rgba(180, 83, 9, 0.8);",
                "  animation: agentPillPulse 1.4s infinite ease-in-out;",
                "}",
                "#agentStatusPill.state-thinking .agent-pill-dot {",
                "  background: #6d28d9;",
                "  box-shadow: 0 0 8px rgba(109, 40, 217, 0.8);",
                "  animation: agentPillPulse 1.4s infinite ease-in-out;",
                "}",
                "#agentStatusPill.state-success .agent-pill-dot {",
                "  background: #047857;",
                "  box-shadow: 0 0 6px rgba(4, 120, 87, 0.6);",
                "  animation: none;",
                "}",
                "#agentStatusPill.state-error .agent-pill-dot {",
                "  background: #b91c1c;",
                "  box-shadow: 0 0 8px rgba(185, 28, 28, 0.7);",
                "  animation: none;",
                "}",
                "@keyframes agentPillPulse {",
                "  0%, 100% { transform: scale(0.9); opacity: 0.8; }",
                "  50% { transform: scale(1.25); opacity: 1; box-shadow: 0 0 10px #b45309, 0 0 16px rgba(180, 83, 9, 0.85); }",
                "}",
                ".agent-pill-badge {",
                "  color: #9a3412;",
                "  font-size: 11px;",
                "  font-weight: 700;",
                "  text-transform: uppercase;",
                "  letter-spacing: 0.6px;",
                "}",
                ".agent-pill-sep {",
                "  color: #4b5563;",
                "  font-size: 10px;",
                "}",
                ".agent-pill-msg {",
                "  color: #111827;",
                "  font-weight: 600;",
                "  overflow: hidden;",
                "  text-overflow: ellipsis;",
                "}",
                ".agent-pill-close {",
                "  margin-left: 4px;",
                "  color: #4b5563;",
                "  font-size: 14px;",
                "  line-height: 1;",
                "  border-radius: 50%;",
                "  padding: 1px 4px;",
                "  transition: color 0.15s ease, background 0.15s ease;",
                "}",
                ".agent-pill-close:hover {",
                "  color: #000000;",
                "  cursor: pointer;",
                "  background: rgba(0, 0, 0, 0.12);",
                "}"
            ].join("\n");

            try {
                style.textContent = cssText;
            } catch (e) {}
            if (!style.textContent) {
                style.appendChild(targetDoc.createTextNode(cssText));
            }
            head.appendChild(style);
        },

        /**
         * Initializes and mounts the status pill inside any designated container node.
         * Accepts a DOM Element, Widget instance, selector string, or defaults to document.body.
         *
         * @param {HTMLElement|string|object} [containerNode]
         */
        init: function (containerNode) {
            // Support passing a widget instance (e.g. widget.node() or widget.node/dom)
            if (containerNode && typeof containerNode.node === "function") {
                containerNode = containerNode.node();
            } else if (containerNode && containerNode.node && containerNode.node.nodeType) {
                containerNode = containerNode.node;
            } else if (containerNode && containerNode.dom && containerNode.dom.nodeType) {
                containerNode = containerNode.dom;
            }

            var targetDoc = (containerNode && containerNode.ownerDocument) || (typeof document !== "undefined" ? document : null);
            if (!targetDoc) return;

            // If a selector or ID string was provided, resolve it
            if (typeof containerNode === "string" && targetDoc.querySelector) {
                containerNode = targetDoc.querySelector(containerNode) || (targetDoc.getElementById && targetDoc.getElementById(containerNode));
            }

            // Relaxed container fallback: defaults directly to document body or documentElement
            if (!containerNode) {
                containerNode = targetDoc.body || targetDoc.documentElement;
            }
            if (!containerNode) return;

            this.ensureStyles(targetDoc);

            // Clean up previous host instance across targetDoc or container
            var existingHost = (targetDoc.getElementById && targetDoc.getElementById("agentStatusPillHost")) ||
                               (containerNode.querySelector && containerNode.querySelector("#agentStatusPillHost"));
            if (existingHost && existingHost.parentNode) {
                existingHost.parentNode.removeChild(existingHost);
            }

            var host = targetDoc.createElement("div");
            host.id = "agentStatusPillHost";

            this.loadSavedPosition(host, containerNode);

            var self = this;
            if (!this._resizeListenerAttached && typeof window !== "undefined" && window.addEventListener) {
                this._resizeListenerAttached = true;
                window.addEventListener("resize", function () {
                    self.clampToBounds(host, containerNode);
                });
            }

            var pill = targetDoc.createElement("div");
            pill.id = "agentStatusPill";
            // Start hidden until active agent work occurs
            pill.className = "agent-pill-hidden";

            var dot = targetDoc.createElement("div");
            dot.className = "agent-pill-dot";

            var badge = targetDoc.createElement("span");
            badge.className = "agent-pill-badge";
            badge.textContent = "AI Agent";

            var sep = targetDoc.createElement("span");
            sep.className = "agent-pill-sep";
            sep.textContent = "·";

            var msg = targetDoc.createElement("span");
            msg.className = "agent-pill-msg";
            msg.textContent = "Ready";

            var closeBtn = targetDoc.createElement("span");
            closeBtn.className = "agent-pill-close";
            closeBtn.setAttribute("title", "Dismiss");
            closeBtn.textContent = "\u00D7";

            pill.appendChild(dot);
            pill.appendChild(badge);
            pill.appendChild(sep);
            pill.appendChild(msg);
            pill.appendChild(closeBtn);
            host.appendChild(pill);
            containerNode.appendChild(host);

            this._hostNode = host;
            this._pillNode = pill;
            this._dotNode = dot;
            this._msgNode = msg;
            this._dismissed = false;
            this._initialized = true;

            var self = this;
            closeBtn.addEventListener("mousedown", function (e) {
                e.stopPropagation();
            });
            closeBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                self.dismiss();
            });

            // Ensure other click zones on the pill do not trigger outer handlers or dismiss the pill
            pill.addEventListener("click", function (e) {
                e.stopPropagation();
            });

            this.makeDraggable(host, pill, containerNode, targetDoc);
            this.wireFeedbackEvents();
        },

        /**
         * Attaches drag-and-drop movement to the status pill and persists position.
         */
        makeDraggable: function (hostNode, pillNode, containerNode, targetDoc) {
            var self = this;
            var isDragging = false;
            var startX = 0;
            var startY = 0;
            var startLeft = 0;
            var startTop = 0;
            var hasMoved = false;

            pillNode.addEventListener("mousedown", function (e) {
                if (e.button !== 0) return;
                if (e.target && e.target.classList && e.target.classList.contains("agent-pill-close")) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();

                var winW = (typeof window !== "undefined" && window.innerWidth) || 1200;
                var winH = (typeof window !== "undefined" && window.innerHeight) || 800;
                var hostRect = hostNode.getBoundingClientRect ? hostNode.getBoundingClientRect() : { left: 0, top: 0, width: 220, height: 36 };

                startX = e.clientX;
                startY = e.clientY;
                startLeft = hostRect.left;
                startTop = hostRect.top;

                isDragging = true;
                hasMoved = false;

                function onMouseMove(moveEvt) {
                    if (!isDragging) return;
                    var dx = moveEvt.clientX - startX;
                    var dy = moveEvt.clientY - startY;

                    if (!hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                        hasMoved = true;
                    }

                    if (hasMoved) {
                        var curWinW = (typeof window !== "undefined" && window.innerWidth) || winW;
                        var curWinH = (typeof window !== "undefined" && window.innerHeight) || winH;
                        var hostW = hostNode.offsetWidth || hostRect.width || 220;
                        var hostH = hostNode.offsetHeight || hostRect.height || 36;

                        var newL = Math.max(10, Math.min(curWinW - hostW - 10, startLeft + dx));
                        var newT = Math.max(10, Math.min(curWinH - hostH - 10, startTop + dy));

                        hostNode.style.left = Math.round(newL) + "px";
                        hostNode.style.top = Math.round(newT) + "px";
                        hostNode.style.right = "auto";
                        hostNode.style.bottom = "auto";

                        pillNode.style.cursor = "grabbing";
                    }
                }

                function onMouseUp() {
                    if (!isDragging) return;
                    isDragging = false;
                    pillNode.style.cursor = "grab";

                    if (targetDoc.removeEventListener) {
                        targetDoc.removeEventListener("mousemove", onMouseMove);
                        targetDoc.removeEventListener("mouseup", onMouseUp);
                    }

                    if (hasMoved) {
                        self._suppressClick = true;
                        self.anchorToClosestEdges(hostNode);
                        self.savePosition(hostNode);
                        setTimeout(function () {
                            self._suppressClick = false;
                        }, 50);
                    }
                }

                if (targetDoc.addEventListener) {
                    targetDoc.addEventListener("mousemove", onMouseMove);
                    targetDoc.addEventListener("mouseup", onMouseUp);
                }
            });
        },

        /**
         * Subscribes to AgentFeedbackManager events and global config events.
         */
        wireFeedbackEvents: function () {
            var self = this;
            if (!this._configBusListening && typeof window !== "undefined" && window.globalEventBus) {
                this._configBusListening = true;
                window.globalEventBus.listen("config-change", function (event) {
                    if (event && event.name === "agent.feedback.statusPill") {
                        if (!event.value) {
                            self.hide();
                        } else {
                            self.show("Ready", "idle", self.DEFAULT_IDLE_TIMEOUT);
                        }
                    }
                });
            }

            var feedback = (typeof window !== "undefined" && window.AgentFeedback) ||
                           (typeof global !== "undefined" && global.AgentFeedback) || null;
            if (!feedback) return;

            if (this._unsubscribers && this._unsubscribers.length > 0) {
                for (var i = 0; i < this._unsubscribers.length; i++) {
                    if (typeof this._unsubscribers[i] === "function") {
                        this._unsubscribers[i]();
                    }
                }
            }
            this._unsubscribers = [];

            this._unsubscribers.push(
                feedback.on("tool_start", function (payload) {
                    self._dismissed = false;
                    self._actionStartTime = Date.now();
                    if (self._hideTimer) {
                        clearTimeout(self._hideTimer);
                        self._hideTimer = null;
                    }
                    self.show(payload.actionText || "Working...", "active");
                })
            );

            this._unsubscribers.push(
                feedback.on("tool_end", function (payload) {
                    if (payload && !payload.success && payload.error) {
                        self.show("Failed: " + payload.error, "error", 3500);
                        return;
                    }

                    // Keep current action details visible and auto-hide after idle timeout
                    if (self._hideTimer) {
                        clearTimeout(self._hideTimer);
                        self._hideTimer = null;
                    }
                    self._hideTimer = setTimeout(function () {
                        self.hide();
                    }, self.DEFAULT_IDLE_TIMEOUT);
                })
            );

            this._unsubscribers.push(
                feedback.on("agent_thinking", function (payload) {
                    self._dismissed = false;
                    self._actionStartTime = Date.now();
                    if (self._hideTimer) {
                        clearTimeout(self._hideTimer);
                        self._hideTimer = null;
                    }
                    self.show(payload.message || "Thinking...", "thinking");
                })
            );
        },

        /**
         * Displays the pill with the specified message and state.
         *
         * @param {string} message
         * @param {"idle" | "active" | "thinking" | "success" | "error"} state
         * @param {number} [autoHideMs]
         */
        show: function (message, state, autoHideMs) {
            if (!this.isPillEnabled()) return;
            if (!this._pillNode) return;

            if (this._hideTimer) {
                clearTimeout(this._hideTimer);
                this._hideTimer = null;
            }

            state = state || "active";
            this._pillNode.className = "agent-pill-visible state-" + state;
            if (this._msgNode) {
                this._msgNode.textContent = message || "Working...";
            }

            var timeout = autoHideMs || this.DEFAULT_IDLE_TIMEOUT;
            if (timeout === undefined && (state === "idle" || message === "Ready")) {
                timeout = this.DEFAULT_IDLE_TIMEOUT;
            }

            if (timeout && timeout > 0) {
                var self = this;
                this._hideTimer = setTimeout(function () {
                    self.hide();
                }, timeout);
            }
        },

        /**
         * User-initiated dismissal of the pill.
         */
        dismiss: function () {
            this._dismissed = true;
            this.hide();
        },

        /**
         * Smoothly hides the status pill.
         */
        hide: function () {
            if (this._hideTimer) {
                clearTimeout(this._hideTimer);
                this._hideTimer = null;
            }
            if (this._pillNode) {
                this._pillNode.className = "agent-pill-hidden";
            }
        }
    };

    if (typeof window !== "undefined") {
        window.AgentStatusPill = AgentStatusPill;
    }
    if (typeof global !== "undefined") {
        global.AgentStatusPill = AgentStatusPill;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = AgentStatusPill;
    }
})();
