let url = require('url');
let scimCore = require('../core/SCIMCore');
let db = require('../core/Database');
let user = require('../models/User');
let out = require('../core/Logs');

class Users {
    static listUsers(req, res) {
        out.log("INFO", "Users.listUsers", "Got request: " + req.url);

        let urlParts = url.parse(req.url, true);
        let reqUrl = urlParts.pathname;

        let query = urlParts.query;
        let startIndex = query["startIndex"];
        let count = query["count"];
        let filter = query["filter"];

        if (filter !== undefined) {
            let attributeName = String(filter.split("eq")[0]).trim();
            let attributeValue = String(filter.split("eq")[1]).trim();

            db.getFilteredUsers(attributeName, attributeValue, startIndex, count, reqUrl, function (result) {
                if (result["status"] !== undefined) {
                    if (result["status"] === "400") {
                        res.writeHead(400, {"Content-Type": "text/plain"});
                    } else if (result["status"] === "409") {
                        res.writeHead(409, {"Content-Type": "text/plain"});
                    }

                    out.log("ERROR", "Users.listUsers", "Encountered error " + result["status"] + ": " + result["detail"]);
                } else {
                    res.writeHead(200, {"Content-Type": "text/json"});
                }

                let jsonResult = JSON.stringify(result);
                out.logToFile(jsonResult);

                res.end(jsonResult);
            });
        } else {
            db.getAllUsers(startIndex, count, reqUrl, function (result) {
                if (result["status"] !== undefined) {
                    if (result["status"] === "400") {
                        res.writeHead(400, {"Content-Type": "text/plain"});
                    } else if (result["status"] === "409") {
                        res.writeHead(409, {"Content-Type": "text/plain"});
                    }

                    out.log("ERROR", "Users.listUsers", "Encountered error " + result["status"] + ": " + result["detail"]);
                } else {
                    res.writeHead(200, {"Content-Type": "text/json"});
                }

                let jsonResult = JSON.stringify(result);
                out.logToFile(jsonResult);

                res.end(jsonResult);
            });
        }
    }

    static getUser(req, res) {
        out.log("INFO", "Users.getUser", "Got request: " + req.url);

        let reqUrl = req.url;

        let userId = req.params.userId;

        db.getUser(userId, reqUrl, function (result) {
            if (result["status"] !== undefined) {
                if (result["status"] === "400") {
                    res.writeHead(400, {"Content-Type": "text/plain"});
                } else if (result["status"] === "409") {
                    res.writeHead(409, {"Content-Type": "text/plain"});
                }

                out.log("ERROR", "Users.listUsers", "Encountered error " + result["status"] + ": " + result["detail"]);
            } else {
                res.writeHead(200, {"Content-Type": "text/json"});
            }

            let jsonResult = JSON.stringify(result);
            out.logToFile(jsonResult);

            res.end(jsonResult);
        });
    }

    static createUser(req, res) {
        out.log("INFO", "Users.createUser", "Got request: " + req.url);

        let urlParts = url.parse(req.url, true);
        let reqUrl = urlParts.pathname;
        let requestBody = "";

        req.on('data', function (data) {
            requestBody += data;
            let userJsonData = JSON.parse(requestBody);

            out.logToFile(requestBody);

            let userModel = user.parseFromSCIMResource(userJsonData);

            db.createUser(userModel, reqUrl, function (result) {
                if (result["status"] !== undefined) {
                    if (result["status"] === "400") {
                        res.writeHead(400, {"Content-Type": "text/plain"});
                    } else if (result["status"] === "409") {
                        res.writeHead(409, {"Content-Type": "text/plain"});
                    }

                    out.log("ERROR", "Users.listUsers", "Encountered error " + result["status"] + ": " + result["detail"]);
                } else {
                    res.writeHead(201, {"Content-Type": "text/json"});
                }

                let jsonResult = JSON.stringify(result);
                out.logToFile(jsonResult);

                res.end(jsonResult);
            });
        });
    }

    static patchUser(req, res) {
        out.log("INFO", "Users.patchUser", "Got request: " + req.url);

        let urlParts = url.parse(req.url, true);
        let reqUrl = urlParts.pathname;

        let userId = req.params.userId;

        let requestBody = "";

        req.on("data", function (data) {
            requestBody += data;
            let jsonReqBody = JSON.parse(requestBody);

            out.logToFile(requestBody);

            let operation = jsonReqBody["Operations"][0]["op"];
            let value = jsonReqBody["Operations"][0]["value"];
            let attribute = Object.keys(value)[0];
            let attributeValue = value[attribute];

            if (operation === "replace") {
                db.patchUser(attribute, attributeValue, userId, reqUrl, function (result) {
                    if (result["status"] !== undefined) {
                        if (result["status"] === "400") {
                            res.writeHead(400, {"Content-Type": "text/plain"});
                        } else if (result["status"] === "409") {
                            res.writeHead(409, {"Content-Type": "text/plain"});
                        }

                        out.log("ERROR", "Users.listUsers", "Encountered error " + result["status"] + ": " + result["detail"]);
                    } else {
                        res.writeHead(200, {"Content-Type": "text/json"});
                    }

                    let jsonResult = JSON.stringify(result);
                    out.logToFile(jsonResult);

                    res.end(jsonResult);
                });
            } else {
                out.log("WARN", "Users.patchUser", "The requested operation, " + operation + ", is not supported!");

                let scimError = scimCore.createSCIMError("Operation Not Supported", "403");
                res.writeHead(403, {"Content-Type": "text/plain"});

                let jsonResult = JSON.stringify(scimError);
                out.logToFile(jsonResult);

                res.end(jsonResult);
            }
        });
    }

    static updateUser(req, res) {
        out.log("INFO", "Users.updateUser", "Got request: " + req.url);

        let urlParts = url.parse(req.url, true);
        let reqUrl = urlParts.pathname;

        let userId = req.params.userId;

        let requestBody = "";

        req.on("data", function (data) {
            requestBody += data;
            let userJsonData = JSON.parse(requestBody);

            out.logToFile(requestBody);

            let userModel = user.parseFromSCIMResource(userJsonData);

            db.updateUser(userModel, userId, reqUrl, function (result) {
                if (result["status"] !== undefined) {
                    if (result["status"] === "400") {
                        res.writeHead(400, {"Content-Type": "text/plain"});
                    } else if (result["status"] === "409") {
                        res.writeHead(409, {"Content-Type": "text/plain"});
                    }

                    out.log("ERROR", "Users.listUsers", "Encountered error " + result["status"] + ": " + result["detail"]);
                } else {
                    res.writeHead(200, {"Content-Type": "text/json"});
                }

                let jsonResult = JSON.stringify(result);
                out.logToFile(jsonResult);

                res.end(jsonResult);
            });
        });
    }
}

module.exports = Users;