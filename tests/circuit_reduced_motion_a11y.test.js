import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_circuit.js');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_circuit.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Circuit Lab reduced-motion accessibility', () => {
  it('disables every utility pulse and entry animation under reduced motion', () => {
    const pulseLines = source.split('\n').filter((line) => line.includes('animate-pulse'));
    const entryLines = source.split('\n').filter((line) => line.includes('animate-in fade-in'));

    expect(pulseLines).toHaveLength(4);
    expect(entryLines).toHaveLength(3);
    for (const line of pulseLines.concat(entryLines)) {
      expect(line).toContain('motion-reduce:animate-none');
    }
  });

  it('explicitly removes custom keyframe and hover movement', () => {
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain(
      '.circ-signal-pulse, .circ-electron-drift, .circuit-card, .circuit-badge, .circuit-active, .circuit-short, .short-active-flash { animation: none !important; }',
    );
    expect(source).toContain('.glow-button { transition: none !important; }');
    expect(source).toContain('.glow-button:hover { transform: none !important; }');
  });

  it('retains JavaScript gates for electron and spark animation loops', () => {
    expect(source).toContain('if (current > 0.001 && !isShort && !_prefersReducedMotion)');
    expect(source).toContain('if (!sparkActive || sparkRaf || _prefersReducedMotion || isCircuitSparkHidden()) return;');
    expect(source).toContain("var reduced = _prefersReducedMotion;");
    expect(source).toContain("className: reduced ? '' : 'circ-signal-pulse'");
    expect(source).toContain("className: reduced ? '' : 'circ-electron-drift'");
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
