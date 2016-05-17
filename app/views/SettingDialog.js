function SettingDialog() {
    Dialog.call(this);
    this.title = "Setting Dialog";

    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("configName");
        });
        if (!node) return;
        var configName = node.getAttribute("configName");

        if (node.type == "checkbox") {
            Config.set(configName, node.checked);
        }

    }, this.settingTabPane);

    this.bind("change", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("configName");
        });
        if (!node) return;
        var configName = node.getAttribute("configName");

        if (node.type == "number" || node.type == "text") {
            Config.set(configName, node.value);
        }

    }, this.settingTabPane);

    this.bind("click", function (event) {
        var checked = this.checkboxEnableGrid.checked;
        if (checked) {
            Dom.removeClass(this.textboxGridSize.parentNode, "Disabled");
        } else {
            Dom.addClass(this.textboxGridSize.parentNode, "Disabled");
        }
    }, this.checkboxEnableGrid);

    this.bind("click", function (event) {
        var checked = this.enableSnapping.checked;
        this.enableSnappingBackground.disabled = !this.enableSnapping.checked;
        if (checked) {
            Dom.removeClass(this.enableSnappingBackground.parentNode, "Disabled");
        } else {
            Dom.addClass(this.enableSnappingBackground.parentNode, "Disabled");
        }
    }, this.enableSnapping);

    this.bind("click", function (event) {
        var checked = this.undoEnabled.checked;
        if (checked) {
            Dom.removeClass(this.textboxUndoLevel.parentNode, "Disabled");
        } else {
            Dom.addClass(this.textboxUndoLevel.parentNode, "Disabled");
        }
    }, this.undoEnabled);

    this.bind("click", function (event) {
        var checked = this.checkboxScaleImage.checked;
        if (checked) {
            Dom.removeClass(this.textboxClipartBrowserScaleWidth.parentNode, "Disabled");
            Dom.removeClass(this.textboxClipartBrowserScaleHeight.parentNode, "Disabled");
        } else {
            Dom.addClass(this.textboxClipartBrowserScaleWidth.parentNode, "Disabled");
            Dom.addClass(this.textboxClipartBrowserScaleHeight.parentNode, "Disabled");
        }
    }, this.checkboxScaleImage);
}
__extend(Dialog, SettingDialog);

SettingDialog.prototype.setup = function () {
    this.checkboxEnableGrid.checked = Config.get("pencil.config.grid.enabled");
    this.snapToGrid.checked = Config.get("pencil.config.edit.snap.grid");
    this.enableSnapping.checked = Config.get("pencil.config.object.snapping.enabled");
    this.enableSnappingBackground.checked = Config.get("pencil.config.object.snapping.background");
    this.embedImages.checked = Config.get("pencil.config.document.EmbedImages");
    this.quickEditting.checked = Config.get("pencil.config.quick.editting");
    this.cutAndPasteAtTheSamePlace.checked = Config.get("pencil.config.edit.cutAndPasteAtTheSamePlace");
    this.undoEnabled.checked = Config.get("pencil.config.view.undo.enabled");
    this.checkboxScaleImage.checked = Config.get("pencil.config.clipartbrowser.scale");

    var gridSize = Config.get("pencil.config.edit.gridSize");
    if (gridSize == null) {
        Config.set("pencil.config.edit.gridSize", 8);
    }
    this.textboxGridSize.value = Config.get("pencil.config.edit.gridSize");

    var w = Config.get("clipartbrowser.scale.width");
    var h = Config.get("clipartbrowser.scale.height");
    if (w == null) {
        Config.set("clipartbrowser.scale.width", 200);
    }
    if (h == null) {
        Config.set("clipartbrowser.scale.height", 200);
    }

    this.textboxClipartBrowserScaleWidth.value  = Config.get("clipartbrowser.scale.width");
    this.textboxClipartBrowserScaleHeight.value = Config.get("clipartbrowser.scale.height");

    var level = Config.get("pencil.config.view.undoLevel");
    if (level == null) {
        Config.set("pencil.config.view.undoLevel", 20);
    }
    this.textboxUndoLevel.value = Config.get("pencil.config.view.undoLevel");

    var svgurl = Config.get("external.editor.vector.path", "/usr/bin/inkscape");
    var bitmapurl = Config.get("external.editor.bitmap.path", "/usr/bin/gimp");

    this.svgEditorUrl.value = svgurl;
    this.bitmapEditorUrl.value = bitmapurl;

    if (this.checkboxEnableGrid.checked) {
        Dom.removeClass(this.textboxGridSize.parentNode, "Disabled");
    } else {
        Dom.addClass(this.textboxGridSize.parentNode, "Disabled");
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

    if (this.checkboxScaleImage.checked) {
        Dom.removeClass(this.textboxClipartBrowserScaleWidth.parentNode, "Disabled");
        Dom.removeClass(this.textboxClipartBrowserScaleHeight.parentNode, "Disabled");
    } else {
        Dom.addClass(this.textboxClipartBrowserScaleWidth.parentNode, "Disabled");
        Dom.addClass(this.textboxClipartBrowserScaleHeight.parentNode, "Disabled");
    }
    this.initializePreferenceTable();
};

SettingDialog.prototype.initializePreferenceTable = function () {
    console.log("initializePreferenceTable");
    // this.preferenceTable.column(new DataTable.PlainTextColumn("Preference Name", function (data) {
    //     return data.name;
    // }).width("1*"));
    // this.preferenceTable.column(new DataTable.PlainTextColumn("Status", function (data) {
    //     return data.status;
    // }).width("100"));
    // this.preferenceTable.column(new DataTable.PlainTextColumn("Type", function (data) {
    //     return data.type;
    // }).width("100"));
    // this.preferenceTable.column(new DataTable.PlainTextColumn("Value", function (data) {
    //     return data.value;
    // }).width("150"));
    this.preferenceTable.column(new DataTable.PlainTextColumn("Preference Name", function (data) {
        return (data.name ? data.name || "" : "");
    }).width("200px"));
    this.preferenceTable.selector(false);
    console.log("this.preferenceTable: ", this.preferenceTable);
    var thiz = this;
    window.setTimeout(function () {
        thiz.preferenceTable.setup();
        thiz.setPreferenceItems();
    }, 200);
    // this.setPreferenceItems();
};

SettingDialog.prototype.setPreferenceItems = function () {
    var items = [];
    for (var i = 0 ; i < 10; i++) {
        items.push({
            name: "config" + i,
            status: "user set",
            type: "string",
            value: "test"
        });
    }

    this.preferenceTable.setItems(items);
};

SettingDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CLOSE
    ];
};
