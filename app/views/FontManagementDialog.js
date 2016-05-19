function FontManagementDialog() {
    Dialog.call(this);
    this.fontRepeater.populator = function (font, binding) {
        binding.fontName.innerHTML = font.name;
        binding.fontName.style.fontFamily = font.name;
        binding.styleNumber.innerHTML = font.variants.length + " styles";
        binding.deleteButton._font = font;
    };

    this.bind("click", function (event) {
        var node = Dom.findUpwardForNodeWithData(event.target, "_font");
        if (!node) return;
        var font = node._font;
        FontLoader.instance.removeFont(font);
        FontLoader.instance.loadFonts();
        this.loadFonts();
    }, this.fontRepeater.node());

    this.title = "User Font Management";
}

__extend(Dialog, FontManagementDialog);

FontManagementDialog.prototype.setup = function () {
    this.loadFonts();
};
FontManagementDialog.prototype.loadFonts = function () {
    var fonts = FontLoader.instance.getUserFonts();
    var thiz = this;
    this.fontRepeater.node().style.visibility = "hidden";

    window.setTimeout(function () {
        thiz.fontRepeater.setItems(fonts);
        thiz.fontRepeater.node().style.visibility = "inherit";
    }, 10);
};
FontManagementDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CLOSE,
        {
            type: "extra1", title: "Install new font...",
            run: function () {
                (new FontDetailDialog()).callback(function () {
                    FontLoader.instance.loadFonts();
                    thiz.loadFonts();
                }).open();

                return false;
            }
        }
    ]
};
