function ImageData(w, h, data, xCells, yCells) {
    this.data = data;
    this.w = w;
    this.h = h;
    this.xCells = xCells;
    this.yCells = yCells;
}
ImageData.REG_EX = /^([0-9]+)\,([0-9]+)\,([^\0]+)$/;
ImageData.REG_EX2 = /^([0-9]+)\,([0-9]+)\,([0-9\- ]*)\,([0-9\- ]*)\,([^\0]+)$/;
ImageData.win = null;

/*
100,200,10-20 45-33,
*/

ImageData.fromString = function (literal) {
    if (literal.match(ImageData.REG_EX2)) {
        var w = parseInt(RegExp.$1, 10);
        var h = parseInt(RegExp.$2, 10);

        var xCellsString = RegExp.$3;
        var yCellsString = RegExp.$4;
        var data = RegExp.$5;
        var xCells = ImageData.parseCellString(xCellsString);
        var yCells = ImageData.parseCellString(yCellsString);

        return new ImageData(w, h, data, xCells,yCells);
    }
    if (literal.match(ImageData.REG_EX)) {
        return new ImageData(parseInt(RegExp.$1, 10),
                            parseInt(RegExp.$2, 10),
                            RegExp.$3);
    }

    return new ImageData(literal);
};
ImageData.parseCellString = function (literal) {
    var cells = [];
    var blocks = literal.split(/[ ]+/);
    for (var block of blocks) {
        if (block.match(/^[ ]*([0-9]+)[ ]*\-[ ]*([0-9]+)[ ]*$/)) {
            cells.push({
                from: parseInt(RegExp.$1, 10),
                to: parseInt(RegExp.$2, 10)
            })
        }
    }

    return cells;
};
ImageData.generateCellString = function (cells) {
    if (!cells) return "";
    var blocks = [];
    for (var cell of cells) {
        blocks.push(cell.from + "-" + cell.to);
    }

    return blocks.join(" ");
};
ImageData.invalidateValue = function (oldData, callback) {
    if (oldData.data.startsWith(ImageData.SVG_IMAGE_DATA_PREFIX)) {
        var svg = oldData.data.substring(ImageData.SVG_IMAGE_DATA_PREFIX.length + 1);

        let id = Pencil.controller.svgImageToRefSync(svg);
        callback(new ImageData(oldData.w, oldData.h, ImageData.idToRefString(id)), null);
    } else if (oldData.data.match(/^data:/)) {
        var image = null;
        try {
            image = nativeImage.createFromDataURL(oldData.data);
        } catch (e) {
            console.e(e);
        }
        
        if (!image) {
            callback(null);
            return;
        }

        let id = Pencil.controller.nativeImageToRefSync(image);
        callback(new ImageData(oldData.w, oldData.h, ImageData.idToRefString(id)), null);

    } else if (!oldData.data.match(/^ref:\/\//)) {
        Pencil.controller.copyAsRef(oldData.data, function (id, error) {
            if (id) {
                callback(new ImageData(oldData.w, oldData.h, ImageData.idToRefString(id)), null);
            } else {
                callback(null, error);
            }
        });
    } else {
        callback(null);
    }
};
ImageData.prepareForEmbedding = function (oldData, callback) {
    if (oldData.data.match(/^ref:\/\//)) {
        var id = ImageData.refStringToId(oldData.data);
        if (!id) {
            callback(null);
            return;
        }

        var filePath = Pencil.controller.refIdToFilePath(id);
        console.log("File path");
        if (filePath.match(/svg$/i)) {
            var url = ImageData.SVG_IMAGE_DATA_PREFIX + "," + fs.readFileSync(filePath, "utf8");
            callback(new ImageData(oldData.w, oldData.h, url), null);
        } else {
            var image = nativeImage.createFromPath(filePath);
            callback(new ImageData(oldData.w, oldData.h, image.toDataURL()), null);
        }
    } else {
        callback(null);
    }
};

ImageData.performIntialProcessing = function (data, def, currentCollection) {
    if (data.data.match(/^collection:\/\/(.+)$/)) {
        var declaredPath = RegExp.$1;
        var id = Pencil.controller.collectionResourceAsRefSync(currentCollection || def.collection, declaredPath);
        if (id) {
            return new ImageData(data.w, data.h, ImageData.idToRefString(id), data.xCells, data.yCells);
        }
    }

    return null;
};

ImageData.filePathToURL = function (filePath, options) {
    filePath = path.resolve(filePath).replace(/\\/g, "/");

    if (!filePath.match(/^\/.+$/)) {
        filePath = "/" + filePath;
    }

    return "file://" + encodeURI(filePath);
};

ImageData.idToRefString = function (id) {
    return "ref://" + id;
};
ImageData.refStringToId = function (refString) {
    if (refString.match(/^ref:\/\/(.+)$/)) return RegExp.$1;
    return null;
};
ImageData.refStringToUrl = function (refString) {
    var id = ImageData.refStringToId(refString);
    if (!id) return null;
    return Pencil.controller.refIdToUrl(id);
};

ImageData.prompt = function (callback, ext) {
    dialog.showOpenDialog(remote.getCurrentWindow(), {
        title: "Select Image",
        defaultPath: os.homedir(),
        filters: [
            { name: "Image files", extensions: ext || ["png", "jpg", "jpeg", "gif", "bmp", "svg"] }
        ]

    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        ImageData.fromExternalToImageData(filenames[0], callback);
    });
};

ImageData.fromExternalToImageData = function (filePath, callback) {
    Pencil.controller.copyAsRef(filePath, function (id) {
        var url = Pencil.controller.refIdToUrl(id);
        var image = new Image();
        image.onload = function () {
            callback(new ImageData(image.width, image.height, ImageData.idToRefString(id)));
            image.src = "";
        };
        image.src = url;
    });
};
ImageData.fromUrl = function (url, callback) {
    ImageData.win.document.body.innerHTML = "";
    var image = ImageData.win.document.createElementNS(PencilNamespaces.html, "img");
    ImageData.win.document.body.appendChild(image);

    image.addEventListener("load", function (event) {
        debug("image loaded");
        try {
            callback(new ImageData(image.width, image.height, url));
        } catch (e) {
            Console.dumpError(e);
        }
    }, false);

    image.setAttribute("src", url);
    debug("after setting image url: " + image.src);
};
ImageData.fromUrlEmbedded = function (url, callback) {
    var image = new Image();
    image.onload = function () {
        var canvas = document.createElementNS(PencilNamespaces.html, "canvas");
        canvas.style.width = image.width + "px";
        canvas.style.height = image.height + "px";
        canvas.width = image.width;
        canvas.height = image.height;
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, image.width, image.height);
        ctx.save();
        ctx.scale(1, 1);
        ctx.drawImage(image, 0, 0);
        ctx.restore();

        var data = canvas.toDataURL();

        callback(new ImageData(image.width, image.height, data));
    };

    image.src = url;
};

ImageData.convertToEmbeded = function (imageData, callback) {
    if (imageData.data.match(/^data:/)) {
        alert("This image is already in the embedded mode. No conversion was taken.");
        return;
    }
    ImageData.fromUrlEmbedded(imageData.data, callback);
};

ImageData.commandsToData = function (pathCommands) {
    var newData = "";

    for (var command of pathCommands) {
        if (newData) newData += " ";
        newData += command.command;
        if (command.points) {
            for (var i = 0; i < command.points.length; i ++) {
                newData += (i > 0 ? " " : "") + command.points[i].x + "," + command.points[i].y;
            }
        }
    }

    return newData;
};
ImageData.generatePathSVGData = function (svgPathData, size) {
    var specs = [];
    var json = svgPathData.data;
    if (!json.startsWith("json:")) return specs;
    var parsedPathData = JSON.parse(json.substring(5));

    for (var info of parsedPathData) {
        var d = ImageData.commandsToData(info.commands);
        specs.push({
            _name: "path",
            _uri: PencilNamespaces.svg,
            d: d,
            style: "stroke: #000000; stroke-width: 1px; fill: rgba(0, 0, 0, 0.1);"
        });
    }

    var svg = {
        _name: "svg",
        _uri: PencilNamespaces.svg,
        width: svgPathData.w,
        height: svgPathData.h,
        viewBox: "0 0 " + size.w + " " + size.h,
        _children: [
            {
                _name: "g",
                _uri: PencilNamespaces.svg,
                //transform: scale(size.w / svgPathData.w, size.h / svgPathData.h),
                _children: specs
            }
        ]
    }

    var svgDom = Dom.newDOMElement(svg);
    var svgData = encodeURIComponent(Dom.serializeNode(svgDom));
    return "data:image/svg+xml," + svgData;
};

ImageData.prototype.isBitmap = function () {
    // Only support ref file for now
    return !!ImageData.refStringToId(this.data);
};

ImageData.prototype.toImageSrc = function () {
    if (!this.data) return "";

    if (this.data.startsWith("json:")) {
        return ImageData.generatePathSVGData(this, this);
    } else if (this.data.startsWith("data:")) {
        return this.data;
    } else {
        return ImageData.refStringToUrl(this.data);
    }
};
ImageData.prototype.toString = function () {
    if (!this.xCells && !this.yCells) {
        return [this.w, this.h, this.data].join(",");
    } else {
        return [this.w, this.h, ImageData.generateCellString(this.xCells), ImageData.generateCellString(this.yCells), this.data].join(",");
    }
};

ImageData.SVG_IMAGE_DATA_PREFIX = "data:image/svg+xml";
ImageData.prototype.getDataAsXML = function () {
    var url = this.data;
    if (!url) return null;

    if (url.startsWith(ImageData.SVG_IMAGE_DATA_PREFIX)) {
        var commaIndex = url.indexOf(",");
        if (commaIndex < ImageData.SVG_IMAGE_DATA_PREFIX.length || commaIndex > ImageData.SVG_IMAGE_DATA_PREFIX.length + 10) return null;
        var svg = url.substring(commaIndex + 1);

        return svg;
    } else if (url.match(/^ref:\/\//)) {
        var id = ImageData.refStringToId(url);
        if (!id) {
            return null;
        }
        var filePath = Pencil.controller.refIdToFilePath(id);
        return fs.readFileSync(filePath, "utf8");
    }
    return null;
};

ImageData.fromScreenshot = function (callback, providedOptions) {
    /*
    var capturer = require("electron-screencapture");
    var electron = require("electron");

    var displays = electron.screen.getAllDisplays();
    if (!displays || displays.length <= 0) {
        console.error("No dispaly found");
        return;
    }

    var display = displays[0];

    const remote = electron.remote;
    const BrowserWindow = remote.BrowserWindow;
    // var win = new BrowserWindow({ width: 800, height: 600, transparent: false, frame: true, fullscreen: false, enableLargerThanScreen: true });
    var win = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        transparent: true,
        frame: false,
        fullscreen: false,
        enableLargerThanScreen: true,
        show: false}
    );
    var mainUrl = "file://" + __dirname + "/tools/screen-cap.xhtml";
    win.loadURL(mainUrl);
    //win.webContents.openDevTools();
    //win.setFullScreen(true);

    return;
    */

    var provider = ScreenCaptureProvider.getActiveProvider();
    if (!provider) {
        callback(null, new Error("No provider found"));
        return;
    }

    var executer = function (options) {
        var tmp = require("tmp");
        var localPath = tmp.tmpNameSync();

        var win = require("electron").remote.getCurrentWindow();

        if (options.hidePencil) win.hide();

        options.outputType = BaseCaptureService.OUTPUT_FILE;
        options.outputPath = localPath;

        var delay = (options.delay ? parseInt(options.delay, 10) * 1000 : 0) + 100;

        window.setTimeout(function () {
            provider.capture(options).then(function () {
                if (options.hidePencil) win.show();
                ImageData.fromExternalToImageData(localPath, function (imageData) {
                    var fs = require("fs");
                    fs.unlinkSync(localPath);
                    callback(imageData);
                });
            }).catch(function (error) {
                if (options.hidePencil) win.show();
                callback(null, error);
            });
        }, delay);
    };

    if (providedOptions) {
        executer(providedOptions);
    } else {
        var optionDialog = new ScreenCaptureOptionDialog();
        optionDialog.callback(executer);
        optionDialog.open();
    }
};

window.addEventListener("load", function () {
    var iframe = document.createElementNS(PencilNamespaces.html, "html:iframe");
    iframe.setAttribute("style", "border: none; min-width: 0px; min-height: 0px; width: 1px; height: 1px; xvisibility: hidden;");
    iframe.setAttribute("src", "pencil-core/blank.html");

    var container = document.body;
    if (!container) container = document.documentElement;

    var box = document.createElement("div");
    box.setAttribute("style", "overflow: hidden; width: 1px; height: 1px; position: absolute; bottom: 0px; right: 0px;");
    box.appendChild(iframe);

    container.appendChild(box);

    ImageData.win = iframe.contentWindow;
    ImageData.win.document.body.setAttribute("style", "padding: 0px; margin: 0px;")
}, false);


pencilSandbox.ImageData = {
    newImageData: function (w, h, data) {
        return new ImageData(w, h, data);
    }
};
for (var p in ImageData) {
    pencilSandbox.ImageData[p] = ImageData[p];
};
