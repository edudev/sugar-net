define(function (require) {
    var activity = require("sugar-web/activity/activity");
    var collaboration = require("sugar-web/collaboration");
    var icon = require("sugar-web/graphics/icon");
    var bus = require("sugar-web/bus");

    // TODO: the code assumes that the user is somewhat using sugar
    // the web activity needs to be usable from a normal browser
    // which is impossible, unless the web activity is hosted on a web server

    var Activity = function(uri) {
        // activity://org.sugarlabs.GTDActivity/index.html#&togetherjs=Vxx3wAr7vD
        // maybe pass the document title along with the uri
        this.bundleId = null;
        this.showName = null;

        var prefix = 'activity://';
        if(uri.indexOf(prefix) == 0) {
            this.bundleId = uri.slice(prefix.length,
                                      uri.indexOf('/', prefix.length));

            var split = this.bundleId.splti('.');
            this.showName = split[split.length-1];
        }

        // maybe parse the path and/or togetherjsID from the uri
    }

    var User = function(colors, name) {
        this.colors = colors;
        this.name = name;
        this.sharedActivities = {}

        this.update = function() {
            if( this.colors && this.name )
                collaboration.send({type: "init", user: myself});
        };
        this.setColors = function(colors) {
            this.colors = colors;
            this.update();
        };
        this.setName = function(name) {
            this.name = name;
            this.update();
        };

        this.shareActivity = function(activityId, uri) {
            this.sharedActivities[activityId] = new Activity(uri);
        }
        this.unshareActivity = function(activityId) {
            delete this.sharedActivities[activityId];
        }
    };

    var canvas = null;
    var templateIcon = null;
    var templateList = null;
    var myself = new User();
    var users = {};

    function sayHelloBack(msg) {
        collaboration.send({type: "init", user: myself});
    }

    function addUser(msg) {
        var userIcon;
        var activityList;

        if( msg.clientId in users ) {
            userIcon = document.getElementById("user" + msg.clientId);
            activityList = document.getElementById("list" + msg.clientId);
        }
        else {
            userIcon = templateIcon.cloneNode(true);
            userIcon.id = "user" + msg.clientId;

            activityList = templateList.cloneNode(false);
            activityList.id = "list" + msg.clientId;
        }
        
        userIcon.title = msg.user.name;

        canvas.appendChild(userIcon);
        canvas.appendChild(activityList);

        // TODO: use a better positioning algorithm

        var userPos = {}
        userPos.top = Math.random() * canvas.offsetHeight;
        userPos.left = Math.random() * canvas.offsetWidth;
        userIcon.style.top = userPos.top + 'px';
        userIcon.style.left = userPos.left + 'px';
        activityList.style.top = (userPos.top + 45) + 'px';
        activityList.style.left = (userPos.left + 45) + 'px';
        icon.colorize(userIcon, msg.user.colors);


        users[msg.clientId] = msg.user;
    }

    function activityShared(notification) {
        console.log("Shared", notification);
        var activityId = notification[0];
        var uri = notification[1];
        myself.shareActivity(activityId, uri);
        collaboration.send({type: "broadcast", activityId: activityId,
                            uri: uri});
    }

    function activityUnshared(notification) {
        console.log("Unshared", notification);
        var activityId = notification[0];
        myself.unshareActivity(activityId);
        collaboration.send({type: "unshare", activityId: activityId});
    }

    function networkActivityShared(msg) {
        console.log("SharedN", msg);
        users[msg.clientId].shareActivity(msg.activityId, msg.uri);
    }

    function networkActivityUnshared(msg) {
        console.log("UnsharedN", msg);
        users[msg.clientId].unshareActivity(msg.activityId);
    }

    // Manipulate the DOM only when it is ready.
    require(['domReady!'], function (doc) {
        // Initialize the activity.
        activity.setup();
        collaboration.setup();

        bus.sendMessage("mesh.listen", [], null);

        canvas = document.getElementById("canvas");

        var meIcon = document.getElementById("me");
        templateIcon = meIcon.cloneNode(true);
        activity.getXOColor(function (error, colors) {
            icon.colorize(meIcon, colors);
            myself.setColors(colors);
        });
        activity.getNickname(function (error, name) {
            myself.setName(name);
        });

        templateList = document.getElementById("myActivities");

        collaboration.hub.on("togetherjs.hello", sayHelloBack);
        collaboration.hub.on("init", addUser);

        bus.onNotification("mesh.broadcast", activityShared);
        bus.onNotification("mesh.unshare", activityUnshared);
        collaboration.hub.on("broadcast", networkActivityShared);
        collaboration.hub.on("unshare", networkActivityUnshared);

    });

});
