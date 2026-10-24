import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let api, languageUtilities, speech, root, host;
const spanish = { name: 'Google español', lang: 'es-ES' };
const resource = language => ({ id: 'device-lesson', type: 'device-voice-test', data: { language } });

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({});
  loadAlloModule('module_scope_extras_module.js');
  languageUtilities = window.AlloModules.ModuleScopeExtras;
  loadAlloModule('resource_read_aloud_module.js');
  api = window.AlloModules.ResourceReadAloud;
  api.register('device-voice-test', (_resource, add) => add('directions', 'Una idea para explicar.'));
});
beforeEach(() => {
  speech = { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => [spanish]) };
  vi.stubGlobal('speechSynthesis', speech);
  window.speechSynthesis = speech;
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
  delete window.__alloGetReadAloudAudioBridge;
  delete window.AlloModules.ModuleScopeExtras;
  delete window.getSpeechLangCode;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  window.AlloModules.ModuleScopeExtras = languageUtilities;
  window.getSpeechLangCode = languageUtilities.getSpeechLangCode;
  delete window.__alloGetReadAloudAudioBridge;
  vi.unstubAllGlobals();
});

async function read(component, props = {}) {
  act(() => root.render(React.createElement(api[component], { text: 'Mi explicación.', ...props })));
  const button = [...host.querySelectorAll('button')].find(button => button.textContent === (component === 'Controls' ? 'Read reference aloud' : 'Read my writing'));
  expect(button).toBeTruthy();
  await act(async () => { button.click(); });
  return speech.speak.mock.calls[0]?.[0];
}

describe.each(['Controls', 'LocalText'])('%s device speech settings', component => {
  it('resolves Spanish without the optional language module or English voice-name matching', async () => {
    const misleading = { name: 'Spanish classroom helper', lang: 'en-US' };
    speech.getVoices.mockReturnValue([misleading, spanish]);
    const utterance = await read(component, { resource: resource('Spanish'), voiceVolume: 0.4, voiceSpeed: 1.3 });
    expect(utterance).toMatchObject({ voice: spanish, lang: 'es-ES', rate: 1.3, volume: 0.4 });
  });

  it('prefers the exact region over a voice earlier in the same language family', async () => {
    const mexican = { name: 'Voz mexicana', lang: 'es-MX' };
    speech.getVoices.mockReturnValue([mexican, spanish]);
    const utterance = await read(component, { resource: resource('es-es') });
    expect(utterance.voice).toBe(spanish);
    expect(utterance.lang).toBe('es-ES');
  });

  it('falls back to the requested language family when the requested region is unavailable', async () => {
    const mexican = { name: 'Voz mexicana', lang: 'es-MX' };
    speech.getVoices.mockReturnValue([{ name: 'Spanish voice', lang: 'en-US' }, mexican]);
    const utterance = await read(component, { resource: resource('es_AR') });
    expect(utterance.voice).toBe(mexican);
    expect(utterance.lang).toBe('es-MX');
  });

  it('retains named regional languages before the full resolver loads', async () => {
    const canadian = { name: 'Sylvie', lang: 'fr-CA' };
    speech.getVoices.mockReturnValue([{ name: 'Français', lang: 'fr-FR' }, canadian]);
    const utterance = await read(component, { resource: resource('French (Canadian)') });
    expect(utterance.voice).toBe(canadian);
    expect(utterance.lang).toBe('fr-CA');
  });

  it('uses the existing full language resolver for additional lesson languages', async () => {
    const swahili = { name: 'Device voice', lang: 'sw-KE' };
    window.AlloModules.ModuleScopeExtras = languageUtilities;
    const resolver = vi.spyOn(languageUtilities, 'getSpeechLangCode');
    try {
      speech.getVoices.mockReturnValue([swahili]);
      const utterance = await read(component, { resource: resource('Swahili') });
      expect(resolver).toHaveBeenCalledWith('Swahili');
      expect(utterance).toMatchObject({ voice: swahili, lang: 'sw-KE' });
    } finally { resolver.mockRestore(); }
  });

  it.each(['missing', 'empty', 'throws'])('keeps a known language tag when the voice list is %s', async availability => {
    if (availability === 'missing') delete speech.getVoices;
    else if (availability === 'empty') speech.getVoices.mockReturnValue([]);
    else speech.getVoices.mockImplementation(() => { throw new Error('Not available yet'); });
    const utterance = await read(component, { resource: resource('Spanish'), voiceVolume: 0 });
    expect(utterance).toMatchObject({ lang: 'es-ES', volume: 0, rate: 1 });
    expect(utterance.voice).toBeUndefined();
  });

  it.each(["K’iche’", 'toString'])('leaves an unrecognized language to the device default without guessing a voice: %s', async language => {
    speech.getVoices.mockReturnValue([{ name: language + ' voice', lang: 'en-US' }]);
    const utterance = await read(component, { resource: resource(language), voiceVolume: 0.2 });
    expect(utterance.voice).toBeUndefined();
    expect(utterance.lang).toBeUndefined();
    expect(utterance.volume).toBe(0.2);
  });

  it('does not mistake the shared resolver English default for a recognized language', async () => {
    window.AlloModules.ModuleScopeExtras = languageUtilities;
    speech.getVoices.mockReturnValue([{ name: 'K’iche’ classroom voice', lang: 'en-US' }]);
    const utterance = await read(component, { resource: resource('K’iche’') });
    expect(utterance.voice).toBeUndefined();
    expect(utterance.lang).toBeUndefined();
  });

  it.each([
    [0, 0], [0.35, 0.35], [undefined, 1], [null, 1], ['', 1], ['invalid', 1], [NaN, 1], [Infinity, 1], [-2, 0], [2, 1]
  ])('applies volume %s as %s', async (voiceVolume, expected) => {
    const utterance = await read(component, { resource: resource('Spanish'), voiceVolume });
    expect(utterance.volume).toBe(expected);
  });

  it.each([[undefined, 1], [null, 1], ['invalid', 1], [Infinity, 1], [0, 0.5], [0.8, 0.8], [3, 2]])('bounds rate %s as %s', async (voiceSpeed, expected) => {
    const utterance = await read(component, { resource: resource('Spanish'), voiceSpeed });
    expect(utterance.rate).toBe(expected);
  });
});

it('uses an explicit local writing language ahead of resource language', async () => {
  const french = { name: 'Audrey', lang: 'fr-FR' };
  speech.getVoices.mockReturnValue([spanish, french]);
  const utterance = await read('LocalText', { resource: resource('Spanish'), language: 'French' });
  expect(utterance.voice).toBe(french);
});

it('preserves mute and finite defaults for saved clips as well as device speech', async () => {
  const audios = [];
  vi.stubGlobal('Audio', class { constructor(url) { this.url = url; audios.push(this); } play() { return Promise.resolve(); } pause() {} });
  window.__alloGetReadAloudAudioBridge = () => ({ inspect: () => ({ status: 'ready', url: 'blob:saved-clip' }) });
  await read('Controls', { resource: resource('Spanish'), voiceVolume: 0, voiceSpeed: 'invalid' });
  expect(audios[0]).toMatchObject({ volume: 0, playbackRate: 1 });
  expect(speech.speak).not.toHaveBeenCalled();
});
