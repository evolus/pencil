function StrokeEditor() {
    BaseTemplatedWidget.call(this);
    this.initialize();
}
__extend(BaseTemplatedWidget, StrokeEditor);

StrokeEditor.prototype.initialize = function () {
    //setting up dasharray
    var STYLES = [
                    [Util.getMessage("stroke.style.solid"), ""],
                    [Util.getMessage("stroke.style.dotted"), "1,3"],
                    [Util.getMessage("stroke.style.condensed.dotted"), "1,1"],
                    [Util.getMessage("stroke.style.dashed"), "5,5"],
                    [Util.getMessage("stroke.style.condensed.dashed"), "3,3"],
                    [Util.getMessage("stroke.style.dashed.dotted"), "8,4,1,4"],
                    [Util.getMessage("stroke.style.condensed.dashed.dotted"), "4,2,1,2"]
                ];
    var strokeItems = [];
    for (var i in STYLES) {
        var label = STYLES[i][0];
        var value = STYLES[i][1];

        var item = {
            displayName: label,
            value: value
        }

        strokeItems.push(item);
    }
    this.styleCombo.setItems(strokeItems);

};

StrokeEditor.prototype.setValue  = function (stroke) {
    this.strokeWidth.value = stroke.w;
    // if (stroke.array) {
    //     this.styleCombo.selectItem(stroke.array);
    // }
    this.styleCombo.selectItem(stroke.array);
};

StrokeEditor.prototype.getValue = function () {
    var stroke = new StrokeStyle();
    stroke.w = this.strokeWidth.value;
    stroke.array = this.styleCombo.getSeletedItem();
    return stroke.toString();
};
StrokeEditor.prototype.setDisabled = function (disabled) {
    if (disabled == true) {
        this.strokeWidth.setAttribute("disabled", "true");
        this.styleCombo.setDisabled(true);
    } else {
        this.strokeWidth.removeAttribute("disabled");
        this.styleCombo.setDisabled(false);
    }
};
