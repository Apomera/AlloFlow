// Engine-level proof for the image-placeholder toolbar (NCES tables pilot, 2026-09-13).
//
// The markup is rendered from the two real placeholder templates (pipeline and doc-builder
// renderer), loaded in Chromium, and audited with the same engines the pipeline runs: axe-core
// (vendored) and IBM Equal Access (accessibility-checker-engine, WCAG_2_2 policy). On the pilot
// the toolbar failed label_name_visible ×4 and text_contrast_sufficient (the 11 px hint at 4.34:1
// and the teal Generate control at 3.74:1), and the fix loop could not repair either because the
// candidate gate refuses form-control name changes. The generated markup has to be clean at the
// source, so this test also proves the harness still catches the OLD markup.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const PIPELINE = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const RENDERER = readFileSync(resolve(process.cwd(), 'doc_builder_renderer_source.jsx'), 'utf8');
const AXE = resolve(process.cwd(), 'desktop/mcp/vendor/axe.min.js');
const ACE = resolve(process.cwd(), 'node_modules/accessibility-checker-engine/ace.js');

// Pipeline placeholder: the template literal returned for a figure whose image could not be
// extracted (hasSrc false), evaluated with the identifiers the template reads.
function pipelinePlaceholder() {
  const startMarker = 'return `<figure id="${imgId}-figure" data-img-idx="${imgIdx}"';
  const endMarker = '</figure>` + _carriedOut;';
  const i = PIPELINE.indexOf(startMarker);
  const j = PIPELINE.indexOf(endMarker, i);
  if (i < 0 || j < 0) throw new Error('pipeline placeholder template not found');
  const template = PIPELINE.slice(i + 'return '.length, j + '</figure>`'.length);
  const params = ['imgId', 'imgIdx', 'hasCropData', 'cropJson', 'hasSrc', '_dragOver2', '_dragLeave2', '_dropHandler2', 'srcToken', 'desc', 'imgInfo', '_uploadHandler2', '_pickHandler2', 'isRegenerated', 'purpose'];
  const render = new Function(...params, 'return ' + template + ';');
  return render('pdf-img-1', 1, false, '', false, 'void 0', 'void 0', 'void 0', '', 'Figure 2. Line chart of preprimary enrollment rates, 2010 through 2021.', { page: 20 }, 'void 0', 'void 0', false, 'Shows the pandemic dip in enrollment.');
}

// Renderer placeholder: the concatenated template for an image block without a source.
function rendererPlaceholder() {
  const startMarker = 'return `<figure id="${_imgId}-figure" data-img-placeholder="true"';
  const i = RENDERER.indexOf(startMarker);
  const j = RENDERER.indexOf('+ `</figure>`;', i);
  if (i < 0 || j < 0) throw new Error('renderer placeholder template not found');
  const expr = RENDERER.slice(i + 'return '.length, j + '+ `</figure>`'.length);
  const escapeTextField = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const render = new Function('_imgId', '_dragOver', '_dragLeave', '_dropHandler', '_uploadHandler', '_pickHandler', 'escapeTextField', '_imgDesc', '_captionText', 'return ' + expr + ';');
  return render('db-img-1', 'void 0', 'void 0', 'void 0', 'void 0', 'void 0', escapeTextField, 'A Venn diagram of interview structures.', 'Figure 1. Interview structures.');
}

const page = (body) => '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Placeholder toolbar check</title></head><body><main id="main-content"><h1>Placeholder toolbar check</h1>' + body + '</main></body></html>';

// The pilot's markup, reconstructed by reversing each change on the current template output.
const asBefore = (html) => html
  .replace(/aria-label="Pick extracted image from this document"/g, 'aria-label="Pick from extracted images"')
  .replace(/aria-label="Generate \(AI\) illustration from the description"/g, 'aria-label="Generate an AI illustration from the description"')
  .replace('<span style="color:#ffffff !important">Generate (AI)</span>', '<span style="color:#ffffff !important">✨ Generate (AI)</span>')
  .replace(/background:#0f766e;color:#ffffff !important;border:1px solid #115e59/g, 'background:#0d9488;color:#ffffff !important;border:1px solid #0f766e')
  .replace(/font-size:11px;color:#475569;font-style:italic">Drag/g, 'font-size:11px;color:#64748b;font-style:italic">Drag');

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
afterAll(async () => { await browser?.close(); });

async function audit(html) {
  const tab = await browser.newPage();
  try {
    await tab.setContent(html, { waitUntil: 'load' });
    await tab.addScriptTag({ path: AXE });
    await tab.addScriptTag({ path: ACE });
    return await tab.evaluate(async () => {
      const axeResult = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast', 'aria-hidden-focus', 'button-name', 'label', 'label-content-name-mismatch'] } });
      const checker = new window.ace.Checker();
      const report = await checker.check(document, ['WCAG_2_2']);
      const fails = report.results.filter((r) => r.value[0] === 'VIOLATION' && r.value[1] === 'FAIL');
      return {
        axe: axeResult.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html.slice(0, 120)) })),
        ea: fails.map((r) => ({ ruleId: r.ruleId, message: String(r.message).slice(0, 160), snippet: String(r.snippet || '').slice(0, 120) })),
      };
    });
  } finally { await tab.close(); }
}

const PILOT_RULES = ['label_name_visible', 'text_contrast_sufficient', 'aria_hidden_nontabbable'];

describe('placeholder toolbar passes axe and IBM Equal Access at the source', () => {
  it('renders a pipeline placeholder with the expected controls', () => {
    const html = pipelinePlaceholder();
    expect(html).toContain('Pick extracted');
    expect(html).toContain('Generate (AI)');
    expect(html).toContain('Drag an extracted image here, or:');
  });

  it('pipeline placeholder: no colour-contrast, hidden-focus or name-mismatch failures', async () => {
    const result = await audit(page(pipelinePlaceholder()));
    const eaPilot = result.ea.filter((r) => PILOT_RULES.includes(r.ruleId));
    expect(eaPilot, JSON.stringify(eaPilot)).toEqual([]);
    expect(result.axe.map((v) => v.id), JSON.stringify(result.axe)).not.toContain('color-contrast');
    expect(result.axe.map((v) => v.id), JSON.stringify(result.axe)).not.toContain('aria-hidden-focus');
    expect(result.axe.map((v) => v.id), JSON.stringify(result.axe)).not.toContain('label-content-name-mismatch');
  }, 90000);

  it('doc-builder renderer placeholder: the same three rules pass', async () => {
    const result = await audit(page(rendererPlaceholder()));
    const eaPilot = result.ea.filter((r) => PILOT_RULES.includes(r.ruleId));
    expect(eaPilot, JSON.stringify(eaPilot)).toEqual([]);
    expect(result.axe.map((v) => v.id), JSON.stringify(result.axe)).not.toContain('color-contrast');
    expect(result.axe.map((v) => v.id), JSON.stringify(result.axe)).not.toContain('label-content-name-mismatch');
  }, 90000);

  it('the pilot-era markup still fails in this harness (label names and contrast)', async () => {
    const before = asBefore(pipelinePlaceholder());
    expect(before).not.toBe(pipelinePlaceholder());
    const result = await audit(page(before));
    const eaRules = result.ea.map((r) => r.ruleId);
    expect(eaRules, JSON.stringify(result.ea)).toContain('label_name_visible');
    expect(eaRules, JSON.stringify(result.ea)).toContain('text_contrast_sufficient');
    expect(result.axe.map((v) => v.id), JSON.stringify(result.axe)).toContain('color-contrast');
  }, 90000);
});
