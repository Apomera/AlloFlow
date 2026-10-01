// Symbol Studio printing and layout (2026-09-28).
// Every print button called window.print() on the app (or on a hidden iframe), which Gemini Canvas
// IGNORES: the app runs in a sandboxed iframe without allow-modals, so Chrome logs "Ignored call
// to 'print()'" and the teacher sees nothing happen. Reproduced in Chromium with a sandboxed
// iframe. Printing now goes through a window of its own; a blocked pop-up says so.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
const image = 'data:image/png;base64,AA==';
const saved = { id: 'saved', title: 'Quiet break', situation: 'Taking a break', studentName: 'A', details: '', pages: [
  { id: 'p1', text: 'I can ask for a break <quietly> & calmly.', image, imagePrompt: 'a quiet corner' },
  { id: 'p2', text: 'I can return when ready.', image: 'javascript:alert(1)', imagePrompt: 'friends' },
] };
const source = readFileSync(resolve(process.cwd(), process.env.ALLO_SYMBOL_STUDIO_CANDIDATE || 'symbol_studio_module.js'), 'utf8');
let Studio, root, host, toasts;
beforeAll(() => { Studio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; }, 60000);
afterEach(async () => { if (root) await settle(() => root.unmount()); root = null; host?.remove(); host = null; localStorage.clear(); vi.restoreAllMocks(); });
async function settle(fn = () => {}) { await act(async () => { fn(); for (let i = 0; i < 40; i++) await Promise.resolve(); }); }
function control(label) { const found = [...host.querySelectorAll('[aria-label]')].find((el) => el.getAttribute('aria-label') === label); expect(found, label).toBeTruthy(); return found; }
function type(label, value) { const el = control(label); act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function mount(tab, withStory) {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'a', name: 'Learner A' }]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('a'));
  if (withStory) localStorage.setItem('alloSavedStories__a', JSON.stringify([saved]));
  toasts = [];
  const props = baseProps({ initialTab: tab, addToast: (m, k) => toasts.push({ m, k }), draftStorage: { read: async () => null, write: async () => {}, remove: async () => {} }, onCallImagen: null, onCallGeminiImageEdit: null });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await settle(() => root.render(React.createElement(Studio, props)));
  if (withStory) await settle(() => control('Open saved story: Quiet break').click());
}
function fakeWindow() {
  let written = '';
  const doc = { open: vi.fn(), write: vi.fn((s) => { written += s; }), close: vi.fn(), images: [] };
  return { win: { document: doc, focus: vi.fn(), print: vi.fn() }, html: () => written };
}

describe('Social Stories: Print Story', () => {
  it('prints the story from its own window instead of window.print() on the sandboxed app', async () => {
    await mount('stories', true);
    const fake = fakeWindow();
    const open = vi.spyOn(window, 'open').mockReturnValue(fake.win);
    const appPrint = vi.spyOn(window, 'print').mockImplementation(() => {});
    await settle(() => control('Print Story').click());
    expect(open).toHaveBeenCalledTimes(1);
    expect(appPrint).not.toHaveBeenCalled();
    expect(fake.win.print).toHaveBeenCalledTimes(1);
    const html = fake.html();
    // Every page, in order, one section each, with its own page break on paper.
    expect((html.match(/<section class="page/g) || []).length).toBe(2);
    expect(html).toContain('<title>Social Story</title>');
    expect(html).toContain('@media print{.print-bar{display:none}');
    // Story text is escaped, and only a safe image scheme reaches the document.
    expect(html).toContain('I can ask for a break &lt;quietly&gt; &amp; calmly.');
    expect(html).not.toContain('<quietly>');
    expect(html).toContain('<img src="' + image + '"');
    expect(html).not.toContain('javascript:');
    // The window says what to do if its own print() is refused too.
    expect(html).toContain('press Ctrl+P');
    expect(toasts).toEqual([]);
  });

  it('sits with the story it prints, not at the foot of the input column', async () => {
    await mount('stories', true);
    const button = control('Print Story');
    expect(button.closest('.ss-story-viewer')).toBeTruthy();
    expect(button.closest('.ss-story-editor')).toBe(null);
  });

  it('says printing is blocked, instead of doing nothing, when no window opens and print() is refused', async () => {
    await mount('stories', true);
    vi.spyOn(window, 'open').mockReturnValue(null);
    // A sandboxed document's print() returns without firing beforeprint.
    vi.spyOn(window, 'print').mockImplementation(() => {});
    await settle(() => control('Print Story').click());
    expect(toasts).toHaveLength(1);
    expect(toasts[0].k).toBe('error');
    expect(toasts[0].m).toContain('Allow pop-ups');
  });

  it('stays quiet when the in-place print fallback really prints', async () => {
    await mount('stories', true);
    vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(window, 'print').mockImplementation(() => { window.dispatchEvent(new Event('beforeprint')); });
    await settle(() => control('Print Story').click());
    expect(toasts).toEqual([]);
  });
});

describe('the other print buttons print from their own window too', () => {
  it('Quick Boards prints what is on screen, without the on-screen editing controls', async () => {
    await mount('quickboards', false);
    type('First activity', 'homework & math');
    const fake = fakeWindow();
    vi.spyOn(window, 'open').mockReturnValue(fake.win);
    const appPrint = vi.spyOn(window, 'print').mockImplementation(() => {});
    await settle(() => control('Print board').click());
    expect(appPrint).not.toHaveBeenCalled();
    expect(fake.win.print).toHaveBeenCalledTimes(1);
    const html = fake.html();
    expect(html).toContain('<title>Quick Board</title>');
    expect(html).toContain('id="ss-pq"');
    expect(html).toContain('FIRST');
    expect(html).toContain('homework &amp; math');
    // The label box and its generate/upload buttons are .ss-no-print: not on paper.
    expect(html).not.toContain('aria-label="First activity"');
    expect(html).not.toContain('Generate image for first activity');
  });

  it('no app-level print call is left anywhere in the module', () => {
    // Only the print window's own button and the deliberate in-place fallback may call it.
    const calls = source.match(/window\.print\(\)/g) || [];
    expect(calls.length).toBe(4); // two comments, the window's onclick, the fallback
    expect(source).toContain('onclick="window.print()"');
    expect(source).toContain('try { window.print(); } catch (_) {}');
    expect(source).not.toMatch(/onClick: function \(\) \{ window\.print\(\); \}/);
    expect(source).not.toContain('contentWindow.print()');
    // Board, sequence and quick board route through printRegion; the pack through openPrintWindow.
    expect(source).toContain("printRegion('ss-pb'");
    expect(source).toContain("printRegion('ss-ps'");
    expect(source).toContain("printRegion('ss-pq'");
    expect(source).toMatch(/openPrintWindow\(\{ title: book\.title \|\| 'Visual Pack', css: css, body: body \}\)/);
  });
});

describe('layout: settings column and tab bar', () => {
  it('collapses Profile & settings by default and remembers the teacher’s choice', async () => {
    await mount('symbols', false);
    const toggle = host.querySelector('.ss-setup-toggle');
    const settings = host.querySelector('#ss-profile-settings');
    expect(settings.getAttribute('data-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await settle(() => toggle.click());
    expect(settings.getAttribute('data-expanded')).toBe('true');
    expect(JSON.parse(localStorage.getItem('alloSymbolStudioSetupOpen'))).toBe(true);
    // A fresh mount opens the way the teacher left it.
    await settle(() => root.unmount()); root = createRoot(host);
    await settle(() => root.render(React.createElement(Studio, baseProps({ initialTab: 'symbols', draftStorage: { read: async () => null, write: async () => {}, remove: async () => {} } }))));
    expect(host.querySelector('#ss-profile-settings').getAttribute('data-expanded')).toBe('true');
  });

  it('marks tab-bar edges that have more tabs past them', async () => {
    await mount('garden', false);
    const tabs = host.querySelector('.ss-tabs');
    expect(tabs.getAttribute('data-more-left')).not.toBe(null);
    expect(tabs.getAttribute('data-more-right')).not.toBe(null);
    // jsdom has no layout, so pin the rules that turn the markers into a visible fade.
    expect(source).toContain('.ss-tabs[data-more-right=true]{-webkit-mask-image:');
    expect(source).toContain('.ss-tabs[data-more-left=true]{-webkit-mask-image:');
  });

  it('lets every tab area scroll on desktop and keeps a floor under the result areas', () => {
    expect(source).toContain('.ss-draft-editor>*{overflow-y:auto!important}');
    expect(source).toContain('.ss-draft-editor #ss-pb,.ss-draft-editor #ss-ps,.ss-draft-editor #ss-pq{min-height:min(260px,55vh)}');
    expect(source).toContain('.ss-settings[data-expanded=false]{display:none!important}');
  });
});
