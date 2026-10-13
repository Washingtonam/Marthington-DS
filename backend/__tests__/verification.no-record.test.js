const { normalizeVerificationApiPayload, isServiceAvailable } = require('../services/verification.service');

describe('verification payload normalization', () => {
  it('returns not_found for empty external payloads', () => {
    const normalized = normalizeVerificationApiPayload({ data: {} });

    expect(normalized.status).toBe('not_found');
    expect(normalized.message).toContain('No record found');
  });

  it('returns success for populated payloads', () => {
    const normalized = normalizeVerificationApiPayload({
      data: {
        data: {
          firstname: 'John',
          surname: 'Doe',
          nin: '12345678901',
        },
      },
    });

    expect(normalized.status).toBe('success');
    expect(normalized.data.firstname).toBe('John');
  });

  it('flags a paused service as unavailable', () => {
    const enabled = isServiceAvailable({ status: 'active' });
    const disabled = isServiceAvailable({ status: 'paused' });

    expect(enabled).toBe(true);
    expect(disabled).toBe(false);
  });
});
