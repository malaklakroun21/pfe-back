const endorsementService = require('../services/endorsement.service');
const ApiResponse = require('../utils/ApiResponse');

const createEndorsement = async (req, res, next) => {
  try {
    const result = await endorsementService.createEndorsement(req.user, req.body);
    res.status(201).json(new ApiResponse(201, result, 'Endorsement created successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEndorsement,
};
