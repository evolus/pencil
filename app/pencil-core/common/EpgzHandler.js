function EpgzHandler(controller) {
    FileHandler.call(this);
    this.controller = controller;
    this.name = "Pencil Document (GZip Compressed)";
    this.type = EpgzHandler.EXT;
}

__extend(FileHandler, EpgzHandler);

EpgzHandler.EXT = ".epgz";
EpgzHandler.prototype.loadDocument = function(filePath) {
    const zlib = require('zlib');
    const tarfs = require('tar-fs');

    var thiz = this;
    return new Promise(function (resolve, reject) {

        var wrappedReject = function (error) {
            var recoverable = fs.existsSync(path.join(Pencil.documentHandler.tempDir.name, "content.xml"));
            if (!recoverable) {
                reject(error);
            } else {
                ApplicationPane._instance.unbusy();

                Dialog.confirm("File loading error", "There was an error that prevented your document from being fully loaded. The document file seems to be corrupted.\n" +
                "Do you want Pencil to try loading the document anyway?",
                    "Yes, try anyway", function () {
                        ApplicationPane._instance.busy();
                        thiz.parseDocument(filePath, resolve);
                    },
                    "Cancel", function () {
                        ApplicationPane._instance.busy();
                        reject(error);
                    });
            }
        };

        fs.createReadStream(filePath)
            .pipe(zlib.Gunzip())
            .on("error", wrappedReject)
            .pipe(tarfs.extract(Pencil.documentHandler.tempDir.name)
                    .on("error", wrappedReject)
                    .on("finish", function() {
                        console.log("Successfully extracted.");
                        thiz.parseDocument(filePath, resolve);
                    }));
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
