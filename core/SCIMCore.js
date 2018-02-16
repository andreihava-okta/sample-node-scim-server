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
 */

let db = require('./Database');

class SCIMCore {
    static createSCIMUserList(rows, startIndex, count, reqUrl) {
        let scimResource = {
            "Resources": [],
            "itemsPerPage": 0,
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            "startIndex": 0,
            "totalResults": 0
        };

        let resources = [];
        let location = "";

        for (let i = (startIndex - 1); i < count; i++) {
            location = reqUrl + "/" + rows[i]["id"];

            resources.push(this.parseSCIMUser(rows[i], location));
            location = "";
        }

        scimResource["Resources"] = resources;
        scimResource["startIndex"] = startIndex;
        scimResource["itemsPerPage"] = count;
        scimResource["totalResults"] = count;

        return scimResource;
    }

    static createSCIMGroupList(rows, startIndex, count, reqUrl) {
        let scimResource = {
            "Resources": [],
            "itemsPerPage": 0,
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            "startIndex": 0,
            "totalResults": 0
        };

        let resources = [];
        let location = "";

        for (let i = (startIndex - 1); i <count; i++) {
            location = reqUrl + "/" + rows[i]["id"];

            resources.push(this.parseSCIMGroup(rows[i], location));
            location = "";
        }

        scimResource["Resources"] = resources;
        scimResource["startIndex"] = startIndex;
        scimResource["itemsPerPage"] = count;
        scimResource["totalResults"] = count;

        return scimResource;
    }

    static parseSCIMUser(row, reqUrl) {
        return this.createSCIMUser(row["id"], row["active"], row["userName"], row["givenName"],
                    row["middleName"], row["familyName"], row["email"], row["groups"], reqUrl);
    }

    static createSCIMUser(userId, active, userName, givenName, middleName, familyName, email, groups, reqUrl) {
        let scimUser = {
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
            "id": null,
            "userName": null,
            "name": {
                "givenName": null,
                "middleName": null,
                "familyName": null
            },
            "emails":
                [{
                    "primary": true,
                    "value": null,
                    "type": "work"
                }],
            "active": false,
            "groups": [],
            "meta": {
                "resourceType": "User",
                "location": null
            }
        };

        scimUser["meta"]["location"] = reqUrl;
        scimUser["id"] = userId;
        scimUser["active"] = active;
        scimUser["userName"] = userName;
        scimUser["name"]["givenName"] = givenName;
        scimUser["name"]["middleName"] = middleName;
        scimUser["name"]["familyName"] = familyName;
        scimUser["emails"][0]["value"] = email;
        scimUser["groups"] = groups;

        return scimUser;
    }

    static parseSCIMGroup(row, reqUrl) {
        return this.createSCIMGroup(row["id"], row["displayName"], row["members"], reqUrl);
    }

    static createSCIMGroup(groupId, displayName, members, reqUrl) {
        let scimGroup = {
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
            "id": null,
            "displayName": null,
            "members": [],
            "meta": {
                "resourceType": "Group",
                "location": null
            }
        }

        scimGroup["id"] = groupId;
        scimGroup["displayName"] = displayName;
        scimGroup["members"] = members;
        scimGroup["meta"]["location"] = reqUrl;

        return scimGroup;
    }

    static createSCIMError(errorMessage, statusCode) {
        let scimError = {
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
            "detail": null,
            "status": null
        };

        scimError["detail"] = errorMessage;
        scimError["status"] = statusCode;

        return scimError;
    }
}

module.exports = SCIMCore;