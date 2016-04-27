function ParamEditorPanel(container, param, context) {
    this.container = container;
    this.param = param;
    this.context = context;
    
    this.init();
}

ParamEditorPanel.prototype.setParamContext = function (param) {
    if (!param) return;
    
    param._context = this.context;
    if (param.params) {
        for (var i = 0; i < param.params.length; i ++) this.setParamContext(param.params[i]);
    }
}
ParamEditorPanel.prototype.init = function () {
    Dom.addClass(this.container, "ParamEditorPanel");
    
    var thiz = this;
    Dom.registerEvent(this.container, "pe.RerenderRequested", function () {
        thiz.invalidate();
    }, false);

    this.context.getValueMap = function () {
        var map = {};
        thiz.rootEditor.saveValue(map);
        return map;
    };
    this.setParamContext(this.param);
    
    this.rootEditor = BaseParamEditor.newEditor(this.param);
    this.container.appendChild(this.rootEditor.getUIElement());
    
    this.rootEditor.init();
//    
//    var button = document.createElement("button");
//    button.innerHTML = "getValue();";
//    button.setAttribute("type", "button");
//    this.container.appendChild(button);
//    
//    button.onclick = function () {
//        var map = {};
//        thiz.rootEditor.saveValue(map);
//        alert(JSON.stringify(map, null, 2));
//    };
    
    this.editorMap = {};
    function populateMap(editor, map) {
        if (editor.param.key) {
            map[editor.param.key] = editor;
        }
        
        if (editor.childEditors) {
            for (var i = 0; i < editor.childEditors.length; i ++) {
                populateMap(editor.childEditors[i], map);
            }
        }
    }
    populateMap(this.rootEditor, this.editorMap);
    this.invalidate();
};

ParamEditorPanel.prototype.highlightErrorParam = function (paramKey) {
    var editor = this.editorMap[paramKey];
    if (!editor) return;
    
    Dom.addClass(this.container, "ErrorHighlightEnabled");
    editor.markAsError();
};
ParamEditorPanel.prototype.clearErrorParamHighlight = function () {
    Dom.removeClass(this.container, "ErrorHighlightEnabled");
    
    for (var key in this.editorMap) {
        this.editorMap[key].unmarkAsError();
    }
};

ParamEditorPanel.prototype.setValueMap = function (valueMap) {
    this.rootEditor.loadValue(valueMap);
};
ParamEditorPanel.prototype.getValueMap = function () {
    var map = {};
    this.rootEditor.saveValue(map);
    
    return map;
};
ParamEditorPanel.prototype.invalidate = function () {
    var valueMap = {};
    this.rootEditor.saveValue(valueMap);
    var renderExpressionMap = {};
    var found = false;
    for (var key in this.editorMap) {
        var editor = this.editorMap[key];
        if (editor && editor.param.renderedCondition) {
            renderExpressionMap[key] = editor.param.renderedCondition;
            found = true;
        }
    }
    
    var thiz = this;
    
    var invalidateChildrenAction = function () {
        for (var key in thiz.editorMap) {
            var editor = thiz.editorMap[key];
            if (editor && editor.invalidate) {
                editor.invalidate(valueMap);
            }
        }
    }
    
    if (found) {
        $reportTemplateService.evalulateConditions(renderExpressionMap, valueMap, function (resultMap) {
            for (var key in resultMap) {
                var editor = thiz.editorMap[key];
                if (editor) {
                    editor.setRendered(resultMap[key]);
                }
            }
            invalidateChildrenAction();
        }, "Please wait...");
    } else {
        invalidateChildrenAction();
    }
};
