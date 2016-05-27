function CollectionSettingDialog (collection) {
    Dialog.call(this);
    this.collection = collection;
    this.title = function () {
        return this.collection.displayName + " Properties";
    };

    this.propertyEditors = {};
    for (var i = 0; i < this.collection.propertyGroups.length; i ++) {
        var propertyGroup = this.collection.propertyGroups[i];
        console.log("\"" + propertyGroup.name + "\": \"\",");
        this.propertyContainer.appendChild(this.createGroupNode(propertyGroup));

    }
}
__extend(Dialog, CollectionSettingDialog);

CollectionSettingDialog.prototype.createGroupNode = function (propertyGroup) {
        var currentGroupNode = Dom.newDOMElement({
            _name: "vbox",
            "class": "Group"
        });
        //currentGroupNode._group = property._group;
        var titleNode = Dom.newDOMElement({
            _name: "div",
            _text: propertyGroup.name,
            "class": "Label Group"
        });
        currentGroupNode.appendChild(titleNode);
        //thiz.propertyContainer.appendChild(currentGroupNode);
        //groupNodes.push(currentGroupNode);
        for(var i = 0; i < propertyGroup.properties.length; i++) {
            var property = propertyGroup.properties[i];
            var propName = property.displayName;
            var editorWrapper = Dom.newDOMElement({
                _name: "hbox",
                "class": "Wrapper",
                _children: [
                    {
                        _name: "div",
                        "class": "Label Property",
                        _text: propName + ":"
                    }
                ]
            });
            var editor = TypeEditorRegistry.getTypeEditor(property.type);
            var constructeur = window[editor];
            var editorWidget = new constructeur();

            editorWrapper.appendChild(editorWidget.node());
            editorWidget.setAttribute("flex", "1");
            if (editorWidget.setTypeMeta) {
                editorWidget.setTypeMeta(property.meta);
            }
            editorWidget.setValue(property.value);
            editorWidget._property = property;
            this.propertyEditors[property.name] = editorWidget;

            editorWrapper._property = property;
            currentGroupNode.appendChild(editorWrapper);
        }
        return currentGroupNode;
};

CollectionSettingDialog.prototype.getDialogActions = function () {
    return [
            Dialog.ACTION_CANCEL,
            {
                type: "accept", title: "Apply",
                run: function () {
                    for (propertyName in this.propertyEditors) {
                        var editor = this.propertyEditors[propertyName];
                        if (editor.modified == true) {
                            var value = editor.getValue();

                            var name = ShapeDefCollectionParser.getCollectionPropertyConfigName(this.collection.id, propertyName);
                            Config.set(name, value.toString());

                            var property = this.collection.properties[propertyName];
                            property.value = value;
                        }
                    }
                    return true;
                }
            }
        ]
};
