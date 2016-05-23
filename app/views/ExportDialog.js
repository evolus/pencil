function ExportDialog () {
    Dialog.call(this);
    this.title = "Export Document";

    function sameIdComparer(a, b) {
        if (!a) return !b;
        if (!b) return false;
        return a.id == b.id;
    };

    this.exporterCombo.renderer = function (exporter) {
        return exporter.name;
    };
    this.exporterCombo.comparer = sameIdComparer;

    this.exporterCombo.setItems(Pencil.documentExporters);

    this.exporterCombo.addEventListener("p:ItemSelected", function () {
        this.invalidateUIByExporter();
    }.bind(this), false);

    this.templateCombo.renderer = function (template) {
        return template.name;
    };
    this.templateCombo.addEventListener("p:ItemSelected", function () {
        this.invalidateUIByTemplate();
    }.bind(this), false);

    this.templateCombo.comparer = sameIdComparer;


    this.invalidateUIByExporter();

}
__extend(Dialog, ExportDialog);


ExportDialog.prototype.invalidateUIByExporter = function () {
    var exporter = this.exporterCombo.getSelectedItem();
    if (exporter.supportTemplating()) {
        this.templateCombo.setItems(exporter.getTemplates());
        this.templateCombo.setDisabled(false);
    } else {
        this.templateCombo.setItems([]);
        this.templateCombo.selectedItem = null;
        this.templateCombo.setDisabled(true);
    }

    if (exporter.getWarnings && exporter.getWarnings()) {
        this.warningContent.innerHTML = Dom.htmlEncode(exporter.getWarnings());
        this.warningBox.removeAttribute("disabled");
    } else {
        this.warningBox.setAttribute("disabled", "true");
    }

    this.invalidateUIByTemplate();
};
ExportDialog.prototype.invalidateUIByTemplate = function () {
    var template = this.templateCombo.getSelectedItem();
    Dom.empty(this.optionEditorPane);
    Dom.toggleClass(this.optionPane, "NoExtraOptions", !template || !template.editableProperties || template.editableProperties.length == 0);
    this.propertyEditors = {};
    if (!template) return;
    for(var i = 0; i < template.editableProperties.length; i++) {
        var property = template.editableProperties[i];
        var propName = property.displayName;
        var editorWrapper = Dom.newDOMElement({
            _name: "hbox",
            "class": "Wrapper",
            _children: [
                {
                    _name: "div",
                    "class": "Label Property",
                    _text: propName + ":"
                }
            ]
        });
        var editor = TypeEditorRegistry.getTypeEditor(property.type);
        var constructeur = window[editor];
        var editorWidget = new constructeur();

        editorWrapper.appendChild(editorWidget.node());
        editorWidget.setAttribute("flex", "1");
        if (editorWidget.setTypeMeta) {
            editorWidget.setTypeMeta(property.meta);
        }
        editorWidget.setValue(property.value);
        editorWidget._property = property;
        this.propertyEditors[property.name] = editorWidget;

        editorWrapper._property = property;
        this.optionEditorPane.appendChild(editorWrapper);
    }
};
ExportDialog.prototype.setup = function (options) {
    var source = function (page, callback) {
        if (!page) {
            callback(Pencil.controller.getRootPages());
        } else {
            callback(page.children);
        }
    };
    var renderer = function (page) {
        return page.name;
    };

    this.pageTree.setup(source, renderer, {
        expandedAll: true,
        checkable: true,
        propagateCheckActionDownwards: true,
        propagateUncheckActionDownwards: true,
        isItemSelectable: function () { return false; },
        isItemInitiallyChecked: function () { return false; }
    });

    var options = options || {};
    if (options.lastParams) {
        this.pageTree.setCheckedItems(options.lastParams.pages);
        this.exporterCombo.selectItem({id: options.lastParams.exporterId}, false, true);
        this.invalidateUIByExporter();
        this.templateCombo.selectItem({id: options.lastParams.templateId}, false, true);
        this.invalidateUIByTemplate();
        if (options.lastParams.options) {
            this.setOptionValues(options.lastParams.options);
        }
    } else {
        this.pageTree.setCheckedItems(Pencil.controller.doc.pages);
    }
};
ExportDialog.prototype.setOptionValues = function (valueMap) {
    var template = this.templateCombo.getSelectedItem();
    if (!template) return;

    for (var name in valueMap) {
        var editor = this.propertyEditors[name];
        if (!editor) continue;

        var property = template.findEditableProperty(name);
        if (!property) return;

        var valueLiteral = valueMap[name];
        var value = property.type.fromString(valueLiteral);
        editor.setValue(value);
    }
};


ExportDialog.prototype.getDialogActions = function () {
    return [
        {   type: "cancel", title: "Cancel",
            isCloseHandler: true,
            run: function () {
                return true;
            }
        },
        {   type: "accept", title: "Export",
            run: function () {
                var exporter = this.exporterCombo.getSelectedItem();
                var template = this.templateCombo.getSelectedItem();

                var result = {
                    pages: this.pageTree.getCheckedItemsSync(),
                    exporterId: exporter.id,
                    templateId: template ? template.id : null,
                    options: {}
                };

                if (this.propertyEditors) {
                    for (var name in this.propertyEditors) {
                        var value = this.propertyEditors[name].getValue();
                        if (value) result.options[name] = value.toString();
                    }
                }

                if (exporter.getOutputType() != BaseExporter.OUTPUT_TYPE_NONE) {
                    var isFile = (exporter.getOutputType() == BaseExporter.OUTPUT_TYPE_FILE);

                    var dialogOptions = {
                        title: "Select output " + (isFile ? "file" : "folder"),
                        defaultPath: os.homedir(),
                        properties: [isFile ? "openFile" : "openDirectory"]
                    };

                    if (isFile) {
                        var filters = [];
                        exporter.getOutputFileExtensions().forEach(function (filter) {
                            filters.push({
                                name: filter.title || filter.ext,
                                extensions: [filter.ext]
                            });
                        });

                        dialogOptions.filters = filters;
                    }

                    dialog.showOpenDialog(dialogOptions, function (filenames) {
                        if (!filenames || filenames.length <= 0) return;
                        result.targetPath = filenames[0];

                        this.close(result);

                    }.bind(this));
                } else {
                    this.close(result);
                }



                return false;
            }
        }
    ]
};
