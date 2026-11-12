import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// "Make a math check" on the Packets site: packets-check.html and packets-check.js. Part 1 reads the two files as
// text. Part 2 runs the page in jsdom with the scripts the page itself names (the real problem sets, the real
// take-home loader, the real check builder) and then runs the files it makes.
const read = (file) => readFileSync(file, 'utf8');
const PAGE = 'packets-check.html';
const SCRIPT = 'packets-check.js';
const PRINT_CSS = 'packets-check-print.css';
const NAME = 'AlloFlow Packets';
const KEY = 'alloflow-packets-check/1';
const ADDRESS = 'https://packets.test/site/packets-check.html';
const RULE = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'";
const SCRIPTS = ['packets-page.js', 'psychometric_math_probes.js', 'word_sounds_take_home_loader.js', 'packet_check_builder.js', 'packets-check.js'];
// Said on every page that makes or shows a check, word for word.
const WHAT_A_CHECK_IS = 'A check to see how a learner is doing. It is not for a grade and it is not a standardized test.';
const PROOF_LINE = 'This page runs without AI. No account. Nothing you choose leaves your device.';
// Every sentence on the page that holds the word AI. Each says that none runs.
const ALLOWED_AI_SENTENCES = ['Runs without AI.', 'This page runs without AI.', 'Run AI.'];
// Words the page does not use for a check, and claims it does not make. The one place "test" appears is WHAT_A_CHECK_IS.
const NOT_SAID = /\b(?:tests?|tested|testing|probes?|assessments?|assess(?:es|ed|ing)?|screeners?|screening|benchmarks?|norms?|normed|normative|exams?|quiz(?:zes)?)\b|at grade level|grade-level|at[- ]risk/i;
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const parse = (file) => new JSDOM(read(file)).window.document;
const squash = (text) => text.replace(/\s+/g, ' ').trim();

// The loader and the builder, for building the same files directly, and the problem sets as the app reads them.
const parts = {};
parts.window = parts;
new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
new Function('window', read('packet_check_builder.js')).call(parts, parts);
const TH = parts.AlloWordSoundsTakeHome;
const PC = parts.AlloPacketChecks;
const bankText = read('psychometric_math_probes.json');
const BANK = JSON.parse(bankText.charCodeAt(0) === 0xFEFF ? bankText.slice(1) : bankText);
const READY = ['quantity_discrimination', 'missing_number', 'math_computation'];
const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];
const setsOf = (id) => BANK[PC.MEASURES[id].bank];
const gradesOf = (id) => Object.keys(setsOf(id)).sort((a, b) => GRADES.indexOf(a) - GRADES.indexOf(b));
const formsOf = (id) => gradesOf(id).flatMap((grade) => Object.keys(setsOf(id)[grade]).sort().map((form) => ({ grade, form, data: setsOf(id)[grade][form] })));
// What one item of a check is called. An item that shows two numbers to compare (left and right) is a question; the rest are problems.
const nounOf = (id) => (formsOf(id)[0].data.problems[0].left != null ? 'question' : 'problem');
const gradeName = (grade) => grade === 'K' ? 'Kindergarten' : 'Grade ' + grade;
const minutes = (seconds) => seconds === 60 ? '1 minute' : seconds / 60 + ' minutes';
const direct = (id, grade, form, extra = {}) => PC.buildCheckPacket({ lesson: PC.lessonFromMathForm({ bank: BANK, measure: id, grade, form }), loader: TH, ...extra });

const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const ruleOf = (html) => /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)[1];
const scriptOf = (html) => [...new JSDOM(html).window.document.querySelectorAll('script')].find((node) => !node.type).textContent;
// The same list tests/word_sounds_take_home_packet.test.js and tests/packet_check_mode.test.js apply to a file with no mailbox.
const FORBIDDEN = [
  ['a web address', /https?:\/\//i], ['location assignment', /\blocation\s*(?:\.\s*\w+\s*)?=(?!=)/], ['location.assign/replace', /\blocation\s*\.\s*(?:assign|replace)\s*\(/],
  ['window.open', /\bopen\s*\(/], ['<form', /<form/i], ['<a href', /<a\s[^>]*href/i], ['meta refresh', /http-equiv\s*=\s*["']?refresh/i], ['fetch(', /fetch\s*\(/],
  ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/], ['sendBeacon', /sendBeacon/], ['eval(', /\beval\s*\(/], ['new Function', /new\s+Function/],
  ['import(', /\bimport\s*\(/], ['microphone or camera', /getUserMedia|SpeechRecognition|MediaRecorder/], ['cookies', /\.\s*cookie\b/], ['speech engine', /speechSynthesis/],
  ['service worker', /serviceWorker/], ['peer connection', /RTCPeerConnection/],
];
const audit = (text) => FORBIDDEN.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
// A built file holds nothing that could reach the network: the source list, the tags, the rule and the one hashed script.
function expectNoWayOut(html) {
  expect(audit(html)).toEqual([]);
  const doc = new JSDOM(html).window.document;
  expect([...doc.querySelectorAll('*')].flatMap((node) => [...node.attributes]).filter((attribute) => /^on/i.test(attribute.name))).toEqual([]);
  expect(html.match(/<script/gi)).toHaveLength(2);
  expect(html).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video)\b/i);
  const rule = ruleOf(html).split('; ');
  for (const part of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "base-uri 'none'", "object-src 'none'", "frame-src 'none'", "worker-src 'none'"]) expect(rule).toContain(part);
  expect(rule).toContain("script-src 'sha256-" + createHash('sha256').update(scriptOf(html), 'utf8').digest('base64') + "'");
  expect(manifestOf(html)).toMatchObject({ kind: 'alloflow-packet-manifest', network: 'none', never: ['internet connection', 'microphone', 'camera', 'cookies', 'AI'], packet: { mode: 'probe' } });
  expect(lessonOf(html)).toMatchObject({ audio: {}, images: {}, submit: null });
  // The preview page shows only a file that looks like this.
  expect(/^<!doctype html>/i.test(html) && html.includes('id="packet-manifest"')).toBe(true);
}
// The text a visitor can read in a document: what is on the page, and the attributes a browser shows or reads out.
function wordsOf(doc) {
  const shown = [doc.documentElement.textContent];
  for (const node of doc.querySelectorAll('*')) {
    for (const name of ['aria-label', 'title', 'alt', 'placeholder']) if (node.hasAttribute(name)) shown.push(node.getAttribute(name));
    if (node.tagName === 'META' && node.getAttribute('name') === 'description') shown.push(node.getAttribute('content'));
  }
  return squash(shown.join(' \n ')).split(WHAT_A_CHECK_IS).join(' ');
}
// The words packets-check.js can put on the page: its quoted strings, comments left out.
function stringsOf(source) {
  const code = source.split('\n').filter((line) => !line.trim().startsWith('//')).map((line) => line.replace(/\s\/\/ .*$/, '')).join('\n');
  return code.match(/'(?:[^'\\\n]|\\.)*'/g) || [];
}

describe('the page as files', () => {
  it('holds no web address, and every address it uses is relative', () => {
    for (const file of [PAGE, SCRIPT]) expect(read(file).match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || [], file).toEqual([]);
    for (const node of parse(PAGE).querySelectorAll('[href], [src]')) {
      // Three hosts serve these files, one of them from a sub-folder: no scheme, no host, no leading slash.
      expect(node.getAttribute('href') || node.getAttribute('src')).toMatch(/^(?:#[\w-]+|\.\/|[\w.-]+(?:\/[\w.-]+)*(?:#[\w-]+)?)$/);
    }
  });

  it('has no inline script, no inline style and no inline handler', () => {
    const doc = parse(PAGE);
    expect(doc.querySelectorAll('style').length).toBe(0);
    for (const script of doc.querySelectorAll('script')) {
      expect(script.getAttribute('src')).toMatch(/^[\w.-]+\.js$/);
      expect(script.hasAttribute('defer')).toBe(true);
      expect(script.textContent.trim()).toBe('');
    }
    for (const node of doc.querySelectorAll('*')) {
      for (const attribute of node.attributes) {
        expect(/^on|^style$/i.test(attribute.name), node.tagName + ' ' + attribute.name).toBe(false);
        expect(/^\s*javascript:/i.test(attribute.value)).toBe(false);
      }
    }
    expect(doc.querySelectorAll('form, iframe, object, embed, img, audio, video, base')).toHaveLength(0);
    // The page's look is the shared stylesheet, and one more for the paper copy only. Nothing in either comes from elsewhere.
    expect([...doc.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute('href'))).toEqual(['packets.css', PRINT_CSS]);
    for (const file of ['packets.css', PRINT_CSS]) expect(read(file), file).not.toMatch(/@import|url\(|@font-face/i);
  });

  it('carries the rule that tells the browser to refuse everything else, before anything is loaded', () => {
    const doc = parse(PAGE);
    const rule = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(rule).toBe(RULE);
    expect(rule).not.toMatch(/unsafe|\*|data:|blob:|https?:/);
    // Nothing is fetched (the problem sets load by script tag), so the page may connect to nothing at all.
    expect(rule.split('; ')).toContain("connect-src 'none'");
    const head = [...doc.head.children];
    const at = head.findIndex((node) => node.getAttribute('http-equiv') === 'Content-Security-Policy');
    expect(head.slice(0, at).every((node) => node.tagName === 'META')).toBe(true);
    expect(doc.querySelector('meta[name="referrer"]').getAttribute('content')).toBe('no-referrer');
  });

  it('loads five scripts by relative address and nothing from the shared site assets', () => {
    expect([...parse(PAGE).querySelectorAll('script')].map((script) => script.getAttribute('src'))).toEqual(SCRIPTS);
    expect(read(PAGE)).not.toMatch(/shared\.css|site\.js|lucide|fonts\.g|unpkg|promo/i);
    const source = read(SCRIPT);
    expect(source).not.toMatch(/fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\beval\s*\(|new\s+Function|\bimport\s*\(|\.\s*cookie\b|getUserMedia|serviceWorker|\bcaches\b|indexedDB|sessionStorage/);
    // It never touches the address of the page: nothing typed can end up in a link or in the history.
    expect(source).not.toMatch(/\blocation\b|\bhistory\b|pushState|replaceState|searchParams/);
    // It makes nothing that loads: the only elements it creates are text, the choices, the sheets of the paper copy, and
    // the link that hands over the file.
    const made = new Set([...source.matchAll(/\b(?:el|createElement)\('(\w+)'/g)].map((m) => m[1]));
    expect([...made].sort()).toEqual(['a', 'dd', 'dt', 'input', 'label', 'li', 'ol', 'p', 'section', 'span']);
    expect(source.match(/createElement\(/g)).toHaveLength(2);
    expect(source).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\.src\s*=|setAttribute\('(?:src|action|srcset)'/);
    // The one address it sets is the preview page with the built file's own blob address after the #.
    expect(source.match(/setAttribute\('href'[^)]*\)/g)).toEqual(["setAttribute('href', TRY_PAGE + '#' + fileUrl)"]);
    expect(source.match(/\.href\s*=[^;]*;/g)).toEqual(['.href = url;']);
    // The one thing it keeps is one key in this browser.
    expect(source.match(/localStorage\.\w+\([^)]*/g)).toEqual(['localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, check: state.check, grades: state.grades, version: state.version,\n        problems: state.problems, title: state.title, time: state.time, skip: state.skip }',
      "localStorage.getItem(STORE_KEY", 'localStorage.removeItem(STORE_KEY']);
    expect(source).toContain("var STORE_KEY = '" + KEY + "';");
    // The problem sets come from the globals the app's own file sets, under the names the builder asks for.
    const bankScript = read('psychometric_math_probes.js');
    for (const id of READY) expect(bankScript).toContain('window.' + PC.MEASURES[id].bank + ' = data.' + PC.MEASURES[id].bank + ';');
    expect(source).toContain('var sets = measure ? window[measure.bank] : null;');
  });

  it('refers only to local files that exist', () => {
    for (const node of parse(PAGE).querySelectorAll('[href], [src]')) {
      const address = (node.getAttribute('href') || node.getAttribute('src')).replace(/#.*$/, '');
      if (!address) continue;
      expect(existsSync(address === './' ? 'index.html' : address), address).toBe(true);
    }
    const named = read(SCRIPT).match(/'[\w./-]+\.(?:json|html|js|css|svg)'/g) || [];
    expect(named).toEqual(["'packets-try.html'"]);
    for (const quoted of named) expect(existsSync(quoted.slice(1, -1)), quoted).toBe(true);
    // Try it goes through the preview page of the site, which shows a built file in a sandboxed frame.
    expect(read('packets-try.js')).toContain("frame.setAttribute('sandbox', 'allow-scripts allow-downloads')");
    // That page serves this maker too: it calls a check "the file", never a practice file, and leads back here when a preview is gone.
    const preview = parse('packets-try.html');
    expect(preview.querySelector('.try-bar p').textContent).toBe('This is the file a learner gets. Nothing you do here is kept. Close this tab to go back to the maker.');
    expect([...preview.querySelectorAll('#try-problem a')].map((a) => [a.textContent, a.getAttribute('href')])).toContainEqual(['Make a math check', PAGE]);
    expect(read('packets-try.js')).toContain("frame.title = 'The file a learner gets'");
    expect((read('packets-try.js').match(/'[^'\n]*'/g) || []).join('\n')).not.toMatch(/practice|student/i);
  });

  it('says "AI" only to say there is none, and says "Runs without AI"', () => {
    const doc = parse(PAGE);
    const sentences = (text) => squash(text).split(/(?<=[.!?])\s+/).filter((sentence) => /\bAI\b/.test(sentence));
    const BLOCK = 'title, h1, h2, h3, p, li, summary, legend, label, button, dt, dd, option';
    const blocks = [...doc.querySelectorAll(BLOCK)].filter((node) => !node.querySelector(BLOCK));
    const found = blocks.flatMap((node) => sentences(node.textContent));
    const described = sentences(doc.querySelector('meta[name="description"]').getAttribute('content'));
    expect(found.length + described.length).toBeGreaterThanOrEqual(3);
    for (const sentence of [...found, ...described]) expect(ALLOWED_AI_SENTENCES, sentence).toContain(sentence);
    const mentions = (text) => (text.match(/\bAI\b/g) || []).length;
    expect(mentions(doc.documentElement.textContent)).toBe(blocks.reduce((sum, node) => sum + mentions(node.textContent), 0));
    for (const node of doc.querySelectorAll('*')) {
      for (const attribute of node.attributes) if (!(node.tagName === 'META' && attribute.name === 'content')) expect(/\bAI\b/.test(attribute.value), attribute.name).toBe(false);
    }
    expect(doc.querySelector('meta[name="description"]').getAttribute('content')).toMatch(/ Runs without AI\. No accounts\.$/);
    expect(doc.querySelector('details.proof summary').textContent).toContain(PROOF_LINE);
    // Never a bare "no AI", and no name of an AI product.
    for (const file of [PAGE, SCRIPT]) expect(read(file), file).not.toMatch(/\bno AI\b|AI-free|Gemini|ChatGPT|chatbot|generat(?:es|ive)|\bLLM\b/i);
    // In the script the word appears in comments only: no line a visitor reads.
    for (const line of read(SCRIPT).split('\n')) if (/\bAI\b/.test(line)) expect(line.trim().startsWith('//'), line).toBe(true);
  });

  it('calls it a check, says what a check is, and makes no claim about levels or risk', () => {
    const doc = parse(PAGE);
    expect(squash(doc.body.textContent).split(WHAT_A_CHECK_IS)).toHaveLength(2);
    expect(doc.getElementById('what-a-check-is').textContent).toBe(WHAT_A_CHECK_IS);
    // It sits right under the h1, outside the three steps, so it is on screen at every step.
    expect(doc.querySelector('h1').nextElementSibling.id).toBe('what-a-check-is');
    expect(NOT_SAID.exec(wordsOf(doc))).toBeNull();
    const strings = stringsOf(read(SCRIPT));
    expect(strings.length).toBeGreaterThan(150);
    for (const quoted of strings) expect(NOT_SAID.exec(quoted), quoted).toBeNull();
    // The check on the words fires.
    for (const sample of ['a math test', 'a probe', 'an assessment', 'the screener', 'at grade level', 'at-risk', 'norms', 'a benchmark']) expect(NOT_SAID.test(sample), sample).toBe(true);
    for (const sample of ['the latest', 'the answers screen', 'normal', 'a contest']) expect(NOT_SAID.test(sample), sample).toBe(false);
    expect(doc.body.textContent).not.toContain('!');
    expect(BRITISH.exec(read(PAGE) + read(SCRIPT))).toBeNull();
  });

  it('keeps the product name in one place, and packets-page.js puts it in the title and shows the rule', () => {
    expect(read(PAGE).split(NAME).length - 1).toBe(1);
    expect(parse(PAGE).getElementById('product-name').textContent).toBe(NAME);
    expect(read(SCRIPT)).not.toContain(NAME);
    const dom = new JSDOM(read(PAGE), { runScripts: 'outside-only' });
    dom.window.eval(read('packets-page.js'));
    expect(dom.window.document.title).toBe(NAME + ': Make a math check');
    expect(dom.window.document.querySelector('[data-show-rule]').textContent).toBe(RULE);
    dom.window.close();
  });

  it('has one h1, headings that never skip a level, a name for every control, and its landmarks', () => {
    const doc = parse(PAGE);
    const levels = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) => Number(node.tagName[1]));
    expect(levels.filter((level) => level === 1)).toEqual([1]);
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => { if (i) expect(level - levels[i - 1], 'heading ' + i).toBeLessThanOrEqual(1); });
    const named = (node) => {
      if ((node.getAttribute('aria-label') || '').trim()) return true;
      const by = node.getAttribute('aria-labelledby');
      if (by) return by.split(/\s+/).every((id) => doc.getElementById(id));
      if (node.id && doc.querySelector('label[for="' + node.id + '"]')?.textContent.trim()) return true;
      return !!node.closest('label')?.textContent.trim();
    };
    for (const node of doc.querySelectorAll('input, select, textarea, progress')) expect(named(node), node.outerHTML.slice(0, 80)).toBe(true);
    for (const node of doc.querySelectorAll('button, a[href]')) expect((node.textContent.trim() || node.getAttribute('aria-label') || '').length, node.outerHTML.slice(0, 80)).toBeGreaterThan(0);
    for (const node of doc.querySelectorAll('[aria-describedby], [aria-labelledby]')) {
      for (const id of (node.getAttribute('aria-describedby') || node.getAttribute('aria-labelledby')).split(/\s+/)) expect(doc.getElementById(id), '#' + id).toBeTruthy();
    }
    for (const group of doc.querySelectorAll('fieldset')) expect(group.querySelector('legend')?.textContent.trim()).toBeTruthy();
    for (const node of doc.querySelectorAll('button')) expect(node.getAttribute('type')).toBe('button');
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.querySelectorAll('main').length).toBe(1);
    expect(doc.querySelector('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable|maximum-scale/);
    expect(new Set([...doc.querySelectorAll('[id]')].map((node) => node.id)).size).toBe(doc.querySelectorAll('[id]').length);
    expect(doc.querySelector('a.skip').getAttribute('href')).toBe('#main');
    expect(doc.querySelector('header') && doc.querySelector('main#main') && doc.querySelector('footer') && doc.querySelector('nav[aria-label="Steps"]')).toBeTruthy();
    expect([...doc.querySelectorAll('footer a')].map((link) => link.textContent)).toEqual(['More from AlloFlow']);
    expect([...doc.querySelectorAll('link[rel="icon"]')].map((link) => link.getAttribute('href'))).toEqual(['packets-mark.svg']);
    // A heading the page moves focus to is read out and shows no box; controls keep their outline.
    for (const id of ['step-1-title', 'step-2-title', 'step-3-title', 'after-save']) expect(doc.getElementById(id).getAttribute('tabindex'), id).toBe('-1');
    for (const node of doc.querySelectorAll('[tabindex="-1"]')) expect(node.matches('button, a, input, select, textarea, summary'), node.id).toBe(false);
    // Messages are announced: a reason that stops a step is an alert, and progress is a status.
    for (const id of ['step-1-problem', 'step-2-problem']) expect(doc.getElementById(id).getAttribute('role'), id).toBe('alert');
    for (const id of ['form-line', 'own-line', 'code-line', 'making-said', 'forget-said']) expect(doc.getElementById(id).getAttribute('role'), id).toBe('status');
    // One primary button on each step; on a phone it takes the full width (packets.css).
    for (const step of doc.querySelectorAll('section.sheet')) expect(step.querySelectorAll('.btn-primary').length, step.id).toBe(1);
    expect(read('packets.css')).toMatch(/@media \(max-width: 29\.99rem\) \{\s*\.actions \.btn-primary \{ flex: 1 1 100%; \}/);
    expect(read('packets.css')).toMatch(/prefers-reduced-motion/);
    // Every class the page and its script use is one the shared stylesheet has, or (the paper copy) the print stylesheet.
    const css = read('packets.css') + read(PRINT_CSS);
    const used = new Set([...doc.querySelectorAll('[class]')].flatMap((node) => [...node.classList]));
    for (const quoted of read(SCRIPT).match(/el\('\w+', '[\w -]+'/g) || []) for (const name of /, '([\w -]+)'/.exec(quoted)[1].split(' ')) used.add(name);
    for (const name of [...used, 'is-on', 'is-done', 'is-ok', 'is-out', 'w', 's']) expect(css.includes('.' + name), 'class ' + name).toBe(true);
  });

  it('shows three steps on one page, the proof line above them, and one quiet closed block about the page', () => {
    const doc = parse(PAGE);
    const main = doc.querySelector('main .wrap');
    expect([...main.children].filter((node) => node.matches('section, details')).map((node) => node.id)).toEqual(['step-1', 'step-2', 'step-3', 'about-page']);
    expect([...doc.querySelectorAll('.step-tab')].map((tab) => squash(tab.textContent))).toEqual(['1Step 1: Which check', '2Step 2: Grade and version', '3Step 3: Make the file']);
    expect([...doc.querySelectorAll('section.sheet h2')].map((heading) => heading.textContent)).toEqual(['Which check', 'Grade and version', 'Make the file']);
    expect(main.lastElementChild.id).toBe('about-page');
    const about = doc.getElementById('about-page');
    expect(about.hasAttribute('open')).toBe(false);
    expect(about.querySelector('summary').textContent).toBe('About this page');
    expect([...about.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual(['What this page keeps', 'Where the checks come from']);
    // The button that forgets the choices is there, and only there.
    expect([...about.querySelectorAll('button')].map((button) => button.id)).toEqual(['forget']);
    expect(squash(about.textContent)).toContain('The teacher code is never kept: it is gone when you close or reload this page.');
    // The teacher code waits behind a closed disclosure, with what it is and what it is not.
    const code = doc.getElementById('code-box');
    expect(code.hasAttribute('open')).toBe(false);
    expect(code.closest('#step-2')).toBeTruthy();
    expect(code.querySelector('summary').textContent).toBe('Teacher code (optional)');
    expect(doc.getElementById('code-about').textContent).toBe('The answers screen inside the file opens only with this code. It is a lock on the screen, not secret writing.');
    expect(doc.getElementById('f-code').getAttribute('aria-describedby')).toBe('code-about code-hint');
    expect(doc.getElementById('f-code').getAttribute('autocomplete')).toBe('off');
    expect(doc.getElementById('f-code').getAttribute('maxlength')).toBe('64');
    // The code is hidden as it is typed, and the box is laid out as the page's text boxes are.
    expect(doc.getElementById('f-code').getAttribute('type')).toBe('password');
    expect(read('packets.css')).toContain('.field select, .field input[type="text"], .field input[type="password"], .field textarea {');
    expect(doc.querySelectorAll('form')).toHaveLength(0);
    // The details behind the proof line: what a check file can do and what it cannot.
    const proof = doc.querySelector('details.proof');
    expect(proof.hasAttribute('open')).toBe(false);
    const lists = Object.fromEntries(['can-title', 'cannot-title'].map((id) => [id, [...doc.querySelector('ul[aria-labelledby="' + id + '"]').children].map((item) => item.textContent)]));
    expect(doc.getElementById('can-title').textContent).toBe('A check file can:');
    expect(doc.getElementById('cannot-title').textContent).toBe('A check file cannot:');
    expect(lists['can-title']).toEqual([
      'Give one try for each problem, with no hints. After the practice questions, the learner is not shown right or wrong.',
      "Run a clock on the learner's device. The clock keeps going when the learner leaves the page, and it does not give time back.",
      "Save a results file to that device when the learner presses the save button. The results file shows right and wrong and the expected answers: it is the teacher's record.",
    ]);
    expect(lists['cannot-title'][0]).toBe('Run AI. Nothing is generated when you make a file or when a learner uses it.');
    expect(lists['cannot-title']).toContain('Keep its answers secret. The answers are scrambled in the file, so they cannot be read just by opening it. This stops casual looking, not a determined person.');
    expect(lists['cannot-title']).toContain('Make the teacher code more than a lock. The code keeps the answers screen inside the file closed. It is a lock on the screen, not secret writing.');
    // What the page says about a check file is what the file says about itself, and what the loader does.
    const loaderSource = read('word_sounds_take_home_loader.js');
    for (const text of ['This stops casual looking, not a determined person.', 'It is a lock on the screen, not secret writing', "check_about: 'This is a check to see how you are doing. It is not for a grade.'",
      "check_ready_one_try: 'You get one try for each one. You cannot go back.'", "check_about_clock: 'The clock uses the time on this device. It keeps going when you leave the page.'",
      "save_csv: 'Save results as a spreadsheet file (CSV)'", '(?:^#|&)learner=', "check_teacher_open: 'For the teacher: show results'"]) expect(loaderSource, text).toContain(text);
    expect(doc.getElementById('after-save').textContent).toContain('#learner=CodeName');
    expect(doc.getElementById('after-save').querySelector('a').getAttribute('href')).toBe('packets-results.html');
    expect(squash(doc.getElementById('after-save').querySelector('ol').textContent)).toContain('In AlloFlow: Class Analytics, Add take-home results.');
  });

  it('the sizes and the count of files it states are the real ones', () => {
    const doc = parse(PAGE);
    // The page itself, the two stylesheets, the icon and the scripts.
    const files = new Set([PAGE, ...[...doc.querySelectorAll('link[href], script[src]')].map((node) => node.getAttribute('href') || node.getAttribute('src'))]);
    expect(files.size).toBe(9);
    expect(doc.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(2);
    expect(squash(doc.querySelector('details.proof').textContent)).toContain('This page loads nine files, all from this site: the page itself, two stylesheets (one is only for printing), five scripts and the icon in the browser tab.');
    const megabytes = SCRIPTS.reduce((sum, file) => sum + statSync(file).size, 0) / 1e6;
    expect(doc.getElementById('loading').textContent).toContain('Getting the problem sets, about 0.5 MB.');
    expect(megabytes).toBeGreaterThan(0.4);
    expect(megabytes).toBeLessThan(0.6);
    // "About 90 KB": every ready check, and a list of the teacher's own, with and without a teacher code.
    expect(doc.getElementById('size-note').textContent).toBe('A check file has no sound, so there is nothing to download. About 90 KB.');
    const sizes = READY.flatMap((id) => formsOf(id).map(({ grade, form }) => Buffer.byteLength(direct(id, grade, form).html, 'utf8')));
    sizes.push(Buffer.byteLength(direct('math_computation', '5', 'A', { teacherCode: 'tulip-47' }).html, 'utf8'));
    sizes.push(Buffer.byteLength(PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ problems: PC.parseProblems('7+8') }), loader: TH }).html, 'utf8'));
    expect(sizes).toHaveLength(6 + 9 + 18 + 2);
    for (const bytes of sizes) expect(Math.abs(bytes - 90000), bytes + ' bytes').toBeLessThan(10000);
  });
});

// ---------------------------------------------------------------------------
// The page, run in jsdom with the scripts it names
// ---------------------------------------------------------------------------
function openPage(options = {}) {
  const dom = new JSDOM(read(PAGE), { runScripts: 'outside-only', pretendToBeVisual: true, url: ADDRESS });
  const w = dom.window, d = w.document;
  const page = { dom, w, d, asked: [], files: [], downloads: [] };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  // The page has no reason to ask for anything: any request is recorded and refused.
  w.fetch = async (url) => { page.asked.push(String(url)); throw new TypeError('Failed to fetch'); };
  w.XMLHttpRequest = class { constructor() { page.asked.push('XMLHttpRequest'); } };
  w.Blob = class { constructor(blobParts, opts) { this.body = blobParts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { page.downloads.push({ name: this.getAttribute('download'), href: this.getAttribute('href') }); };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  // jsdom has no printer: a print is counted, with what the print stylesheet would print at that moment.
  page.prints = [];
  w.print = () => { page.prints.push(d.body.classList.contains('paper-on')); };
  for (const [key, value] of Object.entries(options.storage || {})) w.localStorage.setItem(key, value);
  // The page's own scripts, in the order the page names them: what the page does not load, the run does not have.
  for (const script of d.querySelectorAll('script[src]')) {
    const file = script.getAttribute('src');
    if ((options.without || []).includes(file)) continue;
    w.eval(read(file));
    if (options.after && options.after[file]) options.after[file](w);
  }
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.set = (id, value) => { const node = page.$(id); node.value = value; node.dispatchEvent(new w.Event('input', { bubbles: true })); };
  page.choose = (name, value) => { const radio = d.querySelector('input[name="' + name + '"][value="' + value + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.options = (name) => [...d.querySelectorAll('input[name="' + name + '"]')].filter((radio) => !radio.closest('[hidden]')).map((radio) => [radio.value, squash(radio.closest('label').textContent)]);
  page.chosen = (name) => { const radio = d.querySelector('input[name="' + name + '"]:checked'); return radio ? radio.value : null; };
  page.until = async (condition, what) => {
    for (let i = 0; i < 3000; i++) { if (condition()) return; await new Promise((resolve) => setTimeout(resolve, 20)); }
    throw new Error('Timed out waiting for ' + what);
  };
  page.made = () => page.until(() => page.seen('summary') || page.seen('build-problem'), 'the file or a problem');
  page.built = () => page.files[page.files.length - 1].body;
  page.rows = () => Object.fromEntries([...page.$('summary-rows').querySelectorAll('dt')].map((dt) => [dt.textContent, dt.nextElementSibling.textContent]));
  page.typed = () => [...page.$('own-list').children].map((row) => [row.className === 'is-ok', row.querySelector('.w').textContent, row.querySelector('.s').textContent]);
  page.kept = () => JSON.stringify(Object.keys(w.localStorage).map((key) => [key, w.localStorage.getItem(key)]));
  // To step 2 with a list of the teacher's own problems typed and looked at.
  page.own = async (text) => {
    page.choose('check', 'own');
    page.$('next-1').click();
    page.set('f-problems', text);
    await page.until(() => page.typed().length === text.split(/[,;\n]+/).filter((part) => part.trim()).length, 'the typed problems');
  };
  // Nothing the page shows uses a word it should not, whatever state it is in.
  page.wordsAreRight = () => expect(NOT_SAID.exec(wordsOf(d))).toBeNull();
  return page;
}

// Runs a built file with its script. Both clocks are the run's own, as in tests/packet_check_mode.test.js.
const expected = (p) => p.answer != null ? Number(p.answer) : p.left != null ? Math.max(p.left, p.right)
  : p.op === 'add' ? p.a + p.b : p.op === 'sub' ? p.a - p.b : p.op === 'mul' ? p.a * p.b : Math.trunc(p.a / p.b);
function play(html) {
  const time = { t: 1000, wall: Date.UTC(2026, 10, 12, 14, 0, 0) };
  const saved = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/check.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(blobParts, opts) { this.body = blobParts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
    w.Date.now = () => time.wall;
  } });
  const w = dom.window, d = w.document;
  const q = (selector) => d.querySelector(selector);
  const tick = (ms) => { time.t += ms; time.wall += ms; };
  const press = (key) => q('[data-key="' + key + '"]').click();
  const answer = (raw, right = true) => {
    tick(300);
    const want = expected(raw);
    if (raw.left != null) q('[data-choice="' + (right ? want : Math.min(raw.left, raw.right)) + '"]').click();
    else { String(right ? want : want + 1).split('').forEach((ch) => press(ch === '-' ? 'minus' : ch)); press('next'); }
  };
  const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
  // The learner types a label, does the practice questions and presses Start: the first scored problem is on screen.
  const start = (lesson, name = 'BlueHeron7') => {
    d.getElementById('learner-name').value = name;
    button('Next').click();
    lesson.blocks[0].items.filter((p) => p.practice).forEach((raw) => { answer(raw); q('[data-practice-next]').click(); });
    q('[data-check-begin]').click();
  };
  return { w, d, q, saved, tick, answer, button, start, heading: () => q('#app h2').textContent, text: () => d.getElementById('app').textContent, close: () => w.close() };
}
const scored = (lesson) => lesson.blocks[0].items.filter((p) => !p.practice);

describe('step 1: the four cards, held against the problem sets', () => {
  // The text of each card, as decided. The facts in it are worked out again below from psychometric_math_probes.json.
  const CARDS = [
    ['quantity_discrimination', 'Quantity Discrimination', 'Tap the bigger of two numbers.', '1 minute. Kindergarten and grade 1.'],
    ['missing_number', 'Missing Number', 'Type the number that is missing from a number sentence, like __ + 8 = 14.', '2 minutes. Kindergarten to grade 2.'],
    ['math_computation', 'Math Fluency', 'Add, subtract, multiply or divide, a different mix for each grade.', '2 minutes. Kindergarten to grade 5. Scored by digits correct per minute.'],
    ['own', 'My own problems', 'Type the problems. Every learner gets the same ones.', ''],
  ];
  const cardsOf = (doc) => [...doc.querySelectorAll('#checks label')].map((label) => [label.querySelector('input').value, label.querySelector('.choice-name').textContent, label.querySelector('.choice-line').textContent]);

  it('shows four cards with the decided text, and the page reads the same before its scripts run', () => {
    const page = openPage();
    expect(page.seen('step-1') && !page.seen('loading') && !page.seen('load-problem') && !page.seen('step-2') && !page.seen('step-3')).toBe(true);
    const want = CARDS.map(([id, name, what, facts]) => [id, name, facts ? what + ' ' + facts : what]);
    expect(cardsOf(page.d)).toEqual(want);
    expect(cardsOf(parse(PAGE))).toEqual(want);
    // One radio group: one decision. Nothing is chosen for a first visit.
    expect(page.d.querySelectorAll('#step-1 input')).toHaveLength(4);
    expect([...page.d.querySelectorAll('#step-1 input')].every((input) => input.type === 'radio' && input.name === 'check')).toBe(true);
    expect(page.chosen('check')).toBeNull();
    expect(page.w.document.title).toBe(NAME + ': Make a math check, step 1 of 3');
    expect(page.asked).toEqual([]);
    page.wordsAreRight();
    page.dom.window.close();
  });

  it('each card takes its name from the builder and its time and grades from the problem sets', () => {
    const page = openPage();
    const shown = Object.fromEntries(cardsOf(page.d).map(([id, name, line]) => [id, { name, line }]));
    expect(Object.keys(PC.MEASURES).sort()).toEqual([...READY].sort());
    // What the problem sets hold today: the facts the cards state.
    expect(READY.map((id) => [id, gradesOf(id).join(' ')])).toEqual([['quantity_discrimination', 'K 1'], ['missing_number', 'K 1 2'], ['math_computation', 'K 1 2 3 4 5']]);
    for (const [id, , what] of CARDS.slice(0, 3)) {
      const grades = gradesOf(id), forms = formsOf(id);
      expect(shown[id].name, id).toBe(PC.MEASURES[id].name);
      expect(forms).toHaveLength(grades.length * 3);
      const limits = [...new Set(forms.map((row) => row.data.timeLimit))];
      expect(limits, id).toHaveLength(1);
      const span = grades.length === 2 ? gradeName(grades[0]) + ' and grade ' + grades[1] : gradeName(grades[0]) + ' to grade ' + grades[grades.length - 1];
      const scoring = PC.MEASURES[id].unit === 'digits_correct_per_minute' ? ' Scored by digits correct per minute.' : '';
      expect(shown[id].line, id).toBe(what + ' ' + minutes(limits[0]).replace(/^./, (c) => c.toUpperCase()) + '. ' + span + '.' + scoring);
      // The builder gives each version the time its own row has.
      for (const row of forms) expect(PC.lessonFromMathForm({ bank: BANK, measure: id, grade: row.grade, form: row.form }).timeLimitS, id + row.grade + row.form).toBe(row.data.timeLimit);
    }
    expect(PC.MEASURES.math_computation.unit).toBe('digits_correct_per_minute');
    expect([PC.MEASURES.quantity_discrimination.unit, PC.MEASURES.missing_number.unit]).toEqual(['items_correct', 'items_correct']);
    // The example on the Missing Number card is a real problem: the first one of grade 1, version A.
    expect(BANK.MISSING_NUMBER_PROBES['1'].A.problems[0].display).toBe('__ + 8 = 14');
    expect(shown.missing_number.line).toContain('like ' + BANK.MISSING_NUMBER_PROBES['1'].A.problems[0].display + '.');
    // Quantity Discrimination is two numbers and the bigger one is the answer.
    for (const row of formsOf('quantity_discrimination')) for (const p of row.data.problems) expect(p.answer).toBe(Math.max(p.left, p.right));
    // Math Fluency: all four operations across the grades, and no two grades with the same mix.
    const mixes = gradesOf('math_computation').map((grade) => {
      const data = setsOf('math_computation')[grade].A;
      return [...new Set(data.problems.map((p) => p.op))].sort().join('+') + ' ' + data.difficulty;
    });
    expect(new Set(mixes).size).toBe(mixes.length);
    expect([...new Set(formsOf('math_computation').flatMap((row) => row.data.problems.map((p) => p.op)))].sort()).toEqual(['add', 'div', 'mul', 'sub']);
    page.dom.window.close();
  });

  it('with nothing chosen it says so and stays; the next step is named for the choice', () => {
    const page = openPage();
    page.$('next-1').click();
    expect(page.seen('step-1')).toBe(true);
    expect(page.$('step-1-problem').textContent).toBe('Choose a check to go on.');
    // A step tab cannot jump past the choice either.
    page.d.querySelector('.step-tab[data-go="3"]').click();
    expect(page.seen('step-1')).toBe(true);
    expect(page.$('next-1').textContent).toBe('Next: grade and version');
    page.choose('check', 'own');
    expect(page.$('step-1-problem').textContent).toBe('');
    expect(page.$('next-1').textContent).toBe('Next: type the problems');
    expect(page.$('tab-2-name').textContent).toBe('Your problems');
    expect(page.d.querySelector('input[value="own"]').closest('label').classList.contains('is-on')).toBe(true);
    page.choose('check', 'missing_number');
    expect(page.$('next-1').textContent).toBe('Next: grade and version');
    expect(page.$('tab-2-name').textContent).toBe('Grade and version');
    expect([...page.d.querySelectorAll('#checks label.is-on input')].map((input) => input.value)).toEqual(['missing_number']);
    page.dom.window.close();
  });
});

describe('step 2, a ready check: grade and version', () => {
  it('offers only the grades the check has and the versions that grade has, and says what the chosen one holds', () => {
    const page = openPage();
    for (const id of READY) {
      page.choose('check', id);
      page.$('next-1').click();
      expect(page.seen('step-2') && page.seen('panel-ready') && !page.seen('panel-own'), id).toBe(true);
      expect(page.$('step-2-title').textContent).toBe('Grade and version');
      expect(page.$('ready-intro').textContent.startsWith(PC.MEASURES[id].name + '. '), id).toBe(true);
      expect(page.options('grade'), id).toEqual(gradesOf(id).map((grade) => [grade, gradeName(grade)]));
      // No grade is chosen for the teacher.
      expect(page.chosen('grade'), id).toBeNull();
      expect(page.$('form-line').textContent).toBe('Choose a grade.');
      for (const grade of gradesOf(id)) {
        page.choose('grade', grade);
        const versions = Object.keys(setsOf(id)[grade]).sort();
        expect(versions).toEqual(['A', 'B', 'C']);
        expect(page.options('version'), id + grade).toEqual(versions.map((version) => [version, 'Version ' + version]));
        for (const version of versions) {
          page.choose('version', version);
          const data = setsOf(id)[grade][version], practice = PC.MEASURES[id].practice.length;
          expect(data.problems).toHaveLength(25);
          // Quantity Discrimination asks questions (which of two numbers is bigger); the other checks set problems.
          expect(page.$('form-line').textContent, id + grade + version).toBe(data.problems.length + ' ' + nounOf(id) + 's. ' + minutes(data.timeLimit).replace(/^./, (c) => c.toUpperCase()) + '. '
            + practice + (practice === 1 ? ' practice question first.' : ' practice questions first.'));
          // The largest number in this version, and for Math Fluency what it asks the learner to do.
          const numbers = data.problems.flatMap((p) => [p.a, p.b, p.left, p.right, p.answer, ...(String(p.display || '').match(/\d+/g) || []).map(Number)]).filter((n) => typeof n === 'number');
          const ops = ['add', 'sub', 'mul', 'div'].filter((op) => data.problems.some((p) => p.op === op)).map((op) => ({ add: 'add', sub: 'subtract', mul: 'multiply', div: 'divide' })[op]);
          const mix = ops.length ? (ops.slice(0, -1).join(', ') + ' and ' + ops[ops.length - 1]).replace(/^./, (c) => c.toUpperCase()) + '. ' : '';
          expect(ops.length === 0 || ops.length >= 2).toBe(true);
          expect(page.$('form-sub').textContent, id + grade + version).toBe(mix + 'Numbers up to ' + Math.max(...numbers) + '.');
        }
      }
      for (const radio of page.d.querySelectorAll('input[name="version"]')) expect(radio.getAttribute('aria-describedby')).toBe('version-hint');
      page.wordsAreRight();
      page.$('back-2').click();
      expect(page.seen('step-1')).toBe(true);
    }
    expect(page.$('version-hint').textContent).toBe('Three versions of the same kind, so a learner does not see the same one twice in a row.');
    expect(PC.MEASURES.quantity_discrimination.practice.length + PC.MEASURES.missing_number.practice.length + PC.MEASURES.math_computation.practice.length).toBe(4);
    expect(page.asked).toEqual([]);
    page.dom.window.close();
  });

  it('with no grade chosen it says so and stays', () => {
    const page = openPage();
    page.choose('check', 'quantity_discrimination');
    page.$('next-1').click();
    page.$('next-2').click();
    expect(page.seen('step-2') && !page.seen('step-3')).toBe(true);
    expect(page.$('step-2-problem').textContent).toBe('Choose a grade to go on.');
    page.choose('grade', 'K');
    expect(page.$('step-2-problem').textContent).toBe('');
    expect(page.chosen('version')).toBe('A');
    expect(page.files).toEqual([]);
    page.dom.window.close();
  });
});

describe('a ready check, from the choice to a file that runs', () => {
  it('the source check used on every built file fires on each kind of thing it forbids', () => {
    for (const sample of ['see https://x.test', 'window.open(u)', 'win.fetch(u)', 'location.href = u', 'document.cookie', 'new Function(x)', '<form action=x>', '<a class="b" href="x">',
      'new XMLHttpRequest()', 'navigator.sendBeacon(u)', 'import(u)']) expect(audit(sample), sample).not.toEqual([]);
    expect(audit('Type the answer to each one. 7 + 8 =')).toEqual([]);
  });

  it.each([['quantity_discrimination', 'K', 'A', 'quantity-discrimination-gK-A.html'], ['missing_number', '1', 'B', 'missing-number-g1-B.html'], ['math_computation', '3', 'C', 'math-computation-g3-C.html']])(
    '%s, grade %s, version %s: the file is the builder\'s own, cannot reach the network, and plays', async (id, grade, version, fileName) => {
      const page = openPage();
      page.choose('check', id);
      page.$('next-1').click();
      page.choose('grade', grade);
      page.choose('version', version);
      page.$('next-2').click();
      expect(page.seen('step-3')).toBe(true);
      expect(page.w.document.title).toBe(NAME + ': Make a math check, step 3 of 3');
      await page.made();
      expect(page.seen('summary') && !page.seen('build-problem')).toBe(true);
      const html = page.built();
      // The same bytes the builder gives when it is called directly with the same form.
      const lesson = PC.lessonFromMathForm({ bank: BANK, measure: id, grade, form: version });
      expect(html).toBe(PC.buildCheckPacket({ lesson, loader: TH }).html);
      expectNoWayOut(html);
      const data = setsOf(id)[grade][version], manifest = manifestOf(html);
      expect(manifest.packet).toMatchObject({ id: PC.MEASURES[id].slug + '-g' + grade.toLowerCase(), form: version, mode: 'probe' });
      expect(manifest.check).toMatchObject({ items: data.problems.length, practiceItems: PC.MEASURES[id].practice.length, timeLimitS: data.timeLimit, teacherCode: 'none' });
      expect(manifest.title).toBe(PC.MEASURES[id].name + ' check (' + grade + version + ')');
      // The summary: check, grade, version, problems, time, practice first, the answers screen and the file with its size.
      const bytes = page.files[page.files.length - 1].size;
      expect(page.files[page.files.length - 1].type).toBe('text/html');
      expect(Math.abs(bytes - 90000)).toBeLessThan(10000);
      const size = Math.round(bytes / 1000) + ' KB';
      const time = minutes(data.timeLimit).replace(/^./, (c) => c.toUpperCase());
      // What there is to answer has the check's own word: "questions" for Quantity Discrimination, "problems" for the others.
      const noun = nounOf(id), Nouns = noun.replace(/^./, (c) => c.toUpperCase()) + 's';
      expect([id, noun]).toEqual([id, id === 'quantity_discrimination' ? 'question' : 'problem']);
      expect(page.$('summary-facts').textContent).toBe('25 ' + noun + 's. ' + time + '. ' + size + '.');
      const rows = page.rows();
      expect(Object.keys(rows)).toEqual(['Check', 'Grade', 'Version', Nouns, 'Time', 'Practice first', 'Answers screen', 'File']);
      expect(rows.Check).toBe(PC.MEASURES[id].name);
      expect(rows.Grade).toBe(gradeName(grade));
      expect(rows.Version).toBe(version);
      expect(rows[Nouns]).toMatch(new RegExp('^25\\. (?:[A-Z][a-z, ]+\\. )?Numbers up to \\d+\\. ' + (lesson.check.allowSkip ? 'The learner may skip a ' + noun + '\\.' : 'There is no skip button\\.') + '$'));
      expect(rows.Time).toBe(time + '. The clock does not stop and does not give time back. '
        + (manifest.check.scoreUnit === 'digits_correct_per_minute' ? 'The score is digits correct per minute.' : 'The score is the number of ' + noun + 's correct.'));
      // No line of the summary calls a Quantity Discrimination item a problem, and none calls another check's a question (the practice questions apart).
      const summaryText = page.$('summary-facts').textContent + ' ' + Object.entries(rows).filter(([name]) => name !== 'Practice first').map((row) => row.join(' ')).join(' ');
      expect(summaryText).not.toMatch(noun === 'question' ? /problem/i : /question/i);
      const practice = PC.MEASURES[id].practice.length;
      expect(rows['Practice first']).toBe(practice === 1 ? '1 practice question, not scored.' : practice + ' practice questions, not scored.');
      expect(rows['Answers screen']).toBe('Opens with one button when the check is finished. No teacher code is set.');
      expect(rows.File).toBe(fileName + ', ' + size + '.');
      expect(page.$('making-said').textContent).toBe('The file is ready: 25 ' + noun + 's, ' + size + '.');
      // Try it opens the preview page with the file's address after the #; Save hands over the same file under the builder's name.
      expect(page.seen('try') && page.seen('save') && !page.seen('after-save')).toBe(true);
      expect(page.$('try').getAttribute('href')).toBe('packets-try.html#blob:https://packets.test/' + page.files.length);
      expect(page.$('try').getAttribute('target')).toBe('_blank');
      expect(page.$('try').getAttribute('rel')).toBe('noopener');
      page.$('save').click();
      expect(page.downloads).toEqual([{ name: fileName, href: 'blob:https://packets.test/' + page.files.length }]);
      expect(fileName).toBe(PC.MEASURES[id].slug + '-g' + grade + '-' + version + '.html');
      expect(page.seen('after-save') && !page.seen('after-code')).toBe(true);
      expect(page.$('after-save').querySelectorAll('ol li')).toHaveLength(3);
      expect(page.$('csv-label').textContent).toBe(TH.DEFAULT_LABELS.save_csv);
      // Nothing was asked of the network, and one key is kept.
      expect(page.asked).toEqual([]);
      expect(Object.keys(page.w.localStorage)).toEqual([KEY]);
      expect(page.d.cookie).toBe('');
      expect(page.d.querySelectorAll('script')).toHaveLength(SCRIPTS.length);
      page.wordsAreRight();
      page.dom.window.close();

      // The file runs: a label, the practice questions, Start, and the first answer moves on to the second problem.
      const file = play(html);
      expect(file.text()).toContain('This is a check to see how you are doing. It is not for a grade.');
      file.start(lesson);
      expect(file.heading()).toBe('Question 1 of 25');
      const before = file.text();
      file.answer(scored(lesson)[0]);
      expect(file.heading()).toBe('Question 2 of 25');
      expect(file.text()).not.toBe(before);
      // One try and no word about right or wrong.
      expect(file.text()).not.toMatch(/Yes!|Not quite|That is right/);
      file.close();
    });

  it('going back clears the file; another version is another file', async () => {
    const page = openPage();
    page.choose('check', 'math_computation');
    page.$('next-1').click();
    page.choose('grade', '2');
    page.$('next-2').click();
    await page.made();
    const first = page.built();
    expect(first).toBe(direct('math_computation', '2', 'A').html);
    page.$('back-3').click();
    expect(page.seen('step-2') && !page.seen('summary')).toBe(true);
    expect(page.chosen('grade')).toBe('2');
    page.choose('version', 'B');
    page.$('next-2').click();
    await page.made();
    expect(page.built()).toBe(direct('math_computation', '2', 'B').html);
    expect(page.built()).not.toBe(first);
    expect(page.rows().File).toMatch(/^math-computation-g2-B\.html, \d+ KB\.$/);
    page.dom.window.close();
  });
});

describe('my own problems', () => {
  it('a typed list is looked at as it is typed, builds the builder\'s own file, and plays', async () => {
    const page = openPage();
    const text = '7+8, 12-5\n6x4; 20/4, 9 ' + String.fromCharCode(0xF7) + ' 3, 4 * 4';
    page.choose('check', 'own');
    page.$('next-1').click();
    expect(page.seen('panel-own') && !page.seen('panel-ready')).toBe(true);
    expect(page.$('step-2-title').textContent).toBe('Your problems');
    expect(page.$('own-line').textContent).toBe('Type or paste your problems above.');
    expect(page.$('problems-hint').textContent).toBe('One problem on each line, or commas between them. Use + - x * ' + String.fromCharCode(0xF7) + ' or /. Whole numbers only. Each problem is looked at as you type.');
    // The time limit: no clock, 1, 2, 3 or 5 minutes. Skipping is on to begin with.
    expect(page.options('time')).toEqual([['0', 'No clock'], ['60', '1 minute'], ['120', '2 minutes'], ['180', '3 minutes'], ['300', '5 minutes']]);
    expect(page.chosen('time')).toBe('120');
    expect(page.$('f-skip').checked).toBe(true);
    expect(squash(page.$('f-skip').closest('label').textContent)).toBe('Learners may skip a problem');
    expect(page.$('title-hint').textContent).toBe('The learner sees it at the top of the file. Left empty, it is "Math check".');
    page.set('f-problems', text);
    await page.until(() => page.typed().length === 6, 'the six problems');
    const minus = String.fromCharCode(0x2212), times = String.fromCharCode(0xD7), divide = String.fromCharCode(0xF7);
    expect(page.typed()).toEqual([[true, '7 + 8', 'Ready. The answer is 15.'], [true, '12 ' + minus + ' 5', 'Ready. The answer is 7.'], [true, '6 ' + times + ' 4', 'Ready. The answer is 24.'],
      [true, '20 ' + divide + ' 4', 'Ready. The answer is 5.'], [true, '9 ' + divide + ' 3', 'Ready. The answer is 3.'], [true, '4 ' + times + ' 4', 'Ready. The answer is 16.']]);
    expect(page.$('own-line').textContent).toBe('6 of 6 problems can be used.');
    page.set('f-title', 'Facts to 20');
    page.$('next-2').click();
    expect(page.seen('step-3')).toBe(true);
    await page.made();
    expect(page.seen('summary')).toBe(true);
    // The same bytes the builder gives for the same typed text.
    const lesson = PC.lessonFromMathProblems({ title: 'Facts to 20', problems: PC.parseProblems(text), timeLimitS: 120, allowSkip: true });
    const html = page.built();
    expect(html).toBe(PC.buildCheckPacket({ lesson, loader: TH }).html);
    expectNoWayOut(html);
    expect(manifestOf(html)).toMatchObject({ title: 'Facts to 20', packet: { form: 'custom' }, check: { measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', items: 6, practiceItems: 0, timeLimitS: 120 } });
    const size = Math.round(page.files[page.files.length - 1].size / 1000) + ' KB';
    expect(page.$('summary-facts').textContent).toBe('6 problems. 2 minutes. ' + size + '.');
    expect(page.rows()).toEqual({ Check: 'My own problems', Title: 'Facts to 20',
      Problems: '6: 7 + 8, 12 ' + minus + ' 5, 6 ' + times + ' 4, 20 ' + divide + ' 4, 9 ' + divide + ' 3, 4 ' + times + ' 4. The learner may skip a problem.',
      Time: '2 minutes. The clock does not stop and does not give time back. The score is digits correct per minute.', 'Practice first': 'None.',
      'Answers screen': 'Opens with one button when the check is finished. No teacher code is set.', File: 'facts-to-20.html, ' + size + '.' });
    page.$('save').click();
    expect(page.downloads).toEqual([{ name: 'facts-to-20.html', href: 'blob:https://packets.test/' + page.files.length }]);
    page.wordsAreRight();

    // No clock and no skipping: the file has neither, and the score is a count.
    page.$('back-3').click();
    page.choose('time', '0');
    page.$('f-skip').click();
    page.set('f-title', '');
    page.$('next-2').click();
    await page.made();
    const calm = page.built();
    expect(calm).toBe(PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: '', problems: PC.parseProblems(text), timeLimitS: null, allowSkip: false }), loader: TH }).html);
    expect(manifestOf(calm)).toMatchObject({ title: 'Math check', check: { measure: 'math_items', scoreUnit: 'items_correct', timeLimitS: null, clock: 'no time limit' } });
    expect(lessonOf(calm).check.allowSkip).toBe(false);
    expect(page.$('summary-facts').textContent).toMatch(/^6 problems\. No clock\. \d+ KB\.$/);
    expect(page.rows().Time).toBe('No clock. The score is the number of problems correct.');
    expect(page.rows().Problems.endsWith('There is no skip button.')).toBe(true);
    expect(page.rows().File).toMatch(/^math-check\.html, /);
    expect(page.asked).toEqual([]);
    page.dom.window.close();

    const file = play(html);
    file.start(lesson);
    expect(file.heading()).toBe('Question 1 of 6');
    expect(file.q('.prompt').textContent).toBe('7 + 8 =');
    file.answer(scored(lesson)[0]);
    expect(file.heading()).toBe('Question 2 of 6');
    file.close();
  });

  it('a line that cannot be used shows the builder\'s reason, and the page does not go on until it is changed', async () => {
    const page = openPage();
    const divide = String.fromCharCode(0xF7);
    await page.own('7+8, seven plus eight\n10000+1, 5/0, 2^3, 3 + 4 + 5 = twelve, 1.5+2');
    const rows = Object.fromEntries(page.typed().map(([ok, shown, says]) => [shown, { ok, says }]));
    expect(rows['7 + 8']).toEqual({ ok: true, says: 'Ready. The answer is 15.' });
    expect(rows['seven plus eight']).toEqual({ ok: false, says: 'This is not a problem. Write it like 7+8, or like 3 + 4 + 5 = 12.' });
    expect(rows['10000+1']).toEqual({ ok: false, says: 'Both numbers must be whole numbers from 0 to 9999.' });
    expect(rows['5/0']).toEqual({ ok: false, says: '5 ' + divide + ' 0 divides by 0.' });
    for (const typed of ['2^3', '3 + 4 + 5 = twelve', '1.5+2']) expect(rows[typed], typed).toEqual({ ok: false, says: 'This is not a problem. Write it like 7+8, or like 3 + 4 + 5 = 12.' });
    // Each reason is the builder's own sentence for that line.
    expect(() => PC.parseProblems('seven plus eight')).toThrow('Problem 1: "seven plus eight" is not a problem. Write it like 7+8, or like 3 + 4 + 5 = 12.');
    expect(() => PC.lessonFromMathProblems({ problems: PC.parseProblems('10000+1') })).toThrow('Problem 1: both numbers must be whole numbers from 0 to 9999.');
    expect(() => PC.lessonFromMathProblems({ problems: PC.parseProblems('5/0') })).toThrow('Problem 1: 5 ' + divide + ' 0 divides by 0.');
    expect(page.$('own-line').textContent).toBe('1 of 7 problems can be used.');
    expect([...page.$('own-list').children].map((row) => row.className)).toEqual(['is-ok', 'is-out', 'is-out', 'is-out', 'is-out', 'is-out', 'is-out']);
    page.$('next-2').click();
    expect(page.seen('step-2') && !page.seen('step-3')).toBe(true);
    expect(page.$('step-2-problem').textContent).toBe('6 problems cannot be used. Change them or take them out to go on.');
    expect(page.files).toEqual([]);
    page.wordsAreRight();
    // With the lines changed it goes on.
    page.set('f-problems', '7+8, 9+9');
    await page.until(() => page.typed().length === 2, 'the two problems');
    expect(page.$('step-2-problem').textContent).toBe('');
    page.$('next-2').click();
    await page.made();
    expect(manifestOf(page.built()).check.items).toBe(2);
    page.dom.window.close();
  });

  it('a division has to come out even, however it is written', async () => {
    const page = openPage();
    const divide = String.fromCharCode(0xF7);
    await page.own('8/2, 7/2');
    expect(page.typed()).toEqual([[true, '8 ' + divide + ' 2', 'Ready. The answer is 4.'], [false, '7/2', '7 ' + divide + ' 2 has a remainder. Use a division that comes out even.']]);
    // The builder's sentence also names a choice this page does not offer; the page leaves that part out.
    expect(() => PC.lessonFromMathProblems({ problems: PC.parseProblems('7/2') })).toThrow('Problem 1: 7 ' + divide + ' 2 has a remainder. Use a division that comes out even, or allow remainders.');
    expect(read(SCRIPT)).not.toContain('allowRemainders');
    page.$('next-2').click();
    expect(page.seen('step-2')).toBe(true);
    expect(page.$('step-2-problem').textContent).toBe('1 problem cannot be used. Change it or take it out to go on.');
    expect(page.files).toEqual([]);
    // Written with its answer, it is the same problem and gets the same reason.
    for (const typed of ['7 / 2 = 3', '7 ' + divide + ' 2 = 3', '7:2']) {
      page.set('f-problems', typed);
      await page.until(() => page.typed().length === 1 && page.typed()[0][1] === typed, typed);
      expect(page.typed()[0], typed).toEqual([false, typed, '7 ' + divide + ' 2 has a remainder. Use a division that comes out even.']);
      page.$('next-2').click();
      expect(page.seen('step-2') && page.files.length === 0, typed).toBe(true);
    }
    page.dom.window.close();
  });

  it('a problem typed with its answer: a plain one has to agree with the arithmetic, a longer one keeps the answer given', async () => {
    const page = openPage();
    await page.own('7 + 8 = 16, 7 + 8 = 15, 3 + 4 + 5 = 12, 3-8');
    const minus = String.fromCharCode(0x2212);
    expect(page.typed()).toEqual([[false, '7 + 8 = 16', '7 + 8 is 15, not 16.'], [true, '7 + 8', 'Ready. The answer is 15.'], [true, '3 + 4 + 5', 'Ready. The answer you gave is 12.'],
      [true, '3 ' + minus + ' 8', 'Ready. The answer is -5.']]);
    page.set('f-problems', '7 + 8 = 15, 3 + 4 + 5 = 12, 3-8');
    await page.until(() => page.typed().length === 3, 'the three problems');
    page.$('next-2').click();
    await page.made();
    const sealed = lessonOf(page.built());
    // "7 + 8 = 15" is the plain problem 7 + 8: its answer comes from the arithmetic, never from what was typed.
    expect(sealed.blocks[0].items.map((item) => item.word)).toEqual(['7 + 8', '3 + 4 + 5', '3 ' + minus + ' 8']);
    const codec = TH.checkCodec(TH.sha256);
    expect(sealed.blocks[0].items.map((item) => codec.unscramble(item.key, sealed.check.salt, item.id))).toEqual(['15', '12', '-5']);
    // No answer is in the file in the clear.
    for (const item of sealed.blocks[0].items) expect(item).not.toHaveProperty('answer');
    page.dom.window.close();
  });

  it('an empty list and a list that is too long are refused with a plain reason', async () => {
    const page = openPage();
    page.choose('check', 'own');
    page.$('next-1').click();
    page.$('next-2').click();
    expect(page.seen('step-2')).toBe(true);
    expect(page.$('step-2-problem').textContent).toBe('Type at least one problem to go on.');
    const many = Array.from({ length: 61 }, (_, i) => i + '+1').join(', ');
    page.set('f-problems', many);
    await page.until(() => page.typed().length === 61, 'the 61 problems');
    expect(page.$('own-line').textContent).toBe('A check needs 1 to 60 problems. This list has 61.');
    expect(() => PC.lessonFromMathProblems({ problems: PC.parseProblems(many) })).toThrow('A check needs 1 to 60 problems. This list has 61.');
    page.$('next-2').click();
    expect(page.seen('step-2')).toBe(true);
    expect(page.$('step-2-problem').textContent).toBe('A check needs 1 to 60 problems. This list has 61.');
    expect(page.files).toEqual([]);
    page.set('f-problems', many.replace(/, 60\+1$/, ''));
    await page.until(() => page.typed().length === 60, 'the 60 problems');
    expect(page.$('own-line').textContent).toBe('60 of 60 problems can be used.');
    page.$('next-2').click();
    await page.made();
    expect(manifestOf(page.built()).check.items).toBe(60);
    page.dom.window.close();
  });
});

describe('the teacher code', () => {
  const CODE = 'tulip-47';

  it('a code that is too short is refused, in the builder\'s words, and no file is made', () => {
    const page = openPage();
    page.choose('check', 'quantity_discrimination');
    page.$('next-1').click();
    page.choose('grade', '1');
    expect(page.$('code-box').open).toBe(false);
    expect(page.$('code-line').textContent).toBe('No code: the answers screen opens with one button when the check is finished.');
    page.set('f-code', 'abc');
    expect(page.$('code-line').textContent).toBe('The teacher code needs 4 or more characters.');
    expect(() => direct('quantity_discrimination', '1', 'A', { teacherCode: 'abc' })).toThrow('The teacher code needs 4 or more characters.');
    page.$('next-2').click();
    expect(page.seen('step-2') && !page.seen('step-3')).toBe(true);
    expect(page.$('step-2-problem').textContent).toBe('The teacher code needs 4 or more characters. Make it longer, or leave it empty for no code.');
    // The closed box opens so that the reason is beside the code.
    expect(page.$('code-box').open).toBe(true);
    expect(page.files).toEqual([]);
    // Spaces around a code do not count, as in the builder.
    page.set('f-code', '  abc  ');
    page.$('next-2').click();
    expect(page.seen('step-2')).toBe(true);
    page.set('f-code', 'abcd');
    expect(page.$('code-line').textContent).toBe('The answers screen will ask for this code.');
    expect(page.$('step-2-problem').textContent).toBe('');
    page.dom.window.close();
  });

  it('the code box hides what is typed, and "Show" lets the teacher read it back', () => {
    const page = openPage();
    const box = page.$('f-code'), show = page.$('code-show');
    // As the page is written: a password box that the browser is asked not to fill in, and a toggle button that says what it shows.
    expect([box.getAttribute('type'), box.getAttribute('autocomplete'), box.getAttribute('autocapitalize'), box.getAttribute('spellcheck')]).toEqual(['password', 'off', 'none', 'false']);
    expect([show.tagName, show.getAttribute('type'), show.textContent, show.getAttribute('aria-label'), show.getAttribute('aria-pressed'), show.getAttribute('aria-controls')])
      .toEqual(['BUTTON', 'button', 'Show', 'Show the teacher code', 'false', 'f-code']);
    // The name a screen reader says starts with the word on the button, and stays the same: aria-pressed carries the state.
    expect(show.getAttribute('aria-label').startsWith(show.textContent)).toBe(true);
    expect(show.closest('#code-box .field')).toBeTruthy();
    page.set('f-code', CODE);
    show.click();
    expect([box.getAttribute('type'), show.getAttribute('aria-pressed'), box.value, show.textContent, show.getAttribute('aria-label')]).toEqual(['text', 'true', CODE, 'Show', 'Show the teacher code']);
    expect(page.$('code-line').textContent).toBe('The answers screen will ask for this code.');
    show.click();
    expect([box.getAttribute('type'), show.getAttribute('aria-pressed'), box.value]).toEqual(['password', 'false', CODE]);
    // Shown or hidden, the code is in no attribute and no text of the page. Putting the page back to how it started hides the box again.
    show.click();
    expect(box.getAttribute('type')).toBe('text');
    expect([...page.d.querySelectorAll('*')].flatMap((node) => [...node.attributes]).some((attribute) => attribute.value.includes(CODE))).toBe(false);
    expect(page.d.documentElement.textContent).not.toContain(CODE);
    page.$('forget').click();
    expect([box.getAttribute('type'), show.getAttribute('aria-pressed'), box.value]).toEqual(['password', 'false', '']);
    page.dom.window.close();
  });

  it('a set code is what the file\'s answers screen asks for, and the page keeps it nowhere', async () => {
    const page = openPage();
    await page.own('2+2, 3+3');
    page.set('f-code', CODE);
    page.$('next-2').click();
    await page.made();
    expect(page.seen('summary')).toBe(true);
    const html = page.built();
    const lesson = PC.lessonFromMathProblems({ title: '', problems: PC.parseProblems('2+2, 3+3'), timeLimitS: 120, allowSkip: true });
    expect(html).toBe(PC.buildCheckPacket({ lesson, teacherCode: CODE, loader: TH }).html);
    expect(html).not.toBe(PC.buildCheckPacket({ lesson, loader: TH }).html);
    expectNoWayOut(html);
    // The file holds the code only as a salted hash, repeated many times: the code itself is not in it.
    expect(html).not.toContain(CODE);
    const lock = lessonOf(html).check.lock, codec = TH.checkCodec(TH.sha256);
    expect(lock.rounds).toBe(TH.CHECK_ROUNDS);
    expect(lock.hash).toBe(codec.lockHash(CODE, lock.salt, lock.rounds));
    expect(lock.hash).not.toBe(codec.lockHash(CODE + '8', lock.salt, lock.rounds));
    expect(manifestOf(html).check.teacherCode).toMatch(/^set; kept only as a salted SHA-256 hash/);
    expect(page.rows()['Answers screen']).toBe('Opens only with your teacher code.');
    page.$('save').click();
    expect(page.seen('after-code')).toBe(true);
    expect(page.$('after-code').textContent).toBe('The answers screen inside the file opens with your teacher code. This page has not kept the code.');
    // The code is in no storage, no address, no title and no text of the page: only in its box, until the page closes.
    expect(page.kept()).not.toContain(CODE);
    expect(JSON.parse(page.w.localStorage.getItem(KEY))).toEqual({ v: 1, check: 'own', grades: {}, version: '', problems: '2+2, 3+3', title: '', time: 120, skip: true });
    expect(page.w.sessionStorage.length).toBe(0);
    expect(page.d.cookie).toBe('');
    expect(page.w.location.href).toBe(ADDRESS);
    expect(page.w.history.length).toBe(1);
    expect(page.$('try').getAttribute('href')).toBe('packets-try.html#blob:https://packets.test/' + page.files.length);
    expect(page.downloads[0].name).toBe('math-check.html');
    expect(page.d.title + page.d.documentElement.textContent).not.toContain(CODE);
    expect([...page.d.querySelectorAll('*')].flatMap((node) => [...node.attributes]).some((attribute) => attribute.value.includes(CODE))).toBe(false);
    expect(page.$('f-code').value).toBe(CODE);
    expect(page.asked).toEqual([]);
    const storage = { [KEY]: page.w.localStorage.getItem(KEY) };
    page.dom.window.close();
    // Opened again, the page has the choices and not the code.
    const again = openPage({ storage });
    expect(again.chosen('check')).toBe('own');
    expect(again.$('f-code').value).toBe('');
    again.$('next-1').click();
    expect(again.$('f-problems').value).toBe('2+2, 3+3');
    expect(again.$('code-line').textContent).toBe('No code: the answers screen opens with one button when the check is finished.');
    again.dom.window.close();

    // In the file: the answers screen has no open button; it asks for the code, refuses a wrong one and opens with the right one.
    const file = play(html);
    file.start(lesson);
    scored(lesson).forEach((raw) => file.answer(raw));
    expect(file.heading()).toBe('You finished. Thank you.');
    expect(file.q('[data-teacher-open]')).toBeNull();
    expect(file.q('label[for="teacher-code"]').textContent).toBe('Teacher code');
    const message = () => (file.q('[data-teacher] .status') || { textContent: '' }).textContent;
    const offer = async (code) => {
      file.q('#teacher-code').value = code;
      file.q('[data-teacher-show]').click();
      for (let i = 0; i < 3000 && !file.q('[data-review]') && message() === 'Checking the code...'; i++) await new Promise((resolve) => setTimeout(resolve, 25));
    };
    await offer('tulip-48');
    expect(message()).toBe('That code is not correct. Tries left before a 30-second wait: 4.');
    expect(file.q('[data-review]')).toBeNull();
    await offer(CODE);
    expect(file.heading()).toBe('Results for the teacher');
    expect(file.d.querySelectorAll('[data-review] tbody tr')).toHaveLength(2);
    file.close();
  });

  it('with no code the file\'s answers screen opens with one button, as the page says', async () => {
    const page = openPage();
    await page.own('2+2, 3+3');
    page.$('next-2').click();
    await page.made();
    const html = page.built();
    expect(lessonOf(html).check.lock).toBeNull();
    page.dom.window.close();
    const lesson = PC.lessonFromMathProblems({ title: '', problems: PC.parseProblems('2+2, 3+3'), timeLimitS: 120, allowSkip: true });
    const file = play(html);
    file.start(lesson);
    scored(lesson).forEach((raw) => file.answer(raw));
    expect(file.q('#teacher-code')).toBeNull();
    expect(file.q('[data-teacher-open]').textContent).toBe('For the teacher: show results');
    file.q('[data-teacher-open]').click();
    expect(file.heading()).toBe('Results for the teacher');
    file.close();
  });
});

describe('the same choices make the same bytes', () => {
  it('two visits, the same file; with a code, the same file again', async () => {
    const make = async (code) => {
      const page = openPage();
      page.choose('check', 'missing_number');
      page.$('next-1').click();
      page.choose('grade', '2');
      page.choose('version', 'C');
      if (code) page.set('f-code', code);
      page.$('next-2').click();
      await page.made();
      const html = page.built();
      // Made again on the same visit, it is the same file.
      page.$('back-3').click();
      page.$('next-2').click();
      await page.made();
      expect(page.built()).toBe(html);
      page.dom.window.close();
      return html;
    };
    const plain = await make(''), again = await make('');
    expect(again).toBe(plain);
    expect(createHash('sha256').update(plain, 'utf8').digest('hex')).toBe(direct('missing_number', '2', 'C').sha256);
    const locked = await make('tulip-47'), lockedAgain = await make('tulip-47');
    expect(lockedAgain).toBe(locked);
    expect(locked).not.toBe(plain);
    expect(locked).toBe(direct('missing_number', '2', 'C', { teacherCode: 'tulip-47' }).html);
    // Neither the page's script nor the builder reads a clock or rolls a number.
    for (const file of [SCRIPT, 'packet_check_builder.js']) expect(read(file), file).not.toMatch(/\bDate\b|Math\.random|performance\b|getRandomValues/);
    expect(lessonOf(plain)).not.toHaveProperty('createdAt');
  });
});

describe('what the page keeps, and how it copes', () => {
  it('keeps the last choices in this browser only, opens the way it was left, and forgets them when asked', async () => {
    const page = openPage();
    page.choose('check', 'math_computation');
    page.$('next-1').click();
    page.choose('grade', '4');
    page.choose('version', 'B');
    page.$('back-2').click();
    page.choose('check', 'own');
    page.$('next-1').click();
    page.set('f-problems', '6x7');
    page.set('f-title', 'Sixes');
    page.choose('time', '300');
    page.$('f-skip').click();
    await page.until(() => page.typed().length === 1, 'the one problem');
    const kept = { v: 1, check: 'own', grades: { math_computation: '4' }, version: 'B', problems: '6x7', title: 'Sixes', time: 300, skip: false };
    expect(JSON.parse(page.w.localStorage.getItem(KEY))).toEqual(kept);
    expect(Object.keys(page.w.localStorage)).toEqual([KEY]);
    expect(page.d.cookie).toBe('');
    const told = squash(page.$('about-page').textContent);
    for (const what of ['the check', 'the grade', 'the version', 'the list', 'the title', 'the time limit', 'the skip choice', 'Nothing is kept anywhere else.']) expect(told).toContain(what);
    const storage = { [KEY]: page.w.localStorage.getItem(KEY) };
    page.dom.window.close();

    // A new visit starts at step 1 with everything as it was left.
    const next = openPage({ storage });
    expect(next.seen('step-1')).toBe(true);
    expect(next.chosen('check')).toBe('own');
    next.$('next-1').click();
    expect([next.$('f-problems').value, next.$('f-title').value, next.chosen('time'), next.$('f-skip').checked]).toEqual(['6x7', 'Sixes', '300', false]);
    expect(next.typed()).toEqual([[true, '6 ' + String.fromCharCode(0xD7) + ' 7', 'Ready. The answer is 42.']]);
    next.$('back-2').click();
    next.choose('check', 'math_computation');
    next.$('next-1').click();
    expect([next.chosen('grade'), next.chosen('version')]).toEqual(['4', 'B']);
    // Forget: the key is gone, the page is back to how it started, and a typed code goes too.
    next.set('f-code', 'tulip-47');
    next.$('forget').click();
    expect(next.w.localStorage.getItem(KEY)).toBeNull();
    expect(next.$('forget-said').textContent).toBe('Done. The page is back to how it started.');
    expect(next.seen('step-1')).toBe(true);
    expect(next.chosen('check')).toBeNull();
    expect(next.$('f-code').value).toBe('');
    next.choose('check', 'math_computation');
    next.$('next-1').click();
    expect(next.chosen('grade')).toBeNull();
    expect(next.chosen('version')).toBe('A');
    next.dom.window.close();

    // What another page or an older version left under the key does not break this one.
    for (const junk of ['not json', '{"v":2,"check":"own"}', JSON.stringify({ v: 1, check: 'spelling', grades: { math_computation: '9', __proto__: 'x' }, version: 'ZZ', problems: 7, title: null, time: 45, skip: 'yes' })]) {
      const odd = openPage({ storage: { [KEY]: junk } });
      expect(odd.seen('step-1') && !odd.seen('load-problem'), junk).toBe(true);
      expect(odd.chosen('check'), junk).toBeNull();
      odd.choose('check', 'math_computation');
      odd.$('next-1').click();
      expect([odd.chosen('grade'), odd.chosen('version')], junk).toEqual([null, 'A']);
      odd.dom.window.close();
    }
  });

  it('never stops at an error: a part that did not load, and a file that could not be made, are said plainly', async () => {
    for (const [file, part] of [['psychometric_math_probes.js', 'the problem sets'], ['packet_check_builder.js', 'the part that makes a check'], ['word_sounds_take_home_loader.js', 'the part that writes the file']]) {
      const broken = openPage({ without: [file] });
      expect(broken.seen('load-problem') && !broken.seen('loading') && !broken.seen('step-1'), file).toBe(true);
      expect(broken.$('load-problem-text').textContent, file).toBe('Missing: ' + part + '. Check the connection, then load the page again. Nothing has been lost.');
      expect(broken.d.querySelector('#load-problem a').getAttribute('href')).toBe(PAGE);
      broken.wordsAreRight();
      broken.dom.window.close();
    }
    // The file cannot be written once: the page says so and Try again works.
    let fail = true;
    const page = openPage({ after: { 'word_sounds_take_home_loader.js': (w) => {
      const real = w.AlloWordSoundsTakeHome.buildHtml;
      w.AlloWordSoundsTakeHome.buildHtml = function (...args) { if (fail) throw new Error('no room'); return real.apply(this, args); };
    } } });
    page.choose('check', 'quantity_discrimination');
    page.$('next-1').click();
    page.choose('grade', 'K');
    page.$('next-2').click();
    await page.made();
    expect(page.seen('build-problem') && !page.seen('summary') && !page.seen('save') && !page.seen('try')).toBe(true);
    expect(page.$('build-problem-text').textContent).toBe('The file could not be put together (no room). Your choices are still here.');
    fail = false;
    page.$('retry').click();
    await page.until(() => page.seen('summary'), 'the file after trying again');
    expect(page.seen('build-problem')).toBe(false);
    expect(page.built()).toBe(direct('quantity_discrimination', 'K', 'A').html);
    page.dom.window.close();
  });
});

// ---------------------------------------------------------------------------
// The paper copy: the same check on paper, from the lesson the file is made from
// ---------------------------------------------------------------------------
const CODEC = TH.checkCodec(TH.sha256);
const DIVIDE = String.fromCharCode(0xF7);
// The items as the built file holds them, in order: the label the paper should give each, the problem as the file writes
// it, the answer unscrambled from the file, and how the paper shows the problem (a line with no blank gets "= __").
function fileItems(html) {
  const lesson = lessonOf(html), salt = lesson.check.salt;
  let n = 0;
  return lesson.blocks[0].items.map((item) => ({ practice: !!item.practice, label: item.practice ? 'Sample' : String(++n), word: item.word,
    answer: CODEC.unscramble(item.key, salt, item.id), printed: item.display != null && !/_{2,}/.test(item.display) ? item.word + ' = __' : item.word }));
}
// One printed item, read back from what is on the paper: its label and the problem its boxes show.
function printedItem(li) {
  const label = li.querySelector('.pn').textContent;
  if (li.classList.contains('pi-pair')) return [label, [...li.querySelectorAll('.pp-n')].map((n) => n.textContent).join(' or ')];
  if (li.classList.contains('pi-line')) return [label, [...li.querySelector('.pl').childNodes].map((n) => (n.nodeType === 3 ? n.textContent : n.classList.contains('pblank') ? '__' : '?')).join('')];
  if (li.querySelector('.pdv')) return [label, li.querySelector('.pdv-in').textContent + ' ' + DIVIDE + ' ' + li.querySelector('.pdv-by').textContent];
  return [label, li.querySelector('.ps-a').textContent + ' ' + li.querySelector('.ps-op').textContent + ' ' + li.querySelector('.ps-b').textContent];
}
function paperOn(page) {
  const learner = page.$('paper-learner');
  return {
    samples: [...page.$('paper-samples').querySelectorAll('.pi')].map(printedItem),
    items: [...learner.querySelectorAll('.paper-items:not(.paper-samples) .pi')].map(printedItem),
    sheets: [...learner.querySelectorAll('.paper-sheet:not(.paper-empty)')],
    blank: learner.querySelectorAll('.paper-empty').length,
    key: [...page.$('paper-key').children].map((li) => [...li.children].map((n) => n.textContent)),
    give: [...page.$('paper-give').children].map((li) => li.textContent),
    score: [...page.$('paper-score').children].map((li) => li.textContent),
    tally: squash(page.$('paper-tally').textContent),
  };
}
// Digits correct as the teacher page tells a person to count them: one place at a time from the ones, each digit that
// matches is 1; a blank gets 0, and so does an answer with the wrong sign.
function byPlace(key, wrote) {
  if (wrote === '' || key.startsWith('-') !== wrote.startsWith('-')) return 0;
  const k = key.replace('-', ''), w = wrote.replace('-', '');
  let n = 0;
  for (let i = 1; i <= k.length; i++) if (i <= w.length && k[k.length - i] === w[w.length - i]) n++;
  return n;
}
// The file's directions with the word for paper: tap and type become circle and write.
const onPaper = (directions) => directions.replace(/^Tap /, 'Circle ').replace(/^Type /, 'Write ');

describe('the paper copy', () => {
  it('as files: one button beside Save, a copy hidden on screen and printed alone, black on white, sized as the script lays it out', () => {
    const doc = parse(PAGE);
    const paper = doc.getElementById('paper');
    expect(paper.hidden).toBe(true);
    expect(paper.parentNode).toBe(doc.body);
    expect(paper.closest('main')).toBeNull();
    expect(paper.querySelectorAll('button, input, select, textarea, a, img, svg')).toHaveLength(0);
    // The learner's lines and the caution are fixed words; the rest is filled from the lesson.
    expect(squash(paper.querySelector('.paper-who').textContent)).toBe('Name or code name Date');
    expect(paper.querySelector('.paper-caution').textContent).toBe('Scores on paper and on screen may differ, so do not mix them until they have been compared.');
    expect(paper.querySelector('.paper-keep').textContent).toBe('For the teacher. Keep this page away from the learner.');
    expect([...paper.querySelectorAll('h3')].map((node) => node.textContent)).toEqual(['Samples. These do not count.', 'Start when your teacher says.', 'How to give it', 'How to score it: the same way the file does', 'Answers']);
    // One button, beside saving the file, with a line that says what it prints. No settings.
    const actions = doc.getElementById('save').parentNode;
    expect([...actions.querySelectorAll('button, a')].map((node) => node.id)).toEqual(['back-3', 'try', 'print', 'save']);
    const button = doc.getElementById('print');
    expect([button.textContent, button.className, button.hidden, button.getAttribute('aria-describedby')]).toEqual(['Print a paper copy', 'btn', true, 'print-note']);
    expect(doc.getElementById('print-note').textContent).toBe('For a learner with no device: the same problems in the same order, on paper. The answers and how to score them are on a teacher page, on a sheet of its own.');
    expect(doc.getElementById('step-3').querySelectorAll('input, select, textarea')).toHaveLength(0);

    // Everything in the print stylesheet is for print: the screen is untouched.
    const css = read(PRINT_CSS);
    expect(css.slice(0, css.indexOf('@media print {')).replace(/\/\*[\s\S]*?\*\//g, '').trim()).toBe('');
    expect(css.match(/@media/g)).toHaveLength(1);
    expect(css).toContain('body.paper-on > :not(#paper) { display: none !important; }');
    expect(css).toContain('body.paper-on > #paper[hidden] { display: block !important; }');
    // Black, white and one gray for the lines of the key. No color, no picture, no font from anywhere.
    expect([...new Set(css.match(/#[0-9a-f]{3,8}\b/gi))].sort()).toEqual(['#000000', '#808080', '#ffffff']);
    expect(css).not.toMatch(/rgb|hsl|color-mix|background-image|box-shadow|@font-face|@import|url\(/i);
    // An item never splits across two pages, and the teacher page starts on a new one.
    expect(css).toMatch(/\.pi \{[^}]*break-inside: avoid;/);
    expect(css).toMatch(/\.paper-teacher \{[^}]*break-before: page;/);
    expect(css).toMatch(/@page \{ margin: 12mm 15mm; \}/);
    // The heights the script lays the sheets out with are the heights of the boxes, and a sheet fits on Letter and on A4.
    const PAPER = new Function('return ' + /var PAPER = (\{[^}]*\});/.exec(read(SCRIPT))[1])();
    const height = (selector) => Number(new RegExp(selector.replace(/\./g, '\\.') + ' \\{(?:[^}]*;)?\\s*height: ([\\d.]+)mm').exec(css)[1]);
    expect([height('.pi-stack'), height('.pi-tall'), height('.pi-line'), height('.pi-pair'), height('.paper-page'), height('.paper-turn')]).toEqual([PAPER.stack, PAPER.tall, PAPER.line, PAPER.pair, PAPER.page, PAPER.turn]);
    expect(PAPER.across).toBeLessThanOrEqual(Math.min(215.9, 210) - 2 * 15);
    expect(PAPER.down).toBeLessThan(Math.min(279.4, 297) - 2 * 12);
    for (const text of [css, read(SCRIPT)]) expect(BRITISH.exec(text)).toBeNull();
    expect(NOT_SAID.exec(css.replace(/@media print/, ''))).toBeNull();
    // It prints by asking the browser, once, and opens nothing: no new window, no popup.
    const source = read(SCRIPT);
    expect(source.match(/\.print\(/g)).toEqual(['.print(']);
    expect(source).toContain('try { window.print(); }');
    expect(source).not.toMatch(/\bopen\s*\(|showModalDialog|_blank/);
  });

  // The teacher page for each kind, word for word.
  const TEACHER = {
    quantity_discrimination: {
      give: ['Do the 2 samples first, with the learner, and say each answer. Samples do not count.', 'Then start a clock for 1 minute. When the time is up, the learner stops.'],
      score: ['A question is right when the circled number is the bigger one, the one in the key.', 'The score is the number of questions right, leaving out the samples.',
        'If the learner finishes before the time is up, the score is still the number right.', 'If the check is stopped before the time is up and before the last question, there is no score.'],
      tally: 'Number right of 25', note: 'The numbers are the ones the learner sees on screen. In the results file the samples are numbered first, so question 1 here is item 3 there.',
    },
    missing_number: {
      give: ['Do the sample first, with the learner, and say the answer. Samples do not count.', 'Then start a clock for 2 minutes. When the time is up, the learner stops.', 'The learner may skip a problem, as on screen.'],
      score: ['A problem is right when the number written is the one in the key.', 'The score is the number of problems right, leaving out the samples.',
        'If the learner finishes before the time is up, the score is still the number right.', 'If the check is stopped before the time is up and before the last problem, there is no score.'],
      tally: 'Number right of 25', note: 'The numbers are the ones the learner sees on screen. In the results file the samples are numbered first, so problem 1 here is item 2 there.',
    },
    math_computation: {
      give: ['Do the sample first, with the learner, and say the answer. Samples do not count.', 'Then start a clock for 2 minutes. When the time is up, the learner stops.', 'The learner may skip a problem, as on screen.',
        'If the learner finishes every problem before the time is up, write down the number of seconds used.'],
      score: ['Compare each answer with the key one place at a time: ones with ones, tens with tens, and so on. Each digit that matches is 1 digit correct.',
        'For example, if the key says 49 and the learner wrote 40, that is 1 digit correct.', 'A problem left blank gets 0.', 'Add up the digits correct, leaving out the samples.',
        'If the time ran out: score = digits correct ' + DIVIDE + ' 2 (the minutes), rounded to a whole number.',
        'If every problem was finished early: score = digits correct ' + String.fromCharCode(0xD7) + ' 60 ' + DIVIDE + ' seconds used, rounded to a whole number. Under 20 seconds, there is no score.',
        'If the check is stopped before the time is up and before the last problem, there is no score.'],
      tally: 'Digits correct Seconds used, if finished early Score digits correct per minute', note: 'The numbers are the ones the learner sees on screen. In the results file the samples are numbered first, so problem 1 here is item 2 there.',
    },
  };

  it.each([['quantity_discrimination', 'K', 'A'], ['missing_number', '1', 'B'], ['math_computation', '3', 'C']])(
    '%s, grade %s, version %s: the paper has the file\'s items in the file\'s order, and the key has the file\'s answers', async (id, grade, version) => {
      const page = openPage();
      page.choose('check', id);
      page.$('next-1').click();
      page.choose('grade', grade);
      page.choose('version', version);
      expect(page.seen('print')).toBe(false);
      page.$('next-2').click();
      await page.made();
      const html = page.built(), file = fileItems(html), manifest = manifestOf(html);
      expect(page.seen('print') && page.seen('print-note') && page.seen('save')).toBe(true);
      expect(page.d.body.classList.contains('paper-on')).toBe(true);
      const paper = paperOn(page);
      // The learner sheet: the file's title, its samples, then its scored items, numbered as on screen.
      expect(page.$('paper-title').textContent).toBe(manifest.title);
      expect(paper.samples).toEqual(file.filter((row) => row.practice).map((row) => [row.label, row.printed]));
      expect(paper.items).toEqual(file.filter((row) => !row.practice).map((row) => [row.label, row.printed]));
      expect([paper.samples.length, paper.items.length]).toEqual([manifest.check.practiceItems, manifest.check.items]);
      // The answers the file holds are the arithmetic of the problem set, and the key has them, in the same order and numbering.
      const lesson = PC.lessonFromMathForm({ bank: BANK, measure: id, grade, form: version });
      expect(file.map((row) => row.answer)).toEqual(lesson.blocks[0].items.map((raw) => String(expected(raw))));
      expect(paper.key).toEqual(file.map((row) => [row.label, row.word, row.answer]));
      // Each kind is laid out as it is written on paper.
      const kinds = new Set([...page.$('paper-learner').querySelectorAll('.pi')].map((li) => (li.querySelector('.pdv') ? 'divide' : li.className.split(' ')[1])));
      expect([...kinds].sort()).toEqual({ quantity_discrimination: ['pi-pair'], missing_number: ['pi-line'], math_computation: ['divide', 'pi-stack'] }[id]);
      // The directions are the file's, with the word for paper, and the time is said in the file's words.
      const directions = TH.CHECK_ADAPTERS[id].labels[id + '_directions'];
      expect(page.$('paper-how').textContent.startsWith(onPaper(directions))).toBe(true);
      expect(page.$('paper-how').textContent).toBe(onPaper(directions) + ' Go across each row.' + (lesson.check.allowSkip ? ' If you get stuck, go on to the next one.' : ''));
      expect(page.$('paper-time').textContent).toBe(TH.CHECK_LABELS.check_ready_timed.replace('{time}', minutes(manifest.check.timeLimitS)));
      // Sheets: numbered when there is more than one, each but the last full rows only, an even count before the teacher page.
      const cols = Number(/cols-(\d)/.exec(page.$('paper-items-1').className)[1]);
      const n = paper.sheets.length;
      expect(paper.sheets.map((sheet) => sheet.querySelector('.paper-page').textContent)).toEqual(n > 1 ? paper.sheets.map((_, i) => 'Page ' + (i + 1) + ' of ' + n) : ['']);
      expect(paper.sheets.map((sheet) => sheet.querySelector('.paper-turn').textContent)).toEqual(paper.sheets.map((_, i) => (i < n - 1 ? 'Go on to the next page.' : '')));
      paper.sheets.slice(0, -1).forEach((sheet) => expect(sheet.querySelectorAll('.paper-items:not(.paper-samples) .pi').length % cols).toBe(0));
      expect((n + paper.blank) % 2).toBe(0);
      expect(paper.blank).toBe(n % 2);
      // The teacher page.
      expect(page.$('paper-key-title').textContent).toBe('Teacher page: ' + manifest.title);
      // 25 answers fit under the directions: the key stays on the teacher page.
      expect([page.$('paper-answers').className, page.$('paper-answers-title').textContent]).toEqual(['', 'Answers']);
      expect({ give: paper.give, score: paper.score, tally: paper.tally, note: page.$('paper-key-note').textContent }).toEqual(TEACHER[id]);
      // The file's own Get ready screen says the same time and the same directions, with the word for the screen.
      const run = play(html);
      run.d.getElementById('learner-name').value = 'BlueHeron7';
      run.button('Next').click();
      lesson.blocks[0].items.filter((raw) => raw.practice).forEach((raw) => { run.answer(raw); run.q('[data-practice-next]').click(); });
      expect(run.heading()).toBe('Get ready');
      expect(run.text()).toContain(page.$('paper-time').textContent);
      expect(run.text()).toContain(directions);
      run.close();
      // The button prints the page, and what prints is the paper copy.
      page.$('print').click();
      expect(page.prints).toEqual([true]);
      expect(page.asked).toEqual([]);
      page.wordsAreRight();
      // Going back takes the paper copy away with the file: nothing stale can print.
      page.$('back-3').click();
      expect(page.seen('print') || page.seen('print-note')).toBe(false);
      expect(page.d.body.classList.contains('paper-on')).toBe(false);
      expect([page.$('paper-items-1').children.length, page.$('paper-samples').children.length, page.$('paper-key').children.length, page.$('paper-learner').children.length]).toEqual([0, 0, 0, 1]);
      expect(page.$('paper-title').textContent + page.$('paper-give').textContent + page.$('paper-score').textContent).toBe('');
      page.dom.window.close();
    });

  it('my own problems: the same list on paper, stacked, in a bracket or on a line, with the answers the file holds', async () => {
    const page = openPage();
    await page.own('7+8, 12-5, 6x4, 20/4, 3 + 4 + 5 = 12, 345 x 12, 3 - 8');
    page.set('f-title', 'Facts to 20');
    page.$('next-2').click();
    await page.made();
    const html = page.built(), file = fileItems(html), paper = paperOn(page);
    expect(page.$('paper-title').textContent).toBe('Facts to 20');
    expect(paper.samples).toEqual([]);
    expect(page.$('paper-samples-part').hidden).toBe(true);
    expect(paper.items).toEqual(file.map((row) => [row.label, row.printed]));
    expect(paper.key).toEqual(file.map((row) => [row.label, row.word, row.answer]));
    expect(file.map((row) => row.answer)).toEqual(['15', '7', '24', '5', '12', '4140', '-5']);
    expect(paper.items[4]).toEqual(['5', '3 + 4 + 5 = __']);
    const kinds = [...page.$('paper-learner').querySelectorAll('.pi')].map((li) => (li.querySelector('.pdv') ? 'divide' : li.className.split(' ')[1]));
    expect(kinds).toEqual(['pi-stack', 'pi-stack', 'pi-stack', 'divide', 'pi-line', 'pi-stack', 'pi-stack']);
    expect(page.$('paper-how').textContent).toBe('Write the answer to each one. Go across each row. If you get stuck, go on to the next one.');
    expect(paper.give).toEqual(['Start a clock for 2 minutes. When the time is up, the learner stops.', 'The learner may skip a problem, as on screen.',
      'If the learner finishes every problem before the time is up, write down the number of seconds used.']);
    // One answer is below zero, so the page says what the file does with a wrong sign. The example is the first two-digit answer.
    expect(paper.score).toContain('A problem left blank gets 0. So does an answer with the wrong sign.');
    expect(paper.score).toContain('For example, if the key says 15 and the learner wrote 16, that is 1 digit correct.');
    expect(paper.score).toContain('Add up the digits correct.');
    expect(page.$('paper-key-note').textContent).toBe('The numbers are the ones the learner sees on screen and in the results file.');
    page.$('print').click();
    expect(page.prints).toEqual([true]);
    page.wordsAreRight();

    // No clock and no skip: the file's score is a count, and the paper says so.
    page.$('back-3').click();
    page.choose('time', '0');
    page.$('f-skip').click();
    page.$('next-2').click();
    await page.made();
    const calm = paperOn(page);
    expect(calm.items).toEqual(fileItems(page.built()).map((row) => [row.label, row.printed]));
    expect(page.$('paper-time').textContent).toBe(TH.CHECK_LABELS.check_ready_untimed);
    expect(page.$('paper-how').textContent).toBe('Write the answer to each one. Go across each row.');
    expect(calm.give).toEqual(['There is no clock. The learner may take as long as needed.']);
    expect(calm.score).toEqual(['A problem is right when the number written is the one in the key.', 'The score is the number of problems right.', 'If the check is stopped before the last problem, there is no score.']);
    expect(calm.tally).toBe('Number right of 7');
    expect(page.asked).toEqual([]);
    page.dom.window.close();
  });

  it('a long list runs over several sheets: each numbered, every row whole, every problem once and in order', async () => {
    const page = openPage();
    await page.own(Array.from({ length: 60 }, (_, i) => (i + 2) + ' x ' + ((i % 9) + 2)).join('\n'));
    page.$('next-2').click();
    await page.made();
    const paper = paperOn(page), file = fileItems(page.built());
    expect(paper.items).toEqual(file.map((row) => [row.label, row.printed]));
    expect(paper.key.map((row) => row[0])).toEqual(Array.from({ length: 60 }, (_, i) => String(i + 1)));
    const n = paper.sheets.length, cols = Number(/cols-(\d)/.exec(page.$('paper-items-1').className)[1]);
    expect(n).toBeGreaterThan(2);
    expect(paper.sheets.map((sheet) => sheet.querySelector('.paper-page').textContent)).toEqual(paper.sheets.map((_, i) => 'Page ' + (i + 1) + ' of ' + n));
    paper.sheets.slice(0, -1).forEach((sheet) => expect(sheet.querySelectorAll('.pi').length % cols).toBe(0));
    expect((n + paper.blank) % 2).toBe(0);
    // Sixty answers do not fit under the directions: the key starts a sheet of its own, with the title on it.
    expect([page.$('paper-answers').className, page.$('paper-answers-title').textContent]).toEqual(['paper-apart', 'Answers: Math check']);
    expect(read(PRINT_CSS)).toMatch(/\.paper-apart \{ break-before: page;/);
    page.$('back-3').click();
    expect([page.$('paper-answers').className, page.$('paper-answers-title').textContent]).toEqual(['', 'Answers']);
    page.dom.window.close();
  });

  it('the teacher page scores the paper the way the file scores the screen', () => {
    // Digits correct: the file's own scoring of one item, against the rule as the teacher page words it.
    const score = TH.CHECK_ADAPTERS.math_computation.score;
    for (const [key, wrote] of [['63', '68'], ['63', '63'], ['63', '36'], ['7', '17'], ['126', '26'], ['3304', '3314'], ['100', '1000'], ['5', ''], ['-5', '5'], ['5', '-5'], ['-12', '-13']]) {
      expect(score({}, key, wrote).digitsCorrect, key + ' / ' + wrote).toBe(byPlace(key, wrote));
    }
    // The rate: digits correct over the minutes, the time capped at the limit; finished early, over the seconds used.
    const meta = { measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', timeLimitS: 120, scoringVersion: 3 };
    const digits = (...counts) => counts.map((d) => ({ practice: false, attempted: true, correct: false, digitsCorrect: d, digitsPossible: 2 }));
    for (const total of [0, 1, 3, 37, 38]) expect(TH.checkScore(meta, digits(total), { elapsedMs: 120000, completion: 'time' }).score).toBe(Math.round(total / 2));
    for (const seconds of [20, 45, 90, 119]) expect(TH.checkScore(meta, digits(37), { elapsedMs: seconds * 1000, completion: 'complete' }).score).toBe(Math.round(37 * 60 / seconds));
    expect(TH.checkScore(meta, digits(37), { elapsedMs: 19900, completion: 'complete' })).toMatchObject({ score: null, noScoreReason: 'too_fast' });
    expect(TH.checkScore(meta, digits(37), { elapsedMs: 60000, completion: 'ended_early' })).toMatchObject({ score: null, noScoreReason: 'ended_early' });
    // Samples are left out.
    expect(TH.checkScore(meta, [{ practice: true, attempted: true, correct: true, digitsCorrect: 9, digitsPossible: 9 }, ...digits(4)], { elapsedMs: 120000, completion: 'time' }).score).toBe(2);
    // A count: the number right, whether the learner finished early or the time ran out; stopped early, no score.
    const counted = { measure: 'quantity_discrimination', scoreUnit: 'items_correct', timeLimitS: 60, scoringVersion: 1 };
    const marks = [true, false, true, true].map((correct) => ({ practice: false, attempted: true, correct, digitsCorrect: null, digitsPossible: null }));
    expect(TH.checkScore(counted, marks, { elapsedMs: 30000, completion: 'complete' }).score).toBe(3);
    expect(TH.checkScore(counted, marks, { elapsedMs: 60000, completion: 'time' }).score).toBe(3);
    expect(TH.checkScore(counted, marks, { elapsedMs: 30000, completion: 'ended_early' }).score).toBeNull();
    // Right means the bigger number, or the number in the key.
    expect(['9', '2', ''].map((chosen) => TH.CHECK_ADAPTERS.quantity_discrimination.score({}, '9', chosen).correct)).toEqual([true, false, false]);
    expect(['6', '7', ''].map((typed) => TH.CHECK_ADAPTERS.missing_number.score({}, '6', typed).correct)).toEqual([true, false, false]);

    // And a whole run of a file: a skip, a right answer, an answer one off, then the time runs out. The paper rule gives the file's score.
    const html = direct('math_computation', '3', 'C').html, lesson = PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '3', form: 'C' });
    const key = fileItems(html).filter((row) => !row.practice).map((row) => row.answer);
    const run = play(html);
    run.start(lesson);
    run.tick(300);
    run.q('[data-skip]').click();
    run.answer(scored(lesson)[1]);
    run.answer(scored(lesson)[2], false);
    run.tick(120000);
    run.d.dispatchEvent(new run.w.Event('visibilitychange'));
    expect(run.heading()).toBe('You finished. Thank you.');
    run.q('[data-save-json]').click();
    const result = JSON.parse(run.saved[run.saved.length - 1].body);
    const total = byPlace(key[0], '') + byPlace(key[1], key[1]) + byPlace(key[2], String(Number(key[2]) + 1));
    expect(result.score).toMatchObject({ completion: 'time', digitsCorrect: total, score: Math.round(total / 2) });
    // The results file counts the sample: problem 1 of the paper is item_n 2, as the teacher page says.
    expect(result.items.filter((item) => !item.practice)[0]).toMatchObject({ n: 2, word: fileItems(html)[1].word });
    run.close();
  });
});
