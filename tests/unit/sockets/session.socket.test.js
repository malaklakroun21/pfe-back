jest.mock('../../../src/services/session.service', () => ({
  listSessionsForUser: jest.fn(),
  requestSession: jest.fn(),
  acceptSession: jest.fn(),
  rejectSession: jest.fn(),
  completeSession: jest.fn(),
}));

const sessionService = require('../../../src/services/session.service');
const registerSessionSocket = require('../../../src/sockets/session.socket');

const createSocket = () => {
  const handlers = {};
  const socket = {
    user: {
      userId: 'USR-LEARNER',
      role: 'LEARNER',
    },
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

const createIo = () => {
  const emittedEvents = [];

  return {
    emittedEvents,
    to: jest.fn((room) => ({
      emit: (eventName, payload) => {
        emittedEvents.push({ room, eventName, payload });
      },
    })),
  };
};

describe('session socket handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates session:request payloads', async () => {
    const io = createIo();
    const { socket, handlers } = createSocket();
    const ack = jest.fn();

    registerSessionSocket(io, socket);

    await handlers['session:request']({ teacherId: 'USR-TEACHER' }, ack);

    expect(sessionService.requestSession).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      })
    );
  });

  it('emits session updates to both participants when a session is requested', async () => {
    const io = createIo();
    const { socket, handlers } = createSocket();
    const ack = jest.fn();
    const session = {
      sessionId: 'SES-1',
      learnerId: 'USR-LEARNER',
      teacherId: 'USR-TEACHER',
      status: 'PENDING',
    };

    sessionService.requestSession.mockResolvedValue(session);
    registerSessionSocket(io, socket);

    await handlers['session:request'](
      {
        teacherId: 'USR-TEACHER',
        skill: 'Node.js',
        duration: 2,
        date: '2026-05-10T10:00:00.000Z',
        message: 'Can we work on APIs?',
      },
      ack
    );

    expect(io.emittedEvents).toEqual([
      {
        room: 'user:USR-TEACHER',
        eventName: 'session:updated',
        payload: session,
      },
      {
        room: 'user:USR-LEARNER',
        eventName: 'session:updated',
        payload: session,
      },
    ]);
    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: session,
    });
  });

  it('supports session:list acknowledgements and session actions', async () => {
    const io = createIo();
    const { socket, handlers } = createSocket();
    const listAck = jest.fn();
    const acceptAck = jest.fn();
    const completeAck = jest.fn();
    const sessions = [{ sessionId: 'SES-1' }];
    const acceptedSession = {
      sessionId: 'SES-1',
      learnerId: 'USR-LEARNER',
      teacherId: 'USR-TEACHER',
      status: 'ACCEPTED',
    };
    const completedSession = {
      sessionId: 'SES-1',
      learnerId: 'USR-LEARNER',
      teacherId: 'USR-TEACHER',
      status: 'COMPLETED',
      actualDuration: 1.5,
      chargedCredits: 1.5,
    };

    sessionService.listSessionsForUser.mockResolvedValue(sessions);
    sessionService.acceptSession.mockResolvedValue(acceptedSession);
    sessionService.completeSession.mockResolvedValue(completedSession);
    registerSessionSocket(io, socket);

    await handlers['session:list']({ role: 'LEARNER' }, listAck);
    await handlers['session:accept']({ sessionId: 'SES-1' }, acceptAck);
    await handlers['session:complete']({ sessionId: 'SES-1', actualDuration: 1.5 }, completeAck);

    expect(listAck).toHaveBeenCalledWith({
      success: true,
      data: sessions,
    });
    expect(acceptAck).toHaveBeenCalledWith({
      success: true,
      data: acceptedSession,
    });
    expect(sessionService.completeSession).toHaveBeenCalledWith(socket.user, 'SES-1', {
      actualDuration: 1.5,
    });
    expect(completeAck).toHaveBeenCalledWith({
      success: true,
      data: completedSession,
    });
    expect(io.emittedEvents).toContainEqual({
      room: 'user:USR-TEACHER',
      eventName: 'session:updated',
      payload: acceptedSession,
    });
    expect(io.emittedEvents).toContainEqual({
      room: 'user:USR-LEARNER',
      eventName: 'session:updated',
      payload: completedSession,
    });
  });
});
