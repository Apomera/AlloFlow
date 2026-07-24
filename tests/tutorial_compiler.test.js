import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let TC;

beforeAll(() => {
  loadAlloModule('tutorial_compiler_module.js');
  TC = window.AlloModules.TutorialCompiler;
  if (!TC) throw new Error('TutorialCompiler failed to register');
});

describe('TutorialCompiler deployment', () => {
  it('keeps the inactive CDN copy byte-identical for future lazy activation', () => {
    const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(read('desktop/web-app/public/tutorial_compiler_module.js')).toBe(read('tutorial_compiler_module.js'));
  });
});

describe('TutorialCompiler manifest', () => {
  it('localizes narration beats and estimates a bounded duration', () => {
    const translations = {
      'guided.simplified.label': 'Adapt text',
      'guided.simplified.action': 'Choose the target reading level.',
      'guided.simplified.success': 'The adapted text is ready.'
    };
    const beats = TC.narrationForStep(
      { id: 'simplified', label: 'Fallback', action: 'Fallback action', success: 'Fallback success' },
      (key) => translations[key] || key
    );
    expect(beats).toEqual([
      { kind: 'action', text: 'Adapt text. Choose the target reading level.' },
      { kind: 'success', text: 'The adapted text is ready.' }
    ]);
    expect(TC.estimateNarrationSeconds('two words', 200)).toBe(1.5);
  });

  it('builds only requested guided steps with their anchors', () => {
    const manifest = TC.buildTutorialManifest([
      { id: 'source-input', label: 'Source', action: 'Add text.', success: 'Text added.' },
      { id: 'simplified', label: 'Adapt', action: 'Adapt it.', success: 'Adapted.' }
    ], {
      'source-input': 'tour-source',
      simplified: 'tour-simplified'
    }, null, { only: ['simplified'], wpm: 150 });

    expect(manifest.generatedFrom).toBe('GUIDED_STEPS');
    expect(manifest.stepCount).toBe(1);
    expect(manifest.steps[0].id).toBe('simplified');
    expect(manifest.steps[0].anchorId).toBe('tour-simplified');
    expect(manifest.totalSeconds).toBeGreaterThanOrEqual(3);
  });
});

describe('TutorialCompiler execution contract', () => {
  const manifest = {
    generatedFrom: 'GUIDED_STEPS',
    version: 1,
    totalSeconds: 4,
    steps: [{
      id: 'simplified',
      anchorId: 'tour-simplified',
      label: 'Adapt text',
      seconds: 4,
      beats: [
        { kind: 'action', text: 'Choose a reading level.', seconds: 2 },
        { kind: 'success', text: 'The adapted text is ready.', seconds: 2 }
      ]
    }]
  };

  it('reports missing production adapters honestly', async () => {
    await expect(TC.compileTutorial(manifest, {})).resolves.toMatchObject({
      ok: false,
      reason: 'adapters-missing'
    });
  });

  it('speaks the action, performs the real step, then speaks success and records actual timing', async () => {
    const order = [];
    let clock = 0;
    const result = await TC.compileTutorial(manifest, {
      now: () => clock,
      startCapture: async () => {
        order.push('capture:start');
        return { stop: async () => { order.push('capture:stop'); clock += 7; return new Blob(['video']); } };
      },
      spotlight: async () => order.push('spotlight'),
      speak: async (text) => { order.push('speak:' + text); clock += 1; },
      performStep: async () => order.push('perform'),
      composite: async (video, compiled) => {
        order.push('composite');
        return { ok: true, video, compiled };
      }
    });

    expect(order).toEqual([
      'capture:start',
      'spotlight',
      'speak:Choose a reading level.',
      'perform',
      'speak:The adapted text is ready.',
      'capture:stop',
      'composite'
    ]);
    expect(result.ok).toBe(true);
    expect(result.compiled.timeline).toEqual([
      { stepId: 'simplified', kind: 'action', text: 'Choose a reading level.', startSec: 0, endSec: 1 },
      { stepId: 'simplified', kind: 'success', text: 'The adapted text is ready.', startSec: 1, endSec: 2 }
    ]);
    expect(result.compiled.actualSeconds).toBe(2);
  });

  it('always stops capture and rejects when narration fails instead of returning a partial success', async () => {
    const stop = vi.fn(async () => new Blob(['partial']));
    const composite = vi.fn();
    await expect(TC.compileTutorial(manifest, {
      startCapture: async () => ({ stop }),
      speak: async () => { throw new Error('TTS failed'); },
      performStep: async () => {},
      composite
    })).rejects.toThrow('TTS failed');
    expect(stop).toHaveBeenCalledOnce();
    expect(composite).not.toHaveBeenCalled();
  });

  it('stops capture and rejects when the guided spotlight cannot find its target', async () => {
    const stop = vi.fn(async () => new Blob(['partial']));
    await expect(TC.compileTutorial(manifest, {
      startCapture: async () => ({ stop }),
      spotlight: async () => { throw new Error('Missing guided anchor'); },
      speak: async () => {},
      performStep: async () => {}
    })).rejects.toThrow('Missing guided anchor');
    expect(stop).toHaveBeenCalledOnce();
  });

  it('rejects capture sessions that cannot be stopped', async () => {
    await expect(TC.compileTutorial(manifest, {
      startCapture: async () => ({}),
      speak: async () => {},
      performStep: async () => {}
    })).rejects.toThrow('must return a session with stop');
  });
});