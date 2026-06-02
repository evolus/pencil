function StencilShapeCanvasToolbar() {
    BaseTemplatedWidget.call(this);

    this.bind("click", this.startTesting, this.testButton);
}
__extend(BaseTemplatedWidget, StencilShapeCanvasToolbar);

StencilShapeCanvasToolbar.prototype.startTesting = function () {
    ShapeTestCanvasPane._instance.startTesting(this.canvas.page);
};
