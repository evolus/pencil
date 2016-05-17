function QueueHandler() {
    this.tasks = [];
}
QueueHandler.prototype.submit = function (task) {
    this.tasks.push(task);

    if (this.tasks.length == 1) this.start();
};

QueueHandler.prototype.start = function (task) {

    var next = function() {
        if (this.tasks.length <= 0) return;
        var task = this.tasks.pop();
        task(next);
    }.bind(this);

    next();
};

module.exports = QueueHandler;
