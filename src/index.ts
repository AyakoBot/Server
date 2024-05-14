import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { handler } from '../build/handler.js';

const app = express();
const server = createServer(app);

app.use(handler);

server.listen(process.env.PORT);
console.log('| Server startet');
