var fs = require("fs");
var defaults = require('defaults');
var debug = require('debug')('horseman');

//**************************************************//
// Navigation
//**************************************************//
exports.userAgent = function( userAgent ){
  var self = this;

  if ( !userAgent ){

    var ua;

    this.page.get('settings', function(err, settings){
      ua = settings.userAgent;
      self.pause.unpause("userAgent");
    });

    self.pause.pause("userAgent");
    return ua;

  } else {

    this.page.get('settings', function(err, settings){

      settings.userAgent = userAgent;
      self.page.set('settings', settings, function(err){

        if ( err ) throw err;
        debug('.userAgent() set');
        self.pause.unpause("userAgent");
      });

    });

    self.pause.pause("userAgent");

    return this;
  }
};

exports.authentication = function( user, password ) {
  var self = this;

  this.page.get('settings', function( err, settings ){
    if ( err ) throw err;
    settings.userName = user;
    settings.password = password;
    self.page.set('settings', settings, function(){
      self.pause.unpause("authentication");
    });
  });

  self.pause.pause("authentication");

  return this;
};

exports.headers = function( headers ) {
  var self = this;

  this.page.set('customHeaders', headers, function(){
    self.pause.unpause("headers");
  });

  self.pause.pause("headers");

  return this;
};

exports.zoom = function( zoomFactor ) {
  var self = this;

  this.page.set('zoomFactor', zoomFactor, function(){
    self.pause.unpause("zoom");
  });

  self.pause.pause("zoom");

  return this;
};

exports.viewport = function(width, height) {
  if ( !width ){
    return this.evaluate( function(){
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    });
  } else {
    var self = this;
    var viewport = { width: width, height: height };

    this.page.set('viewportSize', viewport, function(){
      self.pause.unpause("viewport");
    });

    this.pause.pause("viewport");
    debug('.viewport() set');
    return this;
  }
};

exports.scrollTo = function( top, left ) {
  var self = this;

  var position = {
    top : top,
    left : left
  };

  this.page.set('scrollPosition', position, function(){
    self.pause.unpause("scrollTo");
  });

  this.pause.pause("scrollTo");

  debug('.scrollTo: ' + top + "," + left);

  return this;
};

exports.open = function( url ){
  debug('.opening: ' + url);
  var self = this;
  self.targetUrl = url;
  this.page.open(url, function( err, status ){
    if ( err ) throw err;
    debug('.open: ' + url + ' - status: ' + status);
    self.pause.unpause("open");
  });
  this.pause.pause("open");

  return this;
};

exports.post = function( url, postData ){
  debug('.posting: ' + url);
  var self = this;
  self.targetUrl = url;
  this.page.open(url, 'POST', postData, function( err, status ){
    if ( err ) throw err;
    debug('.post: ' + url + ' - status: ' + status);
    self.pause.unpause("post");
  });
  this.pause.pause("post");

  return this;
};

exports.back = function(){
  this.page.goBack();

  // Force a pause until the page reloads.
  // There will be two of these flags, but when jQuery is injected, both
  // flags get cleared.
  this.pause.pause("injectJquery");
  debug('.back()');
  return this;
};

exports.forward = function(){
  this.page.goForward();

  // Force a pause until the page reloads.
  // There will be two of these flags, but when jQuery is injected, both
  // flags get cleared.
  this.pause.pause("injectJquery");
  debug('.forward()');
  return this;
};

exports.reload = function(){
  this.evaluate( function(){
    document.location.reload( true );
  });
  // Force a pause until the page reloads.
  // There will be two of these flags, but when jQuery is injected, both
  // flags get cleared.
  this.pause.pause("injectJquery");
  debug('.reload()');
  return this;
};

exports.cookies = function(arg){
  if ( arg ){
    if ( arg instanceof Array ){ //replace all the cookies!
      var self = this;
      var done = false;
      this.phantom.clearCookies(function( err ){
        debug('.cookie()s reset');
        if ( err ) throw err;

        var totalCookies = arg.length,
          cookiesAdded = 0;

        if ( totalCookies ) {
          for ( var i = 0, len = totalCookies; i < len; i++ ){
            ( function( cookie ){
              self.phantom.addCookie(cookie, function(err){
                if ( err ) throw err;
                if ( ++cookiesAdded == totalCookies ){
                  self.pause.unpause("cookies");
                }
              });
            })( arg[i] );
          }
        } else {
          self.pause.unpause("cookies");
        }
      });
      self.pause.pause("cookies");
      return this;
    } else if ( typeof arg === "object" ){ //adding one cookie
      var self = this;

      this.phantom.addCookie(arg, function(err){

        if ( err ) throw err;
        debug('.cookie() added');
        self.pause.unpause("cookies");

      });
      this.pause.pause("cookies");

      return this;
    }
  } else { // return cookies for this page
    var self = this;
    var cookies;
    this.page.get('cookies', function( err, result ){
      cookies = result;
      self.pause.unpause("cookies");
    });
    this.pause.pause("cookies");
    debug('.cookie()s returned');
    return cookies;
  }
}
//**************************************************//
// Interaction
//**************************************************//
exports.boundingRectangle = function( selector ){
  return this.evaluate( function( selector ){
    if ( window.jQuery ){
      return $( selector )[0].getBoundingClientRect();
    } else {
      var element = document.querySelector(selector);
      return element.getBoundingClientRect();
    }
  }, selector);
};

exports.crop = function( area, path ){
  if ( typeof area === "string" ){
    area = this.boundingRectangle( area );
  }
  var rect = {
    top : area.top,
    left : area.left,
    width : area.width,
    height : area.height
  };
  var self = this;
  this.page.get('clipRect', function(err, prevClipRect){
    self.page.set('clipRect', rect, function(){
      self.screenshot(path);
      self.page.set('clipRect', prevClipRect, function(){
        self.pause.unpause('clipRect');
      });
    });
  });
  this.pause.pause('clipRect');
  return this;
};

exports.screenshot = function( path ){
  var self = this;

  this.page.render(path, function(){
    self.pause.unpause("screenshot");
  });
  this.pause.pause("screenshot");
  debug('.screenshot()');
  return this;
};

exports.screenshotBase64 = function( type ){

  if ( ['PNG','GIF','JPEG'].indexOf( type ) == -1 ){

    debug('.screenshotBase64() with type ' + type + ' not supported.');
    debug('type must be one of PNG, GIF, or JPEG');
    return Error("screenshotBase64 type must be PNG, GIF, or JPEG.");

  } else {

    var self = this;
    var result;

    this.page.renderBase64(type, function(err, data){
      if ( err ) throw err;
      result = data;
      self.pause.unpause("screenshotBase64");
    });
    this.pause.pause("screenshotBase64");
    debug('.screenshotBase64() with type ' + type);
    return result;
  }
};

exports.pdf = function( path, paperSize ){
  var self = this;

  if ( !paperSize ){
    paperSize = {
      format : 'Letter',
      orientation : 'portrait',
      margin: '0.5in'
    }
  }

  this.page.set('paperSize', paperSize, function(){
    self.page.render(path, { format : 'pdf', quality : '100'}, function(){
      self.pause.unpause("pdf");
    });
  });

  this.pause.pause("pdf");

  debug('.pdf() saved to ' + path);

  return this;
};

exports.injectJs = function( file ){
  var self = this;
  this.page.injectJs( file, function( status ){
    self.pause.unpause("injectJs");
  });
  this.pause.pause("injectJs");
  debug('.injectJs() for ' + file);
  return this;
};

exports.click = function( selector ){
  var self = this;

  this.page.evaluate( function( selector ) {
    if ( window.jQuery ){
      var element = jQuery( selector );
      if ( element.length ){
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
  }, function(err){
    if ( err ) throw err;
    self.pause.unpause("click");
  }, selector );

  this.pause.pause("click");
  debug(".click() " + selector);
  return this;
};

exports.select = function( selector, value ){
  return this.value( selector, value );
};

exports.keyboardEvent = function( type, key, modifier ){

  type = (typeof type === "undefined") ? "click" : 'keypress';
  key = (typeof key === "undefined") ? null : key;
  modifier = (typeof modifier === "undefined") ? 0 : modifier;

  var self = this;
  this.page.sendEvent( type, key, null, null, modifier );
  debug('.keyboardEvent()', type, key, modifier );
  return this;
};

exports.mouseEvent = function( type, x, y, button ){
  type = (typeof type === "undefined") ? "click" : type;
  x = (typeof x === "undefined") ? null : x;
  y = (typeof y === "undefined") ? null : y;
  button = (typeof button === "undefined") ? "left" : button;

  var self = this;
  this.page.sendEvent( type, x, y, button );
  debug('.mouseEvent()', type, x, y, button );
  return this;
};

exports.type = function( selector, text, options ){
  var DEFAULTS = {
    reset : false, // clear the field first
    eventType : 'keypress', // keypress, keyup, keydown
    keepFocus : false // if true, don't blur afterwards
  };

  function computeModifier(modifierString) {
    var modifiers = {
      "ctrl" : 0x04000000,
      "shift" : 0x02000000,
      "alt" : 0x08000000,
      "meta" : 0x10000000,
      "keypad" : 0x20000000
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

  this.page.evaluate( function( selector ){
    if ( window.jQuery ){
      jQuery( selector ).focus();
    } else {
      document.querySelector( selector ).focus();
    }
  }, function(){
    for (var i = 0, len = text.length; i < len; i++){
      self.page.sendEvent( opts.eventType, text[i], null, null, modifiers );
    }
    self.pause.unpause("type");
  }, selector);

  self.pause.pause("type");
  debug('.type() %s into %s', text, selector);
  return this;
};

//Clear an input field.
exports.clear = function( selector ){
  this.value(selector,"");
  debug('.clear()', selector );
  return this;
};

exports.upload = function( selector, path ){
  var self = this;
  if (fs.existsSync(path)){
    this.page.uploadFile(selector, path, impatient(function(){
      self.pause.unpause("upload");
      debug( ".upload() " + path + " into " + selector );
    }, this.options.timeout));

    this.pause.pause("upload");

    return this;
  } else {
    debug( ".upload() file path not valid." );
    return Error("File path for upload is not valid.");
  }
};

//Run javascript on a page and keep going (don't break the chain)
exports.manipulate = function(/*fn, arg1, arg2, etc*/) {
  this.evaluate.apply( this, arguments );
  return this;
};

//**************************************************//
// Information
//**************************************************//
exports.evaluate = function(/*fn, arg1, arg2, etc*/) {
  var self = this;
  var result;

  var args = [].slice.call(arguments);

  // This is what is passed to PhantomJS's evaluate callback.
  args.splice(1,0,function( err,res ){
    if ( err ) throw err;
    result = res;
    self.pause.unpause("evaluate");
  });

  this.page.evaluate.apply( this.page, args);

  this.pause.pause("evaluate");
  debug('.evaluate() fn on the page');
  return result;
};

exports.url = function(){
  debug('.url()');
  return this.evaluate( function(){
    return document.location.href;
  });
};

//Get the title of the page
exports.title = function(){
  return this.evaluate( function(){
    return document.title;
  });
};

exports.exists = function( selector ){
  return ( this.count( selector ) > 0) ;
};

exports.count = function( selector ){
  return this.evaluate( function( selector ){
    var matches = ( window.jQuery )
      ? jQuery( selector )
      : document.querySelectorAll( selector );
    return matches.length;
  }, selector);
};

exports.html = function( selector ){
  return this.evaluate( function( selector ){
    if ( selector ){
      return ( window.jQuery )
        ? jQuery( selector ).html()
        : document.querySelector( selector ).innerHTML;
    } else {
      return ( window.jQuery )
        ? jQuery( "html" ).html()
        : document.documentElement.innerHTML;
    }
  }, selector);
};

exports.text = function(selector){
  return this.evaluate( function( selector ){
    if ( selector ){
      return ( window.jQuery )
        ? jQuery( selector ).text()
        : document.querySelector( selector ).textContent;
    } else {
      return ( window.jQuery )
        ? jQuery( "body" ).text()
        : document.querySelector( "body" ).textContent;
    }
  }, selector );
};

exports.attribute = function(selector, attr){
  return this.evaluate( function( selector, attr ){
    return ( window.jQuery )
      ? jQuery( selector ).attr( attr )
      : document.querySelector( selector ).getAttribute( attr );
  }, selector, attr );
};

exports.cssProperty = function(selector, prop){
  return this.evaluate( function( selector, prop ){
    return ( window.jQuery )
      ? jQuery( selector ).css( prop )
      : getComputedStyle( document.querySelector( selector ) )[ prop ];
  }, selector, prop );
};

exports.width = function(selector){
  return this.evaluate( function( selector ){
    return ( window.jQuery )
      ? jQuery( selector ).width()
      : document.querySelector( selector ).offsetWidth;
  }, selector );
};

exports.height = function(selector){
  return this.evaluate( function( selector ){
    return ( window.jQuery )
      ? jQuery( selector ).height()
      : document.querySelector( selector ).offsetHeight;
  }, selector );
};

exports.value = function(selector, value){
  if ( typeof value === "undefined" ){ // get the value of an element
    var val = this.evaluate( function( selector ){
      return ( window.jQuery )
        ? jQuery( selector ).val()
        : document.querySelector( selector ).value;
    }, selector);
    debug('.value() of %s is %s', selector, val);
    if ( val === null ){
      if ( this.exists( selector ) ){
        return "";
      }
    } else {
      return val;
    }
  } else { // set the value of an element
    this.evaluate( function( selector, value ){
      if ( window.jQuery ){
        jQuery( selector ).val( value ).change();
      } else {
        var element = document.querySelector(selector)
        var event = document.createEvent('HTMLEvents');
        element.value = value;
        event.initEvent('change', true, true);
        element.dispatchEvent(event);
      }
    }, selector, value );
    debug('.value() set %s value to %s', selector, value);
    return this;
  }
};

//Determines if an element is visible
exports.visible = function( selector ){
  var vis = this.evaluate( function( selector ){
    if ( window.jQuery ){
      var vis = jQuery( selector ).is( ":visible" );
      return ( vis ) ? vis : false;
    } else {
      var elem = document.querySelector( selector );
      if (elem) return (elem.offsetWidth > 0 && elem.offsetHeight > 0);
      else return false;
    }
  }, selector );
  return ( vis ) ? vis : false;
};

//**************************************************//
// Tabs
//**************************************************//
exports.tabCount = function(){
  return this.tabs.length;
};

exports.switchToTab = function( tabNumber){
  this.page = this.tabs[ tabNumber ];
  return this;
};

exports.openTab = function( url ){
  var self = this;
  this.pageMaker(function(page){

    self.page = page;

    self.tabs.push( self.page );

    self.switchToTab( self.tabCount()-1 );
    if ( url ){
      self.open( url );
    }
    self.onTabCreated();
    self.pause.unpause("creating");
  });
  self.pause.pause("creating");
  return this;
};

exports.switchToChildFrame = function( selector ){

    debug(".switchToChildFrame()");
    this.page.switchToChildFrame(selector);
    return this;
};

exports.status = function(){
  return this.responses[ this.targetUrl ];
};

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
exports.on = function( eventType, callback ){
  var self = this;
  if ( eventType === "timeout" ){
    this.page.onTimeout = callback;
  } else if ( eventType === "navigationRequested" ) {
    this.page.onNavigationRequested = function(result){
      callback(result[0])
    }
  } else if ( eventType === "tabCreated" ) {
    this.onTabCreated = callback;
  } else if ( eventType === "urlChanged" ){
    this.page.onUrlChanged = function( targetUrl ){
      self.targetUrl = targetUrl;
      callback( targetUrl );
    };
  } else if ( eventType == "resourceReceived" ){
     this.page.onResourceReceived = function( response ){
      self.responses[response.url] = response.status;
      callback( response );
    };
  } else {

    var pageEvent = "on" + eventType.charAt(0).toUpperCase() + eventType.slice(1);
    this.page[ pageEvent ] = callback;

  }
  debug(".on " + eventType + " set.")
  return this;
};

//**************************************************//
// Waiting
//**************************************************//
exports.wait = function( milliseconds ){
  this.pause.sleep( milliseconds );
  return this;
};

exports.waitForNextPage = function(){
  return this.afterNextPageLoad()
};

exports.waitForSelector = function( selector ){

  eval("var elementPresent = function() {"+
  "  var element = document.querySelector('"+selector+"');"+
  "  return (element ? true : false);" +
  "};");
  var self = this;
  this.untilOnPage(elementPresent, true, function(res){
    if ( res === false ){
      self.page.onTimeout("Timeout period elapsed before selector found.");
    }
    self.pause.unpause("waitForSelector");
  }, selector);

  this.pause.pause("waitForSelector");
  debug(".waitForSelector() " + selector);
  return this;
};

exports.waitFor = function( fn, value ){
  var self = this;
  this.untilOnPage(fn, value, function(res){
    if ( res === false ){
      self.page.onTimeout("Timeout period elapsed before function equalled value.");
    }
    self.pause.unpause("waitFor");
  });

  this.pause.pause("waitFor");
  debug(".waitFor()");
  return this;
};

/**
 * Impatiently call the function after a timeout, if it hasn't been called yet.
 *
 * @param {Function} fn
 * @param {Number} timeout
 */

function impatient(fn, timeout) {
  var called = false;
  var wrapper = function() {
    if (!called) fn.apply(null, arguments);
    called = true;
  };
  setTimeout(wrapper, timeout);
  return wrapper;
};
