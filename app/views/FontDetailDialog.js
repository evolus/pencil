function FontDetailDialog() {
    Dialog.call(this);
    this.title = "Font Detail";
}

__extend(Dialog, FontDetailDialog);

FontDetailDialog.prototype.setup = function (options) {
    this.options = options || {};
};
FontDetailDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        {
            type: "accept", title: "Save",
            run: function () {

                var fontName = this.fontNameInput.value;
                if (!fontName) {
                    Dialog.error("Font Name is invalid.", "Please enter a font name.");
                    return;
                }

                if (FontLoader.instance.isFontExisting(fontName)) {
                    Dialog.error("Font Name has existed.", "Please enter a new font name.");
                    return;
                }

                function getFilePath(fileInput) {
                    return fileInput.files.length > 0 ? fileInput.files[0].path : "";
                }

                var regularFilePath = getFilePath(thiz.regularFileInput);
                var boldFilePath = getFilePath(thiz.boldFileInput);
                var italicFilePath = getFilePath(thiz.italicFileInput);
                var boldItalicFilePath = getFilePath(thiz.boldItalicFileInput);

                if (!regularFilePath && !boldFilePath && !italicFilePath && !boldItalicFilePath) {
                    Dialog.error("No variant file path is valid", "Please select at least variant file path.");
                    return;
                }

                var font = {
                    fontName: thiz.fontNameInput.value,
                    regularFilePath: regularFilePath,
                    boldFilePath: boldFilePath,
                    italicFilePath: italicFilePath,
                    boldItalicFilePath: boldItalicFilePath
                };

                FontLoader.instance.installNewFont(font);
                thiz.close();

                return false;
            }
        },
        Dialog.ACTION_CANCEL,
    ]
};
