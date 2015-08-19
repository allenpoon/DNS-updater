var https = require('https');
var conf = require('../conf/no-ip.com.json');

var updateOptions = {
	hostname: 'dynupdate.no-ip.com',
	port: 443,
	method: 'GET',
	headers: {
		'User-Agent': 'DDNS updater/0.0 a1b2c3d42003hongkong@hotmail.com'
	}
}
function update(cb, account, ip){
	updateOptions.headers.Authorization = "Basic " + new Buffer(account.username+':'+account.password).toString("base64");
	updateOptions.path = '/nic/update?hostname='+account.hostname.join(',')+'&myip='+ip;

	var req = https.request(updateOptions, function(){
		if(cb && cb.constructor){
			for(var k=0; k<account.hostname.length; k++){
				cb({
					domain: account.hostname[k],
					ip: ip
				});
			}
		}
	});
	req.end(data);
}

module.exports = function(cb, ip){
	for(var i=0;i<conf.length; i++){
		update(cb, conf[i], ip);
	}
}
