var clone = require('clone');
var defaults = require('defaults');
var phantom = require("node-phantom-simple");
var path = require("path");
var debug = require('debug')('horseman');
var actions = require("./actions");
var Promise = require('bluebird');
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
	ignoreSSLErrors: true,
	loadImages: true,
	sslProtocol: "any", //sslv3, sslv2, tlsv1, any
	webSecurity: true,
	injectJquery: true
};

function prepare(horseman, instantiationOptions, options) {
	return new Promise(function(resolve, reject) {
		phantom.create(instantiationOptions, function(err, instance) {
			horseman.phantom = instance;
			if (err) reject(err);
			else {
				instance.createPage(function(err, page) {
					if (err) {
						throw err;
					} else {
						horseman.page = page;
						
						horseman.page.onLoadFinished = function() {
							horseman.waitingForNextPage = false;
							if (options.injectJquery) {
								var self = this;
								horseman.ready = horseman
									.evaluate(function() {
										return (typeof window.jQuery !== "undefined");
									})
									.then(function(hasJquery) {
										if (!hasJquery) {
											var jQueryLocation = path.join(__dirname, "../files/jquery-2.1.1.min.js");
											return new Promise( function( resolve, reject ){
												horseman.page.injectJs( jQueryLocation, function(){
													debug('injected jQuery');
													if ( horseman.page.onLoadFinished2 ){
														horseman.page.onLoadFinished2();
													}
													resolve();
												})
											});
											
										} else {
											debug("jQuery not injected - already exists on page");
											if ( horseman.page.onLoadFinished2 ){
												horseman.page.onLoadFinished2();
											}
											resolve();
										}
									})
							} else {
								if ( horseman.page.onLoadFinished2 ){
									horseman.page.onLoadFinished2();
								}
							}
						}
						resolve(page);
					}
				});
			};
		});
	})
}

var Horseman = function(options) {
	this.ready = false;
	DEFAULTS.port++;
	if (!(this instanceof Horseman)) return new Horseman(options);
	this.options = defaults(clone(options) || {}, DEFAULTS);

	var self = this;

	debug('.setup() creating phantom instance on %s',this.options.port);

	var phantomOptions = {
		'ignore-ssl-errors': this.options.ignoreSSLErrors,
		'load-images': this.options.loadImages,
		'ssl-protocol': this.options.sslProtocol,
		'web-security': this.options.webSecurity
	};

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

	this.ready = prepare(this, instantiationOptions, this.options);

};

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


/**
 * Attach all the actions.
 */
Object.keys(actions).forEach(function(name) {
    var action = actions[name];
    Horseman.prototype[name] = function() {
        var p = action.apply(this, arguments);
        return addActions.call(this, p);
    };
});
// Allow chaining off Promises
function addActions(p) {
    var self = this;
    if (p instanceof Promise) { // Not all actions return a Promise
        Object.keys(actions).forEach(function(name) {
            var action = actions[name];
            p[name] = function() {
                var args = arguments;
                var pt = p.then(function() {
                    return action.apply(self, args);
                });
                return addActions.call(self, pt);
            };
        });
    }
    return p;
}

module.exports = Horseman;
