function SharedBorderStyleEditor() {
    BaseTemplatedWidget.call(this);
    Pencil.registerSharedEditor(this);
    ToolBar.setupFocusHandling(this.node());
}
__extend(BaseTemplatedWidget, SharedBorderStyleEditor);

SharedBorderStyleEditor.PROPERTY_NAME = "strokeStyle";

SharedBorderStyleEditor.prototype.setup = function () {
    //grab control references
    this.disabledEditor = true;
    this.editor.setDisabled(this.disabledEditor);

    var thiz = this;
    this.editor.addEventListener("p:ItemSelected", function (event) {
        thiz.handleCommandEvent();
    }, false);
    this.editor.addEventListener("input", function (event) {
        thiz.handleCommandEvent();
    }, false);

    this.editor.addEventListener("keypress", function (event) {
        if (event.keyCode == KeyEvent.DOM_VK_UP || event.keyCode == KeyEvent.DOM_VK_DOWN) {
            event.stopPropagation();
        }
    }, false);

};
SharedBorderStyleEditor.prototype.handleCommandEvent = function () {
	var thiz = this;
    var style = thiz.editor.getValue();
    Pencil.activeCanvas.run(function () {
    	this.setProperty(SharedBorderStyleEditor.PROPERTY_NAME, thiz.editor.getValue());
        Pencil.activeCanvas.snappingHelper.updateSnappingGuide(this);
        thiz.invalidate();
        Pencil.activeCanvas.invalidateEditors(thiz);
    }, this.targetObject, "Change style");
};

SharedBorderStyleEditor.prototype.isDisabled = function () {
    return this.disabledEditor;
};

SharedBorderStyleEditor.prototype.attach = function (target) {
    if (target && target.getAttributeNS && target.getAttributeNS(PencilNamespaces.p, "locked") == "true") { return; }

    var style = target.getProperty(SharedBorderStyleEditor.PROPERTY_NAME, "any");
    if (!style)  {
        this.detach();
        return;
    }

    this.targetObject = target;

    this.editor.setValue(style);
    this.disabledEditor = false;
    this.editor.setDisabled(this.disabledEditor);
};
SharedBorderStyleEditor.prototype.detach = function () {
    this.disabledEditor = true;
    this.editor.setDisabled(this.disabledEditor);
    this.targetObject = null;
};
SharedBorderStyleEditor.prototype.invalidate = function () {
    if (!this.targetObject) {
        this.detach();
    } else {
        this.attach(this.targetObject);
    }
};
