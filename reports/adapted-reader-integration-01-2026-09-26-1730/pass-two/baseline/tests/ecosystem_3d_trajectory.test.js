import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderEcosystem(state = {}) {
  return renderTool('ecosystem', { ecosystem: { tutorialDismissed: true, ...state } });
}

const trajectoryData = [
  { step: 0, prey: 80, pred: 10 },
  { step: 1, prey: 86, pred: 12 },
  { step: 2, prey: 90, pred: 15 },
  { step: 3, prey: 84, pred: 18 }
];

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem');
});

describe('Ecosystem 3D population trajectory', () => {
  it('keeps the 3D view optional and collapsed by default', () => {
    const html = renderEcosystem({
      tab: 'explore',
      analysisView: 'trajectory',
      data: trajectoryData,
      steps: trajectoryData.length
    });

    expect(html).toContain('3D population trajectory');
    expect(html).toContain('Show 3D view');
    expect(html).not.toContain('Three-dimensional predator-prey trajectory');
  });

  it('renders three labeled axes and a synchronized replay marker when open', () => {
    const html = renderEcosystem({
      tab: 'explore',
      analysisView: 'trajectory',
      trajectory3dOpen: true,
      trajectoryAzimuth: -20,
      trajectoryElevation: 30,
      replayStep: 2,
      data: trajectoryData,
      steps: trajectoryData.length
    });

    expect(html).toContain('Hide 3D view');
    expect(html).toContain('Three-dimensional predator-prey trajectory');
    expect(html).toContain('Rotate view');
    expect(html).toContain('View elevation');
    expect(html).toContain('Trajectory time');
    expect(html).toContain('Modeled time');
    expect(html).toContain('Step 2');
    expect(html).toContain('Replay position');
    expect(html).toContain('Move through the 3D trajectory over modeled time');
  });

  it('uses dependency-free projection math and remains an advanced view', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('var buildTrajectory3DSVG = function()');
    expect(source).toContain('var rotatedX = x * cosYaw - z * sinYaw');
    expect(source).toContain("'data-eco-advanced': 'true'");
    expect(source).not.toContain('new THREE.');
  });

  it('keeps the deployed mirror byte-identical', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(deployed).toBe(source);
  });
});
