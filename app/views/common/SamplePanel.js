function SamplePanel() {
    BaseTemplatedWidget.call(this);
    
    this.link.innerHTML = "Changed content";
    this.foo.foo();
}
__extend(BaseTemplatedWidget, SamplePanel);
