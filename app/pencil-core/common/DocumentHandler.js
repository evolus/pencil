function DocumentHandler(controller) {
    this.fileHandler = {};
    this.activeHandler;
    this.tempDir;
    this.controller = controller;
}
DocumentHandler.prototype.registerHandler = function(handler){
    this.fileHandler[handler.type] = handler;
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
                { name: "Stencil files", extensions: ["epz", "ep", "epgz"] }
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
    if (this.fileHandler[path.extname(filePath)] == null) {
        this.activeHandler.loadDocument(filePath, callback);
    } else {
        this.fileHandler[path.extname(filePath)].loadDocument(filePath, callback);
    }
}

DocumentHandler.prototype.saveAsDocument = function (onSaved) {
    var thiz = this;
    dialog.showSaveDialog({
        title: "Save as",
        defaultPath: path.join(this.controller.documentPath && path.dirname(this.controller.documentPath) || Config.get("document.save.recentlyDirPath", null) || os.homedir(),
                        this.controller.documentPath && path.basename(this.controller.documentPath) || "Untitled.epgz"),
        filters: [
            { name: "Stencil files", extensions: ["epz", "ep", "epgz"] }
        ]
    }, function (filePath) {
        if (!filePath) return;
        console.log("PATH" + filePath);
        this.controller.addRecentFile(filePath, thiz.controller.getCurrentDocumentThumbnail());
        this.controller.documentPath = filePath;
        this.controller.doc.name = this.controller.getDocumentName();
        if (this.fileHandler[path.extname(filePath)] == null) {
            this.activeHandler.saveDocumentImpl(filePath, onSaved);
            return;
        }
        this.fileHandler[path.extname(filePath)].saveDocumentImpl(filePath, onSaved);
    }.bind(this));
};

DocumentHandler.prototype.saveDocument = function (onSaved) {
    if (!this.controller.documentPath || this.controller.oldPencilDoc) {
        var thiz = this;
        dialog.showSaveDialog({
            title: "Save as",
            defaultPath: path.join(Config.get("document.save.recentlyDirPath", null) || os.homedir(),
                (this.controller.documentPath && path.basename(this.controller.documentPath).replace(path.extname(this.controller.documentPath), "") + ".epgz") || "Untitled.epgz"),
            filters: [
                    { name: "Stencil files", extensions: ["epz", "ep", "epgz"] }
            ]
        }, function (filePath) {
            if (!filePath) return;
            console.log("PATH" + filePath);
            Config.set("document.save.recentlyDirPath", path.dirname(filePath));
            thiz.controller.documentPath = filePath;
            thiz.controller.doc.name = thiz.controller.getDocumentName();
            if (thiz.fileHandler[path.extname(filePath)] == null) {
                thiz.activeHandler.saveDocumentImpl(filePath, onSaved);
                return;
            }
            thiz.fileHandler[path.extname(filePath)].saveDocumentImpl(filePath, onSaved);
        });
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
