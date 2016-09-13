function ExportDialog () {
    Dialog.call(this);
    this.title = "Export Document";
    this.subTitle = "Select source pages and target output format with options";

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
        var templates = exporter.getTemplates();
        console.log(templates);
        this.templateCombo.setItems(templates);
        this.templateCombo.setDisabled(false);

        var defaultTemplate = null;
        for (var template of templates) {
            if (template.systemDefault) {
                defaultTemplate = template;
                break;
            }
        }

        if (defaultTemplate) this.templateCombo.selectItem(defaultTemplate);
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
        return Dom.htmlEncode(page.name);
    };

    this.pageTree.setup(source, renderer, {
        expandedAll: true,
        checkable: true,
        propagateCheckActionDownwards: true,
        propagateUncheckActionDownwards: true,
        isItemSelectable: function () { return false; },
        isItemInitiallyChecked: function () { return false; }
    });

    if (options.forcedExporterId) {
        this.exporterCombo.selectItem({id: options.forcedExporterId}, false, true);
        this.exporterCombo.setDisabled(true);
        this.invalidateUIByExporter();
        Dom.addClass(this.optionPane, "ForcedExporter");

        var exporter = this.exporterCombo.getSelectedItem();
        if (exporter) this.title = exporter.name;
    }

    var options = options || {};
    if (options.lastParams) {
        this.lastParams = options.lastParams;

        this.pageTree.setCheckedItems(options.lastParams.pages);
        if (!options.forcedExporterId) {
            this.exporterCombo.selectItem({id: options.lastParams.exporterId}, false, true);
            this.invalidateUIByExporter();
        }
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
    var thiz = this;
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

                result.options.copyBGLinks = thiz.copyBgLinks.checked;

                if (this.propertyEditors) {
                    for (var name in this.propertyEditors) {
                        var value = this.propertyEditors[name].getValue();
                        if (value) result.options[name] = value.toString();
                    }
                }

                if (exporter.getOutputType() != BaseExporter.OUTPUT_TYPE_NONE) {
                    var isFile = (exporter.getOutputType() == BaseExporter.OUTPUT_TYPE_FILE);

                    var dialogOptions = {
                        title: "Select output " + (isFile ? "file" : "folder")
                    };

                    if (this.lastParams && this.lastParams.targetPath && this.lastParams.exporterId == result.exporterId) {
                        dialogOptions.defaultPath = this.lastParams.targetPath;
                    }

                    if (isFile) {
                        var filters = [];
                        var firstExt = null;
                        exporter.getOutputFileExtensions().forEach(function (filter) {
                            if (!firstExt) firstExt = filter.ext;
                            filters.push({
                                name: filter.title || filter.ext,
                                extensions: [filter.ext]
                            });
                        });

                        if (!dialogOptions.defaultPath) {
                            if (Pencil.controller.documentPath) {
                                dialogOptions.defaultPath = path.join(path.dirname(Pencil.controller.documentPath),
                                                                path.basename(Pencil.controller.documentPath, path.extname(Pencil.controller.documentPath)) + "." + firstExt);
                            } else {
                                dialogOptions.defaultPath = path.join(os.homedir(), "Output." + firstExt);
                            }
                        }

                        dialogOptions.filters = filters;
                        console.log("dialogOptions", dialogOptions);
                        dialog.showSaveDialog(dialogOptions, function (filename) {
                            if (!filename) return;
                            result.targetPath = filename;

                            this.close(result);

                        }.bind(this));
                    } else {
                        dialogOptions.properties = ["openDirectory"];

                        if (!dialogOptions.defaultPath) {
                            if (Pencil.controller.documentPath) {
                                dialogOptions.defaultPath = path.dirname(Pencil.controller.documentPath);
                            } else {
                                dialogOptions.defaultPath = os.homedir();
                            }
                        }

                        dialog.showOpenDialog(dialogOptions, function (filenames) {
                            if (!filenames || filenames.length <= 0) return;
                            result.targetPath = filenames[0];

                            this.close(result);

                        }.bind(this));
                    }

                } else {
                    this.close(result);
                }



                return false;
            }
        }
    ]
};
