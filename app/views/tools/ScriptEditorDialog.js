function ScriptEditorDialog() {
    Dialog.call(this);
    this.title = "Script Editor";
}
__extend(Dialog, ScriptEditorDialog);

ScriptEditorDialog.prototype.onShown = function () {
    var thiz = this;

    window.setTimeout(function () {
        thiz.scriptEditor = CodeMirror.fromTextArea(thiz.scriptInput, {
          mode:  thiz.options.language || "javascript",
          indentUnit: 4,
          lineNumbers: true,
          showCursorWhenSelecting: true
        });

        window.setTimeout(function () {
            thiz.scriptEditor.focus();
            thiz.scriptEditor.setCursor(0);
        }, 100);
    }, 100);
};
ScriptEditorDialog.prototype.setup = function (options) {
    options = options || {};
    this.options = options;

    this.scriptInput.value = this.options.script || "";
};
ScriptEditorDialog.prototype.done = function () {
    this.close(this.scriptEditor.getValue());
};

ScriptEditorDialog.prototype.getDialogActions = function () {
    return [
        { type: "accept", title: "Update", run: function () { return this.done(); } },
        Dialog.ACTION_CANCEL
    ];
};
