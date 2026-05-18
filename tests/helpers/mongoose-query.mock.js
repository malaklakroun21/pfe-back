// Builds a Mongoose-like query object: supports await, .lean(), and .session().
const createMongooseQuery = (result) => {
  if (result === null || result === undefined) {
    return {
      lean: jest.fn().mockResolvedValue(null),
      select: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      then: (resolve) => Promise.resolve(null).then(resolve),
    };
  }

  const plain =
    typeof result.toObject === 'function'
      ? result.toObject()
      : { ...result };

  return {
    lean: jest.fn().mockResolvedValue(plain),
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
};

module.exports = {
  createMongooseQuery,
};
