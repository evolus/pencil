function SharedGeomtryEditor() {
    BaseTemplatedWidget.call(this);
    Pencil.registerSharedEditor(this);
    this.target = null;
    ToolBar.setupFocusHandling(this.node());
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

    this.container.addEventListener("input", function (event) {
        if (event.target != thiz.shapeAngle)
        thiz.handleCommandEvent();
    }, false);

    this.shapeAngle.addEventListener("click", function (event) {
        thiz.handleCommandEvent();
    }, false);

    this.shapeAngle.addEventListener("change", function (event) {
        thiz.handleCommandEvent();
    }, false);

    this.shapeAngle.addEventListener("wheel", function(event) {
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

        if (this.targetObject.supportScaling() && !this.handleBox) {
            this.targetObject.scaleTo(this.shapeWidth.value, this.shapeHeight.value);
        } else {
            var hb = this.handleBox;
            var boundSize = this.targetObject.getBounding();
            var widthValue = this.shapeWidth.value - boundSize.width;
            var heightValue = this.shapeHeight.value - boundSize.height;

            if (widthValue != 0 || heightValue != 0) {
                var b = new Handle(hb.end.x, hb.end.y);
                if (hb.mode.value == "horizontal" || hb.mode.value == "Horizontal" ||
                    hb.mode.value == "free" || hb.mode.value == "Free")
                    b.x += widthValue;
                if (hb.mode.value == "vertical" || hb.mode.value == "Vertical" ||
                    hb.mode.value == "free" || hb.mode.value == "Free")
                    b.y += heightValue;
                this.targetObject.setProperty("endLine", b);
            }
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
        console.log("applied: " + thiz.font);
    }, this.target);
};
SharedGeomtryEditor.prototype.attach = function (targetObject) {
    if (this.isDisabled() || targetObject.constructor == TargetSet) {
        this.detach();
        return;
    }

    this.targetObject = targetObject;

    var geo = this.targetObject.getGeometry();

    this.handleBox = null;

    this.shapeX.value = Math.max(0, Math.round(geo.ctm.e));
    this.shapeY.value = Math.max(0, Math.round(geo.ctm.f));

    this.shapeWidth.value = Math.round(geo.dim.w);
    this.shapeHeight.value = Math.round(geo.dim.h);
    this.shapeAngle.value = Math.round(Svg.getAngle(geo.ctm.a, geo.ctm.b));

    this.shapeX.disabled = false;
    this.shapeY.disabled = false;
    this.shapeAngle.disabled = false;

    box = this.targetObject.getProperty(SharedGeomtryEditor.PROPERTY_NAME);
    this.shapeWidth.disabled = box ? false : true;
    this.shapeHeight.disabled = box ? false : true;

    if (!box) {
        var start = this.targetObject.getProperty("startLine")|| null;
        var end = this.targetObject.getProperty("endLine") || null;
        var mode = this.targetObject.getProperty("mode") || null;
        if (!start || !end) return;
        if (mode.value == "horizontal" || mode.value == "Horizontal" ||
            mode.value == "free" || mode.value == "Free")
            this.shapeWidth.disabled = false;
        if (mode.value == "vertical" || mode.value == "Vertical" ||
            mode.value == "free" || mode.value == "Free")
            this.shapeHeight.disabled = false;
        this.handleBox = {"start": start, "end": end, "mode": mode};
    }
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
    this.handleBox = null;
};
SharedGeomtryEditor.prototype.invalidate = function () {
    if (!this.targetObject) {
        this.detach();
    } else {
        this.attach(this.targetObject);
    }
};
