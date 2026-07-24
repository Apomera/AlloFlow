/**
 * stem_tool_dinolab.js — Dino Lab (Paleontology Studio)
 *
 * An interactive paleontology lab for exploring dinosaurs and the science
 * behind them. Tabs: Explore, Timeline, Sites, Compare, 3D Field Station,
 * Dig Site, Classify, Extinction, Anatomy, Records, Quiz, Field Notes,
 * Glossary.
 *
 * Scientific-integrity stance: every species carries an "uncertain" note
 * (color, feathering, behavior, and speed are usually inferred, not observed)
 * and a "how we know" note. Field Notes corrects popular myths. Numbers are
 * widely-cited estimates, flagged as estimates where it matters.
 *
 * Registered tool ID: "dinoLab"
 * Registry: window.StemLab.registerTool()
 */
// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};

(function () {
  'use strict';

  // ── Theme tokens (STEM Lab CSS custom properties, dark fallbacks) ──
  var T = {
    canvas: 'var(--allo-stem-canvas, #0f172a)',
    panel: 'var(--allo-stem-panel, #1e293b)',
    deeper: 'var(--allo-stem-deeper, #0b1220)',
    border: 'var(--allo-stem-border, #334155)',
    text: 'var(--allo-stem-text, #f1f5f9)',
    soft: 'var(--allo-stem-text-soft, #94a3b8)'
  };

  var PERIOD_COLOR = { permian: '#e11d48', triassic: '#a855f7', jurassic: '#0ea5e9', cretaceous: '#22c55e', paleogene: '#f59e0b' };
  var DIET_COLOR = { carnivore: '#ef4444', herbivore: '#22c55e', omnivore: '#f59e0b', piscivore: '#38bdf8', insectivore: '#a78bfa' };
  var DIET_ICON = { carnivore: '🥩', herbivore: '🌿', omnivore: '🍴', piscivore: '🐟', insectivore: '🐛' };
  var GROUP_LABEL = { theropod: 'Theropod', sauropod: 'Sauropodomorph', ornithischian: 'Ornithischian', other: 'Close relative' };

  // ── Species database (grows below; schema: id,name,common,say,meaning,
  // group,clade,diet,period,epoch,myaHi,myaLo,lengthM,heightM,weightKg,
  // speedKmh,region,formation,named,namedBy,blurb,traits,facts,uncertain,howKnow) ──
  var DINOS = [
    { id: 'tyrannosaurus', name: 'Tyrannosaurus rex', common: 'T. rex', say: 'tie-RAN-uh-SOR-us rex', meaning: 'tyrant lizard king', group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore', period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66, lengthM: 12.3, heightM: 3.7, weightKg: 8400, speedKmh: 20, region: 'North America', formation: 'Hell Creek', named: 1905, namedBy: 'Henry Fairfield Osborn', blurb: 'One of the largest land predators ever, with a bite force estimated near 35,000 newtons, the strongest of any known land animal.', traits: ['Banana-sized teeth', 'Tiny but strong arms', 'Forward-facing eyes (good depth perception)'], facts: ['The specimen "Sue" is about 90 percent complete.', 'Juveniles were slender and probably fast; adults were bulkier.'], uncertain: 'Top speed is estimated from leg bones and muscle models, not measured. Feather extent is debated.', howKnow: 'Dozens of partial skeletons, including "Sue" and "Stan", plus bite marks on other bones.' },
    { id: 'triceratops', name: 'Triceratops horridus', common: 'Triceratops', say: 'try-SERR-uh-tops', meaning: 'three-horned face', group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore', period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66, lengthM: 8, heightM: 3, weightKg: 8000, speedKmh: 25, region: 'North America', formation: 'Hell Creek', named: 1889, namedBy: 'Othniel Charles Marsh', blurb: 'A massive horned dinosaur with a bony neck frill and three facial horns, sharing its world with T. rex.', traits: ['Two long brow horns and one nose horn', 'Solid bony frill', 'Beak plus shearing tooth batteries'], facts: ['Hundreds of skulls are known.', 'The frill and horns may have signaled to rivals and mates as much as defended.'], uncertain: 'Whether the frill was mainly for defense, display, or species recognition is argued. Torosaurus may be a mature Triceratops.', howKnow: 'Abundant skulls and skeletons across the American West.' },
    { id: 'velociraptor', name: 'Velociraptor mongoliensis', common: 'Velociraptor', say: 'vel-OSS-ih-RAP-tor', meaning: 'swift thief', group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore', period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71, lengthM: 1.8, heightM: 0.5, weightKg: 15, speedKmh: 40, region: 'Asia (Mongolia)', formation: 'Djadochta', named: 1924, namedBy: 'Henry Fairfield Osborn', blurb: 'A turkey-sized feathered predator with a sickle claw on each foot, far smaller than the movie version.', traits: ['Retractable sickle claw', 'Feathered arms with quill knobs', 'Long stiffened tail'], facts: ['The "Fighting Dinosaurs" fossil preserves it locked with a Protoceratops.', 'Quill knobs on the forearm confirm feathers.'], uncertain: 'It could not fly; the feathers were for insulation and display. Pack-hunting is suggested but not proven.', howKnow: 'Several skulls and skeletons, including the Fighting Dinosaurs specimen.' },
    { id: 'stegosaurus', name: 'Stegosaurus stenops', common: 'Stegosaurus', say: 'STEG-uh-SOR-us', meaning: 'roofed lizard', group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore', period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 145, lengthM: 9, heightM: 4, weightKg: 3500, speedKmh: 7, region: 'North America', formation: 'Morrison', named: 1877, namedBy: 'Othniel Charles Marsh', blurb: 'A plated plant-eater with a famously small brain and a spiked tail weapon called a thagomizer.', traits: ['Two rows of tall back plates', 'Four tail spikes (the thagomizer)', 'Tiny head'], facts: ['The plates were rich in blood vessels.', 'Tail-spike injuries are found on Allosaurus bones.'], uncertain: 'Plate arrangement and their main function are still debated.', howKnow: 'Many skeletons from the Morrison Formation.' },
    { id: 'brachiosaurus', name: 'Brachiosaurus altithorax', common: 'Brachiosaurus', say: 'BRACK-ee-uh-SOR-us', meaning: 'arm lizard', group: 'sauropod', clade: 'Brachiosauridae', diet: 'herbivore', period: 'jurassic', epoch: 'Late Jurassic', myaHi: 154, myaLo: 150, lengthM: 22, heightM: 12, weightKg: 35000, speedKmh: 16, region: 'North America', formation: 'Morrison', named: 1903, namedBy: 'Elmer Riggs', blurb: 'A giraffe-postured giant with longer front legs than back legs, holding its head high to browse treetops.', traits: ['Longer forelimbs than hindlimbs', 'Tall arched nasal crest', 'Spoon-shaped teeth'], facts: ['It did not rear up to feed; its neck already reached high.', 'The African giant Giraffatitan was once lumped in with it.'], uncertain: 'Exact mass depends on assumed soft tissue and air-sac volume.', howKnow: 'Partial skeletons; much of the popular image comes from Giraffatitan.' },
    { id: 'spinosaurus', name: 'Spinosaurus aegyptiacus', common: 'Spinosaurus', say: 'SPINE-uh-SOR-us', meaning: 'spine lizard', group: 'theropod', clade: 'Spinosauridae', diet: 'piscivore', period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 99, myaLo: 93, lengthM: 15, heightM: 4, weightKg: 7400, speedKmh: 15, region: 'Africa (North Africa)', formation: 'Kem Kem', named: 1915, namedBy: 'Ernst Stromer', blurb: 'A sail-backed, crocodile-snouted giant that lived a semi-aquatic, fish-eating life along ancient rivers.', traits: ['Tall neural-spine sail', 'Conical fish-grabbing teeth', 'Paddle-like tail'], facts: ['The first fossils were destroyed in a 1944 bombing raid.', 'It is the longest known predatory dinosaur.'], uncertain: 'How aquatic it really was, and whether it actively swam, is debated.', howKnow: 'Snout, sail, and tail material from Morocco and Egypt; the 1912 material is lost.' },
    { id: 'ankylosaurus', name: 'Ankylosaurus magniventris', common: 'Ankylosaurus', say: 'ANG-kih-luh-SOR-us', meaning: 'fused lizard', group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore', period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66, lengthM: 6.5, heightM: 1.7, weightKg: 6000, speedKmh: 10, region: 'North America', formation: 'Hell Creek', named: 1908, namedBy: 'Barnum Brown', blurb: 'A living tank covered in bony armor, with a heavy club at the end of its tail.', traits: ['Bony plates across the back', 'Tail club of fused bone', 'Wide gut for fermenting plants'], facts: ['A tail-club swing could likely break bone.', 'Even its eyelids had bony protection.'], uncertain: 'Whether the tail club was mainly for predators or rival contests is unsettled.', howKnow: 'Skulls, armor, and tail clubs, though no single complete skeleton is known.' },
    { id: 'allosaurus', name: 'Allosaurus fragilis', common: 'Allosaurus', say: 'AL-uh-SOR-us', meaning: 'different lizard', group: 'theropod', clade: 'Allosauridae', diet: 'carnivore', period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 145, lengthM: 9.5, heightM: 3.3, weightKg: 2000, speedKmh: 30, region: 'North America', formation: 'Morrison', named: 1877, namedBy: 'Othniel Charles Marsh', blurb: 'The top Jurassic predator of North America, with a light skull and a hatchet-like bite.', traits: ['Short brow horns', 'Three-fingered grasping hands', 'Light, flexible skull'], facts: ['It may have used its upper jaw like a hatchet.', 'The Cleveland-Lloyd quarry holds dozens of individuals.'], uncertain: 'Whether the mass death sites mean group hunting or a predator trap is debated.', howKnow: 'One of the best-known theropods, from the Cleveland-Lloyd Quarry.' },
    { id: 'parasaurolophus', name: 'Parasaurolophus walkeri', common: 'Parasaurolophus', say: 'PAIR-uh-SOR-OL-uh-fus', meaning: 'near crested lizard', group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore', period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 73, lengthM: 9.5, heightM: 4, weightKg: 2500, speedKmh: 25, region: 'North America', formation: 'Dinosaur Park', named: 1922, namedBy: 'William Parks', blurb: 'A duck-billed dinosaur with a long hollow head crest that may have worked like a trumpet.', traits: ['Long curved hollow crest', 'Hundreds of grinding teeth', 'Walked on two or four legs'], facts: ['Air passages loop through the crest, so its likely call can be modeled.', 'The crest connected to the nostrils.'], uncertain: 'The exact sound is reconstructed from CT scans and physics, not recorded.', howKnow: 'Skulls with intact crests that can be CT-scanned.' },
    { id: 'apatosaurus', name: 'Apatosaurus ajax', common: 'Apatosaurus', say: 'uh-PAT-uh-SOR-us', meaning: 'deceptive lizard', group: 'sauropod', clade: 'Diplodocidae', diet: 'herbivore', period: 'jurassic', epoch: 'Late Jurassic', myaHi: 152, myaLo: 151, lengthM: 23, heightM: 5, weightKg: 23000, speedKmh: 16, region: 'North America', formation: 'Morrison', named: 1877, namedBy: 'Othniel Charles Marsh', blurb: 'A long-necked, whip-tailed giant once tangled up with the name "Brontosaurus".', traits: ['Very thick, strong neck', 'Whip-like tail', 'Peg-shaped teeth'], facts: ['The "Brontosaurus" mix-up began with mismatched bones and a wrong head.', 'Its tail tip may have cracked like a whip.'], uncertain: 'Whether Apatosaurus and Brontosaurus are separate genera is still discussed.', howKnow: 'Multiple skeletons; the head was corrected decades after the body was described.' },
    { id: 'archaeopteryx', name: 'Archaeopteryx lithographica', common: 'Archaeopteryx', say: 'ar-kee-OP-ter-iks', meaning: 'ancient wing', group: 'theropod', clade: 'Avialae', diet: 'carnivore', period: 'jurassic', epoch: 'Late Jurassic', myaHi: 150, myaLo: 148, lengthM: 0.5, heightM: 0.25, weightKg: 1, speedKmh: 0, region: 'Europe (Germany)', formation: 'Solnhofen', named: 1861, namedBy: 'Hermann von Meyer', blurb: 'A crow-sized link between feathered dinosaurs and birds, with wings and teeth and a bony tail.', traits: ['Flight feathers on the arms', 'Toothed jaws', 'Clawed fingers and a long bony tail'], facts: ['It was found just two years after Darwin published On the Origin of Species.', 'The Solnhofen limestone preserves feather impressions.'], uncertain: 'How well it actually flew, versus glided, is still studied.', howKnow: 'About a dozen skeletons and a feather, all from Solnhofen.' },
    { id: 'diplodocus', name: 'Diplodocus carnegii', common: 'Diplodocus', say: 'dih-PLOD-uh-kus', meaning: 'double beam', group: 'sauropod', clade: 'Diplodocidae', diet: 'herbivore', period: 'jurassic', epoch: 'Late Jurassic', myaHi: 154, myaLo: 152, lengthM: 26, heightM: 4.5, weightKg: 12000, speedKmh: 16, region: 'North America', formation: 'Morrison', named: 1878, namedBy: 'Othniel Charles Marsh', blurb: 'An extremely long, slender sauropod whose casts stand in museums around the world.', traits: ['Very long neck and even longer tail', 'Forward-raking comb-like teeth', 'Lightly built'], facts: ['Casts donated by Andrew Carnegie spread copies across Europe.', 'It probably held its neck closer to horizontal.'], uncertain: 'Neck posture and browsing height are reconstructed from bone shape.', howKnow: 'Several good skeletons; the Carnegie cast is one of the most-copied fossils.' },
    { id: 'iguanodon', name: 'Iguanodon bernissartensis', common: 'Iguanodon', say: 'ig-WA-nuh-don', meaning: 'iguana tooth', group: 'ornithischian', clade: 'Iguanodontia', diet: 'herbivore', period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 126, myaLo: 122, lengthM: 10, heightM: 3, weightKg: 3000, speedKmh: 24, region: 'Europe (Belgium)', formation: 'Bernissart', named: 1825, namedBy: 'Gideon Mantell', blurb: 'One of the first dinosaurs ever named, famous for a thumb spike once mistaken for a nose horn.', traits: ['Cone-shaped thumb spike', 'Flexible fifth finger', 'Walked on two or four legs'], facts: ['A coal mine in Bernissart yielded dozens of skeletons.', 'Early reconstructions put the thumb spike on the snout.'], uncertain: 'The thumb spike’s use (defense, foraging, display) is uncertain.', howKnow: 'Dozens of skeletons from the Bernissart coal mine.' },
    { id: 'compsognathus', name: 'Compsognathus longipes', common: 'Compsognathus', say: 'komp-SOG-nay-thus', meaning: 'elegant jaw', group: 'theropod', clade: 'Compsognathidae', diet: 'carnivore', period: 'jurassic', epoch: 'Late Jurassic', myaHi: 150, myaLo: 148, lengthM: 1.1, heightM: 0.3, weightKg: 3, speedKmh: 40, region: 'Europe (Germany/France)', formation: 'Solnhofen', named: 1859, namedBy: 'Johann A. Wagner', blurb: 'A chicken-sized hunter long held up as one of the smallest known dinosaurs.', traits: ['Light, fast build', 'Two-fingered hands', 'Long legs for sprinting'], facts: ['A lizard was found preserved in one specimen’s gut.', 'It shared the Solnhofen lagoons with Archaeopteryx.'], uncertain: 'Whether it had simple feather-like filaments is not yet shown for this genus.', howKnow: 'Two good skeletons, one from Germany and one from France.' },
    { id: 'therizinosaurus', name: 'Therizinosaurus cheloniformis', common: 'Therizinosaurus', say: 'THERR-ih-ZINE-uh-SOR-us', meaning: 'scythe lizard', group: 'theropod', clade: 'Therizinosauridae', diet: 'herbivore', period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 68, lengthM: 10, heightM: 4.5, weightKg: 5000, speedKmh: 10, region: 'Asia (Mongolia)', formation: 'Nemegt', named: 1954, namedBy: 'Evgeny Maleev', blurb: 'A bizarre plant-eating theropod with the longest claws of any known animal, up to a meter long.', traits: ['Enormous hand claws', 'Pot belly for digesting plants', 'Small head on a long neck'], facts: ['Despite being a theropod, it ate plants.', 'The claws were likely for pulling vegetation and defense.'], uncertain: 'Exact claw use is inferred from shape; no behavior is preserved.', howKnow: 'Originally known mostly from the giant claws; relatives fill in the rest.' },
    { id: 'pteranodon', name: 'Pteranodon longiceps', common: 'Pteranodon', say: 'ter-AN-uh-don', meaning: 'toothless wing', group: 'other', clade: 'Pterosauria', diet: 'piscivore', period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 86, myaLo: 84, lengthM: 1.8, heightM: 1.8, weightKg: 25, speedKmh: 80, region: 'North America', formation: 'Niobrara', named: 1876, namedBy: 'Othniel Charles Marsh', blurb: 'A large flying reptile with a long head crest. Note: pterosaurs are not dinosaurs, but close cousins.', traits: ['Wingspan up to about 7 meters', 'Toothless beak', 'Backward-pointing crest'], facts: ['It flew over a shallow sea that once split North America.', 'Pterosaurs, not dinosaurs, were the first vertebrates to fly.'], uncertain: 'Crest function is debated. It is included here to show what is NOT a dinosaur.', howKnow: 'Many specimens from the chalk of the Western Interior Seaway.' },
    { id: 'coelophysis', name: 'Coelophysis bauri', common: 'Coelophysis', say: 'see-luh-FY-sis', meaning: 'hollow form', group: 'theropod', clade: 'Coelophysidae', diet: 'carnivore', period: 'triassic', epoch: 'Late Triassic', myaHi: 215, myaLo: 208, lengthM: 3, heightM: 0.8, weightKg: 20, speedKmh: 40, region: 'North America', formation: 'Chinle', named: 1889, namedBy: 'Edward Drinker Cope', blurb: 'A slender, early predator known from hundreds of individuals found together at Ghost Ranch.', traits: ['Hollow, bird-like bones', 'Long neck and tail', 'Many small sharp teeth'], facts: ['A Coelophysis skull flew on the Space Shuttle in 1998.', 'The Ghost Ranch quarry preserves a mass death.'], uncertain: 'Reports of cannibalism were later reinterpreted as small reptiles.', howKnow: 'Hundreds of skeletons from the Ghost Ranch bonebed in New Mexico.' },
    { id: 'gallimimus', name: 'Gallimimus bullatus', common: 'Gallimimus', say: 'GAL-ih-MIME-us', meaning: 'chicken mimic', group: 'theropod', clade: 'Ornithomimidae', diet: 'omnivore', period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 68, lengthM: 6, heightM: 1.9, weightKg: 440, speedKmh: 50, region: 'Asia (Mongolia)', formation: 'Nemegt', named: 1972, namedBy: 'Osmólska, Roniewicz & Barsbold', blurb: 'A long-legged ostrich-like dinosaur built for speed, with a toothless beak.', traits: ['Very long legs', 'Toothless beak', 'Large eyes'], facts: ['It is the running herd in the original Jurassic Park film.', 'It is one of the largest ornithomimids.'], uncertain: 'Its exact diet is inferred from the beak and gut region.', howKnow: 'Several good skeletons from the Nemegt Formation.' },
    {
      id: 'carnotaurus', name: 'Carnotaurus sastrei', common: 'Carnotaurus',
      say: 'KAR-noh-TOR-us', meaning: 'meat-eating bull',
      group: 'theropod', clade: 'Abelisauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 70,
      lengthM: 8, heightM: 3, weightKg: 1500, speedKmh: 48,
      region: 'South America (Argentina)', formation: 'La Colonia',
      named: 1985, namedBy: 'José Bonaparte',
      blurb: 'A fast, lightly built predator with two thick horns over its eyes and almost comically tiny arms.',
      traits: ['Bull-like brow horns', 'Extremely short arms', 'Deep, short skull built for speed'],
      facts: ['Skin impressions show rows of bumpy scales, no feathers on the body.', 'Its arms were even more reduced than a T. rex’s.'],
      uncertain: 'What the horns were for is inferred from shape, not behavior.',
      howKnow: 'One excellent skeleton with rare skin impressions preserved.'
    },
    {
      id: 'utahraptor', name: 'Utahraptor ostrommaysi', common: 'Utahraptor',
      say: 'YOO-tah-RAP-tor', meaning: 'Utah thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 135, myaLo: 130,
      lengthM: 6, heightM: 1.8, weightKg: 300, speedKmh: 32,
      region: 'North America', formation: 'Cedar Mountain',
      named: 1993, namedBy: 'Kirkland, Gaston & Burge',
      blurb: 'The largest known raptor, the size the movie velociraptors were imagined to be, with a huge sickle claw.',
      traits: ['Sickle claw up to 23 cm', 'Heavy, powerful build', 'Feathered like its smaller cousins'],
      facts: ['It is far closer to the movie "raptors" in size than the real Velociraptor.', 'A giant block of many individuals is still being prepared.'],
      uncertain: 'Whether the bone block records a pack trapped together, or a predator trap, is studied.',
      howKnow: 'Partial skeletons and a large multi-individual block from Utah.'
    },
    {
      id: 'dilophosaurus', name: 'Dilophosaurus wetherilli', common: 'Dilophosaurus',
      say: 'die-LOAF-uh-SOR-us', meaning: 'two-crested lizard',
      group: 'theropod', clade: 'Dilophosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 193, myaLo: 183,
      lengthM: 7, heightM: 2, weightKg: 400, speedKmh: 30,
      region: 'North America', formation: 'Kayenta',
      named: 1970, namedBy: 'Samuel Welles',
      blurb: 'An early crested predator made famous, and badly misrepresented, by Jurassic Park.',
      traits: ['Pair of thin head crests', 'Slender, agile build', 'Notch in the upper jaw'],
      facts: ['There is no evidence it had a neck frill or spat venom; that was invented for the film.', 'The real animal was much larger than the movie version.'],
      uncertain: 'Crest function is inferred from shape.',
      howKnow: 'Several skeletons from Arizona; a good example of fiction outrunning the fossils.'
    },
    {
      id: 'giganotosaurus', name: 'Giganotosaurus carolinii', common: 'Giganotosaurus',
      say: 'GIG-uh-NOTE-uh-SOR-us', meaning: 'giant southern lizard',
      group: 'theropod', clade: 'Carcharodontosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 99, myaLo: 95,
      lengthM: 12.5, heightM: 3.6, weightKg: 8000, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Candeleros',
      named: 1995, namedBy: 'Coria & Salgado',
      blurb: 'A southern giant that rivaled or exceeded T. rex in length, with a longer, narrower, slicing skull.',
      traits: ['Long, blade-like teeth', 'Narrow slicing skull', 'Likely hunted giant sauropods'],
      facts: ['Its name is often confused with Gigantosaurus; the spelling matters.', 'It lived tens of millions of years before T. rex, on a different continent.'],
      uncertain: 'Top-end size estimates vary because the best skeleton is incomplete.',
      howKnow: 'One mostly complete skeleton plus referred material.'
    },
    {
      id: 'deinonychus', name: 'Deinonychus antirrhopus', common: 'Deinonychus',
      say: 'die-NON-ih-kus', meaning: 'terrible claw',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 115, myaLo: 108,
      lengthM: 3.4, heightM: 0.9, weightKg: 73, speedKmh: 40,
      region: 'North America', formation: 'Cloverly',
      named: 1969, namedBy: 'John Ostrom',
      blurb: 'The dinosaur that sparked the "dinosaur renaissance" and the idea that birds are living dinosaurs.',
      traits: ['Large sickle claw', 'Active, bird-like build', 'Stiff balancing tail'],
      facts: ['Ostrom’s study of it revived the bird-dinosaur link in the 1960s.', 'The Jurassic Park "raptors" were really based on Deinonychus.'],
      uncertain: 'Whether it hunted in coordinated packs is argued.',
      howKnow: 'Several skeletons from Montana and Wyoming that changed how we see dinosaurs.'
    },
    {
      id: 'microraptor', name: 'Microraptor gui', common: 'Microraptor',
      say: 'MY-kroh-RAP-tor', meaning: 'small thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 120,
      lengthM: 0.9, heightM: 0.25, weightKg: 1, speedKmh: 0,
      region: 'Asia (China)', formation: 'Jiufotang',
      named: 2003, namedBy: 'Xu Xing and colleagues',
      blurb: 'A tiny four-winged glider with feathers on both arms and legs, and one of the few dinosaurs whose color we know.',
      traits: ['Flight feathers on arms and legs', 'Could glide between trees', 'Glossy black, iridescent plumage'],
      facts: ['Fossil melanosomes show it was iridescent black, like a crow or starling.', 'It is among the strongest evidence for gliding before powered flight.'],
      uncertain: 'Exactly how it used four wings is still modeled.',
      howKnow: 'Many beautifully preserved specimens from China’s Jehol deposits.'
    },
    {
      id: 'baryonyx', name: 'Baryonyx walkeri', common: 'Baryonyx',
      say: 'bah-RID-on-iks', meaning: 'heavy claw',
      group: 'theropod', clade: 'Spinosauridae', diet: 'piscivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 125,
      lengthM: 8.5, heightM: 2.5, weightKg: 1700, speedKmh: 22,
      region: 'Europe (England)', formation: 'Weald Clay',
      named: 1986, namedBy: 'Charig & Milner',
      blurb: 'A fish-eating relative of Spinosaurus with a big thumb claw and a long crocodile-like snout.',
      traits: ['Large curved thumb claw', 'Narrow, toothy snout', 'Cone-shaped fish-gripping teeth'],
      facts: ['Fish scales and a young Iguanodon were found in its gut.', 'It was discovered by an amateur fossil hunter in a clay pit.'],
      uncertain: 'How much of its diet was fish is estimated from teeth and gut contents.',
      howKnow: 'A single excellent skeleton with rare gut contents.'
    },
    {
      id: 'oviraptor', name: 'Oviraptor philoceratops', common: 'Oviraptor',
      say: 'OH-vih-RAP-tor', meaning: 'egg thief',
      group: 'theropod', clade: 'Oviraptoridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 1.6, heightM: 0.7, weightKg: 33, speedKmh: 30,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 1924, namedBy: 'Henry Fairfield Osborn',
      blurb: 'A feathered, beaked dinosaur with an unfair name: it was caught protecting its own eggs, not stealing them.',
      traits: ['Toothless beak', 'Head crest', 'Brooded its nest like a bird'],
      facts: ['The first specimen lay atop a nest once thought to be Protoceratops eggs; the eggs were its own.', 'It is one of the clearest examples of dinosaur parental care.'],
      uncertain: 'The original name stuck even after the "egg thief" story was overturned.',
      howKnow: 'Specimens preserved sitting on their nests, brooding like birds.'
    },
    {
      id: 'protoceratops', name: 'Protoceratops andrewsi', common: 'Protoceratops',
      say: 'PROH-toh-SERR-uh-tops', meaning: 'first horned face',
      group: 'ornithischian', clade: 'Protoceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 1.8, heightM: 0.7, weightKg: 80, speedKmh: 18,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 1923, namedBy: 'Granger & Gregory',
      blurb: 'A sheep-sized early relative of Triceratops, found by the hundreds, with a frill but no big horns.',
      traits: ['Bony neck frill', 'Parrot-like beak', 'No large facial horns yet'],
      facts: ['Its skulls may have inspired the griffin legend of ancient traders.', 'Nests and growth series show how it changed as it aged.'],
      uncertain: 'Whether the frill was for display, muscle attachment, or both is debated.',
      howKnow: 'Hundreds of specimens of every age, making it a model for studying growth.'
    },
    {
      id: 'pachycephalosaurus', name: 'Pachycephalosaurus wyomingensis', common: 'Pachycephalosaurus',
      say: 'PACK-ee-SEF-uh-luh-SOR-us', meaning: 'thick-headed lizard',
      group: 'ornithischian', clade: 'Pachycephalosauridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 4.5, heightM: 1.8, weightKg: 450, speedKmh: 25,
      region: 'North America', formation: 'Hell Creek',
      named: 1943, namedBy: 'Brown & Schlaikjer',
      blurb: 'A two-legged plant-eater with a skull roof up to 25 cm thick, ringed with bony knobs.',
      traits: ['Dome-shaped thick skull', 'Knobby skull spikes', 'Walked on two legs'],
      facts: ['Whether it head-butted like a bighorn sheep is a long argument.', 'Some "species" may just be young Pachycephalosaurus.'],
      uncertain: 'Head-butting versus flank-butting versus display is still debated.',
      howKnow: 'Mostly known from the thick domes, which fossilize well.'
    },
    {
      id: 'maiasaura', name: 'Maiasaura peeblesorum', common: 'Maiasaura',
      say: 'MY-uh-SOR-uh', meaning: 'good mother lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 75,
      lengthM: 9, heightM: 2.5, weightKg: 3000, speedKmh: 22,
      region: 'North America', formation: 'Two Medicine',
      named: 1979, namedBy: 'Horner & Makela',
      blurb: 'A duck-billed dinosaur known from huge nesting colonies that proved dinosaurs cared for their young.',
      traits: ['Nested in colonies', 'Cared for hatchlings', 'Flat, crestless head'],
      facts: ['Nests, eggs, embryos, and babies were all found together.', 'It was the first dinosaur in space, flown by an astronaut in 1985.'],
      uncertain: 'How long parents cared for young is inferred from nest sites and bone growth.',
      howKnow: '"Egg Mountain" in Montana preserved a whole nesting ground.'
    },
    {
      id: 'argentinosaurus', name: 'Argentinosaurus huinculensis', common: 'Argentinosaurus',
      say: 'AR-jen-TEEN-uh-SOR-us', meaning: 'Argentina lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 97, myaLo: 93,
      lengthM: 35, heightM: 12, weightKg: 75000, speedKmh: 8,
      region: 'South America (Argentina)', formation: 'Huincul',
      named: 1993, namedBy: 'Bonaparte & Coria',
      blurb: 'One of the largest land animals ever to live, a titanosaur estimated near 70 tonnes or more.',
      traits: ['Enormous body and neck', 'Vertebrae over a meter tall', 'Likely grew very fast as a juvenile'],
      facts: ['A single back vertebra is about as tall as an adult person.', 'Its full size is estimated, since no complete skeleton exists.'],
      uncertain: 'Mass estimates range widely because the skeleton is so incomplete.',
      howKnow: 'A handful of giant vertebrae and limb bones; the rest is scaled from relatives.'
    },
    {
      id: 'ceratosaurus', name: 'Ceratosaurus nasicornis', common: 'Ceratosaurus',
      say: 'seh-RAT-uh-SOR-us', meaning: 'horned lizard',
      group: 'theropod', clade: 'Ceratosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 153, myaLo: 148,
      lengthM: 6, heightM: 2.3, weightKg: 800, speedKmh: 30,
      region: 'North America', formation: 'Morrison',
      named: 1884, namedBy: 'Othniel Charles Marsh',
      blurb: 'A Jurassic predator with a blade-like nose horn and a row of small bony plates down its back.',
      traits: ['Single nasal horn', 'Bony plates along the spine', 'Long, flexible tail'],
      facts: ['It shared its world with the bigger Allosaurus.', 'Its tail was deep and may have helped it swim after prey.'],
      uncertain: 'The horn was likely for display rather than fighting, judged from its thin shape.',
      howKnow: 'Several skeletons from the Morrison Formation.'
    },
    {
      id: 'troodon', name: 'Troodon formosus', common: 'Troodon',
      say: 'TROH-uh-don', meaning: 'wounding tooth',
      group: 'theropod', clade: 'Troodontidae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 74,
      lengthM: 2.4, heightM: 0.9, weightKg: 50, speedKmh: 40,
      region: 'North America', formation: 'Judith River',
      named: 1856, namedBy: 'Joseph Leidy',
      blurb: 'A slender, big-eyed, big-brained hunter often called one of the smartest dinosaurs.',
      traits: ['Large brain for its size', 'Big forward-facing eyes', 'Sickle claw like a raptor'],
      facts: ['It had one of the highest brain-to-body ratios of any dinosaur.', 'Good night vision is inferred from its large eye sockets.'],
      uncertain: 'The genus name is now considered shaky; some material may belong to other troodontids.',
      howKnow: 'Teeth, braincases, and skeletons; the name’s validity is under review.'
    },
    {
      id: 'mamenchisaurus', name: 'Mamenchisaurus sinocanadorum', common: 'Mamenchisaurus',
      say: 'mah-MEN-chih-SOR-us', meaning: 'Mamenxi lizard',
      group: 'sauropod', clade: 'Mamenchisauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 160, myaLo: 145,
      lengthM: 26, heightM: 7, weightKg: 25000, speedKmh: 12,
      region: 'Asia (China)', formation: 'Shaximiao',
      named: 1954, namedBy: 'Yang Zhongjian',
      blurb: 'A Chinese sauropod with one of the longest necks of any known animal, up to half its body length.',
      traits: ['Extremely long neck', 'Light, air-filled neck bones', 'Small head'],
      facts: ['Some neck estimates reach 15 meters, the longest of any animal.', 'A long neck let it browse a wide area without moving its body.'],
      uncertain: 'The very longest neck estimates come from incomplete specimens.',
      howKnow: 'Several species and skeletons from Jurassic China.'
    },
    {
      id: 'styracosaurus', name: 'Styracosaurus albertensis', common: 'Styracosaurus',
      say: 'sty-RAK-uh-SOR-us', meaning: 'spiked lizard',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 5.5, heightM: 1.8, weightKg: 1800, speedKmh: 25,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1913, namedBy: 'Lawrence Lambe',
      blurb: 'A horned dinosaur whose frill bristled with long spikes, plus a single large nose horn.',
      traits: ['Crown of frill spikes', 'Long nose horn', 'Beak and shearing teeth'],
      facts: ['The dramatic frill was likely more for display than defense.', 'Bonebeds suggest it moved in herds.'],
      uncertain: 'Frill function is judged from shape, not behavior.',
      howKnow: 'Skulls and bonebeds from Alberta, Canada.'
    },
    {
      id: 'edmontosaurus', name: 'Edmontosaurus annectens', common: 'Edmontosaurus',
      say: 'ed-MON-tuh-SOR-us', meaning: 'Edmonton lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 73, myaLo: 66,
      lengthM: 12, heightM: 3.5, weightKg: 4000, speedKmh: 30,
      region: 'North America', formation: 'Hell Creek',
      named: 1917, namedBy: 'Lawrence Lambe',
      blurb: 'A large crestless duck-bill, one of the last dinosaurs, that lived right up to the asteroid impact.',
      traits: ['Hundreds of grinding teeth', 'Soft head crest in some specimens', 'Lived in big herds'],
      facts: ['"Mummified" specimens preserve skin texture and a fleshy crest.', 'T. rex bite marks appear on some Edmontosaurus bones.'],
      uncertain: 'How much it walked on two legs versus four changed with age and speed.',
      howKnow: 'Many skeletons, including rare skin and soft-tissue impressions.'
    },
    {
      id: 'plateosaurus', name: 'Plateosaurus trossingensis', common: 'Plateosaurus',
      say: 'PLAT-ee-uh-SOR-us', meaning: 'broad lizard',
      group: 'sauropod', clade: 'Plateosauridae', diet: 'herbivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 214, myaLo: 204,
      lengthM: 8, heightM: 3, weightKg: 4000, speedKmh: 15,
      region: 'Europe (Germany)', formation: 'Trossingen',
      named: 1837, namedBy: 'Hermann von Meyer',
      blurb: 'An early long-necked plant-eater, a forerunner of the giant sauropods, known from dozens of skeletons.',
      traits: ['Long neck and small head', 'Grasping hands with a thumb claw', 'Walked on two legs'],
      facts: ['It was one of the first big dinosaurs, long before the sauropod giants.', 'A German quarry yielded dozens of individuals.'],
      uncertain: 'Why so many died together is still studied.',
      howKnow: 'Dozens of skeletons from Triassic Europe, an unusually rich record.'
    },
    {
      id: 'herrerasaurus', name: 'Herrerasaurus ischigualastensis', common: 'Herrerasaurus',
      say: 'huh-RARE-uh-SOR-us', meaning: 'Herrera’s lizard',
      group: 'theropod', clade: 'Herrerasauridae', diet: 'carnivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 231, myaLo: 229,
      lengthM: 4, heightM: 1.1, weightKg: 250, speedKmh: 35,
      region: 'South America (Argentina)', formation: 'Ischigualasto',
      named: 1963, namedBy: 'Osvaldo Reig',
      blurb: 'One of the earliest known dinosaurs, a lightly built predator from the dawn of the group.',
      traits: ['Early, simple hip and ankle', 'Grasping hands', 'Sharp recurved teeth'],
      facts: ['It lived when dinosaurs were just a small part of the animal world.', 'Its exact place in the family tree is still debated.'],
      uncertain: 'Whether it is a very early theropod or sits outside the main split is argued.',
      howKnow: 'Good skeletons from the Ischigualasto "Valley of the Moon" in Argentina.'
    },
    {
      id: 'eoraptor', name: 'Eoraptor lunensis', common: 'Eoraptor',
      say: 'EE-oh-RAP-tor', meaning: 'dawn thief',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'omnivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 231, myaLo: 229,
      lengthM: 1, heightM: 0.3, weightKg: 10, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Ischigualasto',
      named: 1993, namedBy: 'Paul Sereno and colleagues',
      blurb: 'A small, lightly built early dinosaur whose mixed teeth hint at an omnivorous diet.',
      traits: ['Mix of leaf-shaped and pointed teeth', 'Small and agile', 'Five-fingered hands'],
      facts: ['It is near the base of the dinosaur family tree.', 'Its teeth suggest it ate both plants and small animals.'],
      uncertain: 'Whether it is an early meat-eater or early sauropod relative has shifted with new studies.',
      howKnow: 'A nearly complete early skeleton from Argentina.'
    },
    {
      id: 'yutyrannus', name: 'Yutyrannus huali', common: 'Yutyrannus',
      say: 'YOO-tih-RAN-us', meaning: 'beautiful feathered tyrant',
      group: 'theropod', clade: 'Tyrannosauroidea', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 124,
      lengthM: 9, heightM: 2.8, weightKg: 1400, speedKmh: 25,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2012, namedBy: 'Xu Xing and colleagues',
      blurb: 'A large early tyrannosaur covered in simple feathers, the biggest animal yet found with direct feather evidence.',
      traits: ['Shaggy filament-like feathers', 'Early tyrannosaur build', 'Lived in a cool climate'],
      facts: ['It shows that even big tyrannosaurs could be feathered.', 'It lived in a cooler setting, where feathers may have kept it warm.'],
      uncertain: 'Whether giant later tyrannosaurs like T. rex kept feathers is still open.',
      howKnow: 'Three skeletons with preserved filamentous feathers.'
    },
    {
      id: 'sinosauropteryx', name: 'Sinosauropteryx prima', common: 'Sinosauropteryx',
      say: 'SY-no-sor-OP-ter-iks', meaning: 'Chinese lizard wing',
      group: 'theropod', clade: 'Compsognathidae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 1.1, heightM: 0.3, weightKg: 1, speedKmh: 38,
      region: 'Asia (China)', formation: 'Yixian',
      named: 1996, namedBy: 'Ji & Ji',
      blurb: 'The first dinosaur found with clear feathers, and the first whose color pattern was worked out.',
      traits: ['Simple filament feathers', 'Banded "bandit mask" and striped tail', 'Long tail'],
      facts: ['Fossil melanosomes show a ginger-and-white striped tail.', 'It helped prove that many dinosaurs had feathers.'],
      uncertain: 'Color reconstruction relies on comparing fossil pigment structures to living birds.',
      howKnow: 'Several specimens from China’s Jehol beds with preserved feathers and pigment.'
    },
    {
      id: 'dimetrodon', name: 'Dimetrodon limbatus', common: 'Dimetrodon',
      say: 'die-MET-ruh-don', meaning: 'two-measure tooth',
      group: 'other', clade: 'Synapsida (not a dinosaur)', diet: 'carnivore',
      period: 'permian', epoch: 'Permian (before dinosaurs)', myaHi: 295, myaLo: 272,
      lengthM: 3.5, heightM: 1.2, weightKg: 250, speedKmh: 15,
      region: 'North America', formation: 'Various',
      named: 1878, namedBy: 'Edward Drinker Cope',
      blurb: 'A sail-backed predator often sold in dinosaur toy sets, but it died out before the first dinosaur appeared.',
      traits: ['Tall back sail', 'Differentiated teeth', 'Closer to mammals than to dinosaurs'],
      facts: ['It lived in the Permian, tens of millions of years before any dinosaur.', 'It is a synapsid, on the line leading to mammals, not reptiles.'],
      uncertain: 'Included here on purpose: it is the most common "fake dinosaur" in toy bins.',
      howKnow: 'Many skeletons from Permian rocks of North America and Europe.'
    },
    {
      id: 'mosasaurus', name: 'Mosasaurus hoffmannii', common: 'Mosasaurus',
      say: 'MOH-zuh-SOR-us', meaning: 'Meuse River lizard',
      group: 'other', clade: 'Mosasauridae (marine reptile, not a dinosaur)', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 12, heightM: 0, weightKg: 10000, speedKmh: 40,
      region: 'Worldwide oceans', formation: 'Maastricht',
      named: 1822, namedBy: 'William Conybeare',
      blurb: 'A giant ocean-going reptile, a cousin of lizards and snakes, not a dinosaur at all.',
      traits: ['Powerful tail fluke for swimming', 'Double-hinged jaws', 'Lived entirely in the sea'],
      facts: ['It breathed air and bore live young in the water.', 'Its discovery helped establish the idea of extinction.'],
      uncertain: 'Included on purpose: marine reptiles are often mislabeled as dinosaurs.',
      howKnow: 'Many specimens; the original skull helped found the science of extinction.'
    },
    {
      id: 'tarbosaurus', name: 'Tarbosaurus bataar', common: 'Tarbosaurus',
      say: 'TAR-buh-SOR-us', meaning: 'alarming lizard',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 68,
      lengthM: 10, heightM: 3.2, weightKg: 5000, speedKmh: 22,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 1955, namedBy: 'Evgeny Maleev',
      blurb: 'The Asian cousin of T. rex, the top predator of Late Cretaceous Mongolia.',
      traits: ['Huge tyrannosaur skull', 'Tiny two-fingered arms', 'Slightly narrower snout than T. rex'],
      facts: ['It is so similar to T. rex that some argue it is a close relative within the same group.', 'Smuggled skeletons have been repatriated to Mongolia.'],
      uncertain: 'Exactly how closely it relates to T. rex is debated.',
      howKnow: 'Many good skeletons from the Nemegt Formation.'
    },
    {
      id: 'camarasaurus', name: 'Camarasaurus supremus', common: 'Camarasaurus',
      say: 'KAM-uh-ruh-SOR-us', meaning: 'chambered lizard',
      group: 'sauropod', clade: 'Camarasauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 145,
      lengthM: 18, heightM: 6, weightKg: 20000, speedKmh: 14,
      region: 'North America', formation: 'Morrison',
      named: 1877, namedBy: 'Edward Drinker Cope',
      blurb: 'The most common Morrison sauropod, with a boxy head and spoon-shaped teeth.',
      traits: ['Short, deep skull', 'Hollow-chambered vertebrae', 'Spoon-shaped teeth'],
      facts: ['Its abundance makes it a benchmark for studying sauropods.', 'A juvenile is one of the most complete sauropods ever found.'],
      uncertain: 'How it divided feeding zones with other Morrison giants is inferred from tooth wear.',
      howKnow: 'Many skeletons, including a famously complete juvenile.'
    },
    {
      id: 'corythosaurus', name: 'Corythosaurus casuarius', common: 'Corythosaurus',
      say: 'kuh-RITH-uh-SOR-us', meaning: 'helmet lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 76,
      lengthM: 9, heightM: 3.5, weightKg: 3000, speedKmh: 24,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1914, namedBy: 'Barnum Brown',
      blurb: 'A duck-billed dinosaur with a tall, rounded crest shaped like a cassowary helmet.',
      traits: ['Tall fan-shaped head crest', 'Hollow crest connected to the nose', 'Hundreds of grinding teeth'],
      facts: ['Skin impressions are preserved on some specimens.', 'The hollow crest probably amplified calls.'],
      uncertain: 'Crest size differences may reflect age and sex rather than separate species.',
      howKnow: 'Several skeletons, some with skin impressions, from Alberta.'
    },
    {
      id: 'psittacosaurus', name: 'Psittacosaurus mongoliensis', common: 'Psittacosaurus',
      say: 'sih-TAK-uh-SOR-us', meaning: 'parrot lizard',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 126, myaLo: 101,
      lengthM: 2, heightM: 0.6, weightKg: 20, speedKmh: 25,
      region: 'Asia', formation: 'Yixian',
      named: 1923, namedBy: 'Henry Fairfield Osborn',
      blurb: 'An early horned dinosaur with a parrot-like beak, and one of the best-known dinosaurs of all.',
      traits: ['Parrot-like beak', 'Bristles on the tail', 'Walked on two legs'],
      facts: ['One specimen preserves color and even a hint of countershading.', 'More than a thousand individuals are known.'],
      uncertain: 'The tail bristles’ purpose is inferred from their form.',
      howKnow: 'One of the most abundant dinosaurs, with specimens of every age.'
    },
    {
      id: 'acrocanthosaurus', name: 'Acrocanthosaurus atokensis', common: 'Acrocanthosaurus',
      say: 'AK-roh-KAN-thuh-SOR-us', meaning: 'high-spined lizard',
      group: 'theropod', clade: 'Carcharodontosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 116, myaLo: 110,
      lengthM: 11.5, heightM: 3.4, weightKg: 6200, speedKmh: 30,
      region: 'North America', formation: 'Antlers',
      named: 1950, namedBy: 'Stovall & Langston',
      blurb: 'A top Early Cretaceous predator of North America with a low ridge of tall spines down its back.',
      traits: ['Ridge of tall neural spines', 'Long, blade-toothed skull', 'Powerful neck'],
      facts: ['Trackways may show it stalking sauropods.', 'The back ridge may have anchored muscle or supported a low hump.'],
      uncertain: 'Whether the spines held a hump, a low sail, or just muscle is debated.',
      howKnow: 'Several skeletons and possible trackways from the southern United States.'
    },
    {
      id: 'majungasaurus', name: 'Majungasaurus crenatissimus', common: 'Majungasaurus',
      say: 'mah-JUNG-guh-SOR-us', meaning: 'Mahajanga lizard',
      group: 'theropod', clade: 'Abelisauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 7, heightM: 2.5, weightKg: 1100, speedKmh: 30,
      region: 'Africa (Madagascar)', formation: 'Maevarano',
      named: 1955, namedBy: 'René Lavocat',
      blurb: 'A short-snouted island predator from Madagascar with strong evidence of cannibalism.',
      traits: ['Single bony bump on the head', 'Short, deep skull', 'Stocky build'],
      facts: ['Tooth marks on its own kind are clear evidence of cannibalism.', 'It hunted on an island near the end of the dinosaur age.'],
      uncertain: 'Whether cannibalism was active hunting or scavenging is unclear.',
      howKnow: 'Good skulls and skeletons, plus telltale bite marks.'
    },
    {
      id: 'cryolophosaurus', name: 'Cryolophosaurus ellioti', common: 'Cryolophosaurus',
      say: 'KRY-oh-LOAF-uh-SOR-us', meaning: 'frozen crested lizard',
      group: 'theropod', clade: 'Dilophosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 194, myaLo: 188,
      lengthM: 6.5, heightM: 2, weightKg: 460, speedKmh: 30,
      region: 'Antarctica', formation: 'Hanson',
      named: 1994, namedBy: 'Hammer & Hickerson',
      blurb: 'The first dinosaur named from Antarctica, with a strange crest that ran sideways across its head.',
      traits: ['Sideways head crest', 'Early large theropod', 'Found in once-temperate Antarctica'],
      facts: ['Antarctica was warmer and forested in the Jurassic.', 'Its crest sits crosswise, unlike most crested theropods.'],
      uncertain: 'Its exact family placement has shifted with new studies.',
      howKnow: 'A partial skeleton from the Transantarctic Mountains.'
    },
    {
      id: 'suchomimus', name: 'Suchomimus tenerensis', common: 'Suchomimus',
      say: 'SOOK-uh-MIME-us', meaning: 'crocodile mimic',
      group: 'theropod', clade: 'Spinosauridae', diet: 'piscivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 112,
      lengthM: 11, heightM: 3.5, weightKg: 3800, speedKmh: 22,
      region: 'Africa (Niger)', formation: 'Elrhaz',
      named: 1998, namedBy: 'Paul Sereno and colleagues',
      blurb: 'A spinosaur with a long crocodile-like snout and a low sail, built for catching fish.',
      traits: ['Long narrow snout', 'About 100 conical teeth', 'Low back sail'],
      facts: ['Its snout and teeth match a fish-heavy diet.', 'It is a close cousin of Baryonyx and Spinosaurus.'],
      uncertain: 'How much it relied on fish versus other prey is estimated from anatomy.',
      howKnow: 'A largely complete skeleton from the Sahara of Niger.'
    },
    {
      id: 'amargasaurus', name: 'Amargasaurus cazaui', common: 'Amargasaurus',
      say: 'uh-MARG-uh-SOR-us', meaning: 'La Amarga lizard',
      group: 'sauropod', clade: 'Dicraeosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 129, myaLo: 122,
      lengthM: 10, heightM: 2.6, weightKg: 2600, speedKmh: 12,
      region: 'South America (Argentina)', formation: 'La Amarga',
      named: 1991, namedBy: 'Leonardo Salgado',
      blurb: 'A small sauropod with two rows of tall spines running down its neck and back.',
      traits: ['Double row of neck spines', 'Short neck for a sauropod', 'Small body'],
      facts: ['The spines may have supported sails, a mane, or sheaths of horn.', 'It is unusually small for a long-necked dinosaur.'],
      uncertain: 'What the neck spines carried is unresolved.',
      howKnow: 'One good skeleton from Patagonia.'
    },
    {
      id: 'nigersaurus', name: 'Nigersaurus taqueti', common: 'Nigersaurus',
      say: 'NEE-zher-SOR-us', meaning: 'Niger lizard',
      group: 'sauropod', clade: 'Rebbachisauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 119, myaLo: 105,
      lengthM: 9, heightM: 2, weightKg: 4000, speedKmh: 12,
      region: 'Africa (Niger)', formation: 'Elrhaz',
      named: 1999, namedBy: 'Paul Sereno and colleagues',
      blurb: 'A "ground-level mower" sauropod with a wide straight-edged mouth and hundreds of tiny teeth.',
      traits: ['Wide vacuum-like muzzle', 'More than 500 teeth in rows', 'Very light, air-filled skull'],
      facts: ['It replaced teeth astonishingly fast, on a roughly two-week cycle.', 'Its skull was so delicate it is mostly air and thin bone.'],
      uncertain: 'Head posture is inferred from its inner ear.',
      howKnow: 'Skull and skeleton material from Niger, including the fragile skull.'
    },
    {
      id: 'gorgosaurus', name: 'Gorgosaurus libratus', common: 'Gorgosaurus',
      say: 'GOR-guh-SOR-us', meaning: 'fierce lizard',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 74,
      lengthM: 9, heightM: 2.9, weightKg: 2400, speedKmh: 32,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1914, namedBy: 'Lawrence Lambe',
      blurb: 'A sleek tyrannosaur from Canada, built lighter and faster than its giant cousin T. rex.',
      traits: ['Long-legged tyrannosaur', 'Bladed teeth', 'Lived alongside Daspletosaurus'],
      facts: ['A young Gorgosaurus was found with its last meal in its gut.', 'It shared its world with horned and duck-billed dinosaurs.'],
      uncertain: 'How it split prey with the co-existing Daspletosaurus is inferred from anatomy.',
      howKnow: 'Many excellent skeletons of all ages from Alberta.'
    },
    {
      id: 'centrosaurus', name: 'Centrosaurus apertus', common: 'Centrosaurus',
      say: 'SEN-truh-SOR-us', meaning: 'pointed lizard',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 5.5, heightM: 1.8, weightKg: 2300, speedKmh: 25,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1904, namedBy: 'Lawrence Lambe',
      blurb: 'A horned dinosaur known from enormous bonebeds, strong evidence that it lived in big herds.',
      traits: ['Single large nose horn', 'Hooked spikes over the frill', 'Herd animal'],
      facts: ['Bonebeds preserve thousands of individuals, likely drowned crossing rivers.', 'Herd life may have given protection in numbers.'],
      uncertain: 'Exact herd behavior is inferred from mass death sites.',
      howKnow: 'Massive bonebeds in Alberta, Canada.'
    },
    {
      id: 'kentrosaurus', name: 'Kentrosaurus aethiopicus', common: 'Kentrosaurus',
      say: 'KEN-truh-SOR-us', meaning: 'spiked lizard',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 152, myaLo: 145,
      lengthM: 4.5, heightM: 1.5, weightKg: 700, speedKmh: 12,
      region: 'Africa (Tanzania)', formation: 'Tendaguru',
      named: 1915, namedBy: 'Edwin Hennig',
      blurb: 'An African cousin of Stegosaurus with small plates up front and long spikes down the back and tail.',
      traits: ['Plates near the shoulders', 'Long spikes on the back and tail', 'Possible hip spike'],
      facts: ['It came from the rich Tendaguru beds of Tanzania.', 'Its flexible spiky tail could swing in a wide arc.'],
      uncertain: 'Exact spike arrangement is reconstructed from many separate bones.',
      howKnow: 'Hundreds of bones from the German Tendaguru expeditions.'
    },
    {
      id: 'deinocheirus', name: 'Deinocheirus mirificus', common: 'Deinocheirus',
      say: 'DINE-oh-KY-rus', meaning: 'terrible hand',
      group: 'theropod', clade: 'Ornithomimosauria', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 71, myaLo: 69,
      lengthM: 11, heightM: 4.5, weightKg: 6400, speedKmh: 18,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 1970, namedBy: 'Osmólska & Roniewicz',
      blurb: 'A bizarre giant once known only from huge arms, finally revealed as a humpbacked, duck-snouted omnivore.',
      traits: ['Giant clawed arms', 'Sail-like back hump', 'Duck-like beak'],
      facts: ['For decades only its 2.4 m arms were known.', 'Fish bones and gastroliths in its gut show a mixed diet.'],
      uncertain: 'Its lifestyle is still being pieced together from the more complete finds.',
      howKnow: 'The famous arms in 1970; the rest of the body found and described by 2014.'
    },
    {
      id: 'pachyrhinosaurus', name: 'Pachyrhinosaurus canadensis', common: 'Pachyrhinosaurus',
      say: 'PACK-ee-RINE-uh-SOR-us', meaning: 'thick-nosed lizard',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 73, myaLo: 70,
      lengthM: 6, heightM: 2, weightKg: 3000, speedKmh: 24,
      region: 'North America', formation: 'Wapiti',
      named: 1950, namedBy: 'Charles M. Sternberg',
      blurb: 'A horned dinosaur with a thick bony pad instead of a nose horn, found in huge northern herds.',
      traits: ['Thick bony nasal boss', 'Frill spikes', 'Lived at high latitudes'],
      facts: ['It endured long, dark polar winters.', 'Bonebeds suggest large migrating herds.'],
      uncertain: 'Whether the nasal boss supported a horn in life is uncertain.',
      howKnow: 'Northern bonebeds in Alberta and Alaska.'
    },
    {
      id: 'lambeosaurus', name: 'Lambeosaurus lambei', common: 'Lambeosaurus',
      say: 'LAM-bee-uh-SOR-us', meaning: 'Lambe’s lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 9, heightM: 3.5, weightKg: 3000, speedKmh: 24,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1923, namedBy: 'William Parks',
      blurb: 'A duck-billed dinosaur with a hatchet-shaped hollow crest, named for paleontologist Lawrence Lambe.',
      traits: ['Hatchet-shaped head crest', 'Hollow crest tubes', 'Grinding tooth batteries'],
      facts: ['Crest shape changed a lot as the animal grew.', 'Some "species" turned out to be growth stages.'],
      uncertain: 'Sorting true species from age and sex differences is ongoing.',
      howKnow: 'Many skulls and skeletons from Alberta.'
    },
    {
      id: 'gigantoraptor', name: 'Gigantoraptor erlianensis', common: 'Gigantoraptor',
      say: 'jih-GAN-toh-RAP-tor', meaning: 'giant thief',
      group: 'theropod', clade: 'Oviraptorosauria', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 96, myaLo: 88,
      lengthM: 8, heightM: 3.5, weightKg: 2000, speedKmh: 30,
      region: 'Asia (China)', formation: 'Iren Dabasu',
      named: 2007, namedBy: 'Xu Xing and colleagues',
      blurb: 'A giant beaked, feathered dinosaur, hundreds of times heavier than most of its small oviraptor cousins.',
      traits: ['Toothless beak', 'Likely feathered arms', 'Long legs'],
      facts: ['Most oviraptorosaurs were turkey-sized; this one was bus-length.', 'It shows feathered dinosaurs could get very large.'],
      uncertain: 'Whether its arm feathers were for display or brooding is inferred.',
      howKnow: 'A partial skeleton from Inner Mongolia, China.'
    },
    {
      id: 'citipati', name: 'Citipati osmolskae', common: 'Citipati',
      say: 'CHIT-ih-PAH-tee', meaning: 'funeral pyre lord',
      group: 'theropod', clade: 'Oviraptoridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 2.5, heightM: 1, weightKg: 75, speedKmh: 30,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 2001, namedBy: 'Clark, Norell & Barsbold',
      blurb: 'A crested oviraptorid famous for fossils preserved sitting on their nests, brooding like birds.',
      traits: ['Tall head crest', 'Toothless beak', 'Brooded its eggs'],
      facts: ['"Big Mama" specimens sit atop nests with arms spread over the eggs.', 'It is some of the best evidence for bird-like parenting in dinosaurs.'],
      uncertain: 'How long brooding lasted is inferred from the preserved poses.',
      howKnow: 'Several nesting specimens from Mongolia.'
    },
    {
      id: 'anchiornis', name: 'Anchiornis huxleyi', common: 'Anchiornis',
      say: 'ang-kee-OR-nis', meaning: 'near bird',
      group: 'theropod', clade: 'Paraves', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 160, myaLo: 155,
      lengthM: 0.4, heightM: 0.2, weightKg: 1, speedKmh: 0,
      region: 'Asia (China)', formation: 'Tiaojishan',
      named: 2009, namedBy: 'Xu Xing and colleagues',
      blurb: 'A tiny four-winged feathered dinosaur, and the first dinosaur whose full color pattern was mapped.',
      traits: ['Feathers on all four limbs', 'Grey body with a reddish crest', 'White-banded wings'],
      facts: ['Thousands of melanosome samples reconstructed its whole color scheme.', 'It is older than Archaeopteryx.'],
      uncertain: 'Whether it could truly fly or only glided is debated.',
      howKnow: 'Hundreds of specimens from China’s Jurassic feather beds.'
    },
    {
      id: 'caudipteryx', name: 'Caudipteryx zoui', common: 'Caudipteryx',
      say: 'kaw-DIP-ter-iks', meaning: 'tail feather',
      group: 'theropod', clade: 'Oviraptorosauria', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 0.9, heightM: 0.4, weightKg: 5, speedKmh: 35,
      region: 'Asia (China)', formation: 'Yixian',
      named: 1998, namedBy: 'Ji Qiang and colleagues',
      blurb: 'A peacock-sized feathered dinosaur with a fan of tail feathers, clearly not built for flight.',
      traits: ['Fan of tail feathers', 'Short arm feathers', 'Gastroliths in the gut'],
      facts: ['Its feathers were for display and insulation, not flying.', 'It helped show feathers came before flight.'],
      uncertain: 'Its exact diet is inferred from gut stones and teeth.',
      howKnow: 'Several feathered specimens from China’s Jehol beds.'
    },
    {
      id: 'megalosaurus', name: 'Megalosaurus bucklandii', common: 'Megalosaurus',
      say: 'MEG-uh-luh-SOR-us', meaning: 'great lizard',
      group: 'theropod', clade: 'Megalosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 168, myaLo: 166,
      lengthM: 6, heightM: 2, weightKg: 1000, speedKmh: 28,
      region: 'Europe (England)', formation: 'Taynton Limestone',
      named: 1824, namedBy: 'William Buckland',
      blurb: 'The very first dinosaur ever scientifically named, decades before the word "dinosaur" existed.',
      traits: ['Large Jurassic predator', 'Blade-like teeth', 'Strong hind legs'],
      facts: ['It was named in 1824, before "Dinosauria" was coined in 1842.', 'Early reconstructions imagined it as a giant quadruped.'],
      uncertain: 'Much old "Megalosaurus" material actually belongs to other theropods.',
      howKnow: 'Fragmentary but historically pivotal English fossils.'
    },
    {
      id: 'dakotaraptor', name: 'Dakotaraptor steini', common: 'Dakotaraptor',
      say: 'duh-KOH-tuh-RAP-tor', meaning: 'Dakota thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 67, myaLo: 66,
      lengthM: 5, heightM: 1.6, weightKg: 250, speedKmh: 40,
      region: 'North America', formation: 'Hell Creek',
      named: 2015, namedBy: 'DePalma and colleagues',
      blurb: 'A large feathered raptor that lived right up to the asteroid impact, alongside T. rex.',
      traits: ['Big sickle claw', 'Quill knobs on the forearm', 'Long-legged build'],
      facts: ['Quill knobs confirm wing feathers on a flightless animal.', 'It hunted in the last days of the dinosaurs.'],
      uncertain: 'Some bones first assigned to it may belong to a turtle, under review.',
      howKnow: 'Partial skeleton from the latest Cretaceous of South Dakota.'
    },
    {
      id: 'heterodontosaurus', name: 'Heterodontosaurus tucki', common: 'Heterodontosaurus',
      say: 'HET-er-oh-DON-tuh-SOR-us', meaning: 'different-toothed lizard',
      group: 'ornithischian', clade: 'Heterodontosauridae', diet: 'omnivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 200, myaLo: 190,
      lengthM: 1.2, heightM: 0.4, weightKg: 3, speedKmh: 30,
      region: 'Africa (South Africa)', formation: 'Elliot',
      named: 1962, namedBy: 'Crompton & Charig',
      blurb: 'A small early plant-eater with three kinds of teeth, including a pair of canine-like tusks.',
      traits: ['Tusk-like canines', 'Grinding cheek teeth', 'Grasping five-fingered hands'],
      facts: ['Its mixed teeth are unusual for a plant-eater.', 'The tusks may have been for display or defense.'],
      uncertain: 'Whether tusks differed between sexes is uncertain.',
      howKnow: 'Good skulls and skeletons from southern Africa.'
    },
    {
      id: 'mononykus', name: 'Mononykus olecranus', common: 'Mononykus',
      say: 'mah-NON-ih-kus', meaning: 'single claw',
      group: 'theropod', clade: 'Alvarezsauridae', diet: 'insectivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 68,
      lengthM: 1, heightM: 0.3, weightKg: 4, speedKmh: 45,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 1993, namedBy: 'Perle and colleagues',
      blurb: 'A small, fast, long-legged dinosaur with stubby arms ending in a single stout claw.',
      traits: ['One big claw on each tiny arm', 'Long running legs', 'Slender beak with small teeth'],
      facts: ['The single claw may have ripped open insect nests, like an anteater.', 'It was once mistaken for a flightless bird.'],
      uncertain: 'The exact use of its odd single-claw arms is inferred from anatomy.',
      howKnow: 'Skeletons from Mongolia’s Late Cretaceous.'
    },
    {
      id: 'tenontosaurus', name: 'Tenontosaurus tilletti', common: 'Tenontosaurus',
      say: 'teh-NON-tuh-SOR-us', meaning: 'sinew lizard',
      group: 'ornithischian', clade: 'Iguanodontia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 115, myaLo: 108,
      lengthM: 7, heightM: 2, weightKg: 1000, speedKmh: 22,
      region: 'North America', formation: 'Cloverly',
      named: 1970, namedBy: 'John Ostrom',
      blurb: 'A medium plant-eater with an exceptionally long, stiff tail, often found with Deinonychus teeth.',
      traits: ['Very long tail', 'Beak and grinding teeth', 'Sturdy build'],
      facts: ['Deinonychus teeth near its bones spark the pack-hunting debate.', 'Its long tail made up much of its length.'],
      uncertain: 'Whether Deinonychus hunted it in packs or scavenged it is argued.',
      howKnow: 'Many skeletons from the American West.'
    },
    {
      id: 'euoplocephalus', name: 'Euoplocephalus tutus', common: 'Euoplocephalus',
      say: 'yoo-OP-luh-SEF-uh-lus', meaning: 'well-armored head',
      group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 6, heightM: 1.7, weightKg: 2500, speedKmh: 10,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1910, namedBy: 'Lawrence Lambe',
      blurb: 'A heavily armored ankylosaur with a tail club and bony eyelids, known from many specimens.',
      traits: ['Tail club', 'Armor over the back', 'Bony shutters over the eyes'],
      facts: ['Even its eyelids had bony protection.', 'It is one of the best-known armored dinosaurs.'],
      uncertain: 'Whether many specimens are one species or several is debated.',
      howKnow: 'Dozens of specimens from Alberta.'
    },
    {
      id: 'struthiomimus', name: 'Struthiomimus altus', common: 'Struthiomimus',
      say: 'STROOTH-ee-uh-MIME-us', meaning: 'ostrich mimic',
      group: 'theropod', clade: 'Ornithomimidae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 70,
      lengthM: 4.3, heightM: 1.4, weightKg: 150, speedKmh: 50,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1917, namedBy: 'Henry Fairfield Osborn',
      blurb: 'A fast, ostrich-like dinosaur with a toothless beak and long grasping arms.',
      traits: ['Toothless beak', 'Very long legs', 'Long arms with curved claws'],
      facts: ['Its long arms set it apart from other "ostrich mimics".', 'It probably ate plants, eggs, and small animals.'],
      uncertain: 'Its precise diet is inferred from beak shape and arms.',
      howKnow: 'Several good skeletons from Alberta.'
    },
    {
      id: 'austroraptor', name: 'Austroraptor cabazai', common: 'Austroraptor',
      say: 'OSS-troh-RAP-tor', meaning: 'southern thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 5, heightM: 1.6, weightKg: 350, speedKmh: 35,
      region: 'South America (Argentina)', formation: 'Allen',
      named: 2008, namedBy: 'Novas and colleagues',
      blurb: 'A large southern raptor with short arms and a long, narrow snout for catching fish.',
      traits: ['Long crocodile-like snout', 'Short arms for a raptor', 'Conical teeth'],
      facts: ['Its fish-friendly teeth are unusual among raptors.', 'It is one of the largest dromaeosaurs.'],
      uncertain: 'How much it fished versus hunted on land is inferred from its teeth.',
      howKnow: 'A partial skeleton from Patagonia.'
    },
    {
      id: 'minmi', name: 'Minmi paravertebra', common: 'Minmi',
      say: 'MIN-mee', meaning: 'named for Minmi Crossing',
      group: 'ornithischian', clade: 'Ankylosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 119, myaLo: 113,
      lengthM: 3, heightM: 1, weightKg: 300, speedKmh: 12,
      region: 'Australia', formation: 'Bungil',
      named: 1980, namedBy: 'Ralph Molnar',
      blurb: 'A small armored dinosaur from Australia, with one of the shortest names of any dinosaur.',
      traits: ['Body armor', 'Small and low-slung', 'Preserved gut contents'],
      facts: ['Its gut contents reveal a diet of fruit, seeds, and ferns.', 'Its name is among the shortest in all of dinosaur science.'],
      uncertain: 'Its exact place among ankylosaurs has shifted with study.',
      howKnow: 'A well-preserved skeleton with stomach contents from Queensland.'
    },
    {
      id: 'leaellynasaura', name: 'Leaellynasaura amicagraphica', common: 'Leaellynasaura',
      say: 'lee-ELL-in-uh-SOR-uh', meaning: 'Leaellyn’s lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 118, myaLo: 110,
      lengthM: 1, heightM: 0.3, weightKg: 5, speedKmh: 30,
      region: 'Australia', formation: 'Eumeralla',
      named: 1989, namedBy: 'Tom Rich & Patricia Vickers-Rich',
      blurb: 'A small plant-eater that lived near the South Pole, enduring months of winter darkness.',
      traits: ['Large eyes for dim light', 'Very long tail', 'Lived in polar forests'],
      facts: ['Polar Australia was dark and cold for part of the year.', 'Large eye sockets hint at coping with long winter nights.'],
      uncertain: 'How it survived the dark winters is inferred.',
      howKnow: 'Fossils from the polar "Dinosaur Cove" site in Victoria, Australia.'
    },
    {
      id: 'muttaburrasaurus', name: 'Muttaburrasaurus langdoni', common: 'Muttaburrasaurus',
      say: 'MUT-uh-BUR-uh-SOR-us', meaning: 'Muttaburra lizard',
      group: 'ornithischian', clade: 'Iguanodontia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 112, myaLo: 100,
      lengthM: 8, heightM: 3, weightKg: 2800, speedKmh: 22,
      region: 'Australia', formation: 'Mackunda',
      named: 1981, namedBy: 'Bartholomai & Molnar',
      blurb: 'A large Australian plant-eater with a hollow bump on its snout that may have boosted its calls.',
      traits: ['Inflated nasal bump', 'Shearing teeth', 'Could walk on two or four legs'],
      facts: ['The nose bump may have made its calls louder.', 'It is one of Australia’s best-known dinosaurs.'],
      uncertain: 'The nasal bump’s exact function is inferred from its hollow shape.',
      howKnow: 'A partial skeleton and skull from Queensland.'
    },
    {
      id: 'daspletosaurus', name: 'Daspletosaurus torosus', common: 'Daspletosaurus',
      say: 'das-PLEE-tuh-SOR-us', meaning: 'frightful lizard',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 74,
      lengthM: 9, heightM: 2.9, weightKg: 2500, speedKmh: 30,
      region: 'North America', formation: 'Oldman',
      named: 1970, namedBy: 'Dale Russell',
      blurb: 'A robust tyrannosaur that lived alongside the lighter Gorgosaurus, an early relative of T. rex.',
      traits: ['Heavy-built tyrannosaur', 'Large teeth', 'Possible group behavior'],
      facts: ['Bonebeds hint it may have lived in groups.', 'Bite marks suggest face-biting among its own kind.'],
      uncertain: 'Whether it hunted cooperatively is debated.',
      howKnow: 'Several skeletons and bonebeds from Alberta and Montana.'
    },
    {
      id: 'carcharodontosaurus', name: 'Carcharodontosaurus saharicus', common: 'Carcharodontosaurus',
      say: 'kar-KAR-uh-DON-tuh-SOR-us', meaning: 'shark-toothed lizard',
      group: 'theropod', clade: 'Carcharodontosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 99, myaLo: 94,
      lengthM: 12.5, heightM: 3.6, weightKg: 7000, speedKmh: 32,
      region: 'Africa (North Africa)', formation: 'Kem Kem',
      named: 1931, namedBy: 'Ernst Stromer',
      blurb: 'A T. rex-sized predator with serrated, shark-like teeth that shared its world with Spinosaurus.',
      traits: ['Blade-like serrated teeth', 'Huge thin skull', 'Lived beside Spinosaurus'],
      facts: ['Its original fossils were destroyed in World War II, like those of Spinosaurus.', 'It is one of the largest land predators known.'],
      uncertain: 'How several giant predators shared the same river system is studied through diet differences.',
      howKnow: 'Skull and skeletal material from North Africa, after the originals were lost.'
    },
    {
      id: 'mapusaurus', name: 'Mapusaurus roseae', common: 'Mapusaurus',
      say: 'MAH-puh-SOR-us', meaning: 'earth lizard',
      group: 'theropod', clade: 'Carcharodontosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 100, myaLo: 96,
      lengthM: 12, heightM: 3.5, weightKg: 6000, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Huincul',
      named: 2006, namedBy: 'Coria & Currie',
      blurb: 'A giant carcharodontosaur found in a bonebed, raising the idea it hunted in groups.',
      traits: ['Shark-toothed skull', 'Found in a multi-animal bonebed', 'Close cousin of Giganotosaurus'],
      facts: ['Several individuals were found together, hinting at pack hunting of giant sauropods.', 'It lived near the giant Argentinosaurus.'],
      uncertain: 'Whether the bonebed means cooperative hunting or just a shared trap is debated.',
      howKnow: 'A bonebed of many individuals in Patagonia.'
    },
    {
      id: 'torvosaurus', name: 'Torvosaurus tanneri', common: 'Torvosaurus',
      say: 'TOR-vuh-SOR-us', meaning: 'savage lizard',
      group: 'theropod', clade: 'Megalosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 153, myaLo: 148,
      lengthM: 10, heightM: 3, weightKg: 2000, speedKmh: 28,
      region: 'North America', formation: 'Morrison',
      named: 1979, namedBy: 'Galton & Jensen',
      blurb: 'One of the largest Jurassic land predators, sharing the Morrison world with Allosaurus.',
      traits: ['Large megalosaur', 'Strong arms', 'Big blade teeth'],
      facts: ['It was likely the biggest predator in its environment.', 'A European species is also known from Portugal.'],
      uncertain: 'Top size estimates come from incomplete remains.',
      howKnow: 'Partial skeletons from the western United States and Portugal.'
    },
    {
      id: 'saurophaganax', name: 'Saurophaganax maximus', common: 'Saurophaganax',
      say: 'sor-uh-FAG-uh-naks', meaning: 'lord of lizard-eaters',
      group: 'theropod', clade: 'Allosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 150,
      lengthM: 10.5, heightM: 3.2, weightKg: 3000, speedKmh: 30,
      region: 'North America', formation: 'Morrison',
      named: 1995, namedBy: 'Daniel Chure',
      blurb: 'A giant allosaur-like predator, possibly the largest meat-eater of the Jurassic Morrison world.',
      traits: ['Very large allosaur', 'Blade-like teeth', 'Top Jurassic predator'],
      facts: ['It may be a giant species of Allosaurus rather than its own genus.', 'It topped the Morrison food web.'],
      uncertain: 'Whether it is a separate genus or a big Allosaurus is debated.',
      howKnow: 'Bones from Oklahoma, still being sorted from Allosaurus.'
    },
    {
      id: 'sinraptor', name: 'Sinraptor dongi', common: 'Sinraptor',
      say: 'SINE-rap-tor', meaning: 'Chinese plunderer',
      group: 'theropod', clade: 'Metriacanthosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 160, myaLo: 155,
      lengthM: 7.5, heightM: 2.5, weightKg: 1500, speedKmh: 30,
      region: 'Asia (China)', formation: 'Shishugou',
      named: 1993, namedBy: 'Currie & Zhao',
      blurb: 'A large Chinese predator, not a true "raptor" despite the name, with face-bite scars from rivals.',
      traits: ['Tall, narrow skull', 'Blade-like teeth', 'Face-biting scars'],
      facts: ['Healed bite marks on its face suggest fights with its own kind.', 'The name "raptor" here means plunderer, not the small sickle-clawed kind.'],
      uncertain: 'Whether face-biting was for mating or territory is inferred.',
      howKnow: 'Good skeletons from Jurassic China.'
    },
    {
      id: 'guanlong', name: 'Guanlong wucaii', common: 'Guanlong',
      say: 'GWAN-long', meaning: 'crowned dragon',
      group: 'theropod', clade: 'Tyrannosauroidea', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 161, myaLo: 155,
      lengthM: 3, heightM: 1, weightKg: 70, speedKmh: 38,
      region: 'Asia (China)', formation: 'Shishugou',
      named: 2006, namedBy: 'Xu Xing and colleagues',
      blurb: 'An early, small tyrannosaur with a thin showy head crest, tens of millions of years before T. rex.',
      traits: ['Fragile head crest', 'Long arms (for a tyrannosaur)', 'Small and slender'],
      facts: ['It shows tyrannosaurs started small and crested.', 'Two skeletons were found stacked in a mud trap.'],
      uncertain: 'The delicate crest was likely for display, judged from its thin bone.',
      howKnow: 'Two skeletons from a Jurassic mud pit in China.'
    },
    {
      id: 'ornitholestes', name: 'Ornitholestes hermanni', common: 'Ornitholestes',
      say: 'or-NITH-uh-LES-teez', meaning: 'bird robber',
      group: 'theropod', clade: 'Coelurosauria', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 150,
      lengthM: 2, heightM: 0.6, weightKg: 12, speedKmh: 40,
      region: 'North America', formation: 'Morrison',
      named: 1903, namedBy: 'Henry Fairfield Osborn',
      blurb: 'A small, lightly built Jurassic predator with grasping hands and a long tail.',
      traits: ['Slender, agile build', 'Grasping three-fingered hands', 'Long balancing tail'],
      facts: ['Despite its name, there is no proof it caught birds.', 'It hunted small prey in the shadow of Allosaurus.'],
      uncertain: 'Its diet is inferred from size and teeth.',
      howKnow: 'A partial skeleton from the Morrison Formation.'
    },
    {
      id: 'masiakasaurus', name: 'Masiakasaurus knopfleri', common: 'Masiakasaurus',
      say: 'mah-SHEE-kuh-SOR-us', meaning: 'vicious lizard',
      group: 'theropod', clade: 'Noasauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 2, heightM: 0.7, weightKg: 20, speedKmh: 35,
      region: 'Africa (Madagascar)', formation: 'Maevarano',
      named: 2001, namedBy: 'Sampson, Carrano & Forster',
      blurb: 'A small predator with forward-jutting front teeth, perhaps for spearing fish or grabbing small prey.',
      traits: ['Forward-pointing front teeth', 'Small and slender', 'Lived with Majungasaurus'],
      facts: ['It is named after musician Mark Knopfler.', 'Its odd teeth are unlike almost any other dinosaur.'],
      uncertain: 'Whether the jutting teeth grabbed fish, fruit, or small animals is inferred.',
      howKnow: 'Skull and skeletal pieces from Madagascar.'
    },
    {
      id: 'scipionyx', name: 'Scipionyx samniticus', common: 'Scipionyx',
      say: 'skip-ee-ON-iks', meaning: 'Scipio’s claw',
      group: 'theropod', clade: 'Compsognathidae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 113, myaLo: 110,
      lengthM: 0.5, heightM: 0.15, weightKg: 1, speedKmh: 25,
      region: 'Europe (Italy)', formation: 'Pietraroia',
      named: 1998, namedBy: 'Dal Sasso & Signore',
      blurb: 'A hatchling predator from Italy that preserves rare internal organs, down to the intestines.',
      traits: ['Preserved internal organs', 'Tiny hatchling', 'Sharp little teeth'],
      facts: ['Soft-tissue preservation shows muscle, gut, and even windpipe.', 'It is one of the best-preserved dinosaurs ever found.'],
      uncertain: 'Adult size is unknown because only a baby is preserved.',
      howKnow: 'A single, extraordinary baby skeleton from Italy.'
    },
    {
      id: 'bambiraptor', name: 'Bambiraptor feinbergi', common: 'Bambiraptor',
      say: 'BAM-bee-RAP-tor', meaning: 'Bambi thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 1, heightM: 0.3, weightKg: 3, speedKmh: 45,
      region: 'North America', formation: 'Two Medicine',
      named: 2000, namedBy: 'Burnham and colleagues',
      blurb: 'A tiny, bird-like raptor with a large brain for its size, found by a teenager.',
      traits: ['Large brain for its size', 'Sickle claw', 'Very bird-like skeleton'],
      facts: ['It was discovered by a 14-year-old fossil hunter.', 'Its brain-to-body ratio approaches that of some birds.'],
      uncertain: 'The known skeleton is a juvenile, so adult features are estimated.',
      howKnow: 'A well-preserved juvenile from Montana.'
    },
    {
      id: 'zhenyuanlong', name: 'Zhenyuanlong suni', common: 'Zhenyuanlong',
      say: 'jen-yoo-AN-long', meaning: 'Zhenyuan’s dragon',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 1.7, heightM: 0.5, weightKg: 20, speedKmh: 38,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2015, namedBy: 'Lü & Brusatte',
      blurb: 'A short-armed raptor preserved with big, complex wings, even though it could not fly.',
      traits: ['Large layered wing feathers', 'Short arms', 'Flightless'],
      facts: ['It had bird-like wings without the power of flight.', 'It shows wings evolved for reasons other than flying.'],
      uncertain: 'Whether wing feathers helped with display, brooding, or balance is inferred.',
      howKnow: 'A beautifully feathered skeleton from China.'
    },
    {
      id: 'anzu', name: 'Anzu wyliei', common: 'Anzu',
      say: 'AN-zoo', meaning: 'named for a feathered demon',
      group: 'theropod', clade: 'Caenagnathidae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66,
      lengthM: 3.5, heightM: 1.5, weightKg: 230, speedKmh: 35,
      region: 'North America', formation: 'Hell Creek',
      named: 2014, namedBy: 'Lamanna and colleagues',
      blurb: 'A tall, feathered, beaked dinosaur nicknamed the "chicken from hell", living right before the impact.',
      traits: ['Tall head crest', 'Toothless beak', 'Long clawed arms'],
      facts: ['It is one of the best-known North American oviraptorosaurs.', 'It lived alongside T. rex and Triceratops.'],
      uncertain: 'Its mixed diet of plants and small animals is inferred from its beak.',
      howKnow: 'Several partial skeletons from the northern Great Plains.'
    },
    {
      id: 'beipiaosaurus', name: 'Beipiaosaurus inexpectus', common: 'Beipiaosaurus',
      say: 'bay-PYOW-zuh-SOR-us', meaning: 'Beipiao lizard',
      group: 'theropod', clade: 'Therizinosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 2.2, heightM: 0.9, weightKg: 60, speedKmh: 18,
      region: 'Asia (China)', formation: 'Yixian',
      named: 1999, namedBy: 'Xu, Tang & Wang',
      blurb: 'An early therizinosaur preserved with feathers, including stiff broad ones unlike any modern feather.',
      traits: ['Feathers, including broad filaments', 'Leaf-shaped teeth', 'Long hand claws'],
      facts: ['It shows the plant-eating therizinosaurs were feathered early on.', 'Its broad filament feathers are unusual.'],
      uncertain: 'The function of its stiff broad feathers is inferred.',
      howKnow: 'Feathered specimens from China’s Jehol beds.'
    },
    {
      id: 'supersaurus', name: 'Supersaurus vivianae', common: 'Supersaurus',
      say: 'SOO-per-SOR-us', meaning: 'super lizard',
      group: 'sauropod', clade: 'Diplodocidae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 145,
      lengthM: 34, heightM: 7, weightKg: 35000, speedKmh: 14,
      region: 'North America', formation: 'Morrison',
      named: 1985, namedBy: 'James Jensen',
      blurb: 'One of the longest dinosaurs known, a diplodocid that may have stretched past 30 meters.',
      traits: ['Extremely long body', 'Whip-like tail', 'Long neck'],
      facts: ['Length estimates make it a contender for the longest dinosaur.', 'It is a giant cousin of Diplodocus.'],
      uncertain: 'The very longest estimates rest on scaling from partial remains.',
      howKnow: 'Partial skeletons from the Morrison Formation.'
    },
    {
      id: 'patagotitan', name: 'Patagotitan mayorum', common: 'Patagotitan',
      say: 'PAT-uh-goh-TIE-tan', meaning: 'Patagonian titan',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 102, myaLo: 95,
      lengthM: 31, heightM: 11, weightKg: 57000, speedKmh: 8,
      region: 'South America (Argentina)', formation: 'Cerro Barcino',
      named: 2017, namedBy: 'Carballido and colleagues',
      blurb: 'A titanosaur giant known from many bones, helping anchor estimates of the largest dinosaurs.',
      traits: ['Among the largest land animals ever', 'Many bones from several individuals', 'Long neck and tail'],
      facts: ['A cast of it stands so large its head pokes out of a museum hall.', 'Its many bones make its size more reliable than most giants.'],
      uncertain: 'Even with good material, mass figures span a wide range.',
      howKnow: 'Bones from at least six individuals in Patagonia.'
    },
    {
      id: 'giraffatitan', name: 'Giraffatitan brancai', common: 'Giraffatitan',
      say: 'jih-RAF-uh-TIE-tan', meaning: 'giant giraffe',
      group: 'sauropod', clade: 'Brachiosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 152, myaLo: 145,
      lengthM: 23, heightM: 12, weightKg: 35000, speedKmh: 14,
      region: 'Africa (Tanzania)', formation: 'Tendaguru',
      named: 1914, namedBy: 'Werner Janensch',
      blurb: 'A giraffe-postured African giant whose mounted skeleton in Berlin is among the tallest in any museum.',
      traits: ['Longer front legs', 'Tall nasal arch', 'Held its head very high'],
      facts: ['Its Berlin skeleton is one of the tallest mounted dinosaurs.', 'It was long classified as an African Brachiosaurus.'],
      uncertain: 'Whether it is its own genus or a Brachiosaurus species has shifted over time.',
      howKnow: 'Excellent skeletons from the German Tendaguru expeditions.'
    },
    {
      id: 'mamenchisaurus2', name: 'Shunosaurus lii', common: 'Shunosaurus',
      say: 'SHOO-nuh-SOR-us', meaning: 'Shu lizard',
      group: 'sauropod', clade: 'Mamenchisauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 170, myaLo: 160,
      lengthM: 9.5, heightM: 3, weightKg: 3000, speedKmh: 12,
      region: 'Asia (China)', formation: 'Lower Shaximiao',
      named: 1983, namedBy: 'Dong, Zhou & Zhang',
      blurb: 'A short-necked sauropod with a rare feature: a small bony club on the end of its tail.',
      traits: ['Tail club (rare in sauropods)', 'Short neck', 'Stocky body'],
      facts: ['Few sauropods had tail weapons; this is a famous exception.', 'It is known from many good skeletons.'],
      uncertain: 'Whether the tail club was used for defense or display is inferred.',
      howKnow: 'Many skeletons from Jurassic China.'
    },
    {
      id: 'europasaurus', name: 'Europasaurus holgeri', common: 'Europasaurus',
      say: 'yoo-ROH-puh-SOR-us', meaning: 'Europe lizard',
      group: 'sauropod', clade: 'Brachiosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 154, myaLo: 151,
      lengthM: 6.2, heightM: 2, weightKg: 800, speedKmh: 12,
      region: 'Europe (Germany)', formation: 'Langenberg',
      named: 2006, namedBy: 'Sander and colleagues',
      blurb: 'A dwarf sauropod that shrank on a Jurassic island, a clear case of island dwarfism.',
      traits: ['Tiny for a sauropod', 'Island dweller', 'Slow growth'],
      facts: ['Limited island food shrank its lineage over generations.', 'Bone studies confirm these are small adults, not babies.'],
      uncertain: 'Exact island geography is reconstructed from the rock record.',
      howKnow: 'Many bones of all ages from a German quarry.'
    },
    {
      id: 'dreadnoughtus', name: 'Dreadnoughtus schrani', common: 'Dreadnoughtus',
      say: 'dred-NOT-us', meaning: 'fears nothing',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 84, myaLo: 76,
      lengthM: 26, heightM: 9, weightKg: 49000, speedKmh: 8,
      region: 'South America (Argentina)', formation: 'Cerro Fortaleza',
      named: 2014, namedBy: 'Kenneth Lacovara and colleagues',
      blurb: 'A titanosaur giant known from an unusually complete skeleton, helping pin down how massive these animals were.',
      traits: ['Huge body with a long neck and tail', 'One of the most complete giant sauropods', 'Still growing when it died'],
      facts: ['About 70 percent of its skeleton (minus the head) was found.', 'Its completeness makes its weight estimate more reliable than most giants.'],
      uncertain: 'Even here, mass estimates were revised downward as methods improved.',
      howKnow: 'An exceptionally complete titanosaur skeleton.'
    },
    {
      id: 'argentino2', name: 'Futalognkosaurus dukei', common: 'Futalognkosaurus',
      say: 'FOO-tuh-long-kuh-SOR-us', meaning: 'giant chief lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 87,
      lengthM: 30, heightM: 11, weightKg: 50000, speedKmh: 8,
      region: 'South America (Argentina)', formation: 'Portezuelo',
      named: 2007, namedBy: 'Calvo and colleagues',
      blurb: 'A giant titanosaur known from a fairly complete skeleton, helping anchor estimates of the largest dinosaurs.',
      traits: ['Huge titanosaur', 'Tall neck spines', 'Broad hips'],
      facts: ['Its relatively complete remains make its size estimate firmer.', 'It was found near a rich fossil lake bed.'],
      uncertain: 'Even so, its exact mass spans a range.',
      howKnow: 'A largely complete skeleton from Patagonia.'
    },
    {
      id: 'jobaria', name: 'Jobaria tiguidensis', common: 'Jobaria',
      say: 'joh-BAR-ee-uh', meaning: 'for the creature Jobar',
      group: 'sauropod', clade: 'Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 167, myaLo: 161,
      lengthM: 18, heightM: 6, weightKg: 18000, speedKmh: 14,
      region: 'Africa (Niger)', formation: 'Tiouraren',
      named: 1999, namedBy: 'Paul Sereno and colleagues',
      blurb: 'A primitive, sturdy African sauropod found as a near-complete skeleton in the Sahara.',
      traits: ['Spoon-shaped teeth', 'Simple, sturdy build', 'Relatively short neck'],
      facts: ['Its skeleton is unusually complete for a sauropod.', 'Local legend named a creature "Jobar" from these bones.'],
      uncertain: 'Its exact family relationships are still studied.',
      howKnow: 'A largely complete skeleton from Niger.'
    },
    {
      id: 'pentaceratops', name: 'Pentaceratops sternbergii', common: 'Pentaceratops',
      say: 'PEN-tuh-SERR-uh-tops', meaning: 'five-horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 73,
      lengthM: 6.5, heightM: 2.5, weightKg: 5000, speedKmh: 25,
      region: 'North America', formation: 'Kirtland',
      named: 1923, namedBy: 'Henry Fairfield Osborn',
      blurb: 'A horned dinosaur with one of the largest skulls of any land animal, frill included.',
      traits: ['Enormous frill', 'Three main horns plus cheek bumps', 'Heavy body'],
      facts: ['Its skull, with frill, can be about 3 meters long.', 'The "five horns" count includes the cheek spikes.'],
      uncertain: 'How much the giant frill was for display versus defense is debated.',
      howKnow: 'Several skulls from New Mexico.'
    },
    {
      id: 'kosmoceratops', name: 'Kosmoceratops richardsoni', common: 'Kosmoceratops',
      say: 'KOZ-moh-SERR-uh-tops', meaning: 'ornate horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 4.5, heightM: 1.7, weightKg: 1500, speedKmh: 25,
      region: 'North America', formation: 'Kaiparowits',
      named: 2010, namedBy: 'Sampson and colleagues',
      blurb: 'A horned dinosaur with one of the most decorated skulls known, with ten frill hornlets curling down.',
      traits: ['Row of curling frill horns', 'Broad brow horns', 'Showy skull'],
      facts: ['Its elaborate frill was almost certainly for display.', 'It lived on the lost continent of Laramidia.'],
      uncertain: 'Display function is inferred from the impractical, ornate shape.',
      howKnow: 'Skulls from southern Utah.'
    },
    {
      id: 'nasutoceratops', name: 'Nasutoceratops titusi', common: 'Nasutoceratops',
      say: 'nuh-SOO-toh-SERR-uh-tops', meaning: 'big-nosed horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 4.5, heightM: 1.7, weightKg: 1500, speedKmh: 25,
      region: 'North America', formation: 'Kaiparowits',
      named: 2013, namedBy: 'Sampson and colleagues',
      blurb: 'A horned dinosaur with a big nose and long brow horns that curved forward like a cattle’s.',
      traits: ['Large nasal region', 'Long forward-curving brow horns', 'Short nose horn'],
      facts: ['Its horns look strikingly like those of modern cattle.', 'It also lived on Laramidia.'],
      uncertain: 'Why its nose was so enlarged is unknown; smell is one guess.',
      howKnow: 'Skull material from southern Utah.'
    },
    {
      id: 'einiosaurus', name: 'Einiosaurus procurvicornis', common: 'Einiosaurus',
      say: 'eye-NEE-uh-SOR-us', meaning: 'buffalo lizard',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 74,
      lengthM: 4.5, heightM: 1.6, weightKg: 1300, speedKmh: 25,
      region: 'North America', formation: 'Two Medicine',
      named: 1995, namedBy: 'Scott Sampson',
      blurb: 'A horned dinosaur whose nose horn curved forward like a can opener, with two long frill spikes.',
      traits: ['Forward-curving nose horn', 'Two long frill spikes', 'Herd animal'],
      facts: ['It is part of a sequence showing how horned dinosaurs evolved over time.', 'Bonebeds preserve whole herds.'],
      uncertain: 'How its odd horn was used is inferred.',
      howKnow: 'Bonebeds in Montana.'
    },
    {
      id: 'dryosaurus', name: 'Dryosaurus altus', common: 'Dryosaurus',
      say: 'DRY-uh-SOR-us', meaning: 'tree lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 145,
      lengthM: 3, heightM: 1, weightKg: 90, speedKmh: 35,
      region: 'North America', formation: 'Morrison',
      named: 1894, namedBy: 'Othniel Charles Marsh',
      blurb: 'A swift, long-legged plant-eater built to outrun the big Jurassic predators.',
      traits: ['Long running legs', 'Beak with no front teeth', 'Stiff tail'],
      facts: ['Its build suggests speed was its main defense.', 'Growth series show how it changed as it aged.'],
      uncertain: 'Herd behavior is inferred from multiple finds, not proven.',
      howKnow: 'Several skeletons including young animals.'
    },
    {
      id: 'camptosaurus', name: 'Camptosaurus dispar', common: 'Camptosaurus',
      say: 'KAMP-tuh-SOR-us', meaning: 'bent lizard',
      group: 'ornithischian', clade: 'Iguanodontia', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 145,
      lengthM: 5, heightM: 1.8, weightKg: 800, speedKmh: 22,
      region: 'North America', formation: 'Morrison',
      named: 1885, namedBy: 'Othniel Charles Marsh',
      blurb: 'A sturdy plant-eater, an early relative of Iguanodon, common in the Jurassic of North America.',
      traits: ['Beak and grinding teeth', 'Could walk on two or four legs', 'Stocky build'],
      facts: ['It is one of the best-known Jurassic ornithopods.', 'It foreshadows the later success of the iguanodonts.'],
      uncertain: 'Several named species may collapse into fewer with study.',
      howKnow: 'Many skeletons from the Morrison Formation.'
    },
    {
      id: 'gryposaurus', name: 'Gryposaurus notabilis', common: 'Gryposaurus',
      say: 'GRIP-uh-SOR-us', meaning: 'hook-nosed lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 80, myaLo: 75,
      lengthM: 9, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1914, namedBy: 'Lawrence Lambe',
      blurb: 'A duck-billed dinosaur with a distinctive arched, "Roman nose" bump on its snout.',
      traits: ['Arched nasal hump', 'No hollow crest', 'Grinding tooth batteries'],
      facts: ['The nose bump may have been for display or species recognition.', 'Skin impressions are known for it.'],
      uncertain: 'Whether the nose differed by sex is uncertain.',
      howKnow: 'Several skulls and skeletons, some with skin.'
    },
    {
      id: 'saurolophus', name: 'Saurolophus osborni', common: 'Saurolophus',
      say: 'sor-OL-uh-fus', meaning: 'crested lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 68,
      lengthM: 9.8, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'North America', formation: 'Horseshoe Canyon',
      named: 1912, namedBy: 'Barnum Brown',
      blurb: 'A duck-bill with a backward-pointing solid spike crest, known from both North America and Asia.',
      traits: ['Solid backward spike crest', 'Large duck-bill', 'Lived on two continents'],
      facts: ['It is one of the few dinosaurs found in both North America and Asia.', 'Its crest was solid, unlike the hollow-crested kinds.'],
      uncertain: 'Whether North American and Asian forms are the same is studied.',
      howKnow: 'Skeletons from Canada and Mongolia.'
    },
    {
      id: 'avimimus', name: 'Avimimus portentosus', common: 'Avimimus',
      say: 'AY-vih-MIME-us', meaning: 'bird mimic',
      group: 'theropod', clade: 'Oviraptorosauria', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 70,
      lengthM: 1.5, heightM: 0.6, weightKg: 15, speedKmh: 45,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 1981, namedBy: 'Sergei Kurzanov',
      blurb: 'A very bird-like feathered dinosaur with a beak and long legs, found in possible flocks.',
      traits: ['Beak and bird-like skull', 'Long running legs', 'Quill knobs on the arm'],
      facts: ['Bonebeds suggest it gathered in flocks.', 'It is so bird-like it was once thought to fly.'],
      uncertain: 'Its exact diet and lifestyle are inferred from its beak and legs.',
      howKnow: 'Several specimens, including bonebeds, from Mongolia.'
    },
    {
      id: 'incisivosaurus', name: 'Incisivosaurus gauthieri', common: 'Incisivosaurus',
      say: 'in-SY-zih-vuh-SOR-us', meaning: 'incisor lizard',
      group: 'theropod', clade: 'Oviraptorosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 126, myaLo: 122,
      lengthM: 0.9, heightM: 0.3, weightKg: 4, speedKmh: 30,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2002, namedBy: 'Xu Xing and colleagues',
      blurb: 'A small early oviraptorosaur with big buck teeth, hinting these dinosaurs started as plant-eaters.',
      traits: ['Prominent front teeth', 'Small and light', 'Likely feathered'],
      facts: ['Its rabbit-like teeth suggest a plant diet.', 'It helps trace how the beaked oviraptorosaurs arose.'],
      uncertain: 'How its diet shifted within the group is inferred from teeth.',
      howKnow: 'A skull and partial skeleton from China.'
    },
    {
      id: 'falcarius', name: 'Falcarius utahensis', common: 'Falcarius',
      say: 'fal-KAR-ee-us', meaning: 'sickle maker',
      group: 'theropod', clade: 'Therizinosauria', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 125,
      lengthM: 4, heightM: 1.5, weightKg: 100, speedKmh: 22,
      region: 'North America', formation: 'Cedar Mountain',
      named: 2005, namedBy: 'Kirkland and colleagues',
      blurb: 'A primitive therizinosaur caught mid-evolution, between meat-eating ancestors and plant-eating cousins.',
      traits: ['Mix of sharp and leaf-shaped teeth', 'Long neck', 'Curved hand claws'],
      facts: ['It captures a diet shift from meat toward plants.', 'Thousands of bones were found in a Utah quarry.'],
      uncertain: 'Exactly what it ate during this transition is inferred from mixed teeth.',
      howKnow: 'A huge bonebed of many individuals in Utah.'
    },
    {
      id: 'yangchuanosaurus', name: 'Yangchuanosaurus shangyouensis', common: 'Yangchuanosaurus',
      say: 'yang-choo-AHN-uh-SOR-us', meaning: 'Yangchuan lizard',
      group: 'theropod', clade: 'Metriacanthosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 160, myaLo: 155,
      lengthM: 8, heightM: 2.6, weightKg: 1700, speedKmh: 30,
      region: 'Asia (China)', formation: 'Shangshaximiao',
      named: 1978, namedBy: 'Dong and colleagues',
      blurb: 'A large Jurassic predator of China, the top hunter of its plant-eating sauropod neighbors.',
      traits: ['Big-headed predator', 'Bladed teeth', 'Close cousin of Sinraptor'],
      facts: ['It hunted the long-necked sauropods of Jurassic China.', 'It is among the best-known Chinese theropods.'],
      uncertain: 'Its top size estimates rest on a few large specimens.',
      howKnow: 'Good skeletons from Jurassic China.'
    },
    {
      id: 'brontosaurus', name: 'Brontosaurus excelsus', common: 'Brontosaurus',
      say: 'BRON-tuh-SOR-us', meaning: 'thunder lizard',
      group: 'sauropod', clade: 'Diplodocidae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 156, myaLo: 147,
      lengthM: 22, heightM: 4.5, weightKg: 17000, speedKmh: 16,
      region: 'North America', formation: 'Morrison',
      named: 1879, namedBy: 'Othniel Charles Marsh',
      blurb: 'The famous "thunder lizard", lumped into Apatosaurus for a century and revived as its own genus in 2015.',
      traits: ['Long neck and tail', 'Stocky for a diplodocid', 'Peg-like teeth'],
      facts: ['Its name vanished from science in 1903 and returned in 2015.', 'It is a textbook case of how classifications change.'],
      uncertain: 'Whether it truly differs enough from Apatosaurus is still discussed.',
      howKnow: 'Several skeletons, reanalyzed in a large 2015 study.'
    },
    {
      id: 'kulindadromeus', name: 'Kulindadromeus zabaikalicus', common: 'Kulindadromeus',
      say: 'koo-LIN-duh-DROM-ee-us', meaning: 'Kulinda runner',
      group: 'ornithischian', clade: 'Ornithischia', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 170, myaLo: 165,
      lengthM: 1.5, heightM: 0.4, weightKg: 9, speedKmh: 35,
      region: 'Asia (Russia, Siberia)', formation: 'Ukureyskaya',
      named: 2014, namedBy: 'Godefroit and colleagues',
      blurb: 'A small plant-eater that stunned scientists by showing feather-like fuzz on a bird-hipped dinosaur.',
      traits: ['Simple fuzzy filaments', 'Fast runner', 'Beak and small teeth'],
      facts: ['It hinted that feather-like coverings may be very ancient across dinosaurs.', 'Most known feathered dinosaurs are theropods; this one is not.'],
      uncertain: 'Whether all dinosaurs could grow fuzz, or only some, is an open question.',
      howKnow: 'Many specimens from a Siberian lake deposit.'
    },
    {
      id: 'yi', name: 'Yi qi', common: 'Yi',
      say: 'EE chee', meaning: 'strange wing',
      group: 'theropod', clade: 'Scansoriopterygidae', diet: 'insectivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 163, myaLo: 159,
      lengthM: 0.6, heightM: 0.2, weightKg: 0.4, speedKmh: 0,
      region: 'Asia (China)', formation: 'Tiaojishan',
      named: 2015, namedBy: 'Xu Xing and colleagues',
      blurb: 'A pigeon-sized oddity with bat-like skin wings instead of feathered ones, a failed flight experiment.',
      traits: ['Membrane (skin) wings', 'Long rod-like wrist bone', 'Some feathers too'],
      facts: ['Its name is one of the shortest in all of science.', 'It shows dinosaurs tried more than one way to get airborne.'],
      uncertain: 'Whether it flapped, glided, or barely flew at all is still modeled.',
      howKnow: 'A couple of specimens with rare membrane traces.'
    },
    {
      id: 'halszkaraptor', name: 'Halszkaraptor escuilliei', common: 'Halszkaraptor',
      say: 'HALSH-kuh-RAP-tor', meaning: 'Halszka’s thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'piscivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 0.6, heightM: 0.2, weightKg: 1, speedKmh: 20,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 2017, namedBy: 'Cau and colleagues',
      blurb: 'A duck-necked raptor that may have swum and snapped up fish, like a tiny dinosaur waterbird.',
      traits: ['Long swan-like neck', 'Flipper-like forelimbs', 'Many small teeth'],
      facts: ['It was studied with X-ray scanning to avoid damaging the fossil.', 'It suggests some raptors took to the water.'],
      uncertain: 'How aquatic it really was is inferred from its build, not behavior.',
      howKnow: 'A single skeleton, scanned in detail to confirm it is real.'
    },
    {
      id: 'rugops', name: 'Rugops primus', common: 'Rugops',
      say: 'ROO-gops', meaning: 'wrinkle face',
      group: 'theropod', clade: 'Abelisauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 99, myaLo: 95,
      lengthM: 6, heightM: 2, weightKg: 750, speedKmh: 28,
      region: 'Africa (Niger)', formation: 'Echkar',
      named: 2004, namedBy: 'Paul Sereno and colleagues',
      blurb: 'An African abelisaur with a wrinkled, pitted skull, possibly more scavenger than active hunter.',
      traits: ['Pitted skull surface', 'Short, weak teeth', 'Tiny arms'],
      facts: ['Rows of holes on its snout may have held skin or display structures.', 'Its weak jaws hint at scavenging.'],
      uncertain: 'Whether it hunted or scavenged is inferred from its lightweight skull.',
      howKnow: 'A skull from the Sahara of Niger.'
    },
    {
      id: 'tawa', name: 'Tawa hallae', common: 'Tawa',
      say: 'TAH-wah', meaning: 'named for a Hopi sun spirit',
      group: 'theropod', clade: 'early Theropoda', diet: 'carnivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 215, myaLo: 213,
      lengthM: 2, heightM: 0.7, weightKg: 15, speedKmh: 35,
      region: 'North America', formation: 'Chinle',
      named: 2009, namedBy: 'Nesbitt and colleagues',
      blurb: 'An early predator from New Mexico that helped show dinosaurs first arose in South America, then spread.',
      traits: ['Slender early theropod', 'Air-filled bones', 'Grasping hands'],
      facts: ['It mixes features of southern and northern early dinosaurs.', 'It supports a South American origin for dinosaurs.'],
      uncertain: 'Early dinosaur relationships keep being revised with new finds.',
      howKnow: 'Several skeletons from Ghost Ranch, New Mexico.'
    },
    {
      id: 'lesothosaurus', name: 'Lesothosaurus diagnosticus', common: 'Lesothosaurus',
      say: 'leh-SOO-too-SOR-us', meaning: 'Lesotho lizard',
      group: 'ornithischian', clade: 'early Ornithischia', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 199, myaLo: 189,
      lengthM: 1, heightM: 0.3, weightKg: 3, speedKmh: 35,
      region: 'Africa (Lesotho)', formation: 'Upper Elliot',
      named: 1978, namedBy: 'Peter Galton',
      blurb: 'A tiny, fast early plant-eater near the base of the bird-hipped dinosaur family tree.',
      traits: ['Small and lightly built', 'Leaf-shaped teeth', 'Long running legs'],
      facts: ['It helps show what the earliest ornithischians looked like.', 'It lived in a hot, seasonal landscape.'],
      uncertain: 'Its exact spot at the base of the tree is studied.',
      howKnow: 'Skulls and skeletons from southern Africa.'
    },
    {
      id: 'pisanosaurus', name: 'Pisanosaurus mertii', common: 'Pisanosaurus',
      say: 'pih-SAH-nuh-SOR-us', meaning: 'Pisano’s lizard',
      group: 'ornithischian', clade: 'early Ornithischia', diet: 'herbivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 229, myaLo: 221,
      lengthM: 1, heightM: 0.3, weightKg: 3, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Ischigualasto',
      named: 1967, namedBy: 'Rodolfo Casamiquela',
      blurb: 'A small Triassic plant-eater sometimes considered one of the earliest known ornithischians.',
      traits: ['Early plant-eating teeth', 'Small body', 'Lightly built'],
      facts: ['Its place among early dinosaurs is much debated.', 'It comes from the same beds as the first predators.'],
      uncertain: 'Whether it is a true ornithischian or a different reptile is argued.',
      howKnow: 'A single partial skeleton from Argentina.'
    },
    {
      id: 'turiasaurus', name: 'Turiasaurus riodevensis', common: 'Turiasaurus',
      say: 'TOO-ree-uh-SOR-us', meaning: 'Turia lizard',
      group: 'sauropod', clade: 'Turiasauria', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 150, myaLo: 145,
      lengthM: 28, heightM: 7, weightKg: 35000, speedKmh: 12,
      region: 'Europe (Spain)', formation: 'Villar del Arzobispo',
      named: 2006, namedBy: 'Royo-Torres and colleagues',
      blurb: 'One of the largest dinosaurs ever found in Europe, with a foot bone the size of a person.',
      traits: ['Giant European sauropod', 'Heart-shaped teeth', 'Massive limbs'],
      facts: ['It shows giant sauropods also roamed Jurassic Europe.', 'Its arm bone alone is about 1.8 meters long.'],
      uncertain: 'Mass estimates depend on scaling from partial remains.',
      howKnow: 'A partial skeleton from Spain.'
    },
    {
      id: 'puertasaurus', name: 'Puertasaurus reuili', common: 'Puertasaurus',
      say: 'PWER-tuh-SOR-us', meaning: 'Puerta’s lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 30, heightM: 11, weightKg: 60000, speedKmh: 8,
      region: 'South America (Argentina)', formation: 'Pari Aike',
      named: 2005, namedBy: 'Novas and colleagues',
      blurb: 'A titanosaur known from just four giant bones, including a back vertebra over a meter wide.',
      traits: ['Extremely broad vertebrae', 'Among the largest titanosaurs', 'Massive body'],
      facts: ['One vertebra is wider than a person is tall.', 'It is known from very little, so its size is an estimate.'],
      uncertain: 'With only four bones, its true size is highly uncertain.',
      howKnow: 'Four giant bones from Patagonia.'
    },
    {
      id: 'borealopelta', name: 'Borealopelta markmitchelli', common: 'Borealopelta',
      say: 'BOR-ee-al-uh-PEL-tuh', meaning: 'northern shield',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 113, myaLo: 110,
      lengthM: 5.5, heightM: 1.5, weightKg: 1300, speedKmh: 10,
      region: 'North America', formation: 'Clearwater',
      named: 2017, namedBy: 'Brown and colleagues',
      blurb: 'A spectacularly preserved armored dinosaur, almost a "dinosaur mummy", with skin and even color.',
      traits: ['Armor with skin still attached', 'Reddish countershaded color', 'Long shoulder spikes'],
      facts: ['Its color shows it was reddish on top and pale below, a camouflage pattern.', 'It was found by miners in an oil sands pit.'],
      uncertain: 'Why a heavily armored animal still needed camouflage suggests strong predators.',
      howKnow: 'One of the best-preserved dinosaurs ever, with skin and pigment.'
    },
    {
      id: 'oryctodromeus', name: 'Oryctodromeus cubicularis', common: 'Oryctodromeus',
      say: 'oh-RIK-toh-DROM-ee-us', meaning: 'digging runner',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 99, myaLo: 94,
      lengthM: 2.1, heightM: 0.6, weightKg: 30, speedKmh: 30,
      region: 'North America', formation: 'Blackleaf',
      named: 2007, namedBy: 'Varricchio and colleagues',
      blurb: 'The first dinosaur shown to dig burrows, found with two young inside a fossil den.',
      traits: ['Strong digging snout and shoulders', 'Burrowed underground', 'Cared for young in a den'],
      facts: ['An adult and two juveniles were found together in a sealed burrow.', 'It is the clearest evidence of dinosaur burrowing.'],
      uncertain: 'How common burrowing was among small dinosaurs is unknown.',
      howKnow: 'Skeletons preserved inside a fossil burrow in Montana.'
    },
    {
      id: 'tianyulong', name: 'Tianyulong confuciusi', common: 'Tianyulong',
      say: 'tee-AN-yoo-long', meaning: 'Tianyu dragon',
      group: 'ornithischian', clade: 'Heterodontosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 161, myaLo: 155,
      lengthM: 0.7, heightM: 0.2, weightKg: 2, speedKmh: 30,
      region: 'Asia (China)', formation: 'Various',
      named: 2009, namedBy: 'Zheng and colleagues',
      blurb: 'A small plant-eater preserved with long bristle-like filaments, more evidence of fuzz on bird-hipped dinosaurs.',
      traits: ['Long tail bristles', 'Tusk-like teeth', 'Small and light'],
      facts: ['Its bristles support the idea that fuzz was widespread among dinosaurs.', 'It is a relative of the tusked Heterodontosaurus.'],
      uncertain: 'Whether the bristles are true feather relatives is debated.',
      howKnow: 'A specimen with preserved filaments from China.'
    },
    {
      id: 'chasmosaurus', name: 'Chasmosaurus belli', common: 'Chasmosaurus',
      say: 'KAZ-muh-SOR-us', meaning: 'opening lizard',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 75,
      lengthM: 5, heightM: 1.8, weightKg: 2000, speedKmh: 25,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1914, namedBy: 'Lawrence Lambe',
      blurb: 'A horned dinosaur whose long frill had big openings, making it lighter than it looked.',
      traits: ['Long frill with large windows', 'Short brow horns', 'Beak and shearing teeth'],
      facts: ['The frill openings were covered by skin in life.', 'A baby Chasmosaurus is one of the most complete young ceratopsians known.'],
      uncertain: 'Frill skin color and patterns are unknown.',
      howKnow: 'Many skulls and a rare juvenile from Alberta.'
    },
    {
      id: 'nodosaurus', name: 'Nodosaurus textilis', common: 'Nodosaurus',
      say: 'NO-duh-SOR-us', meaning: 'knobbed lizard',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 100, myaLo: 94,
      lengthM: 5, heightM: 1.4, weightKg: 1500, speedKmh: 10,
      region: 'North America', formation: 'Frontier',
      named: 1889, namedBy: 'Othniel Charles Marsh',
      blurb: 'An armored dinosaur whose name gives the nodosaurs, the club-less branch of armored dinosaurs.',
      traits: ['Rows of bony armor', 'No tail club', 'Banded armor pattern'],
      facts: ['Nodosaurs relied on armor and spikes, not a tail club.', 'Its armor ran in regular bands across the back.'],
      uncertain: 'Some early material is fragmentary, complicating its study.',
      howKnow: 'Armor and skeletal pieces from the American West.'
    },
    {
      id: 'fukuiraptor', name: 'Fukuiraptor kitadaniensis', common: 'Fukuiraptor',
      say: 'foo-KOO-ee-RAP-tor', meaning: 'Fukui thief',
      group: 'theropod', clade: 'Megaraptora', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 127, myaLo: 121,
      lengthM: 4.5, heightM: 1.5, weightKg: 400, speedKmh: 35,
      region: 'Asia (Japan)', formation: 'Kitadani',
      named: 2000, namedBy: 'Azuma & Currie',
      blurb: 'Japan’s best-known predatory dinosaur, with big hand claws once mistaken for foot claws.',
      traits: ['Large curved hand claws', 'Light, fast build', 'Slender skull'],
      facts: ['Its big claws were first thought to be raptor foot claws.', 'It anchors Japan’s rich Fukui dinosaur sites.'],
      uncertain: 'Its exact place among predators is debated.',
      howKnow: 'Skeletal material from Fukui, Japan.'
    },
    {
      id: 'megaraptor', name: 'Megaraptor namunhuaiquii', common: 'Megaraptor',
      say: 'MEG-uh-RAP-tor', meaning: 'giant thief',
      group: 'theropod', clade: 'Megaraptora', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 84,
      lengthM: 8, heightM: 2.5, weightKg: 1000, speedKmh: 35,
      region: 'South America (Argentina)', formation: 'Portezuelo',
      named: 1998, namedBy: 'Novas',
      blurb: 'A slender predator with enormous sickle-shaped hand claws, not a giant raptor as first believed.',
      traits: ['Huge hand claws', 'Long, lightly built body', 'Strong arms'],
      facts: ['Its claws are on the hands, not the feet like true raptors.', 'It gives its name to the puzzling megaraptoran group.'],
      uncertain: 'Where megaraptorans fit among theropods is hotly debated.',
      howKnow: 'Partial skeletons from Patagonia.'
    },
    {
      id: 'cetiosaurus', name: 'Cetiosaurus oxoniensis', common: 'Cetiosaurus',
      say: 'SEE-tee-uh-SOR-us', meaning: 'whale lizard',
      group: 'sauropod', clade: 'Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 171, myaLo: 164,
      lengthM: 16, heightM: 4, weightKg: 11000, speedKmh: 14,
      region: 'Europe (England)', formation: 'Various',
      named: 1841, namedBy: 'Richard Owen',
      blurb: 'One of the first sauropods named, originally mistaken for a giant marine reptile, hence "whale lizard".',
      traits: ['Early, simple sauropod', 'Solid (less air-filled) bones', 'Long neck'],
      facts: ['Owen first thought its huge bones came from a sea creature.', 'It is among the earliest sauropods recognized by science.'],
      uncertain: 'Much historical "Cetiosaurus" material has been reassigned.',
      howKnow: 'English fossils important to the early history of the science.'
    },
    {
      id: 'mantellisaurus', name: 'Mantellisaurus atherfieldensis', common: 'Mantellisaurus',
      say: 'man-TELL-ih-SOR-us', meaning: 'Mantell’s lizard',
      group: 'ornithischian', clade: 'Iguanodontia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 126, myaLo: 122,
      lengthM: 7, heightM: 2.5, weightKg: 750, speedKmh: 24,
      region: 'Europe (England)', formation: 'Wessex',
      named: 2007, namedBy: 'Gregory Paul',
      blurb: 'A lighter cousin of Iguanodon, named for the man who first described Iguanodon, Gideon Mantell.',
      traits: ['Thumb spike', 'Lighter than Iguanodon', 'Long arms'],
      facts: ['Many famous "Iguanodon" skeletons are actually Mantellisaurus.', 'It honors the early fossil pioneer Gideon Mantell.'],
      uncertain: 'Sorting it from Iguanodon took careful re-study.',
      howKnow: 'Good skeletons from England and Belgium.'
    },
    {
      id: 'fukuisaurus', name: 'Fukuisaurus tetoriensis', common: 'Fukuisaurus',
      say: 'foo-KOO-ee-SOR-us', meaning: 'Fukui lizard',
      group: 'ornithischian', clade: 'Iguanodontia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 127, myaLo: 121,
      lengthM: 4.5, heightM: 1.6, weightKg: 400, speedKmh: 22,
      region: 'Asia (Japan)', formation: 'Kitadani',
      named: 2003, namedBy: 'Kobayashi & Azuma',
      blurb: 'A Japanese plant-eater from the rich Fukui dinosaur beds, a relative of Iguanodon.',
      traits: ['Beak and grinding teeth', 'Stiff upper jaw', 'Medium build'],
      facts: ['It is part of Japan’s growing dinosaur record.', 'Its jaw worked differently from most iguanodonts.'],
      uncertain: 'Its exact relationships are still studied.',
      howKnow: 'Skull material from Fukui, Japan.'
    },
    {
      id: 'eustreptospondylus', name: 'Eustreptospondylus oxoniensis', common: 'Eustreptospondylus',
      say: 'yoo-STREP-tuh-SPON-dih-lus', meaning: 'well-curved vertebra',
      group: 'theropod', clade: 'Megalosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 165, myaLo: 161,
      lengthM: 6, heightM: 2, weightKg: 500, speedKmh: 30,
      region: 'Europe (England)', formation: 'Oxford Clay',
      named: 1964, namedBy: 'Alick Walker',
      blurb: 'A Jurassic predator from England, found in marine rocks, its body likely washed out to sea.',
      traits: ['Megalosaur build', 'Found in sea deposits', 'Bladed teeth'],
      facts: ['The carcass drifted into the sea before fossilizing.', 'The skeleton is a young, not fully grown, animal.'],
      uncertain: 'Adult size is estimated, since the specimen is a juvenile.',
      howKnow: 'A fairly complete young skeleton from England.'
    },
    {
      id: 'afrovenator', name: 'Afrovenator abakensis', common: 'Afrovenator',
      say: 'AF-roh-VEN-uh-tor', meaning: 'African hunter',
      group: 'theropod', clade: 'Megalosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 167, myaLo: 161,
      lengthM: 8, heightM: 2.5, weightKg: 1000, speedKmh: 32,
      region: 'Africa (Niger)', formation: 'Tiouraren',
      named: 1994, namedBy: 'Paul Sereno and colleagues',
      blurb: 'A relatively complete African predator that helped fill gaps in the Jurassic record of the southern continents.',
      traits: ['Slender, agile build', 'Three-fingered hands', 'Bladed teeth'],
      facts: ['Its good skeleton is rare for a Jurassic African theropod.', 'It hunted alongside the sauropod Jobaria.'],
      uncertain: 'Its exact age within the Jurassic is debated.',
      howKnow: 'A largely complete skeleton from Niger.'
    },
    {
      id: 'monolophosaurus', name: 'Monolophosaurus jiangi', common: 'Monolophosaurus',
      say: 'MON-oh-LOAF-uh-SOR-us', meaning: 'single-crested lizard',
      group: 'theropod', clade: 'Allosauroidea', diet: 'carnivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 168, myaLo: 161,
      lengthM: 5.5, heightM: 2, weightKg: 700, speedKmh: 30,
      region: 'Asia (China)', formation: 'Shishugou',
      named: 1993, namedBy: 'Zhao & Currie',
      blurb: 'A Chinese predator with a single hollow crest running along the top of its snout.',
      traits: ['One long hollow head crest', 'Air spaces in the crest', 'Medium build'],
      facts: ['The hollow crest may have boosted calls or display.', 'It is among the better-known Middle Jurassic theropods.'],
      uncertain: 'The crest’s exact role is inferred from its hollow form.',
      howKnow: 'A good skull and skeleton from China.'
    },
    {
      id: 'eolambia', name: 'Eolambia caroljonesa', common: 'Eolambia',
      say: 'ee-oh-LAM-bee-uh', meaning: 'dawn lambeosaur',
      group: 'ornithischian', clade: 'Hadrosauroidea', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 100, myaLo: 96,
      lengthM: 6, heightM: 2.2, weightKg: 1000, speedKmh: 24,
      region: 'North America', formation: 'Cedar Mountain',
      named: 1998, namedBy: 'James Kirkland',
      blurb: 'An early relative of the duck-bills, showing the group’s rise just before they took over.',
      traits: ['Early hadrosaur-like teeth', 'No hollow crest yet', 'Bulky body'],
      facts: ['It is known from many individuals, including young.', 'It captures the duck-bills near their beginning.'],
      uncertain: 'Its exact position near the hadrosaur origin is studied.',
      howKnow: 'A bonebed of many ages in Utah.'
    },
    {
      id: 'qantassaurus', name: 'Qantassaurus intrepidus', common: 'Qantassaurus',
      say: 'KWON-tuh-SOR-us', meaning: 'Qantas lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 118, myaLo: 110,
      lengthM: 1.7, heightM: 0.6, weightKg: 10, speedKmh: 35,
      region: 'Australia', formation: 'Wonthaggi',
      named: 1999, namedBy: 'Tom Rich & Patricia Vickers-Rich',
      blurb: 'A small, fast Australian plant-eater from the polar forests, named after an airline that flew its fossils.',
      traits: ['Small and speedy', 'Stout teeth', 'Polar dweller'],
      facts: ['It lived in cool, dark polar Australia.', 'It is named for the airline that helped transport specimens.'],
      uncertain: 'Known from jaws, so its full body is reconstructed from relatives.',
      howKnow: 'Jaw fossils from Victoria, Australia.'
    },
    {
      id: 'massospondylus', name: 'Massospondylus carinatus', common: 'Massospondylus',
      say: 'MASS-uh-SPON-dih-lus', meaning: 'longer vertebra',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 200, myaLo: 183,
      lengthM: 4, heightM: 1.5, weightKg: 135, speedKmh: 18,
      region: 'Africa (South Africa)', formation: 'Upper Elliot',
      named: 1854, namedBy: 'Richard Owen',
      blurb: 'An early long-necked plant-eater known from nests and embryos, some of the oldest dinosaur eggs.',
      traits: ['Long neck and small head', 'Grasping hands', 'Walked on two legs'],
      facts: ['Fossil eggs with embryos reveal how its babies developed.', 'Hatchlings may have walked on all fours at first.'],
      uncertain: 'Whether parents cared for the young is inferred from clustered nests.',
      howKnow: 'Many skeletons, plus eggs and embryos, from southern Africa.'
    },
    {
      id: 'riojasaurus', name: 'Riojasaurus incertus', common: 'Riojasaurus',
      say: 'ree-OH-hah-SOR-us', meaning: 'La Rioja lizard',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'herbivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 221, myaLo: 210,
      lengthM: 10, heightM: 3, weightKg: 5000, speedKmh: 12,
      region: 'South America (Argentina)', formation: 'Los Colorados',
      named: 1969, namedBy: 'José Bonaparte',
      blurb: 'A heavy early plant-eater that walked on all fours, foreshadowing the giant sauropods to come.',
      traits: ['Bulky body on four legs', 'Long neck', 'Heavy limb bones'],
      facts: ['It was one of the larger animals of its Triassic world.', 'Its four-legged stance points toward later sauropods.'],
      uncertain: 'Its exact place among early sauropodomorphs is studied.',
      howKnow: 'Skeletons from Triassic Argentina.'
    },
    {
      id: 'liliensternus', name: 'Liliensternus liliensterni', common: 'Liliensternus',
      say: 'LIL-ee-en-STER-nus', meaning: 'for Hugo Rühle von Lilienstern',
      group: 'theropod', clade: 'Coelophysoidea', diet: 'carnivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 210, myaLo: 201,
      lengthM: 5, heightM: 1.5, weightKg: 130, speedKmh: 35,
      region: 'Europe (Germany)', formation: 'Trossingen',
      named: 1934, namedBy: 'Friedrich von Huene',
      blurb: 'One of the larger Triassic European predators, a cousin of Coelophysis with a slender build.',
      traits: ['Slender, fast predator', 'Long neck and tail', 'Sharp recurved teeth'],
      facts: ['It hunted in the same world as the plant-eater Plateosaurus.', 'It is among the better-known Triassic European theropods.'],
      uncertain: 'Some details rest on incomplete remains.',
      howKnow: 'Partial skeletons from Triassic Germany.'
    },
    {
      id: 'wuerhosaurus', name: 'Wuerhosaurus homheni', common: 'Wuerhosaurus',
      say: 'WER-uh-SOR-us', meaning: 'Wuerho lizard',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 120,
      lengthM: 7, heightM: 2.5, weightKg: 4000, speedKmh: 8,
      region: 'Asia (China)', formation: 'Lianmuqin',
      named: 1973, namedBy: 'Dong Zhiming',
      blurb: 'One of the last stegosaurs, surviving into the Cretaceous after most of its kind had gone.',
      traits: ['Back plates (low and long)', 'Tail spikes', 'Late-surviving stegosaur'],
      facts: ['It shows stegosaurs lingered after their Jurassic heyday.', 'Its plates were lower than those of Stegosaurus.'],
      uncertain: 'Plate shape is uncertain because the fossils are incomplete.',
      howKnow: 'Partial skeletons from Cretaceous China.'
    },
    {
      id: 'huayangosaurus', name: 'Huayangosaurus taibaii', common: 'Huayangosaurus',
      say: 'HWA-yang-uh-SOR-us', meaning: 'Huayang lizard',
      group: 'ornithischian', clade: 'Stegosauria', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 168, myaLo: 161,
      lengthM: 4.5, heightM: 1.5, weightKg: 600, speedKmh: 10,
      region: 'Asia (China)', formation: 'Lower Shaximiao',
      named: 1982, namedBy: 'Dong, Tang & Zhou',
      blurb: 'An early, primitive stegosaur that still had teeth at the front of its mouth, unlike later kinds.',
      traits: ['Front teeth (lost in later stegosaurs)', 'Paired back plates and spikes', 'Small and stocky'],
      facts: ['It is one of the earliest and most primitive stegosaurs.', 'It helps show how the plated dinosaurs began.'],
      uncertain: 'Exact plate arrangement is reconstructed from the skeleton.',
      howKnow: 'Good skeletons from Jurassic China.'
    },
    {
      id: 'chilesaurus', name: 'Chilesaurus diegosuarezi', common: 'Chilesaurus',
      say: 'CHIL-ee-SOR-us', meaning: 'Chile lizard',
      group: 'theropod', clade: 'uncertain', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 150, myaLo: 145,
      lengthM: 3, heightM: 1, weightKg: 30, speedKmh: 25,
      region: 'South America (Chile)', formation: 'Toqui',
      named: 2015, namedBy: 'Novas and colleagues',
      blurb: 'A "platypus" of dinosaurs: a plant-eating theropod-like animal that mixes features from several groups.',
      traits: ['Leaf-shaped teeth', 'Mix of theropod and other features', 'Plant-eater'],
      facts: ['It is so strange that scientists argue about which group it belongs to.', 'It was found by a 7-year-old.'],
      uncertain: 'Whether it is an odd theropod or an early bird-hipped dinosaur is genuinely unresolved.',
      howKnow: 'Several skeletons from Chilean Patagonia.'
    },
    {
      id: 'limusaurus', name: 'Limusaurus inextricabilis', common: 'Limusaurus',
      say: 'LY-muh-SOR-us', meaning: 'mud lizard',
      group: 'theropod', clade: 'Ceratosauria', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 161, myaLo: 156,
      lengthM: 1.7, heightM: 0.5, weightKg: 15, speedKmh: 40,
      region: 'Asia (China)', formation: 'Shishugou',
      named: 2009, namedBy: 'Xu Xing and colleagues',
      blurb: 'A beaked, toothless theropod that lost its teeth as it grew, changing from meat to plants with age.',
      traits: ['Toothless beak as an adult', 'Teeth only when young', 'Gastroliths in the gut'],
      facts: ['Babies had teeth; adults had none, a rare diet change with growth.', 'It got trapped and died in mud pits.'],
      uncertain: 'How its diet shifted with age is inferred from teeth and stomach stones.',
      howKnow: 'Many individuals of different ages from Chinese mud traps.'
    },
    {
      id: 'buitreraptor', name: 'Buitreraptor gonzalezorum', common: 'Buitreraptor',
      say: 'BWEE-truh-RAP-tor', meaning: 'vulture thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 95, myaLo: 90,
      lengthM: 1.5, heightM: 0.4, weightKg: 3, speedKmh: 40,
      region: 'South America (Argentina)', formation: 'Candeleros',
      named: 2005, namedBy: 'Makovicky and colleagues',
      blurb: 'A slender southern raptor with a long, low snout full of tiny teeth, hinting at a diet of small prey.',
      traits: ['Long, low snout', 'Many small teeth', 'Lightweight build'],
      facts: ['It shows raptors thrived on the southern continents too.', 'Its many small teeth suit catching small animals.'],
      uncertain: 'Its exact diet is inferred from its delicate skull.',
      howKnow: 'Good skeletons from Patagonia.'
    },
    {
      id: 'pawpawsaurus', name: 'Pawpawsaurus campbelli', common: 'Pawpawsaurus',
      say: 'PAW-paw-SOR-us', meaning: 'Paw Paw lizard',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 100, myaLo: 98,
      lengthM: 4.5, heightM: 1.3, weightKg: 1000, speedKmh: 10,
      region: 'North America', formation: 'Paw Paw',
      named: 1996, namedBy: 'Yuong-Nam Lee',
      blurb: 'An armored nodosaur known from a fine skull, found in marine rocks where it had washed out to sea.',
      traits: ['Armored skull', 'Bony eyelids', 'No tail club'],
      facts: ['Its skull preserves the bony shutters that protected its eyes.', 'It drifted into the sea before fossilizing.'],
      uncertain: 'Most of its body is reconstructed from relatives.',
      howKnow: 'A well-preserved skull from Texas.'
    },
    {
      id: 'alioramus', name: 'Alioramus altai', common: 'Alioramus',
      say: 'AL-ee-oh-RAY-mus', meaning: 'different branch',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 68,
      lengthM: 5, heightM: 1.7, weightKg: 370, speedKmh: 35,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 1976, namedBy: 'Sergei Kurzanov',
      blurb: 'A slender, long-snouted tyrannosaur with a row of small bony horns along its nose.',
      traits: ['Long, low snout', 'Row of nasal horns', 'Slender for a tyrannosaur'],
      facts: ['Its narrow skull set it apart from bulky cousins like Tarbosaurus.', 'It shared its world with the much larger Tarbosaurus.'],
      uncertain: 'Whether some specimens are young Tarbosaurus is debated.',
      howKnow: 'A good skull and skeleton from Mongolia.'
    },
    {
      id: 'qianzhousaurus', name: 'Qianzhousaurus sinensis', common: 'Qianzhousaurus',
      say: 'chee-AN-joh-SOR-us', meaning: 'Qianzhou lizard',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 66,
      lengthM: 8, heightM: 2.5, weightKg: 750, speedKmh: 35,
      region: 'Asia (China)', formation: 'Nanxiong',
      named: 2014, namedBy: 'Lü and colleagues',
      blurb: 'A long-snouted tyrannosaur nicknamed "Pinocchio rex" for its unusually slender face.',
      traits: ['Very long, narrow snout', 'Slender tyrannosaur', 'Nasal ridges'],
      facts: ['Its long snout shows tyrannosaurs were more varied than once thought.', 'The nickname "Pinocchio rex" stuck in the media.'],
      uncertain: 'How its long snout changed its hunting style is inferred from anatomy.',
      howKnow: 'A well-preserved skull and skeleton from southern China.'
    },
    {
      id: 'nanuqsaurus', name: 'Nanuqsaurus hoglundi', common: 'Nanuqsaurus',
      say: 'nah-NUK-suh-SOR-us', meaning: 'polar bear lizard',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 68,
      lengthM: 6, heightM: 2, weightKg: 800, speedKmh: 32,
      region: 'North America (Alaska)', formation: 'Prince Creek',
      named: 2014, namedBy: 'Fiorillo & Tykoski',
      blurb: 'A small tyrannosaur from the Arctic, which endured long, dark, snowy polar winters.',
      traits: ['Smaller than its southern cousins', 'Polar dweller', 'Tyrannosaur build'],
      facts: ['Its smaller size may reflect scarce winter food at high latitudes.', 'It hunted in months-long polar darkness.'],
      uncertain: 'Adult size is estimated from limited skull material.',
      howKnow: 'Skull fragments from northern Alaska.'
    },
    {
      id: 'lythronax', name: 'Lythronax argestes', common: 'Lythronax',
      say: 'LY-thruh-naks', meaning: 'gore king',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 81, myaLo: 80,
      lengthM: 8, heightM: 2.6, weightKg: 2500, speedKmh: 32,
      region: 'North America', formation: 'Wahweap',
      named: 2013, namedBy: 'Loewen and colleagues',
      blurb: 'One of the oldest known tyrannosaurids, with forward-facing eyes for sharp depth perception.',
      traits: ['Wide skull with forward eyes', 'Robust build', 'Early tyrannosaurid'],
      facts: ['It is among the earliest big tyrannosaurids known.', 'It lived on the southern part of the continent Laramidia.'],
      uncertain: 'Its exact age and relationships keep being refined.',
      howKnow: 'A partial skull and skeleton from Utah.'
    },
    {
      id: 'dryptosaurus', name: 'Dryptosaurus aquilunguis', common: 'Dryptosaurus',
      say: 'DRIP-tuh-SOR-us', meaning: 'tearing lizard',
      group: 'theropod', clade: 'Tyrannosauroidea', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 67, myaLo: 66,
      lengthM: 7.5, heightM: 2.4, weightKg: 1500, speedKmh: 30,
      region: 'North America', formation: 'New Egypt',
      named: 1877, namedBy: 'Edward Drinker Cope',
      blurb: 'An eastern North American predator, the subject of one of the first lively, active dinosaur paintings.',
      traits: ['Large hand claws', 'Tyrannosauroid build', 'Eastern North American hunter'],
      facts: ['A famous 1890s painting showed it leaping, an early "active dinosaur" image.', 'It lived on the eastern landmass, Appalachia.'],
      uncertain: 'It is known from limited material, so much is reconstructed.',
      howKnow: 'A partial skeleton from New Jersey.'
    },
    {
      id: 'zuniceratops', name: 'Zuniceratops christopheri', common: 'Zuniceratops',
      say: 'ZOON-ee-SERR-uh-tops', meaning: 'Zuni horned face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 92, myaLo: 89,
      lengthM: 3.5, heightM: 1.2, weightKg: 250, speedKmh: 25,
      region: 'North America', formation: 'Moreno Hill',
      named: 1998, namedBy: 'Wolfe & Kirkland',
      blurb: 'An early horned dinosaur that bridges the small Asian ceratopsians and the great horned giants.',
      traits: ['Early brow horns', 'Simple frill', 'Beak and shearing teeth'],
      facts: ['It was partly discovered by an 8-year-old.', 'It captures an in-between stage in horned dinosaur evolution.'],
      uncertain: 'Known from limited material, so some features are estimated.',
      howKnow: 'Skull and skeletal pieces from New Mexico.'
    },
    {
      id: 'yinlong', name: 'Yinlong downsi', common: 'Yinlong',
      say: 'YIN-long', meaning: 'hidden dragon',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 161, myaLo: 156,
      lengthM: 1.2, heightM: 0.4, weightKg: 15, speedKmh: 30,
      region: 'Asia (China)', formation: 'Shishugou',
      named: 2006, namedBy: 'Xu Xing and colleagues',
      blurb: 'The oldest and most primitive known horned dinosaur, a small two-legged plant-eater with no horns yet.',
      traits: ['Parrot-like beak', 'No horns or frill yet', 'Two-legged runner'],
      facts: ['It shows horned dinosaurs started small and hornless.', 'Its name nods to the film Crouching Tiger, Hidden Dragon.'],
      uncertain: 'Exactly how the horned lineage developed from such roots is studied.',
      howKnow: 'Several skeletons from Jurassic China.'
    },
    {
      id: 'leptoceratops', name: 'Leptoceratops gracilis', common: 'Leptoceratops',
      say: 'LEP-toh-SERR-uh-tops', meaning: 'slender horned face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66,
      lengthM: 2, heightM: 0.7, weightKg: 70, speedKmh: 25,
      region: 'North America', formation: 'Scollard',
      named: 1914, namedBy: 'Barnum Brown',
      blurb: 'A small, hornless horned dinosaur that lived beside its giant cousin Triceratops.',
      traits: ['Small body', 'Short frill, no big horns', 'Could run on two legs'],
      facts: ['It shows small ceratopsians survived to the very end.', 'It lived alongside T. rex and Triceratops.'],
      uncertain: 'Its exact diet and habits are inferred from its teeth and build.',
      howKnow: 'Several skeletons from the latest Cretaceous of North America.'
    },
    {
      id: 'regaliceratops', name: 'Regaliceratops peterhewsi', common: 'Regaliceratops',
      say: 'reh-GAL-ih-SERR-uh-tops', meaning: 'royal horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 69, myaLo: 67,
      lengthM: 5, heightM: 1.8, weightKg: 1500, speedKmh: 25,
      region: 'North America', formation: 'St. Mary River',
      named: 2015, namedBy: 'Brown & Henderson',
      blurb: 'A horned dinosaur nicknamed "Hellboy" for its short horns and a crown-like ring of frill plates.',
      traits: ['Crown-like frill plates', 'Large nose horn', 'Short brow horns'],
      facts: ['Its frill plates look like a royal crown.', 'It was nicknamed Hellboy by the team that prepared it.'],
      uncertain: 'It blends features of two ceratopsian groups, complicating its placement.',
      howKnow: 'A well-preserved skull from Alberta.'
    },
    {
      id: 'sinoceratops', name: 'Sinoceratops zhuchengensis', common: 'Sinoceratops',
      say: 'SY-noh-SERR-uh-tops', meaning: 'Chinese horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 73, myaLo: 70,
      lengthM: 6, heightM: 2, weightKg: 2000, speedKmh: 25,
      region: 'Asia (China)', formation: 'Wangshi',
      named: 2010, namedBy: 'Xu Xing and colleagues',
      blurb: 'A rare horned dinosaur from China, since most big ceratopsids are from North America.',
      traits: ['Large nose horn', 'Hornlets curling over the frill', 'Heavy body'],
      facts: ['It is one of the only large ceratopsids known from Asia.', 'It shows these dinosaurs reached beyond North America.'],
      uncertain: 'How the group spread between continents is studied.',
      howKnow: 'Skull material from Shandong, China.'
    },
    {
      id: 'pinacosaurus', name: 'Pinacosaurus grangeri', common: 'Pinacosaurus',
      say: 'pih-NAK-uh-SOR-us', meaning: 'plank lizard',
      group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 80, myaLo: 75,
      lengthM: 5, heightM: 1.4, weightKg: 1900, speedKmh: 10,
      region: 'Asia (Mongolia/China)', formation: 'Djadochta',
      named: 1933, namedBy: 'Charles Gilmore',
      blurb: 'An armored, club-tailed dinosaur known from groups of juveniles that may have died in sandstorms.',
      traits: ['Tail club', 'Body armor', 'Found in juvenile groups'],
      facts: ['Clusters of young suggest they traveled together.', 'It is one of the best-known Asian ankylosaurs.'],
      uncertain: 'Whether sandstorms or floods killed the groups is debated.',
      howKnow: 'Many specimens, including groups of juveniles.'
    },
    {
      id: 'saichania', name: 'Saichania chulsanensis', common: 'Saichania',
      say: 'sy-CHAH-nee-uh', meaning: 'beautiful one',
      group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 6.5, heightM: 1.8, weightKg: 2000, speedKmh: 10,
      region: 'Asia (Mongolia)', formation: 'Barun Goyot',
      named: 1977, namedBy: 'Teresa Maryańska',
      blurb: 'A heavily armored desert dinosaur with complex nasal passages, perhaps to cool or moisten dry air.',
      traits: ['Dense body armor', 'Tail club', 'Complex nasal passages'],
      facts: ['Its looping nasal passages may have handled hot, dry desert air.', 'Its name means "beautiful" for its fine preservation.'],
      uncertain: 'The exact function of the nasal loops is inferred from CT scans.',
      howKnow: 'Well-preserved skeletons from the Gobi Desert.'
    },
    {
      id: 'zuul', name: 'Zuul crurivastator', common: 'Zuul',
      say: 'ZOOL', meaning: 'for the creature in Ghostbusters',
      group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 6, heightM: 1.7, weightKg: 2500, speedKmh: 10,
      region: 'North America', formation: 'Judith River',
      named: 2017, namedBy: 'Arbour & Evans',
      blurb: 'A spectacularly preserved club-tailed dinosaur with skin and armor intact, named after a movie monster.',
      traits: ['Massive tail club', 'Preserved skin and armor', 'Spiky body'],
      facts: ['Its species name means "destroyer of shins".', 'It preserves soft tissue rarely seen in armored dinosaurs.'],
      uncertain: 'Healed tail injuries hint the club was used in fights with its own kind.',
      howKnow: 'A remarkable skeleton with skin and armor from Montana.'
    },
    {
      id: 'polacanthus', name: 'Polacanthus foxii', common: 'Polacanthus',
      say: 'POL-uh-KAN-thus', meaning: 'many spines',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 125,
      lengthM: 5, heightM: 1.4, weightKg: 1500, speedKmh: 10,
      region: 'Europe (England)', formation: 'Wessex',
      named: 1865, namedBy: 'Thomas Huxley',
      blurb: 'An early armored dinosaur from the Isle of Wight, bristling with spikes over its shoulders and hips.',
      traits: ['Shoulder and hip spikes', 'A bony shield over the hips', 'No tail club'],
      facts: ['Its hip shield is a single fused plate of armor.', 'It is one of Europe’s classic armored dinosaurs.'],
      uncertain: 'Front-body details are reconstructed from incomplete remains.',
      howKnow: 'Partial skeletons from the Isle of Wight.'
    },
    {
      id: 'panoplosaurus', name: 'Panoplosaurus mirus', common: 'Panoplosaurus',
      say: 'pan-OP-luh-SOR-us', meaning: 'fully armored lizard',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 5, heightM: 1.4, weightKg: 1600, speedKmh: 10,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1919, namedBy: 'Lawrence Lambe',
      blurb: 'A club-less armored dinosaur with a heavily armored head and shoulder spikes.',
      traits: ['Armored skull', 'Shoulder spikes', 'No tail club'],
      facts: ['Its head armor was especially thick.', 'It relied on spikes and bulk, not a tail weapon.'],
      uncertain: 'Some specimens once assigned to it belong to relatives.',
      howKnow: 'Skulls and partial skeletons from Alberta.'
    },
    {
      id: 'stygimoloch', name: 'Stygimoloch spinifer', common: 'Stygimoloch',
      say: 'STIJ-ih-MOL-uk', meaning: 'horned devil from the river Styx',
      group: 'ornithischian', clade: 'Pachycephalosauridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66,
      lengthM: 3, heightM: 1.2, weightKg: 80, speedKmh: 30,
      region: 'North America', formation: 'Hell Creek',
      named: 1983, namedBy: 'Galton & Sues',
      blurb: 'A dome-headed dinosaur with long skull spikes, possibly a growth stage of Pachycephalosaurus.',
      traits: ['Long skull spikes', 'Dome head', 'Two-legged build'],
      facts: ['Some scientists think it is a teenage Pachycephalosaurus.', 'Its devilish spikes inspired its dramatic name.'],
      uncertain: 'Whether it is a real genus or a growth stage is a famous debate.',
      howKnow: 'Skull material from the latest Cretaceous of North America.'
    },
    {
      id: 'dracorex', name: 'Dracorex hogwartsia', common: 'Dracorex',
      say: 'DRAY-koh-reks', meaning: 'dragon king',
      group: 'ornithischian', clade: 'Pachycephalosauridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66,
      lengthM: 3, heightM: 1.1, weightKg: 70, speedKmh: 30,
      region: 'North America', formation: 'Hell Creek',
      named: 2006, namedBy: 'Bakker and colleagues',
      blurb: 'A flat-headed, spiky dome-head whose species name honors the world of Harry Potter.',
      traits: ['Flat, spiky skull', 'No tall dome', 'Knobs and horns'],
      facts: ['Its name means "dragon king of Hogwarts".', 'It may be a young Pachycephalosaurus before the dome grew.'],
      uncertain: 'Like Stygimoloch, it may be a growth stage rather than a separate genus.',
      howKnow: 'A single skull from South Dakota.'
    },
    {
      id: 'tsintaosaurus', name: 'Tsintaosaurus spinorhinus', common: 'Tsintaosaurus',
      say: 'ching-DOW-SOR-us', meaning: 'Qingdao lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 73, myaLo: 70,
      lengthM: 8.5, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'Asia (China)', formation: 'Jingangkou',
      named: 1958, namedBy: 'Yang Zhongjian',
      blurb: 'A duck-bill with a tall, narrow crest once mistakenly reconstructed as a forward-pointing "unicorn horn".',
      traits: ['Tall upright crest', 'Hundreds of grinding teeth', 'Large duck-bill'],
      facts: ['Early reconstructions made it look like a unicorn.', 'Better fossils corrected the crest to point upward.'],
      uncertain: 'Crest function is inferred from its hollow form.',
      howKnow: 'Skull and skeleton material from China, later re-studied.'
    },
    {
      id: 'olorotitan', name: 'Olorotitan arharensis', common: 'Olorotitan',
      say: 'oh-LOR-oh-TIE-tan', meaning: 'giant swan',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 8, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'Asia (Russia)', formation: 'Udurchukan',
      named: 2003, namedBy: 'Godefroit and colleagues',
      blurb: 'A duck-bill with a fan-shaped, hatchet-like crest and an unusually long, swan-like neck.',
      traits: ['Fan-shaped hollow crest', 'Long neck', 'Grinding tooth batteries'],
      facts: ['It had more neck vertebrae than most duck-bills.', 'Its skeleton is one of the most complete from Russia.'],
      uncertain: 'Crest and neck functions are inferred from their shapes.',
      howKnow: 'A nearly complete skeleton from far-eastern Russia.'
    },
    {
      id: 'hypacrosaurus', name: 'Hypacrosaurus altispinus', common: 'Hypacrosaurus',
      say: 'hy-PAK-ruh-SOR-us', meaning: 'near the highest lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 67,
      lengthM: 9, heightM: 3, weightKg: 4000, speedKmh: 24,
      region: 'North America', formation: 'Horseshoe Canyon',
      named: 1913, namedBy: 'Barnum Brown',
      blurb: 'A crested duck-bill known from nests, eggs, and embryos that reveal how fast its babies grew.',
      traits: ['Tall rounded crest', 'High spines over the back', 'Known from embryos'],
      facts: ['Embryos let scientists study its growth from the egg.', 'Bone studies suggest it grew quickly.'],
      uncertain: 'Growth-rate estimates come from counting bone layers.',
      howKnow: 'Nests, eggs, and embryos from Alberta and Montana.'
    },
    {
      id: 'prosaurolophus', name: 'Prosaurolophus maximus', common: 'Prosaurolophus',
      say: 'pro-sor-OL-uh-fus', meaning: 'before Saurolophus',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 9, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1916, namedBy: 'Barnum Brown',
      blurb: 'A duck-bill with a small solid crest, known from a bonebed that hints at herd life.',
      traits: ['Small solid crest', 'Grinding tooth batteries', 'Herd animal'],
      facts: ['A bonebed of many individuals suggests it lived in herds.', 'Its crest was a low bump, not a tall hollow tube.'],
      uncertain: 'Herd behavior is inferred from the bonebed.',
      howKnow: 'Skulls and a bonebed from Alberta.'
    },
    {
      id: 'barosaurus', name: 'Barosaurus lentus', common: 'Barosaurus',
      say: 'BAR-uh-SOR-us', meaning: 'heavy lizard',
      group: 'sauropod', clade: 'Diplodocidae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 145,
      lengthM: 26, heightM: 5, weightKg: 20000, speedKmh: 14,
      region: 'North America', formation: 'Morrison',
      named: 1890, namedBy: 'Othniel Charles Marsh',
      blurb: 'A diplodocid with an especially long neck, famous for a rearing skeleton mount in New York.',
      traits: ['Very long neck', 'Whip-like tail', 'Light build'],
      facts: ['A rearing mount towers in the American Museum of Natural History.', 'Whether it could truly rear up is debated.'],
      uncertain: 'How high it could lift its neck and head is much argued.',
      howKnow: 'Several skeletons from the Morrison Formation.'
    },
    {
      id: 'opisthocoelicaudia', name: 'Opisthocoelicaudia skarzynskii', common: 'Opisthocoelicaudia',
      say: 'oh-PIS-thoh-SEE-lih-KAW-dee-uh', meaning: 'backward-hollowed tail',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 68,
      lengthM: 12, heightM: 4, weightKg: 10000, speedKmh: 12,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 1977, namedBy: 'Borsuk-Białynicka',
      blurb: 'A titanosaur from Mongolia found without its head and neck, perhaps bitten off by scavengers.',
      traits: ['Stocky titanosaur', 'Special tail joints', 'Strong limbs'],
      facts: ['Tooth marks suggest scavengers removed its head and neck.', 'Its tail bones suggest it may have reared to feed.'],
      uncertain: 'Its missing skull means its head is reconstructed from relatives.',
      howKnow: 'A headless but otherwise good skeleton from Mongolia.'
    },
    {
      id: 'paralititan', name: 'Paralititan stromeri', common: 'Paralititan',
      say: 'puh-RAL-ih-TIE-tan', meaning: 'tidal giant',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 96, myaLo: 94,
      lengthM: 26, heightM: 9, weightKg: 30000, speedKmh: 8,
      region: 'Africa (Egypt)', formation: 'Bahariya',
      named: 2001, namedBy: 'Smith and colleagues',
      blurb: 'A giant titanosaur from ancient mangrove tidal flats in what is now the Egyptian desert.',
      traits: ['Very large titanosaur', 'Lived in coastal mangroves', 'Massive limb bones'],
      facts: ['It lived in a lush tidal wetland, now the Sahara.', 'It shared its world with Spinosaurus and Carcharodontosaurus.'],
      uncertain: 'Its size is estimated from limited material.',
      howKnow: 'Partial remains rediscovered in the Egyptian desert.'
    },
    {
      id: 'isisaurus', name: 'Isisaurus colberti', common: 'Isisaurus',
      say: 'EYE-sis-SOR-us', meaning: 'Indian Statistical Institute lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 18, heightM: 6, weightKg: 14000, speedKmh: 10,
      region: 'Asia (India)', formation: 'Lameta',
      named: 1997, namedBy: 'Jain & Bandyopadhyay',
      blurb: 'An Indian titanosaur with an oddly short, vertical neck and a long body, found near dinosaur nesting grounds.',
      traits: ['Short, steep neck', 'Long forelimbs', 'Heavy body'],
      facts: ['Coprolites nearby reveal what plants titanosaurs ate.', 'It lived near vast titanosaur egg sites in India.'],
      uncertain: 'Its unusual proportions are reconstructed from a partial skeleton.',
      howKnow: 'A partial skeleton from central India.'
    },
    {
      id: 'rhabdodon', name: 'Rhabdodon priscus', common: 'Rhabdodon',
      say: 'RAB-duh-don', meaning: 'rod tooth',
      group: 'ornithischian', clade: 'Rhabdodontidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 66,
      lengthM: 4, heightM: 1.4, weightKg: 500, speedKmh: 25,
      region: 'Europe (France/Spain)', formation: 'Various',
      named: 1869, namedBy: 'Philippe Matheron',
      blurb: 'A stocky plant-eater from the islands of Late Cretaceous Europe, where many dinosaurs were dwarfed.',
      traits: ['Stout body', 'Strong grinding teeth', 'Island dweller'],
      facts: ['Cretaceous Europe was a chain of islands with smaller dinosaurs.', 'It is one of the common plant-eaters of that island world.'],
      uncertain: 'Whether several named forms are one species is studied.',
      howKnow: 'Many bones from southern Europe.'
    },
    {
      id: 'tethyshadros', name: 'Tethyshadros insularis', common: 'Tethyshadros',
      say: 'TETH-iss-HAD-ros', meaning: 'Tethys duck-bill',
      group: 'ornithischian', clade: 'Hadrosauroidea', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 81, myaLo: 75,
      lengthM: 4, heightM: 1.5, weightKg: 350, speedKmh: 25,
      region: 'Europe (Italy)', formation: 'Liburnia',
      named: 2009, namedBy: 'Fabio Dalla Vecchia',
      blurb: 'A small island duck-bill from Italy, nicknamed "Antonio", showing island dwarfism in dinosaurs.',
      traits: ['Small for a duck-bill', 'Island dweller', 'Long, slender legs'],
      facts: ['Its nickname is Antonio.', 'It lived on a Mediterranean island chain.'],
      uncertain: 'Whether its small size is dwarfism or youth was studied and resolved as adult.',
      howKnow: 'A remarkably complete skeleton from northern Italy.'
    },
    {
      id: 'eodromaeus', name: 'Eodromaeus murphi', common: 'Eodromaeus',
      say: 'ee-oh-DROM-ee-us', meaning: 'dawn runner',
      group: 'theropod', clade: 'early Theropoda', diet: 'carnivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 232, myaLo: 229,
      lengthM: 1.2, heightM: 0.3, weightKg: 5, speedKmh: 35,
      region: 'South America (Argentina)', formation: 'Ischigualasto',
      named: 2011, namedBy: 'Martinez and colleagues',
      blurb: 'A small, early predator from the dawn of the dinosaurs, close to the root of the meat-eaters.',
      traits: ['Small and slender', 'Grasping hands', 'Sharp teeth'],
      facts: ['It lived at the very start of the dinosaur story.', 'It hints at what the first theropods were like.'],
      uncertain: 'Early dinosaur relationships keep being revised with new finds.',
      howKnow: 'Good skeletons from Argentina.'
    },
    {
      id: 'buriolestes', name: 'Buriolestes schultzi', common: 'Buriolestes',
      say: 'BOO-ree-oh-LES-teez', meaning: 'Buriol robber',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'carnivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 233, myaLo: 230,
      lengthM: 1.5, heightM: 0.4, weightKg: 7, speedKmh: 35,
      region: 'South America (Brazil)', formation: 'Santa Maria',
      named: 2016, namedBy: 'Cabreira and colleagues',
      blurb: 'A surprising early sauropod relative that still ate meat, before its lineage turned to plants and grew huge.',
      traits: ['Sharp meat-eating teeth', 'Small body', 'Long tail'],
      facts: ['Its ancestors were the tiny, meat-eating start of the giant sauropod line.', 'Its brain has been studied with CT scanning.'],
      uncertain: 'Exactly when its lineage switched to plants is inferred.',
      howKnow: 'Good early skeletons from southern Brazil.'
    },
    {
      id: 'abelisaurus', name: 'Abelisaurus comahuensis', common: 'Abelisaurus',
      say: 'uh-BEL-ih-SOR-us', meaning: 'Abel’s lizard',
      group: 'theropod', clade: 'Abelisauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 83, myaLo: 80,
      lengthM: 7.5, heightM: 2.5, weightKg: 1500, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Anacleto',
      named: 1985, namedBy: 'Bonaparte & Novas',
      blurb: 'A southern predator that gives its name to the abelisaurs, a major group of short-faced hunters.',
      traits: ['Deep, short skull', 'Pitted face bones', 'Tiny arms'],
      facts: ['It is known mainly from a single skull.', 'Its family dominated the southern continents in the late Cretaceous.'],
      uncertain: 'Much of its body is reconstructed from relatives.',
      howKnow: 'A single good skull from Patagonia.'
    },
    {
      id: 'rajasaurus', name: 'Rajasaurus narmadensis', common: 'Rajasaurus',
      say: 'RAH-juh-SOR-us', meaning: 'princely lizard',
      group: 'theropod', clade: 'Abelisauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 8, heightM: 2.4, weightKg: 1500, speedKmh: 30,
      region: 'Asia (India)', formation: 'Lameta',
      named: 2003, namedBy: 'Wilson and colleagues',
      blurb: 'A horned abelisaur from India that hunted near vast titanosaur nesting grounds.',
      traits: ['Low head horn', 'Short, deep skull', 'Stocky build'],
      facts: ['It lived alongside the egg-laying titanosaurs of India.', 'It is one of India’s best-known predatory dinosaurs.'],
      uncertain: 'Its full size is estimated from partial remains.',
      howKnow: 'Skull and partial skeleton from central India.'
    },
    {
      id: 'skorpiovenator', name: 'Skorpiovenator bustingorryi', common: 'Skorpiovenator',
      say: 'SKOR-pee-oh-VEN-uh-tor', meaning: 'scorpion hunter',
      group: 'theropod', clade: 'Abelisauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 95, myaLo: 90,
      lengthM: 7.5, heightM: 2.4, weightKg: 1600, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Huincul',
      named: 2008, namedBy: 'Canale and colleagues',
      blurb: 'A short-faced abelisaur named for the scorpions found at its dig site, with a heavily sculpted skull.',
      traits: ['Rugged, sculpted skull', 'Very short arms', 'Deep face'],
      facts: ['Its name comes from the scorpions at the excavation.', 'It is one of the most complete abelisaurs.'],
      uncertain: 'How it shared its world with the giant Mapusaurus is inferred.',
      howKnow: 'A nearly complete skeleton from Patagonia.'
    },
    {
      id: 'elaphrosaurus', name: 'Elaphrosaurus bambergi', common: 'Elaphrosaurus',
      say: 'eh-LAF-ruh-SOR-us', meaning: 'light lizard',
      group: 'theropod', clade: 'Ceratosauria', diet: 'omnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 154, myaLo: 150,
      lengthM: 6, heightM: 1.8, weightKg: 210, speedKmh: 40,
      region: 'Africa (Tanzania)', formation: 'Tendaguru',
      named: 1920, namedBy: 'Werner Janensch',
      blurb: 'A lightly built, long-bodied African theropod whose relatives lost their teeth and may have eaten plants.',
      traits: ['Very light, slender build', 'Long body', 'Short arms'],
      facts: ['It came from the rich Tendaguru beds of Tanzania.', 'Its relatives suggest a possible shift toward plants.'],
      uncertain: 'Its exact diet is inferred from its lightweight build and relatives.',
      howKnow: 'A partial skeleton from German East Africa expeditions.'
    },
    {
      id: 'eotyrannus', name: 'Eotyrannus lengi', common: 'Eotyrannus',
      say: 'EE-oh-tih-RAN-us', meaning: 'dawn tyrant',
      group: 'theropod', clade: 'Tyrannosauroidea', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 125,
      lengthM: 4, heightM: 1.3, weightKg: 200, speedKmh: 35,
      region: 'Europe (England)', formation: 'Wessex',
      named: 2001, namedBy: 'Hutt and colleagues',
      blurb: 'An early, slender tyrannosaur from the Isle of Wight, long before the giant T. rex.',
      traits: ['Long arms (for a tyrannosaur)', 'Slender build', 'Bladed teeth'],
      facts: ['It shows tyrannosaurs started small and long-armed.', 'It lived alongside Iguanodon in England.'],
      uncertain: 'Adult size is estimated from a not-fully-grown skeleton.',
      howKnow: 'A partial skeleton from the Isle of Wight.'
    },
    {
      id: 'proceratosaurus', name: 'Proceratosaurus bradleyi', common: 'Proceratosaurus',
      say: 'pro-seh-RAT-uh-SOR-us', meaning: 'before Ceratosaurus',
      group: 'theropod', clade: 'Tyrannosauroidea', diet: 'carnivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 167, myaLo: 164,
      lengthM: 3, heightM: 1, weightKg: 50, speedKmh: 35,
      region: 'Europe (England)', formation: 'Forest Marble',
      named: 1910, namedBy: 'Arthur Smith Woodward',
      blurb: 'A small, crested early tyrannosaur relative, once thought to be a Ceratosaurus ancestor.',
      traits: ['Small head crest', 'Slender build', 'Numerous small teeth'],
      facts: ['It is one of the earliest known tyrannosauroids.', 'Its crest links it to the crested Guanlong.'],
      uncertain: 'Its exact relationships were only clarified by later study.',
      howKnow: 'A partial skull from England.'
    },
    {
      id: 'dilong', name: 'Dilong paradoxus', common: 'Dilong',
      say: 'DEE-long', meaning: 'emperor dragon',
      group: 'theropod', clade: 'Tyrannosauroidea', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 2, heightM: 0.7, weightKg: 12, speedKmh: 40,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2004, namedBy: 'Xu Xing and colleagues',
      blurb: 'A small early tyrannosaur preserved with simple feathers, hinting the whole group began fuzzy.',
      traits: ['Simple filament feathers', 'Long arms', 'Small and slender'],
      facts: ['Its feathers suggest early tyrannosaurs were fuzzy.', 'It is a distant ancestor-type of T. rex.'],
      uncertain: 'Whether giant tyrannosaurs kept such feathers is debated.',
      howKnow: 'Feathered specimens from China’s Jehol beds.'
    },
    {
      id: 'teratophoneus', name: 'Teratophoneus curriei', common: 'Teratophoneus',
      say: 'TERR-uh-tuh-FOH-nee-us', meaning: 'monstrous murderer',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 76,
      lengthM: 6, heightM: 2, weightKg: 1300, speedKmh: 32,
      region: 'North America', formation: 'Kaiparowits',
      named: 2011, namedBy: 'Carr and colleagues',
      blurb: 'A short-snouted tyrannosaur from southern Utah, smaller than T. rex but built much the same.',
      traits: ['Short, deep skull', 'Robust teeth', 'Southern Laramidia hunter'],
      facts: ['A possible family group was found together.', 'It shows regional variety among tyrannosaurs.'],
      uncertain: 'Whether the group find means social behavior is inferred.',
      howKnow: 'Skulls and skeletons from southern Utah.'
    },
    {
      id: 'albertosaurus', name: 'Albertosaurus sarcophagus', common: 'Albertosaurus',
      say: 'al-BER-tuh-SOR-us', meaning: 'Alberta lizard',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 71, myaLo: 68,
      lengthM: 9, heightM: 2.9, weightKg: 2000, speedKmh: 32,
      region: 'North America', formation: 'Horseshoe Canyon',
      named: 1905, namedBy: 'Henry Fairfield Osborn',
      blurb: 'A lighter, faster tyrannosaur known from a bonebed of many individuals, hinting at group living.',
      traits: ['Long-legged tyrannosaur', 'Bladed teeth', 'Found in a bonebed'],
      facts: ['A bonebed holds more than 20 individuals of all ages.', 'It hints tyrannosaurs may have gathered in groups.'],
      uncertain: 'Whether the group means pack-hunting is debated.',
      howKnow: 'A famous multi-individual bonebed in Alberta.'
    },
    {
      id: 'thanatotheristes', name: 'Thanatotheristes degrootorum', common: 'Thanatotheristes',
      say: 'thuh-NAT-uh-thuh-RIS-teez', meaning: 'reaper of death',
      group: 'theropod', clade: 'Tyrannosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 80, myaLo: 79,
      lengthM: 8, heightM: 2.5, weightKg: 1800, speedKmh: 32,
      region: 'North America', formation: 'Foremost',
      named: 2020, namedBy: 'Voris and colleagues',
      blurb: 'One of the oldest big tyrannosaurs from Canada, discovered by an amateur fossil-hunting couple.',
      traits: ['Tall, narrow snout', 'Ridged face bones', 'Robust teeth'],
      facts: ['It was found by a couple out hiking.', 'It is among the oldest Canadian tyrannosaurs.'],
      uncertain: 'Known from limited material, so much is reconstructed.',
      howKnow: 'Skull pieces from Alberta.'
    },
    {
      id: 'neovenator', name: 'Neovenator salerii', common: 'Neovenator',
      say: 'NEE-oh-VEN-uh-tor', meaning: 'new hunter',
      group: 'theropod', clade: 'Carcharodontosauria', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 125,
      lengthM: 7.5, heightM: 2.4, weightKg: 1000, speedKmh: 32,
      region: 'Europe (England)', formation: 'Wessex',
      named: 1996, namedBy: 'Hutt and colleagues',
      blurb: 'The best-known large predator from the Isle of Wight, with a sensitive, nerve-rich snout.',
      traits: ['Slender predatory build', 'Sensitive snout', 'Bladed teeth'],
      facts: ['Nerve canals suggest a very sensitive face.', 'It is Britain’s best-known big meat-eater.'],
      uncertain: 'What the sensitive snout was used for is inferred.',
      howKnow: 'A fairly complete skeleton from the Isle of Wight.'
    },
    {
      id: 'irritator', name: 'Irritator challengeri', common: 'Irritator',
      say: 'IRR-ih-TAY-tor', meaning: 'irritator',
      group: 'theropod', clade: 'Spinosauridae', diet: 'piscivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 113, myaLo: 110,
      lengthM: 7.5, heightM: 2.4, weightKg: 1000, speedKmh: 22,
      region: 'South America (Brazil)', formation: 'Romualdo',
      named: 1996, namedBy: 'Martill and colleagues',
      blurb: 'A Brazilian spinosaur named for the "irritation" of a fossil that dealers had altered before study.',
      traits: ['Long crocodile-like snout', 'Conical teeth', 'Low head crest'],
      facts: ['Dealers had added plaster to the skull, annoying the scientists.', 'The species name honors Professor Challenger from fiction.'],
      uncertain: 'How much it fished versus hunted is inferred from its snout.',
      howKnow: 'A good skull from northeastern Brazil.'
    },
    {
      id: 'ichthyovenator', name: 'Ichthyovenator laosensis', common: 'Ichthyovenator',
      say: 'IK-thee-oh-VEN-uh-tor', meaning: 'fish hunter',
      group: 'theropod', clade: 'Spinosauridae', diet: 'piscivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 113,
      lengthM: 8.5, heightM: 2.6, weightKg: 2000, speedKmh: 22,
      region: 'Asia (Laos)', formation: 'Grès supérieurs',
      named: 2012, namedBy: 'Allain and colleagues',
      blurb: 'An Asian spinosaur with an unusual two-part sail dipping over its hips.',
      traits: ['Split (two-part) back sail', 'Long fish-eating snout', 'Conical teeth'],
      facts: ['Its sail had a notch, unlike the single sail of Spinosaurus.', 'It is the first good spinosaur from Laos.'],
      uncertain: 'The sail’s purpose is inferred from its shape.',
      howKnow: 'A partial skeleton from Laos.'
    },
    {
      id: 'ornithomimus', name: 'Ornithomimus velox', common: 'Ornithomimus',
      say: 'OR-nith-uh-MIME-us', meaning: 'bird mimic',
      group: 'theropod', clade: 'Ornithomimidae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 66,
      lengthM: 3.8, heightM: 1.4, weightKg: 170, speedKmh: 55,
      region: 'North America', formation: 'Denver',
      named: 1890, namedBy: 'Othniel Charles Marsh',
      blurb: 'A fast, ostrich-like dinosaur with a toothless beak, now known to have had feathers and wing-like arms.',
      traits: ['Toothless beak', 'Very long legs', 'Feathered, with wing-like arms'],
      facts: ['Specimens preserve feather traces and possible wings.', 'It was built for speed across open ground.'],
      uncertain: 'What the wing-like arms were for (display, brooding) is inferred.',
      howKnow: 'Several skeletons, some with feather impressions.'
    },
    {
      id: 'pelecanimimus', name: 'Pelecanimimus polyodon', common: 'Pelecanimimus',
      say: 'PEL-ih-KAN-ih-MIME-us', meaning: 'pelican mimic',
      group: 'theropod', clade: 'Ornithomimosauria', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 125,
      lengthM: 2.5, heightM: 0.9, weightKg: 40, speedKmh: 45,
      region: 'Europe (Spain)', formation: 'La Huérguina',
      named: 1994, namedBy: 'Pérez-Moreno and colleagues',
      blurb: 'An early "bird mimic" that broke the rules by having more than 200 tiny teeth and a throat pouch.',
      traits: ['Over 200 small teeth', 'Possible throat pouch', 'Long, low snout'],
      facts: ['Most ornithomimosaurs are toothless; this early one was not.', 'A soft-tissue throat pouch is preserved.'],
      uncertain: 'How it used so many tiny teeth is inferred.',
      howKnow: 'A skeleton with soft tissue from Spain.'
    },
    {
      id: 'shuvuuia', name: 'Shuvuuia deserti', common: 'Shuvuuia',
      say: 'shoo-VOO-ee-uh', meaning: 'desert bird',
      group: 'theropod', clade: 'Alvarezsauridae', diet: 'insectivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 0.6, heightM: 0.2, weightKg: 2, speedKmh: 45,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 1998, namedBy: 'Chiappe and colleagues',
      blurb: 'A tiny desert insect-eater with stubby one-clawed arms and superb night vision and hearing.',
      traits: ['Stubby one-clawed arms', 'Large eyes and ears for the night', 'Long running legs'],
      facts: ['Its eye and ear bones suggest it hunted at night, like a barn owl.', 'The single claw may have dug into insect nests.'],
      uncertain: 'Its exact diet is inferred from its tiny digging arms.',
      howKnow: 'Skeletons from the Gobi Desert.'
    },
    {
      id: 'mei', name: 'Mei long', common: 'Mei',
      say: 'MAY long', meaning: 'soundly sleeping dragon',
      group: 'theropod', clade: 'Troodontidae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 0.7, heightM: 0.2, weightKg: 1, speedKmh: 40,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2004, namedBy: 'Xu & Norell',
      blurb: 'A tiny troodontid preserved curled up in a bird-like sleeping pose, head tucked under its arm.',
      traits: ['Bird-like sleeping posture', 'Small and slender', 'Sickle claw'],
      facts: ['It died curled up like a sleeping bird, tucked under one "wing".', 'Its name is one of the shortest of any dinosaur.'],
      uncertain: 'Whether it died asleep or was simply buried curled up is inferred.',
      howKnow: 'Specimens preserved in a roosting pose from China.'
    },
    {
      id: 'sinornithosaurus', name: 'Sinornithosaurus millenii', common: 'Sinornithosaurus',
      say: 'SY-nor-NITH-uh-SOR-us', meaning: 'Chinese bird lizard',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 1.2, heightM: 0.4, weightKg: 3, speedKmh: 40,
      region: 'Asia (China)', formation: 'Yixian',
      named: 1999, namedBy: 'Xu, Wang & Wu',
      blurb: 'One of the most bird-like raptors, preserved with downy and vaned feathers across its body.',
      traits: ['Downy and vaned feathers', 'Sickle claw', 'Slender build'],
      facts: ['It helped show raptors were thoroughly feathered.', 'A claim that it was venomous is not widely accepted.'],
      uncertain: 'The venom idea is disputed and likely wrong.',
      howKnow: 'Feathered specimens from China’s Jehol beds.'
    },
    {
      id: 'changyuraptor', name: 'Changyuraptor yangi', common: 'Changyuraptor',
      say: 'CHANG-yoo-RAP-tor', meaning: 'long-feathered thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 1.3, heightM: 0.4, weightKg: 4, speedKmh: 35,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2014, namedBy: 'Han and colleagues',
      blurb: 'A four-winged raptor with the longest known feathers of any non-bird dinosaur, a 30 cm "tail streamer".',
      traits: ['Feathers on arms and legs', 'Very long tail feathers', 'A larger four-winged glider'],
      facts: ['Its tail feathers reach about 30 cm long.', 'It shows four-winged gliders came in larger sizes.'],
      uncertain: 'Exactly how it controlled gliding with long tail feathers is modeled.',
      howKnow: 'A well-feathered skeleton from China.'
    },
    {
      id: 'saurornitholestes', name: 'Saurornitholestes langstoni', common: 'Saurornitholestes',
      say: 'sor-OR-nith-uh-LES-teez', meaning: 'lizard-bird thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 75,
      lengthM: 1.8, heightM: 0.6, weightKg: 10, speedKmh: 45,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1978, namedBy: 'Hans-Dieter Sues',
      blurb: 'A common North American raptor, smaller and more lightly built than Velociraptor’s North American kin.',
      traits: ['Sickle claw', 'Light, fast build', 'Specialized back teeth'],
      facts: ['It is one of the most common small predators in its beds.', 'Its teeth show wear from a varied diet.'],
      uncertain: 'Its full skeleton was pieced together over decades.',
      howKnow: 'Many teeth and bones, with a good skull described later.'
    },
    {
      id: 'balaur', name: 'Balaur bondoc', common: 'Balaur',
      say: 'buh-LOWR', meaning: 'stocky dragon',
      group: 'theropod', clade: 'Avialae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 2, heightM: 0.6, weightKg: 15, speedKmh: 30,
      region: 'Europe (Romania)', formation: 'Sebeş',
      named: 2010, namedBy: 'Csiki and colleagues',
      blurb: 'A stocky island predator with two sickle claws on each foot, a strange dweller of Cretaceous Europe.',
      traits: ['Two sickle claws per foot', 'Stocky, muscular legs', 'Island dweller'],
      facts: ['It had a double set of killer claws.', 'It evolved odd features in isolation on a European island.'],
      uncertain: 'Whether it is a raptor or an early flightless bird is debated.',
      howKnow: 'A partial skeleton from Romania.'
    },
    {
      id: 'rahonavis', name: 'Rahonavis ostromi', common: 'Rahonavis',
      say: 'rah-HOO-nuh-vis', meaning: 'cloud menace bird',
      group: 'theropod', clade: 'Avialae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 0.7, heightM: 0.25, weightKg: 1, speedKmh: 30,
      region: 'Africa (Madagascar)', formation: 'Maevarano',
      named: 1998, namedBy: 'Forster and colleagues',
      blurb: 'A crow-sized animal blurring the line between raptor and bird, with both a sickle claw and quill knobs.',
      traits: ['Sickle claw like a raptor', 'Wing quill knobs', 'Very bird-like'],
      facts: ['It mixes raptor and bird features in one animal.', 'It shows how blurry the bird-dinosaur boundary is.'],
      uncertain: 'Whether it could fly is debated.',
      howKnow: 'A partial skeleton from Madagascar.'
    },
    {
      id: 'haplocanthosaurus', name: 'Haplocanthosaurus priscus', common: 'Haplocanthosaurus',
      say: 'HAP-loh-KAN-thuh-SOR-us', meaning: 'single-spined lizard',
      group: 'sauropod', clade: 'Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 150,
      lengthM: 14.5, heightM: 4, weightKg: 13000, speedKmh: 14,
      region: 'North America', formation: 'Morrison',
      named: 1903, namedBy: 'John Bell Hatcher',
      blurb: 'A more primitive Morrison sauropod, useful for understanding how the long-necked giants were related.',
      traits: ['Simple, single-spined vertebrae', 'Medium-long neck', 'Sturdy build'],
      facts: ['It is one of the more primitive Morrison sauropods.', 'It helps anchor sauropod family relationships.'],
      uncertain: 'Its exact relationships are still studied.',
      howKnow: 'Partial skeletons from the Morrison Formation.'
    },
    {
      id: 'omeisaurus', name: 'Omeisaurus tianfuensis', common: 'Omeisaurus',
      say: 'OH-may-SOR-us', meaning: 'Omei lizard',
      group: 'sauropod', clade: 'Mamenchisauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 170, myaLo: 160,
      lengthM: 15, heightM: 5, weightKg: 9000, speedKmh: 12,
      region: 'Asia (China)', formation: 'Shaximiao',
      named: 1939, namedBy: 'Yang Zhongjian',
      blurb: 'A long-necked Chinese sauropod, one of many giants from the rich Jurassic beds of Sichuan.',
      traits: ['Very long neck', 'Small head', 'Sturdy body'],
      facts: ['It is one of the best-known Chinese sauropods.', 'Its neck made up much of its length.'],
      uncertain: 'Several named species may need revision.',
      howKnow: 'Many skeletons from Jurassic China.'
    },
    {
      id: 'euhelopus', name: 'Euhelopus zdanskyi', common: 'Euhelopus',
      say: 'yoo-HEL-uh-pus', meaning: 'good marsh foot',
      group: 'sauropod', clade: 'Titanosauriformes', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 125,
      lengthM: 15, heightM: 5, weightKg: 15000, speedKmh: 12,
      region: 'Asia (China)', formation: 'Mengyin',
      named: 1929, namedBy: 'Carl Wiman',
      blurb: 'One of the first Chinese dinosaurs studied scientifically, a long-necked plant-eater with a high shoulder.',
      traits: ['Long neck held high', 'Spoon-shaped teeth', 'Sturdy limbs'],
      facts: ['It was among the earliest Chinese dinosaurs described.', 'Its long neck reached high vegetation.'],
      uncertain: 'Its exact age and relationships have been revised.',
      howKnow: 'Partial skeletons from Shandong, China.'
    },
    {
      id: 'sauroposeidon', name: 'Sauroposeidon proteles', common: 'Sauroposeidon',
      say: 'SOR-oh-poh-SY-don', meaning: 'earthquake god lizard',
      group: 'sauropod', clade: 'Brachiosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 112, myaLo: 110,
      lengthM: 28, heightM: 17, weightKg: 40000, speedKmh: 12,
      region: 'North America', formation: 'Antlers',
      named: 2000, namedBy: 'Wedel and colleagues',
      blurb: 'Possibly the tallest dinosaur, a brachiosaur with neck bones over a meter long each.',
      traits: ['Extremely tall, long neck', 'Among the tallest dinosaurs', 'Air-filled neck bones'],
      facts: ['Its neck bones were at first mistaken for fossil tree trunks.', 'It may have raised its head some 17 meters up.'],
      uncertain: 'Its full size is scaled from a few giant neck bones.',
      howKnow: 'A set of giant neck vertebrae from Oklahoma.'
    },
    {
      id: 'malawisaurus', name: 'Malawisaurus dixeyi', common: 'Malawisaurus',
      say: 'muh-LAH-wih-SOR-us', meaning: 'Malawi lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 115, myaLo: 110,
      lengthM: 16, heightM: 5, weightKg: 10000, speedKmh: 12,
      region: 'Africa (Malawi)', formation: 'Dinosaur Beds',
      named: 1993, namedBy: 'Jacobs and colleagues',
      blurb: 'One of the few early titanosaurs known from skull material, helping reveal what their heads looked like.',
      traits: ['Rare titanosaur skull bones', 'Bony skin armor', 'Long neck'],
      facts: ['Skull material is rare for titanosaurs; this one helps.', 'It had small bony armor in its skin.'],
      uncertain: 'Much of its body is reconstructed from relatives.',
      howKnow: 'Skull and skeletal pieces from Malawi.'
    },
    {
      id: 'alamosaurus', name: 'Alamosaurus sanjuanensis', common: 'Alamosaurus',
      say: 'AL-uh-moh-SOR-us', meaning: 'Ojo Alamo lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 26, heightM: 9, weightKg: 38000, speedKmh: 10,
      region: 'North America', formation: 'North Horn',
      named: 1922, namedBy: 'Charles Gilmore',
      blurb: 'The only giant sauropod in latest-Cretaceous North America, sharing its world with T. rex.',
      traits: ['Giant titanosaur', 'Long neck and tail', 'Returned to North America late'],
      facts: ['It brought giant sauropods back to North America at the very end.', 'It lived alongside T. rex in the south.'],
      uncertain: 'Its top size estimates rest on scattered giant bones.',
      howKnow: 'Many bones from the American Southwest.'
    },
    {
      id: 'nemegtosaurus', name: 'Nemegtosaurus mongoliensis', common: 'Nemegtosaurus',
      say: 'neh-MEG-tuh-SOR-us', meaning: 'Nemegt lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 68,
      lengthM: 13, heightM: 4, weightKg: 13000, speedKmh: 12,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 1971, namedBy: 'Nowinski',
      blurb: 'A titanosaur known mainly from a good skull, possibly the head that belongs to Opisthocoelicaudia’s body.',
      traits: ['Good skull preserved', 'Peg-like teeth', 'Long neck'],
      facts: ['It is one of the few titanosaurs known from a skull.', 'It may be the head of the headless Opisthocoelicaudia.'],
      uncertain: 'Whether it and Opisthocoelicaudia are the same animal is debated.',
      howKnow: 'A good skull from the Gobi Desert.'
    },
    {
      id: 'magyarosaurus', name: 'Magyarosaurus dacus', common: 'Magyarosaurus',
      say: 'MAH-jar-uh-SOR-us', meaning: 'Magyar lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 6, heightM: 2, weightKg: 900, speedKmh: 10,
      region: 'Europe (Romania)', formation: 'Sânpetru',
      named: 1932, namedBy: 'Friedrich von Huene',
      blurb: 'A dwarf titanosaur, horse-sized rather than giant, that shrank on a Cretaceous European island.',
      traits: ['Tiny for a titanosaur', 'Island dwarf', 'Slow growth'],
      facts: ['Bone studies confirm these are small adults, not babies.', 'Limited island food shrank its lineage.'],
      uncertain: 'How its island geography worked is reconstructed from rocks.',
      howKnow: 'Many bones from Romania’s Haţeg Island fauna.'
    },
    {
      id: 'ampelosaurus', name: 'Ampelosaurus atacis', common: 'Ampelosaurus',
      say: 'AM-pel-uh-SOR-us', meaning: 'vineyard lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 70,
      lengthM: 15, heightM: 4, weightKg: 8000, speedKmh: 12,
      region: 'Europe (France)', formation: 'Marnes Rouges',
      named: 1995, namedBy: 'Le Loeuff',
      blurb: 'A European titanosaur covered in bony armor, named for the vineyards above its dig site.',
      traits: ['Bony skin armor', 'Medium-sized titanosaur', 'Spoon-shaped teeth'],
      facts: ['It is one of the best-known European titanosaurs.', 'Its name honors the vineyards over the quarry.'],
      uncertain: 'How the armor was arranged is reconstructed from scattered plates.',
      howKnow: 'Many bones from southern France.'
    },
    {
      id: 'concavenator', name: 'Concavenator corcovatus', common: 'Concavenator',
      say: 'kon-kuh-VEN-uh-tor', meaning: 'hump-backed hunter',
      group: 'theropod', clade: 'Carcharodontosauria', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 125,
      lengthM: 6, heightM: 2, weightKg: 400, speedKmh: 30,
      region: 'Europe (Spain)', formation: 'La Huérguina',
      named: 2010, namedBy: 'Ortega and colleagues',
      blurb: 'A Spanish predator with a tall hump over its hips and possible quill knobs on its arm.',
      traits: ['Tall hip hump', 'Possible arm quill knobs', 'Slender build'],
      facts: ['Bumps on its arm may mark feather-like structures.', 'It preserves fine skin detail.'],
      uncertain: 'Whether the arm bumps are quill knobs or muscle scars is debated.',
      howKnow: 'A nearly complete skeleton from Spain with soft-tissue traces.'
    },
    {
      id: 'haplocheirus', name: 'Haplocheirus sollers', common: 'Haplocheirus',
      say: 'HAP-loh-KY-rus', meaning: 'simple hand',
      group: 'theropod', clade: 'Alvarezsauroidea', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 160, myaLo: 156,
      lengthM: 2, heightM: 0.6, weightKg: 25, speedKmh: 45,
      region: 'Asia (China)', formation: 'Shishugou',
      named: 2010, namedBy: 'Choiniere and colleagues',
      blurb: 'An early relative of the one-clawed alvarezsaurs, but still with three grasping fingers.',
      traits: ['Three-fingered grasping hands', 'Long legs', 'Slender build'],
      facts: ['It shows the one-clawed alvarezsaurs started with normal hands.', 'It is much older than its tiny relatives.'],
      uncertain: 'Exactly how the single claw later evolved is inferred.',
      howKnow: 'A good skeleton from Jurassic China.'
    },
    {
      id: 'agilisaurus', name: 'Agilisaurus louderbacki', common: 'Agilisaurus',
      say: 'uh-JIL-ih-SOR-us', meaning: 'agile lizard',
      group: 'ornithischian', clade: 'early Ornithischia', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 170, myaLo: 160,
      lengthM: 1.2, heightM: 0.4, weightKg: 6, speedKmh: 38,
      region: 'Asia (China)', formation: 'Lower Shaximiao',
      named: 1990, namedBy: 'Peng',
      blurb: 'A small, fast, lightly built plant-eater from Jurassic China, known from a fine skeleton.',
      traits: ['Light, speedy build', 'Long running legs', 'Leaf-shaped teeth'],
      facts: ['It is known from one of the most complete small ornithischian skeletons.', 'Speed was likely its main defense.'],
      uncertain: 'Its exact place near the base of the bird-hipped tree is studied.',
      howKnow: 'A nearly complete skeleton from China.'
    },
    {
      id: 'jeholosaurus', name: 'Jeholosaurus shangyuanensis', common: 'Jeholosaurus',
      say: 'JEH-hoh-luh-SOR-us', meaning: 'Jehol lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 1, heightM: 0.3, weightKg: 4, speedKmh: 35,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2000, namedBy: 'Xu, Wang & You',
      blurb: 'A small plant-eater from the famous Jehol beds, known from several skulls and skeletons.',
      traits: ['Small and speedy', 'Beak and cheek teeth', 'Possible burrower'],
      facts: ['It lived among the feathered dinosaurs of the Jehol beds.', 'Several skulls show how it grew.'],
      uncertain: 'Hints that it burrowed are still being tested.',
      howKnow: 'Several skulls and skeletons from China.'
    },
    {
      id: 'brachylophosaurus', name: 'Brachylophosaurus canadensis', common: 'Brachylophosaurus',
      say: 'BRAK-ee-LOAF-uh-SOR-us', meaning: 'short-crested lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 78, myaLo: 76,
      lengthM: 9, heightM: 3, weightKg: 3500, speedKmh: 24,
      region: 'North America', formation: 'Judith River',
      named: 1953, namedBy: 'Charles M. Sternberg',
      blurb: 'A flat, paddle-crested duck-bill famous for "Leonardo", a mummy preserving skin and stomach contents.',
      traits: ['Flat paddle-like crest', 'Grinding tooth batteries', 'Famous mummified specimen'],
      facts: ['The mummy "Leonardo" preserves skin and its last meal.', 'Its stomach showed a diet of leaves and pollen.'],
      uncertain: 'How representative one preserved meal is for the whole species is unknown.',
      howKnow: 'Several skeletons, including the famous mummy Leonardo.'
    },
    {
      id: 'kritosaurus', name: 'Kritosaurus navajovius', common: 'Kritosaurus',
      say: 'KRIT-uh-SOR-us', meaning: 'separated lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 73,
      lengthM: 9, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'North America', formation: 'Kirtland',
      named: 1910, namedBy: 'Barnum Brown',
      blurb: 'A duck-bill with an arched "Roman nose" snout, an early-named member of a confusing group.',
      traits: ['Arched nasal bump', 'No hollow crest', 'Grinding teeth'],
      facts: ['Its name and identity have been tangled for over a century.', 'It is a southern relative of Gryposaurus.'],
      uncertain: 'Which fossils truly belong to it has long been debated.',
      howKnow: 'Skull material from the American Southwest.'
    },
    {
      id: 'charonosaurus', name: 'Charonosaurus jiayinensis', common: 'Charonosaurus',
      say: 'kuh-ROH-nuh-SOR-us', meaning: 'Charon’s lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 10, heightM: 3.5, weightKg: 5000, speedKmh: 24,
      region: 'Asia (China)', formation: 'Yuliangze',
      named: 2000, namedBy: 'Godefroit and colleagues',
      blurb: 'A giant hollow-crested duck-bill from the Amur River, a close relative of Parasaurolophus.',
      traits: ['Long hollow head crest', 'Very large duck-bill', 'Hundreds of teeth'],
      facts: ['It lived right at the end of the dinosaur age.', 'It is a Chinese cousin of the trumpet-crested duck-bills.'],
      uncertain: 'Its full crest shape is reconstructed from partial skulls.',
      howKnow: 'Many bones from the China-Russia border region.'
    },
    {
      id: 'kamuysaurus', name: 'Kamuysaurus japonicus', common: 'Kamuysaurus',
      say: 'kah-MOO-ee-SOR-us', meaning: 'deity lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 71,
      lengthM: 8, heightM: 3, weightKg: 4000, speedKmh: 24,
      region: 'Asia (Japan)', formation: 'Hakobuchi',
      named: 2019, namedBy: 'Kobayashi and colleagues',
      blurb: 'A Japanese duck-bill nicknamed "Mukawaryu", one of the most complete dinosaurs found in Japan.',
      traits: ['Possible small crest', 'Grinding tooth batteries', 'Coastal dweller'],
      facts: ['It is one of Japan’s most complete dinosaur skeletons.', 'It lived along an ancient coastline.'],
      uncertain: 'Whether it had a fleshy crest is inferred from skull bumps.',
      howKnow: 'A largely complete skeleton from Hokkaido, Japan.'
    },
    {
      id: 'telmatosaurus', name: 'Telmatosaurus transsylvanicus', common: 'Telmatosaurus',
      say: 'tel-MAT-uh-SOR-us', meaning: 'marsh lizard',
      group: 'ornithischian', clade: 'Hadrosauroidea', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 5, heightM: 1.6, weightKg: 600, speedKmh: 22,
      region: 'Europe (Romania)', formation: 'Sânpetru',
      named: 1900, namedBy: 'Franz Nopcsa',
      blurb: 'A small, primitive island duck-bill from the same dwarfed Romanian fauna as Magyarosaurus.',
      traits: ['Small, primitive duck-bill', 'Island dweller', 'No hollow crest'],
      facts: ['It is part of the famous dwarfed island fauna of Haţeg.', 'A fossil egg even shows a possible jaw deformity.'],
      uncertain: 'Whether its small size is dwarfism is supported but still studied.',
      howKnow: 'Skulls and bones from Romania’s Haţeg Island.'
    },
    {
      id: 'avaceratops', name: 'Avaceratops lammersi', common: 'Avaceratops',
      say: 'AY-vuh-SERR-uh-tops', meaning: 'Ava’s horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 78, myaLo: 76,
      lengthM: 4, heightM: 1.5, weightKg: 1000, speedKmh: 25,
      region: 'North America', formation: 'Judith River',
      named: 1986, namedBy: 'Peter Dodson',
      blurb: 'A small horned dinosaur named after the discoverer’s wife Ava, found in a river channel.',
      traits: ['Short frill', 'Small body', 'Beak and shearing teeth'],
      facts: ['The first specimen was a young animal.', 'It is named for Ava Cole, the finder’s wife.'],
      uncertain: 'Its adult size and features are estimated from a juvenile.',
      howKnow: 'A partial skeleton from Montana.'
    },
    {
      id: 'anchiceratops', name: 'Anchiceratops ornatus', common: 'Anchiceratops',
      say: 'ANG-kee-SERR-uh-tops', meaning: 'near horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 71,
      lengthM: 5, heightM: 1.8, weightKg: 2000, speedKmh: 25,
      region: 'North America', formation: 'Horseshoe Canyon',
      named: 1914, namedBy: 'Barnum Brown',
      blurb: 'A horned dinosaur with a long frill rimmed with rounded bumps, common in its time and place.',
      traits: ['Long frill with bumpy edge', 'Three main horns', 'Heavy body'],
      facts: ['Its frill edge is lined with rounded knobs.', 'It lived in a coastal swampy setting.'],
      uncertain: 'How its frill knobs were used is inferred.',
      howKnow: 'Several skulls from Alberta.'
    },
    {
      id: 'torosaurus', name: 'Torosaurus latus', common: 'Torosaurus',
      say: 'TOR-uh-SOR-us', meaning: 'perforated lizard',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66,
      lengthM: 8, heightM: 3, weightKg: 6000, speedKmh: 25,
      region: 'North America', formation: 'Hell Creek',
      named: 1891, namedBy: 'Othniel Charles Marsh',
      blurb: 'A horned dinosaur with one of the largest skulls of any land animal, possibly a fully mature Triceratops.',
      traits: ['Enormous frill with two windows', 'Long brow horns', 'Among the largest skulls'],
      facts: ['Its frill, with skull, can exceed 2.5 meters.', 'A famous debate asks if it is just an old Triceratops.'],
      uncertain: 'Whether Torosaurus is a separate genus or mature Triceratops is unresolved.',
      howKnow: 'Several giant skulls from the latest Cretaceous.'
    },
    {
      id: 'medusaceratops', name: 'Medusaceratops lokii', common: 'Medusaceratops',
      say: 'meh-DOO-suh-SERR-uh-tops', meaning: 'Medusa horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 78, myaLo: 77,
      lengthM: 6, heightM: 2, weightKg: 2500, speedKmh: 25,
      region: 'North America', formation: 'Judith River',
      named: 2010, namedBy: 'Ryan and colleagues',
      blurb: 'A horned dinosaur with snaking hook-like frill horns that earned it the name of the snake-haired Medusa.',
      traits: ['Snaking frill horns', 'Large brow horns', 'Heavy body'],
      facts: ['Its curling frill horns inspired the Medusa name.', 'It is one of the older big horned dinosaurs.'],
      uncertain: 'Some of its fossils were first confused with other ceratopsians.',
      howKnow: 'Skull material from a Montana bonebed.'
    },
    {
      id: 'wendiceratops', name: 'Wendiceratops pinhornensis', common: 'Wendiceratops',
      say: 'WEN-dee-SERR-uh-tops', meaning: 'Wendy’s horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 79, myaLo: 78,
      lengthM: 6, heightM: 2, weightKg: 2000, speedKmh: 25,
      region: 'North America', formation: 'Oldman',
      named: 2015, namedBy: 'Evans & Ryan',
      blurb: 'A horned dinosaur named for famed fossil hunter Wendy Sloboda, with a curling, ornate frill.',
      traits: ['Curling frill hooks', 'Nose horn', 'Herd animal'],
      facts: ['It honors prolific fossil finder Wendy Sloboda.', 'It is one of the oldest known nose-horned ceratopsids.'],
      uncertain: 'Its exact horn shape is reconstructed from a bonebed.',
      howKnow: 'A bonebed of many individuals in Alberta.'
    },
    {
      id: 'diabloceratops', name: 'Diabloceratops eatoni', common: 'Diabloceratops',
      say: 'dee-AB-loh-SERR-uh-tops', meaning: 'devil horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 81, myaLo: 80,
      lengthM: 5.5, heightM: 2, weightKg: 1800, speedKmh: 25,
      region: 'North America', formation: 'Wahweap',
      named: 2010, namedBy: 'Kirkland & DeBlieux',
      blurb: 'An early horned dinosaur with two long devil-like frill spikes, among the oldest big ceratopsids.',
      traits: ['Two long frill spikes', 'Short nose horn', 'Deep skull'],
      facts: ['Its tall frill spikes suggested the devil name.', 'It is one of the earliest big horned dinosaurs.'],
      uncertain: 'Its place in horned dinosaur evolution is studied.',
      howKnow: 'A skull from southern Utah.'
    },
    {
      id: 'dacentrurus', name: 'Dacentrurus armatus', common: 'Dacentrurus',
      say: 'duh-SEN-troo-rus', meaning: 'very sharp tail',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 154, myaLo: 150,
      lengthM: 8, heightM: 2.5, weightKg: 5000, speedKmh: 8,
      region: 'Europe (England/Portugal)', formation: 'Various',
      named: 1875, namedBy: 'Richard Owen',
      blurb: 'The first stegosaur ever named, a large European plated dinosaur with paired spikes and plates.',
      traits: ['Paired back spikes and plates', 'Heavy body', 'Tail spikes'],
      facts: ['It was the first stegosaur to be scientifically named.', 'It was large for a European plated dinosaur.'],
      uncertain: 'Its plate and spike arrangement is reconstructed from scattered bones.',
      howKnow: 'Bones from England, Portugal, and France.'
    },
    {
      id: 'miragaia', name: 'Miragaia longicollum', common: 'Miragaia',
      say: 'mih-rah-GUY-uh', meaning: 'for Miragaia parish',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 152, myaLo: 148,
      lengthM: 6, heightM: 2, weightKg: 2000, speedKmh: 8,
      region: 'Europe (Portugal)', formation: 'Sobral',
      named: 2009, namedBy: 'Mateus and colleagues',
      blurb: 'A stegosaur with a surprisingly long neck of at least 17 vertebrae, rivaling some sauropods.',
      traits: ['Long neck for a stegosaur', 'Paired plates', 'Tail spikes'],
      facts: ['Its long neck had more bones than some long-necked sauropods.', 'It shows stegosaurs were more varied than expected.'],
      uncertain: 'Why a plated dinosaur needed a long neck is debated.',
      howKnow: 'A good front-half skeleton from Portugal.'
    },
    {
      id: 'tuojiangosaurus', name: 'Tuojiangosaurus multispinus', common: 'Tuojiangosaurus',
      say: 'too-WHO-jee-AHNG-uh-SOR-us', meaning: 'Tuo River lizard',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 160, myaLo: 155,
      lengthM: 7, heightM: 2, weightKg: 2800, speedKmh: 8,
      region: 'Asia (China)', formation: 'Upper Shaximiao',
      named: 1977, namedBy: 'Dong and colleagues',
      blurb: 'The best-known Chinese stegosaur, with tall pointed plates and a spiked, thagomizer-tipped tail.',
      traits: ['Tall pointed back plates', 'Two pairs of tail spikes', 'Small head'],
      facts: ['It is the best-known stegosaur from China.', 'Its plates were narrower and more pointed than Stegosaurus.'],
      uncertain: 'Exact plate arrangement is reconstructed from the skeleton.',
      howKnow: 'Good skeletons from Jurassic China.'
    },
    {
      id: 'talarurus', name: 'Talarurus plicatospineus', common: 'Talarurus',
      say: 'tuh-LAR-oo-rus', meaning: 'wicker tail',
      group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 96, myaLo: 89,
      lengthM: 5, heightM: 1.4, weightKg: 2000, speedKmh: 10,
      region: 'Asia (Mongolia)', formation: 'Bayan Shireh',
      named: 1952, namedBy: 'Evgeny Maleev',
      blurb: 'An armored, club-tailed dinosaur from Mongolia with small upward-pointing armor studs.',
      traits: ['Tail club', 'Studded body armor', 'Wide gut'],
      facts: ['Its tail bones interlock like wickerwork, giving its name.', 'It is one of the older Asian ankylosaurs.'],
      uncertain: 'How much armor covered the body is reconstructed.',
      howKnow: 'Several specimens from Mongolia.'
    },
    {
      id: 'tarchia', name: 'Tarchia kielanae', common: 'Tarchia',
      say: 'TAR-kee-uh', meaning: 'brainy one',
      group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 7, heightM: 1.8, weightKg: 3000, speedKmh: 10,
      region: 'Asia (Mongolia)', formation: 'Barun Goyot',
      named: 1977, namedBy: 'Teresa Maryańska',
      blurb: 'One of the largest Asian armored dinosaurs, with a big tail club and a relatively large braincase.',
      traits: ['Large tail club', 'Heavy armor', 'Relatively large brain'],
      facts: ['Its name means "brainy" for its braincase.', 'It is among the biggest Asian ankylosaurs.'],
      uncertain: 'Which specimens belong to it has been reshuffled over time.',
      howKnow: 'Skulls and skeletons from the Gobi Desert.'
    },
    {
      id: 'hylaeosaurus', name: 'Hylaeosaurus armatus', common: 'Hylaeosaurus',
      say: 'hy-LEE-uh-SOR-us', meaning: 'woodland lizard',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 137, myaLo: 132,
      lengthM: 5, heightM: 1.4, weightKg: 2000, speedKmh: 10,
      region: 'Europe (England)', formation: 'Grinstead Clay',
      named: 1833, namedBy: 'Gideon Mantell',
      blurb: 'One of the first dinosaurs ever named, an armored plant-eater that helped found the very idea of Dinosauria.',
      traits: ['Rows of body armor', 'Shoulder spikes', 'Heavy build'],
      facts: ['It was one of the three original dinosaurs Owen used to define Dinosauria.', 'Its full body is still poorly known.'],
      uncertain: 'It is known from limited material, so much is uncertain.',
      howKnow: 'A partial armored skeleton from England.'
    },
    {
      id: 'gargoyleosaurus', name: 'Gargoyleosaurus parkpinorum', common: 'Gargoyleosaurus',
      say: 'gar-GOY-lee-uh-SOR-us', meaning: 'gargoyle lizard',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 150,
      lengthM: 3, heightM: 1, weightKg: 1000, speedKmh: 10,
      region: 'North America', formation: 'Morrison',
      named: 1998, namedBy: 'Carpenter and colleagues',
      blurb: 'One of the earliest and best-known armored dinosaurs, small and bristling with spikes.',
      traits: ['Many bony spikes and plates', 'Small body', 'No tail club'],
      facts: ['It is one of the oldest well-known ankylosaurs.', 'Its spiky look earned the gargoyle name.'],
      uncertain: 'Its exact place among armored dinosaurs is studied.',
      howKnow: 'A good skull and partial skeleton from Wyoming.'
    },
    {
      id: 'prenocephale', name: 'Prenocephale prenes', common: 'Prenocephale',
      say: 'PREE-nuh-SEF-uh-lee', meaning: 'sloping head',
      group: 'ornithischian', clade: 'Pachycephalosauridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 68,
      lengthM: 2.4, heightM: 0.9, weightKg: 45, speedKmh: 30,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 1974, namedBy: 'Maryańska & Osmólska',
      blurb: 'A dome-headed dinosaur with a rounded skull ringed by small bony bumps.',
      traits: ['Rounded skull dome', 'Ring of skull knobs', 'Two-legged build'],
      facts: ['Its dome is more rounded than Pachycephalosaurus.', 'It is among the best-known Asian dome-heads.'],
      uncertain: 'Whether it head-butted is debated for all dome-heads.',
      howKnow: 'Good skulls from the Gobi Desert.'
    },
    {
      id: 'homalocephale', name: 'Homalocephale calathocercos', common: 'Homalocephale',
      say: 'hoh-muh-luh-SEF-uh-lee', meaning: 'even head',
      group: 'ornithischian', clade: 'Pachycephalosauridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 1.8, heightM: 0.7, weightKg: 40, speedKmh: 30,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 1974, namedBy: 'Maryańska & Osmólska',
      blurb: 'A flat-headed dome-head that some think is a juvenile of the dome-skulled Prenocephale.',
      traits: ['Flat, not domed, skull', 'Knobby skull edge', 'Two-legged build'],
      facts: ['Its flat head may simply be a young, undomed individual.', 'It feeds the debate over dome-head growth.'],
      uncertain: 'Whether it is its own genus or a growth stage is debated.',
      howKnow: 'A partial skeleton from Mongolia.'
    },
    {
      id: 'antetonitrus', name: 'Antetonitrus ingenipes', common: 'Antetonitrus',
      say: 'AN-tee-tuh-NY-trus', meaning: 'before the thunder',
      group: 'sauropod', clade: 'early Sauropoda', diet: 'herbivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 211, myaLo: 205,
      lengthM: 10, heightM: 3, weightKg: 2000, speedKmh: 12,
      region: 'Africa (South Africa)', formation: 'Lower Elliot',
      named: 2003, namedBy: 'Yates & Kitching',
      blurb: 'One of the earliest true sauropods, caught in the transition to walking fully on all fours.',
      traits: ['Transitional sauropod feet', 'Still some grasping ability', 'Heavy body'],
      facts: ['Its name means "before the thunder lizards".', 'It captures the start of the giant sauropod lineage.'],
      uncertain: 'Exactly how it stood and moved is inferred from its limb bones.',
      howKnow: 'A partial skeleton from southern Africa.'
    },
    {
      id: 'ledumahadi', name: 'Ledumahadi mafube', common: 'Ledumahadi',
      say: 'led-oo-mah-HAH-dee', meaning: 'a giant thunderclap',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 200, myaLo: 195,
      lengthM: 9, heightM: 3, weightKg: 12000, speedKmh: 10,
      region: 'Africa (South Africa)', formation: 'Upper Elliot',
      named: 2018, namedBy: 'McPhee and colleagues',
      blurb: 'An early giant plant-eater that reached huge size before true sauropods, walking on crouched legs.',
      traits: ['Very heavy for its time', 'Crouched, column-like limbs', 'Long neck'],
      facts: ['It was one of the largest land animals of its day.', 'It got big before sauropods perfected pillar-like legs.'],
      uncertain: 'Exactly how it carried its weight is inferred from limb shape.',
      howKnow: 'A partial skeleton from South Africa.'
    },
    {
      id: 'vulcanodon', name: 'Vulcanodon karibaensis', common: 'Vulcanodon',
      say: 'vul-KAN-uh-don', meaning: 'volcano tooth',
      group: 'sauropod', clade: 'early Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 200, myaLo: 195,
      lengthM: 6.5, heightM: 2.5, weightKg: 3500, speedKmh: 12,
      region: 'Africa (Zimbabwe)', formation: 'Vulcanodon Beds',
      named: 1972, namedBy: 'Michael Raath',
      blurb: 'An early sauropod found between lava flows, near the start of the long-necked giants’ story.',
      traits: ['Early four-legged sauropod', 'Pillar-like limbs', 'Long neck'],
      facts: ['It was found sandwiched between ancient lava flows.', 'It is one of the earliest true sauropods.'],
      uncertain: 'Its skull is unknown, so its head is reconstructed.',
      howKnow: 'A partial skeleton from Zimbabwe.'
    },
    {
      id: 'barapasaurus', name: 'Barapasaurus tagorei', common: 'Barapasaurus',
      say: 'buh-RAP-uh-SOR-us', meaning: 'big-legged lizard',
      group: 'sauropod', clade: 'early Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 196, myaLo: 183,
      lengthM: 14, heightM: 5, weightKg: 7000, speedKmh: 12,
      region: 'Asia (India)', formation: 'Kota',
      named: 1975, namedBy: 'Jain and colleagues',
      blurb: 'One of the earliest large sauropods, known from a bonebed of around 300 bones in India.',
      traits: ['Early large sauropod', 'Long neck', 'Spoon-shaped teeth'],
      facts: ['Its name means "big-legged lizard".', 'Hundreds of its bones were found together.'],
      uncertain: 'Its skull is poorly known.',
      howKnow: 'A rich bonebed from central India.'
    },
    {
      id: 'spinophorosaurus', name: 'Spinophorosaurus nigerensis', common: 'Spinophorosaurus',
      say: 'SPY-noh-FOR-uh-SOR-us', meaning: 'spine-bearing lizard',
      group: 'sauropod', clade: 'early Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 170, myaLo: 165,
      lengthM: 13, heightM: 4, weightKg: 7000, speedKmh: 12,
      region: 'Africa (Niger)', formation: 'Irhazer',
      named: 2009, namedBy: 'Remes and colleagues',
      blurb: 'An early African sauropod that may have had bony spikes on its tail, an unusual sauropod weapon.',
      traits: ['Possible tail spikes', 'Early sauropod', 'Long neck'],
      facts: ['It may have had a small spiked tail "club".', 'It is a well-preserved early sauropod from the Sahara.'],
      uncertain: 'Whether the tail spikes truly belong to it is debated.',
      howKnow: 'A fairly complete skeleton from Niger.'
    },
    {
      id: 'dysalotosaurus', name: 'Dysalotosaurus lettowvorbecki', common: 'Dysalotosaurus',
      say: 'dis-uh-LOT-uh-SOR-us', meaning: 'uncatchable lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 152, myaLo: 150,
      lengthM: 2.5, heightM: 0.9, weightKg: 50, speedKmh: 35,
      region: 'Africa (Tanzania)', formation: 'Tendaguru',
      named: 1919, namedBy: 'Virchow',
      blurb: 'A small, fast African plant-eater known from thousands of bones of every growth stage.',
      traits: ['Light, speedy build', 'Beak and cheek teeth', 'Known from all ages'],
      facts: ['Thousands of its bones reveal how it grew up.', 'Its name means "uncatchable" for its speed.'],
      uncertain: 'Herd behavior is inferred from the mass of bones.',
      howKnow: 'A huge bone assemblage from Tanzania.'
    },
    {
      id: 'gasparinisaura', name: 'Gasparinisaura cincosaltensis', common: 'Gasparinisaura',
      say: 'gas-puh-REE-nih-SOR-uh', meaning: 'Gasparini’s lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 86, myaLo: 83,
      lengthM: 1.7, heightM: 0.5, weightKg: 13, speedKmh: 35,
      region: 'South America (Argentina)', formation: 'Anacleto',
      named: 1996, namedBy: 'Coria & Salgado',
      blurb: 'A small, fast South American plant-eater, one of the first small ornithopods named from the continent.',
      traits: ['Small and speedy', 'Gastroliths in the gut', 'Beak and cheek teeth'],
      facts: ['Stomach stones helped it grind plants.', 'It is known from several individuals of different ages.'],
      uncertain: 'Whether it lived in groups is inferred from clustered finds.',
      howKnow: 'Several skeletons from Patagonia.'
    },
    {
      id: 'fruitadens', name: 'Fruitadens haagarorum', common: 'Fruitadens',
      say: 'FROO-tuh-denz', meaning: 'Fruita tooth',
      group: 'ornithischian', clade: 'Heterodontosauridae', diet: 'omnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 152, myaLo: 150,
      lengthM: 0.7, heightM: 0.2, weightKg: 1, speedKmh: 30,
      region: 'North America', formation: 'Morrison',
      named: 2010, namedBy: 'Butler and colleagues',
      blurb: 'One of the smallest known ornithischians, a chicken-sized plant-eater darting among Jurassic giants.',
      traits: ['Tiny body', 'Mixed teeth', 'Fast runner'],
      facts: ['It is among the smallest bird-hipped dinosaurs.', 'It shared the Morrison with giant sauropods.'],
      uncertain: 'Its exact diet is inferred from its varied teeth.',
      howKnow: 'Small skeletal pieces from Colorado.'
    },
    {
      id: 'pegomastax', name: 'Pegomastax africana', common: 'Pegomastax',
      say: 'PEG-uh-MASS-taks', meaning: 'strong jaw',
      group: 'ornithischian', clade: 'Heterodontosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 200, myaLo: 190,
      lengthM: 0.6, heightM: 0.2, weightKg: 1, speedKmh: 30,
      region: 'Africa (South Africa)', formation: 'Upper Elliot',
      named: 2012, namedBy: 'Paul Sereno',
      blurb: 'A tiny, parrot-beaked plant-eater with fangs and porcupine-like bristles, like a "dinosaur cat".',
      traits: ['Parrot-like beak with fangs', 'Possible bristly quills', 'Very small'],
      facts: ['It mixed a sharp beak with little tusks.', 'It may have had a coat of bristles.'],
      uncertain: 'Whether it had quills is inferred from relatives.',
      howKnow: 'A small skull from southern Africa.'
    },
    {
      id: 'eocursor', name: 'Eocursor parvus', common: 'Eocursor',
      say: 'EE-oh-KUR-sor', meaning: 'dawn runner',
      group: 'ornithischian', clade: 'early Ornithischia', diet: 'herbivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 215, myaLo: 208,
      lengthM: 1, heightM: 0.3, weightKg: 3, speedKmh: 35,
      region: 'Africa (South Africa)', formation: 'Lower Elliot',
      named: 2007, namedBy: 'Butler and colleagues',
      blurb: 'One of the earliest and most complete early bird-hipped dinosaurs, small and built for running.',
      traits: ['Small and fast', 'Grasping hands', 'Leaf-shaped teeth'],
      facts: ['It is among the oldest well-known ornithischians.', 'Its hands could still grasp, unlike later plant-eaters.'],
      uncertain: 'Its exact place at the base of the tree is studied.',
      howKnow: 'A partial skeleton from South Africa.'
    },
    {
      id: 'nipponosaurus', name: 'Nipponosaurus sachalinensis', common: 'Nipponosaurus',
      say: 'nih-PON-uh-SOR-us', meaning: 'Japanese lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 80, myaLo: 75,
      lengthM: 8, heightM: 2.8, weightKg: 2000, speedKmh: 24,
      region: 'Asia (Sakhalin)', formation: 'Yezo',
      named: 1936, namedBy: 'Takumi Nagao',
      blurb: 'A crested duck-bill named when its island was part of Japan, one of the first dinosaurs studied there.',
      traits: ['Hollow head crest', 'Grinding tooth batteries', 'Coastal dweller'],
      facts: ['It was named in 1936 from Sakhalin Island.', 'It is a relative of the trumpet-crested duck-bills.'],
      uncertain: 'The single skeleton is a young animal, so adult features are estimated.',
      howKnow: 'A partial juvenile skeleton from Sakhalin.'
    },
    {
      id: 'secernosaurus', name: 'Secernosaurus koerneri', common: 'Secernosaurus',
      say: 'seh-SUR-nuh-SOR-us', meaning: 'severed lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 70,
      lengthM: 4.5, heightM: 1.6, weightKg: 1000, speedKmh: 24,
      region: 'South America (Argentina)', formation: 'Lago Colhué Huapi',
      named: 1979, namedBy: 'Brett-Surman',
      blurb: 'One of the few duck-bills from South America, showing the group reached the far south.',
      traits: ['Small duck-bill', 'No hollow crest', 'Grinding teeth'],
      facts: ['Duck-bills were rare in South America.', 'It shows the group spread across the continents.'],
      uncertain: 'It is known from limited material, so much is reconstructed.',
      howKnow: 'Partial remains from Patagonia.'
    },
    {
      id: 'tuojiangosaurus2', name: 'Gigantspinosaurus sichuanensis', common: 'Gigantspinosaurus',
      say: 'jy-GANT-spy-nuh-SOR-us', meaning: 'giant-spined lizard',
      group: 'ornithischian', clade: 'Stegosauria', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 160, myaLo: 157,
      lengthM: 4.2, heightM: 1.4, weightKg: 700, speedKmh: 8,
      region: 'Asia (China)', formation: 'Upper Shaximiao',
      named: 1992, namedBy: 'Ouyang',
      blurb: 'A stegosaur famous for enormous shoulder spikes, larger than its small back plates.',
      traits: ['Huge shoulder spikes', 'Small back plates', 'Preserved skin'],
      facts: ['Its shoulder spikes dwarf its plates.', 'A rare skin impression is preserved.'],
      uncertain: 'Its exact place among stegosaurs is studied.',
      howKnow: 'A good skeleton with skin from China.'
    },
    {
      id: 'aucasaurus', name: 'Aucasaurus garridoi', common: 'Aucasaurus',
      say: 'OW-kuh-SOR-us', meaning: 'Auca lizard',
      group: 'theropod', clade: 'Abelisauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 83, myaLo: 80,
      lengthM: 6, heightM: 2, weightKg: 700, speedKmh: 35,
      region: 'South America (Argentina)', formation: 'Anacleto',
      named: 2002, namedBy: 'Coria and colleagues',
      blurb: 'A short-faced abelisaur found near titanosaur nesting grounds, with even tinier arms than Carnotaurus.',
      traits: ['Very short arms', 'Deep, short skull', 'Slender for an abelisaur'],
      facts: ['It was found near vast titanosaur egg sites.', 'Its arms were even more reduced than Carnotaurus.'],
      uncertain: 'Whether it preyed on the nearby titanosaur eggs is speculation.',
      howKnow: 'A largely complete skeleton from Patagonia.'
    },
    {
      id: 'eoabelisaurus', name: 'Eoabelisaurus mefi', common: 'Eoabelisaurus',
      say: 'EE-oh-uh-BEL-ih-SOR-us', meaning: 'dawn Abelisaurus',
      group: 'theropod', clade: 'Abelisauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 170, myaLo: 165,
      lengthM: 6.5, heightM: 2, weightKg: 900, speedKmh: 32,
      region: 'South America (Argentina)', formation: 'Cañadón Asfalto',
      named: 2012, namedBy: 'Pol & Rauhut',
      blurb: 'The earliest known abelisaur, showing the short arms of the group evolved before the short face.',
      traits: ['Reduced arms', 'Longer face than later kin', 'Early abelisaur'],
      facts: ['It pushes the abelisaur record back to the Jurassic.', 'Its arms shrank before its face shortened.'],
      uncertain: 'Its exact position at the base of the group is studied.',
      howKnow: 'A well-preserved skeleton from Patagonia.'
    },
    {
      id: 'deltadromeus', name: 'Deltadromeus agilis', common: 'Deltadromeus',
      say: 'DEL-tuh-DROM-ee-us', meaning: 'delta runner',
      group: 'theropod', clade: 'Ceratosauria', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 99, myaLo: 95,
      lengthM: 8, heightM: 2.5, weightKg: 1000, speedKmh: 40,
      region: 'Africa (North Africa)', formation: 'Kem Kem',
      named: 1996, namedBy: 'Sereno and colleagues',
      blurb: 'A long-legged, lightly built African predator built for speed, sharing its rivers with Spinosaurus.',
      traits: ['Long, slender legs', 'Lightweight build', 'Fast runner'],
      facts: ['Its long legs suggest it was a sprinter.', 'It lived in the predator-packed Kem Kem rivers.'],
      uncertain: 'Its exact relationships among theropods are debated.',
      howKnow: 'A partial skeleton from North Africa.'
    },
    {
      id: 'australovenator', name: 'Australovenator wintonensis', common: 'Australovenator',
      say: 'oss-TRAL-oh-VEN-uh-tor', meaning: 'southern hunter',
      group: 'theropod', clade: 'Megaraptora', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 95, myaLo: 93,
      lengthM: 6, heightM: 2, weightKg: 500, speedKmh: 38,
      region: 'Australia', formation: 'Winton',
      named: 2009, namedBy: 'Hocknull and colleagues',
      blurb: 'Australia’s best-known large predator, nicknamed "Banjo", with big sickle-shaped hand claws.',
      traits: ['Large hand claws', 'Light, fast build', 'Slender skull'],
      facts: ['Its nickname is Banjo.', 'It is the most complete predatory dinosaur from Australia.'],
      uncertain: 'Where megaraptorans fit among theropods is debated.',
      howKnow: 'A partial skeleton from Queensland.'
    },
    {
      id: 'gualicho', name: 'Gualicho shinyae', common: 'Gualicho',
      say: 'GWAL-ih-cho', meaning: 'for a folklore spirit',
      group: 'theropod', clade: 'Theropoda', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 93, myaLo: 90,
      lengthM: 6, heightM: 2, weightKg: 450, speedKmh: 35,
      region: 'South America (Argentina)', formation: 'Huincul',
      named: 2016, namedBy: 'Apesteguía and colleagues',
      blurb: 'A medium predator that, like T. rex, independently evolved tiny two-fingered arms.',
      traits: ['Tiny two-fingered arms', 'Slender build', 'Bladed teeth'],
      facts: ['It shrank its arms separately from tyrannosaurs.', 'It shows reduced arms evolved more than once.'],
      uncertain: 'Its exact family placement is debated.',
      howKnow: 'A partial skeleton from Patagonia.'
    },
    {
      id: 'shaochilong', name: 'Shaochilong maortuensis', common: 'Shaochilong',
      say: 'SHOW-chee-long', meaning: 'shark-toothed dragon',
      group: 'theropod', clade: 'Carcharodontosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 92, myaLo: 90,
      lengthM: 6, heightM: 2, weightKg: 500, speedKmh: 32,
      region: 'Asia (China)', formation: 'Ulansuhai',
      named: 2009, namedBy: 'Brusatte and colleagues',
      blurb: 'A modest-sized Asian member of the shark-toothed predator group, showing they reached Asia too.',
      traits: ['Blade-like teeth', 'Lightweight skull', 'Medium build'],
      facts: ['It shows carcharodontosaurs lived in Asia.', 'It is smaller than its giant African and South American kin.'],
      uncertain: 'Known from limited material, so much is reconstructed.',
      howKnow: 'Skull material from Inner Mongolia, China.'
    },
    {
      id: 'sigilmassasaurus', name: 'Sigilmassasaurus brevicollis', common: 'Sigilmassasaurus',
      say: 'sih-jil-MASS-uh-SOR-us', meaning: 'Sijilmassa lizard',
      group: 'theropod', clade: 'Spinosauridae', diet: 'piscivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 99, myaLo: 95,
      lengthM: 12, heightM: 3.5, weightKg: 4000, speedKmh: 18,
      region: 'Africa (Morocco)', formation: 'Kem Kem',
      named: 1996, namedBy: 'Russell',
      blurb: 'A large spinosaur known from neck bones, long argued to be the same as Spinosaurus.',
      traits: ['Short, strong neck bones', 'Fish-eating spinosaur', 'Large size'],
      facts: ['It may be the same animal as Spinosaurus.', 'It is mostly known from distinctive neck vertebrae.'],
      uncertain: 'Whether it is its own genus or part of Spinosaurus is debated.',
      howKnow: 'Neck and back bones from North Africa.'
    },
    {
      id: 'conchoraptor', name: 'Conchoraptor gracilis', common: 'Conchoraptor',
      say: 'KON-koh-RAP-tor', meaning: 'conch thief',
      group: 'theropod', clade: 'Oviraptoridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 1.5, heightM: 0.6, weightKg: 15, speedKmh: 35,
      region: 'Asia (Mongolia)', formation: 'Barun Goyot',
      named: 1986, namedBy: 'Rinchen Barsbold',
      blurb: 'A small crestless oviraptorid once thought to crush shellfish with its strong beak.',
      traits: ['Crestless head', 'Strong toothless beak', 'Feathered'],
      facts: ['Its name reflects an old idea that it ate shellfish.', 'It is one of the best-known small oviraptorids.'],
      uncertain: 'Its exact diet is inferred from its beak.',
      howKnow: 'Many skulls and skeletons from Mongolia.'
    },
    {
      id: 'khaan', name: 'Khaan mckennai', common: 'Khaan',
      say: 'KAHN', meaning: 'lord',
      group: 'theropod', clade: 'Oviraptoridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 71,
      lengthM: 1.5, heightM: 0.6, weightKg: 15, speedKmh: 35,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 2001, namedBy: 'Clark, Norell & Barsbold',
      blurb: 'A small oviraptorid known from a beautifully preserved pair nicknamed "Romeo and Juliet".',
      traits: ['Toothless beak', 'Slender build', 'Possible display tail'],
      facts: ['Two individuals were found together, dubbed Romeo and Juliet.', 'Tail differences may mark males and females.'],
      uncertain: 'Whether the pair shows courtship or just chance burial is inferred.',
      howKnow: 'Excellent paired skeletons from Mongolia.'
    },
    {
      id: 'nemegtomaia', name: 'Nemegtomaia barsboldi', common: 'Nemegtomaia',
      say: 'neh-MEG-toh-MY-uh', meaning: 'good mother from Nemegt',
      group: 'theropod', clade: 'Oviraptoridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 68,
      lengthM: 2, heightM: 0.8, weightKg: 40, speedKmh: 35,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 2004, namedBy: 'Lü and colleagues',
      blurb: 'A crested oviraptorid found brooding its nest, more evidence of bird-like parental care.',
      traits: ['Tall head crest', 'Toothless beak', 'Brooded its nest'],
      facts: ['It was preserved sitting on a clutch of eggs.', 'Its name means "good mother", like Maiasaura.'],
      uncertain: 'How long it brooded is inferred from the pose.',
      howKnow: 'A nesting skeleton from Mongolia.'
    },
    {
      id: 'epidexipteryx', name: 'Epidexipteryx hui', common: 'Epidexipteryx',
      say: 'EP-ih-DEX-ip-ter-iks', meaning: 'display feather',
      group: 'theropod', clade: 'Scansoriopterygidae', diet: 'insectivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 165, myaLo: 160,
      lengthM: 0.3, heightM: 0.1, weightKg: 0.2, speedKmh: 0,
      region: 'Asia (China)', formation: 'Daohugou',
      named: 2008, namedBy: 'Zhang and colleagues',
      blurb: 'A sparrow-sized dinosaur with four long ribbon-like tail feathers, among the earliest known for show.',
      traits: ['Four ribbon-like tail feathers', 'Tiny body', 'Long fingers'],
      facts: ['Its tail feathers were for display, not flight.', 'It is some of the earliest evidence of show-off feathers.'],
      uncertain: 'How it lived and moved is inferred from its tiny skeleton.',
      howKnow: 'A single small skeleton with feathers from China.'
    },
    {
      id: 'scansoriopteryx', name: 'Scansoriopteryx heilmanni', common: 'Scansoriopteryx',
      say: 'skan-SOR-ee-OP-ter-iks', meaning: 'climbing wing',
      group: 'theropod', clade: 'Scansoriopterygidae', diet: 'insectivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 165, myaLo: 160,
      lengthM: 0.3, heightM: 0.1, weightKg: 0.2, speedKmh: 0,
      region: 'Asia (China)', formation: 'Daohugou',
      named: 2002, namedBy: 'Czerkas & Yuan',
      blurb: 'A tiny tree-climbing dinosaur with a very long third finger, a cousin of the membrane-winged Yi.',
      traits: ['Very long third finger', 'Tree-climbing build', 'Small and light'],
      facts: ['Its long finger may have supported a skin wing, like Yi.', 'It seems built for climbing and clinging.'],
      uncertain: 'Whether it had membrane wings like Yi is inferred.',
      howKnow: 'A tiny juvenile skeleton from China.'
    },
    {
      id: 'tianyuraptor', name: 'Tianyuraptor ostromi', common: 'Tianyuraptor',
      say: 'tee-AN-yoo-RAP-tor', meaning: 'Tianyu thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 1.6, heightM: 0.5, weightKg: 5, speedKmh: 45,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2010, namedBy: 'Zheng and colleagues',
      blurb: 'A long-legged raptor with short arms, blending features of northern and southern dromaeosaurs.',
      traits: ['Long legs', 'Short arms', 'Slender build'],
      facts: ['It mixes features of two raptor groups.', 'Its short arms suit a more ground-bound life.'],
      uncertain: 'Its exact place among raptors is studied.',
      howKnow: 'A good skeleton from China.'
    },
    {
      id: 'zanabazar', name: 'Zanabazar junior', common: 'Zanabazar',
      say: 'ZAN-uh-buh-ZAR', meaning: 'for a Mongolian spiritual leader',
      group: 'theropod', clade: 'Troodontidae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 68,
      lengthM: 2.3, heightM: 0.8, weightKg: 25, speedKmh: 40,
      region: 'Asia (Mongolia)', formation: 'Nemegt',
      named: 2009, namedBy: 'Norell and colleagues',
      blurb: 'A large troodontid with a big brain and keen senses, one of the brainiest dinosaurs known.',
      traits: ['Large brain', 'Keen senses', 'Sickle claw'],
      facts: ['Its braincase suggests sharp hearing and vision.', 'It is one of the larger troodontids.'],
      uncertain: 'Its diet is inferred from teeth and brain shape.',
      howKnow: 'A good skull and braincase from Mongolia.'
    },
    {
      id: 'patagonykus', name: 'Patagonykus puertai', common: 'Patagonykus',
      say: 'PAT-uh-GON-ih-kus', meaning: 'Patagonia claw',
      group: 'theropod', clade: 'Alvarezsauridae', diet: 'insectivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 86,
      lengthM: 2, heightM: 0.6, weightKg: 25, speedKmh: 45,
      region: 'South America (Argentina)', formation: 'Portezuelo',
      named: 1996, namedBy: 'Novas',
      blurb: 'A southern alvarezsaur with strong, stubby single-clawed arms, perhaps for tearing into insect nests.',
      traits: ['Strong single-clawed arms', 'Long running legs', 'Slender build'],
      facts: ['It shows the one-clawed dinosaurs lived in the south too.', 'Its powerful arms suit digging.'],
      uncertain: 'Its exact diet is inferred from its digging arms.',
      howKnow: 'A partial skeleton from Patagonia.'
    },
    {
      id: 'patagosaurus', name: 'Patagosaurus fariasi', common: 'Patagosaurus',
      say: 'PAT-uh-goh-SOR-us', meaning: 'Patagonia lizard',
      group: 'sauropod', clade: 'early Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 165, myaLo: 161,
      lengthM: 16, heightM: 5, weightKg: 9000, speedKmh: 12,
      region: 'South America (Argentina)', formation: 'Cañadón Asfalto',
      named: 1979, namedBy: 'José Bonaparte',
      blurb: 'An early South American sauropod, known from several individuals, helping fill the Jurassic record.',
      traits: ['Early sauropod', 'Long neck', 'Sturdy build'],
      facts: ['Several individuals were found together.', 'It helps fill the gap in Jurassic sauropod evolution.'],
      uncertain: 'Its exact relationships are studied.',
      howKnow: 'Several skeletons from Patagonia.'
    },
    {
      id: 'atlasaurus', name: 'Atlasaurus imelakei', common: 'Atlasaurus',
      say: 'AT-luh-SOR-us', meaning: 'Atlas lizard',
      group: 'sauropod', clade: 'Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 168, myaLo: 164,
      lengthM: 15, heightM: 8, weightKg: 22000, speedKmh: 12,
      region: 'Africa (Morocco)', formation: 'Tiouguit',
      named: 1999, namedBy: 'Monbaron and colleagues',
      blurb: 'A long-legged Moroccan sauropod with a relatively short neck, an unusual body plan.',
      traits: ['Very long legs', 'Short neck for a sauropod', 'Brachiosaur-like build'],
      facts: ['Its proportions are unlike most sauropods.', 'It is one of the best Middle Jurassic sauropods from Africa.'],
      uncertain: 'Why it had such long legs and a short neck is debated.',
      howKnow: 'A good skeleton from the Atlas Mountains of Morocco.'
    },
    {
      id: 'tornieria', name: 'Tornieria africana', common: 'Tornieria',
      say: 'tor-nee-AIR-ee-uh', meaning: 'for Gustav Tornier',
      group: 'sauropod', clade: 'Diplodocidae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 152, myaLo: 145,
      lengthM: 22, heightM: 5, weightKg: 12000, speedKmh: 14,
      region: 'Africa (Tanzania)', formation: 'Tendaguru',
      named: 1911, namedBy: 'Sternfeld',
      blurb: 'An African cousin of Diplodocus, showing the whip-tailed long-necks reached the southern continents.',
      traits: ['Very long neck and tail', 'Light build', 'Diplodocid'],
      facts: ['It is the African relative of Diplodocus.', 'It came from the rich Tendaguru beds.'],
      uncertain: 'Its history of naming was tangled with other sauropods.',
      howKnow: 'Bones from the German Tendaguru expeditions.'
    },
    {
      id: 'andesaurus', name: 'Andesaurus delgadoi', common: 'Andesaurus',
      say: 'AN-dee-SOR-us', meaning: 'Andes lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 100, myaLo: 95,
      lengthM: 18, heightM: 6, weightKg: 18000, speedKmh: 10,
      region: 'South America (Argentina)', formation: 'Candeleros',
      named: 1991, namedBy: 'Calvo & Bonaparte',
      blurb: 'A large early titanosaur that helps anchor the family tree of the giant long-necks.',
      traits: ['Large titanosaur', 'Long neck and tail', 'Wide hips'],
      facts: ['It is an important early member of the titanosaur group.', 'It lived alongside Giganotosaurus.'],
      uncertain: 'Its full size is estimated from partial remains.',
      howKnow: 'Partial skeletons from Patagonia.'
    },
    {
      id: 'aeolosaurus', name: 'Aeolosaurus rionegrinus', common: 'Aeolosaurus',
      say: 'EE-oh-luh-SOR-us', meaning: 'Aeolus lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 70,
      lengthM: 15, heightM: 4, weightKg: 8000, speedKmh: 12,
      region: 'South America (Argentina)', formation: 'Angostura Colorada',
      named: 1987, namedBy: 'Powell',
      blurb: 'A South American titanosaur known from several individuals, with bony armor in its skin.',
      traits: ['Bony skin armor', 'Forward-tilted tail bones', 'Long neck'],
      facts: ['Its tail bones angle forward, a useful identifying feature.', 'It had small armor plates like other titanosaurs.'],
      uncertain: 'Several species are grouped under it, pending review.',
      howKnow: 'Several partial skeletons from Patagonia.'
    },
    {
      id: 'notocolossus', name: 'Notocolossus gonzalezparejasi', common: 'Notocolossus',
      say: 'NO-toh-kuh-LOSS-us', meaning: 'southern colossus',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 86,
      lengthM: 28, heightM: 10, weightKg: 45000, speedKmh: 8,
      region: 'South America (Argentina)', formation: 'Plottier',
      named: 2016, namedBy: 'González Riga and colleagues',
      blurb: 'A giant titanosaur known from a rare complete foot, which revealed an unusual compact toe structure.',
      traits: ['Giant titanosaur', 'Unusual compact foot', 'Massive limbs'],
      facts: ['Its complete foot is a rare and valuable find.', 'Its foot bones are oddly short and stubby.'],
      uncertain: 'Its full size is scaled from giant limb bones.',
      howKnow: 'Limb bones and a rare complete foot from Patagonia.'
    },
    {
      id: 'bonitasaura', name: 'Bonitasaura salgadoi', common: 'Bonitasaura',
      say: 'boh-NEE-tuh-SOR-uh', meaning: 'La Bonita lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 86, myaLo: 83,
      lengthM: 9, heightM: 3, weightKg: 5000, speedKmh: 12,
      region: 'South America (Argentina)', formation: 'Bajo de la Carpa',
      named: 2004, namedBy: 'Apesteguía',
      blurb: 'A medium titanosaur with a squared-off lower jaw and a cropping beak, like the diplodocids.',
      traits: ['Squared-off jaw', 'Cropping beak edge', 'Peg-like teeth'],
      facts: ['Its jaw shape echoes the distant diplodocids.', 'It shows titanosaurs evolved varied feeding styles.'],
      uncertain: 'Whether the jaw shape means a special diet is inferred.',
      howKnow: 'A partial skeleton with jaw material from Patagonia.'
    },
    {
      id: 'gobisaurus', name: 'Gobisaurus domoculus', common: 'Gobisaurus',
      say: 'GOH-bee-SOR-us', meaning: 'Gobi lizard',
      group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 100, myaLo: 92,
      lengthM: 6, heightM: 1.6, weightKg: 2500, speedKmh: 10,
      region: 'Asia (China)', formation: 'Ulansuhai',
      named: 2001, namedBy: 'Vickaryous and colleagues',
      blurb: 'A large early armored dinosaur with a broad skull but, unusually, no tail club yet.',
      traits: ['Broad armored skull', 'No tail club', 'Heavy body'],
      facts: ['It is an early ankylosaur without the famous tail club.', 'Its broad skull is distinctive.'],
      uncertain: 'How its armor was arranged is reconstructed.',
      howKnow: 'A good skull from Inner Mongolia.'
    },
    {
      id: 'struthiosaurus', name: 'Struthiosaurus austriacus', common: 'Struthiosaurus',
      say: 'STROOTH-ee-uh-SOR-us', meaning: 'ostrich lizard',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 83, myaLo: 80,
      lengthM: 2.5, heightM: 0.8, weightKg: 300, speedKmh: 10,
      region: 'Europe (Austria)', formation: 'Grünbach',
      named: 1871, namedBy: 'Emanuel Bunzel',
      blurb: 'A dwarf armored dinosaur from the islands of Cretaceous Europe, among the smallest ankylosaurs.',
      traits: ['Small island armor', 'Body spikes', 'Dwarfed size'],
      facts: ['It is one of the smallest known armored dinosaurs.', 'It shrank on the islands of ancient Europe.'],
      uncertain: 'Its small size reflects island dwarfism.',
      howKnow: 'Bones from central Europe.'
    },
    {
      id: 'mymoorapelta', name: 'Mymoorapelta maysi', common: 'Mymoorapelta',
      say: 'MY-mor-uh-PEL-tuh', meaning: 'Mygatt-Moore shield',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 150,
      lengthM: 3, heightM: 1, weightKg: 500, speedKmh: 10,
      region: 'North America', formation: 'Morrison',
      named: 1994, namedBy: 'Kirkland & Carpenter',
      blurb: 'One of the oldest North American armored dinosaurs, small and spiky among the Jurassic giants.',
      traits: ['Body armor and spikes', 'Small size', 'Hip shield'],
      facts: ['It is among the earliest North American ankylosaurs.', 'It shared the Morrison with giant sauropods.'],
      uncertain: 'Its exact armor layout is reconstructed.',
      howKnow: 'Armor and bones from a Colorado quarry.'
    },
    {
      id: 'sphaerotholus', name: 'Sphaerotholus goodwini', common: 'Sphaerotholus',
      say: 'sfeer-uh-THOH-lus', meaning: 'ball dome',
      group: 'ornithischian', clade: 'Pachycephalosauridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 70,
      lengthM: 2.5, heightM: 0.9, weightKg: 50, speedKmh: 30,
      region: 'North America', formation: 'Kirtland',
      named: 2002, namedBy: 'Williamson & Carr',
      blurb: 'A dome-headed dinosaur with a high, rounded skull cap ringed by bony nodes.',
      traits: ['High rounded dome', 'Ring of skull nodes', 'Two-legged build'],
      facts: ['Its dome is tall and ball-like.', 'Several species are known across North America.'],
      uncertain: 'Head-butting versus display is debated for all dome-heads.',
      howKnow: 'Skull domes from the American West.'
    },
    {
      id: 'kelmayisaurus', name: 'Kelmayisaurus petrolicus', common: 'Kelmayisaurus',
      say: 'kel-MY-ih-SOR-us', meaning: 'Karamay lizard',
      group: 'theropod', clade: 'Carcharodontosauria', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 120, myaLo: 110,
      lengthM: 9, heightM: 2.8, weightKg: 2000, speedKmh: 30,
      region: 'Asia (China)', formation: 'Lianmuqin',
      named: 1973, namedBy: 'Dong Zhiming',
      blurb: 'A large Chinese predator named after an oil town, known from jaw material.',
      traits: ['Deep lower jaw', 'Large predatory build', 'Bladed teeth'],
      facts: ['It is named for the oil city of Karamay.', 'It was a top predator of its time and place.'],
      uncertain: 'Known from jaws, so much is reconstructed.',
      howKnow: 'Jaw material from northwestern China.'
    },
    {
      id: 'meraxes', name: 'Meraxes gigas', common: 'Meraxes',
      say: 'meh-RAK-seez', meaning: 'for a dragon in fiction',
      group: 'theropod', clade: 'Carcharodontosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 95, myaLo: 90,
      lengthM: 11, heightM: 3.4, weightKg: 4200, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Huincul',
      named: 2022, namedBy: 'Canale and colleagues',
      blurb: 'A giant shark-toothed predator with a remarkably complete skeleton, revealing tiny T. rex-like arms.',
      traits: ['Tiny arms (independently evolved)', 'Huge head', 'Shark-like teeth'],
      facts: ['It evolved short arms separately from T. rex.', 'Its skeleton is unusually complete for a giant predator.'],
      uncertain: 'Why so many giant predators shrank their arms is debated.',
      howKnow: 'A largely complete skeleton from Patagonia.'
    },
    {
      id: 'archaeoceratops', name: 'Archaeoceratops oshimai', common: 'Archaeoceratops',
      say: 'AR-kee-oh-SERR-uh-tops', meaning: 'ancient horned face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 113,
      lengthM: 1, heightM: 0.4, weightKg: 9, speedKmh: 25,
      region: 'Asia (China)', formation: 'Xinminbao',
      named: 1997, namedBy: 'Dong & Azuma',
      blurb: 'A small, early two-legged horned dinosaur, more advanced than Psittacosaurus but still tiny.',
      traits: ['Small frill', 'Parrot beak', 'Two-legged runner'],
      facts: ['It bridges the parrot-beaked and frilled ceratopsians.', 'It is one of the earliest frilled forms.'],
      uncertain: 'Its exact place in the family tree is studied.',
      howKnow: 'Good skeletons from China.'
    },
    {
      id: 'auroraceratops', name: 'Auroraceratops rugosus', common: 'Auroraceratops',
      say: 'aw-ROR-uh-SERR-uh-tops', meaning: 'dawn horned face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 113,
      lengthM: 1.3, heightM: 0.4, weightKg: 15, speedKmh: 25,
      region: 'Asia (China)', formation: 'Xinminbao',
      named: 2005, namedBy: 'You and colleagues',
      blurb: 'A small early horned dinosaur with a broad, bumpy face, known from many individuals.',
      traits: ['Broad, bumpy face', 'Small frill', 'Parrot beak'],
      facts: ['Many specimens reveal its growth.', 'Its name means "dawn horned face".'],
      uncertain: 'Its exact diet and habits are inferred.',
      howKnow: 'Dozens of specimens from China.'
    },
    {
      id: 'liaoceratops', name: 'Liaoceratops yanzigouensis', common: 'Liaoceratops',
      say: 'lee-OW-SERR-uh-tops', meaning: 'Liaoning horned face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 122,
      lengthM: 0.6, heightM: 0.2, weightKg: 4, speedKmh: 25,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2002, namedBy: 'Xu and colleagues',
      blurb: 'A very early horned dinosaur the size of a cat, from the famous feathered-dinosaur beds.',
      traits: ['Tiny body', 'Small frill', 'Cheek horn'],
      facts: ['It is one of the most primitive horned dinosaurs.', 'It lived among feathered dinosaurs in the Jehol beds.'],
      uncertain: 'Its place at the base of the horned tree is studied.',
      howKnow: 'Good skulls from China.'
    },
    {
      id: 'titanoceratops', name: 'Titanoceratops ouranos', common: 'Titanoceratops',
      say: 'tie-TAN-uh-SERR-uh-tops', meaning: 'titanic horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 74,
      lengthM: 6.5, heightM: 2.5, weightKg: 6500, speedKmh: 25,
      region: 'North America', formation: 'Fruitland',
      named: 2011, namedBy: 'Nicholas Longrich',
      blurb: 'A giant horned dinosaur that may be the oldest known close relative of Triceratops.',
      traits: ['Very large horned dinosaur', 'Long brow horns', 'Big frill'],
      facts: ['It may push the Triceratops line back in time.', 'Its identity as a separate genus is debated.'],
      uncertain: 'Whether it is distinct from Pentaceratops is argued.',
      howKnow: 'A reanalyzed large skeleton from New Mexico.'
    },
    {
      id: 'montanoceratops', name: 'Montanoceratops cerorhynchus', common: 'Montanoceratops',
      say: 'mon-TAN-uh-SERR-uh-tops', meaning: 'Montana horned face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 70,
      lengthM: 3, heightM: 1, weightKg: 400, speedKmh: 25,
      region: 'North America', formation: 'St. Mary River',
      named: 1951, namedBy: 'Charles M. Sternberg',
      blurb: 'A small frilled horned dinosaur, larger than Protoceratops, with a small nose horn.',
      traits: ['Small nose horn', 'Bony frill', 'Walked on four legs'],
      facts: ['It is a North American relative of Protoceratops.', 'It bridges small and large horned dinosaurs.'],
      uncertain: 'Some early reconstructions were corrected by later finds.',
      howKnow: 'Partial skeletons from Montana and Alberta.'
    },
    {
      id: 'gilmoreosaurus', name: 'Gilmoreosaurus mongoliensis', common: 'Gilmoreosaurus',
      say: 'gil-MOR-ee-uh-SOR-us', meaning: 'Gilmore’s lizard',
      group: 'ornithischian', clade: 'Hadrosauroidea', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 95, myaLo: 90,
      lengthM: 6, heightM: 2, weightKg: 1000, speedKmh: 24,
      region: 'Asia (Mongolia)', formation: 'Iren Dabasu',
      named: 1979, namedBy: 'Brett-Surman',
      blurb: 'An early relative of the duck-bills from Mongolia, helping trace the group’s Asian origins.',
      traits: ['Early hadrosaur-like teeth', 'No hollow crest', 'Medium build'],
      facts: ['It captures the duck-bills near their Asian beginnings.', 'It is named for paleontologist Charles Gilmore.'],
      uncertain: 'Which fossils truly belong to it has been debated.',
      howKnow: 'Bones from Inner Mongolia.'
    },
    {
      id: 'bactrosaurus', name: 'Bactrosaurus johnsoni', common: 'Bactrosaurus',
      say: 'BAK-truh-SOR-us', meaning: 'club-spined lizard',
      group: 'ornithischian', clade: 'Hadrosauroidea', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 96, myaLo: 90,
      lengthM: 6, heightM: 2, weightKg: 1200, speedKmh: 24,
      region: 'Asia (China)', formation: 'Iren Dabasu',
      named: 1933, namedBy: 'Charles Gilmore',
      blurb: 'An early duck-bill relative, one of the oldest and best-known, bridging iguanodonts and hadrosaurs.',
      traits: ['Early duck-bill teeth', 'No hollow crest', 'Sturdy build'],
      facts: ['It is one of the earliest known hadrosauroids.', 'It is known from many individuals of all ages.'],
      uncertain: 'Its exact place near the hadrosaur origin is studied.',
      howKnow: 'Many bones from Inner Mongolia.'
    },
    {
      id: 'jaxartosaurus', name: 'Jaxartosaurus aralensis', common: 'Jaxartosaurus',
      say: 'jaks-AR-tuh-SOR-us', meaning: 'Jaxartes lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 85, myaLo: 80,
      lengthM: 8, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'Asia (Kazakhstan)', formation: 'Syuk-Syuk',
      named: 1937, namedBy: 'Anatoly Riabinin',
      blurb: 'A crested duck-bill from Central Asia, one of the few dinosaurs named from Kazakhstan.',
      traits: ['Hollow head crest', 'Grinding tooth batteries', 'Large duck-bill'],
      facts: ['It is among the few named dinosaurs from Kazakhstan.', 'Its crest links it to the trumpet-crested group.'],
      uncertain: 'It is known from limited material.',
      howKnow: 'Skull material from Central Asia.'
    },
    {
      id: 'datousaurus', name: 'Datousaurus bashanensis', common: 'Datousaurus',
      say: 'dah-TOO-SOR-us', meaning: 'chieftain lizard',
      group: 'sauropod', clade: 'early Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 170, myaLo: 160,
      lengthM: 14, heightM: 4, weightKg: 8000, speedKmh: 12,
      region: 'Asia (China)', formation: 'Lower Shaximiao',
      named: 1984, namedBy: 'Dong & Tang',
      blurb: 'A Chinese sauropod with a deep, boxy skull, one of many giants from the rich Sichuan beds.',
      traits: ['Deep, boxy skull', 'Long neck', 'Spoon-shaped teeth'],
      facts: ['It shared its world with the tail-clubbed Shunosaurus.', 'Its skull is unusually deep.'],
      uncertain: 'Its exact relationships are studied.',
      howKnow: 'Partial skeletons from Jurassic China.'
    },
    {
      id: 'aralosaurus', name: 'Aralosaurus tuberiferus', common: 'Aralosaurus',
      say: 'uh-RAL-uh-SOR-us', meaning: 'Aral lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 84,
      lengthM: 8, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'Asia (Kazakhstan)', formation: 'Beleutinskaya',
      named: 1968, namedBy: 'Anatoly Rozhdestvensky',
      blurb: 'A duck-bill from near the Aral Sea with an arched, bump-nosed snout.',
      traits: ['Arched nasal bump', 'Grinding teeth', 'Large duck-bill'],
      facts: ['It is named for the Aral Sea region.', 'Its nasal bump may have been for display.'],
      uncertain: 'Known from limited skull material.',
      howKnow: 'A skull from Kazakhstan.'
    },
    {
      id: 'tyrannotitan', name: 'Tyrannotitan chubutensis', common: 'Tyrannotitan',
      say: 'tih-RAN-uh-TY-tan', meaning: 'tyrant titan',
      group: 'theropod', clade: 'Carcharodontosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 118, myaLo: 110,
      lengthM: 12, heightM: 3.5, weightKg: 6000, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Cerro Barcino',
      named: 2005, namedBy: 'Novas and colleagues',
      blurb: 'A giant shark-toothed predator, an early relative of Giganotosaurus, despite the misleading name.',
      traits: ['Shark-like teeth', 'Massive skull', 'Giant predator'],
      facts: ['Despite its name, it is not a tyrannosaur.', 'It is one of the earliest giant carcharodontosaurs.'],
      uncertain: 'Its top size is estimated from partial remains.',
      howKnow: 'Partial skeletons from Patagonia.'
    },
    {
      id: 'piatnitzkysaurus', name: 'Piatnitzkysaurus floresi', common: 'Piatnitzkysaurus',
      say: 'pee-at-NIT-skee-SOR-us', meaning: 'Piatnitzky’s lizard',
      group: 'theropod', clade: 'Megalosauroidea', diet: 'carnivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 165, myaLo: 161,
      lengthM: 6, heightM: 2, weightKg: 450, speedKmh: 32,
      region: 'South America (Argentina)', formation: 'Cañadón Asfalto',
      named: 1979, namedBy: 'José Bonaparte',
      blurb: 'A medium Jurassic predator from Patagonia, one of the better-known southern theropods of its age.',
      traits: ['Slender build', 'Bladed teeth', 'Three-fingered hands'],
      facts: ['It is among the best Jurassic theropods from South America.', 'It hunted the early sauropods of its world.'],
      uncertain: 'Its exact relationships are studied.',
      howKnow: 'Partial skeletons from Patagonia.'
    },
    {
      id: 'marshosaurus', name: 'Marshosaurus bicentesimus', common: 'Marshosaurus',
      say: 'MARSH-uh-SOR-us', meaning: 'Marsh’s lizard',
      group: 'theropod', clade: 'Megalosauroidea', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 150,
      lengthM: 5, heightM: 1.7, weightKg: 300, speedKmh: 32,
      region: 'North America', formation: 'Morrison',
      named: 1976, namedBy: 'James Madsen',
      blurb: 'A medium Morrison predator, smaller than Allosaurus, sharing the Jurassic plains with the giants.',
      traits: ['Medium predator', 'Bladed teeth', 'Light build'],
      facts: ['It hunted smaller prey beneath the big Allosaurus.', 'It is named for paleontologist O. C. Marsh.'],
      uncertain: 'Its exact relationships are studied.',
      howKnow: 'Bones from the Cleveland-Lloyd Quarry.'
    },
    {
      id: 'sinotyrannus', name: 'Sinotyrannus kazuoensis', common: 'Sinotyrannus',
      say: 'SY-noh-tih-RAN-us', meaning: 'Chinese tyrant',
      group: 'theropod', clade: 'Tyrannosauroidea', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 9, heightM: 2.8, weightKg: 2000, speedKmh: 30,
      region: 'Asia (China)', formation: 'Jiufotang',
      named: 2009, namedBy: 'Ji and colleagues',
      blurb: 'A surprisingly large early tyrannosaur, far bigger than other early relatives from its time.',
      traits: ['Large for an early tyrannosaur', 'Long head crest', 'Bladed teeth'],
      facts: ['It was much bigger than most early tyrannosaurs.', 'It lived in the feathered-dinosaur world of the Jehol beds.'],
      uncertain: 'Whether it was feathered like its relatives is inferred.',
      howKnow: 'Partial remains from China.'
    },
    {
      id: 'stokesosaurus', name: 'Stokesosaurus clevelandi', common: 'Stokesosaurus',
      say: 'STOHKS-uh-SOR-us', meaning: 'Stokes’ lizard',
      group: 'theropod', clade: 'Tyrannosauroidea', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 150,
      lengthM: 4, heightM: 1.3, weightKg: 200, speedKmh: 35,
      region: 'North America', formation: 'Morrison',
      named: 1974, namedBy: 'James Madsen',
      blurb: 'A small early tyrannosaur from the Jurassic, long before the giants, sharing the Morrison with Allosaurus.',
      traits: ['Small early tyrannosaur', 'Light build', 'Bladed teeth'],
      facts: ['It shows tyrannosaurs lived among the Jurassic giants while still small.', 'It is one of the earliest North American tyrannosauroids.'],
      uncertain: 'It is known from limited material.',
      howKnow: 'Hip and skull pieces from Utah.'
    },
    {
      id: 'lessemsaurus', name: 'Lessemsaurus sauropoides', common: 'Lessemsaurus',
      say: 'LESS-em-SOR-us', meaning: 'Lessem’s lizard',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'herbivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 210, myaLo: 205,
      lengthM: 9, heightM: 3, weightKg: 7000, speedKmh: 12,
      region: 'South America (Argentina)', formation: 'Los Colorados',
      named: 1999, namedBy: 'José Bonaparte',
      blurb: 'A heavy Triassic plant-eater near the origin of the giant sauropods, named for science writer Don Lessem.',
      traits: ['Heavy, deep-bodied build', 'Long neck', 'Tall back spines'],
      facts: ['It is named for dinosaur author Don Lessem.', 'It was among the larger animals of its Triassic world.'],
      uncertain: 'Exactly how it stood and moved is inferred from its bones.',
      howKnow: 'Several skeletons from Triassic Argentina.'
    },
    {
      id: 'isanosaurus', name: 'Isanosaurus attavipachi', common: 'Isanosaurus',
      say: 'ih-SAHN-uh-SOR-us', meaning: 'Isan lizard',
      group: 'sauropod', clade: 'early Sauropoda', diet: 'herbivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 210, myaLo: 201,
      lengthM: 6.5, heightM: 2, weightKg: 1800, speedKmh: 12,
      region: 'Asia (Thailand)', formation: 'Nam Phong',
      named: 2000, namedBy: 'Buffetaut and colleagues',
      blurb: 'One of the oldest known true sauropods, from the very dawn of the long-necked giants.',
      traits: ['Very early sauropod', 'Column-like limbs', 'Long neck'],
      facts: ['It is among the earliest true sauropods known.', 'It comes from Triassic Thailand.'],
      uncertain: 'Its skull is unknown, so its head is reconstructed.',
      howKnow: 'A partial skeleton from Thailand.'
    },
    {
      id: 'melanorosaurus', name: 'Melanorosaurus readi', common: 'Melanorosaurus',
      say: 'meh-LAN-uh-roh-SOR-us', meaning: 'Black Mountain lizard',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'herbivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 227, myaLo: 208,
      lengthM: 8, heightM: 3, weightKg: 2000, speedKmh: 12,
      region: 'Africa (South Africa)', formation: 'Lower Elliot',
      named: 1924, namedBy: 'Sidney Haughton',
      blurb: 'A heavy four-legged early plant-eater, close to the origin of the giant sauropods.',
      traits: ['Heavy four-legged build', 'Long neck', 'Column-like limbs'],
      facts: ['It walked on all fours like later sauropods.', 'It sits near the sauropod origin.'],
      uncertain: 'Its exact place at the transition is studied.',
      howKnow: 'Several skeletons from South Africa.'
    },
    {
      id: 'kotasaurus', name: 'Kotasaurus yamanpalliensis', common: 'Kotasaurus',
      say: 'KOH-tuh-SOR-us', meaning: 'Kota lizard',
      group: 'sauropod', clade: 'early Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 196, myaLo: 183,
      lengthM: 9, heightM: 3, weightKg: 5000, speedKmh: 12,
      region: 'Asia (India)', formation: 'Kota',
      named: 1988, namedBy: 'Yadagiri',
      blurb: 'An early Indian sauropod known from a bonebed, helping trace the rise of the long-necks.',
      traits: ['Early sauropod', 'Long neck', 'Spoon-shaped teeth'],
      facts: ['Many of its bones were found together.', 'It shared its world with the larger Barapasaurus.'],
      uncertain: 'Its skull is poorly known.',
      howKnow: 'A bonebed from central India.'
    },
    {
      id: 'bellusaurus', name: 'Bellusaurus sui', common: 'Bellusaurus',
      say: 'BEL-uh-SOR-us', meaning: 'beautiful lizard',
      group: 'sauropod', clade: 'Sauropoda', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 168, myaLo: 161,
      lengthM: 5, heightM: 2, weightKg: 1500, speedKmh: 12,
      region: 'Asia (China)', formation: 'Shishugou',
      named: 1990, namedBy: 'Dong Zhiming',
      blurb: 'A small sauropod known from a group of young animals that died together in a flash flood.',
      traits: ['Small sauropod', 'Short neck', 'Known from juveniles'],
      facts: ['A group of juveniles was found together.', 'They may have died in a sudden flood.'],
      uncertain: 'Adult size is uncertain because mostly young are known.',
      howKnow: 'A bonebed of young animals from China.'
    },
    {
      id: 'klamelisaurus', name: 'Klamelisaurus gobiensis', common: 'Klamelisaurus',
      say: 'klah-MEL-ih-SOR-us', meaning: 'Kelameili lizard',
      group: 'sauropod', clade: 'Mamenchisauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 170, myaLo: 160,
      lengthM: 17, heightM: 5, weightKg: 12000, speedKmh: 12,
      region: 'Asia (China)', formation: 'Shishugou',
      named: 1993, namedBy: 'Zhao Xijin',
      blurb: 'A long-necked Chinese sauropod, a relative of Mamenchisaurus, known from a good skeleton.',
      traits: ['Long neck', 'Light neck bones', 'Sturdy body'],
      facts: ['It is a cousin of the long-necked Mamenchisaurus.', 'Its skeleton was re-studied in detail in 2019.'],
      uncertain: 'Its exact relationships are studied.',
      howKnow: 'A good skeleton from northwestern China.'
    },
    {
      id: 'argyrosaurus', name: 'Argyrosaurus superbus', common: 'Argyrosaurus',
      say: 'ar-JEER-uh-SOR-us', meaning: 'silver lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 70,
      lengthM: 22, heightM: 7, weightKg: 30000, speedKmh: 10,
      region: 'South America (Argentina)', formation: 'Lago Colhué Huapi',
      named: 1893, namedBy: 'Richard Lydekker',
      blurb: 'A giant titanosaur known mainly from a huge forelimb, one of the first South American giants named.',
      traits: ['Giant titanosaur', 'Massive forelimb', 'Long neck'],
      facts: ['It is known mostly from a huge arm.', 'It was one of the first South American giants described.'],
      uncertain: 'Its full size is estimated from limited bones.',
      howKnow: 'A giant forelimb and scattered bones from Patagonia.'
    },
    {
      id: 'antarctosaurus', name: 'Antarctosaurus wichmannianus', common: 'Antarctosaurus',
      say: 'ant-ARK-tuh-SOR-us', meaning: 'southern lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 83, myaLo: 79,
      lengthM: 18, heightM: 6, weightKg: 25000, speedKmh: 10,
      region: 'South America (Argentina)', formation: 'Anacleto',
      named: 1929, namedBy: 'Friedrich von Huene',
      blurb: 'A large titanosaur with a squared-off jaw and peg teeth, despite its name living far from Antarctica.',
      traits: ['Squared-off lower jaw', 'Peg-like teeth', 'Large titanosaur'],
      facts: ['Its name means "southern", not "from Antarctica".', 'Its jaw shape suggests low browsing.'],
      uncertain: 'Which bones truly belong to it is debated.',
      howKnow: 'Skull and limb material from Patagonia.'
    },
    {
      id: 'maxakalisaurus', name: 'Maxakalisaurus topai', common: 'Maxakalisaurus',
      say: 'mah-shah-KAH-lee-SOR-us', meaning: 'Maxakali lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 80, myaLo: 75,
      lengthM: 13, heightM: 4, weightKg: 9000, speedKmh: 12,
      region: 'South America (Brazil)', formation: 'Adamantina',
      named: 2006, namedBy: 'Kellner and colleagues',
      blurb: 'A Brazilian titanosaur with bony skin armor, one of the largest dinosaurs known from Brazil.',
      traits: ['Bony skin armor', 'Long neck', 'Ridged teeth'],
      facts: ['It is one of Brazil’s largest known dinosaurs.', 'Its skin held small bony plates.'],
      uncertain: 'Its full size is estimated from a partial skeleton.',
      howKnow: 'A partial skeleton from southeastern Brazil.'
    },
    {
      id: 'mendozasaurus', name: 'Mendozasaurus neguyelap', common: 'Mendozasaurus',
      say: 'men-DOH-zuh-SOR-us', meaning: 'Mendoza lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 86,
      lengthM: 18, heightM: 6, weightKg: 18000, speedKmh: 10,
      region: 'South America (Argentina)', formation: 'Cerro Lisandro',
      named: 2003, namedBy: 'González Riga',
      blurb: 'A titanosaur known from several individuals with bony armor, helping reveal how they grew.',
      traits: ['Bony skin armor', 'Wide body', 'Long neck'],
      facts: ['Several individuals show its growth.', 'It had small armor plates in its skin.'],
      uncertain: 'Its full size is estimated from partial material.',
      howKnow: 'Several partial skeletons from Mendoza, Argentina.'
    },
    {
      id: 'orodromeus', name: 'Orodromeus makelai', common: 'Orodromeus',
      say: 'or-uh-DROM-ee-us', meaning: 'mountain runner',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 75,
      lengthM: 2.5, heightM: 0.7, weightKg: 30, speedKmh: 35,
      region: 'North America', formation: 'Two Medicine',
      named: 1988, namedBy: 'Horner & Weishampel',
      blurb: 'A small, fast plant-eater whose skeletons are found near Maiasaura nesting grounds in the Two Medicine Formation.',
      traits: ['Small and speedy', 'Beak and cheek teeth', 'Long running legs'],
      facts: ['Spiral eggs once blamed on it were later shown to belong to the predator Troodon.', 'It lived alongside the giant duck-bill Maiasaura.'],
      uncertain: 'Whether it nested in colonies is now doubted, since its "eggs" turned out to be Troodon’s.',
      howKnow: 'Skeletons from Montana, near nests once attributed to it.'
    },
    {
      id: 'parksosaurus', name: 'Parksosaurus warreni', common: 'Parksosaurus',
      say: 'PARK-suh-SOR-us', meaning: 'Parks’ lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 70,
      lengthM: 2.5, heightM: 0.8, weightKg: 45, speedKmh: 35,
      region: 'North America', formation: 'Horseshoe Canyon',
      named: 1937, namedBy: 'Charles M. Sternberg',
      blurb: 'A small, lightly built plant-eater from Canada, one of the few small ornithopods from its beds.',
      traits: ['Light, fast build', 'Large eyes', 'Beak and cheek teeth'],
      facts: ['It is one of the few small plant-eaters from its formation.', 'Speed was likely its main defense.'],
      uncertain: 'Its exact relationships are studied.',
      howKnow: 'A partial skeleton from Alberta.'
    },
    {
      id: 'changchunsaurus', name: 'Changchunsaurus parvus', common: 'Changchunsaurus',
      say: 'chang-CHOON-uh-SOR-us', meaning: 'Changchun lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 100, myaLo: 95,
      lengthM: 1.5, heightM: 0.5, weightKg: 12, speedKmh: 35,
      region: 'Asia (China)', formation: 'Quantou',
      named: 2005, namedBy: 'Zan and colleagues',
      blurb: 'A small, fast plant-eater from northeastern China, known from several good skulls.',
      traits: ['Small and speedy', 'Beak and cheek teeth', 'Self-sharpening teeth'],
      facts: ['Its teeth sharpened themselves as it chewed.', 'Several skulls reveal its anatomy.'],
      uncertain: 'Its exact place among ornithopods is studied.',
      howKnow: 'Several skulls and skeletons from China.'
    },
    {
      id: 'haya', name: 'Haya griva', common: 'Haya',
      say: 'HY-uh', meaning: 'for a horse-headed deity',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 86, myaLo: 83,
      lengthM: 1.5, heightM: 0.5, weightKg: 12, speedKmh: 35,
      region: 'Asia (Mongolia)', formation: 'Javkhlant',
      named: 2011, namedBy: 'Makovicky and colleagues',
      blurb: 'A small Mongolian plant-eater that swallowed stones to grind its food, known from many individuals.',
      traits: ['Small and speedy', 'Gastroliths in the gut', 'Beak and cheek teeth'],
      facts: ['Stomach stones helped it grind tough plants.', 'Many individuals are known.'],
      uncertain: 'Whether it lived in groups is inferred from clustered finds.',
      howKnow: 'Several skeletons from Mongolia.'
    },
    {
      id: 'manidens', name: 'Manidens condorensis', common: 'Manidens',
      say: 'MAN-ih-denz', meaning: 'hand tooth',
      group: 'ornithischian', clade: 'Heterodontosauridae', diet: 'omnivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 180, myaLo: 178,
      lengthM: 0.8, heightM: 0.2, weightKg: 1, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Cañadón Asfalto',
      named: 2011, namedBy: 'Pol and colleagues',
      blurb: 'A tiny tusked plant-eater from Patagonia, a southern member of the fanged heterodontosaurs.',
      traits: ['Tusk-like teeth', 'Tiny body', 'Grasping hands'],
      facts: ['It shows the tusked plant-eaters lived in South America.', 'Its teeth could shear tough plants.'],
      uncertain: 'Its exact diet is inferred from its varied teeth.',
      howKnow: 'A good skull and skeleton from Patagonia.'
    },
    {
      id: 'nanosaurus', name: 'Nanosaurus agilis', common: 'Nanosaurus',
      say: 'NAN-uh-SOR-us', meaning: 'dwarf lizard',
      group: 'ornithischian', clade: 'early Ornithischia', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 155, myaLo: 148,
      lengthM: 1.3, heightM: 0.4, weightKg: 5, speedKmh: 35,
      region: 'North America', formation: 'Morrison',
      named: 1877, namedBy: 'Othniel Charles Marsh',
      blurb: 'A small, fast Morrison plant-eater that now absorbs several other tiny dinosaur names.',
      traits: ['Small and speedy', 'Beak and cheek teeth', 'Long legs'],
      facts: ['Several other small dinosaur names are now folded into it.', 'It darted among the Jurassic giants.'],
      uncertain: 'Its tangled naming history is still being sorted.',
      howKnow: 'Small skeletons from the Morrison Formation.'
    },
    {
      id: 'acrotholus', name: 'Acrotholus audeti', common: 'Acrotholus',
      say: 'uh-KROTH-uh-lus', meaning: 'high dome',
      group: 'ornithischian', clade: 'Pachycephalosauridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 85, myaLo: 84,
      lengthM: 2.5, heightM: 0.9, weightKg: 40, speedKmh: 30,
      region: 'North America', formation: 'Milk River',
      named: 2013, namedBy: 'Evans and colleagues',
      blurb: 'One of the oldest North American dome-heads, with a thick, solid skull cap.',
      traits: ['Thick solid dome', 'Two-legged build', 'Small body'],
      facts: ['It is among the oldest North American pachycephalosaurs.', 'Its dome is unusually thick for its age.'],
      uncertain: 'Head-butting versus display is debated for all dome-heads.',
      howKnow: 'Skull domes from Alberta.'
    },
    {
      id: 'scolosaurus', name: 'Scolosaurus cutleri', common: 'Scolosaurus',
      say: 'SKOH-luh-SOR-us', meaning: 'pointed-stake lizard',
      group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 76,
      lengthM: 5, heightM: 1.5, weightKg: 2000, speedKmh: 10,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1928, namedBy: 'Franz Nopcsa',
      blurb: 'A club-tailed armored dinosaur from Alberta with prominent shoulder and tail spikes.',
      traits: ['Tail club', 'Shoulder spikes', 'Heavy armor'],
      facts: ['Its armor and spikes are well preserved.', 'It is closely related to Euoplocephalus.'],
      uncertain: 'How many similar specimens are one species is debated.',
      howKnow: 'Good armored skeletons from Alberta.'
    },
    {
      id: 'akainacephalus', name: 'Akainacephalus johnsoni', common: 'Akainacephalus',
      say: 'uh-KY-nuh-SEF-uh-lus', meaning: 'thorn head',
      group: 'ornithischian', clade: 'Ankylosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 75,
      lengthM: 5, heightM: 1.5, weightKg: 2000, speedKmh: 10,
      region: 'North America', formation: 'Kaiparowits',
      named: 2018, namedBy: 'Wiersma & Irmis',
      blurb: 'A spiky-headed club-tailed dinosaur from Utah whose armor links it to Asian ankylosaurs.',
      traits: ['Spiky head armor', 'Tail club', 'Asian-style armor'],
      facts: ['Its skull armor resembles Asian ankylosaurs.', 'It hints at migration between Asia and North America.'],
      uncertain: 'How its ancestors crossed between continents is inferred.',
      howKnow: 'A good skull and skeleton from southern Utah.'
    },
    {
      id: 'denversaurus', name: 'Denversaurus schlessmani', common: 'Denversaurus',
      say: 'DEN-ver-SOR-us', meaning: 'Denver lizard',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66,
      lengthM: 6, heightM: 1.6, weightKg: 2500, speedKmh: 10,
      region: 'North America', formation: 'Hell Creek',
      named: 1988, namedBy: 'Robert Bakker',
      blurb: 'A wide-skulled armored dinosaur, one of the last club-less nodosaurs before the asteroid.',
      traits: ['Wide armored skull', 'Body armor', 'No tail club'],
      facts: ['It lived right up to the end of the dinosaur age.', 'Its broad skull is distinctive.'],
      uncertain: 'Whether it differs enough from Edmontonia is debated.',
      howKnow: 'A skull and armor from the latest Cretaceous.'
    },
    {
      id: 'chungkingosaurus', name: 'Chungkingosaurus jiangbeiensis', common: 'Chungkingosaurus',
      say: 'CHUNG-king-uh-SOR-us', meaning: 'Chongqing lizard',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 160, myaLo: 155,
      lengthM: 4, heightM: 1.4, weightKg: 1500, speedKmh: 8,
      region: 'Asia (China)', formation: 'Upper Shaximiao',
      named: 1983, namedBy: 'Dong and colleagues',
      blurb: 'A small Chinese stegosaur with narrow, thick plates that grade into spikes along its back.',
      traits: ['Narrow plate-spikes', 'Small body', 'Tail spikes'],
      facts: ['Its plates blur the line between plate and spike.', 'It is one of several stegosaurs from Jurassic China.'],
      uncertain: 'Exact plate arrangement is reconstructed.',
      howKnow: 'Several partial skeletons from China.'
    },
    {
      id: 'hesperosaurus', name: 'Hesperosaurus mjosi', common: 'Hesperosaurus',
      say: 'HES-per-uh-SOR-us', meaning: 'western lizard',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 156, myaLo: 150,
      lengthM: 6.5, heightM: 2.5, weightKg: 3500, speedKmh: 8,
      region: 'North America', formation: 'Morrison',
      named: 2001, namedBy: 'Carpenter and colleagues',
      blurb: 'A close relative of Stegosaurus with broader, lower plates, known from a skin-bearing specimen.',
      traits: ['Broad, low back plates', 'Tail spikes', 'Preserved skin'],
      facts: ['A specimen preserves rare skin impressions.', 'Its plates are broader than those of Stegosaurus.'],
      uncertain: 'Whether it is its own genus or a Stegosaurus species is debated.',
      howKnow: 'Good skeletons, one with skin, from the Morrison.'
    },
    {
      id: 'koreaceratops', name: 'Koreaceratops hwaseongensis', common: 'Koreaceratops',
      say: 'kuh-REE-uh-SERR-uh-tops', meaning: 'Korea horned face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 105, myaLo: 100,
      lengthM: 1.7, heightM: 0.5, weightKg: 15, speedKmh: 25,
      region: 'Asia (South Korea)', formation: 'Tando',
      named: 2011, namedBy: 'Lee and colleagues',
      blurb: 'A small early horned dinosaur from Korea with a tall, paddle-like tail, perhaps for swimming.',
      traits: ['Tall paddle-like tail', 'Small frill', 'Parrot beak'],
      facts: ['Its tall tail may have helped it swim.', 'It is the first horned dinosaur named from Korea.'],
      uncertain: 'Whether the tail was for swimming or display is inferred.',
      howKnow: 'A partial skeleton from South Korea.'
    },
    {
      id: 'udanoceratops', name: 'Udanoceratops tschizhovi', common: 'Udanoceratops',
      say: 'oo-DAN-uh-SERR-uh-tops', meaning: 'Udan-Sayr horned face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 80, myaLo: 75,
      lengthM: 4, heightM: 1.3, weightKg: 700, speedKmh: 25,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 1992, namedBy: 'Sergei Kurzanov',
      blurb: 'A large, frilled but hornless horned dinosaur from Mongolia, bigger than most of its kin.',
      traits: ['Large for its group', 'Deep lower jaw', 'Short frill'],
      facts: ['It is one of the largest frilled, hornless ceratopsians.', 'Its deep jaw suggests strong chewing.'],
      uncertain: 'Whether it walked on two or four legs is debated.',
      howKnow: 'A good skull from Mongolia.'
    },
    {
      id: 'mercuriceratops', name: 'Mercuriceratops gemini', common: 'Mercuriceratops',
      say: 'mer-KYOOR-ih-SERR-uh-tops', meaning: 'Mercury horned face',
      group: 'ornithischian', clade: 'Ceratopsidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 76,
      lengthM: 6, heightM: 2, weightKg: 2000, speedKmh: 25,
      region: 'North America', formation: 'Dinosaur Park',
      named: 2014, namedBy: 'Ryan and colleagues',
      blurb: 'A horned dinosaur with wing-like frill flanges, named for the winged-helmet god Mercury.',
      traits: ['Wing-like frill edges', 'Brow horns', 'Heavy body'],
      facts: ['Its frill edges flare out like wings.', 'It was found on both sides of the US-Canada border.'],
      uncertain: 'It is known from limited frill material.',
      howKnow: 'Frill bones from Montana and Alberta.'
    },
    {
      id: 'magnosaurus', name: 'Magnosaurus nethercombensis', common: 'Magnosaurus',
      say: 'MAG-nuh-SOR-us', meaning: 'large lizard',
      group: 'theropod', clade: 'Megalosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 175, myaLo: 170,
      lengthM: 4, heightM: 1.4, weightKg: 200, speedKmh: 32,
      region: 'Europe (England)', formation: 'Inferior Oolite',
      named: 1932, namedBy: 'Friedrich von Huene',
      blurb: 'An early megalosaur from England, long confused with the very first dinosaur, Megalosaurus.',
      traits: ['Early megalosaur', 'Bladed teeth', 'Slender build'],
      facts: ['It was once lumped in with Megalosaurus.', 'It helps untangle early predatory dinosaurs.'],
      uncertain: 'It is known from limited material.',
      howKnow: 'Jaw and limb bones from England.'
    },
    {
      id: 'unenlagia', name: 'Unenlagia comahuensis', common: 'Unenlagia',
      say: 'oo-nen-LAH-gee-uh', meaning: 'half-bird',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 86,
      lengthM: 3.5, heightM: 1.1, weightKg: 75, speedKmh: 40,
      region: 'South America (Argentina)', formation: 'Portezuelo',
      named: 1997, namedBy: 'Novas & Puerta',
      blurb: 'A southern raptor whose shoulder could fold like a bird’s wing, blurring the bird-dinosaur line.',
      traits: ['Bird-like shoulder', 'Long legs', 'Sickle claw'],
      facts: ['Its shoulder could make wing-like flapping motions.', 'Its name means "half-bird".'],
      uncertain: 'Whether the wing motion means anything for flight is debated.',
      howKnow: 'A partial skeleton from Patagonia.'
    },
    {
      id: 'pyroraptor', name: 'Pyroraptor olympius', common: 'Pyroraptor',
      say: 'PY-roh-RAP-tor', meaning: 'fire thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 70,
      lengthM: 1.5, heightM: 0.5, weightKg: 12, speedKmh: 45,
      region: 'Europe (France)', formation: 'Various',
      named: 2000, namedBy: 'Allain & Taquet',
      blurb: 'A small island raptor from southern France, found after a wildfire exposed the fossils.',
      traits: ['Sickle claw', 'Small island raptor', 'Light build'],
      facts: ['Its name reflects a wildfire that exposed the bones.', 'It lived on the islands of Cretaceous Europe.'],
      uncertain: 'It is known from limited material.',
      howKnow: 'Scattered bones from southern France.'
    },
    {
      id: 'atrociraptor', name: 'Atrociraptor marshalli', common: 'Atrociraptor',
      say: 'uh-TROSS-ih-RAP-tor', meaning: 'savage thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 71, myaLo: 68,
      lengthM: 2, heightM: 0.6, weightKg: 15, speedKmh: 45,
      region: 'North America', formation: 'Horseshoe Canyon',
      named: 2004, namedBy: 'Currie & Varricchio',
      blurb: 'A short-snouted raptor from Alberta with steeply raked teeth, built for a quick, fierce bite.',
      traits: ['Short, deep snout', 'Raked teeth', 'Sickle claw'],
      facts: ['Its short face packed a strong bite.', 'It is one of the last North American raptors.'],
      uncertain: 'It is known from limited skull material.',
      howKnow: 'Jaw and skull pieces from Alberta.'
    },
    {
      id: 'sinovenator', name: 'Sinovenator changii', common: 'Sinovenator',
      say: 'SY-noh-VEN-uh-tor', meaning: 'Chinese hunter',
      group: 'theropod', clade: 'Troodontidae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 122,
      lengthM: 1, heightM: 0.3, weightKg: 3, speedKmh: 45,
      region: 'Asia (China)', formation: 'Yixian',
      named: 2002, namedBy: 'Xu and colleagues',
      blurb: 'A small, primitive, bird-like troodontid from the famous feathered-dinosaur beds of China.',
      traits: ['Small and bird-like', 'Sickle claw', 'Many small teeth'],
      facts: ['It is one of the most primitive troodontids.', 'It lived among the feathered dinosaurs of the Jehol beds.'],
      uncertain: 'Whether it had a full feather coat is inferred from relatives.',
      howKnow: 'Several skeletons from China.'
    },
    {
      id: 'byronosaurus', name: 'Byronosaurus jaffei', common: 'Byronosaurus',
      say: 'by-RON-uh-SOR-us', meaning: 'Byron’s lizard',
      group: 'theropod', clade: 'Troodontidae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 80, myaLo: 75,
      lengthM: 1.5, heightM: 0.5, weightKg: 4, speedKmh: 45,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 2000, namedBy: 'Norell and colleagues',
      blurb: 'A slender troodontid with many small, needle-like, unserrated teeth, unusual for a predator.',
      traits: ['Needle-like teeth', 'Slender skull', 'Sickle claw'],
      facts: ['Its smooth, fine teeth are unusual among predators.', 'Hatchlings of it were found near an Oviraptor nest.'],
      uncertain: 'Its exact diet is inferred from its odd teeth.',
      howKnow: 'Skulls and skeletons from Mongolia.'
    },
    {
      id: 'lourinhasaurus', name: 'Lourinhasaurus alenquerensis', common: 'Lourinhasaurus',
      say: 'loh-REEN-yuh-SOR-us', meaning: 'Lourinhã lizard',
      group: 'sauropod', clade: 'Camarasauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 152, myaLo: 145,
      lengthM: 17, heightM: 5, weightKg: 18000, speedKmh: 12,
      region: 'Europe (Portugal)', formation: 'Lourinhã',
      named: 1957, namedBy: 'de Lapparent & Zbyszewski',
      blurb: 'A Portuguese cousin of Camarasaurus, from beds that closely match the American Morrison Formation.',
      traits: ['Boxy skull', 'Spoon-shaped teeth', 'Sturdy build'],
      facts: ['Portugal’s Jurassic beds mirror the American Morrison.', 'It is a European relative of Camarasaurus.'],
      uncertain: 'Its naming history was tangled with other sauropods.',
      howKnow: 'Skeletons and eggs from Portugal.'
    },
    {
      id: 'kangnasaurus', name: 'Kangnasaurus coetzeei', common: 'Kangnasaurus',
      say: 'KANG-nuh-SOR-us', meaning: 'Kangnas lizard',
      group: 'ornithischian', clade: 'Iguanodontia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 110,
      lengthM: 5, heightM: 1.8, weightKg: 600, speedKmh: 25,
      region: 'Africa (South Africa)', formation: 'Kangnas',
      named: 1915, namedBy: 'Sidney Haughton',
      blurb: 'A medium plant-eater, one of the few iguanodont-type dinosaurs known from southern Africa.',
      traits: ['Beak and grinding teeth', 'Medium build', 'Iguanodont-type'],
      facts: ['It is a rare ornithopod from southern Africa.', 'It shows the group reached the far south.'],
      uncertain: 'It is known from limited material.',
      howKnow: 'Teeth and bones from South Africa.'
    },
    {
      id: 'valdosaurus', name: 'Valdosaurus canaliculatus', common: 'Valdosaurus',
      say: 'VAL-duh-SOR-us', meaning: 'Weald lizard',
      group: 'ornithischian', clade: 'Dryosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 140, myaLo: 132,
      lengthM: 3, heightM: 1, weightKg: 90, speedKmh: 35,
      region: 'Europe (England)', formation: 'Wessex',
      named: 1977, namedBy: 'Peter Galton',
      blurb: 'A small, fast plant-eater from the Isle of Wight, a European cousin of the swift Dryosaurus.',
      traits: ['Light, speedy build', 'Beak and cheek teeth', 'Long legs'],
      facts: ['It is a European relative of the runner Dryosaurus.', 'Speed was likely its main defense.'],
      uncertain: 'It is known from limited material.',
      howKnow: 'Leg bones from the Isle of Wight.'
    },
    {
      id: 'talenkauen', name: 'Talenkauen santacrucensis', common: 'Talenkauen',
      say: 'tuh-LEN-koh-en', meaning: 'small skull',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 72, myaLo: 70,
      lengthM: 4, heightM: 1.3, weightKg: 300, speedKmh: 30,
      region: 'South America (Argentina)', formation: 'Pari Aike',
      named: 2004, namedBy: 'Novas and colleagues',
      blurb: 'A medium plant-eater with thin bony plates along its ribs, an unusual feature for an ornithopod.',
      traits: ['Bony rib plates', 'Beak and cheek teeth', 'Light build'],
      facts: ['Thin plates lined its ribs.', 'It is a southern relative of the iguanodonts.'],
      uncertain: 'What the rib plates were for is debated.',
      howKnow: 'A good skeleton from Patagonia.'
    },
    {
      id: 'galleonosaurus', name: 'Galleonosaurus dorisae', common: 'Galleonosaurus',
      say: 'GAL-ee-uh-nuh-SOR-us', meaning: 'galleon lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 120,
      lengthM: 2.4, heightM: 0.7, weightKg: 25, speedKmh: 35,
      region: 'Australia', formation: 'Wonthaggi',
      named: 2019, namedBy: 'Herne and colleagues',
      blurb: 'A small, fast plant-eater from polar Australia, its jaw shaped like an upturned ship’s hull.',
      traits: ['Galleon-shaped jaw', 'Small and speedy', 'Polar dweller'],
      facts: ['Its upper jaw looks like an upturned galleon.', 'It lived in the cool, dark rift valley of polar Australia.'],
      uncertain: 'Its full body is reconstructed from jaw material.',
      howKnow: 'Upper jaws from Victoria, Australia.'
    },
    {
      id: 'wannanosaurus', name: 'Wannanosaurus yansiensis', common: 'Wannanosaurus',
      say: 'wah-NAN-uh-SOR-us', meaning: 'south Anhui lizard',
      group: 'ornithischian', clade: 'Pachycephalosauridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 85, myaLo: 80,
      lengthM: 0.6, heightM: 0.2, weightKg: 2, speedKmh: 30,
      region: 'Asia (China)', formation: 'Xiaoyan',
      named: 1977, namedBy: 'Hou Lianhai',
      blurb: 'A tiny, flat-headed early dome-head, one of the smallest and most primitive of its group.',
      traits: ['Flat, thin skull roof', 'Tiny body', 'Two-legged build'],
      facts: ['It is one of the smallest pachycephalosaurs.', 'Its flat head is primitive for the group.'],
      uncertain: 'Whether its flat head is primitive or juvenile is debated.',
      howKnow: 'A small partial skeleton from China.'
    },
    {
      id: 'datanglong', name: 'Datanglong guangxiensis', common: 'Datanglong',
      say: 'dah-TANG-long', meaning: 'Datang dragon',
      group: 'theropod', clade: 'Carcharodontosauria', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 113,
      lengthM: 9, heightM: 2.8, weightKg: 2000, speedKmh: 30,
      region: 'Asia (China)', formation: 'Xinlong',
      named: 2014, namedBy: 'Mo and colleagues',
      blurb: 'A large early shark-toothed predator from southern China, known from back and hip bones.',
      traits: ['Large predator', 'Air-filled vertebrae', 'Bladed teeth'],
      facts: ['It is one of the larger Early Cretaceous Asian predators.', 'It is known mainly from its back and hips.'],
      uncertain: 'Its full size is estimated from partial remains.',
      howKnow: 'Vertebrae and hip bones from China.'
    },
    {
      id: 'aerosteon', name: 'Aerosteon riocoloradense', common: 'Aerosteon',
      say: 'air-OSS-tee-on', meaning: 'air bone',
      group: 'theropod', clade: 'Megaraptora', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 84, myaLo: 83,
      lengthM: 9, heightM: 2.8, weightKg: 2000, speedKmh: 32,
      region: 'South America (Argentina)', formation: 'Anacleto',
      named: 2008, namedBy: 'Sereno and colleagues',
      blurb: 'A large predator whose air-filled bones give clear evidence of a bird-like breathing system.',
      traits: ['Air-filled bones', 'Bird-like air sacs', 'Large predator'],
      facts: ['Its bones show signs of bird-like lungs and air sacs.', 'Its name means "air bone".'],
      uncertain: 'Where megaraptorans fit among theropods is debated.',
      howKnow: 'A partial skeleton from Patagonia.'
    },
    {
      id: 'murusraptor', name: 'Murusraptor barrosaensis', common: 'Murusraptor',
      say: 'MOO-rus-RAP-tor', meaning: 'wall thief',
      group: 'theropod', clade: 'Megaraptora', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 84,
      lengthM: 6.5, heightM: 2.1, weightKg: 1000, speedKmh: 35,
      region: 'South America (Argentina)', formation: 'Sierra Barrosa',
      named: 2016, namedBy: 'Coria & Currie',
      blurb: 'A lightly built megaraptoran found in a canyon wall, with big hand claws and air-filled bones.',
      traits: ['Large hand claws', 'Air-filled bones', 'Slender build'],
      facts: ['It was found embedded in a canyon wall, giving its name.', 'Its braincase is well preserved.'],
      uncertain: 'Its exact relationships among predators are debated.',
      howKnow: 'A fairly complete skeleton from Patagonia.'
    },
    {
      id: 'oxalaia', name: 'Oxalaia quilombensis', common: 'Oxalaia',
      say: 'oh-shah-LY-uh', meaning: 'for an African deity',
      group: 'theropod', clade: 'Spinosauridae', diet: 'piscivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 100, myaLo: 95,
      lengthM: 13, heightM: 3.5, weightKg: 5000, speedKmh: 18,
      region: 'South America (Brazil)', formation: 'Alcântara',
      named: 2011, namedBy: 'Kellner and colleagues',
      blurb: 'A giant Brazilian spinosaur, a close cousin of the African Spinosaurus, known from snout bones.',
      traits: ['Long fish-eating snout', 'Conical teeth', 'Large size'],
      facts: ['It is closely related to the African Spinosaurus.', 'It shows spinosaurs spanned the South Atlantic.'],
      uncertain: 'Its full size is estimated from snout material.',
      howKnow: 'Snout bones from northern Brazil.'
    },
    {
      id: 'siamosaurus', name: 'Siamosaurus suteethorni', common: 'Siamosaurus',
      say: 'sy-AM-uh-SOR-us', meaning: 'Siam lizard',
      group: 'theropod', clade: 'Spinosauridae', diet: 'piscivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 130, myaLo: 125,
      lengthM: 9, heightM: 2.8, weightKg: 3000, speedKmh: 18,
      region: 'Asia (Thailand)', formation: 'Sao Khua',
      named: 1986, namedBy: 'Buffetaut & Ingavat',
      blurb: 'One of the first spinosaurs known from Asia, identified mainly from its distinctive conical teeth.',
      traits: ['Conical fish-eating teeth', 'Fish-eater', 'Long snout'],
      facts: ['It is among the first Asian spinosaurs recognized.', 'Its teeth match a fish-heavy diet.'],
      uncertain: 'Known mostly from teeth, so much is reconstructed.',
      howKnow: 'Teeth and bones from Thailand.'
    },
    {
      id: 'metriacanthosaurus', name: 'Metriacanthosaurus parkeri', common: 'Metriacanthosaurus',
      say: 'MET-ree-uh-KAN-thuh-SOR-us', meaning: 'moderate-spined lizard',
      group: 'theropod', clade: 'Metriacanthosauridae', diet: 'carnivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 160, myaLo: 155,
      lengthM: 7.5, heightM: 2.4, weightKg: 1000, speedKmh: 30,
      region: 'Europe (England)', formation: 'Oxford Clay',
      named: 1964, namedBy: 'Alick Walker',
      blurb: 'A medium English predator with moderately tall back spines, famous for a cameo on a Jurassic Park screen.',
      traits: ['Moderately tall back spines', 'Bladed teeth', 'Medium build'],
      facts: ['Its name appears on a screen in the first Jurassic Park film.', 'Its back spines were taller than most theropods.'],
      uncertain: 'It is known from limited material.',
      howKnow: 'Partial remains from England.'
    },
    {
      id: 'becklespinax', name: 'Becklespinax altispinax', common: 'Becklespinax',
      say: 'BEK-uls-PY-naks', meaning: 'Beckles’ spine',
      group: 'theropod', clade: 'Allosauroidea (indeterminate)', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 140, myaLo: 132,
      lengthM: 8, heightM: 2.6, weightKg: 1500, speedKmh: 30,
      region: 'Europe (England)', formation: 'Hastings',
      named: 1991, namedBy: 'George Olshevsky',
      blurb: 'An English predator known from tall-spined back bones that may have held a low ridge or hump.',
      traits: ['Very tall back spines', 'Possible back ridge', 'Large predator'],
      facts: ['Its tall spines may have supported a ridge or hump.', 'It is known mainly from three back vertebrae.'],
      uncertain: 'Whether the spines held a sail or hump is debated.',
      howKnow: 'A few tall-spined vertebrae from England.'
    },
    {
      id: 'mahakala', name: 'Mahakala omnogovae', common: 'Mahakala',
      say: 'mah-hah-KAH-lah', meaning: 'for a Buddhist deity',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 80, myaLo: 75,
      lengthM: 0.7, heightM: 0.2, weightKg: 1, speedKmh: 45,
      region: 'Asia (Mongolia)', formation: 'Djadochta',
      named: 2007, namedBy: 'Turner and colleagues',
      blurb: 'One of the smallest and most primitive raptors, hinting that the group started out tiny.',
      traits: ['Very small body', 'Primitive raptor features', 'Sickle claw'],
      facts: ['It suggests raptors began small, then some grew large.', 'It is among the most basal dromaeosaurs.'],
      uncertain: 'How the group changed size over time is inferred.',
      howKnow: 'A small skeleton from Mongolia.'
    },
    {
      id: 'austroraptor2', name: 'Neuquenraptor argentinus', common: 'Neuquenraptor',
      say: 'noo-KEN-RAP-tor', meaning: 'Neuquén thief',
      group: 'theropod', clade: 'Dromaeosauridae', diet: 'carnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 86,
      lengthM: 2.5, heightM: 0.8, weightKg: 25, speedKmh: 45,
      region: 'South America (Argentina)', formation: 'Portezuelo',
      named: 2005, namedBy: 'Novas & Pol',
      blurb: 'A southern raptor that helped show the sickle-clawed hunters lived across the southern continents.',
      traits: ['Sickle claw', 'Light, fast build', 'Southern raptor'],
      facts: ['It confirmed raptors lived in South America.', 'It may be the same as the southern Unenlagia.'],
      uncertain: 'Whether it is its own genus is debated.',
      howKnow: 'Leg and foot bones from Patagonia.'
    },
    {
      id: 'koreanosaurus', name: 'Koreanosaurus boseongensis', common: 'Koreanosaurus',
      say: 'kuh-REE-uh-nuh-SOR-us', meaning: 'Korean lizard',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 85, myaLo: 80,
      lengthM: 2, heightM: 0.6, weightKg: 20, speedKmh: 30,
      region: 'Asia (South Korea)', formation: 'Seonso',
      named: 2011, namedBy: 'Huh and colleagues',
      blurb: 'A small Korean plant-eater with strong forelimbs, possibly a burrower like Oryctodromeus.',
      traits: ['Strong forelimbs', 'Possible burrower', 'Small body'],
      facts: ['Its sturdy arms hint it may have dug burrows.', 'It is one of the few dinosaurs named from Korea.'],
      uncertain: 'Whether it truly burrowed is inferred from its arms.',
      howKnow: 'Partial skeletons from South Korea.'
    },
    {
      id: 'willinakaqe', name: 'Willinakaqe salitralensis', common: 'Willinakaqe',
      say: 'wee-yee-nah-KAH-keh', meaning: 'southern mimic',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 70,
      lengthM: 9, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'South America (Argentina)', formation: 'Allen',
      named: 2010, namedBy: 'Juárez Valieri and colleagues',
      blurb: 'A South American duck-bill known from many individuals, showing the group reached the far south.',
      traits: ['Crestless or low-crested', 'Grinding teeth', 'Herd animal'],
      facts: ['Duck-bills were rare in South America.', 'Many individuals of all ages are known.'],
      uncertain: 'Which bones truly belong to it is debated.',
      howKnow: 'A bonebed of many individuals from Patagonia.'
    },
    {
      id: 'hadrosaurus', name: 'Hadrosaurus foulkii', common: 'Hadrosaurus',
      say: 'HAD-ruh-SOR-us', meaning: 'bulky lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 80, myaLo: 75,
      lengthM: 8, heightM: 3, weightKg: 3000, speedKmh: 24,
      region: 'North America', formation: 'Woodbury',
      named: 1858, namedBy: 'Joseph Leidy',
      blurb: 'The first fairly complete dinosaur skeleton found in North America, which proved some walked on two legs.',
      traits: ['Crestless duck-bill', 'Grinding teeth', 'Bipedal-capable'],
      facts: ['It was the first mounted dinosaur skeleton in the world.', 'It showed dinosaurs could stand on two legs.'],
      uncertain: 'Its skull is unknown, so its head is reconstructed.',
      howKnow: 'A partial skeleton from New Jersey, a milestone find.'
    },
    {
      id: 'jiangjunosaurus', name: 'Jiangjunosaurus junggarensis', common: 'Jiangjunosaurus',
      say: 'jee-AHNG-joon-uh-SOR-us', meaning: 'general lizard',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Late Jurassic', myaHi: 161, myaLo: 156,
      lengthM: 6, heightM: 2, weightKg: 2500, speedKmh: 8,
      region: 'Asia (China)', formation: 'Shishugou',
      named: 2007, namedBy: 'Jia and colleagues',
      blurb: 'A Chinese stegosaur with broad plates and unusual teeth, from the rich Junggar Basin.',
      traits: ['Broad back plates', 'Unusual teeth', 'Tail spikes'],
      facts: ['Its teeth differ from other stegosaurs.', 'It comes from the fossil-rich Junggar Basin.'],
      uncertain: 'Its exact relationships are studied.',
      howKnow: 'A skull and neck material from China.'
    },
    {
      id: 'sarcosaurus', name: 'Sarcosaurus woodi', common: 'Sarcosaurus',
      say: 'SAR-kuh-SOR-us', meaning: 'flesh lizard',
      group: 'theropod', clade: 'Coelophysoidea', diet: 'carnivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 199, myaLo: 190,
      lengthM: 3.5, heightM: 1.1, weightKg: 60, speedKmh: 35,
      region: 'Europe (England)', formation: 'Lower Lias',
      named: 1921, namedBy: 'Charles Andrews',
      blurb: 'An early English predator from just after the Triassic, helping fill the sparse Early Jurassic record.',
      traits: ['Early theropod', 'Slender build', 'Sharp teeth'],
      facts: ['Early Jurassic predators are rare, so it is valuable.', 'It lived soon after dinosaurs survived the end-Triassic.'],
      uncertain: 'It is known from limited material.',
      howKnow: 'Hip and leg bones from England.'
    },
    {
      id: 'thescelosaurus', name: 'Thescelosaurus neglectus', common: 'Thescelosaurus',
      say: 'THESS-uh-luh-SOR-us', meaning: 'wonderful lizard',
      group: 'ornithischian', clade: 'Thescelosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 68, myaLo: 66,
      lengthM: 3.5, heightM: 1, weightKg: 230, speedKmh: 30,
      region: 'North America', formation: 'Hell Creek',
      named: 1913, namedBy: 'Charles Gilmore',
      blurb: 'A stout, fast plant-eater and one of the very last small ornithischians, living right up to the asteroid impact.',
      traits: ['Heavy-set, fast build', 'Beak and grinding teeth', 'Lived alongside T. rex'],
      facts: ['A specimen nicknamed "Willo" was once claimed to preserve a fossilized heart.', 'The "heart" was later argued to be a mineral concretion, not tissue.'],
      uncertain: 'Whether "Willo" really preserves a heart is disputed; most researchers now doubt it.',
      howKnow: 'Many skeletons from the latest Cretaceous of North America.'
    },
    {
      id: 'hypsilophodon', name: 'Hypsilophodon foxii', common: 'Hypsilophodon',
      say: 'HIP-sih-LOAF-uh-don', meaning: 'high-ridged tooth',
      group: 'ornithischian', clade: 'Ornithopoda', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 126, myaLo: 125,
      lengthM: 1.8, heightM: 0.5, weightKg: 20, speedKmh: 35,
      region: 'Europe (England)', formation: 'Wessex',
      named: 1869, namedBy: 'Thomas Huxley',
      blurb: 'A small, swift plant-eater from the Isle of Wight, long used as the textbook example of a "gazelle" dinosaur.',
      traits: ['Light, speedy build', 'Beak and self-sharpening teeth', 'Long running legs'],
      facts: ['Old reconstructions wrongly showed it armored or climbing trees.', 'Better study revealed a fast ground-running plant-eater.'],
      uncertain: 'Many small ornithopods were once lumped into it; most have since been split off.',
      howKnow: 'Many skeletons from the Isle of Wight.'
    },
    {
      id: 'sauropelta', name: 'Sauropelta edwardsorum', common: 'Sauropelta',
      say: 'sor-uh-PEL-tuh', meaning: 'lizard shield',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 115, myaLo: 108,
      lengthM: 5.5, heightM: 1.5, weightKg: 1500, speedKmh: 10,
      region: 'North America', formation: 'Cloverly',
      named: 1970, namedBy: 'John Ostrom',
      blurb: 'An armored dinosaur with long forward-pointing neck spikes and a heavy, club-less tail.',
      traits: ['Long neck spikes', 'Bands of body armor', 'No tail club'],
      facts: ['Its rows of armor and spikes are among the best-known of any nodosaur.', 'Its heavy tail made up about half its length.'],
      uncertain: 'How the neck spikes were used (defense, display) is inferred from their shape.',
      howKnow: 'Good skeletons with armor from the American West.'
    },
    {
      id: 'edmontonia', name: 'Edmontonia longiceps', common: 'Edmontonia',
      say: 'ed-mon-TOH-nee-uh', meaning: 'from the Edmonton rock group',
      group: 'ornithischian', clade: 'Nodosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 76, myaLo: 69,
      lengthM: 6.5, heightM: 1.7, weightKg: 3000, speedKmh: 8,
      region: 'North America', formation: 'Horseshoe Canyon',
      named: 1928, namedBy: 'Charles M. Sternberg',
      blurb: 'A heavily armored nodosaur with large forward-pointing shoulder spikes that may have been used in contests.',
      traits: ['Big forked shoulder spikes', 'Body armor', 'No tail club'],
      facts: ['Its shoulder spikes may have been used to shove rivals.', 'It relied on armor and spikes, not a tail weapon.'],
      uncertain: 'Whether the shoulder spikes were mainly for defense or display is debated.',
      howKnow: 'Several armored skeletons from the American West and Canada.'
    },
    {
      id: 'stegoceras', name: 'Stegoceras validum', common: 'Stegoceras',
      say: 'steg-OSS-er-us', meaning: 'roof horn',
      group: 'ornithischian', clade: 'Pachycephalosauridae', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 75,
      lengthM: 2, heightM: 0.7, weightKg: 40, speedKmh: 30,
      region: 'North America', formation: 'Dinosaur Park',
      named: 1902, namedBy: 'Lawrence Lambe',
      blurb: 'A small dome-headed dinosaur known from many skulls, the best-studied of the bone-heads.',
      traits: ['Rounded skull dome', 'Two-legged build', 'Knobby skull edge'],
      facts: ['Its many domes show how the skull thickened as the animal grew.', 'It anchors much of what we know about dome-head growth.'],
      uncertain: 'Whether it head-butted, flank-butted, or just displayed is still argued.',
      howKnow: 'Dozens of skull domes from Alberta.'
    },
    {
      id: 'shantungosaurus', name: 'Shantungosaurus giganteus', common: 'Shantungosaurus',
      say: 'shan-TUNG-uh-SOR-us', meaning: 'Shandong lizard',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 77, myaLo: 70,
      lengthM: 15, heightM: 5, weightKg: 16000, speedKmh: 20,
      region: 'Asia (China)', formation: 'Wangshi',
      named: 1973, namedBy: 'Hu Chengzhi',
      blurb: 'One of the largest duck-billed dinosaurs and the biggest known non-sauropod plant-eater, with no head crest.',
      traits: ['Enormous crestless duck-bill', 'Hundreds of grinding teeth', 'Lived in herds'],
      facts: ['It rivals the largest hadrosaurs in size.', 'It is built from many individuals found in Shandong, China.'],
      uncertain: 'Its very top size is estimated by scaling composite skeletons.',
      howKnow: 'Many bones from large bonebeds in eastern China.'
    },
    {
      id: 'magnapaulia', name: 'Magnapaulia laticaudus', common: 'Magnapaulia',
      say: 'MAG-nuh-PAW-lee-uh', meaning: 'large Paul (for Paul Haaga)',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 73, myaLo: 73,
      lengthM: 12.5, heightM: 4, weightKg: 9000, speedKmh: 20,
      region: 'North America (Mexico)', formation: 'El Gallo',
      named: 2012, namedBy: 'Prieto-Márquez and colleagues',
      blurb: 'A giant crested duck-bill from Baja California, one of the largest lambeosaurs known.',
      traits: ['Tall, deep tail', 'Hollow head crest', 'Very large duck-bill'],
      facts: ['It was first named as a species of Lambeosaurus in 1981.', 'Its deep tail may have helped it swim or display.'],
      uncertain: 'The exact crest shape is reconstructed from incomplete skulls.',
      howKnow: 'Skeletons from Baja California, Mexico.'
    },
    {
      id: 'mussaurus', name: 'Mussaurus patagonicus', common: 'Mussaurus',
      say: 'moo-SOR-us', meaning: 'mouse lizard',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'herbivore',
      period: 'triassic', epoch: 'Late Triassic', myaHi: 215, myaLo: 208,
      lengthM: 6, heightM: 2, weightKg: 1000, speedKmh: 14,
      region: 'South America (Argentina)', formation: 'Laguna Colorada',
      named: 1979, namedBy: 'José Bonaparte',
      blurb: 'An early plant-eater first named from tiny hatchlings, whose babies walked on all fours but adults on two legs.',
      traits: ['Switched from four legs to two as it grew', 'Long neck', 'Nested in colonies'],
      facts: ['The "mouse lizard" name comes from its tiny baby fossils.', 'Nesting grounds show it laid eggs in groups by age.'],
      uncertain: 'How its posture shifted with growth is reconstructed from many ages of fossils.',
      howKnow: 'Eggs, hatchlings, juveniles, and adults from Patagonia.'
    },
    {
      id: 'lufengosaurus', name: 'Lufengosaurus huenei', common: 'Lufengosaurus',
      say: 'loo-FUNG-uh-SOR-us', meaning: 'Lufeng lizard',
      group: 'sauropod', clade: 'Massospondylidae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 199, myaLo: 190,
      lengthM: 6, heightM: 2, weightKg: 1700, speedKmh: 14,
      region: 'Asia (China)', formation: 'Lufeng',
      named: 1941, namedBy: 'Yang Zhongjian',
      blurb: 'An early long-necked plant-eater that was the first complete dinosaur skeleton mounted in China.',
      traits: ['Long neck and small head', 'Grasping hands with a thumb claw', 'Walked mainly on two legs'],
      facts: ['Its embryos preserve some of the oldest organic remains known in a dinosaur.', 'It featured on a 1958 Chinese postage stamp.'],
      uncertain: 'Claims of preserved proteins in its bones are checked carefully for contamination.',
      howKnow: 'Many skeletons plus embryo-bearing eggs from Yunnan, China.'
    },
    {
      id: 'yunnanosaurus', name: 'Yunnanosaurus huangi', common: 'Yunnanosaurus',
      say: 'yoo-NAN-uh-SOR-us', meaning: 'Yunnan lizard',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 195, myaLo: 185,
      lengthM: 7, heightM: 2, weightKg: 2000, speedKmh: 14,
      region: 'Asia (China)', formation: 'Lufeng',
      named: 1942, namedBy: 'Yang Zhongjian',
      blurb: 'An early plant-eater with many spoon-shaped, self-sharpening teeth, oddly like those of later sauropods.',
      traits: ['Many self-sharpening teeth', 'Long neck', 'Grasping hands'],
      facts: ['Its teeth resemble those of true sauropods, evolved separately.', 'Dozens of individuals were found together.'],
      uncertain: 'Whether its sauropod-like teeth mean a close link, or just similar diet, is studied.',
      howKnow: 'Many skeletons from Yunnan, China.'
    },
    {
      id: 'anchisaurus', name: 'Anchisaurus polyzelus', common: 'Anchisaurus',
      say: 'ANG-kih-SOR-us', meaning: 'near lizard',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'omnivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 195, myaLo: 185,
      lengthM: 2.2, heightM: 0.6, weightKg: 27, speedKmh: 16,
      region: 'North America', formation: 'Portland',
      named: 1885, namedBy: 'Othniel Charles Marsh',
      blurb: 'A small early plant-eater, among the first dinosaurs ever found in North America, dug from Connecticut Valley sandstone.',
      traits: ['Small early sauropodomorph', 'Grasping hands', 'Long neck'],
      facts: ['Its bones were found in 1818, decades before the word "dinosaur" existed.', 'It was at first mistaken for human remains.'],
      uncertain: 'Its exact diet is inferred from teeth that suit plants and maybe small animals.',
      howKnow: 'Skeletons quarried from New England sandstone.'
    },
    {
      id: 'nothronychus', name: 'Nothronychus mckinleyi', common: 'Nothronychus',
      say: 'noth-ROH-nih-kus', meaning: 'sloth-like claw',
      group: 'theropod', clade: 'Therizinosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 93, myaLo: 91,
      lengthM: 5, heightM: 3, weightKg: 1000, speedKmh: 12,
      region: 'North America', formation: 'Moreno Hill',
      named: 2001, namedBy: 'Kirkland & Wolfe',
      blurb: 'The first definite therizinosaur from North America, a pot-bellied, plant-eating theropod with long claws.',
      traits: ['Long hand claws', 'Pot belly for digesting plants', 'Leaf-shaped teeth'],
      facts: ['It showed the plant-eating therizinosaurs reached North America.', 'Its body plan looks like a giant ground sloth.'],
      uncertain: 'Its full posture is reconstructed from a partial skeleton.',
      howKnow: 'Partial skeletons from New Mexico and Utah.'
    },
    {
      id: 'erlikosaurus', name: 'Erlikosaurus andrewsi', common: 'Erlikosaurus',
      say: 'er-LIK-uh-SOR-us', meaning: 'Erlik’s lizard (a death king)',
      group: 'theropod', clade: 'Therizinosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 96, myaLo: 89,
      lengthM: 4.5, heightM: 2.5, weightKg: 500, speedKmh: 12,
      region: 'Asia (Mongolia)', formation: 'Bayan Shireh',
      named: 1980, namedBy: 'Barsbold & Perle',
      blurb: 'A plant-eating therizinosaur known from a rare, well-preserved skull that has been studied by CT scan.',
      traits: ['Toothless beak tip with leaf-shaped cheek teeth', 'Long hand claws', 'Small head'],
      facts: ['Its skull is one of the best for any therizinosaur.', 'CT scans reveal its brain and senses.'],
      uncertain: 'Much of its body is reconstructed from relatives.',
      howKnow: 'A good skull plus skeletal pieces from Mongolia.'
    },
    {
      id: 'segnosaurus', name: 'Segnosaurus galbinensis', common: 'Segnosaurus',
      say: 'SEG-nuh-SOR-us', meaning: 'slow lizard',
      group: 'theropod', clade: 'Therizinosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 96, myaLo: 89,
      lengthM: 6, heightM: 2.5, weightKg: 1300, speedKmh: 10,
      region: 'Asia (Mongolia)', formation: 'Bayan Shireh',
      named: 1979, namedBy: 'Altangerel Perle',
      blurb: 'A large therizinosaur that, for a while, gave its name to the whole odd group ("segnosaurs").',
      traits: ['Broad, four-toed feet', 'Long hand claws', 'Down-curved lower jaw'],
      facts: ['"Segnosaurs" was an early name for the therizinosaur group.', 'Its strange anatomy confused scientists for years.'],
      uncertain: 'Its exact diet is inferred from its leaf-shaped teeth and gut room.',
      howKnow: 'Jaws, limbs, and hips from Mongolia.'
    },
    {
      id: 'garudimimus', name: 'Garudimimus brevipes', common: 'Garudimimus',
      say: 'guh-ROO-dih-MIME-us', meaning: 'Garuda mimic',
      group: 'theropod', clade: 'Ornithomimosauria', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 96, myaLo: 89,
      lengthM: 3.5, heightM: 1.2, weightKg: 100, speedKmh: 45,
      region: 'Asia (Mongolia)', formation: 'Bayan Shireh',
      named: 1981, namedBy: 'Rinchen Barsbold',
      blurb: 'A primitive "ostrich mimic" that was slower and more lightly specialized than its later, faster relatives.',
      traits: ['Toothless beak', 'Shorter feet than later kin', 'Large eyes'],
      facts: ['It is named after Garuda, a bird-like being in myth.', 'It sits near the base of the ostrich-mimic family.'],
      uncertain: 'Its exact diet is inferred from its beak and build.',
      howKnow: 'A good skeleton from Mongolia.'
    },
    {
      id: 'harpymimus', name: 'Harpymimus okladnikovi', common: 'Harpymimus',
      say: 'HAR-pih-MIME-us', meaning: 'harpy mimic',
      group: 'theropod', clade: 'Ornithomimosauria', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 115, myaLo: 100,
      lengthM: 2, heightM: 0.8, weightKg: 45, speedKmh: 45,
      region: 'Asia (Mongolia)', formation: 'Khuren Dukh',
      named: 1984, namedBy: 'Barsbold & Perle',
      blurb: 'An early ostrich-mimic that still kept small teeth in its lower jaw, before the group became toothless.',
      traits: ['A few small teeth in the lower jaw', 'Long legs', 'Slender build'],
      facts: ['Most ostrich-mimics are toothless; this early one was not quite.', 'It captures a halfway stage toward the beaked forms.'],
      uncertain: 'Exactly what its few teeth were for is inferred.',
      howKnow: 'A partial skeleton from Mongolia.'
    },
    {
      id: 'beishanlong', name: 'Beishanlong grandis', common: 'Beishanlong',
      say: 'BAY-shan-long', meaning: 'Beishan dragon',
      group: 'theropod', clade: 'Ornithomimosauria', diet: 'omnivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 125, myaLo: 100,
      lengthM: 8, heightM: 3, weightKg: 600, speedKmh: 40,
      region: 'Asia (China)', formation: 'Xinminbao',
      named: 2010, namedBy: 'Makovicky and colleagues',
      blurb: 'A giant ostrich-mimic, one of the largest known, that was still growing when it died.',
      traits: ['Very large ornithomimosaur', 'Toothless beak', 'Long clawed hands'],
      facts: ['It is among the biggest "ostrich mimics" ever found.', 'Bone growth lines show it had not reached full size.'],
      uncertain: 'Its full adult size is estimated, since the known animal was not done growing.',
      howKnow: 'A partial skeleton from northwestern China.'
    },
    {
      id: 'brontomerus', name: 'Brontomerus mcintoshi', common: 'Brontomerus',
      say: 'BRON-tuh-MEER-us', meaning: 'thunder thighs',
      group: 'sauropod', clade: 'Titanosauriformes', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 110, myaLo: 108,
      lengthM: 14, heightM: 4, weightKg: 6000, speedKmh: 12,
      region: 'North America', formation: 'Cedar Mountain',
      named: 2011, namedBy: 'Taylor, Wedel & Cifelli',
      blurb: 'A sauropod nicknamed "thunder thighs" for a huge hip bone that anchored unusually powerful leg muscles.',
      traits: ['Enormous thigh-muscle attachment', 'Powerful kick (inferred)', 'Long neck'],
      facts: ['Its wide hip bone suggests strong legs, maybe for kicking predators.', 'It is known from only a few bones.'],
      uncertain: 'The "powerful kick" idea is inferred from the hip shape, not observed.',
      howKnow: 'A few bones, including a distinctive hip, from Utah.'
    },
    {
      id: 'cedarosaurus', name: 'Cedarosaurus weiskopfae', common: 'Cedarosaurus',
      say: 'SEE-dur-uh-SOR-us', meaning: 'Cedar Mountain lizard',
      group: 'sauropod', clade: 'Brachiosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 127, myaLo: 121,
      lengthM: 15, heightM: 6, weightKg: 12000, speedKmh: 12,
      region: 'North America', formation: 'Cedar Mountain',
      named: 1999, namedBy: 'Tidwell, Carpenter & Brooks',
      blurb: 'A long-necked brachiosaur from Utah found with a cluster of stomach stones it swallowed to grind food.',
      traits: ['Brachiosaur build', 'Stomach stones (gastroliths)', 'Long neck'],
      facts: ['A pile of gastroliths was found with its skeleton.', 'It shows brachiosaurs lingered into the Cretaceous of North America.'],
      uncertain: 'Whether the stones aided digestion or had another role is studied.',
      howKnow: 'A partial skeleton with gastroliths from Utah.'
    },
    {
      id: 'aquilops', name: 'Aquilops americanus', common: 'Aquilops',
      say: 'AK-wih-lops', meaning: 'eagle face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Early Cretaceous', myaHi: 108, myaLo: 104,
      lengthM: 0.6, heightM: 0.2, weightKg: 1.5, speedKmh: 25,
      region: 'North America', formation: 'Cloverly',
      named: 2014, namedBy: 'Farke and colleagues',
      blurb: 'A rabbit-sized early horned dinosaur, one of the oldest from North America, with a sharp hooked beak.',
      traits: ['Tiny body', 'Hooked, eagle-like beak', 'No horns or frill yet'],
      facts: ['It shows small horned dinosaurs crossed from Asia into North America early on.', 'Its whole skull is only about 8 cm long.'],
      uncertain: 'It is known from a single small skull, so its body is reconstructed.',
      howKnow: 'A tiny skull from Montana.'
    },
    {
      id: 'yamaceratops', name: 'Yamaceratops dorngobiensis', common: 'Yamaceratops',
      say: 'YAH-muh-SERR-uh-tops', meaning: 'Yama horned face',
      group: 'ornithischian', clade: 'Ceratopsia', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 90, myaLo: 80,
      lengthM: 1.5, heightM: 0.5, weightKg: 20, speedKmh: 25,
      region: 'Asia (Mongolia)', formation: 'Javkhlant',
      named: 2006, namedBy: 'Makovicky & Norell',
      blurb: 'A small early horned dinosaur whose simple frill suggests frills first arose for display, not defense.',
      traits: ['Small frill', 'Parrot-like beak', 'No big horns'],
      facts: ['Its modest frill points to display as the first use of frills.', 'It is named after Yama, a death deity.'],
      uncertain: 'Its age within the Late Cretaceous is debated.',
      howKnow: 'Skull material from the Gobi Desert.'
    },
    {
      id: 'loricatosaurus', name: 'Loricatosaurus priscus', common: 'Loricatosaurus',
      say: 'luh-RIK-uh-tuh-SOR-us', meaning: 'armored lizard',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 166, myaLo: 164,
      lengthM: 5, heightM: 1.8, weightKg: 2000, speedKmh: 8,
      region: 'Europe (England)', formation: 'Oxford Clay',
      named: 2008, namedBy: 'Maidment and colleagues',
      blurb: 'A Middle Jurassic plated dinosaur, an early member of the stegosaur family from European seas-edge deposits.',
      traits: ['Back plates and tail spikes', 'Possible shoulder spine', 'Heavy body'],
      facts: ['It was once lumped in with Lexovisaurus.', 'It is one of the older well-known stegosaurs.'],
      uncertain: 'Its exact plate and spike arrangement is reconstructed from scattered bones.',
      howKnow: 'Partial skeletons from England.'
    },
    {
      id: 'lexovisaurus', name: 'Lexovisaurus durobrivensis', common: 'Lexovisaurus',
      say: 'lex-OH-vih-SOR-us', meaning: 'Lexovii lizard',
      group: 'ornithischian', clade: 'Stegosauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 165, myaLo: 164,
      lengthM: 5, heightM: 1.8, weightKg: 2000, speedKmh: 8,
      region: 'Europe (England/France)', formation: 'Oxford Clay',
      named: 1957, namedBy: 'Robert Hoffstetter',
      blurb: 'One of the earliest stegosaurs from Europe, with tall plates and long shoulder or hip spines.',
      traits: ['Tall back plates', 'Long parascapular spine', 'Tail spikes'],
      facts: ['It is among the oldest stegosaurs known from Europe.', 'Some of its material is now placed in Loricatosaurus.'],
      uncertain: 'Which bones truly belong to it has been reshuffled over time.',
      howKnow: 'Plates, spines, and bones from England and France.'
    },
    {
      id: 'augustynolophus', name: 'Augustynolophus morrisi', common: 'Augustynolophus',
      say: 'aw-GUS-tin-OL-uh-fus', meaning: 'Augustyn’s crest',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 8, heightM: 3, weightKg: 3000, speedKmh: 20,
      region: 'North America (California)', formation: 'Moreno',
      named: 2014, namedBy: 'Prieto-Márquez and colleagues',
      blurb: 'A duck-billed dinosaur from California, one of very few dinosaurs known from the state, named its state dinosaur.',
      traits: ['Solid forward crest', 'Grinding tooth batteries', 'Coastal dweller'],
      facts: ['It is the official state dinosaur of California.', 'It was found in marine rocks, washed out to sea.'],
      uncertain: 'It is known from limited skull and skeletal material.',
      howKnow: 'Skull and partial skeletons from central California.'
    },
    {
      id: 'velafrons', name: 'Velafrons coahuilensis', common: 'Velafrons',
      say: 'VEL-uh-fronz', meaning: 'sailed forehead',
      group: 'ornithischian', clade: 'Hadrosauridae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 73, myaLo: 72,
      lengthM: 10, heightM: 3.5, weightKg: 4000, speedKmh: 20,
      region: 'North America (Mexico)', formation: 'Cerro del Pueblo',
      named: 2007, namedBy: 'Gates and colleagues',
      blurb: 'A crested duck-bill from Mexico, known from a large juvenile with a partly grown head crest.',
      traits: ['Rounded hollow crest', 'Grinding teeth', 'Known from a juvenile'],
      facts: ['Its name refers to the sail-like crest on its forehead.', 'It adds to a growing list of Mexican dinosaurs.'],
      uncertain: 'Adult features are estimated, since the main skeleton is young.',
      howKnow: 'A juvenile skull and skeleton from Coahuila, Mexico.'
    },
    {
      id: 'zalmoxes', name: 'Zalmoxes robustus', common: 'Zalmoxes',
      say: 'zal-MOK-seez', meaning: 'for the deity Zalmoxis',
      group: 'ornithischian', clade: 'Rhabdodontidae', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 3, heightM: 1, weightKg: 250, speedKmh: 22,
      region: 'Europe (Romania)', formation: 'Sânpetru',
      named: 2003, namedBy: 'Weishampel and colleagues',
      blurb: 'A stocky plant-eater from the dwarfed island world of Late Cretaceous Romania, with a heavy, deep jaw.',
      traits: ['Stout body', 'Deep, strong jaw', 'Island dweller'],
      facts: ['It lived on Haţeg Island, where many dinosaurs were dwarfed.', 'It is named after a god of the ancient Dacians.'],
      uncertain: 'Whether it was truly dwarfed or just naturally small is studied.',
      howKnow: 'Many bones from the Haţeg basin of Romania.'
    },
    {
      id: 'sarahsaurus', name: 'Sarahsaurus aurifontanalis', common: 'Sarahsaurus',
      say: 'SAIR-uh-SOR-us', meaning: 'Sarah’s lizard',
      group: 'sauropod', clade: 'early Sauropodomorpha', diet: 'herbivore',
      period: 'jurassic', epoch: 'Early Jurassic', myaHi: 185, myaLo: 183,
      lengthM: 4, heightM: 1.2, weightKg: 110, speedKmh: 16,
      region: 'North America', formation: 'Kayenta',
      named: 2010, namedBy: 'Rowe, Sues & Reisz',
      blurb: 'An early plant-eater that colonized North America after the end-Triassic extinction, with surprisingly strong hands.',
      traits: ['Strong, grasping hands', 'Long neck', 'Sturdy build'],
      facts: ['It shows plant-eating dinosaurs spread into North America early in the Jurassic.', 'Its powerful hands are unusual for a plant-eater.'],
      uncertain: 'What its strong hands were used for is inferred from their build.',
      howKnow: 'Good skeletons from Arizona.'
    },
    {
      id: 'stegouros', name: 'Stegouros elengassen', common: 'Stegouros',
      say: 'STEG-oo-ross', meaning: 'roofed tail',
      group: 'ornithischian', clade: 'Ankylosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 75, myaLo: 72,
      lengthM: 2, heightM: 0.7, weightKg: 150, speedKmh: 10,
      region: 'South America (Chile)', formation: 'Dorotea',
      named: 2021, namedBy: 'Soto-Acuña and colleagues',
      blurb: 'A small southern armored dinosaur with a unique flat, frond-shaped tail weapon unlike any other dinosaur.',
      traits: ['Flat, blade-edged tail weapon', 'Small body', 'Southern armored dinosaur'],
      facts: ['Its tail weapon looks like a war club edged with blades.', 'It hints at a distinct southern branch of armored dinosaurs.'],
      uncertain: 'Exactly how the strange tail was swung and used is inferred.',
      howKnow: 'A well-preserved skeleton from Chilean Patagonia.'
    },
    {
      id: 'xinjiangtitan', name: 'Xinjiangtitan shanshanesis', common: 'Xinjiangtitan',
      say: 'shin-JYANG-TIE-tan', meaning: 'Xinjiang titan',
      group: 'sauropod', clade: 'Mamenchisauridae', diet: 'herbivore',
      period: 'jurassic', epoch: 'Middle Jurassic', myaHi: 166, myaLo: 161,
      lengthM: 30, heightM: 7, weightKg: 30000, speedKmh: 12,
      region: 'Asia (China)', formation: 'Qiketai',
      named: 2013, namedBy: 'Wu and colleagues',
      blurb: 'A Chinese sauropod with one of the longest necks ever measured, a relative of Mamenchisaurus.',
      traits: ['Extremely long neck', 'Light, air-filled neck bones', 'Small head'],
      facts: ['Its complete neck is among the longest known for any animal.', 'It belongs to the long-necked mamenchisaur group.'],
      uncertain: 'Top neck-length figures depend on how the vertebrae are reconstructed.',
      howKnow: 'A skeleton with a near-complete neck from northwestern China.'
    },
    {
      id: 'rapetosaurus', name: 'Rapetosaurus krausei', common: 'Rapetosaurus',
      say: 'rah-PAY-tuh-SOR-us', meaning: 'mischievous giant lizard',
      group: 'sauropod', clade: 'Titanosauria', diet: 'herbivore',
      period: 'cretaceous', epoch: 'Late Cretaceous', myaHi: 70, myaLo: 66,
      lengthM: 15, heightM: 4, weightKg: 11000, speedKmh: 12,
      region: 'Africa (Madagascar)', formation: 'Maevarano',
      named: 2001, namedBy: 'Curry Rogers & Forster',
      blurb: 'One of the most complete titanosaurs known, including a rare skull, from the island of Madagascar.',
      traits: ['Rare titanosaur skull', 'Long neck and tail', 'Pencil-like teeth'],
      facts: ['A baby Rapetosaurus skeleton revealed how fast titanosaurs grew.', 'It is a benchmark for what titanosaur heads looked like.'],
      uncertain: 'How its growth compared across the group is still being studied.',
      howKnow: 'Skulls and skeletons of young and older animals from Madagascar.'
    }
  ];

  // ── Geologic periods ──
  var PERIODS = [
    { id: 'triassic', name: 'Triassic', myaHi: 252, myaLo: 201, climate: 'Hot and dry, with strong monsoons. One supercontinent, Pangaea.', plants: 'Ferns, cycads, and early conifers. No flowering plants yet.', sea: 'Panthalassa, a single world ocean, surrounded Pangaea.', headline: 'Dinosaurs appear, small and modest, late in the period.', dinos: ['coelophysis'] },
    { id: 'jurassic', name: 'Jurassic', myaHi: 201, myaLo: 145, climate: 'Warmer and wetter as Pangaea began to split apart.', plants: 'Lush conifer forests, ginkgoes, tree ferns, and cycads.', sea: 'New seaways opened as the Atlantic began to form.', headline: 'The age of giant sauropods and the first birds.', dinos: ['brachiosaurus', 'apatosaurus', 'diplodocus', 'stegosaurus', 'allosaurus', 'archaeopteryx', 'compsognathus'] },
    { id: 'cretaceous', name: 'Cretaceous', myaHi: 145, myaLo: 66, climate: 'Warm, with high seas and no polar ice caps for much of it.', plants: 'Flowering plants spread quickly and reshaped ecosystems.', sea: 'Shallow seas flooded the continents, including North America.', headline: 'Peak dinosaur diversity, ended by an asteroid impact.', dinos: ['tyrannosaurus', 'triceratops', 'velociraptor', 'spinosaurus', 'ankylosaurus', 'parasaurolophus', 'iguanodon', 'therizinosaurus', 'gallimimus', 'pteranodon'] },
    { id: 'paleogene', name: 'Paleogene', myaHi: 66, myaLo: 23, climate: 'Recovering after the impact; warm, then slowly cooling.', plants: 'Forests recover; grasses begin to spread later on.', sea: 'Seaways drained as continents took on modern shapes.', headline: 'Non-bird dinosaurs are gone; birds and mammals diversify.', dinos: [] }
  ];

  // ── The five great mass extinctions ──
  var EXTINCTIONS = [
    { id: 'ext_ordovician', name: 'End-Ordovician', mya: 444, pctLost: 85, cause: 'A sharp ice age followed by rapid warming, draining and refilling shallow seas.', effect: 'Wiped out much early marine life. No dinosaurs yet; life was almost entirely in the sea.', note: 'The second-largest extinction, long before any land vertebrates walked.' },
    { id: 'ext_devonian', name: 'Late Devonian', mya: 372, pctLost: 75, cause: 'A series of pulses, possibly tied to spreading land plants, low ocean oxygen, and climate swings.', effect: 'Hit reef-builders and fish hard. The first four-legged animals were just coming ashore.', note: 'A drawn-out crisis rather than a single sudden blow.' },
    { id: 'ext_permian', name: 'End-Permian ("the Great Dying")', mya: 252, pctLost: 96, cause: 'Enormous volcanic eruptions in Siberia released carbon dioxide, warming and acidifying the seas.', effect: 'The largest extinction known. The survivors went on to include the first dinosaurs’ ancestors.', note: 'About 19 of every 20 marine species disappeared. Recovery took millions of years.' },
    { id: 'ext_triassic', name: 'End-Triassic', mya: 201, pctLost: 80, cause: 'Massive volcanism as Pangaea began to split, with rapid climate and ocean chemistry change.', effect: 'Cleared out many of the dinosaurs’ rivals, opening the way for them to dominate the Jurassic.', note: 'A case where extinction helped, not hurt, the dinosaurs.' },
    { id: 'ext_kpg', name: 'End-Cretaceous (K-Pg)', mya: 66, pctLost: 76, cause: 'A roughly 10-kilometer asteroid struck near Chicxulub, Mexico; huge Deccan volcanism was also underway.', effect: 'Ended all non-bird dinosaurs, the pterosaurs, and the great marine reptiles. Birds and mammals survived.', note: 'The only mass extinction firmly tied to an asteroid impact. Birds carry the dinosaur line forward.' }
  ];

  var KPG_EVIDENCE = [
    { id: 'iridium', label: 'The iridium layer', text: 'A worldwide thin clay layer is rich in iridium, a metal rare in Earth’s crust but common in asteroids. Found by the Alvarez team in 1980.' },
    { id: 'crater', label: 'The Chicxulub crater', text: 'A buried ~180 km crater off Mexico’s Yucatán dates to exactly 66 million years ago, matching the layer.' },
    { id: 'spherules', label: 'Glass spherules and shocked quartz', text: 'Tiny melted-rock beads and quartz with shock fractures, made by an enormous impact, appear in the same layer.' },
    { id: 'soot', label: 'Soot and a dark "impact winter"', text: 'Soot and dust would have blocked sunlight for months to years, cooling the planet and collapsing food chains.' },
    { id: 'deccan', label: 'The Deccan Traps debate', text: 'Vast volcanic eruptions in India overlapped the impact. Most researchers see the asteroid as the main trigger, with volcanism as added stress.' }
  ];

  // ── The dinosaur family tree (simplified cladogram) ──
  var CLADES = [
    { id: 'dinosauria', name: 'Dinosauria', meaning: 'terrible lizards', depth: 0, blurb: 'All dinosaurs share an upright stance, with legs held under the body, and features inherited from one common ancestor.', examples: [] },
    { id: 'saurischia', name: 'Saurischia', meaning: 'lizard-hipped', depth: 1, blurb: 'One of the two great branches. Despite the name, it includes the meat-eaters, the long-necks, and birds.', examples: [] },
    { id: 'theropoda', name: 'Theropoda', meaning: 'beast feet', depth: 2, blurb: 'Mostly meat-eaters that walked on two legs. Birds are living theropods. A few switched to plants.', examples: ['tyrannosaurus', 'velociraptor', 'allosaurus', 'spinosaurus', 'archaeopteryx'] },
    { id: 'sauropodomorpha', name: 'Sauropodomorpha', meaning: 'lizard-foot forms', depth: 2, blurb: 'The long-necked plant-eaters, including the largest land animals ever, and their smaller early relatives.', examples: ['brachiosaurus', 'diplodocus', 'apatosaurus'] },
    { id: 'ornithischia', name: 'Ornithischia', meaning: 'bird-hipped', depth: 1, blurb: 'The other great branch: plant-eaters with a backward-pointing hip bone. Includes armored, horned, and duck-billed dinosaurs.', examples: [] },
    { id: 'thyreophora', name: 'Thyreophora', meaning: 'shield bearers', depth: 2, blurb: 'The armored dinosaurs: the plated stegosaurs and the tank-like ankylosaurs.', examples: ['stegosaurus', 'ankylosaurus'] },
    { id: 'ornithopoda', name: 'Ornithopoda', meaning: 'bird feet', depth: 2, blurb: 'Two- and four-legged plant-eaters, including the iguanodonts and the duck-billed hadrosaurs.', examples: ['iguanodon', 'parasaurolophus'] },
    { id: 'marginocephalia', name: 'Marginocephalia', meaning: 'fringed heads', depth: 2, blurb: 'Dinosaurs with a bony shelf or dome at the back of the skull: horned ceratopsians and thick-headed pachycephalosaurs.', examples: ['triceratops'] }
  ];

  // ── How we know: the evidence paleontologists read ──
  var ANATOMY = [
    { id: 'bones', icon: '🦴', name: 'Bones', what: 'Fossilized bone, where minerals replaced the original over time.', tells: 'Size, posture, age, injuries, and how an animal moved. Growth rings inside bones reveal how fast it grew and how old it was.' },
    { id: 'teeth', icon: '🦷', name: 'Teeth', what: 'The hardest, most common fossils, often found even when bones are not.', tells: 'Diet. Bladed serrated teeth slice meat; flat teeth grind plants; cone teeth grab fish.' },
    { id: 'tracks', icon: '👣', name: 'Trackways', what: 'Fossil footprints pressed into mud that later hardened.', tells: 'Behavior frozen in time: speed from stride length, group movement, and posture. Tracks record what the animal did.' },
    { id: 'eggs', icon: '🥚', name: 'Eggs and nests', what: 'Fossil eggs, sometimes with embryos, and the nests they were laid in.', tells: 'How dinosaurs reproduced and cared for young. Nesting colonies show parental care.' },
    { id: 'skin', icon: '🪶', name: 'Skin and feathers', what: 'Rare impressions of scales, skin, or feathers in fine-grained rock.', tells: 'Body covering and even color, when fossil pigment structures (melanosomes) survive.' },
    { id: 'coprolites', icon: '💩', name: 'Coprolites', what: 'Fossilized dung.', tells: 'What an animal actually ate. Crushed bone, plant fibers, or fish scales inside reveal real meals.' },
    { id: 'gastroliths', icon: '🪨', name: 'Gastroliths', what: 'Smooth stones swallowed to help grind food in the gut.', tells: 'Digestion strategy. Found with some plant-eaters and birds.' },
    { id: 'softtissue', icon: '🔬', name: 'Soft tissue and chemistry', what: 'Very rare traces of original proteins, blood-vessel shapes, or pigments.', tells: 'Fine biological detail and links to living animals. These finds are carefully checked because contamination is easy.' }
  ];

  // ── Common myths, corrected ──
  var MYTHS = [
    { id: 'all_died', myth: 'All the dinosaurs died out.', reality: 'Birds are dinosaurs. One branch of small feathered theropods survived the K-Pg extinction.', why: 'There are more than 10,000 living bird species. The group lives on every time a sparrow lands on your windowsill.' },
    { id: 'tails', myth: 'Dinosaurs dragged their tails on the ground.', reality: 'Most held their tails off the ground, stiff and level, as a counterbalance.', why: 'Trackways almost never show tail drag marks, and tail bones often had stiffening rods.' },
    { id: 'bronto', myth: 'Brontosaurus was never real, just a mistake.', reality: 'The name has a tangled history, but a 2015 study argued Brontosaurus is a valid genus again.', why: 'It was folded into Apatosaurus in 1903 and revived in 2015. Science can change its mind with new evidence.' },
    { id: 'pterosaurs', myth: 'Pterosaurs, plesiosaurs, and mosasaurs were dinosaurs.', reality: 'None of them were dinosaurs. They were other reptile groups living at the same time.', why: '"Lived with dinosaurs" is not the same as "was a dinosaur".' },
    { id: 'sluggish', myth: 'Dinosaurs were slow, cold-blooded, and dim.', reality: 'Many were active and fast, and their metabolisms varied. Several had large brains for their size.', why: 'Bone structure, growth rates, and posture suggest many dinosaurs ran warm and lived fast.' },
    { id: 'trex_vision', myth: 'T. rex could not see you if you stood still.', reality: 'T. rex likely had excellent vision, including good depth perception.', why: 'Its forward-facing eyes gave overlapping fields of view. The "stand still" idea is a movie plot device.' },
    { id: 'dilo', myth: 'Dilophosaurus had a neck frill and spat venom.', reality: 'There is no fossil evidence for either. Both were invented for Jurassic Park.', why: 'The real Dilophosaurus was also much larger than the film’s small "spitter".' },
    { id: 'humans', myth: 'Early humans lived alongside (non-bird) dinosaurs.', reality: 'The non-bird dinosaurs died out about 66 million years before humans appeared.', why: 'Our species is only a few hundred thousand years old. Cave-people-versus-dinosaurs is pure cartoon.' },
    { id: 'raptor_size', myth: 'Velociraptor was a big, scaly, man-sized hunter.', reality: 'The real Velociraptor was about the size of a turkey and covered in feathers.', why: 'The movie "raptors" were really sized after Deinonychus, and still left off the feathers.' },
    { id: 'biggest', myth: 'T. rex was the biggest dinosaur.', reality: 'T. rex was a giant predator, but the largest dinosaurs were long-necked sauropods many times heavier.', why: 'Titanosaurs like Argentinosaurus may have weighed ten times as much as T. rex.' },
    { id: 'all_together', myth: 'All the famous dinosaurs lived at the same time.', reality: 'They are spread across more than 150 million years. Many never met.', why: 'Stegosaurus is closer in time to us than to T. rex.' },
    { id: 'all_giant', myth: 'All dinosaurs were huge.', reality: 'Dinosaurs came in every size, from chicken-sized hunters to the largest land animals ever.', why: 'Microraptor was crow-sized. Giants get the spotlight, but small dinosaurs were everywhere.' }
  ];

  // ── Quiz bank ──
  var QUIZ = [
    { id: 'q1', q: 'Which living animals are dinosaurs?', options: ['Crocodiles', 'Birds', 'Lizards', 'None, they all died out'], answer: 1, explain: 'Birds are living theropod dinosaurs, the branch that survived the K-Pg extinction.' },
    { id: 'q2', q: 'What likely caused the end-Cretaceous extinction 66 million years ago?', options: ['An ice age', 'A giant asteroid impact (plus volcanism)', 'A disease', 'Running out of plants'], answer: 1, explain: 'A roughly 10 km asteroid struck near Chicxulub, Mexico. Huge Deccan volcanism added stress.' },
    { id: 'q3', q: 'Which "dinosaur" was NOT actually a dinosaur?', options: ['Triceratops', 'Stegosaurus', 'Pteranodon', 'Velociraptor'], answer: 2, explain: 'Pteranodon was a flying pterosaur, a close cousin but not a dinosaur.' },
    { id: 'q4', q: 'How big was the real Velociraptor?', options: ['About the size of a turkey', 'As tall as a person', 'Bigger than a horse', 'As big as a bus'], answer: 0, explain: 'Velociraptor was turkey-sized and feathered. The movie version was based on the larger Deinonychus.' },
    { id: 'q5', q: 'Which group includes the long-necked giants?', options: ['Theropoda', 'Sauropodomorpha', 'Ornithopoda', 'Ceratopsia'], answer: 1, explain: 'Sauropodomorphs are the long-necked plant-eaters, including the largest land animals ever.' },
    { id: 'q6', q: 'What does fossil dung (a coprolite) tell scientists?', options: ['The animal’s color', 'What it actually ate', 'How fast it ran', 'Its exact age'], answer: 1, explain: 'Coprolites can contain crushed bone, plant fibers, or fish scales, showing real meals.' },
    { id: 'q7', q: 'Stegosaurus lived closer in time to which?', options: ['T. rex', 'Us, today', 'Both are equally distant', 'It lived with T. rex'], answer: 1, explain: 'Stegosaurus (Late Jurassic) is closer in time to humans than to T. rex (Late Cretaceous).' },
    { id: 'q8', q: 'The "thagomizer" is a nickname for which body part?', options: ['A neck frill', 'Stegosaurus tail spikes', 'A head crest', 'A thumb claw'], answer: 1, explain: 'The thagomizer is the spiked tail tip of Stegosaurus, a defensive weapon.' },
    { id: 'q9', q: 'Which evidence first pointed to an asteroid at the K-Pg boundary?', options: ['A worldwide iridium-rich clay layer', 'Cave paintings', 'Dinosaur eggs', 'Tree rings'], answer: 0, explain: 'The Alvarez team found a global iridium layer in 1980; iridium is common in asteroids.' },
    { id: 'q10', q: 'Why was Oviraptor (the "egg thief") unfairly named?', options: ['It did not eat eggs at all', 'It was found protecting its own eggs, not stealing them', 'It had no mouth', 'It was a plant'], answer: 1, explain: 'The first specimen lay on a nest of its own eggs, once wrongly thought to belong to Protoceratops.' },
    { id: 'q11', q: 'Which feature do all dinosaurs share?', options: ['Wings', 'Legs held upright under the body', 'Feathers', 'A tail club'], answer: 1, explain: 'An upright stance, with legs under the body rather than sprawling, is a key dinosaur trait.' },
    { id: 'q12', q: 'How do scientists sometimes learn a dinosaur’s color?', options: ['They cannot, ever', 'From fossil pigment structures (melanosomes)', 'From old paintings', 'By guessing from the bones'], answer: 1, explain: 'Fossil melanosomes can be compared to those in living birds to reconstruct color.' },
    { id: 'q13', q: 'Which was the longest known predatory dinosaur?', options: ['Tyrannosaurus', 'Spinosaurus', 'Velociraptor', 'Allosaurus'], answer: 1, explain: 'Spinosaurus is the longest known predatory dinosaur, and likely semi-aquatic.' },
    { id: 'q14', q: 'What were trackways especially good at showing?', options: ['Behavior, like speed and group movement', 'Exact color', 'Brain size', 'Diet'], answer: 0, explain: 'Trackways record what an animal did: how fast it moved, and whether it traveled in groups.' },
    { id: 'q15', q: 'Birds belong to which dinosaur group?', options: ['Sauropods', 'Theropods', 'Ceratopsians', 'Stegosaurs'], answer: 1, explain: 'Birds evolved from small feathered theropods, the same branch as Velociraptor and T. rex.' },
    { id: 'q16', q: 'During which period did dinosaurs first appear?', options: ['Triassic', 'Jurassic', 'Cretaceous', 'Paleogene'], answer: 0, explain: 'Dinosaurs first appear in the Late Triassic, small and modest at first.' },
    { id: 'q17', q: 'Which extinction is nicknamed "the Great Dying"?', options: ['End-Ordovician', 'End-Permian', 'End-Triassic', 'End-Cretaceous'], answer: 1, explain: 'The end-Permian extinction killed about 96 percent of marine species, the worst known.' },
    { id: 'q18', q: 'Why did the end-Triassic extinction matter for dinosaurs?', options: ['It killed all dinosaurs', 'It cleared out many rivals, letting dinosaurs dominate', 'It had no effect', 'It created the first birds'], answer: 1, explain: 'By removing competitors, the end-Triassic extinction opened the way for the dinosaurs’ rise.' },
    { id: 'q19', q: 'What is a gastrolith?', options: ['A type of egg', 'A stomach stone swallowed to grind food', 'A tail bone', 'A kind of tooth'], answer: 1, explain: 'Gastroliths are smooth swallowed stones that helped grind food in the gut.' },
    { id: 'q20', q: 'Which is true about T. rex’s vision?', options: ['It was blind', 'It likely had sharp vision with good depth perception', 'It could only see at night', 'It could not see still objects'], answer: 1, explain: 'Forward-facing eyes gave T. rex overlapping fields of view and good depth perception.' },
    { id: 'q21', q: 'The two main branches of dinosaurs are named for the shape of their...', options: ['Teeth', 'Hips', 'Feet', 'Skulls'], answer: 1, explain: 'Saurischia ("lizard-hipped") and Ornithischia ("bird-hipped") are defined by hip bone arrangement.' },
    { id: 'q22', q: 'Which dinosaur is famous for nesting colonies showing parental care?', options: ['Maiasaura', 'Giganotosaurus', 'Diplodocus', 'Ankylosaurus'], answer: 0, explain: 'Maiasaura ("good mother lizard") is known from nesting grounds with eggs, embryos, and babies.' },
    { id: 'q23', q: 'How long ago did the last non-bird dinosaurs live?', options: ['About 1 million years ago', 'About 66 million years ago', 'About 10,000 years ago', 'About 500 years ago'], answer: 1, explain: 'The non-bird dinosaurs died out about 66 million years ago, long before humans.' },
    { id: 'q24', q: 'Which statement about dinosaur size is correct?', options: ['All dinosaurs were huge', 'Dinosaurs ranged from crow-sized to the largest land animals ever', 'All dinosaurs were small', 'They were all the same size'], answer: 1, explain: 'Dinosaurs spanned a huge size range, from tiny Microraptor to titanosaur giants.' },
    { id: 'q25', q: 'What does the iridium layer suggest about its source?', options: ['A volcano on the Moon', 'An extraterrestrial impact', 'Ancient farming', 'A flood'], answer: 1, explain: 'Iridium is rare in Earth’s crust but common in asteroids, pointing to an impact source.' },
    { id: 'q26', q: 'Which dinosaur’s hollow head crest may have worked like a trumpet?', options: ['Parasaurolophus', 'Triceratops', 'Stegosaurus', 'Spinosaurus'], answer: 0, explain: 'Air passages loop through Parasaurolophus’s crest, so its likely call can be modeled with CT scans.' },
    { id: 'q27', q: 'Therizinosaurus is unusual because it was a theropod that...', options: ['Could fly', 'Ate plants', 'Lived underwater', 'Had no legs'], answer: 1, explain: 'Though theropods are the meat-eater group, Therizinosaurus ate plants and had meter-long claws.' },
    { id: 'q28', q: 'Why is Dimetrodon NOT a dinosaur?', options: ['It is too small', 'It lived before dinosaurs and is closer to mammals', 'It had no sail', 'It could fly'], answer: 1, explain: 'Dimetrodon is a Permian synapsid, on the line toward mammals, and died out before dinosaurs appeared.' },
    { id: 'q29', q: 'Which group were the long-necked giants?', options: ['Sauropods', 'Raptors', 'Ceratopsians', 'Pachycephalosaurs'], answer: 0, explain: 'Sauropods, like Brachiosaurus, were the long-necked plant-eating giants.' },
    { id: 'q30', q: 'What is a cladogram?', options: ['A type of fossil', 'A branching diagram of how species are related', 'A digging tool', 'A geologic period'], answer: 1, explain: 'A cladogram is a tree-like diagram showing how organisms share common ancestors.' },
    { id: 'q31', q: 'The Morrison Formation is famous for dinosaurs from which period?', options: ['Triassic', 'Late Jurassic', 'Late Cretaceous', 'Paleogene'], answer: 1, explain: 'The Morrison Formation preserves Late Jurassic giants like Allosaurus and Stegosaurus.' },
    { id: 'q32', q: 'Which is the best evidence that some dinosaurs cared for their young?', options: ['Big teeth', 'Nesting colonies with eggs and babies', 'Long necks', 'Tail clubs'], answer: 1, explain: 'Maiasaura nesting grounds with eggs, embryos, and hatchlings show parental care.' },
    { id: 'q33', q: 'What does it mean that the fossil record is "incomplete"?', options: ['Scientists are careless', 'Only a tiny fraction of past life ever fossilized', 'All fossils are fakes', 'Nothing fossilized at all'], answer: 1, explain: 'Fossilization is rare, so we only ever see a small, lucky sample of ancient life.' },
    { id: 'q34', q: 'Which dinosaur had a sail and likely ate fish?', options: ['Spinosaurus', 'Triceratops', 'Ankylosaurus', 'Stegosaurus'], answer: 0, explain: 'Spinosaurus had a tall sail and a crocodile-like snout suited to a fish-heavy life.' }
  ];

  // ── Paleontology glossary ──
  var GLOSSARY = [
    { term: 'Paleontology', def: 'The science that studies ancient life through fossils.' },
    { term: 'Fossil', def: 'Any preserved trace of ancient life: bones, teeth, footprints, eggs, dung, or impressions.' },
    { term: 'Dinosaur', def: 'A member of Dinosauria: land reptiles with an upright stance, from one common ancestor. Birds are living dinosaurs.' },
    { term: 'Theropod', def: 'A mostly meat-eating, two-legged dinosaur group that includes T. rex, raptors, and all birds.' },
    { term: 'Sauropod', def: 'A long-necked, four-legged plant-eating dinosaur, including the largest land animals ever.' },
    { term: 'Ornithischian', def: 'A "bird-hipped" plant-eating dinosaur, such as Triceratops, Stegosaurus, and the duck-bills.' },
    { term: 'Saurischian', def: 'A "lizard-hipped" dinosaur. This branch includes the meat-eaters, the long-necks, and birds.' },
    { term: 'Mesozoic', def: 'The "age of dinosaurs", made of the Triassic, Jurassic, and Cretaceous periods.' },
    { term: 'Triassic', def: 'The first period of the Mesozoic, when dinosaurs first appeared, small and modest.' },
    { term: 'Jurassic', def: 'The middle Mesozoic period, the age of giant sauropods and the first birds.' },
    { term: 'Cretaceous', def: 'The last Mesozoic period, with peak dinosaur diversity, ended by an asteroid impact.' },
    { term: 'Extinction', def: 'The permanent disappearance of a species or group from the planet.' },
    { term: 'Mass extinction', def: 'A short interval when a large fraction of species die out worldwide.' },
    { term: 'K-Pg boundary', def: 'The Cretaceous-Paleogene boundary, 66 million years ago, marking the asteroid impact.' },
    { term: 'Iridium', def: 'A metal rare in Earth’s crust but common in asteroids. A worldwide iridium layer points to the K-Pg impact.' },
    { term: 'Chicxulub', def: 'The buried crater off Mexico left by the asteroid that helped end the dinosaur age.' },
    { term: 'Cladogram', def: 'A branching diagram showing how organisms are related through shared ancestors.' },
    { term: 'Clade', def: 'A group made of an ancestor and all of its descendants.' },
    { term: 'Genus', def: 'A group of closely related species. "Tyrannosaurus" is a genus; "rex" names the species.' },
    { term: 'Species', def: 'A specific kind of organism. The second word in a scientific name, as in Tyrannosaurus rex.' },
    { term: 'Binomial', def: 'The two-part scientific name of a species, genus plus species.' },
    { term: 'Formation', def: 'A named body of rock laid down in one setting and time, like Hell Creek or Morrison.' },
    { term: 'Bonebed', def: 'A rock layer packed with the bones of many individuals, often hinting at herds or mass deaths.' },
    { term: 'Trackway', def: 'A series of fossil footprints that records how an animal moved.' },
    { term: 'Coprolite', def: 'Fossilized dung, which can reveal what an animal actually ate.' },
    { term: 'Gastrolith', def: 'A stone swallowed to help grind food in the stomach.' },
    { term: 'Osteoderm', def: 'A bony plate set in the skin, forming the armor of dinosaurs like Ankylosaurus.' },
    { term: 'Thagomizer', def: 'The nickname for the spiked tail tip of Stegosaurus and its relatives.' },
    { term: 'Frill', def: 'The bony shelf at the back of a horned dinosaur’s skull, used for display and defense.' },
    { term: 'Sail', def: 'A tall skin-covered structure on the back, held up by long spines, as in Spinosaurus.' },
    { term: 'Crest', def: 'A bony ridge or hollow structure on the head, used for display or sound.' },
    { term: 'Carnivore', def: 'An animal that eats mostly meat.' },
    { term: 'Herbivore', def: 'An animal that eats mostly plants.' },
    { term: 'Omnivore', def: 'An animal that eats both plants and animals.' },
    { term: 'Piscivore', def: 'An animal that eats mostly fish.' },
    { term: 'Quadruped', def: 'An animal that walks on four legs.' },
    { term: 'Biped', def: 'An animal that walks on two legs.' },
    { term: 'Melanosome', def: 'A tiny structure that holds pigment. Fossil melanosomes can reveal a dinosaur’s color.' },
    { term: 'Convergent evolution', def: 'When unrelated animals evolve similar features, like wings in birds, bats, and pterosaurs.' },
    { term: 'Pterosaur', def: 'A flying reptile of the dinosaur age. A close cousin of dinosaurs, but not a dinosaur.' },
    { term: 'Synapsid', def: 'A member of the line that leads to mammals. Dimetrodon was a synapsid, not a dinosaur.' },
    { term: 'Theory', def: 'In science, a well-tested explanation supported by lots of evidence, not just a guess.' },
    { term: 'Hypothesis', def: 'A testable idea that can be supported or rejected by evidence.' },
    { term: 'Index fossil', def: 'A common, short-lived, widespread fossil used to date the rock layer it sits in.' },
    { term: 'Stratigraphy', def: 'The study of rock layers and the order in which they formed.' },
    { term: 'Radiometric dating', def: 'Using the steady decay of radioactive atoms in rock to measure its age.' },
    { term: 'Mya', def: 'Short for "million years ago", the usual unit for deep time.' },
    { term: 'Taphonomy', def: 'The study of how organisms decay and become fossils, the story between death and discovery.' },
    { term: 'Holotype', def: 'The single specimen that officially defines a species when it is named.' },
    { term: 'Avialae', def: 'The branch of theropods that includes birds and their closest extinct relatives.' }
  ];

  // ── Famous fossil sites and rock units ──
  var SITES = [
    { id: 'hellcreek', name: 'Hell Creek Formation', where: 'USA (Montana, Dakotas)', when: 'latest Cretaceous, ~68 to 66 mya', famous: 'T. rex, Triceratops, Ankylosaurus, Edmontosaurus', note: 'A window onto the very last days of the non-bird dinosaurs, right up to the K-Pg layer.' },
    { id: 'morrison', name: 'Morrison Formation', where: 'USA (western states)', when: 'Late Jurassic, ~155 to 145 mya', famous: 'Allosaurus, Stegosaurus, Brachiosaurus, Diplodocus', note: 'The classic American "dinosaur graveyard" of the Jurassic giants.' },
    { id: 'dinopark', name: 'Dinosaur Park Formation', where: 'Canada (Alberta)', when: 'Late Cretaceous, ~77 to 75 mya', famous: 'Gorgosaurus, Centrosaurus, Corythosaurus, Styracosaurus', note: 'One of the richest dinosaur fossil areas in the world.' },
    { id: 'yixian', name: 'Yixian Formation (Jehol)', where: 'China (Liaoning)', when: 'Early Cretaceous, ~125 mya', famous: 'Sinosauropteryx, Microraptor, Yutyrannus, Psittacosaurus', note: 'Fine volcanic ash preserved feathers and even color. It transformed how we see dinosaurs.' },
    { id: 'nemegt', name: 'Nemegt Formation', where: 'Mongolia (Gobi Desert)', when: 'Late Cretaceous, ~71 to 69 mya', famous: 'Tarbosaurus, Deinocheirus, Gallimimus, Therizinosaurus', note: 'A river-and-floodplain world that preserved many strange Asian dinosaurs.' },
    { id: 'djadochta', name: 'Djadochta Formation', where: 'Mongolia (Gobi Desert)', when: 'Late Cretaceous, ~75 to 71 mya', famous: 'Velociraptor, Protoceratops, Oviraptor, Citipati', note: 'An ancient desert that froze behavior in time, including the Fighting Dinosaurs.' },
    { id: 'solnhofen', name: 'Solnhofen Limestone', where: 'Germany (Bavaria)', when: 'Late Jurassic, ~150 mya', famous: 'Archaeopteryx, Compsognathus', note: 'A still lagoon whose fine limestone preserved feathers in stunning detail.' },
    { id: 'kemkem', name: 'Kem Kem Beds', where: 'Morocco (Sahara)', when: 'mid-Cretaceous, ~99 mya', famous: 'Spinosaurus, Carcharodontosaurus, Suchomimus', note: 'A river system that somehow supported several giant predators at once.' },
    { id: 'ischigualasto', name: 'Ischigualasto Formation', where: 'Argentina', when: 'Late Triassic, ~231 mya', famous: 'Herrerasaurus, Eoraptor', note: 'The "Valley of the Moon", recording the dawn of the dinosaurs.' },
    { id: 'tendaguru', name: 'Tendaguru Beds', where: 'Tanzania', when: 'Late Jurassic, ~152 mya', famous: 'Giraffatitan, Kentrosaurus', note: 'An African match to the Morrison, excavated in huge early expeditions.' },
    { id: 'twomedicine', name: 'Two Medicine Formation', where: 'USA (Montana)', when: 'Late Cretaceous, ~77 mya', famous: 'Maiasaura, Daspletosaurus, Einiosaurus', note: 'Egg Mountain here proved dinosaurs nested in colonies and cared for young.' },
    { id: 'kaiparowits', name: 'Kaiparowits Formation', where: 'USA (Utah)', when: 'Late Cretaceous, ~76 to 74 mya', famous: 'Kosmoceratops, Nasutoceratops', note: 'A remote site revealing the lost southern world of the continent Laramidia.' }
  ];

  // ── Record holders and superlatives ──
  var RECORDS = [
    { id: 'longest_pred', title: 'Longest predator', holder: 'Spinosaurus', detail: 'About 15 meters long, the longest known meat-eating dinosaur.' },
    { id: 'heaviest', title: 'Heaviest dinosaur', holder: 'Argentinosaurus', detail: 'A titanosaur estimated near 70 tonnes or more, among the largest land animals ever.' },
    { id: 'longest', title: 'Longest dinosaur', holder: 'Supersaurus', detail: 'A diplodocid that may have stretched past 30 meters from nose to tail.' },
    { id: 'longest_neck', title: 'Longest neck', holder: 'Mamenchisaurus', detail: 'Some neck estimates reach about 15 meters, the longest of any animal.' },
    { id: 'biggest_claw', title: 'Longest claws', holder: 'Therizinosaurus', detail: 'Hand claws up to about a meter long, the longest of any known animal.' },
    { id: 'smallest', title: 'Smallest (non-bird)', holder: 'Microraptor and kin', detail: 'Crow-sized four-winged gliders, among the smallest non-bird dinosaurs.' },
    { id: 'biggest_bite', title: 'Strongest bite', holder: 'Tyrannosaurus', detail: 'A bite force estimated near 35,000 newtons, the strongest of any known land animal.' },
    { id: 'biggest_brain', title: 'Biggest brain for its size', holder: 'Troodon and small raptors', detail: 'Some of the highest brain-to-body ratios among dinosaurs.' },
    { id: 'first_named', title: 'First dinosaur named', holder: 'Megalosaurus', detail: 'Named in 1824, before the word "dinosaur" was coined in 1842.' },
    { id: 'first_color', title: 'First color mapped', holder: 'Sinosauropteryx', detail: 'The first dinosaur whose color, a ginger-and-white tail, was worked out from fossils.' },
    { id: 'best_preserved', title: 'Best soft-tissue preservation', holder: 'Scipionyx', detail: 'A baby with preserved internal organs, down to the intestines.' },
    { id: 'biggest_hadrosaur', title: 'Largest duck-bill', holder: 'Shantungosaurus', detail: 'A crestless hadrosaur up to about 15 meters long.' }
  ];

  // ── Key figures in the science ──
  var PEOPLE = [
    { id: 'mantell', name: 'Gideon Mantell', years: '1790 to 1852', did: 'Named Iguanodon in 1825, one of the first dinosaurs recognized.' },
    { id: 'buckland', name: 'William Buckland', years: '1784 to 1856', did: 'Named Megalosaurus in 1824, the first dinosaur to be scientifically described.' },
    { id: 'owen', name: 'Richard Owen', years: '1804 to 1892', did: 'Coined the word "Dinosauria" in 1842 and helped found London’s Natural History Museum.' },
    { id: 'anning', name: 'Mary Anning', years: '1799 to 1847', did: 'A pioneering fossil hunter whose marine reptile finds shaped early paleontology, long underrecognized.' },
    { id: 'cope_marsh', name: 'Cope and Marsh', years: '1800s', did: 'Rivals whose "Bone Wars" named dozens of dinosaurs, with both great discoveries and reckless mistakes.' },
    { id: 'brown', name: 'Barnum Brown', years: '1873 to 1963', did: 'Discovered the first Tyrannosaurus rex and many other famous dinosaurs.' },
    { id: 'ostrom', name: 'John Ostrom', years: '1928 to 2005', did: 'Studied Deinonychus and revived the idea that birds are living dinosaurs.' },
    { id: 'horner', name: 'Jack Horner', years: 'born 1946', did: 'Found Maiasaura nesting grounds, transforming ideas about dinosaur parenting.' },
    { id: 'alvarez', name: 'Luis and Walter Alvarez', years: '1980', did: 'Proposed the asteroid-impact cause of the K-Pg extinction, backed by the iridium layer.' },
    { id: 'sereno', name: 'Paul Sereno', years: 'born 1957', did: 'Named many dinosaurs across Africa and South America, including Nigersaurus and Suchomimus.' },
    { id: 'xu', name: 'Xu Xing', years: 'born 1969', did: 'Named more dinosaurs than almost anyone, many of them feathered, from China.' }
  ];

  // ── Helpers ──
  function byId(id) { for (var i = 0; i < DINOS.length; i++) { if (DINOS[i].id === id) return DINOS[i]; } return null; }
  function periodOf(id) { for (var i = 0; i < PERIODS.length; i++) { if (PERIODS[i].id === id) return PERIODS[i]; } return null; }
  function periodName(id) { var p = periodOf(id); if (p) return p.name; return id ? id.charAt(0).toUpperCase() + id.slice(1) : id; }
  function pColor(id) { return PERIOD_COLOR[id] || '#64748b'; }
  function dColor(id) { return DIET_COLOR[id] || '#64748b'; }
  function reconstructionProfileFor(dn) {
    var clade = String((dn && dn.clade) || '');
    var profile = { label: 'General clade proportions', stance: 1, shoulder: 1, neck: 1, tail: 1, bodyHeight: 1, bodyDepth: 1, head: 1 };
    if (/Brachiosaur/i.test(clade)) profile = { label: 'High-browsing brachiosaur', stance: 1, shoulder: 1.12, neck: 1.06, tail: 0.96, bodyHeight: 1.02, bodyDepth: 1.04, head: 0.92 };
    else if (/Diplodoc/i.test(clade)) profile = { label: 'Long, low-backed diplodocid', stance: 0.98, shoulder: 0.94, neck: 0.96, tail: 1.08, bodyHeight: 0.88, bodyDepth: 0.90, head: 0.84 };
    else if (/Titanosaur/i.test(clade)) profile = { label: 'Broad-bodied titanosaur', stance: 1.02, shoulder: 1.02, neck: 1.01, tail: 1, bodyHeight: 1.08, bodyDepth: 1.16, head: 0.90 };
    else if (/Tyrannosaur|Abelisaur/i.test(clade)) profile = { label: 'Deep-skulled large theropod', stance: 1, shoulder: 1.01, neck: 1.01, tail: 1.04, bodyHeight: 1.04, bodyDepth: 1.10, head: 1.16 };
    else if (/Dromaeosaur|Troodont/i.test(clade)) profile = { label: 'Slender feathered hunter', stance: 1.04, shoulder: 1.02, neck: 1.02, tail: 1.08, bodyHeight: 0.86, bodyDepth: 0.82, head: 0.92 };
    else if (/Spinosaur/i.test(clade)) profile = { label: 'Long-snouted sail-backed theropod', stance: 0.96, shoulder: 1, neck: 1.02, tail: 0.96, bodyHeight: 0.96, bodyDepth: 0.92, head: 1.10 };
    else if (/Ceratops/i.test(clade)) profile = { label: 'Horned, weight-bearing quadruped', stance: 0.92, shoulder: 1, neck: 0.94, tail: 0.92, bodyHeight: 1.08, bodyDepth: 1.14, head: 1.22 };
    else if (/Ankylosaur/i.test(clade)) profile = { label: 'Low, broad armored herbivore', stance: 0.82, shoulder: 1, neck: 0.96, tail: 0.90, bodyHeight: 0.88, bodyDepth: 1.28, head: 0.88 };
    else if (/Stegosaur/i.test(clade)) profile = { label: 'Plated, high-backed herbivore', stance: 0.90, shoulder: 0.92, neck: 0.92, tail: 0.94, bodyHeight: 1.10, bodyDepth: 1.08, head: 0.82 };
    else if (/Hadrosaur|Lambeosaur|Iguanodont/i.test(clade)) profile = { label: 'Deep-bodied facultative quadruped', stance: 0.96, shoulder: 0.98, neck: 1, tail: 1.02, bodyHeight: 1.08, bodyDepth: 1.12, head: 1.02 };
    var evidence = String((dn && dn.howKnow) || '').toLowerCase();
    if (/partial|handful|fragment|single |few |known from just|scaled from|incomplete/.test(evidence)) {
      profile.coverage = 'limited';
      profile.coverageNote = 'Limited fossil coverage; relatives and scaling contribute more to the silhouette.';
    } else if (/abundant|hundreds|dozens|many skeletons|multiple skeletons|several good|complete skeleton/.test(evidence)) {
      profile.coverage = 'strong';
      profile.coverageNote = 'Strong fossil coverage for the main skeletal proportions.';
    } else {
      profile.coverage = 'moderate';
      profile.coverageNote = 'Moderate fossil coverage; some proportions remain comparative.';
    }
    return profile;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function continentOf(region) { var i = region.indexOf(' ('); return i === -1 ? region : region.slice(0, i); }
  function fmtLength(m) { if (m == null) return '?'; if (m < 1) return Math.round(m * 100) + ' cm'; return (Math.round(m * 10) / 10) + ' m'; }
  function fmtWeight(kg) { if (kg == null) return '?'; if (kg >= 1000) return (Math.round(kg / 100) / 10) + ' t'; return kg + ' kg'; }
  function fmtMya(d) { if (d.myaHi === d.myaLo) return d.myaLo + ' mya'; return d.myaHi + '–' + d.myaLo + ' mya'; }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // The tool renderer runs again for every lab-state update. Keep the WebGL
  // component type stable so unrelated controls do not unmount the canvas and
  // create a fresh renderer/animation loop on every click.
  var DinoFieldStation3DStable = null;

  window.StemLab.registerTool('dinoLab', {
    name: 'Dino Lab',
    icon: '🦕',
    category: 'explore',
    questHooks: [
      { id: 'meet_5', label: 'Open 5 different dinosaur cards', icon: '🦕', check: function (d) { return Object.keys(d.seen || {}).length >= 5; }, progress: function (d) { return Object.keys(d.seen || {}).length + '/5 met'; } },
      { id: 'dig_one', label: 'Excavate a fossil at the Dig Site', icon: '⛏️', check: function (d) { return (d.digsSolved || 0) >= 1; }, progress: function (d) { return (d.digsSolved || 0) + '/1 dig'; } },
      { id: 'quiz_5', label: 'Answer 5 quiz questions correctly', icon: '🧠', check: function (d) { return (d.quizCorrect || 0) >= 5; }, progress: function (d) { return (d.quizCorrect || 0) + '/5 correct'; } },
      { id: 'compare_two', label: 'Compare two dinosaurs side by side', icon: '⚖️', check: function (d) { return (d.compareA && d.compareB) ? true : false; }, progress: function (d) { return (d.compareA && d.compareB) ? 'done' : 'pick 2'; } }
    ],
    render: function (ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var React = ctx.React;
      var el = React.createElement;
      var d = (ctx.toolData && ctx.toolData.dinoLab) || {};
      var upd = function (key, val) {
        if (typeof key === 'object' && key) {
          if (ctx.updateMulti) ctx.updateMulti('dinoLab', key);
          else if (ctx.update) Object.keys(key).forEach(function (k) { ctx.update('dinoLab', k, key[k]); });
        }
        else { if (ctx.update) ctx.update('dinoLab', key, val); }
      };
      var announceToSR = ctx.announceToSR || function () {};

      function strVal(value) { return value == null ? '' : String(value); }
      function arrVal(value) { return Array.isArray(value) ? value : []; }
      function numVal(value, fallback) { var n = Number(value); return isFinite(n) ? n : fallback; }
      function modIndex(value, length) {
        if (!length) return 0;
        var n = Math.floor(numVal(value, 0));
        return ((n % length) + length) % length;
      }

      var tab = d.tab || 'explore';
      var query = strVal(d.query);
      var filterPeriod = d.filterPeriod || 'all';
      var filterDiet = d.filterDiet || 'all';
      var sortBy = d.sortBy || 'name';
      var selected = d.selected || null;
      var seen = d.seen || {};

      function badge(label, color) {
        return el('span', { style: { display: 'inline-block', fontSize: 11, letterSpacing: '0.01em', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: color + '22', color: T.text, border: '1px solid ' + color + '55', marginRight: 6, marginBottom: 4, whiteSpace: 'nowrap' } }, label);
      }
      function panel(children, extra) {
        var style = { background: T.panel, border: '1px solid ' + T.border, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.28)', padding: 14, color: T.text };
        var props = {};
        if (extra) { for (var k in extra) { if (k === 'key' || k === 'ref') { props[k] = extra[k]; } else { style[k] = extra[k]; } } }
        props.style = style;
        return el('div', props, children);
      }
      function pill(active, label, onClick, key) {
        return el('button', { key: key, onClick: onClick, 'aria-pressed': active ? 'true' : 'false', 'aria-label': label, style: { padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: active ? '0 1px 4px rgba(21,128,61,0.45)' : 'none', border: '1px solid ' + (active ? '#15803d' : T.border), background: active ? '#15803d' : 'transparent', color: active ? '#fff' : T.soft, whiteSpace: 'nowrap', marginRight: 6, marginBottom: 6 } }, label);
      }
      function statRow(label, value) {
        return el('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0', borderBottom: '1px solid ' + T.border, fontSize: 13 } }, el('span', { style: { color: T.soft } }, label), el('span', { style: { fontWeight: 600, textAlign: 'right' } }, value));
      }
      function sectionTitle(icon, title, sub) {
        return el('div', { style: { marginBottom: 12 } }, el('div', { style: { fontSize: 18, fontWeight: 800 } }, icon + ' ' + title), sub ? el('div', { style: { fontSize: 12.5, color: T.soft, marginTop: 2 } }, sub) : null);
      }
      function markSeen(id) {
        var ns = {}; for (var k in seen) { ns[k] = seen[k]; }
        ns[id] = true; upd({ selected: id, seen: ns });
        var dn = byId(id); if (dn) announceToSR('Opened ' + dn.common);
      }
      // Open a print-friendly "trading card" for one species in a new window.
      // All dynamic strings are escaped (curated data, but escaped defensively).
      function printCard(dn) {
        if (!dn) return;
        var rows = [
          ['Length', fmtLength(dn.lengthM)], ['Height', fmtLength(dn.heightM)], ['Weight', fmtWeight(dn.weightKg)],
          ['When', dn.epoch + ' (' + fmtMya(dn) + ')'], ['Where', dn.region], ['Diet', cap(dn.diet)],
          ['Group', GROUP_LABEL[dn.group] || cap(dn.group)], ['Rock unit', dn.formation + ' Formation'], ['Named', dn.named + ' by ' + dn.namedBy]
        ];
        var accent = pColor(dn.period);
        var css = 'body{font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif;color:#0f172a;background:#e2e8f0;margin:0;padding:18px}' +
          '.bar{max-width:560px;margin:0 auto 12px;display:flex;gap:8px}' +
          '.bar button{font:600 13px system-ui;padding:8px 14px;border-radius:8px;border:1px solid #94a3b8;background:#fff;cursor:pointer}' +
          '.card{max-width:560px;margin:0 auto;background:#fff;border:1px solid #cbd5e1;border-top:8px solid ' + accent + ';border-radius:14px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.12)}' +
          '.nm{font-size:24px;font-weight:800}.per{float:right;font-size:12px;font-weight:700;color:#fff;background:' + accent + ';padding:3px 10px;border-radius:999px}' +
          '.sci{font-style:italic;color:#475569}.say{font-size:12px;color:#475569;margin:2px 0 10px}' +
          '.blurb{margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px}' +
          'th{text-align:left;color:#475569;font-weight:600;width:38%;padding:4px 0;border-bottom:1px solid #e2e8f0}td{text-align:right;font-weight:600;padding:4px 0;border-bottom:1px solid #e2e8f0}' +
          'h3{font-size:13px;margin:10px 0 4px}ul{margin:0 0 8px;padding-left:18px}' +
          '.box{border-radius:8px;padding:10px;margin-top:8px;font-size:12.5px}.know{background:#e0f2fe;border:1px solid #7dd3fc}.unc{background:#fef3c7;border:1px solid #fcd34d}' +
          '.foot{margin-top:12px;font-size:11px;color:#64748b;text-align:center}' +
          '@media print{body{background:#fff;padding:0}.no-print{display:none}.card{border:1px solid #cbd5e1;box-shadow:none}}';
        var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(dn.common) + ' — Dino Lab card</title><style>' + css + '</style></head><body>' +
          '<div class="bar no-print"><button onclick="window.print()">🖨️ Print this card</button><button onclick="window.close()">Close</button></div>' +
          '<div class="card">' +
          '<div><span class="per">' + esc(periodName(dn.period)) + '</span><div class="nm">' + esc(dn.common) + '</div></div>' +
          '<div class="sci">' + esc(dn.name) + '</div>' +
          '<div class="say">Say it: ' + esc(dn.say) + '  ·  Means: &ldquo;' + esc(dn.meaning) + '&rdquo;</div>' +
          '<p class="blurb">' + esc(dn.blurb) + '</p>' +
          '<table><tbody>' + rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<h3>Standout traits</h3><ul>' + dn.traits.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
          '<div class="box know"><b>🔎 How we know:</b> ' + esc(dn.howKnow) + '</div>' +
          '<div class="box unc"><b>⚖️ What we are not sure about:</b> ' + esc(dn.uncertain) + '</div>' +
          '<div class="foot">Dino Lab · STEM Lab — lengths, weights, and speeds are widely-cited estimates, not exact measurements.</div>' +
          '</div></body></html>';
        try {
          var w = window.open('', '_blank', 'width=620,height=900');
          if (!w) { announceToSR('Pop-up blocked. Allow pop-ups to print the card.'); return; }
          w.document.open(); w.document.write(html); w.document.close();
          announceToSR('Trading card for ' + dn.common + ' opened in a new window.');
        } catch (e) { announceToSR('Could not open the trading card.'); }
      }
      // Shared print-window opener (pop-up-blocked guard + try/catch).
      function openPrint(html, okMsg, what) {
        try {
          var w = window.open('', '_blank', 'width=820,height=1000');
          if (!w) { announceToSR('Pop-up blocked. Allow pop-ups to print ' + (what || 'this') + '.'); return; }
          w.document.open(); w.document.write(html); w.document.close();
          announceToSR(okMsg);
        } catch (e) { announceToSR('Could not open the print view.'); }
      }
      // Print a cut-out species card deck (for sorting activities). All dynamic
      // strings are HTML-escaped via esc().
      function printDeck(list, label) {
        var rowFor = function (k, v) { return '<tr><th>' + esc(k) + '</th><td>' + esc(v) + '</td></tr>'; };
        var cards = list.map(function (dn) {
          return '<div class="card">' +
            '<div class="per" style="background:' + pColor(dn.period) + '22;border-color:' + pColor(dn.period) + '">' + esc(periodName(dn.period)) + '</div>' +
            '<div class="nm">' + esc(dn.common) + '</div>' +
            '<div class="say">' + esc(dn.say) + '</div>' +
            '<table>' + rowFor('Diet', cap(dn.diet)) + rowFor('Length', fmtLength(dn.lengthM)) + rowFor('When', fmtMya(dn)) + rowFor('Where', dn.region) + rowFor('Group', GROUP_LABEL[dn.group] || cap(dn.group)) + '</table>' +
            '<div class="fact">' + esc((dn.facts && dn.facts[0]) ? dn.facts[0] : dn.blurb) + '</div>' +
            '</div>';
        }).join('');
        var css = 'body{font:12px/1.4 system-ui,Segoe UI,Arial,sans-serif;color:#0f172a;margin:0;padding:14px}' +
          '.bar{margin-bottom:12px;font-size:12px;color:#334155}.bar button{font:600 12px system-ui;padding:6px 12px;border-radius:7px;border:1px solid #94a3b8;background:#fff;cursor:pointer;margin-right:6px}' +
          '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}' +
          '.card{border:1px dashed #94a3b8;border-radius:10px;padding:10px;break-inside:avoid;page-break-inside:avoid}' +
          '.per{display:inline-block;color:#0f172a;font-size:9px;font-weight:700;padding:2px 7px;border:1px solid #cbd5e1;border-radius:999px;margin-bottom:4px}' +
          '.nm{font-size:15px;font-weight:800}.say{font-size:10px;color:#475569;margin-bottom:6px}' +
          'table{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:6px}th{text-align:left;color:#475569;font-weight:600;width:42%;padding:1px 0}td{text-align:right;font-weight:600;padding:1px 0}' +
          '.fact{font-size:10px;color:#334155;border-top:1px solid #e2e8f0;padding-top:4px}' +
          '@media print{.no-print{display:none}}';
        var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Dino Lab — species card deck</title><style>' + css + '</style></head><body>' +
          '<div class="bar no-print"><button onclick="window.print()">🖨️ Print</button><button onclick="window.close()">Close</button> ' + list.length + ' cards · ' + esc(label) + ' · cut along the dashed lines, then sort by period, diet, or group.</div>' +
          '<div class="grid">' + cards + '</div></body></html>';
        openPrint(html, list.length + ' species cards opened for printing.', 'the card deck');
      }
      // Print the quiz as a numbered worksheet + a separate answer key.
      function printQuizSheet() {
        var LET = ['A', 'B', 'C', 'D', 'E'];
        var qhtml = QUIZ.map(function (q, i) {
          return '<div class="q"><div class="qt">' + (i + 1) + '. ' + esc(q.q) + '</div><ol class="opts" type="A">' + q.options.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ol></div>';
        }).join('');
        var khtml = QUIZ.map(function (q, i) {
          return '<div class="k"><b>' + (i + 1) + '. ' + LET[q.answer] + '</b> &mdash; ' + esc(q.options[q.answer]) + '. <span>' + esc(q.explain) + '</span></div>';
        }).join('');
        var css = 'body{font:13px/1.5 system-ui,Segoe UI,Arial,sans-serif;color:#0f172a;margin:0;padding:18px;max-width:760px}' +
          '.bar{margin-bottom:14px}.bar button{font:600 12px system-ui;padding:6px 12px;border-radius:7px;border:1px solid #94a3b8;background:#fff;cursor:pointer;margin-right:6px}' +
          'h1{font-size:18px;margin:0 0 4px}h2{font-size:15px;margin:0 0 10px;page-break-before:always}' +
          '.meta{font-size:12px;color:#475569;margin-bottom:14px}.q{margin-bottom:12px;break-inside:avoid}.qt{font-weight:700}' +
          'ol.opts{margin:4px 0 0}ol.opts li{margin:2px 0}.k{margin-bottom:8px;font-size:12.5px}.k span{color:#475569}' +
          '@media print{.no-print{display:none}}';
        var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Dino Lab — quiz worksheet</title><style>' + css + '</style></head><body>' +
          '<div class="bar no-print"><button onclick="window.print()">🖨️ Print</button><button onclick="window.close()">Close</button></div>' +
          '<h1>Dino Lab quiz</h1><div class="meta">Name: ____________________&nbsp;&nbsp;&nbsp;Date: __________&nbsp;&nbsp;&nbsp;(' + QUIZ.length + ' questions)</div>' +
          qhtml + '<h2>Answer key</h2>' + khtml + '</body></html>';
        openPrint(html, 'Quiz worksheet and answer key opened for printing.', 'the quiz worksheet');
      }

      var TABS = [
        { id: 'explore', label: t('stem.dinolab.explore', 'Explore'), icon: '🔍' },
        { id: 'timeline', label: t('stem.dinolab.timeline', 'Timeline'), icon: '⏳' },
        { id: 'deeptime', label: t('stem.dinolab.deep_time', 'Deep Time'), icon: '🕰️' },
        { id: 'sites', label: t('stem.dinolab.sites', 'Sites'), icon: '🗺️' },
        { id: 'map', label: 'Map', icon: '🌎' },
        { id: 'ecosystem', label: t('stem.dinolab.ecosystems', 'Ecosystems'), icon: '🌍' },
        { id: 'compare', label: t('stem.dinolab.compare', 'Compare'), icon: '⚖️' },
        { id: 'field3d', label: t('stem.dinolab.field_station_3d', 'Field Station'), icon: '3D' },
        { id: 'dig', label: t('stem.dinolab.dig_site', 'Dig Site'), icon: '⛏️' },
        { id: 'classify', label: t('stem.dinolab.classify', 'Classify'), icon: '🌳' },
        { id: 'birds', label: t('stem.dinolab.bird_link', 'Bird Link'), icon: '🐦' },
        { id: 'extinction', label: t('stem.dinolab.extinction', 'Extinction'), icon: '☄️' },
        { id: 'anatomy', label: t('stem.dinolab.anatomy', 'Anatomy'), icon: '🦴' },
        { id: 'records', label: t('stem.dinolab.records', 'Records'), icon: '🏆' },
        { id: 'quiz', label: t('stem.dinolab.quiz', 'Quiz'), icon: '🧠' },
        { id: 'notes', label: t('stem.dinolab.field_notes', 'Field Notes'), icon: '📓' },
        { id: 'glossary', label: t('stem.dinolab.glossary', 'Glossary'), icon: '📖' },
        { id: 'classroom', label: t('stem.dinolab.classroom', 'Classroom'), icon: '🍎' }
      ];
      if (!TABS.some(function (tb) { return tb.id === tab; })) tab = 'explore';
      function tabGroupFor(id) {
        if (['explore', 'timeline', 'deeptime', 'sites', 'map', 'ecosystem'].indexOf(id) >= 0) return 'Discover';
        if (['compare', 'field3d', 'dig', 'classify', 'anatomy'].indexOf(id) >= 0) return 'Investigate';
        if (['birds', 'extinction', 'records'].indexOf(id) >= 0) return 'Explain';
        return 'Practice and teach';
      }
      var activeTabMeta = TABS.filter(function (tb) { return tb.id === tab; })[0] || TABS[0];
      var activeTabGroup = tabGroupFor(activeTabMeta.id);
      function focusTabAt(index) {
        var next = TABS[modIndex(index, TABS.length)];
        upd('tab', next.id);
        announceToSR(next.label + ' tab');
        if (typeof document !== 'undefined') {
          var nextNode = document.getElementById('dinotab-' + next.id);
          if (nextNode && nextNode.focus) nextNode.focus();
        }
      }
      function handleTabKeyDown(event, index) {
        var nextIndex = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = index + 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = index - 1;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = TABS.length - 1;
        if (nextIndex == null) return;
        event.preventDefault();
        focusTabAt(nextIndex);
      }
      var tabBar = el('div', { className: 'dinolab-tablist', role: 'tablist', 'aria-label': t('stem.dinolab.dino_lab_sections', 'Dino Lab sections'), 'aria-orientation': 'horizontal', style: { display: 'flex', flexWrap: 'wrap', gap: 4, padding: '10px 12px', borderBottom: '1px solid ' + T.border, background: T.deeper } }, TABS.map(function (tb, tabIndex) {
        var active = tab === tb.id;
        return el('button', { key: tb.id, id: 'dinotab-' + tb.id, role: 'tab', 'data-tab-group': tabGroupFor(tb.id), title: tabGroupFor(tb.id) + ': ' + tb.label, tabIndex: active ? 0 : -1, 'aria-selected': active ? 'true' : 'false', 'aria-controls': 'dinopanel', 'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End', onKeyDown: function (event) { handleTabKeyDown(event, tabIndex); }, onClick: function () { upd('tab', tb.id); announceToSR(tb.label + ' tab'); }, style: { padding: '7px 11px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: active ? 700 : 500, boxShadow: active ? '0 1px 4px rgba(21,128,61,0.45)' : 'none', background: active ? '#15803d' : 'transparent', color: active ? '#fff' : T.soft, whiteSpace: 'nowrap' } }, tb.icon + ' ' + tb.label);
      }));
      var tabNavigation = el('nav', { 'aria-label': 'Dino Lab section navigation', style: { background: T.deeper } },
        el('div', { className: 'dinolab-section-cue', style: { display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px 0', color: T.soft, fontSize: 11.5 } },
          el('span', { style: { textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 900, color: '#5eead4' } }, activeTabGroup),
          el('span', { 'aria-hidden': 'true' }, '›'),
          el('span', { style: { fontWeight: 800, color: T.text } }, activeTabMeta.label),
          el('span', { style: { marginLeft: 'auto' } }, (TABS.indexOf(activeTabMeta) + 1) + ' of ' + TABS.length)
        ),
        tabBar
      );

      function renderDetail(dn) {
        if (!dn) return null;
        return panel([
          el('div', { key: 'hd', style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } }, el('div', { key: 'nm', style: { fontSize: 20, fontWeight: 800 } }, dn.common), el('div', { key: 'acts', style: { display: 'flex', gap: 6 } }, el('button', { onClick: function () { upd({ tab: 'compare', compareA: dn.id }); }, style: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: '1px solid ' + T.border, background: 'transparent', color: T.soft, cursor: 'pointer' } }, '⚖️ Compare'), el('button', { onClick: function () { printCard(dn); }, 'aria-label': 'Print a trading card for ' + dn.common, style: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: '1px solid ' + T.border, background: 'transparent', color: T.soft, cursor: 'pointer' } }, '🖨️ Card'))),
          el('div', { key: 'sci', style: { fontSize: 12, fontStyle: 'italic', color: T.soft } }, dn.name),
          el('div', { key: 'say', style: { fontSize: 12, color: T.soft, marginBottom: 8 } }, 'Say it: ' + dn.say + '  ·  Means: "' + dn.meaning + '"'),
          el('div', { key: 'bdg', style: { marginBottom: 8 } }, badge(periodName(dn.period) + ' · ' + fmtMya(dn), pColor(dn.period)), badge((DIET_ICON[dn.diet] || '') + ' ' + cap(dn.diet), dColor(dn.diet)), badge(GROUP_LABEL[dn.group] || cap(dn.group), '#38bdf8')),
          el('p', { key: 'bl', style: { fontSize: 13.5, lineHeight: 1.55, margin: '0 0 10px' } }, dn.blurb),
          el('div', { key: 'st' }, statRow('Length', fmtLength(dn.lengthM)), statRow('Height', fmtLength(dn.heightM)), statRow('Weight', fmtWeight(dn.weightKg)), statRow('When', dn.epoch + ' (' + fmtMya(dn) + ')'), statRow('Where', dn.region), statRow('Rock unit', dn.formation + ' Formation'), statRow('Named', dn.named + ' by ' + dn.namedBy)),
          el('div', { key: 'scale', style: { marginTop: 10 } }, el('div', { style: { fontSize: 12, fontWeight: 700, color: T.soft, marginBottom: 6 } }, 'Size next to a person'), (function () {
            var human = 1.7, maxRef = Math.max(dn.lengthM, human);
            function scaleRow(icon, label, meters, color) {
              var pct = Math.max(3, Math.round((meters / maxRef) * 100));
              return el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 } }, el('span', { 'aria-hidden': 'true', style: { width: 18, textAlign: 'center', fontSize: 14 } }, icon), el('div', { style: { flex: 1, height: 14, borderRadius: 6, background: T.deeper, overflow: 'hidden' } }, el('div', { style: { height: '100%', width: pct + '%', background: color, borderRadius: 6 } })), el('span', { style: { fontSize: 11, color: T.soft, minWidth: 96, textAlign: 'right' } }, label));
            }
            return el('div', { 'aria-label': dn.common + ' is about ' + fmtLength(dn.lengthM) + ' long, an adult human is about 1.7 meters' }, scaleRow(dn.diet === 'carnivore' ? '🦖' : '🦕', fmtLength(dn.lengthM) + ' long', dn.lengthM, dColor(dn.diet)), scaleRow('🧍', 'human 1.7 m', human, '#94a3b8'));
          })()),
          el('div', { key: 'tr', style: { marginTop: 10 } }, el('div', { style: { fontSize: 12, fontWeight: 700, color: T.soft, marginBottom: 4 } }, 'Standout traits'), el('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 } }, dn.traits.map(function (tr, i) { return el('li', { key: i }, tr); }))),
          el('div', { key: 'fa', style: { marginTop: 10 } }, el('div', { style: { fontSize: 12, fontWeight: 700, color: T.soft, marginBottom: 4 } }, 'Did you know'), el('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 } }, dn.facts.map(function (fa, i) { return el('li', { key: i }, fa); }))),
          el('div', { key: 'hk', style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.35)' } }, el('div', { style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3 } }, '🔎 How we know'), el('div', { style: { fontSize: 12.5, lineHeight: 1.5 } }, dn.howKnow)),
          el('div', { key: 'un', style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)' } }, el('div', { style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3 } }, '⚖️ What we are not sure about'), el('div', { style: { fontSize: 12.5, lineHeight: 1.5 } }, dn.uncertain))
        ]);
      }

      function renderExplore() {
        var list = DINOS.slice();
        var q = query.trim().toLowerCase();
        var filterContinent = d.filterContinent || 'all';
        function continentOf(region) { var i = region.indexOf(' ('); return i === -1 ? region : region.slice(0, i); }
        list = list.filter(function (dn) {
          if (filterPeriod !== 'all' && dn.period !== filterPeriod) return false;
          if (filterDiet !== 'all' && dn.diet !== filterDiet) return false;
          if (filterContinent !== 'all' && continentOf(dn.region) !== filterContinent) return false;
          if (q) { var hay = (dn.common + ' ' + dn.name + ' ' + dn.meaning + ' ' + dn.clade + ' ' + dn.region).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
          return true;
        });
        list.sort(function (a, b) {
          if (sortBy === 'name') return a.common < b.common ? -1 : 1;
          if (sortBy === 'time') return b.myaHi - a.myaHi;
          if (sortBy === 'length') return b.lengthM - a.lengthM;
          if (sortBy === 'weight') return b.weightKg - a.weightKg;
          return 0;
        });
        var periodPills = [pill(filterPeriod === 'all', 'All periods', function () { upd('filterPeriod', 'all'); }, 'p_all')];
        PERIODS.forEach(function (p) { if (p.id === 'paleogene') return; periodPills.push(pill(filterPeriod === p.id, p.name, function () { upd('filterPeriod', p.id); }, 'p_' + p.id)); });
        var dietPills = [pill(filterDiet === 'all', 'All diets', function () { upd('filterDiet', 'all'); }, 'di_all')];
        ['carnivore', 'herbivore', 'omnivore', 'piscivore'].forEach(function (di) { dietPills.push(pill(filterDiet === di, (DIET_ICON[di] || '') + ' ' + cap(di), function () { upd('filterDiet', di); }, 'di_' + di)); });
        var continents = []; DINOS.forEach(function (dn) { var c = continentOf(dn.region); if (continents.indexOf(c) === -1) continents.push(c); }); continents.sort();
        var continentPills = [pill(filterContinent === 'all', 'All places', function () { upd('filterContinent', 'all'); }, 'c_all')];
        continents.forEach(function (c) { continentPills.push(pill(filterContinent === c, c, function () { upd('filterContinent', c); }, 'c_' + c.replace(/\W/g, ''))); });
        var controls = el('div', { style: { marginBottom: 12 } },
          el('input', { type: 'text', value: query, placeholder: t('stem.dinolab.search_by_name_meaning_clade_or_place', 'Search by name, meaning, clade, or place...'), 'aria-label': t('stem.dinolab.search_dinosaurs', 'Search dinosaurs'), onChange: function (e) { upd('query', e.target.value); }, style: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + T.border, background: T.deeper, color: T.text, fontSize: 14, marginBottom: 10 } }),
          el('div', { role: 'group', 'aria-label': 'Filter by geological period', style: { marginBottom: 6 } }, periodPills),
          el('div', { role: 'group', 'aria-label': 'Filter by diet', style: { marginBottom: 6 } }, dietPills),
          el('div', { role: 'group', 'aria-label': 'Filter by location', style: { marginBottom: 6 } }, continentPills),
          el('div', { role: 'group', 'aria-label': 'Sort dinosaurs', style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }, el('span', { 'aria-hidden': 'true', style: { fontSize: 12, color: T.soft } }, 'Sort:'), pill(sortBy === 'name', 'A to Z', function () { upd('sortBy', 'name'); }, 's_name'), pill(sortBy === 'time', 'Oldest first', function () { upd('sortBy', 'time'); }, 's_time'), pill(sortBy === 'length', 'Longest', function () { upd('sortBy', 'length'); }, 's_len'), pill(sortBy === 'weight', 'Heaviest', function () { upd('sortBy', 'weight'); }, 's_wt'), el('button', { key: 'surprise', onClick: function () { var n = (d.surpriseN || 0) + 1; var pick = DINOS[(n * 48271) % DINOS.length]; var ns = {}; for (var sk in seen) { ns[sk] = seen[sk]; } ns[pick.id] = true; upd({ selected: pick.id, seen: ns, surpriseN: n }); announceToSR('Surprise: ' + pick.common); }, style: { fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + T.border, background: 'transparent', color: T.text } }, '🎲 Surprise me'), el('span', { style: { marginLeft: 'auto', fontSize: 12, color: T.soft } }, list.length + ' of ' + DINOS.length))
        );
        var grid = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 } }, list.map(function (dn) {
          return el('button', { key: dn.id, onClick: function () { markSeen(dn.id); }, 'aria-label': 'Open ' + dn.common, style: { textAlign: 'left', cursor: 'pointer', background: T.panel, border: '1px solid ' + (selected === dn.id ? '#22c55e' : T.border), borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.30)', padding: 12, color: T.text, position: 'relative' } },
            el('div', { style: { fontSize: 26, marginBottom: 4 } }, dn.diet === 'carnivore' ? '🦖' : (dn.group === 'sauropod' ? '🦕' : '🦴')),
            el('div', { style: { fontWeight: 700, fontSize: 14 } }, dn.common),
            el('div', { style: { fontSize: 11, color: T.soft, fontStyle: 'italic', marginBottom: 6 } }, dn.meaning),
            el('div', null, badge(periodName(dn.period), pColor(dn.period)), badge(cap(dn.diet), dColor(dn.diet))),
            seen[dn.id] ? el('span', { 'aria-hidden': 'true', title: t('stem.dinolab.seen', 'Seen'), style: { position: 'absolute', top: 8, right: 10, fontSize: 11, fontWeight: 800, color: T.text } }, '✓') : null
          );
        }));
        var detail = selected ? renderDetail(byId(selected)) : el('div', { style: { color: T.soft, fontSize: 13, padding: '20px 4px' } }, 'Pick a dinosaur to see its full file, including what we are still unsure about.');
        return el('div', { className: 'dinolab-explore-layout', style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 16 } }, el('div', null, controls, grid), el('div', null, detail));
      }

      function renderTimeline() {
        var spanTotal = 252 - 23;
        var rows = PERIODS.map(function (p) {
          var members = DINOS.filter(function (dn) { return dn.period === p.id && dn.group !== 'other'; }); // exclude the non-dinosaur foils (Pteranodon, Mosasaurus) — they were appearing as dinosaurs in the timeline
          var periodDuration = p.myaHi - p.myaLo;
          var widthPct = Math.round((periodDuration / spanTotal) * 100);
          var periodSummary = p.name + ' lasted about ' + periodDuration + ' million years, from ' + p.myaHi + ' to ' + p.myaLo + ' million years ago, with ' + members.length + ' listed dinosaurs.';
          return el('div', { key: p.id, role: 'group', 'aria-label': periodSummary, style: { marginBottom: 14 } },
            el('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } }, el('span', { 'aria-hidden': 'true', style: { width: 12, height: 12, borderRadius: 3, background: pColor(p.id), display: 'inline-block' } }), el('span', { style: { fontWeight: 800, fontSize: 15 } }, p.name), el('span', { style: { fontSize: 12, color: T.soft } }, p.myaHi + ' to ' + p.myaLo + ' million years ago')),
            el('div', { role: 'progressbar', 'aria-label': p.name + ' duration on the Mesozoic timeline', 'aria-valuemin': 0, 'aria-valuemax': spanTotal, 'aria-valuenow': periodDuration, 'aria-valuetext': periodSummary, style: { height: 10, borderRadius: 6, background: pColor(p.id) + '33', margin: '6px 0', overflow: 'hidden' } }, el('div', { style: { height: '100%', width: Math.max(8, widthPct) + '%', background: pColor(p.id) } })),
            el('div', { style: { fontSize: 12.5, color: T.text, marginBottom: 4 } }, p.headline),
            el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6, marginBottom: 6 } }, el('div', { key: 'cl', style: { fontSize: 11.5, color: T.soft } }, '🌡️ ' + p.climate), el('div', { key: 'pl', style: { fontSize: 11.5, color: T.soft } }, '🌿 ' + p.plants), el('div', { key: 'se', style: { fontSize: 11.5, color: T.soft } }, '🌊 ' + p.sea)),
            members.length ? el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5 } }, members.map(function (dn) { return el('button', { key: dn.id, onClick: function () { upd({ tab: 'explore', selected: dn.id }); }, 'aria-label': 'Open ' + dn.common, style: { fontSize: 11, padding: '3px 9px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + T.border, background: T.deeper, color: T.text } }, dn.common); })) : el('div', { style: { fontSize: 11.5, color: T.soft, fontStyle: 'italic' } }, 'No non-bird dinosaurs after the asteroid. Birds carry on.')
          );
        });
        return el('div', null, sectionTitle('⏳', 'Walk the Mesozoic', 'The "age of dinosaurs" spans more than 180 million years. Bar width shows how long each period lasted.'), panel(rows), panel([el('div', { key: 't', style: { fontSize: 13, fontWeight: 700, marginBottom: 4 } }, '🤯 Deep time check'), el('div', { key: 'b', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.55 } }, 'Stegosaurus (about 150 million years ago) lived closer in time to you than to Tyrannosaurus (about 66 million years ago).')], { marginTop: 12, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.35)' }));
      }

      function renderDeepTime() {
        var scale = d.dtScale === 'day' ? 'day' : 'year';
        var ORIGIN = 4600; // mya Earth formed — the start of the compressed clock
        var MONTHS = [['January', 31], ['February', 28], ['March', 31], ['April', 30], ['May', 31], ['June', 30], ['July', 31], ['August', 31], ['September', 30], ['October', 31], ['November', 30], ['December', 31]];
        function pad(n) { return (n < 10 ? '0' : '') + n; }
        function posOf(mya) { return (ORIGIN - Math.max(0, mya)) / ORIGIN; } // 0 (Earth forms) .. 1 (now)
        function clock(mya) {
          if (mya <= 0) return scale === 'day' ? 'the final midnight' : 'the stroke of midnight, Dec 31';
          var pos = posOf(mya);
          if (scale === 'day') {
            var secs = pos * 86400, hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60), ss = Math.floor(secs % 60);
            var ap = hh < 12 ? 'AM' : 'PM', h12 = hh % 12 || 12;
            return h12 + ':' + pad(mm) + ':' + pad(ss) + ' ' + ap;
          }
          var rem = pos * 365, mi = 0;
          for (mi = 0; mi < 12; mi++) { if (rem < MONTHS[mi][1]) break; rem -= MONTHS[mi][1]; }
          if (mi > 11) { mi = 11; rem = 31; }
          var lbl = MONTHS[mi][0] + ' ' + Math.min(MONTHS[mi][1], Math.floor(rem) + 1);
          if (mi === 11) {
            var s2 = (rem - Math.floor(rem)) * 86400, H = Math.floor(s2 / 3600), M = Math.floor((s2 % 3600) / 60);
            var ap2 = H < 12 ? 'AM' : 'PM', H12 = H % 12 || 12;
            lbl += ', ' + H12 + ':' + pad(M) + ' ' + ap2;
          }
          return lbl;
        }
        var EVENTS = [
          { mya: 4600, icon: '🌍', label: t('stem.dinolab.earth_forms', 'Earth forms') },
          { mya: 3800, icon: '🦠', label: t('stem.dinolab.first_life_simple_microbes', 'First life — simple microbes') },
          { mya: 2400, icon: '🫧', label: t('stem.dinolab.microbes_fill_the_air_with_oxygen', 'Microbes fill the air with oxygen') },
          { mya: 1800, icon: '🔬', label: t('stem.dinolab.first_complex_eukaryotic_cells', 'First complex (eukaryotic) cells') },
          { mya: 600, icon: '🪼', label: t('stem.dinolab.first_animals', 'First animals') },
          { mya: 538, icon: '🦐', label: t('stem.dinolab.cambrian_explosion_animals_diversify', 'Cambrian explosion — animals diversify') },
          { mya: 470, icon: '🌿', label: t('stem.dinolab.plants_spread_onto_land', 'Plants spread onto land') },
          { mya: 375, icon: '🐟', label: t('stem.dinolab.first_four_legged_animals_walk_on_land', 'First four-legged animals walk on land') },
          { mya: 320, icon: '🦎', label: t('stem.dinolab.first_reptiles', 'First reptiles') },
          { mya: 252, icon: '💀', label: t('stem.dinolab.the_great_dying_end_permian_extinction', 'The Great Dying (end-Permian extinction)'), dino: true },
          { mya: 233, icon: '🦕', label: t('stem.dinolab.first_dinosaurs_appear', 'First dinosaurs appear'), dino: true },
          { mya: 225, icon: '🐭', label: t('stem.dinolab.first_mammals', 'First mammals'), dino: true },
          { mya: 150, icon: '🪶', label: t('stem.dinolab.first_birds_archaeopteryx', 'First birds (Archaeopteryx)'), dino: true },
          { mya: 66, icon: '☄️', label: t('stem.dinolab.asteroid_non_bird_dinosaurs_end', 'Asteroid — non-bird dinosaurs end'), dino: true },
          { mya: 7, icon: '🐒', label: t('stem.dinolab.first_human_ancestors_hominins', 'First human ancestors (hominins)') },
          { mya: 0.3, icon: '🧑', label: t('stem.dinolab.first_homo_sapiens_us', 'First Homo sapiens (us)') },
          { mya: 0, icon: '📍', label: t('stem.dinolab.right_now', 'Right now') }
        ];
        var DINO_LO = 66, DINO_HI = 233;
        var unit = scale === 'day' ? 'a single 24-hour day' : 'a single calendar year';
        var dinoSpan = (DINO_HI - DINO_LO) / ORIGIN * (scale === 'day' ? 24 * 60 : 365);
        var dinoSpanStr = scale === 'day' ? (Math.round(dinoSpan) + ' minutes') : (Math.round(dinoSpan) + ' days');
        var humanLast = scale === 'day' ? (Math.round(0.3 / ORIGIN * 86400) + ' seconds') : (Math.round(0.3 / ORIGIN * 365 * 24 * 60) + ' minutes');
        var deepTimeSummary = 'Compressed Earth history timeline: all 4.6 billion years are shown as ' + unit + '. Dinosaurs appear at ' + clock(233) + ', end at ' + clock(66) + ', and Homo sapiens appear in the final ' + humanLast + '.';

        var toggle = el('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } }, [['year', '📅 Calendar year'], ['day', '🕛 24-hour clock']].map(function (o) {
          var on = scale === o[0];
          return el('button', { key: o[0], onClick: function () { upd('dtScale', o[0]); }, 'aria-pressed': on ? 'true' : 'false', style: { fontSize: 12.5, fontWeight: 700, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + (on ? '#15803d' : T.border), background: on ? '#15803d' : 'transparent', color: on ? '#fff' : T.soft } }, o[1]);
        }));

        var bandL = posOf(DINO_HI) * 100, bandW = (posOf(DINO_LO) - posOf(DINO_HI)) * 100;
        var ticks = EVENTS.filter(function (e) { return e.mya > 0; }).map(function (e) {
          return el('div', { key: 'tk' + e.mya, 'aria-hidden': 'true', style: { position: 'absolute', left: posOf(e.mya) * 100 + '%', top: 0, width: 2, height: '100%', background: T.text, opacity: 0.45 } });
        });
        var bar = el('div', { key: 'bar' },
          el('div', { role: 'img', 'aria-label': deepTimeSummary, style: { position: 'relative', height: 30, borderRadius: 8, background: T.deeper, border: '1px solid ' + T.border, overflow: 'hidden' } }, [].concat(ticks, [
            el('div', { key: 'band', 'aria-hidden': 'true', style: { position: 'absolute', left: bandL + '%', width: Math.max(0.8, bandW) + '%', top: 0, height: '100%', background: '#22c55e', opacity: 0.85 } }),
            el('div', { key: 'now', 'aria-hidden': 'true', title: 'Now', style: { position: 'absolute', right: 0, top: 0, width: 3, height: '100%', background: '#ef4444' } })
          ])),
          el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.soft, marginTop: 4 } }, el('span', { key: 'l' }, '⟵ 4.6 billion years ago'), el('span', { key: 'r' }, 'now ⟶')),
          el('div', { style: { fontSize: 11.5, color: T.soft, fontStyle: 'italic', marginTop: 4 } }, 'The whole age of dinosaurs is that green sliver near the far right. Everything before it is the long empty stretch.')
        );

        var headline = panel([
          el('div', { key: 'h', style: { fontSize: 13.5, lineHeight: 1.6 } }, 'Squeeze all 4.6 billion years of Earth’s history into ', el('strong', { key: 's' }, unit), '. Then:'),
          el('ul', { key: 'u', style: { margin: '8px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.65 } },
            el('li', { key: 'a' }, '🦕 The first dinosaurs show up on ', el('strong', null, clock(233)), '.'),
            el('li', { key: 'b' }, 'They rule for about ', el('strong', null, dinoSpanStr), ', until the asteroid on ', el('strong', null, clock(66)), '.'),
            el('li', { key: 'c' }, '🧑 Our species appears only in the very last ', el('strong', null, humanLast), '.'))
        ], { marginBottom: 12, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.35)' });

        var rows = EVENTS.map(function (e) {
          return el('div', { key: 'ev' + e.mya, style: { display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 8px', borderRadius: 8, marginBottom: 4, background: e.dino ? 'rgba(34,197,94,0.10)' : 'transparent', border: '1px solid ' + (e.dino ? 'rgba(34,197,94,0.30)' : T.border) } },
            el('span', { key: 'i', 'aria-hidden': 'true', style: { fontSize: 16, width: 22, textAlign: 'center' } }, e.icon),
            el('span', { key: 'l', style: { flex: 1, fontSize: 13, color: T.text } }, e.label),
            el('span', { key: 'm', style: { fontSize: 11.5, color: T.soft, minWidth: 90, textAlign: 'right' } }, e.mya > 0 ? (e.mya >= 1000 ? (e.mya / 1000) + ' billion yrs' : e.mya + ' mya') : 'today'),
            el('span', { key: 'c', style: { fontSize: 12, fontWeight: 700, color: T.text, minWidth: 130, textAlign: 'right' } }, clock(e.mya)));
        });

        var sel = d.selected ? byId(d.selected) : null;
        var pick = sel
          ? panel([el('div', { key: 'p', style: { fontSize: 13, lineHeight: 1.55 } }, '🦖 Your pick, ', el('strong', null, sel.common), ', first appears around ', el('strong', null, clock(sel.myaHi)), ' (' + fmtMya(sel) + ').')], { marginTop: 12, background: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.30)' })
          : el('div', { style: { marginTop: 12, fontSize: 12.5, color: T.soft, fontStyle: 'italic' } }, 'Tip: open any dinosaur in Explore, then return here to see exactly where it falls on the ' + scale + '.');

        return el('div', null,
          sectionTitle('🕰️', 'Deep time: the whole story on one clock', 'Millions of years are impossible to picture. So shrink all of Earth’s history down to something you already know.'),
          toggle, bar, headline,
          el('div', { style: { fontSize: 13, fontWeight: 800, margin: '4px 0 6px' } }, 'Every big moment, in order'),
          panel(rows),
          pick,
          panel([el('div', { key: 'n', style: { fontSize: 11.5, color: T.soft, lineHeight: 1.5 } }, 'These dates are a teaching analogy, not exact. Ages are rounded to widely-cited estimates; “first” events mark the oldest good fossils we have, which new finds can push back.')], { marginTop: 12 })
        );
      }

      function renderMap() {
        var byCont = {};
        DINOS.forEach(function (dn) { if (dn.group === 'other') return; var c = continentOf(dn.region); (byCont[c] = byCont[c] || []).push(dn); });
        var TILES = [
          { c: 'North America', emoji: '🦬', left: 4, top: 7, w: 29, h: 31, shape: 'polygon(10% 15%,34% 3%,68% 11%,96% 30%,80% 54%,60% 60%,48% 92%,26% 78%,18% 50%,0 36%)', rotate: -3 },
          { c: 'South America', emoji: '🦥', left: 23, top: 47, w: 17, h: 43, shape: 'polygon(8% 2%,85% 10%,100% 28%,66% 54%,57% 88%,34% 100%,20% 62%,0 24%)', rotate: -5 },
          { c: 'Europe', emoji: '🏰', left: 45, top: 10, w: 14, h: 18, shape: 'polygon(8% 24%,30% 4%,55% 18%,78% 5%,100% 35%,72% 62%,90% 90%,48% 82%,20% 100%,0 62%)', rotate: 2 },
          { c: 'Africa', emoji: '🦒', left: 44, top: 29, w: 21, h: 39, shape: 'polygon(12% 8%,52% 0,94% 17%,100% 42%,74% 79%,49% 100%,28% 76%,15% 49%,0 27%)', rotate: 1 },
          { c: 'Asia', emoji: '🐼', left: 58, top: 5, w: 38, h: 39, shape: 'polygon(0 25%,20% 4%,55% 0,76% 13%,100% 12%,91% 38%,72% 50%,64% 83%,38% 72%,24% 95%,11% 64%)', rotate: 1 },
          { c: 'Australia', emoji: '🦘', left: 78, top: 62, w: 18, h: 24, shape: 'polygon(4% 31%,28% 8%,60% 13%,81% 0,100% 38%,89% 79%,58% 100%,26% 86%,0 61%)', rotate: 4 },
          { c: 'Antarctica', emoji: '🐧', left: 35, top: 88, w: 37, h: 10, shape: 'polygon(0 36%,18% 8%,40% 26%,61% 0,80% 23%,100% 15%,93% 79%,66% 100%,41% 78%,19% 94%)', rotate: 0 }
        ];
        var maxN = 1;
        var totalMapped = 0;
        TILES.forEach(function (tile) { var count = (byCont[tile.c] || []).length; maxN = Math.max(maxN, count); totalMapped += count; });
        var richest = TILES.slice().sort(function (a, b) { return (byCont[b.c] || []).length - (byCont[a.c] || []).length; })[0];
        var sel = d.mapSel || null;
        function heat(n) { return 'hsl(145, 58%, ' + Math.round(88 - (n / maxN) * 40) + '%)'; }
        var tileEls = TILES.map(function (tile) {
          var list = byCont[tile.c] || [], active = sel === tile.c;
          return el('button', {
            key: tile.c,
            onClick: function () { upd('mapSel', active ? null : tile.c); announceToSR(tile.c + ', ' + list.length + ' dinosaurs in this catalog'); },
            'aria-pressed': active ? 'true' : 'false',
            'aria-label': tile.c + ', ' + list.length + ' dinosaurs in this teaching catalog',
            style: { position: 'absolute', left: tile.left + '%', top: tile.top + '%', width: tile.w + '%', height: tile.h + '%', clipPath: tile.shape, cursor: 'pointer', border: 'none', background: heat(list.length), color: '#0f172a', fontWeight: 800, padding: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: active ? 'inset 0 0 0 5px #14532d, 0 0 0 3px #5eead4' : 'inset 0 0 0 2px rgba(15,23,42,0.24)', transform: 'rotate(' + tile.rotate + 'deg)', zIndex: active ? 2 : 1 }
          },
            el('span', { key: 'e', 'aria-hidden': 'true', style: { fontSize: 17, lineHeight: 1 } }, tile.emoji),
            el('span', { key: 'n', style: { fontSize: 10.5, lineHeight: 1.1, maxWidth: '88%' } }, tile.c),
            el('span', { key: 'c', style: { fontSize: 14, lineHeight: 1.05, fontWeight: 900 } }, String(list.length)));
        });
        var mapBox = el('div', { className: 'dinolab-world-map', role: 'group', 'aria-label': t('stem.dinolab.map_of_where_dinosaur_fossils_are_foun', 'Map of where dinosaur fossils are found today, by continent'), style: { position: 'relative', width: '100%', height: 0, paddingBottom: '52%', overflow: 'hidden', borderRadius: 12, backgroundColor: '#0c2940', backgroundImage: 'linear-gradient(rgba(125,211,252,0.10) 1px, transparent 1px),linear-gradient(90deg, rgba(125,211,252,0.10) 1px, transparent 1px),radial-gradient(circle at 50% 42%, rgba(56,189,248,0.18), rgba(2,6,23,0.18))', backgroundSize: '12.5% 25%, 12.5% 25%, 100% 100%', border: '1px solid ' + T.border, marginBottom: 8 } },
          el('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: 9, bottom: 7, color: '#bae6fd', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' } }, 'PRESENT-DAY CONTINENTS'),
          el('div', { style: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } }, tileEls));
        var stats = el('div', { className: 'dinolab-map-stats', 'aria-label': 'Map catalog summary', style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, margin: '8px 0 10px' } },
          panel([el('div', { key: 'v', style: { fontSize: 18, fontWeight: 900, color: '#5eead4' } }, String(totalMapped)), el('div', { key: 'l', style: { fontSize: 11, color: T.soft } }, 'dinosaurs plotted')]),
          panel([el('div', { key: 'v', style: { fontSize: 18, fontWeight: 900, color: '#7dd3fc' } }, String(TILES.length)), el('div', { key: 'l', style: { fontSize: 11, color: T.soft } }, 'continents represented')]),
          panel([el('div', { key: 'v', style: { fontSize: 14, fontWeight: 900, color: '#fde68a' } }, richest.c), el('div', { key: 'l', style: { fontSize: 11, color: T.soft } }, 'largest catalog sample')])
        );
        var detail;
        if (sel && byCont[sel]) {
          var slist = byCont[sel].slice().sort(function (a, b) { return a.common < b.common ? -1 : 1; });
          var periodMix = PERIODS.map(function (period) { var count = slist.filter(function (dn) { return dn.period === period.id; }).length; return count ? badge(period.name + ' ' + count, pColor(period.id)) : null; });
          detail = panel([
            el('div', { key: 'h', style: { fontWeight: 800, fontSize: 15, marginBottom: 5 } }, '📍 ' + sel + ' — ' + slist.length + ' catalog entries'),
            el('div', { key: 'mix', style: { marginBottom: 7 } }, periodMix),
            el('div', { key: 'chips', style: { display: 'flex', flexWrap: 'wrap', gap: 5 } }, slist.map(function (dn) { return el('button', { key: dn.id, onClick: function () { upd({ tab: 'explore', selected: dn.id }); }, 'aria-label': 'Open ' + dn.common, style: { fontSize: 11, padding: '3px 9px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + T.border, background: T.deeper, color: T.text } }, dn.common); }))
          ], { marginTop: 4 });
        } else {
          detail = el('div', { style: { fontSize: 12.5, color: T.soft, lineHeight: 1.5, marginTop: 4 } }, 'Select a continent to inspect its catalog and period mix. Darker green means more entries here, not more dinosaurs in the ancient ecosystem. Uneven rock exposure, access, and research history strongly affect the pattern.');
        }
        var pangaea = panel([
          el('div', { key: 'h', style: { fontWeight: 800, fontSize: 14, marginBottom: 4 } }, '🧩 The map looked different back then'),
          el('div', { key: 'b', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.55 } }, 'This shows where fossils are dug up today. Pangaea split into Laurasia and Gondwana while dinosaurs lived, so close relatives now occur across oceans. The rock moved with the continents; the animals did not cross today’s Atlantic.')
        ], { marginTop: 10, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.35)' });
        var others = DINOS.filter(function (dn) { return dn.group === 'other'; });
        var foot = el('div', { style: { fontSize: 11.5, color: T.soft, marginTop: 8, lineHeight: 1.5 } }, 'Not plotted: ' + others.map(function (other) { return other.common; }).join(', ') + ' — teaching foils that are not true dinosaurs. Counts describe this curated catalog, not global abundance or biodiversity.');
        return el('div', null, sectionTitle('🌎', 'Where in the world?', 'Present-day fossil locations, shaped by continental drift and an uneven discovery record.'), mapBox, stats, detail, pangaea, foot);
      }
      function renderClassroom() {
        var fp = d.filterPeriod || 'all', fdiet = d.filterDiet || 'all', fc = d.filterContinent || 'all', q = (d.query || '').trim().toLowerCase();
        var filtered = (fp !== 'all' || fdiet !== 'all' || fc !== 'all' || !!q);
        var list = DINOS.filter(function (dn) {
          if (fp !== 'all' && dn.period !== fp) return false;
          if (fdiet !== 'all' && dn.diet !== fdiet) return false;
          if (fc !== 'all' && continentOf(dn.region) !== fc) return false;
          if (q) { var hay = (dn.common + ' ' + dn.name + ' ' + dn.meaning + ' ' + dn.clade + ' ' + dn.region).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
          return true;
        });
        var CAP = 40;
        var STARTER = ['tyrannosaurus', 'triceratops', 'velociraptor', 'stegosaurus', 'brachiosaurus', 'spinosaurus', 'ankylosaurus', 'allosaurus', 'parasaurolophus', 'diplodocus', 'archaeopteryx', 'therizinosaurus', 'gallimimus', 'microraptor', 'iguanodon', 'pachycephalosaurus'];
        var deckList = filtered ? list.slice(0, CAP) : STARTER.map(byId).filter(Boolean);
        var deckLabel = filtered ? 'your Explore selection' : 'starter set';
        var deckEmpty = deckList.length === 0;
        function resCard(icon, title, body, btnLabel, onClick, disabled) {
          return panel([
            el('div', { key: 'h', style: { fontSize: 15, fontWeight: 800, marginBottom: 4 } }, icon + ' ' + title),
            el('div', { key: 'b', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.5, marginBottom: 10 } }, body),
            el('button', { key: 'btn', disabled: !!disabled, onClick: disabled ? undefined : onClick, style: { fontSize: 13, fontWeight: 700, padding: '8px 14px', borderRadius: 10, border: '1px solid ' + T.border, background: disabled ? T.deeper : '#15803d', color: disabled ? T.soft : '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.65 : 1 } }, btnLabel)
          ], { marginBottom: 10 });
        }
        return el('div', null,
          sectionTitle('🍎', 'Classroom resources', 'Printable activities for teachers and small groups. Each opens in a new window — allow pop-ups, then use your browser’s print.'),
          resCard('🃏', 'Species card deck', deckEmpty ? 'No species match your current Explore filters, so there is nothing to print yet. Clear a filter or change your search in Explore, then come back.' : ('Cut-out cards for a hands-on sorting activity: group them by period, diet, or family (a tactile version of the Classify tab). ' + (filtered ? ('Prints the ' + deckList.length + ' species your Explore filters select' + (list.length > CAP ? ' (the first ' + CAP + ' of ' + list.length + ').' : '.')) : ('No Explore filter is set, so this prints a ' + deckList.length + '-species starter set. Tip: set filters or a search in Explore to print exactly the set you want.'))), deckEmpty ? '🖨️ Nothing to print' : ('🖨️ Print ' + deckList.length + ' cards'), function () { printDeck(deckList, deckLabel); }, deckEmpty),
          resCard('📝', 'Quiz worksheet', 'Prints all ' + QUIZ.length + ' questions as a numbered, fill-in worksheet, followed by a separate answer key with the explanations.', '🖨️ Print quiz + answer key', function () { printQuizSheet(); }),
          panel([el('div', { key: 'n', style: { fontSize: 11.5, color: T.soft, lineHeight: 1.5 } }, 'Cards and answers carry the same facts and the “widely-cited estimate” caveats students see in the app.')], { marginTop: 4 })
        );
      }

      function DinoFieldStation3D(props) {
        var canvasRef = React.useRef(null);
        var statusRef = React.useRef(null);
        var cameraReadoutRef = React.useRef(null);
        var sceneRef = React.useRef(null);
        var cameraRef = React.useRef(null);
        var rendererRef = React.useRef(null);
        var cameraControlRef = React.useRef(null);
        var visualMaterialsRef = React.useRef(null);
        var bodyOpacityRef = React.useRef(28);
        var bodyOpacityState = React.useState(28), bodyOpacity = bodyOpacityState[0], setBodyOpacity = bodyOpacityState[1];
        var reconstructionProfile = reconstructionProfileFor(props.species);
        var yawRef = React.useRef({ speciesId: props.species.id, value: -0.35, pitch: 0.18, zoom: 1 });
        var autoRotateRef = React.useRef(props.autoRotate);
        var readySpeciesRef = React.useRef(null);
        var canvasFocusState = React.useState(false), canvasFocused = canvasFocusState[0], setCanvasFocused = canvasFocusState[1];
        autoRotateRef.current = props.autoRotate;
        if (yawRef.current.speciesId !== props.species.id) yawRef.current = { speciesId: props.species.id, value: -0.35, pitch: 0.18, zoom: 1 };

        React.useEffect(function () {
          var canvas = canvasRef.current;
          if (!canvas || typeof window === 'undefined' || typeof document === 'undefined') return;
          var alive = true;
          var frame = 0;
          var renderer = null;
          var scene = null;
          var camera = null;
          var model = null;
          var resizeObserver = null;
          var intersectionObserver = null;
          var inViewport = true;
          var pageVisible = document.visibilityState !== 'hidden';
          var lastCameraReadout = '';
          var cleanupFns = [];
          var activeCameraControl = null;
          var activeMaterialSet = null;

          function setStatus(msg) {
            if (statusRef.current) statusRef.current.textContent = msg;
          }

          function ensureThree(done) {
            // Shared resilient loader (multi-CDN + timeout). Replaces a local
            // loader that re-listened on a dead script tag after failure.
            window.StemLab.ensureThree({ orbit: false }).then(function () { done(window.THREE); }).catch(function () { setStatus('3D engine failed to load. The evidence panels still work.'); });
          }

          function disposeObject(obj) {
            if (!obj) return;
            obj.traverse(function (child) {
              if (child.geometry && child.geometry.dispose) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(function (m) { if (m && m.dispose) m.dispose(); });
                else { if (child.material.map && child.material.map.dispose) child.material.map.dispose(); if (child.material.dispose) child.material.dispose(); }
              }
            });
          }

          ensureThree(function (THREE) {
            if (!alive) return;
            var dn = props.species;
            var len = Math.max(0.5, Number(dn.lengthM) || 1);
            var ht = Math.max(0.25, Number(dn.heightM) || 0.5);
            var group = dn.group || 'theropod';
            var isSauropod = group === 'sauropod';
            var isTheropod = group === 'theropod';
            var bodyColor = props.dietColor || '#38bdf8';
            var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            var yaw = yawRef.current.value;
            var pitch = Number(yawRef.current.pitch);
            var zoom = Number(yawRef.current.zoom);
            if (!isFinite(pitch)) pitch = 0.18;
            if (!isFinite(zoom)) zoom = 1;
            var dragging = false;
            var lastX = 0;
            var lastY = 0;
            var interactionPauseUntil = 0;
            function clampView(value, min, max) { return Math.max(min, Math.min(max, value)); }
            function pauseAutoRotate(ms) { interactionPauseUntil = Math.max(interactionPauseUntil, performance.now() + (ms || 0)); }

            scene = sceneRef.current;
            if (!scene) {
              scene = new THREE.Scene();
              sceneRef.current = scene;
            } else {
              if (scene.background && scene.background.dispose) scene.background.dispose();
              var previousSceneChildren = scene.children.slice();
              previousSceneChildren.forEach(function (child) { disposeObject(child); scene.remove(child); });
              scene.background = null;
              scene.fog = null;
            }
            var skyCanvas = document.createElement('canvas');
            skyCanvas.width = 2;
            skyCanvas.height = 256;
            var skyContext = skyCanvas.getContext('2d');
            if (skyContext) {
              var skyGradient = skyContext.createLinearGradient(0, 0, 0, 256);
              skyGradient.addColorStop(0, '#07111f');
              skyGradient.addColorStop(0.55, '#10263f');
              skyGradient.addColorStop(1, '#29384a');
              skyContext.fillStyle = skyGradient;
              skyContext.fillRect(0, 0, 2, 256);
              scene.background = new THREE.CanvasTexture(skyCanvas);
              if (THREE.sRGBEncoding !== undefined) scene.background.encoding = THREE.sRGBEncoding;
            } else {
              scene.background = new THREE.Color(0x0f172a);
            }
            scene.fog = new THREE.Fog(0x0f172a, Math.max(18, len * 0.7), Math.max(45, len * 2.4));

            camera = cameraRef.current;
            if (!camera) {
              camera = new THREE.PerspectiveCamera(52, 1, 0.1, 1000);
              cameraRef.current = camera;
            }
            renderer = rendererRef.current;
            if (!renderer) {
              renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
              rendererRef.current = renderer;
            }
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
            if (THREE.ACESFilmicToneMapping !== undefined) {
              renderer.toneMapping = THREE.ACESFilmicToneMapping;
              renderer.toneMappingExposure = 1.08;
            }
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            scene.add(new THREE.AmbientLight(0xffffff, 0.52));
            scene.add(new THREE.HemisphereLight(0x9ddcff, 0x3a2418, 0.42));
            var sun = new THREE.DirectionalLight(0xfff4df, 0.95);
            sun.position.set(-8, 14, 10);
            sun.castShadow = true;
            sun.shadow.mapSize.width = 1024;
            sun.shadow.mapSize.height = 1024;
            sun.shadow.camera.near = 0.5;
            sun.shadow.camera.far = Math.max(60, len * 3.2);
            var shadowSpan = Math.max(12, len * 0.82);
            sun.shadow.camera.left = -shadowSpan;
            sun.shadow.camera.right = shadowSpan;
            sun.shadow.camera.top = shadowSpan;
            sun.shadow.camera.bottom = -shadowSpan;
            sun.shadow.bias = -0.0005;
            scene.add(sun);
            var fill = new THREE.DirectionalLight(0x9ddcff, 0.35);
            fill.position.set(10, 6, -8);
            scene.add(fill);
            var rim = new THREE.DirectionalLight(0xfbbf24, 0.28);
            rim.position.set(-12, 4, -10);
            scene.add(rim);

            var groundWidth = Math.max(26, len * 1.7);
            var groundDepth = Math.max(16, len * 0.95);
            var ground = new THREE.Mesh(
              new THREE.PlaneGeometry(groundWidth, groundDepth),
              new THREE.MeshPhongMaterial({ color: 0x172033, shininess: 12 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);
            var digPad = new THREE.Mesh(
              new THREE.BoxGeometry(Math.max(8, len * 0.72), 0.06, Math.max(3.4, len * 0.18)),
              new THREE.MeshPhongMaterial({ color: 0x3a2a22, shininess: 8 })
            );
            digPad.position.set(0, 0.025, 0);
            digPad.receiveShadow = true;
            scene.add(digPad);
            var stratumColors = [0x5b3427, 0x7c4a31, 0x9a6a3a, 0x3f5b52];
            for (var si = 0; si < stratumColors.length; si++) {
              var layer = new THREE.Mesh(
                new THREE.BoxGeometry(Math.max(10, len * 0.92), 0.09 + si * 0.012, 0.11),
                new THREE.MeshPhongMaterial({ color: stratumColors[si], shininess: 6 })
              );
              layer.position.set(0, 0.08 + si * 0.13, -Math.max(4.0, len * 0.34));
              layer.receiveShadow = true;
              scene.add(layer);
            }
            var grid = new THREE.GridHelper(groundWidth, 18, 0x475569, 0x243044);
            grid.position.y = 0.01;
            scene.add(grid);

            var contactShadowCanvas = document.createElement('canvas');
            contactShadowCanvas.width = 128;
            contactShadowCanvas.height = 128;
            var contactShadowContext = contactShadowCanvas.getContext('2d');
            if (contactShadowContext) {
              var contactShadowGradient = contactShadowContext.createRadialGradient(64, 64, 8, 64, 64, 62);
              contactShadowGradient.addColorStop(0, 'rgba(0,0,0,0.50)');
              contactShadowGradient.addColorStop(0.62, 'rgba(0,0,0,0.20)');
              contactShadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
              contactShadowContext.fillStyle = contactShadowGradient;
              contactShadowContext.fillRect(0, 0, 128, 128);
              var contactShadowTexture = new THREE.CanvasTexture(contactShadowCanvas);
              var contactShadow = new THREE.Mesh(
                new THREE.PlaneGeometry(Math.max(5.5, len * 0.92), Math.max(2.8, ht * 1.18)),
                new THREE.MeshBasicMaterial({ map: contactShadowTexture, transparent: true, opacity: 0.76, depthWrite: false })
              );
              contactShadow.rotation.x = -Math.PI / 2;
              contactShadow.position.set(len * 0.03, 0.066, 0);
              contactShadow.renderOrder = 1;
              scene.add(contactShadow);
            }

            model = new THREE.Group();
            scene.add(model);

            var inferenceOpacity = Math.max(10, Math.min(75, Number(bodyOpacityRef.current) || 28)) / 100;
            var boneMat = new THREE.MeshPhongMaterial({ color: 0xf8fafc, emissive: 0x18222f, shininess: 42 });
            var jointMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, shininess: 32 });
            var anatomyCalloutMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.62, depthWrite: false });
            var bodyMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(bodyColor), transparent: true, opacity: inferenceOpacity, shininess: 25, side: THREE.DoubleSide, depthWrite: false });
            var headMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(bodyColor), transparent: true, opacity: Math.min(0.87, inferenceOpacity + 0.12), shininess: 30, depthWrite: false });
            var bodyWireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(bodyColor), transparent: true, opacity: Math.max(0.10, inferenceOpacity * 0.64), wireframe: true, depthWrite: false });
            var anatomyAccentMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(bodyColor), transparent: true, opacity: Math.min(0.90, inferenceOpacity + 0.40), shininess: 38, side: THREE.DoubleSide });
            activeMaterialSet = { body: bodyMat, head: headMat, wire: bodyWireMat, accent: anatomyAccentMat };
            visualMaterialsRef.current = activeMaterialSet;
            var markerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
            var loggedMarkerMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
            var loggedRingMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
            var evidencePathMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.24, depthWrite: false, depthTest: false });
            var activePathMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.32, depthWrite: false, depthTest: false });
            var loggedPathMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.46, depthWrite: false, depthTest: false });
            var assemblySocketMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
            var assemblyFocusRingMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
            var assemblyPlacedRingMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
            var assemblyPlacedMat = new THREE.MeshPhongMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.88, shininess: 38 });
            var assemblyFocusMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.94, shininess: 44 });
            var assemblyLooseMat = new THREE.MeshPhongMaterial({ color: 0xf5e6c8, transparent: true, opacity: 0.78, shininess: 18 });
            var assemblyLockedMat = new THREE.MeshPhongMaterial({ color: 0x8b7358, transparent: true, opacity: 0.34, shininess: 8 });
            var claimEvidenceMat = new THREE.MeshPhongMaterial({ color: 0x5eead4, transparent: true, opacity: 0.96, shininess: 58 });
            var claimEvidenceRingMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
            var claimEvidenceBeamMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.30, depthWrite: false, depthTest: false });
            var claimEvidenceTrailMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.46, depthWrite: false, depthTest: false });
            var scanPulse = null;
            var assemblyPulse = null;
            var claimEvidencePulse = null;
            var loggedRings = [];
            var scanTargetId = props.scanTarget || 'skull';
            var loggedAnchors = props.loggedAnchors || {};
            var assemblyPlaced = props.assemblyPlaced || {};
            var assemblyFocusId = props.assemblyFocus || 'skull';
            var claimEvidenceId = props.claimEvidenceFocus || null;
            var claimEvidenceAnchorId = props.claimEvidenceAnchor || null;
            var assemblyUnlocked = props.assemblyUnlocked !== false;

            function vec(x, y, z) { return new THREE.Vector3(x, y, z); }
            function addBone(a, b, radius) {
              if (!props.showSkeleton) return null;
              var dir = new THREE.Vector3().subVectors(b, a);
              var dist = dir.length();
              if (!dist) return null;
              var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dist, 10), boneMat);
              mesh.position.copy(a).add(b).multiplyScalar(0.5);
              mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
              mesh.castShadow = true;
              model.add(mesh);
              return mesh;
            }
            function addJoint(p, radius) {
              if (!props.showSkeleton) return null;
              var mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), jointMat);
              mesh.position.copy(p);
              mesh.castShadow = true;
              model.add(mesh);
              return mesh;
            }
            function addEllipsoid(pos, scale, mat) {
              if (!props.showBody) return null;
              var mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), mat);
              mesh.position.copy(pos);
              mesh.scale.copy(scale);
              mesh.castShadow = true;
              model.add(mesh);
              return mesh;
            }
            function addSoftTissueCylinder(a, b, startRadius, endRadius) {
              if (!props.showBody) return null;
              var dir = new THREE.Vector3().subVectors(b, a);
              var dist = dir.length();
              if (!dist) return null;
              var mesh = new THREE.Mesh(new THREE.CylinderGeometry(endRadius, startRadius, dist, 14), bodyMat);
              mesh.position.copy(a).add(b).multiplyScalar(0.5);
              mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
              mesh.castShadow = true;
              mesh.renderOrder = 6;
              model.add(mesh);
              return mesh;
            }
            function addBodyContour(mesh) {
              if (!mesh || !props.showBody) return null;
              var contour = new THREE.Mesh(mesh.geometry.clone(), bodyWireMat);
              contour.position.copy(mesh.position);
              contour.quaternion.copy(mesh.quaternion);
              contour.scale.copy(mesh.scale);
              contour.renderOrder = 9;
              model.add(contour);
              return contour;
            }
            function addSceneCylinder(a, b, radius, mat) {
              var dir = new THREE.Vector3().subVectors(b, a);
              var dist = dir.length();
              if (!dist) return null;
              var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dist, 8), mat);
              mesh.position.copy(a).add(b).multiplyScalar(0.5);
              mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
              mesh.renderOrder = 2;
              scene.add(mesh);
              return mesh;
            }
            function addAccentCone(base, tip, radius, mat) {
              if (!props.showBody) return null;
              var dir = new THREE.Vector3().subVectors(tip, base);
              var dist = dir.length();
              if (!dist) return null;
              var mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, dist, 10), mat || anatomyAccentMat);
              mesh.position.copy(base).add(tip).multiplyScalar(0.5);
              mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
              mesh.castShadow = true;
              model.add(mesh);
              return mesh;
            }
            function addModelCylinder(a, b, radius, mat, order) {
              var dir = new THREE.Vector3().subVectors(b, a);
              var dist = dir.length();
              if (!dist) return null;
              var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dist, 10), mat);
              mesh.position.copy(a).add(b).multiplyScalar(0.5);
              mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
              mesh.renderOrder = order || 8;
              model.add(mesh);
              return mesh;
            }
            function addAssemblyCylinder(parent, a, b, radius, mat, order) {
              var dir = new THREE.Vector3().subVectors(b, a);
              var dist = dir.length();
              if (!dist) return null;
              var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dist, 12), mat);
              mesh.position.copy(a).add(b).multiplyScalar(0.5);
              mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
              mesh.castShadow = true;
              mesh.renderOrder = order || 16;
              parent.add(mesh);
              return mesh;
            }
            function addAssemblyEllipsoid(parent, pos, scale, mat, order) {
              var mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), mat);
              mesh.position.copy(pos);
              mesh.scale.copy(scale);
              mesh.castShadow = true;
              mesh.renderOrder = order || 16;
              parent.add(mesh);
              return mesh;
            }
            function addGroundOval(x, z, sx, sz, mat, rot) {
              var mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 8), mat);
              mesh.position.set(x, 0.045, z);
              mesh.scale.set(sx, 0.012, sz);
              mesh.rotation.y = rot || 0;
              mesh.receiveShadow = true;
              scene.add(mesh);
              return mesh;
            }

            var measurementIntervalLabels = [];
            function addTextLabel(text, pos, color, scaleFactor, parent) {
              var labelCanvas = document.createElement('canvas');
              labelCanvas.width = 256;
              labelCanvas.height = 96;
              var ctx2d = labelCanvas.getContext('2d');
              if (!ctx2d) return null;
              ctx2d.fillStyle = 'rgba(15,23,42,0.82)';
              ctx2d.strokeStyle = color || '#38bdf8';
              ctx2d.lineWidth = 4;
              ctx2d.beginPath();
              ctx2d.roundRect ? ctx2d.roundRect(10, 18, 236, 52, 18) : ctx2d.rect(10, 18, 236, 52);
              ctx2d.fill();
              ctx2d.stroke();
              ctx2d.fillStyle = '#e2e8f0';
              ctx2d.font = 'bold 28px Arial, sans-serif';
              ctx2d.textAlign = 'center';
              ctx2d.textBaseline = 'middle';
              ctx2d.fillText(text, 128, 45);
              var texture = new THREE.CanvasTexture(labelCanvas);
              texture.needsUpdate = true;
              var material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
              var sprite = new THREE.Sprite(material);
              sprite.position.copy(pos);
              var labelScale = scaleFactor == null ? 1 : scaleFactor;
              sprite.scale.set(Math.max(1.25, len * 0.13) * labelScale, Math.max(0.46, ht * 0.15) * labelScale, 1);
              sprite.renderOrder = 20;
              (parent || model).add(sprite);
              return sprite;
            }
            var hip = vec(len * 0.12, Math.max(0.35, ht * 0.45) * reconstructionProfile.stance, 0);
            var shoulder = vec(-len * 0.18, Math.max(0.35, isSauropod ? ht * 0.55 : ht * 0.48) * reconstructionProfile.stance * reconstructionProfile.shoulder, 0);
            var tail = vec(len * 0.52, Math.max(0.22, ht * 0.34) * reconstructionProfile.stance * reconstructionProfile.tail, 0);
            var head = vec(-len * 0.42, Math.max(0.5, isSauropod ? ht * 0.90 : ht * 0.68) * reconstructionProfile.neck, 0);
            var snout = vec(-len * 0.49, Math.max(0.42, isSauropod ? ht * 0.86 : ht * 0.64) * reconstructionProfile.neck, 0);
            var bodyCenter = new THREE.Vector3().copy(hip).add(shoulder).multiplyScalar(0.5);
            var bodyLen = Math.max(0.45, Math.abs(hip.x - shoulder.x) * 0.72);
            var bodyHeight = Math.max(0.22, ht * (isSauropod ? 0.22 : 0.27)) * reconstructionProfile.bodyHeight;
            var bodyDepth = Math.max(0.16, bodyHeight * (isTheropod ? 0.92 : 1.08)) * reconstructionProfile.bodyDepth;
            var evidenceAnchorPoints = { skull: head, shoulder: shoulder, hip: hip };

            var footprintMat = new THREE.MeshPhongMaterial({ color: 0x2b3a4f, transparent: true, opacity: 0.78, shininess: 4 });
            for (var fp = 0; fp < 7; fp++) {
              var fx = -len * 0.34 + fp * len * 0.11;
              var fz = (fp % 2 ? -1 : 1) * Math.max(0.46, bodyDepth * 1.35);
              addGroundOval(fx, fz, Math.max(0.11, len * 0.020), Math.max(0.18, len * 0.035), footprintMat, -0.22 + fp * 0.06);
            }
            var rulerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
            var rulerZ = Math.max(1.05, bodyDepth * 2.45);
            var rulerR = Math.max(0.012, ht * 0.004);
            addSceneCylinder(vec(snout.x, 0.05, rulerZ), vec(tail.x, 0.05, rulerZ), rulerR, rulerMat);
            addSceneCylinder(vec(snout.x, 0.05, rulerZ - 0.22), vec(snout.x, 0.05, rulerZ + 0.22), rulerR, rulerMat);
            addSceneCylinder(vec(tail.x, 0.05, rulerZ - 0.22), vec(tail.x, 0.05, rulerZ + 0.22), rulerR, rulerMat);
            var rulerSpan = Math.max(0.1, tail.x - snout.x);
            var rulerTicks = Math.min(40, Math.max(1, Math.floor(rulerSpan)));
            for (var rt = 0; rt <= rulerTicks; rt++) {
              var tickX = snout.x + Math.min(rulerSpan, rt);
              var tickHalf = rt % 5 === 0 ? 0.20 : 0.11;
              addSceneCylinder(vec(tickX, 0.052, rulerZ - tickHalf), vec(tickX, 0.052, rulerZ + tickHalf), Math.max(0.008, rulerR * 0.66), rulerMat);
              if (rt % 5 === 0) measurementIntervalLabels.push(addTextLabel(rt + ' m', vec(tickX, Math.max(0.20, ht * 0.025), rulerZ + Math.max(0.36, bodyDepth * 0.45)), '#38bdf8', 0.46, scene));
            }
            addTextLabel(fmtLength(dn.lengthM), vec(tail.x, Math.max(0.20, ht * 0.025), rulerZ - Math.max(0.42, bodyDepth * 0.50)), '#38bdf8', 0.52, scene);
            var heightGuideMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
            var heightGuideX = snout.x - Math.max(0.42, len * 0.035);
            var heightGuideZ = -Math.max(1.0, bodyDepth * 2.2);
            var heightGuideTop = Math.max(0.5, ht);
            addSceneCylinder(vec(heightGuideX, 0.04, heightGuideZ), vec(heightGuideX, heightGuideTop, heightGuideZ), Math.max(0.010, rulerR * 0.82), heightGuideMat);
            var heightTicks = Math.min(30, Math.max(1, Math.ceil(heightGuideTop)));
            for (var htick = 0; htick <= heightTicks; htick++) {
              var tickY = Math.min(heightGuideTop, htick);
              var heightTickHalf = htick % 5 === 0 ? 0.24 : 0.13;
              addSceneCylinder(vec(heightGuideX - heightTickHalf, tickY, heightGuideZ), vec(heightGuideX + heightTickHalf, tickY, heightGuideZ), Math.max(0.008, rulerR * 0.64), heightGuideMat);
              if (htick % 5 === 0) measurementIntervalLabels.push(addTextLabel(htick + ' m', vec(heightGuideX - Math.max(0.52, len * 0.035), tickY, heightGuideZ), '#facc15', 0.44, scene));
            }
            addTextLabel(fmtLength(dn.heightM), vec(heightGuideX + Math.max(0.65, len * 0.045), heightGuideTop, heightGuideZ), '#facc15', 0.50, scene);
            var surveyPostMat = new THREE.MeshPhongMaterial({ color: 0xf8fafc, shininess: 24 });
            var surveyRopeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
            var surveyHalfX = Math.max(4.6, len * 0.56);
            var surveyHalfZ = Math.max(2.5, bodyDepth * 3.3);
            var surveyCorners = [
              vec(-surveyHalfX, 0, -surveyHalfZ),
              vec(surveyHalfX, 0, -surveyHalfZ),
              vec(surveyHalfX, 0, surveyHalfZ),
              vec(-surveyHalfX, 0, surveyHalfZ)
            ];
            surveyCorners.forEach(function (corner, cornerIndex) {
              addSceneCylinder(corner, vec(corner.x, 0.46, corner.z), Math.max(0.025, ht * 0.007), surveyPostMat);
              var nextCorner = surveyCorners[(cornerIndex + 1) % surveyCorners.length];
              addSceneCylinder(vec(corner.x, 0.38, corner.z), vec(nextCorner.x, 0.38, nextCorner.z), Math.max(0.010, ht * 0.003), surveyRopeMat);
            });
            var compassRadius = Math.max(0.26, ht * 0.065);
            var compassCenter = vec(-surveyHalfX * 0.78, 0.055, -surveyHalfZ * 0.70);
            var compassRing = new THREE.Mesh(new THREE.TorusGeometry(compassRadius, Math.max(0.010, ht * 0.003), 8, 36), surveyRopeMat);
            compassRing.position.copy(compassCenter);
            compassRing.rotation.x = Math.PI / 2;
            scene.add(compassRing);
            var compassNorth = vec(compassCenter.x, compassCenter.y, compassCenter.z - compassRadius * 1.55);
            addSceneCylinder(compassCenter, compassNorth, Math.max(0.012, ht * 0.0035), surveyRopeMat);
            addSceneCylinder(compassNorth, vec(compassNorth.x - compassRadius * 0.30, compassNorth.y, compassNorth.z + compassRadius * 0.42), Math.max(0.012, ht * 0.0035), surveyRopeMat);
            addSceneCylinder(compassNorth, vec(compassNorth.x + compassRadius * 0.30, compassNorth.y, compassNorth.z + compassRadius * 0.42), Math.max(0.012, ht * 0.0035), surveyRopeMat);

            var bodyShell = addEllipsoid(bodyCenter, vec(bodyLen, bodyHeight, bodyDepth), bodyMat);
            var headShell = addEllipsoid(head, vec(Math.max(0.18, len * (isSauropod ? 0.035 : 0.055)) * reconstructionProfile.head, Math.max(0.12, ht * 0.055) * reconstructionProfile.head, Math.max(0.10, ht * 0.050) * reconstructionProfile.head), headMat);
            addBodyContour(bodyShell);
            addBodyContour(headShell);
            if (props.showBody) {
              var neckShell = addSoftTissueCylinder(shoulder, head, Math.max(0.11, bodyHeight * 0.42), Math.max(0.08, ht * 0.038));
              addBodyContour(neckShell);
              var tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.04, ht * 0.025), Math.max(0.16, ht * 0.060), hip.distanceTo(tail), 14), bodyMat);
              tailMesh.position.copy(hip).add(tail).multiplyScalar(0.5);
              tailMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(tail, hip).normalize());
              tailMesh.castShadow = true;
              model.add(tailMesh);
              addBodyContour(tailMesh);

              var cladeName = String(dn.clade || '');
              if (/Ceratops/i.test(cladeName)) {
                var frillCenter = head.clone().add(vec(len * 0.025, ht * 0.035, 0));
                addEllipsoid(frillCenter, vec(Math.max(0.06, len * 0.014), Math.max(0.22, ht * 0.15), Math.max(0.20, bodyDepth * 0.92)), anatomyAccentMat);
                [-1, 1].forEach(function (side) {
                  var hornBase = head.clone().add(vec(-len * 0.018, ht * 0.040, side * bodyDepth * 0.30));
                  addAccentCone(hornBase, hornBase.clone().add(vec(-Math.max(0.28, len * 0.055), Math.max(0.12, ht * 0.055), side * bodyDepth * 0.10)), Math.max(0.035, ht * 0.014));
                });
              } else if (/Stegosaur/i.test(cladeName)) {
                for (var plateIndex = 0; plateIndex < 7; plateIndex++) {
                  var plateT = plateIndex / 6;
                  var plateX = shoulder.x + (hip.x - shoulder.x + len * 0.16) * plateT;
                  var plateHeight = Math.max(0.20, bodyHeight * (0.70 + Math.sin(plateT * Math.PI) * 0.72));
                  var plate = addAccentCone(vec(plateX, bodyCenter.y + bodyHeight * 0.72, 0), vec(plateX, bodyCenter.y + bodyHeight * 0.72 + plateHeight, 0), Math.max(0.10, bodyDepth * 0.34));
                  if (plate) plate.scale.z = 0.30;
                }
              } else if (/Spinosaur/i.test(cladeName)) {
                for (var sailIndex = 0; sailIndex < 9; sailIndex++) {
                  var sailT = sailIndex / 8;
                  var sailX = shoulder.x + (hip.x - shoulder.x) * sailT;
                  var sailHeight = Math.max(0.18, ht * (0.10 + Math.sin(sailT * Math.PI) * 0.16));
                  addAccentCone(vec(sailX, bodyCenter.y + bodyHeight * 0.58, 0), vec(sailX, bodyCenter.y + bodyHeight * 0.58 + sailHeight, 0), Math.max(0.025, ht * 0.010));
                }
              } else if (/Ankylosaur/i.test(cladeName)) {
                for (var armorIndex = 0; armorIndex < 8; armorIndex++) {
                  var armorT = armorIndex / 7;
                  var armorX = shoulder.x + (hip.x - shoulder.x) * armorT;
                  [-1, 1].forEach(function (side) {
                    addEllipsoid(vec(armorX, bodyCenter.y + bodyHeight * 0.62, side * bodyDepth * 0.56), vec(Math.max(0.07, len * 0.012), Math.max(0.045, ht * 0.018), Math.max(0.05, bodyDepth * 0.16)), anatomyAccentMat);
                  });
                }
                addEllipsoid(tail.clone(), vec(Math.max(0.18, len * 0.032), Math.max(0.10, ht * 0.040), Math.max(0.13, bodyDepth * 0.52)), anatomyAccentMat);
              } else if (/Hadrosaur|Lambeosaur/i.test(cladeName)) {
                var crestBase = head.clone().add(vec(len * 0.012, ht * 0.045, 0));
                addAccentCone(crestBase, crestBase.clone().add(vec(Math.max(0.24, len * 0.050), Math.max(0.18, ht * 0.090), 0)), Math.max(0.06, ht * 0.024));
              } else if (/Pachycephalosaur/i.test(cladeName)) {
                addEllipsoid(head.clone().add(vec(0, Math.max(0.08, ht * 0.055), 0)), vec(Math.max(0.14, len * 0.035), Math.max(0.11, ht * 0.050), Math.max(0.12, bodyDepth * 0.62)), anatomyAccentMat);
              } else if (/Therizinosaur/i.test(cladeName)) {
                [-1, 1].forEach(function (side) {
                  for (var clawIndex = -1; clawIndex <= 1; clawIndex++) {
                    var clawBase = shoulder.clone().add(vec(-len * 0.040, -ht * 0.12, side * (bodyDepth * 0.46 + clawIndex * bodyDepth * 0.12)));
                    addAccentCone(clawBase, clawBase.clone().add(vec(-Math.max(0.34, len * 0.095), -Math.max(0.06, ht * 0.025), side * clawIndex * bodyDepth * 0.08)), Math.max(0.018, ht * 0.006));
                  }
                });
              } else if (/Dromaeosaur|Troodont/i.test(cladeName)) {
                [-1, 1].forEach(function (side) {
                  for (var featherIndex = 0; featherIndex < 5; featherIndex++) {
                    var featherT = 0.28 + featherIndex * 0.11;
                    var featherBase = new THREE.Vector3().copy(hip).lerp(tail, featherT);
                    var featherTip = featherBase.clone().add(vec(-len * 0.018, Math.max(0.08, ht * 0.035), side * Math.max(0.18, bodyDepth * (0.58 + featherIndex * 0.07))));
                    var feather = addAccentCone(featherBase, featherTip, Math.max(0.012, ht * 0.0045));
                    if (feather) feather.scale.x = 0.58;
                  }
                });
              } else if (/Tyrannosaur/i.test(cladeName)) {
                var tyrantSnout = new THREE.Vector3().copy(head).lerp(snout, 0.60);
                addEllipsoid(tyrantSnout, vec(Math.max(0.16, len * 0.040), Math.max(0.10, ht * 0.040), Math.max(0.10, bodyDepth * 0.52)), anatomyAccentMat);
                [-1, 1].forEach(function (side) {
                  addEllipsoid(head.clone().add(vec(-len * 0.012, ht * 0.045, side * bodyDepth * 0.32)), vec(Math.max(0.06, len * 0.012), Math.max(0.04, ht * 0.018), Math.max(0.04, bodyDepth * 0.15)), anatomyAccentMat);
                });
              } else if (/Abelisaur/i.test(cladeName)) {
                [-1, 1].forEach(function (side) {
                  var abelisaurHornBase = head.clone().add(vec(-len * 0.010, ht * 0.050, side * bodyDepth * 0.28));
                  addAccentCone(abelisaurHornBase, abelisaurHornBase.clone().add(vec(0, Math.max(0.10, ht * 0.065), side * bodyDepth * 0.08)), Math.max(0.030, ht * 0.012));
                });
              } else if (/Oviraptor/i.test(cladeName)) {
                var oviraptorCrestBase = head.clone().add(vec(len * 0.006, ht * 0.038, 0));
                var oviraptorCrest = addAccentCone(oviraptorCrestBase, oviraptorCrestBase.clone().add(vec(len * 0.018, Math.max(0.18, ht * 0.13), 0)), Math.max(0.07, ht * 0.030));
                if (oviraptorCrest) oviraptorCrest.scale.z = 0.46;
                var beak = addAccentCone(snout, snout.clone().add(vec(-Math.max(0.16, len * 0.040), 0, 0)), Math.max(0.055, ht * 0.022));
                if (beak) beak.scale.z = 1.28;
              } else if (/Iguanodont/i.test(cladeName)) {
                [-1, 1].forEach(function (side) {
                  var thumbBase = vec(shoulder.x - len * 0.035, Math.max(0.12, shoulder.y * 0.25), side * bodyDepth * 0.52);
                  addAccentCone(thumbBase, thumbBase.clone().add(vec(-Math.max(0.12, len * 0.025), Math.max(0.10, ht * 0.050), side * bodyDepth * 0.08)), Math.max(0.020, ht * 0.008));
                });
              }
            }

            addBone(tail, hip, Math.max(0.035, ht * 0.012));
            addBone(hip, shoulder, Math.max(0.040, ht * 0.014));
            addBone(shoulder, head, Math.max(0.035, ht * (isSauropod ? 0.014 : 0.011)));
            addBone(head, snout, Math.max(0.030, ht * 0.010));
            [tail, hip, shoulder, head, snout].forEach(function (p) { addJoint(p, Math.max(0.055, ht * 0.020)); });
            if (props.showSkeleton) {
              var ribCount = 6;
              for (var ribIndex = 0; ribIndex < ribCount; ribIndex++) {
                var ribT = (ribIndex + 1) / (ribCount + 1);
                var ribX = shoulder.x + (hip.x - shoulder.x) * ribT;
                var ribRadius = Math.max(0.13, bodyDepth * (0.62 + Math.sin(ribT * Math.PI) * 0.24));
                var ribMesh = new THREE.Mesh(new THREE.TorusGeometry(ribRadius, Math.max(0.010, ht * 0.004), 8, 30), boneMat);
                ribMesh.position.set(ribX, bodyCenter.y, 0);
                ribMesh.rotation.y = Math.PI / 2;
                ribMesh.scale.y = Math.max(0.58, bodyHeight / ribRadius * 0.82);
                ribMesh.castShadow = true;
                model.add(ribMesh);
              }
              var pelvisHalf = Math.max(0.16, bodyDepth * 0.72);
              addBone(vec(hip.x, hip.y, -pelvisHalf), vec(hip.x, hip.y, pelvisHalf), Math.max(0.035, ht * 0.013));
              addJoint(vec(hip.x, hip.y, -pelvisHalf), Math.max(0.045, ht * 0.017));
              addJoint(vec(hip.x, hip.y, pelvisHalf), Math.max(0.045, ht * 0.017));
              for (var spineIndex = 1; spineIndex < 6; spineIndex++) {
                var spineT = spineIndex / 6;
                addJoint(new THREE.Vector3().copy(shoulder).lerp(hip, spineT), Math.max(0.032, ht * 0.011));
              }
              for (var tailJointIndex = 1; tailJointIndex < 7; tailJointIndex++) {
                var tailT = tailJointIndex / 7;
                addJoint(new THREE.Vector3().copy(hip).lerp(tail, tailT), Math.max(0.024, ht * 0.008));
              }
              for (var neckIndex = 1; neckIndex < 4; neckIndex++) {
                var neckT = neckIndex / 4;
                addJoint(new THREE.Vector3().copy(shoulder).lerp(head, neckT), Math.max(0.028, ht * 0.009));
              }
              var jawDrop = Math.max(0.06, ht * 0.028);
              addBone(head.clone().add(vec(0, -jawDrop, 0)), snout.clone().add(vec(0, -jawDrop * 0.72, 0)), Math.max(0.020, ht * 0.007));
              function addAnatomyCallout(label, anchor, offset) {
                var labelPoint = anchor.clone().add(offset);
                addModelCylinder(anchor, labelPoint, Math.max(0.008, ht * 0.0028), anatomyCalloutMat, 18);
                addTextLabel(label, labelPoint, '#f8fafc', 0.70);
              }
              var calloutLift = Math.max(0.42, ht * 0.14);
              var tailCalloutPoint = new THREE.Vector3().copy(hip).lerp(tail, 0.58);
              addAnatomyCallout('Skull', head, vec(-len * 0.025, calloutLift, bodyDepth * 0.72));
              addAnatomyCallout('Spine', bodyCenter, vec(-len * 0.025, calloutLift * 1.15, -bodyDepth * 0.92));
              addAnatomyCallout('Pelvis', hip, vec(len * 0.018, calloutLift, bodyDepth * 0.88));
              addAnatomyCallout('Tail', tailCalloutPoint, vec(len * 0.035, calloutLift * 0.72, -bodyDepth * 0.76));
            }

            function addLeg(x, z, front) {
              var top = front ? shoulder : hip;
              var knee = vec(x + (front ? -len * 0.015 : len * 0.025), Math.max(0.18, top.y * 0.48), z);
              var foot = vec(x + (front ? -len * 0.035 : len * 0.070), 0.06, z + (z >= 0 ? 0.10 : -0.10));
              addBone(vec(x, top.y, z), knee, Math.max(0.035, ht * 0.012));
              addBone(knee, foot, Math.max(0.030, ht * 0.010));
              addJoint(knee, Math.max(0.050, ht * 0.016));
              if (props.showBody) {
                addBodyContour(addSoftTissueCylinder(vec(x, top.y, z), knee, Math.max(0.06, ht * 0.030), Math.max(0.045, ht * 0.022)));
                addBodyContour(addSoftTissueCylinder(knee, foot, Math.max(0.045, ht * 0.022), Math.max(0.030, ht * 0.014)));
                addBodyContour(addEllipsoid(foot, vec(Math.max(0.12, len * 0.018), Math.max(0.035, ht * 0.016), Math.max(0.04, ht * 0.018)), headMat));
              }
            }
            var stance = Math.max(0.18, bodyDepth * 0.55);
            addLeg(hip.x, stance, false);
            addLeg(hip.x, -stance, false);
            if (!isTheropod || isSauropod) {
              addLeg(shoulder.x, stance, true);
              addLeg(shoulder.x, -stance, true);
            } else {
              var armStartL = vec(shoulder.x, shoulder.y * 0.93, stance * 0.42);
              var armStartR = vec(shoulder.x, shoulder.y * 0.93, -stance * 0.42);
              var armEndL = vec(shoulder.x - len * 0.050, shoulder.y * 0.55, stance * 0.55);
              var armEndR = vec(shoulder.x - len * 0.050, shoulder.y * 0.55, -stance * 0.55);
              addBone(armStartL, armEndL, Math.max(0.018, ht * 0.006));
              addBone(armStartR, armEndR, Math.max(0.018, ht * 0.006));
              if (props.showBody) {
                addBodyContour(addSoftTissueCylinder(armStartL, armEndL, Math.max(0.025, ht * 0.010), Math.max(0.018, ht * 0.007)));
                addBodyContour(addSoftTissueCylinder(armStartR, armEndR, Math.max(0.025, ht * 0.010), Math.max(0.018, ht * 0.007)));
              }
            }

            function addAssemblySocket(piece, active, placed) {
              var point = piece.point.clone();
              point.y += Math.max(0.09, ht * 0.028);
              var ring = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.18, ht * 0.056), Math.max(0.010, ht * 0.0045), 10, 42), placed ? assemblyPlacedRingMat : (active ? assemblyFocusRingMat : assemblySocketMat));
              ring.position.copy(point);
              ring.rotation.x = Math.PI / 2;
              ring.renderOrder = active ? 29 : (placed ? 24 : 12);
              model.add(ring);
              if (active) assemblyPulse = ring;
            }
            function addLooseAssemblyPiece(piece, idx, active) {
              var group = new THREE.Group();
              var spacing = Math.max(0.58, Math.min(1.12, len * 0.09));
              var trayZ = -Math.max(2.0, bodyDepth * 2.8);
              group.position.set(-spacing * 2.5 + idx * spacing, 0.13, trayZ + (idx % 2 ? 0.26 : -0.02));
              group.rotation.y = -0.35 + idx * 0.18;
              var mat = assemblyUnlocked ? (active ? assemblyFocusMat : assemblyLooseMat) : assemblyLockedMat;
              var order = active ? 28 : 14;
              if (piece.id === 'skull') {
                addAssemblyEllipsoid(group, vec(0, 0.05, 0), vec(0.18, 0.11, 0.12), mat, order);
              } else if (piece.id === 'ribs') {
                var looseRib = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 8, 28), mat);
                looseRib.rotation.y = Math.PI / 2;
                looseRib.renderOrder = order;
                group.add(looseRib);
              } else if (piece.id === 'pelvis') {
                addAssemblyEllipsoid(group, vec(-0.08, 0.03, 0), vec(0.13, 0.07, 0.11), mat, order);
                addAssemblyEllipsoid(group, vec(0.10, 0.03, 0), vec(0.11, 0.06, 0.10), mat, order);
              } else if (piece.id === 'hindlimb') {
                addAssemblyCylinder(group, vec(-0.22, 0.02, -0.03), vec(0.02, 0.07, 0.03), 0.024, mat, order);
                addAssemblyCylinder(group, vec(0.02, 0.07, 0.03), vec(0.24, 0.02, -0.02), 0.021, mat, order);
              } else {
                addAssemblyCylinder(group, vec(-0.24, 0.04, 0), vec(0.24, 0.04, 0), piece.id === 'tail' ? 0.028 : 0.024, mat, order);
              }
              scene.add(group);
            }
            function addPlacedAssemblyPiece(id, active, claimEvidence) {
              var mat = claimEvidence ? claimEvidenceMat : (active ? assemblyFocusMat : assemblyPlacedMat);
              var order = claimEvidence ? 32 : (active ? 30 : 24);
              if (id === 'skull') {
                addAssemblyEllipsoid(model, head.clone(), vec(Math.max(0.16, len * 0.042), Math.max(0.10, ht * 0.048), Math.max(0.09, ht * 0.042)), mat, order);
              } else if (id === 'spine') {
                addAssemblyCylinder(model, shoulder, hip, Math.max(0.052, ht * 0.018), mat, order);
              } else if (id === 'ribs') {
                for (var ri = 0; ri < 3; ri++) {
                  var rib = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.15, bodyDepth * (0.76 - ri * 0.08)), Math.max(0.010, ht * 0.004), 8, 32), mat);
                  rib.position.set(bodyCenter.x + (ri - 1) * Math.max(0.10, len * 0.030), bodyCenter.y, 0);
                  rib.rotation.y = Math.PI / 2;
                  rib.scale.y = Math.max(0.52, bodyHeight / Math.max(0.18, bodyDepth));
                  rib.renderOrder = order;
                  model.add(rib);
                }
              } else if (id === 'pelvis') {
                addAssemblyEllipsoid(model, hip.clone(), vec(Math.max(0.16, ht * 0.070), Math.max(0.09, ht * 0.038), Math.max(0.14, bodyDepth * 0.70)), mat, order);
              } else if (id === 'hindlimb') {
                var kneeA = vec(hip.x + len * 0.025, Math.max(0.18, hip.y * 0.48), stance);
                var footA = vec(hip.x + len * 0.085, 0.06, stance + 0.10);
                var kneeB = vec(hip.x + len * 0.025, Math.max(0.18, hip.y * 0.48), -stance);
                var footB = vec(hip.x + len * 0.085, 0.06, -stance - 0.10);
                addAssemblyCylinder(model, vec(hip.x, hip.y, stance), kneeA, Math.max(0.040, ht * 0.014), mat, order);
                addAssemblyCylinder(model, kneeA, footA, Math.max(0.034, ht * 0.012), mat, order);
                addAssemblyCylinder(model, vec(hip.x, hip.y, -stance), kneeB, Math.max(0.040, ht * 0.014), mat, order);
                addAssemblyCylinder(model, kneeB, footB, Math.max(0.034, ht * 0.012), mat, order);
              } else if (id === 'tail') {
                addAssemblyCylinder(model, hip, tail, Math.max(0.048, ht * 0.016), mat, order);
              }
            }
            function addClaimEvidenceBeacon(piece) {
              var point = piece.point.clone();
              point.y += Math.max(0.14, ht * 0.040);
              var anchorPoint = claimEvidenceAnchorId && evidenceAnchorPoints[claimEvidenceAnchorId] ? evidenceAnchorPoints[claimEvidenceAnchorId].clone() : null;
              if (anchorPoint) {
                anchorPoint.y += Math.max(0.16, ht * 0.052);
                if (point.distanceTo(anchorPoint) > Math.max(0.10, ht * 0.030)) addModelCylinder(point, anchorPoint, Math.max(0.014, ht * 0.005), claimEvidenceTrailMat, 31);
              }
              var ring = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.24, ht * 0.074), Math.max(0.014, ht * 0.0055), 10, 52), claimEvidenceRingMat);
              ring.position.copy(point);
              ring.rotation.x = Math.PI / 2;
              ring.renderOrder = 34;
              model.add(ring);
              claimEvidencePulse = ring;
              var beamHeight = Math.max(0.82, ht * 0.28);
              var beam = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.010, ht * 0.0035), Math.max(0.010, ht * 0.0035), beamHeight, 10), claimEvidenceBeamMat);
              beam.position.copy(point);
              beam.position.y += beamHeight * 0.5;
              beam.renderOrder = 33;
              model.add(beam);
              var labelPos = piece.point.clone();
              labelPos.y += Math.max(0.88, ht * 0.26);
              labelPos.z += Math.max(0.20, bodyDepth * 0.55);
              addTextLabel('Claim: ' + piece.label, labelPos, '#14b8a6');
            }
            if (props.assemblyTotal != null) {
              var assemblyPieces3d = [
                { id: 'skull', label: 'Skull', point: head },
                { id: 'spine', label: 'Spine', point: bodyCenter },
                { id: 'ribs', label: 'Ribs', point: bodyCenter.clone().add(vec(-len * 0.035, 0, 0)) },
                { id: 'pelvis', label: 'Pelvis', point: hip },
                { id: 'hindlimb', label: 'Hindlimb', point: vec(hip.x, Math.max(0.20, hip.y * 0.50), stance) },
                { id: 'tail', label: 'Tail', point: new THREE.Vector3().copy(hip).add(tail).multiplyScalar(0.5) }
              ];
              assemblyPieces3d.forEach(function (piece, idx) {
                var placed = !!assemblyPlaced[piece.id];
                var active = piece.id === assemblyFocusId;
                var claimEvidence = placed && piece.id === claimEvidenceId;
                addAssemblySocket(piece, active, placed);
                if (placed) addPlacedAssemblyPiece(piece.id, active, claimEvidence);
                else addLooseAssemblyPiece(piece, idx, active);
                if (claimEvidence) addClaimEvidenceBeacon(piece);
                if (active && !claimEvidence) {
                  var assemblyLabel = piece.point.clone();
                  assemblyLabel.y += Math.max(0.68, ht * 0.20);
                  assemblyLabel.z -= Math.max(0.18, bodyDepth * 0.50);
                  addTextLabel((placed ? 'Placed ' : 'Assemble ') + piece.label, assemblyLabel, placed ? '#22c55e' : '#a78bfa');
                }
              });
            }

            if (props.showEvidence) {
              var evidenceAnchors = [
                { id: 'skull', label: 'Skull', point: head },
                { id: 'shoulder', label: 'Shoulder', point: shoulder },
                { id: 'hip', label: 'Hip', point: hip }
              ];
              var evidencePoints = {};
              function evidenceMarkPoint(point) {
                var p = point.clone();
                p.y += Math.max(0.12, ht * 0.050);
                return p;
              }
              evidenceAnchors.forEach(function (anchor) { evidencePoints[anchor.id] = evidenceMarkPoint(anchor.point); });
              [
                { a: 'skull', b: 'shoulder' },
                { a: 'shoulder', b: 'hip' }
              ].forEach(function (segment) {
                var a = evidencePoints[segment.a];
                var b = evidencePoints[segment.b];
                if (!a || !b) return;
                var complete = !!loggedAnchors[segment.a] && !!loggedAnchors[segment.b];
                var active = segment.a === scanTargetId || segment.b === scanTargetId;
                var mat = complete ? loggedPathMat : (active ? activePathMat : evidencePathMat);
                addModelCylinder(a, b, Math.max(0.018, ht * 0.006), mat, complete ? 21 : (active ? 18 : 7));
              });
              evidenceAnchors.forEach(function (anchor) {
                var anchorLogged = !!loggedAnchors[anchor.id];
                var mark = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.09, ht * 0.026), 16, 10), anchorLogged ? loggedMarkerMat : markerMat);
                mark.position.copy(evidencePoints[anchor.id]);
                mark.renderOrder = anchorLogged ? 23 : 10;
                model.add(mark);
                var labelPos = anchor.point.clone();
                labelPos.y += Math.max(0.46, ht * 0.15);
                labelPos.z += Math.max(0.18, bodyDepth * 0.48);
                addTextLabel(anchor.label + (anchorLogged ? ' done' : ''), labelPos, anchorLogged ? '#22c55e' : '#38bdf8');
                if (anchorLogged) {
                  var loggedHalo = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.18, ht * 0.060), Math.max(0.012, ht * 0.005), 10, 42), loggedRingMat);
                  loggedHalo.position.copy(mark.position);
                  loggedHalo.rotation.x = Math.PI / 2;
                  loggedHalo.renderOrder = 22;
                  model.add(loggedHalo);
                  loggedRings.push(loggedHalo);
                }
                if (anchor.id === scanTargetId) {
                  var haloMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
                  var halo = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.22, ht * 0.075), Math.max(0.014, ht * 0.006), 10, 48), haloMat);
                  halo.position.copy(mark.position);
                  halo.rotation.x = Math.PI / 2;
                  halo.renderOrder = 25;
                  model.add(halo);
                  scanPulse = halo;
                  var beamMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.28, depthWrite: false, depthTest: false });
                  var beam = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.008, ht * 0.003), Math.max(0.008, ht * 0.003), Math.max(0.9, ht * 0.34), 10), beamMat);
                  beam.position.copy(mark.position);
                  beam.position.y += Math.max(0.46, ht * 0.17);
                  beam.renderOrder = 24;
                  model.add(beam);
                }
              });
            }
            if (props.showHuman) {
              var hx = len * 0.56;
              var human = new THREE.Group();
              var humanMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 18 });
              var body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 1.25, 14), humanMat);
              body.position.set(hx, 0.72, -Math.max(1.0, bodyDepth * 1.9));
              body.castShadow = true;
              var skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), humanMat);
              skull.position.set(hx, 1.46, -Math.max(1.0, bodyDepth * 1.9));
              skull.castShadow = true;
              human.add(body); human.add(skull);
              model.add(human);
            }

            var modelCenter = vec(len * 0.02, Math.max(0.5, ht * 0.42), 0);
            var radius = Math.max(len * 0.84, ht * 1.9, 5.5);
            function updateCameraReadout() {
              var rotationDegrees = Math.round((((yaw * 180 / Math.PI) + 180) % 360 + 360) % 360 - 180);
              var elevationDegrees = Math.round(pitch * 180 / Math.PI);
              var zoomPercent = Math.round(100 / zoom);
              var nextReadout = 'Rotation ' + rotationDegrees + ' degrees | Elevation ' + elevationDegrees + ' degrees | Zoom ' + zoomPercent + ' percent';
              if (nextReadout !== lastCameraReadout && cameraReadoutRef.current) {
                cameraReadoutRef.current.textContent = nextReadout;
                lastCameraReadout = nextReadout;
              }
            }
            function updateCameraView() {
              var distance = radius * 1.55 * zoom;
              camera.position.set(len * 0.12, modelCenter.y + Math.sin(pitch) * distance, Math.cos(pitch) * distance);
              camera.lookAt(modelCenter);
              yawRef.current.pitch = pitch;
              yawRef.current.zoom = zoom;
              updateCameraReadout();
            }
            activeCameraControl = function (nextYaw, nextPitch, nextZoom, message) {
              yaw = nextYaw;
              pitch = clampView(nextPitch, 0.04, 0.72);
              zoom = clampView(nextZoom, 0.68, 1.65);
              yawRef.current.value = yaw;
              interactionPauseUntil = performance.now() + 3000;
              updateCameraView();
              setStatus(message);
            };
            cameraControlRef.current = activeCameraControl;
            updateCameraView();

            function resize() {
              if (!alive || !renderer || !camera) return;
              var w = Math.max(320, canvas.clientWidth || 720);
              var h = Math.max(260, canvas.clientHeight || 420);
              camera.aspect = w / h;
              camera.updateProjectionMatrix();
              renderer.setSize(w, h, false);
              measurementIntervalLabels.forEach(function (label) { if (label) label.visible = w >= 560; });
            }
            resize();
            if (window.ResizeObserver) {
              resizeObserver = new ResizeObserver(resize);
              resizeObserver.observe(canvas);
            } else {
              window.addEventListener('resize', resize);
              cleanupFns.push(function () { window.removeEventListener('resize', resize); });
            }
            function visibilityChanged() {
              pageVisible = document.visibilityState !== 'hidden';
              syncAnimation();
            }
            document.addEventListener('visibilitychange', visibilityChanged);
            cleanupFns.push(function () { document.removeEventListener('visibilitychange', visibilityChanged); });
            if (window.IntersectionObserver) {
              intersectionObserver = new window.IntersectionObserver(function (entries) {
                var entry = entries && entries[0];
                inViewport = !entry || entry.isIntersecting;
                syncAnimation();
              }, { rootMargin: '80px 0px' });
              intersectionObserver.observe(canvas);
            }

            function pointerDown(ev) { try { canvas.focus(); } catch (e) {} dragging = true; pauseAutoRotate(60000); lastX = ev.clientX || 0; lastY = ev.clientY || 0; canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId); }
            function pointerMove(ev) {
              if (!dragging) return;
              var x = ev.clientX || 0;
              var y = ev.clientY || 0;
              yaw += (x - lastX) * 0.009;
              pitch = clampView(pitch + (y - lastY) * 0.006, 0.04, 0.62);
              yawRef.current.value = yaw;
              lastX = x;
              lastY = y;
              updateCameraView();
            }
            function pointerUp(ev) { dragging = false; interactionPauseUntil = performance.now() + 2200; if (canvas.releasePointerCapture) { try { canvas.releasePointerCapture(ev.pointerId); } catch (e) {} } }
            function keyDown(ev) {
              var key = ev.key;
              pauseAutoRotate(2400);
              if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
                ev.preventDefault(); yaw -= Math.PI / 12; yawRef.current.value = yaw; setStatus('Reconstruction rotated left.');
              } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
                ev.preventDefault(); yaw += Math.PI / 12; yawRef.current.value = yaw; setStatus('Reconstruction rotated right.');
              } else if (key === 'ArrowUp') {
                ev.preventDefault(); pitch = clampView(pitch + 0.08, 0.04, 0.62); updateCameraView(); setStatus('Camera raised.');
              } else if (key === 'ArrowDown') {
                ev.preventDefault(); pitch = clampView(pitch - 0.08, 0.04, 0.62); updateCameraView(); setStatus('Camera lowered.');
              } else if (key === 'PageUp') {
                ev.preventDefault(); zoom = clampView(zoom * 0.90, 0.68, 1.65); updateCameraView(); setStatus('Camera zoomed in.');
              } else if (key === 'PageDown') {
                ev.preventDefault(); zoom = clampView(zoom * 1.10, 0.68, 1.65); updateCameraView(); setStatus('Camera zoomed out.');
              } else if (key === 'Home') {
                ev.preventDefault(); yaw = -0.35; pitch = 0.18; zoom = 1; yawRef.current.value = yaw; updateCameraView(); setStatus('Reconstruction returned to its starting view.');
              }
            }
            function wheelZoom(ev) {
              ev.preventDefault();
              pauseAutoRotate(2400);
              zoom = clampView(zoom * Math.exp((ev.deltaY || 0) * 0.001), 0.68, 1.65);
              updateCameraView();
              setStatus(ev.deltaY > 0 ? 'Camera zoomed out.' : 'Camera zoomed in.');
            }
            canvas.addEventListener('pointerdown', pointerDown);
            canvas.addEventListener('pointermove', pointerMove);
            canvas.addEventListener('pointerup', pointerUp);
            canvas.addEventListener('pointerleave', pointerUp);
            canvas.addEventListener('keydown', keyDown);
            canvas.addEventListener('wheel', wheelZoom, { passive: false });
            cleanupFns.push(function () {
              canvas.removeEventListener('pointerdown', pointerDown);
              canvas.removeEventListener('pointermove', pointerMove);
              canvas.removeEventListener('pointerup', pointerUp);
              canvas.removeEventListener('pointerleave', pointerUp);
              canvas.removeEventListener('keydown', keyDown);
              canvas.removeEventListener('wheel', wheelZoom);
            });

            var sameSpeciesRefresh = readySpeciesRef.current === props.species.id;
            setStatus(sameSpeciesRefresh ? '3D evidence view updated. Camera view preserved.' : '3D reconstruction loaded. Drag to orbit, use the wheel to zoom, or use the arrow keys.');
            readySpeciesRef.current = props.species.id;
            function syncAnimation() {
              if (!alive) return;
              if (inViewport && pageVisible) {
                if (!frame) frame = window.requestAnimationFrame(animate);
              } else if (frame) {
                window.cancelAnimationFrame(frame);
                frame = 0;
              }
            }
            function animate() {
              frame = 0;
              if (!alive || !renderer || !scene || !camera) return;
              if (model) {
                if (!dragging && !reducedMotion && autoRotateRef.current !== false && performance.now() >= interactionPauseUntil) yaw += 0.0035;
                yawRef.current.value = yaw;
                model.rotation.y = yaw;
                updateCameraReadout();
                if (!reducedMotion && scanPulse) {
                  var pulse = 1 + Math.sin(performance.now() * 0.006) * 0.10;
                  scanPulse.scale.set(pulse, pulse, pulse);
                  if (scanPulse.material) scanPulse.material.opacity = 0.30 + Math.sin(performance.now() * 0.006) * 0.08;
                }
                if (!reducedMotion && assemblyPulse) {
                  var assemblyGlow = 1 + Math.sin(performance.now() * 0.005) * 0.08;
                  assemblyPulse.scale.set(assemblyGlow, assemblyGlow, assemblyGlow);
                  if (assemblyPulse.material) assemblyPulse.material.opacity = 0.32 + Math.sin(performance.now() * 0.005) * 0.08;
                }
                if (!reducedMotion && claimEvidencePulse) {
                  var claimGlow = 1 + Math.sin(performance.now() * 0.006 + 1.7) * 0.11;
                  claimEvidencePulse.scale.set(claimGlow, claimGlow, claimGlow);
                  if (claimEvidencePulse.material) claimEvidencePulse.material.opacity = 0.36 + Math.sin(performance.now() * 0.006 + 1.7) * 0.10;
                }
                if (!reducedMotion) loggedRings.forEach(function (ring, idx) {
                  var glow = 1 + Math.sin(performance.now() * 0.003 + idx) * 0.035;
                  ring.scale.set(glow, glow, glow);
                });
              }
              renderer.render(scene, camera);
              syncAnimation();
            }
            syncAnimation();
          });

          return function () {
            alive = false;
            if (frame) window.cancelAnimationFrame(frame);
            cleanupFns.forEach(function (fn) { try { fn(); } catch (e) {} });
            if (resizeObserver) { try { resizeObserver.disconnect(); } catch (e) {} }
            if (intersectionObserver) { try { intersectionObserver.disconnect(); } catch (e) {} }
            if (cameraControlRef.current === activeCameraControl) cameraControlRef.current = null;
            if (visualMaterialsRef.current === activeMaterialSet) visualMaterialsRef.current = null;

          };
        }, [props.species.id, props.showSkeleton, props.showBody, props.showHuman, props.showEvidence, props.dietColor, props.scanTarget, props.loggedAnchorKey, props.assemblyPlacedKey, props.assemblyFocus, props.assemblyUnlocked, props.claimEvidenceFocus, props.claimEvidenceAnchor]);

        React.useEffect(function () {
          return function () {
            var mountedScene = sceneRef.current;
            if (mountedScene && mountedScene.background && mountedScene.background.dispose) { try { mountedScene.background.dispose(); } catch (e) {} }
            if (mountedScene && mountedScene.traverse) {
              mountedScene.traverse(function (child) {
                if (child.geometry && child.geometry.dispose) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) child.material.forEach(function (mat) { if (mat && mat.dispose) mat.dispose(); });
                  else {
                    if (child.material.map && child.material.map.dispose) child.material.map.dispose();
                    if (child.material.dispose) child.material.dispose();
                  }
                }
              });
            }
            if (rendererRef.current && rendererRef.current.dispose) rendererRef.current.dispose();
            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
          };
        }, []);

        function applyCameraPreset(preset) {
          if (!cameraControlRef.current) return;
          var presets = {
            front: { yaw: 0, pitch: 0.16, zoom: 1, message: 'Front reconstruction view selected.' },
            side: { yaw: -Math.PI / 2, pitch: 0.16, zoom: 1, message: 'Side reconstruction view selected.' },
            overhead: { yaw: -0.35, pitch: 0.70, zoom: 1.08, message: 'Overhead reconstruction view selected.' },
            reset: { yaw: -0.35, pitch: 0.18, zoom: 1, message: 'Reconstruction returned to its starting view.' }
          };
          var view = presets[preset] || presets.reset;
          cameraControlRef.current(view.yaw, view.pitch, view.zoom, view.message);
        }
        function updateBodyOpacity(event) {
          var nextOpacity = Math.max(10, Math.min(75, Number(event.target.value) || 28));
          bodyOpacityRef.current = nextOpacity;
          setBodyOpacity(nextOpacity);
          var materials = visualMaterialsRef.current;
          if (materials) {
            var alpha = nextOpacity / 100;
            materials.body.opacity = alpha;
            materials.head.opacity = Math.min(0.87, alpha + 0.12);
            materials.wire.opacity = Math.max(0.10, alpha * 0.64);
            materials.accent.opacity = Math.min(0.90, alpha + 0.40);
          }
          if (statusRef.current) statusRef.current.textContent = 'Body inference opacity ' + nextOpacity + ' percent. Skeleton and evidence remain unchanged.';
        }
        function readoutChip(text, color) {
          return el('span', { key: text, className: 'dinolab-3d-chip', style: { padding: '5px 8px', borderRadius: 999, background: 'rgba(15,23,42,0.82)', border: '1px solid ' + color, color: '#e2e8f0', fontSize: 11, fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.22)' } }, text);
        }
        var viewerDescId = 'dino3d-viewer-desc-' + props.species.id;
        var statusId = 'dino3d-status-' + props.species.id;
        var srOnlyStyle = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 };
        var layerSummary = [props.showSkeleton ? 'skeleton proxy' : null, props.showBody ? 'body outline' : null, props.showHuman ? 'human scale' : null, props.showEvidence ? 'evidence markers' : null].filter(Boolean).join(', ') || 'no visual layers enabled';
        var viewerSummary = props.species.common + ' 3D model summary. Visible layers: ' + layerSummary + '. Reconstruction profile: ' + reconstructionProfile.label + ' with ' + reconstructionProfile.coverage + ' fossil coverage. Current scan focus: ' + (props.scanLabel || 'none') + '. Logged anchors: ' + (props.loggedCount == null ? 'not tracked' : (props.loggedCount + ' of ' + (props.scanTotal || 3))) + '. Evidence path: ' + (props.pathLoggedCount == null ? 'not tracked' : (props.pathLoggedCount + ' of ' + (props.pathTotal || 2))) + '. Assembly progress: ' + (props.assemblyPlacedCount == null ? 'not tracked' : (props.assemblyPlacedCount + ' of ' + (props.assemblyTotal || 6))) + '.' + (props.claimEvidenceLabel ? ' Claim evidence highlighted: ' + props.claimEvidenceLabel + '.' : '') + (props.claimEvidenceTrailLabel ? ' Evidence trail: ' + props.claimEvidenceTrailLabel.replace(' -> ', ' to ') + ' anchor.' : '') + ' Keyboard controls: Left and Right Arrow or A and D rotate; Up and Down Arrow raise or lower the camera; Page Up and Page Down zoom; Home resets the view.';

        return el('div', { className: 'dinolab-3d-shell' },
          el('div', { className: 'dinolab-3d-viewer', style: { position: 'relative', minHeight: 420, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.26)', background: '#0f172a' } },
          el('div', { id: viewerDescId, style: srOnlyStyle }, viewerSummary),
          el('canvas', { ref: canvasRef, className: 'dinolab-3d-canvas', tabIndex: 0, role: 'application', 'aria-roledescription': 'Interactive 3D dinosaur reconstruction', 'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown A D Home', 'aria-describedby': viewerDescId + ' ' + statusId, 'aria-label': props.species.common + ' procedural 3D reconstruction viewer. Drag in two directions to orbit and use the wheel to zoom. Arrow keys rotate and raise or lower the camera; Page Up and Page Down zoom; Home resets the view.' + (props.claimEvidenceLabel ? ' Claim evidence highlighted: ' + props.claimEvidenceLabel + '.' : '') + (props.claimEvidenceTrailLabel ? ' Evidence trail: ' + props.claimEvidenceTrailLabel.replace(' -> ', ' to ') + ' anchor.' : ''), onFocus: function () { setCanvasFocused(true); }, onBlur: function () { setCanvasFocused(false); }, style: { width: '100%', height: 420, display: 'block', touchAction: 'none', outline: canvasFocused ? '3px solid #5eead4' : 'none', outlineOffset: '-3px' } }),
          el('div', { className: 'dinolab-3d-readouts', style: { position: 'absolute', left: 10, top: 10, right: 10, display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'none' } },
            readoutChip('Length ' + fmtLength(props.species.lengthM), 'rgba(56,189,248,0.55)'),
            readoutChip('Height ' + fmtLength(props.species.heightM), 'rgba(250,204,21,0.55)'),
            readoutChip('Profile ' + reconstructionProfile.label, 'rgba(94,234,212,0.62)'),
            props.scanLabel ? readoutChip('Focus ' + props.scanLabel, 'rgba(245,158,11,0.65)') : null,
            props.loggedCount != null ? readoutChip('Logged ' + props.loggedCount + '/' + (props.scanTotal || 3), 'rgba(34,197,94,0.65)') : null,
            props.pathLoggedCount != null ? readoutChip('Path ' + props.pathLoggedCount + '/' + (props.pathTotal || 2), 'rgba(20,184,166,0.65)') : null,
            props.assemblyPlacedCount != null ? readoutChip('Assembly ' + props.assemblyPlacedCount + '/' + (props.assemblyTotal || 6), 'rgba(167,139,250,0.65)') : null,
            props.claimEvidenceLabel ? readoutChip('Claim ' + props.claimEvidenceLabel, 'rgba(20,184,166,0.75)') : null,
            props.claimEvidenceTrailLabel ? readoutChip('Trail ' + props.claimEvidenceTrailLabel, 'rgba(94,234,212,0.75)') : null,
            readoutChip('Mass ' + fmtWeight(props.species.weightKg), 'rgba(167,139,250,0.55)')
          ),
          el('div', { ref: cameraReadoutRef, className: 'dinolab-3d-camera-readout', 'aria-label': 'Current 3D camera view', style: { position: 'absolute', right: 10, bottom: 56, padding: '5px 8px', borderRadius: 8, background: 'rgba(15,23,42,0.78)', color: '#e2e8f0', fontSize: 11, fontWeight: 800, pointerEvents: 'none' } }, 'Camera view loading...'),
          el('div', { id: statusId, ref: statusRef, className: 'dinolab-3d-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', left: 10, bottom: 10, right: 10, padding: '7px 10px', borderRadius: 9, background: 'rgba(15,23,42,0.78)', color: '#cbd5e1', fontSize: 11, pointerEvents: 'none' } }, 'Loading 3D reconstruction...')
        ),
          el('div', { className: 'dinolab-3d-view-controls', role: 'group', 'aria-label': '3D camera viewpoints and body inference opacity', style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 } },
            ['front', 'side', 'overhead', 'reset'].map(function (preset) {
              var label = preset === 'overhead' ? 'Overhead' : (preset === 'reset' ? 'Reset view' : cap(preset));
              return el('button', { key: preset, type: 'button', onClick: function () { applyCameraPreset(preset); }, style: { padding: '7px 10px', borderRadius: 8, border: '1px solid ' + T.border, background: T.deeper, color: T.text, cursor: 'pointer', fontSize: 11.5, fontWeight: 800 } }, label);
            }),
            el('label', { style: { display: 'flex', alignItems: 'center', gap: 7, flex: '1 1 220px', minWidth: 190, paddingLeft: 4, color: T.soft, fontSize: 11.5, fontWeight: 800 } },
              el('span', { style: { whiteSpace: 'nowrap' } }, 'Body inference ' + bodyOpacity + '%'),
              el('input', { type: 'range', min: 10, max: 75, step: 1, value: bodyOpacity, disabled: !props.showBody, onChange: updateBodyOpacity, 'aria-label': 'Body inference opacity', 'aria-valuetext': bodyOpacity + ' percent', style: { flex: 1, minWidth: 90, accentColor: '#14b8a6' } })
            )
          )
        );
      }

      if (!DinoFieldStation3DStable) DinoFieldStation3DStable = DinoFieldStation3D;

      function renderField3D() {
        var fieldId = d.field3dSelected || selected || 'tyrannosaurus';
        var dn = byId(fieldId) || byId('tyrannosaurus') || DINOS[0];
        var reconstructionProfile = reconstructionProfileFor(dn);
        var showSkeleton = d.field3dShowSkeleton !== false;
        var showBody = d.field3dShowBody !== false;
        var showHuman = d.field3dShowHuman !== false;
        var showEvidence = d.field3dShowEvidence !== false;
        var autoRotate = d.field3dAutoRotate !== false;
        var scanTargets = [
          { id: 'skull', label: 'Skull', prompt: 'Check how skull evidence constrains head size, bite posture, and sensory placement.' },
          { id: 'shoulder', label: 'Shoulder', prompt: 'Compare shoulder position to the rib cage, forelimbs, and body balance.' },
          { id: 'hip', label: 'Hip', prompt: 'Use the hip anchor to reason about tail counterbalance, stance, and locomotion.' }
        ];
        var scanTargetIdx = modIndex(d.field3dScanTargetIdx, scanTargets.length);
        var scanTarget = scanTargets[scanTargetIdx];
        var rawScanLogged = (d.field3dScanLogged && typeof d.field3dScanLogged === 'object') ? d.field3dScanLogged : {};
        var scanLogSpecies = d.field3dScanSpecies || null;
        var scanLogged = scanLogSpecies === dn.id ? rawScanLogged : {};
        var scanLoggedCount = scanTargets.reduce(function (n, target) { return n + (scanLogged[target.id] ? 1 : 0); }, 0);
        var scanLoggedKey = scanTargets.map(function (target) { return scanLogged[target.id] ? target.id : ''; }).join('|');
        var scanPathLinks = [{ a: 'skull', b: 'shoulder' }, { a: 'shoulder', b: 'hip' }];
        var scanPathCount = scanPathLinks.reduce(function (n, link) { return n + (scanLogged[link.a] && scanLogged[link.b] ? 1 : 0); }, 0);
        var scanComplete = scanLoggedCount >= scanTargets.length;
        var nextOpenTarget = scanTargets.filter(function (target) { return !scanLogged[target.id]; })[0] || null;
        var scanStatusText = 'Evidence log ' + scanLoggedCount + '/' + scanTargets.length + (scanComplete ? ' | Field scan complete' : (nextOpenTarget ? ' | Next open: ' + nextOpenTarget.label : ''));
        var claimReadinessScore = Math.min(5, scanLoggedCount + scanPathCount);
        var claimReadinessPct = Math.round((claimReadinessScore / 5) * 100);
        var claimReadinessLabel = scanComplete ? 'CER ready' : (scanPathCount > 0 ? 'Connected evidence' : (scanLoggedCount > 0 ? 'Anchor evidence' : 'Start scanning'));
        var claimReadinessText = 'Claim strength ' + claimReadinessScore + ' of 5. ' + claimReadinessLabel + '.';
        var claimReadinessHint = scanComplete ? 'All anchors and path links are logged. Build a claim with evidence and reasoning.' : (scanPathCount > 0 ? 'A linked path connects anchors. Finish the scan for the strongest claim.' : (scanLoggedCount > 0 ? 'One or more anchors are logged. Link neighboring anchors for stronger reasoning.' : 'Log at least one anchor before writing a claim.'));
        var assemblyPieces = [
          { id: 'skull', label: 'Skull', role: 'feeding and senses', scan: 'skull', insight: 'diet and sensory evidence', claimId: 'function', claimLabel: 'Function', claimHint: 'Skull evidence is strongest for function claims about feeding, bite style, and sensory placement.', detail: 'Teeth, jaw joints, and eye sockets help scientists infer diet, bite style, and how the head was carried.' },
          { id: 'spine', label: 'Spine', role: 'posture and balance', scan: 'shoulder', insight: 'posture chain evidence', claimId: 'posture', claimLabel: 'Posture', claimHint: 'Spine evidence links shoulder to hip, so it is strongest for posture and balance claims.', detail: 'Backbones connect the shoulder and hip, setting the body line used for posture and balance claims.' },
          { id: 'ribs', label: 'Ribs', role: 'breathing and body volume', scan: 'shoulder', insight: 'body-volume evidence', claimId: 'function', claimLabel: 'Function', claimHint: 'Rib evidence supports function claims about breathing space, organs, and cautious body-volume reconstruction.', detail: 'The rib cage protects organs and gives a cautious boundary for soft-tissue reconstruction.' },
          { id: 'pelvis', label: 'Pelvis', role: 'hip socket and muscle attachment', scan: 'hip', insight: 'stance and muscle evidence', claimId: 'posture', claimLabel: 'Posture', claimHint: 'Pelvis evidence is strongest for posture claims about stance, hip sockets, and muscle attachment.', detail: 'The pelvis links the spine to the hindlimbs and preserves clues about stance and powerful muscles.' },
          { id: 'hindlimb', label: 'Hindlimb', role: 'movement and weight support', scan: 'hip', insight: 'movement evidence', claimId: 'function', claimLabel: 'Function', claimHint: 'Hindlimb evidence supports function claims about movement, stride, speed, and weight support.', detail: 'Femur, shin, and foot proportions help learners connect anatomy to speed, stride, and body mass.' },
          { id: 'tail', label: 'Tail', role: 'counterbalance', scan: 'hip', insight: 'balance evidence', claimId: 'posture', claimLabel: 'Posture', claimHint: 'Tail evidence is strongest for posture claims because it counterbalances the hips, body, and head.', detail: 'Tail vertebrae counterbalance the body, especially when the hips and shoulders sit at different heights.' }
        ];
        var rawAssemblyPlaced = (d.field3dAssemblyPlaced && typeof d.field3dAssemblyPlaced === 'object') ? d.field3dAssemblyPlaced : {};
        var assemblySpecies = d.field3dAssemblySpecies || null;
        var assemblyPlaced = assemblySpecies === dn.id ? rawAssemblyPlaced : {};
        var assemblyFocusIdx = modIndex(d.field3dAssemblyFocusIdx, assemblyPieces.length);
        var assemblyFocus = assemblyPieces[assemblyFocusIdx] || assemblyPieces[0];
        var assemblyPlacedCount = assemblyPieces.reduce(function (n, piece) { return n + (assemblyPlaced[piece.id] ? 1 : 0); }, 0);
        var assemblyPlacedKey = assemblyPieces.map(function (piece) { return assemblyPlaced[piece.id] ? piece.id : ''; }).join('|');
        var assemblyUnlocked = scanComplete;
        var assemblyComplete = assemblyPlacedCount >= assemblyPieces.length;
        var assemblyStatus = assemblyComplete ? 'Skeleton assembled' : (assemblyUnlocked ? 'Place fossils into sockets' : 'Complete field scan to unlock');
        var assemblyProgressText = 'Assembly ' + assemblyPlacedCount + ' of ' + assemblyPieces.length + '. ' + assemblyStatus + '.';
        var assemblyFocusPlaced = !!assemblyPlaced[assemblyFocus.id];
        var assemblyScanCue = assemblyUnlocked ? 'Field scan complete: all fossil pieces are cataloged for assembly.' : 'Finish the Skull -> Shoulder -> Hip scan to catalog the fossil tray.';
        var assemblyInsightPieces = assemblyPieces.filter(function (piece) { return !!assemblyPlaced[piece.id]; });
        var assemblyInsightCount = assemblyInsightPieces.length;
        var assemblyInsightText = assemblyInsightCount ? assemblyInsightPieces.map(function (piece) { return piece.label + ' - ' + piece.role; }).join('; ') : 'Place fossils to turn anatomy into reasoning evidence.';
        var assemblySupportReady = assemblyInsightCount > 0;
        var assemblyClaimMode = assemblyFocus.claimId || 'function';
        var assemblyClaimLabel = assemblyFocus.claimLabel || cap(assemblyClaimMode);
        var assemblyClaimCoach = assemblyFocus.claimHint || (assemblyFocus.label + ' evidence can support a claim when it is connected to a logged fossil anchor.');
        function findNextOpenIdx(loggedMap, startIdx) {
          for (var offset = 1; offset <= scanTargets.length; offset++) {
            var idx = modIndex(startIdx + offset, scanTargets.length);
            if (!loggedMap[scanTargets[idx].id]) return idx;
          }
          return startIdx;
        }
        function setScanTarget(idx) {
          var nextIdx = modIndex(idx, scanTargets.length);
          upd({ field3dScanTargetIdx: nextIdx, field3dShowEvidence: true });
          announceToSR('3D scan focus: ' + scanTargets[nextIdx].label);
        }
        function nextScanTarget() { setScanTarget(scanTargetIdx + 1); }
        function showScanMarkers() {
          upd({ field3dShowEvidence: true, field3dScanTargetIdx: scanTargetIdx });
          announceToSR('3D scan markers shown');
        }
        function logScanTarget() {
          var nextLog = {};
          for (var key in scanLogged) { if (Object.prototype.hasOwnProperty.call(scanLogged, key)) nextLog[key] = !!scanLogged[key]; }
          nextLog[scanTarget.id] = true;
          var nextIdx = findNextOpenIdx(nextLog, scanTargetIdx);
          var nextTarget = scanTargets[nextIdx];
          upd({ field3dScanLogged: nextLog, field3dScanSpecies: dn.id, field3dShowEvidence: true, field3dScanTargetIdx: nextIdx });
          announceToSR(scanTarget.label + ' observation logged' + (nextTarget && !nextLog[nextTarget.id] ? '. Next focus: ' + nextTarget.label : '. Field scan complete'));
        }
        function findNextOpenAssemblyIdx(placedMap, startIdx) {
          for (var offset = 1; offset <= assemblyPieces.length; offset++) {
            var idx = modIndex(startIdx + offset, assemblyPieces.length);
            if (!placedMap[assemblyPieces[idx].id]) return idx;
          }
          return startIdx;
        }
        function setAssemblyFocus(idx) {
          var nextIdx = modIndex(idx, assemblyPieces.length);
          upd({ field3dAssemblyFocusIdx: nextIdx, field3dShowSkeleton: true });
          announceToSR('3D fossil assembly focus: ' + assemblyPieces[nextIdx].label);
        }
        function nextAssemblyFocus() { setAssemblyFocus(assemblyFocusIdx + 1); }
        function useAssemblyClaim() {
          if (!assemblyFocusPlaced) return;
          upd({ field3dClaimFocus: assemblyClaimMode, field3dClaimBone: assemblyFocus.id, field3dClaimBoneSpecies: dn.id });
          announceToSR(assemblyFocus.label + ' evidence sent to the ' + assemblyClaimLabel + ' claim builder');
        }
        function placeAssemblyPiece() {
          if (!assemblyUnlocked || assemblyFocusPlaced) return;
          var nextPlaced = {};
          for (var key in assemblyPlaced) { if (Object.prototype.hasOwnProperty.call(assemblyPlaced, key)) nextPlaced[key] = !!assemblyPlaced[key]; }
          nextPlaced[assemblyFocus.id] = true;
          var nextIdx = findNextOpenAssemblyIdx(nextPlaced, assemblyFocusIdx);
          var done = assemblyPieces.reduce(function (n, piece) { return n + (nextPlaced[piece.id] ? 1 : 0); }, 0) >= assemblyPieces.length;
          upd({ field3dAssemblyPlaced: nextPlaced, field3dAssemblySpecies: dn.id, field3dAssemblyFocusIdx: nextIdx, field3dShowSkeleton: true, field3dShowEvidence: true });
          announceToSR(assemblyFocus.label + ' fossil placed' + (done ? '. Skeleton assembly complete' : '. Next fossil: ' + assemblyPieces[nextIdx].label));
        }
        function resetAssembly() {
          upd({ field3dAssemblyPlaced: {}, field3dAssemblySpecies: dn.id, field3dAssemblyFocusIdx: 0, field3dShowSkeleton: true, field3dClaimBone: null, field3dClaimBoneSpecies: dn.id });
          announceToSR('3D fossil assembly reset');
        }
        var options = DINOS.slice().sort(function (a, b) { return a.common < b.common ? -1 : 1; }).map(function (sp) {
          return el('option', { key: sp.id, value: sp.id }, sp.common);
        });
        function setBool(key, val) { upd(key, !!val); }
        function checkRow(key, checked, label, detail) {
          return el('label', { key: key, style: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid ' + T.border, cursor: 'pointer' } },
            el('input', { type: 'checkbox', checked: checked, onChange: function (e) { setBool(key, e.target.checked); }, style: { marginTop: 2 } }),
            el('span', null, el('span', { style: { display: 'block', fontSize: 12.5, fontWeight: 800, color: T.text } }, label), el('span', { style: { display: 'block', fontSize: 11.5, color: T.soft, lineHeight: 1.45 } }, detail))
          );
        }
        var viewPresets = [
          { id: 'full', label: 'Full model', detail: 'All layers', skeleton: true, body: true, human: true, evidence: true },
          { id: 'anchors', label: 'Fossil anchors', detail: 'Bones + markers', skeleton: true, body: false, human: false, evidence: true },
          { id: 'body', label: 'Body inference', detail: 'Soft tissue focus', skeleton: true, body: true, human: false, evidence: false },
          { id: 'scale', label: 'Scale check', detail: 'Size comparison', skeleton: false, body: true, human: true, evidence: false }
        ];
        function presetActive(preset) {
          return showSkeleton === preset.skeleton && showBody === preset.body && showHuman === preset.human && showEvidence === preset.evidence;
        }
        function applyPreset(preset) {
          upd({ field3dShowSkeleton: preset.skeleton, field3dShowBody: preset.body, field3dShowHuman: preset.human, field3dShowEvidence: preset.evidence });
          announceToSR('3D field station view preset: ' + preset.label);
        }
        var presetStrip = el('div', { style: { margin: '0 0 10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 7 } }, viewPresets.map(function (preset) {
          var active = presetActive(preset);
          return el('button', {
            key: preset.id,
            onClick: function () { applyPreset(preset); },
            'aria-pressed': active ? 'true' : 'false',
            style: {
              minHeight: 54,
              textAlign: 'left',
              borderRadius: 9,
              border: '1px solid ' + (active ? '#14b8a6' : T.border),
              background: active ? 'rgba(20,184,166,0.18)' : T.deeper,
              color: T.text,
              padding: '8px 10px',
              cursor: 'pointer',
              boxShadow: active ? '0 0 0 2px rgba(20,184,166,0.18)' : 'none'
            }
          }, el('span', { style: { display: 'block', fontSize: 12.5, fontWeight: 900, marginBottom: 2 } }, preset.label), el('span', { style: { display: 'block', fontSize: 11, color: T.soft, lineHeight: 1.25 } }, preset.detail));
        }));
        function keyItem(color, label, detail) {
          return el('div', { key: label, style: { display: 'grid', gridTemplateColumns: '14px 1fr', gap: 8, alignItems: 'start', padding: '7px 0', borderBottom: '1px solid ' + T.border } },
            el('span', { 'aria-hidden': 'true', style: { width: 12, height: 12, borderRadius: 999, background: color, marginTop: 2, boxShadow: '0 0 0 2px rgba(255,255,255,0.08)' } }),
            el('span', null, el('span', { style: { display: 'block', fontSize: 12.5, fontWeight: 900, color: T.text } }, label), el('span', { style: { display: 'block', fontSize: 11.5, color: T.soft, lineHeight: 1.4 } }, detail))
          );
        }
        var evidenceRows = [
          ['Measurements', fmtLength(dn.lengthM) + ' long, ' + fmtLength(dn.heightM) + ' tall, ' + fmtWeight(dn.weightKg) + ' estimated mass.'],
          ['Fossil evidence', dn.howKnow],
          ['Inference boundary', dn.uncertain]
        ].map(function (row) {
          return el('div', { key: row[0], style: { padding: '8px 0', borderBottom: '1px solid ' + T.border } },
            el('div', { style: { fontSize: 11, color: T.soft, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 } }, row[0]),
            el('div', { style: { fontSize: 12.5, color: T.text, lineHeight: 1.5 } }, row[1])
          );
        });
        var taskCards = [
          { title: 'Observe', body: 'Turn skeleton, body outline, and scale figure on and off. Identify which parts are direct fossil evidence and which are reconstruction.' },
          { title: 'Claim', body: 'Use the model to make one claim about posture, size, or anatomy.' },
          { title: 'Evidence', body: 'Support the claim with the measurement panel or the "how we know" note, then name one uncertainty.' }
        ].map(function (card) {
          return panel([el('div', { key: 'h', style: { fontSize: 13, fontWeight: 900, marginBottom: 4 } }, card.title), el('div', { key: 'b', style: { fontSize: 12, color: T.soft, lineHeight: 1.48 } }, card.body)], { key: card.title });
        });
        var scanCoachPanel = panel([
          el('div', { key: 'h', style: { fontSize: 13, fontWeight: 900, marginBottom: 5 } }, 'Scan focus'),
          el('div', { key: 'progress', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { fontSize: 11.5, color: T.soft, fontWeight: 800, marginBottom: 7 } }, scanStatusText),
          el('div', { key: 'chips', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 6, marginBottom: 8 } }, scanTargets.map(function (target, idx) {
            var active = idx === scanTargetIdx;
            var logged = !!scanLogged[target.id];
            return el('button', {
              key: target.id,
              onClick: function () { setScanTarget(idx); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': target.label + ' scan anchor, ' + (logged ? 'logged' : 'not logged') + (active ? ', current focus' : '') + '. ' + target.prompt,
              style: {
                textAlign: 'left',
                padding: '7px 8px',
                borderRadius: 8,
                border: '1px solid ' + (active ? 'rgba(245,158,11,0.72)' : T.border),
                background: active ? 'rgba(245,158,11,0.18)' : (logged ? 'rgba(34,197,94,0.12)' : T.deeper),
                color: T.text,
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 900
              }
            }, (logged ? 'Logged ' : '') + target.label);
          })),
          el('div', { key: 'path', style: { fontSize: 11.5, color: T.soft, fontWeight: 800, lineHeight: 1.4, marginBottom: 8 } }, 'Evidence path ' + scanPathCount + '/' + scanPathLinks.length + ' linked: Skull -> Shoulder -> Hip'),
          showEvidence ? null : el('div', { key: 'hidden', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7, padding: 8, borderRadius: 8, border: '1px solid rgba(245,158,11,0.38)', background: 'rgba(15,23,42,0.26)', marginBottom: 8 } }, [ el('span', { key: 't', style: { fontSize: 11.5, color: T.soft, lineHeight: 1.35 } }, 'Scan markers hidden'), el('button', { key: 'b', onClick: showScanMarkers, style: { fontSize: 11.5, fontWeight: 900, padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.55)', background: 'rgba(245,158,11,0.16)', color: T.text, cursor: 'pointer' } }, 'Show scan markers') ]),
          el('div', { key: 'target', style: { fontSize: 12.5, color: T.text, lineHeight: 1.5, marginBottom: 6 } }, 'Target: ' + scanTarget.label + ' anchor'),
          el('div', { key: 'prompt', style: { fontSize: 12, color: T.soft, lineHeight: 1.48, marginBottom: 8 } }, scanTarget.prompt),
          el('div', { key: 'actions', style: { display: 'flex', flexWrap: 'wrap', gap: 7 } }, [
            el('button', { key: 'log', onClick: logScanTarget, disabled: !!scanLogged[scanTarget.id], style: { fontSize: 12, fontWeight: 900, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.50)', background: scanLogged[scanTarget.id] ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.18)', color: T.text, cursor: scanLogged[scanTarget.id] ? 'default' : 'pointer', opacity: scanLogged[scanTarget.id] ? 0.72 : 1 } }, scanLogged[scanTarget.id] ? 'Observation logged' : 'Log observation'),
            el('button', { key: 'next', onClick: nextScanTarget, style: { fontSize: 12, fontWeight: 900, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.55)', background: 'rgba(245,158,11,0.16)', color: T.text, cursor: 'pointer' } }, 'Next scan target')
          ]),
          scanComplete ? el('div', { key: 'done', style: { marginTop: 8, fontSize: 11.5, color: T.soft, lineHeight: 1.45 } }, 'Field scan complete: use the logged anchors to support a claim below.') : null
        ], { marginBottom: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)' });
        var assemblyPanel = panel([
          el('div', { key: 'h', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
            el('div', { style: { fontSize: 13, fontWeight: 900 } }, '3D fossil assembly puzzle'),
            el('div', { style: { fontSize: 11.5, color: T.soft, fontWeight: 800 } }, 'Assembly ' + assemblyPlacedCount + '/' + assemblyPieces.length)
          ),
          el('div', { key: 'status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { fontSize: 11.5, color: T.soft, fontWeight: 800, marginBottom: 7 } }, assemblyProgressText),
          el('div', { key: 'meter', role: 'progressbar', 'aria-label': 'Fossil assembly progress', 'aria-valuemin': 0, 'aria-valuemax': assemblyPieces.length, 'aria-valuenow': assemblyPlacedCount, 'aria-valuetext': assemblyProgressText, style: { height: 7, borderRadius: 999, background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.18)', overflow: 'hidden', marginBottom: 7 } },
            el('div', { style: { height: '100%', width: Math.round((assemblyPlacedCount / assemblyPieces.length) * 100) + '%', background: 'linear-gradient(90deg, #a78bfa, #f59e0b, #22c55e)' } })
          ),
          el('div', { key: 'cue', style: { fontSize: 11.5, color: T.soft, lineHeight: 1.45, marginBottom: 8 } }, assemblyScanCue),
          el('div', { key: 'pieces', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 6, marginBottom: 8 } }, assemblyPieces.map(function (piece, idx) {
            var active = idx === assemblyFocusIdx;
            var placed = !!assemblyPlaced[piece.id];
            return el('button', {
              key: piece.id,
              onClick: function () { setAssemblyFocus(idx); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': piece.label + ' fossil, ' + (placed ? 'placed' : (assemblyUnlocked ? 'ready to place' : 'locked until field scan is complete')) + ', supports ' + piece.role + '.',
              style: {
                textAlign: 'left',
                padding: '7px 8px',
                borderRadius: 8,
                border: '1px solid ' + (active ? 'rgba(167,139,250,0.74)' : T.border),
                background: active ? 'rgba(167,139,250,0.17)' : (placed ? 'rgba(34,197,94,0.12)' : T.deeper),
                color: T.text,
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 900
              }
            }, (placed ? 'Placed ' : (assemblyUnlocked ? 'Place ' : 'Find ')) + piece.label);
          })),
          el('div', { key: 'focus', style: { fontSize: 12.5, color: T.text, lineHeight: 1.48, marginBottom: 5 } }, 'Focus: ' + assemblyFocus.label + ' - ' + assemblyFocus.role),
          el('div', { key: 'detail', style: { fontSize: 12, color: T.soft, lineHeight: 1.48, marginBottom: 8 } }, assemblyFocus.detail),
          el('div', { key: 'insightTitle', style: { paddingTop: 7, borderTop: '1px solid ' + T.border, fontSize: 11.5, color: T.soft, fontWeight: 900, marginBottom: 6 } }, 'Anatomy insights ' + assemblyInsightCount + '/' + assemblyPieces.length),
          assemblyInsightCount ? el('div', { key: 'insights', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(126px, 1fr))', gap: 5, marginBottom: 8 } }, assemblyInsightPieces.map(function (piece) {
            return el('span', { key: piece.id, style: { fontSize: 11, fontWeight: 900, color: '#ddd6fe', padding: '4px 6px', borderRadius: 7, border: '1px solid rgba(167,139,250,0.34)', background: 'rgba(167,139,250,0.12)' } }, piece.label + ': ' + piece.role);
          })) : el('div', { key: 'insightsEmpty', style: { fontSize: 11.5, color: T.soft, lineHeight: 1.45, marginBottom: 8 } }, assemblyInsightText),
          el('div', { key: 'claimCoach', style: { fontSize: 11.5, color: T.soft, lineHeight: 1.45, marginBottom: 8 } }, 'Claim coach: ' + assemblyFocus.label + ' supports ' + assemblyClaimLabel + ' claims. ' + assemblyClaimCoach),
          el('div', { key: 'actions', style: { display: 'flex', flexWrap: 'wrap', gap: 7 } }, [
            el('button', { key: 'place', onClick: placeAssemblyPiece, disabled: !assemblyUnlocked || assemblyFocusPlaced, style: { fontSize: 12, fontWeight: 900, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.55)', background: (!assemblyUnlocked || assemblyFocusPlaced) ? 'rgba(167,139,250,0.09)' : 'rgba(167,139,250,0.20)', color: T.text, cursor: (!assemblyUnlocked || assemblyFocusPlaced) ? 'default' : 'pointer', opacity: (!assemblyUnlocked || assemblyFocusPlaced) ? 0.72 : 1 } }, assemblyFocusPlaced ? 'Fossil placed' : (assemblyUnlocked ? 'Place fossil' : 'Finish scan first')),
            el('button', { key: 'claim', onClick: useAssemblyClaim, disabled: !assemblyFocusPlaced, style: { fontSize: 12, fontWeight: 900, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(20,184,166,0.55)', background: assemblyFocusPlaced ? 'rgba(20,184,166,0.17)' : 'rgba(20,184,166,0.08)', color: T.text, cursor: assemblyFocusPlaced ? 'pointer' : 'default', opacity: assemblyFocusPlaced ? 1 : 0.72 } }, assemblyFocusPlaced ? 'Use in claim' : 'Place before claim'),
            el('button', { key: 'next', onClick: nextAssemblyFocus, style: { fontSize: 12, fontWeight: 900, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.55)', background: 'rgba(245,158,11,0.16)', color: T.text, cursor: 'pointer' } }, 'Next fossil'),
            el('button', { key: 'reset', onClick: resetAssembly, style: { fontSize: 12, fontWeight: 900, padding: '7px 12px', borderRadius: 8, border: '1px solid ' + T.border, background: 'transparent', color: T.text, cursor: 'pointer' } }, 'Reset puzzle')
          ]),
          assemblyComplete ? el('div', { key: 'done', style: { marginTop: 8, fontSize: 11.5, color: T.soft, lineHeight: 1.45 } }, 'Anatomy puzzle complete: skull, spine, ribs, pelvis, hindlimb, and tail now support a stronger reconstruction claim.') : null
        ], { marginBottom: 12, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.30)' });
        var claimOptions = [
          {
            id: 'scale',
            label: 'Scale',
            claim: dn.common + ' was a large animal at about ' + fmtLength(dn.lengthM) + ' long.',
            evidence: 'Use the length guide, human scale figure, and logged skull-to-hip anchors to support the size estimate.',
            reasoning: 'Size claims are strongest when measurements are connected to fossil anchors instead of just a number.'
          },
          {
            id: 'posture',
            label: 'Posture',
            claim: dn.common + ' posture is reconstructed from how the skull, shoulder, hip, and tail balance.',
            evidence: 'Compare the shoulder and hip anchors with the translucent body outline before deciding how the animal carried its weight.',
            reasoning: 'Posture is an inference: bones constrain it, but soft tissue and motion are reconstructed.'
          },
          {
            id: 'function',
            label: 'Function',
            claim: dn.common + ' anatomy can support a function claim about feeding, breathing, movement, or balance.',
            evidence: assemblySupportReady ? 'Use assembled fossils as body-system evidence: ' + assemblyInsightText + '.' : 'Place fossils in the assembly puzzle before making a function claim.',
            reasoning: 'Function claims are strongest when bone shape is tied to a body job such as sensing, breathing, moving, or balancing.'
          },
          {
            id: 'uncertainty',
            label: 'Uncertainty',
            claim: 'One part of the reconstruction should stay tentative: ' + dn.uncertain,
            evidence: 'Pair the fossil evidence note with the visible scan anchors and name what is not preserved directly.',
            reasoning: 'Good science separates observed fossils from model-based interpretation.'
          }
        ];
        var claimFocusId = d.field3dClaimFocus || 'scale';
        var claimFocus = claimOptions.filter(function (option) { return option.id === claimFocusId; })[0] || claimOptions[0];
        var claimBoneSpecies = d.field3dClaimBoneSpecies || null;
        var claimBoneId = d.field3dClaimBone || null;
        var claimEvidencePiece = claimBoneSpecies === dn.id ? assemblyPieces.filter(function (piece) { return piece.id === claimBoneId && !!assemblyPlaced[piece.id]; })[0] || null : null;
        var claimEvidenceText = claimEvidencePiece ? (claimEvidencePiece.label + ' - ' + claimEvidencePiece.role) : null;
        var claimEvidenceClaimLabel = claimEvidencePiece ? (claimEvidencePiece.claimLabel || claimFocus.label) : null;
        var claimEvidenceAnchor = claimEvidencePiece ? scanTargets.filter(function (target) { return target.id === claimEvidencePiece.scan; })[0] || null : null;
        var claimEvidenceTrailLabel = claimEvidencePiece && claimEvidenceAnchor ? (claimEvidencePiece.label + ' -> ' + claimEvidenceAnchor.label) : null;
        var claimEvidenceTrailText = claimEvidencePiece && claimEvidenceAnchor ? (claimEvidenceAnchor.label + ' scan -> ' + claimEvidencePiece.label + ' fossil -> ' + claimEvidenceClaimLabel + ' claim') : null;
        var loggedAnchorLabels = scanTargets.filter(function (target) { return !!scanLogged[target.id]; }).map(function (target) { return target.label; });
        var loggedAnchorText = loggedAnchorLabels.length ? loggedAnchorLabels.join(', ') : 'no scan anchors yet';
        var cerChecklist = [
          { label: 'Claim selected', done: true },
          { label: 'Anchor logged', done: scanLoggedCount > 0 },
          { label: 'Path linked', done: scanPathCount > 0 },
          { label: 'Anatomy support', done: assemblySupportReady },
          { label: 'Reasoning backed', done: scanComplete }
        ];
        var cerChecklistCount = cerChecklist.reduce(function (n, item) { return n + (item.done ? 1 : 0); }, 0);
        var cerDraftEvidence = scanLoggedCount ? 'Logged anchors: ' + loggedAnchorText + '; evidence path ' + scanPathCount + '/' + scanPathLinks.length + ' linked.' : 'Log skull, shoulder, or hip anchors before citing evidence.';
        if (assemblySupportReady) cerDraftEvidence += ' Anatomy insights: ' + assemblyInsightText + '.';
        else if (scanComplete) cerDraftEvidence += ' Assemble at least one fossil to add anatomy support.';
        if (claimEvidencePiece) cerDraftEvidence += ' Focused fossil: ' + claimEvidenceText + '.';
        if (claimEvidenceTrailText) cerDraftEvidence += ' Evidence trail: ' + claimEvidenceTrailText + '.';
        var cerDraftReasoning = scanComplete ? claimFocus.reasoning : (scanPathCount > 0 ? 'Use the linked path to explain how neighboring bones constrain the reconstruction.' : 'Connect observations before explaining the reconstruction.');
        if (assemblySupportReady) cerDraftReasoning += ' The assembled anatomy turns isolated bones into a connected body-system explanation.';
        if (claimEvidencePiece) cerDraftReasoning += ' The focused fossil keeps the claim tied to a named anatomy clue before broadening to the whole model.';
        if (claimEvidenceTrailText) cerDraftReasoning += ' The trail shows how an observed scan anchor supports the named fossil evidence.';
        var cerDraft = 'Claim: ' + claimFocus.claim + ' Evidence: ' + cerDraftEvidence + ' Reasoning: ' + cerDraftReasoning;
        function setClaimFocus(id) {
          var patch = { field3dClaimFocus: id };
          if (claimEvidencePiece && claimEvidencePiece.claimId !== id) {
            patch.field3dClaimBone = null;
            patch.field3dClaimBoneSpecies = dn.id;
          }
          upd(patch);
          announceToSR('3D claim builder: ' + id);
        }
        var claimBuilderPanel = panel([
          el('div', { key: 'h', style: { fontSize: 13, fontWeight: 900, marginBottom: 5 } }, 'Field claim builder'),
          el('div', { key: 'status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { fontSize: 11.5, color: T.soft, fontWeight: 800, marginBottom: 7 } }, 'Using ' + scanLoggedCount + '/' + scanTargets.length + ' logged anchors' + (scanComplete ? ' | Ready for CER' : ' | Scan more for a stronger claim')),
          el('div', { key: 'readiness', style: { fontSize: 12, color: T.text, fontWeight: 900, marginBottom: 5 } }, 'Claim strength ' + claimReadinessScore + '/5 | ' + claimReadinessLabel),
          el('div', { key: 'readinessMeter', role: 'progressbar', 'aria-label': 'Claim strength', 'aria-valuemin': 0, 'aria-valuemax': 5, 'aria-valuenow': claimReadinessScore, 'aria-valuetext': claimReadinessText, style: { height: 7, borderRadius: 999, background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.18)', overflow: 'hidden', marginBottom: 6 } }, el('div', { style: { height: '100%', width: claimReadinessPct + '%', background: 'linear-gradient(90deg, #f59e0b, #14b8a6, #22c55e)' } })),
          el('div', { key: 'readinessHint', style: { fontSize: 11.5, color: T.soft, lineHeight: 1.45, marginBottom: 8 } }, claimReadinessHint),
          el('div', { key: 'cerTitle', style: { paddingTop: 8, borderTop: '1px solid ' + T.border, fontSize: 12, color: T.text, fontWeight: 900, marginBottom: 6 } }, 'CER rehearsal | Checklist ' + cerChecklistCount + '/' + cerChecklist.length),
          el('div', { key: 'cerChecks', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 5, marginBottom: 7 } }, cerChecklist.map(function (item) {
            return el('span', { key: item.label, style: { fontSize: 11, fontWeight: 900, color: item.done ? '#bbf7d0' : T.soft, padding: '4px 6px', borderRadius: 7, border: '1px solid ' + (item.done ? 'rgba(34,197,94,0.42)' : T.border), background: item.done ? 'rgba(34,197,94,0.12)' : 'rgba(15,23,42,0.24)' } }, (item.done ? 'Done ' : 'Need ') + item.label);
          })),
          el('div', { key: 'cerDraft', style: { fontSize: 11.5, color: T.soft, lineHeight: 1.48, marginBottom: 8 } }, cerDraft),
          claimEvidencePiece ? el('div', { key: 'evidenceFocus', style: { fontSize: 11.5, color: T.text, lineHeight: 1.45, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(20,184,166,0.35)', background: 'rgba(20,184,166,0.10)', marginBottom: 6 } }, 'Evidence focus: ' + claimEvidenceText + ' | ' + claimEvidenceClaimLabel + ' claim') : null,
          claimEvidenceTrailText ? el('div', { key: 'evidenceTrail', style: { fontSize: 11.5, color: T.text, lineHeight: 1.45, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(94,234,212,0.32)', background: 'rgba(94,234,212,0.08)', marginBottom: 8 } }, 'Evidence trail: ' + claimEvidenceTrailText) : null,
          el('div', { key: 'modes', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 6, marginBottom: 8 } }, claimOptions.map(function (option) {
            var active = option.id === claimFocus.id;
            return el('button', {
              key: option.id,
              onClick: function () { setClaimFocus(option.id); },
              'aria-pressed': active ? 'true' : 'false',
              style: { textAlign: 'left', padding: '7px 8px', borderRadius: 8, border: '1px solid ' + (active ? 'rgba(20,184,166,0.65)' : T.border), background: active ? 'rgba(20,184,166,0.15)' : T.deeper, color: T.text, cursor: 'pointer', fontSize: 11.5, fontWeight: 900 }
            }, option.label);
          })),
          el('div', { key: 'claim', style: { padding: '8px 0', borderTop: '1px solid ' + T.border } }, el('div', { style: { fontSize: 11, color: T.soft, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 } }, 'Claim'), el('div', { style: { fontSize: 12.5, color: T.text, lineHeight: 1.48 } }, claimFocus.claim)),
          el('div', { key: 'evidence', style: { padding: '8px 0', borderTop: '1px solid ' + T.border } }, el('div', { style: { fontSize: 11, color: T.soft, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 } }, 'Evidence'), el('div', { style: { fontSize: 12.5, color: T.text, lineHeight: 1.48 } }, claimFocus.evidence)),
          el('div', { key: 'reasoning', style: { paddingTop: 8, borderTop: '1px solid ' + T.border } }, el('div', { style: { fontSize: 11, color: T.soft, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 } }, 'Reasoning'), el('div', { style: { fontSize: 12.5, color: T.text, lineHeight: 1.48 } }, claimFocus.reasoning))
        ], { marginBottom: 12, background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.25)' });
        var challengeSteps = [
          {
            kind: 'evidence',
            prompt: 'The fossil record for this reconstruction: ' + dn.howKnow,
            feedback: 'Evidence is the fossil material or measurement the model is anchored to.'
          },
          {
            kind: 'inference',
            prompt: 'The translucent body outline estimates muscles, skin, and soft tissue around the skeleton.',
            feedback: 'Soft tissue is inferred from bones, relatives, biomechanics, and comparison, not directly preserved here.'
          },
          {
            kind: 'uncertainty',
            prompt: 'Unresolved question for this species: ' + dn.uncertain,
            feedback: 'Uncertainty marks what scientists still debate or cannot directly observe from the available fossils.'
          }
        ];
        var challengeIdx = modIndex(d.field3dChallengeIdx, challengeSteps.length);
        var challengeStep = challengeSteps[challengeIdx];
        var challengePicked = d.field3dChallengePicked || null;
        var challengeScore = Math.max(0, Math.floor(numVal(d.field3dChallengeScore, 0)));
        var challengeDone = Math.max(0, Math.floor(numVal(d.field3dChallengeDone, 0)));
        var challengeCyclePct = Math.round(((challengeIdx + 1) / challengeSteps.length) * 100);
        var challengeCaseLabel = 'Case ' + (challengeIdx + 1) + '/' + challengeSteps.length;
        var challengeChoices = [
          { id: 'evidence', label: 'Evidence', color: '#38bdf8' },
          { id: 'inference', label: 'Inference', color: '#f59e0b' },
          { id: 'uncertainty', label: 'Uncertainty', color: '#a78bfa' }
        ];
        function pickChallenge(choice) {
          if (challengePicked) return;
          var correct = choice === challengeStep.kind;
          upd({
            field3dChallengePicked: choice,
            field3dChallengeScore: challengeScore + (correct ? 1 : 0),
            field3dChallengeDone: challengeDone + 1
          });
          announceToSR(correct ? 'Correct reconstruction classification' : 'Not quite. Read the explanation.');
        }
        function nextChallenge() {
          upd({ field3dChallengeIdx: challengeIdx + 1, field3dChallengePicked: null });
          announceToSR('Next reconstruction challenge');
        }
        var visualKeyPanel = panel([
          el('div', { key: 'h', style: { fontSize: 13, fontWeight: 900, marginBottom: 5 } }, 'Visual key'),
          keyItem('#f8fafc', 'Skeleton proxy', 'White rods, vertebrae, rib loops, pelvis, and joints show the inferred bone layout. Skull, spine, pelvis, and tail callouts keep the main landmarks easy to follow.'),
          keyItem(dColor(dn.diet), 'Body inference', 'Translucent color and a thin contour mesh show estimated soft-tissue volume around the visible skeleton.'),
          keyItem(dColor(dn.diet), 'Species anatomy cues', 'Simplified horns, brow bosses, beaks, plates, sails, armor, crests, domes, claws, thumb spikes, or feather fans appear for supported clades. They are diagram cues, not specimen scans.'),
          keyItem('#38bdf8', 'Evidence marker', 'Blue points mark fossil anchor locations.'),
          keyItem('#14b8a6', 'Evidence path', 'Cyan links connect anchors; green links show a completed evidence chain.'),
          keyItem('#22c55e', 'Logged anchor', 'Green rings show evidence points already recorded in the observation log.'),
          keyItem('#a78bfa', 'Assembly piece', 'Purple sockets and loose fossils show the anatomy puzzle; amber marks the piece in focus.'),
          keyItem('#14b8a6', 'Claim evidence', 'Teal halo and connector line mark the assembled fossil currently attached to the CER claim.'),
          keyItem('#f59e0b', 'Scan focus', 'Amber ring pulses around the current evidence target.'),
          keyItem('#0f172a', 'Anchor label', 'Floating labels identify skull, shoulder, and hip evidence points.'),
          keyItem('#94a3b8', 'Human scale', 'Gray figure keeps size estimates concrete.'),
          keyItem('#38bdf8', 'Length guide', 'Cyan floor line spans snout to tail with one-meter ticks, five-meter labels, and the full estimated length.'),
          keyItem('#facc15', 'Height guide', 'Gold vertical staff marks estimated standing height with one-meter ticks, five-meter labels, and the full estimated height.'),
          keyItem('#f59e0b', 'Survey compass', 'Amber boundary ropes and north arrow orient the reconstruction inside its excavation grid.')
        ], { marginBottom: 12 });
        var challengePanel = panel([
          el('div', { key: 'h', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
            el('div', { style: { fontSize: 13, fontWeight: 900 } }, 'Reconstruction challenge'),
            el('div', { style: { fontSize: 11.5, color: T.soft, fontWeight: 800 } }, challengeCaseLabel + ' | Score: ' + challengeScore + '/' + challengeDone)
          ),
          el('div', { key: 'meter', role: 'progressbar', 'aria-label': 'Reconstruction challenge progress', 'aria-valuemin': 1, 'aria-valuemax': challengeSteps.length, 'aria-valuenow': challengeIdx + 1, 'aria-valuetext': challengeCaseLabel, style: { height: 6, borderRadius: 999, background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.18)', overflow: 'hidden', marginBottom: 8 } },
            el('div', { style: { height: '100%', width: challengeCyclePct + '%', background: 'linear-gradient(90deg, #14b8a6, #38bdf8)' } })
          ),
          el('div', { key: 'q', style: { fontSize: 12.5, color: T.text, lineHeight: 1.5, padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.deeper, marginBottom: 8 } }, challengeStep.prompt),
          el('div', { key: 'opts', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 6 } }, challengeChoices.map(function (choice) {
            var picked = challengePicked === choice.id;
            var correct = challengePicked && choice.id === challengeStep.kind;
            var wrongPick = picked && choice.id !== challengeStep.kind;
            return el('button', {
              key: choice.id,
              onClick: function () { pickChallenge(choice.id); },
              disabled: !!challengePicked,
              style: {
                textAlign: 'center',
                padding: '7px 8px',
                borderRadius: 8,
                border: '1px solid ' + (correct ? '#22c55e' : (wrongPick ? '#ef4444' : choice.color + '88')),
                background: correct ? 'rgba(34,197,94,0.18)' : (wrongPick ? 'rgba(239,68,68,0.15)' : choice.color + '18'),
                color: T.text,
                cursor: challengePicked ? 'default' : 'pointer',
                fontSize: 12,
                fontWeight: 800
              }
            }, choice.label);
          })),
          challengePicked ? el('div', { key: 'fb', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { marginTop: 8 } },
            el('div', { style: { fontSize: 12, color: T.soft, lineHeight: 1.45, marginBottom: 8 } }, (challengePicked === challengeStep.kind ? 'Correct. ' : 'Not quite. ') + challengeStep.feedback),
            el('button', { onClick: nextChallenge, style: { fontSize: 12, fontWeight: 800, padding: '7px 12px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', cursor: 'pointer' } }, 'Next challenge')
          ) : el('div', { key: 'hint', style: { marginTop: 8, fontSize: 11.5, color: T.soft, lineHeight: 1.45 } }, 'Classify the statement before using it in a claim.')
        ], { marginBottom: 12, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.32)' });
        return el('div', null,
          sectionTitle('3D', 'Field Station', 'A lightweight reconstruction lab. The model is procedural and scale-aware: it visualizes evidence and uncertainty instead of pretending we know every detail.'),
          el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 14, alignItems: 'start' } },
            el('div', { key: 'viewer' },
              el('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' } },
                el('select', { value: dn.id, 'aria-label': 'Choose species for 3D field station', onChange: function (e) { upd({ field3dSelected: e.target.value, selected: e.target.value, field3dScanTargetIdx: 0, field3dScanLogged: {}, field3dScanSpecies: e.target.value, field3dAssemblyPlaced: {}, field3dAssemblySpecies: e.target.value, field3dAssemblyFocusIdx: 0, field3dClaimBone: null, field3dClaimBoneSpecies: e.target.value }); announceToSR('3D field station showing ' + (byId(e.target.value) || {}).common); }, style: { flex: '1 1 240px', minWidth: 220, padding: '9px 10px', borderRadius: 9, border: '1px solid ' + T.border, background: T.deeper, color: T.text, fontSize: 13 } }, options),
                el('button', { onClick: function () { upd({ tab: 'explore', selected: dn.id }); }, style: { padding: '9px 12px', borderRadius: 9, border: '1px solid ' + T.border, background: 'transparent', color: T.text, fontSize: 12.5, fontWeight: 800, cursor: 'pointer' } }, 'Open species file'),
                el('button', { onClick: function () { upd('field3dAutoRotate', !autoRotate); announceToSR(autoRotate ? '3D auto spin paused' : '3D auto spin resumed'); }, 'aria-pressed': autoRotate ? 'true' : 'false', style: { padding: '9px 12px', borderRadius: 9, border: '1px solid ' + (autoRotate ? '#14b8a6' : T.border), background: autoRotate ? 'rgba(20,184,166,0.15)' : 'transparent', color: T.text, fontSize: 12.5, fontWeight: 800, cursor: 'pointer' } }, autoRotate ? 'Pause spin' : 'Auto spin')
              ),
              presetStrip,
              el(DinoFieldStation3DStable, { species: dn, showSkeleton: showSkeleton, showBody: showBody, showHuman: showHuman, showEvidence: showEvidence, autoRotate: autoRotate, scanTarget: scanTarget.id, scanLabel: scanTarget.label, loggedAnchors: scanLogged, loggedAnchorKey: scanLoggedKey, loggedCount: scanLoggedCount, scanTotal: scanTargets.length, pathLoggedCount: scanPathCount, pathTotal: scanPathLinks.length, assemblyPlaced: assemblyPlaced, assemblyPlacedKey: assemblyPlacedKey, assemblyPlacedCount: assemblyPlacedCount, assemblyTotal: assemblyPieces.length, assemblyFocus: assemblyFocus.id, assemblyUnlocked: assemblyUnlocked, claimEvidenceFocus: claimEvidencePiece ? claimEvidencePiece.id : null, claimEvidenceLabel: claimEvidencePiece ? claimEvidencePiece.label : null, claimEvidenceAnchor: claimEvidenceAnchor ? claimEvidenceAnchor.id : null, claimEvidenceAnchorLabel: claimEvidenceAnchor ? claimEvidenceAnchor.label : null, claimEvidenceTrailLabel: claimEvidenceTrailLabel, dietColor: dColor(dn.diet) }),
              el('div', { style: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } }, taskCards)
            ),
            el('div', { key: 'side' },
              panel([
                el('div', { key: 'h', style: { fontSize: 16, fontWeight: 900, marginBottom: 2 } }, dn.common),
                el('div', { key: 's', style: { fontSize: 12, color: T.soft, fontStyle: 'italic', marginBottom: 8 } }, dn.name),
                el('div', { key: 'b', style: { marginBottom: 8 } }, badge(periodName(dn.period) + ' · ' + fmtMya(dn), pColor(dn.period)), badge((DIET_ICON[dn.diet] || '') + ' ' + cap(dn.diet), dColor(dn.diet)), badge(GROUP_LABEL[dn.group] || cap(dn.group), '#38bdf8')),
                el('div', { key: 'profile', style: { marginBottom: 9, padding: 9, borderRadius: 8, background: 'rgba(20,184,166,0.09)', border: '1px solid rgba(20,184,166,0.30)' } },
                  el('div', { style: { fontSize: 11.5, fontWeight: 900, color: '#5eead4', marginBottom: 3 } }, 'Reconstruction profile | ' + cap(reconstructionProfile.coverage) + ' coverage'),
                  el('div', { style: { fontSize: 12.5, fontWeight: 800, marginBottom: 3 } }, reconstructionProfile.label),
                  el('div', { style: { fontSize: 11.5, color: T.soft, lineHeight: 1.45 } }, reconstructionProfile.coverageNote + ' Profile differences are clade-based and remain simplified.')
                ),
                el('div', { key: 'rows' }, evidenceRows)
              ], { marginBottom: 12 }),
              scanCoachPanel,
              assemblyPanel,
              claimBuilderPanel,
              challengePanel,
              visualKeyPanel,
              panel([
                el('div', { key: 'h', style: { fontSize: 13, fontWeight: 900, marginBottom: 4 } }, 'Reconstruction layers'),
                checkRow('field3dShowSkeleton', showSkeleton, 'Skeleton proxy', 'Shows the inferred bone layout from skull, spine, limbs, tail, and posture.'),
                checkRow('field3dShowBody', showBody, 'Body outline', 'Adds soft-tissue volume. This is the most interpretive layer.'),
                checkRow('field3dShowHuman', showHuman, 'Human scale', 'Keeps size estimates concrete by comparing to a 1.7 m person.'),
                checkRow('field3dShowEvidence', showEvidence, 'Evidence markers', 'Marks skull, shoulder, and hip as anchor points for reconstruction.')
              ])
            )
          )
        );
      }

      function renderCompare() {
        var aId = d.compareA || null, bId = d.compareB || null;
        var picks = [aId, bId].filter(Boolean).map(byId).filter(Boolean);
        function picker(slot, current) {
          return el('select', { key: slot, value: current || '', 'aria-label': 'Choose dinosaur ' + slot, onChange: function (event) { var value = event.target.value || null; upd(slot === 'A' ? 'compareA' : 'compareB', value); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + T.border, background: T.deeper, color: T.text, fontSize: 13 } }, [el('option', { key: 'none', value: '' }, 'Pick a dinosaur...')].concat(DINOS.slice().sort(function (x, y) { return x.common < y.common ? -1 : 1; }).map(function (dn) { return el('option', { key: dn.id, value: dn.id }, dn.common); })));
        }
        function metricBar(label, value, max, unit, color, scale) {
          var safeValue = value != null ? Math.max(0, value) : 0;
          var ratio = max > 0 ? safeValue / max : 0;
          if (scale === 'log') ratio = max > 0 ? Math.log10(safeValue + 1) / Math.log10(max + 1) : 0;
          var pct = value != null ? Math.max(2, Math.round(ratio * 100)) : 0;
          var scaleText = scale === 'log' ? ' on a logarithmic scale' : '';
          var valueText = value != null ? (label + ': ' + value + ' ' + unit + scaleText + ', ' + pct + '% of the comparison scale.') : (label + ': value unknown.');
          return el('div', { style: { marginBottom: 8 } },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 2 } }, el('span', { style: { color: T.soft } }, label), el('span', { style: { fontWeight: 700 } }, value != null ? (value + ' ' + unit) : '?')),
            el('div', { role: 'progressbar', 'aria-label': label + ' comparison value', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': safeValue, 'aria-valuetext': valueText, style: { height: 12, borderRadius: 6, background: T.deeper, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.18)' } }, el('div', { style: { height: '100%', width: pct + '%', background: color, borderRadius: 6 } })));
        }
        var content;
        if (picks.length < 2) {
          content = panel([el('div', { key: 'h', style: { fontWeight: 800, marginBottom: 4 } }, 'Build a comparison'), el('div', { key: 'b', style: { color: T.soft, fontSize: 13, lineHeight: 1.5 } }, 'Pick two animals. The charts use one shared scale per metric, then the verdict checks time overlap, present-day fossil regions, and evidence coverage.')]);
        } else {
          var maxLen = Math.max(picks[0].lengthM, picks[1].lengthM, 1.7);
          var maxMassT = Math.max(picks[0].weightKg / 1000, picks[1].weightKg / 1000, 0.07);
          var maxSpd = Math.max(picks[0].speedKmh, picks[1].speedKmh, 1);
          var maxHt = Math.max(picks[0].heightM, picks[1].heightM, 1.7);
          var cols = picks.map(function (dn, index) {
            var color = index === 0 ? '#38bdf8' : '#f59e0b';
            var profile = reconstructionProfileFor(dn);
            var massT = Math.round(dn.weightKg / 100) / 10;
            return panel([
              el('div', { key: 'nm', style: { fontWeight: 900, fontSize: 16, marginBottom: 2 } }, dn.common),
              el('div', { key: 'bd', style: { marginBottom: 7 } }, badge(periodName(dn.period), pColor(dn.period)), badge((DIET_ICON[dn.diet] || '') + ' ' + cap(dn.diet), dColor(dn.diet))),
              el('div', { key: 'profile', style: { fontSize: 11.5, color: T.soft, marginBottom: 9, lineHeight: 1.4 } }, profile.label + ' | ' + cap(profile.coverage) + ' fossil coverage'),
              metricBar('Length', dn.lengthM, maxLen, 'm', color, 'linear'),
              metricBar('Height', dn.heightM, maxHt, 'm', color, 'linear'),
              metricBar('Mass', massT, maxMassT, 't', color, 'log'),
              metricBar('Top speed estimate', dn.speedKmh, maxSpd, 'km/h', color, 'linear'),
              el('div', { key: 'unc', style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: T.soft, fontSize: 11.5, lineHeight: 1.4 } }, 'Open question: ' + dn.uncertain)
            ], { key: dn.id, borderTop: '3px solid ' + color });
          });
          var longer = picks[0].lengthM === picks[1].lengthM ? null : (picks[0].lengthM > picks[1].lengthM ? picks[0] : picks[1]);
          var heavier = picks[0].weightKg === picks[1].weightKg ? null : (picks[0].weightKg > picks[1].weightKg ? picks[0] : picks[1]);
          var overlapLow = Math.max(picks[0].myaLo, picks[1].myaLo);
          var overlapHigh = Math.min(picks[0].myaHi, picks[1].myaHi);
          var timeOverlap = overlapLow <= overlapHigh;
          var sameContinent = continentOf(picks[0].region) === continentOf(picks[1].region);
          var verdict = panel([
            el('div', { key: 't', style: { fontWeight: 900, marginBottom: 7 } }, 'Evidence-aware verdict'),
            el('div', { key: 'l', style: { fontSize: 12.5, marginBottom: 4 } }, longer ? ('Longer: ' + longer.common + ' (' + fmtLength(longer.lengthM) + ')') : 'Same estimated length.'),
            el('div', { key: 'w', style: { fontSize: 12.5, marginBottom: 4 } }, heavier ? ('Heavier: ' + heavier.common + ' (' + fmtWeight(heavier.weightKg) + ')') : 'Same estimated mass.'),
            el('div', { key: 'time', style: { fontSize: 12.5, marginBottom: 4, color: timeOverlap ? '#86efac' : T.soft } }, timeOverlap ? ('Time ranges overlap around ' + overlapHigh + '–' + overlapLow + ' mya.') : 'Their known time ranges do not overlap.'),
            el('div', { key: 'place', style: { fontSize: 12.5, marginBottom: 4, color: sameContinent ? '#7dd3fc' : T.soft } }, sameContinent ? ('Both are known from present-day ' + continentOf(picks[0].region) + '.') : 'Their fossils are known from different present-day continents.'),
            el('div', { key: 'n', style: { fontSize: 11.5, color: T.soft, marginTop: 7, lineHeight: 1.45 } }, 'Length and height use linear scales. Mass uses a logarithmic scale so a multi-ton animal does not erase a small one. Speed, mass, posture, and soft tissue are estimates—not direct measurements.')
          ], { marginTop: 12, background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.26)' });
          content = el('div', null, el('div', { className: 'dinolab-compare-grid', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } }, cols), verdict);
        }
        return el('div', null,
          sectionTitle('⚖️', 'Compare two dinosaurs', 'Shared axes reveal scale; time, place, and fossil coverage keep the conclusion honest.'),
          el('div', { className: 'dinolab-compare-pickers', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 } },
            el('div', { key: 'a' }, el('div', { style: { fontSize: 12, color: T.text, fontWeight: 700, marginBottom: 4 } }, el('span', { 'aria-hidden': 'true', style: { color: '#38bdf8' } }, '● '), 'Dinosaur A'), picker('A', aId)),
            el('div', { key: 'b' }, el('div', { style: { fontSize: 12, color: T.text, fontWeight: 700, marginBottom: 4 } }, el('span', { 'aria-hidden': 'true', style: { color: '#f59e0b' } }, '● '), 'Dinosaur B'), picker('B', bId))),
          content);
      }
      function renderDig() {
        var seed = Math.max(1, Math.floor(numVal(d.digSeed, 1)));
        var revealed = arrVal(d.digRevealed);
        var guess = d.digGuess || null;
        var solved = d.digSolvedFor === seed;
        var rng = mulberry32(seed * 2654435761 % 4294967296);
        var pool = DINOS.filter(function (dn) { return dn.group !== 'other'; });
        var chosen = pool[Math.floor(rng() * pool.length)];
        var COLS = 6, ROWS = 4, CELLS = COLS * ROWS;
        var boneCells = {}, boneCount = 8 + Math.floor(rng() * 5), placed = 0, guardLoop = 0;
        while (placed < boneCount && guardLoop < 500) { var idx = Math.floor(rng() * CELLS); if (!boneCells[idx]) { boneCells[idx] = true; placed++; } guardLoop++; }
        var dugBones = revealed.filter(function (i) { return boneCells[i]; }).length;
        var totalBones = Object.keys(boneCells).length;
        var clueList = [
          { at: 2, text: 'Period: ' + periodName(chosen.period) + ' (' + chosen.epoch + ').' },
          { at: 4, text: 'Diet: ' + cap(chosen.diet) + ' ' + (DIET_ICON[chosen.diet] || '') + '.' },
          { at: 6, text: 'Group: ' + (GROUP_LABEL[chosen.group] || cap(chosen.group)) + '.' },
          { at: 9, text: 'Length: about ' + fmtLength(chosen.lengthM) + '.' },
          { at: 12, text: 'Found in: ' + chosen.region + '.' },
          { at: 15, text: 'Trait: ' + (chosen.traits[0] || 'distinctive build') + '.' }
        ];
        var clues = clueList.filter(function (c) { return revealed.length >= c.at; });
        var digStatusText = 'Site #' + seed + ' | bones found: ' + dugBones + '/' + totalBones + ' | cells dug: ' + revealed.length + '/' + CELLS;
        var digGridDesc = 'Dig grid with ' + ROWS + ' rows and ' + COLS + ' columns. Revealed cells stay focusable so bone and rock results can be reviewed.';
        function dig(i) { if (revealed.indexOf(i) !== -1) return; upd('digRevealed', revealed.concat([i])); announceToSR(boneCells[i] ? 'Bone found' : 'Just rock'); }
        function newDig() { upd({ digSeed: seed + 1, digRevealed: [], digGuess: null, digSolvedFor: null }); announceToSR('New dig site loaded'); }
        function makeGuess(id) { var correct = id === chosen.id; var patch = { digGuess: id }; if (correct && !solved) { patch.digSolvedFor = seed; patch.digsSolved = (d.digsSolved || 0) + 1; } upd(patch); announceToSR(correct ? 'Correct identification' : 'Not quite, keep digging'); }
        var gridCells = [];
        for (var c = 0; c < CELLS; c++) {
          (function (cellIdx) {
            var isDug = revealed.indexOf(cellIdx) !== -1, hasBone = boneCells[cellIdx];
            var row = Math.floor(cellIdx / COLS) + 1, col = (cellIdx % COLS) + 1;
            var cellState = isDug ? (hasBone ? 'bone fragment uncovered' : 'empty rock uncovered') : 'unopened rock';
            var cellLabel = 'Cell ' + (cellIdx + 1) + ', row ' + row + ', column ' + col + ', ' + cellState + (isDug ? '.' : '. Press to dig.');
            gridCells.push(el('button', { key: 'cell' + cellIdx, onClick: function () { dig(cellIdx); }, 'aria-label': cellLabel, 'aria-disabled': isDug ? 'true' : 'false', style: { aspectRatio: '1 / 1', borderRadius: 8, cursor: isDug ? 'default' : 'pointer', border: '1px solid ' + T.border, background: isDug ? (hasBone ? 'rgba(245,158,11,0.25)' : T.deeper) : '#7c5e3b', color: T.text, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, isDug ? (hasBone ? '\uD83E\uDDB4' : '\u00b7') : ''));
          })(c);
        }
        var guessGrid = pool.slice().sort(function (x, y) { return x.common < y.common ? -1 : 1; }).map(function (dn) {
          var picked = guess === dn.id, isAnswer = solved && dn.id === chosen.id;
          var guessState = isAnswer ? 'correct answer' : (picked ? 'selected guess' : 'not selected');
          return el('button', { key: 'g' + dn.id, onClick: function () { makeGuess(dn.id); }, 'aria-label': 'Guess ' + dn.common + ', ' + guessState, 'aria-pressed': (picked || isAnswer) ? 'true' : 'false', style: { fontSize: 11.5, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: '1px solid ' + (isAnswer ? '#22c55e' : (picked ? '#ef4444' : T.border)), background: isAnswer ? 'rgba(34,197,94,0.18)' : (picked && !solved ? 'rgba(239,68,68,0.15)' : T.deeper), color: T.text } }, dn.common);
        });
        return el('div', null, sectionTitle('⛏️', 'Excavate a fossil', 'Dig cells to uncover bones. Clues appear as you go. Then identify what you found.'),
          el('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 16 } },
            el('div', { key: 'left' }, el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } }, el('span', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { fontSize: 12.5, color: T.soft } }, digStatusText), el('button', { onClick: newDig, style: { fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: '1px solid ' + T.border, background: 'transparent', color: T.text, cursor: 'pointer' } }, '🔄 New dig')), el('div', { role: 'group', 'aria-label': digGridDesc, style: { display: 'grid', gridTemplateColumns: 'repeat(' + COLS + ', 1fr)', gap: 6 } }, gridCells), solved ? panel([el('div', { key: 's', style: { fontWeight: 800, color: T.text, marginBottom: 4 } }, '✅ It is ' + chosen.common + '!'), el('div', { key: 'b', style: { fontSize: 12.5, color: T.soft } }, chosen.blurb)], { marginTop: 12, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.35)' }) : null),
            el('div', { key: 'right' }, panel([el('div', { key: 't', style: { fontWeight: 700, marginBottom: 6 } }, '🔎 Field clues'), clues.length ? el('ul', { key: 'u', style: { margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 } }, clues.map(function (cl, i) { return el('li', { key: i }, cl.text); })) : el('div', { key: 'n', style: { fontSize: 12.5, color: T.soft } }, 'Dig at least two cells to reveal your first clue.')]), el('div', { style: { marginTop: 12, fontSize: 12, fontWeight: 700, color: T.soft, marginBottom: 6 } }, 'Identify the find'), el('div', { role: 'group', 'aria-label': 'Identify the find choices', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6, maxHeight: 280, overflowY: 'auto' } }, guessGrid))
          )
        );
      }

      function renderClassify() {
        var tree = CLADES.map(function (node) {
          return el('div', { key: node.id, style: { marginLeft: node.depth * 18, marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid ' + (node.depth === 0 ? '#22c55e' : (node.depth === 1 ? '#38bdf8' : T.border)) } },
            el('div', { style: { fontWeight: 800, fontSize: 14 } }, node.name, el('span', { style: { fontSize: 11, fontStyle: 'italic', color: T.soft, fontWeight: 400, marginLeft: 6 } }, '"' + node.meaning + '"')),
            el('div', { style: { fontSize: 12.5, color: T.text, margin: '2px 0 4px', lineHeight: 1.5 } }, node.blurb),
            node.examples.length ? el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5 } }, node.examples.map(function (exId) { var dn = byId(exId); if (!dn) return null; return el('button', { key: exId, onClick: function () { upd({ tab: 'explore', selected: exId }); }, style: { fontSize: 11, padding: '2px 8px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + T.border, background: T.deeper, color: T.text } }, dn.common); })) : null
          );
        });
        var sortPool = DINOS.filter(function (dn) { return dn.group !== 'other'; });
        var sIdx = modIndex(d.sortIdx, sortPool.length);
        var target = sortPool[sIdx];
        var sAnswered = d.sortAnswered || false, sPicked = d.sortPicked || null;
        var groups = [{ id: 'theropod', label: t('stem.dinolab.theropod_mostly_meat_eaters_two_legs', 'Theropod (mostly meat-eaters, two legs)') }, { id: 'sauropod', label: t('stem.dinolab.sauropodomorph_long_necked_plant_eater', 'Sauropodomorph (long-necked plant-eaters)') }, { id: 'ornithischian', label: t('stem.dinolab.ornithischian_bird_hipped_plant_eaters', 'Ornithischian (bird-hipped plant-eaters)') }];
        function pickGroup(g) { if (sAnswered) return; var correct = g === target.group; upd({ sortPicked: g, sortAnswered: true, sortScore: (d.sortScore || 0) + (correct ? 1 : 0), sortDone: (d.sortDone || 0) + 1 }); }
        function nextSort() { upd({ sortIdx: (sIdx + 1) % sortPool.length, sortAnswered: false, sortPicked: null }); }
        var activity = panel([
          el('div', { key: 'h', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } }, el('div', { style: { fontWeight: 700 } }, '🧩 Sort the dinosaur'), el('div', { style: { fontSize: 12, color: T.soft } }, 'Score: ' + (d.sortScore || 0) + '/' + (d.sortDone || 0))),
          el('div', { key: 'q', style: { fontSize: 14, margin: '8px 0' } }, 'Which group does ', el('strong', null, target.common), ' belong to?'),
          el('div', { key: 'opts', style: { display: 'flex', flexDirection: 'column', gap: 6 } }, groups.map(function (g) {
            var isCorrect = sAnswered && g.id === target.group, isWrongPick = sAnswered && g.id === sPicked && g.id !== target.group;
            var groupState = isCorrect ? 'correct answer' : (isWrongPick ? 'selected incorrect answer' : (sAnswered ? 'not selected' : 'available answer'));
            return el('button', { key: g.id, onClick: function () { pickGroup(g.id); }, 'aria-disabled': sAnswered ? 'true' : 'false', 'aria-pressed': sPicked === g.id ? 'true' : 'false', 'aria-label': g.label + ', ' + groupState, style: { textAlign: 'left', padding: '8px 12px', borderRadius: 8, cursor: sAnswered ? 'default' : 'pointer', border: '1px solid ' + (isCorrect ? '#22c55e' : (isWrongPick ? '#ef4444' : T.border)), background: isCorrect ? 'rgba(34,197,94,0.18)' : (isWrongPick ? 'rgba(239,68,68,0.15)' : T.deeper), color: T.text, fontSize: 12.5 } }, g.label);
          })),
          sAnswered ? el('div', { key: 'fb', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { marginTop: 8 } }, el('div', { style: { fontSize: 12.5, color: T.soft, marginBottom: 6 } }, (sPicked === target.group ? '✅ Correct. ' : '❌ Not quite. ') + target.common + ' is a ' + (GROUP_LABEL[target.group] || target.group) + '.'), el('button', { onClick: nextSort, style: { fontSize: 12.5, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', cursor: 'pointer' } }, 'Next →')) : null
        ], { marginBottom: 14 });
        return el('div', null, sectionTitle('🌳', 'The dinosaur family tree', 'Two great branches split early: the "lizard-hipped" Saurischia and the "bird-hipped" Ornithischia.'), activity, panel(tree));
      }

      function renderExtinction() {
        var openId = d.extOpen || 'ext_kpg';
        var rows = EXTINCTIONS.map(function (ev) {
          var open = openId === ev.id;
          return el('div', { key: ev.id, style: { marginBottom: 10 } },
            el('button', { onClick: function () { upd('extOpen', open ? null : ev.id); }, 'aria-expanded': open ? 'true' : 'false', style: { width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: 10, border: '1px solid ' + (ev.id === 'ext_kpg' ? 'rgba(239,68,68,0.45)' : T.border), background: T.panel, color: T.text, padding: 12 } },
              el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } }, el('span', { style: { fontWeight: 800, fontSize: 14 } }, (ev.id === 'ext_kpg' ? '☄️ ' : '') + ev.name), el('span', { style: { fontSize: 12, color: T.soft } }, ev.mya + ' million years ago')),
              el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 } }, el('div', { style: { flex: 1, height: 10, borderRadius: 6, background: T.deeper, overflow: 'hidden' } }, el('div', { style: { height: '100%', width: ev.pctLost + '%', background: '#ef4444' } })), el('span', { style: { fontSize: 11.5, color: T.text, fontWeight: 700, minWidth: 92, textAlign: 'right' } }, '~' + ev.pctLost + '% species lost'))
            ),
            open ? panel([el('div', { key: 'c', style: { fontSize: 12.5, lineHeight: 1.55, marginBottom: 6 } }, el('strong', { style: { color: T.text } }, 'Cause: '), ev.cause), el('div', { key: 'e', style: { fontSize: 12.5, lineHeight: 1.55, marginBottom: 6 } }, el('strong', { style: { color: T.text } }, 'Effect: '), ev.effect), el('div', { key: 'n', style: { fontSize: 12, color: T.soft, fontStyle: 'italic' } }, __alloT('stem.dinolab.' + (ev.id) + '_note', ev.note))], { marginTop: 6 }) : null
          );
        });
        var kpgEvidence = panel([el('div', { key: 'h', style: { fontWeight: 800, fontSize: 14, marginBottom: 6 } }, '☄️ The K-Pg case, up close'), el('div', { key: 's', style: { fontSize: 12.5, color: T.soft, marginBottom: 8, lineHeight: 1.5 } }, 'Several independent lines of evidence point to the same moment.'), el('div', { key: 'e' }, KPG_EVIDENCE.map(function (ke) { return el('div', { key: ke.id, style: { padding: 10, borderRadius: 8, background: T.deeper, border: '1px solid ' + T.border, marginBottom: 6 } }, el('div', { style: { fontWeight: 700, fontSize: 12.5, marginBottom: 2 } }, ke.label), el('div', { style: { fontSize: 12, color: T.soft, lineHeight: 1.5 } }, ke.text)); }))], { marginTop: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.30)' });
        var survived = panel([el('div', { key: 't', style: { fontWeight: 700, marginBottom: 4 } }, '🐦 What survived'), el('div', { key: 'b', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.55 } }, 'Birds, mammals, crocodiles, turtles, amphibians, and many insects and plants made it through. The dinosaur story did not end; it narrowed to the birds.')], { marginTop: 14 });
        return el('div', null, sectionTitle('☄️', 'The five great extinctions', 'One of them cleared the way for dinosaurs; another ended their reign.'), panel(rows), kpgEvidence, survived);
      }

      function renderAnatomy() {
        var cards = ANATOMY.map(function (a) { return panel([el('div', { key: 'h', style: { fontSize: 22, marginBottom: 4 } }, a.icon + ' ', el('span', { style: { fontSize: 15, fontWeight: 800, verticalAlign: 'middle' } }, a.name)), el('div', { key: 'w', style: { fontSize: 12.5, color: T.text, marginBottom: 6, lineHeight: 1.5 } }, a.what), el('div', { key: 't', style: { fontSize: 12, color: T.text, fontWeight: 700, marginBottom: 2 } }, 'What it tells us'), el('div', { key: 'tt', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.5 } }, a.tells)], { key: a.id }); });
        var fossilSteps = [{ n: 1, t: 'Death and burial', d: 'An animal dies and is quickly buried by mud or sand, before scavengers or weather destroy it.' }, { n: 2, t: 'Mineral replacement', d: 'Over ages, groundwater minerals seep in and replace the bone, turning it to stone.' }, { n: 3, t: 'Rock and uplift', d: 'Layers pile up and harden into rock. Earth movements lift them toward the surface.' }, { n: 4, t: 'Erosion and discovery', d: 'Wind and water wear the rock away and expose the fossil, where someone might spot it.' }];
        return el('div', null, sectionTitle('🦴', 'How we know what we know', 'Paleontologists are detectives. Every fossil is a clue, and different clues answer different questions.'),
          panel([el('div', { key: 't', style: { fontWeight: 800, fontSize: 14, marginBottom: 8 } }, '🪨 How a fossil forms'), el('div', { key: 's', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 } }, fossilSteps.map(function (st) { return el('div', { key: st.n, style: { padding: 10, borderRadius: 8, background: T.deeper, border: '1px solid ' + T.border } }, el('div', { style: { fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 3 } }, 'Step ' + st.n + ': ' + st.t), el('div', { style: { fontSize: 12, color: T.soft, lineHeight: 1.5 } }, st.d)); })), el('div', { key: 'r', style: { fontSize: 11.5, color: T.soft, fontStyle: 'italic', marginTop: 8 } }, 'Most living things never fossilize at all. The fossil record is a tiny, lucky sample of past life.')], { marginBottom: 14 }),
          el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 } }, cards)
        );
      }

      function renderSites() {
        var cards = SITES.map(function (s) { return panel([el('div', { key: 'n', style: { fontWeight: 800, fontSize: 14 } }, '📍 ' + s.name), el('div', { key: 'w', style: { fontSize: 12, color: T.soft, marginBottom: 6 } }, s.where + '  ·  ' + s.when), el('div', { key: 'f', style: { fontSize: 12.5, marginBottom: 4 } }, el('strong', { style: { color: T.text } }, 'Famous for: '), s.famous), el('div', { key: 'no', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.5 } }, __alloT('stem.dinolab.' + (s.id) + '_note', s.note))], { key: s.id }); });
        return el('div', null, sectionTitle('🗺️', 'Famous fossil sites', 'Certain rock formations, laid down in the right place at the right time, hold most of what we know.'), el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 } }, cards));
      }

      function renderRecords() {
        var recCards = RECORDS.map(function (r) { return panel([el('div', { key: 't', style: { fontSize: 12, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 } }, r.title), el('div', { key: 'h', style: { fontSize: 15, fontWeight: 800, marginBottom: 4 } }, r.holder), el('div', { key: 'd', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.5 } }, __alloT('stem.dinolab.' + (r.id) + '_detail', r.detail))], { key: r.id }); });
        var people = PEOPLE.map(function (p) { return el('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: T.deeper, border: '1px solid ' + T.border, marginBottom: 8 } }, el('div', { style: { fontWeight: 700, fontSize: 13 } }, p.name, el('span', { style: { fontSize: 11, color: T.soft, fontWeight: 400, marginLeft: 6 } }, p.years)), el('div', { style: { fontSize: 12.5, color: T.soft, lineHeight: 1.5, marginTop: 2 } }, p.did)); });
        return el('div', null, sectionTitle('🏆', 'Record holders', 'Biggest, smallest, strongest. Many of these are best estimates, since the very largest animals are known from incomplete skeletons.'), el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 } }, recCards), panel([el('div', { key: 'h', style: { fontWeight: 800, fontSize: 14, marginBottom: 8 } }, '👥 People who built the science'), el('div', { key: 'p' }, people)]));
      }

      function renderQuiz() {
        var qIdx = modIndex(d.quizIdx, QUIZ.length);
        var q = QUIZ[qIdx];
        var picked = d.quizPicked, answered = d.quizAnswered || false, correctCount = d.quizCorrect || 0, doneCount = d.quizDone || 0;
        function pick(i) { if (answered) return; var isCorrect = i === q.answer; upd({ quizPicked: i, quizAnswered: true, quizCorrect: correctCount + (isCorrect ? 1 : 0), quizDone: doneCount + 1 }); announceToSR(isCorrect ? 'Correct' : 'Incorrect'); }
        function next() { upd({ quizIdx: (qIdx + 1) % QUIZ.length, quizPicked: null, quizAnswered: false }); }
        function restart() { upd({ quizIdx: 0, quizPicked: null, quizAnswered: false, quizCorrect: 0, quizDone: 0 }); }
        var options = q.options.map(function (opt, i) {
          var isCorrect = answered && i === q.answer, isWrongPick = answered && i === picked && i !== q.answer;
          var optionState = isCorrect ? 'correct answer' : (isWrongPick ? 'selected incorrect answer' : (picked === i ? 'selected answer' : (answered ? 'not selected' : 'available answer')));
          return el('button', { key: i, onClick: function () { pick(i); }, 'aria-disabled': answered ? 'true' : 'false', 'aria-pressed': picked === i ? 'true' : 'false', 'aria-label': opt + ', ' + optionState, style: { display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, padding: '10px 14px', borderRadius: 10, cursor: answered ? 'default' : 'pointer', fontSize: 13.5, border: '1px solid ' + (isCorrect ? '#22c55e' : (isWrongPick ? '#ef4444' : T.border)), background: isCorrect ? 'rgba(34,197,94,0.18)' : (isWrongPick ? 'rgba(239,68,68,0.15)' : T.deeper), color: T.text } }, (answered && isCorrect ? '\u2705 ' : (isWrongPick ? '\u274C ' : '')) + opt);
        });
        var pct = doneCount > 0 ? Math.round((correctCount / doneCount) * 100) : 0;
        return el('div', null, sectionTitle('🧠', 'Dino quiz', 'One question at a time. Read the explanation after each, that is where the learning is.'),
          panel([el('div', { key: 'top', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 } }, el('span', { style: { fontSize: 12, color: T.soft } }, 'Question ' + (qIdx + 1) + ' of ' + QUIZ.length), el('span', { style: { fontSize: 12, fontWeight: 700, color: T.text } }, 'Score: ' + correctCount + '/' + doneCount + (doneCount ? ' (' + pct + '%)' : ''))), el('div', { key: 'q', style: { fontSize: 15.5, fontWeight: 700, marginBottom: 12, lineHeight: 1.45 } }, q.q), el('div', { key: 'opts' }, options), answered ? el('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, panel([el('div', { key: 'x', style: { fontSize: 12.5, lineHeight: 1.55 } }, el('strong', { style: { color: T.text } }, picked === q.answer ? '\u2705 Correct. ' : '\u27A1\uFE0F Good try. '), q.explain)], { marginTop: 4, marginBottom: 10, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.30)' })) : null, el('div', { key: 'nav', style: { display: 'flex', gap: 8 } }, answered ? el('button', { onClick: next, style: { flex: 1, fontSize: 13.5, fontWeight: 700, padding: '10px', borderRadius: 10, border: 'none', background: '#15803d', color: '#fff', cursor: 'pointer' } }, 'Next question →') : null, el('button', { onClick: restart, style: { fontSize: 12.5, fontWeight: 600, padding: '10px 14px', borderRadius: 10, border: '1px solid ' + T.border, background: 'transparent', color: T.soft, cursor: 'pointer' } }, 'Restart'))])
        );
      }

      function renderNotes() {
        var cards = MYTHS.map(function (m) { return panel([el('div', { key: 'm', style: { fontSize: 13.5, fontWeight: 800, color: T.text, marginBottom: 6 } }, '❌ Myth: ' + m.myth), el('div', { key: 'r', style: { fontSize: 13, marginBottom: 6, lineHeight: 1.5 } }, el('strong', { style: { color: T.text } }, '✅ Reality: '), m.reality), el('div', { key: 'w', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.5 } }, m.why)], { key: m.id }); });
        return el('div', null, sectionTitle('📓', 'Field notes: myths, corrected', 'Science updates as new fossils turn up. Here are popular ideas the evidence has changed.'), panel([el('div', { key: 't', style: { fontWeight: 700, marginBottom: 4 } }, '🔬 Why these change'), el('div', { key: 'b', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.55 } }, 'Each correction came from new fossils or new methods. Changing your mind when the evidence changes is how science is supposed to work.')], { marginBottom: 14, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.30)' }), el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 } }, cards));
      }

      function renderGlossary() {
        var glossaryQuery = strVal(d.glossaryQuery);
        var gq = glossaryQuery.trim().toLowerCase();
        var list = GLOSSARY.slice().sort(function (a, b) { return a.term < b.term ? -1 : 1; });
        if (gq) list = list.filter(function (g) { return (g.term + ' ' + g.def).toLowerCase().indexOf(gq) !== -1; });
        var rows = list.map(function (g) { return el('div', { key: g.term, style: { padding: '8px 0', borderBottom: '1px solid ' + T.border } }, el('div', { style: { fontWeight: 700, fontSize: 13.5, color: T.text } }, g.term), el('div', { style: { fontSize: 12.5, color: T.text, lineHeight: 1.5, marginTop: 2 } }, g.def)); });
        return el('div', null, sectionTitle('📖', 'Glossary', 'The words paleontologists use, in plain language.'), el('input', { type: 'text', value: glossaryQuery, placeholder: t('stem.dinolab.search_terms', 'Search terms...'), 'aria-label': t('stem.dinolab.search_glossary', 'Search glossary'), onChange: function (e) { upd('glossaryQuery', e.target.value); }, style: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + T.border, background: T.deeper, color: T.text, fontSize: 14, marginBottom: 10 } }), panel(rows.length ? rows : el('div', { style: { color: T.soft, fontSize: 13 } }, 'No terms match that search.')));
      }

      function renderBirds() {
        var evidence = [
          { icon: '🪶', title: t('stem.dinolab.feathers', 'Feathers'), text: t('stem.dinolab.dozens_of_dinosaurs_are_preserved_with', 'Dozens of dinosaurs are preserved with feathers, from simple fuzz to true flight feathers. Many were feathered long before any of them could fly.') },
          { icon: '🦴', title: t('stem.dinolab.the_wishbone', 'The wishbone'), text: t('stem.dinolab.birds_have_a_furcula_or_wishbone_so_di', 'Birds have a furcula, or wishbone. So did theropod dinosaurs like T. rex and Velociraptor. It is the very same bone.') },
          { icon: '🎈', title: t('stem.dinolab.hollow_air_filled_bones', 'Hollow, air-filled bones'), text: t('stem.dinolab.bird_bones_are_light_and_filled_with_a', 'Bird bones are light and filled with air sacs. The same air-filled bones appear in many dinosaurs, part of a bird-like breathing system.') },
          { icon: '👣', title: t('stem.dinolab.three_toed_feet', 'Three-toed feet'), text: t('stem.dinolab.the_classic_bird_footprint_three_toes_', 'The classic bird footprint, three toes forward, matches theropod feet. Fossil dinosaur tracks look like giant bird tracks.') },
          { icon: '🥚', title: t('stem.dinolab.eggs_and_brooding', 'Eggs and brooding'), text: t('stem.dinolab.dinosaurs_laid_eggs_in_nests_and_some_', 'Dinosaurs laid eggs in nests, and some, like Citipati and Oviraptor, sat on them to brood their young, exactly as birds do.') },
          { icon: '🤚', title: t('stem.dinolab.a_wrist_that_folds', 'A wrist that folds'), text: t('stem.dinolab.birds_fold_their_wings_using_a_special', 'Birds fold their wings using a special half-moon wrist bone. The same bone let some dinosaurs tuck their arms against the body.') },
          { icon: '📈', title: t('stem.dinolab.fast_growth_warm_bodies', 'Fast growth, warm bodies'), text: t('stem.dinolab.growth_rings_in_dinosaur_bones_show_ma', 'Growth rings in dinosaur bones show many grew quickly and ran warm, more like birds and mammals than like modern reptiles.') }
        ];
        var feathered = DINOS.filter(function (dn) {
          if (dn.group === 'other') return false; // never list the non-dino foils (Pteranodon's "wing" matched) on the "feathered dinosaurs" panel
          var s = (dn.blurb + ' ' + dn.traits.join(' ')).toLowerCase();
          return dn.clade === 'Avialae' || s.indexOf('feather') !== -1 || s.indexOf('plumage') !== -1 || s.indexOf('quill') !== -1 || s.indexOf('filament') !== -1 || s.indexOf('fuzz') !== -1 || s.indexOf('wing') !== -1;
        }).sort(function (a, b) { return a.common < b.common ? -1 : 1; });
        var evCards = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 } }, evidence.map(function (ev) {
          return panel([el('div', { key: 'h', style: { fontSize: 15, fontWeight: 800, marginBottom: 4 } }, ev.icon + ' ' + ev.title), el('div', { key: 't', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.5 } }, ev.text)], { key: ev.title });
        }));
        var fchips = el('div', { key: 'chips', style: { display: 'flex', flexWrap: 'wrap', gap: 5 } }, feathered.map(function (dn) {
          return el('button', { key: dn.id, onClick: function () { upd({ tab: 'explore', selected: dn.id }); }, 'aria-label': 'Open ' + dn.common, style: { fontSize: 11, padding: '3px 9px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + T.border, background: T.deeper, color: T.text } }, dn.common);
        }));
        return el('div', null,
          sectionTitle('🐦', 'The bird connection', 'The single most important idea in this lab: birds are living dinosaurs.'),
          panel([el('div', { key: 'big', style: { fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 } }, 'Birds ARE dinosaurs.'), el('div', { key: 'b', style: { fontSize: 13, lineHeight: 1.55 } }, 'One branch of small, feathered, meat-eating dinosaurs survived the asteroid 66 million years ago. We call its living members birds. There are more than 10,000 species of them today, so by that count dinosaurs are still among the most successful land animals on Earth.')], { marginBottom: 14, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.35)' }),
          el('div', { style: { fontSize: 13.5, fontWeight: 800, margin: '0 0 8px' } }, 'Seven clues that link them'),
          evCards,
          panel([el('div', { key: 'h', style: { fontSize: 14, fontWeight: 800, marginBottom: 4 } }, '🪶 Archaeopteryx: caught in between'), el('div', { key: 't', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.55 } }, 'Archaeopteryx, from about 150 million years ago, had wings and feathers like a bird but teeth, clawed fingers, and a long bony tail like a dinosaur. It is one of the clearest transitional fossils ever found, sitting right on the line between the two.')], { marginTop: 14, marginBottom: 14, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.30)' }),
          panel([el('div', { key: 'h', style: { fontSize: 14, fontWeight: 800, marginBottom: 6 } }, '🦖 Meet the feathered dinosaurs (' + feathered.length + ')'), el('div', { key: 's', style: { fontSize: 12, color: T.soft, marginBottom: 8 } }, 'Each of these is preserved with feathers, fuzz, quill knobs, or wings, or sits on the branch that leads to birds. Tap one to open its file.'), fchips])
        );
      }

      function renderEcosystem() {
        var byFormation = {};
        DINOS.forEach(function (dn) { if (dn.group === 'other') return; (byFormation[dn.formation] = byFormation[dn.formation] || []).push(dn); });
        var formations = Object.keys(byFormation).filter(function (f) { return byFormation[f].length >= 3; });
        formations.sort(function (a, b) { return byFormation[b].length - byFormation[a].length; });
        if (!formations.length) return el('div', null, sectionTitle('🌍', 'Ancient ecosystems', 'Not enough species share a formation yet.'));
        var CAP = 20;
        var shown = formations.slice(0, CAP);
        var openF = (formations.indexOf(d.ecoOpen) !== -1) ? d.ecoOpen : formations[0];
        var list = byFormation[openF];
        function topOf(arr, key) { var c = {}; arr.forEach(function (x) { c[x[key]] = (c[x[key]] || 0) + 1; }); var best = arr[0][key], n = 0; for (var k in c) { if (c[k] > n) { n = c[k]; best = k; } } return best; }
        var period = topOf(list, 'period'), region = topOf(list, 'region');
        var myaHi = 0, myaLo = 9999;
        list.forEach(function (dn) { if (dn.myaHi > myaHi) myaHi = dn.myaHi; if (dn.myaLo < myaLo) myaLo = dn.myaLo; });
        function bySize(a, b) { return b.lengthM - a.lengthM; }
        var hunters = list.filter(function (dn) { return dn.diet === 'carnivore' || dn.diet === 'piscivore' || dn.diet === 'insectivore'; }).sort(bySize);
        var omnis = list.filter(function (dn) { return dn.diet === 'omnivore'; }).sort(bySize);
        var plants = list.filter(function (dn) { return dn.diet === 'herbivore'; }).sort(bySize);
        function chip(dn) { return el('button', { key: dn.id, onClick: function () { upd({ tab: 'explore', selected: dn.id }); }, 'aria-label': 'Open ' + dn.common, style: { fontSize: 11.5, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + dColor(dn.diet) + '66', background: dColor(dn.diet) + '18', color: T.text, marginRight: 5, marginBottom: 5 } }, (DIET_ICON[dn.diet] || '') + ' ' + dn.common); }
        function tier(label, arr, color) { if (!arr.length) return null; return el('div', { key: label, style: { marginBottom: 10 } }, el('div', { style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 } }, label + ' (' + arr.length + ')'), el('div', { style: { display: 'flex', flexWrap: 'wrap' } }, arr.map(chip))); }
        var selector = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, maxHeight: 132, overflowY: 'auto' } }, shown.map(function (f) {
          var active = f === openF;
          return el('button', { key: f, onClick: function () { upd('ecoOpen', f); announceToSR(f + ' ecosystem'); }, 'aria-pressed': active ? 'true' : 'false', style: { fontSize: 12, fontWeight: active ? 700 : 500, padding: '6px 11px', borderRadius: 9, cursor: 'pointer', border: '1px solid ' + (active ? '#15803d' : T.border), background: active ? '#15803d' : T.deeper, color: active ? '#fff' : T.soft } }, f + ' (' + byFormation[f].length + ')');
        }));
        var note = formations.length > CAP ? el('div', { style: { fontSize: 11.5, color: T.soft, fontStyle: 'italic', marginBottom: 10 } }, 'Showing the ' + CAP + ' richest of ' + formations.length + ' shared sites.') : null;
        var card = panel([
          el('div', { key: 'h', style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } }, el('div', { style: { fontSize: 17, fontWeight: 800 } }, '🏞️ ' + openF + ' Formation'), el('div', { style: { fontSize: 12, color: T.soft } }, list.length + ' species')),
          el('div', { key: 'bd', style: { margin: '4px 0 10px' } }, badge(periodName(period) + ' · ' + myaHi + '–' + myaLo + ' mya', pColor(period)), badge(region, '#38bdf8')),
          el('div', { key: 'eco', style: { fontSize: 12.5, color: T.soft, lineHeight: 1.5, marginBottom: 12 } }, 'These animals shared one place and time. Here, ' + (plants.length + omnis.length) + ' plant-eaters and omnivores lived alongside ' + hunters.length + ' hunters. Biggest are listed first.'),
          tier('🥩 Hunters', hunters, '#ef4444'),
          tier('🍴 Omnivores', omnis, '#f59e0b'),
          tier('🌿 Plant-eaters', plants, '#22c55e')
        ]);
        var primaryN = plants.length + omnis.length;
        var apex = hunters.length ? hunters[0] : null;
        function plevel(widthPct, fill, label, sub) {
          return el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 6 } }, el('div', { style: { width: widthPct + '%', minWidth: 140, maxWidth: '100%', boxSizing: 'border-box', background: fill, borderRadius: 8, padding: '8px 12px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 12.5 } }, label), sub ? el('div', { style: { fontSize: 11, color: T.soft, margin: '1px 0' } }, sub) : null);
        }
        var pyramid = panel([
          el('div', { key: 'h', style: { fontWeight: 800, fontSize: 14, marginBottom: 2 } }, '🔺 Energy pyramid'),
          el('div', { key: 's', style: { fontSize: 12, color: T.soft, marginBottom: 10, lineHeight: 1.5 } }, 'Energy flows up from the sun. Some is lost at every step, so each level can feed fewer animals than the one below it. Bar width shows energy, not exact numbers.'),
          el('div', { key: 'p' },
            plevel(34, '#b91c1c', '🥩 Hunters · ' + hunters.length, apex ? 'apex predator here: ' + apex.common : 'no hunters found here'),
            plevel(64, '#c2410c', '🦕 Plant-eaters + omnivores · ' + primaryN, 'the primary consumers'),
            plevel(100, '#15803d', '🌿 Plants (producers)', 'ferns, cycads, and conifers — the green base that fed it all')
          ),
          el('div', { key: 'n', style: { fontSize: 11.5, color: T.soft, marginTop: 8, fontStyle: 'italic' } }, primaryN + ' kinds of plant-eater and omnivore shared this rock unit with ' + hunters.length + ' kind' + (hunters.length === 1 ? '' : 's') + ' of hunter. That few-predators-on-top shape is what an energy pyramid predicts.')
        ], { marginTop: 14, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.28)' });
        return el('div', null, sectionTitle('🌍', 'Ancient ecosystems', 'Not all dinosaurs lived together. Each rock formation is a snapshot of one place and time. Pick a site to meet its whole community.'), selector, note, card, pyramid);
      }

      var content;
      // A single tab's render must NEVER blank the whole tool. The host's
      // renderTool() wraps render() in try/catch and returns null on a throw —
      // which paints an empty panel (the "white screen when selected" report).
      // Most often the trigger is stale persisted state (a `selected`/index/
      // filter saved by an older build) landing on a code path that didn't
      // exist then. Guard the dispatch so a bad tab degrades to an in-panel
      // notice — the tab bar and every other section stay usable, and the user
      // gets a one-click way to reset the saved view back to safe defaults.
      try {
        if (tab === 'explore') content = renderExplore();
        else if (tab === 'timeline') content = renderTimeline();
        else if (tab === 'deeptime') content = renderDeepTime();
        else if (tab === 'sites') content = renderSites();
        else if (tab === 'map') content = renderMap();
        else if (tab === 'ecosystem') content = renderEcosystem();
        else if (tab === 'compare') content = renderCompare();
        else if (tab === 'field3d') content = renderField3D();
        else if (tab === 'dig') content = renderDig();
        else if (tab === 'classify') content = renderClassify();
        else if (tab === 'birds') content = renderBirds();
        else if (tab === 'extinction') content = renderExtinction();
        else if (tab === 'anatomy') content = renderAnatomy();
        else if (tab === 'records') content = renderRecords();
        else if (tab === 'quiz') content = renderQuiz();
        else if (tab === 'notes') content = renderNotes();
        else if (tab === 'glossary') content = renderGlossary();
        else if (tab === 'classroom') content = renderClassroom();
        else content = renderExplore();
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) { console.error('[DinoLab] section "' + tab + '" failed to render', err); }
        content = el('div', { style: { padding: 20, color: T.text } },
          el('div', { key: 'h', style: { fontSize: 15, fontWeight: 800, marginBottom: 6 } }, '⚠️ This section could not open'),
          el('div', { key: 'b', style: { fontSize: 13, color: T.soft, lineHeight: 1.55, marginBottom: 14, maxWidth: 520 } }, 'The "' + tab + '" view ran into an error, but the rest of Dino Lab still works — pick another section from the tabs above. If Dino Lab keeps opening to this message, reset the saved view to clear it.'),
          el('button', { key: 'r', onClick: function () { upd({ tab: 'explore', selected: null, field3dSelected: null, field3dChallengeIdx: 0, field3dChallengePicked: null, field3dChallengeScore: 0, field3dChallengeDone: 0, field3dAutoRotate: true, field3dScanTargetIdx: 0, field3dScanLogged: {}, field3dScanSpecies: null, field3dAssemblyPlaced: {}, field3dAssemblySpecies: null, field3dAssemblyFocusIdx: 0, field3dClaimFocus: 'scale', field3dClaimBone: null, field3dClaimBoneSpecies: null, compareA: null, compareB: null, query: '', filterPeriod: 'all', filterDiet: 'all', filterContinent: 'all', sortBy: 'name', quizIdx: 0, quizPicked: null, quizAnswered: false, sortIdx: 0, sortAnswered: false, sortPicked: null, ecoOpen: null, extOpen: null }); }, style: { fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#15803d', color: '#fff', cursor: 'pointer' } }, '↺ Reset Dino Lab view')
        );
      }

      function renderMissionDeck() {
        var seenCount = Object.keys(seen || {}).length;
        var quizCount = d.quizCorrect || 0;
        var activeTab = (TABS.filter(function (tb) { return tb.id === tab; })[0] || TABS[0]).label;
        var routeCards = [
          { id: 'field', title: 'Start with the field guide', body: 'Search, filter, and open species cards before moving into deeper evidence work.', tab: 'explore', accent: '#22c55e' },
          { id: 'time', title: 'Build the time story', body: 'Use the timeline and deep-time scale to connect periods, climate, and extinction.', tab: 'timeline', accent: '#38bdf8' },
          { id: 'model', title: 'Inspect a 3D reconstruction', body: 'Use the field station to compare skeleton, body outline, scale, and uncertainty layers.', tab: 'field3d', accent: '#14b8a6' },
          { id: 'evidence', title: 'Think like a paleontologist', body: 'Compare traits, excavate a fossil, classify a specimen, then check uncertainty notes.', tab: 'dig', accent: '#f59e0b' },
          { id: 'practice', title: 'Lock in understanding', body: 'Use quiz, records, glossary, and classroom printables when students are ready to review.', tab: 'quiz', accent: '#a78bfa' }
        ];
        return el('section', {
          'data-dinolab-command': 'true',
          'aria-label': 'Dino Lab mission control',
          style: { margin: '0 0 16px', padding: 16, borderRadius: 16, border: '1px solid rgba(34,197,94,0.34)', background: 'linear-gradient(135deg, #0b3b2e, #0f172a)', boxShadow: '0 18px 38px rgba(0,0,0,0.24)' }
        },
          el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, alignItems: 'stretch' } },
            el('div', { style: { borderRadius: 14, padding: 14, background: 'rgba(2,6,23,0.34)', border: '1px solid rgba(148,163,184,0.20)' } },
              el('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 6 } }, 'Dino field station'),
              el('h2', { style: { fontSize: 22, lineHeight: 1.15, margin: '0 0 8px', color: '#f1f5f9' } }, 'Choose a fossil investigation path.'),
              el('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.55 } }, 'Dino Lab has a large catalog. This panel turns it into a guided starting point while keeping every section available above.'),
              el('div', { className: 'dinolab-mission-stats', style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 14 } },
                [
                  ['Species opened', seenCount + '/' + DINOS.length, '#86efac'],
                  ['Quiz correct', quizCount + '/5', '#facc15'],
                  ['Active section', activeTab, '#67e8f9']
                ].map(function (item) {
                  return el('div', { key: item[0], style: { padding: 9, borderRadius: 10, background: 'rgba(15,23,42,0.58)', border: '1px solid rgba(148,163,184,0.18)' } },
                    el('div', { style: { fontSize: 10, fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0 } }, item[0]),
                    el('div', { style: { marginTop: 3, fontSize: 15, fontWeight: 900, color: item[2], wordBreak: 'break-word' } }, item[1])
                  );
                })
              )
            ),
            el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 } },
              routeCards.map(function (card) {
                var active = tab === card.tab;
                return el('button', {
                  key: card.id,
                  onClick: function () { upd('tab', card.tab); announceToSR(card.title); },
                  style: { textAlign: 'left', cursor: 'pointer', minHeight: 128, padding: 13, borderRadius: 13, border: '1px solid ' + (active ? card.accent : 'rgba(148,163,184,0.20)'), background: active ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.50)', color: '#f1f5f9', boxShadow: active ? '0 10px 22px rgba(0,0,0,0.22)' : 'none' }
                },
                  el('div', { style: { width: 34, height: 5, borderRadius: 99, background: card.accent, marginBottom: 10 } }),
                  el('div', { style: { fontSize: 14, fontWeight: 900, marginBottom: 5 } }, card.title),
                  el('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 } }, card.body),
                  el('div', { style: { marginTop: 10, fontSize: 11, fontWeight: 800, color: card.accent } }, active ? 'Open now' : 'Open path')
                );
              })
            )
          )
        );
      }

      var accessibilityStyles = '.dinolab-root button:focus-visible,.dinolab-root input:focus-visible,.dinolab-root select:focus-visible,.dinolab-root textarea:focus-visible,.dinolab-root [tabindex]:focus-visible{outline:3px solid #f8fafc!important;outline-offset:2px;box-shadow:0 0 0 5px #0f766e!important}' +
        '@media(max-width:720px){.dinolab-root .dinolab-explore-layout{grid-template-columns:minmax(0,1fr)!important}.dinolab-root .dinolab-mission-stats{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))!important}.dinolab-root .dinolab-compare-grid,.dinolab-root .dinolab-compare-pickers{grid-template-columns:minmax(0,1fr)!important}.dinolab-root .dinolab-map-stats{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))!important}.dinolab-root .dinolab-3d-viewer{min-height:380px!important}.dinolab-root .dinolab-3d-canvas{height:380px!important}.dinolab-root .dinolab-3d-readouts{max-height:88px;overflow:hidden}.dinolab-root .dinolab-3d-chip{font-size:10px!important;padding:4px 7px!important}}' +
        '@media(max-width:480px){.dinolab-root #dinopanel{padding:10px!important}.dinolab-root .dinolab-tablist{padding:8px!important;flex-wrap:nowrap!important;overflow-x:auto!important;scrollbar-width:thin}.dinolab-root .dinolab-section-cue{padding-left:10px!important;padding-right:10px!important}.dinolab-root .dinolab-3d-viewer{min-height:340px!important}.dinolab-root .dinolab-3d-canvas{height:340px!important}.dinolab-root .dinolab-3d-readouts{left:7px!important;right:7px!important;top:7px!important;gap:4px!important;max-height:70px}.dinolab-root .dinolab-3d-camera-readout{right:7px!important;bottom:58px!important;font-size:10px!important}.dinolab-root .dinolab-3d-status{left:7px!important;right:7px!important;bottom:7px!important;font-size:10px!important;padding:6px 8px!important}.dinolab-root .dinolab-3d-view-controls{align-items:stretch!important}.dinolab-root .dinolab-3d-view-controls>button{flex:1 1 72px}}';
      return el('div', { className: 'dinolab-root', style: { minHeight: '100%', background: T.canvas, color: T.text } }, el('style', null, accessibilityStyles), tabNavigation, el('div', { id: 'dinopanel', role: 'tabpanel', 'aria-labelledby': 'dinotab-' + tab, style: { padding: 16 } }, tab === 'explore' ? renderMissionDeck() : null, content));
    }
  });
})();
