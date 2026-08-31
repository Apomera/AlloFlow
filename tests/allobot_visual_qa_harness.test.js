import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const visualQa = require('../dev-tools/allobot_visual_qa.cjs');

describe('AlloBot deterministic visual QA harness', () => {
  it('covers actual 64px and 200% rendering', () => {
    expect(visualQa.SIZES.map((size) => [size.id, size.scale, size.width])).toEqual([
      ['64px', 1, 64],
      ['200pct', 2, 128],
    ]);
    expect(visualQa.VISIBLE_PAINT_PROPERTIES.length).toBeGreaterThan(60);
    expect(visualQa.VISIBLE_PAINT_PROPERTIES).toEqual(expect.arrayContaining([
      'background-color', 'clip-path', 'filter', 'fill', 'stroke', 'box-shadow',
      'font-family', 'mask-image', 'transform',
    ]));
  });

  it('covers the requested state matrix at both sizes', () => {
    expect(visualQa.STATES.map((state) => state.id)).toEqual([
      'light-idle', 'light-happy', 'light-thinking', 'light-sad',
      'dark-idle', 'contrast-idle', 'light-chrome-top-right',
      'contrast-live-chrome-bottom-left', 'light-listening', 'light-talking',
      'light-sleeping', 'light-prop-gaze-left', 'light-prop-gaze-right',
      'light-scholar-specs', 'light-librarian-kit',
    ]);
    const items = visualQa.matrix();
    expect(items).toHaveLength(30);
    expect(new Set(items.map((state) => state.id)).size).toBe(30);
    for (const state of visualQa.STATES) {
      expect(items.filter((item) => item.stateId === state.id).map((item) => item.size.id)).toEqual(['64px', '200pct']);
    }
  });

  it('makes interactive setup and lens simplification explicit', () => {
    const states = Object.fromEntries(visualQa.STATES.map((state) => [state.id, state]));
    expect(states['light-talking'].setup).toBe('talking');
    expect(states['light-sleeping'].setup).toBe('sleeping');
    expect(states['light-prop-gaze-left'].side).toBe('left');
    expect(states['light-prop-gaze-right'].side).toBe('right');
    expect(states['light-scholar-specs'].eyeDetails).toBe('simplified');
    expect(states['light-librarian-kit'].eyeDetails).toBe('simplified');
    expect(states['light-chrome-top-right']).toEqual(expect.objectContaining({ chrome: 'hover', anchor: 'top-right' }));
    expect(states['contrast-live-chrome-bottom-left']).toEqual(expect.objectContaining({ chrome: 'hover', anchor: 'bottom-left' }));
    expect(states['light-chrome-top-right'].props.accessory).toBe('gear');
    expect(states['contrast-live-chrome-bottom-left'].props.accessory).toBe('artist');
    expect(visualQa.OUTPUT.replace(/\\/g, '/')).toContain('/test-results/allobot-visual-qa');
  });

  it('pins every vector state to an explicitly reviewed vector baseline', () => {
    const baseline = JSON.parse(readFileSync(visualQa.BASELINE, 'utf8'));
    const ids = visualQa.matrix().map((state) => state.id).sort();
    expect(baseline.formatVersion).toBe(visualQa.BASELINE_FORMAT_VERSION);
    expect(baseline.scenarioCount).toBe(30);
    expect(Object.keys(baseline.scenarios).sort()).toEqual(ids);
    const stylesheetVariants = Object.entries(baseline.stylesheets);
    expect(stylesheetVariants).toHaveLength(2);
    expect(stylesheetVariants.flatMap(([, variant]) => variant.scenarioIds).sort()).toEqual(ids);
    for (const [signature, variant] of stylesheetVariants) {
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
      expect(variant).toEqual(expect.objectContaining({
        authoredKeyframes: expect.any(Array),
        parsedKeyframes: expect.any(Array),
        keyframesSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        animationBindingsSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }));
      expect(variant.parsedKeyframes).toEqual(variant.authoredKeyframes);
      expect(variant.runtimeAnimations.map((animation) => animation.name)).toEqual(
        visualQa.RUNTIME_IDLE_ANIMATIONS.map((animation) => animation.name),
      );
    }
    for (const [id, entry] of Object.entries(baseline.scenarios)) {
      expect(entry.domSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.stylesheetSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.paintTreeSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.paintNodeCount).toBeGreaterThan(0);
      expect(baseline.stylesheets[entry.stylesheetSha256].scenarioIds).toContain(id);
      expect(entry.measurements).toEqual(expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
        theme: expect.any(String),
        face: expect.any(String),
        bounds: expect.any(Object),
      }));
      expect(entry.computedPaint).toEqual(expect.objectContaining({
        avatar: expect.any(Object),
        body: expect.any(Object),
        mouth: expect.any(Object),
      }));
      expect(entry.computedPaint).toHaveProperty('eyeCore');
      if (id.includes('sleeping')) {
        expect(entry.measurements.avatarAction).toEqual(expect.objectContaining({
          kind: 'wake',
          appearance: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0)',
          borderWidths: ['0px', '0px', '0px', '0px'],
          padding: ['0px', '0px', '0px', '0px'],
        }));
      }
      if (id.includes('prop-gaze')) {
        expect(entry.measurements.accessoryBounds).toEqual(expect.objectContaining({
          left: expect.any(Number),
          top: expect.any(Number),
          rightGap: expect.any(Number),
          bottomGap: expect.any(Number),
        }));
        expect(Math.min(
          entry.measurements.accessoryBounds.left,
          entry.measurements.accessoryBounds.top,
          entry.measurements.accessoryBounds.rightGap,
          entry.measurements.accessoryBounds.bottomGap,
        )).toBeGreaterThanOrEqual(-0.25);
      }
      if (id.includes('chrome')) {
        expect(entry.chromeDomSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(Object.keys(entry.computedPaint.controls).sort()).toEqual(['hide', 'mic', 'settings', 'sound']);
      } else {
        expect(entry.chromeDomSha256).toBeNull();
      }
    }
  });

  it('fails when authored or referenced keyframes are dropped by CSS parsing', () => {
    const valid = {
      authoredKeyframes: ['allobotBlink'],
      keyframes: [{
        scope: 'root',
        name: 'allobotBlink',
        frames: [{ offset: '0%', declarations: { opacity: '0' } }],
      }],
      animationBindings: [{
        scope: 'root',
        selector: '.animate-allobot-blink',
        animationNames: ['allobotBlink'],
        declarations: { 'animation-name': 'allobotBlink' },
      }],
    };
    expect(visualQa.validateStylesheetSemantics(valid)).toBe(true);
    expect(() => visualQa.validateStylesheetSemantics({ ...valid, keyframes: [] }))
      .toThrow(/authored but not parsed/);
    expect(() => visualQa.validateStylesheetSemantics({
      ...valid,
      animationBindings: [{ ...valid.animationBindings[0], animationNames: ['allobotMissing'] }],
    })).toThrow(/reference missing keyframes/);
  });

  it('fails when a summon, ambient, or imperative animation class is a CSS no-op', () => {
    const keyframes = visualQa.RUNTIME_IDLE_ANIMATIONS.map((animation) => ({
      scope: 'root',
      name: 'allo-' + animation.name,
      frames: [{ offset: '0%', declarations: { transform: 'none' } }],
    }));
    const valid = {
      authoredKeyframes: keyframes.map((rule) => rule.name),
      keyframes,
      animationBindings: visualQa.RUNTIME_IDLE_ANIMATIONS.map((animation) => ({
        scope: 'root',
        selector: '.animate-allo-' + animation.name,
        animationNames: ['allo-' + animation.name],
        declarations: { 'animation-name': 'allo-' + animation.name },
      })),
    };
    expect(visualQa.validateRuntimeAnimationContract(valid).map((animation) => animation.className))
      .toEqual(visualQa.RUNTIME_IDLE_ANIMATIONS.map((animation) => 'animate-allo-' + animation.name));

    const withoutAmbientWave = {
      ...valid,
      animationBindings: valid.animationBindings.filter((binding) => binding.selector !== '.animate-allo-wave'),
    };
    expect(() => visualQa.validateRuntimeAnimationContract(withoutAmbientWave))
      .toThrow(/animate-allo-wave \(ambient\)/);

    const legacySummonSelector = {
      ...valid,
      animationBindings: valid.animationBindings.map((binding) => binding.selector === '.animate-allo-wave-hello'
        ? { ...binding, selector: '.animate-wave-hello' }
        : binding),
    };
    expect(() => visualQa.validateRuntimeAnimationContract(legacySummonSelector))
      .toThrow(/animate-allo-wave-hello \(summon\/intro\)/);
  });

  it('fails when generated runtime producers outgrow the stylesheet contract', () => {
    const moduleSource = readFileSync(join(visualQa.ROOT, 'allobot_module.js'), 'utf8');
    expect(visualQa.validateRuntimeAnimationProducers(moduleSource)).toEqual([
      'backflip', 'look-around', 'shrug', 'wave', 'wave-hello',
    ]);
    expect(() => visualQa.validateRuntimeAnimationProducers(
      moduleSource + '\nsetIdleAnimation("new-dance");',
    )).toThrow(/missing from the visual CSS contract: new-dance/);
  });

  it('supports exact, fail-closed scenario selection for diagnostics', () => {
    const items = visualQa.matrix();
    expect(visualQa.selectScenarios(items, 'light-chrome-top-right--64px').map((item) => item.id))
      .toEqual(['light-chrome-top-right--64px']);
    expect(visualQa.selectScenarios(items)).toBe(items);
    expect(() => visualQa.selectScenarios(items, '')).toThrow(/non-empty/);
    expect(() => visualQa.selectScenarios(items, 'light-chrome')).toThrow(/Unknown/);
  });

  it('rejects empty, root, and unreviewed external capture paths', () => {
    expect(() => visualQa.resolveOutput('')).toThrow(/non-empty/);
    expect(() => visualQa.resolveOutput(visualQa.ROOT, true)).toThrow(/root/);
    const outside = resolve(visualQa.ROOT, '..', 'allobot-visual-external');
    expect(() => visualQa.resolveOutput(outside)).toThrow(/test-results/);
    expect(visualQa.resolveOutput(outside, true)).toBe(outside);
    expect(() => visualQa.resolveOutput(join(visualQa.ROOT, 'dev-tools', 'allobot-output'), true)).toThrow(/repository/);
    expect(() => visualQa.resolveOutput(resolve(visualQa.ROOT, '..', 'generic-output'), true)).toThrow(/AlloBot-specific/);
    const inside = join(visualQa.ROOT, 'test-results', 'custom-allobot');
    expect(visualQa.resolveOutput(inside)).toBe(inside);
  });
});
