'use strict';

var clone = require('clone');
var defaults = require('defaults');
var phantom = require("node-phantom-simple");
var path = require("path");
var debug = require('debug')('horseman');
var actions = require("./actions");
var HorsemanPromise = require('./HorsemanPromise.js');
var noop = function() {};

/**
 * Check for npm PhantomJS
 */
var phantomjs;
try {
	phantomjs = require('phantomjs-prebuilt');
} catch (err) {
	try {
		phantomjs = require('phantomjs');
	} catch (err) {
		phantomjs = {};
	}
}

/**
 * Default options.
 */
var DEFAULTS = {
	timeout: 5000,
	interval: 50,
	port: 12405,
	weak: true,
	clientScripts: [],
	loadImages: true,
	sslProtocol: "any", //sslv3, sslv2, tlsv1, any
	injectJquery: true,
	switchToNewTab: false,
	injectBluebird: false,
	phantomPath: phantomjs.path
};



function prepare(horseman, instantiationOptions) {
	return new HorsemanPromise(function(resolve, reject) {
		phantom.create(instantiationOptions, function(err, instance) {
			debug('phantom created.')
			horseman.phantom = instance;
			if (err) reject(err);
			else {
				return horseman.pageMaker()
					.then(resolve)
					.catch(reject);
			};
		});
	}).bind(horseman);
}

var Horseman = function(options) {
	this.ready = false;
	DEFAULTS.port++;
	if (!(this instanceof Horseman)) return new Horseman(options);
	this.options = defaults(clone(options) || {}, DEFAULTS);

	var self = this;

	debug('.setup() creating phantom instance on %s', this.options.port);

	var phantomOptions = {
		'load-images': this.options.loadImages,
		'ssl-protocol': this.options.sslProtocol
	};

	if (typeof this.options.ignoreSSLErrors !== "undefined") {
		phantomOptions['ignore-ssl-errors'] = this.options.ignoreSSLErrors;
	}
	if (typeof this.options.webSecurity !== "undefined") {
		phantomOptions['web-security'] = this.options.webSecurity;
	}
	if (typeof this.options.proxy !== "undefined") {
		phantomOptions.proxy = this.options.proxy;
	}
	if (typeof this.options.proxyType !== "undefined") {
		phantomOptions['proxy-type'] = this.options.proxyType;
	}
	if (typeof this.options.proxyAuth !== "undefined") {
		phantomOptions['proxy-auth'] = this.options.proxyAuth;
	}
	if (typeof this.options.cookiesFile !== "undefined") {
		phantomOptions['cookies-file'] = this.options.cookiesFile;
	}

	if (this.options.debugPort) {
		phantomOptions['remote-debugger-port'] = this.options.debugPort;
		phantomOptions['remote-debugger-autorun'] = 'no';
		if (this.options.debugAutorun !== false) {
			phantomOptions['remote-debugger-autorun'] = 'yes';
		}
	}

	var instantiationOptions = {
		parameters: phantomOptions
	};

	if (typeof this.options.phantomPath !== "undefined") {
		instantiationOptions['path'] = this.options.phantomPath;
	}

	// Store the url that was requested for the current url
	this.targetUrl = null;

	// Store the HTTP status code for resources requested.
	this.responses = [];

	this.tabs = [];
	this.onTabCreated = noop;

	this.pageCnt = 0;

	this.ready = prepare(this, instantiationOptions);

};

Horseman.prototype.pageMaker = function(_page) {
	var self = this;

	return HorsemanPromise
		.try(function getPage() {
			if (_page) {
				return _page;
			} else {
				return HorsemanPromise.fromCallback(function(done) {
					return self.phantom.createPage(done);
				});
			}
		})
		.then(setupPage)
		.tap(function attachPage(page) {
			if (!_page || self.options.switchToNewTab) {
				self.page = page;
			}
			self.tabs.push(page);

			self.onTabCreated();
		});

	function setupPage(page) {
		debug('page created');

		page.onPageCreated = self.pageMaker.bind(self);
		
		self.onTabCreated();
		
		page.onResourceReceived = function(response) {
			self.responses[response.url] = response.status;
		};

		page.onLoadFinished = loadFinishedSetup;

		return page;

		function loadFinishedSetup() {
			var args = arguments;
			self.pageCnt++;
			debug('phantomjs onLoadFinished triggered.');

			self.ready = HorsemanPromise.try(function injectJQuery() {
				if (!self.options.injectJquery) {
					return;
				}

				return HorsemanPromise.fromNode(function hasJQuery(done) {
					return page.evaluate(function hasJQuery() {
						return (typeof window.jQuery !== 'undefined');
					}, done);
				})
				.then(function(hasJquery) {
					if (hasJquery) {
						debug('jQuery not injected - already exists on page');
						return;
					}

					var jQueryLocation = path.join(__dirname,
							'../files/jquery-2.1.1.min.js');
					return HorsemanPromise.fromCallback(function(done) {
						page.injectJs(jQueryLocation, done);
					})
					.tap(function() {
						debug('injected jQuery');
					});
				});
			})
			.then(function injectBluebird() {
				var inject = self.options.injectBluebird;
				if (!inject) {
					return;
				}

				return HorsemanPromise.fromNode(function hasPromise(done) {
					return page.evaluate(function hasPromise() {
						return (typeof window.Promise !== 'undefined');
					}, done);
				})
				.then(function(hasPromise) {
					if(hasPromise && inject !== 'bluebird') {
						debug('bluebird not injected - ' +
								'Promise already exists on page');
						return;
					}

					var bluebirdLocation = path.join(__dirname,
							'../node_modules/bluebird/js/browser/bluebird' + 
								(self.options.bluebirdDebug ? '' : '.min') +
								'.js');
					return HorsemanPromise.fromCallback(function(done) {
						return page.injectJs(bluebirdLocation, done);
					})
					.tap(function() {
						debug('injected bluebird');
					});

				})
				.then(function configBluebird() {
					return HorsemanPromise.fromNode(function(done) {
						return page.evaluate(
							function configBluebird(noConflict, debug) {
								if (debug) {
									// TODO: Turn on warnings in bluebird 3
									Promise.longStackTraces();
								}
								if (noConflict) {
									window.Bluebird = Promise.noConflict();
								}
							},
							inject === 'bluebird',
							self.options.bluebirdDebug,
						done);
					});
				});
			})
			.then(function initWindow() {
				return HorsemanPromise.fromCallback(function(done) {
					return page.evaluate(function initWindow() {
						window.__horseman = {};
					}, done);
				});
			})
			.then(function finishLoad() {
				if (page.onLoadFinished2) {
					return page.onLoadFinished2.apply(page, args);
				}
			})
			.bind(self);
		}
	}
};

/**
 * Attach all the actions.
 */
Object.keys(actions).forEach(function(name) {
	var action = actions[name];

	// Keep track of page counter before each action
	Horseman.prototype[name] = function() {
		this.lastActionPageCnt = this.curActionPageCnt;
		this.curActionPageCnt = this.pageCnt;
		return action.apply(this, arguments);
	};

	// Allow chaining actions off HorsemanPromises
	HorsemanPromise.prototype[name] = function() {
		var args = arguments;
		return this.then(function(val) {
			this.lastVal = val;
			return this[name].apply(this, args);
		});
	};
});

//**************************************************//
// Cleanup
//**************************************************//
Horseman.prototype.close = function() {
	debug('.close().');
	var self = this;
	return this.ready.then(function() {
		return self.phantom.exit(0);
	});
};
HorsemanPromise.prototype.close = function() {
	return this.finally(function() {
		return this.close();
	});
};

module.exports = Horseman;
module.exports.TimeoutError = HorsemanPromise.TimeoutError;
