// The documentation pass of 2026-11-17 (reports/packets_review_2026-11-16.md, D13, 2.6, 2.7 and 2.9):
//   - packets-about.html: a short About page (who makes it, how to report a problem, the license, a privacy summary);
//   - packets-it.html: all six builders named, the Open page as the answer for phones and tablets, the class mailbox
//     address inside its file, the two reading fonts and font-src data:, and links to About and the format document;
//   - docs/packets-file-formats.md: the file formats, written down, with every CSV column the engine writes.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const parse = (file) => new JSDOM(read(file)).window.document;
const squash = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const sentences = (value) => squash(value).split(/(?<=[.!?])\s+/).filter(Boolean);

const ABOUT = 'packets-about.html';
const GUIDE = 'packets-it.html';
const FORMATS = 'docs/packets-file-formats.md';
const LOADER = 'word_sounds_take_home_loader.js';
const NAME = 'AlloFlow Packets';
const REPOSITORY = 'https://github.com/Apomera/AlloFlow';
const ISSUES = 'https://github.com/Apomera/AlloFlow/issues';
const FORMATS_ON_GITHUB = 'https://github.com/Apomera/AlloFlow/blob/main/docs/packets-file-formats.md';
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'";
const BUILDERS = ['word_sounds_packet_builder.js', 'packet_math_practice_builder.js', 'packet_check_builder.js', 'packet_vocab_builder.js',
  'packet_symbol_runner_builder.js', 'packet_read_along_builder.js'];
// The spellings and the promise words the other Packets page tests keep out.
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const PROMISES = /\b(?:safe|safely|safety|safer|unsafe|secure|securely|security|insecure|guarantee[ds]?|certif\w*|compliant|compliance|tamper-?proof|trusted|bulletproof)\b/i;

// The body of packetCsv in the loader, as text: the columns and the trailer keys are read from it, not copied here.
const loaderText = read(LOADER);
const csvBody = (() => {
  const start = loaderText.indexOf('function packetCsv(result) {');
  expect(start, 'packetCsv in the loader').toBeGreaterThan(0);
  const end = loaderText.indexOf('\n  function ', start + 10);
  return loaderText.slice(start, end);
})();
const csvColumns = () => {
  const header = /var header = \[([\s\S]*?)\];/.exec(csvBody);
  expect(header, 'the header array of packetCsv').toBeTruthy();
  const pushed = /header\.push\(([^)]*)\)/.exec(csvBody);
  const names = (list) => [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  return names(header[1]).concat(pushed ? names(pushed[1]) : []);
};

describe('the About page', () => {
  const doc = parse(ABOUT);
  const body = squash(doc.body.textContent);

  it('carries the same strict rule as the IT guide, before anything is loaded', () => {
    const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta.getAttribute('content')).toBe(CSP);
    expect(parse(GUIDE).querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toBe(CSP);
    const head = [...doc.head.children];
    expect(head.slice(0, head.indexOf(meta)).every((node) => node.tagName === 'META')).toBe(true);
    expect(doc.querySelector('meta[name="referrer"]').getAttribute('content')).toBe('no-referrer');
    expect(doc.querySelectorAll('style').length).toBe(0);
    for (const script of doc.querySelectorAll('script')) {
      expect(script.getAttribute('src')).toBe('packets-page.js');
      expect(script.textContent.trim()).toBe('');
    }
    for (const node of doc.querySelectorAll('*')) for (const attribute of node.attributes) expect(/^on|^style$/i.test(attribute.name), node.tagName + ' ' + attribute.name).toBe(false);
  });

  it('says it runs without AI, and lists exactly the files it loads', () => {
    expect(doc.querySelector('.proof-line').textContent).toBe('This page runs without AI. No account. It is a page to read: nothing you do here is sent or kept.');
    expect(body).toContain('This page runs without AI.');
    expect(doc.querySelector('details.proof').hasAttribute('open')).toBe(false);
    expect(doc.querySelector('[data-show-rule]')).toBeTruthy();
    const loaded = [...doc.querySelectorAll('link[href], script[src]')].map((node) => node.getAttribute('href') || node.getAttribute('src'));
    expect(loaded).toEqual(['packets-mark.svg', 'packets.css', 'packets-page.js']);
    const said = [...doc.querySelectorAll('details.proof li')].find((item) => item.textContent.startsWith('This page loads'));
    expect(said.textContent).toContain('This page loads four files, all from this site');
    expect([...said.querySelectorAll('code')].map((node) => node.textContent)).toEqual(['packets.css', 'packets-page.js']);
    // Every local address is a file of this site.
    for (const node of doc.querySelectorAll('[href], [src]')) {
      const address = node.getAttribute('href') || node.getAttribute('src');
      if (/^https:\/\//.test(address)) continue;
      if (address.startsWith('#')) { expect(doc.getElementById(address.slice(1)), address).toBeTruthy(); continue; }
      expect(existsSync(address === './' ? 'index.html' : address.replace(/#.*$/, '')), address).toBe(true);
    }
  });

  it('says what Packets is in three sentences, and who makes it, with no person named', () => {
    expect(doc.querySelector('h1').textContent).toBe('About');
    expect(doc.title).toBe('About');
    expect(sentences(doc.querySelector('.lead').textContent).length).toBe(3);
    expect(body).toContain('AlloFlow, an open-source project.');
    const repo = doc.querySelector('a[href="' + REPOSITORY + '"]');
    expect([repo.textContent, repo.getAttribute('rel')]).toEqual(['AlloFlow on GitHub', 'noopener noreferrer']);
    // The links out are the two GitHub pages and nothing else; no email address anywhere.
    expect([...doc.querySelectorAll('a[href^="http"]')].map((a) => a.getAttribute('href'))).toEqual([REPOSITORY, ISSUES]);
    expect(read(ABOUT)).not.toMatch(/mailto:|@[a-z0-9-]+\.[a-z]/i);
    expect(doc.querySelector('form, input, textarea, select')).toBeNull();
  });

  it('says how to report a problem, and asks for no student information', () => {
    const issues = doc.querySelector('a[href="' + ISSUES + '"]');
    expect([issues.textContent, issues.getAttribute('rel')]).toEqual(['AlloFlow issues', 'noopener noreferrer']);
    expect(body).toContain('Do not put student information in a report');
    // Every sentence that speaks of names, results files or screens alongside sending or attaching them says not to.
    const risky = sentences(body).filter((s) => /\b(?:names?|code names?|results? files?|screens?|screenshots?|student information)\b/i.test(s)
      && /\b(?:attach|include|send|paste|upload|put|share)\b/i.test(s));
    expect(risky.length).toBeGreaterThan(0);
    for (const s of risky) expect(s, s).toMatch(/^Do not\b/);
    expect(body).not.toMatch(/attach (?:the|a|your) results file|send us/i);
  });

  it('gives the license, a privacy summary in line with the IT guide, and the date', () => {
    const section = (id) => squash(doc.querySelector('section[aria-labelledby="' + id + '"]').textContent);
    expect(section('license-title')).toContain('AGPL-3.0');
    expect(section('license-title')).toContain('credits');
    const privacy = doc.querySelectorAll('section[aria-labelledby="privacy-title"] p');
    expect(privacy.length).toBe(1);
    const said = squash(privacy[0].textContent);
    for (const piece of ['no accounts, no cookies and no analytics', 'Nothing is sent to this site', 'class mailbox', 'Find a picture', 'Look up a word online', 'computer voice']) expect(said, piece).toContain(piece);
    expect(privacy[0].querySelector('a').getAttribute('href')).toBe(GUIDE);
    // What it says is what the IT guide says.
    const guide = squash(parse(GUIDE).body.textContent);
    for (const piece of ['no sign-in, no cookies, no analytics', 'Find a picture', 'Look up a word online', 'class mailbox']) expect(guide, piece).toContain(piece);
    const time = doc.querySelector('time');
    expect([time.getAttribute('datetime'), squash(time.parentNode.textContent)]).toEqual(['2026-11-17', 'Last updated: 2026-11-17.']);
  });

  it('has the header and footer of the other Packets pages, the product name once, and plain American words', () => {
    expect(read(ABOUT).split(NAME).length - 1).toBe(1);
    expect(doc.getElementById('product-name').textContent).toBe(NAME);
    expect(doc.querySelector('.brand').getAttribute('href')).toBe('packets.html');
    expect(doc.querySelector('a.skip').getAttribute('href')).toBe('#main');
    expect(doc.querySelectorAll('main#main').length).toBe(1);
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    const foot = (file) => [...parse(file).querySelectorAll('footer.foot p')].map((p) => squash(p.textContent));
    expect(foot(ABOUT)).toEqual(['Free to use. Open source, license AGPL-3.0.', 'More from AlloFlow']);
    expect(foot(ABOUT)).toEqual(foot(GUIDE));
    expect(doc.querySelector('footer a').getAttribute('href')).toBe('./');
    const levels = [...doc.querySelectorAll('h1, h2, h3')].map((node) => Number(node.tagName[1]));
    expect(levels.filter((level) => level === 1)).toEqual([1]);
    levels.forEach((level, i) => { if (i) expect(level - levels[i - 1]).toBeLessThanOrEqual(1); });
    expect(BRITISH.exec(read(ABOUT))).toBeNull();
    expect(PROMISES.exec(read(ABOUT).replace(/Content-Security-Policy/g, ''))).toBeNull();
    expect(body).not.toContain('!');
    expect(read(ABOUT)).not.toContain('Check a file');
  });
});

describe('the IT guide, 2026-11-17', () => {
  const doc = parse(GUIDE);
  const fact = Object.fromEntries([...doc.querySelectorAll('.facts-table tr')].map((row) => [row.querySelector('th').textContent, squash(row.querySelector('td').textContent)]));
  const limits = [...doc.querySelectorAll('section[aria-labelledby="limits-title"] li')].map((li) => squash(li.textContent));

  it('names all six builders with the loader, and each is a file', () => {
    for (const file of BUILDERS.concat(LOADER)) {
      expect(fact['License and code'], file).toContain(file);
      expect(existsSync(file), file).toBe(true);
    }
    expect(fact['License and code']).toContain('packet_symbol_runner_builder.js (Symbol Runner practice and checks)');
    expect(fact['License and code']).toContain('packet_read_along_builder.js (read-alongs)');
  });

  it('gives the Open page as the answer for any device, and no longer says an iPad may need a web address', () => {
    expect(read(GUIDE)).not.toMatch(/served from a web address|iPad may need/);
    const previews = limits.find((line) => line.startsWith('The previews in Google Drive'));
    expect(previews).toContain('A student can open the file on Open a practice file or check (packets-open.html) instead, which works on any device, phones and tablets included.');
    expect(doc.querySelector('.tested').textContent).toBe('Reported, not yet tested by us.');
    expect(existsSync('packets-open.html')).toBe(true);
    expect(parse('packets-open.html').querySelector('h1').textContent).toBe('Open a practice file or check');
  });

  it('says that a class mailbox file carries its address, so anyone with the file can post to it', () => {
    expect(fact['The class mailbox kind']).toContain('The file carries its mailbox address inside it, so anyone who has the file can post to that mailbox.');
    // True of the loader: the mailbox address and its key travel in the lesson inside the file.
    expect(loaderText).toMatch(/\{ url: str\(opts\.submit\.url\), packId: str\(opts\.submit\.packId\), secret: str\(opts\.submit\.secret\)/);
  });

  it('says nothing that suggests the Symbol Runner page, or any student file, uses the microphone', () => {
    const mentions = sentences(doc.body.textContent).filter((s) => /microphone/i.test(s));
    expect(mentions).toEqual(['The microphone is used only when the teacher presses Record.']);
    for (const s of sentences(doc.body.textContent).filter((line) => /Symbol Runner/.test(line))) expect(s).not.toMatch(/microphone|speech|voice|listen/i);
  });

  it('says each file carries two reading fonts, and that its rule allows fonts from inside the file only', () => {
    const policyStep = squash([...doc.querySelectorAll('section[aria-labelledby="steps-title"] li')][2].textContent);
    expect(policyStep).toContain('Each file made now also carries two reading fonts inside it, Lexend and Atkinson Hyperlegible (SIL Open Font License 1.1), and font-src data: allows fonts from inside the file only.');
    expect(fact['License and code']).toContain('SIL Open Font License 1.1');
    // True of a real file: a check made by the real builder carries both fonts, and its rule says font-src data:.
    const box = {};
    new Function('window', loaderText).call(box, box);
    const loader = box.AlloWordSoundsTakeHome;
    const checks = require('../packet_check_builder.js');
    const html = checks.buildCheckPacket({ lesson: checks.lessonFromMathProblems({ title: 'Facts', problems: checks.parseProblems('2+3,4+1'), timeLimitS: 60 }), loader }).html;
    const policy = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)[1];
    expect(policy.split('; ')).toContain('font-src data:');
    expect(policy).not.toMatch(/font-src[^;]*(?:https?:|'self')/);
    expect(html).toContain('font-family:"Lexend"');
    expect(html).toContain('font-family:"Atkinson Hyperlegible"');
    expect(JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]).fonts).toContain('SIL Open Font License 1.1');
  });

  it('links the About page and the format document on GitHub', () => {
    const about = doc.querySelector('a[href="' + ABOUT + '"]');
    expect(about.textContent).toBe('About');
    expect(existsSync(ABOUT)).toBe(true);
    const formats = doc.querySelector('a[href="' + FORMATS_ON_GITHUB + '"]');
    expect([formats.textContent, formats.getAttribute('rel')]).toEqual(['the file format document', 'noopener noreferrer']);
    expect(existsSync(FORMATS)).toBe(true);
    // The first link out is still the source code, and the details say there are two.
    expect(doc.querySelector('a[href^="http"]').getAttribute('href')).toBe(REPOSITORY);
    expect([...doc.querySelectorAll('a[href^="http"]')].map((a) => a.getAttribute('href'))).toEqual([REPOSITORY, FORMATS_ON_GITHUB]);
    expect(squash(doc.querySelector('details.proof').textContent)).toContain('It has two links to another site, GitHub, both near the end of the page: the public source code and the file format document.');
    expect(BRITISH.exec(read(GUIDE))).toBeNull();
    expect(squash(doc.body.textContent)).not.toContain('!');
  });
});

describe('the file format document', () => {
  const md = read(FORMATS);
  const columnTable = md.slice(md.indexOf('The columns, in order:'), md.indexOf('The trailer lines start with'));

  it('names every CSV column the engine writes, in the order it writes them', () => {
    const columns = csvColumns();
    expect(columns.length).toBe(26);
    expect(columns.slice(0, 3)).toEqual(['format', 'session_id', 'packet_id']);
    expect(columns.slice(-2)).toEqual(['digits_correct', 'digits_possible']);
    for (const name of columns) expect(md, name).toContain('`' + name + '`');
    const rows = [...columnTable.matchAll(/^\| (\d+) \| `([a-z_]+)` \|/gm)].map((m) => [Number(m[1]), m[2]]);
    expect(rows).toEqual(columns.map((name, i) => [i + 1, name]));
    // The results page reads the same columns.
    const reader = require('../packets_results_reader.js');
    expect(reader.COLUMNS.concat(reader.PROBE_COLUMNS)).toEqual(columns);
  });

  it('names every key of the trailer rows, and the three trailer rows', () => {
    const keys = new Set([...csvBody.matchAll(/kv\('([a-z_]+)'/g), ...csvBody.matchAll(/'([a-z_]+)='/g)].map((m) => m[1]));
    expect(keys.size).toBeGreaterThan(20);
    for (const key of keys) expect(md, key).toContain('`' + key + '=');
    for (const row of ['#summary', '#score', '#integrity']) {
      expect(csvBody, row).toContain("'" + row + "'");
      expect(md, row).toContain('`' + row + '`');
    }
  });

  it('names the formats and versions the code writes and reads', () => {
    expect(loaderText).toContain("var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';");
    expect(loaderText).toContain('var RESULT_SCHEMA = 3;');
    expect(loaderText).toContain("kind: 'alloflow-packet-manifest'");
    for (const name of ['alloflow-take-home-lesson/v2', 'alloflow-packet-manifest', 'alloflow-packet/1', 'alloflow-take-home-result', 'alloflow-packet-result/1',
      'alloflow-packet-results-bundle', 'alloflow-take-home-submission', 'scriptSha256', 'font-src data:', "connect-src 'none'"]) expect(md, name).toContain(name);
    for (const version of [1, 2, 3]) expect(md).toMatch(new RegExp('^\\| ' + version + ' \\| ', 'm'));
    const reader = require('../packets_results_reader.js');
    expect([reader.BUNDLE_KIND, reader.BUNDLE_VERSION, reader.FORMAT]).toEqual(['alloflow-packet-results-bundle', 1, 'alloflow-packet-result/1']);
    for (const name of reader.SUMMARY_COLUMNS) expect(md, name).toContain('`' + name + '`');
    expect(md).toContain('## 4. Versions: what a reader must do');
    expect(md).toContain('## 5. Known differences');
    expect(md).toContain('Columns are only ever added at the end.');
  });
});
