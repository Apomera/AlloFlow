import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
const originalText = 'I can take a quiet break.';
const originalImage = 'data:image/png;base64,AA==';
const newImage = 'data:image/png;base64,AQ==';
let SymbolStudio, root, host, props, audios;
beforeAll(() => { SymbolStudio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; }, 60000);
beforeEach(() => {
  audios = [];
  vi.stubGlobal('Audio', class { constructor(src) { this.src = src; this.play = vi.fn(async () => undefined); this.pause = vi.fn(); audios.push(this); } });
});
afterEach(() => {
  if (root) act(() => root.unmount()); root = null;
  host?.remove(); host = null; localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
async function settle(action = () => {}) { await act(async () => { action(); for (let i = 0; i < 35; i++) await Promise.resolve(); }); }
function control(label) { const element = host.querySelector('[aria-label="' + label + '"]'); expect(element, label).toBeTruthy(); return element; }
function change(label, value) {
  const element = control(label); const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
function screenText() { return host.querySelector('.ss-story-page p')?.textContent; }
function printText() { return Array.from(host.querySelectorAll('.ss-story-print-pages p')).map((p) => p.textContent); }
async function mount(overrides = {}) {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([
    { id: 'edit-a', name: 'Learner A', codename: 'Sky Fox' }, { id: 'edit-b', name: 'Learner B', codename: 'Bright Otter' },
  ]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('edit-a'));
  props = baseProps({ initialTab: 'stories', onCallImagen: null, onCallGeminiImageEdit: null, onCallGemini: async () => JSON.stringify([{ text: originalText, imagePrompt: 'a peaceful corner' }]), ...overrides });
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  await settle(() => root.render(React.createElement(SymbolStudio, props)));
  change('Social story situation or goal', 'Taking a break');
  await settle(() => control('Generate social story').click());
}
async function edit(text) { await settle(() => control('Edit text for story page 1').click()); change('Story page text', text); }

describe('Social Story page text authoring', () => {
  it('saves revised text for screen, print, and narration while retaining the illustration', async () => {
    const onCallTTS = vi.fn(async () => 'data:audio/wav;base64,AA==');
    const onCallImagen = vi.fn(async () => originalImage);
    await mount({ onCallTTS, onCallImagen });
    await settle(() => control('Read this page aloud').click());
    expect(audios).toHaveLength(1);
    await edit('  I can ask for a break.\nI can return when ready.  ');
    expect(audios[0].pause).toHaveBeenCalled();
    expect(document.activeElement).toBe(control('Story page text'));
    expect(control('Read this page aloud').disabled).toBe(true);
    await settle(() => control('Save story page text').click());
    const expected = 'I can ask for a break.\nI can return when ready.';
    expect(screenText()).toBe(expected); expect(printText()).toEqual([expected]);
    expect(host.querySelector('.ss-story-page img').getAttribute('src')).toBe(originalImage);
    expect(onCallImagen).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(control('Edit text for story page 1'));
    await settle(() => control('Read this page aloud').click());
    expect(onCallTTS.mock.calls.at(-1)[0]).toBe(expected);
  });

  it('keeps committed text after an empty save or Cancel and bounds the editable buffer', async () => {
    await mount(); await edit('   ');
    await settle(() => control('Save story page text').click());
    expect(host.querySelector('[role="alert"]').textContent).toContain('Enter some story text before saving.');
    expect(control('Story page text').getAttribute('aria-invalid')).toBe('true');
    expect(printText()).toEqual([originalText]);
    change('Story page text', 'x'.repeat(2500));
    expect(control('Story page text').value).toHaveLength(2000);
    expect(control('Story page text').maxLength).toBe(2000);
    await settle(() => control('Cancel story text edit').click());
    expect(screenText()).toBe(originalText); expect(printText()).toEqual([originalText]);
    expect(document.activeElement).toBe(control('Edit text for story page 1'));
  });

  it('cancels a late narration result as soon as editing begins', async () => {
    const pending = deferred(); const onCallTTS = vi.fn(() => pending.promise);
    await mount({ onCallTTS });
    await settle(() => control('Read this page aloud').click());
    await edit('My revised wording.');
    await settle(() => pending.resolve('data:audio/wav;base64,AA=='));
    expect(onCallTTS).toHaveBeenCalledTimes(1); expect(audios).toHaveLength(0);
    await settle(() => control('Save story page text').click());
    expect(screenText()).toBe('My revised wording.');
  });

  it('discards unsaved wording when moving to another page', async () => {
    await mount({ onCallGemini: async () => JSON.stringify([{ text: originalText }, { text: 'I can rejoin my friends.' }]) });
    await edit('This wording must not leak.');
    await settle(() => control('Next story page').click());
    expect(host.querySelector('[aria-label="Story page text"]')).toBeNull();
    expect(screenText()).toBe('I can rejoin my friends.');
    await settle(() => control('Previous story page').click());
    expect(screenText()).toBe(originalText); expect(printText()[0]).toBe(originalText);
  });

  it('discards unsaved wording when a replacement story is accepted', async () => {
    const replacement = deferred();
    const onCallGemini = vi.fn().mockResolvedValueOnce(JSON.stringify([{ text: originalText }])).mockImplementationOnce(() => replacement.promise);
    await mount({ onCallGemini });
    await settle(() => control('Generate social story').click());
    await edit('Discard this old-page buffer.');
    await settle(() => replacement.resolve(JSON.stringify([{ text: 'A completely new story.' }])));
    expect(host.querySelector('[aria-label="Story page text"]')).toBeNull();
    expect(screenText()).toBe('A completely new story.'); expect(printText()).toEqual(['A completely new story.']);
  });

  it('discards unsaved wording when switching learner or closing the studio', async () => {
    await mount(); await edit('Discard on close.');
    await settle(() => root.render(React.createElement(SymbolStudio, { ...props, isOpen: false })));
    await settle(() => root.render(React.createElement(SymbolStudio, props)));
    expect(host.querySelector('[aria-label="Story page text"]')).toBeNull(); expect(screenText()).toBe(originalText);
    await edit('Discard on learner switch.');
    await settle(() => control('Profile: Learner B').click());
    expect(host.querySelector('[aria-label="Story page text"]')).toBeNull();
    expect(host.textContent).not.toContain('Discard on learner switch.');
  });

  it('preserves revised text when an earlier illustration request completes', async () => {
    const pending = deferred(); const later = deferred();
    const onCallImagen = vi.fn().mockResolvedValueOnce(originalImage).mockImplementationOnce(() => pending.promise).mockImplementationOnce(() => later.promise);
    await mount({ onCallImagen });
    await settle(() => control('Regenerate illustration for this page').click());
    await edit('Text saved before the new image.');
    await settle(() => control('Save story page text').click());
    await settle(() => pending.resolve(newImage));
    expect(screenText()).toBe('Text saved before the new image.');
    expect(host.querySelector('.ss-story-page img').getAttribute('src')).toBe(newImage);
    await settle(() => control('Regenerate illustration for this page').click());
    await edit('Text saved after the newest image.');
    await settle(() => later.resolve(originalImage));
    await settle(() => control('Save story page text').click());
    expect(screenText()).toBe('Text saved after the newest image.');
    expect(printText()).toEqual(['Text saved after the newest image.']);
    expect(host.querySelector('.ss-story-page img').getAttribute('src')).toBe(originalImage);
  });
});
