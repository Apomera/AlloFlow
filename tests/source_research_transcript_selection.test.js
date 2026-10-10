import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let R;
const topic = 'Plant science';
const canonical = 'https://www.youtube.com/watch?v=AbCdEfGhI_1';
const alias = 'https://youtu.be/AbCdEfGhI_1?t=42';
const paragraphs = Array.from({ length: 7 }, (_, index) => 'Section ' + index + ': Plants grow using water, sunlight, and carbon dioxide. The exact spoken words stay unchanged.');
const snapshot = (extra = {}) => ({ url: canonical, title: 'How plants grow', transcript: paragraphs.join('\n\n'), retrievedAt: '2026-10-09T12:00:00.000Z', ...extra });
const page = (index, extra = {}) => ({ kind: 'web', url: 'https://example.edu/source/' + index, title: 'Source ' + index, passage: 'Readable evidence from another source number ' + index + '.', evidenceType: 'Page excerpt', ...extra });
const packet = (items = []) => { const p = R.packet(topic); R.merge(p, items); return p; };

beforeEach(() => {
  new Function(readFileSync('content_engine_source.jsx', 'utf8'))();
  R = window.AlloModules.SourceResearchReview;
});

describe('transient transcript excerpt candidates', () => {
  it('keeps exact bounded passages in original order with canonical provenance', () => {
    const input = snapshot({ url: alias, transcript: '  ' + paragraphs[0] + '\n\n' + 'word '.repeat(800) + '\n\n' + paragraphs[1] });
    const candidates = R.transcriptPassages(input);
    expect(candidates.length).toBeGreaterThan(3);
    let previous = 0;
    for (const item of candidates) {
      expect(item).toMatchObject({ kind: 'web', url: canonical, evidenceType: 'AI video transcript', shareWithStudents: true, included: true, retrievedAt: input.retrievedAt });
      expect(item.passage.length).toBeLessThanOrEqual(1200);
      const [, start, end] = item.locatorLabel.match(/^AI transcript - Characters (\d+)-(\d+)$/).map(Number);
      expect(start).toBeGreaterThan(previous);
      expect(input.transcript.slice(start - 1, end)).toBe(item.passage);
      previous = end;
    }
    expect(R.transcriptPassages(input)).toEqual(candidates);
  });

  it('preserves existing automatic row IDs and removes duplicate candidates at their first position', () => {
    const input = snapshot({ transcript: paragraphs[0] + '\n\n' + paragraphs[0] + '\n\n' + paragraphs[1] });
    const candidates = R.transcriptPassages(input);
    const automatic = R.selectPassages(input.transcript, topic, 3).map(item => R.row({ ...item, kind: 'web', url: canonical, title: input.title, evidenceType: 'AI video transcript' }));
    expect(candidates).toHaveLength(2);
    expect(candidates.map(item => item.id)).toEqual(automatic.map(item => item.id));
    expect(candidates[0].locatorLabel).toBe('AI transcript - Characters 1-' + paragraphs[0].length);
  });

  it('never splits a surrogate pair at the excerpt boundary', () => {
    const candidates = R.transcriptPassages(snapshot({ transcript: 'a'.repeat(1199) + '\ud83d\ude00' + 'b'.repeat(1300) }));
    expect(candidates.every(item => !/[\uD800-\uDBFF]$/.test(item.passage) && !/^[\uDC00-\uDFFF]/.test(item.passage))).toBe(true);
  });

  it('accepts the exact transcript bound without enlarging excerpt bounds', () => {
    const candidates = R.transcriptPassages(snapshot({ transcript: 'a'.repeat(200000) }));
    expect(candidates.every(item => item.passage.length <= 1200)).toBe(true);
  });

  it.each([
    null,
    { transcript: 'short' },
    { transcript: ['not text'] },
    { transcript: 'a'.repeat(200001) },
    { transcript: 'Transcript includes forbidden\u0000control characters.' },
    { url: 'https://youtube.com/playlist?list=PL123' },
    { url: 'https://youtube.com.evil.test/watch?v=AbCdEfGhI_1' }
  ])('rejects unavailable or invalid transcript snapshots (%#)', extra => {
    expect(() => R.transcriptPassages(extra === null ? null : snapshot(extra))).toThrow(/transcript|video/i);
  });
});

describe('atomic local transcript excerpt replacement', () => {
  it('replaces only this video transcript and returns a fresh packet without calling a provider', () => {
    const input = snapshot(), choices = R.transcriptPassages(input);
    const p = packet([choices[0], page('other'), page('discovery', { url: alias, evidenceType: 'Search snippet' }),
      { kind: 'paste', title: 'Private working notes', sourceId: 'private', passage: 'Private notes must retain their student-sharing restriction.', shareWithStudents: false }]);
    const before = structuredClone(p), provider = vi.fn();
    window.callGemini = provider;
    try {
      const result = R.replaceTranscriptPassages(p, input, [choices[4].id, choices[2].id]);
      expect(result).not.toBe(p);
      expect(p).toEqual(before);
      expect(result.items.filter(item => item.evidenceType === 'AI video transcript').map(item => item.id)).toEqual([choices[2].id, choices[4].id]);
      expect(result.items.filter(item => item.evidenceType !== 'AI video transcript')).toEqual(before.items.filter(item => item.evidenceType !== 'AI video transcript'));
      expect(result.items.find(item => item.kind === 'paste').shareWithStudents).toBe(false);
      expect(provider).not.toHaveBeenCalled();
      expect(result.activity.at(-1).type).toBe('transcript-selection');
    } finally { delete window.callGemini; }
  });

  it('does not include an excluded source when choosing new alternatives through a URL alias', () => {
    const input = snapshot({ url: alias }), choices = R.transcriptPassages(input), p = packet([choices[0]]);
    p.sourceDecisions = { ['web:' + alias]: false };
    const result = R.replaceTranscriptPassages(p, input, [choices[1].id]);
    expect(result.sourceDecisions['web:' + canonical]).toBe(false);
    expect(result.items[0].included).toBe(false);
  });

  it('preserves retained row exclusions and explicit passage decisions while including new alternatives', () => {
    const input = snapshot(), choices = R.transcriptPassages(input), p = packet([choices[0], choices[1]]);
    p.items[0].included = false;
    p.passageDecisions[choices[1].id] = false;
    p.passageDecisions[choices[2].id] = false;
    const result = R.replaceTranscriptPassages(p, input, choices.slice(0, 4).map(item => item.id));
    expect(result.items.map(item => item.included)).toEqual([false, false, false, true]);
    expect(result.passageDecisions).toEqual(p.passageDecisions);
  });

  it('preserves other videos and non-transcript evidence for the same source', () => {
    const input = snapshot(), choices = R.transcriptPassages(input);
    const other = R.transcriptPassages(snapshot({ url: 'https://youtu.be/ZyXwVuTsR_2' }))[0];
    const privateText = page('private', { url: canonical, evidenceType: 'Pasted text', shareWithStudents: false });
    const p = packet([choices[0], other, privateText]);
    const result = R.replaceTranscriptPassages(p, input, [choices[3].id]);
    expect(result.items.slice(1)).toEqual(p.items.slice(1));
  });

  it('can keep zero transcript excerpts without removing the other source evidence', () => {
    const input = snapshot(), choices = R.transcriptPassages(input), p = packet([choices[0], page('same', { url: canonical })]);
    const result = R.replaceTranscriptPassages(p, input, []);
    expect(result.items).toEqual(p.items.filter(item => item.evidenceType !== 'AI video transcript'));
  });

  it('deduplicates repeated selected IDs before enforcing capacity', () => {
    const input = snapshot(), choices = R.transcriptPassages(input);
    expect(R.replaceTranscriptPassages(packet(), input, Array(8).fill(choices[0].id)).items).toHaveLength(1);
  });

  it('allows exactly four source entries including retained non-transcript evidence', () => {
    const input = snapshot(), choices = R.transcriptPassages(input), p = packet([choices[0], page('same', { url: canonical })]);
    expect(R.replaceTranscriptPassages(p, input, choices.slice(1, 4).map(item => item.id)).items).toHaveLength(4);
  });

  it('does not introduce duplicate IDs when an identical passage is retained as another evidence type', () => {
    const input = snapshot(), choices = R.transcriptPassages(input);
    const p = packet([{ ...choices[0], evidenceType: 'Search snippet' }]), before = structuredClone(p);
    expect(() => R.replaceTranscriptPassages(p, input, [choices[0].id])).toThrow(/another evidence type/);
    expect(p).toEqual(before);
  });

  it('allows exactly twenty-four total entries without dropping other sources', () => {
    const input = snapshot(), choices = R.transcriptPassages(input), p = packet([choices[0], ...Array.from({ length: 22 }, (_, i) => page(i))]);
    const result = R.replaceTranscriptPassages(p, input, choices.slice(1, 3).map(item => item.id));
    expect(result.items).toHaveLength(24);
    expect(result.items.slice(2)).toEqual(p.items.slice(1));
  });

  it.each(['source', 'review', 'unknown', 'removed', 'malformed'])('leaves the complete input packet unchanged after a %s rejection', reason => {
    const input = snapshot(), choices = R.transcriptPassages(input), p = packet([choices[0]]);
    let ids = [choices[1].id];
    if (reason === 'source') ids = choices.slice(0, 5).map(item => item.id);
    if (reason === 'review') { R.merge(p, Array.from({ length: 23 }, (_, i) => page(i))); ids = choices.slice(1, 3).map(item => item.id); }
    if (reason === 'unknown') ids = ['stale-evidence-id'];
    if (reason === 'removed') { R.removeSource(p, p.items[0].sourceKey); p.removedSources = { ['web:' + alias]: true }; }
    if (reason === 'malformed') ids = null;
    const before = structuredClone(p);
    expect(() => R.replaceTranscriptPassages(p, input, ids)).toThrow();
    expect(p).toEqual(before);
  });

  it('never persists the transcript snapshot or unselected passages in packet or frozen writer evidence', () => {
    const input = snapshot({ transcript: paragraphs[0] + '\n\nUNSELECTED_SECRET_SENTINEL is present only in the temporary complete transcript.' });
    const choices = R.transcriptPassages(input), p = packet([choices[0]]);
    p.transcriptSnapshot = input;
    const result = R.replaceTranscriptPassages(p, input, [choices[0].id]);
    expect(JSON.stringify(result)).not.toContain('UNSELECTED_SECRET_SENTINEL');
    expect(result).not.toHaveProperty('transcriptSnapshot');
    expect(JSON.stringify(R.freeze(result, topic, false))).not.toContain('UNSELECTED_SECRET_SENTINEL');
  });
});
