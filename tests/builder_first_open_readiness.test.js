import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 2026-09-13, Aaron: "Sometimes AlloFlow resources do not appear in the Document Builder right
// away." On a cold session the doc pipeline factory (3.4 MB), the preview writer (inside the
// 890 KB view module) and the view's iframe land after the builder opens; the host's render
// effect polled for the factory alone, for ~3 s, then rendered through a closure captured
// before the pipeline instance existed (its generateFullPackHTML is the `() => ''` stub), so
// the iframe stayed blank until an unrelated dependency changed. These pins keep the
// readiness gate, the closure refresh and the collapsible reader toolbar in place.
const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const pipeline = readFileSync('doc_pipeline_source.jsx', 'utf8');
const view = readFileSync('view_export_preview_source.jsx', 'utf8');

const slice = (text, startMarker, endMarker) => {
  const start = text.indexOf(startMarker);
  expect(start, startMarker).toBeGreaterThan(0);
  const end = text.indexOf(endMarker, start);
  expect(end, endMarker).toBeGreaterThan(start);
  return text.slice(start, end);
};

describe('Document Builder first open waits for every lazily loaded piece', () => {
  const effect = slice(host, 'const [builderPreviewReadyTick, setBuilderPreviewReadyTick] = useState(0);', 'const setExportConfigAndRefresh =');

  it('polls for the pipeline factory, the preview writer and the iframe together', () => {
    expect(effect).toContain("typeof window.AlloModules.createDocPipeline === 'function'");
    expect(effect).toContain('window.AlloModules.ExportPreviewHelpers');
    expect(effect).toContain('const iframe = exportPreviewRef.current;');
    expect(effect).toContain('if (factoryReady && writerReady && iframe) {');
  });

  it('waits up to the lazy-module ceiling instead of three seconds', () => {
    const patience = effect.match(/if \(attempts >= (\d+)\) \{ updateExportPreview\(\); return; \}/);
    expect(patience).not.toBeNull();
    expect(Number(patience[1]) * 150).toBeGreaterThanOrEqual(60000);
    expect(effect).toContain('setTimeout(tryRender, 150);');
  });

  it('re-renders once so the writer runs with a closure that holds the live pipeline', () => {
    // The render closure only sees the pipeline instance built in its own render; the callback
    // must list it as a dependency and the effect must force a render when its closure predates it.
    const callback = slice(host, 'const updateExportPreview = React.useCallback(() => {', '_docPipelineLiveDepsRef.current.updateExportPreview = updateExportPreview;');
    expect(callback).toMatch(/\}, \[[^\]]*\b_docPipeline\]\);\s*$/);
    expect(effect).toContain('const closureHasPipeline = !!_docPipeline;');
    expect(effect).toContain('setBuilderPreviewReadyTick((n) => n + 1);');
    expect(effect).toMatch(/\[showExportPreview, history, [^\]]*updateExportPreview, builderPreviewReadyTick\]\);/);
    // Bounded: a pipeline that never materialises must not spin the tick forever.
    expect(effect).toContain('_builderPreviewTickCountRef.current < 3');
  });

  it('shows a note in the iframe while the tools load, never over a rendered document', () => {
    expect(effect).toContain('data-allo-preview-pending="1"');
    expect(effect).toContain('if (doc.body.children.length) return;');
    expect(effect).toContain('if (iframe && !factoryReady) _writeBuilderPreviewPendingNote(iframe);');
  });
});

describe('exported reading tools tray collapses at every width and remembers the choice', () => {
  it('shows the Tools toggle on wide screens too and hides the panel when collapsed', () => {
    expect(pipeline).toContain('.alloflow-tools-toggle { display: flex;');
    expect(pipeline).toContain('.alloflow-reading-tools-shell:not(.expanded) .alloflow-tools-panel { display: none; }');
    // The mobile tray rules stay so narrow screens keep their scrollable panel.
    expect(pipeline).toContain("matchMedia('(max-width: 720px)')");
  });

  it('persists the open/closed state per device and only on a reader click', () => {
    const script = slice(pipeline, '// Reading Tools - collapsible tray.', '// Reading Tools - text size, font, line spacing, and letter spacing.');
    expect(script).toContain("var KEY = 'alloflow-reading-tools-open';");
    expect(script).toContain("if (remember) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }");
    expect(script).toContain("if (saved === '1' || saved === '0') setExpanded(saved === '1', false);");
    expect(script).toContain("setExpanded(!shell.classList.contains('expanded'), true);");
  });
});

describe('Document Builder heading', () => {
  it('sets the current document title a step lighter than near-black', () => {
    expect(view).toContain('<h3 id="builder-current-document-title" className="truncate text-sm font-semibold text-slate-700"');
  });
});
