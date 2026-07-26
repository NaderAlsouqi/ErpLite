import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function bool(v: string | undefined, def = false): boolean {
  if (v == null || v === '') return def;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

function num(v: string | undefined, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

/** Centralised, typed access to all environment configuration. */
export const ENV = {
  baseURL: (process.env.BASE_URL ?? 'http://localhost:4200').replace(/\/+$/, ''),
  apiURL: (process.env.API_URL ?? 'https://localhost:7089/api').replace(/\/+$/, ''),
  username: process.env.TEST_USERNAME ?? '',
  password: process.env.TEST_PASSWORD ?? '',
  lang: ((process.env.TEST_LANG ?? 'en').toLowerCase() === 'ar' ? 'ar' : 'en') as 'ar' | 'en',
  rememberMe: bool(process.env.REMEMBER_ME, true),
  /** Master switch: when false, all create/edit/post/delete specs are skipped. */
  allowWrites: bool(process.env.ALLOW_WRITES, false),
  startWebServer: bool(process.env.E2E_START_WEBSERVER, true),
  slowExpect: num(process.env.E2E_EXPECT_TIMEOUT, 15_000),
  actionTimeout: num(process.env.E2E_ACTION_TIMEOUT, 15_000),
  navTimeout: num(process.env.E2E_NAV_TIMEOUT, 45_000),
};

/** True when real credentials are configured (authenticated specs can run). */
export const HAS_CREDS = !!ENV.username && !!ENV.password;

/** Throw a helpful error if credentials are required but missing. */
export function requireCreds(): void {
  if (!HAS_CREDS) {
    throw new Error(
      'Missing TEST_USERNAME / TEST_PASSWORD.\n' +
        'Copy e2e/.env.example to e2e/.env and fill in real test-account credentials.'
    );
  }
}

/** Persisted authenticated browser state, produced by fixtures/auth.setup.ts. */
export const STORAGE_STATE = path.resolve(__dirname, '..', '.auth', 'user.json');
export const AUTH_DIR = path.dirname(STORAGE_STATE);
