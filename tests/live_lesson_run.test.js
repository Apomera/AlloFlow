import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
let moduleApi;

beforeAll(() => {
  const windowStub = {
    React: {
      createElement: () => null,
      Fragment: Symbol('Fragment'),
    },
  };
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_module.js'), 'utf8'))(windowStub);
  moduleApi = windowStub.AlloModules.LiveLessonRun;
});

describe('Live Lesson Run sequence helpers', () => {
  it('delegates eligibility to the existing student-safe filter and preserves History order', () => {
    const history = [
      { id: 'one', type: 'simplified' },
      { id: 'teacher', type: 'analysis' },
      { id: 'two', type: 'quiz' },
    ];
    const studentSafe = vi.fn(items => items.filter(item => item.type !== 'analysis'));

    const steps = moduleApi.buildLiveLessonSteps(history, studentSafe);

    expect(studentSafe).toHaveBeenCalledTimes(1);
    expect(studentSafe).toHaveBeenCalledWith(history);
    expect(steps.map(item => item.id)).toEqual(['one', 'two']);
    expect(steps[0]).toBe(history[0]);
  });

  it('fails closed when the shared student-safe filter is unavailable', () => {
    expect(moduleApi.buildLiveLessonSteps([{ id: 'one', type: 'quiz' }], null)).toEqual([]);
  });

  it('prefers the teacher-open item, then falls back to the session pointer', () => {
    const steps = [
      { id: 'one', type: 'simplified' },
      { id: 'two', type: 'quiz' },
      { id: 'three', type: 'faq' },
    ];
    expect(moduleApi.resolveLiveLessonIndex(steps, 'two', 'one')).toBe(1);
    expect(moduleApi.resolveLiveLessonIndex(steps, 'missing', 'three')).toBe(2);
    expect(moduleApi.resolveLiveLessonIndex(steps, 'missing', 'also-missing')).toBe(-1);
  });

  it('starts at the first item and stops cleanly at sequence boundaries', () => {
    expect(moduleApi.adjacentLiveLessonIndex(3, -1, 'next')).toBe(0);
    expect(moduleApi.adjacentLiveLessonIndex(3, 0, 'previous')).toBe(-1);
    expect(moduleApi.adjacentLiveLessonIndex(3, 0, 'next')).toBe(1);
    expect(moduleApi.adjacentLiveLessonIndex(3, 2, 'next')).toBe(-1);
  });
});

describe('Live Session Center integration', () => {
  it('loads the component through the existing module loader', () => {
    expect(anti).toContain("loadModule('LiveLessonRun'");
    expect(anti).toContain('window.AlloModules.LiveLessonRun.LiveLessonRunPanel');
  });

  it('reuses active-unit History order, the one safety filter, and handleRestoreView', () => {
    expect(anti).toContain('history: getFilteredHistory()');
    expect(anti).toContain('getStudentSafeResources: _alloStudentSafeResources');
    expect(anti).toContain('handleRestoreView(item);');
  });
});
