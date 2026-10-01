import { beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_volume.js';

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'volume');
});

describe('3D Volume Explorer water displacement mode', () => {
  it('calculates accurate and biased displacement trials deterministically', () => {
    const pure = window.__alloVolumePure;

    expect(pure.displacementObjects).toHaveLength(6);
    expect(pure.calculateDisplacementTrial(42, 18, 'careful')).toEqual({
      initial: 42,
      final: 60,
      measuredVolume: 18,
      acceptedVolume: 18,
      error: 0,
    });
    expect(pure.calculateDisplacementTrial(42, 18, 'bubble')).toMatchObject({
      final: 63,
      measuredVolume: 21,
      error: 3,
    });
    expect(pure.calculateDisplacementTrial(42, 18, 'partial')).toMatchObject({
      final: 53,
      measuredVolume: 11,
      error: -7,
    });
    expect(pure.calculateDisplacementTrial(42, 18, 'parallax')).toMatchObject({
      final: 62,
      measuredVolume: 20,
      error: 2,
    });
  });
  it('summarizes repeated trials without hiding error direction', () => {
    const summary = window.__alloVolumePure.summarizeDisplacementTrials([
      { measured: 18, accepted: 18, error: 0 },
      { measured: 21, accepted: 18, error: 3 },
      { measured: 11, accepted: 18 },
      { measured: 'not-a-number', accepted: 18 },
    ]);

    expect(summary).toEqual({
      count: 3,
      accurate: 1,
      over: 1,
      under: 1,
      meanError: -1.33,
      meanAbsoluteError: 3.33,
      largestAbsoluteError: 7,
      conclusion: 'The record includes both overestimates and underestimates. Setup choices changed the direction of the error.',
    });
  });



  it('detects readable and overflowed cylinder setups deterministically', () => {
    const pure = window.__alloVolumePure;

    expect(pure.assessCylinderCapacity(42, 18, 100)).toEqual({
      capacity: 100,
      initial: 42,
      displacedVolume: 18,
      final: 60,
      headroom: 58,
      overflow: false,
      overflowAmount: 0,
      readableFinal: 60,
    });
    expect(pure.assessCylinderCapacity(90, 18, 100)).toEqual({
      capacity: 100,
      initial: 90,
      displacedVolume: 18,
      final: 108,
      headroom: 10,
      overflow: true,
      overflowAmount: 8,
      readableFinal: null,
    });
  });


  it('calculates floating-object volume by subtracting the sinker-only baseline', () => {
    expect(window.__alloVolumePure.calculateSinkerCorrectionTrial(38, 20, 6)).toEqual({
      initial: 38,
      sinkerOnly: 44,
      final: 64,
      measuredVolume: 20,
      acceptedVolume: 20,
      error: 0,
      totalDisplacement: 26,
    });
  });

  it('cycles the same clay through three named shapes', () => {
    const pure = window.__alloVolumePure;

    expect(pure.clayShapes.map((shape) => shape.id)).toEqual(['lump', 'patty', 'column']);
    expect(pure.nextClayShapeId('lump')).toBe('patty');
    expect(pure.nextClayShapeId('patty')).toBe('column');
    expect(pure.nextClayShapeId('column')).toBe('lump');
  });



  it('renders an accessible elementary investigation and hides the cube viewport', () => {
    const waiting = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'elementary',
        dispCondition: 'bubble',
      },
    });

    expect(waiting).toContain('data-displacement-lab="true"');
    expect(waiting).toContain('Water Displacement Lab');
    expect(waiting).toContain('1 milliliter (mL) = 1 cubic centimeter (cm\u00B3)');
    expect(waiting).toContain('Final reading is hidden until the object is lowered into the water');
    expect(waiting).toContain('Grades 3-5');
    expect(waiting).not.toContain('Cork stopper');
    expect(waiting).not.toContain('Measurement conditions');
    expect(waiting).not.toContain('Interactive 3D viewport');

    const measured = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'elementary',
        dispCondition: 'bubble',
        dispSubmerged: true,
        dispPrediction: '20',
      },
    });

    expect(measured).toContain('60 mL - 42 mL = ?');
    expect(measured).toContain('Bottom of the water meniscus reads 60 milliliters');
    expect(measured).toContain('Your prediction: <strong>20 cm\u00B3</strong>');
    expect(measured).not.toContain('63 mL - 42 mL = ?');
  });

  it('shows starting-level invariance for direct and sinker baselines', () => {
    const waiting = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'middle',
        dispObjectId: 'stone',
        dispInitial: 70,
      },
    });

    expect(waiting).toContain('data-starting-level-comparison="true"');
    expect(waiting).toContain('data-comparison-state="prediction"');
    expect(waiting).toContain('aria-describedby="volume-cylinder-capacity-note volume-starting-level-comparison"');
    expect(waiting).toContain('Starting water changed from 42 to 70 mL. Predict whether final - initial will change.');
    expect(waiting).toContain('Predict whether changing the starting water level will change the displacement difference.');
    expect(waiting).not.toContain('both change by 18 mL');

    const measured = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'middle',
        dispObjectId: 'stone',
        dispInitial: 70,
        dispSubmerged: true,
      },
    });

    expect(measured).toContain('data-comparison-state="observed"');
    expect(measured).toContain('42 \u2192 60 and 70 \u2192 88 both change by 18 mL. Starting level changes the readings, not their difference.');

    const sinker = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'middle',
        dispObjectId: 'cork',
        dispInitial: 55,
        dispSubmerged: true,
      },
    });

    expect(sinker).toContain('Reference sinker-only 44 \u2192 combined 64; adjusted sinker-only 61 \u2192 combined 81. Both change by 20 mL.');
  });


  it('adds measurement-error and density reasoning for grades 6-8', () => {
    const html = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'middle',
        dispCondition: 'bubble',
        dispObjectId: 'stone',
        dispSubmerged: true,
        dispAnswer: '21',
        dispFeedback: { correct: true, msg: 'Correct measurement.' },
        dispSolved: 1,
      },
    });

    expect(html).toContain('Measurement conditions');
    expect(html).toContain('Air bubble attached');
    expect(html).toContain('63 mL - 42 mL = ?');
    expect(html).toContain('Middle school extension: accuracy and density');
    expect(html).toContain('Accepted volume');
    expect(html).toContain('+3 cm\u00B3');
    expect(html).toContain('47 g / 18 cm\u00B3 = 2.61 g/cm\u00B3');
  });

  it('uses sinker correction and buoyancy reasoning for a floating cork', () => {
    const html = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'middle',
        dispObjectId: 'cork',
        dispSubmerged: true,
        dispAnswer: '20',
        dispFeedback: { correct: true, msg: 'Correct measurement.' },
      },
    });

    expect(html).toContain('Cork stopper');
    expect(html).toContain('data-sinker-method="true"');
    expect(html).toContain('Floating object: sinker correction');
    expect(html).not.toContain('Measurement conditions');
    expect(html).toContain('Sinker only');
    expect(html).toContain('Sinker + object');
    expect(html).toContain('data-sinker-state="alone"');
    expect(html).toContain('data-sinker-state="combined"');
    expect(html).toContain('Bottom of the water meniscus reads 44 milliliters, with the metal sinker submerged.');
    expect(html).toContain('Bottom of the water meniscus reads 64 milliliters, with the metal sinker and Cork stopper fully submerged.');
    expect(html).toContain('64 mL - 44 mL = ?');
    expect(html).toContain('3. Calculate combined - sinker-only');
    expect(html).toContain('5 g / 20 cm\u00B3 = 0.25 g/cm\u00B3');
    expect(html).toContain('Subtract the sinker-only reading from the sinker-plus-object reading');
    expect(html).toContain('use combined minus sinker-only');
    expect(html).not.toContain('use final minus initial');
    expect(html).toContain('is less than water&#x27;s density');
    expect(html).toContain('so this specimen floats');
  });

  it('shows that reshaping the same clay conserves its volume', () => {
    const html = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'middle',
        dispObjectId: 'clay',
        dispClayShape: 'patty',
        dispClayReshaped: true,
        dispSubmerged: true,
      },
    });

    expect(html).toContain('data-clay-conservation="true"');
    expect(html).toContain('Same clay, different shape: Flat patty');
    expect(html).toContain('data-clay-shape="patty"');
    expect(html).toContain('Bottom of the water meniscus reads 57 milliliters, with the Clay figure shaped as a flat patty fully submerged.');
    expect(html).toContain('No clay was added or removed.');
    expect(html).toContain('accepted volume stays 26 cm\u00B3 and the final reading stays 57 mL.');
  });



  it('represents partial immersion honestly in visuals and accessible text', () => {
    const html = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'middle',
        dispCondition: 'partial',
        dispObjectId: 'stone',
        dispSubmerged: true,
      },
    });

    expect(html).toContain('Only partly submerged');
    expect(html).toContain('data-immersion="partial"');
    expect(html).toContain('Partly submerged');
    expect(html).toContain('with the River stone only partly submerged.');
    expect(html).toContain('\u2713 Object partly submerged');
    expect(html).toContain('This setup changes the reading');
    expect(html).not.toContain('Fully submerged');
  });

  it('distinguishes formula agreement from measurement bias', () => {
    const renderBlock = (condition, answer) => renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'middle',
        dispCondition: condition,
        dispObjectId: 'block',
        dispSubmerged: true,
        dispAnswer: String(answer),
        dispFeedback: { correct: true, msg: 'Correct measurement.' },
      },
    });

    const careful = renderBlock('careful', 24);
    expect(careful).toContain('Formula check:');
    expect(careful).toContain('4 x 3 x 2 = 24 cm\u00B3. Both methods agree.');

    const bubble = renderBlock('bubble', 27);
    expect(bubble).toContain('4 x 3 x 2 = 24 cm\u00B3');
    expect(bubble).toContain(
      'The displacement result is 27 cm\u00B3 (difference: +3 cm\u00B3). This condition introduced measurement error.',
    );
    expect(bubble).not.toContain('Both methods agree.');
  });

  it('compares repeated middle-school trials with an accessible signed-error plot', () => {
    const html = renderTool('volume', {
      _volume: {
        mode: 'displacement',
        dispLevel: 'middle',
        dispSolved: 3,
        dispTrials: [
          { id: 'careful', object: 'River stone', initial: 42, final: 60, measured: 18, accepted: 18, error: 0, condition: 'Careful setup' },
          { id: 'bubble', object: 'River stone', initial: 42, final: 63, measured: 21, accepted: 18, error: 3, condition: 'Air bubble attached' },
          { id: 'partial', object: 'River stone', initial: 42, final: 53, measured: 11, accepted: 18, error: -7, condition: 'Only partly submerged' },
        ],
      },
    });

    expect(html).toContain('Accuracy evidence across trials');
    expect(html).toContain('The record includes both overestimates and underestimates');
    expect(html).toContain('Mean signed error');
    expect(html).toContain('-1.33 cm\u00B3');
    expect(html).toContain('Mean absolute error');
    expect(html).toContain('3.33 cm\u00B3');
    expect(html).toContain('data-trial-error-plot="true"');
    expect(html).toContain('aria-label="Measurement error plot.');
    expect(html).toContain('data-error-direction="accurate"');
    expect(html).toContain('data-error-direction="over"');
    expect(html).toContain('data-error-direction="under"');
    expect(html).toContain('Accepted volume');
    expect(html).toContain('<th scope="col"');
    expect(html).toContain('+3 cm\u00B3');
    expect(html).toContain('-7 cm\u00B3');
  });


  it('exposes a three-trial quest hook', () => {
    const cfg = window.StemLab._registry.volume;
    const hook = cfg.questHooks.find((item) => item.id === 'displacement_3');

    expect(hook.check({ dispSolved: 2 })).toBe(false);
    expect(hook.check({ dispSolved: 3 })).toBe(true);
    expect(hook.progress({ dispSolved: 2 })).toBe('2/3 trials');
  });

  it('completes and records a floating-object sinker trial', async () => {
    const cfg = window.StemLab._registry.volume;
    const container = document.createElement('div');
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    function Host() {
      const [toolData, setToolData] = React.useState({
        _volume: { mode: 'displacement', dispLevel: 'middle', dispObjectId: 'cork' },
      });
      return cfg.render(makeCtx({ toolData, setToolData }));
    }

    const root = ReactDOMClient.createRoot(container);
    const setInputValue = (input, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    };
    const buttonWithText = (text) => Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes(text));

    try {
      await React.act(async () => {
        root.render(React.createElement(Host));
      });

      await React.act(async () => buttonWithText('Lower cork with sinker').click());
      expect(container.textContent).toContain('64 mL - 44 mL = ?');

      const answer = container.querySelector(
        'input[aria-label="Calculated displaced volume in cubic centimeters"]',
      );
      await React.act(async () => setInputValue(answer, '20'));
      await React.act(async () => buttonWithText('Check').click());

      expect(container.textContent).toContain('Correct: 64 - 44 = 20 mL');
      expect(container.textContent).toContain('Baseline reading');
      expect(container.textContent).toContain('Sinker correction (careful setup)');
      expect(answer.disabled).toBe(true);
    } finally {
      await React.act(async () => root.unmount());
      container.remove();
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });

  it('keeps the water reading constant as learners reshape the same clay', async () => {
    const cfg = window.StemLab._registry.volume;
    const container = document.createElement('div');
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    function Host() {
      const [toolData, setToolData] = React.useState({
        _volume: { mode: 'displacement', dispLevel: 'elementary', dispObjectId: 'clay' },
      });
      return cfg.render(makeCtx({ toolData, setToolData }));
    }

    const root = ReactDOMClient.createRoot(container);
    const buttonWithText = (text) => Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes(text));

    try {
      await React.act(async () => {
        root.render(React.createElement(Host));
      });

      expect(container.textContent).toContain('Same clay, different shape: Rounded lump');
      expect(container.textContent).toContain('Reshape the clay without adding or removing material');
      await React.act(async () => buttonWithText('Reshape clay').click());
      expect(container.textContent).toContain('Same clay, different shape: Flat patty');
      expect(container.textContent).toContain('No clay was added or removed.');
      expect(container.textContent).toContain('Lower it to test your prediction.');
      expect(container.textContent).not.toContain('accepted volume stays 26 cm\u00B3');

      await React.act(async () => buttonWithText('Lower object into water').click());
      expect(container.textContent).toContain('57 mL - 31 mL = ?');
      expect(container.querySelector('[data-clay-shape="patty"]')).not.toBeNull();

      await React.act(async () => buttonWithText('Reshape clay').click());
      expect(container.textContent).toContain('Same clay, different shape: Tall column');
      expect(container.textContent).toContain('the final reading stays 57 mL.');
      expect(container.querySelector('[data-clay-shape="column"]')).not.toBeNull();
    } finally {
      await React.act(async () => root.unmount());
      container.remove();
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });



  it('lets learners revise an overflowed setup into a readable trial', async () => {
    const cfg = window.StemLab._registry.volume;
    const container = document.createElement('div');
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    function Host() {
      const [toolData, setToolData] = React.useState({
        _volume: {
          mode: 'displacement',
          dispLevel: 'middle',
          dispObjectId: 'stone',
          dispInitial: 90,
        },
      });
      return cfg.render(makeCtx({ toolData, setToolData }));
    }

    const root = ReactDOMClient.createRoot(container);
    const setInputValue = (input, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    };
    const buttonWithText = (text) => Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes(text));

    try {
      await React.act(async () => {
        root.render(React.createElement(Host));
      });

      const initialWater = container.querySelector(
        'input[aria-label="Initial water level in milliliters"]',
      );
      expect(initialWater.value).toBe('90');
      expect(container.textContent).toContain('Empty space above the water: 10 mL');

      await React.act(async () => buttonWithText('Lower object into water').click());

      expect(container.querySelector('[data-cylinder-overflow="true"]')).not.toBeNull();
      expect(container.querySelector('[data-overflow-feedback="true"]')).not.toBeNull();
      expect(container.textContent).toContain('Overflow: water passed the 100 mL mark');
      expect(container.querySelector('[data-starting-level-comparison][data-comparison-state="overflow"]')).not.toBeNull();
      expect(container.textContent).toContain('Starting water changed from 42 to 90 mL, so this trial cannot test the difference.');
      expect(container.textContent).toContain('Lower the initial water level and repeat so the final reading stays within the cylinder.');
      expect(container.textContent).toContain('Final reading unavailable - revise the setup');
      expect(container.querySelector('svg[aria-label*="Water overflowed past the 100 milliliter cylinder capacity"]')).not.toBeNull();

      const answer = container.querySelector(
        'input[aria-label="Calculated displaced volume in cubic centimeters"]',
      );
      expect(answer.disabled).toBe(true);
      expect(container.textContent).not.toContain('108 mL - 90 mL = ?');

      await React.act(async () => setInputValue(initialWater, '70'));

      expect(container.querySelector('[data-overflow-feedback="true"]')).toBeNull();
      expect(container.textContent).toContain('70 mL starting water');
      expect(buttonWithText('Lower object into water')).toBeDefined();
      expect(container.querySelector('[data-comparison-state="prediction"]')).not.toBeNull();
      expect(container.textContent).toContain('Starting water changed from 42 to 70 mL. Predict whether final - initial will change.');

      await React.act(async () => buttonWithText('Lower object into water').click());

      expect(container.textContent).toContain('88 mL - 70 mL = ?');
      expect(container.querySelector('[data-comparison-state="observed"]')).not.toBeNull();
      expect(container.textContent).toContain('42 \u2192 60 and 70 \u2192 88 both change by 18 mL.');
      expect(answer.disabled).toBe(false);
    } finally {
      await React.act(async () => root.unmount());
      container.remove();
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });


  it('completes the predict, submerge, calculate, and record interaction', async () => {
    const cfg = window.StemLab._registry.volume;
    const container = document.createElement('div');
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    function Host() {
      const [toolData, setToolData] = React.useState({
        _volume: { mode: 'displacement', dispLevel: 'elementary' },
      });
      return cfg.render(makeCtx({ toolData, setToolData }));
    }

    const root = ReactDOMClient.createRoot(container);
    const setInputValue = (input, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    };
    const buttonWithText = (text) => Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes(text));

    try {
      await React.act(async () => {
        root.render(React.createElement(Host));
      });

      const prediction = container.querySelector(
        'input[aria-label="Predicted object volume in cubic centimeters"]',
      );
      await React.act(async () => setInputValue(prediction, '20'));
      await React.act(async () => buttonWithText('Lower object into water').click());

      expect(container.textContent).toContain('60 mL - 42 mL = ?');

      const answer = container.querySelector(
        'input[aria-label="Calculated displaced volume in cubic centimeters"]',
      );
      await React.act(async () => setInputValue(answer, '18'));
      await React.act(async () => buttonWithText('Check').click());

      expect(container.textContent).toContain(
        'the observed displaced volume is 18 cm\u00B3',
      );
      expect(container.textContent).toContain('Trial record');
      expect(container.textContent).toContain('1 completed');
      expect(answer.disabled).toBe(true);
    } finally {
      await React.act(async () => root.unmount());
      container.remove();
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
});
