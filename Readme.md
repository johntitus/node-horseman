Horseman
=========

Horseman lets you run [PhantomJS](http://phantomjs.org/) from Node.

Horseman has:
  * a simple, chainable API, like jQuery,
  * an easy-to-use control flow (see the examples),
  * support for multiple tabs open at the same time.

Additionally, Horseman loads [jQuery](http://jquery.com/) onto each page by default, which means you can use it inside your `evaluate` and `manipulate` functions automatically.

## Installation
1) Install Node, if you haven't already:

http://nodejs.org/

2) Install PhantomJS:

http://phantomjs.org/download.html 

Either the 1.x or 2.x versions are fine, but be aware that PhantomJS has a bug in the 2.x line that prevents file uploads.

*Note*: Make sure PhantomJS is available in your system PATH, or use the `phantomPath` option.

3) NPM install Horseman:

`npm install node-horseman`

## Example

Search on Google:

```js
var Horseman = require('node-horseman');
var horseman = new Horseman();

var numLinks = horseman
  .userAgent("Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0")
  .open('http://www.google.com')
  .type('input[name="q"]', 'github')
  .click("button:contains('Google Search')")
  .waitForNextPage()
  .count("li.g");

console.log("Number of links: " + numLinks);

horseman.close();
```
Save the file as `google.js`. Then, `node google.js`.

For longer examples, check out the Examples folder.

## API

#### new Horseman(options)
Create a new instance that can navigate around the web.

The available options are:
* `clientScripts` an array of local javascript files to load onto each page.
* `timeout`: how long to wait for page loads or wait periods, default `5000` ms.
* `interval`: how frequently to poll for page load state, default `50` ms.
* `port`: port to mount the phantomjs instance to, default `12401`.
* `loadImages`: load all inlined images, default `true`.
* `cookiesFile`: A file where to store/use cookies.
* `ignoreSSLErrors`: ignores SSL errors, such as expired or self-signed certificate errors, default `true`.
* `sslProtocol`: sets the SSL protocol for secure connections `[sslv3|sslv2|tlsv1|any]`, default `any`.
* `webSecurity`: enables web security and forbids cross-domain XHR, default `true`.
* `injectJquery`: whether or not jQuery is automatically loaded into each page. Default is `true`. If jQuery is already present on the page, it is not injected.
* `proxy`: specify the proxy server to use `address:port`, default not set.
* `proxyType`: specify the proxy server type `[http|socks5|none]`, default not set.
* `proxyAuth`: specify the auth information for the proxy `user:pass`, default not set.
* `phantomPath`: If PhantomJS is not installed in your path, you can use this option to specify the executable's location.

### Cleanup
Be sure to `.close()` each Horseman instance when you're done with it!.

####.close()
Closes the Horseman instance by shutting down PhantomJS.

### Navigation

#### .open(url)
Load the page at `url`.

#### .post(url, postData)
POST `postData` to the page at `url`.

#### .back()
Go back to the previous page.

#### .forward()
Go forward to the next page.

#### .reload()
Refresh the current page.

#### .status()
Returns the HTTP status code of the last opened page.

```js
var status = horseman
  .open('http://www.reddit.com')
  .status(); // returns 200
```

#### .switchToChildFrame( selector )
Switches focus to the child frame specified by the `selector`.

#### .cookies([object|array of objects])
Without any options, this function will return all the cookies inside the browser.

```js
var cookies = horseman
  .open('http://httpbin.org/cookies')
  .cookies();

console.log( cookies ); // []
```

You can pass in a cookie object to add to the cookie jar.

```js
var cookies = horseman
  .cookies({
    name : "test",
    value : "cookie",
    domain: 'google.org'
  })
  .open('http://httpbin.org/cookies')
  .cookies();

console.log( cookies ); 
/*
[ { domain: '.httpbin.org',
    httponly: false,
    name: 'test',
    path: '/',
    secure: false,
    value: 'cookie' } ]
*/
```

You can pass in an array of cookie objects to reset all the cookies in the cookie jar (or pass an empty array to remove all cookies).

```js
var cookies = horseman
  .cookies([
  {
    name : "test2",
    value : "cookie2",
    domain: 'httpbin.org'
  },
  {
    name : "test3",
    value : "cookie3",
    domain: 'httpbin.org'
  }])
  .open('http://httpbin.org/cookies')
  .cookies();

console.log( cookies.length ); // 2
```

#### .userAgent(userAgent)
Set the `userAgent` used by PhantomJS. You have to set the userAgent before calling `.open()`.

#### .headers(headers)
Set the `headers` used when requesting a page. The headers are a javascript object.  You have to set the headers before calling `.open()`.

#### .authentication(user, password)
Set the `user` and `password` for accessing a web page using basic authentication. Be sure to set it before calling `.open(url)`.

```js
new Horseman()
  .authentication('myUserName','myPassword')
  .open('http://www.mysecuresite.com');
```
#### .viewport(width, height)
Set the `width` and `height` of the viewport, useful for screenshotting. You have to set the viewport before calling `.open()`.

#### .scrollTo(top, left)
Scroll to a position on the page, relative to the top left corner of the document.

#### .zoom(zoomFactor)
Set the amount of zoom on a page.  The default zoomFactor is 1. To zoom to 200%, use a zoomFactor of 2.  Combine this with `viewport` to produce high DPI screenshots.

```js
horseman
  .viewport(3200,1800)
  .zoom(2)
  .open('http://www.horsemanjs.org')
  .screenshot('big.png')
```

### Tabs

Horseman lets you open multiple tabs, just like you probably do in a real browser.  Also, any anchors elements with a target will open in a new tab.

Whenever a new tab is opened, either programatically or because of an action on the page (like `window.open`), a `tabCreated` event will fire.

#### .tabCount()
Get the number of open tabs.

#### .switchToTab( tabNumber ){
Switch to the desired `tabNumber`. The first tab is number 0.

#### .openTab( [url] ){
Opens a new tab. Optionally, pass in a `url` and the new tab will automatically go that url.


### Evaluation

Evaluation elements return information from the page, and end the Horseman API chain.

#### .title()
Get the title of the current page.

#### .url()
Get the url of the current page.

#### .visible(selector)
Determines if a selector is visible, or not, on the page. Returns a boolean.

#### .exists(selector)
Determines if the selector exists, or not, on the page. Returns a boolean.

#### .count(selector)
Counts the number of `selector` on the page. Returns a number.

#### .html([selector])
Gets the html inside of an element. If no `selector` is provided, it returns the html of the entire page.

#### .text(selector)
Gets the text inside of an element.

#### .value(selector, [val])
Get, or set, the value of an element.

#### .attribute(selector, attribute)
Gets an attribute of an element.

#### .cssProperty(selector, property)
Gets a CSS property of an element.

#### .width(selector)
Gets the width of an element.

#### .height(selector)
Gets the height of an element.

#### .screenshot(path)
Saves a screenshot of the current page to the specified `path`. Useful for debugging.

#### .screenshotBase64(type)
Returns a base64 encoded string representing the screenshot. Type must be one of 'PNG', 'GIF', or 'JPEG'.

#### .pdf(path, [paperSize])
Renders the page as a PDF. The default paperSize is [US Letter](http://en.wikipedia.org/wiki/Letter_%28paper_size%29).

The `paperSize` object should be in either this format: 
```js
{
  width: '200px',
  height: '300px',
  margin: '0px'
}
```
or this format
```js
{
  format: 'A4',
  orientation: 'portrait',
  margin: '1cm'
}
```
Supported formats are: `A3`, `A4`, `A5`, `Legal`, `Letter`, `Tabloid`.

Orientation (`portrait`, `landscape`) is optional and defaults to 'portrait'.

Supported dimension units are: 'mm', 'cm', 'in', 'px'. No unit means 'px'.

#### .crop(selector | boundingRectangle, path)
Takes a screenshot of a portion of the page. You can pass in either a CSS selector or a boundingRectangle `{ top : 50, left: 200, width: 90, height: 200 }`.

```js

var horseman = new Horseman();

horseman  
  .open("http://www.yahoo.com")
  .crop(".logo-container", "yahoologo.png");

horseman.close();
```

####.evaluate(fn, [arg1, arg2,...])
Invokes fn on the page with args. On completion it returns a value. Useful for extracting information from the page.

```js
var size = horseman
  .open("http://en.wikipedia.org/wiki/Headless_Horseman")
  .evaluate( function(selector){
    // This code is executed inside the browser.
    // It's sandboxed from Node, and has no access to anything
    // in Node scope, unless you pass it in, like we did with "selector".
    //
    // You do have access to jQuery, via $, automatically.
    return {
      height : $( selector ).height(),
      width : $( selector ).width()
    }
  }, ".thumbimage");

console.log( size );
horseman.close();
```

### Manipulation
These functions change the page, and can be chained consecutively.

#### .manipulate(fn, [arg1, arg2,...])
Works the same as .evaluate(), but doesn't return a value, so it can be used without interrupting the Horseman API chain.

```js
var count = horseman
  .open("http://en.wikipedia.org/wiki/Headless_Horseman")
  .count( selector ); //.count() ends the API chain

console.log( count ); // -> 2

count = horseman
  .manipulate( function( selector){
    $(selector).each( function(){
      $(this).remove();
    })
  }, selector)
  .count( selector );

console.log( count );// -> 0
```

#### .click(selector)
Clicks the `selector` element once.

#### .select(selector, value)
Sets the value of a `select` element to `value`.

#### .clear(selector)
Sets the value of an element to `""`.

#### .type(selector, text [,options])
Enters the `text` provided into the `selector` element. Options is an object containing `eventType` (keypress, keyup, keydown. Default is keypress) and `modifiers`, which is a string in the formation of `ctrl+shift+alt`.

#### .upload(selector, path)
Specify the `path` to upload into a file input `selector` element.

#### .injectJs(file)
Inject a javascript file onto the page.

#### .mouseEvent( type, [, x, y, button] )
Send a mouse event to the page. Each event is sent to the page as if it comes from real user interaction. `type` must be one of "mouseup", "mousedown", "mousemove", "doubleclick", or "click", which is the default.  `x` and `y` are optional and specify the location on the page to send the mouse event. `button` is also optional, and defaults to "left".

#### .keyboardEvent( type, key [, modifier ] )
Send a keyboard event to the page. Each event is sent to the page as if it comes from real user interaction. `type` must be one of "keyup", "keydown", or "keypress", which is the default. `key` should be a numerical value from [this page](https://github.com/ariya/phantomjs/commit/cab2635e66d74b7e665c44400b8b20a8f225153a). For instance, to send an "enter" key press, use `.keyboardEvent("keypress",16777221)`. 

`modifier` is optional, and comes from this list:
  * 0x02000000: A Shift key on the keyboard is pressed
  * 0x04000000: A Ctrl key on the keyboard is pressed
  * 0x08000000: An Alt key on the keyboard is pressed
  * 0x10000000: A Meta key on the keyboard is pressed
  * 0x20000000: A keypad button is pressed

To send a shift+p event, you would use `.keyboardEvent("keypress","p",0x02000000)`.

### Waiting
These functions for the browser to wait for an event to occur. If the event does not occur before the timeout period (configurable via the options), a timeout event will fire.

#### .wait(ms)
Wait for `ms` milliseconds e.g. `.wait(5000)`

#### .waitForNextPage()
Wait until a page finishes loading, typically after a `.click()`.

#### .waitForSelector(selector)
Wait until the element `selector` is present e.g. `.waitForSelector('#pay-button')`

#### .waitFor(fn, value)
Wait until the `fn` evaluated on the page returns `value`. 


### Events

#### .on(event, callback)
Respond to page events with the callback. Be sure to set these before calling `.open()`. 

Supported events are:
* `initialized` - callback()
* `loadStarted` - callback()
* `loadFinished` - callback(status)
* `tabCreated` - callback()
* `urlChanged` - callback(targetUrl)
* `navigationRequested` - callback(url, type, willNavigate, main)
* `resourceRequested` - callback(requestData, networkRequest)
* `resourceReceived` - callback(response)
* `consoleMessage` - callback(msg, lineNumber, sourceId)
* `alert` - callback(msg)
* `confirm` - callback(msg)
* `prompt` - callback(msg, defaultValue)
* `error` - callback(msg, trace)
* `timeout` - callback(msg) - Fired when a wait timeout period elapses.

For a more in depth description, see [the full callbacks list for phantomjs](https://github.com/ariya/phantomjs/wiki/API-Reference-WebPage#callbacks-list).

```js
horseman
  .on('consoleMessage', function( msg ){
    console.log(msg);
  })
```

#### Debug
To run the same file with debugging output, run it like this `DEBUG=horseman node myfile.js`.

This will print out some additional information about what's going on:

```bash
horseman .setup() creating phantom instance on port 12406 +0ms
horseman load finished, injecting jquery and client scripts +401ms
horseman injected jQuery +0ms
horseman .open: http://www.google.com +66ms
horseman .type() horseman into input[name='q'] +51ms
```

#### Tests
Automated tests for Horseman itself are run using [Mocha](http://visionmedia.github.io/mocha/) and [Should](https://github.com/shouldjs/should.js), both of which will be installed via `npm install`. To run Horseman's tests, just do `npm test`.

When the tests are done, you'll see something like this:

```bash
npm test
  85 passing (37s)
  2 pending

```

## License (MIT)

```
WWWWWW||WWWWWW
 W W W||W W W
      ||
    ( OO )__________
     /  |           \
    /o o|    MIT     \
    \___/||_||__||_|| *
         || ||  || ||
        _||_|| _||_||
       (__|__|(__|__|
```

Copyright (c) John Titus <john.titus@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.