/**
 * MCP Session Manager
 * Manages active Streamable HTTP transports, stateful sessions, and lifecycle events.
 */

var randomUUID = require("crypto").randomUUID;
var StreamableHTTPServerTransport = require("@modelcontextprotocol/sdk/server/streamableHttp.js").StreamableHTTPServerTransport;
var defaultLogger = require("../logger.js").defaultLogger;

function McpSessionManager(options) {
    options = options || {};
    this.logger = options.logger || defaultLogger;
    this._transports = {};
}

McpSessionManager.prototype.getTransport = function (sessionId) {
    if (!sessionId) return null;
    return this._transports[sessionId] || null;
};

McpSessionManager.prototype.hasTransport = function (sessionId) {
    return Boolean(sessionId && this._transports[sessionId]);
};

McpSessionManager.prototype.createStatefulTransport = async function (serverFactory) {
    var self = this;
    var transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: function () {
            return randomUUID();
        },
        enableJsonResponse: true,
        onsessioninitialized: function (sid) {
            self._transports[sid] = transport;
            self.logger.info("Session initialized", {
                sessionId: sid,
                activeSessions: self.getActiveCount()
            });
        }
    });

    transport.onclose = function () {
        var sid = transport.sessionId;
        if (sid && self._transports[sid]) {
            delete self._transports[sid];
            self.logger.info("Session closed and removed from registry", {
                sessionId: sid,
                activeSessions: self.getActiveCount()
            });
        }
    };

    var server = serverFactory();
    await server.connect(transport);
    return transport;
};

McpSessionManager.prototype.createStatelessTransport = async function (serverFactory) {
    var transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    var server = serverFactory();
    await server.connect(transport);
    return {
        transport: transport,
        server: server
    };
};

McpSessionManager.prototype.closeSession = async function (sessionId) {
    var transport = this.getTransport(sessionId);
    if (transport) {
        this.logger.info("Explicitly closing session", { sessionId: sessionId });
        delete this._transports[sessionId];
        try {
            await transport.close();
        } catch (err) {
            this.logger.warn("Error during transport close: " + err.message, { sessionId: sessionId });
        }
    }
};

McpSessionManager.prototype.getActiveCount = function () {
    var count = 0;
    for (var k in this._transports) {
        if (this._transports.hasOwnProperty(k)) {
            count++;
        }
    }
    return count;
};

module.exports = {
    McpSessionManager: McpSessionManager
};
