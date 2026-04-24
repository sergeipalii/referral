import * as process from 'node:process';

export default () => ({
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '', 10) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  },
  app: {
    name: 'Referral System API',
    version: '1.0.0',
    description: 'SaaS referral system API',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  // Paddle (Merchant of Record). All keys are optional — without them the
  // /billing subscription endpoint still works (read-only on a free plan),
  // only checkout/change-plan/webhook endpoints bail out with a clear error.
  paddle: {
    apiKey: process.env.PADDLE_API_KEY || null,
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || null,
    environment:
      process.env.PADDLE_ENVIRONMENT === 'production'
        ? 'production'
        : 'sandbox',
    priceStarter: process.env.PADDLE_PRICE_STARTER || null,
    pricePro: process.env.PADDLE_PRICE_PRO || null,
    priceBusiness: process.env.PADDLE_PRICE_BUSINESS || null,
  },
  billing: {
    frontendBaseUrl:
      process.env.BILLING_FRONTEND_BASE_URL || 'http://localhost:3000',
  },
});
