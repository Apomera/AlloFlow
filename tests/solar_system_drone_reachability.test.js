import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Guards the "authored but unreachable" bugs found in the Solar System vehicle
 * mode, where content existed and rendered correctly but no student could ever
 * get to it. None of these were visible to the render gate, the goldens or the
 * a11y suites, because nothing crashed and nothing changed shape — the tool
 * simply withheld most of itself.
 *
 * These assert INVARIANTS wherever possible (the floor must clear the deepest
 * zone) rather than the literals that happen to satisfy them today, so a later
 * retune stays green and only a real regression goes red.
 */
const SOLAR_SYSTEM_PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

const eachSource = (fn) => SOLAR_SYSTEM_PATHS.forEach((p) => fn(readFileSync(p, 'utf8'), p));

describe('solar system vehicle mode reachability', () => {
  it('lets the gas giant probe descend into every atmospheric zone', () => {
    eachSource((source, path) => {
      // The floor the descend key clamps against.
      const floorMatch = source.match(/moveState\.down\)\s*playerPos\.y = Math\.max\((-?[\d.]+), playerPos\.y - speed3d\)/);
      expect(floorMatch, `no gas descent clamp found in ${path}`).toBeTruthy();
      const floor = Number(floorMatch[1]);

      // The shallowest boundary of the DEEPEST zone: to enter the innermost
      // region at all, the probe has to get below it. gasAtmo's zones use
      // minY: -999 for that region, so read its maxY instead.
      const deepest = source.match(/Inner Core Region'\),\s*minY:\s*-?\d+,\s*maxY:\s*(-?\d+)/);
      expect(deepest, `could not read the innermost zone boundary in ${path}`).toBeTruthy();
      const innermostEntry = Number(deepest[1]);

      // A floor of 1.0 (the original) left three of the five zones, ten of the
      // sixteen sample orbs, the shield-damage system and three warning
      // messages permanently out of reach.
      expect(floor, `${path}: descend floor ${floor} cannot reach the innermost zone at ${innermostEntry}`)
        .toBeLessThan(innermostEntry);
    });
  });

  it('keeps the world bounded so the rover cannot drive off its terrain', () => {
    eachSource((source, path) => {
      expect(source, `${path} lost the world-edge clamp`).toContain('var edgeLimit = isGas ? 180 : 115;');
      // The terrain plane is 250 wide (+/-125); the clamp must stay inside it,
      // because past the edge the height raycast misses and the rocky lookup
      // returns 0, snapping the rover to y=1.6 over empty space.
      const limit = Number(source.match(/var edgeLimit = isGas \? 180 : (\d+);/)[1]);
      expect(limit).toBeLessThan(125);
    });
  });

  it('spawns ocean specimens above the seafloor rather than inside it', () => {
    eachSource((source, path) => {
      expect(source, `${path}: ocean sample orbs are no longer floor-guarded`)
        .toContain('oy = Math.max(oy, _terrainHeightAt(ox, oz) + 1.6);');
    });
  });

  it('drives per-planet data off a stable key, not the localized display name', () => {
    // PLANETS entries take their name from t(), so sel.name is whatever the
    // active language pack returns. Tables keyed by English names therefore
    // MISS in every non-English locale, and because the call sites are guarded
    // the failure is silent: the panels simply do not render.
    const TABLES = [
      'MAGNETOSPHERE', 'DESCENT_LAYERS', 'SKY_VIEWS', 'POE_PROMPTS', 'HOHMANN',
      'GRAVITY_MAP', 'NOTABLE_MOONS', 'PLANET_RADII', 'EXTRA_FACTS', 'DIST_AU',
      'WHAT_IF', 'MISSIONS', 'ESCAPE_VEL', 'sunSizes', 'sunSizeFactors',
      'hazardMsgs', 'ROCK_SAMPLES', 'POI_DATA', 'AMBIENT_SOUNDS',
    ];
    eachSource((source, path) => {
      TABLES.forEach((tbl) => {
        expect(source, `${path}: ${tbl} is looked up by the localized display name`)
          .not.toContain(`${tbl}[sel.name]`);
      });
      // Every planet carries the stable key those lookups depend on.
      ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
        .forEach((k) => expect(source, `${path}: no stable key for ${k}`).toContain(`{ key: '${k}', name: t(`));
    });
  });

  it('shimmers Saturn ring opacity around its built value instead of assigning over it', () => {
    eachSource((source, path) => {
      // The frame loop used to ASSIGN `0.2 + sin(...)`, which silently discarded
      // whatever opacity the builder chose — so raising it at build time did
      // nothing at all. Same trap for any per-frame material write.
      expect(source, `${path}: ring opacity is assigned, not modulated`)
        .not.toMatch(/rm\.material\.opacity = 0\.2 \+/);
      expect(source).toContain('if (rm._baseOpacity == null) rm._baseOpacity = rm.material.opacity;');
    });
  });

  it('keys orbital eccentricity off the stable key, not the display name', () => {
    eachSource((source, path) => {
      // This one did not hide content, it published WRONG NUMBERS: with the
      // localized name the whole chain fell through to the default, so the
      // Kepler lab taught that Venus has Pluto's eccentricity (0.25) when it is
      // 0.007 — the most circular orbit in the solar system.
      expect(source, `${path}: eccentricity is selected by the localized name`)
        .not.toMatch(/realEcc = p\.name ===/);
      expect(source).toContain("var realEcc = p.key === 'Mercury' ? 0.206");
    });
  });

  it('runs exactly one ice-giant diamond system, anchored to the probe', () => {
    eachSource((source, path) => {
      // There were two: an older 100-point cloud pinned to +/-40 about the
      // ORIGIN at y -5..20 (the cloud tops — the wrong layer entirely, and left
      // behind the moment the probe moved), plus its two animators. Removed in
      // favour of gasDiamonds, which follows the probe and fades in across the
      // depths the zone table names. Two systems for one feature is worse than
      // either, so assert the old one has not come back.
      expect(source, `${path}: the old world-fixed diamond cloud is back`)
        .not.toMatch(/var diamonds = new THREE\.Points/);
      expect(source, `${path}: gasDiamonds is no longer depth-gated to the probe`)
        .toContain('var drDepth = Math.max(0, Math.min(1, (-6 - playerPos.y) / 8));');
    });
  });

  it('derives shadows from the atmosphere rather than switching them on globally', () => {
    eachSource((source, path) => {
      // Shadow hardness is the same atmospheric fact the lights are built from,
      // so this is science, not decoration: Mercury and Pluto are airless and
      // throw sharp shadows, Mars's are softened by dusty sky-fill, and Venus —
      // lit entirely by cloud-scattered light — throws none at all. A blanket
      // `shadowMap.enabled = true` would flatten that distinction and put a
      // shadow under the rover on a world that physically cannot have one.
      expect(source, `${path}: shadows are no longer gated on the sun's strength`)
        .toContain('var droneShadows = !isFluid && _sunPower >= 0.28;');
      // Venus must stay below the threshold.
      expect(source).toContain('_hemiPower = 1.25; _sunPower = 0.2;');
      expect(source).toContain('renderer.shadowMap.type = THREE.PCFSoftShadowMap;');
    });
  });

  it('offers a keyboard route to look around, not just pointer-lock mouse', () => {
    eachSource((source, path) => {
      // yaw/pitch had exactly one writer (mousemove), so a keyboard-only student
      // drove in their starting direction forever and could never look up —
      // which is where Saturn's rings are.
      expect(source, `${path}: arrow-key look is gone`).toContain("case 'arrowup': lookState.up = pressed;");
      expect(source).toContain('if (lookState.left) yaw += 0.028;');
      expect(source).toContain('if (lookState.up) pitch = Math.min(1.2, pitch + 0.022);');
    });
  });
});
