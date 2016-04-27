function PlainText(s) {
    this.value = s;
}
PlainText.fromString = function (literal) {
    return new PlainText(literal);
};
PlainText.prototype.toString = function () {
    return this.value;
};
PlainText.prototype.toUpper = function() {
    return new PlainText(this.value.toUpperCase());
};
PlainText.fromLoremIpsum = function (words) {
    return new PlainText(loremIpsumSentence2(words));
};


pencilSandbox.PlainText = {
    newPlainText: function (s) {
        return new PlainText(s);
    }
};
for (var p in PlainText) {
    pencilSandbox.PlainText[p] = PlainText[p];
};
