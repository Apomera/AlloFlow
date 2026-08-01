import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Play Lab dialog accessibility', () => {
  it('uses shared prompt/confirmation dialogs for player names and saved plays', () => {
    const source = readFileSync('stem_lab/stem_tool_playlab.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_playlab.js', 'utf8')).toBe(source);
    expect(source).not.toContain('window.prompt(');
    expect(source).not.toContain('typeof window.prompt');
    expect(source).not.toContain("confirm('Delete saved play");
    expect(source).not.toContain('window.confirm(');
    expect(source).toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).toContain('window.AlloModules.ConfirmDialog.ConfirmDialog');
    expect(source).toContain('maxLength: 30');
    expect(source).toContain('Keep play');
  });
});
