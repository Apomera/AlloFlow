import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('allobot_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('allobot_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/allobot_module.js', 'utf8');

describe('AlloBot reduced-motion accessibility', () => {
  it('honors both the operating-system preference and the app motion setting', () => {
    expect(source).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('const motionDisabled = useAlloMotionDisabled(disableAnimations);');
    expect(source).toContain('allobot-motion-disabled');
    expect(source).toContain('pauseAnimations');
  });

  it('provides local reduced-motion fallbacks for utility animations', () => {
    const pulseUtilities = source.match(/(?<![\w-])animate-pulse(?![\w-])/g) || [];
    const pulseFallbacks = source.match(/animate-pulse motion-reduce:animate-none/g) || [];
    expect(pulseUtilities.length).toBeGreaterThan(0);
    expect(pulseFallbacks).toHaveLength(pulseUtilities.length);
    expect(source.match(/(?<![\w-])animate-bounce(?![\w-])/g)).toHaveLength(1);
    expect(source.match(/animate-bounce motion-reduce:animate-none/g)).toHaveLength(1);
  });

  it('provides local reduced-motion fallbacks for broad transitions', () => {
    expect(source.match(/(?<![\w-])transition-all(?![\w-])/g)).toHaveLength(7);
    expect(source.match(/transition-all motion-reduce:transition-none/g)).toHaveLength(7);
    expect(source.match(/(?<![\w-])transition-transform(?![\w-])/g)).toHaveLength(2);
    expect(source.match(/transition-transform motion-reduce:transition-none/g)).toHaveLength(2);
  });

  it('uses explicit non-submit types for every native button', () => {
    const buttons = source.match(/<button\b[\s\S]*?>/g) || [];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toContain('type="button"');
  });

  it('coordinates one prioritized full-body pose across posture, glow, and shadow', () => {
    for (const text of [source, moduleSource]) {
      expect(text).toContain('bodyVisualState');
      expect(text).toContain('bodyPoseByState');
      expect(text).toContain('canBodyBreathe');
      expect(text).toContain('data-allobot-body-state');
      expect(text).toContain('data-allobot-body-pose');
      expect(text).toContain('data-allobot-body-breathe');
      expect(text).toContain('data-allobot-ground-state');
      expect(text).toContain('data-allobot-shell-glow');
    }
    for (const state of ['hiding', 'sleeping', 'dragging', 'flying', 'landing', 'celebrating', 'thinking', 'listening', 'talking', 'ready']) {
      expect(source).toContain(`${state}: { leftHandX:`);
    }
    expect(source).toContain('fillOpacity={bodyPose.glowOpacity}');
    expect(source).toContain('rx={bodyPose.shadowRx}');
    expect(source).toContain('rx={bodyPose.contactRx}');
    expect(source).toContain("className={`relative ${canBodyBreathe ? \"animate-bot-breathe\" : \"\"}");
    expect(source).not.toContain('!motionDisabled && !isFlightActive ? "animate-bot-breathe"');
    expect(source).toContain('(isListening || isTalking) ? "animate-pulse motion-reduce:animate-none"');
  });

  it('deploys a stateful hover undercarriage with paired ground contacts', () => {
    for (const text of [source, moduleSource]) {
      expect(text).toContain('stabilizerVisualState');
      expect(text).toContain('data-allobot-undercarriage');
      expect(text).toContain('data-allobot-stabilizer-pose');
      expect(text).toContain('data-allobot-stabilizer-side');
      expect(text).toContain('data-allobot-stabilizer-layer');
      expect(text).toContain('stabilizer-contact');
      for (const state of ['retracted', 'braced', 'hover']) expect(text).toContain(state);
    }
    const expectedOpacity = {
      hiding: '0',
      sleeping: '1',
      dragging: '0',
      flying: '0',
      landing: '1',
      celebrating: '0.92',
      thinking: '0.82',
      listening: '0.92',
      talking: '0.88',
      ready: '0.84',
    };
    for (const [state, opacity] of Object.entries(expectedOpacity)) {
      const pose = source.match(new RegExp(`${state}: \\{[^\\n]+stabilizerOpacity: ([\\d.]+)`));
      expect(pose?.[1], `missing stabilizer pose for ${state}`).toBe(opacity);
    }
    expect(source.match(/data-allobot-stabilizer-side=/g)).toHaveLength(2);
    expect(source.match(/data-allobot-stabilizer-layer="pad"/g)).toHaveLength(2);
    expect(source).toContain('const stabilizerFootY = 89 + bodyPose.stabilizerDrop;');
    expect(source).toContain("motionDisabled ? 'none' : 'opacity 180ms ease'");
    expect(source).toContain("motionDisabled ? 'none' : 'd 220ms ease'");
  });

  it('shows standby, hover, braking, and thrust through a static-readable jetpack power system', () => {
    for (const text of [source, moduleSource]) {
      expect(text).toContain('jetpackVisualState');
      expect(text).toContain('jetpackPowerByState');
      expect(text).toContain('data-allobot-jetpack-motion');
      expect(text).toContain('data-allobot-reactor-state');
      expect(text).toContain('data-allobot-nozzle-state');
      for (const state of ['standby', 'hover', 'braking', 'thrust']) expect(text).toContain(state);
    }
    for (const layer of ['reactor-halo', 'reactor-signal', 'reactor-core', 'power-conduits-shadow', 'power-conduits', 'pod-signals', 'pod-signal-core', 'nozzle-glow', 'brake-rings']) {
      expect(source).toContain('data-allobot-jetpack-layer="' + layer + '"');
      expect(moduleSource).toContain(layer);
    }
    expect(source.match(/data-allobot-jetpack-layer="pod-signal-core"/g)).toHaveLength(2);
    expect(source.match(/data-allobot-jetpack-layer="nozzle-glow"/g)).toHaveLength(2);
    expect(source).toContain("data-allobot-jetpack-motion={motionDisabled ? 'static' : 'animated'}");
    expect(source).toContain("className={!motionDisabled && jetpackVisualState !== 'standby' ? \"animate-pulse motion-reduce:animate-none\" : undefined}");
    expect(source).toContain("{jetpackVisualState === 'braking' && (");
    expect(source).toContain("{jetpackVisualState === 'thrust' && (");
  });

  it('keeps generated copies synchronized with the accessible source', () => {
    expect(moduleSource).toContain('motion-reduce:animate-none');
    expect(moduleSource).toContain('motion-reduce:transition-none');
    expect(publicModule).toBe(moduleSource);
  });

  it('keeps completion feedback visible without requiring motion', () => {
    expect(source).toContain("className={motionDisabled ? 'allobot-generation-complete-static' : 'animate-allobot-generation-complete'}");
    expect(source).toContain('.allobot-generation-complete-static { opacity: 1 !important; }');
    expect(source).toContain('.allobot-generation-complete-static .animate-allobot-generation-completion-check');
    expect(source).toContain("if (prev === 'thinking' && effectiveMood !== 'thinking' && !isSleeping");
    expect(moduleSource).toContain('allobot-generation-complete-static');
  });
});
