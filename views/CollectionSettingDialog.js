function CollectionSettingDialog(collection) {
    Dialog.call(this);
    this.title = function () {
        return collection.displayName + " Properties Setting Dialog";
    };
    for (var i = 0; i < collection.propertyGroups.length; i ++) {
        var property = collection.propertyGroups[i];
        console.log("\"" + property.name + "\": \"\",");
        this.propertyContainer.appendChild(this.createGroupNode(property));
    }
}
__extend(Dialog, CollectionSettingDialog);

CollectionSettingDialog.prototype.createGroupNode = function(propertyGroup) {
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
            editorWrapper._property = property;
            currentGroupNode.appendChild(editorWrapper);
        }
        return currentGroupNode;
}

CollectionSettingDialog.prototype.getDialogActions = function () {
    return [
        // Dialog.ACTION_CANCEL,
        // { type: "extra1", title: "Options...", run: function () {
        //     new AboutDialog().open();
        //     return false;
        // }},
        { type: "accept", title: "OK", run: function () {
            // alert("accepted");
            return true;
        }}
    ]
};