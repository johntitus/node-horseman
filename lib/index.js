var clone = require('clone');
var defaults = require('defaults');
var phantom = require("node-phantom-simple");
var path = require("path");
var debug = require('debug')('horseman');
var actions = require("./actions");
var Pause = require("./pause");
var noop = function(){};

/**
 * Expose `Horseman`.
 */
module.exports = Horseman;

/**
 * Default options.
 */
var DEFAULTS = {
  timeout: 5000,
  interval: 50,
  port: 12405,
  weak : true,
  clientScripts : [],
  ignoreSSLErrors : true,
  loadImages : true,
  sslProtocol : "any", //sslv3, sslv2, tlsv1, any
  webSecurity : true,
  injectJquery : true
};

/**
 * Initialize a new `Horseman`.
 *
 * @param {Object} options
 */
function Horseman (options) {
  DEFAULTS.port++;
  if (!(this instanceof Horseman)) return new Horseman(options);
  this.options = defaults(clone(options) || {}, DEFAULTS);

  this.pause = new Pause();

  var self = this;

  debug('.setup() creating phantom instance on');

  var phantomOptions = {
    'ignore-ssl-errors' : this.options.ignoreSSLErrors,
    'load-images' : this.options.loadImages,
    'ssl-protocol' : this.options.sslProtocol,
    'web-security' : this.options.webSecurity
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

  var instantiationOptions = { parameters : phantomOptions };

  if (typeof this.options.phantomPath !== "undefined") {
    instantiationOptions['phantomPath'] = this.options.phantomPath;
  }
  
  this.pageMaker = function(callback){
    self.phantom.createPage( function( err, page ){
      if ( err ){
        throw err;
      }
      
      debug('.setup() phantom page created ok.');
      
      //self.page = page;

      //self.tabs.push( self.page );
      
      debug('.setup() setting viewport.');
      
      page.set("viewportSize",{
        width: 1200,
        height: 800
      }, function(err){
        if ( err ){
          throw err;
        }
        debug('.setup() viewport set ok.');

        page.onResourceReceived = function(response){
          self.responses[response.url] = response.status;
        };

        page.onUrlChanged = function( targetUrl ){
          self.targetUrl = targetUrl;
        };

        page.onLoadFinished = function(){
          debug("load finished, injecting jquery and client scripts");
          if ( self.options.injectJquery ){
            self.injectjQuery();
          } else {
            self.pause.unpause("injectJquery");
          }
          self.injectClientScripts();
        };

        page.onPageCreated = function( newPage ){
          self.tabs.push(newPage);

          //Fire the callback
          self.onTabCreated();

          newPage.onLoadFinished = function(){
            self.pause.unpause("creatingTab");
          }
          self.pause.pause("creatingTab");
        }

        page.onTimeout = noop;

        
        callback( page );
      });
      
    });
  }

  phantom.create( function( err, instance ){

    if ( err ){
      throw err;
    }
    debug('.setup() phantom instance created ok.');
    self.phantom = instance;
    debug('.setup() creating phantom page.');

    self.tabs = [];

    self.responses = {};

    self.targetUrl = null;

    self.onTabCreated = noop;

    self.pageMaker(function(page){
      
      self.page = page;

      self.tabs.push( self.page );
      self.pause.unpause("creating");
    });
    self.pause.pause("creating");
    

    return this;
    
  }, instantiationOptions);

  this.pause.pause("creating"); 
 
};

//**************************************************//
// Cleanup
//**************************************************//
Horseman.prototype.close = function(){
  debug('.close().');
  this.phantom.exit(0);
};


//**************************************************//
// Internals
//**************************************************//
Horseman.prototype.injectjQuery = function(){
  var self = this;
  this.page.evaluate( function( selector ) {
    return (typeof window.jQuery !== "undefined") 
  }, function(err, hasJquery){
    self.pause.unpause("checkJquery");
    if (!hasJquery){
      var jQueryLocation = path.join(__dirname, "../files/jquery-2.1.1.min.js");
   
      self.page.injectJs( jQueryLocation, function( status ){
        self.pause.unpause("injectJquery");
        return self;
      });
      self.pause.pause("injectJquery");
      debug("injected jQuery");
    } else {
      debug("jQuery not injected - already exists on page");
      return self;
    }
    
  });

  this.pause.pause("checkJquery");
 
};

Horseman.prototype.injectClientScripts = function(){
  var self = this;
  for (var i = 0, len = this.options.clientScripts.length; i < len; i++ ){
    this.page.injectJs( this.options.clientScripts[i] );
  }
  return this;
};

Horseman.prototype.untilOnPage = function(check, value, then) {
  var page = this.page;
  var self = this;
  var condition = false;
  var args = [].slice.call(arguments).slice(3);
  var hasCondition = function() {
    args.unshift(function(err,res) {
      if ( err ) throw err;
      condition = res;
      self.pause.unpause('untilOnPage');
    });
    args.unshift(check);
    page.evaluate.apply(page, args);
    self.pause.pause('untilOnPage');
    return condition === value;
  };
  until(hasCondition, this.options.timeout, this.options.interval, then);
};

Horseman.prototype.afterNextPageLoad = function() {
  var count;
  var isUnloaded = function() {
    return (document.readyState !== "complete");
  };
  var isLoaded = function() {
    return (document.readyState === "complete");
  };
  var self = this;
  self.untilOnPage(isUnloaded, true, function(res) {
    if ( res === false ){
      self.page.onTimeout("Timeout period elapsed before page unloaded.");
      self.pause.unpause("afterNextPageLoad");
    } else {
      self.untilOnPage(isLoaded, true, function(res) {
        if ( res === false ){
          self.page.onTimeout("Timeout period elapsed before page load.");
        }
        self.pause.unpause("afterNextPageLoad");
      });
    }
  });
  self.pause.pause("afterNextPageLoad");
  return this;
};

Horseman.prototype.refreshUntilOnPage = function(check, value, delay, then) {
  var page = this.page;
  debug('.wait() checking for condition after refreshing every ' + delay);
  var interval = setInterval(function() {
    page.evaluate(check, function(err, result) {
      if ( err ) throw err;
      if (result === value) {
        debug('.wait() saw value match after refresh');
        clearInterval(interval);
        then();
      } else {
        debug('.wait() refreshing the page (no match on value=' + result + ')');
        page.evaluate(function() {
          document.location.reload(true);
        });
      }
    });
  }, delay);
};

/**
 * Check function until it becomes true.
 *
 * @param {Function} check 
 * @param {Number} timeout
 * @param {Number} interval
 * @param {Function} then
 */

function until(check, timeout, interval, then) {
  var start = Date.now();
  var checker = setInterval(function() {
    var diff = Date.now() - start;
    var res = check();
    if (res || diff > timeout) {
      clearInterval(checker);
      then(res);
    }
  }, interval);
}

/**
 * Attach all the actions.
 */

Object.keys(actions).forEach(function (name) {
  Horseman.prototype[name] = actions[name];
});