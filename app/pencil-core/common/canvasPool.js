function CanvasPool(applicationPane, max) {
    this.applicationPane = applicationPane;
    this.max = max;
    this.canvases = [];
}
CanvasPool.prototype.available = function () {
    if (this.canvases.length < this.max) return true;
    for (var i = 0; i < this.canvases.length; i ++) {
        if (!this.canvases[i].used) return true;
    }
};
CanvasPool.prototype.obtain = function () {
    for (var i = 0; i < this.canvases.length; i ++) {
        if (!this.canvases[i].used) {
            this.canvases[i].used = true;
            return this.canvases[i];
        }
    }
    if (this.canvases.length < this.max) {
        var canvas = this.newCanvas();
        this.canvases.push(canvas);
        canvas.used = true;
        return canvas;
    }
    return null;
};
CanvasPool.prototype.return = function (canvas) {
    canvas.used = false;
    Dom.empty(canvas.drawingLayer);
    canvas.selectNone();
};
CanvasPool.prototype.reset = function () {
    this.canvases.forEach(function (canvas) {
        this.return(canvas);
    }, this);
};
CanvasPool.prototype.newCanvas = function () {
    var canvas = this.applicationPane.createCanvas();
    var thiz = this;
    canvas.element.addEventListener("p:ContentModified", function (event) {
        if (thiz.canvasContentModifiedListener){
            thiz.canvasContentModifiedListener(canvas);
        }
    }, false);
    return canvas;
};
CanvasPool.prototype.show = function (canvas) {
    this.applicationPane.setActiveCanvas(canvas);
};
CanvasPool.prototype.getCanvasState = function (canvas) {
    if (canvas == this.applicationPane.activeCanvas) return canvas.getCanvasState();
    return canvas._cachedState;
};
