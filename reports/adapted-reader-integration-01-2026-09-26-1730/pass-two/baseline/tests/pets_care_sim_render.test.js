// Pets Lab — Pet-Care Week, rendered.
//
// pets_care_sim_economy covers the model. This drives the real tool through
// SSR for the states the model tests cannot see: a mid-week day with logged
// overnight events (the timeline, the overnight note, the "tonight" note and
// the outlook all render from the same state), a finished week, and the
// species picker. The defect it exists for: a helper used by the timeline was
// defined inside renderCareSim, so the active day threw a ReferenceError the
// moment a night had an event, and no unit test rendered that state.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';

/** React escapes &, ' and friends in text nodes. */
function text(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ');
}

const careWeek = (over = {}) => ({
  species: 'dog', day: 3,
  choices: [{ choiceId: 'skip' }, { choiceId: 'long_alone' }, { choiceId: 'ignore' }],
  phys: 34, ment: 30, soc: 31, env: 38, en: 62, money: 602, startMoney: 650,
  lowMoney: false, tiredCare: 0, done: false,
  dailyInteractions: { 2: { feed: true } },
  consequenceLog: [{ day: 1, domain: 'ment' }, { day: 2, domain: 'ment' }, { day: 2, domain: 'soc' }],
  overnight: { skipped: ['pet', 'water', 'play', 'clean'], deltas: { phys: -1, ment: -3, soc: -3, env: -3 }, events: ['ment', 'soc'] },
  ...over,
});

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { resetStemLab(); loadTool(FILE, ID); });

describe('Pet-Care Week renders every mid-week surface from one state', () => {
  it('an active day with logged overnight events renders the timeline, the overnight note and tonight\'s forecast', () => {
    const html = renderTool(ID, { [ID]: { view: 'careSim', careSim: careWeek() } });
    const t = text(html);
    // Timeline night line for a past night with events, and the current day's routine count.
    expect(html).toContain('petslab-care-timeline-night');
    expect(t).toContain('Routine 1/5');
    // Consecutive nights on the same low meter alternate wording (night 1 is
    // odd → the alternate; night 2 is even → the primary). The timeline
    // carries the words in its aria-label; the icons are what is painted.
    expect(html).toContain('Routine care 0 of 5. Overnight: Shredded a shoe and the doormat.');
    expect(html).toContain('Overnight: Chewed the couch cushion overnight; Howled and paced after you left.');
    // Last night's note (day 3 follows night 2, the primary wording), with the
    // costs and the lesson line visible.
    expect(t).toContain('Overnight: Pet, Water, Play, Clean skipped yesterday');
    expect(t).toContain('Chewed the couch cushion overnight (−$40, −4 energy, −3 environmental)');
    expect(t).toContain('Howled and paced after you left (−3 energy)');
    // Outlook is stated in the provisional check.
    expect(html).toMatch(/data-pets-care-outlook="(reachable|out-of-reach)"/);
    // No decision made yet today: no "tonight" forecast and no aftermath panel.
    expect(html).not.toContain('petslab-care-tonight');
    expect(html).not.toContain('petslab-choice-aftermath');
  });

  it('after the day\'s choice, the forecast names tonight\'s skipped tasks and the event a low meter has set up', () => {
    const html = renderTool(ID, { [ID]: { view: 'careSim', careSim: careWeek({ choices: [{ choiceId: 'skip' }, { choiceId: 'long_alone' }, { choiceId: 'ignore' }, { choiceId: 'skip' }] }) } });
    const t = text(html);
    expect(html).toContain('petslab-care-tonight');
    expect(t).toContain('Tonight, as things stand');
    expect(t).toMatch(/is coming \(/);
    expect(t).toContain('ends tonight below 40%');
  });

  it('a finished week lists the events by night and offers the reflection note', () => {
    const html = renderTool(ID, { [ID]: { view: 'careSim', careSim: careWeek({
      day: 6, done: true, badgeEarned: false,
      choices: ['skip', 'long_alone', 'ignore', 'skip', 'nothing', 'alone_visits', 'allow'].map((choiceId) => ({ choiceId })),
    }) } });
    const t = text(html);
    expect(t).toContain('Overnight events: 3');
    expect(t).toContain('Night 2 ·');
    expect(t).toContain('Night 3 ·');
    expect(t).toContain('A stronger call that day');
    expect(html).toContain('petslab-care-reflect-note');
    expect(t).toContain('One thing you would do differently next week');
  });

  it('the teacher card keeps the finished week on top and notes a later reflection beneath it', () => {
    const week = { id: 'a', moduleId: 'careSim', moduleLabel: 'Pet-Care Week', kind: 'activity', summary: 's', recordedAt: '2026-09-13T15:00:00.000Z',
      details: { species: 'rabbit', days: 7, physical: 100, mental: 100, social: 100, environmental: 80, weakestDomain: 'Environmental', weakestPct: 80, averagePct: 95, overnightEvents: 2, moneyLeft: 204, stayedInBudget: true, energyLeft: 32, caregiverSustainable: true, criterionMet: true } };
    const reflection = { id: 'b', moduleId: 'careSim', moduleLabel: 'Pet-Care Week', kind: 'self-review', summary: 'x', recordedAt: '2026-09-13T15:05:00.000Z', details: {} };
    const html = renderTool(ID, { [ID]: { view: 'teacher', evidenceRecords: [week, reflection] } });
    const t = text(html);
    const card = t.slice(t.indexOf('Pet-Care Week (sim)'), t.indexOf('Learning targets'));
    expect(card).toContain('Activity target met');
    expect(card).toContain('Average 95%');
    expect(card).toContain('Overnight events 2');
    expect(card).toContain('Reflection recorded after this week');
    expect(card).not.toContain('One thing to do differently');
    // And with the reflection alone (no finished week on record), the card is the reflection.
    const alone = text(renderTool(ID, { [ID]: { view: 'teacher', evidenceRecords: [reflection] } }));
    expect(alone).toContain('One thing to do differently next week');
    // No article-as-listitem anywhere on the tab.
    expect(html).not.toMatch(/<article[^>]*role="listitem"/);
  });

  it('week 2 is offered after a finished week 1, plays its own days, and can hand back', () => {
    const finishedWeek1 = careWeek({
      day: 6, done: true, badgeEarned: true,
      choices: ['full', 'walk_first', 'reduce', 'all', 'short_outside', 'sitter', 'intercept'].map((choiceId) => ({ choiceId })),
      phys: 100, ment: 100, soc: 98, env: 78, money: 178, consequenceLog: [], overnight: null,
    });
    const reflection = text(renderTool(ID, { [ID]: { view: 'careSim', careSim: finishedWeek1 } }));
    expect(reflection).toContain('Continue: week 2, the adolescent dog');
    expect(reflection).not.toContain('Back to week 1');
    // Week 2, day 2: its own prompt, scene chips, link and choices; the week is named.
    const week2Day = renderTool(ID, { [ID]: { view: 'careSim', careSim: {
      species: 'dog', week: 2, day: 1, choices: [{ choiceId: 'greet_sit' }],
      phys: 60, ment: 62, soc: 58, env: 56, en: 88, money: 647, startMoney: 650,
      lowMoney: false, tiredCare: 0, done: false, dailyInteractions: { 0: { feed: true, water: true, play: true, pet: true, clean: true } },
    } } });
    const t2 = text(week2Day);
    expect(t2).toContain('Pet-Care Week 2 — Dog');
    expect(t2).toContain('Walks have become a tow');
    expect(t2).toContain('Leash pulling');
    expect(t2).toContain('Guests at the door');
    expect(t2).toContain('Front-clip harness');
    expect(t2).not.toContain('friend invites you to a movie');
    // A finished week 2 offers the way back, and its retry names the week.
    const finishedWeek2 = text(renderTool(ID, { [ID]: { view: 'careSim', careSim: {
      species: 'dog', week: 2, day: 6, done: true, badgeEarned: false,
      choices: ['greet_sit', 'harness_stop', 'trade_up', 'clean_brush', 'long_line', 'safe_den', 'parallel_walk'].map((choiceId) => ({ choiceId })),
      phys: 100, ment: 100, soc: 100, env: 78, en: 27, money: 134, startMoney: 650, lowMoney: false, tiredCare: 0, dailyInteractions: {},
    } } }));
    expect(finishedWeek2).toContain('Pet-Care Week 2 — Reflection');
    expect(finishedWeek2).toContain('Retry week 2');
    // A week-2 target met names the second badge on the summary.
    const week2Badge = text(renderTool(ID, { [ID]: { view: 'careSim', badges: { pets_seasoned: { earned: '2026-09-13T16:00:00.000Z' } }, careSim: {
      species: 'dog', week: 2, day: 6, done: true, badgeEarned: true,
      choices: ['greet_sit', 'harness_stop', 'trade_up', 'clean_brush', 'long_line', 'safe_den', 'parallel_walk'].map((choiceId) => ({ choiceId })),
      phys: 100, ment: 100, soc: 100, env: 78, en: 27, money: 134, startMoney: 650, lowMoney: false, tiredCare: 0, dailyInteractions: {},
    } } }));
    expect(week2Badge).toContain('Badge earned: Seasoned Owner (week 2)');
    expect(finishedWeek2).toContain('Back to week 1');
    expect(finishedWeek2).not.toContain('Continue: week 2');
    // The picker unlocks week 2 only once a week-1 record exists for that species.
    const locked = text(renderTool(ID, { [ID]: { view: 'careSim', careSim: null, evidenceRecords: [] } }));
    expect(locked).not.toContain('Week 2 unlocked');
    const unlocked = text(renderTool(ID, { [ID]: { view: 'careSim', careSim: null, evidenceRecords: [{
      id: 'careSim:w1', moduleId: 'careSim', moduleLabel: 'Pet-Care Week', kind: 'activity', summary: 's', recordedAt: '2026-09-13T10:00:00.000Z',
      details: { species: 'dog', week: 1, days: 7, physical: 90, mental: 90, social: 90, environmental: 80, weakestDomain: 'Environmental', weakestPct: 80, averagePct: 88, moneyLeft: 178, stayedInBudget: true, energyLeft: 27, caregiverSustainable: true, criterionMet: true },
    }] } }));
    expect(unlocked).toContain('Week 2 unlocked');
    expect(unlocked).toContain('Dog, week 2');
    expect(unlocked).toContain('Seven days: Guests at the door · Leash pulling');
    // The two weeks keep separate reflection notes.
    const notes = { dog: 'Walk first next time.', 'dog-w2': 'Long line until the recall is back.' };
    const w1 = renderTool(ID, { [ID]: { view: 'careSim', careReflections: notes, careSim: finishedWeek1 } });
    const w2 = renderTool(ID, { [ID]: { view: 'careSim', careReflections: notes, careSim: {
      species: 'dog', week: 2, day: 6, done: true, badgeEarned: false,
      choices: ['greet_sit', 'harness_stop', 'trade_up', 'clean_brush', 'long_line', 'safe_den', 'parallel_walk'].map((choiceId) => ({ choiceId })),
      phys: 100, ment: 100, soc: 100, env: 78, en: 27, money: 134, startMoney: 650, lowMoney: false, tiredCare: 0, dailyInteractions: {},
    } } });
    expect(w1).toContain('Walk first next time.');
    expect(w1).not.toContain('Long line until the recall is back.');
    expect(w2).toContain('Long line until the recall is back.');
    expect(w2).not.toContain('Walk first next time.');
  });

  it('the species picker previews the seven days and shows history from the evidence log', () => {
    const html = renderTool(ID, { [ID]: { view: 'careSim', careSim: null, evidenceRecords: [{
      id: 'careSim:x', moduleId: 'careSim', moduleLabel: 'Pet-Care Week', kind: 'activity', summary: 's', recordedAt: '2025-12-01T10:00:00.000Z',
      details: { species: 'cat', days: 7, physical: 80, mental: 80, social: 80, environmental: 80, weakestDomain: 'Physical', weakestPct: 80, averagePct: 80, moneyLeft: 100, stayedInBudget: true, energyLeft: 50, caregiverSustainable: true, criterionMet: true },
    }] } });
    const t = text(html);
    expect(t).toContain('Seven days: Routine morning');
    expect(t).toContain('Seven days: Safe room');
    expect(t).toContain('Seven days: New enclosure');
    expect(t).toContain('1 attempt · best average 80% · target met');
    expect(t).toContain('Not tried yet');
    // Short accessible name, details as the description (an explicit aria-label
    // would have replaced the button's visible content with a paragraph).
    expect(html).toMatch(/<button[^>]*aria-labelledby="petslab-care-species-dog-name"[^>]*aria-describedby="petslab-care-species-dog-desc"/);
    expect(html).toMatch(/id="petslab-care-species-dog-name"[^>]*>Dog \(high-energy young\)</);
    const desc = html.slice(html.indexOf('id="petslab-care-species-dog-desc"'), html.indexOf('id="petslab-care-species-cat-name"'));
    expect(text(desc)).toContain('Seven days: Routine morning · Social plans');
    expect(text(desc)).toContain('Week budget: $650');
    expect(html).not.toMatch(/<button[^>]*aria-label="Dog \(high-energy young\)/);
  });
});
