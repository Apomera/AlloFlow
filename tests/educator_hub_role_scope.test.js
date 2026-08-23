// Educator Hub in family/independent mode (fleet wave 3, X7).
//
// Family mode runs with isTeacherMode true AND isParentMode true, and the hub
// opened on bare isTeacherMode with NO role props at all — so a parent saw all
// ~18 cards, including the Leadership Hub (which contains the school-role-gated
// Principal Evaluation portal), Professional Development, and Report Writer.
//
// The recorded defaults (L10's analysis, W3's concurrence, Aaron's go-ahead):
//   HIDE from parent/independent: leadership-hub, professional-development,
//   report-writer.
//   KEEP for everyone: the rest — Document Hub, Whiteboard, Page Designer,
//   Lumen, Accessibility Lab and peers are genuinely useful at home (F1's
//   spirit, MODE_AUDIT_2026-08-03.md).
//   The two arguables (dynamic-assessment, polls-signups) stay VISIBLE as the
//   reversible default; each is one line in the source filter if that changes.
//
// The card filter is verified by a REAL React mount of the built module (the
// admin_suite_mount_smoke pattern), not by grep — plus grep pins for the host
// prop pass, because a prop nobody supplies is this repo's classic dead gate.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const root = process.cwd();
const source = readFileSync(resolve(root, 'view_educator_hub_modal_source.jsx'), 'utf8');
const builtModule = readFileSync(resolve(root, 'view_educator_hub_modal_module.js'), 'utf8');
const mirror = readFileSync(resolve(root, 'desktop/web-app/public/view_educator_hub_modal_module.js'), 'utf8');
const anti = readFileSync(resolve(root, 'AlloFlowANTI.txt'), 'utf8');
const headerSource = readFileSync(resolve(root, 'view_header_source.jsx'), 'utf8');
const headerModule = readFileSync(resolve(root, 'view_header_module.js'), 'utf8');
const uiStrings = JSON.parse(readFileSync(resolve(root, 'ui_strings.js'), 'utf8'));

// 2026-08-23: research-suite added — the IRB study surface extracted from the
// Assessment Center's third tab is exactly the 'embedded research study suite'
// X7 excluded from family mode; assessment-center itself stays visible to all
// roles (F1 kept the Center for home-schooling parents).
const HIDDEN_FOR_HOME = ['leadership-hub', 'professional-development', 'report-writer', 'research-suite'];
const KEPT_ARGUABLES = ['dynamic-assessment', 'polls-signups'];

let Hub;
const roots = [];

function mountHub(extraProps = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const reactRoot = ReactDOMClient.createRoot(container);
  roots.push({ root: reactRoot, container });
  const noop = () => {};
  act(() => {
    reactRoot.render(React.createElement(Hub, {
      showEducatorHub: true,
      setShowEducatorHub: noop,
      t: () => '',
      handleFileUpload: noop, openExportPreview: noop,
      pdfAuditResult: null, pdfFixLoading: false, pdfFixResult: null,
      setIsAccessibilityLabOpen: noop, setIsCommunityCatalogOpen: noop,
      setIsSymbolStudioOpen: noop, setPdfAuditResult: noop, setPdfBatchMode: noop,
      setPendingPdfBase64: noop, setPendingPdfFile: noop,
      setShowBehaviorLens: noop, setShowReportWriter: noop,
      ...extraProps,
    }));
  });
  return container;
}

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorHubModal;
  // eslint-disable-next-line no-new-func
  new Function(builtModule)();
  Hub = window.AlloModules.EducatorHubModal && window.AlloModules.EducatorHubModal.EducatorHubModal;
  if (!Hub) throw new Error('EducatorHubModal did not register');
});

afterEach(() => {
  while (roots.length) {
    const { root: r, container } = roots.pop();
    act(() => r.unmount());
    container.remove();
  }
});

const cardIds = (container) =>
  Array.from(container.querySelectorAll('[data-hub-id]')).map((n) => n.dataset.hubId);

describe('the card filter, behaviorally (real React mount of the built module)', () => {
  it('an older host passing no role props sees every card, exactly as before', () => {
    const ids = cardIds(mountHub());
    for (const id of HIDDEN_FOR_HOME) expect(ids, id + ' must render by default').toContain(id);
    expect(ids.length).toBeGreaterThanOrEqual(15);
  });

  it('family mode hides the recorded school-professional cards and nothing else', () => {
    const defaultIds = cardIds(mountHub());
    roots.forEach(({ root: r, container }) => { act(() => r.unmount()); container.remove(); });
    roots.length = 0;
    const parentIds = cardIds(mountHub({ isParentMode: true }));
    for (const id of HIDDEN_FOR_HOME) expect(parentIds, id + ' must be hidden from a parent').not.toContain(id);
    for (const id of KEPT_ARGUABLES) expect(parentIds, id + ' stays by recorded default').toContain(id);
    const removed = defaultIds.filter((id) => !parentIds.includes(id)).sort();
    expect(removed, 'ONLY the recorded three may disappear').toEqual([...HIDDEN_FOR_HOME].sort());
  });

  it('independent mode gets the same scope as family mode', () => {
    const ids = cardIds(mountHub({ isIndependentMode: true }));
    for (const id of HIDDEN_FOR_HOME) expect(ids).not.toContain(id);
  });
});

describe('the host prop pass (a prop nobody supplies is a dead gate)', () => {
  it('the source defaults both flags false so older hosts are unchanged', () => {
    expect(source).toContain('isParentMode = false,');
    expect(source).toContain('isIndependentMode = false,');
  });
  it('the ANTI mount actually passes both flags', () => {
    const at = anti.indexOf('<EducatorHubModal');
    expect(at).toBeGreaterThan(-1);
    const props = anti.slice(at, anti.indexOf('/>', at));
    expect(props).toContain('isParentMode={isParentMode}');
    expect(props).toContain('isIndependentMode={isIndependentMode}');
  });
  it('the built module and its public mirror are current', () => {
    expect(builtModule).toContain('hideSchoolProfessional');
    expect(mirror).toBe(builtModule);
  });
});

describe('adjacent leftover: the dashboard label a parent reads', () => {
  it('the header renders Family Dashboard wording when isParentMode', () => {
    expect(headerSource).toContain("t('dashboard.title_parent') || 'Family Dashboard'");
    expect(headerModule).toContain('dashboard.title_parent');
    // Wording only — the dashboard the header opens must not have changed.
    expect(headerSource).toContain('handleSetActiveViewToDashboard');
  });
  it('the key exists in ui_strings (listed for X3 translation)', () => {
    expect(uiStrings.dashboard.title_parent).toBe('Family Dashboard');
  });
});
