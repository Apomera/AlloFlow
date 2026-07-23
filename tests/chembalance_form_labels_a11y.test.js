import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_chembalance.js';
const DEPLOY =
  'prismflow-deploy/public/stem_lab/stem_tool_chembalance.js';

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

  it('keeps all 14 form declarations and repaired names explicit in source', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source.match(/h\('(input|textarea|select)'/g)).toHaveLength(14);
    expect(source).toContain('filter_chemistry_glossary_terms');
    expect(source).toContain("htmlFor: 'chem-ph-hypothesis'");
    expect(source).toContain("id: 'chem-ph-hypothesis'");
    expect(source).toContain("htmlFor: 'chem-ph-explanation'");
    expect(source).toContain("id: 'chem-ph-explanation'");
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
