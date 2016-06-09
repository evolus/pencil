function ColorPropertyEditor() {
    PropertyEditor.call(this);
    this.bind("p:PopupHidden", function () {
    }, this.selectorContainer);
    var thiz = this;
    this.selectorContainer.shouldCloseOnBlur = function(event) {
        var found = Dom.findUpward(event.target, function (node) {
            return node == thiz.colorButton;
        });
        return !found;
    };
};
__extend(PropertyEditor, ColorPropertyEditor);
ColorPropertyEditor.prototype.setup = function () {
    this.color = Color.fromString("#DA8500");
    var thiz = this;

    this.colorButton.addEventListener("click", function (event) {
        if (thiz.selectorContainer.isVisible()) {
            thiz.selectorContainer.hide();
            return;
        }
        thiz.selector.setColor(thiz.color);
        thiz.selectorContainer.show(thiz.colorButton, "left-inside", "bottom", 0, 5);
        event.cancelBubble = true;
    }, false);

    this.selector.addEventListener("ValueChange", function (event) {
        thiz.color = thiz.selector.getColor();
        thiz.onValueChanged(thiz.selector);
    }, false);

    this.selector.addEventListener("p:CloseColorSelector", function (event) {
        if (thiz.selectorContainer.isVisible()) {
            thiz.selectorContainer.hide();
            return;
        }
    }, false);

    this.colorText.addEventListener("change", function(event) {
        var val = thiz.colorText.value;
        if (val == "") {
            thiz.colorText.value = thiz.color.toRGBString();
            return;
        }
        var uppercaseVal = val.toRGBString ? val.toRGBString().toUpperCase() : (val.toUpperCase ? val.toUpperCase() : val);
        // Translate standard HTML color strings:
        if (uppercaseVal[0] != "#") {
            switch (val) {
                case "GREEN":
                    uppercaseVal = "#008000";
                    break;
                case "LIME":
                    uppercaseVal = "#00FF00";
                    break;
                case "OLIVE":
                    uppercaseVal = "#808000";
                    break;
                case "TEAL":
                    uppercaseVal = "#008080";
                    break;
                case "YELLOW":
                    uppercaseVal = "#FFFF00";
                    break;
                case "RED":
                    uppercaseVal = "#FF0000";
                    break;
                case "MAROON":
                    uppercaseVal = "#800000";
                    break;
                case "PURPLE":
                    uppercaseVal = "#800080";
                    break;
                case "FUCHSIA":
                    uppercaseVal = "#FF00FF";
                    break;
                case "NAVY":
                    uppercaseVal = "#000080";
                    break;
                case "BLUE":
                    uppercaseVal = "#0000FF";
                    break;
                case "AQUA":
                    uppercaseVal = "#00FFFF";
                    break;
                case "WHITE":
                    uppercaseVal = "#FFFFFF";
                    break;
                case "SILVER":
                    uppercaseVal = "#CC0C0C0";
                    break;
                case "GRAY":
                    uppercaseVal = "#808080";
                    break;
                default: // BLACK
                    uppercaseVal = "#000000";
                    break;
            }
        } else if (uppercaseVal.length > 7) {
            uppercaseVal = uppercaseVal.substring(7);
        }

        var a = thiz.color.a;
        thiz.color = Color.fromString(uppercaseVal);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.colorText);
    }, false);
};
ColorPropertyEditor.prototype.setValue = function (color) {
    if (!color) return;
    this.color = color;
    this.onValueChanged();
};
ColorPropertyEditor.prototype.onValueChanged = function (element) {
    if (element != this.colorText) {
        this.colorText.value = this.color.toRGBString();
    }
    this.colorText.style.backgroundColor = this.color.toRGBString();
    if (element) {
        this.fireChangeEvent();
    }
};
ColorPropertyEditor.prototype.getValue = function () {
    return this.color;
};
