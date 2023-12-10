function PlainTextEditor() {
    PropertyEditor.call(this);
}
__extend(PropertyEditor, PlainTextEditor);

PlainTextEditor.prototype.setup = function () {
    var thiz = this;
    this.textarea.addEventListener("change", function (event) {
        thiz.fireChangeEvent();
    }, false);
    this.textarea.addEventListener("keyup", function (event) {
        thiz.fireChangeEvent();
    }, false);

    this.bind("click", this.openScriptEditor, this.launchScriptEditorButton);
};
PlainTextEditor.prototype.setValue = function (plainText) {
    if (!plainText) return;
    if (plainText.value.indexOf("\r") >= 0 || plainText.value.indexOf("\n") >= 0) {
        this.textarea.setAttribute("rows", "10");
    } else {
        this.textarea.setAttribute("rows", "1");
    }
    this.textarea.innerHTML = Dom.htmlEncode(plainText.value);
    this.textarea.value = plainText.value;
};
PlainTextEditor.prototype.getValue = function () {
    var plainText = new PlainText(this.textarea.value);
    return plainText;
};
PlainTextEditor.prototype.setTypeMeta = function (meta, propertyDefinition) {
    this.meta = meta;
    if (!meta.language) {
        if (propertyDefinition.name.match(/.*(expr|conversion).*/i)) {
            meta.language = "javascript";
        }
    }
    if (!meta.language) {
        this.launchScriptEditorButton.style.display = "none";
    }
};
PlainTextEditor.prototype.openScriptEditor = function () {
    var dialog = new ScriptEditorDialog();
    var thiz = this;
    dialog.callback(function (value) {
        thiz.textarea.value = value;
        thiz.fireChangeEvent();
    });
    dialog.open({
        language: this.meta.language,
        script: this.textarea.value
    });
};
