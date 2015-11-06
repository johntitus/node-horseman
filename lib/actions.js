var fs = require("fs");
var defaults = require('defaults');
var debug = require('debug')('horseman');
var HorsemanPromise = require('./HorsemanPromise');


//**************************************************//
// Navigation
//**************************************************//
exports.userAgent = function(userAgent) {
	var self = this;


	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {

			if (!userAgent) {
				self.page.get('settings', function(err, settings) {
					debug('.getting userAgent()');
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
							debug('.userAgent() set');
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
	debug('.open ' + url);
	self.targetUrl = url;
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			self.page.open(url, function(err, status) {
				debug('.open: ' + url + ' - status: ' + status);
				if (err) reject(err);
				else resolve(status);
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
		return new HorsemanPromise(function(resolve, reject) {
			debug('.headers()');
			self.page.set('customHeaders', headers, resolve);
		});
	});
};

/**
 * Go back a page.
 */
exports.back = function() {
	var self = this;
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			debug('.back()');
			self.page.goBack(resolve);
		});
	});
};

/*
 * Go forwards a page.
 */
exports.forward = function() {
	var self = this;
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			debug('.forward()');
			self.page.goForward(resolve);
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
		return new HorsemanPromise(function(resolve, reject) {
			self.page.get('settings', function(err, settings) {
				if (err) reject(err);
				debug('.authentiation() set');
				settings.userName = user;
				settings.password = password;
				self.page.set('settings', settings, resolve);
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
		debug('getting viewport()');
		return this.ready.then(function() {
			return self.evaluate(function() {
				return {
					width: window.innerWidth,
					height: window.innerHeight
				};
			});
		});
	} else {
		var self = this;
		debug('setting viewport() to width ' + width + ' height ' + height);
		return this.ready.then(function() {
			return new HorsemanPromise(function(resolve, reject) {
				var viewport = {
					width: width,
					height: height
				};
				self.page.set('viewportSize', viewport, resolve);
			})
		})
	}
};

/*
 * Set the zoom factor of the page
 * @param {number} zoomFactor
 */
exports.zoom = function(zoomFactor) {
	var self = this;
	debug('.zoomFactor() set');
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			self.page.set('zoomFactor', zoomFactor, resolve);
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
	debug('.scrollTo: ' + top + "," + left);
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
	debug('.posting: ' + url);
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
	return this.evaluate(function() {
		document.location.reload(true);
	});
};

exports.cookies = function(arg) {
	if (arg) {
		if (arg instanceof Array) { //replace all the cookies!
			var self = this;

			return this.ready.then(function() {
				return new HorsemanPromise(function(resolve, reject) {
					self.phantom.clearCookies(function(err) {

						debug('.cookie()s reset');
						if (err) reject(err);

						var totalCookies = arg.length,
							cookiesAdded = 0;

						if (totalCookies) {
							for (var i = 0, len = totalCookies; i < len; i++) {
								(function(cookie) {
									self.phantom.addCookie(cookie, function(err) {
										if (err) reject(err);
										if (++cookiesAdded == totalCookies) {
											resolve();
										}
									});
								})(arg[i]);
							}
						} else {
							resolve();
						}
					});
				});
			});
		} else if (typeof arg === "object") { //adding one cookie
			var self = this;

			return this.ready.then(function() {
				return new HorsemanPromise(function(resolve, reject) {
					self.phantom.addCookie(arg, function(err) {
						if (err) reject(err);
						else {
							debug('.cookie() added');
							resolve();
						}

					});
				});
			});

		}
	} else { // return cookies for this page
		var self = this;
		return this.ready.then(function() {
			return new HorsemanPromise(function(resolve, reject) {
				self.page.get('cookies', function(err, result) {
					if (err) reject(err);
					else {
						debug('.cookie()s returned');
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

/*
 * Save a screenshot to disk
 * @param {string} path
 */
exports.screenshot = function(path) {
	var self = this;

	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			debug('.screenshot()');
			self.page.render(path, function(err) {
				if (err) reject(err);
				else resolve();
			});
		});
	});
};

/* 
 * Click on a selector and fire a 'click event'
 * @param {string} selector
 */
exports.click = function(selector) {
	var self = this;

	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			debug('.click()');
			self.page.evaluate(function(selector) {
				if (window.jQuery) {
					var element = jQuery(selector);
					if (element.length) {
						var event = document.createEvent('MouseEvent');
						event.initEvent('click', true, true);
						element.get(0).dispatchEvent(event);
					}
				} else {
					var element = document.querySelector(selector);
					var event = document.createEvent('MouseEvent');
					event.initEvent('click', true, true);
					element.dispatchEvent(event);
				}
			}, selector, function(err) {
				debug('.click() done');
				if (err) throw err;
				else resolve();
			})
		});
	});
};

exports.boundingRectangle = function(selector) {
	var self = this;
	return this.evaluate(function(selector) {
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
		return self.ready.then(function() {
			return new HorsemanPromise(function(resolve, reject) {
				self.page.get('clipRect', function(err, prevClipRect) {
					self.page.set('clipRect', rect, function() {
						self.screenshot(path).then(function() {
							self.page.set('clipRect', prevClipRect, function(err) {
								if (err) reject(err);
								else resolve();
							});
						});
					});
				});
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

exports.cropBase64 = function(area,type) {

	var self = this;

	function doCrop(area,type) {
		var rect = {
			top: area.top,
			left: area.left,
			width: area.width,
			height: area.height
			
		};
		return self.ready.then(function() {
			return new HorsemanPromise(function(resolve, reject) {
				self.page.get('clipRect', function(err, prevClipRect) {
					self.page.set('clipRect', rect, function() {
						self.page.renderBase64(type, function(err, data) {
							if (err) reject(err);
							else resolve(data);
							self.page.set('clipRect', prevClipRect, function(err) {
								if (err) reject(err);
								else resolve();
							});
						});
					});
				});
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

exports.screenshotBase64 = function(type) {

	if (['PNG', 'GIF', 'JPEG'].indexOf(type) == -1) {

		debug('.screenshotBase64() with type ' + type + ' not supported.');
		debug('type must be one of PNG, GIF, or JPEG');
		return Error("screenshotBase64 type must be PNG, GIF, or JPEG.");

	} else {

		var self = this;
		var result;
		return this.ready.then(function() {
			return new HorsemanPromise(function(resolve, reject) {
				debug('.screenshotBase64()');
				self.page.renderBase64(type, function(err, data) {
					if (err) reject(err);
					else resolve(data);
				});
			});
		});
	}
};

/*
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
		}
	}
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			self.page.set('paperSize', paperSize, function() {
				self.page.render(path, {
					format: 'pdf',
					quality: '100'
				}, function() {
					debug('.pdf() complete');
					resolve();
				});
			});
		});
	});
};

/*
 * Injects javascript from a file into the page.
 * @param {string} file - The file containing javascript to inject onto the page.
 */
exports.injectJs = function(file) {
	var self = this;
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			debug('.injectJs() ' + file);
			self.page.injectJs(file, function() {
				resolve();
			});
		});
	});
};

/*
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
	return self.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			self.page.sendEvent(type, key, null, null, modifier, function() {
				debug('.keyboardEvent()', type, key, modifier);
				resolve();
			});
		});
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
	return self.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			self.page.sendEvent(type, x, y, button, function() {
				debug('.mouseEvent()', type, x, y, button);
				resolve()
			});
		});
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

	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			debug('.type()', selector, text, options);
			return self.page.evaluate(function(selector) {
				if (window.jQuery) {
					jQuery(selector).focus();
				} else {
					document.querySelector(selector).focus();
				}
			}, selector, function() {
				for (var i = 0, len = text.length; i < len; i++) {
					self.page.sendEvent(opts.eventType, text[i], null, null, modifiers);
				}
				resolve();
			});
		});
	})
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
	if (fs.existsSync(path)) {
		return new HorsemanPromise(function(resolve, reject) {
            return self.page.uploadFile(selector, path, function() {
                resolve();
                debug(".upload() " + path + " into " + selector);
            });
		});
	} else {
		debug(".upload() file path not valid.");
		return Error("File path for upload is not valid.");
	}
};


/**
 * Run javascript on the page.
 * @param {function} fn - The function to run.
 * @param {...*} [arguments] - The optional arguments to pass to 'fn'.
 */
exports.manipulate = function( /*fn, arg1, arg2, etc*/ ) {
	this.evaluate.apply(this, arguments);
	return this;
};


/*
 * Execute a function without breaking the api chain.
 * @param fn The function to run. Must call 'done()' when complete.
 */
exports.do = function(fn){
	debug('.do()')
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
 * @param {function}
 */
exports.evaluate = function() {
	var self = this;
	var a = arguments;

	return this.ready.then(function() {

		return new HorsemanPromise(function(resolve, reject) {
			var result;
			var mainArguments = Array.prototype.slice.call(a);
			mainArguments.push(function(err, res) {
				if (err) reject(err);
				else resolve(res);
			});
			self.page.evaluate.apply(this.page, mainArguments);
		});
	});
};


/**
 * Get the url of the current page.
 */
exports.url = function() {
	debug('.url()');
	return this.evaluate(function() {
		return document.location.href;
	});
};

/**
 * Count the number of occurances of 'selector' on the page.
 * @param {string} selector
 */
exports.count = function(selector) {
	debug('.count()', selector);
	return this.evaluate(function(selector) {
		var matches = (window.jQuery) ? jQuery(selector) : document.querySelectorAll(selector);
		return matches.length;
	}, selector);
};

/**
 * Get the title of the current page.
 */
exports.title = function() {
	debug('.title()');
	return this.evaluate(function() {
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
	debug('.htmle()', selector);
	return this.evaluate(function(selector) {
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
	return this.evaluate(function(selector) {
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
	return this.evaluate(function(selector, attr) {
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
	return this.evaluate(function(selector, prop) {
		return (window.jQuery) ? jQuery(selector).css(prop) : getComputedStyle(document.querySelector(selector))[prop];
	}, selector, prop);
};

/**
 * Get the width of an element.
 * @param {string} selector
 */
exports.width = function(selector) {
	debug('.width()', selector);
	return this.evaluate(function(selector) {
		return (window.jQuery) ? jQuery(selector).width() : document.querySelector(selector).offsetWidth;
	}, selector);
};

/**
 * Get the height of an element.
 * @param {string} selector
 */
exports.height = function(selector) {
	debug('.height()', selector);
	return this.evaluate(function(selector) {
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
			.evaluate(function(selector) {
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
		return self.evaluate(function(selector, value) {
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

//Determines if an element is visible
exports.visible = function(selector) {
	debug('.visible()', selector);
	var vis = this.evaluate(function(selector) {
		if (window.jQuery) {
			var vis = jQuery(selector).is(":visible");
			return (vis) ? vis : false;
		} else {
			var elem = document.querySelector(selector);
			if (elem) return (elem.offsetWidth > 0 && elem.offsetHeight > 0);
			else return false;
		}
	}, selector);
	return (vis) ? vis : false;
};

/*
 * Log the output from either a previous chain method, or a string the user passed in.
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

exports.switchToTab = function(tabNumber) {
	this.page = this.tabs[tabNumber];
	return this;
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

exports.switchToChildFrame = function(selector) {
	var self = this;
	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
			debug(".switchToChildFrame()");
			self.page.switchToChildFrame(selector);
			resolve();
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
				callback(result[0])
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
							reject('Timeout occurred before url changed.');
						}
					}
				}, self.options.interval)
			})
			.catch(function(err) {
				if (err === 'Timeout occurred before url changed.') {
					debug('Timeout during waitForNextPage()');
					if (typeof self.page.onTimeout === 'function') {
						self.page.onTimeout();
					}
				}
			});
	});
};

exports.waitForSelector = function(selector) {
	debug('.waitForSelector()', selector);
	eval("var elementPresent = function() {" +
		"  var element = document.querySelector('" + selector + "');" +
		"  return (element ? true : false);" +
		"};");
	return this.waitFor(elementPresent, true).then(function() {
		debug('.waitForSelector() complete');
	});
};

exports.waitFor = function(fn, value) {
	debug('.waitFor()');
	var self = this;

	var start;

	return this.ready.then(function() {
		return new HorsemanPromise(function(resolve, reject) {
				start = Date.now();
				var checkInterval = setInterval(function() {
					var diff = Date.now() - start;
					if (diff > self.options.timeout) {
						clearInterval(checkInterval);
						reject('Timeout occurred before url changed.')
					} else {
						self
							.evaluate(fn)
							.then(function(res) {
								if (res === value) {
									debug('.waitFor() completed successfully');
									clearInterval(checkInterval);
									resolve();
								}
							})
					}
				}, self.options.interval)
			})
			.catch(function(err) {
				if (err === 'Timeout occurred before url changed.') {
					debug('Timeout during waitFor()');
					if (typeof self.page.onTimeout === 'function') {
						self.page.onTimeout();
					}
				}
			});
	});
};
