var fs = require("fs");
var defaults = require('defaults');
var debug = require('debug')('horseman');
var HorsemanPromise = require('./HorsemanPromise');
var TimeoutError = HorsemanPromise.TimeoutError;


//**************************************************//
// Navigation
//**************************************************//
exports.userAgent = function(userAgent) {
	var self = this;


	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {

			if (!userAgent) {
				self.page.get('settings', function(err, settings) {
					debug('.userAgent() get');
					if (err) reject(err);
					else resolve(settings.userAgent);
				});
			} else {

				self.page.get('settings', function(err, settings) {
					if (err) reject(err);
					else {
						settings.userAgent = userAgent;
						self.page.set('settings', settings, function(err) {

							if (err) reject(err);
							debug('.userAgent() set', userAgent);
							resolve();
						});
					}
				});
			}
		});
	});
};

/**
 * Open a url in Phantom
 * @param {string} url
 */
exports.open = function(url) {
	var self = this;
	debug('.open()', url);
	self.targetUrl = url;
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			self.page.open(url, function(err, status) {
				debug('.open: ' + url + ' - status: ' + status);
				if (err) {
					reject(err);
				} else if (status === 'fail') {
					reject(new Error('Failed to open url: ' + url));
				} else {
					resolve(status);
				}
			});
		});
	})
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

/*
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

/*
 * Use basic HTTP authentication when opening a page.
 * @param {string} user
 * @param {string} password
 */
exports.authentication = function(user, password) {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			self.page.get('settings', function(err, settings) {
				if (err) return done(err);
				debug('.authentiation() set');
				settings.userName = user;
				settings.password = password;
				self.page.set('settings', settings, done);
			});
		});
	});
};

/*
 * Get or set the size of the viewport.
 * @param {number} [width]
 * @param {number} [height]
 */
exports.viewport = function(width, height) {
	var self = this;
	if (!width) {
		debug('.viewport() get');
		return this.ready.then(function() {
			return self.__evaluate(function() {
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

/*
 * Set the zoom factor of the page
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

/*
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
				if (err) reject(err);
				else resolve();
			});
		});
	});
};

/*
 * Send Post data to a url
 * @param {string} url
 * @param {string} postData
 */
exports.post = function(url, postData) {
	debug('.post()', url);
	var self = this;
	self.targetUrl = url;
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			self.page.open(url, 'POST', postData, function(err, status) {
				if (err) reject(err);
				else {
					debug('.post: ' + url + ' - status: ' + status);
					resolve(status);
				}
			});
		});
	});
};


/*
 * Reload the page
 */
exports.reload = function() {
	debug('.reload()');
	return this.__evaluate(function() {
		document.location.reload(true);
	});
};

exports.cookies = function(arg) {
	var self = this;
	if (arg) {
		if (arg instanceof Array) { //replace all the cookies!
			return this.ready.then(function() {
				return HorsemanPromise
					.fromCallback(function(done) {
						self.phantom.clearCookies(done);
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
			});
		} else if (typeof arg === "object") { //adding one cookie
			return this.ready.then(function() {
				return new HorsemanPromise(function(resolve, reject) {
					self.phantom.addCookie(arg, function(err) {
						if (err) reject(err);
						else {
							debug('.cookies() added');
							resolve();
						}

					});
				});
			});

		}
	} else { // return cookies for this page
		return this.ready.then(function() {
			return new HorsemanPromise(function(resolve, reject) {
				self.page.get('cookies', function(err, result) {
					if (err) reject(err);
					else {
						debug('.cookies() returned');
						resolve(result);
					}
				});
			});
		});
	}
};

//**************************************************//
// Interaction
//**************************************************//

/**
 * Save a screenshot to disk
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
 * Click on a selector and fire a 'click event'
 * @param {string} selector
 */
exports.click = function(selector) {
	var self = this;

	debug('.click()', selector);
	return self.__evaluate(function(selector) {
		var element;
		var event;
		if (window.jQuery) {
			element = jQuery(selector);
			if (element.length) {
				event = document.createEvent('MouseEvent');
				event.initEvent('click', true, true);
				element.get(0).dispatchEvent(event);
			}
		} else {
			element = document.querySelector(selector);
			event = document.createEvent('MouseEvent');
			event.initEvent('click', true, true);
			element.dispatchEvent(event);
		}
	}, selector)
	.tap(function() { debug('.click() done'); });
};

exports.boundingRectangle = function(selector) {
	var self = this;
	return this.__evaluate(function(selector) {
		if (window.jQuery) {
			return $(selector)[0].getBoundingClientRect();
		} else {
			var element = document.querySelector(selector);
			return element.getBoundingClientRect();
		}
	}, selector);
};

exports.crop = function(area, path) {
	var self = this;
	function doCrop(area) {
		var rect = {
			top: area.top,
			left: area.left,
			width: area.width,
			height: area.height
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
			})
			.then(function resetClipRect(prevClipRect) {
				return HorsemanPromise.fromCallback(function(done) {
					return self.page.set('clipRect', prevClipRect, done);
				});
			});
	}
	if (typeof area === "string") {
		return this
			.boundingRectangle(area)
			.then(doCrop);
	} else {
		return doCrop(area);
	}
};

exports.cropBase64 = function(area, type) {
	var self = this;
	function doCrop(area) {
		var rect = {
			top: area.top,
			left: area.left,
			width: area.width,
			height: area.height
			
		};
		var b64;
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
	if (typeof area === "string") {
		return this
		.boundingRectangle(area)
		.then(doCrop);
	} else {
		return doCrop(area);
	}
};

exports.screenshotBase64 = function(type) {

	if (['PNG', 'GIF', 'JPEG'].indexOf(type) == -1) {

		debug('.screenshotBase64() with type ' + type + ' not supported.');
		debug('type must be one of PNG, GIF, or JPEG');
		var err = new Error("screenshotBase64 type must be PNG, GIF, or JPEG.");
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
 * Save the page as a pdf.
 * For more info - http://phantomjs.org/api/webpage/property/paper-size.html
 * @param {string} path - The name and location of where to store the pdf.
 * @param {object} [paperSize] - Defines the pdf's format, orientation, and margin, and more.
 * @param {string} [paperSize.format] - Format of the pdf. Supported formats are: 'A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid'. Default is 'letter' cuz 'Murica.
 * @param {string} [paperSize.orientation] - Orientation of the pdf. Must be 'portrait' or 'landscape'. Default is 'portrait'.
 * @param {string} [paperSize.margin] - Margin of the pdf. Default is '0.5in'.
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
 * @param {string} file - The file containing javascript to inject onto the page.
 */
exports.injectJs = function(file) {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug('.injectJs()', file);
			return self.page.injectJs(file, done);
		});
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
 * @param {number} [modifier=0] - The keyboard modifier to use. See http://phantomjs.org/api/webpage/method/send-event.html
 */
exports.keyboardEvent = function(type, key, modifier) {
	type = (typeof type === "undefined") ? 'keypress' : type;
	key = (typeof key === "undefined") ? null : key;
	modifier = (typeof modifier === "undefined") ? 0 : modifier;

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
	type = (typeof type === "undefined") ? "click" : type;
	x = (typeof x === "undefined") ? null : x;
	y = (typeof y === "undefined") ? null : y;
	button = (typeof button === "undefined") ? "left" : button;

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
			"ctrl": 0x04000000,
			"shift": 0x02000000,
			"alt": 0x08000000,
			"meta": 0x10000000,
			"keypad": 0x20000000
		};
		var modifier = 0,
			checkKey = function(key) {
				if (key in modifiers) return;
				debug(key + 'is not a supported key modifier');
			};
		if (!modifierString) return modifier;
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
		.each(function sendKey(key) {
			return self.keyboardEvent(opts.eventType, key, null, null, modifiers);
		});
};


/**
 * Clear an input field.
 * @param {string} selector - The selctor to clear.
 */
exports.clear = function(selector) {
	debug('.clear()', selector);
	return this.value(selector, "");
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
				debug(".upload() file path not valid.");
				var err = new Error("File path for upload is not valid.");
				return HorsemanPromise.reject(err);
			}
		})
		.tap(function() {
            debug(".upload()", path, selector);
		});
};


/**
 * Run javascript on the page.
 * @param {function} fn - The function to run.
 * @param {...*} [arguments] - The optional arguments to pass to 'fn'.
 */
exports.manipulate = function( /*fn, arg1, arg2, etc*/ ) {
	this.__evaluate.apply(this, arguments);
	return this;
};


/*
 * Execute a function without breaking the api chain.
 * @param fn The function to run. Must call 'done()' when complete.
 */
exports.do = function(fn){
	debug('.do()', fn.name || '<anonymous>')
	return this.ready.then(function(){
		return new HorsemanPromise(function(resolve, reject){
			fn(resolve);
		});
	});
}

//**************************************************//
// Information
//**************************************************//

/**
 * Run a javascript function on the current page and optionally return the results
 * @param {function} fn
 * @param {...*} [arguments] - The optional arguments to pass to 'fn'.
 */
exports.evaluate = function(fn) {
	var args =  Array.prototype.slice.call(arguments, 1);
	var self = this;
	var hasCb = args.length < fn.length; // Whether fn takes a callback

	return this.ready.then(function() {
		// Handle this.page changing
		var page = self.page;
		var evaluate = HorsemanPromise.promisify(page.evaluate).bind(page);

		return HorsemanPromise.fromCallback(function(done) {
			return evaluate(function fnWrapper(fnstr, hasCb, args) {
					__horseman.cbargs = undefined;
					var done = function done() {
						__horseman.cbargs = __horseman.cbargs || arguments;
					};
					try {
						var fn;
						eval('fn = ' + fnstr);

						if (hasCb) {
							// Call fn asynchronously
							return setTimeout(function() {
								return fn.apply(this, args.concat(done));
							}, 0);
						} else {
							var p;
							// Call fn synchronously
							p = fn.apply(this, args);

							if (p && typeof p.then === 'function') {
								// fn returned a Promise
								return p.then(function onResolve(res) {
									return done(null, res);
								}, function onReject(err) {
									return done(err);
								});
							} else {
								// node-phantom-simple can't have undefined
								done(null, p === undefined ? null : p);
							}
						}
					} catch (err) {
						done(err);
					}
					return true;
				}, fn.toString(), hasCb, args)
				.then(function waitForCb(done) {
					if (done !== true) {
						return waitForPage.call(
							self,
							page,
							function waitForCb() {
								return !!__horseman.cbargs;
							},
							true
						);
					}
				})
				.then(function handleCb() {
					return evaluate(function handleCb() {
						// Have to turn arguments Object into a real Array
						return Array.prototype.slice.call(__horseman.cbargs);
					});
				})
				.spread(done)
				.catch(done);
		});
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
 * Evaluates a function on the given page
 * @param {Page} page
 * @param {function} fn
 * @param {...*} [arguments]
 */
function evaluatePage(page, fn) {
	page = page || this.page;
	var args =  Array.prototype.slice.call(arguments, 2);
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			return HorsemanPromise.fromCallback(function(done) {
				// Wrap fn to be able to catch exceptions and reject Promise
				return page.evaluate(function(fnstr, args) {
					try {
						var fn;
						eval('fn = ' + fnstr);

						var res = fn.apply(this, args); // Call fn with args
						// node-phantom-simple can't have undefined in array
						return [null, res === undefined ? null : res];
					} catch (err) {
						return [err];
					}
				}, fn.toString(), args, done);
			})
			.spread(done)
			.catch(done);
		});
	});
}


/**
 * Get the url of the current page.
 */
exports.url = function() {
	debug('.url()');
	return this.__evaluate(function() {
		return document.location.href;
	});
};

/**
 * Count the number of occurances of 'selector' on the page.
 * @param {string} selector
 */
exports.count = function(selector) {
	debug('.count()', selector);
	return this.__evaluate(function(selector) {
		var matches = (window.jQuery) ? jQuery(selector) : document.querySelectorAll(selector);
		return matches.length;
	}, selector);
};

/**
 * Get the title of the current page.
 */
exports.title = function() {
	debug('.title()');
	return this.__evaluate(function() {
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
 */
exports.html = function(selector) {
	debug('.html()', selector);
	return this.__evaluate(function(selector) {
		if (selector) {
			return (window.jQuery) ? jQuery(selector).html() : document.querySelector(selector).innerHTML;
		} else {
			return (window.jQuery) ? jQuery("html").html() : document.documentElement.innerHTML;
		}
	}, selector);
};

/**
 * Get the text for the body of the page, or optionally for a selector.
 * @param {string} [selector]
 */
exports.text = function(selector) {
	debug('.text()', selector);
	return this.__evaluate(function(selector) {
		if (selector) {
			return (window.jQuery) ? jQuery(selector).text() : document.querySelector(selector).textContent;
		} else {
			return (window.jQuery) ? jQuery("body").text() : document.querySelector("body").textContent;
		}
	}, selector);
};

/**
 * Get the value of an attribute for a selector.
 * @param {string} selector
 * @param {string} attr
 */
exports.attribute = function(selector, attr) {
	debug('.attribute()', selector, attr);
	return this.__evaluate(function(selector, attr) {
		return (window.jQuery) ? jQuery(selector).attr(attr) : document.querySelector(selector).getAttribute(attr);
	}, selector, attr);
};

/**
 * Get the value of an css property of a selector.
 * @param {string} selector
 * @param {string} prop
 */
exports.cssProperty = function(selector, prop) {
	debug('.cssProperty()', selector, prop);
	return this.__evaluate(function(selector, prop) {
		return (window.jQuery) ? jQuery(selector).css(prop) : getComputedStyle(document.querySelector(selector))[prop];
	}, selector, prop);
};

/**
 * Get the width of an element.
 * @param {string} selector
 */
exports.width = function(selector) {
	debug('.width()', selector);
	return this.__evaluate(function(selector) {
		return (window.jQuery) ? jQuery(selector).width() : document.querySelector(selector).offsetWidth;
	}, selector);
};

/**
 * Get the height of an element.
 * @param {string} selector
 */
exports.height = function(selector) {
	debug('.height()', selector);
	return this.__evaluate(function(selector) {
		return (window.jQuery) ? jQuery(selector).height() : document.querySelector(selector).offsetHeight;
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
	if (typeof value === "undefined") { // get the value of an element
		return self
			.__evaluate(function(selector) {
				return (window.jQuery) ? jQuery(selector).val() : document.querySelector(selector).value;
			}, selector)
			.then(function(val) {
				if (val === null) {
					return this
						.exists(selector)
						.then(function(exists) {
							return (exists) ? "" : val
						})
				} else {
					return val;
				}

			});

	} else { // set the value of an element
		return self.__evaluate(function(selector, value) {
			if (window.jQuery) {
				jQuery(selector).val(value).change();
			} else {
				var element = document.querySelector(selector)
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
 * @param {string} selector -The selector to find the visibility of.
 */
exports.visible = function(selector) {
	debug('.visible()', selector);
	return this
		.__evaluate(function visible(selector) {
			if (window.jQuery) {
				return jQuery(selector).is(":visible");
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
exports.log = function(output){
	if (arguments.length == 0) {
		output = this.lastVal;
	}

	return this.ready.then(function(){
		console.log(output);
		return;
	});
}

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

exports.openTab = function(url) {
	var self = this;
	self.targetUrl = url;
	return this.ready.then(function() {
		return self.pageMaker().then(function() {
			return self.open(url);
		})
	})
};

/**
 * Switch focus to a child frame.
 * @param {string} selector - Selector to switch to
 */
exports.switchToChildFrame = function(selector) {
	var self = this;
	return this.ready.then(function() {
		return HorsemanPromise.fromCallback(function(done) {
			debug(".switchToChildFrame()", selector);
			return self.page.switchToChildFrame(selector, done);
		});
	});
};

exports.status = function(){
	var self = this;
	return this.ready.then(function() {
		var status = self.responses[ self.targetUrl ];

		// If the open was for 'http://www.google.com', the results may be stored in 'http://www.google.com/'
		if ( typeof status === 'undefined' ){
			status = self.responses[ self.targetUrl + '/'];
		}
		return status;
	});
}

//**************************************************//
// Callbacks
//**************************************************//
/**
 * Handles page events.
 *
 * @param {String} eventType
 * @param {Function} callback
 * @param {Function} done
 *
 * eventType can be one of:
 *  initialized - callback()
 *  loadStarted - callback()
 *  loadFinished - callback(status)
 *  urlChanged - callback(targetUrl)
 *  navigationRequested - callback(url, type, willNavigate, main)
 *  resourceRequested - callback(requestData, networkRequest)
 *  resourceReceived - callback(response)
 *  consoleMessage(msg, lineNum, sourceId)
 *  alert - callback(msg)
 *  confirm - callback(msg)
 *  prompt - callback(msg, defaultVal)
 *  error - callback(msg, trace);
 */


exports.on = function(eventType, callback) {
	var self = this;
	return this.ready.then(function() {

		if (eventType === "timeout") {
			self.page.onTimeout = callback;
		} else if (eventType === "navigationRequested") {
			self.page.onNavigationRequested = function(result) {
				callback.apply(null, result);
			}
		} else if (eventType === "tabCreated") {
			self.onTabCreated = callback;
		} else if (eventType === "urlChanged") {
			self.page.onUrlChanged = function(targetUrl) {
				self.targetUrl = targetUrl;
				callback(targetUrl);
			};
		} else if (eventType == "resourceReceived") {
			self.page.onResourceReceived = function(response) {
				self.responses[response.url] = response.status;
				callback(response);
			};
		} else if (eventType == "pageCreated") {
			self.page.onPageCreated = function(page) {
				self.pageMaker(page).then(callback);
			};
		} else if (eventType == "loadFinished") {
			self.page.onLoadFinished2 = callback;
		} else {

			var pageEvent = "on" + eventType.charAt(0).toUpperCase() + eventType.slice(1);
			self.page[pageEvent] = callback;

		}
		debug(".on " + eventType + " set.")
	})
};

//**************************************************//
// Waiting
//**************************************************//


exports.wait = function(milliseconds) {
	debug('.wait()', milliseconds);
	return this.ready.then(function() {
		return HorsemanPromise.delay(milliseconds);
	});
};

exports.waitForNextPage = function() {
	debug('.waitForNextPage()');
	var self = this;
	self.waitingForNextPage = true;

	return this.ready.then(function() {
		var start = Date.now();
		return new HorsemanPromise(function(resolve, reject) {
				var waiting = setInterval(function() {
					if (self.waitingForNextPage === false) {
						debug('.waitForNextPage() completed successfully');
						clearInterval(waiting);
						resolve();
					} else {
						var diff = Date.now() - start;
						if (diff > self.options.timeout) {
							clearInterval(waiting);
							debug('.waitForNextPage() timed out');
							if (typeof self.page.onTimeout === 'function') {
								self.page.onTimeout();
							}
							reject(new TimeoutError('timeout duing .waitForNextPage() after ' + diff + ' ms'));
						}
					}
				}, self.options.interval)
			});
	});
};

exports.waitForSelector = function(selector) {
	debug('.waitForSelector()', selector);
	var elementPresent = function elementPresent(selector) {
		var els = window.jQuery ? jQuery(selector) : document.querySelectorAll(selector);
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
 */
function waitForPage(page) {
	var self = this;
	var args = Array.prototype.slice.call(arguments);
	var value = args.pop();

	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			var start = Date.now();
			var checkInterval = setInterval(function() {
				var _page = page || self.page;
				var diff = Date.now() - start;
				if (diff > self.options.timeout) {
					clearInterval(checkInterval);
					debug('.waitFor() timed out');
					if (typeof _page.onTimeout === 'function') {
						_page.onTimeout();
					}
					reject(new TimeoutError('timeout during .waitFor() after ' + diff + ' ms'));
				} else {
					evaluatePage.apply(self, args)
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
