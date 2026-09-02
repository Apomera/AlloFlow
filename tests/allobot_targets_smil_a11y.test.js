import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('allobot_source.jsx', 'utf8');

describe('AlloBot target, speech, and SMIL accessibility', () => {
  it('keeps external-only keyframes in their owning modules', () => {
    const owners = [
      ['view_student_save_adventure_source.jsx', 'student-save-history-pulse'],
      ['word_sounds_module.js', 'word-sounds-wave'],
      ['view_spotlight_tour_source.jsx', 'spotlight-tour-glow-ring'],
      ['view_adventure_source.jsx', 'adventure-ken-burns'],
    ];
    for (const [path, animationName] of owners) {
      const ownerSource = readFileSync(path, 'utf8');
      expect(ownerSource, `${path} should define ${animationName}`).toContain(`@keyframes ${animationName}`);
      expect(ownerSource.match(new RegExp(animationName, 'g'))?.length || 0).toBeGreaterThan(1);
    }
    for (const externalName of ['history-pulse', 'soundwave', 'spotlightGlowRing', 'ken-burns']) {
      expect(source).not.toContain(`@keyframes ${externalName}`);
    }
  });

  it('ships the persistent Help breathing keyframe in the active built stylesheet', () => {
    const builtHtml = readFileSync('desktop/web-app/public/app/index.html', 'utf8');
    const cssHref = builtHtml.match(/<link href="\.\/(static\/css\/[^"?]+\.css)" rel="stylesheet"/i)?.[1];
    expect(cssHref).toBeTruthy();
    const builtCss = readFileSync(`desktop/web-app/public/app/${cssHref}`, 'utf8');
    expect(builtCss).toContain('@keyframes help-breathe');
    expect(builtCss).toMatch(/animation:help-breathe 3s ease-in-out infinite/);
  });

  it('maps every public and ambient animation to an authored class and keyframe', () => {
    const supported = ['wave-hello', 'sympathetic-tilt', 'wave', 'backflip', 'shrug', 'look-around'];
    const mapStart = source.indexOf('const ALLOBOT_ANIMATION_CLASS_BY_NAME');
    const mapEnd = source.indexOf('});', mapStart);
    expect(mapStart).toBeGreaterThan(-1);
    expect(mapEnd).toBeGreaterThan(mapStart);
    const mapBlock = source.slice(mapStart, mapEnd + 3);
    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const name of supported) {
      const className = `animate-allo-${name}`;
      expect(mapBlock).toMatch(new RegExp(`["']?${escapeRegex(name)}["']?\\s*:\\s*["']${escapeRegex(className)}["']`));
      const classRule = source.match(new RegExp(`\\.${escapeRegex(className)}\\s*\\{([^}]*)\\}`));
      expect(classRule, `${className} should have module-owned animation CSS`).toBeTruthy();
      const keyframeName = classRule?.[1].match(/animation:\s*([a-zA-Z0-9_-]+)/)?.[1];
      expect(keyframeName, `${className} should name its keyframe`).toBeTruthy();
      expect(source).toContain(`@keyframes ${keyframeName}`);
    }

    expect(source).toContain("const anims = ['wave', 'backflip', 'shrug', 'look-around'];");
  });

  it('keeps every scaled orbit control at least 24 CSS pixels', () => {
    // The four orbit controls used to repeat their sizing inline; they now share
    // one `satelliteBase` string with a mouse and a touch branch. Both branches
    // still have to clear 24px AFTER scaling, so assert each one — a size class
    // counted on its own says nothing once a scale- class can sit beside it.
    const [, mouse] = source.match(/\n\s*:\s*('inline-flex min-h-8[^']*')/) || [];
    const [, touch] = source.match(/\n\s*\?\s*('inline-flex min-h-9[^']*')/) || [];
    expect(mouse, 'mouse-pointer satellite class').toBeTruthy();
    expect(touch, 'coarse-pointer satellite class').toBeTruthy();
    // 32px * scale-75 == 24px exactly.
    expect(mouse).toContain('min-h-8 min-w-8');
    expect(mouse).toContain('scale-75');
    // 36px unscaled — a scale- class here would drop it back under the floor.
    expect(touch).toContain('min-h-9 min-w-9');
    expect(touch).not.toMatch(/\bscale-(?!100\b)\d+/);
    // Touch has no hover to reveal them with, so they must not start invisible.
    expect(touch).not.toContain('opacity-0');
    // All four controls must draw from that shared definition.
    expect(source.match(/\$\{satelliteBase\}/g)).toHaveLength(4);
    expect(source).toContain('inline-flex min-h-6 items-center');
    expect(source).toContain('motion-reduce:transition-none');
  });

  it('owns essential orbit-control styling when host Tailwind is unavailable', () => {
    expect(source).toContain('allobot-satellite-control');
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      expect(source).toContain(`allobot-satellite--${corner}`);
    }
    expect(source).toContain('width: 32px;');
    expect(source).toContain('min-height: 32px;');
    expect(source).toContain('[data-allobot-control-visibility="persistent"] .allobot-satellite-control {');
    expect(source).toContain('width: 36px;');
    expect(source).toContain('min-height: 36px;');
    expect(source).toContain('data-allobot-satellite-kind="hide"');
    expect(source).toContain("data-allobot-satellite-state={isListening ? 'listening' : 'idle'}");
  });

  it('owns the native avatar-button reset and full-surface geometry', () => {
    const avatarActionCss = source.slice(
      source.indexOf('.allobot-avatar-action {'),
      source.indexOf('.allobot-control-orbit {'),
    );
    for (const declaration of [
      'position: absolute;', 'inset: 0;', 'width: 100%;', 'height: 100%;',
      'margin: 0;', 'padding: 0;', 'border: 0;', 'appearance: none;',
      '-webkit-appearance: none;', 'background: transparent;',
    ]) {
      expect(avatarActionCss).toContain(declaration);
    }
    expect(source.match(/className="allobot-avatar-action /g)).toHaveLength(2);
    expect(source).toContain('[data-allobot-avatar-action="open"] { z-index: 10; }');
    expect(source).toContain('[data-allobot-avatar-action="wake"] { z-index: 50; }');
  });

  it('groups satellite controls in a theme-aware visual orbit', () => {
    expect(source).toContain('data-allobot-control-surface="true"');
    expect(source).toContain('data-allobot-control-theme={theme}');
    expect(source).toContain("data-allobot-control-visibility={coarsePointer ? 'persistent' : 'reveal'}");
    expect(source).toContain("data-allobot-control-live={isListening ? 'true' : 'false'}");
    expect(source).toContain('className="allobot-control-orbit"');
    expect(source).toContain("data-allobot-control-orbit-state={isListening ? 'listening' : 'idle'}");
    expect(source).toContain('[data-allobot-control-surface="true"][data-allobot-control-theme="dark"]');
    expect(source).toContain('[data-allobot-control-surface="true"][data-allobot-control-theme="contrast"]');
    expect(source).toContain('[data-allobot-control-live="true"] .allobot-control-orbit');
    expect(source).toContain('--allobot-satellite-listening-border');
  });

  it('connects the antenna to the shell and keeps its lamp states layered', () => {
    expect(source).toContain('antennaVisualState');
    expect(source).toContain('antennaCoreFill');
    expect(source).toContain('data-allobot-antenna-mount');
    expect(source).toContain('data-allobot-antenna-lamp');
    expect(source).toContain('data-allobot-antenna-state');
    for (const layer of ['socket', 'socket-highlight', 'stalk', 'signal-waves', 'lamp-housing', 'lamp-core', 'lamp-catchlight', 'sleep-dash']) {
      expect(source).toContain(`data-allobot-antenna-layer="${layer}"`);
    }
    expect(source).toContain("theme === 'contrast' ? '#FFFFFF' : '#64748B'");
    expect(source).toContain("style={{ transformOrigin: '50px 5px' }}");
  });

  it('lets a touch reach the orbit controls instead of starting a drag', () => {
    // The container owns the drag gesture and calls preventDefault() on
    // touchstart, which cancels the synthesised click outright. Stopping
    // pointerdown/mousedown does nothing for a different event type, so every
    // satellite needs its own touchstart guard or taps are swallowed.
    expect(source.match(/onTouchStart=\{stopTouch\}/g)).toHaveLength(4);
    expect(source).toContain('const stopTouch = (e) => e.stopPropagation();');
  });

  it('stops every SVG SMIL animation when motion is disabled', () => {
    const smilElements = source.match(/<(?:animate|animateMotion|animateTransform)\b[\s\S]*?\/>/g) || [];
    expect(smilElements).toHaveLength(18);
    for (const element of smilElements) {
      expect(element).toMatch(/dur=\{motionDisabled \? 'indefinite' : '[0-9.]+s'\}/);
    }
    expect(source.match(/\bdur="[0-9.]+s"/g) || []).toEqual([]);
  });

  it('owns speech and thought bubble styling without host Tailwind', () => {
    expect(source).toContain('ALLOBOT_BUBBLE_CSS');
    expect(source).toContain('allobot-speech-bubble');
    expect(source).toContain('data-allobot-bubble-theme={theme}');
    expect(source).toContain('data-allobot-bubble-placement={placement}');
    expect(source).toContain("data-allobot-bubble-motion={disableAnimations ? 'static' : 'animated'}");
    expect(source).toContain('allobot-speech-arrow');
    expect(source).toContain('data-allobot-thought-dot="large"');
    expect(source).toContain('data-allobot-thought-dot="small"');
    expect(source).toContain('allobot-bubble-live');
    expect(source).toContain('allobot-bubble-read-more');
    expect(source).toContain('max-width: min(200px, calc(100vw - 24px));');
    expect(source).toContain('theme={theme}');
    expect(source).toContain('.allobot-speech-bubble[data-allobot-bubble-theme="dark"]');
    expect(source).toContain('.allobot-speech-bubble[data-allobot-bubble-theme="contrast"]');
  });

  it('stages bubbles away from responsive side accessories and rechecks live geometry', () => {
    for (const text of [source]) {
      expect(text).toContain('avoidSide');
      expect(text).toContain('preferredAttachment');
      expect(text).toContain('alternateAttachment');
      expect(text).toContain('availableByAttachment');
      expect(text).toContain('data-allobot-bubble-avoid-side');
      expect(text).toContain('data-allobot-bubble-attachment');
      expect(text).toContain('ResizeObserver');
      expect(text).toContain("addEventListener('resize', resolvePlacement)");
      expect(text).toContain("removeEventListener('resize', resolvePlacement)");
    }
    expect(source).toContain("avoidSide === 'left'");
    expect(source).toContain("avoidSide === 'right'");
    expect(source).toContain('const anchorRect = bubble.parentElement?.getBoundingClientRect() || authoredRect;');
    expect(source).toContain('avoidSide={accessoryRenderSide}');
    expect(source).toContain("placement.endsWith('-left') ? 'left' : 'right'");
  });

  it('owns movement and celebration effect styling without host utilities', () => {
    const effectComponents = source.slice(source.indexOf('const LandingDust'), source.indexOf('const MIC_METER_BARS'));
    expect(source).toContain('const ALLOBOT_EFFECTS_CSS');
    expect(source).toContain('data-allobot-effect-styles="true"');
    expect(source).toContain('@keyframes allobot-effect-jetpack-smoke');
    expect(source).toContain('@keyframes allobot-effect-float-reaction');
    expect(source).toContain('@keyframes allobot-effect-confetti');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('animation-duration: 1ms !important;');
    expect(effectComponents).toContain('data-allobot-effect="landing-dust"');
    expect(effectComponents).toContain('data-allobot-effect="jetpack-particles"');
    expect(effectComponents).toContain('data-allobot-effect="reaction-bubble"');
    expect(effectComponents).toContain('data-allobot-effect="confetti-burst"');
    expect(effectComponents).toContain('data-allobot-dust-cloud="puff"');
    expect(effectComponents).toContain("shape: ['round', 'square', 'dash'][i % 3]");
    expect(effectComponents).toContain("'--spin': `${p.spin}deg`");
    expect(effectComponents).not.toContain('animate-dust-left');
    expect(effectComponents).not.toContain('animate-jetpack-smoke');
    expect(effectComponents).not.toContain('animate-float-reaction');
    expect(effectComponents).not.toContain('animate-bot-confetti');
  });

  it('announces complete speech without exposing typewriter fragments twice', () => {
    expect(source).toContain('announce = true');
    expect(source).toContain('<span role="status" aria-live="polite" aria-atomic="true" className="sr-only allobot-bubble-live">{isVisible && announce ? text : \'\'}</span>');
    expect(source).toContain('<span aria-hidden="true" className="allobot-bubble-text">{renderedText}</span>');
    expect(source).toContain('isVisible && isTruncated && renderedText.length === text?.length');
    expect(source).toContain('announce={!!customMessage}');
  });

  it('describes the avatar as a movable group and isolates child control keys', () => {
    expect(source).toContain('role="group"');
    expect(source).toContain("aria-keyshortcuts={isSleeping ? undefined : 'ArrowLeft ArrowRight ArrowUp ArrowDown'}");
    expect(source).toContain('aria-describedby={isSleeping ? undefined : moveInstructionsId}');
    expect(source).toContain('if (e.target !== e.currentTarget) return;');
    expect(source).toContain('data-allobot-avatar-action="open"');
    expect(source).toContain('data-allobot-avatar-action="wake"');
  });
});
