function TargetSetXferHelper(canvas) {
    this.canvas = canvas;

    this.type = TargetSetXferHelper.MIME_TYPE;
}
TargetSetXferHelper.MIME_TYPE = "pencil/target-set";

TargetSetXferHelper.prototype.toString = function () {
    return "ShapeXferHelper: " + TargetSetXferHelper.MIME_TYPE;
};
TargetSetXferHelper.prototype.handleData = function (data, length) {


    var systemString = data.QueryInterface(Components.interfaces.nsISupportsString);
    var xml = systemString.data.substring(0, length / 2);

    var parser = new DOMParser();
    var dom = parser.parseFromString(xml, "text/xml");

    //validate
    var shapes = Dom.getList("/svg:*/svg:g[@p:type]", dom);

    if (!shapes) {
        throw Util.getMessage("bad.data.in.the.clipboard");
    }

    var importedShapes = [];

    var grid = Pencil.getGridSize()

    var dx = Math.round(Math.random() * 50);
    dx = dx - (dx % grid.w);

    var dy = Math.round(Math.random() * 50);
    dy = dy - (dy % grid.h);

    this.canvas.run( function () {
        for (i in shapes) {
            shape = this.canvas.ownerDocument.importNode(shapes[i], true);
            Dom.renewId(shape);
            this.canvas.drawingLayer.appendChild(shape);
            importedShapes.push(shape);
        }
        this.canvas.selectMultiple(importedShapes)

        this.canvas.ensureControllerInView();
        for (var t in this.canvas.currentController.targets) {
            this.canvas.snappingHelper.updateSnappingGuide(this.canvas.currentController.targets[t]);
        }
    }, this, Util.getMessage("action.create.shape", "Paste Shapes"));

    this.canvas.invalidateEditors();

};

Pencil.registerXferHelper(TargetSetXferHelper);
