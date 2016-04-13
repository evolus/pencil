function SharedColorEditor() {
    BaseTemplatedWidget.call(this);
    Pencil.registerSharedEditor(this);
    this.node().disabled = true;

    this.bind("p:PopupShown", function () {
        this.setAttribute("active", true);
    }, this.selectorContainer.node());
    this.bind("p:PopupHidden", function () {
        this.removeAttribute("active");
    }, this.selectorContainer.node());

    this.selectorContainer.setPopupClass("SharedColorEditorPopup");
}
__extend(BaseTemplatedWidget, SharedColorEditor);

SharedColorEditor.prototype.setup = function () {
    var thiz = this;
    this.color = null;
    if (this.propertyName == "textColor") this.colorDisplay.innerHTML = "A";
    this.updateDisplayColor("#333333");

    this.node().addEventListener("click", function (event) {
        // this.color = Color.fromString("#336699");
        if (!thiz.color) return;
        thiz.selector.setColor(thiz.color);
        thiz.selectorContainer.show(thiz.node(), "left-inside", "bottom", 0, 5);
        event.cancelBubble = true;
    }, false);

    this.selector.addEventListener("ValueChange", function (event) {
        thiz.color = thiz.selector.getColor();
        thiz._applyValue();
    }, false);

};

SharedColorEditor.prototype.attach = function (targetObject) {
    if (!targetObject) return;

    this.targetObject = targetObject;
    this.color = this.targetObject.getProperty(this.propertyName);
    if (!this.color)  {
        this.detach();
        return;
    }
    this.node().disabled = false;
    this.updateDisplayColor();
};
SharedColorEditor.prototype.detach = function () {

    this.node().disabled = true;
    this.targetObject = null;
    this.color = null;

};

SharedColorEditor.prototype._applyValue = function () {
    var thiz = this;
    Pencil.activeCanvas.run(function() {
        this.setProperty(thiz.propertyName, thiz.color);
    }, this.targetObject, Util.getMessage("action.apply.properties.value"))

    this.updateDisplayColor();
};
SharedColorEditor.prototype.updateDisplayColor = function (defaultValue) {
    var thiz = this;
    var handler = {
        textColor: function () {
            thiz.colorDisplay.style.color = (thiz.color) ? thiz.color.toRGBAString() : defaultValue;
        },
        fillColor: function () {
            thiz.colorDisplay.style.backgroundColor = (thiz.color) ? thiz.color.toRGBAString() : defaultValue;
        },
        strokeColor: function () {
            thiz.colorDisplay.style.borderColor = (thiz.color) ? thiz.color.toRGBAString() : defaultValue;
        }
    }[this.propertyName];

    handler();
};
SharedColorEditor.prototype.attach.invalidate = function () {
    if (!this.targetObject) {
        this.detach();
    } else {
        this.attach(this.targetObject);
    }
}
