/*
 * Shared font loader utilities used in both drawing process and renderer process
 */
var FontLoaderUtil = {};
FontLoaderUtil.filePathToURL = function (filePath, options) {
    filePath = path.resolve(filePath).replace(/\\/g, "/");

    if (!filePath.match(/^\/.+$/)) {
        filePath = "/" + filePath;
    }

    return "file://" + encodeURI(filePath);
};
FontLoaderUtil.loadFontFaces = function (allFaces, callback) {
    var removedFaces = [];
    document.fonts.forEach(function (face) {
        if (face._type && face._type != FontRepository.TYPE_SYSTEM) removedFaces.push(face);
    });

    removedFaces.forEach(function (f) {
        document.fonts.delete(f);
    });

    var index = -1;

    function next() {
        index ++;
        if (index >= allFaces.length) {
            if (callback) callback();
            return;
        }

        var installedFace = allFaces[index];
        var url = FontLoaderUtil.filePathToURL(installedFace.filePath);
        var face = new FontFace(installedFace.name, "url(" + url + ")", {weight: installedFace.weight, style: installedFace.style});
        face._type = installedFace.type;

        try {
            document.fonts.add(face);
        } catch (e) {
        }

        face.load().then(function (loadedFace) {
            try {
                document.fonts.add(loadedFace);
            } catch (e) {
            }
            next();
        }).catch(function () {
            next();
        });
    }

    next();
};
