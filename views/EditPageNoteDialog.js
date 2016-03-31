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
    }, this.popupContainer);

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
