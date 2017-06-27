function SettingDialog() {
    Dialog.call(this);
    this.title = "Settings";

    this.configElements = {
        "grid.enabled": this.checkboxEnableGrid,
        "edit.gridSize" : this.textboxGridSize,
        "edit.gridStyle" : this.comboGridStyle,
        "edit.snap.grid": this.snapToGrid,
        "object.snapping.enabled": this.enableSnapping,
        "object.snapping.background": this.enableSnappingBackground,
        "quick.editting": this.quickEditting,
        "edit.cutAndPasteAtTheSamePlace": this.cutAndPasteAtTheSamePlace,
        "view.undo.enabled": this.undoEnabled,
        "view.undoLevel": this.textboxUndoLevel,
        "view.uiTextScale": this.textScaleInput,
        "view.useCompactLayout": this.useCompactLayout
    };

    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("configName");
        });
        if (!node) return;
        var configName = node.getAttribute("configName");

        console.log("configName:", configName);
        if (node.type == "checkbox") {
            this.updateConfigAndInvalidateUI(configName, node.checked);
        }
    }, this.settingTabPane);

    this.bind("input", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("configName");
        });
        if (!node) return;
        var configName = node.getAttribute("configName");

        if (node.value == "" || parseInt(node.value) == 0) {
            var defaultValue = node.getAttribute("default-value");
            if (defaultValue) {
                node.value = defaultValue;
            }
        }

        Config.set(configName, node.value);
        this.setPreferenceItems();
    }, this.textboxGridSize);

    this.bind("change", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("configName");
        });
        if (!node) return;
        var configName = node.getAttribute("configName");

        if (node.value == "" || parseInt(node.value) == 0) {
            var defaultValue = node.getAttribute("default-value");
            if (defaultValue) {
                node.value = defaultValue;
            }
        }
        if (node.type == "number" || node.type == "text") {
            // if (configName == "external.editor.bitmap.path") {
            //     if (node.value == "" ) node.value = "/usr/bin/gimp";
            // }
            // if (configName == "external.editor.vector.path") {
            //     if (node.value == "" ) node.value = "/usr/bin/inkscape";
            // }

            Config.set(configName, node.value);
            this.setPreferenceItems();
            if (configName == "view.uiTextScale") {
                widget.reloadDesktopFont().then(function () {});
            }
        }

        ApplicationPane._instance.invalidateUIForConfig();
    }, this.settingTabPane);

    this.bind("input", function (event) {
        this.setPreferenceItems();
    }, this.preferenceNameInput);

    var thiz = this;
    this.comboGridStyle.addEventListener("p:ItemSelected", function (event) {
        var gridStyle = thiz.comboGridStyle.getSelectedItem();
        thiz.updateConfigAndInvalidateUI("edit.gridStyle", gridStyle);
    }, false);

}
__extend(Dialog, SettingDialog);

SettingDialog.prototype.updateConfigAndInvalidateUI = function (configName, value) {
    Config.set(configName, value);
    if (this.configElements[configName]) {
        var checkBox = this.configElements[configName];
        if (checkBox == this.checkboxEnableGrid) {
            if (value) {
                Dom.removeClass(this.textboxGridSize.parentNode, "Disabled");
                Dom.removeClass(this.gridStyleContainer, "Disabled");
            } else {
                Dom.addClass(this.textboxGridSize.parentNode, "Disabled");
                Dom.addClass(this.gridStyleContainer, "Disabled");
            }
        }
        if (checkBox == this.undoEnabled) {
            if (value) {
                Dom.removeClass(this.textboxUndoLevel.parentNode, "Disabled");
            } else {
                Dom.addClass(this.textboxUndoLevel.parentNode, "Disabled");
            }
        }
        if (checkBox == this.enableSnapping) {
            this.enableSnappingBackground.disabled = !this.enableSnapping.checked;
            if (value) {
                Dom.removeClass(this.enableSnappingBackground.parentNode, "Disabled");
            } else {
                Dom.addClass(this.enableSnappingBackground.parentNode, "Disabled");
            }
        }
        checkBox.checked = value;
    }
    this.setPreferenceItems();
}

SettingDialog.prototype.setup = function () {
    this.checkboxEnableGrid.checked = Config.get("grid.enabled");
    this.snapToGrid.checked = Config.get("edit.snap.grid");
    this.enableSnapping.checked = Config.get("object.snapping.enabled");
    this.enableSnappingBackground.checked = Config.get("object.snapping.background");
    // this.embedImages.checked = Config.get("document.EmbedImages");
    this.quickEditting.checked = Config.get("quick.editting");
    this.cutAndPasteAtTheSamePlace.checked = Config.get("edit.cutAndPasteAtTheSamePlace");
    this.undoEnabled.checked = Config.get("view.undo.enabled");
    // this.checkboxScaleImage.checked = Config.get("clipartbrowser.scale");

    var gridSize = Config.get("edit.gridSize");
    if (gridSize == null) {
        Config.set("edit.gridSize", 8);
    }
    this.textboxGridSize.value = Config.get("edit.gridSize");

    this.comboGridStyle.setItems(["Dotted", "Solid"]);
    var gridStyle = Config.get("edit.gridStyle");
    if (gridStyle == null) {
        gridStyle = "Dotted";
        Config.set("edit.gridStyle", gridStyle);
    }
    this.comboGridStyle.selectItem(gridStyle);

    // var w = Config.get("clipartbrowser.scale.width");
    // var h = Config.get("clipartbrowser.scale.height");
    // if (w == null) {
    //     Config.set("clipartbrowser.scale.width", 200);
    // }
    // if (h == null) {
    //     Config.set("clipartbrowser.scale.height", 200);
    // }

    // this.textboxClipartBrowserScaleWidth.value  = Config.get("clipartbrowser.scale.width");
    // this.textboxClipartBrowserScaleHeight.value = Config.get("clipartbrowser.scale.height");

    var level = Config.get("view.undoLevel");
    if (level == null) {
        Config.set("view.undoLevel", 20);
    }
    this.textboxUndoLevel.value = Config.get("view.undoLevel");

    var textScale = Config.get("view.uiTextScale");
    if (textScale == null) {
        Config.set("view.uiTextScale", 100);
    }
    this.textScaleInput.value = Config.get("view.uiTextScale");

    this.useCompactLayout.checked = Config.get("view.useCompactLayout", false);

    var svgurl = Config.get("external.editor.vector.path", "/usr/bin/inkscape");
    var bitmapurl = Config.get("external.editor.bitmap.path", "/usr/bin/gimp");

    this.svgEditorUrl.value = svgurl;
    this.bitmapEditorUrl.value = bitmapurl;

    if (this.checkboxEnableGrid.checked) {
        Dom.removeClass(this.textboxGridSize.parentNode, "Disabled");
        Dom.removeClass(this.gridStyleContainer, "Disabled");
    } else {
        Dom.addClass(this.textboxGridSize.parentNode, "Disabled");
        Dom.addClass(this.gridStyleContainer, "Disabled");
    }

    if (this.undoEnabled.checked) {
        Dom.removeClass(this.textboxUndoLevel.parentNode, "Disabled");
    } else {
        Dom.addClass(this.textboxUndoLevel.parentNode, "Disabled");
    }

    this.enableSnappingBackground.disabled = !this.enableSnapping.checked;
    if (this.enableSnapping.checked) {
        Dom.removeClass(this.enableSnappingBackground.parentNode, "Disabled");
    } else {
        Dom.addClass(this.enableSnappingBackground.parentNode, "Disabled");
    }

    // if (this.checkboxScaleImage.checked) {
    //     Dom.removeClass(this.textboxClipartBrowserScaleWidth.parentNode, "Disabled");
    //     Dom.removeClass(this.textboxClipartBrowserScaleHeight.parentNode, "Disabled");
    // } else {
    //     Dom.addClass(this.textboxClipartBrowserScaleWidth.parentNode, "Disabled");
    //     Dom.addClass(this.textboxClipartBrowserScaleHeight.parentNode, "Disabled");
    // }
    this.initializePreferenceTable();
};

SettingDialog.prototype.initializePreferenceTable = function () {
    this.preferenceTable.column(new DataTable.PlainTextColumn("Preference Name", function (data) {
        return data.name;
    }).width("1*"));
    this.preferenceTable.column(new DataTable.PlainTextColumn("Status", function (data) {
        return data.status;
    }).width("7em"));
    this.preferenceTable.column(new DataTable.PlainTextColumn("Type", function (data) {
        return data.type;
    }).width("7em"));
    this.preferenceTable.column(new DataTable.PlainTextColumn("Value", function (data) {
        return data.value;
    }).width("15em"));

    this.preferenceTable.selector(false);
    var thiz = this;
    window.setTimeout(function () {
        thiz.preferenceTable.setup();
        thiz.preferenceTable.setDefaultSelectionHandler({
            run: function (data) {
                if (data.type == "boolean") {
                    thiz.updateConfigAndInvalidateUI(data.name, !data.value);
                } else {
                    Dialog.prompt(data.name, data.value, "OK", function (value) {
                        data.value = value;
                        var result = value;
                        if (data.type != "string") {
                            result = parseInt(value);
                            if (data.name == "view.undoLevel" || data.name == "edit.gridSize" ) {
                                if (!result || parseInt(result) == 0 ) {
                                    if (data.name == "view.undoLevel") {
                                        result = 10;
                                        thiz.textboxUndoLevel.value = result;
                                    } else if (data.name == "edit.gridSize" ) {
                                        result = 5;
                                        thiz.textboxGridSize.value = result;
                                    }
                                }
                            }
                        } else {
                            if (data.name == "external.editor.bitmap.path")
                            {
                                if (result == "" ){
                                    result = "/usr/bin/gimp";
                                }
                                thiz.bitmapEditorUrl.value = result;
                            }
                            if (data.name == "external.editor.vector.path") {
                                if (result == "" ){
                                    result = "/usr/bin/inkscape";
                                }
                                thiz.svgEditorUrl.value = result;
                            }
                            if (data.name == "edit.gridStyle")
                            {
                               if (result == "") {
                                  result = "Dotted"
                               }
                               thiz.comboGridStyle.selectedItem = result;
                            }
                        }
                        Config.set(data.name, result);
                        thiz.setPreferenceItems();
                    }, "Cancel");
                }
            }
        });
        thiz.setPreferenceItems();
    }, 200);
};

SettingDialog.prototype.setPreferenceItems = function () {
    var items = [];
    Config._load();
    var query = this.preferenceNameInput.value;
    for (var configName in Config.data) {
        if (configName.indexOf(query) < 0) continue;
        var value = Config.data[configName];
        if (typeof(value)=="object") continue;
        items.push({
            name: configName,
            status: "user set",
            value: value,
            type: typeof(value)
        });
    };
    this.preferenceTable.setItems(items);
};

SettingDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CLOSE
    ];
};
