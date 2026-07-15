import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const source = read('view_renderers_source.jsx');
const host = read('AlloFlowANTI.txt');

describe('interactive concept-map keyboard accessibility', () => {
  it('makes HTML concept nodes focusable, named, and keyboard operable', () => {
    expect(source).toContain('const handleAccessibleNodeKeyDown = (e, node) =>');
    expect(source).toContain('role="button"');
    expect(source).toContain('aria-label={node.text}');
    expect(source).toContain('aria-pressed={connectingSourceId === node.id}');
    expect(source).toContain('onKeyDown={(e) => handleAccessibleNodeKeyDown(e, node)}');
    expect(source).toContain("ArrowLeft: [-1, 0]");
    expect(source).toContain("e.key === 'Delete' || e.key === 'Backspace'");
  });

  it('gives SVG flow nodes equivalent keyboard behavior', () => {
    expect(host).toContain("role: 'button'");
    expect(host).toContain("'aria-label': text");
    expect(host).toContain("'aria-pressed': isSelected");
    expect(host).toContain('onKeyDown,');
    expect(host).toContain("ArrowDown: [0, 1]");
  });

  it('supports keyboard link deletion and WCAG 2.2 minimum targets', () => {
    expect(source).toContain('role={!isMapLocked ? "button" : undefined}');
    expect(source).toContain("handleDeleteEdge(edge.id)");
    expect(source.match(/stroke="transparent" strokeWidth="24"/g) || []).toHaveLength(2);
    expect(source).toContain('min-w-6 min-h-6');
    expect(host).toContain('<circle r="12"');
  });
});
