function SVGXferHelper(canvas) {
    this.canvas = canvas;

    this.type = SVGXferHelper.MIME_TYPE;
}
SVGXferHelper.MIME_TYPE = "image/svg+xml";

SVGXferHelper.prototype.toString = function () {
    return "SVGXferHelper: " + SVGXferHelper.MIME_TYPE;
};
SVGXferHelper.prototype.handleData = function (dom) {
    handleSVGDOM(dom, this.canvas, {x: 10, y: 10});
};

Pencil.registerXferHelper(SVGXferHelper);
