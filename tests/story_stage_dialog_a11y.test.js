import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let LitLab;
let root;
let host;
let opener;
let outside;
let hadAlloUtils;
let originalAlloUtils;

beforeAll(() => {
  React = require(resolve(moduleDir, 'react'));
  ReactDOMClient = require(resolve(moduleDir, 'react-dom/client'));
  ({ act } = require(resolve(moduleDir, 'react-dom/test-utils')));
  axe = require(resolve(moduleDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ currentUiLanguage: 'English' });
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.LitLab;
  document.getElementById('litlab-a11y-styles')?.remove();
  loadAlloModule('story_stage_module.js');
  LitLab = window.AlloModules.LitLab;
});

beforeEach(() => {
  hadAlloUtils = Object.prototype.hasOwnProperty.call(window, '__alloUtils');
  originalAlloUtils = window.__alloUtils;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  window.__alloFocusTrapStack = [];
  if (hadAlloUtils) window.__alloUtils = originalAlloUtils;
  else delete window.__alloUtils;
  localStorage.removeItem('alloLitLabScripts');
  vi.restoreAllMocks();
});

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

async function clickAsync(element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

function changeValue(element, value) {
  const prototype = element.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  act(() => {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit(form) {
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

function findButton(container, text) {
  return Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes(text));
}

function getMainDialog() {
  return host.querySelector('[role="dialog"][aria-labelledby="litlab-dialog-title"]');
}

function getPromptDialog() {
  return host.querySelector('[role="dialog"][aria-labelledby="litlab-prompt-title"]');
}

async function mountLitLab(extraProps = {}) {
  opener = document.createElement('button');
  opener.textContent = 'Open LitLab';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);

  function Harness() {
    const [open, setOpen] = React.useState(true);
    return open ? React.createElement(LitLab, Object.assign({
      gradeLevel: '5th Grade',
      studentNickname: 'Bright Owl',
      geminiVoices: [],
      kokoroVoices: [],
      addToast: () => {},
    }, extraProps, {
      onClose: () => setOpen(false),
    })) : null;
  }

  await act(async () => {
    root.render(React.createElement(Harness));
    await Promise.resolve();
  });
  return getMainDialog();
}

const axeOptions = {
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
};

describe('Story Stage dialog accessibility', () => {
  it('contains and restores focus, uses visible naming, and preserves an accessible upload action', async () => {
    outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    const dialog = await mountLitLab();
    const backdrop = dialog.parentElement;
    const close = dialog.querySelector('button[aria-label="Close"]');
    const style = document.getElementById('litlab-a11y-styles');

    expect(backdrop.getAttribute('role')).toBe('presentation');
    expect(dialog.getAttribute('aria-labelledby')).toBe('litlab-dialog-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('litlab-dialog-description');
    expect(dialog.querySelector('#litlab-dialog-title').textContent).toBe('LitLab');
    expect(dialog.querySelector('#litlab-dialog-description').textContent).toContain('Bring stories to life');
    expect(document.activeElement).toBe(close);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);

    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('min-height:24px');
    expect(style.textContent).toContain('@media (forced-colors:active)');
    expect(style.textContent).toContain('@media (prefers-reduced-motion:reduce)');
    expect(dialog.querySelector('textarea').style.outline).toBe('');

    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(close);

    const focusable = Array.from(dialog.querySelectorAll(
      'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ));
    close.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(focusable.at(-1));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(close);

    let transientPicker = null;
    vi.spyOn(window.HTMLInputElement.prototype, 'click').mockImplementation(function () {
      transientPicker = this;
    });
    const upload = findButton(dialog, 'Upload File');
    click(upload);
    expect(transientPicker?.type).toBe('file');
    expect(transientPicker?.getAttribute('aria-label')).toBe('Upload story source file');

    const axeResult = await axe.run(dialog, axeOptions);
    expect(axeResult.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('imports a URL through a labelled nested dialog with validation, focus isolation, and restoration', async () => {
    const fetchAndCleanUrl = vi.fn(async () => 'Imported story text');
    window.__alloUtils = Object.assign({}, originalAlloUtils || {}, { fetchAndCleanUrl });
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('Native prompt must not be called');
    });
    const dialog = await mountLitLab();
    const importButton = findButton(dialog, 'Import URL');

    importButton.focus();
    click(importButton);
    let prompt = getPromptDialog();
    let input = prompt.querySelector('input');
    const form = prompt.querySelector('form');

    expect(prompt.querySelector('#litlab-prompt-title').textContent).toBe('Import story from URL');
    expect(prompt.querySelector('label').textContent).toBe('Story webpage URL');
    expect(input.type).toBe('url');
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-describedby')).toContain('litlab-prompt-description');
    expect(document.activeElement).toBe(input);
    expect(dialog.getAttribute('aria-hidden')).toBe('true');
    expect(dialog.hasAttribute('inert')).toBe(true);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(prompt);

    await submit(form);
    expect(prompt.querySelector('[role="alert"]').textContent).toBe('Enter a URL to continue.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input);

    const submitButton = prompt.querySelector('button[type="submit"]');
    submitButton.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(input);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(getPromptDialog()).toBeNull();
    expect(dialog.hasAttribute('aria-hidden')).toBe(false);
    expect(dialog.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(importButton);
    expect(fetchAndCleanUrl).not.toHaveBeenCalled();

    click(importButton);
    prompt = getPromptDialog();
    input = prompt.querySelector('input');
    const axeResult = await axe.run(prompt, axeOptions);
    expect(axeResult.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    changeValue(input, '  https://example.org/story  ');
    await submit(prompt.querySelector('form'));

    expect(getPromptDialog()).toBeNull();
    expect(fetchAndCleanUrl).toHaveBeenCalledWith(
      'https://example.org/story',
      undefined,
      expect.any(Function),
    );
    expect(dialog.querySelector('textarea[aria-label="Story text input"]').value).toContain('Imported story text');
    expect(document.activeElement).toBe(importButton);
    expect(nativePrompt).not.toHaveBeenCalled();
  });

  it('refines cover and page images through the accessible dialog without native prompts', async () => {
    const script = {
      title: 'Forest Story',
      setting: 'a forest',
      characters: [
        { id: 'narrator', name: 'Narrator', description: 'The storyteller', color: '#64748b' },
      ],
      lines: [
        { id: 'l1', speaker: 'narrator', text: 'A fox entered the forest.', type: 'narration' },
      ],
    };
    const onCallGemini = vi.fn(async () => JSON.stringify(script));
    const onCallImagen = vi.fn()
      .mockResolvedValueOnce('data:image/png;base64,cover-one')
      .mockResolvedValueOnce('data:image/png;base64,page-one');
    const onCallGeminiImageEdit = vi.fn()
      .mockResolvedValueOnce('data:image/png;base64,cover-two')
      .mockResolvedValueOnce('data:image/png;base64,page-two');
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('Native prompt must not be called');
    });
    const dialog = await mountLitLab({ onCallGemini, onCallImagen, onCallGeminiImageEdit });

    const source = dialog.querySelector('textarea[aria-label="Story text input"]');
    changeValue(source, 'A fox entered the forest.');
    await clickAsync(findButton(dialog, 'Create Script'));
    await clickAsync(findButton(dialog, 'Start Performance'));

    await clickAsync(dialog.querySelector('button[aria-label="Generate cover image with AI"]'));
    const coverRefine = dialog.querySelector('button[aria-label="Refine cover image with a custom instruction"]');
    expect(coverRefine).not.toBeNull();
    coverRefine.focus();
    click(coverRefine);

    let prompt = getPromptDialog();
    expect(prompt.querySelector('#litlab-prompt-title').textContent).toBe('Refine cover image');
    expect(prompt.querySelector('label').textContent).toBe('How should the cover image change?');
    expect(document.activeElement).toBe(prompt.querySelector('input'));
    changeValue(prompt.querySelector('input'), 'Add a moon in the sky');
    await submit(prompt.querySelector('form'));

    expect(onCallGeminiImageEdit).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Add a moon in the sky'),
      'cover-one',
      600,
      0.85,
    );
    expect(document.activeElement).toBe(coverRefine);

    await clickAsync(dialog.querySelector('button[aria-label="Illustrate this page with AI"]'));
    const pageRefine = dialog.querySelector('button[aria-label="Refine this page illustration with a custom instruction"]');
    expect(pageRefine).not.toBeNull();
    pageRefine.focus();
    click(pageRefine);

    prompt = getPromptDialog();
    expect(prompt.querySelector('#litlab-prompt-title').textContent).toBe('Refine page 1 illustration');
    expect(prompt.querySelector('label').textContent).toBe('How should this page illustration change?');
    changeValue(prompt.querySelector('input'), 'Make it warmer');
    await submit(prompt.querySelector('form'));

    expect(onCallGeminiImageEdit).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Make it warmer'),
      'page-one',
      600,
      0.85,
    );
    expect(document.activeElement).toBe(pageRefine);
    expect(nativePrompt).not.toHaveBeenCalled();
  });
});

// These settings previously stayed captured at their initial values in AI callbacks.
describe('LitLab setup refinements', () => {
  it('validates custom length and sends the latest word count to generation', async () => {
    const story = 'A curious fox found a lantern beside the stream and carried it home to help the other animals find their way through the dark forest.';
    const onCallGemini = vi.fn(async () => story);
    const dialog = await mountLitLab({ onCallGemini });
    click(findButton(dialog, 'AI Generate'));
    click(dialog.querySelector('button[aria-label="Custom story"]'));
    const count = dialog.querySelector('input[aria-label="Custom word count"]');
    changeValue(count, '25');
    expect(count.getAttribute('aria-invalid')).toBe('true');
    expect(dialog.querySelector('button[aria-label="Generate Story with AI"]').disabled).toBe(true);
    expect(onCallGemini).not.toHaveBeenCalled();
    changeValue(count, '150');
    expect(count.getAttribute('aria-invalid')).toBe('false');
    await clickAsync(dialog.querySelector('button[aria-label="Generate Story with AI"]'));
    expect(onCallGemini.mock.calls[0][0]).toContain('Target length: 150 words');
    expect(dialog.querySelector('textarea[aria-label="Story text input"]').value).toBe(story);
    expect(dialog.querySelector('button[aria-pressed="true"]').textContent).toContain('Paste Text');
  });

  it('uses the selected grade and preserves the chosen title when creating a script', async () => {
    const onCallGemini = vi.fn(async () => JSON.stringify({ title: 'AI title', characters: [], lines: [{ id: 'l1', speaker: 'narrator', text: 'The fox came home.', type: 'narration' }] }));
    const dialog = await mountLitLab({ onCallGemini });
    changeValue(dialog.querySelector('#litlab-story-title'), 'The Lantern Walk');
    click(findButton(dialog, 'AI Generate'));
    const grade = dialog.querySelector('select[aria-label="Story grade level"]');
    act(() => { grade.value = '8th Grade'; grade.dispatchEvent(new Event('change', { bubbles: true })); });
    click(findButton(dialog, 'Paste Text'));
    changeValue(dialog.querySelector('#litlab-story-text'), 'The fox came home.');
    await clickAsync(findButton(dialog, 'Create Script'));
    expect(onCallGemini.mock.calls[0][0]).toContain('Target audience: 8th Grade students.');
    expect(dialog.querySelector('#litlab-dialog-description').textContent).toBe('The Lantern Walk');
    expect(dialog.querySelector('[aria-current="step"]').textContent).toContain('Assign voices');
    await clickAsync(findButton(dialog, 'Start Performance'));
    expect(dialog.querySelector('[aria-current="step"]').textContent).toContain('Perform');
  });
});

const playbackFixture = {
  title: 'Forest Walk', characters: [],
  lines: [{id: 'l1', speaker: 'narrator', text: 'A fox followed the moonlit path.', type: 'narration'}]
};
async function openPerformance(extra = {}, fixture = playbackFixture) {
  const dialog = await mountLitLab({onCallGemini: async () => JSON.stringify(fixture), ...extra});
  changeValue(dialog.querySelector('#litlab-story-text'), 'A fox followed the moonlit path.');
  await clickAsync(findButton(dialog, 'Create Script'));
  await clickAsync(findButton(dialog, 'Start Performance'));
  return dialog;
}

describe('LitLab playback and recording lifecycle', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('ignores a late TTS response after Stop, without awarding completion points', async () => {
    let resolveSpeech;
    const onCallTTS = vi.fn(() => new Promise(resolve => { resolveSpeech = resolve; }));
    const handleScoreUpdate = vi.fn();
    const AudioMock = vi.fn(); vi.stubGlobal('Audio', AudioMock);
    const dialog = await openPerformance({onCallTTS, handleScoreUpdate});
    await clickAsync(findButton(dialog, '▶ Play'));
    expect(onCallTTS).toHaveBeenCalledTimes(1);
    await clickAsync(dialog.querySelector('[aria-label="Stop playback"]'));
    await act(async () => { resolveSpeech('https://example.org/late.mp3'); await Promise.resolve(); });
    expect(AudioMock).not.toHaveBeenCalled();
    expect(handleScoreUpdate).not.toHaveBeenCalled();
    expect(findButton(dialog, '▶ Play')).toBeTruthy();
  });

  it('keeps a restarted performance independent of the cancelled request', async () => {
    const pending = [];
    const onCallTTS = vi.fn(() => new Promise(resolve => pending.push(resolve)));
    const audio = [];
    vi.stubGlobal('Audio', class { constructor() { audio.push(this); } play() { return Promise.resolve(); } pause() {} });
    const handleScoreUpdate = vi.fn();
    const dialog = await openPerformance({onCallTTS, handleScoreUpdate});
    await clickAsync(findButton(dialog, '▶ Play'));
    await clickAsync(dialog.querySelector('[aria-label="Stop playback"]'));
    await clickAsync(findButton(dialog, '▶ Play'));
    await act(async () => { pending[0]('https://example.org/old.mp3'); pending[1]('https://example.org/new.mp3'); });
    expect(audio).toHaveLength(1);
    expect(dialog.querySelector('[aria-label="Stop playback"]')).toBeTruthy();
    await act(async () => { audio[0].onended(); });
    expect(handleScoreUpdate).toHaveBeenCalledExactlyOnceWith(20, 'LitLab Performance', 'storystage-perform-Forest Walk');
    expect(findButton(dialog, '▶ Play')).toBeTruthy();
  });

  it('cancels pending speech when navigating to analysis or closing', async () => {
    let resolveSpeech;
    const AudioMock = vi.fn(); vi.stubGlobal('Audio', AudioMock);
    const dialog = await openPerformance({onCallTTS: () => new Promise(resolve => { resolveSpeech = resolve; })});
    await clickAsync(findButton(dialog, '▶ Play'));
    await clickAsync(findButton(dialog, 'Analyze'));
    await act(async () => { resolveSpeech('https://example.org/late.mp3'); });
    expect(AudioMock).not.toHaveBeenCalled();
    await clickAsync(findButton(dialog, 'Back to Performance'));
    await clickAsync(dialog.querySelector('[aria-label="Read line 1 aloud"]'));
    await clickAsync(dialog.querySelector('[aria-label="Close"]'));
    await act(async () => { resolveSpeech('https://example.org/closed.mp3'); });
    expect(AudioMock).not.toHaveBeenCalled();
  });

  it('releases a microphone permission result arriving after close', async () => {
    let allowMicrophone;
    const stop = vi.fn();
    vi.stubGlobal('navigator', {mediaDevices: {getUserMedia: () => new Promise(resolve => { allowMicrophone = resolve; })}});
    const MediaRecorderMock = vi.fn(); vi.stubGlobal('MediaRecorder', MediaRecorderMock);
    const dialog = await openPerformance();
    await clickAsync(findButton(dialog, '⏺ Record'));
    await clickAsync(dialog.querySelector('[aria-label="Close"]'));
    await act(async () => { allowMicrophone({getTracks: () => [{stop}]}); });
    expect(stop).toHaveBeenCalledOnce();
    expect(MediaRecorderMock).not.toHaveBeenCalled();
  });

  it('stops an active recording on navigation, preserves its MIME type, and releases its URL on close', async () => {
    const stopTrack = vi.fn();
    vi.stubGlobal('navigator', {mediaDevices: {getUserMedia: async () => ({getTracks: () => [{stop: stopTrack}]})}});
    vi.stubGlobal('MediaRecorder', class {
      constructor() { this.state = 'inactive'; this.mimeType = 'audio/mp4'; }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.ondataavailable({data: new Blob(['voice'], {type:'audio/mp4'})}); this.onstop(); }
    });
    const createObjectURL = vi.fn(() => 'blob:litlab-test'); const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {createObjectURL, revokeObjectURL});
    const dialog = await openPerformance();
    await clickAsync(findButton(dialog, '⏺ Record'));
    await clickAsync(findButton(dialog, 'Analyze'));
    expect(stopTrack).toHaveBeenCalled();
    expect(createObjectURL.mock.calls[0][0].type).toBe('audio/mp4');
    await clickAsync(findButton(dialog, 'Back to Performance'));
    expect(dialog.querySelector('audio').getAttribute('src')).toBe('blob:litlab-test');
    expect(dialog.querySelector('a[download]').getAttribute('download')).toBe('Forest Walk-recording.m4a');
    await clickAsync(dialog.querySelector('[aria-label="Close"]'));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:litlab-test');
  });
});

describe('LitLab exports and persistence', () => {
  it('prints markup-like story text literally without executable elements or injected attributes', async () => {
    const text = '<script>alert("story")</script> & <img src=x onerror="alert(1)">';
    const fixture = {title: text, theme: text, characters:[{id:'fox',name:text,description:text,color:'#7c3aed'}], lines:[{id:'l1',speaker:'fox',text,type:'dialogue'}]};
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({document:{write,close:vi.fn()}});
    const dialog = await openPerformance({}, fixture);
    await clickAsync(findButton(dialog, '🖨️ Script'));
    const doc = new DOMParser().parseFromString(write.mock.calls[0][0], 'text/html');
    expect(doc.querySelector('script,[onerror]')).toBeNull();
    expect(doc.querySelector('h1').textContent).toContain(text);
    expect(doc.querySelector('.dialogue').textContent).toContain(text);
    expect(doc.documentElement.lang).toBe('en');
  });

  it('reports storage failure without pretending the script was saved', async () => {
    const addToast = vi.fn();
    const dialog = await openPerformance({addToast});
    await clickAsync(dialog.querySelector('[aria-label="Back"]'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    addToast.mockClear();
    await clickAsync(findButton(dialog, 'Save progress'));
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Could not save this script'), 'error');
    expect(addToast).not.toHaveBeenCalledWith('Script saved!', 'success');
  });

  it('ignores a malformed saved-script collection and exposes keyboard-operable standards', async () => {
    localStorage.setItem('alloLitLabScripts', '{"length":1}');
    const dialog = await openPerformance();
    await clickAsync(findButton(dialog, 'Analyze'));
    const standard = findButton(dialog, 'RL.5.2');
    expect(standard.tagName).toBe('BUTTON');
    expect(standard.getAttribute('aria-pressed')).toBe('false');
    await clickAsync(standard);
    expect(standard.getAttribute('aria-pressed')).toBe('true');
    expect(dialog.textContent).toContain('Focus your analysis on this standard: RL.5.2');
  });
});

describe('LitLab story isolation and input integrity', () => {
  it('starts a new story with fresh analysis and reactions and discards late art from the previous one', async () => {
    let finishCover;
    const dialog = await openPerformance({onCallImagen: () => new Promise(resolve => { finishCover = resolve; })});
    expect(Array.from(dialog.querySelectorAll('button')).map(b => b.getAttribute('aria-label'))).toContain('React with 😊');
    await clickAsync(Array.from(dialog.querySelectorAll('button')).find(button => button.getAttribute('aria-label') === 'React with 😊'));
    await clickAsync(dialog.querySelector('[aria-label="Generate cover image with AI"]'));
    await clickAsync(findButton(dialog, 'Analyze'));
    changeValue(dialog.querySelector('[aria-label="Theme analysis"]'), 'A response about the first story.');
    await clickAsync(dialog.querySelector('[aria-label="Back"]'));
    await clickAsync(dialog.querySelector('[aria-label="Back"]'));
    await clickAsync(dialog.querySelector('[aria-label="Back"]'));
    await clickAsync(findButton(dialog, 'Create Script'));
    await act(async () => { finishCover('data:image/png;base64,old-cover'); });
    await clickAsync(findButton(dialog, 'Start Performance'));
    expect(dialog.querySelector('img[alt="Story cover illustration"]')).toBeNull();
    expect(Array.from(dialog.querySelectorAll('button')).find(button => button.getAttribute('aria-label') === 'React with 😊').getAttribute('aria-pressed')).toBe('false');
    await clickAsync(findButton(dialog, 'Analyze'));
    expect(dialog.querySelector('[aria-label="Theme analysis"]').value).toBe('');
    expect(dialog.textContent).not.toContain('Your Emotional Journey');
  });

  it('preserves a voice change made while its portrait is being generated', async () => {
    let finishPortrait;
    const dialog = await mountLitLab({onCallImagen: () => new Promise(resolve => { finishPortrait=resolve; }), onCallGemini:async()=>JSON.stringify(playbackFixture),geminiVoices:[{id:'Aoede'},{id:'Kore'}]});
    changeValue(dialog.querySelector('#litlab-story-text'), 'A fox followed the moonlit path.');
    await clickAsync(findButton(dialog, 'Create Script'));
    await clickAsync(dialog.querySelector('[aria-label="Generate portrait"]'));
    const voice = dialog.querySelector('[aria-label="Voice for Narrator"]');
    act(() => { voice.value='Kore'; voice.dispatchEvent(new Event('change',{bubbles:true})); });
    await act(async () => { finishPortrait('data:image/png;base64,portrait'); });
    expect(dialog.querySelector('[aria-label="Voice for Narrator"]').value).toBe('Kore');
    expect(dialog.querySelector('img[alt="Narrator"]')).not.toBeNull();
  });

  it.each([
    {characters:[],lines:[]},
    {characters:[{id:'fox',name:{bad:true}}],lines:playbackFixture.lines},
    {characters:[],lines:[{id:'l1',speaker:'narrator',text:{bad:true}}]},
  ])('rejects malformed generated scripts without leaving the setup screen: %j', async (fixture) => {
    const addToast=vi.fn();
    const dialog=await mountLitLab({onCallGemini:async()=>JSON.stringify(fixture),addToast});
    changeValue(dialog.querySelector('#litlab-story-text'), 'Keep this original source text.');
    await clickAsync(findButton(dialog,'Create Script'));
    expect(dialog.querySelector('#litlab-story-text').value).toBe('Keep this original source text.');
    expect(dialog.querySelector('[aria-current="step"]').textContent).toContain('Choose text');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Invalid script format'),'error');
  });

  it('round-trips custom teacher generation settings when saving an assignment', async () => {
    const onSaveConfig=vi.fn();
    const dialog=await mountLitLab({onSaveConfig,initialConfig:{storyTitle:'Teacher story',inputMode:'generate',genPrompt:'A mystery on the moon',genCharCount:5,genLength:'custom',customWordCount:350,genGradeLevel:'8th Grade'}});
    expect(dialog.querySelector('[aria-label="Story generation instructions"]').value).toBe('A mystery on the moon');
    expect(dialog.querySelector('[aria-label="Custom word count"]').value).toBe('350');
    await clickAsync(findButton(dialog,'Save as Assignment'));
    expect(onSaveConfig).toHaveBeenCalledWith(expect.objectContaining({genPrompt:'A mystery on the moon',genCharCount:5,customWordCount:'350',genLength:'custom',genGradeLevel:'8th Grade'}));
  });
});

describe('LitLab shared voice controller', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('cancels the shared recorder on close and ignores its late result', async () => {
    let finishRecording;
    const controller = {supported:true,cancel:vi.fn(),stop:vi.fn(),isRecording:()=>true,result:new Promise(resolve=>{finishRecording=resolve;})};
    vi.stubGlobal('AlloFlowVoice', {recordAudioBlob:vi.fn(()=>controller)});
    const handleScoreUpdate=vi.fn();
    const dialog=await openPerformance({handleScoreUpdate});
    await clickAsync(findButton(dialog,'⏺ Record'));
    await clickAsync(dialog.querySelector('[aria-label="Close"]'));
    expect(controller.cancel).toHaveBeenCalledOnce();
    await act(async()=>{finishRecording({base64:'data:audio/webm;base64,dGVzdA=='});});
    expect(handleScoreUpdate).not.toHaveBeenCalled();
  });
});

const validFeedback = {overallRating:'proficient',strengths:['You noticed the setting.'],nudges:['Which line supports your idea?'],characterInsight:'The fox follows the path.',themeInsight:'Explain what the journey teaches.',craftInsight:'Notice the moonlit setting.'};
const validPlan = {encouragement:'Keep using evidence.',tasks:[
  {title:'Find evidence',detail:'Choose a line about the path.',why:'It supports your idea.',source:'feedback'},
  {title:'Rehearse the scene',detail:'Read the line aloud with expression.',why:'Your voice can show the mood.',source:'performance'},
  {title:'Revise your response',detail:'Explain how the line supports your theme.',why:'This connects evidence and meaning.',source:'reflection'}
]};
async function openAnalysis(extra = {}, response = validFeedback) {
  const onCallGemini = vi.fn(async prompt => prompt.includes('performable script') ? JSON.stringify(playbackFixture) : JSON.stringify(response));
  const dialog = await openPerformance({onCallGemini,...extra});
  await clickAsync(findButton(dialog,'Analyze'));
  changeValue(dialog.querySelector('[aria-label="Theme analysis"]'),'The journey shows curiosity.');
  return {dialog,onCallGemini};
}

describe('LitLab reflection feedback and revision workflow', () => {
  it('includes source evidence in feedback and keeps the source available beside the questions', async () => {
    const {dialog,onCallGemini}=await openAnalysis();
    expect(dialog.querySelector('summary').textContent).toBe('Review story evidence');
    expect(dialog.querySelector('[aria-label="Story lines for reference"]').textContent).toContain(playbackFixture.lines[0].text);
    await clickAsync(dialog.querySelector('[aria-label="Get AI feedback on your analysis"]'));
    expect(onCallGemini.mock.calls.at(-1)[0]).toContain('1. [narrator] A fox followed the moonlit path.');
    expect(dialog.textContent).toContain('You noticed the setting.');
    changeValue(dialog.querySelector('[aria-label="Theme analysis"]'),'The moonlit path creates a mysterious mood.');
    expect(dialog.textContent).not.toContain('You noticed the setting.');
    expect(dialog.textContent).toContain('Your reflection changed. Get feedback again');
  });

  it.each([null,{}, {overallRating:'proficient',strengths:'Wrong shape'}, {overallRating:'exemplary',characterInsight:{bad:true}}])('handles invalid feedback without a crash or points: %j', async response => {
    const handleScoreUpdate=vi.fn();
    const {dialog}=await openAnalysis({handleScoreUpdate},response);
    await clickAsync(dialog.querySelector('[aria-label="Get AI feedback on your analysis"]'));
    expect(dialog.querySelector('[role="alert"]').textContent).toContain('Feedback was incomplete or unavailable');
    expect(dialog.querySelector('[aria-label="Theme analysis"]').value).toBe('The journey shows curiosity.');
    expect(handleScoreUpdate).not.toHaveBeenCalled();
    expect(dialog.querySelector('[aria-label="Get AI feedback on your analysis"]').disabled).toBe(false);
  });

  it('ignores pending feedback after a response edit, allowing a fresh request', async () => {
    const pending=[];
    const onCallGemini=vi.fn(prompt=>prompt.includes('performable script') ? Promise.resolve(JSON.stringify(playbackFixture)) : new Promise(resolve=>pending.push(resolve)));
    const handleScoreUpdate=vi.fn();
    const {dialog}=await openAnalysis({onCallGemini,handleScoreUpdate});
    await clickAsync(dialog.querySelector('[aria-label="Get AI feedback on your analysis"]'));
    changeValue(dialog.querySelector('[aria-label="Theme analysis"]'),'My revised answer.');
    await clickAsync(dialog.querySelector('[aria-label="Get AI feedback on your analysis"]'));
    await act(async()=>{pending[0](JSON.stringify(validFeedback));});
    expect(dialog.textContent).not.toContain('You noticed the setting.');
    expect(handleScoreUpdate).not.toHaveBeenCalled();
    await act(async()=>{pending[1](JSON.stringify({...validFeedback,strengths:['Fresh feedback.']}));});
    expect(dialog.textContent).toContain('Fresh feedback.');
    expect(handleScoreUpdate).toHaveBeenCalledOnce();
  });

  it('recovers from an invalid revision plan and tracks completion of the valid replacement', async () => {
    let planCalls=0;
    const onCallGemini=vi.fn(async prompt=>JSON.stringify(prompt.includes('performable script') ? playbackFixture : prompt.includes('EXACTLY 3 tasks') ? (++planCalls===1 ? {tasks:'invalid'} : validPlan) : validFeedback));
    const {dialog}=await openAnalysis({onCallGemini});
    await clickAsync(dialog.querySelector('[aria-label="Submit self-assessment"]'));
    await clickAsync(dialog.querySelector('[aria-label="Get AI feedback on your analysis"]'));
    await clickAsync(dialog.querySelector('[aria-label="Build a revision plan"]'));
    expect(dialog.querySelector('[aria-label="Revision Plan synthesis"] [role="alert"]').textContent).toContain("Couldn't build a revision plan");
    await clickAsync(dialog.querySelector('[aria-label="Build a revision plan"]'));
    expect(dialog.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
    expect(dialog.textContent).toContain('0 of 3 steps complete');
    await clickAsync(dialog.querySelector('input[type="checkbox"]'));
    expect(dialog.textContent).toContain('1 of 3 steps complete');
    await clickAsync(dialog.querySelector('[aria-label="Re-synthesize revision plan"]'));
    expect(dialog.textContent).toContain('0 of 3 steps complete');
    changeValue(dialog.querySelector('[aria-label="Theme analysis"]'),'An updated reflection.');
    expect(dialog.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('discards a pending revision plan when the self-assessment changes', async () => {
    let finishPlan;
    const onCallGemini=vi.fn(prompt=>prompt.includes('EXACTLY 3 tasks') ? new Promise(resolve=>{finishPlan=resolve;}) : Promise.resolve(JSON.stringify(prompt.includes('performable script') ? playbackFixture : validFeedback)));
    const {dialog}=await openAnalysis({onCallGemini});
    await clickAsync(dialog.querySelector('[aria-label="Submit self-assessment"]'));
    await clickAsync(dialog.querySelector('[aria-label="Get AI feedback on your analysis"]'));
    await clickAsync(dialog.querySelector('[aria-label="Build a revision plan"]'));
    await clickAsync(dialog.querySelector('[aria-label="Edit self-assessment"]'));
    await act(async()=>{finishPlan(JSON.stringify(validPlan));});
    expect(dialog.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(dialog.querySelector('#ll-self-theme')).not.toBeNull();
  });
});

describe('LitLab incomplete story recovery', () => {
  afterEach(()=>vi.useRealTimers());
  it('preserves the original source and offers the partial draft when the ending fails', async () => {
    const partial='A fox found a lantern beside a stream. The sky was growing dark, and the animals wondered how they would find their way home.';
    const onCallGemini=vi.fn().mockResolvedValueOnce(partial).mockResolvedValueOnce('');
    const addToast=vi.fn();
    const dialog=await mountLitLab({onCallGemini,addToast});
    changeValue(dialog.querySelector('#litlab-story-text'),'Keep my original source.');
    click(findButton(dialog,'AI Generate'));
    click(dialog.querySelector('[aria-label="Long story: 900-1500 words"]'));
    vi.useFakeTimers();
    await clickAsync(dialog.querySelector('[aria-label="Generate Story with AI"]'));
    await act(async()=>{await vi.advanceTimersByTimeAsync(1500);});
    expect(dialog.querySelector('[role="alert"]').textContent).toContain('The story could not be completed');
    expect(addToast.mock.calls.some(call=>call[1]==='success')).toBe(false);
    click(findButton(dialog,'Paste Text'));
    expect(dialog.querySelector('#litlab-story-text').value).toBe('Keep my original source.');
    click(findButton(dialog,'AI Generate'));
    await clickAsync(findButton(dialog,'Review partial draft'));
    expect(dialog.querySelector('#litlab-story-text').value).toBe(partial);
    expect(dialog.textContent).toContain('This is a partial draft');
  });
});

describe('LitLab source request cancellation', () => {
  it('keeps the chosen saved script when an earlier extraction finishes later', async () => {
    localStorage.setItem('alloLitLabScripts',JSON.stringify([{id:'saved',title:'Saved Story',script:{...playbackFixture,title:'Saved Story'},sourceText:'Saved source',savedAt:'2026-09-08T12:00:00Z'}]));
    let finishExtraction;
    const dialog=await mountLitLab({onCallGemini:()=>new Promise(resolve=>{finishExtraction=resolve;})});
    changeValue(dialog.querySelector('#litlab-story-text'),'A different text that takes longer to analyze.');
    await clickAsync(findButton(dialog,'Create Script'));
    await clickAsync(findButton(dialog,'Saved Story'));
    await act(async()=>{finishExtraction(JSON.stringify({...playbackFixture,title:'Late Story'}));});
    expect(dialog.querySelector('#litlab-dialog-description').textContent).toBe('Saved Story');
    expect(dialog.querySelector('[aria-current="step"]').textContent).toContain('Assign voices');
  });
});

describe('LitLab save and resume', () => {
  it('restores reflections and revision completion after reopening and updates the same saved entry', async () => {
    const onCallGemini=vi.fn(async prompt=>JSON.stringify(prompt.includes('performable script') ? playbackFixture : prompt.includes('EXACTLY 3 tasks') ? validPlan : validFeedback));
    let {dialog}=await openAnalysis({onCallGemini});
    await clickAsync(dialog.querySelector('[aria-label="Submit self-assessment"]'));
    await clickAsync(dialog.querySelector('[aria-label="Get AI feedback on your analysis"]'));
    await clickAsync(dialog.querySelector('[aria-label="Build a revision plan"]'));
    await clickAsync(dialog.querySelector('input[type="checkbox"]'));
    await clickAsync(findButton(dialog,'Save progress'));
    const first=JSON.parse(localStorage.getItem('alloLitLabScripts'));
    expect(first).toHaveLength(1);
    expect(first[0].progress.analysisResponses.theme).toBe('The journey shows curiosity.');
    expect(first[0].progress.completedTasks[0]).toBe(true);
    await clickAsync(findButton(dialog,'Save progress'));
    expect(JSON.parse(localStorage.getItem('alloLitLabScripts'))).toHaveLength(1);
    await act(async()=>root.unmount()); root=null; host.remove(); host=null;
    dialog=await mountLitLab({onCallGemini});
    await clickAsync(findButton(dialog,'Forest Walk'));
    expect(dialog.querySelector('[aria-current="step"]').textContent).toContain('Reflect');
    expect(dialog.querySelector('[aria-label="Theme analysis"]').value).toBe('The journey shows curiosity.');
    expect(dialog.querySelector('input[type="checkbox"]').checked).toBe(true);
    expect(dialog.textContent).toContain('1 of 3 steps complete');
    changeValue(dialog.querySelector('[aria-label="Theme analysis"]'),'My revised reflection.');
    await clickAsync(findButton(dialog,'Save progress'));
    const latest=JSON.parse(localStorage.getItem('alloLitLabScripts'));
    expect(latest).toHaveLength(1);
    expect(latest[0].id).toBe(first[0].id);
    expect(latest[0].progress.analysisResponses.theme).toBe('My revised reflection.');
  });

  it('recovers usable work from malformed saved progress and bounds playback positions', async () => {
    localStorage.setItem('alloLitLabScripts',JSON.stringify([{id:'corrupt-progress',title:'Saved Progress',script:playbackFixture,progressVersion:1,progress:{phase:'perform',currentLine:999,currentPage:-3,analysisResponses:{theme:'Keep this answer',personal:{bad:true}},analysisFeedback:{overallRating:'invalid'},revisionPlan:{tasks:'bad'},selfAssessment:{theme:100},emotionLog:{l1:'invalid'}}}]));
    const dialog=await mountLitLab();
    await clickAsync(findButton(dialog,'Saved Progress'));
    expect(dialog.textContent).toContain('Line 1 of 1');
    await clickAsync(findButton(dialog,'Analyze'));
    expect(dialog.querySelector('[aria-label="Theme analysis"]').value).toBe('Keep this answer');
    expect(dialog.querySelector('[aria-label="Personal response"]').value).toBe('');
    expect(dialog.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('plays the visible page and supports restarting from the beginning', async () => {
    const fixture={...playbackFixture,lines:Array.from({length:7},(_,i)=>({id:'l'+(i+1),speaker:'narrator',text:'Line number '+(i+1),type:'narration'}))};
    const onCallTTS=vi.fn(()=>new Promise(()=>{}));
    const dialog=await openPerformance({onCallTTS},fixture);
    await clickAsync(dialog.querySelector('[aria-label="Next page"]'));
    expect(dialog.textContent).toContain('Line 7 of 7');
    await clickAsync(findButton(dialog,'▶ Play'));
    expect(onCallTTS).toHaveBeenCalledWith('Line number 7',expect.any(String),1,expect.objectContaining({language:'English',signal:expect.any(AbortSignal)}));
    expect(dialog.querySelector('[aria-label="Previous page"]').disabled).toBe(true);
    await clickAsync(findButton(dialog,'Restart from beginning'));
    expect(dialog.textContent).toContain('Line 1 of 7');
    expect(dialog.querySelector('[aria-label="Read line 1 aloud"]')).not.toBeNull();
  });
});

describe('LitLab assignment and portfolio save confirmation', () => {
  let previousStore;
  beforeEach(()=>{previousStore=window.AlloModules.StudentArtifactStore;});
  afterEach(()=>{if(previousStore===undefined)delete window.AlloModules.StudentArtifactStore;else window.AlloModules.StudentArtifactStore=previousStore; localStorage.removeItem('alloflow_student_artifacts');delete window.__alloflowStudentArtifacts;});

  it('waits for assignment persistence, prevents duplicate saves and shows failures', async () => {
    let rejectSave;
    const onSaveConfig=vi.fn(()=>new Promise((_,reject)=>{rejectSave=reject;}));
    const addToast=vi.fn();
    const dialog=await mountLitLab({onSaveConfig,addToast,initialConfig:{storyTitle:'My assignment'}});
    const save=dialog.querySelector('[aria-label="Save this LitLab setup as an assignment in My Resources"]');
    addToast.mockClear();
    await clickAsync(save);
    expect(save.disabled).toBe(true);
    await clickAsync(save);
    expect(onSaveConfig).toHaveBeenCalledOnce();
    expect(addToast).not.toHaveBeenCalledWith('LitLab assignment saved!','success');
    await act(async()=>{rejectSave(new Error('Offline'));});
    expect(dialog.querySelector('[role="alert"]').textContent).toContain('The assignment could not be saved');
    expect(save.disabled).toBe(false);
    expect(dialog.querySelector('#litlab-story-title').value).toBe('My assignment');
  });

  it('includes the learner’s writing and chosen performer name and confirms both destinations', async () => {
    const onSaveSubmission=vi.fn(async()=>true);
    const save=vi.fn(async()=>({ok:true}));window.AlloModules.StudentArtifactStore={save};
    const {dialog}=await openAnalysis({onSaveSubmission,studentNickname:'Bright Owl'});
    await clickAsync(findButton(dialog,'Save to Portfolio'));
    expect(onSaveSubmission).toHaveBeenCalledWith(expect.objectContaining({author:'Bright Owl',analysisResponses:{theme:'The journey shows curiosity.'},completedTasks:{}}));
    expect(save).toHaveBeenCalledOnce();
    expect(dialog.textContent).toContain('Performance and reflections saved to My Resources and AlloHaven Portfolio.');
  });

  it('does not write an AlloHaven copy or claim success if submission persistence rejects', async () => {
    const save=vi.fn();window.AlloModules.StudentArtifactStore={save};
    const onSaveSubmission=vi.fn(async()=>{throw new Error('Storage unavailable');});
    const {dialog}=await openAnalysis({onSaveSubmission});
    await clickAsync(findButton(dialog,'Save to Portfolio'));
    expect(save).not.toHaveBeenCalled();
    expect(dialog.querySelector('[role="alert"]').textContent).toContain('Your performance could not be saved');
    expect(findButton(dialog,'Save to Portfolio').disabled).toBe(false);
  });

  it('reports a partial save honestly when the local portfolio copy fails', async () => {
    window.AlloModules.StudentArtifactStore={save:vi.fn(async()=>false)};
    const {dialog}=await openAnalysis({onSaveSubmission:async()=>true});
    await clickAsync(findButton(dialog,'Save to Portfolio'));
    expect(dialog.querySelector('[role="alert"]').textContent).toContain('Saved to My Resources, but the AlloHaven copy could not be saved');
  });
});

describe('LitLab legacy portfolio durability', () => {
  it('does not mistake an in-memory result for a durable portfolio save', async () => {
    const previous=window.AlloModules.StudentArtifactStore;
    window.AlloModules.StudentArtifactStore={save:vi.fn(artifact=>[artifact])};
    try {
      const {dialog}=await openAnalysis({onSaveSubmission:async()=>true});
      await clickAsync(findButton(dialog,'Save to Portfolio'));
      expect(dialog.querySelector('[role="alert"]').textContent).toContain('the AlloHaven copy could not be saved');
    } finally { if(previous===undefined)delete window.AlloModules.StudentArtifactStore;else window.AlloModules.StudentArtifactStore=previous; }
  });

  it('confirms the legacy store when its returned artifact is persisted', async () => {
    const previous=window.AlloModules.StudentArtifactStore;
    window.AlloModules.StudentArtifactStore={save:vi.fn(artifact=>{localStorage.setItem('alloflow_student_artifacts',JSON.stringify([artifact]));return [artifact];})};
    try {
      const {dialog}=await openAnalysis({onSaveSubmission:async()=>true});
      await clickAsync(findButton(dialog,'Save to Portfolio'));
      expect(dialog.textContent).toContain('Performance and reflections saved to My Resources and AlloHaven Portfolio.');
    } finally {localStorage.removeItem('alloflow_student_artifacts');if(previous===undefined)delete window.AlloModules.StudentArtifactStore;else window.AlloModules.StudentArtifactStore=previous;}
  });
});

describe('LitLab durable narration', () => {
  let previousStore, previousService, previousMute;
  let nextUrl, audioInstances, onCallTTS;
  const wav = Buffer.alloc(192);
  wav.write('RIFF',0); wav.writeUInt32LE(184,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(8000,24); wav.writeUInt32LE(8000,28); wav.writeUInt16LE(1,32); wav.writeUInt16LE(8,34);
  wav.write('data',36); wav.writeUInt32LE(148,40); wav.fill(128,44);
  let loadedStore, loadedService;
  beforeAll(() => {
    previousStore=window.AlloModules.KaraokeAudioStore;
    previousService=window.AlloModules.createReadAloudAudioService;
    loadAlloModule('karaoke_audio_store_module.js');
    loadAlloModule('read_aloud_audio_service_source.jsx');
    loadedStore=window.AlloModules.KaraokeAudioStore;
    loadedService=window.AlloModules.createReadAloudAudioService;
  });
  beforeEach(() => {
    window.AlloModules.KaraokeAudioStore=loadedStore;
    window.AlloModules.createReadAloudAudioService=loadedService;
    previousMute=window.__alloIsGlobalMuted;
    window.__alloIsGlobalMuted=()=>false;
    nextUrl=0;audioInstances=[];
    vi.stubGlobal('Audio',class {constructor(url){this.src=url;audioInstances.push(this);}play(){return Promise.resolve();}pause(){}});
    vi.spyOn(URL,'createObjectURL').mockImplementation(()=> 'blob:litlab-saved-'+(++nextUrl));
    vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,blob:async()=>new window.Blob([wav],{type:'audio/wav'})})));
    onCallTTS=vi.fn(async()=> 'blob:litlab-generated');
  });
  afterEach(()=>{
    window.__alloIsGlobalMuted=previousMute;
    window.AlloModules.KaraokeAudioStore=previousStore;
    window.AlloModules.createReadAloudAudioService=previousService;
    vi.unstubAllGlobals();
  });
  async function eventually(check) {
    await vi.waitFor(async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,5));});check();},{timeout:5000});
  }
  async function reopen(onCallTTS) {
    await act(async()=>root.unmount());root=null;host.remove();host=null;
    const dialog=await mountLitLab({onCallTTS});
    await clickAsync(findButton(dialog,'Forest Walk'));
    return dialog;
  }
  it('prepares distinct repeated lines, saves V4 bytes, and reopens without calling TTS or fetching audio',async()=>{
    const fixture={...playbackFixture,lines:[...playbackFixture.lines,{...playbackFixture.lines[0],id:'l2'}]};
    let dialog=await openPerformance({onCallTTS},fixture);
    await clickAsync(findButton(dialog,'Prepare narration'));
    await eventually(()=>expect(dialog.textContent).toContain('Narration saved with this script'));
    const saved=JSON.parse(localStorage.getItem('alloLitLabScripts'));
    expect(saved).toHaveLength(1);
    expect(saved[0].karaokeAudio.version).toBe(4);
    const entries=Object.values(saved[0].karaokeAudio.entries);
    expect(entries).toHaveLength(2);
    expect(entries.map(item=>item.identity.segmentId)).toEqual(['l1','l2']);
    expect(entries[0].audio).toBe(wav.toString('base64'));
    expect(onCallTTS).toHaveBeenCalledTimes(2);
    const offline=vi.fn(async()=>{throw new Error('Offline');});
    dialog=await reopen(offline);
    expect(dialog.textContent).toContain('2 of 2 narration lines ready');
    fetch.mockClear();
    await clickAsync(dialog.querySelector('[aria-label="Read line 2 aloud"]'));
    expect(audioInstances.at(-1).src).toMatch(/^blob:litlab-saved-/);
    expect(offline).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
    await clickAsync(findButton(dialog,'Save progress'));
    expect(JSON.parse(localStorage.getItem('alloLitLabScripts'))).toHaveLength(1);
  });
  it('retains played narration for Save progress and leaves the adapted-text lane untouched',async()=>{
    const foreignLane={marker:'adapted-text'};loadedStore.current=foreignLane;
    const dialog=await openPerformance({onCallTTS});
    await clickAsync(dialog.querySelector('[aria-label="Read line 1 aloud"]'));
    await eventually(()=>expect(dialog.textContent).toContain('New audio is ready'));
    expect(localStorage.getItem('alloLitLabScripts')).toBeNull();
    await clickAsync(findButton(dialog,'Save progress'));
    expect(Object.values(JSON.parse(localStorage.getItem('alloLitLabScripts'))[0].karaokeAudio.entries)).toHaveLength(1);
    expect(loadedStore.current).toBe(foreignLane);loadedStore.current=null;
  });
  it('rebuilds only lines whose character voice changed and explicitly passes the story language',async()=>{
    const fixture={...playbackFixture,characters:[{id:'fox',name:'Fox',voice:'Kore'}],lines:[...playbackFixture.lines,{id:'l2',speaker:'fox',text:'I found the path.',type:'dialogue'}]};
    const dialog=await openPerformance({onCallTTS,geminiVoices:[{id:'Aoede'},{id:'Kore'},{id:'Puck'}]},fixture);
    changeValue(dialog.querySelector('[aria-label="Story language"]'),'Spanish');
    await clickAsync(findButton(dialog,'Prepare narration'));
    await eventually(()=>expect(dialog.textContent).toContain('Narration saved with this script'));
    expect(onCallTTS.mock.calls.every(call=>call[3].language==='Spanish')).toBe(true);
    await clickAsync(dialog.querySelector('[aria-label="Back"]'));
    const voice=dialog.querySelector('[aria-label="Voice for Fox"]');
    act(()=>{voice.value='Puck';voice.dispatchEvent(new Event('change',{bubbles:true}));});
    expect(dialog.textContent).toContain('1 of 2 narration lines ready');
    onCallTTS.mockClear();
    await clickAsync(findButton(dialog,'Prepare narration'));
    await eventually(()=>expect(dialog.textContent).toContain('2 of 2 narration lines ready'));
    await eventually(()=>expect(findButton(dialog,'Prepare narration').disabled).toBe(false));
    expect(onCallTTS).toHaveBeenCalledTimes(1);
    expect(onCallTTS.mock.calls[0][1]).toBe('Puck');
  });
  it('aborts preparation and ignores a provider response arriving after cancellation',async()=>{
    let resolveAudio;
    onCallTTS=vi.fn(()=>new Promise(resolve=>{resolveAudio=resolve;}));
    const dialog=await openPerformance({onCallTTS});
    await clickAsync(findButton(dialog,'Prepare narration'));
    const signal=onCallTTS.mock.calls[0][3].signal;
    await clickAsync(findButton(dialog,'Cancel preparation'));
    expect(signal.aborted).toBe(true);
    await act(async()=>resolveAudio('blob:cancelled'));
    expect(dialog.textContent).toContain('0 of 1 narration lines ready');
    expect(localStorage.getItem('alloLitLabScripts')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('aborts pending playback synthesis on Stop',async()=>{
    onCallTTS=vi.fn(()=>new Promise(()=>{}));
    const dialog=await openPerformance({onCallTTS});
    await clickAsync(findButton(dialog,'▶ Play'));
    const signal=onCallTTS.mock.calls[0][3].signal;
    await clickAsync(dialog.querySelector('[aria-label="Stop playback"]'));
    expect(signal.aborted).toBe(true);
  });
  it('does not speak through browser fallback or award completion when globally muted',async()=>{
    const speak=vi.fn();vi.stubGlobal('speechSynthesis',{speak,cancel:vi.fn()});
    window.__alloIsGlobalMuted=()=>true;
    const score=vi.fn();const dialog=await openPerformance({onCallTTS,handleScoreUpdate:score});
    await clickAsync(dialog.querySelector('[aria-label="Read line 1 aloud"]'));
    await clickAsync(findButton(dialog,'▶ Play'));
    await clickAsync(findButton(dialog,'Prepare narration'));
    expect(onCallTTS).not.toHaveBeenCalled();expect(speak).not.toHaveBeenCalled();expect(score).not.toHaveBeenCalled();
    expect(audioInstances).toHaveLength(0);
  });
  it('keeps successful clips when a line fails and retries only the missing line',async()=>{
    const fixture={...playbackFixture,lines:[...playbackFixture.lines,{...playbackFixture.lines[0],id:'l2',text:'Another line.'}]};
    onCallTTS.mockImplementationOnce(async()=> 'blob:first').mockRejectedValueOnce(new Error('Unavailable'));
    const dialog=await openPerformance({onCallTTS},fixture);
    await clickAsync(findButton(dialog,'Prepare narration'));
    await eventually(()=>expect(dialog.textContent).toContain('1 lines could not be prepared'));
    expect(Object.values(JSON.parse(localStorage.getItem('alloLitLabScripts'))[0].karaokeAudio.entries)).toHaveLength(1);
    onCallTTS.mockClear();
    await clickAsync(findButton(dialog,'Prepare narration'));
    await eventually(()=>expect(dialog.textContent).toContain('Narration saved with this script'));
    expect(onCallTTS).toHaveBeenCalledTimes(1);
  });
  it('does not claim a durable narration save or replace the previous script when storage is full',async()=>{
    const dialog=await openPerformance({onCallTTS});
    await clickAsync(findButton(dialog,'Save progress'));
    const before=localStorage.getItem('alloLitLabScripts');
    const original=Storage.prototype.setItem;
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(key,value){if(key==='alloLitLabScripts')throw new Error('QuotaExceededError');return original.call(this,key,value);});
    await clickAsync(findButton(dialog,'Prepare narration'));
    await eventually(()=>expect(dialog.textContent).toContain('Narration is ready but could not be saved'));
    expect(localStorage.getItem('alloLitLabScripts')).toBe(before);
    expect(dialog.textContent).not.toContain('Narration saved with this script');
  });
});
