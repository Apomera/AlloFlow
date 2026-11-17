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
// packets-words.js is "Edit this word" on the maker page: the one script of these pages that may ask for the microphone (see below).
const SCRIPTS = ['packets-page.js', 'packets-make.js', 'packets-try.js', 'packets-words.js', 'packets-print-cards.js'];
// The vocabulary maker (2026-11-12) has its own page tests (tests/packets_vocab_page.test.js); its files are spelled the same way.
const NEW_FILES = [...PAGES, ...SCRIPTS, 'packets.css', 'packets-words.css', 'packets-print-cards.css', 'packets-mark.svg',
  'packets-vocab.html', 'packets-vocab.js', 'packets-vocab.css', 'packet_vocab_builder.js',
  // Open a practice file (2026-11-12) has its own page tests (tests/packets_open_page.test.js); its files are spelled the same way.
  'packets-open.html', 'packets-open.js', 'packets-open.css', 'packets_handoff.js'];
// The sentences about the voices, word for word, in the "See the details" panel of both pages. Both voices are AI voices,
// named (owner, 2026-11-12): the builder's credits name the same two (see "Machine-made recordings" below).
const VOICES_SAID = 'The spoken sounds were recorded ahead of time with two AI voices (Kokoro and Google Gemini).';
const VOICES = 'Nothing is generated when you make a file or when a student uses it. ' + VOICES_SAID;
const NAME = 'AlloFlow Packets';
const parse = (file) => new JSDOM(read(file)).window.document;
const csp = (doc) => doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');

// The web addresses in these files, and why each is there.
const ALLOWED_ADDRESSES = [
  { file: 'packets.html', url: 'https://github.com/Apomera/AlloFlow', why: 'a link (not a load) to the public source code, the same address index.html already links' },
  { file: 'packets-mark.svg', url: 'http://www.w3.org/2000/svg', why: 'the SVG namespace name, which an SVG file must carry; it is a name and is never fetched' },
  // Open a practice file runs a file in a frame that takes this page's rule: a file made in the app with a class mailbox may send to it.
  { file: 'packets-open.html', url: 'https://script.google.com', why: 'in the rule only: the class mailbox of a file made in the AlloFlow app' },
  { file: 'packets-open.html', url: 'https://script.googleusercontent.com', why: 'in the rule only: where that class mailbox answers from' },
];
// Every sentence on the pages that holds the word AI. Each says that none runs, or says exactly where one was used.
const ALLOWED_AI_SENTENCES = [
  'Runs without AI.',  
  'This page runs without AI.',                                                                  // the tagline, in the title, the description and the h1
  'This page runs without AI. No account. Nothing you choose leaves your device.',    // the proof line
  'Run AI.',                                                                 // a list item under "A practice file cannot"
  VOICES_SAID,                                                               // the voices, said exactly
];
// British spellings and usages that must not reach a US teacher.
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const STRICT = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; form-action 'none'; base-uri 'none'";
const CSP = {
  'packets.html': STRICT,
  // The maker shows a teacher's own picture and plays a recording, both held in the page as data: addresses. Nothing more.
  'packets-make.html': STRICT.replace("img-src 'self';", "img-src 'self' data:; media-src data:; connect-src 'self';"),
  // The preview shows a built practice file, which carries its script and styles inside itself. A browser hands
  // this page's rule down to the framed file, so inline script and style must be allowed here, and only here.
  'packets-try.html': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src data: blob:; font-src data:; connect-src blob:; frame-src blob:; form-action 'none'; base-uri 'none'",
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
    expect(CSP['packets.html']).not.toMatch(/unsafe|\*|data:|blob:|https?:/);
    // The maker names no other website, runs no inline script, and allows data: only for its pictures and sounds.
    expect(CSP['packets-make.html']).not.toMatch(/unsafe|\*|blob:|https?:|wss?:/);
    expect(CSP['packets-make.html'].split('; ').filter((part) => /data:/.test(part))).toEqual(["img-src 'self' data:", 'media-src data:']);
    expect(CSP['packets-make.html']).toContain("connect-src 'self'");
    // The loosened page loads one script, keeps nothing, and is reached only from the maker.
    const tryPage = parse('packets-try.html');
    expect([...tryPage.querySelectorAll('script')].map((script) => script.getAttribute('src'))).toEqual(['packets-try.js']);
    expect(read('packets-try.js')).not.toMatch(/localStorage|sessionStorage|indexedDB|cookie|allow-same-origin/);
    expect(read('packets-try.js')).toContain("frame.setAttribute('sandbox', 'allow-scripts allow-downloads')");
    expect(read('packets.html')).not.toContain('packets-try');
  });

  it('load nothing from the shared site assets, which pull in fonts and icons from other hosts', () => {
    for (const file of PAGES) expect(read(file), file).not.toMatch(/shared\.css|site\.js|lucide|fonts\.g|unpkg|promo/i);
    for (const file of SCRIPTS) expect(read(file), file).not.toMatch(/XMLHttpRequest|WebSocket|EventSource|sendBeacon|\beval\s*\(|new\s+Function|\bimport\s*\(|\.\s*cookie\b|serviceWorker/);
    // The microphone: only "Edit this word" may ask for it (when the teacher presses Record), and it fetches nothing.
    for (const file of SCRIPTS.filter((name) => name !== 'packets-words.js')) expect(read(file), file).not.toMatch(/getUserMedia|MediaRecorder/);
    expect(read('packets-words.js').match(/\bgetUserMedia\(/g)).toHaveLength(1);
    expect(read('packets-words.js')).not.toMatch(/fetch|localStorage|sessionStorage|indexedDB|encodeURIComponent|body\s*:/);
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
    // 2026-11-14 (T1): front-door headline updated to "Quick Practice & Checks. Runs without AI. No accounts."
    expect(parse('packets.html').querySelector('h1').textContent).toBe('Quick Practice & Checks. Runs without AI. No accounts.');
    for (const file of ['packets.html', 'packets-make.html']) expect(parse(file).querySelector('details.proof .proof-body li').textContent, file).toBe(VOICES);
    expect(parse('packets-make.html').getElementById('sources').textContent).toContain(VOICES_SAID);
    // In the scripts the word appears in comments only: no line a visitor reads.
    for (const file of SCRIPTS) for (const line of read(file).split('\n')) if (/\bAI\b/.test(line)) expect(line.trim().startsWith('//'), file + ': ' + line).toBe(true);
    // An AI product is named only where the voices are said; no other sentence names one.
    expect((read('packets.html') + read('packets-make.html')).split(VOICES_SAID).join('')).not.toMatch(/Gemini|Kokoro|ChatGPT|chatbot|generat(?:es|ive)|\bLLM\b/i);
    expect(read('word_sounds_packet_builder.js')).toContain("'Machine-made recordings: Kokoro-82M text-to-speech (voice af_heart)'");
    expect(read('word_sounds_packet_builder.js')).toContain("'Machine-made recordings: Google Gemini text-to-speech, made ahead of time'");
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
      // The maker's line changed on 2026-11-11 (owner): its sound files come in small groups of words, so "nothing leaves" was too strong.
      expect(doc.querySelector('details.proof summary').textContent, file).toContain(file === 'packets-make.html' ? 'This page runs without AI. No account. The words you choose are not uploaded.'
        : 'This page runs without AI. No account. Nothing you choose leaves your device.');
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

  it('the main site introduces Packets from its home page and tool finder and links to them in the menus', () => {
    const squash = (text) => text.replace(/\s+/g, ' ').trim();
    const home = parse('index.html');
    const homeLinks = [...home.querySelectorAll('main a[href^="packets"]')];
    // 2026-11-12 (Aaron): easier to find from the home page: a line under the hero's buttons, then the band.
    expect(homeLinks.map((a) => [a.getAttribute('href'), a.textContent])).toEqual([['packets.html', 'Quick Practice & Checks →'], ['packets.html', 'Open ' + NAME]]);
    expect(squash(homeLinks[0].closest('p').textContent)).toBe('Quick Practice & Checks → Make a practice file or a short check in your browser: word sounds, math facts, vocabulary. Runs without AI. No account.');
    expect(homeLinks[0].closest('header')).toBeTruthy();
    const band = home.getElementById('homePackets');
    expect(band.contains(homeLinks[1])).toBe(true);
    expect(home.getElementById(band.getAttribute('aria-labelledby')).textContent).toBe('Quick Practice & Checks');
    expect(squash(band.textContent)).toBe('Quick Practice & Checks Just need a practice file or a short progress check? ' + NAME + ' makes them in your browser. Runs without AI. No account. Open ' + NAME);
    // The band sits after the entry paths and before the tool finder.
    expect([band.previousElementSibling.id, band.nextElementSibling.id]).toEqual(['homeEntryPaths', 'home-tool-finder']);
    expect(band.querySelectorAll('script, link, img, iframe, form')).toHaveLength(0);
    const tools = parse('tools.html');
    const toolLinks = [...tools.querySelectorAll('main a[href^="packets"]')];
    expect(toolLinks.map((a) => [a.getAttribute('href'), a.textContent])).toEqual([['packets.html', NAME]]);
    expect(squash(toolLinks[0].parentElement.textContent)).toBe('Quick Practice & Checks: practice files and short checks (word sounds, math facts, vocabulary) that run without AI. ' + NAME + '.');
    expect(toolLinks[0].closest('header.tool-finder-hero')).toBeTruthy();
    // 2026-11-13 (Aaron): the Packets front door is now in all three shared site menus.
    for (const doc of [home, tools]) {
      for (const menu of ['[data-site-nav="primary"]', '#mobileNav', 'noscript .noscript-nav']) {
        const links = [...doc.querySelectorAll(`${menu} a[href^="packets"]`)];
        expect(links.map((a) => [a.getAttribute('href'), a.textContent]), menu).toEqual([['packets.html', 'Quick Practice & Checks']]);
      }
    }
    expect(existsSync('packets.html')).toBe(true);
  });

  it('the front door links only to what exists, and claims only what is true today', () => {
    const doc = parse('packets.html');
    const cards = [...doc.querySelectorAll('.card')].map((card) => ({ title: card.querySelector('h2').textContent, links: [...card.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]), text: card.textContent }));
    // One name for each maker, the name its own page gives itself (2026-11-12): Word Sounds practice, math fact practice, a math check.
    expect(cards.map((card) => [card.title, card.links])).toEqual([
      ['Make Word Sounds practice', [['Make Word Sounds practice', 'packets-make.html']]],
      ['Make math fact practice or a math check', [['Math fact practice', 'packets-math-practice.html'], ['A math check', 'packets-check.html']]],
      // 2026-11-12: the vocabulary maker, a third card that makes a file.
      ['Make vocabulary practice', [['Make vocabulary practice', 'packets-vocab.html']]],
      ['Make Symbol Runner practice', [['Make Symbol Runner practice', 'packets-symbol-runner.html']]],
      ['Present and export word cards', [['Present and export word cards', 'packets-present-export.html']]],
      ['Add up results', [['Add up results', 'packets-results.html']]],
      // 2026-11-16: the student's way in was a text link 3,215 px down a phone page.
      ['Open a practice file or check', [['Open a practice file or check', 'packets-open.html']]],
      ['Check it yourself', [['Check it yourself', '#check']]]]);
    expect(cards[6].text).toContain('For a student who was given a file');
    expect(parse('packets-open.html').querySelector('h1').textContent).toBe('Open a practice file or check');
    // 2026-11-16: the hero is the headline, one line and the scope; the sizes and the voice note sit under the cards, so a maker is on the first screen.
    expect([...doc.querySelector('.hero .wrap').children].map((node) => node.tagName + '.' + node.className)).toEqual(['H1.', 'P.lead', 'P.scope']);
    // 2026-11-17: then the About page (who makes it, how to report a problem).
    expect([...doc.querySelector('.cards + .door-notes').children].map((node) => node.className)).toEqual(['facts', 'scope', 'scope']);
    expect(doc.querySelector('.door-notes a[href="packets-about.html"]').textContent).toBe('About Packets');
    expect([parse('packets-make.html').querySelector('h1').textContent, parse('packets-math-practice.html').querySelector('h1').textContent, parse('packets-check.html').querySelector('h1').textContent])
      .toEqual(['Make Word Sounds practice', 'Make math fact practice', 'Make a math check']);
    expect(cards[0].text).toContain('Hearing sounds, letters and sounds, spelling, rhyme.');
    expect(cards[1].text).toContain('Feedback on every fact, for learning facts by heart.');
    expect(cards[1].text).toContain('Three ready checks, or your own problems.');
    expect(cards[1].text).toContain('Three steps each. No sound needed.');
    expect(cards[2].text).toContain('Practice, or a short check.');
    expect(cards[3].text).toContain('Works offline.');
    expect(cards[4].text).toContain('PowerPoint slides');
    expect(cards[5].text).toContain('not uploaded');
    expect(cards[5].text).toContain('each student over time');
    expect(doc.getElementById('check')).toBeTruthy();
    expect(doc.body.textContent).toContain('For practice and for checking progress. Not a standardized test.');
    // Five cards (four before the vocabulary maker, 2026-11-12), each a direct child of the grid. Four are built the same way: a heading that is the card's one link, a line, a foot;
    // packets.css stretches that link over the whole card (.card a::after). The math card names its two makers: a plain heading, then
    // one link for each with its own line, not stretched (.card .card-links). The three that make a file are filled; the two for what
    // comes after are outlined.
    expect([...doc.querySelectorAll('.cards > *')].map((node) => node.className)).toEqual(['card card-main', 'card card-main card-pair', 'card card-main', 'card card-main', 'card card-main', 'card card-go', 'card card-go', 'card card-go']);
    for (const card of doc.querySelectorAll('.card')) {
      const pair = card.classList.contains('card-pair');
      expect([...card.children].map((node) => node.tagName + (node.className ? '.' + node.className : ''))).toEqual(pair ? ['H2', 'UL.card-links', 'P.card-foot'] : ['H2', 'P', 'P.card-foot']);
      expect(!!card.querySelector('h2 > a')).toBe(!pair);
    }
    expect(read('packets.css')).toContain('.card .card-links a::after { content: none; }');
    expect(read('packets.css')).not.toContain('card-also');
    expect(doc.body.textContent).not.toContain('Or make');
    // One column on a phone, two by two from 44rem. The old three-column rule is gone.
    const css = read('packets.css');
    expect(css).toContain('.cards { display: grid; gap: 1rem; grid-template-columns: 1fr;');
    expect(css).toContain('@media (min-width: 44rem) {\n  .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }');
    expect(css.match(/\.cards \{/g)).toHaveLength(2);
    expect(css).not.toContain('1.15fr');
    const today = Object.fromEntries([...doc.querySelectorAll('#today h3')].map((heading) => [heading.textContent, heading.nextElementSibling.textContent]));
    expect(today).toEqual({ 'Available today': 'Word Sounds practice, math fact practice, math checks, vocabulary practice, Symbol Runner practice and word card export, with a results file for each student. Read-alongs of your own passage.', 'Being built': 'More words with recordings. More checks for reading skills.' });
    // Every builder is named where the builders are listed, and each one exists.
    const verify = doc.querySelector('.verify').textContent;
    for (const file of ['word_sounds_packet_builder.js', 'packet_math_practice_builder.js', 'packet_check_builder.js', 'packet_vocab_builder.js', 'packet_symbol_runner_builder.js', 'packet_read_along_builder.js', 'word_sounds_take_home_loader.js']) {
      expect(verify, file).toContain(file);
      expect(existsSync(file), file).toBe(true);
    }
    // The verify page has one name everywhere: "Look inside a file".
    expect([...doc.querySelectorAll('a[href="packets-verify.html"]')].map((a) => a.textContent)).toEqual(['Look inside a file']);
    // What the front door says: one button saves the results; a file preview does not run (as the IT guide says, reported, not yet tested).
    expect(doc.getElementById('what').textContent).toContain('At the end the student presses one button, Save results as a spreadsheet file (CSV).');
    const preview = [...doc.querySelectorAll('#check li')].find((li) => li.textContent.startsWith('Run inside a file preview.')).textContent;
    expect(preview).toBe('Run inside a file preview. The previews in Google Drive, Google Classroom and the iPad Files app do not run the file. '
      + 'The file then shows a note that asks the student to download it and open it in a browser. Reported, not yet tested by us.');
    expect(doc.body.textContent).not.toMatch(/\bsecure\b|\btest\b(?<!standardized test)/i);
    expect(doc.body.textContent).toContain('The file has one script that runs, plus one data block that describes the file.');
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
      'word_sounds_symbols_en.js', 'packets_my_words.js', 'packets-words.js', 'packets_verify_core.js', 'packets_reopen.js', 'packets_handoff.js', 'packets_zip.js', 'packets-print-cards.js', 'packets-make.js']);
    // The picture index is small (it says which words have a picture); the drawings load only when a file is made with them.
    expect(statSync('word_sounds_symbols_en.js').size).toBeLessThan(40000);
    const megabytes = scripts.reduce((sum, file) => sum + statSync(file).size, 0) / 1e6;
    // 2026-11-14: scripts grew from 2.49 MB to ~2.7 MB after expanding the phoneme/wordlist dictionary with vendored K-8 lexicons and regular inflections.
    expect(read('packets-make.html')).toContain('Getting the word lists, about 3 MB.');
    expect(megabytes).toBeGreaterThan(2.5);
    expect(megabytes).toBeLessThan(3.5);
  });

  it('the maker says exactly what the server can see, now that some sound files depend on the words', () => {
    const bullets = [...parse('packets-make.html').querySelectorAll('details.proof .proof-body li')].map((item) => item.textContent);
    const perFile = require('../dev-tools/repack_word_sounds_word_audio.cjs').DEFAULT_MAX;
    // What is still true, word for word: nothing chosen is sent.
    expect(bullets[1]).toBe('The practice file is put together in this browser tab. The page looks your words up in a word list and a sound dictionary that it has already loaded. Your words and your choices are not sent anywhere.');
    expect(parse('packets-make.html').querySelector('details.proof .proof-line').textContent).toBe('This page runs without AI. No account. The words you choose are not uploaded.');
    // What a teacher adds to a word, and the microphone, and the one page that reaches other sites, said in the details.
    expect(bullets.slice(6)).toEqual([
      "What you add to a word (its sounds, your recording, your picture) is kept in this browser's storage for this site. It is not uploaded. It goes only into the files you make. You can remove it under My words on this device, in step 2.",
      'The microphone is used only when you press Record it yourself, and only until the recording stops. The recording stays on this device.',
      'This page reaches only this site. One other page, Find a picture, can search Global Symbols, Openverse and Wikimedia Commons after you turn its search on there. It sends them the word you search for, and asks them for the pictures it shows.']);
    // Each of those is true of the code: the store is IndexedDB on this site, the pictures page names exactly those three services, and the maker's rule names no other site.
    expect(read('packets_my_words.js')).toContain("var DB_NAME = 'alloflow-packets-my-words';");
    expect(read('packets_my_words.js')).not.toMatch(/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/);
    expect(read('packets-pictures.js')).toContain("{ id: 'globalsymbols', name: 'Global Symbols' },\n    { id: 'openverse', name: 'Openverse' },\n    { id: 'commons', name: 'Wikimedia Commons' },");
    expect(csp(parse('packets-make.html'))).not.toMatch(/https?:/);
    expect(parse('packets-make.html').querySelector('details.proof').textContent).not.toContain('Nothing you choose leaves your device');
    // What changed: most sound files are the same for everyone; the small ones are asked for by need, and the server can see which.
    expect(bullets[3]).toBe('The page loads files from this site only, including the part that makes recordings smaller (MP3). At step 3 it gets the sound files, also from this site. Most are the same files whatever you choose. '
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
// 2026-11-14 (R1): word_audio_kokoro_bank.json grew to 10.19 MB at 64 kbps fp32, shifting SOUND_BYTES from ~11 MB to ~15 MB.
const soundsNoteFor = (words) => {
  const n = words.filter(storeWord).length, audio = wordlist.meta.wordAudio;
  if (!n) return 'The next step gets the sounds: about 15 MB, one time.';
  const bytes = Math.min(n * audio.largestFileBytes, audio.bytes);
  return 'The next step gets the sounds: about 15 MB one time, plus up to about ' + (bytes >= 10e6 ? String(Math.ceil(bytes / 1e6)) : (Math.ceil(bytes / 1e5) / 10).toFixed(1)) + ' MB for these words.';
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
const EARLIER_CHOICES = { v: 1, mode: 'pick', shape: 'CVC', stage: '' };
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
  // Most tests below were written against the first-visit word choices of 2026-11-13: the CVC pattern at any grade
  // level. Since 2026-11-16 a true first visit starts at a grade level with any pattern instead (see "a first visit
  // starts at a grade level"). So the helper opens the page as a returning browser that kept the earlier choices,
  // which the page honours, unless a test asks for a true first visit or sets the store itself in options.before.
  if (!options.firstVisit) w.localStorage.setItem('alloflow-packets-maker/1', JSON.stringify(EARLIER_CHOICES));
  if (options.before) options.before(w);
  // The page's own scripts, in the order the page names them: what the page does not load, the test does not have.
  for (const script of d.querySelectorAll('script[src]')) w.eval((options.sources && options.sources[script.getAttribute('src')]) || read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.set = (id, value) => { const node = page.$(id); node.value = value; node.dispatchEvent(new w.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
  page.choose = (name, value) => { const radio = d.querySelector('input[name="' + name + '"][value="' + value + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.chips = () => [...page.$('pick-chips').querySelectorAll('li span')].map((node) => node.textContent);
  // 2026-11-16: the chips are the words of the FILE, the first of the picker's list. fileCount is how many that is.
  page.fileCount = () => Number(page.$('f-count').value);
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
    const totalNotOffered = held.length + cannotBuild.length;
    // 2026-11-14 (T1): #not-offered is folded into a closed <details> with a short count summary and full list inside.
    expect(page.$('not-offered').tagName).toBe('DETAILS');
    expect(page.$('not-offered').open).toBe(false);
    expect(page.$('not-offered-summary').textContent).toBe(totalNotOffered + ' more ' + (totalNotOffered === 1 ? 'activity is' : 'activities are') + ' not in this version');
    expect(page.$('not-offered-text').textContent).toBe('Not in this version: ' + (heldNames.length ? (heldNames.length > 1 ? and(heldNames) : heldNames[0]) + ' (not enough recorded sounds yet). ' : '')
      + and(cannotBuild) + ' (they cannot be made from a word list alone yet).');
    // Today that is Word Families: most word endings (-ug, -ip) have no recording.
    expect(page.$('not-offered-text').textContent).toContain('Not in this version: Word Families (not enough recorded sounds yet). ');
    expect(page.d.querySelector('input[value="letter_tracing"]').closest('label').querySelector('.choice-note').textContent).toBe('Practice only. It is not scored.');
    expect(page.d.querySelectorAll('.choice-note')).toHaveLength(1);
    expect(page.w.document.title).toBe(NAME + ': Make Word Sounds practice, step 1 of 3');
    // With nothing chosen the page says so and stays.
    for (const box of page.d.querySelectorAll('.strand input:checked')) box.click();
    page.$('next-1').click();
    expect(page.seen('step-1')).toBe(true);
    expect(page.$('step-1-problem').textContent).toBe('Choose at least one activity to go on.');
    page.d.querySelector('button[aria-label^="Choose the usual set for Hearing sounds"]').click();
    expect([...page.d.querySelectorAll('.strand input:checked')].map((box) => box.value)).toEqual(['isolation', 'blending', 'segmentation']);
    page.dom.window.close();
  });

  it('a sound the chosen grade level has no word for cannot be chosen, and says why (2026-11-16)', async () => {
    const page = await openMaker();
    const recordedOnly = wordlist.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
    const options = () => [...page.$('f-sound').querySelectorAll('optgroup option')];
    const NOTE = ' (no words at this grade level)';
    // The grade levels; the two wider levels after them are not grade levels (they have a test of their own).
    const stages = [...page.$('f-stage').querySelectorAll('option')].map((option) => option.value).filter((id) => id && !/^wider:/.test(id));
    expect(stages.length).toBeGreaterThan(3);
    let closed = 0;
    for (const stage of stages) {
      page.set('f-sound', '');
      page.set('f-stage', stage);
      for (const option of options()) {
        // Worked out again here, by asking the picker for this sound at this grade level.
        const pool = builder.pickWords({ targetSound: option.value, stage, exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 }).pool;
        expect(option.disabled, stage + ' ' + option.value + ' (' + pool + ' words)').toBe(pool === 0);
        expect(option.textContent.endsWith(NOTE), stage + ' ' + option.value).toBe(pool === 0);
        expect(option.textContent.replace(NOTE, ''), stage + ' ' + option.value).toBe(option.getAttribute('data-name'));
        if (pool === 0) closed += 1;
      }
    }
    // The reason for the change: the first kindergarten stage has words for only some of the sounds.
    expect(closed).toBeGreaterThan(10);
    // Any grade level: every sound can be chosen again, with its plain name.
    page.set('f-stage', '');
    expect(options().some((option) => option.disabled || option.textContent.endsWith(NOTE))).toBe(false);
    // A sound chosen before the grade level stays chosen and can be seen, with the reason beside it.
    page.set('f-stage', stages[0]);
    const none = options().find((option) => option.disabled);
    page.set('f-stage', '');
    page.set('f-sound', none.value);
    page.set('f-stage', stages[0]);
    const kept = options().find((option) => option.value === none.value);
    expect(page.$('f-sound').value).toBe(none.value);
    expect(kept.disabled).toBe(false);
    expect(kept.textContent.endsWith(NOTE)).toBe(true);
    page.dom.window.close();
  });

  it('Sound Counting: says when every word has the same number of sounds, and one press mixes the lengths (2026-11-16)', async () => {
    const page = await openMaker();
    const recordedOnly = wordlist.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const soundsOf = (words) => [...new Set(words.map((word) => wordlist.get(word).sounds))].sort((a, b) => a - b);
    // Without Sound Counting among the activities: no note.
    page.$('next-1').click();
    await wait(60);
    expect(page.$('mix-notes').hidden).toBe(true);
    // With it, and the pattern "three sounds" (what this page was opened with): every word has 3 sounds.
    page.$('back-2').click();
    const counting = page.d.querySelector('.strand input[value="counting"]');
    if (!counting.checked) counting.click();
    page.$('next-1').click();
    await wait(60);
    expect(page.$('f-shape').value).toBe('CVC');
    expect(soundsOf(page.chips())).toEqual([3]);
    const note = page.d.querySelector('#mix-notes [data-mix="counting"]');
    expect(page.$('mix-notes').hidden).toBe(false);
    expect(note.querySelector('span').textContent).toBe('Sound Counting: every word here has 3 sounds, so the answer is always 3.');
    expect(page.$('mix-fix').textContent).toBe('Mix in words with other numbers of sounds (any pattern)');
    // One press: the pattern is cleared and the words are dealt out by their number of sounds, 2 to 6 first.
    page.$('mix-fix').click();
    await wait(60);
    expect(page.$('f-shape').value).toBe('');
    const mixed = page.chips();
    expect(soundsOf(mixed).length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...soundsOf(mixed))).toBeGreaterThanOrEqual(2);
    expect(Math.max(...soundsOf(mixed))).toBeLessThanOrEqual(6);
    expect(mixed).toEqual(builder.pickWords({ count: mixed.length, spread: 'sounds', exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 }).words);
    expect(page.d.querySelector('#mix-notes [data-mix="counting"]')).toBeNull();
    expect(page.d.querySelector('#mix-notes [data-mix="spread"] span').textContent).toMatch(/^The words are mixed by their number of sounds \(2 to [4-6]\)\.$/);
    expect(JSON.parse(page.dom.window.localStorage.getItem('alloflow-packets-maker/1')).spread).toBe(true);
    // And back: the most common words again, which have only 2 or 3 sounds, and the page says so.
    page.$('mix-undo').click();
    await wait(60);
    expect(soundsOf(page.chips())).toEqual([2, 3]);
    expect(page.d.querySelector('#mix-notes [data-mix="counting"] span').textContent).toBe('Sound Counting: these words have only 2 or 3 sounds, so there are only two answers.');
    expect(page.$('mix-fix').textContent).toBe('Mix in words with other numbers of sounds');
    // A grade level whose words all have 2 or 3 sounds: no button (it would change nothing), and the page says why.
    page.set('f-stage', 'K early');
    await wait(60);
    const kWords = builder.pickWords({ count: 100000, stage: 'K early', exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 }).words;
    expect(soundsOf(kWords)).toEqual([2, 3]);
    expect(page.$('mix-fix')).toBeNull();
    expect(page.d.querySelector('#mix-notes [data-mix="counting"]').textContent).toBe('Sound Counting: these words have only 2 or 3 sounds, so there are only two answers.'
      + ' The words that fit these choices all have 2 or 3 sounds. A later grade level, or no sound to practice, gives a wider mix.');
    page.dom.window.close();
  });

  it('a second group of words: its own choices, a label only the teacher sees, the same file length (2026-11-16)', async () => {
    const page = await openMaker();
    const recordedOnly = wordlist.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const tags = () => [...page.d.querySelectorAll('#pick-chips li.chip')].map((li) => [li.querySelector('span').textContent, (li.querySelector('.chip-tag') || {}).textContent || '']);
    page.$('next-1').click();
    page.set('f-shape', '');
    page.set('f-stage', 'G1 late');
    await wait(60);
    const before = page.chips(), total = page.fileCount();
    expect(before.length).toBe(total);
    expect(tags().every(([, tag]) => tag === '')).toBe(true);
    expect(page.$('pick-labels').hidden).toBe(true);
    // Add a group: it starts as Review at the grade level before, with about a third of the file's words (3 at most).
    const k = Math.max(1, Math.min(3, Math.round(total / 3)));
    page.$('group-add').click();
    await wait(60);
    const second = page.d.querySelector('.group[data-group-index="1"]');
    expect(second.querySelector('legend').textContent).toBe('Second group');
    expect([page.$('g1-label').value, page.$('g1-stage').value, page.$('g1-sound').value, page.$('g1-shape').value, page.$('g1-count').value]).toEqual(['Review', 'G1 early', '', '', String(k)]);
    expect(page.$('g0-label').value).toBe('New');
    // The file is as long as before: k places went to the second group, and every word says which group it is from.
    const now = tags();
    expect(now.length).toBe(total);
    const review = now.filter(([, tag]) => tag === 'Review').map(([word]) => word), fresh = now.filter(([, tag]) => tag === 'New').map(([word]) => word);
    expect([fresh.length, review.length]).toEqual([total - k, k]);
    expect(new Set(now.map(([word]) => word)).size).toBe(total);
    // The second group's words are the picker's for its own choices; the first group's are the first of the list as before.
    expect(review).toEqual(builder.pickWords({ count: k, stage: 'G1 early', exclude: recordedOnly }, { wordlist, core, dictionary, seed: '1|group1' }).words);
    expect(fresh).toEqual(before.filter((word) => !review.includes(word)).slice(0, total - k));
    // Mixed through the list, not at its end.
    expect(now.slice(-k).every(([, tag]) => tag === 'Review')).toBe(k === 1 ? now[now.length - 1][1] === 'Review' : false);
    expect(page.$('pick-labels').textContent).toBe('Labels only you see: New ' + (total - k) + ', Review ' + k + '. Students see the words mixed, with no label.');
    expect(page.$('g1-said').textContent).toBe((k === 1 ? '1 word' : k + ' words') + ' in the file: ' + review.join(', ') + '.');
    // A sound for the second group only.
    page.set('g1-sound', 'sh');
    await wait(60);
    const withSh = tags().filter(([, tag]) => tag === 'Review').map(([word]) => word);
    expect(withSh.length).toBe(k);
    for (const word of withSh) expect([...dictionary.lookup(word)[0]], word).toContain('sh');
    for (const [word, tag] of tags()) if (tag === 'New') expect(before, word).toContain(word);
    // More than the file has room for: the first group keeps one word, and the page says why.
    page.$('g1-count').value = '20';
    page.$('g1-count').dispatchEvent(new page.dom.window.Event('change', { bubbles: true }));
    await wait(60);
    expect(tags().filter(([, tag]) => tag === 'New').length).toBe(1);
    expect(tags().length).toBe(total);
    expect(page.$('g1-said').textContent).toBe('The file has room for ' + (total - 1) + ' words from this group. A longer file (step 3) has room for more.');
    // Kept for next time, with the label.
    const kept = JSON.parse(page.dom.window.localStorage.getItem('alloflow-packets-maker/1'));
    expect(kept.groups).toEqual([{ label: 'Review', stage: 'G1 early', sound: 'sh', shape: '', count: 20 }]);
    expect(kept.label).toBe('New');
    // At most three groups in all; removing a group gives the list back as it was.
    page.$('group-add').click();
    await wait(60);
    expect(page.$('group-add').disabled).toBe(true);
    expect(page.d.querySelectorAll('.group')).toHaveLength(3);
    page.$('g2-remove').click();
    await wait(60);
    page.$('g1-remove').click();
    await wait(60);
    expect(page.d.querySelectorAll('.group')).toHaveLength(0);
    expect(page.chips()).toEqual(before);
    expect(tags().every(([, tag]) => tag === '')).toBe(true);
    page.dom.window.close();
  });

  it('the two wider levels pick from the words read and kept, say what they are, and are kept for next time (2026-11-16)', async () => {
    const page = await openMaker();
    const recordedOnly = wordlist.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
    const familiar = (row) => row.known || (row.zipf >= 3.8 && row.books >= 20);
    // The maker draws its words a moment after a choice changes (20 ms).
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    page.$('next-1').click();
    for (const [id, level, name, inBooks] of [['wider:challenging', 'challenging', 'More challenging words', (row) => row.books >= 10], ['wider:advanced', 'advanced', 'Advanced words', (row) => row.books < 10]]) {
      page.set('f-stage', id);
      page.set('f-shape', '');
      await wait(60);
      expect(page.$('f-stage').value).toBe(id);
      expect(page.$('f-stage').selectedOptions[0].textContent).toBe(name);
      expect(page.$('f-stage').selectedOptions[0].parentNode.label).toBe('Past the grade levels (by how rare a word is)');
      // The line under the list says where the words come from, and that no curriculum is behind them.
      expect(page.$('stage-hint').textContent).toContain('Chosen by how widely a word is used, not from a curriculum.');
      expect(page.$('stage-hint').textContent).toContain(level === 'challenging' ? 'at least 10 of the 400 children\'s books' : 'fewer than 10 of the 400 children\'s books');
      const chips = page.chips();
      expect(chips.length).toBe(page.fileCount());
      // The same words the builder gives for this level and version, and each one read, kept, unfamiliar and recorded.
      const direct = builder.pickWords({ count: chips.length, level, exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 });
      expect(chips).toEqual(direct.words);
      for (const word of chips) {
        const row = wordlist.get(word);
        expect(row.wider && !familiar(row) && row.hasClip && !row.blocked && !row.soft, word).toBe(true);
        expect(inBooks(row), word).toBe(true);
      }
      // A sound narrows it, and sounds with no word at this level are closed.
      const open = [...page.$('f-sound').querySelectorAll('optgroup option')].filter((option) => !option.disabled);
      expect(open.length).toBeGreaterThan(30);
      page.set('f-sound', 'sh');
      await wait(60);
      expect(page.chips().length).toBeGreaterThan(0);
      for (const word of page.chips()) expect([...dictionary.lookup(word)[0]], word).toContain('sh');
      page.set('f-sound', '');
      await wait(60);
    }
    // Kept in the browser, and read back on the next visit.
    expect(JSON.parse(page.dom.window.localStorage.getItem('alloflow-packets-maker/1')).stage).toBe('wider:advanced');
    // Back to a grade level: the familiar words again.
    page.set('f-stage', 'G2');
    await wait(60);
    expect(page.chips().length).toBeGreaterThan(0);
    for (const word of page.chips()) expect(familiar(wordlist.get(word)), word).toBe(true);
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
    // Fewer choices on screen (2026-11-12): the default curriculum's stages are in the list; another curriculum's (England's) wait
    // behind "Other curricula", closed, and join the list when that box is checked. (jsdom's language is en-US.)
    const usual = stages.filter((row) => row.isDefault !== false), others = stages.filter((row) => row.isDefault === false);
    expect(others.map((row) => row.id)).toEqual(['Reception', 'Year 1', 'Year 2']);
    expect([...page.$('f-stage').querySelectorAll('option')].map((option) => option.value)).toEqual(['', ...usual.map((row) => row.id), 'wider:challenging', 'wider:advanced']);
    // 2026-11-16: after the grade levels, two wider levels in a group that says they are not grade levels.
    expect([...page.$('f-stage').querySelectorAll('optgroup')].map((group) => group.label)).toEqual([...new Set(usual.map((row) => row.frameworkLabel)), 'Past the grade levels (by how rare a word is)']);
    page.$('next-1').click();
    const other = page.$('stage-other');
    expect(page.seen('stage-other') && !other.open).toBe(true);
    expect(other.querySelector('summary').textContent).toBe('Other curricula');
    expect(other.querySelector('label').textContent.trim()).toBe('Show England (National Curriculum) in the Grade level list: Reception, Year 1 and Year 2');
    expect(page.$('f-stage-other').checked).toBe(false);
    page.$('f-stage-other').click();
    expect([...page.$('f-stage').querySelectorAll('option')].map((option) => option.value)).toEqual(['', ...stages.map((row) => row.id), 'wider:challenging', 'wider:advanced']);
    expect([...page.$('f-stage').querySelectorAll('optgroup')].map((group) => group.label)).toEqual([...new Set(stages.map((row) => row.frameworkLabel)), 'Past the grade levels (by how rare a word is)']);
    expect(page.$('stage-hint').textContent).toBe('A grade level keeps to the letter patterns taught by then.');
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
      expect(page.$('stage-why').querySelector('summary').textContent, row.id).toBe('Why this grade level has these words');
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
    expect(page.fileCount()).toBeGreaterThan(0);
    expect(page.chips()).toEqual(direct.words.slice(0, page.fileCount()));
    for (const word of page.chips()) {
      expect(wordlist.get(word), word).toMatchObject({ blocked: false, nearBlocked: false, soft: false, hasClip: true, shape: 'CVC' });
      expect(wordlist.get(word).kokoro || wordlist.get(word).shards, word).toBe(true);
      expect(dictionary.lookup(word)[0][0], word).toBe('sh');
    }
    // 2026-11-14 (expanded Kokoro voicing): all /sh/ initial CVC words now have recordings (noRecording === 0),
    // so packets-make.js omits the "with no recording yet" clause when direct.reasons.noRecording === 0.
    const alsoParts = [
      direct.reasons.notFamiliarEnough + ' less common ' + (direct.reasons.notFamiliarEnough === 1 ? 'word' : 'words'),
      ...(direct.reasons.noRecording ? [direct.reasons.noRecording + ' with no recording yet'] : []),
      (direct.reasons.blocked + direct.reasons.soundsLikeABlockedWord) + ' on the list of words this tool does not use',
    ];
    expect(page.$('pick-out').textContent).toBe('Also matched, but not offered: ' + alsoParts.join(', ') + '.');
    expect(direct.reasons.britishSpellingOrWord || 0).toBe(0);
    // Another version is another mix of the same kind of words.
    page.choose('version', 'B');
    const fileOf = (words) => words.slice(0, page.fileCount());
    await page.until(() => page.chips().join() !== fileOf(direct.words).join(), 'version B');
    expect(page.chips()).toEqual(fileOf(builder.pickWords({ count: 10, targetSound: 'sh', position: 'first', shape: 'CVC', exclude: recordedOnly }, { wordlist, core, dictionary, seed: 2 }).words));
    page.choose('version', 'A');
    await page.until(() => page.chips().join() === fileOf(direct.words).join(), 'version A again');
    // A removed word is replaced by the next one, and can be put back.
    const beforeRemoval = page.chips();
    const gone = page.chips()[0];
    page.d.querySelector('button[aria-label="Remove ' + gone + '"]').click();
    expect(page.chips()).toHaveLength(page.fileCount());
    expect(page.chips()).not.toContain(gone);
    // 2026-11-16: ONLY that word goes. Every other word keeps its place and the next word in line takes the free one
    // (removing one word used to change others too, because the picker drew its mix again).
    expect(page.chips().slice(0, -1)).toEqual(beforeRemoval.slice(1));
    expect(page.chips().at(-1)).toBe(direct.words[page.fileCount()]);
    expect(page.$('pick-removed-text').textContent).toBe('You removed: ' + gone + '.');
    page.$('pick-restore').click();
    expect(page.chips()).toEqual(fileOf(direct.words));
    // Each chip has two buttons: "Edit this word" (closed) and Remove.
    for (const chip of page.$('pick-chips').children) {
      const word = chip.querySelector('span').textContent;
      expect([...chip.querySelectorAll('button')].map((button) => [button.getAttribute('aria-label'), button.getAttribute('aria-expanded')])).toEqual([['Edit this word: ' + word, 'false'], ['Remove ' + word, null]]);
    }
    expect(page.seen('pick-edit')).toBe(false);

    // Few words fit: the page says so plainly and offers the one change that gives more.
    const fewAt = (stage) => builder.pickWords({ count: 10, targetSound: 'sh', position: 'first', shape: 'CVC', stage, exclude: recordedOnly }, { wordlist, core, dictionary, seed: 1 });
    // "Few" is fewer than the file uses (2026-11-16: it was fewer than a Long file's list).
    const tight = builder.stageList().map((row) => row.id).find((id) => fewAt(id).pool >= 2 && fewAt(id).pool < page.fileCount());
    expect(tight, 'a grade level at which fewer sh words fit than the file uses').toBeTruthy();
    // It may be a grade level of another curriculum (England's Reception): those are in the list once "Other curricula" is on.
    if (![...page.$('f-stage').options].some((option) => option.value === tight)) page.$('f-stage-other').click();
    page.set('f-stage', tight);
    await page.until(() => page.$('pick-line').textContent === 'Only ' + fewAt(tight).pool + ' words fit.' && page.$('pick-loosen').querySelector('button'), 'the few-words line');
    const few = page.chips();
    expect(few).toEqual(fewAt(tight).words);
    expect(page.$('pick-sub').textContent).toMatch(/get more by loosening one choice/);
    await page.until(() => [...page.$('pick-loosen').querySelectorAll('button')].some((button) => button.textContent === 'Any grade level: ' + direct.pool + ' words fit'), 'the loosening offers');
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
    // When most words have a picture (or Only words with a picture is on), the page turns Include pictures on and asks for the
    // picture files (2026-11-14, T1). This page is not given them (see openMaker): if asked, it says so under the box and leaves it unchecked.
    const asksForPictures = used.filter((word) => PICTURE_INDEX.has(word)).length * 2 > used.length;
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
    // fan: a word with no picture in either set (pig has had an OpenMoji picture since 2026-11-12).
    page.set('f-own', 'cat fan sun');
    await page.until(() => page.$('own-line').textContent === '3 of 3 words can be used.', 'three ready words');
    expect(['cat', 'fan', 'sun'].map((word) => PICTURE_INDEX.has(word))).toEqual([true, false, true]);
    expect(page.asked).toEqual([]);
    page.$('next-2').click();
    // One box at step 3, and its one line. It is on because a word has a picture.
    const box = page.$('f-pictures');
    // (The other box of step 3, "Give students versions A, B and C in turn", is folded inside "Make one for each student".)
    // 2026-11-15: "Say the directions once per activity" (#f-directions-once) sits right beside #f-pictures in step 3.
    expect([...page.$('step-3').querySelectorAll('input[type="checkbox"]')].filter((node) => !node.closest('#batch'))).toEqual([box, page.$('f-directions-once'), page.$('f-repeat-missed')]); // 2026-11-17: and the once-more choice
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
    expect(lesson.blocks[0].items.map((item) => [item.word, item.wordPicture != null])).toEqual([['cat', true], ['fan', false], ['sun', true]]);
    expect(Object.values(lesson.images).every((uri) => /^data:image\/svg\+xml;base64,/.test(uri))).toBe(true);
    expect(Object.values(lesson.images).map((uri) => Buffer.from(uri.split(',')[1], 'base64').toString('utf8')).sort())
      .toEqual(['cat.svg', 'sun.svg'].map((file) => read('data/vendor/mulberry/symbols/' + file).trim()).sort());
    expect(manifestOf(withPictures).attributions.slice(-1)).toEqual(['Pictures: Mulberry Symbols by Steve Lee, CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/), mulberrysymbols.org']);
    expect(manifestOf(withPictures).notices.map((notice) => notice.id)).toEqual(['cmudict', 'mulberry']);
    expect(page.$('pictures-line').textContent).toBe('Pictures for 2 of 3 words. Symbols: Mulberry.');
    expect(page.$('summary-facts').textContent).toMatch(/^3 questions\. About 2 minutes\. \d+(?:\.\d)? (?:KB|MB)\.$/);
    // The page says where its pictures come from, and lists their files with the others it loads.
    expect(page.$('sources').textContent).toContain('The pictures: Mulberry Symbols by Steve Lee. License: CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0).');
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

    // No word with a picture (owner, 2026-11-12: a greyed box with no reason looked broken): the box is never switched off.
    // It starts unchecked, the line beside it says why there is no picture and what to do, and the file is the plain one.
    page.$('back-3').click();
    page.set('f-own', 'fan hen');
    await page.until(() => page.$('own-line').textContent === '2 of 2 words can be used.', 'two ready words');
    expect(['fan', 'hen'].map((word) => PICTURE_INDEX.has(word))).toEqual([false, false]);
    page.$('next-2').click();
    const NONE = 'None of these words has a picture yet. Add one with Edit this word in step 2, or choose words with pictures.';
    // The box was clicked off and on above: the teacher's last choice (on) is kept.
    expect(box.disabled).toBe(false);
    expect(box.checked).toBe(true);
    expect(page.$('pictures-line').textContent).toBe(NONE);
    await ready(page);
    expect(page.built()).not.toContain('Mulberry');
    const plainNone = page.built();
    // Clicked, it changes, and stays changed: unchecked, then checked again. The file stays the plain one, and the line still says why.
    const was = box.checked;
    box.click();
    expect(box.checked).toBe(!was);
    await page.until(() => !page.seen('summary'), 'the old file to go');
    await ready(page);
    expect(box.checked).toBe(!was);
    box.click();
    expect(box.checked).toBe(was);
    await page.until(() => !page.seen('summary'), 'the old file to go');
    await ready(page);
    expect(box.checked).toBe(was);
    expect(page.built()).toBe(plainNone);
    expect(page.$('pictures-line').textContent).toBe(NONE);
    // The box is a real checkbox inside its label (no overlay), so a tap on the words works in Safari too.
    expect(box.closest('label.radio').firstElementChild).toBe(box);
    expect(box.type).toBe('checkbox');
    expect(page.w.localStorage.length).toBe(1);
    expect(JSON.parse(page.w.localStorage.getItem('alloflow-packets-maker/1'))).not.toHaveProperty('pictures');
    page.dom.window.close();

    // The picture files do not arrive: the page says so, the box goes off, the plain file is made. Checking the box tries again.
    const poor = await openMaker({ pictures: true });
    poor.noPictures = true;
    for (const one of poor.d.querySelectorAll('.strand input')) if (one.checked !== (one.value === 'isolation')) one.click();
    poor.$('next-1').click();
    poor.choose('mode', 'own');
    poor.set('f-own', 'cat fan sun');
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
    // 2026-11-14 (R1-23K): all usable 2-10 letter dictionary words with a vowel now have a clip (fuzz is in word_audio_shards/); 9 words (bail, din, ...) are in the app's recorded bank only (kokoro: false, shards: false), so on the maker page they have no recording.
    expect(wordlist.get('fuzz')).toMatchObject({ blocked: false, shards: true, hasClip: true });
    expect(wordlist.get('din')).toMatchObject({ blocked: false, recorded: true, kokoro: false, shards: false });
    expect(wordlist.get('bail')).toMatchObject({ recorded: true, kokoro: false });
    page.set('f-own', 'cat, Gun din\nblorp bail x1 map cat');
    await page.until(() => page.$('own-list').children.length === 7, 'the checked words');
    const rows = Object.fromEntries([...page.$('own-list').children].map((row) => [row.querySelector('.w').textContent, { text: row.querySelector('.s').textContent, ok: row.className === 'is-ok' }]));
    expect(Object.keys(rows)).toEqual(['cat', 'gun', 'din', 'blorp', 'bail', 'x1', 'map']);
    expect(rows.cat).toEqual({ ok: true, text: 'Ready. 3 sounds: k, a, t.' });
    expect(rows.map.ok).toBe(true);
    expect(rows.gun).toEqual({ ok: false, text: 'Left out. It is on the list of words this tool does not use. That list is a first pass and can be too cautious.' });
    expect(rows.din).toEqual({ ok: false, text: 'No recording yet. Record it yourself, or choose another word.' });
    expect(rows.bail).toEqual({ ok: false, text: 'No recording yet. Record it yourself, or choose another word.' });
    expect(rows.blorp).toEqual({ ok: false, text: 'Not in the sound dictionary. Set its sounds to use it, or check the spelling.' });
    // The words that a teacher can fix have "Edit this word" (closed); a blocked word and a word that is not a practice word do not.
    const edits = Object.fromEntries([...page.$('own-list').children].map((row) => [row.querySelector('.w').textContent, row.querySelector('.e button')?.getAttribute('aria-expanded') ?? null]));
    expect(edits).toEqual({ cat: 'false', gun: null, din: 'false', blorp: 'false', bail: 'false', x1: null, map: 'false' });
    expect(page.d.querySelectorAll('#own-list .wp')).toHaveLength(0);
    // 2026-11-16: 15 letters (10 until then), so that long words can be typed for spelling practice.
    expect(rows.x1).toEqual({ ok: false, text: 'Not used. A practice word is 2 to 15 letters, letters only, with a vowel.' });
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
    for (const word of ['gun', 'din', 'blorp', 'bail']) expect(JSON.stringify(lessonOf(html).blocks)).not.toContain('"' + word + '"');

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
    expect(kept).toEqual({ v: 1, activities: ['isolation', 'blending', 'segmentation'], mode: 'pick', sound: 'ch', position: 'any', shape: 'CVC', stage: '', own: '', version: 'C', length: 'regular',
      // 2026-11-13: and which letters Letter Trace traces (capital, then lowercase, by default), and (later that day) how
      // many choices a board shows (Choices: Medium by default; tests/packets_ws_fixes_2026_11_13b.test.js).
      // 2026-11-15: spoken directions (#f-directions-once) and the resolved word list for Present & Export (#from-word-sounds).
      count: 10, hand: false, chosen: [], choices: 'medium', tracing: 'both', directionsOnce: false, repeatMissed: false,
      // 2026-11-16: whether the page picks the most common words or a random set ("Pick different words"), which
      // set, and the file's title for Present or export slides.
      order: 'common', shuffle: 0, title: expect.any(String),
      words: expect.any(Array),
      // 2026-11-16 (later): the mix by number of sounds, the teacher's label for the first group, and the further groups.
      spread: false, label: 'New', groups: [] });
    expect(kept.words.length).toBe(7);
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
    // 2026-11-14 (R1): fixed sound banks total ~14.5 MB ("about 15 MB") after 64 kbps fp32 re-voicing.
    expect(page.$('sounds-note').textContent).toBe('The next step gets the sounds: about 15 MB one time, plus up to about ' + upTo(3 * flagged.meta.wordAudio.largestFileBytes) + ' MB for these words.');
    expect(page.asked).toEqual([]);
    page.$('next-2').click();
    await ready(page);
    expect(page.seen('summary') && !page.seen('build-problem')).toBe(true);
    // The five sound files, the index, then one request for each file that holds one of the words: two files for three words.
    // 2026-11-14 (T1): Include pictures turns on automatically only when most chosen words have a picture (or Only words with a picture is checked).
    const asksForPictures = ['cat', W1, W2, W3].filter((word) => PICTURE_INDEX.has(word)).length * 2 > 4;
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
    expect(page.fileCount()).toBeGreaterThan(0);
    expect(page.chips()).toEqual(listed.slice(0, page.fileCount()));
    expect(listed.slice(0, 10)).toEqual(direct.words);
    const needed = listed.filter((word) => STORE_WORDS.includes(word));
    expect(needed.length).toBeGreaterThanOrEqual(inStore.length);
    // 2026-11-14 (R1): fixed sound banks total ~14.5 MB ("about 15 MB") after 64 kbps fp32 re-voicing.
    expect(page.$('sounds-note').textContent).toBe('The next step gets the sounds: about 15 MB one time, plus up to about ' + upTo(Math.min(needed.length * flagged.meta.wordAudio.largestFileBytes, flagged.meta.wordAudio.bytes)) + ' MB for these words.');
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
    // 2026-11-14 (R1): fixed sound banks total ~14.5 MB ("about 15 MB") after 64 kbps fp32 re-voicing.
    expect(bare.$('sounds-note').textContent).toBe('The next step gets the sounds: about 15 MB one time, plus the sounds for these words.');
    bare.dom.window.close();
  });
});

// ---------------------------------------------------------------------------
// Words the picker leaves to the teacher, and the line for kindergarten
// ---------------------------------------------------------------------------
describe('the maker: borderline words and the kindergarten line', () => {
  const TYPED_ONLY = 'Not offered by the picker. Used because you typed it.';
  const K_LINE = "Common Core places sh, ch and th in grade 1. Choose 'Any grade level' to use them earlier.";

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
    expect(page.chips()).toEqual(direct.words.slice(0, page.fileCount()));
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
    expect(doc.querySelector('#f-stage option[value=""]').textContent).toBe('Any grade level');
    expect(read('packets-make.js')).toContain("label: 'Any grade level'");
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
    page.$('f-stage-other').click();
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

  it('step 2 keeps fewer choices on screen: England\'s stages, the counts and the code-name tip wait behind closed boxes', async () => {
    const SPELL = 'For spelling, choose a grade level: your students then spell only patterns they have been taught.';
    const page = await openMaker();
    // Spelling with "Any stage": one short line suggests a stage, and it goes when a stage is chosen.
    const spelling = [...page.d.querySelectorAll('.strand input')].find((box) => core.activityStrand(box.value) === 'spelling');
    expect(spelling, 'a Spelling activity on offer').toBeTruthy();
    for (const box of page.d.querySelectorAll('.strand input')) if (box.checked !== (box === spelling)) box.click();
    page.$('next-1').click();
    expect(page.seen('step-2')).toBe(true);
    expect(page.seen('stage-spell-note')).toBe(true);
    expect(page.$('stage-spell-note').textContent).toBe(SPELL);
    expect(page.$('f-stage').getAttribute('aria-describedby')).toBe('stage-hint stage-spell-note');
    page.set('f-stage', 'G1 early');
    expect(page.seen('stage-spell-note')).toBe(false);
    expect(page.$('f-stage').getAttribute('aria-describedby')).toBe('stage-hint');
    page.set('f-stage', '');
    // The words also matched but not offered: counted, behind "Why not more words?", closed.
    await page.until(() => page.chips().length > 0, 'the words');
    const why = page.$('pick-out-box');
    expect(page.seen('pick-out-box') && !why.open).toBe(true);
    expect(why.querySelector('summary').textContent).toBe('Why not more words?');
    expect(why.contains(page.$('pick-out'))).toBe(true);
    expect(page.$('pick-out').textContent).toMatch(/^Also matched, but not offered: /);
    // England's stages: closed behind "Other curricula" for en-US; chosen and then taken away, the stage goes back to "Any stage".
    expect(page.$('f-stage').querySelector('option[value="Year 1"]')).toBeNull();
    page.$('f-stage-other').click();
    page.set('f-stage', 'Year 1');
    expect(page.$('f-stage').value).toBe('Year 1');
    page.$('f-stage-other').click();
    expect(page.$('f-stage').value).toBe('');
    expect(page.$('f-stage').querySelector('option[value="Year 1"]')).toBeNull();
    // The hint for typed words says what is true of names: lower-cased, many common first names are on the list, and a word the
    // dictionary does not have can be given its sounds and a recording.
    const hint = page.$('own-hint').textContent;
    expect(hint).toContain('Many common first names are left out.');
    expect(hint).toContain('A word the sound dictionary does not have can be used once you give it its sounds and a recording with Edit this word.');
    expect(hint).not.toContain('including names');
    page.choose('mode', 'own');
    page.set('f-own', 'Maria Cat zorblat');
    await page.until(() => page.$('own-list').children.length === 3, 'the checked words');
    const rows = Object.fromEntries([...page.$('own-list').children].map((row) => [row.querySelector('.w').textContent, row.querySelector('.s').textContent]));
    expect(Object.keys(rows)).toEqual(['maria', 'cat', 'zorblat']);
    expect(wordlist.isBlocked('maria')).toBe(true);
    expect(rows.maria).toMatch(/^Left out\. It is on the list of words this tool does not use\./);
    expect(rows.cat).toBe('Ready. 3 sounds: k, a, t.');
    expect(rows.zorblat).toBe('Not in the sound dictionary. Set its sounds to use it, or check the spelling.');
    expect([...page.$('own-list').children][2].querySelector('button').textContent).toBe('Edit this word');
    page.dom.window.close();
    // A browser that says en-GB sees England's stages in the list from the start.
    const british = await openMaker({ before: (w) => Object.defineProperty(w.navigator, 'language', { value: 'en-GB', configurable: true }) });
    british.$('next-1').click();
    expect(british.$('f-stage').querySelector('option[value="Year 1"]')).toBeTruthy();
    expect(british.$('f-stage-other').checked).toBe(true);
    british.dom.window.close();
    // After saving: the code-name tip is one closed box, and step 3 of "What to do next" links to Add up results.
    const doc = parse('packets-make.html');
    const tip = doc.getElementById('learner-tip');
    expect(tip.tagName === 'DETAILS' && !tip.hasAttribute('open') && tip.closest('#after-save')).toBeTruthy();
    expect(tip.querySelector('summary').textContent).toBe("Fill in a student's code name for them");
    expect([...doc.querySelectorAll('#after-save ol a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['Add up results', 'packets-results.html']]);
    expect(doc.querySelector('#after-save ol').textContent).toContain('presses the main button at the end, Save results as a spreadsheet file (CSV).');
  });
});

// ---------------------------------------------------------------------------
// Choosing the words by hand, and any number of words (owner, 2026-11-12)
// ---------------------------------------------------------------------------
const KEY = 'alloflow-packets-maker/1';
const RECORDED_ONLY = wordlist.rows().filter((row) => row.hasClip && !row.kokoro && !row.shards).map((row) => row.word);
const pickedFor = (criteria, seed = 1) => builder.pickWords({ exclude: RECORDED_ONLY, ...criteria }, { wordlist, core, dictionary, seed });
const openList = (page) => { const box = page.$('pick-list'); box.open = true; box.dispatchEvent(new page.w.Event('toggle')); };
const listRows = (page) => [...page.$('word-list').querySelectorAll('li.wl')].map((row) => {
  const box = row.querySelector('input[type="checkbox"]');
  return { word: box.value, checked: box.checked, disabled: box.disabled, typed: row.classList.contains('is-typed'), facts: row.querySelector('.wl-facts').textContent, edit: !!row.querySelector('button.wl-edit') };
});
const find = async (page, text) => {
  page.set('f-find', text);
  await page.until(() => listRows(page).every((row) => row.word.includes(text)) && listRows(page).some((row) => row.word.includes(text)), 'the list to show ' + text);
};
const checkWordIn = async (page, word) => {
  await find(page, word);
  const box = [...page.$('word-list').querySelectorAll('input[type="checkbox"]')].find((node) => node.value === word);
  box.click();
  return box;
};

describe('the maker: choose the words yourself, and any number of words', () => {
  it('the list is closed by default and holds every word that fits, A to Z, with its sounds and whether it has a picture', async () => {
    const page = await openMaker();
    page.$('next-1').click();
    await page.until(() => page.chips().length > 0, 'the default words');
    // The quick path is the same as before: the picker's ten words, and one closed box under them.
    const direct = pickedFor({ count: 10, shape: 'CVC' });
    expect(page.fileCount()).toBe(7);
    expect(page.chips()).toEqual(direct.words.slice(0, 7));
    const box = page.$('pick-list');
    expect(box.tagName).toBe('DETAILS');
    expect(box.open).toBe(false);
    expect(box.querySelector('summary').textContent).toBe('Choose the words yourself');
    expect(page.$('word-list').children).toHaveLength(0);
    openList(page);
    // Every word the picker would offer for these choices (CVC, any stage), A to Z; the first 100 are drawn, and the rest on request.
    const pool = pickedFor({ count: 100000, shape: 'CVC' }).words.slice().sort();
    expect(pool.length).toBe(direct.pool);
    expect(pool.length).toBeGreaterThan(200);
    // 2026-11-16: the words of the file come first, checked, then the rest A to Z (none of the chosen words used to be
    // in the first 100 rows).
    const fileFirst = direct.words.slice(0, 7);
    const ordered = [...fileFirst, ...pool.filter((word) => !fileFirst.includes(word))];
    expect(listRows(page).map((row) => row.word)).toEqual(ordered.slice(0, 100));
    expect(page.seen('list-more-row')).toBe(true);
    expect(page.$('list-more-said').textContent).toBe('Showing 100 of ' + pool.length + '.');
    expect(page.$('word-list').getAttribute('aria-label')).toBe('Words to choose from: ' + pool.length + ' words');
    page.$('list-more').click();
    expect(listRows(page).map((row) => row.word)).toEqual(ordered.slice(0, 200));
    expect(page.d.activeElement.value).toBe(ordered[100]);
    // Until a box changes, the boxes show the picker's words for the length chosen (Regular: 7 words with three activities).
    const regular = direct.words.slice(0, 7);
    expect(page.$('list-said').textContent).toBe('Chosen for you: the 7 words a Regular file uses. Check or uncheck a word to choose the words yourself.');
    for (const row of listRows(page)) expect(row.checked, row.word).toBe(regular.includes(row.word));
    // Each row: a real checkbox in its label, named by the word, described by its facts.
    for (const node of page.$('word-list').querySelectorAll('li.wl')) {
      const input = node.querySelector('input');
      expect(input.closest('label').textContent.trim()).toBe(input.value);
      expect(page.$(input.getAttribute('aria-describedby'))).toBe(node.querySelector('.wl-facts'));
    }
    // Search: letters in the word. The facts: its sounds, and a picture where the symbol index has one.
    await find(page, 'cat');
    const cat = listRows(page).find((row) => row.word === 'cat');
    expect(cat.facts).toBe('3 sounds: k, a, t. Has a picture.');
    for (const row of listRows(page)) expect(row.facts, row.word).toBe(core.dictionarySounds(row.word).sounds.length + ' sounds: ' + core.dictionarySounds(row.word).sounds.map((label) => ({ oo_short: 'short oo', dh: 'th (voiced)', schwa: 'schwa (uh)' })[label] || label).join(', ') + '.' + (PICTURE_INDEX.has(row.word) ? ' Has a picture.' : ''));
    // Only words with a picture.
    page.set('f-find', '');
    page.$('f-only-pictures').click();
    await page.until(() => listRows(page).length > 0 && listRows(page).every((row) => PICTURE_INDEX.has(row.word)), 'only words with a picture');
    const withPicture = ordered.filter((word) => PICTURE_INDEX.has(word));
    expect(listRows(page).map((row) => row.word)).toEqual(withPicture.slice(0, 100));
    expect(page.$('word-list').getAttribute('aria-label')).toBe('Words to choose from: ' + withPicture.length + ' of ' + pool.length + ' shown');
    page.$('f-only-pictures').click();
    // A filter above changes the list to the words that fit it.
    page.set('f-sound', 'sh');
    await page.until(() => listRows(page).length && listRows(page).every((row) => Array.from(dictionary.lookup(row.word)[0]).includes('sh')), 'the sh words');
    // The file's words first here too, then the rest A to Z.
    const shPicked = pickedFor({ count: 100000, shape: 'CVC', targetSound: 'sh', position: 'any' }).words;
    const shFirst = shPicked.slice(0, page.fileCount());
    expect(listRows(page).map((row) => row.word)).toEqual([...shFirst, ...shPicked.slice().sort().filter((word) => !shFirst.includes(word))].slice(0, 100));
    expect(page.$('word-list').querySelectorAll('button')).toHaveLength(0);
    page.dom.window.close();
  });

  it('checked words and typed words make one list: the file has exactly those, in the order checked, and the same choices give the same file', async () => {
    const page = await openMaker();
    page.$('next-1').click();
    await page.until(() => page.chips().length > 0, 'the default words');
    openList(page);
    const pool = pickedFor({ count: 100000, shape: 'CVC' }).words.slice().sort();
    // Clear: nothing is chosen, the page says so and does not go on.
    page.$('list-clear').click();
    expect(page.chips()).toEqual([]);
    expect(page.$('list-said').textContent).toBe('Every box is unchecked. No words are chosen. Check words in the list, or press Pick for me again.');
    expect(page.$('pick-sub').textContent).toBe('No words are chosen yet. Open Choose the words yourself to check some, or press Pick for me again there.');
    expect(listRows(page).some((row) => row.checked)).toBe(false);
    page.$('next-2').click();
    expect(page.seen('step-2')).toBe(true);
    expect(page.$('step-2-problem').textContent).toBe('None of the words you chose can be used yet. Check words in Choose the words yourself, or press Pick for me again there.');
    // Choose all: the first 40 in the list's order, and the page says how many were left out and why. A 41st is refused, in words.
    page.$('list-all').click();
    expect(page.chips()).toEqual(pool.slice(0, 40));
    expect(page.$('list-said').textContent).toBe('Added 40 words, in the order of the list. A file has at most 40 words, so ' + (pool.length - 40) + ' other words were not added. You chose 40 words. The file uses all of them, in the order you checked them.');
    const extra = [...page.$('word-list').querySelectorAll('input')].find((node) => !node.checked && !node.disabled);
    extra.click();
    expect(extra.checked).toBe(false);
    expect(page.$('list-said').textContent).toMatch(/^A file has at most 40 words\. Uncheck one to add another\. /);
    expect(page.chips()).toHaveLength(40);
    page.$('list-clear').click();
    // Three words checked, not in A to Z order.
    const three = [pool[150], pool[3], pool[60]];
    for (const word of three) expect((await checkWordIn(page, word)).checked).toBe(true);
    expect(page.chips()).toEqual(three);
    // Two typed words join the same list: a word the picker does not offer (shallow), and one it does (pin, typed again).
    // A word with no recording and a blocked word are listed with their reasons, and cannot be checked.
    expect(pool).not.toContain('shallow');
    const typedPin = pool.includes('pin') && !three.includes('pin') ? 'pin' : pool.find((word) => !three.includes(word) && word.length === 3);
    page.set('f-find', '');
    // 2026-11-14 (R1-23K): din is recorded-only (kokoro: false, shards: false), so it has no recording on the maker page.
    page.set('f-add', 'Shallow ' + typedPin + ' din gun');
    page.$('add-words').click();
    expect(page.$('f-add').value).toBe('');
    expect(page.$('list-said').textContent).toBe('Added and checked: shallow, ' + typedPin + '. Not usable yet: din. It joins your list once it has what the note beside it asks for. Not used: gun. The note beside each says why. '
      + 'You chose 5 words. The file uses all of them, in the order you checked them.');
    expect(page.chips()).toEqual([...three, 'shallow', typedPin]);
    await page.until(() => listRows(page).length && listRows(page)[0].word === 'shallow', 'the typed words first');
    const typed = listRows(page).slice(0, 4);
    expect(typed.map((row) => [row.word, row.typed, row.checked, row.disabled, row.edit])).toEqual([
      ['shallow', true, true, false, false], [typedPin, true, true, false, false], ['din', true, false, true, true], ['gun', true, false, true, false]]);
    expect(typed[0].facts).toMatch(/^You typed it\. Ready\. \d sounds: /);
    expect(typed[2].facts).toBe('You typed it. No recording yet. Record it yourself, or choose another word.');
    expect(typed[3].facts).toMatch(/^You typed it\. Left out\. It is on the list of words this tool does not use\./);
    // A typed word is listed once, as typed, and they are the same words as in "Type my own words".
    expect(listRows(page).filter((row) => row.word === typedPin)).toHaveLength(1);
    expect(page.$('f-own').value).toBe('shallow ' + typedPin + ' din gun');
    expect(page.$('pick-sub').textContent).toBe('You chose 5 words yourself. The file uses all of them, in this order.');
    expect(page.$('pick-list-line').textContent).toBe('Choose the words yourself: 5 words chosen');
    // Unchecking a word takes it out; the chip's Remove does the same. Nothing takes its place.
    const gone = three[1];
    await checkWordIn(page, gone);
    expect(page.chips()).toEqual([three[0], three[2], 'shallow', typedPin]);
    page.d.querySelector('button[aria-label="Remove ' + typedPin + '"]').click();
    expect(page.chips()).toEqual([three[0], three[2], 'shallow']);
    await checkWordIn(page, typedPin);
    await checkWordIn(page, gone);
    const order = [three[0], three[2], 'shallow', typedPin, gone];
    expect(page.chips()).toEqual(order);
    // Each chosen word keeps "Edit this word".
    for (const chip of page.$('pick-chips').children) expect(chip.querySelector('button.chip-edit').getAttribute('aria-label')).toBe('Edit this word: ' + chip.querySelector('span').textContent);
    // Step 3: the count follows the selection, said in one line in place of the lengths.
    page.$('next-2').click();
    expect(page.seen('step-3')).toBe(true);
    expect(page.seen('length-hand') && !page.seen('length-radios') && !page.seen('count-field')).toBe(true);
    expect(page.$('length-hand').textContent).toBe('You chose 5 words yourself, so the file has all of them: about 15 questions, about 8 minutes. To set a length instead, go back to step 2 and press Pick for me again.');
    expect(page.$('f-title').value).toBe('Word Sounds: chosen words, version A');
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    const html = page.built(), lesson = lessonOf(html), manifest = manifestOf(html);
    // The builder is handed exactly these words in this order; every activity keeps the order (a word an activity cannot use is listed under Left out).
    for (const block of lesson.blocks) { const got = block.items.map((item) => item.word); expect(got).toEqual(order.filter((word) => got.includes(word))); }
    expect(lesson.blocks[0].items.map((item) => item.word)).toEqual(order);
    expect(manifest.builder.words).toBe(5);
    expect(page.$('sum-words').textContent).toBe('5 words: ' + order.join(', ') + '.');
    expect(page.$('summary-facts').textContent).toMatch(new RegExp('^' + manifest.builder.items + ' questions\\. '));
    expect(audit(html)).toEqual([]);
    // Kept in this browser: the words, in order.
    const kept = JSON.parse(page.w.localStorage.getItem(KEY));
    expect(kept).toMatchObject({ hand: true, chosen: order, own: 'shallow ' + typedPin + ' din gun' });
    page.dom.window.close();
    // The same choices on another visit: the same list, and byte for byte the same file.
    const again = await openMaker({ before: (w) => w.localStorage.setItem(KEY, JSON.stringify(kept)) });
    again.$('next-1').click();
    await again.until(() => again.chips().length === 5, 'the kept words');
    expect(again.chips()).toEqual(order);
    again.$('next-2').click();
    await ready(again);
    expect(again.built()).toBe(html);
    // Pick for me again: the picker's words come back, and so do the lengths.
    again.$('back-3').click();
    openList(again);
    again.$('list-again').click();
    expect(again.chips()).toEqual(pickedFor({ count: 10, shape: 'CVC' }).words.slice(0, 7));
    expect(again.$('list-said').textContent).toBe('The page picks the words again. Chosen for you: the 7 words a Regular file uses. Check or uncheck a word to choose the words yourself.');
    again.$('next-2').click();
    expect(again.seen('length-radios') && !again.seen('length-hand')).toBe(true);
    again.dom.window.close();
  });

  it('Custom: any number of words from 1 to 40, the estimates follow it, and above 40 the page says what it uses', async () => {
    const page = await openMaker();
    for (const box of page.d.querySelectorAll('.strand input')) if (box.checked !== ['isolation', 'blending'].includes(box.value)) box.click();
    page.$('next-1').click();
    await page.until(() => page.chips().length > 0, 'the default words');
    page.$('next-2').click();
    await ready(page);
    // Four lengths: the three presets and Custom. Since 2026-11-16 "How many words" is always shown (it sits in
    // step 3 while step 3 is open) with the number the file uses now; typing in it makes the length Custom.
    expect([...page.d.querySelectorAll('input[name="length"]')].map((radio) => radio.value)).toEqual(['short', 'regular', 'long', 'custom']);
    expect(page.$('count-home-3').contains(page.$('count-field'))).toBe(true);
    expect(page.$('count-field').hidden).toBe(false);
    expect(page.$('f-count').value).toBe(String(lessonOf(page.built()).blocks[0].items.length));
    expect(page.d.querySelector('[data-length="custom"]').textContent).toBe('Choose the number of words, up to 40.');
    expect(page.$('count-hint').textContent).toBe('From 1 to 40. A file has at most 40 questions in each activity, one for each word.');
    expect(page.$('f-count').getAttribute('min')).toBe('1');
    expect(page.$('f-count').getAttribute('max')).toBe('40');
    expect(page.$('f-count').closest('.field').querySelector('label').getAttribute('for')).toBe('f-count');
    page.choose('length', 'custom');
    expect(page.seen('count-field')).toBe(true);
    expect(page.$('f-count').value).toBe('10');
    expect(page.d.querySelector('[data-length="custom"]').textContent).toBe('10 words, about 20 questions, about 10 minutes.');
    await page.until(() => !page.seen('summary'), 'the old file to go');
    await ready(page);
    const words = (html) => lessonOf(html).blocks[0].items.map((item) => item.word);
    const forCount = (n) => pickedFor({ count: n, shape: 'CVC' }).words;
    expect(words(page.built())).toEqual(forCount(10));
    // More than Long (15 words with two activities): the picker lists more, and the first words stay the same.
    page.set('f-count', '33');
    expect(page.d.querySelector('[data-length="custom"]').textContent).toBe('33 words, about 66 questions, about 33 minutes.');
    expect(page.$('count-said').textContent).toBe('');
    await page.until(() => page.seen('summary') && words(page.built()).length === 33, 'the 33-word file');
    expect(words(page.built())).toEqual(forCount(33));
    expect(forCount(33).slice(0, 10)).toEqual(forCount(10));
    expect(lessonOf(page.built()).blocks.map((block) => block.items.length)).toEqual([33, 33]);
    expect(page.$('summary-facts').textContent).toMatch(/^66 questions\. About 33 minutes\. /);
    // Above 40: said, never silent; the file has 40.
    page.set('f-count', '55');
    expect(page.$('count-said').textContent).toBe('40 is the most, so the file uses 40 words.');
    // 2026-11-16: and the box itself shows 40, not the number typed.
    expect(page.$('f-count').value).toBe('40');
    expect(page.d.querySelector('[data-length="custom"]').textContent).toBe('40 words, about 80 questions, about 40 minutes.');
    await page.until(() => page.seen('summary') && words(page.built()).length === 40, 'the 40-word file');
    expect(words(page.built())).toEqual(forCount(40));
    // Not a number: said, and the file stays as it was.
    page.set('f-count', '0');
    expect(page.$('count-said').textContent).toBe('Type a whole number from 1 to 40.');
    page.set('f-count', '2.5');
    expect(page.$('count-said').textContent).toBe('Type a whole number from 1 to 40.');
    expect(JSON.parse(page.w.localStorage.getItem(KEY))).toMatchObject({ length: 'custom', count: 40 });
    page.$('f-count').dispatchEvent(new page.w.Event('blur'));
    expect(page.$('f-count').value).toBe('40');
    // Typed words: Custom takes the first of them, and says what was not needed.
    page.$('back-3').click();
    page.choose('mode', 'own');
    page.set('f-own', 'cat map pig sun hen');
    await page.until(() => page.$('own-line').textContent === '5 of 5 words can be used.', 'five ready words');
    page.$('next-2').click();
    page.set('f-count', '3');
    expect(page.d.querySelector('[data-length="custom"]').textContent).toBe('3 words, about 6 questions, about 3 minutes.');
    await page.until(() => page.seen('summary') && words(page.built()).length === 3, 'the 3-word file');
    expect(words(page.built())).toEqual(['cat', 'map', 'pig']);
    expect(page.$('sum-out').textContent).toBe('2 words not needed for a Custom file: sun, hen. A longer file uses more.');
    page.set('f-count', '9');
    expect(page.d.querySelector('[data-length="custom"]').textContent).toBe('5 words, about 10 questions, about 5 minutes. You have 5 words.');
    page.dom.window.close();
  });

  it('Include pictures, with no picture among the words: usable, unchecked, and the reason beside it; the list can show only words with a picture', async () => {
    const page = await openMaker({ pictures: true });
    for (const box of page.d.querySelectorAll('.strand input')) if (box.checked !== (box.value === 'isolation')) box.click();
    page.$('next-1').click();
    page.choose('mode', 'own');
    page.set('f-own', 'fan hen');
    await page.until(() => page.$('own-line').textContent === '2 of 2 words can be used.', 'two ready words');
    page.$('next-2').click();
    const box = page.$('f-pictures');
    expect(box.disabled).toBe(false);
    expect(box.checked).toBe(false);
    expect(page.$('pictures-line').textContent).toBe('None of these words has a picture yet. Add one with Edit this word in step 2, or choose words with pictures.');
    await ready(page);
    const plain = page.built();
    // Checked anyway: it stays checked, the file is the plain one, and the picture files are not asked for (nothing would use them).
    box.click();
    expect(box.checked).toBe(true);
    await page.until(() => !page.seen('summary'), 'the old file to go');
    await ready(page);
    expect(box.checked).toBe(true);
    expect(page.built()).toBe(plain);
    expect(page.asked.filter((url) => PICTURE_URLS.includes(url))).toEqual([]);
    // Back in step 2: choose words in the list, only words with a picture. The box is then on its own, and the file has the pictures.
    page.$('back-3').click();
    page.choose('mode', 'pick');
    await page.until(() => page.chips().length > 0, 'the picker');
    openList(page);
    page.$('list-clear').click();
    page.$('f-only-pictures').click();
    await page.until(() => listRows(page).length > 0 && listRows(page).every((row) => PICTURE_INDEX.has(row.word)), 'only words with a picture');
    const two = listRows(page).slice(0, 2).map((row) => row.word);
    for (const input of [...page.$('word-list').querySelectorAll('input')].slice(0, 2)) input.click();
    expect(page.chips()).toEqual(two);
    page.$('next-2').click();
    expect(page.$('pictures-line').textContent).toBe('Pictures for 2 of 2 words. Symbols: Mulberry.');
    await ready(page);
    const shownItems = lessonOf(page.built()).blocks[0].items;
    expect(shownItems.length).toBeGreaterThan(0);
    expect(shownItems.every((item) => two.includes(item.word) && item.wordPicture != null)).toBe(true);
    page.dom.window.close();
    // The list of pictures did not load: said, in place of a dead box.
    const bare = await openMaker({ sources: { 'word_sounds_symbols_en.js': '/* not loaded */' } });
    bare.$('next-1').click();
    await bare.until(() => bare.chips().length > 0, 'the default words');
    bare.$('next-2').click();
    expect(bare.$('f-pictures').disabled).toBe(false);
    expect(bare.$('pictures-line').textContent).toBe('The list of pictures did not load, so only pictures you added can be used. Load the page again to get the list.');
    bare.dom.window.close();
  });

  // 2026-11-14 (T1): Stage first in Step 2, Include pictures auto-on only when most words have a picture (or Only words with a picture), and >= 10 MB size warning.
  it('places Stage first in step 2, auto-enables Include pictures only when most words have pictures, and warns on >= 10 MB files', async () => {
    const makerDoc = parse('packets-make.html');
    // 2026-11-16: Grade level is the one choice on show; the sound, where it is and the pattern wait under More options.
    const step2Selects = [...makerDoc.querySelectorAll('#step-2 .fields select')].map((s) => s.id);
    expect(step2Selects).toEqual(['f-stage', 'f-sound', 'f-position', 'f-shape']);
    expect(makerDoc.getElementById('f-stage').closest('details')).toBeNull();
    expect(makerDoc.querySelector('label[for="f-stage"]').textContent).toBe('Grade level');
    for (const id of ['f-sound', 'f-position', 'f-shape']) expect(makerDoc.getElementById(id).closest('details').id, id).toBe('more-2');
    expect(makerDoc.querySelector('header .top-link').textContent).toBe('Add up results');
    expect(makerDoc.querySelector('header .top-link').getAttribute('href')).toBe('packets-results.html');

    // Minority with picture (1 of 4): auto-off.
    const usable = wordlist.rows().filter((r) => (r.kokoro || r.shards) && !r.borderline && /^[a-z]{3,5}$/.test(r.word)).map((r) => r.word);
    const noPicWords = usable.filter((w) => !PICTURE_INDEX.has(w)).slice(0, 4);
    const yesPicWords = usable.filter((w) => PICTURE_INDEX.has(w)).slice(0, 4);
    expect(noPicWords.length).toBeGreaterThanOrEqual(3);
    expect(yesPicWords.length).toBeGreaterThanOrEqual(3);

    const page = await openMaker({ pictures: true });
    for (const box of page.d.querySelectorAll('.strand input')) if (box.checked !== (box.value === 'isolation')) box.click();
    page.$('next-1').click();
    page.choose('mode', 'own');
    page.set('f-own', [yesPicWords[0], noPicWords[0], noPicWords[1], noPicWords[2]].join(' '));
    await page.until(() => page.$('own-line').textContent === '4 of 4 words can be used.', 'minority picture words');
    page.$('next-2').click();
    await ready(page);
    expect(page.$('f-pictures').checked).toBe(false);
    expect(page.$('size-warn').hidden).toBe(true);

    // Majority with picture (3 of 4): auto-turns Include pictures on!
    page.$('back-3').click();
    page.set('f-own', [yesPicWords[0], yesPicWords[1], yesPicWords[2], noPicWords[0]].join(' '));
    await page.until(() => page.$('own-line').textContent === '4 of 4 words can be used.', 'majority picture words');
    page.$('next-2').click();
    await ready(page);
    expect(page.$('f-pictures').checked).toBe(true);

    // >= 10 MB built file shows #size-warn with plain advice.
    const realBuild = page.w.AlloPacketBuilder.buildPacket;
    page.w.AlloPacketBuilder.buildPacket = async (opts) => {
      const out = await realBuild(opts);
      const huge = out.html + '<!--' + 'x'.repeat(10_100_000) + '-->';
      return { ...out, html: huge, bytes: Buffer.byteLength(huge, 'utf8') };
    };
    try {
      page.choose('length', 'short');
      await page.until(() => !page.seen('summary'), 'rebuild start');
      await ready(page);
      expect(page.seen('size-warn')).toBe(true);
      expect(page.$('size-warn').textContent).toContain('This file is over 10 MB');
    } finally {
      page.w.AlloPacketBuilder.buildPacket = realBuild;
      page.dom.window.close();
    }
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
    expect(frame.getAttribute('title')).toBe('The file a student gets');
    expect(good.d.getElementById('try-problem').hidden).toBe(true);
    good.dom.window.close();
  });

  it('the preview page serves all three makers: it says "file" and "student", and offers each maker when a preview is gone', () => {
    const doc = parse('packets-try.html');
    expect(doc.title).toBe('Try the file');
    expect(doc.querySelector('.try-bar').textContent.replace(/\s+/g, ' ').trim()).toBe('Preview This is the file a student gets. Nothing you do here is kept. Close this tab to go back to the maker.');
    expect(doc.getElementById('try-wait').textContent).toBe('Opening the file.');
    const problem = doc.getElementById('try-problem');
    expect(problem.querySelector('h2').textContent).toBe('The preview is not here any more');
    expect(problem.querySelector('p').textContent).toBe('A preview lasts while the maker page stays open on the file it made. Go back to the maker and press Try it again. Or start a new file.');
    // The three makers, as equals, in the order of the front door, each under the name its own page gives itself.
    expect([...problem.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href'), a.className])).toEqual([
      ['Make Word Sounds practice', 'packets-make.html', 'btn btn-primary'], ['Make math fact practice', 'packets-math-practice.html', 'btn btn-primary'], ['Make a math check', 'packets-check.html', 'btn btn-primary']]);
    for (const a of problem.querySelectorAll('a')) expect(existsSync(a.getAttribute('href')), a.getAttribute('href')).toBe(true);
    // Nothing a person reads or hears names one kind of file: the three links above are the only exception. A teacher's page says
    // "student" (2026-11-12), never "learner".
    const said = [doc.title, doc.querySelector('.try-bar').textContent, doc.getElementById('try-wait').textContent, problem.querySelector('h2').textContent, problem.querySelector('p').textContent,
      doc.querySelector('noscript').textContent, ...(read('packets-try.js').match(/'[^'\n]*'/g) || [])].join('\n');
    expect(said).toContain('The file a student gets');
    expect(said).not.toMatch(/practice|math|check|learner/i);
  });
});

// 2026-11-16: a shorter maker. The same three steps and every choice, with a one-press path, a word count beside the
// picked words, random picks, and the rarely used choices behind one "More options" box in each step.
describe('the maker: quick make, the word count, Pick different words and More options (2026-11-16)', () => {
  it('a first visit starts at a grade level; the earlier choices of a returning browser are kept as they were', async () => {
    const first = await openMaker({ firstVisit: true });
    first.$('next-1').click();
    await first.until(() => first.chips().length > 0, 'the first words');
    expect(first.$('f-stage').value).toBe('K early');
    expect(first.$('f-shape').value).toBe('');
    expect(first.$('f-stage').closest('details')).toBeNull();
    expect(first.chips()).toEqual(pickedFor({ count: 30, stage: 'K early' }).words.slice(0, first.fileCount()));
    // Beginning-reader words, not the most common words of all.
    for (const word of first.chips()) expect(dictionary.lookup(word)[0].length, word).toBeLessThanOrEqual(3);
    // A returning browser (what openMaker stands in for by default): CVC at any grade level, and the box that holds
    // the pattern opens by itself because a pattern is set.
    const back = await openMaker();
    back.$('next-1').click();
    await back.until(() => back.chips().length > 0, 'the earlier words');
    expect([back.$('f-stage').value, back.$('f-shape').value]).toEqual(['', 'CVC']);
    expect(back.$('more-2').open).toBe(true);
    expect(back.$('more-2-now').textContent).toBe('any sound, CVC pattern, version A');
  }, 120000);

  it('Make it with the usual settings goes from step 1 to a built file, and the chips are the words of that file', async () => {
    const page = await openMaker({ firstVisit: true });
    expect(page.$('quick-line').textContent).toMatch(/^Skips to step 3 and makes the file with what is chosen now: /);
    page.$('quick-make').click();
    expect(page.seen('step-3')).toBe(true);
    await ready(page);
    expect(page.seen('summary')).toBe(true);
    const fileWords = lessonOf(page.built()).blocks[0].items.map((item) => item.word);
    expect(fileWords.length).toBeGreaterThan(0);
    // Save comes before the title and the other choices; the words of the file are listed.
    // 2026-11-17 (review 2.3): the title comes just before Try it and Save, so a teacher who saves at once sees it.
    expect(page.$('save').compareDocumentPosition(page.$('f-title')) & page.w.Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(page.seen('sum-words')).toBe(true);
    page.$('back-3').click();
    await page.until(() => page.chips().length > 0, 'the words again');
    expect(page.chips()).toEqual(fileWords);
    expect(page.$('pick-chips').getAttribute('aria-label')).toBe('Words in the file');
    // With no activity chosen it stays on step 1 and says why.
    page.$('back-2').click();
    for (const box of page.d.querySelectorAll('#strands input[type="checkbox"]:checked')) box.click();
    page.$('quick-make').click();
    expect(page.seen('step-1')).toBe(true);
    expect(page.$('step-1-problem').textContent).toBe('Choose at least one activity to go on.');
  }, 120000);

  it('How many words sits beside the picked words: - and + and a typed number change the file, and make the length Custom', async () => {
    const page = await openMaker();
    page.$('next-1').click();
    await page.until(() => page.chips().length > 0, 'the words');
    const list = pickedFor({ count: 40, shape: 'CVC' }).words;
    expect(page.$('count-home-2').contains(page.$('f-count'))).toBe(true);
    expect(page.seen('f-count')).toBe(true);
    expect(page.$('f-count').closest('details')).toBeNull();
    expect(page.fileCount()).toBe(7);
    page.$('count-more').click();
    page.$('count-more').click();
    await page.until(() => page.chips().length === 9, 'nine words');
    expect(page.chips()).toEqual(list.slice(0, 9));
    expect(page.$('count-said').textContent).toBe('9 words in the file.');
    page.$('count-less').click();
    await page.until(() => page.chips().length === 8, 'eight words');
    page.set('f-count', '12');
    await page.until(() => page.chips().length === 12, 'twelve words');
    expect(page.chips()).toEqual(list.slice(0, 12));
    expect(JSON.parse(page.w.localStorage.getItem('alloflow-packets-maker/1'))).toMatchObject({ length: 'custom', count: 12 });
    // The ends of the range: the buttons stop there.
    page.set('f-count', '1');
    await page.until(() => page.chips().length === 1, 'one word');
    expect(page.$('count-less').disabled).toBe(true);
    page.set('f-count', '40');
    await page.until(() => page.chips().length === 40, 'forty words');
    expect(page.$('count-more').disabled).toBe(true);
    // In step 3 the same field sits under Length, and the box that holds it has opened for the Custom length.
    page.set('f-count', '12');
    await page.until(() => page.chips().length === 12, 'twelve words again');
    page.$('next-2').click();
    await ready(page);
    expect(page.$('count-home-3').contains(page.$('f-count'))).toBe(true);
    expect(page.$('more-3').open).toBe(true);
    expect(page.$('more-3-now').textContent).toMatch(/^Custom: 12 words, /);
    expect(lessonOf(page.built()).blocks[0].items.map((item) => item.word)).toEqual(list.slice(0, 12));
  }, 120000);

  it('Pick different words: any words that fit, a new set each press, built into the file; the build seed stays the one of the version', async () => {
    const page = await openMaker();
    page.$('next-1').click();
    await page.until(() => page.chips().length > 0, 'the words');
    const common = page.chips();
    expect(page.seen('pick-shuffle')).toBe(true);
    expect(page.seen('pick-common')).toBe(false);
    page.$('pick-shuffle').click();
    const first = page.chips();
    // The builder's own "any words that fit" pick, with the seed the page says it uses.
    expect(first).toEqual(pickedFor({ count: 30, shape: 'CVC', mix: 'any' }, 'r1|1').words.slice(0, 7));
    expect(first).not.toEqual(common);
    expect(page.$('pick-said').textContent).toBe('Different words: ' + first.join(', ') + '.');
    expect(page.seen('pick-common')).toBe(true);
    page.$('pick-shuffle').click();
    const second = page.chips();
    expect(second).toEqual(pickedFor({ count: 30, shape: 'CVC', mix: 'any' }, 'r2|1').words.slice(0, 7));
    expect(second).not.toEqual(first);
    // Every random word still fits the teacher's choices and can be used.
    for (const word of second) expect(wordlist.get(word), word).toMatchObject({ blocked: false, nearBlocked: false, soft: false, hasClip: true, shape: 'CVC' });
    expect(JSON.parse(page.w.localStorage.getItem('alloflow-packets-maker/1'))).toMatchObject({ order: 'random', shuffle: 2 });
    page.$('next-2').click();
    await ready(page);
    const html = page.built();
    expect(lessonOf(html).blocks[0].items.map((item) => item.word)).toEqual(second);
    // The file is built with the version's seed, so reopening it and its wrong answers work as before.
    expect(manifestOf(html).builder.seed).toBe(1);
    // Back to the most common words.
    page.$('back-3').click();
    await page.until(() => page.chips().length > 0, 'the words again');
    expect(page.chips()).toEqual(second);
    page.$('pick-common').click();
    expect(page.chips()).toEqual(common);
    expect(page.seen('pick-common')).toBe(false);
    expect(JSON.parse(page.w.localStorage.getItem('alloflow-packets-maker/1'))).toMatchObject({ order: 'common', shuffle: 0 });
  }, 120000);

  it('every choice is still on the page: one More options box in each step holds the rarely used ones and says what is set', async () => {
    const doc = parse('packets-make.html');
    const inside = (id) => [...doc.querySelectorAll('#' + id + ' input, #' + id + ' select, #' + id + ' textarea')].map((node) => node.id || node.name + '=' + node.value);
    expect(inside('more-1')).toEqual(['f-trace-cases', 'f-choices']);
    expect(inside('more-2')).toEqual(['f-sound', 'f-position', 'f-shape', 'f-stage-other', 'version=A', 'version=B', 'version=C']);
    expect(inside('more-3')).toEqual(['length=short', 'length=regular', 'length=long', 'length=custom', 'f-pictures', 'f-directions-once', 'f-repeat-missed', 'f-code-name']); // 2026-11-17
    for (const id of ['more-1', 'more-2', 'more-3']) {
      const box = doc.getElementById(id);
      expect(box.tagName, id).toBe('DETAILS');
      expect(box.hasAttribute('open'), id).toBe(false);
      expect(box.querySelector('summary .more-name').textContent, id).toBe('More options');
      expect(box.querySelector('summary .more-now').id, id).toBe(id + '-now');
    }
    // What stays on show: the activities, the grade level or the typed words, the count and the words, the title, save.
    for (const id of ['quick-make', 'next-1', 'f-stage', 'f-own', 'pick-shuffle', 'pick-chips', 'pick-list', 'f-title', 'save', 'try', 'print-cards', 'open-present-export', 'batch'])
      expect(doc.getElementById(id).closest('details.more'), id).toBeNull();
    const page = await openMaker();
    // Step 1: the groups are boxes, open where an activity is chosen; the line says how many.
    const groups = [...page.d.querySelectorAll('#strands details.strand')];
    expect(groups.length).toBeGreaterThanOrEqual(3);
    for (const group of groups) {
      const on = group.querySelectorAll('input[type="checkbox"]:checked').length;
      expect(group.open, group.getAttribute('data-strand')).toBe(on > 0);
      expect(group.querySelector('.strand-count').textContent).toBe(on ? on + ' chosen' : 'none chosen');
    }
    expect(page.$('more-1-now').textContent).toBe('Choices: Medium');
    expect(page.$('more-1').open).toBe(false);
    page.set('f-choices', 'easy');
    page.$('next-1').click();
    page.$('back-2').click();
    expect(page.$('more-1-now').textContent).toBe('Choices: Easy');
    expect(page.$('more-1').open).toBe(true);
  }, 120000);
});
