// Find pizza in Mountain View using Yelp
var Horseman = require("node-horseman");

var horseman = new Horseman();

horseman
	.open('http://lite.yelp.com/search?find_desc=pizza&find_loc=94040&find_submit=Search')
	.then(function(){
		return horseman.text('address');
	})
	.then(function( data ){
		console.log( data );
	})
	.finally(function(){
		horseman.close();
	});