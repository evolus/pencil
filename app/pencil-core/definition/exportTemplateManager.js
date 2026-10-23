var ExportTemplateManager = {}
ExportTemplateManager.templates = {};
ExportTemplateManager.templateMap = {};

ExportTemplateManager.SUPPORTED_TYPES = ["HTML", "Print", "ODT"];
ExportTemplateManager.SUPPORTED_TYPES_NAMES = {
    "Print": Util.getMessage("templates.for.printing"),
    "HTML": Util.getMessage("templates.for.exporting.to.html.documents"),
    "ODT": Util.getMessage("templates.for.exporting.to.text.documents")
};

ExportTemplateManager.addTemplate = function (template, type) {
    if (!ExportTemplateManager.templates[type]) {
        ExportTemplateManager.templates[type] = [];
    }
    ExportTemplateManager.templates[type].push(template);
    ExportTemplateManager.templateMap[template.id] = template;
};
ExportTemplateManager.getTemplatesForType = function (type) {
    return ExportTemplateManager.templates[type];
};
ExportTemplateManager.getTemplateById = function (templateId) {
    return ExportTemplateManager.templateMap[templateId];
};

ExportTemplateManager.loadTemplatesIn = function (templateDir) {
    try {
        for (var i in ExportTemplateManager.SUPPORTED_TYPES) {
            var type = ExportTemplateManager.SUPPORTED_TYPES[i];

            ExportTemplateManager._loadUserDefinedTemplatesIn(path.join(templateDir, type), type);
        }
    } catch (e) {
        Console.dumpError(e);
    }
};

ExportTemplateManager.loadUserDefinedTemplates = function () {
    try {

        var templateDir = ExportTemplateManager.getUserTemplateDirectory();
        ExportTemplateManager.loadTemplatesIn(templateDir);
    } catch (e) {
        Console.dumpError(e);
    }
};

ExportTemplateManager.getUserTemplateDirectory = function () {
    return Config.getDataFilePath("exportTemplates");
};
ExportTemplateManager.loadSystemWideDefinedTemplates = function () {
    try {
        var templateDir = ExportTemplateManager.getSystemWideTemplateDirectory();
        ExportTemplateManager.loadTemplatesIn(templateDir);
    } catch (e) {
        Console.dumpError(e);
    }
};
ExportTemplateManager.getSystemWideTemplateDirectory = function () {
    var properties = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties);

    var templateDir = properties.get("ProfD", Components.interfaces.nsIFile);

    templateDir.append("Templates");

    return templateDir;
};
ExportTemplateManager.loadDefaultTemplates = function () {
    try {
        var templateDir = ExportTemplateManager.getDefaultTemplateDirectory();
        ExportTemplateManager.loadTemplatesIn(templateDir);
    } catch (e) {
        Console.dumpError(e);
    }
};
ExportTemplateManager.getDefaultTemplateDirectory = function () {
    return getStaticFilePath("pencil-core/templates");
};
ExportTemplateManager._loadUserDefinedTemplatesIn = function (templateDir, type) {
    //loading all templates
    try {
        var stat = fs.statSync(templateDir);
        if (!stat.isDirectory()) return;

        var entries = fs.readdirSync(templateDir);
        entries.forEach(function(dir) {
            var dirPath = path.join(templateDir, dir);
            stat = fs.statSync(dirPath);
            if (!stat.isDirectory()) return;
            var template = ExportTemplate.parse(dirPath);
            if (!template) {
                return;
            }

            ExportTemplateManager.addTemplate(template, type);
        })
    } catch (e) {
        //console.error(e);
    }
};

ExportTemplateManager.loadTemplates = function() {
    ExportTemplateManager.templates = {};
    ExportTemplateManager.templateMap = {};

    for (var i in ExportTemplateManager.SUPPORTED_TYPES) {
        var type = ExportTemplateManager.SUPPORTED_TYPES[i];
        ExportTemplateManager.templates[type] = [];
    }
    ExportTemplateManager.loadUserDefinedTemplates();
    for (var j = 0 ; j < ExportTemplateManager.SUPPORTED_TYPES.length; j++) {
        var type = ExportTemplateManager.SUPPORTED_TYPES[j];
        var templates = ExportTemplateManager.templates[type];
        for (var i = 0; i < templates.length; i++) {
            templates[i].userDefine = true;
        }
    }
    ExportTemplateManager.loadDefaultTemplates();
};
ExportTemplateManager.installNewTemplate = function (type, callback) {
    // var nsIFilePicker = Components.interfaces.nsIFilePicker;
    // var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    // fp.init(window, Util.getMessage("filepicker.open.document"), nsIFilePicker.modeOpen);
    // fp.appendFilter(Util.getMessage("pencil.export.template.type", type), "*.epxt; *.zip");
    // fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");
    //
    // if (fp.show() != nsIFilePicker.returnOK) return;
    //
    // ExportTemplateManager.installTemplateFromFile(fp.file, type);
    dialog.showOpenDialog({
        title: "Open template document",
        defaultPath: Config.get("template.install.recentlyDirPath", null) || os.homedir(),
        filters: [
            { name: "Template files", extensions: ["epxt", "zip"] }
        ]
    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        Config.set("template.install.recentlyDirPath", path.dirname(filenames[0]));
        ExportTemplateManager.installTemplateFromFile(filenames, type, callback);
    });
}
ExportTemplateManager.installTemplateFromFile = function (file, type , callback) {
    console.log("begin install template, from file : " + file);
    var readStream = fs.createReadStream(file.toString());
    var targetDir = ExportTemplateManager.getUserTemplateDirectory().toString();
    targetDir = targetDir.concat("/"+type);
    var index = readStream.path.lastIndexOf(path.sep);
    var fileName = readStream.path.substring(index + 1);
    targetDir = targetDir.concat("/" + fileName.replace(/\.[^\.]+$/, "") + "_" + Math.ceil(Math.random() * 1000) + "_" + (new Date().getTime()));
    readStream
    .pipe(unzip.Extract({path: targetDir}))
    .on("entry", function (entry) {
        var stat = fs.statSync(targetDir);
        if(!stat || !stat.isDirectory()) {
            fs.mkdirSync(targetDir);
        }
    })
    .on("close", function() {
        try {
            var template = ExportTemplate.parse(targetDir);

            if (!template) throw Util.getMessage("template.cannot.be.parsed");

            console.log("new Template: ", template.name);
            if (ExportTemplateManager.templateMap[template.id]) throw Util.getMessage("template.has.been.installed", template.name);
            Util.info(Util.getMessage("template.has.been.installed.successfully", template.name));
            ExportTemplateManager.loadTemplates();
            if (callback) {
                callback();
            }
        } catch (e) {
            Util.error(Util.getMessage("error.installing.template"), e.message, Util.getMessage("button.close.label"));
            deleteFileOrFolder(targetDir);
        }
    });

    // var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
    //                .createInstance(Components.interfaces.nsIZipReader);
    // zipReader.open(file);
    //
    //
    //
    // var targetDir = ExportTemplateManager.getUserTemplateDirectory();
    // //generate a random number
    // targetDir.append(type);
    // if (!targetDir.exists()) {
    //     targetDir.create(targetDir.DIRECTORY_TYPE, 0777);
    // }
    //
    // targetDir.append(file.leafName.replace(/\.[^\.]+$/, "") + "_" + Math.ceil(Math.random() * 1000) + "_" + (new Date().getTime()));
    //
    // var targetPath = targetDir.path;
    //
    // var isWindows = true;
    // if (navigator.platform.indexOf("Windows") < 0) {
    //     isWindows = false;
    // }
    //
    // var entryEnum = zipReader.findEntries(null);
    // while (entryEnum.hasMore()) {
    //     var entry = entryEnum.getNext();
    //
    //     var targetFile = Components.classes["@mozilla.org/file/local;1"]
    //                .createInstance(Components.interfaces.nsILocalFile);
    //     targetFile.initWithPath(targetPath);
    //
    //     debug(entry);
    //     if (zipReader.getEntry(entry).isDirectory) continue;
    //
    //     var parts = entry.split("\\");
    //     if (parts.length == 1) {
    //         parts = entry.split("/");
    //     } else {
    //         var testParts = entry.split("/");
    //         if (testParts.length > 1) {
    //             debug("unregconized entry (bad name): " + entry);
    //             continue;
    //         }
    //     }
    //     for (var i = 0; i < parts.length; i ++) {
    //         targetFile.append(parts[i]);
    //     }
    //
    //     debug("Extracting '" + entry + "' --> " + targetFile.path + "...");
    //
    //     var parentDir = targetFile.parent;
    //     if (!parentDir.exists()) {
    //         parentDir.create(parentDir.DIRECTORY_TYPE, 0777);
    //     }
    //     zipReader.extract(entry, targetFile);
    //     targetFile.permissions = 0600;
    // }
    // var extractedDir = Components.classes["@mozilla.org/file/local;1"]
    //                .createInstance(Components.interfaces.nsILocalFile);
    //
    // extractedDir.initWithPath(targetPath);
    //
    // try {
    //     var template = ExportTemplate.parse(extractedDir);
    //     if (!template) throw Util.getMessage("template.cannot.be.parsed");
    //     if (ExportTemplateManager.templateMap[template.id]) throw Util.getMessage("template.has.been.installed", template.name);
    //
    //     Util.info(Util.getMessage("template.has.been.installed.successfully", template.name));
    //     ExportTemplateManager.loadTemplates();
    // } catch (e) {
    //     Util.error(Util.getMessage("error.installing.template"), e.message, Util.getMessage("button.close.label"));
    //     extractedDir.remove(true);
    // }
};
ExportTemplateManager.uninstallTemplate = function (template) {
    try {
        debug("About to remove: " + template.dir);
        // template.dir.remove(true);
        if(!template.userDefine || template.userDefine == false) {
            Dialog.alert("Uninstall invalid template ! ","Can't uninstall default template");
            return;
        }
        deleteFileOrFolder(template.dir);

    } catch (e) {
        Util.error(Util.getMessage("failed.to.uninstall.the.template"), e.message, Util.getMessage("button.close.label"));
        Console.dumpError(e);
    }

    ExportTemplateManager.loadTemplates();
}
