const {
  calculateLevel,
  getLevelTitle,
  getLevelMinXp,
  getNextLevelXP,
  buildProgressPercent,
} = require('../../../src/services/xp.service');

describe('xp.service level calculations', () => {
  test('calculateLevel returns Seed for new users', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(getLevelTitle(1)).toBe('Seed');
  });

  test('calculateLevel advances at thresholds', () => {
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(349)).toBe(2);
    expect(calculateLevel(350)).toBe(3);
    expect(calculateLevel(800)).toBe(4);
    expect(calculateLevel(1500)).toBe(5);
    expect(calculateLevel(3000)).toBe(6);
    expect(getLevelTitle(6)).toBe('Oasis');
  });

  test('getNextLevelXP and progressPercent', () => {
    expect(getNextLevelXP(1)).toBe(100);
    expect(getLevelMinXp(2)).toBe(100);
    expect(buildProgressPercent(50, 1)).toBe(50);
    expect(buildProgressPercent(3000, 6)).toBe(100);
    expect(getNextLevelXP(6)).toBeNull();
  });
});
