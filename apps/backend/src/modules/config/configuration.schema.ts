import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.string().default('false'),
  JWT_SECRET: Joi.string().required().min(32),

  // Stripe — optional in dev/CI, required to serve upgrade/portal/webhook
  // flows in production. The service validates per-call and returns a 503
  // if the caller hits a Stripe-backed endpoint without configuration.
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  STRIPE_PRICE_PRO: Joi.string().optional(),
  STRIPE_PRICE_BUSINESS: Joi.string().optional(),
  BILLING_FRONTEND_BASE_URL: Joi.string().uri().optional(),
}).unknown(true);
