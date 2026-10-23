/**
 * Evolus Pencil Model Context Protocol (MCP) Server
 *
 * Implements:
 * - Direct in-memory access to ApplicationPane._instance (no redundant bridge layer)
 * - Pure vanilla JavaScript (prototype pattern)
 * - Streamable HTTP transport mounted on /mcp (no legacy SSE /sse or /messages)
 * - Structured logging with execution timings and session tracking
 */

var McpServer = require("@modelcontextprotocol/sdk/server/mcp.js").McpServer;
var defaultLogger = require("./logger.js").defaultLogger;
var McpLogger = require("./logger.js").McpLogger;
var ToolRegistry = require("./tools/tool-registry.js").ToolRegistry;
var ResourceRegistry = require("./resources/resource-registry.js").ResourceRegistry;
var McpSessionManager = require("./transport/session-manager.js").McpSessionManager;
var McpHttpController = require("./transport/http-controller.js").McpHttpController;

var SERVER_NAME = "evolus-pencil";
var SERVER_VERSION = "1.0.0";

/**
 * Factory creating a configured McpServer instance.
 *
 * @param {Object} [options]
 * @returns {McpServer}
 */
function createPencilMcpServer(options) {
    options = options || {};
    var toolRegistry = options.toolRegistry || ToolRegistry.createDefault(options);
    var resourceRegistry = options.resourceRegistry || new ResourceRegistry(options);

    var server = new McpServer({
        name: SERVER_NAME,
        version: SERVER_VERSION
    }, {
        capabilities: {
            tools: { listChanged: true },
            logging: {},
            resources: { listChanged: true }
        }
    });

    toolRegistry.bindToServer(server);
    resourceRegistry.bindToServer(server);
    return server;
}

/**
 * Mounts the MCP Streamable HTTP server on an Express application.
 *
 * @param {import('express').Express} app
 * @param {Object} [options]
 * @returns {Object}
 */
function mountMcpServer(app, options) {
    options = options || {};
    var logger = options.logger || defaultLogger;
    var toolRegistry = options.toolRegistry || ToolRegistry.createDefault(options);
    var resourceRegistry = options.resourceRegistry || new ResourceRegistry(options);
    var sessionManager = new McpSessionManager({ logger: logger });

    var serverFactory = function () {
        return createPencilMcpServer({
            toolRegistry: toolRegistry,
            resourceRegistry: resourceRegistry,
            logger: logger
        });
    };

    var controller = new McpHttpController({
        sessionManager: sessionManager,
        serverFactory: serverFactory,
        logger: logger
    });

    controller.mount(app);

    return {
        controller: controller,
        sessionManager: sessionManager,
        toolRegistry: toolRegistry,
        logger: logger
    };
}

module.exports = {
    SERVER_NAME: SERVER_NAME,
    SERVER_VERSION: SERVER_VERSION,
    createPencilMcpServer: createPencilMcpServer,
    mountMcpServer: mountMcpServer,
    ToolRegistry: ToolRegistry,
    McpSessionManager: McpSessionManager,
    McpHttpController: McpHttpController,
    McpLogger: McpLogger,
    defaultLogger: defaultLogger
};

if (typeof window !== "undefined") {
    window.PencilMcpServer = module.exports;
}
if (typeof global !== "undefined") {
    global.PencilMcpServer = module.exports;
}
