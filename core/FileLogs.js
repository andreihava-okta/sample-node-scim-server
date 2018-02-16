let fs = require('fs');
let stream = undefined;

class FileLogs {
    logToFile(message) {
        stream = fs.createWriteStream("logs.txt", {"flags": "a"});
        stream.write(message);
        stream.end();
    }
}

module.exports = FileLogs;