import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// After an analysis the tool announced "Analysis ready." and nothing else, so
// a blind student -- this tool's headline user -- was told that something had
// happened and left to hunt for it with a virtual cursor. The result IS the
// answer, so the announcement now carries it.

const src = fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');
let resultAnnouncement, announceCap, parseDescribe;
const NT = 'No readable text was found.';

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  ({ resultAnnouncement, announceCap, parseDescribe } = window.AccessLensPure);
});

const describeValue = (o) => parseDescribe(JSON.stringify(o));

describe('result announcement', () => {
  it('speaks the description itself', () => {
    const said = resultAnnouncement('describe', describeValue({ photo: { usable: true }, description: 'A red mug on a wooden desk.', unsure: [] }), NT, '');
    expect(said).toBe('A red mug on a wooden desk.');
  });

  it('leads with a photo problem before the description built on it', () => {
    const said = resultAnnouncement('describe', describeValue({ photo: { usable: false, problem: 'too dark' }, description: 'Mostly shadow.', unsure: [] }), NT, '');
    expect(said.indexOf('may not have come out')).toBeLessThan(said.indexOf('Mostly shadow'));
  });

  it('speaks transcribed text, with its gaps counted and voiced', () => {
    expect(resultAnnouncement('read', 'Take two tablets daily.', NT, '')).toBe('Take two tablets daily.');
    const gappy = resultAnnouncement('read', 'Take [unclear] tablets daily.', NT, '');
    expect(gappy).toContain('1 word could not be read');
    expect(gappy).toContain('could not be read) tablets');
    // The raw marker must never reach the live region.
    expect(gappy).not.toContain('[unclear]');
  });

  it('reports no-text for both transcription modes', () => {
    expect(resultAnnouncement('read', 'NO_TEXT_FOUND.', NT, '')).toBe(NT);
    expect(resultAnnouncement('translate', { none: true }, NT, '')).toBe(NT);
  });

  it('speaks the translation, which is what the student asked for', () => {
    expect(resultAnnouncement('translate', { original: 'Leche', translated: 'Milk' }, NT, '')).toBe('Milk');
  });

  it('speaks the guess WITH its confidence, never bare', () => {
    const said = resultAnnouncement('inquire', { guess: { what: 'a pine cone', confidence: 'medium' }, questions: [], observations: [] }, NT, 'More below.');
    expect(said).toContain('a pine cone');
    // A guess announced without its confidence is heard as a fact.
    expect(said).toContain('medium confidence');
    expect(said).toContain('More below.');
  });

  it('caps a long announcement without cutting mid-word', () => {
    const long = 'The desk is wooden. ' + 'A mug sits on it. '.repeat(40);
    const said = announceCap(long);
    expect(said.length).toBeLessThanOrEqual(241);
    expect(said).not.toMatch(/\w…$/);
    // Short text is untouched.
    expect(announceCap('A red mug.')).toBe('A red mug.');
  });

  it('survives hostile values for every mode', () => {
    for (const mode of ['describe', 'read', 'translate', 'inquire', 'nonsense']) {
      for (const v of [null, undefined, '', {}, [], 0, 'x']) {
        expect(() => resultAnnouncement(mode, v, NT, ''), mode).not.toThrow();
        expect(typeof resultAnnouncement(mode, v, NT, ''), mode).toBe('string');
      }
    }
  });

  it('announces the result instead of only that one exists', () => {
    expect(src).toContain('var spoken = resultAnnouncement(m, parsed,');
    // The bare phrase survives only as the fallback when nothing could be built.
    expect(src).toContain("announce(spoken || _t('stem.accessLens.sr_done'");
  });

  it('parses once, outside the state updater', () => {
    // Reading the parsed value back out of setResults would depend on React
    // running the updater before the announcement, which batching may defer.
    const i = src.indexOf('var parsed =');
    const j = src.indexOf('setResults(function (r) {', i);
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
  });

  it('re-announces an identical message instead of falling silent', () => {
    // aria-live fires on a text change, so the same string twice was silent:
    // two analyses in a row announced once, and three failed retries gave one
    // error.
    const i = src.indexOf('var announce = useCallback');
    const body = src.slice(i, src.indexOf('}, []);', i));
    expect(body).toContain('liveSeqRef');
    expect(body).toContain(String.fromCharCode(92) + 'u200B');
  });

  it('ships the same announcement in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_accesslens.js', 'utf8')).toBe(src);
  });
});
