import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
let dom, win, ui, downloads;
const source = ['word_practice_core.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const button = name => [...win.document.querySelectorAll('button')].find(node => node.textContent === name);
const field = name => [...win.document.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === name)?.querySelector('input,select,textarea');
beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example/' });
  win = dom.window; win.eval(source); ui = win.AlloModules.WordPractice; downloads = [];
  win.URL.createObjectURL = blob => { downloads.push(blob); return 'blob:download'; }; win.URL.revokeObjectURL = () => {};
  win.HTMLAnchorElement.prototype.click = () => {};
});
afterEach(() => dom.window.close());

describe('word practice cancellable preparation', () => {
  it('cancels audio preparation without losing edits and rejects late results from an older run', async () => {
    const runs = [];
    win.AlloWordPracticeMedia = { prepareAudio(pack, context, progress) { return new Promise(resolve => runs.push({ pack, context, progress, resolve })); } };
    ui.open({ words: ['ship', 'rain'] });
    field('Practice title').value = 'My edited title'; field('Words (one per line)').value = 'ship\nsun'; field('Repetitions per word').value = '5';
    button('Prepare audio').focus(); button('Prepare audio').click(); await tick();
    expect(win.document.activeElement).toBe(button('Cancel preparation'));
    runs[0].progress({ completed: 1, total: 2, word: 'ship' });
    const status = win.document.querySelector('.awp-status');
    expect(status.textContent).toContain('1 of 2'); expect(status.closest('[aria-busy="true"]')).toBe(null);
    expect(win.document.querySelector('progress').value).toBe(1);
    button('Cancel preparation').click();
    expect(runs[0].context.signal.aborted).toBe(true); expect(win.document.activeElement).toBe(button('Prepare audio'));
    expect(field('Practice title').value).toBe('My edited title'); expect(field('Words (one per line)').value).toBe('ship\nsun'); expect(field('Repetitions per word').value).toBe('5');
    button('Prepare audio').click(); runs[1].progress({ completed: 1, total: 2, word: 'sun' });
    runs[0].progress({ completed: 2, total: 2, word: 'OLD' }); runs[0].resolve({ words: ['obsolete'] }); await tick();
    expect(status.textContent).toContain('sun'); expect(field('Words (one per line)').disabled).toBe(true); expect(button('Cancel preparation').hidden).toBe(false);
    runs[1].resolve(runs[1].pack); await tick();
    expect(field('Words (one per line)').disabled).toBe(false); expect(field('Words (one per line)').value).toBe('ship\nsun');
  });

  it('does not serialize or download a cancelled PowerPoint build', async () => {
    let finish, signal, writes = 0;
    win.AlloWordPracticeMedia = { buildPptx(pack, options, sequence, context) {
      signal = context.signal; context.onProgress({ completed: 1, total: 3 });
      return new Promise(resolve => { finish = () => resolve({ write() { writes++; return new win.Blob(['pptx']); } }); });
    } };
    ui.open({ words: ['ship'] }); button('Download PowerPoint').click();
    expect(win.document.querySelector('.awp-status').textContent).toBe('Building PowerPoint. Cards: 1 of 3.');
    button('Cancel preparation').click(); finish(); await tick();
    expect(signal.aborted).toBe(true); expect(writes).toBe(0); expect(downloads).toHaveLength(0);
  });

  it.each(['cancel', 'close'])('suppresses the late download when %s happens during PowerPoint serialization', async how => {
    let finish;
    win.AlloWordPracticeMedia = { async buildPptx() { return { write({ outputType }) { expect(outputType).toBe('blob'); return new Promise(resolve => { finish = () => resolve(new win.Blob(['pptx'])); }); } }; } };
    ui.open({ words: ['ship'] }); button('Download PowerPoint').click(); await tick();
    expect(win.document.querySelector('.awp-status').textContent).toContain('Finishing PowerPoint');
    button(how === 'cancel' ? 'Cancel preparation' : 'Close').click(); finish(); await tick();
    expect(downloads).toHaveLength(0);
    if (how === 'cancel') expect(win.document.querySelector('.awp-status').textContent).toContain('Preparation cancelled');
    else expect(win.document.querySelector('.awp-dialog')).toBe(null);
  });

  it('downloads a successfully serialized PowerPoint exactly once', async () => {
    win.AlloWordPracticeMedia = { async buildPptx() { return { async write() { return new win.Blob(['pptx']); } }; } };
    ui.open({ words: ['ship'] }); button('Download PowerPoint').click(); await tick();
    expect(downloads).toHaveLength(1); expect(win.document.querySelector('.awp-status').textContent).toBe('PowerPoint downloaded.');
    expect(button('Cancel preparation').hidden).toBe(true);
  });

  it('lists exact affected words by category and offers working review controls', () => {
    ui.open({ words: [{ word: 'ship', definition: 'A boat' }, 'rain'], options: { mode: 'vocabulary' } });
    const details = win.document.querySelector('.awp-review-details');
    expect(details.hidden).toBe(false);
    const groups = [...details.querySelectorAll('h2')].map(heading => [heading.textContent, [...heading.nextElementSibling.children].map(item => item.textContent)]);
    expect(groups).toEqual([['No meaning, example or translation', ['rain']], ['No word recording', ['ship', 'rain']]]);
    button('Review word list').click(); expect(win.document.activeElement).toBe(field('Words (one per line)'));
    button('Choose another activity').click(); expect(win.document.activeElement).toBe(field('Practice activity'));
  });
});
