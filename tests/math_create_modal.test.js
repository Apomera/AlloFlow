// Math Studio: the former STEM Lab Create tab, math-owned (2026-08-17).
// docs/math_create_migration_plan.md — this file pins the migration's wiring
// so no seam can quietly come loose: the module registers, the host mounts it,
// both doors exist, the Lab is create-free with a working pointer, and every
// copy is in sync.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let modal;
let anti;
let stem;

beforeAll(() => {
  modal = readFileSync('math_create_module.js', 'utf8');
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  stem = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
});

describe('the module', () => {
  it('registers MathCreateModal under AlloModules.MathCreate', () => {
    expect(modal).toContain('window.AlloModules.MathCreate = { MathCreateModal: MathCreateModal };');
    expect(modal).toContain('window.AlloModules.MathCreateModule = true;');
  });

  it('is a real dialog: labelled, trapped, Escape-closable, focus-restoring', () => {
    expect(modal).toContain('role: "dialog"');
    expect(modal).toContain('"aria-modal": "true"');
    expect(modal).toContain('"aria-labelledby": "math-create-title"');
    expect(modal).toContain("if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }");
    expect(modal).toContain('previouslyFocused.isConnected');
  });

  it('kept the Create surface: modes, styles, fluency door, assessment builder', () => {
    for (const marker of ["id: 'topic'", "id: 'content'", "id: 'solve'",
      "t('stem.fluency.probe_button_aria')", 'Build Assessment', // emoji is \u-escaped in the transplant
      'handleGenerateMath(mathInput, true, resolvedMode);']) {
      expect(modal, marker).toContain(marker);
    }
  });

  it('transformed the three seams and only those', () => {
    // Closing the Lab became closing this modal. The call form must be gone;
    // the file-header comment naming the seam is allowed.
    expect(modal).not.toContain('setShowStemLab(false);');
    expect(modal.split('onClose()').length - 1).toBeGreaterThanOrEqual(4);
    // Tool chips reopen the Lab on the named Explore tool.
    expect(modal).toContain("window.__alloEnsureStemPluginLoaded");
    expect(modal).toContain('setShowStemLab(true)');
    // Nothing lab-internal leaked.
    expect(modal).not.toContain('_openStemTool');
    expect(modal).not.toContain("stemLabTab ===");
    // Snapshots stayed with the Lab.
    expect(modal).not.toContain('toolSnapshots');
  });
});

describe('the host wiring', () => {
  it('has state, lazy loader, and a mount inside a CDNModuleGate', () => {
    expect(anti).toContain('const [showMathCreate, setShowMathCreate] = useState(false);');
    expect(anti).toContain("window.__alloLazyMathCreate = (function()");
    expect(anti).toContain("loadModule('MathCreate', 'https://alloflow-cdn.pages.dev/math_create_module.js?v=");
    expect(anti).toContain('<CDNModuleGate moduleKey="MathCreate.MathCreateModal" isOpen={showMathCreate}');
  });

  it('openMathCreate lazy-loads then opens', () => {
    const fn = anti.slice(anti.indexOf('const openMathCreate = React.useCallback('), anti.indexOf('const openMathCreate = React.useCallback(') + 400);
    expect(fn).toContain('window.__alloLazyMathCreate');
    expect(fn).toContain('setShowMathCreate(true);');
  });

  it('threads openMathCreate to both doors', () => {
    // STEM Lab bag (the pointer) and the MathPanel bag (the primary door).
    const stemBag = anti.slice(anti.indexOf('React.createElement(StemLab, {'), anti.indexOf('React.createElement(StemLab, {') + 8000);
    expect(stemBag).toContain('openMathCreate,');
    const mathBag = anti.slice(anti.indexOf('t, useMathSourceContext, autoAttachManipulatives, setAutoAttachManipulatives'), anti.indexOf('t, useMathSourceContext, autoAttachManipulatives, setAutoAttachManipulatives') + 300);
    expect(mathBag).toContain('openMathCreate');
  });

  it('ships in build.js MODULES so the deploy pipeline bumps its CDN hash', () => {
    const build = readFileSync('build.js', 'utf8');
    expect(build).toContain("filename: 'math_create_module.js',");
    expect(build).toContain("name: 'MathCreate',");
  });
});

describe('the doors', () => {
  it('MathPanel has the primary door', () => {
    const sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
    expect(sidebar).toContain('data-help-key="math_open_studio"');
    expect(sidebar).toContain('onClick={openMathCreate}');
    expect(sidebar).toContain("t('math_create.open_button')");
  });

  it('the Lab has the pointer in the topbar actionbar (tab row is gone entirely)', () => {
    // 2026-08-17 mobile pass: the tab row was 72px of overhead carrying one
    // tab plus the pointer, and a single-tab tablist is an ARIA anti-pattern.
    // The pointer now lives in the actionbar as a compact labeled button.
    expect(stem).not.toContain('stem-lab-tablist flex border-b'); // row removed
    expect(stem).toContain('stem-lab-mathstudio-btn');
    expect(stem).toContain('openMathCreate,'); // destructured, not a free variable
    const pointer = stem.slice(stem.indexOf('stem-lab-mathstudio-btn') - 600, stem.indexOf('stem-lab-mathstudio-btn') + 600);
    expect(pointer).toContain('setShowStemLab(false);');
    expect(pointer).toContain('openMathCreate()');
    expect(pointer).toContain("t('math_create.pointer_aria')");
  });

  it('the mobile header is condensed: one-line honest subtitle, no Alt+1/2, no dead subject select', () => {
    // Measured on a 390x844 viewport against the live shell with this module
    // route-injected: header stack 317px -> 118px.
    expect(stem).toContain(`t('stem.solver.manipulatives') || "Interactive tools & labs"`);
    expect(stem).not.toContain('Create problems, build assessments, explore with manipulatives');
    expect(stem).not.toContain("setStemLabTab('explore'); announceToSR('Switched to Explore tab')");
    expect(stem).not.toContain('"Alt+1"');
    expect(stem).not.toContain('stem-lab-subject-select'); // guard was always false after the migration
  });
});

describe('the Lab is create-free', () => {
  it('has no create tab, no create branches, no Alt+2 shortcut', () => {
    expect(stem).not.toContain("stemLabTab === 'create'");
    expect(stem).not.toContain("id: 'create',");
    expect(stem).not.toContain("setStemLabTab('create')");
    expect(stem.split('"Alt+2"').length - 1).toBe(0); // help overlay row removed
  });

  it('the snapshots row moved to Explore rather than dying with the builder', () => {
    expect(stem).toContain("stemLabTab === 'explore' && !stemLabTool && toolSnapshots.length > 0 &&");
  });
});

describe('strings and copies', () => {
  it('every math_create string has a real key in both ui_strings copies', () => {
    const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
    const pub = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8'));
    for (const key of ['title', 'subtitle', 'open_button', 'open_aria', 'pointer', 'pointer_aria']) {
      expect(typeof ui.math_create[key], 'math_create.' + key).toBe('string');
      expect(pub.math_create[key]).toBe(ui.math_create[key]);
    }
  });

  it('all copies are byte-identical', () => {
    expect(readFileSync('desktop/web-app/public/math_create_module.js', 'utf8')).toBe(modal);
    for (const mirror of ['desktop/web-app/public/stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js']) {
      expect(readFileSync(mirror, 'utf8')).toBe(stem);
    }
  });
});
