import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(__dirname, '..');
const { inspectCloudParity, runSelftest } = require('../dev-tools/check_cloud_deploy_parity.cjs');
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');

const PASSWORD = 'synthetic clinical vault passphrase';
const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const services = [];
const roots = [];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function parseHeadersBlock(rawHeaders, routeHeader) {
  const lines = rawHeaders.split(/\r?\n/);
  const out = {};
  let inBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      if (inBlock) break;
      if (trimmed === routeHeader) inBlock = true;
      continue;
    }
    if (inBlock) {
      const idx = trimmed.indexOf(':');
      if (idx > 0) {
        out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  }
  return out;
}

function makeMemoryRepo() {
  return {
    revision: 0,
    store: null,
    async read() {
      return { revision: this.revision, store: clone(this.store) };
    },
    async compareAndSwap(expected, next) {
      if (expected !== this.revision) return false;
      this.store = clone(next);
      this.revision += 1;
      return true;
    },
  };
}

function makeService(extra = {}) {
  let clock = extra.initialClock || 1794760000000;
  const service = SW.createService({
    repository: extra.repository || makeMemoryRepo(),
    vaultModule: Vault,
    crypto: Crypto,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS },
    lifecycle: extra.lifecycle !== undefined ? extra.lifecycle : false,
    saveDelayMs: 60000,
    now: () => clock,
    getContext: () => ({ learner: false, isCanvas: false }),
    ...extra,
  });
  services.push(service);
  return {
    service,
    advanceClock(ms) {
      clock += ms;
    },
  };
}

afterEach(async () => {
  for (const { root, node } of roots.splice(0)) {
    await React.act(async () => root.unmount());
    node.remove();
  }
  services.splice(0).forEach((s) => s.dispose());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CSP Report-Only parity across Cloudflare Pages and Firebase Hosting', () => {
  it('defines matching Content-Security-Policy-Report-Only directives on /app/* and hosting **', () => {
    const edgeHeaders = parseHeadersBlock(readFileSync(resolve(ROOT, '_headers'), 'utf8'), '/app/*');
    const firebaseCfg = JSON.parse(readFileSync(resolve(ROOT, 'desktop/web-app/firebase.json'), 'utf8'));
    const catchAll = firebaseCfg.hosting.headers.find((h) => h.source === '**');
    const fbHeaders = Object.fromEntries(catchAll.headers.map((h) => [h.key, h.value]));

    expect(edgeHeaders['Content-Security-Policy']).toBe("frame-ancestors 'self'; object-src 'none'; base-uri 'self'");
    expect(fbHeaders['Content-Security-Policy']).toBe("frame-ancestors 'self'; object-src 'none'; base-uri 'self'");

    const edgeRo = edgeHeaders['Content-Security-Policy-Report-Only'];
    const fbRo = fbHeaders['Content-Security-Policy-Report-Only'];
    expect(edgeRo).toBeTruthy();
    expect(fbRo).toBe(edgeRo);

    // Per W3C CSP spec, frame-ancestors is ignored/noisy in Report-Only and must stay only in enforced CSP.
    expect(edgeRo).not.toContain('frame-ancestors');
    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      'script-src ',
      'style-src ',
      'font-src ',
      'img-src ',
      'media-src ',
      'worker-src ',
      'frame-src ',
      'connect-src ',
    ]) {
      expect(edgeRo).toContain(directive);
    }

    const directives = Object.fromEntries(
      edgeRo
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const spaceIdx = part.indexOf(' ');
          return spaceIdx > 0 ? [part.slice(0, spaceIdx), part.slice(spaceIdx + 1)] : [part, ''];
        })
    );
    expect(directives['script-src'].split(/\s+/)).not.toContain('*');
    expect(directives['worker-src'].split(/\s+/)).not.toContain('*');
  });
});

describe('Cloud deploy parity preflight', () => {
  it('verifies clean live repo mirror parity and passes its synthetic mutation selftest', () => {
    const live = inspectCloudParity({ root: ROOT, changedPaths: [] });
    expect(live.ok).toBe(true);
    expect(live.parityErrors).toEqual([]);
    expect(live.pendingTargets).toEqual([]);

    const selfResult = runSelftest();
    expect(selfResult).toMatchObject({ ok: true, checks: 5 });
  });
});

describe('Clinical vault 15-minute auto-lock default', () => {
  it('defaults service.setup(password) to 15-minute idle lock and triggers auto-lock at 15 minutes', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const h = makeService({ lifecycle: true });
    await h.service.setup(PASSWORD);
    const code = h.service.getStatus().setupRecoveryCode;
    await h.service.exportBackup();
    await h.service.finishSetup({ recoveryInput: code, backupSaved: true });

    expect(h.service.getStatus()).toMatchObject({ phase: 'ready', idleMinutes: 15 });

    h.advanceClock(14 * 60000);
    await vi.advanceTimersByTimeAsync(15000);
    expect(h.service.getStatus().phase).toBe('ready');

    h.advanceClock(60000);
    await vi.advanceTimersByTimeAsync(15000);
    expect(h.service.getStatus().phase).toBe('locked');
  });

  it('preserves explicit manual locking when setup(password, 0) is chosen', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const h = makeService({ lifecycle: true });
    await h.service.setup(PASSWORD, 0);
    const code = h.service.getStatus().setupRecoveryCode;
    await h.service.exportBackup();
    await h.service.finishSetup({ recoveryInput: code, backupSaved: true });

    expect(h.service.getStatus()).toMatchObject({ phase: 'ready', idleMinutes: 0 });
    h.advanceClock(60 * 60000);
    await vi.advanceTimersByTimeAsync(15000);
    expect(h.service.getStatus().phase).toBe('ready');
  });

  it('initializes SW.Boundary idle lock selector to 15 minutes while offering manual and other intervals', async () => {
    const h = makeService();
    const node = document.createElement('div');
    document.body.appendChild(node);
    const root = createRoot(node);
    roots.push({ root, node });

    await React.act(async () => {
      root.render(React.createElement(SW.Boundary, { React, service: h.service, feature: 'behavior-lens' }, () => null));
    });

    const select = node.querySelector('select');
    expect(select).not.toBeNull();
    expect(select.value).toBe('15');
    expect(Array.from(select.querySelectorAll('option')).map((o) => o.value)).toEqual(['0', '5', '15', '30']);

    const labels = Array.from(node.querySelectorAll('label'));
    const pwInput = labels.find((l) => l.textContent.startsWith('New saved-records password')).querySelector('input');
    const confirmInput = labels.find((l) => l.textContent.startsWith('Confirm password')).querySelector('input');
    expect(pwInput).not.toBeNull();
    expect(confirmInput).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await React.act(async () => {
      setter.call(pwInput, PASSWORD);
      pwInput.dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(confirmInput, PASSWORD);
      confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const createBtn = Array.from(node.querySelectorAll('button')).find((b) => b.textContent === 'Create protected workspace');
    await React.act(async () => {
      createBtn.click();
    });
    for (let i = 0; i < 400 && h.service.getStatus().phase !== 'setup'; i += 1) {
      await React.act(() => new Promise((resolve) => setTimeout(resolve, 5)));
    }

    expect(h.service.getStatus().phase).toBe('setup');
    expect(h.service.getStatus().idleMinutes).toBe(15);
  });
});
