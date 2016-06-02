var ExternalEditorSupports = {};

ExternalEditorSupports.getEditorPath = function (extension) {
    if (extension == "svg") return Config.get("external.editor.vector.path", "/usr/bin/inkscape");
    if (extension == "jpg"
        || extension == "gif"
        || extension == "png") return Config.get("external.editor.bitmap.path", "/usr/bin/gimp");

    throw Util.getMessage("unsupported.type", extension);
};
ExternalEditorSupports.queue = [];

ExternalEditorSupports.handleEditRequest = function (contentProvider, contentReceiver) {
    var tmpFile = Local.newTempFile("pencil", contentProvider.extension);
    contentProvider.saveTo(tmpFile, function () {

        var protoservice = Components.classes['@mozilla.org/uriloader/external-protocol-service;1']
                                        .getService(Components.interfaces.nsIExternalProtocolService);


        var localFile = tmpFile.QueryInterface(Components.interfaces.nsILocalFile);

        var app = Components.classes["@mozilla.org/file/local;1"]
                         .createInstance(Components.interfaces.nsILocalFile);
        var executablePath = ExternalEditorSupports.getEditorPath(contentProvider.extension);
        app.initWithPath(executablePath);

        var process = Components.classes["@mozilla.org/process/util;1"]
                            .createInstance(Components.interfaces.nsIProcess);
        process.init(app);

        var args = [localFile.path];
        process.runAsync(args, args.length);

        var initialLastModifiedTime = localFile.lastModifiedTime;

        //track the process and file for changes
        var tracker = function () {
            if (!localFile.exists()) return;

            try {
                var lmt = localFile.lastModifiedTime;
                if (lmt > initialLastModifiedTime) {
                    initialLastModifiedTime = lmt;
                    contentReceiver.update(localFile);
                }
            } finally {
                if (process.isRunning) {
                    window.setTimeout(tracker, 1000);
                } else {
                    localFile.remove(true);
                }
            }
        };

        window.setTimeout(tracker, 1000);
    });
};

ExternalEditorSupports.edit = function (contentProvider, contentReceiver) {
    ExternalEditorSupports.queue.push({
            provider: contentProvider,
            receiver: contentReceiver
        });
};

ExternalEditorSupports.checkQueue = function () {
    if (ExternalEditorSupports.queue.length > 0) {
        try {
            var request = ExternalEditorSupports.queue.pop();
            ExternalEditorSupports.handleEditRequest(request.provider, request.receiver);
        } catch (e) {
            alert(e);
        }
    }
    window.setTimeout(ExternalEditorSupports.checkQueue, 300);
};

ExternalEditorSupports.editImageData = function (imageData, ext, ownerObject) {
    console.log("edit image data", [imageData, ownerObject]);
    var thiz = ownerObject;
    ExternalEditorSupports.edit({
            extension: ext,
            saveTo: function (file, callback) {
                var io = Components.classes["@mozilla.org/network/io-service;1"]
                                    .getService(Components.interfaces.nsIIOService);
                var source = io.newURI(imageData.data, "UTF8", null);

                var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                                          .createInstance(Components.interfaces.nsIWebBrowserPersist);

                persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
                persist.persistFlags |= Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

                persist.progressListener = new PersistProgressListener(callback);

                // save the canvas data to the file
                persist.saveURI(source, null, null, null, null, file);
            }
        }, {
            update: function (file) {
                window.setTimeout(function () {
                    var handler = function (imageData) {
                        var dim = new Dimension(imageData.w, imageData.h);
                        thiz.setProperty("imageData", imageData);
                        thiz.setProperty("box", dim);
                    };
                    var url = Util.ios.newFileURI(file).spec + "?" + (new Date().getTime());

                    ImageData.fromUrlEmbedded(url, handler);
                }, 1000);
            }
        });
};
ExternalEditorSupports.editSVGData = function (originalDim, container, ownerObject) {
    var svg = document.createElementNS(PencilNamespaces.svg, "svg");
    svg.setAttribute("width", originalDim.w);
    svg.setAttribute("height", originalDim.h);

    var thiz = ownerObject;
    ExternalEditorSupports.edit({
        extension: "svg",
        saveTo: function (file, callback) {
            if (container.firstChild) {
                svg.appendChild(document.importNode(container.firstChild, true));
            }

            Dom.serializeNodeToFile(svg, file);
            callback();
        }
    }, {
        update: function (file) {
            debug("Update SVG content from file: " + file.path);
            //parse the file
            var fileContents = FileIO.read(file, XMLDocumentPersister.CHARSET);
            var domParser = new DOMParser();
            var dom = domParser.parseFromString(fileContents, "text/xml");

            var node = dom.documentElement.firstChild;

            if (dom.documentElement.childNodes.length > 1) {
                node = dom.createElementNS(PencilNamespaces.svg, "g");
                for (var i = 0; i < dom.documentElement.childNodes.length; i ++) {
                    var e = dom.documentElement.childNodes[i].cloneNode(true);
                    node.appendChild(e);
                }
            }

            var content = Dom.serializeNode(node);

            debug(content);

            var w = dom.documentElement.getAttribute("width");
            var h = dom.documentElement.getAttribute("height");

            if (w && h) {
                var originalDim = new Dimension(Math.round(parseFloat(w)), Math.round(parseFloat(h)));
                thiz.setProperty("originalDim", originalDim);
            }

            thiz.setProperty("svgXML", content);
        }
    });
};
pencilSandbox.ImageData.ExternalEditorSupports = ExternalEditorSupports;
ImageData.ExternalEditorSupports = ExternalEditorSupports;
window.setTimeout(ExternalEditorSupports.checkQueue, 300);
