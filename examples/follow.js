// Find the number of follower for each account. Spawns a new horseman for each user for faster results.
var Horseman = require('node-horseman');

var users = ['PhantomJS',
	'ariyahidayat',
	'detronizator',
	'KDABQt',
	'lfranchi',
	'jonleighton',
	'_jamesmgreene',
	'Vitalliumm'];

users.forEach( function( user ){
	var horseman = new Horseman();
	horseman
		.open('http://mobile.twitter.com/' + user)
		.text('.UserProfileHeader-stat--followers .UserProfileHeader-statCount')
		.then(function(text){
			console.log( user + ': ' + text );			
		})
		.finally(function(){
			return horseman.close();
		});	
});
