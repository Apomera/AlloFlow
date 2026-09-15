// The journal is how student work leaves the tool and how it reaches a teacher: the
// student copies it as text, the teacher pastes a pile of them into the Class
// Snapshot. Between those two points sits a base64 footer (EVOLAB-JOURNAL-DATA:...)
// that must survive email clients, hand-editing, and an older build writing it.
//
// Nothing else guards that contract end to end. These tests exercise it with a rich
// progress object (unicode name, accented note text, a CER field note, a check with
// its first wrong answer, quiz passes, challenges, records, an exit ticket), then
// feed the snapshot eight corrupted variants of the same payload.
//
// NOTE: the payload only exists inside journalText(), which runs on COPY - it is not
// in the rendered DOM. Copy routes through window.alloCopyText (Canvas blocks
// navigator.clipboard), so the tests stub that to capture what a host would receive.
import { beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
let copied = '';
function captureCopy() { copied = ''; window.alloCopyText = function (text) { copied = String(text); return true; }; }
const clickCopy = (c) => { const b = Array.from(c.querySelectorAll('button')).find((x) => /Copy as text|Copy journal|📋/.test(x.textContent)); if (!b) throw new Error('no copy button: ' + Array.from(c.querySelectorAll('button')).map((x) => x.textContent.trim()).slice(0, 25).join(' | ')); act(() => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))); return copied; };
function mountEvo(initialToolData) {
  const cfg = window.StemLab._registry.evoLab; const container = document.createElement('div'); document.body.appendChild(container);
  function Host() { const [toolData, setToolData] = React.useState(initialToolData); return cfg.render(makeCtx({ toolData, update: (id, k, v) => setToolData((p) => Object.assign({}, p, { [id]: Object.assign({}, p[id], { [k]: v }) })) })); }
  const root = ReactDOMClient.createRoot(container); act(() => root.render(React.createElement(Host))); return { container, root };
}
function setNativeValue(node, value) { const proto = node instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new window.Event('input', { bubbles: true })); }

// A rich progress object exercising every field the journal packs.
const richProgress = () => ({
  completed: { beakLab: { at: '2026-09-15T00:00:00.000Z', note: 'Ran it' }, hardyWeinberg: { at: '2026-09-15T00:00:00.000Z', note: 'Stepped' } },
  experiments: { beakLab: { predictChicks: { at: '2026-09-15T00:00:00.000Z', title: "The Grants' test" } } },
  predictions: { beakLab: { choice: 'increase', outcome: 'increase', matched: true, at: '2026-09-15T00:00:00.000Z' } },
  checks: { 'beakLab:h2': { choice: 'herit', correct: true, tries: 2, firstChoice: 'grow', firstWrong: true, firstChoiceLabel: 'Still growing', question: 'Why not a full half-millimetre?' } },
  challenges: { beakLab: { bigBeaks: { at: '2026-09-15T00:00:00.000Z', title: 'Deep beaks' } } },
  records: { beakLab: { deepestMean: { value: 10.6, label: 'Deepest mean beak', unit: ' mm', better: 'max', at: '2026-09-15T00:00:00.000Z' } } },
  notes: { beakLab: { text: 'Claim: beaks got deeper.\nEvidence: 9.2 to 10.4 mm.\nReasoning: survivors bred.', at: '2026-09-15T00:00:00.000Z', cer: { claim: 'Beaks got deeper.', evidence: '9.2 → 10.4 mm, 22 survivors', reasoning: 'Selection then inheritance' } } },
  exitTickets: { 1: { text: 'Variation comes first — naïve façade, 90% ± 2', confidence: 'mostly', at: '2026-09-15T00:00:00.000Z' } },
  quiz: { passes: 2, first: { at: '2026-09-15T00:00:00.000Z', score: 9, missed: [0, 1, 2] }, latest: { at: '2026-09-15T00:00:00.000Z', score: 11, missed: [1] }, lastKey: 'x' }
});

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); document.body.innerHTML = ''; try { window.localStorage.clear(); } catch (e) {} });

describe('journal → class snapshot round trip ', () => {
  it('carries every field, including unicode and CER notes, into the snapshot', () => {
    // 1. render the journal and pull out the encoded payload
    captureCopy();
    const j = mountEvo({ evoLab: { view: 'journal', evoProgress: richProgress(), evoCapstone: { studentName: 'Ana Ó’Brien 学生' } } });
    const text = clickCopy(j.container);
    const m = text.match(/EVOLAB-JOURNAL-DATA:([A-Za-z0-9+/=]+)\./);
    expect(m).toBeTruthy();
    act(() => j.root.unmount());

    // 2. it must decode to the same values that went in
    const decoded = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    expect(decoded.v).toBe(1);
    expect(decoded.name).toBe('Ana Ó’Brien 学生');
    expect(decoded.completed).toContain('beakLab');
    expect(decoded.challenges).toContain('beakLab:bigBeaks');
    expect(decoded.checks['beakLab:h2'].ok).toBe(true);
    expect(decoded.checks['beakLab:h2'].first).toBe('grow');
    expect(decoded.predictions.beakLab.m).toBe(true);
    expect(decoded.notes.beakLab).toContain('9.2 to 10.4 mm');
    expect(decoded.tickets['1'].t).toContain('naïve façade');
    expect(decoded.quiz).toEqual({ n: 2, f: { s: 9, m: [0, 1, 2] }, l: { s: 11, m: [1] } });
    expect(decoded.expCount).toBe(1);

    // 3. paste it into the snapshot and check it reads back
    const s = mountEvo({ evoLab: { view: 'classSnapshot' } });
    act(() => { setNativeValue(s.container.querySelector('#evolab-snapshot-paste'), 'Journal\n' + m[0]); });
    const t = s.container.textContent;
    expect(t).toContain('1 journal read');
    expect(t).toContain('Ana Ó’Brien 学生');
    expect(t).toContain('naïve façade');
    expect(t).toContain('Why not a full half-millimetre?');
    expect(t).toContain('Misconceptions quiz: first pass vs latest');
    expect(t).toContain('1 student with a first pass, 1 with two or more');
    act(() => s.root.unmount());
  });

  it('survives a journal whose payload is truncated, padded or re-encoded', () => {
    captureCopy();
    const j = mountEvo({ evoLab: { view: 'journal', evoProgress: richProgress(), evoCapstone: { studentName: 'Bo' } } });
    const m = clickCopy(j.container).match(/EVOLAB-JOURNAL-DATA:([A-Za-z0-9+/=]+)\./);
    act(() => j.root.unmount());
    const payload = m[1];
    const variants = [
      'EVOLAB-JOURNAL-DATA:' + payload.slice(0, payload.length - 10) + '.',   // truncated
      'EVOLAB-JOURNAL-DATA:' + payload.slice(0, 8) + '.',                      // badly truncated
      'EVOLAB-JOURNAL-DATA:.',                                                // empty
      'EVOLAB-JOURNAL-DATA:not-base64!!.',                                     // junk
      'EVOLAB-JOURNAL-DATA:' + btoa('{"v":2}') + '.',                          // wrong version
      'EVOLAB-JOURNAL-DATA:' + btoa('[]') + '.',                               // wrong root type
      m[0] + '\n' + m[0],                                                      // duplicated (2 journals)
      '  ' + m[0].replace(/(.{20})/g, '$1\n') + '  '                           // line-wrapped by an email client
    ];
    for (const v of variants) {
      const s = mountEvo({ evoLab: { view: 'classSnapshot' } });
      expect(() => act(() => { setNativeValue(s.container.querySelector('#evolab-snapshot-paste'), v); })).not.toThrow();
      act(() => s.root.unmount());
    }
  });
});

// A teacher pastes journals out of a mail thread; a student who sent theirs twice
// used to be counted twice in every class percentage, silently. Exact repeats are now
// dropped by payload and reported beside the unreadable count.
const enc = (o) => 'EVOLAB-JOURNAL-DATA:' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))) + '.';
const paste = (c, text) => act(() => { setNativeValue(c.querySelector('#evolab-snapshot-paste'), text); });
describe('duplicate journals', () => {
  const ana = enc({ v: 1, name: 'Ana', completed: ['beakLab'], checks: {}, predictions: {}, challenges: [], notes: {}, tickets: {} });
  const bo = enc({ v: 1, name: 'Bo', completed: ['beakLab', 'hardyWeinberg'], checks: {}, predictions: {}, challenges: [], notes: {}, tickets: {} });

  it('counts a repeated journal once and says so', () => {
    const { container, root } = mountEvo({ evoLab: { view: 'classSnapshot' } });
    paste(container, ana + '\n' + bo + '\n' + ana);
    const t = container.textContent;
    expect(t).toContain('2 journals read');
    expect(t).toContain('1 duplicate skipped');
    // Ana is listed once per section she appears in, exactly as Bo is, plus the
    // extra section (field notes) she has and he does not: never twice in one place.
    expect((t.match(/Ana/g) || []).length).toBe((t.match(/Bo(?![a-z])/g) || []).length + 1);
    // Both students completed the beak lab, so the class count is 2 of 2 — the
    // number that would read 3 of 3 (or 2 of 3) if the duplicate had been counted.
    expect(t).toMatch(/Gal[aá]pagos Beak Lab[^0-9]{0,30}2\D{0,4}2/);
    act(() => root.unmount());
  });

  it('pluralises, and stays silent when there are no duplicates', () => {
    let m = mountEvo({ evoLab: { view: 'classSnapshot' } });
    paste(m.container, ana + '\n' + ana + '\n' + ana);
    expect(m.container.textContent).toContain('1 journal read');
    expect(m.container.textContent).toContain('2 duplicates skipped');
    act(() => m.root.unmount());
    m = mountEvo({ evoLab: { view: 'classSnapshot' } });
    paste(m.container, ana + '\n' + bo);
    expect(m.container.textContent).toContain('2 journals read');
    expect(m.container.textContent).not.toContain('duplicate');
    act(() => m.root.unmount());
  });

  it('two students with the same name are still two journals', () => {
    const ana2 = enc({ v: 1, name: 'Ana', completed: ['coevolution'], checks: {}, predictions: {}, challenges: [], notes: {}, tickets: {} });
    const { container, root } = mountEvo({ evoLab: { view: 'classSnapshot' } });
    paste(container, ana + '\n' + ana2);
    expect(container.textContent).toContain('2 journals read');
    expect(container.textContent).not.toContain('duplicate');
    act(() => root.unmount());
  });
});

// A teacher opening the Class Snapshot cold saw instructions and "0 journals read":
// no way to judge whether the tool is worth asking thirty students for their journals.
// The sample class builds six journals in the real payload format, so the whole output
// is visible before any student has done anything.
const clickBtn = (el) => act(() => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
const btnText = (c, text) => Array.from(c.querySelectorAll("button")).find((b) => b.textContent.includes(text));
describe('Class Snapshot sample class ', () => {
  it('offers a sample before anything is pasted, and the empty state says so', () => {
    const { container, root } = mountEvo({ evoLab: { view: 'classSnapshot' } });
    expect(container.querySelector('[data-snapshot-sample]')).toBeTruthy();
    expect(container.textContent).toContain('Show me a sample class');
    expect(container.textContent).toContain('using six made-up students');
    expect(container.textContent).toContain('0 journals read');
    act(() => root.unmount());
  });

  it('loading the sample fills every section a real class would', () => {
    const { container, root } = mountEvo({ evoLab: { view: 'classSnapshot' } });
    clickBtn(container.querySelector('[data-snapshot-sample]'));
    const t = container.textContent;
    expect(t).toContain('6 journals read');
    expect(t).not.toContain('duplicate');
    // roster, completion, misconception map, reteach plan, quiz comparison, notes, tickets
    expect(t).toContain('Roster (6)');
    expect(t).toContain('Sample: Ada');
    expect(t).toContain('Sample: Farrah');
    expect(t).toMatch(/Misconception map/);
    expect(t).toMatch(/Reteach|reteach/);
    expect(t).toContain('Misconceptions quiz: first pass vs latest');
    expect(t).toContain('3 students with a first pass, 2 with two or more');
    // the seeded misconception should surface as the common wrong first answer
    expect(t).toContain('They had not finished growing');
    expect(t).toContain('The fittest allele won');
    // field notes and an exit ticket carried through
    expect(t).toContain('The small-beaked ones died');
    expect(t).toContain('Still not sure how the beaks knew to change');
    act(() => root.unmount());
  });

  it('the sample can be cleared, and the button returns', () => {
    const { container, root } = mountEvo({ evoLab: { view: 'classSnapshot' } });
    clickBtn(container.querySelector('[data-snapshot-sample]'));
    expect(container.textContent).toContain('6 journals read');
    expect(container.querySelector('[data-snapshot-sample]')).toBeNull();
    const clear = btnText(container, 'Clear');
    expect(clear).toBeTruthy();
    clickBtn(clear);
    expect(container.textContent).toContain('0 journals read');
    expect(container.querySelector('[data-snapshot-sample]')).toBeTruthy();
    act(() => root.unmount());
  });

  it('every sample journal is well formed and distinct', () => {
    const { container, root } = mountEvo({ evoLab: { view: 'classSnapshot' } });
    clickBtn(container.querySelector('[data-snapshot-sample]'));
    const box = container.querySelector('#evolab-snapshot-paste');
    const payloads = (box.value.match(/EVOLAB-JOURNAL-DATA:([A-Za-z0-9+/=]+)\./g) || []);
    expect(payloads.length).toBe(6);
    expect(new Set(payloads).size).toBe(6);
    for (const p of payloads) {
      const obj = JSON.parse(decodeURIComponent(escape(atob(p.slice('EVOLAB-JOURNAL-DATA:'.length, -1)))));
      expect(obj.v).toBe(1);
      expect(String(obj.name)).toMatch(/^Sample: /);
    }
    act(() => root.unmount());
  });
});

// A full journal copied to the clipboard measured 74,832 characters before this cap:
// a student pastes that into an LMS box, a teacher pastes thirty into the Snapshot.
// The readable half now trims long prose (the payload already capped its own copy),
// which halved the paste without losing anything the teacher receives.
const LONG_NOTE = 'The drought killed the small-beaked birds and the average moved without any single beak changing. ';
function progressWithNote(text) {
  return { completed: { beakLab: { at: '', note: 'Done' } }, experiments: {}, predictions: {}, checks: {}, challenges: {}, records: {},
    notes: { beakLab: { text: text, at: '2026-09-15T00:00:00.000Z' } },
    exitTickets: { 1: { text: text, confidence: 'sure', at: '2026-09-15T00:00:00.000Z' } } };
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); document.body.innerHTML = ''; copied = ''; window.alloCopyText = function (t) { copied = String(t); return true; }; });

describe('journal copy stays paste-able ', () => {
  it('shortens long answers in the readable half and says so', () => {
    const long = LONG_NOTE.repeat(20); // ~2000 chars
    const m = mountEvo({ evoLab: { view: 'journal', evoProgress: progressWithNote(long), evoCapstone: { studentName: 'Sam' } } });
    const text = clickCopy(m.container);
    const readable = text.slice(0, text.indexOf('EVOLAB-JOURNAL-DATA:'));
    // the note is present but trimmed, with an ellipsis marker and a one-line explanation
    expect(readable).toContain('The drought killed the small-beaked birds');
    expect(readable).toContain('[…]');
    expect(readable).toContain('2 long answers shortened to keep this paste-able');
    expect(readable).toContain('The full text is still in the tool');
    // no single line carries the whole 2000-character note
    for (const line of readable.split('\n')) expect(line.length).toBeLessThan(900);
    act(() => m.root.unmount());
  });

  it('leaves short answers untouched and says nothing', () => {
    const m = mountEvo({ evoLab: { view: 'journal', evoProgress: progressWithNote('Short and clear.'), evoCapstone: { studentName: 'Sam' } } });
    const text = clickCopy(m.container);
    expect(text).toContain('Short and clear.');
    expect(text).not.toContain('[…]');
    expect(text).not.toContain('shortened to keep this paste-able');
    act(() => m.root.unmount());
  });

  it('the teacher still receives the note through the payload', () => {
    const long = LONG_NOTE.repeat(20);
    const j = mountEvo({ evoLab: { view: 'journal', evoProgress: progressWithNote(long), evoCapstone: { studentName: 'Sam' } } });
    const text = clickCopy(j.container);
    act(() => j.root.unmount());
    const s = mountEvo({ evoLab: { view: 'classSnapshot' } });
    act(() => { setNativeValue(s.container.querySelector('#evolab-snapshot-paste'), text); });
    const shown = s.container.textContent;
    expect(shown).toContain('1 journal read');
    expect(shown).toContain('The drought killed the small-beaked birds');
    act(() => s.root.unmount());
  });

  it('a full journal copies to well under half of what it used to', () => {
    const MODULES = ['predatorVision', 'mateChoice', 'climatePressure', 'selectionSandbox', 'beakLab', 'speciation', 'phyloBuilder', 'hardyWeinberg', 'geneticDrift', 'commonAncestry', 'antibioticLab', 'coevolution', 'discoveryTimeline', 'misconceptions', 'selectionSleuth', 'homologySleuth', 'capstone'];
    const p = { completed: {}, experiments: {}, predictions: {}, checks: {}, challenges: {}, records: {}, notes: {}, exitTickets: {} };
    const long = LONG_NOTE.repeat(20);
    for (const mod of MODULES) {
      p.completed[mod] = { at: '', note: 'Finished' };
      p.notes[mod] = { text: long, at: '' };
      p.experiments[mod] = { e1: { at: '', title: 'An experiment' } };
    }
    for (let d = 1; d <= 5; d++) p.exitTickets[d] = { text: long, confidence: 'sure', at: '' };
    const m = mountEvo({ evoLab: { view: 'journal', evoProgress: p, evoCapstone: { studentName: 'Sam' } } });
    const text = clickCopy(m.container);
    expect(text.length).toBeLessThan(45000);
    // the payload the teacher needs is untouched by the cap
    expect(text).toMatch(/EVOLAB-JOURNAL-DATA:[A-Za-z0-9+/=]{5000,}\./);
    act(() => m.root.unmount());
  });
});
