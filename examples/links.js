// Grab links from Google.
var Horseman = require("node-horseman");

var horseman = new Horseman();

var links = [];

function getLinks(){
	return horseman
		.evaluate( function(){
			// This code is executed in the browser.
			var links = [];
			$("li.g h3.r a").each(function( item ){
				var link = {
					title : $(this).text(),
					url : $(this).attr("href")
				};
				links.push(link);
			});
			return links;
		});
}

function hasNextPage(){
	return horseman.exists("#pnnext");
}

function scrape(){
	var newLinks = getLinks();
	
	links = links.concat(newLinks);
	
	if ( hasNextPage() && links.length < 30 ){
		horseman
			.click("#pnnext")
			.waitForNextPage()
			.waitForSelector("li.g");
		scrape();
	}
}

horseman
	.userAgent("Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0")
	.open("http://www.google.com")
	.type("input[name='q']","horseman")
	.click("button:contains('Google Search')")
	.waitForSelector("li.g");

scrape();

console.log( links );

horseman.close();