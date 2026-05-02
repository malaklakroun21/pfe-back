const User = require('../../../src/models/User');
const userService = require('../../../src/services/user.service');

jest.mock('../../../src/models/User', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

const createUserDoc = (overrides = {}) => {
  return {
    userId: 'USR-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    bio: '',
    profilePicture: '',
    role: 'LEARNER',
    accountStatus: 'ACTIVE',
    languages: [],
    offeredSkills: [],
    wantedSkills: [],
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    save: jest.fn().mockResolvedValue(undefined),
    toObject() {
      return {
        userId: this.userId,
        email: this.email,
        passwordHash: this.passwordHash,
        firstName: this.firstName,
        lastName: this.lastName,
        bio: this.bio,
        profilePicture: this.profilePicture,
        role: this.role,
        accountStatus: this.accountStatus,
        languages: this.languages,
        offeredSkills: this.offeredSkills,
        wantedSkills: this.wantedSkills,
        createdAt: this.createdAt,
      };
    },
    ...overrides,
  };
};

describe('user.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('returns a sanitized public profile for an active user', async () => {
      User.findOne.mockResolvedValue(
        createUserDoc({
          userId: 'USR-1',
          firstName: 'Tesnim',
          lastName: 'Hamici',
          offeredSkills: ['React'],
          wantedSkills: ['Node.js'],
        })
      );

      const result = await userService.getUserById('USR-1');

      expect(User.findOne).toHaveBeenCalledWith({
        userId: 'USR-1',
        accountStatus: 'ACTIVE',
      });
      expect(result).toMatchObject({
        userId: 'USR-1',
        firstName: 'Tesnim',
        lastName: 'Hamici',
        offeredSkills: ['React'],
        wantedSkills: ['Node.js'],
      });
      expect(result.passwordHash).toBeUndefined();
      expect(result.email).toBeUndefined();
    });
  });

  describe('updateUserProfile', () => {
    it('updates only whitelisted profile fields', async () => {
      const userDoc = createUserDoc({
        userId: 'USR-2',
        firstName: 'Old',
        lastName: 'Name',
        bio: 'Old bio',
        profilePicture: 'https://old.example.com/avatar.jpg',
      });

      User.findOne.mockResolvedValue(userDoc);

      const result = await userService.updateUserProfile('USR-2', {
        name: 'New Name',
        bio: 'New bio',
        avatar: 'https://new.example.com/avatar.jpg',
        email: 'blocked@example.com',
        role: 'ADMIN',
      });

      expect(userDoc.firstName).toBe('New');
      expect(userDoc.lastName).toBe('Name');
      expect(userDoc.bio).toBe('New bio');
      expect(userDoc.profilePicture).toBe('https://new.example.com/avatar.jpg');
      expect(userDoc.email).toBe('test@example.com');
      expect(userDoc.role).toBe('LEARNER');
      expect(userDoc.save).toHaveBeenCalled();
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('searchUsers', () => {
    it('searches with pagination and filters', async () => {
      const leanUsers = [
        {
          userId: 'USR-3',
          firstName: 'React',
          lastName: 'Mentor',
          passwordHash: 'hidden',
          offeredSkills: ['React'],
          wantedSkills: ['Node.js'],
          languages: [],
          role: 'MENTOR',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      ];

      const sort = jest.fn();
      const skip = jest.fn();
      const limit = jest.fn();
      const lean = jest.fn();

      User.find.mockReturnValue({ sort });
      sort.mockReturnValue({ skip });
      skip.mockReturnValue({ limit });
      limit.mockReturnValue({ lean });
      lean.mockResolvedValue(leanUsers);
      User.countDocuments.mockResolvedValue(1);

      const result = await userService.searchUsers({
        skill: 'React',
        role: 'MENTOR',
        page: '2',
        limit: '5',
      });

      expect(User.find).toHaveBeenCalledWith({
        $and: [
          { accountStatus: 'ACTIVE' },
          { role: 'MENTOR' },
          {
            $or: [
              { offeredSkills: /^React$/i },
              { wantedSkills: /^React$/i },
            ],
          },
        ],
      });
      expect(skip).toHaveBeenCalledWith(5);
      expect(limit).toHaveBeenCalledWith(5);
      expect(User.countDocuments).toHaveBeenCalled();
      expect(result.pagination).toMatchObject({
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      });
      expect(result.items[0]).toMatchObject({
        userId: 'USR-3',
        role: 'MENTOR',
        offeredSkills: ['React'],
      });
    });
  });

  describe('skill management', () => {
    it('adds and removes offered and wanted skills', async () => {
      const userDoc = createUserDoc({
        userId: 'USR-4',
        offeredSkills: ['React'],
        wantedSkills: ['MongoDB'],
      });

      User.findOne.mockResolvedValue(userDoc);

      const addOfferedResult = await userService.addSkillOffered('USR-4', { skill: 'Node.js' });
      expect(addOfferedResult.offeredSkills).toEqual(['React', 'Node.js']);

      const addWantedResult = await userService.addSkillWanted('USR-4', { skillName: 'Docker' });
      expect(addWantedResult.wantedSkills).toEqual(['MongoDB', 'Docker']);

      const removeOfferedResult = await userService.removeSkillOffered('USR-4', {
        skill: 'React',
      });
      expect(removeOfferedResult.offeredSkills).toEqual(['Node.js']);

      const removeWantedResult = await userService.removeSkillWanted('USR-4', {
        skill: 'MongoDB',
      });
      expect(removeWantedResult.wantedSkills).toEqual(['Docker']);
      expect(userDoc.save).toHaveBeenCalledTimes(4);
    });
  });
});
