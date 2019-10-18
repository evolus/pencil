function SharedFontEditor() {
    BaseTemplatedWidget.call(this);
    Pencil.registerSharedEditor(this);

    ToolBar.setupFocusHandling(this.node());
}
__extend(BaseTemplatedWidget, SharedFontEditor);
SharedFontEditor.PROPERTY_NAME = "textFont";

SharedFontEditor.prototype.setup = function () {
    this.fontCombo.setDisabled(true);
    this.pixelFontSize.disabled = true;
    this.boldButton.disabled = true;
    this.italicButton.disabled = true;
    this.formatPainterButton.disabled = true;
    this.disabledEditor = true;

    var thiz = this;

    FontEditor._setupFontCombo(this.fontCombo, function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.font.family = thiz.fontCombo.getSelectedItem().family;
        thiz._applyValue();
    });

    this.bind("p:ItemSelected", this.invalidateWeightCombo, this.fontCombo);

    this.pixelFontSize.addEventListener("input", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing || thiz.pixelFontSize.value == "" || thiz.pixelFontSize.value == "0") return;
        thiz.font.size = thiz.pixelFontSize.value + "px";
        thiz._applyValue();
    }, false);

    this.pixelFontSize.addEventListener("wheel", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing || thiz.pixelFontSize.value == "") return;
        thiz.font.size = thiz.pixelFontSize.value + "px";
        thiz._applyValue();
    });
    this.pixelFontSize.addEventListener("keyup", function(event) {
        if (event.keyCode == 13 || event.keyCode == 10) {
            if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing || thiz.pixelFontSize.value == "") return;
            thiz.pixelFontSize.value = Math.max(5,  parseInt(thiz.pixelFontSize.value, 10));
            thiz.font.size = thiz.pixelFontSize.value + "px";
            thiz._applyValue();
        }
    }, false);
    this.pixelFontSize.addEventListener("change", function(event) {
        if (thiz.pixelFontSize.value == "") {
            thiz.pixelFontSize.value = 5;
        }
    }, false);

    this.boldButton.addEventListener("click", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
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

    this.bind("p:ItemSelected", function () {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
        thiz.font.weight = thiz.weightCombo.getSelectedItem();
        thiz._applyValue();

    }, this.weightCombo);


    this.italicButton.addEventListener("click", function(event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
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

    this.formatPainterButton.addEventListener("click", function (event) {
        if (!thiz.target || !thiz.font || OnScreenTextEditor.isEditing) return;
        if (thiz.formatPainterButton.setAttribute) {
            thiz.formatPainterButton.setAttribute("checked", "true");
        }
        thiz.beginFormatPainter();
    }, false);

    this.weightCombo.useHtml = true;
    this.weightCombo.renderer = function (weight, buttonDisplay) {
        var w = FontRepository.WEIGHT_MAP[weight];
        return "<span style=\"font-family: " + (this.fontCombo.getSelectedItem().family || "").replace(/"/g, "'") + "; font-weight: " + weight + ";\">" + (buttonDisplay ? w.shortName : w.displayName) + "</span>";
    }.bind(this);

    Pencil.formatPainterButton = this.formatPainterButton;
};
SharedFontEditor.prototype.invalidateWeightCombo = function () {
    var font = this.fontCombo.getSelectedItem();
    this.weightCombo.node().style.fontFamily = font.family;
    this.weightCombo.setItems(font.weights);

    if (this.font && this.font.weight) this.weightCombo.selectItem(this.font.weight);

    this.useToggle = !font.weights || (font.weights.length <= 2 && (font.weights.indexOf("normal") >= 0 || font.weights.indexOf("bold") >= 0));
    this.node().setAttribute("use-toggle", this.useToggle);
};
SharedFontEditor.prototype.reloadFontItems = function () {
    FontEditor._loadFontItems(this.fontCombo);
};
SharedFontEditor.prototype.beginFormatPainter = function () {
    var activeCanvas = Pencil.activeCanvas;

    if (activeCanvas.isFormatPainterAvailable()) {
        return activeCanvas.endFormatPainter();
    }
    if (!activeCanvas.currentController) return;
    try {
        var target = activeCanvas.currentController;
        if (target
                && (target.constructor == Shape || target.constructor == Group)) {
            Pencil._painterSourceTarget = target;
            Pencil._painterSourceProperties = target.getProperties();

            document.body.setAttribute("format-painter", "true");
        }
    } catch (e) {
        Console.dumpError(e);
    }

};

SharedFontEditor.prototype.isDisabled = function () {
    return this.disabledEditor;
};
SharedFontEditor.prototype._applyValue = function () {
    var thiz = this;
    Pencil.activeCanvas.run(function() {
        this.setProperty(SharedFontEditor.PROPERTY_NAME, thiz.font);
    }, this.target, Util.getMessage("action.apply.properties.value"))
};
SharedFontEditor.prototype.attach = function (target) {
    if (target && target.getAttributeNS && target.getAttributeNS(PencilNamespaces.p, "locked") == "true") { return; }

    this.target = target;
    this.font = target.getProperty(SharedFontEditor.PROPERTY_NAME, "any");

    if (!this.font) {
        this.detach();
        return;
    }

    this.fontCombo.setDisabled(false);
    this.weightCombo.setDisabled(false);
    this.pixelFontSize.disabled = false;
    this.boldButton.disabled = false;
    this.italicButton.disabled = false;
    this.disabledEditor = false;

    // //set the value
    var matched = this.fontCombo.selectItem(this.font);

    if (!matched) {
        var families = this.font.getFamilies();
        for (var i = 0; i < families.length; i ++) {
            var f = families[i];
            if (Local.isFontExisting(f)) {
                this.fontCombo.selectItem({family: f});
                break;
            }
        }
    }
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

    this.invalidateWeightCombo();

    var formatPainter = Pencil.activeCanvas && target && (target.constructor == Group || target.constructor == Shape);
    this.formatPainterButton.disabled = !formatPainter;
};
SharedFontEditor.prototype.detach = function () {
    this.fontCombo.setDisabled(true);
    this.weightCombo.setDisabled(true);
    this.pixelFontSize.disabled = true;
    this.boldButton.disabled = true;
    this.italicButton.disabled = true;
    this.formatPainterButton.disabled = true;
    this.disabledEditor = true;

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
