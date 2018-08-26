function ShadowStyleEditor() {
    PropertyEditor.call(this);
    
    var thiz = this;
    this.selectorContainer.shouldCloseOnBlur = function(event) {
        var found = Dom.findUpward(event.target, function (node) {
            return node == thiz.colorButton;
        });
        return !found;
    };
}
__extend(PropertyEditor, ShadowStyleEditor);

ShadowStyleEditor.prototype.setup = function () {
    var thiz = this;
    
    this.colorButton.addEventListener("click", function (event) {
        if (thiz.selectorContainer.isVisible()) {
            thiz.selectorContainer.hide();
            return;
        }
        thiz.selector.setColor(Color.fromString(thiz.color));
        thiz.selectorContainer.show(thiz.colorButton, "left-inside", "bottom", 0, 5);
        event.cancelBubble = true;
    }, false);

    this.selector.addEventListener("ValueChange", function (event) {
        thiz.color = thiz.selector.getColor().toRGBString();
        thiz.invalidateColorDisplay();
        thiz.fireChangeEvent();
    }, false);

    this.selector.addEventListener("p:CloseColorSelector", function (event) {
        if (thiz.selectorContainer.isVisible()) {
            thiz.selectorContainer.hide();
            return;
        }
    }, false);

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
    this.color = shadowStyle.color || "#000000";
    this.invalidateColorDisplay();
};
ShadowStyleEditor.prototype.invalidateColorDisplay = function () {
    this.colorButton.style.background = this.color;
};
ShadowStyleEditor.prototype.getValue = function () {
    var shadowStyle = new ShadowStyle();
    shadowStyle.dx = this.dx.value;
    shadowStyle.dy = this.dy.value;
    shadowStyle.size = this.size.value;
    shadowStyle.opacity = this.opacity.value;
    shadowStyle.color = this.color;
    return shadowStyle;
};
