import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const sourcePath = 'stem_lab/stem_tool_multtable.js';
const mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_multtable.js';

describe('Multiplication Table reset dialog accessibility', () => {
  it('uses the shared confirmation dialog instead of native confirm()', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
    expect(source).not.toContain("confirm('Clear all mastery tracking?");
    expect(source).not.toContain('window.confirm(');
    expect(source).toContain('window.AlloModules.ConfirmDialog.ConfirmDialog');
    expect(source).toContain('window.AlloFlowUX && window.AlloFlowUX.confirm');
    expect(source).toContain('Keep mastery data');
    expect(source).toContain('Mastery tracking kept.');
  });
});
