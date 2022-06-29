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

const Knex = require("knex");
const pgClient = "postgres";
const { v4: uuidv4 } = require('uuid');
let scimCore = require('./SCIMCore');
let out = require('./Logs');
let mUser = require('../models/User');
let mGroup = require('../models/Group');
let mGroupMembership = require('../models/GroupMembership');

let config = {
    client: pgClient,
    connection: {
        host: process.env["POSTGRESQL_HOST"],
        port: process.env["POSTGRESQL_PORT"],
        user: process.env["POSTGRESQL-USER"],
        password: process.env["POSTGRESQL-PASSWORD"],
        database: process.env["POSTGRESQL_DATABASE"]
    }
}
let knex = Knex(config);

class Database {
    static async dbInit() {

        const UserTableExists = await knex.schema.hasTable('Users');
        const GroupsTableExists = await knex.schema.hasTable('Groups');
        const GroupMembershipsTableExists = await knex.schema.hasTable('GroupMemberships');

        if (!UserTableExists) {
            await knex.schema
                .raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
                .createTableIfNotExists('Users', function (tableBuilder) {
                    tableBuilder.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"));
                    tableBuilder.integer('active');
                    tableBuilder.string('userName', 255);
                    tableBuilder.string('givenName', 255);
                    tableBuilder.string('middleName', 255);
                    tableBuilder.string('familyName', 255);
                    tableBuilder.string('email', 255);

                })
        }

        if (!GroupsTableExists) {
            await knex.schema.createTableIfNotExists("Groups", function (tableBuilder) {
                tableBuilder.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"));
                tableBuilder.string('displayName', 255);
            })
        }

        if (!GroupMembershipsTableExists) {
            await knex.schema.createTableIfNotExists('GroupMemberships', function (tableBuilder) {
                tableBuilder.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"));
                tableBuilder.uuid('groupId').unique();
                tableBuilder.uuid('userId').unique();
            });
        }

    }

    static async getFilteredUsers(filterAttribute, filterValue, startIndex, count, reqUrl, callback) {

        let query = "SELECT * FROM \"Users\" WHERE " + "\"" + filterAttribute + "\"" + "='" + filterValue + "'";
        let self = this;
        try {
            let result = await knex.raw(query);
            let rows = result.rows;

            if (rows.length === 0) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            } else {
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
            }
        }  catch (e) {
            out.error("Database.getFilteredUsers", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async getFilteredGroups(filterAttribute, filterValue, startIndex, count, reqUrl, callback) {
        let query = "SELECT * FROM \"Groups\" WHERE " + "\"" + filterAttribute + "\"" + "='" + filterValue + "'";
        let self = this;
        try {
            let result = await knex.raw(query);
            let rows = result.rows;

            if (rows.length === 0) {
                callback(scimCore.createSCIMError("Group Not Found", "404"));
            } else {

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
            }
        } catch (e) {
            out.error("Database.getFilteredGroups", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async getAllUsers(startIndex, count, reqUrl, callback) {
        let query = "SELECT * FROM \"Users\"";
        let self = this;

        try {
            let result = await knex.raw(query);
            let rows = result.rows;

            if (rows.length === 0) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            } else {
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
            }
        } catch (e) {
            out.error("Database.getAllUsers", e);

            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async getAllGroups(startIndex, count, reqUrl, callback) {
        let query = "SELECT * FROM \"Groups\"";
        let self = this;

        try {
            let result = await knex.raw(query);
            let rows = result.rows;

            if (rows.length === 0) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            } else {
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
            }

        } catch (e) {
            out.error("Database.getAllGroups", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async getUser(userId, reqUrl, callback) {
        let query = "SELECT * FROM \"Users\" WHERE id = '" + String(userId) + "'";
        let self = this;

        try {
            let result = await knex.raw(query);
            let rows = result.rows;

            if (rows.length === 0) {
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

        } catch (e) {
            out.error("Database.getUser", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async getGroup(groupId, reqUrl, callback) {
        let query = "SELECT * FROM \"Groups\" WHERE id = '" + String(groupId) + "'";
        let self = this;

        try {
            let result = await knex.raw(query);
            let rows = result.rows;

            if (rows.length === 0) {
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
        } catch (e) {
            out.error("Database.getGroup", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async createUser(userModel, reqUrl, callback) {
        let query = "SELECT * FROM \"Users\" WHERE \"userName\"='" + userModel["userName"] + "'";

        try {
           let selectResult = await knex.raw(query);
           let selectRows = selectResult.rows;

           if (rows.length === 0) {
               let userId = uuidv4();
               query = "INSERT INTO \"Users\" (id, active, \"userName\", \"givenName\", \"middleName\", \"familyName\", email) \
                         VALUES ('" + userId +"', '" + userModel["active"] + "', '" + userModel["userName"] +
                        "', '" + userModel["givenName"] + "', '" + userModel["middleName"] + "', '" +
                        userModel["familyName"] + "', '" + userModel["email"] + "')";

               try {
                   let insertResult = await knex.raw(query);
                   let groups = userModel["groups"];

                   if (groups.length === 0) {
                       callback(scimCore.createSCIMUser(userId, true, userModel["userName"], userModel["givenName"],
                           userModel["middleName"], userModel["familyName"], userModel["email"],
                           null, reqUrl));
                   } else {
                       let membershipId = null;
                       query = "INSERT INTO \"GroupMemberships\" (id, groupId, userId) VALUES";

                       for (let i = 0; i < groups.length; i++) {
                           if (i > 0) {
                               query = query + ",";
                           }

                           membershipId = uuidv4();

                           query = query + " ('" + membershipId + "', '" + groups[i]["value"] + "', '" + userId + "')";
                       }

                       query = query + ";";

                       try {
                           let membershipInsert = await knex.raw(query);
                           callback(scimCore.createSCIMUser(userId, true, userModel["userName"], userModel["givenName"],
                               userModel["middleName"], userModel["familyName"], userModel["email"],
                               groups, reqUrl));

                       } catch (e) {
                           out.error("Database.createUser::MEMBERSHIPS", e);
                           callback(scimCore.createSCIMError(e, "400"));
                       }

                   }

               } catch (e) {
                   out.error("Database.createUser::INSERT", e);
                   callback(scimCore.createSCIMError(e, "400"));
               }

           } else {
               callback(scimCore.createSCIMError("Conflict - User already exists", "409"));
           }

        } catch (e) {
            out.error("Database.createUser::SELECT", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async createGroup(groupModel, reqUrl, callback) {
        let query = "SELECT * FROM \"Groups\" WHERE \"displayName\"='" + groupModel["displayName"] + "'";

        try {
            let result = await knex.raw(query);
            let rows = result.rows;

            if (rows.length === 0) {
                let groupId = uuidv4();

                query = "INSERT INTO Groups (id, \"displayName\") \
                         VALUES ('" + groupId + "', '" + groupModel["displayName"] + "')";

                try {
                    let groupInsertResult = await knex.raw(query);

                    let members = groupModel["members"];

                    if (members.length === 0) {
                        callback(scimCore.createSCIMGroup(groupId, groupModel["displayName"], null, reqUrl));
                    } else {
                        let membershipId = null;

                        query = "INSERT INTO \"GroupMemberships\" (id, \"userId\", \"groupId\") VALUES";

                        for (let i = 0; i < members.length; i++) {
                            if (i > 0) {
                                query = query + ",";
                            }

                            membershipId = uuidv4();

                            query = query + " ('" + membershipId + "', '" + members[i]["value"] + "', '" + groupId + "')";
                        }

                        query = query + ";";

                        try {
                            let groupMembershipInsert = await knex.raw(query);
                            callback(scimCore.createSCIMGroup(groupId, groupModel["displayName"], members, reqUrl));
                        } catch (e) {
                            out.error("Database.createGroup::MEMBERSHIPS", err);
                            callback(scimCore.createSCIMError(err, "400"));
                        }
                    }
                } catch (e) {
                    out.error("Database.createGroup::INSERT", e);
                    callback(scimCore.createSCIMError(e, "400"));
                }
            } else {
                callback(scimCore.createSCIMError("Conflict - Group already exists", "409"));
            }
        } catch (e) {
            out.error("Database.createGroup::SELECT", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async patchUser(attributeName, attributeValue, userId, reqUrl, callback) {
        let query = "UPDATE \"Users\" SET " + attributeName + " = '" + attributeValue + "' WHERE id = '" + String(userId) + "'";
        let self = this;

        try {
            let updateUserResult = await knex.raw(query);

            query = "SELECT * FROM \"Users\" WHERE id = '" + userId + "'";

            try {
                let userResult = await knex.raw(query);
                let rows = userResult.rows;
                if (rows.length === 0) {
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
            } catch (e) {
                out.error("Database.patchUser::SELECT", e);
                callback(scimCore.createSCIMError(e, "400"));
            }

        } catch (e) {
            out.error("Database.patchUser::UPDATE", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async patchGroup(attributeName, attributeValue, groupId, reqUrl, callback) {
        let query = "UPDATE \"Groups\" SET " + "\"" + attributeName + "\"" + " = '" + attributeValue + "' WHERE id = '" + String(groupId) + "'";
        let self = this;

        try {
            let updateGroupResult = await knex.raw(query);
            query = "SELECT * FROM \"Groups\" WHERE id = '" + groupId + "'";

            try {
                let selectGroupResult = await knex.raw(query);
                let rows = selectGroupResult.rows;

                if (rows.length === 0) {
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
            } catch (e) {
                out.error("Database.patchGroup::SELECT", e);
                callback(scimCore.createSCIMError(e, "400"));
            }

        } catch (e) {
            out.error("Database.patchGroup::UPDATE", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async updateUser(userModel, userId, reqUrl, callback) {
        let query = "SELECT * FROM \"Users\" WHERE id = '" + String(userId) + "'";

        try {
            let selectUsersResult = await knex.raw(query);
            let rows = selectUsersResult.rows;

            if (rows.length === 0) {
                callback(scimCore.createSCIMError("User Not Found", "404"));
            } else {
                query = "UPDATE \"Users\" SET \"userName\" = '" + userModel["userName"] + "', \"givenName\" = '" + userModel["givenName"] +
                    "', \"middleName\" = '" + userModel["middleName"] + "', \"familyName\" = '" + userModel["familyName"] +
                    "', email = '" + userModel["email"] + "' WHERE id = '" + String(userId) + "'";

                try {
                    let updateUserResult = await knex.raw(query);

                    let groups = userModel["groups"];
                    let membershipId = null;

                    query = "INSERT INTO \"GroupMemberships\" (id, \"groupId\", \"userId\") VALUES";

                    for (let i = 0; i < groups.length; i++) {
                        if (i > 0) {
                            query = query + ",";
                        }

                        membershipId = uuidv4();

                        query = query + " ('" + membershipId + "', '" + groups[i]["value"] + "', '" + userId + "')";
                    }

                    query = query + ";";

                    try {
                        let insertGroupMembershipsResult = await knex.raw(query);
                        callback(scimCore.createSCIMUser(userId, rows.active, userModel["userName"], userModel["givenName"],
                            userModel["middleName"], userModel["familyName"], userModel["email"],
                            groups, reqUrl));
                    } catch (e) {
                        out.error("Database.updateUser::MEMBERSHIPS", e);
                        callback(scimCore.createSCIMError(e, "400"));
                    }

                } catch (e) {
                    out.error("Database.updateUser::UPDATE", e);

                    callback(scimCore.createSCIMError(e, "400"));
                }
            }

        } catch (e) {
            out.error("Database.updateUser::SELECT", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async updateGroup(groupModel, groupId, reqUrl, callback) {
        let query = "SELECT * FROM \"Groups\" WHERE id = '" + String(groupId) + "'";

        try {
            let selectGroupsResult = await knex.raw(query);
            let rows = selectGroupsResult.rows;
            if (rows.length === 0) {
                callback(scimCore.createSCIMError("Group Not Found", "404"));
            } else {
                query = "UPDATE \"Groups\" SET \"displayName\" = '" + groupModel["displayName"] + "' WHERE id = '" + String(groupId) + "'";

                try {
                    let updateGroupsResult = await knex.raw(query);

                    let members = groupModel["members"];
                    let membershipId = null;

                    query = "INSERT INTO \"GroupMemberships\" (id, \"userId\", \"groupId\") VALUES";

                    for (let i = 0; i < members.length; i++) {
                        if (i > 0) {
                            query = query + ",";
                        }

                        membershipId = uuidv4();

                        query = query + " ('" + membershipId + "', '" + members[i]["value"] + "', '" + groupId + "')";
                    }

                    query = query + ";";

                    try {
                        let insertGroupMembershipsResult = await knex.raw(query);
                        callback(scimCore.createSCIMGroup(groupId, groupModel["displayName"], members, reqUrl));
                    } catch (e) {
                        out.error("Database.updateGroup::MEMBERSHIPS", e);
                        callback(scimCore.createSCIMError(e, "400"));
                    }

                } catch (e) {
                    out.error("Database.updateGroup::UPDATE", e);

                    callback(scimCore.createSCIMError(e, "400"));
                }
            }
        } catch (e) {
            out.error("Database.updateGroup::SELECT", e);
            callback(scimCore.createSCIMError(e, "400"));
        }
    }

    static async getGroupMemberships(callback) {
        let query = "SELECT m.groupId, m.userId, g.displayName, u.givenName, u.familyName " +
                    "FROM \"GroupMemberships\" m " +
                    "LEFT JOIN \"Groups\" g ON m.groupId = g.id " +
                    "LEFT JOIN \"Users\" u ON m.userId = u.id";
        try {
            let result = await knex.raw(query);
            let rows = result.rows;

            if (rows.length === 0) {
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
        } catch (e) {
            out.error("Database.getGroupMemberships", e);
            callback(e, null);
        }
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