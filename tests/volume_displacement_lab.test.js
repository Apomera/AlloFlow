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

    expect(pure.displacementObjects).toHaveLength(5);
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
    expect(waiting).toContain('Final reading is hidden until the object is submerged');
    expect(waiting).toContain('Grades 3-5');
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

  it('exposes a three-trial quest hook', () => {
    const cfg = window.StemLab._registry.volume;
    const hook = cfg.questHooks.find((item) => item.id === 'displacement_3');

    expect(hook.check({ dispSolved: 2 })).toBe(false);
    expect(hook.check({ dispSolved: 3 })).toBe(true);
    expect(hook.progress({ dispSolved: 2 })).toBe('2/3 trials');
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
        'the measured object volume is 18 cm\u00B3',
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
