/** Copyright © 2019, SailPoint Technologies.
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

let url = require('url');
let scimCore = require('../core/SCIMCore');
let out = require('../core/Logs');

class ResourceTypes {
    static listResourceTypes(req, res) {
        out.log("INFO", "ResourceTypes.listUsers", "Got request: " + req.url);

        let urlParts = url.parse(req.url, true);
		let urlPort = req.app.listener.address().port;
		let urlBase = req.protocol + '://' + req.hostname + ':' + urlPort + req.url.substring(0, req.url.indexOf('/ResourceTypes'));
		out.log("INFO", "ResourceTypes.listResourceTypes", urlBase);

		let response = '{';
			response += '"totalResults": 2, ';
			response += '"schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"], ';
			response += '  "Resources": [{ ';
			// Users
			response += '    "schema": "urn:ietf:params:scim:schemas:core:2.0:User", ';
			response += '    "endpoint": "/Users", ';
			response += '    "meta": { ';
			response += '      "location": "' + urlBase + '/ResourceTypes/User", ';
			response += '      "resourceType": "ResourceType" ';
			response += '    }, ';
			response += '    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"], ';
			response += '    "name": "User", ';
			response += '    "description": "User Account", ';
			response += '    "id": "User" ';
			response += '  }, {';
			// Groups
			response += '    "schema": "urn:ietf:params:scim:schemas:core:2.0:Group", ';
			response += '    "endpoint": "/Groups", ';
			response += '    "meta": { ';
			response += '      "location": "' + urlBase + '/ResourceTypes/Group", ';
			response += '      "resourceType": "ResourceType" ';
			response += '    }, ';
			response += '    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"], ';
			response += '    "name": "Group", ';
			response += '    "description": "Group of Users", ';
			response += '    "id": "Group" ';			
			// --
			response += '  }] ' ;
			response += '}';
		
		res.writeHead(200, {"Content-Type": "text/json"});
		res.end(response);
	}
}

module.exports = ResourceTypes;