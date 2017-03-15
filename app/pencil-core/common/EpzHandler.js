function EpzHandler (controller) {
    FileHandler.call(this);
    this.controller = controller;
    this.name = "Pencil Document (Compressed)";
    this.type = EpzHandler.EXT;
}
__extend(FileHandler, EpzHandler);

EpzHandler.EXT = ".epz";
EpzHandler.prototype.loadDocument = function(filePath, callback) {
    var thiz = this;
    var admZip = require('adm-zip');

    var zip = new admZip(filePath);
    zip.extractAllToAsync(Pencil.documentHandler.tempDir.name, true, function (err) {
        if (err) {
            callback({
                error: FileHandler.ERROR_FILE_LOADING_FAILED,
                message: "File could not be loaded."
            });
        } else {
            thiz.parseDocument(filePath, callback);
        }
    });
}

EpzHandler.prototype.saveDocument = function (documentPath, callback) {
    var thiz = this;
    var easyZip = require("easy-zip2").EasyZip;
    var zip = new easyZip();
    zip.zipFolder(Pencil.documentHandler.tempDir.name + "/.", function (err) {
        if (err) {
            if (callback) {
                callback({
                    error: FileHandler.ERROR_FILE_SAVING_FAILED,
                    message: "Unable to save file: " + err,
                    cause: err
                });
            }
        } else {
            zip.writeToFile(documentPath, function (err) {
                if (err) {
                    if (callback) {
                        callback({
                            error: FileHandler.ERROR_FILE_SAVING_FAILED,
                            message: "Unable to save file: " + err,
                            cause: err
                        });
                    }
                } else {
                    if (callback) callback();
                }
            });
        }
    });
};
