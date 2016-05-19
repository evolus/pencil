function FontLoader() {
    this.userRepo = new FontRepository(Config.getDataFilePath("fonts"), FontRepository.TYPE_USER);
    this.documentRepo = null;
}
FontLoader.prototype.loadFonts = function () {
    this.userRepo.load();
    if (this.documentRepo) this.documentRepo.load();

    var allFaces = [].concat(this.userRepo.faces);
    if (this.documentRepo) allFaces = allFaces.concat(this.documentRepo.faces);

    var removedFaces = [];
    document.fonts.forEach(function (face) {
        if (face._type) removedFaces.push(face);
    });

    removedFaces.forEach(function (f) {
        document.fonts.remove(f);
    });

    allFaces.forEach(function (installedFace) {
        var url = ImageData.filePathToURL(installedFace.filePath);
        var face = new FontFace(installedFace.name, "url(" + url + ") format('truetype')", {weight: installedFace.weight, style: installedFace.style});

        document.fonts.add(face);
    });

    Dom.emitEvent("p:UserFontLoaded", document.documentElement, {});
};
FontLoader.prototype.isFontExisting = function (fontName) {
    return this.userRepo.getFont(fontName);
};
FontLoader.prototype.installNewFont = function (data) {
    this.userRepo.addFont(data);
    this.loadFonts();
};
FontLoader.prototype.removeFont = function (font) {
    Dialog.confirm("Are you sure you want to uninstall this font?", null, "Uninstall", function () {
        this.userRepo.removeFont(font);
        this.loadFonts();
    }.bind(this), "Cancel");
};
FontLoader.prototype.getUserFonts = function () {
    return this.userRepo.fonts;
}
Object.defineProperty(FontLoader, "instance", {
    get: function () {
        if (!FontLoader._instance) {
            FontLoader._instance = new FontLoader();
        }

        return FontLoader._instance;
    }
});

function FontRepository(dirPath, type) {
    this.dirPath = dirPath;
    this.type = type;
    this.faces = [];
    this.fonts = [];
    this.loaded = false;
}

FontRepository.TYPE_USER = "user";
FontRepository.TYPE_DOCUMENT = "document";

FontRepository.prototype.getFont = function (fontName) {
    for(var i in this.font) {
        if (this.font[i].name == fontName) return this.fonts[i];
    }
};
FontRepository.prototype.load = function () {
    var registryFilePath = path.join(this.dirPath, "registry.xml");
    this.faces = [];
    this.fonts = [];
    if (!fsExistSync(registryFilePath)) {
        this.loaded = true;
        return;
    }

    try {
        var dom = Dom.parseFile(registryFilePath);

        var thiz = this;
        Dom.workOn("/p:FontRegistry/p:Font", dom, function (node) {
            var fontName = node.getAttribute("name");
            var location = node.getAttribute("location");
            var font = {
                name: fontName,
                location: location,
                variants: []
            };
            thiz.fonts.push(font);
            Dom.workOn("./p:FontStyle", node, function (styleNode) {
                var weight = styleNode.getAttribute("weight");
                var style = styleNode.getAttribute("style");
                var href = styleNode.getAttribute("href");

                var filePath = path.join(path.join(thiz.dirPath, location), href);

                var face = {
                    name: fontName,
                    weight: styleNode.getAttribute("weight"),
                    style: styleNode.getAttribute("style"),
                    href: styleNode.getAttribute("href"),
                    type: thiz.type,
                    filePath: filePath
                };
                thiz.faces.push(face);
                font.variants.push(face);
            });
        });

        this.loaded = true;
    } catch (e) {
        console.error(e);
    }
};
FontRepository.SUPPORTED_VARIANTS = {
    regular: {weight: "normal", style: "normal"},
    bold: {weight: "bold", style: "normal"},
    italic: {weight: "normal", style: "italic"},
    boldItalic: {weight: "bold", style: "italic"}
};
FontRepository.prototype.addFont = function (data) {
    if (!this.loaded) this.load();
    var font = {
        name: data.fontName,
        location: null,
        variants: []
    };

    for (var variantName in FontRepository.SUPPORTED_VARIANTS) {
        var filePath = data[variantName + "FilePath"];
        if (!filePath) continue;

        var spec = FontRepository.SUPPORTED_VARIANTS[variantName];
        font.variants.push({
            name: data.fontName,
            weight: spec.weight,
            style: spec.style,
            href: null,
            type: this.type,
            filePath: filePath
        });
    }

    this.fonts.push(font);
    this.faces = this.faces.concat(font.variants);
    this.save();
};
FontRepository.prototype.removeFont = function (font) {
    console.log("removeFont:", font);
    if (!this.loaded) this.load();
    var font = this.getFont(font.name);
    console.log("font:", font);
    if (!font) return;
    var index = this.fonts.indexOf(font);
    if (index < 0) return;
    this.fonts.splice(index, 1);

    var newFaces = [];
    for (var i in this.faces) {
        if (this.faces[i].name == font.name) continue;
        newFaces.push(this.faces[i]);
    }
    this.faces = newFaces;

    var locationPath = path.join(thiz.dirPath, font.location);
    deleteFileOrFolder(locationPath);

    this.save();
};
FontRepository.prototype.save = function () {
    if (!fsExistSync(this.dirPath)) {
        fs.mkdirSync(this.dirPath);
    }

    var thiz = this;

    var registryFilePath = path.join(Config.getDataFilePath("fonts"), "registry.xml");
    try {
        var dom = Dom.parser.parseFromString('<FontRegistry xmlns="' + PencilNamespaces.p + '"></FontRegistry>', 'text/xml');

        this.fonts.forEach(function (font) {
            var fontNode = dom.createElementNS(PencilNamespaces.p, "Font");
            dom.documentElement.appendChild(fontNode);

            fontNode.setAttribute("name", font.name);
            var copy = false;
            var locationPath = null;

            if (!font.location) {
                copy = true;
                var location = font.name.replace(/ +/g, "-").replace(/[^a-z0-9\-]+/g, "");

                var index = 0;
                while (fsExistSync(path.join(thiz.dirPath, location))) {
                    index ++;
                    location = location + "_" + index;
                }

                font.location = location;
                locationPath = path.join(thiz.dirPath, location);

                fs.mkdirSync(locationPath);
            }

            fontNode.setAttribute("location", font.location);

            font.variants.forEach(function (variant) {
                var fontStyleNode = dom.createElementNS(PencilNamespaces.p, "FontStyle");
                fontNode.appendChild(fontStyleNode);

                if (copy) {
                    var href = font.location + "-" + variant.weight + "-" + variant.style + path.extname(variant.filePath);
                    var targetFile = path.join(locationPath, href);
                    fs.writeFileSync(targetFile, fs.readFileSync(variant.filePath));
                    variant.href = href;
                    variant.filePath = targetFile;
                }

                fontStyleNode.setAttribute("weight", variant.weight);
                fontStyleNode.setAttribute("style", variant.style);
                fontStyleNode.setAttribute("href", variant.href);
            });
        });

        Dom.serializeNodeToFile(dom, registryFilePath);

    } catch (e) {
        console.error(e);
    }
};
