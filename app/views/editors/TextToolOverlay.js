function TextToolOverlay() {
    BaseTemplatedWidget.call(this);
    var thiz = this;
    this.selectorContainer.onHide = function () {
        thiz.selector._commandName = "";
        thiz.selector._control = null;
    };
    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("command");
        });

        if (!node) return;
        var command = node.getAttribute("command");
        var arg = node.hasAttribute("arg") ? node.getAttribute("arg") : undefined;
        thiz.runEditorCommand(command, arg);
        // if (node == thiz.medCleanUpButton) {
        //     var v = thiz._richTextEditor.getRichtextValue();
        //     try {
        //         v = Dom.getText(Dom.parseToNode(v));
        //         thiz._richTextEditor.setRichtextValue(v);
        //     } catch (e) { }
        //
        // }
    }, this.popupContainer);

    var selectListener = function (event) {
        console.log("selectListener");
        // var temp = OnScreenTextEditor.isEditing;
        // OnScreenTextEditor.isEditing = false;

        thiz.updateListByCommandValue("fontname", thiz.fontCombo);
        thiz.updateListByCommandValue("fontsize", thiz.fontSizeCombo);

        thiz.updateButtonByCommandState("bold", thiz.medBoldButton);
        thiz.updateButtonByCommandState("italic", thiz.medItalicButton);
        thiz.updateButtonByCommandState("underline", thiz.medUnderlineButton);
        thiz.updateButtonByCommandState("strikethrough", thiz.medStrikeButton);

        thiz.updateButtonByCommandState("justifyleft", thiz.malignLeftCommand);
        thiz.updateButtonByCommandState("justifycenter", thiz.malignCenterCommand);
        thiz.updateButtonByCommandState("justifyright", thiz.malignRightCommand);

        thiz.updateColorButtonByCommandValue("forecolor", thiz.mtextColorButton);
        // thiz.updateColorButtonByCommandValue("hiliteColor", thiz.mhilightColorButton);

        // OnScreenTextEditor.isEditing = temp;
    };
    window.document.body.addEventListener("mouseup", selectListener, false);

    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("command");
        });

        if (!node) return;
        if (node.getAttribute("checked") == "true") {
            node.removeAttribute("checked");
        } else {
            node.setAttribute("checked", "true");
        }
    }, this.textFormatContainer);

    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("command");
        });

        if (!node) return;
        node.setAttribute("checked", "true");

        Dom.doOnAllChildren(thiz.malignContainer, function (child) {
            if (child != node && child.removeAttribute) {
                child.removeAttribute("checked");
            }
        });

    }, this.malignContainer);

    FontEditor._setupFontCombo(this.fontCombo, function () {
        thiz.runEditorCommand("fontname", thiz.fontCombo.getSelectedItem().family);
    }, true);

    this.fontSizeCombo.setItems([1, 2, 3, 4, 5, 6, 7]);
    this.fontSizeCombo.addEventListener("p:ItemSelected", function(event) {
        thiz.runEditorCommand("fontsize", thiz.fontSizeCombo.getSelectedItem());
    }, false);

    var changeColorListener = function (control, commandName) {
        var color = thiz.getColorByCommandValue(commandName);
        thiz.selector.setColor(color);
        thiz.selector._commandName = commandName;
        thiz.selector._control = control;
        thiz.selectorContainer.show(control, "left-inside", "bottom", 0, 5);
    };
    this.mtextColorButton.addEventListener("click", function (event) {
        changeColorListener(thiz.mtextColorButton, "forecolor");
        event.cancelBubble = true;
    }, false);

    this.mhilightColorButton.addEventListener("click", function (event) {
        changeColorListener(thiz.mhilightColorButton, "hilitecolor");
        event.cancelBubble = true;
    }, false);

    this.selector.addEventListener("ValueChange", function (event) {
        var color = thiz.selector.getColor();
        var control = thiz.selector._control;
        var commandName = thiz.selector._commandName;
        thiz.runEditorCommand(commandName, color.toRGBAString());
        thiz.updateButtonColor(control, color.toRGBAString());
    }, false);
}
__extend(BaseTemplatedWidget, TextToolOverlay);

TextToolOverlay.prototype.updateListByCommandValue = function (commandName, control) {
    var value = null;
    try {
        value = window.document.queryCommandValue(commandName);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }

    if (value && control == this.fontCombo) {
        value = value.replace(/[']/g,'');
        if (value.split(",").length > 0) value = value.split(",")[0];
        value = {family: value.replace(/[']/g,'')};
    }
    control.selectItem(value);
};

TextToolOverlay.prototype.getColorByCommandValue = function (commandName) {
    var value = null;
    try {
        value = window.document.queryCommandValue(commandName);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }
    if (value == null) return null;
    return Color.fromString(value);
};

TextToolOverlay.prototype.updateColorButtonByCommandValue = function (commandName, control) {
    var value = this.getColorByCommandValue(commandName);
    if (control.localName == "button") {
        if (value == null) return;
        this.updateButtonColor(control, value.toRGBString());
    }
};
TextToolOverlay.prototype.updateButtonColor = function (control, value) {
    if (control == this.mhilightColorButton) {
        this.colorDisplay.style.backgroundColor = value;
    } else if (control == this.mtextColorButton) {
        this.mtextColorButton.style.color = value;
    }
};
TextToolOverlay.prototype.updateButtonByCommandState = function (commandName, control) {
    var value = null;
    try {
        value = window.document.queryCommandState(commandName);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }

    if (value) {
        control.setAttribute("checked", "true");
    } else {
        control.removeAttribute("checked");
    }
};
TextToolOverlay.prototype.showToolBar = function (target, anchor, popup, hAlign, vAlign, hPadding, vPadding, autoFlip) {
    this.target = target;
    this.relatedPopup = popup;
    this.show(anchor, hAlign, vAlign, hPadding, vPadding, autoFlip);
};
TextToolOverlay.prototype.showToolBarAt = function (target, x, y) {
    this.target = target;
    this.showAt(x, y);
};

TextToolOverlay.prototype.dontCloseUpward = function (event) {
    var thiz = this;
    var node = Dom.findUpward(event.target, function (n) {
        return thiz.relatedPopup && n == thiz.relatedPopup.popupContainer;
    });
    return node;
    // return true;
};

TextToolOverlay.prototype.onHide = function () {
    if (this.relatedPopup) {
        this.relatedPopup.hide("silent");
    }
};

TextToolOverlay.prototype.runEditorCommand = function (command, arg) {
    try {
        if (typeof(arg) != "undefined") {
            window.document.execCommand(command, false, arg);
        } else {
            window.document.execCommand(command, false, null);
        }
    } catch (e) {
        alert(e);
    }
};
