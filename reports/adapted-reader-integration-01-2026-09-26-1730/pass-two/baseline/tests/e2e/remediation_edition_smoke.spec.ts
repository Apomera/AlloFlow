// Remediation-only edition smoke (2026-08-04) — first coverage for ?mode=remediation.
//
// The desktop "Document remediation only" edition serves the normal app bundle
// with ?mode=remediation (AlloFlowANTI.txt "Focused remediation mode"): skip
// onboarding, boot straight into the batch remediation screen, and NEVER expose
// the full app — a lock-in effect re-asserts the remediation screen if anything
// closes it. None of that had a test. This spec serves the desktop app bundle
// (desktop/app-build, same directory the desktop runtime serves) statically and
// pins the three user-visible invariants.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

const APP_BUILD = path.resolve(__dirname, '../../desktop/app-build');

const MIME: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm', '.txt': 'text/plain', '.mp3': 'audio/mpeg',
};

let server: http.Server;
let baseUrl = '';

test.beforeAll(async () => {
  test.skip(!fs.existsSync(path.join(APP_BUILD, 'index.html')),
    'desktop/app-build not built (run desktop web:build)');
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(APP_BUILD, p);
    fs.readFile(file, (err, data) => {
      if (err) {
        fs.readFile(path.join(APP_BUILD, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(404); res.end(); return; }
          res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(d2);
        });
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const addr = server.address() as any;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

test.afterAll(async () => { if (server) server.close(); });

test('boots straight into the locked remediation screen and never exposes the full app', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${baseUrl}/?mode=remediation`, { waitUntil: 'domcontentloaded' });
  // App boot (CDN modules load); the remediation batch screen mounts without any
  // launcher/role/wizard interaction.
  await page.waitForSelector('body.allo-remediation-only', { timeout: 90000 });

  // 1) No onboarding surfaces: the landing "Choose Your Learning Pathway" and the
  //    role picker must not be shown.
  await expect(page.locator('text=CHOOSE YOUR LEARNING PATHWAY')).toHaveCount(0);
  await expect(page.locator('text=How will you be using the app today?')).toHaveCount(0);

  // 2) The remediation surface is present (batch screen inside the audit dialog).
  const dialog = page.locator('[aria-label="PDF Accessibility Audit"]');
  await expect(dialog).toBeVisible({ timeout: 60000 });

  // 3) Lock-in: attempting to close (Escape) re-asserts the remediation screen
  //    rather than dropping to the full app.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  await expect(page.locator('body.allo-remediation-only')).toHaveCount(1);
  await expect(dialog).toBeVisible({ timeout: 15000 });
});
