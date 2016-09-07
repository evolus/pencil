function PNGImageXferHelper(canvas) {
    this.canvas = canvas;
    this.type = PNGImageXferHelper.MIME_TYPE;
}
PNGImageXferHelper.MIME_TYPE = "image/png";
PNGImageXferHelper.SHAPE_DEF_ID = "Evolus.Common:Bitmap";

PNGImageXferHelper.prototype.toString = function () {
    return "PNGImageXferHelper: " + PNGImageXferHelper.MIME_TYPE;
};
PNGImageXferHelper.prototype.handleData = function (imageData) {

    try {
        var bitmapDef = CollectionManager.shapeDefinition.locateDefinition(PNGImageXferHelper.SHAPE_DEF_ID);
        if (!bitmapDef) return;

        this.canvas.insertShape(bitmapDef, this.canvas.lastMouse || {x: 10, y: 10});

        if (this.canvas.currentController) {
            var dim = new Dimension(imageData.w, imageData.h);
            this.canvas.currentController.setProperty("imageData", imageData);
            this.canvas.currentController.setProperty("box", dim);
            this.canvas.invalidateEditors();
        }
    } catch (ex) {
        Console.dumpError(ex);
    }
};

Pencil.registerXferHelper(PNGImageXferHelper);


function JPGGIFImageXferHelper(canvas) {
    this.canvas = canvas;
    this.type = JPGGIFImageXferHelper.MIME_TYPE;
}
JPGGIFImageXferHelper.MIME_TYPE = "image/gif";

JPGGIFImageXferHelper.prototype.toString = function () {
    return "JPGGIFImageXferHelper: " + JPGGIFImageXferHelper.MIME_TYPE;
};
JPGGIFImageXferHelper.prototype.handleData = function (url) {

    try {
        var def = CollectionManager.shapeDefinition.locateDefinition(PNGImageXferHelper.SHAPE_DEF_ID);
        if (!def) return;
        this.canvas.insertShape(def, this.canvas.lastMouse || {x: 10, y: 10});
        if (!this.canvas.currentController) return;


        var controller = this.canvas.currentController;
        var thiz = this;

        var handler = function (imageData) {
            var dim = new Dimension(imageData.w, imageData.h);
            thiz.canvas.currentController.setProperty("imageData", imageData);
            thiz.canvas.currentController.setProperty("box", dim);
            thiz.canvas.invalidateEditors();
            thiz.canvas.invalidateEditors();
        };

        ImageData.fromExternalToImageData(url, handler);
    } catch (ex) {
        Console.dumpError(ex);
    }
};

Pencil.registerXferHelper(JPGGIFImageXferHelper);
