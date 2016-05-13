function StartUpDocumentView() {
    BaseTemplatedWidget.call(this);

    this.recentDocumentRepeater.populator = function (doc, binding) {
        var filePath = doc.filePath;
        var handler = function (error, thumbPath) {
            var stats = fs.statSync(filePath);
            if (stats) {
                binding.name.innerHTML = Dom.htmlEncode(path.basename(filePath));
                binding.info.innerHTML = Dom.htmlEncode(moment(stats.mtime).fromNow());
                if (thumbPath) {
                    window.setTimeout(function () {
                        Util.setupImage(binding.thumbnailImage, ImageData.filePathToURL(thumbPath), "center-crop", "allowUpscale");
                    }, 10);
                }
                binding._node._filePath = filePath;
                binding._node.setAttribute("title", filePath);
            }
        };

        if (doc.thumbPath) {
            handler(null, doc.thumbPath);
        } else {
            Pencil.controller.parseDocumentThumbnail(filePath, handler);
        }
    };

    this.bind("click", function (event) {
        var filePath = Dom.findUpwardForData(event.target, "_filePath");
        if (!filePath) return;

        function handler() {
            Pencil.controller.loadDocument(filePath);
        }
        if (Pencil.controller.modified) {
            Pencil.controller.confirmAndSaveDocument(handler);
            return;
        }
        handler();

    }, this.recentDocumentRepeater);

    Dom.doOnAllChildRecursively(this.node(), function (n) {
        if (!n.getAttribute || !n.getAttribute("command")) return;
        var command = n.getAttribute("command");
        UICommandManager.installControl(command, n);
    });

}

__extend(BaseTemplatedWidget, StartUpDocumentView);

StartUpDocumentView.prototype.reload = function () {
    var files = Config.get("recent-documents");
    var map = Config.get("recent-documents-thumb-map") || {};
    var docs = [];
    var deletedFiles = [];
    if (files) {
        for (var i = 0; i < Math.min(files.length, 8); i++) {
            console.log("file begin"+files[i]);
            var checkExist = fs.existsSync(files[i]);
            console.log(checkExist);
            if(!checkExist) {
                deletedFiles.push(files[i]);
            } else {
                docs.push({
                    filePath: files[i],
                    thumbPath: map[files[i]] || null
                });
            }
        }
        for(i in deletedFiles) {
            Pencil.controller.removeRecentFile(deletedFiles[i]);
        }
    }

    console.log("docs:", docs);
    var thiz = this;
    this.recentDocumentRepeater.node().style.visibility = "hidden";
    setTimeout(function () {
        thiz.recentDocumentRepeater.setItems(docs);
        thiz.recentDocumentRepeater.node().style.visibility = "inherit";
    }, 200);
};
