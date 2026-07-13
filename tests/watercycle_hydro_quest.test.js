import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_watercycle.js', 'utf8');

describe('Water Cycle Hydro Quest', () => {
  test('awards six evidence-based missions and five ranks', () => {
    expect(source).toContain("name: 'Cloud Chaser'");
    expect(source).toContain('complete: !!journey3dVisited.condensing');
    expect(source).toContain('journey3dPaths.runoff > 0 && journey3dPaths.infiltrate > 0 && journey3dPaths.plant > 0');
    expect(source).toContain('complete: !!journey3dVisited.complete');
    expect(source).toContain('var hydroPoints = hydroCompleted * 20');
    expect(source).toContain("hydroPoints >= 120 ? 'Cycle Guardian'");
    expect(source).toContain("hydroPoints >= 80 ? 'Hydro Explorer'");
    expect(source).toContain("hydroPoints >= 40 ? 'Watershed Scout'");
    expect(source).toContain("hydroPoints >= 20 ? 'Droplet' : 'Observer'");
  });

  test('records stage evidence only while the 3D journey is selected', () => {
    expect(source).toContain("if (current.journeyView === '3d')");
    expect(source).toContain('visited3d[nextState] = true');
    expect(source).toContain('nextWaterCycle.journey3dStatesVisited = visited3d');
    expect(source).toContain('var journey3dPaths = Object.assign');
    expect(source).toContain('next3dPaths[pathKey] = (next3dPaths[pathKey] || 0) + 1');
    expect(source).toContain('nextData.journey3dPaths = next3dPaths');
  });

  test('exposes accessible progress and non-color mission states', () => {
    expect(source).toContain('"data-watercycle-hydro-quest": "true"');
    expect(source).toContain('role: "progressbar"');
    expect(source).toContain('"aria-valuenow": hydroPoints');
    expect(source).toContain('mission.complete ? "Complete" : "Open"');
  });

  test('feeds points into bounded 3D visual rewards', () => {
    expect(source).toContain('"data-hydro-points": String(hydroPoints)');
    expect(source).toContain("Math.max(0, Math.min(120, parseFloat(canvasEl.dataset.hydroPoints || '0')))");
    expect(source).toContain('dropletLight3d.intensity = 1.8 + hydroPoints3d / 55');
    expect(source).toContain('route3d.material.opacity = 0.18 + hydroPoints3d / 800');
  });
});
