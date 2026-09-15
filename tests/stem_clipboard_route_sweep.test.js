// @vitest-environment jsdom
//
// STEM Lab: every copy button reaches the clipboard through window.StemLab.writeClipboard.
//
// Gemini Canvas refuses navigator.clipboard by permissions policy, so a tool that calls it directly fails on
// every click there while passing every test on a normal origin (memory: educator evaluation's "Copy Code.gs",
// 2026-09-01). 48 STEM tools called it directly; eight already went through the shell's alloCopyText first and
// keep their own route (Brain Atlas has no direct call at all), App Lab only quotes the call in a tutorial string, and the other 38 (60 buttons) now
// call the host helper, which keeps writeText's contract (resolves on success, rejects once every path has
// failed) so each tool's then / catch / await handlers mean what they always meant. Order inside the helper:
// alloCopyText (it carries the execCommand fallback Canvas needs), then the Clipboard API, then execCommand.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const DIRS = ['stem_lab', 'desktop/web-app/public/stem_lab'];
const HELPER_CALL = 'window.StemLab.writeClipboard || function (value) { return navigator.clipboard.writeText(value); })(';
const RAW = /(window\.)?navigator\.clipboard\.writeText\(/g;
const RAW_ONE = /(window\.)?navigator\.clipboard\.writeText\(/; // .test() on a /g regex is stateful
const OWN_ROUTE = /typeof window\.alloCopyText === 'function'/;
// App Lab teaches the Clipboard API; its one hit is sample code inside a template literal.
const SAMPLE = { 'stem_tool_applab.js': "await navigator.clipboard.writeText('Hello!');" };

function count(source, needle) { return source.split(needle).length - 1; }

describe('STEM Lab clipboard route (sweep)', () => {
  const tools = readdirSync(resolve(ROOT, 'stem_lab')).filter((name) => /^stem_tool_.*\.js$/.test(name));

  it('no tool calls navigator.clipboard.writeText except through the helper, its own alloCopyText route, or App Lab\'s sample', { timeout: 60000 }, () => {
    const leaking = [];
    let routed = 0;
    for (const dir of DIRS) {
      for (const name of tools) {
        const source = readFileSync(resolve(ROOT, dir, name), 'utf8');
        const raw = (source.match(RAW) || []).length;
        if (!raw) continue;
        if (SAMPLE[name]) {
          if (count(source, SAMPLE[name]) !== raw) leaking.push(dir + '/' + name + ' (a real call beside the sample)');
          continue;
        }
        if (OWN_ROUTE.test(source)) continue;
        const viaHelper = count(source, HELPER_CALL);
        if (viaHelper !== raw) leaking.push(dir + '/' + name + ' (' + (raw - viaHelper) + ' direct)');
        else if (dir === 'stem_lab') routed += 1;
      }
    }
    expect(leaking, 'replace navigator.clipboard.writeText( with (' + HELPER_CALL).toEqual([]);
    expect(routed, 'tools routed through the helper').toBeGreaterThanOrEqual(38);
  });

  it('the eight tools with their own route still try alloCopyText before the Clipboard API', { timeout: 60000 }, () => {
    const own = tools.filter((name) => OWN_ROUTE.test(readFileSync(resolve(ROOT, 'stem_lab', name), 'utf8')) && RAW_ONE.test(readFileSync(resolve(ROOT, 'stem_lab', name), 'utf8')));
    expect(own.length).toBeGreaterThanOrEqual(8);
    for (const name of own) {
      const source = readFileSync(resolve(ROOT, 'stem_lab', name), 'utf8');
      expect(source.indexOf("typeof window.alloCopyText === 'function'"), name).toBeLessThan(source.search(RAW_ONE));
    }
  });

  it('the host helper keeps writeText\'s contract, in all three host-module copies', () => {
    for (const hostPath of ['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js']) {
      const host = readFileSync(resolve(ROOT, hostPath), 'utf8');
      const at = host.indexOf('writeClipboard: function (text) {');
      expect(at, hostPath + ' exposes writeClipboard').toBeGreaterThan(-1);
      const body = host.slice(at, at + 2400);
      expect(body).toContain("typeof window.alloCopyText === 'function'");
      expect(body).toContain("document.execCommand('copy')");
      expect(body).toContain('Promise.reject(new Error(');
      expect(body).toContain('focused.focus()');
    }
  });
});

describe('window.StemLab.writeClipboard', () => {
  const MODULE = readFileSync(resolve(ROOT, 'stem_lab/stem_lab_module.js'), 'utf8');
  const REACT = readFileSync(resolve(ROOT, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');
  let saved;
  beforeAll(() => {
    delete window.StemLab;
    window.AlloModules = {};
    window.__alloT = (k, fb) => fb || k;
    new Function(REACT)();
    window.React = window.React || globalThis.React;
    new Function(MODULE)();
    saved = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  });
  afterEach(() => {
    delete window.alloCopyText;
    if (saved) Object.defineProperty(navigator, 'clipboard', saved); else delete navigator.clipboard;
    document.execCommand = undefined;
    document.body.innerHTML = '';
  });
  const setClipboard = (value) => Object.defineProperty(navigator, 'clipboard', { configurable: true, value });

  it('exists on the host', () => {
    expect(typeof window.StemLab.writeClipboard).toBe('function');
  });

  it('prefers the shell helper and resolves on its true', async () => {
    const calls = [];
    window.alloCopyText = async (text) => { calls.push(text); return true; };
    setClipboard({ writeText: async () => { throw new Error('should not be used'); } });
    await expect(window.StemLab.writeClipboard('hello')).resolves.toBeUndefined();
    expect(calls).toEqual(['hello']);
  });

  it('rejects when the shell helper says false, so a tool\'s catch handler runs', async () => {
    window.alloCopyText = async () => false;
    await expect(window.StemLab.writeClipboard('x')).rejects.toThrow(/Ctrl\+C/);
  });

  it('uses the Clipboard API when there is no shell helper', async () => {
    const calls = [];
    setClipboard({ writeText: async (text) => { calls.push(text); } });
    await expect(window.StemLab.writeClipboard(42)).resolves.toBeUndefined();
    expect(calls).toEqual(['42']);
  });

  it('falls back to execCommand when the API rejects (the Canvas case), removes its textarea and hands focus back', async () => {
    setClipboard({ writeText: async () => { throw new DOMException('blocked', 'NotAllowedError'); } });
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    let copied = null;
    document.execCommand = (name) => { copied = document.activeElement && document.activeElement.value; return name === 'copy'; };
    await expect(window.StemLab.writeClipboard('from the lab')).resolves.toBeUndefined();
    expect(copied).toBe('from the lab');
    expect(document.querySelectorAll('textarea').length).toBe(0);
    expect(document.activeElement).toBe(button);
    document.execCommand = () => false;
    await expect(window.StemLab.writeClipboard('x')).rejects.toThrow(/Copy is not available here/);
    expect(document.querySelectorAll('textarea').length).toBe(0);
  });

  it('rejects, without throwing synchronously, when there is no clipboard at all', async () => {
    setClipboard(undefined);
    document.execCommand = undefined;
    let promise;
    expect(() => { promise = window.StemLab.writeClipboard('x'); }).not.toThrow();
    await expect(promise).rejects.toThrow();
    expect(document.querySelectorAll('textarea').length).toBe(0);
  });
});
