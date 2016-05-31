function StencilGeneratorDialog() {
    WizardDialog.call(this);
    this.title = "Stencil Generator";
    this.collectionDefinition = this.wizardPanes[0];
    this.stencilDefinition = this.wizardPanes[1];
    this.stencils = [];
    this.activeStencil;
    var thiz = this;
    this.bind("click", thiz.browseIconFile, this.collectionBrowse);
    this.bind("click", thiz.browseIconFile, this.stencilBrowse);
    this.imagePaths = [];
    this.activeImageNode = null;
    var addItem = function (file) {
        var item = Dom.newDOMElement({
            _name: "li",
            _text: file.name,
        });
        item._path = file.path;
        file._ext = Util.getFileExtension(file.name);
        var Name = file.name.substring(0, file.name.indexOf("."));
        Name = Name.replace(/ /gi, "%");
        file._label = Name;

        thiz.imageList.appendChild(item);
        thiz.imagePaths.push(file);
    }
    this.bind("click", function (event) {
        var top = Dom.findUpwardForNodeWithData(event.target, "_path");
        if (!top) {
            return;
        }
        if (thiz.activeImageNode) {
            thiz.activeImageNode.removeAttribute("active");
        }
        top.setAttribute("active", "true");
        this.activeImageNode = top;
    }, this.imageList)
    var imgCount = 0;
    Dom.registerEvent(this.imageSelector, "drop", function (event) {
        var files = event.dataTransfer.files;
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var dblFiles = false;
                var index = event.dataTransfer.files[i].type.indexOf("image");
                for (var j = 0; j < thiz.imagePaths.length; j++) {
                    if (files[i].path == thiz.imagePaths[j].path){
                        dblFiles = true;
                        break;
                    }
                }
                if (index < 0 || dblFiles == true) continue;
                addItem(event.dataTransfer.files[i]);
            }
        }
        thiz.imageCount.innerHTML = thiz.imagePaths.length + " image found";
    }, false);

    this.bind("change", function (event) {
        if (event.target.tagName == "input") {
            var value = event.target.checked;
            var top = Dom.findUpwardForNodeWithData(event.target, "_item");
            var item = top._item;
            item.checked = value;
        }
    }, this.selectedStencil);

    var stencilNameNode ;

    this.bind("click", function (event) {
        var top = Dom.findUpwardForNodeWithData(event.target, "_item");
        if (top && top._item) {
            var item = top._item;
            thiz.stencilName.value = item._stencil.label;
            thiz.activeStencil = item;
            for (var i = 0; i < top.childNodes.length; i++) {
                if (top.childNodes[i].className == "stencilName") {
                     stencilNameNode = top.childNodes[i];
                }
            }
        }
    }, this.selectedStencil);

    this.bind("change", function (event) {
        var index = thiz.imagePaths.indexOf(this.activeStencil);
        if (thiz.imagePaths[index]) {
            thiz.imagePaths[index]._stencil.label = thiz.stencilName.value;
            stencilNameNode.innerHTML = thiz.stencilName.value;
        }
    }, this.stencilName);
}

__extend(WizardDialog, StencilGeneratorDialog);

StencilGeneratorDialog.prototype.invalidateFinish = function () {
    for (var i in thiz.imagePaths) {
        if (this.imagePaths[i].checked)
        this.stencils.push(this.imagePaths[i]._stencil);
    }
    if (this.stencils.length == 0) {
        Dialog.alert("Selected item is invalid! Please select at least one item on list above...",null);
        return false;
    }
    return true;
};

StencilGeneratorDialog.prototype.onFinish = function () {
    this.createCollection();
};
StencilGeneratorDialog.prototype.invalidateSelection = function () {
    if (this.activePane == this.collectionDefinition) {
        if (this.collectionName.value == "") {
            Dialog.error("Invalid Collection Name", "Please enter the valid page name.", null);
            return false;
        }
        if (this.imageList.children.length == 0 ) {
            Dialog.error("Invalid Select Items", "Please drag items to listbox.", null);
            return false;
        }
    }
    return true;
};

StencilGeneratorDialog.prototype.browseIconFile = function () {
    var thiz = this;
    dialog.showOpenDialog({
        title: "Open Icon File",
        defaultPath: os.homedir(),
        filters: [
            { name: "Icon File", extensions: ["icon", "png"] }
        ]
    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        if (this.activePane == this.collectionDefinition) {
            return;
        }
    });
}

StencilGeneratorDialog.prototype.onSelectionChanged = function () {
    if (this.activePane == this.collectionDefinition) {
        this.stepTitle.innerHTML = "Wellcome to the Stencil Generator";
        this.stepInfo.innerHTML = "Enter collection information and click Next to continue";
    } else {
        this.stepTitle.innerHTML = "Completing the Stencil Generator";
        this.stepInfo.innerHTML = "Stencil information";

        if (this.imagePaths.length > 0) {
            this.initStencils();
        }
    }
};

StencilGeneratorDialog.prototype.initStencils = function () {
    var thiz = this;
    this.preloadStencils(function (stencils, listener) {
        for (i in thiz.imagePaths) {
            thiz.imagePaths[i]._stencil = stencils[i];
            if (thiz.imagePaths[i].checked != null) {
                continue;
            }
            thiz.imagePaths[i].checked = true;
            var holder = {};
            var item = Dom.newDOMElement({
                _name: "div",
                class: "ImageItem",
                _children: [
                    {
                        _name: "div",
                        class: "IconContainer",
                        _children: [
                            {
                                _name: "img",
                                _id: "iconImage",
                                "title": thiz.imagePaths[i]._stencil.label
                            }
                        ]
                    },
                    {
                        _name: "span",
                        class: "stencilName",
                        _text: thiz.imagePaths[i]._stencil.label,
                        "title": thiz.imagePaths[i]._stencil.label
                    },
                    {
                        _name: "input",
                        type: "checkbox",
                        checked: "true",
                    }
                ]
            }, null, holder);
            item._item = thiz.imagePaths[i];
            thiz.selectedStencil.appendChild(item);
            Util.setupImage(holder.iconImage, thiz.imagePaths[i].path, "center-inside");
        }
        if (listener) listener.onTaskDone();
    });
};

StencilGeneratorDialog.prototype.preloadStencils = function (callback) {
    var thiz = this;
    var result = [];
    var stencils = [];

    for (var i = 0; i < this.imagePaths.length; i++) {
        var image = this.imagePaths[i];
        stencils.push(image);
    }

    var starter = function (listener) {
        thiz.loadStencil(result, stencils, 0, callback, listener);
    }
    var processDialog = new ProgressiveJobDialog();
    processDialog.open({
        starter: starter
    });
};

StencilGeneratorDialog.prototype.getImageFileData = function (path, onDone) {
    onDone(fs.readFileSync(path));
};

StencilGeneratorDialog.prototype.loadStencil = function (result, stencils, index, callback, listener) {
    thiz = this;
    try {
        if (index < stencils.length) {
            if ("png|jpg|gif|bmp".indexOf(stencils[index]._ext) != -1) {
                var img = new Image();

                img._stencils = stencils;
                img._result = result;
                img._index = index;

                img.onload = function () {
                    var _index = img._index;
                    var _stencils = img._stencils;
                    var _result = img._result;
                    var box = {
                        width: img.naturalWidth,
                        height: img.naturalHeight
                    };
                    try {
                        var readOnDone = function (fileData) {
                            //var data = Base64.encode(fileData, true);
                            var data = new Buffer(fileData).toString("base64");
                            var st = {
                                id: "img_" + _index,
                                label: _stencils[_index]._label,
                                type: _stencils[_index]._ext.toUpperCase(),
                                img: _stencils[_index],
                                iconData: "data:image/png;base64," + data,
                                data: data,
                                box: box
                            };
                            _result = _result.concat(st);
                            if (_index + 1 >= _stencils.length) {
                                callback(_result, listener);
                            } else {
                                thiz.loadStencil(_result, _stencils, _index + 1, callback, listener);
                            }
                        }
                        window.setTimeout(function () {
                            thiz.getImageFileData(_stencils[_index].path, readOnDone);
                        }, 10);
                    } catch(e) {
                        Console.dumpError(e);
                    }
                };
                listener.onProgressUpdated(null, index, stencils.length);
                img.src = stencils[index].path;
            }
        }
    } catch(e) {
         Console.dumpError(e);
    }
};

StencilGeneratorDialog.prototype.generateId = function (s) {
    if (s) {
        return s.replace(new RegExp('[^0-9a-zA-Z\\-]+', 'g'), "_");
    }
    return "";
};
StencilGeneratorDialog.prototype.createCollection = function () {
    var thiz = this;

    dialog.showSaveDialog({
        title: "Save as",
        defaultPath: os.homedir(),
        filters: [
            { name: "Stencil file", extensions: ["zip"] }
        ]
    }, function (filePath) {
        if (!filePath) return;
        var starter = function (listener) {
            try {
                var s = "<Shapes xmlns=\"http://www.evolus.vn/Namespace/Pencil\" \n" +
                        "		xmlns:p=\"http://www.evolus.vn/Namespace/Pencil\" \n" +
                        "		xmlns:svg=\"http://www.w3.org/2000/svg\" \n" +
                        "		xmlns:xlink=\"http://www.w3.org/1999/xlink\" \n" +
                        "		id=\"" + thiz.generateId(thiz.collectionName.value) + ".Icons\" \n" +
                        "		displayName=\"" + thiz.collectionName.value + "\" \n" +
                        "		description=\"" + thiz.collectionDescription.value + "\" \n" +
                        "		author=\"" + thiz.collectionAuthor.value + "\" \n" +
                        "		url=\"" + thiz.collectionInfoUrl.value + "\">\n\n";

                var totalStep = thiz.stencils.length;
                var index = -1;
                var run = function () {
                    try {
                        index++;
                        if (index >= thiz.stencils.length) {
                            s += "</Shapes>";

                            try {
                                var tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true });

                                var file = fs.createWriteStream(tempDir.name + "/" + "Definition.xml");

                                fs.writeFile(file.path, s, (err) => {
                                    if (err) throw err;
                                    var iconFolder = fs.mkdirSync(tempDir.name + "/" + "icon");

                                    var archiver = require("archiver");
                                    var archive = archiver("zip");
                                    var output = fs.createWriteStream(filePath);
                                    archive.pipe(output);
                                    archive.directory(tempDir.name, "/", {});
                                    archive.finalize();
                                });
                            } catch (e5) {
                                console.log(e5);
                                listener.onTaskDone();
                                return false;
                            }
                            Util.info(Util.getMessage("stencil.generator.title"), Util.getMessage("collection.has.been.created", thiz.collectionName.value));
                            listener.onTaskDone();
                            return true;
                        }
                        console.log("stencilCreated " + index + ": " + thiz.stencils[index]);
                        if (thiz.stencils[index].box.width > 0 && thiz.stencils[index].box.height > 0) {
                            var shape = thiz.buildShape(thiz.stencils[index]);
                            s += shape;
                            listener.onProgressUpdated(Util.getMessage("sg.creating.stencils.1"), index, totalStep);
                        }
                        window.setTimeout(run, 10);

                    } catch (e2) {
                        console.log(e2, "stdout");
                    }
                };

                run();
            } catch (e3) {
                listener.onTaskDone();
                console.log(e3, "stdout");
            }
        }

        var processDialog = new ProgressiveJobDialog();
        processDialog.open({
            starter: starter
        });
    });
};

StencilGeneratorDialog.prototype.buildShape = function (shapeDef) {
    if (shapeDef.type != "SVG") {
        return (
            "<Shape id=\"" + shapeDef.id + "\" displayName=\"" + shapeDef.label + "\" icon=\"" + shapeDef.iconData + "\">\n" +
            "        <Properties>\n" +
            "            <PropertyGroup>\n" +
            "                <Property name=\"box\" type=\"Dimension\" p:lockRatio=\"true\">" + shapeDef.box.width + "," + shapeDef.box.height + "</Property>\n" +
            "                <Property name=\"imageData\" type=\"ImageData\"><![CDATA[" + shapeDef.box.width + "," + shapeDef.box.height + ",data:image/png;base64," + shapeDef.data + "]]></Property>\n" +
            "                <Property name=\"withBlur\" type=\"Bool\" displayName=\"With Shadow\">false</Property>\n" +
            "            </PropertyGroup>\n" +
            "            <PropertyGroup name=\"Background\">\n" +
            "                <Property name=\"fillColor\" displayName=\"Background Color\" type=\"Color\">#ffffff00</Property>\n" +
            "                <Property name=\"strokeColor\" displayName=\"Border Color\" type=\"Color\">#000000ff</Property>\n" +
            "                <Property name=\"strokeStyle\" displayName=\"Border Style\" type=\"StrokeStyle\">0|</Property>\n" +
            "            </PropertyGroup>\n" +
            "        </Properties>\n" +
            "        <Behaviors>\n" +
            "            <For ref=\"imageContainer\">\n" +
            "                <Scale>\n" +
            "                    <Arg>$box.w / $imageData.w</Arg>\n" +
            "                    <Arg>$box.h / $imageData.h</Arg>\n" +
            "                </Scale>\n" +
            "            </For>\n" +
            "            <For ref=\"bgRect\">\n" +
            "                <Box>$box.narrowed(0 - $strokeStyle.w)</Box>\n" +
            "                <StrokeColor>$strokeColor</StrokeColor>\n" +
            "                <StrokeStyle>$strokeStyle</StrokeStyle>\n" +
            "                <Fill>$fillColor</Fill>\n" +
            "                <Transform>\"translate(\" + [0 - $strokeStyle.w / 2, 0 - $strokeStyle.w / 2] + \")\"</Transform>\n" +
            "            </For>\n" +
            "            <For ref=\"image\">\n" +
            "                <Image>$imageData</Image>\n" +
            "            </For>\n" +
            "            <For ref=\"bgCopy\">\n" +
            "                <ApplyFilter>$withBlur</ApplyFilter>\n" +
            "                <Visibility>$withBlur</Visibility>\n" +
            "            </For>\n" +
            "        </Behaviors>\n" +
            "        <Actions>\n" +
            "            <Action id=\"toOriginalSize\" displayName=\"To Original Size\">\n" +
            "                <Impl>\n" +
            "                    <![CDATA[\n" +
            "                        var data = this.getProperty(\"imageData\");\n" +
            "                        this.setProperty(\"box\", new Dimension(data.w, data.h));\n" +
            "                    ]]>\n" +
            "                    </Impl>\n" +
            "            </Action>\n" +
            "            <Action id=\"fixRatioW\" displayName=\"Correct Ratio by Width\">\n" +
            "                <Impl>\n" +
            "                    <![CDATA[\n" +
            "                        var data = this.getProperty(\"imageData\");\n" +
            "                        var box = this.getProperty(\"box\");\n" +
            "                        var h = Math.round(box.w * data.h / data.w);\n" +
            "                        this.setProperty(\"box\", new Dimension(box.w, h));\n" +
            "                    ]]>\n" +
            "                    </Impl>\n" +
            "            </Action>\n" +
            "            <Action id=\"fixRatioH\" displayName=\"Correct Ratio by Height\">\n" +
            "                <Impl>\n" +
            "                    <![CDATA[\n" +
            "                        var data = this.getProperty(\"imageData\");\n" +
            "                        var box = this.getProperty(\"box\");\n" +
            "                        var w = Math.round(box.h * data.w / data.h);\n" +
            "                        this.setProperty(\"box\", new Dimension(w, box.h));\n" +
            "                    ]]>\n" +
            "                    </Impl>\n" +
            "            </Action>\n" +
            "            <Action id=\"selectExternalFile\" displayName=\"Load Linked Image...\">\n" +
            "                <Impl>\n" +
            "                    <![CDATA[\n" +
            "                        var thiz = this;\n" +
            "                        ImageData.prompt(function(data) {\n" +
            "                            if (!data) return;\n" +
            "                            thiz.setProperty(\"imageData\", data);\n" +
            "                            thiz.setProperty(\"box\", new Dimension(data.w, data.h));\n" +
            "                            if (data.data.match(/\\.png$/)) {\n" +
            "                                thiz.setProperty(\"fillColor\", Color.fromString(\"#ffffff00\"));\n" +
            "                            }\n" +
            "                        });\n" +
            "                    ]]>\n" +
            "                    </Impl>\n" +
            "            </Action>\n" +
            "            <Action id=\"selectExternalFileEmbedded\" displayName=\"Load Embedded Image...\">\n" +
            "                <Impl>\n" +
            "                    <![CDATA[\n" +
            "                        var thiz = this;\n" +
            "                        ImageData.prompt(function(data) {\n" +
            "                            if (!data) return;\n" +
            "                            thiz.setProperty(\"imageData\", data);\n" +
            "                            thiz.setProperty(\"box\", new Dimension(data.w, data.h));\n" +
            "                            if (data.data.match(/\\.png$/)) {\n" +
            "                                thiz.setProperty(\"fillColor\", Color.fromString(\"#ffffff00\"));\n" +
            "                            }\n" +
            "                        }, \"embedded\");\n" +
            "                    ]]>\n" +
            "                    </Impl>\n" +
            "            </Action>\n" +
            "        </Actions>\n" +
            "        <p:Content xmlns:p=\"http://www.evolus.vn/Namespace/Pencil\" xmlns=\"http://www.w3.org/2000/svg\">\n" +
            "            <defs>\n" +
            "                <filter id=\"imageShading\" height=\"1.2558399\" y=\"-0.12792\" width=\"1.06396\" x=\"-0.03198\">\n" +
            "                    <feGaussianBlur stdDeviation=\"1.3325\" in=\"SourceAlpha\"/>\n" +
            "                </filter>\n" +
            "                <g id=\"container\">\n" +
            "                    <rect id=\"bgRect\" style=\"fill: none; stroke: none;\"/>\n" +
            "                    <g id=\"imageContainer\">\n" +
            "                        <image id=\"image\" x=\"0\" y=\"0\" rx=\"" + shapeDef.box.width + "\" ry=\"" + shapeDef.box.height + "\"/>\n" +
            "                    </g>\n" +
            "                </g>\n" +
            "            </defs>\n" +
            "            <use xlink:href=\"#container\" id=\"bgCopy\" transform=\"translate(1, 1)\" p:filter=\"url(#imageShading)\" style=\" opacity:0.6;\"/>\n" +
            "            <use xlink:href=\"#container\"/>\n" +
            "        </p:Content>\n" +
            "    </Shape>");
    } else {
        /*
        var shortcut = Dom.newDOMElement({
            _name: "Shortcut",
            _uri: "http://www.evolus.vn/Namespace/Pencil",
            displayName: shapeDef.label,
            to: "Evolus.Common:SVGImage",
            icon: shapeDef.iconData,
            _children: [
                {
                    _name: "PropertyValue",
                    _uri: "http://www.evolus.vn/Namespace/Pencil",
                    name: "originalDim",
                    _text: (shapeDef.box.width + "," + shapeDef.box.height)
                },
                {
                    _name: "PropertyValue",
                    _uri: "http://www.evolus.vn/Namespace/Pencil",
                    name: "box",
                    _text: (shapeDef.box.width + "," + shapeDef.box.height)
                },
                {
                    _name: "PropertyValue",
                    _uri: "http://www.evolus.vn/Namespace/Pencil",
                    name: "svgXML",
                    _cdata: shapeDef.data
                }
            ]
        }, document);

        return Dom.serializeNode(shortcut);
        */

        return (
            "<Shape id=\"" + shapeDef.id + "\" displayName=\"" + shapeDef.label + "\" icon=\"" + shapeDef.iconData + "\" xmlns=\"http://www.evolus.vn/Namespace/Pencil\" xmlns:p=\"http://www.evolus.vn/Namespace/Pencil\" xmlns:inkscape=\"http://www.inkscape.org/namespaces/inkscape\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:sodipodi=\"http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns:svg=\"http://www.w3.org/2000/svg\" xmlns:cc=\"http://web.resource.org/cc/\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\r\n" +
            "        <Properties>\r\n" +
            "            <PropertyGroup>\r\n" +
            "                <Property name=\"box\" type=\"Dimension\">" + shapeDef.box.width + "," + shapeDef.box.height + "</Property>\r\n" +
            "                <Property name=\"originalDim\" type=\"Dimension\">" + shapeDef.box.width + "," + shapeDef.box.height + "</Property>\r\n" +
            "            </PropertyGroup>\r\n" +
            "            <PropertyGroup>\r\n" +
            "                <Property name=\"svgXML\" displayName=\"SVG XML\" type=\"PlainText\"><![CDATA[" + shapeDef.data + "]]></Property>\r\n" +
            "            </PropertyGroup>\r\n" +
            "        </Properties>\r\n" +
            "        <Behaviors>\r\n" +
            "            <For ref=\"container\">\r\n" +
            "                <Scale>\r\n" +
            "                    <Arg>$box.w / $originalDim.w</Arg>\r\n" +
            "                    <Arg>$box.h / $originalDim.h</Arg>\r\n" +
            "                </Scale>\r\n" +
            "                <DomContent>$svgXML</DomContent>\r\n" +
            "            </For>\r\n" +
            "        </Behaviors>\r\n" +
            "        <Actions>\r\n" +
            "            <Action id=\"toOriginalSize\" displayName=\"To Original Size\">\r\n" +
            "                <Impl>\r\n" +
            "                    <![CDATA[\r\n" +
            "                        var originalDim = this.getProperty(\"originalDim\");\r\n" +
            "                        this.setProperty(\"box\", originalDim);\r\n" +
            "                    ]]>\r\n" +
            "                    </Impl>\r\n" +
            "            </Action>\r\n" +
            "            <Action id=\"fixRatioW\" displayName=\"Correct Ratio by Width\">\r\n" +
            "                <Impl>\r\n" +
            "                    <![CDATA[\r\n" +
            "                        var originalDim = this.getProperty(\"originalDim\");\r\n" +
            "                        var box = this.getProperty(\"box\");\r\n" +
            "                        var h = Math.round(box.w * originalDim.h / originalDim.w);\r\n" +
            "                        this.setProperty(\"box\", new Dimension(box.w, h));\r\n" +
            "                    ]]>\r\n" +
            "                    </Impl>\r\n" +
            "            </Action>\r\n" +
            "            <Action id=\"fixRatioH\" displayName=\"Correct Ratio by Height\">\r\n" +
            "                <Impl>\r\n" +
            "                    <![CDATA[\r\n" +
            "                        var originalDim = this.getProperty(\"originalDim\");\r\n" +
            "                        var box = this.getProperty(\"box\");\r\n" +
            "                        var w = Math.round(box.h * originalDim.w / originalDim.h);\r\n" +
            "                        this.setProperty(\"box\", new Dimension(w, box.h));\r\n" +
            "                    ]]>\r\n" +
            "                    </Impl>\r\n" +
            "            </Action>\r\n" +
            "        </Actions>\r\n" +
            "        <p:Content xmlns=\"http://www.w3.org/2000/svg\">\r\n" +
            "            <rect id=\"bgRect\" style=\"fill: #000000; fill-opacity: 0; stroke: none;\" x=\"0\" y=\"0\" rx=\"" + shapeDef.box.width + "\" ry=\"" + shapeDef.box.height + "\"/>" +
            "            <g id=\"container\"></g>\r\n" +
            "        </p:Content>\r\n" +
            "    </Shape>");
    }
};
