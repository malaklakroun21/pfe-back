const onlineConnectionCounts = new Map();

const normalizeUserId = (userId) => {
  return String(userId || '').trim();
};

const buildPresenceState = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  const connections = onlineConnectionCounts.get(normalizedUserId) || 0;

  return {
    userId: normalizedUserId,
    isOnline: connections > 0,
    connections,
  };
};

const markUserConnected = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  const nextConnections = (onlineConnectionCounts.get(normalizedUserId) || 0) + 1;
  onlineConnectionCounts.set(normalizedUserId, nextConnections);

  return buildPresenceState(normalizedUserId);
};

const markUserDisconnected = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  const currentConnections = onlineConnectionCounts.get(normalizedUserId) || 0;
  const nextConnections = Math.max(0, currentConnections - 1);

  if (nextConnections === 0) {
    onlineConnectionCounts.delete(normalizedUserId);
  } else {
    onlineConnectionCounts.set(normalizedUserId, nextConnections);
  }

  return buildPresenceState(normalizedUserId);
};

const getPresenceState = (userIds = []) => {
  return userIds.map((userId) => buildPresenceState(userId));
};

const resetPresenceState = () => {
  onlineConnectionCounts.clear();
};

module.exports = {
  markUserConnected,
  markUserDisconnected,
  getPresenceState,
  resetPresenceState,
};
