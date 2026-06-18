/* Capture a screenshot of every page listed in docs/pages.json.
   Run:  NODE_PATH="C:/Users/nader/pw-tools/node_modules" node docs/capture-screenshots.cjs
   Requires the dev frontend on http://localhost:4200 and the API it targets to be running.

   Error handling:
   - Transient error UI (ngx-toastr toasts) is removed from the DOM BEFORE the
     screenshot, so captured images never show error/notification popups.
   - Each page is checked for errors (error toasts, failed /api/ responses,
     uncaught page errors, global-error-handler console errors). Pages that hit
     an error are flagged with hadError=true and listed in _errors.json so they
     can be fixed later. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE  = 'http://localhost:4200';
const USER  = process.env.PW_USER || 'Nader';
const PASS  = process.env.PW_PASS || 'Nader@12345';
const OUT   = process.env.PW_OUT  || path.join('docs', 'screenshots');
const PAGES = process.env.PW_PAGES || path.join('docs', 'pages.json');
const LANG  = process.env.PW_LANG || '';   // 'ar' to force Arabic UI

const slug = r => (r.replace(/^\//, '').replace(/[\/:]+/g, '_') || 'root');

// console-error text that signals a real APP failure worth flagging (not dev-server noise).
// NOTE: deliberately excludes the bare "Failed to load resource … Internal Server Error"
// message (which Vite's @vite/client emits when the dev HMR socket 500s) — those carry no
// URL and are not app errors. Angular's own "Http failure response for <url>" DOES carry the
// URL, so real API failures are still caught here and via the /api/ response listener below.
const MEANINGFUL_CONSOLE =
  /global error handler|http failure response|cannot read propert|is not a function|is not defined|undefined is not an object|null is not an object/i;
// dev-server / tooling URLs that must never count as app errors
const INFRA_URL = /@vite|@fs|@id\/|\/__vite|node_modules\/\.vite|sockjs|ws:\/\/|\/ng-cli-ws|hot-update/i;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const pages = JSON.parse(fs.readFileSync(PAGES, 'utf8'));
  const results = [];

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  if (LANG) {
    // App reads localStorage['language'] at bootstrap (app.config APP_INITIALIZER).
    await ctx.addInitScript(l => { try { localStorage.setItem('language', l); } catch (e) {} }, LANG);
  }
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  // ── Per-page error collectors (reset before each page navigation) ───────────
  let consoleErrs = [];
  let pageErrs    = [];
  let apiErrs     = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (MEANINGFUL_CONSOLE.test(t) && !INFRA_URL.test(t)) consoleErrs.push(t.slice(0, 300));
    }
  });
  page.on('pageerror', err => {
    const t = String(err && err.message || err);
    if (!INFRA_URL.test(t)) pageErrs.push(t.slice(0, 300));
  });
  page.on('response', resp => {
    try {
      const u = resp.url(); const s = resp.status();
      if (s >= 400 && /\/api\//i.test(u) && !INFRA_URL.test(u)) apiErrs.push(`HTTP ${s} ${u.split('?')[0]}`);
    } catch (e) {}
  });

  // ── Login ────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#Login_Name', { timeout: 20000 });
  await page.fill('#Login_Name', USER);
  await page.fill('#password', PASS);
  await page.waitForTimeout(400);
  await page.click('button[type=submit]');
  try {
    await page.waitForURL(u => !u.toString().includes('/auth/login'), { timeout: 25000 });
  } catch { /* fall through; will be flagged per-page */ }
  await page.waitForTimeout(3000);
  console.log('After login →', page.url());
  if (page.url().includes('/auth/login')) {
    console.error('!! Still on login page — credentials/API likely failed. Aborting.');
    await browser.close();
    fs.writeFileSync(path.join(OUT, '_results.json'), JSON.stringify({ loginFailed: true }, null, 2));
    process.exit(2);
  }

  // ── Walk pages ─────────────────────────────────────────────────────────────
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const file = `${String(i + 1).padStart(2, '0')}_${slug(p.route)}.png`;
    // reset collectors for this page
    consoleErrs = []; pageErrs = []; apiErrs = [];
    try {
      await page.goto(BASE + p.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2800);                       // let data/charts render + any error toast fire

      // detect any visible error toast before we scrub it
      let toastErrs = [];
      try {
        toastErrs = await page.$$eval(
          '#toast-container .toast-error, .toast-error',
          els => els.map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200)).filter(Boolean)
        );
      } catch (e) {}

      // scrub transient popups (all toasts) so they never appear in the screenshot
      try {
        await page.evaluate(() => {
          document.querySelectorAll('#toast-container, .toast-container, .overlay-container .toast, .toast')
            .forEach(el => el.remove());
        });
      } catch (e) {}
      await page.waitForTimeout(150);

      await page.screenshot({ path: path.join(OUT, file), fullPage: true });

      const ok = !page.url().includes('/auth/login');
      const errors = [
        ...toastErrs.map(t => `toast: ${t}`),
        ...apiErrs.map(t => `api: ${t}`),
        ...pageErrs.map(t => `pageerror: ${t}`),
        ...consoleErrs.map(t => `console: ${t}`),
      ];
      // de-dup
      const uniq = [...new Set(errors)].slice(0, 12);
      const hadError = uniq.length > 0;
      results.push({ ...p, file, finalUrl: page.url(), ok, hadError, errors: uniq });
      console.log(`${hadError ? 'ERR ' : (ok ? 'OK  ' : 'WARN')} ${p.route}${hadError ? '  ⚠ ' + uniq[0] : ''}`);
    } catch (e) {
      results.push({ ...p, file: null, finalUrl: BASE + p.route, ok: false, hadError: true,
        errors: ['capture: ' + String(e).split('\n')[0]] });
      console.log(`FAIL ${p.route} : ${String(e).split('\n')[0]}`);
    }
  }

  // Merge into any existing _results.json (so capturing a subset updates only those routes)
  const rfile = path.join(OUT, '_results.json');
  let merged = [];
  try { const ex = JSON.parse(fs.readFileSync(rfile, 'utf8')); if (Array.isArray(ex)) merged = ex; } catch {}
  const byRoute = new Map(merged.filter(r => r && r.route).map(r => [r.route, r]));
  for (const r of results) byRoute.set(r.route, r);
  const allResults = [...byRoute.values()];
  fs.writeFileSync(rfile, JSON.stringify(allResults, null, 2));

  // Write an errors-only fix-list
  const errored = allResults.filter(r => r && r.hadError)
    .map(r => ({ route: r.route, title: r.title, section: r.section, errors: r.errors || [] }));
  fs.writeFileSync(path.join(OUT, '_errors.json'), JSON.stringify(errored, null, 2));

  await browser.close();
  const okCount = results.filter(r => r.ok && !r.hadError).length;
  console.log(`DONE — ${okCount}/${results.length} clean, ${results.filter(r => r.hadError).length} with errors.`);
  if (errored.length) {
    console.log('Pages with errors (see _errors.json):');
    errored.forEach(e => console.log(`  • ${e.route} — ${(e.errors[0] || '').slice(0, 120)}`));
  }
})();
