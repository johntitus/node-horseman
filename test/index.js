'use strict';

var Horseman = require('../lib');
var actions = require('../lib/actions');
var fs = require('fs');
var os = require('os');
var path = require('path');
var Promise = require('bluebird');
var express = require('express');
var semver = require('semver');
var hoxy = require('hoxy');
var request = require('request');
var should = require('should');
var parallel = require('mocha.parallel');
var rmdir = require('rmdir');

var app;
var server;
var serverUrl;
var hostname = 'http://localhost';
var defaultPort = 4567;
var defaultTimeout = 8000; // Increase timeout for Travis

function navigation(bool) {
	var title = 'Navigation ' + ((bool) ? 'with' : 'without') + ' jQuery';

	parallel(title, function() {
		it('should set the user agent', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			var userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) ' +
					'AppleWebKit/537.36 (KHTML, like Gecko) ' +
					'Chrome/37.0.2062.124 Safari/537.36';
			return horseman
				.userAgent(userAgent)
				.open(serverUrl)
				.evaluate(function() {
					return navigator.userAgent;
				})
				.close()
				.should.eventually
				.equal(userAgent);

		});

		it('should set headers', function() {
			var headers = {
				'X-Horseman-Header': 'test header'
			};
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.headers(headers)
				.open('http://httpbin.org/headers')
				.evaluate(function() {
					return document.body.children[0].innerHTML;
				})
				.close()
				.then(JSON.parse)
				.should.eventually
				.have.property('headers')
				.with.property('X-Horseman-Header', 'test header');
		});

		it('should open a page', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.url()
				.close()
				.should.eventually
				.equal(serverUrl);
		});

		it('should reject on fail', function() {
			var port = (process.env.port || defaultPort) + 1;
			var requestUrl = hostname + ':' + port + '/';

			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(requestUrl)
				.close()
				.should
				.be.rejectedWith({
					message: 'Failed to GET url: ' + requestUrl
				});
		});

		it('should have a HTTP status code', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.status()
				.close()
				.should.eventually
				.equal(200);
		});

		it('should click a link', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.click('a[href="next.html"]')
				.waitForNextPage()
				.url()
				.close()
				.should.eventually
				.equal(serverUrl + 'next.html');
		});

		it('should go backwards and forwards', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.click('a[href="next.html"]')
				.waitForNextPage()
				.back()
				.waitForNextPage()
				.url()
				.then(function(data) {
					data.should.equal(serverUrl);
				})
				.forward()
				.waitForNextPage()
				.url()
				.close()
				.should.eventually
				.equal(serverUrl + 'next.html');
		});

		it('should use basic authentication', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.authentication('my', 'auth')
				.open('http://httpbin.org/basic-auth/my/auth')
				.evaluate(function() {
					return document.body.innerHTML.length;
				})
				.close()
				.should.eventually
				.be.above(0);
		});

		it('should pass custom options to Phantom', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool,
				ignoreSSLErrors: true,
				phantomOptions: {
					'ignore-ssl-errors': false
				}
			});
			return horseman
				.open('https://expired.badssl.com')
				.close()
				.should
				.be.rejected();
		});

		it('should set the viewport', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			var size = {
				width: 400,
				height: 1000
			};
			return horseman
				.viewport(size.width, size.height)
				.open('http://www.google.com')
				.viewport()
				.close()
				.should.eventually
				.have.properties(size);
		});

		it('should let you scroll', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open('http://www.google.com')
				.scrollTo(50, 40)
				.evaluate(function() {
					return {
						top: document.body.scrollTop,
						left: document.body.scrollLeft
					};
				})
				.close()
				.should.eventually
				.have.properties({
					top: 50,
					left: 40
				});
		});

		it('should add a cookie', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			var cookie = {
				name: 'test',
				value: 'cookie',
				domain: 'httpbin.org'
			};

			return horseman
				.cookies(cookie)
				.open('http://httpbin.org/cookies')
				.text('pre')
				.close()
				.then(JSON.parse)
				.get('cookies')
				.should.eventually
				.have.property(cookie.name, cookie.value);
		});

		it('should clear out all cookies', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.cookies([])
				.open('http://httpbin.org/cookies')
				.text('pre')
				.close()
				.then(JSON.parse)
				.should.eventually
				.not.have.keys();
		});

		it('should add an array of cookies', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			var cookies = [{
				name: 'test',
				value: 'cookie',
				domain: 'httpbin.org'
			}, {
				name: 'test2',
				value: 'cookie2',
				domain: 'httpbin.org'
			}];

			return horseman
				.cookies(cookies)
				.open('http://httpbin.org/cookies')
				.text('pre')
				.close()
				.then(JSON.parse)
				.get('cookies')
				.then(function(result) {
					return cookies.forEach(function(cookie) {
						result.should.have.property(cookie.name, cookie.value);
					});
				});
		});

		it('should add cookies.txt file', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			// Must keep these up to date with files/cookies.txt
			var cookies = [{
				name: 'test',
				value: 'cookie',
				domain: 'httpbin.org'
			}, {
				name: 'test2',
				value: 'cookie2',
				domain: 'httpbin.org'
			}];
			var COOKIES_TXT = path.join(__dirname, 'files', 'cookies.txt');

			return horseman
				.cookies(COOKIES_TXT)
				.open('http://httpbin.org/cookies')
				.text('pre')
				.close()
				.then(JSON.parse)
				.get('cookies')
				.then(function(result) {
					return cookies.forEach(function(cookie) {
						result.should.have.property(cookie.name, cookie.value);
					});
				});
		});

		it('should post to a page', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			var data = 'universe=expanding&answer=42';

			return horseman
				.post('http://httpbin.org/post', data)
				.text('pre')
				.close()
				.then(JSON.parse)
				.should.eventually
				.have.property('form')
				.with.properties({
					answer: '42',
					universe: 'expanding'
				});
		});

		it('should return a status from open', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.close()
				.should.eventually
				.equal('success');
		});

	});
}

function evaluation(bool) {
	var title = 'Evaluation ' + ((bool) ? 'with' : 'without') + ' jQuery';

	parallel(title, function() {
		after(function unlinkFiles() {
			return Promise
				.fromCallback(function(done) {
					return fs.stat('test.html', done);
				})
				.call('isFile')
				.catch(function() {})
				.then(function(isFile) {
					if (!isFile) {
						return;
					}
					return Promise.fromCallback(function(done) {
						return fs.unlink('test.html', done);
					});
				});
		});

		it('should get the title', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.title()
				.close()
				.should.eventually
				.equal('Testing Page');
		});

		it('should verify an element exists', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.exists('input')
				.close()
				.should.eventually
				.be.true();
		});

		it('should verify an element does not exists', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.exists('article')
				.close()
				.should.eventually
				.be.false();
		});

		it('should count the number of selectors', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.count('a')
				.close()
				.should.eventually
				.be.above(0);
		});

		it('should get the html of an element', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.html('#text')
				.close()
				.should.eventually
				.match(/code/);
		});

		it('should write the html of an element', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.html('', 'test.html')
				.close()
				.then(function() {
					return Promise.fromCallback(function(done) {
						return fs.stat('test.html', done);
					});
				})
				.call('isFile')
				.should.eventually
				.be.true();
		});

		it('should get the text of an element', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.text('#text')
				.close()
				.call('trim')
				.should.eventually
				.equal('This is my code.');
		});

		it('should get the plain text of the page', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl + "/plainText.html")
				.plainText()
				.close()
				.call('trim')
				.should.eventually
				.equal("This is some plain text.");
		});

		it('should get the value of an element', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.value('input[name="input1"]')
				.close()
				.should.eventually
				.equal('');
		});

		it('should get an attribute of an element', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.attribute('a', 'href')
				.close()
				.should.eventually
				.equal('next.html');
		});

		it('should get a css property of an element', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.cssProperty('a', 'margin-bottom')
				.close()
				.should.eventually
				.equal('3px');
		});

		it('should get the width of an element', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.width('a')
				.close()
				.should.eventually
				.be.above(0);
		});

		it('should get the height of an element', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.height('a')
				.close()
				.should.eventually
				.be.above(0);
		});

		it('should determine if an element is visible', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.visible('a')
				.close()
				.should.eventually
				.be.true();
		});

		it('should determine if an element is not-visible', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.visible('.login-popup')
				.close()
				.should.eventually
				.be.false();
		});

		it('should evaluate javascript', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.evaluate(function() {
					return document.title;
				})
				.close()
				.should.eventually
				.equal('Testing Page');
		});

		it('should evaluate javascript with optional parameters', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			var str = 'yo';
			return horseman
				.open(serverUrl)
				.evaluate(function(param) {
					return param;
				}, str)
				.close()
				.should.eventually
				.equal(str);
		});

		it('should evaluate Promise/thenable', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectBluebird: true,
				injectJquery: bool
			});
			var str = 'yo';
			return horseman
				.open(serverUrl)
				.evaluate(function(param) {
					return Promise.resolve(param).delay(10);
				}, str)
				.close()
				.should.eventually
				.equal(str);
		});

		it('should evaluate with callback', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			var str = 'yo';
			return horseman
				.open(serverUrl)
				.evaluate(function(param, done) {
					return setTimeout(function() {
						done(null, param);
					}, 10);
				}, str)
				.close()
				.should.eventually
				.equal(str);
		});

		it('should reject Promise on evaluate throw', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.evaluate(function() {
					throw new Error();
				})
				.close()
				.should
				.be.rejected();
		});

		it('should reject Promise on evaluate reject', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.evaluate(function() {
					return Promise.reject(new Error());
				})
				.close()
				.should
				.be.rejected();
		});

		it('should reject Promise on evaluate callback err', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.evaluate(function(done) {
					return setTimeout(function() {
						done(new Error());
					}, 10);
				})
				.close()
				.should
				.be.rejected();
		});

	});
}

function manipulation(bool) {
	var title = 'Manipulation ' + ((bool) ? 'with' : 'without') + ' jQuery';

	parallel(title, function() {
		after(function unlinkFiles() {
			var files = [
				'out.png',
				'small.png',
				'big.png',
				'default.pdf',
				'euro.pdf'
			];
			return Promise.map(files, function(file) {
				return Promise
					.fromCallback(function(done) {
						return fs.stat(file, done);
					})
					.call('isFile')
					.catch(function() {})
					.then(function(isFile) {
						if (!isFile) {
							return;
						}
						return Promise.fromCallback(function(done) {
							return fs.unlink(file, done);
						});
					});
			});
		});

		it('should inject javascript', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.injectJs('test/files/testjs.js')
				.evaluate(function() {
					return ___obj.myname;
				})
				.close()
				.should.eventually
				.equal('isbob');
		});

		it('should reject when inject javascript fails', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.injectJs('test/files/not_a_real_file.js')
				.close()
				.should.be.rejected();
		});

		it('should include javascript', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.includeJs(serverUrl + '/testjs.js')
				.evaluate(function() {
					return ___obj.myname;
				})
				.close()
				.should.eventually
				.equal('isbob');
		});

		it('should type and click', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.type('input[name="input1"]', 'github')
				.value('input[name="input1"]')
				.close()
				.should.eventually
				.equal('github');
		});

		it('should clear a field', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.type('input[name="input1"]', 'github')
				.clear('input[name="input1"]')
				.value('input[name="input1"]')
				.close()
				.should.eventually
				.equal('');
		});

		it('should select a value', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.select('#select1', '1')
				.value('#select1')
				.close()
				.should.eventually
				.equal('1');

		});

		it('should take a screenshot', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.screenshot('out.png')
				.close()
				.then(function() {
					return Promise.fromCallback(function(done) {
						return fs.stat('out.png', done);
					});
				})
				.call('isFile')
				.should.eventually
				.be.true();
		});

		it('should take a screenshotBase64', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.screenshotBase64('PNG')
				.close()
				.should.eventually
				.be.a.String();
		});

		it('should take a cropBase64', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.cropBase64(
					{top: 100, left: 100, width: 100, height: 100},
					'PNG'
				)
				.close()
				.should.eventually
				.be.a.String();
		});

		it('should let you zoom', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.viewport(800, 400)
				.open(serverUrl)
				.screenshot('small.png')
				.viewport(1600, 800)
				.zoom(2)
				.open(serverUrl)
				.screenshot('big.png')
				.close()
				.then(function() {
					var small = Promise.fromCallback(function(done) {
						return fs.stat('small.png', done);
					}).get('size');
					var big = Promise.fromCallback(function(done) {
						return fs.stat('big.png', done);
					}).get('size');
					return Promise.join(small, big, function(small, big) {
						big.should.be.greaterThan(small);
					});
				});
		});

		it('should let you export as a pdf', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			horseman
				.open('http://www.google.com')
				.pdf('default.pdf')
				.pdf('euro.pdf', {
					format: 'A5',
					orientation: 'portrait',
					margin: 0
				})
				.close()
				.then(function() {
					var defaultSize = Promise.fromCallback(function(done) {
						return fs.stat('default.pdf', done);
					}).get('size');
					var euroSize = Promise.fromCallback(function(done) {
						return fs.stat('euro.pdf', done);
					}).get('size');
					return Promise.all([
						defaultSize.should.eventually.be.greaterThan(0),
						euroSize.should.eventually.be.greaterThan(0)
					]);
				});
		});

		//File upload is broken in Phantomjs 2.0
		//https://github.com/ariya/phantomjs/issues/12506
		it('should upload a file', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.upload('#upload', 'test/files/testjs.js')
				.value('#upload')
				.close()
				.should.eventually
				.equal('C:\\fakepath\\testjs.js');
		});

		it('should download a text file', function(done) {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open(serverUrl)
				.download(serverUrl + 'test.txt')
				.close()
				.should.eventually
				.match(/^This is test text.\n*$/);
		});

		it('should download a binary file', function(done) {
			if (phantomVersion.major < 2) {
				this.skip('binary .download() does not work in PhantomJS 1.0');
			}
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			var img = horseman
				.open('http://httpbin.org')
				.download('http://httpbin.org/image', undefined, true)
				.close();
			var opts = {url: 'http://httpbin.org/image', encoding: null};
			request(opts, function(err, res, body) {
				if (err) { return done(err); }
				img.then(function(img) {
					img.toString().should.equal(body.toString());
				}).asCallback(done);
			});
		});

		it('should verify a file exists before upload', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open('http://validator.w3.org/#validate_by_upload')
				.upload('#uploaded_file', 'nope.jpg')
				.close()
				.should
				.be.rejected();
		});

		it('should fire a keypress when typing', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open('http://httpbin.org/forms/post')
				.evaluate(function() {
					window.keypresses = 0;
					var elem = document.querySelector('input[name="custname"]');
					elem.onkeypress = function() {
						window.keypresses++;
					};
				})
				.type('input[name="custname"]', 'github')
				.evaluate(function() {
					return window.keypresses;
				})
				.close()
				.should.eventually
				.equal(6);
		});

		it('should send mouse events', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open('https://dvcs.w3.org/' +
						'hg/d4e/raw-file/tip/mouse-event-test.html')
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
						'mousedown': findByTextContent('tr', 'mousedown'),
						'mouseup': findByTextContent('tr', 'mouseup'),
						'click': findByTextContent('tr', 'click'),
						'doubleclick': findByTextContent('tr', 'dblclick'),
						'mousemove': findByTextContent('tr', 'mousemove'),
					};
				})
				.close()
				.should.eventually
				.matchEach(function(eventCount) {
					eventCount.should.be.greaterThan(0);
				});
		});

		it('should send keyboard events', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: bool
			});
			return horseman
				.open('http://unixpapa.com/js/testkey.html')
				.keyboardEvent('keypress', 16777221)
				.evaluate(function() {
					return document.querySelector('textarea[name="t"]').value;
				})
				.close()
				.should.eventually
				.match(/keyCode=13/);
		});
	});
}

var phantomVersion;
describe('Horseman', function() {
	this.timeout(20000);

	/**
	 * Setup an express server for testing purposes.
	 */
	before(function(done) {
		app = express();
		var port = process.env.port || defaultPort;
		app.use(express.static(path.join(__dirname, 'files')));
		server = app.listen(port, function() {
			serverUrl = hostname + ':' + port + '/';
			done();
		});
	});

	/**
	 * Get PhantomJS version.
	 * Some features require certain verrsions.
	 */
	before(function setupPhantom() {
		var horseman = new Horseman();
		return horseman.ready
			.then(function() {
				return Promise.fromCallback(function(done) {
					return horseman.phantom.get('version', done);
				});
			})
			.then(function(version) {
				phantomVersion = version;
			})
			.close();
	});

	/**
	 * Tear down the express server we used for testing.
	 */
	after(function(done) {
		server.close(done);
	});

	it('should be constructable', function() {
		var horseman = new Horseman();
		horseman.should.be.ok();
		return horseman.close();
	});

	navigation(true);

	navigation(false);

	evaluation(true);

	evaluation(false);

	manipulation(true);

	manipulation(false);

	describe('Usability', function() {
		it('should do a function without breaking the chain', function() {
			var doComplete = false;
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.do(function(complete) {
					setTimeout(function() {
						doComplete = true;
						complete();
					}, 500);
				})
				.close()
				.then(function() {
					doComplete.should.be.true();
				});
		});

		it('should log output', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var oldLog = console.log;
			var output = '';
			console.log = function(message) {
				output += message;
			};
			return horseman
				.open(serverUrl)
				.count('a')
				.log()
				.close()
				.then(function() {
					output.should.equal('1');
				})
				.finally(function() {
					console.log = oldLog;
				});
		});

		it('should log falsy argument', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var oldLog = console.log;
			var output = '';
			console.log = function(message) {
				output += message;
			};
			return horseman
				.open(serverUrl)
				.log(undefined)
				.close()
				.then(function() {
					output.should.equal('undefined');
				})
				.finally(function() {
					console.log = oldLog;
				});
		});

		it('should keep resolution value after log', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl)
				.return(1)
				.log(undefined)
				.close()
				.should.eventually
				.equal(1);
		});
	});

	parallel('Inject jQuery', function() {
		it('should inject jQuery', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open('http://www.google.com')
				.evaluate(function() {
					return typeof jQuery;
				})
				.close()
				.should.eventually
				.equal('function');
		});

		it('should not inject jQuery', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: false
			});
			return horseman
				.open('http://www.google.com')
				.evaluate(function() {
					return typeof jQuery;
				})
				.close()
				.should.eventually
				.equal('undefined');
		});

		it('should not stomp on existing jQuery', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectJquery: true
			});
			return horseman
				.open(serverUrl + 'jQuery.html')
				.evaluate(function() {
					return $.fn.jquery;
				})
				.close()
				.should.eventually
				.equal('Not really jQuery');
		});
	});

	parallel('Inject bluebird', function() {
		it('should not inject bluebird', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open('http://www.google.com')
				.evaluate(function() {
					return typeof Promise;
				})
				.close()
				.should.eventually
				.equal('undefined');
		});

		it('should inject bluebird', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectBluebird: true
			});
			return horseman
				.open('http://www.google.com')
				.evaluate(function() {
					return typeof Promise;
				})
				.close()
				.should.eventually
				.equal('function');
		});

		it('should expose as Bluebird', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				injectBluebird: 'bluebird'
			});
			return horseman
				.open('http://www.google.com')
				.evaluate(function() {
					return {
						Promise: typeof Promise,
						Bluebird: typeof Bluebird
					};
				})
				.close()
				.should.eventually
				.have.properties({
					Promise: 'undefined',
					Bluebird: 'function'
				});
		});

	});

	parallel('Waiting', function() {
		it('should wait for the page to change', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl)
				.click('a')
				.waitForNextPage()
				.url()
				.close()
				.should.eventually
				.equal(serverUrl + 'next.html');
		});

		it('should wait until a condition on the page is true', function() {
			var forALink = function() {
				return ($('a:contains("About")').length > 0);
			};
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open('http://www.google.com/')
				.waitFor(forALink, true)
				.evaluate(forALink)
				.close()
				.should.eventually
				.be.true();
		});

		it('should wait a set amount of time', function() {
			var start = new Date();
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl)
				.wait(1000)
				.close()
				.then(function() {
					var end = new Date();
					var diff = end - start;
					diff.should.be.greaterThan(999); //may be a ms or so off.
				});
		});

		it('should timeout after a specific time', function() {
			var start = new Date();
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl)
				.waitForSelector("#not-existing-id", { timeout : defaultTimeout/5})
				.close()
				.catch(function(err){
					var end = new Date();
					var diff = end - start;
					diff.should.be.below(defaultTimeout/2); //may be a ms or so off.
				});
		});

		it('should wait until a selector is seen', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl)
				.waitForSelector('input')
				.count('input')
				.close()
				.should.eventually
				.be.above(0);
		});

		it('should call onTimeout if timeout in waitForNextPage', function() {
			var timeoutHorseman = new Horseman({
				timeout: 10
			});
			var timeoutFired = false;
			return timeoutHorseman
				.on('timeout', function() {
					timeoutFired = true;
				})
				.waitForNextPage()
				.catch(Horseman.TimeoutError, function() {})
				.close()
				.then(function() {
					timeoutFired.should.be.true();
				});
		});

		it('should call onTimeout if timeout in waitForNextPage with custom timeout', function() {
			var start = new Date();
			var timeoutHorseman = new Horseman({
				timeout: 10
			});
			var timeoutFiredTime = 0;
			return timeoutHorseman
				.on('timeout', function() {
					var end = new Date();
					var diff = end - start;
					timeoutFiredTime = diff;
				})
				.waitForNextPage({timeout: 1000})
				.catch(Horseman.TimeoutError, function() {})
				.close()
				.then(function() {
					timeoutFiredTime.should.be.above(900);
				});
		});

		it('should reject Promise if timeout in  waitForNextPage', function() {
			var timeoutHorseman = new Horseman({
				timeout: 10
			});
			return timeoutHorseman
				.waitForNextPage()
				.close()
				.should
				.be.rejectedWith(Horseman.TimeoutError);
		});

		it('should call onTimeout if timeout in waitForSelector', function() {
			var timeoutHorseman = new Horseman({
				timeout: 10
			});
			var timeoutFired = false;
			return timeoutHorseman
				.on('timeout', function() {
					timeoutFired = true;
				})
				.waitForSelector('bob')
				.catch(Horseman.TimeoutError, function() {})
				.close()
				.then(function() {
					timeoutFired.should.be.true();
				});
		});

		it('should reject Promise if timeout in waitForSelector', function() {
			var timeoutHorseman = new Horseman({
				timeout: 10
			});
			var timeoutFired = false;
			return timeoutHorseman
				.waitForSelector('bob')
				.close()
				.should
				.be.rejectedWith(Horseman.TimeoutError);
		});

		it('should call onTimeout if timeout in waitFor', function() {
			var timeoutHorseman = new Horseman({
				timeout: 10
			});
			var timeoutFired = false;
			var return5 = function() {
				return 5;
			};
			return timeoutHorseman
				.on('timeout', function() {
					timeoutFired = true;
				})
				.waitFor(return5, 6)
				.catch(Horseman.TimeoutError, function() {})
				.close()
				.then(function() {
					timeoutFired.should.be.true();
				});
		});

		it('should reject Promise if timeout in waitFor', function() {
			var timeoutHorseman = new Horseman({
				timeout: 10
			});
			var timeoutFired = false;
			var return5 = function() {
				return 5;
			};
			return timeoutHorseman
				.waitFor(return5, 6)
				.close()
				.should
				.be.rejectedWith(Horseman.TimeoutError);
		});
	});

	/**
	 * Iframes
	 */
	parallel('Frames', function() {
		it('should get the frame name', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'frames.html')
				.switchToFrame('frame1')
				.frameName()
				.close()
				.should.eventually
				.equal('frame1');
		});

		it('should get the frame count', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'frames.html')
				.frameCount()
				.close()
				.should.eventually
				.equal(2);
		});

		it('should get frame names', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'frames.html')
				.frameNames()
				.close()
				.should.eventually
				.deepEqual(['frame1', 'frame2']);
		});

		it('should let you switch to the focused frame', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'frames.html')
				.switchToFrame('frame1')
				.switchToFocusedFrame()
				.frameName()
				.close()
				.should.eventually
				.equal('');
		});

		it('should let you switch to a frame', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'frames.html')
				.switchToFrame('frame1')
				.waitForSelector('h1')
				.html('h1')
				.close()
				.should.eventually
				.equal('This is frame 1.');
		});

		it('should let you switch to the main frame', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'frames.html')
				.switchToFrame('frame2')
				.switchToFrame('frame31')
				.switchToMainFrame()
				.frameName()
				.close()
				.should.eventually
				.equal('');
		});

		it('should let you switch to the parent frame', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'frames.html')
				.switchToFrame('frame2')
				.switchToFrame('frame31')
				.switchToParentFrame()
				.frameName()
				.close()
				.should.eventually
				.equal('frame2');
		});
	});

	/**
	 * events
	 */
	parallel('Events', function() {
		it('should fire an event on initialized', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('initialized', function() {
					fired = true;
				})
				.open(serverUrl)
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should fire an event on load started', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('loadStarted', function() {
					fired = true;
				})
				.open(serverUrl)
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should fire an event on load finished', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('loadFinished', function() {
					fired = true;
				})
				.open(serverUrl)
				.wait(50) //have to wait for the event to fire.
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should send status on load finished', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var stat;
			return horseman
				.on('loadFinished', function(status) {
					stat = status;
				})
				.open(serverUrl)
				.wait(50) //have to wait for the event to fire.
				.close()
				.then(function() {
					stat.should.equal('success');
				});
		});

		it('should fire an event when a resource is requested', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('resourceRequested', function() {
					fired = true;
				})
				.open(serverUrl)
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should fire an event when a resource is received', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('resourceReceived', function() {
					fired = true;
				})
				.open(serverUrl)
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should fire an event when navigation requested', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('navigationRequested',
					function(url, type, willNavigate, isMain) {
						fired = (url === 'https://www.yahoo.com/');
						type.should.equal('Other');
						willNavigate.should.be.true();
						isMain.should.be.true();
					}
				)
				.open('http://www.yahoo.com')
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should fire an event when the url changes', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('urlChanged', function() {
					fired = true;
				})
				.open(serverUrl)
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should fire an event when a console message is seen', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('consoleMessage', function() {
					fired = true;
				})
				.open(serverUrl)
				.evaluate(function() {
					console.log('message');
				})
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should fire an event when an alert is seen', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('alert', function() {
					fired = true;
				})
				.open(serverUrl)
				.evaluate(function() {
					alert('ono');
				})
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should fire an event when a prompt is seen', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('prompt', function() {
					fired = true;
				})
				.open(serverUrl)
				.evaluate(function() {
					prompt('ono');
				})
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should receive return value of at callback', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.at('prompt', function() {
					return 'foo';
				})
				.open(serverUrl)
				.evaluate(function() {
					return prompt('ono');
				})
				.close()
				.should.eventually
				.equal('foo');
		});
	});

	/**
	 * tabs
	 */
	parallel('Tabs', function() {
		it('should let you open a new tab', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl)
				.openTab(serverUrl + 'next.html')
				.tabCount()
				.close()
				.should.eventually
				.equal(2);
		});

		it('should fire an event when a tab is created', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('tabCreated', function() {
					fired = true;
				})
				.open(serverUrl)
				.openTab(serverUrl + 'next.html')
				.close()
				.then(function() {
					fired.should.be.true();
				});
		});

		it('should let switch tabs', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl)
				.openTab(serverUrl + 'next.html')
				.switchToTab(0)
				.url()
				.close()
				.should.eventually
				.equal(serverUrl);
		});

		it('should have tabs opened by links', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'opennewtab.html')
				.click('a#newtab')
				.waitForNextPage()
				.tabCount()
				.then(function(count) {
					count.should.equal(2);
				})
				.close();
		});

		it('should remove closed tabs', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'opennewtab.html')
				.click('a#newtab')
				.waitForNextPage()
				.switchToTab(1)
				.evaluate(function closePage() {
					window.close();
				})
				.tabCount()
				.close()
				.should.eventually
				.equal(1);
		});

		it('should close tabs', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			return horseman
				.open(serverUrl + 'opennewtab.html')
				.click('a#newtab')
				.waitForNextPage()
				.switchToTab(1)
				.closeTab(1)
				.tabCount()
				.close()
				.should.eventually
				.equal(1);
		});

		it('should fire an event when a tab is closed', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			var fired = false;
			return horseman
				.on('tabClosed', function() {
					fired = true;
				})
				.open(serverUrl + 'opennewtab.html')
				.click('a#newtab')
				.waitForNextPage()
				.switchToTab(1)
				.closeTab(1)
				.then(function() {
					fired.should.be.true();
				})
				.close();
		});

		describe('swtichToNewTab option', function() {
			it('should default to not switching tab', function() {
				var horseman = new Horseman({
					timeout: defaultTimeout,
				});
				return horseman
					.open(serverUrl + 'opennewtab.html')
					.click('a#newtab')
					.waitForNextPage()
					.title()
					.close()
					.should.eventually
					.equal('Horseman test link open new tab');
			});

			it('should switch tab when true', function() {
				var horseman = new Horseman({
					timeout: defaultTimeout,
					switchToNewTab: true
				});
				return horseman
					.open(serverUrl + 'opennewtab.html')
					.click('a#newtab')
					.waitForNextPage()
					.title()
					.close()
					.should.eventually
					.equal('Horseman new tab');
			});
		});
	});

	describe('Chaining', function() {
		var horseman;
		beforeEach(function() {
			horseman = new Horseman({
				timeout: defaultTimeout,
			});
		});

		afterEach(function() {
			return horseman.close();
		});

		it('should be available when calling actions on horseman', function() {
			var p = horseman.open('about:blank');
			return p.finally(function() {
				p.should.have.properties(Object.keys(actions));
			});
		});

		it('should be available when calling actions on Promises', function() {
			var p = horseman.open('about:blank').url();
			return p.finally(function() {
				p.should.have.properties(Object.keys(actions));
			});
		});

		it('should be available when calling Promise methods', function() {
			var p = horseman.open('about:blank').then(function() {});
			return p.finally(function() {
				p.should.have.properties(Object.keys(actions));
			});
		});

		it('should call close after rejection', function() {
			// Record if close gets called
			var close = horseman.close;
			var called = false;
			horseman.close = function() {
				called = true;
				return close.apply(this, arguments);
			};
			return horseman
				.open('about:blank')
				.then(function() {
					throw new Error('Intentional Rejection');
				})
				.close()
				.catch(function() {})
				.finally(function() {
					called.should.be.true();
				})
				.then(function() {
					// Don't call close twice
					horseman.close = function() {};
				});
		});

		it('should not call exit in close after failed init', function() {
			var BAD_PATH = 'notphantom';
			var horseman = new Horseman({phantomPath: BAD_PATH});
			return horseman
				.open('about:blank')
				.close()
				.should
				.be.rejectedWith({code: 'ENOENT'});
		});
	});

	describe('Proxy', function() {
		var proxy;
		var PROXY_HEADER = 'x-horseman-proxied';
		var PROXY_PORT = process.env['proxy_port'] ||
				(process.env.port || defaultPort) + 1;

		// Set up proxy server for phantom to connect to
		before(function setupProxy(done) {
			if (!semver.satisfies(process.version, '>= 0.12')) {
				this.skip('text proxy server require Node 0.12 or above');
			}
			proxy = hoxy.createServer();
			proxy.intercept('response', function(req, resp) {
				resp.headers[PROXY_HEADER] = 'test';
			});
			proxy.listen(PROXY_PORT, done);
		});

		after(function closeProxy(done) {
			if (proxy) {
				proxy.close(done);
			} else {
				done();
			}
		});

		it('should use arguments', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
				proxy: 'localhost:' + PROXY_PORT,
				proxyType: 'http',
			});
			var hadHeader = false;
			return horseman
				.on('resourceReceived', function(resp) {
					var hasHeader = resp.headers.some(function(header) {
						return header.name === PROXY_HEADER;
					});
					hadHeader = hadHeader || hasHeader;
				})
				.open('http://www.google.com')
				.close()
				.then(function() {
					hadHeader.should.equal(true);
				});
		});

		it('should use setProxy', function() {
			var horseman = new Horseman({
				timeout: defaultTimeout,
			});
			if (phantomVersion.major < 2) {
				this.skip('setProxy requires PhantomJS 2.0 or greater');
			}
			var hadHeader = false;
			return horseman
				.setProxy('localhost', PROXY_PORT)
				.on('resourceReceived', function(resp) {
					var hasHeader = resp.headers.some(function(header) {
						return header.name === PROXY_HEADER;
					});
					hadHeader = hadHeader || hasHeader;
				})
				.open('http://www.google.com')
				.then(function() {
					hadHeader.should.equal(true);
				})
				.close();
		});
	});

	describe('Cache', function() {

		describe('diskCache and diskCachePath options', function() {
			var CACHE_PATH = path.join(os.tmpdir(), 'test_horseman_cache');
			var rmCachePath = function(done) {
				if (fs.existsSync(CACHE_PATH)) {
					rmdir(CACHE_PATH, done);
				} else {
					done();
				}
			};

			before(rmCachePath);

			after(rmCachePath);

			it('should cache files on disk', function() {
				if (phantomVersion.major < 2) {
					this.skip('diskCachePath requires PhantomJS 2.0 or greater');
				}

				var horseman = new Horseman({
					diskCache: true,
					diskCachePath: CACHE_PATH
				});

				return horseman
					.open(serverUrl)
					.then(function () {
						fs.existsSync(CACHE_PATH).should.be.true();
						fs.readdirSync(CACHE_PATH).some(function (dirName) {
							return dirName.match(/data\d+/);
						}).should.be.true();
					})
					.close();
			})
		})
	});
});
