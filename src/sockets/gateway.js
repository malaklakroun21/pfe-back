let ioInstance = null;

const getUserRoom = (userId) => {
  return `user:${userId}`;
};

const setSocketServer = (io) => {
  ioInstance = io;
};

const getSocketServer = () => {
  return ioInstance;
};

const emitToUsers = (userIds = [], eventName, payload, io = ioInstance) => {
  if (!io) {
    return;
  }

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  for (const userId of uniqueUserIds) {
    io.to(getUserRoom(userId)).emit(eventName, payload);
  }
};

const emitChatMessage = ({ senderUserId, recipientUserId, payload }, io = ioInstance) => {
  emitToUsers([senderUserId, recipientUserId], 'chat:message', payload, io);
};

const emitChatReadUpdate = ({ participantUserIds, payload }, io = ioInstance) => {
  emitToUsers(participantUserIds, 'chat:read:update', payload, io);
};

const emitSessionUpdate = (session, io = ioInstance) => {
  if (!session) {
    return;
  }

  emitToUsers([session.teacherId, session.learnerId], 'session:updated', session, io);
};

const emitPresenceUpdate = (presenceState, io = ioInstance) => {
  if (!io || !presenceState?.userId) {
    return;
  }

  io.emit('presence:update', presenceState);
};

module.exports = {
  getUserRoom,
  setSocketServer,
  getSocketServer,
  emitToUsers,
  emitChatMessage,
  emitChatReadUpdate,
  emitSessionUpdate,
  emitPresenceUpdate,
};
