// @background, @electron-specific
//      dispite the name, this is a background module and is not intended to be used in renderer processes

module.exports = function () {

    const ipcMain = require('electron').ipcMain;
    const tmp = require("tmp");
    const fs = require("fs");

    const electron = require('electron');
    const app = electron.app;
    const BrowserWindow = electron.BrowserWindow;
    var QueueHandler = require("./QueueHandler");
    var sharedUtil = require("./shared-util");

    var rendererWindow = null;
    var currentRenderHandler = null;
    var fontFaceCSS = "";


    var queueHandler = new QueueHandler(100);

    var extraJS = (
        function resolve(prefix) {
            return {
                p: "http://www.evolus.vn/Namespace/Pencil",
                svg: "http://www.w3.org/2000/svg"
            }[prefix];
        }
    ).toString() + "\n"
    + (
        function getList(xpath, node) {
            var doc = node.ownerDocument ? node.ownerDocument : node;
            var xpathResult = doc.evaluate(xpath, node, resolve, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
            var nodes = [];
            var next = xpathResult.iterateNext();
            while (next) {
                nodes.push(next);
                next = xpathResult.iterateNext();
            }

            return nodes;
        }

    ).toString() + "\n"
    + (
        function postProcess() {
            var objects = getList("//svg:g[@p:RelatedPage]", document);
            objects.reverse();
            window.objectsWithLinking = [];

            for (var g of objects) {
                var dx = 0; //rect.left;
                var dy = 0; //rect.top;

                rect = g.getBoundingClientRect();
                var linkingInfo = {
                    pageId: g.getAttributeNS("http://www.evolus.vn/Namespace/Pencil", "RelatedPage"),
                    geo: {
                        x: rect.left - dx,
                        y: rect.top - dy,
                        w: rect.width,
                        h: rect.height
                    }
                };
                if (!linkingInfo.pageId) continue;

                window.objectsWithLinking.push(linkingInfo);
            }

        }
    ).toString();

    function createRenderTask(event, data) {
        return function(__callback) {
            //Save the svg
            tmp.file({prefix: 'render-', postfix: '.xhtml' }, function (err, path, fd, cleanupCallback) {
                if (err) throw err;

                var svg = data.svg;
                var delay = 50;
                console.log("data.scale", data.scale);
                var scale = typeof(data.scale) == "number" ? data.scale : 1;
                
                var bgColor = (data.options && data.options.backgroundColor) ? data.options.backgroundColor : "transparent";
                
                var extraCSS = `
                    body {
                        background-color: ${bgColor} !important;
                        overflow: hidden;
                        transform: scale(${scale});
                        transform-origin: left top;
                    }
                    svg {
                        line-height: 1.428;
                    }
                ` + fontFaceCSS;
                
                //path
                svg = '<?xml version="1.0" encoding="UTF-8"?>\n'
 + '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"\n'
 + '    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n'
 + '<html xmlns="http://www.w3.org/1999/xhtml"><head>\n'
 + '<style type="text/css">\n'
 + extraCSS + "\n"
 + '</style>\n'
 + '<script type="text/javascript">\n'
 + extraJS + '\n'
 + '    var ipcRenderer = require("electron").ipcRenderer;\n'
 + '    window.addEventListener("load", function () {\n'
 + '        postProcess();\n'
 + '        window.setTimeout(function () {\n'
 + '            window.requestAnimationFrame(function () {\n'
 + '                window.requestAnimationFrame(function () {\n'
 + '                    window.setTimeout(function () {\n'
     + '                    ipcRenderer.send("render-rendered", {objectsWithLinking: window.objectsWithLinking});\n'
     + '                    console.log("Rendered signaled");\n'
     + '                }, 10);\n'
 + '                });\n'
 + '            });\n'
 + '        }, ' + delay + ');\n'
 + '    }, false);\n'
 + '</script>\n'
 + '</head>\n'
 + '<body style="padding: 0px; margin: 0px;">\n'
 + svg
 + '</body>\n'
 + '</html>\n';
                fs.writeFileSync(path, svg, "utf8");

                rendererWindow.setSize(Math.round(data.width * scale), Math.round(data.height * scale), false);

                var url = "file://" + path;
                rendererWindow.loadURL(url);

                var capturePendingTaskId = null;

                currentRenderHandler = function (renderedEvent, renderedData) {
                    capturePendingTaskId = null;
                    if (data.options && data.options.linksOnly) {
                        cleanupCallback();
                        currentRenderHandler = null;
                        event.sender.send(data.id, {url: "", objectsWithLinking: renderedData.objectsWithLinking});
                        __callback();
                    } else {
                        rendererWindow.capturePage().then(function (nativeImage) {
                            var dataURL = nativeImage.toDataURL();

                            cleanupCallback();
                            currentRenderHandler = null;
                            event.sender.send(data.id, {url: dataURL, objectsWithLinking: renderedData.objectsWithLinking});
                            __callback();
                        });
                    }
                };

            });
        };
    }

    var initialized = false;

    function init() {

        if (rendererWindow) {
            try {
                rendererWindow.destroy();
            } catch (e) {}
        }

        rendererWindow = new BrowserWindow({
            x: 0, y: 0,
            useContentSize: true,
            enableLargerThanScreen: true,
            show: false,
            frame: false,
            autoHideMenuBar: true,
            transparent: true,
            webPreferences: {
                webSecurity: false,
                allowRunningInsecureContent: true,
                allowDisplayingInsecureContent: true,
                defaultEncoding: "UTF-8",
                nodeIntegration: true
            }
        });
        // rendererWindow.webContents.openDevTools();

        queueHandler.tasks = [];

        if (!initialized) {
            ipcMain.on("render-request", function (event, data) {
                queueHandler.submit(createRenderTask(event, data));
            });

            ipcMain.on("render-rendered", function (event, data) {
                setTimeout(function () {
                    if (currentRenderHandler) currentRenderHandler(event, data);
                }, 100);
            });

            ipcMain.on("font-loading-request", function (event, data) {
                fontFaceCSS = sharedUtil.buildFontFaceCSS(data.faces);
                event.sender.send(data.id, {});
            });
            console.log("RENDERER started.");
        } else {
            console.log("RENDERER re-started.");
        }
        rendererWindow.loadURL("about:blank");
        
        initialized = true;
    }
    function initOutProcessCanvasBasedRenderer() {
        var canvasWindow = new BrowserWindow({x: 0, y: 0, enableLargerThanScreen: true, show: false, autoHideMenuBar: true, webPreferences: {webSecurity: false, defaultEncoding: "UTF-8"}});
        var url = "file://" + app.getAppPath() + "/renderer.xhtml";
        canvasWindow.loadURL(url);

        var devEnable = false;
        if (process.argv.indexOf("--enable-dev") >= 0) {
            devEnable = true;
        } else if (process.env.PENCIL_ENV === "development") {
            devEnable = true;
        }

        if (devEnable) {
            canvasWindow.webContents.openDevTools();
        }
        // canvasWindow.show();

        ipcMain.on("canvas-render-request", function (event, data) {
            console.log("RASTER: Forwarding render request for " + data.id);
            canvasWindow.webContents.send("canvas-render-request", data);
        });
        ipcMain.on("canvas-render-response", function (event, data) {
            console.log("RASTER: Forwarding render result for " + data.id);
            global.mainWindow.webContents.send(data.id, {url: data.url, objectsWithLinking: data.objectsWithLinking});
        });

        ipcMain.on("font-loading-request", function (event, data) {
            canvasWindow.webContents.send("font-loading-request", data);
        });
        ipcMain.on("font-loading-response", function (event, data) {
            global.mainWindow.webContents.send(data.id, data);
        });

        console.log("OUT-PROCESS CANVAS RENDERER started.");
    }

    function start() {
        ipcMain.once("render-init", function (event, data) {
            init();
        });
        ipcMain.on("render-restart", function (event, data) {
            init();
        });
        ipcMain.once("canvas-render-init", function (event, data) {
            initOutProcessCanvasBasedRenderer();
        });
    }


    return { start: start };
}();
