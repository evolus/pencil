function WebPageExporter() {
    this.name = Util.getMessage("single.web.page");
    this.id = "WebPageExporter";
}
WebPageExporter.RASTERIZED_SUBDIR = "pages";
WebPageExporter.HTML_FILE = "index.html";

WebPageExporter.prototype = new BaseRasterizedExporter();

WebPageExporter.prototype.getRasterizedPageDestination = function (baseDir) {
    var dir = baseDir.clone();
    dir.append(WebPageExporter.RASTERIZED_SUBDIR);

    return dir;
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
    debug("destDir: " + destDir.path);

    var templateId = options.templateId;
    if (!templateId) return;

    var template = ExportTemplateManager.getTemplateById(templateId);

    //copying support files
    var items = template.dir.directoryEntries;
    while (items.hasMoreElements()) {
        var file = items.getNext().QueryInterface(Components.interfaces.nsIFile);

        if (file.leafName == "Template.xml"
            || file.leafName == template.styleSheet) continue;

        var destFile = destDir.clone();
        destFile.append(file.leafName);

        if (destFile.exists()) destFile.remove(true);

        file.copyTo(destDir, "");
    }

    //transform the xml to HTML
    var sourceDOM = Dom.parseFile(xmlFile);

    //changing rasterized path to relative
    this.fixAbsoluteRasterizedPaths(sourceDOM, destDir);

    var xsltDOM = Dom.parseFile(template.styleSheetFile);

    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDOM);

    var result = xsltProcessor.transformToDocument(sourceDOM);

    var htmlFile = destDir.clone();
    htmlFile.append(WebPageExporter.HTML_FILE);

    Dom.serializeNodeToFile(result, htmlFile);

    callback();
};
Pencil.registerDocumentExporter(new WebPageExporter(), "default=true");
