(function () {

    const express = require("express");

    const app = express();
    app.use(express.json({ limit: '10mb' })); 

    const RENDER_API = "/json/render"

    app.post(RENDER_API, async (req, res) => {
        let input = req.body;
        let json = input.content;

        if (!json) throw new Error("Expecting JSON content");

        let useSVG = input.output == "svg"
        let result = await ApplicationPane._instance.convertDesignJSONToImage(json, useSVG, input.openAsDocument, input.pageTitle || input.title);
        console.log("To return", result);

        if (useSVG) {
            res.json({
                svg: svg
            });
        } else {
            res.json({
                filePath: result
            });
        }
    });

    app.post("/json/collections/icon-list", async (req, res) => {
        let input = req.body;
        let icons = await ApplicationPane._instance.getIconList(input.iconType);
        console.log("To return", icons);
        res.json({
            icons: icons
        });
    });

    // Mount Model Context Protocol (MCP) Streamable HTTP Server
    try {
        var path = require("path");
        var fs = require("fs");
        var mcpModulePath = path.join(__dirname, "tools/mcp/server.js");
        if (!fs.existsSync(mcpModulePath)) {
            mcpModulePath = path.join(__dirname, "mcp/server.js");
        }
        var mcp = require(mcpModulePath);
        mcp.mountMcpServer(app);
    } catch (mcpErr) {
        console.error("Failed to mount Pencil MCP Server:", mcpErr);
    }

    const PORT = 1919;
    app.listen(PORT, () => {
        console.log(`API HTTP Server running on http://localhost:${PORT}`);
    });

})();