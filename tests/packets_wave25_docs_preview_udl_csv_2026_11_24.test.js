// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

async function waitUntil(fn, tries = 80) {
  for (let i = 0; i < tries; i++) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 15));
  }
  return fn();
}

describe('Wave 25: About/IT 15-maker refresh, AAC/Compile hostPreview, and Results UDL CSV + QR shortcut', () => {
  it('updates packets-about.html and packets-it.html with full 15-maker / AAC / SEL / Compile / handoff disclosures while preserving calm invariants', () => {
    const aboutRaw = read('packets-about.html');
    const itRaw = read('packets-it.html');
    const aboutDoc = new JSDOM(aboutRaw).window.document;
    const itDoc = new JSDOM(itRaw).window.document;

    const aboutText = aboutDoc.body.textContent.replace(/\s+/g, ' ');
    const itText = itDoc.body.textContent.replace(/\s+/g, ' ');

    expect(aboutText).toContain('Fifteen offline makers');
    expect(aboutText).toContain('Starter Pack Library');
    expect(aboutDoc.querySelector('a[href="packets-packs.html"]')).not.toBeNull();
    expect(aboutText).toContain('AAC communication boards');
    expect(aboutText).toContain('Compile Activity strips external links');

    expect(itText).toContain('On UDL Choice Boards, the pathway the student chose');
    expect(itText).toContain('On non-scored Focus and UDL Toolkits, private reflection notes');
    expect(itText).toContain('An AAC communication board file likewise plays only audio clips stored inside the file');
    expect(itText).toContain('Compile Activity (packets-compile.html) removes external web addresses');
    expect(itText).toContain('One-click file handoff between Open, the fifteen makers, and the Starter Pack Library');

    const PROMISES = /\b(?:safe|safely|safety|safer|unsafe|secure|securely|security|insecure|guarantee[ds]?|certif\w*|compliant|compliance|tamper-?proof|trusted|bulletproof)\b/i;
    const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
    for (const raw of [aboutRaw, itRaw]) {
      const cleaned = raw.replace(/Content-Security-Policy/gi, '');
      expect(PROMISES.exec(cleaned)).toBeNull();
      expect(BRITISH.exec(cleaned)).toBeNull();
    }
    expect(aboutText).not.toContain('!');
    expect(itText).not.toContain('!');
  });

  it('wires live AlloPacketHandoff.hostPreview (host, update, stop) in both packets-aac.html and packets-compile.html', () => {
    const cases = [
      {
        html: 'packets-aac.html',
        scripts: ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packet_aac_builder.js', 'packets-aac.js'],
      },
      {
        html: 'packets-compile.html',
        scripts: ['packets-page.js', 'word_sounds_take_home_loader.js', 'packet_sort_write_adapters.js', 'packet_choice_builder.js', 'packets_main_app_compiler.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packets-compile.js'],
      },
    ];

    for (const c of cases) {
      const dom = new JSDOM(read(c.html), {
        url: `https://packets.test/${c.html}`,
        runScripts: 'dangerously',
        pretendToBeVisual: true,
      });
      const w = dom.window;
      let blobSeq = 0;
      const events = [];
      w.URL.createObjectURL = () => `blob:https://packets.test/preview-${++blobSeq}`;
      w.URL.revokeObjectURL = () => {};

      for (const s of c.scripts) {
        w.eval(read(s));
        if (s === 'packets_handoff.js') {
          w.AlloPacketHandoff = Object.assign({}, w.AlloPacketHandoff, {
            hostPreview: (opts) => {
              events.push({ type: 'host', url: opts.url, len: opts.html.length });
              return {
                update: (next) => events.push({ type: 'update', url: next.url, len: next.html.length }),
                stop: () => events.push({ type: 'stop' }),
              };
            },
          });
        }
      }
      const d = w.document;
      if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

      // Jump to Step 3 -> triggers build + hostPreview
      d.querySelector('.step-tab[data-go="3"]').click();
      expect(events.filter((e) => e.type === 'host').length).toBe(1);
      expect(events[0].len).toBeGreaterThan(2000);
      expect(d.getElementById('try').getAttribute('href')).toContain('packets-try.html#blob:');

      // Re-entering Step 3 updates the active hostPreview session cleanly
      d.querySelector('.step-tab[data-go="3"]').click();
      expect(events.filter((e) => e.type === 'update').length).toBe(1);

      // Clicking forget stops the preview session
      d.getElementById('forget').click();
      expect(events.filter((e) => e.type === 'stop').length).toBeGreaterThanOrEqual(1);

      dom.window.close();
    }
  });

  it('packets-results.html links to Collect by sealed QR and exports formula-neutralized UDL & Supports CSV', async () => {
    const dom = new JSDOM(read('packets-results.html'), {
      url: 'https://packets.test/packets-results.html',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const downloads = [];
    const blobs = new Map();
    let seq = 0;
    w.URL.createObjectURL = (blob) => {
      const url = `blob:udl-${++seq}`;
      blobs.set(url, blob);
      return url;
    };
    w.URL.revokeObjectURL = () => {};
    const origClick = w.HTMLAnchorElement.prototype.click;
    w.HTMLAnchorElement.prototype.click = function () {
      if (this.download && blobs.has(this.href)) {
        downloads.push({ name: this.download, blob: blobs.get(this.href) });
      }
    };

    for (const s of ['packets-page.js', 'packets_results_reader.js', 'packets_followup.js', 'packets_handoff.js', 'packets-results.js']) {
      w.eval(read(s));
    }
    const d = w.document;
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    // QR workflow guidance visible on empty state while preserving calm two-button empty layout
    expect(d.querySelector('#state-empty .drop-tip').textContent).toContain('Collect by sealed QR');

    const payloadChoice = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'UDL-CSV-1',
      learner: '=SUM(A1)',
      packet: { id: 'cb-eco', version: 'r1', form: '', mode: 'practice' },
      lessonId: 'cb-eco',
      revision: 'r1',
      lessonTitle: 'Ecosystems Choice',
      activityTitles: { choice_board: 'UDL Choice Board' },
      startedLocal: '2026-11-24T09:00:00-05:00',
      finishedLocal: '2026-11-24T09:08:00-05:00',
      durationMs: 480000,
      activeMs: 440000,
      summary: { items: 1, done: 1, firstTry: 1, afterRetry: 0, missed: 0, practised: 0 },
      items: [
        {
          n: 1,
          itemId: 'c1',
          activity: 'choice_board',
          word: 'Food Web',
          target: 'done',
          responses: ['mod:concept_sort'],
          attempts: 1,
          correct: true,
          firstTry: true,
          done: true,
          ms: 45000,
          supports: { modality_concept_sort: 1, modality_switch: 1, bilingual_dir: 1 },
          practice: null,
          flag: '',
        },
      ],
    });
    const payloadSel = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'UDL-CSV-2',
      learner: 'Noah',
      packet: { id: 'sel-calm', version: 'r1', form: '', mode: 'practice' },
      lessonId: 'sel-calm',
      revision: 'r1',
      lessonTitle: 'Calm Break',
      activityTitles: { sel_calm_toolkit: 'Calm Break' },
      startedLocal: '2026-11-24T09:15:00-05:00',
      finishedLocal: '2026-11-24T09:18:00-05:00',
      durationMs: 180000,
      activeMs: 160000,
      summary: { items: 1, done: 1, firstTry: 0, afterRetry: 0, missed: 0, practised: 1 },
      items: [
        { n: 1, itemId: 's1', activity: 'sel_calm_toolkit', word: 'Calm reset', target: '', responses: ['done'], attempts: 1, correct: null, firstTry: null, done: true, ms: 30000, supports: { calmBreath: 2 }, practice: true, flag: '' },
      ],
    });

    const f1 = new w.File([payloadChoice], 'choice.json', { type: 'application/json' });
    const f2 = new w.File([payloadSel], 'sel.json', { type: 'application/json' });
    Object.defineProperty(d.getElementById('files'), 'files', { configurable: true, value: [f1, f2] });
    d.getElementById('files').dispatchEvent(new w.Event('change'));

    const ready = await waitUntil(() => !d.getElementById('state-results').hidden);
    expect(ready).toBe(true);

    d.getElementById('save-udl-csv').click();
    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toMatch(/^results-udl-supports__\d{4}-\d{2}-\d{2}\.csv$/);
    const csvBytes = new Uint8Array(await downloads[0].blob.arrayBuffer());
    expect(Array.from(csvBytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const csvText = await downloads[0].blob.text();
    expect(csvText).toContain('"student_code","sessions","date_range","choice_pathways"');
    // Formula injection neutralized with leading apostrophe
    expect(csvText).toContain('"\'=SUM(A1)"');
    expect(csvText).toContain('Concept Sort (1)');
    expect(csvText).toContain('Home-language directions (1)');
    expect(csvText).toContain('"Noah"');
    expect(csvText).toContain('Box breathing guide (2)');
    expect(d.getElementById('take-said').textContent).toContain('results-udl-supports__');

    w.HTMLAnchorElement.prototype.click = origClick;
    dom.window.close();
  });
});
