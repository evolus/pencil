function Color() {
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.a = 1.0;
}
Color.REG_EX = /^#([0-9A-F]{2,2})([0-9A-F]{2,2})([0-9A-F]{2,2})([0-9A-F]{2,2})$/i;
Color.REG_EX_NO_ALPHA = /^#([0-9A-F]{2,2})([0-9A-F]{2,2})([0-9A-F]{2,2})$/i;
Color.REG_EX_RGB = /^rgb\(([0-9]+)\,[ ]*([0-9]+)\,[ ]*([0-9]+)\)$/i;
Color.REG_EX_RGBA = /^rgba\(([0-9]+)\,[ ]*([0-9]+)\,[ ]*([0-9]+)\,[ ]*([0-9\.]+)\)$/i;
Color.hexdig = '0123456789ABCDEF';

Color.fromString = function (literal) {
    var color = new Color();
    if (!literal) literal = "#ffffffff";

    if (literal.match(Color.REG_EX)) {
        color.r = parseInt(RegExp.$1, 16);
        color.g = parseInt(RegExp.$2, 16);
        color.b = parseInt(RegExp.$3, 16);
        color.a = parseInt(RegExp.$4, 16) / 255;
    } else if (literal.match(Color.REG_EX_NO_ALPHA)) {
        color.r = parseInt(RegExp.$1, 16);
        color.g = parseInt(RegExp.$2, 16);
        color.b = parseInt(RegExp.$3, 16);
        color.a = 1;
    } else if (literal.match(Color.REG_EX_RGBA)) {
        //debug("found rgba()");
        color.r = parseInt(RegExp.$1, 10);
        color.g = parseInt(RegExp.$2, 10);
        color.b = parseInt(RegExp.$3, 10);
        color.a = parseFloat(RegExp.$4, 10);;
        //debug("found rgba(): " + color);
    } else if (literal.match(Color.REG_EX_RGB)) {
        //debug("found rgb()");
        color.r = parseInt(RegExp.$1, 10);
        color.g = parseInt(RegExp.$2, 10);
        color.b = parseInt(RegExp.$3, 10);
        color.a = 1;
        //debug("found rgb(): " + color);
    } if (literal == "transparent") {
        color.r = 0;
        color.g = 0;
        color.b = 0;
        color.a = 0;
        //debug("transparent");
    }

    return color;
};
Color.fromHSV = function (h, s, v) {
    var rgb = Color.HSV2RGB({hue: h, saturation: s, value: v});
    var color = new Color();

    color.r = rgb.r;
    color.g = rgb.g;
    color.b = rgb.b;
    color.a = 1;

    return color;
};
Color.Dec2Hex = function(d) {
    return Color.hexdig.charAt((d-(d%16))/16)+Color.hexdig.charAt(d%16);
}
Color.Hex2Dec = function(h) {
    return parseInt(h, 16);
}

Color.RGB2Hex = function(r,g,b) {
    return Color.Dec2Hex(r) + Color.Dec2Hex(g) + Color.Dec2Hex(b);
}

// RGB2HSV and HSV2RGB are based on Color Match Remix [http://color.twysted.net/]
// which is based on or copied from ColorMatch 5K [http://colormatch.dk/]
Color.HSV2RGB = function(hsv) {
    var rgb = new Object();
    if (hsv.saturation == 0) {
        rgb.r = rgb.g = rgb.b = Math.round(hsv.value * 2.55);
    } else {
        hsv.hue /= 60;
        hsv.saturation /= 100;
        hsv.value /= 100;
        var i = Math.floor(hsv.hue);
        var f = hsv.hue - i;
        var p = hsv.value * (1 - hsv.saturation);
        var q = hsv.value * (1 - hsv.saturation * f);
        var t = hsv.value * (1 - hsv.saturation * (1 - f));
        switch(i) {
        case 0: rgb.r=hsv.value; rgb.g=t; rgb.b=p; break;
        case 1: rgb.r=q; rgb.g=hsv.value; rgb.b=p; break;
        case 2: rgb.r=p; rgb.g=hsv.value; rgb.b=t; break;
        case 3: rgb.r=p; rgb.g=q; rgb.b=hsv.value; break;
        case 4: rgb.r=t; rgb.g=p; rgb.b=hsv.value; break;
        default: rgb.r=hsv.value; rgb.g=p; rgb.b=q;
        }
        rgb.r=Math.round(rgb.r*255);
        rgb.g=Math.round(rgb.g*255);
        rgb.b=Math.round(rgb.b*255);
    }
    return rgb;
}

Color.min3 = function(a,b,c) { return (a<b)?((a<c)?a:c):((b<c)?b:c); }
Color.max3 = function(a,b,c) { return (a>b)?((a>c)?a:c):((b>c)?b:c); }

Color.RGB2HSV = function(rgb) {
    var hsv = new Object();
    var max=Color.max3(rgb.r,rgb.g,rgb.b);
    var dif=max-Color.min3(rgb.r,rgb.g,rgb.b);
    hsv.saturation=(max==0.0)?0:(100*dif/max);
    if (hsv.saturation==0) hsv.hue=0;
    else if (rgb.r==max) hsv.hue=60.0*(rgb.g-rgb.b)/dif;
    else if (rgb.g==max) hsv.hue=120.0+60.0*(rgb.b-rgb.r)/dif;
    else if (rgb.b==max) hsv.hue=240.0+60.0*(rgb.r-rgb.g)/dif;
    if (hsv.hue<0.0) hsv.hue+=360.0;
    hsv.value=Math.round(max*100/255);
    hsv.hue=Math.round(hsv.hue);
    hsv.saturation=Math.round(hsv.saturation);
    return hsv;
}
Color.prototype.toString = function () {
    return this.toRGBString() + Color.Dec2Hex(Math.min(255, Math.round(this.a * 255)));
};
Color.prototype.toRGBString = function () {
    return "#" + Color.Dec2Hex(this.r) + Color.Dec2Hex(this.g) + Color.Dec2Hex(this.b);
};
Color.prototype.toRGBAString = function () {
    return "rgba(" + this.r + ", " + this.g + ", " + this.b + ", " + (Math.round(this.a * 100) / 100) + ")";
};
Color.prototype.shaded = function (percent) {
    var hsv = Color.RGB2HSV(this);
    hsv.value = Math.max(Math.min(hsv.value * (1 - percent), 100), 0);


    var rgb = Color.HSV2RGB(hsv);

    var color = new Color();
    color.r = rgb.r;
    color.g = rgb.g;
    color.b = rgb.b;

    color.a = this.a;
    return color;
};
Color.prototype.hollowed = function (percent) {
    var color = new Color();
    color.r = this.r;
    color.g = this.g;
    color.b = this.b;

    color.a = Math.max(Math.min(this.a * (1 - percent), 1), 0);
    return color;
};
Color.prototype.inverse = function () {
    var color = new Color();

    color.r = 255 - this.r;
    color.g = 255 - this.g;
    color.b = 255 - this.b;
    color.a = this.a;

    return color;
};
Color.prototype.getHSV = function () {
    return Color.RGB2HSV(this); //h: 0..259, s: 0..100, v: 0..100
};
Color.prototype.transparent = function () {
    var color = new Color();
    color.r = this.r;
    color.g = this.g;
    color.b = this.b;

    color.a = 0;
    return color;
};

pencilSandbox.Color = {
    newColor: function () {
        return new Color();
    }
};
for (var p in Color) {
    pencilSandbox.Color[p] = Color[p];
};
