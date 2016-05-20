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
            type: "accept", title: "Install",
            run: function () {

                var fontName = this.fontNameInput.value;
                if (!fontName) {
                    Dialog.error("Font name is invalid.", "Please enter a font name.");
                    return;
                }

                if (FontLoader.instance.isFontExisting(fontName)) {
                    Dialog.error("Font name '" + fontName + "' has existed.", "Please enter a new font name.");
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
                    Dialog.error("No variant file is valid.", "Please select at least valid variant file.");
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
                thiz.close(font);

                return false;
            }
        },
        Dialog.ACTION_CANCEL,
    ]
};
