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

        req.on("data", function(data) {
          requestBody += data;
          let jsonReqBody = JSON.parse(requestBody);
          let jsonResult = '';

          out.logToFile(requestBody);

          let operations = jsonReqBody["Operations"];
          let i = 0;
          let error = false;
          let statusCode = "200";
          let result = {};
          for (i = 0; i < operations.length; i++) {
            let operation = operations[i]["op"];
            let path = operations[i]["path"];
            out.log("ERROR", "Groups.patchGroup", "Operation " + operation + ", path " + path);

            if (operation === "replace" || (operation === "add" && path === undefined)) {
              let value = operations[i]["value"];
              let attributes = Object.keys(value);
              let j = 0;
              for (j = 0; j < attributes.length; j++) {
                let attribute = attributes[j];
                let attributeValue = value[attribute];

                db.patchGroup(attribute, attributeValue, groupId, reqUrl, function(result) {
                  if (result["status"] !== undefined) {
                    statusCode = result["status"];
                    error = true;
                    out.log("ERROR", "Groups.patchGroup", "Encountered error " + result["status"] + ": " + result["detail"]);
                  }

                  out.logToFile(JSON.stringify(result));
                  if (error) {
                    jsonResult += JSON.stringify(result);
                  } else {
                    jsonResult = JSON.stringify(result);
                  }
                });
              }
            } else if (operation === "add" && path !== undefined && path === 'members') {
    	      let valueArr = operations[i]["value"];
    	      
    	      if (valueArr !== undefined && valueArr.length > 0) {
    	    	var k = 0;
    	    	for(k = 0; k < valueArr.length; k++) {
    	    	  let value = valueArr[k];
     	       	  let userIds = [];
	    	      let memberValues = value["value"];
	    	      if (memberValues !== undefined) {
	    	    	if (Array.isArray(memberValues)) {
 	        	      userIds.push.apply(userIds, memberValues);
	    	    	} else {
	    	    	  userIds.push(memberValues);
	    	    	}
	    	      }
	    	      let m = 0;
	    	      while (error === false && m < userIds.length) {
	    	        let userId = userIds[m];
	    	        out.log("ERROR", "Groups.patchGroup", "Group Id: " + groupId + "; UserId: " + userId)
	    	        m++;
	    		    db.addGroupMembership(userId, groupId, reqUrl, function(result) {
	    			  if (result["status"] !== undefined) {
	    			    statusCode = result["status"];
	    			    error = true;
	    				out.log("ERROR", "Groups.patchGroup", "Encountered error " + result["status"] + ": " + result["detail"]);
	    			  }
	    		    });
	    	      }
    	    	}
    	      }
            } else if (operation === "remove" && path !== undefined && path.startsWith("members[value eq \"")) {
            	let userId = path.substring("members[value eq \"".length);
            	userId = userId.substring(0, userId.indexOf("\""));
	    		db.removeGroupMembership(userId, groupId, reqUrl, function(result) {
	  	    	  if (result["status"] !== undefined) {
	  	    		statusCode = result["status"];
	  	    		error = true;
	  	    		out.log("ERROR", "Groups.patchGroup", "Encountered error " + result["status"] + ": " + result["detail"]);
	  	    	  }
	  	    	});
            } else {
              out.log("WARN", "Groups.patchGroup", "The requested operation, " + operation + ", is not supported!");
              out.log("WARN", "Groups.patchGroup", "The request body " + requestBody);

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
        	Groups.getGroup(req, res);
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