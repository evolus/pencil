function SharedPropertyEditor() {
    BaseTemplatedWidget.call(this);
}
__extend(BaseTemplatedWidget, SharedPropertyEditor);

SharedPropertyEditor.prototype.setup = function () {
    this.propertyContainer.innerHTML = "";
};
SharedPropertyEditor.prototype.attach = function (target) {
    if (!target) return;
    this.target = target;
    this.propertyContainer.innerHTML = "";
    var definedGroups = this.target.getPropertyGroups();
    var groupNodes = [];
    for (var i in definedGroups) {
        var group = definedGroups[i];
        var groupNode = null;
        for (var j in group.getProperties) {
            var property = group.getProperties[j];
            var editor = TypeEditorRegistry.getTypeEditor(property.type);
            if (!editor) continue;
            if (!groupElement) {
                groupNode = Dom.newDOMElement({
                    _name: "vbox",
                    "class": "Group"
                });

                groupNode._group = group;
                var titleNode = Dom.newDOMElement({
                    _name: "div",
                    _text: group.name,
                    "class": "Label Group"
                });
                groupNode.appendChild(titleNode);
                this.propertyContainer.appendChild(groupNode);
                groupNodes.push(groupNode);
            }

            var editorWrapper = Dom.newDOMElement({
                _name: "vbox",
                "class": "Wrapper",
                _children: [
                    {
                        _name: "div",
                        "class": "Label Property",
                        _text: property.displayName
                    }
                ]
            });

            var editorNode = Dom.newDOMElement({
                _name: "ui:" + editor,
                "class": "Element"
            });
            editorNode._property = property;

            editorWrapper.appendChild(editorNode);

            groupNode.appendChild(editorWrapper);
        }
    }
};
SharedPropertyEditor.prototype.detach = function () {
};
SharedPropertyEditor.prototype.invalidate = function () {
    if (!this.target) {
        this.detach();
    } else {
        this.attach(this.target);
    }
}

//
// SharedBorderStyleEditor.PROPERTY_NAME = "strokeStyle";
// textColor
// fillColor
// strokeColor
// SharedFontEditor.PROPERTY_NAME = "textFont";
