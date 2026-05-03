const CreditBalance = require('../../../src/models/CreditBalance');
const CreditTransaction = require('../../../src/models/CreditTransaction');
const User = require('../../../src/models/User');
const authService = require('../../../src/services/auth.service');

jest.mock('../../../src/models/CreditBalance', () => ({
  create: jest.fn(),
}));

jest.mock('../../../src/models/CreditTransaction', () => ({
  create: jest.fn(),
}));

jest.mock('../../../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/utils/hash', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock('../../../src/utils/jwt', () => ({
  signAccessToken: jest.fn(),
}));

const { hashPassword, comparePassword } = require('../../../src/utils/hash');
const { signAccessToken } = require('../../../src/utils/jwt');

const createUserDoc = (overrides = {}) => {
  return {
    userId: 'USR-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: 'LEARNER',
    accountStatus: 'ACTIVE',
    timeCredits: { toString: () => '10' },
    lastLogin: undefined,
    save: jest.fn().mockResolvedValue(undefined),
    toObject() {
      return {
        userId: this.userId,
        email: this.email,
        passwordHash: this.passwordHash,
        firstName: this.firstName,
        lastName: this.lastName,
        role: this.role,
        accountStatus: this.accountStatus,
        timeCredits: this.timeCredits,
        lastLogin: this.lastLogin,
      };
    },
    ...overrides,
  };
};

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signAccessToken.mockReturnValue('mock-token');
  });

  describe('register', () => {
    it('gives new users 10 welcome credits and creates the credit records', async () => {
      const createdUser = createUserDoc();

      User.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hashed-password');
      User.create.mockResolvedValue(createdUser);
      CreditBalance.create.mockResolvedValue({});
      CreditTransaction.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        })
      );
      expect(User.create.mock.calls[0][0].timeCredits.toString()).toBe('10');
      expect(CreditBalance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'USR-123',
          currentBalance: 10,
          totalEarned: 10,
          totalSpent: 0,
          updatedBy: 'SYSTEM',
        })
      );
      expect(CreditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'USR-123',
          transactionType: 'INITIAL_ALLOCATION',
          amount: 10,
          balanceBefore: 0,
          balanceAfter: 10,
          initiatedBy: 'SYSTEM',
        })
      );
      expect(result.accessToken).toBe('mock-token');
      expect(result.user.passwordHash).toBeUndefined();
    });

    it('throws ApiError when the email is already in use', async () => {
      User.findOne.mockResolvedValue(createUserDoc());

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'EMAIL_ALREADY_EXISTS',
      });

      expect(User.create).not.toHaveBeenCalled();
      expect(CreditBalance.create).not.toHaveBeenCalled();
      expect(CreditTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('updates lastLogin and returns an access token for valid credentials', async () => {
      const userDoc = createUserDoc();

      User.findOne.mockResolvedValue(userDoc);
      comparePassword.mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(comparePassword).toHaveBeenCalledWith('Password123!', 'hashed-password');
      expect(userDoc.lastLogin).toBeInstanceOf(Date);
      expect(userDoc.save).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-token');
    });

    it('throws ApiError for invalid credentials', async () => {
      const userDoc = createUserDoc();

      User.findOne.mockResolvedValue(userDoc);
      comparePassword.mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });
  });
});
