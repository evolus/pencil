function BaseParamEditor() {
    
}
BaseParamEditor.prototype._construct = function (param) {
    this.param = param;
    
    this.buildUI();
    this.containerElement._paramEditor = this;
    this.rendered = true;
    this.enabled = true;
};
BaseParamEditor.prototype.init = function () {};
BaseParamEditor.prototype.invalidate = function (valueMap) { 
    
};
BaseParamEditor.prototype.emitChangeEvent = function (valueMap) {
    Dom.emitEvent("pe.ValueChange", this.containerElement, {});
    if (this.param.rerenderPageOnChange) {
        Dom.emitEvent("pe.RerenderRequested", this.containerElement, {});
    }
    
};
BaseParamEditor.prototype.setEnabled = function (enabled) {
    
    if (!enabled) {
        Dom.addClass(this.containerElement, "Disabled");
    } else {
        Dom.removeClass(this.containerElement, "Disabled");
    }
    
    this.enabled = enabled;
    Dom.doOnChildRecursively(this.containerElement, {
        eval: function (node) {
                return node.nodeName && (node.nodeName.toLowerCase() == "input" || node.nodeName.toLowerCase() == "button");
            }
        },
        function (control) {
        
        control.disabled = !enabled;
    });
};
BaseParamEditor.prototype.setRendered = function (rendered) {
    this.rendered = rendered;
    Dom.toggleClass(this.containerElement, "NotRenderedParamEditor", !rendered);
    if (this.parentCompositeBodyElement) {
        Dom.toggleClass(this.parentCompositeBodyElement, "NotRenderedCompositeBody", !rendered);
    }
};
BaseParamEditor.prototype.afterBuild = function() {
}
BaseParamEditor.prototype.buildUI = function () {
    var thiz = this;
    var root = Dom.newDOMElement({
        _name: "div",
        "class": "ParamEditorContainer",
        _id: "containerElement",
        _children: [{
            _name: "label",
            "class": "ParamEditorPreLabel",
            _id: "preLabelElement"
        }, {
            _name: "div",
            "class": "ParamEditorBody",
            _id: "bodyElement"
        }, {
            _name: "label",
            "class": "ParamEditorPostLabel",
            _id: "postLabelElement"
        }]
    }, document, this);
    
    Dom.toggleClass(this.containerElement, "Required", this.param.required);
    
    var preLabel = this.getPreLabel();
    if (preLabel) {
        this.preLabelElement.innerHTML = Dom.htmlEncode(preLabel + (this.noBody ? "" : ":"));
        Dom.toggleClass(this.preLabelElement, "RequiredPreLabel", this.param.required);
    } else {
        Dom.addClass(this.containerElement, "NoPreLabel");
    }
    
    var postLabel = this.getPostLabel();
    if (postLabel) {
        this.postLabelElement.innerHTML = Dom.htmlEncode(postLabel);
        if (!preLabel) {
            Dom.toggleClass(this.postLabelElement, "RequiredPostLabel", this.param.required);
        }
    } else {
        Dom.addClass(this.containerElement, "NoPostLabel");
    }
    
    this.buildBodyUI(); // @abstract @protected
    this.afterBuild();
};
BaseParamEditor.prototype.getUIElement = function () {
    return this.containerElement;
};
BaseParamEditor.prototype.markAsError = function () {
    Dom.addClass(this.containerElement, "EditorWithError");
}
BaseParamEditor.prototype.unmarkAsError = function () {
    Dom.removeClass(this.containerElement, "EditorWithError");
}
BaseParamEditor.prototype.getPreLabel = function () {
    var key = this.param.preLabel || ""; //this.param.displayedName;
    if (!key) return "";
    return Messages[key] || key;
};
BaseParamEditor.prototype.connectPreLabelToInput = function (inputId) {
    if (this.preLabelElement) this.preLabelElement.setAttribute("for", inputId);
};
BaseParamEditor.prototype.getPostLabel = function () {
    if (!this.param.postLabel) return "";
    return Messages[this.param.postLabel] || this.param.postLabel;
};
BaseParamEditor.prototype.getPreferredLeadingSize = function () {
    return 1 * this.getPreLabel().length + 2;
};
BaseParamEditor.prototype.setLeadingSize = function (w) {
    if (this.getPreLabel()) {
        this.preLabelElement.style.width = w + "ex";
    }
};
BaseParamEditor.prototype.saveValue = function (valueMap) {
    valueMap[this.param.key] = this.getValue();
};
BaseParamEditor.prototype.loadValue = function (valueMap) {
    this.setValue(valueMap[this.param.key]);
};

//factory
BaseParamEditor.newEditor = function (param) {
    if (param.type == "always_true_param") return new AlwaysTrueParamEditor(param);
    if (param.type == "value_param") return new ValueParamEditor(param);
    if (param.type == "composite_and") return new CompositeAndParamEditor(param);
    if (param.type == "composite_or") return new CompositeOrParamEditor(param);
    if (param.type == "composite_boolean") return new CompositeBooleanParamEditor(param);
    
    return null;
};

