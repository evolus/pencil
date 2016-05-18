function init() {
    const ipcRenderer = require("electron").ipcRenderer;
    const fs = require("fs");
    const path = require("path");
    const xlink = "http://www.w3.org/1999/xlink";

    function QueueHandler() {
        this.tasks = [];
    }

    QueueHandler.prototype.submit = function (task) {
        this.tasks.push(task);

        if (this.tasks.length == 1) this.start();
    }

    QueueHandler.prototype.start = function (task) {

        var next = function() {
            if (this.tasks.length <= 0) return;
            var task = this.tasks.pop();
            task(next);
        }.bind(this);

        next();
    }

    function getList(xpath, node) {
        var doc = node.ownerDocument ? node.ownerDocument : node;
        var xpathResult = doc.evaluate(xpath, node, PencilNamespaces.resolve, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        var nodes = [];
        var next = xpathResult.iterateNext();
        while (next) {
            nodes.push(next);
            next = xpathResult.iterateNext();
        }

        return nodes;
    }

    var queueHandler = new QueueHandler();
    var parser = new DOMParser();
    var serializer = new XMLSerializer();

    function rasterize(svgNode, width, height, s, processLinks, callback) {
        var images = svgNode.querySelectorAll("image");
        var totalImageLength = 0;
        var objectsWithLinking = [];

        var tasks = [];

        for (var i = 0; i < images.length; i ++) {
            var image = images[i];
            var href = image.getAttributeNS(xlink, "href");
            if (href && href.match("^file://(.+)$")) {
                var sourcePath = decodeURI(RegExp.$1);

                if (process.platform === "win32") {
                    if (sourcePath.startsWith("/")) sourcePath = sourcePath.substring(1);
                    sourcePath = sourcePath.replace(/\//g, "\\");
                }

                try {
                    fs.accessSync(sourcePath, fs.R_OK);
                } catch (e) {
                    continue;
                }

                tasks.push({
                    image: image,
                    sourcePath: sourcePath
                });
            }
        }

        var index = -1;
        function convertNext() {
            index ++;
            if (index >= tasks.length) {
                onConversionDone();
                return;
            }

            var sourcePath = tasks[index].sourcePath;
            var image = tasks[index].image;

            var ext = (path.extname(sourcePath) || ".jpg").toLowerCase();
            var mime = "image/jpeg";
            if (ext == ".png") mine = "image/png";

            fs.readFile(sourcePath, function (error, bitmap) {
                console.time("BASE64");
                var url = "data:" + mime + ";base64," + new Buffer(bitmap).toString("base64");
                console.timeEnd("BASE64");

                console.time("UPDATE HREF");
                image.setAttributeNS(xlink, "href", url);
                console.timeEnd("UPDATE HREF");
                totalImageLength += url.length;
                console.log("converted " + href + " -> " + url.length);

                convertNext();
            });
        }

        function postProcess() {
            //parse for linking location on this page
            if (processLinks) {
                document.body.appendChild(svgNode.documentElement);
                var objects = getList(".//svg:g[@p:RelatedPage]", document);
                objects.reverse();

                for (var i = 0; i < objects.length; i ++) {
                    var g = objects[i];

                    var dx = 0; //rect.left;
                    var dy = 0; //rect.top;

                    var owner = g.ownerSVGElement;

                    if (owner.parentNode && owner.parentNode.getBoundingClientRect) {
                        var rect = owner.parentNode.getBoundingClientRect();
                        dx = rect.left;
                        dy = rect.top;
                    }

                    rect = g.getBoundingClientRect();
                    var linkingInfo = {
                        pageId: g.getAttributeNS(PencilNamespaces.p, "RelatedPage"),
                        geo: {
                            x: rect.left - dx,
                            y: rect.top - dy,
                            w: rect.width,
                            h: rect.height
                        }
                    };
                    if (!linkingInfo.pageId) continue;

                    console.log("Linking info: ", linkingInfo);
                    objectsWithLinking.push(linkingInfo);
                }
            }

        }

        function onConversionDone() {
            // it looks like that the bigger images embedded, the longer time we need to wait for the image to be fully painted into the canvas
            var delay = Math.max(500, totalImageLength / 30000);
            console.log("DELAY -> " + delay + " ms");

            var canvas = document.createElement("canvas");
            canvas.setAttribute("width", width * s);
            canvas.setAttribute("height", height * s);
            var ctx = canvas.getContext("2d");

            var img = new Image();

            img.onload = function () {
                ctx.save();
                ctx.scale(s, s);
                ctx.drawImage(img, 0, 0);
                ctx.setTransform(1, 0, 0, 1, 0, 0);

                setTimeout(function () {
                    postProcess();
                    callback(canvas.toDataURL());
                    ctx.restore();
                    img.onload = null;
                    img.src = "";
                }, delay);
            };

            var svg = serializer.serializeToString(svgNode);

            console.time("SETTING SRC");
            img.setAttribute("src", "data:image/svg+xml;charset=utf-8," + svg);
            console.timeEnd("SETTING SRC");
        }

        convertNext();
    }

    function createRenderTask(event, data) {
        return function(__callback) {
            //parse the SVG back into DOM
            var svgNode = parser.parseFromString(data.svg, "text/xml");
            rasterize(svgNode, data.width, data.height, data.scale, data.processLinks, function (dataURL) {
                console.log("RASTER: Returning render result for " + data.id);
                ipcRenderer.send("canvas-render-response", {url: dataURL, id: data.id, objectsWithLinking: data.objectsWithLinking});
                __callback();
            });
        };
    }


    ipcRenderer.on("canvas-render-request", function (event, data) {
        queueHandler.submit(createRenderTask(event, data));
    });

    console.log("RENDERER started.");
}

window.addEventListener("load", init, false);
