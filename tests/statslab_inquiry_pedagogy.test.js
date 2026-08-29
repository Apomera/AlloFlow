import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const canonicalPath = path.join(process.cwd(), 'stem_lab', 'stem_tool_statslab.js');
const mirrorPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_statslab.js');
const source = fs.readFileSync(canonicalPath, 'utf8');

function inquirySection() {
  const startMarker = "d.mode === 'inquiry' && (function()";
  const endMarker = '// Concept-mastery celebration overlay';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, 'missing Stats Lab inquiry start').toBeGreaterThanOrEqual(0);
  expect(end, 'missing Stats Lab inquiry end').toBeGreaterThan(start);
  return source.slice(start, end);
}

function inquiryState(overrides = {}) {
  return {
    effect: 0.5,
    alpha: 0.05,
    nGroup: 30,
    hypothesis: '',
    explanation: '',
    stuckRevealed: false,
    understood: false,
    log: [],
    ...overrides
  };
}

function renderInquiry(overrides = {}) {
  return renderTool('statsLab', {
    statsLab: {
      mode: 'inquiry',
      inquiry: inquiryState(overrides)
    }
  });
}

describe('Stats Lab power inquiry pedagogy', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_statslab.js', 'statsLab');
  });

  it('keeps the canonical and desktop copies identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });

  it('uses a continuous two-sided normal approximation instead of stepped alpha cutoffs', () => {
    const inquiry = inquirySection();

    expect(source).toContain('function _statsInquiryPowerModel(effect, alpha, nPerGroup)');
    expect(source).toContain('var criticalZ = _normalInv(1 - safeAlpha / 2);');
    expect(source).toContain('var upperTail = 1 - _normalCdf(criticalZ, ncp, 1);');
    expect(source).toContain('var lowerTail = _normalCdf(-criticalZ, ncp, 1);');
    expect(inquiry).not.toContain("iq.alpha <= 0.001 ? 3.29");
    expect(renderInquiry({ alpha: 0.07 })).toContain('Approximate power 55%');
  });

  it('states model limits and uses neutral power bands', () => {
    const inquiry = inquirySection();

    expect(inquiry).toContain("'data-statslab-power-model': 'two-sided-normal-z-approximation'");
    expect(inquiry).toContain("'data-statslab-model-boundary': 'conditional-power-not-replication-probability'");
    expect(inquiry).toContain('it is not the probability that a hypothesis is true or a guaranteed replication rate');
    expect(inquiry).toContain("'Very low modeled power'");
    expect(inquiry).toContain("'Very high modeled power'");
    expect(inquiry).toContain('precision, ethics, feasibility, and cost');
    expect(inquiry).not.toContain("'Overkill'");
    expect(inquiry).not.toContain('what is its replication probability?');
    expect(source).not.toContain('well-powered to wasteful');
  });

  it('requires distinct designs, prevents duplicate logs, and checks one-variable comparisons', () => {
    const inquiry = inquirySection();

    expect(inquiry).toContain("'data-statslab-live-inquiry': 'observe-log-explain'");
    expect(inquiry).toContain("'data-statslab-inquiry-credit': 'two-distinct-designs-plus-explanation'");
    expect(inquiry).toContain('var currentAlreadyLogged = !!loggedSignatures[currentSignature];');
    expect(inquiry).toContain('if (currentAlreadyLogged) return;');
    expect(inquiry).toContain('disabled: currentAlreadyLogged');
    expect(inquiry).toContain('var evidenceReady = distinctDesignCount >= 2;');
    expect(inquiry).toContain("'data-statslab-fair-test-check': fairTestState");
    expect(inquiry).toContain('var explanationComplete = evidenceReady && !!explanationText.trim();');
    expect(inquiry).toContain('no answer is scored for agreement');
    expect(inquiry).not.toMatch(/hypothesisCorrect|predictionCorrect|matchedPrediction/);
  });

  it('renders the initial live inquiry with explanation locked until evidence exists', () => {
    const html = renderInquiry();

    expect(html).toContain('data-statslab-live-inquiry="observe-log-explain"');
    expect(html).toContain('data-statslab-power-model="two-sided-normal-z-approximation"');
    expect(html).toContain('Approximate power is visible and updates live');
    expect(html).toContain('data-statslab-inquiry-progress="collect-evidence"');
    expect(html).toContain('Log two distinct designs before writing the explanation.');
    expect(html).toContain('aria-disabled="true"');
  });

  it('renders a one-variable two-design comparison as complete after explanation', () => {
    const html = renderInquiry({
      alpha: 0.07,
      nGroup: 60,
      explanation: 'Only sample size changed, and approximate power increased.',
      log: [
        { t: '10:00:00', effect: 0.5, alpha: 0.07, nGroup: 30, power: '55%', state: 'Low modeled power' },
        { t: '10:01:00', effect: 0.5, alpha: 0.07, nGroup: 60, power: '84%', state: 'High modeled power' }
      ]
    });

    expect(html).toContain('2/2 distinct designs');
    expect(html).toContain('data-statslab-fair-test-check="one-variable"');
    expect(html).toContain('Fair-test check: one control changed');
    expect(html).toContain('Participants per group');
    expect(html).toContain('data-statslab-inquiry-progress="complete"');
    expect(html).toContain('Evidence explanation recorded.');
    expect(html).toContain('no answer is scored for agreement');
    expect(html).toContain('aria-disabled="false"');
  });
});