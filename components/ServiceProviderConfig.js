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
let out = require('../core/Logs');
let fs = require('fs');

let spconfig = '';

class ServiceProviderConfig {

  static listServiceProviderConfig(req, res) {
    out.log("INFO", "ServiceProviderConfig.listServiceProviderConfig", "Got request: " + req.url);
	
	let urlParts = url.parse(req.url, true);
	let urlPort = req.app.listener.address().port;
	let urlBase = req.protocol + '://' + req.host + ':' + urlPort + req.url.substring(0, req.url.indexOf('/ServiceProviderConfig'));
	
	if (spconfig == '') {
		spconfig = fs.readFileSync('data/service_provider_config.json', 'utf8');
    }
	
	let result = spconfig.replace(/%%BASEURL%%/gi, urlBase);
	
    res.writeHead(200, {"Content-Type": "text/json"});
    res.end(result);
  }
}

module.exports = ServiceProviderConfig;