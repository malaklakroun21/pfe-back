jest.mock('../../../src/services/message.service', () => ({
  sendMessage: jest.fn(),
  markMessageAsRead: jest.fn(),
  listConversations: jest.fn(),
  getConversationWithUser: jest.fn(),
  getConversationParticipantUserIds: jest.fn(),
}));

const messageService = require('../../../src/services/message.service');
const registerChatSocket = require('../../../src/sockets/chat.socket');

const createSocket = () => {
  const handlers = {};
  const socket = {
    user: {
      userId: 'USR-A',
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

describe('chat socket handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates chat:send payloads before calling the service', async () => {
    const io = createIo();
    const { socket, handlers } = createSocket();
    const ack = jest.fn();

    registerChatSocket(io, socket);

    await handlers['chat:send']({ recipientUserId: 'USR-B' }, ack);

    expect(messageService.sendMessage).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      })
    );
  });

  it('emits chat messages to sender and recipient rooms', async () => {
    const io = createIo();
    const { socket, handlers } = createSocket();
    const ack = jest.fn();
    const result = {
      conversationId: 'CONV-1',
      message: {
        messageId: 'MSG-1',
        senderId: 'USR-A',
        content: 'hello',
      },
    };

    messageService.sendMessage.mockResolvedValue(result);
    registerChatSocket(io, socket);

    await handlers['chat:send'](
      {
        recipientUserId: 'USR-B',
        content: 'hello',
      },
      ack
    );

    expect(messageService.sendMessage).toHaveBeenCalledWith(socket.user, {
      recipientUserId: 'USR-B',
      content: 'hello',
    });
    expect(io.emittedEvents).toEqual([
      {
        room: 'user:USR-A',
        eventName: 'chat:message',
        payload: result,
      },
      {
        room: 'user:USR-B',
        eventName: 'chat:message',
        payload: result,
      },
    ]);
    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: result,
    });
  });

  it('emits read updates to both conversation participants', async () => {
    const io = createIo();
    const { socket, handlers } = createSocket();
    const ack = jest.fn();
    const readMessage = {
      messageId: 'MSG-1',
      conversationId: 'CONV-1',
      isRead: true,
    };

    messageService.markMessageAsRead.mockResolvedValue(readMessage);
    messageService.getConversationParticipantUserIds.mockResolvedValue(['USR-A', 'USR-B']);
    registerChatSocket(io, socket);

    await handlers['chat:read'](
      {
        messageId: 'MSG-1',
      },
      ack
    );

    expect(io.emittedEvents).toEqual([
      {
        room: 'user:USR-A',
        eventName: 'chat:read:update',
        payload: readMessage,
      },
      {
        room: 'user:USR-B',
        eventName: 'chat:read:update',
        payload: readMessage,
      },
    ]);
    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: readMessage,
    });
  });

  it('supports chat resync helpers through acknowledgements', async () => {
    const io = createIo();
    const { socket, handlers } = createSocket();
    const listAck = jest.fn();
    const conversationAck = jest.fn();
    const conversations = [{ conversationId: 'CONV-1' }];
    const conversation = { conversationId: 'CONV-1', messages: [] };

    messageService.listConversations.mockResolvedValue(conversations);
    messageService.getConversationWithUser.mockResolvedValue(conversation);
    registerChatSocket(io, socket);

    await handlers['chat:listConversations'](listAck);
    await handlers['chat:getConversation']({ userId: 'USR-B' }, conversationAck);

    expect(listAck).toHaveBeenCalledWith({
      success: true,
      data: conversations,
    });
    expect(conversationAck).toHaveBeenCalledWith({
      success: true,
      data: conversation,
    });
  });

  it('emits socket:error when an event fails without an acknowledgement', async () => {
    const io = createIo();
    const { socket, handlers } = createSocket();

    messageService.listConversations.mockRejectedValue(new Error('boom'));
    registerChatSocket(io, socket);

    await handlers['chat:listConversations']({});

    expect(socket.emit).toHaveBeenCalledWith(
      'socket:error',
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'SOCKET_ERROR',
        }),
      })
    );
  });
});
