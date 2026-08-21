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
    expect(html).toContain(`${label}. Optional breath guide ready`);
    expect(html).toContain('<svg');
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
    expect(orbit?.getAttribute('data-orbit-inhale-percent')).toBe('40');
    expect(orbit?.querySelector('[data-orbit-segment="inhale"]')?.getAttribute('data-orbit-segment-state')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('stroke-dasharray')).toBe('4 8');
    expect(orbit?.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('data-orbit-segment-state')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-handoff="true"]')).toBeTruthy();
    expect(orbit?.querySelector('[data-orbit-center="true"]')).toBeTruthy();
    expect(orbit?.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-phase')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('circle');
    expect(orbit?.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-direction')).toBe('steady');
    expect(orbit?.querySelector('[data-orbit-marker-core="circle"]')).toBeTruthy();
    expect(orbit?.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeNull();
    expect(paced).toContain('Breath orbit. Optional breath guide ready');
    expect(paced).toContain('A round inhale marker and diamond exhale marker move clockwise');

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
    expect(natural).toContain('data-orbit-marker-phase="steady"');
    expect(natural).toContain('data-orbit-marker-direction="steady"');
    expect(natural).toContain('Breath orbit. Steady guide; breathe naturally');

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
    expect(reduced).toContain('data-orbit-marker-phase="steady"');
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

      const preview = host.querySelector('button[data-visual-preview-toggle="true"]');
      await React.act(async () => { preview.click(); });
      expect(host.querySelector('[data-visual-preview="in"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-progress')).toBe('40');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-direction')).toBe('clockwise');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('in');
      expect(host.querySelector('[data-orbit-segment="inhale"]')?.getAttribute('data-orbit-segment-state')).toBe('active');
      expect(host.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('data-orbit-segment-state')).toBe('inactive');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-phase')).toBe('in');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(host.querySelector('[data-orbit-marker-core="circle"]')).toBeTruthy();
      expect(host.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeTruthy();

      await React.act(async () => { vi.advanceTimersByTime(4000); });
      expect(host.querySelector('[data-visual-preview="out"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-progress')).toBe('100');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('out');
      expect(host.querySelector('[data-orbit-segment="inhale"]')?.getAttribute('data-orbit-segment-state')).toBe('inactive');
      expect(host.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('data-orbit-segment-state')).toBe('active');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-phase')).toBe('out');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('diamond');
      expect(host.querySelector('[data-orbit-marker-core="diamond"]')).toBeTruthy();
      expect(host.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeTruthy();
      expect(announcements).toContain('Visual preview: breathe out slowly.');

      await React.act(async () => { vi.advanceTimersByTime(6000); });
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-progress')).toBe('0');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-direction')).toBe('steady');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('steady');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-phase')).toBe('steady');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('circle');
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

      const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Start');
      await React.act(async () => { start.click(); });
      expect(host.querySelector('[data-guidance-visible="false"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-direction')).toBe('clockwise');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('in');
      expect(host.querySelector('[data-orbit-marker="true"]')?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(host.querySelector('[data-orbit-direction-cue="clockwise"]')).toBeTruthy();

      await React.act(async () => { vi.advanceTimersByTime(9250); });
      let orbit = host.querySelector('[data-breath-orbit="true"]');
      marker = host.querySelector('[data-orbit-marker="true"]');
      expect(orbit?.getAttribute('data-orbit-progress')).toBe('90');
      expect(orbit?.getAttribute('data-orbit-turn')).toBe('0');
      expect(orbit?.getAttribute('data-orbit-rotation')).toBe('324');
      expect(orbit?.getAttribute('data-orbit-active-segment')).toBe('out');
      expect(orbit?.querySelector('[data-orbit-segment="exhale"]')?.getAttribute('data-orbit-segment-state')).toBe('active');
      expect(marker?.getAttribute('data-orbit-marker-phase')).toBe('out');
      expect(marker?.getAttribute('data-orbit-marker-shape')).toBe('diamond');
      expect(marker?.getAttribute('data-orbit-marker-direction')).toBe('clockwise');
      expect(marker?.querySelector('[data-orbit-marker-core="diamond"]')).toBeTruthy();
      expect(marker?.style.transform).toBe('rotate(324deg)');
      expect(marker?.style.transition).not.toBe('none');

      await React.act(async () => { vi.advanceTimersByTime(2000); });
      orbit = host.querySelector('[data-breath-orbit="true"]');
      marker = host.querySelector('[data-orbit-marker="true"]');
      expect(orbit?.getAttribute('data-orbit-progress')).toBe('10');
      expect(orbit?.getAttribute('data-orbit-turn')).toBe('1');
      expect(orbit?.getAttribute('data-orbit-rotation')).toBe('396');
      expect(orbit?.getAttribute('data-orbit-active-segment')).toBe('in');
      expect(orbit?.querySelector('[data-orbit-segment="inhale"]')?.getAttribute('data-orbit-segment-state')).toBe('active');
      expect(marker?.getAttribute('data-orbit-marker-phase')).toBe('in');
      expect(marker?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(marker?.querySelector('[data-orbit-marker-core="circle"]')).toBeTruthy();
      expect(marker?.style.transform).toBe('rotate(396deg)');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      marker = host.querySelector('[data-orbit-marker="true"]');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-direction')).toBe('steady');
      expect(host.querySelector('[data-breath-orbit="true"]')?.getAttribute('data-orbit-active-segment')).toBe('steady');
      expect(marker?.getAttribute('data-orbit-marker-phase')).toBe('steady');
      expect(marker?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(marker?.getAttribute('data-orbit-marker-direction')).toBe('steady');
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
      expect(marker?.getAttribute('data-orbit-marker-phase')).toBe('steady');
      expect(marker?.getAttribute('data-orbit-marker-shape')).toBe('circle');
      expect(marker?.style.transform).toBe('rotate(0deg)');
      expect(marker?.style.transition).toBe('none');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      vi.useRealTimers();
    }
  });

  it('keeps the breath path centered for natural breathing and still motion', () => {
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
    expect(natural).toContain('Breath path. Steady guide; breathe naturally and move only if comfortable');

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
    expect(setup).toContain('Petals open and close around a steady center.');
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
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-direction')).toBe('right');
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-position')).toBe('79');
      expect(host.querySelector('[data-visual-running="false"]')).toBeTruthy();
      expect(host.querySelector('button[data-visual-preview-toggle="true"]')?.textContent).toBe('Stop preview');
      expect(announcements).toContain('Visual preview: breathe in gently.');

      await React.act(async () => { vi.advanceTimersByTime(4000); });
      expect(host.querySelector('[data-visual-preview="out"]')).toBeTruthy();
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-direction')).toBe('left');
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-position')).toBe('21');
      expect(announcements).toContain('Visual preview: breathe out slowly.');

      await React.act(async () => { vi.advanceTimersByTime(6000); });
      expect(host.querySelector('[data-visual-preview="idle"]')).toBeTruthy();
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
      expect(visualToggle?.getAttribute('aria-label')).toBe('Start practice from Petal bloom.');
      expect(visualToggle?.getAttribute('aria-keyshortcuts')).toBe('Enter Space');
      expect(visualToggle?.getAttribute('data-visual-action')).toBe('start');
      expect(visualToggle?.textContent).toContain('Press visual to start');

      await React.act(async () => { visualToggle.click(); });
      expect(visualToggle?.getAttribute('data-visual-action')).toBe('pause');
      expect(visualToggle?.getAttribute('aria-label')).toBe('Pause practice from Petal bloom.');
      expect(host.textContent).toContain('Press visual to pause');
      expect(Array.from(host.querySelectorAll('button')).some((button) => button.textContent === 'Pause')).toBe(true);
      expect(announcements).toContain('Practice started.');

      await React.act(async () => { vi.advanceTimersByTime(1250); });
      await React.act(async () => { visualToggle.click(); });
      expect(visualToggle?.getAttribute('data-visual-action')).toBe('resume');
      expect(visualToggle?.getAttribute('aria-label')).toBe('Resume practice from Petal bloom.');
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
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-direction')).toBe('steady');
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
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-direction')).toBe('right');
      expect(host.querySelector('[data-breath-phase-announcer]')?.textContent).toBe('Breathe in gently');

      await React.act(async () => { vi.advanceTimersByTime(3500); });
      expect(host.querySelector('[data-visual-mode]')?.getAttribute('data-visual-phase')).toBe('out');
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-direction')).toBe('left');
      expect(host.querySelector('[data-breath-phase-announcer]')?.textContent).toBe('Breathe out slowly');

      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Pause');
      await React.act(async () => { pause.click(); });
      const pausedAt = host.querySelector('[role="timer"]')?.textContent;
      expect(host.querySelector('[data-visual-mode]')?.getAttribute('data-visual-phase')).toBe('paused');
      expect(host.querySelector('[data-breath-path="true"]')?.getAttribute('data-path-direction')).toBe('steady');
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
    expect(hub).toContain('Visuals include a predictable direction-marked linear path, a two-part Breath Orbit with solid and dotted phase arcs that become bolder while active plus a phase-shaped clockwise marker, and screen-reader phase cues');
    expect(hub).toContain('students can sample one breath of motion before the timer starts');
    expect(hub).toContain('Offer full, phase-only, or hidden guidance words');
    expect(hub).toContain('The Breath Orbit uses a solid inhale arc, dotted exhale arc, handoff marker, bolder active phase, and a traveling marker that is round on inhale, diamond-shaped on exhale, and carries a clockwise chevron while moving');
    expect(hub).toContain('In Quiet View, the enlarged visual becomes a keyboard- and touch-operable start/pause control');
    expect(hub).toContain('Offer the direction-marked linear guide and screen-reader phase cues, plus hidden-countdown, hidden-guidance, still-motion, no-visual');
    expect(hub).toContain('number ratings are optional');
    expect(hub).toContain('never require ratings');
    expect(standards).toContain("'somaticReset': {");
    expect(standards).toContain('a compact native visual picker');
    expect(standards).toContain('a one-cycle motion preview before timing begins');
    expect(standards).toContain('a phase-only cue, optional countdown and guidance-word display');
    expect(standards).toContain('a two-part cyclic guide with non-color phase patterns, active stroke-weight emphasis, a phase-shaped direction marker, and a handoff marker');
    expect(standards).toContain('a quiet focus view with a native visual start/pause control');
    expect(standards).toContain('optional countdown and guidance-word display, user-controlled motion');
    expect(standards).toContain('a predictable direction-marked linear visual, a two-part cyclic guide with non-color phase patterns, active stroke-weight emphasis, a phase-shaped direction marker, and a handoff marker, screen-reader phase cues, a quiet focus view');
    expect(standards).toContain('Quiet View makes the enlarged visual a direct start/pause control');
    expect(standards).toContain('Use the compact visual picker to keep every guide available without a dense button grid');
    expect(standards).toContain('Offer full, phase-only, or hidden guidance words');
    expect(standards).toContain('The Breath Orbit pairs a solid inhale arc with a dotted exhale arc, makes the active phase bolder, changes its traveling marker from a circle on inhale to a diamond on exhale, and adds a clockwise chevron plus handoff marker');
    expect(standards).toContain('Let students sample one breath of visual motion before timing begins, or choose Still');
    expect(standards).toContain('Offer the direction-marked linear guide and screen-reader phase cues, plus hidden-countdown, hidden-guidance, still-motion');
    expect(standards).toContain('optional ratings, no-count and no-visual modes');
    expect(loader).toContain('sel_hub/sel_tool_somaticreset.js');
    expect(desktopLoader).toContain('sel_hub/sel_tool_somaticreset.js');
    expect(build).toContain('sel_hub/sel_tool_somaticreset.js');
    expect(publicHub).toBe(hub);
    expect(publicStandards).toBe(standards);
  });
});
