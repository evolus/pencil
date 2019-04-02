function DocumentHandler(controller) {
    this.handlerRegistry = {};
    this.tempDir;
    this.controller = controller;
    this.preDocument = null;

    this.registerHandler(new EpzHandler(this.controller));
    this.registerHandler(new EpgzHandler(this.controller));
    this.registerHandler(new EpHandler(this.controller));
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
DocumentHandler.prototype.getDefaultHandler = function () {
    return this.handlerRegistry[this.getDefaultFileType()];
};

DocumentHandler.prototype.registerHandler = function (handler) {
    this.handlerRegistry[handler.type] = handler;
}

DocumentHandler.prototype.getAllSupportedExtensions = function(forSaving) {
    var extentions = [];
    var fileHandlers = this.handlerRegistry;
    for (var index in fileHandlers) {
        if (forSaving && fileHandlers[index].saveDocument || !forSaving && fileHandlers[index].loadDocument)
            extentions.push(index.replace(".",""));
    }
    return extentions;
}

DocumentHandler.prototype.openDocument = function (callback) {
    var thiz = this;
    function handler() {
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            title: "Open",
            defaultPath: Config.get("document.open.recentlyDirPath", null) || os.homedir(),
            filters: [
                { name: "Pencil Documents", extensions: thiz.getAllSupportedExtensions(false) }
            ]
        }, function (filenames) {
            if (!filenames || filenames.length <= 0) return;
            Config.set("document.open.recentlyDirPath", path.dirname(filenames[0]));

            thiz.loadDocument(filenames[0], callback);

        });
    };

    if (this.controller.modified) {
        this.confirmAndSaveDocument(handler);
    } else {
        handler();
    }
}

DocumentHandler.prototype.loadDocument = function(filePath, callback){
    var ext = path.extname(filePath);
    var handler = this.handlerRegistry[ext];
    if (handler == null || handler.loadDocument == null) {
        Dialog.alert("Unsupported document type: " + ext);
    } else {
        var thiz = this;
        if (!fs.existsSync(filePath)) {
            callback({
                error: FileHandler.ERROR_NOT_FOUND,
                message: "File doesn't exist"
            });

            return;
        };

        ApplicationPane._instance.busy();
        this.controller.applicationPane.pageListView.restartFilterCache();
        this.resetDocument();

        handler.loadDocument(filePath)
            .then(function () {
                thiz.controller.modified = false;
                try {
                    if (callback) callback();
                } finally {
                    ApplicationPane._instance.unbusy();
                }
            })
            .catch(function (err) {
                thiz.controller.modified = false;
                try {
                    if (callback) callback(err);
                } finally {
                    ApplicationPane._instance.unbusy();
                }
            });
    }
};

//        thiz.removeRecentFile(filePath);


DocumentHandler.prototype.loadDocumentFromArguments = function (filePath) {
    console.log("Loading file from argument: " + filePath);
    this.loadDocument(filePath, function () {
    });
}

DocumentHandler.prototype.pickupTargetFileToSave = function (callback) {
    var filters = [];
    var defaultFileType = this.getDefaultFileType();
    for (var type in this.handlerRegistry) {
        var handler = this.handlerRegistry[type];
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
    return this.handlerRegistry[path.extname(filePath)];
};
DocumentHandler.prototype.getActiveHandler = function () {
    if (!this.controller.documentPath) return null;
    return this.getHandlerForFilePath(this.controller.documentPath);
};
DocumentHandler.prototype.saveAsDocument = function (onSaved, skipAddingRecentFiles) {
    var thiz = this;
    this.pickupTargetFileToSave(function (filePath) {
        if (!filePath) return;
        var handler = thiz.getHandlerForFilePath(filePath);
        if (!handler || !handler.saveDocument) {
            Dialog.error("Unsupported file format.");
            return;
        }

        if (!skipAddingRecentFiles) thiz.controller.addRecentFile(filePath, thiz.controller.getCurrentDocumentThumbnail());
        thiz.controller.documentPath = filePath;
        thiz.controller.doc.name = thiz.controller.getDocumentName();

        thiz._saveBoundDocument(onSaved);
    });
};

DocumentHandler.prototype.saveDocument = function (onSaved) {
    if (!this.controller.documentPath || !this.getActiveHandler().saveDocument) {
        this.saveAsDocument(onSaved, "skipAddingRecentFiles");
    } else {
        this._saveBoundDocument(onSaved);
    }
};

DocumentHandler.prototype._saveBoundDocument = function (onSaved) {
    this.isSaving = true;
    ApplicationPane._instance.busy();
    this.controller.updateCanvasState();

    var thiz = this;
    this.controller.serializeDocument(function () {
        thiz.controller.addRecentFile(thiz.controller.documentPath, thiz.controller.getCurrentDocumentThumbnail());
        thiz.getActiveHandler().saveDocument(thiz.controller.documentPath)
            .then(function () {
                ApplicationPane._instance.unbusy();
                thiz.isSaving = false;
                thiz.controller.sayDocumentSaved();

                if (onSaved) onSaved();

                thiz.controller.applicationPane.onDocumentChanged();
                thiz.controller.sayControllerStatusChanged();
            })
            .catch (function (err) {
                ApplicationPane._instance.unbusy();
                thiz.isSaving = false;
                Dialog.error("Error when saving document: " + err);

                thiz.controller.applicationPane.onDocumentChanged();
                thiz.controller.sayControllerStatusChanged();
            });
    });
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
    } else {
        create();
    }
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
