import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const shellFiles = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
  'desktop/web-app/src/AlloFlowANTI.txt',
];

const resultKeys = [
  'pdf_audit_results_whatnow',
  'pdf_audit_dashboard_bar',
  'pdf_audit_results_score_badge',
  'pdf_audit_results_tab_original_btn',
  'pdf_audit_view_report_menu_btn',
  'pdf_audit_translate_doc_btn',
  'pdf_audit_plain_language_btn',
  'pdf_audit_make_fillable_btn',
  'pdf_audit_alt_formats_summary',
];

const triageKeys = [
  'pdf_audit_view_make_accessible_btn',
  'pdf_audit_view_start_btn',
  'pdf_audit_view_settings_panel',
  'pdf_audit_view_branding_panel',
  'pdf_audit_view_save_project_btn',
];

beforeAll(() => {
  window.React = {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
    useContext: () => null,
    createElement: () => null,
    Fragment: 'fragment',
  };
  window.AlloIcons = window.AlloIcons || {};
  delete window.AlloModules.PdfAuditView;
  loadAlloModule('view_pdf_audit_module.js');
});

describe('PDF pipeline tour lazy extraction', () => {
  it('publishes the complete results and triage catalogs in stable order', () => {
    const build = window.AlloModules.PdfAuditView.buildPipelineTourSteps;
    expect(build).toBeTypeOf('function');
    expect(build('results').map((step) => step.helpKey)).toEqual(resultKeys);
    expect(build('triage').map((step) => step.helpKey)).toEqual(triageKeys);
    expect(build('unexpected').map((step) => step.helpKey)).toEqual(triageKeys);
  });

  it('uses host translations and preserves English fallbacks', () => {
    const build = window.AlloModules.PdfAuditView.buildPipelineTourSteps;
    const translated = build('results', (key) => 'translated:' + key);
    expect(translated[0]).toMatchObject({
      title: 'translated:ptour.whatnow_title',
      text: 'translated:ptour.whatnow_text',
    });
    expect(build('results')[0]).toMatchObject({
      title: 'Start here',
    });
    expect(build('triage')[0]).toMatchObject({
      title: 'The one-click path',
    });
  });

  it('keeps only the state-owning bridge in every startup shell mirror', () => {
    for (const file of shellFiles) {
      const shell = read(file);
      const start = shell.indexOf('const startPipelineTour = (kind) => {');
      const end = shell.indexOf('const [isSpotlightMode', start);
      expect(start, file).toBeGreaterThanOrEqual(0);
      expect(end, file).toBeGreaterThan(start);
      const bridge = shell.slice(start, end);
      expect(bridge, file).toContain('buildPipelineTourSteps(kind, t)');
      expect(bridge, file).toContain('setCustomTourSteps(_steps)');
      expect(bridge, file).toContain('setTourStep(0)');
      expect(bridge, file).toContain('setRunTour(true)');
      expect(bridge, file).not.toContain('ptour.whatnow_text');
      expect(bridge, file).not.toContain('pdf_audit_results_whatnow');
      expect(bridge, file).not.toContain('pdf_audit_view_make_accessible_btn');
    }
  });

  it('ships the source-built artifact and its public mirror byte-for-byte', () => {
    const source = read('view_pdf_audit_source.jsx');
    const built = read('view_pdf_audit_module.js');
    const publicMirror = read('desktop/web-app/public/view_pdf_audit_module.js');
    expect(source).toContain('function buildPdfPipelineTourSteps(kind, translate)');
    expect(source).toContain('PdfAuditView.buildPipelineTourSteps = buildPdfPipelineTourSteps;');
    expect(built).toContain('function buildPdfPipelineTourSteps(kind, translate)');
    expect(built).toContain('PdfAuditView.buildPipelineTourSteps = buildPdfPipelineTourSteps;');
    expect(publicMirror).toBe(built);
  });
});
