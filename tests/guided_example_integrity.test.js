// Guided worked examples are DISPLAY-ONLY. They live in the extracted
// GuidedModeBanner module as static GUIDED_DETAIL content plus local tab/modal
// state, so opening a worked example must never add anything to history, saved
// projects, downloads, or generated-content state.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const banner = readFileSync(resolve(process.cwd(), 'view_guided_mode_banner_source.jsx'), 'utf8');

const DETAIL_STEP_IDS = [
  'source-input', 'analysis', 'glossary', 'simplified', 'ui-tool-wordsounds', 'outline',
  'anchor-chart', 'image', 'faq', 'sentence-frames', 'note-taking', 'brainstorm', 'persona',
  'timeline', 'concept-sort', 'dbq', 'math', 'adventure', 'quiz', 'alignment', 'lesson-plan', '_final',
];

function guidedDetailBlock() {
  const start = banner.indexOf('const GUIDED_DETAIL = {');
  const end = banner.indexOf('function GuidedModeBanner', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return banner.slice(start, end);
}

describe('Guided worked examples - data + wiring present', () => {
  it('defines GUIDED_DETAIL with an example for every guided step', () => {
    const block = guidedDetailBlock();
    for (const id of DETAIL_STEP_IDS) {
      expect(block.includes(`"${id}": {`)).toBe(true);
    }
    expect((block.match(/"example":/g) || []).length).toBe(DETAIL_STEP_IDS.length);
  });

  it('keeps example viewing in local tab/modal state instead of host state', () => {
    expect(banner).toContain('const [infoTab, setInfoTab] = React.useState(');
    expect(banner).toContain('_savedUiState.infoTab');
    expect(banner).toContain('const [showFullLesson, setShowFullLesson] = React.useState(false)');
    expect(banner).toContain("onClick={() => setInfoTab(infoTab === 'example' ? null : 'example')}");
    expect(banner).toContain('onClick={() => setShowFullLesson(true)}');
    expect(banner).not.toContain('guidedExampleId');
    expect(banner).not.toContain('onShowGuidedExample');
  });

  it('renders a badged worked-example panel from detailEntry.example', () => {
    expect(banner).toContain("t('guided.example_heading') || 'Example output'");
    expect(banner).toContain("t('guided.example_lesson') || 'Photosynthesis'");
    expect(banner).toContain("t('guided.example_consistent') || 'The same lesson runs through every step.'");
    expect(banner).toContain('<pre style={_gdPre}>{detailEntry.example}</pre>');
  });
});

describe("Guided worked examples - INTEGRITY: can't reach the resource pack", () => {
  it('never mentions guided-detail state alongside setHistory or setGeneratedContent', () => {
    const offenders = banner.split(/\r?\n/)
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) =>
        /GUIDED_DETAIL|detailEntry|infoTab|setInfoTab|showFullLesson|setShowFullLesson|GUIDED_SAMPLE_TEXT/.test(line) &&
        /setHistory\(|setGeneratedContent\(/.test(line));
    expect(offenders.map(o => `${o.n}: ${o.line}`)).toEqual([]);
  });

  it('the worked-example panel markup itself contains no persistence call', () => {
    const panelStart = banner.indexOf("infoTab === 'example'");
    expect(panelStart).toBeGreaterThan(-1);
    const panelEnd = banner.indexOf('{isLast &&', panelStart);
    expect(panelEnd).toBeGreaterThan(panelStart);
    const panelMarkup = banner.slice(panelStart, panelEnd);
    expect(panelMarkup).not.toMatch(/setHistory\(|setGeneratedContent\(/);
  });

  it('the full worked lesson modal reads GUIDED_DETAIL but does not save generated content', () => {
    const modalStart = banner.indexOf('showFullLesson && (');
    expect(modalStart).toBeGreaterThan(-1);
    const modalEnd = banner.indexOf('function GuidedModeBanner', modalStart);
    const modalMarkup = banner.slice(modalStart, modalEnd === -1 ? undefined : modalEnd);
    expect(modalMarkup).toContain('GUIDED_DETAIL[s.id]');
    expect(modalMarkup).not.toMatch(/setHistory\(|setGeneratedContent\(/);
  });
});