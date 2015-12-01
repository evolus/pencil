function UnimplementedExporter(name) {
    this.name = name;
    this.invalid = true;
    this.id = name;
}
UnimplementedExporter.prototype = new BaseExporter();

//Pencil.registerDocumentExporter(new UnimplementedExporter(Util.getMessage("microsoft.word.document.doc.file")));
//Pencil.registerDocumentExporter(new UnimplementedExporter(Util.getMessage("pdf.document")));
