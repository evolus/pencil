var SIZE = 60;
var COLOR_PATTERN = /^#([0-9a-f]{3}){1,2}$/i;
var COLOR = [];
var onHoldPicker = false;
var onHoldIndicator = false;
widget.ColorPicker = function () {
    function colorPickerClickHandler(event) {
        var colorPicker = ColorPicker.findInstance(event);
        if (!colorPicker || !colorPicker.enabled) return;
        
        if (colorPicker.option.editMode) {
            var editModeObject = Dom.findUpward(Dom.getTarget(event), {
                eval: function(n){
                    return Dom.hasClass(n, "EditModeActivated");
                }
            });
            
            if (!editModeObject) {
                return;
            }
        }
        
        var colorInput = Dom.findUpward(Dom.getTarget(event), {
            eval: function(n){
                return n == colorPicker.colorInput
            }
        }); 
        
        if (colorInput) {
            if (colorPicker.value != "null" && typeof (colorPicker.value) != "undefined") return;
        }
        
        var builder = {
            title : Messages["select_color_title"],
            size : "250",
            icon: "fa fa-pencil",
            hiddenFooter: true,
            buildContent : function(container) {
                var ul = document.createElement("ul");
                ul.className = "ColorList";
                for (var i = 1; i <= SIZE; i++) {
                    var li = document.createElement("li");
                    var li = Dom.newDOMElement({
                        _name: "li",
                        _children: [{
                            _name: "a",
                            href: "#",
                            style: "background: " + ColorPicker.COLOR[i]
                        }]
                    });
                    
                    li._color = ColorPicker.COLOR[i];
                    ul.appendChild(li);
                }
        
                var thiz = this;
                this._colorPicker = colorPicker;
                container.appendChild(ul);
                Dom.registerEvent(ul, "click", function(e){
                    Dom.cancelEvent(e);
                    var colorObject = Dom.findUpward(Dom.getTarget(e), {
                        eval: function(n){
                            return n._color;
                        }
                    });
                    
                    if (colorObject) {
                        colorPicker.setValue(colorObject._color);
                        thiz._dialog.quit();
                    }
                });
                
                var basicContainer = document.createElement("div");
                basicContainer.className = "BasicContainer";
                
                var advancedButton = document.createElement("a");
                advancedButton = Dom.newDOMElement({
                    _name: "a",
                    href: "#",
                    _html: Messages["advanced_color"]
                });
                
                basicContainer.appendChild(advancedButton);
                
                var noColorContainer = document.createElement("div");
                var noColorCheckbox = Dom.newDOMElement({
                    _name: "input",
                    type: "checkbox",
                    "class": "Checkbox",
                    id: "color_picker_cb"  + widget.random()
                });
                
                if (colorPicker.isNoColor) noColorCheckbox.checked = true;
                noColorContainer.appendChild(noColorCheckbox);
                
                var title = Dom.newDOMElement({
                    _name: "label",
                    _html: Messages["color_selection_no_color"],
                    "for": noColorCheckbox.id
                });
                
                noColorContainer.appendChild(title);
                basicContainer.appendChild(noColorContainer);
                container.appendChild(basicContainer);

                var advancedContainer = Dom.newDOMElement({
                    _name: "div",
                    "class": "AdvancedContainer"
                });
                
                var hsvContainer = document.createElement("div");
                hsvContainer.className = "HSVContainer";
                var hsvMask = document.createElement("div");
                hsvMask.className = "HSVMark";
                this.hsvMask = hsvMask;
                hsvContainer.appendChild(hsvMask);
                
                var hsvPicker = document.createElement("div");
                hsvPicker.className = "HSVPicker";
                this.hsvPicker = hsvPicker;
                this.hsvPicker._x = 0;
                this.hsvPicker._y = 0;
                this.hsvPicker._lastScreenX = 0;
                this.hsvPicker._lastScreenX = 0;
                hsvMask.appendChild(hsvPicker);
                
                var hsvBar = document.createElement("div");
                hsvBar.className = "HSVBar";
                this.hsvBar = hsvBar;
                var hsvBarIndicator = Dom.newDOMElement({
                    _name: "div",
                    "class": "HsvBarIndicator",
                    _html: "<i class=\"fa fa-caret-right\"></i>"
                });
                
                this.hsvBarIndicator = hsvBarIndicator;
                this.hsvBarIndicator._y = 0;
                hsvBar.appendChild(hsvBarIndicator);
                hsvContainer.appendChild(hsvBar);
                
                advancedContainer.appendChild(hsvContainer);
                
                var extraContainer = document.createElement("div");
                extraContainer.className = "Extra";
                
                var advancedColorDisplay = document.createElement("div");
                advancedColorDisplay.className = "AdvancedColorDisplay";
                this.advancedColorDisplay = advancedColorDisplay;
                extraContainer.appendChild(advancedColorDisplay);
                
                var basicButton = Dom.newDOMElement({
                    _name: "a",
                    href: "#",
                    _html: Messages["basic_color_label"],
                    "class": "Basic"
                });
                
                extraContainer.appendChild(basicButton);
                
                var advancedInput = Dom.newDOMElement({
                    _name: "input",
                    type: "text",
                    "class": "form-control Control AdvancedInput"
                });
                
                this.advancedInput = advancedInput;
                extraContainer.appendChild(advancedInput);
                
                advancedContainer.appendChild(extraContainer);
                container.appendChild(advancedContainer);
                
                Dom.registerEvent(noColorCheckbox, "click", function(){
                    colorPicker.setNoColor(this.checked);
                    thiz._dialog.quit();
                });
                
                Dom.registerEvent(advancedButton, "click", function(){
                    Dom.addClass(container, "AdvanceMode");
                    if (!colorPicker.isNoColor) {
                        initColor(colorPicker.value, thiz);
                    }
                });
                
                Dom.registerEvent(basicButton, "click", function(){
                    Dom.removeClass(container, "AdvanceMode");
                });
                
                Dom.registerEvent(hsvMask, "mousedown", hsvMaskMouseDownHandler, false);
                Dom.registerEvent(document, "mousemove", hsvMaskMouseMoveHandler, false);
                Dom.registerEvent(document, "mouseup", hsvMaskMouseUpHandler, false);
                
                Dom.registerEvent(hsvBar, "mousedown", hsvBarIndicatorMouseDownHandler, false);
                Dom.registerEvent(document, "mousemove", hsvBarIndicatorMouseMoveHandler, false);
                Dom.registerEvent(document, "mouseup", hsvBarIndicatorMouseUpHandler, false);
            },
            onOpen : function() {
                if (colorPicker.option.nullValue && colorPicker.option.nullValue == colorPicker.getValue()) {
                    this.advancedInput.value = "";
                    this.advancedColorDisplay.style.background = "#FFF";
                } else {
                    this.advancedInput.value = colorPicker.getValue();
                    this.advancedColorDisplay.style.background = colorPicker.getValue();
                }
            },
            actions : [ {
                title : Messages["close"],
                isCloseHandler : true,
                run : function() {
                    return true;
                }
            } ]
        };

        var dialog = new widget.Dialog(builder);
        dialog.show();
        ColorPicker.dialog = dialog;
    }
    
    function getColor(event) {
        var re = COLOR_PATTERN;
        var colorPicker = ColorPicker.findInstance(event);
        var color = colorPicker.colorInput.value;
        var validColor = re.exec(color);
        if (validColor)  {
            colorPicker.setValue(validColor[0]);
        }
    }
    
    function checkColor(event) {
        var re = COLOR_PATTERN;
        var colorPicker = ColorPicker.findInstance(event);
        var color = colorPicker.colorInput.value;
        var validColor = re.exec(color);
        colorPicker.setValue(validColor ? validColor[0] : (colorPicker.isNoColor && colorPicker.option.nullValue ? colorPicker.option.nullValue : colorPicker.originalColor));
    }
    
    function hsvMaskMouseDownHandler(e) {
        Dom.cancelEvent(e);
        var target = Dom.getTarget(e);
        var container = Dom.findUpward(target, {
            eval: function(n){
                return n._dialog;
            }
        });
        
        if (!container) return;
        if (target == container._dialog.builder.hsvPicker) {
            onHoldPicker = true;
        }
        
        container._dialog.builder.hsvPicker._lastScreenX = Dom.getEventScreenX(e);
        container._dialog.builder.hsvPicker._lastScreenY = Dom.getEventScreenY(e);
        var offsetX = 0;
        var offsetY = 0;
        var ne = Dom.getEventOffset(e, container._dialog.builder.hsvMask);
        if (ne) {
            offsetX = ne.x;
            offsetY = ne.y;
        }
        
        var box = Dom.getBoundingClientRect(container._dialog.builder.hsvPicker);
        var maskBox = Dom.getBoundingClientRect(container._dialog.builder.hsvMask);
        var alphaX = box.width / 2;
        var alphaY = box.height / 2;
        var x = offsetX - 1 - alphaX;
        var y = offsetY - 1 - alphaY;
        if (x >= maskBox.width) x = maskBox.width - alphaX;
        if (x <= 0) x = -alphaX;
        if (y >= maskBox.height) y = maskBox.height - alphaY;
        if (y <= 0) y = -alphaY;
        container._dialog.builder.hsvPicker.style.left = x + "px";
        container._dialog.builder.hsvPicker.style.top = y + "px";
        container._dialog.builder.hsvPicker._x = x;
        container._dialog.builder.hsvPicker._y = y;
        getHSV(container._dialog);
    }
    
    function hsvMaskMouseMoveHandler(e) {
        Dom.cancelEvent(e);
        if (!onHoldPicker) return;
        movePicker(ColorPicker.dialog, e);
        ColorPicker.dialog.builder.hsvMask.style.cursor = "default";
    }
    
    function hsvMaskMouseUpHandler(e) {
        Dom.cancelEvent(e);
        onHoldPicker = false;
        ColorPicker.dialog.builder.hsvMask.style.cursor = "crosshair";
    }
    
    function hsvBarIndicatorMouseDownHandler(e) {
        Dom.cancelEvent(e);
        onHoldIndicator = true;
        var container = Dom.findUpward(Dom.getTarget(e), {
            eval: function(n){
                return n._dialog;
            }
        });
        
        if (!container) return;
        var dialog = container._dialog;
        var offsetX = 0;
        var offsetY = 0;
        var ne = Dom.getEventOffset(e, dialog.builder.hsvBar);
        if (ne) {
            offsetX = ne.x;
            offsetY = ne.y;
        }
        
        var box = Dom.getBoundingClientRect(dialog.builder.hsvBarIndicator);
        var barBox = Dom.getBoundingClientRect(dialog.builder.hsvBar);
        var y = offsetY - (box.height / 2) - 1;
        var alphaY = box.height / 2;
        var minY = -alphaY;
        var maxY = barBox.height - alphaY;
        if (y <= minY) y = minY;
        if (y >= maxY) y = maxY;
        dialog.builder.hsvBarIndicator.style.top = y + "px";
        dialog.builder.hsvBarIndicator._lastScreenY = e.screenY;
        dialog.builder.hsvBarIndicator._y = y;
        getHSV(dialog);
    }
    
    function hsvBarIndicatorMouseMoveHandler(e) {
        Dom.cancelEvent(e);
        if (!onHoldIndicator) return;
        var container = Dom.findUpward(Dom.getTarget(e), {
            eval: function(n){
                return n._dialog;
            }
        });
        
        if (!container) return;
        var dialog = container._dialog;
        var box = Dom.getBoundingClientRect(dialog.builder.hsvBarIndicator); 
        var barBox = Dom.getBoundingClientRect(dialog.builder.hsvBar);
        var minY = -(box.height / 2);
        var maxY = barBox.height - ((box.height / 2));
        var dy = e.screenY - dialog.builder.hsvBarIndicator._lastScreenY;
        var y = dialog.builder.hsvBarIndicator._y + dy;
        if (y <= minY) y = minY - 1;
        if (y >= maxY) y = maxY - 1;
        dialog.builder.hsvBarIndicator.style.top = y + "px";
        dialog.builder.hsvBarIndicator._y = y;
        dialog.builder.hsvBarIndicator._lastScreenY = e.screenY;
        getHSV(dialog);
    }
    
    function hsvBarIndicatorMouseUpHandler(e) {
        Dom.cancelEvent(e);
        onHoldIndicator = false;
    }
    
    function movePicker(dialog, e) {
        var dx = Dom.getEventScreenX(e) - dialog.builder.hsvPicker._lastScreenX;
        var dy = Dom.getEventScreenY(e) - dialog.builder.hsvPicker._lastScreenY;
        var newX = dialog.builder.hsvPicker._x + dx;
        var newY = dialog.builder.hsvPicker._y + dy;
        dialog.builder.hsvPicker._lastScreenX = Dom.getEventScreenX(e);
        dialog.builder.hsvPicker._lastScreenY = Dom.getEventScreenY(e);
        var box = Dom.getBoundingClientRect(dialog.builder.hsvPicker);
        var maskBox = Dom.getBoundingClientRect(dialog.builder.hsvMask);
        var alphaX = box.width / 2;
        var alphaY = box.height / 2;
        var maxX = maskBox.width - alphaX;
        var maxY = maskBox.height - alphaY;
        if (newX <= -alphaX) newX = -alphaX - 1;
        if (newY <= -alphaY) newY = -alphaY - 1;
        if (newX >= maxX) newX = maxX - 1;
        if (newY >= maxY) newY = maxY - 1;
        
        dialog.builder.hsvPicker.style.left = newX + "px"; 
        dialog.builder.hsvPicker.style.top = newY + "px";
        dialog.builder.hsvPicker._x = newX;
        dialog.builder.hsvPicker._y = newY;
        getHSV(dialog);
    }
    
    function getHSV(dialog) {
        var maskBox = Dom.getBoundingClientRect(dialog.builder.hsvMask);
        var pickerBox = Dom.getBoundingClientRect(dialog.builder.hsvPicker);
        var indicatorBox = Dom.getBoundingClientRect(dialog.builder.hsvBarIndicator);
        var barBox = Dom.getBoundingClientRect(dialog.builder.hsvBar);
        var hue = (dialog.builder.hsvPicker._x + (pickerBox.width / 2) ) * 360 / maskBox.width;
        var sat = 100 - ((dialog.builder.hsvPicker._y + (pickerBox.height / 2)) * 100 / maskBox.height);
        var value = 100 - ((dialog.builder.hsvBarIndicator._y + (indicatorBox.height / 2)) * 100 / barBox.height);
        hue = hue < 0 ? 0 : (Math.round(hue) > 360 ? 360 : Math.round(hue));
        sat = sat < 0 ? 0 : (Math.round(sat) > 100 ? 100 : Math.round(sat));
        value = value < 0 ? 0 : (Math.round(value) > 100 ? 100 : Math.round(value));
        
        var color = Color.fromHSV(hue, sat, value);
        var hex = RGB2Hex(color.r, color.g, color.b);
        var color = "#" + hex;
        dialog.builder.advancedInput.value = color;
        dialog.builder.advancedColorDisplay.style.background = color;
        dialog.builder._colorPicker.setValue(color);
        
        var topColor = Color.fromHSV(hue, sat, 100);
        var bottomColor = Color.fromHSV(hue, sat, 0);
        var gradient = makeGradientStyle("#" + RGB2Hex(topColor.r, topColor.g, topColor.b), "#" + RGB2Hex(bottomColor.r, bottomColor.g, bottomColor.b))
        dialog.builder.hsvBar.setAttribute("style", gradient);
    }
    
    function initColor(color, container) {
       var colorObject = Color.fromString(color);
       var hsvObject = colorObject.getHSV();
       
       var maskBox = Dom.getBoundingClientRect(container.hsvMask);
       var pickerBox = Dom.getBoundingClientRect(container.hsvPicker);
       var indicatorBox = Dom.getBoundingClientRect(container.hsvBarIndicator);
       var barBox = Dom.getBoundingClientRect(container.hsvBar);
       var pickerX = (hsvObject.hue * maskBox.width / 360) - (pickerBox.width / 2);
       var pickerY = ((hsvObject.saturation) * maskBox.height / 100) - (pickerBox.height / 2);
       var indicatorY = ((hsvObject.value) * barBox.height / 100) - (indicatorBox.height / 2);
       
       var alphaX = pickerBox.width / 2;
       var alphaY = pickerBox.height / 2;
       var maxX = maskBox.width - alphaX;
       var maxY = maskBox.height - alphaY;
       
       pickerY = 100 - pickerY;
       indicatorY = 100 - indicatorY;
       
       if (pickerX <= -alphaX) pickerX = -alphaX - 1;
       if (pickerY <= -alphaY) pickerY = -alphaY - 1;
       if (pickerX >= maxX) pickerX = maxX - 1;
       if (pickerY >= maxY) pickerY = maxY - 1;
       
       var indicatorMinY = -(indicatorBox.height / 2);
       var indicatorMaxY = barBox.height - (indicatorBox.height / 2);
       if (indicatorY <= indicatorMinY) indicatorY = indicatorMinY - 1;
       if (indicatorY >= indicatorMaxY) indicatorY = indicatorMaxY - 1;

       container.hsvPicker.style.left = pickerX + "px";
       container.hsvPicker.style.top = pickerY + "px";
       container.hsvBarIndicator.style.top = indicatorY + "px";
       container.hsvPicker._x = pickerX;
       container.hsvPicker._y = pickerY;
       container.hsvBarIndicator._y = indicatorY;
       var topColor = Color.fromHSV(hsvObject.hue, hsvObject.saturation, 100);
       var bottomColor = Color.fromHSV(hsvObject.hue, hsvObject.saturation, 0);
       var gradient = makeGradientStyle("#" + RGB2Hex(topColor.r, topColor.g, topColor.b), "#" + RGB2Hex(bottomColor.r, bottomColor.g, bottomColor.b))
       container.hsvBar.setAttribute("style", gradient);
    }
    
    function ColorPicker(container, option) {
        this.container = widget.get(container);
        this.value = null;
        this.option = option || {};
        this.lastColor = null;
        this.originalColor = null;
        this.isNoColor = false;
        this.enabled = true;
        
        this.wrapper = Dom.newDOMElement({
            _name: "div",
            "class": "ColorPicker"
        });
        
        this.wrapper._colorPicker = this;
        this.container.appendChild(this.wrapper);
        
        this.color = Dom.newDOMElement({
            _name: "span",
            "class": "Color"
        });
        
        this.wrapper.appendChild(this.color);
        
        this.colorTitle = Dom.newDOMElement({
            _name: "span",
            "class": "ColorTitle"
        });
        
        this.wrapper.appendChild(this.colorTitle);
        
        this.colorInput = Dom.newDOMElement({
            _name: "input",
            type: "text",
            maxLength: "7",
            "class": "form-control Control"
        });
        
        this.wrapper.appendChild(this.colorInput);
        
        this.editModeActivated = false;
        Dom.registerEvent(this.wrapper, "click", colorPickerClickHandler, false);
        Dom.registerEvent(this.colorInput, "keyup", getColor, false);
        Dom.registerEvent(this.colorInput, "blur", checkColor, false);
        this.setValue(this.value);
        if (this.option.editMode) {
            this.color.style.cursor = "default";
        }
    }
    
    ColorPicker.prototype.setValue = function(value) {
        if (!this.originalColor) this.originalColor = value;
        this.value = value;
        if (this.value) {
            this.color.style.background = this.value;
            this.color.style.display = "inline-block";
            this.colorInput.value = value;
            this.colorTitle.innerHTML = this.value;
            this.color.innerHTML = "";
            if (this.value == this.option.nullValue) {
                this.color.innerHTML = "X";
                this.color.style.background = "#FFF";
                this.colorTitle.innerHTML = "";
                this.colorInput.value = this.getNullTitle();
            }
        } else {
            this.colorInput.value = this.getNullTitle();
            this.color.innerHTML = "X";
            this.color.style.background = "#FFF";
            this.colorTitle.innerHTML = "";
        }
        
        if (this.value == null || (this.option.nullValue && this.option.nullValue == this.value)) {
            this.isNoColor = true;
        } else {
            this.isNoColor = false;
        }
    };
    
    ColorPicker.prototype.getNullTitle = function() {
        return this.option.nullTitle ? this.option.nullTitle : Messages["none"]; 
    };
    
    ColorPicker.prototype.getValue = function() {
        if (this.option.nullValue && this.value == null) return this.option.nullValue;
        return this.value;
    };
    
    ColorPicker.prototype.setNoColor = function(isNoColor) {
        this.isNoColor = isNoColor;
        if (isNoColor) {
            this.lastColor = this.value;
            this.setValue(null);
        } else {
            this.setValue(this.lastColor);
            this.lastColor = null;
        }
    };
    ColorPicker.prototype.setEnabled = function(enabled) {
        this.enabled = enabled;
        Dom.toggleClass(this.container, "Disabled", !enabled);
    };
    ColorPicker.findInstance = function(event) {
        var target = Dom.getTarget(event);
        var node = Dom.findUpward(target, {
            eval: function(n) {
                return n._colorPicker;
            }
        });

        if (!node) return null;

        return node._colorPicker;
    };
    
    ColorPicker.COLOR = {
            1: "#FFFFFF",
            2: "#FFCCCC",
            3: "#FFCC99",
            4: "#FFFF99",
            5: "#FFFFCC",
            6: "#99FF99",
            7: "#99FFFF",
            8: "#CCFFFF",
            9: "#CCCCFF",
            10: "#FFCCFF",
            11: "#CCCCCC",
            12: "#FF6666",
            13: "#FF9966",
            14: "#FFFF66",
            15: "#FFFF33",
            16: "#66FF99",
            17: "#33FFFF",
            18: "#66FFFF",
            19: "#9999FF",
            20: "#FF99FF",
            21: "#C0C0C0",
            22: "#FF0000",
            23: "#FF9900",
            24: "#FFCC66",
            25: "#FFFF00",
            26: "#33FF33",
            27: "#66CCCC",
            28: "#33CCFF",
            29: "#6666CC",
            30: "#CC66CC",
            31: "#999999",
            32: "#CC0000",
            33: "#FF6600",
            34: "#FFCC33",
            35: "#FFCC00",
            36: "#33CC00",
            37: "#00CCCC",
            38: "#3366FF",
            39: "#6633FF",
            40: "#CC33CC",
            41: "#666666",
            42: "#990000",
            43: "#CC6600",
            44: "#CC9933",
            45: "#999900",
            46: "#009900",
            47: "#339999",
            48: "#3333FF",
            49: "#6600CC",
            50: "#993399",
            51: "#000000",
            52: "#330000",
            53: "#993300",
            54: "#663333",
            55: "#333300",
            56: "#003300",
            57: "#003333",
            58: "#000066",
            59: "#330099",
            60: "#330033",
    };
    
    return ColorPicker;
}();

var makeGradientStyle = function(){
    var gradientString = "background-image: -moz-linear-gradient(top, {colour1}, {colour2});" +
        "background-image: -o-linear-gradient(top, {colour1}, {colour2});" +
        "background-image: -webkit-linear-gradient(top, {colour1}, {colour2});" +
        "background: -ms-linear-gradient(top,  {colour1}, {colour2});" +
        "background: linear-gradient(top,  {colour1}, {colour2});" +
        "filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=\"{colour1}\", endColorstr=\"{colour2}\",GradientType=0 );";
    
    return function(colour1, colour2){
        return gradientString.replace(/\{colour1\}/g, colour1).replace(/\{colour2\}/g, colour2);
    }
}();

