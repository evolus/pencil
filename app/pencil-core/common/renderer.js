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

    var rendererWindow = null;
    var currentRenderHandler = null;


    var queueHandler = new QueueHandler();

    function createRenderTask(event, data) {
        return function(__callback) {
            //Save the svg
            tmp.file({prefix: 'render-', postfix: '.html' }, function (err, path, fd, cleanupCallback) {
                if (err) throw err;

                var svg = data.svg;

                //path
                svg = '<html><head>\n'
 + '<script type="text/javascript">\n'
 + '    var ipcRenderer = require("electron").ipcRenderer;\n'
 + '    ipcRenderer.on("render-scale", function(event, data) {\n'
 + '        var s = data.scale;\n'
 + '        var canvas = document.createElement("canvas");\n'
 + '        canvas.setAttribute("width", data.width * s);\n'
 + '        canvas.setAttribute("height", data.height * s);\n'
 + '        var ctx = canvas.getContext("2d");\n'
 + '\n'
 + '        var img = new Image();\n'
 + '\n'
 + '        img.onload = function () {\n'
 + '            ctx.scale(s, s);\n'
 + '            ctx.drawImage(img, 0, 0);\n'
 + '            ctx.setTransform(1, 0, 0, 1, 0, 0);\n'
 + '            ipcRenderer.send("render-scaled", {url: canvas.toDataURL()});\n'
 + '        };\n'
 + '        img.src = data.url;\n'
 + '    });\n'
 + '    \n'
 + '    window.addEventListener("load", function () {\n'
 + '        window.setTimeout(function() {\n'
 + '            ipcRenderer.send("render-rendered", {});\n'
 + '            console.log("Rendered signaled");\n'
 + '        }, 400);\n'
 + '    }, false);\n'
 + '</script>\n'
 + '</head>\n'
 + '<body style="padding: 0px; margin: 0px;">\n'
 + svg
 + '</body>\n'
 + '</html>\n';
                fs.writeFileSync(path, svg, "utf8");

                console.log(svg);

                console.log("SAVED to: ", path);

                rendererWindow.setContentSize(data.width, data.height, false);
                rendererWindow.loadURL("file://" + path);

                var capturePendingTaskId = null;

                currentRenderHandler = function (renderedEvent) {
                    capturePendingTaskId = null;
                    rendererWindow.capturePage(function (nativeImage) {
                        var dataURL = nativeImage.toDataURL();
                        console.log("CAPTURED", dataURL.length);

                        cleanupCallback();
                        currentRenderHandler = null;

                        if (data.scale != 1) {
                            console.log("Got initial data, new request for scaling to " + data.scale);
                            ipcMain.once("render-scaled", function (scaledEvent, renderedData) {
                                console.log("Got scale response, size: " + renderedData.url.length);
                                event.sender.send("render-response", renderedData.url);
                                __callback();
                            });
                            renderedEvent.sender.send("render-scale", {
                                url: dataURL,
                                width: data.width,
                                height: data.height,
                                scale: data.scale
                            });
                        } else {
                            event.sender.send("render-response", dataURL);
                            __callback();
                        }
                    });
                };

            });
        };
    }

    function init() {

        rendererWindow = new BrowserWindow({x: 0, y: 0, enableLargerThanScreen: true, show: false, frame: false, autoHideMenuBar: true, webPreferences: {webSecurity: false, defaultEncoding: "UTF-8"}});
        rendererWindow.webContents.openDevTools();
        // rendererWindow.webContents.on("did-finish-load", function () {
        //     // if (currentRenderHandler) currentRenderHandler();
        // });



        // rendererWindow.webContents.beginFrameSubscription(function (frameBuffer) {
        //     console.log("Got frameBuffer at: " + new Date().getTime() + ", frameBuffer: " + frameBuffer.length);
        //     if (capturePendingTaskId) clearTimeout(capturePendingTaskId);
        //     capturePendingTaskId = setTimeout(currentRenderHandler, 500);
        // });

        ipcMain.on("render-request", function (event, data) {
            queueHandler.submit(createRenderTask(event, data));
        });

        ipcMain.on("render-rendered", function (event, data) {
            if (currentRenderHandler) currentRenderHandler(event);
        });

        console.log("RENDERER started.");
    }
    function initOutProcessCanvasBasedRenderer() {
        var canvasWindow = new BrowserWindow({x: 0, y: 0, enableLargerThanScreen: true, show: false, autoHideMenuBar: true, webPreferences: {webSecurity: false, defaultEncoding: "UTF-8"}});
        var url = "file://" + app.getAppPath() + "/renderer.xhtml";
        canvasWindow.loadURL(url);
        // canvasWindow.webContents.openDevTools();
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
        ipcMain.once("canvas-render-init", function (event, data) {
            initOutProcessCanvasBasedRenderer();
        });
    }


    return { start: start };
}();
