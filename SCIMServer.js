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

let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let db = require('./core/Database');
let out = require('./core/Logs');
let cUsers = require('./components/Users');
let cGroups = require('./components/Groups');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let port = process.env.PORT || 8081; // Support for Heroku

/**
 * GET {{baseUrl}}/scim/v2/Users
 * List users with or without a filter
 */
app.get('/scim/v2/Users', cUsers.listUsers);

/**
 * GET {{baseUrl}}/scim/v2/Users/{{userId}}
 * Get a user by ID
 */
app.get('/scim/v2/Users/:userId', cUsers.getUser);

/**
 * POST {{baseUrl}}/scim/v2/Users
 * Create a new user
 */
app.post('/scim/v2/Users', cUsers.createUser);

/**
 * PATCH {{baseUrl}}/scim/v2/Users/{{userId}}
 * Update a user's attribute
 */
app.patch('/scim/v2/Users/:userId', cUsers.patchUser);

/**
 * PUT {{baseUrl}}/scim/v2/Users/{{userId}}
 * Update a user's profile
 */
app.put('/scim/v2/Users/:userId', cUsers.updateUser);

/**
 * GET {{baseUrl}}/scim/v2/Groups
 * List users with or without a filter
 */
app.get('/scim/v2/Groups', cGroups.listGroups);

/**
 * GET {{baseUrl}}/scim/v2/Groups/{{groupId}}
 * Get a group by ID
 */
app.get('/scim/v2/Groups/:groupId', cGroups.getGroup);

/**
 * POST {{baseUrl}}/scim/v2/Groups
 * Create a new group
 */
app.post('/scim/v2/Groups', cGroups.createGroup);

/**
 * PATCH {{baseUrl}}/scim/v2/Groups/{{groupId}}
 * Update a group's attribute
 */
app.patch('/scim/v2/Groups/:groupId', cGroups.patchGroup);

/**
 * PUT {{baseUrl}}/scim/v2/Groups/{{groupId}}
 * Update a group's profile
 */
app.put('/scim/v2/Groups/:groupId', cGroups.updateGroup);

/**
 * GET {{baseUrl}}/scim/v2
 * Default SCIM endpoint
 */
app.get('/scim/v2', function (req, res) {
    res.send('SCIM');
});

let server = app.listen(port, function () {
    out.log("INFO", "ServerStartup", "Listening on port " + port);

    db.dbInit();
});