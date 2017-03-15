function EpHandler(controller) {
    FileHandler.call(this);
    this.controller = controller;
    this.name = "Pencil Document (Legacy)";
    this.type = ".ep";
}
__extend(FileHandler, EpHandler);

EpHandler.prototype.parseOldFormatDocument = function (filePath, callback) {
    var targetDir = Pencil.documentHandler.tempDir.name;
    var oldPencilDocument = Pencil.documentHandler.preDocument;
    var thiz = this;
    this.pathToRefCache = null;
    try {
        if (path.extname(filePath) != ".ep") throw "Wrong format.";

        this.controller.documentPath = filePath;
        this.controller.oldPencilDoc = true;
        var dom = Controller.parser.parseFromString(fs.readFileSync(filePath, "utf8"), "text/xml");

        Dom.workOn("./p:Properties/p:Property", dom.documentElement, function (propNode) {
            thiz.controller.doc.properties[propNode.getAttribute("name")] = propNode.textContent;
        });

        var pageNodes = Dom.getList("./p:Pages/p:Page", dom.documentElement);
        console.log(pageNodes);
        var pageNodeIndex = -1;
        function parseNextPageNode(__callback) {
            pageNodeIndex ++;
            if (pageNodeIndex >= pageNodes.length) {
                __callback();
                return;
            }

            var pageNode = pageNodes[pageNodeIndex];
            thiz.parsePageFromNode(pageNode, function () {
                parseNextPageNode(__callback);
            });
        }

        // update page thumbnails
        var index = -1;
        function generateNextThumbnail(onDone) {
            index ++;
            if (index >= thiz.controller.doc.pages.length) {
                if (onDone) onDone();
                return;
            }
            var page = thiz.controller.doc.pages[index];
            thiz.controller.updatePageThumbnail(page, function () {
                generateNextThumbnail(onDone);
            });
        }
        if (pageNodes.length == 0 && index == -1 && pageNodeIndex == -1) throw "Wrong format.";
        parseNextPageNode(function () {
            generateNextThumbnail(function () {
                thiz.controller.modified = false;
                thiz.controller.sayControllerStatusChanged();
                if (thiz.controller.doc.pages.length > 0) thiz.controller.activatePage(thiz.controller.doc.pages[0]);
                thiz.controller.pathToRefCache = null;
                if (callback) callback();
                ApplicationPane._instance.unbusy();
            });
        });

        this.controller.doc.name = this.controller.getDocumentName();
        Pencil.documentHandler.preDocument = filePath;
    } catch (e) {
        console.log(e);

        ApplicationPane._instance.unbusy();
        Dialog.alert("Unexpected error while accessing file: " + path.basename(filePath), null, function() {
            (oldPencilDocument != null) ? Pencil.documentHandler.loadDocument(oldPencilDocument) : function() {
                Pencil.controller.confirmAndclose(function () {
                    Pencil.documentHandler.resetDocument();
                    ApplicationPane._instance.showStartupPane();
                });
            };
        });
    }
};
EpHandler.prototype.loadDocument = function(filePath, callback) {
    ApplicationPane._instance.busy();
    this.controller.applicationPane.pageListView.restartFilterCache();
    Pencil.documentHandler.resetDocument();
    var thiz = this;
    if (!fs.existsSync(filePath)) {
        Dialog.error("File doesn't exist", "Please check if your file was moved or deleted.");
        thiz.removeRecentFile(filePath);
        ApplicationPane._instance.unbusy();
        Pencil.documentHandler.newDocument()
        if (callback) callback();
        return;
    };
    try {
        thiz.parseOldFormatDocument(filePath, callback);
    } catch(e) {
        ApplicationPane._instance.unbusy();
    }
}
