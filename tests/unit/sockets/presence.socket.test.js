const registerPresenceSocket = require('../../../src/sockets/presence.socket');
const {
  markUserConnected,
  resetPresenceState,
} = require('../../../src/sockets/presence.service');

const createSocket = () => {
  const handlers = {};
  const socket = {
    data: {},
    on: jest.fn((eventName, handler) => {
      handlers[eventName] = handler;
    }),
    emit: jest.fn(),
  };

  return {
    socket,
    handlers,
  };
};

describe('presence socket handlers', () => {
  beforeEach(() => {
    resetPresenceState();
  });

  it('returns presence snapshots through acknowledgements', async () => {
    const { socket, handlers } = createSocket();
    const ack = jest.fn();

    markUserConnected('USR-ONLINE');
    registerPresenceSocket(socket);

    await handlers['presence:get'](
      {
        userIds: ['USR-ONLINE', 'USR-OFFLINE'],
      },
      ack
    );

    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          userId: 'USR-ONLINE',
          isOnline: true,
          connections: 1,
        },
        {
          userId: 'USR-OFFLINE',
          isOnline: false,
          connections: 0,
        },
      ],
    });
  });
});
