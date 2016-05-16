function ODTExporter() {
    this.name = Util.getMessage("openoffice.org.document.odt.file");
    this.id = "ODTExporter";
    this.xsltProcessor = new XSLTProcessor();
}
ODTExporter.RASTERIZED_SUBDIR = "Pictures";

ODTExporter.prototype = new BaseRasterizedExporter();

ODTExporter.prototype.getRasterizedPageDestination = function (baseDir) {
    this.tmpDir = tmp.dirSync({ keep: false, unsafeCleanup: true });
    return path.join(this.tmpDir.name, ODTExporter.RASTERIZED_SUBDIR);
};
ODTExporter.prototype.supportTemplating = function () {
    return true;
};
ODTExporter.prototype.getTemplates = function () {
    return ExportTemplateManager.getTemplatesForType("ODT");
};
ODTExporter.prototype.getWarnings = function () {
    var templates = this.getTemplates();
    if (templates && templates.length > 0) return null;

    return Util.getMessage("no.template.has.been.installed.for.exporting");
};

ODTExporter.prototype.transform = function (template, fileBaseName, sourceDOM, targetDir) {
    var styleSheetFile = path.join(template.dir, fileBaseName + ".xslt");

    if (!fsExistSync(styleSheetFile)) return;

    this.xsltProcessor.reset();

    var xsltDOM = Dom.parseFile(styleSheetFile);
    this.xsltProcessor.importStylesheet(xsltDOM);

    var result = this.xsltProcessor.transformToDocument(sourceDOM);

    var xmlFile = path.join(targetDir, fileBaseName + ".xml");

    Dom.serializeNodeToFile(result, xmlFile);
};

ODTExporter.prototype.export = function (doc, options, destFile, xmlFile, callback) {
    var templateId = options.templateId;
    if (!templateId) return;

    var template = ExportTemplateManager.getTemplateById(templateId);

    //copying support files to a temp dir
    if (!this.tmpDir) {
        this.tmpDir = tmp.dirSync({ keep: false, unsafeCleanup: true });
    }

    var items = fs.readdirSync(template.dir);
    items.forEach(function (item) {
        if (item.match(/\.xslt$/) || item == "Template.xml") return;

        var file = path.join(template.dir, item);
        var destFile = path.join(this.tmpDir.name, item);
        if (fsExistSync(destFile)) {
            deleteFileOrFolder(destFile);
        }

        if (fsExistAsDirectorySync(file)) {
            copyFolderRecursiveSync(file, this.tmpDir.name);
        } else {
            copyFileSync(file, this.tmpDir.name);
        }
    }.bind(this));

    //transform the xml to HTML
    var sourceDOM = Dom.parseFile(xmlFile);

    //changing rasterized path to relative
    this.fixAbsoluteRasterizedPaths(sourceDOM, this.tmpDir.name);

    this.transform(template, "content", sourceDOM, this.tmpDir.name);
    this.transform(template, "meta", sourceDOM, this.tmpDir.name);
    this.transform(template, "settings", sourceDOM, this.tmpDir.name);
    this.transform(template, "styles", sourceDOM, this.tmpDir.name);

    Util.compress(this.tmpDir.name, destFile, function () {
        this.tmpDir.removeCallback();
        this.tmpDir = null;
        callback();
    }.bind(this));
};
ODTExporter.prototype.getOutputType = function () {
    return BaseExporter.OUTPUT_TYPE_FILE;
};
ODTExporter.prototype.getOutputFileExtensions = function () {
    return [
        {
            title: Util.getMessage("filepicker.openoffice.org.document.odt"),
            ext: "odt"
        }
    ];
};
Pencil.registerDocumentExporter(new ODTExporter());
