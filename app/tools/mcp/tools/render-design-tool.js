/**
 * Tool: render_design
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Directly invokes ApplicationPane._instance without unnecessary intermediate bridge layers.
 */

var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;

function RenderDesignTool() {
    BaseTool.call(
        this,
        "render_design",
        "Render Pencil design JSON directly on canvas or generate preview image/SVG.",
        {
            content: z.any().describe("Pencil design JSON content object or serialized JSON string."),
            pageTitle: z.string().optional().describe("Optional page title for the rendered design. If not provided, infers dynamically from design.title, design.name, design.pageTitle, design.canvas.title, etc."),
            output: z.enum(["png", "svg"]).optional().default("png").describe("Output format: 'png' (default) or 'svg'."),
            openAsDocument: z.boolean().optional().default(false).describe("If true, opens the design as a live tab in the active Pencil desktop window.")
        }
    );
}
RenderDesignTool.prototype = new BaseTool();

RenderDesignTool.prototype.execute = async function (args, context) {
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

    var content = args.content;
    var output = args.output || "png";
    var openAsDocument = Boolean(args.openAsDocument);

    var json = content;
    if (typeof json === "string") {
        try {
            json = JSON.parse(json);
        } catch (err) {
            throw new Error("Invalid JSON in content: " + err.message);
        }
    }

    if (!json || typeof json !== "object") {
        throw new Error("Design content must be a valid JSON object");
    }

    var pageTitle = args.pageTitle || (json && (json.pageTitle || json.pageName || json.title || json.name || (json.canvas && (json.canvas.pageTitle || json.canvas.pageName || json.canvas.title || json.canvas.name))));
    var useSVG = output === "svg";
    var jsonStr = typeof content === "string" ? content : JSON.stringify(content);
    var result = await appPane.convertDesignJSONToImage(jsonStr, useSVG, openAsDocument, pageTitle);

    if (useSVG) {
        return {
            content: [
                {
                    type: "text",
                    text: String(result)
                }
            ]
        };
    } else {
        var responsePayload = {
            format: "png",
            filePath: result,
            isImage: true,
            openedAsDocument: openAsDocument,
            openedInDocument: openAsDocument
        };
        if (pageTitle) {
            responsePayload.pageTitle = pageTitle;
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(responsePayload, null, 2)
                }
            ]
        };
    }
};

module.exports = {
    RenderDesignTool: RenderDesignTool
};
