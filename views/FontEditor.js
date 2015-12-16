function FontEditor() {
    BaseTemplatedWidget.call(this);
    this.setup();
}
__extend(BaseTemplatedWidget, FontEditor);
FontEditor.prototype.setup = function () {
    //grab control references
    /*this.underlineButton = document.getElementById("edUnderlineButton");
    this.strikeButton = document.getElementById("edStrikeButton");*/

    this.fontCombo.renderer = function (font) {
        return font;
    };
    this.fontCombo.decorator = function (node, font) {
        node.style.fontFamily = "'" + font + "'";
    };

    var localFonts = Local.getInstalledFonts();
    var items = localFonts;
    this.fontCombo.setItems(items);

    var thiz = this;
    this.fontCombo.addEventListener("click", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.font.family = thiz.fontCombo.getSelectedItem();
        thiz._applyValue();
    }, false);

    this.pixelFontSize.addEventListener("click", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing) return;
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

    this.boldButton.addEventListener("click", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing) return;
        var checked = false;
        if (thiz.boldButton.hasAttribute("checked") && thiz.boldButton.getAttribute("checked") == "true") {
            thiz.boldButton.removeAttribute("checked");
        } else {
            thiz.boldButton.setAttribute("checked", "true");
            checked = true;
        }
        thiz.font.weight = checked ? "bold" : "normal";
        thiz._applyValue();
    }, false);

    this.italicButton.addEventListener("click", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing) return;
        var checked = false;
        if (thiz.italicButton.hasAttribute("checked") && thiz.italicButton.getAttribute("checked") == "true") {
            thiz.italicButton.removeAttribute("checked");
        } else {
            thiz.italicButton.setAttribute("checked", "true");
            checked = true;
        }

        thiz.font.style = checked ? "italic" : "normal";
        thiz._applyValue();
    }, false);

    this.underlineButton.addEventListener("command", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing) return;
        var checked = false;
        if (thiz.underlineButton.hasAttribute("checked") && thiz.underlineButton.getAttribute("checked") == "true") {
            thiz.underlineButton.removeAttribute("checked");
        } else {
            thiz.underlineButton.setAttribute("checked", "true");
            checked = true;
        }

        thiz.font.decor = checked ? "italic" : "normal";
        thiz._applyValue();
    }, false);


    /*
    this.underlineButton.addEventListener("command", function(event) {
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
FontEditor.prototype.setValue = function (font) {
    if (!font) return;
    this.font = font;
    if (Local.isFontExisting(this.font.family)) {
        this.fontCombo.selectItem(this.font.family);
    } else {
        var families = this.font.getFamilies();
        for (var i = 0; i < families.length; i ++) {
            var f = families[i];
            if (Local.isFontExisting(f)) {
                this.fontCombo.selectItem(f);
                break;
            }
        }
    }
    //
    if (this.font.size.match(/^([0-9]+)[^0-9]*$/)) {
        this.pixelFontSize.value = RegExp.$1;
    }

    if (this.font.weight == "bold") {
        this.boldButton.setAttribute("checked", "true");
    } else {
        this.boldButton.removeAttribute("checked");
    }

    if (this.font.style == "italic") {
        this.italicButton.setAttribute("checked", "true");
    } else {
        this.italicButton.removeAttribute("checked");
    }
};
FontEditor.prototype.getValue = function () {
    return this.font;
};
