
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


var app = express();

var httpServer = http.createServer(app);

httpServer.keepAliveTimeout = 120000;

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.text())


// var access = fs.createWriteStream('D:\home\site\wwwroot\api.access.log' + new Date().getMilliseconds());

// process.stdout.write = process.stderr.write = access.write.bind(access);

process.on('uncaughtException', function (err) {
    console.error((err && err.stack) ? err.stack : err);
});

app.get('/sign_in', function (req, res) {
    var client = {};
    log(req.url);
    var newPeer = {}
    newPeer.id = clientCounter++;
    newPeer.peerType = 'client';
    newPeer.messages = [];

    newPeer.name = req.url.substring(req.url.indexOf("?") + 1, req.url.length);
    if (newPeer.name.indexOf("renderingclient_") != -1) {
        newPeer.peerType = 'client';
    }
    if (newPeer.name.indexOf("renderingserver_") != -1) {
        newPeer.peerType = 'server';
    }
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
        if (JSON.parse(payload).sdpMid == "video") {
            peers[fromId].videoDataExchanged = true;
            if (peers[toId].videoDataExchanged) {
                delete peers[fromId];
                delete peers[toId];
            }
        }
        res.set('Pragma', fromId);
        res.send("Ok");
    }
})

app.get('/sign_out', function (req, res) {
    log(req.url);
    var peerId = req.query.peer_id;
    delete peers[peerId];

    res.set('Pragma', peerId);
    res.send("Ok");
})


app.get('/wait', function (req, res) {
    log(req.url);
    var peerId = req.query.peer_id;
    if (peers[peerId]) {
        var socket = {};
        socket.waitPeer = peers[peerId];
        socket.res = res;
        peers[peerId].waitSocket = socket;

        sendMessageToPeer(peers[peerId], null, null);
    }
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
        otherPeer.peerType != peer.peerType) // filter out peers of same type
}

client.trackTrace("Signaling server running at port " + port);

httpServer.listen(port)

