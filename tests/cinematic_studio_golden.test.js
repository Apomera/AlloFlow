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
  React = require(resolve(process.cwd(), 'prismflow-deploy/node_modules/react'));
  ReactDOMServer = require(resolve(process.cwd(), 'prismflow-deploy/node_modules/react-dom/server'));
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
    expect(I.secsToStamp(-5, ',')).toBe('00:00:00,000');     // clamps negatives
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
  for (const tab of ['build', 'diagnose', 'captions', 'guide']) {
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
});
