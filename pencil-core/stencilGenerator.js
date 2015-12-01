
var StencilGenerator = {
};
StencilGenerator.selectIconFile = function () {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, Util.getMessage("select.icon.file"), nsIFilePicker.modeOpen);
    fp.appendFilters(Components.interfaces.nsIFilePicker.filterImages | Components.interfaces.nsIFilePicker.filterAll);
    if (fp.show() == nsIFilePicker.returnCancel) return "";
    return fp.file.path;
};
StencilGenerator.onload = function (event) {
    StencilGenerator.wizard = document.getElementById("stencilGenerator");
    StencilGenerator.imageList = document.getElementById("imageList");
    Dom.empty(StencilGenerator.imageList);

    StencilGenerator.imageList.addEventListener("dragover", function () {
        var dragService = Components.classes["@mozilla.org/widget/dragservice;1"].getService(Components.interfaces.nsIDragService);
        var dragSession = dragService.getCurrentSession();

        var supported = dragSession.isDataFlavorSupported("text/x-moz-url");
        if (!supported)
          supported = dragSession.isDataFlavorSupported("application/x-moz-file");

        if (supported)
          dragSession.canDrop = true;
    }, true);

    StencilGenerator.imageList.addEventListener("dragdrop", function (aEvent) {
        var dragService = Components.classes["@mozilla.org/widget/dragservice;1"].getService(Components.interfaces.nsIDragService);
        var dragSession = dragService.getCurrentSession();
        var _ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
        var uris = new Array();

        if (dragSession.sourceNode)
            return;

        document.getElementById("infoLabel").value = Util.getMessage("stencilgenerator.loading");

        var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
        trans.addDataFlavor("text/x-moz-url");
        trans.addDataFlavor("application/x-moz-file");

        for (var i = 0; i < dragSession.numDropItems; i++) {
            var uri = null;

            dragSession.getData(trans, i);
            var flavor = {}, data = {}, length = {};
            trans.getAnyTransferData(flavor, data, length);
            if (data) {
                try {
                    var str = data.value.QueryInterface(Components.interfaces.nsISupportsString);
                } catch(ex) {}

                if (str) {
                    uri = _ios.newURI(str.data.split("\n")[0], null, null);
                } else {
                    var file = data.value.QueryInterface(Components.interfaces.nsIFile);
                    if (file) {
                        uri = _ios.newFileURI(file);
                    }
                }
            }

            if (uri)
                uris.push(uri);
        }

        for (var i = 0; i < uris.length; i++) {
            var name = uris[i].spec;
            if (name && name.charAt(name.length - 1) != "/") {
                var index = name.lastIndexOf("/");
                if (index < name.length - 1) {
                    name = name.substring(index + 1);
                    var ext = Util.getFileExtension(name);
                    if (ext != null && ".jpg|.png|.gif|.bmp|.svg".indexOf(ext.toLowerCase()) != -1 && !StencilGenerator.imageExisted(uris[i].spec)) {
                        var item = Dom.newDOMElement({
                            _name: "listitem",
                            _uri: PencilNamespaces.xul,
                            label: name
                        });
                        var id = name.lastIndexOf(".");
                        if (id != -1) {
                            name = name.substring(0, id);
                        }
                        item._label = name;
                        item._uri = uris[i];
                        item._ext = ext.toLowerCase();
                        StencilGenerator.imageList.appendChild(item);
                    }
                }
            }
        }

        var totalImage = StencilGenerator.imageList.getRowCount();
        if (totalImage > 1) {
            document.getElementById("infoLabel").value =  Util.getMessage("images.found", totalImage);
        } else if (totalImage == 1) {
            document.getElementById("infoLabel").value =  Util.getMessage("one.image.found");
        } else {
            document.getElementById("infoLabel").value =  Util.getMessage("no.image.found");
        }
    }, true);

    StencilGenerator.stencilList = document.getElementById("stencilList");
    StencilGenerator.stencilList.addEventListener("click", function (event) {
        var imgNode = Dom.findUpward(event.originalTarget, function (node) { return node._img; });
        if (imgNode) {
            if (StencilGenerator._lastSelected && StencilGenerator._lastSelected != null) {
                document.getElementById("_image_" + StencilGenerator._lastSelected).className = "Image";
            }
            StencilGenerator._lastSelected = imgNode._img.id;
            document.getElementById("_image_" + StencilGenerator._lastSelected).className = "Image Selected";
            StencilGenerator.fillStencilData(imgNode._img);

            if (event.originalTarget.nodeName == "input" && event.originalTarget.className == "StencilCheckbox") {
                var count = 0;
                var check = document.getElementsByTagName("input");
                for (var i = 0; i < check.length; i++) {
                    if (check[i].checked) {
                        count++;
                    }
                }
                document.getElementById("stencilSelectedCountLabel").value = Util.getMessage("stencils.selected", count);
            }
        }
    }, false);

    StencilGenerator.wizard.canAdvance = false;

    function _checkNextWizard() {
        StencilGenerator.wizard.canAdvance = document.getElementById("collectionName").value && document.getElementById("collectionName").value != "" &&
                                            document.getElementById("collectionDescription").value && document.getElementById("collectionDescription").value != "" &&
                                            document.getElementById("collectionAuthor").value && document.getElementById("collectionAuthor").value != "" &&
                                            StencilGenerator.imageList.getRowCount() > 0;
        if (StencilGenerator.wizard.canAdvance) {
            clearInterval(StencilGenerator.checkNextWizard);
            delete StencilGenerator.checkNextWizard;
        }
    };

    StencilGenerator.checkNextWizard = setInterval(_checkNextWizard, 1000);

    StencilGenerator.stencilName = document.getElementById("stencilName");
    StencilGenerator.stencilIcon = document.getElementById("stencilIcon");
    StencilGenerator.collectionName = document.getElementById("collectionName");
    StencilGenerator.collectionDescription = document.getElementById("collectionDescription");
    StencilGenerator.collectionAuthor = document.getElementById("collectionAuthor");
    StencilGenerator.collectionIcon = document.getElementById("collectionIcon");
    StencilGenerator.collectionUrl = document.getElementById("collectionUrl");

    StencilGenerator.collectionName.focus();
    StencilGenerator.rasterizer = window.arguments[0].rasterizer;

    window.sizeToContent();
};
StencilGenerator.onStencilNameChanged = function (event) {
    try {
        var newName = StencilGenerator.stencilName.value;
        if (StencilGenerator._lastSelected && StencilGenerator._lastSelected != null) {
            var imgNode = document.getElementById("_image_" + StencilGenerator._lastSelected);
            if (imgNode && imgNode._img && imgNode._img.label != newName) {
                imgNode._img.label = newName;
                var l = document.getElementById("label_" + StencilGenerator._lastSelected);
                if (l) {
                    l.removeChild(l.firstChild);
                    l.appendChild(document.createTextNode(newName));
                }
            }
        }
    } catch(e) {
        Console.dumpError(e);
    }
};
StencilGenerator.imageExisted = function (url) {
    for (var i = 0; i < StencilGenerator.imageList.getRowCount(); i++) {
        if (StencilGenerator.imageList.getItemAtIndex(i)._uri.spec == url) {
            return true;
        }
    }
    return false;
};
StencilGenerator.fillStencilData = function (data) {
    document.getElementById("stencilName").value = data.label;
};
StencilGenerator.initStencils = function () {
    document.getElementById("stencilInformation").style.display = "none";
    StencilGenerator.preloadStencils(function (stencils, listener) {
        try {
            if (stencils && stencils.length > 0) {
                debug("preloadStencils completed: " + stencils.length);

                StencilGenerator.stencils = stencils;

                Dom.empty(StencilGenerator.stencilList);

                var sd = document.createElementNS(PencilNamespaces.html, "div");
                sd.setAttribute("class", "StencilList");
                StencilGenerator.stencilList.appendChild(sd);

                StencilGenerator.gList = [];

                for (var i = 0; i < stencils.length; i++) {
                    var item = stencils[i];

                    var d = document.createElementNS(PencilNamespaces.html, "div");
                    d._img = item;
                    d.setAttribute("class", "Image");
                    d.setAttribute("id", "_image_" + item.id);
                    sd.appendChild(d);

                    var scale = 1;

                    if (item.type == "SVG") {
                        var m = document.createElementNS(PencilNamespaces.svg, "svg");
                        var g = document.createElementNS(PencilNamespaces.svg, "g");
                        var g1 = document.createElementNS(PencilNamespaces.svg, "g");

                        try {
                            scale = parseFloat(50 / item.box.width);
                            if (item.box.height > item.box.width) {
                                scale = parseFloat(50 / item.box.height);
                            }
                        } catch(e) { error(e); }

                        if (scale > 1) {
                            scale = 1;
                        }

                        m.setAttribute("width", item.box.width * scale  + 4);
                        m.setAttribute("height", item.box.height * scale + 4);
                        //m.setAttribute("transform", "scale(" + scale + ") translate(" + (0 - item.box.x) + " " + (0 - item.box.y) + ")");

                        //g.setAttribute("width", item.box.width * scale);
                        //g.setAttribute("height", item.box.height * scale);
                        g.setAttribute("transform", "translate(2, 2)" + (scale != 1) ? " scale(" + scale + ")" : "");

                        g.appendChild(Dom.parseToNode(item.data));
                        g1.appendChild(g);
                        m.appendChild(g1);
                        d.appendChild(m);

                        StencilGenerator.gList.push({g: g1, index: i});
                    } else {
                        var m = document.createElementNS(PencilNamespaces.html, "img");
                        m.setAttribute("src", item.img._uri.spec);
                        d.appendChild(m);
                    }

                    var t = document.createElementNS(PencilNamespaces.html, "div");
                    t.setAttribute("class", "Text");
                    d.appendChild(t);

                    var c = document.createElementNS(PencilNamespaces.html, "input");
                    c.setAttribute("type", "checkbox");
                    c.setAttribute("id", "checkbox_" + item.id);
                    c.setAttribute("checked", "checked");
                    c.setAttribute("class", "StencilCheckbox");
                    t.appendChild(c);

                    var l = document.createElementNS(PencilNamespaces.html, "label");
                    l.setAttribute("for", "checkbox_" + item.id);
                    l.setAttribute("id", "label_" + item.id);
                    l.appendChild(document.createTextNode(item.label));
                    t.appendChild(l);
                }

                document.getElementById("stencilSelectedCountLabel").value = Util.getMessage("stencils.selected", stencils.length);
            }

        } catch (ex) {
            Console.dumpError(ex);
        }

        if (listener) listener.onTaskDone();
        StencilGenerator.stencilName.focus();
        document.getElementById("stencilInformation").style.display = "";
    });
};
StencilGenerator.preloadStencils = function (callback) {
    var result = [];
    var stencils = [];
    var imageCount = StencilGenerator.imageList.getRowCount();
    debug("reloading stencils..." + imageCount);

    if (imageCount != StencilGenerator._lastImageCount) {
        StencilGenerator._lastImageCount = imageCount;
        for (var i = 0; i < imageCount; i++) {
            stencils.push(StencilGenerator.imageList.getItemAtIndex(i));
        }
        var starter = function (listener) {
            StencilGenerator.loadStencil(result, stencils, 0, callback, listener);
        }
        Util.beginProgressJob(Util.getMessage("sg.getting.data"), starter);
    } else {
        callback(null, null);
    }
};
StencilGenerator.getBox = function (node) {
    var rect = node.getBoundingClientRect();
    var bbox = node.getBBox();
    var box = {x: rect.left + rect.width / 2 - bbox.width / 2, y: rect.top + rect.height / 2 - bbox.height / 2, width: bbox.width, height: bbox.height};

    return box;
};
StencilGenerator.formalizeNodeToRoot = function (node) {
    var g = node;

    var svg = g.ownerSVGElement;
    var matrix = g.getTransformToElement(svg);

    var c = g.cloneNode(true);

    var g = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
    g.appendChild(c);
    g.setAttribute("transform", Svg.toTransformText(matrix));
    c = g;
    var g = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
    g.appendChild(c);

    svg.appendChild(g);
    var bbox = g.getBBox();
    g.setAttribute("transform", "translate(" + (0 - bbox.x) + "," + (0 - bbox.y) + ")");

    return g;
};

StencilGenerator.createDataNode = function (node, defNode, metaNode) {
    var g = StencilGenerator.formalizeNodeToRoot(node);
    g.insertBefore(metaNode.cloneNode(true), g.firstChild);
    g.insertBefore(defNode.cloneNode(true), g.firstChild);
    return g;
};
StencilGenerator.createSVGStencils = function (item, svgDocument, index) {
    try {
        var stencils = [];
        var id = 0;

        var defNode = Dom.getSingle("./svg:defs", svgDocument.documentElement);
        var metaNode = Dom.getSingle("./svg:metadata", svgDocument.documentElement);

        var detectInkscape = document.getElementById("detectInkscape").checked;
        if (detectInkscape) {
            Dom.workOn("//*[@inkscape:groupmode='layer']/*", svgDocument.documentElement, function (path) {
                var node = StencilGenerator.createDataNode(path, defNode, metaNode)
                var box = StencilGenerator.getBox(node);
                stencils.push({
                    id: "svg_" + index + "_" + id,
                    label: item._label + " " + index + "_"  + id,
                    type: "SVG",
                    box: box,
                    data: Dom.serializeNode(node),
                    img: item
                });
                try {
                    node.parentNode.removeChild(node);
                } catch (e) {}
                id++;
            });
        }

        if (id == 0 && svgDocument.documentElement) {
            var path = svgDocument.documentElement;

            var g = svgDocument.createElementNS(PencilNamespaces.svg, "g");
            for (var i = 0; i < svgDocument.documentElement.childNodes.length; i ++) {
                g.appendChild(svgDocument.documentElement.childNodes[i].cloneNode(true));
            }

            stencils.push({
                id: "svg_" + index + "_" + id,
                label: item._label,
                type: "SVG",
                box: {x: 0, y: 0, width: Svg.getWidth(svgDocument), height: Svg.getHeight(svgDocument)},
                data: Dom.serializeNode(g),
                img: item
            });

        }
        return stencils;
    } catch (e) {
        Console.dumpError(e);
    }
};
StencilGenerator.loadStencil = function (result, stencils, index, callback, listener) {
    try {
        if (index < stencils.length) {
            listener.onProgressUpdated(Util.getMessage("sg.getting.data.1"), index, stencils.length);
            if (".png|.jpg|.gif|.bmp".indexOf(stencils[index]._ext) != -1) {
                var img = new Image();

                img._stencils = stencils;
                img._result = result;
                img._index = index;

                img.onerror = function () {
                    var _index = img._index;
                    var _stencils = img._stencils;
                    var _result = img._result;
                    if (_index + 1 >= _stencils.length) {
                        return callback(_result, listener);
                    } else {
                        StencilGenerator.loadStencil(_result, _stencils, _index + 1, callback, listener);
                    }
                };
                img.onload = function () {
                    var _index = img._index;
                    var _stencils = img._stencils;
                    var _result = img._result;
                    var box = {
                        width: img.naturalWidth,
                        height: img.naturalHeight
                    };

                    try {
                        var fileData = StencilGenerator.getImageFileData(_stencils[_index]._uri.spec);
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
                            return callback(_result, listener);
                        } else {
                            StencilGenerator.loadStencil(_result, _stencils, _index + 1, callback, listener);
                        }
                    } catch(e) {
                        Console.dumpError(e);
                    }
                };
                img.src = stencils[index]._uri.spec;
            } else {
                if (!StencilGenerator.svgFrame) {
                    StencilGenerator.svgFrame = document.createElementNS(PencilNamespaces.html, "iframe");

                    var container = document.body;
                    if (!container) container = document.documentElement;
                    var box = document.createElement("box");
                    box.setAttribute("style", "-moz-box-pack: start; -moz-box-align: start;");

                    StencilGenerator.svgFrame.setAttribute("style", "border: none; min-width: 0px; min-height: 0px; width: 1px; height: 1px; visibility: hidden;");
                    StencilGenerator.svgFrame.setAttribute("src", "blank.html");

                    box.appendChild(StencilGenerator.svgFrame);
                    container.appendChild(box);

                    box.style.MozBoxPack = "start";
                    box.style.MozBoxAlign = "start";

                    var domContentLoadedListener = function () {
                        window.removeEventListener("DOMFrameContentLoaded", domContentLoadedListener, false);
                        debug("DOMFrameContentLoaded " + [index, StencilGenerator.svgFrame.contentWindow.document]);
                        if (!StencilGenerator.svgFrame.contentWindow.initialized) {
                            var afterPaintListener = function (event) {
                                StencilGenerator.svgFrame.contentWindow.removeEventListener("MozAfterPaint", afterPaintListener, false);
                                if (!StencilGenerator.svgFrame._stencils) return;
                                var _stencils = StencilGenerator.svgFrame._stencils;
                                var _index = StencilGenerator.svgFrame._index;
                                var _result = StencilGenerator.svgFrame._result;
                                _result = _result.concat(StencilGenerator.createSVGStencils(_stencils[_index], StencilGenerator.svgFrame.contentWindow.document, _index));
                                if (_index + 1 >= _stencils.length) {
                                    return callback(_result, listener);
                                } else {
                                    StencilGenerator.loadStencil(_result, _stencils, _index + 1, callback, listener);
                                }
                            };
                            StencilGenerator.svgFrame.contentWindow.addEventListener("MozAfterPaint", afterPaintListener, false);
                            StencilGenerator.svgFrame.contentDocument.documentElement.style.backgroundColor = "rgba(0, 0, 0, 0)";
                            StencilGenerator.svgFrame.contentWindow.initialized = true;
                        }
                    };
                    window.addEventListener("DOMFrameContentLoaded", domContentLoadedListener, false);

                    StencilGenerator.svgFrame.contentWindow.document.body.setAttribute("style", "padding: 0px; margin: 0px;");
                }

                StencilGenerator.svgFrame._stencils = stencils;
                StencilGenerator.svgFrame._result = result;
                StencilGenerator.svgFrame._index = index;
                StencilGenerator.svgFrame.contentWindow.location.href = stencils[index]._uri.spec;
            }
        }
    } catch (ex) {
        Console.dumpError(ex);
    }
};
StencilGenerator.getImageFileData = function (url) {
    var ioserv = Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService);
    var channel = ioserv.newChannel(url, 0, null);
    var stream = channel.open();

    if (channel instanceof Components.interfaces.nsIHttpChannel && channel.responseStatus != 200) {
        return "";
    }

    var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
            .createInstance(Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream(stream);

    var size = 0;
    var file_data = "";
    while(size = bstream.available()) {
        file_data += bstream.readBytes(size);
    }

    bstream.close();
    stream.close();

    return file_data;
};
StencilGenerator.onFinish = function () {
    StencilGenerator.createCollection();
    return false;
};
StencilGenerator.disableButton = function (type, disabled) {
    var dialog = document.documentElement;
    var button = dialog.getButton(type);
    if (button) {
        button.disabled = disabled;
    }
};
StencilGenerator.closeDialog = function () {
    window.close();
};
StencilGenerator.createCollection = function () {
    var f = StencilGenerator.pickFile(StencilGenerator.collectionName.value + ".zip");
    if (f) {
        StencilGenerator.disableButton("next", true);
        StencilGenerator.disableButton("back", true);
        StencilGenerator.disableButton("finish", true);
        StencilGenerator.disableButton("cancel", true);

        var starter = function (listener) {
            try {
                var s = "<Shapes xmlns=\"http://www.evolus.vn/Namespace/Pencil\" \n" +
                        "		xmlns:p=\"http://www.evolus.vn/Namespace/Pencil\" \n" +
                        "		xmlns:svg=\"http://www.w3.org/2000/svg\" \n" +
                        "		xmlns:xlink=\"http://www.w3.org/1999/xlink\" \n" +
                        "		id=\"" + StencilGenerator.generateId(StencilGenerator.collectionName.value) + ".Icons\" \n" +
                        "		displayName=\"" + StencilGenerator.collectionName.value + "\" \n" +
                        "		description=\"" + StencilGenerator.collectionDescription.value + "\" \n" +
                        "		author=\"" + StencilGenerator.collectionAuthor.value + "\" \n" +
                        "		url=\"" + StencilGenerator.collectionUrl.value + "\">\n\n";

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
                                var stream = StencilGenerator.toInputStream(s);
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
        Util.beginProgressJob(Util.getMessage("sg.creating.collection"), starter);
    }
};
StencilGenerator.toInputStream = function(s, b) {
    var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    if (!b) {
        converter.charset = "UTF-8";
    }
    var stream = converter.convertToInputStream(s);
    return stream;
};
StencilGenerator.generateId = function(s) {
    if (s) {
        return s.replace(new RegExp('[^0-9a-zA-Z\\-]+', 'g'), "_");
    }
    return "";
};
StencilGenerator.pickFolder = function() {

    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, Util.getMessage("select.a.folder"), nsIFilePicker.modeGetFolder);
    fp.appendFilters(nsIFilePicker.filterAll);
    if (fp.show() == nsIFilePicker.returnCancel) return false;
    return fp.file;
};
StencilGenerator.pickFile = function(defaultName) {

    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, Util.getMessage("select.a.file"), nsIFilePicker.modeSave);
    fp.appendFilters(nsIFilePicker.filterAll);
    fp.defaultExtension = "zip";
    if (defaultName) {
        fp.defaultString = defaultName;
    }
    if (fp.show() == nsIFilePicker.returnCancel) return false;
    return fp.file;
};
StencilGenerator.buildShape = function(shapeDef) {
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
window.addEventListener("load", function(){ StencilGenerator.onload(); }, false);
