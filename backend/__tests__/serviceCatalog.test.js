const request = require('supertest');
const app = require('../app');

describe('service catalog API', () => {
  it('exposes a public catalog with NIN and CAC services', async () => {
    const response = await request(app).get('/api/services/catalog');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.services)).toBe(true);
    expect(response.body.services.some((service) => service.serviceCode === 'nin-verification')).toBe(true);
    expect(response.body.services.some((service) => service.serviceCode === 'cac-sole-proprietorship')).toBe(true);
  });
});
