import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 30 (2026-09-03): the Homeostasis sliders name themselves once and report the value via
// aria-valuetext. The Imaging and Procedure sliders instead built the live number into the
// <label>, so the control's name changed on every drag and the value was announced twice.

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const OLDER = { gradeLevel: '9' };

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function render(filePath, state) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: { system: 'organs', view: 'anterior', complexity: 3, _startHereDismissed: true, ...state },
  }, OLDER));
}

// The accessible name of a label excludes aria-hidden descendants.
function labelName(root, id) {
  const label = root.querySelector(`label[for="${id}"]`);
  if (!label) return null;
  const clone = label.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

beforeEach(() => { resetStemLab(); });

describe('Anatomy slider labels', () => {
  it.each(ANATOMY_PATHS)('keeps the imaging slider names steady while the value moves in %s', (filePath) => {
    const low = render(filePath, { _activeTab: 'imaging', imaging: { windowWidth: 400, windowLevel: 40 } });
    const high = render(filePath, { _activeTab: 'imaging', imaging: { windowWidth: 1500, windowLevel: -600 } });

    for (const id of ['imaging-window-width', 'imaging-window-level']) {
      expect(labelName(low, id), id).toBe(labelName(high, id));
      expect(labelName(low, id), id).not.toMatch(/\d/);
    }
    expect(labelName(low, 'imaging-window-width')).toBe('Window width');
    expect(labelName(low, 'imaging-window-level')).toBe('Window level');

    // The number stays on screen in the same place, just outside the label.
    expect(high.textContent).toContain('Window width 1500');
    expect(high.textContent).toContain('Window level -600');
  }, 60_000);

  it.each(ANATOMY_PATHS)('tells the reader what a slice number counts in %s', (filePath) => {
    const root = render(filePath, { _activeTab: 'imaging', imaging: { slice: 72 } });
    const slice = root.querySelector('#anatomy-imaging-slice');
    expect(slice.getAttribute('aria-valuetext')).toBe('Slice 72 of 100');
    // A stable name, set explicitly rather than borrowed from the changing caption.
    expect(slice.getAttribute('aria-label')).toBe('Imaging slice position');

    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toContain("htmlFor: 'anatomy-imaging-slice', className: 'text-xs font-black text-slate-700' }, 'Slice '");
  }, 60_000);

  it.each(ANATOMY_PATHS)('keeps the homeostasis sliders as the pattern to follow in %s', (filePath) => {
    const root = render(filePath, { _activeTab: 'homeoHunt' });
    for (const [id, name] of [['hh-tempC', 'Body temp (°C)'], ['hh-pH', 'Blood pH'], ['hh-glucose', 'Fasting glucose (mg/dL)']]) {
      const el = root.querySelector('#' + id);
      expect(el, id).not.toBeNull();
      // Name first, then the value with its unit, so the reader hears both on every change.
      expect(el.getAttribute('aria-valuetext').startsWith(name + ': '), id).toBe(true);
      expect(el.getAttribute('aria-valuetext'), id).toMatch(/: -?\d/);
    }
  }, 60_000);
});
