'use strict';

var fs = require('fs');
var util = require('util');
var url = require('url');
var defaults = require('defaults');
var cookiesTxt = require('cookies.txt');
var dataUriToBuffer = require('data-uri-to-buffer');
var debug = require('debug')('horseman');
var debugv = require('debug')('horseman:verbose');
var HorsemanPromise = require('./HorsemanPromise');
var TimeoutError = HorsemanPromise.TimeoutError;


//**************************************************//
// Navigation
//**************************************************//

/**
 * Get or set the user agent for Phantom.
 * @param {string} [userAgent] - User agent to use.
 */
exports.userAgent = function(userAgent) {
	var self = this;
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			if (!userAgent) {
				self.page.get('settings', function(err, settings) {
					debug('.userAgent() get');
					if (err) { return reject(err); }
					return resolve(settings.userAgent);
				});
			} else {
				self.page.get('settings', function(err, settings) {
					if (err) { return reject(err); }
					settings.userAgent = userAgent;
					self.page.set('settings', settings, function(err) {
						if (err) { return reject(err); }
						debug('.userAgent() set', userAgent);
						return resolve();
					});
				});
			}
		});
	});
};

/**
 * Open a url in Phantom.
 * @param {string} url
 * @param {string | object} [method=GET] - HTTP method, or settings object
 * @param {string} [data]
 * @see {@link http://phantomjs.org/api/webpage/method/open.html|PhantomJS API}
 */
exports.open = function(url, method) {
	var args = Array.prototype.slice.call(arguments);
	var self = this;
	self.targetUrl = url;

	return this.ready.then(function() {
		method = method || 'GET';
		var meth = (typeof method === 'object') ? method.operation : method;
		meth = meth.toUpperCase();

		if (args.length >= 2) {
			debug('.open()', meth, url);
		} else {
			debug('.open()', url);
		}
		var loaded = self.page.loadedPromise();
		loaded.catch(function() {});
		return HorsemanPromise.fromCallback(function(done) {
				args.push(done);
				return self.page.open.apply(self.page, args);
			})
			.tap(function checkStatus(status) {
				if (status !== 'success') {
					var err = new Error('Failed to ' + meth + ' url: ' + url);
					return HorsemanPromise.reject(err);
				}
			})
			.tap(function waitFoLoadFinished() {
				// Make sure page injecting is done
				return loaded;
			});
	});
};

/**
 * Set headers sent to the remote server during an 'open'.
 * @param {Object[]} headers
 */
exports.headers = function(headers) {
	var self = this;

	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.headers()');
			self.page.set('customHeaders', headers, done);
		});
	});
};

/**
 * Go back a page.
 */
exports.back = function() {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.back()');
			self.page.goBack(done);
		});
	});
};

/**
 * Go forwards a page.
 */
exports.forward = function() {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.forward()');
			self.page.goForward(done);
		});
	});
};

/**
 * Use basic HTTP authentication when opening a page.
 * @param {string} user
 * @param {string} password
 */
exports.authentication = function(user, password) {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			self.page.get('settings', function(err, settings) {
				if (err) { return done(err); }
				debug('.authentiation() set');
				settings.userName = user;
				settings.password = password;
				self.page.set('settings', settings, done);
			});
		});
	});
};

/**
 * Get or set the size of the viewport.
 * @param {number} [width]
 * @param {number} [height]
 */
exports.viewport = function(width, height) {
	var self = this;
	if (!width) {
		debug('.viewport() get');
		return this.ready.then(function() {
			return self.__evaluate(function getViewport() {
				return {
					width: window.innerWidth,
					height: window.innerHeight
				};
			});
		});
	} else {
		debug('.viewport() set', width, height);
		return this.ready.then(function() {
			return HorsemanPromise.fromCallback(function(done) {
				var viewport = {
					width: width,
					height: height
				};
				self.page.set('viewportSize', viewport, done);
			});
		});
	}
};

/**
 * Set the zoom factor of the page.
 * @param {number} zoomFactor
 */
exports.zoom = function(zoomFactor) {
	var self = this;
	debug('.zoomFactor() set', zoomFactor);
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			self.page.set('zoomFactor', zoomFactor, done);
		});
	});
};

/**
 * Scroll to a position on the page.
 * @param {number} top
 * @param {number} left
 */
exports.scrollTo = function(top, left) {
	var self = this;

	var position = {
		top: top,
		left: left
	};
	debug('.scrollTo()', top, left);
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			self.page.set('scrollPosition', position, function(err) {
				if (err) { return reject(err); }
				return resolve();
			});
		});
	});
};

/**
 * Send Post data to a url.
 * @param {string} url
 * @param {string} postData
 */
exports.post = function(url, postData) {
	debug('.post()', url);
	return this.open(url, 'POST', postData);
};

/**
 * Send Put data to a url.
 * @param {string} url
 * @param {string} putData
 */
exports.put = function(url, putData) {
	debug('.put()', url);
	return this.open(url, 'PUT', putData);
};


/**
 * Reload the page.
 */
exports.reload = function() {
	debug('.reload()');
	return this.__evaluate(function reload() {
		document.location.reload(true);
	});
};

/**
 * Get or set the cookies for Phantom.
 * @param {object|object[]|string} arg - Cookie, array of cookies,
 * or cookies.txt file
 * @see {@link http://www.cookiecentral.com/faq/#3.5|cookies.txt format}
 */
exports.cookies = function(arg) {
	var self = this;
	return this.ready.then(function() {
		if (arg) {
			if (arg instanceof Array) { // replace all the cookies!
				return HorsemanPromise
					.fromCallback(function(done) {
						return self.phantom.clearCookies(done);
					})
					.tap(function() {
						debug('.cookies() reset');
					})
					.return(arg)
					.each(function(cookie) {
						return HorsemanPromise.fromCallback(function(done) {
							self.phantom.addCookie(cookie, done);
						});
					});
			}
			switch (typeof arg) {
				// adding one cookie
				case 'object':
					return HorsemanPromise
						.fromCallback(function(done) {
							return self.phantom.addCookie(arg, done);
						}).tap(function() {
							debug('.cookies() added');
						});
				// replace all cookies with file cookies
				case 'string':
					return HorsemanPromise
						.fromCallback(function(done) {
							return self.phantom.clearCookies(done);
						})
						.tap(function() {
							debug('.cookies() reset');
						})
						.then(function() {
							return HorsemanPromise.fromCallback(function(done) {
								return cookiesTxt.parse(arg, function(cookies) {
									return done(null, cookies);
								});
							});
						})
						.each(function(cookie) {
							return HorsemanPromise.fromCallback(function(done) {
								self.phantom.addCookie(cookie, done);
							});
						});
			}
		} else { // return cookies for this page
			return HorsemanPromise
				.fromCallback(function(done) {
					return self.page.get('cookies', done);
				})
				.tap(function() {
					debug('.cookies() returned');
				});
		}
	});
};

//**************************************************//
// Interaction
//**************************************************//

/**
 * Save a screenshot to disk.
 * @param {string} path
 */
exports.screenshot = function(path) {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.screenshot()', path);
			self.page.render(path, done);
		});
	});
};

/**
 * Click on a selector and fire a 'click event'.
 * @param {string} selector
 */
exports.click = function(selector) {
	var self = this;

	debug('.click()', selector);
	return self.__evaluate(function click(selector) {
		var element;
		var event;
		if (window.jQuery) {
			element = jQuery(selector);
			event = document.createEvent('MouseEvent');
			event.initEvent('click', true, true);
			element.get(0).dispatchEvent(event);
		} else {
			element = document.querySelector(selector);
			event = document.createEvent('MouseEvent');
			event.initEvent('click', true, true);
			element.dispatchEvent(event);
		}
	}, selector)
	.tap(function() { debug('.click() done'); });
};

/**
 * Get the bounding rectangle of a selector.
 * @param {string} selector
 */
exports.boundingRectangle = function(selector) {
	var self = this;
	return this.__evaluate(function boundingRectangle(selector) {
		if (window.jQuery) {
			return $(selector)[0].getBoundingClientRect();
		} else {
			var element = document.querySelector(selector);
			return element.getBoundingClientRect();
		}
	}, selector);
};

/**
 * Save a cropped screenshot to disk.
 * @param {strning|object} area
 * @param {string} path
 * @see window.getBoundingRectangle
 */
exports.crop = function(area, path) {
	var self = this;
	function doCrop(area) {
		return self.ready
			.then(function getZoomFactor() {
				return HorsemanPromise.fromCallback(function(done) {
					return self.page.get('zoomFactor', done);
				});
			}).then(function(zoomFactor) {
				var rect = {
					top: area.top * zoomFactor,
					left: area.left * zoomFactor,
					width: area.width * zoomFactor,
					height: area.height * zoomFactor
				};
				return self.ready
					.then(function getClipRect() {
						return HorsemanPromise.fromCallback(function(done) {
							return self.page.get('clipRect', done);
						});
					})
					.tap(function setClipRect(prevClipRect) {
						return HorsemanPromise.fromCallback(function(done) {
							return self.page.set('clipRect', rect, done);
						});
					})
					.tap(function screenShot() {
						return self.screenshot(path);
					});
			})
			.then(function resetClipRect(prevClipRect) {
				return HorsemanPromise.fromCallback(function(done) {
					return self.page.set('clipRect', prevClipRect, done);
				});
			});
	}
	if (typeof area === 'string') {
		return this
			.boundingRectangle(area)
			.then(doCrop);
	} else {
		return doCrop(area);
	}
};

/**
 * Take a base64 encoded cropped screenshot.
 * @param {string|object} area
 * @param {string} type - Type of image (e.g., PNG)
 * @see window.getBoundingRectangle
 */
exports.cropBase64 = function(area, type) {
	var self = this;
	function doCrop(area) {
		var b64;
		return self.ready
			.then(function getZoomFactor() {
				return HorsemanPromise.fromCallback(function(done) {
					return self.page.get('zoomFactor', done);
				});
			}).then(function(zoomFactor) {
				var rect = {
					top: area.top * zoomFactor,
					left: area.left * zoomFactor,
					width: area.width * zoomFactor,
					height: area.height * zoomFactor
				};
				return self.ready
					.then(function getClipRect() {
						return HorsemanPromise.fromCallback(function(done) {
							return self.page.get('clipRect', done);
						});
					})
					.tap(function setClipRect(prevClipRect) {
						return HorsemanPromise.fromCallback(function(done) {
							return self.page.set('clipRect', rect, done);
						});
					})
					.tap(function renderBase64() {
						b64 = self.screenshotBase64(type);
						return b64;
					});
			})
			.then(function resetClipRect(prevClipRect) {
				return HorsemanPromise.fromCallback(function(done) {
					return self.page.set('clipRect', prevClipRect, done);
				});
			})
			.then(function() {
				return b64;
			});
	}
	if (typeof area === 'string') {
		return this
		.boundingRectangle(area)
		.then(doCrop);
	} else {
		return doCrop(area);
	}
};

/**
 * Take a base64 encoded screenshot.
 * @param {string} type - Type of image (e.g., PNG)
 */
exports.screenshotBase64 = function(type) {
	if (['PNG', 'GIF', 'JPEG'].indexOf(type) == -1) {
		debug('.screenshotBase64() with type ' + type + ' not supported.');
		debug('type must be one of PNG, GIF, or JPEG');
		var err = new Error('screenshotBase64 type must be PNG, GIF, or JPEG.');
		return HorsemanPromise.reject(err);
	} else {
		var self = this;
		var result;
		return this.ready.then(function() {
			return HorsemanPromise.fromCallback(function(done) {
				debug('.screenshotBase64()', type);
				return self.page.renderBase64(type, done);
			});
		});
	}
};

/**
 * Save the current page as a pdf.
 * For more info - http://phantomjs.org/api/webpage/property/paper-size.html
 * @param {string} path - The name and location of where to store the pdf.
 * @param {object} [paperSize] - pdf's format, orientation, margin, and more.
 * @param {string} [paperSize.format] - Format of the pdf.
 * Supported formats are: 'A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid'.
 * Default is 'letter' cuz 'Murica.
 * @param {string} [paperSize.orientation] - Orientation of the pdf.
 * Must be 'portrait' or 'landscape'.
 * Default is 'portrait'.
 * @param {string} [paperSize.margin] - Margin of the pdf.
 * Default is '0.5in'.
 */
exports.pdf = function(path, paperSize) {
	var self = this;
	debug('.pdf()', path, paperSize);
	if (!paperSize) {
		paperSize = {
			format: 'Letter',
			orientation: 'portrait',
			margin: '0.5in'
		};
	}
	return this.ready
		.then(function setPaperSize() {
			return HorsemanPromise.fromCallback(function(done) {
				return self.page.set('paperSize', paperSize, done);
			});
		})
		.then(function render() {
			return HorsemanPromise.fromCallback(function(done) {
				return self.page.render(path, {
					format: 'pdf',
					quality: '100'
				}, done);
			});
		})
		.tap(function() {
			debug('.pdf() complete');
		});
};

/**
 * Injects javascript from a file into the page.
 * @param {string} file - file containing javascript to inject onto the page.
 */
exports.injectJs = function(file) {
	var self = this;
	return this.ready
		.then(function() {
			return HorsemanPromise.fromCallback(function(done) {
				debug('.injectJs()', file);
				return self.page.injectJs(file, done);
			});
		})
		.tap(function(successful) {
			if (!successful) {
				var err = new Error('failed to inject ' + file);
				return HorsemanPromise.reject(err);
			}
		});
};

/**
 * Includes javascript script from a url on the page.
 * @param {string} url - The url to a javascript file to include o the page.
 */
exports.includeJs = function(url) {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.includeJs()', url);
			return self.page.includeJs(url, done);
		});
	});
};

/**
 * Select a value in an html select element.
 * @param {string} selector - The identifier for the select element.
 * @param {string} value - The value to select.
 */
exports.select = function(selector, value) {
	debug('.select()', selector, value);
	return this.value(selector, value);
};


/**
 * Fire a key event.
 * @param {string} [type=keypress] - The type of key event.
 * @param {string} [key=null] - The key to use for the event.
 * @param {number} [modifier=0] - The keyboard modifier to use.
 * @see {@link http://phantomjs.org/api/webpage/method/send-event.html}
 */
exports.keyboardEvent = function(type, key, modifier) {
	type = (typeof type === 'undefined') ? 'keypress' : type;
	key = (typeof key === 'undefined') ? null : key;
	modifier = (typeof modifier === 'undefined') ? 0 : modifier;

	var self = this;
	return self.ready
		.then(function() {
			return HorsemanPromise.fromCallback(function(done) {
				self.page.sendEvent(type, key, null, null, modifier, done);
			});
		})
		.tap(function() {
			debug('.keyboardEvent()', type, key, modifier);
		});
};

/**
 * Fire a mouse event.
 * @param {string} [type=click] - The type of mouse event.
 * @param {number} [x=null] - The x location to fire the event at.
 * @param {number} [y=null] - The y location to fire the event at.
 * @param {string} [button=left] - The mouse button to use.
 */
exports.mouseEvent = function(type, x, y, button) {
	type = (typeof type === 'undefined') ? 'click' : type;
	x = (typeof x === 'undefined') ? null : x;
	y = (typeof y === 'undefined') ? null : y;
	button = (typeof button === 'undefined') ? 'left' : button;

	var self = this;
	return self.ready
		.then(function() {
			return HorsemanPromise.fromCallback(function(done) {
				self.page.sendEvent(type, x, y, button, done);
			});
		})
		.tap(function() {
			debug('.mouseEvent()', type, x, y, button);
		});
};



/**
 * Simulate a keypress on a selector
 * @param {string} selector - The selctor to type into.
 * @param {string} text - The text to type.
 * @param {object} options - Lets you send keys like control & shift
 */
exports.type = function(selector, text, options) {
	var DEFAULTS = {
		reset: false, // clear the field first
		eventType: 'keypress', // keypress, keyup, keydown
		keepFocus: false // if true, don't blur afterwards
	};

	function computeModifier(modifierString) {
		var modifiers = {
			'ctrl': 0x04000000,
			'shift': 0x02000000,
			'alt': 0x08000000,
			'meta': 0x10000000,
			'keypad': 0x20000000
		};
		var modifier = 0;
		var checkKey = function(key) {
			if (key in modifiers) { return; }
			debug(key + 'is not a supported key modifier');
		};
		if (!modifierString) { return modifier; }
		var keys = modifierString.split('+');
		keys.forEach(checkKey);
		return keys.reduce(function(acc, key) {
			return acc | modifiers[key];
		}, modifier);
	}

	var modifiers = computeModifier(options && options.modifiers);
	var opts = defaults(options || {}, DEFAULTS);

	var self = this;

	debug('.type()', selector, text, options);
	return self
		.__evaluate(function focus(selector) {
			if (window.jQuery) {
				jQuery(selector).focus();
			} else {
				document.querySelector(selector).focus();
			}
		}, selector)
		.return(text)
		.call('split', '')
		.each(function sendKey(key) {
			return self
				.keyboardEvent(opts.eventType, key, null, null, modifiers);
		});
};

/**
 * Clear an input field.
 * @param {string} selector - The selctor to clear.
 */
exports.clear = function(selector) {
	debug('.clear()', selector);
	return this.value(selector, '');
};


/**
 * Upload a file to the page.
 * @param {string} selector - The selctor to to use the upload the file.
 * @param {string} file - The file to upload.
 */
exports.upload = function(selector, path) {
	var self = this;
	return this.ready
		.then(function() {
			return HorsemanPromise.fromCallback(function(done) {
				return fs.stat(path, done);
			});
		})
		.call('isFile')
		.then(function(isFile) {
			if (isFile) {
				return HorsemanPromise.fromCallback(function(done) {
					return self.page.uploadFile(selector, path, done);
				});
			} else {
				debug('.upload() file path not valid.');
				var err = new Error('File path for upload is not valid.');
				return HorsemanPromise.reject(err);
			}
		})
		.tap(function() {
			debug('.upload()', path, selector);
		});
};

/**
 * Dowload a URL.
 * @param {string} url - URL to download.
 * @param {string} [path] - File to write download to.
 * @param {boolean} [binary=false] - Whether the download is a binary file.
 * @param {string} [method=GET] - HTTP method to use.
 * @param {string} [data] - Request data to send.
 */
// TODO: Should horseman have a general AJAX action?
exports.download = function(url, path, binary, method, data) {
	var args = Array.prototype.slice.call(arguments);
	method = method && method.toUpperCase() || 'GET';
	debug.apply(debug, ['.download() start'].concat(args));
	return this
		.evaluate(function download(url, binary, method, data, v, done) {
			var xhr = new XMLHttpRequest();
			xhr.open(method, url,  true);
			xhr.responseType = binary ? 'blob' : 'text';
			xhr.setRequestHeader('Accept', '*/*, image/*');
			xhr.addEventListener('load', function downloaded() {
				if (!(xhr.status >= 200 && xhr.status < 300)) {
					return done(new Error(xhr.response));
				}
				return done(null, xhr.response);
			});
			if (v) {
				xhr.addEventListener('progress', function(e) {
					console.log('dowload progess: ' + 100 * e.loaded / e.total);
				});
			}
			xhr.addEventListener('error', function(evt) {
				setTimeout(function() {
					done(new Error('xhr error'));
				}, 0);
			});
			xhr.send(data);
		}, url, binary, method, data, debugv.enabled)
		.tap(function writeFile(buffer) {
			if (path) {
				return HorsemanPromise.fromCallback(function(done) {
					return fs.writeFile(path, buffer, done);
				});
			}
		})
		.tap(function() {
			debug.apply(debug, ['.download() finish'].concat(args));
		});
};

/**
 * Run javascript on the page.
 * @param {function} fn - The function to run.
 * @param {...*} [arguments] - The optional arguments to pass to 'fn'.
 */
exports.manipulate = function(/*fn, arg1, arg2, etc*/) {
	this.__evaluate.apply(this, arguments);
	return this;
};


/**
 * Execute a function without breaking the api chain.
 * @param fn The function to run. Must call 'done()' when complete.
 */
exports.do = function(fn) {
	debug('.do()', fn.name || '<anonymous>');
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			fn(resolve);
		});
	});
};

//**************************************************//
// Information
//**************************************************//

/**
 * Run a javascript function on the current page
 * and optionally return the results.
 * @param {function} fn
 * @param {...*} [arguments] - The optional arguments to pass to 'fn'.
 */
exports.evaluate = function(fn) {
	var args =  Array.prototype.slice.call(arguments, 1);
	var self = this;
	var hasCb = args.length < fn.length; // Whether fn takes a callback
	var fname = fn.name || '<anonymous>';

	debug.apply(debug, ['.evaluate()', fname].concat(args));
	return this.ready.then(function() {
		// Handle this.page changing
		var page = self.page;
		var evaluate = HorsemanPromise.promisify(page.evaluate).bind(page);

		// TODO: Move evaluate wrapper to a client script?
		// Make dumy error to make evaluate rejections more debuggable
		var stack = HorsemanPromise.reject(new Error('See next line'));
		var res = evaluate(function evaluate(fnstr, hasCb, args) {
				__horseman.cbargs = undefined;
				var done = function done(err, res) {
					if (__horseman.cbargs) { return; }
					var iserr = err instanceof Error;
					if (iserr) {
						var keys = Object.getOwnPropertyNames(err);
						err = keys.reduce(function copyErr(obj, key) {
							obj[key] = err[key];
							return obj;
						}, {});
					}
					var isblob = res instanceof Blob;
					if (isblob) {
						var reader = new FileReader();
						reader.onload = function converted() {
							res = reader.result;
							ddone();
						};
						reader.onerror = function() {
							setTimeout(function() {
								err = err || new Error('blob reader error');
								ddone();
							}, 0);
						};
						reader.readAsDataURL(res);
					} else {
						ddone();
					}
					function ddone() {
						__horseman.cbargs = {
							err: err,
							iserr: iserr,
							res: res,
							isblob: isblob
						};
					}
				};
				try {
					var fn;
					eval('fn = ' + fnstr);

					if (hasCb) {
						// Call fn asynchronously
						setTimeout(function() {
							try {
								return fn.apply(this, args.concat(done));
							} catch (err) {
								return done(err);
							}
						}, 0);
						return 'c';
					} else {
						var p;
						// Call fn synchronously
						p = fn.apply(this, args);

						if (p && typeof p.then === 'function') {
							// fn returned a Promise
							p.then(function onResolve(res) {
								return done(null, res);
							}, function onReject(err) {
								return done(err);
							});
							return 'p';
						} else {
							done(null, p);
						}
					}
				} catch (err) {
					done(err);
				}
				return 's';
			}, fn.toString(), hasCb, args)
			.then(function waitForCb(type) {
				if (type !== 's') {
					debugv('.evaluate() waiting for callback', fname, type,
							self.id);
					return waitForPage.call(self, page, function waitForCb() {
						return !!__horseman.cbargs;
					}, true);
				}
				debugv('.evaluate() finished synchronously', fname, type,
						self.id);
			})
			.then(function handleCb() {
				return evaluate(function handleCb() {
					return __horseman.cbargs;
				});
			})
			.then(function handleErrback(args) {
				args = args || {};
				return stack.catch(function fixErr(err) {
					// TODO: Phantom 2 errors are different than 1
					if (args.err) {
						// Make long/normal stack traces work
						if (args.iserr) {
							args.err.name = args.err.name || 'Error';

							if (!args.err.stack) {
								args.err.stack = args.err.toString();
							}
							args.err.stack.replace(/\n*$/g, '\n');
							var stack = err.stack.split('\n').slice(1);
							// Append Node stack to Phantom stack
							args.err.stack += stack.join('\n');
						}
						if (args.err.stack) {
							args.err.toString = function() {
								return this.name + ': ' + this.message;
							};
						}
						return HorsemanPromise.reject(args.err);
					}
					if (args.isblob) {
						return dataUriToBuffer(args.res);
					}
					return args.res;
				});
			});
		stack.catch(function() {});
		return res;
	});
};

/**
 * Syncronous only version of evaluate, handles throws.
 * Should probably only be used internally.
 * @param {function} fn
 * @param {...*} [arguments]
 */
exports.__evaluate = function() {
	var args = Array.prototype.concat.apply([this.page], arguments);
	return evaluatePage.apply(this, args);
};
/**
 * Evaluates a function on the given page.
 * @this Horseman
 * @param {Page} page
 * @param {function} fn
 * @param {...*} [arguments]
 */
function evaluatePage(page, fn) {
	var args =  Array.prototype.slice.call(arguments, 2);
	return this.ready.then(function() {
		var stack;
		page = page || this.page;
		var res = HorsemanPromise.fromCallback(function(done) {
				// Wrap fn to be able to catch exceptions and reject Promise
				stack = HorsemanPromise.reject(new Error('See next line'));
				return page.evaluate(function evaluatePage(fnstr, args) {
					try {
						var fn;
						eval('fn = ' + fnstr);

						var res = fn.apply(this, args); // Call fn with args
						return { res: res };
					} catch (err) {
						return { err: err, iserr: err instanceof Error };
					}
				}, fn.toString(), args, done);
			})
			.then(function handleErrback(args) {
				return stack.catch(function(err) {
					if (args.err) {
						if (args.iserr) {
							var stack = err.stack.split('\n').slice(1);
							// Append Node stack to Phantom stack
							args.err.stack += '\n' + stack.join('\n');
						}
						return HorsemanPromise.reject(args.err);
					}
					return args.res;
				});
			});
		stack.catch(function() {});
		return res;
	});
}


/**
 * Get the url of the current page.
 */
exports.url = function() {
	debug('.url()');
	return this.__evaluate(function url() {
		return document.location.href;
	});
};

/**
 * Count the number of occurances of 'selector' on the page.
 * @param {string} selector
 */
exports.count = function(selector) {
	debug('.count()', selector);
	return this.__evaluate(function count(selector) {
		var matches = (window.jQuery) ?
				jQuery(selector) : document.querySelectorAll(selector);
		return matches.length;
	}, selector);
};

/**
 * Get the title of the current page.
 */
exports.title = function() {
	debug('.title()');
	return this.__evaluate(function title() {
		return document.title;
	});
};


/**
 * Determine if the selector exists, at least once, on the page.
 * @param {string} [selector]
 */
exports.exists = function(selector) {
	debug('.exists()', selector);
	return this.count(selector).then(function(count) {
		return count > 0;
	});
};

/**
 * Get the HTML for the page, or optionally for a selector.
 * @param {string} [selector]
 * @param {string} [file] - File to which to write the HTML.
 */
exports.html = function(selector, file) {
	debug('.html()', selector);
	return this
		.__evaluate(function html(selector) {
			if (selector) {
				return (window.jQuery) ?
						jQuery(selector).html() :
						document.querySelector(selector).innerHTML;
			} else {
				return (window.jQuery) ?
						jQuery('html').html() :
						document.documentElement.innerHTML;
			}
		}, selector)
		.tap(function writeHtmlToFile(html) {
			if (file) {
				return HorsemanPromise.fromCallback(function(done) {
					return fs.writeFile(file, html, done);
				});
			}
		});
};

/**
 * Get the text for the body of the page, or optionally for a selector.
 * @param {string} [selector]
 */
exports.text = function(selector) {
	debug('.text()', selector);
	return this.__evaluate(function text(selector) {
		if (selector) {
			return (window.jQuery) ?
					jQuery(selector).text() :
					document.querySelector(selector).textContent;
		} else {
			return (window.jQuery) ?
					jQuery('body').text() :
					document.querySelector('body').textContent;
		}
	}, selector);
};

/**
 * Get the plain text for the body of the page.
 */
exports.plainText = function() {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise
			.fromCallback(function(done) {
				return self.page.get('plainText', done);
			});
	});
};

/**
 * Get the value of an attribute for a selector.
 * @param {string} selector
 * @param {string} attr
 */
exports.attribute = function(selector, attr) {
	debug('.attribute()', selector, attr);
	return this.__evaluate(function attribute(selector, attr) {
		return (window.jQuery) ?
				jQuery(selector).attr(attr) :
				document.querySelector(selector).getAttribute(attr);
	}, selector, attr);
};

/**
 * Get the value of an css property of a selector.
 * @param {string} selector
 * @param {string} prop
 */
exports.cssProperty = function(selector, prop) {
	debug('.cssProperty()', selector, prop);
	return this.__evaluate(function cssProperty(selector, prop) {
		return (window.jQuery) ?
				jQuery(selector).css(prop) :
				window.getComputedStyle(document.querySelector(selector))[prop];
	}, selector, prop);
};

/**
 * Get the width of an element.
 * @param {string} selector
 */
exports.width = function(selector) {
	debug('.width()', selector);
	return this.__evaluate(function width(selector) {
		return (window.jQuery) ?
				jQuery(selector).width() :
				document.querySelector(selector).offsetWidth;
	}, selector);
};

/**
 * Get the height of an element.
 * @param {string} selector
 */
exports.height = function(selector) {
	debug('.height()', selector);
	return this.__evaluate(function height(selector) {
		return (window.jQuery) ?
				jQuery(selector).height() :
				document.querySelector(selector).offsetHeight;
	}, selector);
};

/**
 * Get or set the value of an element.
 * @param {string} selector - The selector to find or set the value of.
 * @param {string} [value] - The value to set the selector to.
 */
exports.value = function(selector, value) {
	debug('.value()', selector, value);
	var self = this;
	if (typeof value === 'undefined') { // get the value of an element
		return self
			.__evaluate(function valueGet(selector) {
				return (window.jQuery) ?
						jQuery(selector).val() :
						document.querySelector(selector).value;
			}, selector)
			.then(function(val) {
				if (val === null) {
					return this
						.exists(selector)
						.then(function(exists) {
							return (exists) ? '' : val;
						});
				} else {
					return val;
				}

			});

	} else { // set the value of an element
		return self.__evaluate(function valueSet(selector, value) {
			if (window.jQuery) {
				jQuery(selector).val(value).change();
			} else {
				var element = document.querySelector(selector);
				var event = document.createEvent('HTMLEvents');
				element.value = value;
				event.initEvent('change', true, true);
				element.dispatchEvent(event);
			}
		}, selector, value);
	}
};

/**
 * Determines if an element is visible.
 * @param {string} selector - The selector to find the visibility of.
 */
exports.visible = function(selector) {
	debug('.visible()', selector);
	return this
		.__evaluate(function visible(selector) {
			if (window.jQuery) {
				return jQuery(selector).is(':visible');
			} else {
				var elem = document.querySelector(selector);
				return elem && (elem.offsetWidth > 0 && elem.offsetHeight > 0);
			}
		}, selector)
		.then(function(vis) {
			return vis || false;
		});
};

/**
 * Log the output from either a previous chain method,
 * or a string the user passed in.
 * @param output
 */
exports.log = function(output) {
	if (arguments.length === 0) {
		output = this.lastVal;
	}

	return this.ready.then(function() {
		console.log(output);
		return this.lastVal;
	});
};

//**************************************************//
// Tabs
//**************************************************//

exports.tabCount = function() {
	var self = this;
	return this.ready.then(function() {
		return self.tabs.length;
	});
};

/**
 * Switch to another of the open tabs
 * @param {integer} tabNumber - The number of the tab to switch to (from 0)
 */
exports.switchToTab = function(tabNumber) {
	return this.ready.then(function() {
		this.page = this.tabs[tabNumber];
	});
};

/**
 * Open URL in a new tab
 * @param url - the URL to open in the newly created tab
 */
exports.openTab = function(url) {
	var self = this;
	self.targetUrl = url;
	return this.ready.then(function() {
		return self.pageMaker(url);
	});
};

/**
 * Close a tab and release its resources.
 * @param {integer} tabNumber - The number of the tab to close.
 */
exports.closeTab = function(tabNumber) {
	var self = this;
	debug('.closeTab()', tabNumber);
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			return self.tabs[tabNumber].close(done);
		});
	});
};

//**************************************************//
// Frames
//**************************************************//

/**
 * Get the name of the current frame.
 */
exports.frameName = function() {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.frameName()');
			return self.page.get('frameName', done);
		});
	});
};

/**
 * Get the count of frames inside the current frame.
 */
exports.frameCount = function() {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.frameCount()');
			return self.page.get('framesCount', done);
		});
	});
};

/**
 * Get the names of the frames inside the current frame.
 */
exports.frameNames = function() {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.frameNames()');
			return self.page.get('framesName', done);
		});
	});
};

/**
 * Switch to the focused frame.
 */
exports.switchToFocusedFrame = function() {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.switchToFocusedFrame()');
			return self.page.switchToFocusedFrame(done);
		});
	});
};

/**
 * Switch to a frame inside the current frame.
 * @param {string|integer} nameOrPosition - Name or position of frame
 * to switch to
 */
exports.switchToFrame = function(nameOrPosition) {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.switchToFrame()', nameOrPosition);
			return self.page.switchToFrame(nameOrPosition, done);
		});
	});
};
/**
 * Switch to a child frame.
 * @deprecated Use switchToFrame instead.
 * @param {string|integer} nameOrPosition - Name or position of frame
 * to switch to
 */
exports.switchToChildFrame = util.deprecate(function(nameOrPosition) {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.switchToChildFrame()', nameOrPosition);
			return self.page.switchToChildFrame(nameOrPosition, done);
		});
	});
}, 'Horseman#switchToChildFrame: Use Horseman#switchToFrame instead');

/**
 * Switch to the main frame.
 */
exports.switchToMainFrame = function() {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.switchToMainFrame()');
			return self.page.switchToMainFrame(done);
		});
	});
};

/**
 * Switch to the parent frame of the current frame.
 */
exports.switchToParentFrame = function() {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.switchToParentFrame()');
			return self.page.switchToParentFrame(done);
		});
	});
};

/**
 * Get the HTTP status of the last opened page.
 */
exports.status = function() {
	var self = this;
	return this.ready.then(function() {
		var status = self.responses[ self.targetUrl ];

		// If the open was for 'http://www.google.com',
		// the results may be stored in 'http://www.google.com/'
		if (typeof status === 'undefined') {
			status = self.responses[ self.targetUrl + '/'];
		}
		return status;
	});
};

//**************************************************//
// Callbacks
//**************************************************//
/**
 * Handles page events.
 * @param {String} eventType
 * @param {Function} callback
 *
 * eventType can be one of:
 *  initialized - callback()
 *  loadStarted - callback()
 *  loadFinished - callback(status)
 *  tabCreated - callback(tabNum, tab)
 *  tabClosed - callback(tabNum, tab)
 *  urlChanged - callback(targetUrl)
 *  navigationRequested - callback(url, type, willNavigate, main)
 *  resourceRequested - callback(requestData, networkRequest)
 *  resourceReceived - callback(response)
 *  pageCreated - callback(newPage)
 *  consoleMessage(msg, lineNum, sourceId)
 *  alert - callback(msg)
 *  confirm - callback(msg)
 *  prompt - callback(msg, defaultVal)
 *  filePicker - callback(oldFile)
 *  error - callback(msg, trace);
 *  timeout - callback(type)
 */
exports.on = function(eventType, callback) {
	var self = this;
	return this.ready.then(function() {
		switch (eventType) {
			/**
			 * Horseman events
			 */
			case 'timeout':
				self.page.onTimeout = callback;
				break;
			case 'tabCreated':
				self.onTabCreated = callback;
				break;
			case 'tabClosed':
				self.onTabClosed = callback;
				break;

			/**
			 * PhantomJS events
			 */
			// Callback horseman needs to mess with
			case 'resourceTimeout':
				self.page.onResouceTimeout = function(request) {
					callback.apply(this, arguments);
					// A resourceTimeout is a timeout
					setTimeout(function() {
						self.page.onTimeout('resourceTimneout', request);
					}, 0);
				};
				break;
			case 'urlChanged':
				self.page.onUrlChanged = function(targetUrl) {
					self.targetUrl = targetUrl;
					return callback.apply(this, arguments);
				};
				break;
			case 'resourceReceived':
				self.page.onResourceReceived = function(response) {
					self.responses[response.url] = response.status;
					return callback.apply(this, arguments);
				};
				break;
			case 'pageCreated':
				self.page.onPageCreated2 = callback;
				break;
			case 'loadFinished':
				self.page.onLoadFinished2 = callback;
				break;
			// Others
			default:
				var pageEvent = 'on' +
						eventType.charAt(0).toUpperCase() + eventType.slice(1);
				self.page[pageEvent] = callback;
		}

		debug('.on() ' + eventType + ' set.');
	});
};
/**
 * Handle page events inside PhantomJS
 * Phantom receives callback return value with .at but not with .on
 * @see on
 */
exports.at = function(eventType, callback) {
	return this.ready.then(function() {
		var pageEvent = 'on' +
				eventType.charAt(0).toUpperCase() + eventType.slice(1);

		this.page.setFn(pageEvent, callback);

		debug('.at() ' + eventType + ' set.');
	});
};

//**************************************************//
// Waiting
//**************************************************//

/**
 * Wait for a specified period of time
 * @param {number} miliseconds - Approximate time to wait, in milliseconds.
 */
exports.wait = function(milliseconds) {
	debug('.wait()', milliseconds);
	return this.ready.then(function() {
		return HorsemanPromise.delay(milliseconds);
	});
};

/**
 * Wait for a page load to occur
 * @throws Horseman.TimeoutError
 * @emits Horseman#timeout
 */
exports.waitForNextPage = function() {
	debug('.waitForNextPage()');
	var self = this;
	var startCnt = self.lastActionPageCnt;
	return this.ready.then(function() {
		var start = Date.now();
		return new HorsemanPromise(function(resolve, reject) {
				var waiting = setInterval(function() {
					if (self.pageCnt > startCnt) {
						debug('.waitForNextPage() completed successfully');
						clearInterval(waiting);
						resolve();
					} else {
						var diff = Date.now() - start;
						if (diff > self.options.timeout) {
							clearInterval(waiting);
							debug('.waitForNextPage() timed out');
							if (typeof self.page.onTimeout === 'function') {
								self.page.onTimeout('waitForNextPage');
							}
							reject(new TimeoutError(
									'timeout duing .waitForNextPage() after ' +
										diff + ' ms'));
						}
					}
				}, self.options.interval);
			});
	});
};

/**
 * Wait for a selector to be present on the current page
 * @param {string} - The selector on which to wait.
 * @throws Horseman.TimeoutError
 * @emits Horseman#timeout
 */
exports.waitForSelector = function(selector) {
	debug('.waitForSelector()', selector);
	var elementPresent = function elementPresent(selector) {
		var els = window.jQuery ?
				jQuery(selector) : document.querySelectorAll(selector);
		return els.length > 0;
	};
	return this.waitFor(elementPresent, selector, true).then(function() {
		debug('.waitForSelector() complete');
	});
};

/**
 * Waits for a function to evaluate to a given value in browser
 * @param {function} fn
 * @param {...*} [arguments]
 * @param {*} value
 * @throws Horseman.TimeoutError
 * @emits Horseman#timeout
 */
exports.waitFor = function() {
	var args = Array.prototype.concat.apply([undefined], arguments);
	return waitForPage.apply(this, args);
};
/**
 * Waits for a function to evaluate to a given value on the given page
 * @param {Page | undefined} page
 * @param {function} fn
 * @param {...*} [arguments]
 * @param {*} value
 * @emits Horseman#TimeoutError
 */
function waitForPage(page, fn) {
	var self = this;
	var args = Array.prototype.slice.call(arguments);
	var value = args.pop();
	var fname = fn.name || '<anonymous>';

	debug.apply(debug, ['.waitFor()', fname].concat(args.slice(2)));
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			var start = Date.now();
			var checkInterval = setInterval(function waitForCheck() {
				var _page = page || self.page;
				var diff = Date.now() - start;
				if (diff > self.options.timeout) {
					clearInterval(checkInterval);
					debug('.waitFor() timed out');
					if (typeof _page.onTimeout === 'function') {
						_page.onTimeout('waitFor');
					}
					reject(new TimeoutError(
							'timeout during .waitFor() after ' + diff + ' ms'));
				} else {
					return evaluatePage.apply(self, args)
						.tap(function(res) {
							debugv('.waitFor() iteration',
									fname,
									res,
									diff,
									self.id
							);
						})
						.then(function(res) {
							if (res === value) {
								debug('.waitFor() completed successfully');
								clearInterval(checkInterval);
								resolve();
							}
						})
						.catch(function(err) {
							clearInterval(checkInterval);
							reject(err);
						});
				}
			}, self.options.interval);
		});
	});
}

//**************************************************//
// Configuration
//**************************************************//

/**
 * Change the proxy settings.
 * @param {string} ip - IP of proxy, or a URI (e.g. proto://user:pass@ip:port)
 * @param {integer} [port=80] - Port of proxy, override URI
 * @param {string} [type=http] - Type of proxy, overrides URI
 * @param {string} [user] - Proxy auth username, overrides URI
 * @param {string} [pass] - Proxy auth password, overrides URI
 */
exports.setProxy = function(ip, port, type, user, pass) {
	var self = this;
	return this.ready.then(function() {
		if (ip) {
			// Handle URI (e.g. "protocol://user:pass@ip:port")
			var parsed = url.parse(ip);
			if (!parsed.slashes) { // No protocol was supplied
				parsed = url.parse('http://' + ip);
			}
			ip = parsed.hostname;
			port = port || parseInt(parsed.port) || 80;
			type = type || parsed.protocol.replace(/:$/, '');
			if (parsed.auth) {
				var auth = parsed.auth.split(':');
				user = user || auth[0];
				pass = pass || auth[1];
			}
			user = user || '';
			pass = pass || '';
		}

		debug('setProxy', ip, port, type, user, pass);
		return HorsemanPromise.fromCallback(function(done) {
			return self.phantom.setProxy(ip, port, type, user, pass, done);
		});
	});
};
