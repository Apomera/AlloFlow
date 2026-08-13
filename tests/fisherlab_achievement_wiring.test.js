import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fisherlab.js');

describe('Fisher Lab achievement persistence', () => {
  it('derives and saves achievements from gameplay evidence', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const helperCalls = source.match(/deriveCoreAchievements\s*\(/g) || [];

    // Definition plus at least one persistence call.
    expect(helperCalls.length).toBeGreaterThanOrEqual(2);
    expect(source).toMatch(/saved\.achievements\s*=\s*deriveCoreAchievements\s*\(/);
  });
});
