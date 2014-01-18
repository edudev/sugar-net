define(function (require) {
    var activity = require("sugar-web/activity/activity");
    var collaboration = require("sugar-web/collaboration");

    // Manipulate the DOM only when it is ready.
    require(['domReady!'], function (doc) {

        // Initialize the activity.
        activity.setup();
        collaboration.setup();

        

    });

});
