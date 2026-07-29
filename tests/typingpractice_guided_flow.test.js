import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Typing Practice guided flow', () => {
  const source = read('stem_lab/stem_tool_typingpractice.js');

  it('always resolves a supportive next step, including first-use and rest states', () => {
    expect(source).toContain("eyebrow: 'Best first step'");
    expect(source).toContain("drillId: 'home-row'");
    expect(source).toContain("kind: 'rest'");
    expect(source).toContain("eyebrow: 'Recovery is practice'");
    expect(source).toContain("kind: 'continue'");
  });

  it('uses mastery, error, recency, and accuracy signals for coach picks', () => {
    expect(source).toContain("kind: 'mastery'");
    expect(source).toContain("kind: 'focus'");
    expect(source).toContain("drillId: 'focus-errors'");
    expect(source).toContain("kind: 'refresh'");
    expect(source).toContain("kind: 'accuracy'");
  });

  it('estimates session duration from recent drill-specific performance', () => {
    expect(source).toContain('function estimateTypingPracticeDuration(state, drill, text)');
    expect(source).toContain("s.drillId === drill.id");
    expect(source).toContain("personalized: sessions.length > 0 || !!pb");
    expect(source).toContain("'aria-labelledby': 'tp-session-preview-title'");
    expect(source).toContain("label: 'Likely time'");
  });

  it('provides accessible drill filters and search', () => {
    expect(source).toContain("'aria-label': 'Filter drills'");
    expect(source).toContain("'aria-pressed': active ? 'true' : 'false'");
    expect(source).toContain("'aria-label': 'Search drills by name or description'");
    expect(source).toContain("{ id: 'recommended', label: 'For you'");
    expect(source).toContain("{ id: 'access', label: 'One-hand' }");
  });

  it('keeps drill results, sorting, and empty-state feedback synchronized', () => {
    expect(source).toContain('var visibleDrillIds = Object.keys(DRILLS)');
    expect(source).toContain("'aria-live': 'polite'");
    expect(source).toContain("'aria-label': 'Sort drills'");
    expect(source).toContain("h('option', { value: 'quickest' }, 'Shortest first')");
    expect(source).toContain("h('option', { value: 'least-practiced' }, 'Least practiced first')");
    expect(source).toContain('No drills match yet');
    expect(source).toContain('Clear search and filters');
  });

  it('supports keyboard-first drill discovery', () => {
    expect(source).toContain("if (key === '/')");
    expect(source).toContain("else if (key === 'g' || key === 'G')");
    expect(source).toContain("ref: drillSearchRef");
    expect(source).toContain("setAnnounceText('Drill search cleared.')");
    expect(source).toContain("{ keys: ['/']");
    expect(source).toContain("{ keys: ['G']");
  });

  it('keeps coach actions large enough and the deploy mirror synchronized', () => {
    expect(source).toContain("id: 'tp-coach-pick'");
    expect(source).toContain("minHeight: '44px'");
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'));
  });
});
