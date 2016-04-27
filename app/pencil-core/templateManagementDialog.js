var TemplateManagementDialog = {};

TemplateManagementDialog.init = function () {
    TemplateManagementDialog.manager = window.opener.ExportTemplateManager;
    Dom.populate(TemplateManagementDialog, ["templateTypeSelector", "templateListContent"]);
    TemplateManagementDialog.uninstallButton = document.documentElement.getButton("extra1");

    TemplateManagementDialog.loadTemplatesForSelectedType();
    TemplateManagementDialog.handleTemplateSelectionChange();
};
TemplateManagementDialog.loadTemplatesForSelectedType = function () {
    var templates = TemplateManagementDialog.manager.getTemplatesForType(TemplateManagementDialog.templateTypeSelector.value);
    var rows = [];
    for (var i = 0; i < templates.length; i ++) {
        var template = templates[i];
        var row = {
            _name: "treeitem",
            _uri: PencilNamespaces.xul,
            "template-id": template.id,
            _children: [
                {
                    _name: "treerow",
                    _uri: PencilNamespaces.xul,
                    _children: [
                        {
                            _name: "treecell",
                            _uri: PencilNamespaces.xul,
                            properties: "name",
                            label: template.name
                        },
                        {
                            _name: "treecell",
                            _uri: PencilNamespaces.xul,
                            label: template.description
                        },
                        {
                            _name: "treecell",
                            _uri: PencilNamespaces.xul,
                            label: template.author
                        }
                    ]
                }
            ]
        };
        rows.push(row);
    }

    Dom.empty(TemplateManagementDialog.templateListContent);
    TemplateManagementDialog.templateListContent.appendChild(Dom.newDOMFragment(rows));
};
TemplateManagementDialog.getSelectedTemplates = function () {
    var tree = TemplateManagementDialog.templateListContent.parentNode;
    var selection = tree.view.selection;
    var count = selection.getRangeCount();

    var start = {};
    var end = {};

    var templates = [];

    for (var i = 0; i < count; i ++){
        selection.getRangeAt(i, start, end);
        for (var v = start.value; v <= end.value; v ++){
            var item = tree.contentView.getItemAtIndex(v);
            var id = item.getAttribute("template-id");
            templates.push(TemplateManagementDialog.manager.getTemplateById(id));
        }
    }

    return templates;
};
TemplateManagementDialog.handleTemplateSelectionChange = function () {
    var templates = TemplateManagementDialog.getSelectedTemplates();

    TemplateManagementDialog.uninstallButton.disabled = !templates || templates.length == 0;
};
TemplateManagementDialog.installNewTemplate = function () {
    TemplateManagementDialog.manager.installNewTemplate(TemplateManagementDialog.templateTypeSelector.value);
    TemplateManagementDialog.loadTemplatesForSelectedType();
};
TemplateManagementDialog.uninstallSelectedTemplates = function () {
    if (!Util.confirm(Util.getMessage("are.you.sure.you.want.to.uninstall.selected.templates"),
                        Util.getMessage("uninstalling.operations.cannot.be.undone"),
                        Util.getMessage("button.uninstall.label"), Util.getMessage("button.cancel.label"))) return;
    var templates = TemplateManagementDialog.getSelectedTemplates();
    for (var i = 0; i < templates.length; i ++) {
        TemplateManagementDialog.manager.uninstallTemplate(templates[i]);
    }
    TemplateManagementDialog.loadTemplatesForSelectedType();
};
window.addEventListener("load", TemplateManagementDialog.init, false);
