// Find the number of follower for each account.
var Horseman = require("node-horseman");

var users = ['PhantomJS',
	'ariyahidayat',
	'detronizator',
	'KDABQt',
	'lfranchi',
	'jonleighton',
	'_jamesmgreene',
	'Vitalliumm'];

var horseman = new Horseman();

users.forEach( function( user ){
	var data = horseman
		.open('http://mobile.twitter.com/' + user)
		.text('div.profile td.stat.stat-last div.statnum');
	console.log( user + ': ' + data );
});

horseman.close();