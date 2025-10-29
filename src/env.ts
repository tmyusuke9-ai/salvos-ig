import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  STORAGE_DIR: process.env.STORAGE_DIR ?? './storage',

  IG_GRAPH_ACCESS_TOKEN: process.env.IG_GRAPH_ACCESS_TOKEN,
  IG_GRAPH_USER_ID: process.env.IG_GRAPH_USER_ID,
  DOWNLOADER_API_BASE: process.env.DOWNLOADER_API_BASE,
  DOWNLOADER_API_KEY: process.env.DOWNLOADER_API_KEY,
};
