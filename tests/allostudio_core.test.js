// AlloStudio Milestone A (2026-07-02) — pure-core coverage for the event-sourced
// scene: ledger append/undo/redo, checkpointed replay, the closed actor set, the
// alt-text export gate, template integrity, and the born-accessible HTML export
// (DOM order = reading order; real text; alt/decorative enforced). Design doc:
// docs/studio_design.md v0.2.
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
  it('ships exactly flyer, worksheet, poster, blank — all valid, all ledger-seeded', () => {
    const tpls = ST.stTemplates();
    expect(tpls.map(t => t.key)).toEqual(['flyer', 'worksheet', 'poster', 'blank']);
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
  it('empty-src image frames emit nothing; export has no scripts and sets lang', () => {
    const d = mkDoc();
    ST.stAppend(d, { type: 'object.add', object: { type: 'image', src: '', alt: '', decorative: false, frame: { x: 0, y: 0, w: 40, h: 40 }, z: 2 } }, 'user', T0);
    const html = ST.stExportHtml(d, { lang: 'en' });
    expect((html.match(/<img/g) || []).length).toBe(1);
    expect(html).not.toContain('<script');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Export &amp; Test</title>');
  });
});

describe('honesty line (scientific-integrity rule — pinned verbatim)', () => {
  it('states editor-scope truth and explicitly disclaims AI detection', () => {
    expect(ST.ST_HONESTY_LINE).toBe('This timeline shows what happened inside this editor. It does not detect AI content in imported images.');
  });
});
