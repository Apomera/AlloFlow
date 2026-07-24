import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, TimelineStudio, root, host, openSpy;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('timeline_revision_module.js');
  loadAlloModule('timeline_studio_module.js');
  TimelineStudio = window.AlloModules.TimelineStudio;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  if (openSpy) { openSpy.mockRestore(); openSpy = null; }
});

function button(text) {
  return Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes(text));
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Timeline Studio rendered topic-research flow', () => {
  it('opens synchronously, runs both grounded calls, and posts a sourced timeline', async () => {
    const events = [
      { start_date: { year: '1961' }, text: { headline: 'Apollo program begins', text: 'NASA starts the Apollo program.' } },
      { start_date: { year: '1969', month: '7', day: '20' }, text: { headline: 'Apollo 11 Moon landing', text: 'Apollo 11 lands on the Moon.' } },
    ];
    const raw = JSON.stringify({ title: { text: { headline: 'Apollo program', text: 'Key events.' } }, events });
    const sourceIndex = raw.indexOf('Apollo 11 Moon landing');
    const researchResponse = {
      text: raw,
      groundingMetadata: {
        groundingChunks: [{ web: { title: 'NASA Apollo history', uri: 'https://www.nasa.gov/history/apollo/' } }],
        groundingSupports: [{ segment: { startIndex: sourceIndex, endIndex: sourceIndex + 80 }, groundingChunkIndices: [0] }],
      },
    };
    const verifyResponse = {
      text: JSON.stringify(events.map((_, index) => ({ index, isFactuallyAccurate: true, isPositionCorrect: true, concern: '', rationale: 'Confirmed by sources.' }))),
      groundingMetadata: { groundingChunks: [] },
    };
    const order = [];
    const calls = [];
    const callGemini = vi.fn(async (prompt, jsonMode, useSearch, temperature) => {
      order.push('ai');
      calls.push({ prompt, jsonMode, useSearch, temperature });
      return calls.length === 1 ? researchResponse : verifyResponse;
    });
    const popup = { closed: false, focus: vi.fn(), postMessage: vi.fn() };
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => { order.push('open'); return popup; });

    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(TimelineStudio, { onClose: () => {}, callGemini, addToast: () => {} }));
    });
    await act(async () => {
      button('Describe a topic').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      setInputValue(host.querySelector('#allo-timeline-topic'), 'The Apollo program');
    });
    await act(async () => {
      button('Research & build').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(order[0]).toBe('open');
    expect(calls).toHaveLength(2);
    calls.forEach((call) => {
      expect(call.jsonMode).toBe(false);
      expect(call.useSearch).toBe(true);
    });
    expect(calls[0].temperature).toBe(0.3);
    expect(calls[1].temperature).toBe(0.2);
    expect(host.textContent).toContain('2 events');
    expect(host.textContent).toContain('1/2 tied to a web source');
    expect(host.textContent).toContain('accuracy check: all clear');
    expect(popup.postMessage).toHaveBeenCalled();
    const payload = popup.postMessage.mock.calls.at(-1)[0];
    expect(payload.type).toBe('allotimeline-data');
    expect(payload.timeline.events).toHaveLength(2);
    expect(payload.timeline.events[1].text.text).toContain('https://www.nasa.gov/history/apollo/');
    expect(payload.timeline.title.text.text).toContain('AI-researched from web sources');
  });
});
