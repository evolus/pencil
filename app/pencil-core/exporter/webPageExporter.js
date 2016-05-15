function WebPageExporter() {
    this.name = Util.getMessage("single.web.page");
    this.id = "WebPageExporter";
}
WebPageExporter.RASTERIZED_SUBDIR = "pages";
WebPageExporter.HTML_FILE = "index.html";

WebPageExporter.prototype = new BaseRasterizedExporter();

WebPageExporter.prototype.getRasterizedPageDestination = function (baseDir) {
    return path.join(baseDir, WebPageExporter.RASTERIZED_SUBDIR);
};
WebPageExporter.prototype.supportTemplating = function () {
    return true;
};
WebPageExporter.prototype.getTemplates = function () {
    return ExportTemplateManager.getTemplatesForType("HTML");
};
WebPageExporter.prototype.getWarnings = function () {
    var templates = this.getTemplates();
    if (templates && templates.length > 0) return null;

    return Util.getMessage("no.template.has.been.installed.for.exporting");
};


WebPageExporter.prototype.export = function (doc, options, destDir, xmlFile, callback) {
    debug("destDir: " + destDir);

    var templateId = options.templateId;
    if (!templateId) return;

    var template = ExportTemplateManager.getTemplateById(templateId);

    //copying support files
    var items = fs.readdirSync(template.dir);
    items.forEach(function (item) {
        if (item == "Template.xml" || item == template.styleSheet) return;

        var file = path.join(template.dir, item);
        var destFile = path.join(destDir, item);
        if (fsExistSync(destFile)) {
            deleteFileOrFolder(destFile);
        }

        if (fsExistAsDirectorySync(file)) {
            copyFolderRecursiveSync(file, destDir);
        } else {
            copyFileSync(file, destDir);
        }
    });

    //transform the xml to HTML
    var sourceDOM = Dom.parseFile(xmlFile);

    //changing rasterized path to relative
    this.fixAbsoluteRasterizedPaths(sourceDOM, destDir);

    var xsltDOM = Dom.parseFile(template.styleSheetFile);

    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDOM);

    var result = xsltProcessor.transformToDocument(sourceDOM);

    var htmlFile = path.join(destDir, WebPageExporter.HTML_FILE);

    Dom.serializeNodeToFile(result, htmlFile);

    callback();
};
Pencil.registerDocumentExporter(new WebPageExporter(), "default=true");
