import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

// Describe is the mode a blind student lives in, and it had the weakest
// integrity scaffolding in the tool: flat authoritative prose whose only hedge
// was a prompt line asking the model to "say you are not sure", with nothing in
// the UI. Investigate, far lower stakes, already had strict JSON and an
// explicit confidence pill. A student who cannot see the photo also cannot tell
// a bad PHOTO from a bad DESCRIPTION.

const src = fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');
let parseDescribe, describeSpeech;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  parseDescribe = window.AccessLensPure.parseDescribe;
  describeSpeech = window.AccessLensPure.describeSpeech;
});

const payload = (o) => JSON.stringify(o);

function renderWith(describeResult) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  const ctx = {
    React, toolData: {}, isDark: false, isContrast: false,
    setToolData() {}, updateMulti() {}, gradeBand: 'g68'
  };
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.accessLens.render(ctx));
}

describe('Describe mode confidence', () => {
  it('asks for photo usability and hedges, not just a hope', () => {
    const i = src.indexOf('function describePrompt');
    const body = src.slice(i, src.indexOf('\n  }', i));
    expect(body).toContain('"photo":{"usable"');
    expect(body).toContain('"unsure"');
    // The old wording was a request with no structure behind it.
    expect(body).not.toContain('If you are not sure about something, say you are not sure');
  });

  it('reports an unusable photo separately from its contents', () => {
    const out = parseDescribe(payload({ photo: { usable: false, problem: 'too dark' }, description: 'Mostly shadow.', unsure: [] }));
    expect(out.usable).toBe(false);
    expect(out.problem).toBe('too dark');
    expect(out.description).toBe('Mostly shadow.');
  });

  it('never accuses a good photo when the field is absent', () => {
    // A missing photo object must not read as "your photo is bad".
    for (const body of [{ description: 'A desk.' }, { photo: {}, description: 'A desk.' }, { photo: { usable: true }, description: 'A desk.' }]) {
      expect(parseDescribe(payload(body)).usable, JSON.stringify(body)).toBe(true);
    }
  });

  it('keeps the description when the model ignores the JSON contract', () => {
    // Losing the description to a parse failure would be far worse than losing
    // the structure, for the user who most depends on it.
    for (const raw of ['Just prose, no JSON at all.', '{not valid json', '```json\n{broken\n```']) {
      const out = parseDescribe(raw);
      expect(out, raw).toBeTruthy();
      expect(out.description, raw).toContain(raw.indexOf('prose') >= 0 ? 'prose' : '{');
      expect(out.usable, raw).toBe(true);
      expect(out.structured, raw).toBe(false);
    }
  });

  it('strips code fences the way Investigate mode does', () => {
    const out = parseDescribe('```json\n' + payload({ photo: { usable: true }, description: 'A red mug.', unsure: [] }) + '\n```');
    expect(out.structured).toBe(true);
    expect(out.description).toBe('A red mug.');
  });

  it('survives hostile and empty input', () => {
    for (const bad of [null, undefined, '', '   ', 0, {}, [], 42]) {
      expect(() => parseDescribe(bad)).not.toThrow();
      expect(parseDescribe(bad), JSON.stringify(bad)).toBeNull();
    }
    // A JSON object with an empty description is not a usable result either.
    expect(parseDescribe(payload({ description: '   ' })).structured).toBe(false);
  });

  it('keeps the retake message when an unusable photo has nothing to describe', () => {
    const raw = payload({ photo: { usable: false, problem: 'The photo is too dark.' }, description: '', unsure: [] });
    const out = parseDescribe(raw);
    expect(out.structured).toBe(true);
    expect(out.usable).toBe(false);
    expect(out.problem).toBe('The photo is too dark.');
    const said = describeSpeech(out);
    expect(said).toContain('too dark');
    expect(said).not.toContain('{');
  });

  it('bounds the unsure list and drops empty entries', () => {
    const many = Array.from({ length: 20 }, (_, i) => 'item ' + i).concat(['', '   ']);
    const out = parseDescribe(payload({ description: 'A desk.', unsure: many }));
    expect(out.unsure.length).toBeLessThanOrEqual(6);
    for (const u of out.unsure) expect(u.trim().length).toBeGreaterThan(0);
    // A non-array must not throw or leak through.
    expect(parseDescribe(payload({ description: 'A desk.', unsure: 'nope' })).unsure).toEqual([]);
  });

  it('speaks the photo problem first, then the description, then the hedges', () => {
    const out = parseDescribe(payload({ photo: { usable: false, problem: 'too dark' }, description: 'Mostly shadow.', unsure: ['a shape on the left'] }));
    const said = describeSpeech(out);
    expect(said.indexOf('may not have come out')).toBeLessThan(said.indexOf('Mostly shadow'));
    expect(said.indexOf('Mostly shadow')).toBeLessThan(said.indexOf('not sure about'));
    // Read-aloud is how this mode is consumed; a hedge left out of speech is
    // a hedge the student never receives.
    expect(said).toContain('a shape on the left');
    expect(said).toContain('too dark.');
  });

  it('says nothing extra when the photo is fine and nothing is unsure', () => {
    const said = describeSpeech(parseDescribe(payload({ photo: { usable: true }, description: 'A red mug on a desk.', unsure: [] })));
    expect(said).toBe('A red mug on a desk.');
    expect(describeSpeech(null)).toBe('');
  });

  it('does not repeat the description in the image alt text', () => {
    // alt was a 300-character slice of the same description rendered below it,
    // so a screen reader read the opening twice.
    expect(src).not.toContain('results.describe.slice(0, 300)');
    expect(src).toContain('photo_alt_ok');
    expect(src).toContain('photo_alt_problem');
  });

  it('renders with no result at all', () => {
    expect(() => renderWith()).not.toThrow();
  });

  it('ships the same describe handling in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_accesslens.js', 'utf8')).toBe(src);
  });
});
