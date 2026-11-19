import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { openMaker } from './helpers/packets_maker_page.js';

// "Make one for each student" on the maker (packets-make.html): one file per code name, in one .zip file.
// (a) packets_zip.js: a store-only .zip with the usual CRC-32 and UTF-8 names, the same bytes for the same files.
// (b) The page: the size is said before anything is made, the list is cleaned and capped at 40 (and says why),
//     versions A, B and C can rotate, progress is shown, and EACH FILE IS BYTE FOR BYTE what a single make with
//     that code name and version gives, under the same file name.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const zipKit = require('../packets_zip.js');
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const join = (parts) => Buffer.concat(parts.map((p) => Buffer.from(p)));

describe('(a) the .zip writer', () => {
  it('uses the standard CRC-32, writes UTF-8 names, and reads back what it wrote', () => {
    expect(zipKit.crc32(new TextEncoder().encode('123456789'))).toBe(0xCBF43926);
    expect(zipKit.crc32(new Uint8Array(0))).toBe(0);
    const zip = zipKit.create();
    zip.add('Practice__BlueHeron7.html', new TextEncoder().encode('<!doctype html><p>one</p>'));
    zip.add('Practice__Zoë.html', '<!doctype html><p>two</p>');
    const bytes = join(zip.finish());
    expect(zip.bytes).toBe(bytes.length);
    expect(zip.count).toBe(2);
    expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
    expect(bytes.readUInt16LE(6) & 0x0800).toBe(0x0800);   // names in UTF-8
    expect(bytes.readUInt16LE(8)).toBe(0);                  // stored, not compressed
    const back = zipKit.readZip(bytes);
    expect(back.map((f) => [f.name, Buffer.from(f.bytes).toString('utf8'), f.crcOk])).toEqual([
      ['Practice__BlueHeron7.html', '<!doctype html><p>one</p>', true], ['Practice__Zoë.html', '<!doctype html><p>two</p>', true]]);
    // The same files give the same .zip (fixed times).
    const twice = zipKit.create();
    twice.add('Practice__BlueHeron7.html', '<!doctype html><p>one</p>');
    twice.add('Practice__Zoë.html', '<!doctype html><p>two</p>');
    expect(join(twice.finish()).equals(bytes)).toBe(true);
    expect(() => zip.add('late.html', 'x')).toThrow('already finished');
  });

  it('holds no address, no network call and no compression library', () => {
    const source = read('packets_zip.js');
    expect(source).not.toMatch(/fetch\s*\(|XMLHttpRequest|https?:\/\/|import\s*\(|require\s*\(/);
  });
});

describe('(b) one file for each student', () => {
  const names = (page, text) => page.set('f-batch-names', text);
  const zipOf = (page) => join([...page.files].reverse().find((blob) => blob.type === 'application/zip').parts);
  const toStep3 = async (page) => { page.$('next-1').click(); page.$('next-2').click(); await page.ready(); };

  it('is folded and closed by default, under the file, with the tip about code names', async () => {
    const doc = new JSDOM(read('packets-make.html')).window.document;
    const box = doc.getElementById('batch');
    expect(box.closest('section').id).toBe('step-3');
    expect(box.hasAttribute('open')).toBe(false);
    expect(box.querySelector('summary').textContent).toBe('Put student code names in the file');
    expect(doc.getElementById('batch-names-hint').textContent).toBe('Use code names or first names only, never full names. At most 40 at a time.'); // 2026-11-17: one name rule everywhere
    expect(box.contains(doc.getElementById('f-batch-rotate'))).toBe(true);
    expect(doc.getElementById('batch-more')).toBeNull();
    // Not a second main button: each step keeps one.
    expect(box.querySelectorAll('.btn-primary')).toHaveLength(0);
  });

  it('says how many files and how large before making them, and cleans the list', async () => {
    const page = await openMaker();
    await toStep3(page);
    const one = page.files[page.files.length - 1].size;
    names(page, 'BlueHeron7\n\n  RedFox2  \nblueheron7\n!!!\nZoë 3\n');
    const kb = (b) => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1000)) + ' KB';
    expect(page.$('batch-said').textContent).toBe('3 files, about ' + kb(3 * one) + ' in all (' + kb(one) + ' each). All version A. '
      + 'Listed more than once, used once: blueheron7. Not used, because a code name needs a letter or a number: !!!.');
    expect(page.$('batch-make').textContent).toBe('Save .zip for 3 students');
    // At most 40, and why.
    names(page, Array.from({ length: 45 }, (_, i) => 'Student' + (i + 1)).join('\n'));
    expect(page.$('batch-said').textContent).toContain('40 files, about');
    expect(page.$('batch-said').textContent).toContain('Not used: 5 more code names. At most 40 go in one .zip file, because a larger one is slow to make and to open, most of all on a phone or tablet. Make a second .zip file for the rest.');
    names(page, '');
    page.$('batch-make').click();
    expect(page.$('batch-problem').textContent).toBe('Type at least two code names for a .zip file, or press Save the file above for one student.');
    expect(page.files.some((blob) => blob.type === 'application/zip')).toBe(false);
  });

  it('each file is what a single make with that code name and version gives, byte for byte', async () => {
    const page = await openMaker();
    await toStep3(page);
    page.$('batch').open = true;
    names(page, 'BlueHeron7\nRedFox2\nZoë 3\nOwl4');
    page.$('f-batch-rotate').checked = true;
    page.$('f-batch-rotate').dispatchEvent(new page.w.Event('change', { bubbles: true }));
    expect(page.$('batch-said').textContent).toContain('4 files, about');
    expect(page.$('batch-said').textContent).toContain('Versions A, B and C in turn.');
    expect(page.$('batch-make').textContent).toBe('Save .zip for 4 students');
    const dlBefore = page.downloads.length;
    page.$('batch-make').click();
    expect(page.seen('batch-making')).toBe(true);
    expect(page.$('batch-make').disabled).toBe(true);
    await page.until(() => page.downloads.length > dlBefore, 'the .zip file downloaded');
    expect(page.$('batch-said').textContent).toMatch(/^Saved Word-Sounds-CVC-words__4-students\.zip \(4 files, [\d.]+ (?:MB|KB)\)\./);
    expect(page.downloads.at(-1).name).toBe('Word-Sounds-CVC-words__4-students.zip');
    const files = zipKit.readZip(zipOf(page));
    expect(files.map((f) => f.name)).toEqual(['Word-Sounds-CVC-words-version-A__BlueHeron7.html', 'Word-Sounds-CVC-words-version-B__RedFox2.html',
      'Word-Sounds-CVC-words-version-C__Zoë-3.html', 'Word-Sounds-CVC-words-version-A__Owl4.html']);
    expect(files.every((f) => f.crcOk)).toBe(true);
    const html = files.map((f) => Buffer.from(f.bytes).toString('utf8'));
    expect(html.map((h) => manifestOf(h).learner)).toEqual(['BlueHeron7', 'RedFox2', 'Zoë 3', 'Owl4']);
    // The same packet for students of one version: only the code name differs.
    expect(manifestOf(html[0]).packet).toEqual(manifestOf(html[3]).packet);
    expect(manifestOf(html[0]).packet.id).not.toBe(manifestOf(html[1]).packet.id);

    // Now one at a time, as a teacher would personalize each file via 1 line in #f-batch-names: synchronous patch, exact same bytes and filename.
    const single = async (version, code) => {
      page.$('back-3').click();
      page.choose('version', version);
      page.$('next-2').click();
      await page.ready();
      names(page, code);
      expect(page.seen('summary')).toBe(true);
      page.$('save').click();
      return { html: page.built(), name: page.downloads.at(-1).name };
    };
    const plan = [['A', 'BlueHeron7'], ['B', 'RedFox2'], ['C', 'Zoë 3'], ['A', 'Owl4']];
    for (let i = 0; i < plan.length; i++) {
      const made = await single(...plan[i]);
      expect(made.name, plan[i].join(' ')).toBe(files[i].name);
      expect(made.html === html[i], plan[i].join(' ')).toBe(true);
    }
  });

  it('a choice that changes clears a saved .zip cleanly; Stop stops; and .txt roster loader fills code names', async () => {
    const page = await openMaker();
    await toStep3(page);
    names(page, 'BlueHeron7\nRedFox2');
    const dlBefore = page.downloads.length;
    page.$('batch-make').click();
    await page.until(() => page.downloads.length > dlBefore, 'the .zip file downloaded');
    page.set('f-title', 'Another title');
    await new Promise((resolve) => setTimeout(resolve, 750));
    await page.ready();
    const dlAfterTitle = page.downloads.length;
    page.$('batch-make').click();
    page.$('batch-stop').click();
    expect(page.$('batch-problem').textContent).toBe('Stopped. No .zip file was made.');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(page.downloads.length).toBe(dlAfterTitle);
    expect(page.$('batch-make').disabled).toBe(false);

    // Zero-storage .txt roster loader fills #f-batch-names cleanly.
    const txt = new page.w.File(['Owl4\nPine8\nRiver3\n'], 'roster.txt', { type: 'text/plain' });
    Object.defineProperty(page.$('batch-file'), 'files', { configurable: true, value: [txt] });
    page.$('batch-file').dispatchEvent(new page.w.Event('change', { bubbles: true }));
    await page.until(() => /Owl4/.test(page.$('f-batch-names').value), 'roster loaded');
    expect(page.$('batch-make').textContent).toBe('Save .zip for 3 students');
  });

  it('Wave 5B: packets_zip deduplicates colliding entry filenames case-insensitively across all makers', () => {
    const zip = zipKit.create();
    zip.add('Practice__J-S.html', 'first');
    zip.add('Practice__J-S.html', 'second');
    zip.add('practice__j-s.html', 'third');
    zip.add('Practice__Bad:Name?.html', 'fourth');
    const out = zipKit.readZip(Buffer.concat(zip.finish().map((u) => Buffer.from(u))));
    expect(out.map((f) => f.name)).toEqual([
      'Practice__J-S.html',
      'Practice__J-S-2.html',
      'practice__j-s-3.html',
      'Practice__Bad-Name-.html',
    ]);
    expect(out.map((f) => Buffer.from(f.bytes).toString('utf8'))).toEqual(['first', 'second', 'third', 'fourth']);
    expect(out.every((f) => f.crcOk)).toBe(true);
  });

  it('Wave 7B: cleans BOM, numbered/bulleted, and TSV/CSV rosters without mid-name truncation beyond 2400 chars', async () => {
    const page = await openMaker();
    await toStep3(page);
    const lines = ['\uFEFF1. Blue Heron 7\tGroup A\tExtra spreadsheet column text for padding beyond 2400 bytes'];
    for (let i = 2; i <= 45; i++) {
      lines.push(`${i}. LearnerCode${String(i).padStart(2, '0')}, Period 3, Extra Spreadsheet Column Padding Notes Text`);
    }
    const raw = lines.join('\r\n');
    expect(raw.length).toBeGreaterThan(2500);
    const txt = new page.w.File([raw], 'roster.txt', { type: 'text/plain' });
    Object.defineProperty(page.$('batch-file'), 'files', { configurable: true, value: [txt] });
    page.$('batch-file').dispatchEvent(new page.w.Event('change', { bubbles: true }));
    await page.until(() => /Blue Heron 7/.test(page.$('f-batch-names').value), 'large roster loaded');
    expect(page.$('f-batch-names').value.split('\n')[0]).toBe('Blue Heron 7');
    expect(page.$('f-batch-names').value.split('\n')[44]).toBe('LearnerCode45');
    expect(page.$('batch-make').textContent).toBe('Save .zip for 40 students');
    expect(page.$('batch-said').textContent).toContain('Not used: 5 more code names.');
  });
});
