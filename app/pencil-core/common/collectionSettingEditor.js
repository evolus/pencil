function CollectionSettingEditor(collection) {
    this.collection = collection;

    var definedGroups = collection.propertyGroups;

    this.properties = {};

    var strippedGroups = [];
    for (var i in definedGroups) {
        var group = definedGroups[i];
        var strippedGroup = new PropertyGroup();
        for (var j in group.properties) {
            var property = group.properties[j];
            var editor = TypeEditorRegistry.getTypeEditor(property.type);
            if (editor) {
                strippedGroup.properties.push(property);
                this.properties[property.name] = property.value;
            }
        }
        if (strippedGroup.properties.length > 0) {
            strippedGroup.name = group.name;
            strippedGroups.push(strippedGroup);
        }
    }

    this.groups = strippedGroups;
}

CollectionSettingEditor.prototype.getPropertyValue = function (name) {
    return this.collection.properties[name].value;
};

CollectionSettingEditor.prototype.setPropertyValue = function (name, value) {
    var prop = this.collection.properties[name];
    if (!prop) return;

    var Type = window[value.constructor.name];
    if (!Type) return;

    var literal = value.toString();

    var name = ShapeDefCollectionParser.getCollectionPropertyConfigName (this.collection.id, name)
    Config.set(name, literal);

    prop.value = Type.fromString(value.toString());
};

CollectionSettingEditor.prototype.getTargetObjectName = function () {
    return this.collection.displayName;
};
CollectionSettingEditor.prototype.usingQuickMode = function () {
    return true;
};

CollectionSettingEditor.prototype.open = function () {
    this.propertyWindow = window.openDialog("chrome://pencil/content/propertyDialog.xul", "propertyEditor" + Util.getInstanceToken(), "chrome,dialog,alwaysRaised,dependent", this);
};
CollectionSettingEditor.prototype.onDialogShown = function () {
    this.propertyWindow.setup();
};
