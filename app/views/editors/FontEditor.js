function FontEditor() {
    PropertyEditor.call(this);
}
__extend(PropertyEditor, FontEditor);

FontEditor._setupFontCombo = function (fontCombo, changeEvent, withNullValue) {
    fontCombo.renderer = function (font) {
        return font ? font.family : "Font";
    };
    fontCombo.comparer = function (a, b) {
        if (!a) return !b;
        if (!b) return false;
        return a.family == b.family;
    };

    fontCombo.decorator = function (node, font) {
        if (font) {
            node.style.fontFamily = "'" + font.family + "'";
            if (font._type) {
                node.style.color = "red";
            }
        }
    };

    FontEditor._loadFontItems(fontCombo, withNullValue);
    fontCombo.addEventListener("p:ItemSelected", function(event) {
        // if (OnScreenTextEditor.isEditing) return;
        changeEvent();
    }, false);
};
FontEditor._loadFontItems = function (fontCombo, withNullValue) {
    var localFonts = Local.getInstalledFonts();
    var items = localFonts;
    if (withNullValue) items.unshift("");
    fontCombo.setItems(items);
};
FontEditor.prototype.setup = function () {
    var thiz = this;
    FontEditor._setupFontCombo(this.fontCombo, function () {
        thiz.fireChangeEvent();
    });

    this.bind("p:ItemSelected", this.invalidateWeightCombo, this.fontCombo);

    this.pixelFontSize.addEventListener("input", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing || thiz.pixelFontSize.value == "" || thiz.pixelFontSize.value < 5) return;
        thiz.fireChangeEvent();
    }, false);
    this.pixelFontSize.addEventListener("keyup", function(event) {
        if (event.keyCode == 13 || event.keyCode == 10) {
            if (!thiz.font || OnScreenTextEditor.isEditing) return;
            if (thiz.pixelFontSize.value == "" || thiz.pixelFontSize.value < 5) {
                thiz.pixelFontSize.value = 5;
            }
            thiz.fireChangeEvent();
        }
    }, false);
    this.pixelFontSize.addEventListener("wheel", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing || thiz.pixelFontSize.value == "" || thiz.pixelFontSize.value < 5) return;
        thiz.fireChangeEvent();
    });
    this.pixelFontSize.addEventListener("change", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing) return;
        if (thiz.pixelFontSize.value == "" || thiz.pixelFontSize.value < 5) {
            thiz.pixelFontSize.value = 5;
        }
        thiz.fireChangeEvent();
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
        thiz.fireChangeEvent();
    }, false);

    this.bind("p:ItemSelected", function () {
        if (!thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.fireChangeEvent();
    }, this.weightCombo);

    this.italicButton.addEventListener("click", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing) return;
        var checked = false;
        if (thiz.italicButton.hasAttribute("checked") && thiz.italicButton.getAttribute("checked") == "true") {
            thiz.italicButton.removeAttribute("checked");
        } else {
            thiz.italicButton.setAttribute("checked", "true");
            checked = true;
        }

        thiz.fireChangeEvent();
    }, false);

    this.lineHeight.addEventListener("keyup", function(event) {
        if (event.keyCode == 13 || event.keyCode == 10) {
            if (!thiz.font || OnScreenTextEditor.isEditing) return;
            if (thiz.lineHeight.value == "" || thiz.lineHeight.value < 0) {
                thiz.lineHeight.value = 0;
            }
            thiz.fireChangeEvent();
        }
    }, false);
    this.lineHeight.addEventListener("wheel", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing || thiz.lineHeight.value == "" || thiz.lineHeight.value < 0) return;
        thiz.fireChangeEvent();
    });
    this.lineHeight.addEventListener("change", function(event) {
        if (!thiz.font || OnScreenTextEditor.isEditing) return;
        if (thiz.lineHeight.value == "" || thiz.lineHeight.value < 0) {
            thiz.lineHeight.value = 0;
        }
        thiz.fireChangeEvent();
    }, false);


    this.weightCombo.useHtml = true;
    this.weightCombo.renderer = function (weight, buttonDisplay) {
        var w = FontRepository.WEIGHT_MAP[weight];
        return "<span style=\"font-family: " + this.fontCombo.getSelectedItem().family + "; font-weight: " + weight + ";\">" + (buttonDisplay ? w.shortName : w.displayName) + "</span>";
    }.bind(this);
};

FontEditor.prototype.invalidateWeightCombo = function () {
    var font = this.fontCombo.getSelectedItem();
    this.weightCombo.node().style.fontFamily = font.family;
    this.weightCombo.setItems(font.weights);

    this.useToggle = (font.weights.length <= 2 && (font.weights.indexOf("normal") >= 0 || font.weights.indexOf("bold") >= 0));
    this.node().setAttribute("use-toggle", this.useToggle);
};


FontEditor.prototype.setValue = function (font) {
    if (!font) return;
    this.font = font;
    if (Local.isFontExisting(this.font.family)) {
        this.fontCombo.selectItem(font);
    } else {
        var families = this.font.getFamilies();
        for (var i = 0; i < families.length; i ++) {
            var f = families[i];
            if (Local.isFontExisting(f)) {
                this.fontCombo.selectItem({family: f});
                break;
            }
        }
    }
    //
    if (this.font.size.match(/^([0-9]+)[^0-9]*$/)) {
        this.pixelFontSize.value = RegExp.$1;
        this.fontSize = RegExp.$1;
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

    if (this.font.lineHeight) {
        this.lineHeight.value = this.font.lineHeight;
    }

    this.invalidateWeightCombo();
    this.weightCombo.selectItem(this.font.weight);
};

FontEditor.prototype.getValue = function () {
    var font = new Font();
    font.family = this.fontCombo.getSelectedItem().family;
    font.size = this.pixelFontSize.value + "px";
    if (this.useToggle) {
        font.weight = (this.boldButton.getAttribute("checked") == "true") ? "bold" : "normal";
    } else {
        font.weight = this.weightCombo.getSelectedItem();
    }
    font.style = (this.italicButton.getAttribute("checked") == "true") ? "italic" : "normal";
    font.lineHeight = this.lineHeight.value ? this.lineHeight.valueAsNumber : 0;
    this.fontSize = this.pixelFontSize.valueAsNumber;

    return font;
};
