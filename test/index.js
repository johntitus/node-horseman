var Horseman = require('../lib');
var fs = require("fs");

describe('Horseman', function(){
  	this.timeout(20000);

	it('should be constructable', function(){
		var horseman = new Horseman();
		horseman.should.be.ok;
		horseman.close();
	});

	describe('Navigation', function(){
		var horseman = new Horseman();

		after( function(){
			horseman.close();
		});

		it('should set the user agent', function(){
			horseman
				.userAgent("Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.124 Safari/537.36")
				.open("http://www.google.com")
				.evaluate(function(){
					return navigator.userAgent;
				})
				.should.equal("Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.124 Safari/537.36")
		})
	    it('should open a page', function() {
	    	horseman
	    		.userAgent("Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/534.34 (KHTML, like Gecko) PhantomJS/1.9.7 Safari/534.34")
	    		.open('http://www.google.com/')
				.url()
				.should.equal("http://www.google.com/");
	    });

	    it('should click a link', function() {
	    	horseman		    	
				.click("a:contains('Advertising')")
				.waitForNextPage()
				.url()
				.should.equal("http://www.google.com/intl/en/ads/");
	    });

	    it('should go backwards', function() {
	    	horseman		    	
				.back()
				.url()
				.should.equal("http://www.google.com/");
	    });

	    it('should go forwards', function() {
	    	horseman		    	
				.forward()
				.url()
				.should.equal("http://www.google.com/intl/en/ads/");
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

	describe("Evaluation", function(){
		var horseman = new Horseman();

		after( function(){
			horseman.close();
		});

	    it('should get the title', function() {
	      horseman
	      	.open("http://www.google.com")
	      	.title()
	      	.should.equal("Google");

	    });

	    it('should verify an element exists', function() {
	      horseman
	      	.open("http://www.google.com")
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
	 			.open("http://www.reddit.com")
	 			.html("#header")
	      		.indexOf("reddit").should.be.above(0);
	    });

	    it('should get the text of an element', function() {
	 		horseman
	 			.text("#header-img")
	      		.should.equal("reddit.com");
	    });

	    it('should get the value of an element', function() {
	    	horseman
	      		.value("input[name='q']")
				.should.equal("");
	    });

	    it('should get an attribute of an element', function() {
	 		horseman
	 			.open("http://www.reddit.com")
	 			.attribute("a#header-img", "href")
	      		.should.equal("/");
	    });

	    it('should get a css property of an element', function() {
	 		horseman
	 			.cssProperty("a#header-img", "margin-bottom")
	      		.should.equal("3px");
	    });

	    it('should get the width of an element', function() {
	 		horseman
	 			.width("a#header-img")
	      		.should.be.above(0);
	    });

	    it('should get the height of an element', function() {
	 		horseman
	 			.width("a#header-img")
	      		.should.be.above(0);
	    });

	    it('should determine if an element is visible', function() {
	 		horseman
	 			.visible("a#header-img")
	      		.should.be.true;

	      	horseman
	 			.visible(".login-popup")
	      		.should.be.false;
	    });

	    it('should evaluate javascript', function() {
	      	horseman
		      	.open("http://www.google.com")
		      	.evaluate( function(){
		      		return document.title;
		      	})
		      	.should.equal("Google");
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

	describe("Manipulation", function(){
		var horseman = new Horseman();

		after( function(){
			horseman.close();
			if ( fs.existsSync("out.png") )
				fs.unlinkSync("out.png");
		});

	    it('should execute javascript without breaking the chain', function() {
	      	horseman
		      	.open("http://www.google.com")
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
	      		.open("http://www.yahoo.com")
	      		.type('input[title="Search"]', 'github')
	      		.value('input[title="Search"]')
	      		.should.equal('github');
	    });

	    it('should clear a field', function() {
	      	horseman
	      		.clear('input[title="Search"]')
	      		.value('input[title="Search"]')
	      		.should.equal("");
	    });

	    it('should select a value', function() {
	      	horseman
	      		.open("http://www.w3.org/WAI/UA/TS/html401/cp0102/0102-ONCHANGE-SELECT.html")
				.select("#select1","1")
				.value("#select1")
	      		.should.equal("1");
	    });

	    it('should take a screenshot', function() {
		    horseman.screenshot("out.png");
		    fs.existsSync("out.png").should.be.true;
		});

		it('should upload a file', function(){
			horseman
		        .open("http://validator.w3.org/#validate_by_upload")
		        .upload("#uploaded_file","test/files/testjs.js")
		        .value("#uploaded_file")
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
	    		.open("http://www.yahoo.com")
	    		.manipulate(function(){
	    			$("input[title='Search']")
	    				.data("keypresses",0)
	    				.keypress( function(){
	    					var curr = $("input[title='Search']").data("keypresses");
	    					$("input[title='Search']").data("keypresses", ++curr);
	    				});
	    		})	      		
	      		.type("input[title='Search']", "github")
	      		.evaluate(function(){
	      			return $("input[title='Search']").data("keypresses");
	      		})
	      		.should.equal(6);
	    });
	});

	describe("Waiting", function(){

		var horseman = new Horseman();

		after( function(){
			horseman.close();
		});

		it('should wait for the page to change', function(){
			horseman
				.open("http://www.google.com")
				.click("a:contains('Advertising')")
				.waitForNextPage()
				.url()
				.should.equal("http://www.google.com/intl/en/ads/");
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
	    		.open("http://www.google.com")
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
				.open("http://www.yahoo.com");

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
				.open("http://www.yahoo.com");
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
				.open("http://www.yahoo.com");
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
				.open("http://www.yahoo.com");
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
				.open("http://www.yahoo.com");
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
				.open("http://www.google.com/");
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
				.open("http://www.google.com/")
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
				.open("http://www.google.com/")
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
				.open("http://www.google.com/")
				.evaluate( function(){
					prompt("onno");
				});
	      	fired.should.be.true;
	      	horseman.close();
	    });

	});

});