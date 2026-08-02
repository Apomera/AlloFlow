import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('Queen-to-Drone causal carryover', () => {
  it('makes a Queen victory change the Drone preflight story', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'drone', queen: { result: 'victory' } },
    });

    expect(html).toContain('data-drone-carryover-brief="true"');
    expect(html).toContain('Command evidence carried forward');
    expect(html).toContain('Victory route');
    expect(html).toContain('Queen signal ~12% closer');
    expect(html).toContain('One fewer predator bird');
  });

  it('names an unresolved command outcome instead of hiding the missing handoff', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'drone', queen: {} },
    });

    expect(html).toContain('Unresolved command route');
    expect(html).toContain('Finish a command match');
    expect(html).toContain('Inherited Queen RTS route modifiers');
  });
});
