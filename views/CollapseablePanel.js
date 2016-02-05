function CollapseablePanel() {
    BaseTemplatedWidget.call(this);
    
    this.expanded = false;
   
    var thiz = this;
    this.toogleButton.addEventListener("click", function(ev) {
			Dom.cancelEvent(ev);
			thiz.toogle();
	});
	
	this.contentContainer.addEventListener("p:TitleChanged", function(event) {
			var widget = event.target.__widget;
			thiz.setTitle(widget.getTitle());
			
    }, false);
    
	this.toogle();
}
__extend(BaseTemplatedWidget, CollapseablePanel);

CollapseablePanel.prototype.setContentFragment = function (fragment) {
    this.contentContainer.appendChild(fragment);
    
};
CollapseablePanel.prototype.setTitle = function(title) {
	this.panelTitleSpan.innerHTML = title;
}

CollapseablePanel.prototype.toogle = function() {
	this.expanded = !this.expanded;
	if (this.expanded) {
		this.panelTitleSpan.style.display = "block";
		this.contentContainer.style.display = "block";
		Dom.removeClass(this.collapseablePanel, "Collapsed")
		this.toogleButton.childNodes[0].innerHTML = "expand_less";
	} else {
		this.contentContainer.style.display = "none";
		Dom.addClass(this.collapseablePanel, "Collapsed")
		this.toogleButton.childNodes[0].innerHTML = "expand_more";
		this.panelTitleSpan.style.display = "none";
	}
	var children = this.contentContainer.childNodes;

	for(child in children){
		var widget = children[child].__widget;
		if (!widget) continue;
		if (widget.sizeChanged) {
			widget.sizeChanged(this.expanded);
		}
	}
	
}
