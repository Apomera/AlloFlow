import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';
const SRC = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');

function view(state) {
  return renderTool(ID, { [ID]: state });
}

function documentFor(state) {
  return new DOMParser().parseFromString(view(state), 'text/html');
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { resetStemLab(); loadTool(FILE, ID); });

describe('Pet Lab 2D cleanup contracts', () => {
  it.each(['b3', 'b4'])('accepts Cockatiel boundary answer %s in scoring and rendered feedback', (lsPick) => {
    expect(SRC).toMatch(/species: 'Cockatiel'[\s\S]*?accepted: \['b3', 'b4'\]/);
    expect(SRC).toMatch(/var correct = isAcceptedBucket\(v, bId\)/);

    const doc = documentFor({
      view: 'lifespan', lsIdx: 6, lsAns: true, lsPick,
      lsShown: [6], lsRounds: 1, lsScore: 1, lsStreak: 1, lsBest: 1,
    });
    expect(doc.body.textContent).toContain('Accepted — 10–20 years or 20–50 years');
    expect(doc.body.textContent).not.toContain('❌');
    expect(doc.querySelector('[aria-label="10–20 years, accepted answer for Cockatiel"]')).toBeTruthy();
    expect(doc.querySelector('[aria-label="20–50 years, accepted answer for Cockatiel"]')).toBeTruthy();
  });

  it('labels the cost timeline from adoption instead of an artificial Year 0', () => {
    const doc = documentFor({ view: 'cost', costSpecies: 'guinea-pair', costYears: 30 });
    expect(doc.body.textContent).toContain('Adoption / plan starts');
    expect(doc.body.textContent).toContain('After 30 yr');
    expect(doc.body.textContent).not.toContain('Year 0');
    const timeline = doc.querySelector('.petslab-cost-timeline svg');
    expect(timeline?.getAttribute('aria-label')).toContain('at adoption, after 6 years');
  });

  it('describes one air packet across two breaths without the old contradictory cycle label', () => {
    expect(SRC).not.toContain('CYCLE 2 (exhale): posterior → lung');
    const doc = documentFor({ view: 'diagrams', diagramView: 'airsac' });
    expect(doc.body.textContent).toContain('one air packet crosses two breaths');
    expect(doc.body.textContent).toContain('BREATH 2: inhale → anterior sacs · exhale → out');
    expect(doc.querySelector('.petslab-diagram-narrow desc')?.textContent)
      .toContain('Second exhalation: anterior sacs out through the trachea');
  });

  it('keeps the narrow ethogram art above readable cues in tall 320-unit cards', () => {
    const doc = documentFor({ view: 'diagrams', diagramView: 'bodylang' });
    const narrow = doc.querySelector('.petslab-diagram-narrow');
    expect(narrow?.getAttribute('viewBox')).toBe('0 0 320 1350');

    const relaxedCard = narrow?.querySelector('rect[fill="url(#pets-ethogram-relaxed-narrow)"]');
    expect(relaxedCard?.getAttribute('x')).toBe('10');
    expect(relaxedCard?.getAttribute('y')).toBe('64');
    expect(relaxedCard?.getAttribute('width')).toBe('300');
    expect(relaxedCard?.getAttribute('height')).toBe('300');

    const firstCue = Array.from(narrow?.querySelectorAll('text') || [])
      .find((node) => node.textContent === '• Loose, wiggly body');
    expect(firstCue?.getAttribute('y')).toBe('215');
    expect(Number(firstCue?.getAttribute('font-size'))).toBeGreaterThanOrEqual(14);
    expect(narrow?.querySelectorAll('tspan').length).toBeGreaterThanOrEqual(8);
  });
});
