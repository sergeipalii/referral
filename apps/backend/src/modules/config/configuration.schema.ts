import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.string().default('false'),
  JWT_SECRET: Joi.string().required().min(32),

  // Paddle — optional in dev/CI, required to serve upgrade/change-plan/
  // webhook flows in production. The service validates per-call and returns
  // a 503 if the caller hits a Paddle-backed endpoint without configuration.
  PADDLE_API_KEY: Joi.string().optional(),
  PADDLE_WEBHOOK_SECRET: Joi.string().optional(),
  PADDLE_ENVIRONMENT: Joi.string().valid('sandbox', 'production').optional(),
  PADDLE_PRICE_STARTER: Joi.string().optional(),
  PADDLE_PRICE_PRO: Joi.string().optional(),
  PADDLE_PRICE_BUSINESS: Joi.string().optional(),
  BILLING_FRONTEND_BASE_URL: Joi.string().uri().optional(),
}).unknown(true);
