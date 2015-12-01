function ODTExporter() {
    this.name = Util.getMessage("openoffice.org.document.odt.file");
    this.id = "ODTExporter";
    this.xsltProcessor = new XSLTProcessor();
}
ODTExporter.RASTERIZED_SUBDIR = "Pages";

ODTExporter.prototype = new BaseRasterizedExporter();

ODTExporter.prototype.getRasterizedPageDestination = function (baseDir) {
    this.tmpDir = Local.createTempDir("pencilodt");
    var dir = this.tmpDir.clone();
    dir.append(ODTExporter.RASTERIZED_SUBDIR);

    return dir;
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
    var styleSheetFile = template.dir.clone();
    styleSheetFile.append(fileBaseName + ".xslt");

    if (!styleSheetFile.exists()) return;

    this.xsltProcessor.reset();

    var xsltDOM = Dom.parseFile(styleSheetFile);
    this.xsltProcessor.importStylesheet(xsltDOM);

    var result = this.xsltProcessor.transformToDocument(sourceDOM);

    var xmlFile = targetDir.clone();
    xmlFile.append(fileBaseName + ".xml");

    Dom.serializeNodeToFile(result, xmlFile);
};

ODTExporter.prototype.export = function (doc, options, destFile, xmlFile, callback) {
    var templateId = options.templateId;
    if (!templateId) return;

    var template = ExportTemplateManager.getTemplateById(templateId);

    //copying support files to a temp dir
    if (!this.tmpDir) {
        this.tmpDir = Util.createTempDir("pencilodt");
    }

    var items = template.dir.directoryEntries;
    while (items.hasMoreElements()) {
        var file = items.getNext().QueryInterface(Components.interfaces.nsIFile);

        //ignore the xslt files
        if (file.leafName.match(/\.xslt$/)) continue;

        var targetFile = this.tmpDir.clone();
        targetFile.append(file.leafName);

        if (targetFile.exists()) targetFile.remove(true);

        file.copyTo(this.tmpDir, "");
    }

    //transform the xml to HTML
    var sourceDOM = Dom.parseFile(xmlFile);

    //changing rasterized path to relative
    this.fixAbsoluteRasterizedPaths(sourceDOM, this.tmpDir);

    this.transform(template, "content", sourceDOM, this.tmpDir);
    this.transform(template, "meta", sourceDOM, this.tmpDir);
    this.transform(template, "settings", sourceDOM, this.tmpDir);
    this.transform(template, "styles", sourceDOM, this.tmpDir);

    Util.compress(this.tmpDir, destFile);
    this.tmpDir.remove(true);
    this.tmpDir = null;

    callback();
};
ODTExporter.prototype.getOutputType = function () {
    return BaseExporter.OUTPUT_TYPE_FILE;
};
ODTExporter.prototype.getOutputFileExtensions = function () {
    return [
        {
            title: Util.getMessage("filepicker.openoffice.org.document.odt"),
            ext: "*.odt"
        }
    ];
};
Pencil.registerDocumentExporter(new ODTExporter());
