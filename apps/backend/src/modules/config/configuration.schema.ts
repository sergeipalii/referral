import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.string().default('false'),
  JWT_SECRET: Joi.string().required().min(32),
});
