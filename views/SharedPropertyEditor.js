function SharedPropertyEditor() {
    BaseTemplatedWidget.call(this);
    Pencil.registerSharedEditor(this);
}
__extend(BaseTemplatedWidget, SharedPropertyEditor);

SharedPropertyEditor.prototype.setup = function () {
    this.propertyContainer.innerHTML = "";
    var thiz = this;

    this.propertyContainer.addEventListener("change", function(event) {
        if (!thiz.target) return;
        var editor = Dom.findUpward(event.target, function (n) {
            return n._property;
        });
        if (!editor) return;

        thiz.target.setProperty(editor._property.name, thiz.propertyEditor[editor._property.name].getValue());

    }, false);
    this.propertyContainer.addEventListener("modify", function(event) {
        if (!thiz.target) return;
        var editor = Dom.findUpward(event.target, function (n) {
            return n._property;
        });
        if (!editor) return;

        thiz.target.setProperty(editor._property.name, thiz.propertyEditor[editor._property.name].getValue());

    }, false);
    this.propertyContainer.addEventListener("click", function(event) {
        if (!thiz.target) return;
        var editor = Dom.findUpward(event.target, function (n) {
            return n._property;
        });
        if (!editor) return;

        thiz.target.setProperty(editor._property.name, thiz.propertyEditor[editor._property.name].getValue());
    }, false);
    this.node().style.display = "none";
};
SharedPropertyEditor.prototype.attach = function (target) {
    if (!target) return;

    var definedGroups = target.getPropertyGroups();
    console.log(definedGroups);

    this.target = target;
    this.propertyEditor = {};
    this.propertyContainer.innerHTML = "";
    var definedGroups = this.target.getPropertyGroups();
    var groupNodes = [];
    for (var i in definedGroups) {
        var group = definedGroups[i];
        var groupNode = null;
        for (var j in group.properties) {
            var property = group.properties[j];
            console.log(property);
            var editor = TypeEditorRegistry.getTypeEditor(property.type);
            if (!editor) continue;
            console.log(editor);
            if (!groupNode) {
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

            var constructeur = window[editor];
            var editorWidget = new constructeur();

            editorWrapper.appendChild(editorWidget.node());
            editorWidget.setValue(this.target.getProperty(property.name));
            this.propertyEditor[property.name] = editorWidget;
            editorWrapper._property = property;

            groupNode.appendChild(editorWrapper);
            editorWidget.signalOnAttached();
        }
    }
    this.node().style.display = "block";
};
SharedPropertyEditor.prototype.detach = function () {
    this.propertyContainer.innerHTML = "";
    this.node().style.display = "none";
};
SharedPropertyEditor.prototype.invalidate = function () {
    if (!this.target) {
        this.detach();
    } else {
        this.attach(this.target);
    }
}
