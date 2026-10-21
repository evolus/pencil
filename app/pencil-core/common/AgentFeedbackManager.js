/**
 * AgentFeedbackManager
 *
 * Central event-driven telemetry bus for AI agent interactions in Evolus Pencil.
 * Decouples MCP server tool executions from UI canvas animations and status indicators.
 *
 * Guarantees:
 * - Asynchronous, non-blocking execution (zero latency penalty on MCP tool execution)
 * - Safe subscriber isolation (listener errors do not crash or interrupt tool execution)
 * - Clean document isolation (no direct manipulation of document XML or drawingLayer)
 */

(function () {
    function AgentFeedbackManager() {
        this._listeners = {};
        this._activeTool = null;
        this._history = [];
        this._maxHistory = 50;
    }

    AgentFeedbackManager.prototype.on = function (event, callback) {
        if (!event || typeof callback !== "function") return function () {};
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);

        var self = this;
        return function () {
            self.off(event, callback);
        };
    };

    AgentFeedbackManager.prototype.off = function (event, callback) {
        if (!event || !this._listeners[event]) return;
        if (!callback) {
            delete this._listeners[event];
            return;
        }
        var idx = this._listeners[event].indexOf(callback);
        if (idx !== -1) {
            this._listeners[event].splice(idx, 1);
        }
    };

    AgentFeedbackManager.prototype.emit = function (event, payload) {
        if (!event) return;
        payload = payload || {};
        payload.event = event;
        payload.timestamp = payload.timestamp || Date.now();

        // Maintain bounded telemetry history
        this._history.push(payload);
        if (this._history.length > this._maxHistory) {
            this._history.shift();
        }

        // Notify specific listeners
        var specific = this._listeners[event] ? this._listeners[event].slice() : [];
        for (var i = 0; i < specific.length; i++) {
            try {
                specific[i](payload);
            } catch (err) {
                if (typeof console !== "undefined" && console.error) {
                    console.error("[AgentFeedbackManager] Error in listener for '" + event + "':", err);
                }
            }
        }

        // Notify wildcard listeners
        var wildcard = this._listeners["*"] ? this._listeners["*"].slice() : [];
        for (var j = 0; j < wildcard.length; j++) {
            try {
                wildcard[j](payload);
            } catch (err2) {
                if (typeof console !== "undefined" && console.error) {
                    console.error("[AgentFeedbackManager] Error in wildcard listener:", err2);
                }
            }
        }
    };

    /**
     * Compute a human-readable action description for external UI indicators.
     */
    AgentFeedbackManager.prototype._computeActionText = function (toolName, args) {
        args = args || {};
        switch (toolName) {
            case "insert_shapes":
                var count = Array.isArray(args.elements) ? args.elements.length : 0;
                return count > 0 ? "Inserting " + count + " shape" + (count > 1 ? "s" : "") + "..." : "Inserting shapes...";
            case "update_shapes":
                var upCount = Array.isArray(args.updates) ? args.updates.length : 0;
                return upCount > 0 ? "Updating " + upCount + " shape" + (upCount > 1 ? "s" : "") + "..." : "Updating shapes...";
            case "delete_shapes":
                var delCount = Array.isArray(args.shapeIds) ? args.shapeIds.length : (args.target === "selected" ? "selected" : "");
                return delCount ? "Deleting " + delCount + " shape" + (delCount !== 1 ? "s" : "") + "..." : "Deleting shapes...";
            case "select_shapes":
                return "Selecting shapes...";
            case "shift_layout":
                return "Reflowing canvas layout...";
            case "align_shapes":
                var alignType = args.alignment ? " (" + args.alignment + ")" : "";
                return "Aligning shapes" + alignType + "...";
            case "distribute_shapes":
                return "Distributing shapes...";
            case "move_shapes":
                return "Moving shapes...";
            case "find_shapes":
            case "find_shapes_in_canvas":
                return "Scanning canvas shapes...";
            case "create_page":
                return "Creating page...";
            case "switch_page":
                return "Switching active page...";
            case "render_preview":
                return "Generating canvas preview...";
            case "get_page_content":
            case "get_active_document":
                return "Inspecting document...";
            default:
                return "Executing " + toolName.replace(/_/g, " ") + "...";
        }
    };

    /**
     * Dispatches notification when an MCP tool begins execution.
     */
    AgentFeedbackManager.prototype.notifyToolStart = function (toolName, args, meta) {
        var actionText = this._computeActionText(toolName, args);
        this._activeTool = {
            tool: toolName,
            args: args,
            actionText: actionText,
            startTime: Date.now(),
            meta: meta || {}
        };

        this.emit("tool_start", {
            tool: toolName,
            actionText: actionText,
            args: args,
            meta: meta || {}
        });
    };

    /**
     * Dispatches notification when an MCP tool finishes execution.
     */
    AgentFeedbackManager.prototype.notifyToolEnd = function (toolName, result, durationMs, error) {
        var prevActive = this._activeTool;
        this._activeTool = null;

        this.emit("tool_end", {
            tool: toolName,
            actionText: prevActive ? prevActive.actionText : "",
            durationMs: durationMs,
            success: !error,
            error: error ? (error.message || String(error)) : null,
            result: result
        });
    };

    /**
     * Dispatches telemetry when shapes are inserted onto canvas.
     */
    AgentFeedbackManager.prototype.notifyShapesInserted = function (pageId, shapes) {
        shapes = Array.isArray(shapes) ? shapes : [];
        this.emit("shapes_inserted", {
            pageId: pageId,
            count: shapes.length,
            shapes: shapes
        });
    };

    /**
     * Dispatches telemetry when shapes are updated on canvas.
     */
    AgentFeedbackManager.prototype.notifyShapesUpdated = function (pageId, shapes) {
        shapes = Array.isArray(shapes) ? shapes : [];
        this.emit("shapes_updated", {
            pageId: pageId,
            count: shapes.length,
            shapes: shapes
        });
    };

    /**
     * Dispatches telemetry when shapes are deleted from canvas.
     */
    AgentFeedbackManager.prototype.notifyShapesDeleted = function (pageId, shapeIds) {
        shapeIds = Array.isArray(shapeIds) ? shapeIds : [];
        this.emit("shapes_deleted", {
            pageId: pageId,
            count: shapeIds.length,
            shapeIds: shapeIds
        });
    };

    AgentFeedbackManager.prototype.getActiveTool = function () {
        return this._activeTool;
    };

    AgentFeedbackManager.prototype.getHistory = function (limit) {
        if (!limit || limit >= this._history.length) {
            return this._history.slice();
        }
        return this._history.slice(this._history.length - limit);
    };

    AgentFeedbackManager.prototype.clear = function () {
        this._listeners = {};
        this._activeTool = null;
        this._history = [];
    };

    var instance = new AgentFeedbackManager();

    if (typeof window !== "undefined") {
        window.AgentFeedback = instance;
    }
    if (typeof global !== "undefined") {
        global.AgentFeedback = instance;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = instance;
    }
})();
