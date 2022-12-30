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
    
    var handleUpdatePageProperties = function () {
        if (thiz.updatePagePropertiesTimer) window.clearTimeout(thiz.updatePagePropertiesTimer);
        thiz.updatePagePropertiesTimer = window.setTimeout(function () {
            thiz.savePageProperties();
        }, 300);
    };

    this.propertyContainer.addEventListener("p:ValueChanged", function(event) {
        if (!thiz.target) return;
        var editor = Dom.findUpward(event.target, function (n) {
            return n._property;
        });
        if (!editor) return;

        var propertyName = editor._property.name;
        thiz.target.setProperty(propertyName, thiz.propertyEditor[propertyName].getValue(), false, event.mask);

        thiz.validationEditorUI();
    }, false);
    this.propertyContainer.style.display = "none";

    this.propertyContainer.addEventListener("click", function(event) {
        if (event.target.getAttribute("command") && event.target.getAttribute("command") == "setDefault") {
            thiz.setDefaultProperties();
        }
    }, false);
    this.propertyContainer.addEventListener("input", function(event) {
        if (event.target != thiz.symbolNameInput || !thiz.target || !thiz.target.setSymbolName) return;
        thiz.target.setSymbolName(event.target.value.trim());
    }, false);
    this.propertyContainer.addEventListener("change", function(event) {
        if (!thiz.isPagePropertyMode()) return;
        handleUpdatePageProperties();
    });
    this.propertyContainer.addEventListener("p:ItemSelected", function(event) {
        thiz.savePageProperties(true);
    });
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
    if (!this.validationEditor) return;

    var allowDisabled = Config.get(Config.DEV_ENABLE_DISABLED_IN_PROP_PAGE);
    for (var i = 0; i < this.validationEditor.length; i++) {
        var name = this.validationEditor[i]._property.name;
        var meta = this.target.def.propertyMap[name].meta["disabled"];
        var disabled = !allowDisabled && this.target.evalExpression(meta, true);

        this.validationEditor[i].style.display = disabled ? "none" : "flex";
    }
};

SharedPropertyEditor.prototype.attach = function (target) {

    if (!target) return;
    if (target && target.getAttributeNS && target.getAttributeNS(PencilNamespaces.p, "locked") == "true") { return; }

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

    if (this.target.prepareExpressionEvaluation) this.target.prepareExpressionEvaluation();

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

    this.node().setAttribute("mode", "Target");

    var uuid = Util.newUUID();
    this.currentExecutorUUID = uuid;

    var definedGroups = this.target.getPropertyGroups();
    this.propertyEditor = {};
    this.propertyContainer.innerHTML = "";
    var definedGroups = this.target.getPropertyGroups();
    var groupNodes = [];

    var properties = [];

    var allowDisabled = Config.get(Config.DEV_ENABLE_DISABLED_IN_PROP_PAGE);

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
            if (thiz.target.def && thiz.target.def.collection.propertyGroups && thiz.target.def.collection.propertyGroups.length > 0) {
                var hbox = Dom.newDOMElement({
                    _name: "hbox",
                    "class": "FooterActions",
                    _children: [
                        {
                            _name: "button",
                            _text: "Restore Default Settings",
                            command: "setDefault",
                            "class": "DefaultButton"
                        }
                    ]
                });
                thiz.propertyContainer.appendChild(hbox);
            }

            if (StencilCollectionBuilder.isDocumentConfiguredAsStencilCollection() && thiz.target.getSymbolName) {
                thiz.propertyContainer.appendChild(Dom.newDOMElement({
                    _name: "vbox",
                    "class": "SymbolNameContainer",
                    _children: [
                        {
                            _name: "label",
                            _text: "Symbol Name:"
                        },
                        {
                            _name: "input",
                            type: "text",
                            _id: "symbolNameInput",
                            value: thiz.target.getSymbolName() || ""

                        }
                    ]
                }, document, thiz));
            }

            thiz.propertyContainer.style.display = "flex";
            thiz.propertyContainer.style.opacity = "1";
            thiz.validationEditorUI();
            return;
        }

        try {
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
            var propName = property.displayName ? property.displayName.trim() : null;
            if (!propName) propName = property.type.name;

            var groupName = property._group.name ? property._group.name.trim() : null;

            if (!propName || !groupName) { return; }

            if (propName.indexOf(groupName) == 0) {
                propName = propName.substring(groupName.length);
            }

            var editorWrapper = Dom.newDOMElement({
                _name: "vbox",
                "class": "Wrapper Type_" + property.type.name,
                _children: [
                    {
                        _name: "div",
                        "class": "Label Property",
                        _text: propName + ":"
                    }
                ]
            });

            var editor = TypeEditorRegistry.getTypeEditor(property.type);
            if (!editor) return;

            var constructeur = window[editor];
            var editorWidget = new constructeur();

            editorWrapper.appendChild(editorWidget.node());
            if (editorWidget.setTypeMeta) {
                editorWidget.setTypeMeta(property.meta, property);
            }
            editorWidget.setValue(thiz.target.getProperty(property.name));
            thiz.propertyEditor[property.name] = editorWidget;
            editorWrapper._property = property;

            var meta = property.meta["disabled"];

            if (meta) {
                if (!thiz.validationEditor) thiz.validationEditor = [];
                thiz.validationEditor.push(editorWrapper);

                var disabled = !allowDisabled && thiz.target.evalExpression(meta, true);
                editorWrapper.style.display = disabled ? "none" : "flex";
            }

            currentGroupNode.appendChild(editorWrapper);
        } finally {
            window.setTimeout(executor, 20);
        }
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
    this.propertyContainer.innerHTML = "";
    this.target = null;
    if (Pencil.controller.activePage) {
        this.node().setAttribute("mode", "Page");
        this.pagePropertyWidget = new PageDetailDialog();
        this.pagePropertyWidget.setup({
            defaultPage : Pencil.controller.activePage,
            onDone: function(page) {
            }
        });
        this.propertyContainer.appendChild(this.pagePropertyWidget.dialogBody);
    } else {
        this.node().setAttribute("mode", "None");
        this.pagePropertyWidget = null;
    }
    Dom.emitEvent("p:TitleChanged", this.node(), {});
};
SharedPropertyEditor.prototype.savePageProperties = function (shouldReloadOnSaved) {
    console.log("savePageProperties");
    if (!this.isPagePropertyMode()) return;
    if (!this.pagePropertyWidget.isPageInfoValid()) {
        this.pagePropertyWidget.setup({
            defaultPage : Pencil.controller.activePage
        });
        return;
    }
    var updatedPage = this.pagePropertyWidget.updatePage();
    if (shouldReloadOnSaved) {
        this.pagePropertyWidget.setup({
            defaultPage : updatedPage
        });
    }
};
SharedPropertyEditor.prototype.isPagePropertyMode = function () {
    return this.node().getAttribute("mode") == "Page";
};
SharedPropertyEditor.prototype.invalidate = function () {
    if (!this.target) {
        this.detach();
    } else {
        this.attach(this.target);
    }
}
