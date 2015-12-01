function Enum(value) {
    this.value = value ? value : null;
}
Enum.fromString = function(literal) {
    return new Enum(literal);
};
Enum.getValuesFromMeta = function (meta) {
    var literals = pEval(meta.enumValues, {});

    var values = [];
    for (var i in literals) {
        if (literals[i].match(/^([^\|]+)\|(.+)$/)) {
            values.push({value: new Enum(RegExp.$1),
                         label: RegExp.$2});
        }
    }

    return values;
};
Enum.getValues = function (def) {
    try {

        //return from cache, if any
        if (def._enumValues_parsed) return def._enumValues_parsed;

        var values = Enum.getValuesFromMeta(def.meta);

        //cache it
        def._enumValues_parsed = values;

        return values;
    } catch (e) {
        return [];
    }
};
Enum.prototype.equals = function (other) {
    return this.value == other.value;
};
Enum.prototype.toString = function () {
    return "" + this.value;
};

pencilSandbox.Enum = {
    newEnum: function (v) {
        return new Enum(v);
    }
};
for (var p in Enum) {
    pencilSandbox.Enum[p] = Enum[p];
};
