import { beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_brainatlas.js';

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'brainAtlas');
});

describe('Brain Atlas prenatal development timeline', () => {
  it('draws the timeline and synchronizes week, milestone, and detail selection', async () => {
    const cfg = window.StemLab._registry.brainAtlas;
    const container = document.createElement('div');
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    const drawnText = [];
    const noop = function() {};
    const gradient = { addColorStop: noop };
    const originalCanvasGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = function() {
      return {
        setTransform: noop,
        clearRect: noop,
        save: noop,
        restore: noop,
        fillRect: noop,
        strokeRect: noop,
        beginPath: noop,
        closePath: noop,
        roundRect: noop,
        rect: noop,
        arc: noop,
        ellipse: noop,
        moveTo: noop,
        lineTo: noop,
        bezierCurveTo: noop,
        quadraticCurveTo: noop,
        fill: noop,
        stroke: noop,
        setLineDash: noop,
        translate: noop,
        rotate: noop,
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        measureText: (text) => ({ width: String(text || '').length * 6 }),
        fillText: (text) => drawnText.push(String(text)),
      };
    };

    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    window.requestAnimationFrame = () => 1;
    window.cancelAnimationFrame = noop;

    function Host() {
      const [toolData, setToolData] = React.useState({
        brainAtlas: {
          view: 'prenatalDevelopment',
          viewGroup: 'development',
          prenatalWeek: 4,
        },
      });
      return cfg.render(makeCtx({ toolData, setToolData }));
    }

    const root = ReactDOMClient.createRoot(container);
    const setNativeValue = (element, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(element, value);
    };

    try {
      await React.act(async () => {
        root.render(React.createElement(Host));
      });

      expect(container.querySelectorAll('[data-brainatlas-prenatal-stage]')).toHaveLength(6);
      expect(container.querySelector('[data-brainatlas-prenatal-week]').textContent).toBe('Week 4');
      expect(drawnText).toContain('Brain development before birth');

      const week = container.querySelector('#brainatlas-prenatal-week');
      await React.act(async () => {
        setNativeValue(week, '24');
        week.dispatchEvent(new window.Event('change', { bubbles: true }));
      });

      expect(container.querySelector('[data-brainatlas-prenatal-week]').textContent).toBe('Week 24');
      expect(container.querySelector('[data-brainatlas-prenatal-stage="prenatal_connections"]').getAttribute('aria-pressed')).toBe('true');
      expect(container.textContent).toMatch(/Connections organize/);

      const finalStage = container.querySelector('[data-brainatlas-prenatal-stage="prenatal_folding_networks"]');
      await React.act(async () => finalStage.click());

      expect(container.querySelector('[data-brainatlas-prenatal-week]').textContent).toBe('Week 34');
      expect(finalStage.getAttribute('aria-pressed')).toBe('true');
      expect(container.textContent).toMatch(/Folding and networks/);
      expect(container.textContent).toMatch(/Development continues/);
      expect(container.querySelector('[data-brainatlas-fullscreen="true"]')).not.toBeNull();
    } finally {
      await React.act(async () => root.unmount());
      container.remove();
      window.HTMLCanvasElement.prototype.getContext = originalCanvasGetContext;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
});
