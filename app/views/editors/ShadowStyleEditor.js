function ShadowStyleEditor() {
    PropertyEditor.call(this);
}
__extend(PropertyEditor, ShadowStyleEditor);

ShadowStyleEditor.prototype.setup = function () {
    var thiz = this;
    this.node().addEventListener("change", function (event) {
        thiz.fireChangeEvent();
    }, false);
};
ShadowStyleEditor.prototype.setValue = function (shadowStyle) {
    if (!shadowStyle) return;
    this.dx.value = shadowStyle.dx;
    this.dy.value = shadowStyle.dy;
    this.size.value = shadowStyle.size;
    this.opacity.value = shadowStyle.opacity;
};
ShadowStyleEditor.prototype.getValue = function () {
    var shadowStyle = new ShadowStyle();
    shadowStyle.dx = this.dx.value;
    shadowStyle.dy = this.dy.value;
    shadowStyle.size = this.size.value;
    shadowStyle.opacity = this.opacity.value;
    return shadowStyle;
};
