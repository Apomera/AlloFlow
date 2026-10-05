import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const source = fs.readFileSync('session_transport_module.js', 'utf8');
const window = {};
new Function('window', source)(window);
const transport = window.AlloModules.SessionTransport;
describe('structured learner lesson projection', () => {
  it('keeps student tasks and removes teacher dialogue and expected answers recursively', () => {
    const data = { directInstruction: { text: 'Observe the diagram', teacherDialogue: 'Tell the answer', expectedResponses: ['answer'], steps: [{ text: 'Compare shapes', expectedResponse: 'same' }] }, successCriteria: [{ statement: 'I compare', criterionId: 'private' }], teachingScript: 'private' };
    expect(transport.projectStudentGuideData(data)).toEqual({ directInstruction: { text: 'Observe the diagram', steps: [{ text: 'Compare shapes' }] }, successCriteria: [{ statement: 'I compare' }] });
    expect(data.directInstruction.expectedResponses).toEqual(['answer']);
  });
  it('preserves study/family delivery while keeping teacher plans off transport', () => {
    for (const mode of ['study', 'family']) {
      const plan = { id: mode, type: 'lesson-plan', config: { generationInputs: { version: 1, mode } }, data: { hook: 'Read and wonder', closure: { en: 'Reflect', teacherGuide: 'private' } } };
      expect(transport.projectStudentGuide(plan).data).toEqual({ hook: 'Read and wonder', closure: { en: 'Reflect' } });
    }
    expect(transport.projectStudentGuide({ id: 'teacher', type: 'lesson-plan', config: { generationInputs: { mode: 'teacher' } }, data: { hook: 'private' } })).toBeNull();
  });
});

it('omits unstructured teacher narrative while preserving explicit activities and study prose', () => {
  const data = { objectives: ['Compare evidence'], directInstruction: 'Teacher: give the expected answer', independentPractice: 'Teacher script mixed with learner task', activities: [{ studentTask: 'Write a comparison', teacherDialogue: 'Answer key' }] };
  expect(transport.projectStudentGuideData(data, 'teacher')).toEqual({ objectives: ['Compare evidence'], activities: [{ studentTask: 'Write a comparison' }] });
  expect(transport.projectStudentGuideData(data, 'study').directInstruction).toBe(data.directInstruction);
});
