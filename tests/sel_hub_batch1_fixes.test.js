// SEL Hub shell fixes (2026-09-28 audit, batch 1).
//
// - One Escape did two things: it closed an open dialog (For Educators, the
//   clear-data confirm, Share Packet, the save reminder, or a tool's own
//   confirm such as Crisis Companion's) AND closed the tool or the whole hub.
//   The hub's Escape now stands down when a dialog handled the key.
// - Alt+Backspace / Alt+B ("back to the tool grid") fired while typing
//   (Option+Backspace deletes a word on macOS, so a journal entry closed the
//   tool) and Option+B never matched (it types a symbol on macOS).
// - The 20-minute save reminder popped up while a student was working in an
//   activity and sent focus to "For Educators" when dismissed. It waits until
//   the student is back on the tool grid and returns focus to where they were.
// SEL_HUB_MODULE_PATH points the suite at a copy of sel_hub_module.js for mutation runs.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const HUB = process.env.SEL_HUB_MODULE_PATH ? resolve(process.env.SEL_HUB_MODULE_PATH) : resolve(SEL, 'sel_hub_module.js');
const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
const React = req('react');
const RDC = req('react-dom/client');
const { act } = req('react-dom/test-utils');
const nodeRequire = createRequire(import.meta.url);
const load = (f) => new Function('require', readFileSync(f, 'utf8'))(nodeRequire);

beforeAll(() => {
  const noop = () => {};
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  globalThis.Audio = function () { return { play: () => Promise.resolve() }; };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof window.Element.prototype.scrollIntoView !== 'function') window.Element.prototype.scrollIntoView = noop;
  load(HUB);
  for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) if (existsSync(join(SEL, f))) { try { load(join(SEL, f)); } catch { /* optional */ } }
  window.__alloEnsureSelPluginLoaded = () => true;
  window.__alloGetSelPluginState = () => null;
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
});
let mounted = null;
afterEach(() => { if (mounted) mounted.unmount(); mounted = null; vi.useRealTimers(); sessionStorage.clear(); document.body.querySelectorAll('[data-test-outside]').forEach((n) => n.remove()); });

function mountHub({ tool = null } = {}) {
  const Icon = () => null;
  const setShowSelHub = vi.fn();
  const setSelHubTool = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  act(() => {
    root.render(React.createElement(window.AlloModules.SelHub, {
      showSelHub: true, setShowSelHub, selHubTab: 'explore', setSelHubTab: () => {},
      selHubTool: tool, setSelHubTool, addToast: () => {}, gradeLevel: '7th Grade',
      callGemini: null, onSafetyFlag: () => {}, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: () => {},
    }));
  });
  mounted = { container, setShowSelHub, setSelHubTool, unmount: () => { act(() => root.unmount()); container.remove(); } };
  return mounted;
}
const key = (target, init) => act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })); });
const flush = (ms = 80) => act(() => new Promise((r) => setTimeout(r, ms)));

describe('Escape', () => {
  it('closes For Educators and nothing else', async () => {
    sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1');
    const h = mountHub();
    await flush();
    act(() => { h.container.querySelector('[data-sel-focus="educators"]').click(); });
    expect(document.getElementById('sel-for-educators-modal')).not.toBeNull();
    key(document.body, { key: 'Escape' });
    expect(document.getElementById('sel-for-educators-modal')).toBeNull();
    expect(h.setShowSelHub).not.toHaveBeenCalled();
  });

  it('with no dialog open still closes the hub from the tool grid', async () => {
    sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1');
    const h = mountHub();
    await flush();
    key(document.body, { key: 'Escape' });
    expect(h.setShowSelHub).toHaveBeenCalledWith(false);
  });

  it("leaves the tool open when a tool's own dialog handled it", async () => {
    sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1');
    const h = mountHub({ tool: 'journal' });
    await flush();
    const toolDialog = document.createElement('div');
    toolDialog.addEventListener('keydown', (e) => { if (e.key === 'Escape') e.preventDefault(); });
    h.container.appendChild(toolDialog);
    key(toolDialog, { key: 'Escape' });
    expect(h.setSelHubTool).not.toHaveBeenCalled();
    key(document.body, { key: 'Escape' });
    expect(h.setSelHubTool).toHaveBeenCalledWith(null);
  });
});

describe('back-to-grid shortcut', () => {
  it('does not fire while typing, and matches the B key by its code', async () => {
    sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1');
    const h = mountHub({ tool: 'journal' });
    await flush();
    const box = document.createElement('textarea'); box.setAttribute('data-test-outside', '1');
    document.body.appendChild(box);
    box.focus();
    key(box, { key: 'Backspace', altKey: true });
    key(box, { key: '∫', code: 'KeyB', altKey: true });
    expect(h.setSelHubTool).not.toHaveBeenCalled();
    box.blur();
    key(document.body, { key: '∫', code: 'KeyB', altKey: true });
    expect(h.setSelHubTool).toHaveBeenCalledWith(null);
  });
});

describe('20-minute save reminder', () => {
  const ready = (h) => { sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1'); return h; };
  it('does not interrupt a student inside an activity', () => {
    vi.useFakeTimers();
    ready();
    mountHub({ tool: 'journal' });
    act(() => { vi.advanceTimersByTime(30000); window.dispatchEvent(new Event('pointerdown')); vi.advanceTimersByTime(31000); });
    expect(document.getElementById('sel-ephemeral-explainer-modal')).toBeNull();
  });

  it('on the tool grid it appears, and "Got it" puts focus back where the student was', () => {
    vi.useFakeTimers();
    ready();
    const h = mountHub();
    act(() => { vi.advanceTimersByTime(200); });
    const search = h.container.querySelector('input');
    act(() => { search.focus(); vi.advanceTimersByTime(30000); window.dispatchEvent(new Event('pointerdown')); vi.advanceTimersByTime(31000); });
    const modal = document.getElementById('sel-ephemeral-explainer-modal');
    expect(modal).not.toBeNull();
    act(() => { vi.advanceTimersByTime(100); }); // the reminder focuses its own button as it opens
    expect(document.activeElement).toBe(modal.querySelector('[data-primary-action]'));
    act(() => { modal.querySelector('[data-primary-action]').click(); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(document.getElementById('sel-ephemeral-explainer-modal')).toBeNull();
    expect(document.activeElement).toBe(search);
  });
});
