const Project = require('../../../src/models/Project');
const projectService = require('../../../src/services/project.service');

jest.mock('../../../src/models/Project', () => ({
  findOne: jest.fn(),
}));

const createProjectDoc = (overrides = {}) => {
  return {
    projectId: 'PRJ-123',
    ownerId: 'USR-owner',
    title: 'Sample project',
    description: 'Sample description',
    requiredSkill: 'React',
    status: 'OPEN',
    members: [],
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
    toObject() {
      return {
        projectId: this.projectId,
        ownerId: this.ownerId,
        title: this.title,
        description: this.description,
        requiredSkill: this.requiredSkill,
        status: this.status,
        members: this.members,
      };
    },
    ...overrides,
  };
};

describe('project.service membership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('joinProject', () => {
    it('adds the authenticated user to project members', async () => {
      const projectDoc = createProjectDoc();
      Project.findOne.mockResolvedValue(projectDoc);

      const result = await projectService.joinProject({ userId: 'USR-member' }, 'PRJ-123');

      expect(Project.findOne).toHaveBeenCalledWith({ projectId: 'PRJ-123' });
      expect(projectDoc.members).toHaveLength(1);
      expect(projectDoc.members[0].userId).toBe('USR-member');
      expect(projectDoc.save).toHaveBeenCalled();
      expect(result.members[0].userId).toBe('USR-member');
    });
  });

  describe('leaveProject', () => {
    it('removes the authenticated user from project members', async () => {
      const projectDoc = createProjectDoc({
        members: [
          { userId: 'USR-member', joinedAt: new Date('2026-05-02T10:00:00.000Z') },
          { userId: 'USR-other', joinedAt: new Date('2026-05-02T10:10:00.000Z') },
        ],
      });

      Project.findOne.mockResolvedValue(projectDoc);

      const result = await projectService.leaveProject({ userId: 'USR-member' }, 'PRJ-123');

      expect(projectDoc.members).toEqual([
        { userId: 'USR-other', joinedAt: new Date('2026-05-02T10:10:00.000Z') },
      ]);
      expect(projectDoc.save).toHaveBeenCalled();
      expect(result.members).toHaveLength(1);
      expect(result.members[0].userId).toBe('USR-other');
    });
  });

  describe('removeProjectMember', () => {
    it('allows the owner to remove a member by userId', async () => {
      const projectDoc = createProjectDoc({
        members: [
          { userId: 'USR-member', joinedAt: new Date('2026-05-02T10:00:00.000Z') },
          { userId: 'USR-keep', joinedAt: new Date('2026-05-02T10:10:00.000Z') },
        ],
      });

      Project.findOne.mockResolvedValue(projectDoc);

      const result = await projectService.removeProjectMember(
        { userId: 'USR-owner' },
        'PRJ-123',
        'USR-member'
      );

      expect(projectDoc.members).toEqual([
        { userId: 'USR-keep', joinedAt: new Date('2026-05-02T10:10:00.000Z') },
      ]);
      expect(projectDoc.save).toHaveBeenCalled();
      expect(result.members).toHaveLength(1);
      expect(result.members[0].userId).toBe('USR-keep');
    });
  });
});
