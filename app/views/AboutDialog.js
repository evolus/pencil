function AboutDialog () {
    Dialog.call(this);
    this.tabCurrentActive;
    this.title = "About Pencil";
}

__extend(Dialog, AboutDialog);

AboutDialog.prototype.setup = function (options) {
    this.getLicense();
}

AboutDialog.prototype.getLicense = function (thiz) {
    fs.readFile(__dirname + "/license.txt", (err, data) => {
        if (err) throw err;
        this.licenseText.value = data;
    });
}

AboutDialog.prototype.getDialogActions = function () {
    return [
        {
            type: "cancel", title: "Close",
            isCloseHandler: true,
            run: function () { return true; }
        }
    ]
};
