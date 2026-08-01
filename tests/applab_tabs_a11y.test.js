import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_applab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_applab.js');

describe('App Lab tabs and panels accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides roving focus and full keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('var appLabTabKeyDown = function(e, index)');
    expect(source).toContain("id: 'applab-tab-' + t.id");
    expect(source).toContain("'aria-controls': 'applab-panel-' + t.id");
    expect(source).toContain('tabIndex: isActive ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { appLabTabKeyDown(e, ti); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('labels and focuses every tab panel, including Build', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    for (const id of ['learn', 'practice', 'patterns', 'quality', 'career', 'build']) {
      expect(source).toContain(`id: 'applab-panel-${id}'`);
      expect(source).toContain(`'aria-labelledby': 'applab-tab-${id}'`);
    }
    expect(source).toContain('role: \'tabpanel\'');
    expect(source).toContain('tabIndex: 0');
  });
});
