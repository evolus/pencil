/**
 * Tool Registry
 * Manages tool registration, discovery, and binding to McpServer instances.
 * Registers tools grouped across 5 functional catalog modules:
 * - kb-tool.js (Knowledge Base guidance tools)
 * - stencil-tool.js (Stencil collections & icon catalog tools)
 * - document-tool.js (Document inspection, rendering, and export tools)
 * - editing-tool.js (Granular canvas mutation & editing tools)
 * - system-tool.js (Developer diagnostic tools)
 */

var defaultLogger = require("../logger.js").defaultLogger;
var systemTool = require("./system-tool.js");
var kbTool = require("./kb-tool.js");
var stencilTool = require("./stencil-tool.js");
var documentTool = require("./document-tool.js");
var editingTool = require("./editing-tool.js");

var PencilStatusTool = systemTool.PencilStatusTool;
var isDevMode = systemTool.isDevMode;

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

    // 1. Knowledge Base Tools
    registry.register(new kbTool.ListSkillsTool(options));
    registry.register(new kbTool.UseSkillTool(options));
    registry.register(new kbTool.ReadDocumentTool(options));

    // 2. Stencil & Icon Catalog Tools
    registry.register(new stencilTool.ListCollectionsTool());
    registry.register(new stencilTool.GetShapeDefinitionTool());
    registry.register(new stencilTool.ListIconsTool());

    // 3. Document & Canvas Realization Tools
    registry.register(new documentTool.RenderDesignTool());
    registry.register(new documentTool.GetActiveDocumentTool());
    registry.register(new documentTool.GetPageContentTool());
    registry.register(new documentTool.ExportPageTool());

    // 4. Granular Editing Tools
    registry.register(new editingTool.UpdateShapesTool());
    registry.register(new editingTool.DeleteShapesTool());
    registry.register(new editingTool.InsertShapesTool());
    registry.register(new editingTool.SelectShapesTool());

    return registry;
};

module.exports = {
    ToolRegistry: ToolRegistry,
    isDevMode: isDevMode
};
