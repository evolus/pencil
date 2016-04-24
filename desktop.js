module.exports = function () {
    var spawn = require("child_process").spawn;

    var platformHandlers = {
        linux: function (callback) {
            var child = spawn("dconf", [
              "read", "/org/mate/desktop/interface/font-name"
            ]);

            var fontName = "";

            child.stdout.on("data", function(chunk) {
                fontName += chunk.toString();
            });
            child.stdout.on("close", function() {
                console.log("fontName " + fontName);
                var family = "sans-serif";
                var weight = 400;
                var style = "normal";
                var size = "1em";

                fontName = fontName.trim();
                if (fontName.match(/^'(.+)'$/)) fontName = RegExp.$1;

                if (fontName.match(/^(.+) ([0-9]+)$/)) {
                    size = RegExp.$2 + "pt";
                    fontName = RegExp.$1.trim();

                    if (fontName.match(/^(.+) Italic$/i)) {
                        style = "italic";
                        fontName = RegExp.$1.trim();
                    }

                    if (fontName.match(/^(.+) (([a-z]+\-)?(thin|light|bold|black|heavy))$/i)) {
                        var styleName = RegExp.$4.toLowerCase();
                        if (styleName == "thin") weight = "100";
                        if (styleName == "light") weight = "300";
                        if (styleName == "bold") weight = "700";
                        if (styleName == "black" || styleName == "heavy") weight = "900";
                        fontName = RegExp.$1.trim();
                    }

                    family = fontName;
                }

                callback({
                    family: family,
                    weight: weight,
                    style: style,
                    size: size
                });
            });
        },
        darwin: function (callback) {
            callback({
                family: "Helvetica Neue",
                weight: "400",
                style: "normal",
                size: "10pt"
            });
        }
    }

    function getDesktopFontConfig(callback) {
        var platform = process.platform;
        var handler = platformHandlers[platform];
        if (!handler) {
            callback({
                family: "sans-serif",
                weight: "400",
                style: "normal",
                size: "12pt"
            });

            return;
        }

        handler(callback);
    }


    return {
        getDesktopFontConfig: getDesktopFontConfig
    }
}();
