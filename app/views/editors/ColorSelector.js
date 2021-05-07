function ColorSelector() {
    BaseTemplatedWidget.call(this);


    // this.modeTab.addTab("Grid", this.gridSelectorPane);
    // this.modeTab.addTab("Wheel", this.wheelSelectorPane);

    this.color = Color.fromString("#DA8500");
    this.invalidateUI();
    this.reloadRecentlyUsedColors();
    this.initializeGridSelector();

    //get the radius
    this.pinHeld = false;

    this.updatingColor = true;

    var thiz = this;
    //register the event handler
    // wheel selector event handler
    this.htmlCodeInput.addEventListener("change", function(event) {
        var val = thiz.htmlCodeInput.value;
        if (val == "") {
            thiz.htmlCodeInput.value = thiz.color.toRGBString() || "";
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


    this.bright.addEventListener("input", function(event) {
        if (!thiz.bright.value) thiz.bright.value = 0;

        var hsv = thiz.color.getHSV();
        var a = thiz.color.a;

        thiz.color = Color.fromHSV(hsv.hue, hsv.saturation, thiz.bright.value);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.bright);
    }, false);

    this.hue.addEventListener("input", function(event) {
        if (!thiz.hue.value) thiz.hue.value = 0;

        var hsv = thiz.color.getHSV();
        var a = thiz.color.a;

        thiz.color = Color.fromHSV(thiz.hue.value, hsv.saturation, hsv.value);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.hue);
    }, false);
    this.sat.addEventListener("input", function(event) {
        if (!thiz.sat.value) thiz.sat.value = 0;

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
        if (value == 0) value = 100;
        var a = thiz.color.a;

        thiz.color = Color.fromHSV(h, s, value);
        thiz.color.a = a;
        thiz.onValueChanged(thiz.wheelImage);
        thiz.clearSelectedColor(thiz.recentlyUsedColor);
    }, false);

    if (this.hasAttribute("color")) {
        this.setColor(Color.fromString(this.getAttribute("color")));
    } else {
        this.setColor(new Color());
    }

    this.gridSelectorContainer.addEventListener("click", function (event) {
        var colorCell = Dom.findUpward(event.target, function (n) {
            return n.hasAttribute("color");
        });
        if (!colorCell) return;
        thiz.updatingColor = false;
        thiz.selectColorCell(colorCell);
        thiz._emitCloseEvent();
    }, false);

    function colorListSelectHandler(event) {
        var colorCell = Dom.findUpward(event.target, function (n) {
            return n.hasAttribute("color");
        });
        if (!colorCell) return;
        thiz.selectColorCell(colorCell, true);
        thiz._emitCloseEvent();
    }
    this.recentlyUsedColor.addEventListener("click", colorListSelectHandler, false);
    this.documentPaletteContainer.addEventListener("click", colorListSelectHandler, false);

    this.bind("contextmenu", function (event) {
        var color = Dom.findUpwardForData(event.target, "_color");
        if (!color) return;

        ColorSelector._handlePaletteMenu(thiz, color, event);
    }, this.documentPaletteContainer);

    this.bind("click", this.pickColor, this.pickerButton);
    this.bind("click", this.addToPalette, this.addToPaletteButton);
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


ColorSelector._handlePaletteMenu = function (thiz, color, event) {
    if (!ColorSelector._paletteMenu) {
        ColorSelector._paletteMenu = new Menu();
        ColorSelector._paletteMenu.register({
            getLabel: function () { return "Remove" },
            icon: "delete",
            run: function () {
                Pencil.controller.removeColorFromDocumentPalette(ColorSelector._colorToRemove);
                ColorSelector._instanceForMenu.loadDocumentColors();
            }
        });
    }

    ColorSelector._colorToRemove = color;
    ColorSelector._instanceForMenu = thiz;
    ColorSelector._paletteMenu.showMenuAt(event.clientX, event.clientY);
};

ColorSelector.prototype.onInsertedIntoDocument = function () {
    var thiz = this;
    window.setTimeout(function () {
        thiz.radius = thiz.wheelImage.offsetWidth / 2;
        thiz.invalidateUI();
    }, 10);
};
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
    this.updatingColor = true;
    this.onValueChanged(this.wheelImage);
};
ColorSelector.prototype._handleMouseUp = function (event) {
    this.pinHeld = false;
    this.updatingColor = false;
    this.updateRecentlyUsedColors();
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
ColorSelector.prototype._emitCloseEvent = function () {
    Dom.emitEvent("p:CloseColorSelector", this.node(), {});
};
ColorSelector.prototype._changHS = function (hue, sat) {
    this.hue.value = hue;
    this.sat.value = sat;
    this._emitChangeEvent();
};
ColorSelector.prototype.setColor = function (color) {
    this.selectedCell = null;
    this.color = color;
    this.onValueChanged();
    if (!this.selectedCell) {
        var uppercaseVal = this.color.toRGBString().toUpperCase();
        Dom.doOnAllChildRecursively(this.recentlyUsedColor, function (n) {
            if (n.getAttribute) {
                if (n.getAttribute("color") == uppercaseVal) {
                    n.setAttribute("selected", "true");
                    this.selectedCell = n;
                } else {
                    n.removeAttribute("selected");
                }
            }
        });
    }
};
ColorSelector.prototype.setGridSelectorColor = function () {
    if (!this._initialized) this.initializeGridSelector();

    var uppercaseVal = this.color.toRGBString().toUpperCase();

    var thiz = this;
    Dom.doOnAllChildRecursively(this.gridSelectorContainer, function (n) {
        if (n.getAttribute) {
            if (n.getAttribute("color") == uppercaseVal) {
                n.setAttribute("selected", "true");
                thiz.selectedCell = n;
            } else {
                n.removeAttribute("selected");
            }
        }
    });
};
ColorSelector.prototype.setupColors = function () {
    this.loadRecentlyUsedColors();
    this.loadDocumentColors();
};
ColorSelector.prototype.loadRecentlyUsedColors = function () {
    var colors = Config.get("gridcolorpicker.recentlyUsedColors", "");

    this._lastUsedColors = colors;
    var c = colors.split(",");
    this.recentlyUsedColors = c;
    var el = this.recentlyUsedColorElements;
    for (var i = 0; i < Math.min(el.length, c.length); i++) {
        var color = c[i];
        if (color.length > 7) {
            color = color.substring(0, 7);
        }
        if (el[i].hasAttribute && el[i].hasAttribute("color")) {
            el[i].setAttribute("color", color);
            el[i].setAttribute("style", "background-color: " + color);
        }
    }
};
ColorSelector.prototype.addToPalette = function () {
    if (!Pencil.controller || !Pencil.controller.doc) return;
    Pencil.controller.addColorIntoDocumentPalette(this.getColor());
    this.loadDocumentColors();
};
ColorSelector.prototype.loadDocumentColors = function () {
    Dom.toggleClass(this.documentPalettePane, "NoDocument", Pencil.controller && Pencil.controller.doc ? false : true);
    if (!Pencil.controller || !Pencil.controller.doc) return;

    Dom.setInnerText(this.paletteTitle, (Pencil.controller.doc.name || "Untitled Document") + " color palette:")

    var colors = Pencil.controller.getDocumentColorPalette();
    if (!colors || colors.length == 0) {
        Dom.addClass(this.documentPalettePane, "Empty");
    } else {
        Dom.removeClass(this.documentPalettePane, "Empty");
    }

    Dom.empty(this.documentPaletteContainer);
    colors.forEach(function (c) {
        var cell = document.createElement("div");
        cell.setAttribute("class", "colorpickertile");
        cell.setAttribute("title", c.toString());
        cell.setAttribute("color", c.toString());
        cell._color = c;
        cell.setAttribute("style", "background-color: " + c.toRGBAString() + ";")
        this.documentPaletteContainer.appendChild(cell);
    }.bind(this));
};
ColorSelector.prototype.initializeGridSelector = function () {
    if (this._initialized) return;
    this._initialized = true;

    var thiz = this;
    this.recentlyUsedColorElements = [];
    Dom.doOnAllChildren(this.recentlyUsedColor, function (n) {
        if (n.hasAttribute && n.hasAttribute("color")) {
            thiz.recentlyUsedColorElements.push(n);
        }
    });
    this.setupColors();
};
ColorSelector.prototype.updateRecentlyUsedColors = function () {
    var aColor = this.color;
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
    this.clearSelectedColor(this.recentlyUsedColor);
};
ColorSelector.prototype.reloadRecentlyUsedColors = function () {
    var thiz = this;
    this.recentlyUsedColors = [];
    var colors = Config.get("gridcolorpicker.recentlyUsedColors");
    if (!colors) {
        colors = "#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF,#FFFFFFFF";
    }
    colors = colors.split(",");
    for (var i = 0; i < colors.length; i++) {
        this.recentlyUsedColors.push(colors[i]);
    }

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

    this.clearSelectedColor(this.recentlyUsedColor);
};
ColorSelector.prototype.clearSelectedColor = function (parentNode) {
    Dom.doOnAllChildren(parentNode, function (n) {
        if (n.removeAttribute) n.removeAttribute("selected");
    });
};
ColorSelector.prototype.selectColorCell = function (cell, selectFromRecentlyUsedColors) {
    //change selected cell
    if (this.selectedCell) {
        this.selectedCell.removeAttribute("selected");
    }
    this.selectedCell = cell;
    this.selectedCell.setAttribute("selected", "true");

    if (selectFromRecentlyUsedColors) {
        this.color =  Color.fromString(cell.getAttribute("color"));
        this.onValueChanged();
    } else {
        var a = this.color.a;
        this.color =  Color.fromString(cell.getAttribute("color"));
        this.color.a = a;

        this.onValueChanged(this.gridSelectorContainer);
    }
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
    thiz.radius = thiz.wheelImage.offsetWidth / 2;
    window.setTimeout(function () {
        thiz.radius = thiz.wheelImage.offsetWidth / 2;
    }, 10);
};
ColorSelector.prototype.invalidateUI = function (source) {
    this.previewBox.style.backgroundColor = this.color.toRGBAString();
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
    if (source) {
        this.updateRecentlyUsedColors();
    }
    this.invalidateUI(source);
    this.clearSelectedColor(this.recentlyUsedColor);
    this._emitChangeEvent();
};
ColorSelector.installGlobalListeners = function () {
    if (ColorSelector.globalListenersInstalled) return;

    ColorSelector.globalListenersInstalled = true;

    document.body.addEventListener("mousedown", function (event) {
        if (!ColorSelector.currentPickerInstance) return;

        event.cancelBubble = true;
        event.stopPropagation();
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();

        var electron = require("electron");

        var displays = electron.remote.screen.getAllDisplays();
        if (!displays || displays.length <= 0) {
            ColorSelector.currentPickerInstance.onColorPickingCanceled();
            return;
        }

        var maxWidth = 0;
        var maxHeight = 0;
        displays.forEach(function (d) {
            maxWidth = Math.max(maxWidth, d.bounds.x + d.bounds.width);
            maxHeight = Math.max(maxHeight, d.bounds.y + d.bounds.height);
        });


        document.body.setAttribute("color-picker-active", "picking");

        var x = event.screenX;
        var y = event.screenY;

        new Capturer().captureFullScreenData(
            {
                x: 0,
                y: 0,
                width: maxWidth,
                height: maxHeight,
                processor: function (canvas, context) {
                    var pixelData = context.getImageData(x, y, 1, 1).data;
                    return "#" + Color.Dec2Hex(pixelData[0]) + Color.Dec2Hex(pixelData[1]) + Color.Dec2Hex(pixelData[2]);
                }
            },
            function (color, error) {
                if (!color) {
                    console.log("Error:", error);
                    ColorSelector.currentPickerInstance.onColorPickingCanceled();
                    return;
                }

                ColorSelector.currentPickerInstance.onColorPicked(color);
                ColorSelector.currentPickerInstance = null;
            });
    }, true);

    document.body.addEventListener("focus", function (event) {
        if (!ColorSelector.currentPickerInstance) return;

        event.cancelBubble = true;
        event.stopPropagation();
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }, true);



    document.body.addEventListener("mouseup", function (event) {
        if (!ColorSelector.currentPickerInstance) return;

        event.cancelBubble = true;
        event.stopPropagation();
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }, true);

    document.body.addEventListener("click", function (event) {
        if (!ColorSelector.currentPickerInstance) return;

        event.cancelBubble = true;
        event.stopPropagation();
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }, true);
};
ColorSelector.prototype.onColorPickingCanceled = function () {
    document.body.removeAttribute("color-picker-active");
    document.body.removeAttribute("color-picker-active-external");
    BaseWidget.closableProcessingDisabled = false;
    ColorSelector.currentPickerInstance = null;
    BaseWidget.unregisterClosable(ColorSelector._pickerClosable);
};
ColorSelector.prototype.onColorPicked = function (color) {
    document.body.removeAttribute("color-picker-active");
    document.body.removeAttribute("color-picker-active-external");
    BaseWidget.closableProcessingDisabled = false;
    BaseWidget.unregisterClosable(ColorSelector._pickerClosable);

    var a = this.color.a;
    this.color = Color.fromString(color);
    this.color.a = a;
    this.onValueChanged(this.pickerButton);
    this._emitCloseEvent();
};

ColorSelector._pickerClosable = {
    close: function () {
        if (ColorSelector.currentPickerInstance) ColorSelector.currentPickerInstance.onColorPickingCanceled();
    }
};

ColorSelector.CONFIG_EXTERNAL_COLOR_PICKER_PATH = Config.define("color.external_picker_path", "");

ColorSelector.prototype.pickColor = function (event) {
    var externalPickerPath = Config.get(ColorSelector.CONFIG_EXTERNAL_COLOR_PICKER_PATH, "");
    if (!externalPickerPath) {
        this.pickColorUsingElectronCapture();
        return;
    }

    var thiz = this;

    if (event && event.shiftKey) {
        window.setTimeout(function () {
            thiz.pickColorUsingExternalTool(externalPickerPath);
        }, 2000);
    } else {
        thiz.pickColorUsingExternalTool(externalPickerPath);
    }
};
ColorSelector.prototype.pickColorUsingExternalTool = function (externalPickerPath) {
    var thiz = this;

    document.body.setAttribute("color-picker-active-external", true);
    var exec = require("child_process").exec;
    exec(externalPickerPath, function (error, stdout, stderr) {
        var color = stdout;
        console.log("Color: " + color);
        if (color) {
            thiz.onColorPicked(color.replace(/[^0-9#A-F]+/gi, ""));
        } else {
            thiz.onColorPickingCanceled();
        }
    });
}

ColorSelector.prototype.pickColorUsingElectronCapture = function () {
    ColorSelector.installGlobalListeners();

    document.body.setAttribute("color-picker-active", true);
    BaseWidget.closableProcessingDisabled = true;

    ColorSelector.currentPickerInstance = this;
    BaseWidget.registerClosable(ColorSelector._pickerClosable);
};