function ImageEditorDialog () {
    this.grabWidth = true;
    this.grabHeight = true;
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
    this.bind("mousedown", this.handleSelectionMouseDown, this.drawingScollPane);
    this.bind("mouseup", this.handleSelectionMouseUp, document);
    this.bind("mousemove", this.handleSelectionMouseMove, document);

    this.selectionCanvasCtx = this.selectionCanvas.getContext("2d");
};
ImageEditorDialog.prototype.__initTools = function () {
    var thiz = this;

    this.toolbarContainer.childNodes.forEach(function (node) {
        if (node.__widget && node.__widget instanceof BaseTemplatedWidget && node.__widget.setup) {
            node.__widget.setup(thiz.getImageSource());
        }
    });
    
    var nodes = this.toolbarContainer.querySelectorAll(".PopupToggler");
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].addEventListener("click", function (event) {
            var toggler = Dom.findParentWithClass(event.target, "PopupToggler");
            var popup = toggler.parentNode.querySelector(".PopupContainer").__widget;
            if (!popup.isVisible()) {
                popup.show(toggler, "left-inside", "bottom", 0, 5);
                thiz._beginRepeatableImageAction();
            }
        });
        
        nodes[i].parentNode.querySelector(".PopupContainer").__widget.onHide = function () {
            thiz._endRepeatableImageAction();
        };
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

ImageEditorDialog.prototype._getImageSize = function () {
    var w = this.editingImage && this.editingImage.bitmap ? this.editingImage.bitmap.width : this.options.imageData.w;
    var h = this.editingImage && this.editingImage.bitmap ? this.editingImage.bitmap.height : this.options.imageData.h;
    
    return {
        w: w,
        h: h
    };
};

ImageEditorDialog.prototype._getDisplaySize = function () {
    var size = this._getImageSize();
    
    return {
        w: Math.round(size.w * this.zoomRatio),
        h: Math.round(size.h * this.zoomRatio)
    };
};
ImageEditorDialog.prototype._invalidateDisplaySize = function () {
    var size = this._getDisplaySize();
    
    var padding = 1 * Util.em();

    this.drawingContainer.style.width = Math.round(size.w) + "px";
    this.drawingContainer.style.height = Math.round(size.h) + "px";
};


ImageEditorDialog.prototype.setup = function (options, callback) {
    this.options = options || {};
    this.currentRange = null;
    var thiz = this;
    this.setupEditSpace(function () {
        thiz.invalidateImage(callback);
    });
};

ImageEditorDialog.prototype.setupEditSpace = function (callback) {
    var src = this.options.imageData.data;
    var refId = this.getRefId();
    if (refId) src = Pencil.controller.refIdToFilePath(refId);
    var that = this;
    jimp.read(src, function (err, image) {
        if (err) throw err;

        that.editingImage = image;
        that.editingImage.quality(100);
        that.editingImage.rgba(true);
        
        if (callback) callback();
    });
};

ImageEditorDialog.prototype.invalidateImage = function (onDoneCallback) {
    this._invalidateUI();
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
            
            that._invalidateDisplaySize();
            
            that.unbusy();
        });
    } else {
        this.image.src = this.options.imageData.toImageSrc();
        if (typeof(onDoneCallback) == "function") onDoneCallback.call(this);
    }
};
ImageEditorDialog.prototype._invalidateUI = function () {
    this.drawSelectingRect();
    this._invalidateDisplaySize();

};
ImageEditorDialog.prototype.zoom = function (r) {
    this.zoomRatio = r;
    this._invalidateUI();
};

ImageEditorDialog._cloneWithAlpha = function (source, callback) {
    new jimp(source.bitmap.width + 10, source.bitmap.height + 10, 0xffffff00, function (error, image) {
        console.log("new image alpha", image.hasAlpha());
        image.composite(source, 0, 0, function () {
            console.log("  > after composite", image.hasAlpha());
            callback(image);
        });
    });
};

ImageEditorDialog.prototype._beginRepeatableImageAction = function (callback) {
    this.__backupImage = this.editingImage.clone();
    if (!this.currentRange) {
        this._targetImage = this.editingImage;
        if (callback) callback();
    } else {
        this._targetImage = this.editingImage.clone();
        console.log("Alpha after clone: ", this._targetImage.hasAlpha());
        var thiz = this;
        this._targetImage.crop(this.currentRange.x, this.currentRange.y, this.currentRange.width, this.currentRange.height, function () {
            thiz._targetImage.bitmap.data[3] = 0xfe;
            if (!thiz._targetImage.hasAlpha()) {
                ImageEditorDialog._cloneWithAlpha(thiz._targetImage, function (newImage) {
                    thiz._targetImage = newImage;
                    if (callback) callback();
                });
            } else {
                if (callback) callback();
            }
        });
    }
};
ImageEditorDialog.prototype._endRepeatableImageAction = function (callback) {
    this._targetImage = null;
};


ImageEditorDialog.prototype._performActionOnSelection = function (performer, callback) {
    var target = (this._targetImage || this.editingImage).clone();
    var thiz = this;
    if (!this.currentRange) {
        performer(target, function () {
            thiz.editingImage = target;
            thiz.invalidateImage(callback);
        });
    } else {
        performer(target, function () {
            // merge the result back
            thiz.editingImage.blit(target, thiz.currentRange.x, thiz.currentRange.y, function () {
                thiz.invalidateImage(callback);
            });
        })
    }
};

ImageEditorDialog.prototype.getImageSource = function () {
    var thiz = this;

    if (!this.__imageSource) {
        this.__imageSource = {
            start: function (callback) {
                thiz._beginRepeatableImageAction(callback);
            },
            
            get: function () {
                return thiz._targetImage;
            },
            
            set: function (image, options, callback) {
                console.log("options", options);
                if (!thiz.currentRange || options.replace) {
                    thiz.editingImage = image;
                    thiz.currentRange = null;
                    thiz.invalidateImage(callback);
                } else {
                    thiz.editingImage.blit(image, thiz.currentRange.x, thiz.currentRange.y, function () {
                        thiz.invalidateImage(callback);
                    });
                }
            },
            
            rollback: function (callback) {
                thiz.editingImage = thiz.__backupImage;
                thiz._endRepeatableImageAction();
                thiz.invalidateImage(function () {
                    thiz.__backupImage = null;
                    callback();
                });
            },

            commit: function (callback) {
                thiz._endRepeatableImageAction();
                thiz.__backupImage = null;
            }
        };
    }
    
    return this.__imageSource;
};

ImageEditorDialog.prototype.rotate = function (val) {
    this.busy();
    var degree = parseInt(val, 10);
    var that = this;
    
    this._performActionOnSelection(
        function (image, callback) {
            image.rotate(degree, that.keepSizeCheckbox.checked ? jimp.RESIZE_BICUBIC : false, callback);
        },
        function () {
            that.invalidateImage();
        }
    );
};

ImageEditorDialog.prototype.blur = function (val) {
    this.busy();
    val = parseInt(val, 10);
    var that = this;
    
    this._performActionOnSelection(
        function (image, callback) {
            image.blur(val, callback);
        },
        function () {
            that.invalidateImage(function () {
                that.blurRadInput.value = "1";
            });
        }
    );
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
        that._performActionOnSelection(
            function (image, callback) {
                image.gaussian(val, callback);
            },
            function () {
                that.invalidateImage(function () {
                    that.gaussianRadInput.value = "1";
                });
            }
        );
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
    var rect = this.drawingContainer.getBoundingClientRect();
    var x = Math.round((event.clientX - rect.left) / this.zoomRatio);
    var y = Math.round((event.clientY - rect.top) / this.zoomRatio);

    return {
        x : x,
        y : y
    };
};
ImageEditorDialog.prototype._validateSelectionRange = function () {
    if (this.currentRange == null) return;
    if (this.currentRange.x < 0) {
        this.currentRange.width += this.currentRange.x;
        this.currentRange.x = 0;
    }
    if (this.currentRange.y < 0) {
        this.currentRange.height += this.currentRange.y;
        this.currentRange.y = 0;
    }
    var is = this._getImageSize();
    var dw = this.currentRange.x + this.currentRange.width - is.w;
    if (dw > 0) {
        this.currentRange.width -= dw;
    }
    var dh = this.currentRange.y + this.currentRange.height - is.h;
    if (dh > 0) {
        this.currentRange.height -= dh;
    }

};
ImageEditorDialog.prototype.handleSelectionMouseDown = function (event) {
    Dom.cancelEvent(event);
    if (event.target.parentNode == this.selectionBox && this.currentRange) {
        this.currentRangeHandle = event.target;
        if (!this.currentRangeHandle._spec) {
            this.currentRangeHandle._spec = {
                dx: ImageEditorDialog._getNumberAttr(this.currentRangeHandle, "dx"),
                dy: ImageEditorDialog._getNumberAttr(this.currentRangeHandle, "dy"),
                dw: ImageEditorDialog._getNumberAttr(this.currentRangeHandle, "dw"),
                dh: ImageEditorDialog._getNumberAttr(this.currentRangeHandle, "dh")
            };
        }
        this._originalRange = {
            x: this.currentRange.x,
            y: this.currentRange.y,
            width: this.currentRange.width,
            height: this.currentRange.height
        }
        this.lastMouseDownLocation = this.getEventLocation(event);
        return;
    }
    
    this.lastMouseDownLocation = this.getEventLocation(event);
    this.currentRange = {
        x : this.lastMouseDownLocation.x,
        y : this.lastMouseDownLocation.y,
        width : 0,
        height : 0
    };
    this._moved = false;
    
    this._validateSelectionRange();
};
ImageEditorDialog._getNumberAttr = function (node, name) {
    var attr = node.getAttribute(name);
    if (!attr) return 0;
    return parseFloat(attr);
}
ImageEditorDialog.prototype.handleSelectionHandleMove = function (event) {
    if (!this.lastMouseDownLocation) return;
    var end = this.getEventLocation(event);
    var dx = end.x - this.lastMouseDownLocation.x;
    var dy = end.y - this.lastMouseDownLocation.y;
    
    var spec = this.currentRangeHandle._spec;
    
    this.currentRange.x = this._originalRange.x + spec.dx * dx;
    this.currentRange.y = this._originalRange.y + spec.dy * dy;
    this.currentRange.width = this._originalRange.width + spec.dw * dx;
    this.currentRange.height = this._originalRange.height + spec.dh * dy;
    
    this._validateSelectionRange();
    this.drawSelectingRect();
};
ImageEditorDialog.prototype.handleSelectionMouseMove = function (event) {
    if (this.currentRange && this.currentRangeHandle) {
        Dom.cancelEvent(event);
        this.handleSelectionHandleMove(event);
        return;
    }
    
    if (!this.lastMouseDownLocation) return;
    Dom.cancelEvent(event);

    var end = this.getEventLocation(event);
    
    var dx = Math.abs(end.x - this.lastMouseDownLocation.x);
    var dy = Math.abs(end.y - this.lastMouseDownLocation.y);
    
    if (dx > 2 || dy > 2) this._moved = true;
    
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
    
    this._validateSelectionRange();
    this.drawSelectingRect();
};
ImageEditorDialog.prototype.handleSelectionMouseUp = function (event) {
    this.lastMouseDownLocation = null;
    this.currentRangeHandle = null;
    if (this.selectionRangeListener) {
        this.selectionRangeListener.apply(this);
        this.selectionRangeListener = null;
    }
    
    if (!this._moved) this.currentRange = null;
    this.drawSelectingRect();
};

ImageEditorDialog.prototype.drawSelectingRect = function () {
    if (!this.currentRange) {
        this.selectionBox.style.display = "none";
        return;
    }
    this.selectionBox.style.display = "block";
    this.selectionBox.style.left = Math.round(this.currentRange.x * this.zoomRatio) + "px";
    this.selectionBox.style.top = Math.round(this.currentRange.y * this.zoomRatio) + "px";
    this.selectionBox.style.width = Math.round(this.currentRange.width * this.zoomRatio) + "px";
    this.selectionBox.style.height = Math.round(this.currentRange.height * this.zoomRatio) + "px";
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


Pencil.bootzxxx = function (event) {
    var dialog = new ImageEditorDialog();
    dialog.open({
        imageData: {data: "/home/dgthanhan/Pictures/Archive/Selection_081.png"},
        onDone: function (newImageData) {
        }
    });
};