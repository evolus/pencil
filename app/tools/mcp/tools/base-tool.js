/**
 * BaseTool - Prototype-based tool foundation for MCP tools.
 */

function BaseTool(name, description, inputSchema) {
    this.name = name || "BaseTool";
    this.description = description || "";
    this.inputSchema = inputSchema || {};
}

BaseTool.prototype.execute = function (args, context) {
    return Promise.reject(new Error("execute() must be implemented by subclass: " + this.name));
};

module.exports = {
    BaseTool: BaseTool
};
