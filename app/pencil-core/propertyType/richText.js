function RichText(html) {
    this.html = html;
    this.value = html;
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
