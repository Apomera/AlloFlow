import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const gamesSource = fs.readFileSync('games_source.jsx', 'utf8');
const rendererSource = fs.readFileSync('view_renderers_source.jsx', 'utf8');
const generatorSource = fs.readFileSync('generate_dispatcher_source.jsx', 'utf8');

describe('Pipeline Builder state and branching contract', () => {
  it('keeps a stable registered component type so host renders do not remount the game', () => {
    expect(rendererSource).toContain('? window.AlloModules.PipelineBuilderGame : _GameLoadingFallback');
    expect(rendererSource).not.toMatch(/const PipelineBuilderGame[^\n]+React\.memo/);
    expect(gamesSource).toContain('const pipelineDataRef = useRef(data)');
    expect(gamesSource).toContain('}, []);\n\n  // Serialize all game-relevant data');
  });

  it('passes generated branch destinations into the interactive game', () => {
    expect(rendererSource).toContain('connectsTo: Array.isArray(b.connectsTo) ? b.connectsTo : undefined');
    expect(gamesSource).toContain('connectsTo: getStepTargets(i)');
    expect(gamesSource).toContain('items: Array.isArray(s.items) ? s.items : []');
  });

  it('allows separate branches to converge on one target', () => {
    expect(gamesSource).toContain('allow several branches to converge');
    expect(gamesSource).not.toContain('filtered = filtered.filter(c => c.toId !== nodeId)');
    expect(gamesSource).toContain('c.fromId === fromId && c.toId === toId');
  });

  it('teaches the generator a valid zero-based fork and merge example', () => {
    expect(generatorSource).toContain("'connectsTo':[1,2]");
    expect(generatorSource).toContain("'Path A','items':['Do A'],'connectsTo':[3]");
    expect(generatorSource).not.toContain("'connectsTo':[2,3]");
    expect(generatorSource).not.toContain("'connectsTo':[4]");
  });

  it('marks decision and merge paths in the static organizer', () => {
    expect(rendererSource).toContain('const incomingPathCounts');
    expect(rendererSource).toContain("t('outline.paths_merge_here')");
    expect(rendererSource).toContain("t('outline.branches_to')");
    expect(rendererSource).toContain('!hasNonLinearFlow');
  });
});
