import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/slop-factory'),
  UPLOAD_DIR: z.string().default('./uploads'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  ANTHROPIC_API_KEY: z.string().default(''),
  FREEPIK_API_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string().optional(),
  FREEPIK_WEBHOOK_BASE_URL: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
