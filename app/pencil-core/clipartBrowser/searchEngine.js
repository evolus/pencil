
function SearchEngine() {
    this.title = null;
    this.name = null;
    this.icon = null;
    this.description = null;
    this.uri = null;
}

SearchEngine.prototype.search = function(query, options, callback) {
    return this.searchImpl(query, options, callback);
}
