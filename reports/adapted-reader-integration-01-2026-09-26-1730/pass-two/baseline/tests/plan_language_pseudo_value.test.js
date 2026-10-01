// "All Selected Languages" is a UI pseudo-value, not a language.
//
// The Output Language dropdown (view_sidebar_panels_source.jsx ~748) offers it
// whenever the user has picked additional languages. It means "generate one
// copy per selected language" -- the dispatcher implements exactly that, via a
// fan-out over MULTILINGUAL_FANOUT_TYPES, and 'lesson-plan' is on that list.
//
// The sidebar Lesson Plan button does not fan out, which is fine. What is not
// fine is what it did instead: it passed the pseudo-value straight through as
// the output language, so the prompt's "Language: ${language}" line became
// "Language: All Selected Languages" and the model was asked to write in a
// language that does not exist.
//
// This was introduced BY the previous fix in this exact spot. The 2026-08-16
// comment above the call explains that these three branches used to send
// currentUiLanguage while the dispatcher sent the Output Language setting --
// "the mechanism behind the 'lesson plan is inconsistent about honouring a
// non-English output language' report". Rewiring them to leveledTextLanguage
// was right, but leveledTextLanguage can hold the pseudo-value and
// currentUiLanguage never could, so the rewire silently opened this case.
//
// Every other consumer already guards it: content_engine falls back to English
// for phonics (~2380, ~2508), resets the setting when the language list empties
// (~2077), and the ANTI translation policy treats it as "not a target" (~6880).
// The sidebar plan path was the one place that did not.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let cmap, sidebar, dispatcher, engine;

beforeAll(() => {
  cmap = readFileSync('concept_map_handlers_source.jsx', 'utf8');
  sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
  dispatcher = readFileSync('generate_dispatcher_source.jsx', 'utf8');
  engine = readFileSync('content_engine_source.jsx', 'utf8');
});

describe('the premise: the pseudo-value is real, selectable, and not a language', () => {
  it('the Output Language dropdown offers it and writes leveledTextLanguage', () => {
    const i = sidebar.indexOf('<option value="All Selected Languages">');
    expect(i).toBeGreaterThan(-1);
    // Same <select>, so the value it offers lands in the state the plan reads.
    const sel = sidebar.slice(Math.max(0, i - 900), i);
    expect(sel).toContain('value={leveledTextLanguage}');
    expect(sel).toContain('onChange={(e) => setLeveledTextLanguage(e.target.value)}');
  });

  it('the dispatcher treats it as a fan-out instruction, and plans are included', () => {
    expect(dispatcher).toContain("if (effectiveLanguage === 'All Selected Languages' && !langOverride) {");
    const i = dispatcher.indexOf('const MULTILINGUAL_FANOUT_TYPES');
    expect(i).toBeGreaterThan(-1);
    expect(dispatcher.slice(i, i + 500)).toContain("'lesson-plan'");
  });

  it('other consumers already fall back rather than pass it through', () => {
    expect(engine).toContain("explanationLanguage === 'All Selected Languages' ? 'English' : explanationLanguage");
    expect(engine).toContain("wordLanguage === 'All Selected Languages' ? 'English' : wordLanguage");
  });
});

describe('the sidebar plan path resolves it instead of forwarding it', () => {
  it('planLanguage cannot be the pseudo-value', () => {
    const m = cmap.match(/const planLanguage = ([^;]+);/);
    expect(m).toBeTruthy();
    expect(m[1]).toContain('All Selected Languages');
  });

  it('the resolution is shared, not a fourth hand-rolled copy', () => {
    // One helper, so a future language mode is handled in one place.
    expect(cmap).toContain('resolvePlanOutputLanguage');
  });
});

describe('resolvePlanOutputLanguage', () => {
  let Utils;
  beforeAll(async () => {
    const { loadAlloModule } = await import('./setup.js');
    loadAlloModule('utils_pure_module.js');
    Utils = window.AlloModules.UtilsPure;
  });

  it('passes a real language through untouched', () => {
    expect(Utils.resolvePlanOutputLanguage('Spanish', 'English')).toBe('Spanish');
  });

  it('resolves the pseudo-value to a concrete language', () => {
    // A single plan cannot be written in N languages at once, so the
    // pseudo-value must resolve to something real. It falls through to the UI
    // language rather than hard-coding English: a French-speaking user who
    // picked "all selected" should get their plan in French, not English.
    // content_engine hard-codes English for phonics because the ANALYSIS
    // language there is English-specific; a lesson plan has no such constraint.
    expect(Utils.resolvePlanOutputLanguage('All Selected Languages', 'French')).toBe('French');
    // Only when there is no usable UI language does it land on English.
    expect(Utils.resolvePlanOutputLanguage('All Selected Languages', '')).toBe('English');
    expect(Utils.resolvePlanOutputLanguage('All Selected Languages', 'All Selected Languages')).toBe('English');
  });

  it('falls back through the UI language, then English', () => {
    expect(Utils.resolvePlanOutputLanguage('', 'French')).toBe('French');
    expect(Utils.resolvePlanOutputLanguage('', '')).toBe('English');
    expect(Utils.resolvePlanOutputLanguage(null, null)).toBe('English');
  });

  it('never returns the pseudo-value, whatever it is handed', () => {
    for (const ui of ['All Selected Languages', '', null, 'Spanish']) {
      expect(Utils.resolvePlanOutputLanguage('All Selected Languages', ui))
        .not.toBe('All Selected Languages');
    }
  });
});
