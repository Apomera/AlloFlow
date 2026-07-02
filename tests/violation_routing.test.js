// $4 violation→chunk routing goldens (2026-07-02). The router lets aiFixChunked send
// element-scoped violations ONLY to the chunk containing the element and skip untouched
// chunks outright. These pins encode the CONSERVATIVE contract: routing precision must
// never cost recall — anything not provably located in exactly one chunk stays global,
// and with routing inactive the prompts are byte-identical to the legacy build.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let route, createDocPipeline;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  createDocPipeline = window.AlloModules.createDocPipeline;
  route = createDocPipeline.routeViolationsToChunks;
  expect(typeof route).toBe('function');
});

const axeE = (id, nodeHtmls, opts = {}) => ({
  text: opts.text || `SERIOUS (axe-core): ${id} violation (${id}, ${nodeHtmls.length} elements)`,
  axeId: id,
  nodes: opts.nodes != null ? opts.nodes : nodeHtmls.length,
  nodeHtmls,
  snippet: null,
});
const aiE = (snippet, text = 'AI-FLAGGED: issue') => ({ text, axeId: null, nodes: 0, nodeHtmls: [], snippet });

describe('router — axe entries', () => {
  const CHUNKS = [
    '<main><h1>Doc</h1><p>alpha section text</p>',
    '<section><img src="x.png" alt=""><p>beta section text</p></section>',
    '<p>gamma section text</p></main>',
  ];
  it('unique allowlisted node snippet routes to its chunk', () => {
    const r = route([axeE('image-alt', ['<img src="x.png" alt="">'])], CHUNKS);
    expect(r.assign).toEqual([1]);
    expect(r.routedCount).toBe(1);
  });
  it('snippet found in TWO chunks → global', () => {
    const dup = ['<p>dup</p><span class="q">needle-here-x</span>', '<span class="q">needle-here-x</span>', '<p>z</p>'];
    const r = route([axeE('button-name', ['<span class="q">needle-here-x</span>'])], dup);
    expect(r.assign).toEqual([-1]);
  });
  it('snippet found twice in ONE chunk → global', () => {
    const twice = ['<a href="#">click here</a> <a href="#">click here</a>', '<p>other</p>'];
    const r = route([axeE('link-name', ['<a href="#">click here</a>'])], twice);
    expect(r.assign).toEqual([-1]);
  });
  it('snippet found nowhere (chunk-boundary straddle) → global', () => {
    const r = route([axeE('image-alt', ['<img src="not-in-any-chunk.png" alt="">'])], CHUNKS);
    expect(r.assign).toEqual([-1]);
  });
  it('document-scoped rule stays global even with a unique locatable snippet', () => {
    const r = route([axeE('heading-order', ['<img src="x.png" alt="">'])], CHUNKS);
    expect(r.assign).toEqual([-1]);
    const r2 = route([axeE('landmark-one-main', ['<img src="x.png" alt="">'])], CHUNKS);
    expect(r2.assign).toEqual([-1]);
  });
  it('unknown/novel axe id defaults to global (allowlist, not blocklist)', () => {
    const r = route([axeE('some-future-rule', ['<img src="x.png" alt="">'])], CHUNKS);
    expect(r.assign).toEqual([-1]);
  });
  it('axe truncated the node list (nodes > nodeHtmls.length) → global', () => {
    const r = route([axeE('image-alt', ['<img src="x.png" alt="">'], { nodes: 5 })], CHUNKS);
    expect(r.assign).toEqual([-1]);
  });
  it('multi-node entry: ALL nodes in the same chunk routes; nodes split across chunks → global', () => {
    const two = [
      '<p>filler alpha</p>',
      '<img src="a-first.png" alt=""><p>mid</p><img src="b-second.png" alt="">',
      '<p>filler omega</p>',
    ];
    const same = route([axeE('image-alt', ['<img src="a-first.png" alt="">', '<img src="b-second.png" alt="">'])], two);
    expect(same.assign).toEqual([1]);
    const split = [
      '<img src="a-first.png" alt=""><p>x</p>',
      '<img src="b-second.png" alt=""><p>y</p>',
    ];
    const r2 = route([axeE('image-alt', ['<img src="a-first.png" alt="">', '<img src="b-second.png" alt="">'])], split);
    expect(r2.assign).toEqual([-1]);
  });
  it('data-URL-bearing snippet → global (chunks are the image-STRIPPED string)', () => {
    const r = route([axeE('image-alt', ['<img src="data:image/png;base64,AAAA" alt="">'])], CHUNKS);
    expect(r.assign).toEqual([-1]);
  });
  it('very short snippet (<12 chars) → global', () => {
    const short = ['<p>a</p><br><p>b</p>', '<p>c</p>'];
    const r = route([axeE('image-alt', ['<br>'])], short);
    expect(r.assign).toEqual([-1]);
  });
});

describe('router — AI-flagged entries', () => {
  const CHUNKS = [
    '<h2>Intro</h2><p>Some general prose about weather patterns.</p>',
    '<table><tr><td>Water boils at <b>100</b> degrees Celsius</td></tr></table>',
    '<p>Closing remarks with different content entirely.</p>',
  ];
  it('exact-locator snippet routes through inline tags via visible-text normalization', () => {
    const r = route([aiE('Water boils at 100 degrees Celsius')], CHUNKS);
    expect(r.assign).toEqual([1]);
  });
  it('coarse locator (no snippet) → global', () => {
    const r = route([aiE(null)], CHUNKS);
    expect(r.assign).toEqual([-1]);
  });
  it('ambiguous snippet (matches two chunks) → global', () => {
    const amb = ['<p>the same exact sentence here</p>', '<p>the same exact sentence here</p>'];
    const r = route([aiE('the same exact sentence here')], amb);
    expect(r.assign).toEqual([-1]);
  });
  it('mixed batch preserves per-entry independence and counts', () => {
    const entries = [
      axeE('image-alt', ['<img src="x.png" alt="">']), // routable but not present → global
      aiE('Water boils at 100 degrees Celsius'),        // routes to 1
      axeE('heading-order', []),                        // doc-scoped → global
    ];
    const r = route(entries, CHUNKS);
    expect(r.assign.length).toBe(3);
    expect(r.assign[1]).toBe(1);
    expect(r.assign[0]).toBe(-1);
    expect(r.assign[2]).toBe(-1);
    expect(r.routedCount).toBe(1);
  });
});

describe('router — disable conditions', () => {
  it('empty entries → null (routing disabled, legacy behavior)', () => {
    expect(route([], ['<p>a</p>', '<p>b</p>'])).toBeNull();
  });
  it('single chunk → null', () => {
    expect(route([aiE('anything at all here')], ['<p>only one chunk</p>'])).toBeNull();
  });
});

// ── Integration: aiFixChunked with routing (skip/prompt/legacy behavior) ──
describe('aiFixChunked routing integration', () => {
  let pipeline, calls;
  const mkPipeline = () => {
    calls = [];
    pipeline = createDocPipeline({
      callGemini: async (prompt) => {
        calls.push(String(prompt));
        // Echo the fragment back unchanged (passes the length/text-parity gates).
        const m = String(prompt).match(/"""\n([\s\S]*?)\n"""/);
        return m ? m[1] : '';
      },
      callGeminiVision: async () => '{}',
      callImagen: async () => null,
      addToast: () => {},
      t: (k) => k,
      isRtlLang: () => false,
      updateExportPreview: () => {},
      getDefaultTitle: () => 'Document',
      state: {},
    });
    expect(typeof pipeline.aiFixChunked).toBe('function');
  };

  // ~3 chunks at the 16k chunk size: three sections of ~17k chars each.
  const FILLER = (word) => `<p>${(word + ' ').repeat(12).trim()} filler sentence for sizing the chunk boundaries.</p>`;
  const section = (word, n) => Array.from({ length: n }, () => FILLER(word)).join('\n');
  const HTML = '<main>\n' + section('alpha', 130) + '\n'
    + '<img src="uniquely-broken.png" alt="">\n' + section('beta', 130) + '\n'
    + section('gamma', 130) + '\n</main>';
  const IMG_ENTRY = {
    text: 'CRITICAL (axe-core): Images must have alternative text (image-alt, 1 elements)',
    axeId: 'image-alt', nodes: 1, nodeHtmls: ['<img src="uniquely-broken.png" alt="">'], snippet: null,
  };
  const DOC_ENTRY = {
    text: 'MODERATE (axe-core): Heading levels should only increase by one (heading-order)',
    axeId: 'heading-order', nodes: 2, nodeHtmls: [], snippet: null,
  };

  it('routed run: only the chunk containing the element gets a model call; others pass through byte-identically', async () => {
    mkPipeline();
    const out = await pipeline.aiFixChunked(HTML, IMG_ENTRY.text, 'route-test', { entries: [IMG_ENTRY], feedback: '' });
    expect(calls.length).toBe(1); // every other chunk skipped — no model call at all
    expect(calls[0]).toContain('image-alt');
    expect(calls[0]).toContain('uniquely-broken.png');
    expect(out).toBe(HTML); // echo mock + verbatim passthrough → byte-identical
  });

  it('feedback reaches only non-skipped chunks and never un-skips one', async () => {
    mkPipeline();
    const FEEDBACK = 'NOTE: the previous fix attempt returned the document UNCHANGED.';
    await pipeline.aiFixChunked(HTML, IMG_ENTRY.text, 'route-fb', { entries: [IMG_ENTRY], feedback: FEEDBACK });
    expect(calls.length).toBe(1); // feedback did not resurrect skipped chunks
    expect(calls[0]).toContain(FEEDBACK);
  });

  it('unroutable-only entries → routing inactive: every chunk prompted with the global text + feedback appended once (legacy shape)', async () => {
    mkPipeline();
    const FEEDBACK = 'NOTE: the previous fix attempt was REVERTED.';
    await pipeline.aiFixChunked(HTML, DOC_ENTRY.text, 'route-legacy', { entries: [DOC_ENTRY], feedback: FEEDBACK });
    expect(calls.length).toBeGreaterThanOrEqual(3); // all chunks called — nothing skippable
    for (const p of calls) {
      expect(p).toContain('heading-order');
      expect(p).toContain(FEEDBACK);
    }
  });

  it('no routing arg (legacy caller) → identical to pre-$4 behavior: all chunks, same text', async () => {
    mkPipeline();
    const out = await pipeline.aiFixChunked(HTML, 'SERIOUS (axe-core): some violation (some-rule, 2 elements)', 'route-none');
    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (const p of calls) expect(p).toContain('some violation');
    expect(out).toBe(HTML);
  });
});
