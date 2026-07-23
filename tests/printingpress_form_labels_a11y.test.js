import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_printingpress.js';
const DEPLOY = 'prismflow-deploy/public/stem_lab/stem_tool_printingpress.js';

function renderView(view, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('printingPress', {
    printingPress: { view, ...data },
  });
  return container;
}

beforeEach(() => {
  resetStemLab();
  document.getElementById('printingpress-print-css')?.remove();
  loadTool(SOURCE, 'printingPress');
});

describe('Printing Press form-control accessibility', () => {
  it('associates both inquiry textareas with visible labels', () => {
    const container = renderView('pressInquiry', {
      pressIQ: {
        typeSize: 12,
        lineLength: 65,
        leading: 1.4,
        paperContrast: 80,
        hypothesis: '',
        stuckRevealed: false,
        understood: true,
        explanation: '',
        log: [],
      },
    });
    const hypothesis = container.querySelector('#pp-inquiry-hypothesis');
    const explanation = container.querySelector('#pp-inquiry-explanation');

    expect(hypothesis).not.toBeNull();
    expect(explanation).not.toBeNull();
    expect(Array.from(hypothesis.labels || [])).toHaveLength(1);
    expect(Array.from(explanation.labels || [])).toHaveLength(1);
    expect(hypothesis.labels[0].textContent).toContain('Your hypothesis');
    expect(explanation.labels[0].textContent).toContain(
      'Explain why this typography combination'
    );
  });

  it('names every inquiry control in the rendered accessibility tree', () => {
    const container = renderView('pressInquiry', {
      pressIQ: {
        typeSize: 12,
        lineLength: 65,
        leading: 1.4,
        paperContrast: 80,
        hypothesis: '',
        stuckRevealed: false,
        understood: true,
        explanation: '',
        log: [],
      },
    });

    for (const control of container.querySelectorAll('input, textarea, select')) {
      const ariaLabel = control.getAttribute('aria-label')?.trim();
      const labelText = Array.from(control.labels || [])
        .map((label) => label.textContent || '')
        .join(' ')
        .trim();
      expect(
        ariaLabel || labelText,
        `unnamed ${control.tagName.toLowerCase()} (${control.type || 'n/a'})`
      ).not.toBe('');
    }
  });

  it('keeps explicit names and value text on all seven repaired sliders', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const expectedFragments = [
      "'aria-label': label + ' percentage'",
      'dry_rag_weight_slider_label',
      'target_page_count_slider_label',
      'x_height_slider_label',
      'weight_slider_label',
      'contrast_slider_label',
      'width_slider_label',
    ];

    for (const fragment of expectedFragments) expect(source).toContain(fragment);
    expect(source.match(/'aria-valuetext':/g)?.length || 0).toBeGreaterThanOrEqual(
      7
    );
    expect(source).toContain('mirror_word_answer_label');
    expect(source).toContain('glossary_filter_label');
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
