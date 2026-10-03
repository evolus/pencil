/**
 * Tool: pencil_status
 * Follows classic Pencil prototype pattern (BaseExporter style).
 */

var BaseTool = require("./base-tool.js").BaseTool;

function isDevMode() {
    return typeof process !== "undefined" && Array.isArray(process.argv) && process.argv.indexOf("--enable-dev") >= 0;
}

function PencilStatusTool(options) {
    options = options || {};
    this._devMode = options.devMode;
    BaseTool.call(this, "pencil_status", "[Dev Only] Check status of the Evolus Pencil application and MCP server.", {});
}
PencilStatusTool.prototype = new BaseTool();
PencilStatusTool.prototype.devOnly = true;

PencilStatusTool.prototype.isDevEnabled = function () {
    if (this._devMode !== undefined) {
        return Boolean(this._devMode);
    }
    return isDevMode();
};

PencilStatusTool.prototype.execute = async function (args, context) {
    if (!this.isDevEnabled()) {
        throw new Error("Tool 'pencil_status' is only available when --enable-dev is specified.");
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

module.exports = {
    PencilStatusTool: PencilStatusTool
};
