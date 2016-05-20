/*
 * Shared font loader utilities used in both drawing process and renderer process
 */
var FontLoaderUtil = {};
FontLoaderUtil.loadFontFaces = function (allFaces, callback) {
    var removedFaces = [];
    document.fonts.forEach(function (face) {
        if (face._type) removedFaces.push(face);
    });

    removedFaces.forEach(function (f) {
        document.fonts.delete(f);
    });

    var index = -1;
    function next() {
        index ++;
        if (index >= allFaces.length) {
            if (callback) callback();
            Dom.emitEvent("p:UserFontLoaded", document.documentElement, {});

            return;
        }
        var installedFace = allFaces[index];

        var url = ImageData.filePathToURL(installedFace.filePath);
        var face = new FontFace(installedFace.name, "url(" + url + ")", {weight: installedFace.weight, style: installedFace.style});
        face._type = installedFace.type;

        var addPromise = document.fonts.add(face);
        addPromise.ready.then(function () {
            var fontCSS = installedFace.style + " " + installedFace.weight + " 1em '" + installedFace.name + "'";
            document.fonts.load(fontCSS).then(function () {
                next();
            }, next);
        }, next);
    }

    next();
};
