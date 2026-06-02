function BaseImmediateActionTool() {
    BaseTemplatedWidget.call(this);
    
    this.icon.innerHTML = this.getIcon ? this.getIcon() : "";
    this.button.setAttribute("title", this.getToolTip ? this.getToolTip() : "");
    
    var label = this.getLabel ? this.getLabel() : "";
    this.buttonLabel.innerHTML = label;
    
    var thiz = this;
    
    this.bind("click", this._run, this.button);
}
__extend(BaseTemplatedWidget, BaseImmediateActionTool);

BaseImmediateActionTool.prototype.getTemplatePath = function () {
    var p = this.getTemplatePrefix() + (this.constructor.__templatePath ? this.constructor.__templatePath + '/' : '') + "BaseImmediateActionTool.xhtml";
    return p;
};

BaseImmediateActionTool.prototype._run = function () {
    var thiz = this;

    this.imageSource.start(function () {
        var image = thiz.imageSource.get();
        
        thiz.modifyImage(image, function (error) {
            if (!error) {
                thiz.imageSource.set(image, thiz.getImageCommitOptions(), function () {
                    thiz.imageSource.commit(function () {});
                });
            }
        });
    });
};
BaseImmediateActionTool.prototype.getImageCommitOptions = function () {
    return {};
};
BaseImmediateActionTool.prototype.setup = function (imageSource) {
    this.imageSource = imageSource;
};

////////////////// TOOLS: Crop to selection

function CropToSelectionTool() {
    BaseImmediateActionTool.call(this);
}

__extend(BaseImmediateActionTool, CropToSelectionTool);

CropToSelectionTool.prototype.getIcon = function () {
    return "crop";
};
CropToSelectionTool.prototype.getLabel = function () {
    return "Crop";
};
CropToSelectionTool.prototype.getToolTip = function () {
    return "Crop to selection";
};
CropToSelectionTool.prototype.modifyImage = function (image, callback) {
    callback();
};
CropToSelectionTool.prototype.getImageCommitOptions = function () {
    return {
        replace: true
    };
};

////////////////// TOOLS: Crop to selection

function CropToSelectionTool() {
    BaseImmediateActionTool.call(this);
}

__extend(BaseImmediateActionTool, CropToSelectionTool);

CropToSelectionTool.prototype.getIcon = function () {
    return "crop";
};
CropToSelectionTool.prototype.getLabel = function () {
    return "Crop";
};
CropToSelectionTool.prototype.getToolTip = function () {
    return "Crop to selection";
};
CropToSelectionTool.prototype.modifyImage = function (image, callback) {
    callback();
};
CropToSelectionTool.prototype.getImageCommitOptions = function () {
    return {
        replace: true
    };
};


