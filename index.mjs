import path from 'path';
import WebSocket from 'ws';
import express from 'express';
import http from 'http';
import WatchMessageHandler from './src/shared/DrawMessageHandler.mjs';
import Connection from '@uncut/hotel/src/Connection.mjs';

const PORT = process.env.PORT || 8080;

const app = express();
const server = http.Server(app);
const wss = new WebSocket.Server({ server: server });

// Hotel
const handler = new WatchMessageHandler;
const con = new Connection(wss, handler);


function randomRoomId() {
    return Math.floor(Math.random() * 1000000).toString();
}

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use('/node_modules', express.static('./node_modules'));
app.use('/static', express.static('./public'));

app.get('/', (req, res) => res.redirect("/" + randomRoomId()));

app.get('/:roomId', (req, res) => {
    res.sendFile(path.resolve("./public/index.html"));
});

app.use((req, res, next) => {
    res.status(404);
    res.redirect("/");
});

server.listen(PORT, () => console.log('Listening on port ' + PORT));
