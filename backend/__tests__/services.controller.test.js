jest.mock('../models/ServiceRequest.model', () => ({
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/VerificationRequest.model', () => ({
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
const VerificationRequest = require('../models/VerificationRequest.model');
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

  it('includes service requests in verification lookups when requested', async () => {
    VerificationRequest.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { _id: 'ver1', nin: '12345678901', status: 'completed', createdAt: new Date() }
      ])
    });

    ServiceRequest.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { _id: 'svc1', nin: '12345678901', status: 'processing', createdAt: new Date() }
      ])
    });

    VerificationRequest.countDocuments.mockResolvedValue(1);
    ServiceRequest.countDocuments.mockResolvedValue(1);

    const req = {
      user: { id: 'user-1', role: 'admin' },
      query: { nin: '12345678901', includeServiceRequests: 'true' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await servicesController.getVerificationRequests(req, res);

    expect(VerificationRequest.find).toHaveBeenCalled();
    expect(ServiceRequest.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ _id: 'ver1' }),
        expect.objectContaining({ _id: 'svc1', source: 'service' })
      ])
    }));
  });
});
