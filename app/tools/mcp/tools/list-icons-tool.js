/**
 * Tool: list_icons
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Directly invokes ApplicationPane._instance without unnecessary intermediate bridge layers.
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;

var SUPPORTED_ICON_TYPES = [
    "cmdi",
    "bootstrap",
    "fa",
    "glow",
    "herooutline",
    "herosolid",
    "lucide",
    "mingcute",
    "tablerfilled",
    "tableroutline"
];

function ListIconsTool() {
    BaseTool.call(
        this,
        "list_icons",
        "List available icons from built-in or loaded icon collections.",
        {
            iconType: z.enum(SUPPORTED_ICON_TYPES).optional().default("cmdi").describe("The icon collection identifier. Defaults to cmdi.")
        }
    );
}
ListIconsTool.prototype = new BaseTool();

ListIconsTool.prototype.execute = async function (args, context) {
    var appPane = null;
    if (typeof ApplicationPane !== "undefined" && ApplicationPane._instance) {
        appPane = ApplicationPane._instance;
    } else if (typeof window !== "undefined" && window.ApplicationPane && window.ApplicationPane._instance) {
        appPane = window.ApplicationPane._instance;
    } else if (typeof global !== "undefined" && global.ApplicationPane && global.ApplicationPane._instance) {
        appPane = global.ApplicationPane._instance;
    }

    if (!appPane) {
        throw new Error("ApplicationPane is not available. Please ensure Evolus Pencil desktop application is running.");
    }

    var iconType = args.iconType || "cmdi";
    var icons = await appPane.getIconList(iconType);

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    iconType: iconType,
                    count: Array.isArray(icons) ? icons.length : 0,
                    icons: icons || []
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    ListIconsTool: ListIconsTool,
    SUPPORTED_ICON_TYPES: SUPPORTED_ICON_TYPES
};
