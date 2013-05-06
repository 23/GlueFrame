var GlueFrame = function(iframe, appName) {
    var $this = this;
    // Allow posting messages only to the domain of the app
    $this.domain = (""+iframe.src).split("/").slice(0,3).join("/");
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
    // Temporarily backup and remove toJSON methods added by frameworks like Prototype.js
    $this.hideToJSON = function() {
        $this.objectPrototype = Object.prototype.toJSON;
        $this.arrayPrototype = Array.prototype.toJSON;
        $this.hashPrototype = Hash.prototype.toJSON;
        $this.stringPrototype = String.prototype.toJSON;
        delete Object.prototype.toJSON;
        delete Array.prototype.toJSON;
        delete Hash.prototype.toJSON;
        delete String.prototype.toJSON;
    };
    // Restore toJSON methods
    $this.restoreToJSON = function() {
        Object.prototype.toJSON = $this.objectPrototype;
        Array.prototype.toJSON = $this.arrayPrototype;
        Hash.prototype.toJSON = $this.hashPrototype;
        String.prototype.toJSON = $this.stringPrototype;
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
    $this.get = function(prop, callback) {
        $this.method = $this.getMethod();
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
        $this.method = $this.getMethod();
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
    $this.bind = function(event, callback) {
        $this.method = $this.getMethod();
        var cbId = $this.registerCallback(callback, true);
        if ($this.method === "object") {
            iframe.contentWindow[appName].bind.apply(null, [event, callback]);
        } else if ($this.method === "post") {
            $this.hideToJSON();
            var messageObject = {f: "bind", args: [event], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), $this.domain );
            $this.restoreToJSON();
        }
    };
    $this.fire = function(event, obj) {
        $this.method = $this.getMethod();
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
