function ExportDialog () {
    Dialog.call(this);
    this.title = "Export Document";

    this.exporterCombo.renderer = function (exporter) {
        return exporter.name;
    };

    this.exporterCombo.setItems(Pencil.documentExporters);

    this.exporterCombo.addEventListener("p:ItemSelected", function () {
        this.invalidateTemplates();
    }.bind(this), false);

    this.templateCombo.renderer = function (template) {
        return template.name;
    };

    this.invalidateTemplates();

}
__extend(Dialog, ExportDialog);


ExportDialog.prototype.invalidateTemplates = function () {
    var exporter = this.exporterCombo.getSelectedItem();
    console.log("Exporter " + exporter.name, exporter);
    if (exporter.supportTemplating()) {
        this.templateCombo.setItems(exporter.getTemplates());
        this.templateCombo.setDisabled(false);
    } else {
        this.templateCombo.setItems([]);
        this.templateCombo.setDisabled(true);
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

    this.pageTree.setCheckedItems(Pencil.controller.doc.pages);
    console.log("Tree setup done");
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
