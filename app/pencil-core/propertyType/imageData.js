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
    if (oldData.data.match(/^data:/)) {
        var image = null;
        try {
            image = nativeImage.createFromDataURL(oldData.data);
        } catch (e) {
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
    console.log("prepareForEmbedding, oldData = ", oldData)
    if (oldData.data.match(/^ref:\/\//)) {
        var id = ImageData.refStringToId(oldData.data);
        if (!id) {
            callback(null);
            return;
        }

        var filePath = Pencil.controller.refIdToFilePath(id);
        console.log("converted file path: ", filePath);
        var image = nativeImage.createFromPath(filePath);
        callback(new ImageData(oldData.w, oldData.h, image.toDataURL()), null);
    } else {
        callback(null);
    }
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

ImageData.prompt = function (callback) {
    dialog.showOpenDialog({
        title: "Select Image",
        defaultPath: os.homedir(),
        filters: [
            { name: "Image files", extensions: ["png", "jpg", "jpeg", "gif", "bmp", "svg"] }
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


ImageData.prototype.toString = function () {
    if (!this.xCells && !this.yCells) {
        return [this.w, this.h, this.data].join(",");
    } else {
        return [this.w, this.h, ImageData.generateCellString(this.xCells), ImageData.generateCellString(this.yCells), this.data].join(",");
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
