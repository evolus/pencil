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

    if (Config.get("dev.enabled", null) == null) Config.set("dev.enabled", false);

    var devEnable = Config.get("dev.enabled", false);

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

    var toolSubItems = [];
    toolSubItems.push({
        key: "manageCollections",
        label: "Manage Collections...",
        run: function () {
            new CollectionManagementDialog(Pencil.collectionPane).open();
        }
    });
    toolSubItems.push({
        key: "manageExportTemplate",
        label: "Manage Export Template...",
        run: function () {
            var templateDialog = new TemplateManagementDialog();
            templateDialog.open();
        }
    });
    toolSubItems.push({
        key: "manageFontCommand",
        label: "Manage Fonts...",
        run: function () {
            (new FontManagementDialog()).open();
        }
    });

    toolSubItems.push(Menu.SEPARATOR);

    var developerToolSubItems = [];
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
    developerToolSubItems.push({
        key: "exportAsLayout",
        label: "Export as Collection Layout...",
        isAvailable: function () { return Pencil.activeCanvas; },
        run: function () {
            Pencil.controller.exportAsLayout();
        }
    });
    developerToolSubItems.push(Menu.SEPARATOR);

    developerToolSubItems.push(UICommandManager.register({
        key: "configureStencilCollection",
        getLabel: function () {
            return StencilCollectionBuilder.isDocumentConfiguredAsStencilCollection() ?
                    "Configure Stencil Collection..." : "Configure as Stencil Collection...";
        },
        isAvailable: function () { return Pencil.controller && Pencil.controller.doc; },
        run: function () {
            new StencilCollectionBuilder(Pencil.controller).configure();
        }
    }));
    developerToolSubItems.push(UICommandManager.register({
        key: "unconfigureStencilCollection",
        label: "Unconfigure as Stencil Collection...",
        isAvailable: function () { return StencilCollectionBuilder.isDocumentConfiguredAsStencilCollection(); },
        run: function () {
            new StencilCollectionBuilder(Pencil.controller).removeCurrentDocumentOptions();
        }
    }));

    developerToolSubItems.push(UICommandManager.register({
        key: "buildStencilCollection",
        label: "Build Stencil Collection...",
        shortcut: "Ctrl+B",
        isAvailable: function () { return Pencil.controller && Pencil.controller.doc; },
        run: function () {
            new StencilCollectionBuilder(Pencil.controller).build();
        }
    }));
    developerToolSubItems.push(Menu.SEPARATOR);

    developerToolSubItems.push({
        key: "copyAsShortcut",
        label: "Generate Shortcut XML...",
        isAvailable: function () {
            return Pencil.activeCanvas && Pencil.activeCanvas.currentController
                    && Pencil.activeCanvas.currentController.generateShortcutXML && devEnable;
        },
        run: function () {
            Pencil.activeCanvas.currentController.generateShortcutXML();
            //clipboard.writeText(xml);
        }
    });

    developerToolSubItems.push(Menu.SEPARATOR);
    developerToolSubItems.push(UICommandManager.register({
        key: "openDeveloperTools",
        label: "Open Developer Tools",
        shortcut: "Ctrl+Alt+Shift+P",
        run: function () {
            Pencil.app.mainWindow.openDevTools();
        }
    }));

    toolSubItems.push({
        key: "devToolCommand",
        label: "Developer Tools",
        type: "SubMenu",
        subItems: developerToolSubItems
    });

    this.register({
        key: "toolCommand",
        label: "Tools",
        type: "SubMenu",
        subItems: toolSubItems
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
    this.register(UICommandManager.register({
        key: "exitApplicationCommand",
        label: "Exit",
        isValid: function () { return true; },
        shortcut: "Ctrl+Q",
        run: function () {
            let remote = require("electron").remote;
            let currentWindow = remote.getCurrentWindow();
            currentWindow.close();
        }
    }));
}
