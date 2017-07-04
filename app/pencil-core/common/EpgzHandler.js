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

        var wrappedRejectCalled = false;
        var wrappedReject = function (error) {
            if (wrappedRejectCalled) return;
            wrappedRejectCalled = true;
            console.log(error);
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
            .pipe(tarfs.extract(Pencil.documentHandler.tempDir.name, {readable: true, writable: true})
                    .on("error", wrappedReject)
                    .on("finish", function() {
                        console.log("Successfully extracted.");
                        thiz.parseDocument(filePath, resolve);
                    }));
    });
}

EpgzHandler.prototype.saveDocument = function (documentPath) {
    var thiz = this;
    return new Promise(function (resolve, reject) {
        var path = null;
        var targz = require('tar.gz');
        var tarOptions = {
            fromBase: true,
            readerFilter: function (one, two, three) {
                var p = one && one.path ? one.path : null;
                var re = process.platform === "win32" ? /refs\\([^\\]+)$/ : /refs\/([^\/]+)$/;
                if (p && p.match(re)) {
                    var id = RegExp.$1;
                    if (thiz.controller.registeredResourceIds && thiz.controller.registeredResourceIds.indexOf(id) < 0) {
                        console.log("Ignoring: " + id);
                        return false;
                    }
                }
                return true;
            }
        };

        var compressor = new targz({}, tarOptions);
        console.log(compressor._options);
        compressor.compress(Pencil.documentHandler.tempDir.name, documentPath)
        .then(resolve).catch(reject);
    });
};
