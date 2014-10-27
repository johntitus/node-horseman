Horseman
=========

Horseman lets you run [PhantomJS](http://phantomjs.org/) from Node.

It is similar to, and in fact is forked from, [Nightmare](https://github.com/segmentio/nightmare). The primary difference is a simpler way to control the flow of your program and the ability to use CSS3 selectors, thanks to the built-in injection of jQuery.

## Installation

You'll need to install [PhantomJS](http://phantomjs.org/) first. Then,

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
* `timeout`: how long to wait for page loads, default `5000ms`.
* `interval`: how frequently to poll for page load state, default `50ms`.
* `port`: port to mount the phantomjs instance to, default `12301`.
* `weak`: set dnode weak option to `false` to fix cpp compilation for windows users, default `true`.
* `loadImages`: load all inlined images, default `true`.
* `ignoreSSLErrors`: ignores SSL errors, such as expired or self-signed certificate errors, default `true`.
* `sslProtocol`: sets the SSL protocol for secure connections `[sslv3|sslv2|tlsv1|any]`, default `any`.
* `webSecurity`: enables web security and forbids cross-domain XHR, default `true`.

#### .open(url)
Load the page at `url`.

#### .back()
Go back to the previous page.

#### .forward()
Go forward to the next page.

#### .reload()
Refresh the current page.

#### .url(cb)
Get the url of the current page, the signature of the callback is `cb(url)`.

#### .title(cb)
Get the title of the current page, the signature of the callback is `cb(title)`.

#### .visible(selector,cb)
Determines if a selector is visible, or not, on the page. The signature of the callback is `cb(boolean)`.

#### .exists(selector,cb)
Determines if the selector exists, or not, on the page. The signature of the callback is `cb(boolean)`.

#### .click(selector)
Clicks the `selector` element once.

#### .type(selector, text [,options])
Enters the `text` provided into the `selector` element. Options is an object containing `eventType` (keypress, keyup, keydown. Default is keypress) and `modifiers`, which is a string in the formation of `ctrl+shift+alt`.

#### .upload(selector, path)
Specify the `path` to upload into a file input `selector` element.

#### .injectJs(file)
Inject a javascript file onto the page.

#### .evaluate(fn, [arg1, arg2,...])
Invokes `fn` on the page with `args`. On completion it returns a value back up the chain. Useful for extracting information from the page.

#### .wait(ms)
Wait for `ms` milliseconds e.g. `.wait(5000)`

#### .waitForNextPage()
Wait until a page finishes loading, typically after a `.click()`.

#### .waitForSelector(selector)
Wait until the element `selector` is present e.g. `.wait('#pay-button')`

#### .waitFor(fn, value)
Wait until the `fn` evaluated on the page returns `value`. 

#### .screenshot(path)
Saves a screenshot of the current page to the specified `path`. Useful for debugging.

#### .userAgent(userAgent)
Set the `userAgent` used by PhantomJS. You have to set the userAgent before calling `.goto()`.

#### .authentication(user, password)
Set the `user` and `password` for accessing a web page using basic authentication. Be sure to set it before calling `.goto(url)`.

```js
new Horseman()
  .authentication('myUserName','myPassword')
  .goto('http://www.mysecuresite.com');
```

#### .viewport(width, height)
Set the `width` and `height` of the viewport, useful for screenshotting. Weirdly, you have to set the viewport before calling `.goto()`.

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