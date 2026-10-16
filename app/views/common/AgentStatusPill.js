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
        _initialized: false,

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
                "  position: absolute;",
                "  bottom: 16px;",
                "  right: 20px;",
                "  z-index: 1000;",
                "  pointer-events: none;",
                "}",
                "#agentStatusPill {",
                "  display: inline-flex;",
                "  align-items: center;",
                "  gap: 8px;",
                "  padding: 7px 14px;",
                "  background: rgba(18, 18, 22, 0.88);",
                "  backdrop-filter: blur(14px) saturate(180%);",
                "  -webkit-backdrop-filter: blur(14px) saturate(180%);",
                "  border: 1px solid rgba(255, 255, 255, 0.12);",
                "  border-radius: 9999px;",
                "  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 0 24px rgba(218, 133, 0, 0.18);",
                "  color: #f4f4f5;",
                "  font-family: inherit;",
                "  font-size: 12.5px;",
                "  line-height: 1.4;",
                "  user-select: none;",
                "  transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;",
                "  cursor: pointer;",
                "  max-width: 380px;",
                "  white-space: nowrap;",
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
                "  background: #da8500;",
                "  box-shadow: 0 0 10px #da8500, 0 0 18px rgba(218, 133, 0, 0.7);",
                "  animation: agentPillPulse 1.4s infinite ease-in-out;",
                "  flex-shrink: 0;",
                "  transition: background 0.3s ease, box-shadow 0.3s ease;",
                "}",
                "#agentStatusPill.state-idle .agent-pill-dot {",
                "  background: #10b981;",
                "  box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);",
                "  animation: none;",
                "}",
                "#agentStatusPill.state-active .agent-pill-dot {",
                "  background: #da8500;",
                "  box-shadow: 0 0 10px #da8500, 0 0 18px rgba(218, 133, 0, 0.85);",
                "  animation: agentPillPulse 1.4s infinite ease-in-out;",
                "}",
                "#agentStatusPill.state-thinking .agent-pill-dot {",
                "  background: #8b5cf6;",
                "  box-shadow: 0 0 10px #8b5cf6, 0 0 18px rgba(139, 92, 246, 0.8);",
                "  animation: agentPillPulse 1.4s infinite ease-in-out;",
                "}",
                "#agentStatusPill.state-success .agent-pill-dot {",
                "  background: #10b981;",
                "  box-shadow: 0 0 10px #10b981, 0 0 18px rgba(16, 185, 129, 0.7);",
                "  animation: none;",
                "}",
                "#agentStatusPill.state-error .agent-pill-dot {",
                "  background: #f43f5e;",
                "  box-shadow: 0 0 10px #f43f5e, 0 0 18px rgba(244, 63, 94, 0.7);",
                "  animation: none;",
                "}",
                "@keyframes agentPillPulse {",
                "  0%, 100% { transform: scale(0.9); opacity: 0.8; }",
                "  50% { transform: scale(1.25); opacity: 1; box-shadow: 0 0 14px #da8500, 0 0 24px rgba(218, 133, 0, 0.9); }",
                "}",
                ".agent-pill-badge {",
                "  color: #da8500;",
                "  font-size: 11px;",
                "  font-weight: 700;",
                "  text-transform: uppercase;",
                "  letter-spacing: 0.6px;",
                "}",
                ".agent-pill-sep {",
                "  color: #475569;",
                "  font-size: 10px;",
                "}",
                ".agent-pill-msg {",
                "  color: #f8fafc;",
                "  font-weight: 500;",
                "  overflow: hidden;",
                "  text-overflow: ellipsis;",
                "}",
                ".agent-pill-close {",
                "  margin-left: 4px;",
                "  color: #64748b;",
                "  font-size: 14px;",
                "  line-height: 1;",
                "  border-radius: 50%;",
                "  padding: 1px 4px;",
                "  transition: color 0.15s ease, background 0.15s ease;",
                "}",
                ".agent-pill-close:hover {",
                "  color: #f1f5f9;",
                "  background: rgba(255, 255, 255, 0.12);",
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
         * Initializes and mounts the status pill inside the designated container.
         */
        init: function (containerNode) {
            var targetDoc = (containerNode && containerNode.ownerDocument) || (typeof document !== "undefined" ? document : null);
            if (!targetDoc) return;

            this.ensureStyles(targetDoc);

            if (!containerNode) {
                containerNode = targetDoc.querySelector ? (targetDoc.querySelector('[anon-id="mainArea"]') || targetDoc.querySelector('[anon-id="contentBody"]')) : null;
            }
            if (!containerNode) {
                containerNode = targetDoc.body;
            }
            if (!containerNode) return;

            // Remove previous instance if existing
            var existingHost = containerNode.querySelector ? containerNode.querySelector("#agentStatusPillHost") : null;
            if (existingHost && existingHost.parentNode) {
                existingHost.parentNode.removeChild(existingHost);
            }

            var host = targetDoc.createElement("div");
            host.id = "agentStatusPillHost";

            var pill = targetDoc.createElement("div");
            pill.id = "agentStatusPill";
            if (!this.isPillEnabled()) {
                pill.className = "agent-pill-hidden";
            } else {
                pill.className = "agent-pill-visible state-idle";
            }

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
            closeBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                self.dismiss();
            });
            pill.addEventListener("click", function (e) {
                e.stopPropagation();
                self.dismiss();
            });

            this.wireFeedbackEvents();
        },

        /**
         * Subscribes to AgentFeedbackManager events.
         */
        wireFeedbackEvents: function () {
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

            var self = this;
            this._unsubscribers.push(
                feedback.on("tool_start", function (payload) {
                    self._dismissed = false;
                    self.show(payload.actionText || "Working...", "active");
                })
            );

            this._unsubscribers.push(
                feedback.on("tool_end", function (payload) {
                    if (payload.success) {
                        var durStr = (payload.durationMs !== undefined) ? " (" + payload.durationMs + "ms)" : "";
                        self.show("Done" + durStr, "success", 2000);
                    } else {
                        self.show("Failed: " + (payload.error || "error"), "error", 3500);
                    }
                })
            );

            this._unsubscribers.push(
                feedback.on("agent_thinking", function (payload) {
                    self._dismissed = false;
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

            if (autoHideMs && autoHideMs > 0) {
                var self = this;
                this._hideTimer = setTimeout(function () {
                    if (self._dismissed) {
                        self.hide();
                    } else {
                        self.show("Ready", "idle");
                    }
                }, autoHideMs);
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
