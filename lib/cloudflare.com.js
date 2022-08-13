let conf = [];
try{
	conf = require('../conf/cloudflare.com.json');
}catch(e){
	console.log('load config error:',e);
}

if(conf.length > 0){
	let isReady = 0;
	let https = require('https');
	let account = [];
	for(let i=0; i<conf.length; i++){
		let getZone = {
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
			let partial_data = []
			res.on('data', function (data){
				partial_data.push(data);
			});
			res.on('end', function () {
				let result = [];
				try{
					result = JSON.parse(Buffer.concat(partial_data).toString()).result;
				}catch(e){
					console.log("cloudflare.com: getZone: ", e, dataChunk_GetZone.toString());
				}
				account[i] = {};
				for(let a=0; a<result.length; a++){
					if(!!conf[i].zone[result[a].name]){
						account[i][result[a].name] = {'zone_id':result[a].id, 'domain':{}};
						//// get DNS id
						let getDNS = {
							hostname: 'api.cloudflare.com',
							port: 443,
							path: '/client/v4/zones/'+result[a].id+'/dns_records?per_page=100',
							method: 'GET',
							headers: getZone.headers
						}
						let domain = result[a].name;
						let subdomain = conf[i].zone[result[a].name];
						let record = account[i][result[a].name].domain;
						isReady++;
// TODO: check result.result_info.total_page
						https.request(getDNS, function(res){
							let partial_data = [];
							res.on('data', function(data){
								partial_data.push(data);
							});
							res.on('end', function () {
								let result = [];
								try{
									result = JSON.parse(Buffer.concat(partial_data).toString()).result;
								}catch(e){
									console.log("cloudflare.com: getDNS: ", e, dataChunk_GetDNS.toString());
								}
								let domainFullNameList = {};
								for(let a=0; a<subdomain.length; a++){
									let domainFullName = conf[i].zone[domain][a].name == "" ? domain : (subdomain[a].name+'.'+domain);
									domainFullNameList[domainFullName] = {if: subdomain[a].if, name: subdomain[a].name, proxied: subdomain[a].proxied};
								}
								let idx;
								for(let a=0; a<result.length; a++){
									if(result[a].type=="A" || result[a].type=="AAAA"){
										if(!!domainFullNameList[result[a].name]){
											if(!record[result[a].name]){
												record[result[a].name] = {};
											}
											if(!record[result[a].name][result[a].type] || result[a].modified_on < record[result[a].name][result[a].type].modified_on){
												record[result[a].name][result[a].type] = {};
												record[result[a].name][result[a].type].if = domainFullNameList[result[a].name].if;
												record[result[a].name][result[a].type].name = domainFullNameList[result[a].name].name;
												record[result[a].name][result[a].type].id = result[a].id;
												record[result[a].name][result[a].type].idx = a;
												record[result[a].name][result[a].type].modified_on = result[a].modified_on;
												record[result[a].name][result[a].type].proxied = domainFullNameList[result[a].name].proxied;
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
	let update = {
		hostname: 'api.cloudflare.com',
		port: 443,
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		}
	}
	module.exports = function(cb, ipList){
		if(isReady == 0){
			for(let i=0; i<account.length; i++){
				if(conf[i].authorization){
					update.headers['Authorization'] = `Bearer ${conf[i].authorization}`;
				}else{
					update.headers['X-Auth-Email'] = conf[i].email;
					update.headers['X-Auth-Key'] = conf[i].apikey;
				}
				for(let x in account[i]){
					for(let y in account[i][x].domain){
						for(let z in account[i][x].domain[y]){
							let inet = 'ipv4';
							switch(z){
								case 'AAAA':
									inet = 'ipv6'
								case 'A':
									let domain = y;
									let data = JSON.stringify({
										id: account[i][x].domain[y].id,
										name: y,
										content: ipList[account[i][x].domain[y][z].if][inet],
										type: z,
										zone_id: account[i][x].zone_id,
										proxied: !!account[i][x].domain[y][z].proxied
									});
									update.path = "/client/v4/zones/"+account[i][x].zone_id+"/dns_records/"+account[i][x].domain[y][z].id;
									update.headers['Content-Length'] = data.length;
									https.request(update, function(res){
										let partial_data = []
										res.on('data', function (data){
											partial_data.push(data);
										});
										res.on('end', function () {
											try{
												let result = JSON.parse(Buffer.concat(partial_data).toString());
												if(result.success){
													cb({
														domain: result.result.name,
														type: result.result.type,
														ip: result.result.content
													})
												}
											}catch(e){
												console.log('cloudflare.com: update result parse fail.');
											}
										});
									}).end(data);
									break;
								default:
							}
						}
					}
				}
			}
		}else{
			setTimeout(module.exports,500, cb, ipList);
		}
	}
}else{
	module.exports = false;
}
