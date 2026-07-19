import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_timeschedule.js';
const ID = 'timeSchedule';

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});

async function enterText(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Time & Schedule Lab', () => {
  it('registers and exposes strict, midnight-safe time helpers', () => {
    const tool = loadTool(FILE, ID);
    expect(tool.label).toBe('Time & Schedule Lab');
    expect(tool.category).toBe('math');

    const pure = window.TimeSchedulePure;
    expect(pure.norm(-1)).toBe(1439);
    expect(pure.norm(Infinity)).toBe(0);
    expect(pure.time12(0)).toBe('12:00 AM');
    expect(pure.time12(720)).toBe('12:00 PM');
    expect(pure.time24(1439)).toBe('23:59');
    expect(pure.parseTime('9:07 p.m.')).toBe(1267);
    expect(pure.parseDuration('1 h 15 m')).toBe(75);
    expect(pure.parseDuration('1:15')).toBe(75);
    expect(pure.parseDuration('-30 minutes')).toBeNull();
    expect(pure.parseDuration('1 hour bananas')).toBeNull();
    expect(pure.parseDuration('1 hour 15')).toBeNull();
  });

  it('enforces the representation requested by conversion questions', () => {
    loadTool(FILE, ID);
    const pure = window.TimeSchedulePure;
    expect(pure.checkAnswer('6:40 PM', 'time', 1120, '24')).toMatchObject({
      valid: false, formatOk: false, ok: false,
    });
    expect(pure.checkAnswer('18:40', 'time', 1120, '24')).toMatchObject({
      valid: true, formatOk: true, ok: true,
    });
    expect(pure.checkAnswer('00:15', 'time', 15, '12')).toMatchObject({
      valid: false, formatOk: false, ok: false,
    });
    expect(pure.checkAnswer('12:15 AM', 'time', 15, '12')).toMatchObject({
      valid: true, formatOk: true, ok: true,
    });
    expect(pure.scheduleQuestions(pure.schedules.school)[2]).toMatchObject({
      type: 'time', answerFormat: '24', answer: 685,
    });
  });

  it('builds friendly jumps across midnight in both directions', () => {
    loadTool(FILE, ID);
    const pure = window.TimeSchedulePure;
    expect(pure.makeJumps(1415, 50, 1)).toEqual([
      { from: 1415, to: 0, amount: 25 },
      { from: 0, to: 25, amount: 25 },
    ]);
    expect(pure.makeJumps(910, 55, -1)).toEqual([
      { from: 910, to: 900, amount: 10 },
      { from: 900, to: 855, amount: 45 },
    ]);
  });

  it('renders all four sections and complete ARIA tab semantics', () => {
    loadTool(FILE, ID);
    const expected = {
      clock: 'Set an exact time',
      elapsed: 'Text alternative: jump strategy',
      schedule: 'Schedule reasoning',
      challenge: 'Challenge 1 of',
    };
    for (const [tab, anchor] of Object.entries(expected)) {
      const html = renderTool(ID, { _timeSchedule: { tab } });
      expect(html).toContain('Time &amp; Schedule Lab');
      expect(html).toContain(anchor);
      expect(html).toContain('aria-controls="ts-tab-panel"');
      expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
      expect(html.match(/tabindex="-1"/g)).toHaveLength(3);
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    }
  });

  it('plots backward elapsed time from right to left', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _timeSchedule: {
        tab: 'elapsed', elapsedStart: 910, elapsedDuration: 55,
        elapsedDirection: -1, use24: true,
      },
    });
    expect(html).toContain('Earlier starting time');
    expect(html).toContain('14:15');
    expect(html).toContain('cx="665"');
    expect(html).toContain('cx="55"');
  });

  it('persists unique schedule solves and cannot farm XP after editing', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        outside: { keep: true },
        _timeSchedule: {
          tab: 'schedule', scheduleKey: 'school', scheduleQuestionIndex: 0,
          scheduleAnswer: '50',
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); });
    expect(latest._timeSchedule.scheduleSolvedKeys['school:0']).toBe(true);
    expect(latest._timeSchedule.scheduleSolved).toBe(1);
    expect(awardXP).toHaveBeenCalledWith('timeSchedule', 5, 'schedule reasoning');

    const input = document.querySelector('input[type="text"]');
    await enterText(input, '50 ');
    await React.act(async () => { check.click(); });
    expect(latest._timeSchedule.scheduleSolved).toBe(1);
    expect(latest.outside).toEqual({ keep: true });
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });

  it('rejects the wrong conversion form, then scores the strict answer once', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _timeSchedule: { tab: 'challenge', challengeIndex: 3, challengeAnswer: '6:40 PM' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); });
    expect(document.body.textContent).toContain('Use 24-hour form');
    expect(awardXP).not.toHaveBeenCalled();

    const input = document.querySelector('input[type="text"]');
    await enterText(input, '18:40');
    await React.act(async () => { check.click(); });
    expect(latest._timeSchedule.solvedChallenges['3']).toBe(true);
    expect(latest._timeSchedule.score).toEqual({ correct: 1, total: 1 });
    expect(awardXP).toHaveBeenCalledWith('timeSchedule', 5, 'time challenge');
    await React.act(async () => { root.unmount(); });
  });

  it('is wired into the host catalog, plugin allowlist, lazy loader, and deployment mirrors', () => {
    const host = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const deployedHost = fs.readFileSync('prismflow-deploy/public/stem_lab/stem_lab_module.js', 'utf8');
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(host).toContain("id: 'timeSchedule'");
    expect(host).toContain('timeSchedule: true');
    expect(deployedHost).toBe(host);
    expect(app).toContain("'stem_lab/stem_tool_timeschedule.js'");
  });
});
