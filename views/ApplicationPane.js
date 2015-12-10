function ApplicationPane() {
    BaseTemplatedWidget.call(this);
    Pencil.boot();
}
__extend(BaseTemplatedWidget, ApplicationPane);
ApplicationPane.prototype.onAttached = function () {
    var thiz = this;
    window.setTimeout(function () {
        thiz.createCanvas();
    }, 100);
};
ApplicationPane.prototype.createCanvas = function () {
    var w = Math.round(this.contentBody.offsetWidth * 0.95);
    var h = Math.round(this.contentBody.offsetHeight * 0.95);
    this.canvasContainer1.style.width = w + "px";
    this.canvasContainer1.style.height = h + "px";
    Pencil.activeCanvas = new Canvas(this.canvasContainer1);
};
