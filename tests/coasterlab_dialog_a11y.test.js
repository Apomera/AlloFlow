import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Coaster Lab dialog accessibility', () => {
  it('keeps mirrored deploy files aligned and removes native prompts/confirms', () => {
    const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_coasterlab.js', 'utf8')).toBe(source);
    expect(source).not.toContain('window.prompt(');
    expect(source).not.toContain('window.confirm(');
    expect(source).not.toContain("typeof window.prompt");
    expect(source).not.toContain("typeof window.confirm");
    expect(source).toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).toContain('window.AlloModules.ConfirmDialog.ConfirmDialog');
    expect(source).toContain('clabPrompt');
    expect(source).toContain('clabConfirm');
  });
});
