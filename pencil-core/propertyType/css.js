function CSS() {
    this.styles = {};
}

CSS.prototype.set = function (name, value) {
    this.styles[name] = "" + value;
    return this;
};
CSS.prototype.toString = function () {
    var s = "";
    for (name in this.styles) {
        if (s != "") s += "; ";

        s += (name + ": " + this.styles[name]);
    }

    return s;
};
CSS.prototype.importRaw = function (raw) {
    var pairs = ("" + raw).split(/[\n\r \t]*;[\n\r \t]*/);
    for (var i = 0; i < pairs.length; i ++) {
        if (pairs[i].match(/^([^:\n\r \t]+)[\n\r \t]*:[\n\r \t]*(.*)$/)) {
            this.set(RegExp.$1, RegExp.$2);
        }
    }
};
CSS.prototype.clear = function () {
    this.styles = {};
    return this;
};
CSS.prototype.unset = function (name) {
    if (this.styles[name]) {
        delete this.styles[name];
    }
    return this;
};
CSS.prototype.get = function (name) {
    return this.styles[name];
};
CSS.prototype.contains = function (name) {
    return typeof(this.styles[name]) != "undefined";
};
CSS.prototype.append = function (name, value) {
    if (this.styles[name]) {
        var newValue = this.styles[name] + " " + value;
        this.set(name, newValue);
    } else {
        this.set(name, value);
    }
    return this;
};
CSS.prototype.setIfNot = function (name, value) {
    if (this.contains(name)) return;
    this.set(name, value);
    return this;
};

CSS.fromString = function (raw) {
    var css = new CSS();
    css.importRaw(raw);
    return css;
};

pencilSandbox.CSS = {
    newCSS: function () {
        return new CSS();
    }
};
for (var p in CSS) {
    pencilSandbox.CSS[p] = CSS[p];
};
