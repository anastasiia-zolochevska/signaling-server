
 'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

 var port = process.env.PORT || 80;
 var app = http.createServer(function(req, res) {
   res.writeHead(200, { 'Content-Type': 'text/plain' });
   res.end('Signaling server\n');
 }).listen(port);


var appInsightsInstrumentationKey = "66eb311b-f091-41dc-8ddb-d8b1647091d3"
var appInsights = require("applicationinsights");
appInsights.setup(appInsightsInstrumentationKey).start();
var appInsightsClient = appInsights.getClient();



var io = socketIO.listen(app);
io.sockets.on('connection', function (socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    console.log(array);
    socket.emit('log', array);

    appInsightsClient.trackTrace(array.join(" "));
  }

  socket.on('message', function (message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function (room) {
    log('Received request to create or join room ' + room);

    var numClients = io.sockets.sockets.length;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 1) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    }
  });

  socket.on('ipaddr', function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function () {
    console.log('received bye');
  });

});
