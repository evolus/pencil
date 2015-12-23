function OnMenuEditor() {
}
OnMenuEditor.typeEditorMap = [];
OnMenuEditor.registerTypeEditor = function (type, editorClass) {
    OnMenuEditor.typeEditorMap[type.name] = editorClass;
};
OnMenuEditor.getTypeEditor = function (type) {
    var editorClass = OnMenuEditor.typeEditorMap[type.name];
    if (!editorClass) return null;
    return editorClass;
};

OnMenuEditor.registerTypeEditor(Bool, "BooleanEditor");
OnMenuEditor.registerTypeEditor(Enum, "EnumEditor");

OnMenuEditor.prototype.install = function (canvas) {
    this.canvas = canvas;
    this.canvas.contextMenuEditor = this;

};
OnMenuEditor.prototype.attach = function (targetObject) {
    this.targetObject = targetObject;
};
OnMenuEditor.prototype.invalidate = function () {
};
OnMenuEditor.prototype.dettach = function () {
};

OnMenuEditor.prototype.generateMenuItems = function () {
    var definedGroups = this.targetObject.getPropertyGroups();
    var items = [];
    var thiz = this;
    for (var i in definedGroups) {
        var group = definedGroups[i];

        for (var j in group.properties) {
            var property = group.properties[j];
            if (property.type == Bool) {
                var item = {
                    type: "Toggle",
                    label: property.displayName,
                    checked: this.targetObject.getProperty(property.name).value,
                    property: property.name,
                    handleAction: function (checked) {
                        var bool = Bool.fromString("" + checked);
                        thiz.targetObject.setProperty(this.property, bool);
                        console.log("after: ", thiz.targetObject.getProperty(this.property));
                    }
                };
                items.push(item);
            }

            console.log("property: ", property);
        }
    }


    // var thiz = this;
    // //actions
    // if (targetObject.def && targetObject.performAction) {
    //     for (var i in targetObject.def.actions) {
    //         var action = targetObject.def.actions[i];
    //         if (action.displayName) {
    //             console.log("action: ", action);
    //         }
    //     }
    // }
    return items;
};

Pencil.registerEditor(OnMenuEditor);
