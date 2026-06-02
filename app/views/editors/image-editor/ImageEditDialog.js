function ImageEditDialog () {
    Dialog.call(this);
    this.title = "Edit Image";
    this.subTitle = "";

    this.grabWidth = true;
    this.grabHeight = true;

    this.bind("mousedown", this.handleGlobalMouseDown, this.xCellContainer);
    this.bind("mousedown", this.handleGlobalMouseDown, this.yCellContainer);
    this.bind("mouseup", this.handleGlobalMouseUp, document);
    this.bind("mousemove", this.handleGlobalMouseMove, document);

    this.bind("scroll", this.invalidateScrolling, this.wrapper);

    this.bind("click", function () {
        console.log(this.useDarkBackgroundCheckbox.checked);
        this.container.setAttribute("dark", this.useDarkBackgroundCheckbox.checked);
    }, this.useDarkBackgroundCheckbox);
}
__extend(Dialog, ImageEditDialog);

ImageEditDialog.MIN_SIZE = 5;

ImageEditDialog.prototype.onShown = function () {
    this.invalidateScrolling();
};

ImageEditDialog.prototype.addCell = function (from, to, isX) {
    var owner = isX ? this.xCellContainer : this.yCellContainer;
    var holder = {};
    var div = Dom.newDOMElement({
        _name: "div",
        _uri: PencilNamespaces.html,
        "class": "Cell",
        _children: [
            {_name: "div", _uri: PencilNamespaces.html, "class": (isX ? "XCellInfo" : "YCellInfo"), _id: "info", _children: [
                {_name: "div", _uri: PencilNamespaces.html, "class": "Info", _id: "cellInfo", "flex" : "1"}
            ]},
            {_name: "div", _uri: PencilNamespaces.html, "class": "Indicator", _id: "indicator",
                _children: [
                    {_name: "div", _uri: PencilNamespaces.html, "class": "StartScaler Scaler"},
                    {_name: "div", _uri: PencilNamespaces.html, "class": "EndScaler Scaler"}
                ]
            },
            {_name: "div", _uri: PencilNamespaces.html, "class": "StartResizer Resizer"},
            {_name: "div", _uri: PencilNamespaces.html, "class": "EndResizer Resizer"}
        ]
    }, document, holder)
    if (isX) {
        this.xCellContainer.appendChild(div);
    } else {
        this.yCellContainer.appendChild(div);
    }
    div._data = {from: from, to: to};
    div._isX = isX;
    div._cellInfo = holder.cellInfo;
    div._indicator = holder.indicator;
    this.invalidateCellPosition(div);

    return div;
};
ImageEditDialog.prototype.handleGlobalMouseDown = function (event) {
    var cell = Dom.findParentWithClass(event.target, "Cell");
    var indicator = Dom.findParentWithClass(event.target, "Indicator");
    //if (indicator) return;

    var container = Dom.findParentWithClass(event.target, "CellContainer");
    var horizontal = container == this.xCellContainer;

    this.held = {};
    this.held.ox = event.clientX;
    this.held.oy = event.clientY;
    this.held.button = event.button;
    this.held.horizontal = horizontal;

    if (cell) {
        this.held.cell = cell;
        var resizer = Dom.findParentWithClass(event.target, "Resizer");

        if (resizer) {
            this.held.resizing = true;
            this.held.resizeStart = resizer.classList.contains("StartResizer");
        } else {
            var scaler = Dom.findParentWithClass(event.target, "Scaler");
            if (scaler) {
                this.held.scaling = true;
                this.held.scaleStart = scaler.classList.contains("StartScaler");
            }
        }
    } else {
        if (event.button != 0) {
            this.held = null;
            return;
        }
        var from = Math.round((horizontal ? (event.offsetX) : (event.offsetY)) * this.r);
        var to = from + ImageEditDialog.MIN_SIZE;
        cell = this.addCell(from, to, horizontal);

        this.held.cell = cell;
        this.held.resizing = true;
        this.held.resizeStart = false;

        if (horizontal) {
            this.held.ox += Math.round(ImageEditDialog.MIN_SIZE / this.r);
        } else {
            this.held.oy += Math.round(ImageEditDialog.MIN_SIZE / this.r);
        }
    }

    this.held.oFrom = cell._data.from;
    this.held.oTo = cell._data.to;
    this.held.minStart = 0;
    this.held.maxEnd = horizontal ? (this.data.w) : (this.data.h);

    for (var child of container.childNodes) {
        if (!child._data || child == cell) continue;
        if (child._data.to <= cell._data.from) this.held.minStart = Math.max(this.held.minStart, child._data.to);
        if (child._data.from >= cell._data.to) this.held.maxEnd = Math.min(this.held.maxEnd, child._data.from);
    }
};
ImageEditDialog.prototype.handleGlobalMouseUp = function (event) {
    if (!this.held) return;
    if (event.button == 2) {
        var cell = this.held.cell;
        Dialog.confirm("Do you want to remove this scalable area?", null, "Delete", function () {
            cell.parentNode.removeChild(cell);
        });
    }

    if (this.held.scaling) {
        // committing scaling changes
        this.commitScaling({
            oFrom: this.held.oFrom,
            oTo: this.held.oTo,
            cell: this.held.cell,
            horizontal: this.held.horizontal
        })
    }
    this.held = null;
};
ImageEditDialog.prototype.commitScaling = function (request) {
    var canvas = document.createElement("canvas");
    var cell = request.cell._data;
    var delta = ((cell.to - cell.from) - (request.oTo - request.oFrom));
    var dw = request.horizontal ? delta : 0;
    var dh = request.horizontal ? 0 : delta;

    var w = Math.max(this.data.w + dw, 0);
    var h = Math.max(this.data.h + dh, 0);

    console.log({delta, dw, dh, w, h});

    canvas.width = w;
    canvas.height = h;

    var ctx = canvas.getContext("2d");

    if (request.horizontal) {
        if (request.oFrom > 0) ctx.drawImage(this.image, 0, 0, request.oFrom, this.data.h, 0, 0, request.oFrom, this.data.h);
        ctx.drawImage(this.image, request.oFrom, 0, request.oTo - request.oFrom, this.data.h, request.oFrom, 0, cell.to - cell.from, this.data.h);
        if (request.oTo < this.data.w) ctx.drawImage(this.image, request.oTo, 0, this.data.w - request.oTo, this.data.h, request.oFrom + (cell.to - cell.from), 0, this.data.w - request.oTo, this.data.h);


        for (var child of this.xCellContainer.childNodes) {
            if (!child._data || child._data.from <= request.oFrom) continue;
            child._data.from += dw;
            child._data.to += dw;
        }

        request.cell._data.from = request.oFrom;
        request.cell._data.to = request.oTo + dw;
    } else {
        if (request.oFrom > 0) ctx.drawImage(this.image, 0, 0, this.data.w, request.oFrom, 0, 0, this.data.w, request.oFrom);
        ctx.drawImage(this.image, 0, request.oFrom, this.data.w, request.oTo - request.oFrom, 0, request.oFrom, this.data.w, cell.to - cell.from);
        if (request.oTo < this.data.h) ctx.drawImage(this.image, 0, request.oTo, this.data.w, this.data.h - request.oTo, 0, request.oFrom + (cell.to - cell.from), this.data.w, this.data.h - request.oTo);

        for (var child of this.yCellContainer.childNodes) {
            if (!child._data || child._data.from <= request.oFrom) continue;
            child._data.from += dh;
            child._data.to += dh;
        }

        request.cell._data.from = request.oFrom;
        request.cell._data.to = request.oTo + dh;
    }

    var src = canvas.toDataURL("image/png");
    this.image.src = src;

    this.data = {
        w: w,
        h: h,
        src: src,
    };

    this.setZoom(this.r);

    this.outerWrapper.querySelectorAll(".CellContainer > .Cell").forEach((cell, i) => {
        this.invalidateCellPosition(cell);
    });


    this.invalidateScrolling();

    console.log("New data:", this.data);
};
ImageEditDialog.prototype.handleGlobalMouseMove = function (event) {
    if (!this.held || this.held.button != 0) return;
    var horizontal = this.held.cell.parentNode == this.xCellContainer;
    var delta = Math.round((horizontal ? (event.clientX - this.held.ox) : (event.clientY - this.held.oy)) * this.r);
    if (this.held.resizing || this.held.scaling) {
        if (this.held.resizeStart || this.held.scaleStart) {
            delta = Math.max(this.held.minStart - this.held.oFrom, delta);
            delta = Math.min(Math.max(this.held.oFrom, this.held.oTo - ImageEditDialog.MIN_SIZE) - this.held.oFrom, delta);

            this.held.cell._data.from = this.held.oFrom + delta;
        } else {
            delta = Math.min(this.held.maxEnd - this.held.oTo, delta);
            delta = Math.max(Math.min(this.held.oFrom + ImageEditDialog.MIN_SIZE, this.held.oTo) - this.held.oTo, delta);
            this.held.cell._data.to = this.held.oTo + delta;
        }
    } else {
        delta = Math.min(delta, this.held.maxEnd - this.held.oTo);
        delta = Math.max(delta, this.held.minStart - this.held.oFrom);

        this.held.cell._data.from = this.held.oFrom + delta;
        this.held.cell._data.to = this.held.oTo + delta;
    }

    this.invalidateCellPosition(this.held.cell);
};
ImageEditDialog.prototype.invalidateCellPosition = function (cell) {
    var a = Math.floor(cell._data.from / this.r);
    var b = Math.floor(cell._data.to / this.r);
    var s = b - a;
    if (cell.parentNode == this.xCellContainer) {
        cell.style.left = a + "px";
        cell.style.width = s + "px"
        cell._indicator.style.height = Math.round(this.xCellContainerWrapper.offsetHeight - cell.offsetHeight) + "px";
    } else {
        cell.style.top = a + "px";
        cell.style.height = s + "px"
        cell._indicator.style.width = Math.round(this.yCellContainerWrapper.offsetWidth - cell.offsetWidth) + "px";
    }
    var info = cell._cellInfo;
    if (info) {
        info.textContent = (cell._data.to - cell._data.from);
        if (!cell._isX) {
            var w = Math.round(info.offsetWidth);
            var r = (s/2) - (w/2);
            info.style.transform = "rotate(-90deg) translate(-" + r + "px, 0px)";
        }
    }
};

ImageEditDialog.prototype.setup = function (options) {
    this.options = options || {};
    var minSize = 10 * Util.em();
    var maxW = window.innerWidth - 6 * Util.em();
    var maxH = window.innerHeight - 20 * Util.em();

    var r0 = Math.max(this.options.imageData.w / maxW, this.options.imageData.h / maxH);
    // var r1 = Math.min(this.options.imageData.w / minSize, this.options.imageData.h / minSize);

    this.refId = ImageData.refStringToId(this.options.imageData.data);

    var src = this.options.imageData.toImageSrc();
    this.image.src = src;

    this.data = {
        w: this.options.imageData.w,
        h: this.options.imageData.h,
        src: src,
    };

    var r = r0 > 1 ? r0 : 1;
    this.setZoom(r);

    console.log("setup for", this.options.imageData);

    if (this.options.imageData.xCells) {
        for (var cell of this.options.imageData.xCells) this.addCell(cell.from, cell.to, true);
    }
    if (this.options.imageData.yCells) {
        for (var cell of this.options.imageData.yCells) this.addCell(cell.from, cell.to, false);
    }
};

ImageEditDialog.prototype.setZoom = function (r) {
    this.r = r;
    var w = Math.round(this.data.w / r);
    var h = Math.round(this.data.h / r);

    // h *= 2;
    // w *= 2;

    this.image.style.width = w + "px";
    this.image.style.height = h + "px";

    this.xCellContainer.style.width = w + "px";
    this.yCellContainer.style.height = h + "px";
};

ImageEditDialog.prototype.invalidateScrolling = function () {
    var r0 = this.wrapper.getBoundingClientRect();
    var r1 = this.container.getBoundingClientRect();
    var dx = Math.round(r1.left - r0.left);
    var dy = Math.round(r1.top - r0.top);

    this.xCellContainer.style.left = dx + "px";
    this.yCellContainer.style.top = dy + "px";
};

ImageEditDialog.prototype.buildResultImageData = function () {
    var xCells = [];
    for (var child of this.xCellContainer.childNodes) {
        if (!child._data) continue;
        xCells.push(child._data);
    }
    var yCells = [];
    for (var child of this.yCellContainer.childNodes) {
        if (!child._data) continue;
        yCells.push(child._data);
    }

    var result = new ImageData(this.options.imageData.w, this.options.imageData.h, this.options.imageData.data, xCells, yCells);
    console.log("returning", result);
    return result;
};

ImageEditDialog.prototype.save = function (resRefs, updateAllRefs) {
    updateAllRefs = updateAllRefs || !resRefs || resRefs.total === 1;

    var refId = this.refId;
    var tmpFile = tmp.fileSync({ mode: parseInt("644", 8), prefix: 'imageedit-', postfix: '.png' });
    var actualPath = tmpFile.name;

    var next = function () {
        var url = Pencil.controller.refIdToUrl(refId);

        var newImageData = new ImageData(this.data.w, this.data.h, ImageData.idToRefString(refId));

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
                            var ratio = window.devicePixelRatio || 1;
                            var dim = new Dimension(Math.round(newImageData.w / ratio), Math.round(newImageData.h / ratio));
                            controller.setProperty("box", dim);
                        }
                    }
                }
            }

            if (this.options.onDone) this.options.onDone(newImageData, options);
            tmpFile.removeCallback();
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

    const prefix = "data:image/png;base64,";
    var base64Data = this.data.src;
    if (base64Data.startsWith(prefix)) base64Data = base64Data.substring(prefix.length);

    var buffer = Buffer.from(base64Data, "base64");
    fs.writeFile(actualPath, buffer, "utf8", function (err) {
        if (updateAllRefs) {
            var filePath = Pencil.controller.refIdToFilePath(refId);
            fs.copyFileSync(actualPath, filePath);
            next();
        } else {
            Pencil.controller.copyAsRef(actualPath, function (newRefId) {
                refId = newRefId;
                next();
            });
        }
    });


};

ImageEditDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CANCEL,
        {   type: "accept", title: "Save",
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
