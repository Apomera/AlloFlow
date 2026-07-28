// Method-of-loci imagery layer for the 3D Concept Space (batch furnish).
//
// The Memory Palace's Furnish pass is driven by each locus's MNEMONIC, not its bare
// label — that vivid, concrete picture is the whole mechanism. A concept space has no
// mnemonic field, so a batch furnish generates them in ONE call up front. These two
// seams are the pure, host-free half of that: the prompt builder and the parser.
//
// The parser's contract matters more than it looks: a batch runs N sequential image or
// sculpture generations, and a malformed or partial model reply must degrade to "these
// nodes keep their label" rather than aborting the run or poisoning a prompt.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let E;
beforeAll(() => {
  const src = readFileSync(resolve(process.cwd(), 'concept_graph_engine_module.js'), 'utf8');
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.ConceptGraphEngine;
  // eslint-disable-next-line no-new-func
  new Function(src)();
  E = window.AlloModules.ConceptGraphEngine;
  if (!E) throw new Error('ConceptGraphEngine did not register (anchor changed?)');
});

const ITEMS = [
  { id: 'b0_i1', label: 'Evaporation' },
  { id: 'b0_i2', label: 'Condensation' },
];

describe('buildNodeMnemonicPrompt', () => {
  it('is pure — same input, same string, and never mutates the items', () => {
    const items = ITEMS.map((i) => ({ ...i }));
    const a = E.buildNodeMnemonicPrompt(items, { topic: 'Water cycle' });
    const b = E.buildNodeMnemonicPrompt(items, { topic: 'Water cycle' });
    expect(a).toBe(b);
    expect(items).toEqual(ITEMS);
  });

  it('carries every id and label through to the model', () => {
    const p = E.buildNodeMnemonicPrompt(ITEMS, {});
    expect(p).toContain('b0_i1');
    expect(p).toContain('Evaporation');
    expect(p).toContain('b0_i2');
    expect(p).toContain('Condensation');
  });

  it('includes topic and grade band only when supplied', () => {
    const bare = E.buildNodeMnemonicPrompt(ITEMS, {});
    expect(bare).not.toContain('Topic:');
    expect(bare).not.toContain('Grade band:');
    const full = E.buildNodeMnemonicPrompt(ITEMS, { topic: 'Water cycle', gradeLevel: '6-8' });
    expect(full).toContain('Topic: Water cycle');
    expect(full).toContain('Grade band: 6-8');
  });

  it('asks for JSON only, and constrains the imagery to honest, seeable, text-free cues', () => {
    const p = E.buildNodeMnemonicPrompt(ITEMS, {});
    expect(p).toMatch(/JSON array/i);
    expect(p).toMatch(/no markdown/i);
    expect(p).toMatch(/SEE/);
    // The accuracy guard is the pedagogical non-negotiable: a memorable image that
    // teaches the wrong idea is worse than no image at all.
    expect(p).toMatch(/never a pun|wrong idea/i);
    expect(p).toMatch(/no text or lettering/i);
  });

  it('drops entries with a missing id or label instead of emitting empty strings', () => {
    const p = E.buildNodeMnemonicPrompt(
      [{ id: 'ok', label: 'Kept' }, { id: '', label: 'No id' }, { id: 'no_label' }, null],
      {}
    );
    expect(p).toContain('Kept');
    expect(p).not.toContain('No id');
    expect(p).not.toContain('no_label');
  });

  it('survives a non-array argument', () => {
    expect(() => E.buildNodeMnemonicPrompt(undefined, {})).not.toThrow();
    expect(() => E.buildNodeMnemonicPrompt(null)).not.toThrow();
    expect(typeof E.buildNodeMnemonicPrompt('nope', {})).toBe('string');
  });
});

describe('parseNodeMnemonics', () => {
  it('maps a clean JSON array to {id: mnemonic}', () => {
    const out = E.parseNodeMnemonics('[{"id":"b0_i1","mnemonic":"A kettle screaming into a hot sky"}]');
    expect(out).toEqual({ b0_i1: 'A kettle screaming into a hot sky' });
  });

  it('tolerates markdown fences and surrounding prose', () => {
    const fenced = '```json\n[{"id":"a","mnemonic":"One"}]\n```';
    expect(E.parseNodeMnemonics(fenced)).toEqual({ a: 'One' });
    const chatty = 'Sure! Here you go:\n[{"id":"a","mnemonic":"One"}]\nHope that helps.';
    expect(E.parseNodeMnemonics(chatty)).toEqual({ a: 'One' });
  });

  it('keeps the good rows and drops the bad ones (partial replies must not fail the batch)', () => {
    const out = E.parseNodeMnemonics(JSON.stringify([
      { id: 'good', mnemonic: 'Kept' },
      { id: 'blank', mnemonic: '   ' },
      { id: '', mnemonic: 'No id' },
      { mnemonic: 'No id key' },
      { id: 'wrong_type', mnemonic: 42 },
      null,
      'not an object',
    ]));
    expect(out).toEqual({ good: 'Kept' });
  });

  it('returns {} for garbage rather than throwing — the batch falls back to labels', () => {
    expect(E.parseNodeMnemonics('')).toEqual({});
    expect(E.parseNodeMnemonics(null)).toEqual({});
    expect(E.parseNodeMnemonics(undefined)).toEqual({});
    expect(E.parseNodeMnemonics('totally not json')).toEqual({});
    expect(E.parseNodeMnemonics('{"id":"a","mnemonic":"an object, not an array"}')).toEqual({});
    expect(E.parseNodeMnemonics('[{"id":"a","mnemonic":"unterminated')).toEqual({});
  });

  it('trims and caps the mnemonic so one runaway reply cannot bloat a prompt', () => {
    const long = 'x'.repeat(500);
    const out = E.parseNodeMnemonics(JSON.stringify([{ id: 'a', mnemonic: '  ' + long + '  ' }]));
    expect(out.a.length).toBe(240);
    expect(out.a.startsWith('x')).toBe(true);
  });

  it('is a pure function of its input', () => {
    const text = '[{"id":"a","mnemonic":"One"}]';
    expect(E.parseNodeMnemonics(text)).toEqual(E.parseNodeMnemonics(text));
  });
});

describe('furnish subject resolution (the palace contract)', () => {
  // The batch feeds `mnemonic || label` to the generator, exactly as the palace does
  // with `l.mnemonic || l.label`. Pinning it here keeps the two surfaces honest.
  const subjectFor = (node, mnemonics) => (mnemonics && mnemonics[node.id]) || node.label;

  it('prefers the mnemonic when one was parsed', () => {
    const m = E.parseNodeMnemonics('[{"id":"b0_i1","mnemonic":"A kettle screaming"}]');
    expect(subjectFor(ITEMS[0], m)).toBe('A kettle screaming');
  });

  it('falls back to the label for any node the model skipped', () => {
    const m = E.parseNodeMnemonics('[{"id":"b0_i1","mnemonic":"A kettle screaming"}]');
    expect(subjectFor(ITEMS[1], m)).toBe('Condensation');
  });

  it('falls back to the label for every node when the whole pre-pass failed', () => {
    const m = E.parseNodeMnemonics('the model errored');
    expect(ITEMS.map((n) => subjectFor(n, m))).toEqual(['Evaporation', 'Condensation']);
    expect(ITEMS.map((n) => subjectFor(n, null))).toEqual(['Evaporation', 'Condensation']);
  });
});
