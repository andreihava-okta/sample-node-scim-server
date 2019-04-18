/** Copyright © 2016-2018, Okta, Inc.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *  
 *  Copyright © 2019, SailPoint Technologies
 *  Modifications:
 *  - Patch: add operation
 *  - Patch: return modified object (https://tools.ietf.org/html/rfc7644#section-3.5.2) 
 */

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
      let jsonResult = '';

   	  let requestBody = "";

   	  req.on("data", function(data) {
   	    requestBody += data;
   	    let jsonReqBody = JSON.parse(requestBody);

   	    out.logToFile(requestBody);

	    let operations = jsonReqBody["Operations"];
	    let i = 0;
	    let error = false;
	    let statusCode = "200";
	    let result = {};
	    for (i = 0; i < operations.length; i++) {
	      let operation = operations[i]["op"];
	      let path = operations[i]["path"];
	      out.log("ERROR", "Users.listUsers", "Operation " + operation + ", path " + path);

	      if (operation === "replace" || (operation === "add" && path === undefined)) {
	        let value = operations[i]["value"];
	        let attributes = Object.keys(value);
	        let j = 0;
	        for (j = 0; j < attributes.length; j++) {
	          let attribute = attributes[j];
	          let attributeValue = value[attribute];
	          db.patchUser(attribute, attributeValue, userId, reqUrl, function(result) {
	            if (result["status"] !== undefined) {
                  statusCode = result["status"];
                  error = true;
	              out.log("ERROR", "Users.patchUser", "Encountered error " + result["status"] + ": " + result["detail"]);
	            }

                out.logToFile(JSON.stringify(result));
                if (error) {
                  jsonResult += JSON.stringify(result);
                } else {
                  jsonResult = JSON.stringify(result);
                }
	          });
	        }
          } else if (operation === "add" && path !== undefined) {
  	        let value = operations[i]["value"];
	        let attributes = Object.keys(value);
	        if (path === 'groups') {
	        	let groupIds = [];
	        	let groupValues = value["value"];
	        	if (groupValues !== undefined) {
	    	      Array.prototype.push.apply(groupIds, groupValues);
	        	}
	        	let g = 0;
	        	while (error === false && g < groupIds.length) {
	        		groupId = groupIds[g];
	        		g++;
		        	db.addGroupMembership(userId, groupId, reqUrl, function(result) {
			            if (result["status"] !== undefined) {
			            	statusCode = result["status"];
			                error = true;
				            out.log("ERROR", "Users.patchUser", "Encountered error " + result["status"] + ": " + result["detail"]);
				        }
		        	});
	        	}
	        } else {
	        	// Ignore attributes
	        }
        	  
        	// TODO
        	//out.log("WARN", "Users.patchUser", "The requested operation, " + operation + ", is not yet implemented!");
        	//error = true;
        	//statusCode = 500;
	      } else {
	        out.log("WARN", "Users.patchUser", "The requested operation, " + operation + ", is not supported!");

	        let scimError = scimCore.createSCIMError("Operation Not Supported", "403");
            statusCode = 403;

            jsonResult += JSON.stringify(scimError);
	      }
	    }
	      
        if (statusCode != "200") {
          res.writeHead(statusCode, { "Content-Type": "text/plain" });
          out.logToFile("jsonResult: " + jsonResult);
          res.end(jsonResult);
        } else {
          Users.getUser(req, res);        
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