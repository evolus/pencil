function FontLoader() {

}

FontLoader.loadFonts = function () {
    var pencilFontDir = Config.getDataFilePath("fonts");
    FontLoader.parseRegistryFontFromDir(pencilFontDir, "user");

    Dom.emitEvent("p:UserFontLoaded", document.documentElement, {});
};

FontLoader.parseRegistryFontFromDir = function (dirPath, type) {
    var registryFilePath = path.join(dirPath, "registry.xml");
    try {
        var dom = Dom.parseFile(registryFilePath);

        var faces = [];

        Dom.workOn("/p:FontRegistry/p:Font", dom, function (node) {
            var fontName = node.getAttribute("name");
            var location = node.getAttribute("location");
            Dom.workOn("./p:FontStyle", node, function (styleNode) {
                var weight = styleNode.getAttribute("weight");
                var style = styleNode.getAttribute("style");
                var href = styleNode.getAttribute("href");

                var url = ImageData.filePathToURL(path.join(path.join(dirPath, location), href));

                var face = new FontFace(fontName, "url(" + url + ") format('truetype')", {weight: weight, style: style});
                face._type = type;
                faces.push(face);
            });
        });

        var removedFaces = [];
        document.fonts.forEach(function (face) {
            if (face._type) removedFaces.push(face);
        });

        removedFaces.forEach(function (f) {
            document.fonts.remove(f);
        });

        faces.forEach(function (installedFace) {
            console.log("Installing font", installedFace);
            document.fonts.add(installedFace);
        });

    } catch (e) {

    }
};
