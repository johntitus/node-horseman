Horseman
=========

Horseman lets you run [PhantomJS](http://phantomjs.org/) from Node.

Horseman is similar to, and is forked from, [Nightmare](https://github.com/segmentio/nightmare). The primary difference is a simpler way to control the flow of your program.

Additionally, Horseman automatically loads [jQuery](http://jquery.com/) onto each page, which means you can use it inside your `evaluate` and `manipulate` functions automatically.

## Installation
1) Install Node, if you haven't already:

http://nodejs.org/

2) Install PhantomJS:

http://phantomjs.org/download.html 

3) NPM install Horseman:

`npm install node-horseman`

## Examples

Search on Google:

```js
var Horseman = require('node-horseman');
var horseman = new Horseman();

var numLinks = horseman
  .open('http://www.google.com')
  .type('input[name="q"]', 'github')
  .click('button[aria-label="Google Search"]')
  .waitForNextPage()
  .count("li.g");

console.log("Number of links: " + numLinks);

horseman.close();
```

## API

#### new Horseman(options)
Create a new instance that can navigate around the web.

The available options are:
* `clientScripts` an array of local javascript files to load onto each page.
* `timeout`: how long to wait for page loads or wait periods, default `5000` ms.
* `interval`: how frequently to poll for page load state, default `50` ms.
* `port`: port to mount the phantomjs instance to, default `12401`.
* `weak`: set dnode weak option to `false` to fix cpp compilation for windows users, default `true`.
* `loadImages`: load all inlined images, default `true`.
* `ignoreSSLErrors`: ignores SSL errors, such as expired or self-signed certificate errors, default `true`.
* `sslProtocol`: sets the SSL protocol for secure connections `[sslv3|sslv2|tlsv1|any]`, default `any`.
* `webSecurity`: enables web security and forbids cross-domain XHR, default `true`.

### Navigation

#### .open(url)
Load the page at `url`.

#### .back()
Go back to the previous page.

#### .forward()
Go forward to the next page.

#### .reload()
Refresh the current page.



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

#### .authentication(user, password)
Set the `user` and `password` for accessing a web page using basic authentication. Be sure to set it before calling `.open(url)`.

```js
new Horseman()
  .authentication('myUserName','myPassword')
  .open('http://www.mysecuresite.com');
```
#### .viewport(width, height)
Set the `width` and `height` of the viewport, useful for screenshotting. You have to set the viewport before calling `.open()`.


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

####.evaluate(fn, [arg1, arg2,...])
Invokes fn on the page with args. On completion it returns a value. Useful for extracting information from the page.

### Manipulation
These functions change the page, and can be changed consecutively.

#### .manipulate(fn, [arg1, arg2,...])
Invokes fn on the page with args. Does not return a value. Useful for changing something on the page.

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

#### .evaluate(fn, [arg1, arg2,...])
Invokes `fn` on the page with `args`. On completion it returns a value back up the chain. Useful for extracting information from the page.

### Waiting
These functions for the browser to wait for an event to occur. If the event does not occur before the timeout period (configurable via the options), a timeout event will fire.

#### .wait(ms)
Wait for `ms` milliseconds e.g. `.wait(5000)`

#### .waitForNextPage()
Wait until a page finishes loading, typically after a `.click()`.

#### .waitForSelector(selector)
Wait until the element `selector` is present e.g. `.wait('#pay-button')`

#### .waitFor(fn, value)
Wait until the `fn` evaluated on the page returns `value`. 


### Events

#### .on(event, callback)
Respond to page events with the callback. Supported events are:
* `initialized` - callback()
* `loadStarted` - callback()
* `loadFinished` - callback(status)
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
}



#### Debug
To run the same file with debugging output, run it like this `DEBUG=horseman node myfile.js`.

This will print out some additional information about what's going on:

```bash

```

#### Tests
Automated tests for Horseman itself are run using [Mocha](http://visionmedia.github.io/mocha/) and [Should](https://github.com/shouldjs/should.js), both of which will be installed via `npm install`. To run Horseman's tests, just do `npm test`.

When the tests are done, you'll see something like this:

```bash
make test
  ․․․․․․․․․․․․․․․․․
  28 passing (46s)
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