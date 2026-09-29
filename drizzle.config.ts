import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Pointing this to .env since that's what you named your file
dotenv.config({ path: '.env' }); 

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});