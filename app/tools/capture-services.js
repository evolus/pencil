function BaseCaptureService() {

}

BaseCaptureService.MODE_AREA = "area";
BaseCaptureService.MODE_WINDOW = "window";
BaseCaptureService.MODE_FULLSCREEN = "fullscreen";

BaseCaptureService.OUTPUT_CLIPBOARD = "clipboard";
BaseCaptureService.OUTPUT_FILE = "file";

Config.CAPTURE_ACTIVE_PROVIDER_ID = Config.define("capture.active_provider_id", "");

function BaseCmdCaptureService() {
    BaseCaptureService.call(this);
}

BaseCmdCaptureService.prototype = new BaseCaptureService();

BaseCmdCaptureService.prototype.capture = function (options) {
    var thiz = this;
    return new Promise(function (resolve, reject) {
        var cmd = thiz.buildCommandLine(options);
        require("child_process").execFile(cmd.path, cmd.args, function (error) {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};


function GnomeScreenshotService() {
    BaseCmdCaptureService.call(this);

    this.id = "GnomeScreenshotService";
    this.supportPointerHiding = true;
}

GnomeScreenshotService.prototype = new BaseCmdCaptureService();

Config.CAPTURE_GNOME_EXEC_PATH = Config.define("capture.gnome_screenshot.exec_path", "/usr/bin/gnome-screenshot");

GnomeScreenshotService.prototype.buildCommandLine = function (options) {
    var cmd = {
        path: this.getExecPath(),
        args: []
    };

    if (options.mode == BaseCaptureService.MODE_AREA) cmd.args.push("-a");
    if (options.mode == BaseCaptureService.MODE_WINDOW) cmd.args.push("-w");

    if (options.outputType == BaseCaptureService.OUTPUT_CLIPBOARD) {
         cmd.args.push("-c");
    } else {
        cmd.args.push("-f");
        cmd.args.push(options.outputPath);
    }

    if (options.includePointer && this.supportPointerHiding) cmd.args.push("-p");

    return cmd;
};
GnomeScreenshotService.prototype.getExecPath = function () {
    return Config.get(Config.CAPTURE_GNOME_EXEC_PATH);
};
GnomeScreenshotService.prototype.isSupported = function (options) {
    return process.platform == "linux" && fs.existsSync(this.getExecPath());
};


function MacScreenshotService() {
    BaseCmdCaptureService.call(this);

    this.id = "MacScreenshotService";
    this.supportPointerHiding = true;
}

MacScreenshotService.prototype = new BaseCmdCaptureService();

Config.CAPTURE_MAC_EXEC_PATH = Config.define("capture.mac_screenshot.exec_path", "/usr/sbin/screencapture");

MacScreenshotService.prototype.buildCommandLine = function (options) {
    var cmd = {
        path: this.getExecPath(),
        args: []
    };

    if (options.mode == BaseCaptureService.MODE_AREA) {
        cmd.args.push("-i");
        cmd.args.push("-s");
    }
    if (options.mode == BaseCaptureService.MODE_WINDOW) {
        cmd.args.push("-i");
        cmd.args.push("-w");
        cmd.args.push("-W");
    }

    if (options.includePointer) cmd.args.push("-C");

    if (options.outputType == BaseCaptureService.OUTPUT_CLIPBOARD) {
         cmd.args.push("-c");
    } else {
         cmd.args.push(options.outputPath);
    }

    return cmd;
};
MacScreenshotService.prototype.getExecPath = function () {
    return Config.get(Config.CAPTURE_MAC_EXEC_PATH);
};
MacScreenshotService.prototype.isSupported = function (options) {
    return process.platform == "darwin" && fs.existsSync(this.getExecPath());
};


function WindowsSnippingToolScreenshotService() {
    BaseCmdCaptureService.call(this);

    this.id = "WindowsSnippingToolScreenshotService";
    this.supportPointerHiding = true;
}

WindowsSnippingToolScreenshotService.prototype = new BaseCmdCaptureService();

Config.CAPTURE_SNIPPING_TOOL_EXEC_PATH = Config.define("capture.snippingtool_screenshot.exec_path", process.env.windir + "\\system32\\SnippingTool.exe");

WindowsSnippingToolScreenshotService.prototype.buildCommandLine = function (options) {
    var cmd = {
        path: this.getExecPath(),
        args: []
    };

    if (options.mode == BaseCaptureService.MODE_AREA) cmd.args.push("/clip");
    if (options.mode == BaseCaptureService.MODE_WINDOW) cmd.args.push("-w");

    if (options.outputType == BaseCaptureService.OUTPUT_CLIPBOARD) {
         cmd.args.push("-c");
    } else {
        cmd.args.push("-f");
        cmd.args.push(options.outputPath);
    }

    if (options.includePointer && this.supportPointerHiding) cmd.args.push("-p");

    return cmd;
};
WindowsSnippingToolScreenshotService.prototype.getExecPath = function () {
    return Config.get(Config.CAPTURE_SNIPPING_TOOL_EXEC_PATH);
};
WindowsSnippingToolScreenshotService.prototype.isSupported = function (options) {
    return process.platform == "win32" && fs.existsSync(this.getExecPath());
};

function GenericCmdCaptureService() {
    BaseCmdCaptureService.call(this);

    this.id = "GenericScreenshotService";
    this.supportPointerHiding = false;
}

GenericCmdCaptureService.prototype = new BaseCmdCaptureService();

Config.CAPTURE_GENERIC_TOOL_EXEC_PATH = Config.define("capture.generic_capture.exec_path", "");
Config.CAPTURE_GENERIC_TOOL_AREA_MODE_OPTION = Config.define("capture.generic_capture.options.area_mode", "");
Config.CAPTURE_GENERIC_TOOL_WINDOW_MODE_OPTION = Config.define("capture.generic_capture.options.window_mode", "");
Config.CAPTURE_GENERIC_TOOL_FULLSCREEN_MODE_OPTION = Config.define("capture.generic_capture.options.fullscreen_mode", "");
Config.CAPTURE_GENERIC_TOOL_CLIPBOARD_OUTPUT_OPTION = Config.define("capture.generic_capture.options.clipboard_output", "");
Config.CAPTURE_GENERIC_TOOL_FILE_OUTPUT_OPTION = Config.define("capture.generic_capture.options.file_output", "");

GenericCmdCaptureService.prototype.buildCommandLine = function (options) {
    var cmd = {
        path: this.getExecPath(),
        args: []
    };
    var opt = Config.get(Config.CAPTURE_GENERIC_TOOL_FULLSCREEN_MODE_OPTION);
    
    if (options.mode == BaseCaptureService.MODE_AREA) {
        opt = Config.get(Config.CAPTURE_GENERIC_TOOL_AREA_MODE_OPTION);
    } else if (options.mode == BaseCaptureService.MODE_WINDOW) {
        opt = Config.get(Config.CAPTURE_GENERIC_TOOL_WINDOW_MODE_OPTION);
    }
    
    if (opt) cmd.args.push(opt);
    
    if (options.outputType == BaseCaptureService.OUTPUT_CLIPBOARD) {
        opt = Config.get(Config.CAPTURE_GENERIC_TOOL_CLIPBOARD_OUTPUT_OPTION);
        if (opt) cmd.args.push(opt);
    } else {
        opt = Config.get(Config.CAPTURE_GENERIC_TOOL_FILE_OUTPUT_OPTION);
        if (opt) {
            opt.split(/[ ]+/gi).forEach(function (p) {
                if (p == "%f") {
                    cmd.args.push(options.outputPath);
                } else {
                    cmd.args.push(p);
                }
            });
        }
    }

    return cmd;
};
GenericCmdCaptureService.prototype.getExecPath = function () {
    return Config.get(Config.CAPTURE_GENERIC_TOOL_EXEC_PATH);
};
GenericCmdCaptureService.prototype.isSupported = function (options) {
    return true;
};



function ElectronScreenshotService() {
    BaseCmdCaptureService.call(this);

    this.id = "ElectronScreenshotService";
    this.supportPointerHiding = true;
    this.capabilities = {
        captureArea: true,
        captureWindow: false,
        captureFullscreen: true,
        canHideCursor: false
    };
}

ElectronScreenshotService.prototype = new BaseCmdCaptureService();

ElectronScreenshotService.prototype.capture = function (options) {
    console.log("options", options);
    return new Promise(function (resolve, reject) {
        const { app, BrowserWindow } = require('electron').remote;
        const ipcRenderer = require('electron').ipcRenderer;

        function canvasToFileProcessor(canvas, context) {
            var dataURL = canvas.toDataURL("image/png");
            var ni = nativeImage.createFromDataURL(dataURL);

            var tmp = require("tmp");
            var filePath = tmp.tmpNameSync();
            fs.writeFileSync(filePath, ni.toPNG());

            return filePath;
        };

        var displays = electron.remote.screen.getAllDisplays();

        var imageFilePaths = [];
        var index = -1;
        (function next(){
            index ++;
            if (index >= displays.length) {
                onFinishedCapturing();
                return;
            }

            var display = displays[index];

            new Capturer().captureFullScreenData({
                    x: display.bounds.x,
                    y: display.bounds.y,
                    width: display.bounds.width,
                    height: display.bounds.height,
                    processor: canvasToFileProcessor
                },
                function (filePath, error) {
                    if (!filePath) {
                        reject(error);
                        return;
                    }

                    imageFilePaths[index] = {
                        filePath: filePath,
                        display: display
                    };
                    next();
                });
        })();

        var currentWindow = require('electron').remote.getCurrentWindow();

        function onFinishedCapturing() {
            if (options && options.mode == "fullscreen") {
                if (options.outputType == "file") {
                    fs.createReadStream(imageFilePaths[0].filePath).pipe(fs.createWriteStream(options.outputPath));
                }

                window.setTimeout(resolve, 200);

                return;
            }

            imageFilePaths.forEach(function (info, index) {
                var browserWindow = new BrowserWindow({
                        x: info.display.bounds.x,
                        y: info.display.bounds.y,
                        width: info.display.bounds.width,
                        height: info.display.bounds.height,
                        enableLargerThanScreen: false,
                        show: false,
                        autoHideMenuBar: true,
                        frame: false,
                        transparent: false,
                        alwaysOnTop: true,
                        fullscreen: true,
                        webPreferences: {
                            webSecurity: false,
                            allowRunningInsecureContent: true,
                            allowDisplayingInsecureContent: true,
                            defaultEncoding: "UTF-8",
                            nodeIntegration: true
                        }
                    });

                var url = "file://" + app.getAppPath() + "/screenshot.xhtml?" +
                            "i=" + encodeURIComponent(ImageData.filePathToURL(info.filePath)) +
                            "&index=" + index +
                            "&id=" + currentWindow.id;
                browserWindow.loadURL(url);
                browserWindow.once("ready-to-show", function () {
                    browserWindow.show();
                    browserWindow.focus();
                    browserWindow.setSize(info.display.bounds.width, info.display.bounds.height, false);
                });

                info.browserWindow = browserWindow;
            });
        }

        ipcRenderer.once("region-canceled", function (event, args) {
            imageFilePaths.forEach(function (info) {
                try {
                    info.browserWindow.destroy();
                } catch (e) {}

                try {
                    fs.unlinkSync(info.filePath);
                } catch (e) {}
            });

            reject("canceled");
        });

        ipcRenderer.once("region-selected", function (event, args) {
            console.log("region-selected, args", args);
            imageFilePaths.forEach(function (info) {
                try {
                    info.browserWindow.destroy();
                } catch (e) {}
            });

            var selectedPath = imageFilePaths[args.index].filePath;

            var image = new Image();
            image.onload = function () {
                var canvas = document.createElement("canvas");
                canvas.width = args.width;
                canvas.height = args.height;

                var context = canvas.getContext("2d");
                context.drawImage(image, args.x, args.y, args.width, args.height, 0, 0, args.width, args.height);

                var dataURL = canvas.toDataURL("image/png");
                var ni = nativeImage.createFromDataURL(dataURL);

                fs.writeFileSync(options.outputPath, ni.toPNG());

                canvas = null;
                image.src = "";
                image = null;

                imageFilePaths.forEach(function (info) {
                    try {
                        fs.unlinkSync(info.filePath);
                    } catch (e) {}
                });

                resolve();
            };
            image.src = ImageData.filePathToURL(selectedPath);
        });
    });
};

ElectronScreenshotService.prototype.isSupported = function () {
    return true;
};


function Capturer() {}
Capturer.prototype.captureFullScreenData = function (options, callback) {
    const {desktopCapturer, remote} = require("electron");

    var displays = remote.screen.getAllDisplays();

    var maxWidth = 0;
    var maxHeight = 0;
    displays.forEach(function (d) {
        maxWidth = Math.max(maxWidth, d.bounds.x + d.bounds.width);
        maxHeight = Math.max(maxHeight, d.bounds.y + d.bounds.height);
    });

    function onStreamReceived(stream) {
        var video = document.createElement("video");
        video.style.cssText = "position: absolute; top: -9999px; left: -9999px; width: 100px; height: 100px;";
        video.onloadedmetadata = function () {
            video.style.cssText = "position: absolute; top: -9999px; left: -9999px; width: " + options.width + "px; height: " + options.height + "px;";

            window.setTimeout(function () {
                var canvas = document.createElement("canvas");
                canvas.width = options.width;
                canvas.height = options.height;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(video, options.x || 0, options.y || 0, options.width, options.height, 0, 0, options.width, options.height);

                var processor = options.processor || function (canvas, ctx) {
                    return canvas.toDataURL("image/png");
                };

                callback(processor(canvas, ctx));

                video.remove();
                try {
                    stream.getTracks()[0].stop();
                } catch (e) {}

            }, 10);
        }
        video.srcObject = stream;
        document.body.appendChild(video);
        video.play();
    }

    function onCaptureError(e) {
        console.log(e);
        callback(null, e);
    }

    desktopCapturer.getSources({types: ["screen"]}, function (e, sources) {
        if (e) {
            callback(null, e);
            return;
        }
        for (var i = 0; i < sources.length; i ++) {
            if (sources[i].name === "Entire screen") {
                navigator.webkitGetUserMedia({
                    audio: false,
                    video: {
                        cursor: "never",
                        mandatory: {
                            chromeMediaSource: "desktop",
                            chromeMediaSourceId: sources[i].id,
                            maxWidth: maxWidth || options.width,
                            minWidth: maxWidth || options.width,
                            maxHeight: maxHeight || options.height,
                            minHeight: maxHeight || options.height
                        }
                    }
                }, onStreamReceived, onCaptureError);

                return;
            }
        }

        callback(null, "No screen found");
    });
};

// Config.CAPTURE_MATE_EXEC_PATH = Config.define("capture.mate_screenshot.exec_path", "/usr/bin/mate-screenshot");
//
// function MateScreenshotService() {
//     BaseCmdCaptureService.call(this);
//     this.id = "MateScreenshotService";
//     this.supportPointerHiding = false;
// }
//
// __extend(BaseCmdCaptureService, MateScreenshotService);
//
// MateScreenshotService.prototype.buildCommandLine = function (options) {
//     var cmd = {
//         path: this.getExecPath(),
//         args: []
//     };
//
//     if (options.mode == BaseCaptureService.MODE_AREA) cmd.args.push("-a");
//     if (options.mode == BaseCaptureService.MODE_WINDOW) cmd.args.push("-w");
//
//     if (options.outputType == BaseCaptureService.OUTPUT_CLIPBOARD) {
//          cmd.args.push("-c");
//     } else {
//         cmd.args.push("-o");
//         cmd.args.push(options.outputPath);
//     }
//
//     if (options.includePointer && this.supportPointerHiding) cmd.args.push("-p");
//
//     return cmd;
// };
// MateScreenshotService.prototype.getExecPath = function () {
//     return Config.get(Config.CAPTURE_MATE_EXEC_PATH);
// };
// MateScreenshotService.prototype.isSupported = function (options) {
//     return process.platform == "linux" && fs.existsSync(this.getExecPath());
// };




var ScreenCaptureProvider = {
    providers: [],
};
ScreenCaptureProvider.register = function (provider) {
    if (provider.isSupported && !provider.isSupported()) return;

    ScreenCaptureProvider.providers.push(provider);
    if (!ScreenCaptureProvider.defaultProviderId) ScreenCaptureProvider.defaultProviderId = provider.id;
};
ScreenCaptureProvider.setActiveProvider = function (providerId) {
    Config.set(Config.CAPTURE_ACTIVE_PROVIDER_ID, providerId);
};

ScreenCaptureProvider.getActiveProvider = function () {
    var providerId = Config.get(Config.CAPTURE_ACTIVE_PROVIDER_ID) || ScreenCaptureProvider.defaultProviderId;
    for (var p of ScreenCaptureProvider.providers) {
        if (p.id == providerId) return p;
    }

    return null;
};

ScreenCaptureProvider.register(new GnomeScreenshotService());
ScreenCaptureProvider.register(new WindowsSnippingToolScreenshotService());
ScreenCaptureProvider.register(new MacScreenshotService());
ScreenCaptureProvider.register(new GenericCmdCaptureService());
