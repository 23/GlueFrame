var GlueFrame = function(iframe, appName, domain) {

    var $this = this;

    if (!domain) {
        domain = "*";
    }

    $this.getMethod = function() {
        try {
            if (iframe.contentWindow[appName]) {
                return "object";
            }
        } catch(err) {console.log("no object");}
        if (window.postMessage !== undefined) {
            return "post";
        } else {
            return "none";
        }
    }

    $this.callbackId = -1;
    $this.callbacks = [];

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

    $this.receiveMessage = function(e) {
        var data = JSON.parse(e.data);
        if (data.cbId !== undefined && $this.callbacks[parseInt(data.cbId, 10)] !== undefined) {
            $this.callbacks[parseInt(data.cbId, 10)].apply(null, [data.a, data.b]);
        }
    };

    if (window.addEventListener) {
        window.addEventListener("message", $this.receiveMessage, false);
    } else {
        window.attachEvent("onmessage", $this.receiveMessage);
    }

};
