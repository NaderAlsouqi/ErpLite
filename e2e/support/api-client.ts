import { APIRequest, APIRequestContext, APIResponse } from '@playwright/test';
import { ENV, requireCreds } from './env';

/**
 * Thin authenticated client for the CashVanApi backend, used by specs for data
 * setup/teardown, seeding, and asserting persisted state directly (bypassing
 * the UI). Logs in lazily on first authenticated call and caches the JWT.
 */
export class ApiClient {
  private token: string | null = null;

  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(request: APIRequest): Promise<ApiClient> {
    const ctx = await request.newContext({
      // Trailing slash is REQUIRED so relative paths resolve UNDER /api.
      // (A path beginning with '/' would otherwise resolve against the origin
      // and drop the '/api' segment → 404.)
      baseURL: ENV.apiURL.replace(/\/+$/, '') + '/',
      ignoreHTTPSErrors: true,
    });
    return new ApiClient(ctx);
  }

  /** Normalise a path to be relative to the /api base (strip leading slashes). */
  private rel(path: string): string {
    return path.replace(/^\/+/, '');
  }

  /** Log in and cache the token. Returns the JWT. */
  async login(): Promise<string> {
    if (this.token) return this.token;
    requireCreds();
    const res = await this.ctx.post(this.rel('/Auth/Login'), {
      data: { Login_Name: ENV.username, Password: ENV.password, RememberMe: true },
    });
    if (!res.ok()) {
      throw new Error(`API login failed: ${res.status()} ${await res.text()}`);
    }
    const body = await res.json();
    this.token = body.Token ?? body.token;
    if (!this.token) throw new Error('API login succeeded but no Token in response');
    return this.token;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const t = await this.login();
    return { Authorization: `Bearer ${t}` };
  }

  async get(
    path: string,
    params?: Record<string, string | number | boolean>
  ): Promise<APIResponse> {
    return this.ctx.get(this.rel(path), { headers: await this.authHeaders(), params });
  }

  async post(path: string, data?: unknown): Promise<APIResponse> {
    return this.ctx.post(this.rel(path), { headers: await this.authHeaders(), data });
  }

  async delete(path: string): Promise<APIResponse> {
    return this.ctx.delete(this.rel(path), { headers: await this.authHeaders() });
  }

  /** GET returning parsed JSON, throwing on non-2xx. */
  async getJson<T = any>(
    path: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    const res = await this.get(path, params);
    if (!res.ok()) throw new Error(`GET ${path} -> ${res.status()} ${await res.text()}`);
    return (await res.json()) as T;
  }

  /** The user's granted permission keys (from the login response). */
  async permissions(): Promise<string[]> {
    requireCreds();
    const res = await this.ctx.post(this.rel('/Auth/Login'), {
      data: { Login_Name: ENV.username, Password: ENV.password, RememberMe: true },
    });
    if (!res.ok()) return [];
    const body = await res.json();
    return (body.Permissions ?? body.permissions ?? []) as string[];
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}
