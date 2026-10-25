import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const renderer = 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs';
const auditor = 'agent_skills/alloflow-source-remediation/scripts/audit_page.cjs';
function load(file, env = {}, launch = vi.fn()) {
  const code = readFileSync(file, 'utf8').replace(/\nmain\(\);\s*$/, '');
  const context = vm.createContext({
    require: name => ['playwright', 'playwright-core'].includes(name) ? { chromium: { launch } } : require(name),
    process: { env, argv: [], execPath: process.execPath },
    __dirname: resolve(file, '..'), Buffer,
  });
  const api = vm.runInContext(code + '\n({ browserLaunchOptions, capabilities: typeof capabilities === "function" ? capabilities : null });', context);
  return { ...api, launch };
}

describe.each([renderer, auditor])('%s local browser selection', file => {
  it('lets Playwright select its matching headless browser without forcing a headed executable', () => {
    const options = load(file).browserLaunchOptions();
    expect(options.headless).toBe(true);
    expect(options).not.toHaveProperty('executablePath');
    expect(options.timeout).toBeGreaterThan(0);
    expect(options.timeout).toBeLessThanOrEqual(30000);
    expect(options.args).toContain('--disable-background-networking');
    expect(options.args).toContain('--disable-component-update');
  });
  it('honors an explicit local executable override', () => {
    const options = load(file, { ALLOFLOW_CHROMIUM_PATH: process.execPath }).browserLaunchOptions();
    expect(options.executablePath).toBe(resolve(process.execPath));
  });
  it('rejects a missing override rather than silently choosing another browser', () => {
    const missing = resolve('reports/remediation-release-readiness-2026-10-24/nonexistent-chromium-executable');
    expect(() => load(file, { ALLOFLOW_CHROMIUM_PATH: missing }).browserLaunchOptions()).toThrow('ALLOFLOW_CHROMIUM_PATH');
  });
  it('rejects a directory used as an executable override', () => {
    expect(() => load(file, { ALLOFLOW_CHROMIUM_PATH: process.cwd() }).browserLaunchOptions()).toThrow('ALLOFLOW_CHROMIUM_PATH');
  });
});

describe('tagged renderer capabilities report actual launch availability', () => {
  it('reports an unavailable browser without treating an installed package as ready', async () => {
    const launch = vi.fn(async () => { throw Error('No local headless browser is installed.'); });
    const result = await load(renderer, {}, launch).capabilities();
    expect(result).toMatchObject({ available: false, reason: 'No local headless browser is installed.', networkPolicy: 'deny' });
    expect(launch).toHaveBeenCalledOnce();
  });
  it('closes a successfully probed browser before reporting availability', async () => {
    const close = vi.fn(async () => {}), launch = vi.fn(async () => ({ close }));
    const result = await load(renderer, {}, launch).capabilities();
    expect(result).toMatchObject({ available: true, renderer: 'Chromium tagged PDF', networkPolicy: 'deny' });
    expect(launch.mock.calls[0][0]).not.toHaveProperty('executablePath');
    expect(launch.mock.calls[0][0].timeout).toBeLessThan(20000);
    expect(close).toHaveBeenCalledOnce();
  });
  it('reports an invalid override as unavailable without launching another executable', async () => {
    const launch = vi.fn();
    const result = await load(renderer, { ALLOFLOW_CHROMIUM_PATH: process.cwd() }, launch).capabilities();
    expect(result.available).toBe(false);
    expect(result.reason).toContain('ALLOFLOW_CHROMIUM_PATH');
    expect(launch).not.toHaveBeenCalled();
  });
});
