# src/sockets/

Real-time WebSocket event handlers using [Socket.io](https://socket.io/).

## Status

This module is implemented and currently powers:

- authenticated chat events
- message read receipts
- online/offline presence updates
- session lifecycle updates
- socket-based resync helpers for chat and sessions

## Implemented Files

```text
sockets/
|- index.js             # Initializes Socket.IO server + auth middleware
|- chat.socket.js       # Chat send/read/sync events
|- session.socket.js    # Session request/list/update events
|- presence.socket.js   # Presence lookup events
|- presence.service.js  # In-memory online/offline tracking
|- gateway.js           # Shared emit helpers used by HTTP + sockets
|- socket.utils.js      # Ack/error/validation/rate-limit helpers
```

## Authentication

Socket connections require a JWT in the handshake:

```js
const socket = io('http://localhost:5000', {
  auth: {
    token: 'Bearer <jwt>',
  },
});
```

The server validates the token, loads the user, rejects inactive accounts, and joins the room:

```text
user:<userId>
```

## Chat Events

Client emits:

- `chat:send`
  payload: `{ recipientUserId, content }`
- `chat:read`
  payload: `{ messageId }`
- `chat:listConversations`
  payload: optional empty object
- `chat:getConversation`
  payload: `{ userId }`

Server emits:

- `chat:message`
- `chat:read:update`
- `socket:error`

## Presence Events

Client emits:

- `presence:get`
  payload: `{ userIds: [...] }`

Server emits:

- `presence:update`

Each presence payload has:

```json
{
  "userId": "USR-123",
  "isOnline": true,
  "connections": 1
}
```

## Session Events

Client emits:

- `session:list`
- `session:request`
- `session:accept`
- `session:reject`
- `session:complete`

Server emits:

- `session:updated`

Session updates are also emitted when the corresponding HTTP endpoints are used, so REST and socket flows stay in sync.

## Notes

- Socket payloads are validated before hitting the service layer.
- Basic in-memory rate limiting is applied to chat, presence, and session events.
- Presence tracking is currently in-memory, which is fine for a single backend instance.
- Multi-instance deployments would need a shared adapter/store such as Redis.
