module.exports = function () {
    const path = require("path");
    const fs = require("fs");

    const MIME_MAP = {
        ".ttf": "application/x-font-ttf",
        ".wotf": "application/x-font-woff",
        ".wotf2": "application/x-font-woff2"
    };
    const FORMAT_MAP = {
        ".ttf": "truetype",
        ".wotf": "woff",
        ".wotf2": "woff2"
    };

    function filePathToURL(filePath, options) {
        filePath = path.resolve(filePath).replace(/\\/g, "/");

        if (!filePath.match(/^\/.+$/)) {
            filePath = "/" + filePath;
        }

        return "file://" + encodeURI(filePath);
    };

    function buildEmbeddedFontFaceCSS(faces, callback) {
        //creating combinedCSS
        var combinedCSS = "";
        if (!faces) {
            callback(combinedCSS)
            return;
        }

        var index = -1;
        function next() {
            index ++;
            if (index >= faces.length) {
                callback(combinedCSS);

                return;
            }

            var installedFace = faces[index];

            fs.readFile(installedFace.filePath, function (error, bytes) {
                var ext = path.extname(installedFace.filePath).toLowerCase();
                var mime = MIME_MAP[ext];
                if (!mime) {
                    mime = "application/octet-stream";
                }
                var format = FORMAT_MAP[ext];
                if (!format) format = "truetype";

                var url = "data:" + mime + ";base64," + new Buffer(bytes).toString("base64");

                combinedCSS +=  "@font-face {\n"
                                + "    font-family: '" + installedFace.name + "';\n"
                                + "    src: url('" + url + "') format('" + format + "');\n"
                                + "    font-weight: " + installedFace.weight + ";\n"
                                + "    font-style: " + installedFace.style + ";\n"
                                + "}\n";
                next();
            });
        }

        next();
    };

    function buildFontFaceCSS(faces) {
        if (!faces) return "";

        var combinedCSS = "";
        for (var installedFace of faces) {
            var ext = path.extname(installedFace.filePath).toLowerCase();
            var format = FORMAT_MAP[ext];
            if (!format) format = "truetype";

            var url = filePathToURL(installedFace.filePath);

            combinedCSS +=  "@font-face {\n"
                            + "    font-family: '" + installedFace.name + "';\n"
                            + "    src: url('" + url + "') format('" + format + "');\n"
                            + "    font-weight: " + installedFace.weight + ";\n"
                            + "    font-style: " + installedFace.style + ";\n"
                            + "}\n";
        }

        return combinedCSS;
    };


    return {
        buildEmbeddedFontFaceCSS: buildEmbeddedFontFaceCSS,
        buildFontFaceCSS: buildFontFaceCSS,
        filePathToURL: filePathToURL
    }
}();
