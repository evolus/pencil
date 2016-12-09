function SharedPropertyEditor() {
    BaseTemplatedWidget.call(this);
    Pencil.registerSharedEditor(this);
    this.canAttach = true;
    //ToolBar.setupFocusHandling(this.node());
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

        thiz.validationEditorUI();
    }, false);
    this.propertyContainer.style.display = "none";

    this.propertyContainer.addEventListener("click", function(event) {
        if (event.target.getAttribute("command") && event.target.getAttribute("command") == "setDefault") {
            thiz.setDefaultProperties();
        }
    }, false);
};
SharedPropertyEditor.prototype.getTitle = function() {
	return "Properties";
}
SharedPropertyEditor.prototype.getIconName = function() {
	return "tune";
}
SharedPropertyEditor.prototype.sizeChanged = function (expanded) {
	this.canAttach = expanded;
	if (this.canAttach && this.pendingTarget) {
		this.attach(this.pendingTarget);
		this.pendingTarget = null;
	}
}
SharedPropertyEditor.prototype.validationEditorUI = function() {
    if (!this.validationEditor) return ;

    for (var i = 0; i < this.validationEditor.length; i++) {
        this.validationEditor[i].style.display = "none";
        var name = this.validationEditor[i]._property.name;
        var meta = this.target.def.propertyMap[name].meta["disabled"];
        var value = this.target.evalExpression(meta, true);

        if (!value) this.validationEditor[i].style.display = "inherit";
    }
}

SharedPropertyEditor.prototype.attach = function (target) {

    if (!target) return;

    if (!this.canAttach) {
		this.pendingTarget = target;
		return;
	}

    if (this.target && this.target.id == target.id) {
        this.target = target;
        return;
    }

    var definedGroups = target.getPropertyGroups();
    if (this.validationEditor) this.validationEditor = null;

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

    this.propertyContainer.style.display = "none";
    this.propertyContainer.style.opacity = "0";
    this.noTargetMessagePane.style.display = "none";

    var uuid = Util.newUUID();
    this.currentExecutorUUID = uuid;

    var definedGroups = this.target.getPropertyGroups();
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

    this.propertyContainer.style.display = "none";
    this.propertyContainer.style.opacity = "0";
    this.noTargetMessagePane.style.display = "none";

    var uuid = Util.newUUID();
    this.currentExecutorUUID = uuid;

    var executor = function () {
        if (!thiz.target || uuid != thiz.currentExecutorUUID) return;
        if (properties.length == 0) {
            if (thiz.target.def.collection.propertyGroups && thiz.target.def.collection.propertyGroups.length > 0) {
                var hbox = Dom.newDOMElement({
                    _name: "hbox",
                    _children: [
                        {
                            _name: "button",
                            _text: "Restore Default",
                            command: "setDefault",
                            "class": "DefaultButton"
                        }
                    ]
                });
                thiz.propertyContainer.appendChild(hbox);
            }
            thiz.propertyContainer.style.display = "flex";
            thiz.propertyContainer.style.opacity = "1";
            thiz.validationEditorUI();
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
                    "flex": "2",
                    _text: propName + ":"
                }
            ]
        });

        var editor = TypeEditorRegistry.getTypeEditor(property.type);
        if (!editor) return;

        var constructeur = window[editor];
        var editorWidget = new constructeur();

        editorWrapper.appendChild(editorWidget.node());
        editorWidget.setAttribute("flex", "3");
        if (editorWidget.setTypeMeta) {
            editorWidget.setTypeMeta(property.meta);
        }
        editorWidget.setValue(thiz.target.getProperty(property.name));
        thiz.propertyEditor[property.name] = editorWidget;
        editorWrapper._property = property;

        if (property.reload) {
            if (!thiz.validationEditor) thiz.validationEditor = [];
            thiz.validationEditor.push(editorWrapper);
            editorWrapper.style.display = "none";
        }
        currentGroupNode.appendChild(editorWrapper);
        window.setTimeout(executor(), 40);
    };
    executor();
    this.properties = this.target.getProperties();
    Dom.emitEvent("p:TitleChanged", this.node(), {});
};

SharedPropertyEditor.prototype.setDefaultProperties = function() {
    if (!this.target) return;
    var collection = this.target.def.collection;
    var defaultProperties = collection.properties;
    var shapeProperties = this.target.getProperties();
    for (p in shapeProperties) {
        var property = defaultProperties[p] || null;
        if (property && this.propertyEditor[p]) {
            property
            var type = property.type;
            var name = ShapeDefCollectionParser.getCollectionPropertyConfigName(collection.id, property.name);
            var value = Config.get(name);
            var propertyValue = property.initialValue;
            if (value) {
                propertyValue = type.fromString(value);
            }
            this.propertyEditor[p].setValue(propertyValue);
            this.target.setProperty(p, propertyValue);
        }
    }
}

SharedPropertyEditor.prototype.detach = function () {
    this.propertyContainer.style.display = "none";
    this.noTargetMessagePane.style.display = "flex";
    this.propertyContainer.innerHTML = "";
    this.target = null;
    Dom.emitEvent("p:TitleChanged", this.node(), {});
};
SharedPropertyEditor.prototype.invalidate = function () {
    if (!this.target) {
        this.detach();
    } else {
        this.attach(this.target);
    }
}
