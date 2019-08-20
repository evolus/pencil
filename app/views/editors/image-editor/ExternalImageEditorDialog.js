function ExternalImageEditorDialog () {
    Dialog.call(this);
    this.title = "Edit Image with External Program";
}
__extend(Dialog, ExternalImageEditorDialog);

ExternalImageEditorDialog.prototype.setup = function (options) {
    this.options = options;
    var ext = "png";
    if (options.imageData.data.match(/^ref:\/\/.*\.(gif|jpg|png)$/)) {
        ext = RegExp.$1;
    }

    var executableConfig = ExternalEditorSupports.getEditorPath(ext);
    if (!executableConfig) {
        Dialog.error("No external editor configured.", "Please configure the external bitmap editor in 'Settings > External Editors'");
        this.close(null);
        return;
    }

    this.refId = ImageData.refStringToId(options.imageData.data);
    var url = Pencil.controller.refIdToUrl(this.refId);

    this.thumbnailImageViewer.style.backgroundImage = "url(" + url + ")";
    this.filePath = Pencil.controller.refIdToFilePath(this.refId);

    var thiz = this;

    this.tmpFile = {
        name: "",
        removeCallback: function () {
            fs.unlinkSync(thiz.tmpFile.name);
        }
    };

    if (process.platform == "darwin") {
        this.tmpFile.name = Config.getDataFilePath("tmp_editFile") + "." + ext;
    } else {
        this.tmpFile.name = tmp.tmpNameSync() + "." + ext;
    }

    fs.copyFileSync(this.filePath, this.tmpFile.name);

    var stat = fs.statSync(this.tmpFile.name);
    this.initialModificationTime = stat.mtime.getTime();

    executableConfig = executableConfig.replace(/^(.+)\.exe/, function (zero, one) {
        return one.replace(/[ ]/g, "@space@") + ".exe";
    });
    var args = executableConfig.split(/[ ]+/);

    var executablePath = args[0].replace(/@space@/g, " ");
    var params = [];
    var hasFileArgument = false;
    for (var i = 1; i < args.length; i ++) {
        var arg = args[i].trim();
        if (arg == "%f") {
            params.push(this.tmpFile.name);
            hasFileArgument = true;
        } else {
            params.push(arg);
        }
    }

    if (!hasFileArgument) {
        params.push(this.tmpFile.name);
    }

    const spawn = require("child_process").spawn;

    var proc = spawn(executablePath, params);

    var thiz = this;
    (function check() {
        if (!thiz.tmpFile) return;
        try {
            thiz._checkStatus();
        } catch (e) {

        } finally {
            window.setTimeout(check, 1000);
        }
    })();
};
ExternalImageEditorDialog.prototype._checkStatus = function () {
    var stat = fs.statSync(this.tmpFile.name);
    if (!stat) return;

    var newModificationTime = stat.mtime.getTime();
    var previouslyUpdated = this.updated;
    this.updated = newModificationTime > this.initialModificationTime;
    this.lastModifyLabel.innerHTML = this.updated ? moment(stat.mtime).fromNow() : "Not modified";
    Dom.toggleClass(this.lastModifyLabel, "Updated", this.updated);

    if (!previouslyUpdated && this.updated) this.invalidateElements();
};
ExternalImageEditorDialog.prototype.onClosed = function () {
    try {
        if (this.tmpFile) this.tmpFile.removeCallback();
    } catch (e) {
        console.error(e);
    }
    this.tempFile = null;
};

ExternalImageEditorDialog.prototype.save = function (resRefs, updateAllRefs) {
    updateAllRefs = updateAllRefs || !resRefs || resRefs.total === 1;

    var refId = this.refId;

    var next = function () {
        var url = Pencil.controller.refIdToUrl(refId);
        var image = new Image();
        image.onload = function () {
            var newImageData = new ImageData(image.width, image.height, ImageData.idToRefString(refId));
            image.src = "";

            var sizeChanged = newImageData.w != this.options.imageData.w || newImageData.h != this.options.imageData.h;

            var finish = function (options) {
                if (updateAllRefs && resRefs && resRefs.references) {
                    // update references in the swap-in pages
                    for (var i = 0; i < resRefs.references.length; i++) {
                        var page = resRefs.references[i].page;
                        var canvas = page.canvas;
                        if (!canvas) continue;

                        if (page != Pencil.controller.activePage) canvas.__dirtyGraphic = true;

                        var holders = resRefs.references[i].holders || [];
                        for (var j = 0; j < holders.length; j++) {
                            var controller = canvas.createControllerFor(holders[j]);
                            controller.setProperty("imageData", newImageData);

                            if (options && options.updateBox) {
                                var dim = new Dimension(newImageData.w, newImageData.h);
                                controller.setProperty("box", dim);
                            }
                        }
                    }
                }

                if (this.options.onDone) this.options.onDone(newImageData, options);
                this.close();

            }.bind(this);

            if (!sizeChanged) {
                finish({
                    updateBox: false
                });
            } else {
                Dialog.confirm("Update shape size",
                    "The image size has changed, do you want to update shape size accordingly?",
                    "Update to new size", function () {
                        finish({
                            updateBox: true
                        });
                    }, "Keep original size", function () {
                        finish({
                            updateBox: false
                        });
                    });
            }

        }.bind(this);
        image.src = url;


    }.bind(this);

    if (updateAllRefs) {
        var filePath = Pencil.controller.refIdToFilePath(refId);
        fs.copyFileSync(this.tmpFile.name, filePath);
        next();
    } else {
        Pencil.controller.copyAsRef(this.tmpFile.name, function (newRefId) {
            refId = newRefId;
            next();
        });
    }
};

ExternalImageEditorDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CANCEL,
        {   type: "accept", title: "Finish",
            isApplicable: function () {
                return thiz.updated;
            },
            run: function () {
                var resRefs = Pencil.controller.getResourceReferences(thiz.refId);
                if (resRefs && resRefs.total > 1) {
                    var that = this;
                    Dialog.confirm("There are " + resRefs.total + " references have been associated with this image",
                    "What would you like to do?",
                    "Update This", function () {
                        that.save(resRefs);
                    }, "Cancel", null, "Update All", function () {
                        that.save(resRefs, true);
                    });
                } else {
                    this.save(resRefs);
                }

                return false;
            }
        }
    ]
};
