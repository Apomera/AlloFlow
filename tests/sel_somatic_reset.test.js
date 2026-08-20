import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, loadSelTool, makeCtx, renderSelTool } from './helpers/sel_tool_harness.js';

const TOOL_FILE = resolve(process.cwd(), 'sel_hub/sel_tool_somaticreset.js');
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));

beforeAll(() => {
  loadSelTool('sel_tool_somaticreset.js');
});

describe('Body & Breath Reset plugin', () => {
  it('registers as a light, self-regulation SEL tool', () => {
    const tool = window.SelHub._registry.somaticReset;
    expect(tool).toBeTruthy();
    expect(tool.label).toBe('Body & Breath Reset');
    expect(tool.category).toBe('self-regulation');
    expect(tool.lightBackground).toBe(true);
  });

  it('renders a choice-based body-zone check-in with a clear care boundary', () => {
    const html = renderSelTool('somaticReset', { gradeBand: 'middle' });
    expect(html).toContain('Where would a little more comfort help?');
    expect(html).toContain('Body-zone check-in');
    expect(html).toContain('Whole body / not sure');
    expect(html).toContain('not an assessment');
    expect(html).toContain('Skip the number');
    expect(html).toContain('new or worsening pain');
    expect(html).toContain('does not assess posture');
  });

  it('lets students skip a numeric check-in without presenting a synthetic score', () => {
    const checkin = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'checkin',
          pre: 8,
          preSkipped: true,
          logs: []
        }
      }
    });
    expect(checkin).toContain('Number skipped');
    expect(checkin).toContain('Use a number instead');
    expect(checkin).toContain('word-based reflection choices');
    expect(checkin).not.toContain('id="somatic-reset-before"');

    const summary = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'summary',
          pre: 8,
          post: 2,
          preSkipped: true,
          postSkipped: true,
          response: 'more_settled',
          logs: []
        }
      }
    });
    expect(summary).toContain('Reset complete.');
    expect(summary).toContain('A number is optional.');
    expect(summary.match(/Skipped/g)?.length).toBe(2);
    expect(summary).not.toContain('moved down by 6');
  });

  it.each([
    ['choose', 'Choose a reset for'],
    ['setup', 'Still option'],
    ['practice', 'role="timer"'],
    ['after', 'Notice, without grading yourself'],
    ['summary', 'Reset recorded']
  ])('renders the %s workflow state without degrading', (view, marker) => {
    const html = renderSelTool('somaticReset', {
      gradeBand: 'elementary',
      toolData: {
        somaticReset: {
          view,
          selectedZone: 'neck_shoulders',
          selectedProtocol: 'shoulder_soften',
          pre: 7,
          post: 4,
          response: 'more_settled',
          logs: []
        }
      }
    });
    expect(html).toContain(marker);
    expect(html.length).toBeGreaterThan(800);
  });

  it('keeps visual and sound choices available during practice', () => {
    const html = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'ripples',
          soundEnabled: false
        }
      }
    });
    expect(html).toContain('Practice options');
    expect(html).toContain('Breathing circle');
    expect(html).toContain('Soft ripples');
    expect(html).toContain('Focus glow');
    expect(html).toContain('Flowing wave');
    expect(html).toContain('Petal bloom');
    expect(html).toContain('Grounding horizon');
    expect(html).toContain('No visual');
    expect(html).toContain('Visual motion');
    expect(html).toContain('Large visual: off');
    expect(html).toContain('Breath count: on');
    expect(html).toContain('Sound cue: off');
    expect(html).toContain('aria-pressed="true"');
  });

  it('supports a fully steady, natural-breathing practice', () => {
    const html = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'none',
          pacedBreathing: false,
          soundEnabled: false
        }
      }
    });
    expect(html).toContain('Visual guide off');
    expect(html).toContain('Use the timer, sound cue, or no guide at all.');
    expect(html).toContain('Breath count: off');
    expect(html).toContain('Start when you are ready');
    expect(html).not.toContain('Breathe in gently');
  });

  it.each([
    ['wave', 'Flowing wave'],
    ['flower', 'Petal bloom'],
    ['horizon', 'Grounding horizon']
  ])('renders the %s visual as a named, theme-native guide', (visualMode, label) => {
    const html = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode,
          visualMotion: 'gentle'
        }
      }
    });
    expect(html).toContain(`data-visual-mode="${visualMode}"`);
    expect(html).toContain('data-visual-motion="gentle"');
    expect(html).toContain(`${label}. Breathe in gently`);
    expect(html).toContain('<svg');
  });

  it('previews the selected visual during setup and honors reduced motion', () => {
    const setup = renderSelTool('somaticReset', {
      theme: { reduceMotion: true },
      toolData: {
        somaticReset: {
          view: 'setup',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'flower',
          visualMotion: 'full'
        }
      }
    });
    expect(setup).toContain('data-visual-mode="flower"');
    expect(setup).toContain('data-visual-size="preview"');
    expect(setup).toContain('data-visual-motion="still"');
    expect(setup).toContain('System reduced motion keeps it still.');
    expect(setup).toContain('disabled=""');
  });

  it('changes visual motion and size from the live practice controls', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const announcements = [];

    function VisualHost() {
      const [toolData, setToolData] = React.useState({
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'wave',
          visualMotion: 'gentle',
          visualExpanded: false,
          soundEnabled: false
        }
      });
      const ctx = Object.assign({}, makeCtx({ toolData }), {
        toolData,
        announceToSR(message) { announcements.push(message); },
        updateMulti(id, patch) {
          setToolData((previous) => ({
            ...previous,
            [id]: { ...(previous[id] || {}), ...patch }
          }));
        }
      });
      return window.SelHub.renderTool('somaticReset', ctx);
    }

    const root = createRoot(host);
    try {
      await React.act(async () => { root.render(React.createElement(VisualHost)); });
      const motion = host.querySelector('select');
      expect(motion?.value).toBe('gentle');
      await React.act(async () => {
        motion.value = 'full';
        motion.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const large = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Large visual: off');
      await React.act(async () => { large.click(); });
      const visual = host.querySelector('[data-visual-mode="wave"]');
      expect(visual?.getAttribute('data-visual-motion')).toBe('full');
      expect(visual?.getAttribute('data-visual-size')).toBe('large');
      expect(host.textContent).toContain('Large visual: on');
      expect(announcements).toContain('Visual motion set to full.');
      expect(announcements).toContain('Large visual size selected.');

      const responsiveMarkup = renderSelTool('somaticReset', {
        toolData: {
          somaticReset: {
            view: 'practice',
            selectedProtocol: 'shoulder_soften',
            visualMode: 'wave',
            visualExpanded: true
          }
        }
      });
      expect(responsiveMarkup).toContain('width:min(270px, 78vw)');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });

  it('supports a repeat practice while preserving a fresh before check-in', () => {
    const html = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'checkin',
          selectedZone: 'head_face',
          selectedProtocol: 'jaw_rest',
          repeatProtocol: 'jaw_rest',
          pre: 4,
          logs: []
        }
      }
    });
    expect(html).toContain('Ready to repeat');
    expect(html).toContain('Jaw &amp; Face Rest');
    expect(html).toContain('a number or a skip');
    expect(html).toContain('Continue with Jaw &amp; Face Rest');
  });

  it('moves a saved reset through a fresh check-in and focuses each new view', async () => {
    const savedLog = {
      id: 'repeat_one',
      protocolId: 'jaw_rest',
      protocolName: 'Jaw & Face Rest',
      zoneId: 'head_face',
      zoneLabel: 'Head & face',
      pre: 6,
      post: 3,
      shift: 3,
      response: 'more_settled',
      durationSec: 60,
      completedAt: '2026-08-20T12:00:00.000Z'
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    function InteractiveHost() {
      const [toolData, setToolData] = React.useState({
        somaticReset: { view: 'history', logs: [savedLog] }
      });
      const ctx = Object.assign({}, makeCtx({ toolData }), {
        toolData,
        updateMulti(id, patch) {
          setToolData((previous) => ({
            ...previous,
            [id]: { ...(previous[id] || {}), ...patch }
          }));
        }
      });
      return window.SelHub.renderTool('somaticReset', ctx);
    }

    const root = createRoot(host);
    try {
      await React.act(async () => { root.render(React.createElement(InteractiveHost)); });
      const replay = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Use for a new check-in');
      expect(replay).toBeTruthy();

      await React.act(async () => { replay.click(); });
      expect(host.textContent).toContain('Ready to repeat');
      expect(host.textContent).toContain('Continue with Jaw & Face Rest');
      expect(document.activeElement?.textContent).toBe('Body and breath check-in');

      const continueButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Continue with Jaw & Face Rest');
      await React.act(async () => { continueButton.click(); });
      expect(host.textContent).toContain('Open practice timer');
      expect(document.activeElement?.textContent).toBe('Jaw & Face Rest setup');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });

  it('announces optional-rating changes and restores the slider on request', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const announcements = [];

    function RatingHost() {
      const [toolData, setToolData] = React.useState({
        somaticReset: { view: 'checkin', pre: 6, logs: [] }
      });
      const ctx = Object.assign({}, makeCtx({ toolData }), {
        toolData,
        announceToSR(message) { announcements.push(message); },
        updateMulti(id, patch) {
          setToolData((previous) => ({
            ...previous,
            [id]: { ...(previous[id] || {}), ...patch }
          }));
        }
      });
      return window.SelHub.renderTool('somaticReset', ctx);
    }

    const root = createRoot(host);
    try {
      await React.act(async () => { root.render(React.createElement(RatingHost)); });
      expect(host.querySelector('#somatic-reset-before')).toBeTruthy();
      const skip = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Skip the number');
      await React.act(async () => { skip.click(); });
      expect(host.querySelector('#somatic-reset-before')).toBeNull();
      expect(host.textContent).toContain('Number skipped');
      expect(announcements).toContain('Before number skipped. You can continue without a rating.');
      expect(document.activeElement?.textContent).toBe('Use a number instead');

      const restore = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Use a number instead');
      await React.act(async () => { restore.click(); });
      expect(host.querySelector('#somatic-reset-before')).toBeTruthy();
      expect(announcements).toContain('Before rating slider restored.');
      expect(document.activeElement?.textContent).toBe('Skip the number');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });

  it('saves skipped ratings as null instead of zero', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let latestToolData;

    function SaveHost() {
      const [toolData, setToolData] = React.useState({
        somaticReset: {
          view: 'after',
          selectedZone: 'head_face',
          selectedProtocol: 'jaw_rest',
          pre: 9,
          post: 1,
          preSkipped: true,
          postSkipped: true,
          response: 'more_settled',
          logs: []
        }
      });
      latestToolData = toolData;
      const ctx = Object.assign({}, makeCtx({ toolData }), {
        toolData,
        updateMulti(id, patch) {
          setToolData((previous) => ({
            ...previous,
            [id]: { ...(previous[id] || {}), ...patch }
          }));
        }
      });
      return window.SelHub.renderTool('somaticReset', ctx);
    }

    const root = createRoot(host);
    try {
      await React.act(async () => { root.render(React.createElement(SaveHost)); });
      const save = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Save private reflection');
      await React.act(async () => { save.click(); });
      expect(latestToolData.somaticReset.logs).toHaveLength(1);
      expect(latestToolData.somaticReset.logs[0]).toMatchObject({ pre: null, post: null, shift: null });
      expect(host.textContent).toContain('Reset complete.');
      expect(host.textContent).toContain('Skipped');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });

  it('advances from an absolute deadline and stays fixed while paused', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const ctx = makeCtx({
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          soundEnabled: false
        }
      }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function TimerHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });
      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      await React.act(async () => { vi.advanceTimersByTime(1250); });
      expect(host.querySelector('[role="timer"]')?.textContent).toBe('0:59');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      const pausedAt = host.querySelector('[role="timer"]')?.textContent;
      await React.act(async () => { vi.advanceTimersByTime(5000); });
      expect(host.querySelector('[role="timer"]')?.textContent).toBe(pausedAt);
      expect(host.textContent).toContain('Resume');

      const restart = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Restart timer');
      expect(restart.disabled).toBe(false);
      await React.act(async () => { restart.click(); });
      expect(host.querySelector('[role="timer"]')?.textContent).toBe('1:00');
      expect(host.textContent).toContain('Start');
      expect(restart.disabled).toBe(true);
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('renders private history and reports ratings as self-observation, not diagnosis', () => {
    const html = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'history',
          logs: [{
            id: 'reset_test',
            protocolId: 'jaw_rest',
            protocolName: 'Jaw & Face Rest',
            zoneId: 'head_face',
            zoneLabel: 'Head & face',
            pre: 6,
            post: 3,
            shift: 3,
            response: 'more_settled',
            durationSec: 60,
            completedAt: '2026-08-20T12:00:00.000Z'
          }]
        }
      }
    });
    expect(html).toContain('Your private reset history');
    expect(html).toContain('Jaw &amp; Face Rest');
    expect(html).toContain('6');
    expect(html).toContain('3');
    expect(html).toContain('not a diagnosis');
    expect(html).toContain('Use for a new check-in');
    expect(html).toContain('Remove all history');
    expect(html).toContain('Remove Jaw &amp; Face Rest history entry');
  });

  it('requires accessible confirmation before removing a private history entry', async () => {
    const savedLog = {
      id: 'remove_one',
      protocolId: 'jaw_rest',
      protocolName: 'Jaw & Face Rest',
      zoneId: 'head_face',
      zoneLabel: 'Head & face',
      pre: 6,
      post: 3,
      shift: 3,
      response: 'more_settled',
      durationSec: 60,
      completedAt: '2026-08-20T12:00:00.000Z'
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const announcements = [];

    function HistoryHost() {
      const [toolData, setToolData] = React.useState({
        somaticReset: { view: 'history', logs: [savedLog] }
      });
      const ctx = Object.assign({}, makeCtx({ toolData }), {
        toolData,
        announceToSR(message) { announcements.push(message); },
        updateMulti(id, patch) {
          setToolData((previous) => ({
            ...previous,
            [id]: { ...(previous[id] || {}), ...patch }
          }));
        }
      });
      return window.SelHub.renderTool('somaticReset', ctx);
    }

    const root = createRoot(host);
    try {
      await React.act(async () => { root.render(React.createElement(HistoryHost)); });
      const remove = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Remove');
      expect(remove?.getAttribute('aria-label')).toBe('Remove Jaw & Face Rest history entry');
      await React.act(async () => { remove.click(); });
      let dialog = host.querySelector('[role="alertdialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain('This cannot be undone.');
      expect(document.activeElement?.textContent).toBe('Cancel');

      await React.act(async () => {
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(host.querySelector('[role="alertdialog"]')).toBeNull();
      expect(document.activeElement).toBe(remove);

      await React.act(async () => { remove.click(); });
      dialog = host.querySelector('[role="alertdialog"]');
      const confirm = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Remove entry');
      await React.act(async () => { confirm.click(); });
      expect(host.textContent).toContain('No reset reflections saved yet.');
      expect(host.querySelector('[role="alertdialog"]')).toBeNull();
      expect(document.activeElement?.id).toBe('somatic-reset-history-title');
      expect(announcements).toContain('Private reset history entry removed.');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });

  it('summarizes repeated history as a cautious personal pattern', () => {
    const logs = [
      { id: 'one', protocolId: 'jaw_rest', protocolName: 'Jaw & Face Rest', zoneId: 'head_face', zoneLabel: 'Head & face', pre: 6, post: 3, shift: 3, response: 'more_settled', durationSec: 60, completedAt: '2026-08-20T12:00:00.000Z' },
      { id: 'two', protocolId: 'jaw_rest', protocolName: 'Jaw & Face Rest', zoneId: 'head_face', zoneLabel: 'Head & face', pre: 5, post: 4, shift: 1, response: 'about_same', durationSec: 60, completedAt: '2026-08-19T12:00:00.000Z' },
      { id: 'three', protocolId: 'jaw_rest', protocolName: 'Jaw & Face Rest', zoneId: 'head_face', zoneLabel: 'Head & face', pre: 4, post: 5, shift: -1, response: 'more_activated', durationSec: 60, completedAt: '2026-08-18T12:00:00.000Z' }
    ];
    const html = renderSelTool('somaticReset', {
      toolData: { somaticReset: { view: 'history', logs } }
    });
    expect(html).toContain('Personal pattern (not a conclusion)');
    expect(html).toContain('2 of 3 comparable ratings were lower afterward');
    expect(html).toContain('not proof or a treatment result');
  });

  it('keeps mixed rated and unrated history honest and uses word-based responses', () => {
    const logs = [
      { id: 'rated', protocolId: 'shoulder_soften', protocolName: 'Shoulder Softening', zoneId: 'neck_shoulders', zoneLabel: 'Neck & shoulders', pre: 7, post: 5, shift: 2, response: 'about_same', durationSec: 60, completedAt: '2026-08-20T12:00:00.000Z' },
      { id: 'skip-one', protocolId: 'jaw_rest', protocolName: 'Jaw & Face Rest', zoneId: 'head_face', zoneLabel: 'Head & face', pre: null, post: null, shift: null, response: 'more_settled', durationSec: 60, completedAt: '2026-08-19T12:00:00.000Z' },
      { id: 'skip-two', protocolId: 'jaw_rest', protocolName: 'Jaw & Face Rest', zoneId: 'head_face', zoneLabel: 'Head & face', pre: null, post: null, shift: null, response: 'more_settled', durationSec: 60, completedAt: '2026-08-18T12:00:00.000Z' },
      { id: 'skip-three', protocolId: 'jaw_rest', protocolName: 'Jaw & Face Rest', zoneId: 'head_face', zoneLabel: 'Head & face', pre: null, post: null, shift: null, response: 'not_sure', durationSec: 60, completedAt: '2026-08-17T12:00:00.000Z' }
    ];
    const html = renderSelTool('somaticReset', {
      toolData: { somaticReset: { view: 'history', logs } }
    });
    expect(html).toContain('Down 2.0');
    expect(html).toContain('Average rating shift (1 rated)');
    expect(html).toContain('Rating skipped');
    expect(html).toContain('you marked More settled in 2 of them');
    expect(html).not.toContain('null');
  });

  it('uses a deadline-based timer and moves focus when workflow views change', () => {
    const source = readFileSync(TOOL_FILE, 'utf8');
    expect(source).toContain('deadlineRef.current = Date.now() + next * 1000');
    expect(source).toContain('window.setInterval(syncRemaining, 250)');
    expect(source).toContain('viewHeadingRef.current.focus()');
    expect(source).toContain("tabIndex: -1");
  });

  it('does not bring direct AI keys, image analysis, microphone capture, or localStorage into the plugin', () => {
    const source = readFileSync(TOOL_FILE, 'utf8');
    expect(source).not.toContain('generativelanguage.googleapis.com');
    expect(source).not.toContain('callGeminiVision');
    expect(source).not.toContain('callGemini(');
    expect(source).not.toContain('getUserMedia');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('apiKey');
  });

  it('keeps the desktop public plugin mirror identical to the source', () => {
    const source = readFileSync(TOOL_FILE, 'utf8');
    const publicCopy = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_somaticreset.js'), 'utf8');
    expect(publicCopy).toBe(source);
  });
});

describe('Body & Breath Reset hub integration', () => {
  it('is discoverable in the catalog, Calm Down pathway, standards map, loader, and build list', () => {
    const hub = readFileSync(resolve(process.cwd(), 'sel_hub/sel_hub_module.js'), 'utf8');
    const standards = readFileSync(resolve(process.cwd(), 'sel_hub/sel_standards_alignment.js'), 'utf8');
    const publicHub = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_hub_module.js'), 'utf8');
    const publicStandards = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_standards_alignment.js'), 'utf8');
    const loader = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const desktopLoader = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/App.jsx'), 'utf8');
    const build = readFileSync(resolve(process.cwd(), 'build.js'), 'utf8');

    expect(hub).toContain("id: 'somaticReset'");
    expect(hub).toMatch(/calm_down[\s\S]{0,260}somaticReset/);
    expect(hub).toContain('Visuals can be previewed, enlarged, made still, or turned off');
    expect(hub).toContain('number ratings are optional');
    expect(hub).toContain('never require ratings');
    expect(standards).toContain("'somaticReset': {");
    expect(standards).toContain('user-controlled motion');
    expect(standards).toContain('optional ratings, no-count and no-visual modes');
    expect(loader).toContain('sel_hub/sel_tool_somaticreset.js');
    expect(desktopLoader).toContain('sel_hub/sel_tool_somaticreset.js');
    expect(build).toContain('sel_hub/sel_tool_somaticreset.js');
    expect(publicHub).toBe(hub);
    expect(publicStandards).toBe(standards);
  });
});
