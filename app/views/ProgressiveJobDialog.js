function ProgressiveJobDialog () {
    Dialog.call(this);
}

__extend(Dialog, ProgressiveJobDialog);

ProgressiveJobDialog.prototype.setup = function (options) {
    this.options = options || {};
    this.starter = this.options.starter;
    this.title = this.options.title || "Progress";
    this.onProgressUpdated("Starting...", 0, 1);
    this.starter(this);
}
ProgressiveJobDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        {
            type: "cancel", title: "Cancel",
            isCloseHandler: true,
            isApplicable: function () {
                return thiz.options.cancelable;
            },
            run: function () { return true; }
        }
    ]
};

ProgressiveJobDialog.prototype.onTaskDone = function () {
    this.close();
};
ProgressiveJobDialog.prototype.onProgressUpdated = function (status, completed, total) {
    this.statusLabel.innerHTML = Dom.htmlEncode(status || "Please wait...");
    this.progressBarInner.style.width = Math.round(100 * completed / total) + "%";
};
