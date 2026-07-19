describe('backend constants defaults', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.FRONTEND_URL;
    delete process.env.FRONTEND_URL_NAKED;
  });

  it('falls back to a default frontend URL when FRONTEND_URL is not set', () => {
    const constants = require('../config/constants');

    expect(constants.CORS_ORIGINS).toContain('https://ds.marthington.com.ng');
    expect(constants.FRONTEND_URLs.production).toBe('https://ds.marthington.com.ng');
  });
});
