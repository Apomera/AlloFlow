import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

function prompt(customAdditions) {
  const context = { window: { AlloModules: {} } };
  vm.runInNewContext(fs.readFileSync('prompts_library_source.jsx', 'utf8'), context);
  return context.window.AlloModules.createPromptsLibrary({}).buildLessonPlanPrompt({
    context: 'Reading about plants.', language: 'English', gradeLevel: 'Grade 4', sourceTopic: 'Plants', customAdditions,
  });
}

describe('lesson duration and custom constraint precedence', () => {
  it.each(['10-minute lesson; no devices', '20 minutes total; partner work only', 'Use large print and no timed competition'])('applies %s to the whole lesson', custom => {
    const text = prompt(custom);
    expect(text).toContain(`USER CUSTOM REQUESTS FOR THE ENTIRE LESSON: "${custom}"`);
    expect(text).toContain('Apply these requests to every applicable section');
    expect(text).toContain('The five estimates MUST add up to the explicitly requested overall lesson duration');
    expect(text).toContain('Keep extensions optional and outside the core duration');
    expect(text).toContain('typically 10-15 mins when no overall duration is requested');
  });
  it('retains a default period without inventing user constraints', () => {
    const text = prompt('');
    expect(text).not.toContain('USER CUSTOM REQUESTS FOR THE ENTIRE LESSON');
    expect(text).toContain('Otherwise, use one realistic class period');
    expect(text).toContain('typically 40-60 minutes');
  });
});
