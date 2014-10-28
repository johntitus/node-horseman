// Acts as a manager for deasync.
// Calling deasync.sleep or .runLoopOnce in more than one place
// can result in system lock, so this makes sure the sleep is 
// controlled from one location.

var deasync = require("deasync");

module.exports = Pause;

function Pause(){
	this.flags = [];
	this.waiting = false;
}

Pause.prototype.pause = function(flag){
	if (flag){
		this.flags.push(flag);
	}
	if (!this.waiting ){
		this.waiting = true;
		while (this.flags.length){
			deasync.sleep(50);
			if (this.flags.length === 0){
				this.waiting = false;
			}
		}
	}
}

Pause.prototype.unpause = function(flag){
	for (var i=this.flags.length-1; i>=0; i--) {
	    if (this.flags[i] === flag) {
	        this.flags.splice(i, 1);
	    }
	}
}

Pause.prototype.sleep = function(ms){
	deasync.sleep(ms);
}