var clone = require('clone');
var defaults = require('defaults');
var phantom = require("phantom");
var deasync = require("deasync");
var path = require("path");
var actions = require("./actions");
var noop = function(){};

/**
 * Expose `Creeper`.
 */
module.exports = Creeper;

/**
 * Default options.
 */
var DEFAULTS = {
  timeout: 5000,
  interval: 50,
  port: 12303,
  weak : true,
  clientScripts : [],
  ignoreSSLErrors : true,
  loadImages : true,
  sslProtocol : "any", //sslv3, sslv2, tlsv1, any
  webSecurity : true
};

/**
 * Initialize a new `Creeper`.
 *
 * @param {Object} options
 */
function Creeper (options) {
  DEFAULTS.port++;
  if (!(this instanceof Creeper)) return new Creeper(options);
  this.options = defaults(clone(options) || {}, DEFAULTS);

  var self = this;

  //console.log('.setup() creating phantom instance on port %s', port);
  
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
      done = true;
    });
  });

  var done = false;
  
  
  phantom.create.apply( phantom, phantomArgs );  
  
  while(!done){
    deasync.runLoopOnce();
  }


  this.page.set("onLoadFinished", function(){
    self.injectjQuery();
    self.injectClientScripts();
  });

  this.page.onTimeout = noop;
 
};

//**************************************************//
// Cleanup
//**************************************************//
Creeper.prototype.close = function(){
  this.options.port++;
  DEFAULTS.port++;
  this.phantom.exit(0);  
};


//**************************************************//
// Internals
//**************************************************//
Creeper.prototype.injectjQuery = function(){
  var jQueryLocation = path.join(__dirname, "../files/jquery-2.1.1.min.js");

  this.page.injectJs( jQueryLocation );      
  
  return this;
};

Creeper.prototype.injectClientScripts = function(){
  var self = this;
  for (var i = 0, len = this.options.clientScripts.length; i < len; i++ ){
    this.page.injectJs( this.options.clientScripts[i] );
  }
  return this;
};

Creeper.prototype.untilOnPage = function(check, value, then) {
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

Creeper.prototype.afterNextPageLoad = function() {
  var done = false;
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
      done = true;
    } else {
      self.untilOnPage(isLoaded, true, function(res) {
        if ( res === false ){
          self.page.onTimeout("Timeout period elapsed before page load.");
        }
        done=true;
      });
    }
  });
  while(!done){
    deasync.runLoopOnce();
  }
  return this;
};

Creeper.prototype.refreshUntilOnPage = function(check, value, delay, then) {
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
  Creeper.prototype[name] = actions[name];
});