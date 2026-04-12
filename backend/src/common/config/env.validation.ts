import * as Joi from 'joi';

/**
 * Environment Variable Validation Schema
 * Validates all required environment variables on application startup
 * Prevents runtime failures due to missing or invalid configuration
 */
export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('Bus Booking Platform'),

  // Database
  DATABASE_URL: Joi.string()
    .required()
    .pattern(/^mongodb(\+srv)?:\/\//)
    .messages({
      'string.empty': 'DATABASE_URL is required',
      'string.pattern.base': 'DATABASE_URL must be a valid MongoDB connection string',
    }),

  // JWT
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.empty': 'JWT_SECRET is required',
      'string.min': 'JWT_SECRET must be at least 32 characters for security',
    }),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.empty': 'JWT_REFRESH_SECRET is required',
      'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters for security',
    }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // Frontend
  FRONTEND_URL: Joi.string()
    .required()
    .messages({
      'string.empty': 'FRONTEND_URL is required for CORS configuration',
    }),

  // Payment (Optional)
  RAZORPAY_KEY_ID: Joi.string().optional(),
  RAZORPAY_KEY_SECRET: Joi.string().optional(),

  // Email (Optional)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().email().optional(),
  SMTP_PASS: Joi.string().optional(),

  // File Upload
  UPLOAD_PATH: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(5242880), // 5MB
});

/**
 * Custom validation function with detailed error messages
 */
export function validateEnvironment(config: Record<string, unknown>) {
  const { error, value } = envValidationSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message).join('\n  - ');
    throw new Error(
      `❌ Environment variable validation failed:\n  - ${errors}\n\n` +
      `Please check your .env file and ensure all required variables are set correctly.\n` +
      `Refer to .env.example for the correct format.`
    );
  }

  return value;
}
