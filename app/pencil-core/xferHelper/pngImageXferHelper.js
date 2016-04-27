function PNGImageXferHelper(canvas) {
    this.canvas = canvas;
    this.type = PNGImageXferHelper.MIME_TYPE;
}
PNGImageXferHelper.MIME_TYPE = "image/png";
PNGImageXferHelper.SHAPE_DEF_ID = "Evolus.Common:Bitmap";

PNGImageXferHelper.prototype.toString = function () {
    return "PNGImageXferHelper: " + PNGImageXferHelper.MIME_TYPE;
};
PNGImageXferHelper.prototype.handleData = function (data, length) {
    
    try {
        var thiz = this;
        Util.getClipboardImage(data, length, function (width, height, data) {
            try {
                var bitmapDef = CollectionManager.shapeDefinition.locateDefinition(PNGImageXferHelper.SHAPE_DEF_ID);
                if (!bitmapDef) {
                    return;
                }
                thiz.canvas.insertShape(bitmapDef, null);
                if (thiz.canvas.currentController) {
                    var dim = new Dimension(width, height);
                    thiz.canvas.currentController.setProperty("imageData", new ImageData(width, height, data));
                    thiz.canvas.currentController.setProperty("box", dim);
                    thiz.canvas.invalidateEditors();
                } else {
                    alert("where is the controller");
                }
            } catch (ex) {
                Console.dumpError(ex);
            }
        });
    } catch (e) {
        Console.dumpError(e);
        throw e;
    }
};

Pencil.registerXferHelper(PNGImageXferHelper);
