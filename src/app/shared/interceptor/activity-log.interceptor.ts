import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ActivityLogService } from '../services/activity-log.service';
import { AuthService } from '../services/auth.service';

// ─── Module → GET endpoint mapping ───────────────────────────────────────────
// Used to pre-fetch the current record before an update so OldValues can be logged.
interface PrefetchConfig {
  endpoint: string;
  params: Array<{ body: string; query: string }>;
}

const PREFETCH_MAP: Record<string, PrefetchConfig> = {
  JournalVouchers: {
    endpoint: 'GetVoucher',
    params: [
      { body: 'DocNum',  query: 'docNum'  },
      { body: 'MyYear',  query: 'myYear'  },
      { body: 'VType',   query: 'vType'   },
      { body: 'DocType', query: 'docType' },
    ],
  },
  ServBill: {
    endpoint: 'GetVoucher',
    params: [
      { body: 'BillNo',  query: 'billNo'  },
      { body: 'MyYear',  query: 'myYear'  },
      { body: 'VType',   query: 'vType'   },
    ],
  },
};

function buildPrefetchUrl(
  saveUrl: string,
  module: string,
  body: Record<string, unknown>,
  config: PrefetchConfig,
): string | null {
  try {
    const u = new URL(saveUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const apiIdx = parts.findIndex(p => p.toLowerCase() === 'api');
    if (apiIdx < 0) return null;
    const apiBase = `${u.origin}/${parts.slice(0, apiIdx + 1).join('/')}`;

    const qs = config.params
      .filter(({ body: bk }) => body[bk] != null)
      .map(({ body: bk, query }) => `${query}=${encodeURIComponent(String(body[bk]))}`)
      .join('&');

    return qs ? `${apiBase}/${module}/${config.endpoint}?${qs}` : null;
  } catch {
    return null;
  }
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function extractModule(url: string): string {
  try {
    const path = new URL(url).pathname;
    const parts = path.split('/').filter(Boolean);
    const apiIndex = parts.findIndex(p => p.toLowerCase() === 'api');
    return apiIndex >= 0 && parts[apiIndex + 1] ? parts[apiIndex + 1] : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/** Returns true when the body has a non-zero primary key → it is an update. */
function isUpdateBody(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const obj = body as Record<string, unknown>;
  const idFields = ['TransNum', 'transNum', 'BillNo', 'billNo', 'Id', 'id', 'TransNo', 'transNo'];
  for (const field of idFields) {
    const val = obj[field];
    if (typeof val === 'number' && val > 0) return true;
    if (typeof val === 'string'  && parseInt(val, 10) > 0) return true;
  }
  return false;
}

function extractAction(method: string, url: string, body?: unknown): string {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('/login'))  return 'Login';
  if (urlLower.includes('/logout')) return 'Logout';

  try {
    const path = new URL(url).pathname;
    const parts = path.split('/').filter(Boolean);
    const last = parts[parts.length - 1].toLowerCase();

    const createVerbs = ['save', 'insert', 'create'];
    if (createVerbs.includes(last)) {
      return isUpdateBody(body) ? 'Update' : 'Add';
    }

    const knownActions = ['add', 'update', 'delete', 'remove', 'edit'];
    if (knownActions.includes(last)) {
      return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
    }
  } catch { /* ignore */ }

  const verbMap: Record<string, string> = {
    POST:   'Add',
    PUT:    'Update',
    PATCH:  'Update',
    DELETE: 'Delete',
  };
  return verbMap[method.toUpperCase()] ?? method;
}

function buildOperationDetails(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const obj = body as Record<string, unknown>;

  const identifierKeys = ['Id', 'id', 'BillNo', 'billNo', 'TransNum', 'transNum',
                          'DocNum', 'docNum', 'No', 'no', 'Code', 'code', 'Number', 'number'];
  const nameKeys       = ['Name', 'CusName', 'Des', 'Title', 'Email', 'Description', 'name', 'title', 'email'];
  const parts: string[] = [];

  for (const key of [...identifierKeys, ...nameKeys]) {
    const val = obj[key];
    if (val != null && (typeof val === 'string' || typeof val === 'number')) {
      const display = String(val).trim();
      if (display && display !== '0') {
        parts.push(`${key}: ${display.substring(0, 80)}`);
        if (parts.length >= 2) break;
      }
    }
  }

  return parts.length > 0 ? parts.join(' | ') : null;
}

const NEW_VALUES_SKIP = new Set([
  'Password', 'password', 'Token', 'token', 'RefreshToken', 'refreshToken',
  'Permissions', 'permissions',
]);

/** Serializes a single array-item object to a compact "key: val, key: val" string. */
function serializeItem(item: unknown): string | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const record = item as Record<string, unknown>;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(record)) {
    if (NEW_VALUES_SKIP.has(k)) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') continue;
    const display = String(v).trim();
    if (!display) continue;
    parts.push(`${k}: ${display.substring(0, 60)}`);
  }
  return parts.length ? parts.join(', ') : null;
}

/** Flattens any object to a key: value string. Arrays are expanded as [item] entries. */
function buildValues(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const record = obj as Record<string, unknown>;

  const parts: string[] = [];
  for (const [k, v] of Object.entries(record)) {
    if (NEW_VALUES_SKIP.has(k)) continue;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      const items = (v as unknown[])
        .map(item => serializeItem(item))
        .filter(Boolean)
        .map(s => `[${s}]`)
        .join(' ');
      if (items) parts.push(`${k}: ${items}`);
      continue;
    }
    if (typeof v === 'object') continue;
    const display = String(v).trim();
    if (!display) continue;
    parts.push(`${k}: ${display.substring(0, 100)}`);
  }

  return parts.length > 0 ? parts.join(' | ') : null;
}

function buildDeleteParams(url: string): string | null {
  try {
    const u = new URL(url);
    const skip = new Set(['pagenumber', 'pagesize', 'page']);
    const parts: string[] = [];
    u.searchParams.forEach((val, key) => {
      if (!skip.has(key.toLowerCase())) parts.push(`${key}: ${val}`);
    });
    return parts.length > 0 ? parts.join(' | ') : null;
  } catch {
    return null;
  }
}

function buildErrorDetails(err: HttpErrorResponse): string {
  let msg = `HTTP ${err.status}`;
  if (err.statusText && err.statusText !== 'OK' && err.statusText !== 'Unknown Error') {
    msg += ` ${err.statusText}`;
  }

  const body = err.error;
  if (body) {
    if (typeof body === 'string' && body.trim()) {
      msg += ': ' + body.trim().substring(0, 300);
    } else if (typeof body === 'object') {
      const e = body as Record<string, unknown>;
      const text = (e['message'] ?? e['title'] ?? e['detail'] ??
                    e['Message'] ?? e['Title'] ?? e['Detail']) as string | undefined;
      if (text && typeof text === 'string') {
        msg += ': ' + text.substring(0, 300);
      } else if (e['errors'] && typeof e['errors'] === 'object') {
        const msgs = (Object.values(e['errors']) as unknown[])
          .flat()
          .filter(Boolean)
          .slice(0, 3)
          .join('; ');
        if (msgs) msg += ': ' + msgs.substring(0, 300);
      }
    }
  }

  return msg;
}

const SKIP_PATTERNS = [
  '/ActivityLog/Insert',
  '/ActivityLog/GetAll',
  '/ActivityLog/GetModules',
  '/assets/',
  '/i18n/',
];

// ─── Interceptor ──────────────────────────────────────────────────────────────

export const activityLogInterceptor: HttpInterceptorFn = (req, next) => {
  const logService  = inject(ActivityLogService);
  const authService = inject(AuthService);
  const backend     = inject(HttpBackend);

  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  const shouldSkip = !isMutating
    || !authService.isLoggedIn
    || !req.url.startsWith('http')
    || SKIP_PATTERNS.some(p => req.url.includes(p));

  if (shouldSkip) {
    return next(req);
  }

  const module    = extractModule(req.url);
  const action    = extractAction(req.method, req.url, req.body);
  const details   = buildOperationDetails(req.body);
  const newValues = req.method.toUpperCase() === 'DELETE'
    ? buildDeleteParams(req.url)
    : buildValues(req.body);

  // Pre-fetch old values for known update operations
  const prefetchConfig = action === 'Update' ? PREFETCH_MAP[module] : undefined;
  const prefetchUrl = prefetchConfig && req.body && typeof req.body === 'object'
    ? buildPrefetchUrl(req.url, module, req.body as Record<string, unknown>, prefetchConfig)
    : null;

  const oldValues$ = prefetchUrl
    ? new HttpClient(backend).get<unknown>(prefetchUrl, {
        headers: { Authorization: `Bearer ${authService.getToken() ?? ''}` },
      }).pipe(
        map(res => buildValues(res)),
        catchError(() => of(null)),
      )
    : of(null);

  return oldValues$.pipe(
    switchMap(oldValues =>
      next(req).pipe(
        tap({
          next: (event) => {
            if (event instanceof HttpResponse) {
              logService.insert({
                Action:    action,
                Module:    module,
                Details:   details,
                NewValues: newValues,
                OldValues: oldValues,
                IsSuccess: event.status >= 200 && event.status < 300,
              }).subscribe();
            }
          },
          error: (err: unknown) => {
            logService.insert({
              Action:       action,
              Module:       module,
              Details:      details,
              NewValues:    newValues,
              OldValues:    oldValues,
              ErrorDetails: err instanceof HttpErrorResponse ? buildErrorDetails(err) : 'Request failed',
              IsSuccess:    false,
            }).subscribe();
          },
        })
      )
    ),
  );
};
