import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const canonicalPath = path.join(process.cwd(), 'stem_lab', 'stem_tool_atctower.js');
const mirrorPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_atctower.js');
const source = fs.readFileSync(canonicalPath, 'utf8');

function activeOpsSection() {
  const startMarker = "atcMenuPanel === 'ops' && (function()";
  const endMarker = "atcMenuPanel === 'lessons' && h('div'";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, 'missing active Ops Lab start').toBeGreaterThanOrEqual(0);
  expect(end, 'missing active Ops Lab end').toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('ATC Tower live-model inquiry pedagogy', () => {
  beforeEach(() => resetStemLab());

  it('keeps the canonical and desktop copies identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });

  it('labels the visible result as a bounded live model, not a hidden prediction', () => {
    const ops = activeOpsSection();

    expect(ops).toContain("'data-atctower-live-inquiry': 'observe-log-explain'");
    expect(ops).toContain("'data-atctower-inquiry-label': 'live-evidence'");
    expect(ops).toContain("'data-atctower-live-load': 'visible-model-output'");
    expect(ops).toContain("'data-atctower-model-boundary': 'simplified-weighted-index'");
    expect(ops).toContain("'data-atctower-investigation-prompts': 'scaffold-only'");
    expect(ops).toContain('stem.atctower.show_investigation_prompts');
    expect(ops).toContain('not a prediction quiz');
    expect(ops).toContain('It does not configure the tower shift or predict real-airport safety.');
    expect(ops).toContain("'Aircraft arrival interval'");
    expect(ops).toContain("'Decision window'");
    expect(source).not.toContain('Your hypothesis (what combo do you expect to break ops first?)');
    expect(source).not.toContain('Predicted load');
    expect(source).not.toContain('no score, no reveal');
  });

  it('requires distinct logged evidence and checks whether one variable changed', () => {
    const ops = activeOpsSection();

    expect(ops).toContain("'data-atctower-inquiry-credit': 'two-distinct-logs-plus-explanation'");
    expect(ops).toContain('var currentAlreadyLogged = !!loggedSignatures[currentSignature];');
    expect(ops).toContain('if (currentAlreadyLogged) return;');
    expect(ops).toContain('disabled: currentAlreadyLogged');
    expect(ops).toContain('var evidenceReady = distinctLogCount >= 2;');
    expect(ops).toContain("'data-atctower-fair-test-check': fairTestState");
    expect(ops).toContain("changedControls.length === 1");
    expect(ops).toContain('var explanationComplete = evidenceReady && !!explanationText.trim();');
    expect(ops).toContain('no answer is scored for agreement');
    expect(ops).not.toMatch(/predictionCorrect|hypothesisCorrect|matchedPrediction/);
  });

  it('renders the initial Ops Lab as collect-evidence with its explanation disabled', () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const html = renderTool('atcTower', {
      atcTower: {
        view: 'menu',
        atcMenuPanel: 'ops',
        opsControl: {
          wind: 10,
          spawn: 5,
          sep: 8,
          descent: 1,
          timeout: 30,
          hypothesis: '',
          explanation: '',
          log: []
        }
      }
    });

    expect(html).toContain('data-atctower-live-inquiry="observe-log-explain"');
    expect(html).toContain('Live modeled load');
    expect(html).toContain('observe–log–explain investigation');
    expect(html).toContain('data-atctower-inquiry-progress="collect-evidence"');
    expect(html).toContain('Log two distinct setups before writing the explanation.');
    expect(html).toContain('aria-disabled="true"');
  });

  it('renders a one-variable, two-log comparison as complete after explanation', () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const html = renderTool('atcTower', {
      atcTower: {
        view: 'menu',
        atcMenuPanel: 'ops',
        opsControl: {
          wind: 20,
          spawn: 5,
          sep: 8,
          descent: 1,
          timeout: 30,
          hypothesis: '',
          explanation: 'Only wind changed, and the live modeled load increased.',
          log: [
            { t: '10:00:00', wind: 10, spawn: 5, sep: 8, descent: 1, timeout: 30, state: 'Training' },
            { t: '10:01:00', wind: 20, spawn: 5, sep: 8, descent: 1, timeout: 30, state: 'Operational' }
          ]
        }
      }
    });

    expect(html).toContain('2/2 distinct setups');
    expect(html).toContain('data-atctower-fair-test-check="one-variable"');
    expect(html).toContain('Fair-test check: one control changed');
    expect(html).toContain('data-atctower-inquiry-progress="complete"');
    expect(html).toContain('Evidence explanation recorded.');
    expect(html).toContain('no answer is scored for agreement');
    expect(html).toContain('aria-disabled="false"');
  });
});