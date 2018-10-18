function FontLoader() {
    this.userRepo = new FontRepository(Config.getDataFilePath("fonts"), FontRepository.TYPE_USER);
    this.documentRepo = null;
    
    // //TODO: remove this test
    // var face = new FontFace(null, "url(file:///home/dgthanhan/.fonts/Signika-Bold.ttf) format('truetype')");
    // var addPromise = document.fonts.add(face);
    // addPromise.ready.then(function () {
    //     document.fonts.forEach(function (fontFace) {
    //         console.log(fontFace);
    //     });
    //     face.load();
    // });
}
FontLoader.loadSystemFonts = function (callback) {
    FontLoader.systemRepo = new FontRepository(getStaticFilePath("fonts/core"), FontRepository.TYPE_SYSTEM);
    FontLoader.systemRepo.load();
    var systemFaces = FontLoader.systemRepo.faces;
    FontLoaderUtil.loadFontFaces(systemFaces, function () {
        if (callback) callback();
        var data = {
            id: Util.newUUID(),
            faces: systemFaces
        }
        ipcRenderer.once(data.id, function (event, data) {
        });

        ipcRenderer.send("font-loading-request", data);
    });
};
FontLoader.prototype.setDocumentRepoDir = function (dirPath) {
    if (dirPath) {
        this.documentRepo = new FontRepository(dirPath, FontRepository.TYPE_DOCUMENT);
    } else {
        this.documentRepo = null;
    }
};
FontLoader.prototype.loadFonts = function (callback) {
    this.userRepo.load();
    if (this.documentRepo) this.documentRepo.load();

    var allFaces = [].concat(this.userRepo.faces);

    if (this.documentRepo && this.documentRepo.faces.length > 0) {
        for (var face of this.documentRepo.faces) {
            var existed = false;
            for (var f of allFaces) {
                if (face.name == f.name && face.weight == f.weight && face.style == f.style) {
                    existed = true;
                    break;
                }
            }

            if (!existed) allFaces.push(face);
        }
    }

    this.allFaces = allFaces;

    // console.log("All faces to load", allFaces);
    FontLoaderUtil.loadFontFaces(allFaces, function () {
        var data = {
            id: Util.newUUID(),
            faces: allFaces
        }
        ipcRenderer.once(data.id, function (event, data) {
            Dom.emitEvent("p:UserFontLoaded", document.documentElement, {});
            if (callback) callback();
        });

        ipcRenderer.send("font-loading-request", data);

    });
};
FontLoader.prototype.isFontExisting = function (fontName) {
    return this.userRepo.getFont(fontName);
};
FontLoader.prototype.installNewFont = function (data) {
    this.userRepo.addFont(data);
    this.loadFonts();
};
FontLoader.prototype.removeFont = function (font, callback) {
    Dialog.confirm("Are you sure you want to uninstall '" + font.name + "'?", null, "Uninstall", function () {
        ApplicationPane._instance.busy();
        this.userRepo.removeFont(font);
        this.loadFonts(function () {
            if (callback) callback();
            ApplicationPane._instance.unbusy();
        });
    }.bind(this), "Cancel");
};
FontLoader.prototype.setAutoEmbed = function (font, autoEmbed, callback) {
    ApplicationPane._instance.busy();
    this.userRepo.setAutoEmbed(font, autoEmbed);
    this.loadFonts(function () {
        if (callback) callback();
        ApplicationPane._instance.unbusy();
    });
};
FontLoader.prototype.getAllInstalledFonts = function () {
    this.userRepo.load();
    if (this.documentRepo) this.documentRepo.load();

    var fonts = [];
    var fontNames = [];
    
    if (FontLoader.systemRepo.fonts.length > 0) {
        for (var font of FontLoader.systemRepo.fonts) {
            var font = JSON.parse(JSON.stringify(font));
            font._type = FontRepository.TYPE_SYSTEM;
            fonts.push(font);
            fontNames.push(font.name);
        }
    }

    if (this.userRepo.fonts.length > 0) {
        for (var font of this.userRepo.fonts) {
            var font = JSON.parse(JSON.stringify(font));
            font._type = FontRepository.TYPE_USER;
            fonts.push(font);
            fontNames.push(font.name);
        }
    }

    if (this.documentRepo && this.documentRepo.fonts.length > 0) {
        for (var docFont of this.documentRepo.fonts) {
            if (fontNames.indexOf(docFont.name) >= 0) continue;
            fontNames.push(docFont.name);

            var docFont = JSON.parse(JSON.stringify(docFont));
            docFont._type = FontRepository.TYPE_DOCUMENT;
            fonts.push(docFont);
        }
    }

    return fonts;
};
FontLoader.prototype.getUserFonts = function () {
    return this.userRepo.fonts;
}
FontLoader.prototype.embedToDocumentRepo = function (faces) {
    if (!this.documentRepo) {
        var documentRepoDir = path.join(Pencil.controller.tempDir.name, "fonts");
        this.documentRepo = new FontRepository(documentRepoDir, FontRepository.TYPE_DOCUMENT);
    }

    var shouldSave = false;
    faces.forEach(function (f) {
        var font = this.userRepo.getFont(f);
        var userFont = this.documentRepo.getFont(f);
        if (userFont) {
            if (!font.autoEmbed) {
                this.documentRepo.removeFont(userFont);
            }
            return;
        }
        if (!font) return;
        if (!font.autoEmbed) {
            console.log(" > " + f + " is not auto-embeded.");
            return;
        }

        var font = JSON.parse(JSON.stringify(font));
        font.location = null;
        console.log(" >> cloned", font);
        // this.documentRepo.addFont(font, "save");
        this.documentRepo.fonts.push(font);
        this.documentRepo.faces.concat(font.variants);
        shouldSave = true;
    }.bind(this));

    if (shouldSave) this.documentRepo.save();
};
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

FontRepository.TYPE_SYSTEM = "system";
FontRepository.TYPE_USER = "user";
FontRepository.TYPE_DOCUMENT = "document";

FontRepository.prototype.getFont = function (fontName) {
    for(var i in this.fonts) {
        if (this.fonts[i].name == fontName) return this.fonts[i];
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
            var source = node.getAttribute("source") || "";
            var autoEmbed = node.getAttribute("auto-embed") != "false";
            var font = {
                name: fontName,
                location: location,
                source: source,
                autoEmbed: autoEmbed,
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
FontRepository.SUPPORTED_WEIGHTS = [
    {id: "thin", weight: "100", displayName: "Thin", shortName: "T"},
    {id: "ulight", weight: "200", displayName: "Ultra Light", shortName: "UL"},
    {id: "light", weight: "300", displayName: "Light", shortName: "L"},
    {id: "regular", weight: "normal", displayName: "Regular", shortName: "R"},
    {id: "medium", weight: "500", displayName: "Medium", shortName: "M"},
    {id: "sbold", weight: "600", displayName: "Semi Bold", shortName: "SB"},
    {id: "bold", weight: "bold", displayName: "Bold", shortName: "B"},
    {id: "xbold", weight: "800", displayName: "Extra Bold", shortName: "XB"},
    {id: "black", weight: "900", displayName: "Black", shortName: "BL"},
];

FontRepository.SUPPORTED_VARIANTS = {};
FontRepository.WEIGHT_MAP = {};

for (var weight of FontRepository.SUPPORTED_WEIGHTS) {
    FontRepository.SUPPORTED_VARIANTS[weight.id] = {
        weight: weight.weight,
        style: "normal",
        displayName: weight.displayName
    };
    FontRepository.SUPPORTED_VARIANTS[weight.id + "Italic"] = {
        weight: weight.weight,
        style: "italic",
        displayName: weight.displayName + " Italic"
    };

    FontRepository.WEIGHT_MAP[weight.weight] = weight;
}
//@DEPRECATED, this is kept for backward compat only
FontRepository.SUPPORTED_VARIANTS["italic"] = {
    weight: "normal",
    style: "italic",
    displayName: "Regular Italic"
};

FontRepository.findVariantName = function (weight, style) {
    for (var variantName in FontRepository.SUPPORTED_VARIANTS) {
        var spec = FontRepository.SUPPORTED_VARIANTS[variantName];
        if (spec.weight == weight && spec.style == style) return variantName;
    }

    return null;
};

FontRepository.prototype.addFont = function (data) {
    if (!this.loaded) this.load();
    var font = {
        name: data.fontName,
        autoEmbed: typeof(data.autoEmbed) === "boolean" ? data.autoEmbed : false,
        location: null,
        source: data.source || "",
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
    this.loaded = false;
};
FontRepository.prototype.removeFont = function (font) {
    if (!this.loaded) this.load();

    var font = this.getFont(font.name);
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

    var locationPath = path.join(this.dirPath, font.location);
    deleteFileOrFolder(locationPath);

    this.save();
    this.loaded = false;
};
FontRepository.prototype.setAutoEmbed = function (font, autoEmbed) {
    if (!this.loaded) this.load();

    font = this.getFont(font.name);
    if (!font) return;

    font.autoEmbed = autoEmbed;
    this.save();
    this.loaded = false;
};

FontRepository.prototype.save = function () {
    if (!fsExistSync(this.dirPath)) {
        fs.mkdirSync(this.dirPath);
    }

    var thiz = this;

    var registryFilePath = path.join(this.dirPath, "registry.xml");
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
                var location = font.name.replace(/ +/g, "-").replace(/[^a-z0-9\-]+/gi, "");

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
            fontNode.setAttribute("source", font.source || "");
            fontNode.setAttribute("auto-embed", font.autoEmbed);

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
