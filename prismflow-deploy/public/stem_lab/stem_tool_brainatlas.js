// stem_tool_brainatlas.js - Brain Atlas Explorer plugin
// Extracted from stem_tool_science.js
(function() {
  if (!window.StemLab || !window.StemLab.registerTool) return;

  // ═══ 🔬 brainAtlas (brainAtlas) ═══

  // ── Audio (auto-injected) ──
  var _brainAC = null;
  function getBrainAC() { if (!_brainAC) { try { _brainAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_brainAC && _brainAC.state === "suspended") { try { _brainAC.resume(); } catch(e) {} } return _brainAC; }
  function brainTone(f,d,tp,v) { var ac = getBrainAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxBrainClick() { brainTone(600, 0.03, "sine", 0.04); }
  function sfxBrainSuccess() { brainTone(523, 0.08, "sine", 0.07); setTimeout(function() { brainTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { brainTone(784, 0.1, "sine", 0.08); }, 140); }

  window.StemLab.registerTool('brainAtlas', {
    icon: '🔬',
    label: 'brainAtlas',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'explore_3_views', label: 'Explore 3 brain views', icon: '🧠', check: function(d) { return Object.keys(d.viewsExplored || {}).length >= 3; }, progress: function(d) { return Object.keys(d.viewsExplored || {}).length + '/3 views'; } },
      { id: 'quiz_3', label: 'Answer 3 brain quiz questions', icon: '🎯', check: function(d) { return (d.quizCorrect || 0) >= 3; }, progress: function(d) { return (d.quizCorrect || 0) + '/3'; } }
    ],
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
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
      var t = ctx.t;
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
      var canvasNarrate = ctx.canvasNarrate;

      // ── Tool body (brainAtlas) ──
      return (function() {
var d = labToolData.brainAtlas || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('brainAtlas', 'init', {
              first: 'Brain Atlas loaded. Explore brain regions, their functions, and neural pathways in an interactive 3D model.',
              repeat: 'Brain Atlas active.',
              terse: 'Brain Atlas.'
            }, { debounce: 800 });
          }

          var upd = function (k, v) { setLabToolData(function (p) { return Object.assign({}, p, { brainAtlas: Object.assign({}, p.brainAtlas, (function () {
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-brainatlas')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-brainatlas';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
 var o = {}; o[k] = v; return o; })()) }); }); };



          var VIEWS = {

            lateral: {

              name: t('stem.synth_ui.lateral'), desc: 'Side view showing all four lobes, cerebellum, and brainstem',

              regions: [

                { id: 'frontal', name: t('stem.synth_ui.frontal_lobe'), x: 0.28, y: 0.32, w: 0.22, fn: 'Executive function, planning, decision-making, personality, voluntary motor control (precentral gyrus), speech production (Broca\u2019s area, left hemisphere).', brodmann: 'BA 4 (primary motor), BA 6 (premotor), BA 44\u201345 (Broca\u2019s)', blood: 'Anterior cerebral artery (medial), middle cerebral artery (lateral)', conditions: 'Broca\u2019s aphasia (non-fluent speech with intact comprehension), personality changes, disinhibition, abulia. Frontal lobe tumors may present with subtle personality changes before focal signs.', damage: 'Contralateral hemiparesis, impaired judgment, personality changes, motor aphasia (dominant hemisphere).' },

                { id: 'prefrontal', name: t('stem.synth_ui.prefrontal_cortex'), x: 0.18, y: 0.35, w: 0.12, fn: 'Highest-order cognitive functions: working memory, attention, abstract reasoning, social behavior, impulse control. Dorsolateral PFC for executive control; orbitofrontal for social/emotional regulation.', brodmann: 'BA 9, 10, 11, 12, 46, 47', blood: 'Anterior cerebral artery, middle cerebral artery', conditions: 'ADHD, schizophrenia (hypofrontality), OCD, frontotemporal dementia (Pick disease). Phineas Gage case demonstrated personality changes from prefrontal damage.', damage: 'Poor planning, impulsivity, flat affect, socially inappropriate behavior, difficulty with abstract thinking.' },

                { id: 'motor_cortex', name: t('stem.synth_ui.primary_motor_cortex'), x: 0.42, y: 0.18, w: 0.08, fn: 'Precentral gyrus. Contains motor homunculus \u2014 somatotopic map of body. Upper motor neurons project via corticospinal tract to spinal cord. Controls voluntary movement contralaterally.', brodmann: 'BA 4', blood: 'Middle cerebral artery (lateral face/arm), anterior cerebral artery (medial leg)', conditions: 'Stroke: contralateral hemiparesis. Upper motor neuron signs: spasticity, hyperreflexia, Babinski sign, clonus.', damage: 'Contralateral spastic paralysis. Face/arm (MCA stroke) vs leg (ACA stroke).' },

                { id: 'parietal', name: t('stem.synth_ui.parietal_lobe'), x: 0.52, y: 0.22, w: 0.18, fn: 'Somatosensory processing (postcentral gyrus), spatial awareness, visuomotor integration, mathematical calculation. Posterior parietal cortex integrates sensory input for motor planning.', brodmann: 'BA 1,2,3 (primary somatosensory), BA 5,7 (association), BA 39 (angular gyrus), BA 40 (supramarginal gyrus)', blood: 'Middle cerebral artery, posterior cerebral artery', conditions: 'Gerstmann syndrome (dominant): agraphia, acalculia, finger agnosia, left-right confusion. Hemispatial neglect (non-dominant): patient ignores contralateral space.', damage: 'Loss of sensation, neglect syndrome, apraxia, difficulty with spatial reasoning and navigation.' },

                { id: 'temporal', name: t('stem.synth_ui.temporal_lobe'), x: 0.38, y: 0.58, w: 0.20, fn: 'Auditory processing (superior temporal gyrus), language comprehension (Wernicke\u2019s area, left), memory formation (hippocampus), emotion (amygdala), face recognition (fusiform gyrus).', brodmann: 'BA 41,42 (primary auditory), BA 22 (Wernicke\u2019s), BA 20,21,37,38 (association)', blood: 'Middle cerebral artery (lateral), posterior cerebral artery (inferior/medial)', conditions: 'Wernicke\u2019s aphasia: fluent but nonsensical speech, poor comprehension. Temporal lobe epilepsy: aura (d\u00E9j\u00E0 vu, smell), automatisms. Prosopagnosia (face blindness).', damage: 'Language comprehension deficits (dominant), memory impairment, auditory agnosia, emotional changes.' },

                { id: 'occipital', name: t('stem.synth_ui.occipital_lobe'), x: 0.78, y: 0.32, w: 0.14, fn: 'Primary visual cortex (V1) along calcarine sulcus processes raw visual input. Association areas (V2\u2013V5) process color, motion, depth, and object recognition.', brodmann: 'BA 17 (V1 primary visual), BA 18 (V2), BA 19 (V3\u2013V5)', blood: 'Posterior cerebral artery', conditions: 'Cortical blindness with intact pupillary reflex (Anton syndrome: patient denies blindness). Homonymous hemianopia from unilateral lesion. Visual agnosia.', damage: 'Contralateral homonymous hemianopia, cortical blindness (bilateral), visual hallucinations, color blindness (achromatopsia).' },

                { id: 'cerebellum', name: t('stem.synth_ui.cerebellum'), x: 0.78, y: 0.62, w: 0.14, fn: 'Motor coordination, balance, motor learning, timing. Contains 50% of brain\u2019s neurons. Three functional divisions: vestibulocerebellum (balance), spinocerebellum (posture), cerebrocerebellum (planning).', brodmann: 'N/A (has its own cytoarchitecture: Purkinje cells, granule cells)', blood: 'Superior cerebellar, anterior inferior cerebellar (AICA), posterior inferior cerebellar (PICA) arteries', conditions: 'Cerebellar ataxia: wide-based gait, dysmetria (finger-to-nose test), intention tremor, dysdiadochokinesia. PICA stroke \u2192 Wallenberg syndrome.', damage: 'Ipsilateral ataxia (damage affects same side, unlike cerebrum). Nystagmus, scanning speech, hypotonia.' },

                { id: 'brainstem', name: 'Brainstem', x: 0.62, y: 0.68, w: 0.10, fn: 'Midbrain + pons + medulla oblongata. Contains cranial nerve nuclei (III\u2013XII), reticular activating system (consciousness), vital centers (cardiac, respiratory, vasomotor). All ascending/descending tracts pass through.', brodmann: 'N/A', blood: 'Basilar artery, vertebral arteries, PICA, AICA', conditions: 'Locked-in syndrome (ventral pons lesion): conscious but can only move eyes. Brainstem death = legal death criterion. Central pontine myelinolysis from rapid Na correction.', damage: 'Coma, cranial nerve palsies, respiratory failure, cardiovascular collapse. "Crossed" signs: ipsilateral CN deficit + contralateral body weakness.' },

                { id: 'brocas', name: 'Broca\'s Area', x: 0.25, y: 0.48, w: 0.08, fn: 'Left inferior frontal gyrus (pars opercularis + triangularis). Speech production and language processing. Part of larger language network connecting to Wernicke\'s via arcuate fasciculus.', brodmann: 'BA 44, 45', blood: 'Middle cerebral artery (superior division)', conditions: 'Broca\'s aphasia: non-fluent speech, telegraphic output ("want... water..."), intact comprehension, patient frustrated. Often accompanied by right hemiparesis (adjacent motor cortex).', damage: 'Expressive (motor) aphasia. Patient understands language but cannot produce fluent speech.' },

                { id: 'wernickes', name: 'Wernicke\'s Area', x: 0.55, y: 0.50, w: 0.10, fn: 'Left posterior superior temporal gyrus. Receptive language processing \u2014 comprehension of spoken and written language. Connected to Broca\'s area via arcuate fasciculus.', brodmann: 'BA 22 (posterior part)', blood: 'Middle cerebral artery (inferior division)', conditions: 'Wernicke\'s aphasia: fluent but meaningless speech (word salad/neologisms), severely impaired comprehension. Patient often unaware of deficit. Conduction aphasia if arcuate fasciculus damaged.', damage: 'Receptive (sensory) aphasia. Patient speaks fluently but output is meaningless; poor comprehension and repetition.' },

                { id: 'insular', name: 'Insular Cortex (Insula)', x: 0.42, y: 0.45, w: 0.10, fn: 'Hidden deep to lateral sulcus, covered by opercula. Integrates interoceptive awareness (body state), taste (gustatory cortex), pain, empathy, disgust, addiction craving. Anterior insula: subjective emotional experience. Posterior insula: somatosensory integration.', brodmann: 'BA 13, 14, 15, 16', blood: 'Middle cerebral artery (insular branches, M2 segment)', conditions: 'Insular stroke: gustatory dysfunction, autonomic dysregulation (cardiac arrhythmias), loss of interoceptive awareness. Insular involvement in addiction: damage reduces nicotine craving. Temporal lobe epilepsy often involves insula. Role in anxiety and panic disorder.', damage: 'Loss of taste, impaired interoception, autonomic instability, reduced empathy, altered pain perception, disrupted addiction circuits.' },

                { id: 'angular_gyrus', name: 'Angular Gyrus', x: 0.68, y: 0.38, w: 0.08, fn: 'Posterior parietal cortex (inferior parietal lobule). Multimodal integration hub: reading (visual word form \u2192 language), arithmetic, spatial cognition, semantic processing, attention, theory of mind. Cross-modal association area. Left angular gyrus critical for reading comprehension.', brodmann: 'BA 39', blood: 'Middle cerebral artery (angular branch) and posterior cerebral artery', conditions: 'Gerstmann syndrome (left angular gyrus lesion): agraphia, acalculia, finger agnosia, left-right disorientation. Alexia with agraphia. Angular gyrus syndrome may mimic Wernicke aphasia. Part of default mode network.', damage: 'Reading comprehension deficits, calculation errors, spatial disorientation, impaired semantic processing, anomia.' },

                { id: 'supramarginal', name: 'Supramarginal Gyrus', x: 0.62, y: 0.32, w: 0.08, fn: 'Anterior inferior parietal lobule, wraps around posterior end of lateral sulcus. Phonological processing, tactile object recognition, empathy, language (repetition: connects Wernicke to Broca via arcuate fasciculus). Non-dominant: spatial awareness and attention.', brodmann: 'BA 40', blood: 'Middle cerebral artery (posterior parietal branches)', conditions: 'Conduction aphasia: impaired repetition with intact comprehension and fluency (arcuate fasciculus damage at supramarginal gyrus). Non-dominant lesion: hemispatial neglect (overlaps with parietal neglect). Ideomotor apraxia.', damage: 'Impaired repetition (conduction aphasia), phonological processing deficits, tactile agnosia, ideomotor apraxia, contralateral neglect (non-dominant).' }

              ]

            },

            medial: {

              name: t('stem.synth_ui.medial_sagittal'), desc: t('stem.synth_ui.midline_cut_revealing_deep_structures'),

              regions: [

                { id: 'corpus_callosum', name: t('stem.synth_ui.corpus_callosum'), x: 0.48, y: 0.30, w: 0.20, fn: 'Largest white matter commissure (~200 million axons). Connects left and right cerebral hemispheres. Regions: rostrum, genu, body, splenium. Enables interhemispheric communication.', brodmann: 'N/A (white matter tract)', blood: 'Anterior cerebral artery (pericallosal branches)', conditions: 'Split-brain syndrome after callosotomy: hemispheres cannot communicate. Alien hand syndrome. Agenesis of corpus callosum (developmental anomaly).', damage: 'Disconnection syndromes: inability to name objects in left visual field, left hand apraxia to verbal commands.' },

                { id: 'thalamus', name: t('stem.synth_ui.thalamus'), x: 0.52, y: 0.42, w: 0.10, fn: 'Relay station for all sensory input (except olfaction) to cortex. Specific nuclei: VPL (body sensation), VPM (face), LGN (vision), MGN (hearing). Also involved in consciousness, sleep, and memory.', brodmann: 'N/A (diencephalon)', blood: 'Posterior cerebral artery (thalamogeniculate, thalamoperforating branches)', conditions: 'Thalamic pain syndrome (Dejerine-Roussy): contralateral burning/tingling pain after thalamic stroke. Thalamic tumors cause sensory loss and altered consciousness.', damage: 'Contralateral sensory loss, pain syndromes, decreased consciousness, aphasia (dominant thalamus), neglect (non-dominant).' },

                { id: 'hypothalamus', name: t('stem.synth_ui.hypothalamus'), x: 0.42, y: 0.52, w: 0.08, fn: 'Master regulator of homeostasis. Controls: body temperature, hunger/thirst, circadian rhythm, autonomic NS, pituitary hormone release. "Four Fs": feeding, fighting, fleeing, reproduction.', brodmann: 'N/A (diencephalon)', blood: 'Circle of Willis branches, superior hypophyseal artery', conditions: 'Diabetes insipidus (ADH deficiency), SIADH (excess ADH), Kallmann syndrome (GnRH deficiency + anosmia). Craniopharyngioma: tumor compressing hypothalamus.', damage: 'Disrupted temperature regulation, sleep-wake cycle, hunger/satiety, hormonal imbalance, autonomic dysfunction.' },

                { id: 'cingulate', name: t('stem.synth_ui.cingulate_gyrus'), x: 0.42, y: 0.22, w: 0.18, fn: 'C-shaped cortex above corpus callosum. Anterior cingulate: emotion regulation, error detection, pain perception. Posterior cingulate: memory retrieval, default mode network.', brodmann: 'BA 23, 24, 25, 31, 32, 33', blood: 'Anterior cerebral artery (callosomarginal branches)', conditions: 'Anterior cingulate lesions: apathy, akinetic mutism (awake but no spontaneous movement/speech). Implicated in depression, OCD, chronic pain processing.', damage: 'Emotional blunting, apathy, reduced motivation, impaired error monitoring.' },

                { id: 'hippocampus', name: t('stem.synth_ui.hippocampus'), x: 0.58, y: 0.55, w: 0.10, fn: 'Seahorse-shaped structure in medial temporal lobe. Critical for converting short-term to long-term memory (consolidation). Spatial navigation (place cells). One of first areas affected in Alzheimer\u2019s.', brodmann: 'Archicortex (3-layered, not neocortical)', blood: 'Posterior cerebral artery (hippocampal branches)', conditions: 'Alzheimer\u2019s disease: hippocampal atrophy is earliest finding. Anterograde amnesia (HM patient: bilateral hippocampal removal). Temporal lobe epilepsy often originates here. Hippocampal sclerosis.', damage: 'Anterograde amnesia (cannot form new memories), spatial disorientation. Retrograde memory relatively preserved initially.' },

                { id: 'amygdala', name: t('stem.synth_ui.amygdala'), x: 0.38, y: 0.58, w: 0.08, fn: 'Almond-shaped nucleus in anterior medial temporal lobe. Fear conditioning, threat detection, emotional memory. Modulates hippocampal memory consolidation. Part of limbic system.', brodmann: 'N/A (subcortical)', blood: 'Anterior choroidal artery, middle cerebral artery branches', conditions: 'Kl\u00FCver-Bucy syndrome (bilateral amygdala damage): hyperorality, hypersexuality, visual agnosia, placidity. PTSD: hyperactive amygdala. Anxiety disorders.', damage: 'Impaired fear recognition, inability to detect threatening facial expressions, emotional blunting, hypersexuality (bilateral).' },

                { id: 'basal_ganglia', name: t('stem.synth_ui.basal_ganglia'), x: 0.50, y: 0.38, w: 0.10, fn: 'Caudate + putamen (=striatum) + globus pallidus. Movement modulation: direct pathway (facilitates movement) vs indirect pathway (inhibits movement). Also involved in reward, habit formation, procedural learning.', brodmann: 'N/A (subcortical nuclei)', blood: 'Middle cerebral artery (lenticulostriate arteries, "arteries of stroke")', conditions: 'Parkinson\u2019s disease (dopamine depletion in substantia nigra \u2192 striatum): resting tremor, rigidity, bradykinesia, postural instability. Huntington\u2019s disease (caudate atrophy): chorea, dementia, psychiatric symptoms.', damage: 'Hypokinesia (Parkinson\u2019s-like) or hyperkinesia (chorea, ballismus) depending on which pathway is affected.' },

                { id: 'ventricles', name: 'Ventricular System', x: 0.50, y: 0.45, w: 0.10, fn: 'CSF-filled cavities: 2 lateral ventricles \u2192 interventricular foramina (Monro) \u2192 3rd ventricle \u2192 cerebral aqueduct (Sylvius) \u2192 4th ventricle. Choroid plexus produces ~500mL CSF/day. CSF cushions brain.', brodmann: 'N/A', blood: 'Choroid plexus supplied by choroidal arteries', conditions: 'Hydrocephalus: obstructive (non-communicating, e.g. aqueductal stenosis) or communicating (impaired absorption at arachnoid granulations). Normal pressure hydrocephalus: triad of dementia, gait ataxia, urinary incontinence ("wet, wacky, wobbly").', damage: 'Increased ICP from CSF obstruction \u2192 headache, nausea, papilledema, herniation if untreated.' },

                { id: 'pineal_brain', name: 'Pineal Gland', x: 0.68, y: 0.38, w: 0.06, fn: 'Small endocrine gland in epithalamus, posterior to third ventricle. Produces melatonin from serotonin (darkness-regulated). Contains pinealocytes and glial cells. Calcifies with age (visible on imaging as midline marker). Outside blood-brain barrier.', brodmann: 'N/A (endocrine gland)', blood: 'Posterior choroidal arteries', conditions: 'Pinealoma/pineal germinoma: may compress cerebral aqueduct \u2192 obstructive hydrocephalus. Parinaud syndrome (dorsal midbrain syndrome): upgaze palsy, convergence-retraction nystagmus, light-near dissociation. Pineal cysts (usually incidental). Precocious puberty (pineal tumors secreting hCG).', damage: 'Disrupted circadian rhythms, obstructive hydrocephalus from aqueductal compression, Parinaud dorsal midbrain syndrome.' },

                { id: 'fornix', name: 'Fornix', x: 0.52, y: 0.34, w: 0.12, fn: 'Major white matter tract of limbic system. C-shaped bundle connecting hippocampus to mammillary bodies, septal nuclei, and hypothalamus. Carries output from hippocampal formation (subiculum). Columns of fornix pass through hypothalamus to mammillary bodies. Critical for memory circuit (Papez circuit).', brodmann: 'N/A (white matter tract)', blood: 'Branches of anterior cerebral artery and internal cerebral vein', conditions: 'Fornix damage (surgical, tumor, trauma): severe anterograde amnesia similar to hippocampal lesions. Colloid cyst of third ventricle can compress columns of fornix \u2192 acute memory loss. Forniceal involvement in MS may contribute to cognitive symptoms.', damage: 'Anterograde amnesia (inability to form new memories), disrupted spatial memory, impaired episodic memory encoding.' },

                { id: 'mammillary', name: 'Mammillary Bodies', x: 0.45, y: 0.58, w: 0.06, fn: 'Paired nuclei on ventral surface of posterior hypothalamus. Part of Papez circuit (hippocampus \u2192 fornix \u2192 mammillary bodies \u2192 mammillothalamic tract \u2192 anterior thalamic nucleus \u2192 cingulate \u2192 hippocampus). Medial nucleus (larger): memory. Lateral nucleus: visceral reflexes.', brodmann: 'N/A (hypothalamic nuclei)', blood: 'Branches of posterior cerebral artery and posterior communicating artery', conditions: 'Wernicke encephalopathy: thiamine (B1) deficiency \u2192 mammillary body necrosis/hemorrhage + ataxia + ophthalmoplegia + confusion. If untreated \u2192 Korsakoff syndrome: permanent confabulation, anterograde/retrograde amnesia. Most common in chronic alcoholism. MRI shows mammillary body atrophy.', damage: 'Severe memory impairment (especially anterograde), confabulation (Korsakoff syndrome), disrupted spatial navigation.' },

                { id: 'septum_pell', name: 'Septum Pellucidum', x: 0.40, y: 0.30, w: 0.06, fn: 'Thin membrane of two laminae separating the two lateral ventricles. Contains septal nuclei (part of limbic system). Septal nuclei project to hippocampus (medial septum: cholinergic/GABAergic input for theta rhythm), hypothalamus, and brainstem. Connected to nucleus accumbens (pleasure).', brodmann: 'N/A (septal region)', blood: 'Anterior cerebral artery branches', conditions: 'Cavum septum pellucidum (CSP): persistent fluid-filled cavity between laminae, normal variant in ~20% of adults, more common in boxers and TBI patients. Septal lesions can cause rage reactions (septal rage syndrome in animal models). CSP associated with schizophrenia in some studies.', damage: 'Septal lesion effects include emotional dysregulation, hyperemotionality, and impaired pleasure/reward processing.' }

              ]

            },

            superior: {

              name: t('stem.synth_ui.superior_top'), desc: t('stem.synth_ui.view_from_above_showing_hemispheres'),

              regions: [

                { id: 'longitudinal', name: t('stem.synth_ui.longitudinal_fissure'), x: 0.50, y: 0.50, w: 0.04, fn: 'Deep midline cleft separating left and right cerebral hemispheres. Contains the falx cerebri (dural fold) and anterior cerebral arteries. Corpus callosum visible at its depth.', brodmann: 'N/A (anatomical landmark)', blood: 'Superior sagittal sinus runs along its superior border', conditions: 'Superior sagittal sinus thrombosis: headache, seizures, papilledema. Parasagittal meningiomas may compress motor cortex for lower limbs.', damage: 'Bilateral leg weakness if parasagittal tumor/thrombosis compresses medial motor cortex.' },

                { id: 'central_sulcus', name: t('stem.synth_ui.central_sulcus_rolandic'), x: 0.50, y: 0.38, w: 0.30, fn: 'Separates frontal lobe (anterior) from parietal lobe (posterior). Precentral gyrus (motor) lies anterior; postcentral gyrus (somatosensory) lies posterior. Key surgical landmark.', brodmann: 'Border between BA 4 (anterior) and BA 3,1,2 (posterior)', blood: 'Middle cerebral artery branches', conditions: 'Central sulcus is critical surgical landmark \u2014 must be identified to avoid motor/sensory cortex damage during neurosurgery. Functional MRI used for preoperative mapping.', damage: 'Lesions anterior \u2192 motor deficit; lesions posterior \u2192 sensory deficit on contralateral body.' },

                { id: 'frontal_sup', name: t('stem.synth_ui.frontal_lobes_superior_view'), x: 0.35, y: 0.25, w: 0.15, fn: 'Anterior to central sulcus. From above: superior, middle, and inferior frontal gyri visible. Prefrontal cortex dominates anterior portion. Supplementary motor area on medial surface.', brodmann: 'BA 4, 6, 8, 9, 10, 46', blood: 'Anterior cerebral artery (medial), middle cerebral artery (lateral)', conditions: 'Frontal lobe syndrome: disinhibition, poor judgment, abulia (lack of will). Meningiomas of the olfactory groove may compress frontal lobes bilaterally.', damage: 'Executive dysfunction, personality changes, contralateral motor weakness.' },

                { id: 'parietal_sup', name: t('stem.synth_ui.parietal_lobes_superior_view'), x: 0.55, y: 0.55, w: 0.15, fn: 'Posterior to central sulcus. Superior and inferior parietal lobules visible from above. Precuneus on medial surface (part of default mode network). Interhemispheric parietal areas for spatial integration.', brodmann: 'BA 1,2,3,5,7,39,40', blood: 'Middle cerebral artery, posterior cerebral artery', conditions: 'Balint syndrome (bilateral parietal): simultanagnosia, optic ataxia, oculomotor apraxia. Astereognosis: cannot identify objects by touch despite intact sensation.', damage: 'Sensory loss, neglect (non-dominant), apraxia, spatial disorientation, acalculia (dominant).' },

                { id: 'sma', name: 'Supplementary Motor Area', x: 0.42, y: 0.35, w: 0.10, fn: 'Medial surface of frontal lobe, anterior to primary motor cortex. Plans complex motor sequences, coordinates bimanual movements, internally generated movements (vs externally cued). Pre-SMA involved in motor planning and decision-making. Contains somatotopic organization.', brodmann: 'BA 6 (medial)', blood: 'Anterior cerebral artery', conditions: 'SMA syndrome (post-surgical): transient contralateral akinesia and mutism after SMA resection (recovers in weeks due to compensation). SMA seizures: bilateral tonic posturing, preserved consciousness. Alien limb syndrome (medial frontal variant).', damage: 'Transient contralateral motor neglect, difficulty initiating voluntary movement, impaired bimanual coordination, speech initiation problems.' }

              ]

            },

            inferior: {

              name: t('stem.synth_ui.inferior_bottom'), desc: t('stem.synth_ui.view_from_below_showing_cranial'),

              regions: [

                { id: 'olfactory', name: t('stem.synth_ui.olfactory_bulbstracts_cn_i'), x: 0.50, y: 0.20, w: 0.10, fn: 'Receive input from olfactory epithelium via cribriform plate of ethmoid bone. Only sensory pathway that does NOT relay through thalamus \u2014 projects directly to olfactory cortex, amygdala, entorhinal cortex.', brodmann: 'N/A', blood: 'Anterior cerebral artery (olfactory branches)', conditions: 'Anosmia: loss of smell from head trauma (cribriform plate fracture), COVID-19, Parkinson\u2019s (early sign), Kallmann syndrome, olfactory groove meningioma.', damage: 'Unilateral or bilateral anosmia. Foster Kennedy syndrome: ipsilateral anosmia + optic atrophy + contralateral papilledema (olfactory groove meningioma).' },

                { id: 'optic_chiasm', name: t('stem.synth_ui.optic_chiasm_cn_ii'), x: 0.50, y: 0.32, w: 0.10, fn: 'Partial decussation of optic nerve fibers. Nasal fibers cross; temporal fibers remain ipsilateral. Sits above pituitary gland in sella turcica. Critical landmark for visual field deficits.', brodmann: 'N/A', blood: 'Superior hypophyseal artery, ophthalmic artery', conditions: 'Bitemporal hemianopia: classical visual field defect from pituitary adenoma compressing chiasm from below. Craniopharyngioma compresses from above.', damage: 'Bitemporal hemianopia (loss of both temporal visual fields). Pituitary tumors are most common cause.' },

                { id: 'temporal_inf', name: t('stem.synth_ui.temporal_lobes_inferior'), x: 0.40, y: 0.50, w: 0.15, fn: 'Inferior surface shows fusiform gyrus (face recognition), parahippocampal gyrus (memory encoding), uncus (olfactory processing). Contains hippocampus and amygdala internally.', brodmann: 'BA 20 (inferior temporal), BA 36,37 (fusiform)', blood: 'Posterior cerebral artery', conditions: 'Uncal herniation: life-threatening transtentorial herniation compresses CN III \u2192 ipsilateral fixed dilated pupil, contralateral hemiparesis, then coma. Neurosurgical emergency. Prosopagnosia from fusiform gyrus damage.', damage: 'Memory deficits, face perception problems, uncal herniation signs if mass effect present.' },

                { id: 'cerebellum_inf', name: t('stem.synth_ui.cerebellum_inferior'), x: 0.50, y: 0.72, w: 0.18, fn: 'Cerebellar tonsils visible inferiorly, flanking the foramen magnum. Vermis (midline) controls truncal balance; hemispheres control limb coordination. Flocculonodular lobe controls eye movements.', brodmann: 'N/A', blood: 'PICA (posterior inferior cerebellar artery)', conditions: 'Chiari malformation: cerebellar tonsils herniate through foramen magnum \u2192 headache, syringomyelia. Cerebellar tonsillar herniation is life-threatening (compresses brainstem). Medulloblastoma in children (vermis).', damage: 'Truncal ataxia (vermis lesion), limb ataxia (hemisphere lesion), nystagmus, dysarthria.' },

                { id: 'medulla_inf', name: t('stem.synth_ui.medulla_oblongata_inferior'), x: 0.50, y: 0.60, w: 0.08, fn: 'Most inferior brainstem structure. Contains: cardiovascular center, respiratory center, vomiting center, pyramids (corticospinal tracts that decussate here). CN IX, X, XI, XII nuclei.', brodmann: 'N/A', blood: 'Vertebral arteries, PICA', conditions: 'Lateral medullary (Wallenberg) syndrome: PICA occlusion \u2192 ipsilateral facial numbness, Horner syndrome, ataxia + contralateral body pain/temperature loss. Dysphagia from nucleus ambiguus involvement.', damage: 'Respiratory/cardiac arrest if bilateral lesion. Alternating hemiplegia, dysphagia, dysarthria, vertigo.' },

                { id: 'cn_nerves', name: t('stem.synth_ui.cranial_nerves_iiu2013xii'), x: 0.50, y: 0.45, w: 0.12, fn: 'Emerge from brainstem base. Key exits: CN V from pons (trigeminal), CN VII/VIII from pontomedullary junction (facial/vestibulocochlear), CN IX/X/XI from medulla (glossopharyngeal, vagus, spinal accessory), CN XII from medulla (hypoglossal).', brodmann: 'N/A', blood: 'Various branches of basilar and vertebral arteries', conditions: 'CN III palsy: "down and out" eye, ptosis, mydriasis. CN V: trigeminal neuralgia. CN VII: Bell palsy (LMN facial droop). CN VIII: acoustic neuroma (hearing loss, tinnitus). CN XII: tongue deviates toward lesion.', damage: 'Specific cranial nerve deficits depending on which nerve is affected. Multiple CN palsies suggest brainstem pathology or skull base disease.' },

                { id: 'pituitary_brain', name: 'Pituitary Gland', x: 0.50, y: 0.38, w: 0.06, fn: 'Pea-sized master endocrine gland in sella turcica of sphenoid bone. Anterior lobe (adenohypophysis): GH, ACTH, TSH, FSH, LH, prolactin. Posterior lobe (neurohypophysis): stores oxytocin and ADH. Connected to hypothalamus by infundibulum (pituitary stalk). Hypophyseal portal system links hypothalamus to anterior pituitary.', brodmann: 'N/A (endocrine gland)', blood: 'Superior and inferior hypophyseal arteries from internal carotid artery', conditions: 'Pituitary adenoma (most common: prolactinoma) \u2192 visual field defects (bitemporal hemianopia), hormonal excess/deficiency. Pituitary apoplexy: hemorrhage into adenoma \u2192 sudden headache, visual loss, hypopituitarism. Sheehan syndrome: postpartum pituitary necrosis. Craniopharyngioma.', damage: 'Hormonal imbalance (multiple endocrine deficiencies), visual field defects from optic chiasm compression, diabetes insipidus if posterior pituitary affected.' },

                { id: 'circle_willis_brain', name: 'Circle of Willis', x: 0.50, y: 0.50, w: 0.14, fn: 'Arterial anastomotic ring at base of brain forming a polygon. Components: anterior communicating artery (AComm), bilateral A1 segments of ACA, bilateral ICA, bilateral PComm, bilateral P1 segments of PCA. Complete circle in only ~25% of population. Provides collateral circulation if one artery is occluded.', brodmann: 'N/A (vascular)', blood: 'Internal carotid arteries (anterior circulation) + basilar artery (posterior circulation)', conditions: 'Berry (saccular) aneurysms: most common at AComm junction (30\u201335%). Rupture \u2192 subarachnoid hemorrhage (thunderclap headache, worst headache of life). Risk: hypertension, smoking, polycystic kidney disease, Ehlers-Danlos, coarctation of aorta. Variants may reduce collateral flow \u2192 increased stroke risk.', damage: 'Aneurysm rupture causes subarachnoid hemorrhage with high mortality; occlusion of feeding vessels causes ischemic stroke in the territory of the affected branch.' }

              ]

            },

            neurotransmitters: {

              name: '\u26A1 Neurotransmitters', desc: 'Complete reference: synthesis, receptors, pathways, functions, pharmacology',

              isNT: true,

              regions: [

                { id: 'dopamine', name: 'Dopamine (DA)', x: 0.30, y: 0.35, w: 0.08, category: 'Catecholamine (Monoamine)', synthesis: 'Tyrosine \u2192 L-DOPA (tyrosine hydroxylase, rate-limiting) \u2192 Dopamine (DOPA decarboxylase). Stored in synaptic vesicles via VMAT2.', receptors: 'D1-like (D1, D5): Gs-coupled, excitatory, increase cAMP. D2-like (D2, D3, D4): Gi-coupled, inhibitory, decrease cAMP. D2 autoreceptors regulate release.', pathways: 'Mesolimbic (VTA \u2192 nucleus accumbens): reward/motivation. Mesocortical (VTA \u2192 PFC): cognition/executive function. Nigrostriatal (substantia nigra \u2192 striatum): motor control. Tuberoinfundibular (hypothalamus \u2192 pituitary): inhibits prolactin.', fn: 'Reward and pleasure signaling, motivation, motor control, executive function, working memory, attention, hormonal regulation (prolactin inhibition).', conditions: 'Parkinson disease: nigrostriatal DA depletion. Schizophrenia: mesolimbic DA excess (positive symptoms), mesocortical DA deficit (negative symptoms). ADHD: prefrontal DA/NE dysregulation. Addiction: mesolimbic hijacking.', drugs: 'L-DOPA/carbidopa (Parkinson). Antipsychotics: D2 blockers (haloperidol, risperidone). Stimulants: methylphenidate, amphetamine (block DAT/increase release). Cocaine blocks DAT. Pramipexole (D2/D3 agonist).', damage: 'Loss of dopamine neurons leads to bradykinesia, rigidity, and tremor in Parkinson disease; excess dopamine activity causes psychosis and hallucinations.' },

                { id: 'serotonin', name: 'Serotonin (5-HT)', x: 0.50, y: 0.60, w: 0.08, category: 'Indolamine (Monoamine)', synthesis: 'Tryptophan \u2192 5-hydroxytryptophan (tryptophan hydroxylase, rate-limiting) \u2192 Serotonin (aromatic amino acid decarboxylase). 90% in gut enterochromaffin cells; only 2% in brain (raphe nuclei).', receptors: '7 families (5-HT1\u20137), 14+ subtypes. 5-HT1A: anxiolytic target (buspirone). 5-HT2A: psychedelic target, antipsychotic target. 5-HT3: ionotropic (ondansetron target, antiemetic). 5-HT4: GI motility.', pathways: 'Raphe nuclei (dorsal and median) project widely to cortex, limbic system, basal ganglia, hypothalamus, brainstem, spinal cord. Most widespread monoamine projection system in brain.', fn: 'Mood regulation, anxiety modulation, sleep-wake cycle, appetite, pain perception, thermoregulation, GI motility, platelet aggregation, nausea/vomiting control.', conditions: 'Depression: monoamine hypothesis (5-HT deficit). Anxiety disorders. OCD (5-HT circuit dysfunction). Migraine (5-HT vasoconstriction). Carcinoid syndrome: serotonin-secreting tumor (flushing, diarrhea, wheezing). Serotonin syndrome: excess 5-HT (hyperthermia, rigidity, clonus).', drugs: 'SSRIs (fluoxetine, sertraline): block SERT. SNRIs (venlafaxine). TCAs (amitriptyline). MAOIs (phenelzine). Triptans (5-HT1B/1D agonists for migraine). Ondansetron (5-HT3 antagonist, antiemetic). Buspirone (5-HT1A partial agonist). LSD/psilocybin (5-HT2A agonists).', damage: 'Serotonin depletion contributes to depression, insomnia, impulsivity, and increased pain sensitivity; excess causes serotonin syndrome with potentially fatal hyperthermia.' },

                { id: 'norepinephrine', name: 'Norepinephrine (NE)', x: 0.40, y: 0.30, w: 0.08, category: 'Catecholamine (Monoamine)', synthesis: 'Tyrosine \u2192 L-DOPA \u2192 Dopamine \u2192 Norepinephrine (dopamine \u03B2-hydroxylase, in synaptic vesicles). NE is the immediate precursor to epinephrine in the adrenal medulla.', receptors: '\u03B11: Gq, vasoconstriction, mydriasis. \u03B12: Gi, presynaptic autoreceptor (inhibits NE release), central sedation. \u03B21: Gs, increases heart rate/contractility. \u03B22: Gs, bronchodilation, vasodilation. \u03B23: Gs, lipolysis.', pathways: 'Locus coeruleus (LC) in dorsal pons projects to entire cerebral cortex, hippocampus, amygdala, cerebellum, spinal cord. Primary arousal/alertness center. Lateral tegmental system: autonomic regulation.', fn: 'Arousal, alertness, attention, vigilance, stress response (fight-or-flight), mood regulation, blood pressure regulation, pain modulation, memory consolidation during emotional events.', conditions: 'Depression (NE deficit). PTSD (NE hyperactivity, hyperarousal). Orthostatic hypotension (NE insufficiency). Pheochromocytoma: NE/epinephrine-secreting adrenal tumor \u2192 episodic hypertension, tachycardia, headache, diaphoresis.', drugs: 'SNRIs (duloxetine, venlafaxine). NRIs (atomoxetine for ADHD). TCAs (desipramine: NE-selective). Clonidine (\u03B12 agonist, central sympatholytic). Prazosin (\u03B11 blocker, PTSD nightmares). Propranolol (\u03B2-blocker). Phenylephrine (\u03B11 agonist, decongestant).', damage: 'Norepinephrine dysregulation causes attention deficits, autonomic dysfunction, depression, and impaired stress response.' },

                { id: 'acetylcholine', name: 'Acetylcholine (ACh)', x: 0.55, y: 0.40, w: 0.08, category: 'Cholinergic (Ester)', synthesis: 'Choline + Acetyl-CoA \u2192 ACh (choline acetyltransferase, ChAT). Degraded in synaptic cleft by acetylcholinesterase (AChE). Choline recycled via high-affinity choline transporter.', receptors: 'Nicotinic (nAChR): ligand-gated ion channels. NMJ type (\u03B11)2\u03B21\u03B4\u03B5: muscle contraction. CNS types (\u03B14\u03B22, \u03B17): cognition, attention. Muscarinic (mAChR): G-protein coupled. M1 (Gq): cognition. M2 (Gi): heart (slows HR). M3 (Gq): smooth muscle, glands.', pathways: 'Basal nucleus of Meynert \u2192 cortex (cognition/memory). Pedunculopontine nucleus \u2192 thalamus (arousal/REM sleep). Medial septum \u2192 hippocampus (memory). Motor neurons \u2192 NMJ (voluntary movement). Preganglionic autonomic neurons.', fn: 'Muscle contraction at NMJ, memory formation and retrieval, attention, arousal, REM sleep, autonomic function (parasympathetic: rest-and-digest), learning and cortical plasticity.', conditions: 'Alzheimer disease: loss of cholinergic neurons from nucleus basalis of Meynert. Myasthenia gravis: anti-nAChR antibodies at NMJ. Lambert-Eaton: anti-VGCC antibodies (presynaptic). Organophosphate poisoning: AChE inhibition \u2192 cholinergic crisis.', drugs: 'Donepezil, rivastigmine (AChE inhibitors for Alzheimer). Atropine (muscarinic antagonist). Pilocarpine (muscarinic agonist, glaucoma). Succinylcholine (depolarizing NMJ blocker). Neostigmine (AChE inhibitor for myasthenia). Nicotine (nAChR agonist). Botulinum toxin (blocks ACh release).', damage: 'ACh depletion causes memory loss, cognitive decline, and is the primary neurochemical deficit in Alzheimer disease; NMJ dysfunction causes muscle weakness.' },

                { id: 'gaba', name: 'GABA (\u03B3-Aminobutyric Acid)', x: 0.60, y: 0.25, w: 0.08, category: 'Amino Acid (Inhibitory)', synthesis: 'Glutamate \u2192 GABA (glutamic acid decarboxylase/GAD, requires vitamin B6/pyridoxal phosphate as cofactor). Degraded by GABA transaminase (GABA-T). Most abundant inhibitory NT in CNS (~40% of synapses).', receptors: 'GABA-A: ligand-gated Cl\u207B channel (fast inhibition). Has binding sites for benzodiazepines (\u03B1/\u03B3 subunit interface), barbiturates, ethanol, neurosteroids, propofol. GABA-B: Gi/Go-coupled GPCR (slow, prolonged inhibition). Baclofen target.', pathways: 'Ubiquitous inhibitory interneurons throughout cortex, hippocampus, basal ganglia, cerebellum (Purkinje cells), thalamus. Striatal medium spiny neurons (GABAergic output of basal ganglia). Reticular thalamic nucleus gates thalamic relay.', fn: 'Primary inhibitory neurotransmission, reduces neuronal excitability, prevents seizures, regulates muscle tone, anxiolysis, sleep induction, motor coordination, thalamic gating of sensory information.', conditions: 'Epilepsy (GABA/glutamate imbalance). Anxiety disorders (insufficient GABAergic tone). Huntington disease (loss of GABAergic MSNs in striatum). Hepatic encephalopathy (excess GABA-like substances). Status epilepticus. Stiff-person syndrome (anti-GAD antibodies).', drugs: 'Benzodiazepines (diazepam, lorazepam): positive allosteric modulators of GABA-A. Barbiturates (phenobarbital): prolong Cl\u207B channel opening. Vigabatrin (irreversible GABA-T inhibitor). Tiagabine (GABA reuptake inhibitor). Baclofen (GABA-B agonist, spasticity). Zolpidem (\u03B11-selective, sleep). Propofol, ethanol (GABA-A modulation).', damage: 'GABA deficiency leads to seizures, anxiety, and movement disorders; excessive GABAergic activity causes sedation, coma, and respiratory depression.' },

                { id: 'glutamate', name: 'Glutamate (Glu)', x: 0.45, y: 0.20, w: 0.08, category: 'Amino Acid (Excitatory)', synthesis: 'From glutamine (glutaminase in neurons), \u03B1-ketoglutarate (transamination), or recycled from synaptic cleft by astrocytes (glutamate-glutamine cycle). Most abundant excitatory NT in CNS (~90% of excitatory synapses).', receptors: 'Ionotropic: NMDA (Na\u207A/Ca\u00B2\u207A, voltage-dependent Mg\u00B2\u207A block, requires glycine co-agonist \u2014 critical for LTP/memory). AMPA (Na\u207A, fast excitation). Kainate (Na\u207A). Metabotropic: mGluR1\u20138 (Gq or Gi coupled, modulatory).', pathways: 'Virtually all excitatory projection neurons in cortex, hippocampus, thalamus, brainstem. Corticospinal, corticothalamic, thalamocortical, hippocampal trisynaptic circuit (perforant path \u2192 DG \u2192 CA3 \u2192 CA1). Cerebellar granule cells.', fn: 'Primary excitatory neurotransmission, learning and memory (LTP via NMDA receptors), synaptic plasticity, brain development, sensory processing, motor control, cognition.', conditions: 'Excitotoxicity: excessive glutamate \u2192 neuronal death (stroke, TBI, neurodegeneration). ALS: glutamate excitotoxicity (riluzole reduces). Epilepsy (glutamate/GABA imbalance). NMDA receptor encephalitis (anti-NMDAR antibodies). Hepatic encephalopathy.', drugs: 'Memantine (NMDA antagonist, moderate-severe Alzheimer). Riluzole (reduces glutamate release, ALS). Ketamine (NMDA antagonist, anesthesia, rapid-acting antidepressant). PCP (NMDA antagonist, psychosis). Lamotrigine (reduces glutamate release, epilepsy/bipolar). Topiramate (blocks AMPA/kainate).', damage: 'Excess glutamate causes excitotoxic neuronal death in stroke and neurodegeneration; NMDA dysfunction impairs memory formation and synaptic plasticity.' },

                { id: 'glycine', name: 'Glycine', x: 0.55, y: 0.70, w: 0.08, category: 'Amino Acid (Inhibitory)', synthesis: 'From serine (serine hydroxymethyltransferase) or dietary intake. Simplest amino acid. Dual role: inhibitory NT in spinal cord/brainstem, and obligatory co-agonist at NMDA receptors in brain.', receptors: 'Glycine receptors (GlyR): ligand-gated Cl\u207B channels, primarily in spinal cord and brainstem. Strychnine-sensitive. Also binds glycine site on NMDA receptor (strychnine-insensitive). GlyT1/GlyT2 transporters for reuptake.', pathways: 'Renshaw cell inhibition in spinal cord (recurrent inhibition of motor neurons). Brainstem auditory and vestibular nuclei. Retinal amacrine cells. NMDA receptor co-agonism throughout cortex.', fn: 'Inhibitory neurotransmission in spinal cord and brainstem, motor neuron regulation, pain modulation, NMDA receptor co-activation for synaptic plasticity, auditory/visual processing.', conditions: 'Hyperekplexia (startle disease): glycine receptor mutations. Glycine encephalopathy (nonketotic hyperglycinemia): neonatal seizures. Strychnine poisoning: GlyR antagonism \u2192 unopposed excitation \u2192 convulsions, opisthotonus.', drugs: 'Strychnine (GlyR antagonist, poison). D-serine and sarcosine (GlyT1 inhibitors, investigated for schizophrenia as NMDA enhancers). Glycine supplementation studied for schizophrenia negative symptoms.', damage: 'Glycine receptor dysfunction causes excessive startle reflexes, spasticity, and convulsions; as NMDA co-agonist, glycine modulation affects learning and memory.' },

                { id: 'histamine', name: 'Histamine', x: 0.35, y: 0.25, w: 0.08, category: 'Monoamine (Imidazole)', synthesis: 'Histidine \u2192 Histamine (histidine decarboxylase). In CNS: tuberomammillary nucleus (TMN) of posterior hypothalamus. Also in mast cells (immune), ECL cells of stomach (acid secretion). Degraded by histamine N-methyltransferase (HNMT) in brain.', receptors: 'H1: Gq, wakefulness, allergic response, smooth muscle contraction. H2: Gs, gastric acid secretion, cardiac contractility. H3: Gi/Go, presynaptic autoreceptor (CNS), regulates histamine/other NT release. H4: Gi, immune cells, inflammation.', pathways: 'TMN of posterior hypothalamus projects to entire cerebral cortex, thalamus, basal ganglia, hippocampus, amygdala, brainstem. Part of ascending arousal system. Active during wakefulness, silent during sleep.', fn: 'Wakefulness and arousal, circadian rhythm regulation, attention, learning, gastric acid secretion, immune and allergic responses, appetite regulation, thermoregulation.', conditions: 'Narcolepsy type 2 (partial histamine deficiency). Allergic responses (mast cell histamine release). Peptic ulcer disease (H2-mediated acid hypersecretion). Systemic mastocytosis. Scombroid fish poisoning (histamine toxicity).', drugs: 'H1 antihistamines: diphenhydramine, cetirizine (allergy). First-gen H1 blockers: sedating (cross BBB). H2 blockers: ranitidine, famotidine (acid reflux). H3 antagonists/inverse agonists: pitolisant (narcolepsy, promotes wakefulness). Betahistine (vertigo).', damage: 'Histamine deficiency impairs wakefulness and causes excessive sleepiness; excess release causes allergic inflammation, bronchoconstriction, and anaphylaxis.' },

                { id: 'endorphins', name: 'Endorphins (\u03B2-Endorphin)', x: 0.50, y: 0.15, w: 0.08, category: 'Opioid Peptide (Neuropeptide)', synthesis: 'Pro-opiomelanocortin (POMC) \u2192 cleaved into \u03B2-endorphin + ACTH + \u03B1-MSH. POMC expressed in arcuate nucleus of hypothalamus and NTS of brainstem. Also: met-/leu-enkephalin (from proenkephalin), dynorphins (from prodynorphin).', receptors: '\u03BC (mu, MOR): analgesia, euphoria, respiratory depression, constipation (primary opioid drug target). \u03B4 (delta, DOR): analgesia, mood. \u03BA (kappa, KOR): analgesia, dysphoria, diuresis. All Gi/Go-coupled, decrease cAMP, open K\u207A channels, close Ca\u00B2\u207A channels.', pathways: 'Descending pain modulation: PAG \u2192 RVM \u2192 dorsal horn (gate control). Arcuate nucleus projections to PAG, thalamus, amygdala, locus coeruleus. Enkephalin interneurons in dorsal horn. VTA reward circuits (disinhibit dopamine neurons).', fn: 'Endogenous pain modulation (analgesia), stress response, reward and euphoria (runner\u2019s high), immune regulation, mood elevation, appetite regulation, respiratory regulation.', conditions: 'Chronic pain syndromes (endorphin deficit). Opioid use disorder: exogenous opioids hijack endogenous system \u2192 tolerance, dependence, withdrawal. Congenital insensitivity to pain (rare). Stress-induced analgesia on the battlefield.', drugs: 'Morphine, fentanyl, oxycodone (\u03BC agonists, analgesia). Naloxone, naltrexone (\u03BC antagonists, overdose reversal/addiction treatment). Buprenorphine (\u03BC partial agonist, opioid use disorder). Methadone (full \u03BC agonist, maintenance therapy). Tramadol (\u03BC agonist + SNRI).', damage: 'Endorphin system disruption leads to chronic pain, mood disorders, and vulnerability to opioid addiction; excessive opioid receptor activation causes respiratory depression.' },

                { id: 'substance_p', name: 'Substance P', x: 0.65, y: 0.55, w: 0.08, category: 'Tachykinin (Neuropeptide)', synthesis: 'Encoded by TAC1 gene (preprotachykinin A). 11-amino acid peptide. Stored in large dense-core vesicles. Co-released with glutamate from C-fiber nociceptive neurons. Also found in gut enteric neurons and immune cells.', receptors: 'NK1 (neurokinin-1) receptor: Gq-coupled, primary target. NK2, NK3 receptors (lower affinity). NK1 receptors abundant in dorsal horn, brainstem emesis center, amygdala, hypothalamus, striatum.', pathways: 'C-fiber nociceptors \u2192 dorsal horn (laminae I and II) for pain transmission. Trigeminal system for head/face pain. Brainstem vomiting center. Striatum (mood/anxiety). Enteric nervous system (GI motility/inflammation).', fn: 'Pain transmission (especially slow, burning pain from C-fibers), neurogenic inflammation (vasodilation, plasma extravasation, mast cell degranulation), emesis, mood and stress regulation, GI motility.', conditions: 'Chronic pain and fibromyalgia (elevated CSF substance P). Migraine (trigeminovascular substance P release). Chemotherapy-induced nausea/vomiting. Inflammatory bowel disease. Depression and anxiety (elevated substance P).', drugs: 'Aprepitant (NK1 antagonist, antiemetic for chemotherapy-induced nausea). Capsaicin cream (depletes substance P from C-fibers, topical pain relief). NK1 antagonists investigated for depression and anxiety.', damage: 'Excess substance P amplifies pain perception, causes neurogenic inflammation, and triggers nausea; depletion impairs pain signaling and protective reflexes.' },

                { id: 'oxytocin', name: 'Oxytocin', x: 0.42, y: 0.10, w: 0.08, category: 'Peptide Hormone/Neurotransmitter', synthesis: '9-amino acid peptide synthesized in paraventricular nucleus (PVN) and supraoptic nucleus (SON) of hypothalamus. Transported via neurophysin I to posterior pituitary for systemic release. Also released centrally from dendrites and axon terminals.', receptors: 'Oxytocin receptor (OXTR): Gq-coupled GPCR. Expressed in uterus, mammary glands, brain (amygdala, hippocampus, hypothalamus, nucleus accumbens, brainstem). Receptor density varies with reproductive state and social experience.', pathways: 'PVN/SON \u2192 posterior pituitary (endocrine release \u2192 blood). PVN \u2192 amygdala, hippocampus, nucleus accumbens, brainstem, spinal cord (central neuromodulation). Dense projections to social brain network.', fn: 'Uterine contractions during labor, milk ejection (let-down reflex), maternal bonding, pair bonding, social trust and recognition, stress reduction, anxiolysis, wound healing, sexual arousal.', conditions: 'Oxytocin deficiency: difficult labor, poor lactation. Williams syndrome (excess social behavior, possibly related to OXT system). Autism spectrum: oxytocin studied as potential treatment for social deficits. Postpartum depression may involve OXT dysregulation.', drugs: 'Pitocin (synthetic oxytocin, labor induction/augmentation, postpartum hemorrhage). Carbetocin (long-acting oxytocin agonist). Intranasal oxytocin (research for autism, social anxiety, PTSD). Atosiban (oxytocin receptor antagonist, preterm labor).', damage: 'Oxytocin deficiency impairs social bonding, lactation, and labor progression; excess can cause uterine hyperstimulation and fetal distress during labor.' },

                { id: 'vasopressin', name: 'Vasopressin (ADH)', x: 0.58, y: 0.10, w: 0.08, category: 'Peptide Hormone/Neurotransmitter', synthesis: '9-amino acid peptide (differs from oxytocin by 2 amino acids). Synthesized in SON (primarily) and PVN of hypothalamus. Transported via neurophysin II to posterior pituitary. Release triggered by increased plasma osmolality (>285 mOsm) or decreased blood volume.', receptors: 'V1a: Gq, vascular smooth muscle vasoconstriction, hepatic glycogenolysis, platelet aggregation. V1b (V3): Gq, anterior pituitary ACTH release. V2: Gs, renal collecting duct (aquaporin-2 insertion for water reabsorption). Central V1a: social behavior.', pathways: 'SON/PVN \u2192 posterior pituitary (endocrine). PVN \u2192 brainstem autonomic centers. Central V1a projections to amygdala and septum (aggression, pair bonding in voles). Osmoreceptor feedback from OVLT and SFO (circumventricular organs).', fn: 'Water reabsorption in kidneys (antidiuretic effect), vasoconstriction, ACTH regulation (stress response), memory consolidation, social behavior (aggression, pair bonding), circadian rhythm, temperature regulation.', conditions: 'Diabetes insipidus: central (no ADH production) or nephrogenic (kidneys unresponsive to ADH) \u2192 polyuria/polydipsia. SIADH (excess ADH): hyponatremia, water retention. Causes: SCLC, CNS disease, drugs.', drugs: 'Desmopressin (V2 agonist: central DI, nocturnal enuresis, hemophilia A/vWD). Vasopressin/terlipressin (V1 agonist: variceal bleeding, vasodilatory shock). Conivaptan/tolvaptan (V2 antagonist, vaptans: SIADH, hyponatremia). Demeclocycline (induces nephrogenic DI for SIADH).', damage: 'ADH deficiency causes massive water loss and dehydration; excess causes dangerous hyponatremia with cerebral edema, seizures, and coma.' },

                { id: 'melatonin', name: 'Melatonin', x: 0.50, y: 0.05, w: 0.08, category: 'Indolamine (Tryptophan derivative)', synthesis: 'Tryptophan \u2192 Serotonin \u2192 N-acetylserotonin (AANAT, rate-limiting, activated by darkness) \u2192 Melatonin (HIOMT). Produced in pineal gland. Synthesis controlled by SCN \u2192 SCG \u2192 pineal pathway. Peaks at 2\u20134 AM, suppressed by light (especially blue, 460nm).', receptors: 'MT1: Gi, sleep onset (inhibits SCN neuronal firing, promotes sleepiness). MT2: Gi, circadian phase-shifting (advances or delays clock). Both expressed in SCN, retina, cerebral arteries, immune cells. MT3/NQO2: enzyme, detoxification.', pathways: 'Pineal gland \u2192 CSF and blood (endocrine hormone). Acts on SCN (master circadian clock) to reinforce day-night rhythm. Also acts on immune cells, GI tract, skin, reproductive organs. Retinal melatonin for local circadian regulation.', fn: 'Circadian rhythm regulation (sleep-wake cycle entrainment), sleep onset facilitation, seasonal reproductive timing (photoperiodism), antioxidant properties, immune modulation, oncostatic effects, body temperature lowering.', conditions: 'Circadian rhythm disorders: delayed sleep phase, jet lag, shift-work disorder, non-24-hour sleep-wake disorder (blind individuals). Age-related melatonin decline \u2192 insomnia in elderly. Pineal tumors: altered melatonin production. Seasonal affective disorder.', drugs: 'Exogenous melatonin (OTC sleep aid, jet lag, circadian disorders). Ramelteon (MT1/MT2 agonist, insomnia). Tasimelteon (MT1/MT2 agonist, non-24-hour disorder in blind). Agomelatine (MT1/MT2 agonist + 5-HT2C antagonist, depression). Suvorexant (orexin antagonist, different mechanism).', damage: 'Melatonin disruption impairs sleep quality, circadian rhythms, and may increase cancer risk; chronic circadian misalignment is associated with metabolic and cardiovascular disease.' },

                { id: 'nitric_oxide', name: 'Nitric Oxide (NO)', x: 0.70, y: 0.35, w: 0.08, category: 'Gaseous Neurotransmitter', synthesis: 'L-arginine \u2192 L-citrulline + NO (nitric oxide synthase: nNOS in neurons, eNOS in endothelium, iNOS in immune cells). Not stored in vesicles \u2014 synthesized on demand, diffuses freely across membranes. Half-life: seconds.', receptors: 'Not a classical receptor. Activates soluble guanylate cyclase (sGC) \u2192 increases cGMP \u2192 smooth muscle relaxation, vasodilation. Also: S-nitrosylation of proteins (post-translational modification). Acts as retrograde messenger at synapses.', pathways: 'Retrograde signaling at glutamatergic synapses (postsynaptic NMDA Ca\u00B2\u207A influx \u2192 nNOS activation \u2192 NO diffuses to presynaptic terminal \u2192 enhances glutamate release). Endothelial NO \u2192 vascular smooth muscle. Nitrergic neurons in enteric NS, penile cavernosal nerves.', fn: 'Vasodilation (blood pressure regulation), retrograde synaptic signaling (LTP), immune defense (macrophage killing of pathogens), GI motility (non-adrenergic non-cholinergic relaxation), penile erection, platelet aggregation inhibition.', conditions: 'Endothelial dysfunction: reduced NO \u2192 hypertension, atherosclerosis. Erectile dysfunction (insufficient cavernosal NO). Septic shock: iNOS overproduction \u2192 massive vasodilation. Migraine: excessive NO \u2192 cerebral vasodilation. Excitotoxicity: excess nNOS contributes to neuronal damage.', drugs: 'Nitroglycerin, isosorbide (NO donors, angina). Sildenafil/tadalafil (PDE5 inhibitors: prevent cGMP breakdown, prolong NO vasodilatory effect, erectile dysfunction and pulmonary hypertension). L-NAME (NOS inhibitor, research). Inhaled NO (pulmonary hypertension in neonates).', damage: 'NO deficiency causes hypertension and impaired synaptic plasticity; excess NO produces oxidative stress, contributes to neurodegeneration, and causes pathological vasodilation in septic shock.' },

                { id: 'anandamide', name: 'Anandamide (AEA)', x: 0.30, y: 0.50, w: 0.08, category: 'Endocannabinoid (Lipid)', synthesis: 'N-arachidonoylphosphatidylethanolamine (NAPE) \u2192 Anandamide (NAPE-PLD). Also 2-AG: diacylglycerol \u2192 2-arachidonoylglycerol (DAGL). Synthesized on demand from membrane phospholipids (retrograde messengers). Degraded by FAAH (anandamide) and MAGL (2-AG).', receptors: 'CB1: Gi/Go, most abundant GPCR in brain (cortex, basal ganglia, hippocampus, cerebellum). Presynaptic: inhibits neurotransmitter release (both glutamate and GABA). CB2: Gi/Go, primarily immune cells, microglia, some neurons. Also TRPV1, PPARs.', pathways: 'Retrograde signaling: postsynaptic depolarization/Ca\u00B2\u207A \u2192 endocannabinoid synthesis \u2192 diffuses to presynaptic CB1 \u2192 inhibits NT release (depolarization-induced suppression of inhibition/excitation: DSI/DSE). Widespread modulatory system.', fn: 'Synaptic plasticity modulation (fine-tuning excitation/inhibition balance), pain modulation, appetite stimulation, mood regulation, neuroprotection, memory extinction (forgetting), nausea suppression, immune regulation.', conditions: 'Chronic pain (endocannabinoid deficiency hypothesis). Obesity (overactive endocannabinoid tone). PTSD (impaired fear extinction, CB1 link). Multiple sclerosis spasticity. Epilepsy (CBD-responsive: Dravet, Lennox-Gastaut syndromes). Cannabinoid hyperemesis syndrome.', drugs: 'THC (CB1/CB2 partial agonist, \u0394\u2079-tetrahydrocannabinol from cannabis). CBD (cannabidiol: allosteric modulator, anticonvulsant, Epidiolex for epilepsy). Dronabinol/nabilone (synthetic THC, antiemetic/appetite). Rimonabant (CB1 antagonist, withdrawn: depression risk). FAAH inhibitors (research).', damage: 'Endocannabinoid deficiency may contribute to chronic pain, migraine, and irritable bowel; excessive CB1 activation impairs short-term memory and motivation.' },

                { id: 'atp_adenosine', name: 'ATP / Adenosine', x: 0.65, y: 0.45, w: 0.08, category: 'Purinergic (Purine)', synthesis: 'ATP: synthesized in mitochondria (oxidative phosphorylation) and cytoplasm (glycolysis). Stored in synaptic vesicles, often co-released with other NTs. Adenosine: produced from ATP degradation by ectonucleotidases (ATP \u2192 ADP \u2192 AMP \u2192 adenosine). Also from intracellular SAH hydrolysis.', receptors: 'P2X (ATP): ligand-gated cation channels (P2X1-7). P2X3: pain signaling. P2X7: microglial activation, inflammation. P2Y (ATP/ADP/UTP): GPCRs (P2Y1,2,4,6,11,12,13,14). P2Y12: platelet aggregation. Adenosine: A1 (Gi, inhibitory), A2A (Gs, excitatory), A2B (Gs), A3 (Gi).', pathways: 'Purinergic co-transmission at sympathetic, parasympathetic, and sensory nerve terminals. Adenosine: widespread inhibitory neuromodulation, especially active during prolonged wakefulness (homeostatic sleep drive). Basal ganglia A2A-D2 interaction. Glial purinergic signaling.', fn: 'Fast excitatory synaptic transmission (P2X), pain signaling, platelet aggregation, immune cell activation, sleep pressure (adenosine accumulation during wakefulness), vasodilation, neuroprotection, cardioprotection, modulation of other neurotransmitter systems.', conditions: 'Chronic pain (P2X3 overexpression). Thrombosis (P2Y12-mediated platelet activation). Gout (purine metabolism disorder). Migraine (purinergic signaling). Insomnia (adenosine dysregulation). Parkinson disease (A2A receptors on striatopallidal neurons modulate motor function).', drugs: 'Caffeine (A1/A2A adenosine receptor antagonist: promotes wakefulness by blocking sleep-promoting adenosine). Clopidogrel (P2Y12 antagonist, antiplatelet). Adenosine IV (supraventricular tachycardia, diagnostic). Istradefylline (A2A antagonist, Parkinson adjunct). Dipyridamole (inhibits adenosine reuptake). Regadenoson (A2A agonist, cardiac stress test).', damage: 'Excessive extracellular ATP triggers neuroinflammation and pain; adenosine accumulation causes drowsiness but is neuroprotective during ischemia; purinergic dysregulation contributes to chronic pain and neurodegeneration.' },

                { id: 'neuropeptide_y', name: 'Neuropeptide Y (NPY)', x: 0.35, y: 0.15, w: 0.08, category: 'Neuropeptide (Pancreatic polypeptide family)', synthesis: '36-amino acid peptide, one of most abundant neuropeptides in brain. Prepro-NPY \u2192 pro-NPY \u2192 NPY (signal peptidase + carboxypeptidase). Stored in large dense-core vesicles, released during sustained high-frequency firing. Co-released with NE in sympathetic neurons.', receptors: 'Y1: Gi, anxiolysis, vasoconstriction, appetite. Y2: Gi, presynaptic autoreceptor (inhibits NPY and NE release), anxiolysis. Y4: Gi, GI satiety. Y5: Gi, appetite stimulation (feeding). Y6: pseudogene in humans. All GPCRs.', pathways: 'Arcuate nucleus \u2192 PVN (appetite/energy homeostasis, co-expressed with AgRP). Amygdala and hippocampus (stress resilience, anxiolysis). Sympathetic postganglionic neurons (co-released with NE for vasoconstriction). Cortical interneurons. Brainstem (autonomic regulation).', fn: 'Appetite stimulation (most potent orexigenic peptide), energy homeostasis, anxiolysis, stress resilience, vasoconstriction (potentiates NE), circadian rhythms, seizure modulation (anticonvulsant), bone formation, alcohol consumption.', conditions: 'Obesity (NPY overexpression in arcuate \u2192 hyperphagia). Anorexia nervosa (paradoxically elevated NPY). Anxiety and PTSD (low NPY \u2192 vulnerability; high NPY \u2192 resilience). Epilepsy (NPY is endogenous anticonvulsant). Hypertension (vascular NPY/NE co-release).', drugs: 'No FDA-approved NPY drugs yet. NPY Y1/Y5 receptor antagonists: investigated for obesity. NPY Y2 agonists: investigated for epilepsy and anxiety. NPY infusion: research for stress resilience in military populations. Gene therapy: NPY overexpression vectors for epilepsy (preclinical).', damage: 'NPY excess drives overeating and obesity; NPY deficiency reduces stress resilience, increases anxiety, and may lower seizure threshold.' },

                { id: 'epinephrine', name: 'Epinephrine (Adrenaline)', x: 0.70, y: 0.20, w: 0.08, category: 'Catecholamine (Monoamine)', synthesis: 'Norepinephrine \u2192 Epinephrine (PNMT, phenylethanolamine N-methyltransferase, requires cortisol induction). Primarily from adrenal medulla chromaffin cells (80% epinephrine, 20% NE). Minor CNS presence in a few medullary neuron clusters.', receptors: 'Same adrenergic receptors as NE but higher \u03B22 affinity: \u03B11 (vasoconstriction), \u03B12 (feedback inhibition), \u03B21 (cardiac stimulation), \u03B22 (bronchodilation, vasodilation in skeletal muscle, glycogenolysis, relaxes uterine smooth muscle), \u03B23 (lipolysis).', pathways: 'Primarily endocrine (adrenal medulla \u2192 blood \u2192 systemic effects). Small CNS clusters in lateral tegmental area and medulla project to hypothalamus, thalamus, spinal cord. Adrenal medulla innervated by preganglionic sympathetic splanchnic nerves.', fn: 'Acute stress response (fight-or-flight hormone), increases heart rate and contractility, bronchodilation, increases blood glucose (glycogenolysis + gluconeogenesis), redirects blood flow to skeletal muscle, pupil dilation, enhances mental alertness.', conditions: 'Pheochromocytoma: catecholamine-secreting adrenal tumor (episodic HTN, headache, sweating, palpitations). Anaphylaxis: systemic allergic reaction requiring epinephrine. Cardiac arrest: epinephrine in ACLS protocol. Addison disease: decreased catecholamine response.', drugs: 'Epinephrine (EpiPen for anaphylaxis, ACLS, local anesthetic adjuvant to prolong duration via vasoconstriction). Racemic epinephrine (nebulized for croup). Isoproterenol (\u03B2 agonist). Albuterol (\u03B22 agonist, asthma). Ephedrine (indirect sympathomimetic).', damage: 'Epinephrine excess from pheochromocytoma causes hypertensive crises and cardiomyopathy; it is the critical rescue drug for anaphylaxis and cardiac arrest.' }

              ]

            }

,

            neuron: {

              name: '\u26A1 Action Potential', desc: 'Watch a neuron fire \u2014 ion channels, depolarization, and signal propagation',

              isNeuron: true,

              regions: [

                { id: 'dendrite', name: 'Dendrites', x: 0.08, y: 0.45, w: 0.08, fn: 'Tree-like branching extensions that receive signals from other neurons via synapses. Contain ligand-gated ion channels. Dendritic spines increase surface area. Graded potentials sum at the axon hillock.', conditions: 'Dendritic pruning abnormalities in autism/schizophrenia. Atrophy in chronic stress. Fragile X: excess immature spines.', damage: 'Loss of synaptic input, reduced signal integration, impaired learning.' },

                { id: 'soma', name: 'Cell Body (Soma)', x: 0.22, y: 0.45, w: 0.10, fn: 'Contains nucleus with DNA, rough ER (Nissl bodies), mitochondria. Integrates incoming signals. Produces neurotransmitters and ion channel proteins.', conditions: 'Chromatolysis after axonal injury. Lewy bodies in Parkinson. Nuclear inclusions in Huntington.', damage: 'Cell death. Loss of neuron and all connections. Cannot regenerate in most CNS regions.' },

                { id: 'axon_hillock', name: 'Axon Hillock', x: 0.32, y: 0.45, w: 0.06, fn: 'Transition zone with highest density of voltage-gated Na\u207A channels. Lowest threshold for action potential initiation (\u221255mV). All-or-nothing decision point.', conditions: 'Epilepsy: abnormally low thresholds. Na\u207A channelopathies alter firing threshold.', damage: 'Inability to generate action potentials. Complete loss of signal transmission.' },

                { id: 'myelin', name: 'Myelin Sheath', x: 0.55, y: 0.45, w: 0.08, fn: 'Insulating lipid wrapping by oligodendrocytes (CNS) or Schwann cells (PNS). Increases conduction velocity 10\u2013100x via saltatory conduction. ~80% lipid, 20% protein.', conditions: 'Multiple sclerosis: autoimmune CNS demyelination. Guillain-Barr\u00E9: PNS demyelination. Charcot-Marie-Tooth.', damage: 'Slowed/blocked conduction, weakness, numbness, fatigue.' },

                { id: 'node_ranvier', name: 'Nodes of Ranvier', x: 0.70, y: 0.45, w: 0.06, fn: '1\u20132\u03BCm gaps between myelin with ~1000 Na\u207A channels/\u03BCm\u00B2. Action potential jumps node-to-node (saltatory conduction) at up to 120 m/s.', conditions: 'Anti-ganglioside antibodies target nodal proteins in Guillain-Barr\u00E9. Paranodal disruption slows conduction.', damage: 'Loss of saltatory conduction. Dramatic velocity drop. Eventual conduction block.' },

                { id: 'axon_terminal', name: 'Axon Terminal', x: 0.92, y: 0.45, w: 0.06, fn: 'Synaptic boutons with vesicles of neurotransmitter. Ca\u00B2\u207A influx triggers SNARE-mediated exocytosis into synaptic cleft.', conditions: 'Botulism: cleaves SNAREs, blocks ACh release. Lambert-Eaton: anti-VGCC antibodies reduce Ca\u00B2\u207A entry.', damage: 'No NT release. Complete failure of synaptic transmission.' }

              ]

            },
            sleepStages: {

              name: '\u{1F4A4} Sleep Stages', desc: 'Hypnogram visualization \u2014 sleep architecture across a full night',

              isSleep: true,

              regions: [

                { id: 'awake', name: 'Wakefulness', x: 0.12, y: 0.12, w: 0.08, fn: 'Full consciousness with active cortical processing. EEG shows beta waves (13\u201330 Hz) during alertness and alpha waves (8\u201313 Hz) during relaxed wakefulness with eyes closed. Ascending reticular activating system (ARAS) in brainstem maintains arousal.', conditions: 'Insomnia: difficulty initiating or maintaining sleep. Hyperarousal model: elevated cortisol, increased beta activity. Fatal familial insomnia: prion disease destroying thalamus, progressive total insomnia leading to death.', damage: 'Chronic sleep deprivation impairs immune function, glucose metabolism, memory consolidation, and emotional regulation. 11 days is the longest recorded voluntary wakefulness.' },

                { id: 'n1_stage', name: 'Stage N1 (Light Sleep)', x: 0.30, y: 0.28, w: 0.08, fn: 'Transition from wakefulness to sleep, lasting 1\u20135 minutes per cycle. EEG shifts from alpha to theta waves (4\u20138 Hz). Slow rolling eye movements present. Hypnic jerks (myoclonic twitches) are common. Vertex sharp waves appear. Muscle tone decreases but is still present. Easily awakened \u2014 may deny having been asleep.', conditions: 'Narcolepsy type 1: abnormally rapid entry into REM from wakefulness (SOREMPs) due to orexin/hypocretin deficiency. Sleep-onset hallucinations (hypnagogic) occur during N1 transitions.', damage: 'Disrupted N1 transitions cause sleep onset insomnia, excessive hypnic jerks, and fragmented sleep architecture.' },

                { id: 'n2_stage', name: 'Stage N2 (Core Sleep)', x: 0.50, y: 0.44, w: 0.08, fn: 'Comprises 45\u201355% of total sleep time. Defined by two signature EEG features: sleep spindles (11\u201316 Hz bursts from thalamic reticular nucleus, lasting 0.5\u20131.5s) and K-complexes (large biphasic waves, largest EEG events). Body temperature drops, heart rate slows. Spindles are critical for memory consolidation \u2014 they gate information transfer from hippocampus to neocortex.', conditions: 'Reduced sleep spindles found in schizophrenia, intellectual disability, and aging. K-complex absence may indicate cortical dysfunction. Bruxism (teeth grinding) peaks in N2.', damage: 'Loss of N2 sleep impairs procedural memory consolidation, motor learning, and sensory gating. Sleep spindle deficits correlate with cognitive decline.' },

                { id: 'n3_sws', name: 'Stage N3 (Deep/SWS)', x: 0.70, y: 0.60, w: 0.08, fn: 'Slow-wave sleep (SWS): deepest sleep stage with high-amplitude delta waves (0.5\u20134 Hz, >75\u00B5V). Growth hormone peaks during first SWS episode. Glymphatic system maximally active \u2014 clears metabolic waste (amyloid-\u03B2) from brain. Declarative memory consolidation occurs. Parasomnias most likely: sleepwalking, night terrors, bedwetting. Very difficult to awaken; sleep inertia if woken.', conditions: 'SWS decreases with aging (near-absent in elderly). Reduced SWS linked to Alzheimer disease amyloid accumulation. Fibromyalgia: alpha-delta sleep (alpha waves intrude into delta). Night terrors and sleepwalking are NREM parasomnias occurring from N3.', damage: 'SWS deprivation causes impaired glucose tolerance, reduced growth hormone, weakened immune function, and accelerated amyloid-\u03B2 accumulation.' },

                { id: 'rem_stage', name: 'REM Sleep', x: 0.88, y: 0.28, w: 0.08, fn: 'Rapid Eye Movement sleep: vivid dreaming, emotional memory processing, and synaptic homeostasis. EEG resembles wakefulness (low-voltage, mixed frequency \u2014 "paradoxical sleep"). Complete skeletal muscle atonia except diaphragm and extraocular muscles. REM periods lengthen across the night (10 min \u2192 60 min). Pontine cholinergic neurons (LDT/PPT) drive REM; locus coeruleus and raphe nuclei are silent. PGO waves (ponto-geniculo-occipital) trigger eye movements.', conditions: 'REM behavior disorder (RBD): loss of atonia \u2192 acting out dreams, strong predictor of synucleinopathies (Parkinson, Lewy body dementia). Narcolepsy: SOREMPs, cataplexy (REM atonia intruding into wakefulness). PTSD: REM fragmentation, nightmares. Obstructive sleep apnea worsens in REM (hypotonia of upper airway).', damage: 'REM deprivation impairs emotional regulation, creative problem-solving, and procedural memory. REM rebound occurs with increased intensity and duration after deprivation.' }

              ]

            },

            eegWaves: {

              name: '\u{1F4C8} EEG Waves', desc: 'Real-time brain wave patterns \u2014 frequency bands and clinical significance',

              isEEG: true,

              regions: [

                { id: 'delta_wave', name: 'Delta Waves (0.5\u20134 Hz)', x: 0.50, y: 0.12, w: 0.10, fn: 'Highest amplitude, slowest frequency. Dominant during Stage N3 deep sleep (slow-wave sleep). Generated by thalamocortical circuits with cortical UP/DOWN state oscillations. Essential for restorative sleep, growth hormone release, and glymphatic clearance of metabolic waste. Amplitude >75\u00B5V defines slow-wave sleep on polysomnography.', conditions: 'Polymorphic delta activity (PDA): focal brain lesion (tumor, stroke). Intermittent rhythmic delta activity (IRDA): frontal (FIRDA) suggests metabolic/toxic encephalopathy; occipital (OIRDA) suggests childhood epilepsy. Excessive delta in wakefulness indicates severe encephalopathy. Temporal delta in herpes encephalitis.', damage: 'Loss of delta activity indicates severe cortical or thalamocortical dysfunction; delta slowing during wakefulness is a marker of brain injury severity.' },

                { id: 'theta_wave', name: 'Theta Waves (4\u20138 Hz)', x: 0.50, y: 0.30, w: 0.10, fn: 'Prominent during Stage N1 sleep, drowsiness, meditation, and hippocampal memory processing. Hippocampal theta rhythm (5\u20138 Hz) is critical for spatial navigation and episodic memory encoding. Generated by medial septum cholinergic/GABAergic input to hippocampus. Frontal midline theta increases during focused cognitive tasks (working memory, error monitoring).', conditions: 'Excessive theta in wakefulness: mild encephalopathy, drowsiness, medication effect. Temporal intermittent rhythmic theta activity (TIRTA): hippocampal pathology, mesial temporal sclerosis. ADHD shows elevated theta/beta ratio. Theta burst stimulation (TBS) used in therapeutic TMS protocols for depression.', damage: 'Theta dysregulation impairs working memory, spatial navigation, and memory consolidation; excess waking theta indicates diffuse cortical slowing.' },

                { id: 'alpha_wave', name: 'Alpha Waves (8\u201313 Hz)', x: 0.50, y: 0.50, w: 0.10, fn: 'Dominant rhythm of relaxed wakefulness with eyes closed. Best recorded over posterior (occipital) regions. Attenuates with eye opening or mental effort (alpha blocking/desynchronization). Generated by thalamocortical relay neurons in a partially disfacilitated state. Mu rhythm (8\u201313 Hz over motor cortex) is the sensorimotor alpha equivalent, suppressed by movement or movement observation. Peak alpha frequency correlates with cognitive processing speed.', conditions: 'Alpha coma: continuous unreactive alpha activity in comatose patient (brainstem lesion or cardiopulmonary arrest) \u2014 poor prognosis. Reduced posterior alpha in Alzheimer disease (shifts to theta). Alpha-delta sleep: alpha intrusion into delta waves in fibromyalgia. Breach rhythm: enhanced alpha/beta near skull defect (post-surgical).', damage: 'Absent alpha indicates severe posterior cortical or thalamocortical dysfunction; asymmetric alpha may indicate structural lesion on the side with lower amplitude (Bancaud phenomenon).' },

                { id: 'beta_wave', name: 'Beta Waves (13\u201330 Hz)', x: 0.50, y: 0.70, w: 0.10, fn: 'Low amplitude, high frequency. Dominant during active thinking, problem-solving, and alert concentration. Most prominent over frontal and central regions. Sub-bands: low beta (13\u201316 Hz, relaxed focus), mid beta (16\u201320 Hz, active cognition), high beta (20\u201330 Hz, anxiety, complex processing). Sensorimotor beta (mu-beta) suppresses during movement preparation and execution.', conditions: 'Excess beta: anxiety disorders, medication effect (benzodiazepines dramatically enhance beta activity, especially frontal). Beta asymmetry may indicate structural lesion. Drug-induced beta: barbiturates, benzodiazepines cause diffuse beta enhancement. Reduced beta in frontal dementia and severe depression (hypofrontality).', damage: 'Beta abnormalities reflect arousal dysregulation; excessive frontal beta correlates with anxiety and insomnia; absent beta with severe cortical depression.' },

                { id: 'gamma_wave', name: 'Gamma Waves (30\u2013100 Hz)', x: 0.50, y: 0.88, w: 0.10, fn: 'Fastest brain waves, lowest amplitude. Associated with higher cognitive functions: consciousness, cross-modal sensory binding, selective attention, working memory, and perceptual integration. Generated by fast-spiking parvalbumin-positive GABAergic interneurons creating synchronized inhibition windows. The "40 Hz gamma" (35\u201345 Hz) is linked to conscious perception and the binding problem (how the brain unifies sensory features into coherent percepts).', conditions: 'Reduced gamma in schizophrenia (auditory steady-state response deficit at 40 Hz) \u2014 reflects interneuron dysfunction. Alzheimer disease: reduced gamma power; 40 Hz light/sound stimulation being researched as therapy (gamma entrainment). Epileptic high-frequency oscillations (HFOs, 80\u2013500 Hz) localize seizure onset zones.', damage: 'Gamma deficits impair perceptual binding, attention, and conscious awareness; pathological gamma (HFOs) indicates epileptogenic cortex.' }

              ]

            },

            crossLateral: {

              name: '\uD83D\uDD00 Cross-Lateralization', desc: 'How each hemisphere controls the opposite side of the body',

              isCrossLateral: true,

              regions: [

                { id: 'motor_decuss', name: 'Motor Decussation (Pyramids)', x: 0.50, y: 0.82, w: 0.08, fn: 'The corticospinal (pyramidal) tract crosses at the medullary pyramids. ~85\u201390% of fibers cross (lateral corticospinal tract) to control contralateral limb movement. ~10\u201315% remain ipsilateral (anterior corticospinal tract, controlling proximal/axial muscles). This crossing is why a left hemisphere stroke causes right-sided weakness (contralateral hemiparesis).', conditions: 'Medullary lesion at pyramids: contralateral hemiparesis below the lesion. Brown-S\u00E9quard syndrome (hemisection of spinal cord): ipsilateral motor loss + contralateral pain/temp loss. Wallenberg syndrome: ipsilateral face + contralateral body deficits.', damage: 'Unilateral pyramidal lesion produces contralateral upper motor neuron signs: weakness, spasticity, hyperreflexia, Babinski sign. Bilateral lesion causes quadriplegia.' },

                { id: 'sensory_decuss', name: 'Sensory Decussation (Medial Lemniscus)', x: 0.50, y: 0.72, w: 0.08, fn: 'The dorsal column\u2013medial lemniscus (DCML) pathway carries fine touch, proprioception, and vibration. First-order neurons ascend ipsilaterally in the dorsal columns to the gracile/cuneate nuclei of the medulla. Second-order neurons cross as internal arcuate fibers forming the medial lemniscus, then ascend to the contralateral thalamus (VPL nucleus). This means the left somatosensory cortex processes right-body sensation.', conditions: 'Posterior cord syndrome: bilateral loss of proprioception and fine touch (dorsal column damage). Tabes dorsalis (neurosyphilis): dorsal column degeneration \u2192 sensory ataxia, Romberg sign. Vitamin B12 deficiency: subacute combined degeneration (dorsal columns + corticospinal tracts).', damage: 'Medullary lesion at sensory decussation causes contralateral loss of fine touch and proprioception. Cortical lesion causes contralateral sensory loss with cortical signs (astereognosis, agraphesthesia).' },

                { id: 'optic_chiasm_cross', name: 'Optic Chiasm (Visual Crossing)', x: 0.50, y: 0.52, w: 0.08, fn: 'Partial decussation of visual signals: nasal retinal fibers (receiving temporal visual field) cross to the contralateral optic tract. Temporal retinal fibers (receiving nasal visual field) remain ipsilateral. Result: each occipital lobe processes the contralateral visual field. Left occipital cortex sees the right visual field, and vice versa. This partial crossing enables binocular vision and depth perception.', conditions: 'Pituitary adenoma compressing chiasm from below: bitemporal hemianopia (loss of both temporal fields). Craniopharyngioma compressing from above: variable field cuts. Optic tract lesion: contralateral homonymous hemianopia (both eyes lose same visual field). Optic neuritis (MS): unilateral vision loss with afferent pupillary defect.', damage: 'Chiasm compression causes bitemporal hemianopia. Post-chiasm lesions cause homonymous defects. Complete optic nerve lesion causes monocular blindness.' },

                { id: 'corpus_callosum_cross', name: 'Corpus Callosum', x: 0.50, y: 0.30, w: 0.10, fn: 'Largest white matter commissure (~200 million axons) connecting homologous regions of left and right cortex. Enables interhemispheric communication: transfers sensory, motor, and cognitive information between hemispheres. Anterior portion (genu): prefrontal connections. Body: motor/somatosensory. Splenium (posterior): visual/parietal connections. Develops fully by age 10\u201312; continues myelination through adolescence.', conditions: 'Agenesis of corpus callosum: can be asymptomatic or cause disconnect syndromes. Split-brain surgery (callosotomy for epilepsy): each hemisphere operates independently \u2014 left hand does not know what right hand does. Marchiafava-Bignami disease (alcoholism): callosal demyelination. MS frequently affects callosal fibers (Dawson fingers on MRI).', damage: 'Callosal lesions cause disconnection syndromes: alien hand, ideomotor apraxia of left hand, left hemialexia (cannot read words in left visual field), tactile anomia of left hand.' },

                { id: 'language_lateral', name: 'Language Lateralization', x: 0.28, y: 0.35, w: 0.08, fn: 'Language is strongly lateralized to the left hemisphere in ~95% of right-handers and ~70% of left-handers. Broca\u2019s area (left inferior frontal gyrus, BA 44/45): speech production and grammar. Wernicke\u2019s area (left superior temporal gyrus, BA 22): speech comprehension. Connected by the arcuate fasciculus. Right hemisphere contributes prosody (emotional tone), pragmatics, humor, and metaphor interpretation.', conditions: 'Broca\u2019s aphasia: non-fluent, effortful speech with preserved comprehension. Wernicke\u2019s aphasia: fluent but meaningless speech (word salad) with impaired comprehension. Conduction aphasia: arcuate fasciculus lesion \u2192 intact fluency and comprehension but poor repetition. Global aphasia: massive left hemisphere stroke destroying both areas.', damage: 'Left hemisphere damage in language-dominant individuals causes aphasia. Right hemisphere damage causes aprosodia (flat emotional speech), difficulty with sarcasm, metaphor, and social pragmatics.' },

                { id: 'handedness_lat', name: 'Handedness & Motor Dominance', x: 0.72, y: 0.35, w: 0.08, fn: 'Hand preference is determined primarily by contralateral motor cortex specialization. Left hemisphere motor cortex controls the right hand (dominant in ~90% of humans). The dominant hemisphere shows larger cortical representation for the preferred hand (expanded motor homunculus). Handedness correlates with but does not perfectly predict language lateralization. Mixed handedness (ambidexterity) is associated with subtle differences in interhemispheric connectivity.', conditions: 'Forced handedness change: historically attempted, now recognized as harmful. Pathological left-handedness: early left-hemisphere damage causing shift to left-hand dominance. Mirror writing (Leonardo da Vinci): more natural for left-handers, facilitated by right-hemisphere spatial processing.', damage: 'Lesion to dominant motor cortex causes contralateral hand weakness/clumsiness. Recovery depends on plasticity and interhemispheric compensation via corpus callosum.' },

                { id: 'split_brain', name: 'Split-Brain Phenomenon', x: 0.50, y: 0.18, w: 0.10, fn: 'When the corpus callosum is severed (callosotomy, performed for intractable epilepsy), each hemisphere operates independently. In split-brain patients: objects presented to the right visual field (left hemisphere) can be named verbally, but objects in the left visual field (right hemisphere) cannot be named but can be identified by touch with the left hand. Demonstrates the modular nature of hemispheric specialization and that consciousness may have dual aspects.', conditions: 'Split-brain syndrome: cannot verbally name objects in left visual field, left-hand tactile anomia, inability to match objects across visual fields. Alien hand syndrome: one hand acts contrary to conscious intention (usually left hand). These effects are most dramatic in lab testing \u2014 daily life compensation is remarkably good.', damage: 'Callosotomy eliminates interhemispheric seizure spread (therapeutic) but creates disconnection: each hemisphere has independent awareness, emotional responses, and decision-making.' }

              ]

            }

          };



          var viewKey = d.view || 'lateral';

          var currentView = VIEWS[viewKey];

          var regions = currentView.regions;

          var searchTerm = (d.search || '').toLowerCase();

          var filtered = searchTerm ? regions.filter(function (r) { return r.name.toLowerCase().indexOf(searchTerm) >= 0 || r.fn.toLowerCase().indexOf(searchTerm) >= 0 || (r.conditions || '').toLowerCase().indexOf(searchTerm) >= 0; }) : regions;

          var sel = d.selectedRegion ? regions.find(function (r) { return r.id === d.selectedRegion; }) : null;



          // Quiz logic — options memoized in state to prevent re-shuffle on render

          var allRegions = []; Object.values(VIEWS).forEach(function (v) { v.regions.forEach(function (r) { if (!allRegions.find(function (a) { return a.id === r.id; })) allRegions.push(r); }); });

          var quizPool = allRegions.filter(function (r) { return r.damage; });

          var quizQ = d.quizMode && quizPool.length > 0 ? quizPool[d.quizIdx % quizPool.length] : null;

          var brainQuizOpts = d._brainQuizOpts || [];

          if (quizQ && d._brainQuizOptsFor !== d.quizIdx) {

            var wrong = quizPool.filter(function (r) { return r.id !== quizQ.id; }).sort(function () { return Math.random() - 0.5; }).slice(0, 3);

            brainQuizOpts = wrong.concat([quizQ]).sort(function () { return Math.random() - 0.5; });

            upd('_brainQuizOpts', brainQuizOpts);

            upd('_brainQuizOptsFor', d.quizIdx);

          }



          // ── Neurotransmitter Simulation System ──

          var SIM_SCENARIOS = [

            { id: 'normal', name: 'Normal', icon: '\u2705', color: '#22c55e', desc: 'Baseline neurotransmission: neurotransmitters are released, bind receptors, and are cleared by reuptake and enzymatic degradation.', reuptakeBlocked: false, enzymeBlocked: false, particleMult: 1, receptorBoost: null, receptorDim: null, vesicleRate: 1 },

            { id: 'ssri', name: 'SSRI', icon: '\uD83D\uDC8A', color: '#3b82f6', desc: 'Selective Serotonin Reuptake Inhibitor (e.g., Fluoxetine/Prozac): blocks the serotonin transporter (SERT), increasing 5-HT concentration in the synaptic cleft. Used for depression and anxiety.', reuptakeBlocked: true, enzymeBlocked: false, particleMult: 2.5, receptorBoost: null, receptorDim: null, vesicleRate: 1 },

            { id: 'snri', name: 'SNRI', icon: '\uD83D\uDC8A', color: '#8b5cf6', desc: 'Serotonin-Norepinephrine Reuptake Inhibitor (e.g., Venlafaxine/Effexor): blocks both SERT and NET, increasing serotonin AND norepinephrine in the cleft. Used for depression, anxiety, and chronic pain.', reuptakeBlocked: true, enzymeBlocked: false, particleMult: 2.8, receptorBoost: null, receptorDim: null, vesicleRate: 1.2 },

            { id: 'benzo', name: 'Benzodiazepine', icon: '\uD83D\uDC8A', color: '#14b8a6', desc: 'Positive allosteric modulator of GABA-A receptors (e.g., Diazepam/Valium): increases Cl\u207B channel opening frequency, enhancing inhibitory neurotransmission. Used for anxiety, seizures, and insomnia. Risk: dependence.', reuptakeBlocked: false, enzymeBlocked: false, particleMult: 1, receptorBoost: 'GABA-A', receptorDim: null, vesicleRate: 0.7 },

            { id: 'cocaine', name: 'Cocaine', icon: '\u26A0\uFE0F', color: '#ef4444', desc: 'Blocks DAT, NET, and SERT reuptake transporters non-selectively. Massive dopamine accumulation in mesolimbic pathway \u2192 intense euphoria. Highly addictive. Cardiotoxic: causes vasoconstriction, arrhythmias, MI, and stroke.', reuptakeBlocked: true, enzymeBlocked: false, particleMult: 4, receptorBoost: null, receptorDim: null, vesicleRate: 2 },

            { id: 'opioid', name: 'Opioid', icon: '\u26A0\uFE0F', color: '#f59e0b', desc: 'Mu-receptor agonist (e.g., Morphine, Fentanyl): activates endogenous opioid receptors \u2192 analgesia, euphoria, respiratory depression. Hijacks VTA reward circuit. Tolerance and physical dependence develop rapidly. Overdose: fatal respiratory arrest.', reuptakeBlocked: false, enzymeBlocked: false, particleMult: 1.3, receptorBoost: '\u03BC-opioid', receptorDim: null, vesicleRate: 0.6 },

            { id: 'alcohol', name: 'Alcohol', icon: '\u26A0\uFE0F', color: '#d946ef', desc: 'Dual mechanism: enhances GABA-A receptor activity (sedation) AND blocks NMDA glutamate receptors (reduces excitation). Results in CNS depression, impaired judgment, ataxia. Chronic use: neuroadaptation, tolerance, and life-threatening withdrawal seizures.', reuptakeBlocked: false, enzymeBlocked: false, particleMult: 0.8, receptorBoost: 'GABA-A', receptorDim: 'NMDA', vesicleRate: 0.5 }

          ];

          var simScenario = d.simScenario || 'normal';

          var activeSim = SIM_SCENARIOS.find(function (s) { return s.id === simScenario; }) || SIM_SCENARIOS[0];



          // Brain canvas — animated

          var canvasRef = function (canvas) {

            if (!canvas) return;

            // If view or sim scenario changed, cancel the old animation so we restart with fresh closures

            var _cacheKey = viewKey + '|' + simScenario;

            if (canvas._brainAnim && canvas._brainViewKey === _cacheKey) return;

            if (canvas._brainAnim) { cancelAnimationFrame(canvas._brainAnim); canvas._brainAnim = null; }

            canvas._brainViewKey = _cacheKey;

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var fontScale = W / 600; // Scale text proportionally

            if (!canvas._neurons) {

              canvas._neurons = [];

              for (var ni = 0; ni < 30; ni++) {

                canvas._neurons.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, life: Math.random(), size: 1 + Math.random() * 1.5 });

              }

            }

            var neurons = canvas._neurons;

            canvas._brainTick = canvas._brainTick || 0;

            function drawBrainFrame() {

              canvas._brainTick++;

              ctx.clearRect(0, 0, W, H);

              ctx.save();



              // ── Enhanced Neurotransmitter Synapse View ──

              if (currentView.isNT) {

                var tNT = canvas._brainTick * 0.02;

                ctx.lineCap = 'round'; ctx.lineJoin = 'round';



                // ── Presynaptic Terminal (gradient fill + shadow) ──

                ctx.save();

                ctx.shadowColor = 'rgba(124,58,237,0.12)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;

                var preGrad = ctx.createLinearGradient(W * 0.1, H * 0.05, W * 0.1, H * 0.40);

                preGrad.addColorStop(0, '#f3eefc');

                preGrad.addColorStop(0.5, '#ede5f8');

                preGrad.addColorStop(1, '#e4d9f0');

                ctx.beginPath();

                ctx.moveTo(W * 0.15, H * 0.05); ctx.lineTo(W * 0.85, H * 0.05);

                ctx.quadraticCurveTo(W * 0.90, H * 0.05, W * 0.90, H * 0.10);

                ctx.lineTo(W * 0.90, H * 0.32);

                ctx.quadraticCurveTo(W * 0.85, H * 0.38, W * 0.70, H * 0.40);

                ctx.lineTo(W * 0.30, H * 0.40);

                ctx.quadraticCurveTo(W * 0.15, H * 0.38, W * 0.10, H * 0.32);

                ctx.lineTo(W * 0.10, H * 0.10);

                ctx.quadraticCurveTo(W * 0.10, H * 0.05, W * 0.15, H * 0.05);

                ctx.fillStyle = preGrad; ctx.fill();

                ctx.restore();

                ctx.beginPath();

                ctx.moveTo(W * 0.15, H * 0.05); ctx.lineTo(W * 0.85, H * 0.05);

                ctx.quadraticCurveTo(W * 0.90, H * 0.05, W * 0.90, H * 0.10);

                ctx.lineTo(W * 0.90, H * 0.32);

                ctx.quadraticCurveTo(W * 0.85, H * 0.38, W * 0.70, H * 0.40);

                ctx.lineTo(W * 0.30, H * 0.40);

                ctx.quadraticCurveTo(W * 0.15, H * 0.38, W * 0.10, H * 0.32);

                ctx.lineTo(W * 0.10, H * 0.10);

                ctx.quadraticCurveTo(W * 0.10, H * 0.05, W * 0.15, H * 0.05);

                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 2; ctx.stroke();



                // Phospholipid bilayer texture on presynaptic membrane bottom

                ctx.save(); ctx.globalAlpha = 0.22;

                for (var pli = 0; pli < 16; pli++) {

                  var plx = W * 0.18 + pli * W * 0.045;

                  var plBaseY = H * 0.38 + (pli < 4 || pli > 12 ? -H * 0.02 : 0);

                  // Lipid heads (circles)

                  ctx.beginPath(); ctx.arc(plx, plBaseY, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#a78bfa'; ctx.fill();

                  // Lipid tails (wavy lines)

                  ctx.beginPath();

                  ctx.moveTo(plx, plBaseY - 3);

                  ctx.quadraticCurveTo(plx - 1.5, plBaseY - 8, plx, plBaseY - 12);

                  ctx.strokeStyle = '#c4b5d8'; ctx.lineWidth = 0.8; ctx.stroke();

                  ctx.beginPath();

                  ctx.moveTo(plx + 1, plBaseY - 3);

                  ctx.quadraticCurveTo(plx + 2.5, plBaseY - 8, plx + 1, plBaseY - 12);

                  ctx.stroke();

                }

                ctx.restore();



                // Label

                ctx.font = 'bold ' + Math.round(18 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#7c3aed'; ctx.textAlign = 'center';

                ctx.fillText('PRESYNAPTIC TERMINAL', W * 0.5, H * 0.10);

                // (Drug banner moved to end of draw loop for z-order)



                // ── Mitochondria (energy source) ──

                ctx.save(); ctx.globalAlpha = 0.35;

                ctx.beginPath(); ctx.ellipse(W * 0.78, H * 0.12, W * 0.06, H * 0.025, 0.2, 0, Math.PI * 2);

                ctx.fillStyle = '#fde68a'; ctx.fill();

                ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1; ctx.stroke();

                // Cristae folds

                for (var cr = 0; cr < 4; cr++) {

                  var crx = W * 0.74 + cr * W * 0.022;

                  ctx.beginPath();

                  ctx.moveTo(crx, H * 0.10); ctx.quadraticCurveTo(crx + W * 0.005, H * 0.12, crx, H * 0.14);

                  ctx.strokeStyle = '#b4590080'; ctx.lineWidth = 0.6; ctx.stroke();

                }

                ctx.font = 'bold ' + Math.round(14 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#b45900'; ctx.textAlign = 'center';

                ctx.fillText('Mitochondria', W * 0.78, H * 0.155);

                ctx.restore();



                // ── Calcium channel (animated glow on membrane edge) ──

                var caGlow = 0.4 + Math.sin(tNT * 2.5) * 0.3;

                ctx.save();

                ctx.globalAlpha = caGlow;

                ctx.beginPath(); ctx.arc(W * 0.42, H * 0.39, 7, 0, Math.PI * 2);

                var caGrad = ctx.createRadialGradient(W * 0.42, H * 0.39, 1, W * 0.42, H * 0.39, 7);

                caGrad.addColorStop(0, '#22d3ee');

                caGrad.addColorStop(1, '#22d3ee00');

                ctx.fillStyle = caGrad; ctx.fill();

                ctx.restore();

                ctx.beginPath(); ctx.arc(W * 0.42, H * 0.39, 4, 0, Math.PI * 2);

                ctx.fillStyle = '#06b6d4'; ctx.fill();

                ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 1; ctx.stroke();

                ctx.font = 'bold ' + Math.round(14 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#0e7490'; ctx.textAlign = 'center';

                ctx.fillText('Ca\u00B2\u207A', W * 0.42, H * 0.39 + 2);



                // ── Vesicles with glow + one fusing ──

                var vesColors = ['#c084fc', '#a78bfa', '#8b5cf6', '#7c3aed'];

                var vesicleCount = Math.round(8 * activeSim.vesicleRate);

                // Vesicle rate callout (drug effect)
                if (activeSim.id !== 'normal' && activeSim.vesicleRate !== 1) {
                  ctx.save();
                  ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.fillStyle = activeSim.color; ctx.textAlign = 'right';
                  ctx.fillText(activeSim.vesicleRate < 1 ? '\u2B07 Fewer vesicles' : '\u2B06 More vesicles', W * 0.90, H * 0.175);
                  ctx.restore();
                }

                for (var vi = 0; vi < vesicleCount; vi++) {

                  var vx = W * 0.22 + (vi % 4) * W * 0.15, vy = H * 0.20 + Math.floor(vi / 4) * H * 0.064;

                  var isFusing = vi === 5; // One vesicle animates toward membrane

                  var vRadius = 9;

                  var vyAnim = vy;

                  if (isFusing) {

                    vyAnim = vy + Math.abs(Math.sin(tNT * 1.2)) * H * 0.08;

                    vRadius = 9 - Math.abs(Math.sin(tNT * 1.2)) * 3;

                  }

                  // Vesicle glow

                  ctx.save();

                  var vesGlow = ctx.createRadialGradient(vx - 2, vyAnim - 2, 1, vx, vyAnim, vRadius);

                  vesGlow.addColorStop(0, '#f0e6ff');

                  vesGlow.addColorStop(0.5, vesColors[vi % 4] + '80');

                  vesGlow.addColorStop(1, vesColors[vi % 4]);

                  ctx.beginPath(); ctx.arc(vx, vyAnim, vRadius, 0, Math.PI * 2);

                  ctx.fillStyle = vesGlow; ctx.fill();

                  ctx.strokeStyle = vesColors[vi % 4]; ctx.lineWidth = 1; ctx.stroke();

                  // NT molecules inside (small dots)

                  if (!isFusing || vRadius > 5) {

                    for (var di = 0; di < 4; di++) {

                      var da = (di / 4) * Math.PI * 2 + tNT * 0.5;

                      var dr = vRadius * 0.4;

                      ctx.beginPath(); ctx.arc(vx + Math.cos(da) * dr, vyAnim + Math.sin(da) * dr, 1.5, 0, Math.PI * 2);

                      ctx.fillStyle = '#fff'; ctx.fill();

                    }

                  }

                }



                // ── Synaptic Cleft (gradient + depth) ──

                ctx.save();

                var cleftGrad = ctx.createLinearGradient(0, H * 0.41, 0, H * 0.59);

                cleftGrad.addColorStop(0, '#ede5f810');

                cleftGrad.addColorStop(0.3, '#e8f4f812');

                cleftGrad.addColorStop(0.7, '#e8f4f812');

                cleftGrad.addColorStop(1, '#fef3c710');

                ctx.fillStyle = cleftGrad;

                ctx.fillRect(W * 0.06, H * 0.41, W * 0.88, H * 0.18);

                ctx.restore();

                // Cleft borders

                ctx.setLineDash([5, 3]);

                ctx.strokeStyle = '#94a3b830'; ctx.lineWidth = 1;

                ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.41); ctx.lineTo(W * 0.94, H * 0.41); ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.59); ctx.lineTo(W * 0.94, H * 0.59); ctx.stroke();

                ctx.setLineDash([]);

                // Cleft label with background

                ctx.save();

                var cleftLabelW = 110;

                ctx.fillStyle = '#f1f5f9'; ctx.globalAlpha = 0.7;

                ctx.beginPath();

                ctx.roundRect(W * 0.5 - cleftLabelW / 2, H * 0.482, cleftLabelW, 18, 5);

                ctx.fill();

                ctx.restore();

                ctx.font = 'bold ' + Math.round(16 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#475569'; ctx.textAlign = 'center';

                ctx.fillText('SYNAPTIC CLEFT (~20nm)', W * 0.5, H * 0.50);

                // ── NT particle count callout (drug effect) ──
                if (activeSim.id !== 'normal') {
                  var pmLabel = activeSim.particleMult > 1 ? '\u2B06 ' + activeSim.particleMult + '\u00D7 NT in cleft' : activeSim.particleMult < 1 ? '\u2B07 NT reduced' : '';
                  if (pmLabel) {
                    ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                    ctx.fillStyle = activeSim.color; ctx.textAlign = 'left';
                    ctx.fillText(pmLabel, W * 0.06, H * 0.475);
                  }
                }



                // ── Animated NT particles (glowing with trails) ──

                var ntParticleCount = Math.round(14 * activeSim.particleMult);

                for (var pi = 0; pi < ntParticleCount; pi++) {

                  var px2 = W * 0.14 + ((pi % 14) * W * 0.055) + Math.sin(tNT * 1.5 + pi * 0.8) * 10;

                  var py2 = H * 0.43 + Math.abs(Math.sin(tNT * 1.0 + pi * 1.3)) * H * 0.14;

                  // Glow

                  ctx.save();

                  var ptGlow = ctx.createRadialGradient(px2, py2, 0.5, px2, py2, 6);

                  ptGlow.addColorStop(0, 'hsla(' + ((pi * 25 + canvas._brainTick) % 360) + ', 80%, 65%, 0.6)');

                  ptGlow.addColorStop(1, 'hsla(' + ((pi * 25 + canvas._brainTick) % 360) + ', 80%, 65%, 0)');

                  ctx.beginPath(); ctx.arc(px2, py2, 6, 0, Math.PI * 2);

                  ctx.fillStyle = ptGlow; ctx.fill();

                  ctx.restore();

                  // Particle core

                  ctx.beginPath(); ctx.arc(px2, py2, 2.5, 0, Math.PI * 2);

                  ctx.fillStyle = 'hsl(' + ((pi * 25 + canvas._brainTick) % 360) + ', 80%, 58%)';

                  ctx.fill();

                  ctx.strokeStyle = 'hsl(' + ((pi * 25 + canvas._brainTick) % 360) + ', 80%, 45%)';

                  ctx.lineWidth = 0.5; ctx.stroke();

                }



                // ── Postsynaptic Membrane (gradient + shadow) ──

                ctx.save();

                ctx.shadowColor = 'rgba(124,58,237,0.10)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = -3;

                var postGrad = ctx.createLinearGradient(0, H * 0.59, 0, H * 0.96);

                postGrad.addColorStop(0, '#fef9ee');

                postGrad.addColorStop(0.3, '#fdf3e0');

                postGrad.addColorStop(1, '#fcecd0');

                ctx.beginPath();

                ctx.moveTo(W * 0.06, H * 0.59); ctx.lineTo(W * 0.94, H * 0.59);

                ctx.quadraticCurveTo(W * 0.96, H * 0.61, W * 0.94, H * 0.63);

                ctx.lineTo(W * 0.94, H * 0.96); ctx.lineTo(W * 0.06, H * 0.96);

                ctx.lineTo(W * 0.06, H * 0.63);

                ctx.quadraticCurveTo(W * 0.04, H * 0.61, W * 0.06, H * 0.59);

                ctx.fillStyle = postGrad; ctx.fill();

                ctx.restore();

                ctx.beginPath();

                ctx.moveTo(W * 0.06, H * 0.59); ctx.lineTo(W * 0.94, H * 0.59);

                ctx.quadraticCurveTo(W * 0.96, H * 0.61, W * 0.94, H * 0.63);

                ctx.lineTo(W * 0.94, H * 0.96); ctx.lineTo(W * 0.06, H * 0.96);

                ctx.lineTo(W * 0.06, H * 0.63);

                ctx.quadraticCurveTo(W * 0.04, H * 0.61, W * 0.06, H * 0.59);

                ctx.strokeStyle = '#b49370'; ctx.lineWidth = 1.5; ctx.stroke();



                // Phospholipid bilayer on postsynaptic top

                ctx.save(); ctx.globalAlpha = 0.18;

                for (var pli2 = 0; pli2 < 18; pli2++) {

                  var plx2 = W * 0.10 + pli2 * W * 0.046;

                  var plBaseY2 = H * 0.60;

                  ctx.beginPath(); ctx.arc(plx2, plBaseY2, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#d97706'; ctx.fill();

                  ctx.beginPath();

                  ctx.moveTo(plx2, plBaseY2 + 3);

                  ctx.quadraticCurveTo(plx2 - 1.5, plBaseY2 + 8, plx2, plBaseY2 + 12);

                  ctx.strokeStyle = '#e8c48a'; ctx.lineWidth = 0.8; ctx.stroke();

                  ctx.beginPath();

                  ctx.moveTo(plx2 + 1, plBaseY2 + 3);

                  ctx.quadraticCurveTo(plx2 + 2.5, plBaseY2 + 8, plx2 + 1, plBaseY2 + 12);

                  ctx.stroke();

                }

                ctx.restore();



                ctx.font = 'bold ' + Math.round(16 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#92400e'; ctx.textAlign = 'center';

                ctx.fillText('POSTSYNAPTIC DENSITY', W * 0.5, H * 0.70);



                // ── Enhanced Receptors (varied shapes) ──

                var recData = [

                  { name: 'AMPA', type: 'ion', color: '#3b82f6' },

                  { name: 'NMDA', type: 'ion', color: '#8b5cf6' },

                  { name: 'mGluR', type: 'meta', color: '#f59e0b' },

                  { name: 'GABA-A', type: 'ion', color: '#22c55e' },

                  { name: 'GABA-B', type: 'meta', color: '#14b8a6' },

                  { name: 'nACh', type: 'ion', color: '#ef4444' }

                ];

                for (var ri = 0; ri < 6; ri++) {

                  var rx = W * 0.14 + ri * W * 0.135, ry = H * 0.59;

                  var rd = recData[ri];

                  if (rd.type === 'ion') {

                    // Y-shaped ionotropic receptor

                    ctx.beginPath();

                    ctx.moveTo(rx, ry + 16); ctx.lineTo(rx, ry + 6);

                    ctx.moveTo(rx, ry + 6); ctx.lineTo(rx - 5, ry - 2);

                    ctx.moveTo(rx, ry + 6); ctx.lineTo(rx + 5, ry - 2);

                    ctx.strokeStyle = rd.color; ctx.lineWidth = 2.5; ctx.stroke();

                    // Pore opening

                    ctx.beginPath(); ctx.arc(rx, ry + 3, 2, 0, Math.PI * 2);

                    ctx.fillStyle = '#fff'; ctx.fill();

                    ctx.strokeStyle = rd.color; ctx.lineWidth = 1; ctx.stroke();

                  } else {

                    // Serpentine metabotropic receptor (7TM-like wavy)

                    ctx.beginPath();

                    ctx.moveTo(rx - 4, ry - 2);

                    ctx.quadraticCurveTo(rx - 2, ry + 4, rx, ry + 2);

                    ctx.quadraticCurveTo(rx + 2, ry, rx + 1, ry + 6);

                    ctx.quadraticCurveTo(rx, ry + 10, rx - 1, ry + 14);

                    ctx.lineTo(rx + 3, ry + 16);

                    ctx.strokeStyle = rd.color; ctx.lineWidth = 2; ctx.stroke();

                    // G-protein bulge

                    ctx.beginPath(); ctx.ellipse(rx + 2, ry + 15, 4, 2.5, 0, 0, Math.PI * 2);

                    ctx.fillStyle = rd.color + '30'; ctx.fill();

                    ctx.strokeStyle = rd.color; ctx.lineWidth = 0.8; ctx.stroke();

                  }

                  // Receptor boost/dim effects from simulation

                  if (activeSim.receptorBoost && rd.name === activeSim.receptorBoost) {

                    ctx.save();

                    var boostGlow = ctx.createRadialGradient(rx, ry + 8, 2, rx, ry + 8, 18);

                    boostGlow.addColorStop(0, rd.color + '60');

                    boostGlow.addColorStop(1, rd.color + '00');

                    ctx.beginPath(); ctx.arc(rx, ry + 8, 18 + Math.sin(tNT * 3) * 4, 0, Math.PI * 2);

                    ctx.fillStyle = boostGlow; ctx.fill();

                    ctx.restore();

                    ctx.font = 'bold ' + Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';

                    ctx.fillStyle = '#16a34a'; ctx.textAlign = 'center';

                    ctx.fillText('\u2B06 ENHANCED', rx, ry + 46);

                  }

                  if (activeSim.receptorDim && rd.name === activeSim.receptorDim) {

                    ctx.save();

                    ctx.globalAlpha = 0.3 + Math.sin(tNT * 2) * 0.1;

                    ctx.beginPath(); ctx.moveTo(rx - 10, ry - 4); ctx.lineTo(rx + 10, ry + 18);

                    ctx.moveTo(rx + 10, ry - 4); ctx.lineTo(rx - 10, ry + 18);

                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.stroke();

                    ctx.restore();

                    ctx.font = 'bold ' + Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';

                    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center';

                    ctx.fillText('\u2B07 BLOCKED', rx, ry + 46);

                  }

                  ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif';

                  ctx.fillStyle = rd.color; ctx.textAlign = 'center';

                  ctx.fillText(rd.name, rx, ry + 30);

                }



                // ── Reuptake Pump (animated spinning arrows) ──

                ctx.save();

                ctx.translate(W * 0.88, H * 0.41);

                // Pump body

                var pumpGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);

                if (activeSim.reuptakeBlocked) {

                  pumpGrad.addColorStop(0, '#fef2f2');

                  pumpGrad.addColorStop(1, '#fecaca');

                } else {

                  pumpGrad.addColorStop(0, '#d1fae5');

                  pumpGrad.addColorStop(1, '#86efac');

                }

                ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);

                ctx.fillStyle = pumpGrad; ctx.fill();

                ctx.strokeStyle = activeSim.reuptakeBlocked ? '#ef4444' : '#16a34a'; ctx.lineWidth = 1.5; ctx.stroke();

                if (activeSim.reuptakeBlocked) {

                  // Blocked: red X overlay with pulsing glow

                  ctx.save();

                  ctx.shadowColor = 'rgba(239,68,68,0.5)';

                  ctx.shadowBlur = 6 + Math.sin(tNT * 3) * 3;

                  ctx.beginPath();

                  ctx.moveTo(-7, -7); ctx.lineTo(7, 7);

                  ctx.moveTo(7, -7); ctx.lineTo(-7, 7);

                  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.stroke();

                  ctx.restore();

                } else {

                  // Spinning arrow (normal operation)

                  ctx.rotate(tNT * 2);

                  ctx.beginPath();

                  ctx.moveTo(0, -8); ctx.lineTo(4, -3); ctx.lineTo(-4, -3);

                  ctx.fillStyle = '#16a34a'; ctx.fill();

                  ctx.beginPath();

                  ctx.moveTo(0, 8); ctx.lineTo(-4, 3); ctx.lineTo(4, 3);

                  ctx.fill();

                }

                ctx.restore();

                ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = activeSim.reuptakeBlocked ? '#ef4444' : '#16a34a'; ctx.textAlign = 'center';

                ctx.fillText(activeSim.reuptakeBlocked ? 'BLOCKED' : 'Reuptake', W * 0.88, H * 0.41 + 22);

                ctx.fillText(activeSim.reuptakeBlocked ? 'Reuptake' : 'Transporter', W * 0.88, H * 0.41 + 33);



                // ── Enzyme (MAO/COMT) with scissor icon ──

                ctx.save();

                var enzGrad = ctx.createRadialGradient(W * 0.12, H * 0.50, 2, W * 0.12, H * 0.50, 12);

                enzGrad.addColorStop(0, '#fef2f2');

                enzGrad.addColorStop(1, '#fecaca');

                ctx.beginPath(); ctx.arc(W * 0.12, H * 0.50, 12, 0, Math.PI * 2);

                ctx.fillStyle = enzGrad; ctx.fill();

                ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5; ctx.stroke();

                // Scissor lines

                ctx.beginPath();

                ctx.moveTo(W * 0.12 - 5, H * 0.50 - 5); ctx.lineTo(W * 0.12 + 5, H * 0.50 + 5);

                ctx.moveTo(W * 0.12 + 5, H * 0.50 - 5); ctx.lineTo(W * 0.12 - 5, H * 0.50 + 5);

                ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.2; ctx.stroke();

                ctx.restore();

                ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#dc2626'; ctx.textAlign = 'center';

                ctx.fillText('MAO/COMT', W * 0.12, H * 0.50 + 20);

                ctx.fillText('Enzyme', W * 0.12, H * 0.50 + 31);



                // ── Signal Cascade (multi-stage with arrows) ──

                ctx.save();

                // cAMP / IP3 cascade stages

                var cascadeY = [H * 0.73, H * 0.79, H * 0.85, H * 0.91];

                var cascadeLabels = ['G-protein', 'cAMP / IP₃', 'Protein Kinase', 'Gene Expression'];

                var cascadeColors = ['#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'];

                for (var ci = 0; ci < 4; ci++) {

                  // Arrow

                  if (ci > 0) {

                    ctx.beginPath();

                    ctx.moveTo(W * 0.5, cascadeY[ci - 1] + 4);

                    ctx.lineTo(W * 0.5, cascadeY[ci] - 4);

                    ctx.strokeStyle = cascadeColors[ci] + '60'; ctx.lineWidth = 1.5;

                    ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);

                    // Arrowhead

                    ctx.beginPath();

                    ctx.moveTo(W * 0.5, cascadeY[ci] - 2);

                    ctx.lineTo(W * 0.49, cascadeY[ci] - 5);

                    ctx.moveTo(W * 0.5, cascadeY[ci] - 2);

                    ctx.lineTo(W * 0.51, cascadeY[ci] - 5);

                    ctx.strokeStyle = cascadeColors[ci]; ctx.lineWidth = 1; ctx.stroke();

                  }

                  // Label pill

                  var pillW = ctx.measureText ? 70 : 70;

                  ctx.beginPath();

                  ctx.roundRect(W * 0.5 - pillW / 2, cascadeY[ci] - 5, pillW, 11, 3);

                  ctx.fillStyle = cascadeColors[ci] + '15'; ctx.fill();

                  ctx.strokeStyle = cascadeColors[ci] + '40'; ctx.lineWidth = 0.5; ctx.stroke();

                  ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';

                  ctx.fillStyle = cascadeColors[ci]; ctx.textAlign = 'center';

                  ctx.fillText(cascadeLabels[ci], W * 0.5, cascadeY[ci] + 3);

                }

                ctx.restore();



                // ── Active Drug Banner (drawn last for z-order) ──
                if (activeSim.id !== 'normal') {
                  var banW = W * 0.72, banH = 22, banX = W * 0.5 - banW / 2, banY = H * 0.125;
                  ctx.save();
                  ctx.shadowColor = activeSim.color + '40'; ctx.shadowBlur = 8;
                  ctx.beginPath(); ctx.roundRect(banX, banY, banW, banH, 6);
                  ctx.fillStyle = activeSim.color; ctx.fill();
                  ctx.restore();
                  ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
                  var banText = activeSim.icon + ' ' + activeSim.name.toUpperCase();
                  ctx.fillText(banText, W * 0.5, banY + 15);
                  // Frosted backdrop behind mechanism note
                  var mechMap = { ssri: 'Blocks SERT reuptake \u2192 \u2191 serotonin in cleft', snri: 'Blocks SERT+NET \u2192 \u2191 serotonin & norepinephrine', benzo: 'Enhances GABA-A Cl\u207B channel opening', cocaine: 'Blocks DAT+NET+SERT \u2192 massive DA accumulation', opioid: 'Activates \u03BC-opioid receptors \u2192 analgesia & euphoria', alcohol: 'Enhances GABA-A + blocks NMDA glutamate' };
                  var mechText = mechMap[activeSim.id] || '';
                  if (mechText) {
                    ctx.font = Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';
                    var mechW = ctx.measureText(mechText).width + 16;
                    ctx.save();
                    ctx.globalAlpha = 0.85;
                    ctx.beginPath(); ctx.roundRect(W * 0.5 - mechW / 2, banY + banH + 1, mechW, 14, 3);
                    ctx.fillStyle = '#fff'; ctx.fill();
                    ctx.restore();
                    ctx.fillStyle = activeSim.color;
                    ctx.fillText(mechText, W * 0.5, banY + banH + 12);
                  }
                }

                // ── View Label (styled) ──

                ctx.save();

                ctx.beginPath();

                ctx.roundRect(W * 0.5 - 80, H - 18, 160, 14, 4);

                ctx.fillStyle = '#f8fafc'; ctx.fill();

                ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5; ctx.stroke();

                ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';

                ctx.fillText('NEUROTRANSMITTER SYNAPSE', W * 0.5, H - 8);

                ctx.restore();



                canvas._brainAnim = requestAnimationFrame(drawBrainFrame); return;

              }



              // ── Enhanced Brain Rendering ──

              ctx.lineJoin = 'round';

              ctx.lineCap = 'round';



              // Brain gradient for realistic tissue appearance

              var brainGrad = ctx.createRadialGradient(W * 0.5, H * 0.4, W * 0.05, W * 0.5, H * 0.4, W * 0.45);

              brainGrad.addColorStop(0, '#f0e6f6');

              brainGrad.addColorStop(0.4, '#ebe0f0');

              brainGrad.addColorStop(0.8, '#e4d8ea');

              brainGrad.addColorStop(1, '#ddd0e2');



              // Helper: draw gyri convolutions on a brain surface

              function drawGyri(cx, cy, radius, count, spread) {

                ctx.save();

                ctx.globalAlpha = 0.22;

                ctx.strokeStyle = '#9b7fb8';

                ctx.lineWidth = 0.8;

                // Seeded deterministic pseudo-random for stable gyri across frames
                var _gyriSeed = Math.round(cx * 100 + cy * 7 + count * 13);
                function gyriRand() { _gyriSeed = (_gyriSeed * 16807 + 0) % 2147483647; return (_gyriSeed & 0x7fffffff) / 2147483647; }

                for (var gi = 0; gi < count; gi++) {

                  var angle = (gi / count) * Math.PI * 2;

                  var r1 = radius * (0.3 + gyriRand() * 0.5);

                  var gx = cx + Math.cos(angle) * r1;

                  var gy = cy + Math.sin(angle) * r1;

                  // Primary sulcus curve
                  var arcLen = spread * (0.6 + gyriRand() * 0.4);
                  ctx.beginPath();
                  ctx.arc(gx, gy, arcLen, angle, angle + Math.PI * (0.5 + gyriRand() * 0.8));
                  ctx.stroke();

                  // Secondary micro-ridges branching off primary
                  if (gi % 2 === 0) {
                    var brAngle = angle + gyriRand() * Math.PI * 0.6;
                    var brLen = spread * 0.4;
                    ctx.globalAlpha = 0.14;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(gx, gy);
                    ctx.quadraticCurveTo(gx + Math.cos(brAngle) * brLen * 0.5, gy + Math.sin(brAngle) * brLen * 0.5 + 2, gx + Math.cos(brAngle) * brLen, gy + Math.sin(brAngle) * brLen);
                    ctx.stroke();
                    ctx.globalAlpha = 0.22;
                    ctx.lineWidth = 0.8;
                  }

                }

                ctx.restore();

              }



              // Helper: draw cerebellum with foliation

              function drawCerebellum(cx, cy, rx, ry) {

                // Gradient fill

                var cbGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);

                cbGrad.addColorStop(0, '#f0e9ff');

                cbGrad.addColorStop(1, '#ddd0f0');

                ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

                ctx.fillStyle = cbGrad; ctx.fill();

                ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5; ctx.stroke();

                // Foliation lines

                ctx.save();

                ctx.globalAlpha = 0.25;

                ctx.strokeStyle = '#8b6fc0';

                ctx.lineWidth = 0.6;

                for (var fi = 0; fi < 7; fi++) {

                  var fy = cy - ry * 0.7 + fi * (ry * 1.4 / 7);

                  var fxSpread = rx * Math.sqrt(1 - Math.pow((fy - cy) / ry, 2)) * 0.85;

                  if (fxSpread > 2) {

                    ctx.beginPath();

                    ctx.moveTo(cx - fxSpread, fy);

                    ctx.quadraticCurveTo(cx, fy + (fi % 2 === 0 ? 2 : -2), cx + fxSpread, fy);

                    ctx.stroke();

                  }

                }

                ctx.restore();

              }



              // Helper: draw brainstem with gradient

              function drawBrainstem(x1, y1, x2, y2, x3, y3, x4, y4) {

                var bsGrad = ctx.createLinearGradient(x1, y1, x2, y2);

                bsGrad.addColorStop(0, '#e8ddf5');

                bsGrad.addColorStop(0.5, '#dcd0ea');

                bsGrad.addColorStop(1, '#d2c4e0');

                ctx.beginPath();

                ctx.moveTo(x1, y1);

                ctx.quadraticCurveTo((x1 + x2) * 0.5 + 3, (y1 + y2) * 0.5, x2, y2);

                ctx.lineTo(x3, y3);

                ctx.quadraticCurveTo((x4 + x3) * 0.5 - 3, (y4 + y3) * 0.5, x4, y4);

                ctx.closePath();

                ctx.fillStyle = bsGrad; ctx.fill();

                ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5; ctx.stroke();

                // Medulla segments

                ctx.save();

                ctx.globalAlpha = 0.15;

                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 0.5;

                for (var si = 1; si < 4; si++) {

                  var t = si / 4;

                  var sx1 = x1 + (x2 - x1) * t, sy1 = y1 + (y2 - y1) * t;

                  var sx2 = x4 + (x3 - x4) * t, sy2 = y4 + (y3 - y4) * t;

                  ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();

                }

                ctx.restore();

              }



              if (viewKey === 'lateral') {

                // ── Lateral View ──

                // Main brain shape with shadow

                ctx.save();

                ctx.shadowColor = 'rgba(80,50,120,0.22)';

                ctx.shadowBlur = 14;

                ctx.shadowOffsetX = 4;

                ctx.shadowOffsetY = 5;

                ctx.beginPath();

                ctx.moveTo(W * 0.15, H * 0.45);

                ctx.quadraticCurveTo(W * 0.12, H * 0.20, W * 0.35, H * 0.12);

                ctx.quadraticCurveTo(W * 0.55, H * 0.08, W * 0.72, H * 0.15);

                ctx.quadraticCurveTo(W * 0.88, H * 0.25, W * 0.90, H * 0.42);

                ctx.quadraticCurveTo(W * 0.88, H * 0.55, W * 0.78, H * 0.60);

                ctx.quadraticCurveTo(W * 0.70, H * 0.72, W * 0.62, H * 0.76);

                ctx.quadraticCurveTo(W * 0.50, H * 0.78, W * 0.42, H * 0.72);

                ctx.quadraticCurveTo(W * 0.30, H * 0.62, W * 0.20, H * 0.55);

                ctx.quadraticCurveTo(W * 0.14, H * 0.50, W * 0.15, H * 0.45);

                ctx.fillStyle = brainGrad; ctx.fill();

                ctx.restore();

                // Gray/white matter inner border
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(W * 0.15, H * 0.45);
                ctx.quadraticCurveTo(W * 0.12, H * 0.20, W * 0.35, H * 0.12);
                ctx.quadraticCurveTo(W * 0.55, H * 0.08, W * 0.72, H * 0.15);
                ctx.quadraticCurveTo(W * 0.88, H * 0.25, W * 0.90, H * 0.42);
                ctx.quadraticCurveTo(W * 0.88, H * 0.55, W * 0.78, H * 0.60);
                ctx.quadraticCurveTo(W * 0.70, H * 0.72, W * 0.62, H * 0.76);
                ctx.quadraticCurveTo(W * 0.50, H * 0.78, W * 0.42, H * 0.72);
                ctx.quadraticCurveTo(W * 0.30, H * 0.62, W * 0.20, H * 0.55);
                ctx.quadraticCurveTo(W * 0.14, H * 0.50, W * 0.15, H * 0.45);
                ctx.clip();
                // Inner white-matter glow (lighter center)
                var wmGrad = ctx.createRadialGradient(W * 0.48, H * 0.42, W * 0.06, W * 0.48, H * 0.42, W * 0.32);
                wmGrad.addColorStop(0, '#f8f4ffb0');
                wmGrad.addColorStop(0.4, '#f0eaf800');
                wmGrad.addColorStop(1, '#00000000');
                ctx.fillStyle = wmGrad;
                ctx.fillRect(0, 0, W, H);
                // Cortical rim (darker outer ring = gray matter)
                var gmGrad = ctx.createRadialGradient(W * 0.48, H * 0.42, W * 0.25, W * 0.48, H * 0.42, W * 0.45);
                gmGrad.addColorStop(0, '#00000000');
                gmGrad.addColorStop(0.6, '#00000000');
                gmGrad.addColorStop(1, '#c8b8dc30');
                ctx.fillStyle = gmGrad;
                ctx.fillRect(0, 0, W, H);
                ctx.restore();



                // Lobe coloring (Frontal – blue, Parietal – green, Temporal – yellow, Occipital – red)

                ctx.save(); ctx.globalAlpha = 0.16;

                // Frontal lobe region

                ctx.beginPath();

                ctx.moveTo(W * 0.15, H * 0.45);

                ctx.quadraticCurveTo(W * 0.12, H * 0.20, W * 0.35, H * 0.12);

                ctx.quadraticCurveTo(W * 0.43, H * 0.10, W * 0.48, H * 0.12);

                ctx.lineTo(W * 0.40, H * 0.55);

                ctx.quadraticCurveTo(W * 0.30, H * 0.52, W * 0.20, H * 0.50);

                ctx.closePath();

                ctx.fillStyle = '#3b82f6'; ctx.fill();

                // Parietal lobe region

                ctx.beginPath();

                ctx.moveTo(W * 0.48, H * 0.12);

                ctx.quadraticCurveTo(W * 0.60, H * 0.09, W * 0.72, H * 0.15);

                ctx.quadraticCurveTo(W * 0.82, H * 0.22, W * 0.85, H * 0.35);

                ctx.lineTo(W * 0.65, H * 0.42);

                ctx.lineTo(W * 0.40, H * 0.50);

                ctx.closePath();

                ctx.fillStyle = '#22c55e'; ctx.fill();

                // Temporal lobe region

                ctx.beginPath();

                ctx.moveTo(W * 0.20, H * 0.52);

                ctx.quadraticCurveTo(W * 0.35, H * 0.50, W * 0.50, H * 0.48);

                ctx.lineTo(W * 0.62, H * 0.76);

                ctx.quadraticCurveTo(W * 0.50, H * 0.78, W * 0.42, H * 0.72);

                ctx.quadraticCurveTo(W * 0.30, H * 0.62, W * 0.20, H * 0.55);

                ctx.closePath();

                ctx.fillStyle = '#eab308'; ctx.fill();

                // Occipital lobe region

                ctx.beginPath();

                ctx.moveTo(W * 0.85, H * 0.35);

                ctx.quadraticCurveTo(W * 0.90, H * 0.42, W * 0.88, H * 0.55);

                ctx.quadraticCurveTo(W * 0.85, H * 0.58, W * 0.78, H * 0.60);

                ctx.lineTo(W * 0.65, H * 0.42);

                ctx.closePath();

                ctx.fillStyle = '#ef4444'; ctx.fill();

                ctx.restore();



                // Brain outline

                ctx.beginPath();

                ctx.moveTo(W * 0.15, H * 0.45);

                ctx.quadraticCurveTo(W * 0.12, H * 0.20, W * 0.35, H * 0.12);

                ctx.quadraticCurveTo(W * 0.55, H * 0.08, W * 0.72, H * 0.15);

                ctx.quadraticCurveTo(W * 0.88, H * 0.25, W * 0.90, H * 0.42);

                ctx.quadraticCurveTo(W * 0.88, H * 0.55, W * 0.78, H * 0.60);

                ctx.quadraticCurveTo(W * 0.70, H * 0.72, W * 0.62, H * 0.76);

                ctx.quadraticCurveTo(W * 0.50, H * 0.78, W * 0.42, H * 0.72);

                ctx.quadraticCurveTo(W * 0.30, H * 0.62, W * 0.20, H * 0.55);

                ctx.quadraticCurveTo(W * 0.14, H * 0.50, W * 0.15, H * 0.45);

                ctx.strokeStyle = '#7c5eaf'; ctx.lineWidth = 2.5; ctx.stroke();



                // Gyri convolutions

                drawGyri(W * 0.35, H * 0.30, W * 0.15, 12, 8);

                drawGyri(W * 0.60, H * 0.30, W * 0.12, 10, 7);

                drawGyri(W * 0.45, H * 0.60, W * 0.10, 8, 6);



                // Central sulcus (bold, anatomical curve)

                ctx.beginPath(); ctx.setLineDash([5, 3]);

                ctx.moveTo(W * 0.50, H * 0.11);

                ctx.quadraticCurveTo(W * 0.47, H * 0.28, W * 0.44, H * 0.38);

                ctx.quadraticCurveTo(W * 0.42, H * 0.48, W * 0.40, H * 0.55);

                ctx.strokeStyle = '#5a4580'; ctx.lineWidth = 1.6; ctx.stroke();

                // Lateral sulcus (Sylvian fissure — deeper curve)

                ctx.beginPath();

                ctx.moveTo(W * 0.22, H * 0.52);

                ctx.quadraticCurveTo(W * 0.35, H * 0.50, W * 0.50, H * 0.47);

                ctx.quadraticCurveTo(W * 0.58, H * 0.44, W * 0.65, H * 0.42);

                ctx.strokeStyle = '#5a4580'; ctx.lineWidth = 1.6; ctx.stroke();

                // Parieto-occipital sulcus

                ctx.beginPath();

                ctx.moveTo(W * 0.78, H * 0.15);

                ctx.quadraticCurveTo(W * 0.75, H * 0.28, W * 0.72, H * 0.38);

                ctx.strokeStyle = '#7b6fa0'; ctx.lineWidth = 1.2; ctx.stroke();

                ctx.setLineDash([]); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2;



                // Additional sulci (precentral, postcentral)

                ctx.save(); ctx.globalAlpha = 0.20; ctx.strokeStyle = '#8b72b0'; ctx.lineWidth = 0.7;

                // Precentral sulcus

                ctx.beginPath(); ctx.moveTo(W * 0.43, H * 0.14); ctx.quadraticCurveTo(W * 0.40, H * 0.30, W * 0.38, H * 0.48); ctx.stroke();

                // Postcentral sulcus

                ctx.beginPath(); ctx.moveTo(W * 0.55, H * 0.13); ctx.quadraticCurveTo(W * 0.52, H * 0.28, W * 0.48, H * 0.46); ctx.stroke();

                // Superior temporal sulcus

                ctx.beginPath(); ctx.moveTo(W * 0.28, H * 0.56); ctx.quadraticCurveTo(W * 0.40, H * 0.58, W * 0.55, H * 0.55); ctx.stroke();

                ctx.restore();



                // Cerebellum with foliation

                drawCerebellum(W * 0.80, H * 0.65, W * 0.10, H * 0.08);

                // Brainstem with gradient

                drawBrainstem(W * 0.62, H * 0.62, W * 0.65, H * 0.80, W * 0.58, H * 0.80, W * 0.55, H * 0.62);



              } else if (viewKey === 'medial') {

                // ── Medial (Sagittal) View ──

                // Main brain shape with shadow

                ctx.save();

                ctx.shadowColor = 'rgba(100,70,130,0.15)';

                ctx.shadowBlur = 10;

                ctx.shadowOffsetX = 3;

                ctx.shadowOffsetY = 4;

                ctx.beginPath();

                ctx.moveTo(W * 0.20, H * 0.50);

                ctx.quadraticCurveTo(W * 0.15, H * 0.22, W * 0.40, H * 0.12);

                ctx.quadraticCurveTo(W * 0.60, H * 0.08, W * 0.78, H * 0.18);

                ctx.quadraticCurveTo(W * 0.88, H * 0.32, W * 0.85, H * 0.50);

                ctx.quadraticCurveTo(W * 0.82, H * 0.60, W * 0.72, H * 0.62);

                ctx.lineTo(W * 0.60, H * 0.60);

                ctx.quadraticCurveTo(W * 0.50, H * 0.58, W * 0.40, H * 0.60);

                ctx.quadraticCurveTo(W * 0.25, H * 0.58, W * 0.20, H * 0.50);

                ctx.fillStyle = brainGrad; ctx.fill();

                ctx.restore();



                // Medial lobe coloring

                ctx.save(); ctx.globalAlpha = 0.10;

                // Cingulate gyrus (above corpus callosum)

                ctx.beginPath();

                ctx.moveTo(W * 0.30, H * 0.32);

                ctx.quadraticCurveTo(W * 0.50, H * 0.22, W * 0.72, H * 0.30);

                ctx.quadraticCurveTo(W * 0.72, H * 0.38, W * 0.50, H * 0.34);

                ctx.quadraticCurveTo(W * 0.35, H * 0.36, W * 0.30, H * 0.38);

                ctx.closePath();

                ctx.fillStyle = '#8b5cf6'; ctx.fill();

                ctx.restore();



                // Brain outline

                ctx.beginPath();

                ctx.moveTo(W * 0.20, H * 0.50);

                ctx.quadraticCurveTo(W * 0.15, H * 0.22, W * 0.40, H * 0.12);

                ctx.quadraticCurveTo(W * 0.60, H * 0.08, W * 0.78, H * 0.18);

                ctx.quadraticCurveTo(W * 0.88, H * 0.32, W * 0.85, H * 0.50);

                ctx.quadraticCurveTo(W * 0.82, H * 0.60, W * 0.72, H * 0.62);

                ctx.lineTo(W * 0.60, H * 0.60);

                ctx.quadraticCurveTo(W * 0.50, H * 0.58, W * 0.40, H * 0.60);

                ctx.quadraticCurveTo(W * 0.25, H * 0.58, W * 0.20, H * 0.50);

                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 2; ctx.stroke();



                // Gyri on medial surface

                drawGyri(W * 0.45, H * 0.25, W * 0.18, 10, 7);



                // Corpus callosum (thick C-shaped band with gradient)

                ctx.save();

                var ccGrad = ctx.createLinearGradient(W * 0.30, H * 0.34, W * 0.70, H * 0.34);

                ccGrad.addColorStop(0, '#e0d6f8');

                ccGrad.addColorStop(0.5, '#d4c8f0');

                ccGrad.addColorStop(1, '#e0d6f8');

                ctx.beginPath();

                ctx.moveTo(W * 0.30, H * 0.40);

                ctx.quadraticCurveTo(W * 0.50, H * 0.30, W * 0.70, H * 0.36);

                ctx.quadraticCurveTo(W * 0.72, H * 0.38, W * 0.71, H * 0.40);

                ctx.quadraticCurveTo(W * 0.50, H * 0.34, W * 0.32, H * 0.43);

                ctx.closePath();

                ctx.fillStyle = ccGrad; ctx.fill();

                ctx.strokeStyle = '#b49de0'; ctx.lineWidth = 1.2; ctx.stroke();

                // Corpus callosum label area

                ctx.font = '7px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#8b6fc080'; ctx.textAlign = 'center';

                ctx.fillText('CC', W * 0.50, H * 0.38);

                ctx.restore();



                // Thalamus (egg shape in center)

                ctx.beginPath();

                ctx.ellipse(W * 0.52, H * 0.44, W * 0.06, H * 0.04, 0, 0, Math.PI * 2);

                ctx.fillStyle = '#fde68a40'; ctx.fill();

                ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1; ctx.stroke();

                ctx.font = '6px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#b4590080'; ctx.textAlign = 'center';

                ctx.fillText('Thalamus', W * 0.52, H * 0.445);



                // Hypothalamus (small oval below)

                ctx.beginPath();

                ctx.ellipse(W * 0.45, H * 0.50, W * 0.03, H * 0.02, 0, 0, Math.PI * 2);

                ctx.fillStyle = '#fecaca40'; ctx.fill();

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 0.8; ctx.stroke();



                // Medial sulci

                ctx.save(); ctx.globalAlpha = 0.15; ctx.strokeStyle = '#9b87c0'; ctx.lineWidth = 0.6;

                ctx.setLineDash([3, 2]);

                // Calcarine sulcus

                ctx.beginPath(); ctx.moveTo(W * 0.72, H * 0.42); ctx.quadraticCurveTo(W * 0.80, H * 0.48, W * 0.84, H * 0.50); ctx.stroke();

                // Cingulate sulcus

                ctx.beginPath();

                ctx.moveTo(W * 0.25, H * 0.30);

                ctx.quadraticCurveTo(W * 0.45, H * 0.18, W * 0.68, H * 0.22);

                ctx.stroke();

                ctx.setLineDash([]);

                ctx.restore();



                // Cerebellum with foliation

                drawCerebellum(W * 0.78, H * 0.68, W * 0.09, H * 0.08);

                // Brainstem with gradient

                drawBrainstem(W * 0.58, H * 0.58, W * 0.62, H * 0.80, W * 0.55, H * 0.80, W * 0.50, H * 0.58);



              } else if (viewKey === 'superior') {

                // ── Superior (Top-Down) View ──

                // Left hemisphere with shadow

                ctx.save();

                ctx.shadowColor = 'rgba(100,70,130,0.12)';

                ctx.shadowBlur = 8;

                ctx.beginPath();

                ctx.ellipse(W * 0.38, H * 0.50, W * 0.18, H * 0.38, 0, 0, Math.PI * 2);

                ctx.fillStyle = brainGrad; ctx.fill();

                ctx.restore();

                // Right hemisphere

                ctx.save();

                ctx.shadowColor = 'rgba(100,70,130,0.12)';

                ctx.shadowBlur = 8;

                ctx.beginPath();

                ctx.ellipse(W * 0.62, H * 0.50, W * 0.18, H * 0.38, 0, 0, Math.PI * 2);

                ctx.fillStyle = brainGrad; ctx.fill();

                ctx.restore();



                // Lobe coloring top-down

                ctx.save(); ctx.globalAlpha = 0.10;

                // Frontal (anterior half)

                ctx.beginPath(); ctx.ellipse(W * 0.38, H * 0.35, W * 0.16, H * 0.22, 0, 0, Math.PI * 2); ctx.fillStyle = '#3b82f6'; ctx.fill();

                ctx.beginPath(); ctx.ellipse(W * 0.62, H * 0.35, W * 0.16, H * 0.22, 0, 0, Math.PI * 2); ctx.fill();

                // Occipital (posterior)

                ctx.beginPath(); ctx.ellipse(W * 0.38, H * 0.72, W * 0.10, H * 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = '#ef4444'; ctx.fill();

                ctx.beginPath(); ctx.ellipse(W * 0.62, H * 0.72, W * 0.10, H * 0.14, 0, 0, Math.PI * 2); ctx.fill();

                ctx.restore();



                // Hemisphere outlines

                ctx.beginPath(); ctx.ellipse(W * 0.38, H * 0.50, W * 0.18, H * 0.38, 0, 0, Math.PI * 2);

                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 2; ctx.stroke();

                ctx.beginPath(); ctx.ellipse(W * 0.62, H * 0.50, W * 0.18, H * 0.38, 0, 0, Math.PI * 2);

                ctx.stroke();



                // Gyri on top surface

                drawGyri(W * 0.38, H * 0.45, W * 0.12, 14, 6);

                drawGyri(W * 0.62, H * 0.45, W * 0.12, 14, 6);



                // Longitudinal fissure (deep shadow line)

                ctx.save();

                ctx.shadowColor = 'rgba(80,50,120,0.2)';

                ctx.shadowBlur = 4;

                ctx.beginPath(); ctx.setLineDash([6, 3]);

                ctx.moveTo(W * 0.50, H * 0.10); ctx.lineTo(W * 0.50, H * 0.90);

                ctx.strokeStyle = '#6d4a8e'; ctx.lineWidth = 2.5; ctx.stroke();

                ctx.restore();

                // Central sulcus (curved)

                ctx.beginPath();

                ctx.moveTo(W * 0.20, H * 0.38);

                ctx.quadraticCurveTo(W * 0.35, H * 0.35, W * 0.50, H * 0.36);

                ctx.quadraticCurveTo(W * 0.65, H * 0.35, W * 0.80, H * 0.38);

                ctx.strokeStyle = '#8b7faa'; ctx.lineWidth = 1; ctx.stroke();

                ctx.setLineDash([]);



                // Additional sulci

                ctx.save(); ctx.globalAlpha = 0.12; ctx.strokeStyle = '#9b87c0'; ctx.lineWidth = 0.5;

                for (var tsi = 0; tsi < 6; tsi++) {

                  var tsAngle = (tsi / 6) * Math.PI * 0.6 + 0.3;

                  ctx.beginPath();

                  ctx.moveTo(W * 0.38 + Math.cos(tsAngle) * W * 0.04, H * 0.50 + Math.sin(tsAngle) * H * 0.08);

                  ctx.lineTo(W * 0.38 + Math.cos(tsAngle) * W * 0.16, H * 0.50 + Math.sin(tsAngle) * H * 0.34);

                  ctx.stroke();

                  ctx.beginPath();

                  ctx.moveTo(W * 0.62 + Math.cos(Math.PI - tsAngle) * W * 0.04, H * 0.50 + Math.sin(tsAngle) * H * 0.08);

                  ctx.lineTo(W * 0.62 + Math.cos(Math.PI - tsAngle) * W * 0.16, H * 0.50 + Math.sin(tsAngle) * H * 0.34);

                  ctx.stroke();

                }

                ctx.restore();



              } else if (viewKey === 'inferior') {

                // ── Inferior (Bottom) View ──

                // Main cerebral base with shadow

                ctx.save();

                ctx.shadowColor = 'rgba(100,70,130,0.15)';

                ctx.shadowBlur = 10;

                ctx.beginPath();

                ctx.ellipse(W * 0.50, H * 0.38, W * 0.30, H * 0.28, 0, 0, Math.PI * 2);

                ctx.fillStyle = brainGrad; ctx.fill();

                ctx.restore();

                ctx.beginPath();

                ctx.ellipse(W * 0.50, H * 0.38, W * 0.30, H * 0.28, 0, 0, Math.PI * 2);

                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 2; ctx.stroke();



                // Temporal lobe regions

                ctx.save(); ctx.globalAlpha = 0.10;

                ctx.beginPath(); ctx.ellipse(W * 0.35, H * 0.35, W * 0.12, H * 0.18, 0.2, 0, Math.PI * 2);

                ctx.fillStyle = '#eab308'; ctx.fill();

                ctx.beginPath(); ctx.ellipse(W * 0.65, H * 0.35, W * 0.12, H * 0.18, -0.2, 0, Math.PI * 2);

                ctx.fill();

                ctx.restore();



                // Gyri on inferior surface

                drawGyri(W * 0.40, H * 0.35, W * 0.12, 8, 5);

                drawGyri(W * 0.60, H * 0.35, W * 0.12, 8, 5);



                // Longitudinal fissure (ventral)

                ctx.beginPath(); ctx.setLineDash([4, 3]);

                ctx.moveTo(W * 0.50, H * 0.12); ctx.lineTo(W * 0.50, H * 0.64);

                ctx.strokeStyle = '#6d4a8e'; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.setLineDash([]);



                // Cerebellum with foliation

                drawCerebellum(W * 0.50, H * 0.72, W * 0.22, H * 0.12);

                // Brainstem

                drawBrainstem(W * 0.46, H * 0.55, W * 0.48, H * 0.68, W * 0.52, H * 0.68, W * 0.54, H * 0.55);



                // Optic chiasm (X shape with nerve paths)

                ctx.save();

                ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;

                // Optic nerves coming in

                ctx.beginPath();

                ctx.moveTo(W * 0.36, H * 0.26); ctx.quadraticCurveTo(W * 0.42, H * 0.28, W * 0.48, H * 0.33);

                ctx.stroke();

                ctx.beginPath();

                ctx.moveTo(W * 0.64, H * 0.26); ctx.quadraticCurveTo(W * 0.58, H * 0.28, W * 0.52, H * 0.33);

                ctx.stroke();

                // The crossing

                ctx.beginPath();

                ctx.moveTo(W * 0.48, H * 0.33); ctx.lineTo(W * 0.55, H * 0.38);

                ctx.moveTo(W * 0.52, H * 0.33); ctx.lineTo(W * 0.45, H * 0.38);

                ctx.lineWidth = 1.5; ctx.stroke();

                // Optic tracts going back

                ctx.beginPath();

                ctx.moveTo(W * 0.45, H * 0.38); ctx.quadraticCurveTo(W * 0.40, H * 0.42, W * 0.38, H * 0.48);

                ctx.stroke();

                ctx.beginPath();

                ctx.moveTo(W * 0.55, H * 0.38); ctx.quadraticCurveTo(W * 0.60, H * 0.42, W * 0.62, H * 0.48);

                ctx.stroke();

                // Label

                ctx.font = '7px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#b4590090'; ctx.textAlign = 'center';

                ctx.fillText('Optic Chiasm', W * 0.50, H * 0.30);

                ctx.restore();



                // Cranial nerve stumps (simplified)

                ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;

                var cnPositions = [[0.42, 0.46], [0.58, 0.46], [0.44, 0.50], [0.56, 0.50], [0.46, 0.54], [0.54, 0.54]];

                cnPositions.forEach(function (cn) {

                  ctx.beginPath();

                  ctx.moveTo(W * cn[0], H * cn[1]);

                  ctx.lineTo(W * (cn[0] + (cn[0] < 0.5 ? -0.04 : 0.04)), H * (cn[1] + 0.02));

                  ctx.stroke();

                });

                ctx.restore();

              } else if (currentView.isNeuron) {

                // ── Action Potential Neuron Animation ──

                var nT = canvas._brainTick;

                var nSpeed = 1;

                var phase = (nT * 0.008 * nSpeed) % 6;

                var phaseNames = ['Resting (-70mV)', 'Stimulus Arrives', 'Depolarization \u2191', 'Overshoot (+30mV)', 'Repolarization \u2193', 'Hyperpolarization'];

                canvas._neuronPhase = phaseNames[Math.floor(phase)];

                var naColor = '#3b82f6';

                var kColor = '#22c55e';



                // Dendrites — recursive branching tree with dendritic spines

                ctx.save();
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';

                // Seeded pseudo-random for consistent shape across frames
                var _dendSeed = 42;
                function dendRand() { _dendSeed = (_dendSeed * 16807 + 0) % 2147483647; return (_dendSeed & 0x7fffffff) / 2147483647; }

                // Draw a single dendritic branch with sub-branches
                function drawDendBranch(x1, y1, x2, y2, depth, maxDepth, branchSeed) {
                  _dendSeed = branchSeed;
                  var lw = 3.0 - depth * 0.8;
                  if (lw < 0.5) lw = 0.5;
                  var alpha = 1.0 - depth * 0.2;
                  if (alpha < 0.3) alpha = 0.3;

                  // Main branch curve
                  var mx = (x1 + x2) / 2 + (dendRand() - 0.5) * W * 0.025;
                  var my = (y1 + y2) / 2 + (dendRand() - 0.5) * H * 0.025;
                  ctx.globalAlpha = alpha;
                  ctx.strokeStyle = depth === 0 ? '#8b5cf6' : depth === 1 ? '#a78bfa' : '#c4b5fd';
                  ctx.lineWidth = lw;
                  ctx.beginPath(); ctx.moveTo(x1, y1);
                  ctx.quadraticCurveTo(mx, my, x2, y2);
                  ctx.stroke();

                  // Dendritic spines (tiny bumps along the branch)
                  if (depth >= 1) {
                    var spineCount = depth === 1 ? 3 : 5;
                    ctx.fillStyle = '#ddd6fe';
                    for (var sp = 0; sp < spineCount; sp++) {
                      var st = 0.2 + (sp / spineCount) * 0.6;
                      var sx = x1 + (x2 - x1) * st + (dendRand() - 0.5) * 3;
                      var sy = y1 + (y2 - y1) * st + (dendRand() - 0.5) * 3;
                      var sDir = dendRand() * Math.PI * 2;
                      var sLen = 2 + dendRand() * 3;
                      // Spine stalk
                      ctx.beginPath();
                      ctx.moveTo(sx, sy);
                      ctx.lineTo(sx + Math.cos(sDir) * sLen, sy + Math.sin(sDir) * sLen);
                      ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 0.5; ctx.stroke();
                      // Spine head
                      ctx.beginPath();
                      ctx.arc(sx + Math.cos(sDir) * sLen, sy + Math.sin(sDir) * sLen, 1.2, 0, Math.PI * 2);
                      ctx.fill();
                    }
                  }

                  // Sub-branches
                  if (depth < maxDepth) {
                    var nBranch = depth === 0 ? 3 : 2;
                    for (var bi = 0; bi < nBranch; bi++) {
                      var t = 0.4 + bi * 0.25;
                      var bx = x1 + (x2 - x1) * t;
                      var by = y1 + (y2 - y1) * t;
                      var baseAngle = Math.atan2(y2 - y1, x2 - x1);
                      var spread = (bi % 2 === 0 ? 1 : -1) * (0.5 + dendRand() * 0.6);
                      var bAngle = baseAngle + spread;
                      var bLen = W * (0.04 - depth * 0.012);
                      if (bLen < W * 0.015) bLen = W * 0.015;
                      var bx2 = bx + Math.cos(bAngle) * bLen;
                      var by2 = by + Math.sin(bAngle) * bLen;
                      drawDendBranch(bx, by, bx2, by2, depth + 1, maxDepth, branchSeed + bi * 137 + depth * 31);
                    }
                  }
                }

                // 5 primary dendrite branches emanating from soma in a fan
                var somaX = W * 0.20, somaY = H * 0.45, somaR = W * 0.06;
                var primaryAngles = [-2.4, -1.8, -1.2, -0.6, -3.0];
                for (var pi3 = 0; pi3 < primaryAngles.length; pi3++) {
                  var pa = primaryAngles[pi3];
                  var startX = somaX + Math.cos(pa) * somaR;
                  var startY = somaY + Math.sin(pa) * somaR;
                  var endX = startX + Math.cos(pa) * W * 0.10;
                  var endY = startY + Math.sin(pa) * H * 0.10;
                  drawDendBranch(startX, startY, endX, endY, 0, 2, 100 + pi3 * 251);
                }

                // Signal pulse traveling along primary branches during stimulus phase
                if (phase > 0.5 && phase < 2) {
                  var pulseT = (phase - 0.5) / 1.5;
                  ctx.globalAlpha = 0.9;
                  for (var pi4 = 0; pi4 < primaryAngles.length; pi4++) {
                    var pa2 = primaryAngles[pi4];
                    var sx2 = somaX + Math.cos(pa2) * somaR;
                    var sy2 = somaY + Math.sin(pa2) * somaR;
                    var ex2 = sx2 + Math.cos(pa2) * W * 0.10;
                    var ey2 = sy2 + Math.sin(pa2) * H * 0.10;
                    // Pulse travels FROM tip TO soma
                    var ppx2 = ex2 + (sx2 - ex2) * pulseT;
                    var ppy2 = ey2 + (sy2 - ey2) * pulseT;
                    // Glow
                    var pGlow = ctx.createRadialGradient(ppx2, ppy2, 1, ppx2, ppy2, 6);
                    pGlow.addColorStop(0, 'rgba(251,191,36,0.8)');
                    pGlow.addColorStop(1, 'rgba(251,191,36,0)');
                    ctx.beginPath(); ctx.arc(ppx2, ppy2, 6, 0, Math.PI * 2);
                    ctx.fillStyle = pGlow; ctx.fill();
                    // Core
                    ctx.beginPath(); ctx.arc(ppx2, ppy2, 3 + Math.sin(nT * 0.1 + pi4) * 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#fbbf24'; ctx.fill();
                  }
                }

                ctx.globalAlpha = 1;
                ctx.restore();



                // Soma

                ctx.save();

                var somaGlow = phase > 1.5 && phase < 3 ? 0.3 : 0;

                if (somaGlow > 0) {

                  var sgr = ctx.createRadialGradient(W*0.20,H*0.45,W*0.02,W*0.20,H*0.45,W*0.10);

                  sgr.addColorStop(0,'rgba(251,191,36,'+somaGlow+')'); sgr.addColorStop(1,'rgba(251,191,36,0)');

                  ctx.beginPath(); ctx.arc(W*0.20,H*0.45,W*0.10,0,Math.PI*2); ctx.fillStyle=sgr; ctx.fill();

                }

                ctx.beginPath(); ctx.arc(W*0.20,H*0.45,W*0.06,0,Math.PI*2);

                var smGr=ctx.createRadialGradient(W*0.19,H*0.43,W*0.01,W*0.20,H*0.45,W*0.06);

                smGr.addColorStop(0,'#ede9fe'); smGr.addColorStop(1,'#c4b5fd');

                ctx.fillStyle=smGr; ctx.fill(); ctx.strokeStyle='#7c3aed'; ctx.lineWidth=2; ctx.stroke();

                ctx.beginPath(); ctx.arc(W*0.20,H*0.45,W*0.025,0,Math.PI*2);

                ctx.fillStyle='#a78bfa'; ctx.fill(); ctx.strokeStyle='#6d28d9'; ctx.lineWidth=1; ctx.stroke();

                ctx.font='bold '+(8*fontScale)+'px Inter,system-ui,sans-serif';

                ctx.fillStyle='#6d28d9'; ctx.textAlign='center'; ctx.fillText('Soma',W*0.20,H*0.58);

                ctx.restore();



                // Axon hillock

                ctx.save();

                ctx.beginPath(); ctx.moveTo(W*0.26,H*0.42); ctx.lineTo(W*0.32,H*0.44);

                ctx.lineTo(W*0.32,H*0.46); ctx.lineTo(W*0.26,H*0.48); ctx.closePath();

                ctx.fillStyle = (phase>2&&phase<4) ? '#fbbf2480' : '#e2e8f0';

                ctx.fill(); ctx.strokeStyle='#7c3aed'; ctx.lineWidth=1.5; ctx.stroke();

                ctx.font=(6*fontScale)+'px Inter,system-ui,sans-serif';

                ctx.fillStyle='#7c3aed80'; ctx.textAlign='center'; ctx.fillText('Hillock',W*0.29,H*0.40);

                ctx.restore();



                // Axon with myelin + nodes

                var axonY=H*0.45, axSx=W*0.32, axEx=W*0.88, nSeg=5;

                var segW2=(axEx-axSx)/nSeg, ndW=segW2*0.12, myW=segW2-ndW;

                ctx.save();

                for(var si2=0;si2<nSeg;si2++){

                  var sx=axSx+si2*segW2;

                  ctx.beginPath(); ctx.roundRect(sx,axonY-H*0.035,myW,H*0.07,6);

                  var mg=ctx.createLinearGradient(sx,axonY-H*0.035,sx,axonY+H*0.035);

                  mg.addColorStop(0,'#f8fafc'); mg.addColorStop(0.5,'#e2e8f0'); mg.addColorStop(1,'#f1f5f9');

                  ctx.fillStyle=mg; ctx.fill(); ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1.2; ctx.stroke();

                  if(si2<nSeg-1){

                    var nx=sx+myW, ndAct=false;

                    if(phase>2){var wp=(phase-2)/3,np=(si2+1)/nSeg;ndAct=Math.abs(wp-np)<0.15;}

                    ctx.beginPath(); ctx.rect(nx,axonY-H*0.03,ndW,H*0.06);

                    ctx.fillStyle=ndAct?'#fbbf2450':'#fef3c750'; ctx.fill();

                    ctx.strokeStyle=ndAct?'#f59e0b':'#d97706'; ctx.lineWidth=1; ctx.stroke();

                    if(ndAct){

                      for(var pi2=0;pi2<4;pi2++){

                        var iT=((nT*0.05*nSpeed+pi2*0.25)%1);

                        var ix2=nx+ndW*0.5+(Math.random()-0.5)*ndW*0.6;

                        var iy2=axonY-H*0.08+iT*H*0.05;

                        ctx.beginPath(); ctx.arc(ix2,iy2,2.5,0,Math.PI*2);

                        ctx.fillStyle=naColor; ctx.globalAlpha=1-iT; ctx.fill(); ctx.globalAlpha=1;

                      }

                      if(phase>3.5){

                        for(var ki2=0;ki2<3;ki2++){

                          var kT2=((nT*0.04*nSpeed+ki2*0.33)%1);

                          var kx2=nx+ndW*0.5+(Math.random()-0.5)*ndW*0.5;

                          var ky2=axonY+H*0.03+kT2*H*0.05;

                          ctx.beginPath(); ctx.arc(kx2,ky2,2.5,0,Math.PI*2);

                          ctx.fillStyle=kColor; ctx.globalAlpha=1-kT2; ctx.fill(); ctx.globalAlpha=1;

                        }

                      }

                    }

                  }

                }

                if(phase>2){

                  var wf=Math.min(1,(phase-2)/3), wx=axSx+wf*(axEx-axSx);

                  var wg=ctx.createRadialGradient(wx,axonY,2,wx,axonY,W*0.04);

                  wg.addColorStop(0,'rgba(249,115,22,0.6)'); wg.addColorStop(1,'rgba(249,115,22,0)');

                  ctx.beginPath(); ctx.arc(wx,axonY,W*0.04,0,Math.PI*2); ctx.fillStyle=wg; ctx.fill();

                }

                ctx.restore();



                // Axon terminal

                ctx.save();

                var tAct=phase>4.5;

                ctx.beginPath(); ctx.arc(W*0.90,H*0.45,W*0.03,0,Math.PI*2);

                var tg=ctx.createRadialGradient(W*0.895,H*0.44,W*0.005,W*0.90,H*0.45,W*0.03);

                tg.addColorStop(0,tAct?'#fde68a':'#ede9fe'); tg.addColorStop(1,tAct?'#f59e0b':'#c4b5fd');

                ctx.fillStyle=tg; ctx.fill(); ctx.strokeStyle='#7c3aed'; ctx.lineWidth=1.5; ctx.stroke();

                for(var vi2=0;vi2<4;vi2++){

                  ctx.beginPath(); ctx.arc(W*0.90+Math.cos(vi2*1.57)*W*0.012,H*0.45+Math.sin(vi2*1.57)*H*0.015,2.5,0,Math.PI*2);

                  ctx.fillStyle=tAct?'#fbbf24':'#ddd6fe'; ctx.fill();

                }

                if(tAct){

                  for(var ri2=0;ri2<5;ri2++){

                    var rT2=((nT*0.03*nSpeed+ri2*0.2)%1);

                    ctx.beginPath(); ctx.arc(W*0.93+rT2*W*0.04,H*0.45+(Math.random()-0.5)*H*0.04,2,0,Math.PI*2);

                    ctx.fillStyle='#a78bfa'; ctx.globalAlpha=1-rT2; ctx.fill(); ctx.globalAlpha=1;

                  }

                }

                ctx.font=(7*fontScale)+'px Inter,system-ui,sans-serif';

                ctx.fillStyle='#7c3aed'; ctx.textAlign='center'; ctx.fillText('Terminal',W*0.90,H*0.58);

                ctx.restore();



                // Labels (enlarged text)

                ctx.save(); ctx.font='bold '+(9*fontScale)+'px Inter,system-ui,sans-serif';

                ctx.fillStyle='#475569'; ctx.textAlign='center';

                ctx.fillText('Myelin Sheath',W*0.50,H*0.34);

                ctx.fillText('Nodes of Ranvier',W*0.50,H*0.61);

                ctx.beginPath(); ctx.moveTo(W*0.50,H*0.355); ctx.lineTo(W*0.50,H*0.40);

                ctx.strokeStyle='#94a3b8'; ctx.lineWidth=0.8; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W*0.50,H*0.59); ctx.lineTo(W*0.50,H*0.53); ctx.stroke();

                ctx.restore();



                // Voltage graph overlay (enlarged)

                ctx.save();

                var gx2=W*0.55,gy2=H*0.64,gw2=W*0.42,gh2=H*0.33;

                ctx.fillStyle='#ffffffee'; ctx.beginPath(); ctx.roundRect(gx2,gy2,gw2,gh2,8); ctx.fill();

                ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=1; ctx.stroke();

                ctx.font='bold '+(10*fontScale)+'px Inter,system-ui,sans-serif';

                ctx.fillStyle='#334155'; ctx.textAlign='left'; ctx.fillText('Membrane Potential (mV)',gx2+8,gy2+14);

                var px2=gx2+gw2*0.15,py2=gy2+22,pw2=gw2*0.80,ph2=gh2-30;

                ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=0.5;

                ctx.beginPath(); ctx.moveTo(px2,py2); ctx.lineTo(px2,py2+ph2); ctx.lineTo(px2+pw2,py2+ph2); ctx.stroke();

                ctx.font='bold '+(7*fontScale)+'px Inter,system-ui,sans-serif'; ctx.fillStyle='#64748b'; ctx.textAlign='right';

                ctx.fillText('+30 mV',px2-3,py2+ph2*0.15); ctx.fillText('0 mV',px2-3,py2+ph2*0.38);

                ctx.fillText('-55 mV',px2-3,py2+ph2*0.58); ctx.fillText('-70 mV',px2-3,py2+ph2*0.70);

                // Resting potential line
                ctx.beginPath(); ctx.setLineDash([3,3]);
                ctx.moveTo(px2,py2+ph2*0.70); ctx.lineTo(px2+pw2,py2+ph2*0.70);
                ctx.strokeStyle='#3b82f650'; ctx.stroke();
                ctx.font=(6*fontScale)+'px Inter,system-ui,sans-serif';
                ctx.fillStyle='#3b82f6'; ctx.textAlign='left'; ctx.fillText('Resting',px2+pw2+3,py2+ph2*0.70);
                ctx.setLineDash([]);

                // Threshold line
                ctx.beginPath(); ctx.setLineDash([3,3]);
                ctx.moveTo(px2,py2+ph2*0.58); ctx.lineTo(px2+pw2,py2+ph2*0.58);
                ctx.strokeStyle='#ef444460'; ctx.stroke(); ctx.setLineDash([]);
                ctx.font='bold '+(7*fontScale)+'px Inter,system-ui,sans-serif';
                ctx.fillStyle='#ef4444'; ctx.textAlign='left'; ctx.fillText('Threshold',px2+pw2+3,py2+ph2*0.58);

                // Action potential curve labels
                var apP=[[0,0.70],[0.15,0.70],[0.25,0.68],[0.35,0.58],[0.42,0.15],[0.48,0.10],[0.55,0.50],[0.65,0.82],[0.78,0.72],[1.0,0.70]];

                ctx.beginPath(); ctx.strokeStyle='#7c3aed'; ctx.lineWidth=2.5;

                apP.forEach(function(p,i){var ppx2=px2+p[0]*pw2,ppy2=py2+p[1]*ph2;if(i===0)ctx.moveTo(ppx2,ppy2);else ctx.lineTo(ppx2,ppy2);}); ctx.stroke();

                // Phase labels on curve
                ctx.font=(6*fontScale)+'px Inter,system-ui,sans-serif'; ctx.textAlign='center';
                ctx.fillStyle='#7c3aed'; ctx.fillText('Depolarization',px2+0.38*pw2,py2+ph2*0.05);
                ctx.fillStyle='#22c55e'; ctx.fillText('Repolarization',px2+0.58*pw2,py2+ph2*0.42);
                ctx.fillStyle='#f59e0b'; ctx.fillText('Hyperpol.',px2+0.72*pw2,py2+ph2*0.90);

                var df=phase/6,di2=Math.min(apP.length-2,Math.floor(df*(apP.length-1))),dt2=(df*(apP.length-1))-di2;

                var dpx=px2+(apP[di2][0]+(apP[di2+1][0]-apP[di2][0])*dt2)*pw2;

                var dpy=py2+(apP[di2][1]+(apP[di2+1][1]-apP[di2][1])*dt2)*ph2;

                ctx.beginPath(); ctx.arc(dpx,dpy,5,0,Math.PI*2); ctx.fillStyle='#7c3aed'; ctx.fill();

                ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();

                ctx.restore();



                // Ion legend (enlarged)

                ctx.save(); ctx.font='bold '+(9*fontScale)+'px Inter,system-ui,sans-serif'; ctx.textAlign='left';

                ctx.beginPath(); ctx.arc(W*0.04,H*0.68,5,0,Math.PI*2); ctx.fillStyle=naColor; ctx.fill();

                ctx.fillStyle='#1e40af'; ctx.fillText('Na\u207A ions (rush in)',W*0.07,H*0.685);

                ctx.beginPath(); ctx.arc(W*0.04,H*0.74,5,0,Math.PI*2); ctx.fillStyle=kColor; ctx.fill();

                ctx.fillStyle='#166534'; ctx.fillText('K\u207A ions (flow out)',W*0.07,H*0.745);

                ctx.beginPath(); ctx.arc(W*0.04,H*0.80,5,0,Math.PI*2); ctx.fillStyle='#fbbf24'; ctx.fill();

                ctx.fillStyle='#92400e'; ctx.fillText('Signal propagation',W*0.07,H*0.805);

                // Key concept: all-or-nothing
                ctx.font='bold '+(8*fontScale)+'px Inter,system-ui,sans-serif';
                ctx.fillStyle='#7c3aed';
                ctx.fillText('\u26A1 All-or-Nothing:',W*0.04,H*0.87);
                ctx.font=(7*fontScale)+'px Inter,system-ui,sans-serif';
                ctx.fillStyle='#475569';
                ctx.fillText('Once threshold (-55mV) is reached,',W*0.04,H*0.90);
                ctx.fillText('the neuron fires at full strength.',W*0.04,H*0.93);
                ctx.fillText('No partial signals!',W*0.04,H*0.96);

                ctx.restore();



                // Phase name overlay (enlarged)

                ctx.save(); var pn=phaseNames[Math.floor(phase)];

                ctx.font='bold '+(12*fontScale)+'px Inter,system-ui,sans-serif';

                var pnW2=ctx.measureText(pn).width+20;

                ctx.beginPath(); ctx.roundRect(W-pnW2-10,6,pnW2,24,8);

                var pc=phase<1?'#64748b':phase<2?'#eab308':phase<4?'#f97316':phase<5?'#22c55e':'#3b82f6';

                ctx.fillStyle=pc+'20'; ctx.fill(); ctx.strokeStyle=pc+'60'; ctx.lineWidth=1; ctx.stroke();

                ctx.fillStyle=pc; ctx.textAlign='center'; ctx.fillText(pn,W-pnW2/2,23);

                ctx.restore();

              } else if (currentView.isSleep) {

                // ── Sleep Stages Hypnogram Animation ──
                var sT = canvas._brainTick;
                var nightDur = 600; // frames for one full night cycle
                var nightProg = (sT % nightDur) / nightDur; // 0..1 = 8 hours of sleep

                // Stage definitions [name, yFraction(0=top/Awake, 1=bottom/N3), color, startPct, endPct for one cycle]
                var sleepCycles = [
                  // ~90 min cycles, 4-5 per night. REM lengthens, SWS shortens across night
                  // Cycle 1 (0-0.19)
                  {s:'Awake',y:0.05,c:'#64748b',t0:0,t1:0.01},
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.01,t1:0.03},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.03,t1:0.08},
                  {s:'N3',y:0.80,c:'#4338ca',t0:0.08,t1:0.14},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.14,t1:0.17},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.17,t1:0.19},
                  // Cycle 2 (0.19-0.40)
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.19,t1:0.21},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.21,t1:0.27},
                  {s:'N3',y:0.80,c:'#4338ca',t0:0.27,t1:0.33},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.33,t1:0.36},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.36,t1:0.40},
                  // Cycle 3 (0.40-0.62)
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.40,t1:0.42},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.42,t1:0.50},
                  {s:'N3',y:0.75,c:'#4338ca',t0:0.50,t1:0.53},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.53,t1:0.57},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.57,t1:0.62},
                  // Cycle 4 (0.62-0.82)
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.62,t1:0.63},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.63,t1:0.72},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.72,t1:0.82},
                  // Cycle 5 (0.82-1.0) - mostly REM and light sleep
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.82,t1:0.84},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.84,t1:0.90},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.90,t1:0.98},
                  {s:'Awake',y:0.05,c:'#64748b',t0:0.98,t1:1.0}
                ];

                // Graph area
                var gxS = W * 0.14, gyS = H * 0.08, gwS = W * 0.80, ghS = H * 0.72;

                // Background
                ctx.save();
                ctx.fillStyle = '#faf8ff';
                ctx.beginPath(); ctx.roundRect(gxS - 8, gyS - 8, gwS + 16, ghS + 16, 8);
                ctx.fill();
                ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke();

                // Title
                ctx.font = 'bold ' + Math.round(14 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#334155'; ctx.textAlign = 'center';
                ctx.fillText('Sleep Hypnogram \u2014 One Night (8 Hours)', W * 0.5, gyS - 16);

                // Y-axis labels
                ctx.font = Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'right';
                var stageLabels = [
                  {name:'Awake',y:0.05,color:'#64748b'},
                  {name:'REM',y:0.15,color:'#a855f7'},
                  {name:'N1',y:0.25,color:'#38bdf8'},
                  {name:'N2',y:0.50,color:'#3b82f6'},
                  {name:'N3/SWS',y:0.80,color:'#4338ca'}
                ];
                stageLabels.forEach(function(sl) {
                  var ly = gyS + sl.y * ghS;
                  ctx.fillStyle = sl.color;
                  ctx.fillText(sl.name, gxS - 12, ly + 3);
                  // Horizontal guide line
                  ctx.beginPath(); ctx.moveTo(gxS, ly); ctx.lineTo(gxS + gwS, ly);
                  ctx.strokeStyle = sl.color + '20'; ctx.lineWidth = 0.5; ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);
                });

                // X-axis hour labels
                ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8';
                ctx.font = Math.round(9 * fontScale) + 'px Inter, system-ui, sans-serif';
                for (var hr = 0; hr <= 8; hr++) {
                  var hx = gxS + (hr / 8) * gwS;
                  ctx.fillText(hr + 'h', hx, gyS + ghS + 16);
                  if (hr > 0) {
                    ctx.beginPath(); ctx.moveTo(hx, gyS); ctx.lineTo(hx, gyS + ghS);
                    ctx.strokeStyle = '#e2e8f030'; ctx.lineWidth = 0.5; ctx.stroke();
                  }
                }

                // Draw the hypnogram as a stepped area chart with glow
                ctx.beginPath();
                ctx.moveTo(gxS, gyS + sleepCycles[0].y * ghS);
                sleepCycles.forEach(function(cyc) {
                  var cx1 = gxS + cyc.t0 * gwS;
                  var cx2 = gxS + cyc.t1 * gwS;
                  var cy2 = gyS + cyc.y * ghS;
                  ctx.lineTo(cx1, cy2);
                  ctx.lineTo(cx2, cy2);
                });
                ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; ctx.stroke();

                // Colored fill bands per stage
                ctx.globalAlpha = 0.12;
                sleepCycles.forEach(function(cyc) {
                  var cx1 = gxS + cyc.t0 * gwS;
                  var cx2 = gxS + cyc.t1 * gwS;
                  var cy2 = gyS + cyc.y * ghS;
                  ctx.fillStyle = cyc.c;
                  ctx.fillRect(cx1, cy2, cx2 - cx1, gyS + ghS - cy2);
                });
                ctx.globalAlpha = 1;

                // Animated tracking dot
                var curCyc = sleepCycles[0];
                for (var ci2 = 0; ci2 < sleepCycles.length; ci2++) {
                  if (nightProg >= sleepCycles[ci2].t0 && nightProg < sleepCycles[ci2].t1) {
                    curCyc = sleepCycles[ci2]; break;
                  }
                }
                var dotX = gxS + nightProg * gwS;
                var dotY = gyS + curCyc.y * ghS;

                // Dot glow
                var dGlow = ctx.createRadialGradient(dotX, dotY, 2, dotX, dotY, 12);
                dGlow.addColorStop(0, curCyc.c + 'cc');
                dGlow.addColorStop(1, curCyc.c + '00');
                ctx.beginPath(); ctx.arc(dotX, dotY, 12, 0, Math.PI * 2);
                ctx.fillStyle = dGlow; ctx.fill();

                // Dot core
                ctx.beginPath(); ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
                ctx.fillStyle = curCyc.c; ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

                // Current stage label
                ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                var curLabel = curCyc.s + ' \u2014 ' + (nightProg * 8).toFixed(1) + 'h';
                var clW = ctx.measureText(curLabel).width + 16;
                ctx.beginPath(); ctx.roundRect(dotX - clW/2, dotY - 24, clW, 16, 4);
                ctx.fillStyle = curCyc.c; ctx.fill();
                ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
                ctx.fillText(curLabel, dotX, dotY - 12);

                // Cycle markers
                ctx.font = Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
                var cycleStarts = [0, 0.19, 0.40, 0.62, 0.82];
                cycleStarts.forEach(function(cs, ci3) {
                  if (ci3 > 0) {
                    var csx = gxS + cs * gwS;
                    ctx.beginPath(); ctx.moveTo(csx, gyS); ctx.lineTo(csx, gyS + ghS);
                    ctx.strokeStyle = '#cbd5e160'; ctx.lineWidth = 1; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
                    ctx.fillText('Cycle ' + (ci3 + 1), csx, gyS + ghS + 28);
                  }
                });
                ctx.fillText('Cycle 1', gxS + 0.095 * gwS, gyS + ghS + 28);

                // Legend
                ctx.font = 'bold ' + Math.round(9 * fontScale) + 'px Inter, system-ui, sans-serif';
                var legendY = H * 0.92;
                var legendItems = [
                  {name:'Awake',c:'#64748b'},{name:'REM',c:'#a855f7'},{name:'N1',c:'#38bdf8'},{name:'N2',c:'#3b82f6'},{name:'N3/SWS',c:'#4338ca'}
                ];
                var lx = W * 0.10;
                legendItems.forEach(function(li) {
                  ctx.beginPath(); ctx.arc(lx, legendY, 4, 0, Math.PI * 2);
                  ctx.fillStyle = li.c; ctx.fill();
                  ctx.fillStyle = li.c; ctx.textAlign = 'left';
                  ctx.fillText(li.name, lx + 7, legendY + 3);
                  lx += ctx.measureText(li.name).width + 22;
                });

                ctx.restore();

              } else if (currentView.isEEG) {

                // ── EEG Waves Real-Time Animation with Activity Modes ──
                var eT = canvas._brainTick;
                var eSpeed = 0.03;

                // Activity mode amplitude multipliers: [delta, theta, alpha, beta, gamma]
                var EEG_ACTIVITIES = {
                  resting:     { label: 'Resting',     mults: [0.3, 0.5, 1.0, 0.4, 0.2] },
                  sleeping:    { label: 'Sleeping',    mults: [1.0, 0.7, 0.2, 0.1, 0.05] },
                  studying:    { label: 'Studying',    mults: [0.1, 0.3, 0.4, 1.0, 0.7] },
                  exercise:    { label: 'Exercise',    mults: [0.1, 0.2, 0.3, 1.0, 0.5] },
                  meditating:  { label: 'Meditating',  mults: [0.4, 0.9, 1.0, 0.2, 0.6] }
                };
                var eegActivity = canvas._eegActivity || 'resting';
                var actMults = EEG_ACTIVITIES[eegActivity].mults;

                // Base wave definitions modulated by activity
                var eegBands = [
                  { name: 'Delta (0.5\u20134 Hz)', freq: 1.5, amp: 0.08 * actMults[0], color: '#4338ca', yc: 0.12, desc: EEG_ACTIVITIES[eegActivity].label === 'Sleeping' ? '\u2B06 Dominant' : 'Deep Sleep' },
                  { name: 'Theta (4\u20138 Hz)', freq: 4, amp: 0.06 * actMults[1], color: '#0ea5e9', yc: 0.32, desc: EEG_ACTIVITIES[eegActivity].label === 'Meditating' ? '\u2B06 Enhanced' : 'Drowsiness' },
                  { name: 'Alpha (8\u201313 Hz)', freq: 8, amp: 0.045 * actMults[2], color: '#22c55e', yc: 0.52, desc: EEG_ACTIVITIES[eegActivity].label === 'Resting' ? '\u2B06 Dominant' : 'Relaxed' },
                  { name: 'Beta (13\u201330 Hz)', freq: 16, amp: 0.03 * actMults[3], color: '#f59e0b', yc: 0.72, desc: (eegActivity === 'studying' || eegActivity === 'exercise') ? '\u2B06 Dominant' : 'Active' },
                  { name: 'Gamma (30\u2013100 Hz)', freq: 35, amp: 0.018 * actMults[4], color: '#ef4444', yc: 0.90, desc: eegActivity === 'studying' ? '\u2B06 Enhanced' : 'Focus' }
                ];

                // Title with activity mode
                ctx.font = 'bold ' + Math.round(14 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#334155'; ctx.textAlign = 'center';
                ctx.fillText('EEG \u2014 ' + EEG_ACTIVITIES[eegActivity].label + ' Brain Activity', W * 0.5, H * 0.04);

                // Activity mode selector buttons (drawn on canvas)
                var actKeys = Object.keys(EEG_ACTIVITIES);
                var actBtnW = W * 0.14;
                var actBtnH = 16;
                var actBtnY = H * 0.055;
                var actTotalW = actKeys.length * actBtnW + (actKeys.length - 1) * 6;
                var actStartX = (W - actTotalW) / 2;
                canvas._eegBtnRects = [];
                ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                actKeys.forEach(function(ak, ai) {
                  var bx = actStartX + ai * (actBtnW + 6);
                  var isAct = eegActivity === ak;
                  ctx.beginPath(); ctx.roundRect(bx, actBtnY, actBtnW, actBtnH, 4);
                  ctx.fillStyle = isAct ? '#7c3aed' : '#f1f5f9';
                  ctx.fill();
                  ctx.strokeStyle = isAct ? '#6d28d9' : '#cbd5e1'; ctx.lineWidth = 1; ctx.stroke();
                  ctx.fillStyle = isAct ? '#fff' : '#64748b'; ctx.textAlign = 'center';
                  ctx.fillText(EEG_ACTIVITIES[ak].label, bx + actBtnW / 2, actBtnY + 11);
                  canvas._eegBtnRects.push({ key: ak, x: bx / W, y: actBtnY / H, w: actBtnW / W, h: actBtnH / H });
                });

                // Draw each EEG channel
                var eMarginL = W * 0.18;
                var eTraceW = W * 0.76;
                var eChanH = H * 0.16;

                eegBands.forEach(function(band) {
                  var yBase = band.yc * H;

                  // Channel background
                  ctx.save();
                  ctx.fillStyle = band.color + '08';
                  ctx.beginPath(); ctx.roundRect(eMarginL - 4, yBase - eChanH * 0.5, eTraceW + 8, eChanH, 4);
                  ctx.fill();
                  ctx.strokeStyle = band.color + '20'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Label
                  ctx.font = 'bold ' + Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.fillStyle = band.color; ctx.textAlign = 'right';
                  ctx.fillText(band.name, eMarginL - 10, yBase - 4);
                  ctx.font = Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.fillStyle = band.color + '99';
                  ctx.fillText(band.desc, eMarginL - 10, yBase + 8);

                  // Baseline
                  ctx.beginPath(); ctx.moveTo(eMarginL, yBase); ctx.lineTo(eMarginL + eTraceW, yBase);
                  ctx.strokeStyle = band.color + '15'; ctx.lineWidth = 0.5; ctx.setLineDash([2,2]); ctx.stroke(); ctx.setLineDash([]);

                  // EEG waveform — scrolling sine with harmonics
                  ctx.beginPath();
                  var nPts = 300;
                  for (var ei = 0; ei <= nPts; ei++) {
                    var ex = eMarginL + (ei / nPts) * eTraceW;
                    var tOff = eT * eSpeed + ei * 0.02;
                    // Main wave + harmonic for realistic EEG appearance
                    var ey = yBase
                      + Math.sin(tOff * band.freq * 0.5) * H * band.amp
                      + Math.sin(tOff * band.freq * 1.3 + 1.2) * H * band.amp * 0.3
                      + Math.sin(tOff * band.freq * 2.7 + 3.1) * H * band.amp * 0.12;
                    if (ei === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
                  }
                  ctx.strokeStyle = band.color; ctx.lineWidth = 1.8; ctx.stroke();

                  // Glow effect on the wave
                  ctx.save();
                  ctx.globalAlpha = 0.15;
                  ctx.strokeStyle = band.color; ctx.lineWidth = 4; ctx.stroke();
                  ctx.restore();

                  // Amplitude scale bar
                  ctx.beginPath();
                  ctx.moveTo(eMarginL + eTraceW + 6, yBase - H * band.amp);
                  ctx.lineTo(eMarginL + eTraceW + 6, yBase + H * band.amp);
                  ctx.strokeStyle = band.color + '40'; ctx.lineWidth = 1; ctx.stroke();
                  // Scale ticks
                  ctx.beginPath();
                  ctx.moveTo(eMarginL + eTraceW + 3, yBase - H * band.amp);
                  ctx.lineTo(eMarginL + eTraceW + 9, yBase - H * band.amp);
                  ctx.moveTo(eMarginL + eTraceW + 3, yBase + H * band.amp);
                  ctx.lineTo(eMarginL + eTraceW + 9, yBase + H * band.amp);
                  ctx.stroke();

                  ctx.restore();
                });

                // Time scale bar (bottom)
                ctx.save();
                ctx.font = Math.round(9 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
                ctx.fillText('1 second', eMarginL + eTraceW * 0.85, H * 0.98);
                // Scale bar line
                var scaleW = eTraceW * 0.12;
                ctx.beginPath();
                ctx.moveTo(eMarginL + eTraceW * 0.79, H * 0.965);
                ctx.lineTo(eMarginL + eTraceW * 0.91, H * 0.965);
                ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
                // End ticks
                ctx.beginPath();
                ctx.moveTo(eMarginL + eTraceW * 0.79, H * 0.96); ctx.lineTo(eMarginL + eTraceW * 0.79, H * 0.97);
                ctx.moveTo(eMarginL + eTraceW * 0.91, H * 0.96); ctx.lineTo(eMarginL + eTraceW * 0.91, H * 0.97);
                ctx.stroke();
                ctx.restore();

              } else if (currentView.isCrossLateral) {

                // ── Cross-Lateralization (Coronal View) ──
                var clT = canvas._brainTick;

                // Background — faint grid
                ctx.save(); ctx.globalAlpha = 0.04; ctx.strokeStyle = '#6d5a8f';
                for (var gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
                for (var gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
                ctx.restore();

                // Title
                ctx.font = 'bold ' + Math.round(16 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#7c3aed'; ctx.textAlign = 'center';
                ctx.fillText('CROSS-LATERALIZATION', W * 0.5, H * 0.045);
                ctx.font = Math.round(9 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText('Each hemisphere controls the OPPOSITE side of the body', W * 0.5, H * 0.075);

                // ── Coronal brain silhouette ──
                var brCx = W * 0.5, brCy = H * 0.32, brRx = W * 0.30, brRy = H * 0.22;

                // Left hemisphere
                ctx.save();
                ctx.shadowColor = 'rgba(100,70,160,0.15)'; ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.ellipse(brCx - brRx * 0.52, brCy, brRx * 0.52, brRy, 0, 0, Math.PI * 2);
                var lhGrad = ctx.createRadialGradient(brCx - brRx * 0.52, brCy - brRy * 0.2, brRx * 0.1, brCx - brRx * 0.52, brCy, brRx * 0.52);
                lhGrad.addColorStop(0, '#f3eeff'); lhGrad.addColorStop(1, '#e0d4f5');
                ctx.fillStyle = lhGrad; ctx.fill();
                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();

                // Right hemisphere
                ctx.save();
                ctx.shadowColor = 'rgba(100,70,160,0.15)'; ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.ellipse(brCx + brRx * 0.52, brCy, brRx * 0.52, brRy, 0, 0, Math.PI * 2);
                var rhGrad = ctx.createRadialGradient(brCx + brRx * 0.52, brCy - brRy * 0.2, brRx * 0.1, brCx + brRx * 0.52, brCy, brRx * 0.52);
                rhGrad.addColorStop(0, '#f3eeff'); rhGrad.addColorStop(1, '#e0d4f5');
                ctx.fillStyle = rhGrad; ctx.fill();
                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();

                // Midline fissure
                ctx.save();
                ctx.beginPath(); ctx.setLineDash([4, 3]);
                ctx.moveTo(brCx, brCy - brRy - 5); ctx.lineTo(brCx, brCy + brRy + 5);
                ctx.strokeStyle = '#6d4a8e'; ctx.lineWidth = 2; ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();

                // Hemisphere labels — positioned well above the brain ellipses
                ctx.font = 'bold ' + Math.round(12 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#7c3aed'; ctx.textAlign = 'center';
                ctx.fillText('LEFT', brCx - brRx * 0.52, brCy - brRy - 14);
                ctx.fillText('RIGHT', brCx + brRx * 0.52, brCy - brRy - 14);

                // Corpus callosum (connecting bridge)
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(brCx, brCy - brRy * 0.05, brRx * 0.30, brRy * 0.12, 0, 0, Math.PI * 2);
                var ccGrad = ctx.createLinearGradient(brCx - brRx * 0.3, brCy, brCx + brRx * 0.3, brCy);
                ccGrad.addColorStop(0, '#ddd6fe'); ccGrad.addColorStop(0.5, '#f5f3ff'); ccGrad.addColorStop(1, '#ddd6fe');
                ctx.fillStyle = ccGrad; ctx.fill();
                ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.font = Math.round(9 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#7c3aed80'; ctx.textAlign = 'center';
                ctx.fillText('Corpus Callosum', brCx, brCy + 3);
                ctx.restore();

                // Brainstem + medulla below
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(brCx - 12, brCy + brRy);
                ctx.quadraticCurveTo(brCx - 14, brCy + brRy + 40, brCx - 8, H * 0.78);
                ctx.lineTo(brCx + 8, H * 0.78);
                ctx.quadraticCurveTo(brCx + 14, brCy + brRy + 40, brCx + 12, brCy + brRy);
                ctx.closePath();
                var bsGrad = ctx.createLinearGradient(brCx, brCy + brRy, brCx, H * 0.78);
                bsGrad.addColorStop(0, '#e8e0f0'); bsGrad.addColorStop(1, '#d4c8e8');
                ctx.fillStyle = bsGrad; ctx.fill();
                ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5; ctx.stroke();
                // Medulla pyramids label — offset to the right to avoid pathway overlap
                ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#7c3aed'; ctx.textAlign = 'left';
                var medLabelX = brCx + 16;
                var medLabelY = H * 0.73;
                // Background pill for readability
                var medTW = ctx.measureText('Medulla Pyramids').width + 8;
                ctx.beginPath(); ctx.roundRect(medLabelX - 4, medLabelY - 8, medTW, 13, 3);
                ctx.fillStyle = '#f5f3ffdd'; ctx.fill();
                ctx.strokeStyle = '#a78bfa40'; ctx.lineWidth = 0.5; ctx.stroke();
                ctx.fillStyle = '#7c3aedb0'; ctx.textAlign = 'left';
                ctx.fillText('Medulla Pyramids', medLabelX, medLabelY + 2);
                ctx.restore();

                // ── Crossing Pathways with animated pulses ──
                function drawCrossingPathway(fromX, fromY, crossY, toX, toY, color, label, pulseOffset) {
                  // Upper segment (ipsilateral)
                  ctx.beginPath();
                  ctx.moveTo(fromX, fromY);
                  ctx.quadraticCurveTo(fromX, crossY - 15, brCx, crossY);
                  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7; ctx.stroke();

                  // Lower segment (contralateral — crosses midline)
                  ctx.beginPath();
                  ctx.moveTo(brCx, crossY);
                  ctx.quadraticCurveTo(toX, crossY + 15, toX, toY);
                  ctx.stroke();
                  ctx.globalAlpha = 1;

                  // Animated pulse
                  var pulsePhase = ((clT * 0.012 + pulseOffset) % 2.0);
                  if (pulsePhase < 1) {
                    var t = pulsePhase;
                    var px, py;
                    if (t < 0.5) {
                      // Upper segment
                      var t2 = t * 2;
                      px = fromX + (brCx - fromX) * t2;
                      py = fromY + (crossY - fromY) * t2;
                    } else {
                      // Lower segment
                      var t2 = (t - 0.5) * 2;
                      px = brCx + (toX - brCx) * t2;
                      py = crossY + (toY - crossY) * t2;
                    }
                    // Glow
                    ctx.save();
                    var pGlow = ctx.createRadialGradient(px, py, 1, px, py, 8);
                    pGlow.addColorStop(0, color); pGlow.addColorStop(1, color.slice(0, 7) + '00');
                    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
                    ctx.fillStyle = pGlow; ctx.fill();
                    // Core dot
                    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff'; ctx.fill();
                    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = color; ctx.fill();
                    ctx.restore();
                  }

                  // Crossing node (X mark at midline)
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(brCx, crossY, 4, 0, Math.PI * 2);
                  ctx.fillStyle = color; ctx.globalAlpha = 0.5; ctx.fill();
                  ctx.restore();
                }

                ctx.save();
                // Motor pathway: Left motor cortex → crosses at medullary pyramids → Right body
                drawCrossingPathway(
                  brCx - brRx * 0.35, brCy - brRy * 0.6,  // Left motor cortex
                  H * 0.72,  // Cross at medullary pyramids
                  brCx + W * 0.25, H * 0.92,  // Right body
                  '#ef4444', 'Motor', 0
                );
                // Motor: Right motor cortex → Left body
                drawCrossingPathway(
                  brCx + brRx * 0.35, brCy - brRy * 0.6,
                  H * 0.72,
                  brCx - W * 0.25, H * 0.92,
                  '#ef4444', 'Motor', 0.7
                );

                // Sensory pathway: Right body → crosses at medial lemniscus → Left cortex
                drawCrossingPathway(
                  brCx + W * 0.22, H * 0.88,
                  H * 0.64,
                  brCx - brRx * 0.40, brCy + brRy * 0.1,
                  '#3b82f6', 'Sensory', 0.35
                );
                // Sensory: Left body → Right cortex
                drawCrossingPathway(
                  brCx - W * 0.22, H * 0.88,
                  H * 0.64,
                  brCx + brRx * 0.40, brCy + brRy * 0.1,
                  '#3b82f6', 'Sensory', 1.05
                );

                // Visual pathway: partial crossing at optic chiasm
                drawCrossingPathway(
                  brCx - W * 0.28, brCy + brRy * 0.5,  // Left eye
                  brCy + brRy + 10,  // Optic chiasm
                  brCx + brRx * 0.45, brCy,  // Right occipital
                  '#22c55e', 'Visual (nasal)', 0.5
                );
                drawCrossingPathway(
                  brCx + W * 0.28, brCy + brRy * 0.5,
                  brCy + brRy + 10,
                  brCx - brRx * 0.45, brCy,
                  '#22c55e', 'Visual (nasal)', 1.2
                );
                ctx.restore();

                // ── Language lateralization highlight (left hemisphere) ──
                ctx.save();
                ctx.globalAlpha = 0.12;
                ctx.beginPath();
                ctx.ellipse(brCx - brRx * 0.45, brCy - brRy * 0.15, brRx * 0.22, brRy * 0.45, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#f59e0b'; ctx.fill();
                ctx.restore();
                ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#b45900cc'; ctx.textAlign = 'center';
                ctx.fillText('Broca\u2019s', brCx - brRx * 0.65, brCy - brRy * 0.50);
                ctx.fillText('Wernicke\u2019s', brCx - brRx * 0.25, brCy + brRy * 0.25);

                // ── Legend (two rows to avoid cramping) ──
                var legItems = [
                  { color: '#ef4444', label: 'Motor (corticospinal)' },
                  { color: '#3b82f6', label: 'Sensory (DCML)' },
                  { color: '#22c55e', label: 'Visual (optic)' },
                  { color: '#f59e0b', label: 'Language (left-dominant)' }
                ];
                ctx.font = Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                // Row 1: Motor + Sensory
                var legRow1 = legItems.slice(0, 2);
                var legRow1W = 0;
                legRow1.forEach(function(li) { legRow1W += ctx.measureText(li.label).width + 30; });
                var legX1 = (W - legRow1W) / 2;
                var legY1 = H * 0.82;
                legRow1.forEach(function(li) {
                  ctx.beginPath(); ctx.arc(legX1 + 5, legY1, 4, 0, Math.PI * 2);
                  ctx.fillStyle = li.color; ctx.fill();
                  ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';
                  ctx.fillText(li.label, legX1 + 13, legY1 + 4);
                  legX1 += ctx.measureText(li.label).width + 30;
                });
                // Row 2: Visual + Language
                var legRow2 = legItems.slice(2, 4);
                var legRow2W = 0;
                legRow2.forEach(function(li) { legRow2W += ctx.measureText(li.label).width + 30; });
                var legX2 = (W - legRow2W) / 2;
                var legY2 = H * 0.86;
                legRow2.forEach(function(li) {
                  ctx.beginPath(); ctx.arc(legX2 + 5, legY2, 4, 0, Math.PI * 2);
                  ctx.fillStyle = li.color; ctx.fill();
                  ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';
                  ctx.fillText(li.label, legX2 + 13, legY2 + 4);
                  legX2 += ctx.measureText(li.label).width + 30;
                });

                // Body silhouette labels at bottom — pushed below legend rows
                ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
                ctx.fillText('\u2190 LEFT BODY', brCx - W * 0.30, H * 0.92);
                ctx.fillText('RIGHT BODY \u2192', brCx + W * 0.30, H * 0.92);

              }



              ctx.restore();



              // ── Enhanced Region Markers (anatomical views only) ──
              if (!currentView.isNeuron && !currentView.isNT && !currentView.isSleep && !currentView.isEEG)
              filtered.forEach(function (r) {

                var px = r.x * W, py = r.y * H;

                var isSel = sel && sel.id === r.id;

                var rad = isSel ? 10 : 5;

                // Animated pulsing ring for selected

                if (isSel) {

                  var pulse = 1.0 + Math.sin(canvas._brainTick * 0.06) * 0.3;

                  ctx.save();

                  ctx.globalAlpha = 0.3 - pulse * 0.1;

                  ctx.beginPath(); ctx.arc(px, py, rad + 6 + pulse * 4, 0, Math.PI * 2);

                  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5; ctx.stroke();

                  ctx.restore();

                  // Inner glow

                  ctx.save();

                  var selGlow = ctx.createRadialGradient(px, py, rad * 0.3, px, py, rad + 4);

                  selGlow.addColorStop(0, '#7c3aed50');

                  selGlow.addColorStop(1, '#7c3aed00');

                  ctx.beginPath(); ctx.arc(px, py, rad + 4, 0, Math.PI * 2);

                  ctx.fillStyle = selGlow; ctx.fill();

                  ctx.restore();

                }

                // Marker dot (gradient sphere)

                var mGrad = ctx.createRadialGradient(px - 1, py - 1, 1, px, py, rad);

                mGrad.addColorStop(0, isSel ? '#a78bfa' : '#c4b5fd');

                mGrad.addColorStop(1, isSel ? '#7c3aed' : '#8b5cf6');

                ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2);

                ctx.fillStyle = mGrad; ctx.fill();

                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

                // Label with leader line + tooltip pill

                if (isSel) {

                  ctx.save();

                  var isRight = px > W * 0.5;

                  var labelX = isRight ? px - 18 : px + 18;

                  ctx.font = 'bold 9px Inter, system-ui, sans-serif';

                  var tw = ctx.measureText(r.name).width;

                  var pillX = isRight ? labelX - tw - 8 : labelX - 4;

                  var pillY = py - 7;

                  // Leader line

                  ctx.beginPath();

                  ctx.moveTo(px + (isRight ? -rad - 2 : rad + 2), py);

                  ctx.lineTo(isRight ? pillX + tw + 8 : pillX, py);

                  ctx.strokeStyle = '#7c3aed60'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);

                  // Tooltip pill background

                  ctx.beginPath();

                  ctx.roundRect(pillX, pillY, tw + 10, 15, 4);

                  ctx.fillStyle = '#7c3aed'; ctx.fill();

                  ctx.shadowColor = 'rgba(124,58,237,0.25)'; ctx.shadowBlur = 4;

                  // Label text

                  ctx.textAlign = isRight ? 'right' : 'left';

                  ctx.fillStyle = '#fff';

                  ctx.fillText(r.name, isRight ? pillX + tw + 5 : pillX + 5, py + 3);

                  ctx.restore();

                }

              });

              // ── Styled View Label ──

              ctx.save();

              var viewLabel = currentView.name.toUpperCase() + ' VIEW';

              ctx.font = 'bold 9px Inter, system-ui, sans-serif';

              var vlW = ctx.measureText(viewLabel).width + 16;

              ctx.beginPath();

              ctx.roundRect(W * 0.5 - vlW / 2, H - 18, vlW, 14, 4);

              ctx.fillStyle = '#f8fafc'; ctx.fill();

              ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5; ctx.stroke();

              ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';

              ctx.fillText(viewLabel, W * 0.5, H - 8);

              ctx.restore();



              // Continue animation

              canvas._brainAnim = requestAnimationFrame(drawBrainFrame);

            };

            drawBrainFrame();

          };

          var handleClick = function (e) {

            var rect = e.target.getBoundingClientRect();

            var cx = (e.clientX - rect.left) / rect.width;

            var cy = (e.clientY - rect.top) / rect.height;

            // EEG activity mode button click detection
            var canvas = e.target;
            if (canvas._eegBtnRects && currentView.isEEG) {
              for (var bi = 0; bi < canvas._eegBtnRects.length; bi++) {
                var btn = canvas._eegBtnRects[bi];
                if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
                  canvas._eegActivity = btn.key;
                  return; // handled by EEG button
                }
              }
            }

            var closest = null, minD = 0.08;

            filtered.forEach(function (r) {

              var dist = Math.sqrt(Math.pow(r.x - cx, 2) + Math.pow(r.y - cy, 2));

              if (dist < minD) { minD = dist; closest = r; }

            });

            if (closest) upd('selectedRegion', closest.id);

          };



          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },

            // Header

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("div", null,

                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDDE0 Brain Atlas"),

                React.createElement("p", { className: "text-xs text-slate-500" }, currentView.desc)

              )

            ),

            // View tabs

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

              Object.keys(VIEWS).map(function (key) {

                var v = VIEWS[key];

                return React.createElement("button", { "aria-label": "Change view",

                  key: key,

                  onClick: function () { upd('view', key); upd('selectedRegion', null); upd('quizMode', false); upd('search', ''); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (viewKey === key ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-purple-50 border border-slate-200')

                }, v.name);

              })

            ),

            // Controls

            React.createElement("div", { className: "flex items-center gap-2 mb-3 flex-wrap" },

              React.createElement("input", {

                type: "text", placeholder: "\uD83D\uDD0D Search regions, functions, conditions...",

                value: d.search || '',

                onChange: function (e) { upd('search', e.target.value); },

                className: "flex-1 min-w-[160px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"

              }),

              React.createElement("button", { "aria-label": "Change quiz mode",

                onClick: function () { upd('quizMode', !d.quizMode); upd('quizIdx', 0); upd('quizScore', 0); upd('quizFeedback', null); },

                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.quizMode ? 'bg-green-700 text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100')

              }, d.quizMode ? '\u2705 Quiz On' : '\uD83E\uDDEA Quiz'),

              React.createElement("span", { className: "text-[10px] text-slate-500 font-bold" }, filtered.length + ' regions')

            ),

            // Main: canvas (full width) + detail below

            React.createElement("div", { className: "space-y-3" },

              // ─── Simulation scenario buttons (NT view only) ───

              currentView.isNT && React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                SIM_SCENARIOS.map(function (s) {

                  var isActive = simScenario === s.id;

                  return React.createElement("button", { "aria-label": "Change sim scenario",

                    key: s.id,

                    onClick: function () { upd('simScenario', s.id); },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 " +

                      (isActive ? 'text-white shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'),

                    style: isActive ? { background: s.color, borderColor: s.color } : {}

                  }, s.icon + ' ' + s.name);

                })

              ),

              // ─── Canvas ───

              React.createElement("div", { style: { display: 'flex', justifyContent: 'center' } },

                React.createElement("canvas", {

                  ref: canvasRef,

                  width: (currentView.isNT || currentView.isNeuron || currentView.isSleep || currentView.isEEG || currentView.isCrossLateral) ? 600 : 520,

                  height: (currentView.isNT || currentView.isNeuron || currentView.isSleep || currentView.isEEG || currentView.isCrossLateral) ? 500 : 460,

                  onClick: handleClick,

                  className: "rounded-xl border-2 border-purple-200 cursor-crosshair",

                  style: { background: '#faf8ff', maxWidth: '100%' }

                })

              ),

              // ─── Simulation description panel (NT view only) ───

              currentView.isNT && React.createElement("div", {

                className: "rounded-xl border-2 p-3",

                style: { borderColor: activeSim.color + '44', background: activeSim.color + '0a' }

              },

                React.createElement("div", { className: "flex items-start gap-2" },

                  React.createElement("span", { className: "text-lg flex-shrink-0" }, activeSim.icon),

                  React.createElement("div", null,

                    React.createElement("p", {

                      className: "text-sm font-black mb-1",

                      style: { color: activeSim.color }

                    }, activeSim.name + ' Mode'),

                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, activeSim.desc),

                    simScenario !== 'normal' && React.createElement("div", {

                      className: "mt-2 rounded-lg p-2 border",

                      style: { background: '#fef3c720', borderColor: '#f59e0b33' }

                    },

                      React.createElement("p", { className: "text-[10px] font-bold text-amber-700 uppercase mb-0.5" }, "\u26A0\uFE0F Tolerance \u0026 Receptor Desensitization"),

                      React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed" },

                        "With repeated exposure, postsynaptic receptors undergo downregulation \u2014 the cell reduces receptor density or sensitivity (internalization) to compensate for excess stimulation. This means higher doses are needed to achieve the same effect, driving the cycle of tolerance and dependence. Abrupt cessation can cause withdrawal as the nervous system has adapted to the drug\u2019s presence."

                      )

                    )

                  )

                )

              ),

              // ─── Action Potential Education Panel (Neuron view only) ───
              currentView.isNeuron && React.createElement("div", {
                className: "rounded-xl border-2 border-purple-200 p-4 space-y-3",
                style: { background: 'linear-gradient(135deg, #faf5ff, #f0f0ff)' }
              },
                React.createElement("h4", { className: "text-sm font-black text-purple-800 flex items-center gap-2" }, "\u26A1 How Neurons Fire: The Action Potential"),
                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2" },
                  React.createElement("div", { className: "rounded-lg bg-white p-3 border border-purple-100" },
                    React.createElement("p", { className: "text-[10px] font-bold text-purple-600 uppercase mb-1" }, "\uD83E\uDDEA Ion Chemistry"),
                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, "At rest, the neuron is polarized at -70mV. Na\u207A (sodium) is concentrated outside; K\u207A (potassium) inside. The Na\u207A/K\u207A pump maintains this gradient using ATP energy (3 Na\u207A out, 2 K\u207A in).")
                  ),
                  React.createElement("div", { className: "rounded-lg bg-white p-3 border border-purple-100" },
                    React.createElement("p", { className: "text-[10px] font-bold text-orange-600 uppercase mb-1" }, "\u26A1 All-or-Nothing Firing"),
                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, "When stimulation reaches threshold (-55mV), voltage-gated Na\u207A channels open and the neuron fires at FULL strength. There is no \u201Chalf\u201D signal \u2014 it either fires completely or not at all. Stronger stimuli increase firing RATE, not intensity.")
                  ),
                  React.createElement("div", { className: "rounded-lg bg-white p-3 border border-purple-100" },
                    React.createElement("p", { className: "text-[10px] font-bold text-green-600 uppercase mb-1" }, "\uD83D\uDD04 Recovery Cycle"),
                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, "After firing: Na\u207A channels close, K\u207A channels open \u2192 repolarization. The membrane briefly overshoots to -80mV (hyperpolarization), creating a refractory period where the neuron cannot fire again. This ensures one-way signal travel.")
                  )
                ),
                React.createElement("p", { className: "text-[10px] text-purple-500 italic text-center" }, "Saltatory conduction: signals \u201Cjump\u201D between Nodes of Ranvier along the myelinated axon, increasing speed from ~2 m/s to ~120 m/s.")
              ),

              // ─── Detail panel (below canvas) ───

              d.quizMode ? (

                quizQ ? React.createElement("div", { className: "bg-white rounded-xl border-2 border-green-200 p-4 space-y-3" },

                  React.createElement("div", { className: "flex items-center justify-between mb-2" },

                    React.createElement("h4", { className: "font-bold text-green-800 text-sm" }, "\uD83E\uDDE0 Brain Quiz"),

                    React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700" }, "\u2B50 " + (d.quizScore || 0))

                  ),

                  React.createElement("p", { className: "text-sm text-slate-800 font-bold" }, "What happens when this region is damaged?"),

                  React.createElement("p", { className: "text-xs text-purple-700 bg-purple-50 rounded-lg p-3 font-bold" }, quizQ.name),

                  React.createElement("div", { className: "grid grid-cols-1 gap-1.5" },

                    brainQuizOpts.map(function (opt) {

                      var fb = d.quizFeedback;

                      var isCorrect = opt.id === quizQ.id;

                      var wasChosen = fb && fb.chosen === opt.id;

                      var showResult = fb !== null && fb !== undefined;

                      return React.createElement("button", { "aria-label": "Brainatlas action",

                        key: opt.id, disabled: showResult,

                        onClick: function () {

                          var correct = opt.id === quizQ.id;

                          upd('quizFeedback', { chosen: opt.id, correct: correct });

                          if (correct) upd('quizScore', (d.quizScore || 0) + 1);

                        },

                        className: "w-full text-left px-3 py-2 rounded-lg text-[11px] leading-relaxed font-medium transition-all border-2 " +

                          (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :

                            showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :

                              'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50')

                      }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + (opt.damage || '').substring(0, 100) + ((opt.damage || '').length > 100 ? '...' : ''));

                    })

                  ),

                  d.quizFeedback && React.createElement("div", { className: "rounded-lg p-3 text-xs leading-relaxed space-y-1.5 " + (d.quizFeedback.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },

                    React.createElement("p", { className: "font-black " + (d.quizFeedback.correct ? 'text-green-800' : 'text-amber-800') }, (d.quizFeedback.correct ? '\u2705 Correct! ' : '\u274C Correct answer for: ') + quizQ.name),

                    React.createElement("p", { className: "text-slate-700" }, React.createElement("span", { className: "font-bold text-slate-500" }, "Function: "), quizQ.fn),

                    quizQ.damage && React.createElement("p", { className: "text-slate-700" }, React.createElement("span", { className: "font-bold text-rose-500" }, "\uD83C\uDFE5 If Damaged: "), quizQ.damage),

                    quizQ.conditions && React.createElement("p", { className: "text-slate-600 italic" }, React.createElement("span", { className: "font-bold text-amber-600" }, "\u26A0 Conditions: "), quizQ.conditions)

                  ),

                  d.quizFeedback && React.createElement("button", { "aria-label": "Next Question",

                    onClick: function () { upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); },

                    className: "w-full py-2 mt-2 rounded-lg text-xs font-bold bg-green-700 text-white hover:bg-green-700"

                  }, "Next Question \u2192")

                ) : null

              ) : (

              // ─── Brainwave Visualizer ───

              React.createElement("div", { className: "rounded-xl border-2 border-purple-200 overflow-hidden", style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)' } },

                React.createElement("div", { className: "p-3" },

                  React.createElement("div", { className: "flex items-center justify-between mb-2" },

                    React.createElement("div", { className: "flex items-center gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\u{1F9E0}"),

                      React.createElement("h4", { className: "text-sm font-black text-white" }, "Brainwave Visualizer")

                    ),

                    React.createElement("div", { className: "flex gap-1" },

                      ['delta', 'theta', 'alpha', 'beta', 'gamma'].map(function (waveType) {

                        var WAVE_META = {

                          delta: { label: '\u0394 Delta', freq: '0.5\u20134 Hz', color: '#818cf8', desc: 'Deep sleep, healing, unconscious processes. Highest amplitude, slowest frequency.' },

                          theta: { label: '\u0398 Theta', freq: '4\u20138 Hz', color: '#a78bfa', desc: 'Light sleep, meditation, creativity, memory consolidation. "Twilight" state between waking and sleeping.' },

                          alpha: { label: '\u03B1 Alpha', freq: '8\u201313 Hz', color: '#c084fc', desc: 'Relaxed alertness, calm focus, mindfulness. Bridge between conscious thinking and subconscious mind.' },

                          beta: { label: '\u03B2 Beta', freq: '13\u201330 Hz', color: '#e879f9', desc: 'Active thinking, problem-solving, focused concentration. Dominant during normal waking consciousness.' },

                          gamma: { label: '\u03B3 Gamma', freq: '30\u2013100 Hz', color: '#f472b6', desc: 'Higher cognitive processing, peak awareness, information binding across brain regions. Fastest brainwave.' }

                        };

                        var meta = WAVE_META[waveType];

                        var isActive = (d.brainwaveType || 'alpha') === waveType;

                        return React.createElement("button", { "aria-label": "Change brainwave type",

                          key: waveType,

                          onClick: function () { upd('brainwaveType', waveType); },

                          className: "px-2 py-1 rounded-md text-[10px] font-bold transition-all " + (isActive ? 'text-white shadow-lg' : 'text-white/50 hover:text-white/80'),

                          style: isActive ? { background: meta.color } : {}

                        }, meta.label);

                      })

                    )

                  ),

                  // Brainwave canvas

                  React.createElement("canvas", {

                    id: "brainwave-canvas",

                    width: 560, height: 160,

                    className: "w-full rounded-lg",

                    style: { background: '#0f0b2e' }

                  }),

                  // Info panel

                  (function () {

                    var WAVE_META = {

                      delta: { label: '\u0394 Delta', freq: '0.5\u20134 Hz', color: '#818cf8', desc: 'Deep sleep, healing, unconscious processes. Highest amplitude, slowest frequency.', amp: 'Highest (75\u2013200 \u00B5V)', states: 'Deep sleep (NREM Stage 3\u20134), coma, infants', eeg: 'Frontal (adults), posterior (children)' },

                      theta: { label: '\u0398 Theta', freq: '4\u20138 Hz', color: '#a78bfa', desc: 'Light sleep, meditation, creativity, memory consolidation. Twilight state.', amp: 'Medium-High (20\u201375 \u00B5V)', states: 'Drowsiness, light sleep, meditation, memory encoding', eeg: 'Temporal, frontal midline' },

                      alpha: { label: '\u03B1 Alpha', freq: '8\u201313 Hz', color: '#c084fc', desc: 'Relaxed alertness, calm focus, mindfulness. Bridge between conscious and subconscious.', amp: 'Medium (30\u201350 \u00B5V)', states: 'Eyes closed, relaxed, calm alertness, mindfulness', eeg: 'Posterior (occipital), attenuates with eye opening' },

                      beta: { label: '\u03B2 Beta', freq: '13\u201330 Hz', color: '#e879f9', desc: 'Active thinking, problem-solving, focused concentration. Normal waking consciousness.', amp: 'Low (5\u201330 \u00B5V)', states: 'Active thinking, anxiety, concentration, motor planning', eeg: 'Frontal, central (Rolandic beta)' },

                      gamma: { label: '\u03B3 Gamma', freq: '30\u2013100 Hz', color: '#f472b6', desc: 'Higher cognitive processing, peak awareness, cross-region information binding.', amp: 'Very Low (< 5 \u00B5V)', states: 'Perception binding, peak focus, advanced meditation', eeg: 'Widespread, somatosensory cortex' }

                    };

                    var activeWave = WAVE_META[d.brainwaveType || 'alpha'];

                    return React.createElement("div", { className: "mt-2 grid grid-cols-2 gap-2" },

                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },

                        React.createElement("p", { className: "text-[10px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, "Frequency"),

                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.freq)

                      ),

                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },

                        React.createElement("p", { className: "text-[10px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, "Amplitude"),

                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.amp)

                      ),

                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },

                        React.createElement("p", { className: "text-[10px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, "Mental States"),

                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.states)

                      ),

                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },

                        React.createElement("p", { className: "text-[10px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, "EEG Location"),

                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.eeg)

                      )

                    );

                  })(),

                  React.createElement("p", { className: "text-[10px] text-white/40 mt-2 italic text-center" }, (function () {

                    var WAVE_META = {

                      delta: { desc: 'Deep sleep, healing. Highest amplitude, slowest frequency. Dominant in infants and during deep non-REM sleep.' },

                      theta: { desc: 'Light sleep, meditation, creativity. The twilight state between waking and sleeping. Linked to memory consolidation.' },

                      alpha: { desc: 'Relaxed alertness, calm focus. Bridge between conscious thinking and subconscious. Blocked by opening eyes (Berger effect).' },

                      beta: { desc: 'Active thinking, problem-solving. Dominant during normal waking consciousness. Excess linked to anxiety.' },

                      gamma: { desc: 'Peak cognitive processing, cross-region binding. Fastest brainwave. Associated with advanced meditation and heightened perception.' }

                    };

                    return WAVE_META[d.brainwaveType || 'alpha'].desc;

                  })())

                )

              ),

              // ─── Brainwave canvas renderer (async) ───

              (function () {

                setTimeout(function () {

                  var canvas = document.getElementById('brainwave-canvas');

                  if (!canvas || canvas._bwAnimFrame) return;

                  var ctx = canvas.getContext('2d');

                  var W = canvas.width, H = canvas.height;

                  var tick = 0;

                  var WAVE_PARAMS = {

                    delta: { freq: 1.5, amp: 0.85, color: '#818cf8', lineWidth: 3 },

                    theta: { freq: 3, amp: 0.65, color: '#a78bfa', lineWidth: 2.5 },

                    alpha: { freq: 5, amp: 0.50, color: '#c084fc', lineWidth: 2.5 },

                    beta: { freq: 10, amp: 0.30, color: '#e879f9', lineWidth: 2 },

                    gamma: { freq: 22, amp: 0.18, color: '#f472b6', lineWidth: 1.5 }

                  };

                  function drawFrame() {

                    canvas._bwAnimFrame = requestAnimationFrame(drawFrame);

                    tick += 0.8;

                    ctx.fillStyle = 'rgba(15, 11, 46, 0.15)';

                    ctx.fillRect(0, 0, W, H);

                    // Grid lines

                    ctx.strokeStyle = 'rgba(255,255,255,0.04)';

                    ctx.lineWidth = 1;

                    for (var gy = 1; gy < 4; gy++) {

                      ctx.beginPath();

                      ctx.moveTo(0, H * gy / 4);

                      ctx.lineTo(W, H * gy / 4);

                      ctx.stroke();

                    }

                    // Draw all waves faintly, active wave bright

                    var activeType = (canvas.closest && canvas.closest('[class*="border-purple"]')) ? null : null;

                    var types = ['delta', 'theta', 'alpha', 'beta', 'gamma'];

                    // Read active type from parent

                    var btns = canvas.parentElement ? canvas.parentElement.querySelectorAll('button[class*="shadow-lg"]') : [];

                    var activeKey = 'alpha';

                    btns.forEach(function (btn) {

                      types.forEach(function (t) { if (btn.textContent && btn.textContent.toLowerCase().includes(t.substring(0, 4))) activeKey = t; });

                    });

                    for (var ti = 0; ti < types.length; ti++) {

                      var t = types[ti];

                      var p = WAVE_PARAMS[t];

                      var isActive = t === activeKey;

                      ctx.beginPath();

                      ctx.strokeStyle = isActive ? p.color : (p.color + '22');

                      ctx.lineWidth = isActive ? p.lineWidth + 1 : 1;

                      if (isActive) {

                        ctx.shadowColor = p.color;

                        ctx.shadowBlur = 12;

                      }

                      var midY = H / 2;

                      var ampPx = midY * p.amp * (isActive ? 1 : 0.3);

                      for (var x = 0; x < W; x++) {

                        var phase = (x / W) * Math.PI * 2 * p.freq + tick * 0.02 * p.freq;

                        // Add slight noise for realism

                        var noise = isActive ? Math.sin(phase * 3.7 + tick * 0.1) * ampPx * 0.08 : 0;

                        var y = midY + Math.sin(phase) * ampPx + noise;

                        if (x === 0) ctx.moveTo(x, y);

                        else ctx.lineTo(x, y);

                      }

                      ctx.stroke();

                      ctx.shadowBlur = 0;

                    }

                    // Label

                    ctx.fillStyle = WAVE_PARAMS[activeKey].color;

                    ctx.font = 'bold 11px Inter, system-ui';

                    ctx.textAlign = 'right';

                    ctx.fillText(activeKey.charAt(0).toUpperCase() + activeKey.slice(1) + ' Waves', W - 12, 18);

                    ctx.fillStyle = 'rgba(255,255,255,0.3)';

                    ctx.font = '9px Inter, system-ui';

                    ctx.fillText(WAVE_PARAMS[activeKey].freq.toFixed(0) + 'x base freq | Amp: ' + (WAVE_PARAMS[activeKey].amp * 100).toFixed(0) + '%', W - 12, 32);

                    // Time axis

                    ctx.fillStyle = 'rgba(255,255,255,0.15)';

                    ctx.font = '8px monospace';

                    ctx.textAlign = 'center';

                    for (var s = 1; s <= 3; s++) { ctx.fillText(s + 's', W * s / 4, H - 4); }

                  }

                  drawFrame();

                  // Cleanup on unmount

                  canvas._bwCleanup = function () { cancelAnimationFrame(canvas._bwAnimFrame); canvas._bwAnimFrame = null; };

                }, 50);

                return null;

              })(),

                sel ? (

                  React.createElement("div", { className: "bg-white rounded-xl border-2 border-purple-200 p-4 space-y-3" },

                    React.createElement("div", { className: "flex items-start justify-between" },

                      React.createElement("h4", { className: "text-base font-black text-purple-700" }, sel.name),

                      React.createElement("button", { "aria-label": "Close region detail panel", onClick: function () { upd('selectedRegion', null); }, className: "p-1 hover:bg-slate-100 rounded" }, React.createElement(X, { size: 14, className: "text-slate-500" }))

                    ),

                    React.createElement("div", { className: "space-y-2.5" },

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-0.5" }, "Function"),

                        React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, sel.fn)

                      ),

                      sel.brodmann && React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-0.5" }, "Brodmann Areas"),

                        React.createElement("p", { className: "text-xs text-purple-600 font-mono" }, sel.brodmann)

                      ),

                      sel.blood && React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-0.5" }, "Blood Supply"),

                        React.createElement("p", { className: "text-xs text-red-600" }, sel.blood)

                      ),

                      sel.category && React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-purple-500 uppercase mb-0.5" }, "\u2697\uFE0F Category"),

                        React.createElement("p", { className: "text-xs text-purple-700 font-semibold" }, sel.category)

                      ),

                      sel.synthesis && React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-0.5" }, "\uD83E\uDDEC Synthesis Pathway"),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-purple-50 rounded-lg p-2" }, sel.synthesis)

                      ),

                      sel.receptors && React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-0.5" }, "\uD83C\uDFAF Receptor Subtypes"),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-indigo-50 rounded-lg p-2" }, sel.receptors)

                      ),

                      sel.pathways && React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-0.5" }, "\uD83D\uDEE4\uFE0F Neural Pathways"),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-teal-50 rounded-lg p-2" }, sel.pathways)

                      ),

                      sel.drugs && React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-blue-600 uppercase mb-0.5" }, "\uD83D\uDC8A Pharmacology"),

                        React.createElement("p", { className: "text-xs text-blue-800 leading-relaxed bg-blue-50 border border-blue-200 rounded-lg p-2" }, sel.drugs)

                      ),

                      sel.conditions && React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-amber-600 uppercase mb-0.5" }, "\u26A0 Associated Conditions"),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-amber-50 rounded-lg p-2" }, sel.conditions)

                      ),

                      sel.damage && React.createElement("div", null,

                        React.createElement("p", { className: "text-[10px] font-bold text-rose-500 uppercase mb-0.5" }, "\uD83C\uDFE5 If Damaged"),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-rose-50 rounded-lg p-2" }, sel.damage)

                      )

                    )

                  )

                ) : (

                  React.createElement("div", { className: "space-y-1 max-h-[380px] overflow-y-auto pr-1" },

                    filtered.length === 0 && React.createElement("p", { className: "text-xs text-slate-500 italic py-4 text-center" }, "No regions match your search."),

                    filtered.map(function (r) {

                      return React.createElement("button", { "aria-label": "Change selected region",

                        key: r.id,

                        onClick: function () { upd('selectedRegion', r.id); },

                        className: "w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:shadow-sm " +

                          (d.selectedRegion === r.id ? 'font-bold border-2 border-purple-400 bg-purple-50' : 'bg-slate-50 hover:bg-white border border-slate-200')

                      },

                        React.createElement("div", { className: "font-bold text-slate-800" }, r.name),

                        React.createElement("div", { className: "text-[10px] text-slate-500 mt-0.5 line-clamp-1" }, r.fn.substring(0, 80) + (r.fn.length > 80 ? '...' : ''))

                      );

                    })

                  )

                )

              )

            )

          );
      })();
    }
  });

})();