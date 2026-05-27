function RichText(html) {
    this.html = html;
    this.value = html;
    if (this.html instanceof PlainText && this.html.value) {
        this.html.value = Dom.htmlEncode(this.html.value);
    }
}
RichText.fromString = function (html) {
    return new RichText(html);
};
RichText.prototype.toString = function () {
    return this.html;
};
RichText.prototype.toUpper = function() {
    return new RichText(this.html.toUpperCase());
};

RichText.fromLoremIpsum = function (words) {
    return new RichText(loremIpsumSentence2(words));
};

pencilSandbox.RichText = {
    newRichText: function (html) {
        return new RichText(html);
    }
};
for (var p in RichText) {
    pencilSandbox.RichText[p] = RichText[p];
};
