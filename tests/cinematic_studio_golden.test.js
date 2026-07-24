// Golden + unit coverage for Cinematic Studio — the NotebookLM video prompt helper
// (Wave 1) plus the Wave 2 accessibility core (on-device transcription -> editable
// .srt/.vtt captions -> AI translation).
//
// WHY: the caption SERIALIZATION (.srt/.vtt) is the heart of the accessibility core
// and a teacher will hand these files to assistive tech, so the timestamp format and
// import round-trip must be exact. And the modal must render every tab without
// crashing. We pin both: pure-helper unit tests (exposed via __cinematicStudioInternals)
// + an SSR render smoke for each tab. The transcription model + AI translation are
// must-smoke-live (real Gemini Canvas) and are intentionally NOT exercised here.
//
// The component reads props.initialTab (a backward-compatible deep-link/test seam)
// so each tab can be rendered in isolation under SSR.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let CS, I, React, ReactDOMServer;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
  globalThis.React = window.React = React;
  loadAlloModule('cinematic_studio_module.js');
  CS = window.AlloModules.CinematicStudio;
  I = window.AlloModules.__cinematicStudioInternals;
  if (typeof CS !== 'function') throw new Error('CinematicStudio did not register');
  if (!I) throw new Error('__cinematicStudioInternals not exposed');
});

describe('caption timestamp formatting', () => {
  it('formats SRT (comma) and VTT (dot) stamps', () => {
    expect(I.secsToStamp(65.5, ',')).toBe('00:01:05,500');
    expect(I.secsToStamp(3661.25, '.')).toBe('01:01:01.250');
    expect(I.secsToStamp(0, ',')).toBe('00:00:00,000');
    expect(I.secsToStamp(2.9999, ',')).toBe('00:00:03,000'); // sub-ms rounds up cleanly, no 1000ms overflow
    expect(I.secsToStamp(59.9999, ',')).toBe('00:01:00,000'); // carry cascades minute (no ss=60)
    expect(I.secsToStamp(3599.9999, ',')).toBe('01:00:00,000'); // carry cascades hour
    expect(I.secsToStamp(-5, ',')).toBe('00:00:00,000');     // clamps negatives
  });
});

describe('export hygiene (cleanSegs)', () => {
  it('drops empty cues and never emits end<=start', () => {
    const segs = [
      { start: 0, end: 2, text: 'keep' },
      { start: 2, end: 2.05, text: 'zero-ish' }, // widened to >= start+0.1
      { start: 5, end: 4, text: 'reversed' },    // end<start -> normalized
      { start: 6, end: 7, text: '   ' },          // empty -> dropped
    ];
    const cleaned = I.cleanSegs(segs);
    expect(cleaned).toHaveLength(3);
    expect(cleaned.every(s => s.end > s.start)).toBe(true);
    // SRT renumbers sequentially after the drop
    const srt = I.buildSrt(segs);
    expect(srt).toContain('3\n');
    expect(srt).not.toContain('4\n');
    expect(srt).not.toContain('-->\n'); // no empty-body cue
  });
});

describe('VTT import tolerates a header glued to cue #1', () => {
  it('does not drop cue #1 when no blank line follows WEBVTT', () => {
    const glued = 'WEBVTT\n00:00:01.000 --> 00:00:03.000\nHello';
    const rt = I.parseTimecodeFile(glued);
    expect(rt).toHaveLength(1);
    expect(rt[0].text).toBe('Hello');
    expect(rt[0].start).toBe(1);
  });
});

describe('translation reply parsing is forgiving', () => {
  it('parses a clean array, a fenced array, and falls back to lines', () => {
    expect(I.parseJsonArrayLoose('["a","b","c"]', 3)).toEqual(['a', 'b', 'c']);
    expect(I.parseJsonArrayLoose('```json\n["x","y"]\n```', 2)).toEqual(['x', 'y']);
    // prose-wrapped array is recovered by the balanced-bracket scan
    expect(I.parseJsonArrayLoose('Sure! Here you go: ["uno","dos"] hope it helps', 2)).toEqual(['uno', 'dos']);
    // non-JSON line list salvages only when the count matches
    expect(I.parseJsonArrayLoose('uno\ndos', 2)).toEqual(['uno', 'dos']);
    expect(I.parseJsonArrayLoose('garbage with no array', 3)).toBeNull();
  });
});

describe('.srt / .vtt serialization', () => {
  const segs = [
    { id: 'a', start: 1, end: 3, text: 'Hello world' },
    { id: 'b', start: 3.5, end: 5, text: 'Second line' },
  ];
  it('SRT is 1-indexed with comma stamps', () => {
    const srt = I.buildSrt(segs);
    expect(srt.startsWith('1\n00:00:01,000 --> 00:00:03,000\nHello world')).toBe(true);
    expect(srt).toContain('2\n00:00:03,500 --> 00:00:05,000\nSecond line');
  });
  it('VTT carries the WEBVTT header and dot stamps', () => {
    const vtt = I.buildVtt(segs);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:01.000 --> 00:00:03.000');
  });
});

describe('imported captions round-trip', () => {
  const segs = [
    { id: 'a', start: 1, end: 3, text: 'Hello world' },
    { id: 'b', start: 3.5, end: 5, text: 'Second line' },
  ];
  it('parse(buildSrt) recovers start / end / text', () => {
    const rt = I.parseTimecodeFile(I.buildSrt(segs));
    expect(rt).toHaveLength(2);
    expect(rt[0].start).toBe(1);
    expect(rt[0].end).toBe(3);
    expect(rt[0].text).toBe('Hello world');
    expect(rt[1].text).toBe('Second line');
  });
  it('parses VTT (dot separators + WEBVTT header) too', () => {
    const rt = I.parseTimecodeFile(I.buildVtt(segs));
    expect(rt).toHaveLength(2);
    expect(rt[1].text).toBe('Second line');
  });
});

describe('Whisper chunk -> segment timestamp filling', () => {
  it('fills null end timestamps from the next start, then duration for the last', () => {
    const chunks = [
      { timestamp: [0, 2], text: 'a' },
      { timestamp: [2, null], text: 'b' },
      { timestamp: [5, null], text: 'c' },
    ];
    const s = I.segmentsFromChunks(chunks, 8);
    expect(s).toHaveLength(3);
    expect(s[0].end).toBe(2);
    expect(s[1].end).toBe(5); // next chunk's start
    expect(s[2].end).toBe(8); // clip duration (last chunk has no successor)
  });
});

describe('renders every tab without crashing', () => {
  const render = (tab) => ReactDOMServer.renderToString(
    React.createElement(CS, { onClose() {}, addToast() {}, t: null, callGemini: null, initialTab: tab })
  );
  for (const tab of ['build', 'diagnose', 'captions', 'compose', 'guide']) {
    it('renders tab: ' + tab, () => {
      expect(render(tab).length).toBeGreaterThan(500);
    });
  }
  it('captions tab shows the honesty banner + source controls', () => {
    const html = render('captions');
    expect(html).toContain('AI-DRAFT captions');
    expect(html).toContain('Choose video');
    expect(html).toContain('Import .srt');
  });
  it('compose tab shows the source-doc input + FERPA gate', () => {
    const html = render('compose');
    expect(html).toContain('Source document');
    expect(html).toContain('removed student names');
  });
});

// ── Wave 3: agentic storyboard pure core ──
describe('storyboard source-grounding (the load-bearing integrity check)', () => {
  const DOC = 'Photosynthesis converts sunlight into chemical energy. Chlorophyll absorbs red and blue light. Plants release oxygen as a byproduct.';
  it('an anchor must literally occur in the document', () => {
    expect(I.anchorIsGrounded('Chlorophyll absorbs red and blue light', I.normForMatch(DOC))).toBe(true);
    expect(I.anchorIsGrounded('Plants run on electricity', I.normForMatch(DOC))).toBe(false); // fabricated
    expect(I.anchorIsGrounded('short', I.normForMatch(DOC))).toBe(false);                     // too short to count
  });
  it('a narrated scene with a real anchor is grounded; without one it is flagged', () => {
    const sb = { scenes: [
      { type: 'narratedText', narration: 'Chlorophyll absorbs red and blue light.', props: { body: 'x' }, sourceAnchors: ['Chlorophyll absorbs red and blue light'], durationSec: 6 },
      { type: 'narratedText', narration: 'Photosynthesis happens at night.', props: { body: 'y' }, sourceAnchors: ['Photosynthesis happens at night'], durationSec: 6 },
    ] };
    const v = I.validateStoryboard(sb, DOC);
    expect(v.scenes[0].grounded).toBe(true);
    expect(v.scenes[1].grounded).toBe(false); // anchor not in the doc
    expect(v.groundedCount).toBe(1);
    expect(v.warnings.some(w => /not traceable/.test(w))).toBe(true);
  });
  it('title/divider/outro scenes need no grounding', () => {
    const sb = { scenes: [{ type: 'titleCard', narration: '', props: { title: 'Photosynthesis' }, durationSec: 5 }] };
    expect(I.validateStoryboard(sb, DOC).scenes[0].grounded).toBe(true);
  });
});

describe('storyboard structural validation', () => {
  it('rejects unknown scene types and missing required props', () => {
    const v1 = I.validateStoryboard({ scenes: [{ type: 'hologram', props: {}, durationSec: 5 }] }, '');
    expect(v1.ok).toBe(false);
    expect(v1.errors.some(e => /unknown type/.test(e))).toBe(true);
    const v2 = I.validateStoryboard({ scenes: [{ type: 'bulletList', props: { heading: 'H' }, durationSec: 5 }] }, '');
    expect(v2.ok).toBe(false);
    expect(v2.errors.some(e => /missing "bullets"/.test(e))).toBe(true);
  });
  it('warns on out-of-range duration; empty storyboard is not ok', () => {
    const v = I.validateStoryboard({ scenes: [{ type: 'outro', props: { message: 'Bye' }, durationSec: 99 }] }, '');
    expect(v.warnings.some(w => /out of range/.test(w))).toBe(true);
    expect(I.validateStoryboard({ scenes: [] }, '').ok).toBe(false);
  });
  it('every catalog type declares its required props', () => {
    for (const t of I.TEMPLATE_TYPES) {
      expect(Array.isArray(I.TEMPLATE_CATALOG[t].requires)).toBe(true);
      expect(I.TEMPLATE_CATALOG[t].requires.length).toBeGreaterThan(0);
    }
  });
});

describe('fabrication detection + assembly', () => {
  it('flags a number in narration that is not in the source', () => {
    const doc = 'The heart has four chambers.';
    const sb = { scenes: [{ type: 'narratedText', narration: 'The heart beats 100000 times a day.', durationSec: 6 }] };
    const fab = I.detectFabrication(sb, doc);
    expect(fab.some(f => f.value === '100000')).toBe(true);
    // a number that IS in the source is not flagged
    expect(I.detectFabrication({ scenes: [{ type: 'narratedText', narration: 'It has four (4) chambers.', durationSec: 6 }] }, 'four 4 chambers').length).toBe(0);
  });
  it('assemble computes durationInFrames and clamps duration', () => {
    const sb = I.assembleStoryboard({ title: 'T' }, [
      { type: 'titleCard', props: { title: 'A' }, durationSec: 5 },
      { type: 'outro', props: { message: 'B' }, durationSec: 999 }, // clamp to 30
    ]);
    expect(sb.fps).toBe(30);
    expect(sb.scenes[0].durationInFrames).toBe(150);
    expect(sb.scenes[1].durationSec).toBe(30);
    expect(sb.kind).toBe('alloflow.storyboard');
    expect(sb.disclaimer).toMatch(/AI draft/);
  });
});

describe('AI JSON-object parsing is forgiving', () => {
  it('parses clean, fenced, and prose-wrapped objects; null on garbage', () => {
    expect(I.parseAiJsonObject('{"a":1}').a).toBe(1);
    expect(I.parseAiJsonObject('```json\n{"a":2}\n```').a).toBe(2);
    expect(I.parseAiJsonObject('Here you go: {"a":3} done').a).toBe(3);
    expect(I.parseAiJsonObject('no json here')).toBeNull();
  });
});

// ── Wave 3 audit fixes (enhancement-audit wkjvvvxy8) ──
describe('grounding is punctuation-robust + covers on-screen text', () => {
  it('a smart-quoted anchor still grounds against a straight-quoted source (no false review)', () => {
    const doc = "The teacher's guide says plants need light."; // straight apostrophe
    const smart = 'The teacher’s guide says plants need light'; // curly apostrophe
    expect(I.anchorIsGrounded(smart, I.normForMatch(doc))).toBe(true);
  });
  it('on-screen text (not just narration) must trace to the source', () => {
    const doc = 'Water boils at 100 degrees Celsius at sea level.';
    // empty narration, but fabricated bullets -> must be flagged, NOT a free pass
    const sb = { scenes: [{ type: 'bulletList', narration: '', props: { heading: 'Facts', bullets: ['Water boils at 50 degrees', 'Ice is hot'] }, sourceAnchors: [], durationSec: 6 }] };
    const v = I.validateStoryboard(sb, doc);
    expect(v.scenes[0].grounded).toBe(false);
    expect(v.warnings.some(w => /on-screen text/.test(w))).toBe(true);
  });
});

describe('fabrication scan covers bullets/props, not just narration', () => {
  it('flags a fabricated number in a bullet', () => {
    const doc = 'The water cycle has evaporation and condensation.';
    const sb = { scenes: [{ type: 'bulletList', narration: '', props: { heading: 'H', bullets: ['It rains 999 times a year'] }, durationSec: 6 }] };
    expect(I.detectFabrication(sb, doc).some(f => f.value === '999')).toBe(true);
  });
});

describe('caption line-wrapping keeps long cues in the safe area', () => {
  it('wraps at word boundaries to ~42 chars and leaves short cues untouched', () => {
    expect(I.wrapCueText('Hello world')).toBe('Hello world'); // short -> no wrap
    const long = 'The mitochondria is the powerhouse of the cell and provides energy';
    const wrapped = I.wrapCueText(long, 42);
    expect(wrapped).toContain('\n');
    wrapped.split('\n').forEach(line => expect(line.length).toBeLessThanOrEqual(42));
    // wrapping is reversible by whitespace-join (so import round-trips)
    expect(wrapped.replace(/\n/g, ' ')).toBe(long);
  });
});

describe('swarm stage contract (callGemini empty = failure, never empty success)', () => {
  const ok = (raw) => () => raw;            // sync stub
  const okAsync = (raw) => async () => raw; // async stub
  it('rejects on empty / whitespace / {text:""} / unparseable; resolves on valid JSON', async () => {
    await expect(I.callSwarmStage(ok(''), 'S', 'p')).rejects.toThrow(/returned nothing/);
    await expect(I.callSwarmStage(ok('   '), 'S', 'p')).rejects.toThrow(/returned nothing/);
    await expect(I.callSwarmStage(ok({ text: '' }), 'S', 'p')).rejects.toThrow(/returned nothing/);
    await expect(I.callSwarmStage(ok('totally not json'), 'S', 'p')).rejects.toThrow(/could not parse/);
    await expect(I.callSwarmStage(null, 'S', 'p')).rejects.toThrow(/not available/);
    await expect(I.callSwarmStage(okAsync('{"title":"x"}'), 'S', 'p')).resolves.toEqual({ title: 'x' });
    // accepts {text: "<json>"} shape too
    await expect(I.callSwarmStage(ok({ text: '{"n":2}' }), 'S', 'p')).resolves.toEqual({ n: 2 });
  });
  it('stageScene stamps the scene type + id from the spec', async () => {
    const stub = () => '{"narration":"hi","props":{"body":"x"},"durationSec":6}';
    const sc = await I.stageScene(stub, 'doc', { gradeBand: '35' }, { type: 'narratedText', narrationIntent: 'i' }, 0, 3);
    expect(sc.type).toBe('narratedText');
    expect(sc.id).toBe('s1');
  });
});

describe('Wave-1 prompt builders (the actual product a teacher copies out)', () => {
  const F = { topic: 'Volcanoes', gradeBand: '35', reading: 'plain', length: 'std', tone: 'curious', mustInclude: 'lava', mustAvoid: '', onScreenText: 'none', visualAccuracy: true, udl: true };
  it('buildSteeringPrompt reflects topic, guardrails, and on-screen-text choice', () => {
    const p = I.buildSteeringPrompt(F, null);
    expect(p).toContain('Volcanoes');
    expect(p).toMatch(/Visual accuracy is critical/);
    expect(p).toMatch(/Minimize on-screen text/);
    expect(p).toContain('lava');
  });
  it('buildRePrompt maps symptoms to fixes and appends must-haves on "missing"', () => {
    const r = I.buildRePrompt('BASE', ['toolong', 'missing'], 'extra note', F);
    expect(r).toMatch(/too long/i);
    expect(r).toContain('extra note');
    expect(r).toContain('Must-have points: lava');
  });
});
