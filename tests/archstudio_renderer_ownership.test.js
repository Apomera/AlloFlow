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

  it('grows voxel capacity geometrically without exceeding the authoring limit', () => {
    for (const file of archBundles) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain(
        'capacity = Math.min(ARCH_MAX_BLOCKS, Math.max(64, cubeCount, capacity ? capacity * 2 : 64));',
      );
    }
  });

  it('refits the camera after a renderer resize changes its aspect', () => {
    for (const file of archBundles) {
      const source = fs.readFileSync(file, 'utf8');
      const resizeStart = source.indexOf('function resize()');
      const frameStart = source.indexOf('function frame()', resizeStart);
      expect(resizeStart).toBeGreaterThan(-1);
      expect(frameStart).toBeGreaterThan(resizeStart);

      const resizeBody = source.slice(resizeStart, frameStart);
      expect(resizeBody).toContain('camera.aspect = w / hh;');
      expect(resizeBody).toContain("appliedCamSig = '';");
    }
  });

  it('keys model updates by resolved render colors without rebuilding for blueprint camera changes', () => {
    for (const file of archBundles) {
      const source = fs.readFileSync(file, 'utf8');
      const renderBlocksStart = source.indexOf('var archRenderBlocks = mainUse3d ? archDisplayBlocks.map');
      const signatureStart = source.indexOf('sig: archRenderBlocks.map', renderBlocksStart);
      const signatureEnd = source.indexOf('\n      });', signatureStart);
      expect(renderBlocksStart).toBeGreaterThan(-1);
      expect(signatureStart).toBeGreaterThan(renderBlocksStart);
      expect(signatureEnd).toBeGreaterThan(signatureStart);

      const renderBlocksBody = source.slice(renderBlocksStart, signatureStart);
      const signatureBody = source.slice(signatureStart, signatureEnd);
      expect(renderBlocksBody).toContain('hex: archHexFor(b)');
      expect(signatureBody).toContain('b.hex');
      expect(signatureBody).not.toContain('|view:');
      expect(signatureBody).not.toContain('blueprintView');
    }
  });

  it('submits renderer work only while the main three-dimensional editor is active', () => {
    for (const file of archBundles) {
      const source = fs.readFileSync(file, 'utf8');
      const mainUseStart = source.indexOf("var mainUse3d = archShow3d && editorView !== 'grid';");
      const submitGuardStart = source.indexOf('if (mainUse3d) {', mainUseStart);
      const submitStart = source.indexOf('ArchGL.submit({', submitGuardStart);
      expect(mainUseStart).toBeGreaterThan(-1);
      expect(submitGuardStart).toBeGreaterThan(mainUseStart);
      expect(submitStart).toBeGreaterThan(submitGuardStart);

      const guardedSubmit = source.slice(submitGuardStart, submitStart + 'ArchGL.submit({'.length);
      expect(guardedSubmit).not.toContain('if (archShow3d)');
      expect(source.slice(submitStart, source.indexOf('\n      });', submitStart))).toContain('blocks: archRenderBlocks');
    }
  });
});
