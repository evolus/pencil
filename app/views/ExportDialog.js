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
                dialog.showOpenDialog({
                    title: "Select output directory",
                    defaultPath: os.homedir(),
                    properties: ["openDirectory"]

                }, function (filenames) {
                    if (!filenames || filenames.length <= 0) return;
                    this.close({
                        pages: this.pageTree.getCheckedItemsSync(),
                        exporterId: this.exporterCombo.getSelectedItem().id,
                        templateId: this.templateCombo.getSelectedItem().id,
                        options: {},
                        targetPath: filenames[0]
                    })
                }.bind(this));


                return false;
            }
        }
    ]
};
