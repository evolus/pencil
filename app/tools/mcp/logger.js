/**
 * Structured Logger for Pencil Model Context Protocol (MCP) Server
 *
 * Implemented using classic vanilla JavaScript (prototype-based) with ANSI color highlights.
 */

var LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

var COLORS = {
    RESET: "\x1b[0m",
    GRAY: "\x1b[90m",
    CYAN: "\x1b[36m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    RED: "\x1b[31m",
    BLUE: "\x1b[34m"
};

var LEVEL_COLORS = {
    DEBUG: COLORS.GRAY,
    INFO: COLORS.GREEN,
    WARN: COLORS.YELLOW,
    ERROR: COLORS.RED
};

function McpLogger(options) {
    options = options || {};
    var envLevel = process.env.PENCIL_MCP_LOG_LEVEL ? process.env.PENCIL_MCP_LOG_LEVEL.toUpperCase() : "INFO";
    this.level = LOG_LEVELS[options.level || envLevel];
    if (this.level === undefined) {
        this.level = LOG_LEVELS.INFO;
    }
    this.prefix = options.prefix || "[Pencil MCP]";
}

McpLogger.prototype._format = function (levelName, message, meta) {
    var timestamp = new Date().toISOString();
    var levelColor = LEVEL_COLORS[levelName] || COLORS.RESET;

    var logStr = COLORS.GRAY + timestamp + COLORS.RESET + " " +
                 COLORS.CYAN + this.prefix + COLORS.RESET + " " +
                 levelColor + "[" + levelName + "]" + COLORS.RESET + " " +
                 message;

    if (meta && Object.keys(meta).length > 0) {
        logStr += COLORS.GRAY + " | " + stringifyMeta(meta) + COLORS.RESET;
    }
    return logStr;
};

var MAX_LOGGED_STRING_LENGTH = 300;

/*
 * Tool arguments are annotated in place during execution (for example
 * insert_shapes stores the live ShapeDef as `_resolvedShapeDef`, whose
 * collection links back to it). A log line must never throw, because the
 * logger runs inside error handlers and its exception would replace the
 * tool error the agent needs to see. Internal `_` keys, repeated references
 * and long strings (data URIs, SVG) are dropped or shortened to keep lines small.
 */
function stringifyMeta(meta) {
    var seen = new WeakSet();
    try {
        return JSON.stringify(meta, function (key, value) {
            if (key.charAt(0) === "_") return undefined;
            if (typeof value === "string" && value.length > MAX_LOGGED_STRING_LENGTH) {
                return value.substring(0, MAX_LOGGED_STRING_LENGTH) + "...(" + value.length + " chars)";
            }
            if (typeof value === "bigint") return String(value);
            if (value && typeof value === "object") {
                if (seen.has(value)) return "[repeated]";
                seen.add(value);
            }
            return value;
        });
    } catch (e) {
        return "[unloggable metadata: " + e.message + "]";
    }
}

McpLogger.prototype.debug = function (message, meta) {
    if (this.level <= LOG_LEVELS.DEBUG) {
        console.debug(this._format("DEBUG", message, meta));
    }
};

McpLogger.prototype.info = function (message, meta) {
    if (this.level <= LOG_LEVELS.INFO) {
        console.log(this._format("INFO", message, meta));
    }
};

McpLogger.prototype.warn = function (message, meta) {
    if (this.level <= LOG_LEVELS.WARN) {
        console.warn(this._format("WARN", message, meta));
    }
};

McpLogger.prototype.error = function (message, err, meta) {
    if (this.level <= LOG_LEVELS.ERROR) {
        var errMeta = {};
        if (meta) {
            for (var key in meta) {
                if (meta.hasOwnProperty(key)) {
                    errMeta[key] = meta[key];
                }
            }
        }
        if (err) {
            errMeta.errorMessage = err.message || String(err);
            if (err.stack) {
                errMeta.stack = err.stack;
            }
        }
        console.error(this._format("ERROR", message, errMeta));
    }
};

McpLogger.prototype.startTimer = function (operationName, meta) {
    var self = this;
    var start = Date.now();
    meta = meta || {};

    return function (extraMessage, extraMeta) {
        var durationMs = Date.now() - start;
        var fullMeta = {};
        for (var k in meta) {
            if (meta.hasOwnProperty(k)) fullMeta[k] = meta[k];
        }
        if (extraMeta) {
            for (var ek in extraMeta) {
                if (extraMeta.hasOwnProperty(ek)) fullMeta[ek] = extraMeta[ek];
            }
        }
        fullMeta.durationMs = durationMs;
        var msg = extraMessage ? operationName + ": " + extraMessage : operationName;
        self.info(msg, fullMeta);
        return durationMs;
    };
};

var defaultLogger = new McpLogger();

module.exports = {
    McpLogger: McpLogger,
    defaultLogger: defaultLogger,
    LOG_LEVELS: LOG_LEVELS,
    COLORS: COLORS
};
