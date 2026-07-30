import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';

function emptyGrid() {
  return Array.from({ length: 16 }, () => ({
    plantId: null,
    growthDay: 0,
    health: 100,
    watered: false,
    pests: 0,
  }));
}

function renderCompanionPlanting(communityGarden) {
  resetStemLab();
  loadTool(FILE, TOOL_ID);
  return renderTool(TOOL_ID, {
    companionPlanting: {
      gardenMode: 'community',
      communityGarden,
    },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('Companion Planting soil chemistry explanations', () => {
  it('renders a selectable whole-garden pathway from amendment to plant outcome', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 20, health: 92, watered: true, pests: 0 };
    grid[1] = { plantId: 'beans', growthDay: 12, health: 97, watered: true, pests: 0 };
    grid[2] = { plantId: 'compost_bin', growthDay: 0, health: 100, watered: false, pests: 0 };

    const html = renderCompanionPlanting({
      phase: 'grow',
      grid,
      soilDiagramFocus: 'phosphorus',
      nitrogen: 42,
      phosphorus: 14,
      potassium: 31,
      pH: 5.3,
      organicMatter: 2.5,
      moisture: 60,
    });

    expect(html).toContain('data-soil-system-map="true"');
    expect(html).toContain('From amendment to root uptake');
    expect(html.match(/data-soil-pathway=/g)).toHaveLength(5);
    expect(html).toContain('data-soil-pathway="phosphorus"');
    expect(html).toContain('data-soil-selected-status="phosphorus"');
    expect(html).toContain('data-soil-ph-gate="lockout-risk"');
    expect(html).toContain('data-soil-flow="phosphorus"');
    expect(html.match(/data-soil-flow-node=/g)).toHaveLength(5);
    expect(html.match(/data-soil-flow-visual=/g)).toHaveLength(5);
    expect(html.match(/data-soil-flow-connector=/g)).toHaveLength(4);
    expect(html).toContain('data-soil-flow-pool-gauge="phosphorus"');
    expect(html).toContain('data-soil-flow-gate-state="lockout-risk"');
    expect(html).toContain('releases P');
    expect(html).toContain('binds or frees');
    expect(html).toContain('roots access');
    expect(html).toContain('powers growth');
    expect(html).toContain('data-soil-loss-loop="true"');
    expect(html).toContain('data-soil-action-explanation="phosphorus"');
    expect(html).toContain('Phosphorus is low; fruiting crops lose health in this model.');
    expect(html).toContain('Simulation rule shown');
    expect(html).toContain('real soil test');
  });

  it('connects the microscope chemistry layer to crop-specific pH and ion forms', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'blueberry', growthDay: 25, health: 88, watered: true, pests: 0 };

    const html = renderCompanionPlanting({
      phase: 'grow',
      grid,
      microscopeCell: 0,
      microscopeLayer: 'chemistry',
      nitrogen: 36,
      phosphorus: 22,
      potassium: 29,
      pH: 6.7,
      organicMatter: 3.1,
      moisture: 64,
    });

    expect(html).toContain('data-microscope-chemistry-flow="Blueberry"');
    expect(html).toContain('data-microscope-ph-status="lockout-risk"');
    expect(html.match(/data-microscope-chemistry-node=/g)).toHaveLength(4);
    expect(html.match(/data-microscope-nutrient=/g)).toHaveLength(3);
    expect(html).toContain('NO');
    expect(html).toContain('NH');
    expect(html).toContain('microscope-chemistry-canvas-summary');
    expect(html).toContain('outside this crop');
    expect(html).toContain('role="img"');
  });

  it('keeps diagram trends tied to the simulation formulas and documents the model boundary', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    expect(source).toContain("soilNitrogenDailyDelta += (chemistryPlant.nEffect || 0) * 0.3");
    expect(source).toContain("if (p && !p.isStructure) nDelta += (p.nEffect || 0) * 0.3");
    expect(source).toContain("soilPhosphorusDailyDelta += chemistryProfile.p * 0.3");
    expect(source).toContain("soilPotassiumDailyDelta += chemistryProfile.k * 0.3");
    expect(source).toContain("soilOrganicDailyDelta += 0.05");
    expect(source).toContain("(6.5 - cgPH) * 0.005");
    expect(source).toContain("Use a real soil test and local guidance before applying amendments outdoors.");
    expect(source).toContain("className: 'md:hidden'");
    expect(source).toContain("className: 'hidden md:inline'");
  });
  it('stages amendments without changing the garden and reveals evidence only after a prediction', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 15, health: 95, watered: true, pests: 0 };

    const choosing = renderCompanionPlanting({
      phase: 'grow', grid, nitrogen: 30, phosphorus: 20, potassium: 25, pH: 5.3, organicMatter: 2.4,
    });
    expect(choosing).toContain('data-soil-amendment-lab="choose"');
    expect(choosing.match(/data-soil-trial-option=/g)).toHaveLength(3);
    expect(choosing).toContain('Preview only');
    expect(choosing).not.toContain('data-soil-trial-result=');

    const predicting = renderCompanionPlanting({
      phase: 'grow', grid, soilTrial: 'lime', nitrogen: 30, phosphorus: 20, potassium: 25, pH: 5.3, organicMatter: 2.4,
    });
    expect(predicting).toContain('data-soil-amendment-lab="lime"');
    expect(predicting).toContain('data-soil-trial-stage="prediction"');
    expect(predicting.match(/data-soil-trial-prediction=/g)).toHaveLength(3);
    expect(predicting).toContain('The modeled before-and-after evidence will appear after you make a prediction.');
    expect(predicting).not.toContain('data-soil-trial-result=');
    expect(predicting).toContain('data-apply-soil-trial="lime"');
    expect(predicting).toContain('disabled=""');
  });

  it('compares predicted and modeled amendment outcomes with live before-and-after values', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 15, health: 95, watered: true, pests: 0 };

    const limeHtml = renderCompanionPlanting({
      phase: 'grow', grid, soilTrial: 'lime', soilTrialPrediction: 'worsens',
      nitrogen: 30, phosphorus: 20, potassium: 25, pH: 5.8, organicMatter: 2.4, budget: 10,
    });
    expect(limeHtml).toContain('data-soil-trial-stage="evidence"');
    expect(limeHtml).toContain('data-soil-trial-result="improves"');
    expect(limeHtml).toContain('The model shows a different direction');
    expect(limeHtml).toContain('data-soil-trial-comparison="lime"');
    expect(limeHtml).toContain('data-soil-trial-metric="ph"');
    expect(limeHtml).toContain('data-soil-trial-metric="alignment"');
    expect(limeHtml).toContain('data-soil-trial-ph-scale="true"');
    expect(limeHtml).toContain('Soil pH changes from 5.8 to 6.1');
    expect(limeHtml).toContain('Crop plots inside their ideal pH range change from 0 to 1.');

    const compostHtml = renderCompanionPlanting({
      phase: 'grow', grid, soilTrial: 'compost', soilTrialPrediction: 'improves',
      nitrogen: 30, phosphorus: 20, potassium: 25, pH: 6.4, organicMatter: 2.4,
    });
    expect(compostHtml).toContain('data-soil-trial-result="improves"');
    expect(compostHtml).toContain('Your prediction matches this model');
    expect(compostHtml).toContain('data-soil-trial-comparison="compost"');
    expect(compostHtml.match(/data-soil-trial-metric=/g)).toHaveLength(4);
    expect(compostHtml).toContain('N, P, K, and organic matter rise immediately in this model; pH does not change.');
  });

  it('routes visible amendment controls through preview-before-apply handlers', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    expect(source).toContain('function cgStageSoilTrial(trialId)');
    expect(source).toContain('function cgApplySoilTrial()');
    expect(source).toContain("cgStageSoilTrial('compost')");
    expect(source).toContain("cgStageSoilTrial('lime')");
    expect(source).toContain("cgStageSoilTrial('sulfur')");
    expect(source).toContain("if (!cgSoilTrialPrediction) return;");
    expect(source).toContain("if (cgSoilTrial === 'compost') cgCompost();");
  });
  it('offers a spatial soil-profile view with layers, roots, moisture, and pathway particles', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 18, health: 93, watered: true, pests: 0 };

    const html = renderCompanionPlanting({
      phase: 'grow', grid, soilDiagramFocus: 'nitrogen', soilDiagramView: 'profile',
      nitrogen: 32, phosphorus: 24, potassium: 27, pH: 6.2, organicMatter: 2.7, moisture: 82,
    });

    expect(html.match(/data-soil-diagram-view=/g)).toHaveLength(2);
    expect(html).toContain('data-soil-diagram-view="profile"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-soil-profile="nitrogen"');
    expect(html).toContain('data-soil-profile-cross-section="true"');
    expect(html.match(/data-soil-profile-layer=/g)).toHaveLength(5);
    expect(html.match(/data-soil-profile-particle="nitrogen"/g)).toHaveLength(6);
    expect(html.match(/data-soil-profile-water="fast"/g)).toHaveLength(3);
    expect(html.match(/data-soil-profile-direct-label=/g)).toHaveLength(3);
    expect(html).toContain('data-soil-profile-depth-guide="true"');
    expect(html).toContain('data-soil-profile-legend="nitrogen"');
    expect(html.match(/data-soil-profile-legend-item=/g)).toHaveLength(2);
    expect(html.match(/data-soil-profile-particle-state="mobile-or-available"/g)).toHaveLength(3);
    expect(html.match(/data-soil-profile-particle-state="held-or-transforming"/g)).toHaveLength(3);
    expect(html).toContain('Nitrate: dissolved; moves with water');
    expect(html).toContain('Ammonium: held on exchange sites');
    expect(html).toContain('Feeder roots');
    expect(html.match(/data-soil-profile-callout=/g)).toHaveLength(4);
    expect(html).toContain('data-soil-profile-sink="nitrogen"');
    expect(html).toContain('Wet soil increases downward nitrate movement in this profile.');
    expect(html).toContain('Diagram depth and particle positions are conceptual, not measured.');
    expect(html).not.toContain('data-soil-flow="nitrogen"');
  });

  it('changes the spatial explanation for phosphorus lockout and dry organic-matter cycling', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 18, health: 93, watered: false, pests: 0 };

    const phosphorusHtml = renderCompanionPlanting({
      phase: 'grow', grid, soilDiagramFocus: 'phosphorus', soilDiagramView: 'profile',
      nitrogen: 32, phosphorus: 24, potassium: 27, pH: 5.1, organicMatter: 2.7, moisture: 55,
    });
    expect(phosphorusHtml).toContain('data-soil-profile="phosphorus"');
    expect(phosphorusHtml).toContain('Phosphorus stays close to soil particles');
    expect(phosphorusHtml).toContain('Current pH increases modeled phosphorus lockout risk.');
    expect(phosphorusHtml).toContain('data-soil-profile-sink="phosphorus"');
    expect(phosphorusHtml).toContain('Mineral surface holding phosphate');
    expect(phosphorusHtml).toContain('Phosphate ion near roots');

    const organicHtml = renderCompanionPlanting({
      phase: 'grow', grid, soilDiagramFocus: 'organic', soilDiagramView: 'profile',
      nitrogen: 32, phosphorus: 24, potassium: 27, pH: 6.3, organicMatter: 2.2, moisture: 22,
    });
    expect(organicHtml).toContain('data-soil-profile="organic"');
    expect(organicHtml).toContain('Dry conditions slow modeled decomposition and nutrient release.');
    expect(organicHtml.match(/data-soil-profile-water="slow"/g)).toHaveLength(3);
    expect(organicHtml).toContain('Low organic matter limits the modeled soil sponge and exchange capacity.');
  });
  it('labels pH as an availability gate rather than a stored nutrient quantity', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 18, health: 90, watered: true, pests: 0 };

    const html = renderCompanionPlanting({
      phase: 'grow', grid, soilDiagramFocus: 'ph', soilDiagramView: 'profile',
      nitrogen: 40, phosphorus: 35, potassium: 38, pH: 5.2, organicMatter: 3.1, moisture: 60,
    });

    expect(html).toContain('data-soil-profile="ph"');
    expect(html).toContain('data-soil-profile-legend="ph"');
    expect(html).toContain('More H');
    expect(html).toContain('means greater acidity');
    expect(html).toContain('Availability gate, not a nutrient amount');
    expect(html).toContain('pH controls solubility throughout');
    expect(html).toContain('shown in soil solution');
  });
  it('compares each planted crop range against one shared live pH marker', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'blueberry', growthDay: 20, health: 94, watered: true, pests: 0 };
    grid[1] = { plantId: 'tomato', growthDay: 18, health: 91, watered: true, pests: 0 };
    grid[2] = { plantId: 'tomato', growthDay: 8, health: 97, watered: true, pests: 0 };

    const html = renderCompanionPlanting({
      phase: 'grow', grid, nitrogen: 40, phosphorus: 35, potassium: 38,
      pH: 5.2, organicMatter: 3.1, moisture: 60,
    });

    expect(html).toContain('data-soil-crop-ph-ranges="2"');
    expect(html.match(/data-soil-crop-ph-range=/g)).toHaveLength(2);
    expect(html).toContain('data-soil-crop-ph-range="blueberry"');
    expect(html).toContain('data-soil-crop-ph-range="tomato"');
    expect(html).toContain('data-soil-crop-ph-status="in-range"');
    expect(html).toContain('data-soil-crop-ph-status="too-acidic"');
    expect(html).toContain('Ideal 4.5-5.5');
    expect(html).toContain('Ideal 6.0-6.8');
    expect(html).toContain('garden pH 5.2');
    expect(html).toContain('data-soil-ph-log-note="true"');
    expect(html).toContain('A change of 1 pH unit represents a tenfold change in hydrogen-ion activity');
  });

  it('shows an instructional pH-range placeholder before crops are planted', () => {
    const html = renderCompanionPlanting({
      phase: 'plan', grid: emptyGrid(), nitrogen: 40, phosphorus: 35, potassium: 38,
      pH: 6.5, organicMatter: 3.1, moisture: 60,
    });

    expect(html).toContain('data-soil-crop-ph-ranges="0"');
    expect(html).toContain('Plant a crop to compare its ideal pH band with the garden marker.');
    expect(html).not.toContain('data-soil-crop-ph-range=');
  });
  it('shows a live pool gauge and an open availability gate when crop ranges align', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 20, health: 95, watered: true, pests: 0 };

    const html = renderCompanionPlanting({
      phase: 'grow', grid, soilDiagramFocus: 'nitrogen', soilDiagramView: 'pathway',
      nitrogen: 67, phosphorus: 35, potassium: 38, pH: 6.4, organicMatter: 3.1, moisture: 60,
    });

    expect(html).toContain('data-soil-flow="nitrogen"');
    expect(html).toContain('data-soil-flow-pool-gauge="nitrogen"');
    expect(html).toContain('aria-label="Nitrogen modeled pool level"');
    expect(html).toContain('aria-valuenow="67"');
    expect(html).toContain('data-soil-flow-gate-state="open"');
    expect(html).toContain('Open: crop ranges aligned');
    expect(html).toContain('dissolved + held N');
    expect(html).toContain('ion transporters');
    expect(html).toContain('leaf + protein growth');
    expect(html).toContain('data-soil-flow-connector="roots absorb"');
  });

  it('compares aggregated crop and structure contributions around a visible zero line', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 20, health: 95, watered: true, pests: 0 };
    grid[1] = { plantId: 'tomato', growthDay: 8, health: 98, watered: true, pests: 0 };
    grid[2] = { plantId: 'beans', growthDay: 12, health: 97, watered: true, pests: 0 };
    grid[3] = { plantId: 'compost_bin', growthDay: 0, health: 100, watered: false, pests: 0 };

    const html = renderCompanionPlanting({
      phase: 'grow', grid, soilDiagramFocus: 'nitrogen', soilDiagramView: 'pathway',
      nitrogen: 42, phosphorus: 35, potassium: 38, pH: 6.4, organicMatter: 3.1, moisture: 60,
    });

    expect(html).toContain('data-soil-contribution-chart="nitrogen"');
    expect(html.match(/data-soil-contribution-row=/g)).toHaveLength(3);
    expect(html).toContain('data-soil-contribution-row="tomato"');
    expect(html).toContain('data-soil-contribution-direction="draws-down"');
    expect(html).toContain('data-soil-contribution-row="beans"');
    expect(html).toContain('data-soil-contribution-direction="adds"');
    expect(html).toContain('data-soil-contribution-row="compost-bin"');
    expect(html).toContain('×2');
    expect(html).toContain('crop nitrogen demand');
    expect(html).toContain('nitrogen fixer or builder');
    expect(html).toContain('steady decomposition input');
    expect(html).toContain('+0.5 pts net next day');
    expect(html).toContain('Drawdown / demand');
    expect(html).toContain('Addition / rebuilding');
  });

  it('explains pH buffering and provides a no-contributor teaching state', () => {
    const acidicHtml = renderCompanionPlanting({
      phase: 'grow', grid: emptyGrid(), soilDiagramFocus: 'ph', soilDiagramView: 'pathway',
      nitrogen: 42, phosphorus: 35, potassium: 38, pH: 5.5, organicMatter: 3.1, moisture: 60,
    });
    expect(acidicHtml).toContain('data-soil-contribution-chart="ph"');
    expect(acidicHtml).toContain('data-soil-contribution-row="ph-buffer"');
    expect(acidicHtml).toContain('data-soil-contribution-direction="adds"');
    expect(acidicHtml).toContain('slow drift toward pH 6.5');

    const emptyHtml = renderCompanionPlanting({
      phase: 'grow', grid: emptyGrid(), soilDiagramFocus: 'phosphorus', soilDiagramView: 'pathway',
      nitrogen: 42, phosphorus: 35, potassium: 38, pH: 6.5, organicMatter: 3.1, moisture: 60,
    });
    expect(emptyHtml).toContain('data-soil-contribution-chart="phosphorus"');
    expect(emptyHtml).toContain('No current crop or structure directly changes this selected pool next day.');
    expect(emptyHtml).not.toContain('data-soil-contribution-row=');
  });
  it('projects exact selected-pool contributions onto their garden plots', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 20, health: 95, watered: true, pests: 0 };
    grid[1] = { plantId: 'beans', growthDay: 12, health: 97, watered: true, pests: 0 };
    grid[2] = { plantId: 'compost_bin', growthDay: 0, health: 100, watered: false, pests: 0 };

    const html = renderCompanionPlanting({
      phase: 'grow', grid, gardenOverlay: 'soil-pathway', soilDiagramFocus: 'nitrogen',
      nitrogen: 42, phosphorus: 35, potassium: 38, pH: 6.4, organicMatter: 3.1, moisture: 60,
    });

    expect(html).toContain('data-garden-overlay-option="soil-pathway"');
    expect(html).toContain('data-garden-overlay-explanation="soil-pathway"');
    expect(html).toContain('data-soil-map-legend="nitrogen"');
    expect(html.match(/data-plot-overlay="soil-pathway"/g)).toHaveLength(3);
    expect(html.match(/data-overlay-direction="adds"/g)).toHaveLength(2);
    expect(html.match(/data-overlay-direction="draws-down"/g)).toHaveLength(1);
    expect(html).toContain('-0.3 N next day');
    expect(html).toContain('+0.6 N next day');
    expect(html).toContain('+0.5 N next day');
    expect(html).toContain('Soil contribution direction legend');
    expect(html).toContain('data-soil-show-on-map="nitrogen"');
    expect(html).toContain('href="#community-garden-map"');
    expect(html).toContain('data-soil-map-balance="nitrogen"');
    expect(html).toContain('data-soil-map-forecast-kind="pool-balance"');
    expect(html).toContain('+0.8 pts net');
    expect(html).toContain('42.0 pts');
    expect(html).toContain('42.8 pts');
    expect(html).toContain('+1.1 pts');
  });

  it('turns the spatial soil lens into crop-specific pH fit when pH is selected', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'blueberry', growthDay: 20, health: 94, watered: true, pests: 0 };
    grid[1] = { plantId: 'tomato', growthDay: 18, health: 91, watered: true, pests: 0 };

    const html = renderCompanionPlanting({
      phase: 'grow', grid, gardenOverlay: 'soil-pathway', soilDiagramFocus: 'ph',
      nitrogen: 42, phosphorus: 35, potassium: 38, pH: 5.2, organicMatter: 3.1, moisture: 60,
    });

    expect(html).toContain('data-soil-map-legend="ph"');
    expect(html).toContain('pH crop-range status legend');
    expect(html).toContain('data-overlay-direction="in-range"');
    expect(html).toContain('data-overlay-direction="out-of-range"');
    expect(html).toContain('In range · pH 5.2');
    expect(html).toContain('Too acidic · pH 5.2');
    expect(html).toContain('IN CROP RANGE');
    expect(html).toContain('OUT OF RANGE');
    expect(html).toContain('data-soil-map-balance="ph"');
    expect(html).toContain('data-soil-map-forecast-kind="ph-fit"');
    expect(html).toContain('Crop-range alignment forecast');
    expect(html).toContain('1 outside range');
    expect(html).toContain('pH is a shared availability condition, not a consumed nutrient.');
  });
});
