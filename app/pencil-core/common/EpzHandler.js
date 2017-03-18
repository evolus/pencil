function EpzHandler (controller) {
    FileHandler.call(this);
    this.controller = controller;
    this.name = "Pencil Document (Compressed)";
    this.type = EpzHandler.EXT;
}
__extend(FileHandler, EpzHandler);

EpzHandler.EXT = ".epz";
EpzHandler.prototype.loadDocument = function(filePath) {
    var thiz = this;

    return new Promise(function (resolve, reject) {
        var admZip = require('adm-zip');

        var zip = new admZip(filePath);
        zip.extractAllToAsync(Pencil.documentHandler.tempDir.name, true, function (err) {
            if (err) {
                reject(new Error("File could not be loaded: " + err));
            } else {
                thiz.parseDocument(filePath, resolve);
            }
        });

    });
};

EpzHandler.prototype.saveDocument = function (documentPath, callback) {
    var thiz = this;

    return new Promise(function (resolve, reject) {
        var easyZip = require("easy-zip2").EasyZip;
        var zip = new easyZip();
        zip.zipFolder(Pencil.documentHandler.tempDir.name + "/.", function (err) {
            if (err) {
                reject(new Error("Unable to save file: " + err));
            } else {
                try {
                    zip.writeToFile(documentPath, function (err) {
                        if (err) {
                            reject(new Error("Unable to save file: " + err));
                        } else {
                            resolve();
                        }
                    });
                } catch (e) {
                    reject(e);
                }
            }
        });
    });
};
