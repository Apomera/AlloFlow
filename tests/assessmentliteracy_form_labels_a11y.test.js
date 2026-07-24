import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_assessmentliteracy.js';
const DEPLOY =
  'desktop/web-app/public/stem_lab/stem_tool_assessmentliteracy.js';

function renderView(view, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('assessmentLiteracy', {
    assessmentLiteracy: { view, ...data },
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
  loadTool(SOURCE, 'assessmentLiteracy');
});

describe('Assessment Literacy form-control accessibility', () => {
  it('names the glossary filter independently of its placeholder', () => {
    const container = renderView('glossary');
    const filter = container.querySelector('input[type="text"]');
    expect(filter).toBeTruthy();
    expect(filter.getAttribute('aria-label')).toBe('Filter glossary terms');
  });

  it('associates both inquiry textareas and names every inquiry control', () => {
    const container = renderView('inquiry', {
      relIQ: {
        reliability: 0.85,
        sem: 5,
        observed: 100,
        stakes: 5,
        hypothesis: '',
        stuckRevealed: false,
        understood: true,
        explanation: '',
        log: [],
      },
    });
    const hypothesis = container.querySelector(
      '#al-reliability-hypothesis'
    );
    const explanation = container.querySelector(
      '#al-reliability-explanation'
    );

    expect(hypothesis).toBeTruthy();
    expect(explanation).toBeTruthy();
    expect(hypothesis.labels).toHaveLength(1);
    expect(explanation.labels).toHaveLength(1);
    expect(hypothesis.labels[0].textContent).toContain('Your hypothesis');
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

  it('keeps all nine repaired control names explicit in source', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const expectedFragments = [
      'glossary_filter_accessible_label',
      "htmlFor: 'al-reliability-hypothesis'",
      "id: 'al-reliability-hypothesis'",
      "htmlFor: 'al-reliability-explanation'",
      "id: 'al-reliability-explanation'",
      "htmlFor: 'al-peer-name'",
      "id: 'al-peer-name'",
      'occupation_focus_accessible_label',
      'career_search_accessible_label',
      'skill_search_accessible_label',
      "htmlFor: 'al-interview-role'",
      "id: 'al-interview-role'",
      "htmlFor: 'al-interview-star-response'",
      "id: 'al-interview-star-response'",
    ];

    for (const fragment of expectedFragments) {
      expect(source).toContain(fragment);
    }
    expect(source.match(/h\('(input|textarea|select)'/g)).toHaveLength(33);
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
