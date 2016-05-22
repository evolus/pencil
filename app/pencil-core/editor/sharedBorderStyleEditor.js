function SharedBorderStyleEditor() {
    this.target = null;
}
SharedBorderStyleEditor.PROPERTY_NAME = "strokeStyle";

SharedBorderStyleEditor.prototype.setup = function () {
    //grab control references
    this.editor = document.getElementById("strokeStyleEditor");
    this.editor.setAttribute("disabled", true);

    var thiz = this;
    this.editor.addEventListener("command", function (event) {
        thiz.handleCommandEvent();
    }, false);
    this.editor.addEventListener("change", function (event) {
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
    Pencil.activeCanvas.run(function () {
    	this.setProperty(SharedBorderStyleEditor.PROPERTY_NAME, thiz.editor.getValue());
        Pencil.activeCanvas.snappingHelper.updateSnappingGuide(this);
        thiz.invalidate();
        Pencil.activeCanvas.invalidateEditors(thiz);
    }, this.target, "Change style");
};

SharedBorderStyleEditor.prototype.isDisabled = function () {
    return this.editor.getAttribute("disabled") == "true";
};

SharedBorderStyleEditor.prototype.attach = function (target) {
    this.target = target;
    var style = target.getProperty(SharedBorderStyleEditor.PROPERTY_NAME, "any");
    if (!style)  {
        this.detach();
        return;
    }

    this.targetObject = target;

    this.editor.setValue(style);
    this.editor.removeAttribute("disabled");
};
SharedBorderStyleEditor.prototype.detach = function () {
    this.editor.setAttribute("disabled", true);
    this.targetObject = null;
};
SharedBorderStyleEditor.prototype.invalidate = function () {
    if (!this.targetObject) {
        this.detach();
    } else {
        this.attach(this.targetObject);
    }
};

Pencil.registerSharedEditor(new SharedBorderStyleEditor());
