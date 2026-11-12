// Write with AI grade and the Universal Settings grade (2026-11-10).
//
// The writer's grade carries the shared grade with it until the teacher sets
// the shared grade by hand. After that a difference shows one short line with a
// button that applies the writer's grade everywhere. Both grades are a device
// preference, restored on the next visit.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import vm from 'node:vm';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { flushSync } = require(resolve('desktop/web-app/node_modules/react-dom'));
const read = (file) => fs.readFileSync(resolve(file), 'utf8');

let SourceGenPanel, root, host;

beforeAll(() => {
  // The built module supplies the icon set the panel draws with.
  window.React = React;
  window.AlloModules = window.AlloModules || {};
  vm.runInNewContext(read('view_misc_panels_module.js'), { window, console, document, setTimeout, clearTimeout });
  SourceGenPanel = window.AlloModules.SourceGenPanel;
}, 60000);

afterEach(() => {
  if (root) flushSync(() => root.unmount());
  host?.remove(); root = host = null;
});

function render(extra) {
  const props = new Proxy({
    showSourceGen: true, sourceTopic: 'Clouds', sourceLevel: '8th Grade', gradeLevel: '5th Grade',
    sourceLength: '250', sourceTone: 'Informative', sourceVocabulary: '', sourceCustomInstructions: '',
    aiStandardQuery: '', aiStandardRegion: '', standardInputValue: '', standardMode: 'manual',
    targetStandards: [], suggestedStandards: [], studentInterests: [], inputText: '', generationStep: '',
    useOwnSources: false, documentsOnly: false, includeSourceCitations: false, selectedOwnSourceIds: null,
    isGeneratingSource: false, isFindingStandards: false, isIndependentMode: false,
    t: (key) => key, setSourceLevel: vi.fn(), ...extra,
  }, { get: (target, key) => key in target ? target[key] : (/^(set|handle|add)/.test(String(key)) && key !== 'setUniversalGrade' ? (target[key] = vi.fn()) : undefined) });
  host = document.createElement('div'); document.body.appendChild(host);
  root = createRoot(host);
  flushSync(() => root.render(React.createElement(SourceGenPanel, props)));
  return { props, note: host.querySelector('[data-source-grade-mismatch]') };
}

describe('the note shown when the two grades differ', () => {
  it('is one short line that names both grades and offers the writer grade everywhere', () => {
    const setUniversalGrade = vi.fn();
    const { note } = render({ setUniversalGrade });
    expect(note.textContent.includes('This passage will be written for 8th Grade. Your other tools are still set to 5th Grade.')).toBe(true);
    expect(note.textContent.includes('Universal Settings')).toBe(false);
    const button = note.querySelector('button[data-source-grade-everywhere]');
    expect(button.textContent).toBe('Use 8th Grade for everything');
    flushSync(() => button.click());
    expect(setUniversalGrade).toHaveBeenCalledWith('8th Grade');
  });

  it('names the grades the way the dropdown does and labels the control like Universal Settings', () => {
    const t = (key) => ({ 'input.level_options.g8': 'Octavo grado', 'input.level_options.g5': 'Quinto grado', 'wizard.grade_level': 'Nivel de grado' }[key] || key);
    const { note } = render({ setUniversalGrade: vi.fn(), t });
    expect(note.textContent.includes('This passage will be written for Octavo grado. Your other tools are still set to Quinto grado.')).toBe(true);
    expect(Array.from(host.querySelectorAll('label')).some((label) => label.textContent === 'Nivel de grado')).toBe(true);
  });

  it('is absent when the grades match', () => {
    expect(render({ sourceLevel: '5th Grade', setUniversalGrade: vi.fn() }).note).toBeNull();
  });

  it('falls back to the way back on a host that cannot set the shared grade', () => {
    const { note, props } = render({});
    const button = note.querySelector('button');
    expect(button.textContent).toBe('Use 5th Grade');
    flushSync(() => button.click());
    expect(props.setSourceLevel).toHaveBeenCalledWith('5th Grade');
  });
});

describe('host wiring', () => {
  const anti = read('AlloFlowANTI.txt');
  const choose = (state) => {
    const line = anti.split('\n').find((text) => text.includes('const chooseSourceLevel = (value) =>'));
    const calls = [];
    // eslint-disable-next-line no-new-func
    new Function('gradeLevelChosen', 'gradeLevel', 'sourceLevel', 'setGradeLevel', 'setSourceLevel', `${line}\nchooseSourceLevel('8th Grade');`)(
      state.chosen, state.grade, state.source, (value) => calls.push(['grade', value]), (value) => calls.push(['source', value]));
    return calls;
  };

  it('moves the shared grade with the writer grade until the teacher has chosen one', () => {
    expect(choose({ chosen: false, grade: '5th Grade', source: '5th Grade' })).toEqual([['grade', '8th Grade'], ['source', '8th Grade']]);
    expect(choose({ chosen: true, grade: '5th Grade', source: '5th Grade' })).toEqual([['source', '8th Grade']]);
    expect(choose({ chosen: false, grade: '3rd Grade', source: '5th Grade' })).toEqual([['source', '8th Grade']]);
  });

  it('moves the writer grade with the shared grade while the two are in step', () => {
    const line = anti.split('\n').find((text) => text.includes('const chooseGradeLevel = (value) =>'));
    const run = (grade, source) => {
      const calls = [];
      // eslint-disable-next-line no-new-func
      new Function('gradeLevel', 'sourceLevel', 'setGradeLevelChosen', 'setGradeLevel', 'setSourceLevel', `${line}\nchooseGradeLevel('8th Grade');`)(
        grade, source, () => calls.push('chosen'), (value) => calls.push(['grade', value]), (value) => calls.push(['source', value]));
      return calls;
    };
    expect(run('5th Grade', '5th Grade')).toEqual(['chosen', ['source', '8th Grade'], ['grade', '8th Grade']]);
    expect(run('5th Grade', '3rd Grade')).toEqual(['chosen', ['grade', '8th Grade']]);
  });

  it('lifts both grades for an independent learner', () => {
    expect(/setGradeLevel\(prev => \(prev === '5th Grade' \? 'College' : prev\)\);\s*setSourceLevel\(prev => \(prev === '5th Grade' \? 'College' : prev\)\);/.test(anti)).toBe(true);
  });

  it('marks the shared grade as chosen only from the two hand controls', () => {
    expect(anti.includes('const chooseGradeLevel = (value) => { setGradeLevelChosen(true); if (gradeLevel === sourceLevel) setSourceLevel(value); setGradeLevel(value); };')).toBe(true);
    expect(anti.includes('setGradeLevel: chooseGradeLevel, setHistory,')).toBe(true);
    expect(anti.includes('setSourceLevel: chooseSourceLevel, setUniversalGrade: chooseGradeLevel,')).toBe(true);
    expect(anti.split('setGradeLevelChosen(true)').length - 1).toBe(2);
  });

  it('forwards the setter through both sidebar layers', () => {
    expect(read('view_sidebar_panels_source.jsx').split('setUniversalGrade: props.setUniversalGrade').length - 1).toBe(2);
  });

  it('saves both grades as a device preference and restores them once', () => {
    expect(anti.includes("await storageDB.set('allo_grade_prefs', { gradeLevel, sourceLevel, chosen: gradeLevelChosen });")).toBe(true);
    expect(anti.includes("const prefs = await storageDB.get('allo_grade_prefs');")).toBe(true);
    expect(anti.includes('if (!gradePrefsLoadedRef.current) {')).toBe(true);
  });

  it('does not save the startup defaults over a draft that has not been read', () => {
    expect(anti.includes('if (!draftHydratedRef.current && !isStorageDisabled) { setIsDraftSaving(false); return; }')).toBe(true);
    expect(anti.includes('initLocalData().finally(() => { if (!cancelled) draftHydratedRef.current = true; });')).toBe(true);
  });

  it('keeps the grade when a new workspace starts', () => {
    expect(/clearCanvasWorkspaceState\(\);\s*setGradeLevel\(gradeLevel\); setSourceLevel\(sourceLevel\);/.test(anti)).toBe(true);
  });
});

describe('glossary definition level option', () => {
  it('reuses the translated grade label and grade name instead of "Global Level"', () => {
    const sidebar = read('view_sidebar_panels_source.jsx');
    const at = sidebar.indexOf('<option value="Same as Global Level">');
    const option = sidebar.slice(at, sidebar.indexOf('</option>', at));
    expect(option.includes("label('wizard.grade_level', t('glossary.def_options.global'))")).toBe(true);
    expect(option.includes("label('grades.' + key, gradeLevel)")).toBe(true);
  });
});
