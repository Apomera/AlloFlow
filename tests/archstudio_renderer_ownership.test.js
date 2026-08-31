import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const hostBundles = [
  path.resolve(process.cwd(), 'stem_lab/stem_lab_module.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_lab_module.js'),
];

const archBundles = [
  path.resolve(process.cwd(), 'stem_lab/stem_tool_archstudio.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'),
];

describe('Architecture Studio renderer ownership', () => {
  it('keeps the legacy shell renderer off the ArchGL-owned canvas', () => {
    for (const file of hostBundles) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("if (cnv.getAttribute('data-arch-gl') === 'true') return;");
    }
  });

  it('aligns picking, recovers lost contexts, and rejects stale async mounts', () => {
    for (const file of archBundles) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('groundMesh.position.x = (xStart + xEnd) / 2');
      expect(source).toContain('groundMesh.position.z = (zStart + zEnd) / 2');
      expect(source).toContain("addEventListener('webglcontextlost', handleContextLost");
      expect(source).toContain("addEventListener('webglcontextrestored', handleContextRestored");
      expect(source).toContain("if (state === 'recovering') fail('context-lost')");
      expect(source).toContain('var generation = ++mountGeneration');
      expect(source).toContain('generation !== mountGeneration || canvasEl !== el');
      expect(source).toContain('submit: function (m) { pending = m; scheduleFrame(); }');
      expect(source).toContain('function scheduleFrame()');
      expect(source).not.toContain('rafId = requestAnimationFrame(frame);\n      if (state !==');
    }
  });
});
