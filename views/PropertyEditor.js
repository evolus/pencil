function PropertyEditor() {
    BaseTemplatedWidget.call(this);
    if (this.setup) this.setup();
}
__extend(BaseTemplatedWidget, PropertyEditor);

PropertyEditor.prototype.fireChangeEvent = function () {
    this.modified = true;
    Dom.emitEvent("p:ValueChanged", this.node(), {});
};
