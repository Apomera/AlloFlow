import { beforeEach, describe, expect, it } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;

function projectState(overrides = {}) {
  return Object.assign({
    step: 2,
    scenarioId: 'island',
    scenarioTitle: 'The Stranded Island Population',
    studentName: '',
    predictions: [
      'The allele frequency will drift away from one half.',
      'The five lineages will finish at different frequencies.',
      'A small founder sample carries only part of the mainland variation.'
    ],
    reflections: ['', '', ''],
    notebook: { baseline: '', settings: '', outcome: '', surprise: '' },
    evidenceVerdict: '',
    module: 'geneticDrift',
    moduleLabel: '🎲 Genetic Drift Simulator',
    moduleHint: 'Use N=10 for 100 generations and compare several lineages.',
    mechanismCue: 'Genetic drift is random sampling, with stronger effects in small populations.',
    dataMission: [
      'Confirm N = 10 and a starting allele frequency of 0.50.',
      'Run several lineages for the same number of generations.',
      'Record the range of final frequencies and how many lineages reached fixation or loss.'
    ]
  }, overrides);
}

function mountEvo(initialToolData) {
  const cfg = window.StemLab._registry.evoLab;
  const container = document.createElement('div');
  document.body.appendChild(container);

  function Host() {
    const [toolData, setToolData] = React.useState(initialToolData);
    const ctx = makeCtx({
      toolData,
      update(toolId, key, val) {
        setToolData((prev) => {
          const toolState = Object.assign({}, (prev && prev[toolId]) || {});
          toolState[key] = val;
          return Object.assign({}, prev, { [toolId]: toolState });
        });
      }
    });
    return cfg.render(ctx);
  }

  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(Host)));
  return { container, root };
}

function setNativeValue(node, value) {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(node, value);
  node.dispatchEvent(new window.Event('input', { bubbles: true }));
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  document.body.innerHTML = '';
});

describe('EvoLab Capstone evidence notebook', () => {
  it('keeps evidence when a student leaves for the linked simulator and returns', () => {
    const { container, root } = mountEvo({
      evoLab: { view: 'capstone', evoCapstone: projectState() }
    });

    const baseline = container.querySelector('#evo-capstone-baseline');
    const outcome = container.querySelector('#evo-capstone-outcome');
    expect(baseline).toBeTruthy();
    expect(outcome).toBeTruthy();

    act(() => setNativeValue(baseline, 'N = 10; starting allele A frequency = 0.50.'));
    act(() => setNativeValue(container.querySelector('#evo-capstone-outcome'), 'Three of five lineages reached fixation by generation 100.'));

    const openLab = Array.from(container.querySelectorAll('button'))
      .find((button) => (button.textContent || '').includes('Open 🎲 Genetic Drift Simulator'));
    expect(openLab).toBeTruthy();
    act(() => openLab.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

    expect(container.textContent).toContain('Genetic Drift Simulator');
    expect(container.textContent).toContain('Capstone field mission');
    expect(container.textContent).toContain('Confirm N = 10');
    const returnButton = Array.from(container.querySelectorAll('button'))
      .find((button) => (button.textContent || '').includes('Return to project'));
    expect(returnButton).toBeTruthy();
    act(() => returnButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

    expect(container.textContent).toContain('Evidence notebook');
    expect(container.querySelector('#evo-capstone-baseline').value)
      .toBe('N = 10; starting allele A frequency = 0.50.');
    expect(container.querySelector('#evo-capstone-outcome').value)
      .toBe('Three of five lineages reached fixation by generation 100.');
    expect(container.querySelector('button[aria-label="Advance to the next step"]').disabled).toBe(false);

    act(() => root.unmount());
  });

  it('includes recorded evidence in the printable report', () => {
    const html = renderTool('evoLab', {
      evoLab: {
        view: 'capstone',
        evoCapstone: projectState({
          step: 4,
          notebook: {
            baseline: 'N = 10 and p = 0.50 at generation 0.',
            settings: 'Five lineages for 100 generations.',
            outcome: 'Three lineages fixed; two remained polymorphic.',
            surprise: 'Each lineage followed a different path by chance.'
          },
          reflections: [
            'The repeated trials supported the prediction.',
            'Small populations lose diversity more quickly.',
            'Conservation plans should protect population size and gene flow.'
          ],
          evidenceVerdict: 'partly'
        })
      }
    });

    expect(html).toContain('3. Evidence Notebook');
    expect(html).toContain('Five lineages for 100 generations.');
    expect(html).toContain('Three lineages fixed; two remained polymorphic.');
    expect(html).toContain('Evidence verdict:');
    expect(html).toContain('Partly supported');
    expect(html).toContain('4. Findings &amp; Reflection');
  });

  it('requires an evidence verdict and carries it into the final report', () => {
    const { container, root } = mountEvo({
      evoLab: {
        view: 'capstone',
        evoCapstone: projectState({
          step: 3,
          notebook: {
            baseline: 'N = 10 and p = 0.50 at generation 0.',
            settings: 'Five lineages ran for 100 generations.',
            outcome: 'Three lineages fixed while two retained both alleles.',
            surprise: 'Identical starting conditions produced different endpoints.'
          }
        })
      }
    });

    expect(container.textContent).toContain('Evidence replay');
    expect(container.textContent).toContain('Three lineages fixed while two retained both alleles.');
    expect(container.querySelector('button[aria-label="Generate the final report"]').disabled).toBe(true);

    const verdict = Array.from(container.querySelectorAll('button'))
      .find((button) => (button.textContent || '').includes('Partly supported'));
    expect(verdict).toBeTruthy();
    act(() => verdict.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('button[aria-pressed="true"]').textContent).toContain('Partly supported');

    [
      'The repeated runs partly supported my prediction.',
      'Random sampling has stronger effects in small populations.',
      'Conservation can reduce drift by maintaining larger connected populations.'
    ].forEach((answer, index) => {
      const textarea = container.querySelector('textarea[aria-label^="Reflection ' + (index + 1) + ':"]');
      act(() => setNativeValue(textarea, answer));
    });

    const generate = container.querySelector('button[aria-label="Generate the final report"]');
    expect(generate.disabled).toBe(false);
    act(() => generate.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('Evidence verdict:');
    expect(container.textContent).toContain('Partly supported');

    act(() => root.unmount());
  });

  it('surfaces an in-progress investigation on the EvoLab menu', () => {
    const html = renderTool('evoLab', {
      evoLab: { view: 'menu', evoCapstone: projectState({ step: 2 }) }
    });

    expect(html).toContain('Investigation saved in this session');
    expect(html).toContain('The Stranded Island Population');
    expect(html).toContain('Collect evidence · Step 3 of 5');
    expect(html).toContain('Resume investigation');
  });

  it('shows all 17 current student modules in the conceptual map', () => {
    const html = renderTool('evoLab', { evoLab: { view: 'moduleMap' } });

    expect(html).toContain('17 student modules');
    expect((html.match(/aria-label="Open [^"]+ module"/g) || [])).toHaveLength(17);
    for (const moduleName of [
      'Predator Vision',
      'Climate Pressure Lab',
      'Mate Choice Lab',
      'Homology vs Analogy',
      'Selection Sleuth',
      'Capstone Project'
    ]) {
      expect(html).toContain(moduleName);
    }
  });
});
