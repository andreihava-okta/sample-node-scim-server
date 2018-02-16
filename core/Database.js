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

let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('scim.db');
let uuid = require('uuid');
let scimCore = require('./SCIMCore');
let out = require('./Logs');
let mUser = require('../models/User');
let mGroup = require('../models/Group');
let mGroupMembership = require('../models/GroupMembership');

class Database {
    static dbInit() {
        let query = "SELECT name FROM sqlite_master WHERE type='table' AND name='Users'";

        db.get(query, function (err, rows) {
            if (err !== null) {
                out.error("Database.dbInit::Users::SELECT", err);
            } else if (rows === undefined) {
                query = "CREATE TABLE Users ('id' primary key, 'active' INTEGER, \
                                             'userName' VARCHAR(255), 'givenName' VARCHAR(255), \
                                             'middleName' VARCHAR(255), 'familyName' VARCHAR(255), \
                                             'email' VARCHAR(255))";

                db.run(query, function (err) {
                    if (err !== null) {
                        out.error("Database.dbInit::Users::CREATE", err);
                    }
                });
            }
        });

        query = "SELECT name FROM sqlite_master WHERE type='table' AND name='Groups'";

        db.get(query, function (err, rows) {
            if (err !== null) {
                out.error("Database.dbInit::Groups::SELECT", err);
            } else if (rows === undefined) {
                query = "CREATE TABLE Groups ('id' primary key, 'displayName' VARCHAR(255))";

                db.run(query, function (err) {
                    if (err !== null) {
                        out.error("Database.dbInit::Groups::CREATE", err);
                    }
                })
            }
        });

        query = "SELECT name FROM sqlite_master WHERE type='table' AND name='GroupMemberships'";

        db.get(query, function (err, rows) {
            if (err !== null) {
                out.error("Database.dbInit::GroupMemberships::SELECT", err);
            } else if (rows === undefined) {
                query = "CREATE TABLE GroupMemberships ('id' primary key, 'groupId' VARCHAR(255), 'userId' VARCHAR(255), " +
                        "UNIQUE (groupId, userId) ON CONFLICT IGNORE)";

                db.run(query, function (err) {
                    if (err !== null) {
                        out.error("Database.dbInit::GroupMemberships::CREATE", err);
                    }
                });
            }
        });
    }

    static async getFilteredUsers(filterAttribute, filterValue, startIndex, count, reqUrl, callback) {
        let query = "SELECT * FROM Users WHERE " + filterAttribute + "='" + filterValue + "'";
        let self = this;

        await db.all(query, async function (err, rows) {
            if (err !== null) {
                out.error("Database.getFilteredUsers", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            }

            if (rows.length < count) {
                count = rows.length;
            }

            await self.getGroupMemberships(function (err, memberships) {
                if (err !== null) {
                    callback(scimCore.createSCIMError(err, "400"));
                } else {
                    for (let i = 0; i < rows.length; i++) {
                        rows[i]["groups"] = self.getGroupsForUser(rows[i]["id"], memberships);
                    }

                    callback(scimCore.createSCIMUserList(rows, startIndex, count, reqUrl));
                }
            });
        });
    }

    static async getFilteredGroups(filterAttribute, filterValue, startIndex, count, reqUrl, callback) {
        let query = "SELECT * FROM Groups WHERE " + filterAttribute + "='" + filterValue + "'";
        let self = this;

        await db.all(query, async function (err, rows) {
            if (err !== null) {
                out.error("Database.getFilteredGroups", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("Group Not Found", "404"));
            }

            if (rows.length < count) {
                count = rows.length;
            }

            await self.getGroupMemberships(function (err, memberships) {
                if (err !== null) {
                    callback(scimCore.createSCIMError(err, "400"));
                } else {
                    for (let i = 0; i < rows.length; i++) {
                        rows[i]["members"] = self.getUsersForGroup(rows[i]["id"], memberships);
                    }

                    callback(scimCore.createSCIMGroupList(rows, startIndex, count, reqUrl));
                }
            });
        });
    }

    static async getAllUsers(startIndex, count, reqUrl, callback) {
        let query = "SELECT * FROM Users";
        let self = this;

        await db.all(query, async function (err, rows) {
            if (err !== null) {
                out.error("Database.getAllUsers", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            }

            if (rows.length < count) {
                count = rows.length;
            }

            await self.getGroupMemberships(function (err, memberships) {
                if (err !== null) {
                    callback(scimCore.createSCIMError(err, "400"));
                } else {
                    for (let i = 0; i < rows.length; i++) {
                        rows[i]["groups"] = self.getGroupsForUser(rows[i]["id"], memberships);
                    }

                    callback(scimCore.createSCIMUserList(rows, startIndex, count, reqUrl));
                }
            });
        });
    }

    static async getAllGroups(startIndex, count, reqUrl, callback) {
        let query = "SELECT * FROM Groups";
        let self = this;

        await db.all(query, async function (err, rows) {
            if (err !== null) {
                out.error("Database.getAllGroups", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            }

            if (rows.length < count) {
                count = rows.length;
            }

            await self.getGroupMemberships(function (err, memberships) {
                if (err !== null) {
                    callback(scimCore.createSCIMError(err, "400"));
                } else {
                    for (let i = 0; i < rows.length; i++) {
                        rows[i]["members"] = self.getUsersForGroup(rows[i]["id"], memberships);
                    }

                    callback(scimCore.createSCIMGroupList(rows, startIndex, count, reqUrl));
                }
            });
        });
    }

    static async getUser(userId, reqUrl, callback) {
        let query = "SELECT * FROM Users WHERE id = '" + String(userId) + "'";
        let self = this;

        await db.get(query, async function (err, rows) {
            if (err !== null) {
                out.error("Database.getUser", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            } else {
                await self.getGroupMemberships(function (err, memberships) {
                    if (err !== null) {
                        callback(scimCore.createSCIMError(err, "400"));
                    } else {
                        rows["groups"] = self.getGroupsForUser(rows["id"], memberships);
                        callback(scimCore.parseSCIMUser(rows, reqUrl));
                    }
                });
            }
        });
    }

    static async getGroup(groupId, reqUrl, callback) {
        let query = "SELECT * FROM Groups WHERE id = '" + String(groupId) + "'";
        let self = this;

        await db.get(query, async function (err, rows) {
            if (err !== null) {
                out.error("Database.getGroup", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("Group Not Found", "404"));
            } else {
                await self.getGroupMemberships(function (err, memberships) {
                    if (err !== null) {
                        callback(scimCore.createSCIMError(err, "400"));
                    } else {
                        rows["members"] = self.getUsersForGroup(rows["id"], memberships);
                        callback(scimCore.parseSCIMGroup(rows, reqUrl));
                    }
                });
            }
        });
    }

    static async createUser(userModel, reqUrl, callback) {
        let query = "SELECT * FROM Users WHERE userName='" + userModel["userName"] + "'";

        await db.get(query, function (err, rows) {
            if (err !== null) {
                out.error("Database.createUser::SELECT", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                let userId = String(uuid.v1());

                query = "INSERT INTO Users (id, active, userName, givenName, middleName, familyName, email) \
                         VALUES ('" + String(userId) + "', '" + userModel["active"] + "', '" + userModel["userName"] +
                        "', '" + userModel["givenName"] + "', '" + userModel["middleName"] + "', '" +
                        userModel["familyName"] + "', '" + userModel["email"] + "')";

                db.run(query, async function (err) {
                    if (err !== null) {
                        out.error("Database.createUser::INSERT", err);

                        callback(scimCore.createSCIMError(err, "400"));
                    }

                    let groups = userModel["groups"];

                    if (groups.length === 0) {
                        callback(scimCore.createSCIMUser(userId, true, userModel["userName"], userModel["givenName"],
                            userModel["middleName"], userModel["familyName"], userModel["email"],
                            null, reqUrl));
                    } else {

                        let membershipId = null;

                        query = "INSERT INTO GroupMemberships (id, groupId, userId) VALUES";

                        for (let i = 0; i < groups.length; i++) {
                            if (i > 0) {
                                query = query + ",";
                            }

                            membershipId = String(uuid.v1());

                            query = query + " ('" + membershipId + "', '" + groups[i]["value"] + "', '" + userId + "')";
                        }

                        query = query + ";";
                        await db.run(query, function (err) {
                            if (err !== null) {
                                out.error("Database.createUser::MEMBERSHIPS", err);

                                callback(scimCore.createSCIMError(err, "400"));
                            } else {
                                callback(scimCore.createSCIMUser(userId, true, userModel["userName"], userModel["givenName"],
                                    userModel["middleName"], userModel["familyName"], userModel["email"],
                                    groups, reqUrl));
                            }
                        });
                    }
                });
            } else {
                callback(scimCore.createSCIMError("Conflict - User already exists", "409"));
            }
        });
    }

    static async createGroup(groupModel, reqUrl, callback) {
        let query = "SELECT * FROM Groups WHERE displayName='" + groupModel["displayName"] + "'";

        await db.get(query, function (err, rows) {
            if (err !== null) {
                out.error("Database.createGroup::SELECT", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                let groupId = String(uuid.v1());

                query = "INSERT INTO Groups (id, displayName) \
                         VALUES ('" + String(groupId) + "', '" + groupModel["displayName"] + "')";

                db.run(query, async function (err) {
                    if (err !== null) {
                        out.error("Database.createGroup::INSERT", err);

                        callback(scimCore.createSCIMError(err, "400"));
                    }

                    let members = groupModel["members"];

                    if (members.length === 0) {
                        callback(scimCore.createSCIMGroup(groupId, groupModel["displayName"], null, reqUrl));
                    } else {
                        let membershipId = null;

                        query = "INSERT INTO GroupMemberships (id, userId, groupId) VALUES";

                        for (let i = 0; i < members.length; i++) {
                            if (i > 0) {
                                query = query + ",";
                            }

                            membershipId = String(uuid.v1());

                            query = query + " ('" + membershipId + "', '" + members[i]["value"] + "', '" + groupId + "')";
                        }

                        query = query + ";";

                        await db.run(query, function (err) {
                            if (err !== null) {
                                out.error("Database.createGroup::MEMBERSHIPS", err);

                                callback(scimCore.createSCIMError(err, "400"));
                            } else {
                                callback(scimCore.createSCIMGroup(groupId, groupModel["displayName"], members, reqUrl));
                            }
                        });
                    }
                });
            } else {
                callback(scimCore.createSCIMError("Conflict - Group already exists", "409"));
            }
        });
    }

    static async patchUser(attributeName, attributeValue, userId, reqUrl, callback) {
        let query = "UPDATE Users SET " + attributeName + " = '" + attributeValue + "' WHERE id = '" + String(userId) + "'";
        let self = this;

        await db.run(query, function (err) {
            if (err !== null) {
                out.error("Database.patchUser::UPDATE", err);

                callback(scimCore.createSCIMError(err, "400"));
            }

            query = "SELECT * FROM Users WHERE id = '" + userId + "'";

            db.get(query, async function (err, rows) {
                if (err !== null) {
                    out.error("Database.patchUser::SELECT", err);

                    callback(scimCore.createSCIMError(err, "400"));
                } else if (rows === undefined) {
                    callback(scimCore.createSCIMError("User Not Found", "404"));
                } else {
                    await self.getGroupMemberships(function (err, memberships) {
                        if (err !== null) {
                            callback(scimCore.createSCIMError(err, "400"));
                        } else {
                            rows["groups"] = self.getGroupsForUser(rows["id"], memberships);
                            callback(scimCore.parseSCIMUser(rows, reqUrl));
                        }
                    });
                }
            });
        });
    }

    static async patchGroup(attributeName, attributeValue, groupId, reqUrl, callback) {
        let query = "UPDATE Groups SET " + attributeName + " = '" + attributeValue + "' WHERE id = '" + String(groupId) + "'";
        let self = this;

        await db.run(query, function (err) {
            if (err !== null) {
                out.error("Database.patchGroup::UPDATE", err);

                callback(scimCore.createSCIMError(err, "400"));
            }

            query = "SELECT * FROM Groups WHERE id = '" + groupId + "'";

            db.get(query, async function (err, rows) {
                if (err !== null) {
                    out.error("Database.patchGroup::SELECT", err);

                    callback(scimCore.createSCIMError(err, "400"));
                } else if (rows === undefined) {
                    callback(scimCore.createSCIMError("Group Not Found", "404"));
                } else {
                    await self.getGroupMemberships(function (err, memberships) {
                        if (err !== null) {
                            callback(scimCore.createSCIMError(err, "400"));
                        } else {
                            rows["members"] = self.getUsersForGroup(rows["id"], memberships);
                            callback(scimCore.parseSCIMGroup(rows, reqUrl));
                        }
                    });
                }
            });
        });
    }

    static async updateUser(userModel, userId, reqUrl, callback) {
        let query = "SELECT * FROM Users WHERE id = '" + String(userId) + "'";

        await db.get(query, async function (err, rows) {
            if (err !== null) {
                out.error("Database.updateUser::SELECT", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            } else {
                query = "UPDATE Users SET userName = '" + userModel["userName"] + "', givenName = '" + userModel["givenName"] +
                    "', middleName = '" + userModel["middleName"] + "', familyName = '" + userModel["familyName"] +
                    "', email = '" + userModel["email"] + "' WHERE id = '" + String(userId) + "'";

                await db.run(query, async function (err) {
                    if (err !== null) {
                        out.error("Database.updateUser::UPDATE", err);

                        callback(scimCore.createSCIMError(err, "400"));
                    }

                    let groups = userModel["groups"];
                    let membershipId = null;

                    query = "INSERT INTO GroupMemberships (id, groupId, userId) VALUES";

                    for (let i = 0; i < groups.length; i++) {
                        if (i > 0) {
                            query = query + ",";
                        }

                        membershipId = String(uuid.v1());

                        query = query + " ('" + membershipId + "', '" + groups[i]["value"] + "', '" + userId + "')";
                    }

                    query = query + ";";

                    await db.run(query, function (err) {
                        if (err !== null) {
                            out.error("Database.updateUser::MEMBERSHIPS", err);

                            callback(scimCore.createSCIMError(err, "400"));
                        } else {
                            callback(scimCore.createSCIMUser(userId, rows.active, userModel["userName"], userModel["givenName"],
                                userModel["middleName"], userModel["familyName"], userModel["email"],
                                groups, reqUrl));
                        }
                    });
                });
            }
        });
    }

    static async updateGroup(groupModel, groupId, reqUrl, callback) {
        let query = "SELECT * FROM Groups WHERE id = '" + String(groupId) + "'";

        await db.get(query, function (err, rows) {
            if (err !== null) {
                out.error("Database.updateGroup::SELECT", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("Group Not Found", "404"));
            } else {
                query = "UPDATE Groups SET displayName = '" + groupModel["displayName"] + "' WHERE id = '" + String(groupId) + "'";

                db.run(query, async function (err) {
                    if (err !== null) {
                        out.error("Database.updateGroup::UPDATE", err);

                        callback(scimCore.createSCIMError(err, "400"));
                    }

                    let members = groupModel["members"];
                    let membershipId = null;

                    query = "INSERT INTO GroupMemberships (id, userId, groupId) VALUES";

                    for (let i = 0; i < members.length; i++) {
                        if (i > 0) {
                            query = query + ",";
                        }

                        membershipId = String(uuid.v1());

                        query = query + " ('" + membershipId + "', '" + members[i]["value"] + "', '" + groupId + "')";
                    }

                    query = query + ";";

                    await db.run(query, function (err) {
                        if (err !== null) {
                            out.error("Database.updateGroup::MEMBERSHIPS", err);

                            callback(scimCore.createSCIMError(err, "400"));
                        } else {
                            callback(scimCore.createSCIMGroup(groupId, groupModel["displayName"], members, reqUrl));
                        }
                    });
                });
            }
        });
    }

    static async getGroupMemberships(callback) {
        let query = "SELECT m.groupId, m.userId, g.displayName, u.givenName, u.familyName " +
                    "FROM GroupMemberships m " +
                    "LEFT JOIN Groups g ON m.groupId = g.id " +
                    "LEFT JOIN Users u ON m.userId = u.id";

        await db.all(query, function (err, rows) {
            if (err !== null) {
                out.error("Database.getGroupMemberships", err);

                callback(err, null);
            } else if (rows === undefined) {
                callback(null, null);
            } else {
                let memberships = [];

                for (let i = 0; i < rows.length; i++) {
                    let userDisplay = rows[i]["givenName"] + " " + rows[i]["familyName"];
                    memberships.push(mGroupMembership.createMembership(rows[i]["groupId"], rows[i]["userId"],
                        rows[i]["displayName"], userDisplay));
                }

                callback(null, memberships);
            }
        });
    }

    static getGroupsForUser(userId, memberships) {
        let userGroups = [];

        for (let i = 0; i < memberships.length; i++) {
            if (memberships[i]["userId"] === String(userId)) {
                userGroups.push(mUser.createGroup(memberships[i]["groupId"], memberships[i]["groupDisplay"]));
            }
        }

        return userGroups;
    }

    static getUsersForGroup(groupId, memberships) {
        let groupUsers = [];

        for (let i = 0; i < memberships.length; i++) {
            if (memberships[i]["groupId"] === String(groupId))
            {
                groupUsers.push(mGroup.createUser(memberships[i]["userId"], memberships[i]["userDisplay"]));
            }
        }

        return groupUsers;
    }
}

module.exports = Database;