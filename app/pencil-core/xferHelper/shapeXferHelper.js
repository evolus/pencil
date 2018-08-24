function ShapeXferHelper(canvas) {
    this.canvas = canvas;

    this.type = ShapeXferHelper.MIME_TYPE;
}
ShapeXferHelper.MIME_TYPE = "pencil/shape";

ShapeXferHelper.prototype.toString = function () {
    return "ShapeXferHelper: " + ShapeXferHelper.MIME_TYPE;
};
ShapeXferHelper.prototype.handleData = function (dom) {
    //validate
    var shape = Dom.getSingle("/svg:g[@p:type='Shape' or @p:type='Group']", dom);

    if (!shape) {
        throw Util.getMessage("bad.data.in.the.clipboard");
    }

    shape = this.canvas.ownerDocument.importNode(shape, true);
    Dom.renewId(shape);
    if (Config.get("edit.cutAndPasteAtTheSamePlace") == null ){
        Config.set("edit.cutAndPasteAtTheSamePlace", false);
    }
    if (dom.copySamePlace && dom.copySamePlace == true || Config.get("edit.cutAndPasteAtTheSamePlace")) {
        dx = 0;
        dy = 0;
    } else if (!Config.get("edit.cutAndPasteAtTheSamePlace")) {
        var grid = Pencil.getGridSize()
        var dx = Math.round(Math.random() * 50);
        dx = dx - (dx % grid.w);

        var dy = Math.round(Math.random() * 50);
        dy = dy - (dy % grid.h);
    }
    this.canvas.run(function() {
        this.canvas.drawingLayer.appendChild(shape);
        this.canvas.selectShape(shape);

        if (this.canvas.currentController.renewTargetProperties) {
            try {
                var renewed = this.canvas.currentController.renewTargetProperties();
                if (renewed) {
                    this.canvas.selectNone();
                    this.canvas.selectShape(shape);
                }
            } catch (e) {
                console.error(e);
            }
        }

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

        this.canvas.snappingHelper.updateSnappingGuide(this.canvas.currentController);
    }, this, Util.getMessage("action.create.shape", this.canvas.createControllerFor(shape).getName()));

    this.canvas.invalidateEditors();
};

Pencil.registerXferHelper(ShapeXferHelper);
