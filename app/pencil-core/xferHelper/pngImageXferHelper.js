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

        this.canvas.insertShape(bitmapDef, null);

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
