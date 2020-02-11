function GestureHelper(canvas) {
    this.canvas = canvas;
    this.canvas.gestureHelper = this;
    
    this.init();
}

GestureHelper.prototype.init = function () {
    var thiz = this;
    this.heldKeyCodes = [];
    
    this.canvas.focusableBox.addEventListener("keydown", function (event) {
        if (thiz.heldKeyCodes.indexOf(event.keyCode) >= 0) return;
        
        thiz.heldKeyCodes.push(event.keyCode);
        thiz.showKeyCodes();
    }, false);
    
    this.canvas.focusableBox.addEventListener("keyup", function (event) {
        var index = thiz.heldKeyCodes.indexOf(event.keyCode);
        if (index < 0) return;
        
        thiz.heldKeyCodes.splice(index, 1);
        thiz.showKeyCodes();
    }, false);
    
    this.canvas.focusableBox.addEventListener("blur", function (event) {
        thiz.heldKeyCodes.length = 0;
        thiz.showKeyCodes();
    }, false);
};

GestureHelper.prototype.showKeyCodes = function () {
    return;
    if (!GestureHelper._output) {
        GestureHelper._output = document.createElement("div");
        ApplicationPane._instance.contentHeader.appendChild(GestureHelper._output);
    }
    
    GestureHelper._output.innerHTML = this.heldKeyCodes.join(", ");
};