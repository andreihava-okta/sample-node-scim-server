class Logs {
    static log(type, action, message) {
        let logEntry = "[ " + type + " ] [ " + action + " ] " + message;

        console.log(logEntry);
    }

    static error(action, message) {
        let logEntry = "[ ERROR ] [ " + action + " ] " + message;

        console.error(logEntry);
    }
}

module.exports = Logs;