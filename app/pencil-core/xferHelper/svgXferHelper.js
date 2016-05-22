function SVGXferHelper(canvas) {
    this.canvas = canvas;

    this.type = SVGXferHelper.MIME_TYPE;
}
SVGXferHelper.MIME_TYPE = "image/svg+xml";

SVGXferHelper.prototype.toString = function () {
    return "SVGXferHelper: " + SVGXferHelper.MIME_TYPE;
};
SVGXferHelper.prototype.handleData = function (dom) {
    FileDragObserver.handleSVGDOM(dom, this.canvas);
};

Pencil.registerXferHelper(SVGXferHelper);
