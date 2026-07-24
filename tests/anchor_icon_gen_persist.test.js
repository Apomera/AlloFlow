// REGRESSION GUARD (2026-06-30): anchor-chart generated icons silently never persisted.
//
// Root cause was in the monolith: anchor charts save their sections (including the iconUrls they
// generate with callImagen) through the SHARED `handleNoteUpdate`, which was hard-gated to
// `prev.type === 'note-taking'` — so every anchor write hit `return prev` and was dropped. The slot
// kept showing the prompt text ("car key", "open eye") because the image was generated and then
// thrown away on the way to state. Secondary bug: the auto-gen fired one callImagen per section in
// parallel and each wrote a stale snapshot, so even once persistence worked, the last to resolve
// clobbered the others — only one icon would ever show.
//
// This renders AnchorChartView with a real React renderer + a stand-in handleNoteUpdate that mirrors
// the FIXED monolith (anchor-chart allowed + functional updater), and asserts that BOTH sections end
// up with their OWN generated icon. It fails on either regression (drop, or single-icon clobber).
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, AnchorChartView;

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  loadAlloModule('anchor_charts_module.js');
  AnchorChartView = window.AlloModules && window.AlloModules.AnchorChartView;
  if (!AnchorChartView) throw new Error('AnchorChartView not registered on window.AlloModules');
});

const SECTIONS = [
  { id: 's1', label: 'Start the engine', iconPrompt: 'car key', bullets: ['Body rests'] },
  { id: 's2', label: 'Enter REM sleep', iconPrompt: 'open eye', bullets: ['Eyes move'] },
];

describe('AnchorChartView — generated icons persist for every section', () => {
  it('auto-generates an icon per section and stores all of them (no type-gate drop, no race clobber)', async () => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    // distinct data URL per prompt so we can prove each section got ITS own icon
    const callImagen = vi.fn((prompt) => Promise.resolve('data:image/png;base64,' + Buffer.from(String(prompt).slice(0, 10)).toString('base64')));
    let latest = null;
    function Harness() {
      const [gc, setGc] = React.useState({ type: 'anchor-chart', id: 'ac1', data: { title: 'Sleep', chartType: 'process', sections: SECTIONS } });
      latest = gc;
      // mirror the FIXED monolith handleNoteUpdate: anchor-chart allowed + functional value support
      const handleNoteUpdate = React.useCallback((key, value) => {
        setGc(prev => {
          if (!prev || (prev.type !== 'note-taking' && prev.type !== 'anchor-chart')) return prev;
          const nextVal = typeof value === 'function' ? value(prev.data ? prev.data[key] : undefined) : value;
          return { ...prev, data: { ...prev.data, [key]: nextVal } };
        });
      }, []);
      return React.createElement(AnchorChartView, {
        t: (k, d) => d || k, generatedContent: gc, isTeacherMode: true,
        handleNoteUpdate, callImagen, callGeminiImageEdit: null,
        callGemini: null, addToast: () => {}, addXp: () => {},
      });
    }
    await act(async () => { root.render(React.createElement(Harness)); });
    // drain the parallel callImagen promise chains (gen -> handleNoteUpdate -> re-render)
    for (let i = 0; i < 6; i++) { await act(async () => { await Promise.resolve(); }); }

    expect(callImagen).toHaveBeenCalledTimes(2);            // one generation per section
    const secs = latest.data.sections;
    expect(secs[0].iconUrl).toMatch(/^data:image\/png/);    // section 0 kept its icon...
    expect(secs[1].iconUrl).toMatch(/^data:image\/png/);    // ...AND section 1 (the race fix)
    expect(secs[0].iconUrl).not.toBe(secs[1].iconUrl);      // each got its OWN icon, correctly targeted

    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  });
});

describe('monolith handleNoteUpdate — the source-side half of the fix', () => {
  it('allows anchor-chart through the type gate and supports a functional updater', () => {
    const mono = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(mono).toMatch(/prev\.type !== 'note-taking' && prev\.type !== 'anchor-chart'/);
    expect(mono).toContain("typeof value === 'function' ? value(prev.data");
  });
});
