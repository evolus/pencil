/**
 * MCP HTTP Controller
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Implements the official Streamable HTTP transport endpoint (/mcp).
 * Does not implement deprecated legacy SSE routes (/sse, /messages).
 */

var isInitializeRequest = require("@modelcontextprotocol/sdk/types.js").isInitializeRequest;
var defaultLogger = require("../logger.js").defaultLogger;

function McpHttpController(options) {
    options = options || {};
    if (!options.sessionManager) {
        throw new Error("McpSessionManager is required");
    }
    if (!options.serverFactory) {
        throw new Error("serverFactory is required");
    }

    this.sessionManager = options.sessionManager;
    this.serverFactory = options.serverFactory;
    this.logger = options.logger || defaultLogger;
}

McpHttpController.prototype.normalizeAcceptHeader = function () {
    return function (req, res, next) {
        var accept = req.headers["accept"] || "*/*";
        if (accept.indexOf("application/json") === -1) {
            accept += ", application/json";
        }
        if (accept.indexOf("text/event-stream") === -1) {
            accept += ", text/event-stream";
        }
        req.headers["accept"] = accept;
        next();
    };
};

McpHttpController.prototype.handlePost = async function (req, res) {
    var sessionId = req.headers["mcp-session-id"];
    var timer = this.logger.startTimer("MCP POST /mcp", { sessionId: sessionId });

    try {
        var transport;

        if (sessionId) {
            // Scenario 1: Existing session message
            transport = this.sessionManager.getTransport(sessionId);
            if (!transport) {
                this.logger.warn("Session not found or expired", { sessionId: sessionId });
                timer("session_not_found");
                return res.status(404).json({
                    jsonrpc: "2.0",
                    error: {
                        code: -32001,
                        message: "Session not found: " + sessionId
                    },
                    id: null
                });
            }
        } else if (isInitializeRequest(req.body)) {
            // Scenario 2: New stateful initialization handshake
            var clientName = (req.body && req.body.params && req.body.params.clientInfo) ? req.body.params.clientInfo.name : "unknown-client";
            var clientVersion = (req.body && req.body.params && req.body.params.clientInfo) ? req.body.params.clientInfo.version : "unknown-version";
            this.logger.info("Incoming MCP initialization from \"" + clientName + "\" (" + clientVersion + ")");

            transport = await this.sessionManager.createStatefulTransport(this.serverFactory);
        } else {
            // Scenario 3: Stateless single-shot execution
            this.logger.debug("Executing stateless MCP request (no session ID)");
            var statelessResult = await this.sessionManager.createStatelessTransport(this.serverFactory);
            var statelessTransport = statelessResult.transport;
            var statelessServer = statelessResult.server;

            res.on("close", function () {
                statelessTransport.close().catch(function () {});
                statelessServer.close().catch(function () {});
            });

            await statelessTransport.handleRequest(req, res, req.body);
            timer("stateless_completed");
            return;
        }

        await transport.handleRequest(req, res, req.body);
        timer("completed");
    } catch (error) {
        this.logger.error("Error processing MCP POST request:", error, { sessionId: sessionId });
        timer("error", { error: error.message });
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: "2.0",
                error: {
                    code: -32603,
                    message: error.message || "Internal server error"
                },
                id: null
            });
        }
    }
};

McpHttpController.prototype.handleGet = async function (req, res) {
    var sessionId = req.headers["mcp-session-id"];
    var timer = this.logger.startTimer("MCP GET /mcp (SSE stream)", { sessionId: sessionId });

    if (!sessionId) {
        this.logger.warn("GET /mcp rejected: Missing mcp-session-id header");
        timer("missing_session");
        return res.status(400).send("Invalid or missing session ID for SSE connection");
    }

    var transport = this.sessionManager.getTransport(sessionId);
    if (!transport) {
        this.logger.warn("GET /mcp rejected: Session not found", { sessionId: sessionId });
        timer("session_not_found");
        return res.status(404).send("Session not found: " + sessionId);
    }

    try {
        this.logger.info("Opening SSE stream for session " + sessionId);
        await transport.handleRequest(req, res);
        timer("sse_stream_opened");
    } catch (error) {
        this.logger.error("Error opening SSE stream:", error, { sessionId: sessionId });
        timer("error", { error: error.message });
        if (!res.headersSent) {
            res.status(500).send("Error establishing SSE stream");
        }
    }
};

McpHttpController.prototype.handleDelete = async function (req, res) {
    var sessionId = req.headers["mcp-session-id"];
    this.logger.info("Incoming session termination request", { sessionId: sessionId });

    if (!sessionId) {
        return res.status(400).send("Missing mcp-session-id header");
    }

    var transport = this.sessionManager.getTransport(sessionId);
    if (!transport) {
        return res.status(404).send("Session not found: " + sessionId);
    }

    try {
        await transport.handleRequest(req, res);
        await this.sessionManager.closeSession(sessionId);
    } catch (error) {
        this.logger.error("Error handling DELETE request:", error, { sessionId: sessionId });
        if (!res.headersSent) {
            res.status(500).send("Error closing session");
        }
    }
};

McpHttpController.prototype.mount = function (app) {
    var self = this;
    var endpoint = "/mcp";

    // Normalizer middleware
    app.use(endpoint, this.normalizeAcceptHeader());

    // Streamable HTTP routes
    app.post(endpoint, function (req, res) {
        self.handlePost(req, res);
    });
    app.get(endpoint, function (req, res) {
        self.handleGet(req, res);
    });
    app.delete(endpoint, function (req, res) {
        self.handleDelete(req, res);
    });

    this.logger.info("Streamable HTTP MCP Server mounted cleanly at " + endpoint);
};

module.exports = {
    McpHttpController: McpHttpController
};
