function StrokeEditor() {
    PropertyEditor.call(this);
}
__extend(PropertyEditor, StrokeEditor);

StrokeEditor.prototype.setup = function () {
    //setting up dasharray
    var STYLES = [  [Util.getMessage("stroke.style.solid"), ""],
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
            label: label,
            value: value
        }

        strokeItems.push(item);
    }

    this.items = strokeItems;
    var thiz = this;
    this.styleCombo.renderer = function (style) {
        var svg = Dom.newDOMElement({
            _name: "div",
            "class": "StrokeStyleComboItem",
            style: "width: 100px; height: 1em; position: relative;",
            _children: [
                {
                    _name: "svg",
                    _uri: PencilNamespaces.svg,
                    version: "1.1",
                    viewBox: "0 0 100 1",
                    height: "8",
                    width: "100",
                    style: "position: absolute; top: 50%; left: 0px; margin-top: -4px;",
                    _children: [
                        {
                            _name: "path",
                            _uri: PencilNamespaces.svg,
                            d: "m 0,0.5 100,0",
                            style: "fill:none;stroke:#000000;stroke-width:2;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:" + style.value + ";stroke-dashoffset:0"
                        }
                    ]
                }
            ]
        });
        return svg;
    };
    this.styleCombo.decorator = function (node, style) {
    };

    this.styleCombo.setItems(strokeItems);
    var thiz = this;
    this.styleCombo.addEventListener("p:ItemSelected", function (event) {
        thiz.fireChangeEvent();
    }, false);
    this.strokeWidth.addEventListener("input", function (event) {
        if (thiz.strokeWidth.value == "") thiz.strokeWidth.value = 1;
        thiz.fireChangeEvent();
    }, false);

};

StrokeEditor.prototype.setValue  = function (stroke) {
    this.strokeWidth.value = stroke.w;
    var item = null;
    for (var i = 0; i < this.items.length; i++) {
        if (this.items[i].value == stroke.array) {
            item = this.items[i];
            break;
        }
    }
    this.styleCombo.selectItem(item);
};

StrokeEditor.prototype.getValue = function () {
    var stroke = new StrokeStyle();
    stroke.w = this.strokeWidth.value;
    stroke.array = this.styleCombo.getSelectedItem().value;
    return stroke;
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
