import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync('AlloFlowANTI.txt', 'utf8');
const generatedApp = readFileSync('desktop/web-app/src/App.jsx', 'utf8');
const sidebarSource = readFileSync('view_sidebar_panels_source.jsx', 'utf8');

describe('AlloFlow focused workspace shell', () => {
  it('uses one 1100px controller for split and single-pane layouts', () => {
    expect(app).toContain("window.innerWidth >= 1100");
    expect(app).toContain("window.matchMedia('(min-width: 1100px)')");
    expect(app).not.toContain('flex flex-col md:flex-row');
    expect(app).toContain("flexDirection: isWide ? 'row' : 'column'");
    expect(app).toContain('{isWide && !isFullscreen && !isZenMode && (');
  });

  it('offers a touch-sized Create, Preview, and History switch on narrow screens', () => {
    expect(app).toContain('aria-label="Choose a workspace view"');
    for (const id of ['workspace-tab-create', 'workspace-tab-preview', 'workspace-tab-history']) {
      expect(app).toContain(`id="${id}"`);
    }
    expect(app).toContain('min-h-[44px]');
    expect(app).toContain('id="workspace-sidebar-pane"');
    expect(app).toContain('id="workspace-preview-pane"');
    expect(app).toContain("display: (!isWide && workspacePane !== 'preview'");
  });

  it('keeps Guided Mode bound to the real authoring controls', () => {
    expect(app).toContain("if (guidedMode) {\n      // A new Guided step always starts beside its real authoring control.");
    expect(app).toContain("if (!isWide && workspacePane !== 'create')");
    expect(app).toContain("window.requestAnimationFrame(() => window.requestAnimationFrame(focusTarget))");
    expect(app).toContain("disabled={guidedMode}");
    expect(app).toContain("const hiddenToolCatalogSelector = (guidedMode || !hasToolCatalogControls) ? ''");
  });

  it('reduces catalog noise without removing tools or Guided targets', () => {
    expect(sidebarSource).toContain('data-testid="tool-catalog-controls"');
    expect(sidebarSource).toContain('<label htmlFor="tool-catalog-search"');
    expect(sidebarSource).toContain('id="tool-catalog-search"');
    expect(app).toContain('window.AlloModules && window.AlloModules.ToolCatalogControls');
    expect(app).toContain('data-testid="tool-catalog-controls-fallback"');
    expect(app).toContain("toolCatalogGroup === 'all'");
    expect(app).toContain("guidedMode ? Array.from(new Set([...prev, id])) : [id]");
    expect(app).toContain('${hiddenToolCatalogSelector ? `${hiddenToolCatalogSelector}{display:none!important;}` : \'\'}');
  });

  it('makes the desktop splitter keyboard operable and keeps generated output current', () => {
    expect(app).toContain('role="separator"');
    expect(app).toContain('aria-label="Resize Create and Preview panes"');
    expect(app).toContain("['ArrowLeft', 'ArrowRight', 'Home', 'End']");
    expect(app).toContain("setLeftWidth(width => Math.max(20, Math.min(70");
    expect(generatedApp).toContain('id="workspace-preview-pane"');
    expect(generatedApp).toContain('window.AlloModules && window.AlloModules.ToolCatalogControls');
  });

  it('keeps notifications readable, dismissible, and clear of variable-height chrome', () => {
    expect(app).toContain('const dismissToast = (id) =>');
    expect(app).toContain("const baseDuration = type === 'error' ? 10000");
    expect(app).toContain('baseDuration + readingDuration');
    expect(app).toContain('const toastTimersRef = useRef(new Map())');
    expect(app).toContain('return next.slice(-3)');
    expect(app).toContain('onPointerEnter={() => pauseToastDismiss(toast.id)}');
    expect(app).toContain('onFocus={() => pauseToastDismiss(toast.id)}');
    expect(app).toContain("bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)'");
    expect(app).toContain('z-[170]');
    expect(app).toContain("onClick={() => dismissToast(toast.id)}");
    expect(app).toContain("'Dismiss notification'");
    expect(app).not.toContain('fixed top-44 left-1/2 -translate-x-1/2 z-[400]');
    expect(app).not.toContain("aria-label={t('common.notifications') || 'Notifications'}");
  });

  it('uses an editorial source-first empty state with restrained secondary routes', () => {
    expect(app).toContain("t('common.ready') || 'Workspace ready'");
    expect(app).toContain("t('tools.source') || 'Source Material'");
    expect(app).toContain('{isTeacherMode && !guidedMode && (');
    expect(app).toContain("].filter(a => a.key !== 'write').map((a) => {");
    expect(app).toContain("const ActionIcon = a.key === 'book' ? BookOpen");
    expect(app).toContain("history.length > 0 && !guidedMode");
    expect(app).toContain("if (!isWide) setWorkspacePane('history')");
    expect(app).toContain("behavior: disableAnimations ? 'auto' : 'smooth'");
    expect(app).not.toContain('{a.emoji}</span>');

    const findAction = app.match(/{ key: 'find'[^\n]+/)?.[0] || '';
    const generateAction = app.match(/{ key: 'generate'[^\n]+/)?.[0] || '';
    expect(findAction).toContain("setWorkspacePane('create')");
    expect(generateAction).toContain("setWorkspacePane('create')");
  });

  it('keeps the generated application synchronized with finishing-pass shell changes', () => {
    for (const marker of [
      'const toastTimersRef = useRef(new Map())',
      "bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)'",
      "t('tools.source') || 'Source Material'",
      "].filter(a => a.key !== 'write').map((a) => {",
    ]) {
      expect(generatedApp).toContain(marker);
    }
  });
});
