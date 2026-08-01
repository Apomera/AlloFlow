import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Nutrition Lab text-entry dialog accessibility', () => {
  it('keeps mirrors aligned and replaces both native answer prompts', () => {
    const source = readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_nutritionlab.js', 'utf8')).toBe(source);
    expect(source).not.toContain("prompt('Coach said:'");
    expect(source).not.toContain("prompt('Answer:'");
    expect(source).not.toContain('window.prompt(');
    expect(source).toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).toContain('window.AlloFlowUX && window.AlloFlowUX.prompt');
    expect(source).toContain('maxLength: 500');
    expect(source).toContain('Answer entry is unavailable');
  });
});
