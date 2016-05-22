function ShadowStyleEditor() {
    PropertyEditor.call(this);
}
__extend(PropertyEditor, ShadowStyleEditor);

ShadowStyleEditor.prototype.setup = function () {
    var thiz = this;
    this.dx.addEventListener("change", function (event) {
        thiz.fireChangeEvent();
    }, false);
    this.dy.addEventListener("change", function (event) {
        thiz.fireChangeEvent();
    }, false);
    this.size.addEventListener("change", function (event) {
        thiz.fireChangeEvent();
    }, false);
};
ShadowStyleEditor.prototype.setValue = function (shadowStyle) {
    if (!shadowStyle) return;
    this.dx.value = shadowStyle.dx;
    this.dy.value = shadowStyle.dy;
    this.size.value = shadowStyle.size;
};
ShadowStyleEditor.prototype.getValue = function () {
    var shadowStyle = new ShadowStyle();
    shadowStyle.dx = this.dx.value;
    shadowStyle.dy = this.dy.value;
    shadowStyle.size = this.size.value;
    return shadowStyle;
};
