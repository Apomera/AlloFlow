import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url), React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')), { act } = React;
vi.setConfig({ testTimeout: 30000 }); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let Library, segment, root, host;
const book = { slug: 'reading-link-fixture', title: 'Forest', language: 'English', langCode: 'en', level: '4', contentType: 'public-domain-full-text', authors: [], license: 'Public Domain', source: { name: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/1' }, pages: [{ n: 1, text: 'The forest provides shade for animals.' }, { n: 2, text: 'A fox rests beneath the tall tree.' }] };
beforeAll(() => { window.React = globalThis.React = React; window.AlloLanguageContext = React.createContext({ t: key => key }); window.AlloSpeechPlayer = { stop() {} }; loadAlloModule('reading_library_module.js'); loadAlloModule('immersive_reader_module.js'); Library = window.AlloModules.ReadingLibrary; segment = window.AlloModules.segmentFocusWords; });
beforeEach(() => { localStorage.clear(); });
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; host?.remove(); vi.restoreAllMocks(); });
async function mount(props = {}) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); await act(async () => root.render(React.createElement(Library.BookReader,{ book, readingScope: 'learner|one', isTeacherMode: false, ...props }))); }
const btn = name => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === name || b.getAttribute('aria-label') === name);
async function click(name) { if(!btn(name)) throw Error('No button '+name); await act(async () => btn(name).click()); }
async function select(label,value) { const l = [...host.querySelectorAll('label')].find(l=>l.textContent.startsWith(label)); const el=l.querySelector('select'); await act(async()=>{ el.value=value;el.dispatchEvent(new Event('change',{bubbles:true})); }); }

describe('library to Lumen source handoff',()=>{
  it('sends the current page and known word/bookmark locations with a shared profile key', async()=>{
    localStorage.setItem(Library._readerStorageKey('allo_reading_lib_bookmarks','learner|one'),JSON.stringify({[book.slug]:[1]}));
    localStorage.setItem(Library._readerStorageKey('allo_reading_lib_words','learner|one'),JSON.stringify([{word:'shade',text:'Out of sunlight',language:'English',slug:book.slug,page:0,passage:book.pages[0].text},{word:'legacy',text:'Old',language:'English',slug:book.slug}]));
    const launch=vi.fn(); await mount({onReadReflect:launch});await click('Read & reflect');const payload=launch.mock.calls[0][0];
    expect(payload.text).toBe(book.pages[0].text);expect(payload.anchor).toMatchObject({slug:book.slug,page:0});expect(payload.entries).toHaveLength(2);expect(payload.entries.find(e=>e.type==='bookmark').anchor.page).toBe(1);expect(payload.entries.find(e=>e.type==='vocabulary').word).toBe('shade');
  });
  it('restores an exact page even in a short book and consumes the request', async()=>{
    const consumed=vi.fn();await mount({initialReadingLocation:{slug:book.slug,page:1,language:'English'},onReadingLocationConsumed:consumed});
    expect(host.querySelector('[aria-label="Go to page"]').value).toBe('2');expect(consumed).toHaveBeenCalledOnce();
  });
  it('does not automatically expose another profile or legacy device words', async()=>{
    localStorage.setItem('allo_reading_lib_words',JSON.stringify([{word:'old',language:'English'}]));localStorage.setItem(Library._readerStorageKey('allo_reading_lib_words','learner|other'),JSON.stringify([{word:'private',language:'English'}]));
    await mount();await click('📒 My words');expect(host.querySelector('[data-testid="word-bank"]').textContent).not.toContain('private');expect(Library._loadWordBank('learner|one')).toEqual([]);
    await click('Import older device words & bookmarks');expect(Library._loadWordBank('learner|one')[0].word).toBe('old');expect(Library._loadWordBank()[0].word).toBe('old');expect(Library._loadWordBank('learner|other')[0].word).toBe('private');
  });
  it('persists column and ruler settings only for the active profile',async()=>{
    await mount();await click('Reading supports');await select('Reading column','40');await select('Ruler band height','140');
    const prefs=JSON.parse(localStorage.getItem(Library._readerStorageKey('allo_reading_lib_prefs','learner|one')));expect(prefs.columnWidth).toBe(40);expect(prefs.rulerHeight).toBe(140);expect(localStorage.getItem('allo_reading_lib_prefs')).toBeNull();
    expect([...host.querySelectorAll('[style]')].some(el=>el.style.maxWidth==='40ch')).toBe(true);
  });
});

describe('locale-aware Focus Reader pacing',()=>{
  it.each([['中文阅读帮助理解。','Chinese'],['ฉันชอบอ่านหนังสือภาษาไทย','Thai'],['私は本を読みます。','Japanese']])('segments %s into useful units without dropping characters', (text,language)=>{const words=segment(text,language);expect(words.length).toBeGreaterThan(1);expect(words.join('')).toBe(text);});
  it('removes heading, emphasis and link markup without changing unspaced text',()=>{expect(segment('# 中文\n\n**阅读** [帮助](https://example.test)','zh').join('')).toBe('中文阅读帮助');});
  it('preserves familiar English words and their punctuation',()=>{expect(segment('A well-known fox, resting.','English')).toEqual(['A','well-known','fox,','resting.']);});
  it('handles mixed scripts and emoji without dropping punctuation',()=>{const text='阅读📖很好！';expect(segment(text,'zh').join('')).toBe(text);});
  it('degrades without Intl.Segmenter and does not crash on an unknown locale',()=>{expect(segment('中文阅读','a made-up locale').length).toBeGreaterThan(1);const saved=Intl.Segmenter;try{Intl.Segmenter=undefined;expect(segment('中文阅读。','zh').join('')).toBe('中文阅读。');}finally{Intl.Segmenter=saved;}});
});
