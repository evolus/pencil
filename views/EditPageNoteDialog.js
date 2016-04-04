function EditPageNoteDialog () {
    Dialog.call(this);
    this.title = "Edit Page Note";
    //this.initialize();

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

    this.runEditorCommand = function (command, arg) {
        this.editor.focus();
        try {
            if (typeof(arg) != "undefined") {
                window.document.execCommand(command, false, arg);
            } else {
                window.document.execCommand(command, false, null);
            }
        } catch (e) {
            alert(e);
        }
        selectListener(this);
    };

    var thiz = this;

    var changeColorListener = function (control, commandName) {
        var color = thiz.getColorByCommandValue(commandName);
        thiz.selector._commandName = commandName;
        thiz.selector._control = control;
        thiz.selector.setColor(color);
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

    var selectListener = function (event) {
        thiz.updateListByCommandValue("fontname", thiz.fontCombo);
        thiz.updateListByCommandValue("fontsize", thiz.fontSizeCombo);

        thiz.updateButtonByCommandState("bold", thiz.medBoldButton);
        thiz.updateButtonByCommandState("italic", thiz.medItalicButton);
        thiz.updateButtonByCommandState("underline", thiz.medUnderlineButton);
        thiz.updateButtonByCommandState("strikethrough", thiz.medStrikeButton);

        thiz.updateButtonByCommandState("justifyleft", thiz.malignLeftCommand);
        thiz.updateButtonByCommandState("justifycenter", thiz.malignCenterCommand);
        thiz.updateButtonByCommandState("justifyright", thiz.malignRightCommand);

        thiz.updateButtonByCommandState("insertunorderedlist", thiz.medBulletedListButton);
        thiz.updateButtonByCommandState("insertorderedlist", thiz.medNumberedListButton);

        thiz.updateColorButtonByCommandValue("forecolor", thiz.mtextColorButton);
    };

    window.document.body.addEventListener("mouseup", selectListener, false);
}
__extend(Dialog, EditPageNoteDialog);


EditPageNoteDialog.prototype.setup = function (options) {
    if (options) {
        if (options.onDone) {
            this.onDone = options.onDone;
        }
        if (options.defaultPage) {
            this.page = options.defaultPage;
            var parentNode = this.popupContainer.parentNode;
            if(this.page._pageNote) {
                var defaultEditor = this.page._pageNote;
                this.editor.innerHTML = defaultEditor.html.innerHTML;
            }

        }
    }
    var thiz = this;

    var localFonts = Local.getInstalledFonts();
    this.fontCombo.setItems(localFonts);

    this.fontSizeCombo.setItems([1, 2, 3, 4, 5, 6, 7]);

    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("command");
        });
        if (!node) return;
        var command = node.getAttribute("command");
        var arg = node.hasAttribute("arg") ? node.getAttribute("arg") : undefined;
        thiz.runEditorCommand(command, arg);
    }, this.popupContainer);

    FontEditor._setupFontCombo(this.fontCombo, function () {
        thiz.runEditorCommand("fontname", thiz.fontCombo.getSelectedItem());
    }, true);

    this.fontSizeCombo.addEventListener("p:ItemSelected", function(event) {
        thiz.runEditorCommand("fontsize", thiz.fontSizeCombo.getSelectedItem());
    }, false);

    var blockDefault = [
        {
            displayName: "Block format"
        },
        {
            value: "P",
            displayName: "Normal"
        },
        {
            value: "H1",
            displayName: "Heading 1"
        },
        {
            value: "H2",
            displayName: "Heading 2"
        },
        {
            value: "H3",
            displayName: "Heading 3"
        },
        {
            value: "H4",
            displayName: "Heading 4"
        },
        {
            value: "H5",
            displayName: "Heading 5"
        },
        {
            value: "H6",
            displayName: "Heading 6"
        }
    ];

    this.blockformat.renderer = function (block) {
        if (!block.value) return block.displayName;
        return block.displayName;
    }
    this.blockformat.setItems(blockDefault);
    this.blockformat.addEventListener("p:ItemSelected", function(event) {
        var value;
        try {
             value = thiz.blockformat.getSelectedItem().value;
        }
        catch (e) {
            return;
        }
        thiz.runEditorCommand("formatBlock", value);
    }, false);

    var pageChild = function (child, editor) {
        return child;
    }


};

EditPageNoteDialog.prototype.updateListByCommandValue = function (commandName, control) {
    var value = null;
    try {
        value = window.document.queryCommandValue(commandName);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }

    if (value && control == this.fontCombo) value = value.replace(/[']/g,'');
    control.selectItem(value);
};

EditPageNoteDialog.prototype.getColorByCommandValue = function (commandName) {
    var value = null;
    try {
        value = window.document.queryCommandValue(commandName);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }
    if (value == null) return null;
    return Color.fromString(value);
};

EditPageNoteDialog.prototype.updateColorButtonByCommandValue = function (commandName, control) {
    var value = this.getColorByCommandValue(commandName);
    if (control.localName == "button") {
        if (value == null) return;
        this.updateButtonColor(control, value.toRGBString());
    }
};

EditPageNoteDialog.prototype.updateButtonColor = function (control, value) {
    if (control == this.mhilightColorButton) {
        this.colorDisplay.style.backgroundColor = value;
    } else if (control == this.mtextColorButton) {
        this.mtextColorButton.style.color = value;
    }
};

EditPageNoteDialog.prototype.updateButtonByCommandState = function (commandName, control) {
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

EditPageNoteDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CANCEL,
        {   type: "accept", title: "Apply",
            run: function () {
                this.onDone(this.editor);
                return true;
            }
        }
    ]
};
