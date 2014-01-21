var GlueFrame = function(iframe, appName) {

    var $this = this;

    // Allow posting messages only to the domain of the app
    $this.domain = (""+iframe.src).split("/").slice(0,3).join("/");

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

    // Poll the iframe until the app is bootstrapped
    $this.ready = false;
    $this.readyInterval = window.setInterval(function(){
        if (!this.ready && $this.method === "object") {
            if (iframe.contentWindow[appName] && iframe.contentWindow[appName].bootstrapped) {
                $this.ready = true;
                window.clearInterval($this.readyInterval);
                $this.processQueue();
            }
        } else if (!this.ready && $this.method === "post") {
            $this.get("bootstrapped", function(bootstrapped){
                if (bootstrapped) {
                    $this.ready = true;
                    window.clearInterval($this.readyInterval);
                    $this.processQueue();
                }
            }, true);
        }
    }, 100);

    $this.callbackId = -1;
    $this.glueFrameId = (new Date()).getTime();
    $this.callbacks = {};

    // Store callback functions in the parent window
    $this.registerCallback = function(callback, requireCallback) {
        $this.callbackId = $this.callbackId + 1;
        if (requireCallback && callback !== undefined && typeof callback === "function") {
            $this.callbacks[$this.glueFrameId+"_"+$this.callbackId] = callback;
        } else if (!requireCallback && (callback === undefined || typeof callback === "function")) {
            $this.callbacks[$this.glueFrameId+"_"+$this.callbackId] = callback;
        } else {
            throw "GlueFrame: Callback not registered correctly.";
        }
        return $this.glueFrameId+"_"+$this.callbackId;
    };

    // Queue up method calls until app is ready
    $this.queue = [];
    $this.addToQueue = function(method, args) {
        $this.queue.push({method: method, args: args});
    };

    // Loop through queue when app is ready
    $this.processQueue = function() {
        for (var i = 0; i < $this.queue.length; i += 1) {
            var queueItem = $this.queue[i];
            queueItem.method.apply(null, queueItem.args);
        }
        $this.queue = [];
        $this.set("queuedEventsProcessed", true);
    };

    $this.get = function(prop, callback, force) {
        if (!$this.ready && !force) {
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
            var messageObject = {f: "get", args: [prop], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), force ? "*" : $this.domain );
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
            var messageObject = {f: "set", args: [prop, val], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), $this.domain );
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
            var messageObject = {f: "bind", args: [event], cbId: cbId, triggerQueue: triggerQueue};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), $this.domain );
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
            var messageObject = {f: "fire", args: [event, obj]};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), $this.domain );
        }
    };

    // Remove event listeners, callbacks and intervals
    $this.destroy = function(){
        if (window.addEventListener) {
            window.removeEventListener("message", $this.receiveMessage, false);
        } else {
            window.detachEvent("onmessage", $this.receiveMessage);
        }
        window.clearInterval($this.readyInterval);
        $this.callbacks = {};
    };

    // Parse messages received from iframe
    $this.receiveMessage = function(e) {
    	if (e.origin === $this.domain) {
            var data = JSON.parse(e.data);
            if (data.cbId !== undefined && $this.callbacks[data.cbId] !== undefined) {
                $this.callbacks[data.cbId].apply(null, [data.a, data.b]);
            }
        }
    };

    // Listen for message events if need
    if (window.addEventListener) {
        window.addEventListener("message", $this.receiveMessage, false);
    } else {
        window.attachEvent("onmessage", $this.receiveMessage);
    }

};
