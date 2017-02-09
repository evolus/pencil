function DocumentHandler(controller) {
    this.fileHandler = {};
    this.activeHandler;
    this.tempDir;
    this.controller = controller;
    this.preDocument = null;

    this.registerHandler(new EpzHandler(this.controller));
    this.registerHandler(new EpgzHandler(this.controller));
    this.registerHandler(new EpHandler(this.controller));

    var handlerType = this.getDefaultFileType();
    this.actived(handlerType);
}
DocumentHandler.prototype.getDefaultFileType = function () {
    const configName = "document.fileHandler.defaultHandlerType";
    var value = Config.get(configName, null);
    if (value === null) {
        value = EpgzHandler.EXT;
        Config.set(configName, value);
    }

    return value;
};
DocumentHandler.prototype.registerHandler = function(handler){
    this.fileHandler[handler.type] = handler;
    // if (this.fileHandler[handler.type].loadDocument != null) this.readExtensions.push(handler.type.replace(".",""));
    // if (this.fileHandler[handler.type].saveDocument != null) this.saveExtentions.push(handler.type.replace(".",""));
}

DocumentHandler.prototype.actived = function(type){
    if (this.fileHandler[type] == null) return;
    this.activeHandler = this.fileHandler[type];
}

DocumentHandler.prototype.getExtentionHandlerFile = function(saveFlag) {
    var extentions = new Array();
    var fileHandlers = this.fileHandler;
    for (var index in fileHandlers) {
        if (saveFlag && fileHandlers[index].saveDocument || !saveFlag && fileHandlers[index].loadDocument)
            extentions.push(index.replace(".",""));
    }
    return extentions;
}

DocumentHandler.prototype.openDocument = function(callback){
    var thiz = this;
    function handler() {
        ApplicationPane._instance.busy();
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            title: "Open",
            defaultPath: Config.get("document.open.recentlyDirPath", null) || os.homedir(),
            filters: [
                { name: "Pencil Documents", extensions: thiz.getExtentionHandlerFile(false) }
            ]
        }, function (filenames) {
            ApplicationPane._instance.unbusy();
            if (!filenames || filenames.length <= 0) return;
            Config.set("document.open.recentlyDirPath", path.dirname(filenames[0]));
            this.loadDocument(filenames[0], callback);
        }.bind(thiz));
    };
    if (this.controller.modified) {
        this.confirmAndSaveDocument(handler);
        return;
    }
    handler();
}

DocumentHandler.prototype.loadDocument = function(filePath, callback){
    var ext = path.extname(filePath);
    var handler = this.fileHandler[ext];
    if (handler == null || handler.loadDocument == null) {
        Dialog.alert("This file type is not support! please open another file.");
    } else {
        var thiz = this;
        handler.loadDocument(filePath, function () {
            if (handler.saveDocument != null) {
                thiz.actived(ext);
            }
            if (callback) callback();
        });
    }
}

DocumentHandler.prototype.loadDocumentFromArguments = function(filePath){
    var ext = path.extname(filePath);
    var handler = this.fileHandler[ext];
    if (handler && handler.loadDocument) {
        var thiz = this;
        handler.loadDocument(filePath, function () {
            if (handler.saveDocument != null) {
                thiz.actived(ext);
            }
        });
    }
}

DocumentHandler.prototype.pickupTargetFileToSave = function (callback) {
    var filters = [];
    var defaultFileType = this.getDefaultFileType();
    for (var type in this.fileHandler) {
        var handler = this.fileHandler[type];
        if (handler.saveDocument) {
            var filter = {
                name: handler.name,
                extensions: [handler.type.replace(/^\./,"")]
            };
            if (handler.type == defaultFileType) {
                filters.unshift(filter);
            } else {
                filters.push(filter);
            }
        }
    }

    var fileName = null;
    var fileDir = null;
    if (this.controller.documentPath) {
        fileName = path.basename(this.controller.documentPath).replace(/\.[^\.]+$/, "") + defaultFileType;
        fileDir = path.dirname(this.controller.documentPath);
    } else {
        fileName = "Untitled" + defaultFileType;
        fileDir = Config.get("document.save.recentlyDirPath", os.homedir());
    }

    var defaultPath = path.join(fileDir, fileName);
    var thiz = this;

    dialog.showSaveDialog(remote.getCurrentWindow(), {
        title: "Save as",
        defaultPath: defaultPath,
        filters: filters
    }, function (filePath) {
        if (filePath) {
            var ext = path.extname(filePath);
            if (ext != defaultFileType && fs.existsSync(filePath)) {
                Dialog.confirm("Are you sure you want to overwrite the existing file?", filePath,
                    "Yes, overwrite", function () {
                        Config.set("document.save.recentlyDirPath", path.dirname(filePath));
                        if (callback) {
                            callback(filePath);
                        }
                    },
                    "No", function () {
                        thiz.pickupTargetFileToSave(callback);
                    });

                return;
            }
            Config.set("document.save.recentlyDirPath", path.dirname(filePath));
        }
        if (callback) {
            callback(filePath);
        }
    });
};
DocumentHandler.prototype.getHandlerForFilePath = function (filePath) {
    return this.fileHandler[path.extname(filePath)];
};

DocumentHandler.prototype.saveAsDocument = function (onSaved, skipAddingRecentFiles) {
    var thiz = this;
    this.pickupTargetFileToSave(function (filePath) {
        console.log("Got file path", filePath);
        if (!filePath) return;
        var handler = thiz.getHandlerForFilePath(filePath);
        if (!handler || !handler.saveDocument) {
            Dialog.error("Unsupported file format.");
            return;
        }

        thiz.actived(handler.type);
        console.log("activeHandler", thiz.activeHandler.type);

        if (!skipAddingRecentFiles) thiz.controller.addRecentFile(filePath, thiz.controller.getCurrentDocumentThumbnail());
        thiz.controller.documentPath = filePath;
        thiz.controller.doc.name = thiz.controller.getDocumentName();
        thiz.activeHandler.saveDocument(filePath, onSaved);
    });
};

DocumentHandler.prototype.saveDocument = function (onSaved) {
    if (!this.controller.documentPath || !this.activeHandler || !this.activeHandler.saveDocument) {
        this.saveAsDocument(onSaved, "skipAddingRecentFiles");
    } else {
        this.getHandlerForFilePath(this.controller.documentPath).saveDocument(this.controller.documentPath, onSaved);
    }
};

DocumentHandler.prototype.confirmAndSaveDocument = function (onSaved) {
    Dialog.confirm(
        "Save changes to document before closing?",
        "If you don't save, changes will be permanently lost.",
        "Save", function () { this.saveDocument(onSaved); }.bind(this),
        "Cancel", function () { },
        "Discard changes", function () { if (onSaved) onSaved(); }
        );
};
DocumentHandler.prototype.newDocument = function () {
    var thiz = this;
    function create() {
        thiz.resetDocument();
        thiz.controller.sayControllerStatusChanged();
        FontLoader.instance.loadFonts();

        // thiz.sayDocumentChanged();
        setTimeout(function () {
            var size = thiz.controller.applicationPane.getPreferredCanvasSize();
            var page = thiz.controller.newPage("Untitled Page", size.w, size.h, null, null, "", null, "activatePage");
            thiz.controller.modified = false;
        }, 50);
    };
    if (this.controller.modified) {
        this.confirmAndSaveDocument(create);
        return;
    }
    create();
};

DocumentHandler.prototype.resetDocument = function () {
    if (this.tempDir) this.tempDir.removeCallback();
    this.tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true });

    this.controller.doc = new PencilDocument();
    this.controller.doc.name = "";
    this.controller.documentPath = null;
    this.controller.canvasPool.reset();
    this.controller.activePage = null;
    this.controller.documentPath = null;
    this.controller.pendingThumbnailerMap = null;

    this.controller.applicationPane.pageListView.currentParentPage = null;
    FontLoader.instance.setDocumentRepoDir(path.join(this.tempDir.name, "fonts"));
};
