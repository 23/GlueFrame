# GlueFrame

GlueFrame is a wrapper object for <a href="http://github.com/23/glue">Glue</a> applications (eg. a <a href="http://23video.com">23 Video</a> player) that provides methods for interfacing with the application when it is embedded in an iframe. Its true value is shown when the application is embedded on a page with a different domain or protocol than the one of the application - in which case GlueFrame takes care of the cross-domain communication.

GlueFrame accesses methods and properties in your application directly when the iframe and the page it is embedded on have the same protocol, domain and port. If not, messages are passed between the parent and child windows with window.postMessage. It works in IE8 and all modern browsers, and if your application is embedded on a page with the same protocol, domain and port, IE7 is supported too.

When instantiated, the GlueFrame object provides an eventbased interface with methods for getting/setting of properties and binding/firing of events inside the application.

# Usage

To use GlueFrame, simply include the script on your page and create a new object by passing in a reference to the iframe and the name of your application object (if the application is a 23 Video Player, the object name will typically be "Player"):

    <script src="/path/to/GlueFrame.js"></script>
    <script>
      var myApp = new GlueFrame(document.getElementById("myAppIframe"), "Player");
    </script>

If you want be absolutely sure that information passed from the page to the iframe is only ever accessed by your application, you can optionally pass in the protocol, domain and port of your application as the third argument:

    var myApp = new GlueFrame(document.getElementById("myAppIframe"), "Player", "http://appdomain.com");

The `myApp` object will now have four methods for you to use:

### get(property, callback)

When calling `get()`, you get access to all the properties that has been made available with a getter in your application. Simply pass in the name of the property and a callback function to handle the value of said property when it is passed back from your application (calling `get` does not return the value directly):

	myApp.get("currentTime", function(value) {
	  console.log("Value of 'currentTime' is: " + value);
	});

Note that requests and responses in cross-domain situations are passed to and from the application as JSON-strings and therefore cannot contain references to DOM-elements. In this case, the callback function will not be called.

### set(property, value[, callback])

`set()` allows you to call the setter-methods specified in your application. If the application is a video player, you may start playback of a video by setting the `playing` property to `true`:

    myApp.set("playing", true);

If you expect the setter-method in your application to return a value, you can optionally specify a callback function to handle that value, when it is passed back.

### bind(event, callback)

With `bind()` you can register eventlisteners for events being fired inside your application. Say that you want to listen for the event that playback of a video has reached the end. In this case, pass "player:video:ended" as the event name and a function to be executed, when the event occurs:

    myApp.bind("player:video:ended", function(eventName, obj) {
      console.log("The event " + eventName + " fired and this object was returned: " + obj);
    });

Please note that the callback function is not necessarily called with an object and thus might have `eventName` as the single argument.

### fire(event[, object])

`fire()` allows you manually fire events in your application (both built-in and custom events), simply by calling it with the name of the event, and optionally an object that should be passed to all eventlisteners listening for this event.

	myApp.fire("myEvent", {property: "value"});