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
        if (command == "decreaseFontSize" || command == "increaseFontSize") {
            arg = thiz.queryFontSizeValue();
            arg = arg + (command == "decreaseFontSize" ? -1 : 1);
            if (arg >= 1 && arg <= 7) {
                command = "fontSize";
                thiz.runEditorCommand(command, arg);
                thiz.fixFontSize();
                thiz.fontSizeCombo.selectItem(arg);
            }
            return;
        }
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
        // var temp = OnScreenTextEditor.isEditing;
        // OnScreenTextEditor.isEditing = false;

        thiz.updateListByCommandValue("fontname", thiz.fontCombo);
        thiz.fontSizeCombo.selectItem(thiz.queryFontSizeValue());

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
        if (thiz.currentRange) {
            thiz.editor.setAttribute("contenteditable", "true");
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(thiz.currentRange);
            thiz.currentRange = null;
        }
        thiz.runEditorCommand("fontname", thiz.fontCombo.getSelectedItem().family);
    }, true);

    this.fontCombo.addEventListener("keydown", function(event) {
        if (!thiz.currentRange) {
            thiz.currentRange = window.getSelection().getRangeAt(0);
            thiz.editor.removeAttribute("contenteditable");
            thiz.settingFont = true;
        }
        window.setTimeout(function () {
            thiz.fontCombo.button.focus();
        }, 10);
    }, false)

    this.fontCombo.popup.addEventListener("p:PopupHidden", function() {
        if (thiz.currentRange) {
            thiz.editor.setAttribute("contenteditable", "true");
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(thiz.currentRange);
            thiz.currentRange = null;

        }
        if (thiz.settingFont) {
            thiz.settingFont = null;
        }
    }, false)

    this.fontSizeCombo.setItems([1, 2, 3, 4, 5, 6, 7]);
    this.fontSizeCombo.addEventListener("p:ItemSelected", function(event) {
        thiz.runEditorCommand("fontsize", thiz.fontSizeCombo.getSelectedItem());
        thiz.fixFontSize();
    }, false);

    // this.medIncreaseFontButton.addEventListener("click", function(event){
    //     var size = thiz.queryFontSizeValue();
    //     if (size < 7) {
    //         thiz.runEditorCommand("fontSize", size + 1);
    //         thiz.fixFontSize();
    //     }
    // }, false)

    // this.medDecreaseFontButton.addEventListener("click", function(event){
    //     var size = thiz.queryFontSizeValue();
    //     if (size > 1) {
    //         thiz.runEditorCommand("fontSize", size - 1);
    //         thiz.fixFontSize();
    //     }
    // }, false)

    var changeColorListener = function (control, commandName) {
        var color = thiz.getColorByCommandValue(commandName);
        thiz.selector.setColor(color);
        thiz.selector._commandName = commandName;
        thiz.selector._control = control;

        thiz.selectorContainer.show(control, "left-inside", "bottom", 0, 5);
        Dom.addClass(thiz._richTextEditor.textEditorWrapper, "ChoosingColor");
        thiz.selector.focus();
    };
    this.selectorContainer.addEventListener("p:PopupHidden", function() {
        Dom.removeClass(thiz._richTextEditor.textEditorWrapper, "ChoosingColor");
    }, false)
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

    this.selector.addEventListener("p:CloseColorSelector", function (event) {
        thiz.selectorContainer.hide();
    }, false);
}
__extend(BaseTemplatedWidget, TextToolOverlay);

TextToolOverlay.FONT_SIZES = [
    { name: "x-small", value: 0.6 },
    { name: "small", value: 0.8 },
    { name: "medium", value: 1 },
    { name: "large", value: 1.2 },
    { name: "x-large", value: 1.4 },
    { name: "xx-large", value: 1.8 },
    { name: "-webkit-xxx-large", value: 2.2 }
];

TextToolOverlay.DEFAULT_FONT = 2;
TextToolOverlay.FONT_SIZE_MAP = {

};

for (var fontMap of TextToolOverlay.FONT_SIZES) {
    TextToolOverlay.FONT_SIZE_MAP[fontMap.name] = fontMap.value;
}

TextToolOverlay.prototype.fixFontSize = function () {
    var container = this._richTextEditor.textEditor;
    Dom.doOnAllChildRecursively(container, function (node) {
        if (node.style && node.style.fontSize) {
            var em = TextToolOverlay.FONT_SIZE_MAP[node.style.fontSize];
            if (em) {
                node.style.fontSize = em + "em";
            }
        }
    });
};
TextToolOverlay.prototype.queryFontSizeValue = function () {
    var node = window.getSelection().anchorNode;
    if (!node) return TextToolOverlay.DEFAULT_FONT;
    if (!node.style) node = node.parentNode;
    if (!node.style.fontSize || !node.style.fontSize.match(/^([0-9\.]+)em$/)) return TextToolOverlay.DEFAULT_FONT;
    var size = parseFloat(RegExp.$1);
    var found = TextToolOverlay.DEFAULT_FONT;
    for (var index = 1; index <= TextToolOverlay.FONT_SIZES.length; index ++) {
        var v = TextToolOverlay.FONT_SIZES[index - 1].value;
        if (v <= size) {
            found = index;
        }
    }

    return found;
};

TextToolOverlay.prototype.updateListByCommandValue = function (commandName, control) {
    var value = null;
    try {
        value = window.document.queryCommandValue(commandName);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }

    if (value && control == this.fontCombo) {
        if (value.indexOf(" ") > 0) {
            value = value.substring(1, value.length - 1);
        }
        if (value.indexOf(",") >= 0) {
            value = null;
        } else {
            value = {family: value.replace(/[']/g,'')};
        }
        // value = {family: value.replace(/[']/g,'')};
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
        // this.mhilightColorButton.style.color = value;
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
        this.editor.focus();
        this.settingFont = null;
        if (typeof(arg) != "undefined") {
            window.document.execCommand(command, false, arg);
        } else {
            var check = window.document.queryCommandSupported(command);
            if (check) {
                window.document.execCommand(command, false, null);
            }
        }

    } catch (e) {
        alert(e);
    }
};
