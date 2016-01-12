function SharedPropertyEditor() {
    BaseTemplatedWidget.call(this);
    Pencil.registerSharedEditor(this);
}
__extend(BaseTemplatedWidget, SharedPropertyEditor);

SharedPropertyEditor.prototype.setup = function () {
    this.propertyContainer.innerHTML = "";
    var thiz = this;

    this.propertyContainer.addEventListener("p:ValueChanged", function(event) {
        console.log("p:ValueChanged", event);
        if (!thiz.target) return;
        var editor = Dom.findUpward(event.target, function (n) {
            return n._property;
        });
        if (!editor) return;

        var propertyName = editor._property.name;
        thiz.target.setProperty(propertyName, thiz.propertyEditor[propertyName].getValue());

    }, false);
    this.propertyContainer.style.display = "none";
};
SharedPropertyEditor.prototype.attach = function (target) {
    if (!target) return;

    var definedGroups = target.getPropertyGroups();

    this.target = target;
    this.propertyEditor = {};
    this.propertyContainer.innerHTML = "";
    var definedGroups = this.target.getPropertyGroups();
    var groupNodes = [];

    var properties = [];
    for (var i in definedGroups) {
        var group = definedGroups[i];
        for (var j in group.properties) {
            var property = group.properties[j];
            var editor = TypeEditorRegistry.getTypeEditor(property.type);
            if (!editor) continue;

            property._group = group;
            properties.push(property);
        }
    }

    var thiz = this;
    var currentGroupNode = null;

    this.propertyContainer.style.display = "block";
    this.propertyContainer.style.opacity = "0";

    var uuid = Util.newUUID();
    this.currentExecutorUUID = uuid;

    var executor = function () {
        if (!thiz.target || uuid != thiz.currentExecutorUUID) return;
        if (properties.length == 0) {
            thiz.propertyContainer.style.display = "block";
            thiz.propertyContainer.style.opacity = "1";
            return;
        }

        var property = properties.shift();
        if (!currentGroupNode || currentGroupNode._group != property._group) {
            currentGroupNode = Dom.newDOMElement({
                _name: "vbox",
                "class": "Group"
            });

            currentGroupNode._group = property._group;
            var titleNode = Dom.newDOMElement({
                _name: "div",
                _text: property._group.name,
                "class": "Label Group"
            });
            currentGroupNode.appendChild(titleNode);
            thiz.propertyContainer.appendChild(currentGroupNode);
            groupNodes.push(currentGroupNode);
        }

        var propName = property.displayName ? property.displayName.trim() : property.displayName;
        var groupName = property._group.name ? property._group.name.trim() : property._group.name;
        if (propName.indexOf(groupName) == 0) {
            propName = propName.substring(groupName.length);
        }

        var editorWrapper = Dom.newDOMElement({
            _name: "hbox",
            "class": "Wrapper",
            _children: [
                {
                    _name: "div",
                    "class": "Label Property",
                    _text: propName
                }
            ]
        });

        var editor = TypeEditorRegistry.getTypeEditor(property.type);
        if (!editor) return;

        var constructeur = window[editor];
        var editorWidget = new constructeur();

        editorWrapper.appendChild(editorWidget.node());
        editorWidget.setAttribute("flex", "1");
        if (editorWidget.setTypeMeta) {
            editorWidget.setTypeMeta(property.meta);
        }
        editorWidget.setValue(thiz.target.getProperty(property.name));
        thiz.propertyEditor[property.name] = editorWidget;
        editorWrapper._property = property;

        currentGroupNode.appendChild(editorWrapper);
        editorWidget.signalOnAttached();

        window.setTimeout(executor, 80);
    };

    executor();

    this.properties = this.target.getProperties();

};
SharedPropertyEditor.prototype.detach = function () {
    this.propertyContainer.innerHTML = "";
    this.propertyContainer.style.display = "none";
};
SharedPropertyEditor.prototype.invalidate = function () {
    if (!this.target) {
        this.detach();
    } else {
        this.attach(this.target);
    }
}
