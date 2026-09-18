const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

const makeSuperAdminToken = () => jwt.sign({
  id: 'admin-user-1',
  email: 'admin@xcombinator.com',
  role: 'super_admin',
}, process.env.JWT_SECRET || 'test-jwt-secret');

describe('service catalog API', () => {
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
        metadata: { description: 'JAMB form intake', formFields: [] }
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);

    const catalogResponse = await request(app)
      .get('/api/services/catalog?category=JAMB');

    expect(catalogResponse.status).toBe(200);
    expect(catalogResponse.body.services.some((service) => service.serviceCode === 'jamb-application')).toBe(true);
    expect(catalogResponse.body.services.find((service) => service.serviceCode === 'jamb-application').price).toBe(4200);
  });
});
