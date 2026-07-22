// Dino Lab golden master (stem_lab/stem_tool_dinolab.js).
//
// Pins (1) the registration contract, (2) the curated species + feature DATA,
// and (3) the SSR render of all 14 tabs under a fixed deterministic state, so
// the ~5k-line tool can be edited or decomposed with a safety net. A diff here
// means a behavior or data change — re-baseline deliberately with `vitest -u`
// ONLY when the change is reviewed and expected.
//
// It also permanently locks in the 8 paleontology fact-checks applied after the
// adversarial audit (Dimetrodon=Permian, the Orodromeus egg correction, etc.),
// so a future careless edit cannot silently revert them.

import { describe, it, expect, beforeAll } from 'vitest';
import { setupDinoLab, renderTab, baseData, meta, questState, internals, TABS } from './helpers/dino_lab_harness.js';

beforeAll(() => setupDinoLab());
const I = () => internals();

describe('Dino Lab — registration contract', () => {
  it('registers as dinoLab with metadata + quest hooks (snapshot)', () => {
    expect(meta()).toMatchSnapshot();
  });

  it('exposes exactly the 18 expected tabs as working renderers', () => {
    TABS.forEach(tab => {
      const html = renderTab(tab);
      expect(typeof html, tab).toBe('string');
      expect(html.length, tab).toBeGreaterThan(0);
    });
  });
});

describe('Dino Lab — data contract', () => {
  it('species roster (sorted ids) is pinned (snapshot)', () => {
    expect(I().DINOS.map(d => d.id).sort()).toMatchSnapshot();
  });

  it('dataset shape + distributions are pinned (snapshot)', () => {
    const D = I().DINOS;
    const tally = (key) => D.reduce((m, d) => { m[d[key]] = (m[d[key]] || 0) + 1; return m; }, {});
    expect({
      species: D.length,
      periods: I().PERIODS.length, clades: I().CLADES.length, extinctions: I().EXTINCTIONS.length,
      quiz: I().QUIZ.length, sites: I().SITES.length, glossary: I().GLOSSARY.length,
      records: I().RECORDS.length, people: I().PEOPLE.length,
      byPeriod: tally('period'), byDiet: tally('diet'), byGroup: tally('group'),
    }).toMatchSnapshot();
  });

  it('the Tyrannosaurus record is pinned (representative full entry, snapshot)', () => {
    expect(I().byId('tyrannosaurus')).toMatchSnapshot();
  });

  it('has no duplicate species ids', () => {
    const ids = I().DINOS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every cross-reference resolves (PERIODS.dinos, CLADES.examples, quiz answers)', () => {
    const ids = new Set(I().DINOS.map(d => d.id));
    I().PERIODS.forEach(p => (p.dinos || []).forEach(id => expect(ids.has(id), `PERIODS ${p.id} -> ${id}`).toBe(true)));
    I().CLADES.forEach(c => (c.examples || []).forEach(id => expect(ids.has(id), `CLADES ${c.id} -> ${id}`).toBe(true)));
    I().QUIZ.forEach(q => expect(q.answer >= 0 && q.answer < q.options.length, `QUIZ ${q.id}`).toBe(true));
  });

  it('every species has the full schema with sane values', () => {
    const strFields = ['name', 'common', 'say', 'meaning', 'group', 'clade', 'diet', 'period', 'epoch', 'region', 'formation', 'namedBy', 'blurb', 'uncertain', 'howKnow'];
    const groups = new Set(['theropod', 'sauropod', 'ornithischian', 'other']);
    const diets = new Set(['carnivore', 'herbivore', 'omnivore', 'piscivore', 'insectivore']);
    const periods = new Set(['permian', 'triassic', 'jurassic', 'cretaceous', 'paleogene']);
    I().DINOS.forEach(d => {
      strFields.forEach(f => expect(typeof d[f] === 'string' && d[f].length > 0, `${d.id}.${f}`).toBe(true));
      expect(groups.has(d.group), `${d.id} group`).toBe(true);
      expect(diets.has(d.diet), `${d.id} diet`).toBe(true);
      expect(periods.has(d.period), `${d.id} period`).toBe(true);
      expect(d.myaHi >= d.myaLo, `${d.id} mya order`).toBe(true);
      expect(Array.isArray(d.traits) && d.traits.length > 0, `${d.id} traits`).toBe(true);
      expect(Array.isArray(d.facts) && d.facts.length > 0, `${d.id} facts`).toBe(true);
      expect(d.named >= 1820 && d.named <= 2026, `${d.id} named year`).toBe(true);
    });
  });

  it('every species carries a scientific-integrity pair (how we know + what is uncertain)', () => {
    I().DINOS.forEach(d => {
      expect(d.howKnow.length, `${d.id} howKnow`).toBeGreaterThan(10);
      expect(d.uncertain.length, `${d.id} uncertain`).toBeGreaterThan(10);
    });
  });
});

describe('Dino Lab — audit fact-checks stay fixed (regression lock)', () => {
  it('Dimetrodon is Permian, not Triassic (and stays a non-dinosaur foil)', () => {
    const d = I().byId('dimetrodon');
    expect(d.period).toBe('permian');
    expect(d.group).toBe('other');
  });
  it('Sinosauropteryx etymology uses the -saur- = lizard root', () => {
    expect(I().byId('sinosauropteryx').meaning).toBe('Chinese lizard wing');
  });
  it('Tornieria is authored 1911 (Sternfeld replacement name)', () => {
    expect(I().byId('tornieria').named).toBe(1911);
  });
  it('Becklespinax is an indeterminate allosauroid, not a carcharodontosaur', () => {
    expect(I().byId('becklespinax').clade).toMatch(/allosauroid/i);
  });
  it('Orodromeus no longer claims it laid the spiral eggs (reassigned to Troodon)', () => {
    const d = I().byId('orodromeus');
    const text = (d.blurb + ' ' + d.facts.join(' ') + ' ' + d.uncertain).toLowerCase();
    expect(text).not.toMatch(/neat spirals|carefully arranged eggs/);
    expect(text).toMatch(/troodon/);
  });
  it('Tianyulong / Australovenator / Manidens / Haya ages are corrected + consistent', () => {
    expect(I().byId('tianyulong').epoch).toBe('Late Jurassic');
    expect(I().byId('australovenator').epoch).toBe('Late Cretaceous');
    expect(I().byId('manidens').epoch).toBe('Early Jurassic');
    expect(I().byId('haya').myaHi).toBe(86);
  });
});

describe('Dino Lab — render per tab (golden master)', () => {
  TABS.forEach(tab => {
    it(`renders the ${tab} tab (snapshot)`, () => {
      expect(renderTab(tab)).toMatchSnapshot();
    });
  });

  it('every tab renders deterministically (identical output twice)', () => {
    TABS.forEach(tab => {
      expect(renderTab(tab), tab).toBe(renderTab(tab));
    });
  });
});

describe('Dino Lab — render invariants (the science a student actually sees)', () => {
  it('the explore detail card shows what we know AND what is uncertain', () => {
    const html = renderTab('explore');
    expect(html).toMatch(/How we know/);
    expect(html).toMatch(/not sure about/);
    expect(html).toMatch(/tyrant lizard king/); // T. rex meaning
  });

  it('the Dimetrodon detail is labeled Permian, not Triassic (the foil lesson)', () => {
    const d = baseData('explore');
    d.selected = 'dimetrodon';
    d.query = 'dimetrodon';
    const html = renderTab(d);
    expect(html).toMatch(/Permian/);
    expect(html).not.toMatch(/Triassic · /);
  });

  it('the Bird Link tab teaches that birds are dinosaurs and lists feathered species', () => {
    const html = renderTab('birds');
    expect(html).toMatch(/Birds ARE dinosaurs/);
    expect(html).toMatch(/Microraptor/);
  });

  it('the Ecosystems tab groups a real formation into hunters and plant-eaters', () => {
    const html = renderTab('ecosystem');
    expect(html).toMatch(/Morrison Formation/);
    expect(html).toMatch(/Hunters/);
    expect(html).toMatch(/Plant-eaters/);
  });

  it('Field Notes corrects the "all dinosaurs died out" myth', () => {
    expect(renderTab('notes')).toMatch(/Birds are dinosaurs/i);
  });

  it('the Ecosystems tab shows an energy pyramid (producers -> consumers -> apex)', () => {
    const html = renderTab('ecosystem');
    expect(html).toMatch(/Energy pyramid/);
    expect(html).toMatch(/producers/i);
    expect(html).toMatch(/apex predator/i);
  });

  it('the species detail card offers a printable trading card', () => {
    const html = renderTab('explore');
    expect(html).toMatch(/Print a trading card/); // aria-label on the button
    expect(html).toMatch(/🖨️ Card/);
  });

  it('the 3D Field Station explains reconstruction layers and uncertainty', () => {
    const html = renderTab('field3d');
    expect(html).toMatch(/3D Field Station/);
    expect(html).toMatch(/Skeleton proxy/);
    expect(html).toMatch(/Body outline/);
    expect(html).toMatch(/Human scale/);
    expect(html).toMatch(/Inference boundary/);
    expect(html).toMatch(/Reconstruction challenge/);
    expect(html).toMatch(/Length 12.3 m/);
    expect(html).toMatch(/Mass 8.4 t/);
    expect(html).toMatch(/Case 1\/3/);
    expect(html).toMatch(/Full model/);
    expect(html).toMatch(/Fossil anchors/);
    expect(html).toMatch(/Scale check/);
    expect(html).toMatch(/Visual key/);
    expect(html).toMatch(/Current 3D camera view/);
    expect(html).toMatch(/Camera view loading/);
    expect(html).toMatch(/Pause spin/);
    expect(html).toMatch(/Front/);
    expect(html).toMatch(/Side/);
    expect(html).toMatch(/Overhead/);
    expect(html).toMatch(/Reset view/);
    expect(html).toMatch(/Body inference 28%/);
    expect(html).toMatch(/aria-label="Body inference opacity"/);
    expect(html).toMatch(/aria-valuetext="28 percent"/);
    expect(html).toMatch(/dino3d-viewer-desc-tyrannosaurus/);
    expect(html).toMatch(/aria-describedby="dino3d-viewer-desc-tyrannosaurus dino3d-status-tyrannosaurus"/);
    expect(html).toMatch(/T\. rex 3D model summary/);
    expect(html).toMatch(/Visible layers: skeleton proxy, body outline, human scale, evidence markers/);
    expect(html).toMatch(/Keyboard controls: Left and Right Arrow or A and D rotate; Up and Down Arrow raise or lower the camera; Page Up and Page Down zoom; Home resets the view/);
    expect(html).toMatch(/Height guide/);
    expect(html).toMatch(/Gold vertical staff marks estimated standing height with one-meter ticks/);
    expect(html).toMatch(/five-meter labels, and the full estimated length/);
    expect(html).toMatch(/five-meter labels, and the full estimated height/);
    expect(html).toMatch(/Survey compass/);
    expect(html).toMatch(/Amber boundary ropes and north arrow orient the reconstruction inside its excavation grid/);
    expect(html).toMatch(/White rods, vertebrae, rib loops, pelvis, and joints show the inferred bone layout/);
    expect(html).toMatch(/Skull, spine, pelvis, and tail callouts keep the main landmarks easy to follow/);
    expect(html).toMatch(/brow bosses, beaks/);
    expect(html).toMatch(/thumb spikes, or feather fans/);
    expect(html).toMatch(/thin contour mesh show estimated soft-tissue volume around the visible skeleton/);
    expect(html).toMatch(/role="status"/);
    expect(html).toMatch(/aria-atomic="true"/);
    expect(html).toMatch(/role="progressbar"/);
    expect(html).toMatch(/aria-label="Fossil assembly progress"/);
    expect(html).toMatch(/aria-label="Claim strength"/);
    expect(html).toMatch(/aria-label="Reconstruction challenge progress"/);
    expect(html).toMatch(/aria-valuenow="0"/);
    expect(html).toMatch(/Skull scan anchor, not logged, current focus/);
    expect(html).toMatch(/Skull fossil, locked until field scan is complete/);
    expect(html).toMatch(/Anchor label/);
    expect(html).toMatch(/Logged anchor/);
    expect(html).toMatch(/Scan focus/);
    expect(html).toMatch(/Target: Skull anchor/);
    expect(html).toMatch(/Next scan target/);
    expect(html).toMatch(/Evidence log 0\/3/);
    expect(html).toMatch(/Logged 0\/3/);
    expect(html).toMatch(/Path 0\/2/);
    expect(html).toMatch(/Evidence path 0\/2 linked/);
    expect(html).toMatch(/Next open: Skull/);
    expect(html).toMatch(/Log observation/);
    expect(html).toMatch(/3D fossil assembly puzzle/);
    expect(html).toMatch(/Assembly 0\/6/);
    expect(html).toMatch(/Complete field scan to unlock/);
    expect(html).toMatch(/Finish scan first/);
    expect(html).toMatch(/Focus: Skull - feeding and senses/);
    expect(html).toMatch(/Anatomy insights 0\/6/);
    expect(html).toMatch(/Place fossils to turn anatomy into reasoning evidence/);
    expect(html).toMatch(/Claim coach: Skull supports Function claims/);
    expect(html).toMatch(/Place before claim/);
    expect(html).toMatch(/Assembly piece/);
    expect(html).toMatch(/Claim evidence/);
    expect(html).toMatch(/Teal halo and connector line mark the assembled fossil currently attached to the CER claim/);
    expect(html).toMatch(/Field claim builder/);
    expect(html).toMatch(/Function/);
    expect(html).toMatch(/Claim strength 0\/5 \| Start scanning/);
    expect(html).toMatch(/CER rehearsal \| Checklist 1\/5/);
    expect(html).toMatch(/Log skull, shoulder, or hip anchors before citing evidence/);
    expect(html).toMatch(/Log at least one anchor before writing a claim/);
    expect(html).toMatch(/Scan more for a stronger claim/);
    expect(html).toMatch(/Claim/);
    expect(html).toMatch(/Evidence/);
    expect(html).toMatch(/Reasoning/);
    expect(html).toMatch(/Length guide/);
    expect(html).toMatch(/Evidence/);
    expect(html).toMatch(/Inference/);
    expect(html).toMatch(/Uncertainty/);
  });

  it('the Dig Site exposes reviewable grid and guess state semantics', () => {
    const html = renderTab('dig');
    expect(html).toMatch(/role="group" aria-label="Dig grid with 4 rows and 6 columns/);
    expect(html).toMatch(/role="status" aria-live="polite" aria-atomic="true"/);
    expect(html).toMatch(/Cell 1, row 1, column 1, bone fragment uncovered/);
    expect(html).toMatch(/Cell 4, row 1, column 4, unopened rock\. Press to dig/);
    expect(html).toMatch(/aria-disabled="true"/);
    expect(html).toMatch(/aria-disabled="false"/);
    expect(html).toMatch(/aria-label="Identify the find choices"/);
    expect(html).toMatch(/aria-pressed="false"/);
  });
  it('the section tabs use roving focus and Explore controls expose named groups', () => {
    const html = renderTab('explore');
    expect(html).toMatch(/role="tablist" aria-label="Dino Lab sections" aria-orientation="horizontal"/);
    expect(html).toMatch(/nav aria-label="Dino Lab section navigation"/);
    expect(html).toMatch(/class="dinolab-section-cue"/);
    expect(html).toMatch(/data-tab-group="Discover"/);
    expect(html).toMatch(/id="dinotab-explore" role="tab"[^>]*tabindex="0" aria-selected="true"/);
    expect(html).toMatch(/id="dinotab-timeline" role="tab"[^>]*tabindex="-1" aria-selected="false"/);
    expect(html).toMatch(/aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"/);
    expect(html).toMatch(/role="group" aria-label="Filter by geological period"/);
    expect(html).toMatch(/role="group" aria-label="Filter by diet"/);
    expect(html).toMatch(/role="group" aria-label="Filter by location"/);
    expect(html).toMatch(/role="group" aria-label="Sort dinosaurs"/);
    expect(html).toMatch(/class="dinolab-explore-layout"/);
    expect(html).toMatch(/button:focus-visible/);
  });

  it('recovers an unknown persisted tab with a valid Explore tab-panel label', () => {
    const data = baseData('unknown-stale-tab');
    const html = renderTab(data);
    expect(html).toMatch(/id="dinotab-explore" role="tab"[^>]*tabindex="0" aria-selected="true"/);
    expect(html).toMatch(/id="dinopanel" role="tabpanel" aria-labelledby="dinotab-explore"/);
    expect(html).not.toMatch(/aria-labelledby="dinotab-unknown-stale-tab"/);
  });
  it('the Quiz and Classify feedback keeps answered choices reviewable', () => {
    const quiz = renderTab('quiz');
    expect(quiz).toMatch(/aria-disabled="true"/);
    expect(quiz).toMatch(/aria-pressed="true"/);
    expect(quiz).toMatch(/, correct answer"/);
    expect(quiz).toMatch(/, selected incorrect answer"/);
    expect(quiz).toMatch(/role="status" aria-live="polite" aria-atomic="true"/);

    const classify = renderTab('classify');
    expect(classify).toMatch(/aria-disabled="true"/);
    expect(classify).toMatch(/aria-pressed="true"/);
    expect(classify).toMatch(/, correct answer"/);
    expect(classify).toMatch(/, selected incorrect answer"/);
    expect(classify).toMatch(/role="status" aria-live="polite" aria-atomic="true"/);
  });
  it('the 3D field station identifies the next open scan anchor', () => {
    const data = baseData('field3d');
    data.field3dScanLogged = { skull: true };
    data.field3dScanSpecies = 'tyrannosaurus';
    const html = renderTab(data);
    expect(html).toMatch(/Evidence log 1\/3/);
    expect(html).toMatch(/Logged 1\/3/);
    expect(html).toMatch(/Path 0\/2/);
    expect(html).toMatch(/Claim strength 1\/5 \| Anchor evidence/);
    expect(html).toMatch(/CER rehearsal \| Checklist 2\/5/);
    expect(html).toMatch(/Logged anchors: Skull; evidence path 0\/2 linked/);
    expect(html).toMatch(/Next open: Shoulder/);
  });
  it('the 3D field station links consecutive logged scan anchors', () => {
    const data = baseData('field3d');
    data.field3dScanLogged = { skull: true, shoulder: true };
    data.field3dScanSpecies = 'tyrannosaurus';
    const html = renderTab(data);
    expect(html).toMatch(/Evidence log 2\/3/);
    expect(html).toMatch(/Logged 2\/3/);
    expect(html).toMatch(/Path 1\/2/);
    expect(html).toMatch(/Claim strength 3\/5 \| Connected evidence/);
    expect(html).toMatch(/CER rehearsal \| Checklist 3\/5/);
    expect(html).toMatch(/Logged anchors: Skull, Shoulder; evidence path 1\/2 linked/);
    expect(html).toMatch(/Evidence path 1\/2 linked/);
    expect(html).toMatch(/Next open: Hip/);
  });
  it('the 3D field station tracks completed scan observations', () => {
    const data = baseData('field3d');
    data.field3dScanLogged = { skull: true, shoulder: true, hip: true };
    data.field3dScanSpecies = 'tyrannosaurus';
    const html = renderTab(data);
    expect(html).toMatch(/Evidence log 3\/3/);
    expect(html).toMatch(/Logged 3\/3/);
    expect(html).toMatch(/Path 2\/2/);
    expect(html).toMatch(/Claim strength 5\/5 \| CER ready/);
    expect(html).toMatch(/CER rehearsal \| Checklist 4\/5/);
    expect(html).toMatch(/Done Reasoning backed/);
    expect(html).toMatch(/Evidence path 2\/2 linked/);
    expect(html).toMatch(/Field scan complete/);
    expect(html).toMatch(/Assembly 0\/6/);
    expect(html).toMatch(/Place fossils into sockets/);
    expect(html).toMatch(/Field scan complete: all fossil pieces are cataloged for assembly/);
    expect(html).toMatch(/Anatomy insights 0\/6/);
    expect(html).toMatch(/Need Anatomy support/);
    expect(html).toMatch(/Assemble at least one fossil to add anatomy support/);
    expect(html).toMatch(/Place fossil/);
    expect(html).toMatch(/Ready for CER/);
    expect(html).toMatch(/Observation logged/);
  });
  it('the 3D fossil assembly puzzle tracks placed anatomy pieces', () => {
    const data = baseData('field3d');
    data.field3dScanLogged = { skull: true, shoulder: true, hip: true };
    data.field3dScanSpecies = 'tyrannosaurus';
    data.field3dAssemblyPlaced = { skull: true, spine: true };
    data.field3dAssemblySpecies = 'tyrannosaurus';
    data.field3dAssemblyFocusIdx = 1;
    data.field3dClaimFocus = 'posture';
    data.field3dClaimBone = 'spine';
    data.field3dClaimBoneSpecies = 'tyrannosaurus';
    const html = renderTab(data);
    expect(html).toMatch(/Assembly 2\/6/);
    expect(html).toMatch(/Place fossils into sockets/);
    expect(html).toMatch(/Placed Skull/);
    expect(html).toMatch(/Placed Spine/);
    expect(html).toMatch(/Focus: Spine - posture and balance/);
    expect(html).toMatch(/Anatomy insights 2\/6/);
    expect(html).toMatch(/Skull: feeding and senses/);
    expect(html).toMatch(/Spine: posture and balance/);
    expect(html).toMatch(/Claim coach: Spine supports Posture claims/);
    expect(html).toMatch(/Evidence focus: Spine - posture and balance \| Posture claim/);
    expect(html).toMatch(/Focused fossil: Spine - posture and balance/);
    expect(html).toMatch(/focused fossil keeps the claim tied to a named anatomy clue/);
    expect(html).toMatch(/Claim Spine/);
    expect(html).toMatch(/Trail Spine -&gt; Shoulder/);
    expect(html).toMatch(/Claim evidence highlighted: Spine/);
    expect(html).toMatch(/Evidence trail: Spine to Shoulder anchor/);
    expect(html).toMatch(/Evidence trail: Shoulder scan -&gt; Spine fossil -&gt; Posture claim/);
    expect(html).toMatch(/trail shows how an observed scan anchor supports the named fossil evidence/);
    expect(html).toMatch(/Use in claim/);
    expect(html).toMatch(/CER rehearsal \| Checklist 5\/5/);
    expect(html).toMatch(/Done Anatomy support/);
    expect(html).toMatch(/Anatomy insights: Skull - feeding and senses; Spine - posture and balance/);
    expect(html).toMatch(/The assembled anatomy turns isolated bones into a connected body-system explanation/);
    expect(html).toMatch(/Fossil placed/);
    expect(html).toMatch(/Next fossil/);
  });
  it('the 3D fossil assembly puzzle celebrates a completed skeleton', () => {
    const data = baseData('field3d');
    data.field3dScanLogged = { skull: true, shoulder: true, hip: true };
    data.field3dScanSpecies = 'tyrannosaurus';
    data.field3dAssemblyPlaced = { skull: true, spine: true, ribs: true, pelvis: true, hindlimb: true, tail: true };
    data.field3dAssemblySpecies = 'tyrannosaurus';
    const html = renderTab(data);
    expect(html).toMatch(/Assembly 6\/6/);
    expect(html).toMatch(/Skeleton assembled/);
    expect(html).toMatch(/Anatomy insights 6\/6/);
    expect(html).toMatch(/Tail: counterbalance/);
    expect(html).toMatch(/Done Anatomy support/);
    expect(html).toMatch(/Anatomy puzzle complete/);
    expect(html).toMatch(/hindlimb, and tail now support a stronger reconstruction claim/);
  });
  it('the 3D field station ignores stale scan observations from another species', () => {
    const data = baseData('field3d');
    data.field3dSelected = 'tyrannosaurus';
    data.field3dScanLogged = { skull: true, shoulder: true, hip: true };
    data.field3dScanSpecies = 'triceratops';
    const html = renderTab(data);
    expect(html).toMatch(/Evidence log 0\/3/);
    expect(html).toMatch(/Logged 0\/3/);
    expect(html).toMatch(/Path 0\/2/);
    expect(html).toMatch(/Evidence path 0\/2 linked/);
    expect(html).toMatch(/Next open: Skull/);
    expect(html).toMatch(/Log observation/);
    expect(html).toMatch(/3D fossil assembly puzzle/);
    expect(html).toMatch(/Assembly 0\/6/);
    expect(html).toMatch(/Complete field scan to unlock/);
    expect(html).toMatch(/Finish scan first/);
    expect(html).toMatch(/Focus: Skull - feeding and senses/);
    expect(html).toMatch(/Anatomy insights 0\/6/);
    expect(html).toMatch(/Place fossils to turn anatomy into reasoning evidence/);
    expect(html).toMatch(/Claim coach: Skull supports Function claims/);
    expect(html).toMatch(/Place before claim/);
    expect(html).toMatch(/Assembly piece/);
    expect(html).toMatch(/Claim evidence/);
    expect(html).toMatch(/Teal halo and connector line mark the assembled fossil currently attached to the CER claim/);
    expect(html).toMatch(/Field claim builder/);
    expect(html).toMatch(/Function/);
    expect(html).toMatch(/Claim strength 0\/5 \| Start scanning/);
    expect(html).toMatch(/CER rehearsal \| Checklist 1\/5/);
    expect(html).toMatch(/Log skull, shoulder, or hip anchors before citing evidence/);
    expect(html).toMatch(/Log at least one anchor before writing a claim/);
    expect(html).toMatch(/Scan more for a stronger claim/);
    expect(html).toMatch(/Claim/);
    expect(html).toMatch(/Evidence/);
    expect(html).toMatch(/Reasoning/);
    expect(html).not.toMatch(/Field scan complete/);
  });
  it('the 3D fossil assembly puzzle ignores stale placements from another species', () => {
    const data = baseData('field3d');
    data.field3dSelected = 'tyrannosaurus';
    data.field3dScanLogged = { skull: true, shoulder: true, hip: true };
    data.field3dScanSpecies = 'tyrannosaurus';
    data.field3dAssemblyPlaced = { skull: true, spine: true, ribs: true, pelvis: true, hindlimb: true, tail: true };
    data.field3dAssemblySpecies = 'triceratops';
    data.field3dClaimFocus = 'posture';
    data.field3dClaimBone = 'spine';
    data.field3dClaimBoneSpecies = 'triceratops';
    const html = renderTab(data);
    expect(html).toMatch(/Assembly 0\/6/);
    expect(html).toMatch(/Place fossils into sockets/);
    expect(html).toMatch(/Place Skull/);
    expect(html).not.toMatch(/Evidence focus: Spine/);
    expect(html).not.toMatch(/Focused fossil: Spine/);
    expect(html).not.toMatch(/Claim Spine/);
    expect(html).not.toMatch(/Trail Spine/);
    expect(html).not.toMatch(/Claim evidence highlighted: Spine/);
    expect(html).not.toMatch(/Evidence trail: Spine to Shoulder anchor/);
    expect(html).not.toMatch(/Evidence trail: Shoulder scan/);
    expect(html).not.toMatch(/Anatomy puzzle complete/);
  });
  it('the 3D field station reveals when scan markers are hidden', () => {
    const data = baseData('field3d');
    data.field3dShowEvidence = false;
    const html = renderTab(data);
    expect(html).toMatch(/Scan markers hidden/);
    expect(html).toMatch(/Show scan markers/);
  });
  it('the 3D field station can focus another evidence anchor', () => {
    const data = baseData('field3d');
    data.field3dScanTargetIdx = 1;
    const html = renderTab(data);
    expect(html).toMatch(/Target: Shoulder anchor/);
    expect(html).toMatch(/Compare shoulder position/);
  });
  it('the 3D field station can render with auto spin paused', () => {
    const data = baseData('field3d');
    data.field3dAutoRotate = false;
    const html = renderTab(data);
    expect(html).toMatch(/Auto spin/);
    expect(html).toMatch(/Anchor label/);
    expect(html).toMatch(/Logged anchor/);
    expect(html).toMatch(/Scan focus/);
    expect(html).toMatch(/Target: Skull anchor/);
    expect(html).toMatch(/Next scan target/);
    expect(html).toMatch(/Evidence log 0\/3/);
    expect(html).toMatch(/Logged 0\/3/);
    expect(html).toMatch(/Path 0\/2/);
    expect(html).toMatch(/Evidence path 0\/2 linked/);
    expect(html).toMatch(/Next open: Skull/);
    expect(html).toMatch(/Log observation/);
    expect(html).toMatch(/3D fossil assembly puzzle/);
    expect(html).toMatch(/Assembly 0\/6/);
    expect(html).toMatch(/Complete field scan to unlock/);
    expect(html).toMatch(/Finish scan first/);
    expect(html).toMatch(/Focus: Skull - feeding and senses/);
    expect(html).toMatch(/Anatomy insights 0\/6/);
    expect(html).toMatch(/Place fossils to turn anatomy into reasoning evidence/);
    expect(html).toMatch(/Claim coach: Skull supports Function claims/);
    expect(html).toMatch(/Place before claim/);
    expect(html).toMatch(/Assembly piece/);
    expect(html).toMatch(/Claim evidence/);
    expect(html).toMatch(/Teal halo and connector line mark the assembled fossil currently attached to the CER claim/);
    expect(html).toMatch(/Field claim builder/);
    expect(html).toMatch(/Function/);
    expect(html).toMatch(/Claim strength 0\/5 \| Start scanning/);
    expect(html).toMatch(/CER rehearsal \| Checklist 1\/5/);
    expect(html).toMatch(/Log skull, shoulder, or hip anchors before citing evidence/);
    expect(html).toMatch(/Log at least one anchor before writing a claim/);
    expect(html).toMatch(/Scan more for a stronger claim/);
    expect(html).toMatch(/Claim/);
    expect(html).toMatch(/Evidence/);
    expect(html).toMatch(/Reasoning/);
  });
  it('the 3D field station can switch claim-builder focus', () => {
    const data = baseData('field3d');
    data.field3dClaimFocus = 'uncertainty';
    const html = renderTab(data);
    expect(html).toMatch(/One part of the reconstruction should stay tentative/);
    expect(html).toMatch(/Good science separates observed fossils/);
  });
  it('the 3D field station can switch claim-builder focus to function', () => {
    const data = baseData('field3d');
    data.field3dScanLogged = { skull: true, shoulder: true, hip: true };
    data.field3dScanSpecies = 'tyrannosaurus';
    data.field3dAssemblyPlaced = { skull: true, ribs: true, hindlimb: true };
    data.field3dAssemblySpecies = 'tyrannosaurus';
    data.field3dClaimFocus = 'function';
    const html = renderTab(data);
    expect(html).toMatch(/Function/);
    expect(html).toMatch(/anatomy can support a function claim/);
    expect(html).toMatch(/Use assembled fossils as body-system evidence/);
    expect(html).toMatch(/Function claims are strongest/);
  });
  it('the 3D reconstruction challenge shows answer feedback', () => {
    const data = baseData('field3d');
    data.field3dChallengePicked = 'inference';
    data.field3dChallengeScore = 0;
    data.field3dChallengeDone = 1;
    const html = renderTab(data);
    expect(html).toMatch(/Not quite/);
    expect(html).toMatch(/Evidence is the fossil material/);
    expect(html).toMatch(/Next challenge/);
  });
  it('the Timeline and Compare visual bars expose named numeric semantics', () => {
    const timeline = renderTab('timeline');
    expect(timeline).toMatch(/role="progressbar"/);
    expect(timeline).toMatch(/duration on the Mesozoic timeline/);
    expect(timeline).toMatch(/lasted about \d+ million years/);
    expect(timeline).toMatch(/aria-valuemax="229"/);

    const compare = renderTab('compare');
    expect(compare).toMatch(/Length comparison value/);
    expect(compare).toMatch(/Height comparison value/);
    expect(compare).toMatch(/Mass comparison value/);
    expect(compare).toMatch(/Top speed estimate comparison value/);
    expect(compare).toMatch(/on a logarithmic scale/);
    expect(compare).toMatch(/of the comparison scale/);
    expect(compare).toMatch(/Time ranges overlap around/);
  });

  it('the Deep Time tab places the cosmic-calendar milestones correctly', () => {
    const html = renderTab('deeptime');
    expect(html).toMatch(/Deep time/);
    expect(html).toMatch(/role="img" aria-label="Compressed Earth history timeline/);
    expect(html).toMatch(/December 13/); // first dinosaurs on the 1-year scale
    expect(html).toMatch(/December 26/); // the K-Pg asteroid
    expect(html).toMatch(/Homo sapiens/); // humans appear in the last sliver
  });

  it('the Map tab plots all seven continents and gives the honest Pangaea caveat', () => {
    const html = renderTab('map');
    ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Australia', 'Antarctica'].forEach(c => expect(html, c).toMatch(new RegExp(c)));
    expect(html).toMatch(/Pangaea/);
    expect(html).toMatch(/dug up today/i); // distinguishes where-found-today from where-they-lived
  });

  it('the Classroom tab offers a printable card deck and a quiz worksheet', () => {
    const html = renderTab('classroom');
    expect(html).toMatch(/Species card deck/);
    expect(html).toMatch(/Print .* cards/);
    expect(html).toMatch(/Quiz worksheet/);
    expect(html).toMatch(/answer key/i);
  });
});

describe('Dino Lab — quest hooks', () => {
  it('start empty, then complete with the matching progress state (snapshot)', () => {
    const empty = questState({});
    const done = questState({ seen: { a: 1, b: 1, c: 1, d: 1, e: 1 }, digsSolved: 2, quizCorrect: 6, compareA: 'x', compareB: 'y' });
    expect({ empty, done }).toMatchSnapshot();
  });
});
