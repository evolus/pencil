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
/*
 * Identity of a loaded face. The file mtime is part of it because a stencil
 * collection update removes and re-installs its fonts at the same file path
 * with new content. A missing file keeps the old behavior: the face is still
 * registered and its load simply fails.
 */
FontLoaderUtil.faceKey = function (installedFace) {
    var stat = fs.statSync(installedFace.filePath, {throwIfNoEntry: false});
    return [installedFace.name, installedFace.weight, installedFace.style, installedFace.filePath, stat ? stat.mtimeMs : 0].join("|");
};
/*
 * Brings document.fonts in line with allFaces and calls back once every face
 * in allFaces has finished loading. Faces already registered with the same key
 * are kept as they are, so re-running this with an unchanged font set (e.g.
 * opening a document without embedded fonts) costs almost nothing. New faces
 * load in parallel. Callers rely on all faces being loaded before the callback
 * because canvas text layout measures with them.
 */
FontLoaderUtil.loadFontFaces = function (allFaces, callback) {
    var wanted = new Map();
    allFaces.forEach(function (installedFace) {
        wanted.set(FontLoaderUtil.faceKey(installedFace), installedFace);
    });

    var kept = new Map();
    var removedFaces = [];
    document.fonts.forEach(function (face) {
        if (!face._type || face._type == FontRepository.TYPE_SYSTEM) return;
        if (wanted.has(face._key)) {
            kept.set(face._key, face);
        } else {
            removedFaces.push(face);
        }
    });

    removedFaces.forEach(function (f) {
        document.fonts.delete(f);
    });

    var pending = [];
    wanted.forEach(function (installedFace, key) {
        var existing = kept.get(key);
        if (existing) {
            pending.push(existing.loaded);
            return;
        }

        var url = FontLoaderUtil.filePathToURL(installedFace.filePath);
        var face = new FontFace(installedFace.name, "url(" + url + ")", {weight: installedFace.weight, style: installedFace.style});
        face._type = installedFace.type;
        face._key = key;
        document.fonts.add(face);
        pending.push(face.load());
    });

    Promise.allSettled(pending).then(function () {
        if (callback) callback();
    });
};
