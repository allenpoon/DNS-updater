var conf = require('./conf/config.json');
var os = require('os');
var fs = require('fs')
var file = fs.createWriteStream('./update.log',{flags: 'a', mode:0644});
var dns = [];

(function(){
	var dnsModules = fs.readdirSync('./lib');
	var tmp;
	for(var i=0;i<dnsModules.length; i++){
		if(dnsModules[i].match(/\.js$/) && (tmp = require('./lib/'+dnsModules[i]))){
			dns.push(tmp);
		}
	}
})();

if(dns.length == 0){
	console.error('No Configuation found.');
	process.exit(1);
}

var ip = {};
conf.if.forEach(function(interface){
	ip[interface]=0;
});

var isIPChanged = (function(){
	var result = false;
	return function(){
		var ifList = os.networkInterfaces();
		for(var x in ip){
			for(var i = 0; !!ifList[x] && i < ifList[x].length; i++){
				if('IPv4' === ifList[x][i].family && ifList[x][i].internal === false){
					if(ip[x] != ifList[x][i].address){
						ip[x] = ifList[x][i].address;
						result = true;
					}
				}
			}
		}
		return result;
	}
})();

var log = (function(){
	switch(conf.log){
		case 'json':
			return function(result){
				try{
					file.write('{time:'+Date.now()+',domain:"'+result.domain+'",ip:"'+result.ip+'"}'+"\n");
				}catch(e){
					console.log(e);
				}
				console.log('{time:'+Date.now()+',domain:"'+result.domain+'",ip:"'+result.ip+'"}');
			};
		default:
			return function(result){
				try{
					file.write('['+new Date().toISOString()+'] "'+result.domain+'" is updated to "'+result.ip+'"'+"\n");
				}catch(e){
					console.log(e);
				}
				console.log('['+new Date().toISOString()+'] "'+result.domain+'" is updated to "'+result.ip+'"');
			};
	}
})();

var updateIP = function(){
	dns.forEach(function(module){module(log, ip)});
}

isIPChanged() && updateIP();
setInterval(function(){ isIPChanged() && updateIP(); }, conf.updatePeriod*1000);
setInterval(updateIP, conf.forceUpdatePeriod*1000);
