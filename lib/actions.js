var fs = require("fs");
var deasync = require("deasync");
var defaults = require('defaults');
var debug = require('debug')('horseman');

//**************************************************//
// Navigation
//**************************************************//
exports.userAgent = function( userAgent ){
  var done = false;
  if ( !userAgent ){
    var ua;
    this.page.get('settings.userAgent', function(res){
      ua = res;
      done = true;
    });
    while(!done){
      deasync.runLoopOnce();
    }
    return ua;
  } else {
    this.page.set('settings.userAgent', userAgent, function(){
      done = true;
    });
    while(!done){
      deasync.runLoopOnce();
    }
    return this;
  }
};

exports.authentication = function(user, password) {
  var self = this;
  var done = false;
  this.page.get('settings', function( settings ){
    settings.userName = user;
    settings.password = password;
    self.page.set('settings', settings, function(){
      done = true;
    });
  });
  while (!done){
    deasync.runLoopOnce();
  }
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
    var done = false;
    var viewport = { width: width, height: height };
    this.page.set('viewportSize', viewport, function(){
      done = true;
    });
    while (!done){
      deasync.runLoopOnce();
    }
    return this;
  }
};

exports.addCookie = function( name, value, domain ){
  var done = false;
  this.phantom.addCookie( name, value, domain, function(){
    done = true;
  });
  while ( !done ){
    deasync.runLoopOnce();
  }
  return this;
};

exports.clearCookies = function(){
  var done = false;
  this.phantom.clearCookies( function(){
    done = true;
  });
  while ( !done ){
    deasync.runLoopOnce();
  }
  return this;
};

exports.cookies = function(){
  var cookies;
  var done = false;
  this.phantom.getCookies(function( c ){
    cookies = c;
    done = true;
  });
  while ( !done ){
    deasync.runLoopOnce();
  }
  return cookies;
}

exports.open = function( url ){
  var done = false;
  this.page.open(url, function(){
    done = true;
  });
  while(!done){
    deasync.runLoopOnce();
  }
  debug('.open: ' + url);
  return this;
};

exports.back = function(){
  //console.log("going back")
  this.page.goBack();
  deasync.sleep(500);
  
  return this;
};

exports.forward = function(){
  this.page.goForward();
  deasync.sleep(500);
  return this;
};

exports.reload = function(){
  this.evaluate( function(){
    document.location.reload( true );
  });
  return this;
};

exports.cookies = function(arg){
  if ( arg ){
    if ( arg instanceof Array ){ //replace all the cookies!
      var done = false;
      this.phantom.clearCookies();
      for ( var i = 0, len = arg.length; i < len; i++ ){
        this.phantom.addCookie(arg[i].name, arg[i].value, arg[i].domain);
      }
      return this;
    } else if ( typeof arg === "object" ){ //adding one cookie
      this.phantom.addCookie(arg.name, arg.value, arg.domain);
      //console.log( this.phantom.cookies );
      return this;
    }
  } else { // return cookies for this page
    var done = false;
    var cookies;
    this.phantom.getCookies(function( result ){
      cookies = result;
      done = true;
    });
    while (!done){
      deasync.runLoopOnce();
    }
    return cookies;
  }
}
//**************************************************//
// Interaction
//**************************************************//
exports.screenshot = function( path ){
  var done = false;
  
  this.page.render(path, function(){
    done = true;
  });
  while(!done){
    deasync.runLoopOnce();
  }
  return this;
};

exports.injectJs = function( file ){
  this.page.injectJs( file );
  return this;
};

exports.click = function( selector ){
  var done = false;
  
  this.page.evaluate( function( selector ) {    
    var element = $( selector );
    if ( element.length ){
      var event = document.createEvent('MouseEvent');
      event.initEvent('click', true, true);
      element.get(0).dispatchEvent(event);
    }
  }, function(){
    done = true;
  }, selector );

  while(!done){
    deasync.runLoopOnce();
  }
  return this;
};

exports.select = function( selector, value ){
  return this.value( selector, value );
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
  
  var done = false;
  var self = this;
  
  this.page.evaluate( function( selector ){
    $( selector ).focus();    
  }, function(){
    for (var i = 0, len = text.length; i < len; i++){
      self.page.sendEvent( opts.eventType, text[i], null, null, modifiers );
    }
    done = true;
  }, selector); 

  while(!done){
    deasync.runLoopOnce();
  }
  debug('.type() %s into %s', text, selector);
  return this;
};

//Clear an input field.
exports.clear = function( selector ){
  this.value(selector,"");
  return this;
};

exports.upload = function( selector, path ){
  var done = false;
  if (fs.existsSync(path)){
    this.page.uploadFile(selector, path, impatient(function(){
      done = true;
    }, this.options.timeout));

    while(!done){
      deasync.runLoopOnce();
    }
    return this;
  } else {
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
  var done = false; 
  var result;
  
  var args = [].slice.call(arguments);
  
  args.splice(1,0,function(res){
    result = res;
    done = true;
  });
  
  this.page.evaluate.apply( this.page, args);  
  
  while(!done){
    deasync.runLoopOnce();
  }
  debug('.evaluate() fn on the page');
  return result;
};

exports.url = function(){
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
    return $( selector ).length;
  }, selector);
};

//Get the html inside a selector, or the entire body of the doc
exports.html = function( selector ){
  return this.evaluate( function( selector ){
    if ( selector ){
      return $( selector ).html();
    } else {
      return $( "html" ).html();
    }
  }, selector);
};

//Get the text inside a selector
exports.text = function(selector){
  return this.evaluate( function( selector ){
    if ( selector ){
      return $( selector ).text();
    } else {
      return $( "body" ).text();
    }
  }, selector );
};

//Get the value of an attribute of a selctor
exports.attribute = function(selector, attr){
  return this.evaluate( function( selector, attr ){
    return $( selector ).attr( attr );
  }, selector, attr );
};

//Get the value of an css property of a selctor
exports.cssProperty = function(selector, prop){
  return this.evaluate( function( selector, prop ){
    return $( selector ).css( prop );
  }, selector, prop );
};

//Get the value of an width of a selctor
exports.width = function(selector){
  return this.evaluate( function( selector ){
    return $( selector ).width();
  }, selector );
};

//Get the value of an height of a selctor
exports.height = function(selector){  
  return this.evaluate( function( selector ){
    return $( selector ).height();
  }, selector );
};

//Get or set the value of a selector
exports.value = function(selector, value){
  if ( typeof value === "undefined" ){ // get the value of an element    
     debug('getting .value()');
    var val = this.evaluate( function( selector ){
      return $( selector ).val();
    }, selector);
    debug('.value() of %s is %s', selector, val);
    return val;
  } else { // set the value of an element

    this.evaluate( function( selector, value ){
      $( selector ).val( value );
    }, selector, value );
    debug('.value() set %s value to %s', selector, value);
    return this;
  }
};

//Determines if an element is visible
exports.visible = function(selector){  
  return this.evaluate( function( selector ){
    return $( selector ).is( ":visible" );
  }, selector );
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
  var done = false;
  if ( eventType === "timeout" ){
    this.page.onTimeout = callback;
  } else {
    var pageEvent = "on" + eventType.charAt(0).toUpperCase() + eventType.slice(1);
    this.page.set(pageEvent, callback, function(){
      done = true;
    });
    while (!done){
      deasync.runLoopOnce();
    }
  }
  return this;
};

//**************************************************//
// Waiting
//**************************************************//
exports.wait = function( milliseconds ){
  deasync.sleep( milliseconds );
  return this;
};

exports.waitForNextPage = function(){
  return this.afterNextPageLoad()
};

exports.waitForSelector = function( selector ){
  var done = false;
  eval("var elementPresent = function() {"+
  "  var element = document.querySelector('"+selector+"');"+
  "  return (element ? true : false);" +
  "};");
  var self = this;
  this.untilOnPage(elementPresent, true, function(res){
    if ( res === false ){
      self.page.onTimeout("Timeout period elapsed before selector found.");
    }
    done = true;
  }, selector);
  while(!done){
    deasync.runLoopOnce();
  }
  return this;  
};

exports.waitFor = function( fn, value ){
  var done = false;
  var self = this;
  this.untilOnPage(fn, value, function(res){
    if ( res === false ){
      self.page.onTimeout("Timeout period elapsed before function equalled value.");
    }
    done = true;
  });
  while(!done){
    deasync.runLoopOnce();
  }
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