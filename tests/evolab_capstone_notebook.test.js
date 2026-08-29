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
    notebook: { baseline: '', settings: '', outcome: '', claim: '', surprise: '' },
    runs: [],
    nextRunId: 1,
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

function driftRun(id = 'run-1', outcome = 'Final p(A): 0.000, 0.250, 0.500, 0.750, 1.000.', comparisonOverrides = {}) {
  return {
    id,
    sourceRunKey: `geneticDrift:${id}`,
    moduleId: 'geneticDrift',
    moduleLabel: 'Genetic Drift Simulator',
    capturedAt: '2026-08-26T12:00:00.000Z',
    baseline: 'Generation 0: N = 10 diploid individuals; p(A) = 0.500 in all 5 lineages.',
    settings: '5 independent lineages for 100 generations; random sampling only.',
    outcome,
    comparison: Object.assign({
      designKey: 'N=10|generations=100',
      designLabel: 'N = 10 for 100 generations',
      primaryLabel: 'mean absolute displacement from p(A) = 0.500',
      primaryValue: 0.3,
      primaryDisplay: '0.300',
      precision: 3,
      unit: '',
      factors: [
        { id: 'populationSize', label: 'Population size', value: 10 },
        { id: 'generations', label: 'Generations', value: 100 }
      ]
    }, comparisonOverrides),
    metrics: [
      { label: 'Population N', value: '10' },
      { label: 'Generations', value: '100' },
      { label: 'Mean absolute displacement from 0.500', value: '0.300' }
    ]
  };
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

function setNativeSelectValue(node, value) {
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(node, value);
  node.dispatchEvent(new window.Event('change', { bubbles: true }));
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
      evoLab: { view: 'capstone', evoCapstone: projectState({ runs: undefined, nextRunId: undefined }) }
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

    expect(container.textContent).toContain('Interpretation notebook');
    expect(container.querySelector('#evo-capstone-baseline').value)
      .toBe('N = 10; starting allele A frequency = 0.50.');
    expect(container.querySelector('#evo-capstone-outcome').value)
      .toBe('Three of five lineages reached fixation by generation 100.');
    expect(container.querySelector('button[aria-label="Advance to the next step"]').disabled).toBe(false);

    act(() => root.unmount());
  });

  it('captures a drift run automatically, persists it, and compares it in the notebook', () => {
    const { container, root } = mountEvo({
      evoLab: { view: 'capstone', evoCapstone: projectState() }
    });

    const openLab = Array.from(container.querySelectorAll('button'))
      .find((button) => (button.getAttribute('aria-label') || '').startsWith('Open '));
    expect(openLab).toBeTruthy();
    act(() => openLab.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

    const setSmallPopulation = container.querySelector('button[aria-label="Set population size to 10"]');
    expect(setSmallPopulation).toBeTruthy();
    act(() => setSmallPopulation.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    const runButton = Array.from(container.querySelectorAll('button'))
      .find((button) => (button.textContent || '').includes('Run 5 Lineages'));
    expect(runButton).toBeTruthy();
    act(() => runButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

    const captureButton = container.querySelector('button[aria-label^="Capture this Genetic Drift Simulator run"]');
    expect(captureButton).toBeTruthy();
    expect(captureButton.disabled).toBe(false);
    act(() => captureButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('1 run captured for this project');

    const persisted = JSON.parse(window.localStorage.getItem('evoLab.capstone.v2'));
    expect(persisted.runs).toHaveLength(1);
    expect(persisted.runs[0]).toMatchObject({ id: 'run-1', moduleId: 'geneticDrift' });
    expect(persisted.runs[0].sourceRunKey).toMatch(/^geneticDrift:/);
    expect(persisted.runs[0].comparison.factors).toEqual([
      { id: 'populationSize', label: 'Population size', value: 10 },
      { id: 'generations', label: 'Generations', value: 100 }
    ]);
    expect(persisted.runs[0].baseline).toContain('N = 10');
    expect(persisted.runs[0].metrics.find((metric) => metric.label === 'Final p(A) values')).toBeTruthy();
    expect(persisted.nextRunId).toBe(2);

    const capturedButton = container.querySelector('button[aria-label^="Capture this Genetic Drift Simulator run"]');
    expect(capturedButton.disabled).toBe(true);
    expect(capturedButton.textContent).toContain('Captured');
    act(() => capturedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(JSON.parse(window.localStorage.getItem('evoLab.capstone.v2')).runs).toHaveLength(1);

    act(() => runButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('button[aria-label^="Capture this Genetic Drift Simulator run"]').disabled).toBe(false);

    const returnButton = Array.from(container.querySelectorAll('button'))
      .find((button) => (button.textContent || '').includes('Return to project'));
    act(() => returnButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

    expect(container.textContent).toContain('Captured simulator runs');
    expect(container.textContent).toContain('One run is evidence; two runs reveal a pattern');
    expect(container.textContent).toContain('capture 1 more');
    expect(container.querySelector('caption').textContent).toContain('Captured simulator runs');
    expect(container.querySelector('th[scope="row"]').textContent).toContain('Run 1');
    expect(container.querySelectorAll('th[scope="col"]')).toHaveLength(5);
    expect(container.querySelector('#evo-capstone-baseline').value).toContain('N = 10');
    expect(container.querySelector('#evo-capstone-outcome').value).toContain('Final p(A):');
    expect(container.querySelector('button[aria-label="Advance to the next step"]').disabled).toBe(false);

    act(() => root.unmount());
  });

  it('persists a pre-run trial plan through linked-lab navigation', () => {
    const { container, root } = mountEvo({
      evoLab: {
        view: 'capstone',
        evoCapstone: projectState({
          trialPlan: { version: 1, strategy: 'repeat', factor: '', factorLabel: '', levelA: '', levelB: '', targetRuns: 2 }
        })
      }
    });

    expect(container.textContent).toContain('What should the next trial tell you?');
    expect(container.textContent).toContain('How much does mean absolute displacement and fixation/loss vary');
    expect(container.textContent).toContain('0 of 2 distinct trials captured');
    expect(container.textContent).toContain('Run 1 of 2');

    act(() => setNativeSelectValue(container.querySelector('#evo-trial-repeat-count'), '3'));
    expect(JSON.parse(window.localStorage.getItem('evoLab.capstone.v2')).trialPlan.targetRuns).toBe(3);

    const openLab = Array.from(container.querySelectorAll('button'))
      .find((button) => (button.getAttribute('aria-label') || '').startsWith('Open '));
    act(() => openLab.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('Trial plan: Repeat the same settings 3 times');

    const returnButton = Array.from(container.querySelectorAll('button'))
      .find((button) => (button.textContent || '').includes('Return to project'));
    act(() => returnButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('#evo-trial-repeat-count').value).toBe('3');

    act(() => root.unmount());
  });

  it('checks a planned one-setting comparison against structured captured factors', () => {
    const plan = { version: 1, strategy: 'change-one', factor: 'populationSize', factorLabel: 'Population size', levelA: '10', levelB: '50', targetRuns: 2 };
    const secondFactors = [
      { id: 'populationSize', label: 'Population size', value: 50 },
      { id: 'generations', label: 'Generations', value: 100 }
    ];
    const alignedHtml = renderTool('evoLab', {
      evoLab: {
        view: 'capstone',
        evoCapstone: projectState({
          trialPlan: plan,
          runs: [
            driftRun('run-1', undefined, { primaryValue: 0.2, primaryDisplay: '0.200' }),
            driftRun('run-2', undefined, { designKey: 'N=50|generations=100', primaryValue: 0.4, primaryDisplay: '0.400', factors: secondFactors })
          ]
        })
      }
    });

    expect(alignedHtml).toContain('Controlled one-setting comparison');
    expect(alignedHtml).toContain('Controlled comparison captured');
    expect(alignedHtml).toContain('Only Population size changed');
    expect(alignedHtml).toContain('Endpoint check only');

    const mismatchedHtml = renderTool('evoLab', {
      evoLab: {
        view: 'capstone',
        evoCapstone: projectState({
          trialPlan: plan,
          runs: [
            driftRun('run-1'),
            driftRun('run-2', undefined, {
              designKey: 'N=50|generations=50',
              factors: [
                { id: 'populationSize', label: 'Population size', value: 50 },
                { id: 'generations', label: 'Generations', value: 50 }
              ]
            })
          ]
        })
      }
    });

    expect(mismatchedHtml).toContain('Captured settings need attention');
    expect(mismatchedHtml).toContain('Tracked changes: Population size, Generations');
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
            claim: 'Across two repeated runs, the mean endpoint varied because drift is stochastic.',
            surprise: 'Each lineage followed a different path by chance.'
          },
          runs: [
            driftRun('run-1', undefined, { primaryValue: 0.2, primaryDisplay: '0.200' }),
            driftRun('run-2', undefined, { primaryValue: 0.4, primaryDisplay: '0.400' })
          ],
          nextRunId: 3,
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
    expect(html).toContain('Captured simulator runs');
    expect(html).toContain('Repeated-trial comparison');
    expect(html).toContain('mean absolute displacement from p(A) = 0.500 ranged from 0.200 to 0.400 (mean 0.300)');
    expect(html).toContain('Across two repeated runs, the mean endpoint varied because drift is stochastic.');
    expect(html).toContain('Mean absolute displacement from 0.500');
    expect((html.match(/scope="col"/g) || [])).toHaveLength(4);
    expect((html.match(/scope="row"/g) || [])).toHaveLength(2);
    expect(html).toContain('Five lineages for 100 generations.');
    expect(html).toContain('Three lineages fixed; two remained polymorphic.');
    expect(html).toContain('Evidence verdict:');
    expect(html).toContain('Partly supported');
    expect(html).toContain('4. Findings &amp; Reflection');
  });

  it('coaches repeated trials into an editable quantitative claim', () => {
    const { container, root } = mountEvo({
      evoLab: {
        view: 'capstone',
        evoCapstone: projectState({
          notebook: {
            baseline: 'N = 10 and p(A) = 0.500 at generation 0.',
            settings: 'Two repeats used the same settings.',
            outcome: 'The two run means differed.',
            claim: '',
            surprise: ''
          },
          runs: [
            driftRun('run-1', undefined, { primaryValue: 0.2, primaryDisplay: '0.200' }),
            driftRun('run-2', undefined, { primaryValue: 0.4, primaryDisplay: '0.400' })
          ],
          nextRunId: 3
        })
      }
    });

    expect(container.textContent).toContain('Repeated-trial comparison');
    expect(container.textContent).toContain('Settings match');
    expect(container.textContent).toContain('mean absolute displacement from p(A) = 0.500 ranged from 0.200 to 0.400 (mean 0.300)');
    expect(container.textContent).toContain('spread describes repeatability');

    const useStarter = Array.from(container.querySelectorAll('button'))
      .find((button) => (button.textContent || '').includes('Use claim starter'));
    expect(useStarter).toBeTruthy();
    act(() => useStarter.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('#evo-capstone-claim').value).toContain('Across 2 repeated runs');
    expect(container.querySelector('#evo-capstone-claim').value).toContain('this model does not include');
    expect(JSON.parse(window.localStorage.getItem('evoLab.capstone.v2')).notebook.claim).toContain('Across 2 repeated runs');
    expect(container.textContent).toContain('Claim already started');

    act(() => root.unmount());
  });

  it('warns against causal claims when captured settings differ', () => {
    const html = renderTool('evoLab', {
      evoLab: {
        view: 'capstone',
        evoCapstone: projectState({
          notebook: {
            baseline: 'The runs began at p(A) = 0.500.',
            settings: 'Population size changed between runs.',
            outcome: 'The mean final frequencies differed.',
            claim: '',
            surprise: ''
          },
          runs: [
            driftRun('run-1', undefined, { primaryValue: 0.4 }),
            driftRun('run-2', undefined, {
              designKey: 'N=50|generations=100',
              designLabel: 'N = 50 for 100 generations',
              primaryValue: 0.7,
              primaryDisplay: '0.700'
            })
          ],
          nextRunId: 3
        })
      }
    });

    expect(html).toContain('Changed-settings comparison');
    expect(html).toContain('2 setting combinations');
    expect(html).toContain('association unless every setting except one was held constant');
    expect(html).toContain('not a controlled causal test');
  });

  it('removes captured runs without erasing the student interpretation', () => {
    const { container, root } = mountEvo({
      evoLab: {
        view: 'capstone',
        evoCapstone: projectState({
          notebook: {
            baseline: 'My starting-condition interpretation stays here.',
            settings: 'I compared two repeat trials.',
            outcome: 'My outcome interpretation stays here too.',
            surprise: 'The endpoints differed between trials.'
          },
          runs: [driftRun(), driftRun('run-2', 'Final p(A): 0.100, 0.200, 0.300, 0.400, 0.500.')],
          nextRunId: 3
        })
      }
    });

    expect(container.querySelectorAll('th[scope="row"]')).toHaveLength(2);
    const removeFirst = container.querySelector('button[aria-label="Remove run 1 snapshot"]');
    act(() => removeFirst.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(container.querySelectorAll('th[scope="row"]')).toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem('evoLab.capstone.v2')).runs).toHaveLength(1);
    expect(container.querySelector('#evo-capstone-baseline').value).toBe('My starting-condition interpretation stays here.');

    const clearAll = container.querySelector('button[aria-label="Clear all saved run snapshots"]');
    act(() => clearAll.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('No simulator runs captured yet');
    expect(container.querySelector('#evo-capstone-outcome').value).toBe('My outcome interpretation stays here too.');
    expect(container.querySelector('button[aria-label="Advance to the next step"]').disabled).toBe(true);

    act(() => root.unmount());
  });

  it('shows the evidence bridge in each linked simulator', () => {
    for (const [view, label] of [
      ['geneticDrift', 'Genetic Drift Simulator'],
      ['selectionSandbox', 'Selection Sandbox'],
      ['antibioticLab', 'Antibiotic Resistance Lab'],
      ['coevolution', 'Coevolution Lab']
    ]) {
      const html = renderTool('evoLab', {
        evoLab: { view, evoCapstone: projectState({ module: view, moduleLabel: label }) }
      });
      expect(html).toContain(`data-evolab-capture="${view}"`);
      expect(html).toContain('Run required');
    }
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
