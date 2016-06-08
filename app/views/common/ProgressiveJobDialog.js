function ProgressiveJobDialog () {
    Dialog.call(this);
}

__extend(Dialog, ProgressiveJobDialog);

ProgressiveJobDialog.prototype.setup = function (options) {
    this.options = options || {};
    this.starter = this.options.starter;
    this.title = this.options.title || "Progress";
    this.subTitle = this.options.subTitle || "Please wait while Pencil is excuting job";

    var thiz = this;
    var listener = {
        onTaskDone: function () {
            try {
                Pencil.app.mainWindow.setProgressBar(-1);
                thiz.close();
            } catch (e) {
                console.error(e);
            }
        },
        onProgressUpdated: function (status, completed, total) {
            thiz.statusLabel.innerHTML = Dom.htmlEncode(status || "Please wait...");
            thiz.progressBarInner.style.width = Math.round(100 * completed / total) + "%";

            Pencil.app.mainWindow.setProgressBar(Math.round(completed / total));
        }
    };

    listener.onProgressUpdated("Starting...", 0, 1);

    this.starter(listener);
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
