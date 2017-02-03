function EpHandler(controller) {
    FileHandler.call(this);
    this.controller = controller;
    this.name = "Pencil Document (Legacy)";
    this.type = ".ep";
}
__extend(FileHandler, EpHandler);

EpHandler.prototype.loadDocument = function(filePath, callback) {
    ApplicationPane._instance.busy();
    this.controller.applicationPane.pageListView.restartFilterCache();
    Pencil.documentHandler.resetDocument();
    var thiz = this;
    if (!fs.existsSync(filePath)) {
        Dialog.error("File doesn't exist", "Please check if your file was moved or deleted.");
        thiz.removeRecentFile(filePath);
        ApplicationPane._instance.unbusy();
        Pencil.documentHandler.newDocument()
        if (callback) callback();
        return;
    };
    try {
        thiz.parseOldFormatDocument(filePath, callback);
    } catch(e) {
        ApplicationPane._instance.unbusy();
    }
}
