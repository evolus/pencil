function PageThumbnailView() {
    BaseTemplatedWidget.call(this);
    this.bind("load", function (event) {
        var W = this.pageThumbnailContainer.offsetWidth - 2;
        var H = this.pageThumbnailContainer.offsetHeight - 2;
        var w = this.pageThumbnail.naturalWidth;
        var h = this.pageThumbnail.naturalHeight;

        var r = Math.max(w/W, h/H);

        w /= r;
        h /= r;

        this.pageThumbnail.style.width = w + "px";
        this.pageThumbnail.style.height = h + "px";

        this.pageThumbnail.style.visibility = "visible";
    }, this.pageThumbnail);

    this.pageThumbnail.style.visibility = "hidden";
}
__extend(BaseTemplatedWidget, PageThumbnailView);

PageThumbnailView.prototype.setPage = function (page) {
    this.page = page;
    this._updateUI();
};
PageThumbnailView.prototype._updateUI = function () {
    if (!this.page) return;
    this.pageThumbnail.style.visibility = "hidden";
    this.pageThumbnail.src = this.page.thumbPath + "?time=" + (new Date().getTime());
    this.pageTitle.innerHTML = this.page.name;
};

PageThumbnailView.prototype.selectPage = function (active) {
    this.node().setAttribute("selected", active);
    this.pageThumbnailContainer.setAttribute("selected", active);
    this.pageTitle.setAttribute("selected", active);
};
