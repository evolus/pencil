function SVGXferHelper(canvas) {
    this.canvas = canvas;
    
    this.type = SVGXferHelper.MIME_TYPE;
}
SVGXferHelper.MIME_TYPE = "image/svg+xml";

SVGXferHelper.prototype.toString = function () {
    return "SVGXferHelper: " + SVGXferHelper.MIME_TYPE;
};
SVGXferHelper.prototype.handleData = function (data, length) {
    
    //alert("found: " + this.type);

    var systemString = data.QueryInterface(Components.interfaces.nsISupportsString);
    var xml = systemString.data.substring(0, length / 2);

    //alert(xml);
    handleSVGData(xml, this.canvas, {x: 10, y: 10});
    
/*
    var parser = new DOMParser();
    var dom = parser.parseFromString(xml, "text/xml");
    
    //validate
    var shape = Dom.getSingle("/svg:g[@p:type='Shape']", dom);
    
    if (!shape) {
        throw "Bad data in the clipboard";
    }
    
    shape = this.canvas.ownerDocument.importNode(shape, true);
    this.canvas.drawingLayer.appendChild(shape);
    this.canvas.selectShape(shape);
*/
};

Pencil.registerXferHelper(SVGXferHelper);
