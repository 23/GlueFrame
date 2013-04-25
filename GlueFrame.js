var GlueFrame = function(iframe, appName, domain) {
    var $this = this;
    // Allow posting messages to all domains, if no domain is specfied
    if (!domain) {
        domain = "*";
    }
    // Determine method of communication with iframe
    $this.getMethod = function() {
        try {
            if (iframe.contentWindow[appName]) {
                return "object";
            }
        } catch(err) {}
        if (window.postMessage !== undefined) {
            return "post";
        } else {
            return "none";
        }
    }
    // Remove Prototype's toJSON methods when present
    if(window.Prototype) {
        delete Object.prototype.toJSON;
        delete Array.prototype.toJSON;
        delete Hash.prototype.toJSON;
        delete String.prototype.toJSON;
    }
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
    $this.get = function(prop, callback) {
        $this.method = $this.getMethod();
        var cbId = $this.registerCallback(callback, true);
        if ($this.method === "object") {
            var value = iframe.contentWindow[appName].get.apply(null, [prop]);
            if ($this.callbacks[$this.callbackId] !== undefined) {
                $this.callbacks[$this.callbackId].apply(null, [value]);
            }
        } else if ($this.method === "post") {
            var messageObject = {f: "get", args: [prop], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), domain );
        }
    };
    $this.set = function(prop, val, callback) {
        $this.method = $this.getMethod();
        var cbId = $this.registerCallback(callback, false);
        if ($this.method === "object") {
            var value = iframe.contentWindow[appName].set.apply(null, [prop, val]);
            if ($this.callbacks[$this.callbackId] !== undefined) {
                $this.callbacks[$this.callbackId].apply(null, [value]);
            }
        } else if ($this.method === "post") {
            var messageObject = {f: "set", args: [prop, val], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), domain );
        }
    };
    $this.bind = function(event, callback) {
        $this.method = $this.getMethod();
        var cbId = $this.registerCallback(callback, true);
        if ($this.method === "object") {
            iframe.contentWindow[appName].bind.apply(null, [event, callback]);
        } else if ($this.method === "post") {
            var messageObject = {f: "bind", args: [event], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), domain );
        }
    };
    $this.fire = function(event, obj) {
        $this.method = $this.getMethod();
        if ($this.method === "object") {
            return iframe.contentWindow[appName].fire.apply(null, [event, obj]);
        } else if ($this.method === "post") {
            var messageObject = {f: "fire", args: [event, obj]};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), domain );
        }
    };
    // Parse messages received from iframe
    $this.receiveMessage = function(e) {
        var data = JSON.parse(e.data);
        if (data.cbId !== undefined && $this.callbacks[parseInt(data.cbId, 10)] !== undefined) {
            $this.callbacks[parseInt(data.cbId, 10)].apply(null, [data.a, data.b]);
        }
    };
    // Listen for message events
    if (window.addEventListener) {
        window.addEventListener("message", $this.receiveMessage, false);
    } else {
        window.attachEvent("onmessage", $this.receiveMessage);
    }
};
