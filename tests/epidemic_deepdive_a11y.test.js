import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_epidemic.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_epidemic.js');

describe('Epidemic Lab inline deep-dive accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('does not expose an inline region as a modal dialog', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'region', 'aria-labelledby': 'epidemic-deep-dive-title-' + def.id");
    expect(source).toContain("id: 'epidemic-deep-dive-title-' + def.id");
    expect(source).toContain('tabIndex: 0');
    expect(source).not.toContain("role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Demographic deep-dive: ' + def.name");
    expect(source).toContain("'aria-label': __alloT('stem.epidemic.explanation_input', 'Epidemic regime explanation')");
  });
});
