import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fireecology.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_fireecology.js');

describe('Fire Ecology inline panel accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes the glossary as a labeled focusable region', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'region', 'aria-labelledby': 'fireecology-glossary-title', tabIndex: 0");
    expect(source).toContain("id: 'fireecology-glossary-title'");
    expect(source).not.toContain("role: 'dialog', 'aria-modal': 'true', 'aria-label': t('stem.fireecology.wabanaki_vocabulary_glossary'");
  });

  it('exposes cultural deep-dives as labeled focusable regions', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'region',\n              'aria-labelledby': 'fireecology-deep-dive-title-' + def.id,\n              tabIndex: 0");
    expect(source).toContain("id: 'fireecology-deep-dive-title-' + def.id");
    expect(source).not.toContain("'aria-label': 'Cultural deep-dive: ' + def.name");
    expect(source).toContain("'aria-label': t('stem.fireecology.hypothesis_input', 'Fire regime hypothesis')");
    expect(source).toContain("'aria-label': t('stem.fireecology.explanation_input', 'Fire regime explanation')");
  });
});
