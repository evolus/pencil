function TemplateManagermentDialog() {
    Dialog.call(this);
    this.title = "Export Template Managerment";

    this.templateTypeSelector.renderer = function (items) {
        // if (!pageSize.value) return pageSize.displayName;
        return items.displayName;
    }
    var thiz = this;
    this.templates;
    this.templateTypeSelector.addEventListener("p:ItemSelected", function (event) {
        var templateType = thiz.templateTypeSelector.getSelectedItem();
        thiz.loadTemplates(templateType.value);
    }, false);
}

__extend(Dialog, TemplateManagermentDialog);

TemplateManagermentDialog.prototype.loadTemplates = function (type) {
    this.templates = ExportTemplateManager.getTemplatesForType(type);
    console.log(this.templates);
    for(var i = 0; i < this.templates.length; i++) {
        var template = this.templates[i];
        var item = Dom.createElement({
            _name : "tr",
            children: [
                {
                    _name : "td",
                    _text : template.name
                },
                {
                    _name : "td",
                    _text : template.description
                },
                {
                    _name : "td",
                    _text : template.author
                }
            ]
        });
        this.templateInfo.appendChild(item);
    }
}

TemplateManagermentDialog.prototype.setup = function () {
    var templateType = ExportTemplateManager.SUPPORTED_TYPES;

    var templateTypeName = ExportTemplateManager.SUPPORTED_TYPES_NAMES;
    console.log(templateTypeName);
    var templateItems = [];
    for (var i = 0; i <  templateType.length; i++) {
        console.log(templateType[i]);
        var name = templateTypeName[templateType[i]];

        templateItems.push({
            displayName: name,
            value: templateType[i]
        });
        console.log(templateItems);
    }
    this.templateTypeSelector.setItems(templateItems);
}

TemplateManagermentDialog.prototype.getDialogActions = function () {
    return [
        {
            type: "cancel", title: "Install new template",
            isCloseHandler: true,
            run: function () { return true; }
        },
        {
            type: "cancel", title: "Uninstall template",
            isCloseHandler: true,
            run: function () { return true; }
        },
        {
            type: "cancel", title: "Cancel",
            isCloseHandler: true,
            run: function () { return true; }
        }
    ]
}
