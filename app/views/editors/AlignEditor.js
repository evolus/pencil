function AlignEditor() {
    PropertyEditor.call(this);

    this.horzCombo.renderer = function (h) {
        return '<i>format_align_' +
                (h == 0 ? 'left' : (h == 1 ? 'center' : 'right')) +
                '</i><span>' +
                (h == 0 ? 'Left' : (h == 1 ? 'Center' : 'Right')) +
                '</span>';
    };
    this.horzCombo.comparer = function (a, b) {
        if (!a) return !b;
        if (!b) return false;
        return a == b;
    };
    this.horzCombo.useHtml = true;
    this.horzCombo.setItems([0, 1, 2]);
    this.horzCombo.popup.setPopupClass("AlignEditorPopup");

    this.vertCombo.renderer = function (h) {
        return '<i>vertical_align_' +
                (h == 0 ? 'top' : (h == 1 ? 'center' : 'bottom')) +
                '</i><span>' +
                (h == 0 ? 'Top' : (h == 1 ? 'Middle' : 'Bottom')) +
                '</span>';
    };
    this.vertCombo.comparer = function (a, b) {
        if (!a) return !b;
        if (!b) return false;
        return a == b;
    };
    this.vertCombo.useHtml = true;
    this.vertCombo.setItems([0, 1, 2]);
    this.vertCombo.popup.setPopupClass("AlignEditorPopup");

    this.bind("p:ItemSelected", this.fireChangeEvent);
}
__extend(PropertyEditor, AlignEditor);

AlignEditor.prototype.setup = function () {
    if (this.hasAttribute("value")) this.setValue(Alignment.fromString(this.getAttribute("value")));
};
AlignEditor.prototype.setValue = function (alignment) {
    this.horzCombo.selectItem(alignment.h);
    this.vertCombo.selectItem(alignment.v);
};
AlignEditor.prototype.getValue = function () {
    return new Alignment(this.horzCombo.getSelectedItem(), this.vertCombo.getSelectedItem());
};
