function TemplateManagementDialog() {
    Dialog.call(this);
    this.title = "Export Template Management";

    this.templateTypeSelector.renderer = function (items) {
        return items.displayName;
    }
    var thiz = this;
    this.templates;
    this.templateTypeSelector.addEventListener("p:ItemSelected", function (event) {
        thiz.invalidateTemplateList();
    }, false);
}

__extend(Dialog, TemplateManagementDialog);

TemplateManagementDialog.prototype.invalidateTemplateList = function () {
    var templateType = this.templateTypeSelector.getSelectedItem();
    var type = templateType.value;

    this.activedType = type;
    this.templates = ExportTemplateManager.getTemplatesForType(type);
    var items = [];
    for(var i = 0; i < this.templates.length; i++) {
        var template = this.templates[i];
        var item = {
            templateName: template.name,
            description: template.description,
            author: template.author,
            template: template
        };
        items.push(item);
    }
    this.templateTable.setItems(items);
}

TemplateManagementDialog.prototype.initializeTemplateTable = function () {
    this.templateTable.column(new DataTable.PlainTextColumn("Template", function (data) {
        return data.templateName;
    }).width("1*"));
    this.templateTable.column(new DataTable.PlainTextColumn("Information", function (data) {
        return data.description;
    }).width("1*"));
    this.templateTable.column(new DataTable.PlainTextColumn("Author", function (data) {
        return data.author;
    }).width("12em"));
    var actions = [{
             id: "remove", type: "delete", title: "Uninstall", icon: "delete",
             isApplicable: function(item) {
                 return item.template.userDefine ? true : false;
             },
             handler: function (item) {
                Dialog.confirm(
                    "Are you sure you really want to uninstall this template?", null,
                    "Uninstall", function () {
                        ExportTemplateManager.uninstallTemplate(item.template);
                        thiz.invalidateTemplateList()
                    },
                    "Cancel"
                )
             }
     }];
    this.templateTable.column(new DataTable.ActionColumn(actions).width("7em"));
    this.templateTable.selector(false);

    var thiz = this;
    window.setTimeout(function () {
        this.templateTable.setup();
        this.templateTable.setDefaultSelectionHandler({
            run: function (data) {

            }
        });
        this.templateTable.invalidateSizing();
        this.invalidateTemplateList();
    }.bind(this), 200);
}
TemplateManagementDialog.prototype.setup = function () {
    var templateType = ExportTemplateManager.SUPPORTED_TYPES;
    var templateTypeName = ExportTemplateManager.SUPPORTED_TYPES_NAMES;
    var templateItems = [];
    for (var i = 0; i <  templateType.length; i++) {
        var name = templateTypeName[templateType[i]];
        templateItems.push({
            displayName: name,
            value: templateType[i]
        });
    }
    this.templateTypeSelector.setItems(templateItems);
    this.initializeTemplateTable();
}

TemplateManagementDialog.prototype.getDialogActions = function () {
    var thiz = this
    return [
        {
            type: "extra", title: "Install new template...",
            isCloseHandler: true,
            run: function () {
                var onDone = function () {
                    thiz.invalidateTemplateList();
                }
                ExportTemplateManager.installNewTemplate(thiz.templateTypeSelector.getSelectedItem().value, onDone);
                return false;
            }
        },
        {
            type: "cancel", title: "Close",
            isCloseHandler: true,
            run: function () { return true; }
        }
    ]
}
