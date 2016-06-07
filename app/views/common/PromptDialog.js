function PromptDialog() {
    Dialog.call(this);
    this.title = "Enter value";
}
__extend(Dialog, PromptDialog);

PromptDialog.prototype.setup = function (options) {
    if (options.defaultValue != undefined) {
        this.valueInput.value = options.defaultValue;
    }
    if (options.title) this.title = options.title;
    if (options.message) this.message.innerHTML = options.message;
    if (options.value != undefined) {
        this.valueInput.value = options.value;
    }

    if (typeof(options.value) == "number" || typeof(options.defaultValue) == "number") {
        this.valueInput.setAttribute("type", "number");
        this.valueInput.style.width = "6em";
    }

    this.callback = options.callback;

    window.setTimeout(function () {
        this.valueInput.focus();
        this.valueInput.select();
    }.bind(this), 200);
};
PromptDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        {   type: "cancel", title: "Cancel",
            run: function () {
                if (thiz.callback) thiz.callback(null);
                return true;
            }
        },
        {   type: "accept", title: "OK",
            run: function () {
                if (thiz.callback) thiz.callback(thiz.valueInput.value);
                return true;
            }
        }
    ]
};
