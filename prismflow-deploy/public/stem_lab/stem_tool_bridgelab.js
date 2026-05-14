/* eslint-disable */
// stem_tool_bridgelab.js — Bridge Engineering Lab
// NGSS MS-ETS1 + HS-PS2 + HS-ETS1. Truss stress simulator, bridge type
// comparison, materials database, force types, real-world case studies
// (Tacoma Narrows, Hyatt Regency, Tay Bridge + successes), engineering
// design cycle, quiz, and printable design specs.
(function() {
  'use strict';
  if (!window.StemLab || !window.StemLab.registerTool) {
    console.warn('[StemLab] stem_tool_bridgelab.js loaded before StemLab registry — bailing');
    return;
  }

  // ──────────────────────────────────────────────────────────────────
  // DATA: Bridge types
  // ──────────────────────────────────────────────────────────────────
  var BRIDGE_TYPES = [
    {
      id: 'beam', name: 'Beam Bridge', icon: '═', span: '< 80 m',
      desc: 'The simplest bridge. A horizontal beam supported at each end. The beam is in compression on top and tension on bottom under load.',
      strength: 'Cheap, simple to build. Short spans only.',
      weakness: 'Bending creates large internal forces; gets very heavy for long spans.',
      examples: 'Most highway overpasses, simple pedestrian bridges, log-across-a-stream.'
    },
    {
      id: 'truss', name: 'Truss Bridge', icon: '▲', span: '40-300 m',
      desc: 'A framework of triangles. Triangles can\'t change shape without breaking a member, so the truss is rigid. Loads are carried as tension or compression along the members — no bending.',
      strength: 'Very strong for its weight. Iron and steel trusses revolutionized 19th-century engineering.',
      weakness: 'Many small members = many places things can fail. Inspection is critical.',
      examples: 'Brooklyn Bridge approach spans, Forth Bridge (Scotland), countless 19th-c. railroad bridges.'
    },
    {
      id: 'arch', name: 'Arch Bridge', icon: '∩', span: '50-500 m',
      desc: 'A curve that pushes the load outward and downward into the abutments. The entire arch is in compression.',
      strength: 'Strong materials in compression (stone, concrete) work well. Some Roman arches are still in use 2,000 years later.',
      weakness: 'Needs very strong foundations to resist the outward thrust at each end.',
      examples: 'Roman aqueducts, Pont du Gard, Sydney Harbour Bridge (steel arch), New River Gorge.'
    },
    {
      id: 'suspension', name: 'Suspension Bridge', icon: '⌣', span: '300-2000+ m',
      desc: 'The deck hangs from cables, which hang in a curve between two tall towers. The cables are in tension; the towers are in compression. Anchorages at each end resist the cable tension.',
      strength: 'Currently the longest span bridges in the world. Akashi-Kaikyō in Japan has a 1,991 m main span.',
      weakness: 'Flexible — needs careful aerodynamic design to avoid wind-induced oscillation (the lesson of Tacoma Narrows).',
      examples: 'Golden Gate Bridge, Brooklyn Bridge (suspension + cable-stayed hybrid), Akashi-Kaikyō, Verrazzano-Narrows.'
    },
    {
      id: 'cable_stayed', name: 'Cable-Stayed Bridge', icon: '✦', span: '200-1100 m',
      desc: 'Like a suspension bridge but the cables run directly from the towers to the deck (no main suspended cable). More cables, less material, stiffer than a suspension bridge.',
      strength: 'Faster and cheaper to build than a suspension bridge of similar span. Stiffer in wind.',
      weakness: 'Maximum span shorter than a full suspension bridge.',
      examples: 'Millau Viaduct (France), Russky Bridge (Russia), Sundial Bridge (California).'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Materials (yield strength, density, modulus, cost)
  // ──────────────────────────────────────────────────────────────────
  var MATERIALS = [
    { id: 'wood',     name: 'Wood (softwood)',   yieldMPa: 40,   densityKgM3: 500,  modulusGPa: 12,  costRel: 1,  costPerM3: 800,
      desc: 'Renewable, easy to work, light. Strong in tension and compression along the grain. Weak across the grain. Sensitive to moisture, fire, insects.',
      use: 'Historical timber bridges. Modern engineered wood (glulam, CLT) brings wood back for larger structures.' },
    { id: 'stone',    name: 'Stone',             yieldMPa: 100,  densityKgM3: 2700, modulusGPa: 50,  costRel: 3,  costPerM3: 2400,
      desc: 'Very strong in compression, weak in tension. Heavy. Lasts millennia if well-built. Roman arch bridges from 100 BCE still stand.',
      use: 'Roman aqueducts. Medieval bridges. Almost no longer used new because of cost and labor.' },
    { id: 'iron',     name: 'Cast Iron',         yieldMPa: 200,  densityKgM3: 7200, modulusGPa: 100, costRel: 4,  costPerM3: 28800,
      desc: 'The first metal used at scale for bridges. Strong in compression, brittle and weak in tension. Many 19th-century failures.',
      use: 'Iron Bridge (1779, Shropshire), Tay Bridge (1879, collapsed 1879). Largely replaced by steel by 1890.' },
    { id: 'steel',    name: 'Structural Steel',  yieldMPa: 350,  densityKgM3: 7850, modulusGPa: 200, costRel: 6,  costPerM3: 47100,
      desc: 'Strong in BOTH tension and compression. Ductile (bends before breaking, giving warning). The workhorse of modern bridge engineering.',
      use: 'Most modern steel truss, arch, suspension, and cable-stayed bridges. Brooklyn, Golden Gate, every major suspension bridge.' },
    { id: 'concrete', name: 'Reinforced Concrete', yieldMPa: 30, densityKgM3: 2400, modulusGPa: 30,  costRel: 3,  costPerM3: 7200,
      desc: 'Concrete: strong in compression, weak in tension. Reinforced with steel rebar to carry tension. Pre-stressed concrete uses tensioned cables for even more strength.',
      use: 'Most modern highway and short-to-medium span bridges. Pre-stressed concrete dominates 30-150 m spans.' },
    { id: 'composite', name: 'FRP Composite (fiber-reinforced polymer)', yieldMPa: 600, densityKgM3: 2000, modulusGPa: 40, costRel: 12, costPerM3: 24000,
      desc: 'Fibers (carbon, glass, aramid) in a polymer matrix. Light, strong, corrosion-proof. Currently used in repair / strengthening more than new structures.',
      use: 'Bridge deck repair, FRP rebar in corrosive environments, some specialty pedestrian bridges. Cost still limits widespread use.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Force types
  // ──────────────────────────────────────────────────────────────────
  var FORCES = [
    { id: 'tension',   name: 'Tension',    color: '#dc2626', icon: '←→',
      desc: 'A force that pulls a member apart (stretches it). The fibers are being pulled along their length. Cables, ropes, and the bottom chord of a simple truss are in tension.',
      good: 'Steel, kevlar, and most polymers handle tension well.', bad: 'Stone, brick, plain concrete, cast iron handle tension poorly. Hence "reinforced" concrete.' },
    { id: 'compression', name: 'Compression', color: '#2563eb', icon: '→←',
      desc: 'A force that pushes a member together (squeezes it). Long thin members in compression can BUCKLE before they reach their crushing strength — a critical failure mode.',
      good: 'Stone, concrete, cast iron, brick all very good in compression.', bad: 'Long thin steel members can buckle. Eulerian buckling load = π²EI / L².' },
    { id: 'shear',     name: 'Shear',      color: '#f59e0b', icon: '⇉',
      desc: 'A force that tries to slide one part of a member past another, like scissors cutting paper. The diagonal members of a truss carry shear from one chord to the other.',
      good: 'Steel handles shear well in bolted and welded connections.', bad: 'Connections are the most common shear-failure point. Bolt shear, weld shear, rivet shear.' },
    { id: 'bending',   name: 'Bending (flexure)', color: '#a855f7', icon: '⌒',
      desc: 'A combination of tension on one side and compression on the other. A loaded beam bends; the bottom stretches (tension), the top compresses. The middle (the "neutral axis") has zero stress.',
      good: 'I-beams concentrate material where it\'s needed — top and bottom flanges resist tension/compression; thin web resists shear.', bad: 'Bending creates very large local stresses near the supports of long beams.' },
    { id: 'torsion',   name: 'Torsion (twist)', color: '#10b981', icon: '↻',
      desc: 'A force that tries to twist a member around its long axis. Bridge decks under uneven loading (or wind) experience torsion.',
      good: 'Closed cross-sections (box girders, tubes) resist torsion much better than open sections (I-beams).', bad: 'Tacoma Narrows (1940) failed via wind-induced torsional oscillation of its open H-shaped deck.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Case studies — failures + successes
  // ──────────────────────────────────────────────────────────────────
  var CASES = [
    {
      id: 'millennium', name: 'Millennium Bridge (London)', year: 2000, kind: 'failure', icon: '🚶',
      what: 'A new pedestrian suspension bridge opened on June 10 2000. Within seconds of opening to the public, it began swaying side-to-side dramatically. The bridge was closed two days later + remained closed for nearly two years for engineering retrofit.',
      why: 'PEDESTRIAN-INDUCED LATERAL VIBRATION. Pedestrians naturally walked at ~2 Hz vertical step rate, producing a 1 Hz lateral motion. When the bridge began to sway slightly, pedestrians instinctively adjusted their gait to compensate — locking in synchrony with the sway. The synchrony amplified the motion → more synchrony → bigger motion. Positive feedback loop, similar in principle to Tacoma but driven by pedestrians instead of wind.',
      lesson: 'Pedestrian crowds can synchronize their footfalls to bridge motion, producing forces orders of magnitude larger than the structural design assumed. Lateral pedestrian damping is now a code requirement for new pedestrian bridges in many jurisdictions. The case is the canonical 21st-century structural-dynamics teaching example.',
      memory: 'The Foster + Arup design team retrofitted ~37 tuned mass dampers + ~50 viscous dampers across the bridge\'s spans. Reopened February 2002. Has worked perfectly since. Still nicknamed the "wobbly bridge" by Londoners. The investigation paper (Dallard et al., 2001) is one of the most-cited papers in structural dynamics.'
    },
    {
      id: 'tacoma', name: 'Tacoma Narrows Bridge', year: 1940, kind: 'failure', icon: '💨',
      what: 'Suspension bridge over Puget Sound in Washington. Span 853 m. Collapsed in moderate (~64 km/h) wind after only 4 months in service.',
      why: 'Aerodynamic flutter — the open H-shaped deck cross-section allowed wind to create alternating lift forces. The deck began twisting, the twisting created bigger forces, the forces created bigger twisting. A positive feedback loop. The bridge oscillated to destruction.',
      lesson: 'Bridge design now requires wind-tunnel testing. Decks use closed box-girder cross-sections (or stiffening trusses) that don\'t flutter. Aerodynamics is now central to bridge engineering.',
      memory: 'Iconic black-and-white film of "Galloping Gertie" twisting. The lone car abandoned on the bridge belonged to Leonard Coatsworth. His cocker spaniel Tubby was the only casualty.'
    },
    {
      id: 'tay', name: 'Tay Bridge', year: 1879, kind: 'failure', icon: '🌬️',
      what: 'Iron railway bridge over the Firth of Tay in Scotland. The central spans collapsed in a storm while a passenger train was crossing. All 75 aboard died.',
      why: 'Cast iron piers had defective casting. Wind loads underestimated. The bridge was specified for ~10 lb/ft² wind load when 30+ was realistic for the site. Quality control on the iron was inadequate.',
      lesson: 'Wind loads must be measured at the actual site, not assumed. Material quality control became a regulated discipline. The disaster contributed to the founding of modern engineering codes.',
      memory: 'The opening lines of William McGonagall\'s "The Tay Bridge Disaster" are sometimes called the worst poem in English. The historical lessons, however, were taken seriously.'
    },
    {
      id: 'hyatt', name: 'Hyatt Regency Walkway', year: 1981, kind: 'failure', icon: '🏨',
      what: 'A suspended pedestrian walkway in the Hyatt Regency hotel in Kansas City collapsed during a tea dance, killing 114 and injuring 216. The deadliest US structural failure until 9/11.',
      why: 'A late design change replaced a single long rod (supporting two walkways) with two shorter rods (one walkway suspended from the next). The change doubled the load on the upper connection. The connection failed.',
      lesson: 'Design changes during construction must be fully re-engineered. Engineer of record carries responsibility. The case became required reading in engineering ethics. The two lead engineers lost their licenses.',
      memory: 'Most every engineering ethics curriculum in the US covers Hyatt Regency. The story is: an "obvious" simplification by the contractor doubled the design load. No one re-checked.'
    },
    {
      id: 'silver', name: 'Silver Bridge', year: 1967, kind: 'failure', icon: '🔗',
      what: 'Eyebar chain suspension bridge over the Ohio River. Collapsed during rush-hour traffic, killing 46.',
      why: 'A single eyebar had a 2.5 mm defect (a hidden crack from manufacturing 40 years earlier). The crack grew via stress-corrosion to a critical size, then snapped. Because each eyebar was load-bearing with no redundancy, one failure meant total collapse.',
      lesson: 'No fracture-critical member can be allowed without redundancy in modern bridge codes. The federal bridge inspection program began directly because of Silver Bridge.',
      memory: 'The disaster led to the creation of the National Bridge Inspection Standards (1971). Every public bridge in the US is now inspected every 2 years.'
    },
    {
      id: 'brooklyn', name: 'Brooklyn Bridge', year: 1883, kind: 'success', icon: '🌉',
      what: 'First steel-wire suspension bridge. Span 486 m. Still in service 140+ years later, carrying over 100,000 vehicles a day.',
      why: 'John Roebling pioneered the use of steel wire for the cables. After his death (he died of tetanus from an injury at the construction site), his son Washington took over; after Washington was paralyzed by caisson disease, his wife Emily Roebling effectively ran the project to completion. The bridge was designed with 6x the required load capacity — extreme safety factor.',
      lesson: 'A generous safety factor turns a longshot into a century of service. Innovation in materials (steel wire) opened new spans.',
      memory: 'P. T. Barnum walked 21 elephants across the bridge in 1884 to prove it was safe. The bridge has carried trolleys, horses, cars, and pedestrians continuously since.'
    },
    {
      id: 'golden_gate', name: 'Golden Gate Bridge', year: 1937, kind: 'success', icon: '🌁',
      what: 'Suspension bridge over the Golden Gate strait, San Francisco. Span 1,280 m. Held the world record for longest span for 27 years.',
      why: 'Chief Engineer Joseph Strauss; Charles Ellis did most of the actual structural calculations. Used a safety net during construction (innovative for the time) that saved 19 lives. The iconic "International Orange" color was chosen for visibility in fog.',
      lesson: 'Construction safety, structural innovation, and aesthetics all in one project. The safety net itself was a major engineering innovation.',
      memory: 'The bridge\'s natural sway in wind is built-in. It can move up to 8.4 m horizontally and 3.4 m vertically. This is feature, not bug — rigidity would break it.'
    },
    {
      id: 'akashi', name: 'Akashi-Kaikyō Bridge', year: 1998, kind: 'success', icon: '🗾',
      what: 'Currently the second-longest suspension bridge in the world (the 1915 Çanakkale in Turkey took the record in 2022). Main span 1,991 m. Connects Awaji Island to Honshu, Japan.',
      why: 'Built across an earthquake zone with major tidal currents. During the 1995 Kobe earthquake (mid-construction), the two towers moved 1 m further apart from each other — the bridge was redesigned mid-construction to accommodate this. Withstood the earthquake.',
      lesson: 'Engineering for active hazards (earthquakes, typhoons, tides) is now standard for major infrastructure. The bridge\'s real-time tuned mass dampers actively counteract sway.',
      memory: 'A bridge that grew 1 meter longer than its original design during construction. The Kobe earthquake event is one of the most photographed in modern engineering history.'
    },
    {
      id: 'millau', name: 'Millau Viaduct', year: 2004, kind: 'success', icon: '⛰️',
      what: 'Cable-stayed bridge in southern France. Tallest bridge in the world (343 m to the top of the highest tower — taller than the Eiffel Tower). Span 2,460 m total, with seven masts.',
      why: 'Designed by Michel Virlogeux and Norman Foster. Built across a deep valley to bypass traffic congestion. Constructed using hydraulic launching of the deck across the towers — built on each side and pushed out to meet in the middle.',
      lesson: 'Cable-stayed bridges have largely replaced suspension bridges for medium-to-large spans (200-1100 m range). Faster to build, stiffer in wind, cheaper per meter.',
      memory: 'The decking was assembled in two halves, hydraulically pushed out from each side at 60 cm every 4 minutes, until they met in the middle.'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Engineering Design Cycle
  // ──────────────────────────────────────────────────────────────────
  var DESIGN_STEPS = [
    { id: 'define', name: 'Define', icon: '🎯', desc: 'What problem are we trying to solve? What are the constraints (span, load, budget, environment)? What does success look like?' },
    { id: 'imagine', name: 'Imagine', icon: '💡', desc: 'Brainstorm many possible solutions without judging them yet. Sketch ideas. Look at how others have solved similar problems. Cast a wide net.' },
    { id: 'plan', name: 'Plan', icon: '📐', desc: 'Pick the most promising idea. Calculate forces. Choose materials. Make a detailed design. Identify what could go wrong.' },
    { id: 'create', name: 'Create', icon: '🔨', desc: 'Build a prototype (or in our case, the simulation). Document what you actually built versus what you planned. Things will be different. Note them.' },
    { id: 'test', name: 'Test', icon: '🧪', desc: 'Apply loads. Measure. Where does it fail? Why? Was your prediction correct? If not, why?' },
    { id: 'improve', name: 'Improve', icon: '🔁', desc: 'Use what you learned in testing to redesign. Engineering is always iterative. Failure is information, not defeat.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Quiz
  // ──────────────────────────────────────────────────────────────────
  var QUIZ_QUESTIONS = [
    { q: 'In a simply supported beam bridge under a load in the middle, which side of the beam is in tension?', choices: ['Top', 'Bottom', 'Both sides equally', 'Neither, only the supports'], answer: 1, explain: 'The bottom of the beam stretches (tension); the top compresses. This is why I-beams have flanges concentrating material at top and bottom — that\'s where the stress lives.' },
    { q: 'Why are triangles the basic unit of trusses?', choices: ['They\'re prettier', 'A triangle can\'t change shape without breaking a member', 'Triangles distribute load equally', 'Building codes require triangles'], answer: 1, explain: 'A triangle is rigid — you cannot deform it without changing the length of at least one side. Squares and rectangles can shear into parallelograms. Triangles can\'t. This rigidity is what makes trusses work.' },
    { q: 'What kind of forces are the cables of a suspension bridge under?', choices: ['Compression', 'Tension', 'Shear', 'Torsion'], answer: 1, explain: 'Cables can only carry tension. They hang in a curve (technically a catenary modified by deck loading) and pull on the towers and anchorages.' },
    { q: 'Why did the Tacoma Narrows Bridge collapse in 1940?', choices: ['Earthquake', 'Overloading', 'Wind-induced aerodynamic flutter', 'Material defect'], answer: 2, explain: 'The open H-shaped deck cross-section allowed wind to create alternating lift forces. The deck began oscillating, the oscillation grew, and the structure tore itself apart. Now all major bridges must pass wind-tunnel tests; deck cross-sections are designed to avoid flutter.' },
    { q: 'Which material is strong in compression but weak in tension, requiring reinforcement?', choices: ['Steel', 'Wood', 'Plain concrete', 'Composite'], answer: 2, explain: 'Plain concrete handles compression well but tension poorly. Adding steel rebar (which handles tension well) gives reinforced concrete — using each material for what it does best. Pre-stressed concrete adds another layer: putting the concrete in compression before it ever sees load.' },
    { q: 'In a Pratt truss bridge with the load on top, are the bottom chord members under tension or compression?', choices: ['Tension', 'Compression', 'Shear', 'Bending'], answer: 0, explain: 'Picture the bridge as a giant beam. The bottom of the beam wants to stretch — that\'s tension. So the bottom chord of any simply-supported truss is in tension; the top is in compression. This is true regardless of truss style (Warren, Pratt, Howe).' },
    { q: 'What is "buckling"?', choices: ['A type of joint failure', 'A long compression member bending sideways before crushing', 'Wind oscillation', 'Concrete cracking'], answer: 1, explain: 'A long, thin member in compression can bend sideways at a load far below its actual crushing strength. This is buckling, described by Euler. It is why compression members are stocky (think squat columns) rather than long and thin.' },
    { q: 'Why was the Hyatt Regency walkway collapse (1981) an "ethics" failure as well as an engineering one?', choices: ['It was built without permits', 'A design change doubled the load on a connection and no one re-checked the calculations', 'It was overloaded by visitors', 'The materials were counterfeit'], answer: 1, explain: 'A late design change split a single long rod into two shorter rods, doubling the load on the upper connection. The change was made for ease of construction but no one re-engineered it. Engineer of record carries final responsibility. The case is required reading in engineering ethics.' },
    { q: 'What is the "safety factor" in bridge design?', choices: ['How fast emergency crews can respond', 'A multiplier on expected load so the bridge can handle much more than it ever should see', 'A liability waiver', 'The cost of safety equipment'], answer: 1, explain: 'Safety factor = ultimate capacity / expected design load. Typically 2-4 for buildings, 2-6 for bridges. It accounts for material variability, construction quality, unexpected loads, deterioration over time. The Brooklyn Bridge was designed with a safety factor of 6.' },
    { q: 'What is the longest span for a SUSPENSION bridge in service today?', choices: ['~500 m', '~1,000 m', '~2,000 m', '~5,000 m'], answer: 2, explain: 'The 1915 Çanakkale Bridge in Turkey opened in 2022 with a main span of 2,023 m. Before that, Akashi-Kaikyō in Japan held the record at 1,991 m for 24 years. Suspension is still the way to go for the very longest spans.' },
    { q: 'Why do bridges have expansion joints?', choices: ['To look nice', 'So the deck can expand and contract with temperature changes without breaking', 'To allow easier inspection', 'For drainage'], answer: 1, explain: 'A steel bridge can expand and contract by several centimeters between hot summer and cold winter. Without expansion joints, this would create enormous forces and crack the structure. The Golden Gate Bridge\'s deck can shift by over a meter due to temperature alone.' },
    { q: 'Which is the LEAST appropriate use of stone as a bridge material?', choices: ['A Roman aqueduct arch', 'A medieval bridge over a stream', 'The tension members of a long modern bridge', 'A short pedestrian arch bridge'], answer: 2, explain: 'Stone is great in compression but weak in tension. The tension members of a long bridge need a tensile material like steel. Arches (which are entirely in compression) work beautifully in stone — Roman arches from 100 BCE are still in use. Putting stone in tension is asking for failure.' },
    { q: 'In a Pratt truss bridge, which members are typically in TENSION?', choices: ['The verticals only', 'The diagonals only', 'The diagonals AND the bottom chord', 'Everything is in compression'], answer: 2, explain: 'A Pratt truss is designed so the diagonals slope toward the center, putting them in tension. The bottom chord is also in tension (like any simply-supported beam\'s bottom). The verticals carry compression, the top chord carries compression. Pratt uses tension-friendly steel for the diagonals + bottom — economical.' },
    { q: 'What is the Euler buckling load proportional to?', choices: ['Length L (P_cr increases with longer members)', '1/L² (P_cr decreases with the square of length)', 'L² (P_cr increases with the square of length)', 'It does not depend on length'], answer: 1, explain: 'P_cr = π²EI / L². Doubling the length quarters the buckling capacity. Long thin compression members buckle long before they reach yield. This is why compression members are short and stocky, why interior bracing is added to long chords, and what brought down the Quebec Bridge in 1907.' },
    { q: 'The "slenderness ratio" L/r of a compression member is critical to buckling. What does a HIGH slenderness ratio mean?', choices: ['The member is short + stocky (low buckling risk)', 'The member is long + thin (high buckling risk)', 'The member is wide + flat', 'It only applies to tension members'], answer: 1, explain: 'Slenderness ratio L/r = length divided by radius of gyration. High slenderness = long relative to its width = prone to buckling. Steel design codes typically limit slenderness to about 200 for compression members; structural designers will add bracing or change cross-section to keep it lower.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // Truss force analysis — simplified deep-beam approximation
  // ──────────────────────────────────────────────────────────────────
  // For a Warren-style truss with bay width a, height h, span L = n*a,
  // loaded with point load P at each of (n-1) interior top joints:
  //   Total load W = (n-1) * P
  //   Max bending moment at center (deep beam) ≈ W*L/8
  //   Max top chord compression ≈ Max bottom chord tension ≈ M_max / h
  //   Max diagonal shear = (W/2) / sin(theta), where theta = atan(2h/a)
  function analyzeTruss(span, height, nBays, loadPerJoint) {
    var a = span / nBays;
    var h = height;
    var nLoads = nBays - 1; // interior top joints
    var W = nLoads * loadPerJoint;
    var L = span;
    var Mmax = W * L / 8; // deep-beam approximation
    var maxChord = Mmax / h; // either top compression or bottom tension
    var theta = Math.atan2(2 * h, a); // diagonal angle from horizontal
    var maxDiag = (W / 2) / Math.sin(theta);
    // Total weight of truss assumed proportional to total member length
    // Approximate: bottom chord = L, top chord = L*(n-1)/n, verticals = n*h, diagonals = 2*n*sqrt((a/2)^2 + h^2)
    var totalLen = L + L * (nBays - 1) / nBays + nBays * h + 2 * nBays * Math.sqrt(a * a / 4 + h * h);
    return {
      a: a, h: h, theta: theta, W: W, Mmax: Mmax,
      maxChord: maxChord, maxDiag: maxDiag, totalLen: totalLen,
      reactions: W / 2,
      diagAngleDeg: theta * 180 / Math.PI
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Method-of-Joints solver. Given a list of joints + members + loads
  // + supports, returns exact member forces (positive = tension) using
  // 2D pin-jointed equilibrium. Solves Ax = b via Gaussian elimination
  // with partial pivoting. ~120 lines including the linear solver.
  //
  // Inputs:
  //   joints   : [{id, x, y}]
  //   members  : [{id, j1, j2}]
  //   loads    : { jointId: {fx, fy} }   (kN; +y down for loads)
  //   supports : { jointId: 'pin' | 'roller' }  (roller resists +y only)
  //
  // Returns: { memberForces: { mid: F_kN_tension_positive }, reactions: { jid: {fx, fy} }, ok: bool }
  // ──────────────────────────────────────────────────────────────────
  function solveTrussMOJ(joints, members, loads, supports) {
    var j = joints.length;
    var m = members.length;
    var jointById = {};
    for (var i = 0; i < j; i++) jointById[joints[i].id] = joints[i];

    // Reaction columns: pin -> 2 unknowns (Rx, Ry), roller -> 1 (Ry)
    var reactionCols = {};
    var nR = 0;
    for (var ji = 0; ji < j; ji++) {
      var jid = joints[ji].id;
      var sup = supports[jid];
      if (sup === 'pin') {
        reactionCols[jid + '_fx'] = m + nR++;
        reactionCols[jid + '_fy'] = m + nR++;
      } else if (sup === 'roller') {
        reactionCols[jid + '_fy'] = m + nR++;
      }
    }
    var n = m + nR;

    // 2j equations expected. For determinate: m + r = 2j.
    if (n !== 2 * j) return { ok: false, reason: 'indeterminate or unstable: m+r=' + n + ', 2j=' + (2 * j) };

    // Build A (2j × n) and b (2j)
    var A = [];
    var b = [];
    for (var ji2 = 0; ji2 < j; ji2++) {
      var jt = joints[ji2];
      var rowX = new Array(n);
      var rowY = new Array(n);
      for (var ci = 0; ci < n; ci++) { rowX[ci] = 0; rowY[ci] = 0; }
      // For each member at this joint, add direction cosines into the row
      for (var mi = 0; mi < members.length; mi++) {
        var mem = members[mi];
        var other = null;
        if (mem.j1 === jt.id) other = jointById[mem.j2];
        else if (mem.j2 === jt.id) other = jointById[mem.j1];
        if (!other) continue;
        var dx = other.x - jt.x, dy = other.y - jt.y;
        var L = Math.sqrt(dx * dx + dy * dy);
        if (L === 0) continue;
        // Convention: F > 0 = tension. Force on joint from member points along (dx, dy)/L (toward the other joint = "pull inward when tension")
        rowX[mi] += dx / L;
        rowY[mi] += dy / L;
      }
      // Reactions add unit columns
      if (reactionCols[jt.id + '_fx'] != null) rowX[reactionCols[jt.id + '_fx']] = 1;
      if (reactionCols[jt.id + '_fy'] != null) rowY[reactionCols[jt.id + '_fy']] = 1;
      // Loads to RHS (move to other side -> negate)
      var load = loads[jt.id] || { fx: 0, fy: 0 };
      A.push(rowX); b.push(-load.fx);
      A.push(rowY); b.push(-load.fy);
    }

    // Gaussian elimination with partial pivoting
    for (var k = 0; k < n; k++) {
      var maxIdx = k, maxAbs = Math.abs(A[k][k]);
      for (var ii = k + 1; ii < n; ii++) {
        var v = Math.abs(A[ii][k]);
        if (v > maxAbs) { maxIdx = ii; maxAbs = v; }
      }
      if (maxAbs < 1e-9) return { ok: false, reason: 'singular system at row ' + k };
      if (maxIdx !== k) {
        var ta = A[k]; A[k] = A[maxIdx]; A[maxIdx] = ta;
        var tb = b[k]; b[k] = b[maxIdx]; b[maxIdx] = tb;
      }
      for (var i2 = k + 1; i2 < n; i2++) {
        var f = A[i2][k] / A[k][k];
        if (f === 0) continue;
        for (var j2 = k; j2 < n; j2++) A[i2][j2] -= f * A[k][j2];
        b[i2] -= f * b[k];
      }
    }
    // Back substitution
    var x = new Array(n);
    for (var k2 = n - 1; k2 >= 0; k2--) {
      var sum = 0;
      for (var jj = k2 + 1; jj < n; jj++) sum += A[k2][jj] * x[jj];
      x[k2] = (b[k2] - sum) / A[k2][k2];
    }

    // Extract
    var memberForces = {};
    for (var mi2 = 0; mi2 < members.length; mi2++) memberForces[members[mi2].id] = x[mi2];
    var reactions = {};
    for (var ji3 = 0; ji3 < j; ji3++) {
      var jid3 = joints[ji3].id;
      var rx = reactionCols[jid3 + '_fx'] != null ? x[reactionCols[jid3 + '_fx']] : 0;
      var ry = reactionCols[jid3 + '_fy'] != null ? x[reactionCols[jid3 + '_fy']] : 0;
      if (rx || ry) reactions[jid3] = { fx: rx, fy: ry };
    }
    return { ok: true, memberForces: memberForces, reactions: reactions };
  }

  // Build the truss geometry (joints + members + loads + supports) for a given style + parameters.
  // Returns the spec; the SVG renderer + the MOJ solver both consume this.
  //
  // loadOpts:
  //   { mode: 'uniform', loadPerJoint: kN }            — load on every top joint
  //   { mode: 'vehicle', position: 0..1, totalKN: kN } — single vehicle, distributed
  //     to nearest two TOP joints by linear-interpolation (lever rule); reduces to
  //     a single joint when exactly over it.
  function buildTrussSpec(style, span, nBays, height, loadOpts) {
    var n = nBays, a = span / n, hh = height;
    var joints = [], members = [], loads = {}, supports = {};

    // Default to uniform for back-compat (loadOpts can be a number)
    var opts = (typeof loadOpts === 'number') ? { mode: 'uniform', loadPerJoint: loadOpts } : (loadOpts || { mode: 'uniform', loadPerJoint: 50 });

    function vehicleLoadsForTops(topJoints, topX) {
      // Distribute opts.totalKN at vehicle position (0..1 along span) to the nearest two top joints
      var pos = Math.max(0, Math.min(1, opts.position));
      var vx = pos * span;
      // Find the bracketing top joints
      var lows = [], result = {};
      for (var ti = 0; ti < topJoints.length; ti++) result[topJoints[ti]] = 0;
      // Edge cases: vehicle to the LEFT of leftmost top → put all load on leftmost.
      if (topX.length === 0) return result;
      if (vx <= topX[0]) { result[topJoints[0]] = opts.totalKN; return result; }
      if (vx >= topX[topX.length - 1]) { result[topJoints[topX.length - 1]] = opts.totalKN; return result; }
      for (var k = 0; k < topX.length - 1; k++) {
        if (vx >= topX[k] && vx <= topX[k + 1]) {
          var t = (vx - topX[k]) / (topX[k + 1] - topX[k]);
          result[topJoints[k]] = opts.totalKN * (1 - t);
          result[topJoints[k + 1]] = opts.totalKN * t;
          break;
        }
      }
      return result;
    }

    if (style === 'warren') {
      for (var i = 0; i <= n; i++) joints.push({ id: 'B' + i, x: i * a, y: 0 });
      for (var i2 = 0; i2 < n; i2++) joints.push({ id: 'T' + i2, x: (i2 + 0.5) * a, y: hh });
      for (var i3 = 0; i3 < n; i3++) members.push({ id: 'BC' + i3, j1: 'B' + i3, j2: 'B' + (i3 + 1) });
      for (var i4 = 0; i4 < n - 1; i4++) members.push({ id: 'TC' + i4, j1: 'T' + i4, j2: 'T' + (i4 + 1) });
      for (var i5 = 0; i5 < n; i5++) {
        members.push({ id: 'DL' + i5, j1: 'B' + i5, j2: 'T' + i5 });
        members.push({ id: 'DR' + i5, j1: 'T' + i5, j2: 'B' + (i5 + 1) });
      }
      // Loads
      if (opts.mode === 'vehicle') {
        var topIds = []; var topXs = [];
        for (var ti = 0; ti < n; ti++) { topIds.push('T' + ti); topXs.push((ti + 0.5) * a); }
        var vehLoads = vehicleLoadsForTops(topIds, topXs);
        for (var tk in vehLoads) {
          if (vehLoads[tk] > 0) loads[tk] = { fx: 0, fy: -vehLoads[tk] };
        }
      } else {
        for (var lt = 0; lt < n; lt++) loads['T' + lt] = { fx: 0, fy: -(opts.loadPerJoint || 50) };
      }
    } else {
      // pratt / howe (skip ktruss here — MOJ for ktruss is more complex)
      for (var ii = 0; ii <= n; ii++) joints.push({ id: 'B' + ii, x: ii * a, y: 0 });
      for (var ij = 1; ij < n; ij++) joints.push({ id: 'T' + (ij - 1), x: ij * a, y: hh });
      for (var ic = 0; ic < n; ic++) members.push({ id: 'BC' + ic, j1: 'B' + ic, j2: 'B' + (ic + 1) });
      var topCount = n - 1;
      for (var iT = 0; iT < topCount - 1; iT++) members.push({ id: 'TC' + iT, j1: 'T' + iT, j2: 'T' + (iT + 1) });
      // Verticals
      for (var iv = 0; iv < topCount; iv++) members.push({ id: 'V' + iv, j1: 'B' + (iv + 1), j2: 'T' + iv });
      // End diagonals from support corners up to first/last top joint
      members.push({ id: 'ED0', j1: 'B0', j2: 'T0' });
      members.push({ id: 'ED1', j1: 'B' + n, j2: 'T' + (topCount - 1) });
      if (style === 'pratt') {
        var mid = Math.floor((topCount - 1) / 2);
        for (var ip = 0; ip < topCount - 1; ip++) {
          // Pratt: interior diagonals slope toward center
          if (ip < mid) members.push({ id: 'ID' + ip, j1: 'T' + ip, j2: 'B' + (ip + 2) });
          else members.push({ id: 'ID' + ip, j1: 'B' + (ip + 1), j2: 'T' + (ip + 1) });
        }
      } else if (style === 'howe') {
        var mid2 = Math.floor((topCount - 1) / 2);
        for (var ih = 0; ih < topCount - 1; ih++) {
          // Howe: interior diagonals slope away from center
          if (ih < mid2) members.push({ id: 'ID' + ih, j1: 'B' + (ih + 1), j2: 'T' + (ih + 1) });
          else members.push({ id: 'ID' + ih, j1: 'T' + ih, j2: 'B' + (ih + 2) });
        }
      }
      // Loads
      if (opts.mode === 'vehicle') {
        var topIds2 = []; var topXs2 = [];
        for (var ti2 = 0; ti2 < topCount; ti2++) { topIds2.push('T' + ti2); topXs2.push((ti2 + 1) * a); }
        var vehLoads2 = vehicleLoadsForTops(topIds2, topXs2);
        for (var tk2 in vehLoads2) {
          if (vehLoads2[tk2] > 0) loads[tk2] = { fx: 0, fy: -vehLoads2[tk2] };
        }
      } else {
        for (var lt2 = 0; lt2 < topCount; lt2++) loads['T' + lt2] = { fx: 0, fy: -(opts.loadPerJoint || 50) };
      }
    }
    // Pin support at B0, roller at Bn
    supports['B0'] = 'pin';
    supports['B' + n] = 'roller';
    return { joints: joints, members: members, loads: loads, supports: supports };
  }

  // ──────────────────────────────────────────────────────────────────
  // Plugin registration
  // ──────────────────────────────────────────────────────────────────
  window.StemLab.registerTool('bridgeLab', {
    icon: '🌉',
    label: 'Bridge Engineering Lab',
    desc: 'NGSS MS-ETS1 + HS-ETS1 + HS-PS2. Truss stress simulator with adjustable span/height/load/material, bridge type comparison (beam/truss/arch/suspension/cable-stayed), materials database, force types, real-world case studies (Tacoma Narrows, Hyatt Regency, Tay, Silver, plus Brooklyn/Golden Gate/Akashi/Millau), engineering design cycle, AP-style quiz, printable design specs.',
    color: 'amber',
    category: 'science',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var callGemini = ctx.callGemini;

      if (!labToolData || !labToolData.bridgeLab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { bridgeLab: {
            tab: 'build',
            span: 30, height: 6, nBays: 4, loadPerJoint: 50, materialId: 'steel',
            crossSectionMm2: 5000, // member cross-section in mm² (default 50 cm²)
            bridgeType: 'truss',
            trussStyle: 'warren', // warren | pratt | howe | ktruss
            loadMode: 'uniform', // uniform | vehicle
            vehiclePos: 0.5, // 0..1 along span (for vehicle mode)
            vehicleLoad: 150, // kN
            selectedForce: 'tension',
            selectedCase: 'tacoma',
            selectedStep: 'define',
            quizIdx: 0, quizAnswers: [], quizSubmitted: false, quizCorrect: 0,
            designName: '', designNotes: ''
          }});
        });
        return h('div', { style: { padding: 24, color: '#94a3b8', textAlign: 'center' } }, '🌉 Initializing Bridge Lab...');
      }
      var d = labToolData.bridgeLab;

      function upd(patch) {
        setLabToolData(function(prev) {
          var s = Object.assign({}, (prev && prev.bridgeLab) || {}, patch);
          return Object.assign({}, prev, { bridgeLab: s });
        });
      }

      var AMBER = '#f59e0b', AMBER_LIGHT = '#fffbeb', AMBER_DARK = '#78350f';
      var BG = '#0f172a';

      var TABS = [
        { id: 'build',     icon: '🔨', label: 'Stress Test' },
        { id: 'types',     icon: '🌉', label: 'Bridge Types' },
        { id: 'materials', icon: '🧱', label: 'Materials' },
        { id: 'forces',    icon: '⚖️', label: 'Forces' },
        { id: 'cases',     icon: '📚', label: 'Case Studies' },
        { id: 'cycle',     icon: '🔁', label: 'Design Cycle' },
        { id: 'quiz',      icon: '📝', label: 'Quiz' },
        { id: 'print',     icon: '🖨', label: 'Print' }
      ];

      var tabBar = h('div', {
        role: 'tablist', 'aria-label': 'Bridge Engineering sections',
        style: { display: 'flex', gap: 4, padding: '10px 12px', borderBottom: '1px solid #1e293b', overflowX: 'auto', flexShrink: 0, background: '#0a0e1a' }
      },
        TABS.map(function(t) {
          var active = d.tab === t.id;
          return h('button', {
            key: t.id, role: 'tab', 'aria-selected': active,
            'aria-label': t.label,
            onClick: function() { upd({ tab: t.id }); },
            style: { padding: '6px 12px', borderRadius: 8, border: 'none', background: active ? 'rgba(245,158,11,0.25)' : 'transparent', color: active ? '#fbbf24' : '#94a3b8', fontWeight: active ? 700 : 500, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }
          }, t.icon + ' ' + t.label);
        })
      );

      function sectionCard(title, children, accent) {
        accent = accent || AMBER;
        return h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid ' + accent, marginBottom: 12 } },
          title ? h('div', { style: { fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 } }, title) : null,
          children
        );
      }

      // ──────────────────────────────────────────────────────────────
      // BUILD / STRESS TEST tab
      // ──────────────────────────────────────────────────────────────
      function renderBuild() {
        var mat = MATERIALS.find(function(m) { return m.id === d.materialId; }) || MATERIALS[3];
        var analysis = analyzeTruss(d.span, d.height, d.nBays, d.loadPerJoint);
        // Build truss spec + run MOJ solver for exact forces (Warren / Pratt / Howe only; K-truss uses approximation)
        var trussStyle = d.trussStyle || 'warren';
        var supportsMOJ = trussStyle !== 'ktruss';
        var loadMode = d.loadMode || 'uniform';
        var loadOpts = loadMode === 'vehicle'
          ? { mode: 'vehicle', position: d.vehiclePos != null ? d.vehiclePos : 0.5, totalKN: d.vehicleLoad || 150 }
          : { mode: 'uniform', loadPerJoint: d.loadPerJoint };
        var spec = supportsMOJ ? buildTrussSpec(trussStyle, d.span, d.nBays, d.height, loadOpts) : null;
        var moj = spec ? solveTrussMOJ(spec.joints, spec.members, spec.loads, spec.supports) : { ok: false };
        // If MOJ succeeded, replace approximate maxChord + maxDiag with exact values
        if (moj.ok) {
          var maxAbsForce = 0;
          var maxChordExact = 0, maxDiagExact = 0;
          for (var fk in moj.memberForces) {
            var fv = Math.abs(moj.memberForces[fk]);
            if (fv > maxAbsForce) maxAbsForce = fv;
            if (fk.indexOf('BC') === 0 || fk.indexOf('TC') === 0) {
              if (fv > maxChordExact) maxChordExact = fv;
            } else if (fk.indexOf('DL') === 0 || fk.indexOf('DR') === 0 || fk.indexOf('ED') === 0 || fk.indexOf('ID') === 0 || fk.indexOf('V') === 0) {
              if (fv > maxDiagExact) maxDiagExact = fv;
            }
          }
          if (maxChordExact > 0) analysis.maxChord = maxChordExact;
          if (maxDiagExact > 0) analysis.maxDiag = maxDiagExact;
        }

        // Stress = force / cross-section. Stress (MPa) = force (N) / area (mm²).
        // Force in kN → multiply by 1000 to get N. So MPa = force_kN * 1000 / area_mm².
        var stressChord = analysis.maxChord * 1000 / d.crossSectionMm2; // MPa
        var stressDiag = analysis.maxDiag * 1000 / d.crossSectionMm2; // MPa
        var maxStress = Math.max(stressChord, stressDiag);
        var safetyFactor = mat.yieldMPa / maxStress;

        // ── Euler buckling check for the longest compression member ──
        // The top chord is the longest compression member: length = bay width a.
        // For an asssumed-square cross-section (side = sqrt(area)), moment of inertia
        // I = side^4 / 12. Radius of gyration r = sqrt(I/A) = side/sqrt(12).
        // Critical buckling load (pinned ends): P_cr = π² EI / L²
        //   E in GPa → convert to N/mm² (= MPa) by *1000. So E_MPa = mat.modulusGPa * 1000.
        //   I in mm⁴ (computed from area mm²).
        //   L in mm.
        // P_cr in N → convert to kN by /1000.
        var sideMm = Math.sqrt(d.crossSectionMm2);
        var I_mm4 = (sideMm * sideMm * sideMm * sideMm) / 12;
        var E_MPa = mat.modulusGPa * 1000;
        var L_top_mm = (d.span / d.nBays) * 1000; // top chord member length
        var P_cr_top_kN = (Math.PI * Math.PI * E_MPa * I_mm4) / (L_top_mm * L_top_mm) / 1000;
        var bucklingMargin = P_cr_top_kN / Math.max(0.001, analysis.maxChord);
        var buckles = bucklingMargin < 1;
        var bucklingMarginal = bucklingMargin >= 1 && bucklingMargin < 2;
        var slenderness = L_top_mm / (sideMm / Math.sqrt(12));

        // Status combines yield + buckling
        var yieldStatus = safetyFactor >= 2 ? 'safe' : safetyFactor >= 1 ? 'marginal' : 'failed';
        var bucklingStatus = !buckles && !bucklingMarginal ? 'safe' : bucklingMarginal ? 'marginal' : 'failed';
        var status = (yieldStatus === 'failed' || bucklingStatus === 'failed') ? 'failed'
                   : (yieldStatus === 'marginal' || bucklingStatus === 'marginal') ? 'marginal'
                   : 'safe';

        // Estimate weight: density (kg/m³) * volume. Volume = totalLen (m) * area (m²).
        // Area_m² = mm² / 1e6
        var areaM2 = d.crossSectionMm2 / 1e6;
        var volumeM3 = analysis.totalLen * areaM2;
        var massKg = volumeM3 * mat.densityKgM3;
        var costUsd = volumeM3 * mat.costPerM3;

        // Draw the truss SVG. trussStyle determines geometry:
        //   warren  — alternating diagonals (no verticals), 4 bays => 5 bottom + 4 top joints
        //   pratt   — verticals + diagonals sloping toward center (diagonals in tension)
        //   howe    — verticals + diagonals sloping away from center (diagonals in compression)
        //   ktruss  — verticals + K-shaped diagonals meeting at mid-height
        function trussSvg() {
          var n = d.nBays;
          var a = d.span / n;
          var h2 = d.height;
          var style = d.trussStyle || 'warren';
          var paddingX = 20, paddingY = 20;
          var svgW = 700, svgH = 280;
          var scale = Math.min((svgW - 2 * paddingX) / d.span, (svgH - 2 * paddingY) / (d.height * 1.5));
          var originX = (svgW - d.span * scale) / 2;
          var originY = svgH - paddingY - 30;
          var bottoms = [], tops = [], bottomChord = [], topChord = [], diagonals = [], verticals = [];

          if (style === 'warren') {
            for (var i = 0; i <= n; i++) bottoms.push({ x: i * a, y: 0, idx: i });
            for (var i2 = 0; i2 < n; i2++) tops.push({ x: (i2 + 0.5) * a, y: h2, idx: i2 });
            for (var i3 = 0; i3 < n; i3++) bottomChord.push({ j1: bottoms[i3], j2: bottoms[i3 + 1], kind: 'tension' });
            for (var i4 = 0; i4 < n - 1; i4++) topChord.push({ j1: tops[i4], j2: tops[i4 + 1], kind: 'compression' });
            for (var i5 = 0; i5 < n; i5++) {
              diagonals.push({ j1: bottoms[i5], j2: tops[i5], kind: 'compression' });
              diagonals.push({ j1: tops[i5], j2: bottoms[i5 + 1], kind: 'tension' });
            }
          } else {
            // pratt / howe / ktruss: same joint layout (n+1 bottoms, n-1 interior tops directly above bottoms 1..n-1)
            for (var ii = 0; ii <= n; ii++) bottoms.push({ x: ii * a, y: 0, idx: ii });
            for (var ij = 1; ij < n; ij++) tops.push({ x: ij * a, y: h2, idx: ij - 1 });
            // Chords
            for (var ic = 0; ic < n; ic++) bottomChord.push({ j1: bottoms[ic], j2: bottoms[ic + 1], kind: 'tension' });
            for (var iT = 0; iT < n - 2; iT++) topChord.push({ j1: tops[iT], j2: tops[iT + 1], kind: 'compression' });
            // Verticals: connect each top joint to the bottom joint directly below
            for (var iv = 0; iv < tops.length; iv++) verticals.push({ j1: bottoms[iv + 1], j2: tops[iv], kind: style === 'pratt' ? 'compression' : 'tension' });
            // End-diagonals from corner supports to first top joint
            if (tops.length > 0) {
              diagonals.push({ j1: bottoms[0], j2: tops[0], kind: 'compression' });
              diagonals.push({ j1: bottoms[n], j2: tops[tops.length - 1], kind: 'compression' });
            }
            if (style === 'pratt') {
              // Interior diagonals slope inward (toward center). For each interior bay,
              // a diagonal from a bottom joint to a higher top joint farther from the end.
              // Left half: from bottom[i] to top[i] for i=1..mid (going up-right)
              var mid = Math.floor((n - 1) / 2);
              for (var ip = 1; ip < tops.length; ip++) {
                if (ip <= mid) diagonals.push({ j1: bottoms[ip], j2: tops[ip], kind: 'tension' });
                else diagonals.push({ j1: tops[ip - 1], j2: bottoms[ip], kind: 'tension' });
              }
            } else if (style === 'howe') {
              // Howe diagonals slope outward (away from center).
              var mid2 = Math.floor((n - 1) / 2);
              for (var ih2 = 1; ih2 < tops.length; ih2++) {
                if (ih2 <= mid2) diagonals.push({ j1: tops[ih2 - 1], j2: bottoms[ih2], kind: 'compression' });
                else diagonals.push({ j1: bottoms[ih2], j2: tops[ih2], kind: 'compression' });
              }
            } else if (style === 'ktruss') {
              // K-truss: each interior bay has a "K" — vertical from top to bottom plus 2 diagonals meeting at mid-height of the vertical
              // For simplicity, draw mid-height intermediate joints
              var midJoints = [];
              for (var ik = 1; ik < n; ik++) midJoints.push({ x: ik * a, y: h2 / 2, idx: ik });
              for (var ik2 = 0; ik2 < midJoints.length; ik2++) {
                // Vertical above and below mid (already in verticals); add the K diagonals
                if (ik2 > 0) diagonals.push({ j1: midJoints[ik2], j2: tops[ik2 - 1], kind: 'compression' });
                if (ik2 < midJoints.length - 1) diagonals.push({ j1: midJoints[ik2], j2: tops[ik2 + 1], kind: 'compression' });
                if (ik2 > 0) diagonals.push({ j1: midJoints[ik2], j2: bottoms[ik2], kind: 'tension' });
                if (ik2 < midJoints.length - 1) diagonals.push({ j1: midJoints[ik2], j2: bottoms[ik2 + 2], kind: 'tension' });
              }
              // Add mid joints to display list
              tops = tops.concat(midJoints);
            }
          }
          function tx(x) { return originX + x * scale; }
          function ty(y) { return originY - y * scale; }

          // If we have MOJ results AND a spec, color each member by its exact force.
          // Members in spec have ids that match positions in our rendered arrays.
          // For Warren: BC0..BCn-1 (bottom chord), TC0..TC{n-2} (top chord), DL0..DL{n-1} + DR0..DR{n-1} (diagonals).
          // For Pratt/Howe: BC, TC, V (verticals), ED0/ED1 (end diagonals), ID (interior diagonals).
          var useExact = moj && moj.ok && spec;
          // Find max absolute force for normalization
          var globalMaxF = 1;
          if (useExact) {
            for (var fkk in moj.memberForces) {
              var fvv = Math.abs(moj.memberForces[fkk]);
              if (fvv > globalMaxF) globalMaxF = fvv;
            }
          }

          function stressColor(forceKn, fallbackKind, ratio) {
            // tension red, compression blue. Saturation by ratio.
            var alpha = 0.35 + 0.65 * ratio;
            // If we have an exact force, sign tells us tension/compression
            var isTension;
            if (forceKn != null) isTension = forceKn > 0;
            else isTension = (fallbackKind === 'tension');
            if (isTension) return 'rgba(220,38,38,' + alpha.toFixed(2) + ')';
            return 'rgba(37,99,235,' + alpha.toFixed(2) + ')';
          }

          // Map qualitative position-based ratios (used when MOJ is not available)
          function chordStress(idx, total) {
            var pos = idx + 0.5;
            var distFromCenter = Math.abs(pos - total / 2);
            return Math.max(0.3, 1 - distFromCenter / (total / 2 + 0.5));
          }
          function diagStress(idx, totalDiags) {
            var distFromCenter = Math.abs(idx + 0.5 - totalDiags / 2);
            return Math.max(0.3, distFromCenter / (totalDiags / 2));
          }

          var renderMember = function(m, idx, allLen, kindForStress, mid) {
            var ratio, forceKn = null;
            if (useExact && mid && moj.memberForces[mid] != null) {
              forceKn = moj.memberForces[mid];
              ratio = Math.max(0.25, Math.min(1, Math.abs(forceKn) / globalMaxF));
            } else if (m.kind === 'tension' || m.kind === 'compression') {
              if (kindForStress === 'chord') ratio = chordStress(idx, allLen);
              else if (kindForStress === 'diag') ratio = diagStress(idx, allLen);
              else ratio = 0.6;
            } else ratio = 0.4;
            var stroke = stressColor(forceKn, m.kind, ratio);
            var sw = 2 + ratio * 4;
            var ariaLabel = forceKn != null ? (forceKn > 0 ? 'Tension ' : 'Compression ') + Math.abs(forceKn).toFixed(0) + ' kN' : '';
            return h('line', { key: kindForStress + '_' + idx,
              x1: tx(m.j1.x), y1: ty(m.j1.y), x2: tx(m.j2.x), y2: ty(m.j2.y),
              stroke: stroke, strokeWidth: sw, strokeLinecap: 'round'
            },
              ariaLabel ? h('title', null, ariaLabel) : null
            );
          };
          var styleLabel = { warren: 'Warren', pratt: 'Pratt', howe: 'Howe', ktruss: 'K-truss' }[style] || 'Warren';
          return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'trussSvgT trussSvgD' },
            h('title', { id: 'trussSvgT' }, styleLabel + ' truss diagram'),
            h('desc', { id: 'trussSvgD' }, styleLabel + ' truss with ' + n + ' bays, span ' + d.span + ' meters, height ' + d.height + ' meters. Red members are in tension; blue members are in compression. Thickness shows magnitude of force.'),
            // Ground line
            h('line', { x1: 0, y1: ty(0), x2: svgW, y2: ty(0), stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }),
            // Members — pass member id so MOJ-exact coloring works
            bottomChord.map(function(m, i) { return renderMember(m, i, bottomChord.length, 'chord', 'BC' + i); }),
            topChord.map(function(m, i) { return renderMember(m, i, topChord.length, 'chord', 'TC' + i); }),
            verticals.map(function(m, i) { return renderMember(m, i, verticals.length, 'vert', 'V' + i); }),
            diagonals.map(function(m, i) {
              // Diagonal IDs differ by truss style:
              //   warren: DL0/DR0/DL1/DR1/... alternating (i even = DL{i/2}, i odd = DR{(i-1)/2})
              //   pratt/howe: ED0, ED1, ID0, ID1, ... (we push ED0 first, then ED1, then IDs)
              var midDiag = null;
              if (style === 'warren') {
                var di = Math.floor(i / 2);
                midDiag = (i % 2 === 0 ? 'DL' : 'DR') + di;
              } else if (style === 'pratt' || style === 'howe') {
                if (i === 0) midDiag = 'ED0';
                else if (i === 1) midDiag = 'ED1';
                else midDiag = 'ID' + (i - 2);
              }
              return renderMember(m, i, diagonals.length, 'diag', midDiag);
            }),
            // Joints
            bottoms.concat(tops).map(function(j, i) {
              return h('circle', { key: 'jt_' + i, cx: tx(j.x), cy: ty(j.y), r: 4, fill: '#fbbf24', stroke: '#78350f', strokeWidth: 1 });
            }),
            // Support symbols at B0 and Bn
            (function() {
              var b0x = tx(0), bnx = tx(d.span), gy = ty(0);
              return [
                h('polygon', { key: 'sup0', points: (b0x - 8) + ',' + (gy + 12) + ' ' + (b0x + 8) + ',' + (gy + 12) + ' ' + b0x + ',' + (gy + 2), fill: '#94a3b8' }),
                h('polygon', { key: 'supN', points: (bnx - 8) + ',' + (gy + 12) + ' ' + (bnx + 8) + ',' + (gy + 12) + ' ' + bnx + ',' + (gy + 2), fill: '#94a3b8' })
              ];
            })(),
            // Load indicators
            loadMode === 'vehicle' ? (function() {
              var vx = (d.vehiclePos != null ? d.vehiclePos : 0.5) * d.span;
              var vxScreen = tx(vx);
              var vTop = ty(d.height) - 14;
              return h('g', { key: 'vehicle' },
                // Truck silhouette
                h('rect', { x: vxScreen - 18, y: vTop - 10, width: 36, height: 12, rx: 2, fill: '#10b981', stroke: '#064e3b', strokeWidth: 1 }),
                h('rect', { x: vxScreen - 14, y: vTop - 7, width: 14, height: 6, fill: '#0a0e1a' }),
                h('circle', { cx: vxScreen - 10, cy: vTop + 4, r: 3, fill: '#0a0e1a' }),
                h('circle', { cx: vxScreen + 10, cy: vTop + 4, r: 3, fill: '#0a0e1a' }),
                h('line', { x1: vxScreen, y1: vTop + 2, x2: vxScreen, y2: ty(d.height) - 2, stroke: '#22c55e', strokeWidth: 1.5, strokeDasharray: '3 2' }),
                h('text', { x: vxScreen, y: vTop - 14, textAnchor: 'middle', fill: '#86efac', fontSize: 10, fontWeight: 700 }, (d.vehicleLoad || 150) + ' kN')
              );
            })() : tops.map(function(j, i) {
              // Only show on actual TOP joints (not midJoints of K-truss)
              if (style === 'ktruss' && j.y < d.height) return null;
              var jx = tx(j.x), jy = ty(j.y) - 20;
              return h('g', { key: 'load_' + i },
                h('line', { x1: jx, y1: jy, x2: jx, y2: ty(j.y) - 2, stroke: '#22c55e', strokeWidth: 2 }),
                h('polygon', { points: (jx - 4) + ',' + (ty(j.y) - 6) + ' ' + (jx + 4) + ',' + (ty(j.y) - 6) + ' ' + jx + ',' + (ty(j.y) - 1), fill: '#22c55e' }),
                h('text', { x: jx, y: jy - 4, textAnchor: 'middle', fill: '#86efac', fontSize: 9 }, d.loadPerJoint + 'kN')
              );
            }),
            // Span dim line
            h('line', { x1: tx(0), y1: ty(0) + 28, x2: tx(d.span), y2: ty(0) + 28, stroke: '#64748b', strokeWidth: 1 }),
            h('text', { x: (tx(0) + tx(d.span)) / 2, y: ty(0) + 40, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10 }, 'Span = ' + d.span + ' m')
          );
        }

        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Warren truss bridge stress test. Adjust the parameters below and see how force distribution changes. ',
            h('strong', { style: { color: '#fbbf24' } }, 'Red = tension'), ', ',
            h('strong', { style: { color: '#7dd3fc' } }, 'blue = compression'),
            ', thickness shows magnitude. Forces calculated using the deep-beam approximation (real analysis would use method of joints or matrix structural analysis).'
          ),

          // SVG
          h('div', { style: { padding: 12, borderRadius: 12, background: '#0a0e1a', border: '1px solid #334155', marginBottom: 14, overflowX: 'auto' } },
            trussSvg()
          ),

          // Load mode toggle
          sectionCard('Loading',
            h('div', null,
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
                [
                  { id: 'uniform', name: 'Uniform load', sub: 'distributed across all top joints (dead load equivalent)' },
                  { id: 'vehicle', name: 'Moving vehicle', sub: 'single point load you can drag across the span' }
                ].map(function(o) {
                  var active = loadMode === o.id;
                  return h('button', { key: o.id,
                    onClick: function() { upd({ loadMode: o.id }); },
                    style: { padding: '8px 12px', borderRadius: 8, background: active ? 'rgba(245,158,11,0.20)' : '#0f172a', border: '1px solid ' + (active ? AMBER : '#334155'), color: active ? '#fbbf24' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }
                  },
                    h('div', null, o.name),
                    h('div', { style: { fontSize: 10, opacity: 0.75, fontWeight: 500, marginTop: 2 } }, o.sub)
                  );
                })
              ),
              loadMode === 'vehicle'
                ? h('div', { style: { fontSize: 11.5, color: '#fde68a', lineHeight: 1.6, padding: 8, background: 'rgba(245,158,11,0.10)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)' } },
                    h('strong', null, 'Moving-load analysis: '),
                    'real bridges are designed by sliding the worst possible vehicle across every point on the span and recording the maximum force in each member. The "influence line" of a member is how its force varies with the load\'s position. Each member has its own worst case — usually NOT in the same place as the worst case for any other member.'
                  )
                : h('div', { style: { fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5, padding: 8 } }, 'Uniform mode treats the load as equally distributed across all top joints — useful for studying the bridge under its own weight + typical dead loads.')
            )
          ),

          // Controls
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 } },
            sliderControl('Span (m)', d.span, 10, 80, 5, function(v) { upd({ span: v }); }, AMBER),
            sliderControl('Height (m)', d.height, 2, 15, 0.5, function(v) { upd({ height: v }); }, AMBER),
            sliderControl('Bays', d.nBays, 3, 8, 1, function(v) { upd({ nBays: v }); }, AMBER),
            loadMode === 'vehicle'
              ? sliderControl('Vehicle position (0=left, 1=right)', d.vehiclePos != null ? d.vehiclePos : 0.5, 0, 1, 0.02, function(v) { upd({ vehiclePos: v }); }, AMBER)
              : sliderControl('Load per joint (kN)', d.loadPerJoint, 10, 200, 10, function(v) { upd({ loadPerJoint: v }); }, AMBER),
            loadMode === 'vehicle'
              ? sliderControl('Vehicle weight (kN)', d.vehicleLoad || 150, 50, 500, 10, function(v) { upd({ vehicleLoad: v }); }, AMBER)
              : sliderControl('Member cross-section (mm²)', d.crossSectionMm2, 1000, 20000, 500, function(v) { upd({ crossSectionMm2: v }); }, AMBER),
            loadMode === 'vehicle'
              ? sliderControl('Member cross-section (mm²)', d.crossSectionMm2, 1000, 20000, 500, function(v) { upd({ crossSectionMm2: v }); }, AMBER)
              : null
          ),

          // Truss style + Material selector
          sectionCard('Truss style',
            h('div', null,
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 } },
                [
                  { id: 'warren', name: 'Warren', sub: 'alternating diagonals, no verticals' },
                  { id: 'pratt',  name: 'Pratt',  sub: 'verticals + inward diagonals (in tension)' },
                  { id: 'howe',   name: 'Howe',   sub: 'verticals + outward diagonals (in compression)' },
                  { id: 'ktruss', name: 'K-truss', sub: 'K-shaped pattern, shorter diagonals' }
                ].map(function(s) {
                  var active = (d.trussStyle || 'warren') === s.id;
                  return h('button', { key: s.id,
                    onClick: function() { upd({ trussStyle: s.id }); },
                    style: { padding: '8px 12px', borderRadius: 8, background: active ? 'rgba(245,158,11,0.25)' : '#0f172a', border: '1px solid ' + (active ? AMBER : '#334155'), color: active ? '#fbbf24' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }
                  },
                    h('div', null, s.name),
                    h('div', { style: { fontSize: 10, opacity: 0.75, fontWeight: 500, marginTop: 2 } }, s.sub)
                  );
                })
              ),
              h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.6, fontStyle: 'italic' } },
                (function() {
                  var s = d.trussStyle || 'warren';
                  if (s === 'warren') return 'Warren trusses (1848, James Warren) use equilateral triangles with no verticals. Alternating diagonals carry shear in alternating tension/compression. Efficient and elegant; common in shorter spans.';
                  if (s === 'pratt') return 'Pratt trusses (1844, Caleb + Thomas Pratt) put the diagonals in tension (sloping toward the center) and the verticals in compression. Steel is good in tension, wood is good in compression — Pratt uses each well. The most common 19th-c. American railroad truss.';
                  if (s === 'howe') return 'Howe trusses (1840, William Howe) put the diagonals in compression and the verticals in tension. Better for timber + cast iron construction where wood (diagonals) handles compression and iron rods (verticals) handle tension. Now mostly historical.';
                  if (s === 'ktruss') return 'K-trusses divide each panel with shorter members forming a "K" shape, reducing buckling risk in long compression members. Used in longer spans + bridges with tall trusses, like the Forth Bridge approaches.';
                  return '';
                })()
              )
            )
          ),
          sectionCard('Material',
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              MATERIALS.map(function(m) {
                var active = d.materialId === m.id;
                return h('button', {
                  key: m.id,
                  onClick: function() { upd({ materialId: m.id }); },
                  style: { padding: '6px 12px', borderRadius: 8, background: active ? 'rgba(245,158,11,0.25)' : '#0f172a', border: '1px solid ' + (active ? AMBER : '#334155'), color: active ? '#fbbf24' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                }, m.name);
              })
            )
          ),

          // Analysis results — combined yield + buckling
          h('div', { style: { padding: 14, borderRadius: 12, background: status === 'safe' ? 'rgba(34,197,94,0.10)' : status === 'marginal' ? 'rgba(245,158,11,0.15)' : 'rgba(220,38,38,0.15)', border: '1px solid ' + (status === 'safe' ? 'rgba(34,197,94,0.4)' : status === 'marginal' ? 'rgba(245,158,11,0.4)' : 'rgba(220,38,38,0.4)'), borderLeft: '4px solid ' + (status === 'safe' ? '#22c55e' : status === 'marginal' ? '#f59e0b' : '#dc2626'), marginBottom: 12 } },
            h('div', { style: { fontSize: 16, fontWeight: 900, color: status === 'safe' ? '#86efac' : status === 'marginal' ? '#fbbf24' : '#fca5a5', marginBottom: 10 } },
              status === 'safe' ? '✓ SAFE — passes both yield and buckling checks' :
              status === 'marginal' ? '⚠ MARGINAL — passes but below code-recommended safety factor (2.0)' :
              '✗ FAILED — at least one failure mode reached'
            ),
            // Yield row
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, fontSize: 12.5, color: '#e2e8f0' } },
              h('strong', { style: { color: yieldStatus === 'safe' ? '#86efac' : yieldStatus === 'marginal' ? '#fbbf24' : '#fca5a5', minWidth: 110 } },
                yieldStatus === 'safe' ? '✓ Yield' : yieldStatus === 'marginal' ? '⚠ Yield' : '✗ Yield'
              ),
              h('span', null, 'Safety factor ' + safetyFactor.toFixed(2) + ' (max stress ' + maxStress.toFixed(0) + ' MPa vs yield ' + mat.yieldMPa + ' MPa)')
            ),
            // Buckling row
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, fontSize: 12.5, color: '#e2e8f0' } },
              h('strong', { style: { color: bucklingStatus === 'safe' ? '#86efac' : bucklingStatus === 'marginal' ? '#fbbf24' : '#fca5a5', minWidth: 110 } },
                bucklingStatus === 'safe' ? '✓ Buckling' : bucklingStatus === 'marginal' ? '⚠ Buckling' : '✗ Buckling'
              ),
              h('span', null, 'P_cr ' + P_cr_top_kN.toFixed(0) + ' kN vs chord ' + analysis.maxChord.toFixed(0) + ' kN · slenderness ratio ' + slenderness.toFixed(0))
            ),
            h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.6 } },
              buckles ? 'BUCKLING FAILURE: the top chord (longest compression member) will buckle before reaching yield. Long, thin compression members buckle at loads much lower than their crushing strength. Either thicken the cross-section (raises I quadratically), shorten the bay (more bays), or use bracing.' :
              bucklingMarginal ? 'Buckling margin is thin. A real engineer would add lateral bracing or thicken the chord. Buckling sneaks up on long slender members and is the failure mode that brought down the Quebec Bridge in 1907.' :
              yieldStatus !== 'safe' ? 'The top chord buckles fine, but stress exceeds yield. Increase cross-section, decrease load, increase truss height, or pick a stronger material.' :
              'Both yield and buckling have adequate margin. Code typically requires safety factor 2-4 for buildings and 2-6 for bridges. Brooklyn Bridge was designed with 6x for yield.'
            )
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 } },
            statBox('Max chord force', analysis.maxChord.toFixed(0) + ' kN', '#dc2626'),
            statBox('Max diagonal force', analysis.maxDiag.toFixed(0) + ' kN', '#2563eb'),
            statBox('Max stress', maxStress.toFixed(0) + ' MPa', '#f59e0b'),
            statBox('Material yield', mat.yieldMPa + ' MPa', '#94a3b8'),
            statBox('Euler P_cr (top chord)', P_cr_top_kN.toFixed(0) + ' kN', '#a78bfa'),
            statBox('Slenderness ratio (L/r)', slenderness.toFixed(0), '#a78bfa'),
            statBox('Reaction at each support', analysis.reactions.toFixed(0) + ' kN', '#94a3b8'),
            statBox('Diagonal angle', analysis.diagAngleDeg.toFixed(0) + '°', '#94a3b8'),
            statBox('Total member length', analysis.totalLen.toFixed(1) + ' m', '#94a3b8'),
            statBox('Estimated mass', massKg.toFixed(0) + ' kg', '#94a3b8'),
            statBox('Estimated material cost', '$' + costUsd.toFixed(0), '#86efac')
          ),

          // Design notes
          sectionCard('Design notes (optional, included on print)',
            h('div', null,
              h('input', { type: 'text', value: d.designName || '',
                onChange: function(e) { upd({ designName: e.target.value }); },
                placeholder: 'Design name (e.g., "Marie\'s pedestrian bridge over Back Cove")',
                style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, marginBottom: 8, fontFamily: 'inherit' }
              }),
              h('textarea', { value: d.designNotes || '',
                onChange: function(e) { upd({ designNotes: e.target.value }); },
                placeholder: 'Why this material? What are the constraints? What would you improve?',
                rows: 3,
                style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }
              })
            )
          ),

          // Cost optimization: sweep across all materials × cross-sections + pick cheapest passing SF≥2
          sectionCard('💰 Cost optimization — what\'s the cheapest design that passes?',
            (function() {
              // Use current geometry (span, height, nBays, loadMode) but sweep material × cross-section
              var targetSF = d.optTargetSF != null ? d.optTargetSF : 2.0;
              var sectionRange = [];
              for (var cs = 1000; cs <= 30000; cs += 500) sectionRange.push(cs);
              var results = [];
              MATERIALS.forEach(function(matCandidate) {
                sectionRange.forEach(function(crossMm2) {
                  // Compute peak chord force using current MOJ or approximation. We'll re-use analysis but
                  // just substitute cross-section + material for the safety calc.
                  var stress = analysis.maxChord * 1000 / crossMm2; // MPa
                  // Buckling
                  var side = Math.sqrt(crossMm2);
                  var I = (side * side * side * side) / 12;
                  var L_mm = (d.span / d.nBays) * 1000;
                  var Pcr = (Math.PI * Math.PI * matCandidate.modulusGPa * 1000 * I) / (L_mm * L_mm) / 1000;
                  var sfYield = matCandidate.yieldMPa / stress;
                  var sfBuck = Pcr / Math.max(0.001, analysis.maxChord);
                  var sfMin = Math.min(sfYield, sfBuck);
                  if (sfMin >= targetSF) {
                    var areaM2 = crossMm2 / 1e6;
                    var costUsd = analysis.totalLen * areaM2 * matCandidate.costPerM3;
                    var massKgC = analysis.totalLen * areaM2 * matCandidate.densityKgM3;
                    results.push({
                      material: matCandidate,
                      crossMm2: crossMm2,
                      sfYield: sfYield,
                      sfBuck: sfBuck,
                      cost: costUsd,
                      mass: massKgC
                    });
                  }
                });
              });
              // Sort by cost ascending and take top 5
              results.sort(function(a, b) { return a.cost - b.cost; });
              var top5 = results.slice(0, 5);

              return h('div', null,
                h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Real engineering is not just "does it work?" — it is "what\'s the cheapest design that works?" This optimizer sweeps every combination of material + cross-section, keeps only those that pass your target safety factor for BOTH yield AND buckling, and ranks them by material cost. Span, height, number of bays, and load remain at your current settings.'
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155', marginBottom: 12 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                    h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Target safety factor'),
                    h('span', { style: { fontSize: 13, color: AMBER, fontWeight: 800 } }, targetSF.toFixed(1))
                  ),
                  h('input', { type: 'range', min: 1.5, max: 6, step: 0.5, value: targetSF,
                    onChange: function(e) { upd({ optTargetSF: parseFloat(e.target.value) }); },
                    'aria-label': 'Target safety factor',
                    style: { width: '100%', accentColor: AMBER }
                  }),
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 2 } },
                    h('span', null, '1.5 (very thin margin)'),
                    h('span', null, '2.0 (code minimum)'),
                    h('span', null, '4.0+ (conservative)'),
                    h('span', null, '6.0 (Brooklyn Bridge)')
                  )
                ),
                top5.length === 0
                  ? h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', fontSize: 13, lineHeight: 1.65 } },
                      'NO combination at SF≥' + targetSF + ' works for this geometry + load. Either lower the target safety factor, increase truss height, reduce span, or reduce load.'
                    )
                  : h('div', null,
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#86efac', marginBottom: 8 } }, '✓ ' + results.length + ' combinations pass. Top 5 by cost:'),
                      h('div', { style: { overflowX: 'auto' } },
                        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 580 } },
                          h('thead', null, h('tr', null,
                            ['Rank', 'Material', 'Cross-section', 'SF yield', 'SF buckling', 'Mass', 'Cost (USD)'].map(function(c, i) {
                              return h('th', { key: i, style: { padding: 6, textAlign: 'left', background: '#0a0e1a', color: '#fbbf24', borderBottom: '2px solid ' + AMBER, fontWeight: 800 } }, c);
                            })
                          )),
                          h('tbody', null,
                            top5.map(function(r, i) {
                              var isWinner = i === 0;
                              return h('tr', { key: i, style: { background: isWinner ? 'rgba(34,197,94,0.10)' : (i % 2 === 0 ? '#0f172a' : '#1e293b') } },
                                h('td', { style: { padding: 6, fontWeight: 800, color: isWinner ? '#86efac' : '#cbd5e1' } }, isWinner ? '🏆 1' : String(i + 1)),
                                h('td', { style: { padding: 6, color: '#e2e8f0' } }, r.material.name),
                                h('td', { style: { padding: 6, color: '#cbd5e1' } }, r.crossMm2.toLocaleString() + ' mm²'),
                                h('td', { style: { padding: 6, color: r.sfYield >= 2 ? '#86efac' : '#fbbf24' } }, r.sfYield.toFixed(2)),
                                h('td', { style: { padding: 6, color: r.sfBuck >= 2 ? '#86efac' : '#fbbf24' } }, r.sfBuck.toFixed(2)),
                                h('td', { style: { padding: 6, color: '#cbd5e1' } }, r.mass.toFixed(0) + ' kg'),
                                h('td', { style: { padding: 6, fontWeight: 800, color: isWinner ? '#86efac' : '#fbbf24' } }, '$' + r.cost.toFixed(0))
                              );
                            })
                          )
                        )
                      ),
                      h('div', { style: { marginTop: 10, padding: 8, borderRadius: 6, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 11, color: '#c7d2fe', lineHeight: 1.6 } },
                        h('strong', null, 'Note: '),
                        'Cost estimate is material-only — doesn\'t include labor, fabrication, transport, fastening, or maintenance over the bridge\'s lifetime. Real bridge economics also factor in durability (steel maintenance vs concrete) + replacement cycle. But raw material cost is the starting line.'
                      ),
                      h('div', { style: { marginTop: 8, padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, color: '#fde68a', lineHeight: 1.6 } },
                        h('strong', null, 'Click the winner: '),
                        h('button', {
                          onClick: function() { upd({ materialId: top5[0].material.id, crossSectionMm2: top5[0].crossMm2 }); },
                          style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #fbbf24', background: 'rgba(245,158,11,0.20)', color: '#fbbf24', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginLeft: 6 }
                        }, 'Apply this design to my bridge')
                      )
                    )
              );
            })(),
            '#86efac'
          ),

          sectionCard('A note on this analysis',
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.65 } },
              useExact
                ? h('span', null,
                    h('strong', { style: { color: '#86efac' } }, '✓ Exact analysis (Method of Joints). '),
                    'Forces are computed from 2D pin-jointed equilibrium: for each joint, sum of forces in x and sum of forces in y both equal zero. ',
                    'The resulting linear system (' + (2 * spec.joints.length) + ' equations, ' + (spec.members.length + Object.keys(spec.supports).reduce(function(acc, jid) { return acc + (spec.supports[jid] === 'pin' ? 2 : 1); }, 0)) + ' unknowns) is solved by Gaussian elimination with partial pivoting. Hover over any member in the diagram to see its exact tension or compression force. The maximum chord force (' + analysis.maxChord.toFixed(0) + ' kN) and maximum diagonal force (' + analysis.maxDiag.toFixed(0) + ' kN) are now the actual peak member forces, not deep-beam approximations.'
                  )
                : h('span', null,
                    h('strong', { style: { color: '#fbbf24' } }, '⚠ Deep-beam approximation. '),
                    'K-trusses use the deep-beam approximation: the truss is treated like a single beam carrying the same total load. Maximum chord force ≈ M / h, where M is the bending moment and h is the truss height. The qualitative pattern (max chord at center, max diagonal force at ends) is correct, but per-member forces are not exact. Warren, Pratt, and Howe trusses use the exact Method of Joints solver.'
                  )
            )
          )
        );

        function sliderControl(label, value, min, max, step, onChange, accent) {
          return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
              h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, label),
              h('span', { style: { fontSize: 13, color: accent, fontWeight: 800 } }, value)
            ),
            h('input', { type: 'range', min: min, max: max, step: step, value: value,
              onChange: function(e) { onChange(parseFloat(e.target.value)); },
              'aria-label': label,
              style: { width: '100%', accentColor: accent }
            })
          );
        }
        function statBox(label, value, color) {
          return h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
            h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, label),
            h('div', { style: { fontSize: 13, fontWeight: 800, color: color, marginTop: 2 } }, value)
          );
        }
      }

      // ──────────────────────────────────────────────────────────────
      // BRIDGE TYPES
      // ──────────────────────────────────────────────────────────────
      function renderTypes() {
        // Catenary cable analyzer for suspension bridges
        function suspensionAnalyzer() {
          var cSpan = d.suspSpan != null ? d.suspSpan : 1000; // m
          var cSag  = d.suspSag != null ? d.suspSag : 100;    // m
          var cLoad = d.suspLoad != null ? d.suspLoad : 10;   // kN/m (uniform deck load)
          // Parabolic-cable approximation (valid for taut suspension cables under uniform deck load):
          //   y(x) = (4*s/L²) * x * (L-x)
          //   Horizontal cable tension H = w * L² / (8s)
          //   Vertical tension at supports V = w * L / 2
          //   Max tension T_max = sqrt(H² + V²) at the support
          //   Cable length ≈ L * (1 + (8/3)*(s/L)² - (32/5)*(s/L)⁴ + ...)
          var H = cLoad * cSpan * cSpan / (8 * cSag);
          var V = cLoad * cSpan / 2;
          var Tmax = Math.sqrt(H * H + V * V);
          var sagRatio = cSag / cSpan;
          var cableLen = cSpan * (1 + (8 / 3) * sagRatio * sagRatio - (32 / 5) * Math.pow(sagRatio, 4));
          var angleAtSupport = Math.atan2(V, H) * 180 / Math.PI;

          // Sweet-spot guidance: real bridge sag/span ratios are usually 1/8 to 1/12
          var sagRatioGood = sagRatio >= 1/14 && sagRatio <= 1/6;

          function catenarySvg() {
            var svgW = 600, svgH = 220;
            var padL = 40, padR = 40, padT = 30, padB = 50;
            var plotW = svgW - padL - padR;
            var plotH = svgH - padT - padB;
            // Scale: x = 0..cSpan, y = 0..cSag (downward)
            function tx(x) { return padL + (x / cSpan) * plotW; }
            function ty(y) { return padT + (y / Math.max(cSag, 1)) * plotH; }
            // Build cable points (parabola y = (4s/L²) x(L-x))
            var pts = [];
            for (var i = 0; i <= 50; i++) {
              var xx = (i / 50) * cSpan;
              var yy = (4 * cSag / (cSpan * cSpan)) * xx * (cSpan - xx);
              pts.push(tx(xx) + ',' + ty(yy));
            }
            return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'catTitle catDesc' },
              h('title', { id: 'catTitle' }, 'Suspension bridge cable shape'),
              h('desc', { id: 'catDesc' }, 'A parabolic cable hanging between two towers over a span of ' + cSpan + ' meters with a sag of ' + cSag + ' meters. Maximum tension at supports is ' + Tmax.toFixed(0) + ' kN per meter of bridge width.'),
              // Towers
              h('rect', { x: tx(0) - 6, y: padT - 10, width: 12, height: plotH + 15, fill: '#475569' }),
              h('rect', { x: tx(cSpan) - 6, y: padT - 10, width: 12, height: plotH + 15, fill: '#475569' }),
              h('text', { x: tx(0), y: 18, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10 }, 'Tower'),
              h('text', { x: tx(cSpan), y: 18, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10 }, 'Tower'),
              // Anchorages (ground)
              h('line', { x1: 0, y1: padT + plotH + 12, x2: svgW, y2: padT + plotH + 12, stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }),
              h('text', { x: 8, y: padT + plotH + 28, fill: '#94a3b8', fontSize: 10 }, 'Anchor'),
              h('text', { x: svgW - 50, y: padT + plotH + 28, fill: '#94a3b8', fontSize: 10 }, 'Anchor'),
              // Cable
              h('polyline', { points: pts.join(' '), fill: 'none', stroke: '#fbbf24', strokeWidth: 2.5 }),
              // Hangers (verticals from cable to deck)
              [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(function(t, i) {
                var xx = t * cSpan;
                var yy = (4 * cSag / (cSpan * cSpan)) * xx * (cSpan - xx);
                return h('line', { key: 'hg' + i, x1: tx(xx), y1: ty(yy), x2: tx(xx), y2: ty(cSag), stroke: '#64748b', strokeWidth: 0.7 });
              }),
              // Deck
              h('rect', { x: tx(0), y: ty(cSag), width: plotW, height: 6, fill: '#475569' }),
              h('text', { x: padL + plotW / 2, y: ty(cSag) + 18, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10 }, 'Deck (load: ' + cLoad + ' kN/m)'),
              // Tension force vectors at left tower
              (function() {
                var fx = tx(0), fy = ty(0);
                var scale = 30; // pixels per kN magnitude unit
                var Hpx = Math.min(scale, scale * (H / Tmax));
                var Vpx = Math.min(scale, scale * (V / Tmax));
                return h('g', null,
                  // Horizontal H (pulling left, away from bridge)
                  h('line', { x1: fx, y1: fy, x2: fx - Hpx, y2: fy, stroke: '#ef4444', strokeWidth: 2 }),
                  h('polygon', { points: (fx - Hpx) + ',' + (fy - 3) + ' ' + (fx - Hpx) + ',' + (fy + 3) + ' ' + (fx - Hpx - 5) + ',' + fy, fill: '#ef4444' }),
                  h('text', { x: fx - Hpx - 10, y: fy + 4, textAnchor: 'end', fill: '#fca5a5', fontSize: 10, fontWeight: 700 }, 'H'),
                  // Vertical V (pulling up)
                  h('line', { x1: fx, y1: fy, x2: fx, y2: fy - Vpx, stroke: '#3b82f6', strokeWidth: 2 }),
                  h('polygon', { points: (fx - 3) + ',' + (fy - Vpx) + ' ' + (fx + 3) + ',' + (fy - Vpx) + ' ' + fx + ',' + (fy - Vpx - 5), fill: '#3b82f6' }),
                  h('text', { x: fx + 6, y: fy - Vpx, fill: '#93c5fd', fontSize: 10, fontWeight: 700 }, 'V')
                );
              })()
            );
          }

          return h('div', null,
            h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              'Suspension bridges work differently from trusses. The deck hangs from cables; cables hang in a curve between towers; towers transfer the load down. The cables are in PURE TENSION, the towers in PURE COMPRESSION. Anchorages resist the horizontal pull of the cables — they\'re typically massive concrete blocks buried in bedrock at each end of the bridge.'
            ),

            catenarySvg(),

            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12, marginBottom: 12 } },
              [
                { label: 'Span (m)', value: cSpan, min: 200, max: 2200, step: 50, key: 'suspSpan' },
                { label: 'Sag (m)', value: cSag, min: 10, max: 300, step: 5, key: 'suspSag' },
                { label: 'Deck load (kN/m)', value: cLoad, min: 1, max: 50, step: 1, key: 'suspLoad' }
              ].map(function(s, i) {
                return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                    h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                    h('span', { style: { fontSize: 13, color: AMBER, fontWeight: 800 } }, s.value)
                  ),
                  h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                    onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                    'aria-label': s.label,
                    style: { width: '100%', accentColor: AMBER }
                  })
                );
              })
            ),

            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 } },
              [
                { label: 'Horizontal H', value: H.toFixed(0) + ' kN/m', color: '#fca5a5', sub: 'Pulled into anchorages' },
                { label: 'Vertical V', value: V.toFixed(0) + ' kN/m', color: '#93c5fd', sub: 'Half the deck load (each)' },
                { label: 'Max tension T', value: Tmax.toFixed(0) + ' kN/m', color: '#fbbf24', sub: 'At the tower top' },
                { label: 'Cable length', value: cableLen.toFixed(1) + ' m', color: '#86efac', sub: '~' + ((cableLen / cSpan - 1) * 100).toFixed(1) + '% > span' },
                { label: 'Angle at support', value: angleAtSupport.toFixed(1) + '°', color: '#c7d2fe', sub: 'From horizontal' },
                { label: 'Sag/span ratio', value: '1:' + (1 / sagRatio).toFixed(1), color: sagRatioGood ? '#86efac' : '#fca5a5', sub: sagRatioGood ? 'real-bridge sweet spot' : 'outside typical 1/14-1/6 range' }
              ].map(function(s, i) {
                return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                  h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label),
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: s.color, marginTop: 2 } }, s.value),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, s.sub)
                );
              })
            ),

            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: '#fde68a', lineHeight: 1.65 } },
              h('strong', null, 'Why sag matters: '),
              'Shallower sag (less drop in the cable) means the cable is more horizontal, which means MORE horizontal tension is needed to support the same deck weight. Cable tension scales as 1/sag — halving the sag doubles the cable force. Real suspension bridges use sag/span ratios around 1:8 to 1:12 to balance cable cost (more sag = lower force = thinner cable) against tower height (more sag = taller towers needed to clear the deck above water/road). Golden Gate sag ratio: 1:11. Akashi-Kaikyō: 1:10.'
            ),

            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#a7f3d0', lineHeight: 1.65, marginTop: 8 } },
              h('strong', null, 'Catenary vs parabola: '),
              'A free cable under its own weight hangs in a CATENARY (cosh) shape. A cable supporting a uniformly distributed load (like a bridge deck) hangs in a PARABOLA. Real suspension cables are close to parabolic because the deck mass dominates the cable mass. The tool uses the parabolic approximation. Galileo first proposed a parabola; Huygens (1646, age 17) proved it was wrong for a free chain; Bernoulli + Leibniz + Huygens worked out the true catenary in 1691.'
            )
          );
        }

        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Bridge type depends on span, environment, material, and budget. Engineers pick the right form for the constraints — not a favorite.'
          ),
          (function() {
            // Arch thrust analyzer — parabolic arch under uniform load
            function archAnalyzer() {
              var aSpan = d.archSpan != null ? d.archSpan : 50;     // m
              var aRise = d.archRise != null ? d.archRise : 12;     // m
              var aLoad = d.archLoad != null ? d.archLoad : 25;     // kN/m uniform load over span
              // For a parabolic arch under uniform load over the span (NOT cable length):
              //   y(x) = (4*r/L²) x (L-x)
              //   The arch is entirely in compression along the centerline.
              //   Horizontal thrust H = w * L² / (8 * r)  (same formula as cable, but COMPRESSION)
              //   Vertical reaction V = w * L / 2 at each support
              //   Max axial force C_max = sqrt(H² + V²) at the SPRINGINGS (supports)
              //   Min axial force C_min = H at the CROWN
              //   The horizontal thrust pushes OUTWARD into the abutments
              var H = aLoad * aSpan * aSpan / (8 * aRise);
              var V = aLoad * aSpan / 2;
              var Cmax = Math.sqrt(H * H + V * V);
              var Cmin = H;
              var riseRatio = aRise / aSpan;
              var goodRatio = riseRatio >= 1/8 && riseRatio <= 1/2;

              function archSvg() {
                var svgW = 600, svgH = 220;
                var padL = 40, padR = 40, padT = 30, padB = 50;
                var plotW = svgW - padL - padR;
                var plotH = svgH - padT - padB;
                function tx(x) { return padL + (x / aSpan) * plotW; }
                // For arch, y is UP from springing. Map y=0 at base, y=aRise at top.
                function ty(y) { return padT + plotH - (y / Math.max(aRise, 1)) * plotH; }
                var pts = [];
                for (var i = 0; i <= 50; i++) {
                  var xx = (i / 50) * aSpan;
                  var yy = (4 * aRise / (aSpan * aSpan)) * xx * (aSpan - xx);
                  pts.push(tx(xx) + ',' + ty(yy));
                }
                return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'archTitle archDesc' },
                  h('title', { id: 'archTitle' }, 'Arch bridge thrust diagram'),
                  h('desc', { id: 'archDesc' }, 'A parabolic arch with span ' + aSpan + ' meters and rise ' + aRise + ' meters under uniform load. Horizontal thrust at each abutment is ' + H.toFixed(0) + ' kN per meter of bridge width. Maximum axial compression at supports is ' + Cmax.toFixed(0) + ' kN per meter.'),
                  // Ground line at top (deck-level baseline)
                  h('line', { x1: 0, y1: padT, x2: svgW, y2: padT, stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }),
                  // Roadway/deck across top
                  h('rect', { x: tx(0), y: padT - 4, width: plotW, height: 6, fill: '#475569' }),
                  // Distributed load arrows above
                  [0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map(function(t, i) {
                    var ax = tx(t * aSpan);
                    return h('g', { key: 'l' + i },
                      h('line', { x1: ax, y1: 8, x2: ax, y2: padT - 6, stroke: '#22c55e', strokeWidth: 1.5 }),
                      h('polygon', { points: (ax - 3) + ',' + (padT - 9) + ' ' + (ax + 3) + ',' + (padT - 9) + ' ' + ax + ',' + (padT - 3), fill: '#22c55e' })
                    );
                  }),
                  h('text', { x: svgW / 2, y: 18, textAnchor: 'middle', fill: '#86efac', fontSize: 10 }, 'Uniform load ' + aLoad + ' kN/m'),
                  // Arch curve
                  h('polyline', { points: pts.join(' '), fill: 'none', stroke: '#3b82f6', strokeWidth: 3 }),
                  // Spandrel hangers / columns
                  [0.15, 0.35, 0.5, 0.65, 0.85].map(function(t, i) {
                    var xx = t * aSpan;
                    var yy = (4 * aRise / (aSpan * aSpan)) * xx * (aSpan - xx);
                    return h('line', { key: 'sp' + i, x1: tx(xx), y1: padT, x2: tx(xx), y2: ty(yy), stroke: '#64748b', strokeWidth: 1 });
                  }),
                  // Abutment / ground at base
                  h('rect', { x: 0, y: ty(0), width: tx(0) + 4, height: padB, fill: '#475569' }),
                  h('rect', { x: tx(aSpan) - 4, y: ty(0), width: svgW - tx(aSpan), height: padB, fill: '#475569' }),
                  h('text', { x: 18, y: ty(0) + 30, fill: '#cbd5e1', fontSize: 10 }, 'Abutment'),
                  h('text', { x: svgW - 60, y: ty(0) + 30, fill: '#cbd5e1', fontSize: 10 }, 'Abutment'),
                  // Force arrows at left springing (showing outward thrust H and upward V)
                  (function() {
                    var fx = tx(0), fy = ty(0);
                    var scale = 30;
                    var Hpx = Math.min(scale, scale * (H / Cmax));
                    var Vpx = Math.min(scale, scale * (V / Cmax));
                    return h('g', null,
                      // Horizontal H (outward, into abutment)
                      h('line', { x1: fx, y1: fy, x2: fx - Hpx, y2: fy, stroke: '#ef4444', strokeWidth: 2 }),
                      h('polygon', { points: (fx - Hpx) + ',' + (fy - 3) + ' ' + (fx - Hpx) + ',' + (fy + 3) + ' ' + (fx - Hpx - 5) + ',' + fy, fill: '#ef4444' }),
                      h('text', { x: fx - Hpx - 10, y: fy + 4, textAnchor: 'end', fill: '#fca5a5', fontSize: 10, fontWeight: 700 }, 'H (out)'),
                      // Vertical V (downward into ground)
                      h('line', { x1: fx, y1: fy, x2: fx, y2: fy + Vpx, stroke: '#3b82f6', strokeWidth: 2 }),
                      h('polygon', { points: (fx - 3) + ',' + (fy + Vpx) + ' ' + (fx + 3) + ',' + (fy + Vpx) + ' ' + fx + ',' + (fy + Vpx + 5), fill: '#3b82f6' }),
                      h('text', { x: fx + 6, y: fy + Vpx + 4, fill: '#93c5fd', fontSize: 10, fontWeight: 700 }, 'V')
                    );
                  })()
                );
              }

              return h('div', null,
                h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Arches do the opposite of suspension bridges: a load on top pushes the curve OUTWARD into the abutments rather than pulling them inward. The entire arch is in compression — there is no tension in a true arch under design loads. This is why stone arches work (stone is excellent in compression). The horizontal thrust at the supports is the design challenge — abutments must resist it without sliding or tipping.'
                ),
                archSvg(),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12, marginBottom: 12 } },
                  [
                    { label: 'Span (m)', value: aSpan, min: 10, max: 200, step: 5, key: 'archSpan' },
                    { label: 'Rise (m)', value: aRise, min: 3, max: 100, step: 1, key: 'archRise' },
                    { label: 'Deck load (kN/m)', value: aLoad, min: 5, max: 100, step: 5, key: 'archLoad' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                        h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                        h('span', { style: { fontSize: 13, color: AMBER, fontWeight: 800 } }, s.value)
                      ),
                      h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                        onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                        'aria-label': s.label,
                        style: { width: '100%', accentColor: AMBER }
                      })
                    );
                  })
                ),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 } },
                  [
                    { label: 'Horizontal thrust H', value: H.toFixed(0) + ' kN/m', color: '#fca5a5', sub: 'pushes outward — abutments must resist' },
                    { label: 'Vertical reaction V', value: V.toFixed(0) + ' kN/m', color: '#93c5fd', sub: 'half the deck load each side' },
                    { label: 'Max compression', value: Cmax.toFixed(0) + ' kN/m', color: '#fbbf24', sub: 'at the springings (supports)' },
                    { label: 'Min compression', value: Cmin.toFixed(0) + ' kN/m', color: '#86efac', sub: 'at the crown (top of arch)' },
                    { label: 'Rise/span ratio', value: '1:' + (1 / riseRatio).toFixed(1), color: goodRatio ? '#86efac' : '#fca5a5', sub: goodRatio ? 'within typical 1/2 to 1/8 range' : 'outside typical range' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                      h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label),
                      h('div', { style: { fontSize: 14, fontWeight: 800, color: s.color, marginTop: 2 } }, s.value),
                      h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, s.sub)
                    );
                  })
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.3)', fontSize: 11.5, color: '#bfdbfe', lineHeight: 1.65 } },
                  h('strong', null, 'Why arches stand for centuries: '),
                  'Compression is what stone, brick, and concrete handle best. Roman arch bridges from 100 BCE are still in use because: (1) they are entirely in compression, no tension anywhere; (2) the abutments resist the horizontal thrust through sheer mass; (3) compressive forces have no fatigue limit in the way that bending or tension do — stone under steady compression effectively lasts forever.'
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: '#fde68a', lineHeight: 1.65, marginTop: 8 } },
                  h('strong', null, 'Why high thrust matters: '),
                  'Flatter arches (smaller rise) need much more horizontal thrust. Roman arches were typically semicircular (rise = half the span) for that reason — the thrust is moderate and easily resisted. Modern shallow steel arches need enormous engineered abutments anchored into rock, or tied-arch designs where horizontal tie rods at deck level absorb the thrust (so the abutments only resist vertical load). Sydney Harbour Bridge and New River Gorge are tied-arch designs.'
                )
              );
            }
            // Beam bending analyzer — simply-supported beam with central point load
            function beamAnalyzer() {
              var bSpan = d.beamSpan != null ? d.beamSpan : 10;        // m
              var bDepth = d.beamDepth != null ? d.beamDepth : 600;    // mm
              var bWidth = d.beamWidth != null ? d.beamWidth : 300;    // mm
              var bLoad = d.beamLoad != null ? d.beamLoad : 50;        // kN (point load at center)
              var bLoadPos = d.beamLoadPos != null ? d.beamLoadPos : 0.5;  // 0..1 along span
              var bMatId = d.beamMatId || 'steel';
              var bMat = MATERIALS.find(function(m) { return m.id === bMatId; }) || MATERIALS[3];

              // Reactions for simply-supported beam with point load P at fractional position p
              var L = bSpan; // m
              var P = bLoad; // kN
              var p = bLoadPos;
              var R_A = P * (1 - p); // left support reaction (kN)
              var R_B = P * p;       // right support reaction (kN)
              // Max bending moment occurs at the load point
              var M_max = R_A * (p * L); // kN·m
              // Max shear is the larger of R_A, R_B
              var V_max = Math.max(R_A, R_B);

              // Section properties for rectangular cross-section
              // I = bh³ / 12 (in mm⁴)
              var I_mm4 = bWidth * Math.pow(bDepth, 3) / 12;
              var c_mm = bDepth / 2; // distance to extreme fiber
              var S_mm3 = I_mm4 / c_mm; // section modulus
              // Bending stress σ = M·c / I = M / S
              // M in kN·m → N·mm by ×10⁶
              var sigmaMax_MPa = (M_max * 1e6) / S_mm3;
              // Shear stress (simplified): τ = 1.5 × V / A for rectangular section
              var A_mm2 = bWidth * bDepth;
              var tauMax_MPa = (1.5 * V_max * 1000) / A_mm2;
              // Deflection (max, for point load not at center: complicated; use central load formula as approximation)
              // δ = P·L³ / (48·E·I) for point load at center
              var E_MPa = bMat.modulusGPa * 1000;
              var delta_mm = (P * 1000 * Math.pow(L * 1000, 3)) / (48 * E_MPa * I_mm4);
              // Safety factor
              var sf_yield = bMat.yieldMPa / sigmaMax_MPa;
              var deflectionRatio = (L * 1000) / Math.max(0.001, delta_mm); // span / deflection
              // Typical code limit: span/360 for live load deflection on a floor; span/240 for some bridges
              var deflectionOK = deflectionRatio >= 240;
              var status = sf_yield >= 2 && deflectionOK ? 'good' : sf_yield >= 1 ? 'concern' : 'failed';

              // Visualization
              function beamSvg() {
                var svgW = 600, svgH = 240;
                var padX = 50, padY = 80;
                var plotW = svgW - 2 * padX;
                var baseY = svgH - 60;
                function tx(x) { return padX + (x / L) * plotW; }
                // Compute deflected shape (parabolic-ish approximation)
                var deflPts = [];
                for (var i = 0; i <= 50; i++) {
                  var xf = i / 50; // 0..1
                  var xMm = xf * L * 1000;
                  // Deflection at point x for simply-supported beam with central point load:
                  // For x ≤ L/2: y = (P·x / 48·E·I) × (3·L² − 4·x²)
                  // Use as approximation regardless of load position
                  var defl_at_x_mm = (P * 1000 * xMm) / (48 * E_MPa * I_mm4) * (3 * Math.pow(L * 1000, 2) - 4 * Math.pow(xMm, 2));
                  if (xMm > L * 500) defl_at_x_mm = (P * 1000 * (L * 1000 - xMm)) / (48 * E_MPa * I_mm4) * (3 * Math.pow(L * 1000, 2) - 4 * Math.pow(L * 1000 - xMm, 2));
                  // Scale defl_mm to pixels (exaggerate visualization)
                  var deflPx = Math.min(35, defl_at_x_mm / 8); // visual scale
                  deflPts.push(tx(xf * L) + ',' + (baseY + deflPx));
                }

                return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'beamTitle beamDesc' },
                  h('title', { id: 'beamTitle' }, 'Beam bending diagram'),
                  h('desc', { id: 'beamDesc' }, 'A simply-supported beam of length ' + L + ' meters with a ' + P + ' kN load applied. Max bending stress ' + sigmaMax_MPa.toFixed(0) + ' MPa, max deflection ' + delta_mm.toFixed(1) + ' mm.'),
                  // Ground / supports
                  h('line', { x1: 0, y1: baseY + 20, x2: svgW, y2: baseY + 20, stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }),
                  // Pin support at left (triangle)
                  h('polygon', { points: (tx(0) - 8) + ',' + (baseY + 20) + ' ' + (tx(0) + 8) + ',' + (baseY + 20) + ' ' + tx(0) + ',' + baseY, fill: '#94a3b8' }),
                  // Roller support at right (triangle with circle)
                  h('polygon', { points: (tx(L) - 8) + ',' + (baseY + 18) + ' ' + (tx(L) + 8) + ',' + (baseY + 18) + ' ' + tx(L) + ',' + (baseY + 2), fill: '#94a3b8' }),
                  h('circle', { cx: tx(L), cy: baseY + 20, r: 2, fill: '#475569' }),
                  // Original beam (light gray ghost)
                  h('rect', { x: tx(0), y: baseY - 4, width: plotW, height: 8, fill: 'none', stroke: '#475569', strokeWidth: 0.5, strokeDasharray: '2 2' }),
                  // Deflected beam
                  h('polyline', { points: deflPts.join(' '), fill: 'none', stroke: '#fbbf24', strokeWidth: 5, strokeLinecap: 'round' }),
                  // Load arrow at load point
                  (function() {
                    var lx = tx(p * L);
                    return h('g', null,
                      h('line', { x1: lx, y1: 15, x2: lx, y2: baseY - 5, stroke: '#22c55e', strokeWidth: 2 }),
                      h('polygon', { points: (lx - 4) + ',' + (baseY - 8) + ' ' + (lx + 4) + ',' + (baseY - 8) + ' ' + lx + ',' + (baseY - 1), fill: '#22c55e' }),
                      h('text', { x: lx, y: 12, textAnchor: 'middle', fill: '#86efac', fontSize: 11, fontWeight: 700 }, P + ' kN')
                    );
                  })(),
                  // Reaction arrows (upward)
                  (function() {
                    var ax = tx(0), bx = tx(L);
                    return h('g', null,
                      h('line', { x1: ax, y1: baseY + 35, x2: ax, y2: baseY + 22, stroke: '#3b82f6', strokeWidth: 2 }),
                      h('polygon', { points: (ax - 3) + ',' + (baseY + 25) + ' ' + (ax + 3) + ',' + (baseY + 25) + ' ' + ax + ',' + (baseY + 20), fill: '#3b82f6' }),
                      h('text', { x: ax, y: baseY + 50, textAnchor: 'middle', fill: '#93c5fd', fontSize: 10, fontWeight: 700 }, 'R_A = ' + R_A.toFixed(0)),
                      h('line', { x1: bx, y1: baseY + 35, x2: bx, y2: baseY + 22, stroke: '#3b82f6', strokeWidth: 2 }),
                      h('polygon', { points: (bx - 3) + ',' + (baseY + 25) + ' ' + (bx + 3) + ',' + (baseY + 25) + ' ' + bx + ',' + (baseY + 20), fill: '#3b82f6' }),
                      h('text', { x: bx, y: baseY + 50, textAnchor: 'middle', fill: '#93c5fd', fontSize: 10, fontWeight: 700 }, 'R_B = ' + R_B.toFixed(0))
                    );
                  })(),
                  // Span label
                  h('text', { x: svgW / 2, y: 35, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 11 }, 'Simply-supported beam, span = ' + L + ' m')
                );
              }

              return h('div', null,
                h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Most modern bridges over short spans (< 80 m) are simply beams sitting on two supports. The internal forces are very different from trusses: members carry BENDING + SHEAR (not just tension/compression along their axis). The bottom of a loaded beam stretches; the top compresses. This is the simplest structural analysis, the foundation of every other one.'
                ),
                beamSvg(),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12, marginBottom: 12 } },
                  [
                    { label: 'Span (m)', value: bSpan, min: 2, max: 30, step: 1, key: 'beamSpan' },
                    { label: 'Depth (mm)', value: bDepth, min: 200, max: 1500, step: 50, key: 'beamDepth' },
                    { label: 'Width (mm)', value: bWidth, min: 100, max: 600, step: 25, key: 'beamWidth' },
                    { label: 'Point load (kN)', value: bLoad, min: 10, max: 500, step: 10, key: 'beamLoad' },
                    { label: 'Load position (0..1)', value: bLoadPos, min: 0.05, max: 0.95, step: 0.05, key: 'beamLoadPos' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                        h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                        h('span', { style: { fontSize: 13, color: AMBER, fontWeight: 800 } }, typeof s.value === 'number' && s.step < 1 ? s.value.toFixed(2) : s.value)
                      ),
                      h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                        onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                        'aria-label': s.label,
                        style: { width: '100%', accentColor: AMBER }
                      })
                    );
                  })
                ),
                // Material selector
                h('div', { style: { marginBottom: 12 } },
                  h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6 } }, 'Material'),
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                    MATERIALS.map(function(m) {
                      var active = bMatId === m.id;
                      return h('button', { key: m.id,
                        onClick: function() { upd({ beamMatId: m.id }); },
                        style: { padding: '5px 10px', borderRadius: 6, background: active ? 'rgba(245,158,11,0.25)' : '#0f172a', border: '1px solid ' + (active ? AMBER : '#334155'), color: active ? '#fbbf24' : '#cbd5e1', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                      }, m.name.split(' ')[0]);
                    })
                  )
                ),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 } },
                  [
                    { label: 'R_A (left)', value: R_A.toFixed(1) + ' kN', color: '#93c5fd', sub: 'farther load = larger' },
                    { label: 'R_B (right)', value: R_B.toFixed(1) + ' kN', color: '#93c5fd', sub: '' },
                    { label: 'Max moment M', value: M_max.toFixed(1) + ' kN·m', color: '#fbbf24', sub: 'at load point' },
                    { label: 'Max shear V', value: V_max.toFixed(1) + ' kN', color: '#fbbf24', sub: 'at support' },
                    { label: 'Bending stress σ', value: sigmaMax_MPa.toFixed(0) + ' MPa', color: sf_yield >= 2 ? '#86efac' : sf_yield >= 1 ? '#fbbf24' : '#fca5a5', sub: 'yield ' + bMat.yieldMPa + ' MPa' },
                    { label: 'Shear stress τ', value: tauMax_MPa.toFixed(1) + ' MPa', color: '#c7d2fe', sub: '1.5V/A for rectangle' },
                    { label: 'Section mod. S', value: (S_mm3 / 1000).toFixed(0) + ' ×10³ mm³', color: '#94a3b8', sub: 'I/c, larger = stiffer' },
                    { label: 'Deflection δ', value: delta_mm.toFixed(1) + ' mm', color: deflectionOK ? '#86efac' : '#fbbf24', sub: 'L/' + (deflectionRatio).toFixed(0) }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                      h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label),
                      h('div', { style: { fontSize: 14, fontWeight: 800, color: s.color, marginTop: 2 } }, s.value),
                      h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, s.sub)
                    );
                  })
                ),
                h('div', { style: { padding: 12, borderRadius: 10, background: status === 'good' ? 'rgba(34,197,94,0.10)' : status === 'concern' ? 'rgba(245,158,11,0.10)' : 'rgba(220,38,38,0.10)', border: '1px solid', borderColor: status === 'good' ? 'rgba(34,197,94,0.3)' : status === 'concern' ? 'rgba(245,158,11,0.3)' : 'rgba(220,38,38,0.3)' } },
                  h('div', { style: { fontSize: 13, fontWeight: 900, color: status === 'good' ? '#86efac' : status === 'concern' ? '#fbbf24' : '#fca5a5', marginBottom: 6 } },
                    status === 'good' ? '✓ Passes: yield SF ' + sf_yield.toFixed(2) + ', deflection L/' + deflectionRatio.toFixed(0) + ' (≥ L/240)' :
                    status === 'concern' ? '⚠ Marginal: yield SF ' + sf_yield.toFixed(2) + (deflectionOK ? '' : ', deflection L/' + deflectionRatio.toFixed(0) + ' is excessive') :
                    '✗ FAILS bending stress (SF ' + sf_yield.toFixed(2) + ' < 1)'
                  ),
                  h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.6 } },
                    status === 'good' ? 'Real bridge codes typically require L/240 to L/800 for deflection. SF 2+ for bending is standard.' :
                    'Increase depth (which scales I as d³ — most effective lever). Or use a stronger material. Or reduce span. Doubling depth = 8× the bending stiffness.'
                  )
                ),
                h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Why I-beams: '),
                  'Bending stress is highest at the top + bottom (far from the neutral axis), zero at the center. So material in the middle of the cross-section is wasted. The I-shape concentrates material as top + bottom flanges where it carries the bending, leaving a thin web in the middle that handles only shear. Same depth gets 3-5× more bending capacity than a solid rectangle of equal weight. This insight (Galileo, 1638) is the foundation of every steel beam ever made.'
                )
              );
            }

            // Cable-stayed analyzer — multiple stays going directly from tower to deck
            function cableStayedAnalyzer() {
              var csSpan = d.csSpan != null ? d.csSpan : 600;        // main span (m)
              var csTowerH = d.csTowerH != null ? d.csTowerH : 150;  // tower height above deck (m)
              var csNStays = d.csNStays != null ? d.csNStays : 12;   // stays per side
              var csLoad = d.csLoad != null ? d.csLoad : 30;         // kN/m deck load
              // Each stay carries the deck load over its tributary length.
              // Tributary length = (csSpan / 2) / csNStays per stay.
              // Stay angle to horizontal at the j-th stay (from tower): θ_j = atan2(towerH, j * tribLen)
              // Vertical force in each stay = tributary length × load
              // Total stay axial force F = V / sin(θ)
              var halfSpan = csSpan / 2;
              var tribLen = halfSpan / csNStays;
              var Vperstay = tribLen * csLoad;
              // Compute stays from nearest-to-tower (steepest) to farthest (shallowest)
              var stays = [];
              for (var i = 1; i <= csNStays; i++) {
                var horizDist = i * tribLen;
                var angle = Math.atan2(csTowerH, horizDist) * 180 / Math.PI;
                var force = Vperstay / Math.sin(Math.atan2(csTowerH, horizDist));
                stays.push({ horizDist: horizDist, angle: angle, force: force });
              }
              var fMin = Math.min.apply(null, stays.map(function(s) { return s.force; }));
              var fMax = Math.max.apply(null, stays.map(function(s) { return s.force; }));
              // Tower compression = sum of vertical components from one side's stays = csNStays × Vperstay
              var towerComp = csNStays * Vperstay;
              // Tower bending = sum of horizontal components from stays (if symmetric, this cancels)
              // For asymmetric loading, tower would bend.

              function csSvg() {
                var svgW = 600, svgH = 240;
                var padL = 40, padR = 40, padT = 30, padB = 50;
                var plotW = svgW - padL - padR;
                var plotH = svgH - padT - padB;
                function tx(x) { return padL + (x / csSpan) * plotW; }
                var deckY = padT + plotH - 20;
                // Find tower center (single tower at midspan for simplicity — visual only)
                var twrX = padL + plotW / 2;
                var twrTop = deckY - (csTowerH / 200) * plotH;
                var stayMaxLen = Math.sqrt(halfSpan * halfSpan + csTowerH * csTowerH);
                return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'csTitle csDesc' },
                  h('title', { id: 'csTitle' }, 'Cable-stayed bridge diagram'),
                  h('desc', { id: 'csDesc' }, 'A cable-stayed bridge with span ' + csSpan + ' meters, tower height ' + csTowerH + ' meters, and ' + csNStays + ' stays per side. Each stay carries part of the deck load directly to the tower.'),
                  // Ground
                  h('line', { x1: 0, y1: deckY + 16, x2: svgW, y2: deckY + 16, stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }),
                  // Tower
                  h('rect', { x: twrX - 5, y: twrTop, width: 10, height: deckY - twrTop, fill: '#475569' }),
                  // Stays (left side + right side)
                  stays.map(function(s, i) {
                    var leftEndX = twrX - tx(s.horizDist) + tx(0);
                    var rightEndX = twrX + tx(s.horizDist) - tx(0);
                    var leftClampedX = Math.max(padL + 5, leftEndX);
                    var rightClampedX = Math.min(svgW - padR - 5, rightEndX);
                    var color = s.force >= fMin + (fMax - fMin) * 0.7 ? '#fbbf24' : '#94a3b8';
                    var sw = 1 + (s.force / fMax) * 2;
                    return h('g', { key: 'stay' + i },
                      h('line', { x1: twrX, y1: twrTop + 5 + i * 2, x2: leftClampedX, y2: deckY - 2, stroke: color, strokeWidth: sw, opacity: 0.85 }),
                      h('line', { x1: twrX, y1: twrTop + 5 + i * 2, x2: rightClampedX, y2: deckY - 2, stroke: color, strokeWidth: sw, opacity: 0.85 })
                    );
                  }),
                  // Deck
                  h('rect', { x: padL, y: deckY, width: plotW, height: 6, fill: '#94a3b8' }),
                  // Pylons at deck ends
                  h('rect', { x: padL - 4, y: deckY, width: 8, height: 16, fill: '#475569' }),
                  h('rect', { x: svgW - padR - 4, y: deckY, width: 8, height: 16, fill: '#475569' }),
                  // Distributed load arrows
                  [0.1, 0.25, 0.4, 0.6, 0.75, 0.9].map(function(t, i) {
                    var ax = padL + t * plotW;
                    return h('g', { key: 'l' + i },
                      h('line', { x1: ax, y1: 5, x2: ax, y2: deckY - 4, stroke: '#22c55e', strokeWidth: 1, opacity: 0.6 }),
                      h('polygon', { points: (ax - 2) + ',' + (deckY - 6) + ' ' + (ax + 2) + ',' + (deckY - 6) + ' ' + ax + ',' + (deckY - 2), fill: '#22c55e', opacity: 0.6 })
                    );
                  }),
                  h('text', { x: 8, y: 20, fill: '#86efac', fontSize: 10 }, 'Load: ' + csLoad + ' kN/m'),
                  h('text', { x: twrX, y: twrTop - 5, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }, 'Tower'),
                  h('text', { x: svgW - 8, y: deckY - 6, textAnchor: 'end', fill: '#fde68a', fontSize: 10 }, 'Stays in tension')
                );
              }

              return h('div', null,
                h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'A cable-stayed bridge uses cables running directly from a tower (or pylons) to the deck — unlike a suspension bridge, which has a main draped cable + vertical hangers. Each stay is in tension; the tower is in compression. Faster + cheaper to build than a suspension bridge of comparable span, and noticeably stiffer in wind. The Millau Viaduct, Russky Bridge, + Sundial Bridge are all cable-stayed.'
                ),
                csSvg(),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12, marginBottom: 12 } },
                  [
                    { label: 'Main span (m)', value: csSpan, min: 100, max: 1500, step: 50, key: 'csSpan' },
                    { label: 'Tower height (m)', value: csTowerH, min: 30, max: 350, step: 10, key: 'csTowerH' },
                    { label: 'Stays per side', value: csNStays, min: 4, max: 30, step: 1, key: 'csNStays' },
                    { label: 'Deck load (kN/m)', value: csLoad, min: 5, max: 80, step: 5, key: 'csLoad' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                        h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                        h('span', { style: { fontSize: 13, color: AMBER, fontWeight: 800 } }, s.value)
                      ),
                      h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                        onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                        'aria-label': s.label,
                        style: { width: '100%', accentColor: AMBER }
                      })
                    );
                  })
                ),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 10 } },
                  [
                    { label: 'Max stay force (longest)', value: fMax.toFixed(0) + ' kN', color: '#fbbf24', sub: 'shallowest, farthest from tower' },
                    { label: 'Min stay force (steepest)', value: fMin.toFixed(0) + ' kN', color: '#86efac', sub: 'closest to tower' },
                    { label: 'Tributary per stay', value: tribLen.toFixed(1) + ' m', color: '#c7d2fe', sub: 'deck length per stay' },
                    { label: 'Tower compression', value: towerComp.toFixed(0) + ' kN', color: '#fca5a5', sub: 'sum of all stay verticals' },
                    { label: 'Avg stay angle (to horiz.)', value: (stays.reduce(function(a, s) { return a + s.angle; }, 0) / stays.length).toFixed(0) + '°', color: '#94a3b8', sub: 'steeper = lower force' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                      h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label),
                      h('div', { style: { fontSize: 14, fontWeight: 800, color: s.color, marginTop: 2 } }, s.value),
                      h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, s.sub)
                    );
                  })
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Cable-stayed vs suspension — the trade: '),
                  'A SUSPENSION bridge has ONE main cable carrying everything; very long spans possible but the deck is more flexible. A CABLE-STAYED bridge has many independent stays each handling its tributary load; stiffer in wind, easier to build (no main-cable spinning + no separate anchorages — the tower handles compression directly), but maximum economic span is ~1,100 m (vs ~2,000 m for suspension). Most new long bridges built since 1990 are cable-stayed.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: '#fde68a', lineHeight: 1.65 } },
                  h('strong', null, 'Why longer stays carry MORE force: '),
                  'A stay near the tower is steep (mostly vertical). It carries its tributary load mostly along its axis with a small horizontal component. A stay farther from the tower is shallow (mostly horizontal). To support the same vertical load with a low angle, it needs a HUGE total tension force. Hence the longest stays at the far ends of the span are the most heavily loaded — usually visibly thicker on real bridges.'
                )
              );
            }

            return BRIDGE_TYPES.map(function(t) {
            var includeSuspensionAnalyzer = t.id === 'suspension';
            var includeArchAnalyzer = t.id === 'arch';
            var includeBeamAnalyzer = t.id === 'beam';
            var includeCableStayedAnalyzer = t.id === 'cable_stayed';
            return h('div', { key: t.id, style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 } },
                h('span', { style: { fontSize: 28 }, 'aria-hidden': 'true' }, t.icon),
                h('h3', { style: { margin: 0, color: '#fbbf24', fontSize: 18 } }, t.name),
                h('span', { style: { fontSize: 11, color: '#94a3b8' } }, 'Typical span: ' + t.span)
              ),
              h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, t.desc),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 } },
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)' } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Strength'),
                  h('div', { style: { fontSize: 12, color: '#dcfce7', lineHeight: 1.55 } }, t.strength)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)' } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Weakness'),
                  h('div', { style: { fontSize: 12, color: '#fee2e2', lineHeight: 1.55 } }, t.weakness)
                )
              ),
              h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: includeSuspensionAnalyzer ? 12 : 0 } },
                h('strong', null, 'Examples: '), t.examples
              ),
              includeSuspensionAnalyzer ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', borderLeft: '3px solid ' + AMBER, marginTop: 8 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, '⌣ Interactive catenary cable analyzer'),
                suspensionAnalyzer()
              ) : null,
              includeArchAnalyzer ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', borderLeft: '3px solid ' + AMBER, marginTop: 8 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, '∩ Interactive arch thrust analyzer'),
                archAnalyzer()
              ) : null,
              includeBeamAnalyzer ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', borderLeft: '3px solid ' + AMBER, marginTop: 8 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, '═ Interactive beam bending analyzer'),
                beamAnalyzer()
              ) : null,
              includeCableStayedAnalyzer ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', borderLeft: '3px solid ' + AMBER, marginTop: 8 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, '✦ Interactive cable-stayed analyzer'),
                cableStayedAnalyzer()
              ) : null
            );
          });
          })(),
          pedestrianAccessibleBridgesSection(),
          movableBridgesSection(),
          tunnelsAndUnderwaterSection()
        );

        function tunnelsAndUnderwaterSection() {
          var TUN = [
            { id: 'cutcover', name: 'Cut-and-cover tunnel', emoji: '⛏️', era: '1850s-present',
              how: 'The simplest tunnel method. Dig an open trench, build the tunnel structure inside it (cast-in-place concrete box, precast segments, or arched masonry), then backfill on top to restore the surface. Used for shallow tunnels (typically <15 m deep), urban subway lines, utility tunnels, and stormwater systems. Most early subways (London Metropolitan 1863, NYC IRT 1904) were built cut-and-cover.',
              forces: 'The completed tunnel box must resist VERTICAL load from the fill + traffic above (compressive arch action or beam-bending in the roof slab) + LATERAL earth pressure on the side walls + uplift if groundwater rises. Box-section reinforced-concrete construction is standard. The trench walls during construction need temporary support (sheet piles, soldier-pile + lagging, slurry walls).',
              limit: 'Massively disruptive to the surface during construction. Cut-and-cover for the Boston Big Dig (1991-2007) caused decades of construction nightmare + cost overruns from ~$2.6B to ~$15B. Used today only when (a) the depth is shallow + the surface is available, (b) no alternative method works (cross-streets, soft river fill, very large bore diameters).'
            },
            { id: 'tbm', name: 'Tunnel Boring Machine (TBM)', emoji: '⚙️', era: '1850s-present',
              how: 'A massive cylindrical machine that bores through rock or soil, lining the tunnel behind it with precast concrete segments. The cutterhead at the front rotates with hardened picks or disk cutters; excavated spoil is conveyed back through the machine + out of the tunnel. Modern TBMs are 5-20 m diameter, 100-200 m long with all support equipment, and can advance 10-40 m per day depending on geology. The Channel Tunnel (1988-1994) used 11 TBMs to bore three parallel 50-km tunnels under the English Channel.',
              forces: 'The tunnel lining (typically precast concrete bolted segments forming a circular ring) carries hoop compression from the surrounding earth + groundwater pressure. The cutterhead must resist the reaction torque + thrust from cutting forces. Shield-type TBMs (slurry or Earth-Pressure-Balance, EPB) pressurize the cutter chamber against soil + water inflow.',
              limit: 'TBMs are expensive ($30-100M+ for a major one) + slow to set up. Once excavating, they are essentially one-way: turning around or backing up is impractical. They CAN encounter unexpected ground conditions (boulders, hard inclusions, fault zones, voids) that stop progress for weeks. The Bertha TBM in Seattle (Highway 99 tunnel, 2013-2017) stalled for 2 years after damaging its seals on an unidentified pipe; recovery was a major engineering project.'
            },
            { id: 'natm', name: 'New Austrian Tunneling Method (NATM)', emoji: '⛰️', era: '1960s-present',
              how: 'A philosophy + technique for rock tunneling that uses the surrounding rock mass itself as part of the structural support. Excavate small sections; immediately install shotcrete + rock bolts to support the rock + let it reach equilibrium; monitor deformation; install final concrete lining only after the rock stabilizes. NATM allows non-circular tunnel cross-sections (useful for road tunnels with wide flat ceilings) + works well in moderately weak rock. The Mont Blanc Tunnel + Gotthard Base Tunnel + many alpine + urban road tunnels use NATM.',
              forces: 'NATM treats the rock as an active structural element rather than a passive load. The shotcrete layer (a thin reinforced-concrete shell) carries some load while the rock arches its own load to either side. Rock bolts (steel rods grouted into drilled holes) tie loose rock to deeper stable rock. Continuous monitoring (extensometers, convergence pins) tracks deformation; deformation matches predicted curve = the system is stable.',
              limit: 'NATM requires highly skilled geotechnical + structural engineering. Misreading the rock behavior or being too aggressive with excavation sequencing can cause catastrophic collapse. The 1994 Heathrow Express tunnel collapse during construction was attributed to NATM misapplication. The technique is excellent when done right + dangerous when done wrong.'
            },
            { id: 'immersed', name: 'Immersed-tube tunnel', emoji: '🌊', era: '1910s-present',
              how: 'A submerged tunnel built in segments at a dry dock + then floated, sunk, and connected end-to-end in a trench dredged into the riverbed or seabed. Each segment is a reinforced-concrete or steel box ~100-200 m long, 30-50 m wide, with end bulkheads sealed shut for floating. After positioning, the bulkheads are removed underwater + the segments connected with watertight joints. Used for Boston Sumner + Callahan + Ted Williams tunnels, the BART Transbay Tube (San Francisco), the Øresund Tunnel (Denmark-Sweden), and others.',
              forces: 'When submerged + connected, the tunnel is BUOYANT (most of its weight is concrete + air-filled rooms inside; surrounding water is denser overall). It must be ballasted to stay seated on the trench bottom + protected from uplift by an earth cover of typically 1-3 m of fill. Joints between segments are flexible to accommodate seismic + thermal motion.',
              limit: 'Limited to relatively shallow depths (rare immersed tunnels exceed 60 m below water surface). Requires a clear dredgeable trench, which is hard in rocky seabeds + impossible in deep oceans. The Channel Tunnel could NOT have been built as immersed-tube because the geology + currents made dredging impractical; that\'s why TBMs were used.'
            },
            { id: 'subsea', name: 'Subsea bored tunnel', emoji: '🏊', era: '1990s-present',
              how: 'A tunnel bored deep below the seabed using TBMs, often used for major sub-aqueous crossings. Distinct from immersed tube — the bored subsea tunnel goes well below the seabed in deep rock, while immersed tube sits on or in the seabed surface. The Channel Tunnel is the most famous example (50 km long, 75 m below seabed in chalk marl). The Eiksund Tunnel (Norway, 2008) is 287 m deep at its lowest point. The undersea portion of the Tokyo Bay Aqua-Line combines an immersed tube section (Kawasaki side) with a bored tunnel section (Kisarazu side).',
              forces: 'Hydrostatic water pressure at depth is enormous (~10 bar per 100 m of water depth above the tunnel). The tunnel lining must resist this through hoop compression. Groundwater inflow can be catastrophic; subsea tunnels use heavy waterproofing + drainage systems + sometimes inert-gas pressurization during construction.',
              limit: 'Geology is everything. If the rock turns out softer or more fractured than predicted, projects can stall for years. The Channel Tunnel\'s chalk marl was ideal; many less-favorable proposed sub-aqueous crossings (Bering Strait, Atlantic Tunnel) face huge geological + economic obstacles that make them currently impractical.'
            },
            { id: 'ventilation', name: 'Ventilation + fire safety', emoji: '🌬️', era: 'Universal',
              how: 'Long road tunnels must remove vehicle exhaust + smoke. The two main approaches: LONGITUDINAL VENTILATION (jet fans push air along the tunnel axis, exhaust at portals — economic + works for tunnels <3 km) + TRANSVERSE VENTILATION (parallel supply + exhaust ducts run the tunnel length, with vertical shafts to surface vent buildings — necessary for long tunnels + tunnels with poor portal positions). Fire safety adds smoke-extraction systems, fire-resistant linings (typically 2-4 hour rating), emergency egress passages, cross-passage doors between parallel tunnels, deluge sprinklers in critical zones, and water-mist suppression.',
              forces: 'Ventilation must handle peak vehicle-emission scenarios + worst-case fire scenarios. Modern road-tunnel fire-design temperatures reach 1300°C (the RWS curve, Rijkswaterstaat, Dutch standard) — far hotter than typical building fires (~600°C cellulosic). Concrete linings spall explosively at these temperatures unless designed with polypropylene fibers that melt out + relieve vapor pressure.',
              limit: 'Tunnel fires have killed dozens to hundreds at once when ventilation + suppression failed: Mont Blanc Tunnel 1999 (39 dead), Tauern Tunnel 1999 (12 dead), Gotthard 2001 (11 dead). Modern fire-safety design for new tunnels is far more conservative; retrofitting old tunnels to current standards is costly + sometimes impossible. The Boring Company\'s LA + Las Vegas tunnels have notably weaker fire safety than transit-tunnel standards — a tradeoff that has drawn engineering criticism.'
            },
            { id: 'channel', name: 'Channel Tunnel — the big one', emoji: '🚇', era: '1988-1994',
              how: 'Three parallel tunnels (two running, one service) connecting the UK + France under the English Channel. Total length 50.45 km, with 38 km under sea. Bored using 11 TBMs (one for each tunnel section, working from both ends + meeting in the middle). The geology — Cenomanian chalk marl — was extremely favorable: soft enough to bore quickly, impermeable enough that water inflow was manageable. The two TBMs that met in the middle in 1990 achieved an alignment accuracy of better than 30 cm laterally + 60 cm vertically over the 38 km undersea distance.',
              forces: 'Each running tunnel is ~7.6 m internal diameter, lined with 500-mm precast reinforced-concrete segments. Service tunnel is 4.8 m. The tunnels run 30-65 m below seabed; total length submerged about 38 km. Trains run at 160 km/h (passenger Eurostar) or 140 km/h (Le Shuttle vehicle trains). Loading from the trains + temperature changes + tunnel curvature all considered in fatigue design.',
              limit: 'The Channel Tunnel\'s cost overran ~80% (£4.65B vs £2.6B original); the original Eurotunnel company went through several restructurings before becoming financially viable. The 1996 + 2008 + 2015 + 2022 fires all damaged sections of tunnel that required months of repair + reduced capacity. Recovery is slow because the tunnel cannot easily be closed for maintenance without disrupting major international transit.'
            },
            { id: 'limits', name: 'When NOT to tunnel', emoji: '🚫', era: 'Engineering judgment',
              how: 'Tunnels are extraordinarily expensive + slow to build. A 5-km road tunnel typically costs $500M-2B+. Construction usually takes 5-10+ years. Lifetime maintenance costs (ventilation, pumping, fire safety, lining inspection) far exceed those of a bridge of equivalent capacity. Tunnels also have HIGHER fatality rates per vehicle-mile than equivalent surface roads (fires + crashes + emergency egress challenges).',
              forces: 'The right structure depends on the obstacle. SHORT spans (< 200 m) over land or shallow water: bridge almost always wins. MEDIUM spans (200 m-2 km) over deep water or busy navigation: bridge or immersed tube. LONG crossings (>5 km) under deep water or through mountains: tunnels are sometimes the only option. ALWAYS NEEDED: when surface land must be preserved (urban districts, ecological + cultural protection), tunnels become attractive despite their cost.',
              limit: 'The honest engineering answer: tunnels are often built for political or aesthetic reasons rather than cost-optimal ones. The Big Dig + the now-permanent Embarcadero Freeway removal + the Sydney Harbour Tunnel parallel to its bridge all have advocates who consider them money well spent. They are large interventions in the urban fabric + deserve scrutiny on the same terms as bridges — beauty, utility, public benefit, distributional equity. Tunnels are not automatically "better" because they are underground.'
            }
          ];
          var sel = d.selectedTunnel || 'cutcover';
          var topic = TUN.find(function(t) { return t.id === sel; }) || TUN[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '🚇 Tunnels + underwater bridges'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'Tunnels are the siblings of bridges in transportation engineering — used to cross when going OVER won\'t work. They share many fundamentals (forces, fatigue, foundations) + have their own demanding specifics (ventilation, fire safety, hydrostatic pressure, ground behavior). Understanding tunnels alongside bridges gives the full picture of how engineers move people + freight across geographical obstacles.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              TUN.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedTunnel: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 2 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic' } }, 'Era: ' + topic.era),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'How it works'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.how)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Forces + design logic'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.forces)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #ef4444' } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Honest limits'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.limit)
              )
            )
          );
        }

        function movableBridgesSection() {
          var MOV = [
            { id: 'bascule', name: 'Bascule (drawbridge)', emoji: '⚖️',
              how: 'A bascule bridge has one or two leaves that pivot upward around a horizontal axis at the abutment. The deck is balanced by a heavy counterweight on the opposite side of the pivot, so the actual lifting force required is small. The Tower Bridge in London (1894) is the most famous example; the Pelham Bay Park Bridge + the McCarter Highway lift bridges in the US are more typical municipal examples. Double-leaf bascules meet in the middle when closed; single-leaf bascules pivot from one end.',
              forces: 'When raised, the deck cantilevers from the pivot, putting enormous bending moment on the trunnion (pivot bearing). The counterweight is sized to exactly balance the deck weight, so the gear motor only fights friction + wind + ice. Modern bascules use anti-friction roller bearings; older bridges used plain bronze sleeve bearings that required regular lubrication.',
              fail: 'Counterweight failure is the main concern. If a counterweight pin shears or its support cracks, the deck either crashes down (if more than half-open) or flies open uncontrollably (if less than half-open). The 1988 Sgt. Daniel Faulkner Memorial Bridge counterweight failure in Philadelphia destroyed the lifting machinery + closed the bridge for months. Modern bascule design requires redundant counterweight retention + emergency hand-cranks.'
            },
            { id: 'swing', name: 'Swing bridge', emoji: '🔄',
              how: 'A swing bridge rotates horizontally around a central pivot pier (or sometimes an asymmetric pivot near one end). When closed, it spans the channel; when open, it sits parallel to the channel, allowing boats through. Swing bridges were the dominant movable type in the 19th century; the Steel Bridge in Portland Oregon (1912) + the Sault Ste Marie railroad bridge are classic surviving examples. Most railroad movable bridges over navigable rivers are swing bridges.',
              forces: 'When closed, the swing bridge acts as a continuous beam over the pivot + two end supports. When open, it cantilevers from the pivot pier in BOTH directions (the deck on both sides of the pivot). This puts heavy load on the central pier; the pier itself is usually a massive masonry or concrete structure carrying the bridge weight + traffic load + the rotational mechanism (a big circular bearing or a "rim-bearing" track).',
              fail: 'Swing bridges are vulnerable to BARGE STRIKES because the central pier sits in the navigation channel, exactly where boats are passing close by. The 1993 Big Bayou Canot rail disaster in Alabama (Amtrak Sunset Limited derailed after a barge struck the bridge approaches in fog, 47 dead) is the deadliest US railroad disaster in 50 years. Modern navigation regulations + pier fenders are partial answers; replacement with vertical-lift or bascule designs is increasingly common.'
            },
            { id: 'lift', name: 'Vertical lift bridge', emoji: '⬆️',
              how: 'A vertical lift bridge has a deck that rises straight up between two tall towers, raised by cables + counterweights at each tower. The deck remains horizontal throughout the lift; only its elevation changes. The Aerial Lift Bridge in Duluth Minnesota (1929, the city\'s iconic landmark) and the Arthur Kill Vertical Lift Bridge between Staten Island + New Jersey (1959, the world\'s longest vertical-lift span at 558 ft) are well-known US examples. Lift bridges work well where the navigation channel is wide (no central pier wanted) + the air-draft requirement is moderate (not so tall that the lift towers become unreasonable).',
              forces: 'The lift towers experience the full weight of the deck PLUS the counterweights (suspended at the tower tops). The cables are huge — typically 6-8 cables per corner, each rated for many tons. Cable inspection + replacement is a major maintenance item; cables stretch over time + must be re-tensioned. Wind loading on a raised deck is significant (much larger sail area than the closed configuration).',
              fail: 'Cable failure is the dominant catastrophic risk. The Mianus River Bridge in Connecticut (1983) failed because of pin failure in a suspended span, not because of lift operation, but the lesson generalizes: hidden corrosion in heavily-loaded steel connections is hard to detect. Modern lift bridges require ultrasonic + acoustic monitoring of cables + pins. Vertical lift bridges also accumulate ICE on the underside of the deck in winter, which can throw off the carefully-tuned counterweight balance + jam the mechanism.'
            },
            { id: 'retract', name: 'Retractable (rolling) bridge', emoji: '↩️',
              how: 'A retractable bridge slides horizontally along its own axis to clear the navigation channel, like a giant drawer. The Pegasus Bridge variant + the Inner Harbor Navigation Canal Bridge (New Orleans, demolished 2014) are examples. The Rolling Bridge in Paddington Basin London (Heatherwick, 2004) curls up into an octagon — a pedestrian-only sculptural example. Retractables are rare today because they require space for the deck to retract INTO, which is hard to find at most water crossings.',
              forces: 'When retracted, the bridge cantilevers from the abutment on one side — putting bending moment on the retracted-position support. The rolling track must be precisely aligned + level over its entire length; settlement or thermal expansion that moves the track even slightly can cause jamming. Hydraulic rams or rack-and-pinion drives provide motion.',
              fail: 'Retractable bridges are sensitive to debris in the rolling track. A fallen leaf or a piece of trash can stop a multi-ton bridge motion. Track ice in winter is a persistent problem. The mechanism wears more than a bascule or swing (more sliding contact area). Most retractable bridges built before 1950 have been replaced; the type is mostly a historical curiosity now.'
            },
            { id: 'transporter', name: 'Transporter bridge', emoji: '🚠',
              how: 'A transporter bridge is a permanent high-level truss span with a "gondola" suspended from a trolley that runs along the underside of the truss, carrying passengers + vehicles across the channel. The bridge itself never moves; only the gondola moves. Air clearance for shipping is provided by the bridge\'s permanent high deck, ~70+ meters above water. About 25 transporter bridges have ever been built worldwide; ~8 still operate (Newport UK, Middlesbrough UK, Rendsburg Germany, Osten Germany, Bizerte Tunisia, Buenos Aires Argentina, Bilbao Spain — the Vizcaya Bridge, UNESCO World Heritage Site).',
              forces: 'The high-level truss is essentially a long-span steel truss with a hanging trolley track on its underside. Loading is unusual: the moving gondola creates a CONCENTRATED moving load that sweeps the entire span. The truss is designed for this asymmetric loading + for the dynamic effects of acceleration + braking. Wind loading on the high truss is significant.',
              fail: 'Transporter bridges are slow + low-capacity. They carry maybe 5-10 cars at a time; a single round trip takes 5-10 minutes. They cannot scale to handle modern traffic. The reason most have been demolished or replaced is not failure — they simply could not move the volume of vehicles required as cities grew. Those that remain are usually preserved as heritage + tourist attractions.'
            },
            { id: 'submarine', name: 'Submersible (submerged-floating) bridges', emoji: '🌊',
              how: 'A submersible or "submerged floating tunnel" bridge is partially or fully underwater, supported by buoyancy + held in place by anchors or tension legs to the seabed (or hanging from pontoons floating on the surface). No examples are yet in service for full road traffic, but Norway has approved an SFT for the Sognefjord crossing (E39 coastal highway) — the world\'s first planned submerged floating bridge for highway use, estimated 2030s completion. China + Korea + Italy have also studied designs.',
              forces: 'The bridge experiences buoyancy (upward) + the weight of the tunnel + traffic load. Wave + current loads are the design driver — particularly the SLOW oscillation of long structures in waves (resonance). Earthquake response is complex (the structure moves with the surrounding water rather than with the seabed). The technology challenge is high; no SFT has been built at full road scale yet.',
              fail: 'The risks are real + not fully characterized. A sunken-tunnel rupture below the waterline is a fundamentally different evacuation scenario from a traditional bridge collapse. Fire + smoke trapping is a major concern. SFT designs include emergency-pump-out systems, redundant tunnel cells, and high-spec fire suppression — but the failure modes have not been tested at scale by operating examples.'
            },
            { id: 'pontoon', name: 'Floating (pontoon) bridge', emoji: '🛟',
              how: 'A floating bridge rests directly on the water — typically on hollow concrete pontoons connected to form a continuous deck. The pontoons are anchored to the lakebed by cables or piles. The Evergreen Point + Lacey V. Murrow bridges in Washington State (Lake Washington, Seattle) are the world\'s longest floating bridges. The Hood Canal Bridge has a movable section that opens for naval submarine traffic. Floating bridges work where the water is too deep or too soft-bottomed for conventional piers (Lake Washington is 200+ ft deep with mud bottom).',
              forces: 'The pontoons support the deck by buoyancy. Wind + waves are the design driver. Lake Washington bridges have storm-failure history: the original Lacey V. Murrow Bridge sank in a storm in 1990 (pontoons that had been opened for repair filled with water + lost buoyancy). The replacement design includes much more redundancy. Modern floating bridges are designed for 100-year storms + can withstand significant wave loading without losing buoyancy reserves.',
              fail: 'Floating bridges are vulnerable to over-wash (waves coming over the deck), tow-line failure (an unattended barge drifts into the bridge), and the slow-cumulative-damage of years of mild wave action. They also have a finite design life (~50-75 years for the pontoons) because concrete in continuous contact with water eventually deteriorates. Replacement is a major civic event.'
            }
          ];
          var sel = d.selectedMov || 'bascule';
          var topic = MOV.find(function(t) { return t.id === sel; }) || MOV[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '🚧 Movable + unusual bridge types'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'Most bridges are fixed structures. But where waterborne traffic must pass + a low fixed bridge would block tall ships, engineers have developed a whole family of movable + unusual bridge types. Each one is a specific solution to a specific geometric constraint, with its own forces, failure modes, and historical contexts.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              MOV.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedMov: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'How it works'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.how)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Forces + structural logic'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.forces)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #ef4444' } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Failure modes + history'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.fail)
              )
            )
          );
        }

        function pedestrianAccessibleBridgesSection() {
          var ACC = [
            { id: 'slope', name: 'Slope + grade', emoji: '⬆️',
              spec: 'Maximum running slope 1:20 (5%) for any pedestrian-only bridge per Public Right-of-Way Accessibility Guidelines (PROWAG). If a steeper grade is used (up to 1:12 / 8.3%), the bridge becomes a RAMP and must have handrails on both sides + level rest landings every 30 ft (9.1 m) of run + 5 ft × 5 ft (1.5 m) landings at top + bottom. Cross-slope (camber for drainage) max 1:48 (2%) anywhere a person walks or rolls.',
              why: 'A 1:20 slope is climbable by most ambulatory users + most manual wheelchair users without assistance. Beyond that, the energy cost rises sharply for wheelchair users + becomes impassable for many. People with mobility-related fatigue (MS, post-stroke, chronic pain, cardiovascular conditions) may exhaust on grades that seem trivial to others. The 1:48 cross-slope is critical: anything steeper makes a manual wheelchair veer downhill + makes uneven gait painful + risky.',
              gotcha: 'Many older "ADA-compliant" pedestrian bridges built in the 1990s-2000s have approach ramps at 1:12 with no rest landings. That technically met the early ADA Accessibility Guidelines but is exhausting + unsafe in practice. Modern best practice (since the 2010 ADA refresh + PROWAG 2023) is 1:20 wherever space allows, with 1:12 only as a last resort.'
            },
            { id: 'width', name: 'Clear width + passing zones', emoji: '↔️',
              spec: 'Minimum 5 ft (1.5 m) clear width on a pedestrian-only bridge, 8-10 ft (2.4-3 m) on a shared-use path (pedestrian + bicycle), 12-14 ft (3.7-4.3 m) for high-volume shared-use. Two wheelchairs MUST be able to pass; that requires 5 ft minimum. Add 6 in (15 cm) clear next to any handrail (people\'s knuckles + cane tips must not collide with the rail). Standing landings every 200 ft (60 m) on long bridges allow people to pause without obstructing traffic.',
              why: 'A wheelchair is ~28-32 in wide. Add a person walking the other direction. Add a guide dog. Add a kid on a scooter. Add an Olmsted-tradition wide pram. The minimum is calculated for typical use, NOT for events, fair days, or seasonal traffic. Building tight to the minimum saves cost today + creates a problem permanently.',
              gotcha: 'Snow + ice + fallen leaves shrink the effective width. In winter climates, plan widths that REMAIN compliant after typical snow accumulation + plowed-aside snow piles. The High Trestle Trail (Iowa) + the Big Four Bridge (Louisville) have winter-maintenance budgets that exceed initial-construction snow-loading estimates.'
            },
            { id: 'surface', name: 'Surface materials', emoji: '🛣️',
              spec: 'Stable, firm, slip-resistant in all weather. Static coefficient of friction (SCOF) ≥ 0.42 dry, ≥ 0.40 wet (more conservative figures than older codes; matches modern ADA + ANSI A137.1 guidance). Open-grate decks (steel grating, glued grit, etc.) must have openings < 0.5 in (13 mm) in the direction of travel — otherwise cane tips, wheelchair caster wheels + high heels can drop through. Joints + gaps less than 0.5 in wide + 0.25 in (6 mm) tall transitions max.',
              why: 'Slip + fall is the leading cause of pedestrian injury on bridges. People using canes + walkers have less recovery margin. People with low vision rely on cane tips for surface feedback; a metal grate can hide depth cues. Wood decking (popular on pedestrian bridges) loses grip when wet + grows algae unless treated.',
              gotcha: 'Polished metal grates LOOK industrial-chic in design renderings + are catastrophic in practice. Stamped concrete patterns can be slippery when wet. Cobblestone bridges (historic preservation) are essentially impossible for wheelchair users. Sometimes preservation + accessibility conflict, and there is no easy answer — but the question must be ASKED, not skipped.'
            },
            { id: 'wayfinding', name: 'Wayfinding + sensory cues', emoji: '🧭',
              spec: 'Tactile attention strips (detectable warnings) at both ends marking the bridge entry. Tactile direction indicators at decision points. High-contrast edge markings (typically luminance contrast ≥ 70%) along the deck edge + at rail transitions. Audio crossing signals at any traffic intersection at the bridge ends. Trail signage at 4-7 ft (1.2-2.1 m) height (the readable range for both standing + seated users), with sans-serif type, high contrast, simple icons.',
              why: 'A pedestrian bridge with no contrast + no signs is a hostile environment for blind + low-vision users, people with cognitive disabilities, kids, tourists, and anyone navigating in fog or low light. Tactile + auditory cues are not extras; they are the navigation system for users who cannot rely on visual cues.',
              gotcha: 'Designers sometimes treat sensory wayfinding as a checklist (one tactile strip, one sign, done). Useful wayfinding is SYSTEMIC — the strip means something only if a user trusts there will be one at every entry, every decision point, every danger zone. Inconsistency is almost worse than absence, because it teaches users not to rely on the cues at all.'
            },
            { id: 'rails', name: 'Handrails + guardrails', emoji: '🛡️',
              spec: 'Handrails 34-38 in (86-97 cm) high, continuous along the full length, returning to wall or post at both ends (no abrupt protruding endings — they catch sleeves, bags, leashes). Cross-section graspable, typically 1.25-2 in (32-51 mm) diameter, with 1.5 in (38 mm) clearance to any wall. Guardrail required where the deck is more than 30 in (76 cm) above the surrounding grade, ≥ 42 in (107 cm) high, with pickets spaced so a 4-in (10 cm) sphere cannot pass. For pedestrian bridges over busy roadways, anti-throw fencing extends ≥ 8 ft (2.4 m) above the deck.',
              why: 'Handrails support the body weight of people losing balance — common with vertigo, MS gait, vestibular conditions, low blood pressure, elderly users, kids. The 34-38 in height was set after extensive ergonomic studies for the most usable range across body sizes. The picket spacing prevents kids\' heads from getting stuck (an actual recurring injury before the 4 in standard).',
              gotcha: 'Some "sculptural" architectural handrails (cable rails, glass rails, very thin pipe rails) meet code BARELY + fail to give a confident grip to many users. A handrail you can\'t close your hand around isn\'t serving the user it\'s built for. Always test a handrail design with people who actually depend on handrails — not with able-bodied engineers + architects.'
            },
            { id: 'lighting', name: 'Lighting + visibility', emoji: '💡',
              spec: 'Average illuminance 0.5-1.0 footcandle (5-10 lux) on pedestrian-only bridges; 1.0-2.0 footcandles (10-20 lux) on shared-use paths; 2.0+ footcandles (20+ lux) at decision zones (entries, turns, transitions). Uniformity ratio (max:min) ≤ 4:1 to avoid bright-dark patches that defeat night-adapted vision. Color temperature 3000-4500 K for accurate visual perception. Light fixtures shielded against direct glare into pedestrians\' eyes.',
              why: 'Pedestrian bridges are heavily used at night (commutes, recreation, dog walks, exercise) + suffer high accident + assault rates when dark. Adequate uniform lighting reduces both falls + crime. Color temperature matters: very cool (>5000 K) light flattens contrast + worsens night vision for older users; very warm (<2700 K) makes signs hard to read at distance.',
              gotcha: 'Astronomical dark-sky rules + accessibility lighting standards CAN conflict. The honest answer is: priority pedestrian + bicycle bridges generally need the lighting; pure recreational trail bridges in remote areas can use lower levels + reflective wayfinding. Don\'t make every bridge a stadium + don\'t make every bridge a tomb.'
            },
            { id: 'rest', name: 'Rest stops + seating', emoji: '🪑',
              spec: 'Bench or rest area every 200 ft (60 m) on long pedestrian bridges, every 100 ft (30 m) on grades. Bench seat height 17-19 in (43-48 cm), back support, armrest on at least one side (helps users stand up). Clear floor area beside the bench for a wheelchair user to PAUSE next to a companion without leaving the path. Shade or wind shelter wherever climate justifies. Drinking fountain at trailheads (with both standing + accessible heights) is best practice on bridges > 1/4 mile.',
              why: 'A bridge that is technically accessible but offers no place to rest excludes users with limited stamina (cardiac, pulmonary, chronic-fatigue, post-injury rehab, elderly, pregnant). The bench every 200 ft turns "I can\'t cross that bridge" into "I can cross it with a stop." This is one of the lowest-cost + highest-impact accessibility additions to a bridge design.',
              gotcha: 'Many "iconic" pedestrian bridges (Brooklyn Bridge promenade, Manhattan Bridge walkway) have ZERO benches on the bridge itself, which excludes a significant population from using them. Retrofitting is structurally + politically hard. Build it in from day one.'
            },
            { id: 'highline', name: 'Case study: The High Line', emoji: '🌿',
              spec: '1.45 mile (2.3 km) elevated linear park in Manhattan, opened 2009-2014 in three phases. Reused an abandoned NY Central Railroad elevated viaduct. The deck is concrete plank with planter beds; ADA-compliant ramped access at multiple entry points; benches throughout. Annual visitation 8 million+, has driven $2+ billion in adjacent real estate investment.',
              why: 'Demonstrates what a "bridge as park" can do. Repurposes infrastructure that would otherwise be demolished. Has been HUGELY influential globally (Atlanta Beltline, Promenade Plantée Paris, Seoullo 7017 Seoul, the Lowline + others have followed). Showed that pedestrian-only elevated infrastructure can pay for itself + generate enormous social value.',
              gotcha: 'The High Line is also a textbook case study in INDUCED GENTRIFICATION. The neighborhoods it passes through (Chelsea, Hell\'s Kitchen, Hudson Yards) have seen rent + property values rise 300%+ since the project opened, displacing many longtime low-income residents. The bridge succeeded as architecture + as accessibility infrastructure + as a gentrification engine, all simultaneously. The High Line\'s designers are now publicly working on the Friends of the High Line equity programs to address this. Honest accessibility design considers WHO will still be in the neighborhood to use the bridge a decade later.'
            }
          ];
          var sel = d.selectedAcc || 'slope';
          var topic = ACC.find(function(t) { return t.id === sel; }) || ACC[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '♿ Pedestrian + accessible bridge design'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'A bridge that excludes people is half-built. Modern pedestrian + accessible bridge design is governed by the ADA Accessibility Guidelines, PROWAG (Public Right-of-Way Accessibility Guidelines, 2023), AASHTO\'s Guide for the Development of Bicycle Facilities, and (in many states) more stringent local codes. The goal is not "minimum compliance." The goal is a bridge ANYONE can use, comfortably, in all weather.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              ACC.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedAcc: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Spec'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.spec)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Why'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.why)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #ef4444' } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Common gotcha'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.gotcha)
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
              h('strong', null, 'The framing that matters: '),
              'Accessibility is not a special-needs accommodation. About 1 in 4 US adults has a disability (CDC 2024). Add older adults, pregnant women, parents with strollers, people pulling luggage, kids on scooters, bike commuters, and the temporary injuries everyone has — and "accessible" design serves a clear MAJORITY of users. The "able-bodied adult on foot" the older codes were written for is the minority case, not the standard case.'
            ),
            h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)', fontSize: 11.5, color: '#fca5a5', lineHeight: 1.65 } },
              h('strong', null, 'Test with the people who depend on it: '),
              'No accessibility design should ship without USER TESTING by people who actually use mobility devices, white canes, hearing aids, AAC devices. A design reviewed only by able-bodied engineers + architects will always miss something. The disability community has been clear for decades: "Nothing about us without us." Apply it to bridge design.'
            )
          );
        }
      }

      // ──────────────────────────────────────────────────────────────
      // MATERIALS
      // ──────────────────────────────────────────────────────────────
      function renderMaterials() {
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Every material has tradeoffs. Strength, weight, cost, durability, environmental impact. The right material depends on the structure and the context.'
          ),
          h('div', { style: { overflowX: 'auto', marginBottom: 14 } },
            h('table', { style: { width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 12 } },
              h('thead', null, h('tr', null,
                ['Material', 'Yield (MPa)', 'Density (kg/m³)', 'Modulus E (GPa)', 'Cost (rel.)'].map(function(c, i) {
                  return h('th', { key: i, style: { padding: 8, textAlign: 'left', background: '#1e293b', color: '#fbbf24', borderBottom: '2px solid ' + AMBER, fontSize: 11, fontWeight: 800 } }, c);
                })
              )),
              h('tbody', null,
                MATERIALS.map(function(m, i) {
                  return h('tr', { key: m.id, style: { background: i % 2 === 0 ? '#0f172a' : '#1e293b' } },
                    h('td', { style: { padding: 8, color: '#e2e8f0', fontWeight: 700 } }, m.name),
                    h('td', { style: { padding: 8, color: '#cbd5e1' } }, m.yieldMPa),
                    h('td', { style: { padding: 8, color: '#cbd5e1' } }, m.densityKgM3),
                    h('td', { style: { padding: 8, color: '#cbd5e1' } }, m.modulusGPa),
                    h('td', { style: { padding: 8, color: '#cbd5e1' } }, '$'.repeat(m.costRel))
                  );
                })
              )
            )
          ),
          MATERIALS.map(function(m) {
            return h('div', { key: m.id, style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, m.name),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65, marginBottom: 6 } }, m.desc),
              h('div', { style: { fontSize: 11.5, color: '#94a3b8', lineHeight: 1.55, fontStyle: 'italic' } },
                h('strong', null, 'Use: '), m.use
              )
            );
          }),
          sectionCard('Key terms',
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } },
              h('li', null, h('strong', null, 'Yield strength: '), 'Force per unit area at which a material starts to deform permanently. Above this, the material is damaged even after the load is removed. In MPa (megapascals = N/mm²).'),
              h('li', null, h('strong', null, 'Modulus of elasticity (E): '), 'How stiff the material is. Higher E = less deformation under the same force. Stress = E * strain. In GPa (gigapascals = 1000 MPa).'),
              h('li', null, h('strong', null, 'Density: '), 'Mass per unit volume. Determines self-weight of the structure. A heavy material requires bigger members to support its own weight before any external load.'),
              h('li', null, h('strong', null, 'Ductility: '), 'How much a material deforms before breaking. Ductile (steel) gives warning. Brittle (cast iron, stone) breaks suddenly.')
            )
          ),

          sectionCard('🔧 Repair + retrofit — extending bridge life',
            (function() {
              var TECHNIQUES = [
                { id: 'patch', name: 'Concrete patch repair', color: '#fbbf24',
                  what: 'Spalled or delaminated concrete is removed back to sound material, the rebar is cleaned, then new concrete (or modified mortar) is placed. Surface coatings may be added to slow future chloride penetration.',
                  when: 'Common after deicing-salt damage on northern bridges; localized impact damage; freeze-thaw deterioration.',
                  limits: 'Bond between old + new concrete is a recurring weak point. Repairs typically last 10-25 years before themselves needing repair. Surface coatings extend life but don\'t address rebar already corroding deeply.',
                  cost: 'Low-to-medium'
                },
                { id: 'cfrp', name: 'CFRP (carbon-fiber) strengthening', color: '#0ea5e9',
                  what: 'Carbon-fiber-reinforced polymer sheets or strips are epoxy-bonded to the outside of existing beams or columns. The CFRP adds tensile capacity without adding weight or removing material.',
                  when: 'When a bridge needs more capacity (heavier trucks, code update) but full replacement is impractical. Also for seismic retrofit of columns (wrapping in CFRP confines the concrete + dramatically improves ductility).',
                  limits: 'Bond can fail under fire (epoxy softens at ~80°C) — many designs add a fire-protective coating. Premium cost. UV degradation if exposed. Cannot help if the original member is severely corroded.',
                  cost: 'Medium-high'
                },
                { id: 'jacket', name: 'Steel + concrete jacketing', color: '#a855f7',
                  what: 'A new layer of steel plate or reinforced concrete is built around an existing column or pier. The jacket carries new load, confines the original section, dramatically increases capacity + ductility.',
                  when: 'Seismic retrofit (the most common reason — almost every pre-1971 California highway column has been jacketed). Bridge widening that puts new loads on old columns.',
                  limits: 'Increases column size, which may not fit. Adds weight (concrete jacket especially) — may need foundation upgrades too.',
                  cost: 'High'
                },
                { id: 'deck', name: 'Deck replacement', color: '#22c55e',
                  what: 'The bridge deck (the road surface + slab) is the most stressed + most exposed component. Many bridges last 100+ years by replacing the deck once or twice in their lifetime. Replaced under traffic in stages, or during a closure.',
                  when: 'Deck deterioration (cracking, spalling, rebar corrosion) typically appears at 30-50 years for unprotected decks; longer for epoxy-coated rebar or stainless steel. Replacement uses higher-spec materials than the original.',
                  limits: 'Major disruption. The substructure (piers, abutments) must be inspected + may need its own work during deck replacement.',
                  cost: 'High'
                },
                { id: 'cathodic', name: 'Cathodic protection', color: '#86efac',
                  what: 'A small electrical current is impressed across the concrete, making the rebar slightly negative — preventing the electrochemistry that causes corrosion. Either sacrificial anode (zinc strip wears out) or impressed-current (rectifier powered).',
                  when: 'Concrete bridges with active rebar corrosion that hasn\'t yet caused major spalling. Marine bridges especially. Common in Europe + the UK since the 1980s; increasingly used in US.',
                  limits: 'Requires monitoring + maintenance. Power supply or anode replacement on a cycle. Effective if installed before too much damage has occurred.',
                  cost: 'Medium'
                },
                { id: 'scour', name: 'Scour countermeasures', color: '#dc2626',
                  what: 'Riprap (large rocks placed around piers), sheet piles, concrete collars, deeper foundations, or stream-channel work to prevent flowing water from eroding soil from around bridge piers. Real-time scour monitoring sensors increasingly added.',
                  when: 'All bridges over water now require scour evaluation (FHWA 1995). Older bridges retrofitted with countermeasures as funding allows.',
                  limits: 'Riprap can wash out in extreme floods. Sheet piles + deeper foundations are expensive. Some bridges with chronic scour eventually need replacement.',
                  cost: 'Medium'
                },
                { id: 'replace', name: 'Full replacement', color: '#94a3b8',
                  what: 'When repair + retrofit are uneconomic or technically inadequate, the bridge is replaced. Often built alongside the existing structure (so traffic is maintained), then traffic is shifted + old bridge demolished.',
                  when: 'Severe structural deterioration; obsolete capacity (modern trucks much heavier than 1950s); functionally obsolete (lanes too narrow); damaged beyond repair (collision, flood, earthquake).',
                  limits: '5-10× the cost of major repair. Long construction time. Environmental + community impact.',
                  cost: 'Very high'
                }
              ];
              var sel = TECHNIQUES.find(function(t) { return t.id === d.selectedRepair; }) || TECHNIQUES[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'About 90% of bridge engineering work is on EXISTING bridges, not new ones. Repair + retrofit extend life at a fraction of replacement cost. The right intervention depends on what\'s deteriorating + how badly.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  TECHNIQUES.map(function(t) {
                    var active = (d.selectedRepair || TECHNIQUES[0].id) === t.id;
                    return h('button', { key: t.id,
                      onClick: function() { upd({ selectedRepair: t.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? t.color + '33' : '#1e293b', border: '1px solid ' + (active ? t.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' } },
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: sel.color } }, sel.name),
                    h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'Cost: ' + sel.cost)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How it works'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'When to use it'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.when)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(220,38,38,0.08)', borderLeft: '3px solid #dc2626' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Limits + honest caveats'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.limits)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                  h('strong', null, 'The US infrastructure picture: '),
                  'About 1 in 13 US bridges (~46,000 of 619,000) is in "poor" condition according to FHWA. Average bridge age is ~44 years; many were built in the 1950s-1970s federal highway expansion + are now reaching the end of their original design life. The 2021 Infrastructure Investment and Jobs Act allocated $40 billion specifically for bridge repair + replacement — the largest US bridge investment since 1956. Done well: substantial life-extension via repair + retrofit. Done poorly: replace-everything cycles that miss the opportunity to keep historic structures functioning longer.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Seismic retrofit success — the California program: '),
                  'After the 1971 San Fernando + 1989 Loma Prieta earthquakes, California undertook a massive bridge retrofit program. CFRP wrapping + steel jacketing + isolation bearings + restrainer cables added to thousands of pre-1971 bridges. The 1994 Northridge + 2014 South Napa earthquakes both showed that retrofitted bridges performed far better than non-retrofitted ones — many would have collapsed had the retrofit work not been done. One of the most successful infrastructure investments in US history.'
                )
              );
            })(),
            '#f59e0b'
          ),

          sectionCard('⚡ Prestressed concrete — concrete that never cracks',
            (function() {
              var compStress = d.preCompStress != null ? d.preCompStress : 10;  // MPa precompression
              var loadStress = d.preLoadStress != null ? d.preLoadStress : 8;     // MPa bending tension from load
              // Net tension at the bottom fiber = bending tension MINUS precompression
              var netStress = loadStress - compStress;
              var cracking = netStress > 3;  // concrete cracks at ~3 MPa tension
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Concrete is great in COMPRESSION but useless in TENSION — it cracks at about 3 MPa. Reinforced concrete adds steel rebar to handle tension, but the concrete still cracks (tiny cracks at "service" loads that don\'t affect strength but let water + chlorides reach the rebar over decades). PRESTRESSED concrete is different: high-strength steel tendons are tensioned + permanently compress the concrete BEFORE any external load. The concrete never sees tension under service loads → no cracks → much longer life.'
                ),

                // Visualization
                (function() {
                  var svgW = 600, svgH = 160;
                  var beamY = 70;
                  var beamH = 35;
                  // Show three states: rest (precompressed), under load (net tension or net compression)
                  return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'preTitle preDesc' },
                    h('title', { id: 'preTitle' }, 'Prestressed beam stress diagram'),
                    h('desc', { id: 'preDesc' }, 'A concrete beam with internal compression from prestressing tendons. Bending from external load adds tension at the bottom — but the precompression ' + (cracking ? 'is not enough to prevent cracking.' : 'cancels it, keeping the bottom in compression.')),
                    // Beam outline
                    h('rect', { x: 50, y: beamY, width: 500, height: beamH, fill: '#475569', stroke: '#cbd5e1', strokeWidth: 1 }),
                    // Tendons (steel cables inside)
                    [-5, 0, 5].map(function(dy, i) {
                      return h('line', { key: 't' + i, x1: 55, y1: beamY + beamH - 7 + dy, x2: 545, y2: beamY + beamH - 7 + dy, stroke: '#fbbf24', strokeWidth: 1.5 });
                    }),
                    // End anchors
                    h('rect', { x: 48, y: beamY - 3, width: 6, height: beamH + 6, fill: '#1e293b', stroke: '#94a3b8', strokeWidth: 1 }),
                    h('rect', { x: 546, y: beamY - 3, width: 6, height: beamH + 6, fill: '#1e293b', stroke: '#94a3b8', strokeWidth: 1 }),
                    // Compression arrows (inward at ends, from anchors)
                    h('polygon', { points: '40,90 50,86 50,94', fill: '#3b82f6' }),
                    h('polygon', { points: '560,90 550,86 550,94', fill: '#3b82f6' }),
                    h('text', { x: 30, y: 78, fill: '#93c5fd', fontSize: 10, fontWeight: 700 }, 'PC'),
                    h('text', { x: 565, y: 78, fill: '#93c5fd', fontSize: 10, fontWeight: 700 }, 'PC'),
                    // External load (downward arrow + spread)
                    [0.2, 0.4, 0.5, 0.6, 0.8].map(function(t, i) {
                      var lx = 50 + t * 500;
                      return h('g', { key: 'l' + i },
                        h('line', { x1: lx, y1: 30, x2: lx, y2: beamY - 4, stroke: '#22c55e', strokeWidth: 1.5 }),
                        h('polygon', { points: (lx - 2) + ',' + (beamY - 6) + ' ' + (lx + 2) + ',' + (beamY - 6) + ' ' + lx + ',' + (beamY - 1), fill: '#22c55e' })
                      );
                    }),
                    h('text', { x: 50 + 250, y: 20, textAnchor: 'middle', fill: '#86efac', fontSize: 11 }, 'External load (causes bending)'),
                    // Result label
                    h('rect', { x: 50, y: beamY + beamH + 6, width: 500, height: 16, fill: cracking ? '#7f1d1d' : '#14532d', rx: 2 }),
                    h('text', { x: 300, y: beamY + beamH + 18, textAnchor: 'middle', fill: '#fff', fontSize: 11, fontWeight: 800 },
                      cracking ? '✗ Bottom fiber in tension (' + netStress.toFixed(1) + ' MPa) — concrete cracks' : '✓ Bottom fiber in compression (' + Math.abs(netStress).toFixed(1) + ' MPa) — no cracks'
                    ),
                    // Net stress equation
                    h('text', { x: 300, y: 145, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 10, fontFamily: 'ui-monospace, monospace' }, 'Net = Load tension (' + loadStress + ') − Precompression (' + compStress + ') = ' + netStress + ' MPa')
                  );
                })(),

                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12, marginBottom: 12 } },
                  [
                    { label: 'Precompression from tendons (MPa)', value: compStress, min: 0, max: 25, step: 1, key: 'preCompStress' },
                    { label: 'Bending stress from external load (MPa)', value: loadStress, min: 0, max: 30, step: 1, key: 'preLoadStress' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                        h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                        h('span', { style: { fontSize: 13, color: AMBER, fontWeight: 800 } }, s.value)
                      ),
                      h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                        onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                        'aria-label': s.label,
                        style: { width: '100%', accentColor: AMBER }
                      })
                    );
                  })
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65, marginBottom: 8 } },
                  h('strong', null, 'Two methods of prestressing: '),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                    h('li', null, h('strong', null, 'Pre-tensioning: '), 'Tendons are tensioned BEFORE concrete is poured + before it cures. Once concrete hardens + bonds to the tendons, anchors are released; the tendons pull inward through friction. Used for FACTORY-MADE beams (highway girders, double-tees, hollow-core planks).'),
                    h('li', null, h('strong', null, 'Post-tensioning: '), 'Concrete is poured first WITH HOLLOW DUCTS through it. After curing, tendons are threaded through, tensioned hydraulically, and anchored at the ends. Used for IN-PLACE construction (bridges, slabs, dams, nuclear reactor containment).')
                  )
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65, marginBottom: 8 } },
                  h('strong', null, 'History: '),
                  'Eugène Freyssinet (France, 1928) + Gustave Magnel (Belgium, 1940s) developed prestressed concrete. The technique required high-strength steel wire (developed 1900-30) — earlier "low-carbon" steel relaxed under sustained load + lost the precompression. Now standard worldwide for medium-span bridges (30-200 m). The Confederation Bridge (Canada, 12.9 km of prestressed concrete) + most US highway overpasses are prestressed.'
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                  h('strong', null, 'Why this matters: '),
                  'A reinforced concrete beam cracks under service load → the cracks are tiny + don\'t reduce strength, but they let water + chloride ions reach the rebar → rebar corrosion is the #1 cause of premature concrete bridge deterioration. A prestressed beam stays in compression under service loads → no cracks → no chloride ingress → much longer life. Prestressed bridges often last 100+ years; reinforced concrete bridges often need major repair at 50-70.'
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65, marginTop: 8 } },
                  h('strong', null, 'Honest caveat — when prestressing fails: '),
                  'The Morandi Bridge (Genoa, Italy) collapsed in August 2018, killing 43. Built 1967 as a prestressed cable-stayed design with concrete-encased stays. Decades of corrosion ate the steel wires inside the concrete encasement — invisible from outside. The encasement (the very feature meant to protect the steel) prevented inspection from detecting the deterioration. Modern designs use replaceable stays + non-encased prestressing where possible.'
                )
              );
            })(),
            '#3b82f6'
          ),

          sectionCard('🏗️ Foundations + soil mechanics — what the bridge stands on',
            (function() {
              var SOILS = [
                { id: 'rock', name: 'Solid rock (bedrock)', bearingMPa: 10, color: '#475569',
                  desc: 'Granite, basalt, sound limestone. The strongest natural foundation. Allowable bearing 5-15 MPa (and much higher with engineered anchors).',
                  good: 'Tower bridges + heavy load points anchored into rock are the gold standard. Akashi-Kaikyō tower foundations are anchored 60 m into bedrock.',
                  watch: 'Weathered or fractured rock can be much weaker than fresh. Karst limestone has hidden voids. Always borehole-test, never assume.'
                },
                { id: 'gravel', name: 'Dense sand + gravel', bearingMPa: 0.5, color: '#a16207',
                  desc: 'Glacial outwash, well-graded compacted gravel. Allowable bearing typically 200-600 kPa.',
                  good: 'Good drainage, doesn\'t expand or shrink. Predictable behavior. Easy to compact.',
                  watch: 'Liquefies in earthquakes if saturated. The 1964 Niigata earthquake liquefied saturated sand under apartment buildings, tipping them over without collapse.'
                },
                { id: 'clay', name: 'Stiff clay', bearingMPa: 0.2, color: '#a3a3a3',
                  desc: 'Cohesive, fine-grained. Allowable bearing typically 100-300 kPa for stiff clay; much lower for soft clay.',
                  good: 'Low permeability — good for retaining walls. Cohesive (sticks together).',
                  watch: 'Settles for DECADES under load (consolidation). The Tower of Pisa\'s famous lean comes from differential consolidation in soft clay.'
                },
                { id: 'soft', name: 'Soft clay / silt', bearingMPa: 0.05, color: '#525252',
                  desc: 'Marine deposits, lake bed, recently-deposited mud. Allowable bearing 25-100 kPa.',
                  good: 'Few benefits — usually a problem soil. Common in coastal + river-delta regions where bridges are most needed.',
                  watch: 'Bearing capacity often inadequate for shallow foundations. Requires deep piles or ground improvement (vibroflotation, soil mixing, preloading). Boston\'s Big Dig + the Bay Area\'s reclaimed land are full of soft clays.'
                },
                { id: 'fill', name: 'Loose fill / made ground', bearingMPa: 0.05, color: '#737373',
                  desc: 'Man-made fill, demolition rubble, uncontrolled placement. Highly variable.',
                  good: '(Not a foundation material on its own. Always investigate + treat.)',
                  watch: 'Heterogeneous, may contain voids, decomposable materials (wood, plastic). Will settle unpredictably + can liquefy. Best practice: remove + replace with engineered fill or install deep piles to a competent layer below.'
                },
                { id: 'water', name: 'Underwater (river bed, ocean floor)', bearingMPa: 0.1, color: '#1e40af',
                  desc: 'Saturated sand, mud, or gravel. Bearing depends on the specific material.',
                  good: 'Modern caisson + cofferdam construction allows building below water. Many of the world\'s biggest bridges (Akashi-Kaikyō, Verrazzano, Tappan Zee) have underwater foundations.',
                  watch: 'SCOUR is the dominant risk. Flowing water erodes soil from around piers. The 1987 Schoharie Creek bridge collapse in New York (10 dead) was caused by scour during a flood. Modern bridges include scour countermeasures: riprap, sheet piles, monitoring instruments.'
                }
              ];
              var soilId = d.selectedSoil || 'gravel';
              var sel = SOILS.find(function(s) { return s.id === soilId; }) || SOILS[1];
              // Bridge load on foundation: estimate from current parameters
              var nLoads = (d.nBays || 4) - 1;
              var totalLoad = nLoads * (d.loadPerJoint || 50); // kN
              var reaction = totalLoad / 2; // kN per abutment
              // Required footing area (m²) = reaction (kN) / (allowable bearing in kPa)
              var allowable_kPa = sel.bearingMPa * 1000;
              var footingArea = reaction / allowable_kPa; // m²
              var footingSide = Math.sqrt(footingArea); // square footing
              var FOUNDATION_TYPES = [
                { name: 'Spread footing', use: 'Shallow, when good soil is within a few meters. Square or rectangular concrete pad spreads load.', cost: 'Cheap' },
                { name: 'Mat foundation', use: 'Large continuous slab for multiple columns or when load is too concentrated. Common for skyscrapers and large bridge piers.', cost: 'Medium' },
                { name: 'Driven piles', use: 'Steel or concrete columns hammered down to bearing layer. Sound was the warning bell of soundness for medieval pile driving — Venice is built on millions of wooden piles still functioning after 1500+ years.', cost: 'Medium-high' },
                { name: 'Drilled shafts (caissons)', use: 'Holes drilled to bearing layer + filled with reinforced concrete. Used where soils are too hard for driving but require deep foundation.', cost: 'High' },
                { name: 'Spread caisson', use: 'A large hollow box sunk into the soil + filled with concrete. Brooklyn Bridge caissons (1869-72) were among the first. Workers inside got "caisson disease" (decompression sickness) — the bridge cost many lives.', cost: 'Very high' }
              ];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Every bridge stands on something. The strongest member designed by the best engineer fails if the FOUNDATION does. The 1907 Quebec Bridge, 1967 Silver Bridge, 1987 Schoharie Creek, and many others are partly foundation/anchorage failures. Soil mechanics + foundation engineering are as important as the superstructure design.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  SOILS.map(function(s) {
                    var active = soilId === s.id;
                    return h('button', { key: s.id,
                      onClick: function() { upd({ selectedSoil: s.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? s.color + 'AA' : '#1e293b', border: '1px solid ' + (active ? s.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, s.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', borderLeft: '4px solid ' + sel.color, marginBottom: 12 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' } },
                    h('div', { style: { fontSize: 15, fontWeight: 800, color: '#e2e8f0' } }, sel.name),
                    h('div', { style: { fontSize: 12, color: '#fbbf24', fontWeight: 700 } }, 'Allowable bearing: ~' + (sel.bearingMPa < 1 ? (sel.bearingMPa * 1000).toFixed(0) + ' kPa' : sel.bearingMPa + ' MPa'))
                  ),
                  h('p', { style: { margin: '0 0 8px', fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 } }, sel.desc),
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 } },
                    h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.10)', borderLeft: '3px solid #22c55e' } },
                      h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Good for'),
                      h('div', { style: { fontSize: 11.5, color: '#dcfce7', lineHeight: 1.5 } }, sel.good)
                    ),
                    h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(220,38,38,0.10)', borderLeft: '3px solid #dc2626' } },
                      h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Watch out for'),
                      h('div', { style: { fontSize: 11.5, color: '#fee2e2', lineHeight: 1.5 } }, sel.watch)
                    )
                  )
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 12 } },
                  h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Your current bridge\'s required footing'),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } },
                    'Reaction at each support: ', h('strong', { style: { color: '#93c5fd' } }, reaction.toFixed(0) + ' kN'),
                    ' · On ', h('strong', { style: { color: '#fbbf24' } }, sel.name.toLowerCase()),
                    ' (bearing ' + (sel.bearingMPa < 1 ? (sel.bearingMPa * 1000).toFixed(0) + ' kPa' : sel.bearingMPa + ' MPa') + ') requires footing area ≈ ',
                    h('strong', { style: { color: '#fbbf24' } }, footingArea.toFixed(2) + ' m²'),
                    ' (or a square footing of ≈ ', h('strong', { style: { color: '#fbbf24' } }, footingSide.toFixed(1) + ' m'),
                    ' on each side).'
                  )
                ),
                sectionCard('Foundation types',
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
                    FOUNDATION_TYPES.map(function(f, i) {
                      return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155' } },
                        h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, f.name),
                        h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.55, marginBottom: 4 } }, f.use),
                        h('div', { style: { fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic' } }, 'Cost: ' + f.cost)
                      );
                    })
                  )
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: '#fde68a', lineHeight: 1.65, marginTop: 10 } },
                  h('strong', null, 'Why scour kills bridges: '),
                  'Flowing water erodes soil from around bridge piers. As scour deepens, the foundation loses bearing area. Eventually it tips or the pier sinks. Schoharie Creek (1987, NY) collapsed during a flood from scour. The 2001 Hatchie River bridge (Tennessee) failure also. About 60% of US bridge failures involve scour. Modern bridges include scour-monitoring instruments + countermeasures (riprap, sheet piles, deeper foundations). The 1995 Federal Highway Administration requires every bridge over water to have a scour evaluation.'
                )
              );
            })(),
            '#a16207'
          ),

          sectionCard('🌍 Sustainable bridge design + embodied carbon',
            (function() {
              // Embodied carbon per material (kg CO₂e per kg of material) — approximate, from Inventory of Carbon and Energy + EPDs
              var EC_DATA = {
                wood:     { kgCO2perKg: 0.43, recycle: '~80% reclaimed or burned for energy', durability: '50-100 yr w/ treatment + maintenance', note: 'Treated wood has higher EC; sustainably-managed forest wood has near-zero net EC over its lifetime (CO₂ sequestered while growing).' },
                stone:    { kgCO2perKg: 0.07, recycle: '~100% can be reused as crushed aggregate', durability: '500-2000+ yr', note: 'Lowest embodied carbon of any building material if quarried near use. But quarrying disturbs ecosystems + transport costs energy.' },
                iron:     { kgCO2perKg: 2.0,  recycle: '~75% recycled', durability: '50-100 yr', note: 'Cast iron is brittle + has been largely phased out for structural use. Lower embodied carbon than steel but worse mechanical properties.' },
                steel:    { kgCO2perKg: 1.99, recycle: '~88% recycled globally (highest of any material)', durability: '100-150+ yr', note: 'New steel production is carbon-intensive (most via blast furnace + coking coal). Recycled steel via electric-arc furnace cuts emissions by 70%+. "Green steel" via hydrogen is being deployed (HYBRIT in Sweden, ArcelorMittal in Spain).' },
                concrete: { kgCO2perKg: 0.13, recycle: '~30% recycled, mostly as aggregate', durability: '50-100 yr', note: 'Concrete itself has low embodied carbon per kg, but bridges use VAST amounts. Cement production alone is ~8% of global CO₂ emissions. Supplementary cementitious materials (fly ash, slag, calcined clay) cut this by 30-50%.' },
                composite:{ kgCO2perKg: 8.0,  recycle: '<10% recycled (hard to separate fibers + resin)', durability: '50-75 yr', note: 'High embodied carbon per kg + difficult end-of-life. But weight savings can reduce total material. Best for retrofits + specialty applications, not yet competitive for primary structure.' }
              };

              var mat = MATERIALS.find(function(m) { return m.id === d.materialId; }) || MATERIALS[3];
              var data = EC_DATA[mat.id] || { kgCO2perKg: 1.0, recycle: 'unknown', durability: 'unknown', note: '' };
              // Use current design's total mass to compute carbon footprint
              var areaM2 = d.crossSectionMm2 / 1e6;
              // Need analysis context — totalLen from analysis (already in renderBuild scope)
              // We're inside renderMaterials here, so use a generic estimate based on current d.span + d.nBays + d.height
              var n = d.nBays, a = d.span / n, totalLen = d.span + d.span * (n - 1) / n + n * d.height + 2 * n * Math.sqrt(a * a / 4 + d.height * d.height);
              var volumeM3 = totalLen * areaM2;
              var massKg = volumeM3 * mat.densityKgM3;
              var embCO2 = massKg * data.kgCO2perKg;
              // Compare to "average American annual emissions" of ~14 metric tons CO₂
              var equivPersonYears = embCO2 / 14000;
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Modern bridge design considers ENVIRONMENTAL cost alongside dollar cost. Cement is ~8% of global CO₂ emissions; steel ~7%. A typical bridge uses thousands of tons of these materials. Sustainable design = lower embodied carbon + longer life + end-of-life recyclability.'
                ),
                h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid #22c55e', marginBottom: 12 } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#86efac', marginBottom: 8 } }, 'Your current design: ' + mat.name),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 8 } },
                    [
                      { label: 'Mass', value: (massKg / 1000).toFixed(1) + ' metric tons', color: '#cbd5e1' },
                      { label: 'Embodied CO₂', value: (embCO2 / 1000).toFixed(2) + ' metric tons CO₂e', color: '#fca5a5' },
                      { label: '= person-years of emissions', value: equivPersonYears.toFixed(1) + ' US person-years', color: '#fbbf24' },
                      { label: 'EC factor', value: data.kgCO2perKg + ' kg CO₂e/kg', color: '#94a3b8' }
                    ].map(function(s, i) {
                      return h('div', { key: i, style: { padding: 6, borderRadius: 6, background: '#1e293b' } },
                        h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, s.label),
                        h('div', { style: { fontSize: 13, fontWeight: 800, color: s.color } }, s.value)
                      );
                    })
                  )
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 10 } },
                  h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 700 } }, 'End-of-life'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', marginBottom: 4 } }, h('strong', null, 'Recyclability: '), data.recycle),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', marginBottom: 4 } }, h('strong', null, 'Typical durability: '), data.durability),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.55, marginTop: 6 } }, data.note)
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                  h('strong', null, 'Sustainable design strategies: '),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                    h('li', null, h('strong', null, 'Optimize for the LIFETIME: '), 'A bridge that lasts 150 years has lower per-year carbon than one rebuilt at 60. Long-term durability planning matters.'),
                    h('li', null, h('strong', null, 'Use less material: '), 'High-strength steel + advanced cross-sections + optimized geometry can cut material 10-30% with no loss of capacity. The cost-optimizer in the Build tab is doing this.'),
                    h('li', null, h('strong', null, 'Recycled content: '), 'Specify minimum recycled steel content (typically 70-90% achievable). Replace 30-50% of cement with fly ash, slag, or calcined clay.'),
                    h('li', null, h('strong', null, 'Design for disassembly: '), 'Bolted + modular connections enable salvage at end of life. Older welded + rusted bridges get scrapped; modular ones get repurposed.'),
                    h('li', null, h('strong', null, 'Local sourcing: '), 'Transport adds embodied carbon. Sourcing materials within 500 km can cut total emissions 15-25%.')
                  )
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Why this matters now: '),
                  'Infrastructure construction accounts for ~25-30% of global emissions. The 1971 National Bridge Inspection Standards (post-Silver-Bridge) created a database showing about 1 in 13 US bridges is in poor condition; thousands need replacement in the next 20 years. The Infrastructure Investment and Jobs Act (2021) funds bridge replacement at scale. Done well: lower-carbon materials + longer service life. Done poorly: same emissions, repeating the same mistakes.'
                )
              );
            })(),
            '#22c55e'
          ),

          // Fatigue analysis — the failure mode that kills bridges over decades
          sectionCard('⏳ Fatigue — the slow killer of bridges',
            (function() {
              var stress = d.fatigueStressMPa != null ? d.fatigueStressMPa : 100;
              var cycles = d.fatigueCyclesPerDay != null ? d.fatigueCyclesPerDay : 5000;
              // Basquin's equation: σ^a × N = constant. For structural steel, slope a ≈ 3,
              // endurance limit σ_e ≈ 100-150 MPa at ~10^6 cycles for high-cycle fatigue.
              // S-N curve: at low stress (below endurance limit) N → infinity.
              var enduranceLimit = 100; // MPa for typical structural steel
              var Ncrit; // cycles to failure
              if (stress < enduranceLimit) {
                Ncrit = Infinity;
              } else {
                // Power law: N = (σ_e / σ)^a × 10^6
                Ncrit = Math.pow(enduranceLimit / stress, 3) * 1e6;
              }
              var daysToFail = Ncrit === Infinity ? Infinity : Ncrit / cycles;
              var yearsToFail = daysToFail === Infinity ? Infinity : daysToFail / 365;
              var status = Ncrit === Infinity ? 'infinite' : yearsToFail > 100 ? 'good' : yearsToFail > 50 ? 'okay' : yearsToFail > 20 ? 'concern' : 'short';

              // Build SVG S-N curve
              function snCurveSvg() {
                var svgW = 520, svgH = 220;
                var padL = 60, padR = 20, padT = 20, padB = 50;
                var plotW = svgW - padL - padR;
                var plotH = svgH - padT - padB;
                // X: log10(N) from 3 to 9. Y: stress from 0 to 300 MPa.
                function xOf(n) { return padL + (Math.log10(Math.max(1000, n)) - 3) / 6 * plotW; }
                function yOf(s) { return padT + (1 - s / 300) * plotH; }
                // S-N curve points
                var curvePts = [];
                for (var i = 0; i <= 100; i++) {
                  var logN = 3 + (i / 100) * 6;
                  var n = Math.pow(10, logN);
                  // σ = σ_e * (1e6 / N)^(1/a) for N > 1e6 use endurance limit floor
                  var s;
                  if (n >= 1e7) s = enduranceLimit;
                  else s = enduranceLimit * Math.pow(1e6 / n, 1/3);
                  if (s > 300) s = 300;
                  curvePts.push(xOf(n) + ',' + yOf(s));
                }
                // Current operating point
                var opX = stress < enduranceLimit ? xOf(1e9) : xOf(Ncrit);
                var opY = yOf(stress);
                return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'snTitle snDesc' },
                  h('title', { id: 'snTitle' }, 'S-N curve (stress vs cycles to failure)'),
                  h('desc', { id: 'snDesc' }, 'A logarithmic plot of cycle count on the x-axis vs stress amplitude on the y-axis. Operating at ' + stress + ' MPa, the predicted cycles to failure is ' + (Ncrit === Infinity ? 'infinite (below endurance limit)' : Ncrit.toExponential(2)) + '.'),
                  h('rect', { x: padL, y: padT, width: plotW, height: plotH, fill: '#0a0e1a', stroke: '#334155', strokeWidth: 1 }),
                  // Y axis ticks
                  [0, 50, 100, 150, 200, 250, 300].map(function(s) {
                    return h('g', { key: 'y' + s },
                      h('line', { x1: padL - 4, y1: yOf(s), x2: padL, y2: yOf(s), stroke: '#94a3b8' }),
                      h('text', { x: padL - 7, y: yOf(s) + 3, textAnchor: 'end', fill: '#94a3b8', fontSize: 10 }, s + ' MPa')
                    );
                  }),
                  // X axis ticks
                  [3, 4, 5, 6, 7, 8, 9].map(function(lp) {
                    var n = Math.pow(10, lp);
                    return h('g', { key: 'x' + lp },
                      h('line', { x1: xOf(n), y1: padT + plotH, x2: xOf(n), y2: padT + plotH + 4, stroke: '#94a3b8' }),
                      h('text', { x: xOf(n), y: padT + plotH + 14, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10 }, '10^' + lp)
                    );
                  }),
                  // S-N curve
                  h('polyline', { points: curvePts.join(' '), fill: 'none', stroke: AMBER, strokeWidth: 2 }),
                  // Endurance limit horizontal line
                  h('line', { x1: padL, y1: yOf(enduranceLimit), x2: padL + plotW, y2: yOf(enduranceLimit), stroke: '#86efac', strokeWidth: 1, strokeDasharray: '3 3' }),
                  h('text', { x: padL + plotW - 8, y: yOf(enduranceLimit) - 3, textAnchor: 'end', fill: '#86efac', fontSize: 10 }, 'endurance limit (~' + enduranceLimit + ' MPa)'),
                  // Operating point
                  h('circle', { cx: opX, cy: opY, r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 1.5 }),
                  h('text', { x: opX + 10, y: opY + 4, fill: '#fca5a5', fontSize: 11, fontWeight: 700 }, 'operating'),
                  // Axis labels
                  h('text', { x: padL + plotW / 2, y: svgH - 8, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 11 }, 'Cycles to failure (log scale)'),
                  h('text', { x: 14, y: padT + plotH / 2, transform: 'rotate(-90 14 ' + (padT + plotH / 2) + ')', textAnchor: 'middle', fill: '#cbd5e1', fontSize: 11 }, 'Stress amplitude')
                );
              }

              return h('div', null,
                h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'A bridge that handles its design load just fine on day one can still fail decades later from FATIGUE: tiny cracks that grow microscopically with every load cycle, until one final cycle propagates a crack to failure. Every truck crossing, every wind gust, every temperature swing is a cycle. A heavily-trafficked highway bridge sees 5,000-50,000 cycles per day; over 50 years that\'s ~10⁸-10⁹ cycles.'
                ),
                snCurveSvg(),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12, marginBottom: 12 } },
                  [
                    { label: 'Stress amplitude (MPa)', value: stress, min: 50, max: 250, step: 10, key: 'fatigueStressMPa' },
                    { label: 'Cycles per day', value: cycles, min: 100, max: 100000, step: 100, key: 'fatigueCyclesPerDay' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                        h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                        h('span', { style: { fontSize: 13, color: AMBER, fontWeight: 800 } }, s.value.toLocaleString())
                      ),
                      h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                        onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                        'aria-label': s.label,
                        style: { width: '100%', accentColor: AMBER }
                      })
                    );
                  })
                ),
                h('div', { style: { padding: 12, borderRadius: 10, background: status === 'infinite' ? 'rgba(34,197,94,0.15)' : status === 'good' ? 'rgba(34,197,94,0.10)' : status === 'okay' ? 'rgba(245,158,11,0.12)' : status === 'concern' ? 'rgba(245,158,11,0.18)' : 'rgba(220,38,38,0.15)', border: '1px solid', borderColor: status === 'infinite' ? 'rgba(34,197,94,0.4)' : status === 'good' ? 'rgba(34,197,94,0.3)' : status === 'okay' ? 'rgba(245,158,11,0.4)' : status === 'concern' ? 'rgba(245,158,11,0.5)' : 'rgba(220,38,38,0.4)' } },
                  h('div', { style: { fontSize: 14, fontWeight: 900, color: status === 'infinite' ? '#86efac' : status === 'good' ? '#86efac' : status === 'okay' ? '#fbbf24' : status === 'concern' ? '#fbbf24' : '#fca5a5', marginBottom: 6 } },
                    status === 'infinite' ? '✓ Below endurance limit — theoretically infinite cycles' :
                    status === 'good' ? '✓ Lifetime: ' + yearsToFail.toFixed(0) + ' years at ' + cycles.toLocaleString() + ' cycles/day' :
                    status === 'okay' ? '~ Lifetime: ' + yearsToFail.toFixed(0) + ' years' :
                    status === 'concern' ? '⚠ Lifetime: ' + yearsToFail.toFixed(0) + ' years — within typical bridge lifespan' :
                    '✗ Lifetime: ' + yearsToFail.toFixed(0) + ' years — well short of typical bridge lifespan'
                  ),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } },
                    'Cycles to failure: ' + (Ncrit === Infinity ? '∞' : Ncrit.toExponential(2))
                  )
                ),
                h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Endurance limit (steel only): '),
                  'Some steels have a special property — below a stress threshold (~100 MPa for typical structural steel), fatigue cracks essentially don\'t grow. This "endurance limit" lets steel bridges last centuries IF designed conservatively below it. Aluminum and most non-ferrous metals have NO endurance limit — they always fatigue eventually.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 11.5, color: '#fecaca', lineHeight: 1.65 } },
                  h('strong', null, 'Silver Bridge 1967 — fatigue + corrosion: '),
                  'One eyebar of the Silver Bridge (Ohio River) had a tiny 2.5 mm defect from manufacturing 40 years earlier. Stress-corrosion-cracking grew it to critical size over decades of traffic cycles. On December 15 1967 it snapped during rush hour; the bridge had no redundancy + the entire structure collapsed into the river. 46 dead. Led directly to the 1971 National Bridge Inspection Standards — every public bridge in the US now gets inspected every 2 years.'
                )
              );
            })(),
            AMBER
          ),
          extremeEnvironmentsSection(),
          shmAndInspectionSection()
        );

        function shmAndInspectionSection() {
          var SHM = [
            { id: 'visual', name: 'Visual inspection (NBIS)', emoji: '👁️',
              tech: 'A trained inspector physically examines every accessible surface of the bridge, recording observed defects (cracks, spalls, corrosion, deformation, scour, debris) with photographs + notes + sketches. Findings get rated on a 0-9 scale (Federal Highway Administration NBI rating: 9 = excellent, 0 = failed) for each major component (deck, superstructure, substructure, channel). The full inspection becomes part of the National Bridge Inventory. Frequency: every 24 months for typical bridges, more often for fracture-critical or substandard structures. The 1971 National Bridge Inspection Standards (NBIS) was enacted directly in response to the 1967 Silver Bridge collapse.',
              limit: 'Visual inspection only catches surface defects. Hidden corrosion inside steel members, internal voids in concrete, post-tensioning tendon failures, fatigue cracks beneath paint, and deterioration on the underside of decks all easily get missed. A 2008 FHWA study found that two different inspectors rating the same bridge often disagreed by 1-2 NBI grades. Inspection is necessary but not sufficient.'
            },
            { id: 'access', name: 'Hands-on access', emoji: '🪜',
              tech: 'Many bridge components are not viewable from the deck. Inspectors need physical access via: snooper trucks (cherry-picker booms hanging out over the side), rope-access teams (rappelling specialists from the deck edge), boats (under-bridge inspection of piers + abutments over water), underwater divers (for submerged piers + piles), confined-space teams (inside box girders + cells), and bucket trucks. Major fracture-critical bridges (where the failure of one member could collapse the structure) require hands-on close inspection of every weld + connection.',
              limit: 'Hands-on inspection is expensive, slow, and dangerous. Snooper-truck closures cost ~$10-50K per day in traffic disruption alone. Underwater diving on a cold turbid river is genuinely hazardous; inspector fatalities, while rare, do happen. Smaller agencies skip components they cannot afford to access, accepting the inspection gap.'
            },
            { id: 'drone', name: 'Drone-based inspection', emoji: '🛸',
              tech: 'Drones (UAVs) equipped with high-resolution cameras, thermal infrared, and lidar can survey bridge surfaces from positions inspectors cannot easily reach: the underside of deep girders, the tops of tall pylons, the soffits of long-span structures, and the cliff faces beneath arch bridges. Photogrammetry software reconstructs millimeter-accurate 3D models from drone-captured photos. AI-assisted defect detection (trained on crack + spall image datasets) can flag suspected defects for human review. The Minnesota DOT + several state agencies have integrated drones into routine inspection workflows since around 2018.',
              limit: 'Drones are now a useful supplement to visual inspection, NOT a replacement. They cannot strike-test concrete (sounding for delamination), cannot smell hot oil from a stressed bearing, cannot feel a vibration cycle that warns of impending fatigue. AI defect-detection works for the failures it was trained on; it misses categories not in the training data. Regulations + airspace rules + weather + battery life all constrain drone use.'
            },
            { id: 'sensor', name: 'Strain gauges + accelerometers', emoji: '📊',
              tech: 'Strain gauges (foil resistance or fiber-optic) glued to steel members measure tiny length changes (microstrains, parts per million) caused by load. Accelerometers measure vibration acceleration. Tilt meters, displacement transducers, temperature sensors round out the suite. Data is transmitted by wireless or fiber-optic cables to a data-acquisition system. A typical large bridge SHM installation has 100-500 sensors continuously logging data; some monitor for decades. The Tsing Ma Bridge (Hong Kong) has had ~800 sensors operating since opening in 1997.',
              limit: 'Sensors fail. The harshest environment for an electronic sensor is sometimes the harshest environment for the bridge itself (wet, cold, vibrating, salt-laden). Sensor lifespan is often shorter than bridge lifespan; replacing failed sensors mid-life is expensive. Wireless protocols change; data formats from a 1995 installation may not be readable by 2025 software. Maintaining the SHM system is its own ongoing engineering project.'
            },
            { id: 'fiber', name: 'Distributed fiber-optic sensing', emoji: '〰️',
              tech: 'A single optical fiber, glued or embedded along a structural member, becomes thousands of distributed sensors. Brillouin or Rayleigh scattering analysis of the light passing through can measure strain + temperature at every point along the fiber (typically 1 m spatial resolution, mm-strain accuracy). Distributed fiber sensing is now used to monitor cracks in long-span girders, post-tensioning duct integrity, pile foundation settlement, and tunnel deformation. The Stonecutters Bridge (Hong Kong) + Russky Bridge (Russia) have both used distributed fiber sensing extensively.',
              limit: 'Distributed sensing is data-rich; interpretation is hard. A single distributed fiber installation can generate gigabytes of data per day. Pattern recognition + machine learning are needed to extract actionable information from the noise. False alarms are common. The technology is mature but the analytical software + workflows are still maturing.'
            },
            { id: 'gpr', name: 'Ground-penetrating radar + ultrasonics', emoji: '📡',
              tech: 'Ground-penetrating radar (GPR) sends microwave pulses into concrete, listening for reflections from voids, rebar, post-tensioning ducts, and delaminated layers. Ultrasonic pulse-echo + impact-echo tests do the same with sound waves. Both produce sub-surface "B-scan" images showing internal defects without physical excavation. Magnetic flux leakage (MFL) testing of post-tensioning strands can detect broken wires inside ducts. Acoustic emission monitoring can listen for active crack growth in real time. These nondestructive testing (NDT) methods have largely replaced destructive coring for routine internal-condition assessment.',
              limit: 'NDT requires expertise to interpret. A GPR scan of a concrete deck looks like a noisy radar image; interpreting it correctly requires specific training + experience. False positives + false negatives both occur. NDT results should always be cross-checked against visual + physical evidence; treating them as oracle answers is a known way to make wrong calls.'
            },
            { id: 'genoa', name: 'When SHM fails — the Genoa case', emoji: '⚠️',
              tech: 'The Morandi Bridge in Genoa, Italy collapsed on August 14, 2018, killing 43 people. The bridge had been monitored, including with sensors. Prior structural studies had identified deterioration of the post-tensioning tendons. Yet the collapse came suddenly, with little public warning. Subsequent investigations revealed: (1) some sensors were broken + not replaced, (2) interpretation of the data was compartmentalized + no single team had the full picture, (3) ownership disputes between the operator + the government delayed repair work, (4) the FRACTURE-CRITICAL nature of the bridge (cable-stayed with very few redundant load paths) was not adequately accounted for in inspection rigor.',
              limit: 'SHM is not a substitute for judgment, redundancy, or accountability. A bridge with broken sensors + administrative paralysis is a bridge no SHM system can save. The lesson from Genoa is institutional + political, not technical. Italy has since passed legislation mandating SHM + clearer responsibility chains, but similar institutional fragmentation exists in many countries with aging infrastructure.'
            },
            { id: 'ml', name: 'AI + machine learning in inspection', emoji: '🤖',
              tech: 'Deep-learning models trained on hundreds of thousands of labeled bridge defect images can now identify cracks, spalls, corrosion, and other defects in drone footage at accuracies approaching expert human inspectors for common defect types. Vision-transformer models + foundation models have improved sensitivity since ~2022. Several state DOTs are piloting AI-augmented inspection pipelines: drones capture imagery; an AI pre-screens for suspected defects; human inspectors review flagged regions in detail. This can multiply inspector productivity 5-10× for routine surface-defect scanning.',
              limit: 'AI inspection has well-documented blind spots. Models trained on US bridges generalize poorly to European or Asian bridges with different concrete formulations + paint colors. Rare or novel defect types (the ones that cause unexpected failures) are exactly what AI under-trained on. Adversarial conditions (low light, wet surfaces, unusual angles) produce false positives + false negatives at unpredictable rates. The honest framing: AI is a productivity tool for routine inspection; humans remain accountable for the safety call.'
            }
          ];
          var sel = d.selectedSHM || 'visual';
          var topic = SHM.find(function(t) { return t.id === sel; }) || SHM[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '🔍 Bridge inspection + Structural Health Monitoring (SHM)'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'A bridge is not designed once + left alone. It is inspected on a defined cycle, and increasingly, it is monitored continuously through sensors, drones, and AI-assisted analysis. The shift from "inspect every 2 years" to "monitor in real time" is one of the major operational changes in infrastructure engineering of the past 30 years. The technology is genuinely powerful + has clear limits.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              SHM.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedSHM: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Technique + how it works'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.tech)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #ef4444' } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Honest limit'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.limit)
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
              h('strong', null, 'The institutional reality: '),
              'The technical tools for bridge monitoring have advanced enormously in the past 20 years. The institutional capacity to USE them — funding for sensor installation, trained personnel for data analysis, clear chains of responsibility, political will to close + repair structures when warning signs appear — has advanced less. Most major bridge tragedies of the past 50 years (Silver, Mianus, I-35W, Morandi/Genoa, Pittsburgh Fern Hollow) have been institutional failures as much as technical ones.'
            )
          );
        }

        function extremeEnvironmentsSection() {
          var EXT = [
            { id: 'permafrost', name: 'Permafrost + thaw', emoji: '❄️', where: 'Alaska, Yukon, Siberia, Northern Quebec',
              challenge: 'Foundations rest on permanently-frozen soil. If the soil warms enough to thaw, it loses 80-90% of its bearing strength and turns into mud. Heat conducted DOWN from the bridge (warm asphalt, bridge deck, even electric lines) can locally thaw the permafrost beneath a foundation that was originally designed in stable frozen ground. Climate warming is increasing average ground temperatures across the Arctic faster than at lower latitudes; ~30% of Alaskan infrastructure is now reporting some thaw-related distress.',
              solutions: 'Thermosyphons — sealed steel pipes filled with CO₂ or ammonia, buried with the foundation, that passively pump heat OUT of the ground in winter. No moving parts, no power, works for ~30+ years. Now standard on the Trans-Alaska Pipeline (~124,000 thermosyphons in service) and on major Alaskan bridge approaches. Insulating layers (polystyrene boards under road approaches). Refrigerated foundations for the most critical structures. Site-selection rules avoid ice-rich permafrost wherever possible.',
              caveat: 'Climate change is making this problem worse faster than design lifespans assume. Many Alaskan bridges + airport runways built in the 1970s assumed permafrost would remain stable; they are now showing differential settlement that requires expensive retrofitting. This is one of the clearest cases where climate change has already invalidated engineering assumptions in service.'
            },
            { id: 'ice', name: 'Ice loads + ice impact', emoji: '🧊', where: 'Saint Lawrence, Great Lakes, Baltic, Northern Norway',
              challenge: 'Sea ice + river ice can apply enormous lateral loads on bridge piers, both static (pack ice slowly squeezing) and dynamic (ice floes ramming piers during breakup). The Confederation Bridge across the Northumberland Strait (Canada, 1997, 13 km, the longest bridge over ice-covered water) was designed for ice loads up to 200,000 tonnes-force per pier. Each pier is shaped as a cone with a steeply inclined face designed to break advancing ice in BENDING rather than CRUSHING (bending requires much less force, and the broken ice rides up and over the cone).',
              solutions: 'Ice-breaking pier geometries (cones, wedges, slopes). Heated concrete in critical zones to weaken adhered ice. Choice of breakup-season construction shutdowns. Ice booms upstream (large floating barriers that pre-fragment incoming ice). Real-time ice-monitoring radar feeding closure decisions. Submerged piers below the maximum ice draft are an option for very deep water.',
              caveat: 'Ice loading is well-understood for steady ice, less so for dynamic events. The 2018 winter saw atypically large ice floes on the Hudson + the St. Lawrence after a warm-then-cold sequence; several smaller bridges sustained pier damage that triggered emergency closures. Climate is making winter ice behavior more variable, which is harder to design for than a steady cold climate.'
            },
            { id: 'wind', name: 'Sustained high-wind sites', emoji: '🌪️', where: 'Strait of Magellan, Scottish coasts, Hokkaido, Patagonia, Bering Strait proposals',
              challenge: 'Some sites have routine wind speeds where ordinary bridges are unsafe even when there is no storm. The Beauly Firth (Scotland) gets 50+ knot sustained winds dozens of days per year. Strong sustained side wind makes a bridge unsafe for high-profile vehicles (semi-trucks, buses, motorcycles); operators must close it for hours or days, disconnecting communities. Some proposed crossings (Bering Strait, ~85 km) face nearly continuous high winds + ice + winter darkness + remote location.',
              solutions: 'Aerodynamic deck profiles (open trusses, slotted decks, twin-box girders with central gap) that LET wind through rather than fight it. Mass dampers tuned for low-frequency wind buffet. Wind monitoring stations every few kilometers along long spans, automatically lowering speed limits or closing lanes when sustained winds exceed thresholds. Vertical wind shields (transparent or louvered baffles along the deck edge) for the worst stretches. The Akashi Kaikyō Bridge has performed extensive on-site wind tunnel testing of its eventual design at full Reynolds number.',
              caveat: 'Closure is itself a community-impact issue. The Mackinac Bridge (Michigan) closes occasionally for sustained high winds, stranding travelers in the Upper Peninsula. For a community whose only road link is closed, even safety-driven shutdowns are a quality-of-life issue. Honest engineering names this tradeoff rather than hiding it.'
            },
            { id: 'seismic', name: 'High-seismic zones', emoji: '⚠️', where: 'California, Japan, Taiwan, Iran, Chile, New Zealand',
              challenge: 'Bridges in high-seismicity regions must survive ground motions exceeding 1 g (1× gravity) horizontally without collapse, while ideally remaining functional for emergency response. The 1989 Loma Prieta earthquake collapsed a 50-foot section of the upper deck of the Bay Bridge + the Cypress Viaduct (42 dead). The 1995 Kobe earthquake collapsed the Hanshin Expressway (200+ dead). Both led to extensive retrofit programs.',
              solutions: 'Base isolation (rubber + steel bearings or sliding pendulum bearings that decouple the deck from horizontal ground motion). Lock-up devices for spans (steel devices that act as fuses, allowing slow thermal motion but locking up during sudden seismic motion). Restrainer cables between adjacent spans to prevent unseating. Capacity-design philosophy: design specific elements as fuses that yield ductilely (absorbing energy) while protecting other elements from failing brittlely. Retrofit programs systematically upgrade thousands of older bridges to modern seismic codes.',
              caveat: 'Seismic retrofit is enormously expensive. Caltrans (California Department of Transportation) has spent $20+ billion on bridge seismic retrofit since 1989; not all bridges are fully retrofit even now. There is always a question of cost vs probability: spending $50M to retrofit a rural bridge that might experience a major quake once in 500 years is a real tradeoff. Decisions are usually risk-prioritized by traffic + lifeline status + replacement cost.'
            },
            { id: 'corrosion', name: 'Coastal + salt corrosion', emoji: '🌊', where: 'Florida Keys, Caribbean, Persian Gulf, Maine coast, Gulf coast',
              challenge: 'Salt-laden air + seawater spray drive aggressive corrosion of steel + reinforced concrete. Chloride ions penetrate concrete, reach embedded rebar, and cause the rebar to corrode + expand, fracturing the concrete from inside (spalling). Once spalling begins, the protective layer is gone and degradation accelerates. The Florida Keys overseas bridges + the New Jersey shore bridges + the Pulaski Skyway have all undergone major chloride-driven retrofit programs.',
              solutions: 'Epoxy-coated rebar + glass-fiber-reinforced polymer (GFRP) rebar (no corrosion at all, since not iron). Cathodic protection (running a small electric current that biases the rebar so it can\'t lose electrons + corrode). Stainless-steel rebar in the most exposed splash zones. High-performance concrete (very low permeability, silica fume + slag additives). Marine-grade coatings + recoat schedules. Eventually, full deck replacement is sometimes cheaper than continued patching.',
              caveat: 'Sea-level rise is steadily increasing the splash zone. The Florida Keys overseas bridges were not designed for 2050 sea levels; they will need ongoing reassessment. The Surfside condominium collapse (2021, Miami) was not a bridge failure, but the root cause (decades of unaddressed chloride-driven rebar corrosion + spalling at the pool deck) is the same disease pattern that affects coastal bridges.'
            },
            { id: 'wildfire', name: 'Wildfire-exposed crossings', emoji: '🔥', where: 'California, Australia, Mediterranean Europe, parts of the western US',
              challenge: 'Wildfires can reach high enough intensity to compromise steel + concrete bridge structures, particularly older timber + steel-truss bridges in forested settings. Steel loses about half its strength at 600°C; a forest fire fully engulfing a bridge can reach 800-1100°C for hours. The 2018 Camp Fire (Paradise, CA) destroyed multiple small bridges + severely damaged others, blocking evacuation routes. Concrete spalls explosively when heated rapidly (water in the pore structure flashes to steam).',
              solutions: 'Vegetation clearance + fuel-break management around critical bridge sites. Spray-on intumescent fire coatings (used in tunnels + some bridges). Fire-rated concrete mix designs (with polypropylene fibers that melt out + provide vapor channels, preventing explosive spalling). Multiple evacuation routes (redundancy at the network level, not just the bridge level). Post-fire inspection protocols + temporary load restrictions.',
              caveat: 'Wildfire exposure is a relatively new bridge-design problem. Most current codes do not require detailed fire-engineering for highway bridges (tunnels are a different story). As wildfire frequency increases with climate change, this is likely to become a more formal design requirement, especially in the western US, southern Europe, and Australia.'
            },
            { id: 'remote', name: 'Remote + Indigenous-territory crossings', emoji: '🛤️', where: 'Northern Canada, Alaska, Greenland, Russian Far North, Tibet',
              challenge: 'Far-from-supply-chain sites multiply every challenge. The construction window may be only a few months per year. Heavy equipment + steel + concrete must be brought in by ice road, barge, or aircraft. Local labor capacity may be limited. Indigenous communities at the site have land, treaty, ecological, and self-determination claims that must be substantively respected, not checklist-checked. Some routes (e.g., Mackenzie Valley winter ice roads) themselves become un-usable infrastructure as climate change shortens the cold season.',
              solutions: 'Modular construction (precast components shipped + assembled). Helicopter-deliverable units for the most remote sites. Long planning + consultation timelines that include real Indigenous co-design from year ZERO of the project, not after the design is fixed. Designs that minimize disturbance to caribou migration, fish runs, traditional gathering grounds. Working WITH local knowledge of seasonal flow, ice behavior, animal patterns rather than overriding it.',
              caveat: 'Many older Arctic + Northern bridges were designed without meaningful Indigenous consultation. Some are now being retrofit or replaced with much more substantive co-design (the new Inuvik-Tuktoyaktuk Highway crossings are an example of modern practice; results have been mixed but the direction is right). The respectful framing: Indigenous communities are not stakeholders to be consulted, they are rights-holders + governments in their own right.'
            }
          ];
          var sel = d.selectedExt || 'permafrost';
          var topic = EXT.find(function(t) { return t.id === sel; }) || EXT[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '🌡️ Bridges in extreme environments'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'Most bridge-engineering education assumes a temperate climate, stable soil, modest wind, and a willing nearby supplier. Real bridges get built in conditions that violate all of those assumptions. Permafrost. Sea ice. Sustained high winds. Earthquake faults. Salt spray. Wildfire-prone forests. Remote sites a thousand kilometers from the nearest steel mill. Each one demands specific design responses + an honest reckoning with the limits.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              EXT.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedExt: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 2 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic' } }, 'Examples: ' + topic.where),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #ef4444', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'The challenge'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.challenge)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Engineering responses'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.solutions)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.06)', borderLeft: '3px solid #a78bfa' } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Honest limits'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.caveat)
              )
            )
          );
        }
      }

      // ──────────────────────────────────────────────────────────────
      // FORCES
      // ──────────────────────────────────────────────────────────────
      function renderForces() {
        var selected = FORCES.find(function(f) { return f.id === d.selectedForce; }) || FORCES[0];
        var conn = d.selectedConnection || 'bolted';
        var CONNECTIONS = [
          { id: 'rivet', name: 'Rivets',
            history: 'The bridge engineering standard from the 1840s through World War II. Heated red-hot, inserted, hammered into a head while still hot, then cooling created a tight clamp.',
            mechanism: 'Carries shear by friction (initial clamp) and bearing (force pressing against the hole edge). Cannot easily carry tension.',
            failure: 'Loose rivets are difficult to detect without removing them. Aging riveted structures (most pre-1950 bridges) require systematic inspection. The Silver Bridge eyebar (1967) was a connection failure adjacent to riveted construction.',
            still: 'Still used for replica historic restorations; almost never new construction. Eiffel Tower (1889) has ~2.5 million rivets, hammered by hand.'
          },
          { id: 'bolted', name: 'High-strength bolts',
            history: 'Largely replaced rivets after about 1950. High-strength steel bolts in pre-drilled holes, tightened to specified torque to create clamping force.',
            mechanism: 'Two modes: SLIP-CRITICAL (friction from clamping carries the entire load — preferred for fatigue loading like bridges) and BEARING (bolt pushes against the hole edge).',
            failure: 'Failure modes: bolt shear, plate bearing yielding, plate tear-out, bolt tension failure (in tension-only joints), inadequate torque (the Hyatt Regency walkway, 1981, was a torque + design change failure on a tension-type bolted connection).',
            still: 'The dominant connection in modern steel bridges. Inspectable, replaceable, code-controlled. ASTM A325 + A490 are the standard grades.'
          },
          { id: 'weld', name: 'Welds',
            history: 'Came into wide bridge use after about 1940 (welded WWII Liberty Ships had famous fatigue + brittle-fracture failures that taught the field hard lessons).',
            mechanism: 'Two pieces of steel are fused with molten filler metal. Continuous joint. No fasteners.',
            failure: 'Welds have a fatigue limit lower than the base steel. Internal voids + lack-of-fusion defects are invisible without ultrasonic or X-ray inspection. Cold-weather brittle fracture initiated cracks in welded Liberty Ships (1942 Schenectady tanker split in two while moored).',
            still: 'Standard in field + shop construction. Heavy reliance on qualified welders + inspection. Some critical joints (fracture-critical members) require specific welding procedure specifications + qualified inspectors.'
          }
        ];
        var sel = CONNECTIONS.find(function(c) { return c.id === conn; }) || CONNECTIONS[1];

        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Five types of force matter for structural engineering. Every part of every bridge experiences some combination of these.'
          ),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } },
            FORCES.map(function(f) {
              var active = d.selectedForce === f.id;
              return h('button', { key: f.id,
                onClick: function() { upd({ selectedForce: f.id }); },
                style: { padding: '6px 12px', borderRadius: 8, background: active ? f.color + '33' : '#1e293b', border: '1px solid ' + (active ? f.color : '#334155'), color: active ? f.color : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
              }, f.icon + ' ' + f.name);
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid ' + selected.color, marginBottom: 16 } },
            h('h3', { style: { margin: '0 0 8px', color: selected.color, fontSize: 18 } }, selected.icon + ' ' + selected.name),
            h('p', { style: { margin: '0 0 10px', fontSize: 13.5, color: '#e2e8f0', lineHeight: 1.7 } }, selected.desc),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
              h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)' } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Materials that handle it well'),
                h('div', { style: { fontSize: 12, color: '#dcfce7', lineHeight: 1.55 } }, selected.good)
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)' } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Watch out for'),
                h('div', { style: { fontSize: 12, color: '#fee2e2', lineHeight: 1.55 } }, selected.bad)
              )
            )
          ),

          // Seismic loading — earthquakes are a major design consideration
          sectionCard('🌋 Seismic loading — designing for earthquakes',
            (function() {
              var magnitude = d.seismicMag != null ? d.seismicMag : 7.0;
              var distance = d.seismicDist != null ? d.seismicDist : 30;  // km
              var weight = d.seismicWeight != null ? d.seismicWeight : 1000; // kN (bridge weight)
              // Simplified ground acceleration estimate (in g):
              //   PGA ≈ 10^(0.5*M - 1) / max(10, distance)^0.5 (very rough log-attenuation)
              var pga = Math.pow(10, 0.5 * magnitude - 1.5) / Math.pow(Math.max(10, distance), 0.5);
              if (pga > 2) pga = 2; // cap for display
              // Equivalent lateral force ≈ pga × weight (F = m·a, a in g, weight in kN already represents force-on-Earth)
              var lateralForce = pga * weight;
              // Modified Mercalli intensity (very rough)
              var mmi;
              if (pga < 0.001) mmi = 'I (not felt)';
              else if (pga < 0.01) mmi = 'II-III (weak)';
              else if (pga < 0.04) mmi = 'IV (light)';
              else if (pga < 0.09) mmi = 'V (moderate)';
              else if (pga < 0.18) mmi = 'VI-VII (strong / very strong)';
              else if (pga < 0.34) mmi = 'VIII (severe)';
              else if (pga < 0.65) mmi = 'IX (violent)';
              else mmi = 'X+ (extreme)';

              return h('div', null,
                h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'In seismic regions (Pacific Rim, much of the western US, Japan, Chile, New Zealand), bridges must survive earthquakes. The ground SHAKES horizontally and vertically; the bridge\'s mass becomes a hammer driven against itself by inertia. Modern seismic design uses three main strategies: STRENGTH (don\'t break), DUCTILITY (deform plastically without breaking), and ISOLATION (decouple the bridge from the ground motion).'
                ),

                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 } },
                  [
                    { label: 'Earthquake magnitude (M_w)', value: magnitude, min: 4.0, max: 9.5, step: 0.1, key: 'seismicMag' },
                    { label: 'Distance from epicenter (km)', value: distance, min: 5, max: 300, step: 5, key: 'seismicDist' },
                    { label: 'Bridge weight (kN)', value: weight, min: 200, max: 10000, step: 100, key: 'seismicWeight' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                        h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                        h('span', { style: { fontSize: 13, color: AMBER, fontWeight: 800 } }, s.value)
                      ),
                      h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                        onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                        'aria-label': s.label,
                        style: { width: '100%', accentColor: AMBER }
                      })
                    );
                  })
                ),

                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 12 } },
                  [
                    { label: 'Peak ground acceleration (PGA)', value: pga.toFixed(3) + ' g', color: pga > 0.3 ? '#fca5a5' : pga > 0.1 ? '#fbbf24' : '#86efac', sub: 'fraction of gravity' },
                    { label: 'MMI intensity', value: mmi, color: '#c7d2fe', sub: 'Modified Mercalli' },
                    { label: 'Lateral force on bridge', value: lateralForce.toFixed(0) + ' kN', color: '#fca5a5', sub: 'F = m·a (inertia)' },
                    { label: 'Energy release', value: '×' + Math.pow(10, 1.5 * (magnitude - 6)).toFixed(1), color: '#a78bfa', sub: 'vs M6 reference (each magnitude = 32× energy)' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                      h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label),
                      h('div', { style: { fontSize: 14, fontWeight: 800, color: s.color, marginTop: 2 } }, s.value),
                      h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, s.sub)
                    );
                  })
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65, marginBottom: 10 } },
                  h('strong', null, 'Three seismic design strategies: '),
                  h('ol', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                    h('li', null, h('strong', null, 'Strength: '), 'Design the structure to elastically resist seismic forces. Works for moderate quakes but becomes uneconomic for major ones — a strength-only bridge would need to be extraordinarily massive.'),
                    h('li', null, h('strong', null, 'Ductility (the modern approach): '), 'Design specific elements to YIELD + DEFORM plastically during major quakes — absorbing energy without rupturing. Plastic hinges in columns are common. Steel works wonderfully here; brittle materials (cast iron, plain concrete) do NOT. The bridge sustains damage but doesn\'t collapse.'),
                    h('li', null, h('strong', null, 'Base isolation: '), 'Place the bridge superstructure on lead-rubber bearings or sliding bearings. The ground shakes; the bearings absorb most of the motion; the bridge above moves much less. Most aggressive new approach. Common in Japanese + Chilean + California bridges.')
                  )
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65, marginBottom: 8 } },
                  h('strong', null, 'Akashi-Kaikyō (1995 Kobe earthquake mid-construction): '),
                  'The Akashi-Kaikyō Bridge was being built when the M6.9 Hyogoken-Nanbu (Kobe) earthquake hit on January 17, 1995. The two towers moved 1 METER farther apart. Engineers redesigned the deck mid-construction to accommodate the new geometry. The bridge survived + opened in 1998. A real-world case study in seismic resilience under extreme + unpredictable conditions.'
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65 } },
                  h('strong', null, 'Cypress Street Viaduct (1989 Loma Prieta): '),
                  'A double-decker freeway in Oakland built in the 1950s lacked the ductile detailing required by modern codes. When the M6.9 Loma Prieta earthquake hit, columns sheared, the upper deck collapsed onto the lower deck. 42 people died — the deadliest individual structural failure of the quake. The disaster accelerated retrofitting + replacement of pre-1971 California bridges. Many similar viaducts have since been demolished + replaced (or extensively retrofitted with steel jackets around columns + base isolators).'
                )
              );
            })(),
            '#dc2626'
          ),

          sectionCard('📡 Smart bridges + structural health monitoring (SHM)',
            (function() {
              var SENSORS = [
                { id: 'strain', name: 'Strain gauges', color: '#fbbf24',
                  measures: 'Elongation / compression of a member at the point of attachment.',
                  how: 'A foil resistor on a thin substrate, bonded to the member. As the member stretches, the foil stretches, increasing its resistance. Measured by a Wheatstone bridge circuit. Sensitivity: ~1 microstrain.',
                  examples: 'Akashi-Kaikyō Bridge (~1,000+ strain gauges). I-35W Saint Anthony Falls replacement (Minneapolis, 323 sensors installed after the 2007 collapse).',
                  benefit: 'Real-time stress data on critical members. Detects unexpected loads, fatigue accumulation, anomalous behavior.'
                },
                { id: 'fbg', name: 'Fiber Bragg gratings (FBG)', color: '#7dd3fc',
                  measures: 'Strain + temperature along the length of an optical fiber.',
                  how: 'Periodic refractive-index changes etched into an optical fiber. Each grating reflects a specific wavelength; strain shifts that wavelength. A single fiber can host hundreds of gratings — DISTRIBUTED sensing, not just points.',
                  examples: 'Sutong Bridge (China). Tsing Ma Bridge (Hong Kong). Embedded in concrete during construction → reports for the bridge\'s lifetime.',
                  benefit: 'Long lifespans (decades, no corrosion). Immune to electromagnetic interference. Many measurement points per cable.'
                },
                { id: 'accel', name: 'Accelerometers', color: '#a855f7',
                  measures: 'Vibration, dynamic response to loads + wind + seismic events.',
                  how: 'MEMS or piezoelectric devices that detect motion. Cheap (a smartphone has 3); reliable; can sample at hundreds or thousands of Hz.',
                  examples: 'Bay Bridge (San Francisco-Oakland). Sutong + Stonecutters Bridges. Most modern long-span bridges have ~50-200 accelerometers across the structure.',
                  benefit: 'Detects loose connections, develops cracks, unusual vibration modes. The first sign of trouble often shows up in vibration BEFORE visible damage.'
                },
                { id: 'gps', name: 'GPS displacement sensors', color: '#86efac',
                  measures: 'Absolute 3D position of points on the bridge, accurate to a few mm.',
                  how: 'Survey-grade GPS receivers at known points report position continuously. Differential GPS achieves mm-level precision.',
                  examples: 'Akashi-Kaikyō (tower-top GPS tracks how much the bridge sways in wind). Pasco-Kennewick Cable Bridge.',
                  benefit: 'Tracks settlement, long-term creep, thermal expansion. Detects whether the bridge is staying in its design envelope.'
                },
                { id: 'corrosion', name: 'Corrosion sensors', color: '#dc2626',
                  measures: 'Rebar corrosion in concrete; cable corrosion under wrap; coating breaches.',
                  how: 'Electrical-resistance probes embedded in concrete; acoustic emission detectors for breaking rebar wires; impedance spectroscopy.',
                  examples: 'Bay Bridge eastern span. Most new prestressed concrete bridges include corrosion monitoring as part of construction.',
                  benefit: 'Rebar corrosion is the #1 cause of premature concrete bridge deterioration. Catching it early enables targeted repair vs full replacement.'
                },
                { id: 'temp', name: 'Temperature sensors', color: '#0ea5e9',
                  measures: 'Steel + concrete temperatures across the bridge.',
                  how: 'Thermocouples, RTDs, or embedded fiber-optic temperature sensors.',
                  examples: 'Standard on nearly every major modern bridge.',
                  benefit: 'Critical for interpreting strain data (steel expands ~12 ppm/°C — large strain readings may just be thermal). Detects fire damage. Helps with deicing system control.'
                }
              ];
              var sel = SENSORS.find(function(s) { return s.id === d.selectedSensor; }) || SENSORS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Modern bridges are increasingly INSTRUMENTED — equipped with hundreds or thousands of sensors that report condition continuously. "Structural Health Monitoring" (SHM) catches early signs of trouble that human inspection would miss. Sensors don\'t replace inspectors; they augment them with 24/7 measurements of forces, motions, temperatures, corrosion that visible inspection can\'t reach.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  SENSORS.map(function(s) {
                    var active = (d.selectedSensor || SENSORS[0].id) === s.id;
                    return h('button', { key: s.id,
                      onClick: function() { upd({ selectedSensor: s.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? s.color + '33' : '#1e293b', border: '1px solid ' + (active ? s.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, s.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color, marginBottom: 8 } }, sel.name),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What it measures'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.measures)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How it works'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.how)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Real-world examples'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.examples)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Why it matters'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.benefit)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'From data to decisions: '),
                  'Raw sensor data is useless without analysis. Modern SHM systems use machine-learning models trained on the bridge\'s "normal" behavior to flag anomalies — e.g., a particular vibration mode shifting frequency, suggesting a connection is loosening. The data pipeline: sensors → edge computing on bridge → cloud database → AI analysis → maintenance team alerts. Several startups (Resensys, Bridge Diagnostics, others) sell SHM-as-a-service.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65 } },
                  h('strong', null, 'I-35W Mississippi River Bridge collapse (2007): '),
                  'The Minneapolis bridge collapsed during evening rush hour, killing 13 + injuring 145. Investigation showed a design flaw (undersized gusset plates) combined with construction loads (resurfacing materials piled on the deck). The replacement bridge (St. Anthony Falls Bridge, 2008) was instrumented with 323 sensors during construction — strain gauges, accelerometers, temperature sensors, corrosion sensors. It is one of the most heavily-monitored bridges in the world. Lessons from the collapse drove federal investment in SHM technology across US bridges.'
                )
              );
            })(),
            '#0ea5e9'
          ),

          // Connection design — where most failures actually happen
          sectionCard('🔩 Connections — where most failures actually happen',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'The members are usually not what fails — the connections between them are. Hyatt Regency (1981), Silver Bridge (1967), Tay Bridge (1879) were all connection failures, not material failures. Modern bridge engineering pays as much attention to joints as to members.'
              ),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
                CONNECTIONS.map(function(c) {
                  var active = conn === c.id;
                  return h('button', { key: c.id,
                    onClick: function() { upd({ selectedConnection: c.id }); },
                    style: { padding: '6px 14px', borderRadius: 8, background: active ? 'rgba(245,158,11,0.20)' : '#0f172a', border: '1px solid ' + (active ? AMBER : '#334155'), color: active ? '#fbbf24' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                  }, c.name);
                })
              ),
              h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + AMBER } },
                h('h4', { style: { margin: '0 0 8px', color: '#fbbf24', fontSize: 15 } }, sel.name),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'History'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 } }, sel.history)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.10)', borderLeft: '3px solid ' + AMBER, marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How it works'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 } }, sel.mechanism)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(220,38,38,0.10)', borderLeft: '3px solid #dc2626', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How it fails'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 } }, sel.failure)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Still used'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 } }, sel.still)
                )
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.6 } },
                h('strong', null, 'The Hyatt Regency lesson: '),
                'The 1981 walkway collapse was a connection failure. A late design change replaced one long rod (suspending both walkways) with two shorter rods (each walkway hung from the next). The change DOUBLED the load on the upper connection. No one re-engineered. 114 dead, 216 injured. Engineer of record carries final responsibility — both lead engineers lost their licenses. Now required reading in engineering ethics curricula.'
              )
            ),
            AMBER
          ),
          cableSpinningSection()
        );

        function cableSpinningSection() {
          var STEPS = [
            { id: 'anchor', name: '1. Anchorages first', emoji: '⚓', when: 'Months 1-12',
              what: 'Before any cable can be spun, the ENDS need to be anchored. Suspension-bridge anchorages are huge concrete monoliths cast into bedrock at each shore — for the Akashi Kaikyō (1991 m main span) each anchorage required 350,000+ m³ of concrete + reinforced steel. The cable splay-saddle (where the main cable fans out into individual strands) sits at the top of the anchorage. Each cable strand will be ANCHORED individually inside the concrete via shoes + steel girders + bond.',
              physics: 'The anchorage must resist the full HORIZONTAL component of cable tension — for a long-span bridge, that is tens of thousands of tons per anchor. Failure mode: the anchorage shears off + slides toward the river, slacking the cable + collapsing the deck. Design is extremely conservative (often safety factor 3+ on anchorage shear capacity).'
            },
            { id: 'towers', name: '2. Towers + saddles', emoji: '🗼', when: 'Months 6-18',
              what: 'The towers (pylons) are built next, founded on deep piers usually socketed into bedrock. Tower height for major suspension bridges: 80-300 m. At the top of each tower sits a CABLE SADDLE — a curved steel casting that supports the main cable as it crosses the tower. The saddle is on rollers so it can slide horizontally during cable spinning (when cable tension is unequal between sides) + then be fixed in its final position.',
              physics: 'Towers carry the VERTICAL component of cable tension — pure compression for free-standing towers, plus some bending from wind + thermal motion of the cable. Modern suspension towers are slender steel boxes or composite steel-concrete. The slenderness ratio is high; buckling check during construction (when the cable is partly installed) is a critical design case.'
            },
            { id: 'catwalk', name: '3. Catwalks + pilot ropes', emoji: '🚶', when: 'Month 18-24',
              what: 'Before cables can be spun, workers need a way to access the path the cable will take. A series of PILOT ROPES is shot or laid across the gap (sometimes by helicopter, traditionally by floating across on a boat, historically by rocket or kite). These are progressively replaced with thicker ropes + finally with the CATWALK — a temporary suspended walkway hung from temporary catwalk ropes, running across the entire main span + side spans. The catwalk is suspended below where the main cable will sit + provides the working surface for spinning crew.',
              physics: 'Catwalk loading is essentially the live load of workers + equipment + the catwalk itself. The catwalk follows roughly the same shape as the future main cable (a catenary). Catwalk construction is among the most dangerous moments in suspension-bridge building; high winds can shut it down for weeks.'
            },
            { id: 'spinning', name: '4. Cable spinning (the magic)', emoji: '🕷️', when: 'Months 24-30',
              what: 'A SPINNING WHEEL travels back and forth across the catwalk, carrying loops of high-strength steel wire (5 mm diameter, ~1700 MPa yield strength). At each pass, the wheel deposits two wires (the loop) into temporary "strand shoes" at each anchorage. After ~400-500 round trips, ~400-500 wires are bundled into a STRAND. A typical major suspension bridge has 30-100+ strands per main cable, each containing 300-500 wires; the total cable contains ~10,000-40,000 individual wires. Spinning rate: ~10-50 mph of wire per minute. Total spinning time: months to a year.',
              physics: 'Each wire shares the load roughly equally because they all hang in the same catenary curve. After spinning, the strands are bundled, compressed by hydraulic squeeze, and wrapped with helical wrapping wire + corrosion-protection sheath. The completed cable diameter on the Akashi Kaikyō is 1.12 m, containing 36,830 wires + carrying ~50,000 tons.'
            },
            { id: 'aerial', name: '5. Aerial Spun vs PPWS', emoji: '⚙️', when: 'Variable',
              what: 'Two methods of cable construction: AERIAL SPUN (the historic method described above, used on Brooklyn Bridge through Golden Gate through modern bridges) + PARALLEL-WIRE STRAND (PPWS), where pre-fabricated strands of 100+ parallel wires are shop-coiled, then unspooled across the catwalk + anchored. PPWS is faster + reduces on-site labor; aerial spinning gives slightly more uniform wire tension. Most modern major suspension bridges use PPWS (Akashi, Great Belt, Storebælt). Some still use aerial spinning (Verrazzano-Narrows replacement cables, 2017-2019, used aerial spinning).',
              physics: 'PPWS strands are shop-fabricated under controlled tension, leading to slightly different mechanical behavior than aerial-spun cables (aerial-spun wires are tensioned individually on-site). Connection between PPWS strands + anchorage uses different shoe geometry than aerial spinning.'
            },
            { id: 'hangers', name: '6. Hangers + suspenders', emoji: '🎯', when: 'Month 30-36',
              what: 'With the main cable now in place + tensioned, vertical HANGER CABLES are attached at regular intervals (typically every 10-20 m along the main span) connecting the main cable down to the eventual deck. Hangers are stranded wire ropes or parallel-wire stays, typically 50-100 mm diameter. The number of hangers on a major suspension bridge is 200-400 per side of the span. Each hanger has its own connection sockets at top (to main cable) + bottom (to deck).',
              physics: 'Each hanger carries the live + dead load of its tributary segment of deck. The hanger spacing is chosen to keep individual hanger forces manageable + to avoid resonance with wind-induced deck motions. Hangers are individually replaceable; cable replacement happens periodically over the bridge\'s life (Verrazzano replaced all suspender ropes 2017-2019).'
            },
            { id: 'deck', name: '7. Deck erection', emoji: '🚛', when: 'Month 36-48',
              what: 'The deck (girder + roadway) is erected in segments, typically beginning at the towers + working outward toward midspan in both directions, hanging each segment from the previously-completed segment + the hangers above. For long spans, the deck segments are typically prefabricated steel-orthotropic-deck sections (10-40 m long, ~500-2000 tons each), barged out + lifted into place by gantry cranes traveling along the partly-completed deck. As more deck is added, the load on the cable + towers grows; the saddle position is monitored + sometimes adjusted.',
              physics: 'During deck erection, the cable + tower stresses are CONTINUOUSLY changing. Stress monitoring during construction is essential. The final geometric form of the bridge (cable sag, tower top position, deck profile) is "tuned" by careful sequencing of deck segments. Errors in sequencing can leave the bridge with permanent unwanted deformations.'
            },
            { id: 'tuning', name: '8. Final tensioning + acceptance', emoji: '🎚️', when: 'Month 48+',
              what: 'After deck completion, the bridge is tensioned to final geometry. Cable saddles are fixed in place. Hanger lengths are fine-tuned. Wind-tunnel testing is reviewed against actual measured wind response. Load testing applies known truck loads (often a coordinated parade of dump trucks) to verify deck deflections match design predictions within tolerances. SHM systems are activated (see Materials tab). The bridge is opened to traffic.',
              physics: 'Acceptance testing typically loads the bridge to ~125% of design service load (NOT to the ultimate capacity, which would risk damage). Measured deflections should agree with calculations within ~5-10%. The very first traffic crossing — often a ceremonial walk for invited dignitaries + the public — is a tradition older than steel suspension bridges themselves.'
            }
          ];
          var sel = d.selectedSpin || 'anchor';
          var topic = STEPS.find(function(t) { return t.id === sel; }) || STEPS[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '🏗️ How a long-span suspension bridge is actually built'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'You can hold a piece of cable in your hand: it is a few millimeters of high-tensile steel wire. A long-span suspension bridge\'s main cable contains tens of thousands of such wires, bundled, compressed, wrapped, and tensioned to carry 50,000+ tons. The CONSTRUCTION SEQUENCE is one of the most remarkable choreographies in modern engineering — each step depending on the previous + impossible without it.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              STEPS.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedSpin: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 2 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic' } }, 'Timeline: ' + topic.when),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What happens'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.what)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e' } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Physics + structural logic'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.physics)
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
              h('strong', null, 'The Roebling lineage: '),
              'John A. Roebling invented the aerial-spinning method while building the 1855 Niagara Falls railroad suspension bridge — the technique remains essentially unchanged 170 years later. He died in 1869 from injuries sustained during early construction of the Brooklyn Bridge; his son Washington took over + suffered decompression sickness ("caisson disease") supervising the pier sinking. His wife Emily Roebling effectively managed the project for the next decade. The Brooklyn Bridge opened in 1883 + still carries traffic today.'
            )
          );
        }
      }

      // ──────────────────────────────────────────────────────────────
      // CASE STUDIES (with Tacoma flutter sim when selected)
      // ──────────────────────────────────────────────────────────────
      function tacomaFlutterDemo() {
        var windSpeed = d.windSpeedMph != null ? d.windSpeedMph : 35;
        // Critical flutter speed (simplified): about 30-40 mph for the historical Tacoma deck cross-section
        var critical = 35;
        var safe = windSpeed < 20;
        var resonance = windSpeed >= 20 && windSpeed < 50;
        var failing = windSpeed >= 50;
        // Animation parameters scale with wind speed
        var amplitude = Math.min(40, Math.max(2, (windSpeed - 5) * 0.8));
        var period = Math.max(0.6, 4 - windSpeed / 20); // faster oscillation at higher wind

        // Style block for the demo (scoped to this tool to avoid leakage)
        var styleBlock = h('style', null,
          '@keyframes tacomaFlutter {' +
          '  0% { transform: rotate(' + amplitude + 'deg); }' +
          '  50% { transform: rotate(' + (-amplitude) + 'deg); }' +
          '  100% { transform: rotate(' + amplitude + 'deg); }' +
          '}' +
          '.tacoma-deck { transform-origin: center center; animation: tacomaFlutter ' + period + 's ease-in-out infinite; }' +
          '@media (prefers-reduced-motion: reduce) { .tacoma-deck { animation: none !important; transform: rotate(' + (amplitude * 0.3) + 'deg); } }'
        );

        return h('div', { style: { padding: 14, borderRadius: 12, background: '#0a0e1a', border: '1px solid #334155', marginTop: 10, borderLeft: '3px solid #ef4444' } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 6 } }, '💨 Aerodynamic flutter demo'),
          h('p', { style: { margin: '0 0 10px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
            'Move the wind speed slider. Watch how the deck behaves. The open H-shaped cross-section of the original Tacoma deck caused alternating lift forces, and the bridge tore itself apart at moderate wind speeds. Modern bridges use closed or aerodynamic cross-sections that don\'t flutter.'
          ),
          styleBlock,

          // SVG of the deck
          h('svg', { viewBox: '0 0 400 180', width: '100%', height: 180, role: 'img', 'aria-labelledby': 'flutterTitle flutterDesc' },
            h('title', { id: 'flutterTitle' }, 'Tacoma Narrows flutter animation'),
            h('desc', { id: 'flutterDesc' }, 'A schematic bridge deck oscillating in wind. Amplitude grows with wind speed. At ' + windSpeed + ' miles per hour, the deck is ' + (safe ? 'stable' : resonance ? 'in resonant flutter' : 'failing') + '.'),
            // Towers (fixed)
            h('rect', { x: 50, y: 30, width: 12, height: 130, fill: '#475569' }),
            h('rect', { x: 338, y: 30, width: 12, height: 130, fill: '#475569' }),
            // Wind arrows (visual indicator)
            (function() {
              var n = Math.min(8, Math.max(1, Math.round(windSpeed / 8)));
              var arrows = [];
              for (var i = 0; i < n; i++) {
                var y = 50 + i * 12;
                arrows.push(h('g', { key: 'w' + i },
                  h('line', { x1: 8, y1: y, x2: 30, y2: y, stroke: '#94a3b8', strokeWidth: 1 }),
                  h('polygon', { points: '30,' + (y - 3) + ' 30,' + (y + 3) + ' 36,' + y, fill: '#94a3b8' })
                ));
              }
              return arrows;
            })(),
            h('text', { x: 8, y: 25, fill: '#94a3b8', fontSize: 10 }, 'Wind →'),

            // Cables (catenary, fixed)
            h('path', { d: 'M 56,38 Q 200,80 344,38', stroke: '#94a3b8', strokeWidth: 1.5, fill: 'none' }),
            // Deck — this is the rotating element
            h('g', { className: 'tacoma-deck', transform: 'translate(200, 110)' },
              h('rect', { x: -140, y: -8, width: 280, height: 16, fill: '#475569', stroke: '#334155', strokeWidth: 1, rx: 2 }),
              // Open H cross-section indicator
              h('rect', { x: -140, y: -6, width: 280, height: 3, fill: '#1e293b' }),
              h('rect', { x: -140, y: 3, width: 280, height: 3, fill: '#1e293b' })
            ),
            // Vertical hangers (also fixed for simplicity; not strictly accurate but readable)
            [0.2, 0.4, 0.6, 0.8].map(function(t, i) {
              var x = 56 + (344 - 56) * t;
              var topY = 56 - Math.sin(Math.PI * t) * 40 + 22;
              return h('line', { key: 'h' + i, x1: x, y1: topY, x2: x, y2: 100, stroke: '#64748b', strokeWidth: 0.5 });
            }),
            // Status label
            h('text', { x: 200, y: 175, textAnchor: 'middle', fill: failing ? '#fca5a5' : resonance ? '#fbbf24' : '#86efac', fontSize: 12, fontWeight: 800 },
              failing ? '✗ STRUCTURE FAILING' : resonance ? '⚠ RESONANT FLUTTER' : '✓ STABLE'
            )
          ),

          // Wind speed slider
          h('div', { style: { marginTop: 12 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
              h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Wind speed'),
              h('span', { style: { fontSize: 13, color: failing ? '#fca5a5' : resonance ? '#fbbf24' : '#86efac', fontWeight: 800 } }, windSpeed + ' mph')
            ),
            h('input', { type: 'range', min: 0, max: 80, step: 1, value: windSpeed,
              onChange: function(e) { upd({ windSpeedMph: parseInt(e.target.value, 10) }); },
              'aria-label': 'Wind speed in miles per hour',
              style: { width: '100%', accentColor: '#ef4444' }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 2 } },
              h('span', null, '0 mph'),
              h('span', null, 'Critical: ~' + critical + ' mph'),
              h('span', null, '80 mph')
            )
          ),

          h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: failing ? 'rgba(239,68,68,0.10)' : resonance ? 'rgba(245,158,11,0.10)' : 'rgba(34,197,94,0.10)', border: '1px solid ' + (failing ? '#7f1d1d' : resonance ? '#92400e' : '#14532d'), fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.6 } },
            failing ? h('span', null, h('strong', null, 'Failing: '), 'At ' + windSpeed + ' mph the historical Tacoma deck would have torn itself apart. The actual collapse happened at ~42 mph wind. The bridge had been oscillating in lower winds for months — locals called it "Galloping Gertie" and tourists drove across for the thrill.') :
            resonance ? h('span', null, h('strong', null, 'Resonant flutter: '), 'The deck has entered an aeroelastic flutter mode. Each oscillation creates lift forces that amplify the next oscillation — a positive feedback loop. Unrestrained, it grows until structural failure. The historical Tacoma Narrows collapsed at ~42 mph in 1940.') :
            h('span', null, h('strong', null, 'Stable: '), 'Below the critical flutter speed. Modern bridges have streamlined or trussed cross-sections that prevent flutter at any wind speed they\'re likely to encounter. Wind tunnel testing is now mandatory for major bridges.')
          )
        );
      }

      function millenniumPedestrianDemo() {
        var nPeds = d.millenniumPeds != null ? d.millenniumPeds : 200;
        // Critical synchronization threshold: empirically about 156-166 pedestrians on the London Millennium north span
        var critical = 160;
        // Synchronization fraction grows with pedestrian count above ~30 (where motion becomes perceptible)
        var syncFrac;
        if (nPeds < 30) syncFrac = 0;
        else if (nPeds < critical) syncFrac = ((nPeds - 30) / (critical - 30)) * 0.2;
        else syncFrac = Math.min(1, 0.2 + (nPeds - critical) / 100);
        // Amplitude proxy (mm), grows nonlinearly past the critical point
        var amplMm = nPeds < critical ? nPeds * 0.05 : 8 + (nPeds - critical) * 0.4;
        var status = nPeds < critical ? 'stable' : nPeds < critical + 80 ? 'synchronizing' : 'locked';
        var amplitude = Math.min(50, amplMm * 0.5);
        var period = 1.05; // seconds for 1 Hz pedestrian-induced lateral motion

        var styleBlock = h('style', null,
          '@keyframes millenniumWobble {' +
          '  0% { transform: translateX(' + (-amplitude) + 'px); }' +
          '  50% { transform: translateX(' + amplitude + 'px); }' +
          '  100% { transform: translateX(' + (-amplitude) + 'px); }' +
          '}' +
          '.millennium-deck { transform-origin: center center; animation: millenniumWobble ' + period + 's ease-in-out infinite; }' +
          '@media (prefers-reduced-motion: reduce) { .millennium-deck { animation: none !important; transform: translateX(' + (amplitude * 0.3) + 'px); } }'
        );

        return h('div', { style: { padding: 14, borderRadius: 12, background: '#0a0e1a', border: '1px solid #334155', marginTop: 10, borderLeft: '3px solid #ef4444' } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 6 } }, '🚶 Pedestrian synchronization demo'),
          h('p', { style: { margin: '0 0 10px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
            'Move the pedestrian-count slider. Each walker on the bridge applies a small lateral push at ~1 Hz (half their step rate). At low density, the pushes are randomly phased + cancel out. Above the critical density (~160 on the London north span), walkers UNCONSCIOUSLY synchronize their steps with the swaying bridge, amplifying the motion.'
          ),
          styleBlock,

          // SVG of the bridge with pedestrians
          h('svg', { viewBox: '0 0 400 160', width: '100%', height: 160, role: 'img', 'aria-labelledby': 'millTitle millDesc' },
            h('title', { id: 'millTitle' }, 'Millennium Bridge pedestrian synchronization animation'),
            h('desc', { id: 'millDesc' }, 'A schematic pedestrian bridge with ' + nPeds + ' people. Lateral amplitude is ' + amplitude.toFixed(0) + ' pixels — ' + status + '.'),
            // Towers (fixed)
            h('rect', { x: 50, y: 30, width: 8, height: 110, fill: '#475569' }),
            h('rect', { x: 342, y: 30, width: 8, height: 110, fill: '#475569' }),
            // Side cables (suspended-deck style — characteristic of Millennium)
            h('path', { d: 'M 54,38 Q 200,70 346,38', stroke: '#94a3b8', strokeWidth: 1.2, fill: 'none' }),
            // The deck (rotating side-to-side, scaled by amplitude)
            h('g', { className: 'millennium-deck', transform: 'translate(200, 100)' },
              h('rect', { x: -140, y: -6, width: 280, height: 10, fill: '#64748b', stroke: '#334155', strokeWidth: 1, rx: 1 }),
              // Pedestrians scattered along
              (function() {
                var peds = [];
                var nVisible = Math.min(60, Math.round(nPeds / 4));
                for (var i = 0; i < nVisible; i++) {
                  var px = -130 + (i / nVisible) * 260 + (Math.random() * 10 - 5);
                  // If synchronized, all peds tilt together; if not, each tilts randomly
                  var tilt = syncFrac > 0.3 ? (Math.sin(i * 0.05) * 3) : (Math.random() * 6 - 3);
                  peds.push(h('g', { key: 'p' + i, transform: 'translate(' + px + ',-12) rotate(' + tilt + ')' },
                    h('circle', { cx: 0, cy: 0, r: 1.6, fill: '#fbbf24' }),
                    h('line', { x1: 0, y1: 1, x2: 0, y2: 6, stroke: '#fbbf24', strokeWidth: 1 })
                  ));
                }
                return peds;
              })()
            ),
            // Status label
            h('text', { x: 200, y: 155, textAnchor: 'middle', fill: status === 'locked' ? '#fca5a5' : status === 'synchronizing' ? '#fbbf24' : '#86efac', fontSize: 11, fontWeight: 800 },
              status === 'locked' ? '✗ LOCKED-IN SYNCHRONIZATION' : status === 'synchronizing' ? '⚠ SYNCHRONIZING' : '✓ STABLE'
            )
          ),

          // Pedestrian slider
          h('div', { style: { marginTop: 12 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
              h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Pedestrians on the bridge'),
              h('span', { style: { fontSize: 13, color: status === 'locked' ? '#fca5a5' : status === 'synchronizing' ? '#fbbf24' : '#86efac', fontWeight: 800 } }, nPeds + ' people · ' + amplMm.toFixed(0) + ' mm amplitude · ' + (syncFrac * 100).toFixed(0) + '% synchronized')
            ),
            h('input', { type: 'range', min: 0, max: 600, step: 10, value: nPeds,
              onChange: function(e) { upd({ millenniumPeds: parseInt(e.target.value, 10) }); },
              'aria-label': 'Number of pedestrians',
              style: { width: '100%', accentColor: '#ef4444' }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 2 } },
              h('span', null, '0 people'),
              h('span', null, 'Critical: ~' + critical + ' people'),
              h('span', null, '600 people')
            )
          ),

          h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: status === 'locked' ? 'rgba(239,68,68,0.10)' : status === 'synchronizing' ? 'rgba(245,158,11,0.10)' : 'rgba(34,197,94,0.10)', border: '1px solid ' + (status === 'locked' ? '#7f1d1d' : status === 'synchronizing' ? '#92400e' : '#14532d'), fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.6 } },
            status === 'locked' ? h('span', null, h('strong', null, 'Locked synchronization: '), 'Pedestrians are now unconsciously phase-locked with the bridge\'s natural lateral mode. Each step adds to the swaying. The bridge wobbles violently. At 8-10 mm visible amplitude, panicked pedestrians grip the railing + slow down — actually making it worse by sustaining synchronization. London opening day reached ~70 mm amplitude.') :
            status === 'synchronizing' ? h('span', null, h('strong', null, 'Synchronization beginning: '), 'Bridge motion is becoming perceptible. Some pedestrians are unconsciously adjusting their gait. If more people arrive or stay, locked synchronization will develop.') :
            h('span', null, h('strong', null, 'Stable: '), 'Below the critical pedestrian density. Random gait phasing cancels out laterally. Modern pedestrian bridges include tuned mass dampers + lateral viscous dampers to suppress this even at high density — the Millennium retrofit added ~87 dampers total.')
          )
        );
      }

      function renderCases() {
        var selected = CASES.find(function(c) { return c.id === d.selectedCase; }) || CASES[0];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Engineering is learned at least as much from failures as from successes. The collapse of Tacoma Narrows changed how every bridge in the world is designed; the success of Brooklyn proved suspension bridges could last centuries.'
          ),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
            CASES.map(function(c) {
              var active = d.selectedCase === c.id;
              return h('button', { key: c.id,
                onClick: function() { upd({ selectedCase: c.id }); },
                style: { padding: '8px 12px', borderRadius: 8, background: active ? (c.kind === 'failure' ? 'rgba(220,38,38,0.25)' : 'rgba(34,197,94,0.20)') : '#1e293b', border: '1px solid ' + (active ? (c.kind === 'failure' ? '#dc2626' : '#22c55e') : '#334155'), color: active ? (c.kind === 'failure' ? '#fca5a5' : '#86efac') : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }
              },
                h('div', null, c.icon + ' ' + c.name),
                h('div', { style: { fontSize: 10, opacity: 0.7 } }, c.year + ' · ' + c.kind)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid ' + (selected.kind === 'failure' ? '#dc2626' : '#22c55e') } },
            h('h3', { style: { margin: '0 0 4px', color: selected.kind === 'failure' ? '#fca5a5' : '#86efac', fontSize: 18 } }, selected.icon + ' ' + selected.name + ' (' + selected.year + ')'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 } }, selected.kind),
            sectionInfo('What happened', selected.what),
            sectionInfo(selected.kind === 'failure' ? 'Why it failed' : 'Why it succeeded', selected.why, selected.kind === 'failure' ? '#dc2626' : '#22c55e'),
            sectionInfo('Engineering lesson', selected.lesson, '#f59e0b'),
            sectionInfo('Worth remembering', selected.memory, '#a78bfa'),
            // Interactive flutter demo, only on Tacoma case
            selected.id === 'tacoma' ? tacomaFlutterDemo() : null,
            // Pedestrian dynamic-loading panel — only on Millennium case
            selected.id === 'millennium' ? millenniumPedestrianDemo() : null
          ),
          aestheticsAndIconicBridges(),
          militaryAndEmergencyBridgesSection()
        );

        function militaryAndEmergencyBridgesSection() {
          var MIL = [
            { id: 'bailey', name: 'Bailey bridge', emoji: '🔩', year: '1941',
              who: 'Donald Bailey (UK), Royal Engineers',
              tech: 'A modular truss bridge system using prefabricated steel panels (each ~10 ft × 5 ft × 200 lb) that bolt together by hand into a Pratt-truss configuration. Two parallel trusses + transom + chess + ribbon assembly + ramp panels. By stacking panels in 1, 2, or 3 layers + adding 1 or 2 trusses side-by-side, the same kit can build bridges from 30 to 220 ft (and longer with intermediate piers). 8 men can assemble a 100-ft bridge in 12-24 hours; no heavy crane needed because the bridge is launched by cantilever extension from one bank.',
              use: 'Originally for WWII military: replacing demolished bridges to keep advancing armies supplied. Now used worldwide for civilian emergencies: floods, earthquakes, structural collapse. The UK alone built ~2,500 Bailey bridges during WWII. After Hurricane Maria (2017) destroyed dozens of Puerto Rico\'s bridges, US Army Corps of Engineers + civilian contractors deployed Baileys to restore access within weeks. Maine + Vermont DOTs maintain Bailey stockpiles for spring flood season.',
              caveat: 'Bailey bridges are temporary in concept + sometimes left in place for decades. Many "temporary" Bailey bridges built in the 1940s + 1950s on rural US + UK roads are still in service. The original Bailey design carries about 70 tons (military class 70) but maintenance + load monitoring matter — bolted truss panels need periodic re-tensioning + corrosion inspection. The Bailey system has been improved (acrow-panel, the modern derivative is essentially a stronger Bailey) + the concept remains the gold standard for emergency steel bridging.'
            },
            { id: 'pontoon', name: 'Military pontoon (ribbon) bridge', emoji: '🌉', year: '1950s-current',
              who: 'US Army Corps + various NATO equivalents',
              tech: 'A floating bridge built of standardized aluminum or steel floating bays that link together along a riverbank. The Improved Ribbon Bridge (IRB, US) uses bays ~22 ft long, each pre-folded into a small road-transportable package + unfolded automatically on water. A typical IRB crew of ~30 soldiers can lay a 200 m bridge across a river in 60-90 minutes. Carries military class 70-90 (heavy main battle tanks).',
              use: 'Standard for crossing rivers wider than ~100 m where building a fixed bridge would take too long. Used by US Army in Iraq + Afghanistan, by Ukrainian + Russian forces in the 2022-2024 war (with high losses on both sides — pontoon bridges are attractive artillery + drone targets). Also used in disaster response — the 1993 Mississippi floods + Hurricane Katrina (2005) both involved military pontoon-bridge deployments to restore civilian access.',
              caveat: 'Pontoon bridges are slow (vehicles move ~10 mph), vulnerable (any pontoon failure can collapse the whole bridge), and require constant maintenance during use (anchoring against current, ice, debris, flood-level changes). They are a stopgap, not a long-term solution. Modern fixed-bridge construction has gotten fast enough (ABC techniques, see Design Cycle tab) that pontoon usefulness has narrowed.'
            },
            { id: 'mab', name: 'Medium Girder Bridge (MGB)', emoji: '🛡️', year: '1971-current',
              who: 'British military, manufactured by Williams Fairey Engineering',
              tech: 'A through-truss bridge system made of welded aluminum-alloy panels, lighter than Bailey + faster to assemble. The basic kit builds bridges 9-31 m (single span) carrying military class 70. Variants with linked panels reach 49 m. Assembled by hand by 8-12 soldiers in 30-60 minutes for a 20 m span. Lighter than Bailey, faster to deploy, more standardized fittings — currently the British Army\'s main bridging system, also used by Canada, Australia, India, many NATO armies.',
              use: 'Replaces Bailey in most military applications. Civilian use rarer than Bailey because civilian stockpiles tend to be Bailey-derived. The Stockport rail bridge failure (1972, UK) was bridged by a temporary MGB while the permanent replacement was built. Disaster response in Pakistan + Bangladesh has used MGB for cyclone-damaged bridges.',
              caveat: 'MGB is designed for military traffic patterns (predictable + low volume). It is not ideal for sustained civilian commuter traffic; the deck wears + connection fittings loosen under repeated loading. After ~2-5 years of civilian use, replacement is usually preferable to ongoing maintenance.'
            },
            { id: 'logsfloating', name: 'Floating-log + improvised bridges', emoji: '🪵', year: 'Throughout history',
              who: 'Various — civilian + military',
              tech: 'In the absence of prefab systems, soldiers + civilians have always built emergency bridges from local materials: lashed logs across a stream (Roman + Greek armies), boats lashed side-by-side with planking laid across (Persian crossing of the Hellespont, 480 BCE, by Xerxes — Herodotus describes the engineering in detail), rope suspension bridges (Inca + Tibetan traditions). The Inca built rope suspension bridges across Andean canyons using twisted ichu grass; the last surviving one, Q\'eswachaka, is rebuilt annually by local communities (~30 m span, replaced by hand by ~700 villagers over 4 days).',
              use: 'Disaster response in low-resource settings where prefab kits are unavailable + the gap is small enough to span with local materials. Indigenous traditional knowledge of bridge construction is often more contextually appropriate than imported military kits — locally-sourced, repairable with local skills, integrated with cultural practices.',
              caveat: 'Improvised bridges have load + durability limits that should not be ignored. Wooden logs decay within 1-3 years; rope rots faster; lashed-log bridges fail without warning when supporting beams crack. The Inca rope-bridge tradition works because of the annual rebuild + the community ownership; it is not a "let it stand" system. Modern engineering should respect + sometimes learn from indigenous bridge traditions without romanticizing what they cannot do.'
            },
            { id: 'pucvr', name: 'PUC-VR (Pont à Utilisation Civile / civil-use pontoon)', emoji: '🚧', year: '1990s-current',
              who: 'Various civilian + civil-protection agencies',
              tech: 'A simplified civilian-grade pontoon system, lighter than military pontoons + designed for vehicle traffic up to about class 35 (school buses + medium trucks, not heavy military vehicles). Used by FEMA + state emergency-management agencies. Vermont, Maine, + NH stockpile pontoon segments for flood season. French civil protection (Sécurité Civile) maintains a national stockpile for European flood response.',
              use: 'Spring flood response. The 2011 Vermont Tropical Storm Irene flooding washed out over 200 bridges + culverts; civilian pontoons + Bailey-derived kits + temporary fords kept communities connected for the 12-18 months until permanent replacements could be designed + built.',
              caveat: 'Stockpiles only work if they are actually maintained. Bridge kits sitting in warehouses for 30+ years often have rusted hardware, missing parts, corroded fittings. Some state agencies have discovered (the hard way, during an actual emergency) that their stockpile is non-functional. Annual or biennial deployment exercises with the actual kit are the only way to verify readiness.'
            },
            { id: 'tactical', name: 'Tactical Floating Causeway / INLS', emoji: '⚓', year: '2000s-current',
              who: 'US Navy + USACE',
              tech: 'A floating dock + causeway system used to land military vehicles + supplies from ship to shore where no port exists. The Improved Navy Lighterage System (INLS) uses standardized barges connected end-to-end to form a 600-1500 ft causeway running from a deep-water roadstead to the beach. Joint Logistics Over-the-Shore (JLOTS) is the doctrine name. In 2024 the US deployed JLOTS in the eastern Mediterranean to deliver humanitarian aid to Gaza; the operation faced multiple breakages from sea state + was widely critiqued for its costs vs delivered tonnage.',
              use: 'Emergency humanitarian delivery + military beach landings where port infrastructure is destroyed or inaccessible. Civilian disaster equivalent: the 2010 Haiti earthquake response used USACE INLS-derived causeways at Port-au-Prince when the main port was destroyed.',
              caveat: 'JLOTS-style operations are vulnerable to weather + cost a fortune per ton of delivered aid. The 2024 Gaza pier operation became a high-profile example: about $230M for a pier that delivered roughly 20 million pounds of food before being damaged by sea state + abandoned. For most disaster response, restoring existing port + airport infrastructure is more efficient than running a parallel maritime supply chain.'
            },
            { id: 'lessons', name: 'What emergency bridges teach engineers', emoji: '🎓',
              who: 'The integrated lesson',
              tech: 'Bailey + MGB + pontoon bridges are not separate categories from civilian bridge engineering. They share the same fundamentals (trusses, buoyancy, load paths, fatigue) but optimize differently: SPEED of assembly over LONG-TERM elegance, REPAIRABILITY over MINIMUM maintenance, MODULARITY over CUSTOMIZATION. Many modern civilian techniques (Accelerated Bridge Construction, prefab elements, SPMT moves, modular foundations) descend directly from military bridging research. The 100-year arc of military bridge engineering — from Roman cribwork to Bailey to MGB to current modular composite systems — has had outsized influence on civilian practice.',
              use: 'School engineering programs can use Bailey-bridge models as design exercises: students can prototype small Bailey-style panel systems with cardboard, paper, balsa wood + analyze the truss math. The K\'NEX Bridge Building Kit + similar educational products lean on this lineage. Maine\'s Project Lead The Way bridging modules use military-bridging-influenced kits.',
              caveat: 'Honoring military engineering does not require glorifying war. The civilian benefits of military bridging research are real + most are net positive for society. The development context (wartime) raises ethical questions that students + teachers can engage with — about how research priorities are set + who benefits + whose lives are affected. Engineering does not happen in a moral vacuum; emergency-bridge engineering history makes that visible.'
            }
          ];
          var sel = d.selectedMil || 'bailey';
          var topic = MIL.find(function(t) { return t.id === sel; }) || MIL[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '⚒️ Military + emergency bridges'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'Most of the world\'s bridge engineering research between 1900 + 1990 happened in military contexts. The Bailey, Medium Girder, and ribbon-pontoon systems were designed to keep armies supplied across destroyed rivers — and now keep civilian communities connected after floods, earthquakes, hurricanes, and infrastructure failures. The modular + accelerated-construction techniques that dominate modern civilian bridge work descend directly from this lineage.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              MIL.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedMil: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 2 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic' } }, 'Origin: ' + topic.who + ' · ' + topic.year),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Technical design'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.tech)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Operational use'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.use)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #ef4444' } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Honest limits + ethics'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.caveat)
              )
            )
          );
        }

        function aestheticsAndIconicBridges() {
          var ICONIC = [
            { id: 'salginatobel', name: 'Salginatobel Bridge', year: 1930, where: 'Schiers, Switzerland', engineer: 'Robert Maillart',
              what: 'A concrete three-hinged arch spanning 90 m across an Alpine gorge. The deck is so slim it appears almost too thin to carry trucks. Declared an International Historic Civil Engineering Landmark by ASCE in 1991 — the first concrete bridge to receive that honor.',
              why: 'Maillart treated form and structure as inseparable. He used the bending moment diagram itself as the SHAPE of the bridge, varying the depth of the deck so it is thickest where bending forces are greatest and thinnest where they are not. Material follows force. Almost a century later it still serves the same village it was built for.',
              lesson: 'Beauty in engineering is not added afterward; it is the visible expression of honest structural behavior. A bridge that looks elegant usually IS elegant, because there is no spare material doing nothing.'
            },
            { id: 'fortgewone', name: 'Forth Bridge', year: 1890, where: 'Firth of Forth, Scotland', engineer: 'Benjamin Baker + John Fowler',
              what: 'A cantilever railway bridge with two main spans of 521 m each — held the world span record for 17 years and was the first major British structure built entirely in steel (open-hearth, not wrought iron). UNESCO World Heritage Site since 2015.',
              why: 'Built directly after the Tay Bridge collapse (1879, 75 dead). The engineers deliberately overdesigned everything visible — massive tubular compression members, X-braced wind frames — to restore public confidence in iron-and-steel bridges. The famous "human cantilever" demonstration (two men, a stick, and a brick) by Baker is still used to teach the principle today.',
              lesson: 'Aesthetics include feeling safe. After a disaster, a bridge may need to LOOK substantial as well as BE substantial. The Forth has been called "ugly" by some critics; pilots and passengers have always called it reassuring.'
            },
            { id: 'firth', name: 'Akashi Kaikyō Bridge', year: 1998, where: 'Kobe to Awaji Island, Japan', engineer: 'Honshu-Shikoku Bridge Authority',
              what: 'Suspension bridge with the longest central span ever built: 1,991 m. Towers stand 297 m above sea level. Designed for typhoons (winds up to 286 km/h) and to survive a magnitude-8.5 earthquake. The 1995 Kobe earthquake (M 6.9) actually struck mid-construction; the towers shifted 1 m apart but engineers compensated rather than restart.',
              why: 'Pure scale handled with restraint. The towers taper gently rather than ornamenting. Cable shape is the catenary — the natural curve of a hanging chain (Hooke 1675, Bernoulli + Leibniz + Huygens 1690-1691). The aesthetic IS the physics of cables in tension.',
              lesson: 'The longest spans on Earth are designed by listening to natural curves (catenary, parabola, arch thrust line). Imposing a non-natural shape requires extra material, which then needs more cable, which needs more material — a runaway loop. Form follows force.'
            },
            { id: 'sundial', name: 'Sundial Bridge', year: 2004, where: 'Redding, California', engineer: 'Santiago Calatrava',
              what: 'A cable-stayed pedestrian bridge with a single asymmetric pylon 66 m tall, leaning back at 42°. The pylon casts a shadow on a sundial-calibrated walkway — accurate on the summer solstice. The bridge crosses the Sacramento River without touching it (to protect spawning salmon habitat).',
              why: 'A statement project. Calatrava is famous (and divisive) for treating bridges as sculpture. Cost overruns and maintenance issues have plagued several of his bridges. The Sundial cost ~$23M, well over original estimate. But the bridge is genuinely beloved locally, and it succeeded at its conservation goal (zero in-water piers).',
              lesson: 'A signature aesthetic can drive cost. The honest engineering question is: did the community get the bridge they paid for, or the architect they paid for? Reasonable people disagree on the Sundial; on some other Calatrava bridges (Constitution, Venice; Petach Tikva, Israel), public opinion has been harsher.'
            },
            { id: 'menai', name: 'Menai Suspension Bridge', year: 1826, where: 'Wales, UK', engineer: 'Thomas Telford',
              what: 'Wrought-iron chain suspension bridge spanning 176 m, the first major suspension bridge for vehicular traffic in the world. Held the world span record until 1834. Still in active service after almost 200 years (with cables replaced 1939; deck rebuilt 1940).',
              why: 'Telford designed it so the deck height (30 m above the strait) would not interfere with the Royal Navy\'s tall ships — a practical requirement that produced an iconic silhouette. Built using the lightest possible chain system because wrought iron in compression buckles under its own weight. Form follows the LIMITS of the material, not just its strengths.',
              lesson: 'Long service life is itself an aesthetic. A bridge that ages well — one whose silhouette people grew up with, whose stones have weathered, whose iron has patinaed — earns a kind of beauty that no new bridge can replicate. Heritage IS performance.'
            },
            { id: 'erasmus', name: 'Erasmusbrug', year: 1996, where: 'Rotterdam, Netherlands', engineer: 'Ben van Berkel (UNStudio) + others',
              what: 'Asymmetric cable-stayed bridge with a 139 m kinked pylon nicknamed "the Swan" (de Zwaan). Total length 802 m. Combines a cable-stayed main span with a Scherzer-style bascule (lifting) span at the south end for shipping.',
              why: 'Designed to be a CITY symbol. Rotterdam was rebuilt after WW2 bombing destroyed the medieval city center; the city deliberately commissioned bold contemporary architecture as a statement of identity. The bridge\'s sweeping pylon now appears on Rotterdam tourism logos and beer cans.',
              lesson: 'Bridges sometimes do work beyond engineering. They can be civic art, regional identity, even healing-after-trauma symbols. That is not "wasted" cost — but it should be a community decision, not slipped in by an architect afterward.'
            },
            { id: 'iron', name: 'The Iron Bridge', year: 1779, where: 'Shropshire, England', engineer: 'Abraham Darby III + Thomas Pritchard',
              what: 'The first major bridge built of cast iron — 30.6 m arch span across the River Severn. Has been in service for 245+ years (now pedestrian-only). UNESCO World Heritage Site since 1986 as the symbolic birthplace of the Industrial Revolution.',
              why: 'Engineers had no prior experience with cast iron as a structural material, so they copied wooden-bridge joinery (mortise + tenon + dovetail joints, sized for timber). The result is structurally inefficient — far more iron than needed — but it was a public proof-of-concept that changed civilization. Every steel bridge that exists descends from this experiment.',
              lesson: 'First-of-a-kind structures are SUPPOSED to be over-engineered. You do not yet know how the material behaves in service, so you add margin. The Iron Bridge is honored not for elegance but for COURAGE — building in a brand-new material at full civic scale.'
            }
          ];
          var sel = d.selectedIcon || 'salginatobel';
          var topic = ICONIC.find(function(t) { return t.id === sel; }) || ICONIC[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '🌉 Bridge aesthetics — iconic designs through history'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'A bridge can be ugly and still work. A bridge can be beautiful and still fail. The most-loved bridges in history tend to do BOTH: they earn their beauty by making their structural logic legible, by serving for generations, and by carrying meaning beyond their crossing function.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              ICONIC.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedIcon: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.name + ' (' + t.year + ')');
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 2 } }, topic.name),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10 } }, topic.where + ' · ' + topic.year + ' · ' + topic.engineer),
              sectionInfo('What it is', topic.what),
              sectionInfo('Why it matters', topic.why, '#22c55e'),
              sectionInfo('Aesthetic lesson', topic.lesson, '#a78bfa')
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
              h('strong', null, 'A working definition of bridge beauty: '),
              'A bridge is beautiful when its form makes its forces visible, when it suits its place, when it serves its community for generations, and when it ages without shame. None of those are decoration. They are all structural, social, and ethical decisions made at the design table.'
            ),
            h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)', fontSize: 11.5, color: '#fca5a5', lineHeight: 1.65 } },
              h('strong', null, 'The honest critique: '),
              'Some "iconic" bridges win awards for the architect and burden the community with maintenance costs the original budget did not contain (several Calatrava bridges have faced lawsuits over this). The reverse is also true: many beloved century-old bridges were not considered beautiful when new (the Eiffel Tower was originally hated by Parisian artists). Time, use, and care are part of what makes a bridge become iconic — not just the original sketch.'
            )
          );
        }
        function sectionInfo(title, body, color) {
          color = color || '#94a3b8';
          return h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid ' + color, marginBottom: 8 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, title),
            h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, body)
          );
        }
      }

      // ──────────────────────────────────────────────────────────────
      // DESIGN CYCLE
      // ──────────────────────────────────────────────────────────────
      function renderCycle() {
        var selected = DESIGN_STEPS.find(function(s) { return s.id === d.selectedStep; }) || DESIGN_STEPS[0];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Engineering is iterative. You design, test, fail, learn, redesign. Failure is information, not defeat. Every working bridge in the world is the descendant of many failures.'
          ),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } },
            DESIGN_STEPS.map(function(s, i) {
              var active = d.selectedStep === s.id;
              return h('button', { key: s.id,
                onClick: function() { upd({ selectedStep: s.id }); },
                style: { padding: '8px 14px', borderRadius: 8, background: active ? 'rgba(245,158,11,0.25)' : '#1e293b', border: '1px solid ' + (active ? AMBER : '#334155'), color: active ? '#fbbf24' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
              }, s.icon + ' ' + (i + 1) + '. ' + s.name);
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid ' + AMBER } },
            h('h3', { style: { margin: '0 0 8px', color: '#fbbf24', fontSize: 20 } }, selected.icon + ' ' + selected.name),
            h('p', { style: { margin: 0, fontSize: 14, color: '#e2e8f0', lineHeight: 1.75 } }, selected.desc)
          ),
          sectionCard('Apply this to your bridge design',
            h('ol', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.7 } },
              h('li', null, h('strong', null, 'Define: '), 'What span do you need to cross? What load (pedestrians? cars? trains?)? What materials are available locally? What\'s your budget?'),
              h('li', null, h('strong', null, 'Imagine: '), 'Sketch 3 different bridge types you could use. Don\'t commit yet.'),
              h('li', null, h('strong', null, 'Plan: '), 'Pick the most promising. Use the Stress Test tab to size it. Calculate cost. Identify what could go wrong (wind, ice, overload, fatigue, foundation problems).'),
              h('li', null, h('strong', null, 'Create: '), 'In the simulation, build it. In real life, a physical model from cardboard, popsicle sticks, or 3D-printed parts.'),
              h('li', null, h('strong', null, 'Test: '), 'Apply loads in the simulation. For physical models: weights, books, water. Where does it fail first? Why?'),
              h('li', null, h('strong', null, 'Improve: '), 'Use what you saw to redesign. Add material where stress is highest; reduce where stress is low. Iterate.')
            )
          ),
          feaBasics(),
          abcAndPrefabSection()
        );

        function abcAndPrefabSection() {
          var ABC = [
            { id: 'why', name: 'Why ABC exists', emoji: '⏱️',
              body: 'Conventional cast-in-place bridge construction takes months to years and closes a road or rail line for the entire duration. Long closures wreck communities (longer commutes, lost business, blocked emergency response, increased emissions from detours). The Federal Highway Administration (FHWA) coined the term "Accelerated Bridge Construction" (ABC) in the mid-2000s to capture techniques that compress the on-site closure to days or sometimes hours. The motivating insight: most of the bridge can be built OFF-site, in parallel with traffic continuing on-site, and then installed in a single short closure window.',
              caveat: 'ABC is more expensive PER BRIDGE than conventional construction (typically 10-30% higher direct cost, sometimes more). But the savings in user costs (driver time, business disruption, detour fuel) often exceed the extra construction cost by 5-10×. For a high-traffic interstate bridge, ABC pays for itself many times over. For a remote low-traffic rural bridge, conventional construction is usually the right answer. The choice should be driven by the WHOLE cost, including users.'
            },
            { id: 'prefab', name: 'Prefabricated bridge elements (PBES)', emoji: '🏭',
              body: 'Prefabricated Bridge Elements + Systems (PBES) are the building blocks of ABC. Common elements: prestressed precast deck panels, full-depth precast deck slabs, precast concrete pier caps, precast piers + columns, prefabricated steel girders with deck panels already attached, modular abutment systems, even entire prefabricated short-span bridges. They are manufactured in factory conditions (controlled temperature + humidity, full quality control, tight tolerances), then shipped to site on flatbed trucks or rail cars. Field work becomes assembly + connection rather than form-pouring-curing.',
              caveat: 'Factory-quality construction beats field-quality almost every time. Concrete cured at 70°F in 50% humidity, with controlled curing time + zero rain, is far more consistent than concrete poured on a windy 95°F day with rain incoming. Steel welded inside a fabricator\'s shop has fewer defects than steel welded on a scaffold over a river. The cost premium of factory construction is partly paid back by better long-term durability.'
            },
            { id: 'sps', name: 'Self-propelled modular transporters (SPMTs)', emoji: '🚛',
              body: 'SPMTs are massive multi-axle hydraulically-leveled platforms that can carry entire bridge spans — sometimes thousands of tons — and roll them into place along a highway closure. Each axle has its own steering + hydraulic suspension, so the SPMT can crab sideways, rotate in place, and self-level over uneven ground. Multiple SPMT trailers can be linked together. The Massena Bridge replacement (Massachusetts, 2014) used SPMTs to roll a 416-ton bridge span ~5 miles from a staging area + lower it onto its piers in a single 55-hour weekend closure. Total bridge replacement: 4 days. Conventional construction would have taken 6+ months of partial closure.',
              caveat: 'SPMT moves are spectacular + heavily filmed. They are also high-risk events — once the move starts, you cannot stop midway. Every conceivable failure mode (axle failure, hydraulic leak, weather, traffic incident on the route) must be pre-planned. Failed SPMT moves are rare but extremely expensive when they happen.'
            },
            { id: 'slide', name: 'Lateral slide-in construction', emoji: '↔️',
              body: 'Instead of using SPMTs, the new bridge is built alongside the existing bridge on temporary supports. During a short closure, the old bridge is demolished + the new bridge is slid sideways into its final position on hydraulic jacks or rollers, typically 20-40 feet. The Wells Avenue Bridge replacement (Newton, MA, 2009) was one of the first US slide-ins; the Pulaski Skyway in NJ used a slide-in for one span in 2014. The Massachusetts I-93 fast-14 project (2011) replaced 14 bridges in 14 weekends using slide-in + other ABC techniques, saving an estimated 4+ years of conventional construction time.',
              caveat: 'Lateral slide requires temporary support structures that are themselves substantial engineering projects. The geometry needs to allow space alongside the existing bridge. Slide-ins work best in interstate-highway corridors with wide right-of-ways; they are difficult in urban canyons or constrained sites.'
            },
            { id: 'gpr', name: 'Geosynthetic Reinforced Soil (GRS-IBS)', emoji: '🪨',
              body: 'GRS-IBS (Geosynthetic Reinforced Soil — Integrated Bridge System) replaces conventional reinforced-concrete abutments + piles with alternating layers of compacted granular fill + geosynthetic reinforcement (essentially industrial-strength plastic mesh). The result is a stable abutment that supports the bridge directly, with no pile foundations needed. GRS abutments can be built in days using standard earthwork crews. They cost 25-60% less than conventional abutments, eliminate the joint between superstructure + approach (a major maintenance headache), and are particularly well-suited to short-span single-lane bridges. FHWA reports 200+ GRS-IBS bridges built in the US since 2005, with very low maintenance costs.',
              caveat: 'GRS-IBS works best for shorter spans (typically under 130 feet) with light-to-moderate truck traffic. It is not appropriate for long spans, heavy-haul freight routes, or sites with unstable soils. The design is conservative + heavily standardized (FHWA published design guides + standard details) — a practical bridge solution rather than a fancy one.'
            },
            { id: 'designs', name: 'Standard ABC bridge designs', emoji: '📋',
              body: 'Several states have developed pre-engineered standard bridges for the most common short-span applications. The Vermont Agency of Transportation\'s ABC standard plans cover spans from 25-80 feet, with detailed precast deck + abutment specs that any local contractor can build. The Federal Lands Highway Program has similar plans for remote sites. The advantage: instead of paying for a custom design ($100K+ engineering), a small-town bridge replacement can use a standard plan ($5-10K design fee) + standard precast pieces. Lead time drops from 18 months to 6 months for a typical rural bridge.',
              caveat: 'Standard designs work because they cover the most common cases conservatively. They do NOT work for unusual sites (skewed crossings, complex traffic, environmentally-sensitive locations). Engineering judgment is still needed to decide whether the standard applies. Some communities have had bad experiences using standard plans inappropriately, then blaming the standard rather than the design choice.'
            },
            { id: 'success', name: 'Success cases', emoji: '🎯',
              body: '(a) Massachusetts Fast-14 (I-93, 2011): replaced 14 bridges over 14 consecutive weekend closures. Each weekend: Friday 11 PM close, Monday 5 AM open. Total project: 10 weeks vs estimated 4 years conventional. Massive media coverage; widely cited as the proof-of-concept event for US ABC. (b) Utah Riverdale Road bridge over I-84 (2007): first US use of SPMTs to slide an entire bridge into place. (c) Iowa Lower Mud River bridge (2010): demonstrator GRS-IBS bridge built in 23 working days at 30% lower cost. (d) Florida 17th Street Causeway Bridge approaches (2009-2011): SPMT-installed bridge segments with overnight closures. ABC has shipped at scale in the US for nearly 20 years now.',
              caveat: 'ABC works best where someone in the owner agency genuinely champions it + accepts the upfront design + coordination effort. It is not magic: it shifts construction risk + complexity from on-site to off-site + adds the move-day risk. Projects with poor early planning can fail just like any other.'
            },
            { id: 'limits', name: 'What ABC cannot do well', emoji: '🚫',
              body: 'ABC is NOT a universal answer. Limitations: (a) Cost. The direct construction cost is higher. For rural bridges with low traffic, the user-cost savings may not justify the premium. (b) Lead time. Precast elements need to be ordered + manufactured. ABC saves on-site time but adds front-end time. Emergency bridge replacement (after a hurricane or earthquake) may not have time for prefab. (c) Geometry. Many old bridges have unusual skews, super-elevations, or non-standard cross-sections that don\'t match factory-standard products. Heavy customization erodes the ABC cost advantage. (d) Maintenance access. Some ABC connections (UHPC closure pours, grouted shear keys) are difficult to inspect + maintain in service. The connection details matter as much as the elements.',
              caveat: 'ABC is one tool in a kit, not a replacement for thinking. The honest engineering answer is: every bridge is unique. ABC works beautifully for certain bridge types + sites + traffic profiles. For others, conventional construction remains the right choice. Designers who treat ABC as the default for everything will sometimes ship inferior + more expensive bridges than the boring conventional answer would have produced.'
            }
          ];
          var sel = d.selectedABC || 'why';
          var topic = ABC.find(function(t) { return t.id === sel; }) || ABC[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '🏭 Accelerated Bridge Construction (ABC) + prefab'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'Modern bridges do not have to take years to build. Accelerated Bridge Construction — using prefabricated factory-made elements installed during short on-site closures — has matured into a mainstream practice in the past 20 years. A bridge that would have closed a road for 6 months can now be replaced in a single weekend. The cost premium is real; the user-cost savings are typically larger.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              ABC.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedABC: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
              h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                h('strong', null, 'Honest limit: '), topic.caveat
              )
            )
          );
        }

        function feaBasics() {
          var FEA_TOPICS = [
            { id: 'idea', name: 'The big idea', emoji: '🧩',
              body: 'You cannot solve the exact equations of elasticity for a real bridge — the geometry is too complicated. So you do something clever: cut the bridge into thousands or millions of small simple pieces (the "elements"), each of which you CAN solve. Triangles and tetrahedra are the most common. Each element has nodes at its corners, and the displacement inside the element is interpolated linearly (or quadratically) from the node displacements. Force balance at each node gives one equation per degree of freedom. The result is a giant system of linear equations: [K]{u} = {F}, where K is the global stiffness matrix, u is the unknown nodal displacements, and F is the applied loads. Solve it (numerically, on a computer) and you have approximate displacement everywhere — and from there, approximate strain and stress.',
              caveat: 'FEA gives an APPROXIMATE answer. The approximation gets better as the mesh gets finer (more, smaller elements). But finer meshes cost more computer time. A real FEA workflow is: start coarse, refine where stress gradients are sharp (around bolt holes, weld toes, supports), check convergence by halving element size and seeing if the answer changes.'
            },
            { id: 'history', name: 'How FEA was invented', emoji: '📜',
              body: 'The conceptual foundations come from Richard Courant\'s variational methods (1943) and earlier matrix structural analysis (the Slope-Deflection method, 1915). The modern form of FEA was developed in the 1950s-60s primarily for AIRCRAFT analysis (Boeing 707, supersonic transport designs). Key figures: Ray Clough at Berkeley (who coined the term "finite element method" in 1960), John Argyris at Imperial College London + Stuttgart, Olek Zienkiewicz at Swansea (who wrote the foundational textbook in 1967, still cited). Bridge engineering adopted FEA in the 1970s once mainframe computers became affordable. By 2000, every major bridge in the world was designed using FEA software (ANSYS, ABAQUS, SAP2000, MIDAS, LUSAS).',
              caveat: 'FEA democratized analysis. A method that once required a research mainframe now runs on a laptop in minutes. This is enormous progress — and a hazard. A college sophomore can now run an FEA analysis they cannot interpret, get a colorful stress plot, and believe it. The software does not catch unit errors, bad meshes, or wrong boundary conditions. Garbage in, beautiful colorful garbage out.'
            },
            { id: 'mesh', name: 'The mesh matters', emoji: '🕸️',
              body: 'Meshing is the engineering judgment in FEA. Bad meshes give bad answers — sometimes catastrophically wrong, sometimes subtly wrong, both dangerous. (a) Element shape: very thin "sliver" triangles introduce numerical error. Aspect ratios should be modest (ideally <5:1, never >20:1). (b) Mesh density: needs to be fine where stress changes quickly (corners, holes, contact zones) and can be coarse where stress is uniform. (c) Singularities: at sharp re-entrant corners (90° internal corners with zero fillet radius), stress is theoretically infinite. Refining the mesh forever produces ever-larger stress, not convergence. This is a real trap — students sometimes refine indefinitely chasing a number that has no physical meaning.',
              caveat: 'Mesh convergence study: cut element size in half. If the answer changes by less than 5%, your mesh is fine. If it keeps changing as you refine, you may have a real singularity that needs geometric design change (add a fillet), not more meshing.'
            },
            { id: 'bcs', name: 'Boundary conditions = the model', emoji: '⚓',
              body: 'A bridge model has fixed supports (pinned, roller, fixed), applied loads (point, distributed, gravity), and possibly contact / friction / pre-stress. Most FEA errors trace back to boundary conditions. Common mistakes: (a) Over-constraining: clamping every direction at one end forces the model to resist temperature expansion that wouldn\'t exist in reality. Result: huge artificial thermal stress. (b) Under-constraining: forgetting to fix translation in one direction. The solver fails or gives a rigid-body answer. (c) Applying loads at single nodes: a "point load" at one node creates an infinite stress spike (the singularity above). Better: distribute over a small area. (d) Wrong load combinations: dead + live + wind + thermal + seismic, in the wrong combination, can over- or under-predict the critical case.',
              caveat: 'In professional bridge practice, every FEA result is checked against a hand calculation — beam-bending formula, simple truss analysis, equilibrium check — somewhere in the design. The hand calculation catches gross errors. Anyone running FEA without backup hand checks is one bad input away from a wrong answer that looks right.'
            },
            { id: 'types', name: 'Element types you will meet', emoji: '🔣',
              body: '(1) BEAM elements: 1D line elements with bending + axial + sometimes torsion. Use for truss members, beams, frames. Fast. Best for slender members where length >> cross-section. (2) SHELL elements: 2D surface elements with bending. Use for plates, decks, walls, the body of a box girder. Captures both in-plane and out-of-plane behavior. (3) SOLID elements: full 3D bricks or tetrahedra. Use for chunky parts: bearings, pylon bases, weld details, foundations. Most accurate, most expensive. (4) CONTACT elements: model surfaces sliding or separating. Used for bearings, bolted joints, expansion joints. (5) SPRING / LINK elements: model stiffness without geometry — e.g., soil under a footing, cable in a stay.',
              caveat: 'Mixing element types correctly is its own art. A beam element connected to a solid element needs a "rigid link" or "MPC" to enforce that the cross-section stays plane. Get this wrong and the connection is artificially flexible.'
            },
            { id: 'linear', name: 'Linear vs nonlinear', emoji: '↗️',
              body: 'A LINEAR FEA assumes (a) small displacements, (b) elastic material (stress proportional to strain, no permanent deformation), (c) boundary conditions don\'t change during loading. Doubles the load, doubles the displacement and stress everywhere. Most bridge-design work is linear, by code. NONLINEAR FEA relaxes these. Material nonlinearity (plastic yielding, concrete cracking). Geometric nonlinearity (large deflections — e.g., cable-stayed bridges where cable sag changes as load increases). Contact nonlinearity (bearings opening + closing). Time-dependent nonlinearity (concrete creep, steel relaxation). Nonlinear analysis is honest about post-yield behavior but is slower, sensitive to solver settings, and harder to interpret.',
              caveat: 'For most code-based design checks, linear FEA + a safety factor is enough. For seismic analysis, blast analysis, and progressive-collapse studies, nonlinear is required. The classic mistake: running a linear analysis past the yield point of the material and reporting impossible stress numbers because the model never knew to yield.'
            },
            { id: 'verify', name: 'How to trust an FEA result', emoji: '✅',
              body: 'Professional verification: (1) Sanity check magnitudes — does the maximum stress match a hand calculation within ~20%? (2) Reaction sum — do the support reactions equal the applied loads (force balance)? (3) Symmetry check — if loading + geometry are symmetric, the answer must be symmetric. (4) Mesh convergence — halve the element size; does the answer move <5%? (5) Energy check — is strain energy a smooth function of load (not jumping)? (6) Independent re-analysis — run the model in a second software package. (7) Physical correlation — load test the actual structure; sensors at critical points should match FEA within ~10%.',
              caveat: 'Most production bridge FEA models are NOT physically validated. They are validated by code conformance + hand-check cross-references. A small percentage of bridges (long-span, unusual, retrofitted) get full instrumentation + monitoring; almost everything else relies on the analyst\'s judgment + the code\'s safety factors.'
            },
            { id: 'limits', name: 'What FEA cannot tell you', emoji: '🚫',
              body: '(a) Whether your design is GOOD. FEA tells you stress; you decide if it is acceptable. (b) Whether your materials behave as modeled. Real concrete varies in strength batch-to-batch by 15-25%. Real welds have unknown internal defects. FEA assumes idealized homogeneous material. (c) What will happen at the limit. FEA does not know how the bridge fails — that comes from material science, fracture mechanics, and engineering experience. (d) Long-term behavior. Creep, fatigue, corrosion, weather, traffic patterns, climate change — FEA alone does not capture these; you bolt extra analyses on top. (e) The "unknown unknown." FEA cannot model failure modes you didn\'t think to include. Tacoma Narrows would not have shown flutter in 1940s FEA because the aerodynamic-elastic coupling wasn\'t in the model. Every famous bridge collapse has involved a failure mode the designers did not think to analyze.',
              caveat: 'FEA is the most powerful structural-analysis tool ever invented. It is also the easiest tool to MISUSE. Healthy bridge engineering treats FEA as a thinking aid, not an oracle. Designers who let the colored stress plot decide the design — without judgment, hand checks, code knowledge, and skepticism — are the ones who eventually have a problem.'
            }
          ];
          var sel = d.selectedFea || 'idea';
          var topic = FEA_TOPICS.find(function(t) { return t.id === sel; }) || FEA_TOPICS[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '🧠 Finite Element Analysis — how modern bridges actually get analyzed'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'Every bridge built today is analyzed with FEA somewhere in its design. It is the workhorse method, the reason engineers can design structures the hand-calculation generation could not. It is also the easiest tool in engineering to use badly. Both are worth understanding.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              FEA_TOPICS.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedFea: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
              h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                h('strong', null, 'What we should not overstate: '), topic.caveat
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
              h('strong', null, 'Try it free: '),
              'CalculiX (open-source FEA, runs on any laptop), Onshape with SimScale plugin (browser-based, free for students), LISA-FEA (free Windows tool with great tutorials for beginners). You can model a simple truss bridge in any of these in an afternoon. Start with the 1D beam elements, hand-check every result, build up from there.'
            )
          );
        }
      }

      // ──────────────────────────────────────────────────────────────
      // QUIZ
      // ──────────────────────────────────────────────────────────────
      function renderQuiz() {
        var answers = d.quizAnswers || [];
        var done = d.quizSubmitted;
        function select(qIdx, cIdx) {
          var na = answers.slice(); na[qIdx] = cIdx;
          upd({ quizAnswers: na });
        }
        function submit() {
          var c = 0;
          QUIZ_QUESTIONS.forEach(function(q, i) { if (answers[i] === q.answer) c++; });
          upd({ quizSubmitted: true, quizCorrect: c });
          if (addToast) addToast('Quiz: ' + c + '/' + QUIZ_QUESTIONS.length, c >= 9 ? 'success' : 'info');
          if (awardXP) awardXP(c * 5);
        }
        function reset() { upd({ quizIdx: 0, quizAnswers: [], quizSubmitted: false, quizCorrect: 0 }); }

        if (done) {
          var correct = d.quizCorrect || 0;
          var pct = Math.round(correct / QUIZ_QUESTIONS.length * 100);
          return h('div', { style: { padding: 16 } },
            h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 36, marginBottom: 4 } }, pct >= 80 ? '🏆' : pct >= 60 ? '🌉' : '🔧'),
              h('h2', { style: { margin: '0 0 4px', color: '#fbbf24', fontSize: 22 } }, correct + ' / ' + QUIZ_QUESTIONS.length),
              h('div', { style: { fontSize: 14, color: '#94a3b8' } }, pct + '%')
            ),
            QUIZ_QUESTIONS.map(function(q, i) {
              var got = answers[i] === q.answer;
              return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid ' + (got ? 'rgba(34,197,94,0.4)' : 'rgba(220,38,38,0.4)'), borderLeft: '3px solid ' + (got ? '#22c55e' : '#dc2626'), marginBottom: 10 } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: got ? '#86efac' : '#fca5a5', marginBottom: 4 } }, (got ? '✓ ' : '✗ ') + 'Q' + (i + 1)),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 6 } }, q.q),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 4 } }, 'Correct: ', h('strong', null, q.choices[q.answer])),
                !got ? h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, 'Your answer: ', q.choices[answers[i] != null ? answers[i] : 0]) : null,
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, fontStyle: 'italic' } }, q.explain)
              );
            }),
            h('button', { onClick: reset, style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: AMBER, color: '#fff', fontWeight: 700, cursor: 'pointer' } }, 'Retake quiz')
          );
        }

        var allAnswered = QUIZ_QUESTIONS.every(function(_, i) { return answers[i] != null; });
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12 } }, QUIZ_QUESTIONS.length + ' questions covering bridge engineering and structural mechanics.'),
          QUIZ_QUESTIONS.map(function(q, i) {
            return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 10 } },
              h('div', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.55 } }, h('strong', { style: { color: '#fbbf24' } }, 'Q' + (i + 1) + '. '), q.q),
              q.choices.map(function(c, ci) {
                var picked = answers[i] === ci;
                return h('button', { key: ci,
                  onClick: function() { select(i, ci); },
                  style: { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, marginBottom: 4, background: picked ? 'rgba(245,158,11,0.20)' : '#0f172a', border: '1px solid ' + (picked ? AMBER : '#334155'), color: '#e2e8f0', fontSize: 12.5, cursor: 'pointer', lineHeight: 1.5 }
                }, c);
              })
            );
          }),
          h('button', {
            onClick: submit,
            disabled: !allAnswered,
            style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: allAnswered ? AMBER : '#475569', color: '#fff', fontWeight: 800, fontSize: 14, cursor: allAnswered ? 'pointer' : 'not-allowed' }
          }, allAnswered ? 'Submit quiz' : 'Answer all questions (' + answers.filter(function(a) { return a != null; }).length + '/' + QUIZ_QUESTIONS.length + ')')
        );
      }

      // ──────────────────────────────────────────────────────────────
      // PRINT
      // ──────────────────────────────────────────────────────────────
      function renderPrint() {
        var mat = MATERIALS.find(function(m) { return m.id === d.materialId; }) || MATERIALS[3];
        var a = analyzeTruss(d.span, d.height, d.nBays, d.loadPerJoint);
        var stressMax = Math.max(a.maxChord, a.maxDiag) * 1000 / d.crossSectionMm2;
        var sf = mat.yieldMPa / stressMax;
        var status = sf >= 2 ? 'safe' : sf >= 1 ? 'marginal' : 'failed';
        var areaM2 = d.crossSectionMm2 / 1e6;
        var massKg = a.totalLen * areaM2 * mat.densityKgM3;
        var costUsd = a.totalLen * areaM2 * mat.costPerM3;
        return h('div', { style: { padding: 16 } },
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.4)', borderLeft: '3px solid ' + AMBER, marginBottom: 12, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '🖨 Bridge design specification sheet. '),
            'A one-page artifact for engineering portfolios, design competitions, classroom presentations, or maker-faire submissions. Contains the design parameters, the stress analysis result, the material properties, and your design notes.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: function() { try { window.print(); } catch (e) {} },
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#bridge-print-region, #bridge-print-region * { visibility: visible !important; } ' +
            '#bridge-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#bridge-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),
          h('div', { id: 'bridge-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, d.designName || 'My Bridge Design'),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'NGSS MS-ETS1 · HS-ETS1 · HS-PS2')
            ),

            h('div', { style: { padding: 10, background: status === 'safe' ? '#ecfdf5' : status === 'marginal' ? '#fffbeb' : '#fef2f2', border: '1px solid ' + (status === 'safe' ? '#6ee7b7' : status === 'marginal' ? '#fcd34d' : '#fecaca'), borderRadius: 8, marginBottom: 14, fontSize: 12, color: status === 'safe' ? '#065f46' : status === 'marginal' ? '#78350f' : '#7f1d1d' } },
              h('strong', null, 'Status: '),
              status === 'safe' ? '✓ SAFE — safety factor ' + sf.toFixed(2) + ' (adequate margin)' :
              status === 'marginal' ? '⚠ MARGINAL — safety factor ' + sf.toFixed(2) + ' (below recommended 2.0)' :
              '✗ FAILED — safety factor ' + sf.toFixed(2) + ' (material yield exceeded)'
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Design parameters'),
              h('table', { style: { width: '100%', fontSize: 12, color: '#0f172a', borderCollapse: 'collapse' } },
                h('tbody', null,
                  printRow('Bridge type', 'Warren truss, ' + d.nBays + ' bays'),
                  printRow('Span', d.span + ' m'),
                  printRow('Height', d.height + ' m'),
                  printRow('Load per top joint', d.loadPerJoint + ' kN'),
                  printRow('Total applied load (W)', a.W.toFixed(0) + ' kN'),
                  printRow('Member cross-section', d.crossSectionMm2 + ' mm² (' + (d.crossSectionMm2 / 100).toFixed(0) + ' cm²)'),
                  printRow('Material', mat.name + ' (yield ' + mat.yieldMPa + ' MPa, E = ' + mat.modulusGPa + ' GPa)')
                )
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Stress analysis (deep-beam approximation)'),
              h('table', { style: { width: '100%', fontSize: 12, color: '#0f172a', borderCollapse: 'collapse' } },
                h('tbody', null,
                  printRow('Reaction at each support', a.reactions.toFixed(0) + ' kN'),
                  printRow('Maximum bending moment', a.Mmax.toFixed(0) + ' kN·m'),
                  printRow('Max chord force', a.maxChord.toFixed(0) + ' kN (top in compression, bottom in tension)'),
                  printRow('Max diagonal force', a.maxDiag.toFixed(0) + ' kN'),
                  printRow('Max stress (force / area)', stressMax.toFixed(1) + ' MPa'),
                  printRow('Safety factor (yield / stress)', sf.toFixed(2))
                )
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Quantities'),
              h('table', { style: { width: '100%', fontSize: 12, color: '#0f172a', borderCollapse: 'collapse' } },
                h('tbody', null,
                  printRow('Total member length', a.totalLen.toFixed(1) + ' m'),
                  printRow('Estimated mass', massKg.toFixed(0) + ' kg'),
                  printRow('Estimated material cost', '$' + costUsd.toFixed(0))
                )
              )
            ),

            d.designNotes ? h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Design notes'),
              h('div', { style: { fontSize: 12.5, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.6 } }, d.designNotes)
            ) : null,

            h('div', { style: { padding: 10, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 12, fontSize: 11.5, color: '#78350f', lineHeight: 1.55 } },
              h('strong', null, 'Honest limit of this analysis: '),
              'A deep-beam approximation. Real bridge design uses method of joints, method of sections, or matrix structural analysis to get exact member forces, then checks every individual member for yield, buckling, fatigue, and connection limits. This tool is for learning, not for actually building a bridge.'
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5 } },
              'Sources: NGSS Lead States (2013) · Hibbeler, R.C. (2017), Structural Analysis · AASHTO LRFD Bridge Design Specifications · Petroski, H. (1994), Design Paradigms (Tacoma Narrows + Tay Bridge + Hyatt). Printed from AlloFlow STEM Lab.'
            )
          )
        );
        function printRow(label, value) {
          return h('tr', null,
            h('td', { style: { padding: 4, borderBottom: '1px dashed #cbd5e1', fontWeight: 700, width: '40%' } }, label),
            h('td', { style: { padding: 4, borderBottom: '1px dashed #cbd5e1' } }, value)
          );
        }
      }

      // ──────────────────────────────────────────────────────────────
      // Dispatch
      // ──────────────────────────────────────────────────────────────
      var body;
      switch (d.tab) {
        case 'types':     body = renderTypes(); break;
        case 'materials': body = renderMaterials(); break;
        case 'forces':    body = renderForces(); break;
        case 'cases':     body = renderCases(); break;
        case 'cycle':     body = renderCycle(); break;
        case 'quiz':      body = renderQuiz(); break;
        case 'print':     body = renderPrint(); break;
        default:          body = renderBuild();
      }

      return h('div', { className: 'selh-bridgelab', style: { display: 'flex', flexDirection: 'column', height: '100%', background: BG, color: '#e2e8f0' } },
        h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #1e293b', background: 'linear-gradient(135deg, #78350f, #0f172a)', display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { fontSize: 28 }, 'aria-hidden': 'true' }, '🌉'),
          h('div', null,
            h('h2', { style: { margin: 0, color: '#fbbf24', fontSize: 20, fontWeight: 900 } }, 'Bridge Engineering Lab'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 2 } }, 'Engineering Design · Structural Mechanics · NGSS HS-ETS1 + HS-PS2')
          )
        ),
        tabBar,
        h('div', { style: { flex: 1, overflow: 'auto' } }, body)
      );
    }
  });

  console.log('[StemLab] stem_tool_bridgelab.js loaded — Bridge Engineering Lab');
})();
