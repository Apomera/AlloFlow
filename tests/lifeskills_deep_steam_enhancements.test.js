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
  const calcStart = src.indexOf('function _lsFiniteNum(');
  const calcEnd = src.indexOf('  // ── Insurance Calculator ──', calcStart);
  const start = src.indexOf('function detectLifeSkillsPII(text)');
  const end = src.indexOf('window.StemLab.registerTool(\'lifeSkills\'', start);
  expect(calcStart).toBeGreaterThan(-1);
  expect(calcEnd).toBeGreaterThan(calcStart);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const block = src.slice(calcStart, calcEnd) + '\n' + src.slice(start, end) + '\n;({ detectLifeSkillsPII, calcCompoundInterest, calcLoanPayment, calcEnvelopeHeatLoss, calcBacterialMultiples, calcCaffeineRemaining, simulateCardPayoff, calcStephanCurvePH, checkActiveIngredientOverlap, calcStoppingDistanceFt, calcWaterLeakWaste, calcBufferedSchedule, calcTransitBreakEven, sanitizePromptForZeroPII, calcContractTotalCost, calcShiftPaystubAudit, calcCoAndAlarmSafety, calcPasswordEntropyAndMfa, evaluateOnboardingIdCombo, calcVitalTriageGuide, calcDeescalationTrajectory, inferQuestionDomain, buildQuizChoiceBank, calcBayesBaseRate, calcExpectedValueComparison, calcCervicalAndLiftBiomechanics, analyzeResumeAndStarMetrics, calcPanScalingAndMealPrep, calcLaundryWaterAndThermal, calcPreTaxAndEmployerMatch, auditPortfolioEvidenceAndPrivacy, calcEmergencyRunwayAndInflation, calcMarginalVsEffectiveTaxShock, calcShrinkflationAndSpoilageImpact, calcCommuteModeAndCarbonTco, calcUtilizationAndAprPenalty, calcSleepDebtAndReactionPenalty, calcStandbyAndApplianceKwhAudit, calcHsaVsFsaTaxShield, calcVehicleMaintenanceAndNeglectRisk, calcJobMatchAndScanReadability, calcRecordsRetentionAndIdentityRisk, calcMedHalfLifeAndRefillRunway, calcJobOfferTotalCompComparison, calcDiyVsContractorBreakEven, calcThermostatSetbackAndFilterPenalty, calcSpacedRetrievalRetention, calcDentalPreventiveVsDelayCost, calcDecisionWeightSensitivity, calcEarlyTerminationVsSwitchBreakEven, calcBattleMasteryShieldAndDebrief, calcCleanerMixAndPhNeutralization, calcTaskSwitchingResidueAndPomodoro, calcCareSettingAndNetworkCost, calcNoiseDecibelDoseAndSafeTime, calcOvertimeFatigueAndPtoAccrual, calcOutageAutonomyAndEgressMargin, calcListeningRatioAndCheckBack, calcDeliveryMarkupVsBatchPrep, calcSubscriptionCreepAndBreachRadius, calcDryerVentEfficiencyAndShrinkRisk, calcShiftTurnaroundAndMelatoninLux, calcSampleMarginOfErrorAndSelectionBias, calcLeaseDepositWearVsDamage, calcGenericRxAnd90DaySupplySavings, calcColdSnapTirePsiAndWetBraking, calcTransitHeadwayAndTransferReliability, calcBranchCircuitBreakerAndGfciLoad, calcIrregularSinkingFundAndPaydayTrough, calcBnplStackingVsAvalanchePayoff, calcNutrientDensityPerDollarAndSodium, calcVitalDocReplacementCascade, calcCredentialLinkRotAndVerificationStrength, calcInterleavingTransferAndCalibrationGap, calcBossEncounterSurvivalAndArmorOdds, calcW4WithholdingAndSideGigSafeHarbor, calcRentersRcvVsAcvAndLiability, calcWaterHeaterSetpointAndScaldSafety, calcReadingSprintAndCognitiveLoad, calcThawMethodAndCarryoverSafety, calcDetergentDosingAndColdEnzymeWash, calcDentalCalendarPhasingAndFluorideShield, calcBackup321ResilienceAndRecoveryCost, calcFirstJobGearAndPayFloat, calcTailoredFunnelAndCallbackYield, calcWeeklyLoadAndSlackCapacity, calcVisitAgendaAndRecallRetention, calcEvpiAndTrialInspectionValue, calcSalaryNegotiationCompounding, calcLifestyleCreepAndAutoSaveSplit, calcDeferredInterestVsBalanceTransfer })';
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
    expect(html).toContain('30 Live 3D Bays');
    expect(html).toContain('Home Envelope');
    expect(html).toContain('Circuit &amp; Pressure');
    expect(html).toContain('Vehicle Bay');
    expect(html).toContain('Ergonomics Rig');
    expect(html).toContain('Molar &amp; Enamel');
    expect(html).toContain('Paycheck Engine');
    expect(html).toContain('Comm Bridge');

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

describe('Wave 6 Life Skills 10-Bay 3D STEM Expansion, Capstone Parity, & Full Sister Bridges', () => {
  function makeWave6MockThree() {
    class Vec3 {
      constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
      set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
      copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
      clone() { return new Vec3(this.x, this.y, this.z); }
    }
    class Obj3D {
      constructor() {
        this.children = [];
        this.position = new Vec3();
        this.rotation = new Vec3();
        this.scale = new Vec3(1, 1, 1);
        this.userData = {};
        this.name = '';
      }
      add(...items) {
        for (const it of items) {
          if (it) this.children.push(it);
        }
        return this;
      }
    }
    class Group extends Obj3D {}
    class Mesh extends Obj3D {
      constructor(geometry, material) {
        super();
        this.geometry = geometry;
        this.material = material;
        this.castShadow = false;
        this.receiveShadow = false;
      }
    }
    class Geom {
      constructor(...args) { this.args = args; }
      rotateX() { return this; }
      rotateY() { return this; }
      rotateZ() { return this; }
      translate() { return this; }
      setAttribute() { return this; }
    }
    class Mat {
      constructor(opts = {}) { Object.assign(this, opts); }
    }
    class Light extends Obj3D {
      constructor(color, intensity) { super(); this.color = color; this.intensity = intensity; }
    }
    return {
      Group,
      Scene: Obj3D,
      Mesh,
      Object3D: Obj3D,
      AmbientLight: Light,
      HemisphereLight: Light,
      DirectionalLight: Light,
      LineSegments: Mesh,
      Line: Mesh,
      Points: Mesh,
      Vector3: Vec3,
      Vector2: class { constructor(x = 0, y = 0) { this.x = x; this.y = y; } },
      Color: class { constructor(v) { this.v = v; } },
      Shape: class {
        moveTo() { return this; }
        lineTo() { return this; }
        quadraticCurveTo() { return this; }
        closePath() { return this; }
      },
      CatmullRomCurve3: class { constructor(pts) { this.pts = pts; } },
      Float32BufferAttribute: class { constructor(arr, size) { this.arr = arr; this.size = size; } },
      BoxGeometry: Geom,
      CylinderGeometry: Geom,
      SphereGeometry: Geom,
      ConeGeometry: Geom,
      TorusGeometry: Geom,
      PlaneGeometry: Geom,
      CircleGeometry: Geom,
      RingGeometry: Geom,
      TubeGeometry: Geom,
      ExtrudeGeometry: Geom,
      EdgesGeometry: Geom,
      BufferGeometry: Geom,
      IcosahedronGeometry: Geom,
      OctahedronGeometry: Geom,
      DodecahedronGeometry: Geom,
      MeshStandardMaterial: Mat,
      MeshBasicMaterial: Mat,
      MeshPhysicalMaterial: Mat,
      MeshLambertMaterial: Mat,
      MeshPhongMaterial: Mat,
      LineBasicMaterial: Mat,
      PointsMaterial: Mat,
      DoubleSide: 2,
      FrontSide: 0,
      BackSide: 1,
    };
  }

  it('mounts the 5 new inline 3D STEM bays with SVG fallbacks and badge unlocks', () => {
    const newBays = [
      { tab: 'homerepair', badge: 'handyman' },
      { tab: 'cooking', badge: 'chefSafe' },
      { tab: 'sleep', badge: 'sleepPlanner' },
      { tab: 'meds', badge: 'doseSafety' },
      { tab: 'digitalsafety', badge: 'digitalReady' },
    ];

    for (const bay of newBays) {
      activeMount = mountInteractiveLifeSkills({ tab: bay.tab });
      const bayEl = activeMount.host.querySelector(`[data-lifeskills-3d-bay="${bay.tab}"]`);
      expect(bayEl).toBeTruthy();
      expect(bayEl.querySelector('[data-lifeskills-3d-fallback="true"]')).toBeTruthy();

      const partGroup = bayEl.querySelector('[role="group"]');
      const partBtns = [...partGroup.querySelectorAll('button')];
      expect(partBtns.length).toBe(6);
      expect(bayEl.textContent).toContain('Where to look:');
      expect(bayEl.textContent).toContain('What failure or risk looks like:');

      const vp = bayEl.querySelector(`[data-lifeskills-3d-viewport="${bay.tab}"]`);
      expect(vp).toBeTruthy();
      React.act(() => {
        vp.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        vp.dispatchEvent(new window.KeyboardEvent('keydown', { key: '+', bubbles: true }));
      });
      expect(bayEl.textContent).toContain('1.15x');

      React.act(() => {
        vp.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      });
      expect(activeMount.getState()[`ls3dSel_${bay.tab}`]).toBeTruthy();

      React.act(() => {
        vp.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true }));
      });
      expect(bayEl.textContent).toContain('zoom 1.00x');

      for (const btn of partBtns) {
        React.act(() => {
          btn.click();
        });
      }

      const st = activeMount.getState();
      const exploredKey = `ls3dExplored_${bay.tab}`;
      expect(Object.keys(st[exploredKey] || {}).length).toBe(6);
      expect(st.badges?.[bay.badge]).toBeTruthy();

      activeMount.unmount();
      activeMount = null;
    }
  });

  it('builds parametric Three.js r128 geometry (>= 8 children) across all 10 inline 3D bays without CapsuleGeometry', () => {
    const src = read(LIFESKILLS_PATHS[0]);
    expect(src).not.toContain('CapsuleGeometry');

    const capturedConfigs = {};
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (data) => { capturedConfigs[data.sig.split('|')[0]] = { orbitCfg, data }; },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const allBays = [
      'homesys',
      'science',
      'carcare',
      'homerepair',
      'cooking',
      'bodycare',
      'dental',
      'sleep',
      'meds',
      'digitalsafety',
    ];
    const THREE = makeWave6MockThree();
    for (const bayId of allBays) {
      cfg.render(makeCtx({ toolData: { lifeSkills: { tab: bayId } } }));
      const entry = capturedConfigs[bayId];
      expect(entry).toBeTruthy();
      const S = { model: new THREE.Group(), target: null, half: null };
      entry.orbitCfg.build(THREE, S, entry.data);
      expect(S.model.children.length).toBeGreaterThanOrEqual(8);
      expect(S.target).toBeTruthy();
      expect(S.half).toBeTruthy();
    }
  });

  it('advertises all 15 Live 3D Bays in Overview and reports 3D inspection counts in Portable Readiness Summary', () => {
    activeMount = mountInteractiveLifeSkills({
      tab: 'overview',
      ls3dExplored_homerepair: {
        flapper: true,
        shutoff: true,
        ptrap: true,
        faucet: true,
        stud: true,
        paint: true,
      },
    });

    const launcher = activeMount.host.querySelector('[data-lifeskills-inline-3d-bays="true"]');
    expect(launcher).toBeTruthy();
    expect(launcher.textContent).toContain('30 Live 3D Bays');
    expect(launcher.textContent).toContain('6/6 parts');
    for (const title of [
      'Home Envelope',
      'Circuit & Pressure',
      'Vehicle Bay',
      'Plumbing & Wall',
      'Fire, CO & Egress',
      'Transit & Crosswalk',
      'Thermal Kitchen',
      'Washer & Lint Vent',
      'Cold-Chain & Pantry',
      'Ergonomics Rig',
      'Molar & Enamel',
      'Circadian Clock',
      'Dose & Label Safety',
      'Vital Triage & Intake',
      'Zero-Trust Vault',
      'Paycheck Engine',
      '50/30/20 Cash-Flow Rig',
      'FICO & Compound Rig',
      'Deductible & OOP Shield',
      'Contract Traps',
      'Records Vault',
      'Data & Bayes',
      'Time-Block & Buffer',
      'Comm Bridge',
      'Weighted Tradeoffs',
      'Shift & Safety Rig',
      'ATS & Evidence Rig',
      'Artifact & EXIF Lock',
      'STAR Stage & Eye-Line',
      'Adulting Bastion',
    ]) {
      expect(launcher.textContent).toContain(title);
    }

    const summaryBox = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"] pre');
    expect(summaryBox).toBeTruthy();
    expect(summaryBox.textContent).toContain('3D STEM Bays Inspected: 1/30 bays (6/180 parts)');
  });

  it('syncs Meds OTC/Rx health budget to Insurance, verifies all 8 new sister bridges, and validates Learn Domain Mastery Launchpad', () => {
    // Meds budget sync -> Insurance = 250 + 25 = 275
    activeMount = mountInteractiveLifeSkills({ tab: 'meds', medMonthlyBudgetCost: 25, hiPlanAPremium: 250 });
    const syncCard = activeMount.host.querySelector('[data-lifeskills-med-budget-sync="true"]');
    expect(syncCard).toBeTruthy();
    activeMount.clickButton('Sync Health + OTC/Rx');
    expect(activeMount.getState().budgetExp?.Insurance).toBe(275);
    activeMount.unmount();
    activeMount = null;

    // 8 new sister-tool bridges
    const bridgeChecks = [
      { tab: 'workreadiness', label: 'Law & Workplace Rights Navigator', target: 'lawNavigator' },
      { tab: 'resumebuilder', label: 'Paper Trail & Credential Lab', target: 'paperTrail' },
      { tab: 'prooflocker', label: 'Cyber Defense & Privacy Lab', target: 'cyberDefense' },
      { tab: 'communication', label: 'Public Speaking & Oratory Lab', target: 'oratory' },
      { tab: 'insurance', label: 'Probability & Expected-Value Lab', target: 'probability' },
      { tab: 'sleep', label: '3D Brain Atlas Lab', target: 'brainAtlas' },
      { tab: 'meds', label: 'Unit & Dosage Conversion Lab', target: 'unitConvert' },
      { tab: 'appointments', label: 'Paper Trail & Documentation Lab', target: 'paperTrail' },
    ];
    for (const check of bridgeChecks) {
      activeMount = mountInteractiveLifeSkills({ tab: check.tab });
      activeMount.clickButton(check.label);
      expect(activeMount.getSwitchedTool()).toBe(check.target);
      activeMount.unmount();
      activeMount = null;
    }

    // Learn Domain Mastery & 3D Lab Launchpad + Open 3D Bay button
    activeMount = mountInteractiveLifeSkills({ tab: 'learn' });
    const launchpad = activeMount.host.querySelector('[data-lifeskills-learn-launchpad="true"]');
    expect(launchpad).toBeTruthy();
    expect(launchpad.querySelectorAll('button').length).toBeGreaterThanOrEqual(4);
    activeMount.clickButton('Open 3D Bay');
    expect([
      'homesys',
      'science',
      'carcare',
      'homerepair',
      'homesafety',
      'transport',
      'cooking',
      'laundry',
      'foodconfidence',
      'bodycare',
      'dental',
      'sleep',
      'meds',
      'appointments',
      'digitalsafety',
      'paycheck',
      'budget',
      'credit',
      'insurance',
      'contract',
      'records',
      'data',
      'timemanagement',
      'communication',
      'decision',
      'workreadiness',
      'resumebuilder',
      'prooflocker',
      'interviewstudio',
      'battle',
    ]).toContain(activeMount.getState().tab);
  });

  it('provides Overhead Map, Zoom to station, and 3D STEM Lens telemetry parity in all 4 Life Skills Capstone 3D scenes', () => {
    for (const capPath of CAPSTONE_PATHS) {
      const html = read(capPath);
      const idMatches = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(idMatches.length).toBeGreaterThan(20);
      expect(new Set(idMatches).size).toBe(idMatches.length);
    }

    const postedMessages = [];
    const dom = new JSDOM(read(CAPSTONE_PATHS[0]), {
      runScripts: 'dangerously',
      url: 'http://localhost/life_skills_capstone/life_skills_capstone.html',
      beforeParse(win) {
        win.opener = {
          postMessage: (msg, origin) => postedMessages.push({ msg, origin }),
        };
        win.matchMedia = () => ({
          matches: false,
          addEventListener() {},
          removeEventListener() {},
          addListener() {},
          removeListener() {},
        });
        win.speechSynthesis = { cancel() {}, speak() {} };
      },
    });

    try {
      const doc = dom.window.document;
      const overheadBtn = doc.querySelector('[data-view="overhead"]');
      const zoomBtn = doc.querySelector('#zoomTargetButton');
      const lensBtn = doc.querySelector('#stemLensButton');
      const lensText = doc.querySelector('#stemLensText');
      const cam = doc.querySelector('#camera');
      const overlay = doc.querySelector('#stem3dOverlay');

      expect(overheadBtn).toBeTruthy();
      expect(zoomBtn).toBeTruthy();
      expect(lensBtn).toBeTruthy();
      expect(overlay).toBeTruthy();

      overheadBtn.click();
      expect(cam.getAttribute('rotation')).toBe('-64 0 0');

      zoomBtn.click();
      expect(cam.getAttribute('rotation')).toBe('-10 0 0');

      lensBtn.click();
      expect(overlay.getAttribute('visible')).toBe('true');
      expect(lensText.textContent).toContain('3D STEM Lens');
      expect(
        postedMessages.some(
          (entry) =>
            entry?.msg?.type === 'alloflow-life-capstone-3d-stem-lens' &&
            entry.msg.enabled === true
        )
      ).toBe(true);
    } finally {
      dom.window.close();
    }
  });
});

describe('Wave 7 — 15-Bay Domain-Complete 3D Architecture, Exploded View & Quantitative Pipelines', () => {
  let activeMount = null;

  beforeEach(() => {
    resetStemLab();
  });

  afterEach(() => {
    if (activeMount) {
      activeMount.unmount();
      activeMount = null;
    }
    delete globalThis.window.StemLab.makeOrbitViewer;
    vi.restoreAllMocks();
  });

  it('computes accurate self-contained math for Pre-Tax/401(k) Match, Proof Privacy Audit, and Emergency Runway + Fisher Real APR', () => {
    const { calcPreTaxAndEmployerMatch, auditPortfolioEvidenceAndPrivacy, calcEmergencyRunwayAndInflation } = loadPureSteamHelpers();

    // 2% contribution misses half of a 100%-up-to-4% match on $50k ($1,000 unclaimed)
    const partial = calcPreTaxAndEmployerMatch(50000, 2, 100, 4, 500, 20);
    expect(partial.employee401k).toBe(1000);
    expect(partial.employerMatch).toBe(1000);
    expect(partial.unclaimedMatch).toBe(1000);
    expect(partial.capturesFullMatch).toBe(false);
    expect(partial.annualTaxSaved).toBe(300);
    expect(partial.netTakeHomeReduction).toBe(1200);
    expect(partial.totalAnnualWealthAdded).toBe(2500);

    // 4% captures full match ($0 unclaimed)
    const full = calcPreTaxAndEmployerMatch(50000, 4, 100, 4, 500, 20);
    expect(full.capturesFullMatch).toBe(true);
    expect(full.unclaimedMatch).toBe(0);
    expect(full.employerMatch).toBe(2000);

    // Proof locker privacy audit penalizes raw EXIF + unredacted public links
    const risky = auditPortfolioEvidenceAndPrivacy(4, 6, false, false, 'public-anyone');
    expect(risky.privacyRiskScore).toBe(100);
    expect(risky.statusBand).toBe('needs-redaction');

    const safe = auditPortfolioEvidenceAndPrivacy(4, 6, true, true, 'view-only-unlisted');
    expect(safe.privacyRiskScore).toBe(0);
    expect(safe.evidenceCoveragePct).toBe(100);
    expect(safe.statusBand).toBe('audit-ready');

    // Fisher equation real yield: 0.05% APR vs 3% inflation loses purchasing power; 4.25% HYSA beats 3%
    const checking = calcEmergencyRunwayAndInflation(2000, 3000, 500, 3.0, 0.05);
    expect(checking.runwayMonths).toBe(1.5);
    expect(checking.monthsTo3Mo).toBe(6);
    expect(checking.losesPurchasingPower).toBe(true);
    expect(checking.realYieldPct).toBeLessThan(-2.5);

    const hysa = calcEmergencyRunwayAndInflation(2000, 3000, 500, 3.0, 4.25);
    expect(hysa.losesPurchasingPower).toBe(false);
    expect(hysa.realYieldPct).toBeGreaterThan(1.0);
  });

  it('mounts all 5 new inline 3D bays with camera presets, Explode toggle/key E, SVG coordinate expansion, and 6/6 badge unlocks', () => {
    const newBays = [
      { id: 'homesafety', badgeId: 'homeSafetyReady' },
      { id: 'laundry', badgeId: 'laundryPro' },
      { id: 'transport', badgeId: 'tripReady' },
      { id: 'credit', badgeId: 'creditWise' },
      { id: 'timemanagement', badgeId: 'timePlanner' },
    ];

    for (const bay of newBays) {
      activeMount = mountInteractiveLifeSkills({ tab: bay.id });
      const bayEl = activeMount.host.querySelector(`[data-lifeskills-3d-bay="${bay.id}"]`);
      expect(bayEl).toBeTruthy();

      const partButtons = Array.from(bayEl.querySelector('[role="group"]').querySelectorAll('button'));
      expect(partButtons.length).toBe(6);

      // Record SVG node coordinates before explode
      const circlesBefore = Array.from(bayEl.querySelectorAll('svg circle')).map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);

      // Test Explode toggle button shifts state and SVG coordinates
      const explodeBtn = bayEl.querySelector(`[data-lifeskills-3d-explode="${bay.id}"]`);
      expect(explodeBtn).toBeTruthy();
      expect(explodeBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => {
        explodeBtn.click();
      });
      expect(activeMount.getState()[`ls3dExplode_${bay.id}`]).toBe(true);
      const circlesAfter = Array.from(bayEl.querySelectorAll('svg circle')).map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
      expect(circlesAfter).not.toEqual(circlesBefore);

      // Test Camera Angle Presets (Front -> Overhead -> Iso)
      const frontBtn = bayEl.querySelector('[data-lifeskills-3d-preset="front"]');
      const overBtn = bayEl.querySelector('[data-lifeskills-3d-preset="overhead"]');
      expect(frontBtn && overBtn).toBeTruthy();
      React.act(() => {
        frontBtn.click();
      });
      expect(activeMount.getState()[`ls3dRotX_${bay.id}`]).toBe(8);
      React.act(() => {
        overBtn.click();
      });
      expect(activeMount.getState()[`ls3dRotX_${bay.id}`]).toBe(62);

      // Test keyboard 'e' toggles Explode back off
      const viewport = bayEl.querySelector(`[data-lifeskills-3d-viewport="${bay.id}"]`);
      React.act(() => {
        viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'e', bubbles: true }));
      });
      expect(activeMount.getState()[`ls3dExplode_${bay.id}`]).toBe(false);

      // Inspect all 6 parts and verify badge unlock
      for (const btn of partButtons) {
        React.act(() => {
          btn.click();
        });
      }
      expect(activeMount.getState().badges?.[bay.badgeId]).toBeTruthy();

      activeMount.unmount();
      activeMount = null;
    }
  });

  it('builds WebGL Three.js r128 geometry cleanly across all 15 bays without CapsuleGeometry and radially expands children when explode=true', () => {
    const src = read(LIFESKILLS_PATHS[0]);
    expect(src).not.toContain('CapsuleGeometry');

    const builtConfigs = {};
    resetStemLab();
    const cfgTool = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (cfg) => ({
      attach() {},
      push(next) { builtConfigs[next.sig.split('|')[0]] = { cfg, next }; },
      onStatusChange() {},
      status() { return 'idle'; },
      debug() { return { state: 'idle' }; },
      dispose() {},
    });

    const allBayIds = [
      'homesys', 'science', 'carcare', 'homerepair', 'homesafety',
      'transport', 'cooking', 'laundry', 'bodycare', 'dental',
      'sleep', 'meds', 'digitalsafety', 'credit', 'timemanagement',
    ];

    for (const bid of allBayIds) {
      cfgTool.render(makeCtx({ toolData: { lifeSkills: { tab: bid } } }));
    }

    function makeMockThree() {
      class Vec3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; } }
      class Obj3D { constructor() { this.children = []; this.position = new Vec3(); this.rotation = new Vec3(); this.userData = {}; } add(c) { this.children.push(c); return c; } }
      class Mesh extends Obj3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
      return {
        Vector3: Vec3, Group: Obj3D, Scene: Obj3D, Mesh,
        BoxGeometry: function(...a) { this.type = 'BoxGeometry'; this.args = a; },
        CylinderGeometry: function(...a) { this.type = 'CylinderGeometry'; this.args = a; },
        SphereGeometry: function(...a) { this.type = 'SphereGeometry'; this.args = a; },
        ConeGeometry: function(...a) { this.type = 'ConeGeometry'; this.args = a; },
        TorusGeometry: function(...a) { this.type = 'TorusGeometry'; this.args = a; },
        RingGeometry: function(...a) { this.type = 'RingGeometry'; this.args = a; },
        MeshPhongMaterial: function(o) { Object.assign(this, o || {}); },
      };
    }

    const THREE = makeMockThree();
    expect(Object.keys(builtConfigs).length).toBe(15);
    for (const bid of allBayIds) {
      const { cfg, next } = builtConfigs[bid];
      const S1 = { model: new THREE.Group(), target: null, half: null };
      cfg.build(THREE, S1, Object.assign({}, next, { explode: false }));
      expect(S1.model.children.length).toBeGreaterThanOrEqual(8);

      const S2 = { model: new THREE.Group(), target: null, half: null };
      cfg.build(THREE, S2, Object.assign({}, next, { explode: true }));
      const movedChildren = S2.model.children.filter((ch, i) => {
        const b = S1.model.children[i];
        return ch.userData && ch.userData.partId && (Math.abs(ch.position.x - b.position.x) > 0.01 || Math.abs(ch.position.z - b.position.z) > 0.01);
      });
      expect(movedChildren.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives ALL 5 Learn domains interactive 3D bays and verifies Paycheck 401(k)/Match, Proof Audit, and Budget Runway simulators', () => {
    // Every content domain button in Learn now links to an interactive 3D bay (0 fallback domains)
    activeMount = mountInteractiveLifeSkills({ tab: 'learn' });
    const launchpadBtns = Array.from(activeMount.host.querySelectorAll('[data-lifeskills-learn-launchpad="true"] button'));
    expect(launchpadBtns.length).toBe(5);
    for (const btn of launchpadBtns) {
      expect(btn.textContent).toContain('interactive 3D bay');
      expect(btn.textContent).not.toContain('Interactive subtools');
    }
    activeMount.unmount();
    activeMount = null;

    // Paycheck Pre-Tax & Employer Match pipeline -> ciMonthly + budgetIncome
    activeMount = mountInteractiveLifeSkills({ tab: 'paycheck', payRate: 25, payHours: 40, pay401kPct: 6, payMatchCapPct: 4, payHsaAnnual: 600 });
    const payMatchCard = activeMount.host.querySelector('[data-lifeskills-pretax-match-sim="true"]');
    expect(payMatchCard).toBeTruthy();
    expect(payMatchCard.textContent).toContain('100% Match Captured');
    activeMount.clickButton('Sync Monthly Wealth');
    expect(activeMount.getState().ciMonthly).toBeGreaterThan(350);
    activeMount.clickButton('Send Post-401(k) Net Pay');
    expect(activeMount.getState().budgetIncome).toBeGreaterThan(2000);
    activeMount.unmount();
    activeMount = null;

    // Proof Locker Privacy & Competency Auditor
    activeMount = mountInteractiveLifeSkills({ tab: 'prooflocker', proofArtCount: 4, proofCompCount: 6, proofStripExif: true, proofRedactNames: true, proofShareMode: 'view-only-unlisted' });
    const proofCard = activeMount.host.querySelector('[data-lifeskills-proof-audit-sim="true"]');
    expect(proofCard).toBeTruthy();
    expect(proofCard.textContent).toContain('Audit-Ready');
    activeMount.clickButton('Insert Safe-Share Audit Checklist');
    expect(activeMount.getState().proofPlanNote).toContain('EXIF stripped');
    expect(activeMount.getState().badges?.portfolioCurator).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // Budget Emergency Runway & Fisher Real Inflation Yield Simulator
    activeMount = mountInteractiveLifeSkills({ tab: 'budget', budgetIncome: 4000, budLiquidSavings: 4000, budInflationPct: 3.0, budCashAprPct: 0.05 });
    const rwyCard = activeMount.host.querySelector('[data-lifeskills-runway-inflation-sim="true"]');
    expect(rwyCard).toBeTruthy();
    expect(rwyCard.textContent).toContain('-2.86%/yr');
    activeMount.clickButton('Compare High-Yield Savings');
    expect(activeMount.getState().budCashAprPct).toBe(4.25);
    expect(activeMount.host.querySelector('[data-lifeskills-runway-inflation-sim="true"]').textContent).toContain('+1.21%/yr');
  });
});

describe('Wave 8 — 20-Bay 3D Architecture, Interactive 3D Fault Diagnostics & Tax/Shrinkflation/Commute Simulators', () => {
  let activeMount = null;

  afterEach(() => {
    if (activeMount) {
      activeMount.unmount();
      activeMount = null;
    }
    if (globalThis.window && globalThis.window.StemLab) {
      delete globalThis.window.StemLab.makeOrbitViewer;
    }
  });

  it('computes pure STEAM invariants for marginal-vs-effective tax raise myth, shrinkflation unit inflation, and commute TCO/carbon', () => {
    const {
      calcMarginalVsEffectiveTaxShock,
      calcShrinkflationAndSpoilageImpact,
      calcCommuteModeAndCarbonTco,
    } = loadPureSteamHelpers();

    // Crossing from 12% to 22% federal bracket ($58k -> $66k single) still yields substantial positive net gain
    const raiseRes = calcMarginalVsEffectiveTaxShock(58000, 8000, 'single', 4.5);
    expect(raiseRes.oldTopFedBracketPct).toBe(12);
    expect(raiseRes.newTopFedBracketPct).toBe(22);
    expect(raiseRes.crossedFedBracket).toBe(true);
    expect(raiseRes.netRaiseAnnual).toBeGreaterThan(4500);
    expect(raiseRes.mythDebunked).toBe(true);
    expect(raiseRes.keepCentsPerDollar).toBeGreaterThan(55);
    expect(raiseRes.newEffectiveRatePct).toBeLessThan(raiseRes.newTopFedBracketPct);

    // 18oz -> 14.5oz at identical $4.99 price yields +24.1% hidden unit inflation & positive spoilage recovery
    const shrinkRes = calcShrinkflationAndSpoilageImpact(4.99, 18, 4.99, 14.5, 22, 368);
    expect(shrinkRes.stickerChangePct).toBe(0);
    expect(shrinkRes.hiddenUnitInflationPct).toBe(24.1);
    expect(shrinkRes.isShrinkflation).toBe(true);
    expect(shrinkRes.wastedMonthlyDollars).toBe(81);
    expect(shrinkRes.recoverableMonthlySavings).toBeGreaterThan(40);
    expect(shrinkRes.recoverableAnnualSavings).toBe(shrinkRes.recoverableMonthlySavings * 12);
    expect(shrinkRes.optimizedMonthlyGrocery).toBeLessThan(368);

    // Commute TCO + EPA CO2 model chooses transit over driving for 8-mi commute, active for <=6-mi short hops
    const com8 = calcCommuteModeAndCarbonTco(8, 20, 28, 3.5, 190, 85, 18);
    expect(com8.monthlyMiles).toBe(320);
    expect(com8.driveTotalMonthly).toBeGreaterThan(com8.transitTotalMonthly);
    expect(com8.co2SavedTransitKgYear).toBeGreaterThan(800);
    expect(com8.bestCostMode).toBe('transit');

    const com3 = calcCommuteModeAndCarbonTco(3, 20, 28, 3.5, 190, 85, 18);
    expect(com3.bestCostMode).toBe('active');
  });

  it('mounts all 5 new 3D bays, verifies 20 total WebGL r128 scenes (>=8 meshes, zero CapsuleGeometry), and unlocks all 5 badges', () => {
    const newBays = [
      { id: 'foodconfidence', badgeId: 'leftoverSafe' },
      { id: 'insurance', badgeId: 'insured' },
      { id: 'budget', badgeId: 'budgeteer' },
      { id: 'appointments', badgeId: 'appointmentReady' },
      { id: 'interviewstudio', badgeId: 'interviewReady' },
    ];

    for (const bay of newBays) {
      activeMount = mountInteractiveLifeSkills({ tab: bay.id });
      const bayEl = activeMount.host.querySelector(`[data-lifeskills-3d-bay="${bay.id}"]`);
      expect(bayEl).toBeTruthy();
      const partBtns = Array.from(bayEl.querySelectorAll('[role="group"] button'));
      expect(partBtns.length).toBe(6);
      for (const btn of partBtns) {
        React.act(() => {
          btn.click();
        });
      }
      expect(activeMount.getState().badges?.[bay.badgeId]).toBeTruthy();
      activeMount.unmount();
      activeMount = null;
    }

    // Verify all 20 bays push valid parametric Three.js configs
    const src = read(LIFESKILLS_PATHS[0]);
    expect(src).not.toContain('CapsuleGeometry');
    const builtConfigs = {};
    resetStemLab();
    const cfgTool = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (cfg) => ({
      attach() {},
      push(next) { builtConfigs[next.sig.split('|')[0]] = { cfg, next }; },
      onStatusChange() {},
      status() { return 'idle'; },
      debug() { return { state: 'idle' }; },
      dispose() {},
    });

    const all20BayIds = [
      'homesys', 'science', 'carcare', 'homerepair', 'homesafety',
      'transport', 'cooking', 'laundry', 'foodconfidence', 'bodycare',
      'dental', 'sleep', 'meds', 'appointments', 'digitalsafety',
      'budget', 'credit', 'insurance', 'timemanagement', 'interviewstudio',
    ];
    for (const bid of all20BayIds) {
      cfgTool.render(makeCtx({ toolData: { lifeSkills: { tab: bid } } }));
    }
    expect(Object.keys(builtConfigs).length).toBe(20);

    class Vec3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; } }
    class Obj3D { constructor() { this.children = []; this.position = new Vec3(); this.rotation = new Vec3(); this.userData = {}; } add(c) { this.children.push(c); return c; } }
    class Mesh extends Obj3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
    const THREE = {
      Vector3: Vec3, Group: Obj3D, Scene: Obj3D, Mesh,
      BoxGeometry: function(...a) { this.type = 'BoxGeometry'; this.args = a; },
      CylinderGeometry: function(...a) { this.type = 'CylinderGeometry'; this.args = a; },
      SphereGeometry: function(...a) { this.type = 'SphereGeometry'; this.args = a; },
      ConeGeometry: function(...a) { this.type = 'ConeGeometry'; this.args = a; },
      TorusGeometry: function(...a) { this.type = 'TorusGeometry'; this.args = a; },
      RingGeometry: function(...a) { this.type = 'RingGeometry'; this.args = a; },
      MeshPhongMaterial: function(o) { Object.assign(this, o || {}); },
    };

    for (const bid of all20BayIds) {
      const { cfg, next } = builtConfigs[bid];
      const S = { model: new THREE.Group(), target: null, half: null };
      cfg.build(THREE, S, next);
      expect(S.model.children.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('supports direct SVG 3D node click-selection, Q/button Fault Quiz toggling, masked guide protection, and non-farmable diagnostic XP', () => {
    const awarded = [];
    activeMount = mountInteractiveLifeSkills({ tab: 'homesys' }, {
      awardXP: (tool, amt, reason) => awarded.push({ tool, amt, reason }),
    });
    const bayEl = activeMount.host.querySelector('[data-lifeskills-3d-bay="homesys"]');
    const quizToggle = bayEl.querySelector('[data-lifeskills-3d-quiz-toggle="homesys"]');
    const viewport = bayEl.querySelector('[data-lifeskills-3d-viewport="homesys"]');
    expect(quizToggle).toBeTruthy();

    // Activate Fault Quiz via button
    React.act(() => {
      quizToggle.click();
    });
    const quizBox = bayEl.querySelector('[data-lifeskills-3d-quiz="homesys"]');
    expect(quizBox).toBeTruthy();
    expect(quizBox.textContent).toContain('0/6 solved');
    const partGuide = bayEl.querySelector('[aria-label="Selected 3D part guide"]');
    expect(partGuide.textContent).toContain('Fault Quiz active:');

    // Click wrong SVG 3D node ('wall')
    const wrongNode = bayEl.querySelector('[data-lifeskills-3d-node="wall"]');
    expect(wrongNode).toBeTruthy();
    React.act(() => {
      wrongNode.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    expect(activeMount.getState().ls3dSel_homesys).toBe('wall');
    expect(bayEl.querySelector('[data-lifeskills-3d-quiz="homesys"]').textContent).toContain('Not Wall Studs');

    // Click target SVG 3D node ('roof') -> solves case and grants 10 XP once
    const targetNode = bayEl.querySelector('[data-lifeskills-3d-node="roof"]');
    expect(targetNode).toBeTruthy();
    React.act(() => {
      targetNode.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    expect(activeMount.getState().ls3dSel_homesys).toBe('roof');
    expect(bayEl.querySelector('[data-lifeskills-3d-quiz="homesys"]').textContent).toContain('Correct!');
    expect(bayEl.querySelector('[data-lifeskills-3d-quiz="homesys"]').textContent).toContain('1/6 solved');
    expect(bayEl.querySelector('[aria-label="Selected 3D part guide"]').textContent).not.toContain('Fault Quiz active:');
    const quizXpCountFirst = awarded.filter((x) => x.reason.includes('Diagnosed 3D fault')).length;
    expect(quizXpCountFirst).toBe(1);

    // Repeat click on already-solved node does not farm extra diagnostic XP
    React.act(() => {
      targetNode.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    expect(awarded.filter((x) => x.reason.includes('Diagnosed 3D fault')).length).toBe(1);

    // Keyboard 'q' closes Fault Quiz
    React.act(() => {
      viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'q', bubbles: true }));
    });
    expect(bayEl.querySelector('[data-lifeskills-3d-quiz="homesys"]')).toBeFalsy();
  });

  it('wires Paycheck Raise-Myth, Food Shrinkflation, and Commute TCO simulators directly into Budget & enforces 4-mirror byte parity', () => {
    // 1. Paycheck Raise Myth -> budgetIncome + firstPay + budgeteer
    activeMount = mountInteractiveLifeSkills({ tab: 'paycheck', payRate: 28, payHours: 40, payRaiseOffer: 8000 });
    const raiseCard = activeMount.host.querySelector('[data-lifeskills-raise-myth-sim="true"]');
    expect(raiseCard).toBeTruthy();
    expect(raiseCard.textContent).toContain('Crosses to 22% Bracket');
    activeMount.clickButton('Send Post-Raise Monthly Net');
    expect(activeMount.getState().budgetIncome).toBeGreaterThan(4000);
    expect(activeMount.getState().badges?.firstPay).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 2. Food Shrinkflation -> budgetExp.Groceries + leftoverSafe
    activeMount = mountInteractiveLifeSkills({ tab: 'foodconfidence' });
    const shrinkCard = activeMount.host.querySelector('[data-lifeskills-shrinkflation-sim="true"]');
    expect(shrinkCard).toBeTruthy();
    expect(shrinkCard.textContent).toContain('+24.1%');
    activeMount.clickButton('Apply Low-Waste Grocery Target to Budget');
    expect(activeMount.getState().budgetExp?.Groceries).toBeGreaterThan(200);
    expect(activeMount.getState().budgetExp?.Groceries).toBeLessThan(368);
    expect(activeMount.getState().badges?.leftoverSafe).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 3. Commute TCO & Carbon -> budgetExp.Transportation + tripReady
    activeMount = mountInteractiveLifeSkills({ tab: 'transport' });
    const commuteCard = activeMount.host.querySelector('[data-lifeskills-commute-tco-sim="true"]');
    expect(commuteCard).toBeTruthy();
    expect(commuteCard.textContent).toContain('Optimal: TRANSIT');
    activeMount.clickButton('Sync Optimal Commute Cost to Budget');
    expect(activeMount.getState().budgetExp?.Transportation).toBe(85);
    expect(activeMount.getState().badges?.tripReady).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Exact 4-mirror byte parity
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});
describe('Wave 9 — 25-Bay 3D Architecture, 3D X-Ray/Hotkey Controls & Credit/Sleep/Energy Simulators', () => {
  afterEach(() => {
    if (activeMount) {
      try { activeMount.unmount(); } catch (_) {}
      activeMount = null;
    }
    resetStemLab();
  });

  function makeWave9MockThree() {
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
      MeshPhongMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
      MeshLambertMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
      MeshBasicMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
    };
  }

  it('computes pure STEAM credit utilization APR penalty, sleep debt reaction lag, and phantom kWh energy savings accurately', () => {
    const h = loadPureSteamHelpers();

    // 1. Utilization & APR penalty (85% severe vs <10% prime)
    const highUtil = h.calcUtilizationAndAprPenalty(3400, 4000, 18000, 60);
    expect(highUtil.utilizationPct).toBe(85);
    expect(highUtil.utilizationTier).toContain('Severe');
    expect(highUtil.estimatedApr).toBe(18.9);
    expect(highUtil.primeApr).toBe(5.9);
    expect(highUtil.currentMonthlyPayment).toBeGreaterThan(highUtil.primeMonthlyPayment + 100);
    expect(highUtil.lifetimeInterestPenalty).toBeGreaterThan(6000);
    expect(highUtil.paydownTo30).toBe(2200);
    expect(highUtil.paydownTo10).toBe(3000);

    const lowUtil = h.calcUtilizationAndAprPenalty(200, 4000, 18000, 60);
    expect(lowUtil.utilizationPct).toBe(5);
    expect(lowUtil.estimatedApr).toBe(5.9);
    expect(lowUtil.monthlyAprPenalty).toBe(0);
    expect(lowUtil.paydownTo30).toBe(0);
    expect(lowUtil.paydownTo10).toBe(0);

    const zeroLim = h.calcUtilizationAndAprPenalty(500, 0, 0, 0);
    expect(zeroLim.utilizationPct).toBe(100);
    expect(zeroLim.currentMonthlyPayment).toBe(0);

    // 2. Sleep debt, weekend jetlag & psychomotor reaction penalty
    const debt = h.calcSleepDebtAndReactionPenalty(8, 6, 5, 2);
    expect(debt.grossWeeklyDebt).toBe(10);
    expect(debt.effectiveRecoveredHours).toBe(2.2);
    expect(debt.netWeeklyDebt).toBe(7.8);
    expect(debt.circadianJetlagMinutes).toBe(60);
    expect(debt.reactionPenaltyMs).toBe(59);
    expect(debt.bacEquivalentPct).toBeCloseTo(0.035, 3);
    expect(debt.microsleepRiskLevel).toBe('Moderate');

    const heavyDebt = h.calcSleepDebtAndReactionPenalty(8, 5, 5, 1);
    expect(heavyDebt.netWeeklyDebt).toBe(13.9);
    expect(heavyDebt.microsleepRiskLevel).toBe('High');
    expect(heavyDebt.drowsyDrivingAlert).toBe(true);

    // 3. Standby vampire power vs Smart-Strip kWh audit
    const energy = h.calcStandbyAndApplianceKwhAudit(1200, 4, 8, 10, 0.2);
    expect(energy.activeMonthlyKwh).toBe(144);
    expect(energy.standbyMonthlyKwh).toBe(57.6);
    expect(energy.totalMonthlyKwh).toBe(201.6);
    expect(energy.totalMonthlyCost).toBeCloseTo(40.32, 2);
    expect(energy.smartStripMonthlyBill).toBeLessThan(energy.totalMonthlyCost);
    expect(energy.annualSmartStripSavings).toBeGreaterThan(100);
    expect(energy.co2KgPerYearSaved).toBeGreaterThan(200);
  });

  it('mounts all 5 new 3D bays, verifies 25/25 WebGL scenes with >=8 meshes and zero CapsuleGeometry, and unlocks badges', () => {
    const newBays = [
      { id: 'paycheck', tab: 'paycheck', partA: 'Gross Wage Reservoir', partB: 'Employer 401(k) Match Injector', badge: 'firstPay' },
      { id: 'data', tab: 'data', partA: 'Prior Base-Rate Prism P(H)', partB: 'Bayesian Posterior Funnel P(H|E)', badge: 'dataDetect' },
      { id: 'contract', tab: 'contract', partA: 'Headline Rate Pedestal', partB: 'Early Termination Cliff', badge: 'trapFinder' },
      { id: 'records', tab: 'records', partA: 'Primary Photo ID Anchor', partB: '3-Bureau Credit Freeze Lock', badge: 'recordsReady' },
      { id: 'communication', tab: 'communication', partA: 'Neutral Observation Pier', partB: 'WHO-WHAT-WHEN Action Bridge', badge: 'communicationReady' },
    ];

    for (const bay of newBays) {
      activeMount = mountInteractiveLifeSkills({ tab: bay.tab });
      const bayEl = activeMount.host.querySelector(`[data-lifeskills-3d-bay="${bay.id}"]`);
      expect(bayEl).toBeTruthy();
      expect(bayEl.textContent).toContain(bay.partA);
      expect(bayEl.textContent).toContain(bay.partB);
      expect(bayEl.querySelectorAll('[role="group"] button').length).toBe(6);

      const groupBtns = [...bayEl.querySelectorAll('[role="group"] button')];
      for (const btn of groupBtns) {
        React.act(() => { btn.click(); });
      }
      expect(activeMount.getState().badges?.[bay.badge]).toBeTruthy();
      activeMount.unmount();
      activeMount = null;
    }

    // All 25 WebGL bays generate >=8 meshes with zero CapsuleGeometry
    const src = read(LIFESKILLS_PATHS[0]);
    expect(src).not.toContain('CapsuleGeometry');
    const mockThree = makeWave9MockThree();
    activeMount = mountInteractiveLifeSkills({ tab: 'overview' });
    const bayLauncherBtns = activeMount.host.querySelectorAll('[data-lifeskills-inline-3d-bays="true"] button');
    expect(bayLauncherBtns.length).toBe(30);
    activeMount.unmount();
    activeMount = null;

    const all25Tabs = [
      'homesys', 'science', 'carcare', 'homerepair', 'homesafety',
      'transport', 'cooking', 'laundry', 'foodconfidence', 'bodycare',
      'dental', 'sleep', 'meds', 'appointments', 'digitalsafety',
      'paycheck', 'budget', 'credit', 'insurance', 'contract',
      'records', 'data', 'timemanagement', 'communication', 'interviewstudio',
    ];
    for (const tid of all25Tabs) {
      resetStemLab();
      const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
      const mountCalls = [];
      window.StemLab.makeOrbitViewer = (orbitCfg) => ({
        attach: () => {},
        push: (next) => {
          const scene = new mockThree.Scene();
          const group = new mockThree.Group();
          scene.add(group);
          orbitCfg.build(mockThree, { scene, model: group }, next);
          mountCalls.push({
            sig: next.sig,
            childCount: group.children.length,
            hasCapsule: group.children.some((ch) => ch.geometry?.type === 'CapsuleGeometry'),
          });
        },
        onStatusChange: () => {},
        status: () => 'ready',
        debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
        dispose: () => {},
      });
      const hostEl = document.createElement('div');
      document.body.appendChild(hostEl);
      const root = ReactDOMClient.createRoot(hostEl);
      React.act(() => {
        root.render(React.createElement(() => {
          const [toolData, setToolData] = React.useState({ lifeSkills: { tab: tid } });
          return cfg.render(makeCtx({ toolData, setToolData }));
        }));
      });
      expect(mountCalls.length).toBeGreaterThanOrEqual(1);
      expect(mountCalls[0].childCount).toBeGreaterThanOrEqual(8);
      expect(mountCalls[0].hasCapsule).toBe(false);
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('supports 3D X-Ray Isolate Mode (UI, keyboard X, WebGL ghost/wireframe), 1-6 hotkeys, and Fault Quiz TTS spoiler protection', () => {
    const mockThree = makeWave9MockThree();
    const buildHistory = [];
    const spoken = [];

    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        orbitCfg.build(mockThree, { scene, model: group }, next);
        buildHistory.push({ next, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function XRayHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'paycheck' } });
      return cfg.render(makeCtx({
        toolData,
        setToolData,
        callTTS: (txt) => {
          spoken.push(String(txt || ''));
          return Promise.resolve();
        },
      }));
    }
    React.act(() => { root.render(React.createElement(XRayHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="paycheck"]');
      expect(bay).toBeTruthy();

      // Hotkey '3' selects 3rd part ('Progressive Tax Bracket Stairs')
      const viewport = bay.querySelector('[role="application"]');
      React.act(() => {
        viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '3', bubbles: true }));
      });
      expect(bay.querySelector('[aria-label="Selected 3D part guide"]').textContent).toContain('Progressive Tax Bracket Stairs');

      // Click X-Ray button -> SVG dims non-selected nodes to 0.26, HUD renders, WebGL non-selected parts wireframe + ghosted
      const xrayBtn = bay.querySelector('[data-lifeskills-3d-xray="paycheck"]');
      expect(xrayBtn).toBeTruthy();
      React.act(() => { xrayBtn.click(); });
      expect(xrayBtn.getAttribute('aria-pressed')).toBe('true');
      expect(bay.textContent).toContain('X-RAY ISOLATE:');

      const activeNode = bay.querySelector('[data-lifeskills-3d-node="bracket_stair"]');
      const otherNode = bay.querySelector('[data-lifeskills-3d-node="gross_intake"]');
      expect(Number(activeNode.style.opacity)).toBe(1);
      expect(Number(otherNode.style.opacity)).toBeCloseTo(0.26, 2);

      const latestBuild = buildHistory[buildHistory.length - 1];
      expect(latestBuild.next.xray).toBe(true);
      const nonSelPartMesh = latestBuild.children.find((m) => m.userData?.partId === 'gross_intake');
      const selPartMesh = latestBuild.children.find((m) => m.userData?.partId === 'bracket_stair');
      const floorMesh = latestBuild.children.find((m) => !m.userData?.partId);
      expect(nonSelPartMesh.material.transparent).toBe(true);
      expect(nonSelPartMesh.material.opacity).toBeCloseTo(0.22, 2);
      expect(nonSelPartMesh.material.wireframe).toBe(true);
      expect(selPartMesh.material.wireframe).toBe(false);
      expect(floorMesh.material.opacity).toBeCloseTo(0.14, 2);

      // Keyboard 'x' toggles X-Ray back off
      React.act(() => {
        viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'x', bubbles: true }));
      });
      expect(xrayBtn.getAttribute('aria-pressed')).toBe('false');

      // Fault Quiz active while target part is focused -> Read Part TTS must NOT speak risk spoiler
      React.act(() => {
        viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '1', bubbles: true }));
      });
      const quizToggle = bay.querySelector('[data-lifeskills-3d-quiz-toggle="paycheck"]');
      React.act(() => { quizToggle.click(); });
      const readPartBtn = [...bay.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Read Part'));
      expect(readPartBtn).toBeTruthy();
      React.act(() => { readPartBtn.click(); });
      expect(spoken.length).toBe(1);
      expect(spoken[0]).toContain('Fault Quiz active');
      expect(spoken[0]).not.toContain('Turning down a raise');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('connects Sleep Debt recovery, Science kWh audit -> Utilities, and Credit Utilization APR -> Transportation + verifies 4-mirror parity', () => {
    // 1. Sleep Debt Simulator -> Steady 8h Anchor + energyCoach & sleepPlanner badges
    activeMount = mountInteractiveLifeSkills({ tab: 'sleep', sleepNeedHours: 8, sleepActualWeeknight: 6, sleepShortNights: 5, sleepWeekendExtra: 2 });
    const sleepSim = activeMount.host.querySelector('[data-lifeskills-sleep-debt-sim="true"]');
    expect(sleepSim).toBeTruthy();
    expect(sleepSim.textContent).toContain('+59 ms');
    activeMount.clickButton('Apply Steady 8h Recovery Anchor');
    expect(activeMount.getState().sleepActualWeeknight).toBe(8);
    expect(activeMount.getState().sleepShortNights).toBe(0);
    expect(activeMount.getState().badges?.energyCoach).toBeTruthy();
    expect(activeMount.getState().badges?.sleepPlanner).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 2. Science Standby kWh Audit -> budgetExp.Utilities + appliedSci & budgeteer
    activeMount = mountInteractiveLifeSkills({ tab: 'science', sciActiveWatts: 1200, sciActiveHours: 4, sciStandbyWatts: 8, sciVampireCount: 10, sciKwhRate: 0.2 });
    const kwhSim = activeMount.host.querySelector('[data-lifeskills-kwh-phantom-sim="true"]');
    expect(kwhSim).toBeTruthy();
    expect(kwhSim.textContent).toContain('201.6 kWh');
    activeMount.clickButton('Sync Smart-Strip Target');
    expect(activeMount.getState().budgetExp?.Utilities).toBe(31);
    expect(activeMount.getState().badges?.appliedSci).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 3. Credit Utilization APR Penalty -> budgetExp.Transportation + creditWise
    activeMount = mountInteractiveLifeSkills({ tab: 'credit', crUtilBalance: 3400, crUtilLimit: 4000, crLoanPrincipal: 18000, crLoanMonths: 60 });
    const credSim = activeMount.host.querySelector('[data-lifeskills-utilization-apr-sim="true"]');
    expect(credSim).toBeTruthy();
    expect(credSim.textContent).toContain('85% Util');
    expect(credSim.textContent).toContain('18.9% APR');
    activeMount.clickButton('Sync Auto Payment');
    expect(activeMount.getState().budgetExp?.Transportation).toBe(466);
    expect(activeMount.getState().badges?.creditWise).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Exact 4-mirror byte parity
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});
describe('Wave 10 — 30-Bay Complete 3D Architecture, 3D Focus-Part Camera Framing & HSA/Maintenance/ATS Simulators', () => {
  afterEach(() => {
    if (activeMount) {
      try { activeMount.unmount(); } catch (_) {}
      activeMount = null;
    }
    resetStemLab();
  });

  function makeWave10MockThree() {
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
      MeshPhongMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
      MeshLambertMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
      MeshBasicMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
    };
  }

  it('computes pure STEAM HSA/FSA tax shields, vehicle maintenance neglect risk, and ATS keyword readability invariants', () => {
    const h = loadPureSteamHelpers();

    // 1. HSA vs FSA IRS $640 rollover cap & tax-free compounding
    const hsaVsFsa = h.calcHsaVsFsaTaxShield(1200, 3000, 2400, 22, 10, 7);
    expect(hsaVsFsa.hsaTaxSaved).toBe(889.5);
    expect(hsaVsFsa.fsaTaxSaved).toBe(711.6);
    expect(hsaVsFsa.fsaForfeitedDollars).toBe(560);
    expect(hsaVsFsa.hasFsaForfeitureRisk).toBe(true);
    expect(hsaVsFsa.fsaNetBenefit).toBe(151.6);
    expect(hsaVsFsa.hsaProjectedBalance).toBeGreaterThan(24000);
    expect(hsaVsFsa.monthlyOutOfPocketAndHsa).toBe(250);
    expect(hsaVsFsa.recommendedAccount).toBe('hsa');

    const hsaUncovered = h.calcHsaVsFsaTaxShield(4000, 2000, 3300, 12, 10, 0);
    expect(hsaUncovered.fsaForfeitedDollars).toBe(0);
    expect(hsaUncovered.uncoveredMedicalSpend).toBe(2000);
    expect(hsaUncovered.monthlyOutOfPocketAndHsa).toBe(333);

    // 2. Vehicle Preventive Maintenance vs Neglect Risk & Zero-Mile boundary
    const overdueCar = h.calcVehicleMaintenanceAndNeglectRisk(12000, 6, 12500, 8, 25);
    const cleanCar = h.calcVehicleMaintenanceAndNeglectRisk(12000, 6, 5000, 0, 25);
    const parkedCar = h.calcVehicleMaintenanceAndNeglectRisk(0, 6, 5000, 0, 0);
    expect(overdueCar.preventiveMonthlyReserveRounded).toBe(95);
    expect(overdueCar.mpgLossPct).toBe(2.4);
    expect(overdueCar.riskBand).toBe('high-wear-danger');
    expect(overdueCar.annualBreakdownProbPct).toBeGreaterThan(cleanCar.annualBreakdownProbPct * 2);
    expect(cleanCar.riskBand).toBe('preventive-optimal');
    expect(cleanCar.extraFuelDollarsAnnual).toBe(0);
    expect(parkedCar.preventiveMonthlyReserveRounded).toBe(0);
    expect(parkedCar.annualBreakdownProbPct).toBe(0);

    // 3. ATS Keyword Match & 6-Second Recruiter Scan Readability
    const singleCol = h.calcJobMatchAndScanReadability(8, 10, 5, 6, 340, true);
    const multiCol = h.calcJobMatchAndScanReadability(8, 10, 5, 6, 340, false);
    expect(singleCol.keywordMatchPct).toBe(80);
    expect(singleCol.quantifiedDensityPct).toBe(83.3);
    expect(singleCol.atsParsePenalty).toBe(0);
    expect(singleCol.atsReadinessScore).toBe(86);
    expect(singleCol.readinessBand).toBe('interview-strong');
    expect(multiCol.atsParsePenalty).toBe(25);
    expect(multiCol.atsReadinessScore).toBe(61);
    expect(multiCol.readinessBand).toBe('needs-tailoring');
  });

  it('mounts all 5 Wave 10 3D bays, verifies 30/30 WebGL scenes with >=8 meshes and zero CapsuleGeometry, and unlocks badges', () => {
    const wave10Bays = [
      { id: 'decision', tab: 'decision', partA: 'Weighted Criteria Fulcrum', partB: 'Quarantined Sunk-Cost Anchor', badge: 'decisionPro' },
      { id: 'workreadiness', tab: 'workreadiness', partA: '10-Minute Arrival Buffer Beacon', partB: '1.5x Overtime Threshold Tower', badge: 'jobReady' },
      { id: 'resumebuilder', tab: 'resumebuilder', partA: 'Single-Column ATS Parse Rail', partB: 'Quantified Outcome Metric Pillar', badge: 'resumeReady' },
      { id: 'prooflocker', tab: 'prooflocker', partA: 'EXIF & GPS Metadata Scrubber Ring', partB: 'View-Only Unlisted Link Gate', badge: 'proofLockerReady' },
      { id: 'battle', tab: 'battle', partA: 'Resilience HP Shield Core', partB: 'Adulting Curveball Boss Monolith', badge: 'battleWin' },
    ];

    for (const bay of wave10Bays) {
      activeMount = mountInteractiveLifeSkills({ tab: bay.tab });
      const bayEl = activeMount.host.querySelector(`[data-lifeskills-3d-bay="${bay.id}"]`);
      expect(bayEl).toBeTruthy();
      expect(bayEl.textContent).toContain(bay.partA);
      expect(bayEl.textContent).toContain(bay.partB);
      expect(bayEl.querySelectorAll('[role="group"] button').length).toBe(6);

      const groupBtns = [...bayEl.querySelectorAll('[role="group"] button')];
      for (const btn of groupBtns) {
        React.act(() => { btn.click(); });
      }
      expect(activeMount.getState().badges?.[bay.badge]).toBeTruthy();
      activeMount.unmount();
      activeMount = null;
    }

    const src = read(LIFESKILLS_PATHS[0]);
    expect(src).not.toContain('CapsuleGeometry');
    const mockThree = makeWave10MockThree();
    const all30Tabs = [
      'homesys', 'science', 'carcare', 'homerepair', 'homesafety',
      'transport', 'cooking', 'laundry', 'foodconfidence', 'bodycare',
      'dental', 'sleep', 'meds', 'appointments', 'digitalsafety',
      'paycheck', 'budget', 'credit', 'insurance', 'contract',
      'records', 'data', 'timemanagement', 'communication', 'decision',
      'workreadiness', 'resumebuilder', 'prooflocker', 'interviewstudio', 'battle',
    ];
    expect(all30Tabs).toHaveLength(30);
    for (const tid of all30Tabs) {
      resetStemLab();
      const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
      const mountCalls = [];
      window.StemLab.makeOrbitViewer = (orbitCfg) => ({
        attach: () => {},
        push: (next) => {
          const scene = new mockThree.Scene();
          const group = new mockThree.Group();
          scene.add(group);
          orbitCfg.build(mockThree, { scene, model: group }, next);
          mountCalls.push({
            sig: next.sig,
            childCount: group.children.length,
            hasCapsule: group.children.some((ch) => ch.geometry?.type === 'CapsuleGeometry'),
          });
        },
        onStatusChange: () => {},
        status: () => 'ready',
        debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
        dispose: () => {},
      });
      const hostEl = document.createElement('div');
      document.body.appendChild(hostEl);
      const root = ReactDOMClient.createRoot(hostEl);
      React.act(() => {
        root.render(React.createElement(() => {
          const [toolData, setToolData] = React.useState({ lifeSkills: { tab: tid } });
          return cfg.render(makeCtx({ toolData, setToolData }));
        }));
      });
      expect(mountCalls.length).toBeGreaterThanOrEqual(1);
      expect(mountCalls[0].childCount).toBeGreaterThanOrEqual(8);
      expect(mountCalls[0].hasCapsule).toBe(false);
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('supports 3D Focus-Part camera framing (button, keyboard C, 0 reset, SVG reticle, and WebGL S.target framing)', () => {
    const mockThree = makeWave10MockThree();
    const buildHistory = [];

    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        const stateObj = { scene, model: group, target: null, half: null };
        scene.add(group);
        orbitCfg.build(mockThree, stateObj, next);
        buildHistory.push({ next, stateObj });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function FocusHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'decision' } });
      return cfg.render(makeCtx({ toolData, setToolData }));
    }
    React.act(() => { root.render(React.createElement(FocusHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="decision"]');
      const viewport = bay.querySelector('[role="application"]');
      const focusBtn = bay.querySelector('[data-lifeskills-3d-focus="decision"]');
      expect(focusBtn).toBeTruthy();
      expect(focusBtn.getAttribute('aria-pressed')).toBe('false');

      // Select part 5 ('sunk_cost_quarantine' at [0.9, -0.48, 0.75]) via hotkey '5'
      React.act(() => {
        viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '5', bubbles: true }));
      });
      const circleCountBeforeFocus = bay.querySelectorAll('svg circle').length;

      // Toggle Focus Part ON -> button aria-pressed='true', SVG reticle + HUD shown, WebGL target shifted to active part coords
      React.act(() => { focusBtn.click(); });
      expect(focusBtn.getAttribute('aria-pressed')).toBe('true');
      expect(bay.textContent).toContain('FOCUS TARGET (0.9, -0.48, 0.75):');
      expect(bay.textContent).toContain('1.35x');
      expect(bay.querySelector('[data-lifeskills-3d-reticle="sunk_cost_quarantine"]')).toBeTruthy();
      expect(bay.querySelectorAll('svg circle').length).toBe(circleCountBeforeFocus);

      const focusedBuild = buildHistory[buildHistory.length - 1];
      expect(focusedBuild.next.focusPart).toBe(true);
      expect(focusedBuild.stateObj.target.x).toBeCloseTo(0.9, 2);
      expect(focusedBuild.stateObj.target.y).toBeCloseTo(-0.48, 2);
      expect(focusedBuild.stateObj.target.z).toBeCloseTo(0.75, 2);

      // Keyboard '0' resets camera and clears Focus Part mode
      React.act(() => {
        viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true }));
      });
      expect(focusBtn.getAttribute('aria-pressed')).toBe('false');
      expect(bay.textContent).toContain('1.00x');

      // Keyboard 'c' re-enables Focus Part mode
      React.act(() => {
        viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      });
      expect(focusBtn.getAttribute('aria-pressed')).toBe('true');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('wires HSA/FSA -> Budget Insurance, Car Maintenance -> Budget Transportation, ATS Audit -> Resume Plan & verifies 4-mirror parity', () => {
    // 1. Insurance HSA vs FSA -> budgetExp.Insurance + insured + saver
    activeMount = mountInteractiveLifeSkills({ tab: 'insurance', insMedSpend: 1200, insHsaContrib: 3000, insFsaContrib: 2400, insMargTaxPct: 22, insHsaYears: 10 });
    const hsaSim = activeMount.host.querySelector('[data-lifeskills-hsa-fsa-sim="true"]');
    expect(hsaSim).toBeTruthy();
    expect(hsaSim.textContent).toContain('$890/yr');
    expect(hsaSim.textContent).toContain('FSA Loses $560');
    activeMount.clickButton('Sync Plan A + HSA Reserve');
    expect(activeMount.getState().budgetExp?.Insurance).toBe(500);
    expect(activeMount.getState().badges?.insured).toBeTruthy();
    expect(activeMount.getState().badges?.saver).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 2. Car Care Maintenance & Neglect Risk -> budgetExp.Transportation + mechanic + budgeteer
    activeMount = mountInteractiveLifeSkills({ tab: 'carcare', ccAnnualMiles: 12000, ccVehicleAge: 6, ccOilInterval: 12500, ccPsiDeficit: 8, ccDiySharePct: 25 });
    const maintSim = activeMount.host.querySelector('[data-lifeskills-maint-neglect-sim="true"]');
    expect(maintSim).toBeTruthy();
    expect(maintSim.textContent).toContain('$95/mo');
    expect(maintSim.textContent).toContain('High Engine/Tire Wear');
    activeMount.clickButton('Sync Dynamic Auto Reserve');
    expect(activeMount.getState().budgetExp?.Transportation).toBe(95);
    expect(activeMount.getState().badges?.mechanic).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 3. Resume Builder ATS Keyword & 6-Second Scan Audit -> resumePlanNote + resumeReady + bulletBuilder
    activeMount = mountInteractiveLifeSkills({ tab: 'resumebuilder', resMatchedKw: 8, resTotalKw: 10, resQuantBullets: 5, resTotalBullets: 6, resWordCount: 340, resSingleCol: true });
    const atsSim = activeMount.host.querySelector('[data-lifeskills-ats-scan-sim="true"]');
    expect(atsSim).toBeTruthy();
    expect(atsSim.textContent).toContain('Interview-Strong (86/100)');
    activeMount.clickButton('Insert ATS Tailoring Step into Resume Plan');
    expect(activeMount.getState().resumePlanNote).toContain('86/100');
    expect(activeMount.getState().badges?.resumeReady).toBeTruthy();
    expect(activeMount.getState().badges?.bulletBuilder).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Exact 4-mirror byte parity
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Wave 11 — WebGL 3D Raycast Picking, 3D Stress-Test Mode & Records/Meds/Offer STEAM Simulators', () => {
  let activeMount = null;

  afterEach(() => {
    if (activeMount) {
      activeMount.unmount();
      activeMount = null;
    }
    resetStemLab();
  });

  function makeWave11MockThree(pickedPartIdRef) {
    function Vec3(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
      this.set = (nx, ny, nz) => { this.x = nx; this.y = ny; this.z = nz; };
    }
    function ColorObj(val = 0) { this.val = val; }
    function Obj3D() {
      this.children = [];
      this.position = new Vec3();
      this.rotation = new Vec3();
      this.userData = {};
      this.parent = null;
      this.add = (child) => { child.parent = this; this.children.push(child); };
    }
    function Mesh(geometry, material) {
      Obj3D.call(this);
      this.geometry = geometry;
      this.material = material;
    }
    function Light() { this.position = new Vec3(); }
    function Raycaster() {
      this.lastNdc = null;
      this.setFromCamera = (ndc) => { this.lastNdc = ndc; };
      this.intersectObjects = (targets) => {
        const hit = targets.find((m) => m.userData?.partId === pickedPartIdRef.current);
        return hit ? [{ object: hit, distance: 1.5 }] : [];
      };
    }
    return {
      Vector3: Vec3,
      Color: ColorObj,
      Group: Obj3D,
      Scene: Obj3D,
      Mesh,
      Raycaster,
      AmbientLight: Light,
      HemisphereLight: Light,
      DirectionalLight: Light,
      BoxGeometry: function(...args) { this.type = 'BoxGeometry'; this.args = args; },
      CylinderGeometry: function(...args) { this.type = 'CylinderGeometry'; this.args = args; },
      SphereGeometry: function(...args) { this.type = 'SphereGeometry'; this.args = args; },
      ConeGeometry: function(...args) { this.type = 'ConeGeometry'; this.args = args; },
      TorusGeometry: function(...args) { this.type = 'TorusGeometry'; this.args = args; },
      MeshPhongMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
      MeshLambertMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
      MeshBasicMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
    };
  }

  it('computes pure STEAM Records identity exposure, Meds half-life stacking & refill runway, and Job Offer true hourly yield', () => {
    const h = loadPureSteamHelpers();

    // 1. Records Identity Exposure & Statutory Retention
    const recHardened = h.calcRecordsRetentionAndIdentityRisk(3, 4, true, true, false);
    const recExposed = h.calcRecordsRetentionAndIdentityRisk(6, 1, false, false, false);
    expect(recHardened.rawExposureScore).toBe(53);
    expect(recHardened.identityExposureScore).toBe(17);
    expect(recHardened.irsAuditStatus).toBe('standard-3yr-met');
    expect(recHardened.securityBand).toBe('zero-trust-ready');
    expect(recHardened.expectedRecoveryHoursSaved).toBeGreaterThan(10);
    expect(recExposed.identityExposureScore).toBe(74);
    expect(recExposed.irsAuditStatus).toBe('under-3yr-gap');
    expect(recExposed.missingAuditYears).toBe(2);
    expect(recExposed.securityBand).toBe('high-exposure-gap');

    // 2. Medication Half-Life Clearance C(t) = C0 * 0.5^(t/t1/2) & Refill Runway
    const stacked = h.calcMedHalfLifeAndRefillRunway(500, 6, 4, 825, 8, 2, 5);
    const spaced = h.calcMedHalfLifeAndRefillRunway(500, 4, 8, 825, 30, 2, 5);
    expect(stacked.residualBeforeDose2Mg).toBe(315);
    expect(stacked.secondDosePeakMg).toBe(815);
    expect(stacked.steadyStatePeakMg).toBe(1351.2);
    expect(stacked.exceedsSafePeak).toBe(true);
    expect(stacked.daysSupplyLeft).toBe(4);
    expect(stacked.reorderNow).toBe(true);
    expect(stacked.safetyBand).toBe('stacking-peak-warning');
    expect(spaced.residualBeforeDose2Mg).toBe(125);
    expect(spaced.steadyStatePeakMg).toBe(666.7);
    expect(spaced.exceedsSafePeak).toBe(false);
    expect(spaced.daysUntilRefillCall).toBe(10);
    expect(spaced.safetyBand).toBe('spaced-and-stocked');

    // 3. Total Job Offer Compensation ($20/hr near transit + good benefits beats $22/hr far commute)
    const offers = h.calcJobOfferTotalCompComparison(20, 30, 75, 180, 22, 95, 260, -40, 40);
    expect(offers.recommendedOffer).toBe('A');
    expect(offers.trueHourlyWithCommuteA).toBeGreaterThan(offers.trueHourlyWithCommuteB);
    expect(offers.commuteHoursSavedByA).toBeGreaterThan(20);
    expect(offers.annualAdvantageA).toBeGreaterThan(600);
  });

  it('supports WebGL 3D Raycaster mesh picking, clickable WebGL callout pills, env reflections, and 3D Stress-Test mode (H hotkey & 0 reset)', () => {
    const pickedTarget = { current: 'forward_ev_spire' };
    const mockThree = makeWave11MockThree(pickedTarget);
    const orbitConfigs = [];
    const buildHistory = [];

    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    let latestState = null;

    window.StemLab.makeOrbitViewer = (orbitCfg) => {
      orbitConfigs.push(orbitCfg);
      let statusCb = null;
      return {
        attach: () => { if (statusCb) statusCb('ready'); },
        push: (next) => {
          const scene = new mockThree.Scene();
          const group = new mockThree.Group();
          const stateObj = { scene, model: group, camera: {}, renderer: null, lastW: 460, lastH: 260, target: null, half: null };
          scene.add(group);
          orbitCfg.build(mockThree, stateObj, next);
          buildHistory.push({ next, stateObj, group });
        },
        onStatusChange: (cb) => { statusCb = cb; },
        status: () => 'ready',
        debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
        dispose: () => {},
      };
    };

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function RayHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'decision' } });
      latestState = toolData.lifeSkills;
      return cfg.render(makeCtx({ toolData, setToolData }));
    }
    React.act(() => { root.render(React.createElement(RayHarness)); });

    try {
      expect(orbitConfigs[0]?.env).toBe(true);
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="decision"]');
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="decision"]');
      const stressBtn = bay.querySelector('[data-lifeskills-3d-hazard="decision"]');
      expect(stressBtn).toBeTruthy();
      expect(stressBtn.getAttribute('aria-pressed')).toBe('false');

      // WebGL callout pills are interactive buttons and select parts cleanly
      const pill = bay.querySelector('[data-lifeskills-3d-pill="regret_guardrail"]');
      expect(pill).toBeTruthy();
      React.act(() => { pill.click(); });
      expect(latestState.ls3dSel_decision).toBe('regret_guardrail');

      // Tap (< 5px travel) on WebGL viewport uses THREE.Raycaster to pick forward_ev_spire
      const EvCtor = window.PointerEvent || window.MouseEvent;
      React.act(() => {
        viewport.dispatchEvent(new EvCtor('pointerdown', { bubbles: true, clientX: 160, clientY: 110, button: 0 }));
        viewport.dispatchEvent(new EvCtor('pointerup', { bubbles: true, clientX: 161, clientY: 111, button: 0 }));
      });
      expect(latestState.ls3dSel_decision).toBe('forward_ev_spire');
      expect(latestState.ls3dExplored_decision?.forward_ev_spire).toBe(1);

      // Drag (>= 5px travel) orbits without triggering a mesh pick
      pickedTarget.current = 'safe_baseline_pier';
      const rotBeforeDrag = latestState.ls3dRotY_decision ?? -32;
      React.act(() => {
        viewport.dispatchEvent(new EvCtor('pointerdown', { bubbles: true, clientX: 160, clientY: 110, button: 0 }));
        viewport.dispatchEvent(new EvCtor('pointermove', { bubbles: true, clientX: 210, clientY: 110, button: 0 }));
        viewport.dispatchEvent(new EvCtor('pointerup', { bubbles: true, clientX: 210, clientY: 110, button: 0 }));
      });
      expect(latestState.ls3dRotY_decision).not.toBe(rotBeforeDrag);
      expect(latestState.ls3dSel_decision).toBe('forward_ev_spire');

      // Stress Test mode (button + SVG fallback check in non-ready clone below + WebGL stress ring)
      React.act(() => { stressBtn.click(); });
      expect(stressBtn.getAttribute('aria-pressed')).toBe('true');
      expect(bay.querySelector('[data-lifeskills-3d-stress-banner="decision"]')).toBeTruthy();
      const stressBuild = buildHistory[buildHistory.length - 1];
      expect(stressBuild.next.stressTest).toBe(true);
      expect(stressBuild.group.children.some((ch) => ch.userData?.isStressRing)).toBe(true);

      // '0' resets Stress Test off, 'h' toggles Stress Test back on
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(stressBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'h', bubbles: true })); });
      expect(stressBtn.getAttribute('aria-pressed')).toBe('true');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }

    // Verify SVG fallback Stress-Test diamond adds zero extra <circle> elements
    activeMount = mountInteractiveLifeSkills({ tab: 'decision' });
    const svgBay = activeMount.host.querySelector('[data-lifeskills-3d-bay="decision"]');
    const circleBaseline = svgBay.querySelectorAll('svg circle').length;
    React.act(() => { svgBay.querySelector('[data-lifeskills-3d-hazard="decision"]').click(); });
    expect(svgBay.textContent).toContain('STRESS TEST MODE:');
    expect(svgBay.querySelector('[data-lifeskills-3d-hazard-diamond]')).toBeTruthy();
    expect(svgBay.querySelectorAll('svg circle').length).toBe(circleBaseline);
  });

  it('mounts Records, Interview Offer Comp, and Meds Half-Life simulators with cross-tab sync and Overview fault-quiz rollup', () => {
    // 1. Records Identity Exposure & Statutory Retention -> recordPlanNote + badges
    activeMount = mountInteractiveLifeSkills({ tab: 'records', recPlainCloudDocs: 3, recTaxYearsKept: 4, recCreditFreeze: true, recVaultMfa: true, recShredMail: false });
    const recSim = activeMount.host.querySelector('[data-lifeskills-records-risk-sim="true"]');
    expect(recSim).toBeTruthy();
    expect(recSim.textContent).toContain('Zero-Trust Ready (17/100 risk)');
    expect(recSim.textContent).toContain('3-Yr Min Met');
    activeMount.clickButton('Insert Zero-Trust Hardening Step into Paperwork Plan');
    expect(activeMount.getState().recordPlanNote).toContain('17/100');
    expect(activeMount.getState().badges?.recordsReady).toBeTruthy();
    expect(activeMount.getState().badges?.formNavigator).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 2. Interview Studio Total Job Offer Comparator -> Paycheck & Budget Transportation sync
    activeMount = mountInteractiveLifeSkills({ tab: 'interviewstudio', offAHourly: 20, offACommMin: 30, offATransMo: 75, offABenMo: 180, offBHourly: 22, offBCommMin: 95, offBTransMo: 260, offBBenMo: -40 });
    const compSim = activeMount.host.querySelector('[data-lifeskills-offer-comp-sim="true"]');
    expect(compSim).toBeTruthy();
    expect(compSim.textContent).toContain('Offer A Wins');
    activeMount.clickButton('Sync Winning Offer');
    expect(activeMount.getState().payRate).toBe(20);
    expect(activeMount.getState().budgetExp?.Transportation).toBe(75);
    expect(activeMount.getState().badges?.interviewReady).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 3. Meds Exponential Half-Life Clearance & Refill Runway -> medQuestionNote + badges
    activeMount = mountInteractiveLifeSkills({ tab: 'meds', medHlDoseMg: 500, medHlHalfLifeHr: 6, medHlIntervalHr: 4, medHlPillsLeft: 8, medHlDosesDay: 2 });
    const hlSim = activeMount.host.querySelector('[data-lifeskills-med-halflife-sim="true"]');
    expect(hlSim).toBeTruthy();
    expect(hlSim.textContent).toContain('Early-Dose Stacking Alert');
    expect(hlSim.textContent).toContain('Request refill now');
    activeMount.clickButton('Add Spacing & Refill Check to Pharmacist Question');
    expect(activeMount.getState().medQuestionNote).toContain('4 days supply remaining');
    expect(activeMount.getState().badges?.doseSafety).toBeTruthy();
    expect(activeMount.getState().badges?.medLabelReader).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Overview Fault-Quiz Rollup pill & Readiness Export count
    activeMount = mountInteractiveLifeSkills({
      tab: 'overview',
      ls3dQuizSolved_decision: { criteria_fulcrum: 1, weighted_beam: 1 },
      ls3dQuizSolved_meds: { active: 1 },
    });
    const faultPill = activeMount.host.querySelector('[data-lifeskills-3d-fault-rollup="true"]');
    expect(faultPill?.textContent).toContain('3/180 faults diagnosed');
    const summaryPre = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"] pre');
    expect(summaryPre?.textContent).toContain('3D Fault Quizzes Diagnosed: 3/180 faults');
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Wave 12 — 3D Cutaway Slice, Live Pulse S.tick Turntable, Next-Fault Launcher & DIY/HVAC/Spaced-Retention Simulators', () => {
  function makeWave12MockThree() {
    class Vec3 {
      constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
      set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    }
    class Obj3D {
      constructor() {
        this.children = [];
        this.position = new Vec3();
        this.rotation = new Vec3();
        this.scale = new Vec3(1, 1, 1);
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
      MeshPhongMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
      MeshLambertMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
      MeshBasicMaterial: function(opts) {
        this.transparent = false;
        this.opacity = 1;
        this.wireframe = false;
        this.needsUpdate = false;
        Object.assign(this, opts || {});
      },
    };
  }

  afterEach(() => {
    if (activeMount) {
      activeMount.unmount();
      activeMount = null;
    }
    resetStemLab();
  });

  it('computes DIY break-even + hazard lockout, HVAC setback/filter penalties, and Ebbinghaus spaced retrieval curves accurately', () => {
    const h = loadPureSteamHelpers();

    // 1. DIY vs. Contractor Break-Even & High-Hazard Lockout
    const diySafe = h.calcDiyVsContractorBreakEven(420, 55, 60, 4, 3, 15, 'none');
    expect(diySafe.isHighHazard).toBe(false);
    expect(diySafe.amortizedToolCost).toBe(15);
    expect(diySafe.redoExpectedCost).toBeCloseTo(67.13, 2);
    expect(diySafe.expectedDiyCost).toBeCloseTo(137.13, 2);
    expect(diySafe.expectedNetSavings).toBeCloseTo(282.87, 2);
    expect(diySafe.implicitHourlyWage).toBeCloseTo(94.29, 2);
    expect(diySafe.recommendation).toContain('DIY Wins');

    const diyGas = h.calcDiyVsContractorBreakEven(420, 55, 60, 4, 3, 15, 'gas');
    expect(diyGas.isHighHazard).toBe(true);
    expect(diyGas.recommendation).toContain('Hire Licensed Pro');
    expect(diyGas.monthlyRepairReserve).toBe(70);

    // 2. Smart Thermostat Setback & Filter Static-Pressure Penalty
    const hvacBad = h.calcThermostatSetbackAndFilterPenalty(180, 6, 8, 9, true);
    expect(hvacBad.setbackSavingsPct).toBe(6);
    expect(hvacBad.filterPenaltyPct).toBe(15);
    expect(hvacBad.parasiticFanKwhMo).toBe(168);
    expect(hvacBad.parasiticFanCostMo).toBeCloseTo(26.88, 2);
    expect(hvacBad.modeledMonthlyBill).toBeCloseTo(221.46, 2);
    expect(hvacBad.optimizedMonthlyBill).toBeCloseTo(165.6, 2);
    expect(hvacBad.staticPressureAlert).toBe(true);
    expect(hvacBad.filterStatus).toContain('Choked Airflow');

    // 3. Ebbinghaus Spaced Retrieval Retention
    const spaced = h.calcSpacedRetrievalRetention(14, 3, true, 8);
    expect(spaced.cramRetentionPct).toBeLessThan(10);
    expect(spaced.spacedRetentionPct).toBeGreaterThan(45);
    expect(spaced.retentionGainPct).toBeGreaterThan(40);
    expect(spaced.spacedStabilityDays).toBeGreaterThan(20);
    expect(spaced.curvePoints.length).toBe(6);

    const sleepDeprived = h.calcSpacedRetrievalRetention(14, 0, false, 5);
    expect(sleepDeprived.spacedStabilityDays).toBeLessThan(2);
    expect(sleepDeprived.spacedRetentionPct).toBeLessThan(5);
  });

  it('supports 3D Cutaway Slice (K, WebGL Z=0.35 plane, zero extra SVG circles) and Live Pulse S.tick turntable with reduced-motion guard (P, 0 reset)', () => {
    const mockThree = makeWave12MockThree();
    const builds = [];
    const origMatchMedia = window.matchMedia;
    let reducedMotionEnabled = false;
    window.matchMedia = (query) => ({
      matches: reducedMotionEnabled && String(query).includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave12ViewerHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'homesys' } });
      return cfg.render(makeCtx({ toolData, setToolData }));
    }
    React.act(() => { root.render(React.createElement(Wave12ViewerHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="homesys"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[role="application"]');
      const cutBtn = bay.querySelector('[data-lifeskills-3d-cutaway="homesys"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="homesys"]');
      expect(cutBtn).toBeTruthy();
      expect(pulseBtn).toBeTruthy();
      expect(builds[builds.length - 1].next.static).toBe(true);

      // Enable Cutaway via button
      React.act(() => { cutBtn.click(); });
      expect(cutBtn.getAttribute('aria-pressed')).toBe('true');
      expect(bay.querySelector('[data-lifeskills-3d-cutaway-plane="homesys"]')).toBeTruthy();
      expect(bay.textContent).toContain('CROSS-SECTION CUTAWAY: Z=0.35 PLANE');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const cutBuild = builds[builds.length - 1];
      expect(cutBuild.next.cutaway).toBe(true);
      const cutPlaneMesh = cutBuild.children.find((m) => m.userData?.isCutawayPlane);
      expect(cutPlaneMesh).toBeTruthy();
      expect(cutPlaneMesh.userData?.partId).toBeFalsy();
      const frontClipped = cutBuild.children.filter((m) => m.userData?.isCutawayClipped);
      expect(frontClipped.length).toBeGreaterThanOrEqual(2);
      expect(frontClipped[0].scale.z).toBeCloseTo(0.38, 2);
      expect(frontClipped[0].material.opacity).toBeLessThanOrEqual(0.38);

      // Toggle Cutaway off and back on via keyboard 'k' / 'K'
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', bubbles: true })); });
      expect(cutBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'K', bubbles: true })); });
      expect(cutBtn.getAttribute('aria-pressed')).toBe('true');

      // Enable Live Pulse via button -> non-static S.tick smoothly orbits rotY & modulates halo scale
      React.act(() => { pulseBtn.click(); });
      expect(pulseBtn.getAttribute('aria-pressed')).toBe('true');
      expect(bay.querySelector('[data-lifeskills-3d-pulse-wave="homesys"]')).toBeTruthy();
      expect(bay.textContent).toContain('LIVE PULSE TELEMETRY: ACTIVE');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const pulseBuild = builds[builds.length - 1];
      expect(pulseBuild.next.livePulse).toBe(true);
      expect(pulseBuild.next.static).toBe(false);
      expect(typeof pulseBuild.S.tick).toBe('function');

      const startRotY = pulseBuild.S.rotY;
      const haloMesh = pulseBuild.children.find((m) => m.userData?.isSelectHalo);
      expect(haloMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1500);
      expect(pulseBuild.S.rotY - startRotY).toBeCloseTo(6, 2);
      expect(haloMesh.scale.x).not.toBe(1);

      // Hotkey '0' resets both Cutaway and Live Pulse
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(cutBtn.getAttribute('aria-pressed')).toBe('false');
      expect(pulseBtn.getAttribute('aria-pressed')).toBe('false');

      // Prefers-reduced-motion forces static: true even when P toggles Live Pulse on
      reducedMotionEnabled = true;
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'p', bubbles: true })); });
      expect(pulseBtn.getAttribute('aria-pressed')).toBe('true');
      expect(bay.textContent).toContain('LIVE PULSE: PAUSED (REDUCED MOTION)');
      expect(builds[builds.length - 1].next.static).toBe(true);
    } finally {
      window.matchMedia = origMatchMedia;
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('provides Overview Next-Fault Quick-Launcher and connects DIY Break-Even, Thermostat/Filter & Spaced-Retention simulators across tabs', () => {
    // 1. Overview Next-Fault Quick-Launcher while keeping [data-lifeskills-inline-3d-bays="true"] button count at 30
    activeMount = mountInteractiveLifeSkills({
      tab: 'overview',
      ls3dQuizSolved_homesys: { roof: 1, wall: 1, seal: 1, hvac: 1, duct: 1, panel: 1 },
      ls3dQuizSolved_science: { breaker: 1 },
    });
    expect(activeMount.host.querySelectorAll('[data-lifeskills-inline-3d-bays="true"] button').length).toBe(30);
    const nextLauncher = activeMount.host.querySelector('[data-lifeskills-3d-diagnostic-launcher="true"]');
    expect(nextLauncher).toBeTruthy();
    expect(nextLauncher.textContent).toContain('7/180 faults solved');
    const launchBtn = activeMount.host.querySelector('[data-lifeskills-launch-next-fault="true"]');
    expect(launchBtn?.textContent).toContain('Circuit & Pressure');
    React.act(() => { launchBtn.click(); });
    expect(activeMount.getState().tab).toBe('science');
    expect(activeMount.getState().ls3dQuizOn_science).toBe(true);
    expect(activeMount.getState().ls3dQuizIdx_science).toBe(1);
    activeMount.unmount();
    activeMount = null;

    // 2. Home Repair DIY vs. Licensed Pro Break-Even -> Budget Emergency Fund + badges & Hazard Lockout
    activeMount = mountInteractiveLifeSkills({ tab: 'homerepair', diyQuote: 420, diyParts: 55, diyTools: 60, diyReuse: 4, diyHours: 3, diyRedoRisk: 15, diyHazard: 'none' });
    const diySim = activeMount.host.querySelector('[data-lifeskills-diy-breakeven-sim="true"]');
    expect(diySim).toBeTruthy();
    expect(diySim.textContent).toContain('DIY Wins');
    activeMount.clickButton('Sync 6-Month Repair Reserve');
    expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBe(19);
    expect(activeMount.getState().badges?.handyman).toBeTruthy();
    expect(activeMount.getState().badges?.saver).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.clickButton('Gas Line / Combustion');
    expect(diySim.textContent).toContain('Hire Licensed Pro');
    activeMount.unmount();
    activeMount = null;

    // 3. Home Systems Smart Thermostat Setback & Filter Penalty -> Budget Utilities + homeExpert & budgeteer
    activeMount = mountInteractiveLifeSkills({ tab: 'homesys', hvacBaseBill: 180, hvacSetbackDeg: 6, hvacSetbackHrs: 8, hvacFilterMos: 9, hvacFanOn: true });
    const hvacSim = activeMount.host.querySelector('[data-lifeskills-thermostat-filter-sim="true"]');
    expect(hvacSim).toBeTruthy();
    expect(hvacSim.textContent).toContain('+15%');
    expect(hvacSim.textContent).toContain('168 kWh/mo');
    activeMount.clickButton('Sync Tuned HVAC Target');
    expect(activeMount.getState().budgetExp?.Utilities).toBe(166);
    expect(activeMount.getState().hvacFilterMos).toBe(1);
    expect(activeMount.getState().hvacFanOn).toBe(false);
    expect(activeMount.getState().badges?.homeExpert).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Challenge Ebbinghaus Spaced Retrieval -> Time Plan + Learn filter jump
    activeMount = mountInteractiveLifeSkills({
      tab: 'challenge',
      spDays: 14,
      spReviews: 3,
      spActiveRecall: true,
      spSleepHrs: 8,
      learnRead: { 'Understanding Taxes': 1 },
    });
    const spSim = activeMount.host.querySelector('[data-lifeskills-spaced-retention-sim="true"]');
    expect(spSim).toBeTruthy();
    expect(spSim.textContent).toContain('54%');
    activeMount.clickButton('Save Spaced Review Cadence to Time Plan');
    expect(activeMount.getState().timePlanNote).toContain('Spaced Retrieval Cadence: 3 active-recall reviews');
    expect(activeMount.getState().badges?.timePlanner).toBeTruthy();
    expect(activeMount.getState().badges?.taskNavigator).toBeTruthy();
    const openLearnBtn = activeMount.host.querySelector('[data-lifeskills-spaced-open-learn="true"]');
    expect(openLearnBtn).toBeTruthy();
    React.act(() => { openLearnBtn.click(); });
    expect(activeMount.getState().tab).toBe('learn');
    expect(activeMount.getState().learnFilter).toBe('Critical Thinking with Data');
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 12', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

function makeWave13MockThree() {
  class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  }
  class Obj3D {
    constructor() {
      this.children = [];
      this.position = new Vec3();
      this.rotation = new Vec3();
      this.scale = new Vec3(1, 1, 1);
      this.userData = {};
    }
    add(child) {
      this.children.push(child);
      return this;
    }
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
    MeshPhongMaterial: function(opts) {
      this.transparent = false;
      this.opacity = 1;
      this.wireframe = false;
      this.needsUpdate = false;
      Object.assign(this, opts || {});
    },
    MeshLambertMaterial: function(opts) {
      this.transparent = false;
      this.opacity = 1;
      this.wireframe = false;
      this.needsUpdate = false;
      Object.assign(this, opts || {});
    },
    MeshBasicMaterial: function(opts) {
      this.transparent = false;
      this.opacity = 1;
      this.wireframe = false;
      this.needsUpdate = false;
      Object.assign(this, opts || {});
    },
  };
}

describe('Life Skills Lab Wave 13 (v5.31) — Verify-Fix 3D Tour, Tornado/ETF/Dental/Shield Simulators, 9-Domain AAC & Readiness Heatmap', () => {
  afterEach(() => {
    if (activeMount) {
      activeMount.unmount();
      activeMount = null;
    }
    vi.restoreAllMocks();
  });

  it('validates Wave 13 pure STEAM math helpers (Dental delay, Decision weight flip, Contract ETF break-even, Battle shield)', () => {
    const h = loadPureSteamHelpers();

    // 1. Dental Preventive vs Delay + Annual Max Cap Breach
    const dentalWithin = h.calcDentalPreventiveVsDelayCost(2, 220, 2650, 50, 1500, 100, 80, 50);
    expect(dentalWithin.earlyTotalOop).toBe(84);
    expect(dentalWithin.breachedAnnualMax).toBe(false);
    expect(dentalWithin.monthlyDentalReserve).toBeGreaterThanOrEqual(5);

    const dentalBreached = h.calcDentalPreventiveVsDelayCost(2, 220, 2650, 50, 1000, 100, 80, 50);
    expect(dentalBreached.breachedAnnualMax).toBe(true);
    expect(dentalBreached.annualMaxBreachDollars).toBe(300);
    expect(dentalBreached.delayedTotalOop).toBe(1650);
    expect(dentalBreached.oopPenaltyFromDelay).toBe(1566);

    // 2. Decision Matrix Weight Sensitivity & Flip Detection
    const sensFlip = h.calcDecisionWeightSensitivity(
      ['Option A', 'Option B'],
      [{ name: 'Cost', weight: 3 }, { name: 'Quality', weight: 2 }],
      { '0-0': 5, '0-1': 2, '1-0': 2, '1-1': 5 }
    );
    expect(sensFlip.winner).toBe('Option A');
    expect(sensFlip.closestFlip).toBeTruthy();
    expect(sensFlip.closestFlip.criterionIndex).toBe(0);
    expect(sensFlip.closestFlip.flipsAtWeight).toBe(1);
    expect(sensFlip.closestFlip.newWinner).toBe('Option B');
    expect(sensFlip.isRobust).toBe(false);

    const sensRobust = h.calcDecisionWeightSensitivity(
      ['Option A', 'Option B'],
      [{ name: 'Cost', weight: 3 }, { name: 'Quality', weight: 2 }],
      { '0-0': 5, '0-1': 5, '1-0': 2, '1-1': 2 }
    );
    expect(sensRobust.closestFlip).toBeNull();
    expect(sensRobust.isRobust).toBe(true);

    // 3. Contract Early Termination vs Switch Break-Even
    const switchNow = h.calcEarlyTerminationVsSwitchBreakEven(95, 45, 10, 180, 25);
    expect(switchNow.monthlySavings).toBe(50);
    expect(switchNow.upfrontExitTotal).toBe(205);
    expect(switchNow.breakEvenMonths).toBe(4.1);
    expect(switchNow.netTermSavings).toBe(295);
    expect(switchNow.breaksEvenBeforeTermEnd).toBe(true);
    expect(switchNow.recommendation).toBe('switch-now');

    const waitTerm = h.calcEarlyTerminationVsSwitchBreakEven(95, 45, 2, 180, 25);
    expect(waitTerm.netTermSavings).toBe(-105);
    expect(waitTerm.recommendation).toBe('wait-for-term-end');

    // 4. Battle Mastery Shield & Attack Bonus
    const unforged = h.calcBattleMasteryShieldAndDebrief(0, 29, 0, 0, 0);
    expect(unforged.bonusShieldHP).toBe(0);
    expect(unforged.critBonusDmg).toBe(0);
    expect(unforged.shieldTier).toBe('unforged');

    const platinum = h.calcBattleMasteryShieldAndDebrief(29, 29, 18, 66, 10);
    expect(platinum.bonusShieldHP).toBe(35);
    expect(platinum.critBonusDmg).toBe(9);
    expect(platinum.shieldTier).toBe('platinum-aegis');
  });

  it('supports 3D Verify Fix (M, mutual override with H, emerald shield & zero extra SVG circles) and Guided 1->6 Tour ([ / ], Auto-Read with quiz masking)', () => {
    const mockThree = makeWave13MockThree();
    const builds = [];
    const origSpeech = window.speechSynthesis;
    const origUtterance = window.SpeechSynthesisUtterance;
    const origMatchMedia = window.matchMedia;
    const spoken = [];
    window.matchMedia = () => ({ matches: false, media: '', addEventListener: () => {}, removeEventListener: () => {} });
    window.SpeechSynthesisUtterance = function(text) { this.text = text; };
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn((utt) => spoken.push(utt.text)) };

    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave13ViewerHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'homesys' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave13ViewerHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="homesys"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="homesys"]');
      const mitBtn = bay.querySelector('[data-lifeskills-3d-mitigate="homesys"]');
      const hazBtn = bay.querySelector('[data-lifeskills-3d-hazard="homesys"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="homesys"]');
      const tourEl = bay.querySelector('[data-lifeskills-3d-tour="homesys"]');
      const tourNext = bay.querySelector('[data-lifeskills-3d-tour-next="homesys"]');
      const tourPrev = bay.querySelector('[data-lifeskills-3d-tour-prev="homesys"]');
      const tourAuto = bay.querySelector('[data-lifeskills-3d-tour-autoread="homesys"]');
      const quizToggle = bay.querySelector('[data-lifeskills-3d-quiz-toggle="homesys"]');

      expect(mitBtn).toBeTruthy();
      expect(tourEl.textContent).toContain('Tour Step 1/6');

      // Enable Verify Fix via button -> emerald torus ring, SVG polygon shield, emerald guide banner, zero extra <circle>
      React.act(() => { mitBtn.click(); });
      expect(mitBtn.getAttribute('aria-pressed')).toBe('true');
      expect(bay.querySelector('[data-lifeskills-3d-mitigate-shield]')).toBeTruthy();
      expect(bay.querySelector('[data-lifeskills-3d-mitigate-banner="homesys"]')).toBeTruthy();
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const mitBuild = builds[builds.length - 1];
      expect(mitBuild.next.mitigate).toBe(true);
      const mitRing = mitBuild.children.find((m) => m.userData?.isMitigateRing);
      expect(mitRing).toBeTruthy();

      // Live Pulse modulates isMitigateRing scale too
      React.act(() => { pulseBtn.click(); });
      const pulseMitBuild = builds[builds.length - 1];
      const pulseRing = pulseMitBuild.children.find((m) => m.userData?.isMitigateRing);
      pulseMitBuild.S.tick(1000);
      pulseMitBuild.S.tick(1350);
      expect(pulseRing.scale.x).not.toBe(1);

      // Mutual override: H clears mitigate; M clears hazard; 0 resets mitigate
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'h', bubbles: true })); });
      expect(hazBtn.getAttribute('aria-pressed')).toBe('true');
      expect(mitBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'm', bubbles: true })); });
      expect(mitBtn.getAttribute('aria-pressed')).toBe('true');
      expect(hazBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(mitBtn.getAttribute('aria-pressed')).toBe('false');

      // Guided Tour 1->6 wrapping + Auto-Read + Fault Quiz masking
      React.act(() => { tourAuto.click(); });
      expect(tourAuto.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { tourNext.click(); });
      expect(tourEl.textContent).toContain('Tour Step 2/6');
      expect(spoken[spoken.length - 1]).toContain('Step 2 of 6:');
      expect(spoken[spoken.length - 1]).toContain('Check:');

      // Wrap backwards 2 -> 1 -> 6 via '[' hotkey, then forwards 6 -> 1 via ']'
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '[', bubbles: true })); });
      expect(tourEl.textContent).toContain('Tour Step 1/6');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '[', bubbles: true })); });
      expect(tourEl.textContent).toContain('Tour Step 6/6');

      // Turn Fault Quiz On -> target part is part #1 (idx 0), stepping ']' into step 1/6 masks risk/check
      React.act(() => { quizToggle.click(); });
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: ']', bubbles: true })); });
      expect(tourEl.textContent).toContain('Tour Step 1/6');
      expect(spoken[spoken.length - 1]).toContain('Fault Quiz active: match the reported symptom prompt.');
      expect(spoken[spoken.length - 1]).not.toContain('Check:');

      // Prev button wraps 1 -> 6 cleanly
      React.act(() => { tourPrev.click(); });
      expect(tourEl.textContent).toContain('Tour Step 6/6');
    } finally {
      window.matchMedia = origMatchMedia;
      window.speechSynthesis = origSpeech;
      window.SpeechSynthesisUtterance = origUtterance;
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('renders 5-domain Readiness Heatmap on Start Here while preserving exact 30 inline 3D bay buttons and jumping via Practice Next Gap', () => {
    activeMount = mountInteractiveLifeSkills({
      tab: 'overview',
      learnRead: { 'Understanding Taxes': true },
    });
    const bayButtons = activeMount.host.querySelectorAll('[data-lifeskills-inline-3d-bays="true"] button');
    expect(bayButtons.length).toBe(30);

    const heatmap = activeMount.host.querySelector('[data-lifeskills-domain-heatmap="true"]');
    expect(heatmap).toBeTruthy();
    const domCards = heatmap.querySelectorAll('[data-lifeskills-heatmap-domain]');
    expect([...domCards].map((el) => el.getAttribute('data-lifeskills-heatmap-domain'))).toEqual(['money', 'career', 'health', 'home', 'food']);

    const practiceGapBtn = heatmap.querySelector('[data-lifeskills-practice-next-gap="true"]');
    expect(practiceGapBtn).toBeTruthy();
    React.act(() => { practiceGapBtn.click(); });
    expect(activeMount.getState().tab).not.toBe('overview');
  });

  it('wires Decision Tornado Flip, Contract ETF + Budget sync, Dental Delay + Cap Alert + Budget sync, and 6 new AAC quick strips', () => {
    // 1. Decision Weight Sensitivity & 1-click flip weight
    activeMount = mountInteractiveLifeSkills({
      tab: 'decision',
      dmOptions: ['Option A', 'Option B'],
      dmCriteria: [{ name: 'Cost', weight: 3 }, { name: 'Quality', weight: 2 }],
      dmScores: { '0-0': 5, '0-1': 2, '1-0': 2, '1-1': 5 },
    });
    const tornado = activeMount.host.querySelector('[data-lifeskills-weight-tornado-sim="true"]');
    expect(tornado).toBeTruthy();
    expect(tornado.textContent).toContain('Leader: Option A');
    const flipBtn = tornado.querySelector('[data-lifeskills-apply-flip-weight="true"]');
    expect(flipBtn).toBeTruthy();
    React.act(() => { flipBtn.click(); });
    expect(activeMount.getState().dmCriteria[0].weight).toBe(1);
    expect(activeMount.getState().decisionFlipMsg).toContain('Option B');
    expect(activeMount.getState().badges?.decisionPro).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 2. Contract AAC + ETF Switch Break-Even + Budget Subscriptions sync
    activeMount = mountInteractiveLifeSkills({ tab: 'contract' });
    const contractAacBtn = activeMount.host.querySelector('[data-lifeskills-aac-strip="contract"] button');
    expect(contractAacBtn).toBeTruthy();
    React.act(() => { contractAacBtn.click(); });
    expect(activeMount.getState().crLastNote.length).toBeGreaterThan(5);

    const etfSim = activeMount.host.querySelector('[data-lifeskills-etf-switch-sim="true"]');
    expect(etfSim).toBeTruthy();
    expect(etfSim.textContent).toContain('4.1 mo');
    React.act(() => { etfSim.querySelector('[data-lifeskills-etf-sync-budget="true"]').click(); });
    expect(activeMount.getState().budgetExp?.Subscriptions).toBe(45);
    expect(activeMount.getState().contractEtfSyncMsg).toContain('Budget Subscriptions');
    expect(activeMount.getState().badges?.trapFinder).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 3. Dental AAC + Preventive vs Delay Cap Breach + Budget Emergency Fund sync
    activeMount = mountInteractiveLifeSkills({ tab: 'dental', dentalAnnualMax: 1000 });
    const dentalAacBtn = activeMount.host.querySelector('[data-lifeskills-aac-strip="dental"] button');
    expect(dentalAacBtn).toBeTruthy();
    React.act(() => { dentalAacBtn.click(); });
    expect(activeMount.getState().dentalScriptMsg.length).toBeGreaterThan(5);

    const dentalSim = activeMount.host.querySelector('[data-lifeskills-dental-delay-sim="true"]');
    expect(dentalSim).toBeTruthy();
    expect(dentalSim.textContent).toContain('Cap Breached');
    React.act(() => { dentalSim.querySelector('[data-lifeskills-dental-sync-budget="true"]').click(); });
    expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBe(7);
    expect(activeMount.getState().dentalDelaySyncMsg).toContain('Emergency Fund');
    expect(activeMount.getState().badges?.dentalReady).toBeTruthy();
    expect(activeMount.getState().badges?.toothTriage).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Remaining 4 new AAC tabs: workreadiness, interviewstudio, meds, homesafety
    const aacTargets = [
      { tab: 'workreadiness', keys: ['workPlanNote'] },
      { tab: 'interviewstudio', keys: ['interviewRehearsalNote', 'interviewInput'] },
      { tab: 'meds', keys: ['medQuestionNote'] },
      { tab: 'homesafety', keys: ['homePlanNote'] },
    ];
    for (const target of aacTargets) {
      activeMount = mountInteractiveLifeSkills({ tab: target.tab });
      const stripBtn = activeMount.host.querySelector(`[data-lifeskills-aac-strip="${target.tab}"] button`);
      expect(stripBtn).toBeTruthy();
      React.act(() => { stripBtn.click(); });
      for (const k of target.keys) {
        expect(String(activeMount.getState()[k] || '').length).toBeGreaterThan(5);
      }
      activeMount.unmount();
      activeMount = null;
    }
  });

  it('powers Battle Mastery Shield armor absorption + Missed-Boss Debrief and Learn Self-Check Flashcards', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const read18 = {};
    for (let i = 1; i <= 18; i++) read18['Topic ' + i] = true;
    const badges9 = {};
    for (let i = 1; i <= 9; i++) badges9['b' + i] = Date.now();

    activeMount = mountInteractiveLifeSkills({
      tab: 'battle',
      learnRead: read18,
      badges: badges9,
      ls3dQuizSolved_homesys: {
        roof: 1,
        wall: 1,
        seal: 1,
        hvac: 1,
        duct: 1,
        panel: 1,
      },
      chalStreak: 4,
    });
    const shieldCard = activeMount.host.querySelector('[data-lifeskills-battle-mastery-shield="true"]');
    expect(shieldCard).toBeTruthy();
    expect(shieldCard.textContent).toContain('Shield Armor: 14 / 14 HP');
    expect(shieldCard.textContent).toContain('Hit Bonus: +5');
    expect(activeMount.getState().battlePlayerHP).toBeUndefined(); // not mutated yet

    activeMount.clickButton('Start Battle');
    expect(activeMount.getState().battlePlayerHP).toBe(100);
    expect(activeMount.getState().battleShieldHP).toBe(14);

    // Wrong answer: 15 enemyDmg -> Shield absorbs 14, HP drops by only 1 (to 99), debrief logs missed item
    activeMount.setInputByAriaLabel('Answer to battle question', 'zzz-definitely-wrong');
    activeMount.clickButton('Attack!');
    expect(activeMount.getState().battleShieldHP).toBe(0);
    expect(activeMount.getState().battlePlayerHP).toBe(99);
    expect(activeMount.getState().battleMissedLog.length).toBe(1);

    const debrief = activeMount.host.querySelector('[data-lifeskills-battle-debrief="true"]');
    expect(debrief).toBeTruthy();
    activeMount.clickButton('Review in Learn');
    expect(activeMount.getState().tab).toBe('learn');
    activeMount.unmount();
    activeMount = null;

    // Learn Active-Recall Self-Check Flashcard
    activeMount = mountInteractiveLifeSkills({ tab: 'learn' });
    const toggleBtn = activeMount.host.querySelector('[data-lifeskills-learn-flashcard-toggle="paycheck"]');
    expect(toggleBtn).toBeTruthy();
    React.act(() => { toggleBtn.click(); });
    const card = activeMount.host.querySelector('[data-lifeskills-learn-flashcard="paycheck"]');
    expect(card).toBeTruthy();
    const rightOpt = [...card.querySelectorAll('button')].find((b) => b.textContent.includes('$14,600'));
    expect(rightOpt).toBeTruthy();
    React.act(() => { rightOpt.click(); });
    expect(card.textContent).toContain('Correct!');
    expect(activeMount.getState().learnRead?.['Understanding Taxes']).toBe(true);
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 13 (v5.31)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.3[1-9]/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 14 (v5.32) — 3D Measure Caliper, 4 STEAM Simulators, 15-Domain AAC & Learn Mastery Loop', () => {
  let activeMount = null;

  afterEach(() => {
    if (activeMount) {
      activeMount.unmount();
      activeMount = null;
    }
    vi.restoreAllMocks();
  });

  it('computes pure Wave 14 STEAM models (cleaner reaction chemistry/CFM clearance, attention residue/Pomodoro, care setting No Surprises Act, NIOSH 3-dB noise dose/NRR)', () => {
    const h = loadPureSteamHelpers();

    // 1. Cleaner Mix & pH Neutralization Chemistry
    const bleachAmmonia = h.calcCleanerMixAndPhNeutralization('bleach', 'ammonia', 50, 5);
    expect(bleachAmmonia.toxic).toBe(true);
    expect(bleachAmmonia.riskLevel).toBe('critical');
    expect(bleachAmmonia.gasProduced).toContain('Chloramine');
    expect(bleachAmmonia.safeMonthlyKitCost).toBe(12);

    const bleachVinegar = h.calcCleanerMixAndPhNeutralization('bleach', 'vinegar', 50, 5);
    expect(bleachVinegar.toxic).toBe(true);
    expect(bleachVinegar.gasProduced).toContain('Chlorine gas');

    const bakingVinegar = h.calcCleanerMixAndPhNeutralization('baking_soda', 'vinegar', 60, 5);
    expect(bakingVinegar.toxic).toBe(false);
    expect(bakingVinegar.riskLevel).toBe('safe_reaction');
    expect(bakingVinegar.resultingPh).toBe(7);

    // 2. Task-Switching Residue & Pomodoro Batching
    const residue = h.calcTaskSwitchingResidueAndPomodoro(6, 15, 6, 25);
    expect(residue.totalWorkMins).toBe(360);
    expect(residue.totalInterruptions).toBe(36);
    expect(residue.unprotectedLostMins).toBe(360);
    expect(residue.unprotectedDeepMins).toBe(0);
    expect(residue.pomodoroCount).toBe(12);
    expect(residue.protectedDeepMins).toBe(276);
    expect(residue.reclaimedDeepMins).toBe(276);

    // 3. Care-Setting Economics & No Surprises Act + Clinical Override
    const erOon = h.calcCareSettingAndNetworkCost('er', false, 500, 20, false);
    expect(erOon.noSurprisesProtected).toBe(true);
    expect(erOon.balanceBillPenalty).toBe(0);
    expect(erOon.triageOverrideActive).toBe(false);

    const urgentOon = h.calcCareSettingAndNetworkCost('urgent_care', false, 500, 20, false);
    expect(urgentOon.noSurprisesProtected).toBe(false);
    expect(urgentOon.balanceBillPenalty).toBeGreaterThan(0);

    const redFlagOverride = h.calcCareSettingAndNetworkCost('telehealth', true, 500, 20, true);
    expect(redFlagOverride.triageOverrideActive).toBe(true);
    expect(redFlagOverride.recommendedSetting).toBe('er');

    // 4. NIOSH 3-dB Noise Dose & NRR Derating
    const unprotected91 = h.calcNoiseDecibelDoseAndSafeTime(91, 2, 0);
    expect(unprotected91.effectiveDb).toBe(91);
    expect(unprotected91.safeHours).toBe(2);
    expect(unprotected91.safeMinutes).toBe(120);
    expect(unprotected91.dosePct).toBe(100);

    const protected94 = h.calcNoiseDecibelDoseAndSafeTime(94, 2, 25);
    expect(protected94.deratedReductionDb).toBe(9);
    expect(protected94.effectiveDb).toBe(85);
    expect(protected94.safeHours).toBe(8);
    expect(protected94.dosePct).toBe(25);
  });

  it('supports 3D Measure Caliper (button, D hotkey, 0 reset, WebGL isMeasureRule + Live Pulse, SVG <line> caliper with zero extra circles)', () => {
    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave14MeasureHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'homesys' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave14MeasureHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="homesys"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="homesys"]');
      const measBtn = bay.querySelector('[data-lifeskills-3d-measure="homesys"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="homesys"]');

      expect(measBtn).toBeTruthy();
      expect(measBtn.getAttribute('aria-pressed')).toBe('false');

      // Enable Measure via button -> 3 sky-blue WebGL caliper rails (partId: null), SVG caliper lines + banner, zero extra <circle>
      React.act(() => { measBtn.click(); });
      expect(measBtn.getAttribute('aria-pressed')).toBe('true');
      expect(bay.querySelector('[data-lifeskills-3d-measure-caliper]')).toBeTruthy();
      const banner = bay.querySelector('[data-lifeskills-3d-measure-banner="homesys"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Bay Envelope:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const measBuild = builds[builds.length - 1];
      expect(measBuild.next.measure).toBe(true);
      const measRails = measBuild.children.filter((m) => m.userData?.isMeasureRule);
      expect(measRails.length).toBe(3);
      for (const rail of measRails) expect(rail.userData.partId).toBeNull();

      // Live Pulse modulates isMeasureRule scale too
      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseRail = pulseBuild.children.find((m) => m.userData?.isMeasureRule);
      expect(pulseRail).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseRail.scale.x).not.toBe(1);

      // Hotkey D toggles off & back on; hotkey 0 resets measure
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'd', bubbles: true })); });
      expect(measBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'D', bubbles: true })); });
      expect(measBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(measBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('wires all 4 Wave 14 STEAM simulators + cross-tab bridges, 6 new AAC quick strips (15 domains), and Learn Self-Check Mastery Loop + Overview summary', () => {
    // 1. Science Household Cleaner Chemistry + Budget Shopping sync ($12/mo)
    activeMount = mountInteractiveLifeSkills({ tab: 'science' });
    const chemSim = activeMount.host.querySelector('[data-lifeskills-cleaner-chem-sim="true"]');
    expect(chemSim).toBeTruthy();
    expect(chemSim.textContent).toContain('Chlorine gas');
    React.act(() => { chemSim.querySelector('[data-lifeskills-chem-a="baking_soda"]').click(); });
    expect(chemSim.textContent).toContain('Neutralization');
    React.act(() => { chemSim.querySelector('[data-lifeskills-cleaner-sync-budget="true"]').click(); });
    expect(activeMount.getState().budgetExp?.Shopping).toBe(12);
    expect(activeMount.getState().sciCleanerSyncMsg).toContain('Shopping');
    expect(activeMount.getState().badges?.appliedSci).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 2. Time Management Attention-Residue & Pomodoro Save Plan
    activeMount = mountInteractiveLifeSkills({ tab: 'timemanagement' });
    const focusSim = activeMount.host.querySelector('[data-lifeskills-focus-residue-sim="true"]');
    expect(focusSim).toBeTruthy();
    React.act(() => { focusSim.querySelector('[data-lifeskills-focus-save-plan="true"]').click(); });
    expect(activeMount.getState().timePlanNote).toContain('DND focus blocks');
    expect(activeMount.getState().timeFocusSyncMsg).toContain('Pomodoro DND');
    expect(activeMount.getState().badges?.timePlanner).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 3. Appointments Care-Setting & No Surprises Simulator + Emergency Fund sync
    activeMount = mountInteractiveLifeSkills({ tab: 'appointments' });
    const careSim = activeMount.host.querySelector('[data-lifeskills-care-setting-sim="true"]');
    expect(careSim).toBeTruthy();
    React.act(() => { careSim.querySelector('[data-lifeskills-care-sync-budget="true"]').click(); });
    expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBeGreaterThanOrEqual(25);
    expect(activeMount.getState().careSettingSyncMsg).toContain('Emergency Fund');
    expect(activeMount.getState().badges?.appointmentReady).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Body Care NIOSH Decibel Dose & 1-click NRR 25 Ear Protection
    activeMount = mountInteractiveLifeSkills({ tab: 'bodycare' });
    const noiseSim = activeMount.host.querySelector('[data-lifeskills-noise-dose-sim="true"]');
    expect(noiseSim).toBeTruthy();
    React.act(() => { noiseSim.querySelector('[data-lifeskills-noise-apply-nrr="true"]').click(); });
    expect(activeMount.getState().noiseNrr).toBe(25);
    expect(activeMount.getState().bodySensorySyncMsg).toContain('NRR 25');
    expect(activeMount.getState().badges?.bodyCareReady).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 5. All 6 new AAC quick strips (15 total domains)
    const newAacTargets = [
      { tab: 'records', key: 'recordPlanNote' },
      { tab: 'timemanagement', key: 'timePlanNote' },
      { tab: 'insurance', key: 'insAacScriptMsg' },
      { tab: 'digitalsafety', key: 'digitalPlanNote' },
      { tab: 'carcare', key: 'carAacScriptMsg' },
      { tab: 'foodconfidence', key: 'foodAacScriptMsg' },
    ];
    for (const target of newAacTargets) {
      activeMount = mountInteractiveLifeSkills({ tab: target.tab });
      const stripBtn = activeMount.host.querySelector(`[data-lifeskills-aac-strip="${target.tab}"] button`);
      expect(stripBtn).toBeTruthy();
      React.act(() => { stripBtn.click(); });
      expect(String(activeMount.getState()[target.key] || '').length).toBeGreaterThan(5);
      activeMount.unmount();
      activeMount = null;
    }

    // 6. Learn Active-Recall Self-Check Mastery Bar + Practice Next Self-Check + Overview Summary
    activeMount = mountInteractiveLifeSkills({ tab: 'learn', learnCheckAnswers: { paycheck: 0 }, learnFilter: 'taxes' });
    const masteryBar = activeMount.host.querySelector('[data-lifeskills-learn-selfcheck-bar="true"]');
    expect(masteryBar).toBeTruthy();
    expect(masteryBar.textContent).toContain('1/29 active-recall self-checks passed');
    const nextCheckBtn = masteryBar.querySelector('[data-lifeskills-learn-next-flashcard="true"]');
    expect(nextCheckBtn).toBeTruthy();
    React.act(() => { nextCheckBtn.click(); });
    expect(activeMount.getState().learnFilter).toBe('');
    const openedFlashcards = activeMount.host.querySelectorAll('[data-lifeskills-learn-flashcard]');
    expect(openedFlashcards.length).toBeGreaterThanOrEqual(1);
    activeMount.unmount();
    activeMount = null;

    activeMount = mountInteractiveLifeSkills({ tab: 'overview', learnCheckAnswers: { paycheck: 0 } });
    const summaryPre = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"] pre');
    expect(summaryPre).toBeTruthy();
    expect(summaryPre.textContent).toContain('Active-Recall Self-Checks Passed: 1/29');
    expect(activeMount.host.querySelectorAll('[data-lifeskills-inline-3d-bays="true"] button').length).toBe(30);
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 14 (v5.32)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.3[2-9]/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 15 (v5.33) — 3D Plumb & Floor Grid, 4 STEAM Simulators, 21-Domain AAC & Readiness Summary', () => {
  let activeMount = null;

  afterEach(() => {
    if (activeMount) {
      activeMount.unmount();
      activeMount = null;
    }
    vi.restoreAllMocks();
  });

  it('computes pure Wave 15 STEAM models (overtime fatigue/PTO, FEMA 72h outage & egress, listening ratio/check-back, delivery markup vs batch prep) including explicit 0 arguments', () => {
    const h = loadPureSteamHelpers();

    // 1. Overtime Marginal Net Wage, NIOSH Fatigue & PTO Accrual (explicit 0 commute & 0 PTO)
    const zeroCommuteOt = h.calcOvertimeFatigueAndPtoAccrual(20, 48, 0, 22, 0);
    expect(zeroCommuteOt.otHrs).toBe(8);
    expect(zeroCommuteOt.totalDoorToDoorHrs).toBe(48);
    expect(zeroCommuteOt.annualPtoHours).toBe(0);
    expect(zeroCommuteOt.burnoutBand).toBe('elevated_fatigue');
    expect(zeroCommuteOt.fatigueRiskMultiplier).toBe(1.28);

    const sustainable36 = h.calcOvertimeFatigueAndPtoAccrual(20, 36, 0, 22, 1.54);
    expect(sustainable36.otHrs).toBe(0);
    expect(sustainable36.fatigueRiskMultiplier).toBe(1.0);
    expect(sustainable36.burnoutBand).toBe('sustainable');

    const highBurnout = h.calcOvertimeFatigueAndPtoAccrual(24, 60, 5, 22, 1.54);
    expect(highBurnout.burnoutBand).toBe('high_burnout');
    expect(highBurnout.monthlyOtCushion).toBeGreaterThanOrEqual(25);

    // 2. FEMA 72-Hr Outage Autonomy & Fire Egress Margin (explicit 0 pets, 0 water, 0 powerWh)
    const zeroStores = h.calcOutageAutonomyAndEgressMargin(3, 0, 0, 12000, 0, 65, false);
    expect(zeroStores.dailyWaterGal).toBe(3);
    expect(zeroStores.waterDays).toBe(0);
    expect(zeroStores.powerDays).toBe(0);
    expect(zeroStores.autonomyHours).toBe(0);
    expect(zeroStores.limitingFactor).toBe('water');
    expect(zeroStores.egressMarginSec).toBe(55);
    expect(zeroStores.egressSafe).toBe(true);

    const blockedExit = h.calcOutageAutonomyAndEgressMargin(3, 1, 15, 24000, 500, 100, true);
    expect(blockedExit.meetsFema72Hr).toBe(true);
    expect(blockedExit.effectiveEgressSec).toBe(135);
    expect(blockedExit.egressMarginSec).toBe(-15);
    expect(blockedExit.egressSafe).toBe(false);

    // 3. Active-Listening Ratio & Psych Safety Check-Back (explicit 0 interruptions)
    const balanced = h.calcListeningRatioAndCheckBack(55, 0, true, true, true);
    expect(balanced.talkSharePct).toBe(55);
    expect(balanced.listenSharePct).toBe(45);
    expect(balanced.interruptionsCount).toBe(0);
    expect(balanced.psychologicalSafetyScore).toBe(100);
    expect(balanced.dialogueBalanceBand).toBe('balanced_turn_taking');

    const overload = h.calcListeningRatioAndCheckBack(80, 4, false, false, false);
    expect(overload.dialogueBalanceBand).toBe('monologue_overload');
    expect(overload.psychologicalSafetyScore).toBe(10);
    expect(overload.misunderstandingRiskPct).toBeGreaterThanOrEqual(80);

    // 4. App Delivery Markup vs Batch Meal-Prep Chemistry (explicit 0 markup & 0 fees/tip)
    const noAppFee = h.calcDeliveryMarkupVsBatchPrep(4, 15, 0, 0, 16);
    expect(noAppFee.deliveryCostPerMeal).toBe(15);
    expect(noAppFee.homeCostPerMeal).toBe(4.15);

    const typDelivery = h.calcDeliveryMarkupVsBatchPrep(4, 15, 18, 9.5, 16);
    expect(typDelivery.deliveryCostPerMeal).toBe(27.2);
    expect(typDelivery.markupMultiplier).toBe(6.6);
    expect(typDelivery.monthlySavings).toBeGreaterThan(0);
    expect(typDelivery.annualSavings).toBe(typDelivery.monthlySavings * 12);
    expect(typDelivery.weeklySodiumSavedMg).toBe(3320);
  });

  it('supports All-30 3D Bays Plumb Grid (button, G hotkey, 0 reset, WebGL isPlumbGrid + Live Pulse + zero CapsuleGeometry, SVG <line> plumb drop with zero extra circles)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect((canonicalSrc.match(/CapsuleGeometry/g) || []).length).toBe(0);

    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave15GridHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'homesys' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave15GridHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="homesys"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="homesys"]');
      const gridBtn = bay.querySelector('[data-lifeskills-3d-grid="homesys"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="homesys"]');

      expect(gridBtn).toBeTruthy();
      expect(gridBtn.getAttribute('aria-pressed')).toBe('false');

      // Enable Plumb Grid -> 3 WebGL isPlumbGrid meshes (partId: null), SVG <line> plumb drop + banner, zero extra <circle>
      React.act(() => { gridBtn.click(); });
      expect(gridBtn.getAttribute('aria-pressed')).toBe('true');
      const plumbDrop = bay.querySelector('[data-lifeskills-3d-plumb-drop]');
      expect(plumbDrop).toBeTruthy();
      expect(plumbDrop.querySelectorAll('line').length).toBeGreaterThanOrEqual(1);
      const banner = bay.querySelector('[data-lifeskills-3d-grid-banner="homesys"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Plumb Grid Active');
      expect(banner.textContent).toContain('Floor Elevation:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const gridBuild = builds[builds.length - 1];
      expect(gridBuild.next.grid).toBe(true);
      const gridMeshes = gridBuild.children.filter((m) => m.userData?.isPlumbGrid);
      expect(gridMeshes.length).toBe(3);
      for (const gm of gridMeshes) expect(gm.userData.partId).toBeNull();

      // Live Pulse modulates isPlumbGrid scale
      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseGridMesh = pulseBuild.children.find((m) => m.userData?.isPlumbGrid);
      expect(pulseGridMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseGridMesh.scale.x).not.toBe(1);

      // Hotkey G toggles off & back on; hotkey 0 resets grid
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'g', bubbles: true })); });
      expect(gridBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'G', bubbles: true })); });
      expect(gridBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(gridBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('wires all 4 Wave 15 STEAM simulators + cross-tab bridges, 6 new AAC quick strips (21 domains), and Overview readiness export summary', () => {
    // 1. Work Readiness Overtime Fatigue & PTO + Budget Emergency Fund sync
    activeMount = mountInteractiveLifeSkills({ tab: 'workreadiness' });
    const otSim = activeMount.host.querySelector('[data-lifeskills-overtime-pto-sim="true"]');
    expect(otSim).toBeTruthy();
    React.act(() => { otSim.querySelector('[data-lifeskills-overtime-sync-budget="true"]').click(); });
    expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBeGreaterThanOrEqual(25);
    expect(activeMount.getState().workOtSyncMsg).toContain('Emergency Fund');
    expect(activeMount.getState().badges?.jobReady).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 2. Communication Active-Listening Check-Back Save Plan
    activeMount = mountInteractiveLifeSkills({ tab: 'communication' });
    const claritySim = activeMount.host.querySelector('[data-lifeskills-clarity-repair-sim="true"]');
    expect(claritySim).toBeTruthy();
    React.act(() => { claritySim.querySelector('[data-lifeskills-clarity-save-plan="true"]').click(); });
    expect(activeMount.getState().communicationPlanNote).toContain('Check-Back Script');
    expect(activeMount.getState().commClaritySyncMsg).toContain('Communication Plan Note');
    expect(activeMount.getState().badges?.communicationReady).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 3. Home Safety FEMA 72-Hr Outage & Fire Egress + Budget Shopping sync
    activeMount = mountInteractiveLifeSkills({ tab: 'homesafety' });
    const outageSim = activeMount.host.querySelector('[data-lifeskills-outage-kit-sim="true"]');
    expect(outageSim).toBeTruthy();
    React.act(() => { outageSim.querySelector('[data-lifeskills-outage-sync-budget="true"]').click(); });
    expect(activeMount.getState().budgetExp?.Shopping).toBeGreaterThanOrEqual(15);
    expect(activeMount.getState().homeOutageSyncMsg).toContain('Budget Shopping');
    expect(activeMount.getState().badges?.homeSafetyReady).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Cooking Delivery Markup vs Batch Meal-Prep + Budget Groceries sync
    activeMount = mountInteractiveLifeSkills({ tab: 'cooking' });
    const prepSim = activeMount.host.querySelector('[data-lifeskills-delivery-vs-prep-sim="true"]');
    expect(prepSim).toBeTruthy();
    React.act(() => { prepSim.querySelector('[data-lifeskills-prep-sync-budget="true"]').click(); });
    expect(activeMount.getState().budgetExp?.Groceries).toBeGreaterThanOrEqual(15);
    expect(activeMount.getState().cookPrepSyncMsg).toContain('Budget Groceries');
    expect(activeMount.getState().badges?.chefSafe).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 5. All 6 new AAC quick strips (21 total domains)
    const newAacTargets = [
      { tab: 'paycheck', key: 'payAacScriptMsg' },
      { tab: 'homerepair', key: 'repairAacScriptMsg' },
      { tab: 'budget', key: 'budgetAacScriptMsg' },
      { tab: 'credit', key: 'creditAacScriptMsg' },
      { tab: 'cooking', key: 'cookAacScriptMsg' },
      { tab: 'laundry', key: 'laundryAacScriptMsg' },
    ];
    for (const target of newAacTargets) {
      activeMount = mountInteractiveLifeSkills({ tab: target.tab });
      const stripBtn = activeMount.host.querySelector(`[data-lifeskills-aac-strip="${target.tab}"] button`);
      expect(stripBtn).toBeTruthy();
      React.act(() => { stripBtn.click(); });
      expect(String(activeMount.getState()[target.key] || '').length).toBeGreaterThan(5);
      activeMount.unmount();
      activeMount = null;
    }

    // 6. Overview Readiness Summary reports >=21 AAC domains
    activeMount = mountInteractiveLifeSkills({ tab: 'overview' });
    const readinessBox = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
    expect(readinessBox).toBeTruthy();
    expect(readinessBox.textContent).toMatch(/Spoken \/ AAC Self-Advocacy Domains Ready: 2[1-9] domains/);
    activeMount.unmount();
    activeMount = null;
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 15 (v5.33)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.3[3-9]/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 16 (v5.34) — 3D Axis Triad, 4 STEAM Simulators, Full 29-Domain AAC & Readiness Summary', () => {
  let activeMount = null;

  afterEach(() => {
    if (activeMount) {
      activeMount.unmount();
      activeMount = null;
    }
    vi.restoreAllMocks();
  });

  it('computes pure Wave 16 STEAM models (subscription/breach cascade, dryer airflow/shrink, shift/melatonin lux, MoE/selection bias) including explicit 0 arguments', () => {
    const h = loadPureSteamHelpers();

    // 1. Subscription Creep & Password Reuse Blast Radius (explicit 0 active subs, 0 forgotten trials)
    const zeroSubs = h.calcSubscriptionCreepAndBreachRadius(0, 12, 0, 14.99, 8, false);
    expect(zeroSubs.activeMonthlySpend).toBe(0);
    expect(zeroSubs.forgottenMonthlyLeak).toBe(0);
    expect(zeroSubs.annualLeakDollars).toBe(0);
    expect(zeroSubs.auditedMonthlySubBudget).toBe(0);
    expect(zeroSubs.breachBlastRadiusAccounts).toBe(8);
    expect(zeroSubs.securityPostureBand).toBe('critical_cascade');

    const isolatedVault = h.calcSubscriptionCreepAndBreachRadius(4, 12, 2, 14.99, 10, true);
    expect(isolatedVault.activeMonthlySpend).toBe(48);
    expect(isolatedVault.vaultMonthlyFee).toBe(3);
    expect(isolatedVault.auditedMonthlySubBudget).toBe(51);
    expect(isolatedVault.breachBlastRadiusAccounts).toBe(1);
    expect(isolatedVault.cascadeRiskPct).toBe(6);
    expect(isolatedVault.securityPostureBand).toBe('isolated_vault');

    // 2. Dryer Vent Airflow, Shrink Risk & Fire Hazard (explicit 0% lint blockage)
    const cleanVent = h.calcDryerVentEfficiencyAndShrinkRisk(0, 4.5, 'air_low', 'wool_delicate', 4);
    expect(cleanVent.airflowFactor).toBe(1);
    expect(cleanVent.actualCycleMins).toBe(cleanVent.cleanCycleMins);
    expect(cleanVent.annualCleanVentSavings).toBe(0);
    expect(cleanVent.fireHazardBand).toBe('clear_airflow');
    expect(cleanVent.shrinkRiskPct).toBe(8);

    const cloggedWoolHigh = h.calcDryerVentEfficiencyAndShrinkRisk(60, 4.5, 'high', 'wool_delicate', 4);
    expect(cloggedWoolHigh.fireHazardBand).toBe('lint_fire_hazard');
    expect(cloggedWoolHigh.shrinkRiskPct).toBe(85);
    expect(cloggedWoolHigh.annualCleanVentSavings).toBeGreaterThan(0);

    // 3. Shift Turnaround & Melatonin Lux Suppression (explicit 0 commute & 0 lux)
    const darkCool = h.calcShiftTurnaroundAndMelatoninLux(10, 0, 0, 66);
    expect(darkCool.netBedWindowHrs).toBe(8.75);
    expect(darkCool.melatoninSuppressionPct).toBe(0);
    expect(darkCool.luxDelayMinutes).toBe(0);
    expect(darkCool.thermalPenaltyMins).toBe(0);
    expect(darkCool.effectiveSleepHrs).toBe(8.75);
    expect(darkCool.turnaroundBand).toBe('safe_rest');

    const clopeningGlare = h.calcShiftTurnaroundAndMelatoninLux(8, 1.5, 250, 76);
    expect(clopeningGlare.turnaroundBand).toBe('clopening_hazard');
    expect(clopeningGlare.melatoninSuppressionPct).toBeGreaterThan(60);

    // 4. Sample Margin of Error & Selection Bias (explicit 0 bias)
    const zeroBias = h.calcSampleMarginOfErrorAndSelectionBias(400, 50, 95, 0);
    expect(zeroBias.selectionBiasPts).toBe(0);
    expect(zeroBias.marginOfErrorPct).toBe(4.9);
    expect(zeroBias.plausibleLowPct).toBe(45.1);
    expect(zeroBias.plausibleHighPct).toBe(54.9);
    expect(zeroBias.validityBand).toBe('high_validity');

    const biased = h.calcSampleMarginOfErrorAndSelectionBias(400, 52, 99, 10);
    expect(biased.validityBand).toBe('bias_dominated');
    expect(biased.requiredNFor3PctMoe).toBe(1844);
  });

  it('supports All-30 3D Bays Axis Triad (button, A hotkey, 0 reset, WebGL isAxisTriad + Live Pulse + zero CapsuleGeometry, SVG <line> triad with zero extra circles)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect((canonicalSrc.match(/CapsuleGeometry/g) || []).length).toBe(0);

    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave16AxesHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'homesys' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave16AxesHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="homesys"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="homesys"]');
      const axesBtn = bay.querySelector('[data-lifeskills-3d-axes="homesys"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="homesys"]');

      expect(axesBtn).toBeTruthy();
      expect(axesBtn.getAttribute('aria-pressed')).toBe('false');

      // Enable Axis Triad -> 3 orthogonal WebGL isAxisTriad rods (partId: null), SVG <line> triad + banner, zero extra <circle>
      React.act(() => { axesBtn.click(); });
      expect(axesBtn.getAttribute('aria-pressed')).toBe('true');
      const axisGroup = bay.querySelector('[data-lifeskills-3d-axis-triad]');
      expect(axisGroup).toBeTruthy();
      expect(axisGroup.querySelectorAll('line').length).toBe(3);
      const banner = bay.querySelector('[data-lifeskills-3d-axes-banner="homesys"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Axis Triad Active');
      expect(banner.textContent).toContain('Dominant Sightline:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const axesBuild = builds[builds.length - 1];
      expect(axesBuild.next.axes).toBe(true);
      const axesMeshes = axesBuild.children.filter((m) => m.userData?.isAxisTriad);
      expect(axesMeshes.length).toBe(3);
      for (const am of axesMeshes) expect(am.userData.partId).toBeNull();

      // Live Pulse modulates isAxisTriad scale
      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseAxisMesh = pulseBuild.children.find((m) => m.userData?.isAxisTriad);
      expect(pulseAxisMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseAxisMesh.scale.x).not.toBe(1);

      // Hotkey A toggles off & back on; hotkey 0 resets axes
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true })); });
      expect(axesBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'A', bubbles: true })); });
      expect(axesBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(axesBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('wires all 4 Wave 16 STEAM simulators + cross-tab bridges, 8 remaining AAC quick strips (29 total domains), and Overview readiness export summary', () => {
    // 1. Data Sample Margin of Error & Selection Bias Audit -> dataChartRedesignNote
    activeMount = mountInteractiveLifeSkills({ tab: 'data' });
    const moeSim = activeMount.host.querySelector('[data-lifeskills-sample-moe-sim="true"]');
    expect(moeSim).toBeTruthy();
    React.act(() => { moeSim.querySelector('[data-lifeskills-sample-save-audit="true"]').click(); });
    expect(activeMount.getState().dataChartRedesignNote).toContain('Methodology Audit');
    expect(activeMount.getState().dataMoeSyncMsg).toContain('Methodology Note');
    expect(activeMount.getState().badges?.dataDetect).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 2. Sleep Shift Turnaround & Melatonin Lux Optimizer
    activeMount = mountInteractiveLifeSkills({ tab: 'sleep' });
    const shiftSim = activeMount.host.querySelector('[data-lifeskills-shift-melatonin-sim="true"]');
    expect(shiftSim).toBeTruthy();
    React.act(() => { shiftSim.querySelector('[data-lifeskills-turnaround-apply-env="true"]').click(); });
    expect(activeMount.getState().sleepEveningLux).toBe(10);
    expect(activeMount.getState().sleepBedroomTempF).toBe(66);
    expect(activeMount.getState().sleepScreenMinutes).toBe(0);
    expect(activeMount.getState().sleepTurnaroundSyncMsg).toContain('10-lux');
    expect(activeMount.getState().badges?.sleepPlanner).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 3. Digital Safety Subscription Creep & Breach Blast-Radius -> Budget Subscriptions sync
    activeMount = mountInteractiveLifeSkills({ tab: 'digitalsafety' });
    const subSim = activeMount.host.querySelector('[data-lifeskills-sub-breach-sim="true"]');
    expect(subSim).toBeTruthy();
    React.act(() => { subSim.querySelector('[data-lifeskills-sub-sync-budget="true"]').click(); });
    expect(activeMount.getState().budgetExp?.Subscriptions).toBeGreaterThanOrEqual(1);
    expect(activeMount.getState().digitalSubSyncMsg).toContain('Budget Subscriptions');
    expect(activeMount.getState().badges?.digitalReady).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Laundry Dryer Airflow & Shrink Risk -> Budget Utilities sync
    activeMount = mountInteractiveLifeSkills({ tab: 'laundry' });
    const dryerSim = activeMount.host.querySelector('[data-lifeskills-dryer-airflow-sim="true"]');
    expect(dryerSim).toBeTruthy();
    React.act(() => { dryerSim.querySelector('[data-lifeskills-dryer-sync-budget="true"]').click(); });
    expect(activeMount.getState().budgetExp?.Utilities).toBeGreaterThanOrEqual(8);
    expect(activeMount.getState().laundryDryerSyncMsg).toContain('Budget Utilities');
    expect(activeMount.getState().badges?.laundryPro).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 5. All 8 new AAC quick strips (29 total domains = 100% of domain practice tabs)
    const newAacTargets = [
      { tab: 'data', key: 'dataAacScriptMsg' },
      { tab: 'decision', key: 'decisionAacScriptMsg' },
      { tab: 'resumebuilder', key: 'resumeAacScriptMsg' },
      { tab: 'prooflocker', key: 'proofAacScriptMsg' },
      { tab: 'bodycare', key: 'bodyAacScriptMsg' },
      { tab: 'sleep', key: 'sleepAacScriptMsg' },
      { tab: 'science', key: 'sciAacScriptMsg' },
      { tab: 'homesys', key: 'homesysAacScriptMsg' },
    ];
    for (const target of newAacTargets) {
      activeMount = mountInteractiveLifeSkills({ tab: target.tab });
      const stripBtn = activeMount.host.querySelector(`[data-lifeskills-aac-strip="${target.tab}"] button`);
      expect(stripBtn).toBeTruthy();
      React.act(() => { stripBtn.click(); });
      expect(String(activeMount.getState()[target.key] || '').length).toBeGreaterThan(5);
      activeMount.unmount();
      activeMount = null;
    }

    // 6. Overview Readiness Summary reports 29 AAC domains
    activeMount = mountInteractiveLifeSkills({ tab: 'overview' });
    const readinessBox = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
    expect(readinessBox).toBeTruthy();
    expect(readinessBox.textContent).toContain('Spoken / AAC Self-Advocacy Domains Ready: 29 domains');
    activeMount.unmount();
    activeMount = null;
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 16 (v5.34)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.3[4-9]/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 17 (v5.35) — 3D Flow Links, 4 STEAM Simulators & Cross-Domain Readiness Rollup', () => {
  let activeMount = null;

  afterEach(() => {
    if (activeMount) {
      activeMount.unmount();
      activeMount = null;
    }
    vi.restoreAllMocks();
  });

  it('computes pure Wave 17 STEAM models (deposit depreciation, 90d generic Rx, cold-snap PSI braking, transit headway/transfer) including explicit 0 arguments', () => {
    const h = loadPureSteamHelpers();

    // 1. Security Deposit Wear-and-Tear Depreciation (explicit 0 values + late return case)
    const zeroDep = h.calcLeaseDepositWearVsDamage(0, 0, 0, 0, 0, 0, 21);
    expect(zeroDep.securityDeposit).toBe(0);
    expect(zeroDep.tenancyMonths).toBe(0);
    expect(zeroDep.remainingUsefulLifePct).toBe(100);
    expect(zeroDep.fairDeductionTotal).toBe(0);
    expect(zeroDep.expectedRefund).toBe(0);
    expect(zeroDep.unfairWithheldAmount).toBe(0);
    expect(zeroDep.missedStatutoryDeadline).toBe(false);
    expect(zeroDep.actionBand).toBe('fair_settlement');

    const proratedDep = h.calcLeaseDepositWearVsDamage(1500, 24, 3, 900, 180, 28, 21);
    expect(proratedDep.totalCarpetAgeYrs).toBe(5);
    expect(proratedDep.remainingUsefulLifePct).toBe(29);
    expect(proratedDep.proratedCarpetLiability).toBe(257);
    expect(proratedDep.allowableCleaning).toBe(60);
    expect(proratedDep.fairDeductionTotal).toBe(317);
    expect(proratedDep.expectedRefund).toBe(1183);
    expect(proratedDep.unfairWithheldAmount).toBe(763);
    expect(proratedDep.missedStatutoryDeadline).toBe(true);
    expect(proratedDep.daysOverDeadline).toBe(7);
    expect(proratedDep.actionBand).toBe('deadline_forfeiture_notice');

    // 2. Generic Rx & 90-Day Supply Adherence (explicit 0 meds & gap)
    const zeroRx = h.calcGenericRxAnd90DaySupplySavings(0, 0, 0, 0, 0);
    expect(zeroRx.chronicMedsCount).toBe(0);
    expect(zeroRx.annualBrandRetail).toBe(0);
    expect(zeroRx.annualGeneric90d).toBe(0);
    expect(zeroRx.annualSavingsVsBrand).toBe(0);
    expect(zeroRx.monthlyOptimizedRounded).toBe(0);
    expect(zeroRx.pdc30dPct).toBe(100);
    expect(zeroRx.pdc90dPct).toBe(100);
    expect(zeroRx.adherenceBand).toBe('clinical_target_met');

    const rxPlan = h.calcGenericRxAnd90DaySupplySavings(65, 12, 25, 2, 3);
    expect(rxPlan.annualBrandRetail).toBe(1560);
    expect(rxPlan.annualGeneric90d).toBe(200);
    expect(rxPlan.annualSavingsVsBrand).toBe(1360);
    expect(rxPlan.monthlyOptimizedRounded).toBe(17);
    expect(rxPlan.pdc30dPct).toBe(90);
    expect(rxPlan.pdc90dPct).toBe(98);
    expect(rxPlan.adherenceGainPct).toBe(8);
    expect(rxPlan.fdaBioequivalenceRange).toBe('80%-125% AUC/Cmax');

    // 3. Cold-Snap Tire PSI & Wet Braking (explicit 0 mph / 0 miles)
    const zeroDrive = h.calcColdSnapTirePsiAndWetBraking(35, 75, 75, 0, 8, 0, 3.5, 28);
    expect(zeroDrive.coldMorningPsi).toBe(35);
    expect(zeroDrive.psiDeficit).toBe(0);
    expect(zeroDrive.tpmsWarningTriggered).toBe(false);
    expect(zeroDrive.mpgPenaltyPct).toBe(0);
    expect(zeroDrive.annualFuelWasteDollars).toBe(0);
    expect(zeroDrive.reactionDistFt).toBe(0);
    expect(zeroDrive.actualBrakingFt).toBe(0);
    expect(zeroDrive.totalWetStopFt).toBe(0);
    expect(zeroDrive.extraWetStopFt).toBe(0);
    expect(zeroDrive.safetyBand).toBe('spec_ready');

    const coldSnap = h.calcColdSnapTirePsiAndWetBraking(35, 75, 25, 55, 4, 12000, 3.5, 28);
    expect(coldSnap.coldMorningPsi).toBeLessThan(31);
    expect(coldSnap.psiDeficit).toBeGreaterThan(4);
    expect(coldSnap.extraWetStopFt).toBeGreaterThan(0);
    expect(coldSnap.annualFuelWasteDollars).toBeGreaterThan(0);
    expect(coldSnap.safetyBand).toBe('top_off_and_plan_tires');

    // 4. Transit Headway & Multi-Leg Transfer Reliability (explicit 0 transfers & 0 sigma)
    const directZero = h.calcTransitHeadwayAndTransferReliability(20, 4, 0, 0, 0);
    expect(directZero.tripReliabilityPct).toBe(100);
    expect(directZero.expectedMissedTripsMo).toBe(0);
    expect(directZero.monthlyDelayMinutes).toBe(0);
    expect(directZero.recommendedExtraDepartMin).toBe(0);
    expect(directZero.suggestedTimeBufferPct).toBe(10);
    expect(directZero.reliabilityBand).toBe('dependable_buffer');

    const tightXfer = h.calcTransitHeadwayAndTransferReliability(20, 4, 3.5, 1, 40);
    expect(tightXfer.tripReliabilityPct).toBe(75.9);
    expect(tightXfer.expectedMissedTripsMo).toBe(9.6);
    expect(tightXfer.monthlyDelayMinutes).toBe(192);
    expect(tightXfer.recommendedExtraDepartMin).toBe(4);
    expect(tightXfer.suggestedTimeBufferPct).toBe(15);
    expect(tightXfer.reliabilityBand).toBe('chronic_late_cascade');
  });

  it('supports All-30 3D Bays Flow Links (button, L hotkey, 0 reset, WebGL isFlowLink + Live Pulse + zero CapsuleGeometry, SVG <line> links with zero extra circles)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect((canonicalSrc.match(/CapsuleGeometry/g) || []).length).toBe(0);

    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave17LinksHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'contract' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave17LinksHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="contract"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="contract"]');
      const linksBtn = bay.querySelector('[data-lifeskills-3d-links="contract"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="contract"]');

      expect(linksBtn).toBeTruthy();
      expect(linksBtn.getAttribute('aria-pressed')).toBe('false');

      // Enable Flow Links -> 6 Manhattan WebGL isFlowLink BoxGeometry conduits (partId: null), SVG 2 <line> flow vectors + banner, zero extra <circle>
      React.act(() => { linksBtn.click(); });
      expect(linksBtn.getAttribute('aria-pressed')).toBe('true');
      const flowGroup = bay.querySelector('[data-lifeskills-3d-flow-links]');
      expect(flowGroup).toBeTruthy();
      expect(flowGroup.querySelectorAll('line').length).toBe(2);
      expect(flowGroup.querySelectorAll('circle').length).toBe(0);
      const banner = bay.querySelector('[data-lifeskills-3d-links-banner="contract"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Flow Links Active');
      expect(banner.textContent).toContain('Upstream:');
      expect(banner.textContent).toContain('Downstream:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const linksBuild = builds[builds.length - 1];
      expect(linksBuild.next.links).toBe(true);
      const linkMeshes = linksBuild.children.filter((m) => m.userData?.isFlowLink);
      expect(linkMeshes.length).toBe(6);
      for (const lm of linkMeshes) expect(lm.userData.partId).toBeNull();

      // Live Pulse modulates isFlowLink scale
      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseLinkMesh = pulseBuild.children.find((m) => m.userData?.isFlowLink);
      expect(pulseLinkMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseLinkMesh.scale.x).not.toBe(1);

      // Hotkey L toggles off & back on; hotkey 0 resets links
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'l', bubbles: true })); });
      expect(linksBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'L', bubbles: true })); });
      expect(linksBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(linksBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('wires all 4 Wave 17 STEAM simulators, cross-domain state bridges, _LS_TEXT_KEYS coercion, and Overview Budget sync rollup', () => {
    // 1. Contract Security Deposit Wear-and-Tear Auditor -> crLastNote + Budget Emergency Fund
    activeMount = mountInteractiveLifeSkills({
      tab: 'contract',
      contractDepositSyncMsg: { staleObject: true },
    });
    const depSim = activeMount.host.querySelector('[data-lifeskills-deposit-wear-sim="true"]');
    expect(depSim).toBeTruthy();
    expect(activeMount.host.textContent).not.toContain('[object Object]');
    React.act(() => { depSim.querySelector('[data-lifeskills-deposit-save-dispute="true"]').click(); });
    expect(activeMount.getState().crLastNote).toContain('Deposit Depreciation Audit');
    expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBeGreaterThanOrEqual(50);
    expect(activeMount.getState().contractDepositSyncMsg).toContain('Budget Emergency Fund');
    expect(activeMount.getState().badges?.trapFinder).toBeTruthy();
    expect(activeMount.getState().badges?.saver).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 2. Transport Headway & Transfer Reliability -> timeBufferPct + transportPlanMsg
    activeMount = mountInteractiveLifeSkills({
      tab: 'transport',
      transportHeadwaySyncMsg: 42,
    });
    const xferSim = activeMount.host.querySelector('[data-lifeskills-headway-transfer-sim="true"]');
    expect(xferSim).toBeTruthy();
    React.act(() => { xferSim.querySelector('[data-lifeskills-transfer-sync-time="true"]').click(); });
    expect(activeMount.getState().timeBufferPct).toBeGreaterThanOrEqual(10);
    expect(activeMount.getState().transportPlanMsg).toContain('Transfer buffer plan');
    expect(activeMount.getState().transportHeadwaySyncMsg).toContain('Time Management Lab');
    expect(activeMount.getState().badges?.routeNavigator).toBeTruthy();
    expect(activeMount.getState().badges?.timePlanner).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 3. Meds 90-Day Generic Rx Optimizer -> Budget Insurance + medQuestionNote
    activeMount = mountInteractiveLifeSkills({
      tab: 'meds',
      medGenericSyncMsg: ['bad-array'],
    });
    const rxSim = activeMount.host.querySelector('[data-lifeskills-generic-rx-sim="true"]');
    expect(rxSim).toBeTruthy();
    React.act(() => { rxSim.querySelector('[data-lifeskills-rx-sync-budget="true"]').click(); });
    expect(activeMount.getState().medMonthlyBudgetCost).toBe(17);
    expect(activeMount.getState().budgetExp?.Insurance).toBe(267);
    expect(activeMount.getState().medQuestionNote).toContain('FDA-bioequivalent');
    expect(activeMount.getState().medGenericSyncMsg).toContain('Budget Insurance');
    expect(activeMount.getState().badges?.medLabelReader).toBeTruthy();
    expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 4. Car Care Cold-Snap Tire PSI & Wet Braking -> ccPsiDeficit
    activeMount = mountInteractiveLifeSkills({
      tab: 'carcare',
      carColdPsiSyncMsg: { broken: 1 },
    });
    const psiSim = activeMount.host.querySelector('[data-lifeskills-cold-psi-sim="true"]');
    expect(psiSim).toBeTruthy();
    expect(activeMount.host.textContent).not.toContain('[object Object]');
    React.act(() => { psiSim.querySelector('[data-lifeskills-psi-sync-maint="true"]').click(); });
    expect(activeMount.getState().ccPsiDeficit).toBeGreaterThanOrEqual(4);
    expect(activeMount.getState().carColdPsiSyncMsg).toContain('Maintenance Sinking Fund');
    expect(activeMount.getState().badges?.mechanic).toBeTruthy();
    activeMount.unmount();
    activeMount = null;

    // 5. Overview Zero-PII Readiness Summary reports cross-domain Budget category sync count
    activeMount = mountInteractiveLifeSkills({
      tab: 'overview',
      budgetExp: { Insurance: 267, Utilities: 112 },
    });
    const readinessBox = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
    expect(readinessBox).toBeTruthy();
    expect(readinessBox.textContent).toContain('Budget Lines Synced from Simulators: 2/11 categories');
    activeMount.unmount();
    activeMount = null;
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 17 (v5.35)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.3[5-9]/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 18 (v5.36) — 3D Part Bounds, 4 STEAM Simulators & Mastery Readiness Rollup', () => {
  it('computes NEC 80% circuit load, sinking fund payday trough, BNPL vs Avalanche payoff, and nutrient-sodium density with explicit-0 guards', () => {
    const {
      calcBranchCircuitBreakerAndGfciLoad,
      calcIrregularSinkingFundAndPaydayTrough,
      calcBnplStackingVsAvalanchePayoff,
      calcNutrientDensityPerDollarAndSodium,
    } = loadPureSteamHelpers();

    const safeCir = calcBranchCircuitBreakerAndGfciLoad(20, 800, 200, 25, 12);
    expect(safeCir.necEffectiveWatts).toBe(1200);
    expect(safeCir.riskBand).toBe('Within NEC 80% Limit');
    expect(safeCir.isOverloaded).toBe(false);

    const hotCir = calcBranchCircuitBreakerAndGfciLoad(15, 1500, 600, 100, 18);
    expect(hotCir.isOverloaded).toBe(true);
    expect(hotCir.isCordUnderGauged).toBe(true);
    expect(hotCir.riskBand).toBe('Trip / Overheat Risk');

    const zeroCir = calcBranchCircuitBreakerAndGfciLoad(15, 0, 0, 0, 14);
    expect(zeroCir.totalRawWatts).toBe(0);
    expect(zeroCir.voltageDropVolts).toBe(0);
    expect(zeroCir.remainingContinuousWatts).toBe(1440);
    expect(zeroCir.remainingIntermittentWatts).toBe(1800);

    const troughRisk = calcIrregularSinkingFundAndPaydayTrough(2400, 4, 0, 1800, 1400, 200);
    expect(troughRisk.monthlySinkingNeed).toBe(600);
    expect(troughRisk.perPaycheckSinking).toBe(300);
    expect(troughRisk.balanceAfterFirstHalfBills).toBe(-500);
    expect(troughRisk.statusBand).toBe('Overdraft Trough Risk');

    const zeroTrough = calcIrregularSinkingFundAndPaydayTrough(0, 6, 0, 0, 1800, 500);
    expect(zeroTrough.monthlySinkingNeed).toBe(0);
    expect(zeroTrough.balanceAfterFirstHalfBills).toBe(2300);
    expect(zeroTrough.statusBand).toBe('Trough Covered');

    const heavyBnpl = calcBnplStackingVsAvalanchePayoff(6, 200, 12, 3000, 3200, 26.9, 900, 12.9, 250);
    expect(heavyBnpl.bnplMonthlyDraft).toBe(600);
    expect(heavyBnpl.bnplIncomeSharePct).toBe(20);
    expect(heavyBnpl.bnplStackRisk).toBe('Severe Cash Squeeze');
    expect(heavyBnpl.avalancheTotalInterest).toBeLessThanOrEqual(heavyBnpl.snowballTotalInterest);
    expect(heavyBnpl.avalancheInterestSavedVsMinOnly).toBeGreaterThan(0);

    const zeroDebt = calcBnplStackingVsAvalanchePayoff(0, 0, 0, 3000, 0, 0, 0, 0, 0);
    expect(zeroDebt.bnplMonthlyDraft).toBe(0);
    expect(zeroDebt.avalancheMonths).toBe(0);
    expect(zeroDebt.priorityCard).toBe('Debt-Free');

    const highSatiety = calcNutrientDensityPerDollarAndSodium(3.50, 7, 14, 8, 80, 14);
    expect(highSatiety.fdaSodiumBand).toBe('Low Sodium (<=5% DV/srv)');
    expect(highSatiety.nutrientValueGrade).toBe('High Satiety Value');
    expect(highSatiety.proteinGramsPerDollar).toBe(28);

    const highSodium = calcNutrientDensityPerDollarAndSodium(4.00, 2, 5, 1, 920, 14);
    expect(highSodium.sodiumDvPctPerServing).toBe(40);
    expect(highSodium.fdaSodiumBand).toBe('High Sodium (>=20% DV/srv)');

    const zeroNutrients = calcNutrientDensityPerDollarAndSodium(2.00, 4, 0, 0, 0, 10);
    expect(zeroNutrients.sodiumDvPctPerServing).toBe(0);
    expect(zeroNutrients.proteinGramsPerDollar).toBe(0);
  });

  it('supports All-30 3D Bays Part Bounds (button, B hotkey, 0 reset, WebGL isPartBounds + Live Pulse + zero CapsuleGeometry, SVG 4 <line> bounds with zero extra circles)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect((canonicalSrc.match(/CapsuleGeometry/g) || []).length).toBe(0);

    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave18BoundsHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'homerepair' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave18BoundsHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="homerepair"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="homerepair"]');
      const boundsBtn = bay.querySelector('[data-lifeskills-3d-bounds="homerepair"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="homerepair"]');

      expect(boundsBtn).toBeTruthy();
      expect(boundsBtn.getAttribute('aria-pressed')).toBe('false');

      React.act(() => { boundsBtn.click(); });
      expect(boundsBtn.getAttribute('aria-pressed')).toBe('true');
      const boundsGroup = bay.querySelector('[data-lifeskills-3d-part-bounds]');
      expect(boundsGroup).toBeTruthy();
      expect(boundsGroup.querySelectorAll('line').length).toBe(4);
      expect(boundsGroup.querySelectorAll('circle').length).toBe(0);
      const banner = bay.querySelector('[data-lifeskills-3d-bounds-banner="homerepair"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Part Bounds Active');
      expect(banner.textContent).toContain('Nearest Neighbor:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const boundsBuild = builds[builds.length - 1];
      expect(boundsBuild.next.bounds).toBe(true);
      const boundMeshes = boundsBuild.children.filter((m) => m.userData?.isPartBounds);
      expect(boundMeshes.length).toBe(4);
      for (const bm of boundMeshes) expect(bm.userData.partId).toBeNull();

      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseBoundMesh = pulseBuild.children.find((m) => m.userData?.isPartBounds);
      expect(pulseBoundMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseBoundMesh.scale.x).not.toBe(1);

      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'b', bubbles: true })); });
      expect(boundsBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'B', bubbles: true })); });
      expect(boundsBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(boundsBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('mounts 4 Wave 18 simulators safely, coerces non-string sync messages, syncs budget categories, and reports Overview STEAM milestones', () => {
    let activeMount = null;
    try {
      // 1. Home Repair Breaker Load & Cord Voltage Drop
      activeMount = mountInteractiveLifeSkills({
        tab: 'homerepair',
        hrBreakerSyncMsg: { bad: 1 },
      });
      const brSim = activeMount.host.querySelector('[data-lifeskills-breaker-load-sim="true"]');
      expect(brSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { brSim.querySelector('[data-lifeskills-breaker-sync-safety="true"]').click(); });
      expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBeGreaterThanOrEqual(25);
      expect(activeMount.getState().hrBreakerSyncMsg).toContain('Emergency Fund');
      expect(activeMount.getState().badges?.handyman).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 2. Budget Irregular Sinking Fund & Payday Trough
      activeMount = mountInteractiveLifeSkills({
        tab: 'budget',
        budgetSinkingSyncMsg: ['bad'],
      });
      const skSim = activeMount.host.querySelector('[data-lifeskills-sinking-trough-sim="true"]');
      expect(skSim).toBeTruthy();
      React.act(() => { skSim.querySelector('[data-lifeskills-sinking-sync-budget="true"]').click(); });
      expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBe(350);
      expect(activeMount.getState().budgetSinkingSyncMsg).toContain('Emergency Fund');
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 3. Credit BNPL Stacking vs Debt Avalanche
      activeMount = mountInteractiveLifeSkills({
        tab: 'credit',
        creditBnplSyncMsg: 999,
      });
      const bnSim = activeMount.host.querySelector('[data-lifeskills-bnpl-avalanche-sim="true"]');
      expect(bnSim).toBeTruthy();
      React.act(() => { bnSim.querySelector('[data-lifeskills-bnpl-sync-budget="true"]').click(); });
      expect(activeMount.getState().budgetExp?.Shopping).toBe(360);
      expect(activeMount.getState().creditBnplSyncMsg).toContain('Shopping audit');
      expect(activeMount.getState().badges?.creditWise).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 4. Food Confidence Nutrient Density & FDA Sodium 5/20
      activeMount = mountInteractiveLifeSkills({
        tab: 'foodconfidence',
        foodNutrientSyncMsg: { x: 2 },
      });
      const nuSim = activeMount.host.querySelector('[data-lifeskills-nutrient-density-sim="true"]');
      expect(nuSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { nuSim.querySelector('[data-lifeskills-nutrient-sync-budget="true"]').click(); });
      expect(activeMount.getState().budgetExp?.Groceries).toBe(61);
      expect(activeMount.getState().foodNutrientSyncMsg).toContain('Groceries');
      expect(activeMount.getState().badges?.foodPlanner).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 5. Overview Zero-PII Readiness Summary reports unique STEAM scenario & 3D action count
      activeMount = mountInteractiveLifeSkills({
        tab: 'overview',
        lsActionLog: { a: 1, b: 2, c: 3 },
      });
      const readinessBox = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
      expect(readinessBox).toBeTruthy();
      expect(readinessBox.textContent).toContain('Unique STEAM Scenarios & 3D Checks Logged: 3 milestones');
      activeMount.unmount();
      activeMount = null;
    } finally {
      activeMount?.unmount();
    }
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 18 (v5.36)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.3[6-9]/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 19 (v5.37) — Full Multi-Simulator Parity, 11-Plan Rollup & All-30 3D Sightline', () => {
  it('computes Vital ID Replacement Cascade, Credential Link-Rot Decay, Interleaving Transfer Lift, and Boss Survival Odds with explicit zero guards', () => {
    const {
      calcVitalDocReplacementCascade,
      calcCredentialLinkRotAndVerificationStrength,
      calcInterleavingTransferAndCalibrationGap,
      calcBossEncounterSurvivalAndArmorOdds,
    } = loadPureSteamHelpers();

    // 1. Vital ID Replacement Cascade
    const bottleneck = calcVitalDocReplacementCascade(false, false, true, true, 28, 32, 18, 10);
    expect(bottleneck.needsBirthCertFirst).toBe(true);
    expect(bottleneck.sequentialCalendarDays).toBe(28);
    expect(bottleneck.directReplacementFees).toBe(60);
    expect(bottleneck.emergencyDocKitReserve).toBe(95);
    expect(bottleneck.startDateSlipDays).toBe(18);
    expect(bottleneck.i9StatusBand).toBe('Dependency Bottleneck Risk');

    const passportFast = calcVitalDocReplacementCascade(false, true, true, true, 28, 32, 18, 10);
    expect(passportFast.sequentialCalendarDays).toBe(0);
    expect(passportFast.startDateSlipDays).toBe(0);
    expect(passportFast.wagesAtRiskDollars).toBe(0);
    expect(passportFast.i9StatusBand).toBe('List A Ready (Passport)');

    const zeroCascade = calcVitalDocReplacementCascade(true, false, true, false, 0, 0, 0, 0);
    expect(zeroCascade.directReplacementFees).toBe(0);
    expect(zeroCascade.wagesAtRiskDollars).toBe(0);

    // 2. Credential Link-Rot & 3-2-1 Archive Strength
    const decayDefault = calcCredentialLinkRotAndVerificationStrength(6, 4, 2, 12, false, 2);
    expect(decayDefault.brokenLinkExpectedCount).toBeGreaterThan(0);
    expect(decayDefault.survivingArtifacts).toBeLessThan(6);
    expect(decayDefault.monthlyStorageBudget).toBe(4);

    const backupClamped = calcCredentialLinkRotAndVerificationStrength(6, 9, 9, 12, true, 3);
    expect(backupClamped.schoolHostedOnlyCount).toBe(6);
    expect(backupClamped.brokenLinkExpectedCount).toBe(0);
    expect(backupClamped.survivingArtifacts).toBe(6);
    expect(backupClamped.survivalPct).toBe(100);
    expect(backupClamped.verifiableSharePct).toBe(100);

    const zeroArtifacts = calcCredentialLinkRotAndVerificationStrength(0, 2, 1, 12, false, 0);
    expect(zeroArtifacts.totalArtifacts).toBe(0);
    expect(zeroArtifacts.survivalPct).toBe(0);
    expect(zeroArtifacts.monthlyStorageBudget).toBe(0);
    expect(zeroArtifacts.verificationTrustScore).toBe(0);

    // 3. Interleaving Transfer vs Blocked Cramming & Calibration Gap
    const mixedBalanced = calcInterleavingTransferAndCalibrationGap(90, 4, 78, 60);
    expect(mixedBalanced.delayedRealWorldTransferPct).toBeGreaterThan(mixedBalanced.blockedOnlyTransferPct);
    expect(mixedBalanced.transferLiftVsBlockedPct).toBeGreaterThan(0);

    const blockedSingle = calcInterleavingTransferAndCalibrationGap(90, 1, 78, 20);
    expect(mixedBalanced.delayedRealWorldTransferPct).toBeGreaterThan(blockedSingle.delayedRealWorldTransferPct);

    const overconfident = calcInterleavingTransferAndCalibrationGap(90, 4, 96, 60);
    expect(overconfident.calibrationBand).toBe('Illusion-of-Fluency Gap');

    const zeroStudy = calcInterleavingTransferAndCalibrationGap(0, 1, 50, 0);
    expect(zeroStudy.weeklyStudyMins).toBe(0);
    expect(zeroStudy.transferLiftVsBlockedPct).toBe(0);

    // 4. Boss Encounter Negative-Binomial Survival & Armor Odds
    const strongLoadout = calcBossEncounterSurvivalAndArmorOdds(80, 20, 100, 100, true);
    const weakLoadout = calcBossEncounterSurvivalAndArmorOdds(55, 0, 80, 120, false);
    expect(strongLoadout.winProbabilityPct).toBeGreaterThan(weakLoadout.winProbabilityPct);
    expect(strongLoadout.survivableMisses).toBeGreaterThan(weakLoadout.survivableMisses);

    const zeroAcc = calcBossEncounterSurvivalAndArmorOdds(0, 14, 100, 100, false);
    expect(zeroAcc.winProbabilityPct).toBe(0);

    const defeatedBoss = calcBossEncounterSurvivalAndArmorOdds(70, 0, 100, 0, false);
    expect(defeatedBoss.hitsNeededToWin).toBe(0);
    expect(defeatedBoss.winProbabilityPct).toBe(100);
  });

  it('mounts records, prooflocker, challenge, and battle Wave 19 simulators and reports 11-domain Action Plans Saved in Overview', () => {
    let activeMount = null;
    try {
      // 1. Records Vital Doc Replacement Cascade
      activeMount = mountInteractiveLifeSkills({
        tab: 'records',
        recordsCascadeSyncMsg: { bad: 1 },
      });
      const vitalSim = activeMount.host.querySelector('[data-lifeskills-vital-doc-cascade-sim="true"]');
      expect(vitalSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { vitalSim.querySelector('[data-lifeskills-vital-doc-sync-budget="true"]').click(); });
      expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBe(95);
      expect(activeMount.getState().recordPlanSaved).toBeTruthy();
      expect(activeMount.getState().recordsCascadeSyncMsg).toContain('Emergency Fund');
      activeMount.unmount();
      activeMount = null;

      // 2. Proof Locker Credential Link-Rot & 3-2-1 Archive
      activeMount = mountInteractiveLifeSkills({
        tab: 'prooflocker',
        proofRotSyncMsg: ['bad'],
      });
      const rotSim = activeMount.host.querySelector('[data-lifeskills-credential-rot-sim="true"]');
      expect(rotSim).toBeTruthy();
      React.act(() => { rotSim.querySelector('[data-lifeskills-credential-sync-plan="true"]').click(); });
      expect(activeMount.getState().budgetExp?.Subscriptions).toBe(4);
      expect(activeMount.getState().proofPlanSaved).toBeTruthy();
      expect(activeMount.getState().proofRotSyncMsg).toContain('3-2-1 archive budget');
      activeMount.unmount();
      activeMount = null;

      // 3. Challenge Interleaving vs Blocked Practice & Calibration
      activeMount = mountInteractiveLifeSkills({
        tab: 'challenge',
        chalInterleaveSyncMsg: 999,
      });
      const ilSim = activeMount.host.querySelector('[data-lifeskills-interleaving-calibration-sim="true"]');
      expect(ilSim).toBeTruthy();
      React.act(() => { ilSim.querySelector('[data-lifeskills-interleaving-sync-plan="true"]').click(); });
      expect(activeMount.getState().chalDomain).toBe('all');
      expect(activeMount.getState().timePlanSaved).toBeTruthy();
      expect(activeMount.getState().chalInterleaveSyncMsg).toContain('All Domains');
      activeMount.unmount();
      activeMount = null;

      // 4. Battle Boss Survival & Tactical Loadout
      activeMount = mountInteractiveLifeSkills({
        tab: 'battle',
        battleTacticalSyncMsg: { y: 3 },
      });
      const btSim = activeMount.host.querySelector('[data-lifeskills-boss-tactical-sim="true"]');
      expect(btSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { btSim.querySelector('[data-lifeskills-boss-apply-loadout="true"]').click(); });
      expect(activeMount.getState().battleMode).toBe('choice');
      expect(activeMount.getState().battleCalmMode).toBe(true);
      expect(activeMount.getState().battleTacticalSyncMsg).toContain('4-Choice');
      activeMount.unmount();
      activeMount = null;

      // 5. Overview Zero-PII Readiness Summary reports Domain Action Plans Saved (/11 plans)
      activeMount = mountInteractiveLifeSkills({
        tab: 'overview',
        recordPlanSaved: 1001,
        proofPlanSaved: 1002,
        timePlanSaved: 1003,
      });
      const readinessBox = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
      expect(readinessBox).toBeTruthy();
      expect(readinessBox.textContent).toContain('Domain Action Plans Saved: 3/11 plans');
      activeMount.unmount();
      activeMount = null;
    } finally {
      activeMount?.unmount();
    }
  });

  it('supports All-30 3D Bays Sightline (button, V hotkey, 0 reset, WebGL isSightRay + Live Pulse + zero CapsuleGeometry, SVG 3 <line> ray with zero extra circles)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect((canonicalSrc.match(/CapsuleGeometry/g) || []).length).toBe(0);

    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave19SightHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'records' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave19SightHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="records"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="records"]');
      const sightBtn = bay.querySelector('[data-lifeskills-3d-sight="records"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="records"]');

      expect(sightBtn).toBeTruthy();
      expect(sightBtn.getAttribute('aria-pressed')).toBe('false');

      React.act(() => { sightBtn.click(); });
      expect(sightBtn.getAttribute('aria-pressed')).toBe('true');
      const rayGroup = bay.querySelector('[data-lifeskills-3d-sight-ray]');
      expect(rayGroup).toBeTruthy();
      expect(rayGroup.querySelectorAll('line').length).toBe(3);
      expect(rayGroup.querySelectorAll('circle').length).toBe(0);

      const banner = bay.querySelector('[data-lifeskills-3d-sight-banner="records"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Sightline Ray Active');
      expect(banner.textContent).toContain('Reach Distance:');
      expect(banner.textContent).toContain('Elevation Pitch:');
      expect(banner.textContent).toContain('Occlusion:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const sightBuild = builds[builds.length - 1];
      expect(sightBuild.next.sight).toBe(true);
      const sightMeshes = sightBuild.children.filter((m) => m.userData?.isSightRay);
      expect(sightMeshes.length).toBe(3);
      for (const sm of sightMeshes) expect(sm.userData.partId).toBeNull();

      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseSightMesh = pulseBuild.children.find((m) => m.userData?.isSightRay);
      expect(pulseSightMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseSightMesh.scale.x).not.toBe(1);

      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'v', bubbles: true })); });
      expect(sightBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'V', bubbles: true })); });
      expect(sightBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(sightBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 19 (v5.37)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.3[7-9]/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 20 (v5.38) — Learn Sprint Parity, Paycheck/Insurance/HomeSys Simulators & All-30 3D Safe Zone', () => {
  it('computes W-4/1099 Safe Harbor, Renters RCV vs ACV, Water Heater Scald Curve, and Cognitive-Load Reading Sprint with explicit zero guards', () => {
    const {
      calcW4WithholdingAndSideGigSafeHarbor,
      calcRentersRcvVsAcvAndLiability,
      calcWaterHeaterSetpointAndScaldSafety,
      calcReadingSprintAndCognitiveLoad,
    } = loadPureSteamHelpers();

    // 1. Multiple-W2 W-4 Step 4(c) & 1099 Safe Harbor
    const dualUnderwithheld = calcW4WithholdingAndSideGigSafeHarbor(38000, 14000, 4800, 0, 26, 'single');
    expect(dualUnderwithheld.selfEmploymentTax).toBe(678);
    expect(dualUnderwithheld.totalCombinedFedLiability).toBe(5415);
    expect(dualUnderwithheld.aprilBalanceDue).toBe(2893);
    expect(dualUnderwithheld.recommendedW4Step4cPerPay).toBe(112);
    expect(dualUnderwithheld.monthlyTaxReserveNeed).toBe(242);
    expect(dualUnderwithheld.irsSafeHarborMet).toBe(false);

    const fixedWithW4 = calcW4WithholdingAndSideGigSafeHarbor(38000, 14000, 4800, 112, 26, 'single');
    expect(fixedWithW4.aprilBalanceDue).toBeLessThanOrEqual(0);
    expect(fixedWithW4.irsSafeHarborMet).toBe(true);
    expect(fixedWithW4.recommendedW4Step4cPerPay).toBe(0);

    const zeroIncome = calcW4WithholdingAndSideGigSafeHarbor(0, 0, 0, 0, 26, 'single');
    expect(zeroIncome.totalCombinedFedLiability).toBe(0);
    expect(zeroIncome.aprilBalanceDue).toBe(0);
    expect(zeroIncome.irsSafeHarborMet).toBe(true);

    // 2. Renters RCV vs ACV Depreciation Gap
    const rentersStd = calcRentersRcvVsAcvAndLiability(3200, 4800, 3, 500, 18, 7);
    expect(rentersStd.rcvNetPayout).toBe(7500);
    expect(rentersStd.acvNetPayout).toBe(3852);
    expect(rentersStd.depreciationGapDollars).toBe(3648);
    expect(rentersStd.lossOfUseHotelCovered).toBe(1015);
    expect(rentersStd.policyVerdict).toBe('RCV Strongly Recommended');

    const zeroInventory = calcRentersRcvVsAcvAndLiability(0, 0, 0, 500, 0, 0);
    expect(zeroInventory.totalReplacementValue).toBe(0);
    expect(zeroInventory.monthlyRcvPremium).toBe(0);
    expect(zeroInventory.coverageRatioPerPremiumDollar).toBe(0);
    expect(zeroInventory.policyVerdict).toBe('Inventory Needed');

    // 3. Water Heater Setpoint & Thermal Scald Curve
    const hotScald = calcWaterHeaterSetpointAndScaldSafety(140, 10, 2.5, 0.16, 2);
    const safe120 = calcWaterHeaterSetpointAndScaldSafety(120, 10, 1.75, 0.16, 2);
    expect(hotScald.scaldSeconds).toBeLessThan(10);
    expect(safe120.scaldSeconds).toBe(300);
    expect(hotScald.monthlyCurrentCost).toBeGreaterThan(safe120.monthlyTunedCost);
    expect(hotScald.annualSavingsDollars).toBeGreaterThan(0);
    expect(hotScald.scaldRiskBand).toContain('Severe Rapid-Scald Hazard');
    expect(safe120.scaldRiskBand).toContain('DOE 120');

    const zeroShowerAndRate = calcWaterHeaterSetpointAndScaldSafety(120, 0, 1.75, 0, 2);
    expect(zeroShowerAndRate.dailyMixedGallons).toBe(0);
    expect(zeroShowerAndRate.monthlyCurrentCost).toBe(0);
    expect(zeroShowerAndRate.annualSavingsDollars).toBe(0);

    // 4. Cognitive-Load Reading Sprint
    const steadySprint = calcReadingSprintAndCognitiveLoad(18, 20, 20, 180, true);
    expect(steadySprint.effectiveFocusMins).toBe(20);
    expect(steadySprint.comprehensionRetentionPct).toBe(89);
    expect(steadySprint.daysToComplete).toBeGreaterThan(0);
    expect(steadySprint.cognitiveLoadBand).toBe('Optimal Working-Memory Pace');

    const masteredAll = calcReadingSprintAndCognitiveLoad(0, 0, 20, 180, true);
    expect(masteredAll.totalRawStudyMins).toBe(0);
    expect(masteredAll.daysToComplete).toBe(0);
    expect(masteredAll.topicsPerDay).toBe(0);
    expect(masteredAll.cognitiveLoadBand).toBe('100% Curriculum Mastered');

    const zeroDailyMins = calcReadingSprintAndCognitiveLoad(10, 10, 0, 180, false);
    expect(zeroDailyMins.effectiveFocusMins).toBe(0);
    expect(zeroDailyMins.topicsPerDay).toBe(0);
    expect(zeroDailyMins.daysToComplete).toBe(99);
    expect(zeroDailyMins.cognitiveLoadBand).toBe('Schedule Daily Sprint');
  });

  it('mounts paycheck, insurance, homesys, and learn Wave 20 simulators, coerces non-string messages, and reports Practice Streak & Boss Shield in Overview', () => {
    let activeMount = null;
    try {
      // 1. Paycheck W-4 & Side-Gig Safe Harbor
      activeMount = mountInteractiveLifeSkills({
        tab: 'paycheck',
        payW4SyncMsg: { bad: 1 },
      });
      const w4Sim = activeMount.host.querySelector('[data-lifeskills-w4-sidegig-sim="true"]');
      expect(w4Sim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { w4Sim.querySelector('[data-lifeskills-w4-sync-budget="true"]').click(); });
      expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBe(242);
      expect(activeMount.getState().payW4SyncMsg).toContain('Emergency Fund');
      expect(activeMount.getState().badges?.firstPay).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 2. Insurance Renters RCV vs ACV
      activeMount = mountInteractiveLifeSkills({
        tab: 'insurance',
        insRentersSyncMsg: ['bad'],
      });
      const rentSim = activeMount.host.querySelector('[data-lifeskills-renters-rcv-sim="true"]');
      expect(rentSim).toBeTruthy();
      React.act(() => { rentSim.querySelector('[data-lifeskills-renters-sync-budget="true"]').click(); });
      expect(activeMount.getState().budgetExp?.Insurance).toBe(18);
      expect(activeMount.getState().insRentersSyncMsg).toContain('Renters RCV');
      expect(activeMount.getState().badges?.insured).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 3. HomeSys Water Heater Setpoint & Scald Curve
      activeMount = mountInteractiveLifeSkills({
        tab: 'homesys',
        homesysWhSyncMsg: 999,
      });
      const whSim = activeMount.host.querySelector('[data-lifeskills-water-heater-sim="true"]');
      expect(whSim).toBeTruthy();
      React.act(() => { whSim.querySelector('[data-lifeskills-wh-sync-budget="true"]').click(); });
      expect(activeMount.getState().whTempF).toBe(120);
      expect(activeMount.getState().whGpm).toBe(1.75);
      expect(activeMount.getState().budgetExp?.Utilities).toBeGreaterThanOrEqual(15);
      expect(activeMount.getState().homesysWhSyncMsg).toContain('120');
      expect(activeMount.getState().badges?.homeExpert).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 4. Learn Cognitive-Load Reading Sprint
      activeMount = mountInteractiveLifeSkills({
        tab: 'learn',
        learnSprintSyncMsg: { z: 9 },
      });
      const lrnSim = activeMount.host.querySelector('[data-lifeskills-learn-sprint-sim="true"]');
      expect(lrnSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { lrnSim.querySelector('[data-lifeskills-learn-sprint-sync="true"]').click(); });
      expect(activeMount.getState().timePlanSaved).toBeTruthy();
      expect(activeMount.getState().learnSprintSyncMsg).toContain('Time Management Plan');
      expect(activeMount.getState().badges?.timePlanner).toBeTruthy();
      expect(activeMount.getState().badges?.scholar).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 5. Overview Zero-PII Readiness Summary reports Practice Streak & Boss Shield
      activeMount = mountInteractiveLifeSkills({
        tab: 'overview',
        chalStreak: 4,
        battleShieldHP: 14,
      });
      const readinessBox = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
      expect(readinessBox).toBeTruthy();
      expect(readinessBox.textContent).toContain('Practice Streak & Boss Shield: 4 challenge streak | 14 HP mastery armor');
      activeMount.unmount();
      activeMount = null;
    } finally {
      activeMount?.unmount();
    }
  });

  it('supports All-30 3D Bays Safe Zone (button, Z hotkey, 0 reset, WebGL isSafeZone + Live Pulse + zero CapsuleGeometry, SVG 4 <line> perimeter with zero extra circles)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect((canonicalSrc.match(/CapsuleGeometry/g) || []).length).toBe(0);

    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave20ZoneHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'paycheck' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave20ZoneHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="paycheck"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="paycheck"]');
      const zoneBtn = bay.querySelector('[data-lifeskills-3d-zone="paycheck"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="paycheck"]');

      expect(zoneBtn).toBeTruthy();
      expect(zoneBtn.getAttribute('aria-pressed')).toBe('false');

      React.act(() => { zoneBtn.click(); });
      expect(zoneBtn.getAttribute('aria-pressed')).toBe('true');
      const zoneGroup = bay.querySelector('[data-lifeskills-3d-safe-zone]');
      expect(zoneGroup).toBeTruthy();
      expect(zoneGroup.querySelectorAll('line').length).toBe(4);
      expect(zoneGroup.querySelectorAll('circle').length).toBe(0);

      const banner = bay.querySelector('[data-lifeskills-3d-zone-banner="paycheck"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Safety Clearance Zone Active');
      expect(banner.textContent).toContain('Required Radius:');
      expect(banner.textContent).toContain('Nearest Margin:');
      expect(banner.textContent).toContain('Status:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const zoneBuild = builds[builds.length - 1];
      expect(zoneBuild.next.zone).toBe(true);
      const zoneMeshes = zoneBuild.children.filter((m) => m.userData?.isSafeZone);
      expect(zoneMeshes.length).toBe(4);
      for (const zm of zoneMeshes) expect(zm.userData.partId).toBeNull();

      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseZoneMesh = pulseBuild.children.find((m) => m.userData?.isSafeZone);
      expect(pulseZoneMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseZoneMesh.scale.x).not.toBe(1);

      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z', bubbles: true })); });
      expect(zoneBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Z', bubbles: true })); });
      expect(zoneBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(zoneBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 20 (v5.38)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.3[8-9]/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 21 (v5.39) — Dental/Digital/Cooking/Laundry Simulators, Habit Checklists Summary & All-30 3D Load Path', () => {
  it('computes Thaw Cold-Chain/Carryover, Detergent CMC/Cold-Enzyme, Dental Phasing/Fluoride Shield, and 3-2-1 Backup Resilience with explicit zero guards', () => {
    const {
      calcThawMethodAndCarryoverSafety,
      calcDetergentDosingAndColdEnzymeWash,
      calcDentalCalendarPhasingAndFluorideShield,
      calcBackup321ResilienceAndRecoveryCost,
    } = loadPureSteamHelpers();

    // 1. Thaw Cold-Chain & Carryover Thermal Mass
    const unsafeThaw = calcThawMethodAndCarryoverSafety(4, 'counter_unsafe', 159, 165, 'stainless');
    expect(unsafeThaw.fridgeThawHours).toBe(19.2);
    expect(unsafeThaw.coldWaterThawMins).toBe(120);
    expect(unsafeThaw.dangerZoneSurfaceMins).toBe(315);
    expect(unsafeThaw.carryoverRiseF).toBe(6.9);
    expect(unsafeThaw.finalRestedTempF).toBe(165.9);
    expect(unsafeThaw.meetsUsdaTarget).toBe(false);
    expect(unsafeThaw.safetyVerdict).toContain('Discard Risk');

    const safeThaw = calcThawMethodAndCarryoverSafety(4, 'fridge', 159, 165, 'stainless');
    expect(safeThaw.dangerZoneSurfaceMins).toBe(0);
    expect(safeThaw.meetsUsdaTarget).toBe(true);
    expect(safeThaw.safetyVerdict).toBe('USDA Cold-Chain & Carryover Safe');

    const zeroWeight = calcThawMethodAndCarryoverSafety(0, 'fridge', 159, 165, 'stainless');
    expect(zeroWeight.fridgeThawHours).toBe(0);
    expect(zeroWeight.carryoverRiseF).toBe(0);
    expect(zeroWeight.monthlyWasteAvoidedDollars).toBe(0);
    expect(zeroWeight.safetyVerdict).toBe('Select Food Weight');

    // 2. Detergent CMC Over-Dosing & Cold Enzyme Wash
    const overdosedHot = calcDetergentDosingAndColdEnzymeWash(4, 1.8, 140, 'hot', 14, 64);
    expect(overdosedHot.optimalDoseMultiplier).toBe(1.05);
    expect(overdosedHot.sudsResidueRiskPct).toBe(51);
    expect(overdosedHot.enzymeActivityPct).toBe(42);
    expect(overdosedHot.extraRinseGallonsPerYear).toBe(1664);
    expect(overdosedHot.annualSavingsDollars).toBe(120);
    expect(overdosedHot.dosingVerdict).toContain('Over-Dosed');

    const tunedCold = calcDetergentDosingAndColdEnzymeWash(4, 1.05, 140, 'cold_enzyme', 14, 64);
    expect(tunedCold.enzymeActivityPct).toBe(94);
    expect(tunedCold.extraRinseGallonsPerYear).toBe(0);
    expect(tunedCold.annualSavingsDollars).toBe(0);
    expect(tunedCold.dosingVerdict).toBe('HE Optimal CMC & Cold-Enzyme Tuned');

    const zeroLoads = calcDetergentDosingAndColdEnzymeWash(0, 0, 0, 'cold_enzyme', 0, 64);
    expect(zeroLoads.monthlyCurrentCost).toBe(0);
    expect(zeroLoads.monthlyTunedCost).toBe(0);
    expect(zeroLoads.extraRinseGallonsPerYear).toBe(0);
    expect(zeroLoads.dosingVerdict).toBe('No Weekly Loads Scheduled');

    // 3. Dental Dec/Jan Calendar Phasing & Fluoride Shield
    const phasedDental = calcDentalCalendarPhasingAndFluorideShield(2800, 900, 1500, 50, 60, 2, 3);
    expect(phasedDental.singleYearOop).toBe(1900);
    expect(phasedDental.phasedTwoYearOop).toBe(1180);
    expect(phasedDental.phasingSavingsDollars).toBe(720);
    expect(phasedDental.monthlyPhasedSinkingFund).toBe(99);
    expect(phasedDental.criticalEnamelPh).toBe(4.5);
    expect(phasedDental.strategyVerdict).toBe('Phase Across Dec/Jan Rollover');

    const zeroBill = calcDentalCalendarPhasingAndFluorideShield(0, 0, 0, 0, 0, 0, 0);
    expect(zeroBill.singleYearOop).toBe(0);
    expect(zeroBill.phasedTwoYearOop).toBe(0);
    expect(zeroBill.phasingSavingsDollars).toBe(0);
    expect(zeroBill.criticalEnamelPh).toBe(5.5);
    expect(zeroBill.dailyDeminMinutes).toBe(0);
    expect(zeroBill.strategyVerdict).toBe('No Restorative Bill Pending');

    // 4. 3-2-1 Air-Gap Backup Resilience
    const spof = calcBackup321ResilienceAndRecoveryCost(250, 1, 0, false, 10, 22);
    expect(spof.meets321Rule).toBe(false);
    expect(spof.annualLossProbPct).toBe(8.5);
    expect(spof.unbackedRebuildCost).toBe(418);
    expect(spof.recommended321CloudBudget).toBe(3);
    expect(spof.resilienceBand).toBe('Single-Point-of-Failure Risk');

    const gold321 = calcBackup321ResilienceAndRecoveryCost(250, 2, 1, true, 10, 22);
    expect(gold321.meets321Rule).toBe(true);
    expect(gold321.annualLossProbPct).toBe(0.02);
    expect(gold321.recoveryDowntimeHours).toBe(1.5);
    expect(gold321.resilienceBand).toContain('3-2-1 Gold Resilience');

    const zeroGb = calcBackup321ResilienceAndRecoveryCost(0, 1, 0, false, 0, 0);
    expect(zeroGb.annualLossProbPct).toBe(0);
    expect(zeroGb.unbackedRebuildCost).toBe(0);
    expect(zeroGb.monthlyCloudCost).toBe(0);
    expect(zeroGb.recommended321CloudBudget).toBe(0);
    expect(zeroGb.resilienceBand).toBe('No Critical Data Selected');
  });

  it('mounts dental, digitalsafety, cooking, and laundry Wave 21 simulators, coerces non-string messages, and reports Domain Habit Checklists Verified in Overview', () => {
    let activeMount = null;
    try {
      // 1. Dental Dec/Jan Phasing & Fluoride Shield
      activeMount = mountInteractiveLifeSkills({
        tab: 'dental',
        dentalPhasingSyncMsg: { bad: 1 },
      });
      const dentalSim = activeMount.host.querySelector('[data-lifeskills-dental-phasing-sim="true"]');
      expect(dentalSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { dentalSim.querySelector('[data-lifeskills-dental-phasing-sync="true"]').click(); });
      expect(activeMount.getState().budgetExp?.['Emergency Fund']).toBe(99);
      expect(activeMount.getState().dentalPhasingSyncMsg).toContain('Emergency Fund');
      expect(activeMount.getState().badges?.dentalReady).toBeTruthy();
      expect(activeMount.getState().badges?.toothTriage).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 2. Digital Safety 3-2-1 Backup Resilience
      activeMount = mountInteractiveLifeSkills({
        tab: 'digitalsafety',
        digitalBackupSyncMsg: ['bad'],
      });
      const bkpSim = activeMount.host.querySelector('[data-lifeskills-backup-321-sim="true"]');
      expect(bkpSim).toBeTruthy();
      React.act(() => { bkpSim.querySelector('[data-lifeskills-backup-sync-plan="true"]').click(); });
      expect(activeMount.getState().dsLocalCopies).toBe(2);
      expect(activeMount.getState().dsCloudCopies).toBe(1);
      expect(activeMount.getState().dsImmutableCopy).toBe(true);
      expect(activeMount.getState().budgetExp?.Subscriptions).toBe(3);
      expect(activeMount.getState().digitalPlanSaved).toBeTruthy();
      expect(activeMount.getState().digitalBackupSyncMsg).toContain('3-2-1');
      expect(activeMount.getState().badges?.digitalReady).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 3. Cooking Cold-Chain Thaw & Carryover Safety
      activeMount = mountInteractiveLifeSkills({
        tab: 'cooking',
        cookThawMethod: { weird: 2 },
        cookThawSyncMsg: 999,
      });
      const thawSim = activeMount.host.querySelector('[data-lifeskills-thaw-carryover-sim="true"]');
      expect(thawSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { thawSim.querySelector('[data-lifeskills-thaw-sync-budget="true"]').click(); });
      expect(activeMount.getState().cookThawMethod).toBe('fridge');
      expect(activeMount.getState().budgetExp?.Groceries).toBe(34);
      expect(activeMount.getState().cookThawSyncMsg).toContain('fridge thaw');
      expect(activeMount.getState().badges?.chefSafe).toBeTruthy();
      expect(activeMount.getState().badges?.leftoverSafe).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 4. Laundry HE Detergent & Cold-Enzyme Wash
      activeMount = mountInteractiveLifeSkills({
        tab: 'laundry',
        laundryWashTempMode: { z: 9 },
        laundryEnzymeSyncMsg: ['err'],
      });
      const enzSim = activeMount.host.querySelector('[data-lifeskills-detergent-enzyme-sim="true"]');
      expect(enzSim).toBeTruthy();
      React.act(() => { enzSim.querySelector('[data-lifeskills-detergent-sync-budget="true"]').click(); });
      expect(activeMount.getState().laundryWashTempMode).toBe('cold_enzyme');
      expect(activeMount.getState().launWashTempF).toBe(60);
      expect(activeMount.getState().launCupDoseMult).toBe(1.05);
      expect(activeMount.getState().budgetExp?.Shopping).toBeGreaterThanOrEqual(5);
      expect(activeMount.getState().laundryEnzymeSyncMsg).toContain('Cold Enzyme');
      expect(activeMount.getState().badges?.laundryPro).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 5. Overview Zero-PII Readiness Summary reports Domain Habit Checklists Verified
      activeMount = mountInteractiveLifeSkills({ tab: 'overview' });
      const readinessBox = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
      expect(readinessBox).toBeTruthy();
      expect(readinessBox.textContent).toContain('Domain Habit Checklists Verified: 0/95 habits (0/16 checklists)');
      activeMount.unmount();
      activeMount = null;
    } finally {
      activeMount?.unmount();
    }
  });

  it('supports All-30 3D Bays Load Path (button, W hotkey, 0 reset, WebGL isLoadVector + Live Pulse + zero CapsuleGeometry, SVG 4 <line> vector with zero extra circles)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect((canonicalSrc.match(/CapsuleGeometry/g) || []).length).toBe(0);

    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave21LoadHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'paycheck' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave21LoadHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="paycheck"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="paycheck"]');
      const loadBtn = bay.querySelector('[data-lifeskills-3d-load="paycheck"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="paycheck"]');

      expect(loadBtn).toBeTruthy();
      expect(loadBtn.getAttribute('aria-pressed')).toBe('false');

      React.act(() => { loadBtn.click(); });
      expect(loadBtn.getAttribute('aria-pressed')).toBe('true');
      const loadGroup = bay.querySelector('[data-lifeskills-3d-load-vector]');
      expect(loadGroup).toBeTruthy();
      expect(loadGroup.querySelectorAll('line').length).toBe(4);
      expect(loadGroup.querySelectorAll('circle').length).toBe(0);

      const banner = bay.querySelector('[data-lifeskills-3d-load-banner="paycheck"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Gravity Load & CoM Stability Active');
      expect(banner.textContent).toContain('Part Mass Proxy:');
      expect(banner.textContent).toContain('Moment Arm to CoM:');
      expect(banner.textContent).toContain('Stability:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const loadBuild = builds[builds.length - 1];
      expect(loadBuild.next.load).toBe(true);
      const loadMeshes = loadBuild.children.filter((m) => m.userData?.isLoadVector);
      expect(loadMeshes.length).toBe(3);
      for (const lm of loadMeshes) expect(lm.userData.partId).toBeNull();

      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseLoadMesh = pulseBuild.children.find((m) => m.userData?.isLoadVector);
      expect(pulseLoadMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseLoadMesh.scale.x).not.toBe(1);

      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'w', bubbles: true })); });
      expect(loadBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'W', bubbles: true })); });
      expect(loadBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(loadBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 21 (v5.39)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.(39|[4-9]\d)/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 22 (v5.40) — Work/Resume/Time/Appointments Simulators, Scenario Mastery Summary & All-30 3D Service Track', () => {
  it('computes accurate quantitative STEAM models and honors explicit 0 args across all 4 Wave 22 pure helpers', () => {
    const hp = loadPureSteamHelpers();

    // 1. Onboarding PPE & pre-paycheck arrears float
    const fDef = hp.calcFirstJobGearAndPayFloat(135, 40, 11, 4, 21, 9);
    expect(fDef.netUpfrontGearCost).toBe(95);
    expect(fDef.shiftsBeforeFirstCheck).toBe(12);
    expect(fDef.prePaycheckTransitFoodFloat).toBe(132);
    expect(fDef.totalDayOneBridgeNeeded).toBe(227);
    expect(fDef.monthlyGearReplacementReserve).toBe(11);
    expect(fDef.overdraftTrapAvoidedDollars).toBe(70);
    const fZero = hp.calcFirstJobGearAndPayFloat(0, 0, 0, 0, 0, 0);
    expect(fZero.totalDayOneBridgeNeeded).toBe(0);
    expect(fZero.shiftsBeforeFirstCheck).toBe(0);
    expect(fZero.monthlyGearReplacementReserve).toBe(0);
    expect(fZero.floatReadinessBand).toBe('Zero Upfront Float Needed');

    // 2. Tailored resume callback funnel & search yield
    const rBlast = hp.calcTailoredFunnelAndCallbackYield(14, 10, 'generic_blast', 0, 20, 0);
    const rTail = hp.calcTailoredFunnelAndCallbackYield(14, 35, 'evidence_tailored', 25, 28, 12);
    expect(rTail.effectiveCallbackPct).toBeGreaterThan(rBlast.effectiveCallbackPct);
    expect(rTail.atLeastOneInterviewProbPct).toBeGreaterThanOrEqual(75);
    expect(rTail.monthlySearchBudget).toBe(12);
    const rZero = hp.calcTailoredFunnelAndCallbackYield(0, 35, 'evidence_tailored', 0, 0, 0);
    expect(rZero.expectedInterviewsPerMonth).toBe(0);
    expect(rZero.atLeastOneInterviewProbPct).toBe(0);
    expect(rZero.atLeastOneOfferProbPct).toBe(0);
    expect(rZero.monthlySearchBudget).toBe(0);
    expect(rZero.funnelVerdict).toBe('No Applications Queued');

    // 3. 168-hour weekly load balancing & 80% queuing slack threshold
    const tDef = hp.calcWeeklyLoadAndSlackCapacity(9.5, 40, 9, 16, 6, 14);
    expect(tDef.sleepCareWk).toBe(66.5);
    expect(tDef.nonNegotiableBaseHrs).toBe(129.5);
    expect(tDef.availableFlexCapacityHrs).toBe(38.5);
    expect(tDef.weeklySlackOrDeficitHrs).toBe(16.5);
    expect(tDef.capacityUtilizationPct).toBe(57);
    const tOver = hp.calcWeeklyLoadAndSlackCapacity(9.5, 48, 10, 28, 8, 14);
    expect(tOver.weeklySlackOrDeficitHrs).toBeLessThan(0);
    expect(tOver.sleepAtRiskHrsWk).toBeGreaterThan(0);
    const tZero = hp.calcWeeklyLoadAndSlackCapacity(0, 0, 0, 0, 0, 0);
    expect(tZero.nonNegotiableBaseHrs).toBe(0);
    expect(tZero.availableFlexCapacityHrs).toBe(168);
    expect(tZero.capacityUtilizationPct).toBe(0);

    // 4. Visit agenda packing, Teach-Back memory & 24h cancellation shield
    const aDef = hp.calcVisitAgendaAndRecallRetention(15, 3, 'written_notes', true, 36, 65);
    expect(aDef.directDialogueMins).toBe(10);
    expect(aDef.minsPerPriorityItem).toBe(3.3);
    expect(aDef.agendaFitOptimal).toBe(true);
    expect(aDef.recallRetentionPct).toBe(83);
    expect(aDef.feeTriggered).toBe(false);
    expect(aDef.uncoveredFeeExposure).toBe(0);
    const aRisk = hp.calcVisitAgendaAndRecallRetention(15, 0, 'memory_only', false, 6, 0);
    expect(aRisk.recallRetentionPct).toBe(32);
    expect(aRisk.feeTriggered).toBe(false);
    expect(aRisk.annualFeeSavedWith48hAlert).toBe(0);
    const aLate = hp.calcVisitAgendaAndRecallRetention(15, 3, 'written_notes', false, 12, 80);
    expect(aLate.feeTriggered).toBe(true);
    expect(aLate.uncoveredFeeExposure).toBe(80);
  });

  it('mounts workreadiness, resumebuilder, timemanagement, and appointments Wave 22 simulators, coerces non-string messages, and reports Domain Decision Scenarios Mastered in Overview', () => {
    let activeMount = null;
    try {
      // 1. Work Readiness Onboarding PPE & Arrears Float
      activeMount = mountInteractiveLifeSkills({
        tab: 'workreadiness',
        workFloatSyncMsg: { bad: 1 },
      });
      const floatSim = activeMount.host.querySelector('[data-lifeskills-onboarding-float-sim="true"]');
      expect(floatSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { floatSim.querySelector('[data-lifeskills-float-sync-budget="true"]').click(); });
      expect(activeMount.getState().budgetExp?.Shopping).toBe(11);
      expect(activeMount.getState().workPlanSaved).toBeTruthy();
      expect(activeMount.getState().workFloatSyncMsg).toContain('Shopping');
      expect(activeMount.getState().badges?.jobReady).toBeTruthy();
      expect(activeMount.getState().badges?.workplaceNavigator).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 2. Resume Builder Tailored Callback Funnel
      activeMount = mountInteractiveLifeSkills({
        tab: 'resumebuilder',
        resumeFunnelMode: { weird: 2 },
        resumeFunnelSyncMsg: ['err'],
      });
      const funnelSim = activeMount.host.querySelector('[data-lifeskills-resume-funnel-sim="true"]');
      expect(funnelSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { funnelSim.querySelector('[data-lifeskills-funnel-sync-plan="true"]').click(); });
      expect(activeMount.getState().resumeFunnelMode).toBe('evidence_tailored');
      expect(activeMount.getState().budgetExp?.Shopping).toBe(12);
      expect(activeMount.getState().resumePlanSaved).toBeTruthy();
      expect(activeMount.getState().resumeFunnelSyncMsg).toContain('Evidence-Tailored');
      expect(activeMount.getState().badges?.resumeReady).toBeTruthy();
      expect(activeMount.getState().badges?.bulletBuilder).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 3. Time Management 168-Hour Load & 80% Slack Ceiling
      activeMount = mountInteractiveLifeSkills({
        tab: 'timemanagement',
        timeProjectHrsWk: 28,
        timeSlackSyncMsg: 999,
      });
      const slackSim = activeMount.host.querySelector('[data-lifeskills-weekly-slack-sim="true"]');
      expect(slackSim).toBeTruthy();
      React.act(() => { slackSim.querySelector('[data-lifeskills-slack-save-plan="true"]').click(); });
      expect(activeMount.getState().timeProjectHrsWk).toBe(25);
      expect(activeMount.getState().timePlanSaved).toBeTruthy();
      expect(activeMount.getState().timeSlackSyncMsg).toContain('168-hour');
      expect(activeMount.getState().badges?.timePlanner).toBeTruthy();
      expect(activeMount.getState().badges?.taskNavigator).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 4. Appointments Visit Agenda Packing & Teach-Back Shield
      activeMount = mountInteractiveLifeSkills({
        tab: 'appointments',
        apptNoteMode: { z: 9 },
        apptAgendaSyncMsg: ['bad'],
      });
      const agendaSim = activeMount.host.querySelector('[data-lifeskills-visit-agenda-sim="true"]');
      expect(agendaSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { agendaSim.querySelector('[data-lifeskills-agenda-sync-script="true"]').click(); });
      expect(activeMount.getState().apptNoteMode).toBe('portal_plus_notes');
      expect(activeMount.getState().apptTeachBack).toBe(true);
      expect(activeMount.getState().apptNoticeHours).toBe(48);
      expect(activeMount.getState().appointmentScriptSaved).toBeTruthy();
      expect(activeMount.getState().budgetExp?.Insurance).toBe(9);
      expect(activeMount.getState().apptAgendaSyncMsg).toContain('Teach-Back');
      expect(activeMount.getState().badges?.appointmentReady).toBeTruthy();
      expect(activeMount.getState().badges?.selfAdvocate).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 5. Overview Zero-PII Readiness Summary reports Domain Decision Scenarios Mastered (default + populated)
      activeMount = mountInteractiveLifeSkills({ tab: 'overview' });
      const readinessDefault = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
      expect(readinessDefault).toBeTruthy();
      expect(readinessDefault.textContent).toContain('Domain Decision Scenarios Mastered: 0/95 cases (0/16 decks)');
      activeMount.unmount();
      activeMount = null;

      activeMount = mountInteractiveLifeSkills({
        tab: 'overview',
        dentalScenarioScore: 3,
        workScenarioScore: 2,
      });
      const readinessPop = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
      expect(readinessPop.textContent).toContain('Domain Decision Scenarios Mastered: 5/95 cases (2/16 decks)');
      activeMount.unmount();
      activeMount = null;
    } finally {
      activeMount?.unmount();
    }
  });

  it('supports All-30 3D Bays Service Track (button, T hotkey, 0 reset, WebGL isServiceTrack + Live Pulse + zero CapsuleGeometry, SVG 4 <line> corridor with zero extra circles)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect((canonicalSrc.match(/CapsuleGeometry/g) || []).length).toBe(0);

    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave22TrackHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'paycheck' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave22TrackHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="paycheck"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="paycheck"]');
      const trackBtn = bay.querySelector('[data-lifeskills-3d-track="paycheck"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="paycheck"]');

      expect(trackBtn).toBeTruthy();
      expect(trackBtn.getAttribute('aria-pressed')).toBe('false');

      React.act(() => { trackBtn.click(); });
      expect(trackBtn.getAttribute('aria-pressed')).toBe('true');
      const trackGroup = bay.querySelector('[data-lifeskills-3d-service-track]');
      expect(trackGroup).toBeTruthy();
      expect(trackGroup.querySelectorAll('line').length).toBe(4);
      expect(trackGroup.querySelectorAll('circle').length).toBe(0);

      const banner = bay.querySelector('[data-lifeskills-3d-track-banner="paycheck"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Service Extraction Track Active');
      expect(banner.textContent).toContain('Pull-Out Face:');
      expect(banner.textContent).toContain('Required Stroke:');
      expect(banner.textContent).toContain('Corridor:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const trackBuild = builds[builds.length - 1];
      expect(trackBuild.next.track).toBe(true);
      const trackMeshes = trackBuild.children.filter((m) => m.userData?.isServiceTrack);
      expect(trackMeshes.length).toBe(3);
      for (const tm of trackMeshes) expect(tm.userData.partId).toBeNull();

      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseTrackMesh = pulseBuild.children.find((m) => m.userData?.isServiceTrack);
      expect(pulseTrackMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseTrackMesh.scale.x).not.toBe(1);

      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 't', bubbles: true })); });
      expect(trackBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'T', bubbles: true })); });
      expect(trackBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(trackBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 22 (v5.40)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.(40|[5-9]\d)/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });
});

describe('Life Skills Wave 23 (v5.41) — Decision/Interview/Budget/Credit Simulators, Applied STEM Quizzes Summary & All-30 3D Operator Stance', () => {
  it('computes accurate quantitative STEAM models and honors explicit 0 args across all 4 Wave 23 pure helpers', () => {
    const hp = loadPureSteamHelpers();

    // 1. EVPI / EVSI Paid Inspection & Trial Value
    const eDef = hp.calcEvpiAndTrialInspectionValue(25, 1400, 2200, 200, 140, 90);
    expect(eDef.evCommitBlind).toBe(500);
    expect(eDef.evWithoutInfo).toBe(500);
    expect(eDef.evWithPerfectInfo).toBe(1100);
    expect(eDef.evpiMaxFee).toBe(600);
    expect(eDef.evsiAdjustedValue).toBe(540);
    expect(eDef.netInspectionGain).toBe(400);
    expect(eDef.monthlyInspectionReserve).toBe(24);
    const eZero = hp.calcEvpiAndTrialInspectionValue(0, 1000, 2000, 200, 0, 100);
    expect(eZero.defectProbPct).toBe(0);
    expect(eZero.evpiMaxFee).toBe(0);
    expect(eZero.maxRegretAvoided).toBe(0);
    expect(eZero.monthlyInspectionReserve).toBe(0);
    expect(eZero.verdict).toBe('Skip Paid Test \u2014 Decision Already Clear');

    // 2. Salary Negotiation Compounding & 401k Match Lift
    const sDef = hp.calcSalaryNegotiationCompounding(19, 21, 75, 40, 4, 4, 5);
    expect(sDef.settledHourly).toBe(20.5);
    expect(sDef.hourlyLift).toBe(1.5);
    expect(sDef.year1GrossGain).toBe(3120);
    expect(sDef.monthlyNetGainYear1).toBe(208);
    expect(sDef.totalCompoundedGainDollars).toBeGreaterThan(17000);
    const sZero = hp.calcSalaryNegotiationCompounding(0, 0, 0, 0, 0, 0, 1);
    expect(sZero.settledHourly).toBe(0);
    expect(sZero.year1GrossGain).toBe(0);
    expect(sZero.totalCompoundedGainDollars).toBe(0);
    expect(sZero.monthlyNetGainYear1).toBe(0);
    expect(sZero.negotiationBand).toBe('No Counter-Offer Spread Modeled');

    // 3. Raise Lifestyle-Creep Guard & Auto-Save Split
    const bDef = hp.calcLifestyleCreepAndAutoSaveSplit(350, 60, 7, 10, 4500, 2000);
    expect(bDef.monthlyAutoSaved).toBe(210);
    expect(bDef.monthlyLifestyleAdded).toBe(140);
    expect(bDef.totalPrincipalContributed).toBe(25200);
    expect(bDef.futureCorpusDollars).toBeGreaterThan(36000);
    expect(bDef.disciplinedRunwayMonths).toBeGreaterThan(bDef.creepRunwayMonths);
    const bZero = hp.calcLifestyleCreepAndAutoSaveSplit(0, 0, 0, 1, 0, 2000);
    expect(bZero.monthlyAutoSaved).toBe(0);
    expect(bZero.futureCorpusDollars).toBe(0);
    expect(bZero.creepRunwayMonths).toBe(0);
    expect(bZero.disciplineVerdict).toBe('Enter Income Gain or Freed Cashflow');

    // 4. Deferred-Interest Cliff Trap vs True 0% APR Balance Transfer
    const cDef = hp.calcDeferredInterestVsBalanceTransfer(1500, 12, 115, 29.9, 3, 24.9);
    expect(cDef.safePayoffMonthly).toBe(125);
    expect(cDef.safeBufferMonthly).toBe(137);
    expect(cDef.remainingAtCliff).toBe(120);
    expect(cDef.hitsRetroactiveCliff).toBe(true);
    expect(cDef.retroactiveInterestShock).toBe(242);
    expect(cDef.upfrontTransferFeeDollars).toBe(45);
    const cZero = hp.calcDeferredInterestVsBalanceTransfer(0, 12, 0, 29.9, 3, 24.9);
    expect(cZero.purchaseBalance).toBe(0);
    expect(cZero.safeBufferMonthly).toBe(0);
    expect(cZero.hitsRetroactiveCliff).toBe(false);
    expect(cZero.verdict).toBe('No Promo Balance Financed');
  });

  it('mounts decision, interviewstudio, budget, and credit Wave 23 simulators, coerces non-string messages, and reports Applied STEM Diagnostic Quizzes Solved in Overview', () => {
    let activeMount = null;
    try {
      // 1. Decision EVPI / Trial Inspection Value
      activeMount = mountInteractiveLifeSkills({
        tab: 'decision',
        decisionEvpiSyncMsg: { bad: 1 },
      });
      const evpiSim = activeMount.host.querySelector('[data-lifeskills-evpi-trial-sim="true"]');
      expect(evpiSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { evpiSim.querySelector('[data-lifeskills-evpi-sync-budget="true"]').click(); });
      expect(activeMount.getState().budgetExp?.Shopping).toBe(24);
      expect(activeMount.getState().decisionEvpiSyncMsg).toContain('Shopping');
      expect(activeMount.getState().badges?.decisionPro).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 2. Interview Studio Wage Negotiation Compounding
      activeMount = mountInteractiveLifeSkills({
        tab: 'interviewstudio',
        interviewNegSyncMsg: ['err'],
      });
      const negSim = activeMount.host.querySelector('[data-lifeskills-negotiation-comp-sim="true"]');
      expect(negSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { negSim.querySelector('[data-lifeskills-negotiation-sync="true"]').click(); });
      expect(activeMount.getState().budgetExp?.['Retirement/Savings']).toBe(208);
      expect(activeMount.getState().interviewFollowUpMessage).toContain('$21.00/hr');
      expect(activeMount.getState().interviewNegSyncMsg).toContain('Retirement/Savings');
      expect(activeMount.getState().badges?.interviewReady).toBeTruthy();
      expect(activeMount.getState().badges?.mockInterviewPro).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 3. Budget Raise Lifestyle-Creep Guard & Auto-Save Split
      activeMount = mountInteractiveLifeSkills({
        tab: 'budget',
        bgCreepSavePct: 25,
        budgetCreepSyncMsg: 999,
      });
      const creepSim = activeMount.host.querySelector('[data-lifeskills-lifestyle-creep-sim="true"]');
      expect(creepSim).toBeTruthy();
      React.act(() => { creepSim.querySelector('[data-lifeskills-creep-sync-budget="true"]').click(); });
      expect(activeMount.getState().bgCreepSavePct).toBe(50);
      expect(activeMount.getState().budgetExp?.['Retirement/Savings']).toBe(175);
      expect(activeMount.getState().budgetCreepSyncMsg).toContain('50%');
      expect(activeMount.getState().badges?.saver).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 4. Credit 0% Deferred-Interest Cliff Trap vs Early-Clear Autopay Shield
      activeMount = mountInteractiveLifeSkills({
        tab: 'credit',
        creditPromoSyncMsg: { bad: 2 },
      });
      const promoSim = activeMount.host.querySelector('[data-lifeskills-deferred-interest-sim="true"]');
      expect(promoSim).toBeTruthy();
      expect(activeMount.host.textContent).not.toContain('[object Object]');
      React.act(() => { promoSim.querySelector('[data-lifeskills-promo-sync-budget="true"]').click(); });
      expect(activeMount.getState().crPromoPlannedMo).toBe(137);
      expect(activeMount.getState().budgetExp?.Shopping).toBe(137);
      expect(activeMount.getState().creditPromoSyncMsg).toContain('Early-Clear');
      expect(activeMount.getState().badges?.creditWise).toBeTruthy();
      expect(activeMount.getState().badges?.loanCalc).toBeTruthy();
      expect(activeMount.getState().badges?.budgeteer).toBeTruthy();
      activeMount.unmount();
      activeMount = null;

      // 5. Overview Zero-PII Readiness Summary reports Applied STEM Diagnostic Quizzes Solved (default + populated)
      activeMount = mountInteractiveLifeSkills({ tab: 'overview' });
      const readinessDefault = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
      expect(readinessDefault).toBeTruthy();
      expect(readinessDefault.textContent).toContain('Applied STEM Diagnostic Quizzes Solved: 0/45 items (0/8 quizzes)');
      activeMount.unmount();
      activeMount = null;

      activeMount = mountInteractiveLifeSkills({
        tab: 'overview',
        dlScore: 3,
        homesysQuizScore: 2,
        foodSafetyScore: 4,
      });
      const readinessPop = activeMount.host.querySelector('[data-lifeskills-readiness-export="true"]');
      expect(readinessPop.textContent).toContain('Applied STEM Diagnostic Quizzes Solved: 9/45 items (3/8 quizzes)');
      activeMount.unmount();
      activeMount = null;
    } finally {
      activeMount?.unmount();
    }
  });

  it('supports All-30 3D Bays Operator Stance (button, S hotkey, 0 reset, WebGL isStancePad + Live Pulse + zero CapsuleGeometry, SVG 4 <line> pad with zero extra circles)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect((canonicalSrc.match(/CapsuleGeometry/g) || []).length).toBe(0);

    const mockThree = makeWave13MockThree();
    const builds = [];
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATHS[0], 'lifeSkills');
    window.StemLab.makeOrbitViewer = (orbitCfg) => ({
      attach: () => {},
      push: (next) => {
        const scene = new mockThree.Scene();
        const group = new mockThree.Group();
        scene.add(group);
        const S = { scene, model: group, rotY: next.rotY, tick: null };
        orbitCfg.build(mockThree, S, next);
        builds.push({ next, S, children: group.children });
      },
      onStatusChange: () => {},
      status: () => 'ready',
      debug: () => ({ state: 'ready', attr: orbitCfg.attr }),
      dispose: () => {},
    });

    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = ReactDOMClient.createRoot(hostEl);
    function Wave23StanceHarness() {
      const [toolData, setToolData] = React.useState({ lifeSkills: { tab: 'paycheck' } });
      return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
    }
    React.act(() => { root.render(React.createElement(Wave23StanceHarness)); });

    try {
      const bay = hostEl.querySelector('[data-lifeskills-3d-bay="paycheck"]');
      expect(bay).toBeTruthy();
      const baseCircleCount = bay.querySelectorAll('svg circle').length;
      const viewport = bay.querySelector('[data-lifeskills-3d-viewport="paycheck"]');
      const stanceBtn = bay.querySelector('[data-lifeskills-3d-stance="paycheck"]');
      const pulseBtn = bay.querySelector('[data-lifeskills-3d-pulse="paycheck"]');

      expect(stanceBtn).toBeTruthy();
      expect(stanceBtn.getAttribute('aria-pressed')).toBe('false');

      React.act(() => { stanceBtn.click(); });
      expect(stanceBtn.getAttribute('aria-pressed')).toBe('true');
      const stanceGroup = bay.querySelector('[data-lifeskills-3d-stance-pad]');
      expect(stanceGroup).toBeTruthy();
      expect(stanceGroup.querySelectorAll('line').length).toBe(4);
      expect(stanceGroup.querySelectorAll('circle').length).toBe(0);

      const banner = bay.querySelector('[data-lifeskills-3d-stance-banner="paycheck"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Operator Stance & ADA Reach Active');
      expect(banner.textContent).toContain('Posture Zone:');
      expect(banner.textContent).toContain('Reach Standoff:');
      expect(banner.textContent).toContain('Ergonomics:');
      expect(bay.querySelectorAll('svg circle').length).toBe(baseCircleCount);

      const stanceBuild = builds[builds.length - 1];
      expect(stanceBuild.next.stance).toBe(true);
      const stanceMeshes = stanceBuild.children.filter((m) => m.userData?.isStancePad);
      expect(stanceMeshes.length).toBe(3);
      for (const sm of stanceMeshes) expect(sm.userData.partId).toBeNull();

      React.act(() => { pulseBtn.click(); });
      const pulseBuild = builds[builds.length - 1];
      const pulseStanceMesh = pulseBuild.children.find((m) => m.userData?.isStancePad);
      expect(pulseStanceMesh).toBeTruthy();
      pulseBuild.S.tick(1000);
      pulseBuild.S.tick(1350);
      expect(pulseStanceMesh.scale.x).not.toBe(1);

      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 's', bubbles: true })); });
      expect(stanceBtn.getAttribute('aria-pressed')).toBe('false');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'S', bubbles: true })); });
      expect(stanceBtn.getAttribute('aria-pressed')).toBe('true');
      React.act(() => { viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0', bubbles: true })); });
      expect(stanceBtn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      React.act(() => { root.unmount(); });
      hostEl.remove();
    }
  });

  it('maintains exact 4-mirror byte parity across canonical and desktop build mirrors after Wave 24 (v5.42)', () => {
    const canonicalSrc = read(LIFESKILLS_PATHS[0]);
    expect(canonicalSrc).toMatch(/v5\.(4[2-9]|[5-9]\d)/);
    for (const mirrorPath of LIFESKILLS_PATHS.slice(1)) {
      expect(read(mirrorPath)).toBe(canonicalSrc);
    }
  });

  it('bounds calcCompoundInterest and calcLoanPayment against 1e9 loop hangs, invalid inputs, and Infinity/Infinity NaN (Wave 24 v5.42)', () => {
    const { calcCompoundInterest, calcLoanPayment } = loadPureSteamHelpers();

    const normalCi = calcCompoundInterest(1000, 7, 20, 100);
    expect(normalCi.contributed).toBe(25000);
    expect(normalCi.balance).toBeGreaterThan(50000);
    expect(normalCi.interest).toBe(normalCi.balance - normalCi.contributed);

    const normalLoan = calcLoanPayment(25000, 6.5, 5);
    expect(normalLoan.monthly).toBe(489);
    expect(normalLoan.totalPaid).toBeGreaterThan(25000);
    expect(normalLoan.totalInterest).toBe(normalLoan.totalPaid - 25000);

    const t0 = Date.now();
    const hugeCi = calcCompoundInterest(1000, 1e9, 1e9, 100);
    const hugeLoan = calcLoanPayment(25000, 1e9, 1e9);
    expect(Date.now() - t0).toBeLessThan(100);

    for (const r of [
      hugeCi,
      hugeLoan,
      calcCompoundInterest(0, 0, 0, 0),
      calcCompoundInterest(-5, NaN, 'abc', {}),
      calcCompoundInterest([{}], Infinity, -10, null),
      calcLoanPayment(0, 5, 5),
      calcLoanPayment(25000, 0, 0),
      calcLoanPayment('abc', NaN, -5),
      calcLoanPayment({}, [{}], Infinity),
    ]) {
      for (const v of Object.values(r)) {
        expect(typeof v).toBe('number');
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps _LS_TEXT_KEYS >= 207 unique ASCII-sorted keys and mounts credit, budget, insurance, and interviewstudio cleanly under hostile persisted state (Wave 24 v5.42)', () => {
    const src = read(LIFESKILLS_PATHS[0]);
    const m = src.match(/var _LS_TEXT_KEYS = \[([\s\S]*?)\];/);
    expect(m).toBeTruthy();
    const keys = vm.runInNewContext('[' + m[1] + ']', {});
    expect(keys.length).toBeGreaterThanOrEqual(207);
    expect(new Set(keys).size).toBe(keys.length);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1] < keys[i]).toBe(true);
    }
    for (const reqKey of [
      'badgeToast',
      'interviewMode',
      'interviewPlanGoal',
      'interviewRehearsalTargetId',
      'laundryCycle',
      'laundryMode',
      'laundryWater',
      'overviewFocus',
      'payFiling',
      'payFreq',
      'payState',
      'proofShareMode',
      'resumeRole',
    ]) {
      expect(keys).toContain(reqKey);
    }

    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      for (const [tab, extra] of [
        ['credit', { badgeToast: {}, lifeSkills3dStatus: NaN, creditRatings: [{}], ciYears: 1e9, ciPrincipal: 'abc', loanTerm: 1e9, loanRate: 1e9 }],
        ['budget', { badgeToast: {}, _budgetHunt: 'abc', budgetExp: 'bad', savingsGoal: {}, savingsMonthly: [{}] }],
        ['insurance', { badgeToast: {}, hiPlanA: {}, hiPlanB: [{}], hiUsage: {} }],
        ['interviewstudio', { badgeToast: {}, interviewPlanMinutes: NaN, interviewPlanGoal: {}, interviewPlanLog: [{}], interviewSuggestions: [{}], savedProofItems: [{}], interviewFollowUpMessage: {} }],
      ]) {
        const mounted = mountInteractiveLifeSkills(Object.assign({ tab }, extra));
        try {
          const text = mounted.host.textContent || '';
          expect(text).not.toContain('[object Object]');
          expect(text).not.toMatch(/\bNaN\b/);
          expect(text).not.toMatch(/\bundefined\b/);
        } finally {
          mounted.unmount();
        }
      }
      expect(consoleErr).not.toHaveBeenCalled();
    } finally {
      consoleErr.mockRestore();
    }
  });
});



