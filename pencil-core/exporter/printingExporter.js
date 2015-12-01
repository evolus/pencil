function PrintingExporter(pdfOutput) {
    this.pdfOutput = pdfOutput;
    this.name = pdfOutput ? "Export to PDF" : "Send to printer";
    this.id = pdfOutput ? "PDFExporter" : "PrintingExporter";
    this.xsltProcessor = new XSLTProcessor();
    this.xsltDOM = null;
}
PrintingExporter.HTML_FILE = "index.html";
PrintingExporter.prototype = new BaseExporter();

PrintingExporter.prototype.requireRasterizedData = function (options) {
    var templateId = options.templateId;
    if (!templateId) return false;

    var template = ExportTemplateManager.getTemplateById(templateId);
    if (!template) return false;

    return "true" == template["useRasterizedImages"];
};
PrintingExporter.prototype.getRasterizedPageDestination = function (baseDir) {
    this.tempDir = Local.createTempDir("printing");
    return this.tempDir;
};
PrintingExporter.prototype.supportTemplating = function () {
    return true;
};
PrintingExporter.prototype.getTemplates = function () {
    return ExportTemplateManager.getTemplatesForType("Print");
};
PrintingExporter.prototype.export = function (doc, options, targetFile, xmlFile, callback) {
    if (!this.tempDir) this.tempDir = Local.createTempDir("printing");
    var destDir = this.tempDir;

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
    //this.fixAbsoluteRasterizedPaths(sourceDOM, destDir);
    var xsltDOM = Dom.parseFile(template.styleSheetFile);

    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDOM);
    var result = xsltProcessor.transformToDocument(sourceDOM);

    var htmlFile = destDir.clone();
    htmlFile.append(PrintingExporter.HTML_FILE);

    Dom.serializeNodeToFile(result, htmlFile);

    var ios = Components.classes["@mozilla.org/network/io-service;1"].
              getService(Components.interfaces.nsIIOService);
    var url = ios.newFileURI(htmlFile);

    debug(url.spec);

    if (this.pdfOutput) {
        if (targetFile && targetFile.exists()) {
            targetFile.remove(true);
        }
    }
    var settings = {filePath: (targetFile && this.pdfOutput) ? targetFile.path : null};
    for (var propName in template) {
        if (("" + propName).match(/^print\./)) {
            settings[propName] = template[propName];
        }
    }

    Pencil.printer.printUrl(url.spec, settings, callback);
};
PrintingExporter.prototype.getWarnings = function () {
    return null;
};
PrintingExporter.prototype.getOutputType = function () {
    return this.pdfOutput ? BaseExporter.OUTPUT_TYPE_FILE : BaseExporter.OUTPUT_TYPE_NONE;
};
PrintingExporter.prototype.getOutputFileExtensions = function () {
    return [
        {
            title: "Portable Document Format (*.pdf)",
            ext: "*.pdf"
        }
    ];
};
Pencil.registerDocumentExporter(new PrintingExporter(true));
Pencil.registerDocumentExporter(new PrintingExporter(false));
