
var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
appInsights = require("applicationinsights");
appInsights.setup().setAutoCollectExceptions(true)
var client = appInsights.getClient();
const fs = require('fs');

var clientCounter = 1;
var clientToId = {};
var peers = {};
var connectionsToClean = new Set();

var port = process.env.PORT || 3000;

var intervalToCleanConnections = 10000;

var app = express();

var httpServer = http.createServer(app);

httpServer.keepAliveTimeout = 120000;

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.text())


var access = fs.createWriteStream('D:\home\site\wwwroot\api.access.log' + new Date().getMilliseconds());

process.stdout.write = process.stderr.write = access.write.bind(access);

process.on('uncaughtException', function (err) {
    log((err && err.stack) ? err.stack : err);
});

app.all('*', function (req, res, next) {
    log(req.url);
    if (req.query.peer_id && peers[req.query.peer_id]) {
        peers[req.query.peer_id].lastSeenActive = (new Date()).getTime();
    }
    next();
});

function cleanPeerList() {
    for (peerId in peers) {
        var peer = peers[peerId]
        if (peer.lastSeenActive + intervalToCleanConnections < new Date()) {
            log("Deleting peer " + peerId);
            if (peer.roomPeer) {
                log("Peer " + peerId + " crashed. Making " + peer.roomPeer.id + " available")
                peer.roomPeer.roomPeer = null;
            }
            delete peers[peerId];
            delete peers[peerId];
        }
    }
}

setInterval(cleanPeerList, intervalToCleanConnections);


app.get('/sign_in', function (req, res) {
    var client = {};
    log(req.url);
    var newPeer = {}
    newPeer.id = clientCounter++;
    newPeer.peerType = 'client';
    newPeer.messages = [];

    newPeer.name = req.query.peer_name;
    if (newPeer.name.indexOf("renderingclient_") != -1) {
        newPeer.peerType = 'client';
    }
    if (newPeer.name.indexOf("renderingserver_") != -1) {
        newPeer.peerType = 'server';
    }
    newPeer.timestampOfLastHeartbeat = (new Date()).getTime();
    peers[newPeer.id] = newPeer;

    res.set('Pragma', newPeer.id);
    res.send(formatListOfPeers(newPeer));
    notifyOtherPeers(newPeer);
})


app.post('/message', function (req, res) {
    log(req.url);
    var fromId = req.query.peer_id;
    var toId = req.query.to;
    var payload = req.body;
    var contentLength = req.headers['content-length'];
    contentLength = parseInt(contentLength);
    if (!peers[toId] || !peers[fromId]) {
        res.status(400).send();
    }
    if (contentLength <= payload.length) {
        peers[toId].roomPeer = peers[fromId];
        peers[fromId].roomPeer = peers[toId];

        sendMessageToPeer(peers[toId], payload, fromId);

        res.set('Pragma', fromId);
        res.send("Ok");
    }
})

app.get('/heartbeat', function (req, res) {
    res.sendStatus(200);
})

app.get('/sign_out', function (req, res) {
    log(req.url);
    var peerId = req.query.peer_id;

    var peer = peers[peerId];

    if (peer.roomPeer) {
        peer.roomPeer.roomPeer = null;
    }

    delete peers[peerId];

    res.set('Pragma', peerId);
    res.send("Ok");
})


app.get('/wait', function (req, res) {
    log(req.url);
    var peerId = req.query.peer_id;

    if (connectionsToClean.has(peerId)) {
        connectionsToClean.delete(peerId)
    }

    if (peers[peerId]) {
        var socket = {};
        socket.waitPeer = peers[peerId];
        socket.res = res;
        peers[peerId].waitSocket = socket;

        sendMessageToPeer(peers[peerId], null, null);
    }

    req.on('close', function () {
        connectionsToClean.add(peerId);
        setTimeout(function () {
            connectionsToClean.forEach(function (peerId) {
                if (peers[peerId]) {
                    if (peers[peerId].roomPeer) {
                        log("Peer " + peerId + " crashed. Making " + peer.roomPeer.id + " available")
                        peers[peerId].roomPeer.roomPeer = null;
                    }
                    log("Connection close. Deleteting peer " + peerId);
                    delete peers[peerId];
                }
            });
            connectionsToClean = new Set();
        }, 3000);
    });

})


function formatListOfPeers(peer) {
    var result = peer.name + "," + peer.id + ",1\n";
    for (peerId in peers) {
        var otherPeer = peers[peerId];
        if (isPeerCandidate(peer, otherPeer)) {
            result += otherPeer.name + "," + otherPeer.id + ",1\n"
        }
    }
    return result;
}

var logCounter = 0;
function log(message) {
    console.log(logCounter++ + " " + new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds() + " " + message);
    client.trackTrace(logCounter + " " + new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds() + " " + message);
}

function notifyOtherPeers(newPeer) {
    for (peerId in peers) {
        var otherPeer = peers[peerId];
        if (isPeerCandidate(newPeer, otherPeer)) {
            var data = newPeer.name + "," + newPeer.id + ",1\n";
            sendMessageToPeer(otherPeer, data);
        }
    }
}

function sendMessageToPeer(peer, payload, fromId) {
    var msg = {};
    if (payload) {
        msg.id = fromId || peer.id;
        msg.payload = payload;
        peer.messages.push(msg);
    }
    if (peer.waitSocket) {
        msg = peer.messages.shift();
        if (msg) {
            peer.waitSocket.res.set('Pragma', msg.id);
            peer.waitSocket.res.send(msg.payload);
            peer.waitSocket.waitPeer = null;
            peer.waitSocket.tmpData = "";
            peer.waitSocket = null;
        }
    }
}

function isPeerCandidate(peer, otherPeer) {
    return (otherPeer.id != peer.id && // filter self
        !otherPeer.roomPeer && // filter peers in 'rooms'
        otherPeer.peerType != peer.peerType) // filter out peers of same type
}

client.trackTrace("Signaling server running at port " + port);

httpServer.listen(port)

