module.exports = function () {
    var child_process = require('child_process');
    var spawn = child_process.spawn;
    var execFile = child_process.execFile;
    var fontCommandRegistry = {
                                "xfce": [{command: "xfconf-query", params: ["-c", "xsettings",  "-p", "/Gtk/FontName"]}],
                                "mate": [{command: "dconf", params: ["read", "/org/mate/desktop/interface/font-name"]}],
                                "cinamon": [{command: "dconf", params: ["read", "/org/cinnamon/desktop/interface/font-name"]},
                                            {command: "gsettings", params: ["get", "org.cinnamon.desktop.interface", "font-name"]}],
                                "gnome": [{command: "gsettings", params: ["get", "org.gnome.desktop.interface", "font-name"]}],
                                "gnome-xorg": [{command: "gsettings", params: ["get", "org.gnome.desktop.interface", "font-name"]}],
                                "ubuntu": [{command: "gsettings", params: ["get", "org.gnome.desktop.interface", "font-name"]}]
                            }

    var defaultFamily = "Sans";
    var defaultWeight = 400;
    var defaultStyle = "normal";
    var defaultSize = "10pt";

    var fontNameReader = function(registry, callback, index) {
        var child = spawn(registry.command, registry.params);
        var tmp = "";
        child.stdout.on("data", function(chunk) {
            tmp += chunk.toString();
        });
        child.stdout.on("close", function() {
            callback(tmp, index);
        });
    };
    var fontProcessor = function(fontName, callback) {
        if (fontName) {
            fontName = fontName.trim();
        }
        var family = defaultFamily;
        var weight = defaultWeight;
        var style = defaultStyle;
        var size = defaultSize;

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
    };

    var platformHandlers = {
        linux: function (callback) {
            var d = process.env.DESKTOP_SESSION;
            if (/ubuntu/ig.exec(d)) {
                d = "ubuntu";
            }
            var fontRegistry = fontCommandRegistry[d];
            if (!fontRegistry) {
                console.error("Coud not found font command registry for ", d);
                callback({
                    family: defaultFamily,
                    weight: defaultWeight,
                    style: defaultStyle,
                    size: defaultSize
                });
            } else {
                var fontNames = [];
                var processFontName = function(finish) {

                    if (finish && fontNames.length == 0) {
                        callback({
                            family: defaultFamily,
                            weight: defaultWeight,
                            style: defaultStyle,
                            size: defaultSize
                        });
                        return;
                    }

                    var fontName = fontNames[0];
                    fontProcessor(fontName, callback);

                }

                for (var i = 0; i < fontRegistry.length; i++) {
                    var registry = fontRegistry[i];
                    fontNameReader(registry, function(fontName, index) {
                        if (fontName != null && fontName.length > 0) {
                            fontNames.push(fontName);
                        }
                        processFontName(index == fontRegistry.length -1);
                    }, i);
                }
            }
        },
        win32: function(callback) {
            var family = "Microsoft Sans Serif",
                size = "9",
                style = "normal",
                weight = "400";

            function returnDefault() {
                callback({
                   family: family,
                   weight: weight,
                   style: style,
                   size: size + "pt"
                });
            }

            //var child = execFile(__dirname + '/lib/fontconfig/fontconfig.exe');
            var child = execFile(__dirname + '/lib/fontconfig/fontconfig.exe', [], (error, stdout, stderr) => {
                if (error) {
                    return returnDefault();
                }

                var data = stdout.trim();
                console.log('System Font:', data);

                // TODO: use default fontsize
                size = 11;

                if (/FontName:\s?(.*)/i.exec(data)) {
                    family = RegExp.$1;
                }
                if (/FontSize:\s?(.*)/i.exec(data)) {
                    size = parseInt(RegExp.$1, 10);
                }
                if (/FontWeight:\s?(.*)/i.exec(data)) {
                    weight = RegExp.$1;
                }
                if (/FontStyle:\s?(.*)/i.exec(data)) {
                    style = RegExp.$1;
                }

                size = 11;

                callback({
                   family: family,
                   weight: weight,
                   style: style,
                   size: (parseInt(size) - 2) + "pt"
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
                family: defaultFamily,
                weight: defaultWeight,
                style: defaultStyle,
                size: defaultSize
            });
            return;
        }

        handler(callback);
    }


    return {
        getDesktopFontConfig: getDesktopFontConfig
    }
}();
