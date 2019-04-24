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
 *  - addGroupMembership
 *  - improved query safety (more to do) 
 */

let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('scim.db');
let uuid = require('uuid');
let scimCore = require('./SCIMCore');
let out = require('./Logs');
let mUser = require('../models/User');
let mGroup = require('../models/Group');
let mGroupMembership = require('../models/GroupMembership');

var ALLOWED_USER_FILTER_ATTRS = [ 'id', 'active', 'username', 'givenname', 'middlename', 'familyname', 'email' ];
var ALLOWED_USER_UPDATE_ATTRS = [ 'id', 'active', 'username', 'givenname', 'middlename', 'familyname', 'email' ];
var ALLOWED_GROUP_FILTER_ATTRS = [ 'id', 'displayname' ];

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
    	if (filterAttribute !== undefined && ALLOWED_USER_FILTER_ATTRS.contains(filterAttribute.toLowerCase())) {
            let query = "SELECT * FROM Users WHERE " + filterAttribute + " = ?";
            let self = this;

            await db.all(query, filterValue, async function (err, rows) {
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
    	} else {
    		throw "Invalid user filter attribute";
    	}
    }

    static async getFilteredGroups(filterAttribute, filterValue, startIndex, count, reqUrl, callback) {
    	if (filterAttribute !== undefined && ALLOWED_USER_FILTER_ATTRS.contains(filterAttribute.toLowerCase())) {
            let query = "SELECT * FROM Groups WHERE " + filterAttribute + " = ?";
            let self = this;

            await db.all(query, filterValue, async function (err, rows) {
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
    	} else {
    		throw "Invalid group filter attribute";
    	}
    }

    static async getAllUsers(startIndex, count, reqUrl, callback) {
    	let offset = parseInt(startIndex, 10) - 1;
    	if (offset < 0) {
    		offset = 0;
    	}
    	let limit = parseInt(count, 10);
    	let query = "SELECT * FROM Users LIMIT ? OFFSET ?";
        let self = this;

        await db.all(query, limit, offset, async function (err, rows) {
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
    	let offset = parseInt(startIndex, 10) - 1;
    	if (offset < 0) {
    		offset = 0;
    	}
    	let limit = parseInt(count, 10);
        let query = "SELECT * FROM Groups LIMIT ? OFFSET ?";
        let self = this;

        await db.all(query, limit, offset, async function (err, rows) {
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
        let query = "SELECT * FROM Users WHERE id = ?";
        let self = this;

        await db.get(query, String(userId), async function (err, rows) {
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
        let query = "SELECT * FROM Groups WHERE id = ?";
        let self = this;

        await db.get(query, String(groupId), async function (err, rows) {
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
        let query = "SELECT * FROM Users WHERE userName = ?";
        let activeValue = 'false';
        let active = userModel["active"];
        if (active !== undefined && (active === 1 || active === '1' || active === 'true' || active === true)) {
        	activeValue = 'true';
        } 

        await db.get(query, userModel["userName"], function (err, rows) {
            if (err !== null) {
                out.error("Database.createUser::SELECT", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                let userId = String(uuid.v1());

                query = "INSERT INTO Users (id, active, userName, givenName, middleName, familyName, email) \
                         VALUES (?,?,?,?,?,?,?)";

                db.run(query, String(userId), activeValue, userModel["userName"], userModel["givenName"], 
                		userModel["middleName"], userModel["familyName"], userModel["email"], async function (err) {
                    if (err !== null) {
                        out.error("Database.createUser::INSERT", err);

                        callback(scimCore.createSCIMError(err, "400"));
                    }

                    let groups = userModel["groups"];

                    if (groups.length === 0) {
                        callback(scimCore.createSCIMUser(userId, activeValue, userModel["userName"], userModel["givenName"],
                            userModel["middleName"], userModel["familyName"], userModel["email"],
                            null, reqUrl));
                    } else {
                        let error = null;
                        for (let i = 0; i < groups.length && error === null; i++) {
                        	let groupId = groups[i]["value"];                        	
                        	addGroupMembership(userId, groupId, reqUrl, function(err) {
                        		error = err;
                        	});
                        }

                        if (error !== null) {
                            out.error("Database.createUser::MEMBERSHIPS", error);
                            callback(scimCore.createSCIMError(error, "400"));
                        } else {
                            callback(scimCore.createSCIMUser(userId, activeValue, userModel["userName"], userModel["givenName"],
                                userModel["middleName"], userModel["familyName"], userModel["email"],
                                groups, reqUrl));
                        }
                    }
                });
            } else {
                callback(scimCore.createSCIMError("Conflict - User already exists", "409"));
            }
        });
    }

    static async createGroup(groupModel, reqUrl, callback) {
        let query = "SELECT * FROM Groups WHERE displayName = ?";

        await db.get(query, groupModel["displayName"], function (err, rows) {
            if (err !== null) {
                out.error("Database.createGroup::SELECT", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                let groupId = String(uuid.v1());

                query = "INSERT INTO Groups (id, displayName) VALUES (?, ?)";

                db.run(query, String(groupId), groupModel["displayName"], async function (err) {
                    if (err !== null) {
                        out.error("Database.createGroup::INSERT", err);

                        callback(scimCore.createSCIMError(err, "400"));
                    }

                    let members = groupModel["members"];

                    if (members.length === 0) {
                        callback(scimCore.createSCIMGroup(groupId, groupModel["displayName"], null, reqUrl));
                    } else {
                    	let error = null;
                        for (let i = 0; i < members.length && error === null; i++) {
                        	let userId = members[i]["value"];
                        	addGroupMembership(userId, groupId, reqUrl, function(err) {
                        		error = err;
                        	});
                        }
                        if (error !== null) {
                            out.error("Database.createGroup::MEMBERSHIPS", error);
                            callback(scimCore.createSCIMError(error, "400"));
                        } else {
                            callback(scimCore.createSCIMGroup(groupId, groupModel["displayName"], members, reqUrl));
                        }
                    }
                });
            } else {
                callback(scimCore.createSCIMError("Conflict - Group already exists", "409"));
            }
        });
    }

    static async patchUser(attributeName, attributeValue, userId, reqUrl, callback) {
    	if (ALLOWED_USER_UPDATE_ATTRS.contains(attributeName)) {
        	let query = "UPDATE Users SET " + attributeName + " = ? WHERE id = ?";
            let self = this;

            await db.run(query, attributeValue, String(userId), function (err) {
                if (err !== null) {
                    out.error("Database.patchUser::UPDATE", err);

                    callback(scimCore.createSCIMError(err, "400"));
                }

                query = "SELECT * FROM Users WHERE id = ?";

                db.get(query, userId, async function (err, rows) {
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
    	} else {
    		throw "Invalid attribute: " + attributeName;
    	}
    }

    static async patchGroup(attributeName, attributeValue, groupId, reqUrl, callback) {
    	if (ALLOWED_GROUP_UPDATE_ATTRS.contains(attributeName)) {
        	let query = "UPDATE Groups SET " + attributeName + " = ? WHERE id = ?";
            let self = this;

            await db.run(query, attributeValue, String(groupId), function (err) {
                if (err !== null) {
                    out.error("Database.patchGroup::UPDATE", err);

                    callback(scimCore.createSCIMError(err, "400"));
                }

                query = "SELECT * FROM Groups WHERE id = ?";

                db.get(query, groupId, async function (err, rows) {
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
    	} else {
    		throw "Invalid attribute: " + attributeName;
    	}
    }

    static async updateUser(userModel, userId, reqUrl, callback) {
        let query = "SELECT * FROM Users WHERE id = ?";

        await db.get(query, String(userId), async function (err, rows) {
            if (err !== null) {
                out.error("Database.updateUser::SELECT", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            } else {
                query = "UPDATE Users SET userName = ?, givenName = ?," +
                    "middleName = ?, familyName = ?, email = ? WHERE id = ?";

                await db.run(query, userModel["userName"], userModel["givenName"], userModel["middleName"],
                		userModel["familyName"], userModel["email"], String(userId), async function (err) {
                    if (err !== null) {
                        out.error("Database.updateUser::UPDATE", err);

                        callback(scimCore.createSCIMError(err, "400"));
                    }

                    let groups = userModel["groups"];
                    let error = null;
                    query = "DELETE FROM GroupMemberships WHERE userId = ?";
                    await db.run(query, userId, function(err) {
                    	error = err;
                    });

                    for (let i = 0; i < groups.length && error === null; i++) {
                    	let groupId = groupd[i];
                    	addGroupMembership(userId, groupId, reqUrl, function(err) {
                    		error = err;
                    	});
                    }
                    if (err !== null) {
                        out.error("Database.updateUser::MEMBERSHIPS", err);
                        callback(scimCore.createSCIMError(err, "400"));
                    } else {
                        callback(scimCore.createSCIMUser(userId, rows.active, userModel["userName"], userModel["givenName"],
                            userModel["middleName"], userModel["familyName"], userModel["email"],
                            groups, reqUrl));
                    }
                });
            }
        });
    }

    static async updateGroup(groupModel, groupId, reqUrl, callback) {
        let query = "SELECT * FROM Groups WHERE id = ?";

        await db.get(query, String(groupId), function (err, rows) {
            if (err !== null) {
                out.error("Database.updateGroup::SELECT", err);

                callback(scimCore.createSCIMError(err, "400"));
            } else if (rows === undefined) {
                callback(scimCore.createSCIMError("Group Not Found", "404"));
            } else {
                query = "UPDATE Groups SET displayName = ? WHERE id = ?";

                db.run(query, groupModel["displayName"], String(groupId), async function (err) {
                    if (err !== null) {
                        out.error("Database.updateGroup::UPDATE", err);

                        callback(scimCore.createSCIMError(err, "400"));
                    }

                    let members = groupModel["members"];
                    let error = null;
                    query = "DELETE FROM GroupMemberships WHERE groupId = ?";
                    await db.run(query, groupId, function(err) {
                    	error = err;
                    });

                    for (let i = 0; i < members.length; i++) {
                    	let userId = members[i];
                    	addGroupMembership(userId, groupId, reqUrl, function(err) {
                    		error = err;
                    	});
                    }

                    if (err !== null) {
                        out.error("Database.updateGroup::MEMBERSHIPS", err);
                        callback(scimCore.createSCIMError(err, "400"));
                    } else {
                        callback(scimCore.createSCIMGroup(groupId, groupModel["displayName"], members, reqUrl));
                    }
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
    
    static async addGroupMembership(userId, groupId, reqUrl, callback) {
    	out.log("ERROR", "Database.addGroupMembership", "userId: " + userId + "; groupId: " + groupId + "; reqUrl: " + reqUrl);
    	let self = this;
    	let query = "INSERT INTO GroupMemberships (id, groupId, userId) VALUES(?, ?, ?)";
    	let membershipId = String(uuid.v1());
    	
    	db.run(query, membershipId, groupId, userId, async function (err) {
            if (err !== null) {
                out.error("Database.addGroupMembership::INSERT", err);
                callback(scimCore.createSCIMError(err, "400"));
            } else {
            	Database.getUser(userId, reqUrl, callback);
            }
    	});
    }

    static async removeGroupMembership(userId, groupId, reqUrl, callback) {
    	out.log("ERROR", "Database.addGroupMembership", "userId: " + userId + "; groupId: " + groupId + "; reqUrl: " + reqUrl);
    	let self = this;
    	let query = "DELETE FROM GroupMemberships WHERE groupId = ? AND userId = ?";
    	
    	db.run(query, groupId, userId, async function (err) {
            if (err !== null) {
                out.error("Database.removeGroupMembership::DELETE", err);
                callback(scimCore.createSCIMError(err, "400"));
            } else {
            	Database.getUser(userId, reqUrl, callback);
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