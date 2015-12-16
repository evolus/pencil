function ColorPropertyEditor() {
    BaseTemplatedWidget.call(this);
    this.color = Color.fromString("#DA8500");
    this.setup();
};
__extend(BaseTemplatedWidget, ColorPropertyEditor);
ColorPropertyEditor.prototype.setup = function () {
    var thiz = this;
    this.selectorContainer.style.visibility = "hidden";

    this.colorButton.addEventListener("click", function (event) {
        console.log("show color selector");
        // if (!thiz.color) return;
        thiz.selector.setColor(thiz.color);
        widget.Util.positionAsPopup(thiz.selectorContainer, thiz.colorButton, "left-inside", "bottom", 0, 5);
        thiz.selectorContainer.style.visibility = "visible";
        event.cancelBubble = true;
    }, false);

    this.selector.addEventListener("ValueChange", function (event) {
        thiz.color = thiz.selector.getColor();
        thiz._applyValue();
    }, false);
};
ColorPropertyEditor.prototype.setVaue = function (color) {
    if (!color) return;
    this.color = color;
    this._applyValue();
};
ColorPropertyEditor.prototype._applyValue = function () {
    this.colorText.value = this.color.toRGBString();
    this.colorButton.style.backgroundColor = this.color.toRGBString();
};
ColorPropertyEditor.prototype.getValue = function () {
    return this.color;
};
