let url = require('url');
let scimCore = require('../core/SCIMCore');
let db = require('../core/Database');
let group = require('../models/Group');
let out = require('../core/Logs');

class Groups {
    static listGroups(req, res) {
        out.log("INFO", "Groups.listGroups", "Got request: " + req.url);

        let urlParts = url.parse(req.url, true);
        let reqUrl = urlParts.pathname;

        let query = urlParts.query;
        let startIndex = query["startIndex"];
        let count = query["count"];
        let filter = query["filter"];

        if (filter !== undefined) {
            let attributeName = String(filter.split("eq")[0]).trim();
            let attributeValue = String(filter.split("eq")[1]).trim();

            db.getFilteredGroups(attributeName, attributeValue, startIndex, count, reqUrl, function (result) {
                if (result["status"] !== undefined) {
                    if (result["status"] === "400") {
                        res.writeHead(400, {"Content-Type": "text/plain"});
                    } else if (result["status"] === "409") {
                        res.writeHead(409, {"Content-Type": "text/plain"});
                    }

                    out.log("ERROR", "Groups.listGroups", "Encountered error " + result["status"] + ": " + result["detail"]);
                } else {
                    res.writeHead(200, {"Content-Type": "text/json"});
                }

                let jsonResult = JSON.stringify(result);
                out.logToFile(jsonResult);

                res.end(jsonResult);
            });
        } else {
            db.getAllGroups(startIndex, count, reqUrl, function (result) {
                if (result["status"] !== undefined) {
                    if (result["status"] === "400") {
                        res.writeHead(400, {"Content-Type": "text/plain"});
                    } else if (result["status"] === "409") {
                        res.writeHead(409, {"Content-Type": "text/plain"});
                    }

                    out.log("ERROR", "Groups.listGroups", "Encountered error " + result["status"] + ": " + result["detail"]);
                } else {
                    res.writeHead(200, {"Content-Type": "text/json"});
                }

                let jsonResult = JSON.stringify(result);
                out.logToFile(jsonResult);

                res.end(jsonResult);
            });
        }
    }

    static getGroup(req, res) {
        out.log("INFO", "Groups.getGroup", "Got request: " + req.url);

        let reqUrl = req.url;

        let groupId = req.params.groupId;

        db.getGroup(groupId, reqUrl, function (result) {
            if (result["status"] !== undefined) {
                if (result["status"] === "400") {
                    res.writeHead(400, {"Content-Type": "text/plain"});
                } else if (result["status"] === "409") {
                    res.writeHead(409, {"Content-Type": "text/plain"});
                }

                out.log("ERROR", "Groups.getGroup", "Encountered error " + result["status"] + ": " + result["detail"]);
            } else {
                res.writeHead(200, {"Content-Type": "text/json"});
            }

            let jsonResult = JSON.stringify(result);
            out.logToFile(jsonResult);

            res.end(jsonResult);
        });
    }

    static createGroup(req, res) {
        out.log("INFO", "Groups.createGroup", "Got request: " + req.url);

        let urlParts = url.parse(req.url, true);
        let reqUrl = urlParts.pathname;
        let requestBody = "";

        req.on('data', function (data) {
            requestBody += data;
            let groupJsonData = JSON.parse(requestBody);

            out.logToFile(requestBody);

            let groupModel = group.parseFromSCIMResource(groupJsonData);

            db.createGroup(groupModel, reqUrl, function (result) {
                if (result["status"] !== undefined) {
                    if (result["status"] === "400") {
                        res.writeHead(400, {"Content-Type": "text/plain"});
                    } else if (result["status"] === "409") {
                        res.writeHead(409, {"Content-Type": "text/plain"});
                    }

                    out.log("ERROR", "Groups.createGroup", "Encountered error " + result["status"] + ": " + result["detail"]);
                } else {
                    res.writeHead(201, {"Content-Type": "text/json"});
                }

                let jsonResult = JSON.stringify(result);
                out.logToFile(jsonResult);

                res.end(jsonResult);
            });
        });
    }

    static patchGroup(req, res) {
        out.log("INFO", "Groups.patchGroup", "Got request: " + req.url);

        let urlParts = url.parse(req.url, true);
        let reqUrl = urlParts.pathname;

        let groupId = req.params.groupId;

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
                db.patchGroup(attribute, attributeValue, groupId, reqUrl, function (result) {
                    if (result["status"] !== undefined) {
                        if (result["status"] === "400") {
                            res.writeHead(400, {"Content-Type": "text/plain"});
                        } else if (result["status"] === "409") {
                            res.writeHead(409, {"Content-Type": "text/plain"});
                        }

                        out.log("ERROR", "Groups.patchGroup", "Encountered error " + result["status"] + ": " + result["detail"]);
                    } else {
                        res.writeHead(200, {"Content-Type": "text/json"});
                    }

                    let jsonResult = JSON.stringify(result);
                    out.logToFile(jsonResult);

                    res.end(jsonResult);
                });
            } else {
                out.log("WARN", "Groups.patchGroup", "The requested operation, " + operation + ", is not supported!");

                let scimError = scimCore.createSCIMError("Operation Not Supported", "403");
                res.writeHead(403, {"Content-Type": "text/plain"});

                let jsonResult = JSON.stringify(scimError);
                out.logToFile(jsonResult);

                res.end(jsonResult);
            }
        });
    }

    static updateGroup(req, res) {
        out.log("INFO", "Groups.updateGroup", "Got request: " + req.url);

        let urlParts = url.parse(req.url, true);
        let reqUrl = urlParts.pathname;

        let groupId = req.params.groupId;

        let requestBody = "";

        req.on("data", function (data) {
            requestBody += data;
            let groupJsonData = JSON.parse(requestBody);

            out.logToFile(requestBody);

            let groupModel = group.parseFromSCIMResource(groupJsonData);

            db.updateGroup(groupModel, groupId, reqUrl, function (result) {
                if (result["status"] !== undefined) {
                    if (result["status"] === "400") {
                        res.writeHead(400, {"Content-Type": "text/plain"});
                    } else if (result["status"] === "409") {
                        res.writeHead(409, {"Content-Type": "text/plain"});
                    }

                    out.log("ERROR", "Groups.updateGroup", "Encountered error " + result["status"] + ": " + result["detail"]);
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

module.exports = Groups;