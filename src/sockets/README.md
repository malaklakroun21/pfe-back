# src/sockets/

Real-time WebSocket event handlers using [Socket.io](https://socket.io/).

> **Status:** Planned — folder is scaffolded but not yet implemented.

---

## Purpose

Some features of the Skill Exchange platform require real-time communication:

| Feature                        | Socket event (planned)           |
|--------------------------------|----------------------------------|
| Live chat between users        | `message:send`, `message:receive`|
| Session status notifications   | `session:updated`                |
| Online presence indicators     | `user:online`, `user:offline`    |

---

## Planned Structure

```
sockets/
├── index.js          # Initialises Socket.io server and registers namespaces
├── chat.socket.js    # Handles messaging events
└── session.socket.js # Handles session lifecycle events
```

### `index.js` (planned)

```js
const { Server } = require('socket.io');

const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  io.on('connection', (socket) => {
    require('./chat.socket')(io, socket);
    require('./session.socket')(io, socket);
  });
};

module.exports = initSockets;
```

Then in `server.js`:
```js
const server = http.createServer(app);
initSockets(server);
server.listen(PORT);
```

---

## Authentication with Sockets

Socket connections from authenticated users must pass a JWT in the handshake:

```js
// Client-side
const socket = io('http://localhost:5000', {
  auth: { token: 'Bearer <jwt>' },
});
```

A middleware on the Socket.io server will verify the token and attach the user before any event is handled.

---

## Getting Started

To implement this module, install Socket.io:

```bash
npm install socket.io
```
