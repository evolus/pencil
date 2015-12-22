function PropertyEditor() {
    BaseTemplatedWidget.call(this);
    if (this.setup) this.setup();
}
__extend(BaseTemplatedWidget, PropertyEditor);

PropertyEditor.prototype.fireChangeEvent = function () {
    Dom.emitEvent("p:ValueChanged", this.node(), {});
};
