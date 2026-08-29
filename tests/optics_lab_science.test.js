// opticsLab: (1) regression guard that the tool renders its REAL body, not the
// "Initializing…" placeholder — it had a throwlab-class Rules-of-Hooks bug
// (Loading-gate early-return before useRef/useEffect) that crashed on the
// Loading→ready transition (bucket not persisted → empty every reload); the gate
// now seeds defaults without early-returning. (2) physics correctness for the
// thin-lens/mirror engine, exercised through the lens + mirror sims. (3) the new
// slider aria-valuetext that speaks the image result. Values verified by hand in
// docs/optics_lab_review.md.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function render(state) {
  return renderTool('opticsLab', { opticsLab: state });
}

function readFresnelSplit(html) {
  const tag = html.match(/<div[^>]*data-op-fresnel-split="refraction"[^>]*>/)?.[0];
  expect(tag, 'Fresnel interface meter').toBeTruthy();
  const read = (name) => Number(tag.match(new RegExp(`data-${name}="([^"]+)"`))?.[1]);
  return { reflectance: read('reflectance'), transmittance: read('transmittance') };
}

function readLensScreen(html) {
  const tag = html.match(/<div[^>]*data-op-lens-screen-test="[^"]+"[^>]*>/)?.[0];
  expect(tag, 'lens screen status').toBeTruthy();
  const attr = (name) => tag.match(new RegExp(`${name}="([^"]+)"`))?.[1];
  return {
    state: attr('data-op-lens-screen-test'),
    distance: Number(attr('data-screen-distance')),
    imageDistance: attr('data-image-distance'),
    bundleRatio: Number(attr('data-screen-bundle-ratio')),
    capturable: attr('data-screen-capturable') === 'true'
  };
}

function readMirrorScreen(html) {
  const tag = html.match(/<div[^>]*data-op-mirror-screen-test="[^"]+"[^>]*>/)?.[0];
  expect(tag, 'mirror sampling screen status').toBeTruthy();
  const attr = (name) => tag.match(new RegExp(`${name}="([^"]+)"`))?.[1];
  return {
    state: attr('data-op-mirror-screen-test'),
    distance: Number(attr('data-screen-distance')),
    imageDistance: attr('data-image-distance'),
    bundleRatio: Number(attr('data-screen-bundle-ratio')),
    capturable: attr('data-screen-capturable') === 'true'
  };
}

function readFocusGuide(html, kind) {
  const tag = html.match(new RegExp(`<div[^>]*data-op-focus-guide="${kind}"[^>]*>`))?.[0];
  expect(tag, `${kind} focus alignment guide`).toBeTruthy();
  const attr = (name) => tag.match(new RegExp(`${name}="([^"]+)"`))?.[1];
  const numberOrNull = (name) => attr(name) === 'none' ? null : Number(attr(name));
  return {
    state: attr('data-focus-state'),
    capturable: attr('data-focus-capturable') === 'true',
    offset: numberOrNull('data-focus-offset-cm'),
    relative: numberOrNull('data-focus-relative'),
    bundleRatio: Number(attr('data-blur-aperture-ratio'))
  };
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_optics.js', 'opticsLab'); });

describe('opticsLab — renders real body (Rules-of-Hooks fix)', () => {
  it('default state renders the lab, not the Initializing placeholder', () => {
    const html = render({});  // empty bucket → seeds defaults, must NOT early-return Loading
    expect(html).not.toContain('Initializing Optics');
    expect(html.length).toBeGreaterThan(2000);
  });
});

describe('opticsLab — thin-lens engine (rendered)', () => {
  it('converging lens, object beyond 2f → real, inverted, reduced (d_i 15, m -0.50)', () => {
    const html = render({ mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 30, lensObjH: 5 });
    expect(html).toContain('Image distance 15.0 cm');
    expect(html).toContain('magnification -0.50');
    expect(html).toContain('real');
  });
  it('converging lens, object inside f → virtual, upright, magnified (d_i -10, m 2.00)', () => {
    const html = render({ mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 5, lensObjH: 5 });
    expect(html).toContain('Image distance -10.0 cm');
    expect(html).toContain('magnification 2.00');
    expect(html).toContain('virtual');
  });
  it('diverging lens → always virtual, upright, reduced (d_i -6.7, m 0.33)', () => {
    const html = render({ mode: 'lenses', lensType: 'diverging', lensFocal: 10, lensDo: 20, lensObjH: 5 });
    expect(html).toContain('Image distance -6.7 cm');
    expect(html).toContain('magnification 0.33');
  });

  it('constructs a converging-lens virtual image with two explicit backward extensions', () => {
    const html = render({ mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 5, lensObjH: 5 });
    expect((html.match(/data-op-lens-virtual-extension=/g) || [])).toHaveLength(2);
    expect(html).toContain('data-op-lens-virtual-extension="parallel-ray"');
    expect(html).toContain('data-op-lens-virtual-extension="center-ray"');
    expect(html).toContain('data-op-extension-visible-segment="beyond-object"');
    expect(html).toContain('data-op-lens-image="virtual"');
    expect(html).toContain('data-op-lens-path-summary="virtual"');
    expect(html).toContain('no physical light travels along those dashed lines');
  });

  it('adds the far-focus principal ray needed to locate a diverging-lens image', () => {
    const html = render({ mode: 'lenses', lensType: 'diverging', lensFocal: 10, lensDo: 20, lensObjH: 5 });
    expect((html.match(/data-op-lens-virtual-extension=/g) || [])).toHaveLength(2);
    expect(html).toContain('data-op-lens-principal-ray="far-focus"');
    expect(html).toContain('data-op-lens-virtual-extension="far-focus-ray"');
    expect(html).toContain('data-op-lens-image="virtual"');
  });

  it('uses an in-diagram edge label when a near-focal real image is off scale', () => {
    const html = render({ mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 10.5, lensObjH: 5 });
    expect(html).toContain('data-op-lens-image-offscale="real"');
    expect(html).toContain('real image off-scale · dᵢ = +210.0 cm →');
    expect(html).toContain('The image is outside the current diagram; the edge label points toward it.');
    expect(html).not.toContain('data-op-lens-image="real"');
  });

  it('focuses a movable physical screen only at the real image plane', () => {
    const sharpHtml = render({
      mode: 'lenses', lensType: 'converging', lensFocal: 10,
      lensDo: 30, lensObjH: 5, lensScreenCm: 15
    });
    const sharp = readLensScreen(sharpHtml);
    expect(sharp.state).toBe('sharp');
    expect(sharp.distance).toBe(15);
    expect(Number(sharp.imageDistance)).toBeCloseTo(15, 6);
    expect(sharp.bundleRatio).toBe(0);
    expect(sharp.capturable).toBe(true);
    expect(sharpHtml).toContain('data-op-lens-screen-handle="true"');
    expect(sharpHtml).toContain('data-op-lens-screen-spot="true"');
    expect(sharpHtml).toContain('Sharp focus: the screen and real image plane coincide');
    const sharpGuide = readFocusGuide(sharpHtml, 'lens');
    expect(sharpGuide.state).toBe('sharp');
    expect(sharpGuide.offset).toBe(0);
    expect(sharpGuide.relative).toBe(0);
    expect(sharpGuide.bundleRatio).toBe(0);
    expect(sharpHtml).toContain('Aligned at focus | blur 0.0% aperture');

    const blurredHtml = render({
      mode: 'lenses', lensType: 'converging', lensFocal: 10,
      lensDo: 30, lensObjH: 5, lensScreenCm: 25
    });
    const blurred = readLensScreen(blurredHtml);
    expect(blurred.state).toBe('blurred');
    expect(blurred.bundleRatio).toBeCloseTo(2 / 3, 6);
    expect(blurredHtml).toContain('10.0 cm beyond the real image plane');
    expect(blurredHtml).toContain('66.7% of the aperture width');
    const blurredGuide = readFocusGuide(blurredHtml, 'lens');
    expect(blurredGuide.state).toBe('blurred');
    expect(blurredGuide.offset).toBe(10);
    expect(blurredGuide.relative).toBeCloseTo(2 / 3, 6);
    expect(blurredGuide.bundleRatio).toBeCloseTo(2 / 3, 6);
    expect(blurredHtml).toContain('data-op-focus-track="true"');
    expect(blurredHtml).toContain('data-op-focus-marker="true"');
    expect(blurredHtml).toContain('Offset +10.0 cm | blur 66.7% aperture');
  });

  it('links lens height and screen focus to the relationship that is currently being manipulated', () => {
    const screenHtml = render({
      mode: 'lenses', lensType: 'converging', lensFocal: 10,
      lensDo: 30, lensObjH: 5, lensScreenCm: 25,
      opActiveVariable: 'lensScreenCm'
    });
    expect(screenHtml).toContain('data-op-formula-context="lens-screen"');
    expect(screenHtml).toContain('blur / aperture = |1 - ');
    expect(screenHtml).toContain('physical screen coincide');

    const heightHtml = render({
      mode: 'lenses', lensType: 'converging', lensFocal: 10,
      lensDo: 30, lensObjH: 8, lensScreenCm: 25,
      opActiveVariable: 'lensObjH', opMissionStage: { lenses: 0 }
    });
    expect(heightHtml).toContain('data-op-lens-object-height-control="true"');
    expect(heightHtml).toContain('aria-label="Lens object height"');
    expect(heightHtml).toContain('data-op-lens-height-handle="true"');
    expect(heightHtml).toContain('data-op-lens-height-grip="true"');
    expect(heightHtml).toContain('Image tip 4.0 cm below the optical axis');
    expect(heightHtml).toContain('data-op-formula-context="lens-height"');
    expect(heightHtml).toContain('h_i = m ');
    expect(heightHtml).toContain('does not change image distance or magnification');
    expect(heightHtml).toContain('Mission 1/3: Capture a sharp lens image.');
    expect(heightHtml).toContain('class="opticslab-mission" data-complete="false"');

    const sharpMissionHtml = render({
      mode: 'lenses', lensType: 'converging', lensFocal: 10,
      lensDo: 30, lensObjH: 8, lensScreenCm: 15,
      opMissionStage: { lenses: 0 }
    });
    expect(sharpMissionHtml).toContain('Mission 1/3: Capture a sharp lens image.');
    expect(sharpMissionHtml).toContain('class="opticslab-mission" data-complete="true"');
    expect(sharpMissionHtml).toContain('Complete - the live model meets the target.');
  });

  it('makes virtual and infinite images explicitly non-capturable', () => {
    const virtualHtml = render({
      mode: 'lenses', lensType: 'converging', lensFocal: 10,
      lensDo: 5, lensObjH: 5, lensScreenCm: 20
    });
    const virtualScreen = readLensScreen(virtualHtml);
    expect(virtualScreen.state).toBe('virtual');
    expect(virtualScreen.capturable).toBe(false);
    expect(virtualScreen.bundleRatio).toBe(3);
    expect(virtualHtml).toContain('No screen focus: this is a virtual image');
    expect(virtualHtml).not.toContain('data-op-place-screen-at-image="true"');
    const virtualGuide = readFocusGuide(virtualHtml, 'lens');
    expect(virtualGuide.state).toBe('virtual');
    expect(virtualGuide.capturable).toBe(false);
    expect(virtualGuide.offset).toBeNull();
    expect(virtualHtml).toContain('data-op-focus-no-target="true"');
    expect(virtualHtml).toContain('The image is virtual, so no real screen position can capture it.');

    const infinityHtml = render({
      mode: 'lenses', lensType: 'converging', lensFocal: 10,
      lensDo: 10, lensObjH: 5, lensScreenCm: 20
    });
    const infinityScreen = readLensScreen(infinityHtml);
    expect(infinityScreen.state).toBe('infinity');
    expect(infinityScreen.capturable).toBe(false);
    expect(infinityScreen.bundleRatio).toBe(1);
    expect(infinityHtml).toContain('No finite screen focus: the outgoing bundle is parallel');
    const infinityGuide = readFocusGuide(infinityHtml, 'lens');
    expect(infinityGuide.state).toBe('infinity');
    expect(infinityHtml).toContain('Outgoing rays are parallel, so the image is at infinity');
  });
});

describe('opticsLab — mirror engine (rendered)', () => {
  it('concave mirror, object beyond C → real, inverted (d_i 15, m -0.50)', () => {
    const html = render({ mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10, reflDo: 30, reflObjH: 5 });
    expect(html).toContain('magnification -0.50');
    expect(html).toContain('real');
  });
  it('convex mirror → always virtual, upright, reduced (m 0.33)', () => {
    const html = render({ mode: 'reflection', reflMirrorType: 'convex', reflFocal: 10, reflDo: 20, reflObjH: 5 });
    expect(html).toContain('magnification 0.33');
    expect(html).toContain('virtual');
  });

  it('uses a movable sampling screen to distinguish sharp, blurred, virtual, infinite, and off-bench images', () => {
    const blurredHtml = render({
      mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10,
      reflDo: 30, reflObjH: 5, reflScreenCm: 25
    });
    const blurred = readMirrorScreen(blurredHtml);
    expect(blurred.state).toBe('blurred');
    expect(blurred.distance).toBe(25);
    expect(Number(blurred.imageDistance)).toBeCloseTo(15, 6);
    expect(blurred.bundleRatio).toBeCloseTo(2 / 3, 6);
    expect(blurred.capturable).toBe(true);
    expect(blurredHtml).toContain('data-op-mirror-screen-controls="true"');
    expect(blurredHtml).toContain('data-op-mirror-screen-handle="true"');
    expect(blurredHtml).toContain('data-op-mirror-screen-spot="true"');
    expect(blurredHtml).toContain('data-op-place-mirror-screen-at-image="true"');
    expect(blurredHtml).toContain('10.0 cm beyond the real image plane');
    expect(blurredHtml).toContain('66.7% of the mirror aperture width');
    const blurredGuide = readFocusGuide(blurredHtml, 'mirror');
    expect(blurredGuide.state).toBe('blurred');
    expect(blurredGuide.offset).toBe(10);
    expect(blurredGuide.relative).toBeCloseTo(2 / 3, 6);
    expect(blurredGuide.bundleRatio).toBeCloseTo(2 / 3, 6);
    expect(blurredHtml).toContain('Offset +10.0 cm | blur 66.7% aperture');

    const sharpHtml = render({
      mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10,
      reflDo: 30, reflObjH: 5, reflScreenCm: 15
    });
    const sharp = readMirrorScreen(sharpHtml);
    expect(sharp.state).toBe('sharp');
    expect(sharp.bundleRatio).toBe(0);
    expect(sharpHtml).toContain('Sharp focus: the sampling screen and real image plane coincide');
    const sharpGuide = readFocusGuide(sharpHtml, 'mirror');
    expect(sharpGuide.state).toBe('sharp');
    expect(sharpGuide.offset).toBe(0);
    expect(sharpHtml).toContain('Aligned at focus | blur 0.0% aperture');

    const virtualHtml = render({
      mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10,
      reflDo: 5, reflObjH: 5, reflScreenCm: 20
    });
    const virtualScreen = readMirrorScreen(virtualHtml);
    expect(virtualScreen.state).toBe('virtual');
    expect(virtualScreen.bundleRatio).toBe(3);
    expect(virtualScreen.capturable).toBe(false);
    expect(virtualHtml).toContain('No screen focus: this is a virtual image behind the mirror');
    expect(virtualHtml).not.toContain('data-op-place-mirror-screen-at-image="true"');
    const virtualGuide = readFocusGuide(virtualHtml, 'mirror');
    expect(virtualGuide.state).toBe('virtual');
    expect(virtualGuide.capturable).toBe(false);
    expect(virtualHtml).toContain('data-op-focus-no-target="true"');

    const infinityHtml = render({
      mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10,
      reflDo: 10, reflObjH: 5, reflScreenCm: 20
    });
    const infinityScreen = readMirrorScreen(infinityHtml);
    expect(infinityScreen.state).toBe('infinity');
    expect(infinityScreen.bundleRatio).toBe(1);
    expect(infinityScreen.capturable).toBe(false);
    expect(infinityHtml).toContain('No finite screen focus: the reflected bundle is parallel');
    const infinityGuide = readFocusGuide(infinityHtml, 'mirror');
    expect(infinityGuide.state).toBe('infinity');

    const offBenchHtml = render({
      mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10,
      reflDo: 10.5, reflObjH: 5, reflScreenCm: 42
    });
    const offBench = readMirrorScreen(offBenchHtml);
    expect(offBench.state).toBe('out-of-range');
    expect(offBench.capturable).toBe(true);
    expect(offBenchHtml).toContain('outside the 2-42 cm screen range');
    expect(offBenchHtml).not.toContain('data-op-place-mirror-screen-at-image="true"');
    const offBenchGuide = readFocusGuide(offBenchHtml, 'mirror');
    expect(offBenchGuide.state).toBe('out-of-range');
    expect(offBenchHtml).toContain('The real focus lies outside the movable screen range.');
  });

  it('makes mirror height directly controllable and turns sharp screen capture into an active learning target', () => {
    const heightHtml = render({
      mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10,
      reflDo: 30, reflObjH: 8, reflScreenCm: 25,
      opActiveVariable: 'reflObjH', opMissionStage: { reflection: 0 }
    });
    expect(heightHtml).toContain('data-op-mirror-object-height-control="true"');
    expect(heightHtml).toContain('aria-label="Mirror object height"');
    expect(heightHtml).toContain('data-op-mirror-height-handle="true"');
    expect(heightHtml).toContain('data-op-mirror-height-grip="true"');
    expect(heightHtml).toContain('Image tip 4.0 cm below the optical axis');
    expect(heightHtml).toContain('data-op-formula-context="mirror-height"');
    expect(heightHtml).toContain('h_i = m ');
    expect(heightHtml).toContain('does not change image distance or magnification');
    expect(heightHtml).toContain('Mission 1/3: Capture a sharp mirror image.');
    expect(heightHtml).toContain('class="opticslab-mission" data-complete="false"');

    const screenFormulaHtml = render({
      mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10,
      reflDo: 30, reflObjH: 8, reflScreenCm: 25,
      opActiveVariable: 'reflScreenCm'
    });
    expect(screenFormulaHtml).toContain('data-op-formula-context="mirror-screen"');
    expect(screenFormulaHtml).toContain('blur / aperture = |1 - ');
    expect(screenFormulaHtml).toContain('reaches zero only when a real image plane and the sampling screen coincide');

    const sharpMissionHtml = render({
      mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10,
      reflDo: 30, reflObjH: 8, reflScreenCm: 15,
      opMissionStage: { reflection: 0 }
    });
    expect(sharpMissionHtml).toContain('Mission 1/3: Capture a sharp mirror image.');
    expect(sharpMissionHtml).toContain('class="opticslab-mission" data-complete="true"');
    expect(sharpMissionHtml).toContain('Complete - the live model meets the target.');
  });

  it('plane mirror keeps physical rays in front and locates the symmetric virtual image with equal-angle arcs', () => {
    const html = render({ mode: 'reflection', reflMirrorType: 'plane', reflDo: 25, reflObjH: 6 });
    expect((html.match(/data-op-mirror-ray="reflected"/g) || [])).toHaveLength(2);
    expect((html.match(/data-op-mirror-ray="virtual-extension"/g) || [])).toHaveLength(2);
    expect(html).toContain('data-op-mirror-ray-side="incident-medium"');
    expect(html).toContain('data-op-mirror-ray-side="behind-mirror"');
    expect(html).toContain('data-op-mirror-angle="incident"');
    expect(html).toContain('data-op-mirror-angle="reflected"');
    expect(html).toContain('data-op-mirror-image="virtual"');
    expect(html).toContain('Law of reflection: incident angle equals reflected angle, both 13.5 degrees.');
    expect(html).toContain('Image (virtual)');
    expect(html).not.toContain('Diagram scale');
  });

  it('virtual curved mirrors separate reflected light from behind-mirror construction lines', () => {
    const concave = render({ mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10, reflDo: 5, reflObjH: 5 });
    expect(concave).toContain('Physical reflected rays stay in front of the mirror; dashed backward extensions meet 10.0 cm behind it');
    expect(concave).toContain('data-op-mirror-ray="reflected"');
    expect(concave).toContain('data-op-mirror-ray="virtual-extension"');

    const convex = render({ mode: 'reflection', reflMirrorType: 'convex', reflFocal: 10, reflDo: 20, reflObjH: 5 });
    expect((convex.match(/data-op-mirror-ray="reflected"/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((convex.match(/data-op-mirror-ray="virtual-extension"/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('offers the spatial mirror bench without mounting WebGL by default', () => {
    const html = render({ mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10, reflDo: 30 });
    expect(html).toContain('data-op-mirror-show-3d="true"');
    expect(html).toContain('Show the interactive three-dimensional mirror ray-space bench');
    expect(html).not.toContain('data-op-mirror-3d-host="true"');
  });

  it('explains real, virtual, and focal-boundary outcomes when the 3D mirror bench is enabled', () => {
    const real = render({
      mode: 'reflection', reflShow3D: true,
      reflMirrorType: 'concave', reflFocal: 10, reflDo: 30, reflObjH: 5
    });
    expect(real).toContain('data-op-mirror-3d-host="true"');
    expect(real).toContain('aria-label="Mirror 3D controls"');
    expect(real).toContain('aria-roledescription="interactive 3D model"');
    expect(real).toContain('aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - 0"');
    expect(real).toContain('Press zero to reset the camera.');
    expect(real).toContain('converge 15.0 centimeters in front of the mirror');
    expect(real).toContain('cross at a real inverted image, and continue');
    expect(real).toContain('bright circular thin-mirror aperture');

    const virtual = render({
      mode: 'reflection', reflShow3D: true,
      reflMirrorType: 'convex', reflFocal: 10, reflDo: 20, reflObjH: 5
    });
    expect(virtual).toContain('dashed pink backward extensions meet 6.7 centimeters behind the mirror');
    expect(virtual).toContain('Dashed pink lines are backward extensions behind the mirror, not physical rays.');

    const atFocal = render({
      mode: 'reflection', reflShow3D: true,
      reflMirrorType: 'concave', reflFocal: 10, reflDo: 10, reflObjH: 5
    });
    expect(atFocal).toContain('cyan physical reflected rays leave parallel and the image is at infinity');
  });
});

describe('opticsLab — home-screen contrast (light-mode readability)', () => {
  it('card titles are theme-aware, not hardcoded cream (#fef3c7) that vanishes in light mode', () => {
    const html = render({ mode: 'home' });
    // The sample-problem + topic-card titles now use var(--allo-stem-text) so they
    // stay readable in light mode (the cream is only a dark-mode fallback).
    expect(html).toContain('var(--allo-stem-text, #fef3c7)');
    // ...and there is no bare cream text color left on the (light) home screen.
    expect(/color:\s*#fef3c7\b/.test(html)).toBe(false);
  });
});

describe('opticsLab — slider a11y (aria-valuetext speaks the image result)', () => {
  it('lens sliders expose the computed image via aria-valuetext', () => {
    const html = render({ mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 30 });
    expect(/aria-valuetext="[^"]*magnification -0\.50/.test(html)).toBe(true);
  });
  it('mirror sliders expose the computed image via aria-valuetext', () => {
    const html = render({ mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10, reflDo: 30 });
    expect(/aria-valuetext="[^"]*magnification -0\.50/.test(html)).toBe(true);
  });
});

describe('opticsLab — Fresnel interface energy', () => {
  it('shows the exact 4/96 power split for normal air-to-glass incidence', () => {
    const html = render({ mode: 'refraction', refrN1: 1, refrN2: 1.5, refrTheta1: 0 });
    const split = readFresnelSplit(html);
    expect(split.reflectance).toBeCloseTo(0.04, 6);
    expect(split.transmittance).toBeCloseTo(0.96, 6);
    expect(split.reflectance + split.transmittance).toBeCloseTo(1, 6);
    expect(html).toContain('data-fresnel-model="unpolarized-lossless"');
    expect(html).toContain('Interface power bar: 4.0% reflected and 96.0% transmitted');
    expect(html).toContain('data-op-refraction-ray="reflected"');
    expect(html).toContain('data-op-refraction-ray="transmitted"');
    expect(html).toContain('Reflected power (unpolarized)');
  });

  it('raises reflection sharply while approaching the critical angle', () => {
    const baseline = readFresnelSplit(render({ mode: 'refraction', refrN1: 1.5, refrN2: 1, refrTheta1: 40 }));
    const nearCritical = readFresnelSplit(render({ mode: 'refraction', refrN1: 1.5, refrN2: 1, refrTheta1: 41.7 }));
    expect(baseline.reflectance).toBeCloseTo(0.245291, 6);
    expect(nearCritical.reflectance).toBeCloseTo(0.689661, 6);
    expect(nearCritical.reflectance).toBeGreaterThan(baseline.reflectance);
    expect(nearCritical.reflectance + nearCritical.transmittance).toBeCloseTo(1, 6);
  });

  it('becomes 100% reflection with no transmitted branch during TIR', () => {
    const html = render({ mode: 'refraction', refrN1: 1.5, refrN2: 1, refrTheta1: 60 });
    const split = readFresnelSplit(html);
    expect(split.reflectance).toBe(1);
    expect(split.transmittance).toBe(0);
    expect(html).toContain('data-op-fresnel-status="tir"');
    expect(html).toContain('Total internal reflection: 100.0% reflected and 0.0% transmitted');
    expect(html).not.toContain('data-op-refraction-ray="transmitted"');
  });
});

describe('opticsLab — polarization state agreement', () => {
  it('keeps the QWP analyzer angle-independent in the calculator, then resumes Malus at P3', () => {
    [0, 45, 90, 135].forEach((angle) => {
      const html = render({
        mode: 'polarization', polQwp: true, polTheta2: angle, polShowMath: true
      });
      expect(html).toContain('data-op-polarization-calc-mode="circular"');
      expect(html).toContain('data-final-intensity="0.250000"');
      expect(html).toContain('P₂ then transmits half at every axis');
      expect(html).toContain('I2 = 1/2 I_QWP = 0.2500 I0');
    });

    const withP3 = render({
      mode: 'polarization', polQwp: true, polTheta2: 45,
      polUseP3: true, polTheta3: 90, polShowMath: true
    });
    expect(withP3).toContain('data-final-intensity="0.125000"');
    expect(withP3).toContain('after P₂ the light is linear again');
    expect(withP3).toContain('Step 3: P₂ → P₃');
  });
});
