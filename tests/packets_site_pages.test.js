import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// The no-AI front door of the site: packets.html (front door), packets-make.html (the maker) and
// packets-try.html (the preview "Try it" opens). Part 1 reads the files as text. Part 2 runs the maker in
// jsdom with the real builder, core, sound dictionary and word list, and small stand-in sound files.
const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();

const read = (file) => readFileSync(file, 'utf8');
const PAGES = ['packets.html', 'packets-make.html', 'packets-try.html'];
const SCRIPTS = ['packets-page.js', 'packets-make.js', 'packets-try.js'];
const NEW_FILES = [...PAGES, ...SCRIPTS, 'packets.css', 'packets-mark.svg'];
// The sentences about the voices, word for word, in the "See the details" panel of both pages.
const VOICES = 'Nothing is generated when you make a file or when a student uses it. The spoken sounds were recorded ahead of time with computer voices, including an AI voice.';
const NAME = 'AlloFlow Packets';
const parse = (file) => new JSDOM(read(file)).window.document;
const csp = (doc) => doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');

// The web addresses in these files, and why each is there.
const ALLOWED_ADDRESSES = [
  { file: 'packets.html', url: 'https://github.com/Apomera/AlloFlow', why: 'a link (not a load) to the public source code, the same address index.html already links' },
  { file: 'packets-mark.svg', url: 'http://www.w3.org/2000/svg', why: 'the SVG namespace name, which an SVG file must carry; it is a name and is never fetched' },
];
// Every sentence on the pages that holds the word AI. Each says that none runs, or says exactly where one was used.
const ALLOWED_AI_SENTENCES = [
  'Runs without AI.',  
  'This page runs without AI.',                                                                  // the tagline, in the title, the description and the h1
  'This page runs without AI. No account. Nothing you choose leaves your device.',    // the proof line
  'Run AI.',                                                                 // a list item under "A practice file cannot"
  'The spoken sounds were recorded ahead of time with computer voices, including an AI voice.',   // the voices, said exactly
];
// British spellings and usages that must not reach a US teacher.
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const STRICT = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; form-action 'none'; base-uri 'none'";
const CSP = {
  'packets.html': STRICT,
  'packets-make.html': STRICT.replace("img-src 'self';", "img-src 'self'; connect-src 'self';"),
  // The preview shows a built practice file, which carries its script and styles inside itself. A browser hands
  // this page's rule down to the framed file, so inline script and style must be allowed here, and only here.
  'packets-try.html': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src data: blob:; connect-src blob:; frame-src blob:; form-action 'none'; base-uri 'none'",
};

describe('the pages as files', () => {
  it('hold no web address but the one listed, and every address they use is relative', () => {
    expect(read('index.html')).toContain('href="' + ALLOWED_ADDRESSES[0].url + '"');
    for (const file of NEW_FILES) {
      const allowed = ALLOWED_ADDRESSES.filter((row) => row.file === file).map((row) => row.url);
      expect((read(file).match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || []).filter((url) => !allowed.includes(url)), file).toEqual([]);
    }
    for (const file of PAGES) {
      const doc = parse(file);
      for (const node of doc.querySelectorAll('[href], [src]')) {
        const address = node.getAttribute('href') || node.getAttribute('src');
        if (ALLOWED_ADDRESSES.some((row) => row.file === file && row.url === address)) continue;
        // Three hosts serve these files, one of them from a sub-folder: no scheme, no host, no leading slash.
        expect(address, file).toMatch(/^(?:#[\w-]+|\.\/|[\w.-]+(?:\/[\w.-]+)*(?:#[\w-]+)?)$/);
      }
    }
  });

  it('have no inline script, no inline style and no inline handler', () => {
    for (const file of PAGES) {
      const doc = parse(file);
      expect(doc.querySelectorAll('style').length, file).toBe(0);
      for (const script of doc.querySelectorAll('script')) {
        expect(script.getAttribute('src'), file).toMatch(/^[\w.-]+\.js$/);
        expect(script.textContent.trim(), file).toBe('');
      }
      for (const node of doc.querySelectorAll('*')) {
        for (const attribute of node.attributes) {
          expect(/^on|^style$/i.test(attribute.name), file + ' ' + node.tagName + ' ' + attribute.name).toBe(false);
          expect(/^\s*javascript:/i.test(attribute.value), file).toBe(false);
        }
      }
    }
    expect(read('packets.css')).not.toMatch(/@import|url\(|@font-face/i);
  });

  it('carry the rule that tells the browser to refuse everything else, before anything is loaded', () => {
    for (const file of PAGES) {
      const doc = parse(file);
      expect(csp(doc), file).toBe(CSP[file]);
      expect(csp(doc), file).toContain("default-src 'none'");
      const head = [...doc.head.children];
      const at = head.findIndex((node) => node.getAttribute('http-equiv') === 'Content-Security-Policy');
      expect(head.slice(0, at).every((node) => node.tagName === 'META'), file).toBe(true);
    }
    for (const file of ['packets.html', 'packets-make.html']) expect(CSP[file], file).not.toMatch(/unsafe|\*|data:|blob:|https?:/);
    // The loosened page loads one script, keeps nothing, and is reached only from the maker.
    const tryPage = parse('packets-try.html');
    expect([...tryPage.querySelectorAll('script')].map((script) => script.getAttribute('src'))).toEqual(['packets-try.js']);
    expect(read('packets-try.js')).not.toMatch(/localStorage|sessionStorage|indexedDB|cookie|allow-same-origin/);
    expect(read('packets-try.js')).toContain("frame.setAttribute('sandbox', 'allow-scripts allow-downloads')");
    expect(read('packets.html')).not.toContain('packets-try');
  });

  it('load nothing from the shared site assets, which pull in fonts and icons from other hosts', () => {
    for (const file of PAGES) expect(read(file), file).not.toMatch(/shared\.css|site\.js|lucide|fonts\.g|unpkg|promo/i);
    for (const file of SCRIPTS) expect(read(file), file).not.toMatch(/XMLHttpRequest|WebSocket|EventSource|sendBeacon|\beval\s*\(|new\s+Function|\bimport\s*\(|\.\s*cookie\b|getUserMedia|serviceWorker/);
    // The only requests the page scripts make: the sound files and the picture files (maker) and the built file in memory (preview).
    expect(read('packets-page.js')).not.toMatch(/fetch|localStorage/);
    expect(read('packets-make.js').match(/window\.fetch\(([^,)]+)/g)).toEqual(['window.fetch(file.url', 'window.fetch(file.url', 'window.fetch(shard.url']);
    expect(read('packets-try.js').match(/window\.fetch\(([^,)]+)/g)).toEqual(['window.fetch(address']);
  });

  it('refer only to local files that exist', () => {
    for (const file of PAGES) {
      for (const node of parse(file).querySelectorAll('[href], [src]')) {
        const address = (node.getAttribute('href') || node.getAttribute('src')).replace(/#.*$/, '');
        if (!address || /^https:/.test(address)) continue;
        expect(existsSync(address === './' ? 'index.html' : address), file + ' -> ' + address).toBe(true);
      }
    }
    for (const file of SCRIPTS) {
      const named = read(file).match(/'[\w./-]+\.(?:json|html|js|css|svg)'/g) || [];
      for (const quoted of named) expect(existsSync(quoted.slice(1, -1)), file + ' -> ' + quoted).toBe(true);
    }
    expect(read('packets-make.js')).toContain("'packets-try.html'");
  });

  it('say "AI" only to say there is none', () => {
    const sentences = (text) => text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter((sentence) => /\bAI\b/.test(sentence));
    for (const file of PAGES) {
      const doc = parse(file);
      const BLOCK = 'title, h1, h2, h3, p, li, summary, legend, label, button, dt, dd, option';
      const blocks = [...doc.querySelectorAll(BLOCK)].filter((node) => !node.querySelector(BLOCK));
      const found = blocks.flatMap((node) => sentences(node.textContent));
      const described = sentences(doc.querySelector('meta[name="description"]')?.getAttribute('content') || '');
      for (const sentence of [...found, ...described]) expect(ALLOWED_AI_SENTENCES, file + ': ' + sentence).toContain(sentence);
      // Nothing outside those blocks, and no attribute, mentions it.
      const mentions = (text) => (text.match(/\bAI\b/g) || []).length;
      expect(mentions(doc.documentElement.textContent), file).toBe(blocks.reduce((sum, node) => sum + mentions(node.textContent), 0));
      for (const node of doc.querySelectorAll('*')) {
        for (const attribute of node.attributes) if (!(node.tagName === 'META' && attribute.name === 'content')) expect(/\bAI\b/.test(attribute.value), file + ' ' + attribute.name).toBe(false);
      }
    }
    const cannot = [...parse('packets.html').querySelectorAll('h3')].find((heading) => heading.textContent === 'A practice file cannot');
    expect(cannot.nextElementSibling.querySelector('li').textContent).toBe('Run AI. ' + VOICES);
    // The headline stays, and the details say exactly how the voices were made, on both pages.
    expect(parse('packets.html').querySelector('h1').textContent).toBe('Practice and progress checks. Runs without AI. No accounts.');
    for (const file of ['packets.html', 'packets-make.html']) expect(parse(file).querySelector('details.proof .proof-body li').textContent, file).toBe(VOICES);
    expect(parse('packets-make.html').getElementById('sources').textContent).toContain('recorded ahead of time with computer voices, including an AI voice');
    // In the scripts the word appears in comments only: no line a visitor reads.
    for (const file of SCRIPTS) for (const line of read(file).split('\n')) if (/\bAI\b/.test(line)) expect(line.trim().startsWith('//'), file + ': ' + line).toBe(true);
    expect(read('packets.html') + read('packets-make.html')).not.toMatch(/Gemini|ChatGPT|chatbot|generat(?:es|ive)|\bLLM\b/i);
  });

  it('keep the product name in one place on each page', () => {
    for (const file of ['packets.html', 'packets-make.html']) {
      expect(read(file).split(NAME).length - 1, file).toBe(1);
      expect(parse(file).getElementById('product-name').textContent).toBe(NAME);
    }
    for (const file of ['packets-try.html', ...SCRIPTS, 'packets.css']) expect(read(file), file).not.toContain(NAME);
  });

  it('have one h1 and headings that never skip a level', () => {
    for (const file of PAGES) {
      const levels = [...parse(file).querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) => Number(node.tagName[1]));
      expect(levels.filter((level) => level === 1), file).toEqual([1]);
      expect(levels[0], file).toBe(1);
      levels.forEach((level, i) => { if (i) expect(level - levels[i - 1], file + ' heading ' + i).toBeLessThanOrEqual(1); });
    }
  });

  it('give every control a name, and every page its landmarks', () => {
    for (const file of PAGES) {
      const doc = parse(file);
      const named = (node) => {
        if ((node.getAttribute('aria-label') || '').trim()) return true;
        const by = node.getAttribute('aria-labelledby');
        if (by) return by.split(/\s+/).every((id) => doc.getElementById(id));
        if (node.id && doc.querySelector('label[for="' + node.id + '"]')?.textContent.trim()) return true;
        return !!node.closest('label')?.textContent.trim();
      };
      for (const node of doc.querySelectorAll('input, select, textarea, progress')) expect(named(node), file + ' ' + node.outerHTML.slice(0, 80)).toBe(true);
      for (const node of doc.querySelectorAll('button, a[href]')) expect((node.textContent.trim() || node.getAttribute('aria-label') || '').length, file + ' ' + node.outerHTML.slice(0, 80)).toBeGreaterThan(0);
      for (const node of doc.querySelectorAll('[aria-describedby], [aria-labelledby]')) {
        for (const id of (node.getAttribute('aria-describedby') || node.getAttribute('aria-labelledby')).split(/\s+/)) expect(doc.getElementById(id), file + ' #' + id).toBeTruthy();
      }
      for (const group of doc.querySelectorAll('fieldset')) expect(group.querySelector('legend')?.textContent.trim(), file).toBeTruthy();
      for (const node of doc.querySelectorAll('button')) expect(node.getAttribute('type'), file).toBe('button');
      expect(doc.documentElement.getAttribute('lang'), file).toBe('en');
      expect(doc.querySelectorAll('main').length, file).toBe(1);
      expect(doc.querySelector('meta[name="viewport"]').getAttribute('content'), file).not.toMatch(/user-scalable|maximum-scale/);
      expect(new Set([...doc.querySelectorAll('[id]')].map((node) => node.id)).size, file).toBe(doc.querySelectorAll('[id]').length);
    }
    for (const file of ['packets.html', 'packets-make.html']) {
      const doc = parse(file);
      expect(doc.querySelector('a.skip').getAttribute('href'), file).toBe('#main');
      expect(doc.querySelector('header') && doc.querySelector('main#main') && doc.querySelector('footer'), file).toBeTruthy();
      expect(doc.querySelector('details.proof summary').textContent, file).toContain('This page runs without AI. No account. Nothing you choose leaves your device.');
      expect([...doc.querySelectorAll('footer a')].map((link) => link.textContent), file).toEqual(['More from AlloFlow']);
    }
    expect(read('packets.css')).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px/);
    expect(read('packets.css')).toMatch(/prefers-reduced-motion/);
    // A heading the page moves focus to is read by a screen reader and shows no box; controls keep their outline.
    expect(read('packets.css')).toContain('[tabindex="-1"]:focus, [tabindex="-1"]:focus-visible { outline: none; }');
    const maker = parse('packets-make.html');
    for (const id of ['step-1-title', 'step-2-title', 'step-3-title', 'after-save']) expect(maker.getElementById(id).getAttribute('tabindex'), id).toBe('-1');
    for (const node of maker.querySelectorAll('[tabindex="-1"]')) expect(node.matches('button, a, input, select, textarea, summary'), node.id).toBe(false);
    // On a phone the one primary button of a step takes the full width.
    expect(read('packets.css')).toMatch(/@media \(max-width: 29\.99rem\) \{\s*\.actions \.btn-primary \{ flex: 1 1 100%; \}/);
    for (const step of maker.querySelectorAll('section.sheet')) expect(step.querySelectorAll('.btn-primary').length, step.id).toBe(1);
  });

  it('use American spelling, and the neutral mark as the tab icon', () => {
    for (const file of NEW_FILES) expect(BRITISH.exec(read(file)), file).toBeNull();
    for (const file of PAGES) {
      const icons = [...parse(file).querySelectorAll('link[rel="icon"]')].map((link) => link.getAttribute('href'));
      expect(icons, file).toEqual(['packets-mark.svg']);
      expect(read(file), file).not.toContain('allobot');
    }
    const mark = read('packets-mark.svg');
    expect(mark).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32">/);
    expect(mark).not.toMatch(/<script|<image|<use|<foreignObject|<style|href|url\(|\son\w+=/i);
    expect(statSync('packets-mark.svg').size).toBeLessThan(1000);
    // The same three layers as the mark in the header.
    const header = parse('packets.html').querySelector('.brand svg');
    for (const path of header.querySelectorAll('path')) expect(mark).toContain('d="' + path.getAttribute('d') + '"');
  });

  it('the maker shows one card for each step, and one quiet closed block about the page near the footer', () => {
    const doc = parse('packets-make.html');
    const main = doc.querySelector('main .wrap');
    expect([...main.children].filter((node) => node.matches('section, details')).map((node) => node.id)).toEqual(['step-1', 'step-2', 'step-3', 'about-page']);
    const about = doc.getElementById('about-page');
    expect(about.hasAttribute('open')).toBe(false);
    expect(about.querySelector('summary').textContent).toBe('About this page');
    expect([...about.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual(['What this page keeps', 'Where the words and sounds come from']);
    expect([...about.querySelectorAll('button')].map((button) => button.id)).toEqual(['forget', 'forget-sounds']);
    expect(about.querySelector('#forget-said').getAttribute('role')).toBe('status');
    expect(main.lastElementChild).toBe(about);
    // The front door keeps nothing and loads no word data: it says so in its details and has no such block.
    expect(parse('packets.html').querySelector('details.proof').textContent).toContain('It sets no cookies and stores nothing on your device.');
    expect(parse('packets.html').querySelectorAll('details')).toHaveLength(1);
  });

  it('the main site has one quiet way in from its home page and one from its tool finder, and neither claims more than the front door', () => {
    const squash = (text) => text.replace(/\s+/g, ' ').trim();
    const home = parse('index.html');
    const homeLinks = [...home.querySelectorAll('a[href^="packets"]')];
    expect(homeLinks.map((a) => [a.getAttribute('href'), a.textContent])).toEqual([['packets.html', 'Open ' + NAME]]);
    const band = home.getElementById('homePackets');
    expect(band.contains(homeLinks[0])).toBe(true);
    expect(home.getElementById(band.getAttribute('aria-labelledby')).textContent).toBe('Just need practice files and progress checks?');
    expect(squash(band.textContent)).toBe('Just need practice files and progress checks? ' + NAME + ' makes them in your browser. Runs without AI. No account. Open ' + NAME);
    // One band of its own: after the entry paths, before the tool finder and the long sections, and in no navigation.
    expect([band.previousElementSibling.id, band.nextElementSibling.id]).toEqual(['homeEntryPaths', 'home-tool-finder']);
    expect(band.querySelectorAll('script, link, img, iframe, form')).toHaveLength(0);
    const tools = parse('tools.html');
    const toolLinks = [...tools.querySelectorAll('a[href^="packets"]')];
    expect(toolLinks.map((a) => [a.getAttribute('href'), a.textContent])).toEqual([['packets.html', NAME]]);
    expect(squash(toolLinks[0].parentElement.textContent)).toBe('Looking for practice files and math checks that run without AI? ' + NAME + '.');
    expect(toolLinks[0].closest('header.tool-finder-hero')).toBeTruthy();
    for (const link of [homeLinks[0], toolLinks[0]]) expect(link.closest('nav, .nav-links, .mobile-nav, .noscript-nav, footer')).toBeNull();
    expect(existsSync('packets.html')).toBe(true);
  });

  it('the front door links only to what exists, and claims only what is true today', () => {
    const doc = parse('packets.html');
    const cards = [...doc.querySelectorAll('.card')].map((card) => ({ title: card.querySelector('h2').textContent, link: card.querySelector('a')?.getAttribute('href') || null, text: card.textContent }));
    expect(cards.map((card) => [card.title, card.link])).toEqual([['Make a practice file', 'packets-make.html'], ['Make a math check', 'packets-check.html'], ['Add up results', 'packets-results.html'],
      ['Check it yourself', '#check']]);
    expect(cards[0].text).toContain('Word Sounds: hearing sounds, letters and sounds, spelling, rhyme.');
    expect(cards[1].text).toContain('Three ready checks, or your own problems. About 90 KB, no sound needed.');
    expect(cards[2].text).toContain('not uploaded');
    expect(doc.getElementById('check')).toBeTruthy();
    expect(doc.body.textContent).toContain('For practice and for checking progress. Not a standardized test.');
    // Four equal cards, each a direct child of the grid and built the same way: a heading that is the card's one link, a line, a foot.
    // packets.css stretches that link over the whole card (.card a::after), so a card can hold only one. The two that make a file are
    // filled; the two for what comes after are outlined.
    expect([...doc.querySelectorAll('.cards > *')].map((node) => node.className)).toEqual(['card card-main', 'card card-main', 'card card-go', 'card card-go']);
    for (const card of doc.querySelectorAll('.card')) {
      expect([...card.children].map((node) => node.tagName + (node.className ? '.' + node.className : ''))).toEqual(['H2', 'P', 'P.card-foot']);
      expect(card.querySelectorAll('a')).toHaveLength(1);
      expect(card.querySelector('h2 > a')).toBeTruthy();
    }
    expect(doc.body.textContent).not.toContain('Or make a math check');
    // One column on a phone, two by two from 44rem. The old three-column rule is gone.
    const css = read('packets.css');
    expect(css).toContain('.cards { display: grid; gap: 1rem; grid-template-columns: 1fr;');
    expect(css).toContain('@media (min-width: 44rem) {\n  .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }');
    expect(css.match(/\.cards \{/g)).toHaveLength(2);
    expect(css).not.toContain('1.15fr');
    const today = Object.fromEntries([...doc.querySelectorAll('#today h3')].map((heading) => [heading.textContent, heading.nextElementSibling.textContent]));
    expect(today).toEqual({ 'Available today': 'Word Sounds practice files and math checks, with a results file for each student.', 'Being built': 'More words with recordings. Checks for reading skills.' });
    expect(doc.body.textContent).not.toContain('!');
    // What the page says about the file is what the file says about itself.
    const loaderSource = read('word_sounds_take_home_loader.js');
    for (const text of ["about_button: 'About this file'", "never: (mailbox ? [] : ['internet connection']).concat(['microphone', 'camera', 'cookies', 'AI'])", 'manifest-src \'none\'; connect-src " + connect',
      'download this file and open it in Chrome, Edge or Safari', "save_csv: 'Save results as a spreadsheet file (CSV)'", '(?:^#|&)learner=']) expect(loaderSource, text).toContain(text);
    expect(read('LICENSE')).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
  });

  it('the sizes the maker states are the sizes of the files', () => {
    const source = read('packets-make.js');
    const files = [...source.matchAll(/\{ name: '(\w+)', url: '([^']+)', bytes: (\d+) \}/g)].map((m) => ({ name: m[1], url: m[2], bytes: Number(m[3]) }));
    expect(files.map((file) => file.url)).toEqual(['audio_bank/phonemes.json', 'audio_bank/isolation.json', 'audio_bank/instructions.json', 'word_audio_kokoro_bank.json', 'audio_bank_kokoro.json']);
    for (const file of files) expect(Math.abs(statSync(file.url).size - file.bytes) / file.bytes, file.url).toBeLessThan(0.05);
    const scripts = [...parse('packets-make.html').querySelectorAll('script')].map((script) => script.getAttribute('src'));
    expect(scripts).toEqual(['packets-page.js', 'word_sounds_phonemes_en.js', 'word_sounds_core.js', 'word_sounds_wordlist_en.js', 'word_sounds_take_home_loader.js', 'word_sounds_packet_builder.js',
      'word_sounds_symbols_en.js', 'packets-make.js']);
    // The picture index is small (it says which words have a picture); the drawings load only when a file is made with them.
    expect(statSync('word_sounds_symbols_en.js').size).toBeLessThan(40000);
    const megabytes = scripts.reduce((sum, file) => sum + statSync(file).size, 0) / 1e6;
    expect(read('packets-make.html')).toContain('Getting the word lists, about 2 MB.');
    expect(megabytes).toBeGreaterThan(1.5);
    expect(megabytes).toBeLessThan(2.5);
  });

  it('the maker says exactly what the server can see, now that some sound files depend on the words', () => {
    const bullets = [...parse('packets-make.html').querySelectorAll('details.proof .proof-body li')].map((item) => item.textContent);
    const perFile = require('../dev-tools/repack_word_sounds_word_audio.cjs').DEFAULT_MAX;
    // What is still true, word for word: nothing chosen is sent.
    expect(bullets[1]).toBe('The practice file is put together in this browser tab. The page looks your words up in a word list and a sound dictionary that it has already loaded. Your words and your choices are not sent anywhere.');
    expect(parse('packets-make.html').querySelector('details.proof .proof-line').textContent).toBe('This page runs without AI. No account. Nothing you choose leaves your device.');
    // What changed: most sound files are the same for everyone; the small ones are asked for by need, and the server can see which.
    expect(bullets[3]).toBe('The page loads files from this site only. At step 3 it gets the sound files, also from this site. Most are the same files whatever you choose. '
      + 'Some words have their sounds in small files of about ' + perFile + ' words each, and the page gets only the ones your words need.');
    expect(bullets[4]).toBe('Like any website, the server that sends these files can see that your browser asked for them. That includes which of the small sound files were asked for, but not which words. It receives nothing else.');
    for (const file of PAGES) expect(read(file), file).not.toMatch(/the same files whatever (?:you choose|is chosen)\)?\.? ?(?:<\/li>|\))/);
    // "Not sent" in the script: every request is a plain GET for a file. No address is put together from a word, and the only
    // thing ever added to a request is the question "has this file changed?" for a copy already saved.
    const source = read('packets-make.js');
    expect(source.match(/window\.fetch\([^;\n]*/g)).toEqual(['window.fetch(file.url)', "window.fetch(file.url, { headers: tag ? { 'If-None-Match': tag } : { 'If-Modified-Since': dated } }).then(function (reply) {", 'window.fetch(shard.url).then(function (reply) {']);
    expect(source).not.toMatch(/method\s*:|body\s*:|FormData|URLSearchParams|encodeURIComponent|\.search\b|[?&]\w+=/);
    // A store file's address is the store's folder plus a name the index gives, and only a plain file name is taken.
    expect(source).toContain("var WORD_STORE_INDEX = 'word_audio_shards/index.json';");
    expect(source).toContain('var WORD_FILE_NAME = /^[a-z0-9_][a-z0-9_-]*\\.json$/;');
    expect(source).toContain("var url = folder + shard.file;");
    expect(source).toContain("if (!shard || typeof shard.file !== 'string' || !WORD_FILE_NAME.test(shard.file)) return;");
  });
});

// ---------------------------------------------------------------------------
// The maker, run in jsdom
// ---------------------------------------------------------------------------
const SOUND_URLS = ['audio_bank/phonemes.json', 'audio_bank/isolation.json', 'audio_bank/instructions.json', 'word_audio_kokoro_bank.json', 'audio_bank_kokoro.json'];
// Stand-in sound files: the real keys, each with a few bytes of its own in place of the recording.
const tiny = (path) => 'data:audio/webm;base64,' + Buffer.from('clip ' + path).toString('base64');
const shrink = (value, path) => typeof value === 'string' ? (value.startsWith('data:audio') ? tiny(path) : value)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shrink(inner, path + '/' + key)])) : value;
const SOUNDS = Object.fromEntries(SOUND_URLS.map((url) => {
  const text = read(url);
  return [url, JSON.stringify(shrink(JSON.parse(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text), url))];
}));
// The picture files (Mulberry Symbols), as the index names them. Served only to a page opened with { pictures: true }:
// every other test sees the page carry on without them.
const PICTURE_INDEX = require('../word_sounds_symbols_en.js');
const PICTURE_URLS = PICTURE_INDEX.shards.map((shard) => shard.url);
const PICTURES = Object.fromEntries(PICTURE_URLS.map((url) => [url, read(url)]));
const PICTURES_FAILED = 'The pictures could not be downloaded, so this file has none. Check the box to try again.';
// The word store (word_audio_shards/), as a stand-in: one small file per first letter for exactly the words the repo's word list
// says are in the store, so these tests hold however far the real store has got. With a word list that flags none, it is empty
// and the page never asks for it. The tests of the store itself (further down) bring their own word list and files.
const STORE_INDEX = 'word_audio_shards/index.json';
const storeWord = (word) => { const row = wordlist.get(word); return !!row && row.shards && !row.kokoro; };
const STAND_IN_STORE = (() => {
  const words = wordlist.rows().filter((row) => row.shards && !row.kokoro).map((row) => row.word);
  if (!words.length) return {};
  const files = {}, index = { format: 'alloflow-word-audio-index/1', words: {}, shards: {} };
  for (const word of words) { (files[word[0]] = files[word[0]] || { _meta: { format: 'alloflow-word-audio-shard/1', shard: word[0] } })[word] = tiny('store/' + word); index.words[word] = word[0]; }
  const out = {};
  for (const key of Object.keys(files)) { out['word_audio_shards/' + key + '.json'] = JSON.stringify(files[key]); index.shards[key] = { file: key + '.json', words: Object.keys(files[key]).length - 1, bytes: out['word_audio_shards/' + key + '.json'].length }; }
  out[STORE_INDEX] = JSON.stringify(index);
  return out;
})();
// What a page asks the stand-in store for when it makes a file of these words: the index, then one file for each first letter that needs one.
const storeRequests = (words) => { const need = words.filter(storeWord); return need.length ? [STORE_INDEX, ...new Set(need.map((word) => 'word_audio_shards/' + word[0] + '.json'))] : []; };
// The line under step 2, by the rule the page states: the fixed files, and at most one store file (the largest) for each word that needs one.
const soundsNoteFor = (words) => {
  const n = words.filter(storeWord).length, audio = wordlist.meta.wordAudio;
  if (!n) return 'The next step gets the sounds: about 11 MB, one time.';
  const bytes = Math.min(n * audio.largestFileBytes, audio.bytes);
  return 'The next step gets the sounds: about 11 MB one time, plus up to about ' + (bytes >= 10e6 ? String(Math.ceil(bytes / 1e6)) : (Math.ceil(bytes / 1e5) / 10).toFixed(1)) + ' MB for these words.';
};
// A stand-in for the browser's audio decoder: any clip becomes a short buffer that depends on its bytes.
class FakeOffline {
  constructor(channels, length, rate) { this.length = length; this.sampleRate = rate; this.destination = {}; this.played = null; }
  decodeAudioData(buffer, done) { done({ duration: 0.004, bytes: new Uint8Array(buffer) }); }
  createBufferSource() { const self = this; return { connect() {}, start() {}, set buffer(value) { self.played = value; } }; }
  startRendering() {
    const from = this.played.bytes, samples = new Float32Array(this.length);
    for (let i = 0; i < samples.length; i++) samples[i] = from[from.length - 1 - (i % from.length)] / 128 - 1;
    return Promise.resolve({ getChannelData: () => samples });
  }
}
// The same list tests/word_sounds_packet_builder.test.js and tests/word_sounds_take_home_packet.test.js apply to a file with no mailbox.
const FORBIDDEN = [
  ['a web address', /https?:\/\//i], ['location assignment', /\blocation\s*(?:\.\s*\w+\s*)?=(?!=)/], ['location.assign/replace', /\blocation\s*\.\s*(?:assign|replace)\s*\(/],
  ['window.open', /\bopen\s*\(/], ['<form', /<form/i], ['<a href', /<a\s[^>]*href/i], ['meta refresh', /http-equiv\s*=\s*["']?refresh/i], ['fetch(', /fetch\s*\(/],
  ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/], ['sendBeacon', /sendBeacon/], ['eval(', /\beval\s*\(/], ['new Function', /new\s+Function/],
  ['import(', /\bimport\s*\(/], ['microphone or camera', /getUserMedia|SpeechRecognition|MediaRecorder/], ['cookies', /\.\s*cookie\b/], ['speech engine', /speechSynthesis/],
  ['service worker', /serviceWorker/], ['peer connection', /RTCPeerConnection/],
];
const audit = (text) => FORBIDDEN.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);

// options.sources: other text for a script the page names (a word list that flags words of a pretend word store).
// options.store: the files of that store, by the address the page asks for. page.gone holds addresses that answer 404.
// The page opens when its trial build is done (see TRIAL_WORDS in packets-make.js): the promise waits for that.
async function openMaker(options = {}) {
  const dom = new JSDOM(read('packets-make.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-make.html' });
  const w = dom.window, d = w.document;
  const page = { dom, w, d, asked: [], files: [], downloads: [], offline: !!options.offline, store: options.store || STAND_IN_STORE, gone: new Set() };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.fetch = async (url, init) => {
    page.asked.push(String(url));
    if (page.offline) throw new TypeError('Failed to fetch');
    const body = page.gone.has(url) ? null : SOUNDS[url] || page.store[url] || (options.pictures && !page.noPictures ? PICTURES[url] : null);
    if (init || !body) return { ok: false, status: 404, headers: { get: () => null }, text: async () => '' };
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
  };
  w.OfflineAudioContext = FakeOffline;
  w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { page.downloads.push({ name: this.getAttribute('download'), href: this.getAttribute('href') }); };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  if (options.before) options.before(w);
  // The page's own scripts, in the order the page names them: what the page does not load, the test does not have.
  for (const script of d.querySelectorAll('script[src]')) w.eval((options.sources && options.sources[script.getAttribute('src')]) || read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.set = (id, value) => { const node = page.$(id); node.value = value; node.dispatchEvent(new w.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
  page.choose = (name, value) => { const radio = d.querySelector('input[name="' + name + '"][value="' + value + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.chips = () => [...page.$('pick-chips').querySelectorAll('li span')].map((node) => node.textContent);
  page.until = async (test, what) => {
    for (let i = 0; i < 3000; i++) { if (test()) return; await new Promise((resolve) => setTimeout(resolve, 20)); }
    throw new Error('Timed out waiting for ' + what);
  };
  page.built = () => page.files[page.files.length - 1].body;
  // While the trial build runs the page still shows its loading line, and has asked the site for nothing.
  if (options.early) options.early(page);
  await page.until(() => !page.seen('loading'), 'the page to open');
  return page;
}
const ready = (page) => page.until(() => page.seen('summary') || page.seen('build-problem'), 'the file or a problem');

describe('the maker, run with the real builder', () => {
  it('step 1 shows the app\'s strands and activity names, and only what the builder can make', async () => {
    let early = null;
    const page = await openMaker({ early: (opening) => { early = { loading: opening.seen('loading'), step1: opening.seen('step-1') }; } });
    // Until its trial build is done the page shows the loading line, not a list that could still change.
    expect(early).toEqual({ loading: true, step1: false });
    expect(page.seen('step-1') && !page.seen('loading') && !page.seen('load-problem')).toBe(true);
    expect(page.asked).toEqual([]);
    const strands = [...page.d.querySelectorAll('.strand')].map((group) => ({ name: group.querySelector('h3').textContent, ids: [...group.querySelectorAll('input')].map((box) => box.value) }));
    const offered = strands.flatMap((strand) => strand.ids);
    // No list in the script says what is held back: the page works it out as it opens, from the word list's recording flags.
    // The rule, applied here to a REAL build (the stand-in sound files have the real keys): of the first 16 words the page
    // lists when nothing is changed, fewer than half get a question in the activity, and a missing recording is among the reasons.
    const source = read('packets-make.js');
    expect(source).not.toMatch(/HELD_BACK\s*=\s*\[/);
    expect(source).toContain('var TRIAL_WORDS = 16;');
    const recordedOnly = wordlist.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
    const trialWords = builder.pickWords({ count: 16, shape: 'CVC', exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 }).words;
    expect(trialWords).toHaveLength(16);
    const sound = (url) => JSON.parse(SOUNDS[url]);
    const wordBank = { ...sound(SOUND_URLS[3]).words };
    for (const word of trialWords) if (!wordBank[word]) { expect(wordlist.get(word).shards, word).toBe(true); wordBank[word] = tiny('store/' + word); }
    const real = await builder.buildPacket({ words: trialWords, activities: builder.SUPPORTED_ACTIVITIES, seed: 1, core, dictionary, wordlist, loader,
      banks: { phonemes: sound(SOUND_URLS[0]), isolation: sound(SOUND_URLS[1]), instructions: sound(SOUND_URLS[2]), kokoroWords: wordBank, gapFill: sound(SOUND_URLS[4]) },
      toWav: async (uri) => 'data:audio/wav;base64,' + Buffer.from('RIFF0000WAVE' + uri.slice(-40)).toString('base64') });
    const lostToARecording = (id) => real.exceptions.filter((e) => e.activity === id && /no recording for/.test(e.reason)).length;
    const held = builder.SUPPORTED_ACTIVITIES.filter((id) => real.manifest.items.byActivity[id] * 2 < trialWords.length && lostToARecording(id) > 0);
    expect([...offered].sort()).toEqual(builder.SUPPORTED_ACTIVITIES.filter((id) => !held.includes(id)).sort());
    // What the page asked the builder (a trial that knows only which words have a recording) is what the real build gives.
    const trial = await builder.trialBuild({ words: trialWords, activities: builder.SUPPORTED_ACTIVITIES, seed: 1, core, loader, wordlist,
      voiced: (word) => { const row = wordlist.get(word); return !!row && (row.kokoro || (row.shards && trialWords.includes(word))); } });
    expect(trial.words).toBe(16);
    for (const id of builder.SUPPORTED_ACTIVITIES) expect(trial.byActivity[id], id).toMatchObject({ questions: real.manifest.items.byActivity[id], noRecording: lostToARecording(id) });
    // Sound Sort is offered: its answer choices come only from words with a recording, so no question is lost to one.
    expect(offered).toContain('sound_sort');
    expect(trial.byActivity.sound_sort).toMatchObject({ noRecording: 0 });
    expect(trial.byActivity.sound_sort.questions).toBeGreaterThanOrEqual(12);
    // Every held-back activity is one the reason is true of.
    for (const id of held) expect(trial.byActivity[id].noRecording, id).toBeGreaterThan(0);
    expect(strands.map((strand) => strand.name)).toEqual(core.SKILL_STRANDS.filter((row) => offered.some((id) => core.activityStrand(id) === row.key)).map((row) => row.name));
    for (const strand of strands) for (const id of strand.ids) expect(core.strandLabel(core.activityStrand(id)), id).toBe(strand.name);
    for (const box of page.d.querySelectorAll('.strand input')) {
      const label = box.closest('label');
      expect(label.querySelector('.choice-name').textContent, box.value).toBe(core.ACTIVITY_SKILLS[box.value].name);
      expect(label.querySelector('.choice-line').textContent, box.value).toBe(core.ACTIVITY_SKILLS[box.value].skill + '.');
    }
    for (const group of page.d.querySelectorAll('.strand')) expect(page.$(group.getAttribute('aria-labelledby')).textContent).toBe(group.querySelector('h3').textContent);
    // A first visit starts with the usual three, and says what is not offered.
    expect([...page.d.querySelectorAll('.strand input:checked')].map((box) => box.value)).toEqual(['isolation', 'blending', 'segmentation']);
    expect(page.$('activity-count').textContent).toBe('3 activities chosen.');
    const and = (names) => names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    const cannotBuild = core.activityIds().filter((id) => !builder.SUPPORTED_ACTIVITIES.includes(id)).map((id) => core.ACTIVITY_SKILLS[id].name);
    expect(cannotBuild).toEqual(expect.arrayContaining(['Syllable Claps', 'Read & Match']));
    const heldNames = held.map((id) => core.ACTIVITY_SKILLS[id].name);
    expect(page.$('not-offered').textContent).toBe('Not in this version: ' + (heldNames.length ? (heldNames.length > 1 ? and(heldNames) : heldNames[0]) + ' (not enough recorded sounds yet). ' : '')
      + and(cannotBuild) + ' (they cannot be made from a word list alone yet).');
    // Today that is Word Families: most word endings (-ug, -ip) have no recording.
    expect(page.$('not-offered').textContent).toContain('Not in this version: Word Families (not enough recorded sounds yet). ');
    expect(page.d.querySelector('input[value="letter_tracing"]').closest('label').querySelector('.choice-note').textContent).toBe('Practice only. It is not scored.');
    expect(page.d.querySelectorAll('.choice-note')).toHaveLength(1);
    expect(page.w.document.title).toBe(NAME + ': Make a practice file, step 1 of 3');
    // With nothing chosen the page says so and stays.
    for (const box of page.d.querySelectorAll('.strand input:checked')) box.click();
    page.$('next-1').click();
    expect(page.seen('step-1')).toBe(true);
    expect(page.$('step-1-problem').textContent).toBe('Choose at least one activity to go on.');
    page.d.querySelector('button[aria-label^="Choose the usual set for Hearing sounds"]').click();
    expect([...page.d.querySelectorAll('.strand input:checked')].map((box) => box.value)).toEqual(['isolation', 'blending', 'segmentation']);
    page.dom.window.close();
  });

  it('the sounds and shapes it offers are real: each example word has the sound or the shape', async () => {
    const page = await openMaker();
    const sounds = [...page.$('f-sound').querySelectorAll('optgroup option')];
    const recordedOnly = wordlist.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
    // A sound is offered exactly when the picker has at least one word for it.
    for (const label of dictionary.labels) {
      const pool = builder.pickWords({ targetSound: label, exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 }).pool;
      expect(sounds.some((option) => option.value === label), label + ' (' + pool + ' words)').toBe(pool > 0);
    }
    expect(sounds.length).toBeGreaterThan(40);
    for (const option of sounds) {
      const example = /, as in (\w+)$/.exec(option.textContent)[1];
      expect(dictionary.lookup(example)[0], option.textContent).toContain(option.value);
      expect(wordlist.isBlocked(example), example).toBe(false);
    }
    const shapes = [...page.$('f-shape').querySelectorAll('option')].filter((option) => option.value);
    expect(shapes.length).toBeGreaterThanOrEqual(4);
    for (const option of shapes) for (const example of /, like (.+)$/.exec(option.textContent)[1].split(', ')) expect(wordlist.get(example).shape, example).toBe(option.value);
    // The stages are the builder's own rows, and a chosen stage shows what the builder says about its source.
    const stages = builder.stageList();
    expect(stages.map((row) => row.id)).toEqual(expect.arrayContaining(builder.STAGES));
    expect([...page.$('f-stage').querySelectorAll('option')].map((option) => option.value)).toEqual(['', ...stages.map((row) => row.id)]);
    expect([...page.$('f-stage').querySelectorAll('optgroup')].map((group) => group.label)).toEqual([...new Set(stages.map((row) => row.frameworkLabel))]);
    page.$('next-1').click();
    expect(page.$('stage-hint').textContent).toBe('A stage keeps to the letter patterns taught by then.');
    expect(page.seen('stage-why')).toBe(false);
    for (const row of stages) {
      page.set('f-stage', row.id);
      // One short line under the stage; the builder's long note waits, closed, behind "Why".
      const line = page.$('stage-hint').textContent;
      expect(line.length, row.id + ': ' + line).toBeLessThan(100);
      expect(line, row.id).toMatch(/(?:sounds?|syllables?|Words of any length)\.(?: Not yet checked against a source\.)?$/);
      expect(line.includes('Not yet checked against a source.'), row.id).toBe(row.verified === false);
      for (const word of (/^New here: ([a-z, ]+)\./.exec(line) || ['', ''])[1].split(', ').filter(Boolean)) expect(row.label, row.id).toContain(word);
      expect(page.seen('stage-why') && !page.$('stage-why').open, row.id).toBe(true);
      expect(page.$('stage-why').querySelector('summary').textContent, row.id).toBe('Why this stage has these words');
      expect(page.$('stage-why-text').textContent, row.id).toContain(row.note);
      expect(page.$('f-stage').selectedOptions[0].textContent, row.id).toBe(row.label.split(':')[0]);
    }
    const g1 = stages.find((row) => row.id === 'G1 early');
    if (g1 && g1.maxSounds === 5 && /\(ship, chin/.test(g1.label)) {
      page.set('f-stage', 'G1 early');
      expect(page.$('stage-hint').textContent).toMatch(/^New here: ship, chin, .*\. Up to 5 sounds, one syllable\.$/);
    }
    page.dom.window.close();
  });

  it('choose by sound: the words are listed, the file is built, and it holds nothing that could reach the network', async () => {
    const page = await openMaker();
    page.$('next-1').click();
    expect(page.seen('step-2')).toBe(true);
    await page.until(() => page.chips().length > 0, 'the default words');
    expect(page.$('sounds-note').textContent).toBe(soundsNoteFor(page.chips()));
    const recordedOnly = wordlist.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
    expect(recordedOnly.length).toBeLessThan(30);
    const direct = builder.pickWords({ count: 10, targetSound: 'sh', position: 'first', shape: 'CVC', exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 });
    expect(direct.pool).toBeGreaterThan(10);
    expect(page.$('f-position').disabled).toBe(true);
    page.set('f-sound', 'sh');
    expect(page.$('f-position').disabled).toBe(false);
    page.set('f-position', 'first');
    page.set('f-shape', 'CVC');
    await page.until(() => page.$('pick-line').textContent === direct.pool + ' words fit.', 'the sh words');
    expect(page.chips()).toEqual(direct.words);
    for (const word of page.chips()) {
      expect(wordlist.get(word), word).toMatchObject({ blocked: false, nearBlocked: false, soft: false, hasClip: true, shape: 'CVC' });
      expect(wordlist.get(word).kokoro || wordlist.get(word).shards, word).toBe(true);
      expect(dictionary.lookup(word)[0][0], word).toBe('sh');
    }
    expect(page.$('pick-out').textContent).toBe('Also matched, but not offered: ' + direct.reasons.notFamiliarEnough + ' less common words, ' + direct.reasons.noRecording + ' with no recording yet, '
      + (direct.reasons.blocked + direct.reasons.soundsLikeABlockedWord) + ' on the list of words this tool does not use.');
    expect(direct.reasons.britishSpellingOrWord || 0).toBe(0);
    // Another version is another mix of the same kind of words.
    page.choose('version', 'B');
    await page.until(() => page.chips().join() !== direct.words.join(), 'version B');
    expect(page.chips()).toEqual(builder.pickWords({ count: 10, targetSound: 'sh', position: 'first', shape: 'CVC', exclude: recordedOnly }, { wordlist, core, dictionary, seed: 2 }).words);
    page.choose('version', 'A');
    await page.until(() => page.chips().join() === direct.words.join(), 'version A again');
    // A removed word is replaced by the next one, and can be put back.
    const gone = page.chips()[0];
    page.d.querySelector('button[aria-label="Remove ' + gone + '"]').click();
    expect(page.chips()).toHaveLength(10);
    expect(page.chips()).not.toContain(gone);
    expect(page.$('pick-removed-text').textContent).toBe('You removed: ' + gone + '.');
    page.$('pick-restore').click();
    expect(page.chips()).toEqual(direct.words);
    for (const button of page.$('pick-chips').querySelectorAll('button')) expect(button.getAttribute('aria-label')).toMatch(/^Remove \w+$/);

    // Few words fit: the page says so plainly and offers the one change that gives more.
    const fewAt = (stage) => builder.pickWords({ count: 10, targetSound: 'sh', position: 'first', shape: 'CVC', stage, exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 });
    const tight = builder.stageList().map((row) => row.id).find((id) => fewAt(id).pool >= 5 && fewAt(id).pool < 10);
    expect(tight, 'a stage at which 5 to 9 sh words fit').toBeTruthy();
    page.set('f-stage', tight);
    await page.until(() => page.$('pick-line').textContent === 'Only ' + fewAt(tight).pool + ' words fit.' && page.$('pick-loosen').querySelector('button'), 'the few-words line');
    const few = page.chips();
    expect(few).toEqual(fewAt(tight).words);
    expect(page.$('pick-sub').textContent).toMatch(/get more by loosening one choice/);
    await page.until(() => [...page.$('pick-loosen').querySelectorAll('button')].some((button) => button.textContent === 'Any stage: ' + direct.pool + ' words fit'), 'the loosening offers');
    for (const button of page.$('pick-loosen').querySelectorAll('button')) expect(Number(/: (\d+) words? fit/.exec(button.textContent)[1])).toBeGreaterThan(few.length);

    // Step 3: nothing was fetched before now; the five sound files are fetched, by relative address, and nothing else.
    expect(page.asked).toEqual([]);
    const scriptsBefore = page.d.querySelectorAll('script').length;
    page.$('next-2').click();
    expect(page.seen('step-3')).toBe(true);
    expect(page.$('f-title').value).toBe('Word Sounds: sh words, version A');
    // Regular is the app's 20 questions: with three activities, up to 7 words; Short is 10 questions, 4 words.
    expect(core.LESSON_LENGTHS).toMatchObject({ short: { items: 10 }, regular: { items: 20 }, long: { items: 30 } });
    const used = few.slice(0, 7);
    expect(page.d.querySelector('[data-length="regular"]').textContent).toBe(used.length + ' words, about ' + used.length * 3 + ' questions, about ' + Math.ceil(used.length * 1.5) + ' minutes.');
    expect(page.d.querySelector('[data-length="short"]').textContent).toBe('4 words, about 12 questions, about 6 minutes.');
    expect(page.d.querySelector('input[name="length"]:checked').value).toBe('regular');
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    // When a word has a picture the page also asks for the picture files. This page is not given them (see openMaker):
    // it says so under the box, leaves the box unchecked, and makes the plain file.
    const asksForPictures = used.some((word) => PICTURE_INDEX.has(word));
    // A word whose recording is in the word store adds the store's index and the file that holds it (see "the maker and the word store").
    const askedOnce = [...SOUND_URLS, ...storeRequests(used), ...(asksForPictures ? PICTURE_URLS : [])];
    expect(page.asked).toEqual(askedOnce);
    if (asksForPictures) expect(page.$('pictures-line').textContent).toBe(PICTURES_FAILED);
    expect(page.$('f-pictures').checked).toBe(false);
    expect(page.d.querySelectorAll('script').length).toBe(scriptsBefore);
    const html = page.built();
    expect(audit(html)).toEqual([]);
    expect(html.match(/<script/gi)).toHaveLength(2);
    expect(html).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video)\b/i);
    const policy = /Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
    expect(policy).toMatch(/^default-src 'none'; script-src 'sha256-[A-Za-z0-9+/=]+'; /);
    expect(policy).toMatch(/connect-src 'none'$/);
    const manifest = manifestOf(html), lesson = lessonOf(html);
    expect(manifest.network).toBe('none');
    expect(manifest.builder).toMatchObject({ name: builder.VERSION, seed: 1, ai: 'none', words: used.length, items: used.length * 3 });
    expect(manifest.title).toBe('Word Sounds: sh words, version A');
    // What the built file says about itself under "About this file" (the loader's and the builder's words, pinned
    // here so a change is seen): it runs no AI, and its credits name the machine-made recordings.
    expect(html).toContain('It never uses the microphone or the camera. It has no cookies and runs no AI.');
    expect(manifest.never).toEqual(['internet connection', 'microphone', 'camera', 'cookies', 'AI']);
    expect(manifest.attributions).toEqual(['Word sounds: Carnegie Mellon Pronouncing Dictionary (CMUdict), Copyright (C) 1993-2015 Carnegie Mellon University, converted to sound labels by AlloFlow',
      'Machine-made recordings: Kokoro-82M text-to-speech (voice af_heart)',
      'Machine-made recordings: Google Gemini text-to-speech, made ahead of time']);
    expect(lesson.blocks.map((block) => block.activity)).toEqual(['isolation', 'blending', 'segmentation']);
    for (const block of lesson.blocks) expect(block.items.map((item) => item.word)).toEqual(used);
    expect(Object.values(lesson.audio).every((uri) => /^data:audio\/wav;base64,/.test(uri))).toBe(true);
    expect(page.$('summary-facts').textContent).toMatch(new RegExp('^' + used.length * 3 + ' questions\\. About ' + Math.ceil(used.length * 1.5) + ' minutes\\. \\d+(?:\\.\\d)? (?:KB|MB)\\.$'));
    expect(page.$('sum-words').textContent).toBe(used.length + ' words: ' + used.join(', ') + '.');
    expect(page.$('sum-activities').textContent).toContain('Find Sounds: ' + used.length + ' questions.');
    expect(page.$('sum-out').textContent).toBe(few.length > used.length
      ? (few.length - used.length === 1 ? '1 word' : few.length - used.length + ' words') + ' not needed for a Regular file: ' + few.slice(7).join(', ') + '. A longer file uses more.'
      : 'Nothing. Every word is in every activity you chose.');
    expect(page.$('making-said').textContent).toMatch(/^The file is ready: /);

    // Try it opens the preview page with the file's address after the #; Save hands over the same file.
    expect(page.seen('try') && page.seen('save')).toBe(true);
    expect(page.$('try').getAttribute('href')).toBe('packets-try.html#blob:https://packets.test/' + page.files.length);
    expect(page.$('try').getAttribute('target')).toBe('_blank');
    expect(page.seen('after-save')).toBe(false);
    page.$('save').click();
    expect(page.downloads).toEqual([{ name: 'Word-Sounds-sh-words-version-A.html', href: 'blob:https://packets.test/' + page.files.length }]);
    expect(page.seen('after-save')).toBe(true);
    expect(page.$('after-save').textContent).toContain('#learner=CodeName');
    expect(page.$('after-save').querySelectorAll('ol li')).toHaveLength(3);

    // A shorter file uses fewer of the words and says which were not needed. The sounds are not fetched again.
    page.choose('length', 'short');
    await page.until(() => !page.seen('summary'), 'the old file to go');
    await ready(page);
    for (const block of lessonOf(page.built()).blocks) expect(block.items.map((item) => item.word)).toEqual(few.slice(0, 4));
    expect(page.$('sum-out').textContent).toBe(few.length - 4 + ' words not needed for a Short file: ' + few.slice(4).join(', ') + '. A longer file uses more.');
    expect(page.asked).toEqual(askedOnce);
    page.dom.window.close();
  });

  it('Include pictures: one box, on when a word has a picture; the file gets the drawings and their credit, or is the plain file', async () => {
    const page = await openMaker({ pictures: true });
    for (const box of page.d.querySelectorAll('.strand input')) if (box.checked !== (box.value === 'isolation')) box.click();
    page.$('next-1').click();
    page.choose('mode', 'own');
    page.set('f-own', 'cat pig sun');
    await page.until(() => page.$('own-line').textContent === '3 of 3 words can be used.', 'three ready words');
    expect(['cat', 'pig', 'sun'].map((word) => PICTURE_INDEX.has(word))).toEqual([true, false, true]);
    expect(page.asked).toEqual([]);
    page.$('next-2').click();
    // One box at step 3, and its one line. It is on because a word has a picture.
    const box = page.$('f-pictures');
    expect([...page.$('step-3').querySelectorAll('input[type="checkbox"]')]).toEqual([box]);
    expect(box.closest('label').textContent.trim()).toBe('Include pictures');
    expect(box.getAttribute('aria-describedby')).toBe('pictures-line');
    expect(box.checked && !box.disabled).toBe(true);
    expect(page.$('pictures-line').textContent).toBe('Pictures for 2 of 3 words. Symbols: Mulberry.');
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    // The picture files are the ones the index names, whatever the words; they come after the sounds, once.
    expect(page.asked).toEqual(SOUND_URLS.concat(PICTURE_URLS));
    const withPictures = page.built(), sizeWith = page.files[page.files.length - 1].size;
    expect(audit(withPictures)).toEqual([]);
    expect(withPictures).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video)\b/i);
    const lesson = lessonOf(withPictures);
    expect(lesson.blocks[0].items.map((item) => [item.word, item.wordPicture != null])).toEqual([['cat', true], ['pig', false], ['sun', true]]);
    expect(Object.values(lesson.images).every((uri) => /^data:image\/svg\+xml;base64,/.test(uri))).toBe(true);
    expect(Object.values(lesson.images).map((uri) => Buffer.from(uri.split(',')[1], 'base64').toString('utf8')).sort())
      .toEqual(['cat.svg', 'sun.svg'].map((file) => read('data/vendor/mulberry/symbols/' + file).trim()).sort());
    expect(manifestOf(withPictures).attributions.slice(-1)).toEqual(['Pictures: Mulberry Symbols by Steve Lee, CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/), mulberrysymbols.org']);
    expect(manifestOf(withPictures).notices.map((notice) => notice.id)).toEqual(['cmudict', 'mulberry']);
    expect(page.$('pictures-line').textContent).toBe('Pictures for 2 of 3 words. Symbols: Mulberry.');
    expect(page.$('summary-facts').textContent).toMatch(/^3 questions\. About 2 minutes\. \d+(?:\.\d)? (?:KB|MB)\.$/);
    // The page says where its pictures come from, and lists their files with the others it loads.
    expect(page.$('sources').textContent).toContain('The pictures: Mulberry Symbols by Steve Lee. License: CC BY-SA 4.0.');
    expect(page.d.querySelector('[data-show-files]').textContent).toContain('When a file is made with pictures: ' + PICTURE_URLS.join(', ') + '.');

    // Unchecked: the plain file, smaller, the same one the builder makes when it is not asked for pictures.
    box.click();
    expect(box.checked).toBe(false);
    await page.until(() => !page.seen('summary'), 'the old file to go');
    await ready(page);
    const without = page.built(), sizeWithout = page.files[page.files.length - 1].size;
    expect(lessonOf(without).images).toEqual({});
    for (const part of ['Mulberry', 'takeHomePictures', 'wordPicture', 'data:image']) expect(without, part).not.toContain(part);
    expect(sizeWithout).toBeLessThan(sizeWith);
    expect(sizeWith - sizeWithout).toBeGreaterThan(Object.values(lesson.images).reduce((sum, uri) => sum + uri.length, 0));
    expect(page.$('pictures-line').textContent).toBe('Pictures for 2 of 3 words. Symbols: Mulberry.');
    // Checked again: the same file as the first time, and nothing is fetched again.
    box.click();
    await page.until(() => !page.seen('summary'), 'the plain file to go');
    await ready(page);
    expect(page.built()).toBe(withPictures);
    expect(page.asked).toEqual(SOUND_URLS.concat(PICTURE_URLS));

    // No word with a picture: the box cannot be checked, the line says none, and the file is the plain one.
    page.$('back-3').click();
    page.set('f-own', 'pig hen');
    await page.until(() => page.$('own-line').textContent === '2 of 2 words can be used.', 'two ready words');
    expect(['pig', 'hen'].map((word) => PICTURE_INDEX.has(word))).toEqual([false, false]);
    page.$('next-2').click();
    expect(box.disabled).toBe(true);
    expect(box.checked).toBe(false);
    expect(page.$('pictures-line').textContent).toBe('Pictures for 0 of 2 words. Symbols: Mulberry.');
    await ready(page);
    expect(page.built()).not.toContain('Mulberry');
    expect(page.w.localStorage.length).toBe(1);
    expect(JSON.parse(page.w.localStorage.getItem('alloflow-packets-maker/1'))).not.toHaveProperty('pictures');
    page.dom.window.close();

    // The picture files do not arrive: the page says so, the box goes off, the plain file is made. Checking the box tries again.
    const poor = await openMaker({ pictures: true });
    poor.noPictures = true;
    for (const one of poor.d.querySelectorAll('.strand input')) if (one.checked !== (one.value === 'isolation')) one.click();
    poor.$('next-1').click();
    poor.choose('mode', 'own');
    poor.set('f-own', 'cat pig sun');
    await poor.until(() => poor.$('own-line').textContent === '3 of 3 words can be used.', 'three ready words');
    poor.$('next-2').click();
    await ready(poor);
    expect(poor.seen('summary') && !poor.seen('build-problem')).toBe(true);
    expect(poor.$('pictures-line').textContent).toBe(PICTURES_FAILED);
    expect(poor.$('f-pictures').checked).toBe(false);
    expect(poor.$('f-pictures').disabled).toBe(false);
    expect(poor.built()).toBe(without);
    poor.noPictures = false;
    poor.$('f-pictures').click();
    await poor.until(() => !poor.seen('summary'), 'the plain file to go');
    await ready(poor);
    expect(poor.built()).toBe(withPictures);
    expect(poor.$('pictures-line').textContent).toBe('Pictures for 2 of 3 words. Symbols: Mulberry.');
    expect(poor.asked).toEqual(SOUND_URLS.concat(PICTURE_URLS, PICTURE_URLS));
    poor.dom.window.close();
  });

  it('typed words: a blocked word is refused with its reason, a word with no recording says so, and neither is in the file', async () => {
    const page = await openMaker();
    page.$('next-1').click();
    page.choose('mode', 'own');
    expect(page.seen('panel-own') && !page.seen('panel-pick')).toBe(true);
    expect(page.$('own-line').textContent).toBe('Type or paste your words above.');
    expect(wordlist.get('gun')).toMatchObject({ blocked: true });
    expect(wordlist.get('fuzz')).toMatchObject({ blocked: false, hasClip: false });
    expect(wordlist.get('bail')).toMatchObject({ recorded: true, kokoro: false });
    page.set('f-own', 'cat, Gun fuzz\nblorp bail x1 map cat');
    await page.until(() => page.$('own-list').children.length === 7, 'the checked words');
    const rows = Object.fromEntries([...page.$('own-list').children].map((row) => [row.querySelector('.w').textContent, { text: row.querySelector('.s').textContent, ok: row.className === 'is-ok' }]));
    expect(Object.keys(rows)).toEqual(['cat', 'gun', 'fuzz', 'blorp', 'bail', 'x1', 'map']);
    expect(rows.cat).toEqual({ ok: true, text: 'Ready. 3 sounds: k, a, t.' });
    expect(rows.map.ok).toBe(true);
    expect(rows.gun).toEqual({ ok: false, text: 'Left out. It is on the list of words this tool does not use. That list is a first pass and can be too cautious.' });
    expect(rows.fuzz).toEqual({ ok: false, text: 'No recording yet. It cannot be used in this version.' });
    expect(rows.bail).toEqual({ ok: false, text: 'No recording yet. It cannot be used in this version.' });
    expect(rows.blorp).toEqual({ ok: false, text: 'Not in the sound dictionary. Check the spelling.' });
    expect(rows.x1).toEqual({ ok: false, text: 'Not used. A practice word is 2 to 10 letters, letters only, with a vowel.' });
    expect(page.$('own-line').textContent).toBe('2 of 7 words can be used.');
    page.$('next-2').click();
    expect(page.$('f-title').value).toBe('Word Sounds: my words, version A');
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    const html = page.built();
    expect(audit(html)).toEqual([]);
    expect(manifestOf(html).builder).toMatchObject({ words: 2, ai: 'none' });
    for (const block of lessonOf(html).blocks) expect(block.items.map((item) => item.word)).toEqual(['cat', 'map']);
    expect(page.$('sum-words').textContent).toBe('2 words: cat, map.');
    for (const word of ['gun', 'fuzz', 'blorp', 'bail']) expect(JSON.stringify(lessonOf(html).blocks)).not.toContain('"' + word + '"');

    // Only a blocked word: the page does not go on, and says why.
    page.$('back-3').click();
    page.set('f-own', 'gun');
    await page.until(() => page.$('own-line').textContent === '0 of 1 word can be used.', 'the one blocked word');
    page.$('next-2').click();
    expect(page.seen('step-2')).toBe(true);
    expect(page.$('step-2-problem').textContent).toBe('None of your words can be used yet. The note beside each word says why.');
    page.dom.window.close();
  });

  it('an activity that cannot use a word says so in "Left out", in plain words', async () => {
    const page = await openMaker();
    for (const box of page.d.querySelectorAll('.strand input')) if (box.checked !== ['rhyming', 'isolation'].includes(box.value)) box.click();
    page.$('next-1').click();
    page.choose('mode', 'own');
    page.set('f-own', 'cat shallow hen');
    await page.until(() => page.$('own-line').textContent === '3 of 3 words can be used.', 'three ready words');
    page.$('next-2').click();
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    // What the builder itself leaves out for these inputs (the same stand-in sounds, any converter).
    const sound = (url) => JSON.parse(SOUNDS[url]);
    const direct = await builder.buildPacket({ words: ['cat', 'shallow', 'hen'], activities: ['rhyming', 'isolation'], seed: 1, core, dictionary, wordlist, loader,
      banks: { phonemes: sound(SOUND_URLS[0]), isolation: sound(SOUND_URLS[1]), instructions: sound(SOUND_URLS[2]), kokoroWords: sound(SOUND_URLS[3]).words, gapFill: sound(SOUND_URLS[4]) },
      toWav: async (uri) => 'data:audio/wav;base64,' + Buffer.from('RIFF0000WAVE' + uri.slice(-40)).toString('base64') });
    expect(direct.exceptions.length).toBeGreaterThan(0);
    const lines = [...page.$('sum-out').querySelectorAll('li')].map((line) => line.textContent);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(direct.exceptions.length);
    for (const e of direct.exceptions) expect(lines.some((line) => line.includes(e.word) && line.startsWith(core.activityLabel(e.activity) + ': ')), JSON.stringify(e) + ' in ' + JSON.stringify(lines)).toBe(true);
    for (const line of lines) expect(line).toMatch(/^[A-Z][\w &]+: [a-z, ]+ \([a-z ,-]+\)\.$/);
    expect(lines.join(' ')).not.toMatch(/blocklist|WAV|WebM|_/);
    expect(page.$('sum-activities').textContent).toContain('Find Sounds: 3 questions.');
    expect(lessonOf(page.built()).blocks.map((block) => [block.activity, block.items.length])).toEqual(direct.lesson.blocks.map((block) => [block.activity, block.items.length]));
    page.dom.window.close();
  });

  it('never stops at an error: with no connection it says so and Try again works', async () => {
    const page = await openMaker({ offline: true });
    page.$('next-1').click();
    await page.until(() => page.chips().length > 0, 'the default words');
    page.$('next-2').click();
    await ready(page);
    expect(page.seen('build-problem') && !page.seen('summary') && !page.seen('save')).toBe(true);
    expect(page.$('build-problem-text').textContent).toBe('The sounds could not be downloaded. Check the connection, then try again. Your choices are still here.');
    expect(page.seen('retry')).toBe(true);
    page.offline = false;
    page.$('retry').click();
    await page.until(() => page.seen('summary'), 'the file after trying again');
    expect(audit(page.built())).toEqual([]);
    page.dom.window.close();

    // A browser that cannot convert the recordings: a plain message, not a silent file.
    const old = await openMaker({ before: (w) => { delete w.OfflineAudioContext; } });
    old.$('next-1').click();
    await old.until(() => old.chips().length > 0, 'the default words');
    old.$('next-2').click();
    await ready(old);
    expect(old.seen('build-problem')).toBe(true);
    expect(old.$('build-problem-text').textContent).toMatch(/^This browser could not prepare the recordings, so no file was made\./);
    expect(old.files).toEqual([]);
    old.dom.window.close();

    // A part of the page that did not load: said plainly, with a way forward.
    const dom = new JSDOM(read('packets-make.html'), { runScripts: 'outside-only', url: 'https://packets.test/site/packets-make.html' });
    dom.window.eval(read('packets-make.js'));
    expect(dom.window.document.getElementById('load-problem').hidden).toBe(false);
    expect(dom.window.document.getElementById('load-problem-text').textContent).toContain('word_sounds_packet_builder.js');
    expect(dom.window.document.querySelector('#load-problem a').getAttribute('href')).toBe('packets-make.html');
    dom.window.close();
  });

  it('keeps the last choices in this browser only, says what it keeps, and forgets them when asked', async () => {
    const page = await openMaker();
    page.$('next-1').click();
    page.set('f-sound', 'ch');
    page.choose('version', 'C');
    await page.until(() => page.chips().length > 0, 'the ch words');
    const kept = JSON.parse(page.w.localStorage.getItem('alloflow-packets-maker/1'));
    expect(kept).toEqual({ v: 1, activities: ['isolation', 'blending', 'segmentation'], mode: 'pick', sound: 'ch', position: 'any', shape: 'CVC', stage: '', own: '', version: 'C', length: 'regular' });
    expect(page.w.localStorage.length).toBe(1);
    expect(page.d.cookie).toBe('');
    expect(page.$('about-page').open).toBe(false);
    const told = page.$('about-page').textContent;
    expect(told).toContain('Carnegie Mellon Pronouncing Dictionary');
    for (const what of ['the activities', 'how you chose the words', 'any words you typed', 'the version', 'the length', 'The sound files are kept too']) expect(told).toContain(what);
    page.$('forget').click();
    expect(page.w.localStorage.getItem('alloflow-packets-maker/1')).toBeNull();
    expect(page.$('forget-said').textContent).toBe('Done. The page is back to how it started.');
    expect(page.seen('step-1')).toBe(true);
    page.$('next-1').click();
    expect(page.$('f-sound').value).toBe('');
    expect(page.d.querySelector('input[name="version"]:checked').value).toBe('A');
    expect(page.asked).toEqual([]);
    page.dom.window.close();
  });
});

// ---------------------------------------------------------------------------
// The maker and the word store (word_audio_shards/): a pretend store, made with the generator's own store code,
// and a word list built against it, so nothing here depends on how far the real store has got.
// ---------------------------------------------------------------------------
describe('the maker and the word store', () => {
  const generator = require('../dev-tools/build_word_sounds_word_audio.cjs');
  const repackTool = require('../dev-tools/repack_word_sounds_word_audio.cjs');
  const wordlistTool = require('../dev-tools/build_word_sounds_wordlist.cjs');
  const scratch = mkdtempSync(join(tmpdir(), 'packets-word-store-'));
  afterAll(() => { rmSync(scratch, { recursive: true, force: true }); });
  const INDEX = 'word_audio_shards/index.json';
  const FAILED = 'The sounds for some of your words could not be downloaded. Check the connection, then try again. Your choices are still here.';
  // Words the picker would offer if they had a recording, and that neither bank file holds: every twelfth, so several letters.
  const candidates = builder.pickWords({ shape: 'CVC', count: 1e9, requireClip: false }, { wordlist, core, dictionary, seed: 1 }).words
    .filter((word) => !wordlist.get(word).kokoro && !wordlist.get(word).recorded).sort();
  const STORE_WORDS = candidates.filter((word, i) => i % 12 === 0);
  const storeClip = (word) => generator.URI_PREFIX + Buffer.concat([Buffer.alloc(600, word.charCodeAt(0)), Buffer.from('store clip ' + word.padEnd(12, '.'))]).toString('base64');
  const dir = join(scratch, 'word_audio_shards');
  const made = generator.openStore(dir, { freeBytes: () => 50 * 1024 ** 3 });
  for (const word of STORE_WORDS) made.add(word, storeClip(word));
  made.flush();
  const serve = () => Object.fromEntries(readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => ['word_audio_shards/' + name, read(join(dir, name))]));
  const sourceFor = () => wordlistTool.render(wordlistTool.build({ shardIndex: join(dir, 'index.json') }));
  const load = (source) => { const module = { exports: {} }; new Function('window', 'module', source)({}, module); return module.exports; };
  // One file per first letter, as the generator leaves it; then regrouped into files of at most 4 words.
  const LETTERS = { store: serve(), source: sourceFor() };
  repackTool.repack(dir, { max: 4, retries: 0, sleep: () => {} });
  const SMALL = { store: serve(), source: sourceFor() };
  const index = JSON.parse(SMALL.store[INDEX]);
  const flagged = load(SMALL.source);
  const fileOf = (word, store = SMALL.store) => { const at = JSON.parse(store[INDEX]); return 'word_audio_shards/' + at.shards[at.words[word]].file; };
  // Two words that share a file, one in another file, and one in a third.
  const shared = Object.keys(index.shards).find((key) => index.shards[key].words >= 2);
  const [W1, W2] = STORE_WORDS.filter((word) => index.words[word] === shared);
  const [W3, W4] = [...new Set(STORE_WORDS.filter((word) => index.words[word] !== shared).map((word) => index.words[word]))].slice(0, 2).map((key) => STORE_WORDS.find((word) => index.words[word] === key));
  const open = (kind, options = {}) => openMaker({ sources: { 'word_sounds_wordlist_en.js': kind.source }, store: { ...kind.store }, ...options });
  const typeWords = async (page, words) => {
    page.choose('mode', 'own');
    page.set('f-own', words.join(' '));
    await page.until(() => page.$('own-list').children.length === words.length && page.$('own-line').textContent.includes(' of ' + words.length + ' word'), 'the checked words');
  };
  const onlyIsolation = (page) => { for (const box of page.d.querySelectorAll('.strand input')) if (box.checked !== (box.value === 'isolation')) box.click(); };
  const upTo = (bytes) => (bytes >= 10e6 ? String(Math.ceil(bytes / 1e6)) : (Math.ceil(bytes / 1e5) / 10).toFixed(1));

  it('the pretend store is a real one, and the word list built against it flags its words and carries the size of its largest file', () => {
    expect(STORE_WORDS.length).toBeGreaterThan(30);
    expect(new Set(STORE_WORDS.map((word) => word[0])).size).toBeGreaterThan(8);
    expect(repackTool.checkStore(dir)).toMatchObject({ ok: true, facts: { words: STORE_WORDS.length, layout: 'small files (4 words at most)' } });
    expect(Object.keys(LETTERS.store).every((address) => /^word_audio_shards\/(?:index|[a-z])\.json$/.test(address))).toBe(true);
    expect(Object.keys(SMALL.store).every((address) => /^word_audio_shards\/(?:index|[a-z]-\d\d)\.json$/.test(address))).toBe(true);
    expect(flagged.rows().filter((row) => row.shards).map((row) => row.word).sort()).toEqual(STORE_WORDS);
    for (const word of STORE_WORDS) expect(flagged.get(word), word).toMatchObject({ shards: true, kokoro: false, recorded: false, hasClip: true });
    const sizes = Object.values(index.shards).map((shard) => shard.bytes);
    expect(flagged.meta.wordAudio).toEqual({ files: sizes.length, bytes: sizes.reduce((a, b) => a + b, 0), largestFileBytes: Math.max(...sizes), mostWordsInAFile: 4 });
    expect([W1, W2, W3, W4].every(Boolean) && new Set([fileOf(W1), fileOf(W2), fileOf(W3), fileOf(W4)]).size === 3).toBe(true);
    // The word list in the repo says so only when it flags words of the store: then the page uses the store, and what
    // the pages say about its files ("about 40 words each") has to be true of it. Regroup the store first, then make the word list.
    const real = wordlist.meta.wordAudio;
    expect(!!real).toBe(wordlist.rows().some((row) => row.shards));
    if (real) expect(real.mostWordsInAFile, 'run node dev-tools/repack_word_sounds_word_audio.cjs, then node dev-tools/build_word_sounds_wordlist.cjs').toBeLessThanOrEqual(repackTool.DEFAULT_MAX);
    expect(repackTool.DEFAULT_MAX).toBe(40);
  });

  it('a word of the store is accepted and built like any other: the page gets the index once, then only the files that hold its words', async () => {
    const page = await open(SMALL);
    expect(page.d.querySelector('[data-show-files]').textContent).toContain(' When a word needs it: word_audio_shards/index.json and the small sound files it names.');
    for (const box of page.d.querySelectorAll('.strand input')) if (box.checked !== ['isolation', 'blending'].includes(box.value)) box.click();
    page.$('next-1').click();
    // Before anything is fetched the page says how much the sounds can be: the fixed files, and at most one store file for each word that needs one.
    await page.until(() => page.chips().length > 0, 'the default words');
    await typeWords(page, ['cat', W1, W2, W3]);
    const rows = Object.fromEntries([...page.$('own-list').children].map((row) => [row.querySelector('.w').textContent, row.className + ': ' + row.querySelector('.s').textContent]));
    for (const word of [W1, W2, W3]) expect(rows[word], word).toMatch(/^is-ok: Ready\. 3 sounds: /);
    expect(page.$('own-line').textContent).toBe('4 of 4 words can be used.');
    expect(page.$('sounds-note').textContent).toBe('The next step gets the sounds: about 11 MB one time, plus up to about ' + upTo(3 * flagged.meta.wordAudio.largestFileBytes) + ' MB for these words.');
    expect(page.asked).toEqual([]);
    page.$('next-2').click();
    await ready(page);
    expect(page.seen('summary') && !page.seen('build-problem')).toBe(true);
    // The five sound files, the index, then one request for each file that holds one of the words: two files for three words.
    const asksForPictures = ['cat', W1, W2, W3].some((word) => PICTURE_INDEX.has(word));
    const wanted = [INDEX, fileOf(W1), fileOf(W3)];
    expect(fileOf(W2)).toBe(fileOf(W1));
    expect(page.asked).toEqual([...SOUND_URLS, ...wanted, ...(asksForPictures ? PICTURE_URLS : [])]);
    expect(Object.keys(SMALL.store).length - wanted.length).toBeGreaterThan(8);
    for (const address of page.asked) expect(address).toMatch(/^[\w./-]+\.json$/);
    // What the builder was handed for those words is the store's own clip, in the shape of the word bank.
    const html = page.built();
    expect(audit(html)).toEqual([]);
    const lesson = lessonOf(html);
    expect(lesson.blocks.map((block) => block.activity)).toEqual(['isolation', 'blending']);
    for (const block of lesson.blocks) expect(block.items.map((item) => item.word), block.activity).toEqual(['cat', W1, W2, W3]);
    expect(Object.values(lesson.audio).every((uri) => /^data:audio\/wav;base64,/.test(uri))).toBe(true);
    expect(page.$('sum-out').textContent).toBe('Nothing. Every word is in every activity you chose.');
    const direct = await builder.buildPacket({ words: ['cat', W1, W2, W3], activities: ['isolation', 'blending'], seed: 1, title: 'Word Sounds: my words, version A', core, dictionary, wordlist: flagged, loader,
      banks: { phonemes: JSON.parse(SOUNDS[SOUND_URLS[0]]), isolation: JSON.parse(SOUNDS[SOUND_URLS[1]]), instructions: JSON.parse(SOUNDS[SOUND_URLS[2]]), gapFill: JSON.parse(SOUNDS[SOUND_URLS[4]]),
        kokoroWords: { ...JSON.parse(SOUNDS[SOUND_URLS[3]]).words, [W1]: storeClip(W1), [W2]: storeClip(W2), [W3]: storeClip(W3) } },
      toWav: async (uri) => 'data:audio/wav;base64,' + Buffer.from('RIFF0000WAVE' + uri.slice(-40)).toString('base64') });
    expect(direct.manifest.audio.list.filter((clip) => [W1, W2, W3].includes(clip.key)).map((clip) => [clip.key, clip.source])).toEqual(expect.arrayContaining([[W1, 'Kokoro bank'], [W2, 'Kokoro bank'], [W3, 'Kokoro bank']]));
    expect(lesson.blocks.map((block) => block.items.map((item) => item.word))).toEqual(direct.lesson.blocks.map((block) => block.items.map((item) => item.word)));
    // The builder invents no answer choice it would have to fetch: every choice is a word of the bank or one of the four.
    const choices = new Set(lesson.blocks.find((block) => block.activity === 'blending').items.flatMap((item) => (item.choices || item.options || []).map((choice) => String(choice.text || choice.word || choice).toLowerCase())));
    expect(choices.size).toBeGreaterThan(4);
    for (const choice of choices) expect(flagged.get(choice).kokoro || ['cat', W1, W2, W3].includes(choice), choice).toBe(true);

    // Another length: nothing is fetched again. Back at step 2 the note counts only what is still to get.
    page.choose('length', 'short');
    await page.until(() => !page.seen('summary'), 'the old file to go');
    await ready(page);
    expect(page.asked).toHaveLength(SOUND_URLS.length + wanted.length + (asksForPictures ? PICTURE_URLS.length : 0));
    page.$('back-3').click();
    expect(page.$('sounds-note').textContent).toBe('The sounds are already on this device.');
    await typeWords(page, [W1, W4]);
    expect(page.$('sounds-note').textContent).toBe('Most of the sounds are already on this device. These words need up to about ' + upTo(flagged.meta.wordAudio.largestFileBytes) + ' MB more.');
    const before = page.asked.length;
    page.$('next-2').click();
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    // One more file. The index is not asked for a second time.
    expect(page.asked.slice(before).filter((address) => !PICTURE_URLS.includes(address))).toEqual([fileOf(W4)]);
    expect(page.asked.filter((address) => address === INDEX)).toHaveLength(1);
    for (const block of lessonOf(page.built()).blocks) expect(block.items.map((item) => item.word), block.activity).toEqual([W1, W4]);
    // "Remove the saved sounds" forgets the store's files too: the next file gets them again.
    page.$('forget-sounds').click();
    await page.until(() => page.$('forget-said').textContent.startsWith('Done.'), 'the sounds to be forgotten');
    const forgotten = page.asked.length;
    page.$('retry').click();
    await page.until(() => !page.seen('summary'), 'the old file to go');
    await ready(page);
    expect(page.asked.slice(forgotten).filter((address) => !PICTURE_URLS.includes(address))).toEqual([...SOUND_URLS, INDEX, fileOf(W1), fileOf(W4)]);
    page.dom.window.close();
  });

  it('the picker offers the store\'s words, counts them as recorded, and a file made from its list holds them', async () => {
    const recordedOnly = flagged.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
    expect(recordedOnly).toEqual(wordlist.rows().filter((row) => row.recorded && !row.kokoro).map((row) => row.word));
    // A sound and a place in the word for which the list on the page holds a word of the store.
    const pickFor = (word, list) => builder.pickWords({ count: 10, targetSound: dictionary.lookup(word)[0][0], position: 'first', shape: 'CVC', exclude: recordedOnly }, { wordlist: list, core, dictionary, seed: 1 });
    const chosen = STORE_WORDS.find((word) => pickFor(word, flagged).words.some((listed) => STORE_WORDS.includes(listed)));
    expect(chosen, 'a store word whose first sound lists a store word').toBeTruthy();
    const direct = pickFor(chosen, flagged), plain = pickFor(chosen, load(wordlistTool.render(wordlistTool.build({ shardIndex: join(scratch, 'no-such-index.json') }))));
    const inStore = direct.words.filter((word) => STORE_WORDS.includes(word));
    expect(direct.pool).toBeGreaterThan(plain.pool);
    expect(plain.reasons.noRecording - direct.reasons.noRecording).toBe(direct.pool - plain.pool);
    const page = await open(SMALL);
    onlyIsolation(page);
    page.$('next-1').click();
    page.set('f-sound', dictionary.lookup(chosen)[0][0]);
    page.set('f-position', 'first');
    await page.until(() => page.$('pick-line').textContent === (direct.pool < 30 ? 'Only ' + direct.pool + ' words fit.' : direct.pool + ' words fit.'), 'the words for the sound');
    // One activity: a Long file uses up to 30 words, so the list is longer than ten.
    const listed = builder.pickWords({ count: 30, targetSound: dictionary.lookup(chosen)[0][0], position: 'first', shape: 'CVC', exclude: recordedOnly }, { wordlist: flagged, core, dictionary, seed: 1 }).words;
    expect(page.chips()).toEqual(listed);
    expect(listed.slice(0, 10)).toEqual(direct.words);
    const needed = listed.filter((word) => STORE_WORDS.includes(word));
    expect(needed.length).toBeGreaterThanOrEqual(inStore.length);
    expect(page.$('sounds-note').textContent).toBe('The next step gets the sounds: about 11 MB one time, plus up to about ' + upTo(Math.min(needed.length * flagged.meta.wordAudio.largestFileBytes, flagged.meta.wordAudio.bytes)) + ' MB for these words.');
    page.$('next-2').click();
    page.choose('length', 'long');
    await page.until(() => !page.seen('summary'), 'the file of another length to start');
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    const files = [...new Set(needed.map((word) => fileOf(word)))];
    expect(page.asked.filter((address) => address.startsWith('word_audio_shards/'))).toEqual([INDEX, ...files]);
    expect(lessonOf(page.built()).blocks[0].items.map((item) => item.word)).toEqual(listed);
    page.dom.window.close();
  });

  it('follows the index, whatever the files are called: the store as the generator leaves it works the same', async () => {
    const page = await open(LETTERS);
    onlyIsolation(page);
    page.$('next-1').click();
    await typeWords(page, ['cat', W1, W2, W3]);
    page.$('next-2').click();
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    const files = [...new Set([W1, W2, W3].map((word) => 'word_audio_shards/' + word[0] + '.json'))];
    expect([W1, W2, W3].map((word) => fileOf(word, LETTERS.store))).toEqual([W1, W2, W3].map((word) => 'word_audio_shards/' + word[0] + '.json'));
    expect(page.asked.filter((address) => address.startsWith('word_audio_shards/'))).toEqual([INDEX, ...files]);
    expect(lessonOf(page.built()).blocks[0].items.map((item) => item.word)).toEqual(['cat', W1, W2, W3]);
    // A store under names nobody planned for: the page asks for exactly what the index says.
    const renamed = { ...SMALL.store };
    const odd = JSON.parse(renamed[INDEX]);
    const key = odd.words[W3], old = odd.shards[key].file;
    odd.shards[key] = { ...odd.shards[key], file: 'part_7-x.json' };
    renamed['word_audio_shards/part_7-x.json'] = renamed['word_audio_shards/' + old];
    delete renamed['word_audio_shards/' + old];
    renamed[INDEX] = JSON.stringify(odd);
    const other = await open({ source: SMALL.source, store: renamed });
    onlyIsolation(other);
    other.$('next-1').click();
    await typeWords(other, [W3]);
    other.$('next-2').click();
    await ready(other);
    expect(other.asked.filter((address) => address.startsWith('word_audio_shards/'))).toEqual([INDEX, 'word_audio_shards/part_7-x.json']);
    expect(lessonOf(other.built()).blocks[0].items.map((item) => item.word)).toEqual([W3]);
    page.dom.window.close();
    other.dom.window.close();
  });

  it('a file of the store that does not arrive stops the build with a plain message, and Try again works; no file is made without the sound', async () => {
    for (const [name, breakIt, mendIt] of [
      ['a sound file that is not there', (page) => page.gone.add(fileOf(W3)), (page) => page.gone.delete(fileOf(W3))],
      ['no index', (page) => page.gone.add(INDEX), (page) => page.gone.delete(INDEX)],
      ['an index of another kind', (page) => { page.store[INDEX] = JSON.stringify({ words: { [W1]: 'x' } }); }, (page) => { page.store[INDEX] = SMALL.store[INDEX]; }],
      ['a sound file cut short', (page) => { page.store[fileOf(W1)] = SMALL.store[fileOf(W1)].slice(0, 300); }, (page) => { page.store[fileOf(W1)] = SMALL.store[fileOf(W1)]; }],
    ]) {
      const page = await open(SMALL);
      onlyIsolation(page);
      page.$('next-1').click();
      await typeWords(page, ['cat', W1, W3]);
      breakIt(page);
      page.$('next-2').click();
      await ready(page);
      expect(page.seen('build-problem') && !page.seen('summary') && !page.seen('save') && !page.seen('try'), name).toBe(true);
      expect(page.$('build-problem-text').textContent, name).toBe(FAILED);
      expect(page.seen('retry'), name).toBe(true);
      expect(page.files, name).toEqual([]);
      mendIt(page);
      page.$('retry').click();
      await page.until(() => page.seen('summary'), 'the file after trying again (' + name + ')');
      expect(lessonOf(page.built()).blocks[0].items.map((item) => item.word), name).toEqual(['cat', W1, W3]);
      page.dom.window.close();
    }
  });

  it('a word the store turns out not to hold is left out and listed, never silent; a file name that is not a plain name is never asked for', async () => {
    // The word list says W1 is in the store; this store's index does not list it, and sends W3 to a name outside the folder.
    const store = { ...SMALL.store };
    const short = JSON.parse(store[INDEX]);
    delete short.words[W1];
    short.shards[short.words[W3]] = { ...short.shards[short.words[W3]], file: '../' + short.shards[short.words[W3]].file };
    store[INDEX] = JSON.stringify(short);
    const page = await open({ source: SMALL.source, store });
    onlyIsolation(page);
    page.$('next-1').click();
    await typeWords(page, ['cat', W1, W2, W3]);
    page.$('next-2').click();
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    expect(page.asked.filter((address) => address.startsWith('word_audio_shards/'))).toEqual([INDEX, fileOf(W2)]);
    for (const address of page.asked) expect(address).not.toContain('..');
    const lesson = lessonOf(page.built());
    expect(lesson.blocks[0].items.map((item) => item.word)).toEqual(['cat', W2]);
    const lines = [...page.$('sum-out').querySelectorAll('li')].map((line) => line.textContent);
    expect(lines).toEqual(['Find Sounds: ' + W1 + ', ' + W3 + ' (no recording yet).', 'Not in the file at all: ' + W1 + ', ' + W3 + '.']);
    expect(page.$('sum-activities').textContent).toContain('Find Sounds: 2 questions.');
    page.dom.window.close();

    // A word list that flags store words but does not say how the store is cut: the note gives no number it cannot stand behind.
    const bare = await open({ source: SMALL.source.replace(/,"wordAudio":\{[^}]*\}/, ''), store: SMALL.store });
    expect(SMALL.source).toMatch(/,"wordAudio":\{[^}]*\}/);
    bare.$('next-1').click();
    await typeWords(bare, ['cat', W1]);
    expect(bare.$('sounds-note').textContent).toBe('The next step gets the sounds: about 11 MB one time, plus the sounds for these words.');
    bare.dom.window.close();
  });
});

// ---------------------------------------------------------------------------
// Words the picker leaves to the teacher, and the line for kindergarten
// ---------------------------------------------------------------------------
describe('the maker: borderline words and the kindergarten line', () => {
  const TYPED_ONLY = 'Not offered by the picker. Used because you typed it.';
  const K_LINE = "Common Core places sh, ch and th in grade 1. Choose 'Any stage' to use them earlier.";

  it('a borderline word is never in the picker\'s list and is counted there; typed by the teacher it is used, and the page says why', async () => {
    const soft = wordlist.rows().filter((row) => row.soft).map((row) => row.word);
    expect(soft).toEqual(expect.arrayContaining(['jail', 'bet', 'pot', 'kiss', 'ghost', 'fight']));
    expect(wordlist.get('jail')).toMatchObject({ soft: true, blocked: false, kokoro: true });
    expect(read('packets-make.js')).toContain("var TYPED_ONLY_SAID = '" + TYPED_ONLY + "';");
    const page = await openMaker();
    page.$('next-1').click();
    // The list as the page first shows it: three-sound words, any stage.
    const recordedOnly = wordlist.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
    const direct = builder.pickWords({ count: 10, shape: 'CVC', exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 });
    await page.until(() => page.$('pick-line').textContent === direct.pool + ' words fit.', 'the first list');
    expect(page.chips()).toEqual(direct.words);
    const typedOnly = direct.reasons.usedOnlyWhenTyped;
    expect(typedOnly).toBeGreaterThan(5);
    expect(typedOnly).toBe(wordlist.rows().filter((row) => row.soft && row.shape === 'CVC' && !row.nearBlocked).length);
    const parts = [];
    if (direct.reasons.notFamiliarEnough) parts.push(direct.reasons.notFamiliarEnough + ' less common words');
    // The words whose only recording is in the bank this page does not load are counted with those that have none.
    parts.push((direct.reasons.noRecording + direct.reasons.excluded) + ' with no recording yet');
    if (direct.reasons.britishSpellingOrWord) parts.push(direct.reasons.britishSpellingOrWord + (direct.reasons.britishSpellingOrWord === 1 ? ' British spelling or word' : ' British spellings or words'));
    parts.push(typedOnly + ' words used only when you type them');
    parts.push((direct.reasons.blocked + direct.reasons.soundsLikeABlockedWord) + ' on the list of words this tool does not use');
    expect(page.$('pick-out').textContent).toBe('Also matched, but not offered: ' + parts.join(', ') + '.');
    // Every word the picker can list, in any version: none is a borderline word, though many of them have a recording.
    for (const seed of [1, 2, 3]) expect(builder.pickWords({ count: 1e9, shape: 'CVC', exclude: recordedOnly }, { wordlist, core, dictionary, seed }).words.filter((word) => soft.includes(word))).toEqual([]);
    expect(soft.filter((word) => wordlist.get(word).kokoro && wordlist.get(word).shape === 'CVC').length).toBeGreaterThan(5);
    // Typed: used, with the one sentence. A blocked word is still refused.
    page.choose('mode', 'own');
    page.set('f-own', 'cat jail gun bet');
    await page.until(() => page.$('own-list').children.length === 4, 'the checked words');
    const rows = Object.fromEntries([...page.$('own-list').children].map((row) => [row.querySelector('.w').textContent, { text: row.querySelector('.s').textContent, ok: row.className === 'is-ok' }]));
    expect(rows.jail).toEqual({ ok: true, text: TYPED_ONLY });
    expect(rows.bet).toEqual({ ok: true, text: TYPED_ONLY });
    expect(rows.cat).toEqual({ ok: true, text: 'Ready. 3 sounds: k, a, t.' });
    expect(rows.gun).toEqual({ ok: false, text: 'Left out. It is on the list of words this tool does not use. That list is a first pass and can be too cautious.' });
    expect(page.$('own-line').textContent).toBe('3 of 4 words can be used.');
    page.$('next-2').click();
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    const lesson = lessonOf(page.built());
    for (const block of lesson.blocks) expect(block.items.map((item) => item.word), block.activity).toEqual(['cat', 'jail', 'bet']);
    expect(page.$('sum-words').textContent).toBe('3 words: cat, jail, bet.');
    expect(JSON.stringify(lesson.blocks)).not.toContain('"gun"');
    // No answer choice in the file is a borderline word the teacher did not type.
    const choices = lesson.blocks.flatMap((block) => block.items.flatMap((item) => (item.choices || item.chips || []).map((choice) => String(choice.text).toLowerCase())));
    expect(choices.length).toBeGreaterThan(10);
    expect(choices.filter((choice) => soft.includes(choice) && !['jail', 'bet'].includes(choice))).toEqual([]);
    page.dom.window.close();
  });

  it('with a kindergarten stage chosen, and with no other, one line says where sh, ch and th are placed', async () => {
    const doc = parse('packets-make.html');
    const note = doc.getElementById('stage-k-note');
    expect(note.textContent).toBe(K_LINE);
    expect(note.hidden && note.className === 'hint' && note.tagName === 'SPAN').toBe(true);
    // Near the stage choice: right under the stage's own line, in the same field. The option it names is the page's own.
    expect(note.previousElementSibling.id).toBe('stage-hint');
    expect(note.closest('.field').querySelector('select').id).toBe('f-stage');
    expect(doc.querySelector('#f-stage option[value=""]').textContent).toBe('Any stage');
    expect(read('packets-make.js')).toContain("label: 'Any stage'");
    expect(read('packets-make.html').split(K_LINE)).toHaveLength(2);
    // The two kindergarten rows of the default (US, Common Core) table.
    const stages = builder.stageList();
    const kinder = stages.filter((row) => row.isDefault && /^K /.test(row.id)).map((row) => row.id);
    expect(kinder).toEqual(['K early', 'K late']);
    expect(read('packets-make.js')).toContain("var K_STAGES = ['K early', 'K late'];");
    expect(stages.find((row) => row.id === 'K early').frameworkLabel).toMatch(/Common Core/);
    const page = await openMaker();
    page.$('next-1').click();
    expect(page.seen('stage-k-note')).toBe(false);
    expect(page.$('f-stage').getAttribute('aria-describedby')).toBe('stage-hint');
    for (const row of stages) {
      page.set('f-stage', row.id);
      expect(page.seen('stage-k-note'), row.id).toBe(kinder.includes(row.id));
      expect(page.$('f-stage').getAttribute('aria-describedby'), row.id).toBe(kinder.includes(row.id) ? 'stage-hint stage-k-note' : 'stage-hint');
      expect(page.$('stage-k-note').textContent, row.id).toBe(K_LINE);
    }
    page.set('f-stage', 'K late');
    expect(page.seen('stage-k-note')).toBe(true);
    page.set('f-stage', '');
    expect(page.seen('stage-k-note')).toBe(false);
    expect(page.$('f-stage').getAttribute('aria-describedby')).toBe('stage-hint');
    // What the line says is true of the picker: no kindergarten word is spelled with sh, ch or th; grade 1 has them; "Any stage" has them.
    const digraph = (stage) => builder.pickWords({ ...(stage ? { stage } : {}), count: 1e9, requireClip: false }, { wordlist, core, dictionary, seed: 1 }).words.filter((word) => /sh|ch|th/.test(word));
    for (const id of kinder) expect(digraph(id), id).toEqual([]);
    expect(digraph('G1 early')).toEqual(expect.arrayContaining(['ship', 'chin', 'thin']));
    expect(digraph('')).toEqual(expect.arrayContaining(['ship', 'chin', 'thin']));
    // Kept with the other choices, the stage comes back with its line on the next visit.
    page.set('f-stage', 'K early');
    page.dom.window.close();
  });
});

describe('the two small scripts', () => {
  it('packets-page.js puts the one name in the title and shows the page\'s rule word for word', () => {
    for (const file of ['packets.html', 'packets-make.html']) {
      const dom = new JSDOM(read(file), { runScripts: 'outside-only' });
      const before = dom.window.document.title;
      dom.window.eval(read('packets-page.js'));
      expect(dom.window.document.title, file).toBe(NAME + ': ' + before);
      expect(dom.window.document.querySelector('[data-show-rule]').textContent, file).toBe(CSP[file]);
      dom.window.close();
    }
  });

  it('packets-try.js shows only a file of this site, in a frame that cannot reach the site\'s storage', async () => {
    const open = (hash, body) => {
      const dom = new JSDOM(read('packets-try.html'), { runScripts: 'outside-only', url: 'https://packets.test/site/packets-try.html' + hash });
      const asked = [];
      dom.window.fetch = async (url) => { asked.push(url); return body == null ? Promise.reject(new TypeError('gone')) : { ok: true, text: async () => body }; };
      dom.window.Blob = class { constructor(parts) { this.body = parts.join(''); } };
      dom.window.URL.createObjectURL = () => 'blob:https://packets.test/copy';
      dom.window.eval(read('packets-try.js'));
      return { dom, d: dom.window.document, asked };
    };
    const wait = () => new Promise((resolve) => setTimeout(resolve, 30));
    for (const hash of ['', '#https://elsewhere.test/file.html', '#blob:https://elsewhere.test/1', '#data:text/html,hello']) {
      const page = open(hash, '<!doctype html><script type="application/json" id="packet-manifest">{}</script>');
      await wait();
      expect(page.asked, hash).toEqual([]);
      expect(page.d.getElementById('try-problem').hidden, hash).toBe(false);
      expect(page.d.querySelector('iframe'), hash).toBeNull();
      page.dom.window.close();
    }
    const gone = open('#blob:https://packets.test/1', null);
    await wait();
    expect(gone.d.getElementById('try-problem').hidden).toBe(false);
    gone.dom.window.close();
    const other = open('#blob:https://packets.test/1', '<!doctype html><p>not a practice file</p>');
    await wait();
    expect(other.d.querySelector('iframe')).toBeNull();
    other.dom.window.close();
    const good = open('#blob:https://packets.test/1', '<!doctype html><script type="application/json" id="packet-manifest">{}</script>');
    await wait();
    expect(good.asked).toEqual(['blob:https://packets.test/1']);
    const frame = good.d.querySelector('iframe');
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-downloads');
    expect(frame.getAttribute('src')).toBe('blob:https://packets.test/copy');
    expect(frame.getAttribute('title')).toBe('The file a learner gets');
    expect(good.d.getElementById('try-problem').hidden).toBe(true);
    good.dom.window.close();
  });

  it('the preview page serves both makers: it says "file" and "learner", and offers both makers when a preview is gone', () => {
    const doc = parse('packets-try.html');
    expect(doc.title).toBe('Try the file');
    expect(doc.querySelector('.try-bar').textContent.replace(/\s+/g, ' ').trim()).toBe('Preview This is the file a learner gets. Nothing you do here is kept. Close this tab to go back to the maker.');
    expect(doc.getElementById('try-wait').textContent).toBe('Opening the file.');
    const problem = doc.getElementById('try-problem');
    expect(problem.querySelector('h2').textContent).toBe('The preview is not here any more');
    expect(problem.querySelector('p').textContent).toBe('A preview lasts while the maker page stays open on the file it made. Go back to the maker and press Try it again. Or start a new file.');
    // Both makers, as equals, in the order of the front door.
    expect([...problem.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href'), a.className])).toEqual([
      ['Make a practice file', 'packets-make.html', 'btn btn-primary'], ['Make a math check', 'packets-check.html', 'btn btn-primary']]);
    for (const a of problem.querySelectorAll('a')) expect(existsSync(a.getAttribute('href')), a.getAttribute('href')).toBe(true);
    // Nothing a person reads or hears names one kind of file, or says "student": the two links above are the only exception.
    const said = [doc.title, doc.querySelector('.try-bar').textContent, doc.getElementById('try-wait').textContent, problem.querySelector('h2').textContent, problem.querySelector('p').textContent,
      doc.querySelector('noscript').textContent, ...(read('packets-try.js').match(/'[^'\n]*'/g) || [])].join('\n');
    expect(said).toContain('The file a learner gets');
    expect(said).not.toMatch(/practice|math|check|student/i);
  });
});
