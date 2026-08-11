import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Second round of Music Synthesizer fixes:
//  - a duplicate sequencer declaration that made ~20 lines unreachable
//  - a metronome that was fully implemented but had no control anywhere
//  - a tempo value (d.bpm) that was read in two places and written in none
//  - held notes that were never released when the tool closed
//  - controls that announced a different control's name

const sourcePath = 'stem_lab/stem_tool_music.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

describe('Music Synthesizer — no shadowed declarations', () => {
  it('declares each sequencer control exactly once', () => {
    const source = read();
    // Two `function startSequencer()` declarations lived in this scope. Hoisting
    // meant the later one won and the earlier body was dead — and, worse, silently
    // reversible by reordering the two blocks.
    for (const name of ['startSequencer', 'stopSequencer', 'startMetronome', 'stopMetronome', 'startArpeggiator', 'stopArpeggiator']) {
      const count = (source.match(new RegExp('function ' + name + '\\s*\\(', 'g')) || []).length;
      expect(count, name + ' should be declared once, found ' + count).toBe(1);
    }
  });

  it('leaves no reference to the removed sequencer.s state', () => {
    const source = read();
    // window._alloSynthSeqInterval was only ever assigned by the dead body.
    expect(source).not.toMatch(/_alloSynthSeqInterval\s*=\s*setInterval/);
  });
});

describe('Music Synthesizer — metronome is reachable', () => {
  it('has a control that starts it', () => {
    const source = read();
    // Previously `startMetronome` appeared exactly once in the file: its own
    // definition. The engine, including five time signatures, could not be reached.
    const calls = (source.match(/startMetronome\(\)/g) || []).length;
    expect(calls, 'startMetronome should be called, not just defined').toBeGreaterThan(1);
    expect(source).toMatch(/onClick: function \(\) \{ if \(metroOn\) stopMetronome\(\); else startMetronome\(\); \}/);
  });

  it('exposes the toggle state and a real label to assistive tech', () => {
    const source = read();
    const at = source.indexOf("stem.music.metronome");
    expect(at).toBeGreaterThan(-1);
    const panel = source.slice(at, at + 3000);
    expect(panel).toMatch(/'aria-label': metroOn \? __alloT\('stem\.music\.stop_metronome'/);
    expect(panel).toMatch(/'aria-pressed': metroOn \? 'true' : 'false'/);
  });

  it('lets the student set the time signature that TIME_SIGS already supported', () => {
    const source = read();
    // d.timeSig was read by startMetronome and written by nothing.
    expect(source).toMatch(/upd\('timeSig', e\.target\.value\)/);
    expect(source).toMatch(/Object\.keys\(TIME_SIGS\)\.map/);
  });

  it('shows the beat position without requiring the accent to be heard', () => {
    const source = read();
    const at = source.indexOf('stem.music.aria_beat_of');
    expect(at, 'beat lamps should carry a live position label').toBeGreaterThan(-1);
    const block = source.slice(at - 400, at + 900);
    expect(block).toMatch(/d\.metroBeat === bi/);
  });
});

describe('Music Synthesizer — one tempo, and it is settable', () => {
  it('reads tempo from the value the UI writes', () => {
    const source = read();
    // Originally `var tempoBPM = d.seqBPM || 120;`. It now runs through safeBPM, so
    // assert the invariant — tempo derives from d.seqBPM — rather than the spelling.
    expect(source).toMatch(/var tempoBPM = \w+\(d\.seqBPM\);/);
    // d.bpm had no writer, so anything reading it was pinned to the default.
    expect(source).not.toMatch(/d\.bpm \|\| 120/);
    const writesSeqBPM = (source.match(/upd\('seqBPM'/g) || []).length;
    expect(writesSeqBPM).toBeGreaterThan(1);
  });

  it('restarts a running metronome when tempo or metre changes', () => {
    const source = read();
    // startMetronome captures both in its interval closure, so the new controls
    // would appear inert without this.
    const at = source.indexOf('Restart the metronome when tempo or time signature changes');
    expect(at).toBeGreaterThan(-1);
    const block = source.slice(at, at + 500);
    expect(block).toMatch(/startMetronome\(\)/);
    expect(block).toMatch(/\}, \[d\.seqBPM, d\.timeSig\]\)/);
  });
});

describe('Music Synthesizer — held notes are released', () => {
  it('has a stopAllNotes helper wired into teardown', () => {
    const source = read();
    expect(source).toContain('function stopAllNotes()');
    // The note registry lives on window and outlives the component, so a note held
    // while navigating away sustained forever — and its stale registry entry made
    // playNote() early-return for that key on every later visit.
    //
    // Assert that each transport is stopped in both teardown paths, rather than
    // pinning the exact call sequence: new transports get added to these lists (the
    // rhythm scheduler was, after this test was first written) and an order-sensitive
    // assertion fails on a correct change.
    const required = ['stopSequencer()', 'stopMetronome()', 'stopArpeggiator()', 'stopAllNotes()'];

    const unmountAt = source.indexOf('React.useEffect(function () { return function () { stopSequencer()');
    expect(unmountAt, 'unmount teardown effect').toBeGreaterThan(-1);
    const unmount = source.slice(unmountAt, source.indexOf('}, []);', unmountAt));
    for (const call of required) expect(unmount, 'unmount should call ' + call).toContain(call);

    const backAt = source.indexOf('setStemLabTool(null); stopSequencer()');
    expect(backAt, 'back-to-tools handler').toBeGreaterThan(-1);
    const back = source.slice(backAt, backAt + 220);
    for (const call of required) expect(back, 'back button should call ' + call).toContain(call);
  });

  it('iterates the whole registry rather than a known list of ids', () => {
    const source = read();
    const at = source.indexOf('function stopAllNotes()');
    const body = source.slice(at, at + 400);
    expect(body).toMatch(/Object\.keys\(reg\)/);
    // A throwing stopNote must still clear the entry, or the key stays unplayable.
    expect(body).toMatch(/catch \(e\) \{ delete reg\[id\]; \}/);
  });
});

describe('Music Synthesizer — controls announce themselves correctly', () => {
  const cases = [
    ['transport play/stop', /'aria-label': d\.seqPlaying \? __alloT\('stem\.music\.stop_sequencer'/, /"aria-label": __alloT\('stem\.music\.beats_per_minute', "Beats per minute"\),\s*\n\s*onClick: function \(\) \{ if \(d\.seqPlaying\)/],
    ['Karplus-Strong pluck', /'aria-label': __alloFmt\('stem\.music\.aria_pluck_note'/, /"aria-label": __alloT\('stem\.music\.music_theory_quiz', "Music Theory Quiz"\),\s*\n\s*onClick: function \(\) \{ playPlucked/],
    ['arpeggiator start/stop', /'aria-label': arpOn \? __alloT\('stem\.music\.stop_arpeggiator'/, /"aria-label": __alloT\('stem\.music\.pattern', "Pattern"\),\s*\n\s*onClick: function \(\) \{ if \(arpOn\)/],
  ];
  it.each(cases)('%s has its own name', (_label, present, absent) => {
    const source = read();
    expect(source).toMatch(present);
    expect(source).not.toMatch(absent);
  });

  it('gives each visualiser mode its own name, since the buttons show only a symbol', () => {
    const source = read();
    // All three shared one label reading "Toggle frequency spectrum", and their
    // visible content is a bare glyph, so the label was their only name.
    for (const key of ['viz_waveform', 'viz_lissajous', 'viz_helix']) {
      expect(source).toContain('stem.music.' + key);
    }
    expect(source).toMatch(/'aria-label': v\.name/);
    expect(source).toMatch(/'aria-pressed': vizMode === v\.id/);
  });

  it('marks every toggle button with aria-pressed', () => {
    const source = read();
    // Buttons that flip a mode should report their state, not just their name.
    expect((source.match(/'aria-pressed':/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});

describe('Music Synthesizer — AI explanations follow the UI language', () => {
  it('asks for the response in the student.s language', () => {
    const source = read();
    // callGemini has no language plumbing of its own; the host's
    // __alloTextLanguage passthrough is wired into the TTS path only.
    expect(source).toContain('function aiLanguageSuffix()');
    expect(source).toMatch(/window\.__alloTextLanguage/);
    expect(source).toMatch(/\+ aiLanguageSuffix\(\);/);
  });

  it('adds nothing when the language is already English', () => {
    const source = read().replace(/\r\n/g, '\n');
    const at = source.indexOf('function aiLanguageSuffix()');
    const body = source.slice(at, source.indexOf('}', source.indexOf('return', at)) + 1);
    const fn = new Function('window', 'return (' + body.replace('function aiLanguageSuffix()', 'function ()') + ')')({ __alloTextLanguage: 'English' });
    expect(fn()).toBe('');
    const fnEs = new Function('window', 'return (' + body.replace('function aiLanguageSuffix()', 'function ()') + ')')({ __alloTextLanguage: 'Spanish' });
    expect(fnEs()).toContain('Spanish');
  });
});
