var clone = require('clone');
var defaults = require('defaults');
var phantom = require("phantom");
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

  debug('.setup() creating phantom instance on port %s', this.options.port);
  
  var phantomArgs = [
    "--ignore-ssl-errors=" + this.options.ignoreSSLErrors,
    "--load-images=" + this.options.loadImages,
    "--ssl-protocol=" + this.options.sslProtocol,
    "--web-security=" + this.options.webSecurity,
    { 
      port: this.options.port, 
      dnodeOpts : { weak : this.options.weak }
    }
  ];

  phantomArgs.unshift( function( instance ){
    self.phantom = instance;
    self.phantom.createPage( function( page ){
      self.page = page;
      self.page.set("viewportSize",{
        width: 1200,
        height: 800
      });
      self.pause.unpause("creating");
    });
  });
  
  phantom.create.apply( phantom, phantomArgs );  
  
  this.pause.pause("creating");

  this.page.set("onLoadFinished", function(){
    debug("load finished, injecting jquery and client scripts");
    if ( self.options.injectJquery ){
      self.injectjQuery();
    } else {
      self.pause.unpause("injectJquery");
    }
    self.injectClientScripts();
  });

  this.page.onTimeout = noop;
 
};

//**************************************************//
// Cleanup
//**************************************************//
Horseman.prototype.close = function(){
  this.options.port++;
  DEFAULTS.port++;
  this.phantom.exit(0);  
};


//**************************************************//
// Internals
//**************************************************//
Horseman.prototype.injectjQuery = function(){
  var self = this;
  this.page.evaluate( function( selector ) {
    return (typeof window.jQuery !== "undefined") 
  }, function(hasJquery){
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
  var condition = false;
  var args = [].slice.call(arguments).slice(3);
  var hasCondition = function() {
    args.unshift(function(res) {
      condition = res;
    });
    args.unshift(check);
    page.evaluate.apply(page, args);
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
    page.evaluate(check, function(result) {
      if (result === value) {
        debug('.wait() saw value match after refresh');
        clearInterval(interval);
        then();
      }
      else {
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