// Lesson template library.
//
// A template is NOT a second artifact type — it is a saved lesson blueprint
// with the CONTENT removed. Keep the pattern (tools + directives + defaults);
// strip lessonDNA and the source binding.
//
// The primary path stays conversational: a teacher builds a plan with the
// agent, refines it, and saves THAT. Templates are starting points, so being
// imperfect is fine — but silently carrying the last lesson's content is not.
// That is the same shape of defect as the DA isolation leak, one severity down:
// a Civil War pack quietly talking about photosynthesis.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let S;
beforeAll(() => {
  loadAlloModule('agent_core_contracts_module.js');
  loadAlloModule('agent_core_blueprint_service_module.js');
  S = window.AlloModules?.AgentCoreBlueprintService;
  if (!S?.toLessonTemplate) throw new Error('lesson template API failed to register');
});

// A realistic finished plan, complete with the content a template must drop.
const CONFIG = {
  resourcePlan: [
    { tool: 'analysis', directive: 'Find the key ideas', uiId: 'analysis-0' },
    { tool: 'glossary', directive: 'Define photosynthesis, chloroplast, stomata', uiId: 'glossary-1' },
    { tool: 'quiz', directive: 'Focus on tier-2 academic vocabulary', uiId: 'quiz-2' },
  ],
  toolDirectives: { analysis: 'Find the key ideas' },
  globalSettings: { gradeLevel: '5th Grade', tone: 'Informative' },
  lessonDNA: {
    goldenThread: ['photosynthesis', 'chloroplast'],
    keyTerms: ['stomata', 'chlorophyll'],
    essentialQuestion: 'How do plants make food?',
  },
};

describe('saving a plan as a template', () => {
  it('keeps the pattern — tools, order and directives', () => {
    const t = S.toLessonTemplate(CONFIG, { name: 'Vocab-first informational' });
    expect(t.resourcePlan.map((r) => r.tool)).toEqual(['analysis', 'glossary', 'quiz']);
    expect(t.resourcePlan[0].directive).toBe('Find the key ideas');
    expect(t.name).toBe('Vocab-first informational');
  });

  it('STRIPS the lesson DNA — the content of one specific lesson', () => {
    const t = S.toLessonTemplate(CONFIG, {});
    expect(t.lessonDNA).toBeUndefined();
    const serialized = JSON.stringify(t);
    expect(serialized).not.toContain('chlorophyll');
    expect(serialized).not.toContain('How do plants make food');
  });

  it('keeps grade and tone as editable defaults', () => {
    const t = S.toLessonTemplate(CONFIG, {});
    expect(t.globalSettings.gradeLevel).toBe('5th Grade');
    expect(t.globalSettings.tone).toBe('Informative');
  });

  // The save-time directive review. A directive like "focus on tier-2 academic
  // vocabulary" travels; "define photosynthesis, chloroplast, stomata" does not,
  // and no heuristic can reliably tell them apart — so the teacher decides.
  it('honours a per-row directive policy', () => {
    const t = S.toLessonTemplate(CONFIG, { directives: { 'glossary-1': 'blank' } });
    const byId = Object.fromEntries(t.resourcePlan.map((r) => [r.uiId, r]));
    expect(byId['glossary-1'].directive).toBe('');            // content-bound, blanked
    expect(byId['quiz-2'].directive).toBe('Focus on tier-2 academic vocabulary'); // portable, kept
    expect(byId['analysis-0'].directive).toBe('Find the key ideas');
  });

  it('defaults to keeping directives when no policy is given', () => {
    const t = S.toLessonTemplate(CONFIG, {});
    expect(t.resourcePlan.every((r) => r.directive.length > 0)).toBe(true);
  });

  it('survives a malformed config without throwing', () => {
    expect(() => S.toLessonTemplate(null, {})).not.toThrow();
    expect(S.toLessonTemplate(null, {}).resourcePlan).toEqual([]);
    expect(S.toLessonTemplate({ resourcePlan: [{ directive: 'no tool' }] }, {}).resourcePlan).toEqual([]);
  });
});

describe('applying a template', () => {
  it('produces a usable plan with NO lesson DNA', () => {
    const t = S.toLessonTemplate(CONFIG, {});
    const cfg = S.applyLessonTemplate(t);
    expect(cfg.resourcePlan.map((r) => r.tool)).toEqual(['analysis', 'glossary', 'quiz']);
    // Absent, not empty: downstream code checks presence of lessonDNA.
    expect('lessonDNA' in cfg).toBe(false);
  });

  it('rebuilds the legacy shape the card and executor expect', () => {
    const cfg = S.applyLessonTemplate(S.toLessonTemplate(CONFIG, {}));
    expect(cfg.recommendedResources).toEqual(['analysis', 'glossary', 'quiz']);
    expect(cfg.toolDirectives.analysis).toBe('Find the key ideas');
    expect(cfg.resourcePlan[0].uiId).toBeTruthy();
  });

  it('round-trips without leaking content back in', () => {
    const cfg = S.applyLessonTemplate(S.toLessonTemplate(CONFIG, {}));
    expect(JSON.stringify(cfg)).not.toContain('chlorophyll');
  });

  it('carries grade and tone through as defaults', () => {
    const cfg = S.applyLessonTemplate(S.toLessonTemplate(CONFIG, {}));
    expect(cfg.globalSettings.gradeLevel).toBe('5th Grade');
  });
});

describe('the template library', () => {
  const makeStore = () => {
    const mem = {};
    return { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, _mem: mem };
  };

  it('saves, lists and reloads', () => {
    const lib = S.createLessonTemplateLibrary(makeStore());
    const t = S.toLessonTemplate(CONFIG, { id: 'tpl-1', name: 'Mine' });
    expect(lib.save(t)).toBeTruthy();
    expect(lib.list()).toHaveLength(1);
    expect(lib.get('tpl-1').name).toBe('Mine');
  });

  it('overwrites by id rather than duplicating', () => {
    const lib = S.createLessonTemplateLibrary(makeStore());
    lib.save(S.toLessonTemplate(CONFIG, { id: 'tpl-1', name: 'v1' }));
    lib.save(S.toLessonTemplate(CONFIG, { id: 'tpl-1', name: 'v2' }));
    expect(lib.list()).toHaveLength(1);
    expect(lib.get('tpl-1').name).toBe('v2');
  });

  it('puts the newest first', () => {
    const lib = S.createLessonTemplateLibrary(makeStore());
    lib.save(S.toLessonTemplate(CONFIG, { id: 'a', name: 'A' }));
    lib.save(S.toLessonTemplate(CONFIG, { id: 'b', name: 'B' }));
    expect(lib.list().map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('removes', () => {
    const lib = S.createLessonTemplateLibrary(makeStore());
    lib.save(S.toLessonTemplate(CONFIG, { id: 'a' }));
    expect(lib.remove('a')).toBe(true);
    expect(lib.list()).toEqual([]);
    expect(lib.remove('nope')).toBe(false);
  });

  it('ignores a library from another version rather than mis-reading it', () => {
    const store = makeStore();
    store.setItem('alloflow_lesson_templates_v1', JSON.stringify({ v: 99, templates: [{ id: 'x' }] }));
    expect(S.createLessonTemplateLibrary(store).list()).toEqual([]);
  });

  it('survives corrupt storage', () => {
    const store = makeStore();
    store.setItem('alloflow_lesson_templates_v1', '{not json');
    expect(() => S.createLessonTemplateLibrary(store).list()).not.toThrow();
    expect(S.createLessonTemplateLibrary(store).list()).toEqual([]);
  });

  it('works with no storage at all', () => {
    const lib = S.createLessonTemplateLibrary(null);
    expect(() => lib.list()).not.toThrow();
  });
});

// ── Copy-sync guardrail ──
describe('template library copy-sync', () => {
  it.each(['agent_core_blueprint_service_module.js',
           'desktop/web-app/public/agent_core_blueprint_service_module.js'])(
    '%s carries the lesson template API', (file) => {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(src).toContain('LESSON_TEMPLATE_LIBRARY_KEY');
      expect(src).toContain('toLessonTemplate');
      expect(src).toContain('applyLessonTemplate');
      // The whole point: templates must not carry lesson DNA.
      expect(src).toContain('no lessonDNA key at all');
    });
});

// ── Host wiring guardrails ──
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
describe('template host wiring', () => {
  it.each(HOSTS)('%s wires save / apply / delete', (file) => {
    const src = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(src).toContain('const handleSaveLessonTemplate');
    expect(src).toContain('const handleApplyLessonTemplate');
    expect(src).toContain('const handleDeleteLessonTemplate');
    expect(src).toContain('lessonTemplates, handleSaveLessonTemplate');
  });

  // The documented trap from the library core: templates reuse uiIds, so a run
  // record left from the previous plan would render as though it described this
  // one — landed badges on rows that have never been generated.
  it.each(HOSTS)('%s clears the run record when applying a template', (file) => {
    const src = readFileSync(resolve(process.cwd(), file), 'utf8');
    const fn = src.slice(src.indexOf('const handleApplyLessonTemplate'),
                         src.indexOf('const handleDeleteLessonTemplate'));
    expect(fn.length).toBeGreaterThan(0);
    expect(fn).toContain('setBlueprintExecutionResult(null)');
    expect(fn).toContain('setActiveBlueprint(');
  });
});

describe('template modal wiring', () => {
  it.each(['view_misc_modals_source.jsx', 'view_misc_modals_module.js',
           'desktop/web-app/public/view_misc_modals_module.js'])('%s renders the picker', (file) => {
    const src = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(src).toContain('bp-template-picker');
    // Only when no plan is active.
    expect(src).toMatch(/!activeBlueprint && Array\.isArray\(lessonTemplates\)/);
    // Save handler reaches BOTH card mounts.
    expect((src.match(/onSaveTemplate/g) || []).length).toBe(2);
  });
});
