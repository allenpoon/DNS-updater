var conf = [];
try{
	conf = require('../conf/noip.com.json');
}catch(e){};

if(conf.length>0){
	var https = require('https');

	var updateOptions = {
		hostname: 'dynupdate.no-ip.com',
		port: 443,
		method: 'GET',
		headers: {
			'User-Agent': 'DNS updater/0.0 a1b2c3d42003hongkong@hotmail.com'
		}
	}
	function update(cb, account, ipList){
		updateOptions.headers.Authorization = "Basic " + new Buffer(account.username+':'+account.password).toString("base64");

		var updater = function(hostList, ip){
			updateOptions.path = '/nic/update?hostname='+hostList.join(',')+'&myip='+ip;
			var req = https.request(updateOptions, function(){
				if(cb && cb.constructor){
					for(var k=0; k<hostList.length; k++){
						cb({
							domain: hostList[k],
							ip: ip,
							type: 'A'
						});
					}
				}
			});
			req.end();
		}
		var hostList = {};
		for(var i=0;i<account.hostname.length; i++){
			if(!hostList[account.hostname[i].if]) hostList[account.hostname[i].if] = [];
			hostList[account.hostname[i].if].push(account.hostname[i].name);
		}
		for(var x in hostList){
			updater(hostList[x], ipList[x].ipv4);
		}
	}

	module.exports = function(cb, ipList){
		for(var i=0;i<conf.length; i++){
			update(cb, conf[i], ipList);
		}
	}
}else{
	module.exports = false;
}
