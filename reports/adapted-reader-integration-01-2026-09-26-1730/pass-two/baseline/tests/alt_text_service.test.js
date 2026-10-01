import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Shared alt-text service (2026-09-03), WCAG 2.1 AA 1.1.1.
// Contract: describe the drawn pixels (batched, index-keyed), score with the
// remediation pipeline's checker (one rule set), record provenance, fall back
// honestly (planning text is intent, never presented as a description).

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
let A;
let React;
let ReactDOMClient;
let act;
let root;
let host;

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('alt_text_module.js');
  A = window.AlloModules.AltText;
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  if (host) host.remove();
  root = null;
  host = null;
});

describe('animations are described by their change, not their first frame', () => {
  // An animated panel's content IS the change. Drafting alt from frames[0]
  // produced a still description of the starting state, which tells a reader
  // who cannot see the animation nothing about what it demonstrates.
  const animated = { id: 'anim', motion: true, frames: [PNG, JPG, PNG], dataUrl: PNG, context: 'water evaporating' };

  it('sends the first and last frame with a motion prompt', async () => {
    const calls = [];
    const callGeminiVision = vi.fn(async (prompt, parts) => {
      calls.push({ prompt, parts });
      return '[{"index":1,"kind":"animation","alt":"A puddle shrinks as vapour rises from it.","matchesBrief":true}]';
    });
    const [result] = await A.draftAlts([animated], { callGeminiVision });
    expect(callGeminiVision).toHaveBeenCalledTimes(1);
    // Two frames, first and last — not the middle one, and not just frames[0].
    expect(Array.isArray(calls[0].parts)).toBe(true);
    expect(calls[0].parts.length).toBe(2);
    expect(calls[0].prompt).toContain('IMAGE 1 is the FIRST frame');
    expect(calls[0].prompt).toContain('what CHANGES');
    expect(result).toMatchObject({ alt: 'A puddle shrinks as vapour rises from it.', kind: 'animation', source: 'vision', decorative: false });
  });

  it('keeps stills batched while an animation takes its own call', async () => {
    const callGeminiVision = vi.fn(async (prompt, parts) => (parts.length === 2 && prompt.includes('FIRST frame')
      ? '[{"index":1,"kind":"animation","alt":"A seed opens into a sprout.","matchesBrief":true}]'
      : '[{"index":1,"kind":"illustration","alt":"A labelled beaker.","matchesBrief":true},{"index":2,"kind":"illustration","alt":"A thermometer.","matchesBrief":true}]'));
    const results = await A.draftAlts([
      { id: 'a', dataUrl: PNG, context: 'beaker' },
      animated,
      { id: 'b', dataUrl: JPG, context: 'thermometer' },
    ], { callGeminiVision });
    // One motion call plus ONE batch for the two stills, not three calls.
    expect(callGeminiVision).toHaveBeenCalledTimes(2);
    // Results stay in input order regardless of which lane produced them.
    expect(results.map(r => r.alt)).toEqual(['A labelled beaker.', 'A seed opens into a sprout.', 'A thermometer.']);
  });

  it('falls back to planning text when the motion call fails, and never blocks the stills', async () => {
    const callGeminiVision = vi.fn(async (prompt) => {
      if (prompt.includes('FIRST frame')) throw new Error('vision down');
      return '[{"index":1,"kind":"illustration","alt":"A labelled beaker.","matchesBrief":true}]';
    });
    const results = await A.draftAlts([animated, { id: 'a', dataUrl: PNG, context: 'beaker' }], { callGeminiVision });
    expect(results[0].source).toBe('planning');
    expect(results[1]).toMatchObject({ alt: 'A labelled beaker.', source: 'vision' });
  });

  it('treats a single-frame panel as an ordinary still', async () => {
    const callGeminiVision = vi.fn(async () => '[{"index":1,"kind":"illustration","alt":"A still beaker.","matchesBrief":true}]');
    const [result] = await A.draftAlts([{ id: 's', motion: true, frames: [PNG], dataUrl: PNG, context: 'beaker' }], { callGeminiVision });
    expect(callGeminiVision.mock.calls[0][0]).not.toContain('FIRST frame');
    expect(result).toMatchObject({ alt: 'A still beaker.', kind: 'illustration' });
  });

  it('the panel lane asks for motion drafting', () => {
    const dispatcher = readFileSync(resolve(process.cwd(), 'generate_dispatcher_source.jsx'), 'utf8');
    expect(dispatcher).toContain('motion: Array.isArray(panel.frames) && panel.frames.length > 1');
    // A paused frame describes the still it is showing, not the whole animation.
    const panel = readFileSync(resolve(process.cwd(), 'visual_panel_source.jsx'), 'utf8');
    expect(panel).toContain('paused_frame_start');
    expect(panel).toContain('panel.motionSteps[frameIdx - 1]');
  });
});

describe('quality and prompt helpers', () => {
  it('delegates quality checks to the remediation checker so the two rule sets cannot drift', () => {
    expect(typeof window.AlloModules.createDocPipeline.altQuality).toBe('function');
    expect(A.assessAlt('Educational diagram.').severity).toBe('high');
    expect(A.assessAlt('Image (needs description)').issues.map(i => i.id)).toContain('placeholder');
    expect(A.assessAlt('A gray statue stands beside a clear glass of water.').flagged).toBe(false);
    expect(A.assessAlt('').flagged).toBe(false);
    expect(A.assessAlt('x'.repeat(260)).issues.map(i => i.id)).toContain('too-long');
  });

  it('turns an image prompt into an honest subject-only placeholder', () => {
    const prompt = 'Icon style illustration of "volcano" (Context: a mountain that erupts). Style: flat vector. White background. STRICTLY NO TEXT, NO LABELS, NO LETTERS. Visual only. Educational icon.';
    expect(A.promptToDescription(prompt)).toBe('Volcano.');
    const scene = 'Create one simple, age-appropriate educational illustration that functions as a retrieval cue. Sun over a lake with a cloud and rain returning to the water. Rendering constraints: one coherent static scene, uncluttered composition, high contrast, classroom-appropriate, and no words.';
    expect(A.promptToDescription(scene)).toBe('Sun over a lake with a cloud and rain returning to the water.');
    expect(A.promptToDescription('')).toBe('');
    expect(A.promptToDescription('picture of a red fox in snow').startsWith('A red fox')).toBe(true);
  });

  it('hashes image bytes stably and cheaply', () => {
    expect(A.hashImage(PNG)).toBe(A.hashImage(PNG));
    expect(A.hashImage(PNG)).not.toBe(A.hashImage(JPG));
    expect(A.hashImage('')).toBe('');
    expect(A.splitDataUrl(JPG)).toMatchObject({ mimeType: 'image/jpeg' });
    expect(A.splitDataUrl('https://example.org/x.png')).toBeNull();
  });
});

describe('batched drafting', () => {
  it('sends every image of a batch as one multi-part call, keyed by index, in the resource language', async () => {
    const calls = [];
    const callGeminiVision = vi.fn(async (prompt, parts, mime) => {
      calls.push({ prompt, parts, mime });
      return 'Here you go:\n[{"index":1,"kind":"illustration","alt":"Un volcán en erupción.","matchesBrief":true},{"index":2,"kind":"decorative","alt":"swirl","matchesBrief":true}]';
    });
    const out = await A.draftAlts([
      { id: 'a', dataUrl: PNG, context: 'a volcano' },
      { id: 'b', dataUrl: JPG, context: 'decorative swirl' },
    ], { language: 'Spanish', callGeminiVision });
    expect(callGeminiVision).toHaveBeenCalledTimes(1);
    expect(calls[0].parts).toHaveLength(2);
    expect(calls[0].parts[1].mimeType).toBe('image/jpeg');
    expect(calls[0].prompt).toContain('Write every "alt" in Spanish');
    expect(calls[0].prompt).toContain('IMAGE 2 brief: decorative swirl');
    expect(out[0]).toMatchObject({ id: 'a', alt: 'Un volcán en erupción.', source: 'vision', decorative: false });
    expect(out[1]).toMatchObject({ id: 'b', alt: '', decorative: true, kind: 'decorative', source: 'vision' });
  });

  it('retries per image when a batch reply is short or confused, and never blanks the set', async () => {
    let n = 0;
    const callGeminiVision = vi.fn(async (prompt, parts) => {
      n += 1;
      if (parts.length === 2) return '[{"index":1,"alt":"Only one."}]';
      return '[{"index":1,"kind":"diagram","alt":"Per-image reply ' + n + '."}]';
    });
    const out = await A.draftAlts([{ id: 1, dataUrl: PNG, prompt: 'x' }, { id: 2, dataUrl: JPG, prompt: 'y' }], { callGeminiVision });
    expect(callGeminiVision).toHaveBeenCalledTimes(3);
    expect(out.map(o => o.source)).toEqual(['vision', 'vision']);
    expect(out[1].alt).toMatch(/^Per-image reply/);
  });

  it('falls back to planning text, marked as such, when vision is unavailable or fails', async () => {
    const none = await A.draftAlts([{ id: 'p', dataUrl: PNG, prompt: 'Icon style illustration of "atom". Style: flat vector. No text.' }], {});
    expect(none[0]).toMatchObject({ source: 'planning', alt: 'Atom.' });
    const failing = vi.fn(async () => { throw new Error('429'); });
    const out = await A.draftAlts([{ id: 'q', dataUrl: PNG, prompt: 'a red fox' }], { callGeminiVision: failing });
    expect(out[0]).toMatchObject({ source: 'planning', alt: 'A red fox.' });
    const abort = new AbortController();
    abort.abort();
    await expect(A.draftAlts([{ id: 'r', dataUrl: PNG }], { callGeminiVision: failing, signal: abort.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('caps batches at eight images', async () => {
    const callGeminiVision = vi.fn(async (prompt, parts) => JSON.stringify(parts.map((_, i) => ({ index: i + 1, alt: 'Item ' + (i + 1) + ' described.' }))));
    const images = Array.from({ length: 11 }, (_, i) => ({ id: i, dataUrl: PNG, prompt: 'thing ' + i }));
    const out = await A.draftAlts(images, { callGeminiVision });
    expect(callGeminiVision).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(11);
    expect(out.every(o => o.source === 'vision')).toBe(true);
  });

  it('the vision transport accepts an array of image parts', () => {
    const api = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');
    expect(api).toContain('const _visionImageParts = (base64Data, mimeType) =>');
    expect(api).toContain('].concat(_visionImageParts(base64Data, mimeType))');
    const pipeline = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
    expect(pipeline).toContain("LANGUAGE: write \"alt\", \"chartSummary\" and \"extractedText\" in the document language");
  });
});

describe('ImageAltField', () => {
  const render = async (props) => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => root.render(React.createElement(window.AlloModules.ImageAltField, props)));
  };

  it('shows provenance, a quality verdict from the shared checker, and the decorative toggle', async () => {
    const onChange = vi.fn();
    await render({ id: 'alt-1', value: 'Educational diagram.', source: 'planning', onChange, onRegenerate: () => {} });
    expect(host.textContent).toContain('Drafted from the prompt');
    expect(host.textContent).toContain('Check:');
    expect(host.textContent).toContain('generic boilerplate');
    expect(host.querySelector('textarea').getAttribute('aria-describedby')).toContain('alt-1-quality');
    expect(host.querySelector('button').textContent).toBe('Describe from the image');
    await render({ id: 'alt-2', value: 'A gray statue beside a glass of water.', source: 'vision' });
    expect(host.textContent).toContain('Reads as a description.');
    expect(host.textContent).toContain('Described from the image by AI');
  });

  it('hides the text field and warnings when decorative, and warns when empty', async () => {
    await render({ id: 'alt-3', value: '', decorative: true });
    expect(host.querySelector('textarea')).toBeNull();
    await render({ id: 'alt-4', value: '', decorative: false });
    expect(host.textContent).toContain('No description yet');
  });
});
