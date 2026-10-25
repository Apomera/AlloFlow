import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_flightsim.js';
const source = readFileSync(FILE, 'utf8');

// These are content regressions, not flight-model tests. Keep the rules shown
// to students aligned across the briefing, encyclopedia, quiz, and canvas HUD.
// Primary sources: 14 CFR 91.211, 107.29, 107.31, 107.41; FAA drone registration,
// remote-pilot recency, LAANC guidance; FAA AIM 8-1-3.
beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(FILE, 'flightSim');
});

function textFor(data) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('flightSim', { flightSim: data });
  return container.textContent;
}

function topic(id) {
  return textFor({ view: 'learn', learnTopic: id });
}

describe('Sky School aviation content accuracy', () => {
  it('quizzes oxygen exposure rather than inventing an unpressurized cruise ceiling', () => {
    const data = window.__RR_TEST_EXPORTS__.flightSim;
    const questions = [...data.FLIGHT_QUIZ, ...data.FLIGHT_QUIZ_EXTENDED];
    const oxygen = questions.find((item) => item.question.includes('13,000 ft for 45 minutes'));
    expect(oxygen).toBeDefined();
    expect(oxygen.question).toContain('cabin pressure altitude');
    expect(oxygen.question).toContain('required minimum flight crew');
    expect(oxygen.correct).toBe('For the portion exceeding 30 minutes');
    expect(oxygen.options).toContain(oxygen.correct);
    expect(oxygen.explanation).toContain('not an aircraft cruise-altitude limit');
    expect(questions.map((item) => item.question).join(' '))
      .not.toMatch(/maximum legal cruise altitude.*unpressurized/i);
  });

  it('distinguishes crew-use and occupant-provision oxygen requirements', () => {
    const text = topic('pressur');
    expect(text).toContain('Cabin pressure altitude above 12,500 ft through 14,000 ft');
    expect(text).toContain('use oxygen for the portion exceeding 30 minutes');
    expect(text).toContain('Cabin pressure altitude above 14,000 ft');
    expect(text).toContain('use oxygen for all time at these altitudes');
    expect(text).toContain('Cabin pressure altitude above 15,000 ft');
    expect(text).toContain('each occupant must be provided with supplemental oxygen');
  });

  it('teaches FL350 as an oxygen-mask rule for pressurized aircraft', () => {
    const text = topic('pressur');
    expect(text).toContain('Pressurized aircraft above FL350: pilot oxygen-mask rules apply');
    expect(text).toContain('quick-donning-mask exception extends through FL410');
    expect(text).toContain('not a rule requiring a pressurized cabin');
    expect(text).toContain('extra 10-minute oxygen supply for each occupant');
  });

  it('briefs current Part 107 night, registration, and airspace requirements', () => {
    const text = textFor({ view: 'menu', droneBriefing: true, selectedChallenge: 'drone_survey' });
    expect(text).toContain('Night flight can qualify without a waiver');
    expect(text).toContain('current Part 107 training requirements');
    expect(text).toContain('at least 3 statute miles');
    expect(text).toContain('Register every Part 107 drone');
    expect(text).toContain('Registration is required even under 250 g');
    expect(text).toContain('Class B, C, D, and airport surface Class E require prior ATC authorization');
    expect(text).toContain('LAANC or FAA DroneZone');
    expect(text).toContain('Distance from an airport alone does not determine this');
    expect(text).toContain('practice boundary, not a legal visibility distance');
  });

  it('keeps the drone deep dive current on training and authorization', () => {
    const text = topic('drone');
    expect(text).toContain('free FAA online recurrent training every 24 calendar months');
    expect(text).not.toContain('Recurrent test required');
    expect(text).toContain('Prior ATC authorization is required in Class B, C, D');
    expect(text).toContain('Airport distance alone does not determine the requirement');
    expect(text).toContain('approval is not guaranteed');
    expect(text).not.toContain('within 5 nautical miles');
    expect(text).not.toContain('AirMap');
    expect(text).not.toContain('Skyward');
  });

  it('keeps the regulations primer and drone aircraft lesson consistent with the briefing', () => {
    const text = topic('regs');
    expect(text).toContain('Night operations can qualify');
    expect(text).toContain('Register every Part 107 drone, including those under 250 g');
    expect(text).not.toContain('VLOS, daylight');
    const drone = window.__RR_TEST_EXPORTS__.flightSim.AIRCRAFT.find((item) => item.id === 'drone');
    expect(drone.lesson).toContain('structure exception');
    expect(drone.lesson).toContain('prior ATC authorization');
    expect(drone.lesson).toContain('practice boundary');
    expect(drone.lesson).toContain('real visibility is not defined by a fixed distance');
  });

  it('labels the canvas range warning as a simulation boundary rather than lost VLOS', () => {
    expect(source).toContain('Practice {nm} nm / {max}');
    expect(source).toContain('Beyond the sim’s 1 nm practice boundary');
    expect(source).not.toContain('visual line of sight lost!');
    expect(source).not.toContain('VLOS {nm} nm / {max} max');
    const mission = window.__RR_TEST_EXPORTS__.flightSim.CHALLENGES.find((item) => item.id === 'drone_survey');
    expect(mission.goals.join(' ')).toContain('practice boundary');
  });

  it('does not treat hyperventilation symptoms as proof that oxygen is adequate', () => {
    const text = topic('physio');
    expect(text).toContain('Hypoxia can cause similar symptoms or occur at the same time');
    expect(text).toContain('100 percent oxygen and check its operation before addressing breathing rate');
    expect(text).toContain('Consciously slow the rate and depth of breathing');
    expect(text).not.toContain('Breathe into a bag');
    expect(text).toContain('portion exceeding 30 minutes');
    expect(text).toContain('cabin pressure altitude');
  });
});
