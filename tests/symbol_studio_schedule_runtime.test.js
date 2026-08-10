import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupSymbolStudio, baseProps } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let SymbolStudio;
let root;
let host;

beforeAll(() => {
  ({ React, SymbolStudio } = setupSymbolStudio());
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  localStorage.clear();
});

describe('Symbol Studio visual schedule runtime', () => {
  it('generates ordered steps and supports reorder, completion, and removal', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const props = baseProps({
      initialTab: 'schedule',
      onCallImagen: async () => 'data:image/png;base64,AA==',
    });

    await act(async () => {
      root.render(React.createElement(SymbolStudio, props));
      await Promise.resolve();
    });

    const textarea = host.querySelector('textarea[aria-label="Sequence steps, one per line"]');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => {
      valueSetter.call(textarea, 'First\nSecond\nThird');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const generate = host.querySelector('button[aria-label="Generate visual sequence"]');
    await act(async () => {
      generate.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    let steps = Array.from(host.querySelectorAll('[role="list"][aria-label$="ordered steps"] > [role="listitem"]'));
    expect(steps).toHaveLength(3);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(steps[0].querySelector('button')).toBeTruthy();

    const moveSecondEarlier = steps[1].querySelector('button[aria-label="Move Second earlier"]');
    act(() => moveSecondEarlier.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    steps = Array.from(host.querySelectorAll('[role="list"][aria-label$="ordered steps"] > [role="listitem"]'));
    expect(steps[0].textContent).toContain('Second');
    expect(steps[1].textContent).toContain('First');

    const current = steps.find((step) => step.getAttribute('aria-current') === 'step');
    const markDone = Array.from(current.querySelectorAll('button')).find((button) => button.textContent === 'Mark done');
    act(() => markDone.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    steps = Array.from(host.querySelectorAll('[role="list"][aria-label$="ordered steps"] > [role="listitem"]'));
    expect(steps.some((step) => step.textContent.includes('DONE'))).toBe(true);
    expect(steps.filter((step) => step.getAttribute('aria-current') === 'step')).toHaveLength(1);

    const removeThird = host.querySelector('button[aria-label="Remove Third from sequence"]');
    act(() => removeThird.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    steps = Array.from(host.querySelectorAll('[role="list"][aria-label$="ordered steps"] > [role="listitem"]'));
    expect(steps).toHaveLength(2);

    const currentStep = steps.find((step) => step.getAttribute('aria-current') === 'step');
    const finishCurrent = Array.from(currentStep.querySelectorAll('button')).find((button) => button.textContent === 'Mark done');
    act(() => finishCurrent.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    steps = Array.from(host.querySelectorAll('[role="list"][aria-label$="ordered steps"] > [role="listitem"]'));
    expect(steps.filter((step) => step.getAttribute('aria-current') === 'step')).toHaveLength(0);

    const reopenFirst = Array.from(steps.find((step) => step.textContent.includes('First')).querySelectorAll('button')).find((button) => button.textContent === 'Mark not done');
    act(() => reopenFirst.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    steps = Array.from(host.querySelectorAll('[role="list"][aria-label$="ordered steps"] > [role="listitem"]'));
    expect(steps.find((step) => step.textContent.includes('First')).getAttribute('aria-current')).toBe('step');
  });

  it('builds a titled visual sequence from a learner topic', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    let imagenCalls = 0;
    const props = baseProps({
      initialTab: 'schedule',
      onCallGemini: async () => JSON.stringify({
        title: 'Wash hands',
        steps: ['Turn on water', 'Use soap', 'Rinse hands'],
      }),
      onCallImagen: async () => {
        imagenCalls += 1;
        return 'data:image/png;base64,AA==';
      },
    });

    await act(async () => {
      root.render(React.createElement(SymbolStudio, props));
      await Promise.resolve();
    });

    const topic = host.querySelector('input[aria-label="Sequence topic or task"]');
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      inputSetter.call(topic, 'washing hands');
      topic.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const build = host.querySelector('button[aria-label="Build visual sequence from topic"]');
    await act(async () => {
      build.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(host.querySelector('textarea[aria-label="Sequence steps, one per line"]').value)
      .toBe('Turn on water\nUse soap\nRinse hands');
    expect(host.querySelector('input[aria-label="Sequence title"]').value).toBe('Wash hands');
    const steps = host.querySelectorAll('[role="list"][aria-label$="ordered steps"] > [role="listitem"]');
    expect(steps).toHaveLength(3);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(imagenCalls).toBe(3);
  });
});
