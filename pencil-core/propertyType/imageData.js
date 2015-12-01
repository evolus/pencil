function ImageData(w, h, data) {
    this.data = data;
    this.w = w;
    this.h = h;
}
ImageData.REG_EX = /^([0-9]+)\,([0-9]+)\,([^\0]+)$/;
ImageData.win = null;

ImageData.fromString = function (literal) {
    if (literal.match(ImageData.REG_EX)) {
        return new ImageData(parseInt(RegExp.$1),
                            parseInt(RegExp.$2),
                            RegExp.$3);
    }
    return new ImageData(literal);
};

ImageData.prompt = function (callback, embbeded) {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, Util.getMessage("select.image"), nsIFilePicker.modeOpen);
    fp.appendFilter(Util.getMessage("filepicker.images.file"), "*.png; *.jpg; *.jpeg; *.gif; *.bmp; *.svg");
    fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

    if (fp.show() != nsIFilePicker.returnOK) return null;

    var url = ImageData.ios.newFileURI(fp.file).spec;

    if (!embbeded) {
        ImageData.fromUrl(url, callback);
    } else {
        ImageData.fromUrlEmbedded(url, callback);
    }
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
    return [this.w, this.h, this.data].join(",");
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
