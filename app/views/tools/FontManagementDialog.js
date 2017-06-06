function FontManagementDialog() {
    Dialog.call(this);
    this.fontRepeater.populator = function (font, binding) {
        binding.fontName.innerHTML = font.name;
        binding.fontName.title = font.name;
        binding.fontName.style.fontFamily = font.name;
        binding.styleNumber.innerHTML = font.variants.length + " styles";
        binding.deleteButton._font = font;

        var id = Util.newUUID();
        binding.autoEmbedCheckbox.checked = font.autoEmbed;
        binding.autoEmbedCheckbox.setAttribute("id", id)
        binding.embedLabel.setAttribute("for", id);
        binding.autoEmbedCheckbox._embedFont = font;
    };

    this.bind("click", function (event) {
        var node = Dom.findUpwardForNodeWithData(event.target, "_font");
        if (!node) return;
        var font = node._font;
        FontLoader.instance.removeFont(font, function () {
            this.load();
        }.bind(this));
    }, this.fontRepeater.node());

    this.bind("click", function (event) {
        var checkbox = Dom.findUpwardForNodeWithData(event.target, "_embedFont");
        if (!checkbox) return;
        var font = checkbox._embedFont;
        FontLoader.instance.setAutoEmbed(font, checkbox.checked, function () {
            this.load();
        }.bind(this));
    }, this.fontRepeater.node());


    this.title = "User Font Management";
}

__extend(Dialog, FontManagementDialog);

FontManagementDialog.prototype.setup = function () {
    this.load();
};
FontManagementDialog.prototype.load = function () {
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
                    ApplicationPane._instance.busy();
                    FontLoader.instance.loadFonts(function () {
                        thiz.load();
                        ApplicationPane._instance.unbusy();
                    });
                }).open();

                return false;
            }
        }
    ]
};
