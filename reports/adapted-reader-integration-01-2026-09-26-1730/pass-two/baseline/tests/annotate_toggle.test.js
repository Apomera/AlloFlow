// The teacher's annotation tools sit behind one "Annotate" toggle.
//
// WHY (2026-09-24 audit): five annotation mode buttons and Undo sat on the bar
// above every resource for teachers. "Annotate" now opens them; it stays open
// while a tool is on (so the active tool is always visible), and closing it
// turns the tool off. The List toggle, whose count shows waiting feedback,
// stays on the bar. Undo still works by keyboard with the tools closed:
// handleAnnotationUndo only flashes the button when it is there.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const hosts = { ANTI: readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8'), 'App.jsx': readFileSync('desktop/web-app/src/App.jsx', 'utf8') };
const handlers = readFileSync('host_handlers_source.jsx', 'utf8');

describe.each(Object.entries(hosts))('%s', (_, source) => {
  const bar = source.slice(source.indexOf('data-annotate-toggle'), source.indexOf('{/* Annotation sidebar toggle (Phase 5).'));
  it('has an Annotate toggle that stays open while a tool is on and turns it off on close', () => {
    expect(source).toContain("const [annotateOpen, setAnnotateOpen] = useState(false);");
    expect(bar).toContain('aria-expanded={!!(annotateOpen || annotationMode)}');
    expect(bar).toContain("if (annotateOpen || annotationMode) { setAnnotationMode(''); setAnnotateOpen(false); } else setAnnotateOpen(true);");
  });
  it('shows the tools and Undo only while open, and keeps List on the bar', () => {
    expect(bar).toContain('{(annotateOpen || annotationMode) && <>');
    expect(bar.indexOf('_m.Toolbar')).toBeGreaterThan(bar.indexOf('{(annotateOpen || annotationMode) && <>'));
    expect(bar.indexOf('data-allo-undo-btn')).toBeLessThan(bar.indexOf('</>}'));
    expect(source.indexOf('setShowAnnotationSidebar(prev => !prev)')).toBeGreaterThan(source.indexOf('data-annotate-toggle'));
  });
});

it('keyboard undo does not need the Undo button on screen', () => {
  const at = handlers.indexOf("document.querySelector('[data-allo-undo-btn]')");
  expect(at).toBeGreaterThan(-1);
  expect(handlers.slice(at, at + 120)).toContain('if (btn)');
});
