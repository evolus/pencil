var ExternalEditorSupports = {};

ExternalEditorSupports.getEditorPath = function (extension) {
    if (extension == "svg") return Config.get("external.editor.vector.path", "/usr/bin/inkscape %f");
    if (extension == "jpg"
        || extension == "gif"
        || extension == "png") return Config.get("external.editor.bitmap.path", "/usr/bin/gimp -n %f");

    throw Util.getMessage("unsupported.type", extension);
};
ExternalEditorSupports.queue = [];

var spawn = require("child_process").spawn;
ExternalEditorSupports.handleEditRequest = function (contentProvider, contentReceiver) {
    var tmpFile = tmp.fileSync({postfix: "." + contentProvider.extension });

    contentProvider.saveTo(tmpFile.name, function () {

        var executableConfig = ExternalEditorSupports.getEditorPath(contentProvider.extension);
        executableConfig = executableConfig.replace(/^(.+)\.exe/, function (zero, one) {
            return one.replace(/[ ]/g, "@space@") + ".exe";
        });
        var args = executableConfig.split(/[ ]+/);

        var executablePath = args[0].replace(/@space@/g, " ");
        var params = [];
        var hasFileArgument = false;
        for (var i = 1; i < args.length; i ++) {
            var arg = args[i].trim();
            if (arg == "%f") {
                params.push(tmpFile.name);
                hasFileArgument = true;
            } else {
                params.push(arg);
            }
        }

        if (!hasFileArgument) {
            params.push(tmpFile.name);
        }

        var process = spawn(executablePath, params);

        var timeOutId = null;
        process.on("close", function () {
            try {
                contentReceiver.update(tmpFile.name);
                if (timeOutId) window.clearTimeout(timeOutId);
                tmpFile.removeCallback();
            } catch (e) {
                console.error(e);
            }
        });

        var fstat = fs.statSync(tmpFile.name);
        var initialLastModifiedTime = fstat.mtime.getTime();

        //track the process and file for changes
        var tracker = function () {
            try {
                fstat = fs.statSync(tmpFile.name);
                var lmt = fstat.mtime.getTime();

                if (lmt > initialLastModifiedTime) {
                    initialLastModifiedTime = lmt;
                    contentReceiver.update(tmpFile.name);
                }
            } catch (e) {
                console.log("error:", e);
            } finally {
                timeOutId = window.setTimeout(tracker, 1000);
            }
        };

        timeOutId = window.setTimeout(tracker, 1000);
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
            console.error(e);
        }
    }
    window.setTimeout(ExternalEditorSupports.checkQueue, 300);
};

ExternalEditorSupports.editImageData = function (imageData, ext, ownerObject) {
    var filePath = null;
    var refId = null;
    if (imageData.data.match(/^ref:\/\/.*\.(gif|jpg|png)$/)) {
        refId = ImageData.refStringToId(imageData.data);
        filePath = Pencil.controller.refIdToFilePath(refId);
    }

    if (filePath == null) {
        Dialog.error("Unsupported image data.");
        return;
    }

    var thiz = ownerObject;
    ExternalEditorSupports.edit({
            extension: ext,
            saveTo: function (file, callback) {
                fs.writeFileSync(file, fs.readFileSync(filePath));
                callback();
            }
        }, {
            update: function (file) {
                window.setTimeout(function () {
                    var handler = function (updatedImageData) {
                        thiz.setProperty("imageData", updatedImageData);
                    };

                    fs.writeFileSync(filePath, fs.readFileSync(file));
                    var url = Pencil.controller.refIdToUrl(refId);
                    var image = new Image();
                    image.onload = function () {
                        handler(new ImageData(image.width, image.height, ImageData.idToRefString(refId)));
                        image.src = "";
                    };
                    image.src = url
                    console.log("URL to load", url);
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
            debug("Update SVG content from file: " + file);
            var dom = Dom.parseFile(file);

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
