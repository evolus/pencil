function ScreenCaptureOptionDialog() {
    Dialog.call(this);
    this.title="Screenshot";

    var thiz = this;

    this.bind("click", function () {
        this.close(this.makeResult(BaseCaptureService.MODE_AREA));
    }, this.areaButton);

    this.bind("click", function () {
        this.close(this.makeResult(BaseCaptureService.MODE_WINDOW));
    }, this.windowButton);

    this.bind("click", function () {
        this.close(this.makeResult(BaseCaptureService.MODE_FULLSCREEN));
    }, this.fullscreenButton);

    this.hideCursorCheckbox.checked = Config.get(Config.CAPTURE_OPTIONS_HIDE_POINTER, true);
    this.hidePencilCheckbox.checked = Config.get(Config.CAPTURE_OPTIONS_HIDE_PENCIL_WINDOW, true);
    this.delayInput.value = Config.get(Config.CAPTURE_OPTIONS_DELAY, true);
    var normalBitmap = Config.get(Config.CAPTURE_OPTIONS_INSERT_MODE, Config.CAPTURE_OPTIONS_INSERT_MODE_NORMAL) == Config.CAPTURE_OPTIONS_INSERT_MODE_NORMAL;
    
    this.normalBitmapRadio.checked = normalBitmap;
    this.nPatchBitmapRadio.checked = !normalBitmap;
};

__extend(Dialog, ScreenCaptureOptionDialog);

Config.CAPTURE_OPTIONS_HIDE_POINTER = Config.define("capture.options.hide_pointer", true);
Config.CAPTURE_OPTIONS_HIDE_PENCIL_WINDOW = Config.define("capture.options.hide_pencil_window", true);
Config.CAPTURE_OPTIONS_DELAY = Config.define("capture.options.delay", 0);
Config.CAPTURE_OPTIONS_INSERT_MODE_NORMAL = "normal";
Config.CAPTURE_OPTIONS_INSERT_MODE = Config.define("capture.options.insert_mode", Config.CAPTURE_OPTIONS_INSERT_MODE_NORMAL);

ScreenCaptureOptionDialog.prototype.setup = function (provider) {
    var providedCaps = provider.capabilities || {
        captureArea: true,
        captureWindow: true,
        captureFullscreen: true,
        canHideCursor: true
    };
    
    this.areaButton.disabled = !providedCaps.captureArea;
    this.windowButton.disabled = !providedCaps.captureWindow;
    this.fullscreenButton.disabled = !providedCaps.captureFullscreen;
    
    if (!providedCaps.canHideCursor) {
        this.hideCursorCheckbox.checked = false;
        this.hideCursorCheckbox.disabled = true;
    }
};

ScreenCaptureOptionDialog.prototype.makeResult = function (mode) {
    var hidePointer = this.hideCursorCheckbox.checked;
    var hidePencilWindow = this.hidePencilCheckbox.checked;
    var delay = this.delayInput.value;
    var normal = this.normalBitmapRadio.checked;

    Config.set(Config.CAPTURE_OPTIONS_HIDE_POINTER, hidePointer);
    Config.set(Config.CAPTURE_OPTIONS_HIDE_PENCIL_WINDOW, hidePencilWindow);
    Config.set(Config.CAPTURE_OPTIONS_DELAY, delay);
    Config.set(Config.CAPTURE_OPTIONS_INSERT_MODE, normal ? Config.CAPTURE_OPTIONS_INSERT_MODE_NORMAL : "npatch");

    return {
        mode: mode,
        includePointer: !hidePointer,
        hidePencil: hidePencilWindow,
        delay: delay,
        useNormalBitmap: normal
    }
};

ScreenCaptureOptionDialog.prototype.getDialogActions = function () {
    return [
        {
            type: "cancel", title: "Cancel",
            isCloseHandler: true,
            run: function () { return true; }
        }
    ]
};
