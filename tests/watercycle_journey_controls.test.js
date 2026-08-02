import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle journey playback controls', () => {
  it('uses one authoritative pause and speed gate for progression', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("var journeyPaused2 = canvasEl.dataset.journeyPaused === 'true';");
      expect(source).toContain("var journeySpeed2 = parseFloat(canvasEl.dataset.journeySpeed || '1');");
      expect(source).toContain('if (!isFinite(journeySpeed2) || journeySpeed2 <= 0) journeySpeed2 = 1;');
      expect(source).toContain("if (!journeyPaused2 && jState !== 'ground_choice' && jState !== 'complete') {");
      expect(source).toContain('journey.progress += speed2 * journeySpeed2;');
      expect(source).not.toContain('journey.progress += speed2;');
    });
  });

  it('restarts local canvas progress instead of changing only the label', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('canvasEl._wcRestartJourney = function()');
      expect(source).toContain("journey.state = 'ocean';");
      expect(source).toContain('journey.progress = 0;');
      expect(source).toContain('journey.particleTrail = [];');
      expect(source).toContain("canvasEl.dataset.journeyPaused = 'false';");
      expect(source).toContain('canvasEl._wcRestartJourney = null;');
    });
  });

  it('exposes accessible pause, restart, speed, and timeline controls', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"aria-label": journeyPaused ? "Resume water journey" : "Pause water journey"');
      expect(source).toContain('"aria-label": "Restart water journey from the ocean"');
      expect(source).toContain('"aria-label": "Journey animation speed"');
      expect(source).toContain('"aria-label": "Water journey timeline"');
      expect(source).toContain('"aria-current": index === journeyTimelineIndex ? "step" : undefined');
      expect(source).toContain('var timelineStepState = index < journeyTimelineIndex');
      expect(source).toContain('var timelineStepLabel = index < journeyTimelineIndex');
      expect(source).toContain('className: "wc-timeline-step " + timelineStepState');
      expect(source).toContain('"aria-label": step + ": " + timelineStepLabel');
      expect(source).toContain('className: "wc-timeline-marker"');
      expect(source).toContain('.wc-timeline-step.is-complete');
      expect(source).toContain("var journeyTimelineSteps = ['Ocean', 'Vapor', 'Cloud', 'Precipitation', 'Land pathway', 'Return'];");
      expect(source).toContain("d.journeyState === 'ground_choice' || d.journeyState === 'complete'");
      expect(source).toContain('className: "flex flex-wrap items-center gap-3 text-[11px] font-bold", role: "status"');
      expect(source).toContain('"aria-label": "Journey progress summary"');
      expect(source).toContain('"aria-live": "polite"');
      expect(source).toContain('"aria-atomic": "true"');
    });
  });

  it('keeps animation speed distinct from real hydrologic time', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('Playback speed changes this animation only.');
      expect(source).toContain('groundwater pathways can take years to millennia.');
      expect(source).toContain('"data-journey-paused": String(!!d.journeyPaused)');
      expect(source).toContain('"data-journey-speed": String(d.journeySpeed || 1)');
      expect(source).toContain("var journeyPaused3d = canvasEl.dataset.journeyPaused === 'true';");
      expect(source).toContain('if (!motionReduced3d && !journeyPaused3d) {');
    });
  });

  it('clears pause state when starting, ending, or looping', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("upd('journeyActive', true); upd('journeyState', 'ocean'); upd('journeyLastPath', ''); upd('journeyPaused', false);");
      expect(source).toContain("upd('journeyActive', false); upd('journeyState', 'idle'); upd('journeyPaused', false);");
      expect(source).toContain("updMulti({ journeyState: 'ocean', journeyPaused: false, journeyLastPath: '' });");
    });
  });

  it('exposes a keyboard exit for Focus Canvas mode', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("} else if (k === 'Escape' && wcFocusMode) {");
      expect(source).toContain('toggleWcFocusMode();');
      expect(source).toContain('"aria-keyshortcuts": "1 2 3 4 5 6 G J R U P Escape"');
      expect(source).toContain('Escape exits Focus Canvas mode.');
    });
  });
  it('announces walkthrough progress in human-readable steps', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"aria-labelledby": "wcWalkthroughTitle"');
      expect(source).toContain('id: "wcWalkthroughTitle"');
      expect(source).toContain('id: "wcWalkthroughStatus"');
      expect(source).toContain('role: "status",');
      expect(source).toContain('"aria-live": "polite",');
      expect(source).toContain('"aria-atomic": "true"');
      expect(source).toContain('"aria-describedby": "wcWalkthroughStatus"');
      expect(source).toContain('"aria-valuetext": "Step " + (wcWalkthroughIndex + 1) + " of " + STAGES.length + ": " + currentStageLabel');
      expect(source).toContain('className: "wc-stage-focus"');
    });
  });
  it('announces the active Journey state and next action', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var journeyStateLabels = {');
      expect(source).toContain("evaporating: 'Evaporation'");
      expect(source).toContain("ground_choice: 'Land pathway choice'");
      expect(source).toContain("complete: 'Cycle complete'");
      expect(source).toContain('var journeyTransitionStatus = !d.journeyActive');
      expect(source).toContain('id: "wcJourneyTransitionStatus"');
      expect(source).toContain('Land pathway choice. Choose River Runoff, Underground infiltration, or Plant uptake.');
      expect(source).toContain('journeyChosenRoute.label + " selected" : journeyStateLabel + ". " + journeyStatusLabel');
      expect(source).toContain('" + journeyStateLabel');
    });
  });
});
