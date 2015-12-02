function ColorSelector() {
    BaseTemplatedWidget.call(this);

    this.modeTab.addTab("Grid", this.gridSelectorPane);
    this.modeTab.addTab("Wheel", this.wheelSelectorPane);

    this.color = Color.fromString("#DA8500");
    this.invalidateUI();

    //get the radius
    this.pinHeld = false;

    var thiz = this;
    //register the event handler
    // wheel selector event handler
    this.htmlCodeInput.addEventListener("change", function(event) {
        var a = thiz.color.a;
        thiz.color = Color.fromString(thiz.htmlCodeInput.value);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.htmlCodeInput);
    }, false);
    this.brightScale.addEventListener("change", function(event) {
        var hsv = thiz.color.getHSV();
        var a = thiz.color.a;

        thiz.color = Color.fromHSV(hsv.hue, hsv.saturation, thiz.brightScale.value);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.brightScale);
    }, false);
    this.brightScale.addEventListener("mouseup", function(event) {
        // thiz._emitChangeEvent();
    }, false);

    this.opacity.addEventListener("change", function(event) {
        thiz.color.a = thiz.opacity.value / 100;
        thiz.onValueChanged(thiz.opacity);
    }, false);


    this.bright.addEventListener("change", function(event) {
        var hsv = thiz.color.getHSV();
        var a = thiz.color.a;

        thiz.color = Color.fromHSV(hsv.hue, hsv.saturation, thiz.bright.value);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.bright);
    }, false);

    this.hue.addEventListener("change", function(event) {
        var hsv = thiz.color.getHSV();
        var a = thiz.color.a;

        thiz.color = Color.fromHSV(thiz.hue.value, hsv.saturation, hsv.value);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.hue);
    }, false);
    this.sat.addEventListener("change", function(event) {
        var hsv = thiz.color.getHSV();
        var a = thiz.color.a;

        thiz.color = Color.fromHSV(hsv.hue, thiz.sat.value, hsv.value);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.sat);
    }, false);
    this.wheelOverlay.addEventListener("mousedown", function(event) {
        if (thiz.getAttribute("disabled")) return;
        ColorSelector.heldInstance = thiz;
        var r = thiz.wheelOverlay.getBoundingClientRect();
        var x = event.clientX - r.left;
        var y = event.clientY - r.top;

        var r = Math.sqrt((thiz.radius - x) * (thiz.radius - x) + (thiz.radius - y) * (thiz.radius - y));

        if (r > thiz.radius) {
            return;
        }

        thiz.pin.style.left = x + "px";
        thiz.pin.style.top = y + "px";
        thiz.pinHeld = true;

        var h = Math.round(Math.atan2(thiz.radius - y, x - thiz.radius) * 180 / Math.PI);
        h = (h + 360) % 360;

        var s = Math.round(r * 100 / thiz.radius);

        var value = thiz.color.getHSV().value;
        var a = thiz.color.a;

        thiz.color = Color.fromHSV(h, s, value);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.wheelImage);
    }, false);
    // this.clearSatButton.addEventListener("command", function(event) {
    //     thiz.sat.value = 0;
    //     thiz._handleHueSatNumberChange(true);
    // }, false)

    if (this.hasAttribute("color")) {
        this.setColor(Color.fromString(this.getAttribute("color")));
    } else {
        this.setColor(new Color());
    }

    // grid selector event handler
    // this.gridSelectorContainer.addEventListener("mouseover", function (event) {
    //     this.hoverCell(event.originalTarget);
    // }, false);
    this.gridSelectorContainer.addEventListener("click", function (event) {
        var colorCell = Dom.findUpward(event.target, function (n) {
            return n.hasAttribute("color");
        });
        if (!colorCell) return;
        thiz.selectColorCell(colorCell);
    }, false);
    // this.gridSelectorContainer.addEventListener("focus", function (event) {
    //     if (!mIsPopup && this.getAttribute('focused') != 'true') {
    //         //debug("focused");
    //         this.setAttribute('focused','true');
    //         //document.addEventListener("keydown", this, true);
    //         if (this.mSelectedCell)
    //             this.hoverCell(this.mSelectedCell);
    //     }
    // }, false);
    // this.gridSelectorContainer.addEventListener("blur", function (event) {
    //     if (!mIsPopup && this.getAttribute('focused') == 'true') {
    //         document.removeEventListener("keydown", this, true);
    //         this.removeAttribute('focused');
    //         this.resetHover();
    //     }
    // }, false);

    this.initializeGridSelector();
}
__extend(BaseTemplatedWidget, ColorSelector);

ColorSelector.heldInstance = null;

/*
    Register global event listener
 */
document.addEventListener("mousemove", function (event) {
    if (!ColorSelector.heldInstance) return;
    ColorSelector.heldInstance._handleMouseMove(event);
}, false);

document.addEventListener("mouseup", function () {
    if (!ColorSelector.heldInstance) return;
    ColorSelector.heldInstance._handleMouseUp(event);
    ColorSelector.heldInstance = null;
}, false);

ColorSelector.prototype._handleMouseMove = function (event) {
    event.preventDefault();

    var r = this.wheelOverlay.getBoundingClientRect();
    var x = event.clientX - r.left;
    var y = event.clientY - r.top;

    var r = Math.sqrt((this.radius - x) * (this.radius - x) + (this.radius - y) * (this.radius - y));

    if (r > this.radius) {
        x = Math.round(this.radius * (r - this.radius + x) / r);
        y = Math.round(this.radius * (r - this.radius + y) / r);

        r = this.radius;
    }

    this.pin.style.left = x + "px";
    this.pin.style.top = y + "px";

    var h = Math.round(Math.atan2(this.radius - y, x - this.radius) * 180 / Math.PI);
    h = (h + 360) % 360;

    var s = Math.round(r * 100 / this.radius);
    var value = this.color.getHSV().value;
    var a = this.color.a;

    this.color = Color.fromHSV(h, s, value);
    this.color.a = a;
    this.onValueChanged(this.wheelImage);
};
ColorSelector.prototype._handleMouseUp = function (event) {
    this.pinHeld = false;
};
ColorSelector.prototype._handleHueSatNumberChange = function () {
    var hsv = this.color.getHSV();
    var h = hsv.hue;
    var s = hsv.saturation;
    var a = (h <= 180 ? h : h - 360) * Math.PI / 180;

    var x = this.radius + Math.round(this.radius * (s / 100) * Math.cos(a));
    var y = this.radius - Math.round(this.radius * (s / 100) * Math.sin(a));

    this.pin.style.left = x + "px";
    this.pin.style.top = y + "px";
};
ColorSelector.prototype._emitChangeEvent = function () {
    if (this._disableEventFiringOnce) {
        this._disableEventFiringOnce = false;
        return;
    }
    var event = document.createEvent("Events");
    event.initEvent("ValueChange", false, false);
    this.dispatchEvent(event);
};
ColorSelector.prototype._changHS = function (hue, sat) {
    this.hue.value = hue;
    this.sat.value = sat;
    this._emitChangeEvent();
};
ColorSelector.prototype.setColor = function (color) {
    this.color = color;
    this.onValueChanged();
};
ColorSelector.prototype.setGridSelectorColor = function () {
    if (!this._initialized) this.initializeGridSelector();

    var uppercaseVal = this.color.toRGBString().toUpperCase();

    var thiz = this;
    Dom.doOnAllChildRecursively(this.gridSelectorContainer, function (n) {
        if (thiz.isColorCell(n)) {
            if (n.getAttribute("color") == uppercaseVal) {
                n.setAttribute("selected", "true");
                thiz.selectedCell = n;
            } else {
                n.removeAttribute("selected");
            }
        }
    });

};
ColorSelector.prototype.initializeGridSelector = function () {
    this.reloadRecentlyUsedColors();

    if (this._initialized) return;
    this._initialized = true;

    var thiz = this;
    var el = this.recentlyUsedColor.childNodes;
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(function () {
        var colors = Config.get("gridcolorpicker.recentlyUsedColors");
        //debug("color: " + [colors, thiz._lastColors]);
        //debug("color: " + colors);
        if (colors != thiz._lastUsedColors) {
            thiz._lastUsedColors = colors;
            var c = colors.split(",");
            thiz.recentlyUsedColors = c;
            for (var i = 0; i < Math.min(el.length, c.length); i++) {
                var color = c[i];
                if (color.length > 7) {
                    color = color.substring(0, 7);
                }
                //debug("color: " + color);
                el[i].setAttribute("color", color);
                el[i].setAttribute("style", "background-color: " + color);
            }
        }
    }, 300);
};
ColorSelector.prototype.updateRecentlyUsedColors = function (aColor) {
    if (this.updatingColor) return;
    this.updatingColor = true;
    for (var i = 0; i < this.recentlyUsedColors.length; i++) {
        if (this.recentlyUsedColors[i] == aColor) {
            this.updatingColor = false;
            return;
        }
    }
    this.recentlyUsedColors.push(aColor);
    if (this.recentlyUsedColors.length > 10) {
        this.recentlyUsedColors.shift();
    }
    var colors = this.recentlyUsedColors.join(",");
    Config.set("gridcolorpicker.recentlyUsedColors", colors);
    this.updatingColor = false;
};
ColorSelector.prototype.reloadRecentlyUsedColors = function () {
    var thiz = this;
    this.recentlyUsedColors = [];
    var colors = Config.get("gridcolorpicker.recentlyUsedColors");
    if (!colors) {
        colors = "#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF";
    }
    colors = colors.split(",");
    for (var i = 0; i < colors.length; i++) {
        this.recentlyUsedColors.push(colors[i]);
    }

    console.log(this.recentlyUsedColor);
    var e = this.recentlyUsedColor.childNodes;
    for (var i = 0; i < Math.min(e.length, this.recentlyUsedColors.length); i++) {
        if (!this.isColorCell(e[i])) continue;
        var color = this.recentlyUsedColors[i];
        if (color.length > 7) {
            color = color.substring(0, 7);
        }
        //debug("color: " + color);
        e[i].setAttribute("color", color);
        e[i].setAttribute("style", "background-color: " + color);
    }
};
ColorSelector.prototype.selectColorCell = function (cell) {
    //change selected cell
    if (this.selectedCell) {
        this.selectedCell.removeAttribute("selected");
    }
    this.selectedCell = cell;
    this.selectedCell.setAttribute("selected", "true");

    var a = this.color.a;
    this.color =  Color.fromString(cell.getAttribute("color"));
    this.color.a = a;

    this.onValueChanged(this.gridSelectorContainer);
    this.updateRecentlyUsedColors(this.color);
};
ColorSelector.prototype.isColorCell = function (cell) {
    return cell && cell.nodeType != 3 && cell.hasAttribute("color");
};
ColorSelector.prototype.getColor = function () {
    return this.color;
};
ColorSelector.prototype.isModified = function () {
    return this.isUserModified;
};
ColorSelector.prototype.onAttached = function () {
    var thiz = this;
    window.setTimeout(function () {
        thiz.radius = thiz.wheelImage.offsetWidth / 2;
    }, 10);
};
ColorSelector.prototype.invalidateUI = function (source) {
    if (source) this.isUserModified = true;
    var hsv = this.color.getHSV();

    if (source != this.hue) this.hue.value = hsv.hue;
    if (source != this.sat) this.sat.value = hsv.saturation;
    if (source != this.bright) this.bright.value = hsv.value;
    if (source != this.brightScale) this.brightScale.value = hsv.value;
    if (source != this.htmlCodeInput) this.htmlCodeInput.value = this.color.toRGBString();
    if (source != this.opacity) this.opacity.value = Math.round(this.color.a * 100);
    this.opacityText.innerHTML = Math.round(this.color.a * 100) + "%";

    if (source != this.wheelImage) this._handleHueSatNumberChange();
    if (source != this.gridSelectorContainer) this.setGridSelectorColor();

    this.previewBox.style.backgroundColor = this.color.toRGBAString();
};
ColorSelector.prototype.onValueChanged = function (source) {
    this.invalidateUI(source);
    this._emitChangeEvent();
};
