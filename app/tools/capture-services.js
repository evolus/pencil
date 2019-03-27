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
    return Config.get(Config.CAPTURE_GNOME_EXEC_PATH);
};
WindowsSnippingToolScreenshotService.prototype.isSupported = function (options) {
    return process.platform == "linux" && fs.existsSync(this.getExecPath());
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
