function StencilGeneratorDialog() {
    WizardDialog.call(this);
    this.title="Stencil Generator";
    this.collectionDefinition = this.wizardPanes[0];
    this.stencilDefinition = this.wizardPanes[1];
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
    this.preloadStencils(function() {
        for (i in this.imagePaths) {
            if (this.imagePaths[i].checked != null) {
                checkPreload = false;
                continue;
            }
            this.imagePaths[i].checked = true;

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
                        _text: this.imagePaths[i].name
                    },
                    {
                        _name:"input",
                        type:"checkbox",
                        checked:"true",
                    }
                ]
            },null, holder);
            item._item = this.imagePaths[i];
            this.stencilSelected.appendChild(item);
            Util.setupImage(holder.iconImage, this.imagePaths[i].path, "center-inside");
        }
    });
};

StencilGeneratorDialog.prototype.preloadStencils = function (callback) {
    var thiz = this;
    var result = [];
    var stencils = [];

    for (var i = 0; i < this.imagePaths.length; i++) {
        var image = this.imagePaths[i];
        if (image.checked == true) stencils.push(image);
    }
    thiz.loadStencil(result, stencils, 0, callback);

};

StencilGeneratorDialog.prototype.getImageFileData = function (path,onDone) {
    var file_data = "";
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) throw err;
      onDone(data);
    });
};

StencilGeneratorDialog.prototype.loadStencil = function (result, stencils, index) {
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
                        var fileData = this.getImageFileData(_stencils[_index].path);
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
                            console.log(_result);
                        } else {
                            this.loadStencil(_result, _stencils, _index + 1);
                        }
                    } catch(e) {
                        Console.dumpError(e);
                    }
                };
                img.src = stencils[index].path;
            }
        }
    } catch(e) {
         Console.dumpError(e);
    }
};

StencilGeneratorDialog.prototype.createCollection = function () {
    //var f = StencilGenerator.pickFile(StencilGenerator.collectionName.value + ".zip");

    if (f) {
        var starter = function (listener) {
            try {
                var s = "<Shapes xmlns=\"http://www.evolus.vn/Namespace/Pencil\" \n" +
                        "		xmlns:p=\"http://www.evolus.vn/Namespace/Pencil\" \n" +
                        "		xmlns:svg=\"http://www.w3.org/2000/svg\" \n" +
                        "		xmlns:xlink=\"http://www.w3.org/1999/xlink\" \n" +
                        "		id=\"" + this.generateId(this.collectionName.value) + ".Icons\" \n" +
                        "		displayName=\"" + this.collectionName.value + "\" \n" +
                        "		description=\"" + this.collectionDescription.value + "\" \n" +
                        "		author=\"" + this.collectionAuthor.value + "\" \n" +
                        "		url=\"" + this.collectionInfoUrl.value + "\">\n\n";

                debug("creating collection...");

                var totalStep = StencilGenerator.gList.length + StencilGenerator.stencils.length;
                var iconGenerated = 0;
                var generateIcon = function () {
                    try {
                        if (iconGenerated >= StencilGenerator.gList.length) {
                            debug("continue creating stencils...");
                            return run();
                        }

                        debug("iconGenerated: " + iconGenerated);
                        Util.generateIcon({svg: StencilGenerator.gList[iconGenerated].g}, 64, 64, 2, null, function (iconData) {
                            StencilGenerator.stencils[StencilGenerator.gList[iconGenerated++].index].iconData = iconData;
                            listener.onProgressUpdated(Util.getMessage("sg.creating.icon.1"), iconGenerated, totalStep);
                            setTimeout(generateIcon, 10);
                        }, StencilGenerator.rasterizer);
                    } catch(e) {
                        Console.dumpError(e);
                    }
                };

                var index = -1;
                var run = function () {
                    try {
                        index++;
                        if (index >= StencilGenerator.stencils.length) {
                            s += "</Shapes>";

                            try {
                                var stream = this.toInputStream(s);
                                var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                                var zipW = new zipWriter();

                                zipW.open(f, 0x04 | 0x08 | 0x20 /*PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE*/);
                                zipW.comment = "Stencil collection";
                                zipW.addEntryDirectory("Icons", new Date(), false);

                                zipW.addEntryStream("Definition.xml", new Date(), Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, stream, false);

                                if (stream) {
                                    stream.close();
                                }

                                /*for (var i = 0; i < images.length; i++) {
                                    var theFile = FileIO.open(images[i].path);
                                    var n = StencilGenerator._getName(images[i].path);
                                    try {
                                        zipW.addEntryFile("Icons/" + n, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, theFile, false);
                                        listener.onProgressUpdated("", i + 1, images.length * 2);
                                    } catch (eex) { ; }
                                }*/

                                zipW.close();
                            } catch (e5) {
                                Console.dumpError(e5, "stdout");
                            }

                            Util.info(Util.getMessage("stencil.generator.title"), Util.getMessage("collection.has.been.created", StencilGenerator.collectionName.value));

                            listener.onTaskDone();

                            StencilGenerator.closeDialog();

                            return true;
                        }

                        debug("stencilCreated: " + index);

                        if (StencilGenerator.stencils[index].box.width > 0 && StencilGenerator.stencils[index].box.height > 0) {
                            var shape = StencilGenerator.buildShape(StencilGenerator.stencils[index]);
                            s += shape;
                            listener.onProgressUpdated(Util.getMessage("sg.creating.stencils.1"), index + iconGenerated, totalStep);
                        }

                        window.setTimeout(run, 10);
                    } catch (e2) {
                        Console.dumpError(e2, "stdout");
                    }
                };

                listener.onProgressUpdated(Util.getMessage("sg.creating.collection.1"), 0, totalStep);

                generateIcon();
            } catch (e3) {
                Console.dumpError(e3, "stdout");
            }
        }
        //Util.beginProgressJob(Util.getMessage("sg.creating.collection"), starter);
    }
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
