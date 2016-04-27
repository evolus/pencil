function SampleSharedColorEditor() {
    BaseTemplatedWidget.call(this);
    this.setup();
    Pencil.registerSharedEditor(this);
}
__extend(BaseTemplatedWidget, SampleSharedColorEditor);

SampleSharedColorEditor.prototype.setup = function () {
    var thiz = this;
    this.colorInput.addEventListener("keyup", function (event) {
        console.log("change event");
        var color = Color.fromString(thiz.colorInput.value);
        thiz.targetObject.setProperty("fillColor", color);
    }, false);
};
SampleSharedColorEditor.prototype.attach = function (targetObject) {
    this.targetObject = targetObject;
    var fillColor = this.targetObject.getProperty("fillColor");
    this.colorInput.value = fillColor.toRGBString();
};
SampleSharedColorEditor.prototype.detach = function () {
    this.targetObject = null;
};
