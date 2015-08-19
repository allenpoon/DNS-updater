var conf = require('./conf/config.json');
var os = require('os');
var fs = require('fs')
var file = fs.createWriteStream('./update.log',{flags: 'a', mode:0644});
var dns = [];

(function(){
	var dnsModules = fs.readdirSync('./lib-enable');
	for(var i=0;i<dnsModules.length; i++){
		if(dnsModules[i].match(/\.js$/)){
			dns.push(require('./lib-enable/'+dnsModules[i]));
		}
	}
})();

var ip = 0;
var isIPChanged = (function(){
	var result = false;
	return function(){
		var ifList = os.networkInterfaces();
		for(var i = 0; i < ifList['p4p1'].length; i++){
			if('IPv4' === ifList['p4p1'][i].family && ifList['p4p1'][i].internal === false){
				if(result = (ip != ifList['p4p1'][i].address)){
					ip = ifList['p4p1'][i].address;
				}
			}
		}
		return result;
	}
})();

var log = function(result){
	try{
		file.write('['+new Date().toISOString()+'] "'+result.domain+'" is updated to "'+result.ip+'"'+"\n");
	}catch(e){
		console.log(e);
	}
	console.log('['+new Date().toISOString()+'] "'+result.domain+'" is updated to "'+result.ip+'"');
}

var updateIP = function(){
//	for(var i=0;i<dns.length;i++){
//		dns[i](log, ip);
//	}
	dns.forEach(function(module){module(log, ip)});
}

isIPChanged() && updateIP();
setInterval(function(){ isIPChanged() && updateIP(); }, conf.updatePeriod*1000);
setInterval(updateIP, conf.forceUpdatePeriod*1000);
