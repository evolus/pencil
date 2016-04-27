function AboutDialog () {
    Dialog.call(this);
    this.tabCurrentActive;
    this.title = "About Pencil";
}

__extend(Dialog, AboutDialog);

AboutDialog.prototype.setup = function (options) {
    this.getLicense();
    this.tabHeader.addTab("Credits", this.creditsTab);
    this.tabHeader.addTab("License", this.LicenseTab);
    //this.tabHeader.setSelectedTab(this.tabHeader.tabs[0]);
}

AboutDialog.prototype.getLicense = function (thiz) {
    fs.readFile("app/pencil-core/license.txt", (err, data) => {
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
