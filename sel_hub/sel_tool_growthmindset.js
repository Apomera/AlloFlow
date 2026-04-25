// ═══════════════════════════════════════════════════════════════
// sel_tool_growthmindset.js — Growth Mindset Workshop (v1.0)
// Interactive neuroplasticity education, fixed→growth reframing,
// persistence stories, personal growth mapping, AI growth coach.
// Based on Carol Dweck's research (2006): the belief that abilities
// develop through dedication and hard work creates a love of
// learning and resilience essential for great accomplishment.
// Registered tool ID: "growthmindset"
// Category: self-management
// Grade-adaptive: uses ctx.gradeBand for vocabulary & depth
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ── Inject SEL Visual Polish CSS (shared keyframes + effects) ──
  (function() {
    if (document.getElementById('sel-visual-polish-css')) return;
    var style = document.createElement('style');
    style.id = 'sel-visual-polish-css';
    style.textContent = [
      '@keyframes selFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
      '@keyframes selFadeInScale { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }',
      '@keyframes selPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }',
      '@keyframes selShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }',
      '@keyframes selGlow { 0%, 100% { box-shadow: 0 0 8px rgba(124,58,237,0.2); } 50% { box-shadow: 0 0 20px rgba(124,58,237,0.5); } }',
      '@keyframes selFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }',
      '@keyframes selSlideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }',
      '@keyframes selBounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { transform: scale(1); } }',
      '@keyframes selSparkle { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }',
      '@keyframes selGrowBar { from { width: 0; } }',
      '@keyframes selRotateIn { from { opacity: 0; transform: rotate(-10deg) scale(0.9); } to { opacity: 1; transform: rotate(0) scale(1); } }',
      '.sel-card { animation: selFadeIn 0.35s ease-out both; }',
      '.sel-card:nth-child(2) { animation-delay: 0.06s; }',
      '.sel-card:nth-child(3) { animation-delay: 0.12s; }',
      '.sel-card:nth-child(4) { animation-delay: 0.18s; }',
      '.sel-card:nth-child(5) { animation-delay: 0.24s; }',
      '.sel-tab { transition: all 0.2s ease; position: relative; }',
      '.sel-tab:hover { transform: translateY(-1px); }',
      '.sel-tab-active { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }',
      '.sel-hero { animation: selFadeInScale 0.5s ease-out both; }',
      '.sel-hero-icon { animation: selFloat 3s ease-in-out infinite; display: inline-block; }',
      '.sel-badge { animation: selBounceIn 0.4s ease-out both; }',
      '.sel-progress-dot { transition: all 0.3s ease; }',
      '.sel-progress-dot:hover { transform: scale(1.2); }',
      '.sel-btn { transition: all 0.2s ease; }',
      '.sel-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }',
      '.sel-btn:active { transform: translateY(0); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }',
      '.sel-glow { animation: selGlow 2s ease-in-out infinite; }',
      '.sel-shimmer { background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%); background-size: 200% 100%; animation: selShimmer 2s linear infinite; }',
    ].join('\n');
    document.head.appendChild(style);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-growthmindset')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-growthmindset';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects Engine (Web Audio API) ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
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
      gain.gain.setValueAtTime(vol || 0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch(e) {}
  }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxGrow() {
    // Ascending scale — the sound of growth
    playTone(262, 0.12, 'sine', 0.06);
    setTimeout(function() { playTone(330, 0.12, 'sine', 0.06); }, 100);
    setTimeout(function() { playTone(392, 0.12, 'sine', 0.06); }, 200);
    setTimeout(function() { playTone(523, 0.18, 'sine', 0.08); }, 300);
  }
  function sfxReframe() {
    // Transformative chime — fixed → growth
    playTone(330, 0.15, 'triangle', 0.05);
    setTimeout(function() { playTone(523, 0.2, 'sine', 0.07); }, 150);
    setTimeout(function() { playTone(659, 0.25, 'sine', 0.08); }, 300);
  }
  function sfxNeuron() {
    // Synaptic spark
    playTone(1200, 0.03, 'sine', 0.04);
    setTimeout(function() { playTone(1600, 0.04, 'sine', 0.03); }, 30);
  }
  function sfxComplete() {
    playTone(523, 0.1, 'sine', 0.08);
    setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80);
    setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160);
  }

  // ══════════════════════════════════════════════════════════════
  // ── Content Data ──
  // ══════════════════════════════════════════════════════════════

  // Brain Science facts — grade-adaptive
  var BRAIN_FACTS = {
    elementary: [
      { title: 'Your Brain Grows!', text: 'Every time you practice something hard, tiny connections in your brain called neurons get stronger. It\u2019s like building a bridge \u2014 the more you walk across it, the stronger it gets.', emoji: '\uD83E\uDDE0' },
      { title: 'Mistakes Make You Smarter', text: 'When you make a mistake, your brain actually fires MORE signals than when you get something right. Mistakes are your brain\u2019s favorite way to learn!', emoji: '\u26A1' },
      { title: 'The Power of Practice', text: 'Nobody is born knowing how to read, ride a bike, or do math. Every skill you have was once something you couldn\u2019t do. Your brain learned it through practice.', emoji: '\uD83D\uDCAA' },
      { title: 'Brain Muscles', text: 'Your brain isn\u2019t actually a muscle, but it works like one. The more you exercise it by trying hard things, the stronger and better it gets at learning.', emoji: '\uD83C\uDFCB\uFE0F' },
      { title: 'Neurons That Fire Together', text: 'When you practice something, your brain cells connect to each other. The more you practice, the faster the signals travel. That\u2019s why things get easier!', emoji: '\uD83C\uDF1F' },
    ],
    middle: [
      { title: 'Neuroplasticity', text: 'Your brain physically changes structure when you learn. New neural pathways form, existing ones strengthen, and myelin sheathing makes signals travel faster. This is called neuroplasticity \u2014 your brain\u2019s ability to rewire itself.', emoji: '\uD83E\uDDE0' },
      { title: 'The Effort Effect', text: 'Research shows that students who believe intelligence can grow (growth mindset) outperform students of equal ability who believe intelligence is fixed. The belief itself changes the outcome.', emoji: '\uD83D\uDCCA' },
      { title: 'Productive Struggle', text: 'The feeling of struggling with something difficult isn\u2019t failure \u2014 it\u2019s the feeling of your brain growing. Neuroscientists call this "desirable difficulty." Easy tasks don\u2019t build new pathways.', emoji: '\uD83E\uDDD7' },
      { title: 'The Feedback Loop', text: 'When you try, fail, adjust, and try again, you\u2019re running the most powerful learning algorithm nature ever built. Each iteration strengthens the neural pathway. Persistence isn\u2019t just character \u2014 it\u2019s neuroscience.', emoji: '\uD83D\uDD04' },
      { title: 'Myelin: The Speed Coating', text: 'When you repeat a skill, your brain wraps the neural pathway in myelin \u2014 a fatty coating that makes signals travel up to 100x faster. That\u2019s why practice doesn\u2019t just help you remember; it makes you genuinely faster.', emoji: '\u26A1' },
    ],
    high: [
      { title: 'Neuroplasticity & Identity', text: 'Carol Dweck\u2019s research reveals that mindset isn\u2019t just about academic performance \u2014 it shapes identity. People with growth mindsets don\u2019t just learn more; they respond to setbacks differently, seek harder challenges, and maintain motivation through failure.', emoji: '\uD83E\uDDE0' },
      { title: 'The Neuroscience of Effort', text: 'fMRI studies show that growth-mindset individuals show increased activity in the anterior cingulate cortex (error monitoring) and dorsolateral prefrontal cortex (strategy adjustment) when facing challenges. Fixed-mindset brains disengage.', emoji: '\uD83D\uDCCA' },
      { title: 'Epigenetics & Learning', text: 'Recent research suggests that intense learning experiences can trigger epigenetic changes \u2014 modifications to gene expression without changing DNA. Your experiences literally shape which genes are active in your brain cells.', emoji: '\uD83E\uDDEC' },
      { title: 'Transfer & Metacognition', text: 'Growth mindset enables metacognitive monitoring \u2014 the ability to observe your own thinking. This meta-awareness is what allows you to transfer strategies from one domain to another, making you a better learner across every subject.', emoji: '\uD83D\uDD0D' },
      { title: 'The Social Dimension', text: 'Mindset is contagious. Research by Mary Murphy shows that organizations and classrooms develop "mindset cultures." When a teacher communicates growth mindset, students\u2019 stress hormones decrease and performance improves.', emoji: '\uD83C\uDF10' },
    ]
  };

  // Fixed → Growth reframe challenges
  var REFRAMES = {
    elementary: [
      { fixed: 'I can\u2019t do math.', growth: 'I can\u2019t do math YET. I\u2019m still learning.', hint: 'Add the word "yet" \u2014 it changes everything!' },
      { fixed: 'I\u2019m not smart.', growth: 'I\u2019m getting smarter every time I try.', hint: 'Smart isn\u2019t something you ARE \u2014 it\u2019s something you BECOME.' },
      { fixed: 'This is too hard.', growth: 'This is hard, and that means my brain is growing.', hint: 'Hard things are the ones that make you stronger.' },
      { fixed: 'She\u2019s better than me.', growth: 'She\u2019s been practicing longer. I can learn from her.', hint: 'Other people\u2019s success shows you what\u2019s possible.' },
      { fixed: 'I give up.', growth: 'I\u2019ll try a different way.', hint: 'Giving up stops the learning. Trying differently IS learning.' },
      { fixed: 'I already know this.', growth: 'I can always learn more about this.', hint: 'Even experts keep learning.' },
      { fixed: 'I made a mistake.', growth: 'Mistakes help me learn what to do next.', hint: 'Every expert was once a beginner who made lots of mistakes.' },
      { fixed: 'I\u2019ll never be good at reading.', growth: 'Reading gets easier the more I practice.', hint: 'Your favorite author once struggled with the alphabet too.' },
      { fixed: 'I don\u2019t want to try because I might fail.', growth: 'I\u2019ll try because even if I fail, I\u2019ll learn something.', hint: 'The only real failure is not trying.' },
      { fixed: 'My drawing looks bad.', growth: 'My drawing is getting better with each one I make.', hint: 'Compare yourself to yesterday, not to someone else.' },
    ],
    middle: [
      { fixed: 'I\u2019m just not a math person.', growth: 'I haven\u2019t found my strategy for math yet. Let me try a different approach.', hint: '"Math person" isn\u2019t a type of person \u2014 it\u2019s a skill anyone can develop.' },
      { fixed: 'I\u2019m terrible at public speaking.', growth: 'Public speaking feels uncomfortable because I haven\u2019t practiced enough yet. Each time gets easier.', hint: 'Discomfort is the feeling of a skill being built.' },
      { fixed: 'That feedback is unfair.', growth: 'Even if the feedback stings, there might be something useful in it I can learn from.', hint: 'Feedback is data, not judgment.' },
      { fixed: 'If I have to work hard, it means I\u2019m not talented.', growth: 'Hard work is how talent is built. Even prodigies practice for thousands of hours.', hint: 'Effort isn\u2019t the opposite of talent \u2014 it\u2019s the engine of talent.' },
      { fixed: 'Other people make it look easy.', growth: 'I\u2019m seeing their performance, not their practice. Everyone struggles behind the scenes.', hint: 'You\u2019re comparing your behind-the-scenes to their highlight reel.' },
      { fixed: 'I failed the test, so I\u2019m dumb.', growth: 'The test showed me what I need to study next. Now I have a map.', hint: 'A test score is a GPS coordinate, not a life sentence.' },
      { fixed: 'Why bother? I\u2019ll never be as good as them.', growth: 'My goal isn\u2019t to be them. It\u2019s to be better than I was yesterday.', hint: 'The only meaningful comparison is with your past self.' },
      { fixed: 'I don\u2019t belong in this advanced class.', growth: 'I\u2019m here because someone saw potential in me. Let me prove them right.', hint: 'Imposter syndrome is growth mindset\u2019s shadow. It means you\u2019re stretching.' },
    ],
    high: [
      { fixed: 'I\u2019m not creative.', growth: 'Creativity is a practice, not a trait. I can develop it through experimentation and embracing failure.', hint: 'Every creative breakthrough was preceded by hundreds of bad ideas.' },
      { fixed: 'I should already know this by now.', growth: 'Learning doesn\u2019t follow a schedule. Understanding has its own timeline.', hint: 'Einstein didn\u2019t publish general relativity until age 36 \u2014 after years of wrong turns.' },
      { fixed: 'If I ask for help, people will think I\u2019m incompetent.', growth: 'Asking for help is a sign of self-awareness and strategic thinking. The strongest learners leverage every resource.', hint: 'No significant achievement in human history was accomplished alone.' },
      { fixed: 'My SAT score defines my potential.', growth: 'A standardized test measures a narrow set of skills on a single day. My potential is defined by what I choose to work toward.', hint: 'The correlation between test scores and life success is weaker than most people think.' },
      { fixed: 'I\u2019m not the kind of person who can do this.', growth: 'Identity isn\u2019t destiny. I can choose to become the kind of person who does this, one decision at a time.', hint: 'James Clear: "Every action is a vote for the type of person you want to become."' },
      { fixed: 'Some people are just naturally better.', growth: 'Natural ability gives a head start, not a ceiling. Deliberate practice is the equalizer.', hint: 'K. Anders Ericsson\u2019s research: expertise requires ~10,000 hours regardless of initial talent.' },
    ]
  };

  // Famous "Yet" Stories — real people who persisted
  var YET_STORIES = {
    elementary: [
      { name: 'Thomas Edison', emoji: '\uD83D\uDCA1', area: 'Inventing', story: 'Thomas Edison tried over 1,000 different materials before finding one that worked for the light bulb. When a reporter asked how it felt to fail 1,000 times, he said: "I didn\u2019t fail 1,000 times. The light bulb was an invention with 1,000 steps."', lesson: 'Every attempt taught him something. Failure was part of the invention.' },
      { name: 'J.K. Rowling', emoji: '\uD83D\uDCDA', area: 'Writing', story: 'Before Harry Potter became the most famous book series in the world, 12 different publishers said "no thank you." J.K. Rowling was a single mom with very little money. She kept sending her book out because she believed in the story.', lesson: 'Twelve "no"s before one "yes" that changed the world.' },
      { name: 'Michael Jordan', emoji: '\uD83C\uDFC0', area: 'Sports', story: 'Michael Jordan was cut from his high school basketball team. He went home, locked himself in his room, and cried. Then he practiced harder than anyone. He said: "I\u2019ve missed more than 9,000 shots. I\u2019ve failed over and over. And that is why I succeed."', lesson: 'The greatest basketball player ever was once told he wasn\u2019t good enough.' },
      { name: 'Bethany Hamilton', emoji: '\uD83C\uDFC4', area: 'Surfing', story: 'Bethany Hamilton lost her arm in a shark attack when she was 13. Everyone thought she\u2019d never surf again. One month later, she was back on her board. She went on to become a professional surfer and champion.', lesson: 'She didn\u2019t let the hardest thing that ever happened to her define what she could do.' },
      { name: 'Albert Einstein', emoji: '\uD83E\uDDEA', area: 'Science', story: 'Albert Einstein didn\u2019t speak until he was 4 years old. His teachers said he was "slow." He failed his first college entrance exam. He became the most famous scientist in history and changed how we understand the universe.', lesson: 'Starting slow doesn\u2019t mean finishing slow.' },
    ],
    middle: [
      { name: 'Oprah Winfrey', emoji: '\uD83C\uDF1F', area: 'Media', story: 'Oprah was told she was "unfit for television" and fired from her first TV job. She grew up in poverty and faced severe adversity. She went on to build a media empire and became one of the most influential people in history.', lesson: 'Someone else\u2019s assessment of you is not your destiny.' },
      { name: 'Walt Disney', emoji: '\uD83C\uDFA8', area: 'Animation', story: 'Walt Disney was fired from a newspaper for "lacking imagination and having no good ideas." His first animation company went bankrupt. He was rejected 302 times trying to get financing for Disney World. Today, Disney is worth $130 billion.', lesson: '302 rejections. One "yes." That\u2019s all it took.' },
      { name: 'Malala Yousafzai', emoji: '\uD83D\uDCDA', area: 'Education', story: 'Malala was shot by the Taliban for advocating girls\u2019 education. She survived, continued her activism, and won the Nobel Peace Prize at age 17 \u2014 the youngest person ever. She said: "One child, one teacher, one book, and one pen can change the world."', lesson: 'The greatest obstacles sometimes produce the greatest advocates.' },
      { name: 'Stephen Hawking', emoji: '\uD83C\uDF0C', area: 'Physics', story: 'Stephen Hawking was diagnosed with ALS at 21 and told he had two years to live. He lived to 76, became one of the greatest physicists ever, wrote "A Brief History of Time," and proved that a body\u2019s limitations don\u2019t limit a mind.', lesson: 'He didn\u2019t have a growth mindset about his body. He had one about his mind.' },
      { name: 'Lin-Manuel Miranda', emoji: '\uD83C\uDFB5', area: 'Theater', story: 'Lin-Manuel Miranda spent 7 years writing Hamilton. Seven years of rewriting, doubt, and revision. He read a biography on vacation, had an idea, and then did the unglamorous work of turning that spark into the most celebrated musical of a generation.', lesson: 'Inspiration is a moment. Creation is seven years of work.' },
    ],
    high: [
      { name: 'Marie Curie', emoji: '\u2622\uFE0F', area: 'Science', story: 'Marie Curie was denied admission to the University of Krak\u00F3w because she was a woman. She moved to Paris, lived in a freezing attic, and studied physics. She became the first woman to win a Nobel Prize \u2014 and the first person to win two in different sciences.', lesson: 'When the institution said no, she changed the institution.' },
      { name: 'Vincent van Gogh', emoji: '\uD83C\uDFA8', area: 'Art', story: 'Van Gogh sold only one painting in his entire lifetime. He was rejected by art schools, fired from jobs, and struggled with mental illness. Today his paintings sell for $100+ million each. He once wrote: "If you hear a voice within you say \u2018you cannot paint,\u2019 then by all means paint, and that voice will be silenced."', lesson: 'The market\u2019s opinion and the work\u2019s value are two different things.' },
      { name: 'Vera Wang', emoji: '\uD83D\uDC57', area: 'Fashion', story: 'Vera Wang failed to make the U.S. Olympic figure skating team. She then worked as a Vogue editor for 15 years but was passed over for the editor-in-chief position. At 40, most people would have settled. She started her own fashion company. She was 40.', lesson: 'Your Plan A failing doesn\u2019t mean your story is over. Sometimes Plan C is the masterpiece.' },
      { name: 'Abraham Lincoln', emoji: '\uD83C\uDFDB\uFE0F', area: 'Leadership', story: 'Lost his job, lost 8 elections, had a nervous breakdown, lost his fianc\u00E9e to illness. He failed publicly and repeatedly for 30 years. Then he became President and held a nation together through its greatest crisis. His persistence wasn\u2019t stubbornness \u2014 it was conviction.', lesson: 'A resume of failures can precede the most consequential success in history.' },
      { name: 'Tu Youyou', emoji: '\uD83C\uDF3F', area: 'Medicine', story: 'Tu Youyou spent decades researching ancient Chinese medical texts for a malaria cure, enduring failed experiment after failed experiment. She tested the drug on herself first. Her discovery of artemisinin has saved millions of lives. She won the Nobel Prize at 84.', lesson: 'Sometimes the breakthrough comes after decades of quiet, unglamorous work.' },
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Tool Registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('growthmindset', {
    icon: '\uD83C\uDF31',
    label: 'Growth Mindset Workshop',
    desc: 'Discover how your brain grows through effort \u2014 learn to transform "I can\u2019t" into "I can\u2019t yet."',
    color: 'emerald',
    category: 'self-management',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var band = ctx.gradeBand || 'elementary';

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.growthmindset) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('growthmindset', key); }
        else { if (ctx.update) ctx.update('growthmindset', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'brain';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Brain Science state
      var brainFactIdx  = d.brainFactIdx || 0;
      var brainExplored = d.brainExplored || {};

      // Reframe state
      var reframeIdx    = d.reframeIdx || 0;
      var reframeInput  = d.reframeInput || '';
      var reframeRevealed = d.reframeRevealed || false;
      var reframeScore  = d.reframeScore || 0;
      var reframeTotal  = d.reframeTotal || 0;

      // Yet Stories state
      var storyIdx      = d.storyIdx || 0;
      var storiesRead   = d.storiesRead || {};

      // Growth Map state
      var growthGoals   = d.growthGoals || [];
      var newGoalText   = d.newGoalText || '';

      // AI Coach state
      var coachInput    = d.coachInput || '';
      var coachResponse = d.coachResponse || '';
      var coachLoading  = d.coachLoading || false;
      var coachHistory  = d.coachHistory || [];

      // Letter to Future Me state
      var savedLetters   = d.savedLetters || [];
      var letterDraft    = d.letterDraft || '';

      // Stats
      var totalReframes = reframeScore || 0;
      var totalStories  = Object.keys(storiesRead || {}).length;
      var totalFacts    = Object.keys(brainExplored || {}).length;

      // Colors
      var EMERALD = '#059669';
      var EMERALD_LIGHT = '#ecfdf5';
      var EMERALD_DARK = '#064e3b';
      var AMBER = '#d97706';

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var TABS = [
        { id: 'brain',    icon: '\uD83E\uDDE0', label: 'Brain Science' },
        { id: 'reframe',  icon: '\uD83D\uDD04', label: 'Reframe It' },
        { id: 'stories',  icon: '\uD83C\uDF1F', label: 'Yet Stories' },
        { id: 'map',      icon: '\uD83D\uDDFA\uFE0F', label: 'My Growth Map' },
        { id: 'coach',    icon: '\uD83E\uDD16', label: 'AI Coach' },
        { id: 'letter',   icon: '\u2709\uFE0F', label: 'Future Me' },
        { id: 'educator', icon: '\uD83C\uDFEB', label: 'Educator Lens' },
      ];

      // Count explored tabs for progress
      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) {
        var newExplored = Object.assign({}, exploredTabs);
        newExplored[activeTab] = true;
        upd('exploredTabs', newExplored);
      }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #d1fae5', background: 'linear-gradient(180deg, #f0fdf4, #ecfdf5)', flexShrink: 0 }
      },
        // Progress bar
        h('div', { style: { height: '3px', background: '#e2e8f0', position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + EMERALD + ', #34d399)', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0', animation: 'selGrowBar 0.6s ease-out' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' },
          role: 'tablist', 'aria-label': 'Growth Mindset sections'
        },
          TABS.map(function(t, ti) {
            var active = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', {
              key: t.id,
              className: 'sel-tab' + (active ? ' sel-tab-active' : ''),
              role: 'tab', 'aria-selected': active ? 'true' : 'false',
              onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
              style: {
                padding: '6px 14px', borderRadius: '10px', border: active ? 'none' : '1px solid ' + (explored ? '#a7f3d0' : 'transparent'),
                background: active ? 'linear-gradient(135deg, ' + EMERALD + ', #047857)' : explored ? 'rgba(5,150,105,0.08)' : 'transparent',
                color: active ? '#fff' : explored ? '#065f46' : '#94a3b8',
                fontWeight: active ? 700 : 500, fontSize: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                whiteSpace: 'nowrap',
                boxShadow: active ? '0 3px 12px rgba(5,150,105,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
                position: 'relative'
              }
            },
              h('span', { className: active ? 'sel-hero-icon' : '', 'aria-hidden': 'true', style: { fontSize: active ? '14px' : '12px' } }, t.icon),
              t.label,
              explored && !active ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', marginLeft: '2px', flexShrink: 0 } }) : null
            );
          }),
          // Progress badge
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: EMERALD, fontWeight: 700, whiteSpace: 'nowrap', background: '#d1fae5', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } },
            exploredCount + '/' + TABS.length
          ),
          // Sound toggle
          h('button', {
            onClick: function() { upd('soundEnabled', !soundEnabled); },
            className: 'sel-btn',
            'aria-label': soundEnabled ? 'Mute sounds' : 'Enable sounds',
            style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 }
          }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        )
      );

      // ══════════════════════════════════════════════════════════
      // ── Section: Brain Science ──
      // ══════════════════════════════════════════════════════════
      var brainContent = null;
      if (activeTab === 'brain') {
        var facts = BRAIN_FACTS[band] || BRAIN_FACTS.elementary;
        var currentFact = facts[brainFactIdx % facts.length];

        brainContent = h('div', { className: 'sel-hero', style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          // Hero section with visual brain illustration
          h('div', { style: { textAlign: 'center', marginBottom: '20px', position: 'relative' } },
            // Decorative neural network dots
            h('div', { style: { position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '80px', pointerEvents: 'none', opacity: 0.3 } },
              [0,1,2,3,4,5].map(function(i) {
                return h('div', { key: 'n'+i, style: {
                  position: 'absolute',
                  left: (20 + Math.sin(i * 1.2) * 40 + 50) + '%',
                  top: (10 + Math.cos(i * 0.8) * 30 + 20) + '%',
                  width: (4 + i % 3 * 2) + 'px', height: (4 + i % 3 * 2) + 'px',
                  borderRadius: '50%', background: EMERALD,
                  animation: 'selSparkle ' + (1.5 + i * 0.3) + 's ease-in-out infinite',
                  animationDelay: (i * 0.2) + 's'
                }});
              })
            ),
            h('div', { className: 'sel-hero-icon', style: { fontSize: '56px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(5,150,105,0.3))' } }, '\uD83E\uDDE0'),
            h('h3', { style: { fontSize: '20px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 6px', letterSpacing: '-0.3px' } }, 'Your Brain is Amazing'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' } },
              band === 'elementary' ? 'Discover how your brain grows stronger every day!'
              : band === 'middle' ? 'The neuroscience behind why effort changes your brain.'
              : 'How mindset research is reshaping our understanding of human potential.')
          ),
          // Fact card with enhanced visuals
          h('div', {
            className: 'sel-card',
            key: 'fact-' + brainFactIdx, // Re-triggers animation on change
            style: {
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
              borderRadius: '20px', padding: '28px', border: '2px solid #6ee7b7',
              boxShadow: '0 8px 32px rgba(5,150,105,0.12), 0 2px 8px rgba(5,150,105,0.08)',
              marginBottom: '16px', position: 'relative', overflow: 'hidden'
            }
          },
            // Shimmer overlay
            h('div', { className: 'sel-shimmer', style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '20px', pointerEvents: 'none' } }),
            h('div', { style: { position: 'relative', zIndex: 1 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } },
                h('div', { style: { fontSize: '36px', background: 'rgba(255,255,255,0.6)', borderRadius: '14px', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } }, currentFact.emoji),
                h('div', null,
                  h('h4', { style: { fontSize: '17px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 2px' } }, currentFact.title),
                  h('div', { style: { fontSize: '10px', color: EMERALD, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' } }, 'Fact ' + (brainFactIdx % facts.length + 1) + ' of ' + facts.length)
                )
              ),
              h('p', { style: { fontSize: '14px', lineHeight: 1.8, color: '#1f2937', margin: 0 } }, currentFact.text)
            )
          ),
          // Navigation
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' } },
            h('button', {
              className: 'sel-btn',
              onClick: function() {
                var prev = (brainFactIdx - 1 + facts.length) % facts.length;
                upd({ brainFactIdx: prev, brainExplored: Object.assign({}, brainExplored, (function() { var o = {}; o[prev] = true; return o; })()) });
                if (soundEnabled) sfxNeuron();
              },
              style: { padding: '10px 20px', background: '#fff', border: '2px solid #a7f3d0', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: EMERALD, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
            }, '\u2190 Previous'),
            h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '12px', color: '#94a3b8', fontWeight: 600, background: '#f0fdf4', padding: '4px 12px', borderRadius: '8px' } },
              (brainFactIdx % facts.length + 1) + ' / ' + facts.length
            ),
            h('button', {
              className: 'sel-btn',
              onClick: function() {
                var next = (brainFactIdx + 1) % facts.length;
                upd({ brainFactIdx: next, brainExplored: Object.assign({}, brainExplored, (function() { var o = {}; o[next] = true; return o; })()) });
                if (soundEnabled) sfxNeuron();
                if (Object.keys(Object.assign({}, brainExplored, (function() { var o = {}; o[next] = true; return o; })())).length >= facts.length) {
                  if (awardXP) awardXP(15, 'Explored all Brain Science facts!');
                }
              },
              style: { padding: '10px 20px', background: 'linear-gradient(135deg, ' + EMERALD + ', #047857)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#fff', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }
            }, 'Next \u2192')
          ),
          // Progress dots
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '6px' } },
            facts.map(function(f, i) {
              var explored = !!brainExplored[i];
              var current = i === brainFactIdx % facts.length;
              return h('div', {
                key: i, role: 'button', tabIndex: 0,
                'aria-label': 'Fact ' + (i + 1) + ' of ' + facts.length + (explored ? ' (explored)' : '') + (current ? ' (current)' : ''),
                onClick: function() { upd({ brainFactIdx: i, brainExplored: Object.assign({}, brainExplored, (function() { var o = {}; o[i] = true; return o; })()) }); },
                onKeyDown: function(ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); upd({ brainFactIdx: i, brainExplored: Object.assign({}, brainExplored, (function() { var o = {}; o[i] = true; return o; })()) }); } },
                className: 'sel-progress-dot',
                style: {
                  width: current ? '28px' : explored ? '12px' : '10px', height: current ? '12px' : '10px',
                  borderRadius: '6px', cursor: 'pointer',
                  background: current ? 'linear-gradient(135deg, ' + EMERALD + ', #34d399)' : explored ? '#6ee7b7' : '#e5e7eb',
                  boxShadow: current ? '0 2px 8px rgba(5,150,105,0.4)' : 'none'
                }
              });
            })
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: Reframe Engine ──
      // ══════════════════════════════════════════════════════════
      var reframeContent = null;
      if (activeTab === 'reframe') {
        var reframes = REFRAMES[band] || REFRAMES.elementary;
        var current = reframes[reframeIdx % reframes.length];

        reframeContent = h('div', { className: 'sel-hero', style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(5,150,105,0.3))' } }, '\uD83D\uDD04'),
            h('h3', { style: { fontSize: '20px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 6px', letterSpacing: '-0.3px' } }, 'The Reframe Engine'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Transform fixed mindset thoughts into growth mindset power.')
          ),
          // Score with visual progress ring
          reframeTotal > 0 && h('div', { className: 'sel-card', style: { display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '20px' } },
            h('div', { style: { background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: '14px', padding: '10px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(5,150,105,0.1)' } },
              h('div', { style: { fontSize: '24px', fontWeight: 800, color: EMERALD } }, reframeScore),
              h('div', { style: { fontSize: '9px', color: '#065f46', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'reframed')
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', fontSize: '24px', color: '#d1d5db' } }, '/'),
            h('div', { style: { background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '14px', padding: '10px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(217,119,6,0.1)' } },
              h('div', { style: { fontSize: '24px', fontWeight: 800, color: AMBER } }, reframeTotal),
              h('div', { style: { fontSize: '9px', color: '#92400e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'attempted')
            )
          ),
          // Fixed mindset thought — dramatic red card with visual weight
          h('div', {
            className: 'sel-card',
            key: 'fixed-' + reframeIdx,
            style: {
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '2px solid #fca5a5',
              borderRadius: '20px', padding: '24px', marginBottom: '14px', position: 'relative',
              boxShadow: '0 4px 16px rgba(220,38,38,0.1)'
            }
          },
            // Visual "thought cloud" connector
            h('div', { style: { position: 'absolute', top: '-10px', left: '24px' } },
              h('div', { style: { width: '20px', height: '20px', borderRadius: '50%', background: '#fef2f2', border: '2px solid #fca5a5' } }),
              h('div', { style: { width: '10px', height: '10px', borderRadius: '50%', background: '#fef2f2', border: '1.5px solid #fca5a5', position: 'absolute', top: '-8px', left: '6px' } })
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
              h('div', { style: { fontSize: '20px', background: 'rgba(220,38,38,0.1)', borderRadius: '8px', padding: '4px 8px' } }, '\uD83D\uDED1'),
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.1em' } }, 'Fixed Mindset Thought')
            ),
            h('p', { style: { fontSize: '17px', fontWeight: 700, color: '#7f1d1d', margin: 0, fontStyle: 'italic', lineHeight: 1.5 } }, '\u201C' + current.fixed + '\u201D')
          ),
          // Transformation arrow
          !reframeRevealed && h('div', { style: { textAlign: 'center', margin: '4px 0', fontSize: '24px', color: '#d1d5db' } }, '\u2193'),
          // Input area with enhanced styling
          !reframeRevealed && h('div', { style: { marginBottom: '12px' } },
            h('label', { style: { fontSize: '12px', fontWeight: 700, color: EMERALD_DARK, display: 'block', marginBottom: '6px' } }, '\u2728 How would you reframe this with a growth mindset?'),
            h('textarea', {
              value: reframeInput,
              onChange: function(ev) { upd('reframeInput', ev.target.value); },
              placeholder: 'Type your growth mindset version...',
              'aria-label': 'Reframe the fixed mindset thought',
              style: { width: '100%', border: '2px solid #6ee7b7', borderRadius: '14px', padding: '14px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', minHeight: '70px', boxSizing: 'border-box', background: '#f0fdf4', transition: 'border-color 0.2s, box-shadow 0.2s' }
            }),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' } },
              h('button', {
                className: 'sel-btn',
                onClick: function() {
                  upd({ reframeRevealed: true, reframeTotal: reframeTotal + 1, reframeScore: reframeInput.trim() ? reframeScore + 1 : reframeScore });
                  if (soundEnabled) sfxReframe();
                  if (reframeInput.trim() && awardXP) awardXP(10, 'Reframed a fixed mindset thought!');
                  if (announceToSR) announceToSR('Growth mindset reframe revealed');
                },
                style: { padding: '10px 24px', background: 'linear-gradient(135deg, ' + EMERALD + ', #047857)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }
              }, '\u2728 Show Growth Version'),
              h('p', { style: { fontSize: '11px', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' } }, '\uD83D\uDCA1 ', h('em', null, current.hint))
            )
          ),
          // Revealed growth mindset version
          reframeRevealed && h('div', null,
            reframeInput.trim() && h('div', { style: { background: '#eff6ff', border: '2px solid #93c5fd', borderRadius: '12px', padding: '14px', marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 600, color: '#2563eb', marginBottom: '4px' } }, '\uD83D\uDCAD Your reframe:'),
              h('p', { style: { fontSize: '14px', color: '#1e3a8a', margin: 0, fontStyle: 'italic' } }, '"' + reframeInput + '"')
            ),
            h('div', { style: { background: EMERALD_LIGHT, border: '2px solid #6ee7b7', borderRadius: '16px', padding: '20px', marginBottom: '12px', position: 'relative' } },
              h('div', { style: { position: 'absolute', top: '-12px', left: '20px', background: EMERALD_LIGHT, border: '2px solid #6ee7b7', borderBottom: 'none', borderRight: 'none', borderRadius: '8px 0 0 0', width: '20px', height: '12px', transform: 'rotate(45deg)' } }),
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: EMERALD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, '\uD83C\uDF31 Growth Mindset Version'),
              h('p', { style: { fontSize: '16px', fontWeight: 700, color: EMERALD_DARK, margin: 0 } }, '"' + current.growth + '"')
            ),
            h('button', {
              onClick: function() {
                var next = (reframeIdx + 1) % reframes.length;
                upd({ reframeIdx: next, reframeInput: '', reframeRevealed: false });
              },
              style: { padding: '10px 24px', background: EMERALD, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'block', margin: '0 auto' }
            }, 'Next Challenge \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: Yet Stories ──
      // ══════════════════════════════════════════════════════════
      var storiesContent = null;
      if (activeTab === 'stories') {
        var stories = YET_STORIES[band] || YET_STORIES.elementary;
        var currentStory = stories[storyIdx % stories.length];

        storiesContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83C\uDF1F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'The Power of Yet'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Real people who didn\u2019t give up \u2014 and changed the world.')
          ),
          // Story card
          h('div', { style: { background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '16px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } },
              h('div', { style: { fontSize: '36px' } }, currentStory.emoji),
              h('div', null,
                h('h4', { style: { fontSize: '16px', fontWeight: 800, color: '#1f2937', margin: 0 } }, currentStory.name),
                h('div', { style: { fontSize: '11px', color: EMERALD, fontWeight: 600 } }, currentStory.area)
              )
            ),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#374151', margin: '0 0 14px' } }, currentStory.story),
            h('div', { style: { background: '#fef9c3', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #f59e0b' } },
              h('p', { style: { fontSize: '13px', fontWeight: 600, color: '#92400e', margin: 0 } }, '\uD83D\uDCA1 ' + currentStory.lesson)
            )
          ),
          // Navigation
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', {
              onClick: function() {
                var prev = (storyIdx - 1 + stories.length) % stories.length;
                upd({ storyIdx: prev, storiesRead: Object.assign({}, storiesRead, (function() { var o = {}; o[prev] = true; return o; })()) });
                if (soundEnabled) sfxGrow();
              },
              style: { padding: '8px 16px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#374151' }
            }, '\u2190 Previous'), // a11y: label set via visible text
            h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '12px', color: '#94a3b8' } },
              (storyIdx % stories.length + 1) + ' / ' + stories.length +
              ' \u00b7 ' + totalStories + ' read'
            ),
            h('button', {
              onClick: function() {
                var next = (storyIdx + 1) % stories.length;
                upd({ storyIdx: next, storiesRead: Object.assign({}, storiesRead, (function() { var o = {}; o[next] = true; return o; })()) });
                if (soundEnabled) sfxGrow();
                if (Object.keys(Object.assign({}, storiesRead, (function() { var o = {}; o[next] = true; return o; })())).length >= stories.length) {
                  if (awardXP) awardXP(20, 'Read all Yet Stories!');
                }
              },
              style: { padding: '8px 16px', background: EMERALD, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff' }
            }, 'Next Story \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: My Growth Map ──
      // ══════════════════════════════════════════════════════════
      var mapContent = null;
      if (activeTab === 'map') {
        mapContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83D\uDDFA\uFE0F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'My Growth Map'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Set goals using "I can\u2019t... YET" framing. Track your growth journey.')
          ),
          // Add goal form
          h('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '3px' } }, 'I can\u2019t __________ YET.'),
              h('input', {
                type: 'text', value: newGoalText,
                onChange: function(ev) { upd('newGoalText', ev.target.value); },
                onKeyDown: function(ev) {
                  if (ev.key === 'Enter' && newGoalText.trim()) {
                    var goal = { id: Date.now().toString(), text: newGoalText.trim(), createdAt: Date.now(), steps: [], reflection: '' };
                    upd({ growthGoals: [goal].concat(growthGoals), newGoalText: '' });
                    if (soundEnabled) sfxGrow();
                    if (awardXP) awardXP(5, 'Set a growth goal!');
                  }
                },
                placeholder: band === 'elementary' ? 'e.g. do long division' : band === 'middle' ? 'e.g. write a persuasive essay' : 'e.g. solve differential equations',
                'aria-label': 'New growth goal',
                style: { width: '100%', border: '2px solid #a7f3d0', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
              })
            ),
            h('button', {
              onClick: function() {
                if (!newGoalText.trim()) return;
                var goal = { id: Date.now().toString(), text: newGoalText.trim(), createdAt: Date.now(), steps: [], reflection: '' };
                upd({ growthGoals: [goal].concat(growthGoals), newGoalText: '' });
                if (soundEnabled) sfxGrow();
                if (awardXP) awardXP(5, 'Set a growth goal!');
              },
              disabled: !newGoalText.trim(),
              style: { padding: '10px 16px', background: newGoalText.trim() ? EMERALD : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: newGoalText.trim() ? 'pointer' : 'not-allowed', fontSize: '13px', alignSelf: 'flex-end' }
            }, '\uD83C\uDF31 Plant Goal')
          ),
          // Goal list
          growthGoals.length === 0
            ? h('div', { style: { textAlign: 'center', padding: '30px', color: '#94a3b8' } },
                h('div', { style: { fontSize: '32px', marginBottom: '8px' } }, '\uD83C\uDF3F'),
                h('p', { style: { fontSize: '13px' } }, 'No goals planted yet. What can\u2019t you do YET?')
              )
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                growthGoals.map(function(goal) {
                  var daysSince = Math.floor((Date.now() - goal.createdAt) / (24 * 60 * 60 * 1000));
                  var stepsCount = (goal.steps || []).length;
                  return h('div', {
                    key: goal.id,
                    style: { background: '#fff', border: '2px solid #d1fae5', borderRadius: '14px', padding: '16px', transition: 'border-color 0.15s' }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
                      h('div', null,
                        h('span', { style: { fontSize: '14px', fontWeight: 700, color: '#1f2937' } }, 'I can\u2019t '),
                        h('span', { style: { fontSize: '14px', fontWeight: 700, color: EMERALD, textDecoration: 'underline', textDecorationColor: '#a7f3d0' } }, goal.text),
                        h('span', { style: { fontSize: '14px', fontWeight: 700, color: '#1f2937' } }, ' '),
                        h('span', { style: { fontSize: '14px', fontWeight: 800, color: AMBER, background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' } }, 'YET')
                      ),
                      h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                        h('span', { style: { fontSize: '10px', color: '#94a3b8' } }, daysSince === 0 ? 'today' : daysSince + 'd ago'),
                        h('button', {
                          onClick: function() { upd('growthGoals', growthGoals.filter(function(g) { return g.id !== goal.id; })); },
                          'aria-label': 'Remove goal', style: { background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', color: '#991b1b', fontSize: '12px', padding: '2px 4px' }
                        }, '\u2715')
                      )
                    ),
                    // Steps I've taken
                    h('div', { style: { fontSize: '11px', color: '#94a3b8', marginBottom: '4px' } },
                      '\uD83D\uDC63 Steps I\u2019ve taken (' + stepsCount + '):'
                    ),
                    (goal.steps || []).map(function(step, si) {
                      return h('div', { key: si, style: { fontSize: '12px', color: '#374151', padding: '2px 0 2px 16px', borderLeft: '2px solid #a7f3d0' } },
                        '\u2713 ' + step
                      );
                    }),
                    h('div', { style: { display: 'flex', gap: '6px', marginTop: '6px' } },
                      h('input', {
                        type: 'text',
                        placeholder: 'Add a step you took toward this goal...',
                        'aria-label': 'Add growth step',
                        onKeyDown: function(ev) {
                          if (ev.key === 'Enter' && ev.target.value.trim()) {
                            var step = ev.target.value.trim();
                            var updated = growthGoals.map(function(g) {
                              return g.id === goal.id ? Object.assign({}, g, { steps: (g.steps || []).concat([step]) }) : g;
                            });
                            upd('growthGoals', updated);
                            ev.target.value = '';
                            if (soundEnabled) sfxComplete();
                            if (awardXP) awardXP(5, 'Recorded a growth step!');
                          }
                        },
                        style: { flex: 1, border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontFamily: 'inherit' }
                      })
                    )
                  );
                })
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: AI Growth Coach ──
      // ══════════════════════════════════════════════════════════
      var coachContent = null;
      if (activeTab === 'coach') {
        var hasSafetyLayer = window.SelHub && window.SelHub.hasCoachConsent;
        var hasConsent = hasSafetyLayer ? window.SelHub.hasCoachConsent() : true;
        if (hasSafetyLayer && !hasConsent) {
          coachContent = window.SelHub.renderConsentScreen(h, band, function() {
            window.SelHub.giveCoachConsent();
            upd('_consentRefresh', Date.now());
          });
        } else {
        coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83E\uDD16'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'AI Growth Coach'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Share a struggle or a fixed mindset thought. Your coach will help you reframe it. Conversations are monitored for your safety.')
          ),
          // Chat history
          coachHistory.length > 0 && h('div', { role: 'log', 'aria-label': 'Conversation with Growth Coach', 'aria-live': 'polite', style: { maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
            coachHistory.map(function(msg, i) {
              var isUser = msg.role === 'user';
              return h('div', { key: i, style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' } },
                h('div', { style: {
                  maxWidth: '80%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isUser ? '#eff6ff' : EMERALD_LIGHT,
                  border: '1px solid ' + (isUser ? '#bfdbfe' : '#a7f3d0'),
                  fontSize: '13px', lineHeight: 1.6, color: '#1f2937'
                } },
                  !isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: EMERALD, marginBottom: '4px' } }, '\uD83C\uDF31 Growth Coach'),
                  msg.text
                )
              );
            })
          ),
          // Input
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('input', {
              type: 'text', value: coachInput,
              onChange: function(ev) { upd('coachInput', ev.target.value); },
              onKeyDown: function(ev) {
                if (ev.key === 'Enter' && coachInput.trim() && !coachLoading && callGemini) {
                  var userMsg = coachInput.trim();
                  var newHistory = (coachHistory || []).concat([{ role: 'user', text: userMsg }]);
                  upd({ coachHistory: newHistory, coachInput: '', coachLoading: true });

                  var prompt = 'You are a warm, encouraging growth mindset coach for a ' + band + ' school student. '
                    + 'The student said: "' + userMsg + '"\n\n'
                    + 'Respond with:\n'
                    + '1. Acknowledge their feeling (1 sentence)\n'
                    + '2. Reframe with growth mindset (1-2 sentences)\n'
                    + '3. A specific, actionable suggestion (1 sentence)\n\n'
                    + 'Be warm, concise, and age-appropriate. Use "you" not "one." '
                    + 'Reference neuroplasticity naturally. Max 3-4 sentences total.';

                  var safeSend = (window.SelHub && window.SelHub.safeCoach) ? function() {
                    return window.SelHub.safeCoach({
                      studentMessage: userMsg,
                      coachPrompt: prompt,
                      toolId: 'growthmindset',
                      band: band,
                      callGemini: callGemini,
                      codename: ctx.studentCodename || 'student',
                      conversationHistory: newHistory,
                      onSafetyFlag: onSafetyFlag
                    });
                  } : function() {
                    return callGemini(prompt, true).then(function(r) { return { response: r, tier: 0, showCrisis: false }; });
                  };
                  safeSend().then(function(result) {
                    upd({
                      coachHistory: newHistory.concat([{ role: 'coach', text: result.response }]),
                      coachLoading: false
                    });
                    if (awardXP) awardXP(5, 'Talked with Growth Coach!');
                  }).catch(function() {
                    upd({
                      coachHistory: newHistory.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting right now, but remember: the fact that you\u2019re here, thinking about this, already shows a growth mindset. What you\u2019re struggling with is proof that you\u2019re reaching for something beyond your current ability \u2014 and that\u2019s exactly how growth works.' }]),
                      coachLoading: false
                    });
                  });
                }
              },
              disabled: coachLoading || !callGemini,
              placeholder: coachLoading ? 'Thinking...' : 'Tell me what you\u2019re struggling with...',
              'aria-label': 'Message the growth coach',
              style: { flex: 1, border: '2px solid #a7f3d0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
            }),
            h('button', {
              onClick: function() {
                if (!coachInput.trim() || coachLoading || !callGemini) return;
                // Trigger same logic as Enter key
                var ev = { key: 'Enter', target: {} };
                // For simplicity, duplicate the logic inline
                var userMsg = coachInput.trim();
                var newHistory = (coachHistory || []).concat([{ role: 'user', text: userMsg }]);
                upd({ coachHistory: newHistory, coachInput: '', coachLoading: true });

                var prompt = 'You are a warm, encouraging growth mindset coach for a ' + band + ' school student. '
                  + 'The student said: "' + userMsg + '"\n\n'
                  + 'Respond with:\n'
                  + '1. Acknowledge their feeling (1 sentence)\n'
                  + '2. Reframe with growth mindset (1-2 sentences)\n'
                  + '3. A specific, actionable suggestion (1 sentence)\n\n'
                  + 'Be warm, concise, and age-appropriate. Use "you" not "one." '
                  + 'Reference neuroplasticity naturally. Max 3-4 sentences total.';

                var safeSend = (window.SelHub && window.SelHub.safeCoach) ? function() {
                  return window.SelHub.safeCoach({
                    studentMessage: userMsg,
                    coachPrompt: prompt,
                    toolId: 'growthmindset',
                    band: band,
                    callGemini: callGemini,
                    codename: ctx.studentCodename || 'student',
                    conversationHistory: newHistory,
                    onSafetyFlag: onSafetyFlag
                  });
                } : function() {
                  return callGemini(prompt, true).then(function(r) { return { response: r, tier: 0, showCrisis: false }; });
                };
                safeSend().then(function(result) {
                  upd({
                    coachHistory: newHistory.concat([{ role: 'coach', text: result.response }]),
                    coachLoading: false
                  });
                  if (awardXP) awardXP(5, 'Talked with Growth Coach!');
                }).catch(function() {
                  upd({
                    coachHistory: newHistory.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting right now. But here\u2019s what I know: you showed up. You\u2019re thinking about how to grow. That already puts you ahead.' }]),
                    coachLoading: false
                  });
                });
              },
              disabled: coachLoading || !coachInput.trim() || !callGemini,
              style: { padding: '10px 16px', background: coachInput.trim() && !coachLoading ? EMERALD : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'not-allowed', fontSize: '13px' }
            }, coachLoading ? '\u23F3' : '\u2728 Send')
          ),
          // Starter prompts
          coachHistory.length === 0 && h('div', { style: { marginTop: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' } }, 'Try saying:'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              [
                band === 'elementary' ? 'I\u2019m bad at math' : band === 'middle' ? 'I\u2019ll never be good at writing' : 'I\u2019m not smart enough for this class',
                band === 'elementary' ? 'Everyone else is smarter than me' : band === 'middle' ? 'I failed and I want to give up' : 'I don\u2019t see the point of trying',
                band === 'elementary' ? 'I can\u2019t read as fast as my friends' : band === 'middle' ? 'My teacher thinks I\u2019m dumb' : 'I\u2019m afraid of failing in front of everyone',
              ].map(function(prompt) {
                return h('button', {
                  key: prompt,
                  'aria-label': 'Use starter prompt: ' + prompt,
                  onClick: function() { upd('coachInput', prompt); },
                  style: { padding: '5px 10px', background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: EMERALD_DARK, fontWeight: 500 }
                }, prompt);
              })
            )
          )
        );
        } // end else (hasConsent)
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: Letter to Future Me ──
      // ══════════════════════════════════════════════════════════
      var letterContent = null;
      if (activeTab === 'letter') {
        var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var today = new Date();
        var dateStr = monthNames[today.getMonth()] + ' ' + today.getDate() + ', ' + today.getFullYear();

        letterContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\u2709\uFE0F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'Letter to Future Me'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } },
              band === 'elementary' ? 'Write a letter to yourself. One day you\u2019ll read it and see how much you\u2019ve grown!'
              : 'Document where you are right now. Your future self will read this and see the distance traveled.')
          ),
          // Writing area
          h('div', { style: { background: '#fffbeb', borderRadius: '16px', padding: '20px', border: '2px solid #fde68a', marginBottom: '16px' } },
            h('div', { style: { fontSize: '12px', color: '#92400e', fontWeight: 600, marginBottom: '4px' } }, dateStr),
            h('div', { style: { fontSize: '13px', color: '#92400e', fontStyle: 'italic', marginBottom: '12px' } }, 'Dear Future Me,'),
            h('textarea', {
              value: letterDraft,
              onChange: function(ev) { upd('letterDraft', ev.target.value); },
              placeholder: band === 'elementary'
                ? 'Right now I\u2019m learning about... The hardest thing for me is... But I know that if I keep trying...'
                : band === 'middle'
                ? 'Here\u2019s what I\u2019m working on right now... What\u2019s hard for me is... What I want you (future me) to remember is...'
                : 'Where I am right now... What I\u2019m struggling with... What I\u2019m choosing to believe about my ability to grow...',
              'aria-label': 'Write a letter to your future self',
              style: { width: '100%', border: 'none', background: 'transparent', fontSize: '14px', fontFamily: 'Georgia, serif', lineHeight: 1.8, color: '#78350f', resize: 'vertical', minHeight: '120px', boxSizing: 'border-box', outline: 'none' }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } },
              h('button', {
                onClick: function() {
                  if (!letterDraft.trim()) return;
                  var letter = { id: Date.now().toString(), text: letterDraft.trim(), date: dateStr, timestamp: Date.now() };
                  upd({ savedLetters: [letter].concat(savedLetters), letterDraft: '' });
                  if (soundEnabled) sfxGrow();
                  if (awardXP) awardXP(15, 'Wrote a letter to your future self!');
                  if (announceToSR) announceToSR('Letter saved');
                },
                disabled: !letterDraft.trim(),
                'aria-label': 'Seal and save this letter',
                style: { padding: '8px 18px', background: letterDraft.trim() ? '#b45309' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: letterDraft.trim() ? 'pointer' : 'not-allowed' }
              }, '\uD83D\uDD8B\uFE0F Seal This Letter')
            )
          ),
          // Saved letters
          savedLetters.length > 0 && h('div', null,
            h('div', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' } },
              '\uD83D\uDCEC Letters From Past Me (' + savedLetters.length + ')'
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              savedLetters.map(function(letter) {
                var daysAgo = Math.floor((Date.now() - letter.timestamp) / (24 * 60 * 60 * 1000));
                var timeLabel = daysAgo === 0 ? 'Written today' : daysAgo === 1 ? 'Written yesterday' : 'Written ' + daysAgo + ' days ago';
                return h('div', {
                  key: letter.id,
                  style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', position: 'relative' }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                    h('div', { style: { fontSize: '11px', color: '#94a3b8' } }, letter.date + ' \u00b7 ' + timeLabel),
                    h('button', {
                      onClick: function() { upd('savedLetters', savedLetters.filter(function(l) { return l.id !== letter.id; })); },
                      'aria-label': 'Delete this letter',
                      style: { background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', color: '#991b1b', fontSize: '10px', padding: '2px 6px' }
                    }, '\u2715')
                  ),
                  h('div', { style: { fontSize: '13px', color: '#92400e', fontStyle: 'italic', marginBottom: '4px' } }, 'Dear Future Me,'),
                  h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: '#374151', margin: 0, fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap' } }, letter.text),
                  // Growth reflection prompt (shows after 7+ days)
                  daysAgo >= 7 && h('div', { style: { marginTop: '12px', background: EMERALD_LIGHT, borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid ' + EMERALD } },
                    h('div', { style: { fontSize: '11px', fontWeight: 700, color: EMERALD, marginBottom: '4px' } }, '\uD83C\uDF31 Reflection moment'),
                    h('p', { style: { fontSize: '12px', color: '#374151', margin: 0 } },
                      'You wrote this ' + daysAgo + ' days ago. Has anything changed? What would past-you think about where you are now?')
                  )
                );
              })
            )
          ),
          // Empty state
          savedLetters.length === 0 && h('div', { style: { textAlign: 'center', padding: '20px', color: '#94a3b8' } },
            h('p', { style: { fontSize: '13px', fontStyle: 'italic' } },
              band === 'elementary' ? 'When you write a letter, it gets sealed and saved here. One day you\u2019ll open it and be amazed at how far you\u2019ve come!'
              : 'Your letters create a time capsule of your growth journey. The most powerful evidence of growth is your own words looking back at where you started.')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: Educator Lens ──
      // ══════════════════════════════════════════════════════════
      var educatorContent = null;
      if (activeTab === 'educator') {
        var TEACHER_REFRAMES = [
          { fixed: 'He\u2019s just a low kid.', growth: 'He hasn\u2019t mastered this strategy yet. Let\u2019s try a different approach.', research: 'Rosenthal & Jacobson (1968): Teacher expectations directly influence student achievement. The "Pygmalion effect" is one of the most replicated findings in education.' },
          { fixed: 'She\u2019ll never be able to do grade-level work.', growth: 'She\u2019s not at grade level yet. What scaffolds can close the gap?', research: 'Vygotsky\u2019s Zone of Proximal Development: learning happens in the space between what a student can do alone and what they can do with support.' },
          { fixed: 'This student just doesn\u2019t care.', growth: 'This student hasn\u2019t found what motivates them yet. What matters to them?', research: 'Self-Determination Theory (Deci & Ryan): perceived incompetence often looks like apathy. Students disengage to protect themselves from failure.' },
          { fixed: 'I\u2019ve tried everything with this kid.', growth: 'I haven\u2019t found the right approach yet. Who else can I consult?', research: 'Collaboration is protective against burnout. Teachers who seek peer consultation report higher efficacy and lower emotional exhaustion (Skaalvik & Skaalvik, 2017).' },
          { fixed: 'Some kids just aren\u2019t cut out for math.', growth: 'Every student can develop mathematical thinking with the right entry point.', research: 'Jo Boaler\u2019s research at Stanford: mathematical ability is not innate. When students are taught that math is learnable, achievement gaps narrow significantly.' },
          { fixed: 'The parents don\u2019t care about education.', growth: 'The family may show caring in ways I haven\u2019t recognized yet. How can I build a bridge?', research: 'Mapp & Kuttner (2013): "hard to reach" families are often "hard to reach for." The barrier is usually systemic, not motivational.' },
          { fixed: 'This behavior plan isn\u2019t working.', growth: 'The function of the behavior may not be what we assumed. Let\u2019s reassess.', research: 'Applied Behavior Analysis: behavior serves a function. When interventions fail, the hypothesis about function is wrong \u2014 not the student.' },
          { fixed: 'They\u2019re just not smart enough for this class.', growth: 'They need different preparation, not a different destination.', research: 'Mary Murphy\u2019s "Cultures of Growth": when classrooms communicate that intelligence is expandable, ALL students perform better \u2014 especially those from marginalized groups.' },
        ];
        var tReframeIdx = d.tReframeIdx || 0;
        var currentTR = TEACHER_REFRAMES[tReframeIdx % TEACHER_REFRAMES.length];

        var FEEDBACK_PHRASES = [
          { instead: 'You\u2019re so smart!', try: 'You worked really hard on that strategy.', why: 'Praising effort over intelligence teaches students that success comes from process, not identity.' },
          { instead: 'Great job!', try: 'I noticed you tried three different approaches before finding one that worked.', why: 'Specific process praise is 3x more effective than generic praise (Mueller & Dweck, 1998).' },
          { instead: 'This should be easy for you.', try: 'This might be challenging, and that\u2019s where the learning happens.', why: 'Framing difficulty as expected normalizes productive struggle.' },
          { instead: 'Don\u2019t worry, not everyone is good at this.', try: 'This is hard AND you\u2019re building the skills to get better at it.', why: 'Comfort messages ("not everyone can") implicitly communicate fixed ability.' },
          { instead: 'You got it wrong.', try: 'Your brain just grew. What did that mistake teach you?', why: 'Reframing errors as learning signals reduces math anxiety by up to 30% (Boaler, 2013).' },
          { instead: 'See? You ARE smart!', try: 'See what happens when you stick with something difficult?', why: 'Attributing success to identity ("you\u2019re smart") makes future failure feel like identity threat.' },
        ];

        educatorContent = h('div', { style: { padding: '20px', maxWidth: '650px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83C\uDFEB'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'Educator Lens'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Growth mindset isn\u2019t just for students. The language adults use shapes the mindset culture of the classroom.')
          ),
          // Teacher reframe card
          h('div', { style: { marginBottom: '20px' } },
            h('div', { style: { fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' } }, '\uD83D\uDD04 Reframe: What We Say About Students'),
            h('div', { style: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '12px', padding: '14px', marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' } }, 'Fixed mindset language'),
              h('p', { style: { fontSize: '14px', fontWeight: 600, color: '#7f1d1d', margin: 0, fontStyle: 'italic' } }, '"' + currentTR.fixed + '"')
            ),
            h('div', { style: { background: EMERALD_LIGHT, border: '2px solid #6ee7b7', borderRadius: '12px', padding: '14px', marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: EMERALD, textTransform: 'uppercase', marginBottom: '4px' } }, 'Growth mindset reframe'),
              h('p', { style: { fontSize: '14px', fontWeight: 600, color: EMERALD_DARK, margin: 0 } }, '"' + currentTR.growth + '"')
            ),
            h('div', { style: { background: '#eff6ff', borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid #3b82f6', marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#2563eb', marginBottom: '2px' } }, '\uD83D\uDCDA Research'),
              h('p', { style: { fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.5 } }, currentTR.research)
            ),
            h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
              h('button', {
                onClick: function() { upd('tReframeIdx', (tReframeIdx - 1 + TEACHER_REFRAMES.length) % TEACHER_REFRAMES.length); },
                style: { padding: '6px 14px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#374151' }
              }, '\u2190 Prev'),
              h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '11px', color: '#94a3b8' } }, (tReframeIdx % TEACHER_REFRAMES.length + 1) + ' / ' + TEACHER_REFRAMES.length),
              h('button', {
                onClick: function() { upd('tReframeIdx', (tReframeIdx + 1) % TEACHER_REFRAMES.length); },
                style: { padding: '6px 14px', background: EMERALD, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#fff' }
              }, 'Next \u2192')
            )
          ),
          // Feedback phrase guide
          h('div', null,
            h('div', { style: { fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' } }, '\uD83D\uDCAC Growth-Oriented Feedback Phrases'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              FEEDBACK_PHRASES.map(function(fp, i) {
                return h('div', { key: i, style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' } },
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' } },
                      h('span', { style: { fontSize: '10px', background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 } }, 'Instead of'),
                      h('span', { style: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' } }, '"' + fp.instead + '"')
                    ),
                    h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' } },
                      h('span', { style: { fontSize: '10px', background: EMERALD_LIGHT, color: EMERALD, padding: '1px 6px', borderRadius: '4px', fontWeight: 600 } }, 'Try'),
                      h('span', { style: { fontSize: '12px', color: '#1f2937', fontWeight: 600 } }, '"' + fp.try + '"')
                    ),
                    h('p', { style: { fontSize: '11px', color: '#94a3b8', margin: '2px 0 0', lineHeight: 1.4 } }, fp.why)
                  )
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Progress Summary (shown at bottom of every tab) ──
      // ══════════════════════════════════════════════════════════
      var progressBar = (totalFacts + totalReframes + totalStories) > 0
        ? h('div', { style: { padding: '8px 16px', borderTop: '1px solid #d1fae5', background: '#f0fdf4', display: 'flex', gap: '16px', alignItems: 'center', fontSize: '10px', color: '#94a3b8', flexShrink: 0 } },
            h('span', null, '\uD83E\uDDE0 ' + totalFacts + ' facts'),
            h('span', null, '\uD83D\uDD04 ' + totalReframes + ' reframed'),
            h('span', null, '\uD83C\uDF1F ' + totalStories + ' stories'),
            h('span', null, '\uD83C\uDF31 ' + growthGoals.length + ' goals'),
            savedLetters.length > 0 && h('span', null, '\u2709\uFE0F ' + savedLetters.length + ' letters'),
            (totalFacts + totalReframes + totalStories) >= 10 && h('span', { style: { color: EMERALD, fontWeight: 700 } }, '\u2728 Growth mindset activated!')
          )
        : null;

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      var content = brainContent || reframeContent || storiesContent || mapContent || coachContent || letterContent || educatorContent;

      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        tabBar,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content),
        progressBar
      );
    }
  });
})();
