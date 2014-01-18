// FIXME: seems like some (if not most) of the config options have to be set
// as soon as possible, not in collaboration.setup(). if not, they cause errors
// TogetherJS.reinitialize() seems to fix this, but not for everything

// TODO: use this when not using Mozilla's hub server
// maybe change the port
// possibly this particular variable be edited directly in togetherjs(-min).js
// window.TogetherJSConfig_hubBase = "http://192.168.1.2:8080";
// window.TogetherJSConfig_autoStart = true;

// this is a hack, this is not in the documentation
// IDs are normally 10 symbols alphanum chars, but this one is special
window._TogetherJSShareId = '@@@@@';

// perhaps these can be put into the .setup method
// and at some point to add collaboration.refreshUserData();
var userName = 'user';
var userColor = '#ffffff'
var userAvatarUrl;
function getUserName() {
	return userName;
}
function getUserColor() {
	return userColor;
}
function getUserAvatarUrl() {
	return userAvatarUrl;
}
window.TogetherJSConfig_getUserName = getUserName;
window.TogetherJSConfig_getUserColor = getUserColor;
// TODO: return a url to the user's XO icon
// not sure how to colorize it
// when changing avatars, TogetherJS sens the whole image in base64 encoding
// which will allow avatars to be customized nicely
// but since the XO icon will be used, this feature just causes extra traffic
// not much can be done...
// TODO: I believe that TogetherJS is sending the base64 encoded string
// with each message... not good (confirm/deny this theory)
// window.TogetherJSConfig_getUserAvatar = getUserAvatarUrl;

// not sure if togetherjs should be included this way
// maybe it should be included in the js/loader.js file?
// not sure whether to use minimized version, or not
define(["sugar-web/togetherjs",
		"sugar-web/env",
		"sugar-web/bus",
		"sugar-web/activity/activity"], function (
	togetherjs, environment, bus, activity) {
    'use strict';

    // not sure how to create this file
    // using protorypes didn't help much

	var collaboration = window.TogetherJS;

	collaboration.setup = function() {
		function onTogetherJSReady() {
	        bus.sendMessage("collaboration.shared", [this.shareUrl()], null);
		    collaboration.refreshUserData();
		}
		function onTogetherJSClose() {
	        bus.sendMessage("collaboration.closed", [], null);
		}
		this.on("ready", onTogetherJSReady);
		this.on("close", onTogetherJSClose);

		// Not sure if this should be the default config
        this.config("disableWebRTC", true);
        this.config("siteName", environment.activityName);
        this.config("toolName", "Collaboration");
        this.config("dontShowClicks", true);
        this.config("suppressJoinConfirmation", true);
        this.config("suppressInvite", true);

	    function onColorReceived(error, colors) {
	        if (error === null) {
	            userColor = colors['stroke'];
	            // TODO: find a way to use both colors
	            // userColor = colors['fill'];
		        collaboration.refreshUserData();
	        }
	    }
	    function onNicknameReceived(error, nickname) {
	        if (error === null) {
	            userName = nickname;
		        collaboration.refreshUserData();
	        }
	    }
        activity.getXOColor(onColorReceived);
        activity.getNickname(onNicknameReceived);

        // it's best that this button ID is included in the documentation
        // although an activity is not forced to use this ID
        var collaborationButton = document.getElementById("collaboration-button");
        collaborationButton.addEventListener("click", this, false);

        // not sure exactly what this reinitializes
        // it's definately not everything
        // I guess it will be a good to call it
        // TODO: look at what TogetherJSConfig_callToStart does
        // and it's differences with .reinitialize()
        this.reinitialize();
	};

    return collaboration;
    
});
