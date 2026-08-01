import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Lumen confirmation dialog accessibility', () => {
  it('keeps mirrors aligned and removes native export/data confirms', () => {
    const source = readFileSync('stem_lab/stem_tool_lumen.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_lumen.js', 'utf8')).toBe(source);
    expect(source).not.toContain('window.confirm(');
    expect(source).not.toContain('typeof window !== \'undefined\' && window.confirm');
    expect(source).toContain('window.AlloModules.ConfirmDialog.ConfirmDialog');
    expect(source).toContain('window.AlloFlowUX && window.AlloFlowUX.confirm');
    expect(source).toContain('Confirm identifiable brief export');
    expect(source).toContain('Clear all data points');
  });
});
