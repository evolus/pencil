function FooPanel() {
    BaseTemplatedWidget.call(this);
    
    this.time.innerHTML = new Date().toString();
}
__extend(BaseTemplatedWidget, FooPanel);

FooPanel.prototype.foo = function () {
    this.time.style.border = "solid 1px red";
};

