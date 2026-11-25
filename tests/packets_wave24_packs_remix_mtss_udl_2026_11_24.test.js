// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const reader = require('../packets_results_reader.js');
const followup = require('../packets_followup.js');

async function waitUntil(fn, tries = 80) {
  for (let i = 0; i < tries; i++) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 15));
  }
  return fn();
}

describe('Wave 24: 1-click Starter Pack remixing, MTSS UDL parity & Group UDL notes copy', () => {
  it('packets-packs.html remixes direct-download Starter Packs via #open-file handoff straight into target makers', async () => {
    const dom = new JSDOM(read('packets-packs.html'), {
      url: 'https://packets.test/packets-packs.html',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const scripts = [
      'packets-page.js',
      'word_sounds_take_home_loader.js',
      'packet_math_practice_builder.js',
      'packet_sort_write_adapters.js',
      'packet_choice_builder.js',
      'packet_maze_builder.js',
      'packet_manipulative_builder.js',
      'packet_stem_lab_builder.js',
      'packet_life_skills_builder.js',
      'packet_aac_builder.js',
      'packet_sel_builder.js',
      'packet_playlist_builder.js',
      'packets_station_bilingual.js',
      'packets_handoff.js',
      'packets_starter_packs.js',
    ];
    const redirects = [];
    const draftRedirects = [];
    for (const s of scripts) {
      w.eval(read(s));
      if (s === 'packets_handoff.js') {
        w.AlloPacketHandoff = Object.assign({}, w.AlloPacketHandoff, {
          redirect: (file, href, hash) => {
            redirects.push({ name: file.name, bytes: file.bytes, href, hash });
            return Promise.resolve(true);
          },
          redirectDraft: (draft, href) => {
            draftRedirects.push({ draft, href });
            return Promise.resolve(true);
          },
        });
      }
    }
    w.eval(read('packets-packs.js'));
    const d = w.document;
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    // Direct-download packs across Wave 1 + Wave 2-4 remix via #open-file redirect with real .html bytes
    const directIds = [
      { id: 'oer_math_facts_make10_k2', href: 'packets-math-practice.html' },
      { id: 'oer_maze_reading_g45', href: 'packets-maze.html' },
      { id: 'oer_stem_circuits_g46', href: 'packets-stem-lab.html' },
      { id: 'oer_aac_core_16', href: 'packets-aac.html' },
      { id: 'oer_sel_ef_toolkit', href: 'packets-sel.html' },
    ];
    for (const item of directIds) {
      const btn = d.querySelector(`[data-pack-customize="${item.id}"]`);
      expect(btn, `Customize control for ${item.id}`).not.toBeNull();
      btn.click();
    }
    expect(redirects).toHaveLength(directIds.length);
    directIds.forEach((item, idx) => {
      expect(redirects[idx].href).toBe(item.href);
      expect(redirects[idx].hash).toBe('#open-file');
      expect(redirects[idx].bytes.byteLength).toBeGreaterThan(2000);
    });

    // Draft packs still use redirectDraft cleanly
    d.querySelector('[data-pack-customize="oer_vocab_tier2_g35"]').click();
    expect(draftRedirects).toHaveLength(1);
    expect(draftRedirects[0]).toMatchObject({ href: 'packets-vocab.html', draft: { kind: 'vocab' } });

    // End-to-end round-trip: feed the handed-off STEM Circuit bytes straight into packets-stem-lab.html#open-file
    const handedCircuit = redirects.find((r) => r.href === 'packets-stem-lab.html');
    const stemDom = new JSDOM(read('packets-stem-lab.html'), {
      url: 'https://packets.test/packets-stem-lab.html#open-file',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    });
    const sw = stemDom.window;
    for (const s of ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packet_stem_lab_builder.js']) {
      sw.eval(read(s));
      if (s === 'packets_handoff.js') {
        sw.AlloPacketHandoff = Object.assign({}, sw.AlloPacketHandoff, {
          take: () => Promise.resolve({ name: handedCircuit.name, bytes: handedCircuit.bytes }),
        });
      }
    }
    sw.eval(read('packets-stem-lab.js'));
    if (sw.document.readyState === 'loading') sw.document.dispatchEvent(new sw.Event('DOMContentLoaded'));
    const landed = await waitUntil(() => !sw.document.getElementById('step-2').hidden && !sw.document.getElementById('reopen-note').hidden);
    expect(landed).toBe(true);
    expect(sw.document.getElementById('reopen-line').textContent).toContain('Series Circuit Lab');

    stemDom.window.close();
    dom.window.close();
  });

  it('MTSS triage export includes student Choice Board pathways, Maze net sessions, group udlSummary, and keeps non-scored SEL/AAC toolkits untiered', async () => {
    const choiceSessionJson = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'CB-1',
      learner: 'Maya',
      packet: { id: 'cb-energy', version: 'r1', form: '', mode: 'practice' },
      lessonId: 'cb-energy',
      revision: 'r1',
      lessonTitle: 'Energy Choice Board',
      activityTitles: { choice_board: 'UDL Choice Board' },
      startedLocal: '2026-11-24T10:00:00-05:00',
      finishedLocal: '2026-11-24T10:05:00-05:00',
      durationMs: 300000,
      activeMs: 280000,
      summary: { items: 1, done: 1, firstTry: 1, afterRetry: 0, missed: 0, practised: 0 },
      items: [
        {
          n: 1,
          itemId: 'cb-1',
          activity: 'choice_board',
          word: 'Energy',
          target: 'done',
          responses: ['mod:concept_sort'],
          attempts: 1,
          correct: true,
          firstTry: true,
          done: true,
          ms: 40000,
          supports: { modality_concept_sort: 1, modality_switch: 1, bilingual_dir: 1, hint_shown: 1 },
          practice: null,
          flag: '',
        },
      ],
    });

    const mazeSessionJson = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'MZ-1',
      learner: 'Maya',
      packet: { id: 'maze-g4', version: 'r1', form: 'A', mode: 'probe' },
      lessonId: 'maze-g4',
      revision: 'r1',
      lessonTitle: 'River Valley Maze',
      activityTitles: { maze_reading: 'Maze Reading' },
      startedLocal: '2026-11-24T10:15:00-05:00',
      finishedLocal: '2026-11-24T10:18:00-05:00',
      durationMs: 180000,
      activeMs: 170000,
      score: {
        measure: 'maze_correct_3m',
        score: 5,
        scoreUnit: 'items_correct',
        itemsCorrect: 5,
        itemsAttempted: 6,
        timeLimitS: 0,
        untimed: true,
        elapsedS: 170,
        completion: 'complete',
        tools: ['lineGuide'],
      },
      summary: { items: 6, done: 6, firstTry: 5, afterRetry: 0, missed: 1, practised: 0 },
      items: [
        { n: 1, itemId: 'm1', activity: 'maze_reading', word: 'erosion', target: 'erosion', responses: ['erosion'], attempts: 1, correct: true, firstTry: true, done: true, ms: 3000, supports: {}, practice: null, flag: '' },
        { n: 2, itemId: 'm2', activity: 'maze_reading', word: 'valley', target: 'valley', responses: ['valley'], attempts: 1, correct: true, firstTry: true, done: true, ms: 3000, supports: {}, practice: null, flag: '' },
        { n: 3, itemId: 'm3', activity: 'maze_reading', word: 'stream', target: 'stream', responses: ['stream'], attempts: 1, correct: true, firstTry: true, done: true, ms: 3000, supports: {}, practice: null, flag: '' },
        { n: 4, itemId: 'm4', activity: 'maze_reading', word: 'canyon', target: 'canyon', responses: ['canyon'], attempts: 1, correct: true, firstTry: true, done: true, ms: 3000, supports: {}, practice: null, flag: '' },
        { n: 5, itemId: 'm5', activity: 'maze_reading', word: 'mineral', target: 'mineral', responses: ['mineral'], attempts: 1, correct: true, firstTry: true, done: true, ms: 3000, supports: {}, practice: null, flag: '' },
        { n: 6, itemId: 'm6', activity: 'maze_reading', word: 'sediment', target: 'sediment', responses: ['sentiment'], attempts: 1, correct: false, firstTry: false, done: true, ms: 3000, supports: {}, practice: null, flag: '' },
      ],
    });

    const selOnlyJson = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'SEL-1',
      learner: 'Noah',
      packet: { id: 'sel-kit', version: 'r1', form: '', mode: 'practice' },
      lessonId: 'sel-kit',
      revision: 'r1',
      lessonTitle: 'Calm Break Toolkit',
      activityTitles: { sel_calm_toolkit: 'Calm Break' },
      startedLocal: '2026-11-24T10:30:00-05:00',
      finishedLocal: '2026-11-24T10:33:00-05:00',
      durationMs: 180000,
      activeMs: 160000,
      summary: { items: 1, done: 1, firstTry: 0, afterRetry: 0, missed: 0, practised: 1 },
      items: [
        { n: 1, itemId: 's1', activity: 'sel_calm_toolkit', word: 'Calm reset', target: '', responses: ['done'], attempts: 1, correct: null, firstTry: null, done: true, ms: 30000, supports: { calmBreath: 2 }, practice: true, flag: '' },
      ],
    });

    const r1 = await reader.read(choiceSessionJson, { name: 'maya-choice.json' });
    const r2 = await reader.read(mazeSessionJson, { name: 'maya-maze.json' });
    const r3 = await reader.read(selOnlyJson, { name: 'noah-sel.json' });
    expect(r1.ok && r2.ok && r3.ok).toBe(true);

    const model = reader.addUp([r1.sessions[0], r2.sessions[0], r3.sessions[0]]);
    const triage = followup.buildMtssTriageExport(model, { reader, today: '2026-11-24', nowLocal: '2026-11-24T11:00:00' });

    const maya = triage.students.find((s) => s.studentCode === 'Maya');
    const noah = triage.students.find((s) => s.studentCode === 'Noah');
    expect(maya).toBeDefined();
    expect(maya.choicePathways).toEqual([{ label: 'Concept Sort', sessions: 1 }]);
    expect(maya.pathwaySwitchSessions).toBe(1);
    expect(maya.mazeNetSessions).toHaveLength(1);
    expect(maya.mazeNetSessions[0]).toMatchObject({ correct: 5, incorrect: 1, net: 4 });
    expect(maya.measures.some((m) => m.latestMazeNet && m.latestMazeNet.net === 4)).toBe(true);
    expect(maya.udlSupportsUsed.some((u) => /home-language directions/i.test(u))).toBe(true);

    // Non-scored SEL/AAC toolkit student must NEVER be placed in Tier 2 or Tier 3
    expect(noah).toBeDefined();
    expect(noah.suggestedTier).toBeNull();
    expect(noah.udlSupportsUsed.some((u) => /box breathing/i.test(u))).toBe(true);

    // Group-level UDL summary present
    expect(triage.udlSummary).toBeDefined();
    expect(triage.udlSummary.studentsWithChoicePathways).toBe(1);
    expect(triage.udlSummary.choicePathways).toEqual([{ label: 'Concept Sort', students: 1 }]);
    expect(triage.udlSummary.untimedStudents).toBe(1);
    expect(triage.udlSummary.supportsUsed.length).toBeGreaterThan(0);
  });

  it('packets-results.html Group View provides Copy group UDL notes with clipboard + manual fallback', async () => {
    const dom = new JSDOM(read('packets-results.html'), {
      url: 'https://packets.test/packets-results.html',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    let copiedText = '';
    let shouldFailClipboard = false;
    Object.defineProperty(w.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (txt) => {
          if (shouldFailClipboard) return Promise.reject(new Error('denied'));
          copiedText = txt;
          return Promise.resolve();
        },
      },
    });
    for (const s of ['packets-page.js', 'packets_results_reader.js', 'packets_followup.js', 'packets_handoff.js', 'packets-results.js']) {
      w.eval(read(s));
    }
    const d = w.document;
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    const payload = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'CB-G1',
      learner: 'Aria',
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
          responses: ['mod:tiered_writing'],
          attempts: 1,
          correct: true,
          firstTry: true,
          done: true,
          ms: 45000,
          supports: { modality_tiered_writing: 1, modality_switch: 1, bilingual_dir: 1, lab_circuit_toggle: 1 },
          practice: null,
          flag: '',
        },
      ],
    });
    const file = new w.File([payload], 'aria-choice.json', { type: 'application/json' });
    Object.defineProperty(d.getElementById('files'), 'files', { configurable: true, value: [file] });
    d.getElementById('files').dispatchEvent(new w.Event('change'));

    const ready = await waitUntil(() => !!d.getElementById('copy-group-udl'));
    expect(ready).toBe(true);

    // 1) Clipboard success path
    d.getElementById('copy-group-udl').click();
    await waitUntil(() => copiedText.length > 0);
    expect(copiedText).toContain('UDL pathways and supports summary (1 student)');
    expect(copiedText).toContain('Tiered Writing: 1 student');
    expect(copiedText).toContain('Bilingual home-language support: 1 student');
    expect(copiedText).toContain('never penalized');
    expect(d.getElementById('copy-group-udl-said').textContent).toContain('Copied group UDL notes');

    // 2) Manual textarea fallback when clipboard refuses
    shouldFailClipboard = true;
    d.getElementById('copy-group-udl').click();
    await waitUntil(() => !d.getElementById('copy-group-udl-box').hidden);
    const area = d.querySelector('#copy-group-udl-box textarea');
    expect(area).not.toBeNull();
    expect(area.value).toContain('Tiered Writing: 1 student');

    dom.window.close();
  });

  it('preserves strict CSP pure-DOM JS and token-only screen CSS', () => {
    for (const f of ['packets-packs.js', 'packets_followup.js', 'packets-results.js']) {
      expect(read(f)).not.toMatch(/\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/);
    }
    const cssBeforePrint = read('packets-results.css').split('@media print')[0];
    expect(cssBeforePrint).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
