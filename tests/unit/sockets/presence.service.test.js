const {
  getPresenceState,
  markUserConnected,
  markUserDisconnected,
  resetPresenceState,
} = require('../../../src/sockets/presence.service');

describe('presence service', () => {
  beforeEach(() => {
    resetPresenceState();
  });

  it('tracks multiple connections per user', () => {
    expect(markUserConnected('USR-1')).toEqual({
      userId: 'USR-1',
      isOnline: true,
      connections: 1,
    });

    expect(markUserConnected('USR-1')).toEqual({
      userId: 'USR-1',
      isOnline: true,
      connections: 2,
    });

    expect(getPresenceState(['USR-1', 'USR-2'])).toEqual([
      {
        userId: 'USR-1',
        isOnline: true,
        connections: 2,
      },
      {
        userId: 'USR-2',
        isOnline: false,
        connections: 0,
      },
    ]);
  });

  it('marks a user offline only when the last socket disconnects', () => {
    markUserConnected('USR-1');
    markUserConnected('USR-1');

    expect(markUserDisconnected('USR-1')).toEqual({
      userId: 'USR-1',
      isOnline: true,
      connections: 1,
    });

    expect(markUserDisconnected('USR-1')).toEqual({
      userId: 'USR-1',
      isOnline: false,
      connections: 0,
    });
  });
});
