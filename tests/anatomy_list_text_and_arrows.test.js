import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 20 (2026-09-02): structure-list descriptions cut mid-word and always used the adult
// text, and the Anatomy Lens cards used an ASCII "->" where the rest of the tool uses U+2192.

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

function render(filePath, state, overrides) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore', ...state },
  }, overrides));
}

function rowText(root) {
  return [...root.querySelectorAll('[data-anatomy-structure-list] .line-clamp-1')].map((n) => n.textContent);
}

beforeEach(() => { resetStemLab(); });

describe('Anatomy structure list text', () => {
  it.each(ANATOMY_PATHS)('ends each row on a sentence or word boundary in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toContain("st.fn.substring(0, 80)");
    expect(source).toContain('clipAtSentence(learnerText(st), 80)');

    const rows = rowText(render(filePath, {}, OLDER));
    expect(rows.length).toBeGreaterThan(5);
    for (const row of rows) {
      // Either a complete clipped phrase or a whole sentence; never a half-typed word.
      expect(row).not.toMatch(/\.\.\.$/);
      // A clipped row breaks after a space, so the ellipsis never splits a word.
      if (row.endsWith('…')) expect(row.slice(0, -1)).toMatch(/\S$/);
    }
    expect(rows.some((r) => r.endsWith('.'))).toBe(true);
  }, 60_000);

  it.each(ANATOMY_PATHS)('uses the wording the learner reads everywhere else in %s', (filePath) => {
    const young = rowText(render(filePath, {}, { gradeLevel: '2' }));
    const older = rowText(render(filePath, {}, OLDER));
    // The skull has an authored K-2 description; the list must use it for a young learner
    // rather than the clinical wording, exactly as the card and flashcards do.
    expect(young[0]).toMatch(/helmet/i);
    expect(young[0]).not.toBe(older[0]);
    expect(older[0]).toMatch(/^Protects the brain\./);
  }, 60_000);
});

describe('Anatomy Lens arrows', () => {
  it.each(ANATOMY_PATHS)('uses the same arrow glyph as the rest of the tool in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toMatch(/->'/);

    const lens = render(filePath, { _showAnatomyLens: true }, OLDER);
    const actions = [...lens.querySelectorAll('.anatomy-lens-action')].map((n) => n.textContent);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]).toBe('Open deep dive →');
    expect(actions.some((a) => a === 'Open specialist atlas →')).toBe(true);
  }, 60_000);
});
