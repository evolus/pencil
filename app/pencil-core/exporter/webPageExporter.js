function WebPageExporter() {
    this.name = Util.getMessage("single.web.page");
    this.id = "WebPageExporter";
    this.linkingSupported = true;
}
WebPageExporter.RASTERIZED_SUBDIR = "pages";
WebPageExporter.HTML_FILE = "index.html";

WebPageExporter.prototype = new BaseRasterizedExporter();

/*
 * A template opts in to single-file output by declaring an editable property named
 * "embedImages". The Export dialog and export_document_html send its value as the string
 * "true" or "false", like every other template option. When it is "true", page images and the
 * template's relative <script src> and stylesheet <link href> files are inlined as data URIs,
 * so index.html is the only file written.
 */
WebPageExporter.EMBED_OPTION = "embedImages";
WebPageExporter.isEmbedding = function (params) {
    return params.options[WebPageExporter.EMBED_OPTION] == "true";
};

/*
 * Embedded page images are rasterized into a temporary directory and inlined by export(), so
 * the output directory never gets a pages/ subdirectory and nothing the user had there is
 * deleted.
 */
WebPageExporter.prototype.getRasterizedPageDestination = function (baseDir, params) {
    if (WebPageExporter.isEmbedding(params)) {
        this.embeddedImageDir = Local.createTempDir("html-export").name;
        return this.embeddedImageDir;
    }
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
    if (!templateId) throw new Error(Util.getMessage("no.template.has.been.installed.for.exporting"));

    var template = ExportTemplateManager.getTemplateById(templateId);
    var embedding = WebPageExporter.isEmbedding(options);

    if (!embedding) this.copySupportFiles(template, destDir);

    //transform the xml to HTML
    var sourceDOM = Dom.parseFile(xmlFile);

    if (embedding) {
        this.embedRasterizedImages(sourceDOM);
    } else {
        //changing rasterized path to relative
        this.fixAbsoluteRasterizedPaths(sourceDOM, destDir);
    }

    var xsltDOM = Dom.parseFile(template.styleSheetFile);

    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDOM);

    /*
     * Only the template's declared options become xsl:param values. The options map also
     * carries exporter settings (copyBGLinks, bitmapScale) that are not template parameters.
     */
    template.editableProperties.forEach(function (property) {
        if (property.name in options.options) {
            xsltProcessor.setParameter(null, property.name, options.options[property.name]);
        }
    });

    var result = xsltProcessor.transformToDocument(sourceDOM);

    if (embedding) this.embedTemplateResources(result, template);

    var htmlFile = path.join(destDir, WebPageExporter.HTML_FILE);

    Dom.serializeNodeToFile(result, htmlFile);

    callback();
};
WebPageExporter.prototype.copySupportFiles = function (template, destDir) {
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
};
WebPageExporter.prototype.embedRasterizedImages = function (sourceDOM) {
    Dom.workOn("//p:Page/@rasterized", sourceDOM, function (attr) {
        attr.nodeValue = WebPageExporter.toDataURI(attr.nodeValue, "image/png");
    });
    deleteFileOrFolder(this.embeddedImageDir);
    this.embeddedImageDir = null;
};
/*
 * Inline content cannot go into <script> or <style> text: Dom.serializeNodeToFile writes XML
 * and would escape "<", ">" and "&" in the code. Base64 data URIs avoid escaping altogether.
 * URLs with a scheme (http:, data:, ...) are left as they are.
 */
WebPageExporter.prototype.embedTemplateResources = function (resultDOM, template) {
    Dom.workOn("//html:script[@src] | //html:link[@rel='stylesheet'][@href]", resultDOM, function (node) {
        var isScript = node.localName == "script";
        var attrName = isScript ? "src" : "href";
        var url = node.getAttribute(attrName);
        if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return;

        var file = path.join(template.dir, url);
        node.setAttribute(attrName, WebPageExporter.toDataURI(file, isScript ? "text/javascript" : "text/css"));
    });
};
WebPageExporter.toDataURI = function (file, mimeType) {
    return "data:" + mimeType + ";base64," + fs.readFileSync(file).toString("base64");
};
Pencil.registerDocumentExporter(new WebPageExporter(), "default=true");
