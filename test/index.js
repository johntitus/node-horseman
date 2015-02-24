var Horseman = require('../lib');
var fs = require('fs');
var path = require('path');
var express = require('express');

var app, server, serverUrl;

function navigation( bool ){
	
	var title = 'Navigation ' + ( (bool) ? 'with' : 'without' ) + ' jQuery';
	
	describe( title, function(){
		var horseman = new Horseman({
			injectJquery : bool
		});

		after( function(){
			horseman.close();
		});

		it('should set the user agent', function(){
			horseman
				.userAgent("Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.124 Safari/537.36")
				.open( serverUrl )
				.evaluate(function(){
					return navigator.userAgent;
				})
				.should.equal("Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.124 Safari/537.36")
		});

		it('should set headers', function(){
			var headers = {
				'X-Horseman-Header' : 'test header'
			};

			var response = JSON.parse( 
					horseman
					.headers( headers )
					.open( 'http://httpbin.org/headers' )
					.evaluate(function(){
						return document.body.children[0].innerHTML;
					})
				);
			response.should.have.property( 'headers' );
			response.headers.should.have.property( 'X-Horseman-Header' );
			response.headers[ 'X-Horseman-Header' ].should.equal( 'test header' );
		});

	    it('should open a page', function() {
	    	horseman
	    		.open( serverUrl )
	    		.url()
				.should.equal( serverUrl );
	    });
	    
	    it('should click a link', function() {
	    	horseman		    	
				.click("a[href='next.html']")
				.waitForNextPage()
				.url()
				.should.equal(serverUrl + "next.html");
	    });
	    
	    it('should go backwards', function() {
	    	horseman		    	
				.back()
				.url()
				.should.equal(serverUrl);
	    });

	    it('should go forwards', function() {
	    	horseman		    	
				.forward()
				.url()
				.should.equal(serverUrl + "next.html");
	    });

	    it('should use basic authentication', function() {
	    	horseman
				.authentication('my','auth')
				.open('http://httpbin.org/basic-auth/my/auth')
				.evaluate( function(){
					return document.body.innerHTML.length;
				})
				.should.be.above(0);
	    });

	    it('should set the viewport', function() {
	    	var size = { width : 400, height: 1000 };
	    	var vp = horseman
				.viewport(size.width, size.height)
				.open('http://www.google.com')
				.viewport();
			vp.height.should.equal(size.height);
			vp.width.should.equal(size.width);
	    });

	    it('should add a cookie', function() {
	    	var cookie = {
    			name : "test",
				value : "cookie",
				domain: 'httpbin.org'
    		};
	    	var body = horseman
	    		.cookies(cookie)
	    		.open("http://httpbin.org/cookies")
				.text("pre");
			
			var result = JSON.parse(body);
			result.cookies[ cookie.name ].should.equal( cookie.value );
	    });

	    it('should clear out all cookies', function() {
	    	var body = horseman
	    		.cookies([])
	    		.open("http://httpbin.org/cookies")
				.text("pre");

			var result = JSON.parse(body);
			Object.keys( result.cookies ).length.should.equal( 0 );
	    });

	    it('should add an array of cookies', function() {
	    	var cookies = [
		    	{
	    			name : "test",
					value : "cookie",
					domain: 'httpbin.org'
	    		},
	    		{
	    			name : "test2",
					value : "cookie2",
					domain: 'httpbin.org'
	    		}
	    	];

	    	var body = horseman
	    		.cookies(cookies)
	    		.open("http://httpbin.org/cookies")
				.text("pre");
				
			var result = JSON.parse(body);
			result.cookies[ cookies[0].name ].should.equal( cookies[0].value );
			result.cookies[ cookies[1].name ].should.equal( cookies[1].value );
	    });

	});
}

function evaluation( bool ){
	var title = 'Evaluation ' + ( (bool) ? 'with' : 'without' ) + ' jQuery';
	
	describe( title, function(){
		var horseman = new Horseman({
			injectJquery : bool
		});

		after( function(){
			horseman.close();
		});

	    it('should get the title', function() {
	      horseman
	      	.open(serverUrl)
	      	.title()
	      	.should.equal('Testing Page');

	    });

	    it('should verify an element exists', function() {
	      horseman
	      	.exists("input")
	      	.should.be.true;
	    });

	    it('should verify an element does not exists', function() {
	 		horseman
	    	  	.exists("article")
	      		.should.be.false;
	    });

	    it('should count the number of selectors', function() {
	 		horseman
	    	  	.count("a")
	      		.should.be.above(0);
	    });

	    it('should get the html of an element', function() {
	 		horseman
	 			.html("#text")
	      		.indexOf("code").should.be.above(0);
	    });

	    it('should get the text of an element', function() {
	 		horseman
	 			.text("#text").trim()
	      		.should.equal("This is my code.");
	    });

	    it('should get the value of an element', function() {
	    	horseman
	      		.value("input[name='input1']")
				.should.equal("");
	    });

	    it('should get an attribute of an element', function() {
	 		horseman
	 			.attribute("a", "href")
	      		.should.equal("next.html");
	    });

	    it('should get a css property of an element', function() {
	 		horseman
	 			.cssProperty("a", "margin-bottom")
	      		.should.equal("3px");
	    });

	    it('should get the width of an element', function() {
	 		horseman
	 			.width("a")
	      		.should.be.above(0);
	    });

	    it('should get the height of an element', function() {
	 		horseman
	 			.width("a")
	      		.should.be.above(0);
	    });

	    it('should determine if an element is visible', function() {
	 		horseman
	 			.visible("a")
	      		.should.be.true;

	      	horseman
	 			.visible(".login-popup")
	      		.should.be.false;
	    });

	    it('should evaluate javascript', function() {
	      	horseman
		      	.evaluate( function(){
		      		return document.title;
		      	})
		      	.should.equal("Testing Page");
	    });

	    it('should evaluate javascript with optional parameters', function() {
	    	var str = "yo";
			horseman
				.evaluate( function(param){
					return param;
				}, str )
				.should.equal( str );
	    });
	});
}

function manipulation( bool ){
	var title = 'Manipulation ' + ( (bool) ? 'with' : 'without' ) + ' jQuery';
	
	describe( title, function(){
		var horseman = new Horseman();

		after( function(){
			horseman.close();
			if ( fs.existsSync("out.png") ){
				fs.unlinkSync("out.png");
			}			
		});

	    it('should execute javascript without breaking the chain', function() {
	      	horseman
		      	.open( serverUrl )
		      	.manipulate( function(){
		      		document.title = "blah";
		      	})
		      	.evaluate( function(){
		      		return document.title;
		      	})
		      	.should.equal("blah");
	    });	    

	    it('should inject javascript', function() {	    	
	     	horseman
		      	.injectJs("test/files/testjs.js")
		      	.evaluate( function(){
		      		return ___obj.myname;
		      	})
		      	.should.equal( "isbob" );
	    });	   

	    it('should type and click', function() {
	      	horseman
	      		.type('input[name="input1"]', 'github')
	      		.value('input[name="input1"]')
	      		.should.equal('github');
	    });

	    it('should clear a field', function() {
	      	horseman
	      		.clear('input[name="input1"]')
	      		.value('input[name="input1"]')
	      		.should.equal("");
	    });

	    it('should select a value', function() {
	      	horseman
	      		.select("#select1","1")
				.value("#select1")
	      		.should.equal("1");
	    });

	    it('should take a screenshot', function() {
		    horseman.screenshot("out.png");
		    fs.existsSync("out.png").should.be.true;
		});

		it('should take a screenshotBase64', function() {
		    var asPng = horseman.screenshotBase64("PNG");
		    var type = typeof asPng;
		    type.should.equal('string');
		});

	    //File upload is broken in Phantomjs 2.0
	    //https://github.com/ariya/phantomjs/issues/12506
		it.skip('should upload a file', function(){
			horseman
		        .upload("#upload","test/files/testjs.js")
		        .value("#upload")
		        .should.equal("C:\\fakepath\\testjs.js");		        
	    });

	    it('should verify a file exists before upload', function(){
	    	var err = horseman
		        .open("http://validator.w3.org/#validate_by_upload")
		        .upload("#uploaded_file","nope.jpg");

		    err.toString().indexOf("Error").should.be.above(-1);
	    });

	    it('should fire a keypress when typing', function() {
	    	horseman
	    		.open("http://httpbin.org/forms/post")
	    		.manipulate(function(){
	    			window.keypresses = 0;
	    			var elem = document.querySelector( "input[name='custname']" );
	    			elem.onkeypress = function(){
	    				window.keypresses++;
	    			}
	    		})	      		
	      		.type("input[name='custname']", "github")
	      		.evaluate(function(){
	      			return window.keypresses;
	      		})
	      		.should.equal(6);
	    });
	});
}


describe('Horseman', function(){
  	this.timeout(20000);

  	before( function( done ){
		app = express();
		var port = process.env.port || 4567;
		app.use(express.static(path.join(__dirname,'files')));
		server = app.listen(port, function() {
	      serverUrl = 'http://localhost:' + port + '/';
	      //console.log('test server listening on port %s', port);
	      done();
	    });
	});

	after( function( done ){
		server.close( done );
	});

	it('should be constructable', function(){
		var horseman = new Horseman();
		horseman.should.be.ok;
		horseman.close();
	});


	navigation( true );
	
	navigation( false );
	
	evaluation( true );
	
	evaluation( false );

	manipulation( true );
	manipulation( false );
	
	describe("Inject jQuery", function(){
		it('should inject jQuery', function(){
			var horseman = new Horseman();

			horseman
				.open("http://www.google.com")
				.evaluate(function(){
					return typeof jQuery;
				})
				.should.equal("function");
			horseman.close();
		});

		it('should not inject jQuery', function(){
			var horseman = new Horseman({
				injectJquery : false
			});

			horseman
				.open("http://www.google.com")
				.evaluate(function(){
					return typeof jQuery;
				})
				.should.equal("undefined");
			horseman.close();
		});

		it('should not stomp on existing jQuery', function(){
			var horseman = new Horseman({
				injectJquery : true
			});
			//Horseman injects 2.1.1
			horseman
				.open("http://www.digg.com")
				.evaluate(function(){
					return jQuery.fn.jquery;
				})
				.should.not.equal("2.1.1");
			horseman.close();
		});

	});

	describe("Waiting", function(){

		var horseman = new Horseman();

		after( function(){
			horseman.close();
		});

		it('should wait for the page to change', function(){
			horseman
				.open( serverUrl )
				.click("a")
				.waitForNextPage()
				.url()
				.should.equal( serverUrl + "next.html" );
		});

		it('should wait until a condition on the page is true', function() {
			var forALink = function () {
				return ($("a:contains('About')").length > 0);
			};

	    	horseman
	        	.open('http://www.google.com/')
	        	.waitFor(forALink,true)
	        	.url()
	        	.should.equal('http://www.google.com/')
	    });

	    it('should wait a set amount of time', function(){
	    	var start = new Date();
	    	horseman.wait(1000);
	    	var end = new Date();
	    	var diff = end - start;
	    	diff.should.be.greaterThan(999); //may be a ms or so off.
	    });

	    it('should wait until a selector is seen', function(){
	    	horseman
	    		.open( serverUrl )
	    		.waitForSelector("input")
	    		.count("input")
	    		.should.be.above( 0 );
	    });

	    it('should call onTimeout if timeout period elapses when waiting for next page', function(){
	    	var timeoutHorseman = new Horseman({
	    		timeout : 10
	    	});

	    	var timeoutFired = false;

			timeoutHorseman
				.on("timeout", function(){
					timeoutFired = true
				})
				.open("http://www.google.com")
				.click("a:contains('Advertising')")
				.waitForNextPage()
				.close();
				
			timeoutFired.should.be.true;
		});

		it('should call onTimeout if timeout period elapses when waiting for selector', function(){
	    	var timeoutHorseman = new Horseman({
	    		timeout : 10
	    	});

	    	var timeoutFired = false;

			timeoutHorseman
				.on("timeout", function(){
					timeoutFired = true
				})
				.open("http://www.google.com")
				.waitForSelector("bob")
				.close();
				
			timeoutFired.should.be.true;
		});

		it('should call onTimeout if timeout period elapses when waiting for fn == value', function(){
	    	var timeoutHorseman = new Horseman({
	    		timeout : 10
	    	});

	    	var timeoutFired = false;

			timeoutHorseman
				.on("timeout", function(){
					timeoutFired = true
				})
				.open("http://www.google.com")
				.waitFor(function(){
					return 5;
				}, 6)
				.close();
				
			timeoutFired.should.be.true;
		});
	});

	/**
   	* events
   	*/
   	
  	describe('Events', function(){    
    	
	    it('should fire an event on initialized', function() {
			var fired = false;
			var horseman = new Horseman();
			horseman
				.on("initialized", function(){
				  fired = true;
				})
				.open( serverUrl );

			fired.should.be.true;
			horseman.close();
	    });
	    
	    it('should fire an event on load started', function() {
	      	var fired = false;
	      	var horseman = new Horseman();
			horseman
				.on("loadStarted", function(){          
				  fired = true;
				})
				.open( serverUrl );
	      	fired.should.be.true;
	      	horseman.close();
	    });

	    it('should fire an event on load finished', function() {
	      	var fired = false;
	      	var horseman = new Horseman();
			horseman
				.on("loadFinished", function(){          
				  fired = true;
				})
				.open( serverUrl );
	      	fired.should.be.true;
	      	horseman.close();
	    });

	    it('should fire an event when a resource is requested', function() {
	      	var fired = false;
	      	var horseman = new Horseman();
			horseman
				.on("resourceRequested", function(){          
				  fired = true;
				})
				.open( serverUrl );
	      	fired.should.be.true;
	      	horseman.close();
	    });

	    it('should fire an event when a resource is received', function() {
	      	var fired = false;
	      	var horseman = new Horseman();
			horseman
				.on("resourceReceived", function(){          
				  fired = true;
				})
				.open( serverUrl );
	      	fired.should.be.true;
	      	horseman.close();
	    });

	    it('should fire an event when navigation requested', function() {
	      	var fired = false;
	      	var horseman = new Horseman();
			horseman
				.on("navigationRequested", function( url ){          
				  fired = (url==="https://www.yahoo.com/");
				})
				.open("http://www.yahoo.com");
	      	fired.should.be.true;
	      	horseman.close();
	    });

	    it('should fire an event when the url changes', function() {
	      	var fired = false;
	      	var horseman = new Horseman();
			horseman
				.on("urlChanged", function( url ){          
				  fired = true;
				})
				.open( serverUrl );
	      	fired.should.be.true;
	      	horseman.close();
	    });

	    it('should fire an event when a console message is seen', function() {
	      	var fired = false;
	      	var horseman = new Horseman();
			horseman
				.on("consoleMessage", function(){          
				  fired = true;
				})
				.open( serverUrl )
				.evaluate( function(){
					console.log("message");
				});
	      	fired.should.be.true;
	      	horseman.close();
	    });

	    it('should fire an event when an alert is seen', function() {
	      	var fired = false;
	      	var horseman = new Horseman();
			horseman
				.on("alert", function(){          
				  fired = true;
				})
				.open( serverUrl )
				.evaluate( function(){
					alert("onno");
				});
	      	fired.should.be.true;
	      	horseman.close();
	    });

	    it('should fire an event when a prompt is seen', function() {
	      	var fired = false;
	      	var horseman = new Horseman();
			horseman
				.on("prompt", function(){          
				  fired = true;
				})
				.open( serverUrl )
				.evaluate( function(){
					prompt("onno");
				});
	      	fired.should.be.true;
	      	horseman.close();
	    });

	});

});