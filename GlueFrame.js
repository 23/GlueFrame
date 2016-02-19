var GlueFrame = function(iframe, appName) {

    var $this = this;

    // GlueFrame version
    $this.glueframe = "1.1.1";

    // Allow posting messages only to the domain of the app
    var _domain = (""+iframe.src).split("/").slice(0,3).join("/");

    // Determine method of communication with iframe
    var _method = (function() {
        if (_domain == (""+window.location).split("/").slice(0,3).join("/") ) {
            return "object";
        } else if (typeof window.postMessage !== "undefined") {
            return "post";
        } else {
            return "none";
        }
    })();

    // Poll the iframe until the app is bootstrapped
    $this.ready = false;
    var _readyInterval = window.setInterval(function(){
        if (!this.ready && _method === "object") {
            if (iframe.contentWindow[appName] && iframe.contentWindow[appName].bootstrapped) {
                $this.ready = true;
                window.clearInterval(_readyInterval);
                _processQueue();
            }
        } else if (!this.ready && _method === "post") {
            $this.get("bootstrapped", function(bootstrapped){
                if (bootstrapped) {
                    $this.ready = true;
                    window.clearInterval(_readyInterval);
                    _processQueue();
                }
            }, true);
        }
    }, 100);

    $this.glueFrameId = (new Date()).getTime();
    var _callbackCount = 0;
    var _callbacks = {};

    // Store callback functions in the parent window
    var _registerCallback = function(callback, requireCallback) {
        var callbackIdentifier = $this.glueFrameId + "_" + (++_callbackCount);
        if (typeof callback === "function") {
            _callbacks[callbackIdentifier] = callback;
        } else if (requireCallback) {
            throw "GlueFrame: Callback not registered correctly.";
        }
        return callbackIdentifier;
    };

    // Queue up method calls until app is ready
    var _queue = [];
    var _addToQueue = function(method, args) {
        _queue.push({method: method, args: args});
    };

    // Loop through queue when app is ready
    var _processQueue = function() {
        for (var i = 0; i < _queue.length; i += 1) {
            var queueItem = _queue[i];
            queueItem.method.apply(null, queueItem.args);
        }
        _queue = [];
        $this.set("queuedEventsProcessed", true);
    };

    $this.get = function(prop, callback, force) {
        if (!$this.ready && !force) {
            _addToQueue($this.get, [prop, callback]);
            return;
        }
        var cbId = _registerCallback(callback, true);
        if (_method === "object") {
            var value = iframe.contentWindow[appName].get.apply(null, [prop]);
            if (typeof _callbacks[cbId] !== "undefined") {
                _callbacks[cbId].apply(null, [value]);
            }
        } else if (_method === "post") {
            var messageObject = {f: "get", args: [prop], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), force ? "*" : _domain );
        }
    };

    $this.set = function(prop, val, callback) {
        if (!$this.ready) {
            _addToQueue($this.set, [prop, val, callback]);
            return;
        }
        var cbId = _registerCallback(callback, false);
        if (_method === "object") {
            var value = iframe.contentWindow[appName].set.apply(null, [prop, val]);
            if (typeof _callbacks[cbId] !== "undefined") {
                _callbacks[cbId].apply(null, [value]);
            }
        } else if (_method === "post") {
            var messageObject = {f: "set", args: [prop, val], cbId: cbId};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), _domain );
        }
    };

    $this.bind = function(event, callback, triggerQueue) {
        var triggerQueue = triggerQueue || false;
        if (!$this.ready) {
            _addToQueue($this.bind, [event, callback, true]);
            return;
        }
        var cbId = _registerCallback(callback, true);
        if (_method === "object") {
            iframe.contentWindow[appName].bind.apply(null, [event, callback, triggerQueue]);
        } else if (_method === "post") {
            var messageObject = {f: "bind", args: [event], cbId: cbId, triggerQueue: triggerQueue};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), _domain );
        }
    };

    $this.fire = function(event, obj) {
        if (!$this.ready) {
            _addToQueue($this.fire, [event, obj]);
            return;
        }
        if (_method === "object") {
            return iframe.contentWindow[appName].fire.apply(null, [event, obj]);
        } else if (_method === "post") {
            var messageObject = {f: "fire", args: [event, obj]};
            iframe.contentWindow.postMessage( JSON.stringify(messageObject), _domain );
        }
    };

    // Remove event listeners, callbacks and intervals
    $this.destroy = function(){
        if (window.addEventListener) {
            window.removeEventListener("message", _receiveMessage, false);
        } else {
            window.detachEvent("onmessage", _receiveMessage);
        }
        window.clearInterval(_readyInterval);
        _callbacks = {};
    };

    // Parse messages received from iframe
    var _receiveMessage = function(e) {
    	if (e.origin === _domain) {
            var data;
            try {
                data = JSON.parse(e.data);
            }catch(e){}
            if (typeof data !== "undefined" && typeof data.cbId !== "undefined" && typeof _callbacks[data.cbId] === "function") {
                _callbacks[data.cbId].apply(null, [data.a, data.b]);
            }
        }
    };

    // Listen for message events if need
    if (window.addEventListener) {
        window.addEventListener("message", _receiveMessage, false);
    } else {
        window.attachEvent("onmessage", _receiveMessage);
    }

};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlueFrame;
}
