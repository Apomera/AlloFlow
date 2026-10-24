import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');
const hostStart = hostSource.indexOf('    window.__alloLazyWordPractice =');
const hostEnd = hostSource.indexOf('    // Teaching-script research', hostStart);
let presenter, cleanup;
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

beforeAll(() => {
  window.React = React;
  loadAlloModule('view_glossary_module.js');
  loadAlloModule('word_practice_module.js');
  presenter = window.AlloModules.WordPractice;
});
beforeEach(() => { window.AlloModules.WordPractice = presenter; });
afterEach(() => {
  document.querySelector('.awp-dialog')?.querySelector('button')?.click();
  cleanup?.(); cleanup = null;
  for (const key of ['__alloOpenWordPractice', '__alloLazyWordPractice', '__alloEnsureLazyModule', '__alloModuleRegistry', '__alloLastWordPracticeDiagnostic', '__alloBuildStamp']) delete window[key];
  window.AlloModules.WordPractice = presenter;
  vi.restoreAllMocks();
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete navigator.clipboard;
});

function installHost() {
  window.__alloEnsureLazyModule = vi.fn(async () => presenter);
  new Function('loadModule', hostSource.slice(hostStart, hostEnd))(vi.fn());
  return window.__alloEnsureLazyModule;
}
function mount(overrides = {}) {
  let props = glossaryMediaProps(overrides);
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const render = next => { props = next; act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props))); };
  render(props);
  cleanup = () => { act(() => root.unmount()); container.remove(); };
  return { container, props: () => props, render };
}
const button = (container, text) => [...container.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const launch = view => view.container.querySelector('button[aria-describedby="glossary-presentation-help"]');
const field = label => [...document.querySelectorAll('.awp-fields label')].find(node => node.querySelector('span')?.textContent === label)?.querySelector('input,select,textarea');
async function click(element) { expect(element).toBeTruthy(); await act(async () => element.click()); }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const diagnostics = view => view.container.querySelector('textarea[aria-label="Presentation diagnostics"]');
const liveNotice = view => [...view.container.querySelectorAll('[role="status"]')].map(node => node.textContent).join(' ');
function setClipboard(value) { Object.defineProperty(navigator, 'clipboard', { configurable: true, value }); }

describe('glossary Present & Export launch', () => {
  it('opens the actual bundled presenter and retains meanings and translations through presentation', async () => {
    const ensure = installHost(), view = mount();
    const original = JSON.stringify(view.props().generatedContent);
    expect(document.querySelector('.awp-dialog')).toBeNull();
    expect(ensure).not.toHaveBeenCalled();
    await click(launch(view));
    expect(ensure).toHaveBeenCalledWith('WordPractice', '__alloLazyWordPractice', 'WordPractice');
    expect(document.querySelector('.awp-dialog')?.getAttribute('aria-label')).toBe('Present & Export');
    expect(field('Words (one per line)').value).toBe('Leaf');
    field('Practice activity').value = 'vocabulary';
    field('Repetitions per word').value = '1';
    await click(button(document.querySelector('.awp-dialog'), 'Present'));
    await click(button(document.querySelector('.awp-dialog'), 'Show meaning'));
    expect(document.querySelector('.awp-card').textContent).toContain('A plant part that captures sunlight.');
    expect(document.querySelector('.awp-card').textContent).toContain('French: Feuille: Une partie de la plante qui capte la lumière.');
    expect(JSON.stringify(view.props().generatedContent)).toBe(original);
  });

  it('presents only the current filtered words when that scope is selected', async () => {
    installHost();
    const base = glossaryMediaProps();
    const root = { entryId: 'root', term: 'Root', def: 'The plant part that takes in water.', translations: { French: 'Racine' } };
    const view = mount({ generatedContent: { ...base.generatedContent, data: [...base.generatedContent.data, root] }, filteredGlossaryData: [{ ...root, _originalIdx: 1 }] });
    const scope = [...view.container.querySelectorAll('label')].find(node => node.textContent.includes('Words to present')).querySelector('select');
    await act(async () => { scope.value = 'filtered'; scope.dispatchEvent(new Event('change', { bubbles: true })); });
    await click(launch(view));
    expect(field('Words (one per line)').value).toBe('Root');
    field('Practice activity').value = 'vocabulary'; field('Repetitions per word').value = '1';
    await click(button(document.querySelector('.awp-dialog'), 'Present'));
    await click(button(document.querySelector('.awp-dialog'), 'Show meaning'));
    expect(document.querySelector('.awp-card').textContent).toContain(root.def);
    expect(document.querySelector('.awp-card').textContent).toContain('French: Racine');
    expect(document.querySelector('.awp-progress').textContent).toBe('Card 1 of 1');
  });

  it('explains a missing launcher with reload guidance and inspectable diagnostics', async () => {
    delete window.AlloModules.WordPractice;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = mount(); await click(launch(view));
    expect(launch(view).disabled).toBe(false);
    expect(view.container.textContent).toMatch(/reload|refresh/i);
    const details = view.container.querySelector('details');
    expect(details?.querySelector('summary')?.textContent).toBe('Presentation diagnostics');
    const diagnostic = JSON.parse(details.querySelector('textarea[aria-label="Presentation diagnostics"]').value);
    expect(diagnostic.error.code).toBe('word-practice-launcher-unavailable');
    expect(diagnostic.phase).toBe('launcher');
    expect(diagnostic.launcherAvailable).toBe(false);
    expect(diagnostic.wordCount).toBe(1);
    expect(window.__alloLastWordPracticeDiagnostic).toEqual(diagnostic);
    expect(JSON.stringify(diagnostic)).not.toContain('A plant part that captures sunlight.');
  });

  it('retains the lazy loader failure details and allows the next click to succeed', async () => {
    const ensure = installHost();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('Failed to load https://alloflow.example/word_practice_module.js?token=private-token#secret-fragment data:audio/wav;base64,private-audio'), { code: 'allo-lazy-module-failed' });
    window.__alloModuleRegistry = { WordPractice: { status: 'failed', originalUrl: 'https://alloflow.example/word_practice_module.js?token=private-token#secret-fragment' } };
    window.__alloBuildStamp = { hash: 'test-build-hash', surface: 'canvas' };
    ensure.mockRejectedValueOnce(error);
    const view = mount(); await click(launch(view));
    expect(launch(view).disabled).toBe(false);
    const details = view.container.querySelector('textarea[aria-label="Presentation diagnostics"]');
    expect(details).toBeTruthy();
    const diagnostic = JSON.parse(details.value);
    expect(diagnostic.error.message).toContain('Failed to load https://alloflow.example/word_practice_module.js');
    expect(diagnostic.error.code).toBe('allo-lazy-module-failed');
    expect(diagnostic.phase).toBe('load-module');
    expect(diagnostic.build).toEqual({ hash: 'test-build-hash', surface: 'canvas' });
    expect(diagnostic.module.status).toBe('failed');
    expect(diagnostic.module.url).toBe('https://alloflow.example/word_practice_module.js');
    expect(diagnostic.launcherAvailable).toBe(true);
    expect(view.container.textContent).toContain('Check your connection');
    expect(details.value).not.toContain('private-token');
    expect(details.value).not.toContain('secret-fragment');
    expect(details.value).not.toContain('private-audio');
    expect(details.value).toContain('[embedded data]');
    await click(button(view.container, 'Retry'));
    expect(ensure).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.awp-dialog')).not.toBeNull();
    expect(view.container.querySelector('textarea[aria-label="Presentation diagnostics"]')).toBeNull();
  });

  it('preserves an actual presenter validation failure and allows a corrected glossary to retry', async () => {
    installHost(); vi.spyOn(console, 'error').mockImplementation(() => {});
    const base = glossaryMediaProps();
    const longTerm = { ...base.generatedContent.data[0], term: 'a'.repeat(121) };
    const view = mount({ generatedContent: { ...base.generatedContent, data: [longTerm] }, filteredGlossaryData: [{ ...longTerm, _originalIdx: 0 }] });
    await click(launch(view));
    expect(document.querySelector('.awp-dialog')).toBeNull();
    expect(launch(view).disabled).toBe(false);
    const diagnostic = JSON.parse(view.container.querySelector('textarea[aria-label="Presentation diagnostics"]').value);
    expect(diagnostic.phase).toBe('open-presenter');
    expect(diagnostic.error.message).toBe('Each word or short phrase must be 120 characters or fewer.');
    expect(liveNotice(view)).toContain('120 characters');
    view.render({ ...view.props(), generatedContent: base.generatedContent, filteredGlossaryData: base.filteredGlossaryData });
    await click(button(view.container, 'Retry'));
    expect(document.querySelector('.awp-dialog')).not.toBeNull();
    expect(field('Words (one per line)').value).toBe('Leaf');
  });

  it.each([
    ['Use up to 200 words in one practice set.', /200/],
    ['Use up to 200 different words in one practice set.', /200/],
    ['This practice set has too much audio. Split it into smaller word lists.', /audio/i],
    ['The definition for “Leaf” must be 12,000 characters or fewer. Shorten the field or split it into separate practice items.', /12,000 characters per field/],
    ['This practice set has too much instructional text. Use up to 524,288 characters across definitions, examples, translations and sentence prompts, or split it into smaller lists.', /instructional text.*smaller word lists/],
  ])('explains the known validation error inline: %s', async (message, expected) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__alloOpenWordPractice = vi.fn().mockRejectedValue(new Error(message));
    const view = mount(); await click(launch(view));
    expect(liveNotice(view)).toMatch(expected);
    expect(liveNotice(view)).not.toContain('Presentation tools could not open.');
    expect(button(view.container, 'Retry')?.disabled).toBe(false);
    expect(JSON.parse(diagnostics(view).value).error.message).toBe(message);
  });

  it('keeps unexpected failure details in diagnostics instead of showing them as inline guidance', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__alloOpenWordPractice = vi.fn().mockRejectedValue(new Error('Internal service exception: sensitive implementation detail'));
    const view = mount(); await click(launch(view));
    expect(liveNotice(view)).toContain('Presentation tools could not open.');
    expect(liveNotice(view)).not.toContain('sensitive implementation detail');
    expect(JSON.parse(diagnostics(view).value).error.message).toContain('sensitive implementation detail');
  });

  it('keeps diagnostics visible during a pending retry and prevents duplicate retry launches', async () => {
    const ensure = installHost(), pending = deferred();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    ensure.mockRejectedValueOnce(new Error('First attempt failed')).mockReturnValueOnce(pending.promise);
    const view = mount(); await click(launch(view));
    const original = diagnostics(view).value;
    const retry = button(view.container, 'Retry');
    await click(retry);
    expect(retry.isConnected).toBe(true);
    expect(retry.disabled).toBe(true);
    expect(retry.getAttribute('aria-busy')).toBe('true');
    expect(diagnostics(view).value).toBe(original);
    await click(retry); await click(launch(view));
    expect(ensure).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(presenter));
    expect(document.querySelector('.awp-dialog')).not.toBeNull();
    expect(diagnostics(view)).toBeNull();
    expect(button(view.container, 'Retry')).toBeUndefined();
  });

  it('copies the diagnostic JSON and announces success only after the clipboard write completes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const pending = deferred(), writeText = vi.fn(() => pending.promise);
    setClipboard({ writeText });
    const view = mount(); await click(launch(view));
    const expected = diagnostics(view).value;
    await click(button(view.container, 'Copy diagnostics'));
    expect(writeText).toHaveBeenCalledWith(expected);
    expect(JSON.parse(writeText.mock.calls[0][0]).error.code).toBe('word-practice-launcher-unavailable');
    expect(liveNotice(view)).not.toContain('Diagnostics copied.');
    await act(async () => pending.resolve());
    expect(liveNotice(view)).toContain('Diagnostics copied.');
  });

  it.each(['unavailable', 'rejected'])('selects diagnostics for manual copying when clipboard access is %s', async mode => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setClipboard(mode === 'unavailable' ? undefined : { writeText: vi.fn().mockRejectedValue(new Error('Clipboard access denied')) });
    const view = mount(); await click(launch(view));
    const field = diagnostics(view);
    expect(field.closest('details').open).toBe(false);
    await click(button(view.container, 'Copy diagnostics'));
    expect(field.closest('details').open).toBe(true);
    expect(document.activeElement).toBe(field);
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(field.value.length);
    expect(liveNotice(view)).toContain('Automatic copy is unavailable. The details are selected; copy them manually.');
    expect(liveNotice(view)).not.toContain('Diagnostics copied.');
  });

  it.each(['resolve', 'reject'])('ignores a stale clipboard %s after the glossary resource changes', async outcome => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const pending = deferred(); setClipboard({ writeText: vi.fn(() => pending.promise) });
    const view = mount(); await click(launch(view));
    await click(button(view.container, 'Copy diagnostics'));
    view.render({ ...view.props(), generatedContent: { ...view.props().generatedContent, id: 'different-resource' } });
    launch(view).focus();
    await act(async () => pending[outcome](outcome === 'reject' ? new Error('Late clipboard rejection') : undefined));
    expect(diagnostics(view)).toBeNull();
    expect(liveNotice(view)).not.toMatch(/Diagnostics copied|Automatic copy is unavailable/);
    expect(document.activeElement).toBe(launch(view));
  });

  it('ignores an old clipboard completion after retry reports a different failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const pending = deferred(); setClipboard({ writeText: vi.fn(() => pending.promise) });
    window.__alloOpenWordPractice = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'));
    const view = mount(); await click(launch(view));
    await click(button(view.container, 'Copy diagnostics'));
    await click(button(view.container, 'Retry'));
    expect(JSON.parse(diagnostics(view).value).error.message).toBe('Second failure');
    await act(async () => pending.resolve());
    expect(liveNotice(view)).not.toContain('Diagnostics copied.');
    expect(JSON.parse(diagnostics(view).value).error.message).toBe('Second failure');
  });

  it('prevents duplicate launches and aborts pending work when the glossary unmounts', async () => {
    const ensure = installHost(), pending = deferred();
    ensure.mockReturnValueOnce(pending.promise);
    const opener = vi.spyOn(window, '__alloOpenWordPractice');
    const view = mount(); await click(launch(view)); await click(launch(view));
    expect(ensure).toHaveBeenCalledTimes(1);
    expect(launch(view).disabled).toBe(true);
    expect(launch(view).getAttribute('aria-busy')).toBe('true');
    const signal = opener.mock.calls[0][0].signal;
    cleanup(); cleanup = null;
    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(presenter));
    expect(document.querySelector('.awp-dialog')).toBeNull();
  });

  it('ignores a stale load error after a resource change and lets the new glossary open', async () => {
    const ensure = installHost(), pending = deferred();
    ensure.mockReturnValueOnce(pending.promise);
    const opener = vi.spyOn(window, '__alloOpenWordPractice');
    const view = mount(); await click(launch(view));
    const signal = opener.mock.calls[0][0].signal;
    const old = view.props();
    view.render({ ...old, generatedContent: { ...old.generatedContent, id: 'new-glossary' } });
    expect(signal.aborted).toBe(true);
    expect(launch(view).disabled).toBe(false);
    await act(async () => pending.reject(new Error('Old glossary load failed')));
    expect(view.container.querySelector('textarea[aria-label="Presentation diagnostics"]')).toBeNull();
    expect(window.__alloLastWordPracticeDiagnostic).toBeUndefined();
    await click(launch(view));
    expect(document.querySelector('.awp-dialog')).not.toBeNull();
  });
});
