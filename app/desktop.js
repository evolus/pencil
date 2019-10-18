module.exports = function () {
    var defaultFamily = "PencilUI";
    var defaultWeight = 400;
    var defaultStyle = "normal";
    var defaultSize = "11pt";


    function getDesktopFontConfig(callback) {
        FontLoader.loadSystemFonts(function () {
            callback({
                family: defaultFamily,
                weight: defaultWeight,
                style: defaultStyle,
                size: defaultSize
            });
        });
    }


    return {
        getDesktopFontConfig: getDesktopFontConfig
    }
}();
