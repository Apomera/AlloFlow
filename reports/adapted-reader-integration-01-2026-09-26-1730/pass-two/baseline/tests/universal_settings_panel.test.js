import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const PANEL_SRC = 'view_sidebar_panels_source.jsx';
const panelSrc = readFileSync(PANEL_SRC, 'utf8');
const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
const coverage = JSON.parse(readFileSync('docs/resource_setting_coverage.json', 'utf8'));

function componentBody(src, name, nextName) {
  const a = src.indexOf(`function ${name}(`);
  const b = src.indexOf(`function ${nextName}(`);
  expect(a, `${name} present`).toBeGreaterThan(-1);
  expect(b, `${nextName} present`).toBeGreaterThan(a);
  return src.slice(a, b);
}

// The panel's baked constant, parsed from source so the test sees exactly what
// ships rather than importing anything.
function bakedCoverage() {
  const m = panelSrc.match(/const UNIVERSAL_SETTING_COVERAGE = \{[\s\S]*?\n\};/);
  expect(m, 'UNIVERSAL_SETTING_COVERAGE present').toBeTruthy();
  // eslint-disable-next-line no-new-func
  return new Function(`return ${m[0].replace('const UNIVERSAL_SETTING_COVERAGE = ', '')}`)();
}

describe('universal settings panel — measured honesty', () => {
  it('bakes exactly the measured local-backend coverage, per setting', () => {
    const baked = bakedCoverage();
    const local = coverage.rows.filter((r) => r.backend === 'local');
    expect(baked.measuredTypes).toBe(local.length);
    const axisFor = { grade: 'grade', language: 'lang', standards: 'standards', interests: 'interests', dok: 'dok', emoji: 'emoji' };
    for (const [uiKey, axis] of Object.entries(axisFor)) {
      const measured = local.filter((r) => r.axes[axis] === 'reaches').map((r) => r.type);
      expect(baked[uiKey], `${uiKey} drifted from docs/resource_setting_coverage.json — ` +
        're-run `node dev-tools/check_local_llm_resource_matrix.cjs --capabilities` and update the constant'
      ).toEqual(measured);
    }
    // allTypes drives the "Not used by: …" line (N6, 2026-08-16). Without this
    // assertion it is the one list in the constant nothing checks, and a stale
    // entry there would make the panel claim a setting skips a tool it reaches.
    expect(baked.allTypes, 'allTypes drifted from docs/resource_setting_coverage.json').toEqual(local.map((r) => r.type));
  });

  it('renders an applicability chip for every universal control', () => {
    const body = componentBody(panelSrc, 'UniversalSettingsPanel', 'AdventurePanel');
    for (const key of ['grade', 'language', 'standards', 'interests', 'dok', 'emoji']) {
      expect(body).toContain(`<UniversalApplicability settingKey="${key}"`);
    }
  });
});

describe('universal settings panel — help-key custody', () => {
  // Tour anchors and lang-pack keys must move with their controls, never fork.
  // A key can appear either as a literal data-help-key attribute or as the
  // helpKey prop of ResourceCustomInstructions (which renders the same
  // attribute) — both count as custody.
  // simplified_differentiation moved to the universal panel 2026-07-28: the
  // fan-out is no longer hardcoded to leveled text, so a control that produces
  // differentiated sets of ANY opted-in resource cannot live inside one tool.
  const universalKeys = ['simplified_grade_level', 'simplified_language', 'simplified_dok', 'simplified_standards', 'simplified_interests', 'simplified_emojis', 'simplified_differentiation'];
  const simplifiedKeys = ['simplified_format', 'simplified_length', 'simplified_custom_instructions', 'simplified_citations', 'simplified_charts'];
  const hasKey = (body, k) => body.includes(`data-help-key="${k}"`) || body.includes(`helpKey="${k}"`);

  it('moved controls live in UniversalSettingsPanel only', () => {
    const uni = componentBody(panelSrc, 'UniversalSettingsPanel', 'AdventurePanel');
    const simp = componentBody(panelSrc, 'SimplifiedPanel', 'MathPanel');
    for (const k of universalKeys) {
      expect(hasKey(uni, k), `${k} in universal panel`).toBe(true);
      expect(hasKey(simp, k), `${k} must be OUT of SimplifiedPanel`).toBe(false);
    }
  });

  it('leveled-text-only controls stay in SimplifiedPanel', () => {
    const uni = componentBody(panelSrc, 'UniversalSettingsPanel', 'AdventurePanel');
    const simp = componentBody(panelSrc, 'SimplifiedPanel', 'MathPanel');
    for (const k of simplifiedKeys) {
      expect(hasKey(simp, k), `${k} in SimplifiedPanel`).toBe(true);
      expect(hasKey(uni, k), `${k} must be OUT of universal panel`).toBe(false);
    }
  });

  it('owns the shared language list, with glossary showing it read-only', () => {
    // The list feeds three consumers (this output-language select, Adventure's
    // language mode, Glossary's translations). Its BUILDER used to sit in the
    // Glossary panel, so adding a language meant opening an unrelated tool.
    const uni = componentBody(panelSrc, 'UniversalSettingsPanel', 'AdventurePanel');
    const gloss = componentBody(panelSrc, 'GlossaryPanel', 'QuizPanel');
    for (const fn of ['addLanguage', 'removeLanguage', 'setLanguageInput']) {
      expect(uni, `${fn} in universal panel`).toContain(fn);
      expect(gloss, `${fn} must be OUT of glossary`).not.toContain(fn);
    }
    // Glossary must still SAY what it will translate into, or a teacher cannot
    // tell whether translations are coming — read-only, not editable.
    expect(gloss).toContain('selectedLanguages.join');
    expect(gloss).toContain('glossary_language_summary');
  });

  it('the shared custom-instructions component renders its helpKey as data-help-key', () => {
    const comp = componentBody(panelSrc, 'ResourceCustomInstructions', 'UniversalSettingsPanel');
    expect(comp).toContain('data-help-key={helpKey}');
  });
});

describe('universal settings panel — wiring', () => {
  it('is mounted once in AlloFlowANTI above the accordion, with the standards handlers', () => {
    const mounts = anti.match(/window\.AlloModules\.UniversalSettingsPanel && React\.createElement/g) || [];
    expect(mounts.length).toBe(1);
    const at = anti.indexOf('window.AlloModules.UniversalSettingsPanel && React.createElement');
    const tile = anti.indexOf('id="tour-tool-analysis"');
    expect(at, 'mounts before the first accordion tile').toBeLessThan(tile);
    const mountBlock = anti.slice(at, anti.indexOf('})}', at));
    for (const p of ['handleFindStandards', 'handleUseResolvedStandard', 'setGradeLevel', 'setLeveledTextLanguage', 'setDokLevel', 'setUseEmojis', 'setTargetStandards']) {
      expect(mountBlock).toContain(p);
    }
  });

  it('gates the local resolver on a registered snapshot and exposes every safe outcome', () => {
    const body = componentBody(panelSrc, 'UniversalSettingsPanel', 'AdventurePanel');
    expect(body).toContain('getRegisteredProvider');
    expect(body).toContain('Resolve from local snapshot');
    expect(body).toContain("localResolution.status === 'resolved'");
    expect(body).toContain("localResolution.status === 'ambiguous'");
    expect(body).toContain("localResolution.status === 'not-found'");
    expect(body).toContain('Use resolved standard');
    expect(body).toContain('They were not selected automatically.');
    expect(body).toContain('targetStandards.length > 0');
    expect(anti).toContain('resolvedStandardsSelection.targetKey === standardsPromptString');
    expect(anti).toContain('standardsContext: activeResolvedStandardsContext');
  });
  it('SimplifiedPanel mount no longer passes the moved props', () => {
    const at = anti.indexOf('window.AlloModules.SimplifiedPanel && React.createElement');
    expect(at).toBeGreaterThan(-1);
    const mountBlock = anti.slice(at, anti.indexOf('})}', at));
    for (const p of ['useEmojis', 'gradeLevel', 'dokLevel', 'targetStandards', 'studentInterests', 'leveledTextLanguage']) {
      expect(mountBlock).not.toContain(p);
    }
  });

  it('is registered by the module builder and present in both shipped copies', () => {
    expect(readFileSync('_build_view_sidebar_panels_module.js', 'utf8'))
      .toContain('window.AlloModules.UniversalSettingsPanel = ');
    const root = readFileSync('view_sidebar_panels_module.js', 'utf8');
    expect(root).toContain('UniversalSettingsPanel');
    expect(root).toBe(readFileSync('desktop/web-app/public/view_sidebar_panels_module.js', 'utf8'));
  });

  it('generated App.jsx carries the mount (build.js was re-run after the ANTI edit)', () => {
    expect(readFileSync('desktop/web-app/src/App.jsx', 'utf8'))
      .toContain('window.AlloModules.UniversalSettingsPanel && React.createElement');
  });

  it('only offers differentiation for types that honour a grade override', () => {
    // Probe-verified 2026-07-28: 17 of 20 branches read effectiveGrade. Offering
    // a type that does not would produce N same-grade artifacts under a label
    // promising a differentiated set — a silent wrong answer, not a missing one.
    const m = panelSrc.match(/const UNIVERSAL_DIFFERENTIABLE_TYPES = \[([\s\S]*?)\];/);
    expect(m, 'UNIVERSAL_DIFFERENTIABLE_TYPES present').toBeTruthy();
    const offered = [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]);
    // These two provably do not honour configOverride.grade.
    expect(offered).not.toContain('image');
    expect(offered).not.toContain('analysis');
    const dispatcherSrc = readFileSync('generate_dispatcher_source.jsx', 'utf8');
    // Every offered type must have a real dispatcher branch.
    for (const id of offered) {
      expect(dispatcherSrc, `${id} has a dispatcher branch`).toContain(`type === '${id}'`);
    }
  });

  it('guards the fan-out against recursion, and packs differentiate opted-in types', () => {
    const dispatcherSrc = readFileSync('generate_dispatcher_source.jsx', 'utf8');
    expect(dispatcherSrc).toContain('!configOverride.grade');
    // The escape hatch stays available for future batch callers...
    expect(dispatcherSrc).toContain('!configOverride.skipDifferentiation');
    // The current Full Pack matrix expands differentiated grades itself. Each
    // exact matrix cell therefore supplies both its explicit grade and the
    // escape hatch, preventing the dispatcher from multiplying that cell again.
    const helpersSrc = readFileSync('generation_helpers_source.jsx', 'utf8');
    expect(helpersSrc).toMatch(/grade:\s*cellGrade,\s*skipDifferentiation:\s*true,/);
    expect(helpersSrc).toContain('generationMatrixManaged: true');
  });

  it('guided step 0 carries a settings checkpoint into the banner', () => {
    // Universal settings now govern nearly every resource, so guided mode must
    // point at them BEFORE the first generation — but as a checkpoint inside
    // step 0, not a dedicated step that taxes every repeat run (2026-07-30).
    expect(anti).toContain('openUniversalSettings={openUniversalSettings}');
    expect(anti).toContain('const openUniversalSettings = ');
    const banner = readFileSync('view_guided_mode_banner_source.jsx', 'utf8');
    expect(banner).toContain('guidedStep === 0 && guidedSettingsSummary && openUniversalSettings');
    expect(banner).toContain("t('guided.settings_adjust')");
  });

  it('universal.* strings exist in both ui_strings copies', () => {
    for (const f of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const u = JSON.parse(readFileSync(f, 'utf8'));
      expect(u.universal && u.universal.title, f).toBe('Universal Settings');
      expect(u.universal.applies).toContain('{n}');
    }
  });
});
