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
    expect(html).toContain('Breath path');
    expect(html).toContain('Breath orbit');
    expect(html).toContain('No visual');
    expect(html).toContain('data-visual-picker="true"');
    expect(html).toContain('data-visual-select="true"');
    expect(html).toContain('aria-describedby="somatic-reset-visual-description"');
    expect(html).toContain('data-visual-description="ripples"');
    expect(html).toContain('Visual motion');
    expect(html).toContain('Large visual: off');
    expect(html).toContain('Quiet view');
    expect(html).toContain('Breath count: on');
    expect(html).toContain('Sound cue: off');
    expect(html).toContain('Countdown: shown');
    expect(html).toContain('Guidance words');
    expect(html).toContain('Full cue');
    expect(html).toContain('Phase only');
    expect(html).toContain('data-guidance-mode-select="true"');
    expect(html).toContain('data-guidance-mode="full"');
    expect(html).toContain('data-guidance-description="full"');
    expect(html).toContain('data-guidance-visible="true"');
    expect(html).toContain('data-guidance-cue="visible"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('data-session-progress="0"');
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

  it('can hide visual time pressure without disabling the reliable timer', () => {
    const html = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          showTimer: false,
          soundEnabled: false
        }
      }
    });
    expect(html).toContain('data-timer-visible="false"');
    expect(html).toContain('Countdown: hidden');
    expect(html).toContain('Countdown hidden. This practice will still finish automatically.');
    expect(html).toContain('data-countdown-hidden="true"');
    expect(html).toContain('role="timer"');
    expect(html).not.toContain('role="progressbar"');
  });

  it('can hide guidance words while preserving an accessible phase cue', () => {
    const html = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          showGuidance: false,
          soundEnabled: false
        }
      }
    });
    expect(html).toContain('data-guidance-visible="false"');
    expect(html).toContain('data-guidance-mode="hidden"');
    expect(html).toContain('data-guidance-description="hidden"');
    expect(html).toContain('Keeps visible words off while screen-reader phase cues remain on.');
    expect(html).toContain('data-guidance-cue="hidden"');
    expect(html).toContain('Optional breath guide is ready');
    expect(html).toContain('data-breath-phase-announcer="ready"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('clip-path:inset(50%)');
  });

  it('offers a phase-only cue that takes precedence over the legacy show flag', () => {
    const html = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          guidanceMode: 'phase',
          showGuidance: false,
          soundEnabled: false
        }
      }
    });
    const host = document.createElement('div');
    host.innerHTML = html;
    const selector = host.querySelector('select[data-guidance-mode-select="true"]');
    const cue = host.querySelector('[data-guidance-detail="phase"]');
    expect(selector?.value).toBe('phase');
    expect(host.querySelector('[data-guidance-mode="phase"]')).toBeTruthy();
    expect(host.querySelector('[data-guidance-visible="true"]')).toBeTruthy();
    expect(cue?.getAttribute('data-guidance-cue')).toBe('visible');
    expect(cue?.textContent).toBe('Ready');
    expect(host.textContent).toContain('Shows only In, Out, Ready, or Paused.');
  });

  it('updates phase-only words across inhale, exhale, and pause states', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const announcements = [];
    const toolData = {
      somaticReset: {
        view: 'practice',
        selectedProtocol: 'shoulder_soften',
        visualMode: 'path',
        guidanceMode: 'phase',
        soundEnabled: false
      }
    };
    const ctx = Object.assign({}, makeCtx({ toolData }), {
      toolData,
      announceToSR(message) { announcements.push(message); }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function PhaseCueHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });
      expect(host.querySelector('[data-guidance-detail="phase"]')?.textContent).toBe('Ready');

      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      expect(host.querySelector('[data-guidance-detail="phase"]')?.textContent).toBe('In');
      expect(host.querySelector('[data-guidance-phase="in"]')).toBeTruthy();

      await React.act(async () => { vi.advanceTimersByTime(4250); });
      expect(host.querySelector('[data-guidance-detail="phase"]')?.textContent).toBe('Out');
      expect(host.querySelector('[data-guidance-phase="out"]')).toBeTruthy();

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      expect(host.querySelector('[data-guidance-detail="phase"]')?.textContent).toBe('Paused');
      expect(host.querySelector('[data-guidance-phase="paused"]')).toBeTruthy();
      expect(announcements).toContain('Practice started.');
      expect(announcements).toContain('Practice paused.');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it.each([
    ['circle', 'Breathing circle'],
    ['wave', 'Flowing wave'],
    ['flower', 'Petal bloom'],
    ['horizon', 'Grounding horizon'],
    ['path', 'Breath path'],
    ['orbit', 'Breath orbit']
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
    expect(html).toContain('data-visual-phase="ready"');
    expect(html).toContain('data-visual-phase-label="Ready"');
    expect(html).toContain('data-visual-cadence="4-6-seconds"');
    expect(html).toContain('aria-roledescription="breathing visual guide"');
    expect(html).toContain(`${label}. Ready. Cadence: 4 seconds in, 6 seconds out.`);
    expect(html).toContain('<svg');
  });

  it('previews the phase- and pattern-coded Breathing Circle without starting the timer', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const toolData = {
      somaticReset: {
        view: 'setup',
        selectedProtocol: 'shoulder_soften',
        visualMode: 'circle',
        visualMotion: 'gentle',
        pacedBreathing: true,
        soundEnabled: false
      }
    };
    const ctx = makeCtx({ toolData });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function CirclePreviewHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });

      const readyCircle = host.querySelector('[data-breath-circle="true"]');
      expect(readyCircle?.getAttribute('data-circle-phase')).toBe('steady');
      expect(readyCircle?.getAttribute('data-circle-session-state')).toBe('ready');
      expect(readyCircle?.getAttribute('data-circle-line-pattern')).toBe('steady');
      expect(readyCircle?.getAttribute('data-circle-center-shape')).toBe('dot');
      expect(readyCircle?.querySelector('[data-circle-phase-cue="true"]')?.textContent).toBe('READY');
      expect(host.querySelector('[role="timer"]')).toBeNull();

      const preview = host.querySelector('button[data-visual-preview-toggle="true"]');
      await React.act(async () => { preview.click(); });
      const inhaleCircle = host.querySelector('[data-breath-circle="true"]');
      expect(inhaleCircle?.getAttribute('data-circle-phase')).toBe('in');
      expect(inhaleCircle?.getAttribute('data-circle-line-pattern')).toBe('solid');
      expect(inhaleCircle?.getAttribute('data-circle-center-shape')).toBe('circle');
      expect(inhaleCircle?.getAttribute('data-circle-phase-progress')).toBe('100');
      expect(inhaleCircle?.querySelector('[data-circle-main-ring="true"]')?.getAttribute('data-circle-main-pattern')).toBe('solid');
      expect(inhaleCircle?.querySelector('[data-circle-marker-core="circle"]')).toBeTruthy();
      expect(inhaleCircle?.querySelector('[data-circle-phase-cue="true"]')?.textContent).toBe('IN · EXPAND');
      expect(inhaleCircle?.querySelector('[data-circle-phase-cue="true"]')?.getAttribute('data-circle-cue-emphasis')).toBe('underlined');

      await React.act(async () => { vi.advanceTimersByTime(4000); });
      const exhaleCircle = host.querySelector('[data-breath-circle="true"]');
      expect(exhaleCircle?.getAttribute('data-circle-phase')).toBe('out');
      expect(exhaleCircle?.getAttribute('data-circle-line-pattern')).toBe('dotted');
      expect(exhaleCircle?.getAttribute('data-circle-center-shape')).toBe('diamond');
      expect(exhaleCircle?.getAttribute('data-circle-phase-progress')).toBe('100');
      expect(exhaleCircle?.querySelector('[data-circle-main-ring="true"]')?.getAttribute('stroke-dasharray')).toBe('3 7');
      expect(exhaleCircle?.querySelector('[data-circle-marker-core="diamond"]')).toBeTruthy();
      expect(exhaleCircle?.querySelector('[data-circle-phase-cue="true"]')?.textContent).toBe('OUT · SOFTEN');

      await React.act(async () => { vi.advanceTimersByTime(6000); });
      const completedCircle = host.querySelector('[data-breath-circle="true"]');
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
      expect(completedCircle?.getAttribute('data-circle-phase')).toBe('steady');
      expect(completedCircle?.getAttribute('data-circle-center-shape')).toBe('dot');
      expect(completedCircle?.querySelector('[data-circle-phase-cue="true"]')?.textContent).toBe('READY');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('keeps Breathing Circle neutral for natural, still, and reduced motion and shows pause bars when paused', async () => {
    const natural = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'circle',
          visualMotion: 'full',
          pacedBreathing: false
        }
      }
    });
    const naturalHost = document.createElement('div');
    naturalHost.innerHTML = natural;
    const naturalCircle = naturalHost.querySelector('[data-breath-circle="true"]');
    expect(naturalCircle?.getAttribute('data-circle-cadence')).toBe('natural');
    expect(naturalCircle?.getAttribute('data-circle-phase')).toBe('steady');
    expect(naturalCircle?.getAttribute('data-circle-line-pattern')).toBe('steady');
    expect(naturalCircle?.getAttribute('data-circle-center-shape')).toBe('dot');
    expect(naturalCircle?.querySelector('[data-circle-phase-cue]')).toBeNull();

    const still = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'circle',
          visualMotion: 'still',
          pacedBreathing: true
        }
      }
    });
    expect(still).toContain('data-visual-motion="still"');
    expect(still).toContain('data-circle-phase="steady"');
    expect(still).toContain('data-circle-line-pattern="steady"');
    expect(still).toContain('data-circle-center-shape="dot"');

    const reduced = renderSelTool('somaticReset', {
      theme: { reduceMotion: true },
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'circle',
          visualMotion: 'full',
          pacedBreathing: true
        }
      }
    });
    expect(reduced).toContain('data-visual-motion="still"');
    expect(reduced).toContain('data-circle-phase="steady"');
    expect(reduced).toContain('data-circle-line-pattern="steady"');
    expect(reduced).toContain('data-circle-center-shape="dot"');

    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const ctx = makeCtx({
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'circle',
          visualMotion: 'gentle',
          pacedBreathing: true,
          soundEnabled: false
        }
      }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function CirclePracticeHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });
      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      await React.act(async () => { vi.advanceTimersByTime(1250); });
      expect(host.querySelector('[data-breath-circle="true"]')?.getAttribute('data-circle-center-shape')).toBe('circle');

      await React.act(async () => { vi.advanceTimersByTime(3500); });
      expect(host.querySelector('[data-breath-circle="true"]')?.getAttribute('data-circle-center-shape')).toBe('diamond');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      const pausedCircle = host.querySelector('[data-breath-circle="true"]');
      expect(pausedCircle?.getAttribute('data-circle-phase')).toBe('steady');
      expect(pausedCircle?.getAttribute('data-circle-session-state')).toBe('paused');
      expect(pausedCircle?.getAttribute('data-circle-center-shape')).toBe('pause-bars');
      expect(pausedCircle?.getAttribute('data-circle-line-pattern')).toBe('steady');
      expect(pausedCircle?.querySelector('[data-circle-pause-bars="true"]')).toBeTruthy();
      expect(pausedCircle?.querySelector('[data-circle-phase-cue="true"]')?.textContent).toBe('PAUSED');
      expect(pausedCircle?.querySelector('[data-circle-phase-cue="true"]')?.getAttribute('data-circle-cue-shape')).toBe('pause-bars');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('adds a compact phase rail that tracks preview inhale and exhale states', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const ctx = makeCtx({
      toolData: {
        somaticReset: {
          view: 'setup',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'wave',
          visualMotion: 'gentle',
          pacedBreathing: true,
          soundEnabled: false
        }
      }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function PhaseRailPreviewHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });

      const readyRail = host.querySelector('[data-breath-phase-rail="true"]');
      expect(readyRail?.getAttribute('data-breath-phase')).toBe('ready');
      expect(readyRail?.getAttribute('data-breath-phase-progress')).toBe('steady');
      expect(readyRail?.getAttribute('data-breath-phase-label')).toBe('READY');
      expect(readyRail?.getAttribute('data-breath-phase-cadence')).toBe('4-6');
      expect(readyRail?.getAttribute('data-breath-phase-total-seconds')).toBe('10');
      expect(readyRail?.querySelector('[data-breath-phase-label-text="in"]')?.textContent).toBe('IN 4s');
      expect(readyRail?.querySelector('[data-breath-phase-label-text="out"]')?.textContent).toBe('OUT 6s');
      const readyVisual = host.querySelector('[role="img"][data-visual-mode="wave"]');
      expect(readyVisual?.getAttribute('data-visual-phase-label')).toBe('Ready');
      expect(readyVisual?.getAttribute('data-visual-cadence')).toBe('4-6-seconds');
      expect(readyVisual?.getAttribute('aria-roledescription')).toBe('breathing visual guide');
      expect(readyVisual?.getAttribute('aria-label')).toContain('Cadence: 4 seconds in, 6 seconds out');
      expect(readyRail?.querySelector('[data-breath-phase-segment="in"]')?.getAttribute('data-breath-phase-segment-state')).toBe('upcoming');
      expect(readyRail?.querySelector('[data-breath-phase-segment="out"]')?.getAttribute('data-breath-phase-segment-state')).toBe('upcoming');
      expect(readyRail?.querySelector('[data-breath-phase-segment="in"]')?.getAttribute('data-breath-phase-segment-seconds')).toBe('4');
      expect(readyRail?.querySelector('[data-breath-phase-segment="in"]')?.getAttribute('data-breath-phase-segment-ratio')).toBe('40');
      expect(readyRail?.querySelector('[data-breath-phase-segment="out"]')?.getAttribute('data-breath-phase-segment-seconds')).toBe('6');
      expect(readyRail?.querySelector('[data-breath-phase-segment="out"]')?.getAttribute('data-breath-phase-segment-ratio')).toBe('60');

      const preview = host.querySelector('button[data-visual-preview-toggle="true"]');
      await React.act(async () => { preview.click(); });
      const inhaleRail = host.querySelector('[data-breath-phase-rail="true"]');
      expect(inhaleRail?.getAttribute('data-breath-phase')).toBe('in');
      expect(inhaleRail?.getAttribute('data-breath-phase-progress')).toBe('100');
      expect(inhaleRail?.getAttribute('data-breath-phase-label')).toBe('IN \u00b7 EXPAND');
      const inhaleVisual = host.querySelector('[role="img"][data-visual-mode="wave"]');
      expect(inhaleVisual?.getAttribute('data-visual-phase-label')).toBe('Preview inhale phase');
      expect(inhaleVisual?.getAttribute('aria-label')).toContain('Preview inhale phase');
      expect(inhaleRail?.querySelector('[data-breath-phase-segment="in"]')?.getAttribute('data-breath-phase-segment-state')).toBe('active');
      expect(inhaleRail?.querySelector('[data-breath-phase-segment="out"]')?.getAttribute('data-breath-phase-segment-state')).toBe('upcoming');

      await React.act(async () => { vi.advanceTimersByTime(4000); });
      const exhaleRail = host.querySelector('[data-breath-phase-rail="true"]');
      expect(exhaleRail?.getAttribute('data-breath-phase')).toBe('out');
      expect(exhaleRail?.getAttribute('data-breath-phase-progress')).toBe('100');
      expect(exhaleRail?.getAttribute('data-breath-phase-label')).toBe('OUT \u00b7 SOFTEN');
      const exhaleVisual = host.querySelector('[role="img"][data-visual-mode="wave"]');
      expect(exhaleVisual?.getAttribute('data-visual-phase-label')).toBe('Preview exhale phase');
      expect(exhaleVisual?.getAttribute('aria-label')).toContain('Preview exhale phase');
      expect(exhaleRail?.querySelector('[data-breath-phase-segment="in"]')?.getAttribute('data-breath-phase-segment-state')).toBe('complete');
      expect(exhaleRail?.querySelector('[data-breath-phase-segment="out"]')?.getAttribute('data-breath-phase-segment-state')).toBe('active');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('keeps the phase rail neutral for natural breathing and paused practice', async () => {
    const natural = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'wave',
          pacedBreathing: false
        }
      }
    });
    expect(natural).not.toContain('data-breath-phase-rail="true"');

    const still = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'wave',
          visualMotion: 'still',
          pacedBreathing: true
        }
      }
    });
    const stillHost = document.createElement('div');
    stillHost.innerHTML = still;
    expect(stillHost.querySelector('[data-breath-phase-rail="true"]')?.getAttribute('data-breath-phase')).toBe('ready');
    expect(stillHost.querySelector('[data-breath-phase-rail="true"]')?.getAttribute('data-breath-phase-progress')).toBe('steady');
    expect(stillHost.querySelector('[data-breath-phase-segment="in"]')?.getAttribute('data-breath-phase-segment-state')).toBe('upcoming');

    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const ctx = makeCtx({
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'circle',
          visualMotion: 'gentle',
          pacedBreathing: true,
          soundEnabled: false
        }
      }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function PhaseRailPracticeHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });
      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      await React.act(async () => { vi.advanceTimersByTime(1000); });
      expect(host.querySelector('[data-breath-phase-rail="true"]')?.getAttribute('data-breath-phase')).toBe('in');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      const pausedRail = host.querySelector('[data-breath-phase-rail="true"]');
      expect(pausedRail?.getAttribute('data-breath-phase')).toBe('paused');
      expect(pausedRail?.getAttribute('data-breath-phase-progress')).toBe('steady');
      expect(pausedRail?.getAttribute('data-breath-phase-label')).toBe('PAUSED');
      expect(pausedRail?.querySelector('[data-breath-phase-segment="in"]')?.getAttribute('data-breath-phase-segment-state')).toBe('upcoming');
      expect(pausedRail?.querySelector('[data-breath-phase-segment="out"]')?.getAttribute('data-breath-phase-segment-state')).toBe('upcoming');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('previews the shape- and pattern-coded Flowing Wave without starting the timer', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const toolData = {
      somaticReset: {
        view: 'setup',
        selectedProtocol: 'shoulder_soften',
        visualMode: 'wave',
        visualMotion: 'gentle',
        pacedBreathing: true,
        soundEnabled: false
      }
    };
    const ctx = makeCtx({ toolData });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function WavePreviewHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });

      const readyWave = host.querySelector('[data-breath-wave="true"]');
      expect(readyWave?.getAttribute('data-wave-phase')).toBe('steady');
      expect(readyWave?.getAttribute('data-wave-session-state')).toBe('ready');
      expect(readyWave?.getAttribute('data-wave-line-pattern')).toBe('steady');
      expect(readyWave?.getAttribute('data-wave-marker-shape')).toBe('dot');
      expect(readyWave?.querySelector('[data-wave-phase-cue="true"]')?.textContent).toBe('READY');
      expect(host.querySelector('[role="timer"]')).toBeNull();

      const preview = host.querySelector('button[data-visual-preview-toggle="true"]');
      await React.act(async () => { preview.click(); });
      const inhaleWave = host.querySelector('[data-breath-wave="true"]');
      expect(inhaleWave?.getAttribute('data-wave-phase')).toBe('in');
      expect(inhaleWave?.getAttribute('data-wave-direction')).toBe('right');
      expect(inhaleWave?.getAttribute('data-wave-line-pattern')).toBe('solid');
      expect(inhaleWave?.getAttribute('data-wave-marker-shape')).toBe('circle');
      expect(inhaleWave?.getAttribute('data-wave-phase-progress')).toBe('100');
      expect(inhaleWave?.querySelector('[data-wave-main-line="true"]')?.getAttribute('data-wave-main-pattern')).toBe('solid');
      expect(inhaleWave?.querySelector('[data-wave-marker="true"]')?.getAttribute('data-wave-marker-shape')).toBe('circle');
      expect(inhaleWave?.querySelector('[data-wave-direction-cue="right"]')).toBeTruthy();
      expect(inhaleWave?.querySelector('[data-wave-phase-cue="true"]')?.textContent).toBe('IN · RISE');
      expect(inhaleWave?.querySelector('[data-wave-phase-cue="true"]')?.getAttribute('data-wave-cue-emphasis')).toBe('underlined');
      expect(host.querySelector('[role="timer"]')).toBeNull();

      await React.act(async () => { vi.advanceTimersByTime(4000); });
      const exhaleWave = host.querySelector('[data-breath-wave="true"]');
      expect(exhaleWave?.getAttribute('data-wave-phase')).toBe('out');
      expect(exhaleWave?.getAttribute('data-wave-direction')).toBe('left');
      expect(exhaleWave?.getAttribute('data-wave-line-pattern')).toBe('dotted');
      expect(exhaleWave?.getAttribute('data-wave-marker-shape')).toBe('diamond');
      expect(exhaleWave?.getAttribute('data-wave-phase-progress')).toBe('100');
      expect(exhaleWave?.querySelector('[data-wave-main-line="true"]')?.getAttribute('data-wave-main-pattern')).toBe('dotted');
      expect(exhaleWave?.querySelector('[data-wave-marker-core="diamond"]')).toBeTruthy();
      expect(exhaleWave?.querySelector('[data-wave-direction-cue="left"]')).toBeTruthy();
      expect(exhaleWave?.querySelector('[data-wave-phase-cue="true"]')?.textContent).toBe('OUT · SETTLE');

      await React.act(async () => { vi.advanceTimersByTime(6000); });
      const completedWave = host.querySelector('[data-breath-wave="true"]');
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
      expect(completedWave?.getAttribute('data-wave-phase')).toBe('steady');
      expect(completedWave?.getAttribute('data-wave-marker-shape')).toBe('dot');
      expect(completedWave?.querySelector('[data-wave-direction-cue]')).toBeNull();
      expect(completedWave?.querySelector('[data-wave-phase-cue="true"]')?.textContent).toBe('READY');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('keeps Flowing Wave neutral for natural, still, and reduced motion and shows pause bars when paused', async () => {
    const natural = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'wave',
          visualMotion: 'full',
          pacedBreathing: false
        }
      }
    });
    const naturalHost = document.createElement('div');
    naturalHost.innerHTML = natural;
    const naturalWave = naturalHost.querySelector('[data-breath-wave="true"]');
    expect(naturalWave?.getAttribute('data-wave-cadence')).toBe('natural');
    expect(naturalWave?.getAttribute('data-wave-phase')).toBe('steady');
    expect(naturalWave?.getAttribute('data-wave-marker-shape')).toBe('dot');
    expect(naturalWave?.querySelector('[data-wave-phase-cue]')).toBeNull();
    expect(naturalWave?.querySelector('[data-wave-direction-cue]')).toBeNull();

    const still = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'wave',
          visualMotion: 'still',
          pacedBreathing: true
        }
      }
    });
    expect(still).toContain('data-visual-motion="still"');
    expect(still).toContain('data-wave-phase="steady"');
    expect(still).toContain('data-wave-line-pattern="steady"');
    expect(still).toContain('data-wave-marker-shape="dot"');
    expect(still).not.toContain('data-wave-direction-cue');

    const reduced = renderSelTool('somaticReset', {
      theme: { reduceMotion: true },
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'wave',
          visualMotion: 'full',
          pacedBreathing: true
        }
      }
    });
    expect(reduced).toContain('data-visual-motion="still"');
    expect(reduced).toContain('data-wave-phase="steady"');
    expect(reduced).toContain('data-wave-marker-shape="dot"');
    expect(reduced).not.toContain('data-wave-direction-cue');

    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const ctx = makeCtx({
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'wave',
          visualMotion: 'gentle',
          pacedBreathing: true,
          soundEnabled: false
        }
      }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function WavePracticeHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });
      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      await React.act(async () => { vi.advanceTimersByTime(1250); });
      expect(host.querySelector('[data-breath-wave="true"]')?.getAttribute('data-wave-marker-shape')).toBe('circle');

      await React.act(async () => { vi.advanceTimersByTime(3500); });
      expect(host.querySelector('[data-breath-wave="true"]')?.getAttribute('data-wave-marker-shape')).toBe('diamond');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      const pausedWave = host.querySelector('[data-breath-wave="true"]');
      expect(pausedWave?.getAttribute('data-wave-phase')).toBe('steady');
      expect(pausedWave?.getAttribute('data-wave-direction')).toBe('steady');
      expect(pausedWave?.getAttribute('data-wave-session-state')).toBe('paused');
      expect(pausedWave?.getAttribute('data-wave-marker-shape')).toBe('pause-bars');
      expect(pausedWave?.getAttribute('data-wave-line-pattern')).toBe('steady');
      expect(pausedWave?.querySelector('[data-wave-pause-bars="true"]')).toBeTruthy();
      expect(pausedWave?.querySelector('[data-wave-direction-cue]')).toBeNull();
      expect(pausedWave?.querySelector('[data-wave-phase-cue="true"]')?.textContent).toBe('PAUSED');
      expect(pausedWave?.querySelector('[data-wave-phase-cue="true"]')?.getAttribute('data-wave-cue-shape')).toBe('pause-bars');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('previews the shape- and pattern-coded Petal Bloom without starting the timer', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const toolData = {
      somaticReset: {
        view: 'setup',
        selectedProtocol: 'shoulder_soften',
        visualMode: 'flower',
        visualMotion: 'gentle',
        pacedBreathing: true,
        soundEnabled: false
      }
    };
    const ctx = makeCtx({ toolData });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function FlowerPreviewHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });

      const readyFlower = host.querySelector('[data-breath-flower="true"]');
      expect(readyFlower?.getAttribute('data-flower-phase')).toBe('steady');
      expect(readyFlower?.getAttribute('data-flower-session-state')).toBe('ready');
      expect(readyFlower?.getAttribute('data-flower-petal-pattern')).toBe('steady');
      expect(readyFlower?.getAttribute('data-flower-center-shape')).toBe('dot');
      expect(readyFlower?.querySelector('[data-flower-phase-cue="true"]')?.textContent).toBe('READY');
      expect(host.querySelector('[role="timer"]')).toBeNull();

      const preview = host.querySelector('button[data-visual-preview-toggle="true"]');
      await React.act(async () => { preview.click(); });
      const inhaleFlower = host.querySelector('[data-breath-flower="true"]');
      expect(inhaleFlower?.getAttribute('data-flower-phase')).toBe('in');
      expect(inhaleFlower?.getAttribute('data-flower-petal-pattern')).toBe('solid');
      expect(inhaleFlower?.getAttribute('data-flower-center-shape')).toBe('circle');
      expect(inhaleFlower?.getAttribute('data-flower-phase-progress')).toBe('100');
      expect(inhaleFlower?.querySelector('[data-flower-petal="0"]')?.getAttribute('data-flower-petal-pattern')).toBe('solid');
      expect(inhaleFlower?.querySelector('[data-flower-marker-core="circle"]')).toBeTruthy();
      expect(inhaleFlower?.querySelector('[data-flower-phase-cue="true"]')?.textContent).toBe('IN · OPEN');
      expect(inhaleFlower?.querySelector('[data-flower-phase-cue="true"]')?.getAttribute('data-flower-cue-emphasis')).toBe('underlined');
      expect(host.querySelector('[role="timer"]')).toBeNull();

      await React.act(async () => { vi.advanceTimersByTime(4000); });
      const exhaleFlower = host.querySelector('[data-breath-flower="true"]');
      expect(exhaleFlower?.getAttribute('data-flower-phase')).toBe('out');
      expect(exhaleFlower?.getAttribute('data-flower-petal-pattern')).toBe('dotted');
      expect(exhaleFlower?.getAttribute('data-flower-center-shape')).toBe('diamond');
      expect(exhaleFlower?.getAttribute('data-flower-phase-progress')).toBe('100');
      expect(exhaleFlower?.querySelector('[data-flower-petal="0"]')?.getAttribute('data-flower-petal-pattern')).toBe('dotted');
      expect(exhaleFlower?.querySelector('[data-flower-marker-core="diamond"]')).toBeTruthy();
      expect(exhaleFlower?.querySelector('[data-flower-phase-cue="true"]')?.textContent).toBe('OUT · SOFTEN');

      await React.act(async () => { vi.advanceTimersByTime(6000); });
      const completedFlower = host.querySelector('[data-breath-flower="true"]');
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
      expect(completedFlower?.getAttribute('data-flower-phase')).toBe('steady');
      expect(completedFlower?.getAttribute('data-flower-center-shape')).toBe('dot');
      expect(completedFlower?.querySelector('[data-flower-phase-cue="true"]')?.textContent).toBe('READY');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('keeps Petal Bloom neutral for natural, still, and reduced motion and shows pause bars when paused', async () => {
    const natural = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'flower',
          visualMotion: 'full',
          pacedBreathing: false
        }
      }
    });
    const naturalHost = document.createElement('div');
    naturalHost.innerHTML = natural;
    const naturalFlower = naturalHost.querySelector('[data-breath-flower="true"]');
    expect(naturalFlower?.getAttribute('data-flower-cadence')).toBe('natural');
    expect(naturalFlower?.getAttribute('data-flower-phase')).toBe('steady');
    expect(naturalFlower?.getAttribute('data-flower-petal-pattern')).toBe('steady');
    expect(naturalFlower?.getAttribute('data-flower-center-shape')).toBe('dot');
    expect(naturalFlower?.querySelector('[data-flower-phase-cue]')).toBeNull();

    const still = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'flower',
          visualMotion: 'still',
          pacedBreathing: true
        }
      }
    });
    expect(still).toContain('data-visual-motion="still"');
    expect(still).toContain('data-flower-phase="steady"');
    expect(still).toContain('data-flower-petal-pattern="steady"');
    expect(still).toContain('data-flower-center-shape="dot"');

    const reduced = renderSelTool('somaticReset', {
      theme: { reduceMotion: true },
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'flower',
          visualMotion: 'full',
          pacedBreathing: true
        }
      }
    });
    expect(reduced).toContain('data-visual-motion="still"');
    expect(reduced).toContain('data-flower-phase="steady"');
    expect(reduced).toContain('data-flower-petal-pattern="steady"');
    expect(reduced).toContain('data-flower-center-shape="dot"');

    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const ctx = makeCtx({
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'flower',
          visualMotion: 'gentle',
          pacedBreathing: true,
          soundEnabled: false
        }
      }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function FlowerPracticeHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });
      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      await React.act(async () => { vi.advanceTimersByTime(1250); });
      expect(host.querySelector('[data-breath-flower="true"]')?.getAttribute('data-flower-center-shape')).toBe('circle');

      await React.act(async () => { vi.advanceTimersByTime(3500); });
      expect(host.querySelector('[data-breath-flower="true"]')?.getAttribute('data-flower-center-shape')).toBe('diamond');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      const pausedFlower = host.querySelector('[data-breath-flower="true"]');
      expect(pausedFlower?.getAttribute('data-flower-phase')).toBe('steady');
      expect(pausedFlower?.getAttribute('data-flower-session-state')).toBe('paused');
      expect(pausedFlower?.getAttribute('data-flower-center-shape')).toBe('pause-bars');
      expect(pausedFlower?.getAttribute('data-flower-petal-pattern')).toBe('steady');
      expect(pausedFlower?.querySelector('[data-flower-pause-bars="true"]')).toBeTruthy();
      expect(pausedFlower?.querySelector('[data-flower-phase-cue="true"]')?.textContent).toBe('PAUSED');
      expect(pausedFlower?.querySelector('[data-flower-phase-cue="true"]')?.getAttribute('data-flower-cue-shape')).toBe('pause-bars');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('previews the phase- and pattern-coded Grounding Horizon without starting the timer', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const toolData = {
      somaticReset: {
        view: 'setup',
        selectedProtocol: 'shoulder_soften',
        visualMode: 'horizon',
        visualMotion: 'gentle',
        pacedBreathing: true,
        soundEnabled: false
      }
    };
    const ctx = makeCtx({ toolData });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function HorizonPreviewHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });

      const readyHorizon = host.querySelector('[data-breath-horizon="true"]');
      expect(readyHorizon?.getAttribute('data-horizon-phase')).toBe('steady');
      expect(readyHorizon?.getAttribute('data-horizon-session-state')).toBe('ready');
      expect(readyHorizon?.getAttribute('data-horizon-line-pattern')).toBe('steady');
      expect(readyHorizon?.getAttribute('data-horizon-center-shape')).toBe('dot');
      expect(readyHorizon?.querySelector('[data-horizon-phase-cue="true"]')?.textContent).toBe('READY');
      expect(host.querySelector('[role="timer"]')).toBeNull();

      const preview = host.querySelector('button[data-visual-preview-toggle="true"]');
      await React.act(async () => { preview.click(); });
      const inhaleHorizon = host.querySelector('[data-breath-horizon="true"]');
      expect(inhaleHorizon?.getAttribute('data-horizon-phase')).toBe('in');
      expect(inhaleHorizon?.getAttribute('data-horizon-line-pattern')).toBe('solid');
      expect(inhaleHorizon?.getAttribute('data-horizon-center-shape')).toBe('circle');
      expect(inhaleHorizon?.getAttribute('data-horizon-phase-progress')).toBe('100');
      expect(inhaleHorizon?.querySelector('[data-horizon-sun="true"]')?.getAttribute('data-horizon-sun-pattern')).toBe('solid');
      expect(inhaleHorizon?.querySelector('[data-horizon-main-line="true"]')?.getAttribute('data-horizon-main-pattern')).toBe('solid');
      expect(inhaleHorizon?.querySelector('[data-horizon-marker-core="circle"]')).toBeTruthy();
      expect(inhaleHorizon?.querySelector('[data-horizon-phase-cue="true"]')?.textContent).toBe('IN · RISE');
      expect(host.querySelector('[role="timer"]')).toBeNull();

      await React.act(async () => { vi.advanceTimersByTime(4000); });
      const exhaleHorizon = host.querySelector('[data-breath-horizon="true"]');
      expect(exhaleHorizon?.getAttribute('data-horizon-phase')).toBe('out');
      expect(exhaleHorizon?.getAttribute('data-horizon-line-pattern')).toBe('dotted');
      expect(exhaleHorizon?.getAttribute('data-horizon-center-shape')).toBe('diamond');
      expect(exhaleHorizon?.getAttribute('data-horizon-phase-progress')).toBe('100');
      expect(['3 7', '4 8']).toContain(exhaleHorizon?.querySelector('[data-horizon-sun="true"]')?.getAttribute('stroke-dasharray'));
      expect(exhaleHorizon?.querySelector('[data-horizon-marker-core="diamond"]')).toBeTruthy();
      expect(exhaleHorizon?.querySelector('[data-horizon-phase-cue="true"]')?.textContent).toBe('OUT · SETTLE');

      await React.act(async () => { vi.advanceTimersByTime(6000); });
      const completedHorizon = host.querySelector('[data-breath-horizon="true"]');
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
      expect(completedHorizon?.getAttribute('data-horizon-phase')).toBe('steady');
      expect(completedHorizon?.getAttribute('data-horizon-center-shape')).toBe('dot');
      expect(completedHorizon?.querySelector('[data-horizon-phase-cue="true"]')?.textContent).toBe('READY');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('keeps Grounding Horizon neutral for natural, still, and reduced motion and shows pause bars when paused', async () => {
    const natural = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'horizon',
          visualMotion: 'full',
          pacedBreathing: false
        }
      }
    });
    const naturalHost = document.createElement('div');
    naturalHost.innerHTML = natural;
    const naturalHorizon = naturalHost.querySelector('[data-breath-horizon="true"]');
    expect(naturalHorizon?.getAttribute('data-horizon-cadence')).toBe('natural');
    expect(naturalHorizon?.getAttribute('data-horizon-phase')).toBe('steady');
    expect(naturalHorizon?.getAttribute('data-horizon-line-pattern')).toBe('steady');
    expect(naturalHorizon?.getAttribute('data-horizon-center-shape')).toBe('dot');
    expect(naturalHorizon?.querySelector('[data-horizon-phase-cue]')).toBeNull();

    const still = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'horizon',
          visualMotion: 'still',
          pacedBreathing: true
        }
      }
    });
    expect(still).toContain('data-visual-motion="still"');
    expect(still).toContain('data-horizon-phase="steady"');
    expect(still).toContain('data-horizon-line-pattern="steady"');
    expect(still).toContain('data-horizon-center-shape="dot"');

    const reduced = renderSelTool('somaticReset', {
      theme: { reduceMotion: true },
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'horizon',
          visualMotion: 'full',
          pacedBreathing: true
        }
      }
    });
    expect(reduced).toContain('data-visual-motion="still"');
    expect(reduced).toContain('data-horizon-phase="steady"');
    expect(reduced).toContain('data-horizon-line-pattern="steady"');
    expect(reduced).toContain('data-horizon-center-shape="dot"');

    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const ctx = makeCtx({
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'horizon',
          visualMotion: 'gentle',
          pacedBreathing: true,
          soundEnabled: false
        }
      }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function HorizonPracticeHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });
      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      await React.act(async () => { vi.advanceTimersByTime(1250); });
      expect(host.querySelector('[data-breath-horizon="true"]')?.getAttribute('data-horizon-center-shape')).toBe('circle');

      await React.act(async () => { vi.advanceTimersByTime(3500); });
      expect(host.querySelector('[data-breath-horizon="true"]')?.getAttribute('data-horizon-center-shape')).toBe('diamond');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      const pausedHorizon = host.querySelector('[data-breath-horizon="true"]');
      expect(pausedHorizon?.getAttribute('data-horizon-phase')).toBe('steady');
      expect(pausedHorizon?.getAttribute('data-horizon-session-state')).toBe('paused');
      expect(pausedHorizon?.getAttribute('data-horizon-center-shape')).toBe('pause-bars');
      expect(pausedHorizon?.getAttribute('data-horizon-line-pattern')).toBe('steady');
      expect(pausedHorizon?.querySelector('[data-horizon-pause-bars="true"]')).toBeTruthy();
      expect(pausedHorizon?.querySelector('[data-horizon-phase-cue="true"]')?.textContent).toBe('PAUSED');
      expect(pausedHorizon?.querySelector('[data-horizon-phase-cue="true"]')?.getAttribute('data-horizon-cue-shape')).toBe('pause-bars');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('renders a proportional two-part breath orbit with steady fallbacks', () => {
    const paced = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'orbit',
          visualMotion: 'gentle'
        }
      }
    });
    const pacedHost = document.createElement('div');
    pacedHost.innerHTML = paced;
    const orbit = pacedHost.querySelector('[data-breath-orbit="true"]');
    expect(orbit).toBeTruthy();
    expect(orbit?.getAttribute('data-orbit-progress')).toBe('0');
    expect(orbit?.getAttribute('data-orbit-direction')).toBe('steady');
    expect(orbit?.getAttribute('data-orbit-active-segment')).toBe('steady');
    expect(orbit?.getAttribute('data-orbit-destination')).toBe('steady');
    expect(orbit?.getAttribute('data-orbit-phase-progress')).toBe('steady');
    expect(orbit?.getAttribute('data-orbit-inhale-percent')).toBe('40');
    expect(orbit?.getAttribute('data-orbit-cadence')).toBe('4-6');
    const cadenceMap = orbit?.querySelector('[data-orbit-cadence-map="true"]');
    expect(cadenceMap).toBeTruthy();
    expect(cadenceMap?.getAttribute('data-orbit-cadence-count')).toBe('10');
    expect(cadenceMap?.getAttribute('data-orbit-inhale-count')).toBe('4');
    expect(cadenceMap?.getAttribute('data-orbit-exhale-count')).toBe('6');
    expect(cadenceMap?.querySelectorAll('[data-orbit-cadence-tick]').length).toBe(8);
    expect(cadenceMap?.querySelectorAll('[data-orbit-tick-phase="in"][data-orbit-tick-shape="bar"]').length).toBe(3);
    expect(cadenceMap?.querySelectorAll('[data-orbit-tick-phase="out"][data-orbit-tick-shape="hollow-dot"]').length).toBe(5);
    expect(orbit?.querySelector('[data-orbit-segment="inhale"]')?.getAttribute('data-orbit-segment-state')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('stroke-dasharray')).toBe('4 8');
    expect(orbit?.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('data-orbit-segment-state')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-handoff-state')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-station-shape')).toBe('diamond');
    expect(orbit?.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-shape')).toBe('ring');
    expect(orbit?.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-state')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-station-shape')).toBe('ring');
    expect(orbit?.querySelector('[data-orbit-destination-halo]')).toBeNull();
    expect(orbit?.querySelector('[data-orbit-center="true"]')).toBeTruthy();
    expect(orbit?.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-phase')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-pattern')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('stroke-dasharray')).toBeNull();
    expect(orbit?.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('ready');
    expect(orbit?.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-shape')).toBe('dot');
    expect(orbit?.querySelector('[data-orbit-center-dot="true"]')).toBeTruthy();
    expect(orbit?.querySelector('[data-orbit-pause-bars="true"]')).toBeNull();
    const phaseLabels = orbit?.querySelector('[data-orbit-phase-labels="true"]');
    const inhaleLabel = phaseLabels?.querySelector('[data-orbit-phase-label="in"]');
    const exhaleLabel = phaseLabels?.querySelector('[data-orbit-phase-label="out"]');
    expect(phaseLabels).toBeTruthy();
    expect(inhaleLabel?.textContent).toBe('IN');
    expect(exhaleLabel?.textContent).toBe('OUT');
    expect(inhaleLabel?.getAttribute('data-orbit-label-state')).toBe('steady');
    expect(exhaleLabel?.getAttribute('data-orbit-label-state')).toBe('steady');
    expect(inhaleLabel?.getAttribute('data-orbit-label-emphasis')).toBe('plain');
    expect(exhaleLabel?.getAttribute('data-orbit-label-emphasis')).toBe('plain');
    expect(Number(inhaleLabel?.getAttribute('x'))).toBeGreaterThan(120);
    expect(Number(exhaleLabel?.getAttribute('x'))).toBeLessThan(120);
    expect(orbit?.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-phase')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('circle');
    expect(orbit?.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-direction')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-marker-core="circle"]')).toBeTruthy();
    expect(orbit?.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeNull();
    expect(paced).toContain('Breath orbit. Ready. Cadence: 4 seconds in, 6 seconds out. Optional breath guide ready');
    expect(paced).toContain('Direct IN and OUT labels pair with solid inhale and dotted exhale patterns across the arcs and center ring; the center changes to pause bars when the session pauses');
    expect(paced).toContain('an outlined diamond or ring shows the next phase handoff');
    expect(paced).toContain('round and diamond markers move clockwise');
    expect(paced).toContain('shape-coded marks for each optional count');

    const natural = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'orbit',
          visualMotion: 'full',
          pacedBreathing: false
        }
      }
    });
    expect(natural).toContain('data-orbit-progress="steady"');
    expect(natural).toContain('data-orbit-direction="steady"');
    expect(natural).toContain('data-orbit-active-segment="steady"');
    expect(natural).toContain('data-orbit-destination="steady"');
    expect(natural).toContain('data-orbit-phase-progress="steady"');
    expect(natural).toContain('data-orbit-cadence="natural"');
    expect(natural).toContain('data-orbit-marker-phase="steady"');
    expect(natural).toContain('data-orbit-marker-direction="steady"');
    expect(natural).toContain('data-orbit-center-phase="steady"');
    expect(natural).toContain('data-orbit-center-pattern="steady"');
    expect(natural).toContain('data-orbit-center-status-state="ready"');
    expect(natural).toContain('data-orbit-center-status-shape="dot"');
    expect(natural).not.toContain('data-orbit-phase-labels="true"');
    expect(natural).not.toContain('data-orbit-cadence-map="true"');
    expect(natural).not.toContain('data-orbit-handoff="true"');
    expect(natural).not.toContain('data-orbit-return="true"');
    expect(natural).not.toContain('data-orbit-destination-halo');
    expect(natural).toContain('Breath orbit. Natural breathing. No timed cadence. Steady guide; breathe naturally');

    const reduced = renderSelTool('somaticReset', {
      theme: { reduceMotion: true },
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'orbit',
          visualMotion: 'full'
        }
      }
    });
    expect(reduced).toContain('data-visual-motion="still"');
    expect(reduced).toContain('data-orbit-progress="steady"');
    expect(reduced).toContain('data-orbit-direction="steady"');
    expect(reduced).toContain('data-orbit-active-segment="steady"');
    expect(reduced).toContain('data-orbit-destination="steady"');
    expect(reduced).toContain('data-orbit-phase-progress="steady"');
    expect(reduced).toContain('data-orbit-marker-phase="steady"');
    expect(reduced).toContain('data-orbit-center-phase="steady"');
    expect(reduced).toContain('data-orbit-center-pattern="steady"');
    expect(reduced).toContain('data-orbit-center-status-state="ready"');
    expect(reduced).toContain('data-orbit-center-status-shape="dot"');
    expect(reduced).toContain('data-orbit-phase-labels="true"');
    expect(reduced).toContain('data-orbit-label-state="steady"');
    expect(reduced).toContain('data-orbit-cadence-map="true"');
    expect(reduced).toContain('data-orbit-return="true"');
    expect(reduced).toContain('data-orbit-handoff-state="steady"');
    expect(reduced).toContain('data-orbit-return-state="steady"');
    expect(reduced).not.toContain('data-orbit-destination-halo');
    expect(reduced).not.toContain('data-orbit-direction-cue="clockwise"');
  });

  it('previews the breath orbit through its inhale handoff and exhale return', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const announcements = [];
    const toolData = {
      somaticReset: {
        view: 'setup',
        selectedProtocol: 'shoulder_soften',
        visualMode: 'orbit',
        visualMotion: 'gentle',
        pacedBreathing: true,
        soundEnabled: false
      }
    };
    const ctx = Object.assign({}, makeCtx({ toolData }), {
      toolData,
      announceToSR(message) { announcements.push(message); }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function OrbitPreviewHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-progress')).toBe('0');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-direction')).toBe('steady');
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('ready');

      const preview = host.querySelector('button[data-visual-preview-toggle="true"]');
      await React.act(async () => { preview.click(); });
      expect(host.querySelector('[data-visual-preview="in"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-progress')).toBe('40');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-direction')).toBe('clockwise');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('in');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-destination')).toBe('handoff');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-phase-progress')).toBe('100');
      expect(host.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-handoff-state')).toBe('destination');
      expect(host.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-state')).toBe('waiting');
      expect(host.querySelector('[data-orbit-destination-halo="handoff"]')).toBeTruthy();
      expect(host.querySelector('[data-orbit-destination-halo="return"]')).toBeNull();
      expect(host.querySelector('[data-orbit-segment="inhale"]')?.getAttribute('data-orbit-segment-state')).toBe('active');
      expect(host.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('data-orbit-segment-state')).toBe('inactive');
      expect(host.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-state')).toBe('active');
      expect(host.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-emphasis')).toBe('underlined');
      expect(host.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-state')).toBe('inactive');
      expect(host.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-emphasis')).toBe('plain');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-phase')).toBe('in');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(host.querySelector('[data-orbit-marker-core="circle"]')).toBeTruthy();
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-phase')).toBe('in');
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-pattern')).toBe('solid');
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('stroke-dasharray')).toBeNull();
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('preview');
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-shape')).toBe('dot');
      expect(host.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeTruthy();

      await React.act(async () => { vi.advanceTimersByTime(4000); });
      expect(host.querySelector('[data-visual-preview="out"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-progress')).toBe('100');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('out');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-destination')).toBe('return');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-phase-progress')).toBe('100');
      expect(host.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-handoff-state')).toBe('passed');
      expect(host.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-state')).toBe('destination');
      expect(host.querySelector('[data-orbit-destination-halo="return"]')).toBeTruthy();
      expect(host.querySelector('[data-orbit-destination-halo="handoff"]')).toBeNull();
      expect(host.querySelector('[data-orbit-segment="inhale"]')?.getAttribute('data-orbit-segment-state')).toBe('inactive');
      expect(host.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('data-orbit-segment-state')).toBe('active');
      expect(host.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-state')).toBe('inactive');
      expect(host.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-emphasis')).toBe('plain');
      expect(host.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-state')).toBe('active');
      expect(host.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-emphasis')).toBe('underlined');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-phase')).toBe('out');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('diamond');
      expect(host.querySelector('[data-orbit-marker-core="diamond"]')).toBeTruthy();
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-phase')).toBe('out');
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-pattern')).toBe('dotted');
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('stroke-dasharray')).toBe('3 6');
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('preview');
      expect(host.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeTruthy();
      expect(announcements).toContain('Visual preview: breathe out slowly.');

      await React.act(async () => { vi.advanceTimersByTime(6000); });
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-progress')).toBe('0');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-direction')).toBe('steady');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('steady');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-destination')).toBe('steady');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-phase-progress')).toBe('steady');
      expect(host.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-handoff-state')).toBe('steady');
      expect(host.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-state')).toBe('steady');
      expect(host.querySelector('[data-orbit-destination-halo]')).toBeNull();
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-phase')).toBe('steady');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-phase')).toBe('steady');
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-pattern')).toBe('steady');
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('ready');
      expect(host.querySelector('[data-orbit-center-dot="true"]')).toBeTruthy();
      expect(host.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-state')).toBe('steady');
      expect(host.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-state')).toBe('steady');
      expect(host.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeNull();
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('keeps orbit rotation moving forward across cycle wrap and resets without reverse animation', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const toolData = {
      somaticReset: {
        view: 'practice',
        selectedProtocol: 'shoulder_soften',
        visualMode: 'orbit',
        visualMotion: 'gentle',
        pacedBreathing: true,
        guidanceMode: 'hidden',
        soundEnabled: false
      }
    };
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function OrbitContinuityHost() {
          return window.SelHub.renderTool('somaticReset', makeCtx({ toolData }));
        }));
      });

      let marker = host.querySelector('[data-orbit-marker="true"]');
      expect(marker?.style.transform).toBe('rotate(0deg)');
      expect(marker?.style.transition).toBe('none');
      expect(marker?.getAttribute('data-orbit-marker-phase')).toBe('steady');
      expect(marker?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(marker?.getAttribute('data-orbit-marker-direction')).toBe('steady');
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('ready');
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-shape')).toBe('dot');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-destination')).toBe('steady');
      expect(host.querySelector('[data-orbit-destination-halo]')).toBeNull();

      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      expect(host.querySelector('[data-guidance-visible="false"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-direction')).toBe('clockwise');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('in');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-destination')).toBe('handoff');
      expect(host.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-handoff-state')).toBe('destination');
      expect(host.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-state')).toBe('waiting');
      expect(host.querySelector('[data-orbit-destination-halo="handoff"]')).toBeTruthy();
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-pattern')).toBe('solid');
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('moving');
      expect(host.querySelector('[data-orbit-center-dot="true"]')).toBeTruthy();
      expect(host.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-emphasis')).toBe('underlined');
      expect(host.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-state')).toBe('inactive');
      expect(host.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeTruthy();

      await React.act(async () => { vi.advanceTimersByTime(9250); });
      let orbit = host.querySelector('[data-breath-orbit="true"]');
      marker = host.querySelector('[data-orbit-marker="true"]');
      expect(orbit?.getAttribute('data-orbit-progress')).toBe('90');
      expect(orbit?.getAttribute('data-orbit-turn')).toBe('0');
      expect(orbit?.getAttribute('data-orbit-rotation')).toBe('324');
      expect(orbit?.getAttribute('data-orbit-active-segment')).toBe('out');
      expect(orbit?.getAttribute('data-orbit-destination')).toBe('return');
      expect(Number(orbit?.getAttribute('data-orbit-phase-progress'))).toBeGreaterThan(80);
      expect(orbit?.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-handoff-state')).toBe('passed');
      expect(orbit?.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-state')).toBe('destination');
      expect(orbit?.querySelector('[data-orbit-destination-halo="return"]')).toBeTruthy();
      expect(orbit?.querySelector('[data-orbit-destination-halo="handoff"]')).toBeNull();
      expect(orbit?.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('data-orbit-segment-state')).toBe('active');
      expect(marker?.getAttribute('data-orbit-marker-phase')).toBe('out');
      expect(marker?.getAttribute('data-orbit-marker-shape')).toBe('diamond');
      expect(marker?.getAttribute('data-orbit-marker-direction')).toBe('clockwise');
      expect(marker?.querySelector('[data-orbit-marker-core="diamond"]')).toBeTruthy();
      expect(orbit?.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-phase')).toBe('out');
      expect(orbit?.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-pattern')).toBe('dotted');
      expect(orbit?.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('stroke-dasharray')).toBe('4 7');
      expect(orbit?.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('moving');
      expect(orbit?.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-state')).toBe('inactive');
      expect(orbit?.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-emphasis')).toBe('underlined');
      expect(marker?.style.transform).toBe('rotate(324deg)');
      expect(marker?.style.transition).not.toBe('none');

      await React.act(async () => { vi.advanceTimersByTime(2000); });
      orbit = host.querySelector('[data-breath-orbit="true"]');
      marker = host.querySelector('[data-orbit-marker="true"]');
      expect(orbit?.getAttribute('data-orbit-progress')).toBe('10');
      expect(orbit?.getAttribute('data-orbit-turn')).toBe('1');
      expect(orbit?.getAttribute('data-orbit-rotation')).toBe('396');
      expect(orbit?.getAttribute('data-orbit-active-segment')).toBe('in');
      expect(orbit?.getAttribute('data-orbit-destination')).toBe('handoff');
      expect(Number(orbit?.getAttribute('data-orbit-phase-progress'))).toBeGreaterThan(20);
      expect(orbit?.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-handoff-state')).toBe('destination');
      expect(orbit?.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-state')).toBe('waiting');
      expect(orbit?.querySelector('[data-orbit-destination-halo="handoff"]')).toBeTruthy();
      expect(orbit?.querySelector('[data-orbit-destination-halo="return"]')).toBeNull();
      expect(orbit?.querySelector('[data-orbit-segment="inhale"]')?.getAttribute('data-orbit-segment-state')).toBe('active');
      expect(marker?.getAttribute('data-orbit-marker-phase')).toBe('in');
      expect(marker?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(marker?.querySelector('[data-orbit-marker-core="circle"]')).toBeTruthy();
      expect(orbit?.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-phase')).toBe('in');
      expect(orbit?.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-pattern')).toBe('solid');
      expect(orbit?.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('moving');
      expect(orbit?.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-emphasis')).toBe('underlined');
      expect(orbit?.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-state')).toBe('inactive');
      expect(marker?.style.transform).toBe('rotate(396deg)');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      marker = host.querySelector('[data-orbit-marker="true"]');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-direction')).toBe('steady');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('steady');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-destination')).toBe('steady');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-phase-progress')).toBe('steady');
      expect(host.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-handoff-state')).toBe('steady');
      expect(host.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-state')).toBe('steady');
      expect(host.querySelector('[data-orbit-destination-halo]')).toBeNull();
      expect(marker?.getAttribute('data-orbit-marker-phase')).toBe('steady');
      expect(marker?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(marker?.getAttribute('data-orbit-marker-direction')).toBe('steady');
      expect(host.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-pattern')).toBe('steady');
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('paused');
      expect(host.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-shape')).toBe('pause-bars');
      expect(host.querySelector('[data-orbit-pause-bars="true"]')?.querySelectorAll('line').length).toBe(2);
      expect(host.querySelector('[data-orbit-center-dot="true"]')).toBeNull();
      expect(host.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-state')).toBe('steady');
      expect(host.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-state')).toBe('steady');
      expect(marker?.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeNull();
      expect(marker?.style.transform).toBe('rotate(396deg)');
      expect(marker?.style.transition).toBe('none');

      const restart = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Restart timer');
      await React.act(async () => { restart.click(); });
      orbit = host.querySelector('[data-breath-orbit="true"]');
      marker = host.querySelector('[data-orbit-marker="true"]');
      expect(orbit?.getAttribute('data-orbit-progress')).toBe('0');
      expect(orbit?.getAttribute('data-orbit-turn')).toBe('0');
      expect(orbit?.getAttribute('data-orbit-rotation')).toBe('0');
      expect(orbit?.getAttribute('data-orbit-active-segment')).toBe('steady');
      expect(orbit?.getAttribute('data-orbit-destination')).toBe('steady');
      expect(orbit?.getAttribute('data-orbit-phase-progress')).toBe('steady');
      expect(orbit?.querySelector('[data-orbit-handoff="true"]')?.getAttribute('data-orbit-handoff-state')).toBe('steady');
      expect(orbit?.querySelector('[data-orbit-return="true"]')?.getAttribute('data-orbit-return-state')).toBe('steady');
      expect(orbit?.querySelector('[data-orbit-destination-halo]')).toBeNull();
      expect(marker?.getAttribute('data-orbit-marker-phase')).toBe('steady');
      expect(marker?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(orbit?.querySelector('[data-orbit-center-ring="true"]')?.getAttribute('data-orbit-center-pattern')).toBe('steady');
      expect(orbit?.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-state')).toBe('ready');
      expect(orbit?.querySelector('[data-orbit-center-status="true"]')?.getAttribute('data-orbit-center-status-shape')).toBe('dot');
      expect(orbit?.querySelector('[data-orbit-center-dot="true"]')).toBeTruthy();
      expect(orbit?.querySelector('[data-orbit-phase-label="in"]')?.getAttribute('data-orbit-label-state')).toBe('steady');
      expect(orbit?.querySelector('[data-orbit-phase-label="out"]')?.getAttribute('data-orbit-label-state')).toBe('steady');
      expect(marker?.style.transform).toBe('rotate(0deg)');
      expect(marker?.style.transition).toBe('none');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('keeps the breath path neutral for natural, still, and reduced-motion states', () => {
    const natural = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'path',
          visualMotion: 'full',
          pacedBreathing: false
        }
      }
    });
    expect(natural).toContain('data-visual-phase="steady"');
    expect(natural).toContain('data-breath-path="true"');
    expect(natural).toContain('data-path-position="50"');
    expect(natural).toContain('data-path-direction="steady"');
    expect(natural).toContain('data-path-destination="steady"');
    expect(natural).toContain('data-path-phase-progress="steady"');
    expect(natural).toContain('data-path-cadence="natural"');
    expect(natural).toContain('data-path-endpoints="natural"');
    expect(natural).not.toContain('data-path-phase-labels="true"');
    expect(natural).not.toContain('data-path-destination-halo');
    expect(natural).not.toContain('data-path-trail=');
    expect(natural).toContain('Breath path. Natural breathing. No timed cadence. Steady guide; breathe naturally and move only if comfortable');

    const still = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'path',
          visualMotion: 'still',
          pacedBreathing: true
        }
      }
    });
    expect(still).toContain('data-visual-motion="still"');
    expect(still).toContain('data-path-position="50"');
    expect(still).toContain('data-path-direction="steady"');
    expect(still).toContain('data-path-destination="steady"');
    expect(still).toContain('data-path-endpoints="paced"');
    expect(still).toContain('data-path-endpoint-shape="diamond"');
    expect(still).toContain('data-path-endpoint-shape="circle"');
    expect(still).toContain('data-path-label-state="steady"');
    expect(still).not.toContain('data-path-destination-halo');
    expect(still).not.toContain('data-path-trail=');

    const reduced = renderSelTool('somaticReset', {
      theme: { reduceMotion: true },
      toolData: {
        somaticReset: {
          view: 'practice',
          selectedProtocol: 'shoulder_soften',
          visualMode: 'path',
          visualMotion: 'full',
          pacedBreathing: true
        }
      }
    });
    expect(reduced).toContain('data-visual-motion="still"');
    expect(reduced).toContain('data-path-direction="steady"');
    expect(reduced).toContain('data-path-destination="steady"');
    expect(reduced).not.toContain('data-path-destination-halo');
    expect(reduced).not.toContain('data-path-trail=');
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
    expect(setup).toContain('data-visual-preview="idle"');
    expect(setup).toContain('Petals pair IN · OPEN with solid outlines and a round center, then OUT · SOFTEN with dotted outlines and a diamond center; pause bars keep stationary state clear.');
    expect(setup).toContain('System reduced motion keeps it still.');
    expect(setup).toContain('Preview one breath');
    expect(setup).toContain('System reduced motion keeps previews still.');
    expect(setup).toContain('Guidance words');
    expect(setup).toContain('Full cue');
    expect(setup).toContain('disabled=""');
  });

  it('previews exactly one paced breath without starting the practice timer', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const announcements = [];
    const toolData = {
      somaticReset: {
        view: 'setup',
        selectedProtocol: 'shoulder_soften',
        visualMode: 'path',
        visualMotion: 'gentle',
        pacedBreathing: true,
        soundEnabled: false
      }
    };
    const ctx = Object.assign({}, makeCtx({ toolData }), {
      toolData,
      announceToSR(message) { announcements.push(message); }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function PreviewHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });

      expect(host.querySelector('[role="timer"]')).toBeNull();
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
      const preview = host.querySelector('button[data-visual-preview-toggle="true"]');
      expect(preview?.textContent).toBe('Preview one breath');
      expect(preview?.getAttribute('aria-pressed')).toBe('false');

      await React.act(async () => { preview.click(); });
      expect(host.querySelector('[data-visual-preview="in"]')).toBeTruthy();
      expect(host.querySelector('[data-visual-phase="in"]')).toBeTruthy();
      const inhalePath = host.querySelector('[data-breath-path="true"]');
      expect(inhalePath?.getAttribute('data-path-direction')).toBe('right');
      expect(inhalePath?.getAttribute('data-path-position')).toBe('79');
      expect(inhalePath?.getAttribute('data-path-destination')).toBe('inhale');
      expect(inhalePath?.getAttribute('data-path-phase-progress')).toBe('100');
      expect(inhalePath?.querySelector('[data-path-trail="in"]')?.getAttribute('data-path-trail-origin')).toBe('out');
      expect(inhalePath?.querySelector('[data-path-endpoint="in"]')?.getAttribute('data-path-endpoint-state')).toBe('destination');
      expect(inhalePath?.querySelector('[data-path-endpoint="in"]')?.getAttribute('data-path-endpoint-shape')).toBe('circle');
      expect(inhalePath?.querySelector('[data-path-endpoint="out"]')?.getAttribute('data-path-endpoint-state')).toBe('waiting');
      expect(inhalePath?.querySelector('[data-path-endpoint="out"]')?.getAttribute('data-path-endpoint-shape')).toBe('diamond');
      expect(inhalePath?.querySelector('[data-path-phase-label="in"]')?.getAttribute('data-path-label-state')).toBe('active');
      expect(inhalePath?.querySelector('[data-path-phase-label="in"]')?.getAttribute('data-path-label-emphasis')).toBe('underlined');
      expect(inhalePath?.querySelector('[data-path-destination-halo="in"]')).toBeTruthy();
      expect(inhalePath?.querySelector('[data-path-destination-halo="out"]')).toBeNull();
      expect(inhalePath?.querySelector('[data-path-marker="true"]')?.getAttribute('data-path-marker-shape')).toBe('arrow');
      expect(host.querySelector('[data-visual-running="false"]')).toBeTruthy();
      expect(host.querySelector('button[data-visual-preview-toggle="true"]')?.textContent).toBe('Stop preview');
      expect(announcements).toContain('Visual preview: breathe in gently.');

      await React.act(async () => { vi.advanceTimersByTime(4000); });
      expect(host.querySelector('[data-visual-preview="out"]')).toBeTruthy();
      const exhalePath = host.querySelector('[data-breath-path="true"]');
      expect(exhalePath?.getAttribute('data-path-direction')).toBe('left');
      expect(exhalePath?.getAttribute('data-path-position')).toBe('21');
      expect(exhalePath?.getAttribute('data-path-destination')).toBe('exhale');
      expect(exhalePath?.getAttribute('data-path-phase-progress')).toBe('100');
      expect(exhalePath?.querySelector('[data-path-trail="out"]')?.getAttribute('data-path-trail-origin')).toBe('in');
      expect(exhalePath?.querySelector('[data-path-endpoint="out"]')?.getAttribute('data-path-endpoint-state')).toBe('destination');
      expect(exhalePath?.querySelector('[data-path-endpoint="in"]')?.getAttribute('data-path-endpoint-state')).toBe('passed');
      expect(exhalePath?.querySelector('[data-path-phase-label="out"]')?.getAttribute('data-path-label-state')).toBe('active');
      expect(exhalePath?.querySelector('[data-path-phase-label="out"]')?.getAttribute('data-path-label-emphasis')).toBe('underlined');
      expect(exhalePath?.querySelector('[data-path-destination-halo="out"]')).toBeTruthy();
      expect(exhalePath?.querySelector('[data-path-destination-halo="in"]')).toBeNull();
      expect(announcements).toContain('Visual preview: breathe out slowly.');

      await React.act(async () => { vi.advanceTimersByTime(6000); });
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-destination')).toBe('steady');
      expect(host.querySelector('[data-breath-path="true"]')?.querySelector('[data-path-destination-halo]')).toBeNull();
      expect(host.querySelector('button[data-visual-preview-toggle="true"]')?.textContent).toBe('Preview one breath');
      expect(host.textContent).toContain('Open practice timer');
      expect(announcements).toContain('Visual preview complete. The practice timer has not started.');

      const previewAgain = host.querySelector('button[data-visual-preview-toggle="true"]');
      await React.act(async () => { previewAgain.click(); });
      const stop = host.querySelector('button[data-visual-preview-toggle="true"]');
      await React.act(async () => { stop.click(); });
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
      expect(announcements).toContain('Visual preview stopped. The practice timer has not started.');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it.each([
    ['no visual', { visualMode: 'none', visualMotion: 'gentle', pacedBreathing: true }, 'Choose a visual to preview motion.'],
    ['Still motion', { visualMode: 'circle', visualMotion: 'still', pacedBreathing: true }, 'Choose Gentle or Full motion to preview.'],
    ['a naturally paced protocol', { selectedProtocol: 'three_points_support', visualMode: 'circle', visualMotion: 'gentle', pacedBreathing: true }, 'This reset uses natural breathing.'],
    ['breath counting turned off', { visualMode: 'circle', visualMotion: 'gentle', pacedBreathing: false }, 'Turn on breath count to preview a rhythm.']
  ])('keeps the one-breath preview disabled for %s', (label, overrides, reason) => {
    const html = renderSelTool('somaticReset', {
      toolData: {
        somaticReset: {
          view: 'setup',
          selectedProtocol: 'shoulder_soften',
          ...overrides
        }
      }
    });
    const host = document.createElement('div');
    host.innerHTML = html;
    const preview = host.querySelector('button[data-visual-preview-toggle="true"]');
    expect(preview).toBeTruthy();
    expect(preview?.disabled).toBe(true);
    expect(preview?.getAttribute('aria-describedby')).toBe('somatic-reset-visual-preview-note');
    expect(host.textContent).toContain(reason);
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
      const pathChoice = host.querySelector('select[data-visual-select="true"]');
      expect(pathChoice?.value).toBe('wave');
      await React.act(async () => {
        pathChoice.value = 'path';
        pathChoice.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(host.querySelector('[data-visual-mode="path"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-path="true"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-direction')).toBe('steady');
      expect(host.querySelector('[data-visual-description="path"]')?.textContent).toContain('directional point');
      expect(announcements).toContain('Breath path selected.');

      const motion = host.querySelector('select[data-visual-motion-select="true"]');
      expect(motion?.value).toBe('gentle');
      await React.act(async () => {
        motion.value = 'full';
        motion.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const large = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Large visual: off');
      await React.act(async () => { large.click(); });
      const visual = host.querySelector('[data-visual-mode="path"]');
      expect(visual?.getAttribute('data-visual-motion')).toBe('full');
      expect(visual?.getAttribute('data-visual-size')).toBe('large');
      expect(host.textContent).toContain('Large visual: on');
      expect(announcements).toContain('Visual motion set to full.');
      expect(announcements).toContain('Large visual size selected.');

      const countdown = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Countdown: shown');
      await React.act(async () => { countdown.click(); });
      expect(host.querySelector('[data-timer-visible="false"]')).toBeTruthy();
      expect(host.querySelector('[role="progressbar"]')).toBeNull();
      expect(host.textContent).toContain('Countdown: hidden');
      expect(announcements).toContain('Countdown hidden. The practice will still finish automatically.');

      const restoreCountdown = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Countdown: hidden');
      await React.act(async () => { restoreCountdown.click(); });
      expect(host.querySelector('[data-timer-visible="true"]')).toBeTruthy();
      expect(host.querySelector('[role="progressbar"]')).toBeTruthy();
      expect(announcements).toContain('Countdown shown.');

      const guidance = host.querySelector('select[data-guidance-mode-select="true"]');
      expect(guidance?.value).toBe('full');
      await React.act(async () => {
        guidance.value = 'phase';
        guidance.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(host.querySelector('[data-guidance-mode="phase"]')).toBeTruthy();
      expect(host.querySelector('[data-guidance-detail="phase"]')?.textContent).toBe('Ready');
      expect(host.querySelector('[data-guidance-cue="visible"]')).toBeTruthy();
      expect(announcements).toContain('Phase-only breathing cue selected.');

      await React.act(async () => {
        guidance.value = 'hidden';
        guidance.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(host.querySelector('[data-guidance-visible="false"]')).toBeTruthy();
      expect(host.querySelector('[data-guidance-cue="hidden"]')?.style.position).toBe('absolute');
      expect(host.querySelector('[data-guidance-mode="hidden"]')).toBeTruthy();
      expect(announcements).toContain('Guidance words hidden. Screen-reader phase cues remain on.');

      await React.act(async () => {
        guidance.value = 'full';
        guidance.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(host.querySelector('[data-guidance-visible="true"]')).toBeTruthy();
      expect(host.querySelector('[data-guidance-cue="visible"]')).toBeTruthy();
      expect(host.querySelector('[data-guidance-mode="full"]')).toBeTruthy();
      expect(announcements).toContain('Full breathing cue selected.');

      await React.act(async () => {
        motion.value = 'still';
        motion.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const stillStart = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { stillStart.click(); });
      expect(host.querySelector('[data-visual-mode="path"]')?.getAttribute('data-visual-motion')).toBe('still');
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-direction')).toBe('steady');
      const stillPause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { stillPause.click(); });

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

  it('offers a reversible quiet view that enlarges the guide and hides extra options', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const announcements = [];
    const toolData = {
      somaticReset: {
        view: 'practice',
        selectedProtocol: 'shoulder_soften',
        visualMode: 'flower',
        soundEnabled: false
      }
    };
    const ctx = Object.assign({}, makeCtx({ toolData }), {
      toolData,
      announceToSR(message) { announcements.push(message); }
    });
    const root = createRoot(host);
    try {
      await React.act(async () => {
        root.render(React.createElement(function QuietViewHost() {
          return window.SelHub.renderTool('somaticReset', ctx);
        }));
      });
      const quiet = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Quiet view');
      expect(quiet).toBeTruthy();
      await React.act(async () => { quiet.click(); });
      expect(host.querySelector('[data-quiet-view="true"]')).toBeTruthy();
      expect(host.querySelector('[data-visual-mode="flower"]')?.getAttribute('data-visual-size')).toBe('focus');
      expect(host.textContent).toContain('Exit quiet view');
      expect(host.textContent).not.toContain('Practice options');
      expect(host.textContent).not.toContain('Still option and safety');
      expect(announcements).toContain('Quiet view on. Extra practice options are hidden.');

      const visualToggle = host.querySelector('button[data-visual-toggle="true"]');
      expect(visualToggle).toBeTruthy();
      expect(visualToggle?.getAttribute('aria-label')).toBe('Start practice from Petal bloom. Ready. Cadence: 4 seconds in, 6 seconds out. Optional breath guide ready');
      expect(visualToggle?.getAttribute('aria-keyshortcuts')).toBe('Enter Space');
      expect(visualToggle?.getAttribute('data-visual-action')).toBe('start');
      expect(visualToggle?.textContent).toContain('Press visual to start');

      await React.act(async () => { visualToggle.click(); });
      expect(visualToggle?.getAttribute('data-visual-action')).toBe('pause');
      expect(visualToggle?.getAttribute('aria-label')).toBe('Pause practice from Petal bloom. Inhale phase. Cadence: 4 seconds in, 6 seconds out. Breathe in gently, count 4');
      expect(host.textContent).toContain('Press visual to pause');
      expect(Array.from(host.querySelectorAll('button')).some((button) => button.textContent === 'Pause')).toBe(true);
      expect(announcements).toContain('Practice started.');

      await React.act(async () => { vi.advanceTimersByTime(1250); });
      await React.act(async () => { visualToggle.click(); });
      expect(visualToggle?.getAttribute('data-visual-action')).toBe('resume');
      expect(visualToggle?.getAttribute('aria-label')).toBe('Resume practice from Petal bloom. Paused. Cadence: 4 seconds in, 6 seconds out. Breath guide paused');
      expect(host.textContent).toContain('Press visual to resume');
      expect(Array.from(host.querySelectorAll('button')).some((button) => button.textContent === 'Resume')).toBe(true);
      expect(announcements).toContain('Practice paused.');

      const exit = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Exit quiet view');
      expect(exit?.getAttribute('aria-keyshortcuts')).toBe('Escape');
      await React.act(async () => {
        host.querySelector('[data-quiet-view="true"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(host.querySelector('[data-quiet-view="false"]')).toBeTruthy();
      expect(host.textContent).toContain('Practice options');
      expect(host.querySelector('[data-visual-toggle="true"]')).toBeNull();
      expect(host.querySelector('[data-visual-mode="flower"]')?.getAttribute('role')).toBe('img');
      expect(announcements).toContain('Quiet view closed. Practice options restored.');

      const reopen = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Quiet view');
      await React.act(async () => { reopen.click(); });
      const clickExit = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Exit quiet view');
      await React.act(async () => { clickExit.click(); });
      expect(announcements).toContain('Practice options restored.');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
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
          visualMode: 'path',
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
      const progress = host.querySelector('[role="progressbar"]');
      expect(progress?.getAttribute('aria-valuenow')).toBe('0');
      expect(progress?.getAttribute('aria-valuemax')).toBe('60');
      expect(progress?.getAttribute('aria-valuetext')).toBe('1:00 remaining');
      expect(host.querySelector('[data-visual-mode]')?.getAttribute('data-visual-phase')).toBe('ready');
      const readyPath = host.querySelector('[data-breath-path="true"]');
      expect(readyPath?.getAttribute('data-path-direction')).toBe('steady');
      expect(readyPath?.getAttribute('data-path-destination')).toBe('steady');
      expect(readyPath?.getAttribute('data-path-phase-progress')).toBe('steady');
      expect(readyPath?.querySelector('[data-path-phase-label="in"]')?.getAttribute('data-path-label-state')).toBe('steady');
      expect(readyPath?.querySelector('[data-path-phase-label="out"]')?.getAttribute('data-path-label-state')).toBe('steady');
      expect(readyPath?.querySelector('[data-path-destination-halo]')).toBeNull();
      expect(host.querySelector('[data-breath-phase-announcer]')?.getAttribute('data-breath-phase-announcer')).toBe('ready');
      expect(host.querySelector('[data-breath-phase-announcer]')?.textContent).toBe('Optional breath guide ready.');
      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      await React.act(async () => { vi.advanceTimersByTime(1250); });
      expect(host.querySelector('[role="timer"]')?.textContent).toBe('0:59');
      expect(progress?.getAttribute('aria-valuenow')).toBe('1');
      expect(progress?.getAttribute('aria-valuetext')).toBe('0:59 remaining');
      expect(progress?.getAttribute('data-session-progress')).toBe('2');
      expect(host.querySelector('[data-visual-mode]')?.getAttribute('data-visual-phase')).toBe('in');
      expect(host.querySelector('[data-visual-mode]')?.getAttribute('data-visual-running')).toBe('true');
      const movingInPath = host.querySelector('[data-breath-path="true"]');
      expect(movingInPath?.getAttribute('data-path-direction')).toBe('right');
      expect(movingInPath?.getAttribute('data-path-destination')).toBe('inhale');
      expect(movingInPath?.querySelector('[data-path-trail="in"]')?.getAttribute('data-path-trail-origin')).toBe('out');
      expect(movingInPath?.querySelector('[data-path-destination-halo="in"]')).toBeTruthy();
      expect(movingInPath?.querySelector('[data-path-destination-halo="out"]')).toBeNull();
      expect(host.querySelector('[data-breath-phase-announcer]')?.textContent).toBe('Breathe in gently');

      await React.act(async () => { vi.advanceTimersByTime(3500); });
      expect(host.querySelector('[data-visual-mode]')?.getAttribute('data-visual-phase')).toBe('out');
      const movingOutPath = host.querySelector('[data-breath-path="true"]');
      expect(movingOutPath?.getAttribute('data-path-direction')).toBe('left');
      expect(movingOutPath?.getAttribute('data-path-destination')).toBe('exhale');
      expect(movingOutPath?.querySelector('[data-path-trail="out"]')?.getAttribute('data-path-trail-origin')).toBe('in');
      expect(movingOutPath?.querySelector('[data-path-destination-halo="out"]')).toBeTruthy();
      expect(movingOutPath?.querySelector('[data-path-destination-halo="in"]')).toBeNull();
      expect(host.querySelector('[data-breath-phase-announcer]')?.textContent).toBe('Breathe out slowly');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      const pausedAt = host.querySelector('[role="timer"]')?.textContent;
      expect(host.querySelector('[data-visual-mode]')?.getAttribute('data-visual-phase')).toBe('paused');
      const pausedPath = host.querySelector('[data-breath-path="true"]');
      expect(pausedPath?.getAttribute('data-path-direction')).toBe('steady');
      expect(pausedPath?.getAttribute('data-path-destination')).toBe('steady');
      expect(pausedPath?.querySelector('[data-path-destination-halo]')).toBeNull();
      expect(pausedPath?.querySelector('[data-path-trail]')).toBeNull();
      expect(pausedPath?.querySelector('[data-path-phase-label="in"]')?.getAttribute('data-path-label-state')).toBe('steady');
      expect(pausedPath?.querySelector('[data-path-phase-label="out"]')?.getAttribute('data-path-label-state')).toBe('steady');
      expect(host.querySelector('[data-breath-phase-announcer]')?.textContent).toBe('Practice paused.');
      expect(host.textContent).toContain('Paused - resume when ready');
      await React.act(async () => { vi.advanceTimersByTime(5000); });
      expect(host.querySelector('[role="timer"]')?.textContent).toBe(pausedAt);
      expect(host.textContent).toContain('Resume');

      const restart = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Restart timer');
      expect(restart.disabled).toBe(false);
      await React.act(async () => { restart.click(); });
      expect(host.querySelector('[role="timer"]')?.textContent).toBe('1:00');
      expect(progress?.getAttribute('aria-valuenow')).toBe('0');
      expect(host.textContent).toContain('Start');
      expect(restart.disabled).toBe(true);
      expect(host.querySelector('[data-breath-phase-announcer]')?.textContent).toBe('Optional breath guide ready.');
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
    expect(hub).toContain('The countdown can be hidden; guidance words can be full, phase-only, or hidden');
    expect(hub).toContain('a two-part Breath Orbit with solid and dotted phase arcs');
    expect(hub).toContain('A compact keyboard-accessible picker keeps every visual manageable on small screens');
    expect(hub).toContain('Visuals include a Flowing Wave that pairs IN · RISE with a solid line and round marker, OUT · SETTLE with a dotted line and diamond marker, and PAUSED with pause bars');
    expect(hub).toContain('Students can sample one breath of motion before the timer starts');
    expect(hub).toContain('Offer full, phase-only, or hidden guidance words');
    expect(hub).toContain('The Breath Orbit pairs solid and dotted arcs with a bolder active phase, a matching solid-or-dotted center ring, and direct IN and OUT labels; its center switches from a dot to pause bars when paused, and its outlined diamond or ring identifies the next phase handoff, while its round-or-diamond clockwise marker, handoff diamond, return ring, short inhale bars, and hollow exhale dots keep phase and optional count legible without color');
    expect(hub).toContain('In Quiet View, the enlarged visual becomes a keyboard- and touch-operable start/pause control');
    expect(hub).toContain('The Flowing Wave uses IN · RISE with a solid line and round marker, OUT · SETTLE with a dotted line and diamond marker, and pause bars for a paused session');
    expect(hub).toContain('The Petal Bloom uses IN · OPEN with solid petal outlines and a round center, OUT · SOFTEN with dotted outlines and a diamond center, and center pause bars for a paused session');
    expect(hub).toContain('The Grounding Horizon uses IN · RISE with a solid sun outline and circle center, OUT · SETTLE with a dotted sun outline and diamond center, and sun pause bars when paused');
    expect(hub).toContain('The Breath Path uses a round IN target, diamond OUT target, active-origin trail, and outlined next destination so direction does not depend on color');
    expect(hub).toContain('Offer screen-reader phase cues, plus hidden-countdown, hidden-guidance, still-motion, no-visual');
    expect(hub).toContain('number ratings are optional');
    expect(hub).toContain('never require ratings');
    expect(standards).toContain("'somaticReset': {");
    expect(standards).toContain('a compact native visual picker');
    expect(standards).toContain('a one-cycle motion preview before timing begins');
    expect(standards).toContain('a phase-only cue, optional countdown and guidance-word display');
    expect(standards).toContain('a two-part cyclic guide with non-color phase patterns, active stroke-weight emphasis, a matching phase-patterned center ring, direct phase labels, a paused-state center cue, an outlined next-handoff station, a phase-shaped direction marker, a shape-coded cadence map, and distinct handoff and return markers');
    expect(standards).toContain('a quiet focus view with a native visual start/pause control');
    expect(standards).toContain('optional countdown and guidance-word display, user-controlled motion');
    expect(standards).toContain('a flowing guide with direct rise and settle cues, solid-or-dotted phase patterns, circle-or-diamond markers, and pause bars');
    expect(standards).toContain('a predictable direction-marked linear visual with direct endpoint labels, round IN and diamond OUT targets, an active-origin trail, and an outlined next destination, a two-part cyclic guide with non-color phase patterns, active stroke-weight emphasis, a matching phase-patterned center ring, direct phase labels, a paused-state center cue, an outlined next-handoff station, a phase-shaped direction marker, a shape-coded cadence map, and distinct handoff and return markers, screen-reader phase cues, a quiet focus view');
    expect(standards).toContain('Quiet View makes the enlarged visual a direct start/pause control');
    expect(standards).toContain('Use the compact visual picker to keep every guide available without a dense button grid');
    expect(standards).toContain('Offer full, phase-only, or hidden guidance words');
    expect(standards).toContain('The Breath Orbit pairs a solid inhale arc with a dotted exhale arc, makes the active phase bolder, repeats the solid-or-dotted phase pattern on its center ring, directly labels the phases IN and OUT, changes its center dot to pause bars when the session pauses, outlines the diamond or ring at the next phase handoff, changes its traveling marker from a circle on inhale to a diamond on exhale, and adds a clockwise chevron, short inhale bars, hollow exhale dots, plus distinct handoff and return markers');
    expect(standards).toContain('so phase, session state, destination, and optional count do not depend on color alone');
    expect(standards).toContain('Let students sample one breath of visual motion before timing begins, or choose Still');
    expect(standards).toContain('The Flowing Wave uses IN · RISE with a solid line and round marker, OUT · SETTLE with a dotted line and diamond marker, and pause bars for a paused session');
    expect(standards).toContain('a flower guide with direct open and soften cues, solid-or-dotted petal outlines, circle-or-diamond center markers, and pause bars');
    expect(standards).toContain('The Petal Bloom uses IN · OPEN with solid petal outlines and a round center, OUT · SOFTEN with dotted outlines and a diamond center, and center pause bars for a paused session');
    expect(standards).toContain('The Grounding Horizon uses IN · RISE with a solid sun outline and circle center, OUT · SETTLE with a dotted sun outline and diamond center, and sun pause bars when paused');
    expect(standards).toContain('The Breath Path uses a round IN target, diamond OUT target, active-origin trail, and outlined next destination so direction does not depend on color');
    expect(standards).toContain('Offer screen-reader phase cues, plus hidden-countdown, hidden-guidance, still-motion');
    expect(standards).toContain('optional ratings, no-count and no-visual modes');
    expect(loader).toContain('sel_hub/sel_tool_somaticreset.js');
    expect(desktopLoader).toContain('sel_hub/sel_tool_somaticreset.js');
    expect(build).toContain('sel_hub/sel_tool_somaticreset.js');
    expect(publicHub).toBe(hub);
    expect(publicStandards).toBe(standards);
  });
});
