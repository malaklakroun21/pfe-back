jest.mock('../../../src/models/User', () => ({
  find: jest.fn(),
}));

jest.mock('../../../src/models/Session', () => ({
  find: jest.fn(),
}));

jest.mock('../../../src/models/Skill', () => ({
  find: jest.fn(),
}));

jest.mock('../../../src/models/SkillCategory', () => ({
  find: jest.fn(),
}));

jest.mock('../../../src/models/MentorSkill', () => ({
  find: jest.fn(),
}));

jest.mock('../../../src/models/SkillEvidence', () => ({
  find: jest.fn(),
}));

jest.mock('../../../src/models/ValidationRequest', () => ({
  find: jest.fn(),
}));

jest.mock('../../../src/models/Rating', () => ({
  aggregate: jest.fn(),
}));

jest.mock('../../../src/services/validation.service', () => ({
  getMentorValidationOverview: jest.fn(),
}));

jest.mock('../../../src/services/xp.service', () => ({
  formatXpProfile: jest.fn(),
}));

jest.mock('../../../src/utils/skillCategory.util', () => ({
  ensureDefaultSkillCategory: jest.fn(),
}));

const User = require('../../../src/models/User');
const Session = require('../../../src/models/Session');
const Skill = require('../../../src/models/Skill');
const SkillCategory = require('../../../src/models/SkillCategory');
const MentorSkill = require('../../../src/models/MentorSkill');
const SkillEvidence = require('../../../src/models/SkillEvidence');
const ValidationRequest = require('../../../src/models/ValidationRequest');
const Rating = require('../../../src/models/Rating');
const dashboardService = require('../../../src/services/dashboard.service');

const createLeanQuery = (result) => ({
  lean: jest.fn().mockResolvedValue(result),
  sort: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
});

describe('dashboard.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Session.find.mockReturnValue(createLeanQuery([]));
    ValidationRequest.find.mockReturnValue(createLeanQuery([]));
    SkillEvidence.find.mockReturnValue(createLeanQuery([]));
    Rating.aggregate.mockResolvedValue([]);

    User.find.mockImplementation((filter = {}) => {
      if (filter.role === 'MENTOR') {
        return createLeanQuery([
          {
            userId: 'USR-MENTOR',
            firstName: 'Yacine',
            lastName: 'Bensaid',
            role: 'MENTOR',
            accountStatus: 'ACTIVE',
            offeredSkills: [],
            wantedSkills: [],
          },
        ]);
      }

      if (filter.accountStatus === 'ACTIVE') {
        return createLeanQuery([
          {
            userId: 'USR-LEARNER',
            role: 'LEARNER',
            accountStatus: 'ACTIVE',
            offeredSkills: ['React Fundamentals'],
            wantedSkills: [],
          },
          {
            userId: 'USR-MENTOR',
            role: 'MENTOR',
            accountStatus: 'ACTIVE',
            offeredSkills: [],
            wantedSkills: ['Docker Basics'],
          },
        ]);
      }

      return createLeanQuery([]);
    });

    Skill.find.mockImplementation((filter = {}) => {
      if (!Object.keys(filter).length) {
        return createLeanQuery([
          {
            skillId: 'SKILL-REACT',
            userId: 'USR-LEARNER',
            categoryId: 'CATEGORY-WEB',
            skillName: 'React Fundamentals',
            proficiencyLevel: 'INTERMEDIATE',
            validationStatus: 'PENDING',
            validationScore: 0,
          },
          {
            skillId: 'SKILL-NODE',
            userId: 'USR-MENTOR',
            categoryId: 'CATEGORY-BACKEND',
            skillName: 'Node.js API Development',
            proficiencyLevel: 'EXPERT',
            validationStatus: 'VALIDATED',
            validationScore: 92,
          },
        ]);
      }

      if (Array.isArray(filter.userId?.$in) && filter.userId.$in.includes('USR-LEARNER')) {
        return createLeanQuery([
          {
            skillId: 'SKILL-REACT',
            userId: 'USR-LEARNER',
            categoryId: 'CATEGORY-WEB',
            skillName: 'React Fundamentals',
            proficiencyLevel: 'INTERMEDIATE',
            validationStatus: 'PENDING',
            validationScore: 0,
          },
        ]);
      }

      if (Array.isArray(filter.userId?.$in) && filter.userId.$in.includes('USR-MENTOR')) {
        return createLeanQuery([
          {
            skillId: 'SKILL-NODE',
            userId: 'USR-MENTOR',
            categoryId: 'CATEGORY-BACKEND',
            skillName: 'Node.js API Development',
            proficiencyLevel: 'EXPERT',
            validationStatus: 'VALIDATED',
            validationScore: 92,
          },
        ]);
      }

      return createLeanQuery([]);
    });

    SkillCategory.find.mockReturnValue(
      createLeanQuery([
        {
          categoryId: 'CATEGORY-WEB',
          categoryName: 'Web Development',
        },
        {
          categoryId: 'CATEGORY-BACKEND',
          categoryName: 'Backend Engineering',
        },
      ])
    );

    MentorSkill.find.mockReturnValue(
      createLeanQuery([
        {
          mentorSkillId: 'MENTOR-SKILL-001',
          userId: 'USR-MENTOR',
          skillCategoryId: 'CATEGORY-BACKEND',
          skillName: 'GraphQL APIs',
          isActive: true,
        },
      ])
    );
  });

  describe('getValidationData', () => {
    it('returns the learner profile skills plus the global app skill catalog', async () => {
      const result = await dashboardService.getValidationData({
        userId: 'USR-LEARNER',
        role: 'LEARNER',
      });

      const skillLabels = result.requestFlow.skillOptions.map((skill) => skill.label);
      expect(skillLabels).toEqual(
        expect.arrayContaining([
          'React Fundamentals',
          'Node.js API Development',
          'GraphQL APIs',
          'Docker Basics',
        ])
      );

      const profileSkill = result.requestFlow.skillOptions.find(
        (skill) => skill.label === 'React Fundamentals'
      );
      expect(profileSkill).toMatchObject({
        skillId: 'SKILL-REACT',
        isProfileSkill: true,
      });

      const catalogSkill = result.requestFlow.skillOptions.find(
        (skill) => skill.label === 'Node.js API Development'
      );
      expect(catalogSkill).toMatchObject({
        skillId: '',
        isProfileSkill: false,
      });
      expect(catalogSkill.description).toContain('Available in the app');
      expect(catalogSkill.description).toContain('Backend Engineering');
    });
  });
});
