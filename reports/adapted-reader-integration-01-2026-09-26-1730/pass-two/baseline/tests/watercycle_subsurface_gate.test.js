import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle vadose-zone and selected-recharge gate', () => {
  it('distinguishes soil pore water from groundwater in the 3D scene', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("makeProcessLabel3d('soil_pore_water', 'Soil pore water'");
      expect(source).toContain("makeProcessLabel3d('aquifer', 'Groundwater'");
      expect(source).toContain("river_runoff: 'river', infiltrating: 'soil_pore_water', aquifer_flow: 'aquifer'");
      expect(source).toContain("destination: 'Soil pore water'");
      expect(source).toContain("source: 'Groundwater', destination: 'Surface water or ocean discharge'");
      expect(source).toContain('infiltration does not automatically become groundwater recharge');
      expect(source).toContain('Many infiltrated parcels remain in soil or take other paths.');
    });
  });

  it('gates recharge, water-table storage, groundwater transfer, and discharge to aquifer states', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("var vadoseStorageActive3d = state3d === 'infiltrating' || state3d === 'infiltration';");
      expect(source).toContain("var aquiferRouteActive3d = state3d === 'aquifer_flow';");
      expect(source).toContain('var aquiferRechargeActive3d = aquiferRouteActive3d && journeyProgress3d < 0.34;');
      expect(source).toContain('var groundwaterTransferActive3d = aquiferRouteActive3d && !aquiferRechargeActive3d;');
      expect(source).toContain('var wettingFrontActive3d = vadoseStorageActive3d;');
      expect(source).toContain('waterTableRecharge3d.visible = aquiferRechargeActive3d;');
      expect(source).toContain('var groundwaterRechargeTarget3d = aquiferRouteActive3d');
      expect(source).toContain('var groundwaterStorageVisible3d = aquiferRouteActive3d;');
      expect(source).toContain('aquiferFlow3d.visible = groundwaterTransferActive3d;');
      expect(source).toContain('var groundwaterSeepActive3d = groundwaterTransferActive3d;');
      expect(source).toContain('var updateWaterTableSurface3d = groundwaterStorageVisible3d &&');
      expect(source).not.toContain('aquiferFlow3d.visible = infiltrationFlowActive3d;');
      expect(source).not.toContain('var groundwaterStorageVisible3d = infiltrationFlowActive3d;');
    });
  });

  it('reuses pooled percolation geometry with distinct shallow and deep spans', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const animateStart = source.indexOf('function animateJourney3d()');
      const cleanupStart = source.indexOf('function cleanupJourney3d()', animateStart);
      const setupSource = source.slice(0, animateStart);
      const animateSource = source.slice(animateStart, cleanupStart);

      expect(animateStart).toBeGreaterThan(-1);
      expect(cleanupStart).toBeGreaterThan(animateStart);
      expect(setupSource).toContain('var percolationCount3d = 42;');
      expect(setupSource).toContain('var percolationPositions3d = new Float32Array(percolationCount3d * 3);');
      expect(setupSource).toContain('var percolationGeometry3d = new THREE.BufferGeometry();');
      expect(setupSource).toContain('var soilPercolation3d = new THREE.Points(');
      expect(animateSource).toContain('var percolationVisualActive3d = vadoseStorageActive3d || aquiferRechargeActive3d;');
      expect(animateSource).toContain('var percolationDepthSpan3d = aquiferRechargeActive3d ? 1.08 : 0.48;');
      expect(animateSource).toContain('percolationGeometry3d.setDrawRange(0, activePercolationCount3d);');
      expect(animateSource).toContain('soilDropIndex3d < activePercolationCount3d');
      expect(animateSource).toContain('percolationPosition3d.setY(soilDropIndex3d, -1.04 - soilDropPhase3d * percolationDepthSpan3d);');
      expect(animateSource).toMatch(/var soilDropPhase3d = motionReduced3d\s*\? \(soilDropIndex3d % 6\) \/ 5/);
      expect(animateSource).not.toMatch(/(?:soilPercolation3d|percolationGeometry3d|waterTableRecharge3d|groundwaterStorageGroup3d|aquiferFlow3d|groundwaterSeep3d)\s*=\s*new THREE\./);
    });
  });

  it('exposes deterministic runtime phase and percolation semantics', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("canvasEl.dataset.subsurfacePhase = vadoseStorageActive3d ? 'soil-storage' :");
      expect(source).toContain("aquiferRechargeActive3d ? 'selected-deep-recharge' :");
      expect(source).toContain("groundwaterTransferActive3d ? 'groundwater-transfer' : 'hidden';");
      expect(source).toContain("canvasEl.dataset.percolation = vadoseStorageActive3d ? 'retained-in-soil' :");
      expect(source).toContain("aquiferRechargeActive3d ? 'deep-recharge' : 'hidden';");
      expect(source).toContain('canvasEl.dataset.percolationParticleCount = String(activePercolationCount3d);');
      expect(source).toContain("canvasEl.dataset.percolationDepth = vadoseStorageActive3d ? 'vadose-zone' :");
      expect(source).toContain("aquiferRechargeActive3d ? 'water-table' : 'hidden';");
      expect(source).toContain("canvasEl.dataset.groundwaterFlow = groundwaterTransferActive3d ? 'moving' : 'hidden';");
    });
  });

  it('keeps both canvas attributes and visible/Data View science copy aligned', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("d.journeyState === 'infiltrating' ? 'soil-storage'");
      expect(source).toContain("d.journeyState === 'aquifer_flow' ? 'selected-deep-recharge'");
      expect(source.match(/"data-subsurface-phase": currentSubsurfacePhase/g)).toHaveLength(2);
      expect(source.match(/"data-percolation": currentSubsurfacePhase === 'soil-storage' \? 'retained-in-soil' : currentSubsurfacePhase === 'selected-deep-recharge' \? 'deep-recharge' : 'hidden'/g)).toHaveLength(2);
      expect(source).toContain('className: "wc-subsurface-note"');
      expect(source).toContain('"data-subsurface-summary": currentSubsurfacePhase');
      expect(source).toContain('React.createElement("th", { scope: "row" }, "Subsurface pathway")');
      expect(source).toContain('Water is entering unsaturated pore spaces and may be retained as soil water. Infiltration is not automatic groundwater recharge.');
      expect(source).toContain('not all infiltrated water takes this route.');
    });
  });
});
