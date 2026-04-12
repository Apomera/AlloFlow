// ═══════════════════════════════════════════
// stem_tool_behaviorlab.js — Behavior Lab (standalone CDN module)
// Operant & classical conditioning simulator with animated Skinner box
// Extracted from stem_tool_science.js and enhanced
// ═══════════════════════════════════════════

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
// ═══ End Guard ═══

// Dedup: skip if already registered (hub may have loaded inline copy)
if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('behaviorLab'))) {

(function() {
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-behaviorlab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-behaviorlab';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('behaviorLab', {
    icon: '\uD83E\uDDEC',
    label: 'behaviorLab',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'reach_level_3', label: 'Advance to level 3 in behavior analysis', icon: '\uD83D\uDCCA', check: function(d) { return (d.blLevel || 1) >= 3; }, progress: function(d) { return 'Level ' + (d.blLevel || 1) + '/3'; } },
      { id: 'record_10_data', label: 'Record 10 data points on the cumulative record', icon: '\uD83D\uDCDD', check: function(d) { return (d.blCumRecord || []).length >= 10; }, progress: function(d) { return (d.blCumRecord || []).length + '/10 points'; } },
      { id: 'run_50_ticks', label: 'Run the simulation for 50+ ticks', icon: '\u25B6\uFE0F', check: function(d) { return (d.blTick || 0) >= 50; }, progress: function(d) { return (d.blTick || 0) + '/50 ticks'; } }
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

      // ── Tool body (behaviorLab) ──
      return (function() {
var d = labToolData || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('behaviorLab', 'init', {
              first: 'Behavior Lab loaded. Track and analyze behavioral data with visual charts and evidence-based intervention tools.',
              repeat: 'Behavior Lab active.',
              terse: 'Behavior Lab.'
            }, { debounce: 800 });
          }

          var upd = function (k, v) { setLabToolData(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); };



          // ── Level definitions ──

          var LEVELS = [

            {

              id: 1, title: 'First Food', concept: 'Positive Reinforcement', target: 'pressLever', goal: 10,

              intro: 'In positive reinforcement, a consequence is ADDED after a behavior to INCREASE the likelihood of that behavior occurring again. Your job: click "Deliver Food" immediately after the mouse presses the lever. Reinforce 10 lever presses!',

              termDef: 'Positive Reinforcement (SR+): Adding a stimulus after a behavior that increases the future probability of that behavior.',

              funFact: '🧪 B.F. Skinner discovered that pigeons could be trained to guide missiles during WWII using operant conditioning — the project was called "Project Pigeon"!',

              vocab: ['SR+ (Positive Reinforcement)', 'Operant Behavior', 'Consequence'],

              contingency: { a: 'Chamber present', b: 'Presses lever', c: '🍕 Food delivered (+SR)' }

            },

            {

              id: 2, title: 'Shape Up!', concept: 'Shaping', target: 'spin', goal: 5,

              intro: 'Shaping uses successive approximations. The mouse won\'t spin on its own! Follow this 3-step sequence: (1) Reinforce "Turning Right" (↪️) to increase turning. (2) Once turns are frequent, wait for "Half-Turn" (↩️↪️) and reinforce those. (3) Finally, wait for full "Spinning" (🌀) and reinforce! Shape 5 complete spins through 3 stages of approximation!',

              termDef: 'Shaping: Differentially reinforcing successive approximations toward a terminal (target) behavior.',

              funFact: '🐬 Dolphin trainers at SeaWorld use shaping to teach dolphins to do backflips — they start by reinforcing any upward movement!',

              vocab: ['Successive Approximations', 'Terminal Behavior', 'Differential Reinforcement'],

              contingency: { a: 'Trainer present', b: 'Closer to spin', c: '🍕 Food (reinforce!)' }

            },

            {

              id: 3, title: 'The Burst', concept: 'Extinction', target: 'pressLever', goal: 0,

              intro: 'When reinforcement is suddenly withheld, the organism often shows an extinction burst — a temporary INCREASE in the behavior before it decreases. First, reinforce 5 lever presses, then STOP reinforcing and watch what happens!',

              termDef: 'Extinction Burst: A temporary increase in frequency/intensity of a previously reinforced behavior when reinforcement is discontinued.',

              funFact: '🛗 Ever push an elevator button multiple times when it doesn\'t light up? That\'s YOUR extinction burst!',

              vocab: ['Extinction', 'Extinction Burst', 'Spontaneous Recovery'],

              contingency: { a: 'Chamber present', b: 'Presses lever', c: '❌ No food (extinction)' }

            },

            {

              id: 4, title: 'On Schedule', concept: 'Schedules of Reinforcement', target: 'pressLever', goal: 20,

              intro: 'Not every response needs reinforcement! A Fixed Ratio (FR) schedule reinforces after a set number of responses. Try FR-3: reinforce every 3rd lever press. Watch how the mouse responds differently than continuous reinforcement!',

              termDef: 'Fixed Ratio (FR): A schedule where reinforcement is delivered after a fixed number of responses.',

              funFact: '🎰 Slot machines use Variable Ratio (VR) schedules — the most resistant to extinction — which is why they\'re so addictive!',

              vocab: ['Fixed Ratio (FR)', 'Continuous Reinforcement (CRF)', 'Intermittent Reinforcement'],

              contingency: { a: 'Chamber present', b: 'Every 3rd press', c: '🍕 Food (FR-3)' }

            },

            {

              id: 5, title: 'Green Means Go', concept: 'Stimulus Discrimination', target: 'pressLever', goal: 10,

              intro: 'A discriminative stimulus (SD) signals that reinforcement is available. The green light = SD (reinforce lever presses). Red light = S-delta (do NOT reinforce). Teach the mouse to press only when the green light is on!',

              termDef: 'SD (Discriminative Stimulus): A stimulus that signals reinforcement is available for a specific behavior.',

              funFact: '🚦 Traffic lights work as discriminative stimuli for drivers — green (SD) signals "go" and red (S-delta) signals "stop"!',

              vocab: ['SD (Discriminative Stimulus)', 'S-delta (S∆)', 'Stimulus Control'],

              contingency: { a: '🟢 Green light (SD)', b: 'Presses lever', c: '🍕 Food delivered' }

            },

            {

              id: 6, title: 'Free Lab', concept: 'Sandbox Mode', target: null, goal: 0,

              intro: 'Welcome to the Free Lab! All tools are unlocked. Design your own experiment. Try shaping a new behavior, testing different schedules, or building a behavior chain. Happy experimenting!',

              termDef: 'Applied Behavior Analysis (ABA): The science of applying behavioral principles to improve socially significant behavior.',

              funFact: '🌍 ABA principles are used everywhere — from teaching children with autism to training service dogs, to designing better apps!',

              vocab: ['Behavior Chain', 'Generalization', 'Maintenance'],

              contingency: { a: 'Your choice!', b: 'Pick a behavior', c: 'Design the consequence' }

            },

            {

              id: 7, title: 'Chain Reaction', concept: 'Behavior Chaining', target: 'pressLever', goal: 3,

              intro: 'A behavior chain links multiple behaviors in a specific sequence. The completion of one step becomes the signal (SD) for the next. Teach the mouse this chain: Sniff ➜ Rear Up ➜ Press Lever. Reinforce ONLY when the full 3-step chain is completed!',

              termDef: 'Behavior Chain: A sequence of responses where each response produces the discriminative stimulus (SD) for the next response, and the last response is followed by a reinforcer.',

              funFact: '🐕 Service dogs learn behavior chains of 20+ steps — like opening the fridge, grabbing a drink, closing the fridge, and bringing it to their handler!',

              vocab: ['Behavior Chain', 'Forward Chaining', 'Task Analysis', 'Terminal Reinforcer'],

              contingency: { a: 'Chain cue', b: 'Sniff→Rear→Lever', c: '🍕 Food (chain complete!)' }

            },

            {

              id: 8, title: 'Not That!', concept: 'DRO — Differential Reinforcement', target: null, goal: 5,

              intro: 'DRO (Differential Reinforcement of Other behavior) means reinforcing the ABSENCE of a specific behavior for a set time interval. A countdown timer runs — if the mouse does NOT press the lever before the timer finishes, deliver food! If the mouse presses the lever, the timer resets. Deliver 5 successful DRO intervals!',

              termDef: 'DRO (Differential Reinforcement of Other Behavior): Reinforcement is delivered when a specified behavior does NOT occur for a predetermined interval of time.',

              funFact: '🏫 Teachers use DRO all the time — "If no one calls out for 5 minutes, the class earns a point!" It reduces unwanted behavior without punishment.',

              vocab: ['DRO', 'Differential Reinforcement', 'Interval', 'Target Behavior Reduction'],

              contingency: { a: 'Timer running', b: 'Any behavior EXCEPT lever', c: '🍕 Food (DRO interval met!)' }

            },

            {

              id: 9, title: 'Pavlov\'s Bell', concept: 'Classical Conditioning', target: null, goal: 0,

              intro: 'Classical conditioning pairs a neutral stimulus (bell) with an unconditioned stimulus (food) that naturally causes a response (salivation). After repeated pairings the bell ALONE triggers salivation! Phase 1: Ring the bell — nothing happens. Phase 2: Pair bell + food 5 times. Phase 3: Ring bell alone and watch for the conditioned response!',

              termDef: 'Classical Conditioning: A learning process where a neutral stimulus (CS) is repeatedly paired with an unconditioned stimulus (US) until the CS alone elicits a conditioned response (CR).',

              funFact: '🐶 Ivan Pavlov discovered classical conditioning accidentally while studying dog digestion in the 1890s. The dogs began salivating at the sight of lab coats because they associated them with food!',

              vocab: ['US (Unconditioned Stimulus)', 'UR (Unconditioned Response)', 'CS (Conditioned Stimulus)', 'CR (Conditioned Response)', 'Acquisition', 'Extinction'],

              contingency: { a: '🔔 Bell (CS)', b: 'Paired with food (US)', c: '🤤 Salivation (CR)' }

            }

          ];



          // ── Knowledge Quiz Questions ──

          var QUIZ_BANK = {

            1: { q: 'In positive reinforcement, what happens to the behavior?', opts: ['It decreases', 'It increases', 'It stays the same', 'It disappears'], correct: 1, explain: 'Positive reinforcement ADDS a stimulus that INCREASES the future probability of a behavior.' },

            2: { q: 'What is shaping?', opts: ['Punishing wrong behaviors', 'Reinforcing successive approximations', 'Ignoring all behaviors', 'Only reinforcing the final behavior'], correct: 1, explain: 'Shaping involves differentially reinforcing successive approximations toward the target behavior.' },

            3: { q: 'What is an extinction burst?', opts: ['A permanent increase in behavior', 'A temporary increase before behavior decreases', 'When a new behavior appears', 'When reinforcement increases'], correct: 1, explain: 'An extinction burst is a temporary INCREASE in the frequency or intensity of a behavior when reinforcement is suddenly discontinued.' },

            4: { q: 'In an FR-3 schedule, when is reinforcement delivered?', opts: ['After every response', 'After every 3rd response', 'After random responses', 'After 3 minutes'], correct: 1, explain: 'Fixed Ratio (FR-3) delivers reinforcement after every 3rd response — a fixed number of responses.' },

            5: { q: 'What does SD (discriminative stimulus) signal?', opts: ['Punishment is coming', 'Reinforcement is available', 'Extinction has started', 'The session is over'], correct: 1, explain: 'An SD signals that reinforcement is available for a specific behavior. It "sets the occasion" for that behavior.' },

            7: { q: 'In a behavior chain, what serves as the SD for the next step?', opts: ['The reinforcer', 'The completion of the previous step', 'A timer', 'The first behavior'], correct: 1, explain: 'In a behavior chain, completing each step produces the discriminative stimulus (SD) for the next step in the sequence.' },

            8: { q: 'What does DRO reinforce?', opts: ['The target behavior', 'The absence of a specific behavior', 'Only aggressive behaviors', 'Random behaviors'], correct: 1, explain: 'DRO (Differential Reinforcement of Other behavior) delivers reinforcement when a specified behavior does NOT occur for a set interval.' },

            9: { q: 'In classical conditioning, what is the conditioned stimulus (CS)?', opts: ['The food that causes salivation', 'The salivation response', 'A neutral stimulus paired with the US', 'The lab equipment'], correct: 2, explain: 'The CS starts as a neutral stimulus (like a bell) that gains the ability to elicit a response only after being repeatedly paired with the US (food).' }

          };



          // ── Chain sequence for Level 7 ──

          var CHAIN_SEQ = ['sniff', 'rearUp', 'pressLever'];

          // === ENGAGEMENT: Level Badges ===
          var LEVEL_BADGES = {
            1: { icon: '\uD83C\uDF55', name: 'First Feeder', desc: 'Mastered positive reinforcement' },
            2: { icon: '\uD83C\uDFAF', name: 'Shape Shifter', desc: 'Shaped behavior through approximations' },
            3: { icon: '\uD83D\uDCA5', name: 'Burst Observer', desc: 'Witnessed the extinction burst' },
            4: { icon: '\uD83D\uDCC5', name: 'Scheduler', desc: 'Implemented FR-3 schedule' },
            5: { icon: '\uD83D\uDEA6', name: 'Signal Master', desc: 'Taught stimulus discrimination' },
            6: { icon: '\uD83E\uDDEA', name: 'Free Thinker', desc: 'Explored the sandbox lab' },
            7: { icon: '\u26D3', name: 'Chain Builder', desc: 'Completed a behavior chain' },
            8: { icon: '\u23F1', name: 'DRO Pro', desc: 'Mastered differential reinforcement' },
            9: { icon: '\uD83D\uDD14', name: 'Pavlovian', desc: 'Demonstrated classical conditioning' }
          };

          // === Famous Behaviorists ===
          var FAMOUS_BEHAVIORISTS = [
            { name: 'Ivan Pavlov', year: '1849-1936', contribution: 'Discovered classical conditioning through salivation experiments with dogs. Won the Nobel Prize in Physiology (1904).', icon: '\uD83D\uDC36', field: 'Classical Conditioning' },
            { name: 'John B. Watson', year: '1878-1958', contribution: 'Founded behaviorism as a school of psychology. Argued psychology should study only observable behavior, not mental states. Controversial "Little Albert" experiment.', icon: '\uD83E\uDDEC', field: 'Behaviorism' },
            { name: 'Edward Thorndike', year: '1874-1949', contribution: 'Formulated the Law of Effect: behaviors followed by satisfying consequences are strengthened. Puzzle box experiments with cats.', icon: '\uD83D\uDC31', field: 'Law of Effect' },
            { name: 'B.F. Skinner', year: '1904-1990', contribution: 'Developed operant conditioning and the Skinner box. Identified reinforcement schedules (FR, VR, FI, VI). Most influential behavioral psychologist ever.', icon: '\uD83D\uDC2D', field: 'Operant Conditioning' },
            { name: 'Albert Bandura', year: '1925-2021', contribution: 'Social learning theory and the Bobo doll experiment. Showed learning occurs through observation (modeling), not just direct reinforcement. Self-efficacy theory.', icon: '\uD83E\uDDD1', field: 'Social Learning' },
            { name: 'Baer, Wolf & Risley', year: '1968', contribution: 'Published the founding article of Applied Behavior Analysis (ABA). Defined ABA as applied, behavioral, analytic, technological, conceptually systematic, effective, and generalizable.', icon: '\uD83D\uDCDA', field: 'Applied Behavior Analysis' },
            { name: 'O. Ivar Lovaas', year: '1927-2010', contribution: 'Pioneered the use of ABA for autism intervention. His 1987 study showed 47% of children receiving intensive ABA achieved normal functioning.', icon: '\u2764', field: 'Autism Intervention' },
            { name: 'Murray Sidman', year: '1923-2019', contribution: 'Developed stimulus equivalence theory and the coercion framework. Advocated for reinforcement over punishment in all applications.', icon: '\u2696', field: 'Stimulus Equivalence' }
          ];

          // === Four Functions of Behavior (FBA) ===
          var FOUR_FUNCTIONS = [
            { name: 'Attention', abbrev: 'ATT', icon: '\uD83D\uDC40', color: '#3b82f6', desc: 'Behavior maintained by social attention from others. Example: A student calls out in class to get the teacher to look at them. The attention (even if negative) reinforces the calling out.', example: 'Calling out, clowning around, tantrums when ignored', intervention: 'Planned ignoring of problem behavior + attention for appropriate behavior (DRA). Teach appropriate ways to get attention.' },
            { name: 'Escape/Avoidance', abbrev: 'ESC', icon: '\uD83C\uDFC3', color: '#ef4444', desc: 'Behavior maintained by removal of an aversive stimulus. Example: A student has a meltdown when given math work, and the teacher removes the assignment. The meltdown is negatively reinforced.', example: 'Work refusal, aggression to end demands, elopement', intervention: 'Escape extinction (don\'t remove demand). Break tasks into smaller steps. Provide breaks contingent on compliance (DRO/DRA).' },
            { name: 'Tangible', abbrev: 'TAN', icon: '\uD83C\uDFAE', color: '#f59e0b', desc: 'Behavior maintained by access to a preferred item or activity. Example: A child screams in the store until the parent buys them candy. The screaming is reinforced by getting the candy.', example: 'Grabbing items, screaming for toys, negotiating for screen time', intervention: 'Don\'t provide the item contingent on problem behavior. Teach requesting (FCT). Provide access to preferred items for appropriate behavior.' },
            { name: 'Sensory/Automatic', abbrev: 'AUT', icon: '\u2728', color: '#8b5cf6', desc: 'Behavior maintained by the sensory stimulation it produces, independent of social consequences. The behavior itself feels good. Example: Hand-flapping may produce proprioceptive input that is reinforcing.', example: 'Hand flapping, rocking, humming, nail biting', intervention: 'Provide alternative sensory input (sensory diet). Modify the environment. Consider whether the behavior actually needs intervention (it may serve a regulatory function).' }
          ];

          // === Real-World ABA Applications ===
          var ABA_APPLICATIONS = [
            { name: 'Autism Services', icon: '\u2764', desc: 'Evidence-based intervention for individuals with autism. Teaches communication, social, self-care, and academic skills through systematic reinforcement and prompting strategies.', setting: 'Clinics, homes, schools' },
            { name: 'Education & Classroom Management', icon: '\uD83C\uDFEB', desc: 'Token economies, positive behavior support (PBS), response to intervention (RTI), and group contingencies. Making learning reinforcing and reducing challenging behavior.', setting: 'Schools (Pre-K through college)' },
            { name: 'Animal Training', icon: '\uD83D\uDC3E', desc: 'Clicker training, shaping, and chaining are all ABA principles. Service dogs, marine mammals, and zoo animals are all trained using operant conditioning.', setting: 'Zoos, aquariums, service dog organizations' },
            { name: 'Organizational Behavior Management (OBM)', icon: '\uD83C\uDFE2', desc: 'Applying ABA principles to improve employee performance, safety, and satisfaction. Feedback systems, incentive programs, and performance management.', setting: 'Businesses, hospitals, factories' },
            { name: 'Sports Performance', icon: '\u26BD', desc: 'Coaches use shaping, reinforcement, and behavioral rehearsal to improve athletic performance. Video feedback and goal-setting based on behavioral principles.', setting: 'Professional & amateur sports' },
            { name: 'Health & Fitness', icon: '\uD83D\uDCAA', desc: 'Habit formation, self-monitoring, contingency contracts for exercise. Behavioral approaches to weight management, medication adherence, and addiction treatment.', setting: 'Hospitals, gyms, home programs' },
            { name: 'App & Game Design', icon: '\uD83D\uDCF1', desc: 'Variable ratio reinforcement in social media (likes, notifications). Shaping in game tutorials. Streaks and badges as conditioned reinforcers. Gamification IS applied behavior analysis.', setting: 'Tech companies, UX design' },
            { name: 'Environmental Sustainability', icon: '\uD83C\uDF0D', desc: 'Behavioral interventions for recycling, energy conservation, and sustainable transportation. Feedback and reinforcement can change environmental behaviors at scale.', setting: 'Communities, policy' }
          ];

          // === Behavior Measurement Methods ===
          var MEASUREMENT_METHODS = [
            { name: 'Frequency/Rate', def: 'Count of behaviors per time period. Rate = count / time.', example: 'Student raised hand 12 times in a 30-minute class = 0.4 per minute', when: 'Behavior has a clear start and end. Each instance is roughly equal in duration.', icon: '\uD83D\uDD22' },
            { name: 'Duration', def: 'Total time a behavior occurs. Can be total or per-occurrence.', example: 'Student was off-task for 14 of 30 minutes (47%)', when: 'The concern is HOW LONG the behavior lasts (tantrums, on-task behavior, engagement).', icon: '\u23F1' },
            { name: 'Latency', def: 'Time between a stimulus (instruction) and behavior onset.', example: 'Teacher said "sit down" and student sat 45 seconds later', when: 'The concern is HOW LONG it takes to start responding after an instruction.', icon: '\u23F3' },
            { name: 'Inter-Response Time (IRT)', def: 'Time between two consecutive instances of the same behavior.', example: 'Time between each hand-raise: 2 min, 5 min, 1 min, 8 min', when: 'Evaluating whether behavior is clustering or spreading out over time.', icon: '\u2194' },
            { name: 'Magnitude/Intensity', def: 'The force or strength of a behavior.', example: 'Volume of voice (measured in decibels) during instruction', when: 'Two instances of the same behavior differ in intensity (soft vs. loud voice, gentle vs. forceful hitting).', icon: '\uD83D\uDCCA' },
            { name: 'Partial Interval Recording', def: 'Mark interval as "occurred" if behavior happened at ANY point during the interval.', example: 'Divide 30 min into 1-min intervals. Mark if student talked out at any point in each interval.', when: 'Overestimates behavior. Good for behaviors you want to decrease.', icon: '\uD83D\uDFE5' },
            { name: 'Whole Interval Recording', def: 'Mark as "occurred" only if behavior lasted the ENTIRE interval.', example: 'Mark 1-min interval only if student was on-task for all 60 seconds.', when: 'Underestimates behavior. Good for behaviors you want to increase.', icon: '\uD83D\uDFE9' },
            { name: 'Momentary Time Sampling', def: 'At the end of each interval, check if behavior is occurring at that exact moment.', example: 'Every 5 minutes, look at student. On-task? Check. Off-task? Check.', when: 'Easiest method for teachers. Good for estimating proportion of time.', icon: '\uD83D\uDFE6' }
          ];

          // === ABA Glossary ===
          var ABA_GLOSSARY = [
            { term: 'Positive Reinforcement (SR+)', def: 'Adding a stimulus after a behavior that increases future probability of that behavior.' },
            { term: 'Negative Reinforcement (SR-)', def: 'Removing an aversive stimulus after a behavior that increases future probability. NOT punishment!' },
            { term: 'Positive Punishment (SP+)', def: 'Adding an aversive stimulus after a behavior that decreases future probability.' },
            { term: 'Negative Punishment (SP-)', def: 'Removing a preferred stimulus after a behavior that decreases future probability (e.g., response cost).' },
            { term: 'Extinction', def: 'Withholding reinforcement for a previously reinforced behavior, resulting in a decrease.' },
            { term: 'Extinction Burst', def: 'Temporary increase in frequency/intensity of behavior when reinforcement is first withheld.' },
            { term: 'Shaping', def: 'Differentially reinforcing successive approximations toward a target behavior.' },
            { term: 'Chaining', def: 'Linking multiple behaviors in sequence where each step serves as the SD for the next.' },
            { term: 'SD (Discriminative Stimulus)', def: 'A stimulus that signals reinforcement is available for a specific behavior.' },
            { term: 'S-delta', def: 'A stimulus that signals reinforcement is NOT available.' },
            { term: 'MO (Motivating Operation)', def: 'An environmental variable that alters the value of a consequence and the probability of related behavior.' },
            { term: 'EO (Establishing Operation)', def: 'An MO that increases the value of a reinforcer and evokes behavior that has produced it.' },
            { term: 'AO (Abolishing Operation)', def: 'An MO that decreases the value of a reinforcer and abates related behavior.' },
            { term: 'DRA', def: 'Differential Reinforcement of Alternative behavior: reinforce a specific alternative to the problem behavior.' },
            { term: 'DRO', def: 'Differential Reinforcement of Other behavior: reinforce the absence of the target behavior for a set interval.' },
            { term: 'DRI', def: 'Differential Reinforcement of Incompatible behavior: reinforce a behavior physically incompatible with the problem behavior.' },
            { term: 'FCT', def: 'Functional Communication Training: teaching an appropriate communicative response as a replacement for problem behavior.' },
            { term: 'FBA', def: 'Functional Behavior Assessment: systematic process to identify the function (purpose) of a behavior.' },
            { term: 'ABC Data', def: 'Antecedent-Behavior-Consequence recording: documenting what happens before, during, and after a behavior.' },
            { term: 'Generalization', def: 'Behavior occurs across different settings, people, or stimuli without direct training.' },
            { term: 'Maintenance', def: 'Behavior continues over time after training/intervention has ended.' },
            { term: 'Prompt', def: 'An additional stimulus that increases the likelihood of a correct response (physical, verbal, gestural, model, visual).' },
            { term: 'Prompt Fading', def: 'Systematically reducing prompts to promote independent responding.' },
            { term: 'Token Economy', def: 'A system where tokens (conditioned reinforcers) are earned for target behaviors and exchanged for backup reinforcers.' }
          ];

          // === ABA Ethics Principles ===
          var ABA_ETHICS = [
            { name: 'Benefit Others', icon: '\u2764', desc: 'ABA practitioners have a responsibility to promote the well-being of their clients above all other considerations.' },
            { name: 'Least Restrictive', icon: '\uD83D\uDD13', desc: 'Always use the least restrictive effective treatment. Try reinforcement-based procedures before considering punishment-based ones.' },
            { name: 'Informed Consent', icon: '\uD83D\uDCDD', desc: 'Clients (or their guardians) must understand and agree to all intervention procedures before they are implemented.' },
            { name: 'Data-Driven Decisions', icon: '\uD83D\uDCCA', desc: 'All treatment decisions must be based on objective data, not opinions or assumptions. If data shows the intervention isn\'t working, change it.' },
            { name: 'Social Validity', icon: '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1', desc: 'Goals, procedures, and outcomes should be acceptable and meaningful to the client and their community.' },
            { name: 'Competence', icon: '\uD83C\uDF93', desc: 'Only practice within your area of training and competence. Seek supervision and continuing education.' }
          ];

          // === Wave 2: SCHEDULE_TYPES for comparison canvas ===
          var SCHEDULE_TYPES = [
            { id: 'FR', name: 'Fixed Ratio', abbrev: 'FR-5', color: '#f59e0b', desc: 'Reinforce every Nth response. Creates post-reinforcement pause then rapid responding.', example: 'Piecework pay: get paid per 5 items assembled', pattern: 'high-pause', ratio: 5 },
            { id: 'VR', name: 'Variable Ratio', abbrev: 'VR-5', color: '#ef4444', desc: 'Reinforce after variable number of responses (avg N). Produces high, steady rate. Most resistant to extinction.', example: 'Slot machines: win after random number of pulls', pattern: 'high-steady', ratio: 5 },
            { id: 'FI', name: 'Fixed Interval', abbrev: 'FI-10', color: '#3b82f6', desc: 'Reinforce first response after fixed time interval. Creates scallop pattern — slow after reinforcement, fast near end.', example: 'Checking mail: arrives at same time daily', pattern: 'scallop', interval: 10 },
            { id: 'VI', name: 'Variable Interval', abbrev: 'VI-10', color: '#10b981', desc: 'Reinforce first response after variable time interval (avg N). Produces slow, steady rate.', example: 'Fishing: fish bite at unpredictable times', pattern: 'low-steady', interval: 10 }
          ];

          // === Wave 2: REINFORCEMENT_MATRIX (2x2 operant conditioning) ===
          var REINFORCE_MATRIX = [
            { id: 'srPlus', row: 0, col: 0, name: 'Positive Reinforcement', abbrev: 'SR+', action: 'ADD', effect: 'INCREASE', color: '#22c55e', icon: '\u2795\u2B06',
              desc: 'Adding a stimulus to increase behavior', formal: 'The contingent presentation of a stimulus that increases the future probability of a behavior.',
              examples: ['Teacher gives sticker after completed work', 'Dog gets treat for sitting', 'Employee receives bonus for sales target', 'Child gets praise for sharing'] },
            { id: 'srMinus', row: 0, col: 1, name: 'Negative Reinforcement', abbrev: 'SR-', action: 'REMOVE', effect: 'INCREASE', color: '#3b82f6', icon: '\u2796\u2B06',
              desc: 'Removing an aversive stimulus to increase behavior', formal: 'The contingent removal of an aversive stimulus that increases the future probability of a behavior.',
              examples: ['Seatbelt beeping stops when buckled', 'Headache goes away after taking medicine', 'Nagging stops when chores are done', 'Sunglasses remove glare'] },
            { id: 'spPlus', row: 1, col: 0, name: 'Positive Punishment', abbrev: 'SP+', action: 'ADD', effect: 'DECREASE', color: '#ef4444', icon: '\u2795\u2B07',
              desc: 'Adding an aversive stimulus to decrease behavior', formal: 'The contingent presentation of an aversive stimulus that decreases the future probability of a behavior.',
              examples: ['Touching hot stove causes burn', 'Speeding ticket after driving too fast', 'Extra push-ups for being late', 'Verbal reprimand for misbehavior'] },
            { id: 'spMinus', row: 1, col: 1, name: 'Negative Punishment', abbrev: 'SP-', action: 'REMOVE', effect: 'DECREASE', color: '#f59e0b', icon: '\u2796\u2B07',
              desc: 'Removing a desired stimulus to decrease behavior', formal: 'The contingent removal of a reinforcing stimulus that decreases the future probability of a behavior.',
              examples: ['Phone taken away for breaking rules', 'Loss of recess for fighting', 'Fine for parking violation', 'Time-out from preferred activity'] }
          ];

          // === Wave 2: TOKEN_ITEMS for token economy builder ===
          var TOKEN_ITEMS = [
            { id: 'hw', name: 'Homework Complete', tokens: 3, icon: '\uD83D\uDCD3', category: 'academic' },
            { id: 'onTask', name: 'On-task 15 min', tokens: 2, icon: '\uD83C\uDFAF', category: 'behavior' },
            { id: 'kind', name: 'Act of Kindness', tokens: 4, icon: '\u2764\uFE0F', category: 'social' },
            { id: 'clean', name: 'Clean Up Area', tokens: 2, icon: '\uD83E\uDDF9', category: 'behavior' },
            { id: 'help', name: 'Help a Peer', tokens: 3, icon: '\uD83E\uDD1D', category: 'social' },
            { id: 'quiet', name: 'Quiet Transition', tokens: 1, icon: '\uD83E\uDD2B', category: 'behavior' },
            { id: 'read', name: 'Read 20 Pages', tokens: 3, icon: '\uD83D\uDCDA', category: 'academic' },
            { id: 'test', name: 'Score 80%+', tokens: 5, icon: '\uD83C\uDF1F', category: 'academic' }
          ];

          var TOKEN_REWARDS = [
            { id: 'sticker', name: 'Sticker', cost: 5, icon: '\u2B50' },
            { id: 'freetime', name: '5 min Free Time', cost: 10, icon: '\uD83C\uDFAE' },
            { id: 'snack', name: 'Snack Choice', cost: 15, icon: '\uD83C\uDF6A' },
            { id: 'leader', name: 'Line Leader', cost: 8, icon: '\uD83D\uDC51' },
            { id: 'computer', name: 'Computer Time', cost: 12, icon: '\uD83D\uDCBB' },
            { id: 'homework', name: 'Homework Pass', cost: 20, icon: '\uD83C\uDF89' },
            { id: 'teacher', name: 'Lunch with Teacher', cost: 25, icon: '\uD83C\uDF55' },
            { id: 'mystery', name: 'Mystery Prize', cost: 30, icon: '\uD83C\uDF81' }
          ];

          // === Wave 2: CONDITIONING_COMPARE ===
          var CONDITIONING_COMPARE = [
            { aspect: 'Discoverer', operant: 'B.F. Skinner (1938)', classical: 'Ivan Pavlov (1890s)' },
            { aspect: 'Key Process', operant: 'Behavior \u2192 Consequence', classical: 'Stimulus \u2192 Stimulus pairing' },
            { aspect: 'Learner Role', operant: 'Active (voluntarily emits behavior)', classical: 'Passive (reflexive response)' },
            { aspect: 'Behavior Type', operant: 'Operant (voluntary)', classical: 'Respondent (involuntary/reflexive)' },
            { aspect: 'Reinforcement', operant: 'Follows the behavior', classical: 'Paired with neutral stimulus' },
            { aspect: 'Extinction', operant: 'Withhold reinforcement', classical: 'Present CS without US' },
            { aspect: 'Key Terms', operant: 'SD, SR+, SR-, SP+, SP-', classical: 'US, UR, CS, CR' },
            { aspect: 'Example', operant: 'Dog sits \u2192 gets treat \u2192 sits more', classical: 'Bell + food \u2192 bell alone \u2192 salivation' }
          ];

          // === Wave 3: SCENARIO_CHALLENGES ===
          var SCENARIO_CHALLENGES = [
            { id: 1, scenario: 'A student screams every time they are asked to complete a math worksheet. When they scream, the teacher sends them to the hallway.', question: 'What function does the screaming likely serve?',
              options: ['Attention', 'Escape', 'Tangible', 'Sensory'], correct: 1,
              explain: 'The student screams and is removed from the math task. The screaming is negatively reinforced by escape from the aversive task (math worksheet). The teacher is accidentally reinforcing the screaming!',
              better: 'Break the worksheet into smaller chunks, teach the student to request a break appropriately, and reinforce task completion.' },
            { id: 2, scenario: 'A child throws toys whenever their parent is on the phone. The parent stops the call to attend to the child.', question: 'What function does throwing toys likely serve?',
              options: ['Escape', 'Tangible', 'Attention', 'Sensory'], correct: 2,
              explain: 'The child throws toys and gets parent attention. The behavior is positively reinforced by the attention that follows. Phone calls = SD for throwing toys.',
              better: 'Give the child attention before the call, provide a preferred activity during calls, and reinforce appropriate play with praise.' },
            { id: 3, scenario: 'A student with autism rocks back and forth during independent work time. The rocking does not seem connected to getting or avoiding anything.', question: 'What function does the rocking likely serve?',
              options: ['Attention', 'Escape', 'Tangible', 'Automatic/Sensory'], correct: 3,
              explain: 'Automatic (sensory) reinforcement! The behavior produces its own reinforcement through proprioceptive/vestibular stimulation. It is not maintained by social consequences.',
              better: 'If the rocking is not disruptive, it may not need intervention. If needed, provide alternative sensory input (fidget tools, movement breaks).' },
            { id: 4, scenario: 'Every time a specific toy is visible, a child cries until they get it. The crying stops immediately once they have the toy.', question: 'What function does the crying likely serve?',
              options: ['Escape', 'Attention', 'Tangible', 'Sensory'], correct: 2,
              explain: 'Tangible reinforcement! The crying is maintained by access to a preferred item (the toy). The visibility of the toy acts as an MO (motivating operation).',
              better: 'Teach "I want" requesting (FCT), reinforce appropriate asking, put toys on a schedule of access, and do not provide toys contingent on crying.' },
            { id: 5, scenario: 'You are using FR-5 to reinforce a new behavior. The learner shows a post-reinforcement pause after each delivery.', question: 'What should you do?',
              options: ['Switch to VR-5', 'Increase to FR-10', 'Add punishment', 'Give up'], correct: 0,
              explain: 'Correct! Post-reinforcement pauses are characteristic of FR schedules. Switching to a VR schedule maintains the same average ratio but eliminates the predictable pause pattern.',
              better: 'VR schedules produce steady, high rates of responding because the learner cannot predict exactly when reinforcement will occur.' },
            { id: 6, scenario: 'A student has learned to raise their hand in the classroom but does not do it at home or in other settings.', question: 'What ABA concept does this illustrate?',
              options: ['Extinction', 'Stimulus generalization failure', 'Shaping', 'Chaining'], correct: 1,
              explain: 'The behavior has not generalized across settings. The hand-raising is under tight stimulus control of the classroom environment only.',
              better: 'Program for generalization from the start: train in multiple settings, with multiple people, and reinforce the behavior in all environments.' },
            { id: 7, scenario: 'A therapist is teaching a child to brush their teeth using forward chaining. The child can do steps 1-3 independently.', question: 'What should the therapist do next?',
              options: ['Start over', 'Teach step 4 and prompt remaining steps', 'Skip to the last step', 'Remove all prompts'], correct: 1,
              explain: 'In forward chaining, you teach the chain from the beginning. Steps 1-3 are independent, so now teach step 4 while prompting/assisting remaining steps.',
              better: 'Forward chaining builds momentum because the learner always starts with mastered steps. Each new step is the SD for the next prompted step.' },
            { id: 8, scenario: 'A teacher wants to reduce a student calling out in class but does not want to use punishment.', question: 'Which procedure would be MOST appropriate?',
              options: ['Extinction only', 'DRA (reinforce hand-raising)', 'Time-out', 'Response cost'], correct: 1,
              explain: 'DRA (Differential Reinforcement of Alternative behavior) reinforces an appropriate alternative (hand-raising) that serves the same function. It reduces calling out without punishment.',
              better: 'DRA is preferred because it teaches what TO do (not just what NOT to do), aligns with the least restrictive principle, and builds new skills.' },
            { id: 9, scenario: 'During a Pavlovian conditioning experiment, you pair a tone (NS) with food (US) 10 times. On trial 11, you present the tone alone.', question: 'What do you expect?',
              options: ['No response', 'Conditioned response (salivation)', 'Extinction', 'Spontaneous recovery'], correct: 1,
              explain: 'After repeated CS-US pairings, the tone (now a CS) should elicit a conditioned response (CR = salivation) even without the food (US). This is acquisition!',
              better: 'The strength of the CR depends on the number of pairings, the timing (best with forward delay), and the salience of the CS and US.' },
            { id: 10, scenario: 'A BCBAs client has been making great progress on a program. The insurance company is reviewing whether to continue funding.', question: 'What should the BCBA present?',
              options: ['Anecdotes from parents', 'Objective data and graphs', 'Other client success stories', 'Their credentials'], correct: 1,
              explain: 'Data-driven decision making is a core ethical principle of ABA. Objective data (graphs, trend lines, effect sizes) is the gold standard for justifying continued treatment.',
              better: 'Always let the data speak. Visual analysis of graphed data shows trends, level changes, and variability that support clinical decisions.' },
            { id: 11, scenario: 'You are implementing DRO with a 30-second interval. The target behavior occurs at the 28-second mark.', question: 'What happens?',
              options: ['Deliver reinforcement anyway', 'Reset the timer', 'Extend the interval', 'End the session'], correct: 1,
              explain: 'In DRO, if the target behavior occurs at ANY point during the interval, the timer resets. No reinforcement is delivered. The learner must go the full interval without the behavior.',
              better: 'This is exactly what Level 8 in the simulator teaches! The mouse must refrain from pressing the lever for the full DRO interval.' },
            { id: 12, scenario: 'A parent reports that their child "had an extinction burst" when they stopped giving candy for tantrums. They want to give in.', question: 'What is the best advice?',
              options: ['Give the candy to stop the tantrum', 'Stay the course \u2014 extinction burst is expected', 'Try punishment instead', 'Increase the candy amount'], correct: 1,
              explain: 'Extinction bursts are temporary increases BEFORE the behavior decreases. Giving in during a burst teaches the child that MORE INTENSE tantrums work! This is the worst time to reinforce.',
              better: 'Warn parents about extinction bursts BEFORE starting extinction. Staying consistent through the burst is critical for success.' }
          ];

          // === Wave 3: ABA_MILESTONES ===
          var ABA_MILESTONES = [
            { year: 1897, event: 'Pavlov publishes classical conditioning research with dogs', icon: '\uD83D\uDC36', era: 'foundations' },
            { year: 1913, event: 'Watson publishes "Psychology as the Behaviorist Views It" \u2014 birth of behaviorism', icon: '\uD83D\uDCDC', era: 'foundations' },
            { year: 1920, event: 'Watson & Rayner: "Little Albert" experiment demonstrates conditioned fear', icon: '\uD83D\uDC76', era: 'foundations' },
            { year: 1938, event: 'Skinner publishes "The Behavior of Organisms" \u2014 operant conditioning defined', icon: '\uD83D\uDCDA', era: 'foundations' },
            { year: 1948, event: 'Skinner writes "Walden Two" imagining a behaviorally-designed utopia', icon: '\uD83C\uDFD8\uFE0F', era: 'foundations' },
            { year: 1953, event: 'Skinner publishes "Science and Human Behavior"', icon: '\uD83E\uDDE0', era: 'growth' },
            { year: 1957, event: 'Skinner publishes "Verbal Behavior" \u2014 behavioral analysis of language', icon: '\uD83D\uDDE3\uFE0F', era: 'growth' },
            { year: 1961, event: 'Bandura\u2019s Bobo doll study on observational learning/modeling', icon: '\uD83E\uDE86', era: 'growth' },
            { year: 1968, event: 'Baer, Wolf & Risley publish "Some Current Dimensions of ABA" \u2014 ABA formally defined', icon: '\u2B50', era: 'growth' },
            { year: 1970, event: 'Lovaas begins intensive ABA-based early intervention for autism', icon: '\uD83E\uDDE9', era: 'applied' },
            { year: 1987, event: 'Lovaas Study: 47% of children achieve "normal functioning" with intensive ABA', icon: '\uD83D\uDCC8', era: 'applied' },
            { year: 1998, event: 'BACB (Behavior Analyst Certification Board) established', icon: '\uD83C\uDFC5', era: 'modern' },
            { year: 2005, event: 'BACB introduces BCBA certification exam', icon: '\uD83C\uDF93', era: 'modern' },
            { year: 2014, event: 'All 50 US states require insurance coverage for ABA autism treatment', icon: '\uD83C\uDFE5', era: 'modern' },
            { year: 2020, event: 'Telehealth ABA delivery expands dramatically during COVID-19', icon: '\uD83D\uDCBB', era: 'modern' }
          ];

          // === Wave 3: QUICK_REFERENCE ===
          var QUICK_REF_CARDS = [
            { title: 'The 7 Dimensions of ABA', content: 'Applied \u2022 Behavioral \u2022 Analytic \u2022 Technological \u2022 Conceptually Systematic \u2022 Effective \u2022 Generality', icon: '7\uFE0F\u20E3', color: '#f59e0b' },
            { title: 'Reinforcement Rule', content: 'If a consequence INCREASES behavior = Reinforcement. + means ADD stimulus. - means REMOVE stimulus.', icon: '\u2B06\uFE0F', color: '#22c55e' },
            { title: 'Punishment Rule', content: 'If a consequence DECREASES behavior = Punishment. + means ADD stimulus. - means REMOVE stimulus.', icon: '\u2B07\uFE0F', color: '#ef4444' },
            { title: 'Three-Term Contingency', content: 'A (Antecedent) \u2192 B (Behavior) \u2192 C (Consequence). Also called the "ABC" of behavior analysis.', icon: '\uD83D\uDD17', color: '#8b5cf6' },
            { title: 'Extinction', content: 'Withholding reinforcement for a previously reinforced behavior. Expect an initial extinction BURST (temporary increase) before decrease.', icon: '\uD83D\uDCC9', color: '#6366f1' },
            { title: 'Schedules of Reinforcement', content: 'FR (Fixed Ratio) \u2022 VR (Variable Ratio) \u2022 FI (Fixed Interval) \u2022 VI (Variable Interval). Ratio = responses. Interval = time.', icon: '\uD83D\uDCC5', color: '#3b82f6' },
            { title: 'Motivating Operations', content: 'EO (Establishing Operation) = increases value of reinforcer. AO (Abolishing Operation) = decreases value of reinforcer.', icon: '\uD83D\uDCA1', color: '#10b981' },
            { title: 'Ethics First', content: 'Least restrictive \u2022 Data-driven \u2022 Informed consent \u2022 Social validity \u2022 Competence \u2022 Client benefit above all.', icon: '\u2764\uFE0F', color: '#ec4899' }
          ];



          // ── State initialization ──

          var blLevel = d.blLevel || 1;

          var blPhase = d.blPhase || 'intro';

          var blTick = d.blTick || 0;

          var blPaused = d.blPaused || false;

          var blHistory = d.blHistory || [];

          var blCumRecord = d.blCumRecord || [];

          var blReinforcements = d.blReinforcements || 0;

          var blTarget = d.blTarget || 'pressLever';

          var blLightOn = d.blLightOn === undefined ? true : d.blLightOn;

          var blLightColor = d.blLightColor || 'green';

          var blMouseAction = d.blMouseAction || 'explore';

          var blMouseX = d.blMouseX || 200;

          var blMouseY = d.blMouseY || 180;

          var blMouseDir = d.blMouseDir || 0;

          var blFoodVisible = d.blFoodVisible || false;

          var blLevelScore = d.blLevelScore || 0;

          var blCompletedLevels = d.blCompletedLevels || [];

          var blExtinctionPhase = d.blExtinctionPhase || false;

          var blExtinctionStart = d.blExtinctionStart || 0;

          var blScheduleCount = d.blScheduleCount || 0;

          var blAbcLog = d.blAbcLog || [];

          var blLastAction = d.blLastAction || null;

          var blActionAge = d.blActionAge || 0;

          var blMouseAngle = d.blMouseAngle || 0;

          var blSpeed = d.blSpeed || 1;

          var blShowHints = d.blShowHints === undefined ? true : d.blShowHints;

          var blFoodTime = d.blFoodTime || 0;

          var blSoundOn = d.blSoundOn === undefined ? true : d.blSoundOn;

          var blSandboxTarget = d.blSandboxTarget || 'pressLever';

          var blParticles = d.blParticles || [];

          var blDustMotes = d.blDustMotes || [];

          var blTotalTicks = d.blTotalTicks || 0;

          var blCorrectReinforcements = d.blCorrectReinforcements || 0;

          var blBreathPhase = (Date.now() / 1000) % (Math.PI * 2);

          // Iteration 3 state

          var blQuizAnswered = d.blQuizAnswered || false;

          var blQuizCorrect = d.blQuizCorrect || false;

          var blQuizSelected = d.blQuizSelected === undefined ? -1 : d.blQuizSelected;

          var blLatencies = d.blLatencies || [];

          var blLastTargetTick = d.blLastTargetTick || 0;

          var blChainStep = d.blChainStep || 0;

          var blChainHistory = d.blChainHistory || [];

          var blMoodEmoji = d.blMoodEmoji || '😐';

          var blMoodTimer = d.blMoodTimer || 0;

          // Iteration 5 state

          var blDroTimer = d.blDroTimer || 0;

          var blDroInterval = d.blDroInterval || 6;

          var blDroSuccesses = d.blDroSuccesses || 0;

          var blEarTwitchSeed = d.blEarTwitchSeed || Math.random() * 1000;

          var blSpinAngle = d.blSpinAngle || 0;

          var blRecentActions = d.blRecentActions || [];

          var blTargetX = d.blTargetX || blMouseX;

          var blTargetY = d.blTargetY || blMouseY;

          var blActionDwell = d.blActionDwell || 0;

          // Delta-based proximity shaping

          var blPosHistory = d.blPosHistory || [];

          var blProxDelta = d.blProxDelta || 0;

          // Classical conditioning (Level 9)

          var blCcPhase = d.blCcPhase || 'baseline'; // baseline, pairing, test, extinction

          var blAssocStrength = d.blAssocStrength || 0; // 0-100

          var blPairCount = d.blPairCount || 0;

          var blBellRinging = d.blBellRinging || false;

          var blSalivating = d.blSalivating || false;

          var blCcExtTrials = d.blCcExtTrials || 0;

          var blBellTime = d.blBellTime || 0;

          // Wave 2 state
          var blSchedCanvas = d.blSchedCanvas || false;
          var blSchedPaused = d.blSchedPaused !== false;
          var blSchedTick = d.blSchedTick || 0;
          var blSchedData = d.blSchedData || { FR: [], VR: [], FI: [], VI: [] };
          var blMatrixIdx = d.blMatrixIdx === undefined ? null : d.blMatrixIdx;
          var blTokenBalance = d.blTokenBalance || 0;
          var blTokenLog = d.blTokenLog || [];
          var blTokenRewards = d.blTokenRewards || [];
          var blShowCondCompare = d.blShowCondCompare || false;
          var blShowBipPlanner = d.blShowBipPlanner || false;
          var blBipStep = d.blBipStep || 0;
          var blBipData = d.blBipData || { behavior: '', antecedent: '', consequence: '', func: '', replacement: '', strategy: '' };

          // Wave 3 state
          var blScenarioIdx = d.blScenarioIdx || 0;
          var blScenarioAnswer = d.blScenarioAnswer === undefined ? -1 : d.blScenarioAnswer;
          var blScenarioScore = d.blScenarioScore || 0;
          var blScenarioTotal = d.blScenarioTotal || 0;
          var blShowTimeline = d.blShowTimeline || false;
          var blShowQuickRef = d.blShowQuickRef || false;
          var blStreak = d.blStreak || 0;
          var blBestStreak = d.blBestStreak || 0;

          // ── rAF Animation System (hooks at top level, before returns) ──
          var _blCvRef = React.useRef(null);
          var _blAnimId = React.useRef(0);
          var _blAnimState = React.useRef({
            mouseX: 200, mouseY: 150, targetX: 200, targetY: 150,
            mouseDir: 1, mouseAction: 'explore', mouseAngle: 0,
            foodVisible: false, foodTime: 0, moodEmoji: '', moodTimer: 0,
            leverPressed: false, lightColor: 'green', paused: false,
            tick: 0, levelScore: 0, proxDelta: 0, level: 1,
            extinctionPhase: false, extinctionStart: 0,
            chainStep: 0, chainSeqLen: 3,
            ccPhase: 'baseline', bellRinging: false, salivating: false, assocStrength: 0,
            droTimer: 0, droInterval: 6,
            trail: [], recentActions: [],
            speed: 1, soundOn: true, season: 0,
            varroaLevel: 0, habitat: 50
          });
          var _blTickTimer = React.useRef(null);

          // Sync React state -> mutable animation state every render
          var _as = _blAnimState.current;
          _as.targetX = blTargetX; _as.targetY = blTargetY;
          _as.mouseDir = blMouseDir; _as.mouseAction = blMouseAction;
          _as.mouseAngle = blMouseAngle;
          _as.foodVisible = blFoodVisible; _as.foodTime = blFoodTime;
          _as.moodEmoji = blMoodEmoji; _as.moodTimer = blMoodTimer;
          _as.leverPressed = blMouseAction === 'pressLever';
          _as.lightColor = blLightColor; _as.paused = blPaused;
          _as.tick = blTick; _as.levelScore = blLevelScore;
          _as.proxDelta = blProxDelta; _as.level = blLevel;
          _as.extinctionPhase = blExtinctionPhase; _as.extinctionStart = blExtinctionStart;
          _as.chainStep = blChainStep;
          _as.ccPhase = blCcPhase; _as.bellRinging = blBellRinging;
          _as.salivating = blSalivating; _as.assocStrength = blAssocStrength;
          _as.droTimer = blDroTimer; _as.droInterval = blDroInterval;
          _as.recentActions = blRecentActions;
          _as.speed = d.blSpeed || 1;

          // ── rAF loop: smooth interpolation + drawing at 60fps ──
          React.useEffect(function() {
            var cv = _blCvRef.current;
            if (!cv) { cv = document.getElementById('bl-chamber-canvas'); _blCvRef.current = cv; }
            if (!cv) return;
            var s = _blAnimState.current;
            // Initialize visual position to current target
            if (s.mouseX === 200 && s.mouseY === 150 && s.targetX !== 200) {
              s.mouseX = s.targetX; s.mouseY = s.targetY;
            }

            function blFrame() {
              var cv2 = _blCvRef.current || document.getElementById('bl-chamber-canvas');
              if (!cv2) { _blAnimId.current = requestAnimationFrame(blFrame); return; }
              var st = _blAnimState.current;

              // Distance-adaptive lerp
              var dx = st.targetX - st.mouseX;
              var dy = st.targetY - st.mouseY;
              var dist = Math.sqrt(dx * dx + dy * dy);
              var rate = dist > 100 ? 0.06 : dist > 50 ? 0.10 : 0.14;
              st.mouseX += dx * rate;
              st.mouseY += dy * rate;
              // Snap when close
              if (Math.abs(dx) < 0.5) st.mouseX = st.targetX;
              if (Math.abs(dy) < 0.5) st.mouseY = st.targetY;

              // Trail (last 60 frames ~ 1 second at 60fps)
              st.trail.push({ x: st.mouseX, y: st.mouseY, t: Date.now() });
              if (st.trail.length > 90) st.trail.shift();

              // Draw chamber
              drawChamber(cv2, st);
              _blAnimId.current = requestAnimationFrame(blFrame);
            }
            if (_blAnimId.current) cancelAnimationFrame(_blAnimId.current);
            blFrame();
            return function() { if (_blAnimId.current) cancelAnimationFrame(_blAnimId.current); };
          });

          // ── Sound effects (Web Audio API) ──

          var _blAudioCtx = null;

          function blBeep(freq, dur, vol) {

            if (!blSoundOn) return;

            try {

              if (!_blAudioCtx) _blAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

              var osc = _blAudioCtx.createOscillator();

              var gain = _blAudioCtx.createGain();

              osc.connect(gain); gain.connect(_blAudioCtx.destination);

              osc.frequency.value = freq; osc.type = 'sine';

              gain.gain.value = vol || 0.15;

              gain.gain.exponentialRampToValueAtTime(0.001, _blAudioCtx.currentTime + (dur || 0.15));

              osc.start(); osc.stop(_blAudioCtx.currentTime + (dur || 0.15));

            } catch (e) { }

          }



          // Default probability weights

          var defaultWeights = { explore: 30, groom: 15, sniff: 15, approachLever: 10, pressLever: 3, turnLeft: 10, turnRight: 10, halfTurn: 3, rearUp: 5, freeze: 5, spin: 1, touchWall: 3 };

          var blWeights = d.blWeights || Object.assign({}, defaultWeights);



          // ── Contextual Hints ──

          var blHint = '';

          if (blShowHints && blPhase === 'running') {

            if (blLevel === 1 && blLevelScore === 0 && blTick > 3) blHint = '\uD83D\uDCA1 Start by reinforcing when the mouse approaches the lever area. Then wait for actual presses!';

            else if (blLevel === 1 && blLevelScore > 0 && blLevelScore < 3) blHint = '\uD83D\uDC4D Great! Keep reinforcing lever presses. Watch the probability bar grow!';

            else if (blLevel === 2 && blLevelScore === 0 && blTick > 5) blHint = '\uD83D\uDCA1 Shape in stages: reinforce Turn Right (↪️) first, then Half-Turns, then full Spins!';

            else if (blLevel === 3 && !blExtinctionPhase && blLevelScore >= 5) blHint = '\uD83D\uDCA1 You\'ve reinforced 5 times! Click "Start Extinction" to stop reinforcing.';

            else if (blLevel === 4 && blTick > 3) blHint = '\uD83D\uDCA1 FR-3: Only reinforce every 3rd lever press (count them!)';

            else if (blLevel === 5 && blTick > 3) blHint = '\uD83D\uDCA1 Only reinforce when the GREEN light (SD) is on!';

          }



          var currentLevel = LEVELS.find(function (l) { return l.id === blLevel; }) || LEVELS[0];



          // ── Action labels for display ──

          var ACTION_LABELS = {

            explore: '🔍 Exploring', groom: '🧹 Grooming', sniff: '👃 Sniffing',

            pressLever: '⚡ Pressing Lever!', turnLeft: '↩️ Turning Left', turnRight: '↪️ Turning Right',

            rearUp: '🐭 Rearing Up', freeze: '🧊 Frozen', spin: '🌀 Spinning!', touchWall: '🧱 Touching Wall'

          };



          var ACTION_COLORS = {

            explore: '#60a5fa', groom: '#a78bfa', sniff: '#34d399',

            pressLever: '#f59e0b', turnLeft: '#f472b6', turnRight: '#f472b6',

            rearUp: '#fb923c', freeze: '#94a3b8', spin: '#c084fc', touchWall: '#6b7280'

          };



          // ── Level accent colors ──

          var LEVEL_COLORS = { 1: '#f59e0b', 2: '#8b5cf6', 3: '#ef4444', 4: '#3b82f6', 5: '#22c55e', 6: '#ec4899', 7: '#a855f7', 8: '#06b6d4', 9: '#e11d48' };

          var lvlAccent = LEVEL_COLORS[blLevel] || '#f59e0b';



          // ── Behavior Engine: Select next action based on weights ──

          function selectAction() {

            var total = 0;

            var keys = Object.keys(blWeights);

            for (var i = 0; i < keys.length; i++) total += blWeights[keys[i]];

            var roll = Math.random() * total;

            var cumulative = 0;

            for (var j = 0; j < keys.length; j++) {

              cumulative += blWeights[keys[j]];

              if (roll <= cumulative) return keys[j];

            }

            return 'explore';

          }



          // ── Reinforce: increase weight of the last action ──

          function reinforceAction() {

            if (!blLastAction) return;

            var actionToReinforce = blLastAction;

            var newWeights = Object.assign({}, blWeights);

            newWeights[actionToReinforce] = Math.min((newWeights[actionToReinforce] || 5) + 4, 70);



            // For level 5 (stimulus discrimination), only count if light is correct color

            if (blLevel === 5 && blLightColor !== 'green') {

              var newLog = blAbcLog.slice();

              newLog.unshift({ tick: blTick, a: blLightColor + ' light (S\u0394)', b: ACTION_LABELS[actionToReinforce] || actionToReinforce, c: '\u274C Food (incorrect SD)', t: Date.now() });

              upd('blAbcLog', newLog.slice(0, 50));

              if (addToast) addToast('\u274C Only reinforce when the GREEN light (SD) is on!', 'error');

              return;

            }



            // Level 7: behavior chain check — only allow reinforce on completed chain

            if (blLevel === 7) {

              if (blChainStep < CHAIN_SEQ.length || actionToReinforce !== 'pressLever') {

                if (addToast) addToast('\u26A0\uFE0F Wait for the full chain: Sniff ➜ Rear Up ➜ Lever!', 'warning');

                return;

              }

            }



            upd('blWeights', newWeights);

            upd('blReinforcements', blReinforcements + 1);

            upd('blFoodVisible', true);

            upd('blFoodTime', Date.now());

            blBeep(880, 0.12, 0.2);

            setTimeout(function () { upd('blFoodVisible', false); }, 1200);



            // Mood update — happy!

            upd('blMoodEmoji', '😊');

            upd('blMoodTimer', Date.now());



            // Response latency tracking

            if (blLastTargetTick > 0) {

              var latencyTicks = blTick - blLastTargetTick;

              var newLatencies = blLatencies.concat([latencyTicks]);

              if (newLatencies.length > 50) newLatencies = newLatencies.slice(-50);

              upd('blLatencies', newLatencies);

            }



            // Update score

            var isTargetAction = actionToReinforce === (currentLevel.target || 'pressLever');

            if (isTargetAction) {

              upd('blLevelScore', blLevelScore + 1);
              if (announceToSR) announceToSR('Reinforced! Score: ' + (blLevelScore + 1) + ' of ' + (currentLevel ? currentLevel.goal : '?'));

            }



            // Level 7 chain: reset chain step after reinforcement

            if (blLevel === 7) {

              upd('blChainStep', 0);

              upd('blChainHistory', blChainHistory.concat([blTick]));

            }



            // ABC log

            var antecedent = blLevel === 5 ? (blLightColor + ' light') : (blLevel === 7 ? 'Chain complete' : 'Chamber');

            var newLog2 = blAbcLog.slice();

            newLog2.unshift({ tick: blTick, a: antecedent, b: ACTION_LABELS[actionToReinforce] || actionToReinforce, c: '\uD83C\uDF55 Food pellet (+SR)', t: Date.now() });

            upd('blAbcLog', newLog2.slice(0, 50));



            // XP

            if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 2, 'Reinforced ' + actionToReinforce);



            // Level 4: schedule tracking

            if (blLevel === 4) {

              upd('blScheduleCount', blScheduleCount + 1);

            }

          }



          // ── Action dwell times (ticks an action persists) ──

          // Action dwell times (ticks an action persists) — increased for smoother observation
          var ACTION_DWELL = { explore: 5, groom: 6, sniff: 4, approachLever: 5, pressLever: 4, turnLeft: 4, turnRight: 4, halfTurn: 5, rearUp: 4, freeze: 6, spin: 5, touchWall: 4 };



          // ── Advance simulation by one tick ──

          function advanceTick() {

            if (blPaused || blPhase !== 'running') return;



            var newTick = blTick + 1;



            // Dwell: if current action still has dwell ticks, keep it

            if (blActionDwell > 1) {

              upd('blActionDwell', blActionDwell - 1);

              upd('blTick', newTick);

              upd('blTotalTicks', (d.blTotalTicks || 0) + 1);

              var targetAction2 = currentLevel.target || 'pressLever';

              var cumCount2 = blCumRecord.length > 0 ? blCumRecord[blCumRecord.length - 1].cum : 0;

              var newCumDwell = blCumRecord.concat([{ tick: newTick, cum: cumCount2, burst: false }]);

              if (newCumDwell.length > 200) newCumDwell = newCumDwell.slice(-200);

              upd('blCumRecord', newCumDwell);

              return;

            }



            var action = selectAction();

            var dwell = ACTION_DWELL[action] || 2;

            upd('blActionDwell', dwell);



            // Update mouse position based on action

            var newX = blMouseX;

            var newY = blMouseY;

            var newDir = blMouseDir;

            var newAngle = blMouseAngle;



            switch (action) {

              case 'explore':

                newX = Math.max(40, Math.min(360, blMouseX + (Math.random() - 0.5) * 50));

                newY = Math.max(80, Math.min(230, blMouseY + (Math.random() - 0.5) * 35));

                newDir = Math.random() > 0.5 ? 1 : -1;

                break;

              case 'approachLever':

                newX = 280 + Math.random() * 40;

                newY = 180 + Math.random() * 30;

                newDir = 1;

                break;

              case 'pressLever':

                newX = 340; newY = 210;

                break;

              case 'turnLeft':

                newDir = -1;

                newAngle = blMouseAngle - 90;

                break;

              case 'turnRight':

                newDir = 1;

                newAngle = blMouseAngle + 90;

                break;

              case 'halfTurn':

                newDir = -newDir;

                newAngle = blMouseAngle + 180;

                break;

              case 'spin':

                newAngle = blMouseAngle + 360;

                break;

              case 'rearUp':

                newY = Math.max(80, blMouseY - 20);

                break;

              case 'touchWall':

                newX = Math.random() > 0.5 ? 35 : 365;

                newY = blMouseY;

                break;

              case 'sniff':

                newX = blMouseX + (Math.random() - 0.5) * 20;

                newY = blMouseY + (Math.random() - 0.5) * 15;

                break;

              case 'groom':

              case 'freeze':

                // Stay in place

                break;

            }



            // ── Delta-based proximity shaping ──

            // Track rolling position history (last 5 positions)

            var newPosHist = (d.blPosHistory || []).concat([{ x: newX, y: newY }]);

            if (newPosHist.length > 5) newPosHist = newPosHist.slice(-5);

            upd('blPosHistory', newPosHist);



            // Compute proximity delta: how much closer is mouse to lever vs 3 ticks ago?

            var LEVER_X = 340, LEVER_Y = 210;

            if (newPosHist.length >= 3) {

              var oldPos = newPosHist[newPosHist.length - 3];

              var oldDist = Math.sqrt(Math.pow(oldPos.x - LEVER_X, 2) + Math.pow(oldPos.y - LEVER_Y, 2));

              var newDist = Math.sqrt(Math.pow(newX - LEVER_X, 2) + Math.pow(newY - LEVER_Y, 2));

              var proxDelta = oldDist - newDist; // positive = getting closer

              upd('blProxDelta', Math.round(proxDelta * 10) / 10);



              // Apply shaping on levels 1, 2, and 6 (sandbox) — any proximity gain counts

              if ((blLevel === 1 || blLevel === 2 || blLevel === 6) && proxDelta > 5) {

                var w2 = Object.assign({}, newWeights);

                // Proportional boost: bigger approach = bigger reinforcement

                var boost = proxDelta > 15 ? 0.6 : 0.3;

                w2.approachLever = Math.min(40, (w2.approachLever || 10) + boost);

                w2.pressLever = Math.min(12, (w2.pressLever || 3) + boost * 0.5);

                newWeights = w2;

              }

            }



            // Update cumulative record for target behavior

            var targetAction = currentLevel.target || 'pressLever';

            var cumCount = blCumRecord.length > 0 ? blCumRecord[blCumRecord.length - 1].cum : 0;

            if (action === targetAction) {

              cumCount++;

              upd('blLastTargetTick', newTick);

            }

            // Mark extinction burst on cumulative record

            var isBurstTick = blLevel === 3 && blExtinctionPhase && (newTick - blExtinctionStart) < 12;

            var newCumRecord = blCumRecord.concat([{ tick: newTick, cum: cumCount, burst: isBurstTick }]);

            if (newCumRecord.length > 200) newCumRecord = newCumRecord.slice(-200);



            // Level 7: chain step tracking

            if (blLevel === 7) {

              var curChainStep = blChainStep;

              if (action === CHAIN_SEQ[curChainStep]) {

                curChainStep++;

                if (curChainStep <= CHAIN_SEQ.length) {

                  upd('blChainStep', curChainStep);

                  if (curChainStep < CHAIN_SEQ.length) {

                    blBeep(600 + curChainStep * 200, 0.08, 0.12);

                  } else {

                    blBeep(1400, 0.2, 0.2);

                  }

                }

              } else if (CHAIN_SEQ.indexOf(action) >= 0 && action !== CHAIN_SEQ[curChainStep]) {

                // Wrong order — reset chain

                upd('blChainStep', 0);

              }

            }



            // Mood decay

            if (blMoodTimer > 0 && (Date.now() - blMoodTimer) > 5000) {

              upd('blMoodEmoji', blReinforcements > 3 ? '🤔' : '😐');

              upd('blMoodTimer', 0);

            }



            // History

            var newHistory = blHistory.concat([{ tick: newTick, action: action }]);

            if (newHistory.length > 100) newHistory = newHistory.slice(-100);



            // Natural extinction drift (unreinforced actions slowly return to baseline)

            var newWeights = Object.assign({}, blWeights);

            var wKeys = Object.keys(newWeights);

            for (var wi = 0; wi < wKeys.length; wi++) {

              var wk = wKeys[wi];

              if (newWeights[wk] > defaultWeights[wk] + 2) {

                newWeights[wk] = Math.max(defaultWeights[wk], newWeights[wk] - 0.15);

              }

            }



            // Level 3: extinction burst simulation

            if (blLevel === 3 && blExtinctionPhase) {

              var ticksSinceExtinction = newTick - blExtinctionStart;

              if (ticksSinceExtinction < 12) {

                // Extinction burst: INCREASE lever pressing temporarily (dramatic spike)

                newWeights.pressLever = Math.min(65, (newWeights.pressLever || 5) + 8);

              } else if (ticksSinceExtinction < 30) {

                // Gradual decrease

                newWeights.pressLever = Math.max(2, (newWeights.pressLever || 5) - 2);

              }

            }



            // Level 5: cycle light colors + audio SD cues

            if (blLevel === 5 && newTick % 8 === 0) {

              var nextColor = blLightColor === 'green' ? 'red' : 'green';

              upd('blLightColor', nextColor);

              if (nextColor === 'green') blBeep(1200, 0.15, 0.18);

              else blBeep(200, 0.25, 0.12);

            }



            // Level 8: DRO timer mechanic

            if (blLevel === 8 && blPhase === 'running') {

              if (action === 'pressLever') {

                // Target behavior occurred — reset DRO timer

                upd('blDroTimer', 0);

                var droResetLog = blAbcLog.slice();

                droResetLog.unshift({ tick: newTick, a: 'DRO timer running', b: '⚡ Pressing Lever!', c: '🔄 Timer reset (target occurred)', t: Date.now() });

                upd('blAbcLog', droResetLog.slice(0, 50));

                blBeep(200, 0.15, 0.1);

              } else {

                var newDroTimer = blDroTimer + 1;

                if (newDroTimer >= blDroInterval) {

                  // DRO interval met! Auto-deliver food

                  upd('blDroTimer', 0);

                  upd('blDroSuccesses', blDroSuccesses + 1);

                  upd('blFoodVisible', true);

                  upd('blFoodTime', Date.now());

                  upd('blReinforcements', blReinforcements + 1);

                  upd('blLevelScore', blLevelScore + 1);

                  upd('blMoodEmoji', '😊');

                  upd('blMoodTimer', Date.now());

                  blBeep(880, 0.12, 0.2);

                  setTimeout(function () { upd('blFoodVisible', false); }, 1200);

                  var droSuccessLog = blAbcLog.slice();

                  droSuccessLog.unshift({ tick: newTick, a: 'DRO interval complete', b: 'No lever press for ' + blDroInterval + ' ticks', c: '🍕 Food delivered (DRO success!)', t: Date.now() });

                  upd('blAbcLog', droSuccessLog.slice(0, 50));

                  if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 2, 'DRO interval success');

                  if (addToast) addToast('🍕 DRO interval met! Food delivered.', 'success');

                } else {

                  upd('blDroTimer', newDroTimer);

                }

              }

            }



            // Level 9: Classical conditioning automatic salivation decay

            if (blLevel === 9 && blPhase === 'running') {

              // Auto-clear bell after 3 ticks

              if (blBellRinging && blBellTime > 0 && (Date.now() - blBellTime) > 2000) {

                upd('blBellRinging', false);

              }

              // Auto-clear salivation

              if (blSalivating && (Date.now() - (d.blSalivateTime || 0)) > 2500) {

                upd('blSalivating', false);

              }

              // In test/extinction phase: if bell is ringing and assocStrength > 30, auto-salivate (CR)

              if (blBellRinging && blAssocStrength > 30 && (blCcPhase === 'test' || blCcPhase === 'extinction')) {

                upd('blSalivating', true);

                upd('blSalivateTime', Date.now());

              }

            }



            // Check level completion

            var justCompleted = false;

            if (currentLevel.goal > 0 && blLevelScore >= currentLevel.goal && blPhase === 'running') {

              justCompleted = true;

              upd('blPhase', 'complete');

              if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 15, 'Completed Level ' + blLevel + ': ' + currentLevel.title);

              if (addToast) addToast('\uD83C\uDF89 Level ' + blLevel + ' Complete! ' + currentLevel.concept + ' mastered!', 'success');
              if (announceToSR) announceToSR('Congratulations! Level ' + blLevel + ' complete. ' + currentLevel.concept + ' mastered.');

              var newCompleted = blCompletedLevels.indexOf(blLevel) < 0 ? blCompletedLevels.concat([blLevel]) : blCompletedLevels;

              upd('blCompletedLevels', newCompleted);

            }



            // Level 3 special: completion is observing the burst

            if (blLevel === 3 && blExtinctionPhase) {

              var ticksSince = newTick - blExtinctionStart;

              if (ticksSince >= 25 && blPhase === 'running') {

                justCompleted = true;

                upd('blPhase', 'complete');

                if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 15, 'Completed Level 3: Observed extinction burst');

                if (addToast) addToast('\uD83C\uDF89 Level 3 Complete! You observed the extinction burst!', 'success');
                if (announceToSR) announceToSR('Level 3 complete! You observed the extinction burst.');

                var newCompleted3 = blCompletedLevels.indexOf(3) < 0 ? blCompletedLevels.concat([3]) : blCompletedLevels;

                upd('blCompletedLevels', newCompleted3);

              }

            }



            // Batch update state

            upd('blTick', newTick);

            upd('blMouseAction', action);

            upd('blTargetX', newX);

            upd('blTargetY', newY);

            upd('blMouseDir', newDir);

            upd('blMouseAngle', newAngle);

            upd('blHistory', newHistory);

            upd('blCumRecord', newCumRecord);

            upd('blWeights', newWeights);

            upd('blLastAction', action);

            upd('blActionAge', 0);

            // Track recent actions for heatmap strip

            var newRecentActions = blRecentActions.concat([action]);

            if (newRecentActions.length > 20) newRecentActions = newRecentActions.slice(-20);

            upd('blRecentActions', newRecentActions);

          }





          // ── Canvas Drawing ──

          function drawChamber(canvas, _st) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            // HiDPI support
            var dpr = window.devicePixelRatio || 1;
            var targetW = canvas.offsetWidth || 420;
            var targetH = 280;
            if (canvas.width !== Math.round(targetW * dpr) || canvas.height !== Math.round(targetH * dpr)) {
              canvas.width = Math.round(targetW * dpr);
              canvas.height = Math.round(targetH * dpr);
              canvas.style.width = targetW + 'px';
              canvas.style.height = targetH + 'px';
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var W = targetW;
            var H = targetH;

            // Read from animation state if provided (rAF path), else fall back to closure vars
            var blMouseX = _st ? _st.mouseX : (d.blMouseX || 200);
            var blMouseY = _st ? _st.mouseY : (d.blMouseY || 150);
            var blMouseAction = _st ? _st.mouseAction : (d.blMouseAction || 'explore');
            var blMouseDir = _st ? _st.mouseDir : (d.blMouseDir || 1);
            var blMouseAngle = _st ? _st.mouseAngle : (d.blMouseAngle || 0);
            var blFoodVisible = _st ? _st.foodVisible : d.blFoodVisible;
            var blFoodTime = _st ? _st.foodTime : (d.blFoodTime || 0);
            var blMoodEmoji = _st ? _st.moodEmoji : (d.blMoodEmoji || '');
            var blMoodTimer = _st ? _st.moodTimer : (d.blMoodTimer || 0);
            var blLightColor = _st ? _st.lightColor : (d.blLightColor || 'green');
            var blTick = _st ? _st.tick : (d.blTick || 0);
            var blLevelScore = _st ? _st.levelScore : (d.blLevelScore || 0);
            var blLevel = _st ? _st.level : (d.blLevel || 1);
            var blExtinctionPhase = _st ? _st.extinctionPhase : d.blExtinctionPhase;
            var blExtinctionStart = _st ? _st.extinctionStart : (d.blExtinctionStart || 0);
            var blChainStep = _st ? _st.chainStep : (d.blChainStep || 0);
            var blCcPhase = _st ? _st.ccPhase : (d.blCcPhase || 'baseline');
            var blBellRinging = _st ? _st.bellRinging : d.blBellRinging;
            var blSalivating = _st ? _st.salivating : d.blSalivating;
            var blAssocStrength = _st ? _st.assocStrength : (d.blAssocStrength || 0);
            var blDroTimer = _st ? _st.droTimer : (d.blDroTimer || 0);
            var blDroInterval = _st ? _st.droInterval : (d.blDroInterval || 6);
            var blProxDelta = _st ? _st.proxDelta : (d.blProxDelta || 0);



            // Chamber background

            var chamberGrad = ctx.createLinearGradient(0, 0, 0, H);

            chamberGrad.addColorStop(0, '#1e1b2e');

            chamberGrad.addColorStop(1, '#2d2641');

            ctx.fillStyle = chamberGrad;

            ctx.fillRect(0, 0, W, H);



            // Chamber walls

            ctx.strokeStyle = '#6366f1';

            ctx.lineWidth = 3;

            ctx.strokeRect(20, 50, W - 40, H - 70);



            // Wall texture lines (subtle horizontal stripes)

            ctx.strokeStyle = 'rgba(99, 102, 241, 0.06)';

            ctx.lineWidth = 0.5;

            for (var wly = 65; wly < H - 30; wly += 15) {

              ctx.beginPath(); ctx.moveTo(22, wly); ctx.lineTo(W - 22, wly); ctx.stroke();

            }

            // Vertical wall texture accents

            ctx.strokeStyle = 'rgba(99, 102, 241, 0.04)';

            for (var wlx = 50; wlx < W - 30; wlx += 40) {

              ctx.beginPath(); ctx.moveTo(wlx, 52); ctx.lineTo(wlx, H - 22); ctx.stroke();

            }



            // Chamber floor

            ctx.fillStyle = '#3b3555';

            ctx.fillRect(20, H - 25, W - 40, 5);



            // Grid lines on floor

            ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';

            ctx.lineWidth = 0.5;

            for (var gx = 40; gx < W - 20; gx += 20) {

              ctx.beginPath(); ctx.moveTo(gx, H - 25); ctx.lineTo(gx, H - 20); ctx.stroke();

            }



            // ─ Light indicator (top-left, enlarged + pulsing glow) ─

            if (blLevel === 5 || blLevel === 6) {
              var lightCol = blLightColor === 'green' ? '#22c55e' : (blLightColor === 'red' ? '#ef4444' : '#6b7280');
              var glowPulse = 0.3 + Math.sin(Date.now() / 400) * 0.15;
              // Pulsing outer glow ring
              ctx.save();
              ctx.beginPath(); ctx.arc(50, 35, 22, 0, Math.PI * 2);
              ctx.fillStyle = (blLightColor === 'green' ? 'rgba(34,197,94,' : 'rgba(239,68,68,') + glowPulse.toFixed(2) + ')';
              ctx.fill();
              ctx.restore();
              // Main light circle
              ctx.beginPath(); ctx.arc(50, 35, 16, 0, Math.PI * 2);
              ctx.fillStyle = lightCol; ctx.fill();
              ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
              // Label
              ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
              ctx.fillText(blLightColor === 'green' ? 'SD' : 'S\u0394', 50, 39);
            }



            // ─ Lever (right side) with depression animation ─

            var leverX = W - 70;

            var leverY = H - 55;

            var leverPressed = blMouseAction === 'pressLever';

            var leverDepth = leverPressed ? 5 : 0;

            // Lever shadow when pressed

            if (leverPressed) {

              ctx.fillStyle = 'rgba(0,0,0,0.2)';

              ctx.fillRect(leverX - 1, leverY + leverDepth + 2, 10, 28);

            }

            ctx.fillStyle = leverPressed ? '#f59e0b' : '#94a3b8';

            ctx.fillRect(leverX, leverY + leverDepth, 8, 30 - leverDepth);

            // Lever base

            ctx.fillStyle = '#64748b';

            ctx.fillRect(leverX - 4, leverY + 25, 16, 8);

            // Lever press glow

            if (leverPressed) {

              ctx.beginPath();

              ctx.arc(leverX + 4, leverY + leverDepth + 10, 18, 0, Math.PI * 2);

              ctx.fillStyle = 'rgba(245,158,11,0.25)';

              ctx.fill();

              // Lever spring coil

              ctx.strokeStyle = '#d97706';

              ctx.lineWidth = 1;

              for (var si = 0; si < 3; si++) {

                ctx.beginPath();

                ctx.moveTo(leverX + 1, leverY + leverDepth + 2 + si * 3);

                ctx.lineTo(leverX + 7, leverY + leverDepth + 2 + si * 3);

                ctx.stroke();

              }

            }

            // Lever label

            ctx.fillStyle = '#94a3b8';

            ctx.font = '8px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText('LEVER', leverX + 4, leverY + 42);



            // ─ Food tray (bottom-left) ─

            var trayX = 55;

            var trayY = H - 40;

            ctx.fillStyle = '#475569';

            ctx.fillRect(trayX - 15, trayY, 30, 12);

            ctx.strokeStyle = '#64748b';

            ctx.lineWidth = 1;

            ctx.strokeRect(trayX - 15, trayY, 30, 12);

            // Food pellet

            if (blFoodVisible) {

              ctx.beginPath();

              ctx.arc(trayX, trayY + 4, 5, 0, Math.PI * 2);

              var foodGrad = ctx.createRadialGradient(trayX - 1, trayY + 2, 1, trayX, trayY + 4, 5);

              foodGrad.addColorStop(0, '#fbbf24');

              foodGrad.addColorStop(1, '#f59e0b');

              ctx.fillStyle = foodGrad;

              ctx.fill();

              // Food glow (enhanced)

              ctx.beginPath();

              ctx.arc(trayX, trayY + 4, 20, 0, Math.PI * 2);

              ctx.fillStyle = 'rgba(251,191,36,' + (0.12 + Math.sin(Date.now() / 200) * 0.08) + ')';

              ctx.fill();

              ctx.beginPath();

              ctx.arc(trayX, trayY + 4, 30, 0, Math.PI * 2);

              ctx.fillStyle = 'rgba(245,158,11,' + (0.04 + Math.sin(Date.now() / 400) * 0.03) + ')';

              ctx.fill();

              // Particle burst on food delivery

              var pAge = (Date.now() - (blFoodTime || Date.now())) / 1000;

              if (pAge < 1.2) {

                for (var pi = 0; pi < 8; pi++) {

                  var pAngle = (pi / 8) * Math.PI * 2;

                  var pDist = pAge * 40 + 5;

                  var pAlpha = Math.max(0, 1 - pAge / 1.2);

                  var ppx = trayX + Math.cos(pAngle) * pDist;

                  var ppy = trayY + 4 + Math.sin(pAngle) * pDist * 0.7;

                  ctx.beginPath();

                  ctx.arc(ppx, ppy, 2.5 * (1 - pAge / 1.5), 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(251,191,36,' + (pAlpha * 0.7) + ')';

                  ctx.fill();

                }

              }

            }

            // Food dispenser chute

            ctx.fillStyle = '#374151';

            ctx.fillRect(trayX - 8, 50, 16, trayY - 50);

            ctx.strokeStyle = '#4b5563';

            ctx.lineWidth = 0.5;

            ctx.strokeRect(trayX - 8, 50, 16, trayY - 50);

            // Inner chute detail lines

            ctx.strokeStyle = 'rgba(75,85,99,0.4)';

            ctx.lineWidth = 0.3;

            for (var chl = 60; chl < trayY - 10; chl += 12) {

              ctx.beginPath(); ctx.moveTo(trayX - 6, chl); ctx.lineTo(trayX + 6, chl); ctx.stroke();

            }

            ctx.fillStyle = '#94a3b8';

            ctx.font = '7px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText('FOOD', trayX, 45);

            // Food pellet dropping animation through chute

            if (blFoodVisible) {

              var dropAge = (Date.now() - (blFoodTime || Date.now())) / 1000;

              if (dropAge < 0.5) {

                var dropProgress = Math.min(1, dropAge / 0.4);

                var chuteLength = trayY - 55;

                var dropY = 55 + chuteLength * dropProgress;

                ctx.beginPath();

                ctx.arc(trayX, dropY, 3.5, 0, Math.PI * 2);

                var dropGrad = ctx.createRadialGradient(trayX - 0.5, dropY - 1, 0.5, trayX, dropY, 3.5);

                dropGrad.addColorStop(0, '#fde68a');

                dropGrad.addColorStop(1, '#f59e0b');

                ctx.fillStyle = dropGrad;

                ctx.fill();

                // Motion trail

                if (dropProgress < 0.8) {

                  ctx.beginPath();

                  ctx.moveTo(trayX, dropY - 4);

                  ctx.lineTo(trayX - 2, dropY - 12);

                  ctx.lineTo(trayX + 2, dropY - 12);

                  ctx.closePath();

                  ctx.fillStyle = 'rgba(251,191,36,' + (0.3 * (1 - dropProgress)) + ')';

                  ctx.fill();

                }

              }

            }



            // ─ Dust motes (ambient particles) ─

            for (var dm = 0; dm < 6; dm++) {

              var dmSeed = dm * 137.5;

              var dmX = 30 + ((dmSeed + Date.now() * 0.008) % (W - 60));

              var dmY = 60 + Math.sin(Date.now() / 2000 + dm) * 30 + (dm * 30);

              if (dmY < H - 30) {

                ctx.beginPath();

                ctx.arc(dmX, dmY, 0.8, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(148, 163, 184, ' + (0.15 + Math.sin(Date.now() / 1500 + dm * 2) * 0.1) + ')';

                ctx.fill();

              }

            }



            // ── Phase 2: Proximity-to-lever visualization ──
            var LEVER_CX = leverX + 4, LEVER_CY = leverY + 15;
            var distToLever = Math.sqrt(Math.pow(blMouseX - LEVER_CX, 2) + Math.pow(blMouseY - LEVER_CY, 2));
            var prox01 = Math.max(0, Math.min(1, 1 - distToLever / 300));

            // Dashed line from mouse to lever (Levels 1,2,6 — where approach matters)
            if (blLevel === 1 || blLevel === 2 || blLevel === 6) {
              ctx.save();
              ctx.setLineDash([4, 6]);
              var pR = Math.round(255 * (1 - prox01)), pG = Math.round(200 * prox01);
              ctx.strokeStyle = 'rgba(' + pR + ',' + pG + ',60,0.35)';
              ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.moveTo(blMouseX, blMouseY); ctx.lineTo(LEVER_CX, LEVER_CY); ctx.stroke();
              ctx.setLineDash([]);
              // Distance label
              var midPX = (blMouseX + LEVER_CX) / 2, midPY = (blMouseY + LEVER_CY) / 2;
              ctx.fillStyle = 'rgba(' + pR + ',' + pG + ',60,0.6)';
              ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
              ctx.fillText(Math.round(distToLever) + 'px', midPX, midPY - 5);
              ctx.restore();
            }

            // Proximity delta HUD (top-left)
            if (blProxDelta !== 0 && (blLevel === 1 || blLevel === 2 || blLevel === 6)) {
              var pdCol = blProxDelta > 0 ? '#22c55e' : '#ef4444';
              var pdArr = blProxDelta > 0 ? '\u2191' : '\u2193';
              ctx.fillStyle = pdCol; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
              ctx.fillText(pdArr + ' ' + Math.abs(blProxDelta).toFixed(1) + 'px', 25, 35);
              ctx.fillStyle = '#64748b'; ctx.font = '7px sans-serif';
              ctx.fillText('distance \u0394', 25, 44);
            }

            // Movement trail (fading dots)
            if (_st && _st.trail && _st.trail.length > 2) {
              var trNow = Date.now();
              for (var tri = 0; tri < _st.trail.length; tri++) {
                var trp = _st.trail[tri];
                var trAge = (trNow - trp.t) / 2000;
                if (trAge > 1) continue;
                var trAlpha = 0.25 * (1 - trAge);
                ctx.beginPath(); ctx.arc(trp.x, trp.y, 1.5 + (1 - trAge), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99,102,241,' + trAlpha.toFixed(2) + ')'; ctx.fill();
              }
            }

            // ── Phase 3B: Extinction burst effects (Level 3) ──
            if (blLevel === 3 && blExtinctionPhase) {
              var burstTick = blTick - blExtinctionStart;
              if (burstTick < 12) {
                // Pulsing red border
                ctx.save();
                ctx.strokeStyle = 'rgba(239,68,68,' + (0.3 + Math.sin(Date.now() / 200) * 0.25).toFixed(2) + ')';
                ctx.lineWidth = 4;
                ctx.strokeRect(18, 48, W - 36, H - 65);
                // Label
                ctx.fillStyle = '#ef4444'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('EXTINCTION BURST', W / 2, 68);
                ctx.font = '9px sans-serif'; ctx.fillStyle = '#f87171';
                ctx.fillText('Response rate spiking! (' + burstTick + '/12 ticks)', W / 2, 82);
                ctx.restore();
              }
            }

            // ── Phase 3D: SD/S-delta chamber tint (Level 5) ──
            if (blLevel === 5) {
              var sdAlpha = 0.06 + Math.sin(Date.now() / 600) * 0.02;
              ctx.fillStyle = blLightColor === 'green' ? 'rgba(34,197,94,' + sdAlpha.toFixed(3) + ')' : 'rgba(239,68,68,' + sdAlpha.toFixed(3) + ')';
              ctx.fillRect(0, 0, W, H);
              // Reminder text
              ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
              ctx.fillStyle = blLightColor === 'green' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)';
              ctx.fillText(blLightColor === 'green' ? '\u2705 GREEN = Reinforce!' : '\u274C RED = Do NOT reinforce!', W / 2, H - 10);
            }

            // ── Phase 3E: Chain overlay (Level 7) ──
            if (blLevel === 7) {
              var chainLabels = ['1\uFE0F\u20E3 Sniff', '2\uFE0F\u20E3 Rear Up', '3\uFE0F\u20E3 Press'];
              var chainPositions = [{ x: 120, y: 150 }, { x: 220, y: 110 }, { x: LEVER_CX, y: LEVER_CY }];
              for (var ci = 0; ci < 3; ci++) {
                var cp = chainPositions[ci];
                var isDone = ci < blChainStep;
                var isCurrent = ci === blChainStep;
                ctx.save();
                ctx.globalAlpha = isDone ? 0.9 : isCurrent ? 0.7 : 0.25;
                ctx.fillStyle = isDone ? '#22c55e' : isCurrent ? '#fbbf24' : '#475569';
                ctx.beginPath(); ctx.arc(cp.x, cp.y, 12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(chainLabels[ci], cp.x, cp.y + 3);
                ctx.globalAlpha = 1;
                // Connecting arrow to next step
                if (ci < 2) {
                  var np = chainPositions[ci + 1];
                  ctx.strokeStyle = isDone ? 'rgba(34,197,94,0.4)' : 'rgba(71,85,105,0.2)';
                  ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
                  ctx.beginPath(); ctx.moveTo(cp.x + 12, cp.y); ctx.lineTo(np.x - 12, np.y); ctx.stroke();
                  ctx.setLineDash([]);
                }
                ctx.restore();
              }
            }

            // ── Phase 4: Mouse shadow ──
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(blMouseX, blMouseY + 13, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // ─ Mouse sprite ─

            var mx = blMouseX;

            var my = blMouseY;

            var dir = blMouseDir || 1;



            // Action-specific animation

            var actionBounce = 0;

            var actionGlow = null;

            var walkCycle = Math.sin(Date.now() / 120) * 3;

            var isMoving = blMouseAction === 'explore' || blMouseAction === 'turnLeft' || blMouseAction === 'turnRight' || blMouseAction === 'halfTurn' || blMouseAction === 'approachLever' || blMouseAction === 'touchWall';

            switch (blMouseAction) {

              case 'approachLever': actionGlow = '#fbbf24'; break;

              case 'pressLever': actionGlow = '#f59e0b'; break;

              case 'spin': actionGlow = '#c084fc'; actionBounce = -3; break;

              case 'rearUp': actionBounce = -12; break;

              case 'groom': actionBounce = Math.sin(Date.now() / 200) * 2; break;

              case 'freeze': actionGlow = '#94a3b8'; break;

              case 'sniff': actionBounce = Math.sin(Date.now() / 150) * 1.5; break;

              case 'explore': actionBounce = Math.abs(walkCycle) * 0.3; break;

              default: break;

            }



            // Breathing animation

            var breathScale = 1 + Math.sin(Date.now() / 800) * 0.02;



            ctx.save();

            ctx.translate(mx, my);

            // Spin rotation: rotate entire mouse during spin action

            if (blMouseAction === 'spin') {

              var _spinDelay = (d.blSpeed || 1) === 3 ? 1200 : (d.blSpeed || 1) === 2 ? 2200 : 3200;

              var spinProgress = ((Date.now() % _spinDelay) / _spinDelay);

              ctx.rotate(spinProgress * Math.PI * 2);

            }

            ctx.scale(breathScale, breathScale);



            // Action glow

            if (actionGlow) {

              ctx.beginPath();

              ctx.ellipse(0, actionBounce - 2, 28, 18, 0, 0, Math.PI * 2);

              ctx.fillStyle = actionGlow + '33';

              ctx.fill();

            }





            // Mouse body

            ctx.beginPath();

            ctx.ellipse(0, actionBounce, 20, 11, 0, 0, Math.PI * 2);

            var bodyGrad = ctx.createRadialGradient(0, actionBounce - 4, 2, 0, actionBounce, 20);

            var breathTint = Math.sin(Date.now() / 800) * 8;

            var bR = Math.min(255, Math.round(212 + breathTint));

            var bG = Math.min(255, Math.round(212 + breathTint));

            var bB = Math.min(255, Math.round(216 + breathTint));

            bodyGrad.addColorStop(0, 'rgb(' + bR + ',' + bG + ',' + bB + ')');

            bodyGrad.addColorStop(1, '#9ca3af');

            ctx.fillStyle = bodyGrad;

            ctx.fill();

            ctx.strokeStyle = '#6b7280';

            ctx.lineWidth = 0.8;

            ctx.stroke();



            // Mouse head (tracks toward lever/food)

            var headTilt = dir * 0.2;

            var headOffX = dir * 18;

            var headOffY = actionBounce - 4;

            if (blMouseAction === 'pressLever') {

              // Tilt head toward lever (right side)

              headTilt = dir * 0.35;

              headOffX = dir * 20;

            } else if (blFoodVisible) {

              // Look toward food tray (left side)

              headTilt = -dir * 0.15;

              headOffX = dir * 15;

              headOffY = actionBounce - 2;

            } else if (blMouseAction === 'sniff') {

              // Nose-down sniffing tilt

              headTilt = dir * 0.1;

              headOffY = actionBounce - 1;

            }

            ctx.beginPath();

            ctx.ellipse(headOffX, headOffY, 10, 8, headTilt, 0, Math.PI * 2);

            ctx.fillStyle = '#d4d4d8';

            ctx.fill();

            ctx.strokeStyle = '#6b7280';

            ctx.lineWidth = 0.6;

            ctx.stroke();



            // Ears (with subtle random twitch)

            var earTwitch1 = Math.sin(Date.now() / 700 + blEarTwitchSeed) * 0.15;

            var earTwitch2 = Math.sin(Date.now() / 1100 + blEarTwitchSeed * 2.3) * 0.12;

            var earScale1 = 1 + Math.sin(Date.now() / 900 + blEarTwitchSeed) * 0.08;

            var earScale2 = 1 + Math.sin(Date.now() / 1300 + blEarTwitchSeed * 1.7) * 0.06;

            ctx.beginPath();

            ctx.ellipse(dir * 14, actionBounce - 14, 6 * earScale1, 5 * earScale1, earTwitch1, 0, Math.PI * 2);

            ctx.fillStyle = '#fca5a5';

            ctx.fill();

            ctx.beginPath();

            ctx.ellipse(dir * 22, actionBounce - 12, 5 * earScale2, 4 * earScale2, earTwitch2, 0, Math.PI * 2);

            ctx.fillStyle = '#fca5a5';

            ctx.fill();



            // Eye

            ctx.beginPath();

            ctx.arc(dir * 24, actionBounce - 5, 2, 0, Math.PI * 2);

            ctx.fillStyle = '#1e1b2e';

            ctx.fill();

            // Eye shine

            ctx.beginPath();

            ctx.arc(dir * 24.5, actionBounce - 6, 0.7, 0, Math.PI * 2);

            ctx.fillStyle = '#fff';

            ctx.fill();



            // Nose

            ctx.beginPath();

            ctx.arc(dir * 27, actionBounce - 3, 1.5, 0, Math.PI * 2);

            ctx.fillStyle = '#f472b6';

            ctx.fill();



            // Tail (enhanced speed-reactive wobble, stronger after food)

            var tailSpeedMult = blSpeed === 3 ? 1.4 : blSpeed === 2 ? 1.15 : 1;

            var tailBaseFreq = 180 / tailSpeedMult;

            var tailWag = Math.sin(Date.now() / tailBaseFreq) * 6;

            var isHappy = blMoodEmoji === '😊';

            var recentFood = blFoodVisible || (blFoodTime && (Date.now() - blFoodTime) < 2000);

            if (isHappy || recentFood) {

              tailWag = Math.sin(Date.now() / (60 / tailSpeedMult)) * 14;

            }

            if (isMoving) tailWag *= 1.3;

            ctx.beginPath();

            ctx.moveTo(-dir * 18, actionBounce);

            ctx.bezierCurveTo(

              -dir * 26, actionBounce - 10 + tailWag * 0.7,

              -dir * 33, actionBounce - 18 + tailWag,

              -dir * 40, actionBounce - 10 - tailWag * 0.5

            );

            ctx.strokeStyle = '#fca5a5';

            ctx.lineWidth = recentFood ? 2 : 1.5;

            ctx.stroke();



            // Whiskers

            for (var wi = -1; wi <= 1; wi++) {

              ctx.beginPath();

              ctx.moveTo(dir * 25, actionBounce - 3 + wi * 3);

              ctx.lineTo(dir * 36, actionBounce - 5 + wi * 5);

              ctx.strokeStyle = '#9ca3af';

              ctx.lineWidth = 0.4;

              ctx.stroke();

            }



            // Feet (small ovals) with walking animation

            if (blMouseAction !== 'rearUp') {

              var footOffset = isMoving ? walkCycle : 0;

              ctx.beginPath();

              ctx.ellipse(-8 + footOffset * 0.5, actionBounce + 10, 4, 2, 0, 0, Math.PI * 2);

              ctx.fillStyle = '#fca5a5';

              ctx.fill();

              ctx.beginPath();

              ctx.ellipse(8 - footOffset * 0.5, actionBounce + 10, 4, 2, 0, 0, Math.PI * 2);

              ctx.fillStyle = '#fca5a5';

              ctx.fill();

              // Back feet (walking offset)

              if (isMoving) {

                ctx.beginPath();

                ctx.ellipse(-5 - footOffset * 0.4, actionBounce + 11, 3, 1.5, 0, 0, Math.PI * 2);

                ctx.fillStyle = '#f9a8a8';

                ctx.fill();

                ctx.beginPath();

                ctx.ellipse(5 + footOffset * 0.4, actionBounce + 11, 3, 1.5, 0, 0, Math.PI * 2);

                ctx.fillStyle = '#f9a8a8';

                ctx.fill();

              }

            }



            ctx.restore();



            // ─ Mood emoji indicator ─

            ctx.font = '16px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText(blMoodEmoji, mx, my - 30);



            // ─ Action label ─

            var actionLabel = ACTION_LABELS[blMouseAction] || blMouseAction;

            ctx.fillStyle = ACTION_COLORS[blMouseAction] || '#94a3b8';

            ctx.font = 'bold 11px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText(actionLabel, mx, 48);



            // ─ Tick counter ─

            ctx.fillStyle = '#94a3b8';

            ctx.font = '10px monospace';

            ctx.textAlign = 'right';

            ctx.fillText('Tick: ' + blTick, W - 25, 20);

            ctx.textAlign = 'left';

            ctx.fillText('Score: ' + blLevelScore + (currentLevel.goal > 0 ? '/' + currentLevel.goal : ''), 25, 20);



            // ─ PAUSED overlay ─

            if (blPaused) {

              ctx.fillStyle = 'rgba(0,0,0,0.5)';

              ctx.fillRect(0, 0, W, H);

              ctx.fillStyle = '#f59e0b';

              ctx.font = 'bold 28px sans-serif';

              ctx.textAlign = 'center';

              ctx.fillText('\u23F8 PAUSED', W / 2, H / 2);

            }

          }



          // ── Cumulative Record Drawing ──

          function drawCumRecord(canvas) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width = canvas.offsetWidth || 420;

            var H = canvas.height = 130;

            var data = blCumRecord;



            // Background

            ctx.fillStyle = '#0f172a';

            ctx.fillRect(0, 0, W, H);



            // Title

            ctx.fillStyle = '#94a3b8';

            ctx.font = 'bold 10px sans-serif';

            ctx.textAlign = 'left';

            ctx.fillText('CUMULATIVE RECORD', 10, 14);



            // Axes

            ctx.strokeStyle = '#475569';

            ctx.lineWidth = 1;

            ctx.beginPath();

            ctx.moveTo(35, 5);

            ctx.lineTo(35, H - 20);

            ctx.lineTo(W - 10, H - 20);

            ctx.stroke();



            // Y-axis label

            ctx.save();

            ctx.translate(10, H / 2);

            ctx.rotate(-Math.PI / 2);

            ctx.fillStyle = '#64748b';

            ctx.font = '8px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText('Responses', 0, 0);

            ctx.restore();



            // X-axis label

            ctx.fillStyle = '#64748b';

            ctx.font = '8px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText('Time (ticks)', W / 2, H - 4);



            if (data.length < 2) {

              ctx.fillStyle = '#475569';

              ctx.font = '11px sans-serif';

              ctx.textAlign = 'center';

              ctx.fillText('Waiting for data...', W / 2, H / 2);

              return;

            }



            // Draw line

            var maxCum = Math.max(data[data.length - 1].cum, 5);

            var plotW = W - 50;

            var plotH = H - 35;

            var startTick = data[0].tick;

            var endTick = data[data.length - 1].tick;

            var tickRange = Math.max(endTick - startTick, 1);



            ctx.beginPath();

            ctx.strokeStyle = '#f59e0b';

            ctx.lineWidth = 2;

            for (var i = 0; i < data.length; i++) {

              var px = 40 + ((data[i].tick - startTick) / tickRange) * plotW;

              var py = (H - 25) - (data[i].cum / maxCum) * plotH;

              if (i === 0) ctx.moveTo(px, py);

              else ctx.lineTo(px, py);

            }

            ctx.stroke();



            // Extinction burst markers (red zone on graph)

            if (blLevel === 3 && blExtinctionPhase) {

              for (var bi = 0; bi < data.length; bi++) {

                if (data[bi].burst) {

                  var bpx = 40 + ((data[bi].tick - startTick) / tickRange) * plotW;

                  ctx.beginPath();

                  ctx.moveTo(bpx, 20); ctx.lineTo(bpx, H - 20);

                  ctx.strokeStyle = 'rgba(239,68,68,0.15)';

                  ctx.lineWidth = 4;

                  ctx.stroke();

                }

              }

              // Burst label

              ctx.fillStyle = '#ef4444';

              ctx.font = 'bold 8px sans-serif';

              ctx.textAlign = 'center';

              var burstLabelX = W * 0.7;

              ctx.fillText('EXTINCTION BURST ↑', burstLabelX, 28);

            }



            // Reinforcement pip marks (green vertical lines where cum increases — shows schedule pattern)
            if (blLevel === 4 || blLevel === 1 || blLevel === 6) {
              for (var ri = 1; ri < data.length; ri++) {
                if (data[ri].cum > data[ri - 1].cum) {
                  var rpx = 40 + ((data[ri].tick - startTick) / tickRange) * plotW;
                  var rpy = (H - 25) - (data[ri].cum / maxCum) * plotH;
                  ctx.strokeStyle = 'rgba(34,197,94,0.6)'; ctx.lineWidth = 1.5;
                  ctx.beginPath(); ctx.moveTo(rpx, rpy - 8); ctx.lineTo(rpx, rpy + 8); ctx.stroke();
                  // Green dot at reinforcement point
                  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(rpx, rpy, 3, 0, Math.PI * 2); ctx.fill();
                }
              }
              // FR annotation
              if (blLevel === 4 && data.length > 20) {
                ctx.fillStyle = 'rgba(34,197,94,0.5)'; ctx.font = '7px sans-serif'; ctx.textAlign = 'left';
                ctx.fillText('Green = reinforcement delivery (FR-3 pattern)', 42, H - 8);
              }
            }

            // Data point dots

            ctx.fillStyle = '#fbbf24';

            for (var j = Math.max(0, data.length - 30); j < data.length; j++) {

              var dpx = 40 + ((data[j].tick - startTick) / tickRange) * plotW;

              var dpy = (H - 25) - (data[j].cum / maxCum) * plotH;

              ctx.beginPath();

              ctx.arc(dpx, dpy, 2, 0, Math.PI * 2);

              ctx.fill();

            }



            // Response rate

            if (data.length > 5) {

              var recentData = data.slice(-10);

              var recentResponses = recentData[recentData.length - 1].cum - recentData[0].cum;

              var recentTicks = recentData[recentData.length - 1].tick - recentData[0].tick;

              var rate = recentTicks > 0 ? (recentResponses / recentTicks * 60 / 1.5).toFixed(1) : '0.0';

              ctx.fillStyle = '#fbbf24';

              ctx.font = 'bold 9px sans-serif';

              ctx.textAlign = 'right';

              ctx.fillText('Rate: ' + rate + ' resp/min', W - 15, 14);

            }

          }



          // ── Keyboard shortcut: Spacebar to deliver food ──
          if (!window._blKeyHandler) {
            window._blKeyHandler = function (e) {
              if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (typeof window._blReinforceFn === 'function') window._blReinforceFn();
              }
            };
            document.addEventListener('keydown', window._blKeyHandler);
          }
          window._blReinforceFn = (blLastAction && blPhase === 'running' && blLevel !== 8 && blLevel !== 9) ? reinforceAction : null;

          // ── Render cumulative record canvas (not rAF — only needs tick-rate updates) ──
          setTimeout(function () {
            var cumCv = document.getElementById('bl-cumrecord-canvas');
            drawCumRecord(cumCv);
          }, 0);

          // ── Tick timer (independent of canvas rendering) ──
          React.useEffect(function() {
            if (blPhase !== 'running' || blPaused) {
              if (_blTickTimer.current) { clearInterval(_blTickTimer.current); _blTickTimer.current = null; }
              return;
            }
            var tickDelay = (d.blSpeed || 1) === 3 ? 2000 : (d.blSpeed || 1) === 2 ? 3500 : 5000;
            if (_blTickTimer.current) clearInterval(_blTickTimer.current);
            _blTickTimer.current = setInterval(function() { advanceTick(); }, tickDelay);
            return function() { if (_blTickTimer.current) { clearInterval(_blTickTimer.current); _blTickTimer.current = null; } };
          }, [blPhase, blPaused, d.blSpeed]);



          // ── Weight bar chart data ──

          var sortedWeights = Object.keys(blWeights).map(function (k) {

            return { action: k, weight: blWeights[k], isTarget: k === (currentLevel.target || 'pressLever') };

          }).sort(function (a, b) { return b.weight - a.weight; });



          var maxWeight = Math.max.apply(null, sortedWeights.map(function (w) { return w.weight; }));



          // ═══════════ RENDER ═══════════

          // Intro Phase

          if (blPhase === 'intro') {

            return React.createElement("div", { className: "p-6 space-y-4", role: "main", "aria-label": "Behavior Lab", style: { maxWidth: 700, margin: '0 auto' } },

              // Skip navigation
              React.createElement("a", { href: "#behaviorlab-main", className: "sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg" }, "Skip to main content"),

              // Header
              React.createElement("h2", { id: "behaviorlab-main", className: "sr-only" }, "Behavior Lab — Level " + blLevel),

              React.createElement("div", { className: "flex items-center gap-3 mb-2" },

                React.createElement("button", {

                  onClick: function () { setStemLabTool(null); },

                  className: "text-2xl hover:scale-110 transition-transform", 'aria-label': 'Back to tools'

                }, "\u2B05"),

                React.createElement("div", null,

                  React.createElement("h2", { className: "text-lg font-extrabold text-white" }, "\uD83D\uDC2D Behavior Shaping Lab"),

                  React.createElement("p", { className: "text-xs text-indigo-300" }, "Level " + blLevel + ": " + currentLevel.title + " \u2014 " + currentLevel.concept)

                )

              ),

              // Level select

              React.createElement("div", { className: "flex gap-2 flex-wrap mb-3" },

                LEVELS.map(function (lvl) {

                  var unlocked = lvl.id === 1 || blCompletedLevels.indexOf(lvl.id - 1) >= 0 || lvl.id === 6;

                  var isCurrent = lvl.id === blLevel;

                  var isComplete = blCompletedLevels.indexOf(lvl.id) >= 0;

                  return React.createElement("button", { "aria-label": "Select level " + lvl.id + ": " + lvl.title,

                    key: lvl.id,

                    disabled: !unlocked,

                    onClick: function () {

                      upd('blLevel', lvl.id);

                      upd('blPhase', 'intro');

                      upd('blLevelScore', 0);

                      upd('blTick', 0);

                      upd('blHistory', []);

                      upd('blCumRecord', []);

                      upd('blAbcLog', []);

                      upd('blWeights', Object.assign({}, defaultWeights));

                      upd('blExtinctionPhase', false);

                      upd('blScheduleCount', 0);

                      upd('blLightColor', 'green');

                    },

                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +

                      (isCurrent ? 'bg-amber-700 text-white shadow-lg shadow-amber-500/30' :

                        isComplete ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' :

                          unlocked ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' :

                            'bg-slate-800 text-slate-200 cursor-not-allowed')

                  }, (isComplete ? '\u2705 ' : '') + lvl.id + '. ' + lvl.title);

                })

              ),

              // Intro card

              React.createElement("div", { className: "bg-gradient-to-br from-amber-900/40 to-orange-900/30 border border-amber-500/30 rounded-2xl p-6 space-y-3" },

                React.createElement("h3", { className: "text-base font-extrabold text-amber-300" }, "\uD83C\uDFAF " + currentLevel.concept),

                React.createElement("p", { className: "text-sm text-slate-100 leading-relaxed" }, currentLevel.intro),

                React.createElement("div", { className: "bg-slate-800/60 rounded-xl p-3 border border-slate-600/40" },

                  React.createElement("p", { className: "text-xs text-amber-200 font-bold mb-1" }, "\uD83D\uDCD6 Key Term:"),

                  React.createElement("p", { className: "text-xs text-slate-100 italic" }, currentLevel.termDef)

                ),

                currentLevel.goal > 0 && React.createElement("p", { className: "text-xs text-amber-400 font-bold" },

                  "\uD83C\uDFAF Goal: " + (blLevel === 3 ? "Reinforce 5 lever presses, then stop and observe!" : "Get " + currentLevel.goal + " " + (currentLevel.target || 'target') + " responses!"))

              ),

              // Start button

              React.createElement("button", { "aria-label": "Start Experiment",

                onClick: function () {

                  upd('blPhase', 'running');

                  upd('blTick', 0);

                  upd('blHistory', []);

                  upd('blCumRecord', []);

                  upd('blAbcLog', []);

                  upd('blLevelScore', 0);

                  upd('blWeights', Object.assign({}, defaultWeights));

                  upd('blFoodVisible', false);

                  upd('blMouseX', 200);

                  upd('blMouseY', 180);

                  upd('blExtinctionPhase', false);

                  upd('blScheduleCount', 0);

                  upd('blLightColor', 'green');

                  // Reset classical conditioning state (Level 9)

                  upd('blCcPhase', 'baseline');

                  upd('blAssocStrength', 0);

                  upd('blPairCount', 0);

                  upd('blBellRinging', false);

                  upd('blSalivating', false);

                  upd('blCcExtTrials', 0);

                  upd('blBellTime', 0);

                },

                className: "w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-base shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600 transition-all hover:scale-[1.02]"

              }, "\uD83D\uDE80 Start Experiment")

            );

          }



          // ── Pulsing helper: is the current action the target? ──

          var isTargetActive = blPhase === 'running' && blLastAction === (blLevel === 6 ? blSandboxTarget : (currentLevel.target || 'pressLever'));

          var pulseStyle = isTargetActive ? { animation: 'bl-pulse 1s ease-in-out infinite', boxShadow: '0 0 18px rgba(245,158,11,0.55)' } : {};



          // ── FR counter for Level 4 ──

          var frRatio = 3;

          var frCurrent = blLevel === 4 ? (blScheduleCount % frRatio) : 0;



          // ── Glass style shorthand ──

          var glass = { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' };



          // Running Phase & Complete Phase

          return React.createElement("div", { className: "p-4 space-y-3", role: "main", "aria-label": "Behavior Lab Simulation", style: { maxWidth: 720, margin: '0 auto' } },

            // Skip navigation
            React.createElement("a", { href: "#behaviorlab-sim", className: "sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg" }, "Skip to simulation"),
            React.createElement("h2", { id: "behaviorlab-sim", className: "sr-only" }, "Behavior Lab — Level " + blLevel + " Simulation"),

            // ── Inject keyframe animation for pulse ──

            React.createElement("style", null,

              '@keyframes bl-pulse{0%,100%{box-shadow:0 0 6px rgba(245,158,11,0.3)}50%{box-shadow:0 0 22px rgba(245,158,11,0.7)}}' +

              '@keyframes bl-progress-glow{0%,100%{opacity:0.7}50%{opacity:1}}'

            ),



            // ── Header row ──

            React.createElement("div", {

              className: "flex items-center gap-3 flex-wrap",

              style: Object.assign({ background: 'rgba(30,27,46,0.7)', borderRadius: 16, padding: '10px 14px', border: '1px solid rgba(99,102,241,0.2)' }, glass)

            },

              React.createElement("button", {

                onClick: function () { upd('blPhase', 'intro'); },

                className: "text-xl hover:scale-110 transition-transform", 'aria-label': 'Back to level select'

              }, "\u2B05"),

              React.createElement("div", { className: "flex-1 min-w-0" },

                React.createElement("h2", { className: "text-sm font-extrabold text-white truncate" }, "Level " + blLevel + ": " + currentLevel.title),

                React.createElement("p", { className: "text-xs text-amber-300" }, currentLevel.concept)

              ),

              // ── Speed segmented control ──

              React.createElement("div", { className: "flex rounded-lg overflow-hidden border border-slate-600/50", style: { fontSize: 11 } },

                [1, 2, 3].map(function (sp) {

                  return React.createElement("button", { "aria-label": "Set speed to " + (sp === 1 ? 'Slow' : sp === 2 ? 'Medium' : 'Fast'),

                    key: sp,

                    onClick: function () { upd('blSpeed', sp); },

                    className: "px-2.5 py-1 font-bold transition-all " +

                      (blSpeed === sp ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700')

                  }, sp + '\u00D7');

                })

              ),

              // ── Sound toggle ──

              React.createElement("button", {

                onClick: function () { upd('blSoundOn', !blSoundOn); },

                className: "px-2 py-1 rounded-lg text-sm transition-all " +

                  (blSoundOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'),

                'aria-label': blSoundOn ? 'Mute' : 'Unmute', title: blSoundOn ? 'Sound On' : 'Sound Off'

              }, blSoundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07'),

              // ── Pause button ──

              React.createElement("button", { "aria-label": blPaused ? "Resume simulation" : "Pause simulation",

                onClick: function () { upd('blPaused', !blPaused); if (announceToSR) announceToSR(blPaused ? 'Simulation resumed' : 'Simulation paused'); },

                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (blPaused ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-100 hover:bg-slate-600')

              }, blPaused ? '\u25B6 Resume' : '\u23F8 Pause')

            ),



            // ── Level progress bar ──

            currentLevel.goal > 0 && React.createElement("div", { className: "relative", role: "progressbar", "aria-valuenow": blLevelScore, "aria-valuemin": 0, "aria-valuemax": currentLevel.goal, "aria-label": "Level progress: " + blLevelScore + " of " + currentLevel.goal, style: { height: 10, borderRadius: 6, overflow: 'hidden', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.15)' } },

              React.createElement("div", {

                style: {

                  width: Math.min(100, Math.round((blLevelScore / currentLevel.goal) * 100)) + '%',

                  height: '100%', borderRadius: 6,

                  background: 'linear-gradient(90deg, ' + lvlAccent + ', #fbbf24)',

                  transition: 'width 0.5s ease',

                  animation: 'bl-progress-glow 2s ease-in-out infinite'

                }

              }),

              React.createElement("span", {

                style: { position: 'absolute', right: 6, top: -1, fontSize: 8, fontWeight: 700, color: '#e2e8f0', lineHeight: '12px' }

              }, blLevelScore + '/' + currentLevel.goal)

            ),



            // ── Contextual hint banner ──

            blHint && React.createElement("div", {
              role: "status", "aria-live": "polite",
              style: Object.assign({ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, padding: '10px 14px' }, glass)

            },

              React.createElement("p", { className: "text-sm font-semibold", style: { margin: 0, color: '#c7d2fe', lineHeight: 1.5 } }, blHint)

            ),



            // ── Completion results card ──

            blPhase === 'complete' && React.createElement("div", {

              style: Object.assign({ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(20,184,166,0.15))', border: '1px solid rgba(52,211,153,0.35)', borderRadius: 18, padding: '20px 22px' }, glass)

            },

              // Star rating (efficiency-based)

              (function () {

                var efficiency = blTick > 0 ? blReinforcements / blTick : 0;

                var stars = efficiency > 0.6 ? 3 : efficiency > 0.3 ? 2 : 1;

                return React.createElement("p", { className: "text-2xl text-center mb-1", style: { letterSpacing: 4, textShadow: '0 0 12px rgba(251,191,36,0.5)' } },

                  '⭐'.repeat(stars) + '☆'.repeat(3 - stars)

                );

              })(),

              React.createElement("p", { className: "text-lg font-extrabold text-emerald-300 text-center mb-3" }, "\uD83C\uDF89 Level " + blLevel + " Complete!"),

              React.createElement("p", { className: "text-sm text-emerald-200 text-center mb-4" }, "You demonstrated " + currentLevel.concept + "!"),

              // Results grid

              React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },

                React.createElement("div", { className: "bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/40" },

                  React.createElement("p", { className: "text-lg font-extrabold text-amber-400" }, '' + blReinforcements),

                  React.createElement("p", { className: "text-[11px] text-slate-200" }, "Reinforcements")

                ),

                React.createElement("div", { className: "bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/40" },

                  React.createElement("p", { className: "text-lg font-extrabold text-indigo-400" }, '' + blTick),

                  React.createElement("p", { className: "text-[11px] text-slate-200" }, "Ticks to Complete")

                ),

                React.createElement("div", { className: "bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/40" },

                  React.createElement("p", { className: "text-lg font-extrabold text-emerald-400" },

                    blTick > 0 ? (blLevelScore / blTick * 60).toFixed(1) : '0.0'),

                  React.createElement("p", { className: "text-[11px] text-slate-200" }, "Resp Rate / min")

                ),

                blLatencies.length > 0 && React.createElement("div", { className: "bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/40" },

                  React.createElement("p", { className: "text-lg font-extrabold text-purple-400" },

                    (blLatencies.reduce(function (a, b) { return a + b; }, 0) / blLatencies.length).toFixed(1)),

                  React.createElement("p", { className: "text-[11px] text-slate-200" }, "Avg Latency (ticks)")

                )

              ),

              // Vocab list

              React.createElement("div", { className: "bg-slate-900/40 rounded-xl p-3 border border-slate-700/30 mb-3" },

                React.createElement("p", { className: "text-xs font-bold text-amber-300 mb-1" }, "\uD83D\uDCD6 Key Vocabulary:"),

                React.createElement("ul", { className: "space-y-0.5" },

                  (currentLevel.vocab || []).map(function (v, vi) {

                    return React.createElement("li", { key: vi, className: "text-xs text-slate-100" }, '\u2022 ' + v);

                  })

                )

              ),

              // ── Knowledge Quiz ──

              QUIZ_BANK[blLevel] && React.createElement("div", { className: "bg-gradient-to-br from-indigo-900/40 to-purple-900/30 rounded-xl p-4 border border-indigo-500/30" },

                React.createElement("p", { className: "text-xs font-bold text-indigo-300 mb-2" }, "🧠 Knowledge Check"),

                React.createElement("p", { className: "text-sm text-slate-200 font-semibold mb-3" }, QUIZ_BANK[blLevel].q),

                React.createElement("div", { className: "space-y-1.5" },

                  QUIZ_BANK[blLevel].opts.map(function (opt, oi) {

                    var isSelected = blQuizSelected === oi;

                    var isCorrect = oi === QUIZ_BANK[blLevel].correct;

                    var showResult = blQuizAnswered;

                    var btnClass = 'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all border ';

                    if (showResult && isCorrect) btnClass += 'bg-emerald-600/40 text-emerald-200 border-emerald-500/50';

                    else if (showResult && isSelected && !isCorrect) btnClass += 'bg-red-600/40 text-red-200 border-red-500/50';

                    else if (isSelected) btnClass += 'bg-indigo-600/40 text-indigo-200 border-indigo-400/50';

                    else btnClass += 'bg-slate-800/60 text-slate-100 border-slate-600/30 hover:bg-slate-700/60';

                    return React.createElement("button", { "aria-label": "Quiz answer: " + opt,

                      key: oi,

                      disabled: blQuizAnswered,

                      onClick: function () {

                        upd('blQuizSelected', oi);

                        upd('blQuizAnswered', true);

                        var correct = oi === QUIZ_BANK[blLevel].correct;

                        upd('blQuizCorrect', correct);

                        if (correct) {

                          if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 5, 'Quiz correct: Level ' + blLevel);

                          if (addToast) addToast('✅ Correct! +5 XP bonus!', 'success');

                        } else {

                          if (addToast) addToast('❌ Not quite — read the explanation below.', 'error');

                        }

                      },

                      className: btnClass

                    }, String.fromCharCode(65 + oi) + '. ' + opt + (showResult && isCorrect ? ' \u2714 Correct' : '') + (showResult && isSelected && !isCorrect ? ' \u2718 Incorrect' : ''));

                  })

                ),

                blQuizAnswered && React.createElement("div", {

                  className: "mt-3 p-3 rounded-lg text-xs " + (blQuizCorrect ? 'bg-emerald-900/30 text-emerald-200 border border-emerald-700/30' : 'bg-red-900/30 text-red-200 border border-red-700/30')

                },

                  React.createElement("p", { className: "font-bold mb-1" }, blQuizCorrect ? '✅ Correct!' : '❌ Incorrect'),

                  React.createElement("p", null, QUIZ_BANK[blLevel].explain)

                )

              ),

              // Fun fact

              React.createElement("div", { className: "bg-slate-900/40 rounded-xl p-3 border border-indigo-700/30" },

                React.createElement("p", { className: "text-xs text-indigo-200 italic" }, currentLevel.funFact)

              ),

              // Next level button

              React.createElement("button", { "aria-label": "Next Level",

                onClick: function () {

                  var nextLevel = Math.min(blLevel + 1, LEVELS.length);

                  upd('blLevel', nextLevel);

                  upd('blPhase', 'intro');

                  upd('blLevelScore', 0);

                  upd('blTick', 0);

                  upd('blHistory', []);

                  upd('blCumRecord', []);

                  upd('blAbcLog', []);

                  upd('blWeights', Object.assign({}, defaultWeights));

                  upd('blExtinctionPhase', false);

                  // Reset quiz state for next level

                  upd('blQuizAnswered', false);

                  upd('blQuizCorrect', false);

                  upd('blQuizSelected', -1);

                  // Reset chain state

                  upd('blChainStep', 0);

                  upd('blChainHistory', []);

                  // Reset latency

                  upd('blLatencies', []);

                  upd('blLastTargetTick', 0);

                },

                className: "w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600 transition-all hover:scale-[1.02]"

              }, "\u27A1\uFE0F Next Level")

            ),



            // ── Chamber Canvas ──

            React.createElement("div", {

              style: Object.assign({ borderRadius: 18, overflow: 'hidden', border: '2px solid rgba(99,102,241,0.25)', boxShadow: '0 8px 32px rgba(99,102,241,0.12)' }, glass)

            },

              React.createElement("canvas", {

                id: "bl-chamber-canvas",
                role: "img",
                'aria-label': 'Behavior lab chamber showing a mouse. Current action: ' + (d.blAction || 'exploring') + '. Tick: ' + (d.blTick || 0),

                style: { width: '100%', height: 280, display: 'block', cursor: 'crosshair' }

              })

            ),

            // ── Proximity heat meter (Levels 1, 2, 6) ──
            (blLevel === 1 || blLevel === 2 || blLevel === 6) && React.createElement("div", {
              style: { position: 'relative', height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(99,102,241,0.15)', margin: '4px 0' }
            },
              React.createElement("div", {
                style: {
                  width: Math.max(5, Math.round((1 - Math.min(Math.sqrt(Math.pow((blMouseX || 200) - 350, 2) + Math.pow((blMouseY || 180) - 225, 2)) / 300, 1)) * 100)) + '%',
                  height: '100%', borderRadius: 6,
                  background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)',
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 8px rgba(34,197,94,0.3)'
                }
              }),
              React.createElement("span", {
                style: { position: 'absolute', right: 8, top: -1, fontSize: 9, color: '#94a3b8', lineHeight: '12px' }
              }, '\uD83D\uDC2D \u2192 Lever proximity')
            ),

            // ── Behavior frequency heatmap strip ──

            blRecentActions.length > 0 && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(71,85,105,0.25)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-1.5 uppercase tracking-wider" }, "\uD83D\uDD25 Recent Behaviors"),

              React.createElement("div", { className: "flex gap-1 items-center flex-wrap" },

                blRecentActions.map(function (act, ai) {
                  var isLast = ai === blRecentActions.length - 1;
                  return React.createElement("div", {

                    key: ai,

                    title: ACTION_LABELS[act] || act,
                    'aria-label': (ACTION_LABELS[act] || act) + (act === (currentLevel.target || 'pressLever') ? ' (target behavior)' : ''),

                    style: {

                      width: isLast ? 'auto' : 14, height: isLast ? 'auto' : 14, borderRadius: isLast ? '8px' : '50%',
                      padding: isLast ? '2px 8px' : 0,
                      display: isLast ? 'flex' : 'block', alignItems: 'center', gap: '3px',
                      fontSize: isLast ? '10px' : 0, fontWeight: 700, color: '#fff',

                      backgroundColor: ACTION_COLORS[act] || '#475569',

                      opacity: 0.5 + (ai / blRecentActions.length) * 0.5,

                      transition: 'all 0.3s ease',

                      cursor: 'pointer',

                      border: act === (currentLevel.target || 'pressLever') ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)'

                    }

                  }, isLast ? (ACTION_LABELS[act] || act) : null);

                })

              )

            ),



            // ── Controls row ──

            React.createElement("div", { className: "flex gap-2 flex-wrap items-center" },

              // Deliver Food button (pulsing when target active)

              // Level 8: disable manual food (DRO is automatic)

              // Level 9: disable manual food (CC uses bell/food pairing)

              blLevel === 8 ? React.createElement("div", {

                className: "flex-1 py-2.5 rounded-xl text-center text-cyan-300 font-bold text-xs",

                style: { background: 'rgba(8,145,178,0.2)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 12 }

              }, "\u23F1 Automatic (DRO) \u2014 food delivered when timer completes") :

              blLevel === 9 ? React.createElement("div", {

                className: "flex-1 py-2.5 rounded-xl text-center text-rose-300 font-bold text-xs",

                style: { background: 'rgba(225,29,72,0.15)', border: '1px solid rgba(225,29,72,0.3)', borderRadius: 12 }

              }, "\uD83D\uDD14 Use the Classical Conditioning panel below") :

                React.createElement("button", { "aria-label": "Reinforce action",

                  onClick: function () {

                    if (blLevel === 3 && blExtinctionPhase) {

                      if (addToast) addToast('\u26A0\uFE0F Extinction phase: do NOT reinforce!', 'warning');

                      return;

                    }

                    reinforceAction();

                  },

                  disabled: !blLastAction || blPhase !== 'running',

                  className: "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all " +

                    (blLastAction && blPhase === 'running'

                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md hover:from-amber-600 hover:to-yellow-600 hover:scale-[1.02]"

                      : "bg-slate-700 text-slate-200 cursor-not-allowed"),

                  style: pulseStyle

                }, "\uD83C\uDF55 Deliver Food" + (blLevel === 4 ? '  (' + frCurrent + '/' + frRatio + ')' : '') + '  [Space]'),

              // Level 3: extinction trigger

              blLevel === 3 && !blExtinctionPhase && blLevelScore >= 5 && React.createElement("button", { "aria-label": "Start Extinction",

                onClick: function () {

                  upd('blExtinctionPhase', true);

                  upd('blExtinctionStart', blTick);

                  if (addToast) addToast('\uD83D\uDEAB Extinction phase started! Do NOT deliver food.', 'info');

                },

                className: "flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-md"

              }, "\uD83D\uDEAB Start Extinction"),

              blLevel === 3 && blExtinctionPhase && React.createElement("div", {

                className: "flex-1 py-2.5 rounded-xl text-center text-red-300 font-bold text-xs",

                style: { background: 'rgba(127,29,29,0.35)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12 }

              }, "\u23F3 Extinction in progress... watch the burst!"),

              // Level 6: sandbox target selector

              blLevel === 6 && React.createElement("select", {

                value: blSandboxTarget,

                onChange: function (e) { upd('blSandboxTarget', e.target.value); },

                'aria-label': 'Target behavior selector',

                className: "px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-indigo-300 border border-indigo-500/30 cursor-pointer",

                style: Object.assign({}, glass)

              },

                Object.keys(ACTION_LABELS).map(function (ak) {

                  return React.createElement("option", { key: ak, value: ak }, ACTION_LABELS[ak]);

                })

              )

            ),



            // ── Level 7: Chain Progress Tracker ──

            blLevel === 7 && blPhase === 'running' && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(139,92,246,0.3)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-purple-300 font-bold mb-2 uppercase tracking-wider" }, "\uD83D\uDD17 Chain Progress"),

              React.createElement("div", { className: "flex items-center justify-center gap-2" },

                CHAIN_SEQ.map(function (step, si) {

                  var isDone = si < blChainStep;

                  var isCurrent = si === blChainStep;

                  var stepLabel = step === 'sniff' ? '👃 Sniff' : step === 'rearUp' ? '🐭 Rear Up' : '⚡ Press Lever';

                  return React.createElement(React.Fragment, { key: si },

                    si > 0 && React.createElement("span", {

                      className: "text-sm font-bold " + (isDone ? 'text-emerald-400' : 'text-slate-200')

                    }, "➜"),

                    React.createElement("div", {

                      className: "px-3 py-2 rounded-xl text-xs font-bold text-center transition-all " +

                        (isDone ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 shadow-md shadow-emerald-500/10' :

                          isCurrent ? 'bg-amber-600/40 text-amber-200 border border-amber-500/40 ring-2 ring-amber-400/50 animate-pulse' :

                            'bg-slate-800/60 text-slate-200 border border-slate-700/40')

                    }, (isDone ? '✅ ' : isCurrent ? '⏳ ' : '') + stepLabel)

                  );

                }),

                blChainStep >= CHAIN_SEQ.length && React.createElement("span", {

                  className: "ml-2 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-white animate-pulse shadow-lg shadow-amber-500/30"

                }, "🍕 REINFORCE NOW!")

              ),

              React.createElement("p", { className: "text-[11px] text-slate-200 text-center mt-2" },

                "Completed chains: " + blChainHistory.length + (currentLevel.goal > 0 ? '/' + currentLevel.goal : ''))

            ),



            // ── Level 8: DRO Timer Panel ──

            blLevel === 8 && blPhase === 'running' && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(6,182,212,0.3)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-cyan-300 font-bold mb-2 uppercase tracking-wider" }, "\u23F1 DRO Timer"),

              // Timer bar

              React.createElement("div", {

                className: "relative mb-2",

                style: { height: 16, borderRadius: 8, overflow: 'hidden', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(6,182,212,0.2)' }

              },

                React.createElement("div", {

                  style: {

                    width: Math.round((blDroTimer / blDroInterval) * 100) + '%',

                    height: '100%', borderRadius: 8,

                    background: 'linear-gradient(90deg, #06b6d4, #22d3ee)',

                    transition: 'width 0.4s ease'

                  }

                }),

                React.createElement("span", {

                  style: { position: 'absolute', left: '50%', top: 1, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, color: '#e2e8f0' }

                }, blDroTimer + ' / ' + blDroInterval + ' ticks')

              ),

              React.createElement("div", { className: "flex items-center justify-between" },

                React.createElement("p", { className: "text-xs text-slate-200" },

                  '\u2705 DRO Successes: ' + blDroSuccesses + (currentLevel.goal > 0 ? '/' + currentLevel.goal : '')),

                React.createElement("p", { className: "text-[11px] text-cyan-300/60 italic" },

                  blDroTimer === 0 ? 'Timer started — no lever presses needed!' : 'Keep waiting...')

              )

            ),



            // ── Level 9: Classical Conditioning Panel ──

            blLevel === 9 && blPhase === 'running' && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px 14px', border: '1px solid rgba(225,29,72,0.35)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-rose-300 font-bold mb-2 uppercase tracking-wider" }, "\uD83D\uDD14 Classical Conditioning"),

              // Phase indicator

              React.createElement("div", { className: "flex items-center gap-1.5 mb-3 flex-wrap" },

                ['baseline', 'pairing', 'test', 'extinction'].map(function (ph) {

                  var isActive = blCcPhase === ph;

                  var phLabels = { baseline: '1\uFE0F\u20E3 Baseline', pairing: '2\uFE0F\u20E3 Pairing', test: '3\uFE0F\u20E3 Test', extinction: '4\uFE0F\u20E3 Extinction' };

                  return React.createElement("span", {

                    key: ph,

                    style: {

                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,

                      background: isActive ? 'rgba(225,29,72,0.35)' : 'rgba(30,41,59,0.5)',

                      color: isActive ? '#fda4af' : '#64748b',

                      border: '1px solid ' + (isActive ? 'rgba(225,29,72,0.5)' : 'rgba(71,85,105,0.3)')

                    }

                  }, phLabels[ph] || ph);

                })

              ),

              // Association strength meter

              React.createElement("div", { className: "mb-3" },

                React.createElement("div", { className: "flex justify-between mb-1" },

                  React.createElement("span", { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600 } }, 'Association Strength'),

                  React.createElement("span", { style: { fontSize: 11, color: blAssocStrength > 60 ? '#fda4af' : '#94a3b8', fontWeight: 700 } }, blAssocStrength + '%')

                ),

                React.createElement("div", {

                  style: { height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(225,29,72,0.2)' }

                },

                  React.createElement("div", {

                    style: {

                      width: blAssocStrength + '%', height: '100%', borderRadius: 6,

                      background: blAssocStrength > 60 ? 'linear-gradient(90deg, #e11d48, #fb7185)' : 'linear-gradient(90deg, #475569, #94a3b8)',

                      transition: 'width 0.5s ease, background 0.5s ease'

                    }

                  })

                )

              ),

              // Visual feedback row: bell + salivation

              React.createElement("div", { className: "flex items-center justify-center gap-4 mb-3" },

                React.createElement("span", {

                  style: {

                    fontSize: 28, transition: 'transform 0.3s ease',

                    transform: blBellRinging ? 'rotate(-15deg) scale(1.3)' : 'rotate(0) scale(1)',

                    filter: blBellRinging ? 'drop-shadow(0 0 8px rgba(225,29,72,0.6))' : 'none'

                  }

                }, "\uD83D\uDD14"),

                blBellRinging && React.createElement("span", {

                  style: { fontSize: 11, color: '#fda4af', fontWeight: 700, letterSpacing: 2 }

                }, "RING!"),

                React.createElement("span", {

                  style: {

                    fontSize: 28, transition: 'transform 0.3s ease, opacity 0.3s ease',

                    transform: blSalivating ? 'scale(1.3)' : 'scale(1)',

                    opacity: blSalivating ? 1 : 0.3

                  }

                }, "\uD83E\uDD24"),

                blSalivating && React.createElement("span", {

                  style: { fontSize: 11, color: '#86efac', fontWeight: 700 }

                }, "CR!")

              ),

              // Action buttons

              React.createElement("div", { className: "flex gap-2" },

                // Ring Bell button

                React.createElement("button", { "aria-label": "Ring Bell",

                  onClick: function () {

                    upd('blBellRinging', true);

                    upd('blBellTime', Date.now());

                    blBeep(1200, 0.3, 0.25); // bell sound

                    var bellLog = blAbcLog.slice();

                    if (blCcPhase === 'baseline') {

                      bellLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell (neutral)', b: 'Dog hears bell', c: 'No salivation (no association yet)', t: Date.now() });

                      upd('blAbcLog', bellLog.slice(0, 50));

                      if (addToast) addToast('\uD83D\uDD14 Bell rings... no response! (neutral stimulus)', 'info');

                      // After 2 baseline trials, auto-advance to pairing

                      if (blPairCount >= 1) {

                        upd('blCcPhase', 'pairing');

                        upd('blPairCount', 0);

                        if (addToast) addToast('\u27A1\uFE0F Moving to Pairing Phase! Now pair the bell WITH food.', 'info');

                      } else {

                        upd('blPairCount', blPairCount + 1);

                      }

                    } else if (blCcPhase === 'test') {

                      // Test phase: bell alone — if association > 30, CR occurs

                      if (blAssocStrength > 30) {

                        upd('blSalivating', true);

                        upd('blSalivateTime', Date.now());

                        bellLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell (CS)', b: 'Dog hears bell alone', c: '\uD83E\uDD24 Salivation! (CR — conditioned response!)', t: Date.now() });

                        upd('blAbcLog', bellLog.slice(0, 50));

                        upd('blLevelScore', blLevelScore + 1);

                        blBeep(880, 0.15, 0.2);

                        if (addToast) addToast('\uD83E\uDD24 The dog salivates to the bell alone! Classical conditioning!', 'success');

                        if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 3, 'Classical conditioning CR observed');

                        // After observing 2 CRs, offer extinction

                        if (blLevelScore >= 2) {

                          upd('blCcPhase', 'extinction');

                          upd('blCcExtTrials', 0);

                          if (addToast) addToast('\u27A1\uFE0F Moving to Extinction Phase! Ring bell without food to weaken the association.', 'info');

                        }

                      } else {

                        bellLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell (CS)', b: 'Dog hears bell alone', c: 'Weak/no salivation (association too low)', t: Date.now() });

                        upd('blAbcLog', bellLog.slice(0, 50));

                        if (addToast) addToast('\uD83D\uDD14 Weak response... association not strong enough. Go back and pair more!', 'warning');

                        upd('blCcPhase', 'pairing');

                      }

                    } else if (blCcPhase === 'extinction') {

                      // Extinction: bell alone weakens association

                      var newAssoc = Math.max(0, blAssocStrength - 20);

                      upd('blAssocStrength', newAssoc);

                      upd('blCcExtTrials', blCcExtTrials + 1);

                      if (newAssoc > 30) {

                        upd('blSalivating', true);

                        upd('blSalivateTime', Date.now());

                      }

                      bellLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell alone (extinction)', b: 'No food follows', c: 'Association weakening (' + newAssoc + '%)', t: Date.now() });

                      upd('blAbcLog', bellLog.slice(0, 50));

                      if (newAssoc <= 10) {

                        if (addToast) addToast('\u2705 Association extinguished! The bell no longer causes salivation.', 'success');

                        // Complete the level

                        upd('blPhase', 'complete');

                        if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 15, 'Completed Level 9: Classical Conditioning');

                        if (addToast) addToast('\uD83C\uDF89 Level 9 Complete! Classical Conditioning mastered!', 'success');

                        var newCompleted9 = blCompletedLevels.indexOf(9) < 0 ? blCompletedLevels.concat([9]) : blCompletedLevels;

                        upd('blCompletedLevels', newCompleted9);

                      } else {

                        if (addToast) addToast('\uD83D\uDD14 Bell without food... association weakening (' + newAssoc + '%)', 'info');

                      }

                    }

                  },

                  disabled: blCcPhase === 'pairing',

                  className: "flex-1 py-2 rounded-xl font-bold text-xs transition-all " +

                    (blCcPhase !== 'pairing' ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md hover:from-rose-700 hover:to-pink-700 hover:scale-[1.02]" : "bg-slate-700 text-slate-200 cursor-not-allowed")

                }, "\uD83D\uDD14 Ring Bell" + (blCcPhase === 'baseline' ? ' (Baseline)' : blCcPhase === 'test' ? ' (Test CR)' : blCcPhase === 'extinction' ? ' (Extinction)' : '')),

                // Pair Bell + Food button (only in pairing phase)

                React.createElement("button", { "aria-label": "Pair Bell with Food",

                  onClick: function () {

                    if (blCcPhase !== 'pairing') {

                      if (addToast) addToast('\u26A0\uFE0F Pairing is only available in the Pairing phase!', 'warning');

                      return;

                    }

                    upd('blBellRinging', true);

                    upd('blBellTime', Date.now());

                    upd('blFoodVisible', true);

                    upd('blFoodTime', Date.now());

                    upd('blSalivating', true);

                    upd('blSalivateTime', Date.now());

                    var newPairCount = blPairCount + 1;

                    var newAssocP = Math.min(100, blAssocStrength + 18);

                    upd('blPairCount', newPairCount);

                    upd('blAssocStrength', newAssocP);

                    blBeep(1200, 0.3, 0.25); // bell

                    setTimeout(function () { blBeep(500, 0.2, 0.15); }, 300); // food

                    setTimeout(function () { upd('blFoodVisible', false); }, 1500);

                    var pairLog = blAbcLog.slice();

                    pairLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell + \uD83C\uDF55 Food (US)', b: 'Dog eats food', c: '\uD83E\uDD24 Salivation (UR) — Pair ' + newPairCount + '/5', t: Date.now() });

                    upd('blAbcLog', pairLog.slice(0, 50));

                    if (addToast) addToast('\uD83D\uDD14 + \uD83C\uDF55 Pair ' + newPairCount + '/5 — association building (' + newAssocP + '%)', 'success');

                    if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 1, 'CS-US pairing trial');

                    // After 5 pairings, advance to test phase

                    if (newPairCount >= 5) {

                      upd('blCcPhase', 'test');

                      upd('blLevelScore', 0);

                      if (addToast) addToast('\u27A1\uFE0F Moving to Test Phase! Ring the bell ALONE to test for the conditioned response.', 'info');

                    }

                  },

                  disabled: blCcPhase !== 'pairing',

                  className: "flex-1 py-2 rounded-xl font-bold text-xs transition-all " +

                    (blCcPhase === 'pairing' ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md hover:from-amber-600 hover:to-yellow-600 hover:scale-[1.02]" : "bg-slate-700 text-slate-200 cursor-not-allowed")

                }, "\uD83D\uDD14+\uD83C\uDF55 Pair (" + blPairCount + "/5)")

              ),

              // Phase instructions

              React.createElement("p", { className: "text-[11px] text-slate-200 text-center mt-2 italic" },

                blCcPhase === 'baseline' ? 'Ring the bell to observe: no response yet (neutral stimulus)' :

                blCcPhase === 'pairing' ? 'Pair the bell with food 5 times to build the association!' :

                blCcPhase === 'test' ? 'Ring the bell ALONE — does the dog salivate? (Conditioned Response)' :

                blCcPhase === 'extinction' ? 'Ring the bell WITHOUT food to weaken the association' : '')

            ),



            // ── Current action + stats ──

            React.createElement("div", { className: "grid grid-cols-2 gap-3" },

              // Last action

              React.createElement("div", {

                style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(71,85,105,0.3)' }, glass)

              },

                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-0.5 uppercase tracking-wider" }, "Last Behavior"),

                React.createElement("p", { className: "text-sm font-extrabold", style: { color: ACTION_COLORS[blMouseAction] || '#94a3b8' } },

                  ACTION_LABELS[blMouseAction] || 'Waiting...')

              ),

              // Stats

              React.createElement("div", {

                style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(71,85,105,0.3)' }, glass)

              },

                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-0.5 uppercase tracking-wider" }, "Session Stats"),

                React.createElement("p", { className: "text-xs text-amber-300" }, "\uD83C\uDF55 Reinforcements: " + blReinforcements),

                React.createElement("p", { className: "text-xs text-emerald-300" }, "\uD83C\uDFAF Target hits: " + blLevelScore + (currentLevel.goal > 0 ? '/' + currentLevel.goal : '')),

                blLatencies.length > 0 && React.createElement("p", { className: "text-xs text-purple-300" }, "\u23F1 Avg Latency: " + (blLatencies.reduce(function (a, b) { return a + b; }, 0) / blLatencies.length).toFixed(1) + " ticks"),

                blLevel === 4 && React.createElement("p", { className: "text-xs text-blue-300 mt-0.5" }, "\uD83D\uDD22 FR-3 count: " + frCurrent + " / " + frRatio)

              )

            ),



            // ── Probability Weights bar chart ──

            React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(71,85,105,0.3)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, "\uD83D\uDCCA Behavior Probability Weights"),

              React.createElement("div", { className: "space-y-1" },

                sortedWeights.map(function (w) {

                  var pct = maxWeight > 0 ? Math.round((w.weight / maxWeight) * 100) : 0;

                  var isSandboxTarget = blLevel === 6 && w.action === blSandboxTarget;

                  var highlight = w.isTarget || isSandboxTarget;

                  return React.createElement("div", { key: w.action, className: "flex items-center gap-2" },

                    React.createElement("span", { className: "text-[11px] w-20 truncate " + (highlight ? 'text-amber-300 font-bold' : 'text-slate-200') },

                      (highlight ? '\uD83C\uDFAF ' : '') + w.action),

                    React.createElement("div", { className: "flex-1 h-3.5 rounded-full overflow-hidden", style: { background: 'rgba(30,41,59,0.6)' } },

                      React.createElement("div", {

                        className: "h-full rounded-full transition-all duration-500",

                        style: {

                          width: pct + '%',

                          background: highlight ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : (ACTION_COLORS[w.action] || '#475569')

                        }

                      })

                    ),

                    React.createElement("span", { className: "text-[11px] text-slate-200 w-8 text-right font-mono" }, Math.round(w.weight))

                  );

                })

              )

            ),



            // ── Cumulative Record ──

            React.createElement("div", {

              style: Object.assign({ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(245,158,11,0.2)' }, glass)

            },

              React.createElement("canvas", {

                id: "bl-cumrecord-canvas",
                role: "img",
                'aria-label': 'Cumulative response record chart. Score: ' + (d.blLevelScore || 0) + ' of ' + (currentLevel ? currentLevel.goal : 0),

                style: { width: '100%', height: 130, display: 'block' }

              })

            ),



            // ── ABC Log with CSV export ──

            blAbcLog.length > 0 && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(71,85,105,0.3)' }, glass)

            },

              React.createElement("div", { className: "flex items-center justify-between mb-2" },

                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDCCB ABC Data Log"),

                // CSV Export button

                React.createElement("button", { "aria-label": "Export ABC Data as CSV",

                  onClick: function () {

                    var csvRows = ['Tick,Antecedent,Behavior,Consequence,Timestamp'];

                    blAbcLog.forEach(function (e) {

                      csvRows.push([e.tick, '"' + (e.a || '') + '"', '"' + (e.b || '') + '"', '"' + (e.c || '') + '"', e.t || ''].join(','));

                    });

                    var blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });

                    var url = URL.createObjectURL(blob);

                    var a = document.createElement('a');

                    a.href = url; a.download = 'abc_log_level' + blLevel + '.csv';

                    document.body.appendChild(a); a.click(); document.body.removeChild(a);

                    URL.revokeObjectURL(url);

                    if (addToast) addToast('\uD83D\uDCE5 ABC log exported as CSV!', 'success');

                  },

                  className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-700 text-slate-100 hover:bg-slate-600 transition-all border border-slate-600/40"

                }, "\uD83D\uDCE5 Export CSV")

              ),

              React.createElement("div", { className: "space-y-0.5 max-h-40 overflow-y-auto" },

                blAbcLog.slice(0, 15).map(function (entry, idx) {

                  return React.createElement("div", { key: idx, className: "flex gap-2 text-xs py-1 border-b border-slate-700/30" },

                    React.createElement("span", { className: "text-slate-200 w-8 font-mono" }, '#' + entry.tick),

                    React.createElement("span", { className: "text-blue-300 w-24 truncate", title: 'Antecedent: ' + entry.a }, "A: " + entry.a),

                    React.createElement("span", { className: "text-amber-300 flex-1 truncate", title: 'Behavior: ' + entry.b }, "B: " + entry.b),

                    React.createElement("span", { className: "text-emerald-300 w-36 truncate", title: 'Consequence: ' + entry.c }, "C: " + entry.c)

                  );

                })

              )

            ),



            // === LEVEL BADGES (Progress Tracker) ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(139,92,246,0.2)' }, glass)
            },
              React.createElement("h3", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, "\uD83C\uDFC6 Progress Badges"),
              React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },
                LEVELS.filter(function(l) { return l.id <= 9; }).map(function(l) {
                  var badge = LEVEL_BADGES[l.id];
                  var earned = blCompletedLevels.indexOf(l.id) >= 0;
                  var isCurrent = blLevel === l.id;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: l.id,
                    className: "text-center cursor-pointer transition-all " + (isCurrent ? 'scale-110' : '') + (earned ? '' : ' opacity-50 grayscale'),
                    "aria-label": badge.name + ': ' + badge.desc + (earned ? ' — Earned' : ' — Locked'),
                    title: badge.name + ': ' + badge.desc + (earned ? ' (EARNED!)' : ' (locked)'),
                    onClick: function() { if (earned || isCurrent) { upd('blLevel', l.id); upd('blPhase', 'intro'); upd('blLevelScore', 0); upd('blTick', 0); } }
                  },
                    React.createElement("div", { className: "text-2xl " + (isCurrent ? 'animate-bounce' : '') }, badge.icon),
                    React.createElement("div", { className: "text-[11px] font-bold " + (earned ? 'text-amber-400' : 'text-slate-200') }, 'L' + l.id),
                    earned ? React.createElement("div", { className: "text-[11px] text-green-400" }, '\u2713 Earned') : React.createElement("div", { className: "text-[11px] text-slate-200" }, '\uD83D\uDD12')
                  );
                })
              ),
              React.createElement("div", { className: "text-center mt-2 text-[11px] text-slate-200" },
                blCompletedLevels.length + "/9 levels mastered \u2022 " + (blCompletedLevels.length >= 9 ? '\uD83C\uDF1F ABA Master!' : blCompletedLevels.length >= 5 ? '\u2B50 Behavior Analyst in Training!' : '\uD83D\uDC2D Keep experimenting!')
              )
            ),

            // === FOUR FUNCTIONS OF BEHAVIOR (FBA) ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(59,130,246,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h3", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDCA1 Four Functions of Behavior (FBA)"),
                React.createElement("button", { "aria-label": "Change bl show functions",
                  onClick: function() { upd('blShowFunctions', !d.blShowFunctions); },
                  className: "text-[11px] text-blue-400 hover:text-blue-300"
                }, d.blShowFunctions ? 'Hide' : 'Learn \u2192')
              ),
              d.blShowFunctions && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-2" }, "Every behavior serves a function. Understanding WHY a behavior occurs is the key to changing it. These are the 4 functions identified by functional behavior assessment (FBA):"),
                React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                  FOUR_FUNCTIONS.map(function(ff, ffi) {
                    var isActive = d.blFuncIdx === ffi;
                    return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: ffi,
                      onClick: function() { upd('blFuncIdx', isActive ? null : ffi); },
                      className: "cursor-pointer rounded-xl p-3 border-2 transition-all " + (isActive ? 'border-opacity-100' : 'border-opacity-30 hover:border-opacity-60'),
                      style: { borderColor: ff.color, background: isActive ? ff.color + '15' : 'rgba(30,41,59,0.4)' }
                    },
                      React.createElement("div", { className: "text-center mb-1" },
                        React.createElement("div", { className: "text-2xl" }, ff.icon),
                        React.createElement("div", { className: "text-[11px] font-black text-white" }, ff.name),
                        React.createElement("div", { className: "text-[11px] font-mono", style: { color: ff.color } }, ff.abbrev)
                      ),
                      isActive && React.createElement("div", { className: "mt-2 space-y-1.5" },
                        React.createElement("div", { className: "text-[11px] text-slate-100" }, ff.desc),
                        React.createElement("div", { className: "text-[11px] text-amber-400 font-medium" }, "\uD83D\uDCA1 Examples: " + ff.example),
                        React.createElement("div", { className: "text-[11px] text-emerald-400 font-medium" }, "\u2705 Intervention: " + ff.intervention)
                      )
                    );
                  })
                )
              )
            ),

            // === FAMOUS BEHAVIORISTS ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(245,158,11,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDCDA Famous Behaviorists"),
                React.createElement("button", { "aria-label": "Change bl show behaviorists",
                  onClick: function() { upd('blShowBehaviorists', !d.blShowBehaviorists); },
                  className: "text-[11px] text-amber-400 hover:text-amber-300"
                }, d.blShowBehaviorists ? 'Hide' : 'Explore \u2192')
              ),
              d.blShowBehaviorists && React.createElement("div", { className: "relative pl-4 border-l-2 border-amber-700 space-y-2 max-h-64 overflow-y-auto" },
                FAMOUS_BEHAVIORISTS.map(function(fb, fbi) {
                  return React.createElement("div", { key: fbi, className: "relative" },
                    React.createElement("div", { className: "absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-amber-500" }),
                    React.createElement("div", { className: "bg-slate-700/50 rounded-lg p-2 border border-slate-600" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-0.5" },
                        React.createElement("span", { className: "text-sm" }, fb.icon),
                        React.createElement("span", { className: "text-[11px] font-bold text-white" }, fb.name),
                        React.createElement("span", { className: "ml-auto text-[11px] text-amber-400 font-mono" }, fb.year)
                      ),
                      React.createElement("div", { className: "text-[11px] px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-300 inline-block mb-1" }, fb.field),
                      React.createElement("div", { className: "text-[11px] text-slate-200" }, fb.contribution)
                    )
                  );
                })
              )
            ),

            // === REAL-WORLD ABA APPLICATIONS ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(34,197,94,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83C\uDF0D ABA in the Real World"),
                React.createElement("button", { "aria-label": "Change bl show apps",
                  onClick: function() { upd('blShowApps', !d.blShowApps); },
                  className: "text-[11px] text-green-400 hover:text-green-300"
                }, d.blShowApps ? 'Hide' : 'Explore \u2192')
              ),
              d.blShowApps && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-2" }, "ABA isn't just for the lab \u2014 its principles are used everywhere you look:"),
                React.createElement("div", { className: "grid grid-cols-2 gap-1.5" },
                  ABA_APPLICATIONS.map(function(app, appi) {
                    return React.createElement("div", { key: appi, className: "bg-slate-700/50 rounded-lg p-2 border border-slate-600" },
                      React.createElement("div", { className: "text-center mb-1" },
                        React.createElement("div", { className: "text-lg" }, app.icon),
                        React.createElement("div", { className: "text-[11px] font-bold text-white" }, app.name)
                      ),
                      React.createElement("div", { className: "text-[11px] text-slate-200" }, app.desc),
                      React.createElement("div", { className: "text-[11px] text-green-400 mt-1 font-medium" }, "\uD83D\uDCCD " + app.setting)
                    );
                  })
                )
              )
            ),

            // === BEHAVIOR MEASUREMENT METHODS ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(6,182,212,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDCCA Behavior Measurement Methods"),
                React.createElement("button", { "aria-label": "Change bl show measure",
                  onClick: function() { upd('blShowMeasure', !d.blShowMeasure); },
                  className: "text-[11px] text-cyan-400 hover:text-cyan-300"
                }, d.blShowMeasure ? 'Hide' : 'Learn \u2192')
              ),
              d.blShowMeasure && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-2" }, "How do behavior analysts measure behavior objectively? The measurement method depends on what aspect of the behavior is most important:"),
                React.createElement("div", { className: "space-y-1.5" },
                  MEASUREMENT_METHODS.map(function(mm, mmi) {
                    var isActive = d.blMeasureIdx === mmi;
                    return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: mmi,
                      onClick: function() { upd('blMeasureIdx', isActive ? null : mmi); },
                      className: "cursor-pointer rounded-lg p-2 border transition-all " + (isActive ? 'bg-cyan-900/30 border-cyan-600' : 'bg-slate-700/30 border-slate-600 hover:border-slate-500')
                    },
                      React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-sm" }, mm.icon),
                        React.createElement("span", { className: "text-[11px] font-bold text-white" }, mm.name),
                        React.createElement("span", { className: "ml-auto text-[11px] text-slate-200" }, isActive ? '\u25BC' : '\u25B6')
                      ),
                      isActive && React.createElement("div", { className: "mt-1.5 space-y-1" },
                        React.createElement("div", { className: "text-[11px] text-cyan-300 font-medium" }, mm.def),
                        React.createElement("div", { className: "text-[11px] text-slate-200" }, "\uD83D\uDCDD Example: " + mm.example),
                        React.createElement("div", { className: "text-[11px] text-amber-400" }, "\u2753 When to use: " + mm.when)
                      )
                    );
                  })
                )
              )
            ),

            // === ABA ETHICS ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(168,85,247,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\u2696 Ethics in Applied Behavior Analysis"),
                React.createElement("button", { "aria-label": "Change bl show ethics",
                  onClick: function() { upd('blShowEthics', !d.blShowEthics); },
                  className: "text-[11px] text-purple-400 hover:text-purple-300"
                }, d.blShowEthics ? 'Hide' : 'View \u2192')
              ),
              d.blShowEthics && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-2" }, "With great power comes great responsibility. ABA practitioners follow strict ethical guidelines from the BACB (Behavior Analyst Certification Board):"),
                React.createElement("div", { className: "grid grid-cols-2 gap-1.5" },
                  ABA_ETHICS.map(function(eth, ethi) {
                    return React.createElement("div", { key: ethi, className: "bg-slate-700/50 rounded-lg p-2 border border-purple-700/30 text-center" },
                      React.createElement("div", { className: "text-lg mb-0.5" }, eth.icon),
                      React.createElement("div", { className: "text-[11px] font-bold text-white" }, eth.name),
                      React.createElement("div", { className: "text-[11px] text-slate-200 mt-0.5" }, eth.desc)
                    );
                  })
                )
              )
            ),

            
            // === SCHEDULE COMPARISON CANVAS ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(245,158,11,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDCC8 Schedule Comparison"),
                React.createElement("button", { "aria-label": "Change bl sched canvas",
                  onClick: function() { upd('blSchedCanvas', !blSchedCanvas); },
                  className: "text-[11px] text-amber-400 hover:text-amber-300"
                }, blSchedCanvas ? 'Hide' : 'Compare Schedules \u2192')
              ),
              blSchedCanvas && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-2" }, "Watch how different reinforcement schedules produce distinct response patterns. FR creates post-reinforcement pauses, VR produces high steady rates, FI shows scalloping, VI shows low steady rates."),
                // Canvas for animated cumulative records
                React.createElement("canvas", {
                  id: "bl-sched-compare-canvas",
                  style: { width: '100%', height: 200, display: 'block', borderRadius: 10, border: '1px solid rgba(100,116,139,0.3)' },
                  ref: function(cvs) {
                    if (!cvs) return;
                    var w = cvs.parentElement.offsetWidth || 400;
                    cvs.width = w; cvs.height = 200;
                    var ctx = cvs.getContext('2d');
                    // Background
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(0, 0, w, 200);
                    // Grid
                    ctx.strokeStyle = 'rgba(100,116,139,0.15)';
                    ctx.lineWidth = 0.5;
                    for (var gy = 0; gy < 200; gy += 25) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
                    for (var gx = 0; gx < w; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 200); ctx.stroke(); }
                    // Labels
                    ctx.font = '9px monospace';
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText('Cumulative Responses', 5, 12);
                    ctx.fillText('Time \u2192', w - 45, 195);
                    // Simulate schedule data
                    var schedTypes = SCHEDULE_TYPES;
                    var maxT = 200;
                    var maxR = 60;
                    var pw = w - 20;
                    var ph = 170;
                    var ox = 15;
                    var oy = 20;
                    // Animation tick based on blSchedTick
                    var tick = blSchedTick || 0;
                    var animLen = Math.min(tick, maxT);
                    schedTypes.forEach(function(sch, si) {
                      ctx.beginPath();
                      ctx.strokeStyle = sch.color;
                      ctx.lineWidth = 2;
                      var cumResp = 0;
                      var nextReinf = 0;
                      var seed = si * 7 + 3;
                      function pseudoRand() { seed = (seed * 16807 + 11) % 2147483647; return (seed % 1000) / 1000; }
                      if (sch.pattern === 'high-pause') {
                        nextReinf = sch.ratio;
                        for (var t = 0; t < animLen; t++) {
                          var localT = cumResp % sch.ratio;
                          if (localT < 1 && cumResp > 0) { /* pause */ }
                          else { if (pseudoRand() > 0.25) cumResp++; }
                          if (cumResp >= nextReinf) { nextReinf += sch.ratio; }
                          var px = ox + (t / maxT) * pw;
                          var py = oy + ph - (cumResp / maxR) * ph;
                          if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                        }
                      } else if (sch.pattern === 'high-steady') {
                        for (var t2 = 0; t2 < animLen; t2++) {
                          if (pseudoRand() > 0.2) cumResp++;
                          var px2 = ox + (t2 / maxT) * pw;
                          var py2 = oy + ph - (cumResp / maxR) * ph;
                          if (t2 === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
                        }
                      } else if (sch.pattern === 'scallop') {
                        var lastR = 0;
                        for (var t3 = 0; t3 < animLen; t3++) {
                          var inInterval = (t3 - lastR) / sch.interval;
                          var prob = inInterval * inInterval * 0.7;
                          if (pseudoRand() < prob) { cumResp++; if ((t3 - lastR) >= sch.interval) lastR = t3; }
                          var px3 = ox + (t3 / maxT) * pw;
                          var py3 = oy + ph - (cumResp / maxR) * ph;
                          if (t3 === 0) ctx.moveTo(px3, py3); else ctx.lineTo(px3, py3);
                        }
                      } else if (sch.pattern === 'low-steady') {
                        for (var t4 = 0; t4 < animLen; t4++) {
                          if (pseudoRand() > 0.55) cumResp++;
                          var px4 = ox + (t4 / maxT) * pw;
                          var py4 = oy + ph - (cumResp / maxR) * ph;
                          if (t4 === 0) ctx.moveTo(px4, py4); else ctx.lineTo(px4, py4);
                        }
                      }
                      ctx.stroke();
                    });
                    // Legend
                    schedTypes.forEach(function(sch, si) {
                      var lx = ox + si * (pw / 4);
                      ctx.fillStyle = sch.color;
                      ctx.fillRect(lx, 192, 8, 3);
                      ctx.font = '8px monospace';
                      ctx.fillText(sch.abbrev, lx + 10, 195);
                    });
                    // Animate
                    if (tick < maxT && !blSchedPaused) {
                      setTimeout(function() { upd('blSchedTick', tick + 2); }, 50);
                    }
                  }
                }),
                // Controls
                React.createElement("div", { className: "flex gap-2 mt-2 justify-center" },
                  React.createElement("button", { "aria-label": "Toggle schedule animation",
                    onClick: function() { upd('blSchedPaused', !blSchedPaused); },
                    className: "px-3 py-1 rounded-lg text-[11px] font-bold transition-all " + (blSchedPaused ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-100')
                  }, blSchedPaused ? '\u25B6 Play' : '\u23F8 Pause'),
                  React.createElement("button", { "aria-label": "Reset schedule animation",
                    onClick: function() { upd('blSchedTick', 0); upd('blSchedPaused', false); },
                    className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-700 text-slate-100 hover:bg-slate-600 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                  }, '\u21BB Reset')
                ),
                // Schedule details
                React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-3" },
                  SCHEDULE_TYPES.map(function(sch, si) {
                    return React.createElement("div", { key: si,
                      className: "rounded-lg p-2 border transition-all hover:scale-[1.02]",
                      style: { borderColor: sch.color + '60', background: sch.color + '10' }
                    },
                      React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                        React.createElement("div", { className: "w-3 h-3 rounded-full", style: { background: sch.color } }),
                        React.createElement("span", { className: "text-[11px] font-black text-white" }, sch.name),
                        React.createElement("span", { className: "text-[11px] font-mono", style: { color: sch.color } }, '(' + sch.abbrev + ')')
                      ),
                      React.createElement("div", { className: "text-[11px] text-slate-200" }, sch.desc),
                      React.createElement("div", { className: "text-[11px] text-amber-400 mt-1 italic" }, '\uD83D\uDCA1 ' + sch.example)
                    );
                  })
                )
              )
            ),

            // === REINFORCEMENT / PUNISHMENT 2x2 MATRIX ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(139,92,246,0.2)' }, glass)
            },
              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, "\u2696\uFE0F Reinforcement \u0026 Punishment Matrix"),
              React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-2" }, "The 4 quadrants of operant conditioning. Click each cell to learn more:"),
              // Column headers
              React.createElement("div", { className: "grid grid-cols-3 gap-1 mb-1" },
                React.createElement("div", null),
                React.createElement("div", { className: "text-center text-[11px] font-bold text-emerald-400 uppercase" }, "\u2795 Add Stimulus"),
                React.createElement("div", { className: "text-center text-[11px] font-bold text-blue-400 uppercase" }, "\u2796 Remove Stimulus")
              ),
              // Row 1: Reinforcement
              React.createElement("div", { className: "grid grid-cols-3 gap-1 mb-1" },
                React.createElement("div", { className: "flex items-center text-[11px] font-bold text-green-400 uppercase pr-1" }, "\u2B06 Increase Behavior"),
                REINFORCE_MATRIX.filter(function(m) { return m.row === 0; }).map(function(m, mi) {
                  var isActive = blMatrixIdx === m.id;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: m.id,
                    onClick: function() { upd('blMatrixIdx', isActive ? null : m.id); },
                    className: "cursor-pointer rounded-xl p-2 border-2 text-center transition-all " + (isActive ? 'scale-105 shadow-lg' : 'hover:scale-[1.02]'),
                    style: { borderColor: isActive ? m.color : m.color + '40', background: isActive ? m.color + '20' : 'rgba(30,41,59,0.6)' }
                  },
                    React.createElement("div", { className: "text-xl mb-0.5" }, m.icon),
                    React.createElement("div", { className: "text-[11px] font-black", style: { color: m.color } }, m.abbrev),
                    React.createElement("div", { className: "text-[11px] text-slate-200" }, m.name)
                  );
                })
              ),
              // Row 2: Punishment
              React.createElement("div", { className: "grid grid-cols-3 gap-1" },
                React.createElement("div", { className: "flex items-center text-[11px] font-bold text-red-400 uppercase pr-1" }, "\u2B07 Decrease Behavior"),
                REINFORCE_MATRIX.filter(function(m) { return m.row === 1; }).map(function(m, mi) {
                  var isActive = blMatrixIdx === m.id;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: m.id,
                    onClick: function() { upd('blMatrixIdx', isActive ? null : m.id); },
                    className: "cursor-pointer rounded-xl p-2 border-2 text-center transition-all " + (isActive ? 'scale-105 shadow-lg' : 'hover:scale-[1.02]'),
                    style: { borderColor: isActive ? m.color : m.color + '40', background: isActive ? m.color + '20' : 'rgba(30,41,59,0.6)' }
                  },
                    React.createElement("div", { className: "text-xl mb-0.5" }, m.icon),
                    React.createElement("div", { className: "text-[11px] font-black", style: { color: m.color } }, m.abbrev),
                    React.createElement("div", { className: "text-[11px] text-slate-200" }, m.name)
                  );
                })
              ),
              // Detail panel for selected quadrant
              blMatrixIdx && (function() {
                var sel = REINFORCE_MATRIX.filter(function(m) { return m.id === blMatrixIdx; })[0];
                if (!sel) return null;
                return React.createElement("div", {
                  className: "mt-3 rounded-xl p-3 border",
                  style: { borderColor: sel.color + '60', background: sel.color + '08' }
                },
                  React.createElement("div", { className: "text-[11px] font-black mb-1", style: { color: sel.color } }, sel.icon + ' ' + sel.name + ' (' + sel.abbrev + ')'),
                  React.createElement("div", { className: "text-[11px] text-slate-100 mb-1" }, sel.formal),
                  React.createElement("div", { className: "text-[11px] text-slate-200 mb-2" },
                    React.createElement("span", { className: "font-bold text-emerald-400" }, sel.action),
                    ' a stimulus to ',
                    React.createElement("span", { className: "font-bold text-blue-400" }, sel.effect),
                    ' behavior'
                  ),
                  React.createElement("div", { className: "text-[11px] text-amber-400 font-medium mb-1" }, '\uD83D\uDCA1 Real-world examples:'),
                  React.createElement("ul", { className: "space-y-0.5 ml-2" },
                    sel.examples.map(function(ex, exi) {
                      return React.createElement("li", { key: exi, className: "text-[11px] text-slate-200 list-disc" }, ex);
                    })
                  )
                );
              })()
            ),

            // === TOKEN ECONOMY BUILDER ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(16,185,129,0.2)' }, glass)
            },
              React.createElement("p", { className: "text-[11px] text-slate-200 font-bold mb-1 uppercase tracking-wider" }, "\uD83C\uDFAE Token Economy Builder"),
              React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-2" }, "Design a classroom token economy! Award tokens for positive behaviors, then let students exchange them for rewards. This is a real ABA strategy used in schools worldwide."),
              // Token balance
              React.createElement("div", { className: "flex items-center justify-center gap-3 mb-3 py-2 bg-gradient-to-r from-amber-900/30 to-emerald-900/30 rounded-xl border border-amber-700/30" },
                React.createElement("div", { className: "text-2xl" }, '\uD83E\uDE99'),
                React.createElement("div", { className: "text-center" },
                  React.createElement("div", { className: "text-[11px] text-slate-200 uppercase tracking-wider" }, 'Token Balance'),
                  React.createElement("div", { className: "text-2xl font-black text-amber-400" }, blTokenBalance)
                ),
                React.createElement("div", { className: "text-2xl" }, '\uD83E\uDE99')
              ),
              // Earn tokens
              React.createElement("div", { className: "mb-3" },
                React.createElement("div", { className: "text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1" }, '\u2B06 Earn Tokens'),
                React.createElement("div", { className: "grid grid-cols-2 gap-1" },
                  TOKEN_ITEMS.map(function(item) {
                    return React.createElement("button", { "aria-label": "Change bl token balance", key: item.id,
                      onClick: function() {
                        upd('blTokenBalance', blTokenBalance + item.tokens);
                        var newLog = (blTokenLog || []).slice();
                        newLog.unshift({ type: 'earn', name: item.name, tokens: item.tokens, icon: item.icon, t: Date.now() });
                        if (newLog.length > 20) newLog = newLog.slice(0, 20);
                        upd('blTokenLog', newLog);
                        if (addToast) addToast('\uD83E\uDE99 +' + item.tokens + ' tokens for ' + item.name + '!', 'success');
                      },
                      className: "flex items-center gap-1.5 p-1.5 rounded-lg text-left transition-all bg-emerald-900/20 border border-emerald-700/30 hover:bg-emerald-900/40 hover:scale-[1.02]"
                    },
                      React.createElement("span", { className: "text-lg" }, item.icon),
                      React.createElement("div", null,
                        React.createElement("div", { className: "text-[11px] font-bold text-slate-100" }, item.name),
                        React.createElement("div", { className: "text-[11px] text-emerald-400 font-mono" }, '+' + item.tokens + ' tokens')
                      )
                    );
                  })
                )
              ),
              // Spend tokens
              React.createElement("div", { className: "mb-2" },
                React.createElement("div", { className: "text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1" }, '\uD83C\uDF81 Spend Tokens'),
                React.createElement("div", { className: "grid grid-cols-2 gap-1" },
                  TOKEN_REWARDS.map(function(rew) {
                    var canAfford = blTokenBalance >= rew.cost;
                    return React.createElement("button", { "aria-label": "Behaviorlab action", key: rew.id,
                      onClick: function() {
                        if (!canAfford) { if (addToast) addToast('\u274C Need ' + (rew.cost - blTokenBalance) + ' more tokens!', 'info'); return; }
                        upd('blTokenBalance', blTokenBalance - rew.cost);
                        var newLog2 = (blTokenLog || []).slice();
                        newLog2.unshift({ type: 'spend', name: rew.name, tokens: rew.cost, icon: rew.icon, t: Date.now() });
                        if (newLog2.length > 20) newLog2 = newLog2.slice(0, 20);
                        upd('blTokenLog', newLog2);
                        var newRew = (blTokenRewards || []).slice();
                        newRew.push(rew.name);
                        upd('blTokenRewards', newRew);
                        if (addToast) addToast('\uD83C\uDF89 Redeemed ' + rew.name + '!', 'success');
                      },
                      className: "flex items-center gap-1.5 p-1.5 rounded-lg text-left transition-all border " + (canAfford ? 'bg-amber-900/20 border-amber-700/30 hover:bg-amber-900/40 hover:scale-[1.02]' : 'bg-slate-800/40 border-slate-700/20 opacity-50 cursor-not-allowed'),
                      disabled: !canAfford
                    },
                      React.createElement("span", { className: "text-lg" }, rew.icon),
                      React.createElement("div", null,
                        React.createElement("div", { className: "text-[11px] font-bold text-slate-100" }, rew.name),
                        React.createElement("div", { className: "text-[11px] font-mono " + (canAfford ? 'text-amber-400' : 'text-slate-200') }, rew.cost + ' tokens')
                      )
                    );
                  })
                )
              ),
              // Transaction log
              blTokenLog.length > 0 && React.createElement("div", { className: "mt-2" },
                React.createElement("div", { className: "text-[11px] text-slate-200 uppercase tracking-wider mb-0.5" }, 'Recent Activity'),
                React.createElement("div", { className: "max-h-24 overflow-y-auto space-y-0.5" },
                  blTokenLog.slice(0, 8).map(function(entry, ei) {
                    return React.createElement("div", { key: ei, className: "flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded " + (entry.type === 'earn' ? 'bg-emerald-900/10' : 'bg-amber-900/10') },
                      React.createElement("span", null, entry.icon + ' ' + entry.name),
                      React.createElement("span", { className: entry.type === 'earn' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold' },
                        (entry.type === 'earn' ? '+' : '-') + entry.tokens
                      )
                    );
                  })
                )
              )
            ),

            // === OPERANT vs CLASSICAL CONDITIONING COMPARISON ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(139,92,246,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDD2C Operant vs Classical Conditioning"),
                React.createElement("button", { "aria-label": "Aspect",
                  onClick: function() { upd('blShowCondCompare', !blShowCondCompare); },
                  className: "text-[11px] text-violet-400 hover:text-violet-300"
                }, blShowCondCompare ? 'Hide' : 'Compare \u2192')
              ),
              blShowCondCompare && React.createElement("div", null,
                React.createElement("div", { className: "rounded-xl overflow-hidden border border-slate-700/30" },
                  // Header row
                  React.createElement("div", { className: "grid grid-cols-3 bg-slate-800/60" },
                    React.createElement("div", { className: "p-1.5 text-[11px] font-bold text-slate-200 uppercase" }, 'Aspect'),
                    React.createElement("div", { className: "p-1.5 text-[11px] font-bold text-amber-400 uppercase text-center border-l border-slate-700/30" }, '\uD83D\uDC2D Operant'),
                    React.createElement("div", { className: "p-1.5 text-[11px] font-bold text-violet-400 uppercase text-center border-l border-slate-700/30" }, '\uD83D\uDC36 Classical')
                  ),
                  // Data rows
                  CONDITIONING_COMPARE.map(function(row, ri) {
                    return React.createElement("div", { key: ri, className: "grid grid-cols-3 " + (ri % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20') },
                      React.createElement("div", { className: "p-1.5 text-[11px] font-medium text-slate-100 border-t border-slate-700/20" }, row.aspect),
                      React.createElement("div", { className: "p-1.5 text-[11px] text-amber-300/80 border-t border-l border-slate-700/20" }, row.operant),
                      React.createElement("div", { className: "p-1.5 text-[11px] text-violet-300/80 border-t border-l border-slate-700/20" }, row.classical)
                    );
                  })
                )
              )
            ),

            // === BIP (BEHAVIOR INTERVENTION PLAN) BUILDER ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(239,68,68,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDCCB Behavior Intervention Plan (BIP) Builder"),
                React.createElement("button", { "aria-label": "Change bl show bip planner",
                  onClick: function() { upd('blShowBipPlanner', !blShowBipPlanner); },
                  className: "text-[11px] text-red-400 hover:text-red-300"
                }, blShowBipPlanner ? 'Hide' : 'Build a BIP \u2192')
              ),
              blShowBipPlanner && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-3" }, "Walk through the steps of creating a real Behavior Intervention Plan \u2014 the document ABA professionals use to address challenging behavior."),
                // Step indicators
                React.createElement("div", { className: "flex gap-1 justify-center mb-3" },
                  ['Target', 'Antecedent', 'Function', 'Replace', 'Strategy', 'Summary'].map(function(step, si) {
                    var isComplete = si < blBipStep;
                    var isCurrent = si === blBipStep;
                    return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: si,
                      className: "flex flex-col items-center cursor-pointer",
                      onClick: function() { if (isComplete) upd('blBipStep', si); }
                    },
                      React.createElement("div", {
                        className: "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all " +
                          (isCurrent ? 'bg-red-500 border-red-400 text-white scale-110' : isComplete ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-200')
                      }, isComplete ? '\u2713' : (si + 1)),
                      React.createElement("div", { className: "text-[11px] mt-0.5 " + (isCurrent ? 'text-red-400 font-bold' : 'text-slate-200') }, step)
                    );
                  })
                ),
                // Step content
                (function() {
                  var steps = [
                    { title: 'Step 1: Identify Target Behavior', prompt: 'Describe the behavior you want to change. Be specific and observable!', field: 'behavior', placeholder: 'e.g., Student calls out answers without raising hand (3-5 times per class)' },
                    { title: 'Step 2: Identify Antecedents', prompt: 'What happens RIGHT BEFORE the behavior? What triggers it?', field: 'antecedent', placeholder: 'e.g., Teacher asks a question to the whole class' },
                    { title: 'Step 3: Hypothesize Function', prompt: 'WHY does the student engage in this behavior? (Attention, Escape, Tangible, Sensory)', field: 'func', placeholder: 'e.g., Attention \u2014 student wants teacher and peer attention' },
                    { title: 'Step 4: Replacement Behavior', prompt: 'What appropriate behavior should REPLACE the problem behavior? Must serve the SAME function!', field: 'replacement', placeholder: 'e.g., Raise hand and wait to be called on (still gets attention but appropriately)' },
                    { title: 'Step 5: Intervention Strategy', prompt: 'How will you teach and reinforce the replacement behavior?', field: 'strategy', placeholder: 'e.g., Teach hand-raising, reinforce with praise + 2 tokens; ignore call-outs (extinction)' }
                  ];
                  if (blBipStep < 5) {
                    var s = steps[blBipStep];
                    return React.createElement("div", { className: "space-y-2" },
                      React.createElement("div", { className: "text-[11px] font-bold text-red-300" }, s.title),
                      React.createElement("div", { className: "text-[11px] text-slate-200" }, s.prompt),
                      React.createElement("label", { htmlFor: "bip-step-" + blBipStep, className: "sr-only" }, "Step " + (blBipStep + 1) + ": " + s.field),
                      React.createElement("textarea", {
                        id: "bip-step-" + blBipStep,
                        "aria-label": "Step " + (blBipStep + 1) + ": " + s.title,
                        "aria-required": "true",
                        value: blBipData[s.field] || '',
                        onChange: function(e) {
                          var newData = Object.assign({}, blBipData);
                          newData[s.field] = e.target.value;
                          upd('blBipData', newData);
                        },
                        placeholder: s.placeholder,
                        rows: 2,
                        className: "w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-[11px] text-slate-200 placeholder-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/50 focus:outline-none resize-none"
                      }),
                      React.createElement("div", { className: "flex gap-2 justify-end" },
                        blBipStep > 0 && React.createElement("button", { "aria-label": "Back",
                          onClick: function() { upd('blBipStep', blBipStep - 1); },
                          className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-700 text-slate-100 hover:bg-slate-600 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                        }, '\u2190 Back'),
                        React.createElement("button", { "aria-label": "Next",
                          onClick: function() {
                            if (!blBipData[s.field]) {
                              if (addToast) addToast('\u270F\uFE0F Fill in this step first!', 'info');
                              var _ta = document.getElementById('bip-step-' + blBipStep);
                              if (_ta) { _ta.setAttribute('aria-invalid', 'true'); _ta.focus(); }
                              return;
                            }
                            upd('blBipStep', blBipStep + 1);
                            if (addToast) addToast('\u2705 Step ' + (blBipStep + 1) + ' complete!', 'success');
                          },
                          className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-500 focus:ring-2 focus:ring-red-400 focus:outline-none transition-all"
                        }, 'Next \u2192')
                      )
                    );
                  } else {
                    // Summary view
                    return React.createElement("div", { className: "space-y-2" },
                      React.createElement("div", { className: "text-[11px] font-bold text-emerald-300" }, '\u2705 Your Behavior Intervention Plan'),
                      React.createElement("div", { className: "rounded-xl bg-slate-800/60 p-3 space-y-2 border border-emerald-700/30" },
                        [
                          { label: 'Target Behavior', value: blBipData.behavior, color: 'text-red-300' },
                          { label: 'Antecedent', value: blBipData.antecedent, color: 'text-blue-300' },
                          { label: 'Hypothesized Function', value: blBipData.func, color: 'text-amber-300' },
                          { label: 'Replacement Behavior', value: blBipData.replacement, color: 'text-emerald-300' },
                          { label: 'Intervention Strategy', value: blBipData.strategy, color: 'text-violet-300' }
                        ].map(function(item, ii) {
                          return React.createElement("div", { key: ii },
                            React.createElement("div", { className: "text-[11px] font-bold uppercase tracking-wider " + item.color }, item.label),
                            React.createElement("div", { className: "text-[11px] text-slate-100" }, item.value)
                          );
                        })
                      ),
                      React.createElement("div", { className: "flex gap-2 justify-center" },
                        React.createElement("button", { "aria-label": "Edit",
                          onClick: function() { upd('blBipStep', 0); },
                          className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-700 text-slate-100 hover:bg-slate-600 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                        }, '\u270F\uFE0F Edit'),
                        React.createElement("button", { "aria-label": "New Plan",
                          onClick: function() { upd('blBipStep', 0); upd('blBipData', { behavior: '', antecedent: '', consequence: '', func: '', replacement: '', strategy: '' }); },
                          className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-red-700 text-white hover:bg-red-600"
                        }, '\uD83D\uDD04 New Plan')
                      )
                    );
                  }
                })()
              )
            ),


            
            // === SCENARIO CHALLENGES ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(239,68,68,0.2)' }, glass)
            },
              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, "\uD83C\uDFAF Clinical Scenarios (" + (blScenarioIdx + 1) + "/" + SCENARIO_CHALLENGES.length + ")"),
              // Streak indicator
              blStreak > 0 && React.createElement("div", { className: "text-center mb-2" },
                React.createElement("span", { className: "inline-block px-3 py-0.5 rounded-full text-[11px] font-bold " + (blStreak >= 5 ? 'bg-amber-700 text-white animate-pulse' : blStreak >= 3 ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-700 text-slate-100') },
                  '\uD83D\uDD25 ' + blStreak + ' streak!' + (blStreak >= 5 ? ' AMAZING!' : blStreak >= 3 ? ' On fire!' : ''))
              ),
              // Score
              React.createElement("div", { className: "flex justify-between items-center mb-2" },
                React.createElement("span", { className: "text-[11px] text-slate-200" }, 'Score: ' + blScenarioScore + '/' + blScenarioTotal),
                React.createElement("span", { className: "text-[11px] text-amber-500" }, 'Best streak: ' + blBestStreak)
              ),
              (function() {
                var sc = SCENARIO_CHALLENGES[blScenarioIdx];
                if (!sc) return null;
                var answered = blScenarioAnswer >= 0;
                var isCorrect = blScenarioAnswer === sc.correct;
                return React.createElement("div", null,
                  // Scenario description
                  React.createElement("div", { className: "bg-slate-800/60 rounded-xl p-3 mb-2 border border-slate-700/30" },
                    React.createElement("div", { className: "text-[11px] text-slate-100 leading-relaxed" }, sc.scenario)
                  ),
                  React.createElement("div", { className: "text-[11px] font-bold text-white mb-2" }, sc.question),
                  // Options
                  React.createElement("div", { className: "space-y-1.5 mb-2" },
                    sc.options.map(function(opt, oi) {
                      var isSelected = blScenarioAnswer === oi;
                      var isRight = oi === sc.correct;
                      var bgClass = !answered ? 'bg-slate-800/40 border-slate-600 hover:border-slate-400 cursor-pointer' :
                        isRight ? 'bg-emerald-900/30 border-emerald-500' :
                        isSelected && !isRight ? 'bg-red-900/30 border-red-500' : 'bg-slate-800/20 border-slate-700 opacity-40';
                      return React.createElement("button", { "aria-label": "Behaviorlab action", key: oi,
                        onClick: function() {
                          if (answered) return;
                          upd('blScenarioAnswer', oi);
                          var newTotal = blScenarioTotal + 1;
                          upd('blScenarioTotal', newTotal);
                          if (oi === sc.correct) {
                            var newScore = blScenarioScore + 1;
                            upd('blScenarioScore', newScore);
                            var newStreak = blStreak + 1;
                            upd('blStreak', newStreak);
                            if (newStreak > blBestStreak) upd('blBestStreak', newStreak);
                            if (addToast) addToast('\u2705 Correct! +1 streak (' + newStreak + ')', 'success');
                          } else {
                            upd('blStreak', 0);
                            if (addToast) addToast('\u274C Not quite \u2014 read the explanation!', 'info');
                          }
                        },
                        className: "w-full text-left p-2 rounded-lg border text-[11px] transition-all " + bgClass,
                        disabled: answered
                      },
                        React.createElement("span", { className: "font-bold mr-1 " + (answered && isRight ? 'text-emerald-400' : answered && isSelected ? 'text-red-400' : 'text-slate-200') },
                          String.fromCharCode(65 + oi) + '.'),
                        React.createElement("span", { className: answered && isRight ? 'text-emerald-300' : answered && isSelected && !isRight ? 'text-red-300' : 'text-slate-100' }, ' ' + opt)
                      );
                    })
                  ),
                  // Feedback
                  answered && React.createElement("div", { className: "space-y-2" },
                    React.createElement("div", { className: "rounded-xl p-2.5 text-[11px] " + (isCorrect ? 'bg-emerald-900/20 border border-emerald-700/30 text-emerald-300' : 'bg-red-900/20 border border-red-700/30 text-red-300') },
                      React.createElement("span", { className: "font-bold" }, isCorrect ? '\u2705 ' : '\u274C '),
                      sc.explain
                    ),
                    React.createElement("div", { className: "rounded-xl p-2.5 text-[11px] bg-blue-900/20 border border-blue-700/30 text-blue-300" },
                      React.createElement("span", { className: "font-bold" }, '\uD83D\uDCA1 Better approach: '),
                      sc.better
                    ),
                    React.createElement("button", { "aria-label": "Next Scenario (",
                      onClick: function() {
                        var nextIdx = (blScenarioIdx + 1) % SCENARIO_CHALLENGES.length;
                        upd('blScenarioIdx', nextIdx);
                        upd('blScenarioAnswer', -1);
                      },
                      className: "w-full py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-red-600 to-amber-600 text-white hover:from-red-500 hover:to-amber-500 transition-all"
                    }, 'Next Scenario \u2192 (' + ((blScenarioIdx + 1) % SCENARIO_CHALLENGES.length + 1) + '/' + SCENARIO_CHALLENGES.length + ')')
                  )
                );
              })()
            ),

            // === ABA TIMELINE ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(59,130,246,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDCC5 ABA History Timeline"),
                React.createElement("button", { "aria-label": "Change bl show timeline",
                  onClick: function() { upd('blShowTimeline', !blShowTimeline); },
                  className: "text-[11px] text-blue-400 hover:text-blue-300"
                }, blShowTimeline ? 'Hide' : 'Explore \u2192')
              ),
              blShowTimeline && React.createElement("div", { className: "relative ml-4" },
                // Vertical line
                React.createElement("div", { className: "absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-amber-500 to-emerald-500" }),
                React.createElement("div", { className: "space-y-2 pl-6 max-h-72 overflow-y-auto" },
                  ABA_MILESTONES.map(function(ms, mi) {
                    var eraColor = ms.era === 'foundations' ? 'border-blue-500 bg-blue-900/20' :
                                   ms.era === 'growth' ? 'border-amber-500 bg-amber-900/20' :
                                   ms.era === 'applied' ? 'border-emerald-500 bg-emerald-900/20' : 'border-violet-500 bg-violet-900/20';
                    var dotColor = ms.era === 'foundations' ? 'bg-blue-500' :
                                   ms.era === 'growth' ? 'bg-amber-500' :
                                   ms.era === 'applied' ? 'bg-emerald-500' : 'bg-violet-500';
                    return React.createElement("div", { key: mi, className: "relative" },
                      // Dot on timeline
                      React.createElement("div", { className: "absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-slate-900 " + dotColor }),
                      // Card
                      React.createElement("div", { className: "rounded-lg p-2 border " + eraColor },
                        React.createElement("div", { className: "flex items-center gap-1.5" },
                          React.createElement("span", { className: "text-lg" }, ms.icon),
                          React.createElement("span", { className: "text-[11px] font-black text-amber-400 font-mono" }, ms.year),
                          React.createElement("span", { className: "text-[11px] text-slate-100 leading-tight" }, ms.event)
                        )
                      )
                    );
                  })
                ),
                // Era legend
                React.createElement("div", { className: "flex gap-3 mt-2 justify-center" },
                  [{ name: 'Foundations', color: 'bg-blue-500' }, { name: 'Growth', color: 'bg-amber-500' }, { name: 'Applied', color: 'bg-emerald-500' }, { name: 'Modern', color: 'bg-violet-500' }].map(function(era) {
                    return React.createElement("div", { key: era.name, className: "flex items-center gap-1" },
                      React.createElement("div", { className: "w-2 h-2 rounded-full " + era.color }),
                      React.createElement("span", { className: "text-[11px] text-slate-200" }, era.name)
                    );
                  })
                )
              )
            ),

            // === QUICK REFERENCE CARDS ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(16,185,129,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDCCB Quick Reference Cards"),
                React.createElement("button", { "aria-label": "Change bl show quick ref",
                  onClick: function() { upd('blShowQuickRef', !blShowQuickRef); },
                  className: "text-[11px] text-emerald-400 hover:text-emerald-300"
                }, blShowQuickRef ? 'Hide' : 'View \u2192')
              ),
              blShowQuickRef && React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                QUICK_REF_CARDS.map(function(card, ci) {
                  return React.createElement("div", { key: ci,
                    className: "rounded-xl p-2.5 border transition-all hover:scale-[1.02]",
                    style: { borderColor: card.color + '40', background: card.color + '08' }
                  },
                    React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                      React.createElement("span", { className: "text-lg" }, card.icon),
                      React.createElement("span", { className: "text-[11px] font-black", style: { color: card.color } }, card.title)
                    ),
                    React.createElement("div", { className: "text-[11px] text-slate-200 leading-relaxed" }, card.content)
                  );
                })
              )
            ),


            // === ABA GLOSSARY ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(148,163,184,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, "\uD83D\uDCD6 ABA Glossary (" + ABA_GLOSSARY.length + " terms)"),
                React.createElement("button", { "aria-label": "Change bl show glossary",
                  onClick: function() { upd('blShowGlossary', !d.blShowGlossary); },
                  className: "text-[11px] text-slate-200 hover:text-slate-100"
                }, d.blShowGlossary ? 'Hide' : 'Browse \u2192')
              ),
              d.blShowGlossary && React.createElement("div", null,
                React.createElement("div", { className: "space-y-0.5 max-h-64 overflow-y-auto" },
                  ABA_GLOSSARY.map(function(gl, gli) {
                    var isActive = d.blGlossaryIdx === gli;
                    return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: gli,
                      onClick: function() { upd('blGlossaryIdx', isActive ? null : gli); },
                      className: "cursor-pointer rounded-lg p-1.5 border transition-all " + (isActive ? 'bg-slate-700 border-amber-500/50' : 'bg-slate-700/20 border-slate-700 hover:border-slate-500')
                    },
                      React.createElement("div", { className: "text-[11px] font-bold " + (isActive ? 'text-amber-300' : 'text-slate-100') }, gl.term),
                      isActive && React.createElement("div", { className: "text-[11px] text-slate-200 mt-0.5" }, gl.def)
                    );
                  })
                )
              )
            ),

            // \u2500\u2500 Contingency diagram \u2500\u2500


            React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(139,92,246,0.2)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, "\uD83D\uDD17 Three-Term Contingency"),

              React.createElement("div", { className: "flex items-center gap-2 justify-center flex-wrap" },

                React.createElement("div", { className: "bg-blue-900/40 rounded-lg px-3 py-2 text-center border border-blue-700/30 min-w-[80px]" },

                  React.createElement("p", { className: "text-[11px] text-blue-400 font-bold" }, "ANTECEDENT"),

                  React.createElement("p", { className: "text-xs text-blue-200 font-medium" }, currentLevel.contingency.a)

                ),

                React.createElement("span", { className: "text-indigo-400 text-lg font-bold" }, "\u2192"),

                React.createElement("div", { className: "bg-amber-900/40 rounded-lg px-3 py-2 text-center border border-amber-700/30 min-w-[80px]" },

                  React.createElement("p", { className: "text-[11px] text-amber-400 font-bold" }, "BEHAVIOR"),

                  React.createElement("p", { className: "text-xs text-amber-200 font-medium" }, currentLevel.contingency.b)

                ),

                React.createElement("span", { className: "text-indigo-400 text-lg font-bold" }, "\u2192"),

                React.createElement("div", { className: "bg-emerald-900/40 rounded-lg px-3 py-2 text-center border border-emerald-700/30 min-w-[80px]" },

                  React.createElement("p", { className: "text-[11px] text-emerald-400 font-bold" }, "CONSEQUENCE"),

                  React.createElement("p", { className: "text-xs text-emerald-200 font-medium" }, currentLevel.contingency.c)

                )

              )

            )

          );
      })();
    }
  });


})();

} // end dedup guard