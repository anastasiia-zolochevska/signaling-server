
'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var port = process.env.PORT || 80;
var app = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Signaling server\n');
}).listen(port);


var appInsightsInstrumentationKey = "66eb311b-f091-41dc-8ddb-d8b1647091d3"
var appInsights = require("applicationinsights");
appInsights.setup(appInsightsInstrumentationKey).setAutoCollectExceptions(true).start();
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

  socket.on('message', function (message, room) {
    log('Client said: ', message);
    io.to(room).emit('message', message);
  });

  socket.on('join', function (room) {
    socket.join(room);
  });

  socket.on('bye', function (room) {
    socket.leave(room)
  });

});
