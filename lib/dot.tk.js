var conf = [];
try{
	conf = require('../conf/dot.tk.json');
}catch(e){}

if(conf.length > 0){
	var https = require('https');
	var Cookie = require('tough-cookie').Cookie;
	var toPostData = require('querystring').stringify;

	function getCookie(res, cookies){
		if(res.headers['set-cookie']){
			if(res.headers['set-cookie'] instanceof Array){
				cookies = cookies.concat(res.headers['set-cookie'].map(function (c) { return (Cookie.parse(c)); }));
			}else{
				cookies.push(Cookie.parse(res.headers['set-cookie']));
			}
		}
		return cookies;
	}
	var loginOptions = {
		hostname: 'my.freenom.com',
		port: 443,
		path: '/dologin.php',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	}
	function login(cb, account, ip){
		var data = toPostData({
			username: account.username,
			password: account.password
		});
	
		loginOptions.headers['Content-Length'] = data.length;

		var req = https.request(loginOptions, function(res){
			redirect(cb, res.headers.location, getCookie(res, []), account, ip);
		});
		req.end(data);
	}

	var redirectOptions = {
		hostname: 'my.freenom.com',
		port: 443,
		path: '/clientarea.php',
		method: 'POST',
		headers: {}
	}
	function redirect(cb, target, cookies, account, ip){
		redirectOptions.path = '/'+target;
		redirectOptions.headers.Cookie = cookies.map(function(c){ return c.cookieString()}).join('; ');
		var req = https.request(redirectOptions, function(res){
			update(cb, getCookie(res, cookies), account, ip);
		});
		req.end();
	}

	var updateOptions = {
		hostname: 'my.freenom.com',
		port: 443,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	}
	function update(cb, cookies, account, ip){
		var data;

		updateOptions.headers.Cookie = cookies.map(function(c){ return c.cookieString()}).join('; ');
		for(var i=0; i<account.domain.length; i++){
			updateOptions.path = '/clientarea.php?managedns='+account.domain[i].domainName+'&domainid='+account.domain[i].domainID;

			data = {
				dnsaction: 'modify'
			}
			for(var j=0;j<account.domain[i].hostName.length; j++){
				data['records['+j+'][line]'] = '';
				data['records['+j+'][type]'] = account.domain[i].hostName[j].type.toUpperCase();
				data['records['+j+'][name]'] = account.domain[i].hostName[j].name.toUpperCase();
				data['records['+j+'][ttl]'] = 300;
				data['records['+j+'][value]'] = ip[account.domain[i].hostName[j].if];
			}
			data = toPostData(data);

			updateOptions.headers['Content-Length'] = data.length;

			var req = https.request(updateOptions, (function(){
				var domain = account.domain[i];
				return function(res){
					updateOptions.path = '/'+res.headers.location;
					updateOptions.headers['Content-Length'] = 0;
					var req=https.request(updateOptions, function(){
						if(cb && cb.constructor){
							for(var k=0; k<domain.hostName.length; k++){
								cb({
									domain: domain.hostName[k].name+'.'+domain.domainName,
									ip: ip[domain.hostName[k].if]
								});
							}
						}
						logout(cookies);
					});
					req.end();
				}
			})());
			req.end(data);
		}
	}

	var logoutOptions = {
		hostname: 'my.freenom.com',
		port: 443,
		path: '/logout.php',
		method: 'POST',
		headers: {}
	}
	function logout(cookies){
		redirectOptions.headers.Cookie = cookies.map(function(c){ return c.cookieString()}).join('; ');
		https.request(redirectOptions).end();
	}

	module.exports = function(cb, ip){
		for(var i=0;i<conf.length; i++){
			login(cb, conf[i], ip);
		}
	}
}else{
	module.exports = false;
}
