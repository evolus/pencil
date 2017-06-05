function FontDetailDialog() {
    Dialog.call(this);
    this.title = "Font Detail";

    this.bind("input", this.handleFileInputChange, this.variantBox);
    this.bind("click", this.handleClick, this.variantBox);
}

__extend(Dialog, FontDetailDialog);

FontDetailDialog.prototype.setup = function (options) {
    this.options = options || {};

    this.inputs = {};
    for (var w of FontRepository.SUPPORTED_WEIGHTS) {
        var holder = {};
        var hbox = Dom.newDOMElement({
            _name: "hbox",
            "class": "Variant_" + w.id,
            _children: [
                {
                    _name: "label",
                    _text: FontRepository.SUPPORTED_VARIANTS[w.id].displayName + ":",
                    style: "font-weight: " + w.weight + ";"
                },
                {
                    _name: "input",
                    _id: w.id + "FileInput",
                    type: "text",
                    flex: "1"
                },
                {
                    _name: "button",
                    "class": "BrowseButton",
                    _text: "..."
                },
                {
                    _name: "label",
                    _text: "Italic:",
                    style: "font-weight: " + w.weight + "; font-style: italic;"
                },
                ,
                {
                    _name: "input",
                    _id: w.id + "ItalicFileInput",
                    type: "text",
                    flex: "1"
                },
                {
                    _name: "button",
                    "class": "BrowseButton",
                    _text: "..."
                }
            ]
        }, document, this.inputs);

        this.variantBox.appendChild(hbox);
    }
};
FontDetailDialog.prototype.handleFileInputChange = function (event) {
    var input = event.target;

    if (input.value) {
        input.setAttribute("haspath", "true");
    } else {
        input.removeAttribute("haspath");
    }
};
FontDetailDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        {
            type: "accept", title: "Install",
            run: function () {

                var fontName = this.fontNameInput.value;
                if (!fontName) {
                    Dialog.error("Font name is invalid.", "Please enter a font name.");
                    return;
                }

                if (FontLoader.instance.isFontExisting(fontName)) {
                    Dialog.error("Font name '" + fontName + "' already exists.", "Please enter a new font name.");
                    return;
                }


                var font = {
                    fontName: thiz.fontNameInput.value
                };

                var hasData = false;

                for (var w of FontRepository.SUPPORTED_WEIGHTS) {
                    var input = this.inputs[w.id + "FileInput"];
                    if (input && input._filePath && fs.existsSync(input._filePath)) {
                        font[w.id + "FilePath"] = input._filePath;
                        hasData = true;
                    }

                    input = this.inputs[w.id + "ItalicFileInput"];
                    if (input && input._filePath && fs.existsSync(input._filePath)) {
                        font[w.id + "ItalicFilePath"] = input._filePath;
                        hasData = true;
                    }
                }

                if (!hasData) {
                    Dialog.error("No variant file is valid.", "Please select at least valid variant file.");
                    return;
                }

                FontLoader.instance.installNewFont(font);
                thiz.close(font);

                return false;
            }
        },
        {
            type: "extra", title: "Batch File Select...",
            run: function () {
                dialog.showOpenDialog(remote.getCurrentWindow(), {
                    title: "Select Font Files",
                    defaultPath: Config.get("document.open.recentlyDirPath", null) || os.homedir(),
                    filters: [
                        { name: "Fonts", extensions: ["ttf", "otf", "woff"] }
                    ],
                    properties: ["multiSelections"]
                }, function (filePaths) {
                    if (!filePaths || filePaths.length <= 0) return;
                    Config.set("document.open.recentlyDirPath", path.dirname(filePaths[0]));
                    this.handleMultipleFileSelection(filePaths);
                }.bind(this));
            }
        },
        Dialog.ACTION_CANCEL,
    ]
};
FontDetailDialog.prototype.setPathToInput = function (input, filePath) {
    input._filePath = filePath;
    input.value = filePath ? path.basename(filePath) : "";
    if (input.value) {
        input.setAttribute("haspath", "true");
    } else {
        input.removeAttribute("haspath");
    }
};
FontDetailDialog.prototype.handleClick = function (event) {
    var button = event.target;
    if (!button.className || button.className.indexOf("BrowseButton") < 0) return;

    var input = button.previousSibling;
    dialog.showOpenDialog(remote.getCurrentWindow(), {
        title: "Select Font File",
        defaultPath: input.value || Config.get("document.open.recentlyDirPath", null) || os.homedir(),
        filters: [
            { name: "Fonts", extensions: ["ttf", "otf", "woff"] }
        ]
    }, function (filePaths) {
        if (!filePaths || filePaths.length <= 0) {
            this.setPathToInput(input, "");
        } else {
            Config.set("document.open.recentlyDirPath", path.dirname(filePaths[0]));
            this.setPathToInput(input, filePaths[0]);
        }
    }.bind(this));
};
FontDetailDialog.prototype.handleMultipleFileSelection = function (filePaths) {
    for (var filePath of filePaths) {
        var guessedVariant = this.guessVariantName(filePath);
        console.log(filePath + " -> " + guessedVariant);
        var input = this.inputs[guessedVariant + "FileInput"];
        if (!input) return;
        this.setPathToInput(input, filePath);
    }
};

FontDetailDialog.WEIGHT_NAME_ALIASES = [
    { name: "thin", aliases : ["thin", "hairline"] },
    { name: "ulight", aliases : ["ultralight", "ultra-light", "extralight", "extra-light"] },
    { name: "light", aliases : ["light"] },
    { name: "regular", aliases : ["regular", "normal"] },
    { name: "medium", aliases : ["medium"] },
    { name: "sbold", aliases : ["semibold", "semi-bold"] },
    { name: "xbold", aliases : ["extrabold", "extra-bold", "ultrabold", "ultra-bold"] },
    { name: "bold", aliases : ["bold"] },
    { name: "black", aliases : ["black", "heavy"] }
];
FontDetailDialog.prototype.guessVariantName = function (filePath) {
    var name = path.basename(filePath).toLowerCase();
    var weight = "regular";
    var style = "";

    for (var map of FontDetailDialog.WEIGHT_NAME_ALIASES) {
        var matched = false;
        for (var alias of map.aliases) {
            if (name.indexOf(alias) >= 0) {
                matched = true;
                break;
            }
        }

        if (matched) {
            weight = map.name;
            break;
        }
    }

    if (name.indexOf("italic") >= 0 || name.indexOf("oblique") >= 0) style = "Italic";

    return weight + style;
};
