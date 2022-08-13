var conf = [];
try{
	conf = require('../conf/cloudflare.com.json');
}catch(e){}

if(conf.length > 0){
	var isReady = 0;
	var https = require('https');
	var account = [];
	for(var i=0; i<conf.length; i++){	
		var getZone = {
			hostname: 'api.cloudflare.com',
			port: 443,
			path: '/client/v4/zones',
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			}
		}
		if(conf[i].authorization){
			getZone.headers.Authorization = `Bearer ${conf[i].authorization}`;
		}else if(conf[i].email && conf[i].apikey){
			getZone.headers['X-Auth-Email'] = conf[i].email;
			getZone.headers['X-Auth-Key'] = conf[i].apikey;
		}else{
			throw new Error('cloudflare.com: authorization or email and apikey not set at', i)
		}
		isReady++;
		https.request(getZone, (function(i){ return function(res){
			var partial_data = []
			res.on('data', function (data){
				partial_data.push(data);
			});
			res.on('end', function () {
				var result = [];
				try{
					result = JSON.parse(Buffer.concat(partial_data).toString()).result;
				}catch(e){
					console.log("cloudflare.com: getZone: ", e);
				}
				account[i] = {};
				for(var a=0; a<result.length; a++){
					if(!!conf[i].zone[result[a].name]){
						account[i][result[a].name] = {'zone_id':result[a].id, 'domain':{}};
						//// get DNS id
						var getDNS = {
							hostname: 'api.cloudflare.com',
							port: 443,
							path: '/client/v4/zones/'+result[a].id+'/dns_records',
							method: 'GET',
							headers: getZone.headers
						}
						var domain = result[a].name;
						var subdomain = conf[i].zone[result[a].name];
						var record = account[i][result[a].name].domain;
						isReady++;
						https.request(getDNS, function(res){
							var partial_data = [];
							res.on('data', function(data){
								partial_data.push(data);
							});
							res.on('end', function () {
								var result = [];
								try{
									result = JSON.parse(Buffer.concat(partial_data).toString()).result;
								}catch(e){
									console.log("cloudflare.com: getDNS: ", e);
								}
								var domainFullNameList = {};
								for(var a=0; a<subdomain.length; a++){
									var domainFullName = conf[i].zone[domain][a].name == "" ? domain : (subdomain[a].name+'.'+domain);
									domainFullNameList[domainFullName] = {if: subdomain[a].if, name: subdomain[a].name};
								}
								var idx;
								for(var a=0; a<result.length; a++){
									if(result[a].type=="A" || result[a].type=="AAAA"){
										if(!!domainFullNameList[result[a].name]){
											if(!!record[result[a].name]){
												if(result[a].type != result[record[result[a].name].idx].type){
													record[result[a].name][result[a].type] = domainFullNameList[result[a].name];
													record[result[a].name][result[a].type].id = result[a].id;
													record[result[a].name][result[a].type].idx = a;
												}else if(result[a].modified_on < result[record[result[a].name].idx].modified_on){
													record[result[a].name][result[a].type] = domainFullNameList[result[a].name];
													record[result[a].name][result[a].type].id = result[a].id;
													record[result[a].name][result[a].type].idx = a;
												}
											}else{
												record[result[a].name] = {};
												record[result[a].name][result[a].type] = domainFullNameList[result[a].name];
												record[result[a].name][result[a].type].id = result[a].id;
												record[result[a].name][result[a].type].idx = a;
											}
										}
									}
								}
								isReady--;
							});
						}).end();
					}
				}
				isReady--;
			});
		};})(i)).end();
	}
	var update = {
		hostname: 'api.cloudflare.com',
		port: 443,
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		}
	}

	module.exports = function(cb, ip){
		if(isReady == 0){
			for(var i=0; i<account.length; i++){
				if(conf[i].authorization){
					update.headers['Authorization'] = `Bearer ${conf[i].authorization}`;
				}else{
					update.headers['X-Auth-Email'] = conf[i].email;
					update.headers['X-Auth-Key'] = conf[i].apikey;
				}
				for(var x in account[i]){
					for(var y in account[i][x].domain){
						var domain = y;
						var data = JSON.stringify({
							id: account[i][x].domain[y].id,
							name: y,
							content: ip[account[i][x].domain[y]['A'].if],
							type: 'A',
							zone_id: account[i][x].zone_id
						});
						update.path = "/client/v4/zones/"+account[i][x].zone_id+"/dns_records/"+account[i][x].domain[y]['A'].id;
						update.headers['Content-Length'] = data.length;
						https.request(update, function(res){
							var partial_data = []
							res.on('data', function (data){
								partial_data.push(data);
							});
							res.on('end', function () {
								try{
									var result = JSON.parse(Buffer.concat(partial_data).toString());
									if(result.success){
										cb({
											domain: result.result.name,
											type: 'A',
											ip: result.result.content
										})
									}
								}catch(e){
									console.log('cloudflare.com: update result parse fail.');
								}
							});
						}).end(data);
					}
				}
			}
		}else{
			setTimeout(module.exports,500, cb, ip);
		}
	}
}else{
	module.exports = false;
}
