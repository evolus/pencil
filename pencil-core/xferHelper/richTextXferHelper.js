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
RichTextXferHelper.prototype.handleData = function (data, length) {
    
    try {
        var systemString = data.QueryInterface(Components.interfaces.nsISupportsString);
        var html = systemString.data.substring(0, length / 2);

        var xhtml = Dom.toXhtml(html);
        
        var textPaneDef = CollectionManager.shapeDefinition.locateDefinition(RichTextXferHelper.SHAPE_DEF_ID);
        if (!textPaneDef) return;
        
        this.canvas.insertShape(textPaneDef, null);
        if (this.canvas.currentController) {
            this.canvas.currentController.setProperty(RichTextXferHelper.SHAPE_CONTENT_PROP_NAME, new RichText(xhtml));
        }
    } catch (e) {
        throw e;
    }
};

Pencil.registerXferHelper(RichTextXferHelper);
