// ═══════════════════════════════════════════════
// stem_tool_anatomy.js — Human Anatomy Explorer
// Enhanced standalone module with layered anatomical visualization,
// 10 body systems, 129 structures, quiz mode, badge system,
// AI tutor, TTS, grade-band content, sound effects & snapshots.
// Extracted & enhanced from monolith stem_tool_science.js L5362-7429
// ═══════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('anatomy'))) {
(function() {
  'use strict';

  // ── Grade band helpers ──
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };

  var getGradeIntro = function(band) {
    if (band === 'k2') return 'Welcome! Look at the human body and tap on the glowing dots to learn about your bones, muscles, and organs.';
    if (band === 'g35') return 'Explore the human body! Select different systems to see how bones, muscles, and organs work together to keep you alive.';
    if (band === 'g68') return 'Investigate human anatomy across 10 body systems. Toggle layers to see how skeletal, muscular, and organ systems overlap. Use the quiz to test your knowledge.';
    return 'Analyze detailed clinical anatomy across 10 systems with 129 structures. Study origin/insertion, clinical significance, and pathology. Explore brain waves and sleep architecture.';
  };

  // ── Sound engine (Web Audio API) ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* audio not available */ }
    }
    return _audioCtx;
  }

  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch (e) { /* audio not available */ }
  }

  function playSound(type) {
    try {
      switch (type) {
        case 'systemSelect':
          playTone(440, 0.08, 'sine', 0.08);
          setTimeout(function() { playTone(554, 0.1, 'sine', 0.08); }, 60);
          break;
        case 'structureClick':
          playTone(660, 0.06, 'sine', 0.07);
          break;
        case 'layerToggle':
          playTone(330, 0.08, 'triangle', 0.06);
          setTimeout(function() { playTone(440, 0.08, 'triangle', 0.06); }, 50);
          break;
        case 'viewSwitch':
          playTone(392, 0.1, 'sine', 0.06);
          setTimeout(function() { playTone(523, 0.1, 'sine', 0.06); }, 80);
          break;
        case 'quizCorrect':
          playTone(523, 0.1, 'sine', 0.12);
          setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
          setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
          break;
        case 'quizWrong':
          playTone(220, 0.25, 'sawtooth', 0.08);
          break;
        case 'badge':
          playTone(523, 0.08, 'sine', 0.1);
          setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
          setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
          setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
          break;
        case 'snapshot':
          playTone(1200, 0.04, 'sine', 0.08);
          setTimeout(function() { playTone(800, 0.06, 'sine', 0.06); }, 50);
          break;
        case 'aiTutor':
          playTone(698, 0.06, 'sine', 0.06);
          setTimeout(function() { playTone(880, 0.08, 'sine', 0.06); }, 50);
          break;
        case 'tts':
          playTone(550, 0.05, 'triangle', 0.05);
          break;
        case 'guidedStep':
          playTone(440, 0.08, 'sine', 0.07);
          setTimeout(function() { playTone(523, 0.1, 'sine', 0.07); }, 60);
          break;
        case 'connectionView':
          playTone(350, 0.1, 'triangle', 0.06);
          setTimeout(function() { playTone(525, 0.1, 'triangle', 0.06); }, 80);
          break;
        case 'spotterCorrect':
          playTone(587, 0.06, 'sine', 0.10);
          setTimeout(function() { playTone(784, 0.08, 'sine', 0.12); }, 50);
          setTimeout(function() { playTone(1047, 0.12, 'sine', 0.14); }, 110);
          break;
        case 'spotterWrong':
          playTone(294, 0.15, 'sawtooth', 0.07);
          setTimeout(function() { playTone(220, 0.2, 'sawtooth', 0.06); }, 100);
          break;
        case 'pathwayStep':
          playTone(494, 0.06, 'triangle', 0.06);
          setTimeout(function() { playTone(587, 0.06, 'triangle', 0.06); }, 50);
          break;
        case 'compareView':
          playTone(440, 0.06, 'sine', 0.06);
          setTimeout(function() { playTone(554, 0.06, 'sine', 0.06); }, 40);
          setTimeout(function() { playTone(440, 0.06, 'sine', 0.06); }, 80);
          break;
        case 'mnemonicReveal':
          playTone(392, 0.08, 'triangle', 0.07);
          setTimeout(function() { playTone(494, 0.1, 'triangle', 0.07); }, 60);
          break;
      }
    } catch (e) { /* audio not available */ }
  }

  // ── Badge definitions ──
  var BADGE_DEFS = [
    { id: 'firstStructure', name: 'First Discovery', desc: 'Select your first structure', icon: '\uD83D\uDD2C', xp: 10 },
    { id: 'systemExplorer5', name: 'System Explorer', desc: 'Explore 5 body systems', icon: '\uD83E\uDDED', xp: 15 },
    { id: 'allSystems', name: 'Body Master', desc: 'Explore all 10 systems', icon: '\uD83C\uDFC6', xp: 30 },
    { id: 'layerMaster', name: 'Layer Master', desc: 'Toggle all 7 layers', icon: '\uD83C\uDF9A', xp: 15 },
    { id: 'quizAce5', name: 'Quiz Ace', desc: '5 quiz questions correct', icon: '\u2B50', xp: 20 },
    { id: 'quizAce15', name: 'Quiz Champion', desc: '15 quiz questions correct', icon: '\uD83C\uDF1F', xp: 40 },
    { id: 'streak3', name: 'Hot Streak', desc: '3-question streak', icon: '\uD83D\uDD25', xp: 15 },
    { id: 'viewToggler', name: 'Both Sides', desc: 'View both anterior and posterior', icon: '\uD83D\uDD04', xp: 10 },
    { id: 'searchPro', name: 'Search Pro', desc: 'Use search to find 3 structures', icon: '\uD83D\uDD0D', xp: 10 },
    { id: 'aiCurious', name: 'Curious Mind', desc: 'Ask AI tutor 3 questions', icon: '\uD83E\uDD16', xp: 15 },
    { id: 'structureScholar', name: 'Structure Scholar', desc: 'View 50 different structures', icon: '\uD83D\uDCDA', xp: 25 },
    { id: 'tourComplete', name: 'Tour Guide', desc: 'Complete a guided tour', icon: '\uD83D\uDEB6', xp: 20 },
    { id: 'connectionExplorer', name: 'Systems Thinker', desc: 'Explore 5 system connections', icon: '\uD83D\uDD17', xp: 20 },
    { id: 'clinicalExpert', name: 'Clinical Expert', desc: 'Solve 3 clinical cases', icon: '\uD83E\uDE7A', xp: 25 },
    { id: 'mnemonicLearner', name: 'Memory Master', desc: 'View 5 mnemonics', icon: '\uD83E\uDDE0', xp: 15 },
    { id: 'pathwayTracer', name: 'Pathway Tracer', desc: 'Complete 2 pathways', icon: '\uD83D\uDEE4', xp: 20 },
    { id: 'spotterPro', name: 'Spotter Pro', desc: 'Identify 5 in spotter test', icon: '\uD83C\uDFAF', xp: 25 },
    { id: 'compareMaster', name: 'Comparator', desc: 'Compare 5 structure pairs', icon: '\u2696', xp: 15 },
    { id: 'speedDemon', name: 'Speed Demon', desc: 'Identify a structure in under 3 seconds', icon: '\u26A1', xp: 20 },
    { id: 'anatomyChampion', name: 'Anatomy Champion', desc: 'Earn 12 other badges', icon: '\uD83D\uDC51', xp: 50 }
  ];

  // ── TTS helper (Kokoro-first) ──
  function speakText(text, callTTS) {
    playSound('tts');
    if (callTTS) { try { callTTS(text); return; } catch (e) {} }
    if (window._kokoroTTS && window._kokoroTTS.speak) {
      window._kokoroTTS.speak(String(text),'af_heart',1).then(function(url){if(url){var a=new Audio(url);a.playbackRate=0.95;a.play();}}).catch(function(){});
      return;
    }
    if (window.speechSynthesis) { var utter=new SpeechSynthesisUtterance(text); utter.rate=0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter); }
  }

  // ═══ Register tool ═══
  window.StemLab.registerTool('anatomy', {
    icon: '\uD83E\uDEC0',
    label: 'anatomy',
    desc: 'Explore 10 body systems with layered anatomical visualization',
    color: 'slate',
    category: 'science',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;

      // ── Tool body (anatomy) ──
      return (function() {
        var d = labToolData.anatomy || {};
        var upd = function(k, v) {
          setLabToolData(function(p) {
            return Object.assign({}, p, { anatomy: Object.assign({}, p.anatomy, (function() { var o = {}; o[k] = v; return o; })()) });
          });
        };
        var updMulti = function(obj) {
          setLabToolData(function(p) {
            return Object.assign({}, p, { anatomy: Object.assign({}, p.anatomy, obj) });
          });
        };

        // ── Grade band ──
        var gradeBand = getGradeBand(ctx);
        var gradeIntro = getGradeIntro(gradeBand);

        // ── Active tab ──
        var activeTab = d._activeTab || 'explore';

        // ══════════════════════════════════════
        // DATA — ALL 10 BODY SYSTEMS
        // ══════════════════════════════════════

        var SYSTEMS = {

          skeletal: {
            name: 'Skeletal', icon: '\uD83E\uDDB4', color: '#fef3c7', accent: '#b45309',
            desc: '206 bones \u2014 support, protection, movement, mineral storage, hematopoiesis.',
            structures: [
              { id: 'skull', name: 'Skull (Cranium)', x: 0.50, y: 0.06, v: 'b', fn: 'Protects the brain. 22 fused bones form the cranial vault (frontal, parietal\u00D72, temporal\u00D72, occipital, sphenoid, ethmoid) and facial skeleton (14 bones).', clinical: 'Fractures may cause epidural or subdural hematoma. Open fontanelles in infants allow brain growth and birth canal passage.', detail: 'Houses meninges, brain, and cranial nerve foramina. Sutures (coronal, sagittal, lambdoid) fuse by age 2.' },
              { id: 'mandible', name: 'Mandible', x: 0.50, y: 0.10, v: 'a', fn: 'Only moveable skull bone. Enables mastication, speech, and facial expression. Houses lower teeth.', clinical: 'TMJ dysfunction causes jaw pain and clicking. Mandibular fractures are the second most common facial fracture.' },
              { id: 'clavicle', name: 'Clavicle', x: 0.40, y: 0.155, v: 'a', fn: 'Horizontal strut connecting scapula to sternum. Transmits forces from upper limb to axial skeleton.', clinical: 'Most frequently fractured bone (fall on outstretched hand). Middle third fractures most common.' },
              { id: 'sternum', name: 'Sternum', x: 0.50, y: 0.22, v: 'a', fn: 'Flat bone protecting heart and great vessels. Manubrium, body, and xiphoid process. Site for bone marrow biopsy in adults.', clinical: 'Sternal fractures from blunt chest trauma (steering wheel). CPR may cause xiphoid fractures.' },
              { id: 'ribs', name: 'Ribs (1-12)', x: 0.58, y: 0.25, v: 'b', fn: '12 pairs: 7 true (1\u20137), 3 false (8\u201310), 2 floating (11\u201312). Protect thoracic organs and assist ventilation.', clinical: 'Flail chest: 3+ adjacent ribs fractured in 2+ places. Rib fractures 9\u201311 may lacerate spleen or liver.' },
              { id: 'scapula', name: 'Scapula', x: 0.38, y: 0.22, v: 'p', fn: 'Triangular flat bone on posterior thorax. Attachment for 17 muscles. Acromion and coracoid processes are key landmarks.', clinical: 'Winged scapula from long thoracic nerve (C5\u2013C7) palsy \u2014 serratus anterior paralysis.' },
              { id: 'humerus', name: 'Humerus', x: 0.26, y: 0.27, v: 'a', fn: 'Upper arm bone. Articulates with scapula (shoulder) and radius/ulna (elbow). Greater/lesser tubercles for rotator cuff.', clinical: 'Midshaft fracture \u2192 radial nerve palsy (wrist drop). Surgical neck fracture \u2192 axillary nerve injury.' },
              { id: 'radius', name: 'Radius', x: 0.21, y: 0.36, v: 'a', fn: 'Lateral forearm bone. Pivots around ulna for pronation/supination. Radial head at elbow, styloid process at wrist.', clinical: 'Colles fracture: distal radius fracture from FOOSH (fall on outstretched hand). "Dinner fork" deformity.' },
              { id: 'ulna', name: 'Ulna', x: 0.24, y: 0.36, v: 'a', fn: 'Medial forearm bone. Olecranon forms elbow point. Trochlear notch articulates with humerus for hinge motion.', clinical: 'Olecranon fractures from direct trauma. Monteggia fracture: proximal ulna + radial head dislocation.' },
              { id: 'carpals', name: 'Carpals', x: 0.17, y: 0.44, v: 'a', fn: '8 small bones in 2 rows: scaphoid, lunate, triquetrum, pisiform (proximal); trapezium, trapezoid, capitate, hamate (distal).', clinical: 'Scaphoid fracture: anatomical snuffbox tenderness. Avascular necrosis risk due to retrograde blood supply.' },
              { id: 'vertebral', name: 'Vertebral Column', x: 0.50, y: 0.30, v: 'p', fn: '33 vertebrae: 7 cervical, 12 thoracic, 5 lumbar, 5 sacral (fused), 4 coccygeal (fused). Protects spinal cord. Four curves provide spring-like shock absorption.', clinical: 'Herniated disc (L4\u2013L5, L5\u2013S1 most common). Scoliosis, kyphosis, lordosis. Spinal stenosis.' },
              { id: 'pelvis', name: 'Pelvis', x: 0.50, y: 0.42, v: 'b', fn: 'Ilium, ischium, pubis fused at acetabulum. Transfers weight from spine to lower limbs. Male pelvis narrower; female pelvis wider for childbirth.', clinical: 'Pelvic fractures \u2192 life-threatening hemorrhage from internal iliac vessels. Acetabular fractures require surgical fixation.' },
              { id: 'femur', name: 'Femur', x: 0.42, y: 0.57, v: 'a', fn: 'Longest, strongest bone. Head fits into acetabulum. Neck angled 125\u00B0. Supports 2\u20133\u00D7 body weight during walking.', clinical: 'Hip fractures in elderly have 20\u201330% one-year mortality. Femoral neck fractures may disrupt blood supply \u2192 avascular necrosis.' },
              { id: 'patella', name: 'Patella', x: 0.43, y: 0.66, v: 'a', fn: 'Largest sesamoid bone. Embedded in quadriceps tendon. Increases mechanical advantage of quadriceps by 30%.', clinical: 'Patellar fracture from direct trauma or forceful quad contraction. Patellofemoral syndrome ("runner\'s knee").' },
              { id: 'tibia', name: 'Tibia', x: 0.42, y: 0.76, v: 'a', fn: 'Main weight-bearing bone of the leg. Medial malleolus forms inner ankle. Tibial plateau articulates with femoral condyles.', clinical: 'Tibial plateau fractures from axial loading. Open fractures common (subcutaneous anterior surface). Compartment syndrome risk.' },
              { id: 'fibula', name: 'Fibula', x: 0.46, y: 0.76, v: 'a', fn: 'Non-weight-bearing lateral leg bone. Lateral malleolus forms outer ankle. Attachment for interosseous membrane and lateral compartment muscles.', clinical: 'Lateral malleolus fractures in ankle sprains. Maisonneuve fracture: proximal fibula + medial ankle injury.' },
              { id: 'tarsals', name: 'Tarsals', x: 0.42, y: 0.89, v: 'a', fn: '7 bones: talus, calcaneus, navicular, cuboid, 3 cuneiforms. Form longitudinal and transverse foot arches for shock absorption.', clinical: 'Calcaneal fractures from axial loading (falls from height). Talus fractures risk avascular necrosis.' },
              { id: 'sacrum', name: 'Sacrum & Coccyx', x: 0.50, y: 0.44, v: 'p', fn: 'Sacrum: 5 fused vertebrae forming posterior pelvis. Sacral canal contains cauda equina. Coccyx: vestigial tail bone.', clinical: 'Sacral fractures in high-energy trauma. Coccydynia (tailbone pain) from falls or prolonged sitting.' },
              { id: 'hyoid', name: 'Hyoid Bone', x: 0.50, y: 0.12, v: 'a', fn: 'U-shaped bone at C3 level. Only bone not articulating with another bone \u2014 suspended by muscles and ligaments. Anchors tongue and aids swallowing and speech. Greater and lesser horns (cornua).', clinical: 'Hyoid fracture strongly associated with strangulation (forensic significance). Important in swallowing disorders (dysphagia evaluation). Attachment for suprahyoid and infrahyoid muscles.' },
              { id: 'atlas_axis', name: 'Atlas (C1) & Axis (C2)', x: 0.50, y: 0.08, v: 'p', fn: 'Atlas (C1): ring-shaped, no body or spinous process. Supports skull, allows nodding (yes). Axis (C2): has odontoid process (dens) that acts as pivot. Atlas rotates around dens for head rotation (no). Transverse ligament holds dens against atlas.', clinical: 'Jefferson fracture (C1 burst from axial loading). Hangman fracture (C2 pedicle bilateral fracture). Atlantoaxial subluxation in rheumatoid arthritis and Down syndrome. Odontoid fractures in elderly falls.' },
              { id: 'metatarsals', name: 'Metatarsals & Phalanges (Foot)', x: 0.44, y: 0.94, v: 'a', fn: '5 metatarsals form forefoot, 14 phalanges (great toe has 2, others have 3). First metatarsal bears most weight during push-off. Metatarsal heads form "ball of foot." Sesamoid bones under 1st metatarsal head.', clinical: 'Jones fracture (5th metatarsal base): poor healing due to watershed blood supply. Stress fractures in runners (2nd/3rd metatarsal). Morton neuroma: interdigital nerve compression. Hallux valgus (bunion).' },
              { id: 'metacarpals', name: 'Metacarpals & Phalanges (Hand)', x: 0.15, y: 0.48, v: 'a', fn: '5 metacarpals and 14 phalanges. Thumb (1st metacarpal) has saddle joint at CMC for opposition \u2014 unique to primates. Each finger has 3 phalanges (proximal, middle, distal) except thumb (2). Extensor mechanism on dorsum.', clinical: 'Boxer fracture (5th metacarpal neck). Bennett fracture (1st metacarpal base). Mallet finger (extensor tendon avulsion at DIP). Jersey finger (FDP avulsion). Dupuytren contracture: palmar fascia thickening.' },
              { id: 'scaphoid_bone', name: 'Scaphoid Bone', x: 0.18, y: 0.45, v: 'a', fn: 'Largest carpal bone in proximal row. Crosses both carpal rows, making it vulnerable to fracture. Blood supply enters distally (retrograde) \u2014 fractures may disrupt blood flow to proximal pole. Palpable in anatomical snuffbox.', clinical: 'Most commonly fractured carpal bone (FOOSH mechanism). Anatomical snuffbox tenderness is key exam finding. Risk of avascular necrosis of proximal pole (retrograde blood supply). Often missed on initial X-ray \u2014 requires repeat imaging or MRI.' }
            ]
          },

          muscular: {
            name: 'Muscular', icon: '\uD83D\uDCAA', color: '#fce7f3', accent: '#be185d',
            desc: '600+ muscles \u2014 movement, posture, heat production, joint stabilization.',
            structures: [
              { id: 'deltoid', name: 'Deltoid', x: 0.30, y: 0.18, v: 'a', fn: 'Primary shoulder abductor (middle fibers). Anterior fibers flex/medially rotate; posterior fibers extend/laterally rotate the arm.', origin: 'Lateral third of clavicle, acromion, scapular spine', insertion: 'Deltoid tuberosity of humerus', clinical: 'Atrophy from axillary nerve injury (C5\u2013C6). IM injection site (avoid in children < 3 yrs).' },
              { id: 'pectoralis', name: 'Pectoralis Major', x: 0.42, y: 0.22, v: 'a', fn: 'Powerful arm adductor, flexor, and medial rotator. Clavicular head flexes; sternocostal head adducts and extends from flexed position.', origin: 'Clavicle, sternum, ribs 1\u20136, external oblique aponeurosis', insertion: 'Lateral lip of bicipital groove (humerus)', clinical: 'Rupture during bench press \u2014 "dropped pec" sign. Poland syndrome: congenital absence.' },
              { id: 'biceps', name: 'Biceps Brachii', x: 0.24, y: 0.29, v: 'a', fn: 'Powerful forearm supinator and elbow flexor. Long head stabilizes shoulder joint. Short head assists shoulder flexion.', origin: 'Short head: coracoid process; Long head: supraglenoid tubercle', insertion: 'Radial tuberosity and bicipital aponeurosis', clinical: 'Long head tendon rupture \u2192 "Popeye deformity." Biceps reflex tests C5\u2013C6 nerve roots.' },
              { id: 'triceps', name: 'Triceps Brachii', x: 0.73, y: 0.29, v: 'p', fn: 'Only elbow extensor. Three heads: long (crosses shoulder), lateral, and medial. Essential for pushing movements.', origin: 'Long: infraglenoid tubercle; Lateral/medial: posterior humerus', insertion: 'Olecranon process of ulna', clinical: 'Weakness in radial nerve palsy (C7 root). Triceps reflex tests C7\u2013C8 nerve roots.' },
              { id: 'rectus_ab', name: 'Rectus Abdominis', x: 0.50, y: 0.34, v: 'a', fn: 'Flexes trunk (sit-ups/crunches). Compresses abdominal contents. Assists forced expiration and stabilizes pelvis during walking.', origin: 'Pubic crest and symphysis', insertion: 'Xiphoid process, costal cartilages 5\u20137', clinical: 'Diastasis recti: midline separation (common in pregnancy). "Six-pack" \u2014 tendinous intersections create segmented appearance.' },
              { id: 'obliques', name: 'External Obliques', x: 0.58, y: 0.34, v: 'a', fn: 'Trunk rotation (contralateral), lateral flexion, and abdominal compression. Largest and most superficial abdominal muscle.', origin: 'External surfaces of ribs 5\u201312', insertion: 'Linea alba, pubic tubercle, iliac crest', clinical: 'Strains from twisting sports. Inguinal ligament (lower border) is key landmark for hernia surgery.' },
              { id: 'quads', name: 'Quadriceps Femoris', x: 0.42, y: 0.55, v: 'a', fn: 'Four muscles (rectus femoris, vastus lateralis/medialis/intermedius). Primary knee extensor. Rectus femoris also flexes hip.', origin: 'Rectus femoris: AIIS; Vasti: femoral shaft', insertion: 'Tibial tuberosity via patellar tendon', clinical: 'Quadriceps tendon/patellar tendon rupture. VMO weakness \u2192 patellofemoral tracking issues.' },
              { id: 'hamstrings', name: 'Hamstrings', x: 0.58, y: 0.58, v: 'p', fn: 'Three muscles (biceps femoris, semitendinosus, semimembranosus). Flex knee and extend hip. Critical for deceleration in running.', origin: 'Ischial tuberosity (all three); biceps femoris short head: linea aspera', insertion: 'Biceps: fibular head; Semi-T: pes anserinus; Semi-M: posterior medial tibial condyle', clinical: '"Pulled hamstring" \u2014 most common muscle strain in athletes. Proximal avulsion in sprinters.' },
              { id: 'gastrocnemius', name: 'Gastrocnemius', x: 0.58, y: 0.74, v: 'p', fn: 'Superficial calf muscle. Powerful plantar flexor (push-off in gait) and weak knee flexor. Two heads span the knee joint.', origin: 'Medial and lateral femoral condyles', insertion: 'Calcaneus via Achilles tendon', clinical: 'Achilles tendon rupture (positive Thompson test). "Tennis leg" \u2014 medial head tear.' },
              { id: 'trapezius', name: 'Trapezius', x: 0.50, y: 0.20, v: 'p', fn: 'Large diamond-shaped muscle. Upper fibers elevate scapula (shrug); middle fibers retract; lower fibers depress and rotate scapula upward.', origin: 'External occipital protuberance, nuchal ligament, C7\u2013T12 spinous processes', insertion: 'Lateral third of clavicle, acromion, scapular spine', clinical: 'Spinal accessory nerve (CN XI) palsy \u2192 inability to shrug shoulder. Shoulder droop.' },
              { id: 'lats', name: 'Latissimus Dorsi', x: 0.62, y: 0.32, v: 'p', fn: 'Broadest back muscle. Powerful arm extensor, adductor, and medial rotator. Key muscle in swimming, climbing, and pull-ups.', origin: 'T6\u2013T12 spinous processes, thoracolumbar fascia, iliac crest, ribs 9\u201312', insertion: 'Floor of bicipital (intertubercular) groove', clinical: 'Used in reconstructive surgery (myocutaneous flaps). Thoracodorsal nerve (C6\u2013C8) innervation.' },
              { id: 'glutes', name: 'Gluteus Maximus', x: 0.50, y: 0.44, v: 'p', fn: 'Largest muscle in the body. Powerful hip extensor and lateral rotator. Essential for standing from seated position, climbing stairs, running.', origin: 'Posterior ilium, sacrum, coccyx, sacrotuberous ligament', insertion: 'IT band and gluteal tuberosity of femur', clinical: 'Weakness \u2192 Trendelenburg gait (compensatory trunk lean). Inferior gluteal nerve (L5\u2013S2).' },
              { id: 'sartorius', name: 'Sartorius', x: 0.38, y: 0.52, v: 'a', fn: 'Longest muscle in the body. Crosses hip and knee. Produces the "tailor\'s position" (cross-legged sitting): hip flexion, abduction, lateral rotation + knee flexion.', origin: 'Anterior superior iliac spine (ASIS)', insertion: 'Pes anserinus (medial proximal tibia)', clinical: 'Pes anserinus bursitis causes medial knee pain. Landmark for femoral triangle.' },
              { id: 'tibialis', name: 'Tibialis Anterior', x: 0.40, y: 0.76, v: 'a', fn: 'Primary ankle dorsiflexor and foot inverter. Prevents foot slap during heel strike. Supports medial longitudinal arch.', origin: 'Lateral tibial condyle, upper 2/3 of lateral tibial surface', insertion: 'Medial cuneiform, base of 1st metatarsal', clinical: 'Foot drop from deep peroneal nerve injury. Shin splints (medial tibial stress syndrome).' },
              { id: 'soleus', name: 'Soleus', x: 0.58, y: 0.78, v: 'p', fn: 'Deep calf muscle beneath gastrocnemius. Plantar flexion (postural muscle \u2014 prevents forward falling while standing). Does not cross knee.', origin: 'Soleal line and posterior proximal fibula', insertion: 'Calcaneus via Achilles tendon', clinical: 'Soleus muscle pump aids venous return. DVT risk when immobile (long flights). Soleus strain in runners.' },
              { id: 'rotator_cuff', name: 'Rotator Cuff (SITS)', x: 0.34, y: 0.20, v: 'p', fn: 'Four muscles: Supraspinatus (initiates abduction, most commonly torn), Infraspinatus (lateral rotation), Teres minor (lateral rotation), Subscapularis (medial rotation). Stabilize glenohumeral joint and keep humeral head in glenoid fossa.', origin: 'Scapula (various fossae)', insertion: 'Greater and lesser tubercles of humerus', clinical: 'Rotator cuff tears: most common shoulder pathology (especially supraspinatus). Impingement syndrome: supraspinatus compressed under acromion during abduction. Positive empty can test, drop arm test.' },
              { id: 'iliopsoas', name: 'Iliopsoas', x: 0.44, y: 0.44, v: 'a', fn: 'Compound muscle: iliacus + psoas major. Most powerful hip flexor. Psoas major originates from T12\u2013L5 vertebral bodies (only muscle connecting spine to lower limb). Critical for walking, running, and maintaining upright posture.', origin: 'Psoas: T12\u2013L5 vertebrae. Iliacus: iliac fossa', insertion: 'Lesser trochanter of femur', clinical: 'Psoas abscess from spinal TB or Crohn disease. Psoas sign: pain on hip extension (suggests appendicitis/abscess). Hip flexion contracture in elderly/wheelchair-bound. Thomas test for hip flexion contracture.' },
              { id: 'intercostals', name: 'Intercostal Muscles', x: 0.56, y: 0.24, v: 'a', fn: 'Three layers between ribs. External intercostals: elevate ribs for inspiration. Internal intercostals: depress ribs for forced expiration. Innermost intercostals: similar to internal. Intercostal neurovascular bundle runs in costal groove (vein, artery, nerve \u2014 VAN, superior to inferior).', origin: 'Inferior border of rib above', insertion: 'Superior border of rib below', clinical: 'Intercostal nerve block for rib fracture pain. Chest tube insertion above rib to avoid neurovascular bundle. Intercostal neuralgia: chronic chest wall pain. Herpes zoster (shingles) follows intercostal dermatome.' },
              { id: 'pelvic_floor', name: 'Pelvic Floor (Levator Ani)', x: 0.50, y: 0.46, v: 'p', fn: 'Muscular "hammock" supporting pelvic organs: pubococcygeus, puborectalis, iliococcygeus. Supports bladder, uterus/prostate, rectum. Puborectalis maintains fecal continence (anorectal angle). Contracts during Kegel exercises.', origin: 'Pubis, obturator fascia (arcus tendineus), ischial spine', insertion: 'Coccyx, anococcygeal raphe, perineal body', clinical: 'Pelvic floor weakness: urinary incontinence, pelvic organ prolapse (cystocele, rectocele, uterine prolapse). Common after vaginal delivery. Kegel exercises for strengthening. Pelvic floor dysfunction: chronic pelvic pain, dyspareunia.' },
              { id: 'diaphragm_m', name: 'Diaphragm (Muscle)', x: 0.50, y: 0.27, v: 'b', fn: 'Primary muscle of respiration (responsible for 70% of quiet breathing). Dome-shaped musculotendinous partition between thorax and abdomen. Central tendon + peripheral muscle fibers from xiphoid, ribs 7\u201312, L1\u2013L3 vertebrae (crura). Right crus larger, encircles esophagus.', origin: 'Xiphoid process, costal cartilages 7\u201312, L1\u2013L3 crura', insertion: 'Central tendon', clinical: 'Hiccups: involuntary diaphragm spasm. Phrenic nerve (C3\u2013C5): "C3, 4, 5 keeps the diaphragm alive." Diaphragmatic hernia: abdominal contents in thorax. Congenital diaphragmatic hernia (Bochdalek): left-sided, neonatal respiratory distress.' }
            ]
          },

          circulatory: {
            name: 'Circulatory', icon: '\u2764\uFE0F', color: '#fee2e2', accent: '#dc2626',
            desc: 'Heart, 60,000 miles of vessels, 5L of blood \u2014 delivers O\u2082, nutrients, hormones; removes waste.',
            structures: [
              { id: 'heart', name: 'Heart', x: 0.48, y: 0.24, v: 'a', fn: 'Muscular pump. 4 chambers: RA/RV (pulmonary circuit), LA/LV (systemic circuit). Beats ~100,000\u00D7/day, pumps ~5L/min at rest.', clinical: 'MI (heart attack): coronary artery occlusion. Heart failure, arrhythmias, valvular disease. Leading cause of death worldwide.' },
              { id: 'aorta', name: 'Aorta', x: 0.52, y: 0.22, v: 'a', fn: 'Largest artery. Ascending aorta \u2192 aortic arch (brachiocephalic, left common carotid, left subclavian) \u2192 descending thoracic \u2192 abdominal aorta.', clinical: 'Aortic aneurysm (abdominal > 5.5cm \u2192 surgical repair). Aortic dissection: tearing chest pain, emergency.' },
              { id: 'sup_vena', name: 'Superior Vena Cava', x: 0.54, y: 0.20, v: 'a', fn: 'Returns deoxygenated blood from head, neck, upper limbs, and thorax to the right atrium. Formed by union of brachiocephalic veins.', clinical: 'SVC syndrome: obstruction (often by lung cancer/lymphoma) causes facial swelling, dyspnea, distended neck veins.' },
              { id: 'inf_vena', name: 'Inferior Vena Cava', x: 0.52, y: 0.36, v: 'a', fn: 'Largest vein. Returns blood from lower body to right atrium. Formed at L5 by union of common iliac veins. Passes through diaphragm at T8.', clinical: 'IVC filter placement for recurrent PE. IVC compression during pregnancy (supine hypotension syndrome).' },
              { id: 'pulm_art', name: 'Pulmonary Arteries', x: 0.46, y: 0.22, v: 'a', fn: 'Carry deoxygenated blood from RV to lungs. Only arteries that carry deoxygenated blood. Bifurcates at T5.', clinical: 'Pulmonary embolism (PE): clot from DVT lodges in pulmonary arteries. Saddle PE is life-threatening.' },
              { id: 'carotid', name: 'Carotid Arteries', x: 0.44, y: 0.12, v: 'a', fn: 'Common carotid bifurcates at C4 into internal (brain) and external (face/scalp). Internal carotid supplies anterior 2/3 of brain.', clinical: 'Carotid stenosis causes stroke/TIA. Carotid endarterectomy for >70% stenosis. Carotid body senses O\u2082/CO\u2082/pH.' },
              { id: 'jugular', name: 'Jugular Veins', x: 0.56, y: 0.12, v: 'a', fn: 'Internal jugular drains brain and face (runs with carotid in carotid sheath). External jugular visible on neck surface.', clinical: 'JVD (jugular venous distension) \u2192 sign of right heart failure, cardiac tamponade, tension pneumothorax.' },
              { id: 'coronary', name: 'Coronary Arteries', x: 0.46, y: 0.25, v: 'a', fn: 'LAD (left anterior descending) supplies anterior LV wall and septum ("widow maker"). LCx supplies lateral LV. RCA supplies RV and inferior LV.', clinical: 'LAD occlusion: anterior STEMI (most dangerous). RCA occlusion: inferior MI with possible heart block.' },
              { id: 'femoral_a', name: 'Femoral Artery', x: 0.44, y: 0.48, v: 'a', fn: 'Main blood supply to lower limb. Palpable at mid-inguinal point (midway ASIS to pubic symphysis). Becomes popliteal artery behind knee.', clinical: 'Femoral artery catheterization for angiography. Femoral artery laceration \u2192 rapid exsanguination.' },
              { id: 'brachial', name: 'Brachial Artery', x: 0.28, y: 0.30, v: 'a', fn: 'Continuation of axillary artery. Runs medially in arm. Blood pressure measured here (antecubital fossa). Bifurcates into radial and ulnar arteries.', clinical: 'BP cuff occludes brachial artery (Korotkoff sounds). Supracondylar fracture may damage brachial artery \u2192 Volkmann contracture.' },
              { id: 'portal', name: 'Hepatic Portal Vein', x: 0.52, y: 0.32, v: 'a', fn: 'Carries nutrient-rich blood from GI tract and spleen to liver for processing. Formed by superior mesenteric and splenic veins. Portal circulation is unique.', clinical: 'Portal hypertension in cirrhosis \u2192 esophageal varices, caput medusae, hemorrhoids, splenomegaly.' },
              { id: 'circle_willis', name: 'Circle of Willis', x: 0.50, y: 0.08, v: 'a', fn: 'Arterial anastomotic ring at base of brain. Formed by: anterior communicating artery connecting ACA\u2013ACA, posterior communicating arteries connecting ICA\u2013PCA, plus segments of ACA, ICA, and PCA. Provides collateral blood flow if one vessel is occluded. Complete circle in only ~25% of people.', clinical: 'Berry (saccular) aneurysms: most common at anterior communicating artery junction. Rupture \u2192 subarachnoid hemorrhage ("thunderclap headache"). Congenital variants may limit collateral flow \u2192 increased stroke risk.' },
              { id: 'saphenous', name: 'Great Saphenous Vein', x: 0.40, y: 0.70, v: 'a', fn: 'Longest vein in body. Runs from dorsum of foot, anterior to medial malleolus, up medial leg and thigh, drains into femoral vein at saphenous opening (saphenofemoral junction). Superficial position makes it accessible for cannulation and grafting.', clinical: 'Varicose veins from incompetent valves (superficial venous insufficiency). Used as conduit for CABG (coronary artery bypass graft surgery). Saphenous nerve runs alongside \u2014 may be injured during vein stripping. DVT risk in varicosities.' },
              { id: 'lymph_circ', name: 'Lymphatic Vessels', x: 0.36, y: 0.50, v: 'a', fn: 'One-way drainage system parallel to venous system. Begins as blind-ended lymph capillaries in tissues, drains through lymph nodes, collecting vessels, trunks, and ducts. Right lymphatic duct drains right upper body; thoracic duct drains everything else. Lymph propelled by skeletal muscle contraction and one-way valves.', clinical: 'Lymphedema: impaired drainage \u2192 chronic swelling (post-surgical, filariasis in tropics). Lymphangitis: red streaking from infected lymph vessel. Sentinel lymph node biopsy for cancer staging. Chylothorax from thoracic duct injury.' }
            ]
          },

          nervous: {
            name: 'Nervous', icon: '\u26A1', color: '#ede9fe', accent: '#7c3aed',
            desc: 'CNS (brain + spinal cord) and PNS (31 spinal nerve pairs, 12 cranial nerve pairs, autonomic NS).',
            structures: [
              { id: 'brain', name: 'Brain', x: 0.50, y: 0.05, v: 'b', fn: '~86 billion neurons. Cerebrum (cognition, sensation, motor), cerebellum (coordination), brainstem (vital functions). Weighs ~1.4 kg, uses 20% of O\u2082. Protected by meninges (dura, arachnoid, pia mater) and cerebrospinal fluid (CSF). Four lobes per hemisphere: frontal, parietal, temporal, occipital.', clinical: 'Stroke (ischemic/hemorrhagic), TBI, neurodegenerative diseases (Alzheimer, Parkinson), brain tumors, epilepsy. EEG measures brain waves for diagnosis of seizures, sleep disorders, and brain death.',
                brainWaves: [
                  { type: 'Delta (\u03b4)', freq: '0.5\u20134 Hz', amplitude: 'Highest', state: 'Deep dreamless sleep (N3)', color: '#6366f1', emoji: '\uD83D\uDE34', characteristics: 'Dominant in deep NREM sleep (stage N3). Associated with growth hormone release, tissue repair, and immune system strengthening. Excessive delta in waking = brain injury or encephalopathy.', clinical: 'Abnormal waking delta waves indicate brain lesions, metabolic encephalopathy, or diffuse cortical damage. Used to assess depth of anesthesia and coma.' },
                  { type: 'Theta (\u03b8)', freq: '4\u20138 Hz', amplitude: 'Medium\u2013High', state: 'Drowsiness, light sleep, meditation', color: '#8b5cf6', emoji: '\uD83E\uDDD8', characteristics: 'Prominent in light sleep (N1), deep meditation, and creative insight. Hippocampal theta rhythms are critical for memory encoding and spatial navigation.', clinical: 'Excessive theta in waking = ADHD, cognitive impairment, or drowsiness. Theta bursts during memory tasks reflect hippocampal-cortical dialogue for memory consolidation.' },
                  { type: 'Alpha (\u03b1)', freq: '8\u201313 Hz', amplitude: 'Medium', state: 'Relaxed wakefulness, eyes closed', color: '#06b6d4', emoji: '\uD83C\uDF3F', characteristics: 'First brain wave discovered (Hans Berger, 1929). Dominant when relaxed with eyes closed. Blocked by eye opening or mental effort ("alpha blocking"). Generated primarily in the occipital cortex.', clinical: 'Reduced alpha = anxiety, insomnia. Asymmetric alpha = cortical lesion or stroke. Alpha training used in neurofeedback for anxiety, ADHD, and peak performance.' },
                  { type: 'Beta (\u03b2)', freq: '13\u201330 Hz', amplitude: 'Low', state: 'Active thinking, focus, alertness', color: '#f59e0b', emoji: '\u26A1', characteristics: 'Dominant during active cognition, problem-solving, conversation, and decision-making. Sub-bands: low beta (13\u201315 Hz, relaxed focus), mid beta (15\u201320 Hz, active thinking), high beta (20\u201330 Hz, anxiety/excitement).', clinical: 'Excessive high beta = anxiety, stress, insomnia. Medications like benzodiazepines increase beta. Beta activity used in BCI (brain-computer interfaces) for motor imagery.' },
                  { type: 'Gamma (\u03b3)', freq: '30\u2013100+ Hz', amplitude: 'Lowest', state: 'Higher cognition, binding, consciousness', color: '#ef4444', emoji: '\uD83E\uDDE0', characteristics: 'Associated with sensory binding (combining sight, sound, touch into unified percepts), peak concentration, expanded consciousness, and compassion meditation. Highest frequency, lowest amplitude. Generated by fast-spiking interneurons.', clinical: 'Reduced gamma = schizophrenia, Alzheimer disease. Gamma entrainment via 40 Hz light/sound stimulation is being researched for Alzheimer treatment. Experienced meditators show elevated gamma.' }
                ],
                sleepStages: [
                  { stage: 'N1 (NREM Stage 1)', pct: '2\u20135%', duration: '1\u20137 min', waves: 'Theta (4\u20138 Hz)', emoji: '\uD83D\uDE0C', desc: 'Lightest sleep \u2014 transition from wakefulness. Slow rolling eye movements, muscle tone decreasing. Hypnic jerks (myoclonic twitches) common. Easily aroused. Vertex sharp waves appear on EEG.', clinical: 'Excessive N1 = sleep fragmentation (sleep apnea, restless legs). Hypnic hallucinations may occur. Sleep onset latency measured here for narcolepsy diagnosis (MSLT test).' },
                  { stage: 'N2 (NREM Stage 2)', pct: '45\u201355%', duration: '10\u201325 min', waves: 'Theta + Sleep spindles (12\u201314 Hz) + K-complexes', emoji: '\uD83D\uDCA4', desc: 'True sleep begins. Core body temperature drops, heart rate slows. Sleep spindles (thalamocortical bursts) protect sleep and consolidate motor memory. K-complexes are large waveforms responding to external stimuli.', clinical: 'Sleep spindles correlate with IQ and learning ability. Reduced spindles in schizophrenia and aging. K-complexes are the brain\'s "sentry" \u2014 evaluating stimuli without waking.' },
                  { stage: 'N3 (NREM Stage 3)', pct: '15\u201325%', duration: '20\u201340 min', waves: 'Delta (0.5\u20132 Hz), >20% of epoch', emoji: '\uD83C\uDF19', desc: 'Deep/slow-wave sleep (SWS). Most restorative stage. Growth hormone secretion peaks. Glymphatic system clears brain waste (amyloid-\u03b2). Declarative memory consolidation occurs. Hardest to awaken from; sleep inertia if aroused.', clinical: 'Reduced N3 in aging, Alzheimer (amyloid accumulation). Sleepwalking, night terrors, and bedwetting occur during N3 arousal. Critical for immune function \u2014 sleep deprivation impairs T-cell function.' },
                  { stage: 'REM (Rapid Eye Movement)', pct: '20\u201325%', duration: '10\u201360 min (increases across night)', waves: 'Beta/Gamma (desynchronized, "paradoxical" \u2014 looks like waking EEG)', emoji: '\uD83C\uDF1F', desc: 'Dreaming stage. Brain is highly active (similar to waking) but body is paralyzed (atonia via brainstem inhibition of motor neurons). Rapid conjugate eye movements. Emotional memory processing and creative problem-solving. Cycles lengthen through the night.', clinical: 'REM behavior disorder (RBD): loss of atonia \u2192 acting out dreams \u2014 strong predictor of Parkinson/Lewy body dementia. Narcolepsy: premature REM onset (SOREMPs). Nightmares occur in REM. SSRIs suppress REM sleep.' }
                ]
              },
              { id: 'cerebral_cortex', name: 'Cerebral Cortex (4 Lobes)', x: 0.50, y: 0.04, v: 'a', fn: 'Thin (2\u20134mm) outer layer of gray matter with ~16 billion neurons. 6 layers of cortical columns. Divided into 4 lobes: Frontal (executive function, motor, Broca area), Parietal (somatosensory, spatial), Temporal (auditory, Wernicke area, memory), Occipital (vision). Comprises 80% of brain mass.', clinical: 'Frontal lobe damage: personality change (Phineas Gage case), impaired judgment. Parietal lesions: hemispatial neglect. Temporal lobe epilepsy: most common focal seizure type. Occipital stroke: cortical blindness.', detail: 'Brodmann areas map 52 cytoarchitectural regions. Primary motor cortex (area 4), primary somatosensory (areas 3,1,2), primary visual (area 17), primary auditory (areas 41,42). Prefrontal cortex is last to myelinate (age ~25).' },
              { id: 'cerebellum', name: 'Cerebellum', x: 0.52, y: 0.07, v: 'p', fn: '10% of brain volume but contains ~50% of all neurons (~69 billion). "Little brain" at posterior fossa. Three functional divisions: vestibulocerebellum (balance), spinocerebellum (limb coordination), cerebrocerebellum (motor planning, cognition). Compares intended vs actual movement for error correction.', clinical: 'Cerebellar lesions: ataxia (uncoordinated gait), intention tremor, dysarthria (scanning speech), nystagmus, past-pointing. Cerebellar stroke: acute vertigo and ataxia may be misdiagnosed as inner ear problems. Fetal alcohol syndrome damages cerebellum.', detail: 'Purkinje cells are among the largest neurons, each receiving ~200,000 synaptic inputs. Cerebellar cortex has 3 layers: molecular, Purkinje, granular. Emerging research shows roles in cognition, emotion, and language.' },
              { id: 'brainstem', name: 'Brainstem (Midbrain, Pons, Medulla)', x: 0.50, y: 0.08, v: 'p', fn: 'Connects cerebrum to spinal cord. Three parts: Midbrain (visual/auditory reflexes, substantia nigra for dopamine), Pons (relay between cortex and cerebellum, respiratory rhythm), Medulla oblongata (cardiovascular center, respiratory center, vomiting, swallowing). Reticular formation spans all three \u2014 controls arousal and consciousness.', clinical: 'Brainstem death = legal death in many jurisdictions (irreversible loss of consciousness and vital reflexes). Locked-in syndrome (ventral pons lesion): conscious but unable to move except eyes. Central sleep apnea from medullary dysfunction.', detail: 'Contains nuclei for cranial nerves III\u2013XII. Reticular activating system (RAS) is the brain\'s "on switch" \u2014 damage causes coma. Decussation of pyramids in medulla: motor crossover explains contralateral motor control.' },
              { id: 'hippocampus', name: 'Hippocampus', x: 0.48, y: 0.06, v: 'a', fn: 'Seahorse-shaped structure in medial temporal lobe. Critical for converting short-term memory to long-term memory (consolidation). Contains place cells for spatial navigation (Nobel Prize 2014, O\'Keefe). One of two brain regions with adult neurogenesis (new neuron formation). Theta rhythms during memory encoding.', clinical: 'Alzheimer disease begins here \u2014 hippocampal atrophy on MRI is an early diagnostic marker. Bilateral hippocampal damage (e.g., Patient H.M.) causes severe anterograde amnesia. Chronic stress and cortisol shrink the hippocampus. PTSD associated with reduced hippocampal volume.', detail: 'Memory replay during sleep: hippocampal neurons "replay" daytime experiences during N3 sleep, transferring memories to neocortex. Grid cells in entorhinal cortex provide spatial coordinates to hippocampal place cells.' },
              { id: 'amygdala', name: 'Amygdala', x: 0.46, y: 0.06, v: 'a', fn: 'Almond-shaped nuclei in anterior temporal lobe. Key hub for processing fear, threat detection, and emotional memory. Receives fast "low road" input from thalamus for rapid danger response (before conscious awareness). Modulates memory storage based on emotional arousal (why emotional events are remembered better).', clinical: 'Hyperactive amygdala in anxiety disorders, PTSD, and phobias. Bilateral amygdala damage (Urbach-Wiethe disease): inability to recognize fear in faces, impaired fear conditioning. Amygdala involved in autism spectrum disorder (social threat processing).', detail: 'Fear conditioning pathway: auditory cortex \u2192 lateral amygdala \u2192 central amygdala \u2192 hypothalamus (stress response) + PAG (freezing). Amygdala-prefrontal interactions allow emotional regulation \u2014 basis of CBT therapy.' },
              { id: 'thalamus', name: 'Thalamus', x: 0.50, y: 0.06, v: 'b', fn: 'Paired egg-shaped structures forming 80% of diencephalon. "Gateway to consciousness" \u2014 relays and filters ALL sensory information to cortex (except olfaction). Contains ~60 nuclei organized into functional groups. Generates sleep spindles during N2 sleep. Thalamocortical oscillations underlie consciousness itself.', clinical: 'Thalamic stroke: contralateral sensory loss + thalamic pain syndrome (Dejerine-Roussy: severe, burning pain). Fatal familial insomnia: prion disease destroying thalamus \u2192 complete inability to sleep \u2192 death. Deep brain stimulation of thalamus for essential tremor.', detail: 'Key nuclei: VPL/VPM (somatosensory relay), LGN (visual relay to V1), MGN (auditory relay to A1), pulvinar (attention), anterior nuclear group (memory, Papez circuit).' },
              { id: 'hypothalamus', name: 'Hypothalamus', x: 0.50, y: 0.07, v: 'a', fn: 'Small (4g, ~1% of brain) but controls: body temperature, hunger/thirst, circadian rhythm (SCN = master clock), autonomic nervous system, pituitary gland (via hypothalamic-hypophyseal portal system). Suprachiasmatic nucleus (SCN) receives light input from retina and entrains 24-hr circadian cycle.', clinical: 'Hypothalamic dysfunction: diabetes insipidus (no ADH), obesity (ventromedial lesion = hyperphagia), anorexia (lateral lesion = aphagia). Circadian disruption linked to depression, metabolic syndrome, cancer. Jet lag = SCN resynchronizing.', detail: 'Thermostat analogy: anterior hypothalamus triggers cooling (vasodilation, sweating); posterior hypothalamus triggers warming (shivering, vasoconstriction). Fever = elevated set point by prostaglandins from infection.' },
              { id: 'corpus_callosum', name: 'Corpus Callosum', x: 0.50, y: 0.05, v: 'b', fn: 'Largest white matter structure in brain. ~200 million axons connecting left and right hemispheres. Enables interhemispheric communication and integration. Develops throughout childhood; fully myelinated by age ~12. Four regions: rostrum, genu, body, splenium.', clinical: 'Split-brain patients (callosotomy for epilepsy): each hemisphere operates independently \u2014 left hand "doesn\'t know" what right hand is doing (Roger Sperry, Nobel 1981). Agenesis of corpus callosum: congenital absence, often incidental finding. Callosal lesions in MS.', detail: 'Split-brain experiments revealed hemispheric specialization: left hemisphere = language, logic; right hemisphere = spatial, holistic processing. Information presented to one visual field is processed by contralateral hemisphere.' },
              { id: 'basal_ganglia', name: 'Basal Ganglia', x: 0.48, y: 0.05, v: 'a', fn: 'Deep gray matter nuclei: caudate, putamen (together = striatum), globus pallidus. With substantia nigra and subthalamic nucleus, form circuits for motor initiation/inhibition, habit formation, reward learning, and procedural memory. Direct pathway facilitates movement; indirect pathway inhibits movement.', clinical: 'Parkinson disease: dopamine depletion in substantia nigra \u2192 bradykinesia, rigidity, resting tremor, postural instability. Huntington disease: caudate/putamen degeneration \u2192 chorea (involuntary dance-like movements). OCD linked to caudate hyperactivity. Deep brain stimulation of subthalamic nucleus for Parkinson.', detail: 'Dopamine from substantia nigra modulates the direct (D1, excitatory) and indirect (D2, inhibitory) pathways. Loss of this modulation in Parkinson creates the characteristic difficulty initiating movement.' },
              { id: 'spinal_cord', name: 'Spinal Cord', x: 0.50, y: 0.30, v: 'p', fn: 'Extends from foramen magnum to L1\u2013L2 (conus medullaris). Conducts sensory/motor signals. 31 segments, each with dorsal (sensory) and ventral (motor) roots.', clinical: 'Spinal cord injury: above C4 \u2192 quadriplegia + ventilator. Complete transection \u2192 loss of motor/sensory below level.' },
              { id: 'vagus', name: 'Vagus Nerve (CN X)', x: 0.44, y: 0.14, v: 'a', fn: 'Longest cranial nerve. Parasympathetic innervation to thoracic and abdominal viscera. Slows heart rate, increases GI motility, controls laryngeal muscles.', clinical: 'Vagal stimulation: carotid sinus massage, Valsalva maneuver for SVT. Vagus nerve stimulator for epilepsy/depression. Recurrent laryngeal nerve injury \u2192 hoarseness.' },
              { id: 'sciatic', name: 'Sciatic Nerve', x: 0.55, y: 0.50, v: 'p', fn: 'Largest/longest nerve in body. L4\u2013S3 roots. Exits pelvis through greater sciatic foramen below piriformis. Divides into tibial and common peroneal nerves above knee.', clinical: 'Sciatica: radiculopathy from herniated disc (L4\u2013S1). Piriformis syndrome mimics sciatica. IM injection site avoidance.' },
              { id: 'brachial_plexus', name: 'Brachial Plexus', x: 0.34, y: 0.16, v: 'a', fn: 'C5\u2013T1 nerve roots form trunks, divisions, cords, branches. Innervates entire upper limb. "Robert Taylor Drinks Cold Beer" (roots, trunks, divisions, cords, branches).', clinical: 'Erb-Duchenne palsy (C5\u2013C6): "waiter\'s tip" position. Klumpke palsy (C8\u2013T1): claw hand. Birth injuries, motorcycle accidents.' },
              { id: 'median', name: 'Median Nerve', x: 0.22, y: 0.38, v: 'a', fn: 'C5\u2013T1 via lateral and medial cords. Motor: forearm pronators, wrist/finger flexors, thenar muscles. Sensory: palmar lateral 3.5 digits.', clinical: 'Carpal tunnel syndrome: median nerve compression under flexor retinaculum. Hand of benediction (can\'t flex index/middle fingers).' },
              { id: 'ulnar_n', name: 'Ulnar Nerve', x: 0.78, y: 0.34, v: 'a', fn: 'C8\u2013T1 via medial cord. Motor: intrinsic hand muscles (interossei, hypothenar), FCU, medial FDP. Sensory: medial 1.5 digits.', clinical: '"Funny bone" \u2014 vulnerable at medial epicondyle. Cubital tunnel syndrome. Claw hand deformity. Froment sign.' },
              { id: 'femoral_n', name: 'Femoral Nerve', x: 0.40, y: 0.48, v: 'a', fn: 'L2\u2013L4 via lumbar plexus. Motor: quadriceps (knee extension), iliacus, sartorius. Sensory: anterior thigh, medial leg (saphenous branch).', clinical: 'Femoral neuropathy: difficulty climbing stairs, absent knee jerk. L4 radiculopathy mimics. Femoral nerve block for hip surgery.' },
              { id: 'sympathetic', name: 'Sympathetic Chain', x: 0.54, y: 0.30, v: 'p', fn: 'Paired paravertebral ganglia from C1 to coccyx. "Fight or flight": increases HR, dilates pupils, bronchodilation, vasoconstriction, inhibits GI.', clinical: 'Horner syndrome (sympathetic disruption): miosis, ptosis, anhidrosis. Sympathectomy for hyperhidrosis.' },
              { id: 'cranial_n', name: 'Cranial Nerves (I-XII)', x: 0.50, y: 0.08, v: 'a', fn: '12 pairs: olfactory, optic, oculomotor, trochlear, trigeminal, abducens, facial, vestibulocochlear, glossopharyngeal, vagus, spinal accessory, hypoglossal.', clinical: 'CN III palsy: "down and out" eye, ptosis, dilated pupil. CN VII (Bell palsy): facial droop. CN XII: tongue deviates toward lesion.' }
            ]
          },

          lymphatic: {
            name: 'Lymphatic', icon: '\uD83D\uDFE2', color: '#dcfce7', accent: '#16a34a',
            desc: 'Returns interstitial fluid, absorbs dietary fat, immune surveillance \u2014 600\u2013700 lymph nodes, thymus, spleen.',
            structures: [
              { id: 'thymus', name: 'Thymus', x: 0.50, y: 0.19, v: 'a', fn: 'Primary lymphoid organ in anterior mediastinum. T-cell maturation and positive/negative selection. Largest in childhood, involutes after puberty (replaced by fat).', clinical: 'Thymoma: associated with myasthenia gravis (anti-AChR antibodies). DiGeorge syndrome: thymic aplasia \u2192 T-cell deficiency.' },
              { id: 'spleen', name: 'Spleen', x: 0.58, y: 0.30, v: 'a', fn: 'Largest lymphoid organ. Filters blood: removes old RBCs (red pulp), mounts immune responses to blood-borne antigens (white pulp). Stores 1/3 of platelets.', clinical: 'Splenomegaly in mono, malaria, leukemia. Splenic rupture from trauma \u2192 emergency splenectomy. Post-splenectomy: encapsulated bacteria risk.' },
              { id: 'tonsils', name: 'Tonsils (Waldeyer Ring)', x: 0.50, y: 0.11, v: 'a', fn: 'Pharyngeal (adenoids), palatine, tubal, and lingual tonsils form a lymphoid ring at the oropharyngeal entrance. First line of defense against inhaled/ingested pathogens.', clinical: 'Tonsillitis, peritonsillar abscess ("quinsy"). Adenoid hypertrophy \u2192 mouth breathing, sleep apnea in children.' },
              { id: 'cervical_ln', name: 'Cervical Lymph Nodes', x: 0.56, y: 0.13, v: 'a', fn: 'Drain head and neck including scalp, face, oral cavity, pharynx. Deep cervical chain runs along IJV. Virchow node (left supraclavicular) drains thoracic duct.', clinical: 'Enlarged: infection, lymphoma, metastatic cancer. Virchow node enlargement \u2192 suspect GI malignancy (Troisier sign).' },
              { id: 'axillary_ln', name: 'Axillary Lymph Nodes', x: 0.32, y: 0.22, v: 'a', fn: '5 groups draining upper limb, breast, chest wall. Sentinel lymph node biopsy in breast cancer staging.', clinical: 'Breast cancer staging depends on axillary LN involvement. Axillary dissection may cause lymphedema of arm.' },
              { id: 'inguinal_ln', name: 'Inguinal Lymph Nodes', x: 0.44, y: 0.44, v: 'a', fn: 'Superficial group drains lower limb, perineum, lower abdominal wall, external genitalia. Deep group drains along femoral vein.', clinical: 'Lymphadenopathy in STIs, lower limb infections, lymphoma. Buboes in lymphogranuloma venereum, plague.' },
              { id: 'thoracic_duct', name: 'Thoracic Duct', x: 0.48, y: 0.26, v: 'p', fn: 'Main lymphatic channel (40 cm). Drains \u00BE of body (everything except right upper quadrant). Empties into left subclavian/internal jugular junction (left venous angle).', clinical: 'Chylothorax from thoracic duct injury (trauma, surgery). Milky pleural effusion with high triglycerides.' },
              { id: 'bone_marrow', name: 'Bone Marrow', x: 0.42, y: 0.57, v: 'a', fn: 'Primary lymphoid organ. Red marrow produces all blood cells (hematopoiesis) including lymphocyte precursors. Adults: mainly in axial skeleton, proximal femur/humerus.', clinical: 'Leukemia (malignant WBC proliferation). Aplastic anemia. Bone marrow biopsy from posterior iliac crest. Bone marrow transplant.' }
            ]
          },

          organs: {
            name: 'Organ Systems', icon: '\uD83C\uDFE5', color: '#e0f2fe', accent: '#0284c7',
            desc: 'Major visceral organs \u2014 respiration, digestion, filtration, endocrine regulation.',
            structures: [
              { id: 'lungs', name: 'Lungs', x: 0.42, y: 0.24, v: 'a', fn: 'Right lung: 3 lobes (superior, middle, inferior). Left lung: 2 lobes + lingula (cardiac notch). ~300 million alveoli provide ~70 m\u00B2 surface area for gas exchange.', clinical: 'Pneumonia, COPD, asthma, lung cancer (#1 cancer killer). Pneumothorax. Right bronchus more vertical \u2192 foreign body aspiration.' },
              { id: 'liver', name: 'Liver', x: 0.56, y: 0.30, v: 'a', fn: 'Largest internal organ (1.5 kg). 2 anatomical lobes (right larger). Functions: bile production, detoxification, protein synthesis (albumin, clotting factors), glycogen storage, drug metabolism.', clinical: 'Hepatitis (viral A/B/C), cirrhosis, hepatocellular carcinoma. Liver failure: jaundice, coagulopathy, encephalopathy. Transplantation.' },
              { id: 'stomach', name: 'Stomach', x: 0.55, y: 0.33, v: 'a', fn: 'J-shaped muscular sac. Regions: cardia, fundus, body, antrum, pylorus. Produces HCl (pH 1\u20132), pepsin, intrinsic factor (B12 absorption). Capacity ~1L.', clinical: 'Peptic ulcer disease (H. pylori, NSAIDs). Gastric cancer. GERD. Gastrectomy may cause dumping syndrome, B12 deficiency.' },
              { id: 'kidneys', name: 'Kidneys', x: 0.58, y: 0.36, v: 'p', fn: 'Bean-shaped, retroperitoneal at T12\u2013L3. Each has ~1 million nephrons. Filter 180L/day, produce 1\u20132L urine. Regulate fluid balance, electrolytes, acid-base, blood pressure (RAAS).', clinical: 'CKD, nephrotic/nephritic syndrome, kidney stones, renal cell carcinoma. Right kidney lower due to liver. Dialysis when GFR <15.' },
              { id: 'sm_intestine', name: 'Small Intestine', x: 0.50, y: 0.38, v: 'a', fn: '6m long: duodenum (25cm, C-shaped), jejunum (2.5m), ileum (3.5m). Primary site of nutrient absorption. Villi and microvilli increase surface area to ~200 m\u00B2.', clinical: 'Celiac disease (gluten sensitivity), Crohn disease (often terminal ileum), SBO (adhesions #1 cause), duodenal ulcers.' },
              { id: 'lg_intestine', name: 'Large Intestine', x: 0.50, y: 0.40, v: 'a', fn: '1.5m: cecum, ascending, transverse, descending, sigmoid colon, rectum. Absorbs water and electrolytes. Houses gut microbiome (~100 trillion bacteria). Forms and stores feces.', clinical: 'Colorectal cancer (3rd most common cancer). Diverticulosis/diverticulitis. Ulcerative colitis. Appendicitis (McBurney point).' },
              { id: 'pancreas', name: 'Pancreas', x: 0.52, y: 0.34, v: 'a', fn: 'Retroperitoneal organ. Exocrine (98%): digestive enzymes (lipase, amylase, trypsinogen) and bicarbonate. Endocrine (2%): islets of Langerhans \u2014 insulin (\u03B2), glucagon (\u03B1).', clinical: 'Acute pancreatitis (gallstones, alcohol). Pancreatic cancer (poor prognosis, 5-yr survival <10%). Type 1 diabetes (autoimmune \u03B2-cell destruction).' },
              { id: 'gallbladder', name: 'Gallbladder', x: 0.55, y: 0.31, v: 'a', fn: 'Pear-shaped sac on inferior liver surface. Stores and concentrates bile (5\u201310\u00D7). Contracts in response to CCK after fatty meals to release bile into duodenum.', clinical: 'Cholelithiasis (gallstones, 10\u201315% of adults). Cholecystitis. Murphy sign. Cholecystectomy is one of most common surgeries.' },
              { id: 'bladder', name: 'Urinary Bladder', x: 0.50, y: 0.44, v: 'a', fn: 'Distensible muscular sac. Stores 400\u2013600mL urine. Detrusor muscle contracts for micturition. Internal sphincter (involuntary), external sphincter (voluntary, pudendal nerve).', clinical: 'UTIs (more common in females due to short urethra). Bladder cancer (painless hematuria). Neurogenic bladder in spinal cord injury.' },
              { id: 'diaphragm', name: 'Diaphragm', x: 0.50, y: 0.27, v: 'a', fn: 'Primary muscle of respiration. Dome-shaped, separates thorax from abdomen. Contracts and flattens during inspiration \u2192 negative intrathoracic pressure. Three openings: T8 (IVC), T10 (esophagus), T12 (aorta).', clinical: 'Hiatal hernia (stomach through esophageal hiatus). Diaphragmatic paralysis from phrenic nerve injury (C3\u2013C5). "C3, 4, 5 keeps the diaphragm alive."' },
              { id: 'thyroid', name: 'Thyroid Gland', x: 0.50, y: 0.135, v: 'a', fn: 'Butterfly-shaped, anterior neck at C5\u2013T1. Produces T3/T4 (metabolism, growth, development) and calcitonin (lowers blood calcium). Requires iodine.', clinical: 'Hypothyroidism (Hashimoto): fatigue, weight gain, cold intolerance. Hyperthyroidism (Graves): weight loss, tremor, exophthalmos. Thyroid nodules/cancer.' },
              { id: 'adrenals', name: 'Adrenal Glands', x: 0.56, y: 0.34, v: 'p', fn: 'Suprarenal glands. Cortex (3 zones): zona glomerulosa (aldosterone), zona fasciculata (cortisol), zona reticularis (androgens). Medulla: epinephrine/norepinephrine.', clinical: 'Addison disease (cortical insufficiency): hypotension, hyperpigmentation. Cushing syndrome (cortisol excess). Pheochromocytoma (medullary tumor \u2192 episodic HTN).' }
            ]
          },

          integumentary: {
            name: 'Integumentary', icon: '\uD83E\uDDF4', color: '#fef9c3', accent: '#a16207',
            desc: 'Skin (largest organ, ~2m\u00B2), hair, nails, glands \u2014 barrier, thermoregulation, sensation, vitamin D synthesis.',
            structures: [
              { id: 'epidermis', name: 'Epidermis', x: 0.50, y: 0.15, v: 'a', fn: 'Outermost skin layer. 5 strata (thick skin): basale, spinosum, granulosum, lucidum, corneum. Keratinocytes (90%), melanocytes (8%), Langerhans cells (immune), Merkel cells (touch). Avascular \u2014 nutrients diffuse from dermis. Turnover every 28\u201330 days.', clinical: 'Psoriasis: hyperproliferation (turnover 3\u20134 days). Melanoma from melanocyte mutation. Eczema (atopic dermatitis). Burns classified by depth of epidermal/dermal involvement.' },
              { id: 'dermis', name: 'Dermis', x: 0.50, y: 0.20, v: 'a', fn: 'Connective tissue layer beneath epidermis. Papillary dermis (loose CT, dermal papillae for fingerprints) and reticular dermis (dense irregular CT, collagen/elastin for strength/elasticity). Contains blood vessels, nerves, hair follicles, glands.', clinical: 'Stretch marks (striae): torn collagen fibers. Cellulitis: bacterial infection of dermis. Dermal injection site for TB test (Mantoux). Keloid scarring from excess collagen.' },
              { id: 'hypodermis', name: 'Hypodermis (Subcutaneous)', x: 0.50, y: 0.25, v: 'a', fn: 'Deep to dermis (not technically skin). Adipose tissue for insulation, energy storage, and mechanical cushioning. Contains large blood vessels and nerves. Subcutaneous injection site.', clinical: 'Lipomas (benign fat tumors). Subcutaneous emphysema (air under skin, crepitus). Insulin and heparin injected subcutaneously. Obesity increases this layer.' },
              { id: 'hair_follicle', name: 'Hair Follicles', x: 0.50, y: 0.06, v: 'a', fn: '~5 million follicles (100,000 on scalp). Hair shaft: medulla, cortex, cuticle. Arrector pili muscle causes goosebumps. Hair growth cycle: anagen (growth, 2\u20136 yrs), catagen (regression), telogen (rest/shedding). Stem cells in bulge region.', clinical: 'Alopecia areata (autoimmune hair loss). Folliculitis (infected follicle). Male pattern baldness (androgenetic alopecia, DHT-mediated). Hirsutism from excess androgens.' },
              { id: 'sweat_glands', name: 'Sweat Glands', x: 0.30, y: 0.30, v: 'a', fn: 'Eccrine glands (~3 million): watery sweat for thermoregulation, open directly to skin surface, densest on palms/soles. Apocrine glands: thicker secretion into hair follicles in axillae/groin, active after puberty, bacterial breakdown causes body odor.', clinical: 'Hyperhidrosis (excessive sweating). Anhidrosis in Horner syndrome. Heat stroke when sweating fails. Cystic fibrosis: elevated sweat chloride (diagnostic sweat test).' },
              { id: 'sebaceous', name: 'Sebaceous Glands', x: 0.45, y: 0.10, v: 'a', fn: 'Holocrine glands associated with hair follicles (except palms/soles). Produce sebum (lipid mixture) that waterproofs skin and hair, prevents drying, has bactericidal properties. Activity increases at puberty (androgens).', clinical: 'Acne vulgaris: sebaceous gland hyperactivity + P. acnes bacteria + follicular plugging. Sebaceous cysts. Isotretinoin (Accutane) shrinks sebaceous glands for severe acne.' },
              { id: 'nails', name: 'Nails', x: 0.16, y: 0.44, v: 'a', fn: 'Keratinized epidermal derivatives. Nail plate grows from nail matrix (under proximal fold) at ~3mm/month (fingernails) or ~1mm/month (toenails). Lunula: visible part of matrix. Nail bed highly vascular (pink color).', clinical: 'Clubbing: sign of chronic hypoxia (lung/heart disease). Koilonychia (spoon nails): iron deficiency. Onychomycosis (fungal infection). Splinter hemorrhages: endocarditis. Beau lines: illness/stress.' },
              { id: 'melanocytes', name: 'Melanocytes & Pigmentation', x: 0.50, y: 0.35, v: 'a', fn: 'Neural crest-derived cells in stratum basale. Produce melanin (eumelanin=brown/black, pheomelanin=red/yellow) in melanosomes, transferred to surrounding keratinocytes via dendrites. UV radiation increases melanin production (tanning). Same number in all races; differences are in melanin amount/type.', clinical: 'Vitiligo: autoimmune melanocyte destruction (depigmented patches). Albinism: defective melanin synthesis. Melanoma: deadliest skin cancer, arises from melanocytes, ABCDE criteria for detection.' }
            ]
          },

          respiratory: {
            name: 'Respiratory', icon: '\uD83E\uDEC1', color: '#e0f2fe', accent: '#0369a1',
            desc: 'Oxygen delivery and CO\u2082 removal \u2014 ~12\u201320 breaths/min, ~6L air/min, 300 million alveoli.',
            structures: [
              { id: 'nasal_cavity', name: 'Nasal Cavity & Sinuses', x: 0.50, y: 0.06, v: 'a', fn: 'Warms, humidifies, and filters inspired air. Nasal conchae (turbinates) increase surface area. Rich vascular plexus (Kiesselbach plexus) on septum. Paranasal sinuses (frontal, maxillary, ethmoid, sphenoid) lighten skull, add resonance to voice.', clinical: 'Epistaxis (nosebleed): 90% anterior from Kiesselbach plexus. Sinusitis. Deviated septum. Nasal polyps in chronic rhinitis/asthma/CF. Anosmia from COVID-19.' },
              { id: 'pharynx', name: 'Pharynx', x: 0.50, y: 0.10, v: 'a', fn: 'Muscular tube from skull base to C6. Three regions: nasopharynx (adenoids, Eustachian tube), oropharynx (palatine tonsils), laryngopharynx (diverges into esophagus and larynx). Shared airway and food passage.', clinical: 'Pharyngitis (sore throat): viral most common, Group A Strep requires antibiotics (prevent rheumatic fever). Obstructive sleep apnea from pharyngeal collapse. Pharyngeal cancer (HPV-related rising).' },
              { id: 'larynx', name: 'Larynx (Voice Box)', x: 0.50, y: 0.13, v: 'a', fn: 'Cartilaginous framework at C3\u2013C6. Thyroid cartilage (Adam\'s apple), cricoid (complete ring), arytenoids (move vocal cords). True vocal cords (folds) vibrate for phonation. Epiglottis closes during swallowing to protect airway.', clinical: 'Laryngitis (hoarseness). Recurrent laryngeal nerve injury (thyroid surgery) \u2192 vocal cord paralysis. Croup in children (barking cough). Laryngeal cancer from smoking. Emergency cricothyrotomy through cricothyroid membrane.' },
              { id: 'trachea', name: 'Trachea', x: 0.50, y: 0.17, v: 'a', fn: '10\u201312 cm tube from C6 to T4\u2013T5 (carina). 16\u201320 C-shaped cartilage rings (open posteriorly to allow esophageal expansion). Pseudostratified ciliated columnar epithelium with goblet cells \u2014 mucociliary escalator traps and clears particles.', clinical: 'Tracheostomy for prolonged ventilation. Tracheomalacia (softened cartilage, floppy airway). Foreign body aspiration: right main bronchus more vertical. Tracheal intubation for general anesthesia.' },
              { id: 'bronchi', name: 'Bronchial Tree', x: 0.46, y: 0.22, v: 'a', fn: 'Trachea \u2192 R/L main bronchi \u2192 lobar bronchi (3R, 2L) \u2192 segmental \u2192 terminal bronchioles \u2192 respiratory bronchioles. Progressive loss of cartilage, increase in smooth muscle. ~23 generations of branching. Total cross-section increases enormously.', clinical: 'Asthma: bronchospasm + inflammation of bronchi/bronchioles. Bronchitis: inflammation of bronchial mucosa. Bronchiectasis: permanent dilation from chronic infection. Bronchoscopy for diagnosis/biopsy.' },
              { id: 'alveoli', name: 'Alveoli', x: 0.54, y: 0.26, v: 'a', fn: '~300 million alveoli provide ~70m\u00B2 gas exchange surface. Type I pneumocytes (95% surface, gas exchange). Type II pneumocytes (surfactant production, reduces surface tension). Alveolar macrophages (dust cells) phagocytose particles. Blood-air barrier: 0.5\u03BCm thick.', clinical: 'Pneumonia: alveolar infection/inflammation. ARDS: diffuse alveolar damage, pulmonary edema. Emphysema: alveolar wall destruction (COPD). Neonatal RDS: surfactant deficiency in premature infants.' },
              { id: 'pleura', name: 'Pleura', x: 0.58, y: 0.24, v: 'a', fn: 'Visceral pleura (covers lungs) and parietal pleura (lines chest wall) create pleural cavity containing ~5mL serous fluid. Surface tension keeps lungs expanded. Negative intrapleural pressure (\u22124 cmH\u2082O) prevents lung collapse.', clinical: 'Pneumothorax: air in pleural space \u2192 lung collapse. Tension pneumothorax: life-threatening, mediastinal shift. Pleural effusion: fluid collection (transudate vs exudate). Mesothelioma: asbestos-related pleural cancer.' },
              { id: 'resp_muscles', name: 'Respiratory Muscles', x: 0.42, y: 0.28, v: 'a', fn: 'Inspiration: diaphragm (70% of quiet breathing, C3\u2013C5 phrenic nerve) + external intercostals. Forced inspiration adds: SCM, scalenes, pectoralis minor. Expiration: passive in quiet breathing (elastic recoil). Forced expiration: internal intercostals + abdominals.', clinical: 'Phrenic nerve palsy \u2192 hemidiaphragm paralysis. C3\u2013C5 spinal cord injury \u2192 respiratory failure. Myasthenia gravis: respiratory muscle weakness (myasthenic crisis). Flail chest impairs breathing mechanics.' }
            ]
          },

          endocrine: {
            name: 'Endocrine', icon: '\u2697\uFE0F', color: '#fae8ff', accent: '#a21caf',
            desc: 'Hormone-producing glands \u2014 regulate metabolism, growth, reproduction, stress, homeostasis via chemical messengers.',
            structures: [
              { id: 'pituitary', name: 'Pituitary Gland (Hypophysis)', x: 0.50, y: 0.07, v: 'a', fn: 'Pea-sized "master gland" in sella turcica. Anterior (adenohypophysis): GH, ACTH, TSH, FSH, LH, prolactin. Posterior (neurohypophysis): stores/releases oxytocin and ADH (made in hypothalamus). Regulated by hypothalamic releasing/inhibiting hormones.', clinical: 'Pituitary adenoma: visual field defect (bitemporal hemianopia from chiasm compression). Acromegaly (excess GH in adults). Hyperprolactinemia \u2192 galactorrhea, amenorrhea. Panhypopituitarism.' },
              { id: 'pineal', name: 'Pineal Gland', x: 0.50, y: 0.05, v: 'p', fn: 'Small endocrine gland in epithalamus. Produces melatonin (from serotonin, regulated by light/dark cycle via SCN). Melatonin regulates circadian rhythm and has antioxidant properties. Calcifies with age (visible on X-ray as a midline marker).', clinical: 'Pineal tumors may cause obstructive hydrocephalus (compresses cerebral aqueduct). Parinaud syndrome: upgaze palsy. Jet lag and shift-work disorder related to melatonin disruption. Exogenous melatonin used as sleep aid.' },
              { id: 'parathyroid', name: 'Parathyroid Glands', x: 0.52, y: 0.14, v: 'p', fn: '4 small glands on posterior thyroid surface. Produce PTH (parathyroid hormone): raises blood calcium by increasing bone resorption, renal Ca\u00B2\u207A reabsorption, and activating vitamin D. PTH and calcitonin are antagonists.', clinical: 'Hyperparathyroidism: "bones, stones, groans, and psychiatric moans" (osteoporosis, kidney stones, abdominal pain, depression). Hypoparathyroidism: hypocalcemia \u2192 tetany, Chvostek/Trousseau signs. Accidental removal during thyroidectomy.' },
              { id: 'islets', name: 'Islets of Langerhans', x: 0.52, y: 0.34, v: 'a', fn: 'Endocrine clusters within pancreas (~1\u20132 million islets). \u03B2-cells (70%): insulin (lowers glucose). \u03B1-cells (20%): glucagon (raises glucose). \u03B4-cells: somatostatin (inhibits both). PP-cells: pancreatic polypeptide. Islets are highly vascularized.', clinical: 'Type 1 diabetes: autoimmune \u03B2-cell destruction (insulin-dependent). Type 2 diabetes: insulin resistance + \u03B2-cell dysfunction. Insulinoma: insulin-secreting tumor \u2192 hypoglycemia. Islet transplantation research.' },
              { id: 'ovaries_endo', name: 'Ovaries (Endocrine)', x: 0.46, y: 0.44, v: 'a', fn: 'Produce estrogen (follicular cells) and progesterone (corpus luteum). Estrogen: secondary sex characteristics, bone density, endometrial proliferation. Progesterone: maintains pregnancy, endometrial secretion. Also produce inhibin and small amounts of testosterone.', clinical: 'PCOS: hyperandrogenism, anovulation, polycystic ovaries. Premature ovarian failure. Menopause: estrogen decline \u2192 hot flashes, osteoporosis, cardiovascular risk. HRT replaces declining hormones.' },
              { id: 'testes_endo', name: 'Testes (Endocrine)', x: 0.50, y: 0.48, v: 'a', fn: 'Leydig cells (interstitial) produce testosterone under LH stimulation. Testosterone: male secondary sex characteristics, spermatogenesis (with FSH), muscle mass, bone density, libido. Also converted to DHT (5\u03B1-reductase) and estradiol (aromatase).', clinical: 'Hypogonadism: low testosterone \u2192 infertility, decreased libido, osteoporosis. Testosterone replacement therapy. Anabolic steroid abuse: testicular atrophy, cardiovascular risk. Klinefelter syndrome (47,XXY).' },
              { id: 'hypothal_endo', name: 'Hypothalamic-Pituitary Axis', x: 0.50, y: 0.04, v: 'a', fn: 'Master regulatory cascade. Hypothalamus releases hormones into hypophyseal portal system \u2192 anterior pituitary. Key axes: HPA (stress/cortisol), HPT (thyroid/T3/T4), HPG (gonadal/sex hormones). Negative feedback loops maintain homeostasis.', clinical: 'HPA axis dysregulation in chronic stress, depression, PTSD. Central hypothyroidism (TSH deficiency). Kallmann syndrome: GnRH deficiency \u2192 hypogonadism + anosmia. Sheehan syndrome: pituitary necrosis postpartum.' },
              { id: 'adrenal_endo', name: 'Adrenal Cortex Zones', x: 0.58, y: 0.34, v: 'a', fn: 'Three zones ("GFR = salt, sugar, sex"): Glomerulosa \u2192 aldosterone (mineralocorticoid, Na\u207A/K\u207A balance, RAAS). Fasciculata \u2192 cortisol (glucocorticoid, stress, anti-inflammatory). Reticularis \u2192 DHEA/androgens (weak androgens).', clinical: 'Conn syndrome: aldosterone-secreting adenoma \u2192 hypertension, hypokalemia. Cushing syndrome: cortisol excess (moon face, buffalo hump, striae). Congenital adrenal hyperplasia (21-hydroxylase deficiency): ambiguous genitalia.' }
            ]
          },

          reproductive: {
            name: 'Reproductive', icon: '\uD83D\uDC76', color: '#fce7f3', accent: '#db2777',
            desc: 'Male and female reproductive organs \u2014 gamete production, fertilization, fetal development, hormonal regulation.',
            structures: [
              { id: 'testes_repro', name: 'Testes', x: 0.50, y: 0.52, v: 'a', fn: 'Paired oval organs in scrotum (2\u20133\u00B0C below body temperature for spermatogenesis). Each contains ~250 lobules with seminiferous tubules (sperm production, 64\u201372 day cycle). Sertoli cells provide nutritive/structural support. ~200 million sperm produced daily.', clinical: 'Cryptorchidism (undescended testis): infertility and cancer risk if uncorrected. Testicular torsion: surgical emergency (6hr window). Testicular cancer: most common solid tumor in men 15\u201335.' },
              { id: 'epididymis', name: 'Epididymis', x: 0.52, y: 0.50, v: 'p', fn: 'Coiled tube (~6m uncoiled) on posterior testis. Three regions: head (receives sperm from efferent ductules), body, tail (stores mature sperm). Sperm undergo maturation during 12-day transit \u2014 gain motility and fertilizing capacity.', clinical: 'Epididymitis: infection (STI in young men, UTI organisms in older men) \u2192 scrotal pain/swelling. Positive Prehn sign (pain relief with elevation) distinguishes from torsion. Epididymal cyst (spermatocele).' },
              { id: 'prostate', name: 'Prostate Gland', x: 0.50, y: 0.46, v: 'a', fn: 'Walnut-sized gland surrounding prostatic urethra below bladder. Produces ~30% of seminal fluid (citric acid, PSA, zinc, proteolytic enzymes). Five lobes; peripheral zone largest and most common site of cancer. Grows throughout life under DHT influence.', clinical: 'BPH (benign prostatic hyperplasia): urinary obstruction in elderly men. Prostate cancer: most common male cancer, detected by PSA and DRE. Prostatitis. TURP (transurethral resection) for BPH.' },
              { id: 'uterus', name: 'Uterus', x: 0.50, y: 0.42, v: 'a', fn: 'Pear-shaped muscular organ. Regions: fundus, body, cervix. Three layers: endometrium (cyclically shed in menstruation), myometrium (smooth muscle, contractions during labor), perimetrium (serosa). Normally anteverted and anteflexed. Capacity expands 500\u00D7 in pregnancy.', clinical: 'Uterine fibroids (leiomyomas): most common pelvic tumor in women. Endometriosis: endometrial tissue outside uterus. Endometrial cancer (most common GYN malignancy). C-section incision through all layers.' },
              { id: 'ovaries_repro', name: 'Ovaries', x: 0.42, y: 0.44, v: 'a', fn: 'Paired, almond-sized organs lateral to uterus. Contain ~1\u20132 million oocytes at birth (depleted to ~400,000 by puberty, ~400 ovulated in lifetime). Follicular development: primordial \u2192 primary \u2192 secondary \u2192 Graafian follicle \u2192 ovulation \u2192 corpus luteum.', clinical: 'Ovarian cysts (functional most common). Ovarian cancer: "silent killer" (often diagnosed late). PCOS. Ovarian torsion: surgical emergency. Ectopic pregnancy if fertilized egg implants in tube instead of uterus.' },
              { id: 'fallopian', name: 'Fallopian Tubes (Oviducts)', x: 0.38, y: 0.41, v: 'a', fn: '~10cm tubes connecting ovaries to uterus. Regions: infundibulum (fimbriae catch ovulated oocyte), ampulla (usual site of fertilization), isthmus (narrow, connects to uterus). Ciliated epithelium and peristalsis transport ovum/embryo toward uterus over 3\u20134 days.', clinical: 'Ectopic pregnancy (95% in fallopian tube): life-threatening rupture risk. PID (pelvic inflammatory disease, often from Chlamydia/Gonorrhea): scarring \u2192 infertility. Tubal ligation for permanent contraception. Salpingectomy.' },
              { id: 'mammary', name: 'Mammary Glands', x: 0.42, y: 0.24, v: 'a', fn: 'Modified apocrine sweat glands. 15\u201320 lobes of glandular tissue, each with lactiferous duct opening at nipple. Development: estrogen (ductal growth), progesterone (lobular growth), prolactin (milk production), oxytocin (milk ejection/let-down reflex).', clinical: 'Breast cancer: most common cancer in women. BRCA1/2 gene mutations increase risk. Fibrocystic changes (benign, cyclical tenderness). Mastitis: infection during lactation. Mammography screening from age 40\u201350.' },
              { id: 'placenta', name: 'Placenta', x: 0.50, y: 0.38, v: 'a', fn: 'Temporary organ during pregnancy (develops from trophoblast). Maternal-fetal exchange: O\u2082, nutrients (maternal \u2192 fetal), CO\u2082, waste (fetal \u2192 maternal). Produces hCG, progesterone, estrogen, hPL. Barrier to most pathogens (not all: TORCH infections cross). Weighs ~500g at term.', clinical: 'Placenta previa: placenta covers cervical os \u2192 painless bleeding. Placental abruption: premature separation \u2192 painful bleeding, emergency. Pre-eclampsia: abnormal placentation \u2192 HTN, proteinuria. hCG is the basis of pregnancy tests.' }
            ]
          }

        };

        // ══════════════════════════════════════
        // FUN FACTS
        // ══════════════════════════════════════
        var FUN_FACTS = {
          skeletal: [
            'Babies are born with about 270 bones, but adults only have 206 because many fuse together as you grow!',
            'The smallest bone in your body is the stirrup (stapes) in your ear \u2014 it is only about 3mm long!',
            'Bone is stronger than steel by weight \u2014 a cubic inch of bone can withstand forces of up to 19,000 pounds!'
          ],
          muscular: [
            'You use about 200 muscles just to take a single step when walking!',
            'The heart is the hardest-working muscle \u2014 it beats about 100,000 times a day without ever resting.',
            'The gluteus maximus is the largest muscle in your body, and the stapedius in your ear is the smallest!'
          ],
          circulatory: [
            'Your blood vessels, if stretched end to end, would wrap around the Earth about 2.5 times \u2014 that is over 60,000 miles!',
            'Your heart pumps about 2,000 gallons of blood every single day without you thinking about it.',
            'Red blood cells live for only about 120 days, and your bone marrow makes about 2 million new ones every second!'
          ],
          nervous: [
            'Your brain has about 86 billion neurons, and each one can connect to up to 10,000 others \u2014 making over 100 trillion connections!',
            'Nerve impulses travel at speeds up to 268 mph \u2014 that is faster than a Formula 1 race car!',
            'The human brain generates about 20 watts of power \u2014 enough to light a small LED bulb!'
          ],
          lymphatic: [
            'Your body has about 600 to 700 lymph nodes \u2014 tiny filters that help trap germs and cancer cells!',
            'The spleen can store up to a cup of blood as an emergency reserve for when you need it most.',
            'Your lymphatic system moves about 3 liters of fluid back into your bloodstream every single day!'
          ],
          organs: [
            'Your liver performs over 500 different jobs, including making bile, filtering toxins, and storing vitamins!',
            'The small intestine, unfolded, would be about 20 feet long \u2014 longer than most rooms!',
            'Your kidneys filter your entire blood supply about 40 times every day \u2014 that is 180 liters of fluid!'
          ],
          integumentary: [
            'Your skin is your largest organ \u2014 it covers about 2 square meters and makes up about 16% of your total body weight!',
            'You shed about 30,000 to 40,000 dead skin cells every hour \u2014 a whole new outer layer every 2 to 4 weeks!',
            'Skin can stretch up to 3 times its original size, which is why it accommodates both growth and injury so well!'
          ],
          respiratory: [
            'You breathe about 22,000 times a day, moving around 11,000 liters of air through your lungs!',
            'If you unfolded all 300 million alveoli in your lungs, the surface area would be about the size of a tennis court!',
            'The lungs are the only organs that float on water because they are full of tiny air-filled sacs called alveoli!'
          ],
          endocrine: [
            'Your pituitary gland is only the size of a pea, but it controls nearly every other hormone-producing gland in your body!',
            'Adrenaline can be released in under a second during a stressful event, instantly boosting your heart rate and strength!',
            'The pancreas releases insulin within just minutes of you eating \u2014 it is constantly monitoring your blood sugar 24/7!'
          ],
          reproductive: [
            'A single human egg is the largest cell in the body and is just barely visible to the naked eye \u2014 about 0.1mm wide!',
            'Sperm are among the smallest cells in the body \u2014 they are 10 times smaller than a red blood cell!',
            'During pregnancy, a woman\'s heart grows larger and pumps about 50% more blood to support the growing baby!'
          ]
        };

        // ══════════════════════════════════════
        // CONNECTIONS DATA
        // ══════════════════════════════════════
        var CONNECTIONS = [
          { id: 'conn_1', systems: ['circulatory', 'respiratory'], title: 'Gas Exchange', desc: 'The circulatory system delivers deoxygenated blood to the lungs, where the respiratory system loads it with oxygen and offloads carbon dioxide across the thin alveolar-capillary membrane.', example: 'Every breath you take replenishes the oxygen that your red blood cells carry to every organ in your body.', icon: '\uD83D\uDCA8' },
          { id: 'conn_2', systems: ['nervous', 'muscular'], title: 'Neuromuscular Junction', desc: 'Motor neurons from the nervous system release acetylcholine at the neuromuscular junction, triggering muscle fiber contraction. Without neural signals, muscles cannot move.', example: 'When you decide to kick a soccer ball, your motor cortex sends signals down the spinal cord to fire the quadriceps muscles.', icon: '\u26A1' },
          { id: 'conn_3', systems: ['skeletal', 'muscular'], title: 'Lever System for Movement', desc: 'Muscles attach to bones via tendons and pull across joints, creating lever systems. The skeleton provides rigid levers; muscles provide the pulling force.', example: 'Your biceps pulls on the radius bone to flex your elbow \u2014 a classic third-class lever that trades force for range of motion.', icon: '\uD83E\uDDB4' },
          { id: 'conn_4', systems: ['endocrine', 'reproductive'], title: 'Hormonal Regulation of Reproduction', desc: 'The hypothalamus-pituitary axis releases FSH and LH that regulate the gonads. Estrogen, progesterone, and testosterone from reproductive organs feedback to the endocrine system.', example: 'During puberty, rising levels of LH and FSH trigger the ovaries and testes to mature and begin producing sex hormones.', icon: '\u2697\uFE0F' },
          { id: 'conn_5', systems: ['circulatory', 'lymphatic'], title: 'Immune Defense and Fluid Balance', desc: 'The lymphatic system returns interstitial fluid to the bloodstream and deploys immune cells made in lymphoid organs. Both systems maintain fluid homeostasis and fight infection.', example: 'When you get a cut, lymph nodes near the wound swell as they activate immune cells, while the circulatory system sends white blood cells to the site.', icon: '\uD83D\uDFE2' },
          { id: 'conn_6', systems: ['nervous', 'endocrine'], title: 'Hypothalamic-Pituitary Axis', desc: 'The hypothalamus bridges the nervous and endocrine systems \u2014 it integrates neural signals and translates them into hormonal commands that control the pituitary gland and all downstream hormone cascades.', example: 'When you are stressed, your hypothalamus signals the pituitary to release ACTH, which tells the adrenal glands to make cortisol.', icon: '\uD83E\uDDE0' },
          { id: 'conn_7', systems: ['respiratory', 'muscular'], title: 'Breathing Mechanics', desc: 'The diaphragm and intercostal muscles physically expand and compress the thoracic cavity to move air. Lungs have no muscle themselves and rely entirely on surrounding muscles.', example: 'During a deep breath, your diaphragm contracts downward and your external intercostals lift your ribs outward, creating negative pressure that pulls air in.', icon: '\uD83E\uDEC1' },
          { id: 'conn_8', systems: ['integumentary', 'nervous'], title: 'Sensory Receptors in Skin', desc: 'The skin contains millions of specialized nerve endings and encapsulated receptors that detect touch, pressure, temperature, and pain, feeding constant sensory data to the nervous system.', example: 'Meissner\'s corpuscles in your fingertips allow you to feel light touch with incredible precision, which is why you can read Braille.', icon: '\uD83E\uDDF4' },
          { id: 'conn_9', systems: ['organs', 'circulatory'], title: 'Portal Circulation and Nutrient Processing', desc: 'Blood from the GI tract drains through the hepatic portal vein directly to the liver before entering general circulation, allowing the liver to process nutrients and detoxify substances first.', example: 'After you eat, glucose absorbed from the small intestine travels straight to the liver, which stores excess glucose as glycogen to prevent a blood sugar spike.', icon: '\uD83C\uDFE5' },
          { id: 'conn_10', systems: ['skeletal', 'circulatory'], title: 'Bone Marrow Blood Cell Production', desc: 'Red bone marrow inside the skeleton is the birthplace of all blood cells. Red blood cells, white blood cells, and platelets are all produced here through hematopoiesis.', example: 'The marrow in your sternum and pelvis produces about 2 million red blood cells per second to replace the ones that wear out after 120 days.', icon: '\uD83E\uDDB4' }
        ];

        // ══════════════════════════════════════
        // GUIDED TOURS DATA
        // ══════════════════════════════════════
        var GUIDED_TOURS = {
          skeletal: [
            { structureId: 'skull', title: 'The Skull', narration: 'Your skull is like a super-strong helmet made of 22 fused bones. It protects your brain, houses your eyes and ears, and gives your face its shape.' },
            { structureId: 'vertebral', title: 'The Vertebral Column', narration: 'Your spine is a stack of 33 vertebrae that protects your spinal cord. It holds you upright and lets you bend and twist. The S-curve acts like a spring to absorb shocks.' },
            { structureId: 'ribs', title: 'The Rib Cage', narration: 'Your 12 pairs of ribs form a protective cage around your heart and lungs. They flex slightly with each breath to let your lungs expand and contract.' },
            { structureId: 'femur', title: 'The Femur', narration: 'The femur is your thigh bone and the longest, strongest bone in your body. It can bear loads of 2 to 3 times your body weight during walking.' },
            { structureId: 'pelvis', title: 'The Pelvis', narration: 'The pelvis is a ring of bones that transfers your body weight from your spine down to your legs. It also protects your bladder and reproductive organs.' }
          ],
          muscular: [
            { structureId: 'diaphragm_m', title: 'The Diaphragm', narration: 'The diaphragm is your main breathing muscle \u2014 a dome-shaped sheet separating your chest from your abdomen. When it contracts and flattens, it creates room for your lungs to expand.' },
            { structureId: 'deltoid', title: 'The Deltoid', narration: 'The deltoid wraps around your shoulder. Its three sections let you raise your arm to the side, swing it forward, and pull it back. Every throw, wave, and reach uses this muscle.' },
            { structureId: 'rectus_ab', title: 'Rectus Abdominis', narration: 'The rectus abdominis creates the six-pack appearance. It flexes your trunk forward and helps stabilize your pelvis when you walk and run.' },
            { structureId: 'quads', title: 'The Quadriceps', narration: 'Your quadriceps are four powerful muscles on the front of your thigh. They straighten your knee and are critical for walking, climbing stairs, and running.' },
            { structureId: 'gastrocnemius', title: 'The Gastrocnemius', narration: 'The gastrocnemius is the big calf muscle on the back of the lower leg. It points your foot down for push-off when walking, connecting to the heel via the Achilles tendon.' }
          ],
          circulatory: [
            { structureId: 'heart', title: 'The Heart', narration: 'Your heart is a fist-sized pump that beats about 100,000 times every day. The right side sends blood to the lungs; the left pumps oxygen-rich blood to the whole body.' },
            { structureId: 'aorta', title: 'The Aorta', narration: 'The aorta is the biggest artery in your body. It carries oxygen-rich blood from the left ventricle, arches over your heart, then descends to supply every organ.' },
            { structureId: 'coronary', title: 'Coronary Arteries', narration: 'The coronary arteries are the heart\'s own blood supply. When one gets blocked by a clot, that part of the heart is starved of oxygen \u2014 that is a heart attack.' },
            { structureId: 'carotid', title: 'The Carotid Arteries', narration: 'You have two carotid arteries, one on each side of your neck. They are the main highways carrying blood to your brain. You can feel them pulsing in your neck.' }
          ],
          nervous: [
            { structureId: 'brain', title: 'The Brain', narration: 'Your brain is command central for your entire body, with about 86 billion neurons. The outer cortex handles thinking and senses. The cerebellum coordinates balance and movement.' },
            { structureId: 'cerebral_cortex', title: 'The Cerebral Cortex', narration: 'The cortex is the wrinkled outer layer of your brain. The front plans and controls movement. The back processes vision. The sides handle sound and memory.' },
            { structureId: 'spinal_cord', title: 'The Spinal Cord', narration: 'The spinal cord is the main highway of your nervous system, running inside the vertebral column. Messages travel up and down it thousands of times every second.' },
            { structureId: 'vagus', title: 'The Vagus Nerve', narration: 'The vagus nerve wanders from your brain stem all the way to your abdomen. It controls heart rate, digestion, and breathing as part of your rest-and-digest response.' }
          ],
          lymphatic: [
            { structureId: 'thymus', title: 'The Thymus', narration: 'The thymus is where immature T-cells learn to tell the difference between your own cells and foreign invaders. It is most active during childhood and shrinks after puberty.' },
            { structureId: 'spleen', title: 'The Spleen', narration: 'The spleen filters old and damaged red blood cells out of your blood and helps your immune system respond to blood-borne bacteria and viruses.' },
            { structureId: 'cervical_ln', title: 'Cervical Lymph Nodes', narration: 'Lymph nodes along your neck filter lymph fluid and trap germs draining from your head and throat. They swell and become tender when you have a sore throat.' },
            { structureId: 'bone_marrow', title: 'Bone Marrow', narration: 'Deep inside your larger bones is red bone marrow, a factory that produces all your blood cells \u2014 billions of red blood cells, white blood cells, and platelets every hour.' }
          ],
          organs: [
            { structureId: 'lungs', title: 'The Lungs', narration: 'Your two lungs fill most of your chest cavity. Inside are about 300 million tiny alveoli where oxygen enters your blood and carbon dioxide leaves.' },
            { structureId: 'liver', title: 'The Liver', narration: 'The liver performs over 500 functions: making bile to digest fat, filtering toxins, storing sugar as glycogen, and producing essential proteins.' },
            { structureId: 'stomach', title: 'The Stomach', narration: 'Your stomach is a muscular J-shaped bag that churns food with acid and digestive enzymes, breaking it into a paste that slowly enters the small intestine.' },
            { structureId: 'kidneys', title: 'The Kidneys', narration: 'Your two kidneys each contain about a million tiny filters called nephrons. Together they filter all your blood about 40 times a day, removing waste and regulating fluid balance.' }
          ],
          integumentary: [
            { structureId: 'epidermis', title: 'The Epidermis', narration: 'The epidermis is the outermost layer of your skin \u2014 a waterproof barrier you can see and touch. It renews itself completely about every 28 days.' },
            { structureId: 'dermis', title: 'The Dermis', narration: 'Just below the epidermis is the dermis, packed with collagen fibers, blood vessels, nerves, sweat glands, and hair follicles. It gives skin its strength and elasticity.' },
            { structureId: 'hair_follicle', title: 'Hair Follicles', narration: 'Each hair grows from a follicle deep in your skin. A tiny muscle attached to the follicle causes hair to stand up when you are cold or scared, creating goosebumps.' },
            { structureId: 'melanocytes', title: 'Melanocytes', narration: 'Melanocytes produce melanin, the pigment that gives skin and hair their color. UV light triggers them to make more melanin to protect your DNA \u2014 that is what a tan actually is.' }
          ],
          respiratory: [
            { structureId: 'nasal_cavity', title: 'Nasal Cavity', narration: 'Your nose warms, humidifies, and filters the air before it reaches your lungs. Inside, turbinate bones create turbulence that maximizes contact with mucous membranes.' },
            { structureId: 'larynx', title: 'The Larynx', narration: 'The larynx, or voice box, sits at the top of your trachea. Two vocal cords inside vibrate as air passes over them to create sound.' },
            { structureId: 'bronchi', title: 'The Bronchial Tree', narration: 'The trachea splits into bronchi, which branch again and again like a tree into smaller tubes. By the time air reaches the alveoli, it has traveled through about 23 generations of branching.' },
            { structureId: 'alveoli', title: 'The Alveoli', narration: 'The alveoli are 300 million tiny balloon-like sacs at the end of the bronchial tree. Oxygen crosses into the blood and carbon dioxide crosses out in less than a second.' }
          ],
          endocrine: [
            { structureId: 'pituitary', title: 'The Pituitary Gland', narration: 'The pituitary is a pea-sized gland at the base of your brain. It is called the master gland because it sends hormonal commands to your thyroid, adrenals, gonads, and other glands.' },
            { structureId: 'thyroid', title: 'The Thyroid', narration: 'The thyroid gland wraps around the front of your trachea in a butterfly shape. It produces hormones that control your metabolic rate \u2014 how fast your cells burn energy.' },
            { structureId: 'adrenal_endo', title: 'Adrenal Cortex', narration: 'Sitting on top of each kidney, the adrenal glands produce steroid hormones. The cortex makes cortisol for stress and aldosterone for salt balance. The medulla releases adrenaline in emergencies.' },
            { structureId: 'islets', title: 'Islets of Langerhans', narration: 'Scattered in the pancreas, beta cells make insulin to lower blood sugar and alpha cells make glucagon to raise it. Together they keep your blood glucose in a narrow safe range.' }
          ],
          reproductive: [
            { structureId: 'testes_repro', title: 'The Testes', narration: 'The testes are located in the scrotum where the temperature is 2 to 3 degrees cooler than the body, essential for sperm production. Each day they produce about 200 million sperm.' },
            { structureId: 'uterus', title: 'The Uterus', narration: 'The uterus is a muscular pear-shaped organ where a fertilized egg implants and grows into a baby. Its inner lining thickens each month and sheds during menstruation if no egg implants.' },
            { structureId: 'ovaries_repro', title: 'The Ovaries', narration: 'The two ovaries contain all the eggs a female will ever have. Each month, one egg matures and is released at ovulation, ready to be fertilized in the fallopian tube.' },
            { structureId: 'placenta', title: 'The Placenta', narration: 'The placenta develops during pregnancy, connecting mother and baby without their blood mixing. It transfers oxygen and nutrients to the baby while removing carbon dioxide and waste.' }
          ]
        };

        // ══════════════════════════════════════
        // CLINICAL CASES DATA
        // ══════════════════════════════════════
        var CLINICAL_CASES = [
          { id: 'case_1', title: 'The Runner\'s Knee', system: 'skeletal', presentation: 'A 16-year-old cross-country runner has dull aching pain around the front of the knee that worsens going down stairs and after long runs. No swelling or locking. Pain improves with rest.', question: 'Which structure is most likely affected?', answer: 'Patella / patellofemoral joint', explanation: 'Patellofemoral pain syndrome occurs when the patella does not track smoothly in its groove on the femur. Repeated stress from running causes cartilage irritation. Treatment includes quad strengthening, hip stabilization, and activity modification.', difficulty: 'intermediate' },
          { id: 'case_2', title: 'The Shoulder That Won\'t Lift', system: 'muscular', presentation: 'A 45-year-old painter has gradual onset right shoulder pain for 3 months. He cannot lift his arm above 90 degrees without pain. He wakes up at night with shoulder pain and a grinding sensation.', question: 'Which structure is most likely torn?', answer: 'Supraspinatus tendon (rotator cuff)', explanation: 'The supraspinatus is the most commonly torn rotator cuff muscle. It runs under the acromion where it is susceptible to impingement and tears. Overhead work like painting increases this risk significantly.', difficulty: 'intermediate' },
          { id: 'case_3', title: 'Racing Heart After Exercise', system: 'circulatory', presentation: 'A 14-year-old athlete notices her heart racing and skipping beats for a few seconds after sprinting. She feels fine otherwise, with no chest pain or fainting. Physical exam is normal.', question: 'Which structure controls the normal heart rhythm?', answer: 'Sinoatrial (SA) node', explanation: 'The SA node in the right atrium is the heart\'s natural pacemaker. During intense exercise, adrenaline can cause benign palpitations as the heart rate adjusts. Persistent arrhythmias should be evaluated to rule out structural heart disease.', difficulty: 'beginner' },
          { id: 'case_4', title: 'The Numb Hand', system: 'nervous', presentation: 'A 35-year-old office worker has progressive tingling and numbness in her thumb, index, and middle fingers for 2 months, worse at night. She shakes her hand to relieve it. She types 8 hours a day.', question: 'Which nerve is being compressed?', answer: 'Median nerve (carpal tunnel syndrome)', explanation: 'Carpal tunnel syndrome is compression of the median nerve under the flexor retinaculum at the wrist. The median nerve supplies sensation to the thumb and first 3.5 fingers. Repetitive wrist use is a major risk factor.', difficulty: 'intermediate' },
          { id: 'case_5', title: 'The Swollen Neck Node', system: 'lymphatic', presentation: 'A 17-year-old presents with a 3 cm painless, rubbery lymph node in the left neck for 6 weeks. He has had night sweats and lost 5 kg without trying. No fever or sore throat.', question: 'What diagnosis must be urgently ruled out?', answer: 'Lymphoma (Hodgkin lymphoma)', explanation: 'Painless lymphadenopathy with B-symptoms (night sweats, weight loss, fever) is the classic presentation of Hodgkin lymphoma in young adults. Biopsy showing Reed-Sternberg cells confirms the diagnosis.', difficulty: 'advanced' },
          { id: 'case_6', title: 'The Diabetic Emergency', system: 'endocrine', presentation: 'A 16-year-old with known Type 1 diabetes is found confused at home, breathing deeply and rapidly. His breath smells fruity. Blood glucose is 480 mg/dL. He missed his insulin doses for 2 days.', question: 'Which cells failed, and what is the emergency condition?', answer: 'Beta cells of islets of Langerhans; Diabetic Ketoacidosis (DKA)', explanation: 'Without insulin from beta cells, glucose cannot enter cells. The body burns fat, producing ketones that acidify the blood. Kussmaul breathing compensates by exhaling CO2. Treatment: IV fluids, insulin drip, and electrolyte replacement.', difficulty: 'advanced' },
          { id: 'case_7', title: 'The Broken Collarbone', system: 'skeletal', presentation: 'An 11-year-old falls off his bicycle and lands on his outstretched right hand. He has immediate pain and deformity at the middle third of his right clavicle. He holds his arm close to his side.', question: 'Why is the middle third of the clavicle the most common fracture site?', answer: 'The middle third is thinnest and has no muscular reinforcement', explanation: 'The clavicle is the most frequently fractured bone. Its middle third is thinnest and lacks muscular protection. Force from a fall on an outstretched hand concentrates at this weak point. Most heal with sling immobilization.', difficulty: 'beginner' },
          { id: 'case_8', title: 'Breathless at High Altitude', system: 'respiratory', presentation: 'A healthy 15-year-old hikes to 12,000 feet and develops headache, shortness of breath at rest, and a dry cough. Her oxygen saturation is 84%. At sea level it was 99%.', question: 'Why does altitude cause these symptoms, and which structure is most stressed?', answer: 'The alveoli and respiratory muscles; reduced atmospheric oxygen causes hypoxia', explanation: 'At high altitude, atmospheric pressure drops, reducing the partial pressure of oxygen. Less oxygen crosses the alveolar membrane. The body compensates by breathing faster and deeper, increasing respiratory muscle work.', difficulty: 'intermediate' }
        ];

        // ══════════════════════════════════════
        // MNEMONICS — Memory aids for anatomy study
        // ══════════════════════════════════════
        var MNEMONICS = {
          skeletal: [
            { id: 'mn_carpals', title: 'Carpal Bones (Proximal to Distal)', phrase: 'Some Lovers Try Positions That They Can\'t Handle', meaning: 'Scaphoid, Lunate, Triquetrum, Pisiform, Trapezium, Trapezoid, Capitate, Hamate', structures: ['carpals'] },
            { id: 'mn_cranial', title: 'Cranial Bones', phrase: 'Old People From Texas Eat Spiders', meaning: 'Occipital, Parietal, Frontal, Temporal, Ethmoid, Sphenoid', structures: ['skull'] },
            { id: 'mn_vertebrae', title: 'Vertebral Count', phrase: 'Breakfast at 7, Lunch at 12, Dinner at 5', meaning: '7 cervical, 12 thoracic, 5 lumbar vertebrae', structures: ['vertebral'] }
          ],
          muscular: [
            { id: 'mn_rotator', title: 'Rotator Cuff Muscles', phrase: 'SITS', meaning: 'Supraspinatus, Infraspinatus, Teres minor, Subscapularis', structures: ['rotator_cuff'] },
            { id: 'mn_erector', title: 'Erector Spinae (Lateral to Medial)', phrase: 'I Love Standing', meaning: 'Iliocostalis, Longissimus, Spinalis', structures: ['trapezius'] },
            { id: 'mn_quad', title: 'Quadriceps Muscles', phrase: 'Real Vast Legs, Very Important Muscles', meaning: 'Rectus femoris, Vastus lateralis, Vastus intermedius, Vastus medialis', structures: ['quads'] }
          ],
          circulatory: [
            { id: 'mn_heartvalves', title: 'Heart Valve Order (Flow)', phrase: 'Try Pulling My Aorta', meaning: 'Tricuspid, Pulmonary, Mitral, Aortic (blood flow path)', structures: ['heart'] },
            { id: 'mn_aorta', title: 'Aortic Arch Branches', phrase: 'BLC (Big Lefty Club)', meaning: 'Brachiocephalic, Left common carotid, Left subclavian', structures: ['aorta'] }
          ],
          nervous: [
            { id: 'mn_cranialn', title: '12 Cranial Nerves', phrase: 'Oh Oh Oh To Touch And Feel Very Green Vegetables AH!', meaning: 'Olfactory, Optic, Oculomotor, Trochlear, Trigeminal, Abducens, Facial, Vestibulocochlear, Glossopharyngeal, Vagus, Accessory, Hypoglossal', structures: ['cranial_n', 'vagus'] },
            { id: 'mn_brachial', title: 'Brachial Plexus', phrase: 'Real Texans Drink Cold Beer', meaning: 'Roots, Trunks, Divisions, Cords, Branches', structures: ['brachial_plexus'] }
          ],
          lymphatic: [
            { id: 'mn_immune', title: 'Immune Cell Types', phrase: 'Never Let Monkeys Eat Bananas', meaning: 'Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils (in order of abundance)', structures: ['bone_marrow'] }
          ],
          organs: [
            { id: 'mn_liver', title: 'Liver Segments', phrase: 'The liver has 8 Couinaud segments supplied by portal triads', meaning: 'Each segment has its own portal pedicle (portal vein, hepatic artery, bile duct) enabling surgical resection', structures: ['liver'] },
            { id: 'mn_intestine', title: 'Layers of GI Wall', phrase: 'Mary\'s Silly Monkey Made Smelly Sounds', meaning: 'Mucosa, Submucosa, Muscularis (circular + longitudinal), Serosa', structures: ['sm_intestine', 'stomach'] }
          ],
          integumentary: [
            { id: 'mn_skin', title: 'Epidermis Layers (Deep to Superficial)', phrase: 'Come, Let\'s Get Sun Burned', meaning: 'Corneum (stratum), Lucidum, Granulosum, Spinosum, Basale', structures: ['epidermis'] }
          ],
          respiratory: [
            { id: 'mn_resp', title: 'Structures Air Passes Through', phrase: 'Nice People Like Talking But All Are Late', meaning: 'Nose, Pharynx, Larynx, Trachea, Bronchi, Alveoli', structures: ['nasal_cavity', 'larynx', 'bronchi', 'alveoli'] }
          ],
          endocrine: [
            { id: 'mn_pituitary', title: 'Anterior Pituitary Hormones', phrase: 'FLAT PeG', meaning: 'FSH, LH, ACTH, TSH, Prolactin, GH (Growth Hormone)', structures: ['pituitary'] }
          ],
          reproductive: [
            { id: 'mn_repro', title: 'Stages of Meiosis I', phrase: 'PMAT with crossing over', meaning: 'Prophase I (crossing over), Metaphase I, Anaphase I, Telophase I', structures: ['testes_repro', 'ovaries_repro'] }
          ]
        };

        // ══════════════════════════════════════
        // PATHWAYS — Physiological process tracing
        // ══════════════════════════════════════
        var PATHWAYS = [
          {
            id: 'path_blood', title: 'Path of Blood', icon: '\u2764\uFE0F', color: '#ef4444',
            desc: 'Follow a red blood cell through the entire circulatory system.',
            steps: [
              { label: 'Right Atrium', detail: 'Deoxygenated blood from the body enters the right atrium via the superior and inferior vena cava.', structure: 'sup_vena' },
              { label: 'Right Ventricle', detail: 'Blood passes through the tricuspid valve into the right ventricle, which pumps it toward the lungs.', structure: 'heart' },
              { label: 'Pulmonary Arteries', detail: 'The right ventricle ejects blood through the pulmonary valve into the pulmonary arteries toward both lungs.', structure: 'pulm_art' },
              { label: 'Lung Capillaries', detail: 'In the alveolar capillaries, CO2 is released and O2 is picked up through the thin alveolar membrane.', structure: 'alveoli' },
              { label: 'Pulmonary Veins', detail: 'Freshly oxygenated blood returns to the heart via four pulmonary veins, entering the left atrium.', structure: 'lungs' },
              { label: 'Left Ventricle', detail: 'Blood passes through the mitral valve into the muscular left ventricle, the strongest heart chamber.', structure: 'heart' },
              { label: 'Aorta', detail: 'The left ventricle powerfully ejects blood through the aortic valve into the aorta, the body\'s main highway.', structure: 'aorta' },
              { label: 'Body Tissues', detail: 'Arteries branch into arterioles and capillaries where O2 and nutrients are delivered and CO2/waste collected.', structure: 'femoral_a' },
              { label: 'Venous Return', detail: 'Deoxygenated blood returns through venules and veins, assisted by muscle pumps and valves, back to the right atrium.', structure: 'inf_vena' }
            ]
          },
          {
            id: 'path_air', title: 'Path of Air', icon: '\uD83D\uDCA8', color: '#3b82f6',
            desc: 'Trace the journey of a breath of air from nose to alveoli and back.',
            steps: [
              { label: 'Nasal Cavity', detail: 'Air enters through the nostrils and is warmed, humidified, and filtered by mucous membranes and turbinates.', structure: 'nasal_cavity' },
              { label: 'Pharynx', detail: 'Air passes through the nasopharynx and oropharynx, a shared passage with the digestive tract.', structure: 'pharynx' },
              { label: 'Larynx', detail: 'Air crosses the vocal cords in the voice box. The epiglottis guards against food entering the airway.', structure: 'larynx' },
              { label: 'Trachea', detail: 'The trachea (windpipe) is reinforced by C-shaped cartilage rings. Cilia move mucus upward to trap debris.', structure: 'trachea' },
              { label: 'Bronchi', detail: 'The trachea splits into left and right main bronchi, each entering a lung. They branch into smaller bronchioles.', structure: 'bronchi' },
              { label: 'Alveoli', detail: '300 million grape-like sacs where gas exchange occurs. O2 diffuses into blood; CO2 diffuses out. Surface area equals a tennis court.', structure: 'alveoli' },
              { label: 'Exhalation', detail: 'The diaphragm relaxes and rises, reducing lung volume. CO2-rich air is pushed out through the same pathway in reverse.', structure: 'diaphragm_m' }
            ]
          },
          {
            id: 'path_food', title: 'Path of Food', icon: '\uD83C\uDF54', color: '#16a34a',
            desc: 'Follow a meal from mouth through the entire digestive system.',
            steps: [
              { label: 'Mouth', detail: 'Teeth mechanically break food down. Salivary amylase begins starch digestion. The tongue shapes food into a bolus.', structure: 'mandible' },
              { label: 'Pharynx & Esophagus', detail: 'Swallowing pushes the bolus past the epiglottis. Peristaltic waves move it down the 25cm esophagus in about 8 seconds.', structure: 'pharynx' },
              { label: 'Stomach', detail: 'Gastric acid (pH 1.5-3.5) and pepsin break down proteins. Churning produces chyme over 2-4 hours.', structure: 'stomach' },
              { label: 'Duodenum', detail: 'The first 25cm of the small intestine receives bile from the liver/gallbladder and enzymes from the pancreas.', structure: 'sm_intestine' },
              { label: 'Jejunum & Ileum', detail: 'Most nutrient absorption occurs here via villi and microvilli, increasing surface area 600-fold. 6-7 meters long.', structure: 'sm_intestine' },
              { label: 'Large Intestine', detail: 'Water and electrolytes are reabsorbed. Gut bacteria ferment remaining fiber, producing vitamins K and B12.', structure: 'lg_intestine' },
              { label: 'Rectum & Excretion', detail: 'Waste is compacted and stored in the rectum until defecation. The entire journey takes 24-72 hours.', structure: 'bladder' }
            ]
          },
          {
            id: 'path_nerve', title: 'Path of a Nerve Signal', icon: '\u26A1', color: '#eab308',
            desc: 'Trace a reflex arc from stimulus to response.',
            steps: [
              { label: 'Receptor', detail: 'A sensory receptor in the skin detects a painful stimulus (like touching a hot surface) and generates an electrical signal.', structure: 'epidermis' },
              { label: 'Sensory Neuron', detail: 'The signal travels along a sensory (afferent) neuron toward the spinal cord at up to 120 m/s via saltatory conduction.', structure: 'sciatic' },
              { label: 'Spinal Cord', detail: 'In the dorsal horn, the sensory neuron synapses with an interneuron. For reflexes, the signal does not need to reach the brain.', structure: 'spinal_cord' },
              { label: 'Interneuron', detail: 'The interneuron in the spinal gray matter integrates the signal and relays it to a motor neuron.', structure: 'spinal_cord' },
              { label: 'Motor Neuron', detail: 'The motor (efferent) neuron carries the command signal from the ventral horn down to the target muscle.', structure: 'femoral_n' },
              { label: 'Effector (Muscle)', detail: 'Acetylcholine released at the neuromuscular junction causes muscle contraction. You pull your hand away before feeling pain.', structure: 'biceps' },
              { label: 'Brain Awareness', detail: 'Meanwhile, a copy of the signal ascends to the somatosensory cortex. You consciously feel pain about 0.5 seconds after the reflex.', structure: 'brain' }
            ]
          }
        ];

        // ══════════════════════════════════════
        // SIMPLE DESCRIPTIONS — Grade-band differentiated content
        // ══════════════════════════════════════
        var SIMPLE_DESC = {
          skull: { k2: 'Your skull is like a helmet that protects your brain!', g35: 'The skull is made of 22 bones fused together. It protects the brain and gives your face its shape.' },
          heart: { k2: 'Your heart is a pump that pushes blood all around your body!', g35: 'The heart has 4 rooms (chambers) and beats about 100,000 times every day to move blood through your body.' },
          brain: { k2: 'Your brain is the boss of your whole body! It helps you think, feel, and move.', g35: 'The brain has billions of tiny cells called neurons that send messages to control everything you do.' },
          lungs: { k2: 'Your lungs help you breathe! Air goes in and out like balloons.', g35: 'Your two lungs take oxygen from the air you breathe in and get rid of carbon dioxide when you breathe out.' },
          femur: { k2: 'The femur is your thigh bone. It is the biggest bone in your body!', g35: 'The femur (thigh bone) is the longest and strongest bone. It helps you walk, run, and jump.' },
          stomach: { k2: 'Your stomach is like a mixer that squishes food into mush!', g35: 'The stomach uses acid and muscles to break food into a paste. Food stays there for 2-4 hours.' },
          ribs: { k2: 'Your ribs are like a cage that protects your heart and lungs!', g35: 'You have 12 pairs of ribs that form a protective cage around your chest organs. They move when you breathe.' },
          biceps: { k2: 'Your biceps is the muscle that helps you bend your arm!', g35: 'The biceps brachii bends your elbow and turns your palm up. You use it every time you pick something up.' },
          kidneys: { k2: 'Your kidneys are like filters that clean your blood!', g35: 'Your two kidneys filter waste from your blood and make urine. They process all your blood about 40 times a day.' },
          liver: { k2: 'Your liver is a helper that cleans your blood and helps digest food!', g35: 'The liver does over 500 jobs including making bile, cleaning toxins from blood, and storing energy.' },
          epidermis: { k2: 'Your skin keeps germs out and keeps water in. It is your biggest organ!', g35: 'The epidermis is the outer layer of skin. New skin cells grow at the bottom and push old ones to the surface.' },
          spinal_cord: { k2: 'Your spinal cord is like a message highway inside your backbone!', g35: 'The spinal cord carries messages between your brain and body. It runs inside your vertebral column for protection.' },
          diaphragm_m: { k2: 'Your diaphragm is the muscle that helps you breathe in and out!', g35: 'The diaphragm is a dome-shaped muscle below your lungs. When it tightens, your lungs expand and air rushes in.' },
          aorta: { k2: 'The aorta is the biggest tube that carries blood from your heart!', g35: 'The aorta is your body\'s largest artery. It carries oxygen-rich blood from the heart to the rest of your body.' }
        };

        // ══════════════════════════════════════
        // PRONUNCIATION GUIDE — Phonetic spelling for complex terms
        // ══════════════════════════════════════
        var PRONUNCIATION = {
          skull: null, mandible: 'MAN-dih-bul', clavicle: 'KLAV-ih-kul', sternum: 'STUR-num',
          scapula: 'SKAP-yoo-lah', humerus: 'HYOO-meh-rus', radius: 'RAY-dee-us', ulna: 'UL-nah',
          carpals: 'KAR-pulz', vertebral: 'VER-teh-brul', pelvis: 'PEL-vis', femur: 'FEE-mur',
          patella: 'pah-TEL-ah', tibia: 'TIB-ee-ah', fibula: 'FIB-yoo-lah', sacrum: 'SAY-krum',
          tarsals: 'TAR-sulz', metacarpals: 'met-ah-KAR-pulz', metatarsals: 'met-ah-TAR-sulz',
          scaphoid_bone: 'SKAF-oyd', pectoralis: 'pek-toh-RAL-is', deltoid: 'DEL-toyd',
          biceps: 'BY-seps', triceps: 'TRY-seps', rectus_ab: 'REK-tus ab-DOM-ih-nis',
          obliques: 'oh-BLEEKS', trapezius: 'trah-PEE-zee-us', lats: 'lah-TIS-ih-mus DOR-sy',
          glutes: 'GLOO-tee-us MAX-ih-mus', quads: 'KWOD-rih-seps', hamstrings: 'HAM-strings',
          gastrocnemius: 'gas-trok-NEE-mee-us', sartorius: 'sar-TOR-ee-us', soleus: 'SO-lee-us',
          tibialis: 'tib-ee-AL-is', diaphragm_m: 'DY-ah-fram', iliopsoas: 'il-ee-oh-SO-as',
          intercostals: 'in-ter-KOS-tulz', rotator_cuff: 'ROH-tay-ter kuf',
          heart: null, aorta: 'ay-OR-tah', coronary: 'KOR-oh-nair-ee', carotid: 'kah-ROT-id',
          jugular: 'JUG-yoo-lar', femoral_a: 'FEM-or-al', brachial: 'BRAY-kee-al',
          saphenous: 'SAF-eh-nus', portal: 'POR-tal', pulm_art: 'PUL-moh-nair-ee',
          brain: null, cerebral_cortex: 'seh-REE-bral KOR-teks', cerebellum: 'sair-eh-BEL-um',
          brainstem: null, hippocampus: 'hip-oh-KAM-pus', amygdala: 'ah-MIG-dah-lah',
          thalamus: 'THAL-ah-mus', hypothalamus: 'hy-poh-THAL-ah-mus',
          corpus_callosum: 'KOR-pus kah-LO-sum', basal_ganglia: 'BAY-zal GANG-lee-ah',
          vagus: 'VAY-gus', sciatic: 'sy-AT-ik', median: 'MEE-dee-an',
          brachial_plexus: 'BRAY-kee-al PLEK-sus', cranial_n: 'KRAY-nee-al',
          sympathetic: 'sim-pah-THET-ik', spinal_cord: null,
          thymus: 'THY-mus', spleen: null, thoracic_duct: 'thoh-RAS-ik',
          cervical_ln: 'SUR-vih-kal', axillary_ln: 'AK-sih-lair-ee', inguinal_ln: 'ING-gwih-nal',
          epidermis: 'ep-ih-DUR-mis', dermis: 'DUR-mis', hypodermis: 'hy-poh-DUR-mis',
          melanocytes: 'MEL-an-oh-syts', sebaceous: 'seh-BAY-shus',
          larynx: 'LAIR-inks', pharynx: 'FAIR-inks', trachea: 'TRAY-kee-ah',
          bronchi: 'BRONG-ky', alveoli: 'al-VEE-oh-ly', pleura: 'PLOOR-ah',
          pituitary: 'pih-TOO-ih-tair-ee', thyroid: 'THY-royd', parathyroid: 'pair-ah-THY-royd',
          adrenal_endo: 'ah-DREE-nal', islets: 'EYE-lets of LANG-er-hanz',
          pineal: 'PIN-ee-al', hypothal_endo: 'hy-poh-THAL-ah-mus',
          testes_repro: 'TES-teez', epididymis: 'ep-ih-DID-ih-mis', prostate: 'PROS-tayt',
          uterus: 'YOO-teh-rus', ovaries_repro: 'OH-vah-reez', fallopian: 'fah-LO-pee-an',
          placenta: 'plah-SEN-tah', mammary: 'MAM-ah-ree'
        };

        // ══════════════════════════════════════
        // DERIVED STATE
        // ══════════════════════════════════════

        var sysKey = d.system || 'skeletal';
        var sys = SYSTEMS[sysKey];
        var view = d.view || 'anterior';
        var searchTerm = (d.search || '').toLowerCase();
        var complexity = d.complexity || 3;

        // ── Layer Transparency System ──
        var LAYER_DEFS = [
          { id: 'skin', icon: '\uD83E\uDDB4', name: 'Skin', color: '#f5e6d3', accent: '#c4aa94' },
          { id: 'skeletal', icon: '\uD83E\uDDB4', name: 'Skeletal', color: '#e2e8f0', accent: '#94a3b8', systems: ['skeletal'] },
          { id: 'muscular', icon: '\uD83D\uDCAA', name: 'Muscular', color: '#fecaca', accent: '#dc2626', systems: ['muscular'] },
          { id: 'organs', icon: '\uD83E\uDEC1', name: 'Organs', color: '#d1fae5', accent: '#16a34a', systems: ['digestive', 'respiratory', 'endocrine', 'reproductive'] },
          { id: 'circulatory', icon: '\u2764\uFE0F', name: 'Circulatory', color: '#fee2e2', accent: '#ef4444', systems: ['circulatory'] },
          { id: 'nervous', icon: '\u26A1', name: 'Nervous', color: '#fef9c3', accent: '#eab308', systems: ['nervous'] },
          { id: 'lymphatic', icon: '\uD83D\uDFE2', name: 'Lymphatic', color: '#d1fae5', accent: '#22c55e', systems: ['lymphatic', 'integumentary'] }
        ];

        var layers = d.visibleLayers || { skin: true };
        var toggleLayer = function(lid) {
          var newLayers = Object.assign({}, layers);
          newLayers[lid] = !newLayers[lid];
          upd('visibleLayers', newLayers);
          playSound('layerToggle');
        };

        // Auto-activate layer matching current system
        var autoLayerId = null;
        LAYER_DEFS.forEach(function(ld) {
          if (ld.systems && ld.systems.indexOf(sysKey) !== -1) autoLayerId = ld.id;
        });
        var anyDeepLayer = LAYER_DEFS.some(function(ld) { return ld.id !== 'skin' && (layers[ld.id] || ld.id === autoLayerId); });
        var skinOpacity = anyDeepLayer ? 0.20 : 1.0;

        // ── Complexity level lookup ──
        var ELEMENTARY_IDS = ['skull', 'ribs', 'femur', 'humerus', 'vertebral', 'pelvis', 'biceps', 'quads', 'heart', 'brain', 'lungs', 'stomach', 'kidneys', 'spinal_cord', 'deltoid', 'hamstrings', 'gastrocnemius', 'aorta', 'carotid', 'sciatic', 'liver', 'diaphragm', 'spleen', 'thymus', 'epidermis', 'dermis', 'trachea', 'alveoli', 'pituitary', 'uterus', 'testes_repro', 'mammary', 'cerebral_cortex', 'cerebellum', 'brainstem'];
        var MIDDLE_IDS = ELEMENTARY_IDS.concat(['mandible', 'clavicle', 'sternum', 'scapula', 'radius', 'ulna', 'tibia', 'fibula', 'patella', 'tarsals', 'carpals', 'sacrum', 'pectoralis', 'triceps', 'rectus_ab', 'obliques', 'trapezius', 'lats', 'glutes', 'tibialis', 'soleus', 'sartorius', 'sup_vena', 'inf_vena', 'pulm_art', 'jugular', 'coronary', 'femoral_a', 'brachial', 'portal', 'vagus', 'brachial_plexus', 'median', 'ulnar_n', 'femoral_n', 'cranial_n', 'sympathetic', 'sm_intestine', 'lg_intestine', 'pancreas', 'gallbladder', 'bladder', 'thyroid', 'adrenals', 'cervical_ln', 'axillary_ln', 'inguinal_ln', 'thoracic_duct', 'bone_marrow', 'hyoid', 'atlas_axis', 'metatarsals', 'metacarpals', 'scaphoid_bone', 'rotator_cuff', 'iliopsoas', 'intercostals', 'pelvic_floor', 'diaphragm_m', 'circle_willis', 'saphenous', 'lymph_circ', 'hypodermis', 'hair_follicle', 'sweat_glands', 'sebaceous', 'nails', 'melanocytes', 'nasal_cavity', 'pharynx', 'larynx', 'bronchi', 'pleura', 'resp_muscles', 'pineal', 'parathyroid', 'islets', 'ovaries_endo', 'testes_endo', 'hypothal_endo', 'adrenal_endo', 'epididymis', 'prostate', 'ovaries_repro', 'fallopian', 'placenta', 'hippocampus', 'amygdala', 'thalamus', 'hypothalamus', 'corpus_callosum', 'basal_ganglia']);

        function passesComplexity(st) {
          if (complexity >= 3) return true;
          if (complexity === 1) return ELEMENTARY_IDS.indexOf(st.id) !== -1;
          return MIDDLE_IDS.indexOf(st.id) !== -1;
        }

        var allStructures = sys.structures;
        var viewFiltered = allStructures.filter(function(s) { return (s.v === 'b' || s.v === (view === 'anterior' ? 'a' : 'p')) && passesComplexity(s); });
        var filtered = searchTerm ? viewFiltered.filter(function(s) { return s.name.toLowerCase().indexOf(searchTerm) >= 0 || s.fn.toLowerCase().indexOf(searchTerm) >= 0; }) : viewFiltered;
        var sel = d.selectedStructure ? allStructures.find(function(s) { return s.id === d.selectedStructure; }) : null;

        // ── Fun fact state ──
        var sysFacts = FUN_FACTS[sysKey] || [];
        var factIdx = d._factIdx || 0;
        var currentFact = sysFacts.length > 0 ? sysFacts[factIdx % sysFacts.length] : null;

        // ── Tour state ──
        var tourSteps = GUIDED_TOURS[sysKey] || [];
        var tourStepIdx = d._tourStepIdx || 0;
        var tourActive = d._tourActive || false;
        var currentTourStep = tourActive && tourSteps.length > 0 ? tourSteps[tourStepIdx] : null;

        // ── Connections state ──
        var connectionsViewed = d._connectionsViewed || {};

        // ── Clinical cases state ──
        var clinicalSolved = d._clinicalSolved || 0;
        var activeCaseIdx = d._activeCaseIdx || 0;
        var activeCaseFeedback = d._activeCaseFeedback || null;

        // ── Spotter test state ──
        var spotterActive = d._spotterActive || false;
        var spotterScore = d._spotterScore || 0;
        var spotterTotal = d._spotterTotal || 0;
        var spotterTarget = d._spotterTarget || null;
        var spotterFeedback = d._spotterFeedback || null;
        var spotterStartTime = d._spotterStartTime || 0;
        var spotterOptions = d._spotterOpts || [];
        var spotterBestTime = d._spotterBestTime || 999;

        // ── Compare mode state ──
        var compareStructureId = d._compareStructure || null;
        var compareSel = compareStructureId ? allStructures.find(function(s) { return s.id === compareStructureId; }) : null;
        var comparisons = d._comparisons || 0;

        // ── Pathway state ──
        var activePathwayId = d._activePathway || null;
        var pathwayStepIdx = d._pathwayStep || 0;
        var pathwaysCompleted = d._pathwaysCompleted || {};

        // ── Mnemonics viewed state ──
        var mnemonicsViewed = d._mnemonicsViewed || {};

        // ── X-ray mode ──
        var xrayMode = d._xrayMode || false;

        // ── Flashcard state ──
        var flashcardIdx = d._flashcardIdx || 0;
        var flashcardFlipped = d._flashcardFlipped || false;
        var flashcardPool = allStructures.filter(function(s) { return s.fn && passesComplexity(s); });

        // ── Confetti state ──
        var confettiParticles = d._confettiParticles || [];

        // ── Stats tracking ──
        var totalTimeSpent = d._totalTimeSpent || 0;
        var quizAttempts = d._quizAttempts || 0;

        // ── Enhanced Quiz logic ──
        var quizPool = allStructures.filter(function(s) { return s.fn && passesComplexity(s); });
        var quizTypeCount = 4;
        var quizQ = d.quizMode && quizPool.length > 0 ? quizPool[d.quizIdx % quizPool.length] : null;
        var quizType = d.quizMode ? ((d.quizIdx || 0) % quizTypeCount) : 0;
        var quizOptions = d._quizOpts || [];
        if (quizQ && d._quizOptsFor !== (sysKey + '|' + d.quizIdx + '|' + quizType)) {
          var wrong = quizPool.filter(function(s) { return s.id !== quizQ.id; });
          var shuffled = wrong.sort(function() { return Math.random() - 0.5; }).slice(0, 3);
          if (quizType === 0 || quizType === 3) {
            quizOptions = shuffled.concat([quizQ]).sort(function() { return Math.random() - 0.5; });
          } else if (quizType === 1) {
            quizOptions = [{ id: 'true', name: 'True' }, { id: 'false', name: 'False' }];
          } else if (quizType === 2) {
            var sysKeys = Object.keys(SYSTEMS);
            var wrongSys = sysKeys.filter(function(k) { return k !== sysKey; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
            quizOptions = wrongSys.concat([sysKey]).sort(function() { return Math.random() - 0.5; }).map(function(k) { return { id: k, name: SYSTEMS[k].name }; });
          }
          upd('_quizOpts', quizOptions);
          upd('_quizOptsFor', sysKey + '|' + d.quizIdx + '|' + quizType);
        }

        // ── Hover state ──
        var hoverStructure = d._hoverStructure || null;
        var hoverX = d._hoverX || 0;
        var hoverY = d._hoverY || 0;

        // ══════════════════════════════════════
        // BADGE SYSTEM
        // ══════════════════════════════════════

        var badges = d._badges || {};
        var totalCorrect = d._totalCorrect || 0;
        var streak = d._streak || 0;
        var systemsExplored = d._systemsExplored || {};
        var structuresViewed = d._structuresViewed || {};
        var layersToggled = d._layersToggled || {};
        var viewsUsed = d._viewsUsed || {};
        var searchFinds = d._searchFinds || 0;
        var aiQuestions = d._aiQuestions || 0;

        function spawnConfetti() {
          var particles = [];
          for (var ci = 0; ci < 30; ci++) {
            particles.push({
              x: 0.3 + Math.random() * 0.4,
              y: 0.1 + Math.random() * 0.2,
              vx: (Math.random() - 0.5) * 2,
              vy: -1 - Math.random() * 2,
              rot: Math.random() * Math.PI * 2,
              spin: (Math.random() - 0.5) * 6,
              ci: ci,
              born: Date.now()
            });
          }
          upd('_confettiParticles', particles);
        }

        function awardBadge(id) {
          if (badges[id]) return;
          var def = null;
          for (var bi = 0; bi < BADGE_DEFS.length; bi++) {
            if (BADGE_DEFS[bi].id === id) { def = BADGE_DEFS[bi]; break; }
          }
          if (!def) return;
          var newBadges = Object.assign({}, badges);
          newBadges[id] = true;
          upd('_badges', newBadges);
          playSound('badge');
          spawnConfetti();
          if (awardStemXP) awardStemXP(def.xp);
          if (stemCelebrate) stemCelebrate();
          if (addToast) addToast(def.icon + ' Badge: ' + def.name + ' (+' + def.xp + ' XP)');
          // Check anatomy champion
          var earnedCount = Object.keys(newBadges).length;
          if (earnedCount >= 12 && !newBadges.anatomyChampion) {
            var champBadges = Object.assign({}, newBadges);
            champBadges.anatomyChampion = true;
            upd('_badges', champBadges);
            spawnConfetti();
            if (awardStemXP) awardStemXP(50);
            if (addToast) addToast('\uD83D\uDC51 Badge: Anatomy Champion (+50 XP)');
          }
        }

        function checkBadges() {
          if (sel && !badges.firstStructure) awardBadge('firstStructure');
          if (Object.keys(systemsExplored).length >= 5 && !badges.systemExplorer5) awardBadge('systemExplorer5');
          if (Object.keys(systemsExplored).length >= 10 && !badges.allSystems) awardBadge('allSystems');
          if (Object.keys(layersToggled).length >= 7 && !badges.layerMaster) awardBadge('layerMaster');
          if (totalCorrect >= 5 && !badges.quizAce5) awardBadge('quizAce5');
          if (totalCorrect >= 15 && !badges.quizAce15) awardBadge('quizAce15');
          if (streak >= 3 && !badges.streak3) awardBadge('streak3');
          if (viewsUsed.anterior && viewsUsed.posterior && !badges.viewToggler) awardBadge('viewToggler');
          if (searchFinds >= 3 && !badges.searchPro) awardBadge('searchPro');
          if (aiQuestions >= 3 && !badges.aiCurious) awardBadge('aiCurious');
          if (Object.keys(structuresViewed).length >= 50 && !badges.structureScholar) awardBadge('structureScholar');
          if (d._tourCompleted && !badges.tourComplete) awardBadge('tourComplete');
          if (Object.keys(connectionsViewed).length >= 5 && !badges.connectionExplorer) awardBadge('connectionExplorer');
          if (clinicalSolved >= 3 && !badges.clinicalExpert) awardBadge('clinicalExpert');
          if (Object.keys(mnemonicsViewed).length >= 5 && !badges.mnemonicLearner) awardBadge('mnemonicLearner');
          if (Object.keys(pathwaysCompleted).length >= 2 && !badges.pathwayTracer) awardBadge('pathwayTracer');
          if (spotterScore >= 5 && !badges.spotterPro) awardBadge('spotterPro');
          if (comparisons >= 5 && !badges.compareMaster) awardBadge('compareMaster');
          if (spotterBestTime < 3 && !badges.speedDemon) awardBadge('speedDemon');
        }

        // Track system explored
        if (!systemsExplored[sysKey]) {
          var newSE = Object.assign({}, systemsExplored);
          newSE[sysKey] = true;
          upd('_systemsExplored', newSE);
        }

        // Track view used
        if (!viewsUsed[view]) {
          var newVU = Object.assign({}, viewsUsed);
          newVU[view] = true;
          upd('_viewsUsed', newVU);
        }

        // Track structure viewed
        if (sel && !structuresViewed[sel.id]) {
          var newSV = Object.assign({}, structuresViewed);
          newSV[sel.id] = true;
          upd('_structuresViewed', newSV);
        }

        checkBadges();

        // ══════════════════════════════════════
        // CANVAS — Animated anatomical figure
        // ══════════════════════════════════════

        var canvasRef = function(canvas) {
          if (!canvas) return;
          if (canvas._anatomyAnim) { cancelAnimationFrame(canvas._anatomyAnim); canvas._anatomyAnim = null; }
          var cCtx = canvas.getContext('2d');
          var W = canvas.width, H = canvas.height;
          var anatTick = 0;

          function drawAnatomyFrame() {
            anatTick++;
            cCtx.clearRect(0, 0, W, H);

            // ── X-ray mode background ──
            if (xrayMode) {
              cCtx.fillStyle = '#0a0a12';
              cCtx.fillRect(0, 0, W, H);
              // Subtle vignette
              var vigGrad = cCtx.createRadialGradient(W * 0.5, H * 0.45, H * 0.15, W * 0.5, H * 0.45, H * 0.65);
              vigGrad.addColorStop(0, 'rgba(30,30,50,0)');
              vigGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
              cCtx.fillStyle = vigGrad; cCtx.fillRect(0, 0, W, H);
            } else {
              // ── System-specific background gradient ──
              var bgGrad = cCtx.createRadialGradient(W * 0.5, H * 0.4, H * 0.1, W * 0.5, H * 0.4, H * 0.6);
              bgGrad.addColorStop(0, sys.accent + '06');
              bgGrad.addColorStop(1, '#fafaf900');
              cCtx.fillStyle = bgGrad;
              cCtx.fillRect(0, 0, W, H);
            }

            // ── Enhanced Anatomical Figure ──
            cCtx.save();
            cCtx.globalAlpha = xrayMode ? 0.12 : skinOpacity;
            cCtx.lineJoin = 'round';
            cCtx.lineCap = 'round';

            // Skin gradient (adapts to X-ray mode)
            var skinGrad = cCtx.createLinearGradient(W * 0.3, 0, W * 0.7, H);
            if (xrayMode) {
              skinGrad.addColorStop(0, '#2a2a3a');
              skinGrad.addColorStop(0.5, '#222233');
              skinGrad.addColorStop(1, '#1a1a2a');
            } else {
              skinGrad.addColorStop(0, '#f5e6d3');
              skinGrad.addColorStop(0.3, '#f0ddd0');
              skinGrad.addColorStop(0.6, '#ebd5c6');
              skinGrad.addColorStop(1, '#e8cfc0');
            }

            // Helper: draw body part
            function drawBodyPart(pathFn) {
              cCtx.save();
              cCtx.shadowColor = 'rgba(120,100,80,0.15)';
              cCtx.shadowBlur = 6;
              cCtx.beginPath(); pathFn(cCtx);
              cCtx.fillStyle = skinGrad; cCtx.fill();
              cCtx.shadowBlur = 0;
              cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.restore();
            }

            // Head
            drawBodyPart(function(c) { c.ellipse(W * 0.5, H * 0.06, W * 0.058, H * 0.046, 0, 0, Math.PI * 2); });
            // Jaw hint
            cCtx.beginPath(); cCtx.moveTo(W * 0.46, H * 0.085); cCtx.quadraticCurveTo(W * 0.50, H * 0.11, W * 0.54, H * 0.085);
            cCtx.strokeStyle = '#d4b8a0'; cCtx.lineWidth = 0.7; cCtx.stroke();
            // Ear hints
            cCtx.beginPath(); cCtx.ellipse(W * 0.44, H * 0.06, W * 0.008, H * 0.018, 0, 0, Math.PI * 2);
            cCtx.strokeStyle = '#d4b8a0'; cCtx.lineWidth = 0.6; cCtx.stroke();
            cCtx.beginPath(); cCtx.ellipse(W * 0.56, H * 0.06, W * 0.008, H * 0.018, 0, 0, Math.PI * 2);
            cCtx.strokeStyle = '#d4b8a0'; cCtx.lineWidth = 0.6; cCtx.stroke();

            // ── Facial features (anterior view) ──
            if (view === 'anterior') {
              cCtx.save(); cCtx.globalAlpha = Math.min(skinOpacity, 0.85);
              // Hairline arc
              cCtx.beginPath(); cCtx.ellipse(W * 0.5, H * 0.025, W * 0.052, H * 0.028, 0, Math.PI * 0.85, Math.PI * 0.15, true);
              cCtx.strokeStyle = '#a08060'; cCtx.lineWidth = 2.5; cCtx.stroke();
              // Eyebrows
              cCtx.beginPath(); cCtx.moveTo(W * 0.465, H * 0.046); cCtx.quadraticCurveTo(W * 0.475, H * 0.042, W * 0.49, H * 0.044);
              cCtx.strokeStyle = '#a08060'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.535, H * 0.046); cCtx.quadraticCurveTo(W * 0.525, H * 0.042, W * 0.51, H * 0.044); cCtx.stroke();
              // Eyes
              cCtx.beginPath(); cCtx.ellipse(W * 0.478, H * 0.053, W * 0.012, H * 0.005, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#fff'; cCtx.fill(); cCtx.strokeStyle = '#8a7060'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.arc(W * 0.478, H * 0.053, W * 0.005, 0, Math.PI * 2);
              cCtx.fillStyle = '#5a4030'; cCtx.fill();
              cCtx.beginPath(); cCtx.arc(W * 0.478, H * 0.052, W * 0.002, 0, Math.PI * 2);
              cCtx.fillStyle = '#1a1a1a'; cCtx.fill();
              cCtx.beginPath(); cCtx.ellipse(W * 0.522, H * 0.053, W * 0.012, H * 0.005, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#fff'; cCtx.fill(); cCtx.strokeStyle = '#8a7060'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.arc(W * 0.522, H * 0.053, W * 0.005, 0, Math.PI * 2);
              cCtx.fillStyle = '#5a4030'; cCtx.fill();
              cCtx.beginPath(); cCtx.arc(W * 0.522, H * 0.052, W * 0.002, 0, Math.PI * 2);
              cCtx.fillStyle = '#1a1a1a'; cCtx.fill();
              // Nose
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.050); cCtx.lineTo(W * 0.497, H * 0.068);
              cCtx.quadraticCurveTo(W * 0.49, H * 0.073, W * 0.493, H * 0.074);
              cCtx.moveTo(W * 0.50, H * 0.050); cCtx.lineTo(W * 0.503, H * 0.068);
              cCtx.quadraticCurveTo(W * 0.51, H * 0.073, W * 0.507, H * 0.074);
              cCtx.strokeStyle = '#c4a08a'; cCtx.lineWidth = 0.6; cCtx.stroke();
              // Nostrils
              cCtx.beginPath(); cCtx.ellipse(W * 0.495, H * 0.074, W * 0.004, H * 0.002, 0.2, 0, Math.PI * 2);
              cCtx.strokeStyle = '#b09080'; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.505, H * 0.074, W * 0.004, H * 0.002, -0.2, 0, Math.PI * 2); cCtx.stroke();
              // Mouth
              cCtx.beginPath(); cCtx.moveTo(W * 0.485, H * 0.083);
              cCtx.quadraticCurveTo(W * 0.50, H * 0.086, W * 0.515, H * 0.083);
              cCtx.strokeStyle = '#c09080'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Upper lip (cupid's bow)
              cCtx.beginPath(); cCtx.moveTo(W * 0.487, H * 0.082);
              cCtx.quadraticCurveTo(W * 0.494, H * 0.080, W * 0.50, H * 0.081);
              cCtx.quadraticCurveTo(W * 0.506, H * 0.080, W * 0.513, H * 0.082);
              cCtx.strokeStyle = '#c09080'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Chin dimple hint
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.095, W * 0.003, 0.2, Math.PI - 0.2);
              cCtx.strokeStyle = '#d4b8a0'; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.restore();
            }

            // Neck
            drawBodyPart(function(c) {
              c.moveTo(W * 0.465, H * 0.10); c.quadraticCurveTo(W * 0.46, H * 0.115, W * 0.44, H * 0.135);
              c.lineTo(W * 0.56, H * 0.135); c.quadraticCurveTo(W * 0.54, H * 0.115, W * 0.535, H * 0.10); c.closePath();
            });
            cCtx.beginPath(); cCtx.moveTo(W * 0.47, H * 0.105); cCtx.quadraticCurveTo(W * 0.45, H * 0.12, W * 0.45, H * 0.135);
            cCtx.strokeStyle = '#d9c0a8'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.53, H * 0.105); cCtx.quadraticCurveTo(W * 0.55, H * 0.12, W * 0.55, H * 0.135); cCtx.stroke();

            // Torso
            drawBodyPart(function(c) {
              c.moveTo(W * 0.34, H * 0.135); c.quadraticCurveTo(W * 0.38, H * 0.13, W * 0.50, H * 0.132);
              c.quadraticCurveTo(W * 0.62, H * 0.13, W * 0.66, H * 0.135);
              c.quadraticCurveTo(W * 0.69, H * 0.16, W * 0.68, H * 0.20);
              c.quadraticCurveTo(W * 0.67, H * 0.28, W * 0.64, H * 0.34);
              c.quadraticCurveTo(W * 0.61, H * 0.38, W * 0.58, H * 0.40);
              c.quadraticCurveTo(W * 0.55, H * 0.425, W * 0.50, H * 0.43);
              c.quadraticCurveTo(W * 0.45, H * 0.425, W * 0.42, H * 0.40);
              c.quadraticCurveTo(W * 0.39, H * 0.38, W * 0.36, H * 0.34);
              c.quadraticCurveTo(W * 0.33, H * 0.28, W * 0.32, H * 0.20);
              c.quadraticCurveTo(W * 0.31, H * 0.16, W * 0.34, H * 0.135);
            });
            // Torso musculature contours
            cCtx.globalAlpha = 0.3;
            cCtx.beginPath();
            cCtx.moveTo(W * 0.36, H * 0.155); cCtx.quadraticCurveTo(W * 0.42, H * 0.19, W * 0.50, H * 0.19);
            cCtx.quadraticCurveTo(W * 0.58, H * 0.19, W * 0.64, H * 0.155);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.6; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.15); cCtx.lineTo(W * 0.50, H * 0.42);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            for (var ri = 0; ri < 4; ri++) {
              var ry = H * (0.19 + ri * 0.032);
              cCtx.beginPath(); cCtx.moveTo(W * 0.42, ry); cCtx.quadraticCurveTo(W * 0.46, ry + H * 0.008, W * 0.50, ry + H * 0.003);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.58, ry); cCtx.quadraticCurveTo(W * 0.54, ry + H * 0.008, W * 0.50, ry + H * 0.003); cCtx.stroke();
            }
            for (var ai = 0; ai < 3; ai++) {
              var ay = H * (0.30 + ai * 0.035);
              cCtx.beginPath(); cCtx.moveTo(W * 0.44, ay); cCtx.lineTo(W * 0.56, ay);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.4; cCtx.stroke();
            }
            cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.36, 2.5, 0, Math.PI * 2);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.globalAlpha = 1.0;

            // Shoulders
            drawBodyPart(function(c) {
              c.moveTo(W * 0.34, H * 0.135); c.quadraticCurveTo(W * 0.28, H * 0.125, W * 0.25, H * 0.145);
              c.quadraticCurveTo(W * 0.24, H * 0.165, W * 0.27, H * 0.185);
              c.quadraticCurveTo(W * 0.30, H * 0.17, W * 0.34, H * 0.155); c.closePath();
            });
            drawBodyPart(function(c) {
              c.moveTo(W * 0.66, H * 0.135); c.quadraticCurveTo(W * 0.72, H * 0.125, W * 0.75, H * 0.145);
              c.quadraticCurveTo(W * 0.76, H * 0.165, W * 0.73, H * 0.185);
              c.quadraticCurveTo(W * 0.70, H * 0.17, W * 0.66, H * 0.155); c.closePath();
            });

            // Left arm
            drawBodyPart(function(c) {
              c.moveTo(W * 0.27, H * 0.185); c.quadraticCurveTo(W * 0.22, H * 0.22, W * 0.20, H * 0.28);
              c.quadraticCurveTo(W * 0.185, H * 0.33, W * 0.175, H * 0.36);
              c.quadraticCurveTo(W * 0.17, H * 0.39, W * 0.155, H * 0.44);
              c.lineTo(W * 0.13, H * 0.46); c.lineTo(W * 0.17, H * 0.47);
              c.quadraticCurveTo(W * 0.19, H * 0.42, W * 0.195, H * 0.38);
              c.quadraticCurveTo(W * 0.21, H * 0.33, W * 0.22, H * 0.29);
              c.quadraticCurveTo(W * 0.25, H * 0.22, W * 0.30, H * 0.185); c.closePath();
            });
            cCtx.globalAlpha = 0.25;
            cCtx.beginPath(); cCtx.moveTo(W * 0.24, H * 0.22); cCtx.quadraticCurveTo(W * 0.215, H * 0.27, W * 0.20, H * 0.30);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.globalAlpha = 1.0;

            // Right arm
            drawBodyPart(function(c) {
              c.moveTo(W * 0.73, H * 0.185); c.quadraticCurveTo(W * 0.78, H * 0.22, W * 0.80, H * 0.28);
              c.quadraticCurveTo(W * 0.815, H * 0.33, W * 0.825, H * 0.36);
              c.quadraticCurveTo(W * 0.83, H * 0.39, W * 0.845, H * 0.44);
              c.lineTo(W * 0.87, H * 0.46); c.lineTo(W * 0.83, H * 0.47);
              c.quadraticCurveTo(W * 0.81, H * 0.42, W * 0.805, H * 0.38);
              c.quadraticCurveTo(W * 0.79, H * 0.33, W * 0.78, H * 0.29);
              c.quadraticCurveTo(W * 0.75, H * 0.22, W * 0.70, H * 0.185); c.closePath();
            });
            cCtx.globalAlpha = 0.25;
            cCtx.beginPath(); cCtx.moveTo(W * 0.76, H * 0.22); cCtx.quadraticCurveTo(W * 0.785, H * 0.27, W * 0.80, H * 0.30);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.globalAlpha = 1.0;

            // Hands (palm)
            drawBodyPart(function(c) { c.ellipse(W * 0.15, H * 0.468, W * 0.022, H * 0.014, -0.2, 0, Math.PI * 2); });
            drawBodyPart(function(c) { c.ellipse(W * 0.85, H * 0.468, W * 0.022, H * 0.014, 0.2, 0, Math.PI * 2); });
            // Finger details — left hand
            cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.9;
            var lFingerBase = [[0.135, 0.457], [0.14, 0.454], [0.148, 0.454], [0.155, 0.457]];
            var lFingerTip =  [[0.125, 0.448], [0.133, 0.443], [0.144, 0.443], [0.154, 0.448]];
            for (var fi = 0; fi < 4; fi++) {
              cCtx.beginPath();
              cCtx.moveTo(W * lFingerBase[fi][0], H * lFingerBase[fi][1]);
              cCtx.lineTo(W * lFingerTip[fi][0], H * lFingerTip[fi][1]);
              cCtx.strokeStyle = '#d4b8a0'; cCtx.lineWidth = 2.2; cCtx.lineCap = 'round'; cCtx.stroke();
            }
            // Thumb — left
            cCtx.beginPath(); cCtx.moveTo(W * 0.130, H * 0.465); cCtx.quadraticCurveTo(W * 0.122, H * 0.462, W * 0.118, H * 0.458);
            cCtx.strokeStyle = '#d4b8a0'; cCtx.lineWidth = 2.5; cCtx.stroke();
            // Finger details — right hand
            var rFingerBase = [[0.865, 0.457], [0.86, 0.454], [0.852, 0.454], [0.845, 0.457]];
            var rFingerTip =  [[0.875, 0.448], [0.867, 0.443], [0.856, 0.443], [0.846, 0.448]];
            for (var fi2 = 0; fi2 < 4; fi2++) {
              cCtx.beginPath();
              cCtx.moveTo(W * rFingerBase[fi2][0], H * rFingerBase[fi2][1]);
              cCtx.lineTo(W * rFingerTip[fi2][0], H * rFingerTip[fi2][1]);
              cCtx.strokeStyle = '#d4b8a0'; cCtx.lineWidth = 2.2; cCtx.lineCap = 'round'; cCtx.stroke();
            }
            // Thumb — right
            cCtx.beginPath(); cCtx.moveTo(W * 0.870, H * 0.465); cCtx.quadraticCurveTo(W * 0.878, H * 0.462, W * 0.882, H * 0.458);
            cCtx.strokeStyle = '#d4b8a0'; cCtx.lineWidth = 2.5; cCtx.stroke();
            cCtx.restore();

            // Left leg
            drawBodyPart(function(c) {
              c.moveTo(W * 0.42, H * 0.425); c.quadraticCurveTo(W * 0.39, H * 0.46, W * 0.375, H * 0.52);
              c.quadraticCurveTo(W * 0.365, H * 0.58, W * 0.355, H * 0.63);
              c.quadraticCurveTo(W * 0.35, H * 0.66, W * 0.36, H * 0.70);
              c.quadraticCurveTo(W * 0.355, H * 0.74, W * 0.345, H * 0.80);
              c.quadraticCurveTo(W * 0.34, H * 0.86, W * 0.335, H * 0.90);
              c.lineTo(W * 0.30, H * 0.935); c.lineTo(W * 0.39, H * 0.935); c.lineTo(W * 0.40, H * 0.90);
              c.quadraticCurveTo(W * 0.405, H * 0.86, W * 0.41, H * 0.80);
              c.quadraticCurveTo(W * 0.42, H * 0.74, W * 0.425, H * 0.70);
              c.quadraticCurveTo(W * 0.43, H * 0.66, W * 0.435, H * 0.63);
              c.quadraticCurveTo(W * 0.44, H * 0.58, W * 0.45, H * 0.52);
              c.quadraticCurveTo(W * 0.46, H * 0.46, W * 0.49, H * 0.425); c.closePath();
            });
            cCtx.globalAlpha = 0.22;
            cCtx.beginPath(); cCtx.moveTo(W * 0.40, H * 0.46); cCtx.quadraticCurveTo(W * 0.39, H * 0.54, W * 0.38, H * 0.62);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.395, H * 0.68, 4, 0, Math.PI * 2);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.37, H * 0.73); cCtx.quadraticCurveTo(W * 0.36, H * 0.77, W * 0.36, H * 0.80); cCtx.stroke();
            cCtx.globalAlpha = 1.0;

            // Right leg
            drawBodyPart(function(c) {
              c.moveTo(W * 0.58, H * 0.425); c.quadraticCurveTo(W * 0.61, H * 0.46, W * 0.625, H * 0.52);
              c.quadraticCurveTo(W * 0.635, H * 0.58, W * 0.645, H * 0.63);
              c.quadraticCurveTo(W * 0.65, H * 0.66, W * 0.64, H * 0.70);
              c.quadraticCurveTo(W * 0.645, H * 0.74, W * 0.655, H * 0.80);
              c.quadraticCurveTo(W * 0.66, H * 0.86, W * 0.665, H * 0.90);
              c.lineTo(W * 0.70, H * 0.935); c.lineTo(W * 0.61, H * 0.935); c.lineTo(W * 0.60, H * 0.90);
              c.quadraticCurveTo(W * 0.595, H * 0.86, W * 0.59, H * 0.80);
              c.quadraticCurveTo(W * 0.58, H * 0.74, W * 0.575, H * 0.70);
              c.quadraticCurveTo(W * 0.57, H * 0.66, W * 0.565, H * 0.63);
              c.quadraticCurveTo(W * 0.56, H * 0.58, W * 0.55, H * 0.52);
              c.quadraticCurveTo(W * 0.54, H * 0.46, W * 0.51, H * 0.425); c.closePath();
            });
            cCtx.globalAlpha = 0.22;
            cCtx.beginPath(); cCtx.moveTo(W * 0.60, H * 0.46); cCtx.quadraticCurveTo(W * 0.61, H * 0.54, W * 0.62, H * 0.62);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.605, H * 0.68, 4, 0, Math.PI * 2);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.63, H * 0.73); cCtx.quadraticCurveTo(W * 0.64, H * 0.77, W * 0.64, H * 0.80); cCtx.stroke();
            cCtx.globalAlpha = 1.0;

            // Feet
            drawBodyPart(function(c) {
              c.moveTo(W * 0.30, H * 0.935); c.lineTo(W * 0.28, H * 0.955); c.quadraticCurveTo(W * 0.30, H * 0.965, W * 0.38, H * 0.96); c.lineTo(W * 0.39, H * 0.935); c.closePath();
            });
            drawBodyPart(function(c) {
              c.moveTo(W * 0.70, H * 0.935); c.lineTo(W * 0.72, H * 0.955); c.quadraticCurveTo(W * 0.70, H * 0.965, W * 0.62, H * 0.96); c.lineTo(W * 0.61, H * 0.935); c.closePath();
            });
            // Toe hints — left foot
            cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.5;
            for (var ti = 0; ti < 5; ti++) {
              cCtx.beginPath();
              cCtx.arc(W * (0.30 + ti * 0.018), H * 0.958, 1.5 - ti * 0.15, 0, Math.PI * 2);
              cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            }
            // Toe hints — right foot
            for (var ti2 = 0; ti2 < 5; ti2++) {
              cCtx.beginPath();
              cCtx.arc(W * (0.70 - ti2 * 0.018), H * 0.958, 1.5 - ti2 * 0.15, 0, Math.PI * 2);
              cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.5; cCtx.stroke();
            }
            // Ankle bone bumps (malleoli)
            cCtx.beginPath(); cCtx.arc(W * 0.345, H * 0.925, 2.5, 0, Math.PI * 2);
            cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.6; cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.385, H * 0.925, 2.5, 0, Math.PI * 2); cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.655, H * 0.925, 2.5, 0, Math.PI * 2); cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.615, H * 0.925, 2.5, 0, Math.PI * 2); cCtx.stroke();
            cCtx.restore();

            // ── Navel ──
            cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.4;
            cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.36, 2, 0, Math.PI * 2);
            cCtx.fillStyle = '#c4aa94'; cCtx.fill();
            cCtx.restore();

            // ── Joint indicator circles ──
            cCtx.save(); cCtx.globalAlpha = 0.15;
            var joints = [
              [0.30, 0.155, 5],    // left shoulder
              [0.70, 0.155, 5],    // right shoulder
              [0.22, 0.34, 4],     // left elbow
              [0.78, 0.34, 4],     // right elbow
              [0.17, 0.455, 3],    // left wrist
              [0.83, 0.455, 3],    // right wrist
              [0.44, 0.43, 5.5],   // left hip
              [0.56, 0.43, 5.5],   // right hip
              [0.395, 0.68, 4.5],  // left knee
              [0.605, 0.68, 4.5],  // right knee
              [0.365, 0.925, 3.5], // left ankle
              [0.635, 0.925, 3.5]  // right ankle
            ];
            for (var ji = 0; ji < joints.length; ji++) {
              cCtx.beginPath();
              cCtx.arc(W * joints[ji][0], H * joints[ji][1], joints[ji][2], 0, Math.PI * 2);
              cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 1.5; cCtx.stroke();
            }
            cCtx.restore();

            // ── Restore skin opacity ──
            cCtx.restore();
            cCtx.globalAlpha = 1.0;

            // Layer visibility helper
            function layerOn(lid) { return layers[lid] || lid === autoLayerId; }

            // ── POSTERIOR VIEW ENHANCEMENTS ──
            if (view === 'posterior') {
              cCtx.save(); cCtx.globalAlpha = 0.25;
              // Spine prominence
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.10);
              for (var spi = 0; spi < 22; spi++) { cCtx.lineTo(W * (0.50 + Math.sin(spi * 0.3) * 0.004), H * (0.105 + spi * 0.016)); }
              cCtx.strokeStyle = '#b0a090'; cCtx.lineWidth = 2.5; cCtx.stroke();
              for (var sp2 = 0; sp2 < 22; sp2++) {
                var spy = H * (0.105 + sp2 * 0.016);
                cCtx.beginPath(); cCtx.arc(W * 0.50, spy, 1.5, 0, Math.PI * 2);
                cCtx.fillStyle = '#b0a090'; cCtx.fill();
              }
              // Scapulae
              cCtx.beginPath();
              cCtx.moveTo(W * 0.40, H * 0.16); cCtx.quadraticCurveTo(W * 0.36, H * 0.18, W * 0.37, H * 0.24);
              cCtx.quadraticCurveTo(W * 0.39, H * 0.27, W * 0.44, H * 0.26); cCtx.quadraticCurveTo(W * 0.46, H * 0.22, W * 0.44, H * 0.16);
              cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.60, H * 0.16); cCtx.quadraticCurveTo(W * 0.64, H * 0.18, W * 0.63, H * 0.24);
              cCtx.quadraticCurveTo(W * 0.61, H * 0.27, W * 0.56, H * 0.26); cCtx.quadraticCurveTo(W * 0.54, H * 0.22, W * 0.56, H * 0.16);
              cCtx.strokeStyle = '#c4aa94'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Trapezius outline
              cCtx.beginPath();
              cCtx.moveTo(W * 0.50, H * 0.10); cCtx.quadraticCurveTo(W * 0.42, H * 0.12, W * 0.34, H * 0.14);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.6; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.50, H * 0.10); cCtx.quadraticCurveTo(W * 0.58, H * 0.12, W * 0.66, H * 0.14); cCtx.stroke();
              // Lats hints
              cCtx.beginPath();
              cCtx.moveTo(W * 0.44, H * 0.20); cCtx.quadraticCurveTo(W * 0.38, H * 0.28, W * 0.40, H * 0.35);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.56, H * 0.20); cCtx.quadraticCurveTo(W * 0.62, H * 0.28, W * 0.60, H * 0.35); cCtx.stroke();
              // Gluteal contour
              cCtx.beginPath();
              cCtx.moveTo(W * 0.42, H * 0.42); cCtx.quadraticCurveTo(W * 0.38, H * 0.44, W * 0.39, H * 0.47);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.58, H * 0.42); cCtx.quadraticCurveTo(W * 0.62, H * 0.44, W * 0.61, H * 0.47); cCtx.stroke();
              cCtx.restore();
            }

            // ── SKELETAL LAYER ── (X-ray: bright glow on dark background)
            if (layerOn('skeletal') || xrayMode) {
              cCtx.save();
              cCtx.globalAlpha = xrayMode ? 0.85 : 0.45;
              if (xrayMode) { cCtx.shadowColor = '#e0f0ff'; cCtx.shadowBlur = 8; }
              var boneColor = xrayMode ? '#d0e8ff' : '#94a3b8';
              var boneLW = xrayMode ? 1.3 : 1.0;
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.10);
              for (var si = 0; si < 18; si++) { var sy = H * (0.11 + si * 0.018); cCtx.lineTo(W * (0.50 + Math.sin(si * 0.3) * 0.003), sy); }
              cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 3.5; cCtx.stroke();
              for (var vi2 = 0; vi2 < 18; vi2++) { var vy2 = H * (0.11 + vi2 * 0.018); cCtx.beginPath(); cCtx.moveTo(W * 0.48, vy2); cCtx.lineTo(W * 0.52, vy2); cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 2; cCtx.stroke(); }
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.055, W * 0.046, 0, Math.PI * 2);
              cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 2; cCtx.stroke();
              for (var ri2 = 0; ri2 < 6; ri2++) { var ry2 = H * (0.175 + ri2 * 0.025); cCtx.beginPath(); cCtx.moveTo(W * 0.43, ry2); cCtx.quadraticCurveTo(W * 0.38, ry2 + H * 0.01, W * 0.36, ry2 + H * 0.005); cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 1.3; cCtx.stroke(); cCtx.beginPath(); cCtx.moveTo(W * 0.57, ry2); cCtx.quadraticCurveTo(W * 0.62, ry2 + H * 0.01, W * 0.64, ry2 + H * 0.005); cCtx.stroke(); }
              cCtx.beginPath(); cCtx.moveTo(W * 0.40, H * 0.39); cCtx.quadraticCurveTo(W * 0.36, H * 0.42, W * 0.38, H * 0.45); cCtx.quadraticCurveTo(W * 0.44, H * 0.46, W * 0.50, H * 0.44); cCtx.quadraticCurveTo(W * 0.56, H * 0.46, W * 0.62, H * 0.45); cCtx.quadraticCurveTo(W * 0.64, H * 0.42, W * 0.60, H * 0.39);
              cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 2.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.42, H * 0.138); cCtx.quadraticCurveTo(W * 0.36, H * 0.132, W * 0.30, H * 0.145); cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.58, H * 0.138); cCtx.quadraticCurveTo(W * 0.64, H * 0.132, W * 0.70, H * 0.145); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.44, H * 0.46); cCtx.lineTo(W * 0.40, H * 0.66); cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 2.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.56, H * 0.46); cCtx.lineTo(W * 0.60, H * 0.66); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.40, H * 0.68); cCtx.lineTo(W * 0.37, H * 0.90); cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.41, H * 0.68); cCtx.lineTo(W * 0.39, H * 0.90); cCtx.strokeStyle = '#b0bec5'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.60, H * 0.68); cCtx.lineTo(W * 0.63, H * 0.90); cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.59, H * 0.68); cCtx.lineTo(W * 0.61, H * 0.90); cCtx.strokeStyle = '#b0bec5'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.30, H * 0.16); cCtx.lineTo(W * 0.22, H * 0.34); cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.70, H * 0.16); cCtx.lineTo(W * 0.78, H * 0.34); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.22, H * 0.35); cCtx.lineTo(W * 0.17, H * 0.46); cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.23, H * 0.35); cCtx.lineTo(W * 0.18, H * 0.46); cCtx.strokeStyle = '#b0bec5'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.78, H * 0.35); cCtx.lineTo(W * 0.83, H * 0.46); cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.77, H * 0.35); cCtx.lineTo(W * 0.82, H * 0.46); cCtx.strokeStyle = '#b0bec5'; cCtx.lineWidth = 1; cCtx.stroke();
              if (view === 'posterior') {
                cCtx.beginPath(); cCtx.moveTo(W * 0.40, H * 0.16); cCtx.lineTo(W * 0.37, H * 0.24); cCtx.lineTo(W * 0.44, H * 0.26); cCtx.closePath();
                cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 1.5; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.60, H * 0.16); cCtx.lineTo(W * 0.63, H * 0.24); cCtx.lineTo(W * 0.56, H * 0.26); cCtx.closePath(); cCtx.stroke();
              }
              cCtx.restore();
            }

            // ── MUSCULAR LAYER ──
            if (layerOn('muscular')) {
              cCtx.save(); cCtx.globalAlpha = 0.40;
              if (view === 'posterior') {
                // Trapezius
                cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.10);
                cCtx.quadraticCurveTo(W * 0.40, H * 0.13, W * 0.34, H * 0.15);
                cCtx.quadraticCurveTo(W * 0.38, H * 0.20, W * 0.46, H * 0.24);
                cCtx.lineTo(W * 0.54, H * 0.24);
                cCtx.quadraticCurveTo(W * 0.62, H * 0.20, W * 0.66, H * 0.15);
                cCtx.quadraticCurveTo(W * 0.60, H * 0.13, W * 0.50, H * 0.10);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                // Lats
                cCtx.beginPath(); cCtx.moveTo(W * 0.44, H * 0.22); cCtx.quadraticCurveTo(W * 0.36, H * 0.28, W * 0.38, H * 0.38);
                cCtx.quadraticCurveTo(W * 0.42, H * 0.40, W * 0.48, H * 0.36);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.7; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.56, H * 0.22); cCtx.quadraticCurveTo(W * 0.64, H * 0.28, W * 0.62, H * 0.38);
                cCtx.quadraticCurveTo(W * 0.58, H * 0.40, W * 0.52, H * 0.36);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.7; cCtx.stroke();
                // Glutes
                cCtx.beginPath(); cCtx.ellipse(W * 0.43, H * 0.44, W * 0.04, H * 0.03, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.57, H * 0.44, W * 0.04, H * 0.03, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                // Hamstrings
                cCtx.beginPath(); cCtx.ellipse(W * 0.41, H * 0.56, W * 0.025, H * 0.06, 0.05, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.7; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.59, H * 0.56, W * 0.025, H * 0.06, -0.05, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.stroke();
              } else {
                cCtx.beginPath(); cCtx.moveTo(W * 0.37, H * 0.14); cCtx.quadraticCurveTo(W * 0.42, H * 0.20, W * 0.49, H * 0.20); cCtx.quadraticCurveTo(W * 0.46, H * 0.17, W * 0.37, H * 0.14);
                cCtx.fillStyle = '#fca5a5'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 1.2; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.63, H * 0.14); cCtx.quadraticCurveTo(W * 0.58, H * 0.20, W * 0.51, H * 0.20); cCtx.quadraticCurveTo(W * 0.54, H * 0.17, W * 0.63, H * 0.14);
                cCtx.fillStyle = '#fca5a5'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 1.2; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.30, H * 0.16, W * 0.04, H * 0.022, -0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.70, H * 0.16, W * 0.04, H * 0.022, 0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                for (var mi = 0; mi < 4; mi++) { var my = H * (0.28 + mi * 0.03); cCtx.beginPath(); cCtx.moveTo(W * 0.45, my); cCtx.lineTo(W * 0.55, my); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 1; cCtx.stroke(); }
                cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.22); cCtx.lineTo(W * 0.50, H * 0.40); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.41, H * 0.54, W * 0.028, H * 0.07, 0.08, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.59, H * 0.54, W * 0.028, H * 0.07, -0.08, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.25, H * 0.27, W * 0.016, H * 0.035, 0.5, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.75, H * 0.27, W * 0.016, H * 0.035, -0.5, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
              }
              cCtx.beginPath(); cCtx.ellipse(W * 0.38, H * 0.77, W * 0.018, H * 0.04, 0.05, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.62, H * 0.77, W * 0.018, H * 0.04, -0.05, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.restore();
            }

            // ── ORGAN LAYER (with breathing animation) ──
            if (layerOn('organs')) {
              cCtx.save(); cCtx.globalAlpha = 0.50;
              var breathCycle = 1.0 + Math.sin(anatTick * 0.03) * 0.06;
              cCtx.save(); cCtx.translate(W * 0.42, H * 0.22); cCtx.scale(breathCycle, breathCycle);
              cCtx.beginPath(); cCtx.ellipse(0, 0, W * 0.055, H * 0.055, 0, 0, Math.PI * 2); cCtx.fillStyle = '#bfdbfe'; cCtx.fill(); cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.restore();
              cCtx.save(); cCtx.translate(W * 0.58, H * 0.22); cCtx.scale(breathCycle, breathCycle);
              cCtx.beginPath(); cCtx.ellipse(0, 0, W * 0.055, H * 0.055, 0, 0, Math.PI * 2); cCtx.fillStyle = '#bfdbfe'; cCtx.fill(); cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.restore();
              cCtx.beginPath();
              var hx = W * 0.50, hy = H * 0.24;
              cCtx.moveTo(hx, hy + 6); cCtx.bezierCurveTo(hx - 8, hy - 4, hx - 14, hy, hx - 14, hy + 6); cCtx.bezierCurveTo(hx - 14, hy + 12, hx - 4, hy + 18, hx, hy + 22); cCtx.bezierCurveTo(hx + 4, hy + 18, hx + 14, hy + 12, hx + 14, hy + 6); cCtx.bezierCurveTo(hx + 14, hy, hx + 8, hy - 4, hx, hy + 6);
              cCtx.fillStyle = '#fca5a5'; cCtx.fill(); cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.56, H * 0.30, W * 0.045, H * 0.028, 0.2, 0, Math.PI * 2); cCtx.fillStyle = '#a1887f'; cCtx.fill(); cCtx.strokeStyle = '#795548'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.47, H * 0.31, W * 0.032, H * 0.028, -0.3, 0, Math.PI * 2); cCtx.fillStyle = '#c8e6c9'; cCtx.fill(); cCtx.strokeStyle = '#43a047'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.43, H * 0.35, W * 0.015, H * 0.02, 0, 0, Math.PI * 2); cCtx.fillStyle = '#ef9a9a'; cCtx.fill(); cCtx.strokeStyle = '#c62828'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.57, H * 0.35, W * 0.015, H * 0.02, 0, 0, Math.PI * 2); cCtx.fillStyle = '#ef9a9a'; cCtx.fill(); cCtx.strokeStyle = '#c62828'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.44, H * 0.35);
              for (var ii = 0; ii < 8; ii++) { cCtx.lineTo(W * (0.44 + (ii % 2 === 0 ? 0.06 : 0)), H * (0.36 + ii * 0.01)); }
              cCtx.strokeStyle = '#66bb6a'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.43, W * 0.02, H * 0.015, 0, 0, Math.PI * 2); cCtx.fillStyle = '#ffe082'; cCtx.fill(); cCtx.strokeStyle = '#ffa000'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.restore();
            }

            // ── CIRCULATORY LAYER (with heartbeat + blood flow) ──
            if (layerOn('circulatory')) {
              cCtx.save(); cCtx.globalAlpha = 0.45;
              var heartPulse = 1.0 + Math.sin(anatTick * 0.08) * 0.08;
              cCtx.save(); cCtx.translate(W * 0.50, H * 0.23); cCtx.scale(heartPulse, heartPulse);
              cCtx.beginPath(); cCtx.moveTo(0, 4); cCtx.bezierCurveTo(-10, -5, -18, -1, -18, 6); cCtx.bezierCurveTo(-18, 14, -4, 20, 0, 28); cCtx.bezierCurveTo(4, 20, 18, 14, 18, 6); cCtx.bezierCurveTo(18, -1, 10, -5, 0, 4);
              cCtx.fillStyle = '#ef4444'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.restore();
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.20); cCtx.quadraticCurveTo(W * 0.52, H * 0.17, W * 0.54, H * 0.15); cCtx.quadraticCurveTo(W * 0.53, H * 0.13, W * 0.50, H * 0.10);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 3; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.23); cCtx.lineTo(W * 0.50, H * 0.44);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 2.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.48, H * 0.10); cCtx.lineTo(W * 0.47, H * 0.06); cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.52, H * 0.10); cCtx.lineTo(W * 0.53, H * 0.06); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.47, H * 0.44); cCtx.lineTo(W * 0.41, H * 0.68); cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.53, H * 0.44); cCtx.lineTo(W * 0.59, H * 0.68); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.41, H * 0.69); cCtx.lineTo(W * 0.38, H * 0.90); cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.59, H * 0.69); cCtx.lineTo(W * 0.62, H * 0.90); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.34, H * 0.16); cCtx.lineTo(W * 0.22, H * 0.34); cCtx.lineTo(W * 0.17, H * 0.46); cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.66, H * 0.16); cCtx.lineTo(W * 0.78, H * 0.34); cCtx.lineTo(W * 0.83, H * 0.46); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.52, H * 0.22); cCtx.lineTo(W * 0.52, H * 0.15); cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.52, H * 0.28); cCtx.lineTo(W * 0.52, H * 0.44); cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.49, H * 0.44); cCtx.lineTo(W * 0.43, H * 0.68); cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.51, H * 0.44); cCtx.lineTo(W * 0.57, H * 0.68); cCtx.stroke();
              // Animated blood flow particles
              for (var bfi = 0; bfi < 6; bfi++) {
                var bfT = ((anatTick * 0.012 + bfi * 0.17) % 1.0);
                var bfX, bfY;
                if (bfi < 2) { bfX = W * 0.50; bfY = H * (0.23 + bfT * 0.21); }
                else if (bfi < 4) { bfX = W * (0.47 - bfT * 0.06); bfY = H * (0.44 + bfT * 0.24); }
                else { bfX = W * (0.53 + bfT * 0.06); bfY = H * (0.44 + bfT * 0.24); }
                cCtx.beginPath(); cCtx.arc(bfX, bfY, 2.5, 0, Math.PI * 2);
                cCtx.fillStyle = '#ef4444'; cCtx.globalAlpha = 0.7; cCtx.fill(); cCtx.globalAlpha = 0.45;
              }
              // ── ECG waveform animation ──
              cCtx.save(); cCtx.globalAlpha = 0.55;
              var ecgX0 = W * 0.02, ecgY0 = H * 0.96, ecgW = W * 0.25, ecgH = H * 0.03;
              cCtx.beginPath(); cCtx.roundRect(ecgX0 - 2, ecgY0 - ecgH - 4, ecgW + 6, ecgH * 2 + 8, 3);
              cCtx.fillStyle = 'rgba(0,0,0,0.5)'; cCtx.fill();
              cCtx.beginPath();
              var ecgPhase = (anatTick * 2) % Math.floor(ecgW);
              for (var ei = 0; ei < ecgW; ei++) {
                var ePos = (ei + ecgPhase) % ecgW;
                var eNorm = ePos / ecgW;
                var eVal = 0;
                if (eNorm > 0.10 && eNorm < 0.15) eVal = (eNorm - 0.10) * 6;
                else if (eNorm >= 0.15 && eNorm < 0.20) eVal = (0.20 - eNorm) * 6;
                else if (eNorm >= 0.30 && eNorm < 0.33) eVal = -(eNorm - 0.30) * 12;
                else if (eNorm >= 0.33 && eNorm < 0.36) eVal = -0.36 + (eNorm - 0.33) * 40;
                else if (eNorm >= 0.36 && eNorm < 0.40) eVal = 0.84 - (eNorm - 0.36) * 28;
                else if (eNorm >= 0.40 && eNorm < 0.43) eVal = -(eNorm - 0.40) * 8;
                else if (eNorm >= 0.43 && eNorm < 0.48) eVal = -0.24 + (eNorm - 0.43) * 4.8;
                else if (eNorm >= 0.60 && eNorm < 0.70) eVal = Math.sin((eNorm - 0.60) * Math.PI / 0.10) * 0.3;
                if (ei === 0) cCtx.moveTo(ecgX0 + ei, ecgY0 - eVal * ecgH);
                else cCtx.lineTo(ecgX0 + ei, ecgY0 - eVal * ecgH);
              }
              cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.font = 'bold 7px monospace'; cCtx.fillStyle = '#22c55e'; cCtx.textAlign = 'left';
              cCtx.fillText('ECG', ecgX0 + 2, ecgY0 - ecgH - 1);
              var heartRateDisplay = 60 + Math.floor(Math.sin(anatTick * 0.01) * 12);
              cCtx.fillText(heartRateDisplay + ' BPM', ecgX0 + ecgW - 30, ecgY0 - ecgH - 1);
              cCtx.restore();
              cCtx.restore();
            }

            // ── NERVOUS LAYER (with firing flash) ──
            if (layerOn('nervous')) {
              cCtx.save(); cCtx.globalAlpha = 0.45;
              var nerveFlashActive = (anatTick % 60) < 5;
              var nerveFlashBranch = Math.floor(anatTick / 60) % 10;
              var brGlow = cCtx.createRadialGradient(W * 0.50, H * 0.055, 4, W * 0.50, H * 0.055, W * 0.05);
              brGlow.addColorStop(0, '#fef08a'); brGlow.addColorStop(1, '#fef08a00');
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.055, W * 0.05, 0, Math.PI * 2); cCtx.fillStyle = brGlow; cCtx.fill();
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.055, W * 0.042, 0, Math.PI * 2); cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.09); cCtx.lineTo(W * 0.50, H * 0.44);
              cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 3; cCtx.stroke();
              var nervePts = [
                [0.50, 0.14, 0.30, 0.30], [0.50, 0.14, 0.70, 0.30],
                [0.50, 0.20, 0.28, 0.36], [0.50, 0.20, 0.72, 0.36],
                [0.50, 0.30, 0.20, 0.44], [0.50, 0.30, 0.80, 0.44],
                [0.50, 0.44, 0.39, 0.72], [0.50, 0.44, 0.61, 0.72],
                [0.39, 0.72, 0.37, 0.90], [0.61, 0.72, 0.63, 0.90]
              ];
              nervePts.forEach(function(np, npIdx) {
                cCtx.beginPath(); cCtx.moveTo(W * np[0], H * np[1]); cCtx.quadraticCurveTo(W * (np[0] + np[2]) * 0.5, H * (np[1] + np[3]) * 0.5, W * np[2], H * np[3]);
                cCtx.strokeStyle = '#eab308';
                cCtx.lineWidth = (nerveFlashActive && npIdx === nerveFlashBranch) ? 3 : 1.2;
                if (nerveFlashActive && npIdx === nerveFlashBranch) { cCtx.globalAlpha = 0.8; }
                cCtx.stroke();
                if (nerveFlashActive && npIdx === nerveFlashBranch) { cCtx.globalAlpha = 0.45; }
              });
              [[0.50, 0.14], [0.50, 0.20], [0.50, 0.30], [0.50, 0.38]].forEach(function(n) {
                cCtx.beginPath(); cCtx.arc(W * n[0], H * n[1], 2.5, 0, Math.PI * 2); cCtx.fillStyle = '#eab308'; cCtx.fill();
              });
              cCtx.restore();
            }

            // ── LYMPHATIC LAYER ──
            if (layerOn('lymphatic')) {
              cCtx.save(); cCtx.globalAlpha = 0.40;
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.14); cCtx.quadraticCurveTo(W * 0.48, H * 0.30, W * 0.50, H * 0.44);
              cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 2; cCtx.setLineDash([4, 3]); cCtx.stroke(); cCtx.setLineDash([]);
              var lnPts = [[0.46, 0.13], [0.54, 0.13], [0.34, 0.20], [0.66, 0.20], [0.44, 0.30], [0.56, 0.30], [0.44, 0.44], [0.56, 0.44], [0.42, 0.58], [0.58, 0.58]];
              lnPts.forEach(function(ln) { cCtx.beginPath(); cCtx.arc(W * ln[0], H * ln[1], 4, 0, Math.PI * 2); cCtx.fillStyle = '#86efac'; cCtx.fill(); cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 1; cCtx.stroke(); });
              cCtx.beginPath(); cCtx.ellipse(W * 0.58, H * 0.32, W * 0.02, H * 0.018, 0, 0, Math.PI * 2); cCtx.fillStyle = '#86efac80'; cCtx.fill(); cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.18, W * 0.015, H * 0.012, 0, 0, Math.PI * 2); cCtx.fillStyle = '#86efac80'; cCtx.fill(); cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 1; cCtx.stroke();
              for (var li = 0; li < lnPts.length - 2; li++) { cCtx.beginPath(); cCtx.moveTo(W * lnPts[li][0], H * lnPts[li][1]); cCtx.lineTo(W * lnPts[li + 2][0], H * lnPts[li + 2][1]); cCtx.strokeStyle = '#22c55e50'; cCtx.lineWidth = 0.8; cCtx.setLineDash([2, 3]); cCtx.stroke(); cCtx.setLineDash([]); }
              cCtx.restore();
            }

            // ── RESPIRATORY TREE (when respiratory system selected) ──
            if (sysKey === 'respiratory') {
              cCtx.save(); cCtx.globalAlpha = 0.40;
              // Trachea
              cCtx.beginPath(); cCtx.moveTo(W * 0.498, H * 0.115); cCtx.lineTo(W * 0.498, H * 0.19);
              cCtx.moveTo(W * 0.502, H * 0.115); cCtx.lineTo(W * 0.502, H * 0.19);
              cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 2.5; cCtx.stroke();
              // Cartilage rings
              for (var cr = 0; cr < 6; cr++) {
                var crY = H * (0.125 + cr * 0.012);
                cCtx.beginPath(); cCtx.moveTo(W * 0.49, crY); cCtx.lineTo(W * 0.51, crY);
                cCtx.strokeStyle = '#93c5fd'; cCtx.lineWidth = 1.5; cCtx.stroke();
              }
              // Main bronchi
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.19);
              cCtx.quadraticCurveTo(W * 0.46, H * 0.20, W * 0.43, H * 0.22);
              cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.19);
              cCtx.quadraticCurveTo(W * 0.54, H * 0.20, W * 0.57, H * 0.22);
              cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 2; cCtx.stroke();
              // Secondary bronchi (left)
              cCtx.beginPath(); cCtx.moveTo(W * 0.43, H * 0.22); cCtx.quadraticCurveTo(W * 0.40, H * 0.23, W * 0.39, H * 0.25); cCtx.strokeStyle = '#93c5fd'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.43, H * 0.22); cCtx.quadraticCurveTo(W * 0.42, H * 0.24, W * 0.44, H * 0.26); cCtx.stroke();
              // Secondary bronchi (right)
              cCtx.beginPath(); cCtx.moveTo(W * 0.57, H * 0.22); cCtx.quadraticCurveTo(W * 0.60, H * 0.23, W * 0.61, H * 0.25); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.57, H * 0.22); cCtx.quadraticCurveTo(W * 0.58, H * 0.24, W * 0.56, H * 0.26); cCtx.stroke();
              // Tertiary bronchioles (tiny branches)
              var bronchioles = [
                [0.39, 0.25, 0.37, 0.27], [0.39, 0.25, 0.41, 0.27],
                [0.44, 0.26, 0.42, 0.28], [0.44, 0.26, 0.46, 0.28],
                [0.61, 0.25, 0.63, 0.27], [0.61, 0.25, 0.59, 0.27],
                [0.56, 0.26, 0.58, 0.28], [0.56, 0.26, 0.54, 0.28]
              ];
              bronchioles.forEach(function(b) {
                cCtx.beginPath(); cCtx.moveTo(W * b[0], H * b[1]); cCtx.lineTo(W * b[2], H * b[3]);
                cCtx.strokeStyle = '#bfdbfe'; cCtx.lineWidth = 0.8; cCtx.stroke();
              });
              // Alveoli clusters
              var alveoliPts = [[0.37, 0.275], [0.41, 0.275], [0.42, 0.285], [0.46, 0.285], [0.63, 0.275], [0.59, 0.275], [0.58, 0.285], [0.54, 0.285]];
              alveoliPts.forEach(function(a) {
                cCtx.beginPath(); cCtx.arc(W * a[0], H * a[1], 2, 0, Math.PI * 2);
                cCtx.fillStyle = '#dbeafe'; cCtx.fill(); cCtx.strokeStyle = '#93c5fd'; cCtx.lineWidth = 0.5; cCtx.stroke();
              });
              cCtx.restore();
            }

            // ── DIGESTIVE TRACT PATH (when organs system selected) ──
            if (sysKey === 'organs') {
              cCtx.save(); cCtx.globalAlpha = 0.30;
              // Esophagus
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.115);
              cCtx.quadraticCurveTo(W * 0.49, H * 0.18, W * 0.48, H * 0.28);
              cCtx.strokeStyle = '#f97316'; cCtx.lineWidth = 2; cCtx.setLineDash([3, 2]); cCtx.stroke(); cCtx.setLineDash([]);
              // Stomach outline
              cCtx.beginPath();
              cCtx.moveTo(W * 0.48, H * 0.28); cCtx.quadraticCurveTo(W * 0.44, H * 0.29, W * 0.43, H * 0.32);
              cCtx.quadraticCurveTo(W * 0.44, H * 0.35, W * 0.48, H * 0.35);
              cCtx.strokeStyle = '#f97316'; cCtx.lineWidth = 1.5; cCtx.stroke();
              // Duodenum curve
              cCtx.beginPath(); cCtx.moveTo(W * 0.48, H * 0.35);
              cCtx.quadraticCurveTo(W * 0.52, H * 0.355, W * 0.52, H * 0.37);
              cCtx.quadraticCurveTo(W * 0.52, H * 0.385, W * 0.48, H * 0.39);
              cCtx.strokeStyle = '#fb923c'; cCtx.lineWidth = 1.2; cCtx.stroke();
              // Small intestine coils
              var siY = H * 0.39;
              for (var sci = 0; sci < 5; sci++) {
                cCtx.beginPath();
                cCtx.moveTo(W * 0.44, siY + sci * H * 0.012);
                cCtx.quadraticCurveTo(W * 0.50, siY + sci * H * 0.012 + H * 0.006, W * 0.56, siY + sci * H * 0.012);
                cCtx.strokeStyle = '#fb923c'; cCtx.lineWidth = 0.8; cCtx.stroke();
              }
              // Large intestine frame
              cCtx.beginPath();
              cCtx.moveTo(W * 0.56, H * 0.39); cCtx.lineTo(W * 0.58, H * 0.35);
              cCtx.lineTo(W * 0.58, H * 0.30); cCtx.quadraticCurveTo(W * 0.55, H * 0.295, W * 0.50, H * 0.30);
              cCtx.quadraticCurveTo(W * 0.45, H * 0.295, W * 0.42, H * 0.30);
              cCtx.lineTo(W * 0.42, H * 0.35); cCtx.lineTo(W * 0.44, H * 0.39);
              cCtx.strokeStyle = '#92400e'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.restore();
            }

            // ── DIAPHRAGM DOME (always visible when organs or respiratory active) ──
            if (sysKey === 'respiratory' || sysKey === 'organs' || layerOn('organs')) {
              cCtx.save(); cCtx.globalAlpha = 0.30;
              cCtx.beginPath();
              cCtx.moveTo(W * 0.34, H * 0.29);
              cCtx.quadraticCurveTo(W * 0.42, H * 0.275, W * 0.50, H * 0.28);
              cCtx.quadraticCurveTo(W * 0.58, H * 0.275, W * 0.66, H * 0.29);
              cCtx.strokeStyle = '#f472b6'; cCtx.lineWidth = 1.5; cCtx.setLineDash([4, 3]); cCtx.stroke(); cCtx.setLineDash([]);
              cCtx.font = 'bold 7px Inter, system-ui, sans-serif';
              cCtx.fillStyle = '#f472b6'; cCtx.textAlign = 'right';
              cCtx.fillText('diaphragm', W * 0.34 - 4, H * 0.293);
              cCtx.restore();
            }

            // ── ENDOCRINE GLAND SHAPES (when endocrine system selected) ──
            if (sysKey === 'endocrine') {
              cCtx.save(); cCtx.globalAlpha = 0.35;
              // Pituitary
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.075, W * 0.006, H * 0.004, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#c084fc'; cCtx.fill(); cCtx.strokeStyle = '#9333ea'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Thyroid butterfly
              cCtx.beginPath(); cCtx.ellipse(W * 0.48, H * 0.12, W * 0.012, H * 0.008, 0.2, 0, Math.PI * 2);
              cCtx.fillStyle = '#c084fc40'; cCtx.fill(); cCtx.strokeStyle = '#9333ea'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.52, H * 0.12, W * 0.012, H * 0.008, -0.2, 0, Math.PI * 2);
              cCtx.fillStyle = '#c084fc40'; cCtx.fill(); cCtx.strokeStyle = '#9333ea'; cCtx.lineWidth = 0.7; cCtx.stroke();
              // Adrenals (on kidneys)
              cCtx.beginPath(); cCtx.moveTo(W * 0.42, H * 0.33);
              cCtx.quadraticCurveTo(W * 0.435, H * 0.325, W * 0.45, H * 0.33);
              cCtx.fillStyle = '#c084fc60'; cCtx.fill(); cCtx.strokeStyle = '#9333ea'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.55, H * 0.33);
              cCtx.quadraticCurveTo(W * 0.565, H * 0.325, W * 0.58, H * 0.33);
              cCtx.fillStyle = '#c084fc60'; cCtx.fill(); cCtx.stroke();
              // Pancreas islets dots
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.34, W * 0.03, H * 0.008, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = '#9333ea'; cCtx.lineWidth = 0.8; cCtx.setLineDash([2, 2]); cCtx.stroke(); cCtx.setLineDash([]);
              for (var ei2 = 0; ei2 < 5; ei2++) {
                cCtx.beginPath(); cCtx.arc(W * (0.475 + ei2 * 0.012), H * 0.34, 1.5, 0, Math.PI * 2);
                cCtx.fillStyle = '#c084fc'; cCtx.fill();
              }
              // Pineal gland
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.048, 2, 0, Math.PI * 2);
              cCtx.fillStyle = '#c084fc'; cCtx.fill(); cCtx.strokeStyle = '#9333ea'; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.restore();
            }

            // ── REPRODUCTIVE OUTLINES (when reproductive system selected) ──
            if (sysKey === 'reproductive') {
              cCtx.save(); cCtx.globalAlpha = 0.30;
              // Uterus outline
              cCtx.beginPath();
              cCtx.moveTo(W * 0.47, H * 0.40); cCtx.quadraticCurveTo(W * 0.45, H * 0.41, W * 0.45, H * 0.43);
              cCtx.quadraticCurveTo(W * 0.45, H * 0.45, W * 0.50, H * 0.46);
              cCtx.quadraticCurveTo(W * 0.55, H * 0.45, W * 0.55, H * 0.43);
              cCtx.quadraticCurveTo(W * 0.55, H * 0.41, W * 0.53, H * 0.40);
              cCtx.strokeStyle = '#ec4899'; cCtx.lineWidth = 1.5; cCtx.stroke();
              // Fallopian tubes
              cCtx.beginPath(); cCtx.moveTo(W * 0.47, H * 0.40); cCtx.quadraticCurveTo(W * 0.43, H * 0.39, W * 0.40, H * 0.40);
              cCtx.strokeStyle = '#ec4899'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.53, H * 0.40); cCtx.quadraticCurveTo(W * 0.57, H * 0.39, W * 0.60, H * 0.40); cCtx.stroke();
              // Ovaries
              cCtx.beginPath(); cCtx.ellipse(W * 0.39, H * 0.405, W * 0.01, H * 0.007, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#fce7f350'; cCtx.fill(); cCtx.strokeStyle = '#ec4899'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.61, H * 0.405, W * 0.01, H * 0.007, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#fce7f350'; cCtx.fill(); cCtx.stroke();
              cCtx.restore();
            }

            // ── ANATOMICAL COMPASS ROSE ──
            cCtx.save(); cCtx.globalAlpha = 0.35;
            var compX = W - 28, compY = 20;
            cCtx.beginPath(); cCtx.arc(compX, compY, 14, 0, Math.PI * 2);
            cCtx.fillStyle = '#f8fafc'; cCtx.fill(); cCtx.strokeStyle = '#cbd5e1'; cCtx.lineWidth = 0.8; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(compX, compY - 11); cCtx.lineTo(compX, compY + 11);
            cCtx.moveTo(compX - 11, compY); cCtx.lineTo(compX + 11, compY);
            cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.font = 'bold 6px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#64748b'; cCtx.textAlign = 'center';
            cCtx.fillText('S', compX, compY - 7);  // Superior
            cCtx.fillText('I', compX, compY + 10);  // Inferior
            cCtx.fillText('L', compX - 8, compY + 2);  // Lateral
            cCtx.fillText('M', compX + 8, compY + 2);  // Medial (for anterior view)
            cCtx.restore();

            // ── BODY REGION LABELS (subtle background labels) ──
            if (d._showRegionLabels) {
              cCtx.save(); cCtx.globalAlpha = 0.18;
              cCtx.font = 'bold 7px Inter, system-ui, sans-serif'; cCtx.textAlign = 'left'; cCtx.fillStyle = '#64748b';
              cCtx.fillText('HEAD', W * 0.03, H * 0.04);
              cCtx.fillText('THORAX', W * 0.03, H * 0.19);
              cCtx.fillText('ABDOMEN', W * 0.03, H * 0.33);
              cCtx.fillText('PELVIS', W * 0.03, H * 0.43);
              cCtx.fillText('UPPER', W * 0.03, H * 0.27);
              cCtx.fillText('LIMB', W * 0.03, H * 0.29);
              cCtx.fillText('LOWER', W * 0.03, H * 0.60);
              cCtx.fillText('LIMB', W * 0.03, H * 0.62);
              // Region dividing lines
              cCtx.beginPath();
              cCtx.moveTo(W * 0.30, H * 0.135); cCtx.lineTo(W * 0.70, H * 0.135);
              cCtx.moveTo(W * 0.34, H * 0.29); cCtx.lineTo(W * 0.66, H * 0.29);
              cCtx.moveTo(W * 0.38, H * 0.425); cCtx.lineTo(W * 0.62, H * 0.425);
              cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 0.5; cCtx.setLineDash([2, 3]); cCtx.stroke(); cCtx.setLineDash([]);
              cCtx.restore();
            }

            // ── BRAIN REGION MAPPING (when nervous system + brain selected) ──
            if (sysKey === 'nervous' && view === 'anterior') {
              cCtx.save(); cCtx.globalAlpha = 0.25;
              var bx = W * 0.50, by = H * 0.055, br = W * 0.044;
              // Frontal lobe
              cCtx.beginPath(); cCtx.ellipse(bx, by - br * 0.15, br * 0.5, br * 0.6, 0, Math.PI * 1.1, Math.PI * 1.9);
              cCtx.lineTo(bx, by); cCtx.closePath();
              cCtx.fillStyle = '#fca5a540'; cCtx.fill(); cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Parietal lobe
              cCtx.beginPath(); cCtx.ellipse(bx, by - br * 0.3, br * 0.45, br * 0.35, 0, Math.PI * 1.2, Math.PI * 1.8);
              cCtx.fillStyle = '#93c5fd40'; cCtx.fill(); cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Temporal lobes
              cCtx.beginPath(); cCtx.ellipse(bx - br * 0.55, by + br * 0.1, br * 0.25, br * 0.3, 0.3, 0, Math.PI * 2);
              cCtx.fillStyle = '#86efac40'; cCtx.fill(); cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(bx + br * 0.55, by + br * 0.1, br * 0.25, br * 0.3, -0.3, 0, Math.PI * 2);
              cCtx.fillStyle = '#86efac40'; cCtx.fill(); cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Labels
              cCtx.font = 'bold 5px Inter, system-ui, sans-serif'; cCtx.textAlign = 'center';
              cCtx.globalAlpha = 0.5;
              cCtx.fillStyle = '#ef4444'; cCtx.fillText('F', bx, by - br * 0.05);
              cCtx.fillStyle = '#3b82f6'; cCtx.fillText('P', bx, by - br * 0.45);
              cCtx.fillStyle = '#22c55e'; cCtx.fillText('T', bx - br * 0.55, by + br * 0.15);
              cCtx.fillText('T', bx + br * 0.55, by + br * 0.15);
              cCtx.restore();
            }

            // ── INTEGUMENTARY CROSS-SECTION INSET ──
            if (sysKey === 'integumentary') {
              cCtx.save(); cCtx.globalAlpha = 0.80;
              var csX = W * 0.68, csY = H * 0.02, csW2 = W * 0.30, csH2 = H * 0.18;
              // Background
              cCtx.beginPath(); cCtx.roundRect(csX, csY, csW2, csH2, 6);
              cCtx.fillStyle = '#fff'; cCtx.fill();
              cCtx.strokeStyle = '#e2e8f0'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.font = 'bold 7px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#64748b'; cCtx.textAlign = 'left';
              cCtx.fillText('SKIN CROSS-SECTION', csX + 4, csY + 10);
              // Epidermis layer
              cCtx.fillStyle = '#fef3c7'; cCtx.fillRect(csX + 4, csY + 15, csW2 - 8, csH2 * 0.15);
              cCtx.font = '6px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#92400e';
              cCtx.fillText('Epidermis', csX + 6, csY + 22);
              // Dermis layer
              cCtx.fillStyle = '#fce7f3'; cCtx.fillRect(csX + 4, csY + 15 + csH2 * 0.15, csW2 - 8, csH2 * 0.40);
              cCtx.fillStyle = '#9f1239';
              cCtx.fillText('Dermis', csX + 6, csY + 15 + csH2 * 0.35);
              // Hair follicle
              var hfX = csX + csW2 * 0.3, hfY0 = csY + 14;
              cCtx.beginPath(); cCtx.moveTo(hfX, hfY0); cCtx.lineTo(hfX - 1, hfY0 + csH2 * 0.45);
              cCtx.strokeStyle = '#78350f'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.arc(hfX - 1, hfY0 + csH2 * 0.45, 3, 0, Math.PI * 2);
              cCtx.fillStyle = '#92400e40'; cCtx.fill(); cCtx.strokeStyle = '#78350f'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Sweat gland
              var sgX = csX + csW2 * 0.6, sgY = csY + 15 + csH2 * 0.35;
              cCtx.beginPath();
              cCtx.moveTo(sgX, csY + 14); cCtx.lineTo(sgX, sgY - 4);
              cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath();
              for (var swi = 0; swi < 3; swi++) {
                cCtx.arc(sgX + (swi % 2 === 0 ? 2 : -2), sgY + swi * 3, 2, 0, Math.PI * 2);
              }
              cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Hypodermis layer
              cCtx.fillStyle = '#fef9c3'; cCtx.fillRect(csX + 4, csY + 15 + csH2 * 0.55, csW2 - 8, csH2 * 0.30);
              cCtx.fillStyle = '#854d0e'; cCtx.fillText('Hypodermis', csX + 6, csY + 15 + csH2 * 0.72);
              // Fat cells
              for (var fci = 0; fci < 4; fci++) {
                cCtx.beginPath(); cCtx.arc(csX + 30 + fci * 14, csY + 15 + csH2 * 0.62, 4, 0, Math.PI * 2);
                cCtx.fillStyle = '#fef08a40'; cCtx.fill(); cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 0.4; cCtx.stroke();
              }
              // Blood vessel
              cCtx.beginPath();
              cCtx.moveTo(csX + csW2 * 0.75, csY + 15 + csH2 * 0.15);
              cCtx.quadraticCurveTo(csX + csW2 * 0.80, csY + 15 + csH2 * 0.30, csX + csW2 * 0.72, csY + 15 + csH2 * 0.45);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1; cCtx.stroke();
              // Nerve fiber
              cCtx.beginPath();
              cCtx.moveTo(csX + csW2 * 0.85, csY + 15 + csH2 * 0.20);
              cCtx.lineTo(csX + csW2 * 0.85, csY + 15 + csH2 * 0.50);
              cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 0.6; cCtx.setLineDash([1, 2]); cCtx.stroke(); cCtx.setLineDash([]);
              cCtx.restore();
            }

            // ── SEARCH HIGHLIGHTING on canvas ──
            if (searchTerm && searchTerm.length >= 2) {
              filtered.forEach(function(st) {
                if (st.name.toLowerCase().indexOf(searchTerm) >= 0) {
                  var shx = st.x * W, shy = st.y * H;
                  cCtx.save();
                  var shPulse = 1.0 + Math.sin(anatTick * 0.08) * 0.3;
                  cCtx.globalAlpha = 0.3;
                  var shGlow = cCtx.createRadialGradient(shx, shy, 2, shx, shy, 14 + shPulse * 4);
                  shGlow.addColorStop(0, '#fbbf24');
                  shGlow.addColorStop(1, '#fbbf2400');
                  cCtx.beginPath(); cCtx.arc(shx, shy, 14 + shPulse * 4, 0, Math.PI * 2);
                  cCtx.fillStyle = shGlow; cCtx.fill();
                  cCtx.restore();
                }
              });
            }

            // ── MUSCLE ORIGIN/INSERTION MARKERS ──
            if (sel && sel.origin && sel.insertion) {
              cCtx.save(); cCtx.globalAlpha = 0.6;
              var oiX = sel.x * W, oiY = sel.y * H;
              // Origin marker (red, above)
              cCtx.beginPath(); cCtx.arc(oiX - 6, oiY - 10, 3.5, 0, Math.PI * 2);
              cCtx.fillStyle = '#ef4444'; cCtx.fill(); cCtx.strokeStyle = '#fff'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.font = 'bold 5px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#fff'; cCtx.textAlign = 'center';
              cCtx.fillText('O', oiX - 6, oiY - 8.5);
              // Insertion marker (blue, below)
              cCtx.beginPath(); cCtx.arc(oiX + 6, oiY + 10, 3.5, 0, Math.PI * 2);
              cCtx.fillStyle = '#3b82f6'; cCtx.fill(); cCtx.strokeStyle = '#fff'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.fillStyle = '#fff';
              cCtx.fillText('I', oiX + 6, oiY + 11.5);
              cCtx.restore();
            }

            // ── CONFETTI PARTICLES ──
            if (confettiParticles.length > 0) {
              cCtx.save();
              var confettiColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6', '#f97316'];
              confettiParticles.forEach(function(cp) {
                var age = (Date.now() - cp.born) * 0.001;
                if (age > 2) return;
                var cpx2 = cp.x * W + cp.vx * age * W * 0.15;
                var cpy2 = cp.y * H + cp.vy * age * H * 0.2 + age * age * H * 0.08;
                cCtx.globalAlpha = Math.max(0, 1 - age * 0.5);
                cCtx.save();
                cCtx.translate(cpx2, cpy2);
                cCtx.rotate(cp.rot + age * cp.spin);
                cCtx.fillStyle = confettiColors[cp.ci % confettiColors.length];
                cCtx.fillRect(-3, -1.5, 6, 3);
                cCtx.restore();
              });
              cCtx.restore();
            }

            // ── X-ray film label ──
            if (xrayMode) {
              cCtx.save(); cCtx.globalAlpha = 0.4;
              cCtx.font = 'bold 8px monospace'; cCtx.fillStyle = '#e0f0ff'; cCtx.textAlign = 'left';
              cCtx.fillText('X-RAY', 8, 14);
              cCtx.font = '6px monospace';
              cCtx.fillText(view === 'anterior' ? 'AP VIEW' : 'PA VIEW', 8, 22);
              cCtx.textAlign = 'right';
              cCtx.fillText('R', 14, H * 0.5);
              cCtx.textAlign = 'left';
              cCtx.fillText('L', W - 14, H * 0.5);
              cCtx.restore();
            }

            // ── Structure Markers ──
            filtered.forEach(function(st) {
              var px = st.x * W, py = st.y * H;
              var isSel = sel && sel.id === st.id;
              var r = isSel ? 9 : 5;
              if (isSel) {
                var pulse = 1.0 + Math.sin(anatTick * 0.06) * 0.3;
                cCtx.save();
                cCtx.globalAlpha = 0.3 - pulse * 0.1;
                cCtx.beginPath(); cCtx.arc(px, py, r + 6 + pulse * 4, 0, Math.PI * 2);
                cCtx.strokeStyle = sys.accent; cCtx.lineWidth = 1.5; cCtx.stroke();
                cCtx.restore();
                cCtx.save();
                var sGlow = cCtx.createRadialGradient(px, py, r * 0.3, px, py, r + 4);
                sGlow.addColorStop(0, sys.accent + '50');
                sGlow.addColorStop(1, sys.accent + '00');
                cCtx.beginPath(); cCtx.arc(px, py, r + 4, 0, Math.PI * 2);
                cCtx.fillStyle = sGlow; cCtx.fill();
                cCtx.restore();
              }
              var mG = cCtx.createRadialGradient(px - 1, py - 1, 1, px, py, r);
              mG.addColorStop(0, isSel ? sys.accent + 'cc' : sys.accent + '88');
              mG.addColorStop(1, sys.accent);
              cCtx.beginPath(); cCtx.arc(px, py, r, 0, Math.PI * 2);
              cCtx.fillStyle = mG; cCtx.fill();
              cCtx.strokeStyle = '#fff'; cCtx.lineWidth = 1.5; cCtx.stroke();
              if (isSel) {
                cCtx.save();
                var isRight = px > W * 0.5;
                var labelX = isRight ? px - 18 : px + 18;
                cCtx.font = 'bold 9px Inter, system-ui, sans-serif';
                var tw = cCtx.measureText(st.name).width;
                var pillX = isRight ? labelX - tw - 8 : labelX - 4;
                var pillY = py - 7;
                cCtx.beginPath();
                cCtx.moveTo(px + (isRight ? -r - 2 : r + 2), py);
                cCtx.lineTo(isRight ? pillX + tw + 8 : pillX, py);
                cCtx.strokeStyle = sys.accent + '60'; cCtx.lineWidth = 1; cCtx.setLineDash([2, 2]); cCtx.stroke(); cCtx.setLineDash([]);
                cCtx.beginPath();
                cCtx.roundRect(pillX, pillY, tw + 10, 15, 4);
                cCtx.fillStyle = sys.accent; cCtx.fill();
                cCtx.shadowColor = sys.accent + '40'; cCtx.shadowBlur = 4;
                cCtx.textAlign = isRight ? 'right' : 'left';
                cCtx.fillStyle = '#fff';
                cCtx.fillText(st.name, isRight ? pillX + tw + 5 : pillX + 5, py + 3);
                cCtx.restore();
              }
            });

            // ── Hover tooltip ──
            if (hoverStructure && (!sel || hoverStructure !== sel.id)) {
              var hSt = null;
              for (var hsi = 0; hsi < filtered.length; hsi++) {
                if (filtered[hsi].id === hoverStructure) { hSt = filtered[hsi]; break; }
              }
              if (hSt) {
                cCtx.save();
                cCtx.font = 'bold 9px Inter, system-ui, sans-serif';
                var htw = cCtx.measureText(hSt.name).width;
                var htx = hoverX * W + 12;
                var hty = hoverY * H - 10;
                if (htx + htw + 12 > W) htx = hoverX * W - htw - 18;
                if (hty < 12) hty = hoverY * H + 16;
                cCtx.beginPath(); cCtx.roundRect(htx - 4, hty - 10, htw + 10, 15, 3);
                cCtx.fillStyle = 'rgba(0,0,0,0.75)'; cCtx.fill();
                cCtx.fillStyle = '#fff'; cCtx.textAlign = 'left';
                cCtx.fillText(hSt.name, htx, hty);
                cCtx.restore();
              }
            }

            // ── Spotter test pin overlay ──
            if (spotterActive && spotterTarget) {
              var spSt = null;
              for (var spi2 = 0; spi2 < filtered.length; spi2++) {
                if (filtered[spi2].id === spotterTarget) { spSt = filtered[spi2]; break; }
              }
              if (spSt) {
                var spx = spSt.x * W, spy2 = spSt.y * H;
                var spPulse = 1.0 + Math.sin(anatTick * 0.1) * 0.4;
                cCtx.save();
                cCtx.globalAlpha = 0.2 + Math.sin(anatTick * 0.08) * 0.1;
                cCtx.beginPath(); cCtx.arc(spx, spy2, 18 + spPulse * 6, 0, Math.PI * 2);
                cCtx.strokeStyle = '#f59e0b'; cCtx.lineWidth = 3; cCtx.setLineDash([6, 4]); cCtx.stroke(); cCtx.setLineDash([]);
                cCtx.beginPath(); cCtx.arc(spx, spy2, 10, 0, Math.PI * 2);
                cCtx.fillStyle = '#f59e0b40'; cCtx.fill();
                cCtx.globalAlpha = 0.7;
                cCtx.beginPath(); cCtx.moveTo(spx - 12, spy2); cCtx.lineTo(spx + 12, spy2);
                cCtx.moveTo(spx, spy2 - 12); cCtx.lineTo(spx, spy2 + 12);
                cCtx.strokeStyle = '#f59e0b'; cCtx.lineWidth = 1.5; cCtx.stroke();
                cCtx.restore();
              }
            }

            // ── Compare highlight ──
            if (compareSel && (!sel || compareSel.id !== sel.id)) {
              var cpSt = null;
              for (var cpi = 0; cpi < filtered.length; cpi++) {
                if (filtered[cpi].id === compareSel.id) { cpSt = filtered[cpi]; break; }
              }
              if (cpSt) {
                var cpx = cpSt.x * W, cpy = cpSt.y * H;
                cCtx.save(); cCtx.globalAlpha = 0.5;
                cCtx.beginPath(); cCtx.arc(cpx, cpy, 11, 0, Math.PI * 2);
                cCtx.strokeStyle = '#8b5cf6'; cCtx.lineWidth = 2.5; cCtx.setLineDash([3, 3]); cCtx.stroke(); cCtx.setLineDash([]);
                cCtx.font = 'bold 8px Inter, system-ui, sans-serif';
                cCtx.fillStyle = '#8b5cf6'; cCtx.textAlign = 'center';
                cCtx.fillText('B', cpx, cpy + 3);
                cCtx.restore();
              }
            }

            // View label
            cCtx.save();
            var viewLbl = view === 'anterior' ? 'ANTERIOR VIEW' : 'POSTERIOR VIEW';
            cCtx.font = 'bold 9px Inter, system-ui, sans-serif';
            var vW = cCtx.measureText(viewLbl).width + 16;
            cCtx.beginPath();
            cCtx.roundRect(W * 0.5 - vW / 2, H - 18, vW, 14, 4);
            cCtx.fillStyle = xrayMode ? 'rgba(20,20,30,0.8)' : '#f8fafc'; cCtx.fill();
            cCtx.strokeStyle = xrayMode ? '#4a5568' : '#e2e8f0'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.fillStyle = xrayMode ? '#a0c4ff' : '#94a3b8'; cCtx.textAlign = 'center';
            cCtx.fillText(viewLbl, W * 0.5, H - 8);
            cCtx.restore();

            canvas._anatomyAnim = requestAnimationFrame(drawAnatomyFrame);
          }

          drawAnatomyFrame();
        };

        // ── Canvas click handler ──
        var handleClick = function(e) {
          var rect = e.target.getBoundingClientRect();
          var cx = (e.clientX - rect.left) / rect.width;
          var cy = (e.clientY - rect.top) / rect.height;
          var closest = null, minD = 0.06;
          filtered.forEach(function(st) {
            var dist = Math.sqrt(Math.pow(st.x - cx, 2) + Math.pow(st.y - cy, 2));
            if (dist < minD) { minD = dist; closest = st; }
          });
          if (closest) {
            upd('selectedStructure', closest.id);
            playSound('structureClick');
          }
        };

        // ── Canvas mousemove handler (hover tooltip) ──
        var handleMouseMove = function(e) {
          var rect = e.target.getBoundingClientRect();
          var cx = (e.clientX - rect.left) / rect.width;
          var cy = (e.clientY - rect.top) / rect.height;
          var closest = null, minD = 0.04;
          filtered.forEach(function(st) {
            var dist = Math.sqrt(Math.pow(st.x - cx, 2) + Math.pow(st.y - cy, 2));
            if (dist < minD) { minD = dist; closest = st; }
          });
          updMulti({ _hoverStructure: closest ? closest.id : null, _hoverX: cx, _hoverY: cy });
        };

        // ── Snapshot ──
        var takeSnapshot = function() {
          playSound('snapshot');
          if (setToolSnapshots) {
            var snap = {
              ts: Date.now(), tool: 'anatomy', system: sysKey, view: view,
              structure: sel ? sel.name : null,
              layers: Object.keys(layers).filter(function(k) { return layers[k]; }),
              complexity: complexity
            };
            setToolSnapshots(function(prev) {
              var arr = (prev && prev.anatomy) ? prev.anatomy.slice() : [];
              arr.push(snap);
              return Object.assign({}, prev, { anatomy: arr });
            });
          }
          if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!');
        };

        // ── AI Tutor state ──
        var aiMessages = d._aiMessages || [];
        var aiLoading = d._aiLoading || false;

        var sendAiQuestion = function(question) {
          if (!question || aiLoading) return;
          playSound('aiTutor');
          var newMsgs = aiMessages.concat([{ role: 'user', text: question }]);
          upd('_aiMessages', newMsgs);
          upd('_aiLoading', true);
          var newAiQ = (d._aiQuestions || 0) + 1;
          upd('_aiQuestions', newAiQ);
          var prompt = 'You are a friendly anatomy tutor. The student is studying the ' + sys.name + ' system' + (sel ? ' and is looking at the ' + sel.name : '') + '. Grade level: ' + (gradeLevel || 'unknown') + '. Answer concisely (2-3 sentences). Question: ' + question;
          if (callGemini) {
            callGemini(prompt).then(function(resp) {
              var answer = (resp && (resp.text || resp)) || 'I could not generate a response right now.';
              upd('_aiMessages', newMsgs.concat([{ role: 'ai', text: String(answer) }]));
              upd('_aiLoading', false);
            })['catch'](function() {
              upd('_aiMessages', newMsgs.concat([{ role: 'ai', text: 'Sorry, I could not connect to the AI tutor right now.' }]));
              upd('_aiLoading', false);
            });
          } else {
            upd('_aiMessages', newMsgs.concat([{ role: 'ai', text: 'AI tutor is not available in this environment.' }]));
            upd('_aiLoading', false);
          }
        };

        // ── TTS button helper ──
        var ttsBtn = function(text) {
          return h('button', {
            onClick: function() { speakText(text, callTTS); },
            className: 'ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all border border-indigo-200',
            title: 'Read aloud', 'aria-label': 'Read aloud'
          }, '\uD83D\uDD0A');
        };

        // ── Progress tracker helper ──
        var exploredInSystem = 0;
        filtered.forEach(function(st) { if (structuresViewed[st.id]) exploredInSystem++; });
        var progressPct = filtered.length > 0 ? Math.round((exploredInSystem / filtered.length) * 100) : 0;

        // ── Keyboard navigation handler ──
        function handleKeyNav(e) {
          if (activeTab !== 'explore') return;
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
          var navList = filtered;
          if (navList.length === 0) return;
          var curIdx = -1;
          if (sel) {
            for (var ki = 0; ki < navList.length; ki++) {
              if (navList[ki].id === sel.id) { curIdx = ki; break; }
            }
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            var nextIdx = curIdx < navList.length - 1 ? curIdx + 1 : 0;
            upd('selectedStructure', navList[nextIdx].id);
            playSound('structureClick');
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            var prevIdx = curIdx > 0 ? curIdx - 1 : navList.length - 1;
            upd('selectedStructure', navList[prevIdx].id);
            playSound('structureClick');
          } else if (e.key === 'Escape') {
            upd('selectedStructure', null);
          }
        }

        // ══════════════════════════════════════
        // UI RENDER
        // ══════════════════════════════════════

        return h('div', { className: 'max-w-4xl mx-auto animate-in fade-in duration-200 outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1', tabIndex: 0, onKeyDown: handleKeyNav },

          // Header
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back to tools' }, h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
            h('div', null,
              h('h3', { className: 'text-lg font-bold text-slate-800' }, '\uD83E\uDEC0 Human Anatomy Explorer'),
              h('p', { className: 'text-xs text-slate-500' }, sys.desc)
            ),
            h('button', {
              onClick: takeSnapshot,
              className: 'ml-auto px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all',
              title: 'Save snapshot'
            }, '\uD83D\uDCF8 Snapshot')
          ),

          // Grade-band intro
          h('div', { className: 'mb-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800' }, gradeIntro),

          // Tab bar (7 tabs)
          h('div', { className: 'flex gap-1 mb-3', role: 'tablist', 'aria-label': 'Anatomy tool sections' },
            h('button', {
              role: 'tab', 'aria-selected': activeTab === 'explore', tabIndex: activeTab === 'explore' ? 0 : -1,
              onClick: function() { upd('_activeTab', 'explore'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'explore' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
            }, '\uD83E\uDEC0 Explore'),
            h('button', {
              role: 'tab', 'aria-selected': activeTab === 'tour', tabIndex: activeTab === 'tour' ? 0 : -1,
              onClick: function() { upd('_activeTab', 'tour'); if (!tourActive) { upd('_tourActive', true); upd('_tourStepIdx', 0); } },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'tour' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200')
            }, '\uD83E\uDDED Tour'),
            h('button', {
              role: 'tab', 'aria-selected': activeTab === 'connections', tabIndex: activeTab === 'connections' ? 0 : -1,
              onClick: function() { upd('_activeTab', 'connections'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'connections' ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200')
            }, '\uD83D\uDD17 Connect'),
            h('button', {
              role: 'tab', 'aria-selected': activeTab === 'aiTutor', tabIndex: activeTab === 'aiTutor' ? 0 : -1,
              onClick: function() { upd('_activeTab', 'aiTutor'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'aiTutor' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200')
            }, '\uD83E\uDD16 AI Tutor'),
            h('button', {
              role: 'tab', 'aria-selected': activeTab === 'spotter', tabIndex: activeTab === 'spotter' ? 0 : -1,
              onClick: function() { upd('_activeTab', 'spotter'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'spotter' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200')
            }, '\uD83C\uDFAF Spotter'),
            h('button', {
              role: 'tab', 'aria-selected': activeTab === 'pathways', tabIndex: activeTab === 'pathways' ? 0 : -1,
              onClick: function() { upd('_activeTab', 'pathways'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'pathways' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200')
            }, '\uD83D\uDEE4 Pathways'),
            h('button', {
              role: 'tab', 'aria-selected': activeTab === 'flashcards', tabIndex: activeTab === 'flashcards' ? 0 : -1,
              onClick: function() { upd('_activeTab', 'flashcards'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'flashcards' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200')
            }, '\uD83C\uDCCF Cards'),
            h('span', { className: 'ml-auto text-[10px] font-bold text-amber-600 self-center' }, '\uD83C\uDFC5 ' + Object.keys(badges).length + '/' + BADGE_DEFS.length + ' badges')
          ),

          // ── AI Tutor Tab ──
          activeTab === 'aiTutor' ? h('div', { className: 'bg-white rounded-xl border-2 border-violet-200 p-4 space-y-3' },
            h('h4', { className: 'font-bold text-violet-800 text-sm mb-2' }, '\uD83E\uDD16 AI Anatomy Tutor'),
            h('p', { className: 'text-xs text-slate-500 mb-2' }, 'Currently studying: ' + sys.icon + ' ' + sys.name + (sel ? ' > ' + sel.name : '')),
            h('div', { className: 'space-y-2 max-h-[340px] overflow-y-auto mb-3' },
              aiMessages.length === 0 && h('p', { className: 'text-xs text-slate-400 italic text-center py-4' }, 'Ask a question about anatomy to get started!'),
              aiMessages.map(function(msg, idx) {
                return h('div', { key: idx, className: 'rounded-lg px-3 py-2 text-xs leading-relaxed ' + (msg.role === 'user' ? 'bg-violet-50 text-violet-800 ml-8' : 'bg-slate-50 text-slate-700 mr-8') },
                  h('span', { className: 'font-bold' }, msg.role === 'user' ? 'You: ' : 'AI: '),
                  msg.text,
                  msg.role === 'ai' ? ttsBtn(msg.text) : null
                );
              }),
              aiLoading && h('div', { className: 'text-xs text-violet-500 italic text-center' }, 'Thinking...')
            ),
            h('div', { className: 'flex flex-wrap gap-1 mb-2' },
              [
                'What does the ' + sys.name + ' system do?',
                sel ? 'Tell me about the ' + sel.name : 'What is the most important structure in this system?',
                'What clinical conditions affect this system?'
              ].map(function(q, qi) {
                return h('button', {
                  key: qi,
                  onClick: function() { sendAiQuestion(q); },
                  className: 'px-2 py-1 rounded-lg text-[10px] font-bold bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 transition-all'
                }, q);
              })
            ),
            h('div', { className: 'flex gap-2' },
              h('input', {
                type: 'text', placeholder: 'Ask a question...',
                value: d._aiInput || '',
                onChange: function(e) { upd('_aiInput', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter') { sendAiQuestion(d._aiInput || ''); upd('_aiInput', ''); } },
                className: 'flex-1 px-3 py-1.5 text-xs border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-300 outline-none'
              }),
              h('button', {
                onClick: function() { sendAiQuestion(d._aiInput || ''); upd('_aiInput', ''); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all'
              }, 'Ask')
            )
          ) : null,

          // ── Tour Tab ──
          activeTab === 'tour' ? h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-4 space-y-3' },
            h('h4', { className: 'font-bold text-emerald-800 text-sm mb-2' }, '\uD83E\uDDED Guided Tour: ' + sys.icon + ' ' + sys.name),
            tourSteps.length > 0 ? h('div', { className: 'space-y-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('span', { className: 'text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700' }, 'Step ' + (tourStepIdx + 1) + ' of ' + tourSteps.length),
                h('div', { className: 'flex-1 mx-3 h-1.5 rounded-full bg-emerald-100 overflow-hidden' },
                  h('div', { className: 'h-full rounded-full bg-emerald-500 transition-all', style: { width: (((tourStepIdx + 1) / tourSteps.length) * 100) + '%' } })
                )
              ),
              currentTourStep ? h('div', { className: 'bg-emerald-50 rounded-lg p-4 border border-emerald-200' },
                h('h5', { className: 'font-bold text-emerald-900 text-sm mb-2' }, currentTourStep.title),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, currentTourStep.narration),
                ttsBtn(currentTourStep.narration)
              ) : null,
              h('div', { className: 'flex gap-2 justify-between' },
                h('button', {
                  onClick: function() {
                    var prev = tourStepIdx - 1;
                    if (prev >= 0) { upd('_tourStepIdx', prev); upd('selectedStructure', tourSteps[prev].structureId); playSound('guidedStep'); }
                  },
                  disabled: tourStepIdx === 0,
                  className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (tourStepIdx === 0 ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200')
                }, '\u2190 Previous'),
                tourStepIdx < tourSteps.length - 1 ? h('button', {
                  onClick: function() {
                    var next = tourStepIdx + 1;
                    upd('_tourStepIdx', next); upd('selectedStructure', tourSteps[next].structureId); playSound('guidedStep');
                  },
                  className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all'
                }, 'Next \u2192') : h('button', {
                  onClick: function() { upd('_tourCompleted', true); upd('_tourActive', false); upd('_activeTab', 'explore'); playSound('badge'); },
                  className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all'
                }, '\uD83C\uDFC6 Complete Tour!')
              )
            ) : h('p', { className: 'text-xs text-slate-400 italic' }, 'No tour available for this system.')
          ) : null,

          // ── Spotter Test Tab ──
          activeTab === 'spotter' ? h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4 space-y-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('h4', { className: 'font-bold text-amber-800 text-sm' }, '\uD83C\uDFAF Anatomy Spotter Test'),
              h('div', { className: 'flex gap-2' },
                h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700' }, '\u2705 ' + spotterScore + '/' + spotterTotal),
                spotterBestTime < 999 ? h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700' }, '\u26A1 Best: ' + spotterBestTime.toFixed(1) + 's') : null
              )
            ),
            h('p', { className: 'text-xs text-slate-500 mb-3' }, 'A pin is placed on the anatomical figure. Identify the structure as quickly as you can! Look for the pulsing crosshair on the canvas.'),
            !spotterActive ? h('div', { className: 'text-center py-4' },
              h('button', {
                onClick: function() {
                  var pool = filtered.filter(function(s) { return s.fn; });
                  if (pool.length < 4) return;
                  var target = pool[Math.floor(Math.random() * pool.length)];
                  var wrong = pool.filter(function(s) { return s.id !== target.id; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
                  var opts = wrong.concat([target]).sort(function() { return Math.random() - 0.5; });
                  updMulti({ _spotterActive: true, _spotterTarget: target.id, _spotterFeedback: null, _spotterOpts: opts, _spotterStartTime: Date.now() });
                },
                className: 'px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm'
              }, '\uD83C\uDFAF Start Spotter Test'),
              spotterTotal > 0 ? h('p', { className: 'text-[10px] text-slate-500 mt-2' }, 'Score: ' + spotterScore + ' correct out of ' + spotterTotal + ' attempts') : null
            ) : h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200 text-center' },
                h('p', { className: 'text-sm font-bold text-amber-900 mb-1' }, 'What structure is marked on the figure?'),
                h('p', { className: 'text-[10px] text-amber-600' }, 'Look for the pulsing amber crosshair on the canvas')
              ),
              h('div', { className: 'grid grid-cols-2 gap-2' },
                spotterOptions.map(function(opt) {
                  var isCorrect = opt.id === spotterTarget;
                  var showResult = spotterFeedback !== null;
                  var wasChosen = showResult && spotterFeedback === opt.id;
                  return h('button', {
                    key: opt.id,
                    disabled: showResult,
                    onClick: function() {
                      var elapsed = (Date.now() - spotterStartTime) / 1000;
                      upd('_spotterFeedback', opt.id);
                      upd('_spotterTotal', spotterTotal + 1);
                      if (opt.id === spotterTarget) {
                        upd('_spotterScore', spotterScore + 1);
                        if (elapsed < spotterBestTime) upd('_spotterBestTime', elapsed);
                        playSound('spotterCorrect');
                      } else {
                        playSound('spotterWrong');
                      }
                    },
                    className: 'px-3 py-2.5 rounded-xl text-xs font-bold transition-all border-2 text-left ' +
                      (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :
                        showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :
                          'border-slate-200 hover:border-amber-300 text-slate-700 hover:bg-amber-50')
                  }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + opt.name);
                })
              ),
              spotterFeedback ? h('div', { className: 'space-y-2' },
                h('div', { className: 'rounded-lg p-3 text-xs leading-relaxed ' + (spotterFeedback === spotterTarget ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                  h('p', { className: 'font-bold ' + (spotterFeedback === spotterTarget ? 'text-green-800' : 'text-amber-800') },
                    spotterFeedback === spotterTarget ? '\u2705 Correct! (' + ((Date.now() - spotterStartTime) / 1000).toFixed(1) + 's)' : '\u274C The answer was: ' + (function() { for (var si3 = 0; si3 < filtered.length; si3++) { if (filtered[si3].id === spotterTarget) return filtered[si3].name; } return ''; })()
                  )
                ),
                h('button', {
                  onClick: function() {
                    var pool = filtered.filter(function(s) { return s.fn; });
                    if (pool.length < 4) return;
                    var target = pool[Math.floor(Math.random() * pool.length)];
                    var wrong = pool.filter(function(s) { return s.id !== target.id; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
                    var opts = wrong.concat([target]).sort(function() { return Math.random() - 0.5; });
                    updMulti({ _spotterTarget: target.id, _spotterFeedback: null, _spotterOpts: opts, _spotterStartTime: Date.now() });
                  },
                  className: 'w-full py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all'
                }, 'Next Structure \u2192'),
                h('button', {
                  onClick: function() { updMulti({ _spotterActive: false, _spotterTarget: null, _spotterFeedback: null }); },
                  className: 'w-full py-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all'
                }, 'End Test')
              ) : null
            )
          ) : null,

          // ── Pathways Tab ──
          activeTab === 'pathways' ? h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4 space-y-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('h4', { className: 'font-bold text-rose-800 text-sm' }, '\uD83D\uDEE4 Physiological Pathways'),
              h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600' }, Object.keys(pathwaysCompleted).length + '/' + PATHWAYS.length + ' completed')
            ),
            h('p', { className: 'text-xs text-slate-500 mb-3' }, 'Trace step-by-step how blood flows, air moves, food digests, or nerve signals travel through the body.'),
            !activePathwayId ? h('div', { className: 'grid grid-cols-2 gap-2' },
              PATHWAYS.map(function(pw) {
                var isDone = pathwaysCompleted[pw.id];
                return h('button', {
                  key: pw.id,
                  onClick: function() { updMulti({ _activePathway: pw.id, _pathwayStep: 0 }); upd('selectedStructure', pw.steps[0].structure); playSound('pathwayStep'); },
                  className: 'text-left rounded-xl p-3 border-2 transition-all ' + (isDone ? 'border-rose-300 bg-rose-50' : 'border-slate-200 hover:border-rose-200 hover:bg-rose-50/50')
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg' }, pw.icon),
                    h('span', { className: 'text-xs font-black', style: { color: pw.color } }, pw.title),
                    isDone ? h('span', { className: 'ml-auto text-[10px] text-emerald-500 font-bold' }, '\u2713') : null
                  ),
                  h('p', { className: 'text-[10px] text-slate-500 leading-relaxed' }, pw.desc)
                );
              })
            ) : (function() {
              var pw = null;
              for (var pwi = 0; pwi < PATHWAYS.length; pwi++) { if (PATHWAYS[pwi].id === activePathwayId) { pw = PATHWAYS[pwi]; break; } }
              if (!pw) return null;
              var step = pw.steps[pathwayStepIdx];
              return h('div', { className: 'space-y-3' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-lg' }, pw.icon),
                  h('span', { className: 'text-sm font-black', style: { color: pw.color } }, pw.title),
                  h('button', {
                    onClick: function() { updMulti({ _activePathway: null, _pathwayStep: 0 }); },
                    className: 'ml-auto text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100'
                  }, '\u2190 Back')
                ),
                h('div', { className: 'flex items-center justify-between mb-2' },
                  h('span', { className: 'text-xs font-bold px-2 py-0.5 rounded-full', style: { background: pw.color + '18', color: pw.color } }, 'Step ' + (pathwayStepIdx + 1) + ' of ' + pw.steps.length),
                  h('div', { className: 'flex-1 mx-3 h-1.5 rounded-full bg-slate-100 overflow-hidden' },
                    h('div', { className: 'h-full rounded-full transition-all', style: { width: (((pathwayStepIdx + 1) / pw.steps.length) * 100) + '%', background: pw.color } })
                  )
                ),
                step ? h('div', { className: 'rounded-xl p-4 border-2', style: { borderColor: pw.color + '40', background: pw.color + '08' } },
                  h('h5', { className: 'font-bold text-sm mb-2', style: { color: pw.color } }, (pathwayStepIdx + 1) + '. ' + step.label),
                  h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, step.detail),
                  ttsBtn(step.detail)
                ) : null,
                h('div', { className: 'flex gap-2 justify-between' },
                  h('button', {
                    onClick: function() {
                      if (pathwayStepIdx > 0) {
                        var prev = pathwayStepIdx - 1;
                        upd('_pathwayStep', prev); upd('selectedStructure', pw.steps[prev].structure); playSound('pathwayStep');
                      }
                    },
                    disabled: pathwayStepIdx === 0,
                    className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (pathwayStepIdx === 0 ? 'bg-slate-100 text-slate-400' : 'bg-rose-100 text-rose-700 hover:bg-rose-200')
                  }, '\u2190 Previous'),
                  pathwayStepIdx < pw.steps.length - 1 ? h('button', {
                    onClick: function() {
                      var next = pathwayStepIdx + 1;
                      upd('_pathwayStep', next); upd('selectedStructure', pw.steps[next].structure); playSound('pathwayStep');
                    },
                    className: 'px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition-all',
                    style: { background: pw.color }
                  }, 'Next \u2192') : h('button', {
                    onClick: function() {
                      var newPC = Object.assign({}, pathwaysCompleted);
                      newPC[pw.id] = true;
                      updMulti({ _pathwaysCompleted: newPC, _activePathway: null, _pathwayStep: 0 });
                      playSound('badge');
                      if (addToast) addToast('\uD83D\uDEE4 Pathway complete: ' + pw.title + '!');
                    },
                    className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all'
                  }, '\uD83C\uDFC6 Complete Pathway!')
                )
              );
            })()
          ) : null,

          // ── Connections Tab ──
          activeTab === 'connections' ? h('div', { className: 'bg-white rounded-xl border-2 border-sky-200 p-4 space-y-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('h4', { className: 'font-bold text-sky-800 text-sm' }, '\uD83D\uDD17 How Body Systems Connect'),
              h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-600' }, Object.keys(connectionsViewed).length + '/' + CONNECTIONS.length + ' explored')
            ),
            h('div', { className: 'space-y-2 max-h-[500px] overflow-y-auto' },
              CONNECTIONS.map(function(conn) {
                var isViewed = connectionsViewed[conn.id];
                return h('button', {
                  key: conn.id,
                  onClick: function() {
                    playSound('connectionView');
                    if (!connectionsViewed[conn.id]) {
                      var newCV = Object.assign({}, connectionsViewed);
                      newCV[conn.id] = true;
                      upd('_connectionsViewed', newCV);
                    }
                    upd('_expandedConn', d._expandedConn === conn.id ? null : conn.id);
                  },
                  className: 'w-full text-left rounded-xl p-3 border-2 transition-all ' + (isViewed ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/50')
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-base' }, conn.icon),
                    h('span', { className: 'text-xs font-black text-sky-800' }, conn.title),
                    h('span', { className: 'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500' },
                      SYSTEMS[conn.systems[0]].icon + ' + ' + SYSTEMS[conn.systems[1]].icon
                    ),
                    isViewed ? h('span', { className: 'text-[10px] text-emerald-500 font-bold' }, '\u2713') : null
                  ),
                  h('p', { className: 'text-[10px] text-slate-600 leading-relaxed' }, conn.desc),
                  d._expandedConn === conn.id ? h('div', { className: 'mt-2 pt-2 border-t border-sky-200' },
                    h('p', { className: 'text-[10px] text-sky-700 italic leading-relaxed' }, '\uD83D\uDCA1 Example: ' + conn.example)
                  ) : null
                );
              })
            )
          ) : null,

          // ── Flashcard Tab ──
          activeTab === 'flashcards' ? h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-4 space-y-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('h4', { className: 'font-bold text-teal-800 text-sm' }, '\uD83C\uDCCF Anatomy Flashcards'),
              h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700' }, (flashcardIdx + 1) + '/' + flashcardPool.length)
            ),
            h('p', { className: 'text-xs text-slate-500 mb-2' }, 'Click the card to flip. Study ' + sys.name + ' structures.'),
            flashcardPool.length > 0 ? h('div', { className: 'space-y-3' },
              // Flashcard
              h('button', {
                onClick: function() { upd('_flashcardFlipped', !flashcardFlipped); },
                className: 'w-full min-h-[180px] rounded-xl p-5 border-2 transition-all text-left cursor-pointer hover:shadow-md ' +
                  (flashcardFlipped ? 'border-teal-400 bg-teal-50' : 'border-slate-300 bg-gradient-to-br from-white to-slate-50')
              },
                !flashcardFlipped ? h('div', null,
                  h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-3' }, 'STRUCTURE NAME'),
                  h('h3', { className: 'text-xl font-black text-slate-800 mb-2' }, flashcardPool[flashcardIdx % flashcardPool.length].name),
                  PRONUNCIATION[flashcardPool[flashcardIdx % flashcardPool.length].id] ? h('p', { className: 'text-xs text-indigo-500 italic' }, '\uD83D\uDD0A ' + PRONUNCIATION[flashcardPool[flashcardIdx % flashcardPool.length].id]) : null,
                  h('p', { className: 'text-[10px] text-slate-500 mt-4' }, 'Tap to reveal function \u2192')
                ) : h('div', null,
                  h('p', { className: 'text-[10px] font-bold text-teal-600 uppercase mb-2' }, 'FUNCTION'),
                  h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, flashcardPool[flashcardIdx % flashcardPool.length].fn),
                  flashcardPool[flashcardIdx % flashcardPool.length].clinical ? h('div', { className: 'mt-2 pt-2 border-t border-teal-200' },
                    h('p', { className: 'text-[10px] font-bold text-rose-500 uppercase mb-0.5' }, '\u26A0 Clinical'),
                    h('p', { className: 'text-[10px] text-slate-600 leading-relaxed' }, flashcardPool[flashcardIdx % flashcardPool.length].clinical.substring(0, 200))
                  ) : null,
                  ttsBtn(flashcardPool[flashcardIdx % flashcardPool.length].fn)
                )
              ),
              // Navigation
              h('div', { className: 'flex gap-2 justify-between' },
                h('button', {
                  onClick: function() { upd('_flashcardIdx', flashcardIdx > 0 ? flashcardIdx - 1 : flashcardPool.length - 1); upd('_flashcardFlipped', false); },
                  className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-100 text-teal-700 hover:bg-teal-200 transition-all'
                }, '\u2190 Previous'),
                h('button', {
                  onClick: function() {
                    var randIdx = Math.floor(Math.random() * flashcardPool.length);
                    upd('_flashcardIdx', randIdx); upd('_flashcardFlipped', false);
                  },
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all'
                }, '\uD83C\uDFB2 Random'),
                h('button', {
                  onClick: function() { upd('_flashcardIdx', (flashcardIdx + 1) % flashcardPool.length); upd('_flashcardFlipped', false); },
                  className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-all'
                }, 'Next \u2192')
              )
            ) : h('p', { className: 'text-xs text-slate-400 italic' }, 'No flashcards available for this complexity level.')
          ) : null,

          // ── Explore Tab ──
          activeTab === 'explore' ? h('div', null,
            // System tabs
            h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
              Object.keys(SYSTEMS).map(function(key) {
                var s = SYSTEMS[key];
                return h('button', {
                  key: key,
                  onClick: function() {
                    upd('system', key); upd('selectedStructure', null); upd('quizMode', false); upd('search', '');
                    playSound('systemSelect');
                  },
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (sysKey === key ? 'text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'),
                  style: sysKey === key ? { background: s.accent } : {}
                }, s.icon + ' ' + s.name);
              })
            ),

            // Fun fact banner
            currentFact ? h('div', { className: 'mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2' },
              h('span', { className: 'text-base flex-shrink-0' }, '\uD83D\uDCA1'),
              h('div', { className: 'flex-1' },
                h('span', { className: 'text-[10px] font-bold text-amber-700 uppercase' }, 'Did you know?'),
                h('p', { className: 'text-xs text-amber-900 leading-relaxed' }, currentFact)
              ),
              h('button', {
                onClick: function() { upd('_factIdx', (factIdx + 1) % sysFacts.length); playSound('funFact'); },
                className: 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all flex-shrink-0'
              }, 'Next \u2192')
            ) : null,

            // Mnemonics section
            MNEMONICS[sysKey] && MNEMONICS[sysKey].length > 0 ? h('div', { className: 'mb-3' },
              h('button', {
                onClick: function() { upd('_showMnemonics', !d._showMnemonics); },
                className: 'w-full flex items-center justify-between px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all'
              },
                h('span', { className: 'text-[10px] font-bold text-purple-700 uppercase flex items-center gap-1' }, '\uD83E\uDDE0 Mnemonics (' + MNEMONICS[sysKey].length + ')'),
                h('span', { className: 'text-[10px] text-purple-500' }, d._showMnemonics ? '\u25B2' : '\u25BC')
              ),
              d._showMnemonics ? h('div', { className: 'mt-1 space-y-1.5' },
                MNEMONICS[sysKey].map(function(mn) {
                  var isRevealed = mnemonicsViewed[mn.id];
                  return h('div', {
                    key: mn.id,
                    className: 'rounded-lg p-2.5 border transition-all ' + (isRevealed ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-white')
                  },
                    h('p', { className: 'text-[10px] font-bold text-purple-800 mb-0.5' }, mn.title),
                    h('p', { className: 'text-xs font-black text-purple-600 mb-1 italic' }, '"' + mn.phrase + '"'),
                    isRevealed ? h('div', null,
                      h('p', { className: 'text-[10px] text-slate-600 leading-relaxed' }, mn.meaning),
                      ttsBtn(mn.phrase + '. ' + mn.meaning)
                    ) : h('button', {
                      onClick: function() {
                        var newMV = Object.assign({}, mnemonicsViewed);
                        newMV[mn.id] = true;
                        upd('_mnemonicsViewed', newMV);
                        playSound('mnemonicReveal');
                      },
                      className: 'text-[10px] font-bold text-purple-600 hover:text-purple-800 transition-all'
                    }, 'Reveal meaning \u2192')
                  );
                })
              ) : null
            ) : null,

            // Progress tracker
            h('div', { className: 'mb-3 flex items-center gap-2' },
              h('span', { className: 'text-[10px] font-bold text-slate-500' }, sys.icon + ' ' + exploredInSystem + '/' + filtered.length + ' explored'),
              h('div', { className: 'flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden' },
                h('div', { className: 'h-full rounded-full transition-all', style: { width: progressPct + '%', background: sys.accent } })
              ),
              h('span', { className: 'text-[10px] font-bold', style: { color: sys.accent } }, progressPct + '%')
            ),

            // Layer toggle bar
            h('div', { className: 'flex items-center gap-1.5 mb-3 flex-wrap bg-slate-50 rounded-xl px-3 py-2 border border-slate-200' },
              h('span', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1' }, '\uD83E\uDDE0 Layers'),
              LAYER_DEFS.map(function(ld) {
                var isOn = layers[ld.id] || ld.id === autoLayerId;
                return h('button', {
                  key: ld.id,
                  onClick: function() {
                    toggleLayer(ld.id);
                    var newLT = Object.assign({}, layersToggled);
                    newLT[ld.id] = true;
                    upd('_layersToggled', newLT);
                  },
                  title: (isOn ? 'Hide ' : 'Show ') + ld.name + ' layer',
                  className: 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ' +
                    (isOn ? 'text-white shadow-sm border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100'),
                  style: isOn ? { background: ld.accent, borderColor: ld.accent } : {}
                }, ld.icon + ' ' + ld.name);
              }),
              h('button', {
                onClick: function() { upd('visibleLayers', { skin: true }); },
                title: 'Reset all layers to default (skin only)',
                className: 'ml-auto px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200'
              }, '\u21BA Reset')
            ),

            // Controls
            h('div', { className: 'flex items-center gap-2 mb-3 flex-wrap' },
              h('div', { className: 'flex rounded-lg border border-slate-200 overflow-hidden' },
                ['anterior', 'posterior'].map(function(v) {
                  return h('button', {
                    key: v,
                    onClick: function() { upd('view', v); upd('selectedStructure', null); playSound('viewSwitch'); },
                    className: 'px-3 py-1 text-xs font-bold transition-all ' + (view === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')
                  }, v.charAt(0).toUpperCase() + v.slice(1));
                })
              ),
              h('input', {
                type: 'text', placeholder: '\uD83D\uDD0D Search structures...',
                value: d.search || '',
                onChange: function(e) {
                  upd('search', e.target.value);
                  if (e.target.value && filtered.length > 0) { upd('_searchFinds', (d._searchFinds || 0) + 1); }
                },
                className: 'flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-300 outline-none'
              }),
              h('button', {
                onClick: function() { upd('quizMode', !d.quizMode); upd('quizIdx', 0); upd('quizScore', 0); upd('quizFeedback', null); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (d.quizMode ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100')
              }, d.quizMode ? '\u2705 Quiz On' : '\uD83E\uDDEA Quiz'),
              h('div', { className: 'flex rounded-lg border border-slate-200 overflow-hidden' },
                [{ v: 1, label: 'K\u20135', tip: 'Elementary' }, { v: 2, label: '6\u20138', tip: 'Middle' }, { v: 3, label: '9\u201312+', tip: 'Advanced' }].map(function(lv) {
                  return h('button', {
                    key: lv.v, title: lv.tip + ' level',
                    onClick: function() { upd('complexity', lv.v); upd('selectedStructure', null); },
                    className: 'px-2 py-1 text-[10px] font-bold transition-all ' + (complexity === lv.v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')
                  }, lv.label);
                })
              ),
              h('span', { className: 'text-[10px] text-slate-500 font-bold' }, filtered.length + ' structures'),
              h('button', {
                onClick: function() { upd('_showRegionLabels', !d._showRegionLabels); },
                title: 'Toggle body region labels',
                className: 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ' + (d._showRegionLabels ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50')
              }, '\uD83C\uDFF7 Regions'),
              h('button', {
                onClick: function() { upd('_xrayMode', !xrayMode); },
                title: 'Toggle X-ray radiograph mode',
                className: 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ' + (xrayMode ? 'bg-cyan-800 text-cyan-200 border-cyan-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50')
              }, '\u2622 X-ray')
            ),

            // Main content: canvas + detail panel
            h('div', { className: 'flex gap-4', style: { alignItems: 'flex-start' } },
              // Canvas
              h('div', { className: 'flex-shrink-0' },
                h('canvas', {
                  ref: canvasRef, width: 360, height: 520,
                  onClick: handleClick,
                  onMouseMove: handleMouseMove,
                  onMouseLeave: function() { upd('_hoverStructure', null); },
                  className: 'rounded-xl border-2 cursor-crosshair',
                  style: { borderColor: sys.accent + '30', background: '#fafaf9' }
                })
              ),
              // Right panel
              h('div', { className: 'flex-1 min-w-0' },
                d.quizMode ? (
                  // Quiz panel (enhanced with 4 types)
                  quizQ ? h('div', { className: 'bg-white rounded-xl border-2 border-green-200 p-4 space-y-3' },
                    h('div', { className: 'flex items-center justify-between mb-2' },
                      h('h4', { className: 'font-bold text-green-800 text-sm' }, '\uD83E\uDDEA Anatomy Quiz'),
                      h('span', { className: 'text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700' }, '\u2B50 ' + (d.quizScore || 0) + '/' + Math.min((d.quizIdx || 0) + 1, quizPool.length))
                    ),
                    h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 mb-1' },
                      quizType === 0 ? 'Function \u2192 Structure' :
                      quizType === 1 ? 'True or False' :
                      quizType === 2 ? 'System ID' : 'Clinical Challenge'
                    ),
                    // Question text varies by type
                    quizType === 0 ? h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, 'Which structure has this function?'),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic' }, quizQ.fn.substring(0, 120) + (quizQ.fn.length > 120 ? '...' : ''))
                    ) : quizType === 1 ? h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, 'True or False:'),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic' }, 'The ' + quizQ.name + ' belongs to the ' + sys.name + ' system.')
                    ) : quizType === 2 ? h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, 'Which body system contains this structure?'),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed font-bold' }, quizQ.name)
                    ) : h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, 'Which structure is affected?'),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic' }, quizQ.clinical ? quizQ.clinical.substring(0, 120) + '...' : quizQ.fn.substring(0, 120) + '...')
                    ),
                    h('div', { className: 'grid grid-cols-1 gap-1.5' },
                      quizOptions.map(function(opt) {
                        var fb = d.quizFeedback;
                        var correctId = quizType === 1 ? 'true' : (quizType === 2 ? sysKey : quizQ.id);
                        var isCorrect = opt.id === correctId;
                        var wasChosen = fb && fb.chosen === opt.id;
                        var showResult = fb !== null && fb !== undefined;
                        return h('button', {
                          key: opt.id,
                          disabled: showResult,
                          onClick: function() {
                            var correct = opt.id === correctId;
                            upd('quizFeedback', { chosen: opt.id, correct: correct });
                            if (correct) {
                              upd('quizScore', (d.quizScore || 0) + 1);
                              upd('_totalCorrect', (d._totalCorrect || 0) + 1);
                              upd('_streak', (d._streak || 0) + 1);
                              playSound('quizCorrect');
                            } else {
                              upd('_streak', 0);
                              playSound('quizWrong');
                            }
                          },
                          className: 'w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ' +
                            (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :
                              showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :
                                'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50')
                        }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + opt.name);
                      })
                    ),
                    d.quizFeedback && h('div', { className: 'rounded-lg p-3 text-xs leading-relaxed space-y-1.5 ' + (d.quizFeedback.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                      h('p', { className: 'font-black ' + (d.quizFeedback.correct ? 'text-green-800' : 'text-amber-800') }, (d.quizFeedback.correct ? '\u2705 Correct! ' : '\u274C The answer was: ') + quizQ.name),
                      h('p', { className: 'text-slate-700' }, h('span', { className: 'font-bold text-slate-500' }, 'Function: '), quizQ.fn.substring(0, 150)),
                      quizQ.clinical && h('p', { className: 'text-slate-600 italic' }, h('span', { className: 'font-bold text-rose-500' }, '\u26A0 Clinical: '), quizQ.clinical.substring(0, 120))
                    ),
                    d.quizFeedback && h('button', {
                      onClick: function() { upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); },
                      className: 'w-full py-2 mt-2 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-all'
                    }, 'Next Question \u2192')
                  ) : h('p', { className: 'text-sm text-slate-500 italic' }, 'No quiz questions available.')
                ) : (
                  sel ? (
                    // Detail panel
                    h('div', { className: 'bg-white rounded-xl border-2 p-4 space-y-3', style: { borderColor: sys.accent + '40' } },
                      h('div', { className: 'flex items-start justify-between' },
                        h('div', { className: 'flex-1' },
                          h('h4', { className: 'text-base font-black', style: { color: sys.accent } }, sel.name),
                          PRONUNCIATION[sel.id] ? h('p', { className: 'text-[10px] text-indigo-500 italic mt-0.5' }, '\uD83D\uDD0A ' + PRONUNCIATION[sel.id]) : null,
                          (gradeBand === 'k2' || gradeBand === 'g35') && SIMPLE_DESC[sel.id] && SIMPLE_DESC[sel.id][gradeBand] ? h('p', { className: 'text-xs text-sky-700 bg-sky-50 rounded-lg px-2 py-1.5 mt-1 border border-sky-200 leading-relaxed' }, SIMPLE_DESC[sel.id][gradeBand]) : null
                        ),
                        h('div', { className: 'flex gap-1' },
                          h('button', {
                            onClick: function() {
                              if (compareStructureId === sel.id) { upd('_compareStructure', null); }
                              else { upd('_compareStructure', sel.id); upd('_comparisons', comparisons + 1); playSound('compareView'); }
                            },
                            title: compareStructureId === sel.id ? 'Remove from compare' : 'Set as compare target (B)',
                            className: 'p-1 rounded text-[10px] font-bold transition-all ' + (compareStructureId === sel.id ? 'bg-violet-100 text-violet-700' : 'hover:bg-violet-50 text-violet-400')
                          }, '\u2696'),
                          h('button', { onClick: function() { upd('selectedStructure', null); }, className: 'p-1 hover:bg-slate-100 rounded' }, h(X, { size: 14, className: 'text-slate-400' }))
                        )
                      ),
                      h('div', { className: 'space-y-2.5' },
                        h('div', null,
                          h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-0.5' }, 'Function', ttsBtn(sel.fn)),
                          h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, sel.fn)
                        ),
                        sel.origin && h('div', { className: 'grid grid-cols-2 gap-2' },
                          h('div', null,
                            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-0.5' }, 'Origin'),
                            h('p', { className: 'text-xs text-slate-600' }, sel.origin)
                          ),
                          h('div', null,
                            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-0.5' }, 'Insertion'),
                            h('p', { className: 'text-xs text-slate-600' }, sel.insertion)
                          )
                        ),
                        h('div', null,
                          h('p', { className: 'text-[10px] font-bold text-rose-500 uppercase mb-0.5' }, '\u26A0 Clinical Significance', ttsBtn(sel.clinical)),
                          h('p', { className: 'text-xs text-slate-600 leading-relaxed bg-rose-50 rounded-lg p-2' }, sel.clinical)
                        ),
                        sel.detail && h('div', null,
                          h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-0.5' }, 'Detail'),
                          h('p', { className: 'text-xs text-slate-500 leading-relaxed' }, sel.detail)
                        ),
                        // Brain Waves Section
                        sel.brainWaves && h('div', { className: 'mt-3 pt-3 border-t border-slate-200' },
                          h('p', { className: 'text-[10px] font-bold text-violet-600 uppercase mb-2' }, '\u26A1 Brain Wave Types (EEG)'),
                          h('div', { className: 'space-y-2' },
                            sel.brainWaves.map(function(w) {
                              return h('div', { key: w.type, className: 'rounded-lg p-2.5 border', style: { borderColor: w.color + '40', background: w.color + '08' } },
                                h('div', { className: 'flex items-center gap-2 mb-1' },
                                  h('span', { className: 'text-base' }, w.emoji),
                                  h('span', { className: 'text-xs font-black', style: { color: w.color } }, w.type),
                                  h('span', { className: 'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full', style: { background: w.color + '18', color: w.color } }, w.freq)
                                ),
                                h('p', { className: 'text-[10px] font-bold text-slate-500 mb-0.5' }, 'State: ', h('span', { className: 'text-slate-700' }, w.state)),
                                h('p', { className: 'text-[10px] text-slate-600 leading-relaxed mb-1' }, w.characteristics),
                                h('p', { className: 'text-[10px] text-rose-600 italic leading-relaxed' }, '\u26A0 ', w.clinical)
                              );
                            })
                          )
                        ),
                        // Sleep Stages Section
                        sel.sleepStages && h('div', { className: 'mt-3 pt-3 border-t border-slate-200' },
                          h('p', { className: 'text-[10px] font-bold text-indigo-600 uppercase mb-2' }, '\uD83D\uDCA4 Sleep Architecture'),
                          h('div', { className: 'space-y-2' },
                            sel.sleepStages.map(function(s) {
                              return h('div', { key: s.stage, className: 'rounded-lg p-2.5 border border-indigo-100 bg-indigo-50/30' },
                                h('div', { className: 'flex items-center gap-2 mb-1' },
                                  h('span', { className: 'text-base' }, s.emoji),
                                  h('span', { className: 'text-xs font-black text-indigo-700' }, s.stage),
                                  h('span', { className: 'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600' }, s.pct + ' of night')
                                ),
                                h('div', { className: 'flex gap-3 mb-1' },
                                  h('span', { className: 'text-[10px] text-slate-500' }, '\u23F1 ', h('span', { className: 'font-bold' }, s.duration)),
                                  h('span', { className: 'text-[10px] text-slate-500' }, '\uD83C\uDF0A ', h('span', { className: 'font-bold' }, s.waves))
                                ),
                                h('p', { className: 'text-[10px] text-slate-600 leading-relaxed mb-1' }, s.desc),
                                h('p', { className: 'text-[10px] text-rose-600 italic leading-relaxed' }, '\u26A0 ', s.clinical)
                              );
                            })
                          )
                        )
                      ),
                      // ── Compare Panel ──
                      compareSel && compareSel.id !== sel.id ? h('div', { className: 'mt-3 pt-3 border-t-2 border-violet-200' },
                        h('div', { className: 'flex items-center justify-between mb-2' },
                          h('p', { className: 'text-[10px] font-bold text-violet-600 uppercase' }, '\u2696 Comparing with:'),
                          h('button', {
                            onClick: function() { upd('_compareStructure', null); },
                            className: 'text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded hover:bg-slate-100'
                          }, '\u2715 Clear')
                        ),
                        h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200' },
                          h('h5', { className: 'text-sm font-black text-violet-800 mb-1' }, compareSel.name),
                          h('p', { className: 'text-[10px] text-slate-600 leading-relaxed mb-1' }, compareSel.fn.substring(0, 200) + (compareSel.fn.length > 200 ? '...' : '')),
                          compareSel.clinical ? h('p', { className: 'text-[10px] text-rose-600 italic leading-relaxed' }, '\u26A0 ' + compareSel.clinical.substring(0, 150) + (compareSel.clinical.length > 150 ? '...' : '')) : null
                        ),
                        h('table', { className: 'w-full mt-2 text-[10px]' },
                          h('thead', null,
                            h('tr', { className: 'border-b border-violet-200' },
                              h('th', { className: 'text-left py-1 text-violet-600 font-bold' }, ''),
                              h('th', { className: 'text-left py-1 font-bold', style: { color: sys.accent } }, sel.name),
                              h('th', { className: 'text-left py-1 text-violet-700 font-bold' }, compareSel.name)
                            )
                          ),
                          h('tbody', null,
                            h('tr', { className: 'border-b border-slate-100' },
                              h('td', { className: 'py-1 font-bold text-slate-500' }, 'System'),
                              h('td', { className: 'py-1 text-slate-600' }, sys.name),
                              h('td', { className: 'py-1 text-slate-600' }, sys.name)
                            ),
                            h('tr', { className: 'border-b border-slate-100' },
                              h('td', { className: 'py-1 font-bold text-slate-500' }, 'View'),
                              h('td', { className: 'py-1 text-slate-600' }, sel.v === 'b' ? 'Both' : sel.v === 'a' ? 'Anterior' : 'Posterior'),
                              h('td', { className: 'py-1 text-slate-600' }, compareSel.v === 'b' ? 'Both' : compareSel.v === 'a' ? 'Anterior' : 'Posterior')
                            ),
                            sel.origin && compareSel.origin ? h('tr', { className: 'border-b border-slate-100' },
                              h('td', { className: 'py-1 font-bold text-slate-500' }, 'Origin'),
                              h('td', { className: 'py-1 text-slate-600' }, sel.origin),
                              h('td', { className: 'py-1 text-slate-600' }, compareSel.origin)
                            ) : null,
                            sel.insertion && compareSel.insertion ? h('tr', null,
                              h('td', { className: 'py-1 font-bold text-slate-500' }, 'Insertion'),
                              h('td', { className: 'py-1 text-slate-600' }, sel.insertion),
                              h('td', { className: 'py-1 text-slate-600' }, compareSel.insertion)
                            ) : null
                          )
                        )
                      ) : null
                    )
                  ) : (
                    // Structure list
                    h('div', { className: 'space-y-1 max-h-[460px] overflow-y-auto pr-1' },
                      filtered.length === 0 && h('p', { className: 'text-xs text-slate-400 italic py-4 text-center' }, 'No structures match your search.'),
                      filtered.map(function(st) {
                        return h('button', {
                          key: st.id,
                          onClick: function() { upd('selectedStructure', st.id); playSound('structureClick'); },
                          className: 'w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:shadow-sm ' +
                            (d.selectedStructure === st.id ? 'font-bold border-2' : 'bg-slate-50 hover:bg-white border border-slate-200'),
                          style: d.selectedStructure === st.id ? { borderColor: sys.accent, background: sys.color } : {}
                        },
                          h('div', { className: 'font-bold text-slate-800' }, st.name),
                          h('div', { className: 'text-[10px] text-slate-500 mt-0.5 line-clamp-1' }, st.fn.substring(0, 80) + (st.fn.length > 80 ? '...' : ''))
                        );
                      })
                    )
                  )
                )
              )
            ),

            // Clinical Cases section (advanced only)
            complexity >= 3 ? h('div', { className: 'mt-4 bg-rose-50 rounded-xl border border-rose-200 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-[10px] font-bold text-rose-600 uppercase tracking-wider' }, '\uD83E\uDE7A Clinical Cases (' + (d._clinicalSolved || 0) + ' solved)'),
                h('button', {
                  onClick: function() { upd('_showClinical', !d._showClinical); },
                  className: 'text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 transition-all'
                }, d._showClinical ? 'Hide' : 'Show Cases')
              ),
              d._showClinical ? h('div', { className: 'space-y-2' },
                CLINICAL_CASES.filter(function(c) { return !sysKey || c.system === sysKey || sysKey === 'skeletal'; }).slice(0, 3).map(function(cs, ci) {
                  var isActive = activeCaseIdx === ci;
                  return h('div', { key: cs.id, className: 'bg-white rounded-lg p-3 border border-rose-200' },
                    h('p', { className: 'text-xs font-bold text-rose-800 mb-1' }, cs.title + ' (' + cs.difficulty + ')'),
                    h('p', { className: 'text-[10px] text-slate-600 leading-relaxed mb-2' }, cs.presentation),
                    h('p', { className: 'text-[10px] font-bold text-slate-700 mb-1' }, cs.question),
                    isActive && activeCaseFeedback ? h('div', { className: 'mt-2 rounded-lg p-2 ' + (activeCaseFeedback === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                      h('p', { className: 'text-[10px] font-bold ' + (activeCaseFeedback === 'correct' ? 'text-green-800' : 'text-amber-800') }, activeCaseFeedback === 'correct' ? '\u2705 Correct!' : '\u274C Answer: ' + cs.answer),
                      h('p', { className: 'text-[10px] text-slate-600 leading-relaxed mt-1' }, cs.explanation)
                    ) : h('div', { className: 'flex gap-1 flex-wrap' },
                      h('button', {
                        onClick: function() {
                          upd('_activeCaseIdx', ci);
                          upd('_activeCaseFeedback', 'correct');
                          upd('_clinicalSolved', (d._clinicalSolved || 0) + 1);
                          playSound('clinicalCase');
                        },
                        className: 'px-2 py-1 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all'
                      }, '\u2705 I got it!'),
                      h('button', {
                        onClick: function() {
                          upd('_activeCaseIdx', ci);
                          upd('_activeCaseFeedback', 'reveal');
                        },
                        className: 'px-2 py-1 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all'
                      }, '\uD83D\uDC41 Reveal Answer')
                    )
                  );
                })
              ) : null
            ) : null,

            // Badge section
            h('div', { className: 'mt-4 bg-slate-50 rounded-xl border border-slate-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 Badges (' + Object.keys(badges).length + '/' + BADGE_DEFS.length + ')'),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                BADGE_DEFS.map(function(bd) {
                  var earned = badges[bd.id];
                  return h('div', {
                    key: bd.id,
                    title: bd.name + ': ' + bd.desc + ' (' + bd.xp + ' XP)',
                    className: 'px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ' +
                      (earned ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-400')
                  }, bd.icon + ' ' + bd.name);
                })
              )
            ),

            // ── Stats Dashboard ──
            h('div', { className: 'mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2' }, '\uD83D\uDCCA Exploration Stats'),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                // Structures Viewed
                h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-lg font-black text-indigo-700' }, String(Object.keys(structuresViewed).length)),
                  h('p', { className: 'text-[9px] text-slate-500 font-semibold' }, 'Structures')
                ),
                // Systems Explored
                h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-lg font-black text-emerald-600' }, String(Object.keys(systemsExplored).length) + '/10'),
                  h('p', { className: 'text-[9px] text-slate-500 font-semibold' }, 'Systems')
                ),
                // Quiz Score
                h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-lg font-black text-amber-600' }, String(totalCorrect)),
                  h('p', { className: 'text-[9px] text-slate-500 font-semibold' }, 'Quiz Correct')
                ),
                // Spotter Score
                h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-lg font-black text-rose-600' }, String(spotterScore)),
                  h('p', { className: 'text-[9px] text-slate-500 font-semibold' }, 'Spotter IDs')
                ),
                // Pathways Completed
                h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-lg font-black text-teal-600' }, String(Object.keys(pathwaysCompleted).length)),
                  h('p', { className: 'text-[9px] text-slate-500 font-semibold' }, 'Pathways')
                ),
                // Comparisons
                h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-lg font-black text-purple-600' }, String(comparisons)),
                  h('p', { className: 'text-[9px] text-slate-500 font-semibold' }, 'Comparisons')
                )
              ),
              // Secondary stats row
              h('div', { className: 'mt-2 flex flex-wrap gap-2' },
                h('span', { className: 'text-[9px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                  '\uD83D\uDD25 Streak: ' + streak
                ),
                h('span', { className: 'text-[9px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                  '\uD83E\uDD16 AI Questions: ' + aiQuestions
                ),
                h('span', { className: 'text-[9px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                  '\uD83E\uDDE0 Mnemonics: ' + Object.keys(mnemonicsViewed).length
                ),
                h('span', { className: 'text-[9px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                  '\uD83D\uDD0D Searches: ' + searchFinds
                ),
                h('span', { className: 'text-[9px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                  '\uD83E\uDE7A Clinical Cases: ' + clinicalSolved
                ),
                spotterBestTime < 999 ? h('span', { className: 'text-[9px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold' },
                  '\u26A1 Best Spotter: ' + spotterBestTime.toFixed(1) + 's'
                ) : null
              ),
              // XP total
              getStemXP ? h('div', { className: 'mt-2 text-center' },
                h('span', { className: 'text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-300 text-amber-800' },
                  '\u2B50 Total XP: ' + (getStemXP() || 0)
                )
              ) : null,
              // Progress bar
              h('div', { className: 'mt-2' },
                h('div', { className: 'flex justify-between mb-1' },
                  h('span', { className: 'text-[9px] text-slate-500 font-semibold' }, 'System Progress'),
                  h('span', { className: 'text-[9px] font-bold text-indigo-600' }, progressPct + '%')
                ),
                h('div', { className: 'w-full bg-slate-200 rounded-full h-1.5' },
                  h('div', {
                    className: 'h-1.5 rounded-full transition-all duration-500',
                    style: { width: progressPct + '%', background: 'linear-gradient(90deg, ' + sys.accent + ', #6366f1)' }
                  })
                )
              )
            )
          ) : null

        );
      })();
    }
  });

})();
}

