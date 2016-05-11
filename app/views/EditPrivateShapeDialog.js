function EditPrivateShapeDialog() {
    Dialog.call(this);
    this.title="Edit Private Shape Infomation";
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


EditPrivateShapeDialog.prototype.invalidate = function () {
    if (this.shapeName.value == "" || this.changeIconCheck.checked && this.shapeIcon.value == "")
    {
        Dialog.alert("Empty text box","Please enter all require text box",null);
        return false;
    }
    return true;
}


EditPrivateShapeDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        {
            type: "accept", title: "Save",
            isCloseHandler: true,
            run: function () {
                if(!thiz.invalidate()) return false;

                thiz.shape.displayName = thiz.shapeName.value;
                if (thiz.changeIconCheck.checked) {
                    thiz.shape.shapeIcon = thiz.shapeIcon.value;
                }
                // console.log(thiz.shape);
                if(thiz.onDone) thiz.onDone(thiz.shape);
                return true;
            }
        },
        {
            type: "cancel", title: "Close",
            isCloseHandler: true,
            run: function () { return true; }
        }
    ]
};
