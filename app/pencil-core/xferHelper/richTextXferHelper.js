function RichTextXferHelper(canvas) {
    this.canvas = canvas;
    this.type = RichTextXferHelper.MIME_TYPE;
}
RichTextXferHelper.MIME_TYPE = "text/html";
RichTextXferHelper.SHAPE_DEF_ID = "Evolus.Common:RichTextBox";
RichTextXferHelper.SHAPE_CONTENT_PROP_NAME = "textContent";

RichTextXferHelper.prototype.toString = function () {
    return "RichTextXferHelper: " + RichTextXferHelper.MIME_TYPE;
};
RichTextXferHelper.prototype.handleData = function (html) {

    try {
        var xhtml = Dom.toXhtml(html);

        var textPaneDef = CollectionManager.shapeDefinition.locateDefinition(RichTextXferHelper.SHAPE_DEF_ID);
        if (!textPaneDef) return;

        this.canvas.insertShape(textPaneDef, this.canvas.lastMouse || {x: 10, y: 10});
        if (this.canvas.currentController) {
            this.canvas.currentController.setProperty(RichTextXferHelper.SHAPE_CONTENT_PROP_NAME, new RichText(xhtml));
        }
    } catch (e) {
        throw e;
    }
};

Pencil.registerXferHelper(RichTextXferHelper);

function PlainTextXferHelper(canvas) {
    this.canvas = canvas;
    this.type = PlainTextXferHelper.MIME_TYPE;
}
PlainTextXferHelper.MIME_TYPE = "text/plain";
PlainTextXferHelper.SHAPE_DEF_ID = "Evolus.Common:PlainTextV2";
PlainTextXferHelper.SHAPE_CONTENT_PROP_NAME = "label";

PlainTextXferHelper.prototype.toString = function () {
    return "PlainTextXferHelper: " + PlainTextXferHelper.MIME_TYPE;
};
PlainTextXferHelper.prototype.handleData = function (text) {

    try {
        var textPaneDef = CollectionManager.shapeDefinition.locateDefinition(PlainTextXferHelper.SHAPE_DEF_ID);
        if (!textPaneDef) return;

        this.canvas.insertShape(textPaneDef, this.canvas.lastMouse || {x: 10, y: 10});
        if (this.canvas.currentController) {
            this.canvas.currentController.setProperty(PlainTextXferHelper.SHAPE_CONTENT_PROP_NAME, new PlainText(text));
        }
    } catch (e) {
        throw e;
    }
};

Pencil.registerXferHelper(PlainTextXferHelper);
