function OOConversionExporter(name, id, mime, extTitle, ext) {
    this.name = name;
    this.id = id;
    this.mime = mime;
    this.extTitle = extTitle;
    this.ext = ext;
}

OOConversionExporter.converters = {};
OOConversionExporter.getConverter = function () {
    var key = Config.get("export.oo.converter", "uno");
    return OOConversionExporter.converters[key];
};


OOConversionExporter.converters["uno"] = {
    getFormatFromMime: function (mime) {
        var map = {
            "application/pdf": "pdf",
            "application/msword": "doc",
        };

        return map[mime];
    },
    convert: function (src, dest, mime, callback) {
        debug("converting using UNOCONV");
        var processService = Components.classes["@mozilla.org/process/util;1"]
                                .getService(Components.interfaces.nsIProcess);

        var path = Config.get("export.oo.converter.uno.path", "/bin/sh");
        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);

        file.initWithPath(path);
        processService.init(file);

        var params = [
            "-c",
            [
                "unoconv",
                "-f",
                this.getFormatFromMime(mime),
                "--stdout",
                "'" + src.path + "'",
                ">",
                "'" + dest.path + "'",
            ].join(" ")
        ];

        processService.run(true, params, params.length);

        callback();
    }
};

OOConversionExporter.converters["jod"] = {
    convert: function (src, dest, mime, callback) {
        debug("converting using JOD");
        var url = Config.get("export.oo.converter.jod.url", "http://ks300916.kimsufi.com:8080/jodconverter/service");

        var listener = {
            onMessage: function (message) {
            },
            onProgress: function (percent) {
            },
            onDone: function () {
                callback();
            }
        };

        var options = {
            mime: "application/vnd.oasis.opendocument.text",
            headers: {
                "Content-Type": "application/vnd.oasis.opendocument.text",
                "Accept": mime
            }
        };

        Net.uploadAndDownload(url, src, dest, listener, options);
    }
};

OOConversionExporter.prototype = new ODTExporter();
OOConversionExporter.prototype.super$export = OOConversionExporter.prototype.export;
OOConversionExporter.prototype.export = function (doc, options, destFile, xmlFile, callback) {
    var tmpODTFile = Local.newTempFile("penciloo", "odt");

    var thiz = this;
    this.super$export(doc, options, tmpODTFile, xmlFile, function () {

        var converter = OOConversionExporter.getConverter();
        converter.convert(tmpODTFile, destFile, thiz.mime, function () {
            tmpODTFile.remove(true);
            callback();
        });
    });
};

OOConversionExporter.prototype.getOutputFileExtensions = function () {
    return [
        {
            title: this.extTitle,
            ext: this.ext
        }
    ];
};

//Pencil.registerDocumentExporter(new OOConversionExporter(Util.getMessage("pdf.document"), "PDFExporter", "application/pdf", Util.getMessage("filepicker.adobe.pdf.files.pdf"), "*.pdf"));
//Pencil.registerDocumentExporter(new OOConversionExporter(Util.getMessage("microsoft.word.document.doc.file"), "DOCExporter", "application/msword", Util.getMessage("filepicker.microsoft.word.97.xp.doc"), "*.doc"));
