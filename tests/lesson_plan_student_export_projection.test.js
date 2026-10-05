import { it, expect } from 'vitest';
import fs from 'node:fs';
const source = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
const start = source.indexOf("      } else if (item.type === 'lesson-plan') {") + "      } else if (item.type === 'lesson-plan') {".length;
const end = source.indexOf("      } else if (item.type === 'alignment-report')", start);
const render = new Function('item', 'isTeacher', 'window', 't', 'isIndependentMode', 'isParentMode', 'currentUiLanguage', 'UI_STRINGS', 'parseMarkdownToHTML', 'isRtlLang', '_docIsStudentGuide', 'tv', 'enhancedHeader', 'cfg', source.slice(start, end));
const plan = { id: 'p', type: 'lesson-plan', config: { generationInputs: { mode: 'teacher' } }, data: { objectives: ['Compare evidence'], materialsNeeded: ['Paper'], directInstruction: 'PRIVATE teacher dialogue; expected answer', activities: [{ title: 'Evidence', studentTask: 'Write a comparison', description: 'Use two observations', teacherDialogue: 'PRIVATE activity answer' }] } };
const run = (item, teacher, audience = 'student') => render(item, teacher, {}, key => key, false, false, 'English', {}, text => text, () => false, item => ['study', 'family'].includes(item.config?.generationInputs?.mode), { color: 'blue' }, 'Header', { audience });
it('actual lesson export retains teacher narrative only in teacher copy and learner activities in student copy', () => {
  expect(run(plan, true)).toContain('PRIVATE teacher dialogue');
  expect(run(plan, false, 'teacher')).toContain('PRIVATE teacher dialogue');
  const html = run(plan, false);
  expect(html).not.toContain('PRIVATE');
  expect(html).toContain('Compare evidence');
  expect(html).toContain('Use two observations');
  expect(html).toContain('Teacher narrative sections are omitted');
});
it('actual study/family exports preserve learner prose', () => {
  for (const mode of ['study', 'family']) {
    const html = run({ ...plan, config: { generationInputs: { mode } }, data: { objectives: ['Read'], directInstruction: 'Study the example', materialsNeeded: [] } }, false);
    expect(html).toContain('Study the example');
    expect(html).not.toContain('Teacher narrative sections are omitted');
  }
});
