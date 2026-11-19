// SEL Hub loads on demand (2026-11-17). SEL tools and the safety layer can then run
// before the hub and create a small placeholder window.SelHub. The hub must install
// over it and keep the tools that registered and the safety layer's functions.
// Before this fix the hub installed only `if (!window.SelHub)`, so it silently
// stayed a bare registry.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const HUB = resolve(process.env.SEL_HUB_CANDIDATE || join(SEL, 'sel_hub_module.js'));
let R = null;
try { R = { React: createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'))('react') }; } catch { R = null; }

const req = createRequire(import.meta.url);
const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
const SAFETY = ['scanForCrisis', 'showCrisisModal', 'safeRehearseCheck', 'renderCrisisResources', 'renderSafetyDisclosure'];

describe.skipIf(!R)('SEL Hub adopts a placeholder created by files that loaded first', () => {
  beforeEach(() => {
    delete window.SelHub;
    globalThis.React = window.React = R.React;
    window.AlloIcons = new Proxy({}, { get: () => () => null });
    window.AlloModules = {};
    if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  });

  it('safety layer and a tool first, then the hub: the real hub keeps both', () => {
    load(join(SEL, 'sel_safety_layer.js'));
    load(join(SEL, 'sel_tool_advocacy.js'));
    const placeholder = window.SelHub;
    expect(placeholder._standardShellTools).toBeUndefined();
    const earlyIds = Object.keys(placeholder._registry);
    expect(earlyIds.length).toBeGreaterThan(0);
    load(HUB);
    expect(window.SelHub._standardShellTools, 'the real hub installed').toBeTruthy();
    expect(typeof window.SelHub.getRegisteredTools).toBe('function');
    for (const name of SAFETY) expect(typeof window.SelHub[name], name).toBe('function');
    for (const id of earlyIds) expect(window.SelHub._registry[id], id).toBeTruthy();
    expect(window.SelHub.getRegisteredTools().map(t => t.id)).toEqual(expect.arrayContaining(earlyIds));
  });

  it('hub first (the old order) still works and is not replaced by later files', () => {
    load(HUB);
    const hub = window.SelHub;
    load(join(SEL, 'sel_safety_layer.js'));
    load(join(SEL, 'sel_tool_advocacy.js'));
    expect(window.SelHub).toBe(hub);
    for (const name of SAFETY) expect(typeof window.SelHub[name], name).toBe('function');
    expect(window.SelHub.getRegisteredTools().length).toBeGreaterThan(0);
  });

  it('loading the hub twice does not reinstall it', () => {
    load(HUB);
    const hub = window.SelHub;
    load(HUB);
    expect(window.SelHub).toBe(hub);
  });
});
