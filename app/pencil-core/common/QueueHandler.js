function QueueHandler(delay) {
    this.delay = delay || 0;
    this.tasks = [];
}
QueueHandler.prototype.submit = function (task) {
    this.tasks.push(task);

    if (this.tasks.length == 1) this.start();
};

QueueHandler.prototype.start = function (task) {

    var next = function() {
        if (this.tasks.length <= 0) return;
        var task = this.tasks[0];
        task(function () {
            this.tasks.pop();
            if (this.delay) {
                setTimeout(next, this.delay)
            } else {
                next();
            }
        }.bind(this));
    }.bind(this);

    next();
};

module.exports = QueueHandler;
