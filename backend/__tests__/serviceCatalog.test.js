jest.mock('../models/User.model', () => ({ findById: jest.fn() }));
jest.mock('../models/AuditLog.model', () => ({ create: jest.fn().mockResolvedValue(undefined) }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');
const Pricing = require('../models/Pricing.model');
const app = require('../app');

const makeSuperAdminToken = () => jwt.sign({
  id: 'admin-user-1',
  email: 'admin@xcombinator.com',
  role: 'super_admin',
}, process.env.JWT_SECRET || 'test-jwt-secret');
const makeUserToken = () => jwt.sign({
  id: '507f1f77bcf86cd799439011',
  email: 'user@example.com',
  role: 'user',
}, process.env.JWT_SECRET || 'test-jwt-secret');
const makeAdminToken = () => jwt.sign({
  id: 'admin-user-2',
  email: 'admin@example.com',
  role: 'admin',
}, process.env.JWT_SECRET || 'test-jwt-secret');

describe('service catalog API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the configured tier price and falls back to the existing catalog price', () => {
    const service = { price: 1000, tierPrices: { standard: 950, reseller: null } };

    expect(Pricing.getServicePriceForTier(service, 'standard')).toBe(950);
    expect(Pricing.getServicePriceForTier(service, 'reseller')).toBe(1000);
    expect(Pricing.getServicePriceForTier({ price: 1200 }, 'reseller')).toBe(1200);
  });

  it('returns only the selected tier price from public pricing data', () => {
    const publicPricing = Pricing.getPublicPricingForTier({
      nin: { unitPrice: 250, tierPrices: { standard: 250, reseller: 180 } },
      serviceCatalog: [{
        serviceCode: 'test-service',
        price: 1000,
        tierPrices: { standard: 1000, reseller: 700 },
      }],
    }, 'reseller');

    expect(publicPricing.nin.unitPrice).toBe(180);
    expect(publicPricing.nin.tierPrices).toBeUndefined();
    expect(publicPricing.serviceCatalog[0].price).toBe(700);
    expect(publicPricing.serviceCatalog[0].tierPrices).toBeUndefined();
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

  it('serves a logged-in user their own tier price without returning other tier prices', async () => {
    User.findById.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      _id: '507f1f77bcf86cd799439011',
      email: 'reseller@example.com',
      role: 'user',
      pricingTier: 'reseller',
      status: 'active',
      approvalStatus: 'approved',
    });
    jest.spyOn(Pricing, 'getPricing').mockResolvedValue({
      serviceCatalog: [{
        serviceCode: 'test-service',
        category: 'NIMC',
        name: 'Test Service',
        status: 'active',
        price: 1000,
        tierPrices: { standard: 1000, reseller: 700 },
      }],
      categories: [{ slug: 'nimc', label: 'NIMC', isActive: true }],
    });
    jest.spyOn(Pricing, 'getCategories').mockResolvedValue([
      { slug: 'nimc', label: 'NIMC', isActive: true },
    ]);

    const response = await request(app)
      .get('/api/services/catalog')
      .set('Authorization', `Bearer ${makeUserToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.services[0].price).toBe(700);
    expect(response.body.services[0].tierPrices).toBeUndefined();
  });

  it('assigns a tier only through the super-admin user-management endpoint', async () => {
    const adminId = 'admin-user-1';
    const targetId = '507f1f77bcf86cd799439012';
    const target = {
      _id: targetId,
      role: 'user',
      pricingTier: 'standard',
      save: jest.fn().mockResolvedValue(undefined),
    };
    User.findById.mockImplementation((id) => Promise.resolve(String(id) === adminId
      ? {
          id: adminId,
          _id: adminId,
          email: 'admin@xcombinator.com',
          role: 'super_admin',
          status: 'active',
          approvalStatus: 'approved',
        }
      : target));

    const response = await request(app)
      .put(`/api/admin/users/${targetId}/pricing-tier`)
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`)
      .send({ pricingTier: 'reseller' });

    expect(response.status).toBe(200);
    expect(target.pricingTier).toBe('reseller');
    expect(target.save).toHaveBeenCalledTimes(1);
    expect(AuditLog.create).toHaveBeenCalled();

    User.findById.mockImplementation((id) => Promise.resolve({
      id: String(id),
      _id: String(id),
      email: String(id) === 'admin-user-2' ? 'admin@example.com' : 'user@example.com',
      role: String(id) === 'admin-user-2' ? 'admin' : 'user',
      status: 'active',
      approvalStatus: 'approved',
    }));
    const adminForbiddenResponse = await request(app)
      .put(`/api/admin/users/${targetId}/pricing-tier`)
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({ pricingTier: 'reseller' });
    expect(adminForbiddenResponse.status).toBe(403);

    const forbiddenResponse = await request(app)
      .put(`/api/admin/users/${targetId}/pricing-tier`)
      .set('Authorization', `Bearer ${makeUserToken()}`)
      .send({ pricingTier: 'reseller' });
    expect(forbiddenResponse.status).toBe(403);
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
        cost: 1750,
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
    expect(catalogResponse.body.services.find((service) => service.serviceCode === 'jamb-application').cost).toBe(1750);
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
        tierPrices: { standard: 5200, reseller: 4100 },
      });

    expect(updateResponse.status).toBe(200);
    expect(pricing.serviceCatalog[0]).toEqual(expect.objectContaining({
      commissionType: 'PERCENTAGE',
      commissionValue: 12.5,
      tierPrices: { standard: 5200, reseller: 4100 },
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
      tierPrices: { standard: 5200, reseller: 4100 },
    }));
  });

  it('preserves commission settings when normalizing Mongoose catalog subdocuments', async () => {
    const pricing = new Pricing({
      serviceCatalog: [{
        serviceCode: 'mongoose-service',
        category: 'NIMC',
        name: 'Mongoose Service',
        price: 5000,
        commissionType: 'PERCENTAGE',
        commissionValue: 12.5,
      }],
    });
    jest.spyOn(Pricing, 'getPricing').mockResolvedValue(pricing);

    const catalog = await Pricing.getServiceCatalog();

    expect(catalog.find((service) => service.serviceCode === 'mongoose-service')).toEqual(
      expect.objectContaining({
        commissionType: 'PERCENTAGE',
        commissionValue: 12.5,
      })
    );
  });

  it('rejects negative catalog prices when creating or updating services', async () => {
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
        metadata: {},
      }],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(Pricing, 'getPricing').mockResolvedValue(pricing);

    const createResponse = await request(app)
      .post('/api/admin/services')
      .auth(token, { type: 'bearer' })
      .send({
        serviceCode: 'negative-price',
        category: 'NIMC',
        name: 'Invalid Price',
        price: -1,
      });
    const updateResponse = await request(app)
      .put('/api/admin/services/existing-service')
      .auth(token, { type: 'bearer' })
      .send({ price: -1 });
    const negativeCostCreateResponse = await request(app)
      .post('/api/admin/services')
      .auth(token, { type: 'bearer' })
      .send({
        serviceCode: 'negative-cost',
        category: 'NIMC',
        name: 'Invalid Cost',
        price: 100,
        cost: -1,
      });
    const negativeCostUpdateResponse = await request(app)
      .put('/api/admin/services/existing-service')
      .auth(token, { type: 'bearer' })
      .send({ cost: -1 });
    const negativeTierPriceResponse = await request(app)
      .put('/api/admin/services/existing-service')
      .auth(token, { type: 'bearer' })
      .send({ tierPrices: { standard: 100, reseller: -1 } });

    expect(createResponse.status).toBe(400);
    expect(updateResponse.status).toBe(400);
    expect(negativeCostCreateResponse.status).toBe(400);
    expect(negativeCostUpdateResponse.status).toBe(400);
    expect(negativeTierPriceResponse.status).toBe(400);
    expect(pricing.save).not.toHaveBeenCalled();
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
        ninTierPrices: { standard: 250, reseller: 180 },
        platformServices: { verifyNin: { enabled: false } },
      });

    expect(response.status).toBe(200);
    expect(pricing.bvn.unitPrice).toBe(425);
    expect(pricing.nin.tierPrices.standard).toBe(250);
    expect(pricing.nin.tierPrices.reseller).toBe(180);
    expect(pricing.platformServices.verifyNin.enabled).toBe(false);
    expect(markModified).toHaveBeenCalledWith('bvn');
    expect(markModified).toHaveBeenCalledWith('platformServices');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
