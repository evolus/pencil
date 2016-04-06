function AboutDialog () {
    Dialog.call(this);
    this.tabCurrentActive;
    this.title = "About Pencil";
}

__extend(Dialog, AboutDialog);

AboutDialog.prototype.getLicense = function (thiz) {

}
AboutDialog.prototype.setup = function (options) {
    fs.readFile("pencil-core/license.txt", (err, data) => {
        if (err) throw err;
        this.licenseText.value = data;
    });
    this.tabHeader.addTab("Credits", this.creditsTab);
    this.tabHeader.addTab("License", this.LicenseTab);
    this.tabHeader.setSelectedTab(this.tabHeader.tabs[0]);
}

AboutDialog.prototype.getDialogActions = function () {
    return [
        {
            type: "accept", title: "OK",
            run: function () { return true; }
        }
    ]
};
window.addEventListener("load", function () {
    var dialog = new AboutDialog();
    dialog.open();
},false)
