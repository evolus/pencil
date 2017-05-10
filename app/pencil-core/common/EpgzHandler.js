function EpgzHandler(controller) {
    FileHandler.call(this);
    this.controller = controller;
    this.name = "Pencil Document (GZip Compressed)";
    this.type = EpgzHandler.EXT;
}

__extend(FileHandler, EpgzHandler);

EpgzHandler.EXT = ".epgz";
EpgzHandler.prototype.loadDocument = function(filePath) {
    var thiz = this;
    return new Promise(function (resolve, reject) {
        const decompress = require('decompress');
        const decompressTargz = require('decompress-targz');

        decompress(filePath, Pencil.documentHandler.tempDir.name, {
            plugins: [
                decompressTargz()
            ]
        }).then(() => {
            thiz.parseDocument(filePath, resolve);
        }).catch ((err) => {
            reject(new Error("File could not be loaded: " + err));
        });
    });
}

EpgzHandler.prototype.saveDocument = function (documentPath) {
    return new Promise(function (resolve, reject) {
        var path = null;
        var targz = require('tar.gz');
        new targz({}, {fromBase: true}).compress(Pencil.documentHandler.tempDir.name, documentPath)
        .then(resolve).catch(reject);
    });
};
