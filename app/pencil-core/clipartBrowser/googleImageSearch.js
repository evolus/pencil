
function GoogleImageSearch() {
    this.title = "Google Image";
    this.name = "Google";
    this.icon = "http://www.google.com/favicon.ico";
    this.iconURI = "http://www.google.com/favicon.ico";
    this.uri = "http://openclipart.org/media/search/results";
    this.searchUri = this.uri + "?search_text=%s&search_type=any&search_in=3";

    this.getData = function(aData, a) {
        debug("google image search");
    }
}

GoogleImageSearch.prototype = new SearchEngine();