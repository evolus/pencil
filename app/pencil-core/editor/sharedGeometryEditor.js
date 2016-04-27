function SharedGeomtryEditor() {
    this.target = null;
}
SharedGeomtryEditor.PROPERTY_NAME = "box";

SharedGeomtryEditor.prototype.setup = function () {
    //grab control references
    this.shapeXTextBox = document.getElementById("shapeXTextBox");
    this.shapeYTextBox = document.getElementById("shapeYTextBox");
    this.shapeWidthTextBox = document.getElementById("shapeWidthTextBox");
    this.shapeHeightTextBox = document.getElementById("shapeHeightTextBox");
    this.shapeAngleTextBox = document.getElementById("shapeAngleTextBox");
    this.geometryToolbar = document.getElementById("geometryToolbar");

    this.shapeXTextBox.disabled = true;
    this.shapeYTextBox.disabled = true;
    this.shapeWidthTextBox.disabled = true;
    this.shapeHeightTextBox.disabled = true;
    this.shapeAngleTextBox.disabled = true;

    var thiz = this;
    this.geometryToolbar.addEventListener("command", function (event) {
        thiz.handleCommandEvent();
    }, false);
    this.geometryToolbar.addEventListener("change", function (event) {
        thiz.handleCommandEvent();
    }, false);

    this.geometryToolbar.addEventListener("keypress", function (event) {
        if (event.keyCode == KeyEvent.DOM_VK_UP || event.keyCode == KeyEvent.DOM_VK_DOWN) {
            event.stopPropagation();
        }
    }, false);

    this.geometryToolbar.ownerDocument.documentElement.addEventListener("p:ShapeGeometryModified", function (event) {
        if (event.setter && event.setter == thiz) return;
        thiz.invalidate();
    }, false);
};
SharedGeomtryEditor.prototype.handleCommandEvent = function () {
    var currentGeo = this.targetObject.getGeometry();
    var dx = this.shapeXTextBox.value - currentGeo.ctm.e;
    var dy = this.shapeYTextBox.value - currentGeo.ctm.f;

    var a = Svg.getAngle(currentGeo.ctm.a, currentGeo.ctm.b);
    var da = this.shapeAngleTextBox.value - a;

    Pencil.activeCanvas.run(function () {
        if (dx != 0 || dy != 0) {
            this.targetObject.moveBy(dx, dy);
        }

        if (this.targetObject.supportScaling()) {
            this.targetObject.scaleTo(this.shapeWidthTextBox.value, this.shapeHeightTextBox.value);
        }

        if (da != 0) {
            this.targetObject.rotateBy(da);
        }

        Pencil.activeCanvas.snappingHelper.updateSnappingGuide(this.targetObject);
        this.invalidate();
    }, this, Util.getMessage("action.move.shape"));

    Pencil.activeCanvas.invalidateEditors(this);
};

SharedGeomtryEditor.prototype.isDisabled = function () {
    return this.geometryToolbar.getAttribute("disabled") == "true";
};

SharedGeomtryEditor.prototype._applyValue = function () {
    var thiz = this;
    Pencil.activeCanvas.run(function() {
    	return;
        this.setProperty(SharedGeomtryEditor.PROPERTY_NAME, thiz.font);
        debug("applied: " + thiz.font);
    }, this.target);
};
SharedGeomtryEditor.prototype.attach = function (targetObject) {
    if (this.isDisabled() || targetObject.constructor == TargetSet) {
        this.detach();
        return;
    }

    this.targetObject = targetObject;

    var geo = this.targetObject.getGeometry();

    this.shapeXTextBox.value = Math.round(geo.ctm.e);
    this.shapeYTextBox.value = Math.round(geo.ctm.f);

    this.shapeWidthTextBox.value = Math.round(geo.dim.w);
    this.shapeHeightTextBox.value = Math.round(geo.dim.h);
    this.shapeAngleTextBox.value = Svg.getAngle(geo.ctm.a, geo.ctm.b);

    this.shapeXTextBox.disabled = false;
    this.shapeYTextBox.disabled = false;
    this.shapeAngleTextBox.disabled = false;

    var box = this.targetObject.getProperty(SharedGeomtryEditor.PROPERTY_NAME);

    this.shapeWidthTextBox.disabled = box ? false : true;
    this.shapeHeightTextBox.disabled = box ? false : true;

    //this.geometryToolbar.style.display = '';
};
SharedGeomtryEditor.prototype.detach = function () {
    this.shapeXTextBox.disabled = true;
    this.shapeYTextBox.disabled = true;
    this.shapeWidthTextBox.disabled = true;
    this.shapeHeightTextBox.disabled = true;
    this.shapeAngleTextBox.disabled = true;
    //this.geometryToolbar.style.display = 'none';
    this.targetObject = null;
};
SharedGeomtryEditor.prototype.invalidate = function () {
    if (!this.targetObject) {
        this.detach();
    } else {
        this.attach(this.targetObject);
    }
};

Pencil.registerSharedEditor(new SharedGeomtryEditor());
