# Change Log
All notable changes to this project will be documented in this file.

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