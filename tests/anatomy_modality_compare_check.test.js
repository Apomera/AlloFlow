import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 15 (2026-09-02): the Imaging Lab can show the same slice as CT, MRI T1 and MRI T2 side
// by side with a pick-the-scan check, and the structure Compare panel gains a function row, the
// target's real system, and a "Which one does this?" check.

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
    anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, ...state },
  }, overrides));
}

beforeEach(() => { resetStemLab(); });

describe('Imaging modality comparison', () => {
  it.each(ANATOMY_PATHS)('is off by default and paints three panels plus three questions when opened in %s', (filePath) => {
    const closed = render(filePath, { _activeTab: 'imaging', imaging: { region: 'head', plane: 'axial', slice: 50 } }, OLDER);
    const toggle = closed.querySelector('[data-anatomy-imaging-compare-toggle]');
    expect(toggle?.getAttribute('aria-pressed')).toBe('false');
    expect(closed.querySelector('[data-anatomy-modality-compare]')).toBeNull();

    const open = render(filePath, { _activeTab: 'imaging', imaging: { region: 'head', plane: 'axial', slice: 50, compareModalities: true } }, OLDER);
    expect(open.querySelector('[data-anatomy-imaging-compare-toggle]')?.getAttribute('aria-pressed')).toBe('true');
    const strip = open.querySelector('[data-anatomy-modality-compare]');
    expect(strip).not.toBeNull();
    const panels = [...strip.querySelectorAll('[data-anatomy-modality-panel]')].map((p) => p.getAttribute('data-anatomy-modality-panel'));
    expect(panels).toEqual(['CT', 'T1', 'T2']);
    expect(strip.querySelectorAll('canvas')).toHaveLength(3);
    expect(strip.textContent).toMatch(/Head · axial · slice 50/);
    expect(strip.querySelectorAll('[data-anatomy-modality-question]')).toHaveLength(3);
    expect(strip.querySelector('[data-anatomy-modality-check]')?.getAttribute('data-anatomy-modality-check')).toBe('open');
  }, 60_000);

  it.each(ANATOMY_PATHS)('scores the scan choices and explains each one in %s', (filePath) => {
    const done = render(filePath, { _activeTab: 'imaging', imaging: { compareModalities: true, modalityPicks: { fracture: 'CT', ligament: 'CT', fluid: 'T2' } } }, OLDER);
    const check = done.querySelector('[data-anatomy-modality-check]');
    expect(check?.getAttribute('data-anatomy-modality-check')).toBe('done');
    expect(check.textContent).toMatch(/2 \/ 3 right\./);
    expect(check.querySelectorAll('button[data-anatomy-modality-option][disabled]')).toHaveLength(6);
    const ligament = check.querySelector('[data-anatomy-modality-question="ligament"]');
    expect(ligament.textContent).toMatch(/❌ CT/);
    expect(ligament.textContent).toMatch(/✅ MRI/);
    expect(ligament.textContent).toMatch(/MRI separates them clearly/);
  }, 60_000);
});

describe('Structure compare panel', () => {
  const PAIR = { _activeTab: 'explore', selectedStructure: 'femur', _compareStructure: 'tibia' };

  it.each(ANATOMY_PATHS)('shows what each structure does and asks which one a clue describes in %s', (filePath) => {
    const root = render(filePath, PAIR, OLDER);
    const fnRow = root.querySelector('[data-anatomy-compare-row="function"]');
    expect(fnRow).not.toBeNull();
    const cells = [...fnRow.querySelectorAll('td')].map((c) => c.textContent);
    expect(cells[0]).toBe('Does');
    expect(cells[1]).toMatch(/\S/);
    expect(cells[2]).toMatch(/\S/);

    const check = root.querySelector('[data-anatomy-compare-check]');
    expect(check?.getAttribute('data-anatomy-compare-check')).toBe('femur|tibia');
    expect(check.getAttribute('data-anatomy-compare-check-state')).toBe('open');
    const options = [...check.querySelectorAll('button[data-anatomy-compare-option]')].map((b) => b.getAttribute('data-anatomy-compare-option')).sort();
    expect(options).toEqual(['femur', 'tibia']);
    // The clue must not leak either name.
    const clue = check.querySelector('p.italic').textContent;
    expect(clue).not.toMatch(/femur|tibia/i);
  }, 60_000);

  it.each(ANATOMY_PATHS)('locks the options and contrasts both structures after an answer in %s', (filePath) => {
    const wrongFirst = render(filePath, { ...PAIR, _compareCheck: { pair: 'femur|tibia', chosen: 'femur' } }, OLDER);
    const wrongSecond = render(filePath, { ...PAIR, _compareCheck: { pair: 'femur|tibia', chosen: 'tibia' } }, OLDER);
    const states = [wrongFirst, wrongSecond].map((r) => r.querySelector('[data-anatomy-compare-check]').getAttribute('data-anatomy-compare-check-state')).sort();
    expect(states).toEqual(['hit', 'miss']);
    const missed = [wrongFirst, wrongSecond].find((r) => r.querySelector('[data-anatomy-compare-check-state="miss"]'));
    const status = missed.querySelector('[data-anatomy-compare-check] [role="status"]');
    expect(status.textContent).toMatch(/^That was the (Femur|Tibia)\. The (Femur|Tibia): \S/);
    expect(missed.querySelectorAll('button[data-anatomy-compare-option][disabled]')).toHaveLength(2);

    // A check answered for a different pair does not carry over.
    const otherPair = render(filePath, { ...PAIR, _compareCheck: { pair: 'femur|patella', chosen: 'femur' } }, OLDER);
    expect(otherPair.querySelector('[data-anatomy-compare-check]').getAttribute('data-anatomy-compare-check-state')).toBe('open');
  }, 60_000);

  it.each(ANATOMY_PATHS)('names the target structure’s own system when it comes from elsewhere in %s', (filePath) => {
    const root = render(filePath, { _activeTab: 'explore', system: 'circulatory', selectedStructure: 'heart', _compareStructure: 'lungs' }, OLDER);
    const rows = [...root.querySelectorAll('[data-anatomy-structure-detail] table tbody tr')];
    const systemRow = rows.find((r) => r.querySelector('td')?.textContent === 'System');
    const cells = [...systemRow.querySelectorAll('td')].map((c) => c.textContent);
    expect(cells[1]).toMatch(/Circulatory/);
    expect(cells[2]).toMatch(/Organ Systems/);
  }, 60_000);
});
