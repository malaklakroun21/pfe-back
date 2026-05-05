const { Server } = require('socket.io');

const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');
const { emitPresenceUpdate, getUserRoom, setSocketServer } = require('./gateway');
const registerChatSocket = require('./chat.socket');
const registerPresenceSocket = require('./presence.socket');
const { markUserConnected, markUserDisconnected } = require('./presence.service');
const registerSessionSocket = require('./session.socket');

const extractBearerToken = (rawToken) => {
  if (!rawToken) {
    return '';
  }

  const token = String(rawToken).trim();
  return token.startsWith('Bearer ') ? token.slice(7).trim() : token;
};

const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });
  setSocketServer(io);

  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      const accessToken = extractBearerToken(rawToken);

      if (!accessToken) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(accessToken);
      const user = await User.findOne({ userId: payload.sub });

      if (!user || user.accountStatus !== 'ACTIVE') {
        return next(new Error('Unauthorized'));
      }

      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error(error.message || 'Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(getUserRoom(socket.user.userId));
    const presenceState = markUserConnected(socket.user.userId);
    emitPresenceUpdate(presenceState, io);

    registerChatSocket(io, socket);
    registerPresenceSocket(socket);
    registerSessionSocket(io, socket);

    socket.on('disconnect', () => {
      const nextPresenceState = markUserDisconnected(socket.user.userId);
      emitPresenceUpdate(nextPresenceState, io);
    });
  });

  return io;
};

module.exports = initSockets;
