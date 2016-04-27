function SharedFontEditor() {
    this.target = null;
    this.font = null;
}
SharedFontEditor.PROPERTY_NAME = "textFont";

SharedFontEditor.prototype.setup = function () {
    //grab control references
    this.fontList = document.getElementById("fontlist");
    this.pixelFontSize = document.getElementById("fontsize");
    this.boldButton = document.getElementById("edBoldButton");
    this.italicButton = document.getElementById("edItalicButton");
    /*this.underlineButton = document.getElementById("edUnderlineButton");
    this.strikeButton = document.getElementById("edStrikeButton");*/

    var thiz = this;
    this.fontList.addEventListener("command", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.font.family = thiz.fontList.value;
        thiz._applyValue();
    }, false);

    this.pixelFontSize.addEventListener("command", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.font.size = thiz.pixelFontSize.value + "px";
        thiz._applyValue();
    }, false);
    this.pixelFontSize.addEventListener("keyup", function(event) {
        if (event.keyCode == 13 || event.keyCode == 10) {
            if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
            thiz.font.size = thiz.pixelFontSize.value + "px";
            thiz._applyValue();
        }
    }, false);

    this.boldButton.addEventListener("command", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.font.weight = thiz.boldButton.checked ? "bold" : "normal";
        thiz._applyValue();
    }, false);

    this.italicButton.addEventListener("command", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.font.style = thiz.italicButton.checked ? "italic" : "normal";
        thiz._applyValue();
    }, false);

    /*this.underlineButton.addEventListener("command", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.font.decor = thiz.underlineButton.checked ? "underline" : "none";
        thiz._applyValue();
    }, false);

    this.strikeButton.addEventListener("command", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.font.strike = thiz.strikeButton.checked ? "strikethrough" : "none";
        thiz._applyValue();
    }, false);*/
};
SharedFontEditor.prototype._applyValue = function () {
    var thiz = this;
    Pencil.activeCanvas.run(function() {
        this.setProperty(SharedFontEditor.PROPERTY_NAME, thiz.font);
    }, this.target, Util.getMessage("action.apply.properties.value"))
};
SharedFontEditor.prototype.attach = function (target) {
    this.target = target;
    this.font = target.getProperty(SharedFontEditor.PROPERTY_NAME, "any");
    if (!this.font)  {
        this.detach();
        return;
    }

    this.fontList.disabled = false;
    this.pixelFontSize.disabled = false;
    this.boldButton.disabled = false;
    this.italicButton.disabled = false;
    /*this.underlineButton.disabled = false;
    this.strikeButton.disabled = false;*/

    //set the value
    if (Local.isFontExisting(this.font.family)) {
        this.fontList.value = this.font.family;
    } else {
        var families = this.font.getFamilies();
        for (var i = 0; i < families.length; i ++) {
            var f = families[i];
            if (Local.isFontExisting(f)) {
                this.fontList.value = f;
                break;
            }
        }
    }

    if (this.font.size.match(/^([0-9]+)[^0-9]*$/)) {
        this.pixelFontSize.value = RegExp.$1;
    }

    this.boldButton.checked = (this.font.weight == "bold");
    this.italicButton.checked = (this.font.style == "italic");
    /*this.underlineButton.checked = (this.font.decor == "underline");
    this.strikeButton.checked = (this.font.decor == "strikethrough");*/
};
SharedFontEditor.prototype.detach = function () {
    this.fontList.disabled = true;
    this.pixelFontSize.disabled = true;
    this.boldButton.disabled = true;
    this.italicButton.disabled = true;
    /*this.underlineButton.disabled = true;
    this.strikeButton.disabled = true;*/

    this.target = null;
    this.font = null;
};
SharedFontEditor.prototype.invalidate = function () {
    if (!this.target) {
        this.detach();
    } else {
        this.attach(this.target);
    }
}

Pencil.registerSharedEditor(new SharedFontEditor());
