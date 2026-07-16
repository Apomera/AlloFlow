import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const TOOL_PATHS = [
  'stem_lab/stem_tool_spacestation.js',
  'prismflow-deploy/public/stem_lab/stem_tool_spacestation.js',
];

describe('space station tool', () => {
  it('registers the plugin with quest hooks and all six tabs', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("window.StemLab.registerTool('spaceStation'");
      expect(source).toContain('questHooks');
      // Six tabs
      ['map', 'day', 'systems', 'orbit', 'history', 'quiz'].forEach((tabId) => {
        expect(source).toContain("id: '" + tabId + "'");
      });
      // Self-guarding module pattern
      expect(source).toContain("if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;");
    });
  });

  it('models the real station: 13 modules of accurate vintage and physics', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      const moduleIds = ['zarya', 'unity', 'zvezda', 'destiny', 'quest', 'harmony', 'columbus', 'kibo', 'tranquility', 'cupola', 'leonardo', 'nauka', 'truss'];
      moduleIds.forEach((id) => expect(source).toContain("id: '" + id + "'"));
      // Anchor facts kept accurate
      expect(source).toContain('Nov 20, 1998');            // Zarya launch
      expect(source).toContain('Nov 2, 2000');             // continuous habitation
      expect(source).toContain('7.66 km/s');               // orbital speed
      expect(source).toContain('98%');                     // water recovery milestone
      expect(source).toContain('Sabatier');                // CO2 -> water loop
      expect(source).toContain('Whipple');                 // debris shielding
      expect(source).toContain('Control Moment Gyroscopes');
      // Real orbital mechanics, not hardcoded outputs
      expect(source).toContain('var GM = 398600.4418');
      expect(source).toContain('Math.sqrt(GM / orbitR)');
      // Future plans stay hedged
      expect(source).toContain('Planned retirement');
      expect(source).toContain('Deorbit Vehicle');
    });
  });

  it('keeps the 3-D canvas accessible and self-cleaning', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('prefers-reduced-motion');
      expect(source).toContain("role: 'application'");
      expect(source).toContain('cv._issCleanup = cleanup');
      expect(source).toContain('if (!cv.isConnected) { cleanup(); return; }');
      // Module inspection works without the canvas (keyboard/AT path)
      expect(source).toContain("'aria-pressed': on");
      expect(source).toContain("role: 'tablist'");
    });
  });

  it('ships the docking sim, EVA game, and interior views with honest physics', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Missions tab exists
      expect(source).toContain("id: 'missions'");
      // Docking sim runs real Clohessy-Wiltshire coupling, toggleable for contrast
      expect(source).toContain('Clohessy-Wiltshire');
      expect(source).toContain('3 * N_ORBIT * N_ORBIT * st.x + 2 * N_ORBIT * st.vy');
      expect(source).toContain('-2 * N_ORBIT * st.vx');
      expect(source).toContain('exaggerated');            // time-scaling disclosed honestly
      expect(source).toContain('dockRealMode');
      // No per-frame React state: game state lives on the canvas element
      expect(source).toContain('cv._dockState = st');
      expect(source).toContain('cv._dockCleanup = cleanup');
      // EVA enforces the two-tether rule and consumables budget
      expect(source).toContain('Moved WITHOUT clipping ahead');
      expect(source).toContain('tetherA');
      expect(source).toContain('Suit consumables');
      // Interior views wired to their modules
      expect(source).toContain('renderCupolaInterior');
      expect(source).toContain('renderSleepInterior');
      expect(source).toContain("selModule.id === 'cupola' ? renderCupolaInterior()");
      // New quest hooks
      expect(source).toContain("id: 'iss_dock'");
      expect(source).toContain("id: 'iss_eva'");
    });
  });

  it('is registered in the catalog, loader lists, and build manifest', () => {
    const moduleSrc = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(moduleSrc).toContain("id: 'spaceStation'");
    expect(moduleSrc).toContain('spaceStation: true');

    ['AlloFlowANTI.txt', 'prismflow-deploy/src/AlloFlowANTI.txt', 'prismflow-deploy/src/App.jsx', 'build.js'].forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src, p + ' should load the space station tool').toContain("'stem_lab/stem_tool_spacestation.js'");
    });
  });
});
