import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let React, createRoot, act, Modal, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const { transformSync } = require('@babel/core');
  const jsx = require('@babel/plugin-transform-react-jsx');
  const compiled = transformSync(readFileSync(resolve('view_kokoro_offer_modal_source.jsx'), 'utf8'),
    { babelrc: false, configFile: false, plugins: [jsx] }).code;
  Modal = new Function('React', compiled + '\nreturn KokoroOfferModal;')(React);
});
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = null; host = null;
  vi.restoreAllMocks();
  for (const key of ['_kokoroTTS', '__loadKokoroTTS', '__kokoroTTSDownloading', '__alloFocusTrapStack']) delete window[key];
});
function mount() {
  const props = { setShowKokoroOfferModal: vi.fn(), setSelectedVoice: vi.fn(), addToast: vi.fn() };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(Modal, props)));
  return props;
}
const download = () => Array.from(host.querySelectorAll('button')).find(button => button.textContent.includes('Download Voice'));

describe('truthful offline voice offer', () => {
  it('uses a neutral failure cause and distinguishes the model download from saved clips', () => {
    mount();
    expect(host.querySelector('#kokoro-offer-reason').textContent).toContain('reported cause');
    expect(host.querySelector('#kokoro-offer-reason').textContent).not.toMatch(/quota|network issue/);
    expect(host.textContent).toContain('~88MB');
    expect(host.textContent).toContain('sentence clips for offline playback are separate steps');
    expect(host.textContent).toContain("depends on this browser's storage");
  });
  it('requires a ready engine before selecting the offline voice', async () => {
    window.__loadKokoroTTS = vi.fn(async () => true);
    const props = mount(); await act(async () => { download().click(); });
    expect(props.setSelectedVoice).not.toHaveBeenCalled();
    expect(props.addToast).toHaveBeenLastCalledWith(expect.stringContaining('did not finish'), 'error');
    expect(window.__kokoroTTSDownloading).toBe(false);
  });
  it('reports model readiness without claiming sentence clips have been saved', async () => {
    window.__loadKokoroTTS = vi.fn(async () => { window._kokoroTTS = { ready: true }; return true; });
    const props = mount(); await act(async () => { download().click(); });
    expect(props.setSelectedVoice).toHaveBeenCalledWith('af_heart');
    expect(props.addToast).toHaveBeenLastCalledWith(expect.stringContaining('prepared and saved separately'), 'success');
  });
  it('keeps an active model preparation instead of starting another download', async () => {
    window.__kokoroTTSDownloading = true; window.__loadKokoroTTS = vi.fn();
    const props = mount(); await act(async () => { download().click(); });
    expect(window.__loadKokoroTTS).not.toHaveBeenCalled();
    expect(props.addToast).toHaveBeenLastCalledWith(expect.stringContaining('already running'), 'info');
  });
  it('retains Escape dismissal and restores the invoking control after unmount', () => {
    const invoker = document.createElement('button'); document.body.append(invoker); invoker.focus();
    const props = mount();
    expect(host.querySelector('[role="dialog"]').contains(document.activeElement)).toBe(true);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(props.setShowKokoroOfferModal).toHaveBeenCalledWith(false);
    act(() => root.unmount()); root = null;
    expect(document.activeElement).toBe(invoker); invoker.remove();
  });
});
