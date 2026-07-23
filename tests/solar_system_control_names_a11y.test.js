import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'prismflow-deploy/public/stem_lab/stem_tool_solarsystem.js';

function unnamedControls(markup) {
  document.body.innerHTML = markup;
  return [...document.querySelectorAll('input:not([type="hidden"]), textarea, select')].filter((control) => {
    if ((control.getAttribute('aria-label') || '').trim()) return false;
    const labelledBy = (control.getAttribute('aria-labelledby') || '').trim();
    if (labelledBy && labelledBy.split(/\s+/).every((id) => document.getElementById(id)?.textContent.trim())) return false;
    if (control.closest('label')) return false;
    const id = control.id;
    return !id || ![...document.querySelectorAll('label[for]')].some((label) => label.htmlFor === id);
  });
}

describe('Solar System control accessible names', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  it('keeps the canonical source and deployed mirror byte-identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('names all 44 generated mini-tool sliders from their visible labels', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const sliders = source.match(/React\.createElement\('input', \{ 'aria-label': [^\n]+, type: 'range'/g) || [];
    expect(sliders).toHaveLength(44);
    expect(sliders.some((line) => line.includes("'aria-label': s.label"))).toBe(true);
    expect(sliders.some((line) => line.includes("'aria-label': __alloT('stem.solarsystem.time', 'Time')"))).toBe(true);
  });

  it('renders no unnamed form controls in the planet and field-journal view', () => {
    const markup = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'stem.solar_sys.earth',
        showJournal: true,
      },
    });
    expect(unnamedControls(markup).map((control) => control.outerHTML)).toEqual([]);
    expect(document.querySelector('label[for="journal-predict"]')?.textContent).toContain('What I predicted');
    expect(document.querySelector('label[for="journal-question"]')?.textContent).toContain('One question');
  });

  it('keeps visible labels for the Kepler inquiry writing fields', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("htmlFor: 'solar-kepler-hypothesis'");
    expect(source).toContain("id: 'solar-kepler-hypothesis'");
    expect(source).toContain("h('span', { style: { display: 'block', marginBottom: 4 } }, __alloT('stem.solarsystem.explain_in_your_own_words', 'Explain in your own words'))");
  });
});
