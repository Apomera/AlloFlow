import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Coral Reef Survey Lab: axe (WCAG 2.2 A/AA structure rules) on every view,
// and the theme palette held to the contrast it promises. jsdom cannot measure
// rendered contrast, so the palette pairs are checked by arithmetic instead.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; });

const VIEWS = [
  ['hub', {}], ['methods', {}], ['methods answered', { section: 'methods', practice: { 0: 'hard_coral', 1: 'recently_dead_coral' } }],
  ['survey points', { section: 'survey' }], ['survey fish map', { section: 'survey', surveyStage: 'fish' }],
  ['survey fish list', { section: 'survey', surveyStage: 'fish', fishView: 'list' }], ['survey results', { section: 'survey', surveyStage: 'results', records: { 0: 'sand' } }],
  ['compare empty', { section: 'compare' }], ['model predict', { section: 'model' }],
  ['model revealed', { section: 'model', modelRevealedFor: { recent: true }, modelPredictions: { recent: { choice: 'lower' } } }],
  ['science', { section: 'science' }], ['teacher', { section: 'teacher' }],
  ['explore', { section: 'explore' }], ['explore restoration', { section: 'explore', diveSiteId: 'restoration' }], ['guide', { section: 'guide' }],
  ['model rubble', { section: 'model', model: { scenarioId: 'rubble', heatIntervalStart: 6, heatIntervalEnd: 6, heatPeakStart: 8, heatPeakEnd: 8, herbivores: 'medium', nutrients: 'low', acidification: true, omegaEnd: 3.05, sensitivity: 'tolerant', rubbleStabilization: true, reefStructures: false, restoration: true, years: 30, startCoral: 0.05, startAlgae: 0.03, startHardBottom: 0.3 }, modelRevealedFor: { rubble: true } }]
];

describe('Coral Reef Survey Lab passes axe', () => {
  it.each(VIEWS)('%s has no WCAG A/AA violations', async (name, state) => {
    const data = Object.assign({ section: name.split(' ')[0] }, state);
    const html = renderTool('coralReef', { coralReef: data });
    const result = await runIsolatedAxe(html);
    const summary = result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '));
    expect(summary, name).toEqual([]);
  }, 30000);
});

describe('palette contrast', () => {
  const lum = (hex) => { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  it.each(['light', 'dark', 'contrast'])('%s theme text clears 4.5:1 and controls and chart marks clear 3:1', (theme) => {
    const P = X.palette(theme);
    for (const [ink, ground] of [['text', 'card'], ['text', 'cardAlt'], ['text', 'bg'], ['muted', 'card'], ['muted', 'cardAlt'], ['muted', 'bg'], ['accentInk', 'accent'], ['good', 'card'], ['bad', 'card'], ['accent', 'card']]) {
      expect(ratio(P[ink], P[ground]), theme + ' ' + ink + ' on ' + ground).toBeGreaterThanOrEqual(4.5);
    }
    for (const [mark, ground] of [['ctlBorder', 'card'], ['ctlBorder', 'cardAlt'], ['coralLine', 'card'], ['algaeLine', 'card'], ['heatBar', 'card'], ['line', 'card']]) {
      expect(ratio(P[mark], P[ground]), theme + ' ' + mark + ' on ' + ground).toBeGreaterThanOrEqual(3);
    }
  });
});
