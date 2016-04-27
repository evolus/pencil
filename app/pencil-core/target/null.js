function Null(canvas, svg) {
    this.svg = svg;
    this.canvas = canvas;

    var thiz = this;
}
Null.prototype.getName = function () {
    return "Null";
};
Null.prototype.isFor = function (svg) {
    return this.svg == svg;
};
Null.prototype.getProperties = function () {
    return {};
};
Null.prototype.getPropertyGroups = function () {
    return [];
};
Null.prototype.setProperty = function (name, value) {
};
Null.prototype.getProperty = function (name) {
    return null;
};
Null.prototype.getGeometry = function () {
    var bound = this.getBoundingRect();
    var geo = new Geometry();
    geo.ctm = this.svg.ownerSVGElement.createSVGMatrix();
    geo.ctm.e = bound.x / this.canvas.zoom;
    geo.ctm.f = bound.y / this.canvas.zoom;

    geo.dim = {};
    geo.dim.w = bound.width / this.canvas.zoom;
    geo.dim.h = bound.height / this.canvas.zoom;

    return geo;
};
Null.prototype.getBoundingRect = function () {
    var rect = {x: 0, y: 0, width: 0, height: 0};
    try {
        rect = this.svg.getBBox();
    } catch (e) {}
    var ctm = this.svg.getTransformToElement(this.canvas.drawingLayer);

    var rect = Svg.getBoundRectInCTM(rect, ctm.inverse());
    rect = {x: rect.left, y: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top};

    return this.canvas.getZoomedRect(rect);
};
Null.prototype.setGeometry = function (geo) {
};

Null.prototype.moveBy = function (x, y, zoomAware) {
    var ctm = this.svg.getTransformToElement(this.canvas.drawingLayer);
    var v = Svg.vectorInCTM({x: x / (zoomAware ? this.canvas.zoom : 1), y: y / (zoomAware ? this.canvas.zoom : 1)}, ctm, true);
    ctm = ctm.translate(v.x, v.y);

    Svg.ensureCTM(this.svg, ctm);
};

Null.prototype.setPositionSnapshot = function () {
    var ctm = this.svg.getTransformToElement(this.canvas.drawingLayer);

    this.svg.transform.baseVal.consolidate();

    var translate = this.svg.ownerSVGElement.createSVGMatrix();
    translate.e = 0;
    translate.f = 0;

    translate = this.svg.transform.baseVal.createSVGTransformFromMatrix(translate);
    this.svg.transform.baseVal.appendItem(translate);

    this._pSnapshot = {ctm: ctm, translate: translate, x: ctm.e, y: ctm.f};
};
Null.prototype.moveFromSnapshot = function (dx, dy, dontNormalize) {
    var v = Svg.vectorInCTM({x: dx, y: dy},
                            this._pSnapshot.ctm,
                            true);

    if (!dontNormalize) {
        var grid = Pencil.getGridSize();
        newX = Util.gridNormalize(v.x + this._pSnapshot.x, grid.w);
        newY = Util.gridNormalize(v.y + this._pSnapshot.y, grid.h);

        v.x = newX - this._pSnapshot.x;
        v.y = newY - this._pSnapshot.y;
    }

    this._pSnapshot.translate.matrix.e = v.x;
    this._pSnapshot.translate.matrix.f = v.y;
};
Null.prototype.clearPositionSnapshot = function () {
    delete this._pSnapshot;
    this._pSnapshot = null;
    this.svg.transform.baseVal.consolidate();
};
Null.prototype.normalizePositionToGrid = function () {
    this.setPositionSnapshot();
    this.moveFromSnapshot(0, 0);
    this.clearPositionSnapshot();
};


Null.prototype.deleteTarget = function () {
    this.svg.parentNode.removeChild(this.svg);
};
Null.prototype.bringForward = function () {
    try {
        var next = this.svg.nextSibling;
        if (next) {
            this.canvas.run( function () {
                var parentNode = this.svg.parentNode;
                parentNode.removeChild(this.svg);
                var next2 = next.nextSibling;
                if (next2) {
                    parentNode.insertBefore(this.svg, next2);
                } else {
                    parentNode.appendChild(this.svg);
                }
            }, this, Util.getMessage("action.bring.forward"));
        }
    } catch (e) { alert(e); }
};
Null.prototype.bringToFront = function () {
    try {
        var next = this.svg.nextSibling;
        if (next) {
            this.canvas.run( function () {
                var parentNode = this.svg.parentNode;
                parentNode.removeChild(this.svg);
                parentNode.appendChild(this.svg);
            }, this, Util.getMessage("action.bring.to.front"));
        }
    } catch (e) { alert(e); }
};
Null.prototype.sendBackward = function () {
    try {
        var previous = this.svg.previousSibling;
        if (previous) {
            this.canvas.run( function () {
                var parentNode = this.svg.parentNode;
                parentNode.removeChild(this.svg);
                parentNode.insertBefore(this.svg, previous);
            }, this, Util.getMessage("action.send.backward"));
        }
    } catch (e) { alert(e); }
};
Null.prototype.sendToBack = function () {
    try {
        var previous = this.svg.previousSibling;
        if (previous) {
            this.canvas.run( function () {
                var parentNode = this.svg.parentNode;
                parentNode.removeChild(this.svg);
                parentNode.insertBefore(this.svg, parentNode.firstChild);
            }, this, Util.getMessage("action.send.to.back"));
        }
    } catch (e) { alert(e); }
};

Null.prototype.getTextEditingInfo = function () {
    var info = null;
    return info;
};

Null.prototype.createTransferableData = function () {
    return {type: ShapeXferHelper.MIME_TYPE,
            dataNode: this.svg.cloneNode(true)
           };
};
Null.prototype.lock = function () {
    this.svg.setAttributeNS(PencilNamespaces.p, "p:locked", "true");
};

Null.prototype.markAsMoving = function (moving) {
    Svg.optimizeSpeed(this.svg, moving);
};

Null.prototype.invalidateInboundConnections = function () {
};
Null.prototype.invalidateOutboundConnections = function () {
};


