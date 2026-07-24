// Described-view layer (2026-07-21): the AI describes the current 3-D Mol* view
// aloud for a learner who cannot see the WebGL canvas. This is the prototype of
// the "accessibility adapter" thesis — the wrapper can't fix Mol*'s internals,
// but it can capture the view and route it through the vision model.
//
// The pure prompt builder is exercised for real via eval-slice; the two-window
// bridge wiring (shelf HTML ↔ STEM opener) is pinned.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const opener = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_moleculeshelf.js'), 'utf8');
const shelf = readFileSync(resolve(process.cwd(), 'molecule_shelf/molecule_shelf.html'), 'utf8');

// ── eval-slice the REAL describe-prompt builder ──────────────────────────────
const start = opener.indexOf('function buildDescribePrompt(');
const end = opener.indexOf('window.StemLab.registerTool', start);
if (start < 0 || end < 0) throw new Error('buildDescribePrompt slice anchors missed');
const buildDescribePrompt = new Function(opener.slice(start, end) + '\nreturn buildDescribePrompt;')();

describe('buildDescribePrompt: accessible, grounded, view-specific', () => {
  it('frames the task as describing to someone who cannot see, grounded in the molecule', () => {
    const p = buildDescribePrompt('Hemoglobin', '4HHB', 'carries oxygen', null, true);
    expect(p).toMatch(/cannot see|screen-reader/i);
    expect(p).toContain('Hemoglobin');
    expect(p).toContain('4HHB');
    // with an image, it must describe THIS view, not the molecule in the abstract
    expect(p).toMatch(/current on-screen view|THIS view/);
    // asks for spatial, concrete features — the things a blind student needs
    expect(p).toMatch(/spatial|left\/right|symmetry/i);
    expect(p).toMatch(/do not invent|only .*visible/i);
  });

  it('switches to a facts-based framing when no image is available (graceful fallback)', () => {
    const withImg = buildDescribePrompt('Crambin', '1CRN', 'a tiny plant protein', null, true);
    const noImg = buildDescribePrompt('Crambin', '1CRN', 'a tiny plant protein', null, false);
    expect(withImg).toMatch(/attached image is the EXACT current/);
    expect(noImg).toMatch(/No image is available/);
  });

  it('threads a follow-up question through, still grounded in the view', () => {
    const p = buildDescribePrompt('Lysozyme', '2LYZ', 'an enzyme', 'Where is the deepest pocket?', true);
    expect(p).toContain('Where is the deepest pocket?');
    expect(p).toMatch(/Answer their question/);
  });

  it('bounds untrusted inputs (structure/question are sliced)', () => {
    const p = buildDescribePrompt('X'.repeat(500), 'P'.repeat(50), 'm'.repeat(500), 'q'.repeat(500), true);
    expect(p).not.toContain('X'.repeat(101));
    expect(p).not.toContain('q'.repeat(201));
  });
});

describe('opener bridge wiring (STEM tool)', () => {
  it('advertises vision availability in the handshake', () => {
    expect(opener).toContain('var visionOn = !!(aiOn && typeof ctx.callGeminiVision === \'function\');');
    expect(opener).toContain("postMessage({ type: 'allocmol-ready', ai: aiOn, vision: visionOn }");
  });
  it('routes a describe request to the vision model, with a text fallback', () => {
    expect(opener).toContain("if (data.mode === 'describe') {");
    expect(opener).toContain('ctx.callGeminiVision(dprompt, data.image, data.mime');
    // fallback path when no image / no vision
    expect(opener).toMatch(/hasImg\s*\?\s*ctx\.callGeminiVision[\s\S]*?:\s*ctx\.callGemini\(dprompt/);
    expect(opener).toContain("bumpSlice('describeCount')");
    // vision is only attempted with a real image payload
    expect(opener).toContain("visionOn && typeof data.image === 'string' && data.image.length > 100");
  });
});

describe('shelf UI wiring (companion window)', () => {
  it('renders an always-available, accessible described-view panel', () => {
    expect(shelf).toContain('id="described"');
    expect(shelf).toContain('id="describeBtn"');
    // the output is a polite live region so a screen reader announces it
    expect(shelf).toMatch(/id="describedOut"[^>]*role="status"[^>]*aria-live="polite"/);
    expect(shelf).toContain('id="askForm"'); // follow-up Q&A
    expect(shelf).toContain('id="raToggle"'); // read-aloud control
  });
  it('captures the actual rendered view (Mol* screenshot, canvas fallback)', () => {
    expect(shelf).toContain('function captureView()');
    expect(shelf).toContain('viewportScreenshot');
    expect(shelf).toContain('getImageDataUri');
    expect(shelf).toContain("querySelector('#molstar canvas')");
  });
  it('sends a describe request with the image and reads the answer aloud', () => {
    expect(shelf).toContain("mode: 'describe'");
    expect(shelf).toContain('function describeView(');
    expect(shelf).toContain('SpeechSynthesisUtterance');
    // read-aloud honors the toggle (no speech when it's off)
    expect(shelf).toContain('if (!raToggle.checked');
  });
  it('degrades honestly when AI/vision is unavailable (no false promise)', () => {
    expect(shelf).toContain('image vision is off this session');
    expect(shelf).toMatch(/turn on AI hints to describe/);
  });
});

describe('mirror parity', () => {
  it('deploy mirrors match source', () => {
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/molecule_shelf/molecule_shelf.html'), 'utf8')).toBe(shelf);
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_moleculeshelf.js'), 'utf8')).toBe(opener);
  });
});
