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
let fs = require('fs');
var userSchema = '';
var groupSchema = '';

// Schemas borrowed from https://raw.githubusercontent.com/imulab/go-scim/master/resources/schemas/user.json
// Copyright for those files:
/*
 * Copyright 2018 Weinan Qiu
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights 
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 * copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

class Schemas {

  static listSchemas(req, res) {
    out.log("INFO", "Schemas.listSchemas", "Got request: " + req.url);
	
    if (userSchema == '') {
      userSchema = fs.readFileSync('data/user_schema.json', 'utf8');
    }
    if (groupSchema == '') {
      groupSchema = fs.readFileSync('data/group_schema.json', 'utf8');
    }

    let response = '{';
    response += '  "totalResults": 2, ';
    response += '  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"], ';
    response += '  "Resources": [ ';
    response += userSchema;
    response += '  , ';
    response += groupSchema;
    response += '  ] ';
    response += '}';


    res.writeHead(200, {
      "Content-Type": "text/json"
    });
    res.end(response);
  }
}

module.exports = Schemas;