function DocumentHandler(controller) {
    this.fileHandler = {};
    this.activeHandler;
    this.tempDir;
    this.controller = controller;
    this.readExtensions = new Array();
    this.saveExtentions = new Array();
}
DocumentHandler.prototype.registerHandler = function(handler){
    this.fileHandler[handler.type] = handler;
    if (this.fileHandler[handler.type].loadDocumentImpl != null) this.readExtensions.push(handler.type.replace(".",""));
    if (this.fileHandler[handler.type].saveDocumentImpl != null) this.saveExtentions.push(handler.type.replace(".",""));
}

DocumentHandler.prototype.actived = function(type){
    if (this.fileHandler[type] == null) return;
    this.activeHandler = this.fileHandler[type];
}

DocumentHandler.prototype.openDocument = function(callback){
    var thiz = this;

    function handler() {
        ApplicationPane._instance.busy();
        dialog.showOpenDialog({
            title: "Open pencil document",
            defaultPath: Config.get("document.open.recentlyDirPath", null) || os.homedir(),
            filters: [
                { name: "Stencil files", extensions: thiz.readExtensions }
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
    if (this.fileHandler[path.extname(filePath)] == null || this.fileHandler[path.extname(filePath)].loadDocumentImpl == null) {
        Dialog.alert("This file type is not support! please open another file.");
    } else {
        this.fileHandler[path.extname(filePath)].loadDocumentImpl(filePath, callback);
        if (this.fileHandler[path.extname(filePath)].saveDocumentImpl != null) {
            Config.set("document.fileHandler.fileHandlerType", path.extname(filePath));
            this.actived(path.extname(filePath));
        }
    }
}

DocumentHandler.prototype.saveAsDocument = function (onSaved) {
    var filePath = path.join(this.controller.documentPath && path.dirname(this.controller.documentPath) || Config.get("document.save.recentlyDirPath", null) || os.homedir(),
                    this.controller.documentPath && path.basename(this.controller.documentPath) || "Untitled" + thiz.activeHandler.type);
    var thiz = this;
    var callback = function() {
        dialog.showSaveDialog({
            title: "Save as",
            defaultPath: filePath,
            filters: [
                { name: "Stencil files", extensions: thiz.saveExtentions }
            ]
        }, function (filePath) {
            if (!filePath) return;
            if (thiz.fileHandler[path.extname(filePath)] != thiz.activeHandler) {
                Config.set("document.fileHandler.fileHandlerType", path.extname(filePath));
                thiz.actived(path.extname(filePath));
            }
            thiz.controller.addRecentFile(filePath, thiz.controller.getCurrentDocumentThumbnail());
            thiz.controller.documentPath = filePath;
            thiz.controller.doc.name = thiz.controller.getDocumentName();
            thiz.activeHandler.saveDocumentImpl(filePath, onSaved);
        }.bind(thiz));
    }
    if (this.fileHandler[path.extname(filePath)].saveDocumentImpl == null) {
        filePath = filePath.replace(path.extname(filePath), this.activeHandler.type);
        Dialog.alert("The file format is not support for save operator!",  "your file name will change to: " + path.basename(filePath), callback);
    } else {
        callback();
    }
};

DocumentHandler.prototype.saveDocument = function (onSaved) {
    if (!this.controller.documentPath || this.controller.oldPencilDoc) {
        var filePath = path.join(Config.get("document.save.recentlyDirPath", null) || os.homedir(),
            (this.controller.documentPath && path.basename(this.controller.documentPath)) || "Untitled" + this.activeHandler.type);
        var thiz = this;
        var callback = function() {
            dialog.showSaveDialog({
                title: "Save as",
                defaultPath: filePath,
                filters: [
                    { name: "Stencil files", extensions: thiz.saveExtentions }
                ]
            }, function (filePath) {
                if (!filePath) return;
                if (thiz.fileHandler[path.extname(filePath)] != thiz.activeHandler) {
                    thiz.actived(path.extname(filePath));
                    Config.set("document.fileHandler.fileHandlerType", path.extname(filePath));
                }
                Config.set("document.save.recentlyDirPath", path.dirname(filePath));
                thiz.controller.documentPath = filePath;
                thiz.controller.doc.name = thiz.controller.getDocumentName();
                thiz.activeHandler.saveDocumentImpl(filePath, onSaved);
            }.bind(thiz));
        }
        if (this.fileHandler[path.extname(filePath)].saveDocumentImpl == null) {
            filePath = filePath.replace(path.extname(filePath), this.activeHandler.type);
            Dialog.alert("The file format is not support for save operator!",  "your file name will change to: " + path.basename(filePath), callback);
        } else {
            callback();
        }
        return;
    }
    this.fileHandler[path.extname(this.controller.documentPath)].saveDocumentImpl(this.controller.documentPath, onSaved);
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
