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
 
 // This module uses the file passwd.json for user authentication.
 // The file is a JSON formatted file with "user": "passwordHash" combinations.
 // The password hash must be a SSHA1 password hash (Salted SHA1)
 // 
 // Default credentials: admin/secret

let out = require('../core/Logs');
let fs = require('fs');
let ssha = require("ssha");

class Authorizer {
    static authorizeUser(username, userpass) {
        out.log("INFO", "Authorizer.authorizeUser", "Authorizing user: " + username);
		
		let passwdFile = JSON.parse(fs.readFileSync('passwd.json', 'utf8'));
		if (passwdFile) {
			out.log("INFO", "Authorizer.authorizeUser", "Password file read.");
			let hash = passwdFile[username];
			if (hash != undefined) {
				let v = ssha.verify(userpass, hash);
				out.log("INFO", "Authorizer.authorizeUser", "Auth Result:" + v);
				return v;
			} else {
				out.log("ERROR", "Authorizer.authorizeUser", "User " + username + " not found");
			}
		}
		return false;
	}
}

module.exports = Authorizer;