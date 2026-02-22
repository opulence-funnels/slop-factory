import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/slop-factory'),
  UPLOAD_DIR: z.string().default('./uploads'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // AdForge — AI
  ANTHROPIC_API_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string().optional(),

  // AdForge — Image/Video Generation (Freepik)
  FREEPIK_API_KEY: z.string().default(''),
  FREEPIK_WEBHOOK_BASE_URL: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
