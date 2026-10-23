function AlignEditor() {
    PropertyEditor.call(this);
    this.bind("click", this._handleClick);
}
__extend(PropertyEditor, AlignEditor);

AlignEditor.prototype.setup = function () {
    if (this.hasAttribute("value")) this.setValue(Alignment.fromString(this.getAttribute("value")));
};
AlignEditor.prototype._handleClick = function (event) {
    var button = Dom.findParentByTagName(event.target, "button");
    if (!button) return;
    
    button.parentNode.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("checked", b == button);
    });
    
    this.fireChangeEvent(button.parentNode == this.horizontalGroup ? Alignment.H : Alignment.V);
};
AlignEditor.prototype.setValue = function (alignment) {
    this.horizontalGroup.querySelectorAll("button").forEach(function (button) {
        var value = parseInt(button.getAttribute("data"), 10);
        button.setAttribute("checked", value == alignment.h);
    });
    this.verticalGroup.querySelectorAll("button").forEach(function (button) {
        var value = parseInt(button.getAttribute("data"), 10);
        button.setAttribute("checked", value == alignment.v);
    });
};
AlignEditor._getValueFromGroup = function (group) {
    var button = group.querySelector("button[checked='true']");
    if (!button) return 0;
    return parseInt(button.getAttribute("data"), 10);
};
AlignEditor.prototype.getValue = function () {
    return new Alignment(AlignEditor._getValueFromGroup(this.horizontalGroup), AlignEditor._getValueFromGroup(this.verticalGroup));
};
