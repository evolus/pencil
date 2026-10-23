/**
 * System & Diagnostic Tools Module
 * Defines and exports developer diagnostic tools:
 * - pencil_status: Checks runtime status of Evolus Pencil application and MCP server (--enable-dev)
 */

var BaseTool = require("./base-tool.js").BaseTool;

function isDevMode() {
    return typeof process !== "undefined" && Array.isArray(process.argv) && process.argv.indexOf("--enable-dev") >= 0;
}

function GetPencilStatusTool(options) {
    options = options || {};
    this._devMode = options.devMode;
    var toolName = options.name || "get_pencil_status";
    BaseTool.call(this, toolName, "[Dev Only] Checks runtime status of the Evolus Pencil application and MCP server.", {});
}
GetPencilStatusTool.prototype = new BaseTool();
GetPencilStatusTool.prototype.devOnly = true;

GetPencilStatusTool.prototype.isDevEnabled = function () {
    if (this._devMode !== undefined) {
        return Boolean(this._devMode);
    }
    return isDevMode();
};

GetPencilStatusTool.prototype.execute = async function (args, context) {
    if (!this.isDevEnabled()) {
        throw new Error("Tool '" + this.name + "' is only available when --enable-dev is specified.");
    }

    var appPane = null;
    if (typeof ApplicationPane !== "undefined" && ApplicationPane._instance) {
        appPane = ApplicationPane._instance;
    } else if (typeof window !== "undefined" && window.ApplicationPane && window.ApplicationPane._instance) {
        appPane = window.ApplicationPane._instance;
    } else if (typeof global !== "undefined" && global.ApplicationPane && global.ApplicationPane._instance) {
        appPane = global.ApplicationPane._instance;
    }

    var hasApp = !!appPane;
    var docName = (hasApp && appPane.currentDocument) ? appPane.currentDocument.name : null;
    var pageName = (hasApp && appPane.activePage) ? appPane.activePage.name : null;

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    status: "ok",
                    server: "evolus-pencil",
                    version: "1.0.0",
                    devMode: true,
                    hasApplicationPane: hasApp,
                    activeDocument: docName,
                    activePage: pageName,
                    timestamp: new Date().toISOString()
                }, null, 2)
            }
        ]
    };
};

function PencilStatusTool(options) {
    options = options || {};
    options.name = "pencil_status";
    GetPencilStatusTool.call(this, options);
}
PencilStatusTool.prototype = Object.create(GetPencilStatusTool.prototype);
PencilStatusTool.prototype.constructor = PencilStatusTool;

module.exports = {
    GetPencilStatusTool: GetPencilStatusTool,
    PencilStatusTool: PencilStatusTool,
    isDevMode: isDevMode
};
