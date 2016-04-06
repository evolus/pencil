function AboutDialog () {
    Dialog.call(this);
    this.tabCurrentActive;
    this.title = "About Pencil";
}

__extend(Dialog, AboutDialog);

AboutDialog.prototype.setup = function (options) {
    fs.readFile("pencil-core/license.txt", 'utf8', (err, data) => {
        if (err) throw err;
        this.licenseText.value = data;
    });
    for (var i = 0; i < this.tabContainer.children.length; i++) {
        if (this.tabContainer.children[i].hasAttribute("active") == true) {
            this.tabCurrentActive = this.tabContainer.children[i];
        }
    }
    var thiz = this;
    this.tabSelector.addEventListener("click", function (event) {
        var tab = event.target.getAttribute("active");
        if (!tab) {
            tab = event.target.getAttribute("name");
            switch (tab) {
                case "tab1":
                thiz.tab1.style.zIndex = 30;
                thiz.tab2.style.zIndex = 20;
                break;
                case "tab2":
                thiz.tab1.style.zIndex = 20;
                thiz.tab2.style.zIndex = 30;
                break;
            }
            event.target.setAttribute("active","true");
            thiz.tabCurrentActive.removeAttribute("active");
            thiz.tabCurrentActive = event.target;
        }
    },false);
}

AboutDialog.prototype.getDialogActions = function () {
    return [
        {
            type: "accept", title: "OK",
            run: function () { return true; }
        }
    ]
};

window.addEventListener("load", function (event) {
    var dialog = new AboutDialog();
    dialog.open();
}, false);
