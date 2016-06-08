function EditPrivateShapeDialog() {
    Dialog.call(this);
    this.title="Private Shape";
    this.subTitle = "Edit private shape information";
    this.modified = false;
    this.bind("change", function() {
        var value = this.changeIconCheck.checked;
        if (!value) {
            this.shapeIcon.disabled = "true";
            this.browse.disabled = "true";
        } else {
            this.shapeIcon.disabled = false;
            this.browse.disabled = false;
        }
    }, this.changeIconCheck)

    this.bind("change",function () {this.modified = true;}, this.shapeName);
    this.bind("change",function () {this.modified = true;}, this.shapeIcon);
    var thiz = this;
    this.browse.addEventListener("click", function(event) {
        thiz.browseIconFile();
    }, false);
}
__extend(Dialog, EditPrivateShapeDialog);

EditPrivateShapeDialog.prototype.setup = function (options) {
    if (options && options.shape) {
        this.shape = options.shape;
    }
    if (options && options.onDone) {
        this.onDone = options.onDone;
    }
    this.shapeName.value = this.shape.displayName;
}

EditPrivateShapeDialog.prototype.browseIconFile = function() {
    var thiz = this;
    dialog.showOpenDialog({
        title: "Open Icon File",
        defaultPath: os.homedir(),
        filters: [
            { name: "Icon File", extensions: ["icon", "png"] }
        ]
    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        thiz.modified = true;
        thiz.shapeIcon.value = filenames;
    });
}

EditPrivateShapeDialog.prototype.invalidate = function () {
    if (this.shapeName.value == "" || this.changeIconCheck.checked && this.shapeIcon.value == "")
    {
        Dialog.alert("Empty text box","Please enter all require text box",null);
        return false;
    }
    return true;
}

EditPrivateShapeDialog.prototype.onFinish = function () {
    var thiz = this;
    thiz.shape.displayName = thiz.shapeName.value;
    if (thiz.changeIconCheck.checked) {
        thiz.shape.shapeIcon = thiz.shapeIcon.value;
        var image = nativeImage.createFromPath(thiz.shape.shapeIcon);
        thiz.shape.iconData = image.toDataURL();
    }
    // console.log(thiz.shape);
    if(thiz.onDone) thiz.onDone(thiz.shape);
}

EditPrivateShapeDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        {
            type: "accept", title: "Save",
            isCloseHandler: true,
            run: function () {
                if(!thiz.invalidate()) return false;
                thiz.onFinish();
                return true;
            }
        },
        {
            type: "cancel", title: "Cancel",
            isCloseHandler: true,
            run: function () {
                if (this.modified) {
                    Dialog.confirm(
                        "Do you want to save your changes before closing?", null,
                        "Save", function () {
                            if(!thiz.invalidate()) return false;
                            thiz.onFinish();
                            return true;
                        },
                        "Cancel"
                    )
                }
                return true;
            }
        }
    ]
};
