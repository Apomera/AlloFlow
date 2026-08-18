// Renders apps_script/educator_evaluation/Portal.html, the exact bundle a district
// pastes into its own Apps Script project, in a real browser with google.script.run
// stubbed by bootstrap payloads from the production Code.gs harness.
//
// Everything else covering the portal is either server-side (the VM harness) or a
// text pin. Until this existed, nothing proved the pasted bundle mounts at all.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { repositoryFixture, EVALUATOR, TEACHER_ONE } from './helpers/educator_evaluation_gs_harness.js';

const PORTAL = fs.readFileSync(path.join(process.cwd(), 'apps_script', 'educator_evaluation', 'Portal.html'), 'utf8');

const bootstrapFor = (email) => {
  const harness = repositoryFixture();
  harness.setActiveEmail(email);
  const boot = harness.invoke('bootstrap');
  expect(boot.ok).toBe(true);
  return boot;
};

const harnessPage = (boot) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>portal harness</title>
<style>html,body,#educator-evaluation-root{min-height:100%;margin:0}</style></head>
<body><div id="educator-evaluation-root"></div>
<script>
  const BOOT = ${JSON.stringify(boot)};
  const chain = (resolve) => {
    const api = {
      withSuccessHandler(fn) { api._ok = fn; return api; },
      withFailureHandler(fn) { api._fail = fn; return api; },
    };
    for (const name of ['getPortalBootstrap','savePortalWorkspace','sendPortalNotification',
      'sharePortalReleasedEvaluation','recordReleasedSummaryOpened','getPortalSetupHealth','getPortalCohortStats']) {
      api[name] = function () { setTimeout(() => api._ok && api._ok(resolve(name)), 5); };
    }
    return api;
  };
  window.google = { script: {
    run: chain((name) => (name === 'getPortalBootstrap' ? BOOT : { ok: true, checks: [] })),
    url: { getLocation(cb) { cb({ parameter: {} }); } },
  } };
<\/script>
${PORTAL}
</body></html>`;

describe('district portal bundle renders', () => {
  let browser;
  let dir;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-portal-render-'));
  }, 60000);

  afterAll(async () => {
    if (browser) await browser.close();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }, 30000);

  const render = async (email, name) => {
    const file = path.join(dir, name + '.html');
    fs.writeFileSync(file, harnessPage(bootstrapFor(email)), 'utf8');
    const page = await browser.newPage({ viewport: { width: 1180, height: 800 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(pathToFileURL(file).href);
    await page.waitForSelector('.ae-tabs', { timeout: 20000 });
    await page.waitForTimeout(600);
    return { page, errors };
  };

  it('mounts for an evaluator with the district identity and no role switch', async () => {
    const { page, errors } = await render(EVALUATOR, 'evaluator');
    const tabs = await page.locator('.ae-tab').allInnerTexts();
    expect(tabs).toContain('Staff');
    expect(tabs).toContain('Reports & audit');
    const banner = await page.locator('.ae-local-banner').first().innerText();
    expect(banner).toContain('District Google account');
    expect(banner).toContain('Evaluator access');
    // Whitespace between the label and the sentence, for screen readers.
    expect(banner).toMatch(/District Google account\s+\S/);
    // The portal takes identity from the server; a client-side role switch there
    // would imply a user can choose their own permissions.
    expect(await page.locator('.ae-role').count()).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  it('mounts for an educator scoped to their own record only', async () => {
    const { page, errors } = await render(TEACHER_ONE, 'teacher');
    const tabs = await page.locator('.ae-tab').allInnerTexts();
    expect(tabs).toContain('My evaluation');
    expect(tabs).not.toContain('Staff');
    expect(tabs).not.toContain('Reports & audit');
    const banner = await page.locator('.ae-local-banner').first().innerText();
    expect(banner).toContain('Educator access');
    expect(await page.locator('.ae-role').count()).toBe(0);
    // No roster control anywhere in an educator's portal.
    expect(await page.locator('text=Selected educator').count()).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  const renderRejected = async (reply, name) => {
    const file = path.join(dir, name + '.html');
    const stub = reply === null ? '' : `
      const REPLY = ${JSON.stringify(reply)};
      const chain = () => {
        const api = { withSuccessHandler(fn) { api._ok = fn; return api; }, withFailureHandler(fn) { api._fail = fn; return api; } };
        for (const n of ['getPortalBootstrap','savePortalWorkspace','getPortalSetupHealth']) {
          api[n] = function () { setTimeout(() => api._ok && api._ok(REPLY), 5); };
        }
        return api;
      };
      window.google = { script: { run: chain(), url: { getLocation(cb) { cb({ parameter: {} }); } } } };`;
    const html = harnessPage({}).replace(/const BOOT[\s\S]*?} };/, stub);
    fs.writeFileSync(file, html, 'utf8');
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(pathToFileURL(file).href);
    await page.waitForSelector('h2', { timeout: 15000 });
    await page.waitForTimeout(500);
    return { page, errors };
  };

  // "Fails closed" is promised in the user manual and in the IT chapter of the
  // teacher guide. These assert that failing closed is legible, not a blank page.
  const FAILURES = [
    ['a district account that is not a member',
      { ok: false, error: { code: 'denied', message: 'Your district account is not authorized for this evaluation repository.' } },
      'not authorized for this evaluation repository'],
    ['a repository that was never set up',
      { ok: false, error: { code: 'not_configured', message: 'The evaluation repository has not been set up yet.' } },
      'has not been set up yet'],
    ['the page opened outside Apps Script', null,
      'must be opened from the district Apps Script web-app URL'],
  ];

  for (const [label, reply, expectedReason] of FAILURES) {
    it(`refuses ${label} with a readable explanation and a way forward`, async () => {
      const { page, errors } = await renderRejected(reply, 'fail-' + label.replace(/\W+/g, '-'));
      const text = await page.locator('body').innerText();
      expect(text).toContain('The secure workspace could not be opened');
      // Proves this case's stub actually drove the render, rather than the page
      // failing for some unrelated reason and passing the generic assertions.
      expect(text).toContain(expectedReason);
      expect(text).toContain('ask the district administrator');
      expect(text).toContain('Records remain hidden until identity and assignments are verified');
      // No records leak into a refused session, and no raw error tokens surface.
      expect(text).not.toMatch(/undefined|\[object|TypeError/);
      expect(await page.locator('.ae-tabs').count()).toBe(0);
      expect(await page.locator('button', { hasText: 'Try again' }).count()).toBe(1);
      expect(errors).toEqual([]);
      await page.close();
    }, 90000);
  }

  it('offers the user manual from the portal header too', async () => {
    const { page, errors } = await render(EVALUATOR, 'manual-link');
    expect(await page.locator('a[href*="educator-evaluation-manual"]').count()).toBeGreaterThanOrEqual(1);
    expect(errors).toEqual([]);
    await page.close();
  }, 90000);
});
