#!/usr/bin/env node
// Mini WebSocket-broadcast-server voor de websocket-voorbeeldapp.
// Elk ontvangen bericht wordt doorgestuurd naar ALLE verbonden clients
// (groepschat). Vereist alleen het 'ws'-pakket:  npm install ws
//
//   node server.js            # luistert op ws://localhost:8091
//   PORT=9000 node server.js  # andere poort

const { WebSocketServer } = require('ws');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8091;
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (socket, req) => {
  const who = req.socket.remoteAddress;
  console.log(`[+] client verbonden (${who}) · totaal: ${wss.clients.size}`);

  socket.on('message', (data, isBinary) => {
    // Broadcast naar iedereen (inclusief afzender, zodat de echo-logica werkt)
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(data, { binary: isBinary });
      }
    }
  });

  socket.on('close', () => {
    console.log(`[-] client weg · totaal: ${wss.clients.size}`);
  });
});

console.log(`WebSocket-broadcast-server luistert op ws://localhost:${PORT}`);
