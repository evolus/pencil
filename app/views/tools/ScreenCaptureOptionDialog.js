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
};

__extend(Dialog, ScreenCaptureOptionDialog);

Config.CAPTURE_OPTIONS_HIDE_POINTER = Config.define("capture.options.hide_pointer", true);
Config.CAPTURE_OPTIONS_HIDE_PENCIL_WINDOW = Config.define("capture.options.hide_pencil_window", true);
Config.CAPTURE_OPTIONS_DELAY = Config.define("capture.options.delay", 0);

ScreenCaptureOptionDialog.prototype.setup = function () {

};

ScreenCaptureOptionDialog.prototype.makeResult = function (mode) {
    var hidePointer = this.hideCursorCheckbox.checked;
    var hidePencilWindow = this.hidePencilCheckbox.checked;
    var delay = this.delayInput.value;

    Config.set(Config.CAPTURE_OPTIONS_HIDE_POINTER, hidePointer);
    Config.set(Config.CAPTURE_OPTIONS_HIDE_PENCIL_WINDOW, hidePencilWindow);
    Config.set(Config.CAPTURE_OPTIONS_DELAY, delay);

    return {
        mode: mode,
        includePointer: !hidePointer,
        hidePencil: hidePencilWindow,
        delay: delay
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
