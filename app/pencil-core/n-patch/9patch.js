function Walker() {
    this.segments = [];
    this.currentSegment = null;
    this.i = -1;
};

Walker.prototype.step = function (alpha) {
    this.i ++;
    if (!this.currentSegment || this.currentSegment.alpha != alpha) {
        this.currentSegment = {
            start: this.i,
            end: this.i,
            alpha: alpha
        };
        
        this.segments.push(this.currentSegment);
    } else {
        this.currentSegment.end = this.i;
    }
};

var NinePatch = {};

function Point(x, y) {
    this.x = x;
    this.y = y;
}

NinePatch.start = function (imageUrl) {
/*
    var container = document.getElementById("imageContainer");
    container.innerHTML = "";
    var image = document.createElement("img");
    image.onload = function () {
        NinePatch.createPatches(image);
    };
    container.appendChild(image);
    image.src = imageUrl;
*/
    var image = getSourceImageContainer().firstChild;
    NinePatch.createPatches(image);
};

function handleImageLoad () {
    var image = getSourceImageContainer().firstChild;
    var path = document.getElementById("path");
    var html = "<strong>Path:</strong><br/>";
    html += image.src;
    html += "<br/><strong>Size: </strong>" + (image.width - 2) + " x " + (image.height - 2);
    path.innerHTML = html;
    NinePatch.createPatches(image);
};

NinePatch.createPatches = function (image) {
    var w = image.width;
    var h = image.height;
    
    var canvas = document.getElementById("canvas");
    var parsedImageContainer = document.getElementById("parsedImageContainer");
    parsedImageContainer.innerHTML = "";
    
    canvas.setAttribute("width", w);
    canvas.setAttribute("height", h);
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, w, h);
    
    context.drawImage(image, 0, 0, w, h);
    var imageData = context.getImageData(0, 0, w, h);
    
    //parsing n-patch markers
    var hWalker = new Walker();
    for (var i = 1; i < w - 1; i ++) {
        hWalker.step(getPixel(imageData, i, 0).a);
    }
    
    var vWalker = new Walker();
    for (var i = 1; i < h - 1; i ++) {
        vWalker.step(getPixel(imageData, 0, i).a);
    }

    var p1 = new Point(0, 0);
    var p2 = new Point(0, 0);
    
    var walker = new Walker();
    for (var i = 1; i < w - 1; i ++) {
        walker.step(getPixel(imageData, i, h - 1).a);
    }
    if (walker.segments.length == 1 && walker.segments[0].alpha == 0) {
        p1.x = 0;
        p2.x = w - 2;
    } else {
        if (walker.segments[0].alpha == 0) {
            p1.x = walker.segments[0].end + 1;
        } else {
            p1.x = 0;
        }
        
        if (walker.segments[walker.segments.length - 1].alpha == 0) {
            p2.x = walker.segments[walker.segments.length - 1].start;
        } else {
            p2.x = w - 2;
        }
    }

    var walker = new Walker();
    for (var i = 1; i < h - 1; i ++) {
        walker.step(getPixel(imageData, w - 1, i).a);
    }
    if (walker.segments.length == 1 && walker.segments[0].alpha == 0) {
        p1.y = 0;
        p2.y = h - 2;
    } else {
        if (walker.segments[0].alpha == 0) {
            p1.y = walker.segments[0].end + 1;
        } else {
            p1.y = 0;
        }
        
        if (walker.segments[walker.segments.length - 1].alpha == 0) {
            p2.y = walker.segments[walker.segments.length - 1].start;
        } else {
            p2.y = h - 2;
        }
    }


    NinePatch.data = {
        w: w - 2,
        h: h - 2,
        p1: p1,
        p2: p2,
        patches: []
    };
    var result= document.getElementById("result");
    result.innerHTML = "";
    
    var lastScaleX = -1;
    var lastScaleY = -1;
    for (var j = 0; j < vWalker.segments.length; j ++) {
        var vs = vWalker.segments[j];
        NinePatch.currentRow = [];
        NinePatch.data.patches.push(NinePatch.currentRow);
        for (var i = 0; i < hWalker.segments.length; i ++) {
            var hs = hWalker.segments[i];
            createPatch(image, new Point(hs.start + 1, vs.start + 1), new Point(hs.end + 2, vs.end + 2), hs.alpha > 0, vs.alpha > 0);
            if (hs.alpha > 0 && i > lastScaleX) lastScaleX = i;
        }
        if (vs.alpha > 0 && j > lastScaleY) lastScaleY = j;
        parsedImageContainer.appendChild(document.createElement("br"));
    }
    
    NinePatch.data.lastScaleX = lastScaleX;
    NinePatch.data.lastScaleY = lastScaleY;
    
    
    
    /*
    createPatch(image, new Point(s1.x, 0), new Point(s2.x, s1.y));
    createPatch(image, new Point(s2.x, 0), new Point(w, s1.y));
    
    document.getElementById("result").appendChild(document.createElement("br"));
    createPatch(image, new Point(0, s1.y), new Point(s1.x, s2.y));
    createPatch(image, new Point(s1.x, s1.y), new Point(s2.x, s2.y));
    createPatch(image, new Point(s2.x, s1.y), new Point(w, s2.y));
    
    document.getElementById("result").appendChild(document.createElement("br"));
    createPatch(image, new Point(0, s2.y), new Point(s1.x, h));
    createPatch(image, new Point(s1.x, s2.y), new Point(s2.x, h));
    createPatch(image, new Point(s2.x, s2.y), new Point(w, h));
    
    */
    
    var js = JSON.stringify(NinePatch.data);
    
    var textarea = document.createElement("textarea");
    textarea.value = js;
    result.appendChild(textarea);
    textarea.select();
    textarea.focus();
};

function getPixel(imageData, x, y) {
    var base = (x + y * imageData.width) * 4;
    return {
        r: imageData.data[base],
        g: imageData.data[base + 1],
        b: imageData.data[base + 2],
        a: imageData.data[base + 3]
    };
}

function createPatch(srcImage, p1, p2, scaleX, scaleY) {
    var canvas = document.getElementById("canvas");
    var w = p2.x - p1.x;
    var h = p2.y - p1.y;
    
    canvas.setAttribute("width", w);
    canvas.setAttribute("height", h);
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, w, h);
    
    context.drawImage(srcImage, p1.x, p1.y, w, h, 0, 0, w, h);
    var data = canvas.toDataURL("image/png");
    appendResult(data, w, h, scaleX, scaleY);
}
function appendResult(data, w, h, scaleX, scaleY) {
    var result= document.getElementById("parsedImageContainer");
    var img = document.createElement("img");
    
    img.setAttribute("width", w);
    img.setAttribute("height", h);
    img.src = data;
    result.appendChild(img);
    
    var patch = {
        url: data,
        w: w,
        h: h,
        scaleX: scaleX,
        scaleY: scaleY
    };
    NinePatch.currentRow.push(patch);
}

function browse() {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, "Open .9.png", nsIFilePicker.modeOpen);
    fp.appendFilter("Android n-Patch (*.9.png)", "*.9.png");
    fp.appendFilter("All files", "*");

    if (fp.show() != nsIFilePicker.returnOK) return;

    var image = document.createElement("img");
    getSourceImageContainer().innerHTML = "";
    getSourceImageContainer().appendChild(image);
    
    var ios = Components.classes["@mozilla.org/network/io-service;1"].  
          getService(Components.interfaces.nsIIOService);  
    var url = ios.newFileURI(fp.file);
    image.onload = handleImageLoad;
    image.src = url.spec + "?time=" + new Date().getTime();
}

function getSourceImageContainer() {
    return document.getElementById("imageContainer");
}

function test() {
    var cases = [
        ["#off", "#on"],
        ["disabled", null],
        ["focused", "pressed", null],
        ["holo_dark.png", "holo_light.png"]
    ];
    
    function gen(i) {
        var b = cases[i];
        var result = [];
        if (i == cases.length - 1) {
            for (var j = 0; j < b.length; j ++) {
                result.push(name(b[j]));
            }
        } else {
            var r = gen(i + 1);
            for (var j = 0; j < b.length; j ++) {
                for (var k = 0; k < r.length; k ++) {
                    result.push(name(b[j]) + r[k]);
                }
            }
        }
        return result;
    }
    
    return gen(0);
}

function name(x) {
    if (x) return "_" + x;
    return "";
}
