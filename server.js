
var express = require('express')
var bodyParser = require('body-parser')

var clientCounter = 1;
var clientToId = {};
var generalRoom = "GENERAL";
var peers = {};

var port = process.env.PORT || 3000;


var app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.text())


app.get('/sign_in', function (req, res) {
    var client = {};
    console.log(req.url);
    var newPeer = {}
    newPeer.id = clientCounter++;
    newPeer.peerType = 'client';
    newPeer.messages = [];
    newPeer.name = req.url.substring(req.url.indexOf("?") + 1, req.url.length - 1);
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
    console.log(req.url);
    console.log(req.body);
    console.log(req.headers['content-length']);
    var fromId = req.query.peer_id;
    var toId = req.query.to;
    var payload = req.body;
    var contentLength = req.headers['content-length'];
    contentLength = parseInt(contentLength);
    if (!peers[toId] || !peers[fromId]) {
        res.status(400).send();
    }
    if (contentLength <= payload.length) {
        peers[toId].roomPeer = peers[fromId]
        peers[fromId].roomPeer = peers[toId];
        sendMessageToPeer(peers[toId], payload, fromId);
        res.set('Pragma', fromId);
        res.send();
    }

})

app.get('/sign_out', function (req, res) {
    console.log(req.url);
    var peerId = req.query.peer_id;
    var peer = peers[peerId]
    delete peers[peerId]

    if (peer.roomPeer) {
        peer.roomPeer.roomPeer = null;
        peer.roomPeer = null;
    }
    res.set('Pragma', peerId);
    res.send();
})


app.get('/wait', function (req, res) {
    console.log(req.url);
    var peerId = req.query.peer_id;
    var socket = {};
    socket.waitPeer = peers[peerId];
    socket.res = res;
    peers[peerId].waitSocket = socket;
    sendMessageToPeer(peers[peerId], null, null);
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


app.listen(port)

