function EditPageNoteDialog () {
    Dialog.call(this);
    this.title = "Edit Page Note";
    this.fontSizeCombo.renderer = function(textSize) {
        if (!textSize.value) return textSize.displayName;
        return textSize.displayName + " (" + textSize.value + "pt )";
    }
    this.setup();
}
__extend(Dialog, EditPageNoteDialog);

EditPageNoteDialog.prototype.setup = function () {
    var thiz = this;
    var localFonts = Local.getInstalledFonts();
    thiz.fontCombo.setItems(localFonts);
    var textSize = [
        {
            displayName: "Size"
        },
        {
            value: "12",
            displayName: "1"
        },
        {
            value: "14",
            displayName: "2"
        },
        {
            value: "16",
            displayName: "3"
        },
        {
            value: "18",
            displayName: "4"
        },
        {
            value: "20",
            displayName: "5"
        },
        {
            value: "22",
            displayName: "6"
        }
    ];
    thiz.fontSizeCombo.setItems(textSize);

    thiz.mtextColorButton.addEventListener("click", function (event) {
        var color = thiz.mtextColorButton.bgColor ? thiz.mtextColorButton.bgColor : Color.fromString("#FFFFFF");
        console.log("color button test");
        thiz.selector.setColor(color);
        thiz.selectorContainer.show(thiz.mtextColorButton, "left-inside", "bottom", 0, 5);
        event.cancelBubble = true;
    }, false);

    thiz.mhilightColorButton.addEventListener("click", function (event) {
        thiz.selectorContainer.show(thiz.mhilightColorButton, "left-inside", "bottom", 0, 5);
        event.cancelBubble = true;
    }, false);

    thiz.fontSizeCombo.addEventListener("click", function (event) {

    }, false);

    this.bind("click", function (event) {
        console.log("text tool overlay click");
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("command");
        });

        if (!node) return;
        console.log("node:", node);
        var command = node.getAttribute("command");
        var arg = node.hasAttribute("arg") ? node.getAttribute("arg") : undefined;
        thiz.runEditorCommand(command, arg);
    }, thiz.popupContainer);

    window.document.body.addEventListener("mouseup", selectListener, false);
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

var selectListener = function (event) {
    // var temp = OnScreenTextEditor.isEditing;
    // OnScreenTextEditor.isEditing = false;
    var thiz = this;
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


EditPageNoteDialog.prototype.runEditorCommand = function (command, arg) {
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

EditPageNoteDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CANCEL,
        {   type: "accept", title: "OK",
            run: function () {
                return true;
            }
        }
    ]
};
