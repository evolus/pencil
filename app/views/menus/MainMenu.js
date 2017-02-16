function MainMenu (anchorView) {
    Menu.call(this);
    this.setup();
    this.itemRecentFile;
    this.anchorView = anchorView;
}

__extend(Menu, MainMenu);

MainMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "menus/Menu.xhtml";
};
MainMenu.prototype.shouldCloseOnBlur = function(event) {
    var thiz = this;

    var found = Dom.findUpward(event.target, function (node) {
        return node == thiz.anchorView;
    });

    return !found;
};

MainMenu.prototype.generateRecentDocumentMenu = function () {
    var thiz = this;

    var createRecentSubMenuElement = function(fileName) {
        var index = fileName.indexOf("/");
        var name = fileName.substring(index);
        var key = "open" + name + "Document" ;
        var element = UICommandManager.register({
            key: key,
            label: name,
            run: function () {
                function handler() {
                    Pencil.documentHandler.loadDocument(name);
                }
                if (Pencil.controller.modified) {
                    Pencil.documentHandler.confirmAndSaveDocument(handler);
                    return;
                }
                handler();
            }
        });
        var setElement = UICommandManager.getCommand(key);
        return setElement;
    }

    var files = Config.get("recent-documents");
    if (files) {
        var elements = [];
        for (var i = 0; i < files.length; i++) {
            elements.push(createRecentSubMenuElement(files[i]));
        }
        this.itemRecentFile = elements;
    }

    var checkRecentButton = false;
    if(thiz.itemRecentFile && thiz.itemRecentFile.length > 0) {
        checkRecentButton = true;
    }

    return [{
        key: "RecentFileCommand",
        label: "Recent files ",
        isEnabled: function () { return checkRecentButton },
        type: "SubMenu",
        subItems: thiz.itemRecentFile,
    }];
};

MainMenu.prototype.setup = function () {
    var thiz = this;

    this.register(UICommandManager.getCommand("newDocumentCommand"));
    this.register(UICommandManager.getCommand("openDocumentCommand"));
    this.register(UICommandManager.getCommand("saveDocumentCommand"));
    this.register(UICommandManager.getCommand("saveAsDocumentCommand"));
    this.register(UICommandManager.getCommand("exportDocumentCommand"));
    this.register(UICommandManager.getCommand("printDocumentCommand"));
    this.register(UICommandManager.getCommand("closeDocumentCommand"));
    this.separator();
    this.register(this.generateRecentDocumentMenu);
    this.separator();
    this.register({
        key: "settingAllCommand",
        label: "Settings...",
        icon: "settings",
        isValid: function () { return true; },
        run: function () {
            (new SettingDialog()).open();
        }
    });

    var developerToolSubItems = [];
    developerToolSubItems.push({
        key: "manageCollections",
        label: "Manage Collections...",
        run: function () {
            new CollectionManagementDialog(Pencil.collectionPane).open();
        }
    });
    developerToolSubItems.push({
        key: "manageExportTemplate",
        label: "Manage Export Template...",
        run: function () {
            var templateDialog = new TemplateManagementDialog();
            templateDialog.open();
        }
    });
    developerToolSubItems.push({
        key: "manageFontCommand",
        label: "Manage Fonts...",
        run: function () {
            (new FontManagementDialog()).open();
        }
    });

    developerToolSubItems.push(Menu.SEPARATOR);
    developerToolSubItems.push({
        key: "stencilGenerator",
        label: "Stencil Generator...",
        run: function () {
            var dialog = new StencilGeneratorDialog();
            dialog.open();
        }
    });
    developerToolSubItems.push({
        key: "nPatchGenerator",
        label: "N-Patch Script Generator...",
        run: function () {
            var patchDialog = new NPatchDialog();
            patchDialog.open();
        }
    });
    developerToolSubItems.push({
        key: "exportAsLayout",
        label: "Export as Layout...",
        isAvailable: function () { return false; },
        run: function () {

        }
    });
    developerToolSubItems.push(Menu.SEPARATOR);

    developerToolSubItems.push({
        key: "loadDeveloperStencilDirectory",
        label: "Load Developer Stencil Directory...",
        run: function () {
            CollectionManager.selectDeveloperStencilDir();
        }
    });
    developerToolSubItems.push({
        key: "unloadDeveloperStencil",
        label: "Unload Developer Stencil...",
        run: function () {
            CollectionManager.unselectDeveloperStencilDir();
        }
    });
    developerToolSubItems.push(Menu.SEPARATOR);
    developerToolSubItems.push({
        key: "openDeveloperTools",
        label: "Open Developer Tools",
        shortcut: "Ctrl+Alt+Shift+P",
        run: function () {
            Pencil.app.mainWindow.openDevTools();
        }
    });

    this.register({
        key: "toolCommand",
        label: "Tools",
        type: "SubMenu",
        subItems: developerToolSubItems
    });
    this.separator();
    this.register({
        key: "aboutDialogCommand",
        label: "About...",
        isValid: function () { return true; },
        run: function () {
            var dialog = new AboutDialog();
            dialog.open();
        }
    });
    this.separator();
    this.register({
        key: "exitApplicationCommand",
        label: "Exit",
        isValid: function () { return true; },
        run: function () {
            let remote = require("electron").remote;
            let currentWindow = remote.getCurrentWindow();
            currentWindow.close();
        }
    });
}
