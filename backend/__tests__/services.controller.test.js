jest.mock('../models/ServiceRequest.model', () => ({
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/User.model', () => ({}));
jest.mock('../models/transaction.model', () => ({}));
jest.mock('../models/Pricing.model', () => ({
  getPricing: jest.fn()
}));
jest.mock('../shared/validators', () => ({
  validateServiceRequest: { validate: jest.fn() }
}));
jest.mock('../config/constants', () => ({
  SUPER_ADMIN_EMAIL: 'admin@example.com'
}));

const ServiceRequest = require('../models/ServiceRequest.model');
const servicesController = require('../controllers/services.controller');

describe('services controller request history query', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    ServiceRequest.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { _id: 'req1', service: 'validation', serviceCategory: 'NIMC', nin: '12345678901', createdAt: new Date() }
      ])
    });

    ServiceRequest.countDocuments.mockResolvedValue(1);
  });

  it('applies category, nin, and page filters from query params', async () => {
    const req = {
      user: { id: 'user-1', role: 'user' },
      query: { category: 'validation', nin: '123', page: '2', limit: '5' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await servicesController.getServiceRequests(req, res);

    expect(ServiceRequest.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      page: 2,
      limit: 5,
      totalPages: 1,
      data: expect.any(Array)
    }));
  });
});
