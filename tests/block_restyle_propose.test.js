// AI engagement-suggestion pass (S3 block-restyle slice 2, 2026-06-23). proposeRestyles asks the model
// ONLY to SELECT blocks (ref + kind + reason — never HTML), then runs every pick through the deterministic
// restyleBlock triple-gate, so an unsafe suggestion is auto-rejected and never surfaced. The AI can suggest
// but cannot corrupt. FERPA: it sends block text snippets (selection-only), never the document HTML. These
// tests mock callGemini and prove the gating, the prompt shape, the validation, and graceful failure.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// proposeRestyles closes over callGemini + stripFence + restyleBlock (+ the guard). Inject the pure restyle
// span (guard → restyleBlock) AND the proposeRestyles closure together, supplying callGemini/stripFence.
const span = dp.slice(dp.indexOf('function checkReadingOrderPreserved(beforeHtml, afterHtml) {'), dp.indexOf('\n// Convert an INTERACTIVE image-placeholder'));
const _ps = dp.indexOf('const proposeRestyles = async (html, opts) => {');
const _pe = dp.indexOf('\n  };', _ps) + '\n  };'.length;
if (span.length < 100 || _ps === -1 || _pe < 0) throw new Error('extraction markers for proposeRestyles missing');
const propSrc = dp.slice(_ps, _pe).replace('const proposeRestyles', 'var proposeRestyles');
const make = (callGemini) => new Function('callGemini', 'stripFence',
  span + '\n' + propSrc + '\nreturn proposeRestyles;'
)(callGemini, (s) => String(s || '').replace(/```json|```/gi, '').trim());

const DOC = '<body>'
  + '<p>This is a sufficiently long introductory paragraph that explains the purpose of the document in prose.</p>'
  + '<p>First do this<br>then do that<br>finally do the other thing as the closing step here</p>'
  + '<p>Visit <a href="https://forms.test/x">the form</a> and also read the policy; questions go to staff here.</p>'
  + '<p>short</p>'
  + '</body>';
// refs (index among p,blockquote, only those >=40 chars are candidates): #0 intro, #1 list-able (top-level <br>),
// #2 has a link + ";" (list would flatten → must be gate-rejected), #3 "short" is excluded (too short).

describe('proposeRestyles: gates every AI pick through restyleBlock', () => {
  it('keeps a SAFE pick (a <br> paragraph → list) and returns its gated candidate html', async () => {
    const fn = make(async () => JSON.stringify([{ ref: 1, kind: 'list', reason: 'these are sequential steps' }]));
    const out = await fn(DOC, {});
    expect(out).toBeTruthy();
    expect(out.proposals.length).toBe(1);
    expect(out.proposals[0].kind).toBe('list');
    expect(out.proposals[0].html).toMatch(/^<ul/);
    expect(out.proposals[0].reason).toContain('sequential');
  });
  it('DROPS an UNSAFE pick (list on a paragraph whose link a list would flatten) — never surfaced', async () => {
    const fn = make(async () => JSON.stringify([{ ref: 2, kind: 'list', reason: 'looks like items' }]));
    const out = await fn(DOC, {});
    expect(out.suggested).toBe(1);         // the model suggested it
    expect(out.proposals.length).toBe(0);  // but the gate rejected it (inline-markup) → not shown
  });
  it('a callout pick on the intro paragraph is safe and kept', async () => {
    const fn = make(async () => JSON.stringify([{ ref: 0, kind: 'callout', reason: 'key purpose' }]));
    const out = await fn(DOC, {});
    expect(out.proposals.length).toBe(1);
    expect(out.proposals[0].html).toMatch(/role="note"/);
  });
});

describe('proposeRestyles: heading suggestions (the highest-value a11y pick)', () => {
  const HEADING_DOC = '<body>'
    + '<p>Chapter One Overview</p>'   // ref 0 — short, title-like (candidate now that the floor is 8 chars)
    + '<p>This is the body paragraph that follows the heading and explains the topic in ordinary prose here.</p>'
    + '</body>';
  it('promotes a short title block to a real heading at the model-chosen level', async () => {
    const fn = make(async () => JSON.stringify([{ ref: 0, kind: 'heading', level: 2, reason: 'section title' }]));
    const out = await fn(HEADING_DOC, {});
    expect(out.proposals.length).toBe(1);
    expect(out.proposals[0].kind).toBe('heading');
    expect(out.proposals[0].level).toBe(2);
    expect(out.proposals[0].html).toBe('<h2>Chapter One Overview</h2>');
  });
  it('clamps an invalid / missing level to 2 (never h1)', async () => {
    const fn = make(async () => JSON.stringify([{ ref: 0, kind: 'heading', level: 1, reason: 'x' }]));
    const out = await fn(HEADING_DOC, {});
    expect(out.proposals[0].level).toBe(2);
    expect(out.proposals[0].html).toBe('<h2>Chapter One Overview</h2>');
  });
  it('the prompt lists short title blocks as candidates (floor lowered to include headings)', async () => {
    let seen = '';
    const fn = make(async (p) => { seen = p; return '[]'; });
    await fn(HEADING_DOC, {});
    expect(seen).toContain('Chapter One Overview');
    expect(seen).toMatch(/"heading"/);   // heading offered in the instructions
  });
});

describe('proposeRestyles: validation + de-duplication', () => {
  it('ignores refs that do not exist, bad kinds, and non-objects', async () => {
    const fn = make(async () => JSON.stringify([{ ref: 99, kind: 'list' }, { ref: 0, kind: 'bogus' }, 'nope', { kind: 'callout' }]));
    const out = await fn(DOC, {});
    expect(out.proposals.length).toBe(0);
  });
  it('keeps at most one proposal per block', async () => {
    const fn = make(async () => JSON.stringify([{ ref: 0, kind: 'callout', reason: 'a' }, { ref: 0, kind: 'callout', reason: 'b' }]));
    const out = await fn(DOC, {});
    expect(out.proposals.length).toBe(1);
  });
  it('honours the max cap', async () => {
    const fn = make(async () => JSON.stringify([{ ref: 0, kind: 'callout' }, { ref: 1, kind: 'callout' }]));
    const out = await fn(DOC, { max: 1 });
    expect(out.proposals.length).toBe(1);
  });
});

describe('proposeRestyles: only surfaces suggestions that can ACTUALLY be applied (adversarial-review hardening)', () => {
  // accessibleHtml is raw model output, NOT a DOMParser round-trip — so a block whose stored markup isn't
  // canonical (uppercase tag / single-quoted attr) won't byte-match the re-serialized outerHTML. Such a pick
  // must be SKIPPED at propose time (graceful), never offered as a dead "block changed" suggestion.
  it('skips a block whose non-canonical stored markup would not match the splice key', async () => {
    const doc = '<body>'
      + "<P class='lead'>This long lead paragraph was authored with an uppercase tag and a single-quoted attribute.</P>"
      + '<p>This canonical paragraph is long enough to be a candidate and matches its own serialization fine.</p>'
      + '</body>';
    let seen = '';
    const fn = make(async (p) => { seen = p; return JSON.stringify([{ ref: 0, kind: 'callout' }, { ref: 1, kind: 'callout' }]); });
    const out = await fn(doc, {});
    // the non-canonical block is not even a candidate (not in the prompt), so it can't be picked
    expect(seen).not.toMatch(/#0 \[p\] This long lead/);
    // only the canonical paragraph survives, and its stored markup is genuinely locatable in the doc string
    expect(out.proposals.every((p) => doc.indexOf(p.original) !== -1)).toBe(true);
    expect(out.proposals.length).toBeGreaterThanOrEqual(1);
  });
  it('skips duplicate-markup blocks (the splice cannot disambiguate them)', async () => {
    const dupText = 'Please submit the completed checklist to the front office before the end of the week.';
    const doc = '<body><p>' + dupText + '</p><p>Some other distinct and sufficiently long paragraph of prose here.</p><p>' + dupText + '</p></body>';
    // refs 0 and 2 are byte-identical → both must be excluded as non-unique
    const fn = make(async () => JSON.stringify([{ ref: 0, kind: 'callout' }, { ref: 2, kind: 'callout' }]));
    const out = await fn(doc, {});
    expect(out.proposals.length).toBe(0);
  });
  it('collects LEAF-MOST only: a blockquote wrapping a <p> lists the text once, not twice', async () => {
    const doc = '<body><blockquote><p>This nested quotation is long enough to be a candidate for restyling here.</p></blockquote></body>';
    let seen = '';
    const fn = make(async (p) => { seen = p; return '[]'; });
    await fn(doc, {});
    expect((seen.match(/This nested quotation/g) || []).length).toBe(1);   // once, not twice
    expect(seen).toMatch(/\[p\]/);            // the inner leaf <p>
    expect(seen).not.toMatch(/\[blockquote\]/); // not the container
  });
  it('reports kept vs suggested so the filtered count is visible (honesty)', async () => {
    // ref 0 is a link-bearing paragraph a list would flatten → gate-rejected; ref 1 is list-able
    const fn = make(async () => JSON.stringify([{ ref: 2, kind: 'list' }, { ref: 1, kind: 'list' }]));
    const out = await fn(DOC, {});
    expect(out.suggested).toBe(2);
    expect(out.kept).toBe(out.proposals.length);
    expect(out.kept).toBeLessThan(out.suggested);   // the link paragraph was filtered
  });
});

describe('proposeRestyles: FERPA + prompt shape (selection only, no rewrite, no HTML)', () => {
  it('sends only block TEXT (truncated) and instructs selection-only — never document HTML', async () => {
    let seen = '';
    const fn = make(async (p) => { seen = p; return '[]'; });
    await fn(DOC, {});
    expect(seen).toMatch(/do NOT rewrite/i);
    expect(seen).toMatch(/only SELECT/i);
    expect(seen).toMatch(/JSON array/i);
    expect(seen).toContain('#0 [p]');                 // numbered block listing
    expect(seen).not.toMatch(/<p>|<a |accessibleHtml|<body/);   // no raw document HTML in the prompt
  });
});

describe('proposeRestyles: graceful failure modes', () => {
  it('returns null when there is no callGemini', async () => {
    const fn = new Function('callGemini', 'stripFence', span + '\n' + propSrc + '\nreturn proposeRestyles;')(null, (s) => s);
    expect(await fn(DOC, {})).toBeNull();
  });
  it('returns null on non-JSON / non-array model output (no throw)', async () => {
    expect(await make(async () => 'sorry!')(DOC, {})).toBeNull();
    expect(await make(async () => JSON.stringify({ not: 'an array' }))(DOC, {})).toBeNull();
  });
  it('returns null when the model call throws (throttle)', async () => {
    expect(await make(async () => { throw new Error('busy'); })(DOC, {})).toBeNull();
  });
  it('returns an empty plan (not null) when there are no candidate blocks', async () => {
    const out = await make(async () => '[]')('<body><p>short</p></body>', {});
    expect(out).toEqual({ proposals: [], considered: 0, suggested: 0 });
  });
});

describe('anti-drift: exported + wired into an accept/revert plan UI', () => {
  it('proposeRestyles is on the factory API', () => {
    expect(dp).toMatch(/proposeRestyles: proposeRestyles,/);
  });
  it('_suggestRestyles fetches gated proposals; _applyProposal splices + snapshots revert + re-audits', () => {
    const s = view.slice(view.indexOf('const _suggestRestyles = async'), view.indexOf('const _suggestRestyles = async') + 2400);
    expect(s).toMatch(/_docPipeline\.proposeRestyles\(pdfFixResult\.accessibleHtml/);
    const a = view.slice(view.indexOf('const _applyProposal = async'), view.indexOf('const _applyProposal = async') + 1400);
    expect(a).toMatch(/_spliceBlock\(pdfFixResult\.accessibleHtml, p\.original, p\.html\)/);
    expect(a).toMatch(/_preCmdHtml: _before/);
    expect(a).toMatch(/await _reauditAndScore\(sp\.html, null\)/);
  });
  it('the plan UI offers per-suggestion Apply + an honest "only PICKS blocks" note', () => {
    expect(view).toMatch(/onClick=\{\(\) => _applyProposal\(p\)\}/);
    expect(view).toMatch(/pdf_audit\.region\.suggest_note/);
    expect(view).toMatch(/onClick=\{_suggestRestyles\}/);
  });
});
