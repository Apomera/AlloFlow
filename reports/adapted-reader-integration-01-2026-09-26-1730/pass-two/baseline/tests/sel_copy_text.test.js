// SEL Hub · every copy button goes through window.SelHub.copyText, which never throws.
//
// Twelve SEL tools called navigator.clipboard.writeText directly. Gemini Canvas blocks that API by
// permissions policy, so every one of those buttons failed on every click there; on a page with
// no clipboard object the click threw (the Crew AI-off sweep caught Strengths Finder doing exactly
// that once week 12 linked it). The hub now owns one helper: the shell's alloCopyText first (it has
// the execCommand fallback Canvas needs), then the Clipboard API, then execCommand; it resolves
// true or false and never throws, and the tools say "Copy is not available here" on false.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');

describe('SEL Hub · no tool calls the clipboard directly', () => {
  const tools = readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f));
  it.each(tools)('%s', (f) => {
    const src = readFileSync(join(SEL, f), 'utf8');
    expect(src).not.toMatch(/navigator\.clipboard/);
  });
  it('twelve tools route through the helper and tell the student when it fails', () => {
    const users = tools.filter((f) => /window\.SelHub\.copyText\(/.test(readFileSync(join(SEL, f), 'utf8')));
    expect(users.length).toBe(12);
    for (const f of users) expect(readFileSync(join(SEL, f), 'utf8'), f).toMatch(/COPY_UNAVAILABLE|fallbackCopy/);
  });
});

describe('SEL Hub · window.SelHub.copyText', () => {
  let saved;
  beforeAll(() => {
    window.AlloModules = window.AlloModules || {};
    const req = createRequire(import.meta.url);
    new Function('require', readFileSync(resolve(SEL, 'sel_hub_module.js'), 'utf8'))(req);
    saved = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  });
  afterEach(() => {
    delete window.alloCopyText;
    if (saved) Object.defineProperty(navigator, 'clipboard', saved); else delete navigator.clipboard;
    document.execCommand = undefined;
  });

  it('exists, with the message tools show on failure', () => {
    expect(typeof window.SelHub.copyText).toBe('function');
    expect(window.SelHub.COPY_UNAVAILABLE).toMatch(/Ctrl\+C/);
  });

  it('prefers the shell helper when the app publishes one', async () => {
    const calls = [];
    window.alloCopyText = async (t) => { calls.push(t); return true; };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('should not be used'); } } });
    expect(await window.SelHub.copyText('hello')).toBe(true);
    expect(calls).toEqual(['hello']);
  });

  it('uses the Clipboard API when there is no shell helper', async () => {
    const calls = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { calls.push(t); } } });
    expect(await window.SelHub.copyText('abc')).toBe(true);
    expect(calls).toEqual(['abc']);
  });

  it('falls back to execCommand when the API rejects (the Canvas case), and reports what execCommand said', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('blocked', 'NotAllowedError'); } } });
    document.execCommand = () => true;
    expect(await window.SelHub.copyText('x')).toBe(true);
    document.execCommand = () => false;
    expect(await window.SelHub.copyText('x')).toBe(false);
  });

  it('resolves false, and never throws, when there is no clipboard at all', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    document.execCommand = undefined;
    let threw = false; let result;
    try { result = await window.SelHub.copyText('x'); } catch { threw = true; }
    expect(threw).toBe(false);
    expect(result).toBe(false);
    expect(document.querySelectorAll('textarea').length).toBe(0);
  });
});
