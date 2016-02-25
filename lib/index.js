var clone = require('clone');
var defaults = require('defaults');
var phantom = require("node-phantom-simple");
var path = require("path");
var debug = require('debug')('horseman');
var actions = require("./actions");
var HorsemanPromise = require('./HorsemanPromise.js');
var noop = function() {};

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
	switchToNewTab: false
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

	this.ready = prepare(this, instantiationOptions);

};

Horseman.prototype.pageMaker = function(_page) {
	var self = this;
	return new HorsemanPromise(function(resolve, reject) {
		if (_page) {
			setupPage(_page);
		} else {
			self.phantom.createPage(function(err, page) {
				if (err) {
					throw err;
				} else {
					setupPage(page);
				}
			});
		}

		function setupPage(page) {
			debug('page created')

			page.onPageCreated = self.pageMaker.bind(self);

			page.onResourceReceived = function(response) {
				self.responses[response.url] = response.status;
			}.bind(self);

			page.onLoadFinished = function() {
				var self = this;
				self.waitingForNextPage = false;
				debug('phantomjs onLoadFinished triggered.');
				if (self.options.injectJquery) {
					var self = this;
					self.ready = self
						.evaluate(function() {
							return (typeof window.jQuery !== "undefined");
						})
						.then(function(hasJquery) {
							if (!hasJquery) {
								var jQueryLocation = path.join(__dirname, "../files/jquery-2.1.1.min.js");
								return new HorsemanPromise(function(resolve, reject) {
									page.injectJs(jQueryLocation, function() {
										debug('injected jQuery');
										if (page.onLoadFinished2) {
											page.onLoadFinished2();
										}
										resolve();
									})
								});

							} else {
								debug("jQuery not injected - already exists on page");
								if (page.onLoadFinished2) {
									page.onLoadFinished2();
								}
								resolve();
							}
						})
				} else {
					if (page.onLoadFinished2) {
						page.onLoadFinished2();
					}
				}
			}.bind(self);

			resolve(page);
		}
	}).tap(function attachPage(page) {
		if (!_page || self.options.switchToNewTab) {
			self.page = page;
		}
		self.tabs.push(page);

		self.onTabCreated();
	});
}

/**
 * Attach all the actions.
 */
Object.keys(actions).forEach(function(name) {
	Horseman.prototype[name] = actions[name];

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
