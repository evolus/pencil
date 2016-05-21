module.exports = function () {
    const path = require("path");
    const fs = require("fs");

    function buildEmbeddedFontFaceCSS(faces, callback) {
        const MIME_MAP = {
            ".ttf": "application/x-font-ttf",
            ".wotf": "application/x-font-woff"
        };

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
                var url = "data:" + mime + ";base64," + new Buffer(bytes).toString("base64");

                combinedCSS +=  "@font-face {\n"
                                + "    font-family: '" + installedFace.name + "';\n"
                                + "    src: url('" + url + "');\n"
                                + "    font-weight: " + installedFace.weight + ";\n"
                                + "    font-style: " + installedFace.style + ";\n"
                                + "}\n";
                next();
            });
        }

        next();
    };



    return {
        buildEmbeddedFontFaceCSS: buildEmbeddedFontFaceCSS
    }
}();
