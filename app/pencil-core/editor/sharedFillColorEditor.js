function SharedFillColorEditor(propertyName, buttonId) {
    this.target = null;
    this.color = null;
    this.propertyName = propertyName;
    this.buttonId = buttonId;
}

SharedFillColorEditor.prototype.setup = function () {
    //grab control references
    this.fillColorButton = document.getElementById(this.buttonId);

    var thiz = this;
    this.fillColorButton.addEventListener("change", function(event) {
        if (!thiz.target || !thiz.color) return;
        thiz.color = thiz.fillColorButton.color;
        thiz._applyValue();
    }, false);

};
SharedFillColorEditor.prototype._applyValue = function () {
    var thiz = this;
    Pencil.activeCanvas.run(function() {
        this.setProperty(thiz.propertyName, thiz.color);
    }, this.target, Util.getMessage("action.apply.properties.value"))
};
SharedFillColorEditor.prototype.attach = function (target) {
    this.target = null;
    this.color = target.getProperty(this.propertyName);
    if (!this.color)  {
        this.detach();
        return;
    }
    this.fillColorButton.setEnable(true);

    //set the value
    this.fillColorButton.color = this.color;

    this.target = target;
};
SharedFillColorEditor.prototype.detach = function () {
    this.fillColorButton.setEnable(false);

    this.target = null;
    this.font = null;
};
SharedFillColorEditor.prototype.attach.invalidate = function () {
    if (!this.target) {
        this.detach();
    } else {
        this.attach(this.target);
    }
}


Pencil.registerSharedEditor(new SharedFillColorEditor("textColor", "textColorButton"));
Pencil.registerSharedEditor(new SharedFillColorEditor("strokeColor", "strokeColorButton"));
Pencil.registerSharedEditor(new SharedFillColorEditor("fillColor", "fillColorButton"));

