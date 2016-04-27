function AlwaysTrueParamEditor(param) {
    this.noBody = true;
    this._construct(param);
}
AlwaysTrueParamEditor.prototype = new BaseParamEditor();
AlwaysTrueParamEditor.prototype.buildBodyUI = function () {
    
};
AlwaysTrueParamEditor.prototype.getValue = function () {
    return "true";
};
AlwaysTrueParamEditor.prototype.setValue = function (value) {};
