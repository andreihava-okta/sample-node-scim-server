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

class User  {
    static parseFromSCIMResource(userJsonData) {
        let user = {
            "active": false,
            "userName": "",
            "givenName": "",
            "middleName": "",
            "familyName": "",
            "email": "",
            "groups": []
        };

        user["active"] = userJsonData["active"];
        user["userName"] = userJsonData["userName"];
        user["givenName"] = userJsonData["name"]["givenName"];
        user["middleName"] = userJsonData["name"]["middleName"];
        user["familyName"] = userJsonData["name"]["familyName"];
        user["email"] = userJsonData["emails"][0]["value"];

        let groups = [];

        for (let i = 0; i < userJsonData["groups"].length; i++) {
            groups.push(this.parseGroups(userJsonData["groups"][i]));
        }

        user["groups"] = groups;

        return user;
    }

    static parseGroups(userGroupJsonData) {
        let group = {
            "value": null,
            "ref": null,
            "display": null
        };

        group["value"] = userGroupJsonData["value"];
        group["ref"] = userGroupJsonData["$ref"];
        group["display"] = userGroupJsonData["display"];

        return group;
    }

    static createGroup(groupId, displayName) {
        let group = {
            "value": null,
            "$ref": null,
            "display": null
        };

        group["value"] = groupId;
        group["$ref"] = "../Groups/" + groupId;
        group["display"] = displayName;

        return group;
    }
}

module.exports = User;