// SEL Hub — what a tool declares when it registers.
//
// Two things went wrong here, both invisible until something else went looking:
//
// 1. `somaticReset` registered with `registerTool(TOOL_ID, ...)` — a variable.
//    Every static tool in the repo reads registrations by parsing that call
//    (the contract check, the registry audit, the icon sweep), so a variable
//    makes the tool invisible to all of them. It was the only structural
//    failure across 216 tools repo-wide.
//
// 2. Four configs carried no `label`. The Station Builder picker resolves a
//    tool's display name as `name || label || id`, so those four showed a
//    student the raw camelCase id — "conflicttheater" rather than
//    "Conflict Theater".

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const toolFiles = readdirSync(resolve(ROOT, 'sel_hub')).filter((f) => /^sel_tool_.*\.js$/.test(f));

describe('SEL Hub · registration is readable by static tooling', () => {
  it.each(toolFiles)('%s registers with a string-literal id', (f) => {
    const src = readFileSync(resolve(ROOT, 'sel_hub', f), 'utf8');
    // The real call is `window.SelHub.registerTool(` — a preceding dot is
    // normal, not a sign of a false match. Skip comment lines instead, since
    // several files describe the call in prose above it.
    const calls = [...src.matchAll(/registerTool\(\s*([^,]+),/g)]
      .filter((m) => {
        const lineStart = src.lastIndexOf('\n', m.index) + 1;
        const line = src.slice(lineStart, src.indexOf('\n', m.index));
        return !/^\s*(\/\/|\*|\/\*)/.test(line);
      });
    expect(calls.length, `${f}: no registerTool call found`).toBeGreaterThan(0);
    const bad = calls
      .map((m) => m[1].trim())
      .filter((arg) => !/^'[^']+'$/.test(arg) && !/^"[^"]+"$/.test(arg));
    expect(
      bad,
      `${f}: registerTool id must be a string literal, not a variable — static tooling parses this call: ${bad.join(', ')}`,
    ).toEqual([]);
  });
});

// ── Runtime: what the picker would actually show ──
let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { JSDOM: req('jsdom').JSDOM, React: req('react') };
} catch { R = null; }

describe.skipIf(!R)('SEL Hub · every tool has a name a student can read', () => {
  let tools = [];

  beforeAll(() => {
    const dom = new R.JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
    const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
    sg('window', dom.window); sg('document', dom.window.document); sg('navigator', dom.window.navigator);
    sg('localStorage', dom.window.localStorage); sg('sessionStorage', dom.window.sessionStorage);
    sg('HTMLElement', dom.window.HTMLElement); sg('CustomEvent', dom.window.CustomEvent);
    const noop = () => {};
    window.React = R.React; sg('React', R.React);
    window.AlloIcons = new Proxy({}, { get: () => () => null });
    window.AlloModules = {};
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
    sg('Audio', function () { return { play: () => Promise.resolve() }; });
    const req = createRequire(import.meta.url);
    const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
    load(resolve(ROOT, 'sel_hub/sel_hub_module.js'));
    readdirSync(resolve(ROOT, 'sel_hub')).filter((f) => /\.js$/.test(f) && f !== 'sel_hub_module.js')
      .forEach((f) => { try { load(resolve(ROOT, 'sel_hub', f)); } catch { /* tool-local load issue */ } });
    tools = window.SelHub.getRegisteredTools();
  });

  it('registers enough tools for the check to mean anything', () => {
    expect(tools.length).toBeGreaterThan(60);
  });

  it('no tool falls through to its raw id in the Station Builder picker', () => {
    // Mirrors the picker's own chain: name || label || id.
    const bare = tools.filter((t) => !(t.name || t.label)).map((t) => t.id);
    expect(
      bare,
      `these would display as a raw camelCase id instead of a title:\n  ${bare.join('\n  ')}`,
    ).toEqual([]);
  });

  it('the three that were bare now carry their hub-card name', () => {
    // conflicttheater is not in this list: it already had a `name`, so it never
    // fell through. These three had neither name nor label.
    const expected = {
      peersupport: 'Peer Support Coach',
      sociallab: 'Social Skills Roleplay',
      voicedetective: 'Voice Detective',
    };
    Object.entries(expected).forEach(([id, label]) => {
      const t = tools.find((x) => x.id === id);
      expect(t, `${id} is not registered`).toBeTruthy();
      expect(t.name || t.label, `${id} should be named "${label}"`).toBe(label);
    });
  });

  it('a tool never declares two different names for itself', () => {
    // `name` wins over `label` in the picker, so a config carrying both with
    // different text has a name that displays and a name that does not.
    const drifted = tools
      .filter((t) => t.name && t.label && t.name !== t.label)
      .map((t) => `${t.id}: name "${t.name}" vs label "${t.label}"`);
    expect(drifted, `configs declaring two different names: ${drifted.join(' | ')}`).toEqual([]);
  });

  it('somaticReset is registered under its literal id', () => {
    // The regression this suite exists for: a variable id made it invisible to
    // every static reader, including the registry audit that counts the catalog.
    expect(tools.some((t) => t.id === 'somaticReset')).toBe(true);
  });
});
