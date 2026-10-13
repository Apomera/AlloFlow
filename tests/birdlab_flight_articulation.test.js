import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const start = source.indexOf('  var SOARING_FLIGHT_ART = {');
const end = source.indexOf('  function renderSceneBirdArt(', start);
if (start < 0 || end < 0) throw new Error('Missing production flight renderer');
const renderFlight = new Function(source.slice(start, end) + '\nreturn renderSoaringBird;')();
const renderScene = new Function('SCENE_FLIGHT_SPECIES', 'sceneBirdFieldPose',
  source.slice(start, source.indexOf('  function renderHabitatOccluders(', end)) + '\nreturn renderSceneBirdArt;')({}, () => 'species-default');

function flight(species, renderer = renderFlight, args = [species, species + '-flight']) {
  const host = document.createElement('div');
  function svgNode(tag, props, ...children) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(props || {})) {
      if (value == null || name === 'key') continue;
      if (name === 'style') {
        for (const [property, setting] of Object.entries(value)) element.style.setProperty(property, setting);
      } else element.setAttribute(name === 'className' ? 'class' : name, value);
    }
    children.flat(Infinity).filter((child) => child && child.nodeType).forEach((child) => element.appendChild(child));
    return element;
  }
  host.appendChild(svgNode('svg', null, renderer(svgNode, ...args)));
  return host;
}

describe('BirdLab articulated flight', () => {
  it.each(['raven', 'coopershawk', 'herringGull', 'bald-eagle'])(
    '%s keeps two wings attached at fixed shoulders and wrists, with a separate steering tail', (species) => {
      const host = flight(species);
      const wings = [...host.querySelectorAll('[data-birdlab-flight-wing]')];
      expect(wings).toHaveLength(2);
      expect(wings.map((wing) => wing.dataset.birdlabFlightWing)).toEqual(['left', 'right']);
      for (const wing of wings) {
        const shoulder = wing.querySelector('[data-birdlab-flight-joint="shoulder"]');
        const wrist = wing.querySelector('[data-birdlab-flight-joint="wrist"]');
        expect(shoulder).toBeTruthy();
        expect(shoulder.contains(wrist)).toBe(true);
        expect(shoulder.parentElement.getAttribute('transform')).toBe('translate(13 13)');
        expect(wrist.parentElement.getAttribute('transform')).toBe('translate(7.5 11)');
        // Feathers must follow the hand, not hang in space as the wing beats.
        expect(wrist.querySelectorAll('path').length).toBeGreaterThanOrEqual(2);
      }
      const tail = host.querySelector('[data-birdlab-flight-joint="tail"]');
      expect(tail).toBeTruthy();
      expect(wings.some((wing) => wing.contains(tail))).toBe(false);
      for (const joint of host.querySelectorAll('[data-birdlab-flight-joint]')) {
        // These classes connect every new joint to existing pause, frozen-
        // focus, offscreen and reduced-motion policies.
        expect(joint.classList.contains('birdlab-anatomy-motion')).toBe(true);
      }
    }
  );

  it('keeps species flight signatures and pale feather markings attached to the appropriate surface', () => {
    const gull = flight('herringGull');
    const raven = flight('raven');
    const hawk = flight('coopershawk');
    const eagle = flight('bald-eagle');
    const root = (host) => host.querySelector('[data-birdlab-flight-style]');
    expect(root(eagle).dataset.birdlabFlightStyle).toBe('deep-beats');
    expect(root(hawk).dataset.birdlabFlightStyle).toBe('flap-flap-glide');
    expect(root(gull).style.getPropertyValue('--birdlab-flight-cycle')).not.toBe(root(hawk).style.getPropertyValue('--birdlab-flight-cycle'));
    const hand = (host) => host.querySelector('[data-birdlab-flight-joint="wrist"] path').getAttribute('d');
    expect(new Set([hand(gull), hand(raven), hand(hawk)]).size).toBe(3);
    for (const wrist of gull.querySelectorAll('[data-birdlab-flight-joint="wrist"]')) {
      expect(wrist.querySelector('[fill="#1c2830"]')).toBeTruthy();
      expect(wrist.querySelector('[stroke="#fffff9"]')).toBeTruthy();
    }
    expect(eagle.querySelector('[data-birdlab-flight-joint="tail"] path').getAttribute('fill')).toBe('#eeeee2');
    expect(hawk.querySelector('[data-birdlab-flight-joint="tail"] [stroke="#d7dcda"]')).toBeTruthy();
  });

  it('never flips a flapping wing through a negative scale and keeps the bank centered on the body', () => {
    const animationSource = source.slice(source.indexOf("'@keyframes birdlab-flight-beat"), source.indexOf("'.birdlab-anatomy-motion {"));
    expect(animationSource).not.toMatch(/scale(?:X|Y)?\(\s*-/);
    expect(animationSource).toContain('transform-origin: 0px 0px !important');
    expect(animationSource).toContain('transform-origin: 15px 15px !important');
    expect(animationSource).toContain('birdlab-flight-coast-wrist');
  });

  it.each(['chickadee', 'vireo', 'cardinal', 'bluejay', 'houseFinch'])(
    '%s flies during arrival/departure but retains its perched diagnostic art while resting', (species) => {
      const canonical = { svg: (h) => h('g', { 'data-perched-art': species }) };
      const render = (state, motion = 'perch-bob') => flight(species, renderScene,
        [{ species }, canonical, motion, 'forest', { script: 'field-mark-loop', state, pose: 'species-default' }]);
      for (const state of ['entering', 'arriving', 'exiting']) {
        const host = render(state);
        expect(host.querySelectorAll('[data-birdlab-flight-wing]')).toHaveLength(2);
        expect(host.querySelector('[data-birdlab-flight-pose]').dataset.birdlabFlightPose).toBe(species + '-transit');
        expect(host.querySelector('[data-perched-art]')).toBeNull();
      }
      expect(render('visible').querySelector('[data-perched-art]')).toBeTruthy();
      expect(render('cooldown').querySelector('[data-perched-art]')).toBeTruthy();
      if (species === 'vireo') expect(render('visible', 'flit').querySelectorAll('[data-birdlab-flight-wing]')).toHaveLength(2);
    }
  );
});
