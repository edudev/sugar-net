define(function (require) {
    var activity = require("sugar-web/activity/activity");
    var collaboration = require("sugar-web/collaboration");
    var icon = require("sugar-web/graphics/icon");
    var bus = require("sugar-web/bus");

    // TODO: the code assumes that the user is somewhat using sugar
    // the web activity needs to be usable from a normal browser
    // which is impossible, unless the web activity is hosted on a web server

    var Activity = function(activityId, uri) {
        // activity://org.sugarlabs.GTDActivity/index.html#&togetherjs=Vxx3wAr7vD
        // maybe pass the document title along with the uri
        this.activityId = activityId;
        this.uri = uri;
        this.bundleId = null;
        this.showName = null;

        var prefix = 'activity://';
        if(uri.indexOf(prefix) == 0) {
            this.bundleId = uri.slice(prefix.length,
                                      uri.indexOf('/', prefix.length));

            var split = this.bundleId.split('.');
            this.showName = split[split.length-1];
        }

        // maybe parse the path and/or togetherjsID from the uri


        this.open = function() {
            // TODO: need to pass the creator's color, too
            bus.sendMessage("mesh.open",
                            [this.activityId, this.bundleId, this.uri], null);
        }
    };

    var User = function(clientId, colors, name) {
        this.clientId = clientId;
        this.colors = colors;
        this.name = name;
        this.sharedActivities = {}

        this.update = function() {
            if( this.colors && this.name ) {
                this.clientId = collaboration.require('session').clientId;
                collaboration.send({type: 'init', user: myself});

                var userElement = document.getElementById('user');
                if( userElement )
                    userElement.id = 'user' + this.clientId;
            }
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
            var activity;
            if( activityId in sharedActivities ) {
                activity = sharedActivities[activityId];
            } else {
                activity = new Activity(activityId, uri);
                sharedActivities[activityId] = activity;
            }
            this.sharedActivities[activityId] = activity;
        };
        this.unshareActivity = function(activityId) {
            delete this.sharedActivities[activityId];
        };

        this.copy = function(source) {
            for( prop in source )
                this[prop] = source[prop];

            for( activityId in this.sharedActivities ) {
                var activity = this.sharedActivities[activityId];
                this.shareActivity(activity.activityId, activity.uri);
            }
        }
    };

    var canvas = null;
    var template = null;
    var myself = new User();
    var users = {};
    var sharedActivities = {};

    function sayHelloBack(msg) {
        collaboration.send({type: "init", user: myself});
    }

    function populateActivityList(user) {
        var result = '';
        for( var activityId in user.sharedActivities ) {
            result += '<li><a href="#' + activityId + '">' + 
                user.sharedActivities[activityId].showName + '</a></li>';
        }

        var element = document.getElementById(
            'user' + user.clientId).querySelector('.sharedList');
        element.innerHTML = result;
    }

    function addUser(msg) {
        var userElement;

        var user = new User();
        // TODO: find a way to make this transparent
        user.copy(msg.user);

        if( msg.clientId in users ) {
            userElement = document.getElementById("user" + msg.clientId);
        } else {
            userElement = template.cloneNode(true);
            userElement.id = "user" + msg.clientId;
        }
        var userIcon = userElement.querySelector('.usericon');

        userIcon.title = user.name;

        canvas.appendChild(userElement);
        populateActivityList(user);

        // TODO: use a better positioning algorithm

        var userPos = {}
        userPos.top = Math.random() * canvas.offsetHeight;
        userPos.left = Math.random() * canvas.offsetWidth;
        userElement.style.top = userPos.top + 'px';
        userElement.style.left = userPos.left + 'px';
        icon.colorize(userIcon, user.colors);

        users[msg.clientId] = user;
        for( var activityId in user.sharedActivities ) {
            sharedActivities[activityId] = user.sharedActivities[activityId];
        }
    }

    function activityShared(notification) {
        var activityId = notification[0];
        var uri = notification[1];
        myself.shareActivity(activityId, uri);
        collaboration.send({type: "broadcast", activityId: activityId,
                            uri: uri});

        populateActivityList(myself);
    }

    function activityUnshared(notification) {
        var activityId = notification[0];
        myself.unshareActivity(activityId);
        collaboration.send({type: "unshare", activityId: activityId});

        populateActivityList(myself);
    }

    function networkActivityShared(msg) {
        users[msg.clientId].shareActivity(msg.activityId, msg.uri);

        populateActivityList(users[msg.clientId]);
    }

    function networkActivityUnshared(msg) {
        users[msg.clientId].unshareActivity(msg.activityId);

        populateActivityList(users[msg.clientId]);
    }

    function hashChanged() {
        var activityId = window.location.hash.slice(1);
        sharedActivities[activityId].open();
    }

    // Manipulate the DOM only when it is ready.
    require(['domReady!'], function (doc) {
        // Initialize the activity.
        activity.setup();
        collaboration.setup();

        bus.sendMessage("mesh.listen", [], null);
        window.addEventListener("hashchange", hashChanged);

        canvas = document.getElementById("canvas");
        var user = document.getElementById("user");
        template = user.cloneNode(true);
        template.classList.remove('myself');
        var meIcon = user.querySelector('.usericon');

        activity.getXOColor(function (error, colors) {
            icon.colorize(meIcon, colors);
            myself.setColors(colors);
        });
        activity.getNickname(function (error, name) {
            myself.setName(name);
        });

        collaboration.hub.on("togetherjs.hello", sayHelloBack);
        collaboration.hub.on("init", addUser);

        bus.onNotification("mesh.broadcast", activityShared);
        bus.onNotification("mesh.unshare", activityUnshared);
        collaboration.hub.on("broadcast", networkActivityShared);
        collaboration.hub.on("unshare", networkActivityUnshared);

    });

});
