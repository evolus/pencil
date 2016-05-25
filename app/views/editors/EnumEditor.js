function EnumEditor() {
    PropertyEditor.call(this);
}
__extend(PropertyEditor, EnumEditor);

EnumEditor.prototype.setup = function () {
    this.enumCombo.renderer = function (enumObject) {
        if (!enumObject) return "";
        return enumObject.label;
    };

    var thiz = this;
    this.enumCombo.addEventListener("p:ItemSelected", function(event) {
        thiz.fireChangeEvent();
    }, false);

};
EnumEditor.prototype.setTypeMeta = function (meta) {
    this.meta = meta;
    var enumValues = Enum.getValuesFromMeta(this.meta);
    this.enumCombo.setItems(enumValues);
};
EnumEditor.prototype.setValue = function (enumObject) {
    if (!enumObject) return;
    var enumValues = Enum.getValuesFromMeta(this.meta);
    for (var i in enumValues) {
        if (enumValues[i].value == enumObject.value) {
            this.enumCombo.selectItem(enumValues[i]);
            return;
        }
    }
};
EnumEditor.prototype.getValue = function () {
    var item = this.enumCombo.getSelectedItem();
    return new Enum(item.value);
};
