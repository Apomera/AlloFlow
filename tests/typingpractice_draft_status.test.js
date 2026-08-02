import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const sourcePath = 'stem_lab/stem_tool_typingpractice.js';
const mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js';

describe('Typing Lab private draft status cue', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('shows a quiet local-save cue only for the active resumable draft', () => {
    expect(source).toContain("interruptedDraftMatches(state.interruptedDrill, activeDrill && activeDrill.id, state.drillRunId)");
    expect(source).toContain("typedLength < 1");
    expect(source).toContain("'aria-label': 'Private resume draft saved locally'");
    expect(source).toContain("title: 'Private resume draft saved locally'");
    expect(source).toContain("}, 'Draft saved');");
  });

  it('keeps the deployed mirror byte-identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
