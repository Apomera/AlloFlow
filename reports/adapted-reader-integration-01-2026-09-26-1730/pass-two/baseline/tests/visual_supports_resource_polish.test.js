import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const viewer = readFileSync('view_visual_supports_modal_source.jsx', 'utf8');
const panel = readFileSync('visual_panel_source.jsx', 'utf8');

describe('Visual Supports resource polish', () => {
  it('normalizes saved resources and refreshes outside the render path', () => {
    expect(viewer).toContain('function readVisualSupportSnapshot()');
    expect(viewer).toContain('Array.isArray(parsed) ? parsed : []');
    expect(viewer).toContain("window.addEventListener('storage', handleStorage)");
    expect(viewer).toContain("window.addEventListener('allo-visual-supports-updated', refreshSupports)");
    expect(viewer).not.toContain("const vsBoards = vsRead('alloSymbolBoards')");
  });

  it('supports search, read aloud, and explicit ordered schedule progress', () => {
    expect(viewer).toContain('id="visual-supports-search"');
    expect(viewer).toContain("aria-label={schedule.title + ' ordered steps'}");
    expect(viewer).toContain("aria-current={isCurrent ? 'step' : undefined}");
    expect(viewer).toContain('toggleScheduleStepComplete');
    expect(viewer).toContain('getInitialScheduleProgress');
    expect(viewer).toContain('complete: !!safeItem.complete');
    expect(viewer).toContain('speakSupportText');
  });

  it('keeps every hook ahead of the empty-plan return and persists challenge settings', () => {
    expect(panel.indexOf('const orderedPanels = React.useMemo')).toBeLessThan(panel.indexOf('if (!hasVisualPanels) return null'));
    expect(panel).toContain('challengeMode, challengeType, imageOverrides]');
    expect(panel).toContain('Array.isArray(visualPlan?.panels)');
  });

  it('reports unsupported uploads and export outcomes', () => {
    expect(panel).toContain('Choose an image file (PNG, JPEG, GIF, or WebP).');
    expect(panel).toContain("const [exportStatus, setExportStatus] = React.useState('');");
    expect(panel).toContain('could not be exported. The image host may block canvas export.');
  });

  it('keeps generated and deployed artifacts synchronized', () => {
    expect(readFileSync('desktop/web-app/src/view_visual_supports_modal_source.jsx', 'utf8')).toBe(viewer);
    expect(readFileSync('desktop/web-app/public/view_visual_supports_modal_module.js', 'utf8')).toBe(readFileSync('view_visual_supports_modal_module.js', 'utf8'));
    expect(readFileSync('desktop/web-app/public/visual_panel_module.js', 'utf8')).toBe(readFileSync('visual_panel_module.js', 'utf8'));
  });
});
