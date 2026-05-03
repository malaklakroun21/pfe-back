const CreditBalance = require('../../../src/models/CreditBalance');
const Learner = require('../../../src/models/Learner');
const Session = require('../../../src/models/Session');
const SessionRequest = require('../../../src/models/SessionRequest');
const Skill = require('../../../src/models/Skill');
const SkillCategory = require('../../../src/models/SkillCategory');
const User = require('../../../src/models/User');
const sessionService = require('../../../src/services/session.service');

jest.mock('../../../src/models/CreditBalance', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../../src/models/Learner', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/models/Session', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/models/SessionRequest', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/models/Skill', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/models/SkillCategory', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/models/User', () => ({
  findOne: jest.fn(),
}));

const createSessionRequestDoc = (overrides = {}) => {
  return {
    requestId: 'REQ-123',
    learnerId: 'LRN-123',
    teacherId: 'LRN-999',
    skillId: 'SKL-123',
    requestStatus: 'PENDING',
    preferredDuration: 2,
    responseDate: undefined,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
};

const createSkillDoc = (overrides = {}) => {
  return {
    skillId: 'SKILL-123',
    userId: 'USR-123',
    categoryId: 'CATEGORY-GENERAL-AUTO',
    skillName: 'React',
    proficiencyLevel: 'INTERMEDIATE',
    ...overrides,
  };
};

const createSessionDoc = (overrides = {}) => {
  return {
    sessionId: 'SES-123',
    requestId: 'REQ-123',
    learnerId: 'LRN-123',
    teacherId: 'LRN-999',
    skillId: 'SKL-123',
    sessionStatus: 'PENDING',
    startTime: new Date('2026-05-03T10:00:00.000Z'),
    endTime: new Date('2026-05-03T11:00:00.000Z'),
    creditsExchanged: 2,
    save: jest.fn().mockResolvedValue(undefined),
    toObject() {
      return {
        sessionId: this.sessionId,
        requestId: this.requestId,
        learnerId: this.learnerId,
        teacherId: this.teacherId,
        skillId: this.skillId,
        sessionStatus: this.sessionStatus,
        startTime: this.startTime,
        endTime: this.endTime,
        creditsExchanged: this.creditsExchanged,
      };
    },
    ...overrides,
  };
};

describe('session.service createSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a pending session when the requester has enough credits', async () => {
    Learner.findOne.mockResolvedValue({
      learnerId: 'LRN-123',
      userId: 'USR-123',
    });

    SessionRequest.findOne.mockResolvedValue(
      createSessionRequestDoc({
        scheduledDate: new Date('2026-05-03T10:00:00.000Z'),
      })
    );

    Session.findOne.mockResolvedValue(null);
    CreditBalance.findOne.mockResolvedValue({
      currentBalance: 5,
    });
    Session.create.mockResolvedValue(createSessionDoc());

    const result = await sessionService.createSession(
      { userId: 'USR-123' },
      {
        requestId: 'REQ-123',
        endTime: '2026-05-03T11:00:00.000Z',
      }
    );

    expect(Session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'REQ-123',
        learnerId: 'LRN-123',
        teacherId: 'LRN-999',
        skillId: 'SKL-123',
        sessionStatus: 'PENDING',
        creditsExchanged: 2,
      })
    );
    expect(result.sessionStatus).toBe('PENDING');
    expect(result.requestId).toBe('REQ-123');
  });

  it('throws when the requester does not have enough credits', async () => {
    Learner.findOne.mockResolvedValue({
      learnerId: 'LRN-123',
      userId: 'USR-123',
    });

    SessionRequest.findOne.mockResolvedValue(
      createSessionRequestDoc({
        preferredDuration: 4,
      })
    );

    Session.findOne.mockResolvedValue(null);
    CreditBalance.findOne.mockResolvedValue({
      currentBalance: 1,
    });

    await expect(
      sessionService.createSession(
        { userId: 'USR-123' },
        {
          requestId: 'REQ-123',
        }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INSUFFICIENT_CREDITS',
    });

    expect(Session.create).not.toHaveBeenCalled();
  });

  it('creates a real direct session without a seeded request', async () => {
    const learnerDoc = {
      learnerId: 'LRN-SELF-123',
      userId: 'USR-123',
    };
    const directRequestDoc = createSessionRequestDoc({
      requestId: 'REQ-DIRECT-123',
      learnerId: 'LRN-SELF-123',
      teacherId: 'LRN-SELF-123',
      skillId: 'SKILL-123',
      preferredDuration: 1,
    });

    Learner.findOne.mockResolvedValue(null);
    Learner.create.mockResolvedValue(learnerDoc);
    Skill.findOne.mockResolvedValue(null);
    SkillCategory.findOne.mockResolvedValue({
      categoryId: 'CATEGORY-GENERAL-AUTO',
    });
    Skill.create.mockResolvedValue(createSkillDoc());
    SessionRequest.create.mockResolvedValue(directRequestDoc);
    CreditBalance.findOne.mockResolvedValue({
      currentBalance: 10,
    });
    Session.create.mockResolvedValue(
      createSessionDoc({
        requestId: 'REQ-DIRECT-123',
        learnerId: 'LRN-SELF-123',
        teacherId: 'LRN-SELF-123',
        skillId: 'SKILL-123',
      })
    );

    const result = await sessionService.createSession(
      { userId: 'USR-123', timeCredits: { toString: () => '10' } },
      {
        skillName: 'React',
        startTime: '2026-05-05T10:00:00.000Z',
        endTime: '2026-05-05T11:00:00.000Z',
      }
    );

    expect(Learner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'USR-123',
      })
    );
    expect(Skill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'USR-123',
        skillName: 'React',
      })
    );
    expect(SessionRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: 'LRN-SELF-123',
        teacherId: 'LRN-SELF-123',
        skillId: 'SKILL-123',
        requestStatus: 'PENDING',
      })
    );
    expect(Session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'REQ-DIRECT-123',
        learnerId: 'LRN-SELF-123',
        teacherId: 'LRN-SELF-123',
        skillId: 'SKILL-123',
        sessionStatus: 'PENDING',
      })
    );
    expect(result.sessionStatus).toBe('PENDING');
  });
});

describe('session.service cancelSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows either session party to cancel before completion', async () => {
    const sessionDoc = createSessionDoc({
      learnerId: 'LRN-111',
      teacherId: 'LRN-222',
      sessionStatus: 'SCHEDULED',
    });

    Learner.findOne.mockResolvedValue({
      learnerId: 'LRN-222',
      userId: 'USR-222',
    });
    Session.findOne.mockResolvedValue(sessionDoc);

    const result = await sessionService.cancelSession({ userId: 'USR-222' }, 'SES-123');

    expect(Session.findOne).toHaveBeenCalledWith({ sessionId: 'SES-123' });
    expect(sessionDoc.sessionStatus).toBe('CANCELLED');
    expect(sessionDoc.save).toHaveBeenCalled();
    expect(result.sessionStatus).toBe('CANCELLED');
  });

  it('rejects cancellation after completion', async () => {
    const sessionDoc = createSessionDoc({
      learnerId: 'LRN-111',
      teacherId: 'LRN-222',
      sessionStatus: 'COMPLETED',
    });

    Learner.findOne.mockResolvedValue({
      learnerId: 'LRN-111',
      userId: 'USR-111',
    });
    Session.findOne.mockResolvedValue(sessionDoc);

    await expect(
      sessionService.cancelSession({ userId: 'USR-111' }, 'SES-123')
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'SESSION_NOT_CANCELLABLE',
    });

    expect(sessionDoc.save).not.toHaveBeenCalled();
  });
});

describe('session.service provider response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the provider to accept a pending session', async () => {
    const sessionDoc = createSessionDoc({
      teacherId: 'LRN-222',
      sessionStatus: 'PENDING',
    });
    const requestDoc = createSessionRequestDoc();

    Learner.findOne.mockResolvedValue({
      learnerId: 'LRN-222',
      userId: 'USR-222',
    });
    Session.findOne.mockResolvedValue(sessionDoc);
    SessionRequest.findOne.mockResolvedValue(requestDoc);

    const result = await sessionService.acceptSession({ userId: 'USR-222' }, 'SES-123');

    expect(sessionDoc.sessionStatus).toBe('SCHEDULED');
    expect(sessionDoc.save).toHaveBeenCalled();
    expect(requestDoc.requestStatus).toBe('ACCEPTED');
    expect(requestDoc.responseDate).toBeInstanceOf(Date);
    expect(requestDoc.save).toHaveBeenCalled();
    expect(result.sessionStatus).toBe('SCHEDULED');
  });

  it('allows the provider to reject a pending session', async () => {
    const sessionDoc = createSessionDoc({
      teacherId: 'LRN-222',
      sessionStatus: 'PENDING',
    });
    const requestDoc = createSessionRequestDoc();

    Learner.findOne.mockResolvedValue({
      learnerId: 'LRN-222',
      userId: 'USR-222',
    });
    Session.findOne.mockResolvedValue(sessionDoc);
    SessionRequest.findOne.mockResolvedValue(requestDoc);

    const result = await sessionService.rejectSession({ userId: 'USR-222' }, 'SES-123');

    expect(sessionDoc.sessionStatus).toBe('CANCELLED');
    expect(sessionDoc.save).toHaveBeenCalled();
    expect(requestDoc.requestStatus).toBe('REJECTED');
    expect(requestDoc.responseDate).toBeInstanceOf(Date);
    expect(requestDoc.save).toHaveBeenCalled();
    expect(result.sessionStatus).toBe('CANCELLED');
  });

  it('rejects accept when the current user is not the provider', async () => {
    const sessionDoc = createSessionDoc({
      teacherId: 'LRN-222',
      sessionStatus: 'PENDING',
    });

    Learner.findOne.mockResolvedValue({
      learnerId: 'LRN-111',
      userId: 'USR-111',
    });
    Session.findOne.mockResolvedValue(sessionDoc);

    await expect(
      sessionService.acceptSession({ userId: 'USR-111' }, 'SES-123')
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects provider response when the session is no longer pending', async () => {
    const sessionDoc = createSessionDoc({
      teacherId: 'LRN-222',
      sessionStatus: 'SCHEDULED',
    });

    Learner.findOne.mockResolvedValue({
      learnerId: 'LRN-222',
      userId: 'USR-222',
    });
    Session.findOne.mockResolvedValue(sessionDoc);

    await expect(
      sessionService.rejectSession({ userId: 'USR-222' }, 'SES-123')
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'SESSION_NOT_PENDING',
    });
  });
});
