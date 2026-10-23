function CollectionBrowserDialog (collectionPanel, managerDialog) {
    this.grabHeight = true;
    this.grabWidth = true;
    this.heightMargin = 5 * Util.em();
    this.widthMargin = 15 * Util.em();
    Dialog.call(this);

    this.collectionPanel = collectionPanel;
    this.managerDialog = managerDialog;
    this.title = "Collection Repository";
    this.subTitle = "Browse the user-contributed collection repository."
    
    var thiz = this;
    
    this.bind("e:TabChange", function (event) {
        var tab = this.tabPane.getActiveTabPane();
        if (!tab._initialized) {
            tab._initialized = true;
            tab.__widget.loadCollectionList();
        }
    }, this.tabPane);

}
__extend(Dialog, CollectionBrowserDialog);

CollectionBrowserDialog.prototype.setup = function() {
    var thiz = this;
    var repos = CollectionRepository.getCollectionRepos();
    repos.forEach(function (repo) {
        var view = new CollectionRepoBrowserView(thiz.collectionPanel, thiz.managerDialog, repo);
        thiz.tabPane.addTab(repo.name, view.node());
    });
};

CollectionBrowserDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CLOSE,
        {
            type: "extra1", title: "Install From URL...",
            run: function () {
                Dialog.prompt("Enter your url here", "", "OK", function (value) {
                    let url = value;
                    if (!url) { return; }

                    CollectionManager.installCollectionFromUrl(url, () => {
                    });
                }, "Cancel");

                return false;
            }
        }
    ]
};
