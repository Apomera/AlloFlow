// Timeline Studio topic mode — grounded two-step loop unit tests.
// Covers: attachSourcesToEvents (the new mapping logic), coerceTimeline
// passthrough of sources/verification, topic prompt contract, grounded-verify
// wiring through the Sequence Builder factory, and display decoration honesty.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let H; // TimelineStudioHelpers

beforeAll(() => {
  // timeline_studio_module.js hard-returns unless window.React exists.
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('timeline_revision_module.js');
  loadAlloModule('timeline_studio_module.js');
  H = window.AlloModules.TimelineStudioHelpers;
  if (!H) throw new Error('TimelineStudioHelpers failed to register');
});

// ── Fixtures ────────────────────────────────────────────────────────────────
const EVENTS = [
  { start_date: { year: '1789' }, text: { headline: 'Estates-General convenes', text: 'The king summons the Estates-General.' } },
  { start_date: { year: '1789', month: '7', day: '14' }, text: { headline: 'Storming of the Bastille', text: 'Parisians storm the Bastille fortress.' } },
  { start_date: { year: '1793' }, text: { headline: 'Reign of Terror begins', text: 'Mass executions begin under the Committee.' } },
];

function rawTextFor(events) {
  // Simulates the model's raw JSON response the segments index into.
  return JSON.stringify({ title: { text: { headline: 'French Revolution', text: 'Key events.' } }, events });
}

function metaFor(rawText) {
  const chunks = [
    { web: { uri: 'https://example.org/bastille', title: 'Bastille — Example Encyclopedia' } },
    { web: { uri: 'https://example.org/terror', title: 'Reign of Terror — Example Encyclopedia' } },
  ];
  const iBastille = rawText.indexOf('Storming of the Bastille');
  const iTerror = rawText.indexOf('Reign of Terror begins');
  return {
    groundingChunks: chunks,
    groundingSupports: [
      { segment: { startIndex: iBastille, endIndex: iBastille + 60 }, groundingChunkIndices: [0] },
      { segment: { startIndex: iTerror, endIndex: iTerror + 50 }, groundingChunkIndices: [1] },
    ],
  };
}

// ── attachSourcesToEvents ───────────────────────────────────────────────────
describe('attachSourcesToEvents', () => {
  it('maps supports to the overlapping event and leaves others unsourced', () => {
    const raw = rawTextFor(EVENTS);
    const out = H.attachSourcesToEvents(EVENTS, raw, metaFor(raw));
    expect(out.hasSupports).toBe(true);
    expect(out.sourcedCount).toBe(2);
    expect(out.events[0].sources).toEqual([]);
    expect(out.events[1].sources).toEqual([{ title: 'Bastille — Example Encyclopedia', uri: 'https://example.org/bastille' }]);
    expect(out.events[2].sources).toEqual([{ title: 'Reign of Terror — Example Encyclopedia', uri: 'https://example.org/terror' }]);
    expect(out.docSources).toHaveLength(2);
  });

  it('handles missing supports: doc-level sources only, all events unsourced', () => {
    const raw = rawTextFor(EVENTS);
    const meta = { groundingChunks: metaFor(raw).groundingChunks, groundingSupports: [] };
    const out = H.attachSourcesToEvents(EVENTS, raw, meta);
    expect(out.hasSupports).toBe(false);
    expect(out.sourcedCount).toBe(0);
    expect(out.docSources).toHaveLength(2);
    out.events.forEach(e => expect(e.sources).toEqual([]));
  });

  it('handles null metadata (search returned nothing) without throwing', () => {
    const out = H.attachSourcesToEvents(EVENTS, rawTextFor(EVENTS), null);
    expect(out.docSources).toEqual([]);
    expect(out.sourcedCount).toBe(0);
  });

  it('omitted startIndex means 0 (Gemini contract) and dedupes URIs per event', () => {
    const raw = rawTextFor(EVENTS);
    const meta = {
      groundingChunks: [
        { web: { uri: 'https://example.org/a', title: 'A' } },
        { web: { uri: 'https://example.org/a', title: 'A dup' } },
      ],
      groundingSupports: [
        { segment: { endIndex: raw.length }, groundingChunkIndices: [0, 1] }, // whole-response segment, no startIndex
      ],
    };
    const out = H.attachSourcesToEvents(EVENTS, raw, meta);
    // whole-response support overlaps every located event; dup URI collapses
    out.events.forEach(e => expect(e.sources).toEqual([{ title: 'A', uri: 'https://example.org/a' }]));
    expect(out.docSources).toHaveLength(1);
  });

  it('event headline not present in raw text → that event stays unsourced', () => {
    const raw = rawTextFor(EVENTS.slice(0, 2));
    const events = EVENTS.concat(); // third headline absent from raw
    const meta = metaFor(raw);
    const out = H.attachSourcesToEvents(events, raw, meta);
    expect(out.events[2].sources).toEqual([]);
  });
});

// ── coerceTimeline passthrough ──────────────────────────────────────────────
describe('coerceTimeline enrichment passthrough', () => {
  it('preserves sources and verification fields on events', () => {
    const tl = {
      title: { text: { headline: 'T', text: '' } },
      events: [{
        start_date: { year: '1969' },
        text: { headline: 'Moon landing', text: 'Apollo 11 lands.' },
        sources: [{ title: 'S', uri: 'https://example.org/s' }],
        verification: { factual: true, position: true, concern: '', rationale: 'checked' },
      }],
    };
    const out = H.coerceTimeline(tl);
    expect(out.events[0].sources).toEqual([{ title: 'S', uri: 'https://example.org/s' }]);
    expect(out.events[0].verification.rationale).toBe('checked');
  });

  it('parses grounded output wrapped in prose + code fence (jsonMode-off path)', () => {
    const out = H.coerceTimeline('Sure! Here is your timeline:\n```json\n' +
      JSON.stringify({ title: { text: { headline: 'T', text: '' } }, events: [{ start_date: { year: '1969' }, text: { headline: 'Moon', text: 'x' } }] }) +
      '\n```\nHope that helps!');
    expect(out).not.toBeNull();
    expect(out.events).toHaveLength(1);
    expect(out.events[0].start_date.year).toBe('1969');
  });

  it('still drops events without a year and strips unknown junk (paste-mode regression)', () => {
    const out = H.coerceTimeline(JSON.stringify({
      events: [
        { start_date: { year: '' }, text: { headline: 'no year', text: '' } },
        { start_date: { year: '1969', month: '7' }, text: { headline: 'ok', text: 'fine' }, junk: 1 },
      ],
    }));
    expect(out.events).toHaveLength(1);
    expect(out.events[0].start_date).toEqual({ year: '1969', month: '7' });
    expect(out.events[0].junk).toBeUndefined();
    expect(out.events[0].sources).toBeUndefined(); // paste mode: no phantom fields
  });
});

// ── Live UI orchestration contract ──────────────────────────────────────────
describe('TimelineStudio generation lifecycle', () => {
  const source = () => readFileSync(resolve(process.cwd(), 'timeline_studio_module.js'), 'utf8');

  it.each(['generate', 'generateTopic'])('opens the popup during the %s button gesture, before awaiting AI', (name) => {
    const text = source();
    const start = text.indexOf('    function ' + name + '()');
    const end = text.indexOf('\n    function ', start + 10);
    const body = text.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(body.indexOf('dataRef.current = null;')).toBeGreaterThan(-1);
    expect(body.indexOf('var w = openPopup();')).toBeGreaterThan(-1);
    expect(body.indexOf('var w = openPopup();')).toBeLessThan(body.indexOf('Promise.resolve()'));
    expect(body.match(/var w = openPopup\(\);/g)).toHaveLength(1);
  });

  it('does not expose the modal backdrop as a nested interactive button', () => {
    const text = source();
    const modal = text.slice(text.indexOf("return h('div', {"), text.indexOf("h('div', { className: 'bg-slate-50"));
    expect(modal).not.toContain("role: 'button'");
    expect(modal).not.toContain('tabIndex: 0');
    expect(modal).toContain("role: 'dialog'");
    expect(modal).toContain('ref: dialogRef');
    expect(modal).toContain('onKeyDown: handleDialogKeyDown');
    expect(modal).toContain('ref: closeButtonRef');
    expect(modal).toContain("'aria-live': 'polite'");
    expect(text).toContain("if (e.key !== 'Tab' || !dialogRef.current) return;");
    expect(text).toContain('priorFocus.focus()');
  });
});
// ── Topic prompt contract ───────────────────────────────────────────────────
describe('buildTopicResearchPrompt', () => {
  it('carries topic, period, must-include, grade, and the grounding rules', () => {
    const p = H.buildTopicResearchPrompt('The Apollo program', '1961-1972', 'Apollo 13', 'high-school');
    expect(p).toContain('The Apollo program');
    expect(p).toContain('1961-1972');
    expect(p).toContain('Apollo 13');
    expect(p).toContain('high-school');
    expect(p).toContain('Only include events you can ground');
    expect(p).toMatch(/must-include event cannot be grounded/);
    expect(p).toContain('"events"'); // TimelineJS3 JSON contract present
  });

  it('omits optional lines when period/mustInclude are blank', () => {
    const p = H.buildTopicResearchPrompt('X', '', '  ', 'middle-school');
    expect(p).not.toContain('Time period to cover');
    expect(p).not.toContain('teacher asked to include');
  });
});

// ── Grounded verify via Sequence Builder factory ────────────────────────────
describe('runGroundedVerify', () => {
  it('forces useSearch=true + jsonMode=false, unwraps {text}, merges verification', async () => {
    const calls = [];
    const fakeCallGemini = (prompt, jsonMode, useSearch) => {
      calls.push({ jsonMode, useSearch });
      return Promise.resolve({
        // Prose-wrapped + fenced: proves grounded (jsonMode=false) output still parses.
        text: 'Here is the check:\n```json\n' + JSON.stringify([
          { index: 0, isFactuallyAccurate: true, isPositionCorrect: true, concern: '', rationale: 'ok' },
          { index: 1, isFactuallyAccurate: false, isPositionCorrect: true, concern: 'date off by a year', rationale: 'source says 1790' },
          { index: 2, isFactuallyAccurate: true, isPositionCorrect: true, concern: '', rationale: 'ok' },
        ]) + '\n```',
        groundingMetadata: { groundingChunks: [] },
      });
    };
    const out = await H.runGroundedVerify(fakeCallGemini, EVENTS, 'Middle school', null, () => {});
    expect(out.status).toBe('ok');
    expect(calls).toHaveLength(1);
    expect(calls[0].useSearch).toBe(true);  // verify is an independent grounded pass
    expect(calls[0].jsonMode).toBe(false);  // google_search + JSON mime is rejected in prod
    expect(out.events[0].verification.factual).toBe(true);
    expect(out.events[1].verification.factual).toBe(false);
    expect(out.events[1].verification.concern).toContain('date off');
  });

  it('reports failed (not ok) when the verify call errors — never a silent pass', async () => {
    const out = await H.runGroundedVerify(() => Promise.reject(new Error('quota')), EVENTS, 'Middle school', null, () => {});
    expect(out.status).toBe('failed');
    out.events.forEach(e => expect(e.verification).toBeUndefined());
  });
});

// ── Display decoration honesty ──────────────────────────────────────────────
describe('decorateTimelineForDisplay', () => {
  const baseTl = () => ({
    title: { text: { headline: 'French Revolution', text: 'Key events.' } },
    events: [
      { start_date: { year: '1789' }, text: { headline: 'A', text: 'a.' }, sources: [{ title: 'Src', uri: 'https://example.org/x' }], verification: { factual: true, position: true, concern: '', rationale: 'checked date' } },
      { start_date: { year: '1793' }, text: { headline: 'B', text: 'b.' }, sources: [], verification: { factual: false, position: true, concern: 'dubious', rationale: 'could not confirm' } },
    ],
  });

  it('renders check/flag badges, source links, and the disclosure with counts', () => {
    const research = { hasGrounding: true, sourcedCount: 1, docSources: [{ title: 'Src', uri: 'https://example.org/x' }], verifyStatus: 'ok' };
    const { timeline, flagged } = H.decorateTimelineForDisplay(baseTl(), research, null);
    expect(flagged).toBe(1);
    expect(timeline.events[0].text.text).toContain('✅');
    expect(timeline.events[0].text.text).toContain('https://example.org/x');
    expect(timeline.events[1].text.text).toContain('⚠️');
    expect(timeline.events[1].text.text).toContain('dubious');
    expect(timeline.events[1].text.text).toContain('No source matched');
    expect(timeline.title.text.text).toContain('1/2');
    expect(timeline.title.text.text).toContain('not proof');
  });

  it('failed verify → every disclosure says unverified; unverified events flagged', () => {
    const tl = baseTl();
    delete tl.events[0].verification;
    delete tl.events[1].verification;
    const research = { hasGrounding: true, sourcedCount: 1, docSources: [], verifyStatus: 'failed' };
    const { timeline, flagged } = H.decorateTimelineForDisplay(tl, research, null);
    expect(flagged).toBe(2);
    expect(timeline.title.text.text).toContain('could not run');
    expect(timeline.events[0].text.text).toContain('Not verified');
  });

  it('no grounding → explicit ungrounded-draft disclosure', () => {
    const research = { hasGrounding: false, sourcedCount: 0, docSources: [], verifyStatus: 'ok' };
    const { timeline } = H.decorateTimelineForDisplay(baseTl(), research, null);
    expect(timeline.title.text.text).toContain('no web sources were retrieved');
  });

  it('escapes HTML in model/source text and rejects non-http URIs', () => {
    const tl = baseTl();
    tl.events[0].text.headline = '<img src=x onerror=alert(1)>';
    tl.events[0].sources = [{ title: '<b>evil</b>', uri: 'javascript:alert(1)' }];
    const research = { hasGrounding: true, sourcedCount: 1, docSources: [], verifyStatus: 'ok' };
    const { timeline } = H.decorateTimelineForDisplay(tl, research, null);
    expect(timeline.events[0].text.headline).not.toContain('<img');
    expect(timeline.events[0].text.text).not.toContain('<b>evil</b>');
    expect(timeline.events[0].text.text).toContain('href="#"');
  });

  it('paste mode (research=null) adds no badges and no disclosure', () => {
    const tl = baseTl();
    delete tl.events[0].verification; delete tl.events[0].sources;
    delete tl.events[1].verification; delete tl.events[1].sources;
    const { timeline, flagged } = H.decorateTimelineForDisplay(tl, null, null);
    expect(flagged).toBe(0);
    expect(timeline.events[0].text.text).not.toContain('<small>');
    expect(timeline.title.text.text).toBe('Key events.');
  });
});
