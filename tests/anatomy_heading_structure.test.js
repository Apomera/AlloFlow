import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 25 (2026-09-03): the tool exposed only 4-5 headings outside Imaging, so screen-reader
// users navigating by heading could not reach the diagram, which fills half the screen, or the
// Clinical Cases section. Both are headings now, styled to render exactly as before.

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
    anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore', ...state },
  }, OLDER));
}

const levels = (root) => [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((n) => Number(n.tagName[1]));

beforeEach(() => { resetStemLab(); });

describe('Anatomy heading structure', () => {
  it.each(ANATOMY_PATHS)('gives the diagram and the case section a heading in %s', (filePath) => {
    const root = render(filePath, { selectedStructure: 'femur' });
    const diagram = root.querySelector('.anatomy-body-title-heading');
    expect(diagram).not.toBeNull();
    expect(diagram.tagName).toBe('H4');
    expect(diagram.textContent).toMatch(/Skeletal/);

    const cases = [...root.querySelectorAll('h3')].find((n) => /Clinical Cases/.test(n.textContent));
    expect(cases).not.toBeNull();
    // Zero margin keeps it laid out exactly like the paragraph it replaced.
    expect(cases.getAttribute('style')).toMatch(/margin:\s*0/);
  }, 60_000);

  it.each(ANATOMY_PATHS)('keeps the diagram heading visually identical to the old strong in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // font:inherit reproduces the inherited size; the media rule still applies 14px.
    expect(source).toContain('.anatomy-body-title-heading{margin:0;font:inherit;font-weight:700;}');
    expect(source).toContain('.anatomy-body-header strong,.anatomy-body-header .anatomy-body-title-heading{font-size:14px;');
    expect(source).toContain("h('h4', { className: 'anatomy-body-title-heading' }, sys.icon + ' ' + sys.name)");
    // Two inline value labels still read "Belongs to: <system>" and "1 - Body system: <system>".
    // Those are not section titles and must stay as <strong>.
    expect(source.match(/h\('strong', null, sys\.icon/g)).toHaveLength(2);
  });

  it.each(ANATOMY_PATHS)('never skips a heading level going down in %s', (filePath) => {
    for (const tab of ['explore', 'quiz', 'flashcards', 'tour', 'spotter', 'imaging']) {
      const root = render(filePath, { _activeTab: tab, quizMode: tab === 'quiz', system: tab === 'imaging' ? 'organs' : 'skeletal' });
      const seen = levels(root);
      expect(seen.length, tab).toBeGreaterThanOrEqual(4);
      for (let i = 1; i < seen.length; i++) {
        // A drop back to a shallower level is fine; a jump deeper must be one step.
        if (seen[i] > seen[i - 1]) expect(seen[i] - seen[i - 1], `${tab} at ${i}`).toBe(1);
      }
    }
  }, 60_000);
});
