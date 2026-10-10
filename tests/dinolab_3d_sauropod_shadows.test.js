import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error('Material fixture source boundary missing');
  return source.slice(from, to);
}
const construction = block('            var boneMat =', '            var markerMat =');
const opacityHandler = block('        function applyBodyOpacityValue(', '        function updateBodyOpacity(');
const noOp = () => {};

function materialRig(isSauropod, phong, opacity = 100) {
  const THREE = phong ? { ...T, MeshStandardMaterial: undefined, MeshPhysicalMaterial: undefined } : T;
  const maps = [new T.Texture(), new T.Texture(), new T.Texture()];
  const visualMaterialsRef = { current: null }, bodyOpacityRef = { current: opacity };
  const context = {
    THREE, isSauropod, bodyColor: '#819564', fieldPalette: { accent: '#8c8465', dark: '#343e30' },
    skinTexture: maps[0], skinBumpTexture: maps[1], skinRoughnessTexture: maps[2],
    lifeSurface: opacity >= 98, inferenceOpacity: opacity / 100, ht: 5, len: 18,
    integument: { pattern: 'subtle' }, props: { showBody: true },
    // Exercise both body-derived clones, even when a species has no feather coat.
    surfaceHypothesis: { filamentCoverage: 0.4 },
    dinoSkinMapping: noOp, dinoIrisShading: noOp, dinoKeratinShading: noOp, dinoCoatShading: noOp,
    visualMaterialsRef, bodyOpacityRef, setBodyOpacity: noOp,
    requestSceneRender: noOp, statusRef: { current: null }
  };
  const run = new Function(...Object.keys(context), 'var activeMaterialSet;\n' + construction + '\n' + opacityHandler + '\nreturn { materials: activeMaterialSet, updateOpacity: applyBodyOpacityValue };');
  return { ...run(...Object.values(context)), maps, bodyOpacityRef };
}

for (const phong of [false, true]) describe('Sauropod skin shadows with ' + (phong ? 'Phong fallback' : 'Standard materials'), () => {
  for (const isSauropod of [false, true]) {
    it('changes only the closed skin shadow side for sauropod=' + isSauropod, () => {
      const { materials: m, maps } = materialRig(isSauropod, phong);
      expect(m.body.shadowSide).toBe(isSauropod ? T.BackSide : null);
      expect(m.body.side).toBe(T.DoubleSide);
      expect(m.body.transparent).toBe(false);
      expect(m.body.depthWrite).toBe(true);
      expect(m.body.opacity).toBe(1);
      expect(m.body.map).toBe(maps[0]);
      expect(m.body.bumpMap).toBe(maps[1]);
      expect(m.body.type).toBe(phong ? 'MeshPhongMaterial' : 'MeshStandardMaterial');
      for (const [key, mat] of Object.entries(m)) {
        if (!mat || key === 'body') continue;
        expect(mat.shadowSide, key).toBe(null);
      }
      expect(m.scaleRelief).not.toBe(m.body);
      expect(m.contourCoat).not.toBe(m.body);
      expect(m.scaleRelief.side).toBe(T.DoubleSide);
      expect(m.contourCoat.side).toBe(T.DoubleSide);
      expect(m.scaleRelief.map).toBe(m.body.map);
      expect(m.contourCoat.map).toBe(m.body.map);
      expect(m.head.side).toBe(T.FrontSide);
      expect(m.feather.side).toBe(T.DoubleSide);
      expect(m.filament.side).toBe(T.DoubleSide);
    });
    it('preserves the policy through opacity threshold transitions for sauropod=' + isSauropod, () => {
      const rig = materialRig(isSauropod, phong, 28), m = rig.materials;
      for (const opacity of [97, 98, 100, 28, 98]) {
        rig.updateOpacity(opacity, false);
        expect(rig.bodyOpacityRef.current).toBe(opacity);
        expect(m.body.shadowSide).toBe(isSauropod ? T.BackSide : null);
        expect(m.body.side).toBe(T.DoubleSide);
        expect(m.body.opacity).toBe(opacity >= 98 ? 1 : opacity / 100);
        expect(m.body.depthWrite).toBe(opacity >= 98);
        expect(m.body.transparent).toBe(opacity < 98);
        expect(m.wire.opacity).toBe(opacity >= 98 ? 0 : 0.16);
        for (const [key, mat] of Object.entries(m)) {
          if (!mat || key === 'body') continue;
          expect(mat.shadowSide, key).toBe(null);
        }
      }
    });
  }
});
