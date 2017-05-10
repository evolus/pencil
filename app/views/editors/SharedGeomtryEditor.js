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

    var thiz = this;
    UICommandManager.register({
        key: "lockMovementCommand",
        getLabel: function () {
            return "Lock shape's movement";
        },
        shortcut: "F12",
        run: function () {
            var locked = thiz.lockMovementButton.getAttribute("checked") == "true";
            if (locked) {
                thiz.lockMovementButton.removeAttribute("checked");
            } else {
                thiz.lockMovementButton.setAttribute("checked", "true");
            }

            Pencil.controller.movementDisabled = !locked;
        }
    }, this.lockMovementButton);

    this.container.ownerDocument.documentElement.addEventListener("p:ShapeGeometryModified", function (event) {
        if (event.setter && event.setter == thiz) return;
        thiz.invalidate();
    }, false);
};
SharedGeomtryEditor.prototype.toggleMovementLocking = function () {
    var locked = this.lockMovementButton.getAttribute("checked") == "true";
    if (locked) {
        this.lockMovementButton.removeAttribute("checked");
    } else {
        this.lockMovementButton.setAttribute("checked", "true");
    }

    Pencil.controller.movementDisabled = !locked;
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

        if (this.targetObject.supportScaling() && box != null) {
            this.targetObject.scaleTo(this.shapeWidth.value, this.shapeHeight.value);
        }
        if (!box) {
            if (this.handleBox) {
                var start = this.handleBox.start;
                var end = this.handleBox.end;
                var mode = this.handleBox.mode;
                if (start != null && end != null && mode != null && this.oldSize != null) {
                    var widthValue = this.shapeWidth.value - this.oldSize.width;
                    var heightValue = this.shapeHeight.value - this.oldSize.height;
                    if (widthValue != 0 || heightValue != 0) {
                        if (mode.value == "horizontal" || mode.value == "Horizontal" ||
                            mode.value == "free" || mode.value == "Free"){
                                if (end.x < 0) end.x -= widthValue;
                                else end.x += widthValue;
                            }
                        if (mode.value == "vertical" || mode.value == "Vertical" ||
                            mode.value == "free" || mode.value == "Free") {
                                if (end.y < 0) end.y -= heightValue;
                                else end.y += heightValue;
                            }
                        this.targetObject.setProperty("endLine", new Handle(end.x, end.y));
                        this.oldSize = {"width": this.shapeWidth.value, "height": this.shapeHeight.value};
                    }
                }
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

    if (targetObject && targetObject.getAttributeNS && targetObject.getAttributeNS(PencilNamespaces.p, "locked") == "true") { return; }

    this.targetObject = targetObject;

    var geo = this.targetObject.getGeometry();

    this.handleBox = null;

    this.shapeX.value = Math.round(geo.ctm.e);
    this.shapeY.value = Math.round(geo.ctm.f);

    this.shapeWidth.value = Math.round(geo.dim.w);
    this.shapeHeight.value = Math.round(geo.dim.h);
    this.shapeAngle.value = Math.round(Svg.getAngle(geo.ctm.a, geo.ctm.b));

    this.shapeX.disabled = false;
    this.shapeY.disabled = false;
    this.shapeAngle.disabled = false;

    box = this.targetObject.getProperty(SharedGeomtryEditor.PROPERTY_NAME);
    // this.shapeWidth.disabled = box ? false : true;
    // this.shapeHeight.disabled = box ? false : true;
    var disableWidthInput = box ? false : true;
    var disableHeightInput = box ? false : true;

    if (!box) {
        this.oldSize = {"width": this.shapeWidth.value, "height": this.shapeHeight.value};
        var start = this.targetObject.getProperty("startLine")|| null;
        var end = this.targetObject.getProperty("endLine") || null;
        var mode = this.targetObject.getProperty("mode") || null;
        if (!start || !end) return;
        if (mode.value == "horizontal" || mode.value == "Horizontal" ||
            mode.value == "free" || mode.value == "Free")
            disableWidthInput = false;
        if (mode.value == "vertical" || mode.value == "Vertical" ||
            mode.value == "free" || mode.value == "Free")
            disableHeightInput = false;
         this.handleBox = {"start": start, "end": end, "mode": mode};
    }
    this.shapeWidth.disabled = disableWidthInput;
    this.shapeHeight.disabled = disableHeightInput;
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
