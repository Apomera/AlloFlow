import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_echolocation.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_echolocation.js');

describe('Echolocation 3D cave accessibility', () => {
  it('names the dynamically created 3D canvas', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("cnv.setAttribute('role', 'img');");
      expect(source).toContain("cnv.setAttribute('aria-label', t('stem.echolocation.cave_3d_visualization'");
    }
  });

  it('keeps 2D dive velocity in time-based pixel units', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('var fallSpeedLimit = isDiving ? Math.max(MAX_FALL_SPEED, 120) : MAX_FALL_SPEED;');
      expect(source).toContain('st.batVy = Math.max(st.batVy + 240 * dt, 90);');
      expect(source).not.toContain('st.batVy += 2 * dt * 60;');
    }
    const dt = 1 / 60;
    const downwardVelocity = Math.min(120, Math.max(-200 + 240 * dt, 90)) * 0.98;
    expect(downwardVelocity * dt).toBeGreaterThan(1);
  });

  it('initializes 3D energy and retry state before consuming it', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      const drainDeclaration = source.indexOf('var currentDrain = eng.energyDrain * difficultyMult;');
      const drainUse = source.indexOf('eng.energy -= currentDrain');
      const restart = source.indexOf("if (eng.gameOver && eng.keys['KeyR'])");
      const gameOverReturn = source.indexOf('if (eng.gameOver) {', restart + 1);
      expect(drainDeclaration).toBeGreaterThan(-1);
      expect(drainDeclaration).toBeLessThan(drainUse);
      expect(restart).toBeGreaterThan(-1);
      expect(restart).toBeLessThan(gameOverReturn);
      expect(source).toContain("if (typeof il2.dispose === 'function') il2.dispose();");
    }
  });

  it('makes 3D load and WebGL retries restart their lifecycles', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('[tab, threeLoaded, cave3dRetryNonce]');
      expect(source).toContain('setCave3dRetryNonce(function(n) { return n + 1; });');
      expect(source).toContain('_threeAttempt: ((prev && prev._threeAttempt) || 0) + 1');
      expect(source).toContain("t('stem.echolocation.retry_loading_3d_engine', 'Retry loading 3D engine')");
    }
  });

  it('registers advertised 3D movement keys and cleans global resources', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('ShiftLeft: 1, ShiftRight: 1');
      expect(source).toContain("eng.keys['KeyW'] || eng.keys['ArrowUp']");
      expect(source).toContain("eng.keys['KeyS'] || eng.keys['ArrowDown']");
      expect(source).toContain("document.removeEventListener('pointerlockchange', eng._pointerLockChange);");
      expect(source).toContain('if (eng.renderer && eng.renderer.dispose) eng.renderer.dispose();');
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
