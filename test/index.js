var Horseman = require('../lib');
var fs = require('fs');
var path = require('path');
var express = require('express');
var should = require('should');

var app, server, serverUrl;

function navigation(bool) {

	var title = 'Navigation ' + ((bool) ? 'with' : 'without') + ' jQuery';

	describe(title, function() {
		var horseman;

		beforeEach(function() {
			horseman = new Horseman({
				injectJquery: bool
			});
		});

		afterEach(function() {
			horseman.close();
		});

		it('should set the user agent', function(done) {
			horseman
				.userAgent("Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.124 Safari/537.36")
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function() {
					return horseman.evaluate(function() {
						return navigator.userAgent;
					});
				})
				.then(function(result) {
					result.should.equal("Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.124 Safari/537.36")
				})
				.finally(done);
		});

		it('should set headers', function(done) {
			var headers = {
				'X-Horseman-Header': 'test header'
			};

			horseman
				.headers(headers)
				.then(function() {
					return horseman.open('http://httpbin.org/headers')
				})
				.then(function() {
					return horseman.evaluate(function() {
						return document.body.children[0].innerHTML;
					});
				})
				.then(function(data) {
					var response = JSON.parse(data);
					response.should.have.property('headers');
					response.headers.should.have.property('X-Horseman-Header');
					response.headers['X-Horseman-Header'].should.equal('test header');
				})
				.finally(done);
		});

		it('should open a page', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.url();
				})
				.then(function(data) {
					data.should.equal(serverUrl);
				})
				.finally(done);
		});

		it('should click a link', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.click("a[href='next.html']");
				})
				.delay(300)
				.then(function() {
					return horseman.url();
				})
				.then(function(data) {
					data.should.equal(serverUrl + "next.html")
				})
				.finally(done);
		});

		it('should go backwards and forwards', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.click("a[href='next.html']");
				})
				.delay(300)
				.then(function() {
					return horseman.back();
				})
				.delay(300)
				.then(function() {
					return horseman.url();
				})
				.then(function(data) {
					data.should.equal(serverUrl)
				})
				.then(function() {
					return horseman.forward();
				})
				.delay(300)
				.then(function() {
					return horseman.url();
				})
				.then(function(data) {
					data.should.equal(serverUrl + "next.html")
				})
				.finally(done);
		});

		it('should use basic authentication', function(done) {
			horseman
				.authentication('my', 'auth')
				.then(function() {
					return horseman.open('http://httpbin.org/basic-auth/my/auth');
				})
				.then(function() {
					return horseman.evaluate(function() {
						return document.body.innerHTML.length;
					})
				})
				.then(function(result) {
					result.should.be.above(0);
				})
				.finally(done);
		});

		it('should set the viewport', function(done) {
			var size = {
				width: 400,
				height: 1000
			};
			horseman
				.viewport(size.width, size.height)
				.then(function() {
					return horseman.open("http://www.google.com");
				})
				.then(function() {
					return horseman.viewport();
				})
				.then(function(vp) {
					vp.height.should.equal(size.height);
					vp.width.should.equal(size.width);
				})
				.finally(done);
		});

		it('should let you scroll', function(done) {

			horseman
				.viewport(320, 320)
				.then(function() {
					return horseman.open('http://www.google.com');
				})
				.then(function() {
					return horseman.scrollTo(50, 40);
				})
				.then(function() {
					return horseman.evaluate(function() {
						return {
							top: document.body.scrollTop,
							left: document.body.scrollLeft
						}
					});
				})
				.then(function(coordinates) {
					coordinates.top.should.equal(50);
					coordinates.left.should.equal(40);
				})
				.finally(done);

		});

		it('should add a cookie', function(done) {

			var cookie = {
				name: "test",
				value: "cookie",
				domain: 'httpbin.org'
			};

			horseman
				.cookies(cookie)
				.then(function() {
					return horseman.open("http://httpbin.org/cookies");
				})
				.then(function() {
					return horseman.text("pre");
				})
				.then(function(body) {
					var result = JSON.parse(body);
					result.cookies[cookie.name].should.equal(cookie.value);
				})
				.finally(done);

		});

		it('should clear out all cookies', function(done) {
			horseman
				.cookies([])
				.then(function() {
					return horseman.open("http://httpbin.org/cookies");
				})
				.then(function() {
					return horseman.text("pre");
				})
				.then(function(body) {
					var result = JSON.parse(body);
					Object.keys(result.cookies).length.should.equal(0);
				})
				.finally(done);
		});

		it('should add an array of cookies', function(done) {
			var cookies = [{
				name: "test",
				value: "cookie",
				domain: 'httpbin.org'
			}, {
				name: "test2",
				value: "cookie2",
				domain: 'httpbin.org'
			}];

			var body = horseman
				.cookies(cookies)
				.then(function() {
					return horseman.open("http://httpbin.org/cookies");
				})
				.then(function() {
					return horseman.text("pre");
				})
				.then(function(body) {
					var result = JSON.parse(body);
					result.cookies[cookies[0].name].should.equal(cookies[0].value);
					result.cookies[cookies[1].name].should.equal(cookies[1].value);
				})
				.finally(done);
		});

		it('should post to a page', function(done) {
			var data = 'universe=expanding&answer=42';

			horseman
				.post('http://httpbin.org/post', data)
				.then(function() {
					return horseman.text("pre");
				})
				.then(function(response) {
					response = JSON.parse(response);
					response.should.have.property('form');
					response.form['answer'].should.equal('42');
					response.form['universe'].should.equal('expanding');
				})
				.finally(done);

		});

		it.skip('should get the status code', function() {

			var status = horseman
				.open(serverUrl)
				.status();

			status.should.be.within(200, 399); //these are ok
		});

	});
}

function evaluation(bool) {
	var title = 'Evaluation ' + ((bool) ? 'with' : 'without') + ' jQuery';

	describe(title, function() {
		var horseman;

		beforeEach(function() {
			horseman = new Horseman({
				injectJquery: bool
			});
		});

		afterEach(function() {
			horseman.close();
		});

		it('should get the title', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.title();
				})
				.then(function(title) {
					title.should.equal('Testing Page');
				})
				.finally(done);

		});

		it('should verify an element exists', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.exists("input");
				})
				.then(function(exists) {
					exists.should.be.true;
				})
				.finally(done);

		});

		it('should verify an element does not exists', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.exists("article");
				})
				.then(function(exists) {
					exists.should.be.false;
				})
				.finally(done);
		});

		it('should count the number of selectors', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.count("a");
				})
				.then(function(count) {
					count.should.be.above(0);
				})
				.finally(done);

		});

		it('should get the html of an element', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.html("#text");
				})
				.then(function(html) {
					html.indexOf("code").should.be.above(0);
				})
				.finally(done);
		});

		it('should get the text of an element', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.text("#text");
				})
				.then(function(text) {
					text.trim().should.equal("This is my code.");
				})
				.finally(done);

		});
		
		it('should get the value of an element', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.value("input[name='input1']");
				})
				.then(function(value) {
					value.should.equal("");
				})
				.finally(done);
		});

		it('should get an attribute of an element', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.attribute("a", "href");
				})
				.then( function( value ){
					value.should.equal("next.html");
				})
				.finally( done );
				
		});

		it('should get a css property of an element', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.cssProperty("a", "margin-bottom");
				})
				.then( function( value ){
					value.should.equal("3px");
				})
				.finally( done );
		});

		it('should get the width of an element', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.width("a");
				})
				.then( function( value ){
					value.should.be.above(0);
				})
				.finally( done );				
		});

		it('should get the height of an element', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.height("a");
				})
				.then( function( value ){
					value.should.be.above(0);
				})
				.finally( done );
		});

		it('should determine if an element is visible', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.visible("a");
				})
				.then( function( visible ){
					visible.should.be.true;
				})
				.finally( done );
		});

		it('should determine if an element is not-visible', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.visible(".login-popup")
				})
				.then( function( visible ){
					visible.should.be.false;
				})
				.finally( done );
		});

		it('should evaluate javascript', function(done) {
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.evaluate(function() {
						return document.title;
					});
				})
				.then( function( result ){
					result.should.equal("Testing Page");
				})
				.finally( done );
		});

		it('should evaluate javascript with optional parameters', function(done) {
			var str = "yo";
			horseman
				.open(serverUrl)
				.then(function() {
					return horseman.evaluate(function(param) {
						return param;
					}, str);
				})
				.then( function( result ){
					result.should.equal(str);
				})
				.finally( done );
		});
	});
}

function manipulation(bool) {
	var title = 'Manipulation ' + ((bool) ? 'with' : 'without') + ' jQuery';

	describe(title, function() {
		
		beforeEach(function() {
			horseman = new Horseman({
				injectJquery: bool
			});
		});

		afterEach(function() {
			horseman.close();
		});

		after(function() {
			
			if (fs.existsSync("out.png")) {
				fs.unlinkSync("out.png");
			}
			if (fs.existsSync("small.png")) {
				fs.unlinkSync("small.png");
			}
			if (fs.existsSync("big.png")) {
				fs.unlinkSync("big.png");
			}
			if (fs.existsSync("default.pdf")) {
				fs.unlinkSync("default.pdf");
			}
			if (fs.existsSync("euro.pdf")) {
				fs.unlinkSync("euro.pdf");
			}
		});

		it('should execute javascript without breaking the chain', function(done) {
			horseman
				.open(serverUrl)
				.then( function(){
					return horseman.manipulate(function() {
						document.title = "blah";
					})
				})
				.then( function(){
					return horseman.evaluate(function() {
						return document.title;
					})
				})
				.then( function( title ){
					title.should.equal("blah");
				})
				.finally( done );
				
		});

		it('should inject javascript', function(done) {
			horseman
				.open(serverUrl)
				.then( function(){
					return horseman.injectJs("test/files/testjs.js");
				})
				.then( function(){
					return horseman.evaluate(function() {
						return ___obj.myname;
					});
				})
				.then( function( result ){
					result.should.equal("isbob");
				})
				.finally( done );
				
		});

		it('should type and click', function(done) {
			horseman
				.open(serverUrl)
				.then( function(){
					return horseman.type('input[name="input1"]', 'github');
				})
				.then( function(){
					return horseman.value('input[name="input1"]');
				})
				.then( function( value ){
					value.should.equal('github');
				})
				.finally( done );
				
		});

		it('should clear a field', function(done) {
			horseman
				.open(serverUrl)
				.then( function(){
					return horseman.type('input[name="input1"]', 'github');
				})
				.then( function(){
					return horseman.clear('input[name="input1"]');
				})
				.then( function(){
					return horseman.value('input[name="input1"]');
				})
				.then( function( value ){
					value.should.equal('');
				})
				.finally( done );
		});

		it('should select a value', function(done) {
			horseman
				.open(serverUrl)
				.then( function(){
					return horseman.select("#select1", "1");
				})
				.then( function(){
					return horseman.value("#select1");
				})
				.then( function( value ){
					value.should.equal('1');
				})
				.finally( done );
		});

		it('should take a screenshot', function(done) {
			horseman
				.open(serverUrl)
				.then(function(){
					return horseman.screenshot("out.png");
				})
				.then( function(){
					fs.existsSync("out.png").should.be.true;
				})
				.finally( done );
		});

		it('should take a screenshotBase64', function(done) {
			horseman
				.open(serverUrl)
				.then(function(){
					return horseman.screenshotBase64("PNG");
				})
				.then( function( asPng ){
					var type = typeof asPng;
					type.should.equal('string');
				})
				.finally( done );
			
		});

		it('should let you zoom', function(done) {
			horseman
				.open(serverUrl)
				.then(function(){
					return horseman.viewport(800, 400)
				})
				.then(function(){
					return horseman.open(serverUrl);
				})
				.then(function(){
					return horseman.screenshot('small.png');
				})
				.then(function(){
					return horseman.viewport(1600, 800);
				})
				.then(function(){
					return horseman.zoom(2);
				})
				.then(function(){
					return horseman.open(serverUrl);
				})
				.then(function(){
					return horseman.screenshot('big.png');
				})
				.then( function(){
					var smallSize = fs.statSync('small.png').size,
					bigSize = fs.statSync('big.png').size;

					bigSize.should.be.greaterThan(smallSize);
				})
				.finally(done);		

		});

		it('should let you export as a pdf', function(done) {
			horseman
				.open('http://www.google.com')
				.then(function(){
					return horseman.pdf('default.pdf');
				})
				.then(function(){
					return horseman.pdf('euro.pdf', {
						format: 'A5',
						orientation: 'portrait',
						margin: 0
					});
				})
				.then(function(){
					// A4 size is slightly larger than US Letter size,
					// which is the default pdf paper size.
					var defaultSize = fs.statSync('default.pdf').size,
						euroSize = fs.statSync('euro.pdf').size;

					defaultSize.should.be.greaterThan(0);
					euroSize.should.be.greaterThan(0);
				})
				.finally(done);			
		});

		//File upload is broken in Phantomjs 2.0
		//https://github.com/ariya/phantomjs/issues/12506
		it.skip('should upload a file', function() {
			horseman
				.upload("#upload", "test/files/testjs.js")
				.value("#upload")
				.should.equal("C:\\fakepath\\testjs.js");
		});

		it('should verify a file exists before upload', function(done) {
			horseman
				.open("http://validator.w3.org/#validate_by_upload")
				.then( function(){
					return horseman.upload("#uploaded_file", "nope.jpg");
				})
				.then( function( err ){
					err.toString().indexOf("Error").should.be.above(-1);
				})
				.finally( done );
			
		});

		it('should fire a keypress when typing', function(done) {
			horseman
				.open("http://httpbin.org/forms/post")
				.then( function(){
					return horseman.manipulate(function() {
						window.keypresses = 0;
						var elem = document.querySelector("input[name='custname']");
						elem.onkeypress = function() {
							window.keypresses++;
						}
					})
				})
				.then( function(){
					return horseman.type("input[name='custname']", "github");
				})
				.then( function(){
					return horseman.evaluate(function() {
						return window.keypresses;
					})
				})
				.then( function(keypresses){
					keypresses.should.equal(6);
				})
				.finally(done);
		});

		it('should send mouse events', function(done) {
			horseman
				.open('https://dvcs.w3.org/hg/d4e/raw-file/tip/mouse-event-test.html')
				.then(function() {
					return horseman.mouseEvent('mousedown', 200, 200);
				})
				.then(function() {
					return horseman.mouseEvent('mouseup', 200, 200);
				})
				.then(function() {
					return horseman.mouseEvent('click', 200, 200);
				})
				.then(function() {
					return horseman.mouseEvent('doubleclick', 200, 200);
				})
				.then(function() {
					return horseman.mouseEvent('mousemove', 200, 200);
				})
				.then(function() {
					return horseman.evaluate(function() {
						function findByTextContent(selector, text) {
							var tags = document.querySelectorAll(selector);

							var count = 0;

							for (var i = 0; i < tags.length; i++) {
								if (tags[i].textContent.indexOf(text) > -1) {
									count++;
								}
							}
							return count;
						}

						return {
							'mousedown': findByTextContent("tr", "mousedown"),
							'mouseup': findByTextContent("tr", "mouseup"),
							'click': findByTextContent("tr", "click"),
							'doubleclick': findByTextContent("tr", "dblclick"),
							'mousemove': findByTextContent("tr", "mousemove"),
						}
					});
				})
				.then( function( events ){
					//console.log( events );
					events['mousedown'].should.be.greaterThan(0);
					events['mouseup'].should.be.greaterThan(0);
					events['click'].should.be.greaterThan(0);
					events['doubleclick'].should.be.greaterThan(0);
					events['mousemove'].should.be.greaterThan(0);
				})
				.finally( done);
		});

		it('should send keyboard events', function(done) {
			horseman
				.open('http://unixpapa.com/js/testkey.html')				
				.then( function(){
					return horseman.keyboardEvent('keypress', 16777221);
				})
				.then( function(){
					return horseman.evaluate(function() {
						return document.querySelector("textarea[name='t']").value;
					});
				})
				.then( function( data ){
					data.indexOf("keyCode=13").should.be.greaterThan(-1);
				})
				.finally( done );
		});
	});
}


describe('Horseman', function() {
	this.timeout(20000);

	/**
	 * Setup an express server for testing purposes.
	 */
	before(function(done) {
		app = express();
		var port = process.env.port || 4567;
		app.use(express.static(path.join(__dirname, 'files')));
		server = app.listen(port, function() {
			serverUrl = 'http://localhost:' + port + '/';;
			done();
		});
	});

	/**
	 * Tear down the express server we used for testing.
	 */
	after(function(done) {
		server.close(done);
	});

	it('should be constructable', function() {
		var horseman = new Horseman();
		horseman.should.be.ok;
		horseman.close();
	});


	navigation(true);

	navigation(false);

	evaluation(true);

	evaluation(false);
	
	manipulation( true );
	
	manipulation( false );
	
	describe("Inject jQuery", function(){
		it('should inject jQuery', function(done){
			var horseman = new Horseman();

			horseman
				.open("http://www.google.com")
				.then(function() {
					return horseman.evaluate(function() {
						return typeof jQuery;
					})
				})
				.then(function(result) {
					result.should.equal("function");
				})
				.then(function() {
					horseman.close();
				})
				.finally(done);
			
		});

		it('should not inject jQuery', function(done){
			var horseman = new Horseman({
				injectJquery : false
			});

			horseman
				.open("http://www.google.com")
				.then(function() {
					return horseman.evaluate(function() {
						return typeof jQuery;
					})
				})
				.then(function(result) {
					result.should.equal("undefined");
				})
				.then(function() {
					horseman.close();
				})
				.finally(done);
		});

		it('should not stomp on existing jQuery', function(done){
			var horseman = new Horseman({
				injectJquery : true
			});
			//Horseman injects 2.1.1, digg uses 1.8.3
			horseman
				.open("http://www.digg.com")
				.then(function() {
					return horseman.evaluate(function() {
						return $.fn.jquery;
					})
				})
				.then(function(result) {
					result.should.not.equal("2.1.1");
				})
				.finally(done);
		});

	});


	describe("Waiting", function(){

		var horseman;

		beforeEach(function() {
			horseman = new Horseman();
		});

		afterEach(function() {
			horseman.close();
		});

		it('should wait for the page to change', function(done){
			horseman
				.open( serverUrl )
				.then(function(){
					return horseman.click("a");
				})
				.then(function(){
					return horseman.waitForNextPage();
				})
				.then(function(){
					return horseman.url()
				})
				.then(function(url){
					url.should.equal( serverUrl + "next.html" );
				})
				.catch(function(e ){
					console.log(e)
				})
				.finally(done);
		});

		it('should wait until a condition on the page is true', function(done) {
			var forALink = function () {
				return ($("a:contains('About')").length > 0);
			};

	    	horseman
	        	.open('http://www.google.com/')
	        	.then(function(){
	        		return horseman.waitFor(forALink,true);
	        	})
	        	.then( function(){
	        		return horseman.url();
	        	})
	        	.then(function(url){
	        		url.should.equal('http://www.google.com/');
	        	})
	        	.finally(done);
	    });

	    it('should wait a set amount of time', function(done){
	    	var start = new Date();

	    	horseman
	        	.open(serverUrl)
	        	.then(function(){
	        		return horseman.wait(1000);
	        	})
	        	.then( function(){
	        		var end = new Date();
	    			var diff = end - start;
	    			diff.should.be.greaterThan(999); //may be a ms or so off.
	        	})
	        	.finally(done);	    	
	    });

	    it('should wait until a selector is seen', function(done){
	    	horseman
	    		.open( serverUrl )
	    		.then(function(){
	        		return horseman.waitForSelector("input")
	        	})
	        	.then(function(){
	        		return horseman.count("input");
	        	})
	        	.then(function(count){
	        		count.should.be.above( 0 );
	        	})
	    		.finally(done);	    		
	    });

	    it('should call onTimeout if timeout period elapses when waiting for next page', function(done){
	    	var timeoutHorseman = new Horseman({
	    		timeout : 10
	    	});

	    	var timeoutFired = false;

			timeoutHorseman
				.on("timeout", function(){
					timeoutFired = true
				})
				.then(function(){
					return timeoutHorseman.open("http://www.google.com");
				})
				.then(function(){
					return timeoutHorseman.click("a:contains('Advertising')");
				})
				.then(function(){
					return timeoutHorseman.waitForNextPage();
				})
				.then(function(){
					timeoutFired.should.be.true;					
				})
				.finally(function(){
					timeoutHorseman.close();
					done();
				});			
			
		});

		it('should call onTimeout if timeout period elapses when waiting for selector', function(done){
	    	var timeoutHorseman = new Horseman({
	    		timeout : 10
	    	});

	    	var timeoutFired = false;

			timeoutHorseman
				.on("timeout", function(){
					timeoutFired = true
				})
				.then(function(){
					return timeoutHorseman.open(serverUrl);
				})
				.then(function(){
					return timeoutHorseman.waitForSelector('bob');
				})
				.then(function(){
					timeoutFired.should.be.true;					
				})
				.finally(function(){
					timeoutHorseman.close();
					done();
				});	
				
		});

		it('should call onTimeout if timeout period elapses when waiting for fn == value', function(done){
	    	var timeoutHorseman = new Horseman({
	    		timeout : 10
	    	});

	    	var timeoutFired = false;

	    	var return5 = function(){
				return 5;
			}

	    	timeoutHorseman
				.on("timeout", function(){
					timeoutFired = true;
				})
				.then(function(){
					return timeoutHorseman.open(serverUrl);
				})
				.then(function(){
					return timeoutHorseman.waitFor(return5,6);
				})
				.then(function(){
					timeoutFired.should.be.true;					
				})
				.finally(function(){
					timeoutHorseman.close();
					done();
				});	
		});
	});


	/**
	 * Iframes
	 */	
	describe("Frames", function() {

		var horseman;

		beforeEach(function() {
			horseman = new Horseman();
		});

		afterEach(function() {
			horseman.close();
		});

		it('should let you switch to a child frame', function(done) {

			horseman
				.open(serverUrl + "frames.html")
				.then(function() {
					return horseman.switchToChildFrame('frame1');
				})
				.then(function() {
					return horseman.waitForSelector("h1");
				})
				.then(function() {
					return horseman.html("h1");
				})
				.then(function(html) {
					html.should.equal("This is frame 1.")
				})
				.finally(done);

		});
	});


	/**
	 * events
	 */	
  	describe('Events', function(){

  		var horseman;

		beforeEach(function() {
			horseman = new Horseman();
		});

		afterEach(function() {
			horseman.close();
		});
    	
		it('should fire an event on initialized', function(done) {
			var fired = false;

			horseman
				.on("initialized", function() {
					fired = true;
				})
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
		});

		it('should fire an event on load started', function(done) {
			var fired = false;

			horseman
				.on("loadStarted", function() {
					fired = true;
				})
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
	    });

	    it('should fire an event on load finished', function(done) {
	      	var fired = false;

			horseman
				.on("loadFinished", function() {
					fired = true;
				})
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
	    });

	    it('should fire an event when a resource is requested', function(done) {
	      	var fired = false;

			horseman
				.on("resourceRequested", function() {
					fired = true;
				})
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
	    });

	    it('should fire an event when a resource is received', function(done) {
	      	var fired = false;

			horseman
				.on("resourceReceived", function() {
					fired = true;
				})
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
	    });

	    it('should fire an event when navigation requested', function(done) {
	    	var fired = false;

			horseman
				.on("navigationRequested", function(url) {
					fired = (url==="https://www.yahoo.com/");
				})
				.then(function() {
					return horseman.open('http://www.yahoo.com');
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
	    });

	    it('should fire an event when the url changes', function(done) {
	      	var fired = false;

			horseman
				.on("urlChanged", function() {
					fired = true;
				})
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
	    });

	    it('should fire an event when a console message is seen', function(done) {
	    	var fired = false;

			horseman
				.on("consoleMessage", function() {
					fired = true;
				})
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function(){
					return horseman.evaluate( function(){
						console.log("message");
					});
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
	    });

	    it('should fire an event when an alert is seen', function(done) {
	      	var fired = false;

			horseman
				.on("alert", function() {
					fired = true;
				})
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function(){
					return horseman.evaluate( function(){
						alert('ono');
					});
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
	    });

	    it('should fire an event when a prompt is seen', function(done) {
	      	var fired = false;

			horseman
				.on("prompt", function() {
					fired = true;
				})
				.then(function() {
					return horseman.open(serverUrl);
				})
				.then(function(){
					return horseman.evaluate( function(){
						prompt('ono');
					});
				})
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
	    });

	});


	/**
	 * tabs
	 */
	/* 	
  	describe('Tabs', function(){
  		var horseman = new Horseman();

		after( function(){
			horseman.close();
		});

		it('should let you open a new tab', function(){
			horseman
				.open( serverUrl )
				.openTab( serverUrl + "next.html")
				.tabCount()
				.should.equal( 2 );
		});

		it('should fire an event when a tab is created', function(){
			var fired = false;
			horseman
				.on('tabCreated', function(){
					fired = true;
				})
				.open( serverUrl )				
				.openTab( serverUrl + "next.html");

			fired.should.be.true;
		});

		it('should let you get a tab count', function(){
			horseman
				.tabCount()
				.should.equal( 3 );
		});

		it('should let switch tabs', function(){
			horseman
				.switchToTab(0)
				.url()
				.should.equal( serverUrl )
		});

  	});
*/
});