import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalMatchMedia = window.matchMedia;
let root, host, snapshots, current, config;
function input(id, value) {
  const element = host.querySelector('#' + id);
  const prototype = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
async function click(selector) {
  await act(async () => { host.querySelector(selector).click(); });
}
async function mount(compact = false) {
  window.matchMedia = vi.fn(query => ({ matches: compact && query === '(max-width: 1279px)', addEventListener() {}, removeEventListener() {} }));
  function Harness() {
    const [data, setData] = React.useState({ artStudio: { tab: 'pixel', studioHome: false, pixelData: { '1,1': '#f00' } } });
    const [studies, setStudies] = React.useState([]);
    snapshots = studies; current = data;
    return config.render(makeCtx({ toolData: data, setToolData: setData, toolSnapshots: studies, setToolSnapshots: setStudies }));
  }
  await act(async () => { root.render(React.createElement(Harness)); });
}
beforeEach(() => {
  resetStemLab();
  const context = new Proxy({}, { get: (_target, key) => key === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }) : vi.fn() });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(window.HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,notes');
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove(); vi.restoreAllMocks(); window.matchMedia = originalMatchMedia;
});

describe('Art Studio study notes', () => {
  it('saves free-study intentions and descriptions and carries them into a variation', async () => {
    await mount();
    await act(async () => {
      input('artstudio-study-title', 'Night garden');
      input('artstudio-study-intention', 'Make one flower stand out.');
      input('artstudio-study-note', 'Try a brighter center.');
      input('artstudio-study-description', 'A yellow flower on a dark blue square.');
    });
    await click('input[name="artstudio-free-reflection"][value="change"]');
    await click('button[aria-label="Save current study"]');
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].artStudioStudy).toMatchObject({
      threadId: '', title: 'Night garden', intention: 'Make one flower stand out.',
      reflection: 'change', note: 'Try a brighter center.',
      description: 'A yellow flower on a dark blue square.',
      previewAlt: 'A yellow flower on a dark blue square.',
    });
    await act(async () => { input('artstudio-study-title', 'Different work'); input('artstudio-study-note', 'Changed note'); });
    await click('#artstudio-process-button');
    await click('button[aria-label="Fork Night garden as a new variation"]');
    expect(host.querySelector('#artstudio-study-title').value).toBe('Night garden');
    expect(host.querySelector('#artstudio-study-note').value).toBe('Try a brighter center.');
    expect(current.artStudio.studioStudyDrafts.pixel.description).toBe('A yellow flower on a dark blue square.');
    expect(snapshots[0].artStudioStudy.title).toBe('Night garden');
  });

  it('opens and dismisses the compact inspector without changing the active drawing', async () => {
    await mount(true);
    const dialog = host.querySelector('dialog[data-artstudio-inspector-shell]');
    expect(dialog).not.toBeNull();
    expect(dialog.open).toBe(false);
    await click('#artstudio-kit-button');
    expect(dialog.open).toBe(true);
    expect(current.artStudio.pixelData).toEqual({ '1,1': '#f00' });
    await act(async () => { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); });
    expect(dialog.open).toBe(false);
    expect(host.querySelector('#artstudio-kit-button').getAttribute('aria-expanded')).toBe('false');
    await click('#artstudio-learn-button');
    expect(dialog.open).toBe(true);
    await act(async () => { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); });
    expect(host.querySelector('#artstudio-learn-button').getAttribute('aria-expanded')).toBe('false');
    await click('#artstudio-learn-button');
    expect(dialog.open).toBe(true);
    await act(async () => { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); });
    await click('#artstudio-process-button');
    expect(dialog.open).toBe(true);
    await act(async () => { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); });
    expect(host.querySelector('#artstudio-process-button').getAttribute('aria-expanded')).toBe('false');
    await click('#artstudio-process-button');
    expect(dialog.open).toBe(true);
    expect(current.artStudio.tab).toBe('pixel');
    expect(current.artStudio.pixelData).toEqual({ '1,1': '#f00' });
  });
});
