function EpzHandler (controller) {
    FileHandler.call(this);
    this.controller = controller;
    this.name = "Pencil Document (Compressed)";
    this.type = EpzHandler.EXT;
}
__extend(FileHandler, EpzHandler);

EpzHandler.EXT = ".epz";
EpzHandler.prototype.loadDocument = function(filePath, callback) {
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
    var admZip = require('adm-zip');
    try {
        var zip = new admZip(filePath);
        zip.extractAllToAsync(Pencil.documentHandler.tempDir.name, true, function() {
            thiz.parseDocument(filePath, callback);
        });
    } catch(e) {
        thiz.parseOldFormatDocument(filePath, callback);
        ApplicationPane._instance.unbusy();
    }
}

EpzHandler.prototype.saveDocument = function (documentPath, onSaved) {
    if (!this.controller.doc) throw "No document";
    if (!documentPath) throw "Path not specified";

    this.controller.updateCanvasState();
    this.controller.oldPencilDoc = false;

    var thiz = this;
    ApplicationPane._instance.busy();
    this.controller.serializeDocument(function () {
    this.controller.addRecentFile(documentPath, this.controller.getCurrentDocumentThumbnail());
    var easyZip = require("easy-zip2").EasyZip;
    var zip = new easyZip();
    zip.zipFolder(Pencil.documentHandler.tempDir.name + "/.", function() {
        zip.writeToFile(documentPath, function(){
            thiz.controller.sayDocumentSaved();
            ApplicationPane._instance.unbusy();
            if (onSaved) onSaved();
        });
    });
    }.bind(this));
    thiz.controller.applicationPane.onDocumentChanged();
    thiz.controller.sayControllerStatusChanged();
};
