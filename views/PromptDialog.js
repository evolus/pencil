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
    this.callback = options.callback;

};

PromptDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CANCEL,
        {   type: "accept", title: "OK",
            run: function () {
                if (thiz.callback) thiz.callback(thiz.valueInput.value);
                return true;
            }
        }
    ]
};
