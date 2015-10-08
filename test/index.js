var Horseman = require('../lib');
var actions = require('../lib/actions');
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
				.open(serverUrl)
				.evaluate(function() {
					return navigator.userAgent;
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
				.open('http://httpbin.org/headers')
				.evaluate(function() {
					return document.body.children[0].innerHTML;
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
				.url()
				.then(function(data) {
					data.should.equal(serverUrl);
				})
				.finally(done);
		});

		it('should have a HTTP status code', function(done) {
			horseman
				.open(serverUrl)
				.status()
				.then(function(data) {
					data.should.equal(200);
				})
				.finally(done);
		});

		it('should click a link', function(done) {
			horseman
				.open(serverUrl)
				.click("a[href='next.html']")
				.waitForNextPage()
				.url()
				.then(function(data) {
					data.should.equal(serverUrl + "next.html")
				})
				.finally(done);
		});

		it('should go backwards and forwards', function(done) {
			horseman
				.open(serverUrl)
				.click("a[href='next.html']")
				.waitForNextPage()
				.back()
				.waitForNextPage()
				.url()
				.then(function(data) {
					data.should.equal(serverUrl)
				})
				.then(function() {
					return horseman
						.forward()
						.waitForNextPage()
						.url()
						.then(function(data) {
							data.should.equal(serverUrl + "next.html")
						});
				})
				.finally(done);
		});

		it('should use basic authentication', function(done) {
			horseman
				.authentication('my', 'auth')
				.open('http://httpbin.org/basic-auth/my/auth')
				.evaluate(function() {
					return document.body.innerHTML.length;
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
				.open("http://www.google.com")
				.viewport()
				.then(function(vp) {
					vp.height.should.equal(size.height);
					vp.width.should.equal(size.width);
				})
				.finally(done);
		});

		it('should let you scroll', function(done) {

			horseman
				.open('http://www.google.com')
				.scrollTo(50, 40)
				.evaluate(function() {
					return {
						top: document.body.scrollTop,
						left: document.body.scrollLeft
					}
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
				.open("http://httpbin.org/cookies")
				.text("pre")
				.then(function(body) {
					var result = JSON.parse(body);
					result.cookies[cookie.name].should.equal(cookie.value);
				})
				.finally(done);

		});

		it('should clear out all cookies', function(done) {
			horseman
				.cookies([])
				.open("http://httpbin.org/cookies")
				.text("pre")
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
				.open("http://httpbin.org/cookies")
				.text("pre")
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
				.text("pre")
				.then(function(response) {
					response = JSON.parse(response);
					response.should.have.property('form');
					response.form['answer'].should.equal('42');
					response.form['universe'].should.equal('expanding');
				})
				.finally(done);

		});

		it('should return a status from open', function(done) {

			horseman
				.open(serverUrl)
				.then(function( status ){
					status.should.equal('success');
				})
				.finally(done);
			
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
				.title()
				.then(function(title) {
					title.should.equal('Testing Page');
				})
				.finally(done);

		});

		it('should verify an element exists', function(done) {
			horseman
				.open(serverUrl)
				.exists("input")
				.then(function(exists) {
					exists.should.be.true;
				})
				.finally(done);

		});

		it('should verify an element does not exists', function(done) {
			horseman
				.open(serverUrl)
				.exists("article")
				.then(function(exists) {
					exists.should.be.false;
				})
				.finally(done);
		});

		it('should count the number of selectors', function(done) {
			horseman
				.open(serverUrl)
				.count("a")
				.then(function(count) {
					count.should.be.above(0);
				})
				.finally(done);

		});

		it('should get the html of an element', function(done) {
			horseman
				.open(serverUrl)
				.html("#text")
				.then(function(html) {
					html.indexOf("code").should.be.above(0);
				})
				.finally(done);
		});

		it('should get the text of an element', function(done) {
			horseman
				.open(serverUrl)
				.text("#text")
				.then(function(text) {
					text.trim().should.equal("This is my code.");
				})
				.finally(done);

		});

		it('should get the value of an element', function(done) {
			horseman
				.open(serverUrl)
				.value("input[name='input1']")
				.then(function(value) {
					value.should.equal("");
				})
				.finally(done);
		});

		it('should get an attribute of an element', function(done) {
			horseman
				.open(serverUrl)
				.attribute("a", "href")
				.then(function(value) {
					value.should.equal("next.html");
				})
				.finally(done);

		});

		it('should get a css property of an element', function(done) {
			horseman
				.open(serverUrl)
				.cssProperty("a", "margin-bottom")
				.then(function(value) {
					value.should.equal("3px");
				})
				.finally(done);
		});

		it('should get the width of an element', function(done) {
			horseman
				.open(serverUrl)
				.width("a")
				.then(function(value) {
					value.should.be.above(0);
				})
				.finally(done);
		});

		it('should get the height of an element', function(done) {
			horseman
				.open(serverUrl)
				.height("a")
				.then(function(value) {
					value.should.be.above(0);
				})
				.finally(done);
		});

		it('should determine if an element is visible', function(done) {
			horseman
				.open(serverUrl)
				.visible("a")
				.then(function(visible) {
					visible.should.be.true;
				})
				.finally(done);
		});

		it('should determine if an element is not-visible', function(done) {
			horseman
				.open(serverUrl)
				.visible(".login-popup")
				.then(function(visible) {
					visible.should.be.false;
				})
				.finally(done);
		});

		it('should evaluate javascript', function(done) {
			horseman
				.open(serverUrl)
				.evaluate(function() {
					return document.title;
				})
				.then(function(result) {
					result.should.equal("Testing Page");
				})
				.finally(done);
		});

		it('should evaluate javascript with optional parameters', function(done) {
			var str = "yo";
			horseman
				.open(serverUrl)
				.evaluate(function(param) {
					return param;
				}, str)
				.then(function(result) {
					result.should.equal(str);
				})
				.finally(done);
		});

		it('should do a function without breaking the chain', function(done){
			var doComplete = false;

			horseman
				.do(function(complete){
					setTimeout(function(){
						doComplete = true;
						complete();
					},500)
				})
				.then(function(){
					doComplete.should.be.true;
				})
				.finally(done);
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

		it('should inject javascript', function(done) {
			horseman
				.open(serverUrl)
				.injectJs("test/files/testjs.js")
				.evaluate(function() {
					return ___obj.myname;
				})
				.then(function(result) {
					result.should.equal("isbob");
				})
				.finally(done);

		});

		it('should type and click', function(done) {
			horseman
				.open(serverUrl)
				.type('input[name="input1"]', 'github')
				.value('input[name="input1"]')
				.then(function(value) {
					value.should.equal('github');
				})
				.finally(done);

		});

		it('should clear a field', function(done) {
			horseman
				.open(serverUrl)
				.type('input[name="input1"]', 'github')
				.clear('input[name="input1"]')
				.value('input[name="input1"]')
				.then(function(value) {
					value.should.equal('');
				})
				.finally(done);
		});

		it('should select a value', function(done) {
			horseman
				.open(serverUrl)
				.select("#select1", "1")
				.value("#select1")
				.then(function(value) {
					value.should.equal('1');
				})
				.finally(done);
		});

		it('should take a screenshot', function(done) {
			horseman
				.open(serverUrl)
				.screenshot("out.png")
				.then(function() {
					fs.existsSync("out.png").should.be.true;
				})
				.finally(done);
		});

		it('should take a screenshotBase64', function(done) {
			horseman
				.open(serverUrl)
				.screenshotBase64("PNG")
				.then(function(asPng) {
					var type = typeof asPng;
					type.should.equal('string');
				})
				.finally(done);

		});

		it('should let you zoom', function(done) {
			horseman
				.open(serverUrl)
				.viewport(800, 400)
				.open(serverUrl)
				.screenshot('small.png')
				.viewport(1600, 800)
				.zoom(2)
				.open(serverUrl)
				.screenshot('big.png')
				.then(function() {
					var smallSize = fs.statSync('small.png').size,
						bigSize = fs.statSync('big.png').size;

					bigSize.should.be.greaterThan(smallSize);
				})
				.finally(done);

		});

		it('should let you export as a pdf', function(done) {
			horseman
				.open('http://www.google.com')
				.pdf('default.pdf')
				.pdf('euro.pdf', {
					format: 'A5',
					orientation: 'portrait',
					margin: 0
				})
				.then(function() {
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
				.upload("#uploaded_file", "nope.jpg")
				.then(function(err) {
					err.toString().indexOf("Error").should.be.above(-1);
				})
				.finally(done);

		});

		it('should fire a keypress when typing', function(done) {
			horseman
				.open("http://httpbin.org/forms/post")
				.evaluate(function() {
					window.keypresses = 0;
					var elem = document.querySelector("input[name='custname']");
					elem.onkeypress = function() {
						window.keypresses++;
					}
				})
				.type("input[name='custname']", "github")
				.evaluate(function() {
					return window.keypresses;
				})
				.then(function(keypresses) {
					keypresses.should.equal(6);
				})
				.finally(done);
		});

		it('should send mouse events', function(done) {
			horseman
				.open('https://dvcs.w3.org/hg/d4e/raw-file/tip/mouse-event-test.html')
				.mouseEvent('mousedown', 200, 200)
				.mouseEvent('mouseup', 200, 200)
				.mouseEvent('click', 200, 200)
				.mouseEvent('doubleclick', 200, 200)
				.mouseEvent('mousemove', 200, 200)
				.evaluate(function() {
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
				})
				.then(function(events) {
					//console.log( events );
					events['mousedown'].should.be.greaterThan(0);
					events['mouseup'].should.be.greaterThan(0);
					events['click'].should.be.greaterThan(0);
					events['doubleclick'].should.be.greaterThan(0);
					events['mousemove'].should.be.greaterThan(0);
				})
				.finally(done);
		});

		it('should send keyboard events', function(done) {
			horseman
				.open('http://unixpapa.com/js/testkey.html')
				.keyboardEvent('keypress', 16777221)
				.evaluate(function() {
					return document.querySelector("textarea[name='t']").value;
				})
				.then(function(data) {
					data.indexOf("keyCode=13").should.be.greaterThan(-1);
				})
				.finally(done);
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

	manipulation(true);

	manipulation(false);

	describe("Inject jQuery", function() {
		it('should inject jQuery', function(done) {
			var horseman = new Horseman();

			horseman
				.open("http://www.google.com")
				.evaluate(function() {
					return typeof jQuery;
				})
				.then(function(result) {
					result.should.equal("function");
				})
				.then(function() {
					horseman.close();
				})
				.finally(done);

		});

		it('should not inject jQuery', function(done) {
			var horseman = new Horseman({
				injectJquery: false
			});

			horseman
				.open("http://www.google.com")
				.evaluate(function() {
					return typeof jQuery;
				})
				.then(function(result) {
					result.should.equal("undefined");
				})
				.then(function() {
					horseman.close();
				})
				.finally(done);
		});

		it('should not stomp on existing jQuery', function(done) {
			var horseman = new Horseman({
				injectJquery: true
			});
			//Horseman injects 2.1.1, digg uses 1.8.3
			horseman
				.open("http://www.digg.com")
				.evaluate(function() {
					return $.fn.jquery;
				})
				.then(function(result) {
					result.should.not.equal("2.1.1");
				})
				.finally(done);
		});

	});


	describe("Waiting", function() {

		var horseman;

		beforeEach(function() {
			horseman = new Horseman();
		});

		afterEach(function() {
			horseman.close();
		});

		it('should wait for the page to change', function(done) {
			horseman
				.open(serverUrl)
				.click("a")
				.waitForNextPage()
				.url()
				.then(function(url) {
					url.should.equal(serverUrl + "next.html");
				})
				.finally(done);
		});

		it('should wait until a condition on the page is true', function(done) {
			var forALink = function() {
				return ($("a:contains('About')").length > 0);
			};

			horseman
				.open('http://www.google.com/')
				.waitFor(forALink, true)
				.url()
				.then(function(url) {
					url.should.equal('http://www.google.com/');
				})
				.finally(done);
		});

		it('should wait a set amount of time', function(done) {
			var start = new Date();

			horseman
				.open(serverUrl)
				.wait(1000)
				.then(function() {
					var end = new Date();
					var diff = end - start;
					diff.should.be.greaterThan(999); //may be a ms or so off.
				})
				.finally(done);
		});

		it('should wait until a selector is seen', function(done) {
			horseman
				.open(serverUrl)
				.waitForSelector("input")
				.count("input")
				.then(function(count) {
					count.should.be.above(0);
				})
				.finally(done);
		});

		it('should call onTimeout if timeout period elapses when waiting for next page', function(done) {
			var timeoutHorseman = new Horseman({
				timeout: 10
			});

			var timeoutFired = false;

			timeoutHorseman
				.on("timeout", function() {
					timeoutFired = true
				})
				.open("http://www.google.com")
				.click("a:contains('Advertising')")
				.waitForNextPage()
				.then(function() {
					timeoutFired.should.be.true;
				})
				.finally(function() {
					timeoutHorseman.close();
					done();
				});

		});

		it('should call onTimeout if timeout period elapses when waiting for selector', function(done) {
			var timeoutHorseman = new Horseman({
				timeout: 10
			});

			var timeoutFired = false;

			timeoutHorseman
				.on("timeout", function() {
					timeoutFired = true
				})
				.open(serverUrl)
				.waitForSelector('bob')
				.then(function() {
					timeoutFired.should.be.true;
				})
				.finally(function() {
					timeoutHorseman.close();
					done();
				});

		});

		it('should call onTimeout if timeout period elapses when waiting for fn == value', function(done) {
			var timeoutHorseman = new Horseman({
				timeout: 10
			});

			var timeoutFired = false;

			var return5 = function() {
				return 5;
			}

			timeoutHorseman
				.on("timeout", function() {
					timeoutFired = true;
				})
				.open(serverUrl)
				.waitFor(return5, 6)
				.then(function() {
					timeoutFired.should.be.true;
				})
				.finally(function() {
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
				.switchToChildFrame('frame1')
				.waitForSelector("h1")
				.html("h1")
				.then(function(html) {
					html.should.equal("This is frame 1.")
				})
				.finally(done);

		});
	});


	/**
	 * events
	 */
	describe('Events', function() {

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
				.open(serverUrl)
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
				.open(serverUrl)
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
				.open(serverUrl)
				.wait(50) //have to wait for the event to fire.
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
				.open(serverUrl)
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
				.open(serverUrl)
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);
		});

		it('should fire an event when navigation requested', function(done) {
			var fired = false;

			horseman
				.on("navigationRequested", function(url) {
					fired = (url === "https://www.yahoo.com/");
				})
				.open('http://www.yahoo.com')
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
				.open(serverUrl)
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
				.open(serverUrl)
				.evaluate(function() {
					console.log("message");
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
				.open(serverUrl)
				.evaluate(function() {
					alert('ono');
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
				.open(serverUrl)
				.evaluate(function() {
					prompt('ono');
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

	describe('Tabs', function() {
		var horseman;

		beforeEach(function() {
			horseman = new Horseman();
		});

		afterEach(function() {
			horseman.close();
		});

		it('should let you open a new tab', function(done) {
			horseman
				.open(serverUrl)
				.openTab(serverUrl + "next.html")
				.tabCount()
				.then(function(count) {
					count.should.equal(2);
				})
				.finally(done);
		});

		it('should fire an event when a tab is created', function(done) {
			var fired = false;

			horseman
				.on('tabCreated', function() {
					fired = true;
				})
				.open(serverUrl)
				.openTab(serverUrl + "next.html")
				.then(function() {
					fired.should.be.true;
				})
				.finally(done);

		});

		it('should let switch tabs', function(done) {
			horseman
				.open(serverUrl)
				.openTab(serverUrl + "next.html")
				.switchToTab(0)
				.url()
				.then(function(url){
					url.should.equal(serverUrl)
				})
				.finally(done);

		});

	});

	describe('Chaining', function() {

		var horseman;

		beforeEach(function() {
			horseman = new Horseman();
		});

		afterEach(function() {
			horseman.close();
		});

		it('should be available when calling actions on horseman', function() {
			horseman.open(serverUrl)
				.should.have.properties(Object.keys(actions));
		});

		it('should be available when calling actions on Promises', function() {
			horseman.open(serverUrl).url()
				.should.have.properties(Object.keys(actions));
		});
	});

});