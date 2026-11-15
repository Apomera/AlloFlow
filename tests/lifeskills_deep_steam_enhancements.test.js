import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const ROOT = process.cwd();
const LIFESKILLS_PATHS = [
  'stem_lab/stem_tool_lifeskills.js',
  'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js',
  'desktop/app-build/stem_lab/stem_tool_lifeskills.js',
  'desktop/web-app/build/stem_lab/stem_tool_lifeskills.js',
];
const CAPSTONE_PATHS = [
  'life_skills_capstone/life_skills_capstone.html',
  'desktop/web-app/public/life_skills_capstone/life_skills_capstone.html',
  'desktop/app-build/life_skills_capstone/life_skills_capstone.html',
  'desktop/web-app/build/life_skills_capstone/life_skills_capstone.html',
];
const FOUNDATION_3D_LABS = ['safety', 'repair', 'kitchen', 'laundry', 'transit'];

function read(relPath) {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

function loadPureSteamHelpers() {
  const src = read(LIFESKILLS_PATHS[0]);
  const start = src.indexOf('function detectLifeSkillsPII(text)');
  const end = src.indexOf('window.StemLab.registerTool(\'lifeSkills\'', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const block = src.slice(start, end) + '\n;({ detectLifeSkillsPII, calcEnvelopeHeatLoss, calcBacterialMultiples, calcCaffeineRemaining, simulateCardPayoff, calcStephanCurvePH, checkActiveIngredientOverlap, calcStoppingDistanceFt, calcWaterLeakWaste, calcBufferedSchedule, calcTransitBreakEven, sanitizePromptForZeroPII, calcContractTotalCost, calcShiftPaystubAudit, calcCoAndAlarmSafety, calcPasswordEntropyAndMfa, evaluateOnboardingIdCombo, calcVitalTriageGuide, calcDeescalationTrajectory, inferQuestionDomain, buildQuizChoiceBank, calcBayesBaseRate, calcExpectedValueComparison, calcCervicalAndLiftBiomechanics, analyzeResumeAndStarMetrics, calcPanScalingAndMealPrep, calcLaundryWaterAndThermal })';
  return vm.runInNewContext(block, {});
}

function mountInteractiveLifeSkills(initialLifeSkillsState, ctxOverrides) {
  resetStemLab();
  const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
  let latestState = null;
  let capturedToolSwitch = null;

  function Harness() {
    const [toolData, setToolData] = React.useState({ lifeSkills: Object.assign({}, initialLifeSkillsState || {}) });
    latestState = toolData.lifeSkills || {};
    const ctx = makeCtx(Object.assign({
      toolData,
      setToolData,
      setStemLabTool: (id) => { capturedToolSwitch = id; },
    }, ctxOverrides || {}));
    return cfg.render(ctx);
  }

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  React.act(() => {
    root.render(React.createElement(Harness));
  });

  return {
    host,
    getState: () => latestState,
    getSwitchedTool: () => capturedToolSwitch,
    clickButton: (textOrSubstring) => {
      const btns = [...host.querySelectorAll('button')];
      const match = btns.find((b) => (b.textContent || '').includes(textOrSubstring));
      if (!match) {
        throw new Error('Button not found containing "' + textOrSubstring + '". Available: ' + btns.map((b) => b.textContent).join(' | '));
      }
      React.act(() => {
        match.click();
      });
    },
    setInputByAriaLabel: (label, value) => {
      const el = host.querySelector('[aria-label="' + label + '"]');
      if (!el) throw new Error('Input not found with aria-label: ' + label);
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      React.act(() => {
        setter.call(el, value);
        el.dispatchEvent(new window.Event('input', { bubbles: true }));
      });
    },
    unmount: () => {
      React.act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

let activeMount = null;

beforeEach(() => {
  resetStemLab();
});

afterEach(() => {
  if (activeMount) {
    activeMount.unmount();
    activeMount = null;
  }
  vi.restoreAllMocks();
});

describe('Life Skills deep STEAM & UDL enhancements', () => {
  it('maintains 4-way byte parity across source, public, app-build, and web-app/build mirrors', () => {
    const lsPrimary = read(LIFESKILLS_PATHS[0]);
    for (const mirror of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirror)).toBe(lsPrimary);
    }
    const capPrimary = read(CAPSTONE_PATHS[0]);
    for (const mirror of CAPSTONE_PATHS.slice(1)) {
      expect(read(mirror)).toBe(capPrimary);
    }
  });

  it('validates pure STEAM science, engineering, finance, and Zero-PII helpers', () => {
    const {
      detectLifeSkillsPII,
      calcEnvelopeHeatLoss,
      calcBacterialMultiples,
      calcCaffeineRemaining,
      simulateCardPayoff,
    } = loadPureSteamHelpers();

    // Zero-PII detection + synthetic persona exemption
    expect(detectLifeSkillsPII('Sam Rivera sam.rivera@example.test (555) 014-8200').hasPII).toBe(false);
    const flagged = detectLifeSkillsPII('Contact maria.gomez@realmail.org or 617-555-8291 at 742 Evergreen St');
    expect(flagged.hasPII).toBe(true);
    expect(flagged.reasons).toContain('personal email address');
    expect(flagged.reasons).toContain('phone number');
    expect(flagged.reasons).toContain('street address');
    expect(detectLifeSkillsPII('ID 123-45-6789').reasons).toContain('SSN-like 9-digit sequence');

    // Building Envelope Heat-Loss Q = A * dT / R and Heat Pump COP
    const r15Base = calcEnvelopeHeatLoss(1200, 35, 15, 1.0, 0);
    const r30Half = calcEnvelopeHeatLoss(1200, 35, 30, 1.0, 0);
    expect(r30Half.btuConduction).toBe(Math.round(r15Base.btuConduction / 2));
    const cop3 = calcEnvelopeHeatLoss(1200, 35, 15, 3.0, 0);
    expect(cop3.kwh24).toBeCloseTo(r15Base.kwh24 / 3, 1);

    // Food safety exponential doubling
    const twoHours = calcBacterialMultiples(120, 20);
    expect(twoHours.generations).toBe(6);
    expect(twoHours.factor).toBe(64);

    // Caffeine half-life curve
    expect(calcCaffeineRemaining(100, 5.5, 5.5)).toBe(50);
    expect(calcCaffeineRemaining(200, 11, 5.5)).toBe(50);

    // Credit card payoff divergence
    const minPlan = simulateCardPayoff(3000, 24, 75, 60);
    const fastPlan = simulateCardPayoff(3000, 24, 200, 60);
    expect(fastPlan.months).toBeLessThan(minPlan.months);
    expect(fastPlan.totalInterest).toBeLessThan(minPlan.totalInterest);
    expect(fastPlan.endingBalance).toBe(0);
    expect(fastPlan.series.length).toBeGreaterThan(2);
  });

  it('fixes Capstone 3D source key, supports inline window.parent messaging, transition role, and scoped storage', () => {
    const html = read(CAPSTONE_PATHS[0]);
    const posted = [];
    const dom = new JSDOM(html, {
      url: 'https://alloflow.example/life_skills_capstone/life_skills_capstone.html?role=transition&learner=sam01&v=3',
      referrer: 'https://alloflow.example/',
      runScripts: 'dangerously',
      beforeParse(win) {
        Object.defineProperty(win, 'opener', { value: null, configurable: true });
        Object.defineProperty(win, 'parent', {
          value: { postMessage: (msg, origin) => posted.push({ msg, origin }) },
          configurable: true,
        });
        win.AFRAME = { registerComponent: () => {} };
      },
    });

    // Verify scoped storage key kept clean while preserving base storageKey declaration
    expect(html).toContain("var storageKey = 'alloflow-life-capstone-3d-progress-v1';");
    expect(dom.window.document.body.textContent).toMatch(/young adult|independent|workplace/i);

    // Complete first station's safe choice and confirm source is NOT overwritten
    const safeChoiceBtn = [...dom.window.document.querySelectorAll('#choices button')].find((b) =>
      /turn the heat off/i.test(b.textContent || '')
    );
    expect(safeChoiceBtn).toBeTruthy();
    safeChoiceBtn.click();

    const taskMsg = posted.find((p) => p.msg && p.msg.type === 'alloflow-life-capstone-3d-task-complete');
    expect(taskMsg).toBeTruthy();
    expect(taskMsg.msg.source).toBe('alloflow-life-capstone-3d');
    expect(taskMsg.origin).toBe('https://alloflow.example');
  });

  it('renders UDL controls, Hero Read/Pin buttons, Inline 3D Workspace, and hides Contracts spoilers before click', () => {
    loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');

    const headerHtml = renderTool('lifeSkills', {
      lifeSkills: {
        lsLifeRole: 'transition',
        lsSupportMode: 'steam',
        lsDomain: 'money',
        lsInlineLab: 'capstone',
        lsPinnedTabs: ['budget'],
      },
    });
    expect(headerHtml).toContain('data-lifeskills-udl-nav="true"');
    expect(headerHtml).toContain('Transition 18-22');
    expect(headerHtml).toContain('Deep STEAM');
    expect(headerHtml).toContain('data-lifeskills-pinned-bar="true"');
    expect(headerHtml).toContain('Read');
    expect(headerHtml).toContain('Pin');
    expect(headerHtml).toContain('data-lifeskills-inline-workspace="capstone"');
    expect(headerHtml).toContain('role=transition');

    const contractHtml = renderTool('lifeSkills', { lifeSkills: { tab: 'contract', crLevel: 0, crFound: [] } });
    expect(contractHtml).toContain('data-lifeskills-contract-redliner="true"');
    expect(contractHtml).toContain('Clause #1');
    expect(contractHtml).toContain('Paper Trail');
    expect(contractHtml).not.toContain('Early termination fee');
  });

  it('fixes Challenge AI question evaluation and blocks score farming via lsScoredMap', () => {
    activeMount = mountInteractiveLifeSkills({
      tab: 'challenge',
      chalTier: 1,
      chalIdx: 0,
      chalAIQ: { q: 'What is combined FICA tax rate (6.2% + 1.45%)?', a: '7.65', h: 'Add 6.2 and 1.45' },
    });

    expect(activeMount.host.textContent).toContain('What is combined FICA tax rate (6.2% + 1.45%)?');
    activeMount.setInputByAriaLabel('Answer', '7.65');
    activeMount.clickButton('Check');
    expect(activeMount.getState().chalScore).toBe(10);
    expect(activeMount.getState().chalStreak).toBe(1);

    // Repeat submission on same question must NOT award extra points or streak
    activeMount.setInputByAriaLabel('Answer', '7.65');
    activeMount.clickButton('Check');
    expect(activeMount.getState().chalScore).toBe(10);
    expect(activeMount.getState().chalStreak).toBe(1);

    // Skip clears orphan chalAIQ
    activeMount.clickButton('Skip');
    expect(activeMount.getState().chalAIQ).toBeNull();
  });

  it('renders all new STEAM simulators and unlocks homeExpert offline via HOMESYS_QUIZ', () => {
    loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');

    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'data' } })).toContain('data-lifeskills-honest-chart-studio="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'decision' } })).toContain('data-lifeskills-decision-sensitivity="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'homesys' } })).toContain('data-lifeskills-envelope-sim="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'credit' } })).toContain('data-lifeskills-credit-divergence="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'cooking' } })).toContain('data-lifeskills-bacteria-curve="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'bodycare' } })).toContain('data-lifeskills-ergo-svg="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'sleep' } })).toContain('data-lifeskills-caffeine-curve="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'digitalsafety' } })).toContain('data-lifeskills-scam-inspector="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'budget' } })).toContain('data-lifeskills-budget-stress="true"');

    // Battle progressbars & input accessible names
    const battleHtml = renderTool('lifeSkills', { lifeSkills: { tab: 'battle', battleActive: true, battlePlayerHP: 80, battleEnemyHP: 60 } });
    expect(battleHtml).toContain('aria-label="Your HP"');
    expect(battleHtml).toContain('aria-valuenow="80"');
    expect(battleHtml).toContain('aria-label="Adulting Boss HP"');
    expect(battleHtml).toContain('aria-valuenow="60"');
    expect(battleHtml).toContain('aria-label="Answer to battle question"');

    // Offline HOMESYS_QUIZ progression unlocks homeExpert without callGemini
    activeMount = mountInteractiveLifeSkills({ tab: 'homesys', homesysQuizIdx: 0 }, { callGemini: null });
    activeMount.clickButton('Cuts conductive heat loss in half');
    expect(activeMount.getState().homesysQuizScore).toBe(1);
    activeMount.clickButton('Next Engineering Question');
    activeMount.clickButton('About one-third as much electricity');
    expect(activeMount.getState().homesysQuizScore).toBe(2);
    expect(activeMount.getState().badges.homeExpert).toBeTruthy();
  });

  it('connects Paycheck -> Budget, Proof Locker -> Resume -> Interview, Sam Rivera samples, PII warnings, and AAC strips', () => {
    loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');

    // AAC strips on Appointments, Transport, Communication
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'appointments' } })).toContain('data-lifeskills-aac-strip="appointments"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'transport' } })).toContain('data-lifeskills-aac-strip="transport"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'communication' } })).toContain('data-lifeskills-aac-strip="communication"');

    // PII banner renders for unsafe personal data, hides for Sam Rivera placeholder
    const unsafeResumeHtml = renderTool('lifeSkills', {
      lifeSkills: {
        tab: 'resumebuilder',
        resumeContext: 'Email me at jane.student@gmail.com or 617-555-9911',
      },
    });
    expect(unsafeResumeHtml).toContain('Privacy Reminder');
    const safeResumeHtml = renderTool('lifeSkills', {
      lifeSkills: {
        tab: 'resumebuilder',
        resumeContext: 'Weekend library cart (sam.rivera@example.test / (555) 014-8200)',
      },
    });
    expect(safeResumeHtml).not.toContain('Privacy Reminder');

    // Interactive Paycheck -> Budget sync
    activeMount = mountInteractiveLifeSkills({ tab: 'paycheck', payRate: 25, payHours: 40 });
    activeMount.clickButton('Send Monthly Take-Home');
    expect(activeMount.getState().tab).toBe('budget');
    expect(activeMount.getState().budgetIncome).toBeGreaterThan(2500);
    activeMount.unmount();

    // Interactive Proof Locker -> Resume Builder -> Interview Studio array pipeline
    activeMount = mountInteractiveLifeSkills({ tab: 'prooflocker' });
    activeMount.clickButton('Load Fictional Sample (Sam Rivera)');
    activeMount.clickButton('Save proof item');
    expect(Array.isArray(activeMount.getState().savedProofItems)).toBe(true);
    expect(activeMount.getState().savedProofItems.length).toBe(1);
    activeMount.clickButton('Send to Resume Builder');
    expect(activeMount.getState().tab).toBe('resumebuilder');
    expect(activeMount.host.textContent).toContain('Import from Proof Locker');
    activeMount.clickButton('Load Fictional Sample (Sam Rivera)');
    activeMount.clickButton('Save evidence bullet');
    expect(activeMount.getState().savedResumeBullets.length).toBe(1);
    activeMount.clickButton('Use in Interview Studio');
    expect(activeMount.getState().tab).toBe('interviewstudio');
    expect(activeMount.host.textContent).toContain('Import saved proof or resume bullets');
  });

  it('maintains 4-way mirror parity and inline window.parent / ?learner= / ?role=transition bridge across all 5 foundation 3D labs', () => {
    for (const lab of FOUNDATION_3D_LABS) {
      const base = `life_skills_${lab}/life_skills_${lab}.html`;
      const primary = read(base);
      for (const prefix of ['desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/']) {
        expect(read(prefix + base)).toBe(primary);
      }
      expect(primary).toContain('function adaptRoleCopy(text)');
      expect(primary).toContain('window.parent !== window');
      expect(primary).toContain("var storageKey = 'alloflow-life-" + lab + "-3d-progress-v1';");
    }

    const safetyHtml = read('life_skills_safety/life_skills_safety.html');
    const posted = [];
    const dom = new JSDOM(safetyHtml, {
      url: 'https://alloflow.example/life_skills_safety/life_skills_safety.html?role=transition&learner=sam02&v=1',
      referrer: 'https://alloflow.example/',
      runScripts: 'dangerously',
      beforeParse(win) {
        Object.defineProperty(win, 'opener', { value: null, configurable: true });
        Object.defineProperty(win, 'parent', {
          value: { postMessage: (msg, origin) => posted.push({ msg, origin }) },
          configurable: true,
        });
        win.AFRAME = { registerComponent: () => {} };
      },
    });

    const progressMsg = posted.find((p) => p.msg && p.msg.type === 'alloflow-life-safety-3d-progress');
    expect(progressMsg).toBeTruthy();
    expect(progressMsg.msg.source).toBe('alloflow-life-safety-3d');
    expect(progressMsg.origin).toBe('https://alloflow.example');

    const firstTaskBtn = dom.window.document.querySelector('#taskList button, #scenarioChoices button');
    expect(firstTaskBtn).toBeTruthy();
    firstTaskBtn.click();
    expect(dom.window.localStorage.getItem('alloflow-life-safety-3d-progress-v1:sam02')).toBeTruthy();
  });

  it('validates Wave 2 pure quantitative helpers (dental pH, OTC overlap, braking kinematics, water waste, time buffer, transit break-even)', () => {
    const {
      calcStephanCurvePH,
      checkActiveIngredientOverlap,
      calcStoppingDistanceFt,
      calcWaterLeakWaste,
      calcBufferedSchedule,
      calcTransitBreakEven,
    } = loadPureSteamHelpers();

    const stephanLow = calcStephanCurvePH(2);
    const stephanHigh = calcStephanCurvePH(6);
    expect(stephanHigh.acidMinutesPerDay).toBeGreaterThan(stephanLow.acidMinutesPerDay);
    expect(stephanHigh.minPH).toBeLessThan(5.5);

    const overlap = checkActiveIngredientOverlap(['multi_cold_day', 'pain_relief_acet'], 2);
    expect(overlap.overlaps).toContain('Acetaminophen');
    expect(overlap.exceeded).toContain('Acetaminophen');
    expect(overlap.hasRisk).toBe(true);

    const dryStop = calcStoppingDistanceFt(60, 0.75, 1.5);
    const wornWetStop = calcStoppingDistanceFt(60, 0.25, 1.5);
    expect(wornWetStop.totalFt).toBeGreaterThan(dryStop.totalFt);

    const leak = calcWaterLeakWaste(60, 'running', 12);
    expect(leak.galPerDay).toBeGreaterThan(200);
    expect(leak.annualCost).toBeGreaterThan(800);

    const sched = calcBufferedSchedule(40, 2, 25, 15);
    expect(sched).toEqual({ baseTaskMin: 50, bufferMin: 13, transitWaitMin: 15, totalRequiredMin: 78 });

    expect(calcTransitBreakEven(2.75, 10, 85).recommended).toBe('pass');
    expect(calcTransitBreakEven(2.75, 2, 85).recommended).toBe('per-ride');
  });

  it('adapts UDL lsSupportMode / lsLifeRole copy, unlocks Deep STEAM equations on K-2, and renders 6-lab inline switcher', () => {
    loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');

    const steamHtml = renderTool('lifeSkills', {
      lifeSkills: { tab: 'science', lsSupportMode: 'steam', lsLifeRole: 'transition' },
    }, { gradeLevel: 2 });
    expect(steamHtml).toContain('data-lifeskills-steam-lens="true"');
    expect(steamHtml).toContain('P\u2081/T\u2081 = P\u2082/T\u2082');

    const plainTransitionMeds = renderTool('lifeSkills', {
      lifeSkills: { tab: 'meds', lsSupportMode: 'plain', lsLifeRole: 'transition' },
    });
    expect(plainTransitionMeds).toContain('trusted support contact');

    const switcherHtml = renderTool('lifeSkills', {
      lifeSkills: { lsInlineLab: 'safety', lsLifeRole: 'transition' },
    });
    expect(switcherHtml).toContain('aria-label="Switch inline 3D companion lab"');
    expect(switcherHtml).toContain('Home safety');
    expect(switcherHtml).toContain('Transit safety');
  });

  it('prevents XP and badge farming in carcare dashboard quiz and homerepair plumbing diagnosis', () => {
    const awardCalls = [];
    activeMount = mountInteractiveLifeSkills(
      { tab: 'carcare', ccDashQ: 0 },
      { awardXP: (toolId, amount, reason) => awardCalls.push({ toolId, amount, reason }) }
    );
    activeMount.clickButton('Check Engine');
    activeMount.clickButton('Check Engine');
    expect(activeMount.getState().ccDashScore).toBe(1);
    expect((activeMount.getState().badges || {}).mechanic).toBeFalsy();
    expect(awardCalls.filter((c) => c.reason === 'Dashboard quiz')).toHaveLength(1);

    activeMount.clickButton('Next Light');
    activeMount.clickButton('Temperature Warning');
    activeMount.clickButton('Next Light');
    activeMount.clickButton('Battery/Charging');
    expect(activeMount.getState().ccDashScore).toBe(3);
    expect((activeMount.getState().badges || {}).mechanic).toBeTruthy();
    activeMount.unmount();

    const plumbAwardCalls = [];
    activeMount = mountInteractiveLifeSkills(
      { tab: 'homerepair', plumbQ: 0 },
      { awardXP: (toolId, amount, reason) => plumbAwardCalls.push({ toolId, amount, reason }) }
    );
    activeMount.clickButton('Fill Valve');
    activeMount.clickButton('Fill Valve');
    expect(activeMount.getState().plumbScore).toBe(1);
    expect((activeMount.getState().badges || {}).handyman).toBeTruthy();
    expect(plumbAwardCalls.filter((c) => c.reason === 'Plumbing diagnosis')).toHaveLength(1);
  });

  it('renders Wave 2 STEAM simulators across subtools, exports Zero-PII readiness summary, and bridges Budget / sister tools', () => {
    loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');

    const overviewHtml = renderTool('lifeSkills', {
      lifeSkills: { tab: 'overview', overviewNextStep: 'Call Dr. Patel at 617-555-0199' },
    });
    expect(overviewHtml).toContain('data-lifeskills-readiness-export="true"');
    expect(overviewHtml).toContain('Privacy Reminder');
    const preMatch = overviewHtml.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
    expect(preMatch).toBeTruthy();
    expect(preMatch[1]).not.toContain('Patel');
    expect(preMatch[1]).not.toContain('617-555-0199');

    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'dental' } })).toContain('data-lifeskills-stephan-curve="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'meds' } })).toContain('data-lifeskills-med-overlap="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'insurance' } })).toContain('data-lifeskills-insurance-crossover="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'carcare' } })).toContain('data-lifeskills-stopping-distance="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'homerepair' } })).toContain('data-lifeskills-water-leak="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'timemanagement' } })).toContain('data-lifeskills-time-buffer="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'transport' } })).toContain('data-lifeskills-transit-breakeven="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'foodconfidence' } })).toContain('data-lifeskills-unit-price="true"');
    const learnHtml = renderTool('lifeSkills', { lifeSkills: { tab: 'learn' } }, { callTTS: null });
    expect(learnHtml).toContain('data-lifeskills-learn="true"');
    expect(learnHtml).toContain('aria-label="Filter concept topics"');
    expect(learnHtml).toContain('Read Aloud');

    activeMount = mountInteractiveLifeSkills({ tab: 'insurance' });
    activeMount.clickButton('Send Plan A Premium');
    expect(activeMount.getState().budgetExp.Insurance).toBe(250);
    activeMount.unmount();

    activeMount = mountInteractiveLifeSkills({ tab: 'dental' });
    activeMount.clickButton('Titration & pH Lab');
    expect(activeMount.getSwitchedTool()).toBe('titrationLab');
    activeMount.unmount();

    activeMount = mountInteractiveLifeSkills({ tab: 'science' });
    activeMount.clickButton('Circuit Builder Lab');
    expect(activeMount.getSwitchedTool()).toBe('circuit');
  });

  it('validates Wave 3 pure STEAM/UDL math helpers and Zero-PII redaction', () => {
    const h = loadPureSteamHelpers();

    // Zero-PII redaction preserves safe samples while scrubbing SSN/email/phone/street
    const scrub = h.sanitizePromptForZeroPII(
      'My SSN is 123-45-6789, email real.person@gmail.com, sample ok@example.test, tel 617-867-5309, mock 555-0199 at 742 Evergreen St'
    );
    expect(scrub.hadPII).toBe(true);
    expect(scrub.sanitizedText).toContain('[REDACTED-ID]');
    expect(scrub.sanitizedText).toContain('[REDACTED-EMAIL]');
    expect(scrub.sanitizedText).toContain('[REDACTED-PHONE]');
    expect(scrub.sanitizedText).toContain('[REDACTED-ADDRESS]');
    expect(scrub.sanitizedText).toContain('ok@example.test');
    expect(scrub.sanitizedText).toContain('555-0199');
    expect(scrub.sanitizedText).not.toContain('123-45-6789');
    expect(scrub.sanitizedText).not.toContain('real.person@gmail.com');

    // Contract cashflow & early buyout math
    const lease = h.calcContractTotalCost(1200, 100, 1200, 75, 12, 10, 8, 600);
    expect(lease.effectiveMonthly).toBe(1300);
    expect(lease.moveInCash).toBe(2500);
    expect(lease.nonRefundableDeposit).toBe(300);
    expect(lease.firstTermNetCost).toBe(15900);
    expect(lease.renewalMonthly).toBe(1430);
    expect(lease.finishTermRemainingCost).toBe(5200);
    expect(lease.betterExitOption).toBe('buyout');

    // FLSA 1.5x overtime & underpayment verifier
    const pay = h.calcShiftPaystubAudit(20, 46, 30, 5, 6, 850);
    expect(pay.unpaidBreakHoursWk).toBe(2.5);
    expect(pay.netPaidHours).toBe(43.5);
    expect(pay.regularHours).toBe(40);
    expect(pay.overtimeHours).toBe(3.5);
    expect(pay.expectedGross).toBe(905);
    expect(pay.hasUnderpayment).toBe(true);
    expect(pay.weeklyCommute).toBe(30);

    // Home Safety CO dose + acoustic door loss (~16 dB/door)
    const coSafe = h.calcCoAndAlarmSafety(5, 2, 0, 85);
    expect(coSafe.coRisk).toBe('normal');
    expect(coSafe.pillowDb).toBe(85);
    expect(coSafe.meetsSleeping75Db).toBe(true);
    const coLoudLoss = h.calcCoAndAlarmSafety(200, 2, 2, 85);
    expect(coLoudLoss.coRisk).toBe('emergency');
    expect(coLoudLoss.pillowDb).toBe(53);
    expect(coLoudLoss.meetsSleeping75Db).toBe(false);

    // Digital Safety entropy & MFA defense
    const weakPw = h.calcPasswordEntropyAndMfa(8, 26, 10, false);
    const strongPw = h.calcPasswordEntropyAndMfa(20, 94, 10, true);
    expect(strongPw.entropyBits).toBeGreaterThan(weakPw.entropyBits * 2);
    expect(strongPw.automatedTakeoverReductionPct).toBe(99.9);
    expect(weakPw.automatedTakeoverReductionPct).toBe(0);

    // I-9 ID verification matrix & anti-oversharing check
    expect(h.evaluateOnboardingIdCombo(['passport']).verified).toBe(true);
    expect(h.evaluateOnboardingIdCombo(['passport']).overShared).toBe(false);
    expect(h.evaluateOnboardingIdCombo(['state_id', 'ssn_card']).verified).toBe(true);
    expect(h.evaluateOnboardingIdCombo(['state_id', 'ssn_card']).overShared).toBe(false);
    expect(h.evaluateOnboardingIdCombo(['passport', 'ssn_card']).overShared).toBe(true);
    expect(h.evaluateOnboardingIdCombo(['state_id']).verified).toBe(false);

    // Appointments vital-signs conversion & red-flag emergency routing
    const fever = h.calcVitalTriageGuide(102.2, 88, 118, false);
    expect(fever.tempC).toBe(39);
    expect(fever.tempBand).toBe('Fever');
    expect(fever.careTier).toBe('urgent-care');
    expect(h.calcVitalTriageGuide(98.6, 72, 118, true).careTier).toBe('emergency-er');

    // Conflict de-escalation trajectory
    const calm = h.calcDeescalationTrajectory('repair', 'repair', 'repair');
    const tense = h.calcDeescalationTrajectory('escalate', 'escalate', 'neutral');
    expect(calm.finalTension).toBe(11);
    expect(calm.outcome).toContain('Collaborative');
    expect(tense.finalTension).toBe(100);
    expect(tense.outcome).toContain('High tension');

    // Quiz choice bank returns 4 distinct choices containing the target answer
    const target = { q: 'Sample water heat capacity Q?', a: 'water', h: 'H2O' };
    const bank = h.buildQuizChoiceBank(target, [
      { q: 'Q1', a: '50' },
      { q: 'Q2', a: 'bleach' },
      { q: 'Q3', a: 'gfci' },
      { q: 'Q4', a: 'buffer' },
    ]);
    expect(bank).toHaveLength(4);
    expect(new Set(bank).size).toBe(4);
    expect(bank).toContain('water');
  });

  it('renders Wave 3 simulators, Zero-PII Gemini wrapper, Outing context presets, and Challenge/Battle UDL equity controls', async () => {
    loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');

    // Render coverage across all newly upgraded Wave 3 subtools
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'contract' } })).toContain('data-lifeskills-contract-cashflow="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'records' } })).toContain('data-lifeskills-id-matrix="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'workreadiness' } })).toContain('data-lifeskills-paystub-verifier="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'communication' } })).toContain('data-lifeskills-deescalation-sim="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'appointments' } })).toContain('data-lifeskills-vital-triage="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'homesafety' } })).toContain('data-lifeskills-co-alarm-sim="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'digitalsafety' } })).toContain('data-lifeskills-password-entropy="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'challenge' } })).toContain('data-lifeskills-quiz-mode="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'battle' } })).toContain('data-lifeskills-battle-calm="true"');

    // Overview: Outing readback from localStorage + role/support query hints + learningLab bridge
    window.localStorage.setItem('alloflow-life-outing:v1:sample', JSON.stringify({
      commands: [{ actionId: 'depart' }],
    }));
    const replaceSpy = vi.fn();
    const fakePopup = {
      closed: false,
      document: { body: { textContent: '' } },
      location: { replace: replaceSpy },
      focus: () => {},
      close: () => { fakePopup.closed = true; },
    };
    const prevOutingAI = window.AlloOutingAI;
    window.AlloOutingAI = { createHost: vi.fn(() => ({ destroy: vi.fn() })) };
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => fakePopup);
    try {
      activeMount = mountInteractiveLifeSkills({
        tab: 'overview',
        lsLifeRole: 'transition',
        lsSupportMode: 'plain',
      }, { activeProfileId: 'student_07' });
      expect(activeMount.host.textContent).toContain('1/1 missions departed');
      await React.act(async () => {
        activeMount.clickButton('Open Practice Mode');
        await Promise.resolve();
        await Promise.resolve();
      });
      const launchedUrl = String(replaceSpy.mock.calls[0]?.[0] || '');
      expect(launchedUrl).toContain('context=work');
      expect(launchedUrl).toContain('support=guided');
      expect(launchedUrl).toContain('language=plain');
      expect(launchedUrl).toContain('learner=student_07');
      activeMount.clickButton('Learning Lab');
      expect(activeMount.getSwitchedTool()).toBe('learningLab');
      activeMount.unmount();
      activeMount = null;
    } finally {
      fakePopup.close();
      if (window.__alloflowOutingSession && window.__alloflowOutingSession.timer) {
        clearInterval(window.__alloflowOutingSession.timer);
      }
      delete window.__alloflowOutingSession;
      if (prevOutingAI === undefined) delete window.AlloOutingAI;
      else window.AlloOutingAI = prevOutingAI;
      openSpy.mockRestore();
      window.localStorage.removeItem('alloflow-life-outing:v1:sample');
    }

    // Contract cashflow -> Budget Housing sync
    activeMount = mountInteractiveLifeSkills({ tab: 'contract' });
    activeMount.clickButton('Send as Housing');
    expect(activeMount.getState().budgetExp.Housing).toBe(1275);
    activeMount.unmount();

    // Home Safety -> firstResponse bridge & Digital Safety sister bridge verification
    activeMount = mountInteractiveLifeSkills({ tab: 'homesafety' });
    activeMount.clickButton('First Response');
    expect(activeMount.getSwitchedTool()).toBe('firstResponse');
    activeMount.unmount();

    // Home Systems -> 30-day Utilities sync + Zero-PII Gemini scrubbing
    const capturedPrompts = [];
    activeMount = mountInteractiveLifeSkills({
      tab: 'homesys',
      homeQ: 'Furnace filter check at 742 Evergreen St? Email bob.smith@gmail.com or 123-45-6789',
    }, {
      callGemini: async (prompt) => {
        capturedPrompts.push(prompt);
        return 'Replace MERV 8-11 filters every 90 days.';
      },
    });
    activeMount.clickButton('to Budget Utilities');
    expect(activeMount.getState().budgetExp.Utilities).toBeGreaterThan(0);
    await React.act(async () => {
      activeMount.clickButton('Ask');
      await Promise.resolve();
    });
    expect(capturedPrompts).toHaveLength(1);
    expect(capturedPrompts[0]).toContain('[REDACTED-ID]');
    expect(capturedPrompts[0]).toContain('[REDACTED-EMAIL]');
    expect(capturedPrompts[0]).toContain('[REDACTED-ADDRESS]');
    expect(capturedPrompts[0]).not.toContain('123-45-6789');
    expect(capturedPrompts[0]).not.toContain('bob.smith@gmail.com');
    expect(activeMount.getState().aiPiiGuardMsg).toContain('Zero-PII AI Guard scrubbed personal details');
    activeMount.unmount();

    // Budget -> Economics & Inflation Lab bridge
    activeMount = mountInteractiveLifeSkills({ tab: 'budget' });
    activeMount.clickButton('Economics & Inflation Lab');
    expect(activeMount.getSwitchedTool()).toBe('economicsLab');
    activeMount.unmount();

    // Challenge 4-Choice Bank + lsMissedQueue + Battle Calm Coaching & anti-farming
    const quizAwards = [];
    activeMount = mountInteractiveLifeSkills({
      tab: 'challenge',
      chalTier: 1,
      chalMode: 'choice',
      chalIdx: 0,
    }, {
      awardXP: (toolId, amount, reason) => quizAwards.push({ toolId, amount, reason }),
    });
    // Miss via Check, then verify Missed Concepts queue appears and switching to Battle Calm Coaching protects HP on 1st miss
    activeMount.setInputByAriaLabel('Answer', 'definitely-wrong-answer-xyz');
    activeMount.clickButton('Check');
    expect(activeMount.getState().lsMissedQueue.length).toBeGreaterThan(0);
    expect(activeMount.host.querySelector('[data-lifeskills-missed-queue="true"]')).toBeTruthy();
    activeMount.unmount();

    const battleAwards = [];
    activeMount = mountInteractiveLifeSkills({
      tab: 'battle',
      battleCalmMode: true,
      battleMode: 'choice',
      battleActive: true,
      battleOrder: [0],
      battleRound: 0,
      battlePlayerHP: 100,
      battleEnemyHP: 100,
    }, {
      awardXP: (toolId, amount, reason) => battleAwards.push({ toolId, amount, reason }),
    });
    // Wrong typed attack in Calm Coaching Mode -> 0 HP lost on 1st miss
    activeMount.setInputByAriaLabel('Answer to battle question', 'wrong-first-try');
    activeMount.clickButton('Attack!');
    expect(activeMount.getState().battlePlayerHP).toBe(100);
    expect(activeMount.getState().battleFeedback).toContain('Coaching pause (0 HP lost)');
    // Correct attack via 4-Choice Bank button scores once and sets lsScoredMap anti-farm key
    activeMount.clickButton('7.65');
    expect(battleAwards.filter((a) => a.reason === 'Battle hit')).toHaveLength(1);
    expect(Object.keys(activeMount.getState().lsScoredMap || {}).some((k) => k.startsWith('battle_'))).toBe(true);
  });

  it('validates Wave 4 pure STEAM math helpers (Bayes PPV, EV & sunk cost, biomechanics, resume/STAR pacing, pan area & meal prep, laundry thermodynamics)', () => {
    const h = loadPureSteamHelpers();

    // Bayes theorem base-rate fallacy: 2% prevalence, 95% sens, 95% spec -> 19 TP, 49 FP => ~27.9% PPV
    const bayes = h.calcBayesBaseRate(2, 95, 95, 1000);
    expect(bayes.truePositives).toBe(19);
    expect(bayes.falsePositives).toBe(49);
    expect(bayes.totalFlagged).toBe(68);
    expect(bayes.ppvPct).toBeCloseTo(27.9, 1);
    const bayesHighPrev = h.calcBayesBaseRate(25, 90, 94, 1000);
    expect(bayesHighPrev.ppvPct).toBeGreaterThan(bayes.ppvPct);

    // Expected Value vs Opportunity Cost & Sunk-Cost Trap
    const evTrap = h.calcExpectedValueComparison(40, 500, 200, 150, 120);
    // 0.4 * 500 - 0.6 * 200 = 200 - 120 = 80 < 120 safe alt -> safe alternative & sunk-cost alert
    expect(evTrap.evForward).toBe(80);
    expect(evTrap.recommended).toBe('safe-alternative');
    expect(evTrap.sunkCostTrapActive).toBe(true);
    const evGood = h.calcExpectedValueComparison(75, 500, 100, 50, 120);
    expect(evGood.evForward).toBe(350);
    expect(evGood.recommended).toBe('risky-option');
    expect(evGood.sunkCostTrapActive).toBe(false);

    // Cervical spine tilt load, lumbar torque, NIOSH reach-adjusted ceiling & hydration
    const bio0 = h.calcCervicalAndLiftBiomechanics(0, 20, 10, 60, 'low');
    const bio60 = h.calcCervicalAndLiftBiomechanics(60, 40, 20, 60, 'high');
    expect(bio0.effectiveHeadLoadLbs).toBe(12);
    expect(bio60.effectiveHeadLoadLbs).toBe(60);
    expect(bio0.safeLiftCeilingLbs).toBe(51);
    expect(bio0.exceedsLiftGuideline).toBe(false);
    expect(bio60.lumbarTorqueLbIn).toBe(800);
    expect(bio60.safeLiftCeilingLbs).toBe(26);
    expect(bio60.exceedsLiftGuideline).toBe(true);
    expect(bio60.hydrationOz).toBe(28);

    // Resume specificity meter & STAR spoken timing gauge
    const weakBullet = h.analyzeResumeAndStarMetrics('Helped at the desk', 'Too short.', 130);
    expect(weakBullet.specificityScore).toBeLessThan(50);
    expect(weakBullet.paceBand).toBe('too-brief');
    const strongBullet = h.analyzeResumeAndStarMetrics(
      'Organized 3 shelf carts per shift to finish setup 10 minutes ahead of opening with zero mix-ups.',
      Array(90).fill('word').join(' '),
      130
    );
    expect(strongBullet.hasActionVerb).toBe(true);
    expect(strongBullet.hasQuantMetric).toBe(true);
    expect(strongBullet.hasOutcomeSignal).toBe(true);
    expect(strongBullet.specificityScore).toBe(100);
    expect(strongBullet.estimatedSeconds).toBe(42);
    expect(strongBullet.paceBand).toBe('sweet-spot');

    // Pan surface-area geometry & meal-prep budget
    const deeperPan = h.calcPanScalingAndMealPrep('rect', 9, 13, 'round', 8, 8, 1, 16, 4);
    expect(deeperPan.origAreaSqIn).toBe(117);
    expect(deeperPan.newAreaSqIn).toBeCloseTo(50.3, 1);
    expect(deeperPan.depthRatio).toBeGreaterThan(1.25);
    expect(deeperPan.panStatus).toBe('deeper-overflow-risk');
    expect(deeperPan.costPerServing).toBe(4);
    expect(deeperPan.monthlyMealPrepCost).toBe(80);
    expect(deeperPan.monthlyTakeoutSavings).toBe(200);

    // Laundry water hardness & thermal energy Q = m*c*dT
    const coldWash = h.calcLaundryWaterAndThermal(16, 55, 60, 45, 4, 0.16);
    const hotHardWash = h.calcLaundryWaterAndThermal(16, 55, 130, 220, 4, 0.16);
    expect(hotHardWash.kwhPerLoad).toBeGreaterThan(coldWash.kwhPerLoad * 10);
    expect(coldWash.annualColdSavings).toBeGreaterThan(hotHardWash.annualColdSavings);
    expect(coldWash.doseMultiplier).toBe(0.85);
    expect(hotHardWash.doseMultiplier).toBe(1.25);
    expect(hotHardWash.hardnessBand).toContain('Very Hard');
  });

  it('renders Wave 4 STEAM simulators, scrubs PII from Interview Prep Packet exports, and bridges Credit/Cooking/Sister tools', () => {
    loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');

    // All 7 Wave 4 simulator DOM anchors render cleanly across their respective subtools
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'data' } })).toContain('data-lifeskills-bayes-sim="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'decision' } })).toContain('data-lifeskills-ev-sunkcost="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'resumebuilder' } })).toContain('data-lifeskills-resume-metrics="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'interviewstudio' } })).toContain('data-lifeskills-star-pacing="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'bodycare' } })).toContain('data-lifeskills-biomechanics-sim="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'cooking' } })).toContain('data-lifeskills-pan-mealprep="true"');
    expect(renderTool('lifeSkills', { lifeSkills: { tab: 'laundry' } })).toContain('data-lifeskills-laundry-chemistry="true"');

    // Zero-PII alert & export scrubbing on Interview Prep Packet + Sam Rivera sample safety
    activeMount = mountInteractiveLifeSkills({
      tab: 'interviewstudio',
      interviewReflectionNote: 'My SSN is 123-45-6789 and personal email is real.applicant@gmail.com',
      interviewFollowUpMessage: 'Meet me at 742 Evergreen St tomorrow.',
    });
    expect(activeMount.host.textContent).toContain('Privacy Reminder');
    const previewEl = activeMount.host.querySelector('[aria-label="Interview prep packet preview"]');
    expect(previewEl).toBeTruthy();
    expect(previewEl.value).toContain('[REDACTED-ID]');
    expect(previewEl.value).toContain('[REDACTED-EMAIL]');
    expect(previewEl.value).toContain('[REDACTED-ADDRESS]');
    expect(previewEl.value).not.toContain('123-45-6789');
    expect(previewEl.value).not.toContain('real.applicant@gmail.com');
    expect(previewEl.value).not.toContain('742 Evergreen St');

    activeMount.clickButton('Load Reflection Sample (Sam Rivera)');
    expect(activeMount.getState().interviewFollowUpMessage).toContain('Sam Rivera (practice profile)');
    expect(activeMount.host.textContent).not.toContain('Privacy Reminder');

    activeMount.clickButton('Public Speaking & Oratory Lab');
    expect(activeMount.getSwitchedTool()).toBe('oratory');
    activeMount.unmount();

    // Credit -> Budget Retirement/Savings sync + Economics Lab bridge
    activeMount = mountInteractiveLifeSkills({ tab: 'credit', ciMonthly: 250 });
    activeMount.clickButton('Send Monthly Savings Add');
    expect(activeMount.getState().budgetExp['Retirement/Savings']).toBe(250);
    activeMount.clickButton('Economics & Interest Rates Lab');
    expect(activeMount.getSwitchedTool()).toBe('economicsLab');
    activeMount.unmount();

    // Cooking -> Budget Groceries sync (20-meal prep) + Baking Science bridge
    activeMount = mountInteractiveLifeSkills({ tab: 'cooking', cookBatchCost: 16, cookRecipeIdx: 0, cookScale: 1 });
    activeMount.clickButton('Send 20-Meal Prep Estimate');
    expect(activeMount.getState().budgetExp.Groceries).toBeGreaterThan(0);
    activeMount.clickButton('Baking Science Lab');
    expect(activeMount.getSwitchedTool()).toBe('bakingScience');
    activeMount.unmount();

    // Sister-tool bridges on data -> probability, bodycare -> anatomy, laundry -> chemBalance
    activeMount = mountInteractiveLifeSkills({ tab: 'data' });
    activeMount.clickButton('Probability Lab');
    expect(activeMount.getSwitchedTool()).toBe('probability');
    activeMount.unmount();

    activeMount = mountInteractiveLifeSkills({ tab: 'bodycare' });
    activeMount.clickButton('Human Anatomy Lab');
    expect(activeMount.getSwitchedTool()).toBe('anatomy');
    activeMount.unmount();

    activeMount = mountInteractiveLifeSkills({ tab: 'laundry' });
    activeMount.clickButton('Chemical Equations & Reactions Lab');
    expect(activeMount.getSwitchedTool()).toBe('chemBalance');
  });
});

describe('Wave 5 — Inline 3D STEM Bays & Companion 3D STEM Lens', () => {
  afterEach(() => {
    if (activeMount) {
      try { activeMount.unmount(); } catch (_) {}
      activeMount = null;
    }
    resetStemLab();
  });

  function makeMockThree() {
    class Vec3 {
      constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
      set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    }
    class Obj3D {
      constructor() {
        this.children = [];
        this.position = new Vec3();
        this.rotation = new Vec3();
        this.userData = {};
      }
      add(child) { this.children.push(child); return child; }
    }
    class Mesh extends Obj3D {
      constructor(geometry, material) {
        super();
        this.geometry = geometry;
        this.material = material;
      }
    }
    class Light extends Obj3D {
      constructor(color, intensity) { super(); this.color = color; this.intensity = intensity; }
    }
    return {
      Vector3: Vec3,
      Group: Obj3D,
      Scene: Obj3D,
      Mesh,
      AmbientLight: Light,
      HemisphereLight: Light,
      DirectionalLight: Light,
      BoxGeometry: function(...args) { this.type = 'BoxGeometry'; this.args = args; },
      CylinderGeometry: function(...args) { this.type = 'CylinderGeometry'; this.args = args; },
      SphereGeometry: function(...args) { this.type = 'SphereGeometry'; this.args = args; },
      ConeGeometry: function(...args) { this.type = 'ConeGeometry'; this.args = args; },
      TorusGeometry: function(...args) { this.type = 'TorusGeometry'; this.args = args; },
      RingGeometry: function(...args) { this.type = 'RingGeometry'; this.args = args; },
      MeshPhongMaterial: function(opts) { Object.assign(this, opts || {}); },
      MeshLambertMaterial: function(opts) { Object.assign(this, opts || {}); },
      MeshBasicMaterial: function(opts) { Object.assign(this, opts || {}); },
    };
  }

  it('renders the Overview Instant Inline 3D STEM Bays launcher and jumps directly to each 3D bay', () => {
    loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    const html = renderTool('lifeSkills', { lifeSkills: { tab: 'overview' } });
    expect(html).toContain('data-lifeskills-inline-3d-bays="true"');
    expect(html).toContain('5 Live 3D Bays');
    expect(html).toContain('Home Envelope');
    expect(html).toContain('Circuit &amp; Pressure');
    expect(html).toContain('Vehicle Bay');
    expect(html).toContain('Ergonomics Rig');
    expect(html).toContain('Molar &amp; Enamel');

    activeMount = mountInteractiveLifeSkills({ tab: 'overview' });
    activeMount.clickButton('Home Envelope');
    expect(activeMount.getState().tab).toBe('homesys');
    expect(activeMount.host.querySelector('[data-lifeskills-3d-bay="homesys"]')).toBeTruthy();
  });

  it('supports keyboard/button orbit controls, 6-part explorer, XP/badge awards, and axonometric fallback across all 5 inline 3D bays', () => {
    const bays = [
      { id: 'homesys', firstPart: 'Attic Insulation', secondPart: 'Heat Pump', badgeId: 'homeExpert' },
      { id: 'science', firstPart: 'Breaker & NEC 80%', secondPart: 'Continuous Appliance', badgeId: 'appliedSci' },
      { id: 'carcare', firstPart: 'Tire Tread Depth', secondPart: 'Coolant Overflow', badgeId: 'mechanic' },
      { id: 'bodycare', firstPart: 'Cervical Spine', secondPart: 'L5-S1 Lumbar', badgeId: 'ergoSolver' },
      { id: 'dental', firstPart: 'Hydroxyapatite Enamel', secondPart: 'Plaque Biofilm', badgeId: 'dentalReady' },
    ];

    for (const bay of bays) {
      const awardedXp = [];
      activeMount = mountInteractiveLifeSkills({ tab: bay.id }, {
        awardXP: (tool, amt, reason) => awardedXp.push({ tool, amt, reason }),
      });

      const card = activeMount.host.querySelector('[data-lifeskills-3d-bay="' + bay.id + '"]');
      expect(card).toBeTruthy();
      expect(card.querySelector('[data-lifeskills-3d-fallback="true"]')).toBeTruthy();

      const partGroup = card.querySelector('[role="group"]');
      const partBtns = [...partGroup.querySelectorAll('button')];
      expect(partBtns.length).toBe(6);
      expect(card.textContent).toContain('Where to look:');
      expect(card.textContent).toContain('What it does:');
      expect(card.textContent).toContain('How to check it:');
      expect(card.textContent).toContain('What failure or risk looks like:');

      // Keyboard controls on the interactive viewport
      const vp = card.querySelector('[data-lifeskills-3d-viewport="' + bay.id + '"]');
      expect(vp).toBeTruthy();
      const beforeText = card.textContent;
      React.act(() => {
        vp.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        vp.dispatchEvent(new window.KeyboardEvent('keydown', { key: '+', bubbles: true }));
      });
      expect(card.textContent).not.toBe(beforeText);
      expect(card.textContent).toContain('1.15x');

      React.act(() => {
        vp.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      });
      expect(activeMount.getState()['ls3dSel_' + bay.id]).toBeTruthy();

      React.act(() => {
        vp.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true }));
      });
      expect(card.textContent).toContain('zoom 1.00x');

      // Inspect all 6 parts to trigger badge unlock
      for (const btn of partBtns) {
        React.act(() => { btn.click(); });
      }
      expect(Object.keys(activeMount.getState()['ls3dExplored_' + bay.id] || {}).length).toBe(6);
      expect(activeMount.getState().badges?.[bay.badgeId]).toBeTruthy();
      expect(awardedXp.some((e) => e.tool === 'lifeSkills' && e.amt > 0)).toBe(true);

      activeMount.unmount();
      activeMount = null;
    }
  });

  it('surfaces critical NEC 80% continuous load and vehicle burn/jack-stand safety warnings in 3D bay inspectors', () => {
    activeMount = mountInteractiveLifeSkills({ tab: 'science', asVolts: 120, asAmps: 15, asRunning: ['Space heater'] });
    const sciCard = activeMount.host.querySelector('[data-lifeskills-3d-bay="science"]');
    expect(sciCard.textContent).toContain('1,440W');
    expect(sciCard.textContent).toContain('1,500W');
    expect(sciCard.textContent).toContain('without tripping the breaker');
    activeMount.unmount();

    activeMount = mountInteractiveLifeSkills({ tab: 'carcare', ccTread: 2 });
    const carCard = activeMount.host.querySelector('[data-lifeskills-3d-bay="carcare"]');
    expect(carCard.textContent).toContain('jack stands');
    expect(carCard.textContent).toContain('2/32"');
    activeMount.clickButton('Coolant Overflow & Burn Cap');
    expect(carCard.textContent).toContain('NEVER open a hot pressurized radiator or coolant cap');
  });

  it('builds parametric Three.js r128 geometry across all 5 bays when makeOrbitViewer is mounted without CapsuleGeometry', () => {
    const src = read(LIFESKILLS_PATHS[0]);
    expect(src).not.toContain('CapsuleGeometry');

    const capturedConfigs = {};
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => {
      const m = orbitCfg.attr;
      return {
        attach: () => {},
        push: (data) => { capturedConfigs[data.sig.split('|')[0]] = { orbitCfg, data }; },
        onStatusChange: () => {},
        status: () => 'ready',
        debug: () => ({ state: 'ready', attr: m }),
        dispose: () => {},
      };
    };

    const cases = [
      { tab: 'homesys', extra: { homesysRVal: 38, homesysCop: 3.5, homesysDeltaT: 45, homesysLeak: 12 } },
      { tab: 'science', extra: { asVolts: 120, asAmps: 15, asRunning: ['Space heater', 'Microwave'], asTireP1: 35, asTireT1: 70, asTireT2: 10 } },
      { tab: 'carcare', extra: { ccTread: 2, ccSpeedMph: 65, ccRoadSurface: 'ice', ccOilTemp: 15 } },
      { tab: 'bodycare', extra: { ergoNeckDeg: 45, ergoLoadLbs: 30, ergoReachIn: 20, bodyScreenHeight: 2 } },
      { tab: 'dental', extra: { dentalSnackIdx: 4, dentalRoutine: { brushAm: true, floss: true } } },
    ];

    const THREE = makeMockThree();
    for (const c of cases) {
      cfg.render(makeCtx({ toolData: { lifeSkills: Object.assign({ tab: c.tab }, c.extra) } }));
      const entry = capturedConfigs[c.tab];
      expect(entry).toBeTruthy();
      const S = { model: new THREE.Group(), target: null, half: null };
      entry.orbitCfg.build(THREE, S, entry.data);
      expect(S.model.children.length).toBeGreaterThanOrEqual(8);
      expect(S.target).toBeTruthy();
      expect(S.half).toBeTruthy();
    }
  });

  it('upgrades all 5 foundation A-Frame 3D companion labs with Overhead map, Zoom to target, interactive 3D STEM Lens, unique IDs, and 4-copy parity', () => {
    for (const lab of FOUNDATION_3D_LABS) {
      const rel = `life_skills_${lab}/life_skills_${lab}.html`;
      const html = read(rel);

      expect(html).toContain('data-view="overhead"');
      expect(html).toContain('id="zoomTargetButton"');
      expect(html).toContain('id="stemLensButton"');
      expect(html).toContain('id="stem3dOverlay"');
      expect(html).toContain('id="stemLensText"');
      expect(html).toContain(`alloflow-life-${lab}-3d-stem-lens`);

      // Preserve coaching invariant required by life_skills_3d_scene_coaching.test.js
      expect((html.match(/focusTask\(activeScenario\.safeTask, false\)/g) || []).length).toBe(2);

      // Zero duplicate IDs & live JSDOM interaction verification
      const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        url: `https://alloflow.example/${rel}`,
      });
      const doc = dom.window.document;
      const ids = [...doc.querySelectorAll('[id]')].map((el) => el.id);
      expect(new Set(ids).size).toBe(ids.length);

      const cam = doc.querySelector('a-camera');
      const overheadBtn = doc.querySelector('[data-view="overhead"]');
      overheadBtn.click();
      expect(cam.getAttribute('rotation')).toBe('-62 0 0');
      expect(overheadBtn.getAttribute('aria-pressed')).toBe('true');

      const zoomBtn = doc.getElementById('zoomTargetButton');
      zoomBtn.click();
      expect(overheadBtn.getAttribute('aria-pressed')).toBe('false');
      expect(cam.getAttribute('rotation')).toBe('-10 0 0');

      const lensBtn = doc.getElementById('stemLensButton');
      const overlay = doc.getElementById('stem3dOverlay');
      const lensText = doc.getElementById('stemLensText');
      expect(overlay.getAttribute('visible')).toBe('false');
      lensBtn.click();
      expect(lensBtn.getAttribute('aria-pressed')).toBe('true');
      expect(overlay.getAttribute('visible')).toBe('true');
      expect(lensText.hidden).toBe(false);
      expect(lensText.textContent).toContain('3D STEM Lens');
      dom.window.close();

      // 4-copy mirror parity
      for (const mirrorPrefix of ['', 'desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/']) {
        expect(read(mirrorPrefix + rel)).toBe(html);
      }
    }

    const baseJs = read(LIFESKILLS_PATHS[0]);
    for (let i = 1; i < LIFESKILLS_PATHS.length; i++) {
      expect(read(LIFESKILLS_PATHS[i])).toBe(baseJs);
    }
  });
});
