import { Page } from '@playwright/test';

/**
 * Console / pageerror text that is known third-party or DEV-SERVER noise and must
 * NOT fail a test. The app is served by Angular's Vite/esbuild dev server during
 * E2E, which emits HMR-client and HTTP/2 chatter that does not exist in a
 * production build; the realtime chat hub (SignalR) also fails to connect in test
 * environments. None of these indicate the page under test is broken.
 */
const IGNORE_PATTERNS: RegExp[] = [
  /favicon\.ico/i,
  /ResizeObserver loop/i,
  /Angular is running in development mode/i,
  // ── Angular Vite/esbuild dev-server HMR (absent in production builds) ──
  /@vite\/client/i,
  /\/@vite\//i,
  /\[vite\]/i,
  /\[webpack-dev-server\]/i,
  /net::ERR_HTTP2_PROTOCOL_ERROR/i,
  /net::ERR_ABORTED/i,
  /net::ERR_FAILED/i,
  /net::ERR_NETWORK_CHANGED/i,
  // Generic resource-load lines carry no URL — real backend 5xx are detected
  // precisely by the response listener below, so drop the console duplicates.
  /Failed to load resource/i,
  // ── SignalR realtime chat hub (optional / not wired in test envs) ──
  /ServerSentEvents|EventSource|Long ?Polling|WebSocket/i,
  /Failed to start the transport/i,
  /HubConnection|signalr|negotiate|chathub/i,
  // ── external optional services ──
  /fonts\.googleapis\.com|fonts\.gstatic\.com/i,
  /maps\.google|maps\.googleapis/i,
  /emailjs/i,
  /apexcharts/i,
];

/**
 * URLs whose 5xx responses are ambient (dev server, or app-wide background
 * features) and must not fail a page's smoke test. Real backend API 5xx are
 * still surfaced.
 */
const AMBIENT_5XX_URL: RegExp[] = [
  /\/@vite\//i,
  /localhost:4200|127\.0\.0\.1:4200/i, // the dev server itself
  /\/chat|\/notification|signalr|negotiate|\/hub(s)?\b/i, // realtime chat/notifications
];

export interface CollectedErrors {
  /** console.error() messages (dev/transport noise already filtered out). */
  console: string[];
  /** Uncaught JS exceptions on the page — always treated as fatal. */
  pageErrors: string[];
  /** Real backend (API) responses with status >= 500. */
  badResponses: string[];
}

const ignored = (text: string) => IGNORE_PATTERNS.some((p) => p.test(text));

/** Start collecting runtime errors from a page. Returns the live buffer. */
export function attachErrorCollector(page: Page): CollectedErrors {
  const c: CollectedErrors = { console: [], pageErrors: [], badResponses: [] };

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (!ignored(text)) c.console.push(text);
  });

  page.on('pageerror', (err) => {
    const text = err.message ?? String(err);
    if (!ignored(text)) c.pageErrors.push(text);
  });

  page.on('response', (res) => {
    if (res.status() < 500) return;
    const url = res.url();
    if (AMBIENT_5XX_URL.some((p) => p.test(url))) return;
    if (ignored(url)) return;
    c.badResponses.push(`${res.status()} ${res.request().method()} ${url}`);
  });

  return c;
}

/** Any collected error (console, uncaught, or real backend 5xx). */
export function hasErrors(c: CollectedErrors): boolean {
  return c.console.length > 0 || c.pageErrors.length > 0 || c.badResponses.length > 0;
}

/** Only the always-fatal class: uncaught JS exceptions. */
export function hasFatalErrors(c: CollectedErrors): boolean {
  return c.pageErrors.length > 0;
}

/** Human-readable summary for assertion messages. */
export function errorSummary(c: CollectedErrors): string {
  const parts: string[] = [];
  if (c.pageErrors.length) parts.push(`Uncaught JS errors:\n    - ${c.pageErrors.join('\n    - ')}`);
  if (c.console.length) parts.push(`Console errors:\n    - ${c.console.join('\n    - ')}`);
  if (c.badResponses.length) parts.push(`Backend 5xx responses:\n    - ${c.badResponses.join('\n    - ')}`);
  return parts.length ? parts.join('\n') : '(none)';
}
