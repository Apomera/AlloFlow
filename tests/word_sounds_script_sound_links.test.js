// Lesson script sound links (2026-11-07): each /sound/ in the script opens a pop-up that plays it through the
// activities' own audio path (recorded and voice pack clips) or opens the voice pack editor on that sound.
// Links print as plain text.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const PACK = [
  { word: 'corn', targetWord: 'corn', phonemes: ['k', 'or', 'n'], graphemes: ['c', 'or', 'n'], syllables: ['corn'], rhymeWord: 'horn', familyEnding: '-orn' },
  { word: 'horn', targetWord: 'horn', phonemes: ['h', 'or', 'n'], graphemes: ['h', 'or', 'n'], syllables: ['horn'], rhymeWord: 'corn', familyEnding: '-orn' },
  { word: 'fork', targetWord: 'fork', phonemes: ['f', 'or', 'k'], graphemes: ['f', 'or', 'k'], syllables: ['fork'] },
];
const PLAN = { masteryMode: 'consecutive', masteryThreshold: 3, activities: [{ id: 'counting', count: 2 }, { id: 'mapping', count: 2 }], order: ['counting', 'mapping'], totalItems: 4, estimatedMinutes: 2 };

let WordSoundsModal, container, root;
beforeAll(() => {
  WordSoundsModal = setupWordSounds().WordSoundsModal;
  window.AlloWordSoundsDI = require(resolve(process.cwd(), 'word_sounds_di_loader.js'));
});
afterEach(() => {
  if (root) act(() => { root.unmount(); });
  if (container && container.parentNode) container.parentNode.removeChild(container);
  root = null; container = null;
  delete window.AlloModules.WordSoundsVoicePackEditor;
});
function open(extra = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  act(() => { root.render(React.createElement(WordSoundsModal, Object.assign(baseProps('counting'), {
    isTeacherMode: true, isProbeMode: false, wsPreloadedWords: PACK, lessonPlanConfig: PLAN, wordSoundsLanguage: 'en' }, extra))); });
  act(() => { container.querySelector('[aria-label="Open the lesson script"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
}
const links = () => [...container.querySelectorAll('button[data-ws-di-sound]')];
const popup = () => container.querySelector('[data-ws-di-sound-popup]');

describe('sound links in the lesson script', () => {
  it('turns the script\'s /sounds/ into links, word list included', () => {
    open();
    const sounds = links().map((b) => b.getAttribute('data-ws-di-sound'));
    expect(sounds.length).toBeGreaterThan(5);
    expect(sounds).toEqual(expect.arrayContaining(['k', 'or', 'n']));
    const wordRow = [...container.querySelectorAll('#ws-di-print tbody tr')].find((tr) => tr.textContent.startsWith('corn'));
    expect(wordRow.querySelectorAll('button[data-ws-di-sound]').length).toBe(3);
    expect(wordRow.textContent).toContain('/k/ /or/ /n/');
  });

  it('a link opens a pop-up that plays the sound, and Escape closes it back to the link', () => {
    const handleSpy = vi.fn();
    open();
    const link = links().find((b) => b.getAttribute('data-ws-di-sound') === 'or');
    act(() => { link.click(); });
    expect(popup().getAttribute('data-ws-di-sound-popup')).toBe('or');
    expect(popup().getAttribute('role')).toBe('dialog');
    expect(document.activeElement).toBe(popup().querySelector('[data-ws-di-sound-play]'));
    expect(popup().querySelector('[data-ws-di-sound-edit]'), 'no editor loaded, no edit button').toBeNull();
    act(() => { popup().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(popup()).toBeNull();
    expect(container.querySelector('#ws-di-print'), 'Escape closed only the pop-up').toBeTruthy();
    expect(document.activeElement).toBe(link);
    void handleSpy;
  });

  it('Edit in voice pack opens the editor on that sound', () => {
    const seen = [];
    window.AlloModules.WordSoundsVoicePackEditor = (props) => { seen.push(props.focusKey); return React.createElement('div', { 'data-fake-voice-pack': props.focusKey }); };
    open();
    act(() => { links().find((b) => b.getAttribute('data-ws-di-sound') === 'k').click(); });
    act(() => { popup().querySelector('[data-ws-di-sound-edit]').click(); });
    expect(container.querySelector('[data-fake-voice-pack]').getAttribute('data-fake-voice-pack')).toBe('k');
    expect(seen).toContain('k');
  });

  it('plays through the activities\' audio path, and prints the links as plain text', () => {
    const src = readFileSync('word_sounds_module.js', 'utf8');
    expect(src).toContain('onPlaySound: (sound) => handleAudio("/" + sound + "/"),');
    expect(src).toContain('copy.querySelectorAll("button[data-ws-di-sound]").forEach((link) => link.replaceWith(document.createTextNode(link.textContent)));');
  });
});

describe('the voice pack editor', () => {
  const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
  it('is offered to the activity and can open on one sound', () => {
    expect(setup).toContain("typeof PhonemeVoicePackEditor !== 'undefined') { window.AlloModules = window.AlloModules || {}; window.AlloModules.WordSoundsVoicePackEditor = PhonemeVoicePackEditor; }");
    expect(setup).toContain('const PhonemeVoicePackEditor = ({ onClose, t, focusKey }) => {');
    expect(setup).toContain("data-voice-pack-key={key} aria-current={key === focusPackKey ? 'true' : undefined}");
  });
});
