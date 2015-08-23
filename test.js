var Horseman = require('./lib/index');
var horseman = new Horseman();

horseman
	.open('https://www.google.com')
	.then( function(){
		return horseman.html("#lga");
	})
	.then( function( count ){
		console.log(count);
	})
	.then( function(){
		horseman.close();
	});