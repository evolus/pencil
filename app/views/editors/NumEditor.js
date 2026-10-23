function NumEditor() {
    PropertyEditor.call(this);

    var thiz = this;
}
__extend(PropertyEditor, NumEditor);

NumEditor.prototype.setup = function () {
    var thiz = this;

    this.numberInput.addEventListener("input", function (event) {
        thiz.fireChangeEvent();
    }, false);
};
NumEditor.prototype.setValue = function (num) {
    if (!num) return;
    this.numberInput.value = num.value;
};
NumEditor.prototype.getValue = function () {
    var num = new Num(this.numberInput.value);
    return num;
};
NumEditor.prototype.setTypeMeta = function (meta, propDef) {
    this.meta = meta;
    this.propDef = propDef;

    if (this.meta && this.meta.min) {
        this.numberInput.setAttribute("min", parseFloat(this.meta.min));
    } else {
        this.numberInput.removeAttribute("min");
    }
    if (this.meta && this.meta.max) {
        this.numberInput.setAttribute("max", parseFloat(this.meta.max));
    } else {
        this.numberInput.removeAttribute("max");
    }
    if (this.meta && this.meta.step) {
        this.numberInput.setAttribute("step", parseFloat(this.meta.step));
    } else {
        this.numberInput.removeAttribute("step");
    }
};
