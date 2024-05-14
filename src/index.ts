import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from '../build/handler.js';

const port = 5174;
const app = express();
const server = createServer(app);

const io = new Server(server);
const connections: string[] = [];

io.on('connection', (socket) => {
	if (socket.handshake.auth.code !== process.env.SOCKET_TOKEN) {
		socket.disconnect();
		console.log('Bad Auth Code');
		return;
	}

	connections.push(socket.id);

	socket.onAny((...data) => {
  if (data[0] !== 'message') return;
  
		console.log(JSON.stringify(data));
		connections.filter((cl) => cl !== socket.id).forEach((cl) => io.to(cl).emit('message', data));
	});

	socket.on('disconnect', () => connections.splice(connections.indexOf(socket.id), 1));
});

app.use(handler);

server.listen(port);
console.log('| Server startet');
