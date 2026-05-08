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

jest.mock('../../../src/utils/token', () => ({
  generateResetToken: jest.fn(),
  hashToken: jest.fn(),
}));

jest.mock('../../../src/utils/email', () => jest.fn());

const User = require('../../../src/models/User');
const { hashPassword } = require('../../../src/utils/hash');
const { signAccessToken } = require('../../../src/utils/jwt');
const { generateResetToken } = require('../../../src/utils/token');
const sendEmail = require('../../../src/utils/email');
const authService = require('../../../src/services/auth.service');

describe('auth.service', () => {
  const originalClientUrl = process.env.CLIENT_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_URL = 'http://localhost:3000';
  });

  afterAll(() => {
    process.env.CLIENT_URL = originalClientUrl;
  });

  describe('register', () => {
    it('initializes new users with 10 time credits', async () => {
      User.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hashed-password');
      signAccessToken.mockReturnValue('signed-access-token');

      User.create.mockImplementation(async (payload) => {
        return {
          ...payload,
          toObject() {
            return { ...this };
          },
        };
      });

      const result = await authService.register({
        email: 'new.user@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new.user@example.com',
          firstName: 'New',
          lastName: 'User',
          timeCredits: expect.anything(),
        })
      );

      const createdUserPayload = User.create.mock.calls[0][0];
      expect(createdUserPayload.timeCredits.toString()).toBe('10');
      expect(result.user.timeCredits.toString()).toBe('10');
      expect(result.accessToken).toBe('signed-access-token');
    });
  });

  describe('forgotPassword', () => {
    it('returns the generic success message when the email does not exist', async () => {
      User.findOne.mockResolvedValue(null);

      const result = await authService.forgotPassword('missing@example.com');

      expect(result).toEqual({
        message: 'If that email exists, a reset link has been sent.',
      });
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('returns a debug reset URL when SMTP is not configured in development', async () => {
      const userDoc = {
        email: 'member@example.com',
        save: jest.fn().mockResolvedValue(undefined),
      };

      User.findOne.mockResolvedValue(userDoc);
      generateResetToken.mockReturnValue({
        plainToken: 'plain-reset-token',
        hashedToken: 'hashed-reset-token',
        expires: new Date('2030-01-01T00:00:00.000Z'),
      });
      sendEmail.mockResolvedValue({ delivery: 'console' });

      const result = await authService.forgotPassword('member@example.com');

      expect(userDoc.save).toHaveBeenCalledWith({ validateBeforeSave: false });
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'member@example.com',
          subject: 'Password Reset Request',
          text: expect.stringContaining(
            'http://localhost:3000/reset-password?token=plain-reset-token'
          ),
        })
      );
      expect(result).toEqual({
        message:
          'SMTP is not configured in development. The reset link was generated locally and printed in the backend console.',
        debugResetUrl: 'http://localhost:3000/reset-password?token=plain-reset-token',
      });
    });
  });
});
