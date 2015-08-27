# Change Log
All notable changes to this project will be documented in this file.

##1.5.7 - 2015-08-27
### Fixed
- #41. onConfirm now lets you return true to click ok, return false to click cancel.
### Changed
- Upgraded to `node-phantom-simple` 2.0.4.

##1.5.6 - 2015-08-17
### Fixed
- #39. Upgraded to node-phantom-simple 2.0.3.

##1.5.5 - 2015-08-12
### Changed
- Upgraded to node-phantom-simple 2.0.2. Close #37.
- Upgraded to Mocha 2.2.5 to remove "child_process: customFds option is deprecated, use stdio instead" message when testing.
- Edited this document to reflect actual release dates from 1.4.1 - present.

##1.5.4 - 2015-07-22
### Fixed
- Merges #36 - Setting via horseman.value( newVal ) now fires a change event. Thanks @fpinzn.

##1.5.3 - 2015-07-13
### Fixed
- Fix #27 & 33 - .cookies() wasn't returning a list of cookies for the current page. Now fixed.

##1.5.2 - 2015-07-01
### Fixed
- Fix #30 - crop() now chainable. Thanks @jackstrain.

##1.5.1 - 2015-03-10
### Fixed
- Readme issue

##1.5.0 - 2015-03-10
### Added
- switchToChildFrame() (issue #18, thanks @easyrider)

##1.4.1 - 2015-03-04
### Fixed
- Readme issue

##1.4.0 - 2015-03-04
### Added
- keyboardEvent function
- mouseEvent function
- exposed `phantomPath` instantiation option

##1.3.6 - 2015-03-03
### Added
- status function.
- post function.

##1.3.5 - 2015-03-02
### Fixed
- Updated documentation to address issues #12 and #14.

##1.3.4 - 2015-02-27
### Fixed
- Forgot to merge cookiesFile branch :(

##1.3.3 - 2015-02-27
### Added
- Exposes `cookiesFile` option. (Issue #8).

##1.3.2 - 2015-02-27
### Fixed
- Removed `weak` option from Readme.md (issue #10).
- Fixed horseman.close() bug. (issue #11)

##1.3.1 - 2015-02-27
### Fixed
- Copyright years in LICENSE (thanks @fay-jai)
- .waitForSelector() text in Readme.me (issue #7. thanks @bchr02)

##1.3.0 - 2015-02-26
### Added
- tabCount function.
- switchToTab function.
- openTab function.
- tabCreated event.

##1.2.2 - 2015-02-26
### Fixed
- Phantom options, like `loadImages` were not being honored in 1.2.1.

##1.2.1 - 2015-02-26
### Changed
- Swapped out `phantom` for `node-phantom-simple` to fix some performance issues (see issue #6).  This a major change internally, but does not change the API and all tests are passing.

##1.2.0 - 2015-02-24
### Added
- zoom function.
- pdf function.
- scrollTo function.
- headers function.

##1.1.0 - 2015-02-24
### Added
- screenshotBase64 function.
- CHANGELOG.md

##1.0.0 - 2015-02-12