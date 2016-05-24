function ComboTest() {
    BaseTemplatedWidget.call(this);
    this.bind("click", function () {
        this.selector.setColor(Color.fromString("#336699CC"));
        this.popup.show(this.button, "left-inside", "bottom");
    }, this.button);
}
__extend(BaseTemplatedWidget, ComboTest);
