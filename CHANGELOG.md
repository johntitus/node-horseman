# Change Log
All notable changes to this project will be documented in this file.

## 3.2.0 - 2016-10-21
### Added
- `diskCache` and `diskCachePath` options - thanks @efernandesng

## 3.1.1 - 2016-06-17
Republish 3.1.0 without unwanted files which broke Windows installation

## 3.1.0 - 2016-06-15
### Added
- .plainText() action - thanks @mzhangARS

### Changed
- Removed `port` constructor option (it no longer had any effect)

## 3.0.1 - 2016-04-12
### Fixed
- .injectJs() now properly rejects when it fails
- #158 - bug with `injectBluebird` option

## 3.0.0 - 2016-04-06
### Added
- Support for adding custom actions via `Horseman.registerAction`

## 3.0.0-beta2 - 2016-04-05
### Added
- .closeTab() action removes a tab and closes its page
- tabClosed event fired when a tab is closed
  (by .closeTab() or something else)
- .frameName() action
- .frameCount() action
- .frameNames() action
- .switchToFocusedFrame() action
- .switchToFrame() action
- .switchToMainFrame() action
- .switchToParentFrame() action
- .download() action allows getting the raw contents of a URL
  (even works for binary files is using PhantomJS 2 or newer)

### Changed
- .log() now preserves resolution value of previous action
- More output added to verbose debugging

### Fixed
- More readable stack traces from .evaluate() rejections
  (especially with long stack traces on)
- Occasional bug with returning undefined in .evaluate() function

### Deprecated
- .switchToChildFrame() action is deprecated
  since PhantomJS deprecated it

## 3.0.0-beta1 - 2016-03-22
### Added
- bluebird 3 functions are now chainable with Horseman actions
- Support for callback/Promises in .evaluate() functions
- .at() action allows registering callbacks to run in PhantomJS JavaScript
  environment (see Reame for details)
- .setProxy() action allows changing Phantom's proxy settings
  (requires PhantomJS 2.0.0 or newer)
- .includeJs() action allows injecting JavaScript from a URL
- .put() action
- Support for SlimerJS as well as PhantomJS - thanks @w33ble
- Support for PhantomJS remote debugger - thanks @dustinblackman
- Support for reading cookies.txt files
- Options for injecting bluebird into each page for using Promises in browser
- Option for automatically switching to newly opened tabs
- Option for more verbose debug

### Changed
- Horseman Promises now reject on error
- Waiting actions now reject on timeout (timeout callback is still called too)
- Phantom's reourceTimeout now set to match Horseman's timeout
- Horseman will use Phantom from the phantomjs-prebuilt/phantomjs npm packages
  if installed (still overridden by phantomPath option)

### Fixed
- .open() now rejects on fail - thanks @w33ble.
- .crop() now works with zoomFactor other than 1 - thanks @wong2.
- .waitForSelector() now uses JQuery for selectors (when avialable)
- navigationRequested callback now called with correct parameters -
  thanks @grahamkennery.
- Tabs/pages not opened by Horseman (e.g. by a link)
  are now correctly added to Horseman's list of tabs

### Updated
- bluebird dependency to 3.0.1
- node-phantom-simple dependency to 2.2.4
- clone dependency to 1.0.2

## 2.8.2 - 2015-11-23
### Fixed
- #74 - do not try to exit PhantomJS when it failed to initialize

## 2.8.1 - 2015-11-06
### Fixed
- .upload() now works in PhantomJS 1.x line (still broken in 2.x line) -
  thanks @flashhhh
- logging for falsy arguments - thanks @awlayton

## 2.8.0 - 2015-10-28
### Added
- .cropBase64(). Thanks @jeprojects!

### Updated
- node-phantom-simple dependency to version 2.1.0.
- Updated readme with examples on how to set header/footer contents.

## 2.7.1 - 2015-10-21
### Fixed
- If an exception was thrown, close() wouldn't get called. Merged #58.
  Thanks @awlayton!

## 2.7.0 - 2015-10-15
### Updated
- Makes promise functions (like then, catch, tap) chainable with the rest of
  Horseman actions. Merges #57. Thanks @awlayton!

## 2.6.0 - 2015-10-08
### Updated
- .close() is now chainable. Updated readme with examples.

## 2.5.0 - 2015-10-08
### Added
- .log(). Closes #54.

### Fixed
- .viewport() wasn't returning the actual viewport size.

## 2.4.0 - 2015-10-08
### Added
- .do(). Closes #53.

## 2.3.0 - 2015-10-01
### Added
- Support for multiple tabs. Closes #49.
- .status(). Returns the HTTP status code from the last opened page.

## 2.2.1 - 2015-10-01
### Fixed
- `.waitFor` bug fix. Closes #45.

## 2.2.0 - 2015-09-29
### Added
- `.crop()`. Closes #51.

## 2.1.0 - 2015-09-27
### Added
- API is chainable again, thanks to @awlayton. Addresses #46.

## 2.0.2 - 2015-09-21
### Fixed
- `waitForNextPage` was broken. Fixes #44 (thanks @edge)

## 2.0.1 - 2015-09-14
### Upgraded
- Moved to `node-phantom-simple` 2.0.4.

## 2.0.0 - 2015-09-10
### Changed
- Complete API rewrite to use Promises.
- Removed dependency on `deasync`.
- Tab support removed, will add back in the future.

## 1.5.6 - 2015-08-17
### Fixed
- #39. Upgraded to node-phantom-simple 2.0.3.

## 1.5.5 - 2015-08-12
### Changed
- Upgraded to node-phantom-simple 2.0.2. Close #37.
- Upgraded to Mocha 2.2.5 to remove "child_process: customFds option is
  deprecated, use stdio instead" message when testing.
- Edited this document to reflect actual release dates from 1.4.1 - present.

## 1.5.4 - 2015-07-22
### Fixed
- Merges #36 - Setting via horseman.value( newVal ) now fires a change event.
  Thanks @fpinzn.

## 1.5.3 - 2015-07-13
### Fixed
- Fix #27 & 33 - .cookies() wasn't returning a list of cookies for the current
  page. Now fixed.

## 1.5.2 - 2015-07-01
### Fixed
- Fix #30 - crop() now chainable. Thanks @jackstrain.

## 1.5.1 - 2015-03-10
### Fixed
- Readme issue

## 1.5.0 - 2015-03-10
### Added
- switchToChildFrame() (issue #18, thanks @easyrider)

## 1.4.1 - 2015-03-04
### Fixed
- Readme issue

## 1.4.0 - 2015-03-04
### Added
- keyboardEvent function
- mouseEvent function
- exposed `phantomPath` instantiation option

## 1.3.6 - 2015-03-03
### Added
- status function.
- post function.

## 1.3.5 - 2015-03-02
### Fixed
- Updated documentation to address issues #12 and #14.

## 1.3.4 - 2015-02-27
### Fixed
- Forgot to merge cookiesFile branch :(

## 1.3.3 - 2015-02-27
### Added
- Exposes `cookiesFile` option. (Issue #8).

## 1.3.2 - 2015-02-27
### Fixed
- Removed `weak` option from Readme.md (issue #10).
- Fixed horseman.close() bug. (issue #11)

## 1.3.1 - 2015-02-27
### Fixed
- Copyright years in LICENSE (thanks @fay-jai)
- .waitForSelector() text in Readme.me (issue #7. thanks @bchr02)

## 1.3.0 - 2015-02-26
### Added
- tabCount function.
- switchToTab function.
- openTab function.
- tabCreated event.

## 1.2.2 - 2015-02-26
### Fixed
- Phantom options, like `loadImages` were not being honored in 1.2.1.

## 1.2.1 - 2015-02-26
### Changed
- Swapped out `phantom` for `node-phantom-simple` to fix some performance
  issues (see issue #6).  This a major change internally,
  but does not change the API and all tests are passing.

## 1.2.0 - 2015-02-24
### Added
- zoom function.
- pdf function.
- scrollTo function.
- headers function.

## 1.1.0 - 2015-02-24
### Added
- screenshotBase64 function.
- CHANGELOG.md

## 1.0.0 - 2015-02-12
