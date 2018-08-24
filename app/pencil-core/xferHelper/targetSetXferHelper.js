function TargetSetXferHelper(canvas) {
    this.canvas = canvas;

    this.type = TargetSetXferHelper.MIME_TYPE;
}
TargetSetXferHelper.MIME_TYPE = "pencil/target-set";

TargetSetXferHelper.prototype.toString = function () {
    return "ShapeXferHelper: " + TargetSetXferHelper.MIME_TYPE;
};
TargetSetXferHelper.prototype.handleData = function (dom) {
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
        
        var rect = this.canvas.currentController.getBoundingRect();
        var mx = dx;
        var my = dy;
        
        var padding = this.canvas.element.getBoundingClientRect().left - this.canvas._wrapper.getBoundingClientRect().left;
        var x0 = this.canvas._scrollPane.scrollLeft - padding;
        var y0 = this.canvas._scrollPane.scrollTop - padding;
        
        console.log(this.canvas.getSize(), this.canvas._scrollPane.scrollWidth, this.canvas._scrollPane.scrollHeight);
        
        var x1 = x0 + Math.min(this.canvas.getSize().width, this.canvas._scrollPane.clientWidth - padding);
        var y1 = y0 + Math.min(this.canvas.getSize().height, this.canvas._scrollPane.clientHeight - padding);
        
        console.log(x0, y0, x1, y1, padding);
        
        if (rect.x + rect.width > x1 || rect.x < x0) {
            mx = Math.round((x1 + x0) / 2 - (rect.x + rect.width / 2));
        }
        if (rect.y + rect.height > y1 || rect.y < y0) {
            my = Math.round((y1 + y0) / 2 - (rect.y + rect.height / 2));
        }

        this.canvas.currentController.moveBy(mx, my);

        this.canvas.ensureControllerInView();
        for (var t in this.canvas.currentController.targets) {
            this.canvas.snappingHelper.updateSnappingGuide(this.canvas.currentController.targets[t]);
        }
    }, this, Util.getMessage("action.create.shape", "Paste Shapes"));

    this.canvas.invalidateEditors();

};

Pencil.registerXferHelper(TargetSetXferHelper);
