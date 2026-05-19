// Builds a Mongoose-like query object: supports await, .lean(), and .session().
const createMongooseQuery = (result) => {
  if (result === null || result === undefined) {
    return {
      lean: jest.fn().mockResolvedValue(null),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      then: (resolve) => Promise.resolve(null).then(resolve),
    };
  }

  const plain = Array.isArray(result)
    ? result
    : typeof result.toObject === 'function'
      ? result.toObject()
      : { ...result };

  return {
    lean: jest.fn().mockResolvedValue(plain),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
};

// Supports history queries (`$or`) and weekly-cap queries (`toUser` + `type`).
const createCreditTransactionFindMock = (transactions = []) => {
  return (filter = {}) => {
    if (filter.toUser && filter.type === 'TRANSFER') {
      const weekAgo = filter.createdAt?.$gte ? new Date(filter.createdAt.$gte) : null;
      const result = transactions.filter((item) => {
        if (item.toUser !== filter.toUser) {
          return false;
        }

        if (item.type && item.type !== filter.type) {
          return false;
        }

        if (weekAgo && new Date(item.createdAt) < weekAgo) {
          return false;
        }

        return true;
      });

      return createMongooseQuery(result);
    }

    if (Array.isArray(filter.$or) && filter.$or.length > 0) {
      const userId =
        filter.$or.find((clause) => clause.fromUser)?.fromUser ||
        filter.$or.find((clause) => clause.toUser)?.toUser;

      const result = transactions.filter(
        (item) => item.fromUser === userId || item.toUser === userId
      );

      return createMongooseQuery(result);
    }

    return createMongooseQuery([]);
  };
};

module.exports = {
  createMongooseQuery,
  createCreditTransactionFindMock,
};
