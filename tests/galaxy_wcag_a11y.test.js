import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const GALAXY_PATHS = [
  'stem_lab/stem_tool_galaxy.js',
  'desktop/web-app/public/stem_lab/stem_tool_galaxy.js',
];

describe('galaxy WCAG interaction contracts', () => {
  it.each(GALAXY_PATHS)('%s exposes landmarks and a current-state text alternative', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('"data-galaxy-root": "true"');
    expect(source).toContain('"aria-labelledby": "galaxy-tool-title"');
    expect(source).toContain('"data-galaxy-accessible-summary": "true"');
    expect(source).toContain('galaxy-accessible-summary-heading');
    expect(source).toContain('enabledLayerLabels.join');
    expect(source).toContain('galaxySelectionSummary');
    expect(source).toContain('galaxyMotionSummary');
  });

  it.each(GALAXY_PATHS)('%s supports complete keyboard operation and state', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('moveGalaxyControlTab');
    expect(source).toContain("'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'");
    expect(source).toContain('"aria-orientation": "horizontal"');
    expect(source).toContain('"data-galaxy-control-tab": panel.key');
    expect(source).toContain('"data-galaxy-shape": key');
    expect(source).toContain('"data-galaxy-toggle": lt.key');
    expect(source).toContain('"aria-pressed": isOn ? "true" : "false"');
    expect(source).toContain('role: "application"');
    expect(source).toContain('"aria-keyshortcuts": "ArrowLeft ArrowRight ArrowUp ArrowDown + - Home"');
  });

  it.each(GALAXY_PATHS)('%s reacts to motion and forced-color preferences', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('galaxyPrefersReducedMotion');
    expect(source).toContain("query.addEventListener('change', onMotionPreferenceChange)");
    expect(source).toContain("query.removeEventListener('change', onMotionPreferenceChange)");
    expect(source).toContain('_setBlackHolePaused(blackHoleEffectivePaused)');
    expect(source).toContain('[data-galaxy-toggle][aria-pressed=true]');
    expect(source).toContain('[data-galaxy-control-tab][aria-selected=true]');
  });

  it.each(GALAXY_PATHS)('%s labels Real Sky and dynamic feedback regions', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('galaxy-real-sky-targets-label');
    expect(source).toContain('galaxy-real-sky-surveys-label');
    expect(source).toContain('galaxy-real-sky-catalogs-label');
    expect(source).toContain('Interactive real-sky survey atlas');
    expect(source).toContain('"aria-busy": realSkyStatus !==');
    expect(source).toContain('id: "galaxy-real-sky-status"');
    expect(source).toContain('d.quizFeedback && React.createElement("div", { role: "status"');
    expect(source).toContain('"aria-atomic": "true"');
  });
});
