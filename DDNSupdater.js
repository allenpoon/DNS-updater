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
	ip[interface]={};
});

// TODO: add multiple record to DNS
// IPv6: private network: fe80::/10 (fe8* - feb*)
// IPv4: private network: 10.0.0.0/8, 172.16.0.0/12 (172.16..0.0 - 172.31.255.255), 192.168.0.0/16

var isIPChanged = function(){
	var result = false;
  if(isWanUp()){
    var ifList = os.networkInterfaces();
    for(var x in ip){
      for(var i = 0; !!ifList[x] && i < ifList[x].length; i++){
        switch(ifList[x][i].family){
          case 'IPv4':
            if(ip[x].ipv4 != ifList[x][i].address){
              ip[x].ipv4 = ifList[x][i].address;
              result = true;
            }
            break;

          case 'IPv6':
          if(ip[x].ipv6 != ifList[x][i].address){
              ip[x].ipv6 = ifList[x][i].address;
              result = true;
            }
            break;
        }
      }
    }
  }
  return result;
};

var isWanUp = function(){
	var wan = os.networkInterfaces();
	var result = true;
	for(var j=0; j<conf.if.length; j++){
		wan = wan[conf.if[j]];
		for(var i=0;!!wan && !result && i<wan.length;i++){
			result &= ('IPv4' === wan[i].family || 'IPv6' === wan[i].family ) && !!wan[i].address;
		}
	}
	return result;
}

var log = (function(){
	switch(conf.log){
		case 'json':
			return function(result){
				try{
					file.write('{time:'+Date.now()+',domain:"'+result.domain+'",ip:"'+result.ip+'",type:"'+result.type+'"}'+"\n");
				}catch(e){
					console.log(e);
				}
				console.log('{time:'+Date.now()+',domain:"'+result.domain+'",ip:"'+result.ip+'",type:"'+result.type+'"}');
			};
		default:
			return function(result){
				try{
					file.write('['+new Date().toISOString()+'] "'+result.domain+'" is updated to "'+result.ip+'" with type "'+result.type+'"'+"\n");
				}catch(e){
					console.log(e);
				}
				console.log('['+new Date().toISOString()+'] "'+result.domain+'" is updated to "'+result.ip+'" with type "'+result.type+'"');
			};
	}
})();

var updateIP = function(){
	dns.forEach(function(module){module(log, ip)});
}

isIPChanged() && updateIP();
setInterval(function(){ isIPChanged() && updateIP(); }, conf.updatePeriod*1000);
setInterval(updateIP, conf.forceUpdatePeriod*1000);
