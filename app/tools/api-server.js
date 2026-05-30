(function () {

    const express = require("express");

    const app = express();
    app.use(express.json()); 

    const RENDER_API = "/json/render"

    app.post(RENDER_API, async (req, res) => {
        let input = req.body;
        let json = input.content;

        if (!json) throw new Error("Expecting JSON content");

        let useSVG = input.output == "svg"
        let result = await ApplicationPane._instance.convertDesignJSONToImage(json, useSVG, input.openAsDocument);
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

    const PORT = 1919;
    app.listen(PORT, () => {
        console.log(`API HTTP Server running on http://localhost:${PORT}`);
        console.log(`JSON renderer endpoint: http://localhost:${PORT}${RENDER_API}`);
    });

})();