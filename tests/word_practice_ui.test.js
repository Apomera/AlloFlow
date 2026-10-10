import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const coreSource = fs.readFileSync('word_practice_core.js', 'utf8');
const uiSource = fs.readFileSync('word_practice_ui.js', 'utf8');
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
let dom, win, ui;
const button = text => [...win.document.querySelectorAll('button')].find(node => node.textContent === text);
const field = label => [...win.document.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === label)?.querySelector('input,select,textarea');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body><button id="launch">Launch</button></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example' });
  win = dom.window; win.eval(coreSource); win.eval(uiSource); ui = win.AlloModules.WordPractice;
});
afterEach(() => { dom.window.close(); });

describe('word practice presenter', () => {
  it('keeps retained word meanings and prepared sentence boards when the teacher edits the list', async () => {
    ui.open({ words: [{ word: 'ship', definition: 'A large boat', sentenceActivity: { prompt: 'The ____ sails.', choices: ['ship', 'rain'], answer: 'ship' } }, 'rain'] });
    field('Words (one per line)').value = 'ship\nsun';
    field('Practice activity').value = 'vocabulary';
    field('Repetitions per word').value = '1';
    field('Shuffle each repetition').checked = false;
    button('Present').click(); await tick();
    button('Show meaning').click();
    expect(win.document.querySelector('.awp-card').textContent).toContain('A large boat');
    button('Back to setup').click();
    field('Practice activity').value = 'sentence';
    button('Present').click(); await tick();
    expect(win.document.querySelector('.awp-card').textContent).toContain('The ____ sails.');
    expect(win.document.querySelector('.awp-progress').textContent).toBe('Card 1 of 1');
    button('rain').click(); expect(win.document.querySelector('.awp-feedback').textContent).toMatch(/Try another/);
    button('ship').click(); expect(win.document.querySelector('.awp-feedback').textContent).toMatch(/Yes/);
  });

  it('does not offer incomplete phoneme audio and supports a focused review round', async () => {
    ui.open({ words: [{ word: 'ship', wordAudio: wav, phonemes: [{ label: 'sh', audio: wav }, { label: 'i' }, { label: 'p', audio: wav }] }, 'rain'], options: { shuffle: false, repetitions: 1 } });
    button('Present').click(); await tick();
    expect(button('Hear sounds').disabled).toBe(true);
    expect(button('Hear word').disabled).toBe(false);
    button('Add to review').click(); button('Next').click();
    expect(win.document.querySelector('.awp-word').textContent).toBe('rain');
    button('Start review (1)').click();
    expect(win.document.querySelector('.awp-word').textContent).toBe('ship');
    expect(win.document.querySelector('.awp-progress').textContent).toBe('Card 1 of 1');
    button('Remove from review').click(); expect(button('Start review (0)').disabled).toBe(true);
  });

  it('responds to arrow keys from controls and preserves native space activation', async () => {
    ui.open({ words: ['ship', 'rain'], options: { repetitions: 1, shuffle: false } });
    button('Present').click(); await tick();
    const next = button('Next'); next.focus();
    next.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(win.document.querySelector('.awp-word').textContent).toBe('rain');
    const space = new win.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    button('Previous').dispatchEvent(space); expect(space.defaultPrevented).toBe(false);
  });

  it('closes on lesson cancellation, restores focus and clears modal isolation', async () => {
    const launcher = win.document.getElementById('launch'); launcher.focus();
    const signal = new win.AbortController();
    ui.open({ words: ['ship'], signal: signal.signal });
    expect(launcher.inert).toBe(true);
    button('Present').click(); await tick(); expect(button('Close')).toBeTruthy();
    signal.abort();
    expect(win.document.querySelector('[role=dialog]')).toBe(null);
    expect(launcher.inert).not.toBe(true); expect(win.document.activeElement).toBe(launcher);
    expect(win.document.body.style.overflow).toBe('');
  });

  it('does not invoke synthesis while presenting or exporting standalone practice', async () => {
    let calls = 0;
    ui.open({ words: ['ship'], callTTS() { calls++; } });
    button('Present').click(); await tick();
    ui.buildHtml({ words: ['ship'] });
    expect(calls).toBe(0);
  });

  it('embeds a safe offline runtime and strips all recordings when audio is unchecked', () => {
    const pack = { title: '</title><script>window.bad=1</script>', words: [{ word: '</script><img src=x onerror=alert(1)>', wordAudio: wav, phonemes: [{ label: 'sh', audio: wav }] }] };
    const html = ui.buildHtml(pack, { includeAudio: false });
    expect(html).not.toContain(wav.split(',')[1]);
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).toContain("default-src 'none'");
    const offline = new JSDOM(html, { runScripts: 'dangerously' });
    expect(offline.window.bad).toBeUndefined();
    expect(offline.window.document.querySelector('img')).toBe(null);
    expect(offline.window.document.querySelector('.awp-word').textContent).toBe(pack.words[0].word);
    expect([...offline.window.document.querySelectorAll('button')].find(node => node.textContent === 'Hear word').hidden).toBe(true);
    offline.window.close();
  });

  it('does not open a cancelled lesson or automatically run a timer', async () => {
    const cancellation = new win.AbortController(); cancellation.abort();
    ui.open({ words: ['ship'], signal: cancellation.signal });
    expect(win.document.querySelector('[role=dialog]')).toBe(null);
    ui.open({ words: ['ship', 'rain'], options: { autoAdvance: true } });
    button('Present').click(); await tick();
    expect(button('Start timer')).toBeTruthy();
    expect(button('Start timer').getAttribute('aria-pressed')).toBe('false');
  });

  it('announces card changes without disclosing an unrevealed spelling or sentence answer', async () => {
    ui.open({ words: ['ship', 'rain'], options: { repetitions: 1, shuffle: false, mode: 'spelling' } });
    button('Present').click(); await tick();
    const announcement = win.document.querySelector('.awp-sr[role=status]');
    expect(announcement.textContent).toContain('Card 1 of 2');
    expect(announcement.textContent).not.toContain('ship');
    button('Reveal answer').click(); expect(announcement.textContent).toContain('ship');
    button('Next').click(); expect(announcement.textContent).toContain('Card 2 of 2'); expect(announcement.textContent).not.toContain('rain');
    button('Close').click();
    ui.open({ words: [{ word: 'ship', sentenceActivity: { prompt: 'The ____ sails.', choices: ['ship', 'rain'], answer: 'ship' } }], options: { mode: 'sentence' } });
    button('Present').click(); await tick();
    expect(win.document.querySelector('.awp-sr').textContent).toContain('The ____ sails.');
    expect(win.document.querySelector('.awp-sr').textContent).not.toContain('ship');
  });

  it('contains tab focus within the full screen player instead of the hidden dialog header', async () => {
    ui.open({ words: ['ship', 'rain'] }); button('Present').click(); await tick();
    const player = win.document.querySelector('.awp-player');
    Object.defineProperty(win.document, 'fullscreenElement', { configurable: true, value: player });
    win.document.querySelectorAll('button').forEach(node => { node.getClientRects = () => [{ width: 100, height: 44 }]; });
    button('New round').focus();
    button('New round').dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(win.document.activeElement).toBe(button('Back to setup'));
    button('Back to setup').dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(win.document.activeElement).toBe(button('New round'));
  });

  it('shows numeric audio preparation progress and retains concise partial failure details', async () => {
    let finish;
    win.AlloWordPracticeMedia = { prepareAudio(pack, context, progress) {
      progress({ completed: 1, total: 2, word: 'ship' });
      return new Promise(resolve => { finish = () => resolve({ ...pack, audioStatus: { message: 'Some recordings are unavailable. Available clips were kept.', errors: ['rain: provider quota reached.'] } }); });
    } };
    ui.open({ words: ['ship', 'rain'] }); button('Prepare audio').click();
    expect(win.document.querySelector('.awp-status').textContent).toContain('1 of 2');
    finish(); await tick();
    expect(win.document.querySelector('.awp-status').textContent).toContain('rain: provider quota reached.');
    expect(win.document.querySelector('.awp-status').textContent).toContain('Some recordings are unavailable.');
  });

  it('gives every setup field an explicit name independent of its options and restores those names after presenting', async () => {
    ui.open({ words: ['ship'] });
    for (const label of win.document.querySelectorAll('.awp-fields label')) {
      const control = label.querySelector('input,select,textarea');
      expect(label.htmlFor).toBe(control.id);
      expect(win.document.getElementById(control.getAttribute('aria-labelledby')).textContent).toBe(label.querySelector('span').textContent);
    }
    const mode = field('Practice activity');
    expect(win.document.getElementById(mode.getAttribute('aria-labelledby')).textContent).toBe('Practice activity');
    button('Present').click(); await tick(); button('Back to setup').click();
    expect(win.document.getElementById(mode.getAttribute('aria-labelledby')).textContent).toBe('Practice activity');
  });

  it.each([['fr', false], ['en-GB', true]])('uses launcher audio banks only for the imported teaching language (%s)', async (language, matching) => {
    const phonemeBank = { a: wav }, wordBank = { ami: wav };
    let received;
    win.AlloWordPracticeMedia = { async prepareAudio(pack, context) { received = { pack, context }; return pack; } };
    ui.open({ words: ['ship'], language: 'English', phonemeBank, wordBank });
    const imported = { language, words: [{ word: 'ami', phonemes: [{ label: 'a' }, { label: 'm', audio: wav }] }] };
    const file = win.document.querySelector('input[type=file]');
    Object.defineProperty(file, 'files', { value: [{ size: 1000, text: async () => JSON.stringify(imported) }] });
    file.dispatchEvent(new win.Event('change', { bubbles: true })); await tick();
    button('Prepare audio').click(); await tick();
    expect(received.pack.items[0].phonemes[0].audio).toBe(matching ? wav : '');
    expect(received.pack.items[0].phonemes[1].audio).toBe(wav);
    if (matching) { expect(received.context.phonemeBank).toBe(phonemeBank); expect(received.context.wordBank).toBe(wordBank); }
    else { expect(Object.keys(received.context.phonemeBank)).toHaveLength(0); expect(Object.keys(received.context.wordBank)).toHaveLength(0); }
  });

  it('withholds sentence answer recordings until reveal or a correct response and resets them on the next card', async () => {
    ui.open({ words: [{ word: 'ship', wordAudio: wav, phonemes: [{ label: 'sh', audio: wav }], sentenceActivity: { prompt: 'The ____ sails.', choices: ['ship', 'rain'], answer: 'ship' } }], options: { mode: 'sentence', repetitions: 3 } });
    button('Present').click(); await tick();
    expect(button('Hear word').hidden).toBe(true); expect(button('Hear sounds').hidden).toBe(true);
    button('rain').click(); expect(button('Hear word').hidden).toBe(true);
    button('ship').click(); expect(button('Hear word').hidden).toBe(false); expect(button('Hear sounds').hidden).toBe(false);
    button('Next').click(); expect(button('Hear word').hidden).toBe(true); expect(button('Hear sounds').hidden).toBe(true);
    button('Reveal answer').click(); expect(button('Hear word').hidden).toBe(false); expect(button('Hear sounds').hidden).toBe(false);
  });
});
