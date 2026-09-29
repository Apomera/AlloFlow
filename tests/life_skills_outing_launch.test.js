import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const source = readFileSync('stem_lab/stem_tool_lifeskills.js', 'utf8');
const launch = source.slice(source.indexOf('function openLifeSkillsOuting()'), source.indexOf('function openLifeSkillsSafety3D()'));
const cleanup = source.slice(source.indexOf('function closeOutingBridge()'), source.indexOf('// ── Reduced motion CSS'));
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

function harness({ blocked = false, loadFailure = false, runtimeFailure = false, provider = true } = {}) {
  const popup = { closed: false, document: { body: {} }, location: { replace: vi.fn() }, focus: vi.fn() };
  const call = vi.fn(async () => '{"text":"A new outing is ahead."}');
  const runtime = { createHost: vi.fn(() => { if (runtimeFailure) throw Error('unavailable'); return { destroy: vi.fn() }; }) };
  const load = vi.fn(() => loadFailure ? Promise.reject(Error('offline')) : Promise.resolve(runtime));
  const win = { location: { hostname: 'localhost', origin: 'http://localhost:3000', protocol: 'http:' }, crypto: webcrypto, open: vi.fn(() => blocked ? null : popup) };
  const upd = vi.fn(), announce = vi.fn(), interval = vi.fn(() => 91), clear = vi.fn();
  const fn = new Function('window', 'loadOutingRuntime', 'callGemini', 'upd', 'announceToSR', 'setInterval', 'clearInterval', cleanup + launch + '; return openLifeSkillsOuting;');
  return { open: fn(win, load, provider ? call : null, upd, announce, interval, clear), win, popup, call, runtime, load, upd, announce, interval, clear };
}

describe('Practice Mode host launch', () => {
  it('opens synchronously, binds the exact popup and origin, then navigates with a random token', async () => {
    const h = harness(); h.open();
    expect(h.win.open).toHaveBeenCalledWith('about:blank', 'alloflow-life-outing', 'width=1280,height=860');
    await tick();
    const url = new URL(h.popup.location.replace.mock.calls[0][0]);
    const host = h.runtime.createHost.mock.calls[0][0];
    expect(url.pathname).toBe('/life_skills_outing/life_skills_outing.html');
    expect(url.searchParams.get('parentOrigin')).toBe(h.win.location.origin);
    expect(url.searchParams.get('bridgeToken')).toMatch(/^[0-9a-f]{48}$/);
    expect(host.source).toBe(h.popup);
    expect(host.origin).toBe(url.origin);
    expect(host.token).toBe(url.searchParams.get('bridgeToken'));
    const controller = new AbortController();
    await host.call('fictional facts', { signal: controller.signal });
    expect(h.call).toHaveBeenCalledWith('fictional facts', true, false, null, null, controller.signal);
  });

  it.each([{ loadFailure: true }, { runtimeFailure: true }, { provider: false }])('keeps the authored mission reachable when story services fail: %j', async options => {
    const h = harness(options); h.open(); await tick();
    expect(h.popup.location.replace).toHaveBeenCalledOnce();
    if (options.provider === false) expect(h.runtime.createHost.mock.calls[0][0].call).toBeNull();
    expect(h.call).not.toHaveBeenCalled();
  });

  it('reports a blocked popup without attempting a provider connection', async () => {
    const h = harness({ blocked: true }); h.open(); await tick();
    expect(h.load).not.toHaveBeenCalled();
    expect(h.runtime.createHost).not.toHaveBeenCalled();
    expect(h.announce).toHaveBeenCalledWith(expect.stringContaining('Allow pop-ups'));
  });

  it('releases the old bridge when reopening and when the companion closes', async () => {
    const h = harness(); h.open(); await tick();
    const first = h.win.__alloflowOutingSession.host;
    h.open(); await tick();
    expect(first.destroy).toHaveBeenCalledOnce();
    expect(h.clear).toHaveBeenCalledWith(91);
    const second = h.win.__alloflowOutingSession.host;
    h.popup.closed = true;
    h.interval.mock.calls.at(-1)[0]();
    expect(second.destroy).toHaveBeenCalledOnce();
    expect(h.win.__alloflowOutingSession).toBeNull();
  });

  it('does not attach a late-loaded bridge to an obsolete launch', async () => {
    const h = harness(); let resolve;
    h.load.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    h.open(); h.open(); await tick();
    resolve(h.runtime); await tick();
    expect(h.runtime.createHost).toHaveBeenCalledOnce();
    expect(h.popup.location.replace).toHaveBeenCalledOnce();
  });
});
