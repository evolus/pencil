function BaseSimpleArgumentTool() {
    BaseTemplatedWidget.call(this);
    
    this.icon.innerHTML = this.getIcon ? this.getIcon() : "";
    
    var label = this.getLabel ? this.getLabel() : "";
    this.buttonLabel.innerHTML = label;
    
    var toolTip = this.getToolTip ? this.getToolTip() : "";
    this.label.innerHTML = toolTip;
    this.button.setAttribute("title", toolTip);
    
    var min = this.getMin ? this.getMin() : -100;
    var max = this.getMax ? this.getMax() : 100;
    var initial = this.getInitial ? this.getInitial() : 0;
    var step = this.getStep ? this.getStep() : ((max - initial) / 100);
    
    this.seeker.min = this.percentInput.min = min;
    this.seeker.max = this.percentInput.max = max;
    this.seeker.value = this.percentInput.value = this.initial = initial;
    this.seeker.step = this.percentInput.step = step;
    
    console.log(this.getLabel(), initial);
    
    var unit = this.getUnit ? this.getUnit() : "%";
    this.unitLabel.innerHTML = unit;

    var thiz = this;
    
    this.popup.onHide = function (reason, event) {
        if (this.imageSource) {
            if (reason == "onBlur") {
                this.imageSource.commit(function () {});
            } else {
                this.imageSource.rollback(function () {});
            }
        }
    }.bind(this);
    
    this.bind("keypress", function (event) {
        if (event.keyCode != DOM_VK_RETURN) return;
        event.cancelBubble = true;
        
        this.imageSource.commit(function () {
            thiz.imageSource = null;
            thiz.popup.close()
        });
        
    }, this.percentInput);
    
    this.bind("input", function(event) {
        this.percentInput.value = this.seeker.valueAsNumber;
        
        if (this.seeker._held) {
            this.seeker._changed = true;
            return;
        }
        
        if (this.imageSource) {
            this._run(this.seeker.valueAsNumber);
        }
    }, this.seeker);
    
    this.bind("mousedown", function(event) {
        this.seeker._changed = false;
        this.seeker._held = true;
    }, this.seeker);

    this.bind("mouseup", function(event) {
        this.seeker._held = false;
        if (this.seeker._changed) {
            this.seeker._changed = false;
            if (this.imageSource) {
                this._run(this.seeker.valueAsNumber);
            }
        }
    }, this.seeker);
    
    this._applyInputChange = function () {
        this._applyInputChangeTimer = null;
        if (this.imageSource) {
            this._run(this.percentInput.valueAsNumber);
        }
    }.bind(this);
    
    this.bind("input", function(event) {
        this.seeker.value = this.percentInput.valueAsNumber;
        if (this._applyInputChangeTimer) {
            window.clearTimeout(this._applyInputChangeTimer);
        }
        
        this._applyInputChangeTimer = window.setTimeout(this._applyInputChange, 200);
    }, this.percentInput);
    
    this.bind("click", this.start.bind(this, this.button), this.button);
}
__extend(BaseTemplatedWidget, BaseSimpleArgumentTool);

BaseSimpleArgumentTool.prototype.getTemplatePath = function () {
    var p = this.getTemplatePrefix() + (this.constructor.__templatePath ? this.constructor.__templatePath + '/' : '') + "BaseSimpleArgumentTool.xhtml";
    console.log("Template path", p);
    return p;
};

BaseSimpleArgumentTool.prototype._run = function (value) {
    var image = this.originalImage.clone();
    var thiz = this;
    this.modifyImage(image, value, function (error) {
        if (!error) thiz.imageSource.set(image, {}, function () {});
    });
};

BaseSimpleArgumentTool.prototype.setup = function (imageSource) {
    this.imageSource = imageSource;
};

BaseSimpleArgumentTool.prototype.start = function (uiAnchorNode) {
    this.seeker.value = this.initial;
    this.percentInput.value = this.initial;
    
    var thiz = this;
    this.imageSource.start(function () {
        thiz.originalImage = thiz.imageSource.get();
        thiz.popup.show(uiAnchorNode, "left-inside", "bottom", 0, 5, "auto-flip");
    });
};

////////////////// TOOLS: Brightness

function BrightnessAdjustTool() {
    BaseSimpleArgumentTool.call(this);
}

__extend(BaseSimpleArgumentTool, BrightnessAdjustTool);

BrightnessAdjustTool.prototype.getIcon = function () {
    return "settings_brightness";
};
BrightnessAdjustTool.prototype.getLabel = function () {
    return "Brightness";
};
BrightnessAdjustTool.prototype.getToolTip = function () {
    return "Adjust image brightness";
};
BrightnessAdjustTool.prototype.modifyImage = function (image, value, callback) {
    image.brightness(value / 100, callback);
};

////////////////// TOOLS: Contrast

function ContrastAdjustTool() {
    BaseSimpleArgumentTool.call(this);
}

__extend(BaseSimpleArgumentTool, ContrastAdjustTool);

ContrastAdjustTool.prototype.getIcon = function () {
    return "exposure";
};
ContrastAdjustTool.prototype.getLabel = function () {
    return "Contrast";
};
ContrastAdjustTool.prototype.getToolTip = function () {
    return "Adjust image contrast";
};
ContrastAdjustTool.prototype.modifyImage = function (image, value, callback) {
    image.contrast(value / 100, callback);
};

////////////////// TOOLS: Fade

function FadeAdjustTool() {
    BaseSimpleArgumentTool.call(this);
}

__extend(BaseSimpleArgumentTool, FadeAdjustTool);

FadeAdjustTool.prototype.getIcon = function () {
    return "flip_to_back";
};
FadeAdjustTool.prototype.getLabel = function () {
    return "Fade";
};
FadeAdjustTool.prototype.getToolTip = function () {
    return "Fade in and out";
};
FadeAdjustTool.prototype.modifyImage = function (image, value, callback) {
    image.fade(value, callback);
};
FadeAdjustTool.prototype.getMin = function () {
    return 0;
};
FadeAdjustTool.prototype.getMax = function () {
    return 1;
};
FadeAdjustTool.prototype.getInitial = function () {
    return 0;
};
FadeAdjustTool.prototype.getUnit = function () {
    return "";
};



////////////////// TOOLS: Opacity

function OpacityAdjustTool() {
    BaseSimpleArgumentTool.call(this);
}

__extend(BaseSimpleArgumentTool, OpacityAdjustTool);

OpacityAdjustTool.prototype.getIcon = function () {
    return "opacity";
};
OpacityAdjustTool.prototype.getLabel = function () {
    return "Opacity";
};
OpacityAdjustTool.prototype.getToolTip = function () {
    return "Adjust image opacity";
};
OpacityAdjustTool.prototype.modifyImage = function (image, value, callback) {
    console.log("Modifying opacity: ", image.hasAlpha());
    image.opacity(value, callback);
};
OpacityAdjustTool.prototype.getMin = function () {
    return 0;
};
OpacityAdjustTool.prototype.getMax = function () {
    return 1;
};
OpacityAdjustTool.prototype.getInitial = function () {
    return 1;
};
OpacityAdjustTool.prototype.getStep = function () {
    return 0.01;
};
OpacityAdjustTool.prototype.getUnit = function () {
    return "";
};



