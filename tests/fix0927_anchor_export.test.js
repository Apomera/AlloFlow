// 2026-09-27 A2: Anchor Chart print/export keeps each section's picture and its reviewed
// description, uses the same chart-type layouts and labels as the view, and never prints a raw type id.
// FIX0927_DOC_PIPELINE=<path> loads a candidate copy (mutation checks).
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let pipeline;
beforeAll(() => {
  new Function(readFileSync(process.env.FIX0927_DOC_PIPELINE || resolve('doc_pipeline_module.js'), 'utf8'))();
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub, callGeminiVision: stub, callImagen: async () => null, addToast: () => {}, t: k => k, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
  });
});
const ICON = 'data:image/png;base64,QUJDRA==';
const exportChart = (chartType, sections) => pipeline.generateFullPackHTML([{ id: 'a1', type: 'anchor-chart', title: 'Chart', data: { title: 'Chart', chartType, sections } }], 'Pack', false, {}, { annotations: [], annotationsByResource: {} });
const section = (label, extra = {}) => ({ id: label, label, bullets: [label + ' detail'], ...extra });

describe('A2: anchor chart export', () => {
  it('prints section pictures with their reviewed descriptions', () => {
    const html = exportChart('reference', [section('Plan', { iconUrl: ICON, iconAlt: 'A "big" pencil & notebook' }), section('Draft', { iconUrl: ICON })]);
    expect(html).toContain('src="' + ICON + '"');
    expect(html).toContain('alt="A &quot;big&quot; pencil &amp; notebook"');
    expect((html.match(/<img src="data:image\/png;base64,QUJDRA==" alt=""/g) || []).length).toBe(1);
  });

  it('keeps step order and a readable label for routine and worked-example charts', () => {
    for (const [type, label] of [['routine', 'Routine'], ['worked-example', 'Worked example']]) {
      const html = exportChart(type, [section('First'), section('Second')]);
      expect(html).toContain('(Anchor Chart &#8212; ' + label + ')');
      expect(html).toContain('Follow the steps in order');
      expect(html).not.toContain('&#8212; ' + type + ')');
    }
  });

  it('lays grid types out as cards and never prints an unknown type id', () => {
    expect(exportChart('vocabulary', [section('Term'), section('Word')])).toContain('display:grid');
    const html = exportChart('<img src=x onerror=alert(1)>', [section('Only')]);
    expect(html).toContain('(Anchor Chart &#8212; Reference)');
    expect(html).not.toContain('onerror=alert(1)');
  });
});
