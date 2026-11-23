import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const read = (file) => readFileSync(file, 'utf8');
const PAGE = 'packets-math-practice.html';
const PRESET_KEY = 'alloflow-math-presets/1';
const X = String.fromCharCode(0xD7);
const MINUS = String.fromCharCode(0x2212);
const DIVIDE = String.fromCharCode(0xF7);

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

// Minimal STORE-only ZIP reader for verifying AlloPacketZip output bytes (PK\x03\x04 local headers).
function unzipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder('utf-8');
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLen + extraLen;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLen));
    const data = bytes.subarray(dataStart, dataStart + compSize);
    expect(method, name).toBe(0);
    entries.set(name, decoder.decode(data));
    offset = dataStart + compSize;
  }
  return entries;
}

function concatBlobParts(blobParts) {
  const enc = new TextEncoder();
  const chunks = blobParts.map((part) => {
    if (part instanceof Uint8Array) return part;
    if (ArrayBuffer.isView(part)) return new Uint8Array(part.buffer, part.byteOffset, part.byteLength);
    if (part instanceof ArrayBuffer) return new Uint8Array(part);
    return enc.encode(String(part));
  });
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

function openPage({ storage = {}, dropZip = false } = {}) {
  const dom = new JSDOM(read(PAGE), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/site/' + PAGE,
  });
  const w = dom.window;
  const d = w.document;
  opened.push(w);
  const page = { dom, w, d, blobs: [], urls: [], revoked: [], downloads: [] };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.fetch = async () => { throw new TypeError('Failed to fetch'); };
  w.Blob = class {
    constructor(blobParts, opts) {
      this.bytes = concatBlobParts(blobParts || []);
      this.body = new TextDecoder('utf-8').decode(this.bytes);
      this.type = opts && opts.type ? opts.type : '';
      this.size = this.bytes.length;
    }
  };
  w.URL.createObjectURL = (blob) => {
    const url = 'blob:https://packets.test/' + (page.blobs.length + 1);
    page.blobs.push(blob);
    page.urls.push(url);
    return url;
  };
  w.URL.revokeObjectURL = (url) => { page.revoked.push(url); };
  w.HTMLAnchorElement.prototype.click = function () {
    const href = this.getAttribute('href');
    const idx = page.urls.indexOf(href);
    page.downloads.push({ name: this.getAttribute('download'), href, blob: idx >= 0 ? page.blobs[idx] : null });
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  for (const script of d.querySelectorAll('script[src]')) {
    const src = script.getAttribute('src');
    if (dropZip && src === 'packets_zip.js') continue;
    w.eval(read(src));
  }
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => {
    const node = page.$(id);
    return !!node && !node.hidden && !node.closest('[hidden]');
  };
  page.choose = (name, value) => {
    const radio = d.querySelector('input[name="' + name + '"][value="' + value + '"]');
    radio.checked = true;
    radio.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  page.until = async (cond, label) => {
    for (let i = 0; i < 400; i++) {
      if (cond()) return;
      await new Promise((r) => setTimeout(r, 15));
    }
    throw new Error('Timed out waiting for ' + label);
  };
  return page;
}

function assertStrictMonochromeWorksheet(html) {
  expect(html).toContain('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; script-src \'none\'">');
  expect(html).toContain('@page { margin: 12mm; }');
  expect(html).not.toMatch(/<script\b/i);
  expect(html).not.toMatch(/https?:\/\//i);
  expect(html).not.toMatch(/fetch\s*\(/i);
  const hexes = [...new Set((html.match(/#[0-9a-f]{3,8}\b/gi) || []).map((c) => c.toLowerCase()))];
  for (const hex of hexes) {
    expect(['#000000', '#ffffff', '#808080']).toContain(hex);
  }
  expect(html).not.toMatch(/\b(?:rgb|rgba|hsl|hsla)\s*\(/i);
}

describe('Wave 6 Math Fact Practice Worksheet Builder (window.AlloMathWorksheet)', () => {
  it('builds a strictly monochrome Scaffolded worksheet with visual strategy aids and separate Teacher Answer Key', () => {
    const page = openPage();
    expect(page.w.AlloMathWorksheet).toBeTruthy();
    expect(typeof page.w.AlloMathWorksheet.buildMathWorksheetHtml).toBe('function');

    const html = page.w.AlloMathWorksheet.buildMathWorksheetHtml({
      title: 'Mixed Strategy Practice',
      directions: 'Use the dot models and number lines to solve.',
      scaffolded: true,
      includeAnswerKey: true,
      facts: [
        { a: 6, b: 7, op: 'add' },
        { a: 14, b: 5, op: 'sub' },
        { a: 3, b: 4, op: 'mul' },
        { a: 12, b: 3, op: 'div' },
      ],
    });

    assertStrictMonochromeWorksheet(html);
    expect(html).toContain('Name:');
    expect(html).toContain('Date:');
    expect(html).toContain('Mixed Strategy Practice');
    expect(html).toContain('Use the dot models and number lines to solve.');
    expect(html).toContain('data-mode="scaffolded"');

    const wsDoc = new JSDOM(html).window.document;
    const svgs = [...wsDoc.querySelectorAll('svg.aid-svg')];
    expect(svgs).toHaveLength(4);
    expect(svgs[0].getAttribute('aria-label')).toContain('Ten-frame');
    expect(svgs[1].getAttribute('aria-label')).toContain('Number-line');
    expect(svgs[2].getAttribute('aria-label')).toContain('Array dot grid');
    expect(svgs[3].getAttribute('aria-label')).toContain('Equal groups');
    expect(wsDoc.querySelectorAll('.ws-work')).toHaveLength(4);

    // Separate Teacher Answer Key page with break-before: page and exact answers
    expect(html).toContain('break-before: page');
    const ak = wsDoc.querySelector('section.answer-key');
    expect(ak).toBeTruthy();
    const akItems = [...ak.querySelectorAll('ol.ak-grid li')].map((li) => li.textContent.trim());
    expect(akItems).toEqual([
      '1.6 + 7 = 13',
      '2.14 ' + MINUS + ' 5 = 9',
      '3.3 ' + X + ' 4 = 12',
      '4.12 ' + DIVIDE + ' 3 = 4',
    ]);
  });

  it('builds a clean Independent worksheet preserving missing-number forms and omits Answer Key when includeAnswerKey is false', () => {
    const page = openPage();
    const html = page.w.AlloMathWorksheet.buildMathWorksheetHtml({
      title: 'Independent Fact Drill',
      scaffolded: false,
      includeAnswerKey: false,
      facts: [
        { a: 7, b: 8, op: 'mul' },
        { a: 15, b: 6, op: 'sub' },
        { word: '___ + 7 = 15', answer: '8' },
      ],
    });

    assertStrictMonochromeWorksheet(html);
    expect(html).toContain('data-mode="independent"');
    const wsDoc = new JSDOM(html).window.document;
    expect(wsDoc.querySelectorAll('svg.aid-svg')).toHaveLength(0);
    expect(wsDoc.querySelector('section.answer-key')).toBeNull();
    const rows = [...wsDoc.querySelectorAll('.ws-item')].map((el) => el.textContent.trim());
    expect(rows[0]).toContain('7 ' + X + ' 8 =');
    expect(rows[1]).toContain('15 ' + MINUS + ' 6 =');
    // Missing-number form preserved cleanly without duplicate "="
    expect(rows[2]).toBe('3.___ + 7 = 15');
  });
});

describe('Wave 6 Step 3 UI buttons: Download worksheet & Download classroom bundle (.zip)', () => {
  it('shows buttons once built, downloads standalone worksheet with revoked ObjectURL, and downloads valid 4-file .zip bundle', async () => {
    const page = openPage();
    expect(page.seen('download-worksheet')).toBe(false);
    expect(page.seen('download-bundle')).toBe(false);

    page.choose('kind', 'mul');
    page.choose('set', 'mul-7');
    page.$('next-1').click();
    page.choose('method', 'ccc');
    page.$('next-2').click();
    await page.until(() => page.seen('summary'), 'step 3 summary');

    expect(page.seen('download-worksheet')).toBe(true);
    expect(page.seen('download-bundle')).toBe(true);

    // 1. Download standalone worksheet
    page.$('download-worksheet').click();
    await new Promise((r) => setTimeout(r, 20));
    const wsDl = page.downloads.find((dl) => dl.name.endsWith('-math-worksheet.html'));
    expect(wsDl).toBeTruthy();
    expect(wsDl.name).toBe('math-facts-mul-7-ccc-math-worksheet.html');
    expect(page.revoked).toContain(wsDl.href);
    assertStrictMonochromeWorksheet(wsDl.blob.body);
    expect(wsDl.blob.body).toContain('Teacher Answer Key');

    // 2. Download 4-file classroom bundle (.zip)
    page.$('download-bundle').click();
    await new Promise((r) => setTimeout(r, 20));
    const zipDl = page.downloads.find((dl) => dl.name.endsWith('-math-classroom-bundle.zip'));
    expect(zipDl).toBeTruthy();
    expect(zipDl.name).toBe('math-facts-mul-7-ccc-math-classroom-bundle.zip');
    expect(page.revoked).toContain(zipDl.href);
    // Valid PK\x03\x04 ZIP header
    expect(Array.from(zipDl.blob.bytes.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const entries = unzipEntries(zipDl.blob.bytes);
    expect([...entries.keys()]).toEqual([
      '01-Interactive-Math-Practice.html',
      '02-Worksheet-Scaffolded.html',
      '03-Worksheet-Independent.html',
      '04-Teacher-Answer-Key.html',
    ]);

    // Interactive packet payload
    expect(entries.get('01-Interactive-Math-Practice.html')).toContain('Content-Security-Policy');
    expect(entries.get('01-Interactive-Math-Practice.html')).toContain('math_ccc');

    // Scaffolded worksheet (no answer key)
    const scaff = entries.get('02-Worksheet-Scaffolded.html');
    assertStrictMonochromeWorksheet(scaff);
    expect(scaff).toContain('data-mode="scaffolded"');
    expect(scaff).toContain('<svg class="aid-svg"');
    expect(scaff).not.toContain('section class="answer-key"');

    // Independent worksheet (no answer key)
    const indep = entries.get('03-Worksheet-Independent.html');
    assertStrictMonochromeWorksheet(indep);
    expect(indep).toContain('data-mode="independent"');
    expect(indep).not.toContain('section class="answer-key"');

    // Teacher copy with Answer Key page
    const keyDoc = entries.get('04-Teacher-Answer-Key.html');
    assertStrictMonochromeWorksheet(keyDoc);
    expect(keyDoc).toContain('section class="answer-key"');
    expect(keyDoc).toContain('Teacher Answer Key');

    // Leaving Step 3 hides both buttons
    page.$('back-3').click();
    expect(page.seen('download-worksheet')).toBe(false);
    expect(page.seen('download-bundle')).toBe(false);
  });

  it('hides #download-bundle when window.AlloPacketZip is unavailable', async () => {
    const page = openPage({ dropZip: true });
    page.choose('kind', 'add');
    page.choose('set', 'add-doubles');
    page.$('next-1').click();
    page.choose('method', 'ccc');
    page.$('next-2').click();
    await page.until(() => page.seen('summary'), 'step 3 summary without zip');

    expect(page.seen('download-worksheet')).toBe(true);
    expect(page.seen('download-bundle')).toBe(false);
  });
});

describe('Wave 6 Saved Local Teacher Presets (alloflow-math-presets/1)', () => {
  it('saves, persists across reload, applies, and deletes named math practice setups without storing student code names', () => {
    const page = openPage();
    page.choose('kind', 'mul');
    page.choose('set', 'mul-7');
    page.$('next-1').click();
    page.choose('method', 'rehearsal');
    page.$('back-2').click();

    // Put a code name in batch field to verify it is never stored in presets
    page.$('f-batch-names').value = 'SecretStudent9';

    page.$('math-preset-name').value = '7s Rehearsal Group';
    page.$('math-preset-save').click();

    const raw = page.w.localStorage.getItem(PRESET_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain('SecretStudent9');
    const saved = JSON.parse(raw);
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0]).toMatchObject({
      name: '7s Rehearsal Group',
      kind: 'mul',
      method: 'rehearsal',
    });
    expect(saved.items[0].sets.mul).toBe('mul-7');
    expect(page.$('math-preset-select').options).toHaveLength(2);
    expect(page.$('math-preset-delete').disabled).toBe(false);

    // Reload page with only PRESET_KEY in storage and apply preset
    const fresh = openPage({ storage: { [PRESET_KEY]: raw } });
    expect(fresh.$('math-preset-select').options).toHaveLength(2);
    fresh.$('math-preset-select').value = saved.items[0].id;
    fresh.$('math-preset-select').dispatchEvent(new fresh.w.Event('change', { bubbles: true }));

    expect(fresh.d.querySelector('input[name="kind"]:checked').value).toBe('mul');
    expect(fresh.d.querySelector('input[name="set"]:checked').value).toBe('mul-7');
    fresh.$('next-1').click();
    expect(fresh.d.querySelector('input[name="method"]:checked').value).toBe('rehearsal');

    // Delete preset
    fresh.$('back-2').click();
    fresh.$('math-preset-delete').click();
    expect(fresh.$('math-preset-select').options).toHaveLength(1);
    expect(fresh.$('math-preset-delete').disabled).toBe(true);
    expect(JSON.parse(fresh.w.localStorage.getItem(PRESET_KEY)).items).toHaveLength(0);
  });
});
