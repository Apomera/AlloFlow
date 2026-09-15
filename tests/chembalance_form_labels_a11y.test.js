import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_chembalance.js';
const DEPLOY =
  'desktop/web-app/public/stem_lab/stem_tool_chembalance.js';

function renderSubtool(subtool, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('chemBalance', {
    chemBalance: { subtool, _everPicked: true, ...data },
  });
  return container;
}

function accessibleName(control) {
  const ariaLabel = control.getAttribute('aria-label')?.trim();
  const labelText = Array.from(control.labels || [])
    .map((label) => label.textContent || '')
    .join(' ')
    .trim();
  return ariaLabel || labelText;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'chemBalance');
});

describe('ChemBalance form-control accessibility', () => {
  it('names the hub and glossary searches independently of placeholders', () => {
    const glossary = renderSubtool('glossary');
    const hubSearch = glossary.querySelector(
      'input[aria-label="Search chemistry sub-tools"]'
    );
    const glossarySearch = glossary.querySelector(
      'input[aria-label="Filter chemistry glossary terms"]'
    );

    expect(hubSearch).toBeTruthy();
    expect(glossarySearch).toBeTruthy();
  });

  it('associates both pH inquiry textareas with visible labels', () => {
    const container = renderSubtool('pHHunt', {
      pHHunt: {
        hExpo: -7,
        buffer: 0,
        tempC: 25,
        hypothesis: '',
        stuckRevealed: false,
        understood: true,
        explanation: '',
        log: [],
      },
    });
    const hypothesis = container.querySelector('#chem-ph-hypothesis');
    const explanation = container.querySelector('#chem-ph-explanation');

    expect(hypothesis.labels[0].textContent).toBe('Your pH hypothesis');
    expect(explanation.labels[0].textContent).toBe('Explain your reasoning');
    for (const control of container.querySelectorAll(
      'input, textarea, select'
    )) {
      expect(
        accessibleName(control),
        `unnamed ${control.tagName.toLowerCase()} (${control.type || 'n/a'})`
      ).not.toBe('');
    }
  });

  it('names every control in the live Arrhenius explorer', () => {
    // The source-count ratchet below sees these three controls but cannot tell
    // whether they are NAMED. Render the section and check the names for real -
    // a range input with no accessible name is silent to a screen reader.
    const container = renderSubtool('kinetics');
    const controls = container.querySelectorAll('input, textarea, select');

    expect(controls.length).toBeGreaterThanOrEqual(3);
    for (const control of controls) {
      expect(
        accessibleName(control),
        `unnamed ${control.tagName.toLowerCase()} (${control.type || 'n/a'})`
      ).not.toBe('');
    }

    // Sliders must also speak their VALUE, not just their name.
    for (const id of ['kin-ea', 'kin-temp']) {
      const slider = container.querySelector(`#${id}`);
      expect(slider, `missing #${id}`).toBeTruthy();
      expect(slider.getAttribute('aria-valuetext')).toBeTruthy();
    }
  });

  it('names every control in the live decay curve', () => {
    const container = renderSubtool('nuclear');
    const controls = container.querySelectorAll('input, textarea, select');

    expect(controls.length).toBeGreaterThanOrEqual(2);
    for (const control of controls) {
      expect(
        accessibleName(control),
        `unnamed ${control.tagName.toLowerCase()} (${control.type || 'n/a'})`
      ).not.toBe('');
    }

    const slider = container.querySelector('#nuc-halves');
    expect(slider).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBeTruthy();
    // The isotope picker is a <select>; it needs a name like any other control.
    expect(accessibleName(container.querySelector('#nuc-isotope'))).not.toBe('');
  });

  it('names every control in the dilution bench and the cell builder', () => {
    // The source-count ratchet below sees these six controls but cannot tell
    // whether they are NAMED.
    for (const subtool of ['solutions', 'redox']) {
      const container = renderSubtool(subtool);
      const controls = container.querySelectorAll('input, textarea, select');
      expect(controls.length, `${subtool} controls`).toBeGreaterThanOrEqual(3);
      for (const control of controls) {
        expect(
          accessibleName(control),
          `${subtool}: unnamed ${control.tagName.toLowerCase()} (${control.type || 'n/a'})`
        ).not.toBe('');
      }
    }

    // The electron slider must speak its value, not only its name.
    const slider = renderSubtool('redox').querySelector('#cell-n');
    expect(slider).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBeTruthy();
  });

  it('names every control in the Gibbs explorer and the buffer designer', () => {
    for (const subtool of ['thermo', 'acids_bases']) {
      const container = renderSubtool(subtool);
      const controls = container.querySelectorAll('input, textarea, select');
      expect(controls.length, `${subtool} controls`).toBeGreaterThanOrEqual(2);
      for (const control of controls) {
        expect(
          accessibleName(control),
          `${subtool}: unnamed ${control.tagName.toLowerCase()} (${control.type || 'n/a'})`
        ).not.toBe('');
      }
    }

    // Both sliders must speak their value, not only their name.
    for (const [subtool, id] of [['thermo', 'gibbs-temp'], ['acids_bases', 'buf-ratio']]) {
      const slider = renderSubtool(subtool).querySelector(`#${id}`);
      expect(slider, `missing #${id}`).toBeTruthy();
      expect(slider.getAttribute('aria-valuetext')).toBeTruthy();
    }
  });

  it('keeps all 29 form declarations and repaired names explicit in source', () => {
    const source = readFileSync(SOURCE, 'utf8');

    // 17 until the Kinetics section gained a live Arrhenius explorer (+3: the Ea
    // slider #kin-ea, the temperature slider #kin-temp, the catalyst checkbox),
    // then 20 until the Nuclear section gained a decay curve (+2: the isotope
    // picker #nuc-isotope and the half-life slider #nuc-halves), then 22 until
    // the Solutions dilution bench (+3 number inputs) and the Redox cell builder
    // (+2 couple selects, +1 electron slider) took it to 25, then the Thermo
    // Gibbs explorer (+1 reaction select, +1 temperature slider) and the Acids &
    // Bases buffer designer (+1 acid select, +1 ratio slider) took it to 29.
    // Raise this deliberately - the count is a ratchet so a new control cannot
    // arrive without an accessible name.
    expect(source.match(/h\('(input|textarea|select)'/g)).toHaveLength(29);
    expect(source).toContain('filter_chemistry_glossary_terms');
    expect(source).toContain("htmlFor: 'chem-ph-hypothesis'");
    expect(source).toContain("id: 'chem-ph-hypothesis'");
    expect(source).toContain("htmlFor: 'chem-ph-explanation'");
    expect(source).toContain("id: 'chem-ph-explanation'");
    expect(source).toContain('search_elements_label');
    expect(source).toContain("htmlFor: 'chem-periodic-element-picker'");
    expect(source).toContain("id: 'chem-periodic-element-picker'");
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
