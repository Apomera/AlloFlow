// AlloStudio Milestone A (2026-07-02) — pure-core coverage for the event-sourced
// scene: ledger append/undo/redo, checkpointed replay, the closed actor set, the
// alt-text export gate, accessibility preflight, bridge exports, layout helpers,
// template integrity, and the born-accessible HTML export
// (DOM order = reading order; real text; alt/decorative enforced). Design doc:
// docs/studio_design.md v0.3.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let ST;
beforeAll(() => {
  loadAlloModule('studio_module.js');
  ST = window.AlloModules.AlloStudio;
  if (!ST) throw new Error('AlloStudio failed to register');
});

const T0 = 1751477000000; // fixed base timestamp — replay must not depend on wall clock

const addText = (doc, text, role = 'body', ts = T0) =>
  ST.stAppend(doc, { type: 'object.add', object: { type: 'text', role, frame: { x: 10, y: 10, w: 200, h: 40 }, z: 10, runs: [{ text, style: { size: 16 } }] } }, 'user', ts);
const addImage = (doc, src, alt, ts = T0) =>
  ST.stAppend(doc, { type: 'object.add', object: { type: 'image', src, alt, decorative: false, frame: { x: 5, y: 5, w: 100, h: 80 }, z: 5, provenance: { origin: 'upload' } } }, 'import', ts);

describe('doc creation + validation', () => {
  it('creates a valid letter-portrait doc by default', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Test', T0);
    expect(ST.stValidateDoc(d)).toEqual([]);
    expect(d.canvas.w).toBe(816);
    expect(d.canvas.h).toBe(1056);
  });
  it('unknown preset falls back to letter-portrait', () => {
    const d = ST.stCreateDoc('a3-mega', 'X', T0);
    expect(d.canvas.preset).toBe('letter-portrait');
  });
  it('rejects foreign / newer / malformed saves', () => {
    expect(ST.stValidateDoc({ format: 'notallostudio' }).length).toBeGreaterThan(0);
    expect(ST.stValidateDoc({ format: 'allostudio', version: 99, canvas: { w: 1, h: 1 }, objects: [], ledger: { ops: [] } }).some(e => /newer/i.test(e))).toBe(true);
    expect(ST.stValidateDoc(null).length).toBeGreaterThan(0);
  });
  it('rejects malformed saved objects and provenance actors', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Bad save', T0);
    addText(d, 'ok');
    d.objects[0].frame.x = Number.NaN;
    d.ledger.ops[0].actor = 'plugin';
    const errs = ST.stValidateDoc(d);
    expect(errs.some(e => /invalid frame/i.test(e))).toBe(true);
    expect(errs.some(e => /unknown actor/i.test(e))).toBe(true);
  });
  it('rejects unknown image fit modes in saved files', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Bad fit', T0);
    addImage(d, 'data:image/png;base64,x', 'diagram');
    d.objects[0].fit = 'stretch';
    expect(ST.stValidateDoc(d).some(e => /invalid image fit/i.test(e))).toBe(true);
  });
  it('save→load round-trip (JSON) stays valid and replayable', () => {
    const d = ST.stCreateDoc('square', 'RT', T0);
    addText(d, 'hello');
    const revived = JSON.parse(JSON.stringify(d));
    expect(ST.stValidateDoc(revived)).toEqual([]);
    const scene = ST.stReplay(revived, 1);
    expect(scene.objects.length).toBe(1);
  });
});

describe('ledger: append, actor set, id minting', () => {
  it('mints deterministic object ids from the op seq', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Ids', T0);
    const op1 = addText(d, 'a');
    const op2 = addText(d, 'b');
    expect(op1.object.id).toBe('o1');
    expect(op2.object.id).toBe('o2');
    expect(d.objects.map(o => o.id)).toEqual(['o1', 'o2']);
  });
  it('the actor set is CLOSED — a fourth actor throws (provenance-by-construction guard)', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Actors', T0);
    expect(() => ST.stAppend(d, { type: 'doc.retitle', title: 'x' }, 'plugin', T0)).toThrow(/unknown actor/);
    expect(() => ST.stAppend(d, { type: 'doc.retitle', title: 'x' }, 'user', T0)).not.toThrow();
    expect(() => ST.stAppend(d, { type: 'doc.retitle', title: 'y' }, 'ai', T0)).not.toThrow();
    expect(() => ST.stAppend(d, { type: 'doc.retitle', title: 'z' }, 'import', T0)).not.toThrow();
  });
  it('unknown op types are no-ops (forward compatibility), not corruption', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Fwd', T0);
    addText(d, 'keep me');
    const before = JSON.stringify(d.objects);
    ST.stAppend(d, { type: 'object.teleport', target: 'o1', to: 'mars' }, 'user', T0);
    expect(JSON.stringify(d.objects)).toBe(before);
  });
});

describe('scene ops', () => {
  const mk = () => { const d = ST.stCreateDoc('letter-portrait', 'Ops', T0); addText(d, 'one'); addText(d, 'two'); return d; };
  it('move + resize clamp into the canvas with a minimum size', () => {
    const d = mk();
    ST.stAppend(d, { type: 'object.move', target: 'o1', x: -500, y: 99999 }, 'user', T0);
    const o1 = d.objects.find(o => o.id === 'o1');
    expect(o1.frame.x).toBe(0);
    expect(o1.frame.y).toBe(1056 - o1.frame.h);
    ST.stAppend(d, { type: 'object.resize', target: 'o1', w: 2, h: 2 }, 'user', T0);
    expect(d.objects.find(o => o.id === 'o1').frame.w).toBeGreaterThanOrEqual(8);
  });
  it('non-finite move / resize values fall back to finite safe frames', () => {
    const d = mk();
    ST.stAppend(d, { type: 'object.move', target: 'o1', x: Number.NaN, y: Infinity }, 'user', T0);
    ST.stAppend(d, { type: 'object.resize', target: 'o1', w: Infinity, h: Number.NaN }, 'user', T0);
    const f = d.objects.find(o => o.id === 'o1').frame;
    expect(Object.values(f).every(Number.isFinite)).toBe(true);
    expect(f.w).toBeGreaterThanOrEqual(8);
    expect(f.h).toBeGreaterThanOrEqual(8);
  });
  it('reorder changes the READING ORDER (array position)', () => {
    const d = mk();
    ST.stAppend(d, { type: 'object.reorder', target: 'o2', toIndex: 0 }, 'user', T0);
    expect(d.objects.map(o => o.id)).toEqual(['o2', 'o1']);
  });
  it('update merges a patch; remove drops the object', () => {
    const d = mk();
    ST.stAppend(d, { type: 'object.update', target: 'o1', patch: { runs: [{ text: 'edited', style: { size: 20 } }] } }, 'user', T0);
    expect(d.objects.find(o => o.id === 'o1').runs[0].text).toBe('edited');
    ST.stAppend(d, { type: 'object.remove', target: 'o2' }, 'user', T0);
    expect(d.objects.length).toBe(1);
  });
  it('canvas.background and doc.retitle mutate doc-level state through the ledger', () => {
    const d = mk();
    ST.stAppend(d, { type: 'canvas.background', fill: '#123456' }, 'user', T0);
    ST.stAppend(d, { type: 'doc.retitle', title: 'Renamed' }, 'user', T0);
    expect(d.canvas.background.fill).toBe('#123456');
    expect(d.title).toBe('Renamed');
  });
});

describe('checkpoints + replay', () => {
  it('writes a checkpoint every 50 ops and replays THROUGH it correctly', () => {
    const d = ST.stCreateDoc('letter-portrait', 'CP', T0);
    for (let i = 0; i < 120; i++) addText(d, 't' + i, 'body', T0 + i * 1000);
    expect(d.ledger.checkpoints.map(c => c.atSeq)).toEqual([50, 100]);
    const sceneAt120 = ST.stReplay(d, 120);
    expect(sceneAt120.objects.length).toBe(120);
    // replay(lastSeq) === live scene — the core invariant
    expect(JSON.stringify(sceneAt120.objects)).toBe(JSON.stringify(d.objects));
  });
  it('scrubbing to a mid seq reconstructs that moment; seq 0 is the empty base', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Scrub', T0);
    addText(d, 'a'); addText(d, 'b'); addText(d, 'c');
    ST.stAppend(d, { type: 'object.remove', target: 'o2' }, 'user', T0);
    expect(ST.stReplay(d, 3).objects.length).toBe(3);
    expect(ST.stReplay(d, 4).objects.length).toBe(2);
    const zero = ST.stReplay(d, 0);
    expect(zero.objects.length).toBe(0);
    expect(zero.title).toBe('Scrub'); // _baseTitle anchors replay-to-zero
  });
  it('replay reconstructs a scene whose LATER ops mutate checkpointed objects', () => {
    const d = ST.stCreateDoc('letter-portrait', 'CPmut', T0);
    for (let i = 0; i < 55; i++) addText(d, 't' + i);
    ST.stAppend(d, { type: 'object.move', target: 'o3', x: 300, y: 300 }, 'user', T0);
    const scene = ST.stReplay(d, 56);
    expect(scene.objects.find(o => o.id === 'o3').frame.x).toBe(300);
    expect(JSON.stringify(scene.objects)).toBe(JSON.stringify(d.objects));
  });
});

describe('canvas.resize (page size as an op, _baseCanvas anchor)', () => {
  it('changes canvas dims + preset and re-clamps objects into the new page', () => {
    const d = ST.stCreateDoc('letter-landscape', 'Resize', T0); // 1056 x 816
    // object valid in landscape but off the right edge of portrait (816 wide)
    ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', frame: { x: 900, y: 40, w: 120, h: 80 }, z: 1, fill: '#dbeafe', decorative: true } }, 'user', T0);
    expect(d.objects[0].frame.x).toBe(900);
    ST.stAppend(d, { type: 'canvas.resize', preset: 'letter-portrait' }, 'user', T0 + 1000);
    expect([d.canvas.preset, d.canvas.w, d.canvas.h]).toEqual(['letter-portrait', 816, 1056]);
    expect(d.objects[0].frame.x).toBe(816 - 120); // re-clamped onto the page
  });
  it('resize preserves the page background', () => {
    const d = ST.stCreateDoc('square', 'BG', T0);
    ST.stAppend(d, { type: 'canvas.background', fill: '#123456' }, 'user', T0);
    ST.stAppend(d, { type: 'canvas.resize', preset: 'letter-portrait' }, 'user', T0);
    expect(d.canvas.background.fill).toBe('#123456');
  });
  it('scrubbing BEFORE a resize shows the original size; live scene === replay(last)', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Anchor', T0); // 816 x 1056
    addText(d, 'hi');                                            // seq 1
    ST.stAppend(d, { type: 'canvas.resize', preset: 'square' }, 'user', T0 + 1000); // seq 2 → 900x900
    // before the resize op → original portrait dims (base canvas anchor)
    expect([ST.stReplay(d, 1).canvas.w, ST.stReplay(d, 1).canvas.h]).toEqual([816, 1056]);
    // at/after the resize → new dims
    expect([ST.stReplay(d, 2).canvas.w, ST.stReplay(d, 2).canvas.h]).toEqual([900, 900]);
    // core invariant still holds for canvas, not just objects
    const live = ST.stReplay(d, d.ledger.ops[d.ledger.ops.length - 1].seq);
    expect([live.canvas.w, live.canvas.h]).toEqual([d.canvas.w, d.canvas.h]);
  });
  it('undo of a resize restores the previous page size', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Undo', T0);
    ST.stAppend(d, { type: 'canvas.resize', preset: 'letter-landscape' }, 'user', T0);
    expect(d.canvas.w).toBe(1056);
    ST.stUndo(d);
    expect([d.canvas.preset, d.canvas.w, d.canvas.h]).toEqual(['letter-portrait', 816, 1056]);
  });
  it('older saves without _baseCanvas still replay (fallback to current canvas)', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Legacy', T0);
    addText(d, 'x');
    delete d._baseCanvas;                    // simulate a pre-feature save
    const scene = ST.stReplay(d, d.ledger.ops[d.ledger.ops.length - 1].seq);
    expect([scene.canvas.w, scene.canvas.h]).toEqual([816, 1056]);
    expect(ST.stValidateDoc(d)).toEqual([]);
  });
});

describe('undo / redo = ledger navigation', () => {
  it('undo pops the op and recomputes; redo restores the identical scene (same seq/ts)', () => {
    const d = ST.stCreateDoc('letter-portrait', 'UR', T0);
    addText(d, 'a'); addText(d, 'b');
    const liveBefore = JSON.stringify(d.objects);
    expect(ST.stUndo(d)).toBe(true);
    expect(d.objects.length).toBe(1);
    expect(ST.stRedo(d)).toBe(true);
    expect(JSON.stringify(d.objects)).toBe(liveBefore);
    expect(d.ledger.ops[1].seq).toBe(2); // navigation does not re-stamp
  });
  it('a new op after undo clears the redo branch', () => {
    const d = ST.stCreateDoc('letter-portrait', 'URb', T0);
    addText(d, 'a'); addText(d, 'b');
    ST.stUndo(d);
    addText(d, 'c');
    expect(ST.stRedo(d)).toBe(false);
    expect(d.objects.map(o => o.runs[0].text)).toEqual(['a', 'c']);
  });
  it('undoing past a checkpoint truncates it (no stale-checkpoint replay corruption)', () => {
    const d = ST.stCreateDoc('letter-portrait', 'URcp', T0);
    for (let i = 0; i < 50; i++) addText(d, 't' + i);
    expect(d.ledger.checkpoints.length).toBe(1);
    ST.stUndo(d);
    expect(d.ledger.checkpoints.length).toBe(0);
    expect(d.objects.length).toBe(49);
    expect(ST.stUndo(d)).toBe(true);
    expect(d.objects.length).toBe(48);
  });
  it('undo on an empty ledger is a safe no-op', () => {
    const d = ST.stCreateDoc('letter-portrait', 'URe', T0);
    expect(ST.stUndo(d)).toBe(false);
  });
});

describe('actor summary (Process tab)', () => {
  it('counts per actor and sums only sub-5-minute gaps as active time', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Sum', T0);
    addText(d, 'a', 'body', T0);
    addText(d, 'b', 'body', T0 + 60000);            // +1 min (counts)
    addImage(d, 'data:image/png;base64,x', 'pic', T0 + 120000); // +1 min (counts)
    ST.stAppend(d, { type: 'doc.retitle', title: 'z' }, 'ai', T0 + 30 * 60000); // +28 min gap (excluded)
    const s = ST.stActorSummary(d.ledger.ops);
    expect(s.user).toBe(2);
    expect(s.import).toBe(1);
    expect(s.ai).toBe(1);
    expect(s.total).toBe(4);
    expect(s.activeMs).toBe(120000);
  });
  it('Milestone B AI actions are recorded honestly as actor "ai" (provenance by construction)', () => {
    const d = ST.stCreateDoc('letter-portrait', 'AI', T0);
    // AI-generated image enters as actor 'ai' with the prompt in provenance
    ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: 'data:image/png;base64,z', alt: '', decorative: false, frame: { x: 10, y: 10, w: 100, h: 80 }, z: 5, fit: 'cover', provenance: { origin: 'ai-generated', prompt: 'a water droplet' } } }, 'ai', T0);
    // AI-drafted alt lands as actor 'ai'; a later human edit would be 'user'
    ST.stAppend(d, { type: 'object.update', target: 'o1', patch: { alt: 'A cartoon water droplet smiling.' } }, 'ai', T0 + 1000);
    ST.stAppend(d, { type: 'object.update', target: 'o1', patch: { alt: 'A friendly cartoon water droplet.' } }, 'user', T0 + 2000);
    const s = ST.stActorSummary(d.ledger.ops);
    expect(s.ai).toBe(2);
    expect(s.user).toBe(1);
    expect(ST.stValidateDoc(d)).toEqual([]);
    expect(d.objects[0].provenance).toEqual({ origin: 'ai-generated', prompt: 'a water droplet' });
    // the human's revision is the live alt; the AI draft remains in the ledger
    expect(d.objects[0].alt).toBe('A friendly cartoon water droplet.');
    expect(d.ledger.ops.filter(o => o.actor === 'ai' && o.type === 'object.update').length).toBe(1);
  });
  it('describes raw event names in student-friendly language', () => {
    expect(ST.stDescribeOp({ type: 'object.update', patch: { alt: 'diagram' } })).toBe('Updated alt text');
    expect(ST.stDescribeOp({ type: 'object.reorder' })).toBe('Changed the reading order');
    expect(ST.stDescribeOp({ type: 'doc.template', template: 'worksheet' })).toBe('Started from the worksheet template');
  });
});

describe('accessibility preflight + workflow helpers', () => {
  it('computes WCAG-style contrast ratios', () => {
    expect(ST.stContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(ST.stContrastRatio('#777777', '#777777')).toBeCloseTo(1, 2);
  });
  it('flags missing alt, low contrast, small type, empty frames, and reading-order review', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Preflight', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', fill: '#ffffff', decorative: true, frame: { x: 0, y: 0, w: 816, h: 1056 }, z: 1 } }, 'user', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 20, y: 20, w: 200, h: 24 }, z: 2, runs: [{ text: 'tiny', style: { size: 10, color: '#fefefe' } }] } }, 'user', T0);
    addImage(d, 'data:image/png;base64,x', '');
    addImage(d, '', '');
    const result = ST.stAnalyzeDoc(d);
    const types = result.issues.map(issue => issue.type);
    expect(types).toContain('alt');
    expect(types).toContain('contrast');
    expect(types).toContain('small-text');
    expect(types).toContain('empty-image');
    expect(types).toContain('reading-order');
    expect(result.counts.error).toBeGreaterThanOrEqual(1);
    expect(result.counts.warning).toBeGreaterThanOrEqual(2);
  });
  it('multi-point sampling catches a caption that straddles a dark shape (center alone would pass)', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Straddle', T0);
    // dark shape covering only the LEFT region (x 0..200), under the text
    ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', fill: '#000000', decorative: true, frame: { x: 0, y: 0, w: 200, h: 100 }, z: 1 } }, 'user', T0);
    // black text box from x150..350 — its CENTER (x≈250) sits on the white page
    // (would pass center-only), but its left edge overlaps the black shape.
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 150, y: 0, w: 200, h: 60 }, z: 2, runs: [{ text: 'hard to read on the left', style: { size: 14, color: '#000000' } }] } }, 'user', T0);
    const types = ST.stAnalyzeDoc(d).issues.map(i => i.type);
    expect(types).toContain('contrast');
  });
  it('flags a skipped heading level and a missing H1', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Headings', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'heading1', frame: { x: 40, y: 40, w: 400, h: 60 }, z: 1, runs: [{ text: 'Title', style: { size: 40 } }] } }, 'user', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'heading3', frame: { x: 40, y: 120, w: 400, h: 40 }, z: 1, runs: [{ text: 'Jumped to H3', style: { size: 20 } }] } }, 'user', T0);
    const skip = ST.stAnalyzeDoc(d).issues.filter(i => i.type === 'heading-order');
    expect(skip.some(i => /Skipped/.test(i.title))).toBe(true);

    const d2 = ST.stCreateDoc('letter-portrait', 'NoH1', T0);
    ST.stAppend(d2, { type: 'object.add', object: { type: 'text', role: 'heading2', frame: { x: 40, y: 40, w: 400, h: 40 }, z: 1, runs: [{ text: 'Starts at H2', style: { size: 24 } }] } }, 'user', T0);
    expect(ST.stAnalyzeDoc(d2).issues.some(i => i.type === 'heading-order' && /No top-level/.test(i.title))).toBe(true);
  });
  it('a well-formed H1→H2 document raises no heading-order issue', () => {
    const d = ST.stTemplates().find(t => t.key === 'worksheet').make(T0);
    expect(ST.stAnalyzeDoc(d).issues.some(i => i.type === 'heading-order')).toBe(false);
  });
  it('aligns frames to edges, centers, and printable page width', () => {
    const canvas = { w: 500, h: 400 };
    const frame = { x: 10, y: 20, w: 100, h: 50 };
    expect(ST.stAlignFrame(frame, canvas, 'right').x).toBe(400);
    expect(ST.stAlignFrame(frame, canvas, 'bottom').y).toBe(350);
    expect(ST.stAlignFrame(frame, canvas, 'hcenter').x).toBe(200);
    expect(ST.stAlignFrame(frame, canvas, 'vcenter').y).toBe(175);
    expect(ST.stAlignFrame(frame, canvas, 'page-width')).toMatchObject({ x: 48, w: 404 });
  });
  it('exports worksheet bridge data from numbered heading prompts', () => {
    const ws = ST.stTemplates().find(t => t.key === 'worksheet').make(T0);
    const data = ST.stExportWorksheetData(ws);
    expect(data.title).toBe('Worksheet title');
    expect(data.instructions).toMatch(/Instructions/i);
    expect(data.questions.map(q => q.prompt)).toEqual(['Question 1', 'Question 2', 'Question 3']);
  });
  it('carries text alignment and bold from object.update into the HTML export', () => {
    // The property-panel align/bold controls dispatch object.update{patch.runs}.
    // Lock that the exported CSS honors both (DOM order = reading order stays real).
    const d = ST.stCreateDoc('letter-portrait', 'Styled', T0);
    addText(d, 'Centered bold heading', 'heading1');
    ST.stAppend(d, { type: 'object.update', target: 'o1', patch: { runs: [{ text: 'Centered bold heading', style: { size: 44, align: 'center', bold: true } }] } }, 'user', T0 + 1000);
    const html = ST.stExportHtml(d, { lang: 'en' });
    expect(html).toContain('text-align:center');
    expect(html).toContain('font-weight:700');
    // toggling bold back off flows through too
    ST.stAppend(d, { type: 'object.update', target: 'o1', patch: { runs: [{ text: 'Centered bold heading', style: { size: 44, align: 'center', bold: false } }] } }, 'user', T0 + 2000);
    expect(ST.stExportHtml(d, { lang: 'en' })).toContain('font-weight:400');
  });
  it('exports student-friendly process notes as markdown', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Process Notes', T0);
    addText(d, 'draft');
    ST.stAppend(d, { type: 'object.update', target: 'o1', patch: { runs: [{ text: 'revised', style: { size: 16 } }] } }, 'user', T0 + 60000);
    const md = ST.stExportProcessMarkdown(d, 'student');
    expect(md).toContain('## My Process');
    expect(md).toContain(ST.ST_HONESTY_LINE);
    expect(md).toContain('#1 Added text');
    expect(md).toContain('#2 Edited text');
  });
});

describe('alt gate (design law 3)', () => {
  it('flags content images WITH pixels and no alt; decorative and empty frames pass', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Alt', T0);
    addImage(d, 'data:image/png;base64,x', '');                 // offender
    addImage(d, 'data:image/png;base64,y', 'described');        // ok
    addImage(d, '', '');                                        // empty frame — exempt
    ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: 'data:image/png;base64,z', alt: '', decorative: true, frame: { x: 0, y: 0, w: 50, h: 50 }, z: 1 } }, 'import', T0);
    const gate = ST.stAltGate(d.objects);
    expect(gate.length).toBe(1);
    expect(gate[0].id).toBe('o1');
  });
  it('whitespace-only alt does not satisfy the gate', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Alt2', T0);
    addImage(d, 'data:image/png;base64,x', '   ');
    expect(ST.stAltGate(d.objects).length).toBe(1);
  });
});

describe('templates (doc §11 set)', () => {
  it('ships the classroom template gallery — all valid, all ledger-seeded', () => {
    const tpls = ST.stTemplates();
    expect(tpls.map(t => t.key)).toEqual(['flyer', 'worksheet', 'poster', 'exitTicket', 'vocabPoster', 'labSafety', 'checklist', 'newsletter', 'bookReport', 'cerOrganizer', 'compareContrast', 'blank']);
    for (const tpl of tpls) {
      const d = tpl.make(T0);
      expect(ST.stValidateDoc(d)).toEqual([]);
      expect(d.ledger.ops[0].type).toBe('doc.template');
      expect(d.ledger.ops.every(op => op.actor === 'user')).toBe(true);
      // replay invariant holds for seeded docs too
      const last = d.ledger.ops[d.ledger.ops.length - 1].seq;
      expect(JSON.stringify(ST.stReplay(d, last).objects)).toBe(JSON.stringify(d.objects));
      // no template pre-fills alt with placeholder prose (fake alt is worse than none)
      d.objects.filter(o => o.type === 'image').forEach(o => expect(o.alt).toBe(''));
      // no template blocks export out of the box
      expect(ST.stAltGate(d.objects)).toEqual([]);
    }
  });
  it('blank canvas honors the chosen orientation at creation (portrait/landscape/square)', () => {
    const blank = ST.stTemplates().find(t => t.key === 'blank');
    expect(blank.orientations).toBe(true);
    expect(blank.make(T0).canvas.preset).toBe('letter-portrait');              // default
    const land = blank.make(T0, 'letter-landscape').canvas;
    expect([land.preset, land.w, land.h]).toEqual(['letter-landscape', 1056, 816]);
    const sq = blank.make(T0, 'square').canvas;
    expect([sq.preset, sq.w, sq.h]).toEqual(['square', 900, 900]);
    expect(blank.make(T0, 'bogus').canvas.preset).toBe('letter-portrait');     // unknown → portrait
    // orientation is the BASE canvas (not an op) → replay/validate still clean
    const d = blank.make(T0, 'square');
    expect(ST.stValidateDoc(d)).toEqual([]);
  });
  it('worksheet template carries numbered question headings (the doc_pipeline bridge hook)', () => {
    const ws = ST.stTemplates().find(t => t.key === 'worksheet').make(T0);
    const headings = ws.objects.filter(o => o.type === 'text' && o.role === 'heading2');
    expect(headings.length).toBe(3);
    expect(headings[0].runs[0].text).toMatch(/^1\./);
  });
});

describe('born-accessible HTML export (the moat, doc §6)', () => {
  const mkDoc = () => {
    const d = ST.stCreateDoc('letter-portrait', 'Export & Test', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', fill: '#dbeafe', decorative: true, frame: { x: 0, y: 0, w: 816, h: 200 }, z: 1 } }, 'user', T0);
    addText(d, 'Big "Title" <1>', 'heading1');
    addImage(d, 'data:image/png;base64,x', 'A student\'s diagram');
    addText(d, 'Body paragraph', 'body');
    return d;
  };
  it('DOM order equals the object array order — reading order is authored, never inferred', () => {
    const html = ST.stExportHtml(mkDoc(), { lang: 'en' });
    const iShape = html.indexOf('aria-hidden="true"');
    const iH1 = html.indexOf('<h1');
    const iImg = html.indexOf('<img');
    const iP = html.indexOf('<p');
    expect(iShape).toBeGreaterThan(-1);
    expect(iShape).toBeLessThan(iH1);
    expect(iH1).toBeLessThan(iImg);
    expect(iImg).toBeLessThan(iP);
  });
  it('text is text: real h1/p tags, escaped content, no rasterization', () => {
    const html = ST.stExportHtml(mkDoc(), { lang: 'en' });
    expect(html).toContain('<h1');
    expect(html).toContain('Big &quot;Title&quot; &lt;1&gt;');
    expect(html).toContain('<p');
  });
  it('content images carry alt; decorative images get alt="" + role="presentation"', () => {
    const d = mkDoc();
    ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: 'data:image/png;base64,z', alt: '', decorative: true, frame: { x: 0, y: 0, w: 40, h: 40 }, z: 2 } }, 'user', T0);
    const html = ST.stExportHtml(d, { lang: 'en' });
    expect(html).toContain('alt="A student\'s diagram"');
    expect(html).toContain('alt="" role="presentation"');
  });
  it('honors image fit mode in accessible HTML export', () => {
    const d = mkDoc();
    ST.stAppend(d, { type: 'object.update', target: 'o3', patch: { fit: 'contain' } }, 'user', T0);
    const html = ST.stExportHtml(d, { lang: 'en' });
    expect(html).toContain('object-fit:contain');
  });
  it('empty-src image frames emit nothing; export has no scripts and sets lang', () => {
    const d = mkDoc();
    ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: '', alt: '', decorative: false, frame: { x: 0, y: 0, w: 40, h: 40 }, z: 2 } }, 'user', T0);
    const html = ST.stExportHtml(d, { lang: 'en' });
    expect((html.match(/<img/g) || []).length).toBe(1);
    expect(html).not.toContain('<script');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Export &amp; Test</title>');
  });
  it('bounds exported style values from malformed saves before they become CSS', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Unsafe style', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'script', frame: { x: Number.NaN, y: 0, w: 200, h: 40 }, z: 1, runs: [{ text: 'Safe text', style: { size: Infinity, color: 'red";position:fixed', align: 'evil' } }] } }, 'user', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'diamond', fill: 'url(javascript:bad)', frame: { x: 0, y: 50, w: 80, h: 80 }, z: 1 } }, 'user', T0);
    const html = ST.stExportHtml(d, { lang: 'en" onclick="bad' });
    expect(html).toContain('<html lang="en&quot; onclick=&quot;bad">');
    expect(html).toContain('<p ');
    expect(html).toContain('font-size:16px');
    expect(html).toContain('color:#111827');
    expect(html).toContain('text-align:left');
    expect(html).toContain('background:#e2e8f0');
    expect(html).not.toContain('javascript');
    expect(html).not.toContain('position:fixed');
  });
});

describe('honesty line (scientific-integrity rule — pinned verbatim)', () => {
  it('states editor-scope truth and explicitly disclaims AI detection', () => {
    expect(ST.ST_HONESTY_LINE).toBe('This timeline shows what happened inside this editor. It does not detect AI content in imported images.');
  });
});
