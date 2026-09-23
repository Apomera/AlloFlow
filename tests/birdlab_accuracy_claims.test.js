// Bird Lab — claims checked against their sources (2026-09-23).
//
// Each block names what the lab said, what the source says, and pins the
// corrected wording. Assertions read the source with comment lines removed, so
// an explanatory comment quoting an old claim cannot trip or satisfy them.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const strip = (s) => s.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
// BIRDLAB_TOOL_FILE / BIRDLAB_MIRROR_FILE point a mutation run at scratch copies,
// so the shared tree is never edited.
const SRC = strip(fs.readFileSync(process.env.BIRDLAB_TOOL_FILE || path.join(ROOT, 'stem_lab/stem_tool_birdlab.js'), 'utf8'));
const MIRROR = strip(fs.readFileSync(process.env.BIRDLAB_MIRROR_FILE || path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_birdlab.js'), 'utf8'));

describe('species cards', () => {
  it('credits headfirst trunk-walking to nuthatches as a family', () => {
    // Red-breasted, Brown-headed and Pygmy Nuthatches do it too.
    expect(SRC).not.toMatch(/The only North American bird that walks DOWN/);
    expect(SRC).toMatch(/Nuthatches are the only North American birds that routinely climb DOWN/);
  });

  it('tells Project Puffin as a chick translocation, then decoys', () => {
    // Kress moved 954 chicks from Great Island, Newfoundland, 1973-1986;
    // decoys lured the grown birds back; first nesting 1981.
    expect(SRC).not.toMatch(/used decoys and recordings to lure puffins back/);
    expect(SRC).toMatch(/moved 954 chicks from Newfoundland/);
    expect(SRC).toMatch(/The first pairs nested in 1981/);
  });

  it('dates Maine\'s bald eagle low to 1967 and gives the 2018 count', () => {
    expect(SRC).not.toMatch(/21 nesting pairs in 1972|<60 in 1970/);
    expect(SRC).toMatch(/down to 21 nesting pairs in 1967/);
    expect(SRC).toMatch(/733 nesting pairs at the 2018 statewide count/);
  });

  it('describes female cardinal song without the unsupported complexity claim', () => {
    expect(SRC).not.toMatch(/Females sing more complex songs than males/);
    expect(SRC).not.toMatch(/unusual among songbirds\./);
    expect(SRC).toMatch(/unusual among North American songbirds/);
  });
});

describe('migration', () => {
  it('gives the tracked puffin route, not "~200 mi"', () => {
    expect(SRC).not.toMatch(/~200 mi \(coastal pelagic\)/);
    expect(SRC).toMatch(/heads NORTH to the Gulf of St\. Lawrence/);
  });

  it('has puffins leave in August everywhere', () => {
    expect(SRC).not.toMatch(/Most Atlantic Puffins leave colonies/);
    expect(SRC).toMatch(/Atlantic Puffins leave the islands/);
  });

  it('weighs a Black-throated Green Warbler at about 9 grams', () => {
    expect(SRC).not.toMatch(/4-gram bird/);
    expect(SRC).toMatch(/A bird of about 9 grams/);
  });

  it('ties snowy owl irruptions to lemming booms, not crashes', () => {
    expect(SRC).not.toMatch(/lemming-population crashes/);
    expect(SRC).toMatch(/Big irruptions usually follow a lemming BOOM/);
  });

  it('describes the blackpoll flight as tracked', () => {
    expect(SRC).not.toMatch(/single non-stop trans-Atlantic flight from New England to South America/);
    expect(SRC).toMatch(/2,300–2,800 km from the Northeast to the Caribbean or northern South America/);
  });

  it('puts the fall hawk peak on Cadillac Mountain, Bradbury in spring', () => {
    const cal = sliceBetween(SRC, 'var MAINE_MIGRATION_CALENDAR = [', 'var FEATURED_MIGRATORS = [', { label: 'calendar' });
    const sep = sliceBetween(cal, "month: 'September'", '\n', { label: 'September row' });
    expect(sep).toMatch(/Cadillac Mountain/);
    expect(sep).not.toMatch(/Bradbury/);
    const apr = sliceBetween(cal, "month: 'April'", '\n', { label: 'April row' });
    expect(apr).toMatch(/Bradbury Mountain, Maine\\'s spring hawkwatch/);
  });
});

describe('beaks, feathers, flight, nests', () => {
  it('gives raptors talons, not webbed feet', () => {
    expect(SRC).not.toMatch(/hooked bill on a webbed foot/);
    expect(SRC).toMatch(/a hooked bill on taloned feet\? A raptor/);
  });

  it('tells the real Darwin finch story', () => {
    expect(SRC).not.toMatch(/Darwin watched 13 finch species/);
    expect(SRC).toMatch(/John Gould showed they were a new group of a dozen species/);
  });

  it('does not call feathers modified scales or the most complex structure ever', () => {
    expect(SRC).not.toMatch(/evolved from reptile scales|most complex structure ever evolved/);
    expect(SRC).toMatch(/Feathers are not modified scales/);
    expect(SRC).toMatch(/most complex skin structures of any vertebrate/);
  });

  it('explains undulating flight by drag', () => {
    expect(SRC).not.toMatch(/reducing wing surface during downstroke/);
    expect(SRC).toMatch(/folding the wings against the body between bursts of flapping, which cuts drag/);
  });

  it('keeps the Maine turkey and eagle history straight in every restatement', () => {
    // Maine has no official state game bird. Turkeys were gone by the early
    // 1800s; the 1977-78 release of 41 Vermont birds took hold (Maine IFW).
    expect(SRC).not.toMatch(/state game bird/);
    expect(SRC).not.toMatch(/Maine by 1900|extirpated by 1900|Pennsylvania/);
    expect(SRC).toMatch(/41 wild turkeys from Vermont, released in York and Eliot in 1977–78, took hold/);
    // Eagles: 21 pairs in 1967; off Maine's endangered and threatened list in 2009.
    expect(SRC).not.toMatch(/60 nests in 1970|State threatened|State-threatened/);
    expect(SRC).toMatch(/Removed from Maine\\'s endangered and threatened list in 2009/);
  });

  it('sizes eagle nests from typical and record figures', () => {
    expect(SRC).not.toMatch(/up to 12 ft|in use for over 35 years/);
    expect(SRC).toMatch(/Typically 5–6 ft across \(record 9\.5 ft\)/);
  });
});

describe('egg gallery', () => {
  const dataSrc = sliceBetween(SRC, 'var EGGS_DATA = [', '\n  ];', { label: 'EGGS_DATA', includeEnd: true });
  const EGGS = new Function(dataSrc + '\nreturn EGGS_DATA;')();
  const artSrc = sliceBetween(SRC, 'var EGG_ART = (function() {', '\n  })();', { label: 'EGG_ART', includeEnd: true });
  const EGG_ART = new Function(artSrc + '\nreturn EGG_ART;')();
  // A stand-in for React.createElement that keeps the whole tree.
  const h = (tag, props, ...kids) => ({ tag, props, kids: kids.flat(Infinity).filter((k) => k != null && k !== false) });

  it('corrects the egg notes against their sources', () => {
    // Pennsylvania's state game bird, not Maine's.
    expect(SRC).not.toMatch(/Maine\\'s state game bird/);
    // The American Robin is a thrush, and far commoner.
    expect(SRC).not.toMatch(/Maine\\'s most common breeding thrush/);
    // Chickadee, nuthatch, titmouse and bluebird all nest in cavities.
    expect(SRC).not.toMatch(/All cavity-nester eggs are typically white/);
    expect(SRC).toMatch(/White eggs are common in holes but not universal/);
    // Sharp-shinned eggs are blotched with brown; Cooper's mostly unmarked.
    expect(SRC).not.toMatch(/have very similar eggs/);
    expect(SRC).toMatch(/lay smaller eggs \(about 37 × 30 mm\) that are usually blotched with brown/);
    // Woodcock eggs are large for the bird.
    expect(SRC).not.toMatch(/Tiny vs adult body/);
    expect(SRC).toMatch(/Large for the size of the bird/);
    expect(SRC).not.toMatch(/the warmest natural insulation known/);
    expect(SRC).toMatch(/In the East, including Maine, the nest is usually built on the ground/);
  });

  it('gives every egg a real size, a solid colour and a drawable pattern', () => {
    expect(EGGS.length).toBe(35);
    for (const e of EGGS) {
      const m = e.dimensions.match(/^(\d+) × (\d+) mm$/);
      expect(m, `${e.species} dimensions`).toBeTruthy();
      expect(Number(m[1]), `${e.species} longer than wide`).toBeGreaterThan(Number(m[2]));
      // A theme variable here drew the white eggs near-black in a light theme.
      expect(e.color, `${e.species} colour`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(['plain', 'speckled', 'spotted', 'blotched', 'scrawled', 'faint'], e.species).toContain(e.pattern);
      if (e.pattern !== 'plain') expect(e.mark, `${e.species} marking ink`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('draws the same egg every time, with no Math.random anywhere in the gallery', () => {
    expect(artSrc).not.toMatch(/Math\.random/);
    expect(sliceBetween(SRC, 'function EggGallery() {', 'function FeatherAnatomyLab() {', { label: 'EggGallery' })).not.toMatch(/Math\.random/);
    for (const e of EGGS) {
      expect(JSON.stringify(EGG_ART.draw(h, e, 1.5, 'g')), e.species).toBe(JSON.stringify(EGG_ART.draw(h, e, 1.5, 'g')));
    }
    // Different species get different markings.
    const marks = (name) => JSON.stringify(EGG_ART.draw(h, EGGS.find((e) => e.species === name), 1.5, 'g').kids[3]);
    expect(marks('Song Sparrow')).not.toBe(marks('White-throated Sparrow'));
  });

  it('sizes every drawing from the egg, at the scale asked for', () => {
    for (const e of EGGS) {
      const svg = EGG_ART.draw(h, e, 2, 'g');
      const [, , vbW, vbH] = svg.props.viewBox.split(' ').map(Number);
      expect(Math.abs(svg.props.width - vbW * 2), e.species).toBeLessThanOrEqual(1);
      expect(Math.abs(svg.props.height - vbH * 2), e.species).toBeLessThanOrEqual(1);
      expect(svg.props['data-egg-length']).toBe(Number(e.dimensions.match(/^(\d+)/)[1]));
    }
  });
});

describe('nest gallery', () => {
  it('corrects the nest stories against their sources', () => {
    // The Barn Swallow's TAIL is forked; "ophiuro" is not a word.
    expect(SRC).not.toMatch(/ophiuro|fish-tail forked wings/);
    expect(SRC).toMatch(/Known by its deeply forked tail/);
    // Other small birds bind their nests with spider silk too.
    expect(SRC).not.toMatch(/the only nest that can expand/);
    // One pair survived on Matinicus Rock (1901); more than 1,300 pairs now.
    expect(SRC).not.toMatch(/from 0 birds|from 0 Maine birds|~1,500 pairs/);
    expect(SRC).toMatch(/Hunting left a single pair on Matinicus Rock by 1901/);
    // Maine Audubon / IFW counts: 157 pairs in 2023, 143 in 2024.
    // Maine Audubon / Sun Journal: 174 pairs in 2025, ~185 in 2026, 7 in 1981.
    expect(SRC).not.toMatch(/~50 pairs|~80-100 pairs|Plover pairs \(~50\)/);
    expect(SRC).toMatch(/a record 174 nesting pairs in 2025/);
    // Maine ospreys arrive in early April.
    expect(SRC).not.toMatch(/Returns to nest in mid-March/);
    // Breeding Bird Survey: about 45-50% down since 1966.
    expect(SRC).not.toMatch(/declined 60%\+ since 1970/);
    // Newly hatched woodcock are downy, not feathered.
    expect(SRC).not.toMatch(/feathered \+ walking within hours/);
  });
});

describe('file-wide audit, 2026-09-23 (every restatement, not just one)', () => {
  it('keeps Bradbury a spring hawkwatch and invents no fall site', () => {
    // hawkcount.org: Bradbury Mountain = spring (Mar 15-May 15, since 2007);
    // Cadillac + Agamenticus = fall. There is no "Sandy Point" hawkwatch.
    expect(SRC).not.toMatch(/Sandy Point Hawkwatch|Hawkwatch Mountain|Hawkwatch Mt at Bradbury|Sandy Point[^'\n]{0,24}[Hh]awk/);
    expect(SRC).not.toMatch(/Bradbury[^'\n]{0,48}(Sept-Oct|Sept 1|fall season|established (in )?1992|staffed Sept|\(Sept\))/);
    expect(SRC).not.toMatch(/2023 Bradbury Mountain peak|~11,000 raptors total/);
    expect(SRC).toMatch(/Averages about 4,180 raptors each spring/);
    expect(SRC).toMatch(/Cadillac Mountain, Acadia \(fall, since 1994\)/);
  });

  it('states counts the sources give', () => {
    expect(SRC).not.toMatch(/10,500 (living )?(bird )?species|Approximately 10,500|today\\'s 10,500/);
    expect(SRC).not.toMatch(/~3,500 (Maine )?breeding pairs|Loon pairs \(~3,500\)/);
    expect(SRC).not.toMatch(/state quarter|quarter coin/);
    expect(SRC).not.toMatch(/~12 state-listed|~424 species/);
    expect(SRC).toMatch(/25 state-listed bird species \(12 endangered, 13 threatened\)/);
  });

  it('gets the biology right', () => {
    // Templeton et al. 2005: more dee notes = smaller, more dangerous predator.
    expect(SRC).not.toMatch(/more dees = bigger predator/);
    expect(SRC).not.toMatch(/Skeletal mass is ~5% of bird/);
    expect(SRC).not.toMatch(/related to storks/);
    expect(SRC).not.toMatch(/carotenoids from berries|carotenoid pigments in berries/);
    expect(SRC).not.toMatch(/listening for a fish below/);
    expect(SRC).not.toMatch(/Birds hear about the same range as humans/);
    expect(SRC).not.toMatch(/Born feathered, eyes open/);
    expect(SRC).not.toMatch(/Maine\\'s only true offshore-breeding "cliff gull\."/);
  });

  it('lists Maine statuses from the state list', () => {
    expect(SRC).not.toMatch(/State Threatened \(downgraded from Endangered\)|Federal Delisted \(recovered\); State Threatened/);
    expect(SRC).not.toMatch(/Watch List; State Endangered|Federal Petitioned; State Special Concern/);
    expect(SRC).toMatch(/sci: 'Nycticorax nycticorax',\s+status: 'State Endangered'/);
    expect(SRC).toMatch(/sci: 'Cistothorus stellaris',\s+status: 'State Endangered'/);
  });

  it('keeps the dichotomous key consistent with the lab\'s own sizes', () => {
    expect(SRC).not.toMatch(/Medium \(10-15 in, crow-sized\)/);
    expect(SRC).not.toMatch(/id: 'tiny-red', result: 'Likely Northern Cardinal/);
    expect(SRC).not.toMatch(/id: 'huge-water', result: '[^']*Wild Turkey/);
  });

  it('uses only sourced Wabanaki names and stories', () => {
    expect(SRC).not.toMatch(/Tau \/ Towi|Wapikwsisok|Nasekek|penobscot_name: 'Variations exist'/);
    expect(SRC).not.toMatch(/original "Audubon" of Maine coast|partnered with tribal communities/);
    expect(SRC).toMatch(/penobscot_name: 'oqim \(Passamaquoddy-Maliseet\)'/);
  });

  it('quotes only what people wrote', () => {
    expect(SRC).not.toMatch(/co-collaborator with the bird|Birds invite us to see|saved by it|author: 'Maine Loon Project'/);
    expect(SRC).not.toMatch(/Hope is a thing with feathers|Maya Angelou \(Chinese proverb\)/);
    expect(SRC).toMatch(/is the thing with feathers/);
  });
});

describe('mirror', () => {
  it('ships the same corrected source in the public mirror', () => {
    expect(MIRROR).toBe(SRC);
  });
});
