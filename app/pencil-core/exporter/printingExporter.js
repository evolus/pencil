function PrintingExporter(pdfOutput) {
    this.pdfOutput = pdfOutput;
    this.name = pdfOutput ? "Export to PDF" : "Send to printer";
    this.id = pdfOutput ? "PDFExporter" : "PrintingExporter";
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
    return this.tempDir.name;
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

    debug("destDir: " + destDir.name);

    var templateId = options.templateId;
    if (!templateId) return;

    var template = ExportTemplateManager.getTemplateById(templateId);

    //copying support files
    var items = fs.readdirSync(template.dir);
    items.forEach(function (item) {
        if (item == "Template.xml" || item == template.styleSheet) return;

        var file = path.join(template.dir, item);
        var destFile = path.join(destDir.name, item);
        if (fsExistSync(destFile)) {
            deleteFileOrFolder(destFile);
        }

        if (fsExistAsDirectorySync(file)) {
            copyFolderRecursiveSync(file, destDir.name);
        } else {
            copyFileSync(file, destDir.name);
        }
    });


    //transform the xml to HTML
    var sourceDOM = Dom.parseFile(xmlFile);

    //changing rasterized path to relative
    //this.fixAbsoluteRasterizedPaths(sourceDOM, destDir);
    var xsltDOM = Dom.parseFile(template.styleSheetFile);

    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDOM);
    var result = xsltProcessor.transformToDocument(sourceDOM);

    var htmlFile = path.join(destDir.name, PrintingExporter.HTML_FILE);

    Dom.serializeNodeToFile(result, htmlFile);

    if (this.pdfOutput) {
        if (fsExistSync(targetFile)) {
            deleteFileOrFolder(targetFile);
        }
    }

    //print via ipc
    var id = Util.newUUID();
    var data = {
        fileURL: ImageData.filePathToURL(htmlFile),
        targetFilePath: targetFile,
        id: id
    };

    for (var propName in template) {
        if (("" + propName).match(/^print\.(.+)$/)) {
            data[propName] = template[propName];
        }
    }

    ipcRenderer.once(id, function (event, data) {
        console.log("RASTER: Printing result received for " + id);
        if (data.success) {
            Dialog.alert("Exported to " + targetFile);
        } else {
            Dialog.error("Error: " + data.message);
        }
        if (this.tempDir) this.tempDir.removeCallback();
        callback();
    });

    ipcRenderer.send("printer-request", data);
    console.log("RASTER: Printing request sent for ", data);
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
