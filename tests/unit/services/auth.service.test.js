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

const User = require('../../../src/models/User');
const { hashPassword } = require('../../../src/utils/hash');
const { signAccessToken } = require('../../../src/utils/jwt');
const authService = require('../../../src/services/auth.service');

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
