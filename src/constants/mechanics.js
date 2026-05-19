// FENNEKY core mechanics — trust, credits, skill tiers.

const MAX_SESSION_HOURS = 4;
const UNVERIFIED_WEEKLY_CREDIT_CAP = 5;

const SKILL_TIER_MULTIPLIERS = {
  STARTER: 1.0,
  BEGINNER: 1.2,
  INTERMEDIATE: 1.5,
  ADVANCED: 1.8,
  EXPERT: 2.0,
};

const TRUST_BADGE_TIERS = [
  { min: 0, max: 24, badge: 'Unverified', modifier: 1.0 },
  { min: 25, max: 49, badge: 'Bronze', modifier: 1.05 },
  { min: 50, max: 74, badge: 'Silver', modifier: 1.1 },
  { min: 75, max: 89, badge: 'Gold', modifier: 1.2 },
  { min: 90, max: 100, badge: 'Verified', modifier: 1.3 },
];

const TRUST_WEIGHTS = {
  portfolio: 0.55,
  endorsement: 0.45,
};

const MENTOR_ROLES = new Set(['MENTOR', 'ADMIN', 'admin']);

module.exports = {
  MAX_SESSION_HOURS,
  UNVERIFIED_WEEKLY_CREDIT_CAP,
  SKILL_TIER_MULTIPLIERS,
  TRUST_BADGE_TIERS,
  TRUST_WEIGHTS,
  MENTOR_ROLES,
};
