import * as process from 'node:process';

export default () => ({
  database: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
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
  cron: {
    disabled: process.env.CRON_DISABLED === 'true',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
});
