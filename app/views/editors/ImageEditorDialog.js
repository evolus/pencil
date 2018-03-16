function ImageEditorDialog () {
    Dialog.call(this);
    this.title = "Edit Image";
    this.subTitle = "";

    this.__init();

    this.zoomRatio = 1;
    this.__initTools();

    this.selectionRangeListener = null;
}
__extend(Dialog, ImageEditorDialog);

ImageEditorDialog.prototype.__init = function () {
    Dom.addClass(this.dialogFrame, "EditImageDialog");
    this.bind("mousedown", this.handleSelectionMouseDown, this.selectionCanvas);
    this.bind("mouseup", this.handleSelectionMouseUp, this.selectionCanvas);
    this.bind("mousemove", this.handleSelectionMouseMove, this.selectionCanvas.ownerDocument);

    this.selectionCanvasCtx = this.selectionCanvas.getContext("2d");
};
ImageEditorDialog.prototype.__initTools = function () {
    var nodes = this.toolbarContainer.querySelectorAll(".PopupToggler");
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].addEventListener("click", function (event) {
            var toggler = Dom.findParentWithClass(this, "PopupToggler");
            var popup = toggler.parentNode.querySelector(".PopupContainer").__widget;
            popup.toggle(toggler, "left-inside", "bottom", 0, 5);
        });
    }

    function registerSeekInputListener(ctx, input, seeker, callback, inputValueToCallbackFn, fromSeekerToInputValueFn) {
        if (typeof(inputValueToCallbackFn) != "function") {
            inputValueToCallbackFn = function (value) {
                return parseInt(value, 10) / 100;
            };
        }
        if (typeof(fromSeekerToInputValueFn) != "function") {
            fromSeekerToInputValueFn = function (value) {
                return value;
            };
        }
        input.addEventListener("keypress", function (event) {
            if (event.keyCode != DOM_VK_RETURN) return;
            event.cancelBubble = true;

            callback.call(ctx, inputValueToCallbackFn(this.value));
        });

        seeker.addEventListener("input", function(event) {
            input.value = fromSeekerToInputValueFn(this.value);
        });
        seeker.addEventListener("change", function(event) {
            callback.call(ctx, inputValueToCallbackFn(fromSeekerToInputValueFn(this.value)));
        });
    };
    function parse_11RangeValue(value) {
        var decimal = parseInt(value, 10);
        if (decimal < 0) decimal = 0;
        if (decimal > 200) decimal = 200;
        return (decimal - 100) * 0.01;
    };

    registerSeekInputListener(this, this.zoomPercentInput, this.zoomSeeker, this.zoom);
    registerSeekInputListener(this, this.brightnessPercentInput, this.brightnessSeeker,
                              this.brightness, parse_11RangeValue, function (value) {
                                  return parseInt(value, 10) * 2;
                              });
    registerSeekInputListener(this, this.contrastPercentInput, this.contrastSeeker,
                              this.contrast, parse_11RangeValue, function (value) {
                                  return parseInt(value, 10) * 2;
                              });
    registerSeekInputListener(this, this.fadePercentInput, this.fadeSeeker, this.fade);
    registerSeekInputListener(this, this.opacityPercentInput, this.opacitySeeker, this.opacity);

    this.bind("click", function (event) {
        this.busy();
        this.editingImage.autocrop();
        this.invalidateImage(function () {
            this.zoom(1);
        });
    }, this.autoCropButton);
    this.bind("click", function (event) {
        this.registerSelectionRangeListener(this.confirmCrop);
        this.activeNode(this.cropButton, true);
    }, this.cropButton);

    this.bind("click", function (event) {
        this.busy();
        this.editingImage.flip(true, false);
        this.invalidateImage();
    }, this.hFlipButton);
    this.bind("click", function (event) {
        this.busy();
        this.editingImage.flip(false, true);
        this.invalidateImage();
    }, this.vFlipButton);

    this.bind("click", function (event) {
        this.busy();
        this.editingImage.greyscale();
        this.invalidateImage();
    }, this.greyscaleButton);
    this.bind("click", function (event) {
        this.busy();
        this.editingImage.invert();
        this.invalidateImage();
    }, this.invertButton);

    function registerInputCommandListener(ctx, input, callback) {
        input.addEventListener("keypress", function (event) {
            if (event.keyCode != DOM_VK_RETURN) return;
            event.cancelBubble = true;

            callback.call(ctx, this.value);
        });
    };
    registerInputCommandListener(this, this.degreeOfRotationInput, this.rotate);
    registerInputCommandListener(this, this.blurRadInput, this.blur);
    registerInputCommandListener(this, this.gaussianRadInput, this.confirmGaussian);

    function registerFocusInputListener(holder, input) {
        holder.addEventListener("click", function (event) {
            input.focus();
            input.select();
        });
    };
    registerFocusInputListener(this.rotateButton, this.degreeOfRotationInput);
    registerFocusInputListener(this.blurButton, this.blurRadInput);
    registerFocusInputListener(this.gaussianButton, this.gaussianRadInput);
};
ImageEditorDialog.prototype.registerSelectionRangeListener = function (listener) {
    this.selectionRangeListener = listener;
};

ImageEditorDialog.prototype.activeNode = function (node, isActive) {
    if (isActive) node.setAttribute("active", true);
    else node.removeAttribute("active")
};

ImageEditorDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CANCEL,
        {   type: "accept", title: "Apply",
            run: function () {
                var refId = this.getRefId();
                var resRefs = refId ? Pencil.controller.getResourceReferences(refId) : null;
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

ImageEditorDialog.prototype.save = function (resRefs, updateAllRefs) {
    var refId = this.getRefId();
    if (!refId || !this.editingImage) {
        if (this.options.onDone) this.options.onDone(this.options.imageData);
        this.close();
    } else {
        var that = this;
        this.editingImage.getBuffer(jimp.AUTO, function (err, data) {
            if (err) throw err;
            that.doSave(refId, data, resRefs, updateAllRefs);
        });
    }
};
ImageEditorDialog.prototype.doSave = function (refId, buffer, resRefs, updateAllRefs) {
    updateAllRefs = updateAllRefs || !resRefs || resRefs.total === 1;

    var filePath;
    if (updateAllRefs) {
        filePath = Pencil.controller.refIdToFilePath(refId);
    } else {
        var id = this.editingImage.getMIME() || "png";
        id = name.replace("image/", "");
        id = Util.newUUID() + "." + id;
        filePath = path.join(Pencil.controller.makeSubDir(Controller.SUB_REFERENCE), id);
        refId = id;
    }
    fs.writeFileSync(filePath, buffer);

    this.options.imageData.data = ImageData.idToRefString(refId);

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
                controller.setProperty("imageData", this.options.imageData);
                var dim = new Dimension(this.options.imageData.w, this.options.imageData.h);
                controller.setProperty("box", dim);
            }
        }
    }

    if (this.options.onDone) this.options.onDone(this.options.imageData);
    this.close();
};

ImageEditorDialog.prototype.getRefId = function () {
    var src = this.options && this.options.imageData ? this.options.imageData.data : null;
    return src ? ImageData.refStringToId(src) : null;
};

ImageEditorDialog.prototype.setup = function (options) {
    this.options = options || {};
    var minSize = 10 * Util.em();
    var maxW = window.innerWidth - 6 * Util.em();
    var maxH = window.innerHeight - 20 * Util.em();

    var r0 = Math.max(this.options.imageData.w / maxW, this.options.imageData.h / maxH);
    var r1 = Math.min(this.options.imageData.w / minSize, this.options.imageData.h / minSize);

    this.drawingContainer.style.width = Math.round(maxW) + "px";
    this.drawingContainer.style.height = Math.round(maxH) + "px";
    this.invalidateImage();

    var r = r0 > 1 ? (1 / r0) : 1;
    this.zoom(r);

    this.setupEditSpace();
};

ImageEditorDialog.prototype.setupEditSpace = function () {
    var src = this.options.imageData.data;
    var refId = this.getRefId();
    if (refId) src = Pencil.controller.refIdToFilePath(refId);
    var that = this;
    jimp.read(src, function (err, image) {
        if (err) throw err;

        that.editingImage = image;
        that.editingImage.quality(100);
        that.editingImage.rgba(true);
    });
};

ImageEditorDialog.prototype.invalidateImage = function (onDoneCallback) {
    if (this.editingImage) {
        var that = this;
        this.editingImage.getBuffer(jimp.AUTO, function (err, data){
            console.log(that.editingImage);
        });
        this.editingImage.getBase64(jimp.AUTO, function (err, data) {
            if (!data) return;
            that.image.src = data;
            that.options.imageData.w = this.bitmap.width;
            that.options.imageData.h = this.bitmap.height;
            if (typeof(onDoneCallback) == "function") onDoneCallback.call(that);
            that.unbusy();
        });
    } else {
        this.image.src = this.options.imageData.toImageSrc();
        if (typeof(onDoneCallback) == "function") onDoneCallback.call(this);
    }
};

ImageEditorDialog.prototype.zoom = function (r) {
    this.zoomRatio = r;

    var w = this.editingImage && this.editingImage.bitmap ? this.editingImage.bitmap.width : this.options.imageData.w;
    var h = this.editingImage && this.editingImage.bitmap ? this.editingImage.bitmap.height : this.options.imageData.h;
    w = Math.round(w * r);
    h = Math.round(h * r);

    this.image.style.width = w + "px";
    this.image.style.height = h + "px";

    var z = Math.round(r * 100);
    this.zoomPercentInput.value = z;
    this.zoomSeeker.value = z;

    this.selectionCanvas.width = w;
    this.selectionCanvas.height = h;
};

ImageEditorDialog.prototype.brightness = function (val) {
    this.busy();
    var that = this;
    this.editingImage.brightness(val, function () {
        that.invalidateImage(function () {
            this.brightnessPercentInput.value = 100;
            this.brightnessSeeker.value = 50;
        });
    });
};

ImageEditorDialog.prototype.contrast = function (val) {
    this.busy();
    var that = this;
    this.editingImage.contrast(val, function () {
        that.invalidateImage(function () {
            this.contrastPercentInput.value = 100;
            this.contrastSeeker.value = 50;
        });
    });
};

ImageEditorDialog.prototype.fade = function (val) {
    this.busy();
    var that = this;
    this.editingImage.fade(val, function () {
        that.invalidateImage(function () {
            this.fadePercentInput.value = 0;
            this.fadeSeeker.value = 0;
        });
    });
};

ImageEditorDialog.prototype.opacity = function (val) {
    this.busy();
    var that = this;
    this.editingImage.opacity(val, function () {
        that.invalidateImage(function () {
            this.opacityPercentInput.value = 100;
            this.opacitySeeker.value = 100;
        });
    });
};

ImageEditorDialog.prototype.rotate = function (val) {
    this.busy();
    var degree = parseInt(val, 10);
    var that = this;
    this.editingImage.rotate(degree, this.keepSizeCheckbox.checked ? jimp.RESIZE_BICUBIC : false,
        function () {
            that.invalidateImage();
        }
    );
};

ImageEditorDialog.prototype.blur = function (val) {
    this.busy();
    val = parseInt(val, 10);
    var that = this;
    this.editingImage.blur(val, function () {
        that.invalidateImage(function () {
            this.blurRadInput.value = "1";
        });
    });
};

ImageEditorDialog.prototype.confirmGaussian = function (val) {
    var that = this;
    Dialog.confirm("This operation probably takes a long time to complete. Continue?", null,
    "Yes", function () {
        that.gaussian(val);
    }, "No");
};
ImageEditorDialog.prototype.gaussian = function (val) {
    this.busy();
    val = parseInt(val, 10);
    // Make sure the busy indicator is shown before executing gaussian blur
    var that = this;
    setTimeout(function() {
        that.editingImage.gaussian(val, function () {
            that.invalidateImage(function () {
                this.gaussianRadInput.value = "1";
            });
        });
    }, 500);
};

ImageEditorDialog.prototype.confirmCrop = function () {
    if (!this.currentRange) return;
    var that = this;
    Dialog.confirm("Crop to the selected region?", null,
    "Crop", function () {
        that.crop();
    }, "Cancel");
    this.activeNode(this.cropButton, false);
};
ImageEditorDialog.prototype.crop = function () {
    if (!this.currentRange) return;

    this.busy();
    var x = this.currentRange.x / this.zoomRatio;
    var y = this.currentRange.y / this.zoomRatio;
    var w = this.currentRange.width / this.zoomRatio;
    var h = this.currentRange.height / this.zoomRatio;
    var that = this;
    this.editingImage.crop(x, y, w, h, function () {
        that.invalidateImage(function () {
            this.zoom(1);
        });
    });
};

ImageEditorDialog.prototype.getEventLocation = function (event, withoutZoom) {
    var rect = this.selectionCanvas.getBoundingClientRect();
    var scrollLeft = this.selectionCanvas.scrollLeft || 0;
    var scrollTop = this.selectionCanvas.scrollTop || 0;
    var x = Math.round(event.clientX - rect.left + scrollLeft);
    var y = Math.round(event.clientY - rect.top + scrollTop);

    return {
        x : x,
        y : y
    };
};

ImageEditorDialog.prototype.handleSelectionMouseDown = function (event) {
    this.lastMouseDownLocation = this.getEventLocation(event);
    this.currentRange = {
        x : this.lastMouseDownLocation.x,
        y : this.lastMouseDownLocation.y,
        width : 0,
        height : 0
    };
};
ImageEditorDialog.prototype.handleSelectionMouseMove = function (event) {
    if (!this.lastMouseDownLocation) return;

    var end = this.getEventLocation(event);
    var x1 = Math.min(end.x, this.lastMouseDownLocation.x);
    var x2 = Math.max(end.x, this.lastMouseDownLocation.x);
    var y1 = Math.min(end.y, this.lastMouseDownLocation.y);
    var y2 = Math.max(end.y, this.lastMouseDownLocation.y);

    var w = x2 - x1;
    var h = y2 - y1;

    this.currentRange = {
        x : x1,
        y : y1,
        width : w,
        height : h
    };

    this.drawSelectingRect(this.currentRange);
};
ImageEditorDialog.prototype.handleSelectionMouseUp = function (event) {
    this.lastMouseDownLocation = null;
    if (this.selectionRangeListener) {
        this.selectionRangeListener.apply(this);
        this.selectionRangeListener = null;
    }
    this.drawSelectingRect();
};

ImageEditorDialog.prototype.drawSelectingRect = function (range) {
    this.selectionCanvasCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
    if (!range) {
        Dom.removeClass(this.selectionCanvas, "Overlay");
        return;
    }

    Dom.addClass(this.selectionCanvas, "Overlay");
    this.selectionCanvasCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
    this.selectionCanvasCtx.fillRect(range.x, range.y, range.width, range.height);
    this.selectionCanvasCtx.strokeStyle = "highlight";
    this.selectionCanvasCtx.setLineDash([5]);
    this.selectionCanvasCtx.strokeRect(range.x, range.y, range.width, range.height);
};

ImageEditorDialog.prototype.showBusyIndicator = function () {
    this.currentBusyOverlay = document.createElement("div");
    this.currentBusyOverlay.className = "BusyOverlay";
    this.currentBusyOverlay.innerHTML = '<div class="Loader"></div>';

    this.dialogFrame.appendChild(this.currentBusyOverlay);
};
ImageEditorDialog.prototype.hideBusyIndicator = function () {
    if (this.currentBusyOverlay) {
        if (this.currentBusyOverlay.parentNode) this.currentBusyOverlay.parentNode.removeChild(this.currentBusyOverlay);
        this.currentBusyOverlay = null;
    }
};
ImageEditorDialog.prototype.busy = function () {
    if (!this.busyCount || this.busyCount < 0) this.busyCount = 0;
    this.busyCount++;
    if (this.busyCount == 1) this.showBusyIndicator();
};
ImageEditorDialog.prototype.unbusy = function () {
    if (this.busyCount > 0) this.busyCount --;
    if (this.busyCount == 0) this.hideBusyIndicator();
};
