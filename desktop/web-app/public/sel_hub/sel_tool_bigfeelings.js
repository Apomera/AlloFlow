// ═══════════════════════════════════════════════════════════════
// sel_tool_bigfeelings.js — Big Feelings (Anger Toolkit)
// Anger-specific psychoeducation and skill-building, built on
// Lochman's Coping Power tradition for adolescents plus the
// general CBT-for-anger evidence base. Frames anger as a SIGNAL
// (often pointing to something real that needs attention) and
// distinguishes it from REACTIVE AGGRESSION (the impulsive action
// people often regret).
//
// Tools:
//   - Anger psychoeducation (what anger is, when it's right)
//   - The hassle log (track what triggers your anger and what you did)
//   - The choice point (the moment between feeling and action)
//   - Trigger inventory (specific people / situations / body states)
//   - Cool-down skills
//   - Healthy expression vs reactive aggression
//
// Registered tool ID: "bigFeelings"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('bigFeelings'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-bigfeelings')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-bigfeelings';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  function defaultState() {
    return {
      view: 'home',
      // Hassle log: array of incidents
      hassleLog: [],         // [{date, trigger, body, didDo, wouldHaveBeen, intensity}]
      // Triggers I know about
      myTriggers: [],
      myBodySigns: [],
      myEarlyWarnings: [],
      // Cool-down toolkit (personalized)
      myCoolDowns: [],
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  var TRIGGER_STARTERS = [
    'Being criticized in front of others',
    'Feeling disrespected',
    'Being interrupted',
    'Unfair treatment (real or perceived)',
    'Sibling pushing my buttons',
    'A specific friend or peer',
    'A specific teacher\'s tone',
    'Being told no',
    'Feeling stupid in class',
    'Sensory overload (loud, crowded, hot)',
    'Being hungry / sleep-deprived',
    'Phone notifications / specific messages',
    'Plans changing without warning',
    'Losing in a game or competition'
  ];
  var BODY_STARTERS = [
    'Tight jaw / clenched teeth',
    'Hot face',
    'Tight chest',
    'Fast breathing',
    'Fists clench',
    'Stomach knots',
    'Vision narrows',
    'Voice gets loud',
    'Heart pounding',
    'Sweating',
    'Standing taller / leaning in',
    'Tunnel focus on the person'
  ];
  var COOLDOWN_STARTERS = [
    'Walk away for 5 minutes (state it: "I need a minute")',
    'Cold water on my face',
    'Count down from 10 slowly',
    'Paced breathing: 4 in, 6-8 out',
    'Push against a wall hard for 30 sec (heavy work)',
    'Step outside, look at the sky',
    'Text a specific person who calms me',
    'Listen to a specific song that grounds me',
    'Do 20 pushups, jumping jacks, or sprints',
    'Squeeze something soft / fidget hard',
    'Name 5 things I can see',
    'Drink a glass of cold water'
  ];

  // ── Extended Big Feelings Narrative Library ──

  var FEELING_NARRATIVES_90 = [
    {
      id: 'fn90_1',
      title: 'My feelings closing benediction one',
      narrative: [
        'Benediction one.',
        '',
        'May you feel safely.',
        '',
        'May you feel fully.',
        '',
        'May you feel without shame.',
        '',
        'May your feelings be heard and honored always.'
      ],
      lesson: 'Benediction: feel safely, fully, without shame; heard and honored always.'
    },
    {
      id: 'fn90_2',
      title: 'My feelings closing benediction two',
      narrative: [
        'Benediction two.',
        '',
        'May anger guide you.',
        '',
        'May sadness teach you.',
        '',
        'May fear protect you.',
        '',
        'May joy reward your willingness to keep showing up.'
      ],
      lesson: 'Benediction: anger guides, sadness teaches, fear protects, joy rewards showing up.'
    },
    {
      id: 'fn90_3',
      title: 'My feelings closing benediction three',
      narrative: [
        'Benediction three.',
        '',
        'May your nervous system find safe ground.',
        '',
        'May your body remember it is allowed to rest.',
        '',
        'May your breath return to its quiet rhythm.',
        '',
        'May regulation become as familiar to you as your own name.'
      ],
      lesson: 'Benediction: safe ground, allowed rest, quiet breath, regulation familiar as your name.'
    },
    {
      id: 'fn90_4',
      title: 'My feelings closing benediction four',
      narrative: [
        'Benediction four.',
        '',
        'May you have people who can hold space for your feelings.',
        '',
        'May you be that person for someone else.',
        '',
        'May the circle of care widen with every honest conversation.',
        '',
        'May community feel like home rather than performance.'
      ],
      lesson: 'Benediction: held space, give space, widening care, community as home.'
    },
    {
      id: 'fn90_5',
      title: 'My feelings closing benediction five',
      narrative: [
        'Benediction five.',
        '',
        'May the young person reading this know they are not too much.',
        '',
        'May they know they are not too little either.',
        '',
        'May they know their feelings are not problems to fix.',
        '',
        'May they know their feelings are messages worth listening to.'
      ],
      lesson: 'Benediction for young readers: not too much, not too little, feelings are messages.'
    },
    {
      id: 'fn90_6',
      title: 'My feelings closing benediction six',
      narrative: [
        'Benediction six.',
        '',
        'May you forgive yourself for the explosions of the past.',
        '',
        'May you forgive yourself for the shutdowns of the past.',
        '',
        'May you forgive yourself for the silences of the past.',
        '',
        'May you give yourself a fresh start today and tomorrow and the day after.'
      ],
      lesson: 'Benediction: forgive past explosions, shutdowns, silences; fresh start daily.'
    },
    {
      id: 'fn90_7',
      title: 'My feelings closing benediction seven',
      narrative: [
        'Benediction seven.',
        '',
        'May you choose tools over weapons.',
        '',
        'May you choose words over fists.',
        '',
        'May you choose pause over reaction.',
        '',
        'May you choose curiosity over judgment every chance you get.'
      ],
      lesson: 'Benediction: tools over weapons, words over fists, pause over reaction, curiosity over judgment.'
    },
    {
      id: 'fn90_8',
      title: 'My feelings closing benediction eight',
      narrative: [
        'Benediction eight.',
        '',
        'May you laugh until your stomach aches.',
        '',
        'May you cry until the storm has passed.',
        '',
        'May you rage with purpose and never with destruction.',
        '',
        'May you love in ways that build rather than control.'
      ],
      lesson: 'Benediction: laugh hard, cry through, rage with purpose, love that builds.'
    },
    {
      id: 'fn90_9',
      title: 'My feelings closing benediction nine',
      narrative: [
        'Benediction nine.',
        '',
        'May your hassle log be a witness of your honesty.',
        '',
        'May your choice points be moments of dignity.',
        '',
        'May your cool down skills be available when most needed.',
        '',
        'May your repair conversations be brave and tender at once.'
      ],
      lesson: 'Benediction: honest log, dignified choices, available skills, brave-tender repair.'
    },
    {
      id: 'fn90_10',
      title: 'My feelings closing benediction ten',
      narrative: [
        'Benediction ten.',
        '',
        'May your body be a place you want to live in.',
        '',
        'May your mind be a place you want to spend time with.',
        '',
        'May your heart be a place that welcomes its visitors.',
        '',
        'May your spirit be a place that knows it belongs to itself.'
      ],
      lesson: 'Benediction: body welcoming, mind companionable, heart hospitable, spirit self-belonging.'
    },
    {
      id: 'fn90_11',
      title: 'My feelings closing benediction eleven',
      narrative: [
        'Benediction eleven.',
        '',
        'May the teacher reading this find their students believable.',
        '',
        'May the parent reading this find their child knowable.',
        '',
        'May the clinician reading this find the work meaningful.',
        '',
        'May the student reading this find their feelings legitimate.'
      ],
      lesson: 'Benediction for adults and youth: students believable, children knowable, work meaningful, feelings legitimate.'
    },
    {
      id: 'fn90_12',
      title: 'My feelings closing benediction twelve',
      narrative: [
        'Benediction twelve.',
        '',
        'May this toolkit be one small support in a much larger web.',
        '',
        'May the web include friends and family and community.',
        '',
        'May the web include therapists and teachers and trusted adults.',
        '',
        'May no one carry their big feelings alone if they do not want to.'
      ],
      lesson: 'Benediction: toolkit is one node in a wide web of care; no one alone unwillingly.'
    },
    {
      id: 'fn90_13',
      title: 'My feelings closing benediction thirteen',
      narrative: [
        'Benediction thirteen.',
        '',
        'May the work of feeling be considered noble.',
        '',
        'May the labor of regulation be considered skill.',
        '',
        'May the practice of repair be considered courage.',
        '',
        'May the daily return to honesty be considered the deepest kind of strength.'
      ],
      lesson: 'Benediction: feeling noble, regulation skill, repair courage, daily honesty deepest strength.'
    },
    {
      id: 'fn90_14',
      title: 'My feelings closing benediction final',
      narrative: [
        'Final benediction.',
        '',
        'Go gently with yourself.',
        '',
        'Go bravely with others.',
        '',
        'Go honestly into each new day.',
        '',
        'Go knowing your big feelings have always been welcome here.'
      ],
      lesson: 'Final benediction: gentle with self, brave with others, honest daily, feelings always welcome.'
    }
  ];

  var FEELING_NARRATIVES_89 = [
    {
      id: 'fn89_1',
      title: 'My feelings final lifelong commitment',
      narrative: [
        'Lifelong commitment.',
        '',
        'Daily renewal.',
        '',
        'Practice never ends.',
        '',
        'I tell beginners: commitment.'
      ],
      lesson: 'Lifelong commitment daily renewal practice never ends.'
    },
    {
      id: 'fn89_2',
      title: 'My feelings final permission granted',
      narrative: [
        'Permission granted.',
        '',
        'Feel everything.',
        '',
        'Express healthily.',
        '',
        'I tell suppressing: permission.'
      ],
      lesson: 'Permission granted feel everything express healthily.'
    },
    {
      id: 'fn89_3',
      title: 'My feelings final whole self welcome',
      narrative: [
        'Whole self welcome.',
        '',
        'All emotions valid.',
        '',
        'Integration daily.',
        '',
        'I tell fragmented: welcome.'
      ],
      lesson: 'Whole self welcome all emotions valid integration daily.'
    },
    {
      id: 'fn89_4',
      title: 'My feelings final final word: feel',
      narrative: [
        'Final word: feel.',
        '',
        'All emotions welcome.',
        '',
        'Whole self honored.',
        '',
        'Live fully.',
        '',
        'I tell all reading: feel everything always.'
      ],
      lesson: 'Final word: feel; all emotions welcome; whole self honored; live fully.'
    },
    {
      id: 'fn89_5',
      title: 'My feelings final practice continues',
      narrative: [
        'Practice continues.',
        '',
        'Daily, weekly, yearly.',
        '',
        'Lifelong commitment.',
        '',
        'I tell beginners: continues.'
      ],
      lesson: 'Practice continues daily, weekly, yearly lifelong commitment.'
    }
  ];

  var FEELING_NARRATIVES_87 = [
    {
      id: 'fn87_1',
      title: 'My feelings about literature',
      narrative: [
        'Literature feelings.',
        '',
        'Other lives lived.',
        '',
        'Empathy expanded.',
        '',
        'I tell readers: literature.'
      ],
      lesson: 'Literature feelings other lives lived empathy expanded.'
    },
    {
      id: 'fn87_2',
      title: 'My feelings about poetry',
      narrative: [
        'Poetry feelings.',
        '',
        'Compressed beauty.',
        '',
        'Soul fed.',
        '',
        'I tell poetry: soul.'
      ],
      lesson: 'Poetry feelings compressed beauty soul fed.'
    },
    {
      id: 'fn87_3',
      title: 'My feelings about fiction',
      narrative: [
        'Fiction feelings.',
        '',
        'Other worlds.',
        '',
        'Self understood.',
        '',
        'I tell fiction: self.'
      ],
      lesson: 'Fiction feelings other worlds self understood.'
    },
    {
      id: 'fn87_4',
      title: 'My feelings about memoir',
      narrative: [
        'Memoir feelings.',
        '',
        'Lives examined.',
        '',
        'Wisdom shared.',
        '',
        'I tell memoir: wisdom.'
      ],
      lesson: 'Memoir feelings lives examined wisdom shared.'
    },
    {
      id: 'fn87_5',
      title: 'My feelings about essays',
      narrative: [
        'Essay feelings.',
        '',
        'Ideas explored.',
        '',
        'Thinking deepened.',
        '',
        'I tell essays: deepen.'
      ],
      lesson: 'Essay feelings ideas explored thinking deepened.'
    },
    {
      id: 'fn87_6',
      title: 'My feelings about journalism',
      narrative: [
        'Journalism feelings.',
        '',
        'Truth told.',
        '',
        'World understood.',
        '',
        'I tell journalism: truth.'
      ],
      lesson: 'Journalism feelings truth told world understood.'
    },
    {
      id: 'fn87_7',
      title: 'My feelings about philosophy',
      narrative: [
        'Philosophy feelings.',
        '',
        'Big questions.',
        '',
        'Mind stretched.',
        '',
        'I tell philosophy: stretch.'
      ],
      lesson: 'Philosophy feelings big questions mind stretched.'
    },
    {
      id: 'fn87_8',
      title: 'My feelings about religion',
      narrative: [
        'Religion feelings.',
        '',
        'Sacred encountered.',
        '',
        'Community formed.',
        '',
        'I tell religion: encounter.'
      ],
      lesson: 'Religion feelings sacred encountered community formed.'
    },
    {
      id: 'fn87_9',
      title: 'My feelings about spirituality',
      narrative: [
        'Spirituality feelings.',
        '',
        'Beyond rational.',
        '',
        'Personal path.',
        '',
        'I tell spiritual: personal.'
      ],
      lesson: 'Spirituality feelings beyond rational personal path.'
    },
    {
      id: 'fn87_10',
      title: 'My feelings about prayer',
      narrative: [
        'Prayer feelings.',
        '',
        'Sacred conversation.',
        '',
        'Heart turned.',
        '',
        'I tell prayer: turn.'
      ],
      lesson: 'Prayer feelings sacred conversation heart turned.'
    },
    {
      id: 'fn87_11',
      title: 'My feelings about meditation',
      narrative: [
        'Meditation feelings.',
        '',
        'Mind quieted.',
        '',
        'Spaciousness opens.',
        '',
        'I tell meditation: space.'
      ],
      lesson: 'Meditation feelings mind quieted spaciousness opens.'
    },
    {
      id: 'fn87_12',
      title: 'My feelings about contemplation',
      narrative: [
        'Contemplation feelings.',
        '',
        'Slow attention.',
        '',
        'Depth emerged.',
        '',
        'I tell contemplation: slow.'
      ],
      lesson: 'Contemplation feelings slow attention depth emerged.'
    },
    {
      id: 'fn87_13',
      title: 'My feelings about ritual',
      narrative: [
        'Ritual feelings.',
        '',
        'Sacred space.',
        '',
        'Body remembers.',
        '',
        'I tell ritual: sacred.'
      ],
      lesson: 'Ritual feelings sacred space body remembers.'
    },
    {
      id: 'fn87_14',
      title: 'My feelings about ceremony',
      narrative: [
        'Ceremony feelings.',
        '',
        'Community marker.',
        '',
        'Life punctuated.',
        '',
        'I tell ceremony: marker.'
      ],
      lesson: 'Ceremony feelings community marker life punctuated.'
    },
    {
      id: 'fn87_15',
      title: 'My feelings about meaning making integrated',
      narrative: [
        'Meaning making integrated.',
        '',
        'Multiple paths.',
        '',
        'Lifelong work.',
        '',
        'I tell meaning: lifelong.'
      ],
      lesson: 'Meaning making integrated multiple paths lifelong work.'
    }
  ];

  var FEELING_NARRATIVES_88 = [
    {
      id: 'fn88_1',
      title: 'My final feelings practice integrated',
      narrative: [
        'All practices integrated.',
        '',
        'Body, mind, spirit, community.',
        '',
        'Whole person.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'All practices integrated body, mind, spirit, community whole person.'
    },
    {
      id: 'fn88_2',
      title: 'My feelings final wisdom shared',
      narrative: [
        'Wisdom shared.',
        '',
        'Suffering became gift.',
        '',
        'Service emerged.',
        '',
        'I tell experienced: wisdom.'
      ],
      lesson: 'Wisdom shared suffering became gift service emerged.'
    },
    {
      id: 'fn88_3',
      title: 'My feelings final humility maintained',
      narrative: [
        'Humility maintained.',
        '',
        'Always learning.',
        '',
        'Beginners mind.',
        '',
        'I tell mature: humility.'
      ],
      lesson: 'Humility maintained always learning beginners mind.'
    },
    {
      id: 'fn88_4',
      title: 'My feelings final acceptance practice',
      narrative: [
        'Acceptance daily.',
        '',
        'All feelings welcome.',
        '',
        'Self welcome.',
        '',
        'I tell beginners: acceptance.'
      ],
      lesson: 'Acceptance daily all feelings welcome self welcome.'
    },
    {
      id: 'fn88_5',
      title: 'My feelings final compassion daily',
      narrative: [
        'Compassion daily.',
        '',
        'Self and others.',
        '',
        'Bridge always.',
        '',
        'I tell harsh: compassion.'
      ],
      lesson: 'Compassion daily self and others bridge always.'
    },
    {
      id: 'fn88_6',
      title: 'My feelings final love foundation',
      narrative: [
        'Love foundation.',
        '',
        'Self and others.',
        '',
        'Anchor of life.',
        '',
        'I tell beginners: foundation.'
      ],
      lesson: 'Love foundation self and others anchor of life.'
    },
    {
      id: 'fn88_7',
      title: 'My feelings final gratitude lifelong',
      narrative: [
        'Gratitude lifelong.',
        '',
        'Daily practice.',
        '',
        'Foundation built.',
        '',
        'I tell beginners: gratitude.'
      ],
      lesson: 'Gratitude lifelong daily practice foundation built.'
    },
    {
      id: 'fn88_8',
      title: 'My feelings final presence ultimate',
      narrative: [
        'Presence ultimate.',
        '',
        'This moment.',
        '',
        'Always available.',
        '',
        'I tell scattered: presence.'
      ],
      lesson: 'Presence ultimate this moment always available.'
    },
    {
      id: 'fn88_9',
      title: 'My feelings final wholeness achieved',
      narrative: [
        'Wholeness achieved.',
        '',
        'All parts welcome.',
        '',
        'Integration complete.',
        '',
        'I tell fragmented: wholeness.'
      ],
      lesson: 'Wholeness achieved all parts welcome integration complete.'
    },
    {
      id: 'fn88_10',
      title: 'My feelings final integration whole',
      narrative: [
        'All integrated.',
        '',
        'Whole person.',
        '',
        'Years of work.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'All integrated whole person years of work.'
    },
    {
      id: 'fn88_11',
      title: 'My feelings final service emerging',
      narrative: [
        'Service emerges.',
        '',
        'From experience.',
        '',
        'Others helped.',
        '',
        'I tell mature: service.'
      ],
      lesson: 'Service emerges from experience others helped.'
    },
    {
      id: 'fn88_12',
      title: 'My feelings final teaching others',
      narrative: [
        'Teaching others.',
        '',
        'Vocabulary shared.',
        '',
        'Generations served.',
        '',
        'I tell experienced: teach.'
      ],
      lesson: 'Teaching others vocabulary shared generations served.'
    },
    {
      id: 'fn88_13',
      title: 'My feelings final mentoring practice',
      narrative: [
        'Mentoring practice.',
        '',
        'Both grow.',
        '',
        'Wisdom flows.',
        '',
        'I tell mentors: both grow.'
      ],
      lesson: 'Mentoring practice both grow wisdom flows.'
    },
    {
      id: 'fn88_14',
      title: 'My feelings final legacy lived daily',
      narrative: [
        'Legacy lived daily.',
        '',
        'What I leave.',
        '',
        'Service shapes.',
        '',
        'I tell legacy: daily.'
      ],
      lesson: 'Legacy lived daily what I leave service shapes.'
    },
    {
      id: 'fn88_15',
      title: 'My feelings final invitation extended',
      narrative: [
        'Invitation extended.',
        '',
        'Feel everything.',
        '',
        'Live fully.',
        '',
        'Welcome whole self.',
        '',
        'I tell all reading: feel and live.'
      ],
      lesson: 'Invitation extended feel everything live fully welcome whole self.'
    }
  ];

  var FEELING_NARRATIVES_84 = [
    {
      id: 'fn84_1',
      title: 'My feelings about weather changes',
      narrative: [
        'Weather feelings.',
        '',
        'Body responds.',
        '',
        'Mood shifts.',
        '',
        'I tell weather: body.'
      ],
      lesson: 'Weather feelings body responds mood shifts.'
    },
    {
      id: 'fn84_2',
      title: 'My feelings about seasonal affective',
      narrative: [
        'SAD feelings.',
        '',
        'Light therapy helps.',
        '',
        'Body biology.',
        '',
        'I tell SAD: light therapy.'
      ],
      lesson: 'SAD feelings light therapy helps body biology.'
    },
    {
      id: 'fn84_3',
      title: 'My feelings about winter',
      narrative: [
        'Winter feelings.',
        '',
        'Cold and dark.',
        '',
        'Inward turning.',
        '',
        'I tell winter: inward.'
      ],
      lesson: 'Winter feelings cold and dark inward turning.'
    },
    {
      id: 'fn84_4',
      title: 'My feelings about spring',
      narrative: [
        'Spring feelings.',
        '',
        'Renewal energy.',
        '',
        'Life emerging.',
        '',
        'I tell spring: renewal.'
      ],
      lesson: 'Spring feelings renewal energy life emerging.'
    },
    {
      id: 'fn84_5',
      title: 'My feelings about summer',
      narrative: [
        'Summer feelings.',
        '',
        'Energy peak.',
        '',
        'Outdoor freedom.',
        '',
        'I tell summer: outdoor.'
      ],
      lesson: 'Summer feelings energy peak outdoor freedom.'
    },
    {
      id: 'fn84_6',
      title: 'My feelings about fall',
      narrative: [
        'Fall feelings.',
        '',
        'Change and release.',
        '',
        'Beauty transitional.',
        '',
        'I tell fall: release.'
      ],
      lesson: 'Fall feelings change and release beauty transitional.'
    },
    {
      id: 'fn84_7',
      title: 'My feelings about rain',
      narrative: [
        'Rain feelings.',
        '',
        'Mixed always.',
        '',
        'Body responds.',
        '',
        'I tell rain: response.'
      ],
      lesson: 'Rain feelings mixed always body responds.'
    },
    {
      id: 'fn84_8',
      title: 'My feelings about snow',
      narrative: [
        'Snow feelings.',
        '',
        'Quiet beauty.',
        '',
        'Childlike joy.',
        '',
        'I tell snow: joy.'
      ],
      lesson: 'Snow feelings quiet beauty childlike joy.'
    },
    {
      id: 'fn84_9',
      title: 'My feelings about storms',
      narrative: [
        'Storm feelings.',
        '',
        'Power felt.',
        '',
        'Awe plus respect.',
        '',
        'I tell storms: awe.'
      ],
      lesson: 'Storm feelings power felt awe plus respect.'
    },
    {
      id: 'fn84_10',
      title: 'My feelings about heat',
      narrative: [
        'Heat feelings.',
        '',
        'Energy sapping.',
        '',
        'Rest cycle.',
        '',
        'I tell heat: rest.'
      ],
      lesson: 'Heat feelings energy sapping rest cycle.'
    },
    {
      id: 'fn84_11',
      title: 'My feelings about cold',
      narrative: [
        'Cold feelings.',
        '',
        'Bracing.',
        '',
        'Body alert.',
        '',
        'I tell cold: alert.'
      ],
      lesson: 'Cold feelings bracing body alert.'
    },
    {
      id: 'fn84_12',
      title: 'My feelings about wind',
      narrative: [
        'Wind feelings.',
        '',
        'Change carried.',
        '',
        'Energy moving.',
        '',
        'I tell wind: change.'
      ],
      lesson: 'Wind feelings change carried energy moving.'
    },
    {
      id: 'fn84_13',
      title: 'My feelings about fog',
      narrative: [
        'Fog feelings.',
        '',
        'World softened.',
        '',
        'Mystery felt.',
        '',
        'I tell fog: mystery.'
      ],
      lesson: 'Fog feelings world softened mystery felt.'
    },
    {
      id: 'fn84_14',
      title: 'My feelings about humidity',
      narrative: [
        'Humidity feelings.',
        '',
        'Body slows.',
        '',
        'Pace adjusts.',
        '',
        'I tell humid: slow.'
      ],
      lesson: 'Humidity feelings body slows pace adjusts.'
    },
    {
      id: 'fn84_15',
      title: 'My feelings about weather integrated',
      narrative: [
        'Weather integrated.',
        '',
        'All conditions held.',
        '',
        'Body responds wisely.',
        '',
        'I tell weather: wise.'
      ],
      lesson: 'Weather integrated all conditions held body responds wisely.'
    }
  ];

  var FEELING_NARRATIVES_85 = [
    {
      id: 'fn85_1',
      title: 'My feelings about music genres',
      narrative: [
        'Music genres.',
        '',
        'Each evokes feelings.',
        '',
        'Curate playlists.',
        '',
        'I tell music: curate.'
      ],
      lesson: 'Music genres each evokes feelings curate playlists.'
    },
    {
      id: 'fn85_2',
      title: 'My feelings about classical music',
      narrative: [
        'Classical music.',
        '',
        'Mind soothed.',
        '',
        'Depth felt.',
        '',
        'I tell classical: depth.'
      ],
      lesson: 'Classical music mind soothed depth felt.'
    },
    {
      id: 'fn85_3',
      title: 'My feelings about jazz',
      narrative: [
        'Jazz feelings.',
        '',
        'Improvisation alive.',
        '',
        'Soul moved.',
        '',
        'I tell jazz: soul.'
      ],
      lesson: 'Jazz feelings improvisation alive soul moved.'
    },
    {
      id: 'fn85_4',
      title: 'My feelings about folk',
      narrative: [
        'Folk feelings.',
        '',
        'Stories told.',
        '',
        'Roots felt.',
        '',
        'I tell folk: stories.'
      ],
      lesson: 'Folk feelings stories told roots felt.'
    },
    {
      id: 'fn85_5',
      title: 'My feelings about rock',
      narrative: [
        'Rock feelings.',
        '',
        'Energy released.',
        '',
        'Power felt.',
        '',
        'I tell rock: energy.'
      ],
      lesson: 'Rock feelings energy released power felt.'
    },
    {
      id: 'fn85_6',
      title: 'My feelings about hip hop',
      narrative: [
        'Hip hop.',
        '',
        'Words rhythm.',
        '',
        'Stories told.',
        '',
        'I tell hip hop: stories.'
      ],
      lesson: 'Hip hop words rhythm stories told.'
    },
    {
      id: 'fn85_7',
      title: 'My feelings about country',
      narrative: [
        'Country feelings.',
        '',
        'Stories everyday.',
        '',
        'Lives sung.',
        '',
        'I tell country: lives.'
      ],
      lesson: 'Country feelings stories everyday lives sung.'
    },
    {
      id: 'fn85_8',
      title: 'My feelings about electronic',
      narrative: [
        'Electronic music.',
        '',
        'Body moves.',
        '',
        'Trance possible.',
        '',
        'I tell electronic: body.'
      ],
      lesson: 'Electronic music body moves trance possible.'
    },
    {
      id: 'fn85_9',
      title: 'My feelings about world music',
      narrative: [
        'World music.',
        '',
        'Cultures shared.',
        '',
        'Connection global.',
        '',
        'I tell world: global.'
      ],
      lesson: 'World music cultures shared connection global.'
    },
    {
      id: 'fn85_10',
      title: 'My feelings about lullabies',
      narrative: [
        'Lullaby feelings.',
        '',
        'Soothing childhood.',
        '',
        'Pass to children.',
        '',
        'I tell parents: lullabies.'
      ],
      lesson: 'Lullaby feelings soothing childhood pass to children.'
    },
    {
      id: 'fn85_11',
      title: 'My feelings about hymns',
      narrative: [
        'Hymn feelings.',
        '',
        'Sacred connection.',
        '',
        'Faith expressed.',
        '',
        'I tell hymns: sacred.'
      ],
      lesson: 'Hymn feelings sacred connection faith expressed.'
    },
    {
      id: 'fn85_12',
      title: 'My feelings about chants',
      narrative: [
        'Chant feelings.',
        '',
        'Body vibrates.',
        '',
        'Mind quieted.',
        '',
        'I tell chants: vibrate.'
      ],
      lesson: 'Chant feelings body vibrates mind quieted.'
    },
    {
      id: 'fn85_13',
      title: 'My feelings about silence',
      narrative: [
        'Silence feelings.',
        '',
        'Sometimes uncomfortable.',
        '',
        'Practice welcomes.',
        '',
        'I tell silence-anxious: practice.'
      ],
      lesson: 'Silence feelings sometimes uncomfortable practice welcomes.'
    },
    {
      id: 'fn85_14',
      title: 'My feelings about ambient sound',
      narrative: [
        'Ambient sound.',
        '',
        'Background gentle.',
        '',
        'Focus enabled.',
        '',
        'I tell focus-curious: ambient.'
      ],
      lesson: 'Ambient sound background gentle focus enabled.'
    },
    {
      id: 'fn85_15',
      title: 'My feelings about music integrated',
      narrative: [
        'Music integrated.',
        '',
        'Daily companion.',
        '',
        'Mood manager.',
        '',
        'I tell music: companion.'
      ],
      lesson: 'Music integrated daily companion mood manager.'
    }
  ];

  var FEELING_NARRATIVES_86 = [
    {
      id: 'fn86_1',
      title: 'My feelings about food memories',
      narrative: [
        'Food memories.',
        '',
        'Childhood evoked.',
        '',
        'Comfort felt.',
        '',
        'I tell food: memories.'
      ],
      lesson: 'Food memories childhood evoked comfort felt.'
    },
    {
      id: 'fn86_2',
      title: 'My feelings about cooking with love',
      narrative: [
        'Cooking with love.',
        '',
        'Care expressed.',
        '',
        'Family fed.',
        '',
        'I tell cook-curious: love.'
      ],
      lesson: 'Cooking with love care expressed family fed.'
    },
    {
      id: 'fn86_3',
      title: 'My feelings about sharing meals',
      narrative: [
        'Sharing meals.',
        '',
        'Connection deepened.',
        '',
        'Bond formed.',
        '',
        'I tell sharing: bond.'
      ],
      lesson: 'Sharing meals connection deepened bond formed.'
    },
    {
      id: 'fn86_4',
      title: 'My feelings about food gratitude',
      narrative: [
        'Food gratitude.',
        '',
        'Earth provides.',
        '',
        'Hands grew.',
        '',
        'I tell gratitude: food.'
      ],
      lesson: 'Food gratitude earth provides hands grew.'
    },
    {
      id: 'fn86_5',
      title: 'My feelings about heritage food',
      narrative: [
        'Heritage food.',
        '',
        'Ancestors fed me.',
        '',
        'Connection lived.',
        '',
        'I tell heritage: ancestors.'
      ],
      lesson: 'Heritage food ancestors fed me connection lived.'
    },
    {
      id: 'fn86_6',
      title: 'My feelings about new food',
      narrative: [
        'New food.',
        '',
        'Adventure plus risk.',
        '',
        'Curiosity rewarded.',
        '',
        'I tell new-food: adventure.'
      ],
      lesson: 'New food adventure plus risk curiosity rewarded.'
    },
    {
      id: 'fn86_7',
      title: 'My feelings about feast',
      narrative: [
        'Feast feelings.',
        '',
        'Community gathered.',
        '',
        'Abundance shared.',
        '',
        'I tell feasts: abundance.'
      ],
      lesson: 'Feast feelings community gathered abundance shared.'
    },
    {
      id: 'fn86_8',
      title: 'My feelings about fasting',
      narrative: [
        'Fasting feelings.',
        '',
        'Discipline cultivated.',
        '',
        'Body honored.',
        '',
        'I tell fasting: discipline.'
      ],
      lesson: 'Fasting feelings discipline cultivated body honored.'
    },
    {
      id: 'fn86_9',
      title: 'My feelings about food restriction',
      narrative: [
        'Food restriction.',
        '',
        'Medical or chosen.',
        '',
        'Body listened.',
        '',
        'I tell restricted: body.'
      ],
      lesson: 'Food restriction medical or chosen body listened.'
    },
    {
      id: 'fn86_10',
      title: 'My feelings about food joy',
      narrative: [
        'Food joy.',
        '',
        'Pleasure honored.',
        '',
        'Not just fuel.',
        '',
        'I tell food: pleasure.'
      ],
      lesson: 'Food joy pleasure honored not just fuel.'
    },
    {
      id: 'fn86_11',
      title: 'My feelings about food shame',
      narrative: [
        'Food shame.',
        '',
        'Cultural pressure.',
        '',
        'Liberation work.',
        '',
        'I tell food-shame: liberation.'
      ],
      lesson: 'Food shame cultural pressure liberation work.'
    },
    {
      id: 'fn86_12',
      title: 'My feelings about food security',
      narrative: [
        'Food security feelings.',
        '',
        'Stable supply.',
        '',
        'Gratitude grows.',
        '',
        'I tell food-secure: gratitude.'
      ],
      lesson: 'Food security feelings stable supply gratitude grows.'
    },
    {
      id: 'fn86_13',
      title: 'My feelings about food insecurity',
      narrative: [
        'Food insecurity.',
        '',
        'Chronic stress.',
        '',
        'Structural problem.',
        '',
        'I tell insecure: structural.'
      ],
      lesson: 'Food insecurity chronic stress structural problem.'
    },
    {
      id: 'fn86_14',
      title: 'My feelings about food traditions',
      narrative: [
        'Food traditions.',
        '',
        'Family rituals.',
        '',
        'Generations connected.',
        '',
        'I tell traditions: connect.'
      ],
      lesson: 'Food traditions family rituals generations connected.'
    },
    {
      id: 'fn86_15',
      title: 'My feelings about food integrated',
      narrative: [
        'Food integrated.',
        '',
        'Nourishment plus pleasure plus connection.',
        '',
        'Whole experience.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'Food integrated nourishment plus pleasure plus connection whole experience.'
    }
  ];

  var FEELING_NARRATIVES_81 = [
    {
      id: 'fn81_1',
      title: 'My feelings about everyday small things',
      narrative: [
        'Small things noticed.',
        '',
        'Coffee, sunlight, bird.',
        '',
        'Joy in daily.',
        '',
        'I tell joy-blind: small.'
      ],
      lesson: 'Small things noticed coffee, sunlight, bird joy in daily.'
    },
    {
      id: 'fn81_2',
      title: 'My feelings about routine joys',
      narrative: [
        'Routine joys.',
        '',
        'Same coffee.',
        '',
        'Same walk.',
        '',
        'Reliability comforts.',
        '',
        'I tell routine-needing: joys.'
      ],
      lesson: 'Routine joys same coffee, same walk reliability comforts.'
    },
    {
      id: 'fn81_3',
      title: 'My feelings about morning rituals',
      narrative: [
        'Morning rituals.',
        '',
        'Anchor day.',
        '',
        'Set tone.',
        '',
        'I tell scattered: rituals.'
      ],
      lesson: 'Morning rituals anchor day set tone.'
    },
    {
      id: 'fn81_4',
      title: 'My feelings about evening rituals',
      narrative: [
        'Evening rituals.',
        '',
        'Wind down.',
        '',
        'Sleep prep.',
        '',
        'I tell rushed-evening: rituals.'
      ],
      lesson: 'Evening rituals wind down sleep prep.'
    },
    {
      id: 'fn81_5',
      title: 'My feelings about weekly rhythms',
      narrative: [
        'Weekly rhythms.',
        '',
        'Predictable structure.',
        '',
        'Bucket sustained.',
        '',
        'I tell chaotic: rhythms.'
      ],
      lesson: 'Weekly rhythms predictable structure bucket sustained.'
    },
    {
      id: 'fn81_6',
      title: 'My feelings about monthly anchors',
      narrative: [
        'Monthly anchors.',
        '',
        'Retreat day.',
        '',
        'Review session.',
        '',
        'I tell monthly: anchors.'
      ],
      lesson: 'Monthly anchors retreat day review session.'
    },
    {
      id: 'fn81_7',
      title: 'My feelings about seasonal celebrations',
      narrative: [
        'Seasonal celebrations.',
        '',
        'Earth rhythm.',
        '',
        'Body aligned.',
        '',
        'I tell rootless: celebrations.'
      ],
      lesson: 'Seasonal celebrations earth rhythm body aligned.'
    },
    {
      id: 'fn81_8',
      title: 'My feelings about birthday celebrations',
      narrative: [
        'Birthday feelings.',
        '',
        'Self-honored.',
        '',
        'Year marked.',
        '',
        'I tell birthday: honor.'
      ],
      lesson: 'Birthday feelings self-honored year marked.'
    },
    {
      id: 'fn81_9',
      title: 'My feelings about anniversary celebrations',
      narrative: [
        'Anniversary feelings.',
        '',
        'Connection marked.',
        '',
        'Years honored.',
        '',
        'I tell anniversaries: honor.'
      ],
      lesson: 'Anniversary feelings connection marked years honored.'
    },
    {
      id: 'fn81_10',
      title: 'My feelings about graduation celebrations',
      narrative: [
        'Graduation feelings.',
        '',
        'Effort honored.',
        '',
        'Future open.',
        '',
        'I tell graduating: honor.'
      ],
      lesson: 'Graduation feelings effort honored future open.'
    },
    {
      id: 'fn81_11',
      title: 'My feelings about retirement celebrations',
      narrative: [
        'Retirement feelings.',
        '',
        'Career honored.',
        '',
        'New chapter.',
        '',
        'I tell retiring: honor.'
      ],
      lesson: 'Retirement feelings career honored new chapter.'
    },
    {
      id: 'fn81_12',
      title: 'My feelings about wedding celebrations',
      narrative: [
        'Wedding feelings.',
        '',
        'Commitment public.',
        '',
        'Community witness.',
        '',
        'I tell weddings: witness.'
      ],
      lesson: 'Wedding feelings commitment public community witness.'
    },
    {
      id: 'fn81_13',
      title: 'My feelings about baby celebrations',
      narrative: [
        'Baby celebrations.',
        '',
        'Life welcomed.',
        '',
        'Family expanded.',
        '',
        'I tell new-baby: welcome.'
      ],
      lesson: 'Baby celebrations life welcomed family expanded.'
    },
    {
      id: 'fn81_14',
      title: 'My feelings about death rituals',
      narrative: [
        'Death rituals.',
        '',
        'Life honored.',
        '',
        'Community grieves.',
        '',
        'I tell death: ritual.'
      ],
      lesson: 'Death rituals life honored community grieves.'
    },
    {
      id: 'fn81_15',
      title: 'My feelings about all rituals integrated',
      narrative: [
        'Rituals integrated.',
        '',
        'Life marked.',
        '',
        'Meaning made.',
        '',
        'I tell ritual-curious: integrate.'
      ],
      lesson: 'Rituals integrated life marked meaning made.'
    }
  ];

  var FEELING_NARRATIVES_82 = [
    {
      id: 'fn82_1',
      title: 'My feelings about animal companionship',
      narrative: [
        'Animal companionship.',
        '',
        'Unconditional love.',
        '',
        'Daily presence.',
        '',
        'I tell pet-owners: presence.'
      ],
      lesson: 'Animal companionship unconditional love daily presence.'
    },
    {
      id: 'fn82_2',
      title: 'My feelings about pet love',
      narrative: [
        'Pet love.',
        '',
        'Different from human.',
        '',
        'Equally real.',
        '',
        'I tell pet-curious: real.'
      ],
      lesson: 'Pet love different from human equally real.'
    },
    {
      id: 'fn82_3',
      title: 'My feelings about pet grief',
      narrative: [
        'Pet grief.',
        '',
        'Real loss.',
        '',
        'Specialty support.',
        '',
        'I tell pet-grieving: specialty.'
      ],
      lesson: 'Pet grief real loss specialty support.'
    },
    {
      id: 'fn82_4',
      title: 'My feelings about adopting pet',
      narrative: [
        'Pet adoption feelings.',
        '',
        'New family member.',
        '',
        'Both adjust.',
        '',
        'I tell adopting: adjust.'
      ],
      lesson: 'Pet adoption feelings new family member both adjust.'
    },
    {
      id: 'fn82_5',
      title: 'My feelings about pet illness',
      narrative: [
        'Pet illness feelings.',
        '',
        'Caregiver stress.',
        '',
        'Love expressed.',
        '',
        'I tell pet-sick: care.'
      ],
      lesson: 'Pet illness feelings caregiver stress love expressed.'
    },
    {
      id: 'fn82_6',
      title: 'My feelings about euthanasia',
      narrative: [
        'Euthanasia decision.',
        '',
        'Painful kindness.',
        '',
        'Grief profound.',
        '',
        'I tell euthanasia: kindness.'
      ],
      lesson: 'Euthanasia decision painful kindness grief profound.'
    },
    {
      id: 'fn82_7',
      title: 'My feelings about pet rituals',
      narrative: [
        'Pet rituals.',
        '',
        'Daily walks.',
        '',
        'Feeding times.',
        '',
        'Connection deepens.',
        '',
        'I tell pet: rituals.'
      ],
      lesson: 'Pet rituals daily walks feeding times connection deepens.'
    },
    {
      id: 'fn82_8',
      title: 'My feelings about pet community',
      narrative: [
        'Pet community.',
        '',
        'Dog park.',
        '',
        'Cat communities.',
        '',
        'Shared experience.',
        '',
        'I tell pet-isolated: community.'
      ],
      lesson: 'Pet community dog park cat communities shared experience.'
    },
    {
      id: 'fn82_9',
      title: 'My feelings about service animal',
      narrative: [
        'Service animal.',
        '',
        'Working partnership.',
        '',
        'Both serve each other.',
        '',
        'I tell service: partnership.'
      ],
      lesson: 'Service animal working partnership both serve each other.'
    },
    {
      id: 'fn82_10',
      title: 'My feelings about therapy animal',
      narrative: [
        'Therapy animal.',
        '',
        'Healing presence.',
        '',
        'Calming felt.',
        '',
        'I tell anxious: therapy animals.'
      ],
      lesson: 'Therapy animal healing presence calming felt.'
    },
    {
      id: 'fn82_11',
      title: 'My feelings about emotional support animal',
      narrative: [
        'ESA feelings.',
        '',
        'Daily support.',
        '',
        'Anxiety eased.',
        '',
        'I tell anxious: ESA.'
      ],
      lesson: 'ESA feelings daily support anxiety eased.'
    },
    {
      id: 'fn82_12',
      title: 'My feelings about animal training',
      narrative: [
        'Animal training feelings.',
        '',
        'Patience cultivated.',
        '',
        'Bond deepens.',
        '',
        'I tell training: patience.'
      ],
      lesson: 'Animal training feelings patience cultivated bond deepens.'
    },
    {
      id: 'fn82_13',
      title: 'My feelings about animal play',
      narrative: [
        'Animal play.',
        '',
        'Joy infectious.',
        '',
        'Stress released.',
        '',
        'I tell play-curious: animal.'
      ],
      lesson: 'Animal play joy infectious stress released.'
    },
    {
      id: 'fn82_14',
      title: 'My feelings about animal observation',
      narrative: [
        'Animal observation.',
        '',
        'Bird watching.',
        '',
        'Quiet wonder.',
        '',
        'I tell wonder: observation.'
      ],
      lesson: 'Animal observation bird watching quiet wonder.'
    },
    {
      id: 'fn82_15',
      title: 'My feelings about animal connection integrated',
      narrative: [
        'Animal connection integrated.',
        '',
        'Daily presence.',
        '',
        'Love continues.',
        '',
        'I tell animal: connection.'
      ],
      lesson: 'Animal connection integrated daily presence love continues.'
    }
  ];

  var FEELING_NARRATIVES_83 = [
    {
      id: 'fn83_1',
      title: 'My feelings about nature in cities',
      narrative: [
        'Urban nature.',
        '',
        'Trees in parks.',
        '',
        'Wildlife adapted.',
        '',
        'I tell urban: nature.'
      ],
      lesson: 'Urban nature trees in parks wildlife adapted.'
    },
    {
      id: 'fn83_2',
      title: 'My feelings about parks',
      narrative: [
        'Park feelings.',
        '',
        'Green respite.',
        '',
        'Community gathering.',
        '',
        'I tell urban: parks.'
      ],
      lesson: 'Park feelings green respite community gathering.'
    },
    {
      id: 'fn83_3',
      title: 'My feelings about forest',
      narrative: [
        'Forest feelings.',
        '',
        'Trees as elders.',
        '',
        'Earth alive.',
        '',
        'I tell forest: elders.'
      ],
      lesson: 'Forest feelings trees as elders earth alive.'
    },
    {
      id: 'fn83_4',
      title: 'My feelings about ocean',
      narrative: [
        'Ocean feelings.',
        '',
        'Vast and rhythmic.',
        '',
        'Self made small.',
        '',
        'I tell ocean: vast.'
      ],
      lesson: 'Ocean feelings vast and rhythmic self made small.'
    },
    {
      id: 'fn83_5',
      title: 'My feelings about mountains',
      narrative: [
        'Mountain feelings.',
        '',
        'Elevation perspective.',
        '',
        'Time deep.',
        '',
        'I tell mountains: perspective.'
      ],
      lesson: 'Mountain feelings elevation perspective time deep.'
    },
    {
      id: 'fn83_6',
      title: 'My feelings about desert',
      narrative: [
        'Desert feelings.',
        '',
        'Vast silence.',
        '',
        'Stark beauty.',
        '',
        'I tell desert: silence.'
      ],
      lesson: 'Desert feelings vast silence stark beauty.'
    },
    {
      id: 'fn83_7',
      title: 'My feelings about lake',
      narrative: [
        'Lake feelings.',
        '',
        'Still water.',
        '',
        'Reflection invited.',
        '',
        'I tell lake: reflection.'
      ],
      lesson: 'Lake feelings still water reflection invited.'
    },
    {
      id: 'fn83_8',
      title: 'My feelings about river',
      narrative: [
        'River feelings.',
        '',
        'Flow rhythm.',
        '',
        'Time moving.',
        '',
        'I tell river: flow.'
      ],
      lesson: 'River feelings flow rhythm time moving.'
    },
    {
      id: 'fn83_9',
      title: 'My feelings about garden',
      narrative: [
        'Garden feelings.',
        '',
        'Earth contact.',
        '',
        'Patience cultivated.',
        '',
        'I tell garden: patience.'
      ],
      lesson: 'Garden feelings earth contact patience cultivated.'
    },
    {
      id: 'fn83_10',
      title: 'My feelings about sky',
      narrative: [
        'Sky feelings.',
        '',
        'Vast canvas.',
        '',
        'Ever-changing.',
        '',
        'I tell sky: vast.'
      ],
      lesson: 'Sky feelings vast canvas ever-changing.'
    },
    {
      id: 'fn83_11',
      title: 'My feelings about sunrise',
      narrative: [
        'Sunrise feelings.',
        '',
        'Day begins.',
        '',
        'Wonder daily.',
        '',
        'I tell early: sunrise.'
      ],
      lesson: 'Sunrise feelings day begins wonder daily.'
    },
    {
      id: 'fn83_12',
      title: 'My feelings about sunset',
      narrative: [
        'Sunset feelings.',
        '',
        'Day completes.',
        '',
        'Beauty wonders.',
        '',
        'I tell sunset: beauty.'
      ],
      lesson: 'Sunset feelings day completes beauty wonders.'
    },
    {
      id: 'fn83_13',
      title: 'My feelings about stars',
      narrative: [
        'Star feelings.',
        '',
        'Universe vast.',
        '',
        'Self tiny but connected.',
        '',
        'I tell stars: connected.'
      ],
      lesson: 'Star feelings universe vast self tiny but connected.'
    },
    {
      id: 'fn83_14',
      title: 'My feelings about moon',
      narrative: [
        'Moon feelings.',
        '',
        'Cyclical companion.',
        '',
        'Time measured.',
        '',
        'I tell moon: cyclical.'
      ],
      lesson: 'Moon feelings cyclical companion time measured.'
    },
    {
      id: 'fn83_15',
      title: 'My feelings about nature integrated',
      narrative: [
        'Nature integrated.',
        '',
        'Whole earth.',
        '',
        'Belonging felt.',
        '',
        'I tell earth: belonging.'
      ],
      lesson: 'Nature integrated whole earth belonging felt.'
    }
  ];

  var FEELING_NARRATIVES_76 = [
    {
      id: 'fn76_1',
      title: 'My feelings about choice freedom',
      narrative: [
        'Choice freedom.',
        '',
        'Power claimed.',
        '',
        'Direction chosen.',
        '',
        'I tell stuck: choice.'
      ],
      lesson: 'Choice freedom power claimed direction chosen.'
    },
    {
      id: 'fn76_2',
      title: 'My feelings about agency',
      narrative: [
        'Agency feelings.',
        '',
        'Own life directed.',
        '',
        'Empowerment built.',
        '',
        'I tell powerless: agency.'
      ],
      lesson: 'Agency feelings own life directed empowerment built.'
    },
    {
      id: 'fn76_3',
      title: 'My feelings about empowerment',
      narrative: [
        'Empowerment feelings.',
        '',
        'Voice raised.',
        '',
        'Action taken.',
        '',
        'I tell silenced: voice.'
      ],
      lesson: 'Empowerment feelings voice raised action taken.'
    },
    {
      id: 'fn76_4',
      title: 'My feelings about freedom',
      narrative: [
        'Freedom feelings.',
        '',
        'Constraint released.',
        '',
        'Choice expanded.',
        '',
        'I tell constrained: freedom.'
      ],
      lesson: 'Freedom feelings constraint released choice expanded.'
    },
    {
      id: 'fn76_5',
      title: 'My feelings about independence',
      narrative: [
        'Independence feelings.',
        '',
        'Self-reliance.',
        '',
        'Connection still important.',
        '',
        'I tell independent: both.'
      ],
      lesson: 'Independence feelings self-reliance connection still important.'
    },
    {
      id: 'fn76_6',
      title: 'My feelings about interdependence',
      narrative: [
        'Interdependence feelings.',
        '',
        'Mutual reliance.',
        '',
        'Healthy connection.',
        '',
        'I tell isolated: interdependence.'
      ],
      lesson: 'Interdependence feelings mutual reliance healthy connection.'
    },
    {
      id: 'fn76_7',
      title: 'My feelings about responsibility',
      narrative: [
        'Responsibility feelings.',
        '',
        'Own actions.',
        '',
        'Boundary honored.',
        '',
        'I tell over-responsible: boundary.'
      ],
      lesson: 'Responsibility feelings own actions boundary honored.'
    },
    {
      id: 'fn76_8',
      title: 'My feelings about accountability',
      narrative: [
        'Accountability feelings.',
        '',
        'Own up.',
        '',
        'Repair offered.',
        '',
        'I tell defensive: accountability.'
      ],
      lesson: 'Accountability feelings own up repair offered.'
    },
    {
      id: 'fn76_9',
      title: 'My feelings about ownership',
      narrative: [
        'Ownership feelings.',
        '',
        'Choices owned.',
        '',
        'Power claimed.',
        '',
        'I tell victim: ownership.'
      ],
      lesson: 'Ownership feelings choices owned power claimed.'
    },
    {
      id: 'fn76_10',
      title: 'My feelings about consent',
      narrative: [
        'Consent feelings.',
        '',
        'Yes enthusiastic.',
        '',
        'No respected.',
        '',
        'I tell consent: both.'
      ],
      lesson: 'Consent feelings yes enthusiastic no respected.'
    },
    {
      id: 'fn76_11',
      title: 'My feelings about boundaries respected',
      narrative: [
        'Boundaries respected.',
        '',
        'Safety felt.',
        '',
        'Trust grows.',
        '',
        'I tell respected: trust.'
      ],
      lesson: 'Boundaries respected safety felt trust grows.'
    },
    {
      id: 'fn76_12',
      title: 'My feelings about voice claimed',
      narrative: [
        'Voice claimed.',
        '',
        'Truth spoken.',
        '',
        'Self respected.',
        '',
        'I tell silenced: voice.'
      ],
      lesson: 'Voice claimed truth spoken self respected.'
    },
    {
      id: 'fn76_13',
      title: 'My feelings about authenticity expressed',
      narrative: [
        'Authenticity expressed.',
        '',
        'True self.',
        '',
        'Mask removed.',
        '',
        'I tell masking: authentic.'
      ],
      lesson: 'Authenticity expressed true self mask removed.'
    },
    {
      id: 'fn76_14',
      title: 'My feelings about whole self',
      narrative: [
        'Whole self.',
        '',
        'All parts welcome.',
        '',
        'Integration daily.',
        '',
        'I tell fragmented: whole.'
      ],
      lesson: 'Whole self all parts welcome integration daily.'
    },
    {
      id: 'fn76_15',
      title: 'My feelings about agency integrated',
      narrative: [
        'Agency integrated.',
        '',
        'Choice claimed daily.',
        '',
        'Power lived.',
        '',
        'I tell powerless: claim.'
      ],
      lesson: 'Agency integrated choice claimed daily power lived.'
    }
  ];

  var FEELING_NARRATIVES_77 = [
    {
      id: 'fn77_1',
      title: 'My feelings of friendship love',
      narrative: [
        'Friendship love.',
        '',
        'Philia type.',
        '',
        'Chosen family.',
        '',
        'I tell friendship: chosen.'
      ],
      lesson: 'Friendship love philia type chosen family.'
    },
    {
      id: 'fn77_2',
      title: 'My feelings of romantic love',
      narrative: [
        'Romantic love.',
        '',
        'Eros type.',
        '',
        'Plus commitment.',
        '',
        'I tell romantic: plus.'
      ],
      lesson: 'Romantic love eros type plus commitment.'
    },
    {
      id: 'fn77_3',
      title: 'My feelings of familial love',
      narrative: [
        'Familial love.',
        '',
        'Storge type.',
        '',
        'Bond inherent.',
        '',
        'I tell family: storge.'
      ],
      lesson: 'Familial love storge type bond inherent.'
    },
    {
      id: 'fn77_4',
      title: 'My feelings of self-love',
      narrative: [
        'Self-love.',
        '',
        'Philautia type.',
        '',
        'Foundation built.',
        '',
        'I tell self-hate: philautia.'
      ],
      lesson: 'Self-love philautia type foundation built.'
    },
    {
      id: 'fn77_5',
      title: 'My feelings of compassionate love',
      narrative: [
        'Compassionate love.',
        '',
        'Agape type.',
        '',
        'Universal love.',
        '',
        'I tell universal: agape.'
      ],
      lesson: 'Compassionate love agape type universal love.'
    },
    {
      id: 'fn77_6',
      title: 'My feelings of playful love',
      narrative: [
        'Playful love.',
        '',
        'Ludus type.',
        '',
        'Joy in connection.',
        '',
        'I tell playful: ludus.'
      ],
      lesson: 'Playful love ludus type joy in connection.'
    },
    {
      id: 'fn77_7',
      title: 'My feelings of enduring love',
      narrative: [
        'Enduring love.',
        '',
        'Pragma type.',
        '',
        'Long commitment.',
        '',
        'I tell enduring: pragma.'
      ],
      lesson: 'Enduring love pragma type long commitment.'
    },
    {
      id: 'fn77_8',
      title: 'My feelings of obsessive love',
      narrative: [
        'Obsessive love.',
        '',
        'Mania type.',
        '',
        'Healing needed.',
        '',
        'I tell obsessive: heal.'
      ],
      lesson: 'Obsessive love mania type healing needed.'
    },
    {
      id: 'fn77_9',
      title: 'My feelings of selfless love',
      narrative: [
        'Selfless love.',
        '',
        'Boundaries needed too.',
        '',
        'Sustainable giving.',
        '',
        'I tell selfless: boundaries.'
      ],
      lesson: 'Selfless love boundaries needed too sustainable giving.'
    },
    {
      id: 'fn77_10',
      title: 'My feelings of love loss',
      narrative: [
        'Love loss.',
        '',
        'Profound grief.',
        '',
        'Healing slow.',
        '',
        'I tell heartbroken: slow.'
      ],
      lesson: 'Love loss profound grief healing slow.'
    },
    {
      id: 'fn77_11',
      title: 'My feelings of love continuing',
      narrative: [
        'Love continuing.',
        '',
        'Through death.',
        '',
        'Through distance.',
        '',
        'I tell long-love: continues.'
      ],
      lesson: 'Love continuing through death through distance.'
    },
    {
      id: 'fn77_12',
      title: 'My feelings of unrequited love',
      narrative: [
        'Unrequited love.',
        '',
        'Real pain.',
        '',
        'Mourning needed.',
        '',
        'I tell unrequited: mourn.'
      ],
      lesson: 'Unrequited love real pain mourning needed.'
    },
    {
      id: 'fn77_13',
      title: 'My feelings of falling in love',
      narrative: [
        'Falling feelings.',
        '',
        'Brain chemistry.',
        '',
        'Choose alongside.',
        '',
        'I tell falling: choose.'
      ],
      lesson: 'Falling feelings brain chemistry choose alongside.'
    },
    {
      id: 'fn77_14',
      title: 'My feelings of love deepening',
      narrative: [
        'Love deepening.',
        '',
        'Beyond infatuation.',
        '',
        'Commitment grows.',
        '',
        'I tell long-love: deepens.'
      ],
      lesson: 'Love deepening beyond infatuation commitment grows.'
    },
    {
      id: 'fn77_15',
      title: 'My feelings of all love integrated',
      narrative: [
        'All love integrated.',
        '',
        'Multiple types.',
        '',
        'Whole heart.',
        '',
        'I tell love: integrate.'
      ],
      lesson: 'All love integrated multiple types whole heart.'
    }
  ];

  var FEELING_NARRATIVES_78 = [
    {
      id: 'fn78_1',
      title: 'My feelings during depression episode',
      narrative: [
        'Depression episode.',
        '',
        'Treatment essential.',
        '',
        'Wave passes.',
        '',
        'I tell depressed: treatment.'
      ],
      lesson: 'Depression episode treatment essential wave passes.'
    },
    {
      id: 'fn78_2',
      title: 'My feelings during anxiety attack',
      narrative: [
        'Anxiety attack.',
        '',
        'Body amped.',
        '',
        'Grounding tools.',
        '',
        'I tell attacked: grounding.'
      ],
      lesson: 'Anxiety attack body amped grounding tools.'
    },
    {
      id: 'fn78_3',
      title: 'My feelings during panic attack',
      narrative: [
        'Panic attack.',
        '',
        'Wave peaks then passes.',
        '',
        'Not dying.',
        '',
        'I tell panicking: not dying.'
      ],
      lesson: 'Panic attack wave peaks then passes not dying.'
    },
    {
      id: 'fn78_4',
      title: 'My feelings during dissociation',
      narrative: [
        'Dissociation episode.',
        '',
        'Body protects.',
        '',
        'Grounding back.',
        '',
        'I tell dissociating: ground.'
      ],
      lesson: 'Dissociation episode body protects grounding back.'
    },
    {
      id: 'fn78_5',
      title: 'My feelings during flashback',
      narrative: [
        'Flashback feelings.',
        '',
        'Past intrudes.',
        '',
        'This is now.',
        '',
        'I tell flashback: now.'
      ],
      lesson: 'Flashback feelings past intrudes this is now.'
    },
    {
      id: 'fn78_6',
      title: 'My feelings during intrusive thoughts',
      narrative: [
        'Intrusive thoughts.',
        '',
        'Not me.',
        '',
        'Pass through.',
        '',
        'I tell intrusive: not me.'
      ],
      lesson: 'Intrusive thoughts not me pass through.'
    },
    {
      id: 'fn78_7',
      title: 'My feelings during rumination',
      narrative: [
        'Rumination feelings.',
        '',
        'Loop catch.',
        '',
        'Break loop.',
        '',
        'I tell ruminating: break.'
      ],
      lesson: 'Rumination feelings loop catch break loop.'
    },
    {
      id: 'fn78_8',
      title: 'My feelings during meltdown',
      narrative: [
        'Meltdown feelings.',
        '',
        'Capacity exceeded.',
        '',
        'Sensory overload.',
        '',
        'I tell melting: capacity.'
      ],
      lesson: 'Meltdown feelings capacity exceeded sensory overload.'
    },
    {
      id: 'fn78_9',
      title: 'My feelings during shutdown',
      narrative: [
        'Shutdown feelings.',
        '',
        'Body collapses.',
        '',
        'Overwhelm response.',
        '',
        'I tell shutdown: overwhelm.'
      ],
      lesson: 'Shutdown feelings body collapses overwhelm response.'
    },
    {
      id: 'fn78_10',
      title: 'My feelings during burnout',
      narrative: [
        'Burnout feelings.',
        '',
        'Chronic exhaustion.',
        '',
        'Major rest needed.',
        '',
        'I tell burnt: rest.'
      ],
      lesson: 'Burnout feelings chronic exhaustion major rest needed.'
    },
    {
      id: 'fn78_11',
      title: 'My feelings during crisis',
      narrative: [
        'Crisis feelings.',
        '',
        'Help essential.',
        '',
        'Call lifeline.',
        '',
        'I tell crisis: call.'
      ],
      lesson: 'Crisis feelings help essential call lifeline.'
    },
    {
      id: 'fn78_12',
      title: 'My feelings of suicidal thoughts',
      narrative: [
        'Suicidal thoughts.',
        '',
        '988 lifeline.',
        '',
        'Help available.',
        '',
        'I tell at-risk: 988.'
      ],
      lesson: 'Suicidal thoughts 988 lifeline help available.'
    },
    {
      id: 'fn78_13',
      title: 'My feelings during recovery',
      narrative: [
        'Recovery feelings.',
        '',
        'Hope plus setbacks.',
        '',
        'Patience needed.',
        '',
        'I tell recovering: patience.'
      ],
      lesson: 'Recovery feelings hope plus setbacks patience needed.'
    },
    {
      id: 'fn78_14',
      title: 'My feelings of relapse',
      narrative: [
        'Relapse feelings.',
        '',
        'Shame possible.',
        '',
        'Compassion needed.',
        '',
        'I tell relapsing: compassion.'
      ],
      lesson: 'Relapse feelings shame possible compassion needed.'
    },
    {
      id: 'fn78_15',
      title: 'My feelings during reset after crisis',
      narrative: [
        'Reset after crisis.',
        '',
        'Slow rebuilding.',
        '',
        'Support sought.',
        '',
        'I tell post-crisis: slow.'
      ],
      lesson: 'Reset after crisis slow rebuilding support sought.'
    }
  ];

  var FEELING_NARRATIVES_79 = [
    {
      id: 'fn79_1',
      title: 'My feelings of hope reborn',
      narrative: [
        'Hope reborn.',
        '',
        'After dark.',
        '',
        'Light returns.',
        '',
        'I tell dark: hope returns.'
      ],
      lesson: 'Hope reborn after dark light returns.'
    },
    {
      id: 'fn79_2',
      title: 'My feelings of new chapter',
      narrative: [
        'New chapter.',
        '',
        'Past honored.',
        '',
        'Future open.',
        '',
        'I tell transitioning: open.'
      ],
      lesson: 'New chapter past honored future open.'
    },
    {
      id: 'fn79_3',
      title: 'My feelings of fresh start',
      narrative: [
        'Fresh start.',
        '',
        'Permission granted.',
        '',
        'New direction.',
        '',
        'I tell stuck: fresh start.'
      ],
      lesson: 'Fresh start permission granted new direction.'
    },
    {
      id: 'fn79_4',
      title: 'My feelings of renewal',
      narrative: [
        'Renewal feelings.',
        '',
        'Body refreshed.',
        '',
        'Mind opens.',
        '',
        'I tell tired: renewal.'
      ],
      lesson: 'Renewal feelings body refreshed mind opens.'
    },
    {
      id: 'fn79_5',
      title: 'My feelings of resurrection',
      narrative: [
        'Resurrection feelings.',
        '',
        'After loss.',
        '',
        'Self emerges new.',
        '',
        'I tell lost-self: emerges.'
      ],
      lesson: 'Resurrection feelings after loss self emerges new.'
    },
    {
      id: 'fn79_6',
      title: 'My feelings of rebirth',
      narrative: [
        'Rebirth feelings.',
        '',
        'Old self released.',
        '',
        'New self born.',
        '',
        'I tell transitioning: rebirth.'
      ],
      lesson: 'Rebirth feelings old self released new self born.'
    },
    {
      id: 'fn79_7',
      title: 'My feelings of transformation',
      narrative: [
        'Transformation feelings.',
        '',
        'Profound change.',
        '',
        'New person.',
        '',
        'I tell changed: new.'
      ],
      lesson: 'Transformation feelings profound change new person.'
    },
    {
      id: 'fn79_8',
      title: 'My feelings of evolution',
      narrative: [
        'Evolution feelings.',
        '',
        'Gradual growth.',
        '',
        'Slow change.',
        '',
        'I tell impatient: evolution.'
      ],
      lesson: 'Evolution feelings gradual growth slow change.'
    },
    {
      id: 'fn79_9',
      title: 'My feelings of becoming',
      narrative: [
        'Becoming feelings.',
        '',
        'Always unfolding.',
        '',
        'Process honored.',
        '',
        'I tell becoming: unfolding.'
      ],
      lesson: 'Becoming feelings always unfolding process honored.'
    },
    {
      id: 'fn79_10',
      title: 'My feelings of unfolding',
      narrative: [
        'Unfolding feelings.',
        '',
        'Trust the process.',
        '',
        'Time required.',
        '',
        'I tell controlling: trust.'
      ],
      lesson: 'Unfolding feelings trust the process time required.'
    },
    {
      id: 'fn79_11',
      title: 'My feelings of emerging',
      narrative: [
        'Emerging feelings.',
        '',
        'Slow growth.',
        '',
        'Patience honored.',
        '',
        'I tell emerging: patience.'
      ],
      lesson: 'Emerging feelings slow growth patience honored.'
    },
    {
      id: 'fn79_12',
      title: 'My feelings of blooming',
      narrative: [
        'Blooming feelings.',
        '',
        'Full expression.',
        '',
        'Beauty seen.',
        '',
        'I tell ready: bloom.'
      ],
      lesson: 'Blooming feelings full expression beauty seen.'
    },
    {
      id: 'fn79_13',
      title: 'My feelings of opening',
      narrative: [
        'Opening feelings.',
        '',
        'Petal by petal.',
        '',
        'Heart wider.',
        '',
        'I tell closed: open.'
      ],
      lesson: 'Opening feelings petal by petal heart wider.'
    },
    {
      id: 'fn79_14',
      title: 'My feelings of expanding',
      narrative: [
        'Expanding feelings.',
        '',
        'Capacity grows.',
        '',
        'World larger.',
        '',
        'I tell limited: expand.'
      ],
      lesson: 'Expanding feelings capacity grows world larger.'
    },
    {
      id: 'fn79_15',
      title: 'My feelings of all becoming integrated',
      narrative: [
        'All becoming integrated.',
        '',
        'Continuous practice.',
        '',
        'Lifelong unfolding.',
        '',
        'I tell beginners: lifelong.'
      ],
      lesson: 'All becoming integrated continuous practice lifelong unfolding.'
    }
  ];

  var FEELING_NARRATIVES_80 = [
    {
      id: 'fn80_1',
      title: 'My final feelings practice',
      narrative: [
        'Lifelong practice.',
        '',
        'Daily renewal.',
        '',
        'Never complete.',
        '',
        'I tell beginners: daily renewal.'
      ],
      lesson: 'Lifelong practice daily renewal never complete.'
    },
    {
      id: 'fn80_2',
      title: 'My feelings final daily anchor',
      narrative: [
        'Daily anchor practice.',
        '',
        'Same time, same place.',
        '',
        'Body knows.',
        '',
        'I tell scattered: anchor.'
      ],
      lesson: 'Daily anchor practice same time, same place body knows.'
    },
    {
      id: 'fn80_3',
      title: 'My feelings final weekly review',
      narrative: [
        'Weekly review.',
        '',
        'Patterns observed.',
        '',
        'Adjustment made.',
        '',
        'I tell weekly: review.'
      ],
      lesson: 'Weekly review patterns observed adjustment made.'
    },
    {
      id: 'fn80_4',
      title: 'My feelings final monthly review',
      narrative: [
        'Monthly review.',
        '',
        'Themes emerge.',
        '',
        'Direction set.',
        '',
        'I tell monthly: themes.'
      ],
      lesson: 'Monthly review themes emerge direction set.'
    },
    {
      id: 'fn80_5',
      title: 'My feelings final annual review',
      narrative: [
        'Annual review.',
        '',
        'Year examined.',
        '',
        'Growth noted.',
        '',
        'I tell yearly: examine.'
      ],
      lesson: 'Annual review year examined growth noted.'
    },
    {
      id: 'fn80_6',
      title: 'My feelings final decade review',
      narrative: [
        'Decade review.',
        '',
        'Patterns over time.',
        '',
        'Wisdom emerged.',
        '',
        'I tell decade-marker: review.'
      ],
      lesson: 'Decade review patterns over time wisdom emerged.'
    },
    {
      id: 'fn80_7',
      title: 'My feelings final lifetime review',
      narrative: [
        'Lifetime review.',
        '',
        'Whole journey.',
        '',
        'Meaning made.',
        '',
        'I tell elderly: lifetime.'
      ],
      lesson: 'Lifetime review whole journey meaning made.'
    },
    {
      id: 'fn80_8',
      title: 'My feelings final wisdom shared',
      narrative: [
        'Wisdom shared.',
        '',
        'Generations served.',
        '',
        'Service complete.',
        '',
        'I tell wise: serve.'
      ],
      lesson: 'Wisdom shared generations served service complete.'
    },
    {
      id: 'fn80_9',
      title: 'My feelings final teaching',
      narrative: [
        'Teaching emerges.',
        '',
        'From experience.',
        '',
        'Others benefit.',
        '',
        'I tell experienced: teach.'
      ],
      lesson: 'Teaching emerges from experience others benefit.'
    },
    {
      id: 'fn80_10',
      title: 'My feelings final mentoring',
      narrative: [
        'Mentoring relationship.',
        '',
        'Both grow.',
        '',
        'Mutual benefit.',
        '',
        'I tell mature: mentor.'
      ],
      lesson: 'Mentoring relationship both grow mutual benefit.'
    },
    {
      id: 'fn80_11',
      title: 'My feelings final legacy',
      narrative: [
        'Legacy lived.',
        '',
        'Daily actions.',
        '',
        'What I leave.',
        '',
        'I tell legacy: daily.'
      ],
      lesson: 'Legacy lived daily actions what I leave.'
    },
    {
      id: 'fn80_12',
      title: 'My feelings final integration',
      narrative: [
        'All integrated.',
        '',
        'Body, mind, spirit, community.',
        '',
        'Whole person.',
        '',
        'I tell fragmented: integration.'
      ],
      lesson: 'All integrated body, mind, spirit, community whole person.'
    },
    {
      id: 'fn80_13',
      title: 'My feelings final presence',
      narrative: [
        'Presence ultimate.',
        '',
        'This moment.',
        '',
        'Always.',
        '',
        'I tell scattered: presence.'
      ],
      lesson: 'Presence ultimate this moment always.'
    },
    {
      id: 'fn80_14',
      title: 'My feelings final love',
      narrative: [
        'Love foundation.',
        '',
        'Self and others.',
        '',
        'Always.',
        '',
        'I tell love-curious: foundation.'
      ],
      lesson: 'Love foundation self and others always.'
    },
    {
      id: 'fn80_15',
      title: 'My feelings final invitation',
      narrative: [
        'Invitation extended.',
        '',
        'Feel everything.',
        '',
        'Live fully.',
        '',
        'Welcome whole self.',
        '',
        'I tell all reading: feel and live.'
      ],
      lesson: 'Invitation extended feel everything live fully welcome whole self.'
    }
  ];

  var FEELING_NARRATIVES_71 = [
    {
      id: 'fn71_1',
      title: 'My feelings about anger triggers',
      narrative: [
        'Anger triggers.',
        '',
        'Specific people, situations.',
        '',
        'Inventory built.',
        '',
        'I tell unaware: inventory.'
      ],
      lesson: 'Anger triggers specific people, situations inventory built.'
    },
    {
      id: 'fn71_2',
      title: 'My feelings about anger body signs',
      narrative: [
        'Body signs early.',
        '',
        'Heat, tightness, clench.',
        '',
        'Caught before peak.',
        '',
        'I tell body-deaf: signs.'
      ],
      lesson: 'Body signs early heat, tightness, clench caught before peak.'
    },
    {
      id: 'fn71_3',
      title: 'My feelings about anger thought signs',
      narrative: [
        'Thought signs.',
        '',
        'Always or never words.',
        '',
        'Black white thinking.',
        '',
        'I tell black-white: catch.'
      ],
      lesson: 'Thought signs always or never words black white thinking catch.'
    },
    {
      id: 'fn71_4',
      title: 'My feelings about anger behavior signs',
      narrative: [
        'Behavior signs.',
        '',
        'Voice rising.',
        '',
        'Pacing.',
        '',
        'Slamming.',
        '',
        'I tell unaware: signs.'
      ],
      lesson: 'Behavior signs voice rising, pacing, slamming.'
    },
    {
      id: 'fn71_5',
      title: 'My feelings about anger cool-down',
      narrative: [
        'Cool-down skills.',
        '',
        'Deep breath.',
        '',
        'Step away.',
        '',
        'Cold water.',
        '',
        'I tell hot-angry: cool-down.'
      ],
      lesson: 'Cool-down skills deep breath, step away, cold water.'
    },
    {
      id: 'fn71_6',
      title: 'My feelings about anger time-out',
      narrative: [
        'Adult time-out.',
        '',
        'Step away.',
        '',
        'Return calmer.',
        '',
        'I tell heated: time-out.'
      ],
      lesson: 'Adult time-out step away return calmer.'
    },
    {
      id: 'fn71_7',
      title: 'My feelings about anger expression',
      narrative: [
        'Healthy expression.',
        '',
        'I-statements.',
        '',
        'Specific request.',
        '',
        'I tell yellers: I-statements.'
      ],
      lesson: 'Healthy expression I-statements specific request.'
    },
    {
      id: 'fn71_8',
      title: 'My feelings about anger after',
      narrative: [
        'After anger.',
        '',
        'Repair if needed.',
        '',
        'Apologize specifically.',
        '',
        'I tell after-anger: repair.'
      ],
      lesson: 'After anger repair if needed apologize specifically.'
    },
    {
      id: 'fn71_9',
      title: 'My feelings about anger journaling',
      narrative: [
        'Anger journal.',
        '',
        'Track patterns.',
        '',
        'Triggers identified.',
        '',
        'I tell unaware: journal.'
      ],
      lesson: 'Anger journal track patterns triggers identified.'
    },
    {
      id: 'fn71_10',
      title: 'My feelings about anger in relationships',
      narrative: [
        'Relationship anger.',
        '',
        'Pattern often.',
        '',
        'Therapy helps.',
        '',
        'I tell pattern-stuck: therapy.'
      ],
      lesson: 'Relationship anger pattern often therapy helps.'
    },
    {
      id: 'fn71_11',
      title: 'My feelings about anger at injustice',
      narrative: [
        'Injustice anger.',
        '',
        'Valid response.',
        '',
        'Channel to action.',
        '',
        'I tell injustice: action.'
      ],
      lesson: 'Injustice anger valid response channel to action.'
    },
    {
      id: 'fn71_12',
      title: 'My feelings about anger at self',
      narrative: [
        'Anger at self.',
        '',
        'Inner critic loud.',
        '',
        'Self-compassion replies.',
        '',
        'I tell self-angry: compassion.'
      ],
      lesson: 'Anger at self inner critic loud self-compassion replies.'
    },
    {
      id: 'fn71_13',
      title: 'My feelings about anger validated',
      narrative: [
        'Anger validated.',
        '',
        'Information about need.',
        '',
        'Acted on.',
        '',
        'I tell suppressed: validate.'
      ],
      lesson: 'Anger validated information about need acted on.'
    },
    {
      id: 'fn71_14',
      title: 'My feelings about anger transmuted',
      narrative: [
        'Anger transmuted.',
        '',
        'Energy channeled.',
        '',
        'Creative output.',
        '',
        'I tell stuck-anger: transmute.'
      ],
      lesson: 'Anger transmuted energy channeled creative output.'
    },
    {
      id: 'fn71_15',
      title: 'My feelings about anger integrated',
      narrative: [
        'Anger integrated.',
        '',
        'Signal heeded.',
        '',
        'Action taken.',
        '',
        'I tell anger: integrated.'
      ],
      lesson: 'Anger integrated signal heeded action taken.'
    }
  ];

  var FEELING_NARRATIVES_72 = [
    {
      id: 'fn72_1',
      title: 'My feelings about happiness',
      narrative: [
        'Happiness fleeting.',
        '',
        'Joy specific moments.',
        '',
        'Contentment foundation.',
        '',
        'I tell happiness-chasing: contentment.'
      ],
      lesson: 'Happiness fleeting joy specific moments contentment foundation.'
    },
    {
      id: 'fn72_2',
      title: 'My feelings about joy',
      narrative: [
        'Joy specific.',
        '',
        'Savor moment.',
        '',
        'Body lifted.',
        '',
        'I tell joy-blind: savor.'
      ],
      lesson: 'Joy specific savor moment body lifted.'
    },
    {
      id: 'fn72_3',
      title: 'My feelings about contentment',
      narrative: [
        'Contentment foundation.',
        '',
        'Daily practice.',
        '',
        'Quiet positive.',
        '',
        'I tell excitement-chasing: contentment.'
      ],
      lesson: 'Contentment foundation daily practice quiet positive.'
    },
    {
      id: 'fn72_4',
      title: 'My feelings about flow',
      narrative: [
        'Flow state.',
        '',
        'Time disappears.',
        '',
        'Absorbed deeply.',
        '',
        'I tell scattered: flow.'
      ],
      lesson: 'Flow state time disappears absorbed deeply.'
    },
    {
      id: 'fn72_5',
      title: 'My feelings about engagement',
      narrative: [
        'Engagement feelings.',
        '',
        'Mind plus body present.',
        '',
        'Activity matters.',
        '',
        'I tell disengaged: engagement.'
      ],
      lesson: 'Engagement feelings mind plus body present activity matters.'
    },
    {
      id: 'fn72_6',
      title: 'My feelings about meaning',
      narrative: [
        'Meaning feelings.',
        '',
        'Service shapes.',
        '',
        'Purpose lived.',
        '',
        'I tell meaningless: service.'
      ],
      lesson: 'Meaning feelings service shapes purpose lived.'
    },
    {
      id: 'fn72_7',
      title: 'My feelings about purpose',
      narrative: [
        'Purpose feelings.',
        '',
        'Direction set.',
        '',
        'Energy aligned.',
        '',
        'I tell purposeless: direction.'
      ],
      lesson: 'Purpose feelings direction set energy aligned.'
    },
    {
      id: 'fn72_8',
      title: 'My feelings about connection',
      narrative: [
        'Connection feelings.',
        '',
        'Essential human.',
        '',
        'Daily practice.',
        '',
        'I tell isolated: connection.'
      ],
      lesson: 'Connection feelings essential human daily practice.'
    },
    {
      id: 'fn72_9',
      title: 'My feelings about accomplishment',
      narrative: [
        'Accomplishment feelings.',
        '',
        'Effort rewarded.',
        '',
        'Pride claimed.',
        '',
        'I tell minimizing: claim.'
      ],
      lesson: 'Accomplishment feelings effort rewarded pride claimed.'
    },
    {
      id: 'fn72_10',
      title: 'My feelings about flourishing',
      narrative: [
        'Flourishing feelings.',
        '',
        'Multiple dimensions.',
        '',
        'Whole self thrives.',
        '',
        'I tell flourishing-curious: whole.'
      ],
      lesson: 'Flourishing feelings multiple dimensions whole self thrives.'
    },
    {
      id: 'fn72_11',
      title: 'My feelings about thriving',
      narrative: [
        'Thriving feelings.',
        '',
        'Beyond surviving.',
        '',
        'Life full.',
        '',
        'I tell surviving: thriving.'
      ],
      lesson: 'Thriving feelings beyond surviving life full.'
    },
    {
      id: 'fn72_12',
      title: 'My feelings about life satisfaction',
      narrative: [
        'Life satisfaction.',
        '',
        'Looking back.',
        '',
        'Looking forward.',
        '',
        'Both honored.',
        '',
        'I tell satisfaction: both.'
      ],
      lesson: 'Life satisfaction looking back looking forward both honored.'
    },
    {
      id: 'fn72_13',
      title: 'My feelings about wellbeing',
      narrative: [
        'Wellbeing feelings.',
        '',
        'Multiple aspects.',
        '',
        'Holistic approach.',
        '',
        'I tell well: holistic.'
      ],
      lesson: 'Wellbeing feelings multiple aspects holistic approach.'
    },
    {
      id: 'fn72_14',
      title: 'My feelings about happiness sources',
      narrative: [
        'Happiness sources.',
        '',
        'Connection, meaning, body.',
        '',
        'Cultivated daily.',
        '',
        'I tell sources: cultivate.'
      ],
      lesson: 'Happiness sources connection, meaning, body cultivated daily.'
    },
    {
      id: 'fn72_15',
      title: 'My feelings about happiness integrated',
      narrative: [
        'Happiness integrated.',
        '',
        'Daily practices.',
        '',
        'Foundation built.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'Happiness integrated daily practices foundation built.'
    }
  ];

  var FEELING_NARRATIVES_73 = [
    {
      id: 'fn73_1',
      title: 'My feelings about success defined',
      narrative: [
        'Success defined personally.',
        '',
        'Not others measure.',
        '',
        'Own metrics.',
        '',
        'I tell external-success: own.'
      ],
      lesson: 'Success defined personally not others measure own metrics.'
    },
    {
      id: 'fn73_2',
      title: 'My feelings about success at work',
      narrative: [
        'Work success.',
        '',
        'Beyond promotion.',
        '',
        'Meaning sought.',
        '',
        'I tell promotion-bound: meaning.'
      ],
      lesson: 'Work success beyond promotion meaning sought.'
    },
    {
      id: 'fn73_3',
      title: 'My feelings about success in relationships',
      narrative: [
        'Relationship success.',
        '',
        'Connection deep.',
        '',
        'Repair possible.',
        '',
        'I tell relationship: repair.'
      ],
      lesson: 'Relationship success connection deep repair possible.'
    },
    {
      id: 'fn73_4',
      title: 'My feelings about success at home',
      narrative: [
        'Home success.',
        '',
        'Safe haven.',
        '',
        'Restoration possible.',
        '',
        'I tell home: haven.'
      ],
      lesson: 'Home success safe haven restoration possible.'
    },
    {
      id: 'fn73_5',
      title: 'My feelings about success with self',
      narrative: [
        'Self success.',
        '',
        'Authentic living.',
        '',
        'Whole person.',
        '',
        'I tell self-stuck: authentic.'
      ],
      lesson: 'Self success authentic living whole person.'
    },
    {
      id: 'fn73_6',
      title: 'My feelings about success in body',
      narrative: [
        'Body success.',
        '',
        'Health practices.',
        '',
        'Function honored.',
        '',
        'I tell body-curious: health.'
      ],
      lesson: 'Body success health practices function honored.'
    },
    {
      id: 'fn73_7',
      title: 'My feelings about success in mind',
      narrative: [
        'Mind success.',
        '',
        'Learning continued.',
        '',
        'Cognitive health.',
        '',
        'I tell mind-curious: learning.'
      ],
      lesson: 'Mind success learning continued cognitive health.'
    },
    {
      id: 'fn73_8',
      title: 'My feelings about success in spirit',
      narrative: [
        'Spirit success.',
        '',
        'Sacred touched.',
        '',
        'Daily practice.',
        '',
        'I tell spirit-curious: daily.'
      ],
      lesson: 'Spirit success sacred touched daily practice.'
    },
    {
      id: 'fn73_9',
      title: 'My feelings about success in community',
      narrative: [
        'Community success.',
        '',
        'Belonging plus contribution.',
        '',
        'Both directions.',
        '',
        'I tell community: both.'
      ],
      lesson: 'Community success belonging plus contribution both directions.'
    },
    {
      id: 'fn73_10',
      title: 'My feelings about success multi-dimensional',
      narrative: [
        'Multi-dimensional success.',
        '',
        'Body, mind, spirit, community.',
        '',
        'All honored.',
        '',
        'I tell narrow-success: multi.'
      ],
      lesson: 'Multi-dimensional success body, mind, spirit, community all honored.'
    },
    {
      id: 'fn73_11',
      title: 'My feelings about failure',
      narrative: [
        'Failure feelings.',
        '',
        'Reframe as learning.',
        '',
        'Growth mindset.',
        '',
        'I tell failure-stuck: reframe.'
      ],
      lesson: 'Failure feelings reframe as learning growth mindset.'
    },
    {
      id: 'fn73_12',
      title: 'My feelings about setbacks',
      narrative: [
        'Setback feelings.',
        '',
        'Temporary state.',
        '',
        'Resilience built.',
        '',
        'I tell setback: temporary.'
      ],
      lesson: 'Setback feelings temporary state resilience built.'
    },
    {
      id: 'fn73_13',
      title: 'My feelings about resilience',
      narrative: [
        'Resilience feelings.',
        '',
        'Bounce back built.',
        '',
        'Practice creates.',
        '',
        'I tell weak-feeling: practice.'
      ],
      lesson: 'Resilience feelings bounce back built practice creates.'
    },
    {
      id: 'fn73_14',
      title: 'My feelings about grit',
      narrative: [
        'Grit feelings.',
        '',
        'Long-term goal.',
        '',
        'Persistence sustained.',
        '',
        'I tell quitting: grit.'
      ],
      lesson: 'Grit feelings long-term goal persistence sustained.'
    },
    {
      id: 'fn73_15',
      title: 'My feelings about all integrated success',
      narrative: [
        'All integrated.',
        '',
        'Whole life success.',
        '',
        'Multi-dimensional.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'All integrated whole life success multi-dimensional.'
    }
  ];

  var FEELING_NARRATIVES_74 = [
    {
      id: 'fn74_1',
      title: 'My feelings about end of life',
      narrative: [
        'End of life feelings.',
        '',
        'Mortality close.',
        '',
        'Meaning made.',
        '',
        'I tell terminal: meaning.'
      ],
      lesson: 'End of life feelings mortality close meaning made.'
    },
    {
      id: 'fn74_2',
      title: 'My feelings about saying goodbye',
      narrative: [
        'Saying goodbye.',
        '',
        'Profound moment.',
        '',
        'Love expressed.',
        '',
        'I tell goodbye-difficult: love.'
      ],
      lesson: 'Saying goodbye profound moment love expressed.'
    },
    {
      id: 'fn74_3',
      title: 'My feelings about being witness to death',
      narrative: [
        'Witnessing death.',
        '',
        'Sacred experience.',
        '',
        'Care offered.',
        '',
        'I tell witnesses: sacred.'
      ],
      lesson: 'Witnessing death sacred experience care offered.'
    },
    {
      id: 'fn74_4',
      title: 'My feelings about hospice',
      narrative: [
        'Hospice feelings.',
        '',
        'Care plus dignity.',
        '',
        'Family supported.',
        '',
        'I tell hospice: dignity.'
      ],
      lesson: 'Hospice feelings care plus dignity family supported.'
    },
    {
      id: 'fn74_5',
      title: 'My feelings about palliative care',
      narrative: [
        'Palliative care.',
        '',
        'Comfort prioritized.',
        '',
        'Quality of life.',
        '',
        'I tell palliative: quality.'
      ],
      lesson: 'Palliative care comfort prioritized quality of life.'
    },
    {
      id: 'fn74_6',
      title: 'My feelings about death anxiety',
      narrative: [
        'Death anxiety.',
        '',
        'Existential therapy.',
        '',
        'Acceptance work.',
        '',
        'I tell death-anxious: therapy.'
      ],
      lesson: 'Death anxiety existential therapy acceptance work.'
    },
    {
      id: 'fn74_7',
      title: 'My feelings about mortality awareness',
      narrative: [
        'Mortality awareness.',
        '',
        'Life lived fuller.',
        '',
        'Each moment matters.',
        '',
        'I tell mortality-curious: fuller.'
      ],
      lesson: 'Mortality awareness life lived fuller each moment matters.'
    },
    {
      id: 'fn74_8',
      title: 'My feelings about funeral planning',
      narrative: [
        'Funeral planning.',
        '',
        'Self-determination.',
        '',
        'Family ease.',
        '',
        'I tell planning: ease.'
      ],
      lesson: 'Funeral planning self-determination family ease.'
    },
    {
      id: 'fn74_9',
      title: 'My feelings about advance directives',
      narrative: [
        'Advance directives.',
        '',
        'Wishes clear.',
        '',
        'Family knows.',
        '',
        'I tell advance: clear.'
      ],
      lesson: 'Advance directives wishes clear family knows.'
    },
    {
      id: 'fn74_10',
      title: 'My feelings about will planning',
      narrative: [
        'Will planning.',
        '',
        'Legacy decisions.',
        '',
        'Heirs protected.',
        '',
        'I tell will: decisions.'
      ],
      lesson: 'Will planning legacy decisions heirs protected.'
    },
    {
      id: 'fn74_11',
      title: 'My feelings about ethical will',
      narrative: [
        'Ethical will.',
        '',
        'Values passed.',
        '',
        'Story shared.',
        '',
        'I tell legacy: values.'
      ],
      lesson: 'Ethical will values passed story shared.'
    },
    {
      id: 'fn74_12',
      title: 'My feelings about leaving legacy',
      narrative: [
        'Legacy leaving.',
        '',
        'Beyond material.',
        '',
        'Stories and values.',
        '',
        'I tell legacy: beyond.'
      ],
      lesson: 'Legacy leaving beyond material stories and values.'
    },
    {
      id: 'fn74_13',
      title: 'My feelings about life review',
      narrative: [
        'Life review.',
        '',
        'Patterns examined.',
        '',
        'Wisdom distilled.',
        '',
        'I tell elderly: review.'
      ],
      lesson: 'Life review patterns examined wisdom distilled.'
    },
    {
      id: 'fn74_14',
      title: 'My feelings about reconciliation before death',
      narrative: [
        'Reconciliation timed.',
        '',
        'Estrangements healed.',
        '',
        'Peace sought.',
        '',
        'I tell estranged: timed.'
      ],
      lesson: 'Reconciliation timed estrangements healed peace sought.'
    },
    {
      id: 'fn74_15',
      title: 'My feelings about death integrated',
      narrative: [
        'Death integrated.',
        '',
        'Part of life.',
        '',
        'Not avoided.',
        '',
        'I tell death-avoidant: integrate.'
      ],
      lesson: 'Death integrated part of life not avoided.'
    }
  ];

  var FEELING_NARRATIVES_75 = [
    {
      id: 'fn75_1',
      title: 'My feelings of all human integrated',
      narrative: [
        'All human feelings.',
        '',
        'Honored.',
        '',
        'Welcome.',
        '',
        'I tell suppressing: honor all.'
      ],
      lesson: 'All human feelings honored welcome.'
    },
    {
      id: 'fn75_2',
      title: 'My feelings final commitment',
      narrative: [
        'Final commitment.',
        '',
        'Daily practice.',
        '',
        'Lifelong work.',
        '',
        'I tell beginners: commitment.'
      ],
      lesson: 'Final commitment daily practice lifelong work.'
    },
    {
      id: 'fn75_3',
      title: 'My feelings final invitation',
      narrative: [
        'Invitation extended.',
        '',
        'Feel everything.',
        '',
        'Live fully.',
        '',
        'I tell all: feel and live.'
      ],
      lesson: 'Final invitation feel everything live fully.'
    },
    {
      id: 'fn75_4',
      title: 'My feelings final practice',
      narrative: [
        'Practice never ends.',
        '',
        'Daily renewal.',
        '',
        'Wisdom emerges.',
        '',
        'I tell beginners: never ends.'
      ],
      lesson: 'Practice never ends daily renewal wisdom emerges.'
    },
    {
      id: 'fn75_5',
      title: 'My feelings final acceptance',
      narrative: [
        'Acceptance ultimate.',
        '',
        'All emotions valid.',
        '',
        'Self welcome.',
        '',
        'I tell beginners: acceptance.'
      ],
      lesson: 'Acceptance ultimate all emotions valid self welcome.'
    },
    {
      id: 'fn75_6',
      title: 'My feelings final compassion',
      narrative: [
        'Compassion daily.',
        '',
        'Self and others.',
        '',
        'Bridge always.',
        '',
        'I tell harsh: compassion.'
      ],
      lesson: 'Compassion daily self and others bridge always.'
    },
    {
      id: 'fn75_7',
      title: 'My feelings final love',
      narrative: [
        'Love foundation.',
        '',
        'Self and others.',
        '',
        'Anchor of life.',
        '',
        'I tell beginners: love anchor.'
      ],
      lesson: 'Love foundation self and others anchor of life.'
    },
    {
      id: 'fn75_8',
      title: 'My feelings final wisdom',
      narrative: [
        'Wisdom shared.',
        '',
        'Generations served.',
        '',
        'Service complete.',
        '',
        'I tell experienced: wisdom.'
      ],
      lesson: 'Wisdom shared generations served service complete.'
    },
    {
      id: 'fn75_9',
      title: 'My feelings final humility',
      narrative: [
        'Humility maintained.',
        '',
        'Always learning.',
        '',
        'Beginners mind.',
        '',
        'I tell mature: humility.'
      ],
      lesson: 'Humility maintained always learning beginners mind.'
    },
    {
      id: 'fn75_10',
      title: 'My feelings final gratitude',
      narrative: [
        'Gratitude lifelong.',
        '',
        'Daily practice.',
        '',
        'Foundation built.',
        '',
        'I tell beginners: gratitude.'
      ],
      lesson: 'Gratitude lifelong daily practice foundation built.'
    },
    {
      id: 'fn75_11',
      title: 'My feelings final wholeness',
      narrative: [
        'Wholeness achieved.',
        '',
        'All parts welcome.',
        '',
        'Integration complete.',
        '',
        'I tell fragmented: wholeness.'
      ],
      lesson: 'Wholeness achieved all parts welcome integration complete.'
    },
    {
      id: 'fn75_12',
      title: 'My feelings final integration',
      narrative: [
        'All integrated.',
        '',
        'Whole person.',
        '',
        'Years of work.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'All integrated whole person years of work.'
    },
    {
      id: 'fn75_13',
      title: 'My feelings final wisdom for others',
      narrative: [
        'Wisdom for others.',
        '',
        'Teaching emerging.',
        '',
        'Service shaping.',
        '',
        'I tell wise: share.'
      ],
      lesson: 'Wisdom for others teaching emerging service shaping.'
    },
    {
      id: 'fn75_14',
      title: 'My feelings final hope',
      narrative: [
        'Hope cultivated.',
        '',
        'Future possible.',
        '',
        'Practice continues.',
        '',
        'I tell hopeless: cultivate.'
      ],
      lesson: 'Hope cultivated future possible practice continues.'
    },
    {
      id: 'fn75_15',
      title: 'My feelings final word always: feel',
      narrative: [
        'Final word always: feel.',
        '',
        'All emotions welcome.',
        '',
        'Whole self honored.',
        '',
        'I tell all reading: feel everything.'
      ],
      lesson: 'Final word always: feel; all emotions welcome; whole self honored.'
    }
  ];

  var FEELING_FINAL_PRINCIPLES = [
    {
      id: 'ffp_1',
      principle: 'All feelings are valid information.',
      explanation: 'Feelings inform about needs, boundaries, values; do not suppress.'
    },
    {
      id: 'ffp_2',
      principle: 'Anger is signal not enemy; signals violated boundary or unmet need.',
      explanation: 'Honor what anger points to; pause before reactive action.'
    },
    {
      id: 'ffp_3',
      principle: 'Feelings come in waves with 90-second peaks when allowed.',
      explanation: 'Sit with wave; suppression prolongs; allowance passes through.'
    },
    {
      id: 'ffp_4',
      principle: 'Naming feelings activates prefrontal cortex; name to tame.',
      explanation: 'Specific vocabulary calms emotional intensity through naming.'
    },
    {
      id: 'ffp_5',
      principle: 'Body holds feelings; body cues inform emotional state.',
      explanation: 'Tightness, heat, heaviness map to specific emotions worth heeding.'
    },
    {
      id: 'ffp_6',
      principle: 'Choice point exists between feeling and action; pause and choose.',
      explanation: 'Brief but real pause enables intentional response not reactive action.'
    },
    {
      id: 'ffp_7',
      principle: 'Shame is signal of belonging risk; not truth about self.',
      explanation: 'Shame heals in community; spoken aloud loses power.'
    },
    {
      id: 'ffp_8',
      principle: 'Guilt is corrective; action wrong not me; repair attempted.',
      explanation: 'Healthy guilt differs from shame; guilt points to specific action.'
    },
    {
      id: 'ffp_9',
      principle: 'Mixed emotions are valid; love plus fear, joy plus sadness.',
      explanation: 'Two feelings can coexist; complexity is human.'
    },
    {
      id: 'ffp_10',
      principle: 'Body work releases held emotions; somatic practice essential.',
      explanation: 'Body holds what mind cannot; release through movement, breath, touch.'
    },
    {
      id: 'ffp_11',
      principle: 'Cool-down skills practiced when calm work in anger.',
      explanation: 'Muscle memory built outside crisis enables in-crisis access.'
    },
    {
      id: 'ffp_12',
      principle: 'Trigger inventory identifies patterns; awareness enables prevention.',
      explanation: 'Specific people, situations, body states; tracked over time.'
    },
    {
      id: 'ffp_13',
      principle: 'Healthy expression uses I-statements; not blaming you-statements.',
      explanation: 'I feel angry when versus you make me angry; communication built.'
    },
    {
      id: 'ffp_14',
      principle: 'Repair after conflict essential; relationship deepens through repair.',
      explanation: 'Vulnerability needed; apologize specifically; trust rebuilds.'
    },
    {
      id: 'ffp_15',
      principle: 'Self-compassion practice softens inner critic.',
      explanation: 'Speak to self as friend; daily practice builds foundation.'
    },
    {
      id: 'ffp_16',
      principle: 'Therapy provides container for deep emotion work.',
      explanation: 'Weekly hour with skilled professional enables deeper processing.'
    },
    {
      id: 'ffp_17',
      principle: 'Community heals what isolation amplifies.',
      explanation: 'Group support shares experience; you are not alone.'
    },
    {
      id: 'ffp_18',
      principle: 'Children learn feelings vocabulary from parents modeling.',
      explanation: 'Name your feelings out loud; children inherit awareness.'
    },
    {
      id: 'ffp_19',
      principle: 'Emotional regulation is lifelong practice not destination.',
      explanation: 'Daily renewal; never complete; refinement continues.'
    },
    {
      id: 'ffp_20',
      principle: 'All feelings welcome in whole self; integration is destination.',
      explanation: 'Suppression fragments; welcome integrates whole person.'
    }
  ];

  var FEELING_NARRATIVES_66 = [
    {
      id: 'fn66_1',
      title: 'My feelings about my future',
      narrative: [
        'Future feelings.',
        '',
        'Hope and uncertainty.',
        '',
        'Both held.',
        '',
        'I tell future: both.'
      ],
      lesson: 'Future feelings hope and uncertainty both held.'
    },
    {
      id: 'fn66_2',
      title: 'My feelings about my past',
      narrative: [
        'Past feelings.',
        '',
        'Memory shifts.',
        '',
        'Integration ongoing.',
        '',
        'I tell past: integration.'
      ],
      lesson: 'Past feelings memory shifts integration ongoing.'
    },
    {
      id: 'fn66_3',
      title: 'My feelings about my present',
      narrative: [
        'Present feelings.',
        '',
        'Now matters.',
        '',
        'Always available.',
        '',
        'I tell scattered: present.'
      ],
      lesson: 'Present feelings now matters always available.'
    },
    {
      id: 'fn66_4',
      title: 'My feelings about life choices',
      narrative: [
        'Life choices feelings.',
        '',
        'Owned fully.',
        '',
        'Path created.',
        '',
        'I tell choice-stuck: own.'
      ],
      lesson: 'Life choices feelings owned fully path created.'
    },
    {
      id: 'fn66_5',
      title: 'My feelings about regret',
      narrative: [
        'Regret feelings.',
        '',
        'Learning extracted.',
        '',
        'Compassion needed.',
        '',
        'I tell regretful: learning.'
      ],
      lesson: 'Regret feelings learning extracted compassion needed.'
    },
    {
      id: 'fn66_6',
      title: 'My feelings about gratitude for life',
      narrative: [
        'Life gratitude.',
        '',
        'Daily practice.',
        '',
        'Even hard days.',
        '',
        'I tell gratitude: daily.'
      ],
      lesson: 'Life gratitude daily practice even hard days.'
    },
    {
      id: 'fn66_7',
      title: 'My feelings about meaning of life',
      narrative: [
        'Meaning of life.',
        '',
        'Made not found.',
        '',
        'Service shapes.',
        '',
        'I tell meaning-seeking: made.'
      ],
      lesson: 'Meaning of life made not found service shapes.'
    },
    {
      id: 'fn66_8',
      title: 'My feelings about death',
      narrative: [
        'Death feelings.',
        '',
        'Existential work.',
        '',
        'Mortality accepted.',
        '',
        'I tell death-anxious: existential.'
      ],
      lesson: 'Death feelings existential work mortality accepted.'
    },
    {
      id: 'fn66_9',
      title: 'My feelings about legacy',
      narrative: [
        'Legacy feelings.',
        '',
        'What I leave.',
        '',
        'Service shapes.',
        '',
        'I tell legacy: service.'
      ],
      lesson: 'Legacy feelings what I leave service shapes.'
    },
    {
      id: 'fn66_10',
      title: 'My feelings about life satisfaction',
      narrative: [
        'Life satisfaction.',
        '',
        'Not happiness.',
        '',
        'Meaning plus connection.',
        '',
        'I tell happiness-chasing: meaning.'
      ],
      lesson: 'Life satisfaction not happiness meaning plus connection.'
    },
    {
      id: 'fn66_11',
      title: 'My feelings about life purpose',
      narrative: [
        'Life purpose.',
        '',
        'Discovered slowly.',
        '',
        'Lived daily.',
        '',
        'I tell purpose: slowly.'
      ],
      lesson: 'Life purpose discovered slowly lived daily.'
    },
    {
      id: 'fn66_12',
      title: 'My feelings about calling',
      narrative: [
        'Calling feelings.',
        '',
        'Inner voice.',
        '',
        'Direction emerges.',
        '',
        'I tell calling: voice.'
      ],
      lesson: 'Calling feelings inner voice direction emerges.'
    },
    {
      id: 'fn66_13',
      title: 'My feelings about vocation',
      narrative: [
        'Vocation feelings.',
        '',
        'Beyond job.',
        '',
        'Soul work.',
        '',
        'I tell vocation: soul.'
      ],
      lesson: 'Vocation feelings beyond job soul work.'
    },
    {
      id: 'fn66_14',
      title: 'My feelings about service emerging',
      narrative: [
        'Service emerging.',
        '',
        'From suffering.',
        '',
        'Wisdom shared.',
        '',
        'I tell experienced: service.'
      ],
      lesson: 'Service emerging from suffering wisdom shared.'
    },
    {
      id: 'fn66_15',
      title: 'My feelings of all life integrated',
      narrative: [
        'Life integrated.',
        '',
        'All chapters held.',
        '',
        'Wisdom emerged.',
        '',
        'I tell elderly: wisdom.'
      ],
      lesson: 'Life integrated all chapters held wisdom emerged.'
    }
  ];

  var FEELING_NARRATIVES_67 = [
    {
      id: 'fn67_1',
      title: 'My feelings of nostalgia',
      narrative: [
        'Nostalgia feelings.',
        '',
        'Sweet and bittersweet.',
        '',
        'Time travels.',
        '',
        'I tell nostalgic: bittersweet.'
      ],
      lesson: 'Nostalgia feelings sweet and bittersweet time travels.'
    },
    {
      id: 'fn67_2',
      title: 'My feelings of homesickness',
      narrative: [
        'Homesickness feelings.',
        '',
        'Belonging missed.',
        '',
        'Make new home.',
        '',
        'I tell homesick: make home.'
      ],
      lesson: 'Homesickness feelings belonging missed make new home.'
    },
    {
      id: 'fn67_3',
      title: 'My feelings of longing',
      narrative: [
        'Longing feelings.',
        '',
        'For someone, somewhere.',
        '',
        'Information about need.',
        '',
        'I tell longing: information.'
      ],
      lesson: 'Longing feelings for someone, somewhere information about need.'
    },
    {
      id: 'fn67_4',
      title: 'My feelings of yearning',
      narrative: [
        'Yearning feelings.',
        '',
        'Deep wish.',
        '',
        'Direction signal.',
        '',
        'I tell yearning: direction.'
      ],
      lesson: 'Yearning feelings deep wish direction signal.'
    },
    {
      id: 'fn67_5',
      title: 'My feelings of restlessness',
      narrative: [
        'Restlessness feelings.',
        '',
        'Change needed.',
        '',
        'Signal honored.',
        '',
        'I tell restless: signal.'
      ],
      lesson: 'Restlessness feelings change needed signal honored.'
    },
    {
      id: 'fn67_6',
      title: 'My feelings of boredom',
      narrative: [
        'Boredom feelings.',
        '',
        'Sometimes useful.',
        '',
        'Creativity emerges.',
        '',
        'I tell bored: creativity.'
      ],
      lesson: 'Boredom feelings sometimes useful creativity emerges.'
    },
    {
      id: 'fn67_7',
      title: 'My feelings of curiosity',
      narrative: [
        'Curiosity feelings.',
        '',
        'Mind alive.',
        '',
        'Engagement signal.',
        '',
        'I tell curious: engaged.'
      ],
      lesson: 'Curiosity feelings mind alive engagement signal.'
    },
    {
      id: 'fn67_8',
      title: 'My feelings of fascination',
      narrative: [
        'Fascination feelings.',
        '',
        'Deep interest.',
        '',
        'Follow it.',
        '',
        'I tell fascinated: follow.'
      ],
      lesson: 'Fascination feelings deep interest follow it.'
    },
    {
      id: 'fn67_9',
      title: 'My feelings of wonder',
      narrative: [
        'Wonder feelings.',
        '',
        'Childlike awe.',
        '',
        'Mind opens.',
        '',
        'I tell stagnant: wonder.'
      ],
      lesson: 'Wonder feelings childlike awe mind opens.'
    },
    {
      id: 'fn67_10',
      title: 'My feelings of awe',
      narrative: [
        'Awe feelings.',
        '',
        'Self made small.',
        '',
        'Perspective shifts.',
        '',
        'I tell self-bound: awe.'
      ],
      lesson: 'Awe feelings self made small perspective shifts.'
    },
    {
      id: 'fn67_11',
      title: 'My feelings of reverence',
      narrative: [
        'Reverence feelings.',
        '',
        'Sacred respect.',
        '',
        'Bow inwardly.',
        '',
        'I tell sacred-curious: reverence.'
      ],
      lesson: 'Reverence feelings sacred respect bow inwardly.'
    },
    {
      id: 'fn67_12',
      title: 'My feelings of beauty',
      narrative: [
        'Beauty feelings.',
        '',
        'Heart opens.',
        '',
        'Soul fed.',
        '',
        'I tell beauty-blind: notice.'
      ],
      lesson: 'Beauty feelings heart opens soul fed.'
    },
    {
      id: 'fn67_13',
      title: 'My feelings of sublime',
      narrative: [
        'Sublime feelings.',
        '',
        'Beauty plus awe.',
        '',
        'Nature often.',
        '',
        'I tell sublime: nature.'
      ],
      lesson: 'Sublime feelings beauty plus awe nature often.'
    },
    {
      id: 'fn67_14',
      title: 'My feelings of grace',
      narrative: [
        'Grace feelings.',
        '',
        'Unearned gift.',
        '',
        'Gratitude follows.',
        '',
        'I tell unworthy: grace.'
      ],
      lesson: 'Grace feelings unearned gift gratitude follows.'
    },
    {
      id: 'fn67_15',
      title: 'My feelings of all subtle integrated',
      narrative: [
        'Subtle feelings integrated.',
        '',
        'Whole spectrum.',
        '',
        'Self-knowing rich.',
        '',
        'I tell rich-feeling: integration.'
      ],
      lesson: 'Subtle feelings integrated whole spectrum self-knowing rich.'
    }
  ];

  var FEELING_NARRATIVES_68 = [
    {
      id: 'fn68_1',
      title: 'My feelings of compassion fatigue',
      narrative: [
        'Compassion fatigue.',
        '',
        'Real condition.',
        '',
        'Self-care critical.',
        '',
        'I tell fatigued: self-care.'
      ],
      lesson: 'Compassion fatigue real condition self-care critical.'
    },
    {
      id: 'fn68_2',
      title: 'My feelings of vicarious trauma',
      narrative: [
        'Vicarious trauma.',
        '',
        'Real exposure.',
        '',
        'Specialty support.',
        '',
        'I tell secondary: specialty.'
      ],
      lesson: 'Vicarious trauma real exposure specialty support.'
    },
    {
      id: 'fn68_3',
      title: 'My feelings of burnout',
      narrative: [
        'Burnout feelings.',
        '',
        'Chronic depletion.',
        '',
        'Major rest needed.',
        '',
        'I tell burnt out: rest.'
      ],
      lesson: 'Burnout feelings chronic depletion major rest needed.'
    },
    {
      id: 'fn68_4',
      title: 'My feelings of exhaustion',
      narrative: [
        'Exhaustion feelings.',
        '',
        'Body says enough.',
        '',
        'Listen and rest.',
        '',
        'I tell exhausted: listen.'
      ],
      lesson: 'Exhaustion feelings body says enough listen and rest.'
    },
    {
      id: 'fn68_5',
      title: 'My feelings of overwhelm',
      narrative: [
        'Overwhelm feelings.',
        '',
        'Too much.',
        '',
        'Pause needed.',
        '',
        'I tell overwhelmed: pause.'
      ],
      lesson: 'Overwhelm feelings too much pause needed.'
    },
    {
      id: 'fn68_6',
      title: 'My feelings of inadequacy',
      narrative: [
        'Inadequacy feelings.',
        '',
        'Not enough story.',
        '',
        'Imposter syndrome.',
        '',
        'I tell inadequate: story.'
      ],
      lesson: 'Inadequacy feelings not enough story imposter syndrome.'
    },
    {
      id: 'fn68_7',
      title: 'My feelings of imposter',
      narrative: [
        'Imposter feelings.',
        '',
        'Common in success.',
        '',
        'Therapy works.',
        '',
        'I tell imposter: therapy.'
      ],
      lesson: 'Imposter feelings common in success therapy works.'
    },
    {
      id: 'fn68_8',
      title: 'My feelings of perfectionism trap',
      narrative: [
        'Perfectionism trap.',
        '',
        'Never enough.',
        '',
        'Done is enough.',
        '',
        'I tell perfectionist: done.'
      ],
      lesson: 'Perfectionism trap never enough done is enough.'
    },
    {
      id: 'fn68_9',
      title: 'My feelings of comparison trap',
      narrative: [
        'Comparison trap.',
        '',
        'Thief of joy.',
        '',
        'Own path.',
        '',
        'I tell comparing: own path.'
      ],
      lesson: 'Comparison trap thief of joy own path.'
    },
    {
      id: 'fn68_10',
      title: 'My feelings of scarcity',
      narrative: [
        'Scarcity feelings.',
        '',
        'Not enough mindset.',
        '',
        'Abundance reframe.',
        '',
        'I tell scarcity: abundance.'
      ],
      lesson: 'Scarcity feelings not enough mindset abundance reframe.'
    },
    {
      id: 'fn68_11',
      title: 'My feelings of abundance',
      narrative: [
        'Abundance feelings.',
        '',
        'Enough exists.',
        '',
        'Sharing easy.',
        '',
        'I tell scarcity: abundance.'
      ],
      lesson: 'Abundance feelings enough exists sharing easy.'
    },
    {
      id: 'fn68_12',
      title: 'My feelings of contentment with enough',
      narrative: [
        'Enough feelings.',
        '',
        'Contentment found.',
        '',
        'Striving rests.',
        '',
        'I tell striving: enough.'
      ],
      lesson: 'Enough feelings contentment found striving rests.'
    },
    {
      id: 'fn68_13',
      title: 'My feelings of satisfaction',
      narrative: [
        'Satisfaction feelings.',
        '',
        'Work done well.',
        '',
        'Self-acknowledged.',
        '',
        'I tell minimizer: acknowledge.'
      ],
      lesson: 'Satisfaction feelings work done well self-acknowledged.'
    },
    {
      id: 'fn68_14',
      title: 'My feelings of accomplishment',
      narrative: [
        'Accomplishment feelings.',
        '',
        'Pride claimed.',
        '',
        'Celebration deserved.',
        '',
        'I tell minimizers: celebrate.'
      ],
      lesson: 'Accomplishment feelings pride claimed celebration deserved.'
    },
    {
      id: 'fn68_15',
      title: 'My feelings of all healthy integrated',
      narrative: [
        'All healthy integrated.',
        '',
        'Bucket lighter.',
        '',
        'Life richer.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'All healthy integrated bucket lighter life richer.'
    }
  ];

  var FEELING_NARRATIVES_69 = [
    {
      id: 'fn69_1',
      title: 'My feelings of relief',
      narrative: [
        'Relief feelings.',
        '',
        'Burden lifted.',
        '',
        'Body exhales.',
        '',
        'I tell relieved: exhale.'
      ],
      lesson: 'Relief feelings burden lifted body exhales.'
    },
    {
      id: 'fn69_2',
      title: 'My feelings of release',
      narrative: [
        'Release feelings.',
        '',
        'Holding loosens.',
        '',
        'Energy returns.',
        '',
        'I tell tight: release.'
      ],
      lesson: 'Release feelings holding loosens energy returns.'
    },
    {
      id: 'fn69_3',
      title: 'My feelings of letting go',
      narrative: [
        'Letting go feelings.',
        '',
        'Hands open.',
        '',
        'Universe holds.',
        '',
        'I tell holding: let go.'
      ],
      lesson: 'Letting go feelings hands open universe holds.'
    },
    {
      id: 'fn69_4',
      title: 'My feelings of surrender',
      narrative: [
        'Surrender feelings.',
        '',
        'Control released.',
        '',
        'Trust process.',
        '',
        'I tell controlling: surrender.'
      ],
      lesson: 'Surrender feelings control released trust process.'
    },
    {
      id: 'fn69_5',
      title: 'My feelings of acceptance',
      narrative: [
        'Acceptance feelings.',
        '',
        'What is, is.',
        '',
        'Energy preserved.',
        '',
        'I tell fighting: acceptance.'
      ],
      lesson: 'Acceptance feelings what is, is energy preserved.'
    },
    {
      id: 'fn69_6',
      title: 'My feelings of allowing',
      narrative: [
        'Allowing feelings.',
        '',
        'Not pushing away.',
        '',
        'Welcome them.',
        '',
        'I tell suppressing: allow.'
      ],
      lesson: 'Allowing feelings not pushing away welcome them.'
    },
    {
      id: 'fn69_7',
      title: 'My feelings of welcoming',
      narrative: [
        'Welcoming feelings.',
        '',
        'Even hard ones.',
        '',
        'Information offered.',
        '',
        'I tell rejecting: welcome.'
      ],
      lesson: 'Welcoming feelings even hard ones information offered.'
    },
    {
      id: 'fn69_8',
      title: 'My feelings of opening',
      narrative: [
        'Opening feelings.',
        '',
        'Heart and body.',
        '',
        'Vulnerability welcomed.',
        '',
        'I tell closed: open.'
      ],
      lesson: 'Opening feelings heart and body vulnerability welcomed.'
    },
    {
      id: 'fn69_9',
      title: 'My feelings of trust in process',
      narrative: [
        'Trust in process.',
        '',
        'Unfolding accepted.',
        '',
        'Control released.',
        '',
        'I tell controlling: trust.'
      ],
      lesson: 'Trust in process unfolding accepted control released.'
    },
    {
      id: 'fn69_10',
      title: 'My feelings of patience',
      narrative: [
        'Patience feelings.',
        '',
        'Slow growth.',
        '',
        'Compounded over time.',
        '',
        'I tell impatient: patience.'
      ],
      lesson: 'Patience feelings slow growth compounded over time.'
    },
    {
      id: 'fn69_11',
      title: 'My feelings of waiting',
      narrative: [
        'Waiting feelings.',
        '',
        'Time stretches.',
        '',
        'Body practice.',
        '',
        'I tell waiting: body practice.'
      ],
      lesson: 'Waiting feelings time stretches body practice.'
    },
    {
      id: 'fn69_12',
      title: 'My feelings of stillness',
      narrative: [
        'Stillness feelings.',
        '',
        'No need to act.',
        '',
        'Body restful.',
        '',
        'I tell restless: stillness.'
      ],
      lesson: 'Stillness feelings no need to act body restful.'
    },
    {
      id: 'fn69_13',
      title: 'My feelings of slowness',
      narrative: [
        'Slowness feelings.',
        '',
        'Pace shifted.',
        '',
        'Depth allowed.',
        '',
        'I tell rushed: slow.'
      ],
      lesson: 'Slowness feelings pace shifted depth allowed.'
    },
    {
      id: 'fn69_14',
      title: 'My feelings of pause',
      narrative: [
        'Pause feelings.',
        '',
        'Between moments.',
        '',
        'Sacred space.',
        '',
        'I tell go-go: pause.'
      ],
      lesson: 'Pause feelings between moments sacred space.'
    },
    {
      id: 'fn69_15',
      title: 'My feelings of all softness integrated',
      narrative: [
        'Softness integrated.',
        '',
        'Body softens.',
        '',
        'Self softens.',
        '',
        'I tell hard-edged: softness.'
      ],
      lesson: 'Softness integrated body softens self softens.'
    }
  ];

  var FEELING_NARRATIVES_70 = [
    {
      id: 'fn70_1',
      title: 'My final feelings wisdom',
      narrative: [
        'Wisdom emerges.',
        '',
        'All feelings teachers.',
        '',
        'All valid.',
        '',
        'I tell beginners: wisdom.'
      ],
      lesson: 'Wisdom emerges all feelings teachers all valid.'
    },
    {
      id: 'fn70_2',
      title: 'My feelings final practice',
      narrative: [
        'Practice continues.',
        '',
        'Daily renewal.',
        '',
        'Lifelong commitment.',
        '',
        'I tell beginners: lifelong.'
      ],
      lesson: 'Practice continues daily renewal lifelong commitment.'
    },
    {
      id: 'fn70_3',
      title: 'My feelings final integration',
      narrative: [
        'All integrated.',
        '',
        'Whole person.',
        '',
        'Years of work.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'All integrated whole person years of work.'
    },
    {
      id: 'fn70_4',
      title: 'My feelings final service',
      narrative: [
        'Service emerges.',
        '',
        'Help others.',
        '',
        'Suffering becomes gift.',
        '',
        'I tell experienced: service.'
      ],
      lesson: 'Service emerges help others suffering becomes gift.'
    },
    {
      id: 'fn70_5',
      title: 'My feelings final love',
      narrative: [
        'Love foundation.',
        '',
        'Self and others.',
        '',
        'Anchor of life.',
        '',
        'I tell love-curious: anchor.'
      ],
      lesson: 'Love foundation self and others anchor of life.'
    },
    {
      id: 'fn70_6',
      title: 'My feelings final acceptance',
      narrative: [
        'Acceptance ultimate.',
        '',
        'All welcome.',
        '',
        'Fighting drops.',
        '',
        'I tell fighting: acceptance.'
      ],
      lesson: 'Acceptance ultimate all welcome fighting drops.'
    },
    {
      id: 'fn70_7',
      title: 'My feelings final compassion',
      narrative: [
        'Compassion daily.',
        '',
        'Self and others.',
        '',
        'Bridge always.',
        '',
        'I tell harsh: compassion.'
      ],
      lesson: 'Compassion daily self and others bridge always.'
    },
    {
      id: 'fn70_8',
      title: 'My feelings final wisdom shared',
      narrative: [
        'Wisdom shared.',
        '',
        'Teaching emerging.',
        '',
        'Generations served.',
        '',
        'I tell wise: share.'
      ],
      lesson: 'Wisdom shared teaching emerging generations served.'
    },
    {
      id: 'fn70_9',
      title: 'My feelings final humility',
      narrative: [
        'Humility maintained.',
        '',
        'Always learning.',
        '',
        'Beginners mind.',
        '',
        'I tell expert: humility.'
      ],
      lesson: 'Humility maintained always learning beginners mind.'
    },
    {
      id: 'fn70_10',
      title: 'My feelings final gratitude',
      narrative: [
        'Gratitude lifelong.',
        '',
        'Daily practice.',
        '',
        'Foundation built.',
        '',
        'I tell beginners: gratitude.'
      ],
      lesson: 'Gratitude lifelong daily practice foundation built.'
    },
    {
      id: 'fn70_11',
      title: 'My feelings final presence',
      narrative: [
        'Presence ultimate.',
        '',
        'This moment.',
        '',
        'Always available.',
        '',
        'I tell scattered: presence.'
      ],
      lesson: 'Presence ultimate this moment always available.'
    },
    {
      id: 'fn70_12',
      title: 'My feelings final wholeness',
      narrative: [
        'Wholeness achieved.',
        '',
        'All parts welcome.',
        '',
        'Integration complete.',
        '',
        'I tell fragmented: wholeness.'
      ],
      lesson: 'Wholeness achieved all parts welcome integration complete.'
    },
    {
      id: 'fn70_13',
      title: 'My feelings final peace',
      narrative: [
        'Peace cultivated.',
        '',
        'Inner not outer.',
        '',
        'Years of practice.',
        '',
        'I tell peace-seeking: inner.'
      ],
      lesson: 'Peace cultivated inner not outer years of practice.'
    },
    {
      id: 'fn70_14',
      title: 'My feelings final equanimity',
      narrative: [
        'Equanimity built.',
        '',
        'Highs and lows.',
        '',
        'Both met steady.',
        '',
        'I tell reactive: equanimity.'
      ],
      lesson: 'Equanimity built highs and lows both met steady.'
    },
    {
      id: 'fn70_15',
      title: 'My feelings final word',
      narrative: [
        'Final word: feel.',
        '',
        'All emotions welcome.',
        '',
        'Whole self honored.',
        '',
        'I tell all: feel everything.'
      ],
      lesson: 'Final word: feel all emotions welcome whole self honored.'
    }
  ];

  var FEELING_NARRATIVES_61 = [
    {
      id: 'fn61_1',
      title: 'My feelings about sleep',
      narrative: [
        'Sleep feelings.',
        '',
        'Restoration sought.',
        '',
        'Body grateful.',
        '',
        'I tell sleep: restoration.'
      ],
      lesson: 'Sleep feelings restoration sought body grateful.'
    },
    {
      id: 'fn61_2',
      title: 'My feelings about insomnia',
      narrative: [
        'Insomnia feelings.',
        '',
        'Frustration plus fear.',
        '',
        'Tools available.',
        '',
        'I tell insomniacs: tools.'
      ],
      lesson: 'Insomnia feelings frustration plus fear tools available.'
    },
    {
      id: 'fn61_3',
      title: 'My feelings about dreams',
      narrative: [
        'Dream feelings.',
        '',
        'Subconscious processing.',
        '',
        'Symbols rich.',
        '',
        'I tell dreamers: symbols.'
      ],
      lesson: 'Dream feelings subconscious processing symbols rich.'
    },
    {
      id: 'fn61_4',
      title: 'My feelings about nightmares',
      narrative: [
        'Nightmare feelings.',
        '',
        'Trauma processing.',
        '',
        'Therapy if frequent.',
        '',
        'I tell nightmares: therapy.'
      ],
      lesson: 'Nightmare feelings trauma processing therapy if frequent.'
    },
    {
      id: 'fn61_5',
      title: 'My feelings about waking',
      narrative: [
        'Waking feelings.',
        '',
        'Day starts.',
        '',
        'Set tone.',
        '',
        'I tell mornings: tone.'
      ],
      lesson: 'Waking feelings day starts set tone.'
    },
    {
      id: 'fn61_6',
      title: 'My feelings about food',
      narrative: [
        'Food feelings.',
        '',
        'Nourishment plus pleasure.',
        '',
        'Both honored.',
        '',
        'I tell food: both.'
      ],
      lesson: 'Food feelings nourishment plus pleasure both honored.'
    },
    {
      id: 'fn61_7',
      title: 'My feelings about hunger',
      narrative: [
        'Hunger feelings.',
        '',
        'Body signal.',
        '',
        'Listen and feed.',
        '',
        'I tell hunger: listen.'
      ],
      lesson: 'Hunger feelings body signal listen and feed.'
    },
    {
      id: 'fn61_8',
      title: 'My feelings about fullness',
      narrative: [
        'Fullness feelings.',
        '',
        'Stop signal.',
        '',
        'Body knows.',
        '',
        'I tell over-eaters: stop signal.'
      ],
      lesson: 'Fullness feelings stop signal body knows.'
    },
    {
      id: 'fn61_9',
      title: 'My feelings about water',
      narrative: [
        'Water feelings.',
        '',
        'Thirst signal.',
        '',
        'Drink often.',
        '',
        'I tell dehydrated: water.'
      ],
      lesson: 'Water feelings thirst signal drink often.'
    },
    {
      id: 'fn61_10',
      title: 'My feelings about exercise',
      narrative: [
        'Exercise feelings.',
        '',
        'Body responds.',
        '',
        'Endorphins rise.',
        '',
        'I tell sedentary: exercise.'
      ],
      lesson: 'Exercise feelings body responds endorphins rise.'
    },
    {
      id: 'fn61_11',
      title: 'My feelings about rest',
      narrative: [
        'Rest feelings.',
        '',
        'Body needs.',
        '',
        'Allow it.',
        '',
        'I tell rest-guilty: allow.'
      ],
      lesson: 'Rest feelings body needs allow it.'
    },
    {
      id: 'fn61_12',
      title: 'My feelings about touch',
      narrative: [
        'Touch feelings.',
        '',
        'Connection signal.',
        '',
        'Oxytocin release.',
        '',
        'I tell touch-deprived: signal.'
      ],
      lesson: 'Touch feelings connection signal oxytocin release.'
    },
    {
      id: 'fn61_13',
      title: 'My feelings about sensory needs',
      narrative: [
        'Sensory needs feelings.',
        '',
        'Body knows.',
        '',
        'Accommodate honestly.',
        '',
        'I tell sensory: honor.'
      ],
      lesson: 'Sensory needs feelings body knows accommodate honestly.'
    },
    {
      id: 'fn61_14',
      title: 'My feelings about body autonomy',
      narrative: [
        'Body autonomy.',
        '',
        'My body my choice.',
        '',
        'Respected always.',
        '',
        'I tell autonomy: always.'
      ],
      lesson: 'Body autonomy my body my choice respected always.'
    },
    {
      id: 'fn61_15',
      title: 'My feelings of body integrated',
      narrative: [
        'Body integrated.',
        '',
        'Signals heeded.',
        '',
        'Whole self.',
        '',
        'I tell disconnected: integrate.'
      ],
      lesson: 'Body integrated signals heeded whole self.'
    }
  ];

  var FEELING_NARRATIVES_62 = [
    {
      id: 'fn62_1',
      title: 'My feelings about emotions teaching kids',
      narrative: [
        'Emotion education.',
        '',
        'Kids learn early.',
        '',
        'Lifelong skill.',
        '',
        'I tell parents: teach.'
      ],
      lesson: 'Emotion education kids learn early lifelong skill.'
    },
    {
      id: 'fn62_2',
      title: 'My feelings naming for toddlers',
      narrative: [
        'Toddler emotion naming.',
        '',
        'Simple words.',
        '',
        'Sad, mad, glad.',
        '',
        'I tell toddler-parents: name.'
      ],
      lesson: 'Toddler emotion naming simple words sad, mad, glad.'
    },
    {
      id: 'fn62_3',
      title: 'My feelings naming for preschoolers',
      narrative: [
        'Preschool emotions.',
        '',
        'More nuance.',
        '',
        'Frustrated, jealous, excited.',
        '',
        'I tell preschool: nuance.'
      ],
      lesson: 'Preschool emotions more nuance frustrated, jealous, excited.'
    },
    {
      id: 'fn62_4',
      title: 'My feelings naming for elementary',
      narrative: [
        'Elementary emotions.',
        '',
        'Complex feelings.',
        '',
        'Disappointed, proud, embarrassed.',
        '',
        'I tell elementary: complex.'
      ],
      lesson: 'Elementary emotions complex feelings disappointed, proud, embarrassed.'
    },
    {
      id: 'fn62_5',
      title: 'My feelings naming for tweens',
      narrative: [
        'Tween emotions.',
        '',
        'Identity formation.',
        '',
        'Self-conscious feelings.',
        '',
        'I tell tweens: self-conscious.'
      ],
      lesson: 'Tween emotions identity formation self-conscious feelings.'
    },
    {
      id: 'fn62_6',
      title: 'My feelings naming for teens',
      narrative: [
        'Teen emotions.',
        '',
        'Hormonal intensity.',
        '',
        'Validate all.',
        '',
        'I tell teen-parents: validate.'
      ],
      lesson: 'Teen emotions hormonal intensity validate all.'
    },
    {
      id: 'fn62_7',
      title: 'My feelings naming for young adults',
      narrative: [
        'Young adult emotions.',
        '',
        'Independence work.',
        '',
        'Identity solidifying.',
        '',
        'I tell young: identity.'
      ],
      lesson: 'Young adult emotions independence work identity solidifying.'
    },
    {
      id: 'fn62_8',
      title: 'My feelings naming for adults',
      narrative: [
        'Adult emotions.',
        '',
        'Full vocabulary.',
        '',
        'Lifelong learning.',
        '',
        'I tell adults: lifelong.'
      ],
      lesson: 'Adult emotions full vocabulary lifelong learning.'
    },
    {
      id: 'fn62_9',
      title: 'My feelings teaching emotional check-in',
      narrative: [
        'Family check-in.',
        '',
        'Each shares.',
        '',
        'Daily ritual.',
        '',
        'I tell families: check-in.'
      ],
      lesson: 'Family check-in each shares daily ritual.'
    },
    {
      id: 'fn62_10',
      title: 'My feelings teaching emotional regulation',
      narrative: [
        'Regulation taught.',
        '',
        'Breathing first.',
        '',
        'Movement second.',
        '',
        'I tell parents: regulation tools.'
      ],
      lesson: 'Regulation taught breathing first movement second.'
    },
    {
      id: 'fn62_11',
      title: 'My feelings teaching empathy',
      narrative: [
        'Empathy taught.',
        '',
        'How would you feel?',
        '',
        'Perspective taking.',
        '',
        'I tell parents: empathy.'
      ],
      lesson: 'Empathy taught how would you feel perspective taking.'
    },
    {
      id: 'fn62_12',
      title: 'My feelings teaching self-compassion',
      narrative: [
        'Self-compassion taught.',
        '',
        'Speak to self kindly.',
        '',
        'Model first.',
        '',
        'I tell parents: model.'
      ],
      lesson: 'Self-compassion taught speak to self kindly model first.'
    },
    {
      id: 'fn62_13',
      title: 'My feelings teaching boundaries',
      narrative: [
        'Boundaries taught.',
        '',
        'No is okay.',
        '',
        'Body autonomy.',
        '',
        'I tell parents: boundaries.'
      ],
      lesson: 'Boundaries taught no is okay body autonomy.'
    },
    {
      id: 'fn62_14',
      title: 'My feelings teaching coping skills',
      narrative: [
        'Coping skills taught.',
        '',
        'Toolbox built.',
        '',
        'Practice essential.',
        '',
        'I tell parents: practice.'
      ],
      lesson: 'Coping skills taught toolbox built practice essential.'
    },
    {
      id: 'fn62_15',
      title: 'My feelings of teaching integration',
      narrative: [
        'All teaching integrated.',
        '',
        'Vocabulary, regulation, empathy.',
        '',
        'Whole approach.',
        '',
        'I tell parents: integration.'
      ],
      lesson: 'All teaching integrated vocabulary, regulation, empathy whole approach.'
    }
  ];

  var FEELING_NARRATIVES_63 = [
    {
      id: 'fn63_1',
      title: 'My feelings about my body image',
      narrative: [
        'Body image feelings.',
        '',
        'Daily work.',
        '',
        'Neutrality goal.',
        '',
        'I tell image-stuck: neutrality.'
      ],
      lesson: 'Body image feelings daily work neutrality goal.'
    },
    {
      id: 'fn63_2',
      title: 'My feelings about my weight',
      narrative: [
        'Weight feelings.',
        '',
        'Cultural pressure.',
        '',
        'Health focus.',
        '',
        'I tell weight-stressed: health.'
      ],
      lesson: 'Weight feelings cultural pressure health focus.'
    },
    {
      id: 'fn63_3',
      title: 'My feelings about my appearance',
      narrative: [
        'Appearance feelings.',
        '',
        'Mirror work.',
        '',
        'Compassion practiced.',
        '',
        'I tell mirror-stressed: compassion.'
      ],
      lesson: 'Appearance feelings mirror work compassion practiced.'
    },
    {
      id: 'fn63_4',
      title: 'My feelings about aging body',
      narrative: [
        'Aging body feelings.',
        '',
        'Acceptance work.',
        '',
        'Function celebrated.',
        '',
        'I tell aging: function.'
      ],
      lesson: 'Aging body feelings acceptance work function celebrated.'
    },
    {
      id: 'fn63_5',
      title: 'My feelings about disabled body',
      narrative: [
        'Disabled body feelings.',
        '',
        'Identity work.',
        '',
        'Community essential.',
        '',
        'I tell disabled: community.'
      ],
      lesson: 'Disabled body feelings identity work community essential.'
    },
    {
      id: 'fn63_6',
      title: 'My feelings about chronic illness body',
      narrative: [
        'Chronic illness body.',
        '',
        'Trust rebuilding.',
        '',
        'Compassion needed.',
        '',
        'I tell chronic: compassion.'
      ],
      lesson: 'Chronic illness body trust rebuilding compassion needed.'
    },
    {
      id: 'fn63_7',
      title: 'My feelings about scars',
      narrative: [
        'Scar feelings.',
        '',
        'Story carried.',
        '',
        'Honor them.',
        '',
        'I tell scarred: story.'
      ],
      lesson: 'Scar feelings story carried honor them.'
    },
    {
      id: 'fn63_8',
      title: 'My feelings about surgery',
      narrative: [
        'Surgery feelings.',
        '',
        'Body changed.',
        '',
        'Healing time.',
        '',
        'I tell surgery: healing.'
      ],
      lesson: 'Surgery feelings body changed healing time.'
    },
    {
      id: 'fn63_9',
      title: 'My feelings about birth',
      narrative: [
        'Birth feelings.',
        '',
        'Body remembers.',
        '',
        'Awe always.',
        '',
        'I tell birthing: awe.'
      ],
      lesson: 'Birth feelings body remembers awe always.'
    },
    {
      id: 'fn63_10',
      title: 'My feelings about death of body',
      narrative: [
        'Body dying feelings.',
        '',
        'Loss profound.',
        '',
        'Hospice support.',
        '',
        'I tell dying: support.'
      ],
      lesson: 'Body dying feelings loss profound hospice support.'
    },
    {
      id: 'fn63_11',
      title: 'My feelings about menstruation',
      narrative: [
        'Menstruation feelings.',
        '',
        'Cyclical normal.',
        '',
        'Honor body.',
        '',
        'I tell cycling: honor.'
      ],
      lesson: 'Menstruation feelings cyclical normal honor body.'
    },
    {
      id: 'fn63_12',
      title: 'My feelings about pregnancy',
      narrative: [
        'Pregnancy feelings.',
        '',
        'Hormonal intensity.',
        '',
        'Both joy and fear.',
        '',
        'I tell pregnant: both.'
      ],
      lesson: 'Pregnancy feelings hormonal intensity both joy and fear.'
    },
    {
      id: 'fn63_13',
      title: 'My feelings about menopause',
      narrative: [
        'Menopause feelings.',
        '',
        'Body shifting.',
        '',
        'Identity change.',
        '',
        'I tell menopausal: identity.'
      ],
      lesson: 'Menopause feelings body shifting identity change.'
    },
    {
      id: 'fn63_14',
      title: 'My feelings about andropause',
      narrative: [
        'Andropause feelings.',
        '',
        'Male hormonal.',
        '',
        'Equally real.',
        '',
        'I tell andropausal: real.'
      ],
      lesson: 'Andropause feelings male hormonal equally real.'
    },
    {
      id: 'fn63_15',
      title: 'My feelings of body integrated lifespan',
      narrative: [
        'Body lifespan integrated.',
        '',
        'All stages held.',
        '',
        'Whole journey.',
        '',
        'I tell aging: whole.'
      ],
      lesson: 'Body lifespan integrated all stages held whole journey.'
    }
  ];

  var FEELING_NARRATIVES_64 = [
    {
      id: 'fn64_1',
      title: 'My feelings about identity formation',
      narrative: [
        'Identity formation feelings.',
        '',
        'Question and answer.',
        '',
        'Lifelong process.',
        '',
        'I tell young: lifelong.'
      ],
      lesson: 'Identity formation feelings question and answer lifelong process.'
    },
    {
      id: 'fn64_2',
      title: 'My feelings about racial identity',
      narrative: [
        'Racial identity feelings.',
        '',
        'Pride and pain.',
        '',
        'Community essential.',
        '',
        'I tell racial: community.'
      ],
      lesson: 'Racial identity feelings pride and pain community essential.'
    },
    {
      id: 'fn64_3',
      title: 'My feelings about ethnic identity',
      narrative: [
        'Ethnic identity feelings.',
        '',
        'Heritage felt.',
        '',
        'Connection sought.',
        '',
        'I tell ethnic: heritage.'
      ],
      lesson: 'Ethnic identity feelings heritage felt connection sought.'
    },
    {
      id: 'fn64_4',
      title: 'My feelings about religious identity',
      narrative: [
        'Religious identity feelings.',
        '',
        'Faith claimed.',
        '',
        'Or questioned.',
        '',
        'I tell religious: claimed.'
      ],
      lesson: 'Religious identity feelings faith claimed or questioned.'
    },
    {
      id: 'fn64_5',
      title: 'My feelings about gender identity',
      narrative: [
        'Gender identity feelings.',
        '',
        'Authentic expression.',
        '',
        'Affirming community.',
        '',
        'I tell gender: affirming.'
      ],
      lesson: 'Gender identity feelings authentic expression affirming community.'
    },
    {
      id: 'fn64_6',
      title: 'My feelings about sexual orientation',
      narrative: [
        'Sexual orientation.',
        '',
        'Authentic self.',
        '',
        'Affirming care.',
        '',
        'I tell orientation: affirming.'
      ],
      lesson: 'Sexual orientation authentic self affirming care.'
    },
    {
      id: 'fn64_7',
      title: 'My feelings about disability identity',
      narrative: [
        'Disability identity.',
        '',
        'Pride and reality.',
        '',
        'Community essential.',
        '',
        'I tell disabled: identity.'
      ],
      lesson: 'Disability identity pride and reality community essential.'
    },
    {
      id: 'fn64_8',
      title: 'My feelings about class identity',
      narrative: [
        'Class identity feelings.',
        '',
        'Socioeconomic shaped.',
        '',
        'Awareness emerges.',
        '',
        'I tell class: aware.'
      ],
      lesson: 'Class identity feelings socioeconomic shaped awareness emerges.'
    },
    {
      id: 'fn64_9',
      title: 'My feelings about generation identity',
      narrative: [
        'Generation identity.',
        '',
        'Shared history.',
        '',
        'Cohort bond.',
        '',
        'I tell generations: bond.'
      ],
      lesson: 'Generation identity shared history cohort bond.'
    },
    {
      id: 'fn64_10',
      title: 'My feelings about geographic identity',
      narrative: [
        'Geographic identity.',
        '',
        'Place shapes self.',
        '',
        'Roots claimed.',
        '',
        'I tell rooted: claimed.'
      ],
      lesson: 'Geographic identity place shapes self roots claimed.'
    },
    {
      id: 'fn64_11',
      title: 'My feelings about national identity',
      narrative: [
        'National identity.',
        '',
        'Complicated love.',
        '',
        'Critical patriotism.',
        '',
        'I tell national: critical.'
      ],
      lesson: 'National identity complicated love critical patriotism.'
    },
    {
      id: 'fn64_12',
      title: 'My feelings about cultural identity',
      narrative: [
        'Cultural identity.',
        '',
        'Heritage celebrated.',
        '',
        'Evolution honored.',
        '',
        'I tell cultural: celebration.'
      ],
      lesson: 'Cultural identity heritage celebrated evolution honored.'
    },
    {
      id: 'fn64_13',
      title: 'My feelings about professional identity',
      narrative: [
        'Professional identity.',
        '',
        'Work shapes self.',
        '',
        'Beyond title sought.',
        '',
        'I tell professional: beyond.'
      ],
      lesson: 'Professional identity work shapes self beyond title sought.'
    },
    {
      id: 'fn64_14',
      title: 'My feelings about family identity',
      narrative: [
        'Family identity.',
        '',
        'Role in system.',
        '',
        'Differentiation work.',
        '',
        'I tell family: differentiation.'
      ],
      lesson: 'Family identity role in system differentiation work.'
    },
    {
      id: 'fn64_15',
      title: 'My feelings of all identities integrated',
      narrative: [
        'All identities integrated.',
        '',
        'Whole self.',
        '',
        'Intersectional.',
        '',
        'I tell identity-curious: intersectional.'
      ],
      lesson: 'All identities integrated whole self intersectional.'
    }
  ];

  var FEELING_NARRATIVES_65 = [
    {
      id: 'fn65_1',
      title: 'My feelings about authenticity',
      narrative: [
        'Authenticity practice.',
        '',
        'True self expressed.',
        '',
        'Daily commitment.',
        '',
        'I tell masking: authenticity.'
      ],
      lesson: 'Authenticity practice true self expressed daily commitment.'
    },
    {
      id: 'fn65_2',
      title: 'My feelings about masking',
      narrative: [
        'Masking exhausting.',
        '',
        'Energy depleting.',
        '',
        'Unmask gradually.',
        '',
        'I tell masking: gradually.'
      ],
      lesson: 'Masking exhausting energy depleting unmask gradually.'
    },
    {
      id: 'fn65_3',
      title: 'My feelings about people-pleasing',
      narrative: [
        'People-pleasing feelings.',
        '',
        'Self abandoned.',
        '',
        'Boundary work.',
        '',
        'I tell pleaser: boundaries.'
      ],
      lesson: 'People-pleasing feelings self abandoned boundary work.'
    },
    {
      id: 'fn65_4',
      title: 'My feelings about perfectionism',
      narrative: [
        'Perfectionism feelings.',
        '',
        'Never enough.',
        '',
        'Good enough goal.',
        '',
        'I tell perfectionist: good enough.'
      ],
      lesson: 'Perfectionism feelings never enough good enough goal.'
    },
    {
      id: 'fn65_5',
      title: 'My feelings about procrastination',
      narrative: [
        'Procrastination feelings.',
        '',
        'Fear or fatigue.',
        '',
        'Compassion plus action.',
        '',
        'I tell procrastinating: compassion.'
      ],
      lesson: 'Procrastination feelings fear or fatigue compassion plus action.'
    },
    {
      id: 'fn65_6',
      title: 'My feelings about overworking',
      narrative: [
        'Overworking feelings.',
        '',
        'Identity tied to work.',
        '',
        'Identity beyond work.',
        '',
        'I tell overworker: beyond.'
      ],
      lesson: 'Overworking feelings identity tied to work identity beyond work.'
    },
    {
      id: 'fn65_7',
      title: 'My feelings about overgiving',
      narrative: [
        'Overgiving feelings.',
        '',
        'Self depleted.',
        '',
        'Sustainable balance.',
        '',
        'I tell overgiver: sustainable.'
      ],
      lesson: 'Overgiving feelings self depleted sustainable balance.'
    },
    {
      id: 'fn65_8',
      title: 'My feelings about codependency',
      narrative: [
        'Codependency feelings.',
        '',
        'Other-focused.',
        '',
        'Self recovery work.',
        '',
        'I tell codependent: recovery.'
      ],
      lesson: 'Codependency feelings other-focused self recovery work.'
    },
    {
      id: 'fn65_9',
      title: 'My feelings about boundary violation',
      narrative: [
        'Boundary violation feelings.',
        '',
        'Rage and grief.',
        '',
        'Protect self.',
        '',
        'I tell violated: protect.'
      ],
      lesson: 'Boundary violation feelings rage and grief protect self.'
    },
    {
      id: 'fn65_10',
      title: 'My feelings about boundary respect',
      narrative: [
        'Boundary respect feelings.',
        '',
        'Safety felt.',
        '',
        'Trust grows.',
        '',
        'I tell respected: safety.'
      ],
      lesson: 'Boundary respect feelings safety felt trust grows.'
    },
    {
      id: 'fn65_11',
      title: 'My feelings about saying no',
      narrative: [
        'Saying no feelings.',
        '',
        'Sometimes guilty.',
        '',
        'But healthy.',
        '',
        'I tell no-guilty: healthy.'
      ],
      lesson: 'Saying no feelings sometimes guilty but healthy.'
    },
    {
      id: 'fn65_12',
      title: 'My feelings about saying yes',
      narrative: [
        'Saying yes feelings.',
        '',
        'Conscious choice.',
        '',
        'Not default.',
        '',
        'I tell yes-default: conscious.'
      ],
      lesson: 'Saying yes feelings conscious choice not default.'
    },
    {
      id: 'fn65_13',
      title: 'My feelings about authentic yes',
      narrative: [
        'Authentic yes.',
        '',
        'Full commitment.',
        '',
        'Felt deeply.',
        '',
        'I tell half-hearted: authentic.'
      ],
      lesson: 'Authentic yes full commitment felt deeply.'
    },
    {
      id: 'fn65_14',
      title: 'My feelings about authentic no',
      narrative: [
        'Authentic no.',
        '',
        'Full sentence.',
        '',
        'No explanation needed.',
        '',
        'I tell justifying: no full sentence.'
      ],
      lesson: 'Authentic no full sentence no explanation needed.'
    },
    {
      id: 'fn65_15',
      title: 'My feelings of authenticity integrated',
      narrative: [
        'Authenticity integrated.',
        '',
        'Whole self expressed.',
        '',
        'Lifelong practice.',
        '',
        'I tell beginners: lifelong.'
      ],
      lesson: 'Authenticity integrated whole self expressed lifelong practice.'
    }
  ];

  var FEELING_NARRATIVES_56 = [
    {
      id: 'fn56_1',
      title: 'My feelings about safety physical',
      narrative: [
        'Physical safety feelings.',
        '',
        'Body knows.',
        '',
        'Threat signals.',
        '',
        'I tell unsafe: trust body.'
      ],
      lesson: 'Physical safety feelings body knows threat signals.'
    },
    {
      id: 'fn56_2',
      title: 'My feelings about safety emotional',
      narrative: [
        'Emotional safety.',
        '',
        'Trust required.',
        '',
        'Slow building.',
        '',
        'I tell trust-curious: slow.'
      ],
      lesson: 'Emotional safety trust required slow building.'
    },
    {
      id: 'fn56_3',
      title: 'My feelings about safety relational',
      narrative: [
        'Relational safety.',
        '',
        'Consistent care.',
        '',
        'Patterns trusted.',
        '',
        'I tell relationship-curious: patterns.'
      ],
      lesson: 'Relational safety consistent care patterns trusted.'
    },
    {
      id: 'fn56_4',
      title: 'My feelings about danger',
      narrative: [
        'Danger sensed.',
        '',
        'Body wisdom.',
        '',
        'Trust signals.',
        '',
        'I tell danger-stuck: trust body.'
      ],
      lesson: 'Danger sensed body wisdom trust signals.'
    },
    {
      id: 'fn56_5',
      title: 'My feelings during fight response',
      narrative: [
        'Fight response.',
        '',
        'Body activated.',
        '',
        'Action urge.',
        '',
        'I tell reactive: fight.'
      ],
      lesson: 'Fight response body activated action urge.'
    },
    {
      id: 'fn56_6',
      title: 'My feelings during flight response',
      narrative: [
        'Flight response.',
        '',
        'Need to flee.',
        '',
        'Body knows.',
        '',
        'I tell flight-prone: body knows.'
      ],
      lesson: 'Flight response need to flee body knows.'
    },
    {
      id: 'fn56_7',
      title: 'My feelings during freeze response',
      narrative: [
        'Freeze response.',
        '',
        'Body still.',
        '',
        'Protection mode.',
        '',
        'I tell freezing: protection.'
      ],
      lesson: 'Freeze response body still protection mode.'
    },
    {
      id: 'fn56_8',
      title: 'My feelings during fawn response',
      narrative: [
        'Fawn response.',
        '',
        'People pleasing.',
        '',
        'Trauma adaptation.',
        '',
        'I tell fawning: trauma.'
      ],
      lesson: 'Fawn response people pleasing trauma adaptation.'
    },
    {
      id: 'fn56_9',
      title: 'My feelings during ventral vagal',
      narrative: [
        'Ventral vagal safety.',
        '',
        'Connection felt.',
        '',
        'Body relaxed.',
        '',
        'I tell safe: ventral.'
      ],
      lesson: 'Ventral vagal safety connection felt body relaxed.'
    },
    {
      id: 'fn56_10',
      title: 'My feelings during sympathetic',
      narrative: [
        'Sympathetic activation.',
        '',
        'Fight or flight.',
        '',
        'Body amped.',
        '',
        'I tell activated: sympathetic.'
      ],
      lesson: 'Sympathetic activation fight or flight body amped.'
    },
    {
      id: 'fn56_11',
      title: 'My feelings during dorsal vagal',
      narrative: [
        'Dorsal vagal shutdown.',
        '',
        'Body collapsed.',
        '',
        'Overwhelm response.',
        '',
        'I tell collapsed: dorsal.'
      ],
      lesson: 'Dorsal vagal shutdown body collapsed overwhelm response.'
    },
    {
      id: 'fn56_12',
      title: 'My feelings during polyvagal',
      narrative: [
        'Polyvagal theory.',
        '',
        'Three states understood.',
        '',
        'Body mapped.',
        '',
        'I tell theory-curious: polyvagal.'
      ],
      lesson: 'Polyvagal theory three states understood body mapped.'
    },
    {
      id: 'fn56_13',
      title: 'My feelings during co-regulation',
      narrative: [
        'Co-regulation.',
        '',
        'Body calms with safe other.',
        '',
        'Connection heals.',
        '',
        'I tell isolated: co-regulation.'
      ],
      lesson: 'Co-regulation body calms with safe other connection heals.'
    },
    {
      id: 'fn56_14',
      title: 'My feelings during self-regulation',
      narrative: [
        'Self-regulation skills.',
        '',
        'Tools learned.',
        '',
        'Bucket managed.',
        '',
        'I tell dysregulated: skills.'
      ],
      lesson: 'Self-regulation skills tools learned bucket managed.'
    },
    {
      id: 'fn56_15',
      title: 'My feelings all integrated nervous system',
      narrative: [
        'Nervous system integrated.',
        '',
        'States understood.',
        '',
        'Tools practiced.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'Nervous system integrated states understood tools practiced.'
    }
  ];

  var FEELING_NARRATIVES_57 = [
    {
      id: 'fn57_1',
      title: 'My feelings during conflict resolution',
      narrative: [
        'Conflict resolution.',
        '',
        'Both heard.',
        '',
        'Solution sought.',
        '',
        'I tell conflict: both.'
      ],
      lesson: 'Conflict resolution both heard solution sought.'
    },
    {
      id: 'fn57_2',
      title: 'My feelings during mediation',
      narrative: [
        'Mediation feelings.',
        '',
        'Neutral third.',
        '',
        'Path forward.',
        '',
        'I tell stuck: mediation.'
      ],
      lesson: 'Mediation feelings neutral third path forward.'
    },
    {
      id: 'fn57_3',
      title: 'My feelings during family meeting',
      narrative: [
        'Family meeting.',
        '',
        'Issues addressed.',
        '',
        'All voices.',
        '',
        'I tell family-stuck: meeting.'
      ],
      lesson: 'Family meeting issues addressed all voices.'
    },
    {
      id: 'fn57_4',
      title: 'My feelings during couples therapy session',
      narrative: [
        'Couples therapy.',
        '',
        'Patterns named.',
        '',
        'Tools developed.',
        '',
        'I tell partner-stressed: therapy.'
      ],
      lesson: 'Couples therapy patterns named tools developed.'
    },
    {
      id: 'fn57_5',
      title: 'My feelings during family therapy',
      narrative: [
        'Family therapy.',
        '',
        'System examined.',
        '',
        'Roles understood.',
        '',
        'I tell family-stressed: system.'
      ],
      lesson: 'Family therapy system examined roles understood.'
    },
    {
      id: 'fn57_6',
      title: 'My feelings during group therapy',
      narrative: [
        'Group therapy.',
        '',
        'Mirrors offered.',
        '',
        'Shared work.',
        '',
        'I tell groups: mirrors.'
      ],
      lesson: 'Group therapy mirrors offered shared work.'
    },
    {
      id: 'fn57_7',
      title: 'My feelings during individual therapy',
      narrative: [
        'Individual therapy.',
        '',
        'Deep work.',
        '',
        'Self-knowing.',
        '',
        'I tell stuck: individual therapy.'
      ],
      lesson: 'Individual therapy deep work self-knowing.'
    },
    {
      id: 'fn57_8',
      title: 'My feelings during intensive therapy',
      narrative: [
        'Intensive therapy.',
        '',
        'Days at once.',
        '',
        'Deep dive.',
        '',
        'I tell stuck: intensive.'
      ],
      lesson: 'Intensive therapy days at once deep dive.'
    },
    {
      id: 'fn57_9',
      title: 'My feelings during retreat therapy',
      narrative: [
        'Retreat therapy.',
        '',
        'Immersive work.',
        '',
        'Multi-day.',
        '',
        'I tell deep-curious: retreat.'
      ],
      lesson: 'Retreat therapy immersive work multi-day.'
    },
    {
      id: 'fn57_10',
      title: 'My feelings during ongoing therapy',
      narrative: [
        'Ongoing therapy.',
        '',
        'Years of work.',
        '',
        'Layers peeled.',
        '',
        'I tell long-curious: ongoing.'
      ],
      lesson: 'Ongoing therapy years of work layers peeled.'
    },
    {
      id: 'fn57_11',
      title: 'My feelings during termination of therapy',
      narrative: [
        'Therapy termination.',
        '',
        'Intentional ending.',
        '',
        'Growth honored.',
        '',
        'I tell ending: intentional.'
      ],
      lesson: 'Therapy termination intentional ending growth honored.'
    },
    {
      id: 'fn57_12',
      title: 'My feelings between therapists',
      narrative: [
        'Between therapists.',
        '',
        'Sometimes needed.',
        '',
        'Fit matters.',
        '',
        'I tell mismatched: fit.'
      ],
      lesson: 'Between therapists sometimes needed fit matters.'
    },
    {
      id: 'fn57_13',
      title: 'My feelings finding new therapist',
      narrative: [
        'New therapist sought.',
        '',
        'Many tried.',
        '',
        'Fit eventually found.',
        '',
        'I tell searching: fit eventually.'
      ],
      lesson: 'New therapist sought many tried fit eventually found.'
    },
    {
      id: 'fn57_14',
      title: 'My feelings with first therapist',
      narrative: [
        'First therapist.',
        '',
        'Tentative trust.',
        '',
        'Vocabulary building.',
        '',
        'I tell new-therapy: tentative.'
      ],
      lesson: 'First therapist tentative trust vocabulary building.'
    },
    {
      id: 'fn57_15',
      title: 'My feelings with longtime therapist',
      narrative: [
        'Longtime therapist.',
        '',
        'Deep knowing.',
        '',
        'Years of trust.',
        '',
        'I tell long-therapy: trust deep.'
      ],
      lesson: 'Longtime therapist deep knowing years of trust.'
    }
  ];

  var FEELING_NARRATIVES_58 = [
    {
      id: 'fn58_1',
      title: 'My feelings on social media',
      narrative: [
        'Social media feelings.',
        '',
        'Mixed always.',
        '',
        'Curate carefully.',
        '',
        'I tell platform-stressed: curate.'
      ],
      lesson: 'Social media feelings mixed always curate carefully.'
    },
    {
      id: 'fn58_2',
      title: 'My feelings about online community',
      narrative: [
        'Online community.',
        '',
        'Real connection possible.',
        '',
        'Real friendships.',
        '',
        'I tell online-skeptical: real.'
      ],
      lesson: 'Online community real connection possible real friendships.'
    },
    {
      id: 'fn58_3',
      title: 'My feelings about comparison',
      narrative: [
        'Comparison feelings.',
        '',
        'Highlight reels.',
        '',
        'Mute or unfollow.',
        '',
        'I tell comparison-stuck: mute.'
      ],
      lesson: 'Comparison feelings highlight reels mute or unfollow.'
    },
    {
      id: 'fn58_4',
      title: 'My feelings about FOMO',
      narrative: [
        'FOMO feelings.',
        '',
        'Fear of missing.',
        '',
        'JOMO antidote.',
        '',
        'I tell FOMO-stuck: JOMO.'
      ],
      lesson: 'FOMO feelings fear of missing JOMO antidote.'
    },
    {
      id: 'fn58_5',
      title: 'My feelings about news',
      narrative: [
        'News feelings.',
        '',
        'Overwhelm common.',
        '',
        'Limit consumption.',
        '',
        'I tell news-overwhelmed: limit.'
      ],
      lesson: 'News feelings overwhelm common limit consumption.'
    },
    {
      id: 'fn58_6',
      title: 'My feelings about politics',
      narrative: [
        'Political feelings.',
        '',
        'Intense often.',
        '',
        'Channel to action.',
        '',
        'I tell political: action.'
      ],
      lesson: 'Political feelings intense often channel to action.'
    },
    {
      id: 'fn58_7',
      title: 'My feelings about climate',
      narrative: [
        'Climate anxiety.',
        '',
        'Real grief.',
        '',
        'Action plus acceptance.',
        '',
        'I tell climate-anxious: both.'
      ],
      lesson: 'Climate anxiety real grief action plus acceptance.'
    },
    {
      id: 'fn58_8',
      title: 'My feelings about social justice',
      narrative: [
        'Social justice feelings.',
        '',
        'Anger fuel.',
        '',
        'Sustained action.',
        '',
        'I tell justice: sustained.'
      ],
      lesson: 'Social justice feelings anger fuel sustained action.'
    },
    {
      id: 'fn58_9',
      title: 'My feelings about voting',
      narrative: [
        'Voting feelings.',
        '',
        'Pride or frustration.',
        '',
        'Civic duty.',
        '',
        'I tell civic: duty.'
      ],
      lesson: 'Voting feelings pride or frustration civic duty.'
    },
    {
      id: 'fn58_10',
      title: 'My feelings about volunteering',
      narrative: [
        'Volunteer feelings.',
        '',
        'Service joy.',
        '',
        'Meaning made.',
        '',
        'I tell purpose-curious: volunteer.'
      ],
      lesson: 'Volunteer feelings service joy meaning made.'
    },
    {
      id: 'fn58_11',
      title: 'My feelings about advocacy',
      narrative: [
        'Advocacy feelings.',
        '',
        'Voice raised.',
        '',
        'Impact made.',
        '',
        'I tell advocate: voice.'
      ],
      lesson: 'Advocacy feelings voice raised impact made.'
    },
    {
      id: 'fn58_12',
      title: 'My feelings about activism',
      narrative: [
        'Activism feelings.',
        '',
        'Hope and despair.',
        '',
        'Sustainability key.',
        '',
        'I tell activists: sustainable.'
      ],
      lesson: 'Activism feelings hope and despair sustainability key.'
    },
    {
      id: 'fn58_13',
      title: 'My feelings about giving',
      narrative: [
        'Giving feelings.',
        '',
        'Generosity practiced.',
        '',
        'Sustainable balance.',
        '',
        'I tell scarcity: generosity.'
      ],
      lesson: 'Giving feelings generosity practiced sustainable balance.'
    },
    {
      id: 'fn58_14',
      title: 'My feelings about receiving',
      narrative: [
        'Receiving feelings.',
        '',
        'Allow yourself.',
        '',
        'Vulnerable practice.',
        '',
        'I tell hard-receiver: practice.'
      ],
      lesson: 'Receiving feelings allow yourself vulnerable practice.'
    },
    {
      id: 'fn58_15',
      title: 'My feelings of all civic integrated',
      narrative: [
        'All civic integrated.',
        '',
        'Engaged citizen.',
        '',
        'Sustainable practice.',
        '',
        'I tell engaged: sustainable.'
      ],
      lesson: 'All civic integrated engaged citizen sustainable practice.'
    }
  ];

  var FEELING_NARRATIVES_59 = [
    {
      id: 'fn59_1',
      title: 'My feelings about creativity blocked',
      narrative: [
        'Creative block.',
        '',
        'Frustration common.',
        '',
        'Patience needed.',
        '',
        'I tell blocked: patience.'
      ],
      lesson: 'Creative block frustration common patience needed.'
    },
    {
      id: 'fn59_2',
      title: 'My feelings about creativity flow',
      narrative: [
        'Creative flow.',
        '',
        'Time disappears.',
        '',
        'Joy felt.',
        '',
        'I tell flow-seeking: practice.'
      ],
      lesson: 'Creative flow time disappears joy felt.'
    },
    {
      id: 'fn59_3',
      title: 'My feelings about creativity feedback',
      narrative: [
        'Feedback feelings.',
        '',
        'Vulnerable receiving.',
        '',
        'Growth opportunity.',
        '',
        'I tell creator: growth.'
      ],
      lesson: 'Feedback feelings vulnerable receiving growth opportunity.'
    },
    {
      id: 'fn59_4',
      title: 'My feelings about creativity perfectionism',
      narrative: [
        'Perfectionism block.',
        '',
        'Done over perfect.',
        '',
        'Ship it.',
        '',
        'I tell perfectionist: ship.'
      ],
      lesson: 'Perfectionism block done over perfect ship it.'
    },
    {
      id: 'fn59_5',
      title: 'My feelings about creative voice',
      narrative: [
        'Voice found.',
        '',
        'Years of practice.',
        '',
        'Authenticity emerges.',
        '',
        'I tell new-creator: years.'
      ],
      lesson: 'Voice found years of practice authenticity emerges.'
    },
    {
      id: 'fn59_6',
      title: 'My feelings about creative collaboration',
      narrative: [
        'Creative collaboration.',
        '',
        'Both grow.',
        '',
        'Mutual challenge.',
        '',
        'I tell creators: collaboration.'
      ],
      lesson: 'Creative collaboration both grow mutual challenge.'
    },
    {
      id: 'fn59_7',
      title: 'My feelings about creative competition',
      narrative: [
        'Creative competition.',
        '',
        'Comparison toxic.',
        '',
        'Own path.',
        '',
        'I tell competitive: own path.'
      ],
      lesson: 'Creative competition comparison toxic own path.'
    },
    {
      id: 'fn59_8',
      title: 'My feelings about creative practice',
      narrative: [
        'Creative practice.',
        '',
        'Daily ritual.',
        '',
        'Mastery emerges.',
        '',
        'I tell practice-curious: daily.'
      ],
      lesson: 'Creative practice daily ritual mastery emerges.'
    },
    {
      id: 'fn59_9',
      title: 'My feelings about creative break',
      narrative: [
        'Creative break needed.',
        '',
        'Rest required.',
        '',
        'Return refreshed.',
        '',
        'I tell burnout: break.'
      ],
      lesson: 'Creative break needed rest required return refreshed.'
    },
    {
      id: 'fn59_10',
      title: 'My feelings about creative return',
      narrative: [
        'Returning to creative.',
        '',
        'After break.',
        '',
        'New eyes.',
        '',
        'I tell returners: new eyes.'
      ],
      lesson: 'Returning to creative after break new eyes.'
    },
    {
      id: 'fn59_11',
      title: 'My feelings about creative finishing',
      narrative: [
        'Finishing creative work.',
        '',
        'Pride plus letdown.',
        '',
        'Both real.',
        '',
        'I tell finishers: both.'
      ],
      lesson: 'Finishing creative work pride plus letdown both real.'
    },
    {
      id: 'fn59_12',
      title: 'My feelings about creative sharing',
      narrative: [
        'Sharing creative.',
        '',
        'Vulnerable act.',
        '',
        'Worth doing.',
        '',
        'I tell hidden: share.'
      ],
      lesson: 'Sharing creative vulnerable act worth doing.'
    },
    {
      id: 'fn59_13',
      title: 'My feelings about creative selling',
      narrative: [
        'Selling creative work.',
        '',
        'Money plus art.',
        '',
        'Both possible.',
        '',
        'I tell artists: both possible.'
      ],
      lesson: 'Selling creative work money plus art both possible.'
    },
    {
      id: 'fn59_14',
      title: 'My feelings about creative legacy',
      narrative: [
        'Creative legacy.',
        '',
        'Body of work.',
        '',
        'Generations inherit.',
        '',
        'I tell legacy-curious: body.'
      ],
      lesson: 'Creative legacy body of work generations inherit.'
    },
    {
      id: 'fn59_15',
      title: 'My feelings of creativity integrated',
      narrative: [
        'Creativity integrated.',
        '',
        'Daily practice.',
        '',
        'Whole life.',
        '',
        'I tell creator: whole life.'
      ],
      lesson: 'Creativity integrated daily practice whole life.'
    }
  ];

  var FEELING_NARRATIVES_60 = [
    {
      id: 'fn60_1',
      title: 'My feelings about hobbies',
      narrative: [
        'Hobby feelings.',
        '',
        'Play in adults.',
        '',
        'Joy permitted.',
        '',
        'I tell serious: hobbies.'
      ],
      lesson: 'Hobby feelings play in adults joy permitted.'
    },
    {
      id: 'fn60_2',
      title: 'My feelings about gardening',
      narrative: [
        'Gardening feelings.',
        '',
        'Earth contact.',
        '',
        'Patience cultivated.',
        '',
        'I tell garden-curious: patience.'
      ],
      lesson: 'Gardening feelings earth contact patience cultivated.'
    },
    {
      id: 'fn60_3',
      title: 'My feelings about cooking',
      narrative: [
        'Cooking feelings.',
        '',
        'Hands engaged.',
        '',
        'Care offered.',
        '',
        'I tell cook-curious: care.'
      ],
      lesson: 'Cooking feelings hands engaged care offered.'
    },
    {
      id: 'fn60_4',
      title: 'My feelings about reading',
      narrative: [
        'Reading feelings.',
        '',
        'Mind transported.',
        '',
        'Worlds explored.',
        '',
        'I tell readers: worlds.'
      ],
      lesson: 'Reading feelings mind transported worlds explored.'
    },
    {
      id: 'fn60_5',
      title: 'My feelings about writing',
      narrative: [
        'Writing feelings.',
        '',
        'Voice discovered.',
        '',
        'Self known.',
        '',
        'I tell writer-curious: voice.'
      ],
      lesson: 'Writing feelings voice discovered self known.'
    },
    {
      id: 'fn60_6',
      title: 'My feelings about music',
      narrative: [
        'Music feelings.',
        '',
        'Body resonates.',
        '',
        'Soul fed.',
        '',
        'I tell music: soul.'
      ],
      lesson: 'Music feelings body resonates soul fed.'
    },
    {
      id: 'fn60_7',
      title: 'My feelings about art',
      narrative: [
        'Art feelings.',
        '',
        'Beauty made.',
        '',
        'Self expressed.',
        '',
        'I tell artists: beauty.'
      ],
      lesson: 'Art feelings beauty made self expressed.'
    },
    {
      id: 'fn60_8',
      title: 'My feelings about dance',
      narrative: [
        'Dance feelings.',
        '',
        'Body free.',
        '',
        'Joy embodied.',
        '',
        'I tell dancers: joy.'
      ],
      lesson: 'Dance feelings body free joy embodied.'
    },
    {
      id: 'fn60_9',
      title: 'My feelings about hiking',
      narrative: [
        'Hiking feelings.',
        '',
        'Body and nature.',
        '',
        'Mind clears.',
        '',
        'I tell hikers: mind clears.'
      ],
      lesson: 'Hiking feelings body and nature mind clears.'
    },
    {
      id: 'fn60_10',
      title: 'My feelings about cycling',
      narrative: [
        'Cycling feelings.',
        '',
        'Wind plus motion.',
        '',
        'Freedom felt.',
        '',
        'I tell cyclists: freedom.'
      ],
      lesson: 'Cycling feelings wind plus motion freedom felt.'
    },
    {
      id: 'fn60_11',
      title: 'My feelings about swimming',
      narrative: [
        'Swimming feelings.',
        '',
        'Water embrace.',
        '',
        'Body flows.',
        '',
        'I tell swimmers: flow.'
      ],
      lesson: 'Swimming feelings water embrace body flows.'
    },
    {
      id: 'fn60_12',
      title: 'My feelings about yoga',
      narrative: [
        'Yoga feelings.',
        '',
        'Body opening.',
        '',
        'Breath deep.',
        '',
        'I tell yoga: opening.'
      ],
      lesson: 'Yoga feelings body opening breath deep.'
    },
    {
      id: 'fn60_13',
      title: 'My feelings about meditation',
      narrative: [
        'Meditation feelings.',
        '',
        'Mind quiets.',
        '',
        'Spaciousness emerges.',
        '',
        'I tell meditators: spaciousness.'
      ],
      lesson: 'Meditation feelings mind quiets spaciousness emerges.'
    },
    {
      id: 'fn60_14',
      title: 'My feelings about prayer',
      narrative: [
        'Prayer feelings.',
        '',
        'Sacred encounter.',
        '',
        'Heart turned.',
        '',
        'I tell faithful: heart turned.'
      ],
      lesson: 'Prayer feelings sacred encounter heart turned.'
    },
    {
      id: 'fn60_15',
      title: 'My feelings about practice integrated',
      narrative: [
        'Practice integrated.',
        '',
        'Body, mind, spirit.',
        '',
        'Whole life.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'Practice integrated body, mind, spirit whole life.'
    }
  ];

  var FEELING_NARRATIVES_51 = [
    {
      id: 'fn51_1',
      title: 'My feelings as student',
      narrative: [
        'Student feelings.',
        '',
        'Pressure and curiosity.',
        '',
        'Balance sought.',
        '',
        'I tell students: balance.'
      ],
      lesson: 'Student feelings pressure and curiosity need balance.'
    },
    {
      id: 'fn51_2',
      title: 'My feelings test anxiety',
      narrative: [
        'Test anxiety real.',
        '',
        'Body amped.',
        '',
        'Tools available.',
        '',
        'I tell test-anxious: tools.'
      ],
      lesson: 'Test anxiety real body amped tools available.'
    },
    {
      id: 'fn51_3',
      title: 'My feelings school overwhelm',
      narrative: [
        'School overwhelm.',
        '',
        'Plan plus support.',
        '',
        'One day at a time.',
        '',
        'I tell overwhelmed: one day.'
      ],
      lesson: 'School overwhelm plan plus support one day at a time.'
    },
    {
      id: 'fn51_4',
      title: 'My feelings about grades',
      narrative: [
        'Grade feelings.',
        '',
        'Pride or disappointment.',
        '',
        'Both inform.',
        '',
        'I tell grade-stressed: inform.'
      ],
      lesson: 'Grade feelings pride or disappointment both inform.'
    },
    {
      id: 'fn51_5',
      title: 'My feelings about teachers',
      narrative: [
        'Teacher feelings.',
        '',
        'Some loved.',
        '',
        'Some difficult.',
        '',
        'I tell student: navigate.'
      ],
      lesson: 'Teacher feelings some loved some difficult; navigate.'
    },
    {
      id: 'fn51_6',
      title: 'My feelings about peers',
      narrative: [
        'Peer feelings.',
        '',
        'Belonging plus comparison.',
        '',
        'Own path.',
        '',
        'I tell peers-comparing: own path.'
      ],
      lesson: 'Peer feelings belonging plus comparison; own path.'
    },
    {
      id: 'fn51_7',
      title: 'My feelings about bullying',
      narrative: [
        'Bullying feelings.',
        '',
        'Fear and shame.',
        '',
        'Help available.',
        '',
        'I tell bullied: help.'
      ],
      lesson: 'Bullying feelings fear and shame; help available.'
    },
    {
      id: 'fn51_8',
      title: 'My feelings about friendships',
      narrative: [
        'Friendship feelings.',
        '',
        'Connection plus drama.',
        '',
        'Navigate carefully.',
        '',
        'I tell friend-stuck: navigate.'
      ],
      lesson: 'Friendship feelings connection plus drama; navigate carefully.'
    },
    {
      id: 'fn51_9',
      title: 'My feelings about first crush',
      narrative: [
        'First crush feelings.',
        '',
        'Intense and confusing.',
        '',
        'Normal experience.',
        '',
        'I tell crushed: normal.'
      ],
      lesson: 'First crush feelings intense and confusing as normal experience.'
    },
    {
      id: 'fn51_10',
      title: 'My feelings about first heartbreak',
      narrative: [
        'First heartbreak.',
        '',
        'Real grief.',
        '',
        'Time heals.',
        '',
        'I tell heartbroken: time.'
      ],
      lesson: 'First heartbreak real grief time heals.'
    },
    {
      id: 'fn51_11',
      title: 'My feelings about identity formation',
      narrative: [
        'Identity formation.',
        '',
        'Who am I?',
        '',
        'Experimentation valid.',
        '',
        'I tell teen-confused: experimentation.'
      ],
      lesson: 'Identity formation who am I experimentation valid.'
    },
    {
      id: 'fn51_12',
      title: 'My feelings about coming out',
      narrative: [
        'Coming out feelings.',
        '',
        'Fear plus relief.',
        '',
        'Affirming community.',
        '',
        'I tell coming-out: affirming.'
      ],
      lesson: 'Coming out feelings fear plus relief affirming community.'
    },
    {
      id: 'fn51_13',
      title: 'My feelings about family conflict',
      narrative: [
        'Family conflict teens.',
        '',
        'Normal developmental.',
        '',
        'Family therapy.',
        '',
        'I tell teen-family: therapy.'
      ],
      lesson: 'Family conflict teens normal developmental family therapy.'
    },
    {
      id: 'fn51_14',
      title: 'My feelings about parental expectations',
      narrative: [
        'Parental expectations.',
        '',
        'Pressure felt.',
        '',
        'Own path honored.',
        '',
        'I tell pressured: own path.'
      ],
      lesson: 'Parental expectations pressure felt own path honored.'
    },
    {
      id: 'fn51_15',
      title: 'My feelings about future career',
      narrative: [
        'Career future feelings.',
        '',
        'Uncertainty plus hope.',
        '',
        'Path unfolds.',
        '',
        'I tell career-anxious: unfolds.'
      ],
      lesson: 'Career future feelings uncertainty plus hope path unfolds.'
    }
  ];

  var FEELING_NARRATIVES_52 = [
    {
      id: 'fn52_1',
      title: 'My feelings about partnership',
      narrative: [
        'Partnership feelings.',
        '',
        'Daily commitment.',
        '',
        'Practice continues.',
        '',
        'I tell partnered: practice.'
      ],
      lesson: 'Partnership feelings daily commitment practice continues.'
    },
    {
      id: 'fn52_2',
      title: 'My feelings about communication',
      narrative: [
        'Communication feelings.',
        '',
        'Hard truths spoken.',
        '',
        'Connection deepens.',
        '',
        'I tell communication-stuck: hard truths.'
      ],
      lesson: 'Communication feelings hard truths spoken connection deepens.'
    },
    {
      id: 'fn52_3',
      title: 'My feelings about repair',
      narrative: [
        'Repair feelings.',
        '',
        'Vulnerability needed.',
        '',
        'Trust rebuilt.',
        '',
        'I tell conflict-stuck: repair.'
      ],
      lesson: 'Repair feelings vulnerability needed trust rebuilt.'
    },
    {
      id: 'fn52_4',
      title: 'My feelings about boundaries',
      narrative: [
        'Boundary feelings.',
        '',
        'Sometimes guilty.',
        '',
        'Healthy regardless.',
        '',
        'I tell boundary-guilty: healthy.'
      ],
      lesson: 'Boundary feelings sometimes guilty healthy regardless.'
    },
    {
      id: 'fn52_5',
      title: 'My feelings about intimacy',
      narrative: [
        'Intimacy feelings.',
        '',
        'Vulnerability shared.',
        '',
        'Connection deepens.',
        '',
        'I tell intimacy-curious: vulnerability.'
      ],
      lesson: 'Intimacy feelings vulnerability shared connection deepens.'
    },
    {
      id: 'fn52_6',
      title: 'My feelings about sexuality',
      narrative: [
        'Sexuality feelings.',
        '',
        'Affirming therapy.',
        '',
        'Pleasure reclaimed.',
        '',
        'I tell sex-stressed: affirming.'
      ],
      lesson: 'Sexuality feelings affirming therapy pleasure reclaimed.'
    },
    {
      id: 'fn52_7',
      title: 'My feelings about commitment',
      narrative: [
        'Commitment feelings.',
        '',
        'Long-term choice.',
        '',
        'Daily renewal.',
        '',
        'I tell committed: daily.'
      ],
      lesson: 'Commitment feelings long-term choice daily renewal.'
    },
    {
      id: 'fn52_8',
      title: 'My feelings about co-habitation',
      narrative: [
        'Co-habitation feelings.',
        '',
        'Daily life shared.',
        '',
        'Compromise constant.',
        '',
        'I tell co-habiting: compromise.'
      ],
      lesson: 'Co-habitation feelings daily life shared compromise constant.'
    },
    {
      id: 'fn52_9',
      title: 'My feelings about marriage',
      narrative: [
        'Marriage feelings.',
        '',
        'Public commitment.',
        '',
        'Daily living.',
        '',
        'I tell married: daily.'
      ],
      lesson: 'Marriage feelings public commitment daily living.'
    },
    {
      id: 'fn52_10',
      title: 'My feelings about parenting partner',
      narrative: [
        'Parenting partner.',
        '',
        'Shared mission.',
        '',
        'Tag team work.',
        '',
        'I tell co-parenting: tag team.'
      ],
      lesson: 'Parenting partner shared mission tag team work.'
    },
    {
      id: 'fn52_11',
      title: 'My feelings about empty nest partnership',
      narrative: [
        'Empty nest partnership.',
        '',
        'Rediscovery time.',
        '',
        'Identity shift.',
        '',
        'I tell empty-nest: rediscovery.'
      ],
      lesson: 'Empty nest partnership rediscovery time identity shift.'
    },
    {
      id: 'fn52_12',
      title: 'My feelings about retirement partnership',
      narrative: [
        'Retirement together.',
        '',
        'Adjustment ongoing.',
        '',
        'New rhythm.',
        '',
        'I tell retired: new rhythm.'
      ],
      lesson: 'Retirement together adjustment ongoing new rhythm.'
    },
    {
      id: 'fn52_13',
      title: 'My feelings about aging together',
      narrative: [
        'Aging together.',
        '',
        'Health support.',
        '',
        'Long love.',
        '',
        'I tell aging-couples: long love.'
      ],
      lesson: 'Aging together health support long love.'
    },
    {
      id: 'fn52_14',
      title: 'My feelings about partnership ending',
      narrative: [
        'Partnership ending.',
        '',
        'Grief profound.',
        '',
        'Identity rebuilt.',
        '',
        'I tell ending: identity.'
      ],
      lesson: 'Partnership ending grief profound identity rebuilt.'
    },
    {
      id: 'fn52_15',
      title: 'My feelings about new partnership',
      narrative: [
        'New partnership.',
        '',
        'Hope reborn.',
        '',
        'Slow building.',
        '',
        'I tell new-love: slow.'
      ],
      lesson: 'New partnership hope reborn slow building.'
    }
  ];

  var FEELING_NARRATIVES_53 = [
    {
      id: 'fn53_1',
      title: 'My feelings about parenting',
      narrative: [
        'Parenting feelings.',
        '',
        'Profound love.',
        '',
        'Profound stress.',
        '',
        'Both real.',
        '',
        'I tell parents: both real.'
      ],
      lesson: 'Parenting feelings profound love and stress both real.'
    },
    {
      id: 'fn53_2',
      title: 'My feelings as new parent',
      narrative: [
        'New parent feelings.',
        '',
        'Overwhelmed.',
        '',
        'In love.',
        '',
        'Support needed.',
        '',
        'I tell new-parents: support.'
      ],
      lesson: 'New parent feelings overwhelmed in love support needed.'
    },
    {
      id: 'fn53_3',
      title: 'My feelings as toddler parent',
      narrative: [
        'Toddler parent.',
        '',
        'Patience tested.',
        '',
        'Joy plus exhaustion.',
        '',
        'I tell toddler-parent: both.'
      ],
      lesson: 'Toddler parent patience tested joy plus exhaustion.'
    },
    {
      id: 'fn53_4',
      title: 'My feelings as elementary parent',
      narrative: [
        'Elementary parent.',
        '',
        'Independence emerging.',
        '',
        'School involvement.',
        '',
        'I tell elementary: emerging.'
      ],
      lesson: 'Elementary parent independence emerging school involvement.'
    },
    {
      id: 'fn53_5',
      title: 'My feelings as middle school parent',
      narrative: [
        'Middle school parent.',
        '',
        'Hormonal storms.',
        '',
        'Identity formation.',
        '',
        'I tell middle-school: storms.'
      ],
      lesson: 'Middle school parent hormonal storms identity formation.'
    },
    {
      id: 'fn53_6',
      title: 'My feelings as high school parent',
      narrative: [
        'High school parent.',
        '',
        'Separation begins.',
        '',
        'Letting go practice.',
        '',
        'I tell high-school: letting go.'
      ],
      lesson: 'High school parent separation begins letting go practice.'
    },
    {
      id: 'fn53_7',
      title: 'My feelings as college parent',
      narrative: [
        'College parent.',
        '',
        'Major separation.',
        '',
        'Empty nest impending.',
        '',
        'I tell college-parents: impending.'
      ],
      lesson: 'College parent major separation empty nest impending.'
    },
    {
      id: 'fn53_8',
      title: 'My feelings as adult child parent',
      narrative: [
        'Adult child parent.',
        '',
        'Relationship adult.',
        '',
        'Equals emerging.',
        '',
        'I tell adult-child: equals.'
      ],
      lesson: 'Adult child parent relationship adult equals emerging.'
    },
    {
      id: 'fn53_9',
      title: 'My feelings as grandparent',
      narrative: [
        'Grandparent feelings.',
        '',
        'Joy without rearing.',
        '',
        'Different chapter.',
        '',
        'I tell grandparents: joy.'
      ],
      lesson: 'Grandparent feelings joy without rearing different chapter.'
    },
    {
      id: 'fn53_10',
      title: 'My feelings as great-grandparent',
      narrative: [
        'Great-grandparent.',
        '',
        'Generational wisdom.',
        '',
        'Legacy lived.',
        '',
        'I tell great-grand: legacy.'
      ],
      lesson: 'Great-grandparent generational wisdom legacy lived.'
    },
    {
      id: 'fn53_11',
      title: 'My feelings parenting alone',
      narrative: [
        'Solo parenting.',
        '',
        'Exhausting and rewarding.',
        '',
        'Support sought.',
        '',
        'I tell solo-parents: support.'
      ],
      lesson: 'Solo parenting exhausting and rewarding support sought.'
    },
    {
      id: 'fn53_12',
      title: 'My feelings co-parenting',
      narrative: [
        'Co-parenting.',
        '',
        'Communication essential.',
        '',
        'Children priority.',
        '',
        'I tell co-parents: communicate.'
      ],
      lesson: 'Co-parenting communication essential children priority.'
    },
    {
      id: 'fn53_13',
      title: 'My feelings step-parenting',
      narrative: [
        'Step-parenting.',
        '',
        'Slow trust building.',
        '',
        'Patience essential.',
        '',
        'I tell step-parents: patient.'
      ],
      lesson: 'Step-parenting slow trust building patience essential.'
    },
    {
      id: 'fn53_14',
      title: 'My feelings adoptive parenting',
      narrative: [
        'Adoptive parenting.',
        '',
        'Specialty challenges.',
        '',
        'Specialty support.',
        '',
        'I tell adoptive: specialty.'
      ],
      lesson: 'Adoptive parenting specialty challenges specialty support.'
    },
    {
      id: 'fn53_15',
      title: 'My feelings foster parenting',
      narrative: [
        'Foster parenting.',
        '',
        'Temporary love.',
        '',
        'Multiple losses.',
        '',
        'I tell foster: support.'
      ],
      lesson: 'Foster parenting temporary love multiple losses support.'
    }
  ];

  var FEELING_NARRATIVES_54 = [
    {
      id: 'fn54_1',
      title: 'My feelings of inherited grief',
      narrative: [
        'Inherited grief.',
        '',
        'Family patterns.',
        '',
        'Cycle awareness.',
        '',
        'I tell pattern-stuck: cycle.'
      ],
      lesson: 'Inherited grief family patterns cycle awareness.'
    },
    {
      id: 'fn54_2',
      title: 'My feelings of inherited trauma',
      narrative: [
        'Inherited trauma.',
        '',
        'Epigenetic transfer.',
        '',
        'Healing begins.',
        '',
        'I tell trauma-inherited: healing.'
      ],
      lesson: 'Inherited trauma epigenetic transfer healing begins.'
    },
    {
      id: 'fn54_3',
      title: 'My feelings of cultural pride',
      narrative: [
        'Cultural pride.',
        '',
        'Heritage celebrated.',
        '',
        'Identity affirmed.',
        '',
        'I tell heritage-curious: celebrate.'
      ],
      lesson: 'Cultural pride heritage celebrated identity affirmed.'
    },
    {
      id: 'fn54_4',
      title: 'My feelings of cultural shame',
      narrative: [
        'Cultural shame.',
        '',
        'Often imposed.',
        '',
        'Decolonization work.',
        '',
        'I tell shamed-culture: decolonize.'
      ],
      lesson: 'Cultural shame often imposed; decolonization work.'
    },
    {
      id: 'fn54_5',
      title: 'My feelings of ancestral connection',
      narrative: [
        'Ancestral connection.',
        '',
        'Beyond personal.',
        '',
        'Lineage felt.',
        '',
        'I tell roots-curious: ancestral.'
      ],
      lesson: 'Ancestral connection beyond personal lineage felt.'
    },
    {
      id: 'fn54_6',
      title: 'My feelings of historical grief',
      narrative: [
        'Historical grief.',
        '',
        'Community loss.',
        '',
        'Collective mourning.',
        '',
        'I tell historical: collective.'
      ],
      lesson: 'Historical grief community loss collective mourning.'
    },
    {
      id: 'fn54_7',
      title: 'My feelings of survivor descendant',
      narrative: [
        'Survivor descendant.',
        '',
        'Carry the story.',
        '',
        'Specialty therapy.',
        '',
        'I tell descendant: specialty.'
      ],
      lesson: 'Survivor descendant carry the story specialty therapy.'
    },
    {
      id: 'fn54_8',
      title: 'My feelings of religious wound',
      narrative: [
        'Religious wound.',
        '',
        'Spiritual abuse.',
        '',
        'Healing needed.',
        '',
        'I tell religiously-wounded: healing.'
      ],
      lesson: 'Religious wound spiritual abuse healing needed.'
    },
    {
      id: 'fn54_9',
      title: 'My feelings of religious return',
      narrative: [
        'Religious return.',
        '',
        'Faith reclaimed.',
        '',
        'On own terms.',
        '',
        'I tell faith-returning: own terms.'
      ],
      lesson: 'Religious return faith reclaimed on own terms.'
    },
    {
      id: 'fn54_10',
      title: 'My feelings of spiritual seeking',
      narrative: [
        'Spiritual seeking.',
        '',
        'Multiple paths.',
        '',
        'Direct experience sought.',
        '',
        'I tell seeker: direct experience.'
      ],
      lesson: 'Spiritual seeking multiple paths direct experience sought.'
    },
    {
      id: 'fn54_11',
      title: 'My feelings of mystical experience',
      narrative: [
        'Mystical experience.',
        '',
        'Beyond words.',
        '',
        'Profound encounter.',
        '',
        'I tell mystical: profound.'
      ],
      lesson: 'Mystical experience beyond words profound encounter.'
    },
    {
      id: 'fn54_12',
      title: 'My feelings of unity',
      narrative: [
        'Unity feelings.',
        '',
        'All connected.',
        '',
        'Boundary dissolves.',
        '',
        'I tell separated: unity.'
      ],
      lesson: 'Unity feelings all connected boundary dissolves.'
    },
    {
      id: 'fn54_13',
      title: 'My feelings of transcendence',
      narrative: [
        'Transcendence felt.',
        '',
        'Beyond self.',
        '',
        'Sacred touched.',
        '',
        'I tell self-bound: transcendence.'
      ],
      lesson: 'Transcendence felt beyond self sacred touched.'
    },
    {
      id: 'fn54_14',
      title: 'My feelings of immanence',
      narrative: [
        'Immanence felt.',
        '',
        'Sacred within.',
        '',
        'Self holy.',
        '',
        'I tell external: immanence.'
      ],
      lesson: 'Immanence felt sacred within self holy.'
    },
    {
      id: 'fn54_15',
      title: 'My feelings of all spiritual integrated',
      narrative: [
        'All spiritual integrated.',
        '',
        'Many paths.',
        '',
        'Own way.',
        '',
        'I tell spiritual-seeking: own way.'
      ],
      lesson: 'All spiritual integrated many paths own way.'
    }
  ];

  var FEELING_NARRATIVES_55 = [
    {
      id: 'fn55_1',
      title: 'My feelings of forgiveness given',
      narrative: [
        'Forgiveness given.',
        '',
        'Self freed.',
        '',
        'Other not owed.',
        '',
        'I tell grudge-stuck: forgiveness frees self.'
      ],
      lesson: 'Forgiveness given self freed other not owed.'
    },
    {
      id: 'fn55_2',
      title: 'My feelings of forgiveness received',
      narrative: [
        'Forgiveness received.',
        '',
        'Allow it.',
        '',
        'Self-forgive.',
        '',
        'I tell shame-stuck: receive.'
      ],
      lesson: 'Forgiveness received allow it self-forgive.'
    },
    {
      id: 'fn55_3',
      title: 'My feelings of forgiveness withheld',
      narrative: [
        'Forgiveness withheld.',
        '',
        'Sometimes appropriate.',
        '',
        'Safety boundaries.',
        '',
        'I tell forced-forgiveness: boundaries.'
      ],
      lesson: 'Forgiveness withheld sometimes appropriate; safety boundaries.'
    },
    {
      id: 'fn55_4',
      title: 'My feelings of reconciliation',
      narrative: [
        'Reconciliation work.',
        '',
        'Both parties.',
        '',
        'Trust rebuilding.',
        '',
        'I tell estranged: reconciliation.'
      ],
      lesson: 'Reconciliation work both parties trust rebuilding.'
    },
    {
      id: 'fn55_5',
      title: 'My feelings of estrangement',
      narrative: [
        'Estrangement feelings.',
        '',
        'Sometimes necessary.',
        '',
        'Boundaries protected.',
        '',
        'I tell estranged: necessary.'
      ],
      lesson: 'Estrangement feelings sometimes necessary boundaries protected.'
    },
    {
      id: 'fn55_6',
      title: 'My feelings of amends made',
      narrative: [
        'Amends made.',
        '',
        'Past harms addressed.',
        '',
        'Self respected.',
        '',
        'I tell guilty: amends.'
      ],
      lesson: 'Amends made past harms addressed self respected.'
    },
    {
      id: 'fn55_7',
      title: 'My feelings of repair done',
      narrative: [
        'Repair done.',
        '',
        'Relationship healed.',
        '',
        'Deeper than before.',
        '',
        'I tell conflict-stuck: repair.'
      ],
      lesson: 'Repair done relationship healed deeper than before.'
    },
    {
      id: 'fn55_8',
      title: 'My feelings of acceptance of others',
      narrative: [
        'Acceptance of others.',
        '',
        'As they are.',
        '',
        'Change them not.',
        '',
        'I tell change-stuck: acceptance.'
      ],
      lesson: 'Acceptance of others as they are change them not.'
    },
    {
      id: 'fn55_9',
      title: 'My feelings of letting go',
      narrative: [
        'Letting go practice.',
        '',
        'Hands open.',
        '',
        'Energy preserved.',
        '',
        'I tell holding: letting go.'
      ],
      lesson: 'Letting go practice hands open energy preserved.'
    },
    {
      id: 'fn55_10',
      title: 'My feelings of grace given',
      narrative: [
        'Grace given to others.',
        '',
        'Beyond what earned.',
        '',
        'Mercy practiced.',
        '',
        'I tell harsh: grace.'
      ],
      lesson: 'Grace given to others beyond what earned mercy practiced.'
    },
    {
      id: 'fn55_11',
      title: 'My feelings of grace received',
      narrative: [
        'Grace received.',
        '',
        'Allow it.',
        '',
        'Gratitude follows.',
        '',
        'I tell unworthy: receive grace.'
      ],
      lesson: 'Grace received allow it gratitude follows.'
    },
    {
      id: 'fn55_12',
      title: 'My feelings of mercy',
      narrative: [
        'Mercy practiced.',
        '',
        'Self and others.',
        '',
        'Both directions.',
        '',
        'I tell strict: mercy.'
      ],
      lesson: 'Mercy practiced self and others both directions.'
    },
    {
      id: 'fn55_13',
      title: 'My feelings of compassion deepened',
      narrative: [
        'Compassion deepened.',
        '',
        'Suffering shared.',
        '',
        'Heart open.',
        '',
        'I tell hard-hearted: compassion.'
      ],
      lesson: 'Compassion deepened suffering shared heart open.'
    },
    {
      id: 'fn55_14',
      title: 'My feelings of love expanded',
      narrative: [
        'Love expanded.',
        '',
        'Beyond intimate.',
        '',
        'Universal love.',
        '',
        'I tell love-narrow: expand.'
      ],
      lesson: 'Love expanded beyond intimate universal love.'
    },
    {
      id: 'fn55_15',
      title: 'My feelings of all reconciliation integrated',
      narrative: [
        'All integrated.',
        '',
        'Forgiveness, acceptance, love.',
        '',
        'Whole web.',
        '',
        'I tell repair-curious: integration.'
      ],
      lesson: 'All integrated forgiveness, acceptance, love whole web.'
    }
  ];

  var FEELING_NARRATIVES_46 = [
    {
      id: 'fn46_1',
      title: 'My feelings about money',
      narrative: [
        'Money feelings.',
        '',
        'Anxiety, shame, freedom.',
        '',
        'Financial therapy.',
        '',
        'I tell money-stressed: therapy.'
      ],
      lesson: 'Money feelings of anxiety, shame, freedom benefit from financial therapy.'
    },
    {
      id: 'fn46_2',
      title: 'My feelings about success',
      narrative: [
        'Success feelings.',
        '',
        'Pride plus imposter.',
        '',
        'Both valid.',
        '',
        'I tell successful: both.'
      ],
      lesson: 'Success feelings pride plus imposter both valid.'
    },
    {
      id: 'fn46_3',
      title: 'My feelings about failure',
      narrative: [
        'Failure feelings.',
        '',
        'Disappointment plus learning.',
        '',
        'Reframe possible.',
        '',
        'I tell failure-stuck: reframe.'
      ],
      lesson: 'Failure feelings disappointment plus learning reframe possible.'
    },
    {
      id: 'fn46_4',
      title: 'My feelings about achievement',
      narrative: [
        'Achievement feelings.',
        '',
        'Pride claimed.',
        '',
        'Not minimized.',
        '',
        'I tell minimizers: claim.'
      ],
      lesson: 'Achievement feelings pride claimed not minimized.'
    },
    {
      id: 'fn46_5',
      title: 'My feelings about competition',
      narrative: [
        'Competition feelings.',
        '',
        'Drive plus stress.',
        '',
        'Balance sought.',
        '',
        'I tell competitive: balance.'
      ],
      lesson: 'Competition feelings drive plus stress need balance sought.'
    },
    {
      id: 'fn46_6',
      title: 'My feelings about collaboration',
      narrative: [
        'Collaboration feelings.',
        '',
        'Connection plus compromise.',
        '',
        'Both required.',
        '',
        'I tell collaborator: both.'
      ],
      lesson: 'Collaboration feelings connection plus compromise both required.'
    },
    {
      id: 'fn46_7',
      title: 'My feelings about leadership',
      narrative: [
        'Leadership feelings.',
        '',
        'Responsibility plus power.',
        '',
        'Service to others.',
        '',
        'I tell leaders: service.'
      ],
      lesson: 'Leadership feelings responsibility plus power as service to others.'
    },
    {
      id: 'fn46_8',
      title: 'My feelings about following',
      narrative: [
        'Following feelings.',
        '',
        'Trust required.',
        '',
        'Discernment needed.',
        '',
        'I tell follower: discernment.'
      ],
      lesson: 'Following feelings trust required and discernment needed.'
    },
    {
      id: 'fn46_9',
      title: 'My feelings about creativity',
      narrative: [
        'Creative feelings.',
        '',
        'Inspiration plus block.',
        '',
        'Cycle accepted.',
        '',
        'I tell creators: cycle.'
      ],
      lesson: 'Creative feelings inspiration plus block as accepted cycle.'
    },
    {
      id: 'fn46_10',
      title: 'My feelings about productivity',
      narrative: [
        'Productivity feelings.',
        '',
        'Cycles natural.',
        '',
        'Rest required.',
        '',
        'I tell productive: rest required.'
      ],
      lesson: 'Productivity feelings cycles natural rest required.'
    },
    {
      id: 'fn46_11',
      title: 'My feelings about rest',
      narrative: [
        'Rest feelings.',
        '',
        'Sometimes guilty.',
        '',
        'Permission needed.',
        '',
        'I tell rest-guilty: permission.'
      ],
      lesson: 'Rest feelings sometimes guilty need permission.'
    },
    {
      id: 'fn46_12',
      title: 'My feelings about play',
      narrative: [
        'Play feelings.',
        '',
        'Adult shyness.',
        '',
        'Permission granted.',
        '',
        'I tell serious-adults: play.'
      ],
      lesson: 'Play feelings adult shyness permission granted.'
    },
    {
      id: 'fn46_13',
      title: 'My feelings about learning',
      narrative: [
        'Learning feelings.',
        '',
        'Curiosity plus frustration.',
        '',
        'Beginners mind.',
        '',
        'I tell learning-curious: both.'
      ],
      lesson: 'Learning feelings curiosity plus frustration with beginners mind.'
    },
    {
      id: 'fn46_14',
      title: 'My feelings about teaching',
      narrative: [
        'Teaching feelings.',
        '',
        'Love plus exhaustion.',
        '',
        'Boundaries needed.',
        '',
        'I tell teachers: boundaries.'
      ],
      lesson: 'Teaching feelings love plus exhaustion need boundaries.'
    },
    {
      id: 'fn46_15',
      title: 'My feelings about mentoring',
      narrative: [
        'Mentoring feelings.',
        '',
        'Wisdom shared.',
        '',
        'Both grow.',
        '',
        'I tell mentor-curious: both grow.'
      ],
      lesson: 'Mentoring feelings wisdom shared both grow.'
    }
  ];

  var FEELING_NARRATIVES_47 = [
    {
      id: 'fn47_1',
      title: 'My feelings during health crisis',
      narrative: [
        'Health crisis feelings.',
        '',
        'Fear plus determination.',
        '',
        'Both real.',
        '',
        'I tell crisis: both.'
      ],
      lesson: 'Health crisis feelings fear plus determination both real.'
    },
    {
      id: 'fn47_2',
      title: 'My feelings during cancer',
      narrative: [
        'Cancer feelings.',
        '',
        'Many waves.',
        '',
        'Specialty support.',
        '',
        'I tell cancer-patients: support.'
      ],
      lesson: 'Cancer feelings many waves need specialty support.'
    },
    {
      id: 'fn47_3',
      title: 'My feelings during chronic illness',
      narrative: [
        'Chronic illness feelings.',
        '',
        'Adjustment ongoing.',
        '',
        'Disease community.',
        '',
        'I tell chronic: community.'
      ],
      lesson: 'Chronic illness feelings adjustment ongoing need disease community.'
    },
    {
      id: 'fn47_4',
      title: 'My feelings during disability',
      narrative: [
        'Disability feelings.',
        '',
        'Identity shifts.',
        '',
        'Disability community.',
        '',
        'I tell disabled: community.'
      ],
      lesson: 'Disability feelings identity shifts need disability community.'
    },
    {
      id: 'fn47_5',
      title: 'My feelings during mental illness',
      narrative: [
        'Mental illness feelings.',
        '',
        'Stigma plus reality.',
        '',
        'Treatment available.',
        '',
        'I tell stigma-stuck: treatment.'
      ],
      lesson: 'Mental illness feelings stigma plus reality treatment available.'
    },
    {
      id: 'fn47_6',
      title: 'My feelings during pregnancy loss',
      narrative: [
        'Pregnancy loss feelings.',
        '',
        'Profound grief.',
        '',
        'Specialty support.',
        '',
        'I tell loss: specialty.'
      ],
      lesson: 'Pregnancy loss feelings profound grief need specialty support.'
    },
    {
      id: 'fn47_7',
      title: 'My feelings during infertility',
      narrative: [
        'Infertility feelings.',
        '',
        'Roller coaster.',
        '',
        'Reproductive psychology.',
        '',
        'I tell infertility: specialty.'
      ],
      lesson: 'Infertility feelings roller coaster need reproductive psychology.'
    },
    {
      id: 'fn47_8',
      title: 'My feelings during adoption',
      narrative: [
        'Adoption feelings.',
        '',
        'Many layers.',
        '',
        'Adoption-aware therapy.',
        '',
        'I tell adoption-related: aware.'
      ],
      lesson: 'Adoption feelings many layers need adoption-aware therapy.'
    },
    {
      id: 'fn47_9',
      title: 'My feelings during caregiving',
      narrative: [
        'Caregiving feelings.',
        '',
        'Love plus burnout.',
        '',
        'Respite essential.',
        '',
        'I tell caregivers: respite.'
      ],
      lesson: 'Caregiving feelings love plus burnout need essential respite.'
    },
    {
      id: 'fn47_10',
      title: 'My feelings during ending',
      narrative: [
        'Endings feelings.',
        '',
        'Grief plus possibility.',
        '',
        'New beginning.',
        '',
        'I tell endings: new beginning.'
      ],
      lesson: 'Endings feelings grief plus possibility precede new beginning.'
    },
    {
      id: 'fn47_11',
      title: 'My feelings during beginning',
      narrative: [
        'Beginning feelings.',
        '',
        'Excitement plus fear.',
        '',
        'Both honored.',
        '',
        'I tell beginnings: both.'
      ],
      lesson: 'Beginning feelings excitement plus fear both honored.'
    },
    {
      id: 'fn47_12',
      title: 'My feelings during middle',
      narrative: [
        'Middle feelings.',
        '',
        'Boredom or depth.',
        '',
        'Stay present.',
        '',
        'I tell middle-stuck: stay.'
      ],
      lesson: 'Middle feelings boredom or depth stay present.'
    },
    {
      id: 'fn47_13',
      title: 'My feelings during transition',
      narrative: [
        'Transition feelings.',
        '',
        'Liminal space.',
        '',
        'Discomfort accepted.',
        '',
        'I tell transitioning: discomfort.'
      ],
      lesson: 'Transition feelings liminal space discomfort accepted.'
    },
    {
      id: 'fn47_14',
      title: 'My feelings during stability',
      narrative: [
        'Stability feelings.',
        '',
        'Peace plus restlessness.',
        '',
        'Both possible.',
        '',
        'I tell stable: both.'
      ],
      lesson: 'Stability feelings peace plus restlessness both possible.'
    },
    {
      id: 'fn47_15',
      title: 'My feelings of all life stages integrated',
      narrative: [
        'All life stages.',
        '',
        'Each held.',
        '',
        'Wisdom emerges.',
        '',
        'I tell elderly: wisdom.'
      ],
      lesson: 'All life stages each held wisdom emerges.'
    }
  ];

  var FEELING_NARRATIVES_48 = [
    {
      id: 'fn48_1',
      title: 'My feelings of body',
      narrative: [
        'Body feelings.',
        '',
        'Physical sensations.',
        '',
        'Information rich.',
        '',
        'I tell body-disconnected: feel.'
      ],
      lesson: 'Body feelings physical sensations information rich.'
    },
    {
      id: 'fn48_2',
      title: 'My feelings in stomach',
      narrative: [
        'Stomach feelings.',
        '',
        'Gut feelings real.',
        '',
        'Intuition.',
        '',
        'I tell intuition-curious: stomach.'
      ],
      lesson: 'Stomach feelings gut feelings real intuition.'
    },
    {
      id: 'fn48_3',
      title: 'My feelings in chest',
      narrative: [
        'Chest feelings.',
        '',
        'Heart center.',
        '',
        'Love plus grief.',
        '',
        'I tell chest-heavy: heart.'
      ],
      lesson: 'Chest feelings heart center love plus grief.'
    },
    {
      id: 'fn48_4',
      title: 'My feelings in throat',
      narrative: [
        'Throat feelings.',
        '',
        'Voice center.',
        '',
        'Tightness suppressed.',
        '',
        'I tell voice-stuck: throat.'
      ],
      lesson: 'Throat feelings voice center tightness suppressed.'
    },
    {
      id: 'fn48_5',
      title: 'My feelings in head',
      narrative: [
        'Head feelings.',
        '',
        'Thoughts plus tension.',
        '',
        'Mind center.',
        '',
        'I tell head-stuck: tension.'
      ],
      lesson: 'Head feelings thoughts plus tension mind center.'
    },
    {
      id: 'fn48_6',
      title: 'My feelings in shoulders',
      narrative: [
        'Shoulder feelings.',
        '',
        'Burden carried.',
        '',
        'Tension held.',
        '',
        'I tell heavy-shoulders: burden.'
      ],
      lesson: 'Shoulder feelings burden carried tension held.'
    },
    {
      id: 'fn48_7',
      title: 'My feelings in jaw',
      narrative: [
        'Jaw feelings.',
        '',
        'Words held back.',
        '',
        'Tension stored.',
        '',
        'I tell clenched-jaw: words.'
      ],
      lesson: 'Jaw feelings words held back tension stored.'
    },
    {
      id: 'fn48_8',
      title: 'My feelings in hands',
      narrative: [
        'Hand feelings.',
        '',
        'Tightness or flow.',
        '',
        'Action urges.',
        '',
        'I tell hand-tight: urge.'
      ],
      lesson: 'Hand feelings tightness or flow action urges.'
    },
    {
      id: 'fn48_9',
      title: 'My feelings in legs',
      narrative: [
        'Leg feelings.',
        '',
        'Flee or stand.',
        '',
        'Movement urges.',
        '',
        'I tell leg-restless: flee or stand.'
      ],
      lesson: 'Leg feelings flee or stand movement urges.'
    },
    {
      id: 'fn48_10',
      title: 'My feelings in back',
      narrative: [
        'Back feelings.',
        '',
        'Support or burden.',
        '',
        'Foundation.',
        '',
        'I tell back-pain: support.'
      ],
      lesson: 'Back feelings support or burden foundation.'
    },
    {
      id: 'fn48_11',
      title: 'My feelings in feet',
      narrative: [
        'Feet feelings.',
        '',
        'Ground beneath.',
        '',
        'Standing strong.',
        '',
        'I tell ungrounded: feet.'
      ],
      lesson: 'Feet feelings ground beneath standing strong.'
    },
    {
      id: 'fn48_12',
      title: 'My feelings in heart rate',
      narrative: [
        'Heart rate emotion.',
        '',
        'Fast anxiety.',
        '',
        'Slow calm.',
        '',
        'I tell hrv-curious: emotion.'
      ],
      lesson: 'Heart rate emotion fast anxiety slow calm.'
    },
    {
      id: 'fn48_13',
      title: 'My feelings in breath',
      narrative: [
        'Breath emotion.',
        '',
        'Shallow stressed.',
        '',
        'Deep calm.',
        '',
        'I tell stressed: breath shifts.'
      ],
      lesson: 'Breath emotion shallow stressed deep calm.'
    },
    {
      id: 'fn48_14',
      title: 'My feelings in body temperature',
      narrative: [
        'Temperature emotion.',
        '',
        'Hot anger.',
        '',
        'Cold fear.',
        '',
        'I tell temperature-curious: emotion.'
      ],
      lesson: 'Temperature emotion hot anger cold fear.'
    },
    {
      id: 'fn48_15',
      title: 'My feelings whole body integrated',
      narrative: [
        'Whole body integrated.',
        '',
        'Map of feelings.',
        '',
        'Self-knowing deep.',
        '',
        'I tell body-mapping: deep.'
      ],
      lesson: 'Whole body integrated map of feelings self-knowing deep.'
    }
  ];

  var FEELING_NARRATIVES_49 = [
    {
      id: 'fn49_1',
      title: 'My feelings of being safe',
      narrative: [
        'Safety felt.',
        '',
        'Nervous system relaxes.',
        '',
        'Authentic emerges.',
        '',
        'I tell unsafe: safety first.'
      ],
      lesson: 'Safety felt nervous system relaxes authentic emerges.'
    },
    {
      id: 'fn49_2',
      title: 'My feelings of being heard',
      narrative: [
        'Heard deeply.',
        '',
        'Validation received.',
        '',
        'Connection felt.',
        '',
        'I tell unheard: heard practice.'
      ],
      lesson: 'Heard deeply validation received connection felt.'
    },
    {
      id: 'fn49_3',
      title: 'My feelings of being known',
      narrative: [
        'Known fully.',
        '',
        'No mask.',
        '',
        'Profound intimacy.',
        '',
        'I tell hidden: known.'
      ],
      lesson: 'Known fully no mask profound intimacy.'
    },
    {
      id: 'fn49_4',
      title: 'My feelings of being loved',
      narrative: [
        'Loved fully.',
        '',
        'As I am.',
        '',
        'Self-acceptance follows.',
        '',
        'I tell unloved: love practice.'
      ],
      lesson: 'Loved fully as I am self-acceptance follows.'
    },
    {
      id: 'fn49_5',
      title: 'My feelings of being supported',
      narrative: [
        'Support received.',
        '',
        'Allow it.',
        '',
        'Help possible.',
        '',
        'I tell self-reliant: support.'
      ],
      lesson: 'Support received allow it help possible.'
    },
    {
      id: 'fn49_6',
      title: 'My feelings of being valued',
      narrative: [
        'Valued for being.',
        '',
        'Not doing.',
        '',
        'Inherent worth.',
        '',
        'I tell worth-doing: being valued.'
      ],
      lesson: 'Valued for being not doing inherent worth.'
    },
    {
      id: 'fn49_7',
      title: 'My feelings of being seen',
      narrative: [
        'Seen truly.',
        '',
        'Witnessed.',
        '',
        'Profound experience.',
        '',
        'I tell invisible: seen practice.'
      ],
      lesson: 'Seen truly witnessed as profound experience.'
    },
    {
      id: 'fn49_8',
      title: 'My feelings of being included',
      narrative: [
        'Included fully.',
        '',
        'Group belonging.',
        '',
        'Identity affirmed.',
        '',
        'I tell excluded: included.'
      ],
      lesson: 'Included fully group belonging identity affirmed.'
    },
    {
      id: 'fn49_9',
      title: 'My feelings of being chosen',
      narrative: [
        'Chosen by friends.',
        '',
        'Chosen by partner.',
        '',
        'Worth confirmed.',
        '',
        'I tell unchosen: chosen.'
      ],
      lesson: 'Chosen by friends and partner confirms worth.'
    },
    {
      id: 'fn49_10',
      title: 'My feelings of being needed',
      narrative: [
        'Needed feeling.',
        '',
        'Purpose felt.',
        '',
        'Service direction.',
        '',
        'I tell purposeless: needed.'
      ],
      lesson: 'Needed feeling purpose felt service direction.'
    },
    {
      id: 'fn49_11',
      title: 'My feelings of being trusted',
      narrative: [
        'Trusted by others.',
        '',
        'Honor maintained.',
        '',
        'Relationship deep.',
        '',
        'I tell trust-curious: trusted.'
      ],
      lesson: 'Trusted by others honor maintained relationship deep.'
    },
    {
      id: 'fn49_12',
      title: 'My feelings of being respected',
      narrative: [
        'Respected fully.',
        '',
        'Boundaries honored.',
        '',
        'Self-respect mirror.',
        '',
        'I tell unrespected: respected.'
      ],
      lesson: 'Respected fully boundaries honored self-respect mirror.'
    },
    {
      id: 'fn49_13',
      title: 'My feelings of being remembered',
      narrative: [
        'Remembered by others.',
        '',
        'Cards on birthday.',
        '',
        'Existence affirmed.',
        '',
        'I tell forgotten: remembered.'
      ],
      lesson: 'Remembered by others cards on birthday existence affirmed.'
    },
    {
      id: 'fn49_14',
      title: 'My feelings of being missed',
      narrative: [
        'Missed by others.',
        '',
        'Reunion joy.',
        '',
        'Worth confirmed.',
        '',
        'I tell unmissed: missed.'
      ],
      lesson: 'Missed by others reunion joy worth confirmed.'
    },
    {
      id: 'fn49_15',
      title: 'My feelings of all positive integrated',
      narrative: [
        'All positive integrated.',
        '',
        'Foundation built.',
        '',
        'Stable self.',
        '',
        'I tell foundation: built.'
      ],
      lesson: 'All positive integrated foundation built stable self.'
    }
  ];

  var FEELING_NARRATIVES_50 = [
    {
      id: 'fn50_1',
      title: 'My feelings final integration',
      narrative: [
        'Years of practice.',
        '',
        'All feelings integrated.',
        '',
        'Daily second nature.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'Years of practice all feelings integrated daily second nature.'
    },
    {
      id: 'fn50_2',
      title: 'My feelings teach others',
      narrative: [
        'Teaching others.',
        '',
        'Vocabulary shared.',
        '',
        'Skills passed.',
        '',
        'I tell experienced: teach.'
      ],
      lesson: 'Teaching others vocabulary shared skills passed.'
    },
    {
      id: 'fn50_3',
      title: 'My feelings of legacy',
      narrative: [
        'Legacy of feeling work.',
        '',
        'Children inherit.',
        '',
        'Generations shifted.',
        '',
        'I tell parents: legacy.'
      ],
      lesson: 'Legacy of feeling work children inherit generations shifted.'
    },
    {
      id: 'fn50_4',
      title: 'My feelings final wisdom',
      narrative: [
        'Wisdom emerges.',
        '',
        'Suffering integrated.',
        '',
        'Compassion deepened.',
        '',
        'I tell elderly: wisdom.'
      ],
      lesson: 'Wisdom emerges suffering integrated compassion deepened.'
    },
    {
      id: 'fn50_5',
      title: 'My feelings final acceptance',
      narrative: [
        'Acceptance ultimate.',
        '',
        'All feelings welcome.',
        '',
        'Whole self.',
        '',
        'I tell fragmented: acceptance.'
      ],
      lesson: 'Acceptance ultimate all feelings welcome whole self.'
    },
    {
      id: 'fn50_6',
      title: 'My feelings final love',
      narrative: [
        'Love ultimate anchor.',
        '',
        'Self and others.',
        '',
        'Connection maintained.',
        '',
        'I tell love-curious: anchor.'
      ],
      lesson: 'Love ultimate anchor self and others connection maintained.'
    },
    {
      id: 'fn50_7',
      title: 'My feelings final practice',
      narrative: [
        'Daily practice continues.',
        '',
        'Lifelong commitment.',
        '',
        'Never complete.',
        '',
        'I tell beginners: lifelong.'
      ],
      lesson: 'Daily practice continues lifelong commitment never complete.'
    },
    {
      id: 'fn50_8',
      title: 'My feelings final service',
      narrative: [
        'Service emerges.',
        '',
        'Others helped.',
        '',
        'Meaning made.',
        '',
        'I tell experienced: service.'
      ],
      lesson: 'Service emerges others helped meaning made.'
    },
    {
      id: 'fn50_9',
      title: 'My feelings final wisdom shared',
      narrative: [
        'Wisdom shared.',
        '',
        'Teaching emerging.',
        '',
        'Mentoring growing.',
        '',
        'I tell wise: share.'
      ],
      lesson: 'Wisdom shared teaching emerging mentoring growing.'
    },
    {
      id: 'fn50_10',
      title: 'My feelings final wholeness',
      narrative: [
        'Wholeness achieved.',
        '',
        'All parts welcome.',
        '',
        'Integration complete.',
        '',
        'I tell fragmented: wholeness.'
      ],
      lesson: 'Wholeness achieved all parts welcome integration complete.'
    },
    {
      id: 'fn50_11',
      title: 'My feelings final peace',
      narrative: [
        'Peace cultivated.',
        '',
        'Inner not outer.',
        '',
        'Years of practice.',
        '',
        'I tell peace-seeking: inner.'
      ],
      lesson: 'Peace cultivated inner not outer years of practice.'
    },
    {
      id: 'fn50_12',
      title: 'My feelings final humility',
      narrative: [
        'Humility maintained.',
        '',
        'Always learning.',
        '',
        'Beginners mind.',
        '',
        'I tell mature: humility.'
      ],
      lesson: 'Humility maintained always learning beginners mind.'
    },
    {
      id: 'fn50_13',
      title: 'My feelings final gratitude',
      narrative: [
        'Gratitude lifelong.',
        '',
        'Tools available.',
        '',
        'Practice possible.',
        '',
        'I tell beginners: gratitude.'
      ],
      lesson: 'Gratitude lifelong tools available practice possible.'
    },
    {
      id: 'fn50_14',
      title: 'My feelings final presence',
      narrative: [
        'Presence ultimate.',
        '',
        'This moment.',
        '',
        'Always available.',
        '',
        'I tell scattered: presence.'
      ],
      lesson: 'Presence ultimate this moment always available.'
    },
    {
      id: 'fn50_15',
      title: 'My feelings final word',
      narrative: [
        'Final word: feel.',
        '',
        'All emotions welcome.',
        '',
        'Whole self honored.',
        '',
        'I tell all: feel everything.'
      ],
      lesson: 'Final word: feel all emotions welcome whole self honored.'
    }
  ];

  var FEELING_NARRATIVES_41 = [
    {
      id: 'fn41_1',
      title: 'My feelings of awe in nature',
      narrative: [
        'Nature awe.',
        '',
        'Mountains, oceans.',
        '',
        'Scale shifts perspective.',
        '',
        'I tell nature: scale.'
      ],
      lesson: 'Nature awe in mountains and oceans shifts perspective through scale.'
    },
    {
      id: 'fn41_2',
      title: 'My feelings of awe in art',
      narrative: [
        'Art awe.',
        '',
        'Beauty captured.',
        '',
        'Human creation.',
        '',
        'I tell art-curious: awe.'
      ],
      lesson: 'Art awe beauty captured through human creation.'
    },
    {
      id: 'fn41_3',
      title: 'My feelings of awe in music',
      narrative: [
        'Music awe.',
        '',
        'Sound moves.',
        '',
        'Body responds.',
        '',
        'I tell music-curious: awe.'
      ],
      lesson: 'Music awe sound moves body responds.'
    },
    {
      id: 'fn41_4',
      title: 'My feelings of awe in stars',
      narrative: [
        'Star awe.',
        '',
        'Universe vast.',
        '',
        'Self small.',
        '',
        'I tell perspective: stars.'
      ],
      lesson: 'Star awe universe vast and self small.'
    },
    {
      id: 'fn41_5',
      title: 'My feelings of awe in kindness',
      narrative: [
        'Kindness awe.',
        '',
        'Strangers help.',
        '',
        'Human good.',
        '',
        'I tell cynical: kindness.'
      ],
      lesson: 'Kindness awe strangers help shows human good.'
    },
    {
      id: 'fn41_6',
      title: 'My feelings of awe in birth',
      narrative: [
        'Birth awe.',
        '',
        'Life emerging.',
        '',
        'Miracle witnessed.',
        '',
        'I tell birth-witnesses: awe.'
      ],
      lesson: 'Birth awe life emerging as miracle witnessed.'
    },
    {
      id: 'fn41_7',
      title: 'My feelings of awe in death',
      narrative: [
        'Death awe.',
        '',
        'Passage witnessed.',
        '',
        'Mystery profound.',
        '',
        'I tell death-witnesses: awe.'
      ],
      lesson: 'Death awe passage witnessed mystery profound.'
    },
    {
      id: 'fn41_8',
      title: 'My feelings of awe in healing',
      narrative: [
        'Healing awe.',
        '',
        'Body restores.',
        '',
        'Mind integrates.',
        '',
        'I tell recovery-curious: awe.'
      ],
      lesson: 'Healing awe body restores and mind integrates.'
    },
    {
      id: 'fn41_9',
      title: 'My feelings of awe in love',
      narrative: [
        'Love awe.',
        '',
        'Connection deep.',
        '',
        'Beyond understanding.',
        '',
        'I tell love-curious: awe.'
      ],
      lesson: 'Love awe connection deep beyond understanding.'
    },
    {
      id: 'fn41_10',
      title: 'My feelings of awe in mystery',
      narrative: [
        'Mystery awe.',
        '',
        'Unknown welcomed.',
        '',
        'Wonder cultivated.',
        '',
        'I tell control-stuck: mystery.'
      ],
      lesson: 'Mystery awe unknown welcomed cultivates wonder.'
    },
    {
      id: 'fn41_11',
      title: 'My feelings of awe in time',
      narrative: [
        'Time awe.',
        '',
        'Geological scale.',
        '',
        'Brief existence.',
        '',
        'I tell time-anxious: scale.'
      ],
      lesson: 'Time awe geological scale brief existence.'
    },
    {
      id: 'fn41_12',
      title: 'My feelings of awe in size',
      narrative: [
        'Size awe.',
        '',
        'Tiny and vast.',
        '',
        'Both wonder.',
        '',
        'I tell size: both wonder.'
      ],
      lesson: 'Size awe tiny and vast both wonder.'
    },
    {
      id: 'fn41_13',
      title: 'My feelings of awe in connection',
      narrative: [
        'Connection awe.',
        '',
        'Strangers smile.',
        '',
        'Bond formed.',
        '',
        'I tell isolated: connection awe.'
      ],
      lesson: 'Connection awe strangers smile and bond formed.'
    },
    {
      id: 'fn41_14',
      title: 'My feelings of awe in growth',
      narrative: [
        'Growth awe.',
        '',
        'Trees grow.',
        '',
        'Children grow.',
        '',
        'Witness change.',
        '',
        'I tell growth: awe.'
      ],
      lesson: 'Growth awe trees and children grow witness change.'
    },
    {
      id: 'fn41_15',
      title: 'My feelings of awe sustained',
      narrative: [
        'Awe sustained daily.',
        '',
        'Practice cultivated.',
        '',
        'Life rich.',
        '',
        'I tell awe-blind: cultivate.'
      ],
      lesson: 'Awe sustained daily practice cultivated keeps life rich.'
    }
  ];

  var FEELING_NARRATIVES_42 = [
    {
      id: 'fn42_1',
      title: 'My feelings during meditation',
      narrative: [
        'Meditation surfaces feelings.',
        '',
        'Welcome them.',
        '',
        'Pass through.',
        '',
        'I tell meditator: welcome.'
      ],
      lesson: 'Meditation surfaces feelings; welcome them and let pass through.'
    },
    {
      id: 'fn42_2',
      title: 'My feelings during yoga',
      narrative: [
        'Yoga releases feelings.',
        '',
        'Body opening.',
        '',
        'Tears sometimes.',
        '',
        'I tell yoga-emotional: normal.'
      ],
      lesson: 'Yoga releases feelings body opening tears sometimes normal.'
    },
    {
      id: 'fn42_3',
      title: 'My feelings during breath work',
      narrative: [
        'Breath work surfaces feelings.',
        '',
        'Body releases.',
        '',
        'Witness needed.',
        '',
        'I tell breath-work: witness.'
      ],
      lesson: 'Breath work surfaces feelings body releases needs witness.'
    },
    {
      id: 'fn42_4',
      title: 'My feelings during massage',
      narrative: [
        'Massage releases.',
        '',
        'Body holds memories.',
        '',
        'Emotion surfaces.',
        '',
        'I tell massage-emotional: normal.'
      ],
      lesson: 'Massage releases body holds memories emotion surfaces normal.'
    },
    {
      id: 'fn42_5',
      title: 'My feelings during EMDR',
      narrative: [
        'EMDR surfaces trauma feelings.',
        '',
        'Therapist guides.',
        '',
        'Processing happens.',
        '',
        'I tell EMDR-curious: processing.'
      ],
      lesson: 'EMDR surfaces trauma feelings therapist guides processing happens.'
    },
    {
      id: 'fn42_6',
      title: 'My feelings during art therapy',
      narrative: [
        'Art therapy surfaces feelings.',
        '',
        'Non-verbal channel.',
        '',
        'Body knows.',
        '',
        'I tell verbal-stuck: art.'
      ],
      lesson: 'Art therapy surfaces feelings through non-verbal channel; body knows.'
    },
    {
      id: 'fn42_7',
      title: 'My feelings during music therapy',
      narrative: [
        'Music therapy surfaces feelings.',
        '',
        'Sound resonates.',
        '',
        'Body responds.',
        '',
        'I tell music-curious: therapy.'
      ],
      lesson: 'Music therapy surfaces feelings sound resonates body responds.'
    },
    {
      id: 'fn42_8',
      title: 'My feelings during dance therapy',
      narrative: [
        'Dance therapy surfaces feelings.',
        '',
        'Body expresses.',
        '',
        'Released through motion.',
        '',
        'I tell body-stuck: dance therapy.'
      ],
      lesson: 'Dance therapy surfaces feelings body expresses released through motion.'
    },
    {
      id: 'fn42_9',
      title: 'My feelings during equine therapy',
      narrative: [
        'Equine therapy.',
        '',
        'Horse mirrors.',
        '',
        'Body learning.',
        '',
        'I tell experiential: equine.'
      ],
      lesson: 'Equine therapy horse mirrors body learning.'
    },
    {
      id: 'fn42_10',
      title: 'My feelings during somatic therapy',
      narrative: [
        'Somatic therapy.',
        '',
        'Body holds trauma.',
        '',
        'Release possible.',
        '',
        'I tell body-held: somatic.'
      ],
      lesson: 'Somatic therapy body holds trauma release possible.'
    },
    {
      id: 'fn42_11',
      title: 'My feelings during IFS therapy',
      narrative: [
        'IFS parts work.',
        '',
        'Internal voices heard.',
        '',
        'Integration possible.',
        '',
        'I tell parts-stuck: IFS.'
      ],
      lesson: 'IFS parts work internal voices heard integration possible.'
    },
    {
      id: 'fn42_12',
      title: 'My feelings during ACT therapy',
      narrative: [
        'ACT values therapy.',
        '',
        'Acceptance plus commitment.',
        '',
        'Action aligned.',
        '',
        'I tell values-curious: ACT.'
      ],
      lesson: 'ACT values therapy acceptance plus commitment action aligned.'
    },
    {
      id: 'fn42_13',
      title: 'My feelings during CBT therapy',
      narrative: [
        'CBT thought work.',
        '',
        'Cognitive restructuring.',
        '',
        'Mood shifts.',
        '',
        'I tell CBT-curious: works.'
      ],
      lesson: 'CBT thought work cognitive restructuring mood shifts works.'
    },
    {
      id: 'fn42_14',
      title: 'My feelings during DBT therapy',
      narrative: [
        'DBT skills.',
        '',
        'Mindfulness foundation.',
        '',
        'Concrete tools.',
        '',
        'I tell DBT-curious: tools.'
      ],
      lesson: 'DBT skills mindfulness foundation concrete tools.'
    },
    {
      id: 'fn42_15',
      title: 'My feelings during psychodynamic',
      narrative: [
        'Psychodynamic therapy.',
        '',
        'Deep patterns.',
        '',
        'Long-term work.',
        '',
        'I tell depth-curious: psychodynamic.'
      ],
      lesson: 'Psychodynamic therapy deep patterns long-term work.'
    }
  ];

  var FEELING_NARRATIVES_43 = [
    {
      id: 'fn43_1',
      title: 'My feelings of self-compassion',
      narrative: [
        'Self-compassion practice.',
        '',
        'Daily kindness.',
        '',
        'Bucket lighter.',
        '',
        'I tell self-critical: compassion.'
      ],
      lesson: 'Self-compassion practice daily kindness lightens bucket.'
    },
    {
      id: 'fn43_2',
      title: 'My feelings of self-worth',
      narrative: [
        'Self-worth cultivated.',
        '',
        'Inherent dignity.',
        '',
        'Not earned.',
        '',
        'I tell worth-questioning: inherent.'
      ],
      lesson: 'Self-worth cultivated as inherent dignity not earned.'
    },
    {
      id: 'fn43_3',
      title: 'My feelings of self-respect',
      narrative: [
        'Self-respect.',
        '',
        'Boundaries maintained.',
        '',
        'Values lived.',
        '',
        'I tell boundary-weak: respect.'
      ],
      lesson: 'Self-respect maintains boundaries living values.'
    },
    {
      id: 'fn43_4',
      title: 'My feelings of self-acceptance',
      narrative: [
        'Self-acceptance.',
        '',
        'As I am.',
        '',
        'Growth alongside.',
        '',
        'I tell self-judging: acceptance.'
      ],
      lesson: 'Self-acceptance as I am with growth alongside.'
    },
    {
      id: 'fn43_5',
      title: 'My feelings of self-love',
      narrative: [
        'Self-love daily.',
        '',
        'Practice cultivated.',
        '',
        'Foundation laid.',
        '',
        'I tell self-hate: love practice.'
      ],
      lesson: 'Self-love daily practice cultivates foundation.'
    },
    {
      id: 'fn43_6',
      title: 'My feelings of self-care',
      narrative: [
        'Self-care priority.',
        '',
        'Sustainable giving.',
        '',
        'Not selfish.',
        '',
        'I tell self-care-guilty: priority.'
      ],
      lesson: 'Self-care priority sustainable giving not selfish.'
    },
    {
      id: 'fn43_7',
      title: 'My feelings of self-trust',
      narrative: [
        'Self-trust built.',
        '',
        'Promises kept.',
        '',
        'Inner authority.',
        '',
        'I tell self-doubting: trust building.'
      ],
      lesson: 'Self-trust built through promises kept builds inner authority.'
    },
    {
      id: 'fn43_8',
      title: 'My feelings of self-confidence',
      narrative: [
        'Confidence built.',
        '',
        'Action over feeling.',
        '',
        'Practice creates.',
        '',
        'I tell unconfident: action.'
      ],
      lesson: 'Confidence built through action over feeling; practice creates.'
    },
    {
      id: 'fn43_9',
      title: 'My feelings of self-knowledge',
      narrative: [
        'Self-knowledge deep.',
        '',
        'Years of awareness.',
        '',
        'Patterns clear.',
        '',
        'I tell self-curious: years.'
      ],
      lesson: 'Self-knowledge deep through years of awareness patterns clear.'
    },
    {
      id: 'fn43_10',
      title: 'My feelings of self-forgiveness',
      narrative: [
        'Self-forgiveness practice.',
        '',
        'Past mistakes.',
        '',
        'Begin again.',
        '',
        'I tell shame-stuck: forgiveness.'
      ],
      lesson: 'Self-forgiveness practice past mistakes begin again.'
    },
    {
      id: 'fn43_11',
      title: 'My feelings of inner critic softened',
      narrative: [
        'Inner critic softened.',
        '',
        'Self-compassion replies.',
        '',
        'Voice gentler.',
        '',
        'I tell harsh-inner: gentle.'
      ],
      lesson: 'Inner critic softened self-compassion replies voice gentler.'
    },
    {
      id: 'fn43_12',
      title: 'My feelings of inner child loved',
      narrative: [
        'Inner child loved.',
        '',
        'Old wounds tended.',
        '',
        'Self-parenting.',
        '',
        'I tell inner-child: loved.'
      ],
      lesson: 'Inner child loved old wounds tended through self-parenting.'
    },
    {
      id: 'fn43_13',
      title: 'My feelings of inner wisdom heard',
      narrative: [
        'Inner wisdom heard.',
        '',
        'Body knows.',
        '',
        'Intuition trusted.',
        '',
        'I tell intuition-curious: trust.'
      ],
      lesson: 'Inner wisdom heard body knows trust intuition.'
    },
    {
      id: 'fn43_14',
      title: 'My feelings of inner peace',
      narrative: [
        'Inner peace.',
        '',
        'Not absence.',
        '',
        'Acceptance.',
        '',
        'I tell peace-seeking: acceptance.'
      ],
      lesson: 'Inner peace not absence but acceptance.'
    },
    {
      id: 'fn43_15',
      title: 'My feelings of all inner work integrated',
      narrative: [
        'Inner work integrated.',
        '',
        'Whole self welcome.',
        '',
        'Lifelong practice.',
        '',
        'I tell beginners: lifelong.'
      ],
      lesson: 'Inner work integrated whole self welcome as lifelong practice.'
    }
  ];

  var FEELING_NARRATIVES_44 = [
    {
      id: 'fn44_1',
      title: 'My feelings of empathy practice',
      narrative: [
        'Empathy practice.',
        '',
        'Others feelings felt.',
        '',
        'Connection deepened.',
        '',
        'I tell distance-stuck: empathy.'
      ],
      lesson: 'Empathy practice others feelings felt connection deepened.'
    },
    {
      id: 'fn44_2',
      title: 'My feelings of perspective taking',
      narrative: [
        'Perspective taking.',
        '',
        'Walk in shoes.',
        '',
        'Understanding grows.',
        '',
        'I tell judgment-stuck: perspective.'
      ],
      lesson: 'Perspective taking walk in shoes understanding grows.'
    },
    {
      id: 'fn44_3',
      title: 'My feelings of listening deeply',
      narrative: [
        'Deep listening.',
        '',
        'Not waiting to speak.',
        '',
        'Presence offered.',
        '',
        'I tell reactive: listen.'
      ],
      lesson: 'Deep listening not waiting to speak offers presence.'
    },
    {
      id: 'fn44_4',
      title: 'My feelings of holding space',
      narrative: [
        'Holding space.',
        '',
        'Witness without fix.',
        '',
        'Presence enough.',
        '',
        'I tell fixers: hold space.'
      ],
      lesson: 'Holding space witness without fix presence enough.'
    },
    {
      id: 'fn44_5',
      title: 'My feelings of bearing witness',
      narrative: [
        'Bearing witness.',
        '',
        'Others suffering.',
        '',
        'Acknowledged.',
        '',
        'I tell witness-curious: bear.'
      ],
      lesson: 'Bearing witness to others suffering acknowledged.'
    },
    {
      id: 'fn44_6',
      title: 'My feelings of being present',
      narrative: [
        'Being present.',
        '',
        'Not multitasking.',
        '',
        'Full attention.',
        '',
        'I tell distracted: present.'
      ],
      lesson: 'Being present not multitasking full attention.'
    },
    {
      id: 'fn44_7',
      title: 'My feelings of giving attention',
      narrative: [
        'Attention given.',
        '',
        'Phone away.',
        '',
        'Eye contact.',
        '',
        'I tell distracted: attention.'
      ],
      lesson: 'Attention given phone away with eye contact.'
    },
    {
      id: 'fn44_8',
      title: 'My feelings of receiving attention',
      narrative: [
        'Attention received.',
        '',
        'Allow it.',
        '',
        'Often hard.',
        '',
        'I tell deflection: receive.'
      ],
      lesson: 'Attention received allow it often hard.'
    },
    {
      id: 'fn44_9',
      title: 'My feelings of giving care',
      narrative: [
        'Care given.',
        '',
        'Sustainable practice.',
        '',
        'Self-care alongside.',
        '',
        'I tell over-giving: alongside.'
      ],
      lesson: 'Care given sustainable practice with self-care alongside.'
    },
    {
      id: 'fn44_10',
      title: 'My feelings of receiving care',
      narrative: [
        'Care received.',
        '',
        'Allow yourself.',
        '',
        'Vulnerability needed.',
        '',
        'I tell care-deflecting: vulnerability.'
      ],
      lesson: 'Care received allow yourself vulnerability needed.'
    },
    {
      id: 'fn44_11',
      title: 'My feelings of mutual support',
      narrative: [
        'Mutual support.',
        '',
        'Give and receive.',
        '',
        'Both directions.',
        '',
        'I tell relationship-stuck: mutual.'
      ],
      lesson: 'Mutual support give and receive both directions.'
    },
    {
      id: 'fn44_12',
      title: 'My feelings of belonging together',
      narrative: [
        'Belonging together.',
        '',
        'Group identity.',
        '',
        'Self affirmed.',
        '',
        'I tell isolated: belonging.'
      ],
      lesson: 'Belonging together group identity self affirmed.'
    },
    {
      id: 'fn44_13',
      title: 'My feelings of solidarity',
      narrative: [
        'Solidarity felt.',
        '',
        'Standing with others.',
        '',
        'Shared struggle.',
        '',
        'I tell movement: solidarity.'
      ],
      lesson: 'Solidarity felt standing with others shared struggle.'
    },
    {
      id: 'fn44_14',
      title: 'My feelings of community love',
      narrative: [
        'Community love.',
        '',
        'Wider than family.',
        '',
        'Chosen connection.',
        '',
        'I tell isolated: community love.'
      ],
      lesson: 'Community love wider than family chosen connection.'
    },
    {
      id: 'fn44_15',
      title: 'My feelings of all connection integrated',
      narrative: [
        'All connection integrated.',
        '',
        'Self, others, world.',
        '',
        'Whole web.',
        '',
        'I tell separated: integration.'
      ],
      lesson: 'All connection integrated self, others, world as whole web.'
    }
  ];

  var FEELING_NARRATIVES_45 = [
    {
      id: 'fn45_1',
      title: 'My feelings of meaning',
      narrative: [
        'Meaning made.',
        '',
        'Service to others.',
        '',
        'Life mattered.',
        '',
        'I tell purposeless: meaning.'
      ],
      lesson: 'Meaning made through service to others ensures life mattered.'
    },
    {
      id: 'fn45_2',
      title: 'My feelings of purpose',
      narrative: [
        'Purpose discovered.',
        '',
        'Years of seeking.',
        '',
        'Direction clear.',
        '',
        'I tell purpose-seeking: years.'
      ],
      lesson: 'Purpose discovered through years of seeking; direction clear.'
    },
    {
      id: 'fn45_3',
      title: 'My feelings of calling',
      narrative: [
        'Calling heard.',
        '',
        'Inner voice.',
        '',
        'Direction confirmed.',
        '',
        'I tell calling-curious: listen.'
      ],
      lesson: 'Calling heard through inner voice direction confirmed.'
    },
    {
      id: 'fn45_4',
      title: 'My feelings of values lived',
      narrative: [
        'Values lived daily.',
        '',
        'Alignment felt.',
        '',
        'Authentic life.',
        '',
        'I tell value-confused: live them.'
      ],
      lesson: 'Values lived daily alignment felt authentic life.'
    },
    {
      id: 'fn45_5',
      title: 'My feelings of legacy',
      narrative: [
        'Legacy considered.',
        '',
        'What I leave.',
        '',
        'Service shapes.',
        '',
        'I tell legacy-curious: service.'
      ],
      lesson: 'Legacy considered what I leave service shapes.'
    },
    {
      id: 'fn45_6',
      title: 'My feelings of integrity',
      narrative: [
        'Integrity practice.',
        '',
        'Values aligned action.',
        '',
        'Wholeness felt.',
        '',
        'I tell fragmented: integrity.'
      ],
      lesson: 'Integrity practice values aligned action wholeness felt.'
    },
    {
      id: 'fn45_7',
      title: 'My feelings of authenticity',
      narrative: [
        'Authenticity practice.',
        '',
        'True self expressed.',
        '',
        'Mask removed.',
        '',
        'I tell masking: authenticity.'
      ],
      lesson: 'Authenticity practice true self expressed mask removed.'
    },
    {
      id: 'fn45_8',
      title: 'My feelings of truth',
      narrative: [
        'Truth told.',
        '',
        'Even when hard.',
        '',
        'Self respected.',
        '',
        'I tell pretender: truth.'
      ],
      lesson: 'Truth told even when hard self respected.'
    },
    {
      id: 'fn45_9',
      title: 'My feelings of honesty',
      narrative: [
        'Honesty practice.',
        '',
        'Self and others.',
        '',
        'Foundation built.',
        '',
        'I tell dishonest: practice.'
      ],
      lesson: 'Honesty practice self and others builds foundation.'
    },
    {
      id: 'fn45_10',
      title: 'My feelings of presence to self',
      narrative: [
        'Presence to self.',
        '',
        'Inner attention.',
        '',
        'Self-knowing.',
        '',
        'I tell external-focused: inward.'
      ],
      lesson: 'Presence to self inner attention self-knowing.'
    },
    {
      id: 'fn45_11',
      title: 'My feelings of self in relationship',
      narrative: [
        'Self in relationship.',
        '',
        'Differentiation work.',
        '',
        'Both self and we.',
        '',
        'I tell merged: differentiation.'
      ],
      lesson: 'Self in relationship differentiation work both self and we.'
    },
    {
      id: 'fn45_12',
      title: 'My feelings of self in family',
      narrative: [
        'Self in family.',
        '',
        'Differentiation work.',
        '',
        'Boundaries set.',
        '',
        'I tell enmeshed: differentiation.'
      ],
      lesson: 'Self in family differentiation work boundaries set.'
    },
    {
      id: 'fn45_13',
      title: 'My feelings of self in community',
      narrative: [
        'Self in community.',
        '',
        'Belonging plus authenticity.',
        '',
        'Both possible.',
        '',
        'I tell community: both.'
      ],
      lesson: 'Self in community belonging plus authenticity both possible.'
    },
    {
      id: 'fn45_14',
      title: 'My feelings of self in world',
      narrative: [
        'Self in world.',
        '',
        'Citizenship considered.',
        '',
        'Action emerges.',
        '',
        'I tell civic-curious: action.'
      ],
      lesson: 'Self in world citizenship considered action emerges.'
    },
    {
      id: 'fn45_15',
      title: 'My feelings of self in cosmos',
      narrative: [
        'Self in cosmos.',
        '',
        'Tiny and connected.',
        '',
        'Perspective expanded.',
        '',
        'I tell self-bound: cosmos.'
      ],
      lesson: 'Self in cosmos tiny and connected perspective expanded.'
    }
  ];

  var FEELING_NARRATIVES_36 = [
    {
      id: 'fn36_1',
      title: 'My feelings as adopted person',
      narrative: [
        'Adoption feelings.',
        '',
        'Primal wound.',
        '',
        'Adoption-aware therapy.',
        '',
        'I tell adopted: specialty.'
      ],
      lesson: 'Adoption feelings primal wound need adoption-aware specialty therapy.'
    },
    {
      id: 'fn36_2',
      title: 'My feelings as foster youth',
      narrative: [
        'Foster youth feelings.',
        '',
        'Multiple losses.',
        '',
        'Specialty support.',
        '',
        'I tell foster: specialty.'
      ],
      lesson: 'Foster youth feelings of multiple losses need specialty support.'
    },
    {
      id: 'fn36_3',
      title: 'My feelings as immigrant',
      narrative: [
        'Immigrant feelings.',
        '',
        'Two worlds.',
        '',
        'Culturally competent therapy.',
        '',
        'I tell immigrants: culturally competent.'
      ],
      lesson: 'Immigrant feelings two worlds need culturally competent therapy.'
    },
    {
      id: 'fn36_4',
      title: 'My feelings as refugee',
      narrative: [
        'Refugee feelings.',
        '',
        'Trauma plus loss.',
        '',
        'Specialty support.',
        '',
        'I tell refugees: specialty.'
      ],
      lesson: 'Refugee feelings trauma plus loss need specialty support.'
    },
    {
      id: 'fn36_5',
      title: 'My feelings as veteran',
      narrative: [
        'Veteran feelings.',
        '',
        'Combat plus reintegration.',
        '',
        'VA support.',
        '',
        'I tell veterans: VA.'
      ],
      lesson: 'Veteran feelings combat plus reintegration use VA support.'
    },
    {
      id: 'fn36_6',
      title: 'My feelings as first responder',
      narrative: [
        'First responder feelings.',
        '',
        'Cumulative trauma.',
        '',
        'Specialty therapy.',
        '',
        'I tell first responders: specialty.'
      ],
      lesson: 'First responder feelings cumulative trauma need specialty therapy.'
    },
    {
      id: 'fn36_7',
      title: 'My feelings as nurse',
      narrative: [
        'Nurse feelings.',
        '',
        'Compassion fatigue.',
        '',
        'Self-care critical.',
        '',
        'I tell nurses: self-care.'
      ],
      lesson: 'Nurse feelings compassion fatigue need critical self-care.'
    },
    {
      id: 'fn36_8',
      title: 'My feelings as teacher',
      narrative: [
        'Teacher feelings.',
        '',
        'Loving students.',
        '',
        'System frustration.',
        '',
        'I tell teachers: both.'
      ],
      lesson: 'Teacher feelings loving students plus system frustration both real.'
    },
    {
      id: 'fn36_9',
      title: 'My feelings as social worker',
      narrative: [
        'Social worker feelings.',
        '',
        'Secondary trauma.',
        '',
        'Supervision essential.',
        '',
        'I tell social workers: supervision.'
      ],
      lesson: 'Social worker feelings secondary trauma need essential supervision.'
    },
    {
      id: 'fn36_10',
      title: 'My feelings as therapist',
      narrative: [
        'Therapist feelings.',
        '',
        'Container holding.',
        '',
        'Self-therapy essential.',
        '',
        'I tell therapists: self-therapy.'
      ],
      lesson: 'Therapist feelings container holding need essential self-therapy.'
    },
    {
      id: 'fn36_11',
      title: 'My feelings as doctor',
      narrative: [
        'Doctor feelings.',
        '',
        'Patient suffering.',
        '',
        'Professional distance.',
        '',
        'I tell doctors: balance.'
      ],
      lesson: 'Doctor feelings patient suffering need professional distance balance.'
    },
    {
      id: 'fn36_12',
      title: 'My feelings as caregiver paid',
      narrative: [
        'Paid caregiver feelings.',
        '',
        'Genuine care plus job.',
        '',
        'Boundaries essential.',
        '',
        'I tell paid-caregivers: boundaries.'
      ],
      lesson: 'Paid caregiver feelings genuine care plus job need boundary essential.'
    },
    {
      id: 'fn36_13',
      title: 'My feelings as activist',
      narrative: [
        'Activist feelings.',
        '',
        'Hope and despair.',
        '',
        'Sustainability key.',
        '',
        'I tell activists: sustainable.'
      ],
      lesson: 'Activist feelings hope and despair require sustainability key.'
    },
    {
      id: 'fn36_14',
      title: 'My feelings as advocate',
      narrative: [
        'Advocate feelings.',
        '',
        'Anger fuels.',
        '',
        'Care sustains.',
        '',
        'I tell advocates: fuel and sustain.'
      ],
      lesson: 'Advocate feelings anger fuels and care sustains.'
    },
    {
      id: 'fn36_15',
      title: 'My feelings as helper',
      narrative: [
        'Helper feelings.',
        '',
        'Service plus self-care.',
        '',
        'Both essential.',
        '',
        'I tell helpers: both essential.'
      ],
      lesson: 'Helper feelings service plus self-care both essential.'
    }
  ];

  var FEELING_NARRATIVES_37 = [
    {
      id: 'fn37_1',
      title: 'My feelings of grief',
      narrative: [
        'Grief feelings.',
        '',
        'Wave patterns.',
        '',
        'Years of work.',
        '',
        'I tell grieving: waves.'
      ],
      lesson: 'Grief feelings come in wave patterns through years of work.'
    },
    {
      id: 'fn37_2',
      title: 'My feelings after loss',
      narrative: [
        'Loss feelings.',
        '',
        'Sadness, anger, relief.',
        '',
        'All valid.',
        '',
        'I tell grieving: all valid.'
      ],
      lesson: 'Loss feelings of sadness, anger, relief all valid.'
    },
    {
      id: 'fn37_3',
      title: 'My feelings of grief denial',
      narrative: [
        'Denial early stage.',
        '',
        'Cannot accept.',
        '',
        'Protection.',
        '',
        'I tell denial-stuck: protection.'
      ],
      lesson: 'Denial early grief stage cannot accept as protection.'
    },
    {
      id: 'fn37_4',
      title: 'My feelings of grief anger',
      narrative: [
        'Anger grief stage.',
        '',
        'At deceased.',
        '',
        'At fate.',
        '',
        'I tell grieving-angry: valid.'
      ],
      lesson: 'Anger grief stage at deceased or fate valid.'
    },
    {
      id: 'fn37_5',
      title: 'My feelings of grief bargaining',
      narrative: [
        'Bargaining grief.',
        '',
        'What if.',
        '',
        'If only.',
        '',
        'I tell bargaining: trying to undo.'
      ],
      lesson: 'Bargaining grief what if and if only as trying to undo.'
    },
    {
      id: 'fn37_6',
      title: 'My feelings of grief depression',
      narrative: [
        'Depression grief stage.',
        '',
        'Weight of loss.',
        '',
        'Support sought.',
        '',
        'I tell grieving-depressed: support.'
      ],
      lesson: 'Depression grief stage weight of loss seek support.'
    },
    {
      id: 'fn37_7',
      title: 'My feelings of grief acceptance',
      narrative: [
        'Acceptance integration.',
        '',
        'Loss part of life.',
        '',
        'Continue forward.',
        '',
        'I tell grieving: integration.'
      ],
      lesson: 'Grief acceptance integration loss part of life continue forward.'
    },
    {
      id: 'fn37_8',
      title: 'My feelings of grief non-linear',
      narrative: [
        'Stages not linear.',
        '',
        'Waves return.',
        '',
        'No timeline.',
        '',
        'I tell stages-confused: non-linear.'
      ],
      lesson: 'Grief stages not linear; waves return without timeline.'
    },
    {
      id: 'fn37_9',
      title: 'My feelings of complicated grief',
      narrative: [
        'Complicated grief.',
        '',
        'Specialty therapy.',
        '',
        'Years of work.',
        '',
        'I tell complicated: specialty.'
      ],
      lesson: 'Complicated grief need specialty therapy with years of work.'
    },
    {
      id: 'fn37_10',
      title: 'My feelings of anticipatory grief',
      narrative: [
        'Anticipatory grief.',
        '',
        'Before loss.',
        '',
        'Real grief.',
        '',
        'I tell anticipatory: real.'
      ],
      lesson: 'Anticipatory grief before loss is real grief.'
    },
    {
      id: 'fn37_11',
      title: 'My feelings of disenfranchised grief',
      narrative: [
        'Disenfranchised grief.',
        '',
        'Pet, ex, public figure.',
        '',
        'Real grief.',
        '',
        'I tell disenfranchised: real.'
      ],
      lesson: 'Disenfranchised grief for pet, ex, public figure is real grief.'
    },
    {
      id: 'fn37_12',
      title: 'My feelings of ambiguous loss',
      narrative: [
        'Ambiguous loss.',
        '',
        'Alive but absent.',
        '',
        'Dementia, missing.',
        '',
        'I tell ambiguous: specialty.'
      ],
      lesson: 'Ambiguous loss alive but absent dementia or missing need specialty.'
    },
    {
      id: 'fn37_13',
      title: 'My feelings during anniversary',
      narrative: [
        'Anniversary grief.',
        '',
        'Body remembers.',
        '',
        'Plan accordingly.',
        '',
        'I tell anniversary-affected: plan.'
      ],
      lesson: 'Anniversary grief body remembers planned accordingly.'
    },
    {
      id: 'fn37_14',
      title: 'My feelings during holidays after loss',
      narrative: [
        'Holiday grief.',
        '',
        'Empty chairs.',
        '',
        'New traditions slowly.',
        '',
        'I tell holiday-grief: new traditions.'
      ],
      lesson: 'Holiday grief empty chairs build new traditions slowly.'
    },
    {
      id: 'fn37_15',
      title: 'My feelings integrated through grief',
      narrative: [
        'Grief integrated.',
        '',
        'Years of work.',
        '',
        'Part of who I am.',
        '',
        'I tell grieving: integration possible.'
      ],
      lesson: 'Grief integrated years of work becomes part of who I am.'
    }
  ];

  var FEELING_NARRATIVES_38 = [
    {
      id: 'fn38_1',
      title: 'My feelings of trauma',
      narrative: [
        'Trauma feelings.',
        '',
        'Body holds.',
        '',
        'Specialty therapy.',
        '',
        'I tell trauma: specialty.'
      ],
      lesson: 'Trauma feelings body holds need specialty therapy.'
    },
    {
      id: 'fn38_2',
      title: 'My feelings of PTSD',
      narrative: [
        'PTSD feelings.',
        '',
        'Hypervigilance.',
        '',
        'Flashbacks.',
        '',
        'Specialty support.',
        '',
        'I tell PTSD: specialty.'
      ],
      lesson: 'PTSD feelings hypervigilance and flashbacks need specialty support.'
    },
    {
      id: 'fn38_3',
      title: 'My feelings of complex trauma',
      narrative: [
        'Complex trauma feelings.',
        '',
        'Childhood roots.',
        '',
        'Long-term therapy.',
        '',
        'I tell complex: long-term.'
      ],
      lesson: 'Complex trauma feelings childhood roots need long-term therapy.'
    },
    {
      id: 'fn38_4',
      title: 'My feelings of dissociation',
      narrative: [
        'Dissociation feelings.',
        '',
        'Body protects.',
        '',
        'Grounding essential.',
        '',
        'I tell dissociating: grounding.'
      ],
      lesson: 'Dissociation feelings body protects need grounding essential.'
    },
    {
      id: 'fn38_5',
      title: 'My feelings of panic',
      narrative: [
        'Panic feelings.',
        '',
        'Body overflow.',
        '',
        'Grounding tools.',
        '',
        'I tell panicking: grounding.'
      ],
      lesson: 'Panic feelings body overflow need grounding tools.'
    },
    {
      id: 'fn38_6',
      title: 'My feelings of depression',
      narrative: [
        'Depression feelings.',
        '',
        'Heavy fog.',
        '',
        'Treatment available.',
        '',
        'I tell depressed: treatment.'
      ],
      lesson: 'Depression feelings heavy fog have treatment available.'
    },
    {
      id: 'fn38_7',
      title: 'My feelings of anxiety',
      narrative: [
        'Anxiety feelings.',
        '',
        'Body amped.',
        '',
        'CBT works.',
        '',
        'I tell anxious: CBT.'
      ],
      lesson: 'Anxiety feelings body amped responds to CBT.'
    },
    {
      id: 'fn38_8',
      title: 'My feelings of OCD',
      narrative: [
        'OCD feelings.',
        '',
        'Intrusive thoughts.',
        '',
        'ERP works.',
        '',
        'I tell OCD: ERP.'
      ],
      lesson: 'OCD feelings intrusive thoughts respond to ERP.'
    },
    {
      id: 'fn38_9',
      title: 'My feelings of phobia',
      narrative: [
        'Phobia feelings.',
        '',
        'Specific intense.',
        '',
        'Graduated exposure.',
        '',
        'I tell phobic: exposure.'
      ],
      lesson: 'Phobia feelings specific intense need graduated exposure.'
    },
    {
      id: 'fn38_10',
      title: 'My feelings of bipolar',
      narrative: [
        'Bipolar feelings.',
        '',
        'Cycle extremes.',
        '',
        'Medication stabilizes.',
        '',
        'I tell bipolar: medication.'
      ],
      lesson: 'Bipolar feelings cycle extremes medication stabilizes.'
    },
    {
      id: 'fn38_11',
      title: 'My feelings of ADHD',
      narrative: [
        'ADHD feelings.',
        '',
        'Big and fast.',
        '',
        'Treatment helps.',
        '',
        'I tell ADHD: treatment.'
      ],
      lesson: 'ADHD feelings big and fast treatment helps.'
    },
    {
      id: 'fn38_12',
      title: 'My feelings of autism',
      narrative: [
        'Autism feelings.',
        '',
        'Sensory intense.',
        '',
        'Accommodations help.',
        '',
        'I tell autistic: accommodations.'
      ],
      lesson: 'Autism feelings sensory intense need accommodations.'
    },
    {
      id: 'fn38_13',
      title: 'My feelings of personality disorder',
      narrative: [
        'Personality disorder feelings.',
        '',
        'Specialty treatment.',
        '',
        'DBT often helpful.',
        '',
        'I tell PD: specialty.'
      ],
      lesson: 'Personality disorder feelings need specialty treatment with DBT often helpful.'
    },
    {
      id: 'fn38_14',
      title: 'My feelings of eating disorder',
      narrative: [
        'ED feelings.',
        '',
        'Specialty team.',
        '',
        'Nutrition plus therapy.',
        '',
        'I tell ED: specialty team.'
      ],
      lesson: 'Eating disorder feelings need specialty team nutrition plus therapy.'
    },
    {
      id: 'fn38_15',
      title: 'My feelings of mental illness validated',
      narrative: [
        'Mental illness valid.',
        '',
        'Treatment works.',
        '',
        'Recovery possible.',
        '',
        'I tell stigma-stuck: valid.'
      ],
      lesson: 'Mental illness valid; treatment works; recovery possible.'
    }
  ];

  var FEELING_NARRATIVES_39 = [
    {
      id: 'fn39_1',
      title: 'My feelings during life transitions',
      narrative: [
        'Transition feelings.',
        '',
        'Loss plus possibility.',
        '',
        'Both honored.',
        '',
        'I tell transitioning: both.'
      ],
      lesson: 'Transition feelings loss plus possibility both honored.'
    },
    {
      id: 'fn39_2',
      title: 'My feelings during graduation',
      narrative: [
        'Graduation feelings.',
        '',
        'Pride plus uncertainty.',
        '',
        'New chapter.',
        '',
        'I tell graduating: both.'
      ],
      lesson: 'Graduation feelings pride plus uncertainty as new chapter.'
    },
    {
      id: 'fn39_3',
      title: 'My feelings during wedding',
      narrative: [
        'Wedding feelings.',
        '',
        'Joy plus stress.',
        '',
        'Both real.',
        '',
        'I tell wedding: both.'
      ],
      lesson: 'Wedding feelings joy plus stress both real.'
    },
    {
      id: 'fn39_4',
      title: 'My feelings during new job',
      narrative: [
        'New job feelings.',
        '',
        'Excitement plus anxiety.',
        '',
        'Both common.',
        '',
        'I tell new-job: both.'
      ],
      lesson: 'New job feelings excitement plus anxiety both common.'
    },
    {
      id: 'fn39_5',
      title: 'My feelings during job change',
      narrative: [
        'Job change feelings.',
        '',
        'Hope plus fear.',
        '',
        'Identity shift.',
        '',
        'I tell career-shifting: identity.'
      ],
      lesson: 'Job change feelings hope plus fear involve identity shift.'
    },
    {
      id: 'fn39_6',
      title: 'My feelings during move',
      narrative: [
        'Move feelings.',
        '',
        'Excitement plus grief.',
        '',
        'Both honored.',
        '',
        'I tell moving: both.'
      ],
      lesson: 'Move feelings excitement plus grief both honored.'
    },
    {
      id: 'fn39_7',
      title: 'My feelings during retirement',
      narrative: [
        'Retirement feelings.',
        '',
        'Freedom plus loss.',
        '',
        'Identity transition.',
        '',
        'I tell retiring: identity.'
      ],
      lesson: 'Retirement feelings freedom plus loss as identity transition.'
    },
    {
      id: 'fn39_8',
      title: 'My feelings during illness diagnosis',
      narrative: [
        'Diagnosis feelings.',
        '',
        'Fear plus relief.',
        '',
        'Naming what is.',
        '',
        'I tell diagnosed: both.'
      ],
      lesson: 'Diagnosis feelings fear plus relief naming what is.'
    },
    {
      id: 'fn39_9',
      title: 'My feelings during recovery',
      narrative: [
        'Recovery feelings.',
        '',
        'Hope plus setbacks.',
        '',
        'Patience cultivated.',
        '',
        'I tell recovering: patience.'
      ],
      lesson: 'Recovery feelings hope plus setbacks cultivate patience.'
    },
    {
      id: 'fn39_10',
      title: 'My feelings during loss',
      narrative: [
        'Loss feelings.',
        '',
        'Years to process.',
        '',
        'Integration possible.',
        '',
        'I tell grieving: integration.'
      ],
      lesson: 'Loss feelings years to process with integration possible.'
    },
    {
      id: 'fn39_11',
      title: 'My feelings during marriage',
      narrative: [
        'Marriage feelings.',
        '',
        'Daily shifts.',
        '',
        'Love and labor.',
        '',
        'I tell married: shifts.'
      ],
      lesson: 'Marriage feelings daily shifts love and labor.'
    },
    {
      id: 'fn39_12',
      title: 'My feelings during divorce',
      narrative: [
        'Divorce feelings.',
        '',
        'Grief plus relief.',
        '',
        'Identity rebuilding.',
        '',
        'I tell divorcing: identity.'
      ],
      lesson: 'Divorce feelings grief plus relief rebuild identity.'
    },
    {
      id: 'fn39_13',
      title: 'My feelings during parenting',
      narrative: [
        'Parenting feelings.',
        '',
        'Love plus exhaustion.',
        '',
        'Both real.',
        '',
        'I tell parents: both.'
      ],
      lesson: 'Parenting feelings love plus exhaustion both real.'
    },
    {
      id: 'fn39_14',
      title: 'My feelings during aging',
      narrative: [
        'Aging feelings.',
        '',
        'Loss plus wisdom.',
        '',
        'Both honored.',
        '',
        'I tell aging: both.'
      ],
      lesson: 'Aging feelings loss plus wisdom both honored.'
    },
    {
      id: 'fn39_15',
      title: 'My feelings during dying',
      narrative: [
        'Dying feelings.',
        '',
        'Fear plus peace.',
        '',
        'Hospice support.',
        '',
        'I tell dying: support.'
      ],
      lesson: 'Dying feelings fear plus peace use hospice support.'
    }
  ];

  var FEELING_NARRATIVES_40 = [
    {
      id: 'fn40_1',
      title: 'My feelings of awe',
      narrative: [
        'Awe daily cultivated.',
        '',
        'Sunsets, stars, kindness.',
        '',
        'Wonder maintained.',
        '',
        'I tell awe-blind: cultivate.'
      ],
      lesson: 'Daily awe cultivated through sunsets, stars, kindness maintains wonder.'
    },
    {
      id: 'fn40_2',
      title: 'My feelings of wonder',
      narrative: [
        'Wonder feelings.',
        '',
        'Childlike curiosity.',
        '',
        'Mind opens.',
        '',
        'I tell stagnant: wonder.'
      ],
      lesson: 'Wonder feelings childlike curiosity open mind.'
    },
    {
      id: 'fn40_3',
      title: 'My feelings of curiosity',
      narrative: [
        'Curiosity sustained.',
        '',
        'Always asking.',
        '',
        'Life rich.',
        '',
        'I tell stagnant: curiosity.'
      ],
      lesson: 'Curiosity sustained always asking keeps life rich.'
    },
    {
      id: 'fn40_4',
      title: 'My feelings of inspiration',
      narrative: [
        'Inspiration claimed.',
        '',
        'Heroes acknowledged.',
        '',
        'Direction confirmed.',
        '',
        'I tell stuck: inspiration.'
      ],
      lesson: 'Inspiration claimed through heroes acknowledged confirms direction.'
    },
    {
      id: 'fn40_5',
      title: 'My feelings of motivation',
      narrative: [
        'Motivation cycles.',
        '',
        'High and low days.',
        '',
        'Show up anyway.',
        '',
        'I tell motivation-stuck: show up.'
      ],
      lesson: 'Motivation cycles high and low days; show up anyway.'
    },
    {
      id: 'fn40_6',
      title: 'My feelings of determination',
      narrative: [
        'Determination cultivated.',
        '',
        'When motivation fails.',
        '',
        'Discipline sustains.',
        '',
        'I tell discipline-curious: determination.'
      ],
      lesson: 'Determination cultivated when motivation fails through discipline sustains.'
    },
    {
      id: 'fn40_7',
      title: 'My feelings of courage',
      narrative: [
        'Courage cultivated.',
        '',
        'Not absence of fear.',
        '',
        'Act despite.',
        '',
        'I tell brave: act despite.'
      ],
      lesson: 'Courage cultivated not absence of fear but acting despite.'
    },
    {
      id: 'fn40_8',
      title: 'My feelings of strength',
      narrative: [
        'Strength cultivated.',
        '',
        'Daily practice.',
        '',
        'Resilience built.',
        '',
        'I tell weak-feeling: strength.'
      ],
      lesson: 'Strength cultivated daily practice builds resilience.'
    },
    {
      id: 'fn40_9',
      title: 'My feelings of resilience',
      narrative: [
        'Resilience built.',
        '',
        'Bounce back faster.',
        '',
        'Practice pays.',
        '',
        'I tell resilience-curious: practice.'
      ],
      lesson: 'Resilience built bounces back faster as practice pays.'
    },
    {
      id: 'fn40_10',
      title: 'My feelings of grit',
      narrative: [
        'Grit cultivated.',
        '',
        'Long-term goal.',
        '',
        'Persistence sustained.',
        '',
        'I tell quitting: grit.'
      ],
      lesson: 'Grit cultivated long-term goal sustains persistence.'
    },
    {
      id: 'fn40_11',
      title: 'My feelings of patience',
      narrative: [
        'Patience cultivated.',
        '',
        'Slow growth.',
        '',
        'Trust process.',
        '',
        'I tell impatient: patience.'
      ],
      lesson: 'Patience cultivated slow growth trust process.'
    },
    {
      id: 'fn40_12',
      title: 'My feelings of humility',
      narrative: [
        'Humility maintained.',
        '',
        'Beginners mind.',
        '',
        'Always learning.',
        '',
        'I tell experts: humility.'
      ],
      lesson: 'Humility maintained beginners mind always learning.'
    },
    {
      id: 'fn40_13',
      title: 'My feelings of generosity',
      narrative: [
        'Generosity cultivated.',
        '',
        'Time, money, attention.',
        '',
        'Giving freely.',
        '',
        'I tell scarcity: generosity.'
      ],
      lesson: 'Generosity cultivated time, money, attention giving freely.'
    },
    {
      id: 'fn40_14',
      title: 'My feelings of kindness',
      narrative: [
        'Kindness daily.',
        '',
        'Small gestures.',
        '',
        'Ripple effects.',
        '',
        'I tell harsh: kindness.'
      ],
      lesson: 'Daily kindness small gestures create ripple effects.'
    },
    {
      id: 'fn40_15',
      title: 'My feelings of all virtues integrated',
      narrative: [
        'All virtues integrated.',
        '',
        'Daily practice.',
        '',
        'Lifelong cultivation.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'All virtues integrated daily practice as lifelong cultivation.'
    }
  ];

  var FEELING_NARRATIVES_31 = [
    {
      id: 'fn31_1',
      title: 'My feelings as parent',
      narrative: [
        'Parent feelings.',
        '',
        'Love and frustration.',
        '',
        'Both valid.',
        '',
        'I tell parents: both.'
      ],
      lesson: 'Parent feelings of love and frustration both valid.'
    },
    {
      id: 'fn31_2',
      title: 'My feelings as new parent',
      narrative: [
        'New parent feelings.',
        '',
        'Overwhelming love.',
        '',
        'Plus exhaustion.',
        '',
        'I tell new-parents: both.'
      ],
      lesson: 'New parent feelings overwhelming love plus exhaustion.'
    },
    {
      id: 'fn31_3',
      title: 'My feelings as toddler parent',
      narrative: [
        'Toddler parent feelings.',
        '',
        'Patience tested.',
        '',
        'Joy plus frustration.',
        '',
        'I tell toddler-parents: both.'
      ],
      lesson: 'Toddler parent feelings test patience with joy plus frustration.'
    },
    {
      id: 'fn31_4',
      title: 'My feelings as school-age parent',
      narrative: [
        'School-age parent feelings.',
        '',
        'Independence emerging.',
        '',
        'Letting go practice.',
        '',
        'I tell school-parents: letting go.'
      ],
      lesson: 'School-age parent feelings as independence emerges practice letting go.'
    },
    {
      id: 'fn31_5',
      title: 'My feelings as teen parent',
      narrative: [
        'Teen parent feelings.',
        '',
        'Conflict and connection.',
        '',
        'Boundaries set.',
        '',
        'I tell teen-parents: boundaries.'
      ],
      lesson: 'Teen parent feelings of conflict and connection set boundaries.'
    },
    {
      id: 'fn31_6',
      title: 'My feelings as empty nest parent',
      narrative: [
        'Empty nest parent.',
        '',
        'Pride plus grief.',
        '',
        'Identity shift.',
        '',
        'I tell empty-nest: identity shift.'
      ],
      lesson: 'Empty nest parent feelings pride plus grief in identity shift.'
    },
    {
      id: 'fn31_7',
      title: 'My feelings as grandparent',
      narrative: [
        'Grandparent feelings.',
        '',
        'Love without rearing.',
        '',
        'Joy plus letting go.',
        '',
        'I tell grandparents: love and let.'
      ],
      lesson: 'Grandparent feelings love without rearing joy plus letting go.'
    },
    {
      id: 'fn31_8',
      title: 'My feelings as caregiver',
      narrative: [
        'Caregiver feelings.',
        '',
        'Love and exhaustion.',
        '',
        'Both real.',
        '',
        'I tell caregivers: both real.'
      ],
      lesson: 'Caregiver feelings love and exhaustion both real.'
    },
    {
      id: 'fn31_9',
      title: 'My feelings as patient',
      narrative: [
        'Patient feelings.',
        '',
        'Vulnerability deep.',
        '',
        'Support essential.',
        '',
        'I tell patients: support.'
      ],
      lesson: 'Patient feelings deep vulnerability essential need support.'
    },
    {
      id: 'fn31_10',
      title: 'My feelings as healer',
      narrative: [
        'Healer feelings.',
        '',
        'Hold space.',
        '',
        'Self-care critical.',
        '',
        'I tell healers: self-care.'
      ],
      lesson: 'Healer feelings hold space; self-care critical.'
    },
    {
      id: 'fn31_11',
      title: 'My feelings as teacher',
      narrative: [
        'Teacher feelings.',
        '',
        'Love students.',
        '',
        'Boundaries needed.',
        '',
        'I tell teachers: boundaries.'
      ],
      lesson: 'Teacher feelings love students with boundaries needed.'
    },
    {
      id: 'fn31_12',
      title: 'My feelings as therapist',
      narrative: [
        'Therapist feelings.',
        '',
        'Hold client pain.',
        '',
        'Supervision essential.',
        '',
        'I tell therapists: supervision.'
      ],
      lesson: 'Therapist feelings hold client pain; supervision essential.'
    },
    {
      id: 'fn31_13',
      title: 'My feelings as advocate',
      narrative: [
        'Advocate feelings.',
        '',
        'Anger as fuel.',
        '',
        'Self-care to sustain.',
        '',
        'I tell advocates: sustain.'
      ],
      lesson: 'Advocate feelings anger as fuel with self-care to sustain.'
    },
    {
      id: 'fn31_14',
      title: 'My feelings as activist',
      narrative: [
        'Activist feelings.',
        '',
        'Hope and despair.',
        '',
        'Cycle accepted.',
        '',
        'I tell activists: cycle.'
      ],
      lesson: 'Activist feelings hope and despair cycle accepted.'
    },
    {
      id: 'fn31_15',
      title: 'My feelings as artist',
      narrative: [
        'Artist feelings.',
        '',
        'Deep wells.',
        '',
        'Translate beauty.',
        '',
        'I tell artists: translate.'
      ],
      lesson: 'Artist feelings deep wells translate to beauty.'
    }
  ];

  var FEELING_NARRATIVES_32 = [
    {
      id: 'fn32_1',
      title: 'My feelings before sleep',
      narrative: [
        'Pre-sleep feelings.',
        '',
        'Sometimes ruminative.',
        '',
        'Worry park practice.',
        '',
        'I tell sleep-anxious: park.'
      ],
      lesson: 'Pre-sleep ruminative feelings managed by worry park practice.'
    },
    {
      id: 'fn32_2',
      title: 'My feelings during sleep',
      narrative: [
        'Dream feelings.',
        '',
        'Subconscious processing.',
        '',
        'Body works at night.',
        '',
        'I tell dream-curious: processing.'
      ],
      lesson: 'Dream feelings reflect subconscious processing as body works at night.'
    },
    {
      id: 'fn32_3',
      title: 'My feelings on waking',
      narrative: [
        'Waking feelings.',
        '',
        'Note them.',
        '',
        'Day informed.',
        '',
        'I tell morning-curious: note.'
      ],
      lesson: 'Waking feelings noted inform the day ahead.'
    },
    {
      id: 'fn32_4',
      title: 'My feelings mid-morning',
      narrative: [
        'Mid-morning feelings.',
        '',
        'Day rhythm.',
        '',
        'Patterns track.',
        '',
        'I tell tracking: mid-morning.'
      ],
      lesson: 'Mid-morning feelings as day rhythm track patterns.'
    },
    {
      id: 'fn32_5',
      title: 'My feelings around lunch',
      narrative: [
        'Lunch feelings.',
        '',
        'Hunger plus food joy.',
        '',
        'Restoration time.',
        '',
        'I tell lunch-curious: restoration.'
      ],
      lesson: 'Lunch feelings hunger plus food joy as restoration time.'
    },
    {
      id: 'fn32_6',
      title: 'My feelings mid-afternoon',
      narrative: [
        'Mid-afternoon feelings.',
        '',
        'Slump or energy.',
        '',
        'Body tracking.',
        '',
        'I tell afternoon: body tracking.'
      ],
      lesson: 'Mid-afternoon feelings slump or energy through body tracking.'
    },
    {
      id: 'fn32_7',
      title: 'My feelings late afternoon',
      narrative: [
        'Late afternoon.',
        '',
        'Cortisol drop.',
        '',
        'Mood shifts possible.',
        '',
        'I tell mood-shifting: late afternoon.'
      ],
      lesson: 'Late afternoon cortisol drop allows mood shifts.'
    },
    {
      id: 'fn32_8',
      title: 'My feelings dinnertime',
      narrative: [
        'Dinnertime feelings.',
        '',
        'Family gathering.',
        '',
        'Day winding.',
        '',
        'I tell dinner-curious: gathering.'
      ],
      lesson: 'Dinnertime feelings as family gathering day winding.'
    },
    {
      id: 'fn32_9',
      title: 'My feelings evening',
      narrative: [
        'Evening feelings.',
        '',
        'Reflection time.',
        '',
        'Day accumulated.',
        '',
        'I tell evening-curious: reflect.'
      ],
      lesson: 'Evening feelings reflection time as day accumulated.'
    },
    {
      id: 'fn32_10',
      title: 'My feelings at night',
      narrative: [
        'Night feelings.',
        '',
        'Quiet processing.',
        '',
        'Mind unwinding.',
        '',
        'I tell night-curious: processing.'
      ],
      lesson: 'Night feelings quiet processing as mind unwinding.'
    },
    {
      id: 'fn32_11',
      title: 'My feelings 3am wake',
      narrative: [
        '3am wake feelings.',
        '',
        'Anxiety peak.',
        '',
        'Worry park practice.',
        '',
        'I tell 3am-wake: worry park.'
      ],
      lesson: '3am wake anxiety peak managed by worry park practice.'
    },
    {
      id: 'fn32_12',
      title: 'My feelings dawn',
      narrative: [
        'Dawn feelings.',
        '',
        'Early stillness.',
        '',
        'Day beginning.',
        '',
        'I tell early-rising: dawn.'
      ],
      lesson: 'Dawn feelings of early stillness as day beginning.'
    },
    {
      id: 'fn32_13',
      title: 'My feelings weekdays',
      narrative: [
        'Weekday feelings.',
        '',
        'Work rhythm.',
        '',
        'Energy depletion.',
        '',
        'I tell weekdays: rhythm.'
      ],
      lesson: 'Weekday feelings as work rhythm with energy depletion.'
    },
    {
      id: 'fn32_14',
      title: 'My feelings weekends',
      narrative: [
        'Weekend feelings.',
        '',
        'Restoration possible.',
        '',
        'Freedom felt.',
        '',
        'I tell weekend: restoration.'
      ],
      lesson: 'Weekend feelings restoration possible with freedom felt.'
    },
    {
      id: 'fn32_15',
      title: 'My feelings holidays',
      narrative: [
        'Holiday feelings.',
        '',
        'Mixed always.',
        '',
        'Family plus stress.',
        '',
        'I tell holidays: mixed.'
      ],
      lesson: 'Holiday feelings mixed always family plus stress.'
    }
  ];

  var FEELING_NARRATIVES_33 = [
    {
      id: 'fn33_1',
      title: 'My feelings of belonging',
      narrative: [
        'Belonging deep need.',
        '',
        'Community essential.',
        '',
        'Identity affirmed.',
        '',
        'I tell isolated: belonging.'
      ],
      lesson: 'Belonging deep need; community essential for identity affirmation.'
    },
    {
      id: 'fn33_2',
      title: 'My feelings of acceptance',
      narrative: [
        'Acceptance received.',
        '',
        'And given.',
        '',
        'Both directions.',
        '',
        'I tell rejection-stuck: both directions.'
      ],
      lesson: 'Acceptance received and given in both directions.'
    },
    {
      id: 'fn33_3',
      title: 'My feelings of validation',
      narrative: [
        'Validation needed.',
        '',
        'Witnessed by others.',
        '',
        'Experience confirmed.',
        '',
        'I tell unvalidated: witness.'
      ],
      lesson: 'Validation needed through witnessing by others confirming experience.'
    },
    {
      id: 'fn33_4',
      title: 'My feelings of being seen',
      narrative: [
        'Being seen.',
        '',
        'Deep need.',
        '',
        'Profound when met.',
        '',
        'I tell invisible: being seen.'
      ],
      lesson: 'Being seen deep need profound when met.'
    },
    {
      id: 'fn33_5',
      title: 'My feelings of being heard',
      narrative: [
        'Being heard.',
        '',
        'Not just listened.',
        '',
        'Understood.',
        '',
        'I tell unheard: understanding.'
      ],
      lesson: 'Being heard not just listened but understood.'
    },
    {
      id: 'fn33_6',
      title: 'My feelings of being held',
      narrative: [
        'Being held.',
        '',
        'Emotional and physical.',
        '',
        'Container provided.',
        '',
        'I tell unheld: held experience.'
      ],
      lesson: 'Being held emotionally and physically provides container.'
    },
    {
      id: 'fn33_7',
      title: 'My feelings of safety',
      narrative: [
        'Safety felt.',
        '',
        'Nervous system relaxes.',
        '',
        'Authentic emerges.',
        '',
        'I tell unsafe: safety.'
      ],
      lesson: 'Safety felt allows nervous system relaxation as authentic emerges.'
    },
    {
      id: 'fn33_8',
      title: 'My feelings of trust',
      narrative: [
        'Trust built slowly.',
        '',
        'Earned through actions.',
        '',
        'Foundation laid.',
        '',
        'I tell trust-curious: slow.'
      ],
      lesson: 'Trust built slowly earned through actions foundation laid.'
    },
    {
      id: 'fn33_9',
      title: 'My feelings of intimacy',
      narrative: [
        'Intimacy emotional.',
        '',
        'Plus physical.',
        '',
        'Vulnerability shared.',
        '',
        'I tell intimacy-curious: vulnerability.'
      ],
      lesson: 'Intimacy emotional plus physical through shared vulnerability.'
    },
    {
      id: 'fn33_10',
      title: 'My feelings of connection',
      narrative: [
        'Connection essential.',
        '',
        'Daily practice.',
        '',
        'Lifeline of human.',
        '',
        'I tell isolated: connection essential.'
      ],
      lesson: 'Connection essential daily practice as human lifeline.'
    },
    {
      id: 'fn33_11',
      title: 'My feelings of love',
      narrative: [
        'Love daily verb.',
        '',
        'Action chosen.',
        '',
        'Commitment expressed.',
        '',
        'I tell love-curious: action.'
      ],
      lesson: 'Love daily verb action chosen commitment expressed.'
    },
    {
      id: 'fn33_12',
      title: 'My feelings of joy in others',
      narrative: [
        'Others joy felt.',
        '',
        'Mudita Buddhist concept.',
        '',
        'Sympathetic joy.',
        '',
        'I tell envy-stuck: mudita.'
      ],
      lesson: 'Mudita sympathetic joy in others is alternative to envy.'
    },
    {
      id: 'fn33_13',
      title: 'My feelings of compassion',
      narrative: [
        'Compassion felt.',
        '',
        'For self and others.',
        '',
        'Practice cultivated.',
        '',
        'I tell hard-hearted: compassion.'
      ],
      lesson: 'Compassion felt for self and others as cultivated practice.'
    },
    {
      id: 'fn33_14',
      title: 'My feelings of empathy',
      narrative: [
        'Empathy cultivated.',
        '',
        'Others feelings sensed.',
        '',
        'Connection deepened.',
        '',
        'I tell distance-stuck: empathy.'
      ],
      lesson: 'Empathy cultivated sensing others feelings deepens connection.'
    },
    {
      id: 'fn33_15',
      title: 'My feelings of community',
      narrative: [
        'Community feelings.',
        '',
        'Belonging plus identity.',
        '',
        'Mutual support.',
        '',
        'I tell community-curious: mutual.'
      ],
      lesson: 'Community feelings belonging plus identity provide mutual support.'
    }
  ];

  var FEELING_NARRATIVES_34 = [
    {
      id: 'fn34_1',
      title: 'My feelings practice years',
      narrative: [
        'Years of practice.',
        '',
        'Vocabulary deepened.',
        '',
        'Body awareness keen.',
        '',
        'I tell experienced: deepening.'
      ],
      lesson: 'Years of feelings practice deepen vocabulary and keen body awareness.'
    },
    {
      id: 'fn34_2',
      title: 'My feelings practice morning',
      narrative: [
        'Morning feelings check.',
        '',
        'Daily ritual.',
        '',
        'Awareness anchored.',
        '',
        'I tell scattered: morning check.'
      ],
      lesson: 'Morning feelings check daily ritual anchors awareness.'
    },
    {
      id: 'fn34_3',
      title: 'My feelings practice evening',
      narrative: [
        'Evening feelings review.',
        '',
        'Day examined.',
        '',
        'Patterns observed.',
        '',
        'I tell reflective: evening review.'
      ],
      lesson: 'Evening feelings review examines day observing patterns.'
    },
    {
      id: 'fn34_4',
      title: 'My feelings practice weekly',
      narrative: [
        'Weekly feelings review.',
        '',
        'Themes emerge.',
        '',
        'Adjustment possible.',
        '',
        'I tell weekly: themes.'
      ],
      lesson: 'Weekly feelings review themes emerge with adjustment possible.'
    },
    {
      id: 'fn34_5',
      title: 'My feelings practice monthly',
      narrative: [
        'Monthly feelings.',
        '',
        'Larger patterns.',
        '',
        'Life arc visible.',
        '',
        'I tell monthly: arcs.'
      ],
      lesson: 'Monthly feelings show larger patterns and life arc.'
    },
    {
      id: 'fn34_6',
      title: 'My feelings practice yearly',
      narrative: [
        'Yearly review.',
        '',
        'Major themes.',
        '',
        'Direction set.',
        '',
        'I tell yearly: themes.'
      ],
      lesson: 'Yearly review major themes set direction.'
    },
    {
      id: 'fn34_7',
      title: 'My feelings practice anniversary',
      narrative: [
        'Anniversary reactions.',
        '',
        'Predictable inflow.',
        '',
        'Plan accordingly.',
        '',
        'I tell anniversary-affected: plan.'
      ],
      lesson: 'Anniversary reactions predictable inflow planned accordingly.'
    },
    {
      id: 'fn34_8',
      title: 'My feelings practice in therapy',
      narrative: [
        'Therapy practice.',
        '',
        'Weekly deepening.',
        '',
        'Tools developed.',
        '',
        'I tell therapy-curious: weekly.'
      ],
      lesson: 'Weekly therapy practice deepens awareness and develops tools.'
    },
    {
      id: 'fn34_9',
      title: 'My feelings practice in groups',
      narrative: [
        'Group practice.',
        '',
        'Shared awareness.',
        '',
        'Mirrors offered.',
        '',
        'I tell group: mirrors.'
      ],
      lesson: 'Group practice shared awareness mirrors offered.'
    },
    {
      id: 'fn34_10',
      title: 'My feelings practice in journaling',
      narrative: [
        'Journaling practice.',
        '',
        'Daily externalization.',
        '',
        'Patterns visible.',
        '',
        'I tell journal-curious: daily.'
      ],
      lesson: 'Daily journaling practice externalizes feelings making patterns visible.'
    },
    {
      id: 'fn34_11',
      title: 'My feelings practice in meditation',
      narrative: [
        'Meditation feelings.',
        '',
        'Welcome them all.',
        '',
        'Pass through.',
        '',
        'I tell meditator: welcome.'
      ],
      lesson: 'Meditation feelings welcome all and let pass through.'
    },
    {
      id: 'fn34_12',
      title: 'My feelings practice in art',
      narrative: [
        'Art practice.',
        '',
        'Non-verbal feelings.',
        '',
        'Color expression.',
        '',
        'I tell visual: art.'
      ],
      lesson: 'Art practice expresses non-verbal feelings through color.'
    },
    {
      id: 'fn34_13',
      title: 'My feelings practice in movement',
      narrative: [
        'Movement practice.',
        '',
        'Body expresses.',
        '',
        'Energy moves.',
        '',
        'I tell body-stuck: movement.'
      ],
      lesson: 'Movement practice body expresses energy moves.'
    },
    {
      id: 'fn34_14',
      title: 'My feelings practice with breath',
      narrative: [
        'Breath practice.',
        '',
        'Always available.',
        '',
        'Anchor present.',
        '',
        'I tell scattered: breath.'
      ],
      lesson: 'Breath practice always available anchors present.'
    },
    {
      id: 'fn34_15',
      title: 'My feelings practice all integrated',
      narrative: [
        'All practices integrated.',
        '',
        'Vocabulary, body, breath, art, movement.',
        '',
        'Whole person.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'All practices integrated vocabulary, body, breath, art, movement whole person.'
    }
  ];

  var FEELING_NARRATIVES_35 = [
    {
      id: 'fn35_1',
      title: 'My feelings I teach my children',
      narrative: [
        'Feelings education.',
        '',
        'Children taught.',
        '',
        'Vocabulary shared.',
        '',
        'I tell parents: teach.'
      ],
      lesson: 'Feelings education with vocabulary shared teaches children.'
    },
    {
      id: 'fn35_2',
      title: 'My feelings I model for kids',
      narrative: [
        'Model feeling expression.',
        '',
        'Children watch.',
        '',
        'Learn through us.',
        '',
        'I tell parents: model.'
      ],
      lesson: 'Modeling feeling expression children watch and learn through us.'
    },
    {
      id: 'fn35_3',
      title: 'My feelings during conflict with kids',
      narrative: [
        'Conflict with kids.',
        '',
        'Pause and breathe.',
        '',
        'Repair after.',
        '',
        'I tell conflict-parents: repair.'
      ],
      lesson: 'Conflict with kids pause and breathe then repair after.'
    },
    {
      id: 'fn35_4',
      title: 'My feelings during conflict with partner',
      narrative: [
        'Conflict with partner.',
        '',
        'Both heard.',
        '',
        'Repair sought.',
        '',
        'I tell conflict-partner: both.'
      ],
      lesson: 'Conflict with partner both heard with repair sought.'
    },
    {
      id: 'fn35_5',
      title: 'My feelings during conflict with parents',
      narrative: [
        'Conflict with parents.',
        '',
        'Inner adult engaged.',
        '',
        'Old patterns observed.',
        '',
        'I tell adult-children: inner adult.'
      ],
      lesson: 'Conflict with parents inner adult engaged observing old patterns.'
    },
    {
      id: 'fn35_6',
      title: 'My feelings during conflict with friends',
      narrative: [
        'Friend conflict.',
        '',
        'Honest conversation.',
        '',
        'Repair possible.',
        '',
        'I tell friend-conflict: honest.'
      ],
      lesson: 'Friend conflict honest conversation enables repair possible.'
    },
    {
      id: 'fn35_7',
      title: 'My feelings during conflict at work',
      narrative: [
        'Work conflict.',
        '',
        'Professional resolution.',
        '',
        'HR if needed.',
        '',
        'I tell work-conflict: professional.'
      ],
      lesson: 'Work conflict professional resolution HR if needed.'
    },
    {
      id: 'fn35_8',
      title: 'My feelings during conflict with neighbor',
      narrative: [
        'Neighbor conflict.',
        '',
        'Diplomatic approach.',
        '',
        'Long-term thinking.',
        '',
        'I tell neighbor-conflict: diplomatic.'
      ],
      lesson: 'Neighbor conflict diplomatic approach with long-term thinking.'
    },
    {
      id: 'fn35_9',
      title: 'My feelings of forgiveness',
      narrative: [
        'Forgiveness practice.',
        '',
        'Years of work.',
        '',
        'Self freed.',
        '',
        'I tell grudges: forgiveness.'
      ],
      lesson: 'Forgiveness practice years of work frees self.'
    },
    {
      id: 'fn35_10',
      title: 'My feelings of letting go',
      narrative: [
        'Letting go practice.',
        '',
        'Hands open.',
        '',
        'Energy preserved.',
        '',
        'I tell holding: letting go.'
      ],
      lesson: 'Letting go practice hands open preserve energy.'
    },
    {
      id: 'fn35_11',
      title: 'My feelings of acceptance',
      narrative: [
        'Acceptance daily.',
        '',
        'What is, is.',
        '',
        'Fighting drops.',
        '',
        'I tell fighting: acceptance.'
      ],
      lesson: 'Acceptance daily what is, is fighting drops.'
    },
    {
      id: 'fn35_12',
      title: 'My feelings of surrender',
      narrative: [
        'Surrender practice.',
        '',
        'Control released.',
        '',
        'Trust process.',
        '',
        'I tell controlling: surrender.'
      ],
      lesson: 'Surrender practice control released trust process.'
    },
    {
      id: 'fn35_13',
      title: 'My feelings of trust',
      narrative: [
        'Trust built.',
        '',
        'Self and others.',
        '',
        'Foundation laid.',
        '',
        'I tell trust-curious: build.'
      ],
      lesson: 'Trust built for self and others as foundation laid.'
    },
    {
      id: 'fn35_14',
      title: 'My feelings of faith',
      narrative: [
        'Faith cultivated.',
        '',
        'Belief in goodness.',
        '',
        'Hope sustained.',
        '',
        'I tell faith-curious: cultivate.'
      ],
      lesson: 'Faith cultivated belief in goodness sustains hope.'
    },
    {
      id: 'fn35_15',
      title: 'My feelings of all integrated',
      narrative: [
        'All feelings integrated.',
        '',
        'Whole person.',
        '',
        'Lifelong practice.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'All feelings integrated whole person as lifelong practice.'
    }
  ];

  var FEELING_NARRATIVES_26 = [
    {
      id: 'fn26_1',
      title: 'My feelings in childhood remembered',
      narrative: [
        'Childhood feelings remembered.',
        '',
        'Inner child work.',
        '',
        'Suppressed feelings released.',
        '',
        'I tell inner-child curious: work.'
      ],
      lesson: 'Childhood feelings remembered through inner child work releases suppressed feelings.'
    },
    {
      id: 'fn26_2',
      title: 'My feelings of inner child',
      narrative: [
        'Inner child has feelings.',
        '',
        'Listen to them.',
        '',
        'Honor old needs.',
        '',
        'I tell adult-only: inner child.'
      ],
      lesson: 'Inner child has feelings worth listening; honor old needs.'
    },
    {
      id: 'fn26_3',
      title: 'My feelings of adolescent self',
      narrative: [
        'Teen self remembered.',
        '',
        'Big feelings then.',
        '',
        'Now understood.',
        '',
        'I tell teen-shame: understand.'
      ],
      lesson: 'Teen self with big feelings remembered now understood as adult.'
    },
    {
      id: 'fn26_4',
      title: 'My feelings of young adult',
      narrative: [
        'Young adult feelings.',
        '',
        'Identity formation.',
        '',
        'Foundation laid.',
        '',
        'I tell middle-aged: foundation.'
      ],
      lesson: 'Young adult feelings during identity formation laid foundation.'
    },
    {
      id: 'fn26_5',
      title: 'My feelings of middle age',
      narrative: [
        'Middle age feelings.',
        '',
        'Mortality awareness.',
        '',
        'Time finitude.',
        '',
        'I tell middle-aged: time.'
      ],
      lesson: 'Middle age feelings include mortality awareness and time finitude.'
    },
    {
      id: 'fn26_6',
      title: 'My feelings of elderly self',
      narrative: [
        'Elderly feelings.',
        '',
        'Loss integrated.',
        '',
        'Wisdom emerging.',
        '',
        'I tell elderly: wisdom.'
      ],
      lesson: 'Elderly feelings integrate loss with wisdom emerging.'
    },
    {
      id: 'fn26_7',
      title: 'My feelings family generational',
      narrative: [
        'Generational feelings.',
        '',
        'Inherited patterns.',
        '',
        'Break the cycle.',
        '',
        'I tell pattern-stuck: break cycle.'
      ],
      lesson: 'Generational feelings as inherited patterns can break cycle.'
    },
    {
      id: 'fn26_8',
      title: 'My feelings trauma generational',
      narrative: [
        'Trauma passed.',
        '',
        'Cycle awareness.',
        '',
        'Healing begins now.',
        '',
        'I tell trauma-inherited: heal.'
      ],
      lesson: 'Trauma passed through generations needs cycle awareness; healing begins now.'
    },
    {
      id: 'fn26_9',
      title: 'My feelings cultural inherited',
      narrative: [
        'Cultural feelings.',
        '',
        'Heritage and pain.',
        '',
        'Identity work.',
        '',
        'I tell heritage-stressed: identity.'
      ],
      lesson: 'Cultural feelings of heritage and pain require identity work.'
    },
    {
      id: 'fn26_10',
      title: 'My feelings collective shared',
      narrative: [
        'Collective feelings.',
        '',
        'Community grief.',
        '',
        'Shared experience.',
        '',
        'I tell isolated-grief: collective.'
      ],
      lesson: 'Collective feelings as community grief share experience.'
    },
    {
      id: 'fn26_11',
      title: 'My feelings ancestral',
      narrative: [
        'Ancestral feelings.',
        '',
        'Beyond personal.',
        '',
        'Connection to lineage.',
        '',
        'I tell roots-curious: ancestral.'
      ],
      lesson: 'Ancestral feelings beyond personal connect to lineage.'
    },
    {
      id: 'fn26_12',
      title: 'My feelings spiritual',
      narrative: [
        'Spiritual feelings.',
        '',
        'Awe and wonder.',
        '',
        'Beyond rational.',
        '',
        'I tell spiritual-curious: awe.'
      ],
      lesson: 'Spiritual feelings of awe and wonder beyond rational.'
    },
    {
      id: 'fn26_13',
      title: 'My feelings transcendent',
      narrative: [
        'Transcendent feelings.',
        '',
        'Beyond self.',
        '',
        'Connection to all.',
        '',
        'I tell self-bound: transcendent.'
      ],
      lesson: 'Transcendent feelings beyond self connect to all.'
    },
    {
      id: 'fn26_14',
      title: 'My feelings mystical',
      narrative: [
        'Mystical feelings.',
        '',
        'Direct experience.',
        '',
        'Beyond words.',
        '',
        'I tell mystical-curious: experience.'
      ],
      lesson: 'Mystical feelings of direct experience beyond words.'
    },
    {
      id: 'fn26_15',
      title: 'My feelings integrated whole self',
      narrative: [
        'Whole self emotion.',
        '',
        'All feelings welcome.',
        '',
        'Integration complete.',
        '',
        'I tell fragmented: integration.'
      ],
      lesson: 'Whole self emotion with all feelings welcome integrates fragments.'
    }
  ];

  var FEELING_NARRATIVES_27 = [
    {
      id: 'fn27_1',
      title: 'My feelings in therapy room',
      narrative: [
        'Therapy room safe.',
        '',
        'Feelings emerge.',
        '',
        'Container holds.',
        '',
        'I tell therapy-curious: safe.'
      ],
      lesson: 'Therapy room safe container for emerging feelings.'
    },
    {
      id: 'fn27_2',
      title: 'My feelings in group room',
      narrative: [
        'Group room.',
        '',
        'Witnesses present.',
        '',
        'Shared experience.',
        '',
        'I tell group-curious: witnesses.'
      ],
      lesson: 'Group room with witnesses present provides shared experience.'
    },
    {
      id: 'fn27_3',
      title: 'My feelings in nature',
      narrative: [
        'Nature receives.',
        '',
        'Trees hold space.',
        '',
        'Earth holds.',
        '',
        'I tell nature-curious: receives.'
      ],
      lesson: 'Nature receives feelings with trees and Earth holding space.'
    },
    {
      id: 'fn27_4',
      title: 'My feelings at altar',
      narrative: [
        'Sacred altar feelings.',
        '',
        'Offered to spirit.',
        '',
        'Released.',
        '',
        'I tell altar-using: offer.'
      ],
      lesson: 'Sacred altar feelings offered to spirit are released.'
    },
    {
      id: 'fn27_5',
      title: 'My feelings in prayer',
      narrative: [
        'Prayer holds feelings.',
        '',
        'Spoken or silent.',
        '',
        'Heard somewhere.',
        '',
        'I tell faithful: prayer holds.'
      ],
      lesson: 'Prayer holds feelings spoken or silent heard somewhere.'
    },
    {
      id: 'fn27_6',
      title: 'My feelings in meditation',
      narrative: [
        'Meditation receives.',
        '',
        'Sit with feeling.',
        '',
        'Pass through.',
        '',
        'I tell meditator: sit with.'
      ],
      lesson: 'Meditation receives feelings sat with as they pass through.'
    },
    {
      id: 'fn27_7',
      title: 'My feelings in writing',
      narrative: [
        'Writing holds feelings.',
        '',
        'Paper container.',
        '',
        'Externalized.',
        '',
        'I tell journaler: externalize.'
      ],
      lesson: 'Writing holds feelings in paper container externalized.'
    },
    {
      id: 'fn27_8',
      title: 'My feelings in art',
      narrative: [
        'Art holds feelings.',
        '',
        'Colors and forms.',
        '',
        'Non-verbal expression.',
        '',
        'I tell artist: art holds.'
      ],
      lesson: 'Art holds feelings through colors and forms non-verbally.'
    },
    {
      id: 'fn27_9',
      title: 'My feelings in music',
      narrative: [
        'Music holds feelings.',
        '',
        'Sounds resonate.',
        '',
        'Body responds.',
        '',
        'I tell musician: music holds.'
      ],
      lesson: 'Music holds feelings through sound resonance with body response.'
    },
    {
      id: 'fn27_10',
      title: 'My feelings in movement',
      narrative: [
        'Movement holds feelings.',
        '',
        'Body expresses.',
        '',
        'Dance releases.',
        '',
        'I tell dancer: movement holds.'
      ],
      lesson: 'Movement holds feelings through body expression with dance releasing.'
    },
    {
      id: 'fn27_11',
      title: 'My feelings in tears',
      narrative: [
        'Tears release feelings.',
        '',
        'Body cleanses.',
        '',
        'Welcome them.',
        '',
        'I tell tear-shamed: welcome.'
      ],
      lesson: 'Tears release feelings as body cleanses; welcome them.'
    },
    {
      id: 'fn27_12',
      title: 'My feelings in laughter',
      narrative: [
        'Laughter releases feelings.',
        '',
        'Joy and tension.',
        '',
        'Body lifts.',
        '',
        'I tell heavy: laughter.'
      ],
      lesson: 'Laughter releases joy and tension feelings as body lifts.'
    },
    {
      id: 'fn27_13',
      title: 'My feelings in song',
      narrative: [
        'Song releases feelings.',
        '',
        'Voice carries.',
        '',
        'Body vibrates.',
        '',
        'I tell singer: song releases.'
      ],
      lesson: 'Song releases feelings with voice carrying and body vibrating.'
    },
    {
      id: 'fn27_14',
      title: 'My feelings in breath',
      narrative: [
        'Breath shifts feelings.',
        '',
        'In and out.',
        '',
        'Body responds.',
        '',
        'I tell breath-curious: shifts.'
      ],
      lesson: 'Breath shifts feelings in and out as body responds.'
    },
    {
      id: 'fn27_15',
      title: 'My feelings expressed safely all',
      narrative: [
        'All safe expression.',
        '',
        'Multiple channels.',
        '',
        'Whole self heard.',
        '',
        'I tell stuck: multiple channels.'
      ],
      lesson: 'All safe expression channels heard whole self.'
    }
  ];

  var FEELING_NARRATIVES_28 = [
    {
      id: 'fn28_1',
      title: 'My anger and exercise',
      narrative: [
        'Exercise releases anger.',
        '',
        'Body processes.',
        '',
        'Daily routine.',
        '',
        'I tell anger-stuck: exercise.'
      ],
      lesson: 'Daily exercise releases anger through body processing.'
    },
    {
      id: 'fn28_2',
      title: 'My anger and running',
      narrative: [
        'Running anger.',
        '',
        'Body releases.',
        '',
        'Bucket drained.',
        '',
        'I tell angry: run.'
      ],
      lesson: 'Running anger lets body release draining bucket.'
    },
    {
      id: 'fn28_3',
      title: 'My anger and boxing',
      narrative: [
        'Boxing class.',
        '',
        'Punching bag.',
        '',
        'Anger physical release.',
        '',
        'I tell angry-physical: boxing.'
      ],
      lesson: 'Boxing class with punching bag provides physical anger release.'
    },
    {
      id: 'fn28_4',
      title: 'My anger and martial arts',
      narrative: [
        'Martial arts discipline.',
        '',
        'Anger channeled.',
        '',
        'Body trained.',
        '',
        'I tell angry-curious: martial arts.'
      ],
      lesson: 'Martial arts discipline channels anger through body training.'
    },
    {
      id: 'fn28_5',
      title: 'My anger and weight lifting',
      narrative: [
        'Weight lifting.',
        '',
        'Strong body.',
        '',
        'Anger released.',
        '',
        'I tell strength-curious: weights.'
      ],
      lesson: 'Weight lifting builds strong body and releases anger.'
    },
    {
      id: 'fn28_6',
      title: 'My anger and dance',
      narrative: [
        'Dance anger.',
        '',
        'Body expresses.',
        '',
        'Movement releases.',
        '',
        'I tell dance-curious: angry dance.'
      ],
      lesson: 'Angry dance through body expression movement releases anger.'
    },
    {
      id: 'fn28_7',
      title: 'My anger and yelling',
      narrative: [
        'Yelling in car.',
        '',
        'Alone safe.',
        '',
        'Body release.',
        '',
        'I tell suppressed: safe yell.'
      ],
      lesson: 'Yelling alone in car safely releases anger through body.'
    },
    {
      id: 'fn28_8',
      title: 'My anger and pillow punch',
      narrative: [
        'Pillow punching.',
        '',
        'Safe physical.',
        '',
        'Anger released.',
        '',
        'I tell suppressing: pillow.'
      ],
      lesson: 'Pillow punching as safe physical anger release.'
    },
    {
      id: 'fn28_9',
      title: 'My anger and tearing paper',
      narrative: [
        'Tearing paper.',
        '',
        'Visual destruction.',
        '',
        'Safe release.',
        '',
        'I tell suppressing: paper tear.'
      ],
      lesson: 'Tearing paper provides safe visual anger release destruction.'
    },
    {
      id: 'fn28_10',
      title: 'My anger and cold water',
      narrative: [
        'Cold water on face.',
        '',
        'Nervous system reset.',
        '',
        'Anger calmed.',
        '',
        'I tell hot-angry: cold water.'
      ],
      lesson: 'Cold water on face resets nervous system calming anger.'
    },
    {
      id: 'fn28_11',
      title: 'My anger and stepping away',
      narrative: [
        'Step away.',
        '',
        'Time-out.',
        '',
        'Space created.',
        '',
        'I tell reactive: step away.'
      ],
      lesson: 'Stepping away as time-out creates space from reactive anger.'
    },
    {
      id: 'fn28_12',
      title: 'My anger and breath out',
      narrative: [
        'Long breath out.',
        '',
        'Tension released.',
        '',
        'Vagal stimulation.',
        '',
        'I tell tense-angry: long exhale.'
      ],
      lesson: 'Long breath out releases tension through vagal stimulation.'
    },
    {
      id: 'fn28_13',
      title: 'My anger and counting',
      narrative: [
        'Count to 10.',
        '',
        'Breath between.',
        '',
        'Brain pause.',
        '',
        'I tell reactive: counting.'
      ],
      lesson: 'Counting to 10 with breath between provides brain pause.'
    },
    {
      id: 'fn28_14',
      title: 'My anger and ice cubes',
      narrative: [
        'Ice cubes in hand.',
        '',
        'Sensory grounding.',
        '',
        'Anger present.',
        '',
        'I tell dissociating: ice cubes.'
      ],
      lesson: 'Ice cubes in hand provide sensory grounding bringing anger present.'
    },
    {
      id: 'fn28_15',
      title: 'My anger and grounding senses',
      narrative: [
        'Grounding senses.',
        '',
        '5-4-3-2-1.',
        '',
        'Body anchored.',
        '',
        'I tell escalating: grounding.'
      ],
      lesson: 'Grounding senses through 5-4-3-2-1 anchors body during escalating anger.'
    }
  ];

  var FEELING_NARRATIVES_29 = [
    {
      id: 'fn29_1',
      title: 'My feelings in workplace',
      narrative: [
        'Workplace feelings.',
        '',
        'Professional expression.',
        '',
        'Boundaries respected.',
        '',
        'I tell workplace: appropriate expression.'
      ],
      lesson: 'Workplace feelings expressed professionally with boundaries respected.'
    },
    {
      id: 'fn29_2',
      title: 'My feelings in meetings',
      narrative: [
        'Meeting feelings.',
        '',
        'Contained when needed.',
        '',
        'Processed after.',
        '',
        'I tell meeting-emotional: contain then process.'
      ],
      lesson: 'Meeting feelings contained when needed processed after privately.'
    },
    {
      id: 'fn29_3',
      title: 'My feelings with boss',
      narrative: [
        'Boss feelings.',
        '',
        'Power dynamic.',
        '',
        'Strategic expression.',
        '',
        'I tell boss-feelings: strategic.'
      ],
      lesson: 'Feelings with boss require strategic expression considering power dynamic.'
    },
    {
      id: 'fn29_4',
      title: 'My feelings with coworkers',
      narrative: [
        'Coworker feelings.',
        '',
        'Some safe to share.',
        '',
        'Some not.',
        '',
        'I tell discernment-curious: choose.'
      ],
      lesson: 'Coworker feelings; some safe to share and some not; discernment required.'
    },
    {
      id: 'fn29_5',
      title: 'My feelings with reports',
      narrative: [
        'Direct report feelings.',
        '',
        'Model healthy expression.',
        '',
        'Boundaries maintained.',
        '',
        'I tell managers: model.'
      ],
      lesson: 'Direct report feelings as opportunity to model healthy expression with boundaries.'
    },
    {
      id: 'fn29_6',
      title: 'My feelings with clients',
      narrative: [
        'Client feelings.',
        '',
        'Professional presence.',
        '',
        'Self after work.',
        '',
        'I tell client-facing: separate.'
      ],
      lesson: 'Client feelings professionally managed; self processed after work.'
    },
    {
      id: 'fn29_7',
      title: 'My feelings in interviews',
      narrative: [
        'Interview feelings.',
        '',
        'Nerves normal.',
        '',
        'Acknowledge then redirect.',
        '',
        'I tell interview-anxious: acknowledge.'
      ],
      lesson: 'Interview feelings nerves normal; acknowledge then redirect to task.'
    },
    {
      id: 'fn29_8',
      title: 'My feelings in performance reviews',
      narrative: [
        'Review feelings.',
        '',
        'Pre-prep with mentor.',
        '',
        'Containment during.',
        '',
        'I tell review-anxious: pre-prep.'
      ],
      lesson: 'Performance review feelings managed by pre-prep with mentor; containment during.'
    },
    {
      id: 'fn29_9',
      title: 'My feelings at termination',
      narrative: [
        'Termination feelings.',
        '',
        'Shock and grief.',
        '',
        'Therapy and community.',
        '',
        'I tell terminated: therapy and community.'
      ],
      lesson: 'Termination feelings of shock and grief need therapy plus community support.'
    },
    {
      id: 'fn29_10',
      title: 'My feelings at promotion',
      narrative: [
        'Promotion feelings.',
        '',
        'Joy plus imposter.',
        '',
        'Both real.',
        '',
        'I tell promoted: both.'
      ],
      lesson: 'Promotion feelings include joy plus imposter syndrome; both real.'
    },
    {
      id: 'fn29_11',
      title: 'My feelings at retirement',
      narrative: [
        'Retirement feelings.',
        '',
        'Identity shift.',
        '',
        'Transition therapy.',
        '',
        'I tell retiring: identity transition.'
      ],
      lesson: 'Retirement feelings of identity shift need transition therapy.'
    },
    {
      id: 'fn29_12',
      title: 'My feelings at career change',
      narrative: [
        'Career change feelings.',
        '',
        'Fear plus excitement.',
        '',
        'Both honored.',
        '',
        'I tell changing-careers: honor both.'
      ],
      lesson: 'Career change feelings of fear plus excitement both honored.'
    },
    {
      id: 'fn29_13',
      title: 'My feelings as entrepreneur',
      narrative: [
        'Entrepreneur feelings.',
        '',
        'Roller coaster.',
        '',
        'Community essential.',
        '',
        'I tell entrepreneurs: community.'
      ],
      lesson: 'Entrepreneur feelings roller coaster need community essential support.'
    },
    {
      id: 'fn29_14',
      title: 'My feelings as freelancer',
      narrative: [
        'Freelancer feelings.',
        '',
        'Isolation plus freedom.',
        '',
        'Both true.',
        '',
        'I tell freelancers: both.'
      ],
      lesson: 'Freelancer feelings of isolation plus freedom both true.'
    },
    {
      id: 'fn29_15',
      title: 'My feelings as remote worker',
      narrative: [
        'Remote worker feelings.',
        '',
        'Convenience plus loneliness.',
        '',
        'Community needed.',
        '',
        'I tell remote: community.'
      ],
      lesson: 'Remote worker feelings of convenience plus loneliness need community.'
    }
  ];

  var FEELING_NARRATIVES_30 = [
    {
      id: 'fn30_1',
      title: 'My feelings in marriage',
      narrative: [
        'Marriage feelings shift.',
        '',
        'Daily, yearly, decades.',
        '',
        'All valid.',
        '',
        'I tell married: feelings shift.'
      ],
      lesson: 'Marriage feelings shift daily, yearly, decades; all valid.'
    },
    {
      id: 'fn30_2',
      title: 'My feelings in dating',
      narrative: [
        'Dating feelings.',
        '',
        'Hope and frustration.',
        '',
        'Both real.',
        '',
        'I tell dating: both real.'
      ],
      lesson: 'Dating feelings of hope and frustration both real.'
    },
    {
      id: 'fn30_3',
      title: 'My feelings in long-term relationship',
      narrative: [
        'Long-term feelings.',
        '',
        'Love and habit.',
        '',
        'Renewal practice.',
        '',
        'I tell long-term: renewal.'
      ],
      lesson: 'Long-term relationship feelings of love and habit need renewal practice.'
    },
    {
      id: 'fn30_4',
      title: 'My feelings during conflict',
      narrative: [
        'Conflict feelings.',
        '',
        'Intense usually.',
        '',
        'Repair after.',
        '',
        'I tell conflict-stuck: repair.'
      ],
      lesson: 'Conflict feelings usually intense; repair after essential.'
    },
    {
      id: 'fn30_5',
      title: 'My feelings during repair',
      narrative: [
        'Repair feelings.',
        '',
        'Vulnerability needed.',
        '',
        'Connection deepens.',
        '',
        'I tell repair-curious: vulnerable.'
      ],
      lesson: 'Repair feelings need vulnerability for connection deepening.'
    },
    {
      id: 'fn30_6',
      title: 'My feelings of love',
      narrative: [
        'Love feelings.',
        '',
        'Multiple types.',
        '',
        'All valuable.',
        '',
        'I tell love-curious: types.'
      ],
      lesson: 'Love feelings come in multiple types all valuable.'
    },
    {
      id: 'fn30_7',
      title: 'My feelings of romantic love',
      narrative: [
        'Romantic love.',
        '',
        'Eros desire.',
        '',
        'Plus commitment.',
        '',
        'I tell romantic-curious: types.'
      ],
      lesson: 'Romantic love includes eros desire plus commitment.'
    },
    {
      id: 'fn30_8',
      title: 'My feelings of friendship love',
      narrative: [
        'Friendship love.',
        '',
        'Philia warmth.',
        '',
        'Chosen family.',
        '',
        'I tell friend-love: philia.'
      ],
      lesson: 'Friendship love philia warmth includes chosen family.'
    },
    {
      id: 'fn30_9',
      title: 'My feelings of family love',
      narrative: [
        'Family love.',
        '',
        'Storge bond.',
        '',
        'Complicated and real.',
        '',
        'I tell family: storge.'
      ],
      lesson: 'Family love storge bond complicated and real.'
    },
    {
      id: 'fn30_10',
      title: 'My feelings of self-love',
      narrative: [
        'Self-love work.',
        '',
        'Daily practice.',
        '',
        'Foundation built.',
        '',
        'I tell self-critical: self-love practice.'
      ],
      lesson: 'Self-love work as daily practice builds foundation.'
    },
    {
      id: 'fn30_11',
      title: 'My feelings of compassionate love',
      narrative: [
        'Agape compassionate love.',
        '',
        'For strangers too.',
        '',
        'Universal love.',
        '',
        'I tell universal-curious: agape.'
      ],
      lesson: 'Agape compassionate love extends to strangers as universal love.'
    },
    {
      id: 'fn30_12',
      title: 'My feelings of love losing',
      narrative: [
        'Love lost.',
        '',
        'Real grief.',
        '',
        'Years to process.',
        '',
        'I tell heartbroken: time.'
      ],
      lesson: 'Love lost real grief takes years to process.'
    },
    {
      id: 'fn30_13',
      title: 'My feelings of new love',
      narrative: [
        'New love intense.',
        '',
        'Brain chemistry.',
        '',
        'Settle into commitment.',
        '',
        'I tell new-love: settle.'
      ],
      lesson: 'New love intense brain chemistry settles into commitment over time.'
    },
    {
      id: 'fn30_14',
      title: 'My feelings of mature love',
      narrative: [
        'Mature love steady.',
        '',
        'Daily commitment.',
        '',
        'Less drama more depth.',
        '',
        'I tell mature: depth.'
      ],
      lesson: 'Mature love steady daily commitment less drama more depth.'
    },
    {
      id: 'fn30_15',
      title: 'My feelings of love continuing',
      narrative: [
        'Love continues.',
        '',
        'Through death.',
        '',
        'Through distance.',
        '',
        'Through time.',
        '',
        'I tell all: love continues.'
      ],
      lesson: 'Love continues through death, distance, time forever.'
    }
  ];

  var FEELING_NARRATIVES_21 = [
    {
      id: 'fn21_1',
      title: 'My guilt as corrective',
      narrative: [
        'Guilt corrective signal.',
        '',
        'Action wrong, not me.',
        '',
        'Repair attempted.',
        '',
        'I tell guilt-shamed: corrective.'
      ],
      lesson: 'Guilt as corrective signal indicates action wrong not me; repair attempted.'
    },
    {
      id: 'fn21_2',
      title: 'My guilt and apology',
      narrative: [
        'Apologized for harm.',
        '',
        'Repair offered.',
        '',
        'Forgiveness sought.',
        '',
        'I tell harmful: apologize.'
      ],
      lesson: 'Apologized for harm offers repair seeking forgiveness.'
    },
    {
      id: 'fn21_3',
      title: 'My guilt and amends',
      narrative: [
        'Making amends.',
        '',
        'Concrete actions.',
        '',
        'Pattern changed.',
        '',
        'I tell guilty: amends.'
      ],
      lesson: 'Making amends through concrete actions changes pattern.'
    },
    {
      id: 'fn21_4',
      title: 'My guilt parental',
      narrative: [
        'Parent guilt.',
        '',
        'Not perfect.',
        '',
        'Good enough.',
        '',
        'I tell parents: good enough.'
      ],
      lesson: 'Parent guilt eased by good enough not perfect standard.'
    },
    {
      id: 'fn21_5',
      title: 'My guilt working parent',
      narrative: [
        'Working parent guilt.',
        '',
        'Quality over quantity.',
        '',
        'Children flourish.',
        '',
        'I tell working-parents: quality.'
      ],
      lesson: 'Working parent guilt eased by quality over quantity time.'
    },
    {
      id: 'fn21_6',
      title: 'My guilt stay-home parent',
      narrative: [
        'Stay-home guilt.',
        '',
        'Important work.',
        '',
        'Self-care matters.',
        '',
        'I tell stay-home: important work.'
      ],
      lesson: 'Stay-home parent guilt eased by recognizing important work and self-care.'
    },
    {
      id: 'fn21_7',
      title: 'My guilt caregiver',
      narrative: [
        'Caregiver guilt.',
        '',
        'Cant do everything.',
        '',
        'Limits acknowledged.',
        '',
        'I tell caregivers: limits real.'
      ],
      lesson: 'Caregiver guilt eased by acknowledging cannot do everything; limits real.'
    },
    {
      id: 'fn21_8',
      title: 'My guilt survivor',
      narrative: [
        'Survivor guilt.',
        '',
        'Why me alive?',
        '',
        'Specialty therapy.',
        '',
        'I tell survivors: specialty.'
      ],
      lesson: 'Survivor guilt with why-me-alive question needs specialty therapy.'
    },
    {
      id: 'fn21_9',
      title: 'My guilt money',
      narrative: [
        'Money guilt.',
        '',
        'Privilege examined.',
        '',
        'Service emerging.',
        '',
        'I tell privileged: service.'
      ],
      lesson: 'Money guilt eased by examined privilege with service emerging.'
    },
    {
      id: 'fn21_10',
      title: 'My guilt for boundaries',
      narrative: [
        'Boundary guilt.',
        '',
        'But healthy.',
        '',
        'Through anyway.',
        '',
        'I tell boundary-guilty: through.'
      ],
      lesson: 'Boundary guilt felt but healthy; through anyway despite feeling.'
    },
    {
      id: 'fn21_11',
      title: 'My guilt for self-care',
      narrative: [
        'Self-care guilt.',
        '',
        'Needed not selfish.',
        '',
        'Sustainable giving.',
        '',
        'I tell self-care-guilty: needed.'
      ],
      lesson: 'Self-care guilt eased; needed not selfish for sustainable giving.'
    },
    {
      id: 'fn21_12',
      title: 'My guilt for saying no',
      narrative: [
        'No guilt.',
        '',
        'Full sentence.',
        '',
        'Healthy choice.',
        '',
        'I tell people-pleaser: no okay.'
      ],
      lesson: 'No guilt as full sentence is healthy choice.'
    },
    {
      id: 'fn21_13',
      title: 'My guilt for rest',
      narrative: [
        'Rest guilt.',
        '',
        'Productivity culture.',
        '',
        'Rest is productive.',
        '',
        'I tell rest-guilty: necessary.'
      ],
      lesson: 'Rest guilt from productivity culture; rest is productive necessary practice.'
    },
    {
      id: 'fn21_14',
      title: 'My guilt for joy',
      narrative: [
        'Joy guilt.',
        '',
        'After loss especially.',
        '',
        'Permission granted.',
        '',
        'I tell joy-guilty: permission.'
      ],
      lesson: 'Joy guilt especially after loss eased by permission granted.'
    },
    {
      id: 'fn21_15',
      title: 'My guilt integrated',
      narrative: [
        'Guilt integrated.',
        '',
        'Information accepted.',
        '',
        'Action taken.',
        '',
        'I tell stuck-guilt: integration.'
      ],
      lesson: 'Guilt integrated as information accepted and action taken.'
    }
  ];

  var FEELING_NARRATIVES_22 = [
    {
      id: 'fn22_1',
      title: 'My disgust as boundary',
      narrative: [
        'Disgust signals boundary.',
        '',
        'What I will not.',
        '',
        'Honored as signal.',
        '',
        'I tell disgust-shamed: boundary.'
      ],
      lesson: 'Disgust signals boundary about what I will not honor as signal.'
    },
    {
      id: 'fn22_2',
      title: 'My disgust at injustice',
      narrative: [
        'Injustice disgust.',
        '',
        'Moral response.',
        '',
        'Channel to action.',
        '',
        'I tell injustice-disgusted: action.'
      ],
      lesson: 'Injustice disgust as moral response channels to action.'
    },
    {
      id: 'fn22_3',
      title: 'My disgust at body',
      narrative: [
        'Body disgust.',
        '',
        'Body neutrality work.',
        '',
        'Compassion built.',
        '',
        'I tell body-disgusted: neutrality.'
      ],
      lesson: 'Body disgust treated through body neutrality work builds compassion.'
    },
    {
      id: 'fn22_4',
      title: 'My disgust at food',
      narrative: [
        'Food disgust intense.',
        '',
        'ARFID treatment.',
        '',
        'Tolerance built.',
        '',
        'I tell food-restrictive: ARFID specialty.'
      ],
      lesson: 'Food disgust intense addressed through ARFID specialty treatment builds tolerance.'
    },
    {
      id: 'fn22_5',
      title: 'My disgust at past behavior',
      narrative: [
        'Past behavior disgust.',
        '',
        'Self-compassion.',
        '',
        'Growth acknowledged.',
        '',
        'I tell past-disgusted: compassion.'
      ],
      lesson: 'Past behavior disgust met with self-compassion acknowledging growth.'
    },
    {
      id: 'fn22_6',
      title: 'My disgust at others',
      narrative: [
        'Others disgust.',
        '',
        'Boundary signal.',
        '',
        'Distance taken.',
        '',
        'I tell others-disgusted: distance.'
      ],
      lesson: 'Disgust at others as boundary signal indicates distance needed.'
    },
    {
      id: 'fn22_7',
      title: 'My disgust at smells',
      narrative: [
        'Smell aversions.',
        '',
        'Sensory sensitivity.',
        '',
        'Avoidance valid.',
        '',
        'I tell sensory-sensitive: validity.'
      ],
      lesson: 'Smell aversions from sensory sensitivity; avoidance valid.'
    },
    {
      id: 'fn22_8',
      title: 'My disgust at textures',
      narrative: [
        'Texture aversions.',
        '',
        'Sensory needs.',
        '',
        'Accommodations made.',
        '',
        'I tell texture-sensitive: accommodate.'
      ],
      lesson: 'Texture aversions from sensory needs require accommodations.'
    },
    {
      id: 'fn22_9',
      title: 'My disgust at sounds',
      narrative: [
        'Sound aversions.',
        '',
        'Misophonia possibly.',
        '',
        'Coping strategies.',
        '',
        'I tell sound-sensitive: misophonia possible.'
      ],
      lesson: 'Sound aversions possibly misophonia need coping strategies.'
    },
    {
      id: 'fn22_10',
      title: 'My disgust at sights',
      narrative: [
        'Visual aversions.',
        '',
        'Visual sensitivity.',
        '',
        'Look away.',
        '',
        'I tell visually-sensitive: look away.'
      ],
      lesson: 'Visual aversions with sensitivity require looking away as coping.'
    },
    {
      id: 'fn22_11',
      title: 'My disgust at tastes',
      narrative: [
        'Taste aversions.',
        '',
        'Pickiness valid.',
        '',
        'Honor preferences.',
        '',
        'I tell picky-eaters: valid.'
      ],
      lesson: 'Taste aversions and pickiness valid; honor preferences.'
    },
    {
      id: 'fn22_12',
      title: 'My disgust at situations',
      narrative: [
        'Situational disgust.',
        '',
        'Boundary signal.',
        '',
        'Avoidance honored.',
        '',
        'I tell situation-disgusted: avoid.'
      ],
      lesson: 'Situational disgust as boundary signal honors avoidance.'
    },
    {
      id: 'fn22_13',
      title: 'My disgust differentiated from preference',
      narrative: [
        'Disgust vs preference.',
        '',
        'Strong vs mild.',
        '',
        'Both valid.',
        '',
        'I tell rating-curious: differentiate.'
      ],
      lesson: 'Disgust vs preference as strong vs mild; both valid.'
    },
    {
      id: 'fn22_14',
      title: 'My disgust learned vs innate',
      narrative: [
        'Some disgust learned.',
        '',
        'Examined critically.',
        '',
        'Beliefs questioned.',
        '',
        'I tell learned-disgust: examine.'
      ],
      lesson: 'Some disgust is learned; examined critically with beliefs questioned.'
    },
    {
      id: 'fn22_15',
      title: 'My disgust integrated',
      narrative: [
        'Disgust integrated.',
        '',
        'Boundary signals honored.',
        '',
        'Self-knowledge built.',
        '',
        'I tell disgust-experienced: integration.'
      ],
      lesson: 'Disgust integrated as boundary signal honors build self-knowledge.'
    }
  ];

  var FEELING_NARRATIVES_23 = [
    {
      id: 'fn23_1',
      title: 'My contempt examined',
      narrative: [
        'Contempt examined.',
        '',
        'Why this person?',
        '',
        'Mirror reflection.',
        '',
        'I tell contemptuous: examine.'
      ],
      lesson: 'Contempt examined often reveals mirror reflection of self.'
    },
    {
      id: 'fn23_2',
      title: 'My contempt in marriage',
      narrative: [
        'Marriage contempt.',
        '',
        'Gottman warning.',
        '',
        'Therapy urgent.',
        '',
        'I tell contemptuous-marriage: urgent therapy.'
      ],
      lesson: 'Marriage contempt is Gottman warning needing urgent therapy.'
    },
    {
      id: 'fn23_3',
      title: 'My pride and shame line',
      narrative: [
        'Pride and shame edges.',
        '',
        'Pride healthy.',
        '',
        'Arrogance not.',
        '',
        'I tell pride-confused: differentiate.'
      ],
      lesson: 'Pride and shame edges; pride healthy and arrogance not.'
    },
    {
      id: 'fn23_4',
      title: 'My humility maintained',
      narrative: [
        'Humility maintained.',
        '',
        'Even with success.',
        '',
        'Beginners mind.',
        '',
        'I tell successful: humility.'
      ],
      lesson: 'Humility maintained even with success keeps beginners mind.'
    },
    {
      id: 'fn23_5',
      title: 'My gratitude expressed',
      narrative: [
        'Gratitude expressed daily.',
        '',
        'Thank yous frequent.',
        '',
        'Connection deepens.',
        '',
        'I tell ungrateful-feeling: express.'
      ],
      lesson: 'Daily gratitude expression with frequent thank yous deepens connection.'
    },
    {
      id: 'fn23_6',
      title: 'My appreciation given',
      narrative: [
        'Appreciation specific.',
        '',
        'What and why.',
        '',
        'Receiver lifted.',
        '',
        'I tell vague-praise: specific.'
      ],
      lesson: 'Appreciation specific with what and why lifts receiver.'
    },
    {
      id: 'fn23_7',
      title: 'My admiration shared',
      narrative: [
        'Admiration shared.',
        '',
        'Heroes acknowledged.',
        '',
        'Direction confirmed.',
        '',
        'I tell hero-stuck: share.'
      ],
      lesson: 'Admiration shared acknowledging heroes confirms direction.'
    },
    {
      id: 'fn23_8',
      title: 'My wonder cultivated',
      narrative: [
        'Wonder cultivated daily.',
        '',
        'Awe noticed.',
        '',
        'Beauty seen.',
        '',
        'I tell wonder-blind: cultivate.'
      ],
      lesson: 'Daily wonder cultivated through awe noticed and beauty seen.'
    },
    {
      id: 'fn23_9',
      title: 'My curiosity sustained',
      narrative: [
        'Curiosity sustained.',
        '',
        'Mind alive.',
        '',
        'Life rich.',
        '',
        'I tell stagnant: curiosity.'
      ],
      lesson: 'Curiosity sustained keeps mind alive and life rich.'
    },
    {
      id: 'fn23_10',
      title: 'My excitement claimed',
      narrative: [
        'Excitement claimed.',
        '',
        'Anticipation valued.',
        '',
        'Joy of waiting.',
        '',
        'I tell flat-feeling: anticipation.'
      ],
      lesson: 'Excitement claimed values anticipation as joy of waiting.'
    },
    {
      id: 'fn23_11',
      title: 'My hope cultivated',
      narrative: [
        'Hope cultivated.',
        '',
        'Even in dark.',
        '',
        'Future possible.',
        '',
        'I tell hopeless: cultivate.'
      ],
      lesson: 'Hope cultivated even in dark times sees future possible.'
    },
    {
      id: 'fn23_12',
      title: 'My satisfaction acknowledged',
      narrative: [
        'Satisfaction acknowledged.',
        '',
        'Work done well.',
        '',
        'Self-celebrated.',
        '',
        'I tell minimizer: acknowledge.'
      ],
      lesson: 'Satisfaction acknowledged for work done well self-celebrates.'
    },
    {
      id: 'fn23_13',
      title: 'My contentment recognized',
      narrative: [
        'Contentment recognized.',
        '',
        'Quiet positive.',
        '',
        'Foundation built.',
        '',
        'I tell excitement-chasing: contentment.'
      ],
      lesson: 'Contentment recognized as quiet positive foundation built.'
    },
    {
      id: 'fn23_14',
      title: 'My peace found',
      narrative: [
        'Peace found.',
        '',
        'Inner not outer.',
        '',
        'Practice cultivated.',
        '',
        'I tell peace-seeking: inner.'
      ],
      lesson: 'Peace found inner not outer through cultivated practice.'
    },
    {
      id: 'fn23_15',
      title: 'My all positive emotions valid',
      narrative: [
        'All positive emotions valid.',
        '',
        'Claim them.',
        '',
        'Honor them.',
        '',
        'I tell positive-shy: valid.'
      ],
      lesson: 'All positive emotions valid; claim and honor them.'
    }
  ];

  var FEELING_NARRATIVES_24 = [
    {
      id: 'fn24_1',
      title: 'My emotions complete daily map',
      narrative: [
        'Daily emotion map.',
        '',
        'All feelings noted.',
        '',
        'Patterns recognized.',
        '',
        'I tell tracking-curious: daily map.'
      ],
      lesson: 'Daily emotion map with all feelings noted recognizes patterns.'
    },
    {
      id: 'fn24_2',
      title: 'My emotions weekly review',
      narrative: [
        'Weekly emotion review.',
        '',
        'Patterns observed.',
        '',
        'Triggers tracked.',
        '',
        'I tell weekly-curious: review.'
      ],
      lesson: 'Weekly emotion review observes patterns and tracks triggers.'
    },
    {
      id: 'fn24_3',
      title: 'My emotions monthly themes',
      narrative: [
        'Monthly emotion themes.',
        '',
        'Larger patterns.',
        '',
        'Life direction.',
        '',
        'I tell systematic: monthly themes.'
      ],
      lesson: 'Monthly emotion themes show larger patterns and life direction.'
    },
    {
      id: 'fn24_4',
      title: 'My emotions yearly arcs',
      narrative: [
        'Yearly emotion arcs.',
        '',
        'Seasonal patterns.',
        '',
        'Anniversaries marked.',
        '',
        'I tell annual: arcs.'
      ],
      lesson: 'Yearly emotion arcs show seasonal patterns and marked anniversaries.'
    },
    {
      id: 'fn24_5',
      title: 'My emotions decade reflection',
      narrative: [
        'Decade emotion reflection.',
        '',
        'Major life themes.',
        '',
        'Wisdom emerges.',
        '',
        'I tell decade-marker: reflect.'
      ],
      lesson: 'Decade emotion reflection shows major life themes and emerging wisdom.'
    },
    {
      id: 'fn24_6',
      title: 'My emotions in body location',
      narrative: [
        'Body locations.',
        '',
        'Each emotion home.',
        '',
        'Sensory awareness.',
        '',
        'I tell body-curious: locations.'
      ],
      lesson: 'Body locations show each emotion home for sensory awareness.'
    },
    {
      id: 'fn24_7',
      title: 'My emotions in body sensations',
      narrative: [
        'Body sensations.',
        '',
        'Heat, cold, tightness.',
        '',
        'Information rich.',
        '',
        'I tell body-disconnected: sensations.'
      ],
      lesson: 'Body sensations of heat, cold, tightness provide rich information.'
    },
    {
      id: 'fn24_8',
      title: 'My emotions in body movement',
      narrative: [
        'Movement and emotion.',
        '',
        'Walking processes.',
        '',
        'Body knows.',
        '',
        'I tell body-disconnected: movement.'
      ],
      lesson: 'Movement and emotion connected; walking processes through body knowing.'
    },
    {
      id: 'fn24_9',
      title: 'My emotions in breath',
      narrative: [
        'Breath and emotion.',
        '',
        'Connected always.',
        '',
        'Breath shifts feeling.',
        '',
        'I tell scattered: breath.'
      ],
      lesson: 'Breath and emotion connected always; breath shifts feeling.'
    },
    {
      id: 'fn24_10',
      title: 'My emotions in heart rate',
      narrative: [
        'Heart rate variability.',
        '',
        'Emotion indicator.',
        '',
        'Coherence trained.',
        '',
        'I tell hrv-curious: coherence.'
      ],
      lesson: 'Heart rate variability indicates emotion; coherence trained through practice.'
    },
    {
      id: 'fn24_11',
      title: 'My emotions in posture',
      narrative: [
        'Posture and emotion.',
        '',
        'Affects each other.',
        '',
        'Strong posture confident.',
        '',
        'I tell posture-curious: emotion link.'
      ],
      lesson: 'Posture and emotion affect each other; strong posture builds confidence.'
    },
    {
      id: 'fn24_12',
      title: 'My emotions in facial expression',
      narrative: [
        'Facial expression and emotion.',
        '',
        'Two-way feedback.',
        '',
        'Smile lifts mood.',
        '',
        'I tell mood-stuck: facial.'
      ],
      lesson: 'Facial expression and emotion two-way feedback; smile lifts mood.'
    },
    {
      id: 'fn24_13',
      title: 'My emotions in voice tone',
      narrative: [
        'Voice tone emotion.',
        '',
        'Speakers heard.',
        '',
        'Tone shifts mood.',
        '',
        'I tell voice-curious: tone.'
      ],
      lesson: 'Voice tone emotion heard by speakers; tone shifts mood.'
    },
    {
      id: 'fn24_14',
      title: 'My emotions in eye contact',
      narrative: [
        'Eye contact connects.',
        '',
        'Or avoids.',
        '',
        'Connection signaled.',
        '',
        'I tell connection-curious: eye contact.'
      ],
      lesson: 'Eye contact connects or avoids signaling connection willingness.'
    },
    {
      id: 'fn24_15',
      title: 'My emotions in touch',
      narrative: [
        'Touch and emotion.',
        '',
        'Affection conveyed.',
        '',
        'Oxytocin released.',
        '',
        'I tell touch-curious: connection.'
      ],
      lesson: 'Touch and emotion connect through affection conveying and oxytocin release.'
    }
  ];

  var FEELING_NARRATIVES_25 = [
    {
      id: 'fn25_1',
      title: 'My emotional vocabulary expanded',
      narrative: [
        'Vocabulary expanded.',
        '',
        'Precision increased.',
        '',
        'Self-knowledge.',
        '',
        'I tell vocabulary-limited: expand.'
      ],
      lesson: 'Emotional vocabulary expanded increases precision and self-knowledge.'
    },
    {
      id: 'fn25_2',
      title: 'My emotional vocabulary specific',
      narrative: [
        'Specific words sought.',
        '',
        'Frustrated vs angry.',
        '',
        'Melancholy vs sad.',
        '',
        'I tell broad-feeling: specific.'
      ],
      lesson: 'Specific words like frustrated vs angry and melancholy vs sad seek precision.'
    },
    {
      id: 'fn25_3',
      title: 'My emotional vocabulary cultural',
      narrative: [
        'Cultural feelings.',
        '',
        'Saudade, schadenfreude.',
        '',
        'Other languages add.',
        '',
        'I tell vocabulary-curious: cultural.'
      ],
      lesson: 'Cultural feelings like saudade or schadenfreude from other languages add precision.'
    },
    {
      id: 'fn25_4',
      title: 'My emotional vocabulary metaphor',
      narrative: [
        'Metaphor for emotions.',
        '',
        'Like a wave.',
        '',
        'Like a storm.',
        '',
        'I tell verbal-stuck: metaphor.'
      ],
      lesson: 'Metaphor for emotions like wave or storm provides verbal expression.'
    },
    {
      id: 'fn25_5',
      title: 'My emotional vocabulary color',
      narrative: [
        'Color for emotions.',
        '',
        'Red angry, blue sad.',
        '',
        'Visual expression.',
        '',
        'I tell visual-feeling: color.'
      ],
      lesson: 'Color for emotions like red angry and blue sad provides visual expression.'
    },
    {
      id: 'fn25_6',
      title: 'My emotional vocabulary intensity',
      narrative: [
        'Intensity scale.',
        '',
        '1-10 measure.',
        '',
        'Awareness improved.',
        '',
        'I tell intensity-curious: scale.'
      ],
      lesson: 'Emotional intensity scale 1-10 measure improves awareness.'
    },
    {
      id: 'fn25_7',
      title: 'My emotional vocabulary duration',
      narrative: [
        'Duration noted.',
        '',
        'Brief or persistent.',
        '',
        'Pattern emerges.',
        '',
        'I tell duration-curious: track.'
      ],
      lesson: 'Emotional duration noted as brief or persistent reveals patterns.'
    },
    {
      id: 'fn25_8',
      title: 'My emotional vocabulary trigger',
      narrative: [
        'Trigger identified.',
        '',
        'What caused?',
        '',
        'Specific tracked.',
        '',
        'I tell trigger-curious: identify.'
      ],
      lesson: 'Trigger identified asks what caused with specific tracked.'
    },
    {
      id: 'fn25_9',
      title: 'My emotional vocabulary body location',
      narrative: [
        'Body location.',
        '',
        'Chest, stomach, head.',
        '',
        'Sensory information.',
        '',
        'I tell body-curious: locate.'
      ],
      lesson: 'Body location of emotion chest, stomach, head provides sensory information.'
    },
    {
      id: 'fn25_10',
      title: 'My emotional vocabulary action urge',
      narrative: [
        'Action urge noticed.',
        '',
        'What does it want?',
        '',
        'Choice considered.',
        '',
        'I tell impulsive: notice urge.'
      ],
      lesson: 'Action urge noticed asks what does it want with choice considered.'
    },
    {
      id: 'fn25_11',
      title: 'My emotional vocabulary need',
      narrative: [
        'Need underneath.',
        '',
        'What unmet?',
        '',
        'Address need.',
        '',
        'I tell stuck-feeling: need.'
      ],
      lesson: 'Need underneath asks what unmet and addresses need directly.'
    },
    {
      id: 'fn25_12',
      title: 'My emotional vocabulary primary',
      narrative: [
        'Primary emotion.',
        '',
        'Anger covers hurt.',
        '',
        'Layer beneath.',
        '',
        'I tell surface: primary.'
      ],
      lesson: 'Primary emotion underneath anger often covers hurt; layer beneath.'
    },
    {
      id: 'fn25_13',
      title: 'My emotional vocabulary secondary',
      narrative: [
        'Secondary emotion.',
        '',
        'Reaction to primary.',
        '',
        'Both real.',
        '',
        'I tell stacked-feeling: both.'
      ],
      lesson: 'Secondary emotion as reaction to primary; both real.'
    },
    {
      id: 'fn25_14',
      title: 'My emotional vocabulary mixed',
      narrative: [
        'Mixed emotions valid.',
        '',
        'Love plus fear.',
        '',
        'Joy plus sadness.',
        '',
        'I tell mixed-confused: valid.'
      ],
      lesson: 'Mixed emotions valid as love plus fear or joy plus sadness.'
    },
    {
      id: 'fn25_15',
      title: 'My emotional vocabulary integration',
      narrative: [
        'Vocabulary integrated.',
        '',
        'Years of practice.',
        '',
        'Self-knowledge deep.',
        '',
        'I tell beginners: vocabulary grows.'
      ],
      lesson: 'Emotional vocabulary integrated over years of practice builds deep self-knowledge.'
    }
  ];

  var FEELING_NARRATIVES_16 = [
    {
      id: 'fn16_1',
      title: 'My joy claimed daily',
      narrative: [
        'Daily joy claim.',
        '',
        'Specific moment.',
        '',
        'Named aloud.',
        '',
        'I tell joy-shy: claim it.'
      ],
      lesson: 'Daily joy claim with specific moment named aloud builds positive awareness.'
    },
    {
      id: 'fn16_2',
      title: 'My joy savored',
      narrative: [
        'Savor good moments.',
        '',
        'Hold attention.',
        '',
        'Amplify experience.',
        '',
        'I tell rushed: savor.'
      ],
      lesson: 'Joy savored with held attention amplifies positive experience.'
    },
    {
      id: 'fn16_3',
      title: 'My joy shared with partner',
      narrative: [
        'Share joys with partner.',
        '',
        'Mutual amplification.',
        '',
        'Connection grows.',
        '',
        'I tell partnered: share joy.'
      ],
      lesson: 'Joy shared with partner amplifies mutually growing connection.'
    },
    {
      id: 'fn16_4',
      title: 'My joy shared with friends',
      narrative: [
        'Friend joy sharing.',
        '',
        'Good news celebrated.',
        '',
        'Active joining.',
        '',
        'I tell friends: celebrate together.'
      ],
      lesson: 'Friend joy sharing through celebrated good news with active joining.'
    },
    {
      id: 'fn16_5',
      title: 'My joy with my children',
      narrative: [
        'Childrens joy infectious.',
        '',
        'Join their delight.',
        '',
        'Connection deepens.',
        '',
        'I tell parents: join their joy.'
      ],
      lesson: 'Childrens joy infectious; joining their delight deepens parent-child connection.'
    },
    {
      id: 'fn16_6',
      title: 'My joy in small moments',
      narrative: [
        'Small joys daily.',
        '',
        'Coffee, sunlight, bird.',
        '',
        'Awareness trained.',
        '',
        'I tell joy-blind: small moments.'
      ],
      lesson: 'Small daily joys like coffee, sunlight, bird train positive awareness.'
    },
    {
      id: 'fn16_7',
      title: 'My joy in accomplishment',
      narrative: [
        'Accomplishment savored.',
        '',
        'Not minimized.',
        '',
        'Self-acknowledged.',
        '',
        'I tell minimizers: savor.'
      ],
      lesson: 'Accomplishment savored not minimized through self-acknowledgment.'
    },
    {
      id: 'fn16_8',
      title: 'My joy in nature',
      narrative: [
        'Nature joys.',
        '',
        'Sunrise, sunset, trees.',
        '',
        'Daily wonder.',
        '',
        'I tell nature-blind: daily wonder.'
      ],
      lesson: 'Nature joys sunrise, sunset, trees provide daily wonder.'
    },
    {
      id: 'fn16_9',
      title: 'My joy in music',
      narrative: [
        'Music brings joy.',
        '',
        'Daily playing or listening.',
        '',
        'Body responds.',
        '',
        'I tell music-curious: daily.'
      ],
      lesson: 'Daily music brings joy with body responding.'
    },
    {
      id: 'fn16_10',
      title: 'My joy in dance',
      narrative: [
        'Dance brings joy.',
        '',
        'Body free.',
        '',
        'Inhibition released.',
        '',
        'I tell self-conscious: dance.'
      ],
      lesson: 'Dance brings joy with body free and inhibition released.'
    },
    {
      id: 'fn16_11',
      title: 'My joy in cooking',
      narrative: [
        'Cooking joy.',
        '',
        'Hands engaged.',
        '',
        'Beautiful food.',
        '',
        'I tell food-curious: cooking joy.'
      ],
      lesson: 'Cooking joy with hands engaged produces beautiful food.'
    },
    {
      id: 'fn16_12',
      title: 'My joy in eating',
      narrative: [
        'Eating joy.',
        '',
        'Slow tasting.',
        '',
        'Senses engaged.',
        '',
        'I tell rushed-eater: slow joy.'
      ],
      lesson: 'Eating joy through slow tasting engages all senses.'
    },
    {
      id: 'fn16_13',
      title: 'My joy in reading',
      narrative: [
        'Reading joy.',
        '',
        'Other worlds.',
        '',
        'Mind absorbed.',
        '',
        'I tell readers: daily reading joy.'
      ],
      lesson: 'Reading joy through other worlds absorbs mind.'
    },
    {
      id: 'fn16_14',
      title: 'My joy in play',
      narrative: [
        'Play joy adult.',
        '',
        'No purpose.',
        '',
        'Inner child plays.',
        '',
        'I tell serious-adults: play.'
      ],
      lesson: 'Adult play joy without purpose lets inner child play.'
    },
    {
      id: 'fn16_15',
      title: 'My joy in creating',
      narrative: [
        'Creating joy.',
        '',
        'Making something.',
        '',
        'Birth of beauty.',
        '',
        'I tell creators: making joy.'
      ],
      lesson: 'Creating joy through making something is birth of beauty.'
    }
  ];

  var FEELING_NARRATIVES_17 = [
    {
      id: 'fn17_1',
      title: 'My anxiety acknowledged',
      narrative: [
        'Anxiety acknowledged.',
        '',
        'Not pushed down.',
        '',
        'Body signal.',
        '',
        'I tell anxiety-fighting: acknowledge.'
      ],
      lesson: 'Anxiety acknowledged not pushed down recognizes body signal.'
    },
    {
      id: 'fn17_2',
      title: 'My anxiety differentiated from facts',
      narrative: [
        'Anxiety not fact.',
        '',
        'Feeling not truth.',
        '',
        'Examine claim.',
        '',
        'I tell anxiety-believing: examine.'
      ],
      lesson: 'Anxiety not fact but feeling not truth; examine the claim.'
    },
    {
      id: 'fn17_3',
      title: 'My anxiety body work',
      narrative: [
        'Body anxiety work.',
        '',
        'Where do I feel?',
        '',
        'Body responds.',
        '',
        'I tell body-disconnected: body work.'
      ],
      lesson: 'Body anxiety work asks where felt and lets body respond.'
    },
    {
      id: 'fn17_4',
      title: 'My anxiety breath work',
      narrative: [
        '4-7-8 breath.',
        '',
        'Always available.',
        '',
        'Anxiety calmed.',
        '',
        'I tell anxious: 4-7-8.'
      ],
      lesson: '4-7-8 breath always available calms anxiety.'
    },
    {
      id: 'fn17_5',
      title: 'My anxiety grounding',
      narrative: [
        '5-4-3-2-1 grounding.',
        '',
        'Senses anchor.',
        '',
        'Present moment.',
        '',
        'I tell anxious-future: grounding.'
      ],
      lesson: '5-4-3-2-1 grounding through senses anchors present moment.'
    },
    {
      id: 'fn17_6',
      title: 'My anxiety thought work',
      narrative: [
        'Catastrophic thoughts caught.',
        '',
        'Examined for evidence.',
        '',
        'Reframed reality.',
        '',
        'I tell catastrophizing: examine.'
      ],
      lesson: 'Catastrophic thoughts caught and examined for evidence reframe reality.'
    },
    {
      id: 'fn17_7',
      title: 'My anxiety with worry park',
      narrative: [
        'Worry parked in notebook.',
        '',
        'Tomorrow worry.',
        '',
        'Sleep enabled.',
        '',
        'I tell nighttime-anxious: park.'
      ],
      lesson: 'Worry parked in notebook for tomorrow enables sleep tonight.'
    },
    {
      id: 'fn17_8',
      title: 'My anxiety scheduled worry',
      narrative: [
        'Scheduled worry time.',
        '',
        '15 min daily.',
        '',
        'Rest of day off limits.',
        '',
        'I tell ruminating: scheduled.'
      ],
      lesson: 'Scheduled worry time 15 min daily keeps rest of day off limits.'
    },
    {
      id: 'fn17_9',
      title: 'My anxiety exercise',
      narrative: [
        'Exercise reduces anxiety.',
        '',
        'Daily cardio.',
        '',
        'Body processes.',
        '',
        'I tell anxious: daily exercise.'
      ],
      lesson: 'Daily exercise reduces anxiety through body processing.'
    },
    {
      id: 'fn17_10',
      title: 'My anxiety sleep',
      narrative: [
        'Sleep reduces anxiety.',
        '',
        'Protect bedtime.',
        '',
        '9 hours nightly.',
        '',
        'I tell anxious: protect sleep.'
      ],
      lesson: 'Sleep reduces anxiety through 9 hours nightly with protected bedtime.'
    },
    {
      id: 'fn17_11',
      title: 'My anxiety nutrition',
      narrative: [
        'Nutrition affects anxiety.',
        '',
        'Reduced caffeine.',
        '',
        'Stable blood sugar.',
        '',
        'I tell anxious: nutrition matters.'
      ],
      lesson: 'Nutrition affects anxiety; reduced caffeine and stable blood sugar matter.'
    },
    {
      id: 'fn17_12',
      title: 'My anxiety community',
      narrative: [
        'Anxiety community.',
        '',
        'Not alone.',
        '',
        'Shared experience.',
        '',
        'I tell isolated-anxious: community.'
      ],
      lesson: 'Anxiety community shared experience reveals not alone.'
    },
    {
      id: 'fn17_13',
      title: 'My anxiety therapy',
      narrative: [
        'CBT therapy.',
        '',
        'Tools learned.',
        '',
        'Anxiety manageable.',
        '',
        'I tell anxious: CBT works.'
      ],
      lesson: 'CBT therapy teaches tools making anxiety manageable.'
    },
    {
      id: 'fn17_14',
      title: 'My anxiety medication',
      narrative: [
        'SSRI medication.',
        '',
        'When therapy not enough.',
        '',
        'Bucket lighter.',
        '',
        'I tell severe-anxious: medication.'
      ],
      lesson: 'SSRI medication when therapy not enough makes anxiety bucket lighter.'
    },
    {
      id: 'fn17_15',
      title: 'My anxiety integrated',
      narrative: [
        'Anxiety integrated.',
        '',
        'Years of work.',
        '',
        'Part of me.',
        '',
        'I tell long-anxious: integration.'
      ],
      lesson: 'Anxiety integrated over years becomes part of me.'
    }
  ];

  var FEELING_NARRATIVES_18 = [
    {
      id: 'fn18_1',
      title: 'My loneliness named',
      narrative: [
        'Loneliness named.',
        '',
        'Not weakness.',
        '',
        'Signal of need.',
        '',
        'I tell ashamed-lonely: signal.'
      ],
      lesson: 'Loneliness named is signal of need not weakness.'
    },
    {
      id: 'fn18_2',
      title: 'My loneliness reached out',
      narrative: [
        'Reached out lonely.',
        '',
        'Old friend called.',
        '',
        'Connection restored.',
        '',
        'I tell isolated: reach out.'
      ],
      lesson: 'Reached out when lonely restoring connection through old friend.'
    },
    {
      id: 'fn18_3',
      title: 'My loneliness new community',
      narrative: [
        'Joined new community.',
        '',
        'Slow connection building.',
        '',
        'Roots growing.',
        '',
        'I tell isolated: new community.'
      ],
      lesson: 'New community joined builds slow connection growing roots.'
    },
    {
      id: 'fn18_4',
      title: 'My loneliness with pet',
      narrative: [
        'Pet adopted.',
        '',
        'Presence companions.',
        '',
        'Touch and care.',
        '',
        'I tell isolated: pet adoption.'
      ],
      lesson: 'Pet adoption provides presence and touch and care companions loneliness.'
    },
    {
      id: 'fn18_5',
      title: 'My loneliness in marriage',
      narrative: [
        'Lonely in marriage.',
        '',
        'Couples therapy.',
        '',
        'Connection rebuilt.',
        '',
        'I tell married-lonely: therapy.'
      ],
      lesson: 'Lonely in marriage treated through couples therapy rebuilds connection.'
    },
    {
      id: 'fn18_6',
      title: 'My loneliness in crowd',
      narrative: [
        'Lonely in crowds.',
        '',
        'Quality not quantity.',
        '',
        'Deep one-on-one.',
        '',
        'I tell crowd-lonely: quality.'
      ],
      lesson: 'Lonely in crowds needs quality not quantity through deep one-on-one.'
    },
    {
      id: 'fn18_7',
      title: 'My loneliness after move',
      narrative: [
        'Moved cross-country.',
        '',
        'Lonely first year.',
        '',
        'Slow community building.',
        '',
        'I tell relocators: slow building.'
      ],
      lesson: 'Loneliness after move requires slow community building over first year.'
    },
    {
      id: 'fn18_8',
      title: 'My loneliness in retirement',
      narrative: [
        'Retirement lonely.',
        '',
        'Senior center joined.',
        '',
        'Daily community.',
        '',
        'I tell retired-lonely: senior center.'
      ],
      lesson: 'Retirement loneliness eased by senior center joining for daily community.'
    },
    {
      id: 'fn18_9',
      title: 'My loneliness empty nest',
      narrative: [
        'Empty nest lonely.',
        '',
        'New hobbies.',
        '',
        'New community.',
        '',
        'I tell empty-nesters: new community.'
      ],
      lesson: 'Empty nest loneliness eased by new hobbies and community building.'
    },
    {
      id: 'fn18_10',
      title: 'My loneliness in chronic illness',
      narrative: [
        'Illness isolates.',
        '',
        'Online disease community.',
        '',
        'Others same.',
        '',
        'I tell illness-isolated: online.'
      ],
      lesson: 'Chronic illness isolates; online disease community shares experience.'
    },
    {
      id: 'fn18_11',
      title: 'My loneliness as disabled',
      narrative: [
        'Disability isolates.',
        '',
        'Disability community.',
        '',
        'Accessibility advocacy.',
        '',
        'I tell disabled-isolated: community.'
      ],
      lesson: 'Disability isolates; disability community provides advocacy connection.'
    },
    {
      id: 'fn18_12',
      title: 'My loneliness as minority',
      narrative: [
        'Minority isolation.',
        '',
        'Affinity community.',
        '',
        'Shared experience.',
        '',
        'I tell minority-isolated: affinity.'
      ],
      lesson: 'Minority isolation eased by affinity community shared experience.'
    },
    {
      id: 'fn18_13',
      title: 'My loneliness as introvert',
      narrative: [
        'Introvert lonely sometimes.',
        '',
        'Quality connections few.',
        '',
        'Deep practice.',
        '',
        'I tell introverts: deep over wide.'
      ],
      lesson: 'Introvert loneliness eased by few quality connections deep practice.'
    },
    {
      id: 'fn18_14',
      title: 'My loneliness as caregiver',
      narrative: [
        'Caregiver isolated.',
        '',
        'Caregiver support group.',
        '',
        'Others same situation.',
        '',
        'I tell caregivers: groups.'
      ],
      lesson: 'Caregiver isolation eased by caregiver support groups same situation.'
    },
    {
      id: 'fn18_15',
      title: 'My loneliness integrated',
      narrative: [
        'Solitude versus loneliness.',
        '',
        'Solitude chosen.',
        '',
        'Loneliness signaled.',
        '',
        'I tell alone-stigmatized: differentiate.'
      ],
      lesson: 'Solitude versus loneliness differentiated; solitude chosen and loneliness signaled.'
    }
  ];

  var FEELING_NARRATIVES_19 = [
    {
      id: 'fn19_1',
      title: 'My disappointment honored',
      narrative: [
        'Disappointment honored.',
        '',
        'Reality vs expectation.',
        '',
        'Adjust expectation.',
        '',
        'I tell disappointed: honor.'
      ],
      lesson: 'Disappointment honored as reality vs expectation gap requiring adjustment.'
    },
    {
      id: 'fn19_2',
      title: 'My disappointment after failed plan',
      narrative: [
        'Plan failed.',
        '',
        'Disappointment real.',
        '',
        'Adjust and continue.',
        '',
        'I tell plan-failers: adjust.'
      ],
      lesson: 'Failed plan disappointment real but adjust and continue moving forward.'
    },
    {
      id: 'fn19_3',
      title: 'My disappointment in relationships',
      narrative: [
        'Relationship disappointment.',
        '',
        'Communicated honestly.',
        '',
        'Pattern addressed.',
        '',
        'I tell relationship-disappointed: communicate.'
      ],
      lesson: 'Relationship disappointment communicated honestly addresses pattern.'
    },
    {
      id: 'fn19_4',
      title: 'My disappointment in work',
      narrative: [
        'Work disappointment.',
        '',
        'Expectations examined.',
        '',
        'Path adjusted.',
        '',
        'I tell work-disappointed: examine.'
      ],
      lesson: 'Work disappointment examines expectations and adjusts path.'
    },
    {
      id: 'fn19_5',
      title: 'My disappointment in self',
      narrative: [
        'Self-disappointment.',
        '',
        'Self-compassion replied.',
        '',
        'Learning identified.',
        '',
        'I tell self-disappointed: compassion.'
      ],
      lesson: 'Self-disappointment met with self-compassion identifies learning.'
    },
    {
      id: 'fn19_6',
      title: 'My disappointment in others',
      narrative: [
        'Others disappointment.',
        '',
        'Their humanity.',
        '',
        'Boundaries adjusted.',
        '',
        'I tell others-disappointed: boundaries.'
      ],
      lesson: 'Disappointment in others recognizes their humanity and adjusts boundaries.'
    },
    {
      id: 'fn19_7',
      title: 'My disappointment in system',
      narrative: [
        'System disappointment.',
        '',
        'Advocacy emerges.',
        '',
        'Change worked for.',
        '',
        'I tell system-disappointed: advocate.'
      ],
      lesson: 'System disappointment yields advocacy emerging for change work.'
    },
    {
      id: 'fn19_8',
      title: 'My disappointment in life',
      narrative: [
        'Life disappointment.',
        '',
        'Expectations re-examined.',
        '',
        'New meaning emerges.',
        '',
        'I tell life-disappointed: re-examine.'
      ],
      lesson: 'Life disappointment re-examines expectations as new meaning emerges.'
    },
    {
      id: 'fn19_9',
      title: 'My disappointment in family',
      narrative: [
        'Family disappointment.',
        '',
        'Acceptance work.',
        '',
        'Boundaries set.',
        '',
        'I tell family-disappointed: acceptance.'
      ],
      lesson: 'Family disappointment requires acceptance work with boundaries set.'
    },
    {
      id: 'fn19_10',
      title: 'My disappointment in parents',
      narrative: [
        'Parents disappointment.',
        '',
        'Limited differentiation.',
        '',
        'Self-parenting.',
        '',
        'I tell parents-disappointed: self-parent.'
      ],
      lesson: 'Parents disappointment with limited differentiation requires self-parenting.'
    },
    {
      id: 'fn19_11',
      title: 'My disappointment in friendships',
      narrative: [
        'Friendship disappointment.',
        '',
        'Boundaries adjusted.',
        '',
        'Quality over quantity.',
        '',
        'I tell friend-disappointed: quality.'
      ],
      lesson: 'Friendship disappointment adjusts boundaries seeking quality over quantity.'
    },
    {
      id: 'fn19_12',
      title: 'My disappointment in marriage',
      narrative: [
        'Marriage disappointment.',
        '',
        'Couples therapy.',
        '',
        'Patterns addressed.',
        '',
        'I tell married-disappointed: therapy.'
      ],
      lesson: 'Marriage disappointment treated through couples therapy patterns addressed.'
    },
    {
      id: 'fn19_13',
      title: 'My disappointment in body',
      narrative: [
        'Body disappointment.',
        '',
        'Aging or illness.',
        '',
        'Body neutrality.',
        '',
        'I tell body-disappointed: neutrality.'
      ],
      lesson: 'Body disappointment in aging or illness eased by body neutrality.'
    },
    {
      id: 'fn19_14',
      title: 'My disappointment in choices',
      narrative: [
        'Choice disappointment.',
        '',
        'Learning identified.',
        '',
        'Future informed.',
        '',
        'I tell choice-disappointed: learning.'
      ],
      lesson: 'Choice disappointment identifies learning informing future decisions.'
    },
    {
      id: 'fn19_15',
      title: 'My disappointment integrated',
      narrative: [
        'Disappointment integrated.',
        '',
        'Reality accepted.',
        '',
        'Wisdom gained.',
        '',
        'I tell repeated-disappointed: integration.'
      ],
      lesson: 'Disappointment integrated with reality accepted gains wisdom.'
    }
  ];

  var FEELING_NARRATIVES_20 = [
    {
      id: 'fn20_1',
      title: 'My jealousy named',
      narrative: [
        'Jealousy named.',
        '',
        'Unmet need under.',
        '',
        'Address need.',
        '',
        'I tell jealous-stuck: name need.'
      ],
      lesson: 'Jealousy named reveals unmet need underneath that should be addressed.'
    },
    {
      id: 'fn20_2',
      title: 'My jealousy in marriage',
      narrative: [
        'Marriage jealousy.',
        '',
        'Trust work.',
        '',
        'Couples therapy.',
        '',
        'I tell jealous-spouse: therapy.'
      ],
      lesson: 'Marriage jealousy treated through couples therapy trust work.'
    },
    {
      id: 'fn20_3',
      title: 'My jealousy in friendship',
      narrative: [
        'Friend jealousy.',
        '',
        'Conversation honest.',
        '',
        'Pattern addressed.',
        '',
        'I tell jealous-friend: conversation.'
      ],
      lesson: 'Friend jealousy addressed through honest conversation pattern.'
    },
    {
      id: 'fn20_4',
      title: 'My jealousy in workplace',
      narrative: [
        'Work jealousy.',
        '',
        'Examine own goals.',
        '',
        'Channel to action.',
        '',
        'I tell work-jealous: action.'
      ],
      lesson: 'Workplace jealousy examines own goals channeling to action.'
    },
    {
      id: 'fn20_5',
      title: 'My envy as direction',
      narrative: [
        'Envy as direction.',
        '',
        'What I want.',
        '',
        'Information gained.',
        '',
        'I tell envy-stuck: direction.'
      ],
      lesson: 'Envy as direction information about what I want.'
    },
    {
      id: 'fn20_6',
      title: 'My envy in social media',
      narrative: [
        'Social media envy.',
        '',
        'Highlight reels.',
        '',
        'Limit usage.',
        '',
        'I tell platform-envy: limit.'
      ],
      lesson: 'Social media envy from highlight reels eased by usage limits.'
    },
    {
      id: 'fn20_7',
      title: 'My envy at peers',
      narrative: [
        'Peer envy.',
        '',
        'Different paths.',
        '',
        'Own journey honored.',
        '',
        'I tell peer-envious: own path.'
      ],
      lesson: 'Peer envy recognizes different paths and honors own journey.'
    },
    {
      id: 'fn20_8',
      title: 'My envy at family',
      narrative: [
        'Family envy.',
        '',
        'Comparison toxic.',
        '',
        'Differentiation work.',
        '',
        'I tell family-envy: differentiation.'
      ],
      lesson: 'Family envy from toxic comparison needs differentiation work.'
    },
    {
      id: 'fn20_9',
      title: 'My envy from scarcity',
      narrative: [
        'Scarcity mindset envy.',
        '',
        'Abundance reframe.',
        '',
        'Enough for all.',
        '',
        'I tell scarcity-stuck: abundance.'
      ],
      lesson: 'Scarcity mindset envy eased by abundance reframe enough for all.'
    },
    {
      id: 'fn20_10',
      title: 'My envy from comparison',
      narrative: [
        'Comparison thief of joy.',
        '',
        'Own life examined.',
        '',
        'Gratitude practiced.',
        '',
        'I tell comparison-stuck: gratitude.'
      ],
      lesson: 'Comparison as thief of joy eased by examining own life with gratitude.'
    },
    {
      id: 'fn20_11',
      title: 'My envy honored as signal',
      narrative: [
        'Envy as signal.',
        '',
        'Pay attention.',
        '',
        'Direction provided.',
        '',
        'I tell envy-shamed: signal.'
      ],
      lesson: 'Envy honored as signal provides direction worth attention.'
    },
    {
      id: 'fn20_12',
      title: 'My envy converted to action',
      narrative: [
        'Envy converted action.',
        '',
        'What I want.',
        '',
        'Path created.',
        '',
        'I tell stuck-envy: convert action.'
      ],
      lesson: 'Envy converted to action creates path toward what I want.'
    },
    {
      id: 'fn20_13',
      title: 'My envy and gratitude practice',
      narrative: [
        'Gratitude counters envy.',
        '',
        'What I have.',
        '',
        'Brain trained.',
        '',
        'I tell envious: gratitude practice.'
      ],
      lesson: 'Gratitude practice counters envy through training brain on what I have.'
    },
    {
      id: 'fn20_14',
      title: 'My envy in therapy',
      narrative: [
        'Envy in therapy.',
        '',
        'Roots explored.',
        '',
        'Self-acceptance built.',
        '',
        'I tell envy-stuck: therapy.'
      ],
      lesson: 'Envy in therapy explores roots and builds self-acceptance.'
    },
    {
      id: 'fn20_15',
      title: 'My envy integrated',
      narrative: [
        'Envy integrated.',
        '',
        'Information accepted.',
        '',
        'Action taken.',
        '',
        'I tell envy-experienced: integration.'
      ],
      lesson: 'Envy integrated as information accepted and action taken.'
    }
  ];

  var FEELING_NARRATIVES_11 = [
    {
      id: 'fn11_1',
      title: 'My anger and my children',
      narrative: [
        'Yelled at my kids.',
        '',
        'Apologized after.',
        '',
        'Parent anger therapy.',
        '',
        'Triggers identified.',
        '',
        'Tools developed.',
        '',
        'Calmer now.',
        '',
        'I tell yelling-parents: therapy.'
      ],
      lesson: 'Parent anger therapy identifies triggers and develops tools; calmer parenting possible.'
    },
    {
      id: 'fn11_2',
      title: 'My anger and apologies',
      narrative: [
        'Apologize after anger.',
        '',
        'Even to children.',
        '',
        'Model accountability.',
        '',
        'Children learn.',
        '',
        'I tell shame-stuck-parents: apologize.'
      ],
      lesson: 'Apologizing to children after anger models accountability; children learn from repair.'
    },
    {
      id: 'fn11_3',
      title: 'My anger and triggers from work',
      narrative: [
        'Work stress at home.',
        '',
        'Transition ritual.',
        '',
        'Decompress in car.',
        '',
        'Home calmer.',
        '',
        'I tell work-bleeding: transition ritual.'
      ],
      lesson: 'Work-to-home transition rituals like car decompression prevent work anger at home.'
    },
    {
      id: 'fn11_4',
      title: 'My anger and lack of sleep',
      narrative: [
        'Less sleep, more anger.',
        '',
        'Pattern clear.',
        '',
        'Protect sleep.',
        '',
        'I tell sleep-deprived: protect.'
      ],
      lesson: 'Less sleep amplifies anger; protect sleep schedule rigorously.'
    },
    {
      id: 'fn11_5',
      title: 'My anger and hunger',
      narrative: [
        'Hangry real.',
        '',
        'Snack readily available.',
        '',
        'Blood sugar steady.',
        '',
        'I tell hangry: snacks ready.'
      ],
      lesson: 'Hangry is real; ready snacks keep blood sugar steady preventing anger spikes.'
    },
    {
      id: 'fn11_6',
      title: 'My anger and dehydration',
      narrative: [
        'Water bottle always.',
        '',
        'Sip throughout.',
        '',
        'Anger less.',
        '',
        'I tell dehydrated: water always.'
      ],
      lesson: 'Always-present water bottle with sipping throughout reduces dehydration-anger link.'
    },
    {
      id: 'fn11_7',
      title: 'My anger and overstimulation',
      narrative: [
        'Sensory overstimulation.',
        '',
        'Anger surfaces.',
        '',
        'Quiet space sought.',
        '',
        'I tell sensory-sensitive: quiet space.'
      ],
      lesson: 'Sensory overstimulation surfaces anger; quiet space sought as antidote.'
    },
    {
      id: 'fn11_8',
      title: 'My anger and noise',
      ranks: [],
      narrative: [
        'Noise triggers me.',
        '',
        'Noise-canceling headphones.',
        '',
        'Anger reduced.',
        '',
        'I tell noise-stressed: cancellation.'
      ],
      lesson: 'Noise triggers anger; noise-canceling headphones reduce trigger inflow.'
    },
    {
      id: 'fn11_9',
      title: 'My anger and crowds',
      narrative: [
        'Crowds trigger anger.',
        '',
        'Avoid when possible.',
        '',
        'Strategy when not.',
        '',
        'I tell crowd-stressed: avoid or strategy.'
      ],
      lesson: 'Crowd-triggered anger eased by avoidance or planned strategy.'
    },
    {
      id: 'fn11_10',
      title: 'My anger and traffic',
      narrative: [
        'Traffic triggers anger.',
        '',
        'Audiobook plus podcasts.',
        '',
        'Mind absorbed.',
        '',
        'I tell traffic-angry: audio absorb.'
      ],
      lesson: 'Traffic-triggered anger eased by audiobook and podcast mind absorption.'
    },
    {
      id: 'fn11_11',
      title: 'My anger and politics',
      narrative: [
        'Political news anger.',
        '',
        'Limit news intake.',
        '',
        'Channel to action.',
        '',
        'I tell politically-angry: limit and act.'
      ],
      lesson: 'Political news anger eases with limited intake and channeled action.'
    },
    {
      id: 'fn11_12',
      title: 'My anger and online comments',
      narrative: [
        'Online comments anger.',
        '',
        'Limit reading.',
        '',
        'Block trolls.',
        '',
        'I tell comment-angry: block and limit.'
      ],
      lesson: 'Online comments anger reduced by limited reading and troll blocking.'
    },
    {
      id: 'fn11_13',
      title: 'My anger and family conflicts',
      narrative: [
        'Family conflict anger.',
        '',
        'Pre-event prep.',
        '',
        'Exit plan ready.',
        '',
        'I tell family-stressed: prep and exit.'
      ],
      lesson: 'Family conflict anger eased by pre-event prep with exit plan ready.'
    },
    {
      id: 'fn11_14',
      title: 'My anger and holiday triggers',
      narrative: [
        'Holiday family anger.',
        '',
        'Therapy before season.',
        '',
        'Boundaries plan.',
        '',
        'I tell holiday-stressed: pre-season therapy.'
      ],
      lesson: 'Holiday family anger reduced by pre-season therapy and boundary planning.'
    },
    {
      id: 'fn11_15',
      title: 'My anger and online dating',
      narrative: [
        'Online dating frustration.',
        '',
        'Limit time.',
        '',
        'Break frequently.',
        '',
        'I tell dating-angry: limit time.'
      ],
      lesson: 'Online dating frustration eased by limited time and frequent breaks.'
    }
  ];

  var FEELING_NARRATIVES_12 = [
    {
      id: 'fn12_1',
      title: 'My anger after divorce',
      narrative: [
        'Divorce anger lingers.',
        '',
        'Years of work.',
        '',
        'Forgiveness slow.',
        '',
        'I tell divorced: years.'
      ],
      lesson: 'Divorce anger lingers years; forgiveness work slow but possible.'
    },
    {
      id: 'fn12_2',
      title: 'My anger after betrayal',
      narrative: [
        'Betrayal anger deep.',
        '',
        'Trauma therapy needed.',
        '',
        'Trust rebuilding slow.',
        '',
        'I tell betrayed: trauma therapy.'
      ],
      lesson: 'Betrayal anger deep requires trauma therapy with slow trust rebuilding.'
    },
    {
      id: 'fn12_3',
      title: 'My anger after layoff',
      narrative: [
        'Layoff anger valid.',
        '',
        'Channel to job search.',
        '',
        'Plus therapy.',
        '',
        'I tell laid-off: dual approach.'
      ],
      lesson: 'Layoff anger valid; channel to job search plus therapy dual approach.'
    },
    {
      id: 'fn12_4',
      title: 'My anger after injustice',
      narrative: [
        'Injustice anger valid.',
        '',
        'Channel to advocacy.',
        '',
        'Sustainable activism.',
        '',
        'I tell injustice-angry: advocacy.'
      ],
      lesson: 'Injustice anger valid; channel to sustainable advocacy activism.'
    },
    {
      id: 'fn12_5',
      title: 'My anger after assault',
      narrative: [
        'Assault anger.',
        '',
        'Trauma therapy.',
        '',
        'Years of healing.',
        '',
        'I tell survivors: years.'
      ],
      lesson: 'Assault anger requires trauma therapy with years of healing.'
    },
    {
      id: 'fn12_6',
      title: 'My anger after medical neglect',
      narrative: [
        'Medical neglect anger.',
        '',
        'Validation sought.',
        '',
        'Advocacy for self.',
        '',
        'I tell medically-failed: advocate.'
      ],
      lesson: 'Medical neglect anger sought validation through self-advocacy.'
    },
    {
      id: 'fn12_7',
      title: 'My anger after family secrets',
      narrative: [
        'Family secrets revealed.',
        '',
        'Anger at hidden.',
        '',
        'Therapy on truth.',
        '',
        'I tell secret-finders: therapy.'
      ],
      lesson: 'Family secrets revealed anger at hidden truth needs therapy work.'
    },
    {
      id: 'fn12_8',
      title: 'My anger after parental loss',
      narrative: [
        'Parents death anger.',
        '',
        'At them, at fate.',
        '',
        'Grief therapy.',
        '',
        'I tell grieving-angry: grief therapy.'
      ],
      lesson: 'Parents death anger at them and at fate requires grief therapy.'
    },
    {
      id: 'fn12_9',
      title: 'My anger after chronic illness diagnosis',
      narrative: [
        'Chronic illness anger.',
        '',
        'At body, at fate.',
        '',
        'Adjustment therapy.',
        '',
        'I tell chronically-diagnosed: therapy.'
      ],
      lesson: 'Chronic illness diagnosis anger at body and fate needs adjustment therapy.'
    },
    {
      id: 'fn12_10',
      title: 'My anger after disability acquired',
      narrative: [
        'Disability anger valid.',
        '',
        'Loss of function.',
        '',
        'New identity work.',
        '',
        'I tell newly-disabled: identity work.'
      ],
      lesson: 'Acquired disability anger valid through function loss requires new identity work.'
    },
    {
      id: 'fn12_11',
      title: 'My anger after pregnancy loss',
      narrative: [
        'Miscarriage anger.',
        '',
        'At body, at universe.',
        '',
        'Pregnancy loss therapy.',
        '',
        'I tell miscarriage: specialty.'
      ],
      lesson: 'Miscarriage anger at body and universe requires specialty pregnancy loss therapy.'
    },
    {
      id: 'fn12_12',
      title: 'My anger after infertility',
      narrative: [
        'Infertility anger chronic.',
        '',
        'Reproductive psychology.',
        '',
        'Decision support.',
        '',
        'I tell infertility-stressed: specialty.'
      ],
      lesson: 'Infertility chronic anger needs reproductive psychology with decision support.'
    },
    {
      id: 'fn12_13',
      title: 'My anger after relationship breakup',
      narrative: [
        'Breakup anger.',
        '',
        'Identity rebuilding.',
        '',
        'Time and therapy.',
        '',
        'I tell broken-up: time plus therapy.'
      ],
      lesson: 'Breakup anger needs identity rebuilding through time and therapy.'
    },
    {
      id: 'fn12_14',
      title: 'My anger after friendship loss',
      narrative: [
        'Friendship loss anger.',
        '',
        'Real grief.',
        '',
        'Mourning needed.',
        '',
        'I tell friend-lost: mourn.'
      ],
      lesson: 'Friendship loss anger is real grief requiring mourning.'
    },
    {
      id: 'fn12_15',
      title: 'My anger after community loss',
      narrative: [
        'Community lost anger.',
        '',
        'Belonging gone.',
        '',
        'New community sought.',
        '',
        'I tell displaced: new community.'
      ],
      lesson: 'Community loss anger from belonging gone needs new community building.'
    }
  ];

  var FEELING_NARRATIVES_13 = [
    {
      id: 'fn13_1',
      title: 'My sadness journaled',
      narrative: [
        'Sadness journaling.',
        '',
        'Daily processing.',
        '',
        'Patterns recognized.',
        '',
        'I tell sad-stuck: journal.'
      ],
      lesson: 'Daily sadness journaling processes feelings and recognizes patterns.'
    },
    {
      id: 'fn13_2',
      title: 'My sadness shared with friend',
      narrative: [
        'Trusted friend.',
        '',
        'Sadness shared.',
        '',
        'Witnessed.',
        '',
        'I tell sad-isolated: friend.'
      ],
      lesson: 'Trusted friend witnesses shared sadness providing presence.'
    },
    {
      id: 'fn13_3',
      title: 'My sadness in therapy',
      narrative: [
        'Therapy hour sadness.',
        '',
        'Held by professional.',
        '',
        'Deeper work.',
        '',
        'I tell deep-sad: therapy.'
      ],
      lesson: 'Therapy hour sadness held by professional enables deeper work.'
    },
    {
      id: 'fn13_4',
      title: 'My sadness in nature',
      narrative: [
        'Nature receives sadness.',
        '',
        'Trees absorb.',
        '',
        'Earth holds.',
        '',
        'I tell nature-curious: nature receives.'
      ],
      lesson: 'Nature receives sadness through trees absorbing and Earth holding.'
    },
    {
      id: 'fn13_5',
      title: 'My sadness through music',
      narrative: [
        'Sad music welcomed.',
        '',
        'Body cries.',
        '',
        'Music holds emotion.',
        '',
        'I tell suppressing: sad music.'
      ],
      lesson: 'Sad music welcomed lets body cry and holds emotion.'
    },
    {
      id: 'fn13_6',
      title: 'My sadness through art',
      narrative: [
        'Art expression of sadness.',
        '',
        'Colors of grief.',
        '',
        'Visual processing.',
        '',
        'I tell visual: art sadness.'
      ],
      lesson: 'Art expression of sadness through colors of grief provides visual processing.'
    },
    {
      id: 'fn13_7',
      title: 'My sadness through writing',
      narrative: [
        'Sad letters.',
        '',
        'Unsent or sent.',
        '',
        'Words carry weight.',
        '',
        'I tell verbal: write sadness.'
      ],
      lesson: 'Sad letters unsent or sent through words carry emotional weight.'
    },
    {
      id: 'fn13_8',
      title: 'My sadness through ritual',
      narrative: [
        'Sadness ritual.',
        '',
        'Candle, photo, place.',
        '',
        'Honored deliberately.',
        '',
        'I tell ritual-curious: sadness ritual.'
      ],
      lesson: 'Sadness ritual through candle, photo, place honors emotion deliberately.'
    },
    {
      id: 'fn13_9',
      title: 'My sadness allowed body',
      narrative: [
        'Body holds sadness.',
        '',
        'Chest heaviness.',
        '',
        'Tears welcomed.',
        '',
        'I tell suppressor: body holds.'
      ],
      lesson: 'Body holds sadness in chest heaviness; tears welcomed allow release.'
    },
    {
      id: 'fn13_10',
      title: 'My sadness time given',
      narrative: [
        'Sadness needs time.',
        '',
        'Not rushed.',
        '',
        'Slow processing.',
        '',
        'I tell rushed-grief: time.'
      ],
      lesson: 'Sadness needs time not rushed for slow processing.'
    },
    {
      id: 'fn13_11',
      title: 'My sadness in groups',
      narrative: [
        'Sadness shared in groups.',
        '',
        'Grief group.',
        '',
        'Loss support.',
        '',
        'I tell isolated-sad: group.'
      ],
      lesson: 'Sadness shared in grief groups and loss support communities.'
    },
    {
      id: 'fn13_12',
      title: 'My sadness in faith',
      narrative: [
        'Faith holds sadness.',
        '',
        'Prayer, ritual, community.',
        '',
        'Belief sustains.',
        '',
        'I tell faithful: faith holds.'
      ],
      lesson: 'Faith holds sadness through prayer, ritual, community as belief sustains.'
    },
    {
      id: 'fn13_13',
      title: 'My sadness in body movement',
      narrative: [
        'Walking with sadness.',
        '',
        'Body moves.',
        '',
        'Emotion flows.',
        '',
        'I tell body-stuck: walking sadness.'
      ],
      lesson: 'Walking with sadness lets body move and emotion flow.'
    },
    {
      id: 'fn13_14',
      title: 'My sadness in service',
      narrative: [
        'Service to others.',
        '',
        'Sadness honored.',
        '',
        'Meaning made.',
        '',
        'I tell sad-purpose: service.'
      ],
      lesson: 'Service to others while sad honors emotion and makes meaning.'
    },
    {
      id: 'fn13_15',
      title: 'My sadness integrated',
      narrative: [
        'Years later.',
        '',
        'Sadness integrated.',
        '',
        'Part of life.',
        '',
        'I tell long-sad: integration.'
      ],
      lesson: 'Years later sadness integrated as part of life.'
    }
  ];

  var FEELING_NARRATIVES_14 = [
    {
      id: 'fn14_1',
      title: 'My fear named',
      narrative: [
        'Fear named specific.',
        '',
        'What exactly afraid of?',
        '',
        'Body knows.',
        '',
        'I tell vague-fear: specific.'
      ],
      lesson: 'Fear named specifically about what exactly is feared informs body knowing.'
    },
    {
      id: 'fn14_2',
      title: 'My fear faced gradually',
      narrative: [
        'Gradual exposure.',
        '',
        'Small steps.',
        '',
        'Tolerance built.',
        '',
        'I tell phobic: gradual exposure.'
      ],
      lesson: 'Fear faced through gradual exposure builds tolerance in small steps.'
    },
    {
      id: 'fn14_3',
      title: 'My fear of public speaking',
      narrative: [
        'Public speaking fear.',
        '',
        'Toastmasters group.',
        '',
        'Weekly practice.',
        '',
        'Skill built.',
        '',
        'I tell speech-anxious: Toastmasters.'
      ],
      lesson: 'Public speaking fear faced through weekly Toastmasters practice builds skill.'
    },
    {
      id: 'fn14_4',
      title: 'My fear of heights',
      narrative: [
        'Heights fear.',
        '',
        'Exposure therapy.',
        '',
        'Gradual elevation.',
        '',
        'Phobia reduced.',
        '',
        'I tell height-phobic: gradual.'
      ],
      lesson: 'Heights fear faced through gradual exposure therapy reduces phobia.'
    },
    {
      id: 'fn14_5',
      title: 'My fear of flying',
      narrative: [
        'Flying fear.',
        '',
        'Specific program.',
        '',
        'Education plus exposure.',
        '',
        'Now I fly.',
        '',
        'I tell flight-phobic: programs exist.'
      ],
      lesson: 'Flying fear treated through specific programs with education plus exposure.'
    },
    {
      id: 'fn14_6',
      title: 'My fear of spiders',
      narrative: [
        'Spider phobia.',
        '',
        'Gradual exposure.',
        '',
        'Pictures, video, dead, live.',
        '',
        'Phobia gone.',
        '',
        'I tell phobic: gradual approach.'
      ],
      lesson: 'Specific phobias like spiders respond to gradual exposure pictures, video, dead, live.'
    },
    {
      id: 'fn14_7',
      title: 'My fear of dogs',
      narrative: [
        'Dog fear.',
        '',
        'Trauma history.',
        '',
        'Therapy plus controlled exposure.',
        '',
        'I tell dog-phobic: therapy.'
      ],
      lesson: 'Dog fear from trauma history responds to therapy plus controlled exposure.'
    },
    {
      id: 'fn14_8',
      title: 'My fear of needles',
      narrative: [
        'Needle phobia.',
        '',
        'Applied tension technique.',
        '',
        'Doctor accommodation.',
        '',
        'I tell needle-phobic: technique exists.'
      ],
      lesson: 'Needle phobia eased by applied tension technique with doctor accommodation.'
    },
    {
      id: 'fn14_9',
      title: 'My fear of dentist',
      narrative: [
        'Dentist fear.',
        '',
        'Sedation dentistry.',
        '',
        'Trauma-informed dentist.',
        '',
        'Care returned.',
        '',
        'I tell dental-phobic: trauma-informed.'
      ],
      lesson: 'Dentist fear eased by sedation dentistry and trauma-informed dentists.'
    },
    {
      id: 'fn14_10',
      title: 'My fear of MRI',
      narrative: [
        'MRI fear claustrophobic.',
        '',
        'Open MRI option.',
        '',
        'Medication option.',
        '',
        'I tell MRI-phobic: options.'
      ],
      lesson: 'MRI fear claustrophobic has open MRI option and medication option.'
    },
    {
      id: 'fn14_11',
      title: 'My fear of elevators',
      narrative: [
        'Elevator phobia.',
        '',
        'Stairs alternative.',
        '',
        'Therapy if persistent.',
        '',
        'I tell elevator-phobic: stairs or therapy.'
      ],
      lesson: 'Elevator phobia eased by stairs alternative or therapy if persistent.'
    },
    {
      id: 'fn14_12',
      title: 'My fear of crowds',
      narrative: [
        'Crowd fear.',
        '',
        'Avoid when possible.',
        '',
        'Plan exit when not.',
        '',
        'I tell crowd-phobic: plan.'
      ],
      lesson: 'Crowd fear eased by avoidance when possible or exit planning when not.'
    },
    {
      id: 'fn14_13',
      title: 'My fear of driving',
      narrative: [
        'Driving fear after accident.',
        '',
        'Graduated return.',
        '',
        'Parking lot first.',
        '',
        'I tell post-accident: gradual return.'
      ],
      lesson: 'Driving fear after accident eased by graduated return starting in parking lot.'
    },
    {
      id: 'fn14_14',
      title: 'My fear of water',
      narrative: [
        'Water fear.',
        '',
        'Swimming lessons.',
        '',
        'Adult-specific instructor.',
        '',
        'I tell water-phobic: lessons.'
      ],
      lesson: 'Water fear eased by adult-specific swimming lessons with patient instructor.'
    },
    {
      id: 'fn14_15',
      title: 'My fear of death',
      narrative: [
        'Death fear existential.',
        '',
        'Existential therapy.',
        '',
        'Acceptance work.',
        '',
        'I tell death-anxious: existential.'
      ],
      lesson: 'Death fear existential treatable through existential therapy acceptance work.'
    }
  ];

  var FEELING_NARRATIVES_15 = [
    {
      id: 'fn15_1',
      title: 'My shame addressed',
      narrative: [
        'Shame addressed slowly.',
        '',
        'Spoken to trusted.',
        '',
        'Loses power.',
        '',
        'I tell shame-stuck: speak.'
      ],
      lesson: 'Shame addressed slowly spoken to trusted person loses power.'
    },
    {
      id: 'fn15_2',
      title: 'My shame about body',
      narrative: [
        'Body shame.',
        '',
        'Body neutrality work.',
        '',
        'Function celebrated.',
        '',
        'I tell body-shamed: neutrality.'
      ],
      lesson: 'Body shame addressed through body neutrality work celebrating function.'
    },
    {
      id: 'fn15_3',
      title: 'My shame about money',
      narrative: [
        'Money shame.',
        '',
        'Financial therapy.',
        '',
        'Patterns examined.',
        '',
        'I tell money-shamed: therapy.'
      ],
      lesson: 'Money shame examined through financial therapy patterns.'
    },
    {
      id: 'fn15_4',
      title: 'My shame about sexuality',
      narrative: [
        'Sexual shame.',
        '',
        'Affirming therapy.',
        '',
        'Pleasure reclaimed.',
        '',
        'I tell sex-shamed: affirming.'
      ],
      lesson: 'Sexual shame addressed through affirming therapy reclaims pleasure.'
    },
    {
      id: 'fn15_5',
      title: 'My shame about identity',
      narrative: [
        'Identity shame.',
        '',
        'Affirming community.',
        '',
        'Self accepted.',
        '',
        'I tell identity-shamed: community.'
      ],
      lesson: 'Identity shame addressed through affirming community accepts self.'
    },
    {
      id: 'fn15_6',
      title: 'My shame about family',
      narrative: [
        'Family shame.',
        '',
        'Differentiation therapy.',
        '',
        'Not me.',
        '',
        'I tell family-shamed: differentiation.'
      ],
      lesson: 'Family shame addressed through differentiation therapy separates self from family.'
    },
    {
      id: 'fn15_7',
      title: 'My shame about past',
      narrative: [
        'Past shame.',
        '',
        'Trauma therapy.',
        '',
        'Self-compassion built.',
        '',
        'I tell past-shamed: self-compassion.'
      ],
      lesson: 'Past shame addressed through trauma therapy builds self-compassion.'
    },
    {
      id: 'fn15_8',
      title: 'My shame about addiction',
      narrative: [
        'Addiction shame.',
        '',
        'Recovery community.',
        '',
        'Not alone.',
        '',
        'I tell addiction-shamed: community.'
      ],
      lesson: 'Addiction shame addressed through recovery community revealing not alone.'
    },
    {
      id: 'fn15_9',
      title: 'My shame about mental illness',
      narrative: [
        'Mental illness shame.',
        '',
        'Self-disclosure.',
        '',
        'Others same.',
        '',
        'I tell stigma-stuck: disclosure.'
      ],
      lesson: 'Mental illness shame addressed through self-disclosure reveals others same.'
    },
    {
      id: 'fn15_10',
      title: 'My shame about poverty',
      narrative: [
        'Poverty shame.',
        '',
        'Structural truth.',
        '',
        'Not personal failing.',
        '',
        'I tell poverty-shamed: structural.'
      ],
      lesson: 'Poverty shame addressed through structural truth as not personal failing.'
    },
    {
      id: 'fn15_11',
      title: 'My shame about success',
      narrative: [
        'Success shame.',
        '',
        'Imposter syndrome.',
        '',
        'Therapy on internalizing.',
        '',
        'I tell success-shamed: therapy.'
      ],
      lesson: 'Success shame as imposter syndrome treated through internalizing therapy.'
    },
    {
      id: 'fn15_12',
      title: 'My shame about failure',
      narrative: [
        'Failure shame.',
        '',
        'Reframe as learning.',
        '',
        'Growth mindset.',
        '',
        'I tell failure-shamed: reframe.'
      ],
      lesson: 'Failure shame addressed through reframe as learning growth mindset.'
    },
    {
      id: 'fn15_13',
      title: 'My shame about anger',
      narrative: [
        'Shame about anger.',
        '',
        'Anger is valid.',
        '',
        'Action choice matters.',
        '',
        'I tell anger-shamed: feeling valid.'
      ],
      lesson: 'Shame about anger eased by recognizing anger valid; action choice matters.'
    },
    {
      id: 'fn15_14',
      title: 'My shame about sadness',
      narrative: [
        'Shame about sadness.',
        '',
        'Sadness is information.',
        '',
        'Worth honoring.',
        '',
        'I tell sad-shamed: honor it.'
      ],
      lesson: 'Shame about sadness eased by recognizing as information worth honoring.'
    },
    {
      id: 'fn15_15',
      title: 'My shame healed in community',
      narrative: [
        'Shame healed.',
        '',
        'Community of belonging.',
        '',
        'Not alone.',
        '',
        'I tell isolated-shame: community.'
      ],
      lesson: 'Shame healed in community of belonging reveals not alone.'
    }
  ];

  var FEELING_NARRATIVES_4 = [
    {
      id: 'fn4_1',
      title: 'My feelings vocabulary expanded',
      narrative: [
        'Vocabulary limited initially.',
        '',
        'Happy, sad, mad.',
        '',
        'Therapist taught nuance.',
        '',
        'Frustrated, melancholy, irritated.',
        '',
        'Precision enables.',
        '',
        'I tell limited-vocab: expand.'
      ],
      lesson: 'Feelings vocabulary expanded through nuance enables precision in awareness.'
    },
    {
      id: 'fn4_2',
      title: 'My feelings wheel learned',
      narrative: [
        'Feelings wheel chart.',
        '',
        'Center six emotions.',
        '',
        'Outer specifics.',
        '',
        'Identification easier.',
        '',
        'I tell stuck-naming: feelings wheel.'
      ],
      lesson: 'Feelings wheel chart with center six emotions and outer specifics aids identification.'
    },
    {
      id: 'fn4_3',
      title: 'My body and feelings linked',
      narrative: [
        'Body holds feelings.',
        '',
        'Tightness equals anger.',
        '',
        'Heaviness equals sadness.',
        '',
        'Body cues taught.',
        '',
        'I tell body-disconnected: body cues.'
      ],
      lesson: 'Body holds feelings with tightness as anger and heaviness as sadness; body cues taught.'
    },
    {
      id: 'fn4_4',
      title: 'My feelings allowed not suppressed',
      narrative: [
        'Suppression learned childhood.',
        '',
        'Therapy taught: feel them.',
        '',
        'Pass through.',
        '',
        'Not stuck.',
        '',
        'I tell suppressor: feel through.'
      ],
      lesson: 'Feelings allowed not suppressed pass through body; suppression keeps them stuck.'
    },
    {
      id: 'fn4_5',
      title: 'My feelings as waves',
      narrative: [
        'Feelings as waves.',
        '',
        'Rise and fall.',
        '',
        'Surf not fight.',
        '',
        'I tell intense-emotions: wave surf.'
      ],
      lesson: 'Feelings as waves rise and fall; surf not fight prevents drowning.'
    },
    {
      id: 'fn4_6',
      title: 'My feelings have timing',
      narrative: [
        'Emotions have natural timing.',
        '',
        '90 seconds peak.',
        '',
        'Then waning.',
        '',
        'If allowed.',
        '',
        'I tell suppressing: 90 second wave.'
      ],
      lesson: 'Emotions have 90-second peak then waning if allowed; suppression extends them.'
    },
    {
      id: 'fn4_7',
      title: 'My naming feelings calms them',
      narrative: [
        'Name it to tame it.',
        '',
        'Brain calms.',
        '',
        'Prefrontal activated.',
        '',
        'I tell intense-feelings: name them.'
      ],
      lesson: 'Naming feelings calms them activating prefrontal cortex; name to tame practice.'
    },
    {
      id: 'fn4_8',
      title: 'My feelings I journal daily',
      narrative: [
        'Daily feelings journal.',
        '',
        'Each emotion noted.',
        '',
        'Patterns emerge.',
        '',
        'I tell emotion-stuck: journal.'
      ],
      lesson: 'Daily feelings journal with each emotion noted reveals patterns over time.'
    },
    {
      id: 'fn4_9',
      title: 'My feelings I share with partner',
      narrative: [
        'Daily feelings share.',
        '',
        'Partner knows.',
        '',
        'Connection deepened.',
        '',
        'I tell partnered: daily share.'
      ],
      lesson: 'Daily feelings share with partner deepens connection through knowing.'
    },
    {
      id: 'fn4_10',
      title: 'My feelings I share with friend',
      narrative: [
        'Weekly friend share.',
        '',
        'Best friend hears.',
        '',
        'Validation received.',
        '',
        'I tell isolated-feelings: friend share.'
      ],
      lesson: 'Weekly friend feeling shares with validation received support emotional life.'
    },
    {
      id: 'fn4_11',
      title: 'My feelings I share in therapy',
      narrative: [
        'Weekly therapy hour.',
        '',
        'Feelings processed.',
        '',
        'Deeper understanding.',
        '',
        'I tell stuck-emotions: therapy.'
      ],
      lesson: 'Weekly therapy hour processes feelings for deeper understanding.'
    },
    {
      id: 'fn4_12',
      title: 'My feelings I share in group',
      narrative: [
        'Support group weekly.',
        '',
        'Shared feelings.',
        '',
        'Not alone.',
        '',
        'I tell isolated: group.'
      ],
      lesson: 'Weekly support group with shared feelings reveals you are not alone.'
    },
    {
      id: 'fn4_13',
      title: 'My feelings I express creatively',
      narrative: [
        'Art expression daily.',
        '',
        'Feelings released.',
        '',
        'Non-verbal channel.',
        '',
        'I tell verbal-stuck: art.'
      ],
      lesson: 'Daily art expression releases feelings through non-verbal channel.'
    },
    {
      id: 'fn4_14',
      title: 'My feelings I express through movement',
      narrative: [
        'Movement releases feelings.',
        '',
        'Body shaking.',
        '',
        'Dance, walk, run.',
        '',
        'I tell body-stuck: movement.'
      ],
      lesson: 'Movement releases feelings through body shaking, dance, walk, run.'
    },
    {
      id: 'fn4_15',
      title: 'My feelings I express through writing',
      narrative: [
        'Writing externalizes feelings.',
        '',
        'Paper holds them.',
        '',
        'Mind released.',
        '',
        'I tell ruminating: writing.'
      ],
      lesson: 'Writing externalizes feelings onto paper releasing mind from rumination.'
    }
  ];

  var FEELING_NARRATIVES_5 = [
    {
      id: 'fn5_1',
      title: 'My anger management at 30',
      narrative: [
        'Anger management group.',
        '',
        'Lochman Coping Power adapted.',
        '',
        'Skills learned.',
        '',
        'Anger workable.',
        '',
        'I tell adult-angry: group exists.'
      ],
      lesson: 'Anger management group adapted from Coping Power teaches skills making anger workable.'
    },
    {
      id: 'fn5_2',
      title: 'My anger management at 40',
      narrative: [
        'Late discovery of anger work.',
        '',
        'Years of damage.',
        '',
        'Now working on it.',
        '',
        'Never too late.',
        '',
        'I tell middle-age: never too late.'
      ],
      lesson: 'Late discovery of anger management is never too late despite years of damage.'
    },
    {
      id: 'fn5_3',
      title: 'My anger management at 50',
      narrative: [
        'Anger at 50 worked.',
        '',
        'Career limited by it.',
        '',
        'Therapy late.',
        '',
        'Bucket lighter now.',
        '',
        'I tell aging-angry: therapy possible.'
      ],
      lesson: 'Anger management at 50 reduces bucket weight career limited by anger.'
    },
    {
      id: 'fn5_4',
      title: 'My anger management at 60',
      narrative: [
        'Retired with anger.',
        '',
        'Family said: get help.',
        '',
        'Therapy started.',
        '',
        'Relationships repaired.',
        '',
        'I tell retired-angry: family deserves.'
      ],
      lesson: 'Retired anger management deserved by family for relationship repair.'
    },
    {
      id: 'fn5_5',
      title: 'My anger and partner stayed',
      narrative: [
        'Partner threatened to leave.',
        '',
        'Anger work begun.',
        '',
        'Partner stayed.',
        '',
        'Relationship saved.',
        '',
        'I tell partner-threatened: anger work.'
      ],
      lesson: 'Partner threatened leaving motivated anger work that saved relationship.'
    },
    {
      id: 'fn5_6',
      title: 'My anger and children safer',
      narrative: [
        'Children scared of me.',
        '',
        'Anger work essential.',
        '',
        'Children safer now.',
        '',
        'Trust rebuilt.',
        '',
        'I tell scary-parent: anger work.'
      ],
      lesson: 'Anger work essential when children scared of parent; trust rebuilt.'
    },
    {
      id: 'fn5_7',
      title: 'My anger management group',
      narrative: [
        'Weekly anger group.',
        '',
        'Men together.',
        '',
        'Shared experience.',
        '',
        'Skills practiced.',
        '',
        'I tell isolated-angry: group.'
      ],
      lesson: 'Weekly anger management groups with shared experience practice skills together.'
    },
    {
      id: 'fn5_8',
      title: 'My anger workbook',
      narrative: [
        'Daily anger workbook.',
        '',
        'Self-paced exercises.',
        '',
        'Combined with therapy.',
        '',
        'I tell self-paced: workbook.'
      ],
      lesson: 'Daily anger workbook with self-paced exercises combined with therapy.'
    },
    {
      id: 'fn5_9',
      title: 'My anger podcast learning',
      narrative: [
        'Anger podcasts daily.',
        '',
        'Learning during commute.',
        '',
        'Tools encountered.',
        '',
        'I tell commute-curious: anger podcasts.'
      ],
      lesson: 'Daily anger podcasts during commute provide tools through audio learning.'
    },
    {
      id: 'fn5_10',
      title: 'My anger book club',
      narrative: [
        'Anger book club.',
        '',
        'Self-help books discussed.',
        '',
        'Community of practice.',
        '',
        'I tell readers: anger book club.'
      ],
      lesson: 'Anger book club discussing self-help creates community of practice.'
    },
    {
      id: 'fn5_11',
      title: 'My anger and DBT skills',
      narrative: [
        'DBT skills emotional regulation.',
        '',
        'TIPP for crisis.',
        '',
        'Mindfulness foundation.',
        '',
        'I tell DBT-curious: skills.'
      ],
      lesson: 'DBT emotional regulation skills with TIPP for crisis and mindfulness foundation.'
    },
    {
      id: 'fn5_12',
      title: 'My anger and CBT skills',
      narrative: [
        'CBT for anger.',
        '',
        'Thought-mood-behavior link.',
        '',
        'Cognitive restructuring.',
        '',
        'I tell CBT-curious: anger.'
      ],
      lesson: 'CBT for anger uses thought-mood-behavior link and cognitive restructuring.'
    },
    {
      id: 'fn5_13',
      title: 'My anger and ACT skills',
      narrative: [
        'ACT for anger.',
        '',
        'Values-driven action.',
        '',
        'Acceptance practice.',
        '',
        'I tell ACT-curious: anger.'
      ],
      lesson: 'ACT for anger uses values-driven action with acceptance practice.'
    },
    {
      id: 'fn5_14',
      title: 'My anger and somatic skills',
      narrative: [
        'Somatic anger work.',
        '',
        'Body-based.',
        '',
        'Anger stored released.',
        '',
        'I tell body-held: somatic.'
      ],
      lesson: 'Somatic anger work body-based releases stored anger.'
    },
    {
      id: 'fn5_15',
      title: 'My anger and integrated approach',
      narrative: [
        'Multiple approaches combined.',
        '',
        'CBT, DBT, ACT, somatic.',
        '',
        'Whole-person treatment.',
        '',
        'I tell integration-curious: combined.'
      ],
      lesson: 'Multiple approaches combined of CBT, DBT, ACT, somatic provide whole-person treatment.'
    }
  ];

  var FEELING_NARRATIVES_6 = [
    {
      id: 'fn6_1',
      title: 'My sadness honored',
      narrative: [
        'Sadness honored not avoided.',
        '',
        'Tears welcomed.',
        '',
        'Body processes.',
        '',
        'I tell tears-avoidant: welcome.'
      ],
      lesson: 'Sadness honored not avoided with tears welcomed processes body emotion.'
    },
    {
      id: 'fn6_2',
      title: 'My fear faced',
      narrative: [
        'Fear faced not run from.',
        '',
        'Look at it.',
        '',
        'Information gleaned.',
        '',
        'I tell fear-running: face it.'
      ],
      lesson: 'Fear faced not run from yields information when looked at directly.'
    },
    {
      id: 'fn6_3',
      title: 'My anger expressed safely',
      narrative: [
        'Anger expressed safely.',
        '',
        'No one hurt.',
        '',
        'Body cleared.',
        '',
        'I tell suppressing-anger: safe expression.'
      ],
      lesson: 'Anger expressed safely without hurting others clears body.'
    },
    {
      id: 'fn6_4',
      title: 'My shame addressed',
      narrative: [
        'Shame addressed not hidden.',
        '',
        'Spoken aloud to trusted.',
        '',
        'Shame loses power.',
        '',
        'I tell shame-stuck: speak it.'
      ],
      lesson: 'Shame addressed not hidden spoken aloud to trusted person loses power.'
    },
    {
      id: 'fn6_5',
      title: 'My grief integrated',
      narrative: [
        'Grief integrated.',
        '',
        'Years of processing.',
        '',
        'Now part of me.',
        '',
        'I tell grieving: integration possible.'
      ],
      lesson: 'Grief integrated over years of processing becomes part of self.'
    },
    {
      id: 'fn6_6',
      title: 'My joy claimed',
      narrative: [
        'Joy claimed.',
        '',
        'Not guilty for it.',
        '',
        'Deserved.',
        '',
        'I tell joy-guilty: claim it.'
      ],
      lesson: 'Joy claimed without guilt as deserved emotion.'
    },
    {
      id: 'fn6_7',
      title: 'My love expressed',
      narrative: [
        'Love expressed often.',
        '',
        'Words and actions.',
        '',
        'No one in doubt.',
        '',
        'I tell love-silent: express.'
      ],
      lesson: 'Love expressed often through words and actions leaves no one in doubt.'
    },
    {
      id: 'fn6_8',
      title: 'My gratitude practiced',
      narrative: [
        'Gratitude practice daily.',
        '',
        'Three specific things.',
        '',
        'Brain shifts.',
        '',
        'I tell mood-stuck: gratitude.'
      ],
      lesson: 'Daily gratitude practice with three specific things shifts brain.'
    },
    {
      id: 'fn6_9',
      title: 'My compassion offered',
      narrative: [
        'Compassion offered.',
        '',
        'To self and others.',
        '',
        'Bridge built.',
        '',
        'I tell distance-stuck: compassion.'
      ],
      lesson: 'Compassion offered to self and others builds bridges.'
    },
    {
      id: 'fn6_10',
      title: 'My empathy cultivated',
      narrative: [
        'Empathy cultivated.',
        '',
        'Others feelings felt.',
        '',
        'Connection deepens.',
        '',
        'I tell distance-stuck: empathy.'
      ],
      lesson: 'Empathy cultivated feels others feelings deepening connection.'
    },
    {
      id: 'fn6_11',
      title: 'My curiosity sustained',
      narrative: [
        'Curiosity sustained.',
        '',
        'About self and world.',
        '',
        'Life rich.',
        '',
        'I tell stagnant: curiosity.'
      ],
      lesson: 'Curiosity sustained about self and world keeps life rich.'
    },
    {
      id: 'fn6_12',
      title: 'My awe noticed',
      narrative: [
        'Awe noticed daily.',
        '',
        'Stars, sunsets, kindness.',
        '',
        'Wonder cultivated.',
        '',
        'I tell awe-blind: notice.'
      ],
      lesson: 'Awe noticed daily through stars, sunsets, kindness cultivates wonder.'
    },
    {
      id: 'fn6_13',
      title: 'My peace cultivated',
      narrative: [
        'Inner peace cultivated.',
        '',
        'Not absence of feeling.',
        '',
        'Acceptance of feeling.',
        '',
        'I tell peace-seeking: not absence.'
      ],
      lesson: 'Inner peace cultivated not as absence but acceptance of feeling.'
    },
    {
      id: 'fn6_14',
      title: 'My equanimity built',
      narrative: [
        'Equanimity built.',
        '',
        'Highs and lows.',
        '',
        'Both met steady.',
        '',
        'I tell reactive: equanimity.'
      ],
      lesson: 'Equanimity built meets both highs and lows steady.'
    },
    {
      id: 'fn6_15',
      title: 'My acceptance practiced',
      narrative: [
        'Acceptance daily practice.',
        '',
        'What is, is.',
        '',
        'Energy preserved.',
        '',
        'I tell fighting: acceptance.'
      ],
      lesson: 'Acceptance daily practice with what is, is preserves energy.'
    }
  ];

  var FEELING_NARRATIVES_7 = [
    {
      id: 'fn7_1',
      title: 'My feelings for my children',
      narrative: [
        'Mixed feelings parenting.',
        '',
        'Love plus frustration.',
        '',
        'Both real.',
        '',
        'I tell parents: both valid.'
      ],
      lesson: 'Mixed parent feelings of love plus frustration both real and valid.'
    },
    {
      id: 'fn7_2',
      title: 'My feelings for my partner',
      narrative: [
        'Feelings for partner shift.',
        '',
        'Daily, weekly, yearly.',
        '',
        'All valid.',
        '',
        'I tell partnered: feelings shift.'
      ],
      lesson: 'Partner feelings shift daily, weekly, yearly; all valid.'
    },
    {
      id: 'fn7_3',
      title: 'My feelings for my parents',
      narrative: [
        'Complicated parents feelings.',
        '',
        'Love plus hurt.',
        '',
        'Both true.',
        '',
        'I tell adult-children: both.'
      ],
      lesson: 'Complicated adult parent feelings of love plus hurt both true.'
    },
    {
      id: 'fn7_4',
      title: 'My feelings for my siblings',
      narrative: [
        'Sibling feelings complex.',
        '',
        'Love, rivalry, history.',
        '',
        'All present.',
        '',
        'I tell siblings: complexity.'
      ],
      lesson: 'Sibling feelings complex with love, rivalry, history all present.'
    },
    {
      id: 'fn7_5',
      title: 'My feelings for my work',
      narrative: [
        'Work feelings shift.',
        '',
        'Love and hate cycles.',
        '',
        'Track patterns.',
        '',
        'I tell work-stressed: track patterns.'
      ],
      lesson: 'Work feelings shift through love-hate cycles; track patterns over time.'
    },
    {
      id: 'fn7_6',
      title: 'My feelings about my body',
      narrative: [
        'Body feelings complicated.',
        '',
        'Acceptance work.',
        '',
        'Body neutrality.',
        '',
        'I tell body-stressed: neutrality.'
      ],
      lesson: 'Body feelings complicated; acceptance work toward body neutrality.'
    },
    {
      id: 'fn7_7',
      title: 'My feelings about aging',
      narrative: [
        'Aging feelings.',
        '',
        'Loss plus gain.',
        '',
        'Both present.',
        '',
        'I tell aging: both real.'
      ],
      lesson: 'Aging feelings include loss plus gain both present.'
    },
    {
      id: 'fn7_8',
      title: 'My feelings about death',
      narrative: [
        'Death feelings explored.',
        '',
        'Fear and acceptance.',
        '',
        'Existential therapy.',
        '',
        'I tell death-anxious: therapy.'
      ],
      lesson: 'Death feelings explored through fear and acceptance via existential therapy.'
    },
    {
      id: 'fn7_9',
      title: 'My feelings about money',
      narrative: [
        'Money feelings unexamined.',
        '',
        'Financial therapy.',
        '',
        'Patterns uncovered.',
        '',
        'I tell money-stressed: financial therapy.'
      ],
      lesson: 'Money feelings unexamined uncovered through financial therapy patterns.'
    },
    {
      id: 'fn7_10',
      title: 'My feelings about success',
      narrative: [
        'Success feelings complicated.',
        '',
        'Imposter syndrome.',
        '',
        'Therapy works on it.',
        '',
        'I tell successful: imposter therapy.'
      ],
      lesson: 'Success feelings complicated by imposter syndrome respond to therapy.'
    },
    {
      id: 'fn7_11',
      title: 'My feelings about failure',
      narrative: [
        'Failure feelings difficult.',
        '',
        'Shame plus learning.',
        '',
        'Reframe possible.',
        '',
        'I tell failure-stuck: reframe.'
      ],
      lesson: 'Failure feelings difficult with shame plus learning; reframe possible.'
    },
    {
      id: 'fn7_12',
      title: 'My feelings about relationships',
      narrative: [
        'Relationship feelings shift.',
        '',
        'Love plus conflict.',
        '',
        'Both healthy.',
        '',
        'I tell relationship-anxious: shifts normal.'
      ],
      lesson: 'Relationship feelings shift through love plus conflict; both healthy.'
    },
    {
      id: 'fn7_13',
      title: 'My feelings about identity',
      narrative: [
        'Identity feelings explored.',
        '',
        'Multiple aspects.',
        '',
        'Integration work.',
        '',
        'I tell identity-curious: integration.'
      ],
      lesson: 'Identity feelings explored with multiple aspects through integration work.'
    },
    {
      id: 'fn7_14',
      title: 'My feelings about purpose',
      narrative: [
        'Purpose feelings.',
        '',
        'Clarity sought.',
        '',
        'Action plus reflection.',
        '',
        'I tell purpose-seeking: both.'
      ],
      lesson: 'Purpose feelings sought through action plus reflection clarity.'
    },
    {
      id: 'fn7_15',
      title: 'My feelings about meaning',
      narrative: [
        'Meaning feelings.',
        '',
        'Service to others.',
        '',
        'Direction emerges.',
        '',
        'I tell meaning-seeking: service.'
      ],
      lesson: 'Meaning feelings through service to others emerges direction.'
    }
  ];

  var FEELING_NARRATIVES_8 = [
    {
      id: 'fn8_1',
      title: 'My feelings during pregnancy',
      narrative: [
        'Pregnancy feelings intense.',
        '',
        'Joy plus fear.',
        '',
        'Hormonal amplification.',
        '',
        'I tell pregnant: feelings intense.'
      ],
      lesson: 'Pregnancy feelings intense with joy plus fear and hormonal amplification.'
    },
    {
      id: 'fn8_2',
      title: 'My feelings postpartum',
      narrative: [
        'Postpartum feelings shifting.',
        '',
        'Joy, exhaustion, anxiety.',
        '',
        'All valid.',
        '',
        'I tell postpartum: all valid.'
      ],
      lesson: 'Postpartum feelings shifting through joy, exhaustion, anxiety all valid.'
    },
    {
      id: 'fn8_3',
      title: 'My feelings as new parent',
      narrative: [
        'New parent feelings.',
        '',
        'Overwhelming love.',
        '',
        'Overwhelming responsibility.',
        '',
        'I tell new-parents: overwhelming.'
      ],
      lesson: 'New parent feelings overwhelming with love and responsibility.'
    },
    {
      id: 'fn8_4',
      title: 'My feelings as teen',
      narrative: [
        'Teen feelings intense.',
        '',
        'Hormonal amplification.',
        '',
        'Identity formation.',
        '',
        'I tell teens: intensity normal.'
      ],
      lesson: 'Teen feelings intense through hormonal amplification and identity formation.'
    },
    {
      id: 'fn8_5',
      title: 'My feelings as young adult',
      narrative: [
        'Young adult feelings.',
        '',
        'Identity solidifying.',
        '',
        'Career direction.',
        '',
        'I tell young adults: direction.'
      ],
      lesson: 'Young adult feelings as identity solidifying and career direction.'
    },
    {
      id: 'fn8_6',
      title: 'My feelings in middle age',
      narrative: [
        'Middle age feelings.',
        '',
        'Mortality awareness.',
        '',
        'Legacy questions.',
        '',
        'I tell middle-aged: legacy.'
      ],
      lesson: 'Middle age feelings include mortality awareness and legacy questions.'
    },
    {
      id: 'fn8_7',
      title: 'My feelings in old age',
      narrative: [
        'Old age feelings.',
        '',
        'Loss accumulation.',
        '',
        'Wisdom gained.',
        '',
        'I tell elderly: both.'
      ],
      lesson: 'Old age feelings include loss accumulation and wisdom gained.'
    },
    {
      id: 'fn8_8',
      title: 'My feelings approaching death',
      narrative: [
        'Death approaching.',
        '',
        'Feelings vary.',
        '',
        'Hospice support.',
        '',
        'I tell terminal: hospice.'
      ],
      lesson: 'Approaching death feelings vary with hospice support available.'
    },
    {
      id: 'fn8_9',
      title: 'My feelings after parents death',
      narrative: [
        'Parents death feelings.',
        '',
        'Complex grief.',
        '',
        'Years to process.',
        '',
        'I tell adult-orphan: years.'
      ],
      lesson: 'Parents death feelings complex grief requiring years to process.'
    },
    {
      id: 'fn8_10',
      title: 'My feelings after spouse death',
      narrative: [
        'Spouse death feelings.',
        '',
        'Identity changed.',
        '',
        'Widow grief.',
        '',
        'I tell widowed: specialty.'
      ],
      lesson: 'Spouse death feelings include identity change and widow grief specialty.'
    },
    {
      id: 'fn8_11',
      title: 'My feelings after pet death',
      narrative: [
        'Pet death feelings.',
        '',
        'Real grief.',
        '',
        'Pet loss specialty.',
        '',
        'I tell pet-grieving: specialty.'
      ],
      lesson: 'Pet death feelings real grief with pet loss specialty support.'
    },
    {
      id: 'fn8_12',
      title: 'My feelings after divorce',
      narrative: [
        'Divorce feelings.',
        '',
        'Relief plus grief.',
        '',
        'Both real.',
        '',
        'I tell divorcing: both.'
      ],
      lesson: 'Divorce feelings include relief plus grief both real.'
    },
    {
      id: 'fn8_13',
      title: 'My feelings after job loss',
      narrative: [
        'Job loss feelings.',
        '',
        'Identity shaken.',
        '',
        'Future uncertain.',
        '',
        'I tell job-lost: identity work.'
      ],
      lesson: 'Job loss feelings shake identity with future uncertain requires identity work.'
    },
    {
      id: 'fn8_14',
      title: 'My feelings after move',
      narrative: [
        'Move feelings.',
        '',
        'Excitement plus grief.',
        '',
        'Old life lost.',
        '',
        'I tell moving: both.'
      ],
      lesson: 'Move feelings include excitement plus grief for old life lost.'
    },
    {
      id: 'fn8_15',
      title: 'My feelings after illness diagnosis',
      narrative: [
        'Illness diagnosis feelings.',
        '',
        'Fear plus relief.',
        '',
        'Naming what is.',
        '',
        'I tell diagnosed: both.'
      ],
      lesson: 'Illness diagnosis feelings include fear plus relief through naming what is.'
    }
  ];

  var FEELING_NARRATIVES_9 = [
    {
      id: 'fn9_1',
      title: 'My feelings honored daily',
      narrative: [
        'Daily check-in feelings.',
        '',
        'Morning, midday, evening.',
        '',
        'Tracked over time.',
        '',
        'I tell tracking-curious: thrice daily.'
      ],
      lesson: 'Daily thrice-daily feelings check-in tracked over time builds awareness.'
    },
    {
      id: 'fn9_2',
      title: 'My feelings color coded',
      narrative: [
        'Color code feelings.',
        '',
        'Red anger, blue sad.',
        '',
        'Visual tracking.',
        '',
        'I tell visual-learners: color code.'
      ],
      lesson: 'Color coded feelings as red anger, blue sad provide visual tracking.'
    },
    {
      id: 'fn9_3',
      title: 'My feelings weather metaphor',
      narrative: [
        'Feelings as weather.',
        '',
        'Sunny, cloudy, stormy.',
        '',
        'Passing not permanent.',
        '',
        'I tell stuck-feelings: weather.'
      ],
      lesson: 'Feelings as weather sunny, cloudy, stormy pass not permanent.'
    },
    {
      id: 'fn9_4',
      title: 'My feelings as visitors',
      narrative: [
        'Feelings as visitors.',
        '',
        'Welcome them.',
        '',
        'Hear them.',
        '',
        'Let them leave.',
        '',
        'I tell stuck-feelings: visitors.'
      ],
      lesson: 'Feelings as visitors welcomed, heard, then leaving naturally.'
    },
    {
      id: 'fn9_5',
      title: 'My feelings as messengers',
      narrative: [
        'Feelings as messengers.',
        '',
        'Information to deliver.',
        '',
        'Receive the message.',
        '',
        'I tell suppressor: messengers.'
      ],
      lesson: 'Feelings as messengers with information to deliver; receive the message.'
    },
    {
      id: 'fn9_6',
      title: 'My feelings as compass',
      narrative: [
        'Feelings as compass.',
        '',
        'Pointing toward needs.',
        '',
        'Direction provided.',
        '',
        'I tell direction-seeking: feelings compass.'
      ],
      lesson: 'Feelings as compass point toward needs and provide direction.'
    },
    {
      id: 'fn9_7',
      title: 'My feelings as data',
      narrative: [
        'Feelings as data.',
        '',
        'Information about state.',
        '',
        'Not facts about world.',
        '',
        'I tell fact-confused: data.'
      ],
      lesson: 'Feelings as data about internal state not facts about world.'
    },
    {
      id: 'fn9_8',
      title: 'My feelings differentiated from thoughts',
      narrative: [
        'Feelings vs thoughts.',
        '',
        'Different categories.',
        '',
        'Both important.',
        '',
        'I tell confusion-stuck: differentiate.'
      ],
      lesson: 'Feelings vs thoughts as different categories both important separately.'
    },
    {
      id: 'fn9_9',
      title: 'My feelings differentiated from facts',
      narrative: [
        'I feel like loser.',
        '',
        'Not I am loser.',
        '',
        'Feeling not fact.',
        '',
        'I tell self-judging: feeling not fact.'
      ],
      lesson: 'I feel like loser is feeling not fact; I am not loser is fact distinction.'
    },
    {
      id: 'fn9_10',
      title: 'My feelings allowed in body',
      narrative: [
        'Body holds feelings.',
        '',
        'Allow them there.',
        '',
        'Not in head only.',
        '',
        'I tell head-only: body.'
      ],
      lesson: 'Body holds feelings; allow them there not in head only.'
    },
    {
      id: 'fn9_11',
      title: 'My feelings expressed appropriately',
      narrative: [
        'Appropriate expression.',
        '',
        'Right time, right place.',
        '',
        'Right person.',
        '',
        'I tell inappropriate: discernment.'
      ],
      lesson: 'Appropriate feeling expression considers right time, place, person discernment.'
    },
    {
      id: 'fn9_12',
      title: 'My feelings contained when needed',
      narrative: [
        'Contained when needed.',
        '',
        'Public meeting.',
        '',
        'Process later privately.',
        '',
        'I tell impulsive: contain.'
      ],
      lesson: 'Feelings contained when needed in public; processed later privately.'
    },
    {
      id: 'fn9_13',
      title: 'My feelings released when safe',
      narrative: [
        'Released when safe.',
        '',
        'Therapy, journal, partner.',
        '',
        'Safe containers.',
        '',
        'I tell stuck-feelings: safe containers.'
      ],
      lesson: 'Feelings released when safe in therapy, journal, partner as safe containers.'
    },
    {
      id: 'fn9_14',
      title: 'My feelings integrated over time',
      narrative: [
        'Integration over time.',
        '',
        'Years of practice.',
        '',
        'Wisdom emerges.',
        '',
        'I tell beginners: integration.'
      ],
      lesson: 'Feelings integrated over years of practice as wisdom emerges.'
    },
    {
      id: 'fn9_15',
      title: 'My feelings teach me daily',
      narrative: [
        'Daily teacher.',
        '',
        'Each feeling lesson.',
        '',
        'Self-knowledge grows.',
        '',
        'I tell learning-curious: daily teacher.'
      ],
      lesson: 'Feelings as daily teacher with each feeling lesson grows self-knowledge.'
    }
  ];

  var FEELING_NARRATIVES_10 = [
    {
      id: 'fn10_1',
      title: 'My feelings final wisdom',
      narrative: [
        'All feelings valid.',
        '',
        'All information.',
        '',
        'All passing.',
        '',
        'I tell beginners: validity.'
      ],
      lesson: 'All feelings valid as information and all passing.'
    },
    {
      id: 'fn10_2',
      title: 'My feelings practice continues',
      narrative: [
        'Lifelong practice.',
        '',
        'Daily renewal.',
        '',
        'Never complete.',
        '',
        'I tell beginners: lifelong.'
      ],
      lesson: 'Feelings practice lifelong with daily renewal never complete.'
    },
    {
      id: 'fn10_3',
      title: 'My feelings community shared',
      narrative: [
        'Community of feeling.',
        '',
        'All humans feel.',
        '',
        'Universal connection.',
        '',
        'I tell isolated: universal.'
      ],
      lesson: 'Community of feeling connects all humans through universal experience.'
    },
    {
      id: 'fn10_4',
      title: 'My feelings teach others',
      narrative: [
        'Teaching others feelings.',
        '',
        'Vocabulary shared.',
        '',
        'Skills passed.',
        '',
        'I tell experienced: teach.'
      ],
      lesson: 'Teaching others feelings shares vocabulary and passes skills.'
    },
    {
      id: 'fn10_5',
      title: 'My feelings final principles',
      narrative: [
        'All feelings information.',
        '',
        'All feelings pass.',
        '',
        'All feelings need expression.',
        '',
        'I tell beginners: three principles.'
      ],
      lesson: 'Three feeling principles: information, passing, need expression.'
    },
    {
      id: 'fn10_6',
      title: 'My feelings honesty',
      narrative: [
        'Honesty with feelings.',
        '',
        'Self and others.',
        '',
        'Pretense released.',
        '',
        'I tell pretenders: honesty.'
      ],
      lesson: 'Honesty with feelings to self and others releases pretense.'
    },
    {
      id: 'fn10_7',
      title: 'My feelings courage',
      narrative: [
        'Courage to feel.',
        '',
        'Especially hard ones.',
        '',
        'Daily practice.',
        '',
        'I tell numb-feelings: courage.'
      ],
      lesson: 'Courage to feel especially hard ones is daily practice.'
    },
    {
      id: 'fn10_8',
      title: 'My feelings vulnerability',
      narrative: [
        'Vulnerability with feelings.',
        '',
        'Showing them.',
        '',
        'Connection built.',
        '',
        'I tell hidden-feelings: vulnerability.'
      ],
      lesson: 'Vulnerability with feelings showing them builds connection.'
    },
    {
      id: 'fn10_9',
      title: 'My feelings as gift',
      narrative: [
        'Feelings as gift.',
        '',
        'Color life.',
        '',
        'Depth provided.',
        '',
        'I tell flat-feeling: gift.'
      ],
      lesson: 'Feelings as gift color life and provide depth.'
    },
    {
      id: 'fn10_10',
      title: 'My feelings as practice',
      narrative: [
        'Feeling is practice.',
        '',
        'Daily renewal.',
        '',
        'Lifelong commitment.',
        '',
        'I tell beginners: practice.'
      ],
      lesson: 'Feeling is daily practice with lifelong commitment.'
    },
    {
      id: 'fn10_11',
      title: 'My feelings as wisdom',
      narrative: [
        'Wisdom from feeling.',
        '',
        'Years of practice.',
        '',
        'Self-knowledge deep.',
        '',
        'I tell elderly: wisdom emerges.'
      ],
      lesson: 'Wisdom from feeling emerges over years of practice with deep self-knowledge.'
    },
    {
      id: 'fn10_12',
      title: 'My feelings as service',
      narrative: [
        'Service from feeling work.',
        '',
        'Help others feel.',
        '',
        'Vocabulary shared.',
        '',
        'I tell mature: service.'
      ],
      lesson: 'Service from feeling work helps others feel sharing vocabulary.'
    },
    {
      id: 'fn10_13',
      title: 'My feelings as legacy',
      narrative: [
        'Legacy of feeling.',
        '',
        'Children taught.',
        '',
        'Generations shifted.',
        '',
        'I tell parents: legacy.'
      ],
      lesson: 'Legacy of feeling work teaches children shifting generations.'
    },
    {
      id: 'fn10_14',
      title: 'My feelings as gift to world',
      narrative: [
        'Feelings gift to world.',
        '',
        'Authentic living.',
        '',
        'Permission for others.',
        '',
        'I tell pretenders: gift.'
      ],
      lesson: 'Feelings gift to world through authentic living gives permission for others.'
    },
    {
      id: 'fn10_15',
      title: 'My feelings final word',
      narrative: [
        'Final word: feel.',
        '',
        'Permission granted.',
        '',
        'All emotions welcome.',
        '',
        'I tell all: feel.'
      ],
      lesson: 'Final word: feel; permission granted; all emotions welcome.'
    }
  ];

  var FEELING_NARRATIVES_1 = [
    {
      id: 'fn1_1',
      title: 'My anger was a signal not enemy',
      narrative: [
        'Anger always felt bad.',
        '',
        'Tried to push it down.',
        '',
        'Therapist taught: anger is signal.',
        '',
        'What is it pointing to?',
        '',
        'Boundary violated.',
        '',
        'Need unmet.',
        '',
        'Anger reframed.',
        '',
        'I tell anger-stricken: signal not enemy.'
      ],
      lesson: 'Anger is signal pointing to violated boundary or unmet need; not enemy to suppress.'
    },
    {
      id: 'fn1_2',
      title: 'My choice point I learned to find',
      narrative: [
        'Between feeling and action.',
        '',
        'Choice point exists.',
        '',
        'Brief but real.',
        '',
        'Practice finding it.',
        '',
        'Pause, breathe, choose.',
        '',
        'I tell reactive: find choice point.'
      ],
      lesson: 'Choice point exists between feeling and action; pause, breathe, choose response.'
    },
    {
      id: 'fn1_3',
      title: 'My hassle log revealed patterns',
      narrative: [
        'Hassle log daily.',
        '',
        'Each anger incident noted.',
        '',
        'Patterns emerged.',
        '',
        'Same triggers, same times.',
        '',
        'I tell unfocused-angry: hassle log.'
      ],
      lesson: 'Hassle log daily reveals trigger patterns through systematic noting.'
    },
    {
      id: 'fn1_4',
      title: 'My anger body signs I learned',
      narrative: [
        'Anger body signs.',
        '',
        'Heat in chest.',
        '',
        'Jaw tightening.',
        '',
        'Fist clenching.',
        '',
        'Early signs caught.',
        '',
        'I tell body-disconnected: anger signs.'
      ],
      lesson: 'Anger body signs like heat, jaw tightening, fist clenching caught early enable intervention.'
    },
    {
      id: 'fn1_5',
      title: 'My anger triggers identified',
      narrative: [
        'Specific triggers identified.',
        '',
        'Certain people.',
        '',
        'Certain situations.',
        '',
        'Certain body states.',
        '',
        'I tell unfocused-angry: trigger inventory.'
      ],
      lesson: 'Specific anger triggers identified across people, situations, body states.'
    },
    {
      id: 'fn1_6',
      title: 'My cool-down skills practiced',
      narrative: [
        'Cool-down skills daily.',
        '',
        'Deep breath.',
        '',
        'Step away.',
        '',
        'Count to 10.',
        '',
        'Practice when not angry.',
        '',
        'I tell reactive: practice cool-down.'
      ],
      lesson: 'Cool-down skills practiced when not angry build muscle memory for angry moments.'
    },
    {
      id: 'fn1_7',
      title: 'My anger expression healthy',
      narrative: [
        'I-statement expression.',
        '',
        'I feel angry when.',
        '',
        'Not you statements.',
        '',
        'Communication built.',
        '',
        'I tell blaming-angry: I-statements.'
      ],
      lesson: 'I-statement anger expression builds communication; not blaming you-statements.'
    },
    {
      id: 'fn1_8',
      title: 'My anger after wounds',
      narrative: [
        'Anger covers hurt.',
        '',
        'Hurt covers fear.',
        '',
        'Layers underneath.',
        '',
        'Therapy explored.',
        '',
        'I tell surface-angry: layers below.'
      ],
      lesson: 'Anger often covers hurt; hurt covers fear; layers explored through therapy.'
    },
    {
      id: 'fn1_9',
      title: 'My anger from injustice',
      narrative: [
        'Injustice triggers anger.',
        '',
        'Anger appropriate.',
        '',
        'Channel to action.',
        '',
        'Advocacy emerged.',
        '',
        'I tell injustice-angry: channel to action.'
      ],
      lesson: 'Injustice-triggered anger appropriate; channel to advocacy action.'
    },
    {
      id: 'fn1_10',
      title: 'My anger after sleep loss',
      narrative: [
        'Sleep loss amplifies anger.',
        '',
        'Body irritable.',
        '',
        'Threshold lowered.',
        '',
        'Sleep restored anger reduced.',
        '',
        'I tell sleep-deprived: rest first.'
      ],
      lesson: 'Sleep loss amplifies anger through lowered threshold; rest restores baseline.'
    },
    {
      id: 'fn1_11',
      title: 'My anger after hunger',
      narrative: [
        'Hangry is real.',
        '',
        'Blood sugar drops.',
        '',
        'Anger surges.',
        '',
        'Eat regularly.',
        '',
        'I tell hangry: regular eating.'
      ],
      lesson: 'Hangry is real biological response to low blood sugar; regular eating prevents surges.'
    },
    {
      id: 'fn1_12',
      title: 'My anger after dehydration',
      narrative: [
        'Dehydration triggers irritability.',
        '',
        'Body stressed.',
        '',
        'Water restores.',
        '',
        'I tell irritable: hydrate first.'
      ],
      lesson: 'Dehydration triggers irritability through body stress; water restores baseline.'
    },
    {
      id: 'fn1_13',
      title: 'My anger after caffeine',
      narrative: [
        'Excess caffeine triggers irritability.',
        '',
        'Nervous system spike.',
        '',
        'Reduce caffeine.',
        '',
        'I tell coffee-heavy: reduce.'
      ],
      lesson: 'Excess caffeine triggers irritability through nervous system spike.'
    },
    {
      id: 'fn1_14',
      title: 'My anger after alcohol',
      narrative: [
        'Alcohol disinhibits anger.',
        '',
        'Reactivity higher.',
        '',
        'Reduce drinking.',
        '',
        'I tell drinker: alcohol amplifies.'
      ],
      lesson: 'Alcohol disinhibits anger raising reactivity; reduction recommended.'
    },
    {
      id: 'fn1_15',
      title: 'My anger after stress accumulation',
      narrative: [
        'Stress accumulates.',
        '',
        'Bucket full.',
        '',
        'Anger overflows.',
        '',
        'Drain bucket daily.',
        '',
        'I tell accumulating: drain daily.'
      ],
      lesson: 'Stress accumulation fills bucket overflowing as anger; daily draining prevents.'
    }
  ];

  var FEELING_NARRATIVES_2 = [
    {
      id: 'fn2_1',
      title: 'My sadness is information',
      narrative: [
        'Sadness avoided long.',
        '',
        'Therapist: sadness is information.',
        '',
        'What was lost?',
        '',
        'What needed mourning?',
        '',
        'Information honored.',
        '',
        'I tell sadness-avoidant: information.'
      ],
      lesson: 'Sadness is information about what was lost or what needs mourning; honor it.'
    },
    {
      id: 'fn2_2',
      title: 'My fear is protective',
      narrative: [
        'Fear feels bad.',
        '',
        'But protective.',
        '',
        'Body warns.',
        '',
        'Listen for real danger.',
        '',
        'I tell fear-fighting: listen.'
      ],
      lesson: 'Fear feels bad but is protective; body warns of real danger; listen.'
    },
    {
      id: 'fn2_3',
      title: 'My disgust is boundary',
      narrative: [
        'Disgust felt wrong.',
        '',
        'But teaches boundary.',
        '',
        'What I will not.',
        '',
        'Boundary signal.',
        '',
        'I tell shame-disgust: boundary signal.'
      ],
      lesson: 'Disgust teaches boundary signaling what I will not accept.'
    },
    {
      id: 'fn2_4',
      title: 'My shame is signal',
      narrative: [
        'Shame felt unbearable.',
        '',
        'Therapist: shame is signal.',
        '',
        'Belonging at risk.',
        '',
        'Need community.',
        '',
        'I tell shame-stuck: signal not truth.'
      ],
      lesson: 'Shame is signal of belonging at risk; signal not truth about self.'
    },
    {
      id: 'fn2_5',
      title: 'My guilt is corrective',
      narrative: [
        'Guilt corrective.',
        '',
        'Different from shame.',
        '',
        'Action wrong, not me.',
        '',
        'Correct action.',
        '',
        'I tell guilt-shame: differentiate.'
      ],
      lesson: 'Guilt is corrective; action wrong not me; correct the action.'
    },
    {
      id: 'fn2_6',
      title: 'My jealousy is unmet need',
      narrative: [
        'Jealousy painful.',
        '',
        'Unmet need underneath.',
        '',
        'What I wanted.',
        '',
        'Address the need.',
        '',
        'I tell jealous-stuck: need underneath.'
      ],
      lesson: 'Jealousy points to unmet need underneath; address the need directly.'
    },
    {
      id: 'fn2_7',
      title: 'My envy is desire',
      narrative: [
        'Envy showed desire.',
        '',
        'What I want.',
        '',
        'Information about goals.',
        '',
        'Direction set.',
        '',
        'I tell envy-stuck: direction info.'
      ],
      lesson: 'Envy shows desire and direction information about goals worth setting.'
    },
    {
      id: 'fn2_8',
      title: 'My loneliness is need for connection',
      narrative: [
        'Loneliness signal.',
        '',
        'Need connection.',
        '',
        'Reach out.',
        '',
        'Build community.',
        '',
        'I tell isolated: reach out.'
      ],
      lesson: 'Loneliness signals need for connection; reach out and build community.'
    },
    {
      id: 'fn2_9',
      title: 'My anxiety is uncertainty intolerance',
      narrative: [
        'Anxiety amplifies.',
        '',
        'Uncertainty intolerance.',
        '',
        'Build tolerance.',
        '',
        'I tell anxious: uncertainty practice.'
      ],
      lesson: 'Anxiety amplifies through uncertainty intolerance; build tolerance practice.'
    },
    {
      id: 'fn2_10',
      title: 'My disappointment is reality check',
      narrative: [
        'Disappointment painful.',
        '',
        'Reality vs expectation.',
        '',
        'Adjust expectation.',
        '',
        'Mourn difference.',
        '',
        'I tell disappointment-stuck: expectation work.'
      ],
      lesson: 'Disappointment is reality vs expectation; adjust expectations and mourn difference.'
    },
    {
      id: 'fn2_11',
      title: 'My joy is appropriate response',
      narrative: [
        'Joy can be uncomfortable.',
        '',
        'Especially after loss.',
        '',
        'Therapist: joy okay.',
        '',
        'Not betrayal.',
        '',
        'I tell joy-guilty: okay.'
      ],
      lesson: 'Joy after loss can feel uncomfortable but is okay; not betrayal.'
    },
    {
      id: 'fn2_12',
      title: 'My contentment is foundation',
      narrative: [
        'Contentment foundation.',
        '',
        'Quiet positive.',
        '',
        'Not exciting.',
        '',
        'Sustainable.',
        '',
        'I tell happiness-chasing: contentment.'
      ],
      lesson: 'Contentment is quiet positive foundation sustainable beyond exciting happiness.'
    },
    {
      id: 'fn2_13',
      title: 'My love is action',
      narrative: [
        'Love is verb.',
        '',
        'Action not feeling.',
        '',
        'Choice daily.',
        '',
        'Commitment over feeling.',
        '',
        'I tell love-confused: action.'
      ],
      lesson: 'Love is verb and action; choice daily and commitment over feeling.'
    },
    {
      id: 'fn2_14',
      title: 'My compassion is connection',
      narrative: [
        'Compassion connecting.',
        '',
        'For self and others.',
        '',
        'Bridge built.',
        '',
        'I tell distance-stuck: compassion.'
      ],
      lesson: 'Compassion connects through bridge built for self and others.'
    },
    {
      id: 'fn2_15',
      title: 'My all feelings are valid',
      narrative: [
        'All feelings valid.',
        '',
        'Information from body.',
        '',
        'Listen and respond.',
        '',
        'Not suppress.',
        '',
        'I tell feeling-shaming: validity.'
      ],
      lesson: 'All feelings valid as information from body; listen and respond not suppress.'
    }
  ];

  var FEELING_NARRATIVES_3 = [
    {
      id: 'fn3_1',
      title: 'My anger management at age 35',
      narrative: [
        'Years of explosive anger.',
        '',
        'Lost friends.',
        '',
        'Damaged relationships.',
        '',
        'Anger management group.',
        '',
        'Slow change.',
        '',
        'Years of practice.',
        '',
        'Now manageable.',
        '',
        'I tell explosive: group plus practice.'
      ],
      lesson: 'Anger management at any age requires group plus years of practice; explosive anger can be tamed.'
    },
    {
      id: 'fn3_2',
      title: 'My anger from childhood trauma',
      narrative: [
        'Childhood trauma roots.',
        '',
        'Anger from unsafe home.',
        '',
        'Therapy on roots.',
        '',
        'Anger less now.',
        '',
        'I tell trauma-angry: roots work.'
      ],
      lesson: 'Anger from childhood trauma roots requires therapy on those roots; current anger less.'
    },
    {
      id: 'fn3_3',
      title: 'My anger in marriage',
      narrative: [
        'Anger at partner chronic.',
        '',
        'Couples therapy.',
        '',
        'Pattern named.',
        '',
        'Tools developed.',
        '',
        'Marriage saved.',
        '',
        'I tell marriage-angry: therapy.'
      ],
      lesson: 'Anger in marriage chronic requires couples therapy with pattern naming and tools.'
    },
    {
      id: 'fn3_4',
      title: 'My anger at children',
      narrative: [
        'Yelled at children.',
        '',
        'Felt guilty after.',
        '',
        'Parent anger therapy.',
        '',
        'Triggers identified.',
        '',
        'Tools learned.',
        '',
        'I tell parents-angry: parent anger therapy.'
      ],
      lesson: 'Parent anger toward children needs parent-specific anger therapy with trigger work.'
    },
    {
      id: 'fn3_5',
      title: 'My anger at work',
      narrative: [
        'Workplace anger.',
        '',
        'Career-limiting.',
        '',
        'Workplace coach.',
        '',
        'Professional response built.',
        '',
        'I tell workplace-angry: coach.'
      ],
      lesson: 'Workplace anger career-limiting; coach helps build professional response.'
    },
    {
      id: 'fn3_6',
      title: 'My anger driving',
      narrative: [
        'Road rage frequent.',
        '',
        'Dangerous behavior.',
        '',
        'Road rage program.',
        '',
        'Defensive driving.',
        '',
        'Anger managed.',
        '',
        'I tell road-rage: program exists.'
      ],
      lesson: 'Road rage dangerous; road rage programs and defensive driving manage it.'
    },
    {
      id: 'fn3_7',
      title: 'My anger online',
      narrative: [
        'Online anger explosive.',
        '',
        'Comments regretted.',
        '',
        'Therapy on digital reactivity.',
        '',
        'Pause before posting.',
        '',
        'I tell online-angry: pause.'
      ],
      lesson: 'Online anger explosive with regretted comments; pause before posting practice.'
    },
    {
      id: 'fn3_8',
      title: 'My anger from injustice action',
      narrative: [
        'Injustice anger channeled.',
        '',
        'Advocacy work.',
        '',
        'Anger fuels change.',
        '',
        'Healthy expression.',
        '',
        'I tell justice-angry: advocacy.'
      ],
      lesson: 'Injustice anger channeled into advocacy work fuels healthy change.'
    },
    {
      id: 'fn3_9',
      title: 'My anger from chronic pain',
      narrative: [
        'Chronic pain anger.',
        '',
        'Body frustration.',
        '',
        'Pain therapy plus anger work.',
        '',
        'Compassion for body.',
        '',
        'I tell pain-angry: dual therapy.'
      ],
      lesson: 'Chronic pain produces body frustration anger; dual pain plus anger therapy with body compassion.'
    },
    {
      id: 'fn3_10',
      title: 'My anger from chronic illness',
      narrative: [
        'Chronic illness anger.',
        '',
        'At body, fate, system.',
        '',
        'Therapy explored.',
        '',
        'Anger honored, channeled.',
        '',
        'I tell chronically ill: anger valid.'
      ],
      lesson: 'Chronic illness anger at body, fate, system valid; honor and channel through therapy.'
    },
    {
      id: 'fn3_11',
      title: 'My anger from disability',
      narrative: [
        'Disability anger valid.',
        '',
        'At ableism.',
        '',
        'At accessibility gaps.',
        '',
        'Channel to advocacy.',
        '',
        'I tell disabled-angry: advocacy.'
      ],
      lesson: 'Disability anger at ableism and accessibility gaps valid; channel to advocacy.'
    },
    {
      id: 'fn3_12',
      title: 'My anger from racism',
      narrative: [
        'Racism anger chronic.',
        '',
        'Systemic injustice.',
        '',
        'Affinity community essential.',
        '',
        'Advocacy work.',
        '',
        'I tell racially-stressed: community plus advocacy.'
      ],
      lesson: 'Racism anger chronic from systemic injustice; affinity community plus advocacy essential.'
    },
    {
      id: 'fn3_13',
      title: 'My anger from sexism',
      narrative: [
        'Sexism anger chronic.',
        '',
        'Patriarchal harm.',
        '',
        'Womens community.',
        '',
        'Feminist organizing.',
        '',
        'I tell sexist-stressed: community.'
      ],
      lesson: 'Sexism anger chronic from patriarchal harm; womens community and feminist organizing.'
    },
    {
      id: 'fn3_14',
      title: 'My anger from homophobia',
      narrative: [
        'Homophobia anger.',
        '',
        'Identity attacked.',
        '',
        'LGBTQ community.',
        '',
        'Affirming therapy.',
        '',
        'I tell LGBTQ-angry: community.'
      ],
      lesson: 'Homophobia anger from identity attacks; LGBTQ community and affirming therapy support.'
    },
    {
      id: 'fn3_15',
      title: 'My anger from transphobia',
      narrative: [
        'Transphobia anger.',
        '',
        'Existence questioned.',
        '',
        'Trans community.',
        '',
        'Affirming care.',
        '',
        'I tell trans-angry: community.'
      ],
      lesson: 'Transphobia anger from existence questioning; trans community and affirming care.'
    }
  ];

  window.SelHub.registerTool('bigFeelings', {
    icon: '🔥',
    label: 'Big Feelings (Anger)',
    desc: 'Anger-specific psychoeducation and skill-building. Anger is information, not the problem; reactive aggression is. Built on Lochman\'s Coping Power tradition (adolescent CBT for anger) plus the wider CBT-for-anger evidence base. Hassle log, trigger inventory, the choice point, and personalized cool-down skills.',
    color: 'orange',
    category: 'self-regulation',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _bigT = (ctx && ctx.theme) || {};
      var _bigHC = !!_bigT.isContrast, _bigL = !_bigHC && !_bigT.isDark;
      var _big_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff'}, _big_BGH = {'#0f172a':'#000000','#1e293b':'#000000','#0ea5e9':'#000000','#fff':'#000000','#b45309':'#000000','#ef4444':'#000000'};
      var _big_FGL = {'#cbd5e1':'#334155','#fdba74':'#9a3412','#94a3b8':'#64748b','#e2e8f0':'#1e293b','#fca5a5':'#991b1b','#c4b5fd':'#5b21b6','#fecaca':'#b91c1c','#fde68a':'#92400e','#86efac':'#166534','#fcd34d':'#78350f'}, _big_FGH = {'#cbd5e1':'#ffff00','#fdba74':'#ffff00','#94a3b8':'#ffff00','#fed7aa':'#ffff00','#e2e8f0':'#ffff00','#fca5a5':'#ffff00','#bbf7d0':'#ffff00','#c4b5fd':'#ffff00','#fecaca':'#ffff00','#475569':'#ffff00','#fde68a':'#ffff00','#86efac':'#ffff00','#bae6fd':'#ffff00','#fff':'#ffff00','#fcd34d':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00'};
      var _big_BDL = {'#334155':'#e2e8f0','#1e293b':'#e5e7eb','#475569':'#cbd5e1'}, _big_BDH = {'#334155':'#ffff00','#1e293b':'#ffff00','#f97316':'#ffff00','#a855f7':'#ffff00','#22c55e':'#ffff00','#ef4444':'#ffff00','#f59e0b':'#ffff00','#0ea5e9':'#ffff00','#475569':'#ffff00','#cbd5e1':'#ffff00','#ea580c':'#ffff00','#e2e8f0':'#ffff00'};
      var _bigBg = function(h){ return _bigHC ? (_big_BGH[h]||h) : (_bigL ? (_big_BGL[h]||h) : h); };
      var _bigFg = function(h){ return _bigHC ? (_big_FGH[h]||h) : (_bigL ? (_big_FGL[h]||h) : h); };
      var _bigBd = function(h){ return _bigHC ? (_big_BDH[h]||h) : (_bigL ? (_big_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;

      var d = labToolData.bigFeelings || defaultState();
      function setBF(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.bigFeelings) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { bigFeelings: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setBF({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: _bigFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _bigFg('#fdba74'), fontSize: 22, fontWeight: 900 } }, '🔥 Big Feelings'),
            h('div', { style: { fontSize: 12, color: _bigFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'Anger as information. Reactive aggression as the trap.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'What anger is', icon: '🔥' },
          { id: 'choice', label: 'The choice point', icon: '🚦' },
          { id: 'hassle', label: 'Hassle log', icon: '📓' },
          { id: 'triggers', label: 'My triggers', icon: '⚡' },
          { id: 'cooldown', label: 'My cool-downs', icon: '❄️' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Big Feelings sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#f97316' : '#334155'),
                background: active ? 'rgba(249,115,22,0.18)' : _bigBg('#1e293b'),
                color: active ? _bigFg('#fed7aa') : _bigFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: _bigFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'If your anger is leading to violence (toward yourself, others, or things), please get a counselor or therapist involved. There are effective treatments. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — psychoeducation
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(249,115,22,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(249,115,22,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: _bigFg('#fed7aa'), marginBottom: 4 } }, 'Anger is not the enemy.'),
            h('p', { style: { margin: '0 0 10px', color: _bigFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              'Anger is one of the most useful emotions. It is the signal that something is wrong: a line crossed, an injustice, harm done, a need ignored. Without anger, people would not stand up for themselves, would not protect the people they love, would not fight unfair things. Anger that points at injustice is healthy and necessary.'
            ),
            h('p', { style: { margin: 0, color: _bigFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              'The problem is not anger. The problem is REACTIVE AGGRESSION — acting on anger before the prefrontal cortex comes back online. The thing you did in the heat of the moment that you wish you had done differently. The work is not to feel less anger. It is to put space between FEELING anger and ACTING on anger. That space is the choice point.'
            )
          ),

          // Anger vs aggression
          h('div', { style: { padding: 14, borderRadius: 10, background: _bigBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f97316', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _bigFg('#fdba74'), marginBottom: 10 } }, '🔍 Anger vs. aggression vs. assertion'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _bigFg('#e2e8f0'), fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: _bigFg('#fdba74') } }, 'Anger '), 'is a FEELING. You cannot directly choose to feel it or not feel it. It just shows up when the body senses a threat or violation.'),
              h('li', null, h('strong', { style: { color: _bigFg('#fca5a5') } }, 'Aggression '), 'is the ACTION of hurting someone (or something) with your behavior — yelling, hitting, name-calling, destroying property, intimidating. This is the part you can change.'),
              h('li', null, h('strong', { style: { color: _bigFg('#bbf7d0') } }, 'Assertion '), 'is the SKILL of expressing anger and what you need in a way that does not hurt. Clear words, firm voice, no attacks. The DEAR MAN tool in this SEL Hub builds this skill.')
            ),
            h('p', { style: { margin: '10px 0 0', color: _bigFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.7, fontStyle: 'italic' } },
              'The goal: feel anger, USE its information, choose assertion (or another skill) instead of aggression.'
            )
          ),

          // What happens in the body
          h('div', { style: { padding: 14, borderRadius: 10, background: _bigBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _bigFg('#c4b5fd'), marginBottom: 10 } }, '🧠 Why "just calm down" never works'),
            h('p', { style: { margin: 0, color: _bigFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'When you\'re angry, your amygdala is firing alarms, adrenaline is flooding your body, your heart rate is up, your prefrontal cortex (the part that does considered thinking) is offline. Telling yourself "just calm down" or "think clearly" does not work because the thinking brain is literally unavailable. What works: get the body to come back FIRST (cool-down skills), then the brain comes back, then you can choose. Body first, brain second. This is why all the techniques in this tool involve the body.'
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: _bigFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'Skills in this kit'),
          stepCard('🚦 The choice point', 'The single most important concept: the moment between feeling anger and acting on it. You can learn to widen this window from milliseconds to minutes.', function() { goto('choice'); }, '#22c55e'),
          stepCard('📓 Hassle log', 'Track angry incidents over time: trigger, body signs, what you did, what would have been better. Patterns get visible quickly.', function() { goto('hassle'); }, _bigBg('#0ea5e9')),
          stepCard('⚡ My triggers', 'Build your personal trigger inventory: specific people, situations, body states, thoughts. Knowing yours is half the battle.', function() { goto('triggers'); }, '#f59e0b'),
          stepCard('❄️ My cool-downs', 'Build your personal toolkit of cool-down moves. The body-first techniques that actually work for YOU.', function() { goto('cooldown'); }, _bigBg('#0ea5e9')),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: _bigBg('#0f172a'), cursor: 'pointer', marginBottom: 8, color: _bigFg('#e2e8f0') } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _bigFg('#94a3b8'), lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CHOICE POINT
      // ═══════════════════════════════════════════════════════════
      function renderChoice() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 13, color: _bigFg('#bbf7d0'), lineHeight: 1.7 } },
            h('strong', null, '🚦 The choice point '),
            'is the gap between TRIGGER and ACTION. When you\'re young, the gap is often milliseconds — something happens and you\'re already mid-react. The whole work of anger management is widening this gap: making the moment between feeling and acting LONGER, so you can choose what to do instead of just doing it.'
          ),

          // The diagram
          h('div', { style: { padding: 18, borderRadius: 12, background: _bigBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid #22c55e', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _bigFg('#bbf7d0'), marginBottom: 14, textAlign: 'center' } }, 'The classic flow'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              h('div', { style: { padding: 12, borderRadius: 8, background: _bigBg('#1e293b'), borderLeft: '4px solid #ef4444', textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: _bigFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Step 1'),
                h('div', { style: { fontSize: 14, color: _bigFg('#fecaca'), fontWeight: 800 } }, '⚡ Trigger'),
                h('div', { style: { fontSize: 11, color: _bigFg('#94a3b8'), marginTop: 2 } }, 'Something happens or is said')
              ),
              h('div', { style: { textAlign: 'center', color: _bigFg('#475569'), fontSize: 20 } }, '↓'),
              h('div', { style: { padding: 12, borderRadius: 8, background: _bigBg('#1e293b'), borderLeft: '4px solid #f59e0b', textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: _bigFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Step 2'),
                h('div', { style: { fontSize: 14, color: _bigFg('#fde68a'), fontWeight: 800 } }, '🔥 Body responds (anger builds)'),
                h('div', { style: { fontSize: 11, color: _bigFg('#94a3b8'), marginTop: 2 } }, 'Heart up, jaw tight, vision narrows')
              ),
              h('div', { style: { textAlign: 'center', color: _bigFg('#475569'), fontSize: 20 } }, '↓'),
              h('div', { style: { padding: 14, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '2px solid #22c55e', textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: _bigFg('#bbf7d0'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '★ Step 3: THE CHOICE POINT'),
                h('div', { style: { fontSize: 15, color: _bigFg('#86efac'), fontWeight: 900 } }, '🚦 You pause'),
                h('div', { style: { fontSize: 12, color: _bigFg('#bbf7d0'), marginTop: 2, lineHeight: 1.5 } }, 'Even a half-second is something.\nUse a cool-down skill.\nThe goal: widen this gap.')
              ),
              h('div', { style: { textAlign: 'center', color: _bigFg('#475569'), fontSize: 20 } }, '↓'),
              h('div', { style: { padding: 12, borderRadius: 8, background: _bigBg('#1e293b'), borderLeft: '4px solid #0ea5e9', textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: _bigFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Step 4'),
                h('div', { style: { fontSize: 14, color: _bigFg('#bae6fd'), fontWeight: 800 } }, '✓ You choose (instead of react)'),
                h('div', { style: { fontSize: 11, color: _bigFg('#94a3b8'), marginTop: 2 } }, 'Walk away · breathe · use DEAR MAN · address it later when calm')
              )
            )
          ),

          // What widens the gap
          h('div', { style: { padding: 14, borderRadius: 10, background: _bigBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _bigFg('#bbf7d0'), marginBottom: 10 } }, '🔧 What widens the choice point window'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _bigFg('#e2e8f0'), fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'Knowing your body signs early. '), 'If you can catch the jaw clench or the hot face EARLY, you have more time than if you only notice the rage after you\'ve already started yelling.'),
              h('li', null, h('strong', null, 'Practicing cool-downs when calm. '), 'You cannot learn a new skill mid-rage. Practice paced breathing or "walk away" when you are not angry; then the move is available when you need it.'),
              h('li', null, h('strong', null, 'Knowing your triggers. '), 'When you can SEE the trigger coming, you have more time to prepare than if it ambushes you. The trigger inventory builds this.'),
              h('li', null, h('strong', null, 'Sleep, food, regulation. '), 'A tired, hungry, dysregulated body has NO choice-point window. Take care of the foundation.'),
              h('li', null, h('strong', null, 'A trusted person to text. '), 'Just texting someone "I\'m really mad right now" can create a 30-second pause and shift things.')
            )
          ),

          // When anger IS the right response
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', fontSize: 13, color: _bigFg('#fde68a'), lineHeight: 1.7 } },
            h('strong', null, '⚖️ When anger IS the right response: '),
            'sometimes the problem is not your reaction; it\'s the situation. Anger at being abused, anger at injustice, anger at being treated as less than human — these are healthy responses to harmful environments. The work in these cases is not to stop being angry; it\'s to channel the anger into action that protects you and changes the situation. The Self-Advocacy and Civic Action tools in this SEL Hub are built for this.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HASSLE LOG
      // ═══════════════════════════════════════════════════════════
      function renderHassle() {
        function addEntry() {
          var trigger = document.getElementById('bf-trigger').value;
          var body = document.getElementById('bf-body').value;
          var didDo = document.getElementById('bf-did').value;
          var betterDo = document.getElementById('bf-better').value;
          var intensity = parseInt(document.getElementById('bf-intensity').value, 10);
          if (!trigger || !trigger.trim()) return;
          var entry = { date: todayISO(), trigger: trigger.trim(), body: body, didDo: didDo, wouldHaveBeen: betterDo, intensity: intensity };
          setBF({ hassleLog: (d.hassleLog || []).concat([entry]) });
          ['bf-trigger', 'bf-body', 'bf-did', 'bf-better'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
          if (addToast) addToast('Logged.', 'success');
        }
        function removeEntry(i) {
          var nx = (d.hassleLog || []).slice();
          nx.splice(i, 1);
          setBF({ hassleLog: nx });
        }

        var log = (d.hassleLog || []).slice().reverse();

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 13, color: _bigFg('#bae6fd'), lineHeight: 1.7 } },
            h('strong', null, '📓 The hassle log '),
            'is a core CBT-for-anger tool (Lochman, Beck). After each angry incident, log what happened: trigger, body, what you did, what would have been better. The pattern emerges within 5-10 entries. You discover you don\'t actually have "an anger problem" — you have 2 specific people and 3 specific situations that set you off, and once you know that, you can prepare.'
          ),

          // Form
          h('div', { style: { padding: 14, borderRadius: 10, background: _bigBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _bigFg('#bae6fd'), marginBottom: 10 } }, '+ Log an incident'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 8 } },
              h('div', null,
                h('label', { htmlFor: 'bf-trigger', style: { display: 'block', fontSize: 10, color: _bigFg('#94a3b8'), fontWeight: 700, marginBottom: 2 } }, 'Trigger (what happened)'),
                h('input', { id: 'bf-trigger', type: 'text', placeholder: 'Be specific',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: _bigBg('#1e293b'), color: _bigFg('#e2e8f0'), fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'bf-intensity', style: { display: 'block', fontSize: 10, color: _bigFg('#94a3b8'), fontWeight: 700, marginBottom: 2 } }, 'Intensity 0-10'),
                h('input', { id: 'bf-intensity', type: 'number', min: 0, max: 10, defaultValue: 6,
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: _bigBg('#1e293b'), color: _bigFg('#e2e8f0'), fontSize: 13 } })
              )
            ),
            h('label', { htmlFor: 'bf-body', style: { display: 'block', fontSize: 10, color: _bigFg('#94a3b8'), fontWeight: 700, marginBottom: 2 } }, 'What did my body do?'),
            h('input', { id: 'bf-body', type: 'text', placeholder: 'Heart racing, jaw tight, etc.',
              style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: _bigBg('#1e293b'), color: _bigFg('#e2e8f0'), fontSize: 13, marginBottom: 8 } }),
            h('label', { htmlFor: 'bf-did', style: { display: 'block', fontSize: 10, color: _bigFg('#94a3b8'), fontWeight: 700, marginBottom: 2 } }, 'What did I actually do?'),
            h('textarea', { id: 'bf-did', placeholder: 'Honest. No judgment.',
              style: { width: '100%', minHeight: 50, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _bigBg('#1e293b'), color: _bigFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', marginBottom: 8 } }),
            h('label', { htmlFor: 'bf-better', style: { display: 'block', fontSize: 10, color: _bigFg('#94a3b8'), fontWeight: 700, marginBottom: 2 } }, 'What would have worked better?'),
            h('textarea', { id: 'bf-better', placeholder: 'In hindsight. Specific.',
              style: { width: '100%', minHeight: 50, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _bigBg('#1e293b'), color: _bigFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', marginBottom: 10 } }),
            h('button', { onClick: addEntry, 'aria-label': 'Log this incident',
              style: { padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', background: _bigBg('#0ea5e9'), color: _bigFg('#fff'), fontWeight: 700, fontSize: 13 } }, '+ Log incident')
          ),

          // Log
          log.length > 0 ? h('div', null,
            h('div', { style: { fontSize: 11, color: _bigFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, log.length + ' entries'),
            log.map(function(e, i) {
              return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: _bigBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
                  h('span', { style: { fontSize: 11, color: _bigFg('#94a3b8'), fontFamily: 'ui-monospace, monospace' } }, e.date),
                  e.intensity !== undefined && !isNaN(e.intensity) ? h('span', { style: { fontSize: 11, color: e.intensity >= 7 ? _bigFg('#fca5a5') : e.intensity >= 4 ? _bigFg('#fde68a') : _bigFg('#bbf7d0'), fontWeight: 700 } }, 'Intensity: ' + e.intensity + '/10') : null,
                  h('button', { onClick: function() { removeEntry(log.length - 1 - i); }, 'aria-label': 'Remove',
                    style: { marginLeft: 'auto', background: 'transparent', border: '1px solid #475569', color: _bigFg('#94a3b8'), borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
                ),
                h('div', { style: { fontSize: 13, color: _bigFg('#e2e8f0'), marginBottom: 4 } }, h('strong', { style: { color: _bigFg('#bae6fd') } }, 'Trigger: '), e.trigger),
                e.body ? h('div', { style: { fontSize: 12.5, color: _bigFg('#cbd5e1'), marginBottom: 4 } }, h('strong', { style: { color: _bigFg('#fde68a') } }, 'Body: '), e.body) : null,
                e.didDo ? h('div', { style: { fontSize: 12.5, color: _bigFg('#cbd5e1'), marginBottom: 4 } }, h('strong', { style: { color: _bigFg('#fca5a5') } }, 'What I did: '), e.didDo) : null,
                e.wouldHaveBeen ? h('div', { style: { fontSize: 12.5, color: _bigFg('#cbd5e1') } }, h('strong', { style: { color: _bigFg('#bbf7d0') } }, 'Better: '), e.wouldHaveBeen) : null
              );
            })
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // TRIGGERS
      // ═══════════════════════════════════════════════════════════
      function renderTriggers() {
        function listEditor(key, title, color, starters, blurb) {
          var items = d[key] || [];
          function addItem(value) {
            if (!value || !value.trim()) return;
            var list = items.slice();
            if (list.indexOf(value.trim()) === -1) list.push(value.trim());
            var patch = {}; patch[key] = list;
            setBF(patch);
          }
          function removeItem(i) {
            var list = items.slice();
            list.splice(i, 1);
            var patch = {}; patch[key] = list;
            setBF(patch);
          }
          var inputId = 'bf-trig-' + key;
          function submit() {
            var el = document.getElementById(inputId);
            if (!el || !el.value.trim()) return;
            addItem(el.value);
            el.value = '';
          }

          return h('div', { style: { padding: 14, borderRadius: 10, background: _bigBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: color, fontWeight: 800, marginBottom: 6 } }, title),
            h('div', { style: { fontSize: 11.5, color: _bigFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, blurb),
            items.length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              items.map(function(s, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 14, background: _bigBg('#1e293b'), border: '1px solid ' + color + '44', fontSize: 12, color: _bigFg('#e2e8f0') } },
                  h('span', null, s),
                  h('button', { onClick: function() { removeItem(i); }, 'aria-label': 'Remove',
                    style: { background: 'transparent', border: 'none', color: _bigFg('#94a3b8'), cursor: 'pointer', fontSize: 11 } }, '✕'));
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' } },
              h('input', { id: inputId, type: 'text', placeholder: 'Type and Enter to add...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                style: { flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _bigBg('#1e293b'), color: _bigFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { onClick: submit, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: color, color: _bigFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: _bigFg('#94a3b8') } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                starters.map(function(s, si) {
                  var already = items.indexOf(s) !== -1;
                  return h('button', { key: si, onClick: function() { addItem(s); }, disabled: already, 'aria-label': 'Add: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid ' + color + '66', background: already ? _bigBg('#1e293b') : 'rgba(15,23,42,0.6)', color: already ? _bigFg('#64748b') : _bigFg('#cbd5e1'), cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                    (already ? '✓ ' : '+ ') + s);
                })
              )
            )
          );
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: _bigFg('#fde68a'), lineHeight: 1.65 } },
            h('strong', null, '⚡ Knowing YOUR triggers is half the work. '),
            'The more specific, the more useful. "School" is not a trigger. "When Mr. X corrects me in front of the class" is. Build the list slowly over time.'
          ),

          listEditor('myTriggers', '⚡ My triggers', '#f59e0b', TRIGGER_STARTERS,
            'What sets you off? Specific people, situations, words, contexts.'),
          listEditor('myBodySigns', '🔥 My body signs (early warning)', _bigBg('#ef4444'), BODY_STARTERS,
            'How does anger show up in YOUR body? The earlier you catch these, the more time you have.'),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // COOL-DOWNS
      // ═══════════════════════════════════════════════════════════
      function renderCooldown() {
        var items = d.myCoolDowns || [];
        function addItem(value) {
          if (!value || !value.trim()) return;
          var list = items.slice();
          if (list.indexOf(value.trim()) === -1) list.push(value.trim());
          setBF({ myCoolDowns: list });
        }
        function removeItem(i) {
          var list = items.slice();
          list.splice(i, 1);
          setBF({ myCoolDowns: list });
        }
        function submit() {
          var el = document.getElementById('bf-cd-input');
          if (!el || !el.value.trim()) return;
          addItem(el.value);
          el.value = '';
        }

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 13, color: _bigFg('#bae6fd'), lineHeight: 1.7 } },
            h('strong', null, '❄️ Cool-down skills are body-first. '),
            'They work on the physiology, which has to come back down before the thinking brain comes back online. Build YOUR list — what actually works for YOU. Practice them WHEN CALM so they\'re available when you need them.'
          ),

          // My list
          items.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: _bigBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _bigFg('#bae6fd'), fontWeight: 800, marginBottom: 8 } }, 'My cool-downs (' + items.length + ')'),
            items.map(function(s, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: _bigBg('#1e293b'), marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { flex: 1, fontSize: 13, color: _bigFg('#e2e8f0') } }, '❄️ ' + s),
                h('button', { onClick: function() { removeItem(i); }, 'aria-label': 'Remove',
                  style: { background: 'transparent', border: '1px solid #475569', color: _bigFg('#94a3b8'), borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              );
            })
          ) : null,

          h('div', { style: { padding: 14, borderRadius: 10, background: _bigBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _bigFg('#bae6fd'), fontWeight: 800, marginBottom: 8 } }, '+ Add a cool-down'),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'bf-cd-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add cool-down'),
              h('input', { id: 'bf-cd-input', type: 'text', placeholder: 'A specific move you know works for you',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _bigBg('#1e293b'), color: _bigFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { onClick: submit, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: _bigBg('#0ea5e9'), color: _bigFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            )
          ),

          // Starters
          h('div', { style: { padding: 12, borderRadius: 10, background: _bigBg('#0f172a'), border: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 12, color: _bigFg('#94a3b8'), fontWeight: 700, marginBottom: 10 } }, 'Common cool-down moves (tap to add)'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              COOLDOWN_STARTERS.map(function(s, i) {
                var already = items.indexOf(s) !== -1;
                return h('button', { key: i, onClick: function() { addItem(s); }, disabled: already, 'aria-label': 'Add: ' + s,
                  style: { padding: '4px 10px', borderRadius: 14, border: '1px solid #0ea5e966', background: already ? _bigBg('#1e293b') : 'rgba(15,23,42,0.6)', color: already ? _bigFg('#64748b') : _bigFg('#cbd5e1'), cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                  (already ? '✓ ' : '+ ') + s);
              })
            )
          ),

          // Cross-link
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', marginTop: 14, fontSize: 12.5, color: _bigFg('#fecaca'), lineHeight: 1.6 } },
            h('strong', null, '🆘 For acute high-intensity anger: '),
            'see the TIPP tool in this SEL Hub. Cold water, intense exercise, paced breathing, paired muscle relaxation. These are the same skills used in pediatric crisis psych.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('bigFeelings', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: _bigBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _bigFg('#fdba74'), fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: _bigFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'Anger-specific psychoeducation and skill-building, designed for adolescents. The core frame: anger is information, NOT a problem. The problem is reactive aggression — the impulsive action people often regret. The work is widening the gap between feeling and acting.'
            ),
            h('p', { style: { margin: 0, color: _bigFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'The tool is reflective and skill-based, not behavioral control. It does NOT pathologize anger; it treats the user as a person trying to choose better, not as a "behavior problem." The hassle log, trigger inventory, and choice-point framing all come from the CBT-for-anger evidence base. The Lochman Coping Power program for adolescents is the closest research-based parallel.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _bigBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _bigFg('#fdba74'), fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Lochman, J. E., Wells, K. C., and Lenhart, L. A. (2008)', 'Coping Power: Child Group Program, Oxford University Press', 'The leading evidence-based adolescent anger and aggression program. Strongly researched.', null),
            sourceCard('Beck, A. T. (1999)', 'Prisoners of Hate: The Cognitive Basis of Anger, Hostility, and Violence, Harper Perennial', 'Beck\'s book on CBT for anger and hostility.', null),
            sourceCard('Novaco, R. W. (1975)', 'Anger Control: The Development and Evaluation of an Experimental Treatment, Lexington Books', 'Foundational text in CBT-for-anger.', null),
            sourceCard('Deffenbacher, J. L. (2011)', '"Cognitive-Behavioral Conceptualization and Treatment of Anger," Cognitive and Behavioral Practice, 18(2), 212-221', 'Modern review of CBT approaches.', null),
            sourceCard('AACAP', 'aacap.org / Disruptive Behavior Disorders Resource Center', 'When persistent aggression warrants clinical attention.', 'https://www.aacap.org/AACAP/Families_and_Youth/Resource_Centers/Disruptive_Behavior/Home.aspx')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _bigFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _bigFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'This tool helps with everyday anger and regulation skill-building. For persistent aggression that leads to violence (toward yourself, others, or things), clinical care is the right path.'),
              h('li', null, 'For adolescents whose anger is appropriate to genuinely abusive environments: the work is partly the situation, not the anger. Reactive aggression in response to abuse is still risky for YOU (school discipline, escalation), so the choice-point skills are still useful. But the framing of "your anger is a problem" is wrong when the situation is the actual problem.'),
              h('li', null, 'Some communities and cultures have specific anger-display norms (masculinity expectations, cultural patterns of expression). This tool aims to be respectful without endorsing aggression; it is not asking anyone to suppress legitimate anger.'),
              h('li', null, 'Persistent anger + sadness + sleep disruption can be depression in young people, especially boys, where anger is often the primary visible symptom. If anger is the loudest feeling for weeks: a clinician should be involved.'),
              h('li', null, 'Anger that follows a traumatic event is often layered with trauma; trauma-informed treatment may be more useful than pure CBT-for-anger.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(249,115,22,0.10)', borderTop: '1px solid rgba(249,115,22,0.3)', borderRight: '1px solid rgba(249,115,22,0.3)', borderBottom: '1px solid rgba(249,115,22,0.3)', borderLeft: '3px solid #f97316', fontSize: 12.5, color: _bigFg('#fed7aa'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'A hassle-log assignment for 2 weeks (logging EVERY angry incident, even small ones) is one of the highest-yield self-regulation interventions in school psych practice. Pair with cool-down skill teaching during calm times. For students with persistent disruptive behavior, the Lochman Coping Power program (10-30 sessions, group-based) is the gold-standard intervention; many districts can train counselors in it.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _bigBg('#1e293b'), border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: _bigFg('#fdba74'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _bigFg('#fed7aa'), fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _bigFg('#fed7aa'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _bigFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — hassle log + patterns, clinician-friendly
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var log = (d.hassleLog || []).slice().reverse();
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(249,115,22,0.10)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _bigFg('#fed7aa'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Hassle log + patterns inventory — useful for a counselor, therapist, or IEP/behavior plan conversation.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', color: _bigFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: _bigBg('#1e293b'), color: _bigFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'bf-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _bigBg('#fff'), color: _bigFg('#0f172a'), borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#bf-print-region, #bf-print-region * { visibility: visible !important; } ' +
              '#bf-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #ea580c' } },
              h('div', { style: { fontSize: 10, color: _bigFg('#64748b'), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Big Feelings · Hassle Log + Patterns'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My anger pattern log'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: _bigFg('#475569'), marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // Patterns: triggers, body signs, cool-downs
            (d.myTriggers || []).length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _bigBg('#b45309'), color: _bigFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '⚡ My triggers'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _bigFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.myTriggers.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.myBodySigns || []).length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _bigBg('#ef4444'), color: _bigFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🔥 My body signs (early warning)'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _bigFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.myBodySigns.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.myCoolDowns || []).length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _bigBg('#0ea5e9'), color: _bigFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '❄️ My cool-downs that work'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _bigFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.myCoolDowns.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            // Hassle log
            log.length > 0 ? h('div', { style: { marginBottom: 14 } },
              h('div', { style: { background: _bigBg('#0ea5e9'), color: _bigFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 8, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📓 Hassle log (' + log.length + ' entries)'),
              log.map(function(e, i) {
                return h('div', { key: i, style: { marginBottom: 10, pageBreakInside: 'avoid', padding: '8px 0', borderTop: '1px solid #e2e8f0' } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 } },
                    h('strong', { style: { fontSize: 11, color: _bigFg('#475569'), fontFamily: 'ui-monospace, monospace' } }, e.date),
                    e.intensity !== undefined && !isNaN(e.intensity) ? h('span', { style: { fontSize: 11, color: _bigFg('#475569') } }, '· Intensity: ' + e.intensity + '/10') : null
                  ),
                  h('div', { style: { fontSize: 12.5, color: _bigFg('#0f172a'), marginBottom: 2 } }, h('strong', null, 'Trigger: '), e.trigger),
                  e.body ? h('div', { style: { fontSize: 12, color: _bigFg('#0f172a'), marginBottom: 2 } }, h('strong', null, 'Body: '), e.body) : null,
                  e.didDo ? h('div', { style: { fontSize: 12, color: _bigFg('#0f172a'), marginBottom: 2 } }, h('strong', null, 'What I did: '), e.didDo) : null,
                  e.wouldHaveBeen ? h('div', { style: { fontSize: 12, color: _bigFg('#0f172a') } }, h('strong', null, 'Better: '), e.wouldHaveBeen) : null
                );
              })
            ) : h('div', { style: { fontSize: 12, color: _bigFg('#94a3b8'), fontStyle: 'italic' } }, 'No hassle log entries yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: _bigFg('#94a3b8'), textAlign: 'center', lineHeight: 1.5 } },
              'Hassle log from Lochman Coping Power (Lochman, Wells, & Lenhart). ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      var body;
      if (view === 'choice') body = renderChoice();
      else if (view === 'hassle') body = renderHassle();
      else if (view === 'triggers') body = renderTriggers();
      else if (view === 'cooldown') body = renderCooldown();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Big Feelings' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
