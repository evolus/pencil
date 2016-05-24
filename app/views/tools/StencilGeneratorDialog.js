function StencilGeneratorDialog() {
    WizardDialog.call(this);
    this.title="Stencil Generator";
    this.collectionDefinition = this.wizardPanes[0];
    this.stencilDefinition = this.wizardPanes[1];
    this.stencils=[];
    var thiz = this;

    this.bind("click", thiz.browseIconFile, this.collectionBrowse);
    this.bind("click", thiz.browseIconFile, this.stencilBrowse);
    this.imagePaths = [];
    this.activeImageNode = null;
    var addItem = function(file) {
        var item = Dom.newDOMElement({
            _name: "li",
            _text: file.name,
        });
        item._path = file.path;
        file._ext = Util.getFileExtension(file.name);
        thiz.imageList.appendChild(item);
        thiz.imagePaths.push(file);
        console.log(item.node);
    }
    this.bind("click", function(event) {
        var top = Dom.findUpwardForNodeWithData(event.target, "_path");
        if (!top) {
            return;
        }
        if(thiz.activeImageNode) {
            thiz.activeImageNode.removeAttribute("active");
        }
        top.setAttribute("active", "true");
        this.activeImageNode = top;
    }, this.imageList)
    var imgCount = 0;
    Dom.registerEvent(this.imageSelector, "drop", function (event) {
        var files = event.dataTransfer.files;
        if(files.length > 0) {
            for (i = 0; i < files.length; i++) {
                console.log(files[i]);
                var dblFiles = false;
                var index = event.dataTransfer.files[i].type.indexOf("image");
                for(var j = 0; j < thiz.imagePaths.length; j++) {
                    if(files[i].path == thiz.imagePaths[j].path){
                        dblFiles = true;
                        break;
                    }
                }
                if (index < 0 || dblFiles == true) continue;
                addItem(event.dataTransfer.files[i]);
            }
        }
        console.log(imgCount);
        thiz.imageCount.innerHTML = thiz.imagePaths.length + " image found";
    }, false);

    this.bind("change", function(event){
        if(event.target.tagName == "input") {
            var value = event.target.checked;
            var top = Dom.findUpwardForNodeWithData(event.target, "_item");
            var item = top._item;
            item.checked = value;
            console.log(item);
        }
    }, this.stencilSelected);

    this.bind("click", function(event){
        var top = Dom.findUpwardForNodeWithData(event.target, "_item");
        var item = top._item;
        var Name = item.name.substring(0,item.name.indexOf("."));
        var fileName = Name.replace(/ /gi,"%");
        thiz.stencilName.value = fileName;
    }, this.stencilSelected);
}

__extend(WizardDialog, StencilGeneratorDialog);

StencilGeneratorDialog.prototype.onFinish = function () {
    this.createCollection();
};
StencilGeneratorDialog.prototype.invalidateSelection = function () {
    if(this.activePane == this.collectionDefinition) {
        if(this.collectionName.value == ""){
            Dialog.error("Invalid Collection Name", "Please enter the valid page name.", null);
            return false;
        }
        if(this.imageList.children.length ==0 ) {
            Dialog.error("Invalid Select Items", "Please drag items to listbox.", null);
            return false;
        }
    }
    return true;
};

StencilGeneratorDialog.prototype.browseIconFile = function() {
    var thiz = this;
    dialog.showOpenDialog({
        title: "Open Icon File",
        defaultPath: os.homedir(),
        filters: [
            { name: "Icon File", extensions: ["icon", "png"] }
        ]
    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        if(this.activePane == this.collectionDefinition) {
            //
            return;
        }

    });
}

StencilGeneratorDialog.prototype.onSelectionChanged = function () {
    if(this.activePane == this.collectionDefinition) {
        this.stepTitle.innerHTML = "Wellcome to the Stencil Generator";
        this.stepInfo.innerHTML = "Enter collection information and click Next to continue";
    } else {
        this.stepTitle.innerHTML = "Completing the Stencil Generator";
        this.stepInfo.innerHTML = "Stencil information";

        if(this.imagePaths.length > 0) {
            this.initStencils();
        }
    }
};

StencilGeneratorDialog.prototype.initStencils = function () {
    var thiz = this;
    this.preloadStencils(function(stencils,listener) {
        for (i in thiz.imagePaths) {
            thiz.imagePaths[i].result = stencils[i];
            if (thiz.imagePaths[i].checked != null) {
                continue;
            }
            thiz.stencils.push(stencils[i]);
            thiz.imagePaths[i].checked = true;

            var holder={};

            var item = Dom.newDOMElement({
                _name: "div",
                class: "imageItem",
                _children: [
                    {
                        _name:"div",
                        class:"iconContainer",
                        _children:[
                            {
                                _name:"img",
                                _id:"iconImage"
                            }
                        ]
                    },
                    {
                        _name:"span",
                        _text: thiz.imagePaths[i].name
                    },
                    {
                        _name:"input",
                        type:"checkbox",
                        checked:"true",
                    }
                ]
            },null, holder);

            item._item = thiz.imagePaths[i];
            thiz.stencilSelected.appendChild(item);
            Util.setupImage(holder.iconImage, thiz.imagePaths[i].path, "center-inside");
            console.log(item);
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
        if (image.checked == false) continue;
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

StencilGeneratorDialog.prototype.getImageFileData = function (path,onDone) {
    var file_data = "";
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) throw err;
      onDone(data);
    });
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
                        var fileData;
                        var readOnDone = function (data){
                            fileData = data;
                            var data = Base64.encode(fileData, true);
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
                        thiz.getImageFileData(_stencils[_index].path, readOnDone);
                    } catch(e) {
                        Console.dumpError(e);
                    }
                };
                listener.onProgressUpdated(null,index,stencils.length);
                img.src = stencils[index].path;
            }
        }
    } catch(e) {
         Console.dumpError(e);
    }
};


StencilGeneratorDialog.prototype.generateId = function(s) {
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

                debug("creating collection...");

                // var totalStep = StencilGenerator.gList.length + StencilGenerator.stencils.length;
                var totalStep = thiz.stencils.length;
                // var iconGenerated = 0;
                // var generateIcon = function () {
                //     try {
                //         if (iconGenerated >= StencilGenerator.gList.length) {
                //             debug("continue creating stencils...");
                //             return run();
                //         }
                //
                //         debug("iconGenerated: " + iconGenerated);
                //         Util.generateIcon({svg: StencilGenerator.gList[iconGenerated].g}, 64, 64, 2, null, function (iconData) {
                //             StencilGenerator.stencils[StencilGenerator.gList[iconGenerated++].index].iconData = iconData;
                //             listener.onProgressUpdated(Util.getMessage("sg.creating.icon.1"), iconGenerated, totalStep);
                //             setTimeout(generateIcon, 10);
                //         }, StencilGenerator.rasterizer);
                //     } catch(e) {
                //         Console.dumpError(e);
                //     }
                // };

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
                                    console.log('It\'s saved!');
                                });
                                var iconFolder = fs.mkdirSync(tempDir.name + "/" + "icon");



                                var archiver = require("archiver");
                                var archive = archiver("zip");
                                var output = fs.createWriteStream(filePath);
                                output.on("close", function () {
                                    console.log("Done Zip");
                                });
                                archive.pipe(output);
                                archive.directory(tempDir.name, "/", {});
                                archive.finalize();


                                // var stream = thiz.toInputStream(s);
                                // var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                                // var zipW = new zipWriter();
                                //
                                // zipW.open(f, 0x04 | 0x08 | 0x20 /*PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE*/);
                                // zipW.comment = "Stencil collection";
                                // zipW.addEntryDirectory("Icons", new Date(), false);
                                //
                                // zipW.addEntryStream("Definition.xml", new Date(), Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, stream, false);
                                //
                                // if (stream) {
                                //     stream.close();
                                // }

                                /*for (var i = 0; i < images.length; i++) {
                                    var theFile = FileIO.open(images[i].path);
                                    var n = StencilGenerator._getName(images[i].path);
                                    try {
                                        zipW.addEntryFile("Icons/" + n, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, theFile, false);
                                        listener.onProgressUpdated("", i + 1, images.length * 2);
                                    } catch (eex) { ; }
                                }*/

                                // zipW.close();
                            } catch (e5) {
                                Console.log(e5);
                            }

                            Util.info(Util.getMessage("stencil.generator.title"), Util.getMessage("collection.has.been.created", thiz.collectionName.value));
                            listener.onTaskDone();
                            // StencilGenerator.closeDialog();
                            return true;
                        }
                        debug("stencilCreated: " + index);
                        if (thiz.stencils[index].box.width > 0 && thiz.stencils[index].box.height > 0) {
                            var shape = thiz.buildShape(thiz.stencils[index]);
                            s += shape;
                            listener.onProgressUpdated(Util.getMessage("sg.creating.stencils.1"), index , totalStep);
                        }
                        window.setTimeout(run, 10);

                    } catch (e2) {
                        Console.dumpError(e2, "stdout");
                    }
                };
                listener.onProgressUpdated(Util.getMessage("sg.creating.collection.1"), 0, totalStep);
                // generateIcon();
                run();
            } catch (e3) {
                Console.dumpError(e3, "stdout");
            }
        }

        var processDialog = new ProgressiveJobDialog();
        processDialog.open({
            starter: starter
        });
    });

    //var f = StencilGenerator.pickFile(StencilGenerator.collectionName.value + ".zip");
    // if (f) {
        // var starter = function (listener) {
        //     try {
        //         var s = "<Shapes xmlns=\"http://www.evolus.vn/Namespace/Pencil\" \n" +
        //                 "		xmlns:p=\"http://www.evolus.vn/Namespace/Pencil\" \n" +
        //                 "		xmlns:svg=\"http://www.w3.org/2000/svg\" \n" +
        //                 "		xmlns:xlink=\"http://www.w3.org/1999/xlink\" \n" +
        //                 "		id=\"" + this.generateId(this.collectionName.value) + ".Icons\" \n" +
        //                 "		displayName=\"" + this.collectionName.value + "\" \n" +
        //                 "		description=\"" + this.collectionDescription.value + "\" \n" +
        //                 "		author=\"" + this.collectionAuthor.value + "\" \n" +
        //                 "		url=\"" + this.collectionInfoUrl.value + "\">\n\n";
        //
        //         debug("creating collection...");
        //
        //         var totalStep = StencilGenerator.gList.length + StencilGenerator.stencils.length;
        //         var iconGenerated = 0;
        //         var generateIcon = function () {
        //             try {
        //                 if (iconGenerated >= StencilGenerator.gList.length) {
        //                     debug("continue creating stencils...");
        //                     return run();
        //                 }
        //
        //                 debug("iconGenerated: " + iconGenerated);
        //                 Util.generateIcon({svg: StencilGenerator.gList[iconGenerated].g}, 64, 64, 2, null, function (iconData) {
        //                     StencilGenerator.stencils[StencilGenerator.gList[iconGenerated++].index].iconData = iconData;
        //                     listener.onProgressUpdated(Util.getMessage("sg.creating.icon.1"), iconGenerated, totalStep);
        //                     setTimeout(generateIcon, 10);
        //                 }, StencilGenerator.rasterizer);
        //             } catch(e) {
        //                 Console.dumpError(e);
        //             }
        //         };
        //
        //         var index = -1;
        //         var run = function () {
        //             try {
        //                 index++;
        //                 if (index >= StencilGenerator.stencils.length) {
        //                     s += "</Shapes>";
        //
        //                     try {
        //                         var stream = this.toInputStream(s);
        //                         var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
        //                         var zipW = new zipWriter();
        //
        //                         zipW.open(f, 0x04 | 0x08 | 0x20 /*PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE*/);
        //                         zipW.comment = "Stencil collection";
        //                         zipW.addEntryDirectory("Icons", new Date(), false);
        //
        //                         zipW.addEntryStream("Definition.xml", new Date(), Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, stream, false);
        //
        //                         if (stream) {
        //                             stream.close();
        //                         }
        //
        //                         /*for (var i = 0; i < images.length; i++) {
        //                             var theFile = FileIO.open(images[i].path);
        //                             var n = StencilGenerator._getName(images[i].path);
        //                             try {
        //                                 zipW.addEntryFile("Icons/" + n, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, theFile, false);
        //                                 listener.onProgressUpdated("", i + 1, images.length * 2);
        //                             } catch (eex) { ; }
        //                         }*/
        //
        //                         zipW.close();
        //                     } catch (e5) {
        //                         Console.dumpError(e5, "stdout");
        //                     }
        //
        //                     Util.info(Util.getMessage("stencil.generator.title"), Util.getMessage("collection.has.been.created", StencilGenerator.collectionName.value));
        //
        //                     listener.onTaskDone();
        //
        //                     StencilGenerator.closeDialog();
        //
        //                     return true;
        //                 }
        //
        //                 debug("stencilCreated: " + index);
        //
        //                 if (StencilGenerator.stencils[index].box.width > 0 && StencilGenerator.stencils[index].box.height > 0) {
        //                     var shape = StencilGenerator.buildShape(StencilGenerator.stencils[index]);
        //                     s += shape;
        //                     listener.onProgressUpdated(Util.getMessage("sg.creating.stencils.1"), index + iconGenerated, totalStep);
        //                 }
        //
        //                 window.setTimeout(run, 10);
        //             } catch (e2) {
        //                 Console.dumpError(e2, "stdout");
        //             }
        //         };
        //
        //         listener.onProgressUpdated(Util.getMessage("sg.creating.collection.1"), 0, totalStep);
        //
        //         generateIcon();
        //     } catch (e3) {
        //         Console.dumpError(e3, "stdout");
        //     }
        // }
        //Util.beginProgressJob(Util.getMessage("sg.creating.collection"), starter);
    // }
};

StencilGeneratorDialog.prototype.toInputStream = function(s, b) {
    var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    if (!b) {
        converter.charset = "UTF-8";
    }
    var stream = converter.convertToInputStream(s);
    return stream;
};

StencilGeneratorDialog.prototype.buildShape = function(shapeDef) {
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
