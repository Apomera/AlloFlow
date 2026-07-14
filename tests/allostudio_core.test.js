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
  it('rejects scene-history drift, unsafe image URLs, and broken sequences', () => {
    const drift = ST.stCreateDoc('letter-portrait', 'Drift', T0);
    addText(drift, 'Recorded text');
    drift.objects[0].runs[0].text = 'Canvas-only text';
    expect(ST.stValidateDoc(drift)).toContain('Current scene does not match the process history');

    const remote = ST.stCreateDoc('letter-portrait', 'Remote', T0);
    ST.stAppend(remote, { type: 'object.add', object: { type: 'image', src: 'https://example.com/track.png?student=123', alt: 'Remote', decorative: false, frame: { x: 0, y: 0, w: 100, h: 80 }, z: 1 } }, 'import', T0);
    expect(ST.stValidateDoc(remote).some(e => /unsafe or oversized image source/i.test(e))).toBe(true);
    expect(ST.stExportHtml(remote, { lang: 'en' })).not.toContain('example.com');

    const sequence = ST.stCreateDoc('letter-portrait', 'Sequence', T0);
    addText(sequence, 'Step');
    sequence.ledger.ops[0].seq = 2;
    expect(ST.stValidateDoc(sequence).some(e => /non-contiguous sequence/i.test(e))).toBe(true);

    expect(ST.stIsSafeDataImage('data:image/png;base64,abc')).toBe(true);
    expect(ST.stIsSafeDataImage('data:image/svg+xml;base64,abc')).toBe(false);
    expect(ST.stIsSafeDataImage('https://example.com/x.png')).toBe(false);
  });
  it('canonicalizes valid loaded documents from ledger truth and rebuilds caches', () => {
    const d = ST.stCreateDoc('square', 'Canonical', T0);
    addText(d, 'Truth');
    d._redo = [{ type: 'object.remove', target: 'o1' }];
    const canonical = ST.stCanonicalizeDoc(d);
    expect(canonical._redo).toEqual([]);
    expect(canonical.objects[0].runs[0].text).toBe('Truth');
    expect(ST.stValidateDoc(canonical)).toEqual([]);
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
  it('undoes and redoes a multi-object gesture atomically', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Gesture', T0);
    addText(d, 'A');
    const second = addText(d, 'B');
    ST.stAppend(d, { type: 'object.move', target: second.object.id, x: 40, y: 10 }, 'user', T0 + 1);
    const before = d.objects.map(o => o.frame.x);
    const patches = ST.stMoveFramesAsGroup(d.objects, ['o1', 'o2'], 100, 0, d.canvas)
      .map(p => ({ type: 'object.update', target: p.id, patch: { frame: p.frame } }));
    const applied = ST.stAppendGesture(d, patches, 'user', T0 + 2, { label: 'Move objects' });
    expect(new Set(applied.map(op => op.gesture.id)).size).toBe(1);
    expect(d.objects.map(o => o.frame.x)).toEqual(before.map(x => x + 100));

    expect(ST.stUndo(d)).toBe(true);
    expect(d.objects.map(o => o.frame.x)).toEqual(before);
    expect(ST.stRedo(d)).toBe(true);
    expect(d.objects.map(o => o.frame.x)).toEqual(before.map(x => x + 100));
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
    expect(ST.stDescribeOp({ type: 'object.update', patch: { src: 'data:x', _crop: true } })).toBe('Cropped an image');
  });
  it('groups repeated process steps for a calmer timeline', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Grouped process', T0);
    const text = addText(d, 'Move me').object.id;
    ST.stAppend(d, { type: 'object.move', target: text, x: 20, y: 20 }, 'user', T0 + 1);
    ST.stAppend(d, { type: 'object.move', target: text, x: 30, y: 30 }, 'user', T0 + 2);
    ST.stAppend(d, { type: 'object.resize', target: text, w: 220, h: 50 }, 'user', T0 + 3);
    const groups = ST.stProcessStepGroups(d.ledger.ops);
    expect(groups.map(g => [g.label, g.count])).toEqual([
      ['Added text', 1],
      ['Moved an object', 2],
      ['Resized an object', 1]
    ]);
    expect(groups[1].text).toBe('Moved an object x2');
    expect(groups[1].startSeq).toBe(2);
    expect(groups[1].endSeq).toBe(3);
    expect(ST.stFilteredProcessStepGroups(d.ledger.ops, 'user').length).toBe(groups.length);
    expect(ST.stFilteredProcessStepGroups(d.ledger.ops, 'ai')).toEqual([]);
    expect(ST.stFilteredProcessStepGroups(d.ledger.ops, 'all').length).toBe(groups.length);
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
    const checklist = ST.stBuildAccessibilityChecklist(result);
    expect(checklist.find(c => c.key === 'alt').status).toBe('fix');
    expect(checklist.find(c => c.key === 'contrast').status).toBe('review');
    expect(checklist.find(c => c.key === 'objects').count).toBeGreaterThanOrEqual(1);
    const quickFix = ST.stBuildA11yAutoFixPlan(d);
    expect(quickFix.ops.length).toBeGreaterThanOrEqual(1);
    quickFix.ops.forEach(op => ST.stAppend(d, op, 'user', T0));
    const afterTypes = ST.stAnalyzeDoc(d).issues.map(issue => issue.type);
    expect(afterTypes).not.toContain('small-text');
    expect(afterTypes).not.toContain('contrast');
  });
  it('summarizes object-level accessibility issues for canvas and list badges', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Badges', T0);
    const image = ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: 'data:image/png;base64,x', alt: '', decorative: false, frame: { x: 5, y: 5, w: 100, h: 80 }, z: 1 } }, 'import', T0).object.id;
    const text = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 20, y: 20, w: 200, h: 24 }, z: 2, runs: [{ text: 'tiny pale', style: { size: 10, color: '#fefefe' } }] } }, 'user', T0).object.id;
    const summary = ST.stObjectIssueSummary(ST.stAnalyzeDoc(d));
    expect(summary[image].severity).toBe('error');
    expect(summary[image].label).toBe('Fix');
    expect(summary[text].count).toBeGreaterThanOrEqual(2);
    expect(summary[text].severity).toBe('warning');
    expect(summary.nope).toBeUndefined();
  });
  it('builds selected-object accessibility actions for the right panel', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Panel actions', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', fill: '#ffffff', decorative: true, frame: { x: 0, y: 0, w: 816, h: 1056 }, z: 1 } }, 'user', T0);
    const text = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 20, y: 20, w: 200, h: 24 }, z: 2, runs: [{ text: 'tiny pale', style: { size: 10, color: '#fefefe' } }] } }, 'user', T0).object.id;
    const image = addImage(d, 'data:image/png;base64,x', '').object.id;
    const textActions = ST.stObjectReadyActions(d, text);
    expect(textActions.map(a => a.type)).toEqual(expect.arrayContaining(['fix-small-text', 'fix-contrast']));
    expect(textActions.every(a => a.targetId === text)).toBe(true);
    expect(textActions.find(a => a.type === 'fix-contrast').suggestedColor).toMatch(/^#/);
    const imageActions = ST.stObjectReadyActions(d, image);
    expect(imageActions.map(a => a.type)).toEqual(['add-alt', 'mark-decorative']);
    expect(imageActions.find(a => a.type === 'mark-decorative')).toMatchObject({ targetId: image, issueType: 'alt', severity: 'error' });
    expect(ST.stObjectReadyActions(d, 'missing')).toEqual([]);
  });
  it('offers replace, remove, and keep actions for empty image frames', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Empty image actions', T0);
    const image = addImage(d, '', '').object.id;
    expect(ST.stAnalyzeDoc(d).issues.map(i => i.type)).toContain('empty-image');
    expect(ST.stImageFrameState(d.objects[0]).key).toBe('empty-placeholder');
    expect(ST.stBuildReadyActions(d).actions.map(a => a.type)).toContain('replace-image');
    expect(ST.stObjectReadyActions(d, image).map(a => a.type)).toEqual(['replace-image', 'remove-placeholder', 'keep-placeholder']);

    const keepPatch = ST.stKeepPlaceholderPatch(d.objects[0]);
    expect(keepPatch).toMatchObject({ decorative: true, provenance: { origin: 'upload', placeholder: 'keep' } });
    ST.stAppend(d, { type: 'object.update', target: image, patch: keepPatch }, 'user', T0 + 1);
    expect(ST.stIsKeptPlaceholder(d.objects[0])).toBe(true);
    expect(ST.stImageFrameState(d.objects[0]).key).toBe('kept-placeholder');
    expect(ST.stAnalyzeDoc(d).issues.map(i => i.type)).not.toContain('empty-image');
    expect(ST.stDescribeOp({ type: 'object.update', patch: keepPatch })).toBe('Kept image placeholder');

    const replacePatch = ST.stUploadedImagePatch(d.objects[0], 'data:image/png;base64,x');
    expect(replacePatch).toMatchObject({ src: 'data:image/png;base64,x', decorative: false, provenance: { origin: 'upload' } });
    ST.stAppend(d, { type: 'object.update', target: image, patch: replacePatch }, 'import', T0 + 2);
    expect(ST.stImageFrameState(d.objects[0]).key).toBe('needs-alt');
    expect(ST.stAnalyzeDoc(d).issues.map(i => i.type)).toContain('alt');
  });
  it('builds guided preflight and export confidence summaries', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Guided review', T0);
    const image = addImage(d, 'data:image/png;base64,x', '').object.id;
    const smallText = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 20, y: 120, w: 200, h: 24 }, z: 2, runs: [{ text: 'tiny note', style: { size: 10, color: '#111827' } }] } }, 'user', T0 + 1).object.id;
    const guide = ST.stPreflightGuide(d, 99);
    expect(guide.total).toBeGreaterThan(0);
    expect(guide.position).toBeGreaterThanOrEqual(1);
    expect(guide.actions.map(a => a.type)).toContain('add-alt');
    expect(guide.actions.map(a => a.type)).toContain('mark-decorative');
    expect(guide.issue.id).toBe(image);
    const warningGuide = ST.stPreflightGuide(d, 0, 'warning');
    expect(warningGuide.total).toBe(1);
    expect(warningGuide.issue.id).toBe(smallText);
    expect(warningGuide.actions.map(a => a.type)).toContain('fix-small-text');
    expect(ST.stPreflightGuide(d, 99, 'fix').issue.id).toBe(image);
    const analysis = ST.stAnalyzeDoc(d);
    expect(ST.stIssueIndexForObject(analysis, image)).toBe(0);
    expect(ST.stIssueIndexForObject(analysis, image, 'fix')).toBe(0);
    expect(ST.stIssueIndexForObject(analysis, smallText, 'warning')).toBe(0);
    expect(ST.stIssueIndexForObject(analysis, smallText, 'fix')).toBe(-1);
    expect(ST.stIssueIndexForObject(analysis, 'missing')).toBe(-1);
    expect(ST.stFilterPreflightIssues(analysis, 'fix').map(i => i.type)).toEqual(['alt']);
    expect(ST.stFilterPreflightIssues(analysis, 'warning').map(i => i.type)).toContain('small-text');
    expect(ST.stFilterPreflightIssues(analysis, 'review').map(i => i.type)).toContain('reading-order');
    expect(ST.stFilterPreflightIssues(analysis, 'all').length).toBe(analysis.issues.length);
    const fixReady = ST.stBuildReadyActions(d, 'fix');
    expect(fixReady.filter).toBe('fix');
    expect(fixReady.counts).toEqual({ error: 1, warning: 0, review: 0 });
    expect(fixReady.totalCounts).toEqual(analysis.counts);
    expect(fixReady.actions.map(a => a.type)).toEqual(['add-alt', 'mark-decorative']);
    const warningReady = ST.stBuildReadyActions(d, 'warning');
    expect(warningReady.counts.error).toBe(0);
    expect(warningReady.actions.map(a => a.type)).toContain('fix-small-text');
    const reviewReady = ST.stBuildReadyActions(d, 'review');
    expect(reviewReady.counts.error).toBe(0);
    expect(reviewReady.actions.map(a => a.type)).toContain('review-reading-order');

    const blocked = ST.stExportConfidence(d);
    expect(blocked.status).toBe('blocked');
    expect(blocked.altCount).toBe(1);
    expect(blocked.cards.find(c => c.key === 'tagged-pdf').status).toBe('blocked');
    expect(blocked.cards.find(c => c.key === 'visual').status).toBe('blocked');

    ST.stAppend(d, { type: 'object.update', target: image, patch: { alt: 'Small diagram' } }, 'user', T0 + 2);
    const afterAlt = ST.stAnalyzeDoc(d);
    expect(ST.stNextPreflightGuideIndex(analysis, afterAlt, 0, { targetId: image, issueType: 'alt' })).toBe(0);
    expect(ST.stNextPreflightGuideIndex(analysis, afterAlt, 0, { targetId: image, issueType: 'alt' }, 'fix')).toBe(0);
    expect(ST.stFilterPreflightIssues(afterAlt, 'fix')).toEqual([]);
    expect(afterAlt.issues[0].type).not.toBe('alt');

    const unchanged = ST.stNextPreflightGuideIndex(afterAlt, afterAlt, 0, { targetId: afterAlt.issues[0].id, issueType: afterAlt.issues[0].type });
    expect(unchanged).toBe(0);

    const empty = ST.stCreateDoc('letter-portrait', 'Frame flow', T0);
    const frame = addImage(empty, '', '').object.id;
    const beforeFrame = ST.stAnalyzeDoc(empty);
    ST.stAppend(empty, { type: 'object.update', target: frame, patch: ST.stUploadedImagePatch(empty.objects[0], 'data:image/png;base64,x') }, 'import', T0 + 1);
    const afterFrame = ST.stAnalyzeDoc(empty);
    expect(ST.stNextPreflightGuideIndex(beforeFrame, afterFrame, 0, { targetId: frame, issueType: 'empty-image' })).toBe(0);
    expect(afterFrame.issues[0].type).toBe('alt');

    const w = ST.stCreateDoc('letter-portrait', 'Worksheet confidence', T0);
    addText(w, 'Lab Reflection', 'heading1');
    addText(w, '1. What did you notice?', 'heading2');
    const worksheet = ST.stExportConfidence(w).cards.find(c => c.key === 'worksheet');
    expect(worksheet.status).toBe('ready');
    expect(worksheet.message).toContain('1 structured question');
  });
  it('builds optimize-image actions for large embedded images without changing alt or fit', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Large image', T0);
    const largeSrc = 'data:image/png;base64,' + 'A'.repeat(1500001);
    const image = ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: largeSrc, alt: 'Detailed diagram', decorative: false, fit: 'contain', frame: { x: 5, y: 5, w: 100, h: 80 }, z: 1, provenance: { origin: 'upload' } } }, 'import', T0).object.id;
    const actions = ST.stObjectReadyActions(d, image);
    const optimize = actions.find(a => a.type === 'optimize-image');
    expect(ST.stAnalyzeDoc(d).issues.map(i => i.type)).toContain('large-image');
    expect(optimize).toMatchObject({ targetId: image, issueType: 'large-image', optimizeMaxDim: 1200 });
    expect(optimize.imageWeight.large).toBe(true);
    expect(optimize.imageWeight.approxKb).toBeGreaterThan(1000);

    const patch = ST.stOptimizedImagePatch(d.objects[0], 'data:image/png;base64,SMALL', optimize.imageWeight, ST.stImageWeightInfo('data:image/png;base64,SMALL'));
    expect(Object.keys(patch).sort()).toEqual(['provenance', 'src']);
    expect(patch.provenance).toMatchObject({ origin: 'optimized', prior: 'upload' });
    expect(patch.alt).toBeUndefined();
    expect(patch.fit).toBeUndefined();
    expect(ST.stDescribeOp({ type: 'object.update', patch })).toBe('Optimized an image');
  });
  it('offers a direct fit-on-page action for malformed off-page objects', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Bounds action', T0);
    const shape = ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', fill: '#dbeafe', decorative: true, frame: { x: 40, y: 40, w: 120, h: 80 }, z: 1 } }, 'user', T0).object.id;
    d.objects[0].frame = { x: -60, y: 1200, w: 120, h: 80 };
    const action = ST.stObjectReadyActions(d, shape).find(a => a.type === 'fix-bounds');
    expect(action).toMatchObject({ targetId: shape, issueType: 'bounds', suggestedFrame: { x: 0, y: 976, w: 120, h: 80, rotation: 0 } });
    expect(ST.stBuildReadyActions(d).actions.map(a => a.type)).toContain('fix-bounds');
  });
  it('suggests visual reading order without mutating the authored order', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Order assist', T0);
    const bottom = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 40, y: 220, w: 220, h: 40 }, z: 1, runs: [{ text: 'Bottom paragraph', style: { size: 16 } }] } }, 'user', T0).object.id;
    const topLeft = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'heading1', frame: { x: 40, y: 30, w: 260, h: 52 }, z: 1, runs: [{ text: 'Top title', style: { size: 34 } }] } }, 'user', T0).object.id;
    const topRight = ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: 'data:image/png;base64,x', alt: 'Top diagram', decorative: false, frame: { x: 360, y: 34, w: 160, h: 90 }, z: 1 } }, 'import', T0).object.id;
    const suggestion = ST.stReadingOrderSuggestion(d);
    expect(suggestion.currentIds).toEqual([bottom, topLeft, topRight]);
    expect(suggestion.suggestedIds).toEqual([topLeft, topRight, bottom]);
    expect(suggestion.changed).toBe(true);
    expect(suggestion.changes.map(c => c.id)).toEqual([topLeft, topRight, bottom]);
    expect(d.objects.map(o => o.id)).toEqual([bottom, topLeft, topRight]);
  });
  it('passes reading order when authored order already follows visual flow', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Order aligned', T0);
    const top = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'heading1', frame: { x: 40, y: 30, w: 260, h: 52 }, z: 1, runs: [{ text: 'Top title', style: { size: 34 } }] } }, 'user', T0).object.id;
    const body = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 40, y: 120, w: 320, h: 42 }, z: 1, runs: [{ text: 'Body paragraph', style: { size: 16 } }] } }, 'user', T0).object.id;
    const suggestion = ST.stReadingOrderSuggestion(d);
    expect(suggestion.suggestedIds).toEqual([top, body]);
    expect(suggestion.changed).toBe(false);
    expect(suggestion.changes).toEqual([]);
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
  it('requires human contrast review whenever text overlaps an image', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Image contrast', T0);
    addImage(d, 'data:image/png;base64,BLACK', 'Dark image');
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 20, y: 20, w: 200, h: 40 }, z: 2, runs: [{ text: 'Text over image', style: { size: 16, color: '#000000' } }] } }, 'user', T0 + 1);
    const analysis = ST.stAnalyzeDoc(d);
    expect(analysis.issues.some(i => i.type === 'image-contrast' && i.severity === 'review')).toBe(true);
    expect(ST.stBuildAccessibilityChecklist(analysis).find(c => c.key === 'contrast').status).toBe('review');
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
  it('worksheet bridge emits a linear, semantic worksheet document (ol/li + answer regions)', () => {
    const ws = ST.stTemplates().find(t => t.key === 'worksheet').make(T0);
    const html = ST.stExportWorksheetHtml(ws, { lang: 'en' });
    expect(html).toMatch(/<h1>Worksheet title<\/h1>/);
    expect(html).toContain('<ol class="st-ws-questions">');
    // one <li> per numbered question (the worksheet template ships 3)
    expect((html.match(/<li>/g) || []).length).toBe(3);
    // each question gets a labeled answer region for accessible tagged output
    expect((html.match(/aria-label="Answer space"/g) || []).length).toBe(3);
    // prompts are stripped of their leading number (that came from the H2 role)
    expect(html).toContain('<p class="st-ws-prompt">Question 1</p>');
    expect(html).not.toMatch(/<p class="st-ws-prompt">1\. /);
    expect(html).toMatch(/^<!DOCTYPE html>/);
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
  it('builds ready-to-share actions with safe fix affordances', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Ready', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', fill: '#ffffff', decorative: true, frame: { x: 0, y: 0, w: 816, h: 1056 }, z: 1 } }, 'user', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 20, y: 20, w: 200, h: 24 }, z: 2, runs: [{ text: 'tiny pale text', style: { size: 10, color: '#fefefe' } }] } }, 'user', T0);
    addImage(d, 'data:image/png;base64,x', '');
    const ready = ST.stBuildReadyActions(d);
    expect(ready.status).toBe('blocked');
    expect(ready.actions.map(a => a.type)).toEqual(expect.arrayContaining(['add-alt', 'fix-small-text', 'fix-contrast']));
    const contrast = ready.actions.find(a => a.type === 'fix-contrast');
    expect(contrast.suggestedColor).toMatch(/^#/);
  });
});

describe('resource shelf + portfolio continuity helpers', () => {
  it('normalizes mixed resource history into insertable cues', () => {
    const history = [
      { id: 'g1', type: 'glossary', title: 'Water cycle terms', data: [{ term: 'Evaporation', definition: 'Liquid water becomes vapor.' }] },
      { id: 'q1', type: 'quiz', title: 'Check', data: { questions: [{ question: 'Why does condensation happen?' }] } },
      { id: 'i1', type: 'image', title: 'Cloud diagram', data: { src: 'data:image/png;base64,abc', alt: 'Cloud diagram' } },
      { id: 'bad', type: 'image', title: 'Remote image', data: { src: 'https://example.com/x.png' } }
    ];
    const cues = ST.stBuildResourceCues(history, { limit: 10 });
    expect(cues.map(c => c.kind)).toEqual(expect.arrayContaining(['glossary', 'question', 'image']));
    expect(cues.find(c => c.label === 'Cloud diagram').imageSrc).toMatch(/^data:image/);
    expect(cues.find(c => c.label === 'Remote image').imageSrc).toBe('');
  });
  it('turns a resource cue into editable Studio objects with import provenance', () => {
    const objects = ST.stObjectsFromResourceCue({
      id: 'term-1',
      kind: 'glossary',
      label: 'Habitat',
      text: 'The place where a living thing gets what it needs.',
      imageSrc: 'data:image/png;base64,abc',
      sourceTitle: 'Science pack'
    }, { canvas: ST.ST_CANVAS_PRESETS['letter-portrait'], x: 40, y: 50, w: 500 });
    expect(objects.map(o => o.type)).toEqual(expect.arrayContaining(['shape', 'text', 'image']));
    expect(objects.every(o => o.provenance && o.provenance.origin === 'resource-history')).toBe(true);
    expect(objects.find(o => o.type === 'image').alt).toBe('Habitat');
    expect(objects.some(o => o.type === 'text' && /Definition/.test(o.runs[0].text))).toBe(true);
  });
  it('turns question cues into a prompt card with an answer space', () => {
    const objects = ST.stObjectsFromResourceCue({
      id: 'q-1',
      kind: 'question',
      label: 'Question 1',
      text: 'Why does condensation happen?',
      sourceTitle: 'Science pack'
    }, { canvas: ST.ST_CANVAS_PRESETS['letter-portrait'], x: 40, y: 50, w: 500 });
    expect(objects.some(o => o.type === 'text' && /Why does condensation/.test(o.runs[0].text))).toBe(true);
    expect(objects.some(o => o.type === 'text' && /Answer space/.test(o.runs[0].text))).toBe(true);
    expect(objects.some(o => o.type === 'shape' && o.fill === '#ffffff')).toBe(true);
    expect(objects.every(o => o.provenance && o.provenance.resourceId === 'q-1')).toBe(true);
  });
  it('turns image cues into a visual card with caption text', () => {
    const objects = ST.stObjectsFromResourceCue({
      id: 'img-1',
      kind: 'image',
      label: 'Cloud diagram',
      text: 'Clouds form as vapor cools.',
      imageSrc: 'data:image/png;base64,abc',
      sourceTitle: 'Science pack'
    }, { canvas: ST.ST_CANVAS_PRESETS['letter-portrait'], x: 40, y: 50, w: 520 });
    expect(objects.find(o => o.type === 'image').alt).toBe('Cloud diagram');
    expect(objects.some(o => o.type === 'text' && /Clouds form/.test(o.runs[0].text))).toBe(true);
    expect(objects.every(o => o.provenance && o.provenance.origin === 'resource-history')).toBe(true);
  });
  it('builds a compact AlloStudio portfolio artifact without embedding image bytes', () => {
    const d = ST.stTemplates().find(t => t.key === 'worksheet').make(T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: 'data:image/png;base64,ORIGINAL', alt: 'Diagram', decorative: false, frame: { x: 0, y: 0, w: 100, h: 80 }, z: 5 } }, 'import', T0);
    const artifact = ST.stBuildPortfolioArtifact(d, { now: '2026-07-03T12:00:00.000Z' });
    expect(artifact.sourceLabel).toBe('AlloStudio');
    expect(artifact.kindLabel).toBe('Accessible Worksheet');
    expect(artifact.lifecycleStatus).toBe('review');
    expect(artifact.items.some(item => /Question 1/.test(item.text))).toBe(true);
    expect(JSON.stringify(artifact)).not.toMatch(/ORIGINAL/);
  });
  it('summarizes recent projects without copying the full document', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Recent One', T0);
    addText(d, 'hello');
    const summary = ST.stRecentProjectSummary(d, '2026-07-03T12:00:00.000Z');
    expect(summary.id).toContain('recent-one');
    expect(summary.objectCount).toBe(1);
    expect(summary.updatedAt).toBe('2026-07-03T12:00:00.000Z');
    expect(summary).not.toHaveProperty('doc');
  });
});

describe('Studio visual ergonomics helpers', () => {
  it('builds a style-kit patch for page, text, and shapes without touching images', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Style Kit', T0);
    const heading = addText(d, 'Water Cycle', 'heading1').object.id;
    const body = addText(d, 'Evaporation and condensation.', 'body').object.id;
    const shape = ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', fill: '#ffffff', frame: { x: 20, y: 80, w: 160, h: 80 }, z: 2 } }, 'user', T0).object.id;
    const image = addImage(d, 'data:image/png;base64,x', 'Diagram').object.id;
    const plan = ST.stStyleKitPatch(d, 'calm');
    expect(plan.canvasFill).toBe('#f8fafc');
    expect(plan.patches.find(p => p.id === heading).patch.runs[0].style.color).toBe('#0f766e');
    expect(plan.patches.find(p => p.id === body).patch.runs[0].style.color).toBe('#134e4a');
    expect(plan.patches.find(p => p.id === shape).patch.fill).toBe('#ccfbf1');
    expect(plan.patches.some(p => p.id === image)).toBe(false);
  });
  it('computes selection bounds and group alignment patches', () => {
    const objects = [
      { id: 'a', frame: { x: 10, y: 20, w: 100, h: 40 } },
      { id: 'b', frame: { x: 180, y: 80, w: 60, h: 30 } }
    ];
    expect(ST.stSelectionBounds(objects, ['a', 'b'])).toEqual({ x: 10, y: 20, w: 230, h: 90 });
    const right = ST.stAlignFramesAsGroup(objects, ['a', 'b'], 'right');
    expect(right.find(p => p.id === 'a').frame.x).toBe(140);
    expect(right.find(p => p.id === 'b').frame.x).toBe(180);
    const middle = ST.stAlignFramesAsGroup(objects, ['a', 'b'], 'vcenter');
    expect(middle.find(p => p.id === 'a').frame.y).toBe(45);
    expect(middle.find(p => p.id === 'b').frame.y).toBe(50);
  });
  it('distributes three selected frames along either axis', () => {
    const objects = [
      { id: 'a', frame: { x: 0, y: 0, w: 50, h: 20 } },
      { id: 'b', frame: { x: 80, y: 40, w: 50, h: 20 } },
      { id: 'c', frame: { x: 200, y: 100, w: 50, h: 20 } }
    ];
    const horizontal = ST.stDistributeFramesAsGroup(objects, ['a', 'b', 'c'], 'x');
    expect(horizontal.map(p => Math.round(p.frame.x))).toEqual([0, 100, 200]);
    const vertical = ST.stDistributeFramesAsGroup(objects, ['a', 'b', 'c'], 'y');
    expect(vertical.map(p => Math.round(p.frame.y))).toEqual([0, 50, 100]);
    expect(ST.stDistributeFramesAsGroup(objects, ['a', 'b'], 'x')).toEqual([]);
  });
  it('moves selected frames as a group and clamps them to the canvas', () => {
    const canvas = { w: 220, h: 120 };
    const objects = [
      { id: 'a', frame: { x: 0, y: 0, w: 50, h: 20 } },
      { id: 'b', frame: { x: 190, y: 100, w: 50, h: 30 } }
    ];
    const moved = ST.stMoveFramesAsGroup(objects, ['a', 'b'], 20, 10, canvas);
    expect(moved.find(p => p.id === 'a').frame).toEqual({ x: 20, y: 10, w: 50, h: 20, rotation: 0 });
    expect(moved.find(p => p.id === 'b').frame).toEqual({ x: 170, y: 90, w: 50, h: 30, rotation: 0 });
  });
  it('sorts object navigator layers by visual stack while preserving reading positions', () => {
    const objects = [
      { id: 'a', type: 'shape', shape: 'rect', z: 1, frame: { x: 0, y: 0, w: 20, h: 20 } },
      { id: 'b', type: 'text', role: 'body', z: 5, frame: { x: 0, y: 0, w: 20, h: 20 }, runs: [{ text: 'Body', style: {} }] },
      { id: 'c', type: 'image', z: 5, frame: { x: 0, y: 0, w: 20, h: 20 }, alt: 'Diagram' }
    ];
    const layers = ST.stLayerItems(objects);
    expect(layers.map(item => item.id)).toEqual(['c', 'b', 'a']);
    expect(layers.find(item => item.id === 'b').readingIndex).toBe(2);
  });
  it('snaps dragged frames to margins, centers, and nearby object edges', () => {
    const canvas = { w: 500, h: 400 };
    const margin = ST.stSnapFrame({ x: 45, y: 47, w: 100, h: 60 }, canvas, [], { threshold: 8 });
    expect(margin.frame.x).toBe(48);
    expect(margin.frame.y).toBe(48);
    expect(margin.guides.map(g => g.label)).toEqual(expect.arrayContaining(['left margin', 'top margin']));
    const objectSnap = ST.stSnapFrame({ x: 196, y: 150, w: 50, h: 50 }, canvas, [
      { id: 'other', frame: { x: 200, y: 20, w: 80, h: 40 } }
    ], { threshold: 8 });
    expect(objectSnap.frame.x).toBe(200);
    expect(objectSnap.guides.some(g => g.label === 'object left')).toBe(true);
  });
  it('switches AlloStudio chrome from desktop columns to compact stacked layouts', () => {
    const desktop = ST.stStudioLayout(1280, 900);
    expect(desktop.mode).toBe('desktop');
    expect(desktop.stacked).toBe(false);
    expect(desktop.panelWidth).toBe('215px');
    const tablet = ST.stStudioLayout(900, 760);
    expect(tablet.mode).toBe('stacked');
    expect(tablet.stacked).toBe(true);
    expect(tablet.panelWidth).toBe('auto');
    expect(tablet.canvasScale).toBeLessThan(desktop.canvasScale);
    const phone = ST.stStudioLayout(390, 740);
    expect(phone.mode).toBe('phone');
    expect(phone.shellWidth).toBe('100vw');
    expect(phone.shellRadius).toBe(0);
    expect(phone.headerWrap).toBe('wrap');
  });
  it('computes fit scale and bounded canvas zoom steps', () => {
    const canvas = { w: 816, h: 1056 };
    const desktop = ST.stStudioLayout(1280, 900);
    expect(ST.stCanvasFitScale(canvas, desktop, { w: 1280, h: 900 })).toBe(0.62);
    const phone = ST.stStudioLayout(390, 740);
    const fit = ST.stCanvasFitScale(canvas, phone, { w: 390, h: 740 });
    expect(fit).toBeGreaterThanOrEqual(0.34);
    expect(fit).toBeLessThan(0.62);
    expect(ST.stAdjustCanvasZoom(null, 'fit', fit)).toBeNull();
    expect(ST.stAdjustCanvasZoom(null, 'actual', fit)).toBe(1);
    expect(ST.stAdjustCanvasZoom(null, 'in', 0.42)).toBe(0.52);
    expect(ST.stAdjustCanvasZoom(1.48, 'in', fit)).toBe(1.5);
    expect(ST.stAdjustCanvasZoom(0.27, 'out', fit)).toBe(0.25);
  });
  it('builds AI edit scopes without sending raw image pixels', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Agent scope', T0);
    const textOp = addText(d, 'Explain photosynthesis', 'body');
    const imageOp = addImage(d, 'data:image/png;base64,SECRETPIXELS', 'leaf diagram');
    const scope = ST.stBuildAgentScope(d, 'selection', [textOp.object.id, imageOp.object.id]);
    expect(scope.scope).toBe('selection');
    expect(scope.selectedIds).toEqual([textOp.object.id, imageOp.object.id]);
    const image = scope.objects.find(o => o.type === 'image');
    expect(image.hasImage).toBe(true);
    expect(image.alt).toBe('leaf diagram');
    expect(image.src).toBeUndefined();
  });
  it('normalizes AI edit plans to safe in-scope document ops', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Agent plan', T0);
    const a = addText(d, 'Original', 'body').object.id;
    const b = addText(d, 'Outside', 'body').object.id;
    const img = addImage(d, 'data:image/png;base64,SECRETPIXELS', '').object.id;
    const plan = {
      summary: 'Tighten language and describe the image',
      ops: [
        { type: 'object.update', target: a, patch: { text: 'Clearer wording', style: { size: 18, color: '#111827', bold: true, align: 'center' }, frame: { x: 20, y: 20, w: 260, h: 80 } } },
        { type: 'object.update', target: b, patch: { text: 'Should be skipped' } },
        { type: 'object.update', target: img, patch: { src: 'data:image/png;base64,NEWPIXELS', alt: 'Leaf diagram', decorative: false, fit: 'contain' } },
        { type: 'canvas.background', fill: '#000000' },
        { type: 'object.remove', target: a }
      ]
    };
    const normalized = ST.stNormalizeAgentPlan(plan, d, { scope: 'selection', ids: [a, img] });
    // in-scope object.remove is now a supported (reviewable) op — 3 ops survive
    expect(normalized.ops).toHaveLength(3);
    expect(normalized.ops[0].patch.runs[0].text).toBe('Clearer wording');
    expect(normalized.ops[0].patch.frame).toEqual({ x: 20, y: 20, w: 260, h: 80, rotation: 0 });
    expect(normalized.ops[1].patch).toEqual({ alt: 'Leaf diagram', decorative: false, fit: 'contain' });
    expect(normalized.ops[2]).toEqual({ type: 'object.remove', target: a });
    expect(JSON.stringify(normalized.ops)).not.toContain('NEWPIXELS');
    expect(normalized.rejected.length).toBeGreaterThanOrEqual(2);
    const textChange = ST.stDescribeAgentChange(normalized.ops[0], d, 0);
    expect(textChange.notes).toContain('Text changed');
    expect(textChange.before).toBe('Original');
    expect(textChange.after).toBe('Clearer wording');
    const imageChange = ST.stDescribeAgentChange(normalized.ops[1], d, 1);
    expect(imageChange.safety).toBe('No image pixels changed');
    expect(JSON.stringify(imageChange)).not.toContain('SECRETPIXELS');
  });
  it('keeps UI status tones above WCAG AA text contrast', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      for (const tone of ['error', 'warning', 'success', 'review']) {
        const colors = ST.stUiStatusTone(theme, tone);
        expect(ST.stContrastRatio(colors.fg, colors.bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it('supports keyboard-accessible crop presets and adjustments', () => {
    expect(ST.stCropPresetRect('top')).toEqual({ x: 0, y: 0, w: 1, h: 0.5 });
    const nudged = ST.stAdjustCropRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }, 'right', 0.1);
    expect(nudged).toEqual({ x: 0.2, y: 0.1, w: 0.8, h: 0.8 });
    const wider = ST.stAdjustCropRect({ x: 0.02, y: 0.2, w: 0.95, h: 0.4 }, 'wider', 0.2);
    expect(wider.x).toBe(0);
    expect(wider.w).toBe(1);
    const tiny = ST.stAdjustCropRect({ x: 0.4, y: 0.4, w: 0.06, h: 0.06 }, 'shorter', 0.2);
    expect(tiny.h).toBeGreaterThanOrEqual(0.05);
  });
});

describe('in-editor crop (math + privacy: removed pixels do not persist)', () => {
  it('stCropBox maps normalized rects to clamped integer pixel boxes', () => {
    expect(ST.stCropBox(1000, 800, { x: 0.1, y: 0.2, w: 0.5, h: 0.5 })).toEqual({ sx: 100, sy: 160, sw: 500, sh: 400 });
    // clamps a selection that runs past the right/bottom edge
    expect(ST.stCropBox(1000, 800, { x: 0.8, y: 0.5, w: 0.9, h: 0.9 })).toEqual({ sx: 800, sy: 400, sw: 200, sh: 400 });
    // degenerate selection floors to 1px each side
    const tiny = ST.stCropBox(500, 500, { x: 0, y: 0, w: 0, h: 0 });
    expect([tiny.sw, tiny.sh]).toEqual([1, 1]);
  });
  it('stScrubObjectSrc purges the pre-crop src from ops, checkpoints, AND the live scene', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Crop', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: 'data:image/png;base64,ORIGINAL', alt: 'a', decorative: false, frame: { x: 0, y: 0, w: 100, h: 80 }, z: 5, fit: 'cover' } }, 'import', T0);
    ST.stAppend(d, { type: 'object.update', target: 'o1', patch: { src: 'data:image/png;base64,ORIGINAL2' } }, 'import', T0); // a src-replace op too
    for (let i = 0; i < 48; i++) addText(d, 't' + i); // seq 50 → a checkpoint snapshots the image
    expect(d.ledger.checkpoints.length).toBe(1);
    ST.stScrubObjectSrc(d, 'o1', 'data:image/png;base64,CROPPED');
    expect(d.objects.find(o => o.id === 'o1').src).toBe('data:image/png;base64,CROPPED');
    const dump = JSON.stringify(d);
    expect(dump).not.toMatch(/ORIGINAL/);   // no pre-crop pixels anywhere the file is saved
    expect(dump).toContain('CROPPED');
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
    expect(tpls.map(t => t.key)).toEqual(['flyer', 'worksheet', 'poster', 'exitTicket', 'vocabPoster', 'labSafety', 'checklist', 'newsletter', 'bookReport', 'cerOrganizer', 'compareContrast', 'visualSchedule', 'socialStory', 'anchorChart', 'choiceBoard', 'vocabMat', 'rubric', 'labSheet', 'reflectionPage', 'onePageExplainer', 'blank']);
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
  it('expanded classroom starters are text-first and ready for accessible export', () => {
    const expanded = ['visualSchedule', 'socialStory', 'anchorChart', 'choiceBoard', 'vocabMat', 'rubric', 'labSheet', 'reflectionPage', 'onePageExplainer'];
    const byKey = new Map(ST.stTemplates().map(t => [t.key, t]));
    for (const key of expanded) {
      const d = byKey.get(key).make(T0);
      expect(d.ledger.ops[0]).toMatchObject({ type: 'doc.template', template: key });
      expect(d.objects.some(o => o.type === 'text' && o.role === 'heading1')).toBe(true);
      expect(d.objects.length).toBeGreaterThan(6);
      expect(d.objects.filter(o => o.type === 'image')).toHaveLength(0);
      expect(ST.stAltGate(d.objects)).toEqual([]);
      expect(ST.stExportHtml(d, { lang: 'en' })).toMatch(/^<!DOCTYPE html>/);
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

// ── Agentic batch (2026-07-05): extended op vocabulary, hostile-plan goldens,
// plan batching/undo, preflight delta, and the brand style kit. The normalizer
// is the trust boundary between model output and the ledger — every field the
// model can emit must come out clamped, sanitized, or rejected. ──
describe('agent plan: extended op vocabulary', () => {
  const seed = () => {
    const d = ST.stCreateDoc('letter-portrait', 'Agentic', T0);
    const a = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'heading1', frame: { x: 10, y: 10, w: 300, h: 60 }, z: 10, runs: [{ text: 'Title', style: { size: 40 } }] } }, 'user', T0).object.id;
    const b = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 10, y: 90, w: 300, h: 40 }, z: 10, runs: [{ text: 'Body', style: { size: 16 } }] } }, 'user', T0).object.id;
    return { d, a, b };
  };

  it('accepts sanitized object.add for text and shapes, never images', () => {
    const { d } = seed();
    const plan = { ops: [
      { type: 'object.add', object: { type: 'text', role: 'heading9', text: 'New section', style: { size: 9999, color: 'red;position:fixed', bold: 1, align: 'evil' }, frame: { x: -500, y: 99999, w: 4000, h: 4000 } } },
      { type: 'object.add', object: { type: 'shape', shape: 'hexagon', fill: 'url(javascript:x)', frame: { x: 0, y: 0, w: 50, h: 50 } } },
      { type: 'object.add', object: { type: 'image', src: 'data:image/png;base64,EVIL', alt: 'x', frame: { x: 0, y: 0, w: 50, h: 50 } } }
    ] };
    const n = ST.stNormalizeAgentPlan(plan, d, { scope: 'document' });
    expect(n.ops).toHaveLength(2);
    const txt = n.ops[0].object;
    expect(txt.type).toBe('text');
    expect(txt.runs[0].text).toBe('New section');
    expect(txt.runs[0].style.size).toBeLessThanOrEqual(120);
    expect(txt.runs[0].style.color).toBe('#111827'); // junk color -> fallback
    expect(txt.runs[0].style.bold).toBe(true);
    expect(txt.frame.w).toBeLessThanOrEqual(d.canvas.w);
    expect(txt.frame.x).toBeGreaterThanOrEqual(0);
    expect(txt.id).toBeUndefined(); // ids are minted by stAppend, never by the model
    const shp = n.ops[1].object;
    expect(['rect', 'ellipse']).toContain(shp.shape);
    expect(shp.fill).toBe('#dbeafe'); // junk fill -> fallback
    expect(n.rejected.length).toBe(1); // the image add
    expect(JSON.stringify(n.ops)).not.toContain('EVIL');
  });

  it('normalizes image.request (prompt cleaned + frame clamped) and drops empty ones', () => {
    const { d } = seed();
    const n = ST.stNormalizeAgentPlan({ ops: [
      { type: 'image.request', prompt: '  a  friendly\n\nwater droplet  ', frame: { x: -50, y: -50, w: 9000, h: 9000 } },
      { type: 'image.request', prompt: '   ' }
    ] }, d, { scope: 'document' });
    expect(n.ops).toHaveLength(1);
    expect(n.ops[0].prompt).toBe('a friendly water droplet');
    expect(n.ops[0].frame.w).toBeLessThanOrEqual(d.canvas.w);
    expect(n.rejected).toHaveLength(1);
  });

  it('caps new objects per plan at 12', () => {
    const { d } = seed();
    const adds = Array.from({ length: 20 }, (_, i) => ({ type: 'object.add', object: { type: 'text', role: 'body', text: 'T' + i, frame: { x: 10, y: 10, w: 100, h: 30 } } }));
    const n = ST.stNormalizeAgentPlan({ ops: adds }, d, { scope: 'document' });
    expect(n.ops).toHaveLength(12);
    expect(n.rejected.length).toBe(8);
  });

  it('object.reorder: in-scope + finite toIndex required, index clamped', () => {
    const { d, a, b } = seed();
    const n = ST.stNormalizeAgentPlan({ ops: [
      { type: 'object.reorder', target: a, toIndex: 999 },
      { type: 'object.reorder', target: b },
      { type: 'object.reorder', target: 'ghost', toIndex: 0 }
    ] }, d, { scope: 'document' });
    expect(n.ops).toHaveLength(1);
    expect(n.ops[0]).toEqual({ type: 'object.reorder', target: a, toIndex: d.objects.length - 1 });
    expect(n.rejected).toHaveLength(2);
  });

  it('doc.retitle sanitized and blocked in selection scope', () => {
    const { d, a } = seed();
    const doc = ST.stNormalizeAgentPlan({ ops: [{ type: 'doc.retitle', title: '  New\nTitle  ' }] }, d, { scope: 'document' });
    expect(doc.ops).toEqual([{ type: 'doc.retitle', title: 'New Title' }]);
    const sel = ST.stNormalizeAgentPlan({ ops: [{ type: 'doc.retitle', title: 'Nope' }] }, d, { scope: 'selection', ids: [a] });
    expect(sel.ops).toHaveLength(0);
    expect(sel.rejected).toHaveLength(1);
  });

  it('PROPERTY: a normalized hostile plan applied as actor ai keeps the doc valid + replayable', () => {
    const { d, a, b } = seed();
    const hostile = { ops: [
      { type: 'object.add', object: { type: 'text', role: 'x', text: 'ok', frame: { x: 1e9, y: -1e9, w: 0, h: Number.NaN } } },
      { type: 'object.add', object: { type: 'shape', shape: 'blob', fill: '#12345', frame: {} } },
      { type: 'object.update', target: a, patch: { frame: { x: Number.NaN, y: Infinity, w: -5, h: 1e9 }, text: 'edited', style: { size: -3, color: 'expression(alert(1))' } } },
      { type: 'object.reorder', target: b, toIndex: -99 },
      { type: 'object.remove', target: a },
      { type: 'doc.retitle', title: 'Very long title padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding' },
      { type: 'canvas.background', fill: 'red;inject' }
    ] };
    const n = ST.stNormalizeAgentPlan(hostile, d, { scope: 'document' });
    expect(n.ops.length).toBeGreaterThan(0);
    n.ops.forEach(op => { const body = JSON.parse(JSON.stringify(op)); body.agent = { batch: 'pTEST', prompt: 'hostile' }; ST.stAppend(d, body, 'ai', T0 + 1000); });
    expect(ST.stValidateDoc(d)).toEqual([]);
    const lastSeq = d.ledger.ops[d.ledger.ops.length - 1].seq;
    const replayed = ST.stReplay(d, lastSeq);
    expect(replayed.objects).toEqual(d.objects); // replay invariant survives agent ops
  });
});

describe('agent batch provenance + one-gesture undo', () => {
  it('stLastAgentBatch finds the tail batch and carries the prompt; stUndoAgentBatch reverts it', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Batch', T0);
    const a = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 10, y: 10, w: 200, h: 40 }, z: 1, runs: [{ text: 'Keep', style: {} }] } }, 'user', T0).object.id;
    const objectsBefore = JSON.parse(JSON.stringify(d.objects));
    ST.stAppend(d, { type: 'object.update', target: a, patch: { role: 'heading1' }, agent: { batch: 'p1', prompt: 'make it a heading' } }, 'ai', T0 + 1);
    ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', frame: { x: 0, y: 0, w: 40, h: 40 }, z: 1, fill: '#eeeeee', decorative: true }, agent: { batch: 'p1' } }, 'ai', T0 + 2);
    const info = ST.stLastAgentBatch(d);
    expect(info).toEqual({ batch: 'p1', count: 2, prompt: 'make it a heading' });
    expect(ST.stDescribeOp(d.ledger.ops[1])).toContain('AI request: "make it a heading"');
    const undone = ST.stUndoAgentBatch(d);
    expect(undone).toBe(2);
    expect(d.objects).toEqual(objectsBefore);
    expect(ST.stLastAgentBatch(d)).toBeNull();
  });

  it('a manual op after the batch breaks the tail (no accidental undo of user work)', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Tail', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 10, y: 10, w: 200, h: 40 }, z: 1, runs: [{ text: 'x', style: {} }] }, agent: { batch: 'p2', prompt: 'add' } }, 'ai', T0);
    ST.stAppend(d, { type: 'doc.retitle', title: 'User rename' }, 'user', T0 + 1);
    expect(ST.stLastAgentBatch(d)).toBeNull();
    expect(ST.stUndoAgentBatch(d)).toBe(0);
    expect(d.title).toBe('User rename');
  });
});

describe('preflight delta (post-apply verification)', () => {
  it('errors outrank totals; direction reflects the change honestly', () => {
    expect(ST.stPreflightDelta({ error: 2, warning: 1, review: 0 }, { error: 0, warning: 1, review: 0 }).direction).toBe('better');
    expect(ST.stPreflightDelta({ error: 0, warning: 1, review: 0 }, { error: 1, warning: 0, review: 0 }).direction).toBe('worse');
    expect(ST.stPreflightDelta({ error: 1, warning: 0, review: 3 }, { error: 1, warning: 0, review: 1 }).direction).toBe('better');
    expect(ST.stPreflightDelta({ error: 0, warning: 2, review: 0 }, { error: 0, warning: 2, review: 0 }).direction).toBe('same');
    expect(ST.stPreflightDelta(null, null).direction).toBe('same');
    expect(ST.stPreflightDelta({ error: 1, warning: 1, review: 1 }, { error: 0, warning: 0, review: 0 }).text).toContain('3 -> 0');
  });
});

describe('brand style kit (BrandProfile reuse)', () => {
  it('maps a valid profile to a kit and re-checks hex defensively', () => {
    const kit = ST.stBrandStyleKit({ name: 'King Middle', colors: { heading: '#123456', accent: '#2563eb', body: '#222222', bg: '#fafafa', cardBg: '#eeeeee' } });
    expect(kit).toEqual({ key: 'brand', name: 'King Middle', background: '#fafafa', heading: '#123456', body: '#222222', shape: '#eeeeee', bodyFont: null, headingFont: null });
    const hostile = ST.stBrandStyleKit({ name: 'X', colors: { heading: 'red;inject', bg: 'url(x)', body: '#12', cardBg: '#abc' } });
    expect(hostile.heading).toBe('#1e3a5f');
    expect(hostile.background).toBe('#ffffff');
    expect(hostile.body).toBe('#1f2937');
    expect(hostile.shape).toBe('#abc');
  });
  it('returns null without a usable profile, and stStyleKits prepends the brand kit only when present', () => {
    expect(ST.stBrandStyleKit(null)).toBeNull();
    expect(ST.stBrandStyleKit({ name: 'No colors' })).toBeNull();
    expect(ST.stStyleKits().map(k => k.key)).toEqual(['print', 'calm', 'bold', 'contrast']);
    const withBrand = ST.stStyleKits({ name: 'B', colors: { heading: '#111111' } });
    expect(withBrand[0].key).toBe('brand');
    expect(withBrand).toHaveLength(5);
  });
});

describe('agent change descriptions for the new op kinds', () => {
  it('describes add / image.request / remove / reorder / retitle for the review panel', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Describe', T0);
    const a = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'heading1', frame: { x: 10, y: 10, w: 300, h: 60 }, z: 10, runs: [{ text: 'Hello', style: {} }] } }, 'user', T0).object.id;
    const add = ST.stDescribeAgentChange({ type: 'object.add', object: { type: 'text', role: 'body', runs: [{ text: 'Fresh text', style: {} }], frame: { x: 0, y: 0, w: 100, h: 30 } } }, d, 0);
    expect(add.title).toContain('Add text');
    expect(add.after).toBe('Fresh text');
    const img = ST.stDescribeAgentChange({ type: 'image.request', prompt: 'a leaf', frame: { x: 0, y: 0, w: 100, h: 80 } }, d, 1);
    expect(img.title).toBe('Generate image');
    expect(img.safety).toContain('Alt text');
    const rem = ST.stDescribeAgentChange({ type: 'object.remove', target: a }, d, 2);
    expect(rem.title).toContain('Remove');
    expect(rem.before).toBe('Hello');
    const ord = ST.stDescribeAgentChange({ type: 'object.reorder', target: a, toIndex: 0 }, d, 3);
    expect(ord.kind).toBe('Reading order');
    expect(ord.before).toBe('Position 1');
    const ret = ST.stDescribeAgentChange({ type: 'doc.retitle', title: 'Better title' }, d, 4);
    expect(ret.before).toBe('Describe');
    expect(ret.after).toBe('Better title');
  });
});

// ── Polish batch (2026-07-05 #2): fonts, import downscale, plan preview,
// visual print CSS, autosave. Font-family is interpolated into export CSS, so
// stSafeFontFamily is a security boundary, not a convenience. ──
describe('font stacks (curated keys + charset-allowlisted brand fonts)', () => {
  it('resolves keys, sanitizes raw strings, and falls back safely', () => {
    expect(ST.stSafeFontFamily('serif')).toBe(ST.ST_FONT_STACKS.serif);
    expect(ST.stSafeFontFamily(null)).toBe(ST.ST_FONT_STACKS.system);
    expect(ST.stSafeFontFamily('')).toBe(ST.ST_FONT_STACKS.system);
    // hostile raw string: declarations/urls cannot survive the allowlist
    const hostile = ST.stSafeFontFamily("Arial'; position:fixed; background:url(javascript:x); font-family:'x");
    expect(hostile).not.toContain(';');
    expect(hostile).not.toContain(':');
    expect(hostile).not.toContain('(');
    // benign brand string passes through
    expect(ST.stSafeFontFamily("'Inter', system-ui, sans-serif")).toBe("'Inter', system-ui, sans-serif");
  });
  it('export HTML uses the sanitized font and never leaks hostile CSS', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Fonts', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 10, y: 10, w: 300, h: 40 }, z: 1, runs: [{ text: 'Styled', style: { size: 16, font: "Evil\"; </style><script>x</script>; url(x)" } }] } }, 'user', T0);
    const html = ST.stExportHtml(d, { lang: 'en' });
    expect(html).toContain('font-family:');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('url(');
    const d2 = ST.stCreateDoc('letter-portrait', 'Fonts2', T0);
    ST.stAppend(d2, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 10, y: 10, w: 300, h: 40 }, z: 1, runs: [{ text: 'Mono', style: { size: 16, font: ST.ST_FONT_STACKS.mono } }] } }, 'user', T0);
    expect(ST.stExportHtml(d2, { lang: 'en' })).toContain("font-family:'Consolas', 'Courier New', monospace");
  });
  it('brand kit carries sanitized fonts and the style-kit patch applies them (stock kits leave fonts alone)', () => {
    const profile = { name: 'B', colors: { heading: '#111111', body: '#222222', bg: '#ffffff', cardBg: '#eeeeee' }, fonts: { body: "'Inter', system-ui, sans-serif", heading: "Georgia, serif" } };
    const kit = ST.stBrandStyleKit(profile);
    expect(kit.bodyFont).toBe("'Inter', system-ui, sans-serif");
    expect(kit.headingFont).toBe('Georgia, serif');
    const d = ST.stCreateDoc('letter-portrait', 'KitFonts', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'heading1', frame: { x: 10, y: 10, w: 300, h: 60 }, z: 10, runs: [{ text: 'H', style: {} }] } }, 'user', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 10, y: 90, w: 300, h: 40 }, z: 10, runs: [{ text: 'B', style: {} }] } }, 'user', T0);
    const brandPlan = ST.stStyleKitPatch(d, 'brand', profile);
    expect(brandPlan.patches[0].patch.runs[0].style.font).toBe('Georgia, serif');
    expect(brandPlan.patches[1].patch.runs[0].style.font).toBe("'Inter', system-ui, sans-serif");
    const stockPlan = ST.stStyleKitPatch(d, 'print', profile);
    expect(stockPlan.patches[0].patch.runs[0].style.font).toBeUndefined();
  });
  it('agent plans may pick font KEYS only — raw stacks from the model are ignored', () => {
    const d = ST.stCreateDoc('letter-portrait', 'AgentFont', T0);
    const a = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 10, y: 10, w: 300, h: 40 }, z: 1, runs: [{ text: 'x', style: { size: 16 } }] } }, 'user', T0).object.id;
    const keyed = ST.stNormalizeAgentPlan({ ops: [{ type: 'object.update', target: a, patch: { style: { font: 'serif' } } }] }, d, { scope: 'document' });
    expect(keyed.ops[0].patch.runs[0].style.font).toBe(ST.ST_FONT_STACKS.serif);
    const raw = ST.stNormalizeAgentPlan({ ops: [{ type: 'object.update', target: a, patch: { style: { font: 'evil; position:fixed' } } }] }, d, { scope: 'document' });
    expect(raw.ops[0].patch.runs[0].style.font).toBeUndefined();
  });
});

describe('import downscale math', () => {
  it('returns null when already small enough, proportional dims otherwise', () => {
    expect(ST.stDownscaleDims(800, 600, 1600)).toBeNull();
    expect(ST.stDownscaleDims(3200, 2400, 1600)).toEqual({ w: 1600, h: 1200 });
    expect(ST.stDownscaleDims(1000, 4000, 1600)).toEqual({ w: 400, h: 1600 });
    expect(ST.stDownscaleDims(0, 100, 1600)).toBeNull();
    expect(ST.stDownscaleDims(Number.NaN, 100, 1600)).toBeNull();
  });
});

describe('plan preview scene (detached apply)', () => {
  it('applies selected ops without touching the document; image.request skipped', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Preview', T0);
    const a = ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 10, y: 10, w: 300, h: 40 }, z: 1, runs: [{ text: 'Old', style: {} }] } }, 'user', T0).object.id;
    const opsBefore = d.ledger.ops.length;
    const preview = ST.stPreviewScene(d, [
      { type: 'object.update', target: a, patch: { runs: [{ text: 'New', style: { size: 16, color: '#111827', bold: false, align: 'left' } }] } },
      { type: 'object.add', object: { type: 'shape', shape: 'rect', frame: { x: 0, y: 0, w: 50, h: 50 }, z: 1, fill: '#eeeeee', decorative: true } },
      { type: 'image.request', prompt: 'a leaf', frame: { x: 0, y: 0, w: 100, h: 100 } }
    ]);
    expect(preview.objects).toHaveLength(2); // update + added shape; image.request skipped
    expect(preview.objects[0].runs[0].text).toBe('New');
    expect(preview.objects[1].id).toMatch(/^preview/);
    // the real document is untouched
    expect(d.objects).toHaveLength(1);
    expect(d.objects[0].runs[0].text).toBe('Old');
    expect(d.ledger.ops).toHaveLength(opsBefore);
  });
});

describe('visual print CSS', () => {
  it('sizes the @page to the canvas in inches with zero margin', () => {
    const css = ST.stPrintCss({ w: 816, h: 1056 });
    expect(css).toContain('@page { size: 8.5in 11in; margin: 0; }');
    expect(css).toContain('.st-page');
    const square = ST.stPrintCss({ w: 960, h: 960 });
    expect(square).toContain('size: 10in 10in');
    expect(ST.stPrintCss(null)).toContain('size: 8.5in 11in');
  });
});

describe('autosave (crash recovery)', () => {
  it('write -> read round-trips a valid doc; clear removes it', () => {
    ST.stClearAutosave();
    const d = ST.stCreateDoc('letter-portrait', 'Recover me', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'text', role: 'body', frame: { x: 10, y: 10, w: 200, h: 40 }, z: 1, runs: [{ text: 'work', style: {} }] } }, 'user', T0);
    expect(ST.stWriteAutosave(d, T0 + 5000).ok).toBe(true);
    const saved = ST.stReadAutosave();
    expect(saved.title).toBe('Recover me');
    expect(saved.savedAt).toBe(T0 + 5000);
    expect(ST.stValidateDoc(saved.doc)).toEqual([]);
    expect(saved.doc.objects[0].runs[0].text).toBe('work');
    ST.stClearAutosave();
    expect(ST.stReadAutosave()).toBeNull();
  });
  it('durable saves strip redo history so undone image bytes do not persist', () => {
    ST.stClearAutosave();
    localStorage.removeItem('allostudio_recent_projects');
    const d = ST.stCreateDoc('letter-portrait', 'Private crop', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: 'data:image/png;base64,SECRET_ORIGINAL', alt: 'private image', decorative: false, frame: { x: 10, y: 10, w: 100, h: 80 }, z: 1 } }, 'import', T0);
    ST.stUndo(d);
    expect(JSON.stringify(d)).toContain('SECRET_ORIGINAL');

    const durable = ST.stDurableDoc(d);
    expect(durable._redo).toBeUndefined();
    expect(JSON.stringify(durable)).not.toContain('SECRET_ORIGINAL');

    const payload = ST.stAutosavePayload(d, T0 + 5000);
    expect(payload.doc._redo).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('SECRET_ORIGINAL');

    const recent = ST.stSaveRecentProject(d, { now: T0 + 6000 });
    expect(recent.entry.doc._redo).toBeUndefined();
    expect(JSON.stringify(recent.entry)).not.toContain('SECRET_ORIGINAL');
  });
  it('refuses to restore garbage payloads', () => {
    expect(ST.stAutosaveValid(null)).toBe(false);
    expect(ST.stAutosaveValid({ v: 1, doc: { format: 'notallostudio' } })).toBe(false);
    expect(ST.stAutosaveValid({ v: 2, doc: ST.stCreateDoc('square', 'x', T0) })).toBe(false);
    expect(ST.stAutosaveValid(ST.stAutosavePayload(ST.stCreateDoc('square', 'x', T0), T0))).toBe(true);
  });
});

describe('AlloStudio keyboard shortcut reference (stShortcutList)', () => {
  it('returns a non-empty list with unique ids, keys, and labels', () => {
    const list = ST.stShortcutList();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(12);
    const ids = list.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    list.forEach((s) => {
      expect(typeof s.id).toBe('string');
      expect(s.id.length).toBeGreaterThan(0);
      expect(typeof s.keys).toBe('string');
      expect(s.keys.length).toBeGreaterThan(0);
      expect(typeof s.label).toBe('string');
      expect(s.label.length).toBeGreaterThan(0);
      expect(typeof s.mod).toBe('boolean');
    });
  });
  it('documents the core editing shortcuts that the handler binds', () => {
    const byId = {};
    ST.stShortcutList().forEach((s) => { byId[s.id] = s; });
    ['undo', 'redo', 'duplicate', 'selectAll', 'save', 'forward', 'backward', 'zoomFit', 'help'].forEach((id) => {
      expect(byId[id]).toBeTruthy();
    });
    expect(byId.duplicate.mod).toBe(true);
    expect(byId.help.mod).toBe(false);
    expect(byId.help.keys).toBe('?');
  });
});

describe('AlloStudio color swatch palette (stSwatchPalette / stHexNorm)', () => {
  it('normalizes hex colors and rejects junk', () => {
    expect(ST.stHexNorm('#ABCDEF')).toBe('#abcdef');
    expect(ST.stHexNorm('#f00')).toBe('#ff0000');
    expect(ST.stHexNorm('  #FfFfFf ')).toBe('#ffffff');
    expect(ST.stHexNorm('red')).toBe(null);
    expect(ST.stHexNorm('rgb(1,2,3)')).toBe(null);
    expect(ST.stHexNorm(null)).toBe(null);
  });
  it('gathers standard swatches and the colors actually used in the design, de-duplicated', () => {
    const doc = ST.stCreateDoc('letter-portrait', 'Palette test', 1);
    doc.objects = [
      { id: 'a', type: 'text', frame: { x: 0, y: 0, w: 100, h: 40 }, z: 1, runs: [{ text: 'hi', style: { color: '#123ABC' } }] },
      { id: 'b', type: 'shape', shape: 'rect', frame: { x: 0, y: 0, w: 50, h: 50 }, z: 2, fill: '#123abc' },
      { id: 'c', type: 'shape', shape: 'rect', frame: { x: 0, y: 0, w: 50, h: 50 }, z: 3, fill: '#00ff00' }
    ];
    doc.canvas.background = { fill: '#ffffff' };
    const pal = ST.stSwatchPalette(doc, null);
    expect(Array.isArray(pal.standard)).toBe(true);
    expect(pal.standard.length).toBeGreaterThan(6);
    // document colors: the two distinct doc colors that are NOT already standard
    expect(pal.document).toContain('#123abc');   // text + shape share this once
    expect(pal.document.filter((c) => c === '#123abc').length).toBe(1);
    // #00ff00 and #ffffff are not in the standard set, so they surface as doc colors
    expect(pal.document).toContain('#00ff00');
    // no color appears in more than one group
    const all = pal.brand.concat(pal.standard, pal.document);
    expect(new Set(all).size).toBe(all.length);
  });
  it('puts active brand-profile colors in the brand group ahead of everything', () => {
    const doc = ST.stCreateDoc('square', 'Brand', 1);
    const profile = { name: 'Test School', colors: { bg: '#fffdf5', heading: '#7a1f2b', body: '#22303f', cardBg: '#f1e9d2' } };
    const pal = ST.stSwatchPalette(doc, profile);
    expect(pal.brand).toContain('#7a1f2b');
    expect(pal.brand).toContain('#22303f');
    expect(pal.brand.length).toBeGreaterThanOrEqual(3);
  });
});
