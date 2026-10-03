/**
 * Tool Registry
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Manages tool registration, discovery, and binding to McpServer instances.
 */

var defaultLogger = require("../logger.js").defaultLogger;
var PencilStatusTool = require("./status-tool.js").PencilStatusTool;
var ListSkillsTool = require("./list-skills-tool.js").ListSkillsTool;
var UseSkillTool = require("./use-skill-tool.js").UseSkillTool;
var ReadDocumentTool = require("./read-document-tool.js").ReadDocumentTool;
var ListCollectionsTool = require("./list-collections-tool.js").ListCollectionsTool;
var GetShapeDefinitionTool = require("./get-shape-definition-tool.js").GetShapeDefinitionTool;
var RenderDesignTool = require("./render-design-tool.js").RenderDesignTool;
var GetActiveDocumentTool = require("./get-active-document-tool.js").GetActiveDocumentTool;
var GetPageContentTool = require("./get-page-content-tool.js").GetPageContentTool;
var ExportPageTool = require("./export-page-tool.js").ExportPageTool;
var ListIconsTool = require("./list-icons-tool.js").ListIconsTool;

/**
 * Checks whether --enable-dev flag was passed on the command line.
 */
function isDevMode() {
    return typeof process !== "undefined" && Array.isArray(process.argv) && process.argv.indexOf("--enable-dev") >= 0;
}

function ToolRegistry(options) {
    options = options || {};
    this.logger = options.logger || defaultLogger;
    this._tools = {};
}

ToolRegistry.prototype.register = function (tool) {
    if (!tool || !tool.name) {
        throw new Error("Invalid tool: Must have a name property");
    }
    this._tools[tool.name] = tool;
    this.logger.debug("Registered tool in registry: " + tool.name);
    return this;
};

ToolRegistry.prototype.get = function (name) {
    return this._tools[name] || null;
};

ToolRegistry.prototype.getAll = function () {
    var list = [];
    for (var k in this._tools) {
        if (this._tools.hasOwnProperty(k)) {
            list.push(this._tools[k]);
        }
    }
    return list;
};

ToolRegistry.prototype.bindToServer = function (mcpServer) {
    var self = this;
    var allTools = this.getAll();

    for (var i = 0; i < allTools.length; i++) {
        (function (tool) {
            mcpServer.registerTool(
                tool.name,
                {
                    description: tool.description,
                    inputSchema: tool.inputSchema
                },
                async function (args, extra) {
                    var timer = self.logger.startTimer("Tool \"" + tool.name + "\"", {
                        sessionId: extra ? extra.sessionId : undefined
                    });

                    try {
                        var context = {
                            logger: self.logger,
                            extra: extra
                        };
                        var result = await tool.execute(args, context);
                        timer("success");
                        return result;
                    } catch (err) {
                        timer("failed", { error: err.message });
                        self.logger.error("Error executing tool \"" + tool.name + "\":", err, {
                            args: args,
                            sessionId: extra ? extra.sessionId : undefined
                        });
                        throw err;
                    }
                }
            );
        })(allTools[i]);
    }
};

ToolRegistry.createDefault = function (options) {
    options = options || {};
    var registry = new ToolRegistry(options);

    // Dev-only tools: only registered when Pencil is running with --enable-dev or PENCIL_ENV=development
    var devModeActive = options.devMode !== undefined ? Boolean(options.devMode) : isDevMode();
    if (devModeActive) {
        registry.register(new PencilStatusTool({ devMode: devModeActive }));
        if (options.logger) {
            options.logger.debug("Dev mode active: Registered developer diagnostic tool 'pencil_status'");
        }
    }

    // Standard production tools: Knowledge Base & Execution
    registry.register(new ListSkillsTool(options));
    registry.register(new UseSkillTool(options));
    registry.register(new ReadDocumentTool(options));
    registry.register(new ListCollectionsTool());
    registry.register(new GetShapeDefinitionTool());
    registry.register(new RenderDesignTool());
    registry.register(new GetActiveDocumentTool());
    registry.register(new GetPageContentTool());
    registry.register(new ExportPageTool());
    registry.register(new ListIconsTool());

    return registry;
};

module.exports = {
    ToolRegistry: ToolRegistry,
    isDevMode: isDevMode
};
