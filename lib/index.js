'use strict';

var clone = require('clone');
var defaults = require('defaults');
var phantom = require('node-phantom-simple');
var path = require('path');
var debug = require('debug')('horseman');
var debugv = require('debug')('horseman:verbose');
var actions = require('./actions');
var HorsemanPromise = require('./HorsemanPromise.js');
var noop = function() {};

/**
 * Check for npm PhantomJS
 */
var phantomjs;
try {
	phantomjs = require('phantomjs-prebuilt');
	debug('using PhantomJS from phantomjs-prebuilt module');
} catch (err) {
	try {
		phantomjs = require('phantomjs');
		debug('using PhantomJS from phantomjs module');
	} catch (err) {
		phantomjs = {};
		debug('using PhantomJS from $PATH');
	}
}

/**
 * Default options.
 */
var DEFAULTS = {
	timeout: 5000,
	interval: 50,
	weak: true,
	loadImages: true,
	sslProtocol: 'any', //sslv3, sslv2, tlsv1, any
	injectJquery: true,
	switchToNewTab: false,
	injectBluebird: false,
	phantomPath: phantomjs.path
};

/**
 * Give each instance a unique ID for debug purposes
 */
var instanceId = 0;



function prepare(horseman, instantiationOptions) {
	return new HorsemanPromise(function(resolve, reject) {
		phantom.create(instantiationOptions, function(err, instance) {
			debug('phantom created');
			horseman.phantom = instance;
			if (err) {
				return reject(err);
			}
			if (debugv.enabled) {
				horseman.phantom.onError = function(msg, trace) {
					var str = msg;
					trace.forEach(function(t) {
						var fun = t.function || '<anonymous>';
						str += '\n\t' + t.file + ': ' + t.line + ' in ' + fun;
					});
					return debugv('onPhantomError', str, horseman.id);
				};
			}
			instance.get('version', function(err, ver) {
				if (err) { return reject(err); }
				var version = ver.major + '.' + ver.minor + '.' + ver.patch;
				debug('phantom version ' + version);
				return horseman.pageMaker()
					.then(resolve)
					.catch(reject);
			});
		});
	})
	.then(function() {
		horseman.pageCnt = 0;
	})
	.bind(horseman);
}

/**
 * Creates a new Horseman.
 * @constructor
 */
var Horseman = function Horseman(options) {
	this.ready = false;
	if (!(this instanceof Horseman)) { return new Horseman(options); }
	this.options = defaults(clone(options) || {}, DEFAULTS);

	this.id = ++instanceId;
	debug('.setup() creating phantom instance %s', this.id);

	var phantomOptions = {
		'load-images': this.options.loadImages,
		'ssl-protocol': this.options.sslProtocol
	};

	if (typeof this.options.ignoreSSLErrors !== 'undefined') {
		phantomOptions['ignore-ssl-errors'] = this.options.ignoreSSLErrors;
	}
	if (typeof this.options.webSecurity !== 'undefined') {
		phantomOptions['web-security'] = this.options.webSecurity;
	}
	if (typeof this.options.proxy !== 'undefined') {
		phantomOptions.proxy = this.options.proxy;
	}
	if (typeof this.options.proxyType !== 'undefined') {
		phantomOptions['proxy-type'] = this.options.proxyType;
	}
	if (typeof this.options.proxyAuth !== 'undefined') {
		phantomOptions['proxy-auth'] = this.options.proxyAuth;
	}
	if (typeof this.options.diskCache !== 'undefined') {
		phantomOptions['disk-cache'] = this.options.diskCache;
	}
	if (typeof this.options.diskCachePath !== 'undefined') {
		phantomOptions['disk-cache-path'] = this.options.diskCachePath;
	}
	if (typeof this.options.cookiesFile !== 'undefined') {
		phantomOptions['cookies-file'] = this.options.cookiesFile;
	}

	if (this.options.debugPort) {
		phantomOptions['remote-debugger-port'] = this.options.debugPort;
		phantomOptions['remote-debugger-autorun'] = 'no';
		if (this.options.debugAutorun !== false) {
			phantomOptions['remote-debugger-autorun'] = 'yes';
		}
	}

	Object.keys(this.options.phantomOptions || {}).forEach(function (key) {
		if (typeof phantomOptions[key] !== 'undefined') {
			debug('Horseman option ' + key + ' overridden by phantomOptions');
		}
		phantomOptions[key] = this.options.phantomOptions[key];
	}.bind(this));

	var instantiationOptions = {
		parameters: phantomOptions
	};

	if (typeof this.options.phantomPath !== 'undefined') {
		instantiationOptions['path'] = this.options.phantomPath;
	}

	// Store the url that was requested for the current url
	this.targetUrl = null;

	// Store the HTTP status code for resources requested.
	this.responses = {};

	this.tabs = [];
	this.onTabCreated = noop;
	this.onTabClosed = noop;

	this.ready = prepare(this, instantiationOptions);
};

/**
 * Attaches a page to the Horseman instance.
 * @param {string} [url=about:blank] - URL to open.
 * @param {Page} [_page] - Page to attach. If null, a new Page will be created.
 * @emits Horseman#tabCreated
 */
Horseman.prototype.pageMaker = function(url, _page) {
	var self = this;
	url = url || 'about:blank';

	// .try runs synchronously
	var loaded;
	return HorsemanPromise.try(function getPage() {
			var page;
			if (_page) {
				var p = setupPage(_page);
				loaded = _page.loadedPromise();
				return p;
			} else {
				return HorsemanPromise.fromCallback(function(done) {
						return self.phantom.createPage(function(err, page) {
							if (page) {
								var p = setupPage(page).asCallback(done);
								loaded = page.loadedPromise();
								return p;
							}
							return done(err, page);
						});
					})
					.tap(function openPage(page) {
						return HorsemanPromise.fromCallback(function(done) {
							return page.open(url, done);
						});
					});
			}
		})
		.tap(function waitForLoadFinished() {
			return loaded;
		})
		.tap(function attachPage(page) {
			if (!_page || self.options.switchToNewTab) {
				self.page = page;
			}
			var tabNum = self.tabs.push(page) - 1;
			return self.onTabCreated(tabNum, page);
		})
		.bind(self);

	/**
	 * Needs to be called *BEFORE* page creation callback returns
	 * This is necessary to avoid having events before callbacks are attached
	 * @param page - Newly created page to decorate and attach to horseman
	 */
	function setupPage(page) {
		debug('page created');

		page.onPageCreated = function(newPage) {
			return self.ready = self.pageMaker(undefined, newPage)
				.tap(function() {
					page.onPageCreated2(newPage);
				});
		};
		page.onPageCreated2 = noop;

		page.onResourceReceived = function(response) {
			self.responses[response.url] = response.status;
		};

		page.onLoadFinished = loadFinishedSetup;

		page.onClosing = function() {
			var tabNum = self.tabs.indexOf(page);
			debug('closing tab', tabNum);
			self.tabs.splice(tabNum, 1);
			if (self.page === page) {
				// Switch to previous tab when current tab closes
				self.page = self.tabs[tabNum - 1];
			}
			self.onTabClosed(tabNum, page);
		};

		page.onTimeout = noop;

		// Create a Promise for when onLoadFinished callback is done
		page.loadedPromise = function() {
			return HorsemanPromise.fromCallback(function(done) {
				page.loadDone = function(err, res) {
					page.loadDone = undefined;
					return done(err, res);
				};
			});
		};

		// If verbose debug, add default error and consoleMessage handlers
		if (debugv.enabled) {
			page.onError = function(msg, trace) {
				var str = msg;
				trace.forEach(function(t) {
					var fun = t.function || '<anonymous>';
					str += '\n\t' + t.file + ': ' + t.line + ' in ' + fun;
				});
				return debugv('onError', str, self.id);
			};
			page.onConsoleMessage = function(msg, lineNum, sourceId) {
				var str = msg + ' line: ' + lineNum + ' in ' + sourceId;
				return debugv('onConsoleMessage', str, self.id);
			};
		}

		return HorsemanPromise.fromCallback(function(done) {
			return page.set(
				'settings.resourceTimeout',
				self.options.timeout,
				done
			);
		}).return(page);

		/**
		 * Do any javascript injection on the page
		 * TODO: Consolidate into one page.evaluate?
		 */
		function loadFinishedSetup(status) {
			var args = arguments;
			self.pageCnt++;
			debug('phantomjs onLoadFinished triggered', status, self.pageCnt);

			return self.ready = HorsemanPromise.try(function checkStatus() {
				if (status !== 'success') {
					var err = new Error('Failed to load url');
					return HorsemanPromise.reject(err);
				}
			})
			.then(function injectJQuery() {
				if (!self.options.injectJquery) {
					return;
				}

				return HorsemanPromise.fromCallback(function hasJQuery(done) {
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
						return page.injectJs(jQueryLocation, done);
					})
					.tap(function(successful) {
						if (!successful) {
							var err = new Error('jQuery injection failed');
							return HorsemanPromise.reject(err);
						}
						debug('injected jQuery');
					});
				});
			})
			.then(function injectBluebird() {
				var inject = self.options.injectBluebird;
				if (!inject) {
					return;
				}

				return HorsemanPromise.fromCallback(function hasPromise(done) {
					return page.evaluate(function hasPromise() {
						return (typeof window.Promise !== 'undefined');
					}, done);
				})
				.then(function(hasPromise) {
					if (hasPromise && inject !== 'bluebird') {
						debug('bluebird not injected - ' +
								'Promise already exists on page');
						return;
					}

					var bbLoc = 'bluebird/js/browser/bluebird' +
							(self.options.bluebirdDebug ? '' : '.min') + '.js';
					return HorsemanPromise.fromCallback(function(done) {
						return page.injectJs(require.resolve(bbLoc), done);
					})
					.tap(function(successful) {
						if (!successful) {
							var err = new Error('bluebird injection failed');
							return HorsemanPromise.reject(err);
						}
						debug('injected bluebird');
					});

				})
				.then(function configBluebird() {
					return HorsemanPromise.fromCallback(function(done) {
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
			.bind(self)
			.asCallback(page.loadDone);
		}
	}
};

//**************************************************//
// Actions
//**************************************************//
/**
 * Add an action to the Horseman (and HorsemanPromise) prototype.
 * @param {string} name - Name to access action with
 * @param {function} action - Code for the action.
 * this will be bound to the horseman instance.
 */
Horseman.registerAction = function registerAction(name, action) {
	if (typeof name === 'function') {
		// Work with just a named function
		action = name;
		name = action.name;
	}

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
};

/**
 * Attach all of the actions.
 */
Object.keys(actions).forEach(function attachAction(name) {
	Horseman.registerAction(name, actions[name]);
});

//**************************************************//
// Cleanup
//**************************************************//
Horseman.prototype.close = function() {
	debug('.close().');
	var self = this;
	return this.ready.finally(function() {
		var p;
		if (!self.closed && self.phantom) {
			p = HorsemanPromise.fromCallback(function(done) {
				return self.phantom.exit(done);
			});
		}
		//self.ready = HorsemanPromise.reject(new Error('phantom is closed'));
		self.closed = true;
		return p || HorsemanPromise.resolve();
	});
};
HorsemanPromise.prototype.close = function() {
	var self = this;
	return this
		.finally(function() {
			return this.close();
		}).finally(function() {
			return self;
		});
};

module.exports = Horseman;
module.exports.TimeoutError = HorsemanPromise.TimeoutError;
