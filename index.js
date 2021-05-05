#!/usr/bin/env node

const net = require('net');
const args = process.argv.slice(2);
var verbose = false;
var uri = args[1];

if (!args.length) return console.log("Usage: tcpforwarder-timeout <port> <target:port> <timeout [Second]> <max device (Optional)>\n\nOptions:\n-v --verbose | Verbose any send & received traffic by Client & Server");
if (Number(args[0]) === 0|| Number(args[0]) === NaN) return console.error("Please provide a valid port to listen to.")
if (!uri) return console.error("No target was provided.");
if (!uri.startsWith("tcp:")) uri = "tcp:" + uri;
let max = Number(args[3]);
var forwardFrom = require("url").parse(uri);
const forwardToPort = Number(args[0]);
if (args.includes("-v") || args.includes("--verbose")) verbose = true;
// Server
const server = new net.Server();

server.listen(forwardToPort, "0.0.0.0");

let connectedDevice = 0;
server.on('connection', socket => {
	// Here client begins
	connectedDevice++
	var client = new net.Socket();
	client.on('error', socket.destroy);
	socket.on('error', client.destroy);
	client.on('close', socket.destroy);
	socket.on('close', () => {
		connectedDevice--
		client.destroy();
	});
	client.connect(forwardFrom.port, forwardFrom.hostname);
	socket.pipe(client).pipe(socket);
	if (max) {
		if (connectedDevice > max) return socket.destroy();
	}
	setTimeout(() => {
		socket.destroy();
		client.destroy();
	}, `${Number(args[2]) || 120}000`)
	if (!verbose) return;
	socket.on('data', data => console.log("├── Client:", data.toString('utf8')));
	client.on('data', data => console.log("├── Server:", data.toString('utf8')));
});

server.on('listening', () => {
	console.log(`├── Now forwarding from ${forwardFrom.hostname}:${forwardFrom.port}`)
	console.log(`└── 0.0.0.0:${forwardToPort}`);
	if (!verbose) return;
	console.log("─── Verbose Enabled ───");
});

server.on('error', console.error);
