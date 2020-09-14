function GestureHelper(canvas) {
    this.canvas = canvas;
    this.canvas.gestureHelper = this;
    
    this.init();
}

GestureHelper.prototype.init = function () {
    var thiz = this;
    this.heldKeyCodes = [];
    
    this.canvas.focusableBox.addEventListener("keydown", function (event) {
        if (thiz.heldKeyCodes.indexOf(event.keyCode) >= 0) return;
        
        thiz.heldKeyCodes.push(event.keyCode);
        thiz.updateKeyCodes();
    }, false);
    
    this.canvas.focusableBox.addEventListener("keyup", function (event) {
        var index = thiz.heldKeyCodes.indexOf(event.keyCode);
        if (index < 0) return;
        
        thiz.heldKeyCodes.splice(index, 1);
        thiz.updateKeyCodes();
    }, false);
    
    this.canvas.focusableBox.addEventListener("blur", function (event) {
        thiz.heldKeyCodes.length = 0;
        thiz.updateKeyCodes();
    }, false);
    
    // sample registry
    this.gestureRegistry = {
        keys: {
            "R": {
                type: "Shape",
                defId: "dgthanhan.MaterialDesktopMockup:rectangle"
            }
        }
    };
};

GestureHelper.prototype.handleMouseDown = function (event) {
    if (!this.activeGestureDef) return false;
    if (this.activeGestureDef.type == "Shape") {
        var def = CollectionManager.shapeDefinition.locateDefinition(this.activeGestureDef.defId);
        if (!def) return;
        
        var loc = this.canvas.getEventLocation(event);
        this.canvas.insertShape(def);
        
        var controller = this.canvas.currentController;
        var bbox = controller.getBoundingRect();
        controller.moveBy(loc.x, loc.y, true);
        controller.setProperty("box", new Dimension(0, 0));
        
        this.canvas.selectShape(controller.svg);
        window.setTimeout(function () {
            this.canvas.geometryEditor.handleMouseDown(event);
            this.canvas.geometryEditor.currentAnchor = this.canvas.geometryEditor.anchor4;
        }.bind(this), 10);
        
        return true;
    }
    
    return false;
};
GestureHelper.prototype.handleMouseUp = function (event) {
    return false;
};
GestureHelper.prototype.updateKeyCodes = function () {
    if (!GestureHelper._output) {
        GestureHelper._output = document.createElement("div");
        ApplicationPane._instance.contentHeader.appendChild(GestureHelper._output);
    }
    
    this.activeGestureDef = null;
    
    for (var code of this.heldKeyCodes) {
        var c = String.fromCharCode(code);
        this.activeGestureDef = this.gestureRegistry.keys[c];
        if (this.activeGestureDef) break;
    }
    
    GestureHelper._output.innerHTML = this.heldKeyCodes.join(", ");
};