function NPatchDialog() {
    Dialog.call(this);
    this.title="N-Patch script generator";

    var thiz = this;
    this.bind("click", function() {
            dialog.showOpenDialog({
                title: "Open Nine Patch File",
                defaultPath: os.homedir(),
                filters: [
                    { name: "Android n-Patch", extensions: ["png"] },
                    { name: "All files", extensions: ["*"]}
                ]
            }, function (filenames) {
                console.log(filenames);
                if (!filenames || filenames.length <= 0) return;

                thiz.sourceImageContainer.innerHTML="";
                thiz.parsedImageContainer.innerHTML="";
                var img = Dom.newDOMElement({
                    _name: "img",
                    src: filenames + "?time=" + new Date().getTime()
                });
                img.onload = function () {
                    thiz.handleImageLoad(img);
                };
                thiz.sourceImageContainer.appendChild(img);
                // window.setTimeout(function () {
                //     thiz.handleImageLoad(img);
                // }, 100);
            });
    },this.browse)

    this.bind("click",function() {
        thiz.result.select();
    }, this.result);


    function openExternalLink(url) {
        require("shell").openExternal(url);
    }
    this.bind("click", function () {
        openExternalLink("http://developer.android.com/guide/topics/graphics/2d-graphics.html#nine-patch");
    }, this.aboutNPatchLink);

    this.bind("click", function () {
        openExternalLink("http://www.pencil-project.org/wiki/devguide/Tutorial/Nine_Patches.html");
    }, this.usageNPatchLink);
};

__extend(Dialog, NPatchDialog);

NPatchDialog.prototype.handleImageLoad = function (img) {
    var image = img;
    var path = this.path;
    var html = "<strong>Path:</strong>";
    html += image.src;
    html += "<strong>Size: </strong>" + (image.width - 2) + " x " + (image.height - 2);
    path.innerHTML = html;
    this.createPatches(img);
}

NPatchDialog.prototype.setup = function () {

};

NPatchDialog.prototype.getDialogActions = function () {
    return [
        {
            type: "cancel", title: "Close",
            isCloseHandler: true,
            run: function () { return true; }
        }
    ]
};

NPatchDialog.prototype.getPixel = function(imageData, x, y) {
    var base = (x + y * imageData.width) * 4;
    return {
        r: imageData.data[base],
        g: imageData.data[base + 1],
        b: imageData.data[base + 2],
        a: imageData.data[base + 3]
    };
}

NPatchDialog.prototype.createPatch = function(srcImage, p1, p2, scaleX, scaleY, container) {
    var canvas = this.canvas;
    var w = p2.x - p1.x;
    var h = p2.y - p1.y;

    canvas.setAttribute("width", w);
    canvas.setAttribute("height", h);
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, w, h);

    context.drawImage(srcImage, p1.x, p1.y, w, h, 0, 0, w, h);
    var data = canvas.toDataURL("image/png");
    this.appendResult(data, w, h, scaleX, scaleY, container);
}

NPatchDialog.prototype.appendResult = function (data, w, h, scaleX, scaleY, container) {
    var result = container ? container : this.parsedImageContainer;
    var img = Dom.newDOMElement({
        _name: "img",
        src: data
    });

    img.setAttribute("width", w);
    img.setAttribute("height", h);
    result.appendChild(img);

    var patch = {
        url: data,
        w: w,
        h: h,
        scaleX: scaleX,
        scaleY: scaleY
    };
    this.currentRow.push(patch);
}

NPatchDialog.prototype.createPatches = function (image) {
    var w = image.width;
   var h = image.height;

   var canvas = this.canvas;
   var parsedImageContainer = this.parsedImageContainer;
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
       hWalker.step(this.getPixel(imageData, i, 0).a);
   }

   var vWalker = new Walker();
   for (var i = 1; i < h - 1; i ++) {
       vWalker.step(this.getPixel(imageData, 0, i).a);
   }

   var p1 = new Point(0, 0);
   var p2 = new Point(0, 0);

   var walker = new Walker();
   for (var i = 1; i < w - 1; i ++) {
       walker.step(this.getPixel(imageData, i, h - 1).a);
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
       walker.step(this.getPixel(imageData, w - 1, i).a);
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

   this.data = {
       w: w - 2,
       h: h - 2,
       p1: p1,
       p2: p2,
       patches: []
   };
   var result= this.result;
   result.innerHTML = "";

   var lastScaleX = -1;
   var lastScaleY = -1;
   for (var j = 0; j < vWalker.segments.length; j ++) {
       var vs = vWalker.segments[j];
       this.currentRow = [];
       this.data.patches.push(this.currentRow);
       var hbox = Dom.newDOMElement({_name: "hbox"});
       parsedImageContainer.appendChild(hbox);
       for (var i = 0; i < hWalker.segments.length; i ++) {
           var hs = hWalker.segments[i];
           this.createPatch(image, new Point(hs.start + 1, vs.start + 1), new Point(hs.end + 2, vs.end + 2), hs.alpha > 0, vs.alpha > 0, hbox);
           if (hs.alpha > 0 && i > lastScaleX) lastScaleX = i;
       }
       if (vs.alpha > 0 && j > lastScaleY) lastScaleY = j;
    //    parsedImageContainer.appendChild(document.createElement("br"));
   }

   this.data.lastScaleX = lastScaleX;
   this.data.lastScaleY = lastScaleY;



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

    var js = JSON.stringify(this.data);
    this.result.value = js;

    this.sourceImageContainer.style.height = parsedImageContainer.offsetHeight + "px";
    this.result.select();
    this.result.focus();

};

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
