jest.mock('../models/User.model', () => ({ findById: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Pricing = require('../models/Pricing.model');
const app = require('../app');

const makeSuperAdminToken = () => jwt.sign({
  id: 'admin-user-1',
  email: 'admin@xcombinator.com',
  role: 'super_admin',
}, process.env.JWT_SECRET || 'test-jwt-secret');

describe('service catalog API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes the DOB modification form fields and parent details in the default catalog', () => {
    const dobService = Pricing.getDefaultServiceCatalog()
      .find((service) => service.serviceCode === 'modification-dob');
    const formFields = dobService.metadata.formFields;

    expect(formFields.map((field) => field.key)).toEqual(expect.arrayContaining([
      'newDob',
      'oldDob',
      'fatherSurname',
      'fatherFirstname',
      'fatherStateOfOrigin',
      'motherSurname',
      'motherMaidenName',
      'motherStateOfOrigin',
    ]));
  });

  it('exposes a public catalog with the canonical NIMC and CAC services', async () => {
    const response = await request(app).get('/api/services/catalog');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.services)).toBe(true);
    expect(response.body.services.some((service) => service.serviceCode === 'validation-noRecord')).toBe(true);
    expect(response.body.services.filter((service) => service.category === 'NIMC').length).toBeGreaterThan(0);
    expect(response.body.services.some((service) => service.serviceCode === 'cac-sole-proprietorship')).toBe(true);
  });

  it('filters admin catalog services by the canonical NIMC category', async () => {
    User.findById.mockResolvedValue({
      id: 'admin-user-1',
      _id: 'admin-user-1',
      email: 'admin@xcombinator.com',
      role: 'super_admin',
      status: 'active',
      approvalStatus: 'approved',
    });
    const token = makeSuperAdminToken();
    const response = await request(app)
      .get('/api/admin/services?category=NIMC')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.services)).toBe(true);
    expect(response.body.services.every((service) => service.category === 'NIMC')).toBe(true);
  });

  it('accepts NIN as a legacy alias while returning NIMC catalog categories', async () => {
    const response = await request(app).get('/api/services/catalog?category=NIN');

    expect(response.status).toBe(200);
    expect(response.body.services.length).toBeGreaterThan(0);
    expect(response.body.services.every((service) => service.category === 'NIMC')).toBe(true);
  });

  it('uses the canonical legacy NIMC service set as the default service catalog', async () => {
    const response = await request(app).get('/api/services/catalog?category=NIN');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const codes = response.body.services.map((service) => service.serviceCode);
    expect(codes).toEqual(expect.arrayContaining([
      'validation-noRecord',
      'modification-name',
      'personalization-tracking',
      'self-service-emailRetrieval',
      'ipe-inProcessingError'
    ]));
    expect(codes).not.toEqual(expect.arrayContaining(['nin-verification', 'phone-verification', 'tracking-verification']));
  });

  it('supports custom categories and custom service pricing from the catalog', async () => {
    User.findById.mockResolvedValue({
      id: 'admin-user-1',
      _id: 'admin-user-1',
      email: 'admin@xcombinator.com',
      role: 'super_admin',
      status: 'active',
      approvalStatus: 'approved',
    });

    const token = makeSuperAdminToken();
    const createResponse = await request(app)
      .post('/api/admin/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        serviceCode: 'jamb-application',
        category: 'JAMB',
        name: 'JAMB Application',
        status: 'active',
        price: 4200,
        commissionType: 'PERCENTAGE',
        commissionValue: 12,
        metadata: { description: 'JAMB form intake', formFields: [] }
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.service).toEqual(expect.objectContaining({
      commissionType: 'PERCENTAGE',
      commissionValue: 12,
    }));

    const catalogResponse = await request(app)
      .get('/api/services/catalog?category=JAMB');

    expect(catalogResponse.status).toBe(200);
    expect(catalogResponse.body.services.some((service) => service.serviceCode === 'jamb-application')).toBe(true);
    expect(catalogResponse.body.services.find((service) => service.serviceCode === 'jamb-application').price).toBe(4200);
    expect(catalogResponse.body.services.find((service) => service.serviceCode === 'jamb-application').commissionValue).toBe(12);
  });

  it('persists service commission settings and returns them on the next catalog read', async () => {
    User.findById.mockResolvedValue({
      id: 'admin-user-1',
      _id: 'admin-user-1',
      email: 'admin@xcombinator.com',
      role: 'super_admin',
      status: 'active',
      approvalStatus: 'approved',
    });
    const token = makeSuperAdminToken();
    const pricing = {
      serviceCatalog: [{
        serviceCode: 'existing-service',
        category: 'NIMC',
        name: 'Existing Service',
        status: 'active',
        price: 5000,
        commissionType: 'FLAT',
        commissionValue: 0,
        metadata: {},
      }],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(Pricing, 'getPricing').mockResolvedValue(pricing);
    jest.spyOn(Pricing, 'getServiceCatalog').mockImplementation(async () => pricing.serviceCatalog);

    const updateResponse = await request(app)
      .put('/api/admin/services/existing-service')
      .auth(token, { type: 'bearer' })
      .send({
        commissionType: 'PERCENTAGE',
        commissionValue: 12.5,
      });

    expect(updateResponse.status).toBe(200);
    expect(pricing.serviceCatalog[0]).toEqual(expect.objectContaining({
      commissionType: 'PERCENTAGE',
      commissionValue: 12.5,
    }));
    expect(pricing.markModified).toHaveBeenCalledWith('serviceCatalog');
    expect(pricing.save).toHaveBeenCalledTimes(1);

    const catalogResponse = await request(app)
      .get('/api/admin/services')
      .auth(token, { type: 'bearer' });

    expect(catalogResponse.status).toBe(200);
    expect(catalogResponse.body.services[0]).toEqual(expect.objectContaining({
      serviceCode: 'existing-service',
      commissionType: 'PERCENTAGE',
      commissionValue: 12.5,
    }));
  });

  it('saves platform service visibility through the admin pricing endpoint', async () => {
    User.findById.mockResolvedValue({
      id: 'admin-user-1',
      _id: 'admin-user-1',
      email: 'admin@xcombinator.com',
      role: 'super_admin',
      status: 'active',
      approvalStatus: 'approved',
    });
    const pricing = new Pricing();
    jest.spyOn(Pricing, 'findOne').mockResolvedValue(pricing);
    const markModified = jest.spyOn(pricing, 'markModified');
    const save = jest.spyOn(pricing, 'save').mockResolvedValue(pricing);

    const response = await request(app)
      .put('/api/admin/pricing')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`)
      .send({
        bvn: { unitPrice: 425 },
        platformServices: { verifyNin: { enabled: false } },
      });

    expect(response.status).toBe(200);
    expect(pricing.bvn.unitPrice).toBe(425);
    expect(pricing.platformServices.verifyNin.enabled).toBe(false);
    expect(markModified).toHaveBeenCalledWith('bvn');
    expect(markModified).toHaveBeenCalledWith('platformServices');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
