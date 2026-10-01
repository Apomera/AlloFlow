// AlloStudio golden contracts.
//
// WHY: allostudio_core.test.js proves individual helpers work, but Studio also
// needs a small golden net around the permanent products it emits: saved/replayed
// documents, accessible HTML, worksheet HTML, process notes, portfolio cards, and
// AI/accessibility proposal summaries. These are digest goldens plus structural
// assertions, so intentional changes are reviewable without snapshotting a huge
// UI tree. Re-baseline deliberately with:
//   npx vitest run tests/allostudio_golden.test.js -u

import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';
import { loadAlloModule } from './setup.js';

let ST;
const T0 = 1751477000000;
const NOW = '2026-07-03T12:00:00.000Z';
const PNG = 'data:image/png;base64,STUDIOGOLDENPIXELS';

beforeAll(() => {
  loadAlloModule('studio_module.js');
  ST = window.AlloModules.AlloStudio;
  if (!ST) throw new Error('AlloStudio failed to register');
});

function hash(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, 16);
}

function count(text, re) {
  return (String(text).match(re) || []).length;
}

function htmlDigest(html) {
  return {
    length: html.length,
    sha: hash(html),
    h1: count(html, /<h1/g),
    h2: count(html, /<h2/g),
    paragraphs: count(html, /<p/g),
    images: count(html, /<img/g),
    hidden: count(html, /aria-hidden="true"/g),
    answerSpaces: count(html, /aria-label="Answer space"/g),
    absoluteItems: count(html, /position:absolute/g)
  };
}

function text(role, value, frame, style = {}) {
  return {
    type: 'text',
    role,
    frame,
    z: style.z || 10,
    runs: [{
      text: value,
      style: {
        size: style.size || (role === 'heading1' ? 36 : role === 'heading2' ? 22 : 16),
        color: style.color || '#111827',
        bold: style.bold !== undefined ? style.bold : role !== 'body',
        align: style.align || 'left'
      }
    }]
  };
}

function shape(kind, frame, fill, z = 1) {
  return { type: 'shape', shape: kind, frame, z, fill, decorative: true };
}

function image(frame) {
  return {
    type: 'image',
    src: PNG,
    alt: 'Chloroplast diagram',
    decorative: false,
    frame,
    z: 5,
    fit: 'contain',
    provenance: { origin: 'upload' }
  };
}

function add(doc, object, actor = 'user', ts = T0) {
  return ST.stAppend(doc, { type: 'object.add', object }, actor, ts).object.id;
}

function makeGoldenDoc() {
  const d = ST.stCreateDoc('letter-portrait', 'Photosynthesis Checkpoint', T0);
  ST.stAppend(d, { type: 'doc.template', template: 'allostudio-golden' }, 'user', T0);
  add(d, shape('rect', { x: 0, y: 0, w: 816, h: 156 }, '#dcfce7', 1), 'user', T0 + 1000);
  add(d, text('heading1', 'Photosynthesis Checkpoint', { x: 48, y: 44, w: 720, h: 64 }, { size: 34, align: 'center' }), 'user', T0 + 2000);
  add(d, text('body', 'Instructions: answer the question using evidence from the diagram.', { x: 64, y: 132, w: 688, h: 56 }, { size: 16 }), 'user', T0 + 3000);
  add(d, text('heading2', '1. Why does light matter?', { x: 64, y: 224, w: 460, h: 42 }, { size: 22 }), 'user', T0 + 4000);
  add(d, shape('rect', { x: 64, y: 292, w: 460, h: 144 }, '#f8fafc', 2), 'user', T0 + 5000);
  const supportId = add(d, text('body', 'Use the diagram and mention energy.', { x: 64, y: 454, w: 460, h: 56 }, { size: 15, color: '#1f2937' }), 'user', T0 + 6000);
  add(d, image({ x: 560, y: 226, w: 192, h: 192 }), 'import', T0 + 7000);
  ST.stAppend(d, {
    type: 'object.update',
    target: supportId,
    patch: { runs: [{ text: 'Use the diagram and mention how light energy becomes stored energy.', style: { size: 16, color: '#0f172a', bold: false, align: 'left' } }] }
  }, 'ai', T0 + 60000);
  return d;
}

function compactDoc(doc) {
  return {
    title: doc.title,
    canvas: doc.canvas,
    objects: doc.objects.map((o) => ({
      id: o.id,
      type: o.type,
      role: o.role || '',
      shape: o.shape || '',
      frame: o.frame,
      fill: o.fill || '',
      alt: o.alt || '',
      decorative: !!o.decorative,
      text: o.runs && o.runs[0] ? o.runs[0].text : ''
    })),
    ops: doc.ledger.ops.map((op) => ({ seq: op.seq, actor: op.actor, type: op.type, target: op.target || '', template: op.template || '' }))
  };
}

function compactArtifact(artifact) {
  return {
    id: artifact.id,
    type: artifact.type,
    kindLabel: artifact.kindLabel,
    title: artifact.title,
    lifecycleStatus: artifact.lifecycleStatus,
    itemCount: artifact.itemCount,
    items: artifact.items.map((item) => ({ id: item.id, title: item.title, privacy: item.privacy, text: item.text }))
  };
}

describe('AlloStudio golden exports', () => {
  it('pins the saved-document replay shape', () => {
    const doc = makeGoldenDoc();
    const replayed = ST.stReplay(doc, doc.ledger.ops.length);
    expect(compactDoc({ ...doc, title: replayed.title, canvas: replayed.canvas, objects: replayed.objects })).toMatchSnapshot();
  });

  it('pins the pixel-faithful accessible HTML export contract', () => {
    const html = ST.stExportHtml(makeGoldenDoc(), { lang: 'en' });
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<main class="st-page">');
    expect(html).toContain('alt="Chloroplast diagram"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/<script/i);
    expect(htmlDigest(html)).toMatchSnapshot();
  });

  it('pins the linear worksheet bridge export contract', () => {
    const html = ST.stExportWorksheetHtml(makeGoldenDoc(), { lang: 'en' });
    expect(html).toContain('<ol class="st-ws-questions">');
    expect(html).toContain('<p class="st-ws-prompt">Why does light matter?</p>');
    expect(html).toContain('aria-label="Answer space"');
    expect(html).not.toContain('position:absolute');
    expect(htmlDigest(html)).toMatchSnapshot();
  });

  it('pins process notes and portfolio summary products without image bytes', () => {
    const doc = makeGoldenDoc();
    const process = ST.stExportProcessMarkdown(doc, 'student');
    const artifact = ST.stBuildPortfolioArtifact(doc, { now: NOW });
    expect(process).toContain('## My Process');
    expect(process).toContain('AI actions: 1');
    expect(JSON.stringify(artifact)).not.toContain('STUDIOGOLDENPIXELS');
    expect({
      processDigest: { length: process.length, sha: hash(process), aiMentions: count(process, /AI/g) },
      artifact: compactArtifact(artifact)
    }).toMatchSnapshot();
  });
});

describe('AlloStudio golden readiness summaries', () => {
  it('pins accessibility checklist and AI edit proposal summaries', () => {
    const doc = makeGoldenDoc();
    const analysis = ST.stAnalyzeDoc(doc);
    const checklist = ST.stBuildAccessibilityChecklist(analysis).map((c) => ({
      key: c.key,
      status: c.status,
      severity: c.severity,
      count: c.count
    }));
    const textId = doc.objects.find((o) => o.type === 'text' && o.role === 'body').id;
    const imageId = doc.objects.find((o) => o.type === 'image').id;
    const plan = ST.stNormalizeAgentPlan({
      summary: 'Improve clarity and describe the visual',
      ops: [
        { type: 'object.update', target: textId, patch: { text: 'Instructions: explain the role of light energy in one complete sentence.', style: { size: 17, color: '#111827' } } },
        { type: 'object.update', target: imageId, patch: { alt: 'Diagram of a chloroplast used in photosynthesis.', src: 'data:image/png;base64,SHOULD_NOT_SURVIVE' } },
        { type: 'object.remove', target: textId }
      ]
    }, doc, { scope: 'document' });
    expect(JSON.stringify(plan)).not.toContain('SHOULD_NOT_SURVIVE');
    expect({
      checklist,
      proposal: {
        summary: plan.summary,
        ops: plan.ops,
        rejected: plan.rejected,
        changes: plan.ops.map((op, idx) => ST.stDescribeAgentChange(op, doc, idx))
      }
    }).toMatchSnapshot();
  });
});
