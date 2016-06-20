function SharedGeomtryEditor() {
    BaseTemplatedWidget.call(this);
    Pencil.registerSharedEditor(this);
    this.target = null;
}
__extend(BaseTemplatedWidget, SharedGeomtryEditor);
SharedGeomtryEditor.PROPERTY_NAME = "box";

SharedGeomtryEditor.prototype.setup = function () {
    //grab control references

    this.shapeX.disabled = true;
    this.shapeY.disabled = true;
    this.shapeWidth.disabled = true;
    this.shapeHeight.disabled = true;
    this.shapeAngle.disabled = true;

    var thiz = this;
    this.container.addEventListener("click", function (event) {
        thiz.handleCommandEvent();
    }, false);
    this.container.addEventListener("change", function (event) {
        if (event.target != thiz.shapeAngle) {
            if (event.target.value < 0) {
                event.target.value = 0;
            }
        }
        thiz.handleCommandEvent();
    }, false);

    this.container.addEventListener("wheel", function(event) {
        thiz.handleCommandEvent();
    }, false)

    this.container.addEventListener("keypress", function (event) {
        if (event.keyCode == DOM_VK_UP || event.keyCode == DOM_VK_DOWN) {
            event.stopPropagation();
        }
    }, false);

    this.container.ownerDocument.documentElement.addEventListener("p:ShapeGeometryModified", function (event) {
        if (event.setter && event.setter == thiz) return;
        thiz.invalidate();
    }, false);
};
SharedGeomtryEditor.prototype.handleCommandEvent = function () {
    var currentGeo = this.targetObject.getGeometry();
    var dx = this.shapeX.value - currentGeo.ctm.e;
    var dy = this.shapeY.value - currentGeo.ctm.f;

    var a = Svg.getAngle(currentGeo.ctm.a, currentGeo.ctm.b);
    var da = this.shapeAngle.value - a;

    Pencil.activeCanvas.run(function () {
        if (dx != 0 || dy != 0) {
            this.targetObject.moveBy(dx, dy);
        }

        if (this.targetObject.supportScaling()) {
            this.targetObject.scaleTo(this.shapeWidth.value, this.shapeHeight.value);
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
    // return this.geometryToolbar.getAttribute("disabled") == "true";
    return false;
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

    this.shapeX.value = Math.max(0, Math.round(geo.ctm.e));
    this.shapeY.value = Math.max(0, Math.round(geo.ctm.f));

    this.shapeWidth.value = Math.round(geo.dim.w);
    this.shapeHeight.value = Math.round(geo.dim.h);
    this.shapeAngle.value = Math.round(Svg.getAngle(geo.ctm.a, geo.ctm.b));

    this.shapeX.disabled = false;
    this.shapeY.disabled = false;
    this.shapeAngle.disabled = false;

    var box = this.targetObject.getProperty(SharedGeomtryEditor.PROPERTY_NAME);

    this.shapeWidth.disabled = box ? false : true;
    this.shapeHeight.disabled = box ? false : true;

    //this.geometryToolbar.style.display = '';
};
SharedGeomtryEditor.prototype.detach = function () {
    this.shapeX.disabled = true;
    this.shapeY.disabled = true;
    this.shapeWidth.disabled = true;
    this.shapeHeight.disabled = true;
    this.shapeAngle.disabled = true;
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
