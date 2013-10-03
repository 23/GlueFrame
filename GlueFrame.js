var GlueFrame = function(iframe, appName) {
    var $this = this;
    // Allow posting messages only to the domain of the app
    $this.domain = (""+iframe.src).split("/").slice(0,3).join("/");
    // Have we received a "ready" call from the app iframe?
    $this.ready = false;
    // Determine method of communication with iframe
    $this.getMethod = function() {
        if ($this.domain == (""+window.location).split("/").slice(0,3).join("/") ) {
            return "object";
        } else if (typeof window.postMessage !== "undefined") {
            return "post";
        } else {
            return "none";
        }
    }
    $this.method = $this.getMethod();
    // Check if app is bootstrapped by polling the app object until success
    // Only relevant in IE7 where postMessage is not available
    if ($this.method == "object" && typeof window.postMessage == "undefined") {
	var readyInterval = window.setInterval(function(){
            if (iframe.contentWindow[appName] && iframe.contentWindow[appName].bootstrapped) {
		$this.ready = true;
		$this.processQueue();
		window.clearInterval(readyInterval);
	    }
	}, 100);
    }
    // Temporarily backup and remove toJSON methods added by frameworks like Prototype.js
    $this.hideToJSON = function() {
        if (typeof Object != "undefined") {
            $this.objectPrototype = Object.prototype.toJSON;
            delete Object.prototype.toJSON;
	}
	if (typeof Array != "undefined") {
            $this.arrayPrototype = Array.prototype.toJSON;
            delete Array.prototype.toJSON;
	}
	if (typeof Hash != "undefined") {
            $this.hashPrototype = Hash.prototype.toJSON;
            delete Hash.prototype.toJSON;
	}
	if (typeof String != "undefined") {
            $this.stringPrototype = String.prototype.toJSON;
            delete String.prototype.toJSON;
	}
    };
    // Restore toJSON methods
    $this.restoreToJSON = function() {
        if (typeof Object != "undefined") {
            Object.prototype.toJSON = $this.objectPrototype;
	}
	if (typeof Array != "undefined") {
            Array.prototype.toJSON = $this.arrayPrototype;
	}
	if (typeof Hash != "undefined") {
            Hash.prototype.toJSON = $this.hashPrototype;
	}
	if (typeof String != "undefined") {
            String.prototype.toJSON = $this.stringPrototype;
	}
    };
    $this.callbackId = -1;
    $this.callbacks = [];
    // Store callback functions in the parent window
    $this.registerCallback = function(callback, requireCallback) {
        $this.callbackId = $this.callbackId + 1;
        if (requireCallback && callback !== undefined && typeof callback === "function") {
            $this.callbacks[$this.callbackId] = callback;
        } else if (!requireCallback && (callback === undefined || typeof callback === "function")) {
            $this.callbacks[$this.callbackId] = callback;
        } else {
            throw "GlueFrame: Callback not registered correctly.";
        }
        return $this.callbackId;
    };
    // Queue up method calls until app is ready
    $this.queue = [];
    $this.addToQueue = function(method, args) {
	$this.queue.push({method: method, args: args});
    };
    $this.processQueue = function() {
        for (var i = 0; i < $this.queue.length; i += 1) {
	    var queueItem = $this.queue[i];
            queueItem.method.apply(null, queueItem.args);
	}
        $this.set("queuedEventsProcessed", true);
    };
    $this.get = function(prop, callback) {
	if (!$this.ready) {
	    $this.addToQueue($this.get, [prop, callback]);
            return;
	}
        var cbId = $this.registerCallback(callback, true);
        if ($this.method === "object") {
            var value = iframe.contentWindow[appName].get.apply(null, [prop]);
            if ($this.callbacks[$this.callbackId] !== undefined) {
                $this.callbacks[$this.callbackId].apply(null, [value]);
            }
        } else if ($this.method === "post") {
            $this.hideToJSON();
            var messageObject = {f: "get", args: [prop], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), $this.domain );
            $this.restoreToJSON();
        }
    };
    $this.set = function(prop, val, callback) {
	if (!$this.ready) {
	    $this.addToQueue($this.set, [prop, val, callback]);
            return;
	}
        var cbId = $this.registerCallback(callback, false);
        if ($this.method === "object") {
            var value = iframe.contentWindow[appName].set.apply(null, [prop, val]);
            if ($this.callbacks[$this.callbackId] !== undefined) {
                $this.callbacks[$this.callbackId].apply(null, [value]);
            }
        } else if ($this.method === "post") {
            $this.hideToJSON();
            var messageObject = {f: "set", args: [prop, val], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), $this.domain );
            $this.restoreToJSON();
        }
    };
    $this.bind = function(event, callback, triggerQueue) {
        var triggerQueue = triggerQueue || false;
	if (!$this.ready) {
	    $this.addToQueue($this.bind, [event, callback, true]);
            return;
	}
        var cbId = $this.registerCallback(callback, true);
        if ($this.method === "object") {
            iframe.contentWindow[appName].bind.apply(null, [event, callback, triggerQueue]);
        } else if ($this.method === "post") {
            $this.hideToJSON();
            var messageObject = {f: "bind", args: [event], cbId: cbId, triggerQueue: triggerQueue};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), $this.domain );
            $this.restoreToJSON();
        }
    };
    $this.fire = function(event, obj) {
	if (!$this.ready) {
	    $this.addToQueue($this.fire, [event, obj]);
            return;
	}
        if ($this.method === "object") {
            return iframe.contentWindow[appName].fire.apply(null, [event, obj]);
        } else if ($this.method === "post") {
            $this.hideToJSON();
            var messageObject = {f: "fire", args: [event, obj]};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), $this.domain );
            $this.restoreToJSON();
        }
    };
    // Parse messages received from iframe
    $this.receiveMessage = function(e) {
	if (e.origin === $this.domain) {
            var data = JSON.parse(e.data);
            if (data.cbId !== undefined && $this.callbacks[parseInt(data.cbId, 10)] !== undefined) {
		$this.callbacks[parseInt(data.cbId, 10)].apply(null, [data.a, data.b]);
            } else if (data.ready) {
		$this.ready = true;
                $this.processQueue();
            }
	}
    };
    // Listen for message events
    if (window.addEventListener) {
        window.addEventListener("message", $this.receiveMessage, false);
    } else {
        window.attachEvent("onmessage", $this.receiveMessage);
    }
};
