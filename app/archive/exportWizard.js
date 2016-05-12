var ExportWizard = {
    get Pencil() {
        return window.opener.Pencil;
    }
};

ExportWizard.setup = function () {
    if (ExportWizard._setupFormatPageDone) return;

    ExportWizard.dialogData = window.arguments[0];
    var lastSelection = ExportWizard.dialogData.lastSelection ? ExportWizard.dialogData.lastSelection : {};

    ExportWizard.exporterRadioGroup = document.getElementById("exporterRadioGroup");
    ExportWizard.pageSelectionGroup = document.getElementById("pageSelectionGroup");
    ExportWizard.pageList = document.getElementById("pageList");
    ExportWizard.templateMenu = document.getElementById("templateMenu");
    ExportWizard.templateDescription = document.getElementById("templateDescription");
    ExportWizard.copyBGLinkCheckbox = document.getElementById("copyBGLinkCheckbox");
    ExportWizard.targetFilePathText = document.getElementById("targetFilePathText");
    ExportWizard.browseButton = document.getElementById("browseButton");



    // Setup exporters
    var exporters = ExportWizard.Pencil.documentExporters;
    Dom.empty(ExportWizard.exporterRadioGroup);

    var selectedExporterRadioItem = null;
    
    var selectedExporter = null
    if (ExportWizard.dialogData.forcedExporterId) {
        selectedExporter = ExportWizard.Pencil.getDocumentExporterById(ExportWizard.dialogData.forcedExporterId);
    } else if (lastSelection.exporterId) {
        selectedExporter = ExportWizard.Pencil.getDocumentExporterById(lastSelection.exporterId);
    }
    
    if (!selectedExporter) selectedExporter = ExportWizard.Pencil.defaultDocumentExporter;

    for (var i = 0; i < exporters.length; i ++) {
        var exporter = exporters[i];
        var radio = document.createElementNS(PencilNamespaces.xul, "radio");
        ExportWizard.exporterRadioGroup.appendChild(radio);

        radio.setAttribute("label", exporter.name);
        radio.setAttribute("value", exporter.id);

        radio._exporter = exporter;

        if (exporter.invalid) {
            radio.setAttribute("disabled", true);
        }

        if (exporter == selectedExporter) {
            ExportWizard.exporterRadioGroup.selectedItem = radio;
        }
    }
    ExportWizard.onExporterChanged();

    //Setup Pages
    var pages = ExportWizard.Pencil.controller.doc.pages;
    Dom.empty(ExportWizard.pageList);
    for (var i = 0; i < pages.length; i++) {
        var item = Dom.newDOMElement({
            _name: "listitem",
            _uri: PencilNamespaces.xul,
            label: pages[i].properties.name,
            type: "checkbox",
            checked: lastSelection.pageIds ? (lastSelection.pageIds.indexOf(pages[i].properties.id) >= 0) : "true"
        });
        item._pageId = pages[i].properties.id;

        ExportWizard.pageList.appendChild(item);
    }

    if (lastSelection.pageMode) {
        ExportWizard.pageSelectionGroup.value = lastSelection.pageMode;
    } else {
        ExportWizard.pageSelectionGroup.value = "all";
    }

    window.setTimeout(ExportWizard.onPageSelectionChanged, 10);

    //Setup templates and other options
    if (ExportWizard.getSelectedExporter().supportTemplating()
        && lastSelection.templateId) {
        ExportWizard.templateMenu.value = lastSelection.templateId;
    }

    if (lastSelection.options) {
        ExportWizard.copyBGLinkCheckbox.checked = lastSelection.options.copyBGLinks;
    }

    ExportWizard.targetFilePathText.value = lastSelection.targetPath ? lastSelection.targetPath : "";

    ExportWizard._setupFormatPageDone = true;
    window.sizeToContent();
    
    if (ExportWizard.dialogData.forcedExporterId) {
        document.documentElement.advance();
    }
};
ExportWizard.onPageSelectionChanged = function () {
    var label = document.getElementById("pageSelectionSummaryLabel");
    var selection = ExportWizard.pageSelectionGroup.value;

    var only = (selection == "only");
    ExportWizard.pageList.disabled = !only;
    ExportWizard.pageList.selectedIndex = -1;
    label.disabled = only;
    var total = 0;
    var selected = 0;

    Dom.workOn("./xul:listitem", ExportWizard.pageList, function (item) {
        if (item.checked) selected ++;
        total ++;
    });

    label.value = Util.getMessage("selected.page.of.total", selected, total);
};
ExportWizard.getSelectedExporter = function () {
    return ExportWizard.exporterRadioGroup.selectedItem._exporter;
};

ExportWizard.onExporterChanged = function () {
    var exporter = ExportWizard.getSelectedExporter();

    //update warnings, if any
    var warnings = exporter.getWarnings();
    var warningPane = document.getElementById("exporterWarningPane");

    Dom.empty(warningPane);
    if (!warnings) {
        warningPane.style.visibility = "hidden";
    } else {
        warningPane.style.visibility = "visible";
        warningPane.appendChild(document.createTextNode(warnings));
    }

    //templates
    Dom.empty(ExportWizard.templateMenu.firstChild);
    Dom.empty(ExportWizard.templateDescription);
    var popup = ExportWizard.templateMenu.firstChild;
    if (!exporter.supportTemplating()) {
        ExportWizard.templateMenu.disabled = true;

        var menuitem = document.createElementNS(PencilNamespaces.xul, "menuitem");
        menuitem.setAttribute("label", Util.getMessage("template.not.supported"));
        popup.appendChild(menuitem);
    } else {
        ExportWizard.templateMenu.disabled = false;
        var templates = exporter.getTemplates();

        for (var i = 0; i < templates.length; i ++) {
            var template = templates[i];
            var menuitem = document.createElementNS(PencilNamespaces.xul, "menuitem");
            menuitem.setAttribute("label", template.name);
            menuitem.setAttribute("value", template.id);
            menuitem._template = template;

            popup.appendChild(menuitem);
        }
    }
    ExportWizard.templateMenu.selectedIndex = 0;

    var lastSelection = ExportWizard.dialogData.lastSelection ? ExportWizard.dialogData.lastSelection : {};

    if (exporter.id == lastSelection.exporterId) {
        ExportWizard.targetFilePathText.value = lastSelection.targetPath ? lastSelection.targetPath : "";
    } else {
        ExportWizard.targetFilePathText.value = "";
    }

    if (exporter.getOutputType() == BaseExporter.OUTPUT_TYPE_NONE) {
        ExportWizard.targetFilePathText.disabled = true;
        ExportWizard.targetFilePathText.value = "";
        ExportWizard.browseButton.disabled = true;
    } else {
        ExportWizard.targetFilePathText.disabled = false;
        ExportWizard.browseButton.disabled = false;
    }

    //type of output
};
ExportWizard.browseTargetFile = function () {
    var currentDir = null;
    var exporter = ExportWizard.getSelectedExporter();
    var isChoosingFile = exporter.getOutputType() == BaseExporter.OUTPUT_TYPE_FILE;

    try {
        //if value specified, use it
        if (ExportWizard.targetFilePathText.value) {
            var file = Components.classes["@mozilla.org/file/local;1"]
                                 .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(ExportWizard.targetFilePathText.value);

            if (file.exists()) currentDir = isChoosingFile ? file.parent : file;
        }

        //if still not, use the bound file
        if (!currentDir && ExportWizard.Pencil.controller.isBoundToFile()) {
            var file = Components.classes["@mozilla.org/file/local;1"]
                                 .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(ExportWizard.Pencil.controller.filePath);

            currentDir = file.parent;
        }
    } catch (ex) {
        Console.dumpError(ex, "stdout");
    }

    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    if (currentDir) fp.displayDirectory = currentDir;

    var defaultExt = null;
    if (isChoosingFile) {
        fp.init(window, Util.getMessage("select.output.file"), nsIFilePicker.modeSave);
        var exts = exporter.getOutputFileExtensions();
        if (exts) {
            for (i in exts) {
            	var ext = exts[i].ext;
                fp.appendFilter(exts[i].title, ext);
                if (defaultExt == null && ext != "*.*") {
                	var index = ext.indexOf(".");
                	if (index >= 0) {
                    	defaultExt = ext.substring(index);
                	}
                }
            }
        }

    } else {
        fp.init(window, Util.getMessage("select.destination"), nsIFilePicker.modeGetFolder);
    }

    fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

    if (fp.show() == nsIFilePicker.returnCancel) return;
    
    var path = fp.file.path;
    if (isChoosingFile && defaultExt && path.indexOf(".") < 0) {
    	path = path + defaultExt;
    }
    
    ExportWizard.targetFilePathText.value = path;
};
ExportWizard.validatePageSelection = function () {
    if (ExportWizard.pageSelectionGroup.value != "only") return true;

    var selected = 0;
    Dom.workOn("./xul:listitem", ExportWizard.pageList, function (item) {
        if (item.checked) selected ++;
    });

    if (selected == 0) {
        Util.error(Util.getMessage("error.title"), Util.getMessage("please.select.at.least.one.page.to.export"), Util.getMessage("button.close.label"));
        return false;
    }

    return true;

};
ExportWizard.validateOptions = function () {
    var exporter = ExportWizard.getSelectedExporter();

    if (exporter.getOutputType() != BaseExporter.OUTPUT_TYPE_NONE) {
        if (!ExportWizard.targetFilePathText.value) {
            Util.error(Util.getMessage("error.title"), Util.getMessage("please.select.the.target.directory"), Util.getMessage("button.close.label"));
            ExportWizard.targetFilePathText.focus();
            return false;
        }

        var file = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(ExportWizard.targetFilePathText.value);

        if (!file.parent.exists()) {
            Util.error(Util.getMessage("error.title"), Util.getMessage("the.specified.path.does.not.exists"), Util.getMessage("button.close.label"));
            ExportWizard.targetFilePathText.focus();

            return false;
        }
    }

    return true;
};
ExportWizard.onFinish = function () {
    var templateId = ExportWizard.templateMenu.value;
    if (!ExportWizard.templateMenu.disabled && (!templateId || templateId == null)) {
        Util.error(Util.getMessage("error.title"), Util.getMessage("no.template.has.been.installed.for.exporting"), Util.getMessage("button.close.label"));
        return false;
    }

    var selection = {
        exporterId: ExportWizard.exporterRadioGroup.value,
        pageMode: ExportWizard.pageSelectionGroup.value,
        templateId: ExportWizard.templateMenu.disabled ? null : ExportWizard.templateMenu.value,

        options: {
            copyBGLinks: ExportWizard.copyBGLinkCheckbox.checked
        },

        targetPath: ExportWizard.targetFilePathText.value
    };


    selection.pageIds = null;

    if (ExportWizard.pageSelectionGroup.value == "only") {
        selection.pageIds = [];

        Dom.workOn("./xul:listitem", ExportWizard.pageList, function (item) {
            if (item.checked) selection.pageIds.push(item._pageId);
        });
    }

    ExportWizard.dialogData.selection = selection;
};
ExportWizard.callManageTemplateDialog = function () {
    window.opener.openDialog('chrome://pencil/content/templateManagementDialog.xul', '', 'modal,centerscreen,chrome');
    ExportWizard.onExporterChanged();
};

window.onload = function () {
    ExportWizard.setup();
};

window.onerror = function (msg, url, lineNumber) {
    error([msg, url, lineNumber]);
};

