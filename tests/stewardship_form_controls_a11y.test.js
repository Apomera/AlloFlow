import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_stewardship.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_stewardship.js');

describe('Stewardship inquiry form accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides accessible names for campaign reflection fields', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("htmlFor: inquiryId + '-hypothesis'");
    expect(source).toContain("'data-stewardship-inquiry-field': 'hypothesis'");
    expect(source).toContain("htmlFor: inquiryId + '-explanation'");
    expect(source).toContain("'data-stewardship-inquiry-field': 'explanation'");
  });
});
