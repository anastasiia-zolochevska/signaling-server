
var express = require('express')
var bodyParser = require('body-parser')
appInsights = require("applicationinsights");
var client = appInsights.getClient();

var clientCounter = 1;
var clientToId = {};
var peers = {};

var port = process.env.PORT || 3000;


var app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.text())


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
        res.set('Pragma', fromId);
        res.send("Ok");
    }

})

app.get('/sign_out', function (req, res) {
    log(req.url);
    var peerId = req.query.peer_id;
    signOut(peerId);

    res.set('Pragma', peerId);
    res.send("Ok");
})


var connectionsToClean = [];

app.get('/wait', function (req, res) {
    log(req.url);
    var peerId = req.query.peer_id;
    if (connectionsToClean.indexOf(peerId)!=-1) {
        connectionsToClean.splice(connectionsToClean.indexOf(peerId), 1)
    }
    var socket = {};
    socket.waitPeer = peers[peerId];
    socket.res = res;
    peers[peerId].waitSocket = socket;

    req.connection.on('close', function () {

        var clearConnection = true;
        for (var key in peers) {
            if (!(peers[key]).waitSocket) {
                clearConnection = false;
            }
        }
        if (clearConnection) {
            log("CRASH "+peerId);
            connectionsToClean.push(peerId);
        }
        setTimeout(function () {
            connectionsToClean.forEach(function (peerId) {
                signOut(peerId);
                log("Cleaning connections "+peerId)
            });
            connectionsToClean=[];
        }, 3000);
    });

    sendMessageToPeer(peers[peerId], null, null);
})

function signOut(peerId) {
    var peer = peers[peerId];

    if (peer && peer.roomPeer) {
        peer.roomPeer.waitSocket.res.set('Pragma', peerId);
        peer.roomPeer.waitSocket.res.send("BYE");
        peer.roomPeer.roomPeer = null;
        peer.roomPeer = null;
    }
    delete peers[peerId];
}


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

function log(message) {
    console.log(message);
    client.trackTrace(message);
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
            console.log("Sending", msg.payload);
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

app.listen(port)

