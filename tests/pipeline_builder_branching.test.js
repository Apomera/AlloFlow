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
    expect(rendererSource).toContain('connectsTo: (branch.connections || []).map(connection => connection.target)');
    expect(gamesSource).toContain('connectsTo: getStepTargets(i)');
    expect(gamesSource).toContain('items: Array.isArray(s.items) ? s.items : []');
  });

  it('allows separate branches to converge on one target', () => {
    expect(gamesSource).toContain('allow several branches to converge');
    expect(gamesSource).not.toContain('filtered = filtered.filter(c => c.toId !== nodeId)');
    expect(gamesSource).toContain('c.fromId === fromId && c.toId === toId');
  });

  it('teaches the generator a valid zero-based fork and merge example', () => {
    expect(generatorSource).toContain("'connections':[{'target':1,'label':'Yes'},{'target':2,'label':'No'}]");
    expect(generatorSource).toContain("'Path A','items':['Do A'],'connections':[{'target':3,'label':''}]");
    expect(generatorSource).toContain("'Path B','items':['Do B'],'connections':[{'target':3,'label':''}]");
  });

  it('marks decision and merge paths in the static organizer', () => {
    expect(rendererSource).toContain('const FlowTopologyBoard');
    expect(rendererSource).toContain("t('outline.paths_merge_here')");
    expect(rendererSource).toContain("t('outline.decision_point')");
    expect(rendererSource).toContain('const ranks = Array(nodeCount).fill(null)');
    expect(rendererSource).toContain('markerEnd={\'url(#\' + markerId + \')\'}');
  });

  it('keeps a branch source active until all outgoing paths are selected', () => {
    expect(gamesSource).toContain('const remainingBranches = Math.max(0, requiredOut - outgoingTargets.size)');
    expect(gamesSource).toContain('setConnectingFrom(remainingBranches > 0 ? connectingFrom : null)');
    expect(gamesSource).toContain('setKeyboardSelectedId(remainingBranches > 0 ? keyboardSelectedId : null)');
  });

  it('reports missing paths, aggregates mixed edge results, and prevents score farming', () => {
    expect(gamesSource).toContain('const missingCount = Math.max(0, totalRequired - correctCount)');
    expect(gamesSource).toContain('incidentResults.every(result => result.correct)');
    expect(gamesSource).toContain('rewardedConnectionKeysRef.current.has(connKey)');
    expect(gamesSource).toContain('const points = newlyCorrectCount * 20 - incorrectCount * 5');
    expect(gamesSource).toContain("const retryGuidance = incorrectCount > 0");
  });

  it('cancels delayed validation cleanup when data resets, replay starts, or the game closes', () => {
    expect(gamesSource).toContain('const validationTimerRef = useRef(null)');
    expect(gamesSource).toContain('validationTimerRef.current = window.setTimeout');
    expect(gamesSource).toContain('window.clearTimeout(validationTimerRef.current)');
    expect(gamesSource).toContain('validationTimerRef.current = null');
  });
});
