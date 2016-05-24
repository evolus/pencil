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
        console.log("keyup")
        thiz.fireChangeEvent();
    }, false);
};
PlainTextEditor.prototype.setValue = function (plainText) {
    if (!plainText) return;
    if (plainText.value.indexOf("\r") >= 0 || plainText.value.indexOf("\n") >= 0) {
        this.textarea.setAttribute("rows", "10");
    } else {
        this.textarea.setAttribute("rows", "1");
    }
    this.textarea.innerHTML = plainText.value;
    this.textarea.value = plainText.value;
};
PlainTextEditor.prototype.getValue = function () {
    var plainText = new PlainText(this.textarea.value);
    return plainText;
};
