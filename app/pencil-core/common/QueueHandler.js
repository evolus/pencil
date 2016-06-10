function QueueHandler(delay) {
    this.delay = delay || 0;
    this.tasks = [];
}
QueueHandler.prototype.submit = function (task) {
    this.tasks.push(task);

    if (this.tasks.length == 1) this.start();
};

QueueHandler.prototype.start = function () {
    var thiz = this;
    var next = function() {
        if (thiz.tasks.length <= 0) return;
        let task = thiz.tasks[0];
        task(function () {
            thiz.tasks.shift();
            if (thiz.delay) {
                setTimeout(next, thiz.delay)
            } else {
                next();
            }
        });
    };

    next();
};

module.exports = QueueHandler;
