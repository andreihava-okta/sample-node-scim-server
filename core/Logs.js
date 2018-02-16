let moment = require('moment');
let now = new moment();
let fl = require('./FileLogs');
let fileLogs = new fl();

class Logs {
    static log(type, action, message) {
        let timestamp = now.format("DD/MM/YYYY HH:mm:ss:SSS");
        let logEntry = "[ " + timestamp + " ] [ " + type + " ] [ " + action + " ] " + message;

        console.log(logEntry);
        fileLogs.logToFile(logEntry + "\r\n");
    }

    static error(action, message) {
        log("ERROR", action, message);
    }

    static logToFile(message) {
        fileLogs.logToFile(message + "\r\n\r\n");
    }
}

module.exports = Logs;