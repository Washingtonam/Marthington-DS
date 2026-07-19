const { buildCentralGatewayCheckoutUrl } = require('../shared/paymentBridge');

describe('central payment gateway bridge', () => {
  it('builds a checkout URL with the payment reference and callback details', () => {
    const url = buildCentralGatewayCheckoutUrl({
      gatewayUrl: 'https://gateway.example.com/checkout',
      reference: 'CENTRAL_123',
      amount: 500,
      userId: 'user_123',
      email: 'user@example.com',
      callbackUrl: 'https://app.example.com/api/payments/gateway/callback',
      appName: 'marthington',
    });

    expect(url).toContain('https://gateway.example.com/checkout');
    expect(url).toContain('reference=CENTRAL_123');
    expect(url).toContain('amount=500');
    expect(url).toContain('callback_url=https%3A%2F%2Fapp.example.com%2Fapi%2Fpayments%2Fgateway%2Fcallback');
    expect(url).toContain('app=marthington');
  });
});
