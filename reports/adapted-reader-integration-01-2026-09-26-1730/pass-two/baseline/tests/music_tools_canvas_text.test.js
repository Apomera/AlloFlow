import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Text drawn with fillText lives outside JSX, so nothing that inspects props, toasts
// or announcements will ever see it. Every one of these labels was English-only after
// four rounds of localisation work precisely because it was invisible to the scanners.
//
// The compass letters are the sharpest case: cardinal initials are not universal.
// Spanish uses O for Oeste and German O for Ost, so a hardcoded 'W' is wrong in both
// — inside a tool whose entire purpose is navigating by sound.

const files = {
  music: 'stem_lab/stem_tool_music.js',
  singing: 'stem_lab/stem_tool_singing.js',
  echotrainer: 'stem_lab/stem_tool_echotrainer.js',
};
const read = (k) => fs.readFileSync(files[k], 'utf8');

describe('canvas text — nothing word-bearing is hardcoded', () => {
  it.each(Object.keys(files))('%s draws no bare English string', (tool) => {
    const source = read(tool);
    // A literal of three or more letters passed straight to fillText. Single glyphs
    // (clef, sharp sign, compass arrows) are exempt: they are notation, not language.
    const bare = [...source.matchAll(/fillText\((['"])([A-Za-z][A-Za-z ]{2,})\1/g)].map((m) => m[2]);
    expect(bare).toEqual([]);
  });
});

describe('canvas text — Music Synthesizer', () => {
  it('routes the visualiser and harmonic overlays through the translator', () => {
    const source = read('music');
    for (const key of ['canvas_waveform', 'canvas_spectrum', 'canvas_harmonics',
      'canvas_active_harmonics', 'canvas_harmonics_hint', 'canvas_timbre_caption']) {
      expect(source, key).toContain('stem.music.' + key);
    }
  });

  it('uses a placeholder for the harmonic list rather than concatenation', () => {
    const source = read('music');
    expect(source).toMatch(/__alloFmt\('stem\.music\.canvas_active_harmonics', 'Active harmonics: \{list\}'/);
    expect(source).not.toMatch(/fillText\('Active harmonics: ' \+/);
  });
});

describe('canvas text — Singing Lab', () => {
  it('takes each label through an options bag, since the helpers are module scope', () => {
    const source = read('singing');
    // The draw helpers sit above the render closure, so they cannot reach __alloT.
    expect(source).toMatch(/function drawCentsMeter\(canvas, cents, isDark, labels\)/);
    expect(source).toMatch(/function drawVibratoTrace\(canvas, history, isDark, labels\)/);
    expect(source).toMatch(/function drawIntervalStaff\(canvas, refMidi, targetMidi, studentMidi, isDark, labels\)/);
    for (const key of ['canvas_flat', 'canvas_sharp', 'canvas_vibrato_empty',
      'canvas_reference', 'canvas_target', 'canvas_you', 'canvas_anatomy_title']) {
      expect(source, key).toContain('stem.singing.' + key);
    }
  });

  it('keeps an English fallback in the helper, so a missing label never blanks the canvas', () => {
    const source = read('singing');
    expect(source).toMatch(/L\.flat \|\| 'Flat'/);
    expect(source).toMatch(/L\.sharp \|\| 'Sharp'/);
    expect(source).toMatch(/L\.reference \|\| 'Reference'/);
    expect(source).toMatch(/L\.target \|\| 'Target'/);
    expect(source).toMatch(/L\.you \|\| 'You'/);
    expect(source).toMatch(/L\.empty \|\| 'Sustain a note to see vibrato waveform'/);
    expect(source).toMatch(/\(opts && opts\.title\) \|\| 'Sagittal Cross-Section of the Vocal Tract'/);
  });

  it('passes the title from every drawVocalAnatomy caller', () => {
    const source = read('singing');
    const calls = (source.match(/drawVocalAnatomy\(anatomyCanvasRef/g) || []).length;
    const titled = (source.match(/stem\.singing\.canvas_anatomy_title/g) || []).length;
    expect(calls).toBe(3);
    // One key reference per caller, plus none needed in the helper itself.
    expect(titled).toBe(calls);
  });
});

describe('canvas text — Echo Navigator', () => {
  it('localises the compass initials', () => {
    const source = read('echotrainer');
    for (const key of ['compass_n', 'compass_s', 'compass_e', 'compass_w']) {
      expect(source, key).toContain('stem.echotrainer.' + key);
    }
    expect(source).not.toMatch(/fillText\('W', -20, 3\)/);
  });

  it('localises the on-canvas HUD as one template, not glued fragments', () => {
    const source = read('echotrainer');
    expect(source).toContain('stem.echotrainer.hud_line');
    expect(source).toMatch(/\{clicks\}/);
    expect(source).toMatch(/\{bumps\}/);
    expect(source).toMatch(/\{cpm\} clicks\/min/);
    expect(source).not.toMatch(/fillText\('Echo Navigator {2}\| {2}Clicks: ' \+/);
  });

  it('shows the environment name the picker shows, not the raw id', () => {
    const source = read('echotrainer');
    // The HUD printed envType ('simple_room'); it now resolves the same key the
    // environment picker uses.
    const at = source.indexOf('stem.echotrainer.hud_line');
    const block = source.slice(at, at + 700);
    expect(block).toMatch(/env: t\('stem\.echotrainer\.env_' \+ envType \+ '_name', envType\)/);
  });
});
