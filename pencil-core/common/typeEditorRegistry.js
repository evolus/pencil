var TypeEditorRegistry = {};
TypeEditorRegistry.typeEditorMap = [];
TypeEditorRegistry.registerTypeEditor = function (type, tagName) {
    this.typeEditorMap[type.name] = tagName;
};
TypeEditorRegistry.getTypeEditor = function (type) {
    var editor = this.typeEditorMap[type.name];
    if (!editor) return null;
    return editor;
};

TypeEditorRegistry.registerTypeEditor(Color, "pcoloreditor");
TypeEditorRegistry.registerTypeEditor(Font, "pfonteditor");
TypeEditorRegistry.registerTypeEditor(Alignment, "paligneditor");
TypeEditorRegistry.registerTypeEditor(StrokeStyle, "pstrokeeditor");
TypeEditorRegistry.registerTypeEditor(PlainText, "pplaintexteditor");
TypeEditorRegistry.registerTypeEditor(ShadowStyle, "pshadowstyleeditor");
TypeEditorRegistry.registerTypeEditor(Enum, "penumeditor");
