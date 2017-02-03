function PrintingExporter(pdfOutput) {
    this.pdfOutput = pdfOutput;
    this.name = pdfOutput ? "Portable Document Format (PDF)" : "Print";
    this.id = pdfOutput ? "PDFExporter" : "PrintingExporter";
}
PrintingExporter.HTML_FILE = "index.html";
PrintingExporter.prototype = new BaseExporter();

PrintingExporter.prototype.requireRasterizedData = function (options) {
    var templateId = options.templateId;
    if (!templateId) return false;

    var template = ExportTemplateManager.getTemplateById(templateId);
    if (!template) return false;

    return (options && options.options && options.options.format == 'rasterized');
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

    if (options && options.options) {
        for (var name in options.options) {
            var value = options.options[name];
            xsltProcessor.setParameter(null, name, value);
        }
    }

    var result = xsltProcessor.transformToDocument(sourceDOM);

    //this result contains the HTML DOM of the file to print.
    //in case of using vector only data, we need to embed the font data into the stlye of this HTML DOM

    var css = "svg { line-height: 1.428; }";

    var exportJob = function () {
        var head = Dom.getSingle("/html:html/html:head", result);
        var style = result.createElement("style");
        style.setAttribute("type", "text/css");
        style.appendChild(result.createTextNode(css));
        head.appendChild(style);

        var htmlFile = path.join(destDir.name, PrintingExporter.HTML_FILE);

        Dom.serializeNodeToFile(result, htmlFile);
        // console.log("HTML File: " + htmlFile);
        // callback();
        // return;

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
            pdf: this.pdfOutput,
            id: id
        };

        for (var propName in template) {
            if (("" + propName).match(/^print\.(.+)$/)) {
                data[propName] = template[propName];
            }
        }

        ipcRenderer.once(id, function (event, data) {
            if (!data.success) {
                Dialog.error("Error: " + data.message);
            }

            if (this.tempDir) {
                deleteFileOrFolder(this.tempDir.name);
                this.tempDir = null;
            }
            callback();
        }.bind(this));

        ipcRenderer.send("printer-request", data);
        console.log("RASTER: Printing request sent for ", data);
    }.bind(this);

    var fontFaces = FontLoader.instance.allFaces;

    console.log(result.documentElement);

    if (fontFaces && fontFaces.length > 0) {
        sharedUtil.buildEmbeddedFontFaceCSS(fontFaces, function (fontFaceCSS) {
            css += "\n" + fontFaceCSS;
            exportJob();
        });
    } else {
        exportJob();
    }

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
            ext: "pdf"
        }
    ];
};
Pencil.registerDocumentExporter(new PrintingExporter(true));
Pencil.registerDocumentExporter(new PrintingExporter(false));
