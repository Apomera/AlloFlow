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

  it('reads tracks, sign and feet correctly', () => {
    // Early hummingbirds feed at sapsucker sap wells; nobody drills feeders.
    expect(SRC).not.toMatch(/Yellow holes drilled into hummingbird feeders/);
    expect(SRC).toMatch(/sapsucker sap wells/);
    // A gull's tiny hind toe rarely prints; ospreys usually eat the head first.
    expect(SRC).not.toMatch(/4-toed webbed prints|head \+ bones discarded/);
    // Grebes + coots have lobed (lobate) toes; semipalmate means partly webbed.
    expect(SRC).not.toMatch(/Lobed swimmer \(semi-palmate\)/);
  });

  it('sizes owls + raptors from published ranges', () => {
    // All About Birds: Eastern Screech-Owl 6.3-9.8 in; Sharp-shinned wingspan 17-22 in.
    expect(SRC).toMatch(/size: '6–10 in tall, 6 oz'/);
    expect(SRC).toMatch(/group: 'Small accipiter', size: '10–14 in, 4 oz', wingspan: '~20 in'/);
  });

  it('quotes only what people wrote', () => {
    expect(SRC).not.toMatch(/co-collaborator with the bird|Birds invite us to see|saved by it|author: 'Maine Loon Project'/);
    expect(SRC).not.toMatch(/Hope is a thing with feathers|Maya Angelou \(Chinese proverb\)/);
    expect(SRC).toMatch(/is the thing with feathers/);
  });
});

describe('bird topography', () => {
  const topo = () => sliceBetween(SRC, 'var TOPOLOGY = [', 'var TOPO_ART = (function() {', { label: 'TOPOLOGY' });
  const art = () => sliceBetween(SRC, 'var TOPO_ART = (function() {', 'var BY_ID = {};', { label: 'TOPO_ART parts' });

  it('names 24 regions, each drawn once on the bird', () => {
    const named = [...topo().matchAll(/\{ id: '([a-z-]+)', label:/g)].map((m) => m[1]);
    const drawn = [...art().matchAll(/\{ id: '([a-z-]+)', fill:/g)].map((m) => m[1]);
    expect(named.length).toBe(24);
    expect(new Set(named).size).toBe(24);
    expect([...drawn].sort()).toEqual([...named].sort());
  });

  it('corrects the region notes', () => {
    // Eastern Wood-Pewee underparts are whitish; the lemon-yellow belly is the
    // Great Crested Flycatcher. The nape is no hummingbird mark, and neither
    // Yellow-rumped Warbler nor flicker is a forehead example.
    expect(SRC).not.toMatch(/yellow in many warblers \+ Eastern Wood-Pewee/);
    expect(SRC).not.toMatch(/distinguishing flickers \(red nape\), hummingbirds/);
    expect(SRC).not.toMatch(/Can show distinctive color \(Yellow-rumped Warbler, flicker\)/);
    expect(SRC).not.toMatch(/Total topology points labeled/);
    expect(SRC).toMatch(/A Great Crested Flycatcher is bright lemon yellow here/);
    expect(SRC).toMatch(/Pale tips on two rows of coverts \(the median and greater coverts\)/);
    expect(SRC).toMatch(/The rusty undertail coverts of a Gray Catbird/);
    expect(SRC).toMatch(/The red waxy tips of a Cedar Waxwing are on its secondaries/);
    expect(SRC).toMatch(/in fall a Blackpoll Warbler has pale legs and a Bay-breasted Warbler dark ones/);
  });
});

describe('plumage plates', () => {
  it('ages goldfinches by their spring molt, not a "first complete molt"', () => {
    // First-year males turn yellow in a partial spring (prealternate) molt.
    expect(SRC).not.toMatch(/lack adult bright yellow until first complete molt/);
    expect(SRC).toMatch(/Young male goldfinches get their first bright yellow in their first spring/);
  });

  it('describes seasonal changes the birds actually make', () => {
    // Loons have no eye-stripe to lose and are back at ice-out; fall male
    // blackbirds wear rusty edges; Wood Ducks are not in Maine all winter.
    expect(SRC).not.toMatch(/no eye-stripe/);
    expect(SRC).not.toMatch(/Breeding plumage May–August on Maine lakes/);
    expect(SRC).not.toMatch(/Male plumage same — but the red epaulets/);
    expect(SRC).not.toMatch(/Breeding plumage Oct–July in Maine/);
    expect(SRC).toMatch(/from ice-out \(April\) through late summer/);
    expect(SRC).toMatch(/males have rusty \+ buff feather edges that wear away by spring/);
  });

  it('draws the gray group with the birds its caption lists', () => {
    // The Gray plate showed a Common Raven, which is black and not in its list.
    const gray = sliceBetween(SRC, "color: 'Gray',", "color: 'Iridescent',", { label: 'Gray group' });
    expect(gray).not.toMatch(/name: 'Raven'/);
    expect(gray).toMatch(/name: 'Gray Catbird'/);
    expect(gray).toMatch(/Gray Catbird/);
  });
});

describe('shape reference + flight patterns', () => {
  it('gives tail, bill and size examples that match the birds', () => {
    // Falcon tails are fairly long; magpie tails are long + graduated; a
    // skimmer's bill is a knife, not a pouch; woodpeckers run 6-17 in.
    expect(SRC).not.toMatch(/Short tails \(auks, ducks, falcons\)/);
    expect(SRC).not.toMatch(/Square \(crows, magpies\)|Round \(most songbirds\)/);
    expect(SRC).not.toMatch(/pelican-like \(skimmers\)/);
    expect(SRC).not.toMatch(/robins \+ jays \+ woodpeckers, 9-11 in/);
    expect(SRC).toMatch(/Square \(Sharp-shinned Hawk, American Crow\)/);
    expect(SRC).toMatch(/Rounded \(Cooper\\'s Hawk, Blue Jay\)/);
  });

  it('describes each flight style with birds that fly that way', () => {
    // Cedar Waxwings fly fast + direct; crows row and seldom glide; a hovering
    // hummingbird is not silent.
    const flight = sliceBetween(SRC, 'var FLIGHT_PATTERNS = [', 'var OWL_PROFILES = [', { label: 'FLIGHT_PATTERNS' });
    expect(flight).not.toMatch(/Cedar Waxwing/);
    expect(flight).not.toMatch(/Crows give 2-3 strong beats then brief glide/);
    expect(flight).not.toMatch(/hover is silent/);
    expect(flight).toMatch(/Crows row steadily; ravens often soar and glide/);
    expect(flight).toMatch(/Song Sparrow pumps its tail/);
  });
});

describe('warblers + family views', () => {
  it('does not count a vagrant as a Maine breeder, and puts its streaks where they are', () => {
    // The list includes the Yellow-throated Warbler, a rare visitor that breeds
    // farther south; its back is plain gray and the streaks run down its sides.
    expect(SRC).not.toMatch(/ Maine breeders\. Each tiny, fast-moving/);
    expect(SRC).not.toMatch(/blue-gray \+ black streaks on back/);
    expect(SRC).toMatch(/plain gray back, black streaks down the white sides/);
  });

  it('describes Canada Jay, Purple Finch and robin as they look', () => {
    // Canada Jay: white face, dark hood on the back of the head (no eye
    // stripe). Purple Finch males are only faintly streaked; House Finch males
    // are the boldly streaked ones. A robin's eye marks are arcs, not a ring.
    expect(SRC).not.toMatch(/Gray with white head \+ black stripe behind eye/);
    expect(SRC).not.toMatch(/raspberry-red overall, streaked sides/);
    expect(SRC).not.toMatch(/orange-red breast, white eye-ring/);
    expect(SRC).toMatch(/dark gray hood on the back of the head/);
    expect(SRC).toMatch(/sides only faintly streaked \(a male House Finch is boldly streaked\)/);
  });
});

describe('physiology + seabirds', () => {
  it('credits each feat to the right bird, with its caveats', () => {
    // A resting hummingbird heart is far below 600; the famous snow-plunge is
    // the Great Gray Owl's; the kestrel UV-urine result has been questioned.
    expect(SRC).not.toMatch(/600\+ beats per minute at rest/);
    expect(SRC).not.toMatch(/Saw-whet Owl can find a mouse under a foot of snow/);
    expect(SRC).not.toMatch(/Kestrels see UV trails of urine left by voles in grass\./);
    expect(SRC).toMatch(/A Great Gray Owl can hear a vole under a foot or more of snow/);
    expect(SRC).toMatch(/a 1995 finding that later work has questioned/);
  });

  it('uses the current English name for Ardenna gravis', () => {
    expect(SRC).not.toMatch(/Greater Shearwater/);
    expect(SRC).toMatch(/name: 'Great Shearwater', sci: 'Ardenna gravis'/);
  });
});

describe('duck ID', () => {
  it('keeps dabbler and diver anatomy the right way round, and loons out of the ducks', () => {
    // Divers have the big feet, set far back; dabbler legs sit mid-body.
    // Whistling wings are a goldeneye (diver) mark; loons are not ducks.
    const duck = sliceBetween(SRC, 'var DUCK_ID_GUIDE = [', '\n  ];', { label: 'DUCK_ID_GUIDE' });
    expect(duck).not.toMatch(/Larger feet positioned mid-body/);
    expect(duck).not.toMatch(/Wings whistle/);
    expect(duck).not.toMatch(/Loon \(related diving\)/);
    expect(duck).toMatch(/Legs set near the middle of the body/);
    expect(duck).toMatch(/Big feet set far back on the body/);
    expect(duck).toMatch(/Loons and grebes dive too, but they are not ducks/);
  });
});

describe('nest boxes', () => {
  // The drawings read NESTBOX_DIMS; the guide's prose is what a reader sees.
  // Every drawn number must sit inside what the prose states.
  it('draws every box from the numbers its own text gives', () => {
    const guide = new Function(sliceBetween(SRC, 'var NESTBOX_GUIDE = [', '\n  ];', { label: 'NESTBOX_GUIDE' }) + '\n];\nreturn NESTBOX_GUIDE;')();
    const dims = new Function(sliceBetween(SRC, 'var NESTBOX_DIMS = {', '\n  };', { label: 'NESTBOX_DIMS' }) + '\n};\nreturn NESTBOX_DIMS;')();
    const range = (m) => [Number(m[1]), Number(m[2] || m[1])];
    const within = (v, r) => v >= r[0] - 1e-9 && v <= r[1] + 1e-9;
    const bad = [];
    expect(guide.length).toBe(12);
    expect(Object.keys(dims).sort()).toEqual(guide.map((g) => g.species).sort());
    for (const g of guide) {
      const d = dims[g.species], who = g.species;
      const floor = /(\d+)×(\d+) in/.exec(g.box_size);
      const depth = /depth: ([\d.]+)(?:-([\d.]+))? in/.exec(g.box_size) || /([\d.]+)(?:-([\d.]+))? in tall/.exec(g.box_size);
      if (!floor || Number(floor[1]) !== d.floor) bad.push(`${who} floor ${d.floor} vs "${g.box_size}"`);
      if (!depth || !within(d.depth, range(depth))) bad.push(`${who} depth ${d.depth} vs "${g.box_size}"`);
      const oval = /([\d.]+) in high × ([\d.]+) in wide oval/.exec(g.entry);
      const round = /([\d.]+)(?:-([\d.]+))? in round/.exec(g.entry);
      if (oval) { if (d.holeH !== Number(oval[1]) || d.holeW !== Number(oval[2])) bad.push(`${who} oval hole`); }
      else if (!round || !within(d.hole, range(round))) bad.push(`${who} hole ${d.hole} vs "${g.entry}"`);
      const above = /~?([\d.]+)(?:-([\d.]+))? in above floor/.exec(g.entry);
      if (above ? !(d.above != null && within(d.above, range(above))) : d.above != null) bad.push(`${who} hole height ${d.above} vs "${g.entry}"`);
    }
    expect(bad).toEqual([]);
  });
});

describe('recovery stories', () => {
  const stories = () => new Function(sliceBetween(SRC, 'var RECOVERY_STORIES = [', '\n  ];', { label: 'RECOVERY_STORIES' }) + '\n];\nreturn RECOVERY_STORIES;')();
  it('fixes the puffin history, condor causes and pelican count area', () => {
    // By 1901 hunting had left one pair, on Matinicus Rock (Project Puffin);
    // condor chicks die of "microtrash" their parents bring, not microbes; the
    // pelican's 600,000+ is range-wide (USFWS delisting, 2009).
    const by = Object.fromEntries(stories().map((r) => [r.species, r]));
    expect(by['Atlantic Puffin'].decline).not.toMatch(/1970s/);
    expect(by['Atlantic Puffin'].decline).toMatch(/single pair in Maine, on Matinicus Rock/);
    expect(by['California Condor'].causes).not.toMatch(/Microbial/);
    expect(by['California Condor'].causes).toMatch(/bullet fragments/);
    expect(by['Brown Pelican'].result).toMatch(/600,000\+ across its whole range/);
  });
  it('charts only counts its own story states', () => {
    const by = Object.fromEntries(stories().map((r) => [r.species, r]));
    const counts = new Function(sliceBetween(SRC, 'var RECOVERY_COUNTS = [', '\n  ];', { label: 'RECOVERY_COUNTS' }) + '\n];\nreturn RECOVERY_COUNTS;')();
    const bad = [];
    expect(counts.length).toBe(7);
    for (const c of counts) {
      const s = by[c.species];
      if (!s) { bad.push(`${c.species}: no story`); continue; }
      // A Maine row reads the story's Maine line; the others read the rest.
      const text = c.where === 'maine' ? [s.maine, s.decline, s.result, s.action].join(' ') : [s.decline, s.result].join(' ');
      // Whole numbers only: "0" must not match the 0 inside 1960s.
      const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const has = (v) => (v === '1' ? /single pair/.test(text) : new RegExp('(^|[^0-9,.])' + esc(v) + '(?![0-9])').test(text));
      if (!has(c.then)) bad.push(`${c.species}/${c.where} then ${c.then}`);
      if (!has(c.now)) bad.push(`${c.species}/${c.where} now ${c.now}`);
      if (!text.includes(c.thenYear)) bad.push(`${c.species}/${c.where} year ${c.thenYear}`);
    }
    expect(bad).toEqual([]);
    expect(counts.map((c) => c.species)).not.toContain('Brown Pelican');
  });
});

describe('migration deep science', () => {
  it('gives the goose altitude the tracked record, as the other two mentions do', () => {
    // GPS-tracked Bar-headed Geese peaked at 7,290 m (about 23,900 ft) over
    // the Himalayas; "geese to 25,000+ ft" overstated it.
    const mig = sliceBetween(SRC, 'var MIGRATION_DEEP = [', '\n  ];', { label: 'MIGRATION_DEEP' });
    expect(mig).not.toMatch(/geese to 25,000/);
    expect(mig).toMatch(/Bar-headed Geese have been tracked crossing the Himalayas at nearly 24,000 ft/);
    expect(SRC).toMatch(/tracked as high as 23,900 ft \(7,290 m\)/);
  });
});

describe('habitats deep', () => {
  it('names current species, real laws and real places', () => {
    // Sharp-tailed Sparrow was split (AOU, 1995) into Saltmarsh + Nelson's;
    // Snowy Plover is a vagrant in Maine, not a beach bird; wetland filling
    // falls under the Natural Resources Protection Act; ice fishing happens
    // months after loons nest, while lead tackle kills adult loons.
    const hab = sliceBetween(SRC, 'var HABITATS_DEEP = [', '\n  ];', { label: 'HABITATS_DEEP' });
    expect(SRC).not.toMatch(/Sharp-tailed [Ss]parrow/);
    expect(hab).not.toMatch(/Snowy Plover/);
    expect(hab).not.toMatch(/Sanderling, sanderling/);
    expect(hab).not.toMatch(/Wetland Filling Act/);
    expect(hab).not.toMatch(/ice fishing/);
    expect(hab).not.toMatch(/sandhills/);
    expect(hab).toMatch(/Natural Resources Protection Act regulates filling \+ draining wetlands/);
    expect(hab).toMatch(/Lead fishing tackle, a leading killer of adult loons/);
    expect(hab).toMatch(/Kennebunk Plains sandplain grassland/);
    expect(SRC).toMatch(/key_species: 'Saltmarsh \+ Nelson\\'s Sparrows/);
  });
});

describe('hawkwatch + fall migration', () => {
  it('gives spring and fall their own winds, and hawks their real habits', () => {
    // Bradbury's own data: big spring days come on south or southwest winds,
    // so "strong southerly wind" is only bad in fall. Hawks ride thermals from
    // mid-morning and migrate mostly in silence.
    const guide = sliceBetween(SRC, 'var HAWKWATCH_GUIDE = [', '\n  ];', { label: 'HAWKWATCH_GUIDE' });
    const fall = sliceBetween(SRC, 'var FALL_MIGRATION_TIPS = [', '\n  ];', { label: 'FALL_MIGRATION_TIPS' });
    expect(guide).not.toMatch(/Strong southerly wind/);
    expect(guide).not.toMatch(/Best mornings after cold front/);
    expect(guide).toMatch(/Spring \(Bradbury\): warm S or SW winds/);
    expect(guide).toMatch(/Wind against the flight: southerly in fall, northerly in spring/);
    expect(guide).toMatch(/Hawks fly from mid-morning, once the sun builds thermals/);
    expect(fall).not.toMatch(/Hawks call frequently/);
    expect(fall).not.toMatch(/largest stopover area in Western Hemisphere/);
    expect(fall).toMatch(/Migrating hawks are mostly silent/);
    expect(fall).toMatch(/Semipalmated Sandpipers, fattening on tiny mud shrimp/);
  });
  it('keeps the Bradbury season the same in the guide and the data', () => {
    const guide = sliceBetween(SRC, 'var HAWKWATCH_GUIDE = [', '\n  ];', { label: 'HAWKWATCH_GUIDE' });
    const data = sliceBetween(SRC, 'var HAWKWATCH_DATA = [', '\n  ];', { label: 'HAWKWATCH_DATA' });
    const g = /Bradbury: (\w+ \d+) to (\w+ \d+)/.exec(guide);
    const d = /\((\w+ \d+)–(\w+ \d+)\)/.exec(data);
    expect(g && d).toBeTruthy();
    expect([g[1], g[2]]).toEqual([d[1], d[2]]);
    expect(data).toMatch(/south or southwest winds/);
    expect(data).toMatch(/northwest winds/);
  });
});

describe('climate + birds', () => {
  it('states range shifts and sea level at their measured rates', () => {
    // Hitch + Leberg (2007): northern range limits of southern species in
    // eastern North America moved north ~2.35 km a year (BBS, 1967-71 to
    // 1998-2002); "~50 km per decade" doubled it. NOAA's Portland gauge trend is
    // ~1.9 mm a year since 1912; "3-5 mm/year (~1 inch per decade)" contradicted
    // itself (3-5 mm a year is 1.2-2 inches a decade).
    const cli = sliceBetween(SRC, 'var CLIMATE_BIRDS = [', '\n  ];', { label: 'CLIMATE_BIRDS' });
    expect(cli).not.toMatch(/50 km north per decade/);
    expect(cli).not.toMatch(/3-5 mm\/year/);
    expect(cli).toMatch(/moved north about 2\.35 km \(1\.5 mi\) a year/);
    expect(cli).toMatch(/about 1\.9 mm a year since 1912 \(about 7\.5 inches a century\)/);
    // 1.9 mm x 100 years, in inches.
    expect((1.9 * 100) / 25.4).toBeCloseTo(7.5, 0);
  });
});

describe('monthly calendar + Maine numbers', () => {
  it('agrees with Spring Arrivals, and every stat reads as a whole sentence', () => {
    const monthly = sliceBetween(SRC, 'var MONTHLY_CALENDAR = [', '\n  ];', { label: 'MONTHLY_CALENDAR' });
    const arrivals = sliceBetween(SRC, 'var SPRING_ARRIVALS = [', '\n  ];', { label: 'SPRING_ARRIVALS' });
    const stats = sliceBetween(SRC, 'var MAINE_BIRD_STATS = [', '\n  ];', { label: 'MAINE_BIRD_STATS' });
    expect(arrivals).toMatch(/species: 'American Robin', date: 'Mid-March'/);
    expect(monthly).toMatch(/American Robins \(mid-March\)/);
    expect(arrivals).toMatch(/When lake ice breaks up/);
    expect(monthly).toMatch(/Loons return to lakes as the ice goes out/);
    expect(stats).not.toMatch(/Maine birding has grown'/);
    expect(stats).not.toMatch(/marine economy/);
  });
});

describe('mirror', () => {
  it('ships the same corrected source in the public mirror', () => {
    expect(MIRROR).toBe(SRC);
  });
});
