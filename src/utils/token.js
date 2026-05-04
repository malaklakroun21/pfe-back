const crypto = require('crypto');

/**
 * Generates a secure password-reset token pair.
 *
 * Only the hash is persisted in the database. The plain token is sent to the
 * user via email. This way, a database leak cannot be used directly to trigger
 * a password reset — an attacker would need the original random bytes.
 *
 * @returns {{ plainToken: string, hashedToken: string, expires: Date }}
 */
const generateResetToken = () => {
  const plainToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return { plainToken, hashedToken, expires };
};

/**
 * Hashes an incoming plain token so it can be compared against what is stored
 * in the database. Must use the same algorithm as generateResetToken().
 *
 * @param {string} token - raw token received from the user (e.g. from a URL)
 * @returns {string} SHA-256 hex digest
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = { generateResetToken, hashToken };
