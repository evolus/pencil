function NPatchSpecEditorDialog () {
    Dialog.call(this);
    this.title = "Edit N-Patch Specification";
    this.subTitle = "";

    this.bind("mousedown", this.handleGlobalMouseDown, this.xCellContainer);
    this.bind("mousedown", this.handleGlobalMouseDown, this.yCellContainer);
    this.bind("mouseup", this.handleGlobalMouseUp, document);
    this.bind("mousemove", this.handleGlobalMouseMove, document);

    this.bind("click", function () {
        console.log(this.useDarkBackgroundCheckbox.checked);
        this.container.setAttribute("dark", this.useDarkBackgroundCheckbox.checked);
    }, this.useDarkBackgroundCheckbox);
}
__extend(Dialog, NPatchSpecEditorDialog);

NPatchSpecEditorDialog.MIN_SIZE = 5;

NPatchSpecEditorDialog.prototype.onShown = function () {
}

NPatchSpecEditorDialog.prototype.addCell = function (from, to, isX) {
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
            {_name: "div", _uri: PencilNamespaces.html, "class": "Indicator", _id: "indicator"},
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
NPatchSpecEditorDialog.prototype.handleGlobalMouseDown = function (event) {
    var cell = Dom.findParentWithClass(event.target, "Cell");
    var indicator = Dom.findParentWithClass(event.target, "Indicator");
    if (indicator) return;

    var container = Dom.findParentWithClass(event.target, "CellContainer");
    var horizontal = container == this.xCellContainer;

    this.held = {};
    this.held.ox = event.clientX;
    this.held.oy = event.clientY;
    this.held.button = event.button;

    if (cell) {
        this.held.cell = cell;
        var resizer = Dom.findParentWithClass(event.target, "Resizer");

        if (resizer) {
            this.held.resizing = true;
            this.held.resizeStart = resizer.classList.contains("StartResizer");
        }
    } else {
        if (event.button != 0) {
            this.held = null;
            return;
        }
        var from = Math.round((horizontal ? (event.offsetX) : (event.offsetY)) * this.r);
        var to = from + NPatchSpecEditorDialog.MIN_SIZE;
        cell = this.addCell(from, to, horizontal);

        this.held.cell = cell;
        this.held.resizing = true;
        this.held.resizeStart = false;

        if (horizontal) {
            this.held.ox += Math.round(NPatchSpecEditorDialog.MIN_SIZE / this.r);
        } else {
            this.held.oy += Math.round(NPatchSpecEditorDialog.MIN_SIZE / this.r);
        }
    }

    this.held.oFrom = cell._data.from;
    this.held.oTo = cell._data.to;
    this.held.minStart = 0;
    this.held.maxEnd = horizontal ? (this.options.imageData.w) : (this.options.imageData.h);

    for (var child of container.childNodes) {
        if (!child._data || child == cell) continue;
        if (child._data.to <= cell._data.from) this.held.minStart = Math.max(this.held.minStart, child._data.to);
        if (child._data.from >= cell._data.to) this.held.maxEnd = Math.min(this.held.maxEnd, child._data.from);
    }
};
NPatchSpecEditorDialog.prototype.handleGlobalMouseUp = function (event) {
    if (!this.held) return;
    if (event.button == 2) {
        var cell = this.held.cell;
        Dialog.confirm("Do you want to remove this scalable area?", null, "Delete", function () {
            cell.parentNode.removeChild(cell);
        });
    }
    this.held = null;
};
NPatchSpecEditorDialog.prototype.handleGlobalMouseMove = function (event) {
    if (!this.held || this.held.button != 0) return;
    var horizontal = this.held.cell.parentNode == this.xCellContainer;
    var delta = Math.round((horizontal ? (event.clientX - this.held.ox) : (event.clientY - this.held.oy)) * this.r);
    if (this.held.resizing) {
        if (this.held.resizeStart) {
            delta = Math.max(this.held.minStart - this.held.oFrom, delta);
            delta = Math.min(Math.max(this.held.oFrom, this.held.oTo - NPatchSpecEditorDialog.MIN_SIZE) - this.held.oFrom, delta);

            this.held.cell._data.from = this.held.oFrom + delta;
        } else {
            delta = Math.min(this.held.maxEnd - this.held.oTo, delta);
            delta = Math.max(Math.min(this.held.oFrom + NPatchSpecEditorDialog.MIN_SIZE, this.held.oTo) - this.held.oTo, delta);
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
NPatchSpecEditorDialog.prototype.invalidateCellPosition = function (cell) {
    var a = Math.floor(cell._data.from / this.r);
    var b = Math.floor(cell._data.to / this.r);
    var s = b - a;
    if (cell.parentNode == this.xCellContainer) {
        cell.style.left = a + "px";
        cell.style.width = s + "px"
        cell._indicator.style.bottom = (0 - this.options.imageData.h / this.r) + "px";
    } else {
        cell.style.top = a + "px";
        cell.style.height = s + "px"
        cell._indicator.style.right = (0 - this.options.imageData.w / this.r) + "px";
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

NPatchSpecEditorDialog.prototype.setup = function (options) {
    this.options = options || {};
    var minSize = 10 * Util.em();
    var maxW = window.innerWidth - 6 * Util.em();
    var maxH = window.innerHeight - 20 * Util.em();

    var r0 = Math.max(this.options.imageData.w / maxW, this.options.imageData.h / maxH);
    var r1 = Math.min(this.options.imageData.w / minSize, this.options.imageData.h / minSize);

    this.image.src = this.options.imageData.toImageSrc();

    var r = r1 < 1 ? r1 : r0;
    this.setZoom(r);

    console.log("setup for", this.options.imageData);

    if (this.options.imageData.xCells) {
        for (var cell of this.options.imageData.xCells) this.addCell(cell.from, cell.to, true);
    }
    if (this.options.imageData.yCells) {
        for (var cell of this.options.imageData.yCells) this.addCell(cell.from, cell.to, false);
    }
};

NPatchSpecEditorDialog.prototype.setZoom = function (r) {
    this.r = r;
    var w = Math.round(this.options.imageData.w / r);
    var h = Math.round(this.options.imageData.h / r);

    this.image.style.width = w + "px";
    this.image.style.height = h + "px";
};

NPatchSpecEditorDialog.prototype.buildResultImageData = function () {
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
NPatchSpecEditorDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CANCEL,
        {   type: "accept", title: "Apply",
            run: function () {
                if (this.options.onDone) this.options.onDone(this.buildResultImageData());
                return true;
            }
        }
    ]
};
