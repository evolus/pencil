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

    const decompress = require('decompress');
    const decompressTargz = require('decompress-targz');

    decompress(filePath, Pencil.documentHandler.tempDir.name, {
        plugins: [
            decompressTargz()
        ]
    }).then(() => {
        thiz.parseDocument(filePath, callback);
    }).catch ((err) => {
        callback({
            error: FileHandler.ERROR_FILE_LOADING_FAILED,
            message: "File could not be loaded."
        });
    });
}

EpgzHandler.prototype.saveDocument = function (documentPath, callback) {
    var thiz = this;
    var targz = require('tar.gz');
    new targz({}, {fromBase: true}).compress(Pencil.documentHandler.tempDir.name, documentPath)
        .then(function () {
            if (callback) callback();
        })
        .catch(function (err) {
            if (callback) {
                callback({
                    error: FileHandler.ERROR_FILE_SAVING_FAILED,
                    message: "Unable to save file: " + err,
                    cause: err
                });
            }
        });
};
