function EpgzHandler(controller) {
    FileHandler.call(this);
    this.controller = controller;
    this.name = "Pencil Document (GZip Compressed)";
    this.type = EpgzHandler.EXT;
}

__extend(FileHandler, EpgzHandler);

EpgzHandler.EXT = ".epgz";
EpgzHandler.prototype.loadDocument = function(filePath, callback) {
    var thiz = this;

    var targz = require('targz');
    targz.decompress(
    {
        src: filePath,
        dest: Pencil.documentHandler.tempDir.name
    }, function (err) {
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

EpgzHandler.prototype.saveDocument = function (documentPath, callback) {
    var thiz = this;
    var targz = require('targz');
    targz.compress({
        src: Pencil.documentHandler.tempDir.name,
        dest: documentPath,
        tar: {
            dereference : true
        }
    }, function (err){
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
};
