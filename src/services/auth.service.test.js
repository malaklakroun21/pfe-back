jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const User = require('../models/User');
const { registerUser, loginUser } = require('./auth.service');

const mockUserDoc = (overrides = {}) => {
  const doc = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    isActive: true,
    comparePassword: jest.fn(),
    generateAuthToken: jest.fn(() => 'signed-jwt-token'),
    save: jest.fn().mockResolvedValue(undefined),
    toObject(options) {
      return {
        _id: this._id,
        email: this.email,
        name: this.name,
        role: this.role,
        isActive: this.isActive,
        ...overrides.plain,
      };
    },
    ...overrides,
  };
  return doc;
};

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('throws ApiError 409 when email is already registered', async () => {
      User.findOne.mockResolvedValue({ _id: 'existing' });

      await expect(
        registerUser({ name: 'A User', email: 'dup@example.com', password: 'Password1' })
      ).rejects.toEqual(
        expect.objectContaining({
          statusCode: 409,
          code: 'EMAIL_ALREADY_EXISTS',
        })
      );

      expect(User.create).not.toHaveBeenCalled();
    });

    it('throws ApiError 409 on duplicate key from create', async () => {
      User.findOne.mockResolvedValue(null);
      const dupError = new Error('duplicate');
      dupError.code = 11000;
      User.create.mockRejectedValue(dupError);

      await expect(
        registerUser({ name: 'A User', email: 'new@example.com', password: 'Password1' })
      ).rejects.toEqual(
        expect.objectContaining({
          statusCode: 409,
          code: 'EMAIL_ALREADY_EXISTS',
        })
      );
    });

    it('creates user and returns sanitized user plus access token', async () => {
      User.findOne.mockResolvedValue(null);
      const created = mockUserDoc();
      User.create.mockResolvedValue(created);

      const result = await registerUser({
        name: 'A User',
        email: 'New@Example.com',
        password: 'Password1',
        role: 'mentor',
      });

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'A User',
          email: 'new@example.com',
          password: 'Password1',
          role: 'mentor',
        })
      );
      expect(created.generateAuthToken).toHaveBeenCalled();
      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user).toEqual(
        expect.objectContaining({
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
        })
      );
      expect(result.user.password).toBeUndefined();
    });
  });

  describe('loginUser', () => {
    it('throws ApiError 401 when user is not found', async () => {
      const select = jest.fn().mockResolvedValue(null);
      User.findOne.mockReturnValue({ select });

      await expect(loginUser('missing@example.com', 'Password1')).rejects.toEqual(
        expect.objectContaining({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        })
      );
    });

    it('throws ApiError 401 when account is inactive', async () => {
      const user = mockUserDoc({ isActive: false });
      const select = jest.fn().mockResolvedValue(user);
      User.findOne.mockReturnValue({ select });

      await expect(loginUser('test@example.com', 'Password1')).rejects.toEqual(
        expect.objectContaining({
          statusCode: 401,
          code: 'ACCOUNT_NOT_ACTIVE',
        })
      );
    });

    it('throws ApiError 401 when password is invalid', async () => {
      const user = mockUserDoc();
      user.comparePassword.mockResolvedValue(false);
      const select = jest.fn().mockResolvedValue(user);
      User.findOne.mockReturnValue({ select });

      await expect(loginUser('test@example.com', 'WrongPassword1')).rejects.toEqual(
        expect.objectContaining({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        })
      );
    });

    it('updates lastLogin and returns user plus token on success', async () => {
      const user = mockUserDoc();
      user.comparePassword.mockResolvedValue(true);
      const select = jest.fn().mockResolvedValue(user);
      User.findOne.mockReturnValue({ select });

      const result = await loginUser('test@example.com', 'Password1');

      expect(select).toHaveBeenCalledWith('+password');
      expect(user.lastLogin).toBeInstanceOf(Date);
      expect(user.save).toHaveBeenCalled();
      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws ApiError 400 when email is empty', async () => {
      await expect(loginUser('', 'Password1')).rejects.toEqual(
        expect.objectContaining({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        })
      );
    });
  });
});
