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
    var checkSave = function () {
        thiz.canvasContentModifiedListener(canvas);
    }
    canvas.startEventChange(checkSave);
    // var oldElement = canvas.element.childNodes[0].childNodes[0].childNodes[1].innerHTML;
    // canvas.element.addEventListener("p:ContentModified", function (event) {
    //     if (thiz.canvasContentModifiedListener){
    //         if(event.target.childNodes[0].childNodes[0].childNodes[1].innerHTML != oldElement)
    //         thiz.canvasContentModifiedListener(canvas);
    //     }
    // }, false);
    return canvas;
};
CanvasPool.prototype.show = function (canvas) {
    this.applicationPane.setActiveCanvas(canvas);
};
