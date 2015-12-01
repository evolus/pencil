function BaseCompositeParamEditor() {
    
}
BaseCompositeParamEditor.prototype = new BaseParamEditor();


BaseCompositeParamEditor.prototype.hasExplicitSelection = function () {
    return true;
};
BaseCompositeParamEditor.prototype.validateEditors = function(e) {
    for (var i = 0; i < this.childEditors.length; i ++) {
        var editor = this.childEditors[i];
        editor.setEnabled(editor == e);
    }
}
BaseCompositeParamEditor.prototype.buildBodyUI = function () {
    Dom.addClass(this.containerElement, "CompositeParamEditorContainer");
    Dom.addClass(this.bodyElement, "CompositeParamEditorBody");
    this.childEditors = [];
    var w = 0;
    this.selectionGroupName = "cpgname_" + widget.random();
    
    var thiz = this;
    var selectionHandler = function (e) {
        var target = Dom.getTarget(e)
        thiz.validateEditors(target._editor);
    };
    
    for (var i = 0; i < this.param.params.length; i ++) {
        var holder = {};
        var row = Dom.newDOMElement({
            _name: "div",
            "class": "CompositeBody CompositeBody_Layout_" + this.param.layout,
            _children: [{
                _name: "span",
                "class": "CompositeBodySelectionContainer" + (this.hasExplicitSelection() ? "" : " CompositeBodySelectionContainerImplicit"),
                _id: "selectionContainer"
            }, {
                _name: "div",
                "class": "CompositeBodyChildContainer",
                _id: "childEditorContainer"
            }]
        }, document, holder);
        
        var editor = BaseParamEditor.newEditor(this.param.params[i]);
        holder.childEditorContainer.appendChild(editor.getUIElement());
        this.childEditors.push(editor);
        editor.parentCompositeBodyElement = row;
        
        var input = this.buildSelectionUI(holder.selectionContainer, editor);
        if (input) {
            Dom.registerEvent(input, "click", selectionHandler, false);
        }
        
        w = Math.max(w, editor.getPreferredLeadingSize());
        
        this.bodyElement.appendChild(row);
    }
    
    for (var i = 0; i < this.childEditors.length; i ++) {
        var editor = this.childEditors[i];
        editor.setLeadingSize(w);
        if (this.hasExplicitSelection()) {
            editor.setEnabled(false);
        } else {
            editor.setEnabled(true);
        }
    }
};
BaseCompositeParamEditor.prototype.init = function () {
    for (var i = 0; i < this.childEditors.length; i ++) {
        this.childEditors[i].init();
    }
};

BaseCompositeParamEditor.prototype.setValue = function (value) {
    
};

function CompositeAndParamEditor(param) {
    this._construct(param);
}

CompositeAndParamEditor.prototype = new BaseCompositeParamEditor();

CompositeAndParamEditor.prototype.hasExplicitSelection = function () {
    return false;
};
CompositeAndParamEditor.prototype.buildSelectionUI = function (selectionContainer, editor) {
};
CompositeAndParamEditor.prototype.saveValue = function (valueMap) {
    //TODO: check to see if composite-and has it own value entry
    for (var i = 0; i < this.childEditors.length; i ++) {
        this.childEditors[i].saveValue(valueMap);
    }
};
CompositeAndParamEditor.prototype.loadValue = function (valueMap) {
    for (var i = 0; i < this.childEditors.length; i ++) {
        this.childEditors[i].loadValue(valueMap);
    }
    //console.log("Load value ", valueMap);
};

function CompositeOrParamEditor(param) {
    this._construct(param);
}
CompositeOrParamEditor.prototype = new BaseCompositeParamEditor();
CompositeOrParamEditor.prototype.buildSelectionUI = function (selectionContainer, editor) {
    var id = widget.random();
    var cb = Dom.newDOMElement({
        _name: "input",
        type: "radio",
        id: id,
        name: this.selectionGroupName
    });
    
    cb._editor = editor;
    editor._cb = cb;
    selectionContainer.appendChild(cb);
    editor.connectPreLabelToInput(id);
    return cb;
};
CompositeOrParamEditor.prototype.saveValue = function (valueMap) {
    var editor = null;
    for (var i = 0; i < this.childEditors.length; i ++) {
        if (this.childEditors[i]._cb.checked) {
            editor = this.childEditors[i];
        }
        
        this.childEditors[i].saveValue(valueMap);        
    }
    
    if (editor) {
        valueMap[this.param.key] = editor.param.key
    } else {
        valueMap[this.param.key] = "";
    }
};
CompositeOrParamEditor.prototype.loadValue = function (valueMap) {
    var key = valueMap[this.param.key];
    if (typeof (key) == "undefined") key = this.param.defaultValue;
    if (typeof (key) == "undefined" && this.childEditors.length > 0) {
        key = this.childEditors[0].param.key;
    }
    for (var i = 0; i < this.childEditors.length; i ++) {
        var editor = this.childEditors[i];
        if (editor.param.key == key) {
            editor.loadValue(valueMap);
            editor._cb.checked = true;
            editor.setEnabled(true);
        } else {
            editor._cb.checked = false;
            editor.setEnabled(false);
        }
    }
    
};
CompositeOrParamEditor.prototype.afterBuild = function() {
    
    for (var i = 0; i < this.childEditors.length; i ++) {
        if (this.childEditors[i]._cb.checked) {
           //console.log("AFTER BUILD" , this.childEditors[i]);
           this.validateEditors(this.childEditors[i]);
           break;
        }
    }
}

function CompositeBooleanParamEditor(param) {
    this._construct(param);
}
CompositeBooleanParamEditor.prototype = new BaseCompositeParamEditor();
CompositeBooleanParamEditor.prototype.buildSelectionUI = function (selectionContainer, editor) {
    var id = widget.random();
    var cb = Dom.newDOMElement({
        _name: "input",
        type: "checkbox",
        id: id,
        name: this.selectionGroupName
    });
    
    cb._editor = editor;
    editor._cb = cb;
    selectionContainer.appendChild(cb);
    editor.connectPreLabelToInput(id);
    
    return cb;
};
CompositeBooleanParamEditor.prototype.saveValue = function (valueMap) {
    var keys = "";
    for (var i = 0; i < this.childEditors.length; i ++) {
        editor = this.childEditors[i];
        if (editor._cb.checked) {
            if (keys) keys += ",";
            keys += editor.param.key;
            editor.saveValue(valueMap);
        }
    }
    
    valueMap[this.param.key] = keys;
};
CompositeBooleanParamEditor.prototype.loadValue = function (valueMap) {
    var keys = valueMap[this.param.key];
    if (typeof (keys) == "undefined") keys = this.param.defaultValue;
    
    if (keys) {
        keys = keys.split(/\,/);
    } else {
        keys = [];
    }
    for (var i = 0; i < this.childEditors.length; i ++) {
        var editor = this.childEditors[i];
        var found = false;
        for (var j = 0; j < keys.length; j ++) {
            if (editor.param.key == keys[j]) {
                found = true;
                break;
            }
        }
        if (found) {
            editor.loadValue(valueMap);
            editor._cb.checked = true;
            editor.setEnabled(true);
        } else {
            editor._cb.checked = false;
            editor.setEnabled(false);
        }
    }
    
};
