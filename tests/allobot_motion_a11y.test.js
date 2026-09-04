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

  // 2026-09-04. The arms floated on a 3.5s loop while the body breathed and
  // floated on 3s. A half-second of drift per cycle meant they only realigned
  // every 21 seconds, so the arms rose while the body settled and the shoulders
  // looked unhinged, but only some of the time, which made it hard to name.
  // Anything attached to the body has to share the body's period.
  it('keeps every body-attached animation on one period so the limbs cannot drift', () => {
    const durationOf = (name) => {
      const match = source.match(new RegExp(String.raw`\.animate-${name}\s*\{\s*animation:\s*[\w-]+\s+([\d.]+)s`));
      return match ? Number(match[1]) : null;
    };
    const body = durationOf('bot-breathe');
    expect(body).toBeGreaterThan(0);
    for (const attached of ['allo-float', 'shadow-pulse', 'float-hands']) {
      expect(durationOf(attached), attached + ' must share the body period').toBe(body);
    }
    // A small fixed delay is follow-through, not drift: the arms trail the body.
    expect(source).toMatch(/\.animate-float-hands \{[^}]*animation-delay:\s*-?0?\.\d+s/);
    // The antenna is deliberately its own thing; it is not attached like a limb.
    expect(durationOf('antenna-sway')).not.toBe(body);
  });

  it('provides local reduced-motion fallbacks for broad transitions', () => {
    // The rule is that every broad transition carries a reduced-motion
    // fallback, not that there are exactly N of them; pinning the count made
    // adding one guarded transition look like a failure.
    const broad = source.match(/(?<![\w-])transition-all(?![\w-])/g) || [];
    const guarded = source.match(/transition-all motion-reduce:transition-none/g) || [];
    expect(broad.length).toBeGreaterThanOrEqual(7);
    expect(guarded).toHaveLength(broad.length);
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
    // Count the artwork, not the compact-mode CSS selector that names the
    // same layer, hence the lookbehind for the opening bracket.
    expect(source.match(/(?<!\[)data-allobot-jetpack-layer="pod-signal-core"/g)).toHaveLength(2);
    expect(source.match(/(?<!\[)data-allobot-jetpack-layer="nozzle-glow"/g)).toHaveLength(2);
    expect(source).toContain("data-allobot-jetpack-motion={motionDisabled ? 'static' : 'animated'}");
    // 2026-09-04: 'hover' is the state AlloBot is in whenever it is simply
    // present, so pulsing on anything-but-standby meant the reactor blinked
    // permanently in the corner of the screen. It is lit at rest and animates
    // only while actually thrusting or braking.
    expect(source).toContain("jetpackVisualState === 'thrust' || jetpackVisualState === 'braking'");
    expect(source).not.toContain("jetpackVisualState !== 'standby' ? \"animate-pulse");
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
